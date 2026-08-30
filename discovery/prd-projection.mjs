// discovery/prd-projection.mjs — the run package projected into the house PRD shape: a PURE FOLD over
// the transcript's op lines (epic #279, ticket #290; architecture §Data model → "The generated PRD is a
// pure fold over the ops"; the house shape is .claude/skills/plan-create-prd/SKILL.md).
//
// It lives here and not in agent-layer/, and the reason is measurable rather than aesthetic:
// agent-layer/gen-loc-summary.mjs counts ^agent-layer/[^/]+\.mjs$ into system/loc-summary.json, which
// approach.html renders at view time and whose VR baselines would then churn — the tripwire the epic's
// standing rules name. discovery/ matches no loc group. (This closes the architecture doc's open
// question "Where the PRD projection lives".)
//
// TWO HALVES, the split agent-layer/gen-replay.mjs uses:
//   · a PURE core — projectPrd + checkOpLines + the renderers. No filesystem, no clock, no network, no
//     SDK. Same input, byte-identical output, which is what lets tooling/build-checks.mjs group 31
//     drive every rule over an in-memory fixture package.
//   · a THIN filesystem shell — readPackage / writePrd / the CLI guard. It reads three files and writes
//     one, and nothing in it decides what the page says.
//
// THE LOAD-BEARING PROPERTY is not the markdown. Everything on the page resolves to one of five
// sources and nothing else has a route: an op's own params (wrong_if, reason, missing[], level,
// provenance, url), an answer resolved by answer_ref (the human's verbatim words), a bank question
// resolved by question_id, the applier's derived fields (seq, flagged, supersedes), and run.json's
// header. So a generated PRD cannot carry a claim the ops do not, and group 31 proves it by DELETING
// an op and watching its claim vanish from the whole document.
//
// WHY THE BANK IMPORT IS NOT A VIOLATION of "reads the package and nothing else": ops.mjs invariant 6
// names "the projection" as a caller that supplies the bank, and a question's TEXT is a definition,
// not a claim about the product. The claim is the human's answer and the agent's filing. Five fields
// are carried — id, text, attribution, stage, label — and three are excluded ON PURPOSE:
//   · weakAnswer     — the agent's scoring rubric, not a statement about this product;
//   · note           — the researcher's commentary about the question;
//   · provenanceNote — the same, about the citation.
// questionFor() is the one narrowing point, and case 31.8 asserts all three absent with a positive
// control so the assertion cannot pass because the bank was never read.
//
// WHY prd.md IS OUTSIDE tooling/drift-check.mjs: it is generated and THEN EDITED BY THE HUMAN. That is
// the same reason writePrd refuses to overwrite an existing prd.md without --force, and the refusal
// message says so — it is the documentation most operators will ever read.
//
// TWO COUNTED SETS, and the page SAYS WHICH. `visible` — the latest decision per banked question,
// plus every off-script one — selects the ladder sections, Non-goals and the Requirement hierarchy's
// counts. The WHOLE ledger drives Success metrics, the Evidence gap list and the Ledger line, because
// nothing is removed (discovery/README.md §Supersede) and a retracted kill criterion is part of the
// record. Every over-the-whole-ledger surface MARKS a replaced record ("superseded by seq N") and the
// Ledger line names its own set, so `orphan 2` beside `orphans 1` is resolvable rather than a
// contradiction. Marking, never dropping: dropping would delete a record the ops still carry.
//
// NO CLOCK. Every date on the page comes from run.json; ordering is by seq or by SECTIONS order, never
// by Object.keys iteration. NO LENGTH CAP: answers.jsonl is verbatim by contract (discovery/README.md),
// and a truncated verbatim answer is a quietly altered one. portal/lib/discovery.mjs's
// TURN_EVENT_TEXT_MAX caps the SSE wire, not the package — it is not copied here.
//
// Standalone:  node discovery/prd-projection.mjs <slug> [--stdout] [--force]
//              node discovery/prd-projection.mjs --root <dir> [--stdout] [--force]
// Paths resolve from this module (NOT cwd). Format → discovery/README.md.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { questionById, STAGES } from "./bank.mjs";
import { FLAGS, LEVELS, OPS, PARAMS, PROVENANCE, SOURCES } from "./ops.mjs";

// ---------------------------------------------------------------------------------------------------
// Markdown helpers. Declared ABOVE SECTIONS because the table's `empty` strings call tbd() at module
// evaluation — a const arrow declared below would be in its temporal dead zone.
// ---------------------------------------------------------------------------------------------------

// The house anti-fluff idiom (.claude/skills/plan-create-prd/SKILL.md): unknown → say so, never invent.
// The `why` names what the RUN did not record, not what the reader should do.
const tbd = (why) => `_TBD — ${why}._`;

// FOLD ONTO ONE LINE. This is the containment for every AGENT-AUTHORED value and every run.json
// field, because those reach the page as markdown STRUCTURE — `*Wrong if:* …`, a `#### ` heading, a
// table cell — rather than inside a quote. ops.mjs validates wrong_if / reason / missing[] as
// non-empty strings and a url by its scheme prefix, and folds nothing, so a newline inside one would
// open a `## ` section the ops do not carry and a reader could not tell the projection had not
// assigned that claim to that section. It is a 1:1 substitution, never a trim or a cap: no character
// is removed, so it does not collide with the no-truncation rule above. A human's ANSWER never comes
// through here — it goes through blockquote(), verbatim. Case 31.13 drives every param.
//
// EVERY line-ending CHARACTER, not just LF. CommonMark's line ending is a line feed, a carriage
// return not followed by one, or the CRLF pair, and stripping only the first left the other two
// opening real headings. CRLF was worse than a miss: replacing its `\n` alone left the `\r` as a
// bare line ending AND inserted the one leading space that lets ATX still read `## `. The character
// class rather than /\r\n|\r|\n/ is what keeps the 1:1 claim above literally true — a CRLF pair
// becomes two spaces, so nothing is removed, and afterwards no line terminator survives at all.
const LINE_ENDING = /\r\n|\r|\n/;
const fold = (s) => String(s).replace(/[\r\n]/g, " ");

// For table cells ONLY, and only for URLs, labels, seqs and op params — never for a human answer. A
// `|` inside a cell splits the row, so it is escaped on top of the fold above.
const cell = (s) => fold(s).replace(/\|/g, "\\|");

// THIS IS HOW ALL ARBITRARY HUMAN TEXT REACHES THE PAGE. A blockquote makes every hostile construct
// inert: a leading `#` inside a `> ` line is not a heading, a leading `-` is not a list item that can
// break the surrounding structure, a `|` is not a cell boundary, and a fence cannot escape the quote.
const blockquote = (text) => {
  // Split on LOGICAL line endings (the CRLF pair is ONE break, not two) — fold()'s character class
  // is the wrong tool here, because an extra break would add a `>` line the human never wrote. A
  // bare CR was the hole: with a `\n`-only split, `"answer\r\r## X"` stayed one string, so `## X`
  // reached the page OUTSIDE the quote — the exact escape this function exists to make impossible.
  const s = typeof text === "string" ? text.replace(/(?:\r\n|\r|\n)+$/, "") : "";
  if (s.trim() === "") return "> _[no text]_";
  return s.split(LINE_ENDING).map((l) => (l === "" ? ">" : `> ${l}`)).join("\n");
};

// A value that may be absent or null, for the run header. run.json is NOT a closed shape — the real
// spine package carries a `posture` field the README does not document, and branch / endedAt /
// sessionId are legitimately null — so an absent field renders as an em dash and the string
// "undefined" never reaches the page (case 31.12).
const shown = (v) => (v === undefined ? "(absent)" : JSON.stringify(v));
const field = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.trim() === "" ? "—" : fold(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "—";
};

// ---------------------------------------------------------------------------------------------------
// The two judgement calls, pinned as named consts so a bank rename fails loudly in group 31 rather
// than silently emptying a section. The bank's own rule — ids are hand-chosen and stable — is what
// makes the coupling safe (discovery/bank.mjs's header).
// ---------------------------------------------------------------------------------------------------

// Measurement is a STAGE of the bank, not a rung of the ladder, so Success metrics keys on it.
export const METRIC_STAGE = 7;
const METRIC_STAGE_LABEL = STAGES.find((s) => s.n === METRIC_STAGE)?.label ?? `stage ${METRIC_STAGE}`;

// The bank's two questions that ask what is EXCLUDED. Non-goals is their cross-reference and nothing
// else — a section that guessed at exclusions would be exactly the invented claim this fold forbids.
export const NON_GOAL_QUESTIONS = Object.freeze(["s3-deliberately-not-doing", "s4-out-of-bounds"]);

const TRANSITION_NA = "**n/a** — the run recorded no transition-level decision, so no organisational change was elicited. "
  + "Transition requirements are implementation needs — data migration, training materials, support setup, business "
  + "continuity (docs/research/requirements-hierarchy.md). Mark this section n/a with a reason, or run the questions "
  + "that would elicit them.";

// ---------------------------------------------------------------------------------------------------
// THE SECTION MAP. One row per PRD section, in output order. Frozen at both levels: Object.freeze is
// shallow, and a writable row would let group 31's frozen-by-mutation case pass for the wrong reason.
//
// `axis` is WHICH PROPERTY OF THE RECORDS SELECTS THE SECTION, and there are only two that select
// decisions:
//   · ladder   — the decision's `level`. A decision renders ONCE, in its ladder section, and nowhere
//                else. Group 31 iterates LEVELS against these rows in both directions.
//   · op-kind  — the record's verb. Group 31 iterates OPS against these rows in both directions, so a
//                fifth verb with no home fails BY NAME rather than being silently dropped.
// The other two never re-render a decision, which is what keeps anything from appearing twice:
//   · cross-ref — names decisions by `seq`;
//   · derived   — renders the applier's own fields (the ladder, the flags, the counts).
//
// `empty` is THE EXACT STRING THIS SECTION RENDERS WHEN ITS SELECTION IS EMPTY, declared per row
// rather than inferred. A renderer that finds nothing returns its row's `empty` and nothing else, so
// case 31.7.1's vanishing-claim loop needs no `transition` special case for its **n/a** paragraph —
// and a future rung with its own bespoke empty state is covered the day it lands.
// ---------------------------------------------------------------------------------------------------
export const SECTIONS = Object.freeze([
  {
    id: "problem",
    heading: "Problem",
    axis: "ladder",
    from: "business",
    why: "The 'what and why' rung: a business decision is the problem this exists to solve, so the run's business-level decisions ARE this section.",
    empty: tbd("the run recorded no business-level decision"),
  },
  {
    id: "evidence",
    heading: "Evidence",
    axis: "op-kind",
    from: "file_evidence",
    why: "Every filed row with its provenance label and the claim it backs. The `empty` string replaces the TABLE only — the 'Decisions resting on no evidence' line is appended either way, because a run with no evidence and two unbacked decisions must still say so.",
    empty: tbd("the run filed no evidence"),
  },
  {
    id: "hypothesis",
    heading: "Hypothesis",
    axis: "cross-ref",
    from: "the wrong_if of every business and stakeholder decision",
    why: "The falsifiers, named by seq and never re-rendered. It reads business and stakeholder only: a falsifier for a screen-level choice is not a hypothesis about the product, and Success metrics already carries every wrong_if.",
    empty: tbd("the run recorded no business- or stakeholder-level decision to falsify"),
  },
  {
    id: "users",
    heading: "Target user and JTBD",
    axis: "ladder",
    from: "stakeholder",
    why: "'What a user can do' — the stakeholder rung of the BABOK ladder is the job-to-be-done in the op grammar's own terms.",
    empty: tbd("the run recorded no stakeholder-level decision"),
  },
  {
    id: "mvp",
    heading: "MVP",
    axis: "ladder",
    from: "solution",
    why: "The solution rung: functional and non-functional requirements, the thinnest line the run actually committed to.",
    empty: tbd("the run recorded no solution-level decision"),
  },
  {
    id: "metrics",
    heading: "Success metrics",
    axis: "cross-ref",
    from: "decisions on a stage 7 question, plus every decision's wrong_if as a kill criterion",
    why: "Measurement is a bank STAGE rather than a ladder rung, so this cross-references by seq. The second table is EVERY decision's kill criterion — deliberately a wider set than Hypothesis reads.",
    empty: tbd(`the run recorded no decision, so there is no stage ${METRIC_STAGE} (${METRIC_STAGE_LABEL}) answer and no kill criterion`),
  },
  {
    id: "non-goals",
    heading: "Non-goals",
    axis: "cross-ref",
    from: `decisions on ${NON_GOAL_QUESTIONS.join(" and ")}`,
    why: "The bank's two questions that ask what is excluded. Cross-referenced by seq, never re-rendered, and never guessed at — an invented non-goal is the exact failure this fold forbids.",
    empty: tbd(`the run answered neither of the bank's two exclusion questions (${NON_GOAL_QUESTIONS.join(", ")})`),
  },
  {
    id: "open-questions",
    heading: "Open questions",
    axis: "op-kind",
    from: "open_question",
    why: "MVP 8's parked questions and MVP 9's off-script ones, each with the reason it was parked rather than answered.",
    empty: tbd("the run parked no question"),
  },
  {
    id: "weak-answers",
    heading: "Weak answers",
    axis: "op-kind",
    from: "flag_weak_answer",
    why: "The missing[] list needs a visible home or the agent's only substantive-looking output is silently dropped from the artefact the session exists to produce.",
    empty: tbd("the run flagged no weak answer"),
  },
  {
    id: "transition",
    heading: "Transition note",
    axis: "ladder",
    from: "transition",
    why: "The pack's seventh artefact. Present when the run recorded a transition decision; an explicit n/a naming what was not elicited otherwise, which is a different renderer on purpose.",
    empty: TRANSITION_NA,
  },
  {
    id: "hierarchy",
    heading: "Requirement hierarchy",
    axis: "derived",
    from: "every decision's level and parent_id",
    why: "The ladder rendered as a ladder: each rung's decisions naming their parent's seq, orphans marked from the record's own flag, and a counts line.",
    empty: tbd("the run recorded no decision"),
  },
].map(Object.freeze));

// ---------------------------------------------------------------------------------------------------
// checkOpLines — refuse a corrupted op ledger BY NAME. Pure and total.
//
// It does NOT re-fold with applyOps: applyOps refuses an item carrying seq / closes / flagged by
// design (ops.mjs's item envelope is exact), so a re-derivation would throw on valid history, and a
// re-derivation that DISAGREED with a committed package would be worse still. The recorded op lines
// are authoritative; this guard only catches a file that has been corrupted or mis-filtered.
//
// The op-roster check runs FIRST so a `text` or `denied` line — the two transcript line types
// readPackage filters out — is refused naming its `type`, rather than falling through to a confusing
// message about a seq it never had.
// ---------------------------------------------------------------------------------------------------
export function checkOpLines(lines) {
  if (!Array.isArray(lines)) throw new Error(`prd-projection: the op lines must be an array (got ${shown(lines)})`);
  let prev = 0;
  lines.forEach((line, i) => {
    if (!line || typeof line !== "object" || Array.isArray(line))
      throw new Error(`prd-projection: op line ${i} is not an object (got ${shown(line)})`);
    if (typeof line.op !== "string" || !OPS.includes(line.op))
      throw new Error(`prd-projection: op line ${i}${typeof line.type === "string" ? ` carries type ${JSON.stringify(line.type)} and` : ""} names op ${shown(line.op)}, which is not one of ${OPS.join(" · ")} — a text or denied line must be filtered out before the fold`);
    const params = line.params;
    if (!params || typeof params !== "object" || Array.isArray(params))
      throw new Error(`prd-projection: op line ${i} (${line.op}) has no params object (got ${shown(params)})`);
    const want = PARAMS[line.op];
    const got = Object.keys(params);
    const extra = got.filter((k) => !want.includes(k));
    const absent = want.filter((k) => !got.includes(k));
    if (extra.length || absent.length)
      throw new Error(`prd-projection: op line ${i} (${line.op}) carries ${got.join(", ") || "no params"} — it takes exactly ${want.join(", ")}${extra.length ? `; unknown: ${extra.join(", ")}` : ""}${absent.length ? `; absent: ${absent.join(", ")}` : ""}`);
    if (!Number.isInteger(line.seq) || line.seq < 1)
      throw new Error(`prd-projection: op line ${i} carries seq ${shown(line.seq)} — seqs are 1-based integers assigned by the applier`);
    if (line.seq <= prev)
      throw new Error(`prd-projection: op line ${i} carries seq ${line.seq} after seq ${prev} — seqs are strictly increasing`);
    prev = line.seq;
    if (typeof line.closes !== "boolean")
      throw new Error(`prd-projection: op line ${i} (${line.op}) carries closes ${shown(line.closes)} — it must be true or false`);
    if (!Array.isArray(line.flagged))
      throw new Error(`prd-projection: op line ${i} (${line.op}) carries flagged ${shown(line.flagged)} — it must be an array`);
    for (const f of line.flagged)
      if (!FLAGS.includes(f))
        throw new Error(`prd-projection: op line ${i} (${line.op}) carries flag ${shown(f)}, which is not one of ${FLAGS.join(" · ")}`);
    if (line.supersedes !== null && !Number.isInteger(line.supersedes))
      throw new Error(`prd-projection: op line ${i} (${line.op}) carries supersedes ${shown(line.supersedes)} — it is null or an earlier seq`);
    if (line.op === "record_decision" && !LEVELS.includes(params.level))
      throw new Error(`prd-projection: op line ${i} (record_decision) carries level ${shown(params.level)}, which is not on the ladder — ${LEVELS.join(" · ")}`);
    if (line.op === "open_question" && !SOURCES.includes(params.source))
      throw new Error(`prd-projection: op line ${i} (open_question) carries source ${shown(params.source)}, which is not one of ${SOURCES.join(" · ")}`);
    if (line.op === "file_evidence" && !PROVENANCE.includes(params.provenance))
      throw new Error(`prd-projection: op line ${i} (file_evidence) carries provenance ${shown(params.provenance)}, which is not one of ${PROVENANCE.join(" · ")}`);
  });

  // The cross-references, in a SECOND pass: a ref names an earlier seq, so the seq → verb map has to
  // exist first. The applier refuses a wrong-kind parent at filing time; a corrupted or mis-filtered
  // ledger is exactly what this guard exists for (see the header above), and rendering
  // "*Parent:* seq 1 (undefined)" instead of refusing by name is the failure it forbids. An ABSENT
  // seq stays tolerated ON PURPOSE — renderDecision's "not in this ledger" branch is deliberate, and
  // this guard never re-derives history.
  const kindOf = new Map(lines.map((l) => [l.seq, l.op]));
  const crossRef = (i, verb, label, seq, want) => {
    if (!Number.isInteger(seq))
      throw new Error(`prd-projection: op line ${i} (${verb}) carries ${label} ${shown(seq)} — it is null or a seq`);
    const got = kindOf.get(seq);
    if (got !== undefined && got !== want)
      throw new Error(`prd-projection: op line ${i} (${verb}) names ${label} ${seq}, which is a ${got}, not a ${want}`);
  };
  lines.forEach((line, i) => {
    const p = line.params;
    if (line.op === "record_decision") {
      if (p.parent_id !== null) crossRef(i, line.op, "parent_id", p.parent_id, "record_decision");
      if (!Array.isArray(p.evidence_refs))
        throw new Error(`prd-projection: op line ${i} (record_decision) carries evidence_refs ${shown(p.evidence_refs)} — it must be an array of seqs`);
      for (const seq of p.evidence_refs) crossRef(i, line.op, "evidence_ref", seq, "file_evidence");
    }
    if (line.op === "file_evidence" && p.claim_ref !== null) crossRef(i, line.op, "claim_ref", p.claim_ref, "record_decision");
  });

  // `supersedes` is the same kind of value as the three above — applier-computed, re-read from a
  // possibly corrupted transcript — and it is LOAD-BEARING: supersededBy below is built from it, and
  // the three whole-ledger surfaces render "superseded by seq N" off that map. Left unchecked, a
  // decision could claim to replace a piece of evidence, and worse, two records could claim the same
  // seq — the Map is last-write-wins, so the loser's kill criterion sits in Success metrics
  // indistinguishable from a live one. That is the exact failure the supersede markers exist to
  // prevent, reachable through the one cross-reference the first pass did not cover.
  //
  // The applier sets `supersedes` only on record_decision (from findLast over the ops already
  // filed), so it is always a record_decision, always STRICTLY EARLIER, and never claimed twice —
  // all three are checked here rather than assumed. An ABSENT seq stays tolerated, exactly as
  // parent_id is: this guard refuses corruption, it never re-derives history.
  const claimedBy = new Map();
  lines.forEach((line, i) => {
    if (line.op !== "record_decision" || line.supersedes === null) return;
    crossRef(i, line.op, "supersedes", line.supersedes, "record_decision");
    if (line.supersedes >= line.seq)
      throw new Error(`prd-projection: op line ${i} (record_decision) at seq ${line.seq} supersedes ${line.supersedes} — a decision replaces an EARLIER one, never itself or a later one`);
    if (claimedBy.has(line.supersedes))
      throw new Error(`prd-projection: op line ${i} (record_decision) at seq ${line.seq} supersedes ${line.supersedes}, which seq ${claimedBy.get(line.supersedes)} already supersedes — one record is replaced by exactly one other, and the later claim would silently drop the earlier`);
    claimedBy.set(line.supersedes, line.seq);
  });
  return [...lines];
}

// ---------------------------------------------------------------------------------------------------
// The resolvers. All pure, all total — a selector answers over junk rather than throwing, because the
// only boundary that refuses is checkOpLines.
// ---------------------------------------------------------------------------------------------------

// The human's verbatim words, or null. An unresolvable ref is rendered as an explicit marker rather
// than as silence: a projection that quietly dropped it would hide a corrupted package.
const answerText = (answers, ref) => {
  const a = Array.isArray(answers) ? answers.find((x) => x && x.ref === ref) : null;
  return a && typeof a.text === "string" ? a.text : null;
};
const answerBlock = (answers, ref) => {
  const t = answerText(answers, ref);
  return t === null ? `_[answer ${cell(ref)} is not in answers.jsonl]_` : blockquote(t);
};

// The bank entry NARROWED to the five fields a PRD may carry. weakAnswer, note and provenanceNote
// never leave this function — see the header, and case 31.8.
const questionFor = (id) => {
  if (typeof id !== "string" || id === "") return null;
  const q = questionById(id);
  return q ? { id: q.id, text: q.text, attribution: q.attribution, stage: q.stage, label: q.label } : null;
};

// The question id as a heading or line fragment. Folded: checkOpLines does not check an id against
// the bank (the applier does), so a mis-filtered ledger can carry anything here.
const qidLabel = (id) => (id === null || id === undefined ? "off-script" : `\`${fold(id)}\``);

// One line naming the question a record was filed against, from the bank's DEFINITION of it.
const questionLine = (id) => {
  if (id === null || id === undefined) return "*Question:* off-script — no banked question";
  const q = questionFor(id);
  if (!q) return `*Question:* ${qidLabel(id)} — the bank does not hold this id`;
  return `*Question:* "${q.text}" — ${q.attribution} · ${q.label} (stage ${q.stage})`;
};

// The heading a decision at this rung renders under, read from SECTIONS so the cross-references
// cannot name a section that does not exist.
const headingForLevel = (level) => SECTIONS.find((r) => r.axis === "ladder" && r.from === level)?.heading ?? level;

// ---------------------------------------------------------------------------------------------------
// The decision index and the supersede READ. The applier computes `supersedes` per record; this is the
// other half of the same rule — the latest decision on a question renders, every earlier one is named
// inside it as replaced, and NOTHING IS REMOVED (discovery/README.md §Supersede).
//
// It keys on question_id ONLY, never on off_script: an off-script decision on a banked question does
// supersede the banked one, because the applier computes supersedes regardless.
// ---------------------------------------------------------------------------------------------------
function indexOps(ops) {
  const bySeq = new Map(ops.map((r) => [r.seq, r]));
  const decisions = ops.filter((r) => r.op === "record_decision");
  const evidence = ops.filter((r) => r.op === "file_evidence");
  const opened = ops.filter((r) => r.op === "open_question");
  const weak = ops.filter((r) => r.op === "flag_weak_answer");

  const latestByQuestion = new Map();
  for (const d of decisions) if (d.params.question_id !== null) latestByQuestion.set(d.params.question_id, d);

  // Visible = every off-script decision (each its own), plus the latest decision per banked question.
  const visible = decisions.filter((d) => {
    const qid = d.params.question_id;
    return qid === null || latestByQuestion.get(qid)?.seq === d.seq;
  });

  // The reverse of the applier's `supersedes`: replaced seq → the seq that replaced it. THREE
  // surfaces count over the WHOLE ledger rather than over `visible` — Success metrics, the Evidence
  // gap list and the Ledger line — because nothing is removed (README §Supersede). Without this map
  // they report a different number for the same fact than the hierarchy does, and a reader has no
  // way to resolve `orphan 2` against `orphans 1`. Marked, not dropped: dropping would delete a
  // record the ops still carry.
  const supersededBy = new Map();
  for (const d of decisions) if (d.supersedes !== null) supersededBy.set(d.supersedes, d.seq);

  return { bySeq, decisions, evidence, opened, weak, latestByQuestion, visible, supersededBy };
}

// ---------------------------------------------------------------------------------------------------
// renderDecision — the ONE block every ladder section uses, so a decision looks the same wherever it
// renders and appears in exactly one place.
//
// The flags are READ FROM THE RECORD's `flagged`, never re-derived. Re-deriving them here would create
// a second copy of the applier's rule that can drift, and the drift's visible form is an unbacked
// decision printed as if backed. Group 29 already proves the applier's version; case 31.5 proves this
// one is a read, by blanking `flagged` and watching both markers vanish.
// ---------------------------------------------------------------------------------------------------
function renderDecision(rec, { answers, bySeq }) {
  const p = rec.params;
  const lines = [];
  lines.push(`#### seq ${rec.seq} · ${qidLabel(p.question_id)} — ${p.level}`);
  lines.push("");
  lines.push(answerBlock(answers, p.answer_ref));
  lines.push("");
  lines.push(questionLine(p.question_id));
  lines.push(`*Wrong if:* ${fold(p.wrong_if)}`);

  const above = LEVELS[LEVELS.indexOf(p.level) - 1] ?? null;
  let parent;
  if (p.level === "business") parent = "*Parent:* none — a business decision has no parent";
  else if (p.parent_id === null) parent = "*Parent:* none";
  else {
    const par = bySeq.get(p.parent_id);
    parent = par ? `*Parent:* seq ${p.parent_id} (${par.params.level})` : `*Parent:* seq ${p.parent_id} — not in this ledger`;
  }
  if (rec.flagged.includes("orphan")) parent += ` · ⚠ **orphan** — a ${p.level} decision naming no ${above ?? "higher-rung"} requirement`;
  lines.push(parent);

  const refs = p.evidence_refs.map((s) => {
    const e = bySeq.get(s);
    if (!e) return `seq ${s} — not in this ledger`;
    const src = e.params.url !== null ? fold(e.params.url) : `answer ${fold(e.params.ref)}`;
    return `seq ${s} — ${e.params.provenance} — ${src}`;
  });
  let ev = refs.length ? `*Evidence:* ${refs.join(" · ")}` : "*Evidence:* none";
  if (rec.flagged.includes("no-evidence")) ev += " · ⚠ **no-evidence**";
  lines.push(ev);

  // Any flag the two lines above do not carry still renders — FLAGS is the roster, and a fifth member
  // must never be silently dropped from the record it belongs to.
  const rest = rec.flagged.filter((f) => f !== "orphan" && f !== "no-evidence");
  if (rest.length) lines.push(`*Flags:* ${rest.map((f) => `⚠ **${f}**`).join(" · ")}`);

  if (rec.supersedes !== null) lines.push(`*Replaces:* seq ${rec.supersedes} (kept in the ops)`);
  if (p.off_script === true) lines.push("*Filed:* off-script");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------------
// The eleven section renderers. Each returns the section's BODY — projectPrd writes the `## ` heading
// from SECTIONS, so the heading list is the table's and nothing can add one.
// ---------------------------------------------------------------------------------------------------

const rungSection = (level, state) => {
  const rows = state.visible.filter((d) => d.params.level === level);
  if (!rows.length) return null;
  return rows.map((d) => renderDecision(d, state)).join("\n\n");
};

function renderEvidence(state) {
  const { evidence, decisions, supersededBy } = state;
  const parts = [];
  if (!evidence.length) parts.push(SECTIONS.find((r) => r.id === "evidence").empty);
  else {
    const rows = evidence.map((e) => {
      const src = e.params.url !== null ? `[${e.params.url}](${e.params.url})` : `answer ${e.params.ref}`;
      const backs = e.params.claim_ref === null ? "—" : `seq ${e.params.claim_ref}`;
      return `| ${e.seq} | ${cell(src)} | ${cell(e.params.provenance)} | ${cell(backs)} |`;
    });
    parts.push(["| seq | Source | Provenance | Backs |", "|---|---|---|---|", ...rows].join("\n"));
    const counted = PROVENANCE
      .map((label) => [label, evidence.filter((e) => e.params.provenance === label).length])
      .filter(([, n]) => n > 0)
      .map(([label, n]) => `${label}: ${n}`);
    parts.push("");
    parts.push(counted.join(" · "));
  }
  // ALWAYS, table or not: an unbacked decision is the thing this section exists to make visible.
  const unbacked = decisions.filter((d) => d.flagged.includes("no-evidence"))
    .map((d) => `seq ${d.seq}${supersededBy.has(d.seq) ? ` (superseded by seq ${supersededBy.get(d.seq)})` : ""}`);
  parts.push("");
  parts.push(`Decisions resting on no evidence: ${unbacked.length ? unbacked.join(", ") : "none"}.`);
  return parts.join("\n");
}

function renderHypothesis(state) {
  const rows = state.visible.filter((d) => d.params.level === "business" || d.params.level === "stakeholder");
  if (!rows.length) return null;
  return [
    ...rows.map((d) => `- **We'll know we're WRONG if** ${fold(d.params.wrong_if)} — seq ${d.seq}`),
    "",
    '_The "We believe … will cause … resulting in" half is the human\'s to write: the ops carry falsifiers, not a belief statement._',
  ].join("\n");
}

function renderMetrics(state) {
  const { decisions, supersededBy } = state;
  if (!decisions.length) return null;
  // Both tables below are over EVERY decision, replaced ones included. The marker is what stops a
  // retracted kill criterion sitting beside its live replacement with nothing to tell them apart —
  // the `*Replaces:* seq N` line that resolves them is sections away.
  const killOf = (d) => `${cell(d.params.wrong_if)}${supersededBy.has(d.seq) ? ` — superseded by seq ${supersededBy.get(d.seq)}` : ""}`;
  const parts = [];
  const staged = decisions.filter((d) => questionFor(d.params.question_id)?.stage === METRIC_STAGE);
  if (staged.length) {
    parts.push(["| seq | Question | Kill criterion |", "|---|---|---|",
      ...staged.map((d) => `| ${d.seq} | ${cell(questionFor(d.params.question_id).text)} | ${killOf(d)} |`)].join("\n"));
  } else {
    parts.push(`_No decision was recorded against a stage ${METRIC_STAGE} (${METRIC_STAGE_LABEL}) question._`);
  }
  parts.push("");
  parts.push("Every decision's kill criterion, by seq:");
  parts.push("");
  parts.push(["| seq | Level | Kill criterion |", "|---|---|---|",
    ...decisions.map((d) => `| ${d.seq} | ${cell(d.params.level)} | ${killOf(d)} |`)].join("\n"));
  return parts.join("\n");
}

function renderNonGoals(state) {
  const rows = NON_GOAL_QUESTIONS
    .map((id) => state.latestByQuestion.get(id))
    .filter(Boolean);
  if (!rows.length) return null;
  return rows.map((d) => {
    const q = questionFor(d.params.question_id);
    return `- seq ${d.seq} — ${q ? q.text : qidLabel(d.params.question_id)} (see ${headingForLevel(d.params.level)})`;
  }).join("\n");
}

function renderOpenQuestions(state) {
  if (!state.opened.length) return null;
  return state.opened.map((r) => {
    const p = r.params;
    return [
      `#### seq ${r.seq} · ${p.source} · ${qidLabel(p.question_id)}`,
      "",
      questionLine(p.question_id),
      "",
      answerBlock(state.answers, p.answer_ref),
      "",
      `*Parked because:* ${fold(p.reason)}`,
    ].join("\n");
  }).join("\n\n");
}

function renderWeakAnswers(state) {
  if (!state.weak.length) return null;
  return state.weak.map((r) => {
    const p = r.params;
    return [
      `#### seq ${r.seq} · ${qidLabel(p.question_id)}`,
      "",
      questionLine(p.question_id),
      "",
      answerBlock(state.answers, p.answer_ref),
      "",
      "*Missing:*",
      ...p.missing.map((m) => `- ${fold(m)}`),
    ].join("\n");
  }).join("\n\n");
}

function renderHierarchy(state) {
  const { visible } = state;
  if (!visible.length) return null;
  const lines = [];
  for (const level of LEVELS) {
    const rows = visible.filter((d) => d.params.level === level);
    lines.push(`- **${level}** — ${rows.length}`);
    for (const d of rows) {
      const qid = qidLabel(d.params.question_id);
      const parent = level === "business" ? "no parent by definition"
        : d.params.parent_id === null ? "parent: none"
          : `parent: seq ${d.params.parent_id}`;
      lines.push(`  - seq ${d.seq} ${qid} — ${parent}${d.flagged.includes("orphan") ? " · ⚠ orphan" : ""}`);
    }
  }
  lines.push("");
  lines.push([...LEVELS.map((l) => `${l} ${visible.filter((d) => d.params.level === l).length}`),
    `orphans ${visible.filter((d) => d.flagged.includes("orphan")).length}`].join(" · "));
  return lines.join("\n");
}

// id → the renderer. A renderer answers null when its selection is empty, and projectPrd substitutes
// the row's DECLARED `empty` — which is what keeps the transition note's **n/a** out of every loop
// that would otherwise need a special case for it.
const RENDERERS = Object.freeze({
  problem: (s) => rungSection("business", s),
  evidence: renderEvidence,
  hypothesis: renderHypothesis,
  users: (s) => rungSection("stakeholder", s),
  mvp: (s) => rungSection("solution", s),
  metrics: renderMetrics,
  "non-goals": renderNonGoals,
  "open-questions": renderOpenQuestions,
  "weak-answers": renderWeakAnswers,
  transition: (s) => rungSection("transition", s),
  hierarchy: renderHierarchy,
});

// ---------------------------------------------------------------------------------------------------
// projectPrd — the whole page. PURE: no filesystem, no clock, no network, no SDK. Returns a markdown
// string ending in exactly one "\n".
// ---------------------------------------------------------------------------------------------------
export function projectPrd(pkg) {
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg))
    throw new Error(`prd-projection: projectPrd takes { run, answers, ops } (got ${shown(pkg)})`);
  const { run, answers, ops } = pkg;
  if (!run || typeof run !== "object" || Array.isArray(run))
    throw new Error(`prd-projection: "run" must be the parsed run.json object (got ${shown(run)})`);
  if (typeof run.slug !== "string" || run.slug.trim() === "")
    throw new Error(`prd-projection: run.slug must be a non-empty string (got ${shown(run.slug)})`);
  if (!Array.isArray(answers))
    throw new Error(`prd-projection: "answers" must be an array — the parsed answers.jsonl lines (got ${shown(answers)})`);
  const checked = checkOpLines(ops);
  const state = { run, answers, ...indexOps(checked) };

  const out = [];
  out.push(`# ${fold(run.slug)} — PRD, projected from a discovery run`);
  out.push("");
  // The honesty header — the one paragraph on the page that is not derived from a record. The link
  // LABEL is run.json's own `root` (relative in-repo for a fictional run, the jobs-folder path for a
  // real one) and the target is the directory this file sits in, so a package copied elsewhere still
  // names the run it came from.
  out.push(`> **Projected, not authored.** Every claim below folds one run package — [\`${field(run.root)}\`](./): \`run.json\`, \`answers.jsonl\`, and the \`op\` lines of \`transcript.jsonl\` — and nothing else. Generated by \`discovery/prd-projection.mjs\` (epic #279, #290). A claim the ops do not carry cannot appear here. **Edit freely: nothing regenerates this file, and re-running the projection refuses to overwrite it.**`);
  out.push("");
  out.push(`**Run** — \`${field(run.slug)}\` · ${field(run.provenance)} (${field(run.label)}) · entry ${field(run.entryMode)} · depth ${field(run.depth)} · branch ${run.branch === null || run.branch === undefined ? "none" : field(run.branch)} · front end ${field(run.frontEnd)} · model ${field(run.model)} · posture ${field(run.posture)} · started ${field(run.startedAt)} · ended ${run.endedAt === null || run.endedAt === undefined ? "open" : field(run.endedAt)} · ${Array.isArray(run.turnStats) ? run.turnStats.length : 0} turn(s)`);
  out.push("");
  out.push(`**Ledger** (whole ledger, superseded records included) — ${checked.length} op(s): ${OPS.map((v) => `${v} ${checked.filter((r) => r.op === v).length}`).join(" · ")} · flags: ${FLAGS.map((f) => `${f} ${checked.filter((r) => r.flagged.includes(f)).length}`).join(" · ")}`);

  for (const row of SECTIONS) {
    const body = RENDERERS[row.id](state);
    out.push("");
    out.push(`## ${row.heading}`);
    out.push("");
    out.push(body === null || body === undefined ? row.empty : body);
  }

  out.push("");
  out.push("Architecture: _TBD — see plan-architecture_");
  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

// ---------------------------------------------------------------------------------------------------
// The filesystem shell. Nothing below decides what the page says.
// ---------------------------------------------------------------------------------------------------

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Each parsed line WITH its 1-based file line number. Blank lines are skipped, so an array index is
// not a line number, and a refusal that named one would send an operator to the wrong line.
function readJsonl(path) {
  if (!existsSync(path)) return []; // an absent answers.jsonl or transcript.jsonl reads as []
  const out = [];
  readFileSync(path, "utf8").split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    try { out.push({ n: i + 1, value: JSON.parse(line) }); } catch (e) { throw new Error(`prd-projection: ${path} line ${i + 1} is not JSON — ${e.message}`); }
  });
  return out;
}

// The three transcript line types (discovery/README.md §File shapes). A line outside them is REFUSED
// rather than filtered away: `.filter(type === "op")` would drop a well-formed record whose type read
// "opx" with no error and no count, and a missing decision that nothing reports is the worst failure
// mode an honesty artefact has.
const TRANSCRIPT_TYPES = Object.freeze(["text", "op", "denied"]);

// The three files → what projectPrd takes. The transcript is filtered to `op` lines and stripped of
// the writer's `type` and `ts`, so what reaches the fold is exactly the applier's record shape.
export function readPackage(root) {
  const runPath = join(root, "run.json");
  if (!existsSync(runPath)) throw new Error(`prd-projection: no run.json at ${runPath} — that is not a run package`);
  let run;
  try { run = JSON.parse(readFileSync(runPath, "utf8")); } catch (e) { throw new Error(`prd-projection: ${runPath} is not JSON — ${e.message}`); }
  const answers = readJsonl(join(root, "answers.jsonl")).map((l) => l.value);
  const tPath = join(root, "transcript.jsonl");
  const ops = [];
  for (const { n, value } of readJsonl(tPath)) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error(`prd-projection: ${tPath} line ${n} is not an object (got ${shown(value)})`);
    if (!TRANSCRIPT_TYPES.includes(value.type))
      throw new Error(`prd-projection: ${tPath} line ${n} carries type ${shown(value.type)} — a transcript line is one of ${TRANSCRIPT_TYPES.join(" · ")} (discovery/README.md §File shapes)`);
    if (value.type !== "op") continue;
    const rec = { ...value };
    delete rec.type;
    delete rec.ts;
    ops.push(rec);
  }
  return { run, answers, ops };
}

// Project and write <root>/prd.md. REFUSES to overwrite an existing one without force, because the
// file is generated and then HAND-EDITED — it is the one generated artifact deliberately outside
// tooling/drift-check.mjs, so nothing else protects those edits.
export function writePrd(root, { force = false } = {}) {
  const pkg = readPackage(root);
  const md = projectPrd(pkg);
  const path = join(root, "prd.md");
  if (existsSync(path) && !force)
    throw new Error(`prd-projection: ${path} already exists. It is generated and then HAND-EDITED, so re-running refuses to overwrite it. Pass --force to regenerate — that DISCARDS every hand edit in the file.`);
  writeFileSync(path, md);
  return { path, bytes: Buffer.byteLength(md, "utf8"), wrote: true, slug: pkg.run.slug, ops: pkg.ops.length };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which import.meta.url
// percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const rootAt = argv.indexOf("--root");
  const rootArg = rootAt === -1 ? null : (argv[rootAt + 1] ?? null);
  const slug = argv.find((a, i) => !a.startsWith("--") && !(rootAt !== -1 && i === rootAt + 1)) ?? null;
  try {
    // `--root --stdout` would otherwise report a directory literally named "--stdout", and a slug
    // beside --root would be silently dropped. Both are the operator's typo, so both say so.
    if (rootAt !== -1 && (rootArg === null || rootArg.startsWith("--")))
      throw new Error(`--root takes a directory — the next argument is ${rootArg === null ? "absent" : JSON.stringify(rootArg)}`);
    if (rootArg && slug)
      throw new Error(`give a slug OR --root, not both — got slug ${JSON.stringify(slug)} and --root ${JSON.stringify(rootArg)}`);
    if (!rootArg && !slug)
      throw new Error("usage: node discovery/prd-projection.mjs <slug> [--stdout] [--force]  |  --root <dir> [--stdout] [--force]");
    const root = rootArg ? resolve(rootArg) : join(ROOT, "discovery", slug);
    if (argv.includes("--stdout")) {
      process.stdout.write(projectPrd(readPackage(root)));
    } else {
      const r = writePrd(root, { force: argv.includes("--force") });
      console.log(`prd ✓  ${r.slug} → ${SECTIONS.length} sections, ${r.ops} ops (${rootArg ? r.path : `discovery/${slug}/prd.md`})`);
    }
  } catch (e) {
    console.error(`prd ✗  ${e.message}`);
    process.exit(1);
  }
}
