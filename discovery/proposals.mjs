// discovery/proposals.mjs — candidate features proposed FROM a finished run package, and the owner's
// verdict on each (epic #295, ticket #359; docs/epics/canvas-design-import.architecture.md §Addendum
// 2026-08-28 — "the owner initiates and admits; the agent drafts inside fences"). Format →
// discovery/README.md §Feature proposals.
//
// It is prd-projection.mjs's SIBLING, not its extension, and the separation is the ticket. That module
// is a pure fold in which every claim resolves to one of five sources; a model writing features into
// prd.md would destroy that permanently and silently. So a proposal sits BESIDE the record and never
// inside it: two modules, one importing three containment helpers from the other in ONE direction, and
// case 34.5 asserts prd-projection.mjs never names "proposals" at all.
//
// TWO HALVES, prd-projection.mjs's split:
//   · a PURE core — checkProposalLines, foldProposals, projectProposals, proposalsView and the
//     renderers. No filesystem, no clock, no network, no SDK, no zod. Same input, byte-identical
//     output, which is what lets tooling/build-checks.mjs group 34 drive every rule in CI.
//   · a THIN filesystem shell — readProposalPackage / writeProposalsMd / the CLI guard. It reads four
//     files and writes one, and nothing in it decides what the page says.
//
// THE FOUR REFUSALS this module owns, and the reason each exists:
//
//   1. A PROPOSAL THAT NAMES NO DECISION IS REFUSED. `rests_on` is a non-empty array of seqs, each
//      resolving to a `record_decision` in this run's ledger. A DANGLING seq is refused too, unlike
//      checkOpLines' tolerated dangling parent_id: that guard never re-derives history over a
//      possibly-corrupted ledger, whereas a proposal run reads a FINISHED package and every seq it
//      names was in the brief it was given.
//   2. A PROPOSAL WITH NO `wrong_if` IS REFUSED. Non-empty after trim.
//   3. A PROPOSAL CAN NEVER BECOME A `record_decision`. Structural: there is no verb, no migration and
//      no import path. LINE_TYPES and OPS are disjoint, a proposal line fed to ops.mjs's applier
//      throws, and none of the SIX params that make a record_decision what it is — question_id,
//      answer_ref, level, parent_id, evidence_refs, off_script — is a proposal key. `wrong_if` IS
//      shared, and that is the design rather than a leak: every claim in this system carries a kill
//      criterion, which is refusal 2's own argument.
//   4. A PROPOSAL NEVER APPEARS IN `prd.md`. Structural: prd-projection.mjs does not import this
//      module and its readPackage reads three files, not four.
//
// REFUSALS 1 AND 2 INVERT ops.mjs INVARIANT 3 ON PURPOSE. There, absent is refused and EMPTY is
// flagged — `evidence_refs: []` and `parent_id: null` record with a flag, because a session must never
// deadlock on evidence that is not findable yet. A proposal is not a session: nothing waits on it, and
// a proposal resting on nothing, or carrying no kill criterion, has no reason to exist. So empty is
// refused here, and the refusal messages say which rule they are.
//
// THE STATUS IS DERIVED, NEVER STORED — discovery.mjs invariant 4's rule, and ops.mjs says the same
// thing about "closed". Two records of one fact drift. "proposed" is the ABSENCE of a verdict line and
// is never written to one. The LAST verdict for an id wins and EVERY verdict is kept: the owner
// changing their mind is part of the record, exactly as a superseded decision is (README §Supersede).
//
// THE ID IS SERVER-ASSIGNED, like an op's seq (ops.mjs invariant 5). The model authors exactly four
// fields — PROPOSED_BY_MODEL — and the server assigns type, ts, id, model and fingerprint, so a model
// cannot claim an id, backdate a line or mislabel which prompt surface proposed it.
//
// `proposals.md` IS REGENERATED, NOT REFUSED — the one place this module deliberately diverges from
// prd.md's rule. writePrd refuses to overwrite because prd.md is generated and then HAND-EDITED;
// proposals.md changes on every verdict, so a refuse-to-overwrite would break the feature. A hand edit
// here is lost. The compensating guard is build-checks case 34.11's byte compare, which is what group
// 33 case 15 does for each graded package's prd.md.
//
// WHY NOTHING FROM portal/ IS IMPORTED: group 34 imports this module and runs in CI, where
// portal/node_modules does not exist. The SDK half is portal/lib/discovery-proposer.mjs, which group
// 34 reads as TEXT and never imports. The import list below is source-pinned by case 34.12's sibling.
//
// NO CLOCK. Every date on the page comes from run.json or a line's own `ts`; ordering is by id or by
// PROPOSAL_SECTIONS order, never by Object.keys iteration. NO LENGTH CAP, for the reason
// prd-projection.mjs gives: a truncated claim is a quietly altered one.
//
// Standalone:  node discovery/proposals.mjs <slug> [--stdout]
//              node discovery/proposals.mjs --root <dir> [--stdout]
// Paths resolve from this module (NOT cwd).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { questionById } from "./bank.mjs";
import { OPS, PARAMS } from "./ops.mjs";
import { blockquote, cell, fold, readPackage } from "./prd-projection.mjs";

const bad = (msg) => { throw new Error(`proposals: ${msg}`); };
const shown = (v) => (v === undefined ? "(absent)" : JSON.stringify(v));

// The run header's absent-or-null renderer, prd-projection.mjs's `field` (its copy is module-private
// there). A local formatter, not containment: every value it can be handed goes through the EXPORTED
// fold, which is the one production copy of the line-ending rule.
const field = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.trim() === "" ? "—" : fold(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "—";
};

const nonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

// ---------------------------------------------------------------------------------------------------
// The vocabulary. Frozen: a consumer that wants a new verdict or a third line type edits these lists
// and group 34's cases together, not one of them.
// ---------------------------------------------------------------------------------------------------

export const VERDICTS = Object.freeze(["accepted", "refused", "parked"]);
// "proposed" is the ABSENCE of a verdict and is never written to a line — see foldProposals.
export const STATUSES = Object.freeze(["proposed", ...VERDICTS]);
export const LINE_TYPES = Object.freeze(["proposal", "verdict"]);

// Exact key sets, the way ops.mjs's PARAMS is exact: an unknown key is refused BY NAME and an absent
// one too. Order is the line's write order, so a hand-read of the file is stable.
export const PROPOSAL_KEYS = Object.freeze(["type", "ts", "id", "title", "why", "rests_on", "wrong_if", "model", "fingerprint"]);
export const VERDICT_KEYS = Object.freeze(["type", "ts", "proposal_id", "verdict", "reason"]);

// The MODEL's half — exactly what the MCP tool takes. The other five keys are the server's, the way an
// op's seq / closes / flagged are the applier's (ops.mjs invariant 5). The proposer's zod shape is
// pinned to this list by case 34.12, by name and by order.
export const PROPOSED_BY_MODEL = Object.freeze(["title", "why", "rests_on", "wrong_if"]);

export const PROPOSAL_ID_RE = /^p[1-9][0-9]*$/;

// One proposal run's ceiling. A named const rather than a literal in the prompt, so the prompt, the
// tool's own refusal and the gate read one number.
export const MAX_PROPOSALS = 8;

// REFUSAL 3, as a value the gate drives rather than a sentence in a comment. There is no verb, no
// migration and no route: a proposal line is not an op envelope, so ops.mjs's applier throws on it,
// and `accepted` records that the owner liked it and nothing more. If the owner wants it in the
// requirement hierarchy they answer a banked question in a session and the EXISTING pipeline files it
// from their own words — which is what keeps answers.jsonl's invariant intact: no op parameter carries
// text the human did not write. Case 34.4 asserts this list is empty, executes the applier over a real
// proposal line, and source-pins the absence of an applier import.
export const OPS_DISJOINT = Object.freeze(LINE_TYPES.filter((t) => OPS.includes(t)));

// The next id, counted from the MAX EXISTING id and never from the array length: proposals.jsonl
// interleaves two line types, so a length-based counter collides the moment the first verdict lands.
export function nextProposalId(lines) {
  const ids = (Array.isArray(lines) ? lines : [])
    .filter((l) => l && l.type === "proposal" && typeof l.id === "string" && PROPOSAL_ID_RE.test(l.id))
    .map((l) => Number(l.id.slice(1)));
  return `p${(ids.length ? Math.max(...ids) : 0) + 1}`;
}

// ---------------------------------------------------------------------------------------------------
// checkProposalLines — refuse a corrupted proposals.jsonl BY NAME. Pure and total, and the ONE
// boundary in this module that refuses: every selector below answers over junk rather than throwing
// (prd-projection.mjs's rule).
//
// Two passes, checkOpLines' split and for its reason: a cross-reference needs the id and seq maps to
// exist first. Returns a COPY of the array, so a caller cannot alias the checked lines.
// ---------------------------------------------------------------------------------------------------
export function checkProposalLines(lines, ops) {
  if (!Array.isArray(lines)) bad(`the proposal lines must be an array (got ${shown(lines)})`);
  if (!Array.isArray(ops)) bad(`the ledger must be the run's op records array (got ${shown(ops)})`);

  // PASS 1 — the shapes.
  let prevId = 0;
  const seen = new Set();
  lines.forEach((line, i) => {
    if (!line || typeof line !== "object" || Array.isArray(line))
      bad(`proposal line ${i} is not an object (got ${shown(line)})`);
    if (typeof line.type !== "string" || !LINE_TYPES.includes(line.type))
      bad(`proposal line ${i} carries type ${shown(line.type)}, which is not one of ${LINE_TYPES.join(" · ")} — a line outside the two types is REFUSED rather than filtered away, because a proposal nothing reports is the worst failure an honesty artefact has`);

    const want = line.type === "proposal" ? PROPOSAL_KEYS : VERDICT_KEYS;
    const got = Object.keys(line);
    const extra = got.filter((k) => !want.includes(k));
    const absent = want.filter((k) => !got.includes(k));
    if (extra.length || absent.length) {
      // An extra key that is a record_decision param is refusal 3 arriving by the back door: a line
      // wearing an op's parameters is a proposal trying to become a decision. Name the reason so a
      // future editor sees it rather than reading this as a typo check.
      const opish = extra.filter((k) => PARAMS.record_decision.includes(k));
      bad(`proposal line ${i} (${line.type}) carries ${got.join(", ") || "no keys"} — a ${line.type} line is exactly ${want.join(", ")}${extra.length ? `; unknown: ${extra.join(", ")}` : ""}${absent.length ? `; absent: ${absent.join(", ")}` : ""}${opish.length ? `. ${opish.join(", ")} ${opish.length === 1 ? "is a" : "are"} record_decision param${opish.length === 1 ? "" : "s"}: a proposal is never an op and has no route into the requirement hierarchy (refusal 3)` : ""}`);
    }
    if (typeof line.ts !== "string")
      bad(`proposal line ${i} (${line.type}) carries ts ${shown(line.ts)} — the server stamps it as a string`);

    if (line.type === "proposal") {
      if (typeof line.id !== "string" || !PROPOSAL_ID_RE.test(line.id))
        bad(`proposal line ${i} carries id ${shown(line.id)} — an id is p<n> with n a 1-based integer, assigned by the server (refusal 3's other half: the model authors ${PROPOSED_BY_MODEL.join(", ")} and nothing else)`);
      if (seen.has(line.id))
        bad(`proposal line ${i} repeats id ${JSON.stringify(line.id)} — one id names one proposal`);
      seen.add(line.id);
      const n = Number(line.id.slice(1));
      if (n <= prevId)
        bad(`proposal line ${i} carries id ${JSON.stringify(line.id)} after p${prevId} — ids are strictly increasing, because the server counts from the max existing one`);
      prevId = n;
      if (!nonEmptyString(line.title))
        bad(`proposal ${JSON.stringify(line.id)} carries title ${shown(line.title)} — a proposal names what it is`);
      if (!nonEmptyString(line.why))
        bad(`proposal ${JSON.stringify(line.id)} carries why ${shown(line.why)} — a proposal says why, in the model's own prose`);
      // REFUSAL 2.
      if (!nonEmptyString(line.wrong_if))
        bad(`proposal ${JSON.stringify(line.id)} carries wrong_if ${shown(line.wrong_if)} — an option with no kill criterion is a wish, and every other claim in this system carries one (refusal 2)`);
      // REFUSAL 1, first half: the shape. The cross-reference is pass 2.
      if (!Array.isArray(line.rests_on) || line.rests_on.length === 0)
        bad(`proposal ${JSON.stringify(line.id)} carries rests_on ${shown(line.rests_on)} — a proposal names at least one record_decision seq it rests on. A decision with no evidence is recorded and flagged because a session must not deadlock; a proposal resting on nothing has no reason to exist (refusal 1)`);
      for (const seq of line.rests_on)
        if (!Number.isInteger(seq) || seq < 1)
          bad(`proposal ${JSON.stringify(line.id)} rests on ${shown(seq)} — rests_on holds 1-based integer seqs from this run's ledger (refusal 1)`);
      if (!nonEmptyString(line.model))
        bad(`proposal ${JSON.stringify(line.id)} carries model ${shown(line.model)} — the server records which model proposed it`);
      if (!nonEmptyString(line.fingerprint))
        bad(`proposal ${JSON.stringify(line.id)} carries fingerprint ${shown(line.fingerprint)} — the server records which prompt surface proposed it`);
    } else {
      if (!VERDICTS.includes(line.verdict))
        bad(`proposal line ${i} (verdict) carries verdict ${shown(line.verdict)}, which is not one of ${VERDICTS.join(" · ")} — "proposed" is the ABSENCE of a verdict and is never written to a line`);
      if (typeof line.proposal_id !== "string" || !PROPOSAL_ID_RE.test(line.proposal_id))
        bad(`proposal line ${i} (verdict) carries proposal_id ${shown(line.proposal_id)} — it names a proposal by its p<n> id`);
      if (!nonEmptyString(line.reason))
        bad(`proposal line ${i} (verdict on ${JSON.stringify(line.proposal_id)}) carries reason ${shown(line.reason)} — the owner says why, and the reason is the record`);
    }
  });

  // PASS 2 — the cross-references. REFUSAL 1's teeth, and the verdict's own.
  const kindOf = new Map(ops.map((r) => [r?.seq, r?.op]));
  lines.forEach((line, i) => {
    if (line.type === "proposal") {
      for (const seq of line.rests_on) {
        const got = kindOf.get(seq);
        if (got === undefined)
          bad(`proposal ${JSON.stringify(line.id)} rests on seq ${seq}, which this run's ledger does not carry — rests_on names a record_decision the model was shown (refusal 1)`);
        if (got !== "record_decision")
          bad(`proposal ${JSON.stringify(line.id)} rests on seq ${seq}, which is a ${got}, not a record_decision — rests_on names decisions, and a proposal rests on them (refusal 1)`);
      }
      return;
    }
    if (!seen.has(line.proposal_id))
      bad(`proposal line ${i} (verdict) names proposal_id ${JSON.stringify(line.proposal_id)}, which this package does not carry — a verdict is the owner's answer to a proposal that exists`);
  });

  return [...lines];
}

// ---------------------------------------------------------------------------------------------------
// The derived status. Pure, no clock, no filesystem.
// ---------------------------------------------------------------------------------------------------

// Every proposal in FILE ORDER, each with every verdict line naming it (also in file order) and the
// derived status. The verdict arrays are COPIES: a fold that handed out its input's own objects would
// let a consumer rewrite an append-only record without a write — the alias trap group 30 case 13
// catches on opLine.
export function foldProposals(lines) {
  const all = Array.isArray(lines) ? lines : [];
  const proposals = all.filter((l) => l && l.type === "proposal");
  const verdicts = all.filter((l) => l && l.type === "verdict");
  return proposals.map((proposal, i) => {
    const mine = verdicts.filter((v) => v.proposal_id === proposal.id).map((v) => ({ ...v }));
    const last = mine[mine.length - 1];
    return {
      proposal: { ...proposal, rests_on: Array.isArray(proposal.rests_on) ? [...proposal.rests_on] : [] },
      status: last && VERDICTS.includes(last.verdict) ? last.verdict : STATUSES[0],
      verdicts: mine,
      seq: i + 1,
    };
  });
}

export function statusOf(id, lines) {
  return foldProposals(lines).find((r) => r.proposal.id === id)?.status ?? STATUSES[0];
}

// One count per status, always all four keys, in STATUSES order — a caller rendering a zero must not
// have to distinguish "none" from "absent".
export function statusCounts(lines) {
  const folded = foldProposals(lines);
  return Object.fromEntries(STATUSES.map((s) => [s, folded.filter((r) => r.status === s).length]));
}

// ---------------------------------------------------------------------------------------------------
// THE SECTION MAP. One row per section, in output order, frozen at BOTH levels: Object.freeze is
// shallow, and a writable row would let case 34.1's frozen-by-mutation assertion pass for the wrong
// reason.
//
// `axis` is what selects the section: `status` is the derived status (a proposal renders ONCE, in its
// status's section, and nowhere else — case 34.2 iterates STATUSES against these rows in both
// directions, so a fifth status with no home fails BY NAME); `cross-ref` names decisions by seq and
// never re-renders a proposal.
//
// `empty` is THE EXACT STRING the section renders when its selection is empty, declared per row and
// DISTINCT per row — a copy-pasted one would make the vanishing-claim case pass for the wrong reason.
// ---------------------------------------------------------------------------------------------------
export const PROPOSAL_SECTIONS = Object.freeze([
  {
    id: "proposed",
    heading: "Awaiting a verdict",
    axis: "status",
    from: "proposed",
    empty: "_No proposal is awaiting a verdict._",
  },
  {
    id: "accepted",
    heading: "Accepted",
    axis: "status",
    from: "accepted",
    empty: "_The owner accepted none of them._",
  },
  {
    id: "refused",
    heading: "Refused",
    axis: "status",
    from: "refused",
    empty: "_The owner refused none of them._",
  },
  {
    id: "parked",
    heading: "Parked",
    axis: "status",
    from: "parked",
    empty: "_The owner parked none of them._",
  },
  {
    id: "rested-on",
    heading: "The decisions these rest on",
    axis: "cross-ref",
    from: "every rests_on seq, resolved against the ledger",
    empty: "_No proposal names a decision, which the refusals make unreachable._",
  },
].map(Object.freeze));

// The bank entry NARROWED to the five fields a projection may carry, prd-projection.mjs's questionFor
// and its reasoning: a question's TEXT is a definition, not a claim about the product. weakAnswer
// (the agent's rubric), note and provenanceNote (the researcher's commentary) never leave this
// function, and case 34.10 asserts all three absent with a positive control.
const questionFor = (id) => {
  if (typeof id !== "string" || id === "") return null;
  const q = questionById(id);
  return q ? { id: q.id, text: q.text, attribution: q.attribution, stage: q.stage, label: q.label } : null;
};

// ---------------------------------------------------------------------------------------------------
// The renderers.
//
// THE CONTAINMENT RULE, and it is the acceptance criterion: NOTHING MODEL-AUTHORED REACHES COLUMN 0
// AS STRUCTURE.
//   · title, wrong_if, model, fingerprint and a verdict's reason go through fold() and are ALWAYS
//     preceded on their line by a literal, so a folded "## X" is not at line start and is not ATX;
//   · why goes through blockquote() — it is prose and may legitimately be multi-paragraph;
//   · anything in a table goes through cell();
//   · the "#### " heading carries ONLY the id and the derived status, and both are VALIDATED rather
//     than folded: checkProposalLines refuses an id outside PROPOSAL_ID_RE and a verdict outside
//     VERDICTS, so neither can carry a payload as far as a renderer. That is what lets the heading be
//     the one line on the page with no containment applied.
// ---------------------------------------------------------------------------------------------------

const restsOnLine = (rests, bySeq) => {
  const parts = rests.map((seq) => {
    const rec = bySeq.get(seq);
    if (!rec) return `seq ${seq} — not in this ledger`;
    const qid = rec.params?.question_id;
    return `seq ${seq} (${fold(rec.params?.level ?? "?")} · ${qid === null || qid === undefined ? "off-script" : `\`${fold(qid)}\``})`;
  });
  return `*Rests on:* ${parts.length ? parts.join(" · ") : "none"}`;
};

function renderProposal(row, { bySeq }) {
  const p = row.proposal;
  const lines = [];
  lines.push(`#### ${p.id} — ${row.status}`);
  lines.push("");
  lines.push(`**Title:** ${fold(p.title)}`);
  lines.push(restsOnLine(p.rests_on, bySeq));
  lines.push(`*Wrong if:* ${fold(p.wrong_if)}`);
  lines.push(`*Proposed by:* ${fold(p.model)} · prompt surface \`${fold(p.fingerprint)}\` · ${field(p.ts)}`);
  // Every verdict, in file order, the earlier ones MARKED rather than dropped — the rule
  // prd-projection.mjs states for a superseded decision, applied to the owner changing their mind.
  row.verdicts.forEach((v, i) => {
    const next = row.verdicts[i + 1];
    const superseded = next ? ` _(superseded by the verdict of ${field(next.ts)})_` : "";
    // Its OWN ts, not only the superseding one's: the last verdict is the one that decides the
    // status, and a status with no date is a claim the page cannot place in time.
    lines.push(`*Verdict:* **${v.verdict}** — ${fold(v.reason)} · ${field(v.ts)}${superseded}`);
  });
  lines.push("");
  lines.push(blockquote(p.why));
  return lines.join("\n");
}

const statusSection = (status, state) => {
  const rows = state.folded.filter((r) => r.status === status);
  if (!rows.length) return null;
  return rows.map((r) => renderProposal(r, state)).join("\n\n");
};

// The cross-reference: one row per decision any proposal rests on, in seq order, naming which
// proposals rest on it. The bank question's TEXT reaches a table cell, so it goes through cell().
function renderRestedOn(state) {
  const { folded, bySeq } = state;
  const bySeqUsed = new Map();
  for (const r of folded)
    for (const seq of r.proposal.rests_on) {
      if (!bySeqUsed.has(seq)) bySeqUsed.set(seq, []);
      bySeqUsed.get(seq).push(r.proposal.id);
    }
  if (bySeqUsed.size === 0) return null;
  const rows = [...bySeqUsed.keys()].sort((a, b) => a - b).map((seq) => {
    const rec = bySeq.get(seq);
    const q = questionFor(rec?.params?.question_id);
    const question = q ? `"${q.text}" — ${q.attribution} · ${q.label} (stage ${q.stage})`
      : rec?.params?.question_id ? `${rec.params.question_id} — the bank does not hold this id`
        : rec ? "off-script — no banked question" : "not in this ledger";
    return `| ${seq} | ${cell(rec?.params?.level ?? "—")} | ${cell(question)} | ${cell(bySeqUsed.get(seq).join(" · "))} |`;
  });
  return ["| seq | Level | Question | Rested on by |", "|---|---|---|---|", ...rows].join("\n");
}

const PROPOSAL_RENDERERS = Object.freeze({
  proposed: (s) => statusSection("proposed", s),
  accepted: (s) => statusSection("accepted", s),
  refused: (s) => statusSection("refused", s),
  parked: (s) => statusSection("parked", s),
  "rested-on": renderRestedOn,
});

// ---------------------------------------------------------------------------------------------------
// projectProposals — the whole page. PURE: no filesystem, no clock, no network, no SDK. Returns a
// markdown string ending in exactly one "\n".
// ---------------------------------------------------------------------------------------------------
export function projectProposals(pkg) {
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg))
    bad(`projectProposals takes { run, ops, proposals } (got ${shown(pkg)})`);
  const { run, ops, proposals } = pkg;
  if (!run || typeof run !== "object" || Array.isArray(run))
    bad(`"run" must be the parsed run.json object (got ${shown(run)})`);
  if (typeof run.slug !== "string" || run.slug.trim() === "")
    bad(`run.slug must be a non-empty string (got ${shown(run.slug)})`);
  if (!Array.isArray(ops)) bad(`"ops" must be the run's op records array (got ${shown(ops)})`);
  const checked = checkProposalLines(proposals, ops);
  const folded = foldProposals(checked);
  const counts = statusCounts(checked);
  const state = { run, ops, folded, bySeq: new Map(ops.map((r) => [r?.seq, r])) };

  const out = [];
  out.push(`# ${fold(run.slug)} — feature proposals from a discovery run`);
  out.push("");
  // The honesty header — the one paragraph on the page not derived from a record.
  out.push("> **Two authors, and the page says which.** A model wrote every proposal's title, why, "
    + "rests_on and wrong_if; the owner wrote every verdict and its reason; the ids, timestamps, model "
    + "and prompt-surface fingerprint are the server's. **These are OPTIONS, never truth.** `prd.md` "
    + "does not carry them and never will — it is a pure fold over the run's ops, and a model has no "
    + "route into it. An **accepted** proposal is NOT a decision and has no route into the requirement "
    + "hierarchy: if the owner wants it there they answer a banked question in a session, and the "
    + "existing pipeline files it from their own words. **This file is REGENERATED on every verdict, "
    + "so a hand edit is lost** — the opposite of `prd.md`'s rule, and deliberately so, because a "
    + "verdict changes the page and a refuse-to-overwrite would break the feature. Generated by "
    + "`discovery/proposals.mjs` (epic #295, #359).");
  out.push("");
  out.push(`**Run** — \`${field(run.slug)}\` · ${field(run.provenance)} (${field(run.label)}) · depth ${field(run.depth)} · ended ${run.endedAt === null || run.endedAt === undefined ? "open" : field(run.endedAt)} · package [\`${field(run.root)}\`](./)`);
  out.push("");
  out.push(`**Proposals** — ${folded.length}: ${STATUSES.map((s) => `${s} ${counts[s]}`).join(" · ")}`);

  for (const row of PROPOSAL_SECTIONS) {
    const body = PROPOSAL_RENDERERS[row.id](state);
    out.push("");
    out.push(`## ${row.heading}`);
    out.push("");
    out.push(body === null || body === undefined ? row.empty : body);
  }

  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

// The portal's read projection — a WHITELIST, exported and gate-driven, so the route holds no shape
// opinion of its own (turnEvent's rule, portal/lib/discovery.mjs). PURE over a read package: the
// route calls proposalsView(readProposalPackage(root)), which keeps the filesystem in the shell where
// group 34 can still drive this function in CI.
export function proposalsView(pkg) {
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg))
    bad(`proposalsView takes { run, ops, proposals } (got ${shown(pkg)})`);
  const { run, ops, proposals } = pkg;
  if (!run || typeof run !== "object" || Array.isArray(run)) bad(`"run" must be the parsed run.json object (got ${shown(run)})`);
  if (!Array.isArray(ops)) bad(`"ops" must be the run's op records array (got ${shown(ops)})`);
  const checked = checkProposalLines(proposals, ops);
  return {
    head: {
      slug: run.slug ?? null,
      provenance: run.provenance ?? null,
      label: run.label ?? null,
      depth: run.depth ?? null,
      endedAt: run.endedAt ?? null,
      root: run.root ?? null,
    },
    proposals: foldProposals(checked),
    counts: statusCounts(checked),
    // The decisions a proposal may rest on, narrowed the way questionFor narrows the bank.
    decisions: ops.filter((r) => r?.op === "record_decision").map((r) => ({
      seq: r.seq,
      level: r.params?.level ?? null,
      question_id: r.params?.question_id ?? null,
      question: questionFor(r.params?.question_id)?.text ?? null,
      wrong_if: r.params?.wrong_if ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------------------------------
// The filesystem shell. Nothing below decides what the page says.
// ---------------------------------------------------------------------------------------------------

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Each parsed line WITH its 1-based file line number. A ten-line copy of prd-projection.mjs's private
// readJsonl rather than a fourth export from it, because every message that module raises is prefixed
// `prd-projection:` and would send an operator to the wrong file. Blank lines are skipped, so an array
// index is not a line number.
function readProposalsJsonl(path) {
  if (!existsSync(path)) return []; // an absent proposals.jsonl reads as []
  const out = [];
  readFileSync(path, "utf8").split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    try { out.push({ n: i + 1, value: JSON.parse(line) }); } catch (e) { bad(`${path} line ${i + 1} is not JSON — ${e.message}`); }
  });
  return out;
}

// The four files → what projectProposals takes. readPackage is prd-projection.mjs's — ONE reader, one
// refusal set, and it already refuses a transcript line outside the three types. The proposal lines are
// NOT filtered by type: a `.filter(type === "proposal")` would silently drop a well-formed line whose
// type read "proposalx", and checkProposalLines refuses it by name instead.
export function readProposalPackage(root) {
  const { run, answers, ops } = readPackage(root);
  const proposals = readProposalsJsonl(join(root, "proposals.jsonl")).map((l) => l.value);
  return { run, answers, ops, proposals };
}

// Project and write <root>/proposals.md. ALWAYS OVERWRITES, and that is the deliberate difference from
// writePrd: prd.md refuses without --force because it is generated and then hand-edited, while
// proposals.md is regenerated on every verdict, so a refusal would break the feature. The compensating
// guard is build-checks case 34.11's byte compare, not a refusal.
export function writeProposalsMd(root) {
  const pkg = readProposalPackage(root);
  const md = projectProposals(pkg);
  const path = join(root, "proposals.md");
  writeFileSync(path, md);
  return { path, bytes: Buffer.byteLength(md, "utf8"), wrote: true, slug: pkg.run.slug, proposals: foldProposals(pkg.proposals).length };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which import.meta.url
// percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const rootAt = argv.indexOf("--root");
  const rootArg = rootAt === -1 ? null : (argv[rootAt + 1] ?? null);
  const slug = argv.find((a, i) => !a.startsWith("--") && !(rootAt !== -1 && i === rootAt + 1)) ?? null;
  try {
    if (rootAt !== -1 && (rootArg === null || rootArg.startsWith("--")))
      throw new Error(`--root takes a directory — the next argument is ${rootArg === null ? "absent" : JSON.stringify(rootArg)}`);
    if (rootArg && slug)
      throw new Error(`give a slug OR --root, not both — got slug ${JSON.stringify(slug)} and --root ${JSON.stringify(rootArg)}`);
    if (!rootArg && !slug)
      throw new Error("usage: node discovery/proposals.mjs <slug> [--stdout]  |  --root <dir> [--stdout]");
    const root = rootArg ? resolve(rootArg) : join(ROOT, "discovery", slug);
    if (argv.includes("--stdout")) {
      process.stdout.write(projectProposals(readProposalPackage(root)));
    } else {
      const r = writeProposalsMd(root);
      console.log(`proposals ✓  ${r.slug} → ${PROPOSAL_SECTIONS.length} sections, ${r.proposals} proposal(s) (${rootArg ? r.path : `discovery/${slug}/proposals.md`})`);
    }
  } catch (e) {
    console.error(`proposals ✗  ${e.message}`);
    process.exit(1);
  }
}
