// portal/lib/inbox.mjs — hand-written canon (this repo; not generated). THE INBOX: everything across discovery and
// build that only the owner can clear, as one list of rows (epic #295 ticket #319, D1;
// docs/epics/canvas-design-import.architecture.md §"Addendum 2026-08-28: the owner drives", row D1;
// .claude/plans/inbox-waiting-on-you-319.md §THE FOLD).
//
// A PURE READ OVER FILES THAT ALREADY EXIST. No op, no write path, no stored state: every row is derived on each call
// from the run packages through the readers that already own each queue (missingStates, staleFrames, openProposals,
// ledgerView, foldProposals, an import record's `unbound` block), and a row is cleared only by its verb on its own
// page. This file writes nothing — build-checks group 51.1 pins its node: imports to exactly node:fs {existsSync,
// readFileSync} and node:path {join}, so no write call is in reach, and 51.7 hashes a package before and after.
//
// NO SDK, AND NOTHING THAT COULD REACH ONE. It imports node built-ins, ../../system/canvas-ops.mjs,
// ./canvas-store.mjs, ../../discovery/ops.mjs and ../../discovery/proposals.mjs — all SDK-free, all loaded by
// build-checks in CI where portal/node_modules does not exist. Group 51.1 pins exactly this set. Never
// import-run.mjs, discovery.mjs or env.mjs: env.mjs loads portal/.env into the process. That is why an import
// record is read here directly rather than through import-run.mjs's unboundCount.
//
// THE RUN SET IS listBuilds'. A discovery-only package (no build/) has no rows (owner, 2026-10-01: the graded-*
// judge fixtures would add ~75 rows that are not the owner's work). One run whose package throws while loading is
// reported in `errors` and contributes no rows — an error has no verb — so one bad package never takes the page down.
// `counts` carries every listed run, zero included. Each root is listed on its own, so a package is read from the root
// it was found in; two roots answering the same provenance/slug both report, their rows and counts under one key.
//
// THE TEN KINDS, in KINDS order, each with the one verb that clears it:
//   agent-proposal    an agent `proposed` line no verdict answers          Accept or refuse
//   stale-frame       a frame with a ref whose decision was superseded     Re-confirm
//   dangling-ref      a frame with a ref naming no decision                Re-link decisions
//   missing-state     a lane-A base frame × a required state it lacks      Add the <key> state
//   unlinked-frame    a base frame embodying no decision                   Link a decision
//   ratify-pending    a Mode 1 proposal still `proposed`                   Ratify
//   unbound-import    a proposed import with snaps nobody confirmed        Confirm the snaps
//   fork              an open question no decision closed and no option picked  Ask for two options
//   open-question     a parked question in an OPEN discovery session       Resume in Discovery
//   feature-proposal  a discovery feature proposal with no verdict         Give a verdict
// A stale frame's refs are ONE row (Re-confirm re-pins them all in one frame.link); a frame's missing states are one
// row EACH (adding one state clears one row). A fork row (#320) lists DERIVED forks only (the owner's call, 2026-10-02):
// forkList's open-question rows still open, on a finished session too — unlike open-question, a fork is cleared on the
// canvas, by a pick or a later decision; a decision the owner flagged at ask time is not a row.
//
// FOUR DECISIONS, each in ONE exported predicate with ONE group-51 fixture, so a veto is a one-function edit:
//   A1 needsLink    — unlinked-frame lists BASE frames only, and only when the package has a transcript
//                     (decisions !== null): a state's "why" is its screen's, and a stand-in's refs cannot resolve.
//   A2 blocks       — a row BLOCKS the run when it is an open agent proposal (appendAgentLine refuses a second one —
//                     the LOOP) or a stale ENTRY frame. Ratify blocks nothing mechanically.
//   A3 entryFrames  — an entry frame is a lane-A base frame no arrow targets; when every base frame is targeted (a
//                     cycle), the first base frame in document order. canvas-ops.mjs has no entry concept of its own.
//   A4 questionCleared — a parked question clears on a LATER record_decision naming its non-null question_id, or when
//                     the session finishes (a finished session takes no turns, so no verb could clear it there; it
//                     stays in prd.md's Open questions). An off-script one (question_id null) clears only by finishing.
//
// ORDER: blocking rows first, within them by KINDS order then `at`; the rest oldest first by `at`; a row with no `at`
// after every dated row in its band. Ties: provenance,
// slug, KINDS order, subject. Deterministic (group 51.5). `at` is the build ledger line's `at` for build rows (a
// frame's is the line that first created it) and the transcript or proposal line's `ts` for discovery rows.
//
// WHAT IT CANNOT REACH: per-lane missing states (rows read lane A; flow.md reports each lane), whether a decision is a
// good one, and anything outside listBuilds' roots.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { applyOp, emptyDoc, forkList, frameLabel, missingStates, staleFrames } from "../../system/canvas-ops.mjs";
import { foldLedger, listBuilds, loadBuild, loadDecisions, loadOpenQuestions, openProposals } from "./canvas-store.mjs";
import { ledgerView } from "../../discovery/ops.mjs";
import { foldProposals } from "../../discovery/proposals.mjs";

export const KINDS = Object.freeze([
  "agent-proposal", "stale-frame", "dangling-ref", "missing-state", "unlinked-frame",
  "ratify-pending", "unbound-import", "fork", "open-question", "feature-proposal",
]);

// canvas-store.mjs's readJsonl, mirrored (it is not exported): a malformed line throws naming the file and the line.
const readJsonl = (file) => readFileSync(file, "utf8").split("\n").flatMap((text, i) => {
  if (!text.trim()) return [];
  try { return [JSON.parse(text)]; }
  catch (e) { throw new Error(`${file} line ${i + 1} is not JSON — ${e.message}`); }
});
// run.json and import records: an unreadable one answers null, never a throw.
const readJson = (file) => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; } };

const CANVAS_KEYS = ["frame", "import", "promoted", "fork"];

// hrefFor(target) → the URL a row's verb opens. Canvas: /canvas.html? with provenance, slug, then at most one of
// frame | import | promoted | fork. Discovery: the SPA route that opens the drawer on that package.
export function hrefFor(target) {
  const { page, provenance, slug } = target ?? {};
  if (page === "discovery") return `#/discovery/${provenance}/${slug}`;
  if (page !== "canvas") throw new Error(`hrefFor: page ${JSON.stringify(page)} is not canvas or discovery`);
  const q = new URLSearchParams({ provenance, slug });
  const extra = CANVAS_KEYS.filter((k) => target[k] !== undefined);
  if (extra.length > 1) throw new Error(`hrefFor: a canvas link carries one of ${CANVAS_KEYS.join(" · ")}, not ${extra.join(" and ")}`);
  for (const k of extra) q.set(k, target[k]);
  return `/canvas.html?${q}`;
}

const isBase = (f) => f && typeof f === "object" && f.baseId == null && typeof f.id === "string";

// A3. Total over junk.
export function entryFrames(doc) {
  const bases = (Array.isArray(doc?.frames) ? doc.frames : []).filter(isBase);
  const targeted = new Set((Array.isArray(doc?.arrows) ? doc.arrows : []).map((a) => a?.to?.frameId));
  const free = bases.filter((f) => !targeted.has(f.id)).map((f) => f.id);
  return free.length || !bases.length ? free : [bases[0].id];
}

// A1.
export const needsLink = (frame, decisions) => decisions !== null && isBase(frame)
  && !(Array.isArray(frame.decisionRefs) && frame.decisionRefs.length);

// A2. `row` needs only kind and subject.
export function blocks(row, doc) {
  if (row?.kind === "agent-proposal") return true;
  if (row?.kind === "stale-frame") return entryFrames(doc).includes(String(row.subject).replace(/^frame:/, ""));
  return false;
}

// A4. `ops` are the transcript's op lines; `run` is run.json's parse (null = unreadable, read as finished).
export function questionCleared(openQ, ops, run) {
  if (run === null || run?.endedAt != null) return true;
  if (openQ?.questionId == null) return false;
  return (Array.isArray(ops) ? ops : []).some((o) => o?.op === "record_decision" && o.seq > openQ.seq
    && o.params?.question_id === openQ.questionId);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The `at` of the effective line after which each frame id first exists.
function bornAt(effective) {
  const born = {};
  let doc = emptyDoc();
  for (const l of effective) {
    doc = applyOp(doc, { op: l.op, params: l.params });
    for (const f of doc.frames) if (!(f.id in born)) born[f.id] = l.at ?? null;
  }
  return born;
}

function rowsFor({ provenance, slug, hasTranscript }, pkg) {
  const b = loadBuild(join(pkg, "build"));
  if (b === null) return [];
  const { doc, effective } = foldLedger(b.ops);
  const decisions = loadDecisions(pkg);
  const born = bornAt(effective);
  const canvas = (extra) => hrefFor({ page: "canvas", provenance, slug, ...extra });
  const out = [];
  const push = (kind, subject, at, text, label, href) => {
    const row = { provenance, slug, kind, blocking: false, at, subject, text, verb: { label, href } };
    row.blocking = blocks(row, doc);
    out.push(row);
  };

  for (const l of openProposals(b.ops)) {
    const what = l.op === "state.add" ? `${l.params?.stateKey} of ${l.params?.baseId}` : (l.params?.screenId ?? "");
    push("agent-proposal", `seq:${l.seq}`, l.at, `The agent proposed ${l.op}${what ? ` ${what}` : ""} — waiting for your verdict.`, "Accept or refuse", canvas({}));
  }

  const ref = staleFrames(doc, decisions);
  for (const status of ["stale", "dangling"]) {
    const byFrame = new Map();
    for (const r of ref.filter((x) => x.status === status)) byFrame.set(r.frameId, [...(byFrame.get(r.frameId) ?? []), r]);
    for (const [id, rs] of byFrame) {
      const name = frameLabel(doc, id);
      if (status === "stale") {
        push("stale-frame", `frame:${id}`, born[id] ?? null, `${name}: ${rs.map((r) => `decision ${r.ref} changed since linked — now ${r.latest}`).join("; ")}.`, "Re-confirm", canvas({ frame: id }));
      } else {
        push("dangling-ref", `frame:${id}`, born[id] ?? null, `${name}: ${rs.length === 1 ? "decision" : "decisions"} ${rs.map((r) => r.ref).join(", ")} ${rs.length === 1 ? "does" : "do"} not resolve in this package's transcript.`, "Re-link decisions", canvas({ frame: id }));
      }
    }
  }

  for (const m of missingStates(doc)) {
    for (const key of m.missing) {
      push("missing-state", `frame:${m.frameId}/${key}`, born[m.frameId] ?? null, `${frameLabel(doc, m.frameId)} is missing its ${key} state.`, `Add the ${key} state`, canvas({ frame: m.frameId }));
    }
  }

  for (const f of doc.frames) {
    if (needsLink(f, decisions)) push("unlinked-frame", `frame:${f.id}`, born[f.id] ?? null, `${frameLabel(doc, f.id)} is linked to no decision.`, "Link a decision", canvas({ frame: f.id }));
  }

  const questions = loadOpenQuestions(pkg);
  for (const k of forkList(doc, { questions, decisions, buildTx: b.buildTranscript ?? [] })) {
    if (k.kind !== "open-question" || k.status !== "open") continue;
    const at = questions?.find((q) => String(q.seq) === k.ref)?.ts ?? null;
    push("fork", `fork:${k.ref}`, at, `Open question ${k.questionId ?? "off-script"} (seq ${k.ref}) has no picked option on the canvas${k.reason ? ` — parked because: "${k.reason}"` : ""}.`, "Ask for two options", canvas({ fork: k.ref }));
  }

  const proposedAt = (name) => effective.find((l) => l.op === "component.propose" && l.params?.name === name)?.at ?? null;
  for (const p of Array.isArray(doc.proposals) ? doc.proposals : []) {
    if (p?.status !== "proposed") continue;
    const target = p.recordId !== undefined ? { import: p.name } : { promoted: p.name };
    if (p.mode === 1) push("ratify-pending", `proposal:${p.id}`, proposedAt(p.name), `${p.name} waits for ratify.`, "Ratify", canvas(target));
    if (p.recordId !== undefined) {
      const record = readJson(join(pkg, "build", "imports", `${p.recordId}.json`));
      const n = record?.unbound?.proposed;
      if (record?.source?.bound === false && Number.isInteger(n) && n > 0) {
        push("unbound-import", `import:${p.recordId}`, proposedAt(p.name), `Import ${p.recordId} has ${plural(n, "snap")} nobody confirmed.`, "Confirm the snaps", canvas({ import: p.name }));
      }
    }
  }

  if (hasTranscript) {
    const ops = readJsonl(join(pkg, "transcript.jsonl")).filter((l) => l?.type === "op");
    const run = readJson(join(pkg, "run.json"));
    const tsOf = new Map(ops.map((l) => [l.seq, l.ts ?? null]));
    for (const q of ledgerView(ops).openQuestions) {
      if (questionCleared(q, ops, run)) continue;
      push("open-question", `seq:${q.seq}`, tsOf.get(q.seq) ?? null, `Parked: ${q.questionId ?? "an off-script question"}${q.reason ? ` — "${q.reason}"` : ""}.`, "Resume in Discovery", hrefFor({ page: "discovery", provenance, slug }));
    }
  }

  const pPath = join(pkg, "proposals.jsonl");
  if (existsSync(pPath)) {
    for (const r of foldProposals(readJsonl(pPath))) {
      if (r.status !== "proposed") continue;
      push("feature-proposal", `proposal:${r.proposal.id}`, r.proposal.ts ?? null, `Feature ${r.proposal.id} "${r.proposal.title}" has no verdict.`, "Give a verdict", hrefFor({ page: "discovery", provenance, slug }));
    }
  }
  return out;
}

export const byOrder = (a, b) => {
  if (a.blocking !== b.blocking) return a.blocking ? -1 : 1;
  const k = KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind);
  if (a.blocking && k) return k;
  if ((a.at == null) !== (b.at == null)) return a.at == null ? 1 : -1;
  const t = String(a.at ?? "").localeCompare(String(b.at ?? ""));
  if (t) return t;
  return a.provenance.localeCompare(b.provenance) || a.slug.localeCompare(b.slug) || k || a.subject.localeCompare(b.subject);
};

// inbox(roots) → { rows, counts, errors }. `roots` is listBuilds' [{provenance, dir}].
export function inbox(roots) {
  const rows = [];
  const counts = {};
  const errors = [];
  for (const root of Array.isArray(roots) ? roots : []) {
    for (const r of listBuilds([root])) {
      const key = `${r.provenance}/${r.slug}`;
      counts[key] ??= 0;
      try {
        const mine = rowsFor(r, join(root.dir, r.slug));
        counts[key] += mine.length;
        rows.push(...mine);
      } catch (e) {
        errors.push({ provenance: r.provenance, slug: r.slug, message: e.message });
      }
    }
  }
  return { rows: rows.sort(byOrder), counts, errors };
}
