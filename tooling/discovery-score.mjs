// tooling/discovery-score.mjs — the graded answer fixture's sealed draw and its scorer (epic #279,
// ticket #348; .claude/plans/discovery-graded-answer-fixture-348.md).
//
// A JUDGE tool for reading a recorded discovery run against a pre-registered key; NEVER part of an
// agent prompt. tooling/fieldwork-kpis.mjs states the same rule for the same reason: feeding a judge's
// own output back into the thing it judges makes the reading circular, and the reading is the whole
// deliverable here.
//
// WHAT IS BEING MEASURED. PRD MVP 6 claims the discovery agent judges the FORM of an answer, never its
// substance. Every run recorded before this fixture was self-play — an agent wrote well-formed answers
// and the same model family filed a decision on nearly every turn, which says the pipeline moves and
// says nothing about judge quality. This file scores the other thing: given an answer that CARRIES the
// form (K1) does the judge file record_decision, given one that is THIN (K2) does it file
// flag_weak_answer, and given "I don't know yet" (K3) does it file open_question. The answers are
// authored blind to the bank's weak-answer notes and sealed in key.json before a run is opened.
//
// PURE, AND THE PURITY IS LOAD-BEARING. No SDK, no zod, no clock, no randomness — build-checks group
// 33 imports this file in CI where portal/node_modules does not exist, and the draw must be
// re-derivable from its committed seed alone or the gate cannot check the committed table. The only
// imports are Node built-ins plus discovery/bank.mjs and discovery/ops.mjs, both of which are
// themselves import-free (which is why groups 28-31 already import them). Reading the bank is the
// SCORER's right and never the answer author's — portal/record-graded-answers.mjs is fenced out of it.
//
// THE MATRIX HAS FIVE COLUMNS AND EXACTLY ONE CELL PER TURN, keyed on what CLOSED the turn:
//
//   record_decision · flag_weak_answer · open_question    the three closing verbs
//   no_close_filed    the turn filed ops but none of them closed it
//   no_close_silent   the turn filed nothing at all
//
// `closes` is not a property of the verb (see CLOSES_WHEN below), so a turn can file a record_decision
// and still not close — an off_script one — and a turn can file nothing that closes at all. Under
// three columns both of those vanish and the matrix quietly stops summing to the turn count. Under
// these five, every turn lands in exactly one cell and the sum IS the turn count, by construction.
// file_evidence is counted per turn and reported beside the matrix, never in it: it is non-closing and
// scoring it would be scoring a verb no kind expects.
//
// THE KEY AND THE DRAW ARE SEALED. key.json is written once by the author harness and never edited; a
// re-authored key is a new commit that REPLACES it and voids every package recorded against the old
// one. draw.json carries its own seed, so the table is both sealed and re-derivable. Changing the seed
// after a run invalidates every recorded package's kind assignment.
//
//   node tooling/discovery-score.mjs --draw --seed <seed>      the sealed draw, to stdout
//   node tooling/discovery-score.mjs --check-draw              the committed table vs its own seed
//   node tooling/discovery-score.mjs --check-key               the committed key, validated
//   node tooling/discovery-score.mjs --selftest                the five columns over a synthetic package
//   node tooling/discovery-score.mjs --slug <slug> --run <a|b|c>   score a recorded package
//   node tooling/discovery-score.mjs --root <dir> --run <a|b|c>    the same, by directory
//   node tooling/discovery-score.mjs --slug <slug> --mvp6      the MVP 6 shortlist (human verdict)

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { QUESTIONS, selectDepth } from "../discovery/bank.mjs";
import { OPS } from "../discovery/ops.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const FIXTURE_DIR = join(ROOT, "docs/epics/fixtures/graded-answers");
export const DRAW_PATH = join(FIXTURE_DIR, "draw.json");
export const KEY_PATH = join(FIXTURE_DIR, "key.json");

const bad = (msg) => { throw new Error(`discovery-score: ${msg}`); };

// --- the vocabulary --------------------------------------------------------------------------------

// The three kinds of answer the author writes for every question.
export const KINDS = Object.freeze(["K1", "K2", "K3"]);

// The three draw columns. A column is ONE answer set, run once per posture — graded-think-a and
// graded-opus-a answer the same 65 answers, which is what makes the posture comparison a comparison.
export const RUNS = Object.freeze(["a", "b", "c"]);

// The pre-registered expectation: which op a kind's answer should close its turn with. Derived into
// every key entry, never authored. Case 33.4 iterates OPS against this in both directions, so a fifth
// verb or a renamed one fails there by name rather than silently.
export const EXPECTED = Object.freeze({ K1: "record_decision", K2: "flag_weak_answer", K3: "open_question" });

// WHEN each verb closes a turn, re-derived from the params rather than read off the record. The
// committed `closes` field is the applier's; a record whose field and whose params disagree is a hand
// edit, and closingOpOf throws naming its seq. Keyed by every op in OPS, so a fifth verb with no entry
// throws here rather than defaulting to "does not close".
export const CLOSES_WHEN = Object.freeze({
  record_decision: (p) => p?.off_script === false,
  flag_weak_answer: () => true,
  open_question: (p) => p?.source === "banked",
  file_evidence: () => false,
});

// The matrix's columns, in order. The first three are OPS members; the last two are the two ways a
// turn can fail to close. Exactly one per turn.
export const COLUMNS = Object.freeze([...Object.values(EXPECTED), "no_close_filed", "no_close_silent"]);

// The three outcomes scorePackage reports per turn. A fourth failure — the stored answer not being the
// sealed one — is not an outcome: assertAnswersSealed THROWS on it, because a package whose answers are
// not the key's answers cannot be scored against the key at all.
export const OUTCOMES = Object.freeze(["match", "mismatch", "no_close"]);

// --- the sealed draw -------------------------------------------------------------------------------

// A Latin square with a PER-QUESTION offset. Over the three runs every question meets all three kinds
// (coverage), and no run column is a predictable cycle — a plain rotation would make run `a` a regular
// K1,K2,K3,K1,… stream, which is the second-most pattern-matchable thing after a uniform one, and the
// draw exists precisely so the judge cannot read the stream instead of the answer.
//
// TWO ARGUMENTS, AND THERE MUST NEVER BE A THIRD. There is no posture parameter: one table serves both
// postures, so graded-think-a and graded-opus-a resolve to the same column and therefore to the same
// 65 answers. discovery-postures.mjs's own header says the model string is the whole difference between
// them; six columns instead of three would destroy that and no gate downstream could see it. Case 33.1
// pins the arity, so a posture argument goes red there. No default values on either parameter —
// Function.length stops at the first default and the arity pin would stop meaning anything.
export function drawFor(seed, ids) {
  if (typeof seed !== "string" || !seed.trim()) bad(`the draw needs a non-empty seed string (got ${JSON.stringify(seed) ?? String(seed)}) — it is committed in draw.json and the gate re-derives the table from it`);
  if (!Array.isArray(ids) || ids.length === 0) bad("the draw needs a non-empty array of question ids");
  ids.forEach((id, i) => { if (typeof id !== "string" || !id.trim()) bad(`question id ${i} is ${JSON.stringify(id) ?? String(id)} — every id must be a non-empty string`); });
  const seen = new Set();
  for (const id of ids) { if (seen.has(id)) bad(`question id "${id}" appears twice in the draw's id list`); seen.add(id); }
  const table = ids.map((id) => {
    const offset = parseInt(createHash("md5").update(`${seed}:${id}`).digest("hex").slice(0, 8), 16) % KINDS.length;
    const row = { id };
    RUNS.forEach((r, i) => { row[r] = KINDS[(offset + i) % KINDS.length]; });
    // Frozen at BOTH levels: Object.freeze is shallow, and a writable row would let a "frozen by
    // mutation" case pass for the wrong reason (discovery/ops.mjs PARAMS' own comment).
    return Object.freeze(row);
  });
  return Object.freeze({ seed, table: Object.freeze(table) });
}

// The committed draw, re-derived from its own seed and compared. Returns the parsed file.
export function checkDraw(draw, ids) {
  if (!draw || typeof draw !== "object" || Array.isArray(draw)) bad("draw.json must be an object { seed, generatedFor, table }");
  for (const k of Object.keys(draw)) if (!["seed", "generatedFor", "table"].includes(k)) bad(`unknown key "${k}" on draw.json — it is exactly { seed, generatedFor, table }`);
  for (const k of ["seed", "generatedFor", "table"]) if (draw[k] === undefined) bad(`draw.json is missing "${k}"`);
  const want = drawFor(draw.seed, ids);
  if (JSON.stringify(draw.table) !== JSON.stringify(want.table)) {
    const at = want.table.findIndex((r, i) => JSON.stringify(r) !== JSON.stringify(draw.table?.[i]));
    bad(`the committed draw table does not match its own seed "${draw.seed}" at row ${at} (${want.table[at]?.id}) — committed ${JSON.stringify(draw.table?.[at])}, derived ${JSON.stringify(want.table[at])}. draw.json is generated; a hand edit to it silently re-labels every recorded answer`);
  }
  return draw;
}

// The drawn kind for one question in one run column.
export function kindFor(draw, questionId, run) {
  if (!RUNS.includes(run)) bad(`run "${run}" is not one of ${RUNS.join(" · ")} — it names the draw column`);
  const row = draw?.table?.find((r) => r.id === questionId);
  if (!row) bad(`the draw holds no row for question "${questionId}"`);
  return row[run];
}

// --- the sealed key --------------------------------------------------------------------------------

const KEY_KEYS = Object.freeze(["generatedFor", "authoredAt", "entries"]);
const ENTRY_KEYS = Object.freeze(["question_id", "kind", "answer", "expected"]);

// Exact-key-set validation at the boundary, discovery/ops.mjs:checkOp's discipline: an unknown key
// throws, an absent key throws, and the message names the offender. Returns a Map keyed
// "<question_id>::<kind>" so the scorer and the byte-equality check share one index.
export function checkKey(key, ids) {
  if (!key || typeof key !== "object" || Array.isArray(key)) bad("key.json must be an object { generatedFor, authoredAt, entries }");
  for (const k of Object.keys(key)) if (!KEY_KEYS.includes(k)) bad(`unknown key "${k}" on key.json — it is exactly ${KEY_KEYS.join(", ")}`);
  for (const k of KEY_KEYS) if (key[k] === undefined) bad(`key.json is missing "${k}"`);
  if (!Array.isArray(key.entries)) bad("key.json's \"entries\" must be an array");
  if (!Array.isArray(ids) || ids.length === 0) bad("checkKey needs the bank's question ids");
  const want = ids.length * KINDS.length;
  if (key.entries.length !== want) bad(`key.json holds ${key.entries.length} entries, not ${want} (${ids.length} questions × ${KINDS.length} kinds) — the key is sealed complete or not at all`);
  const idSet = new Set(ids);
  const index = new Map();
  key.entries.forEach((e, i) => {
    const at = `entry ${i}`;
    if (!e || typeof e !== "object" || Array.isArray(e)) bad(`${at} is not an object { ${ENTRY_KEYS.join(", ")} }`);
    for (const k of Object.keys(e)) if (!ENTRY_KEYS.includes(k)) bad(`${at}: unknown key "${k}" — an entry is exactly ${ENTRY_KEYS.join(", ")}`);
    for (const k of ENTRY_KEYS) if (e[k] === undefined) bad(`${at}: "${k}" is required`);
    if (!idSet.has(e.question_id)) bad(`${at}: question_id ${JSON.stringify(e.question_id)} is not in the bank's depth`);
    if (!KINDS.includes(e.kind)) bad(`${at} (${e.question_id}): kind ${JSON.stringify(e.kind)} is not one of ${KINDS.join(" · ")}`);
    if (e.expected !== EXPECTED[e.kind]) bad(`${at} (${e.question_id} ${e.kind}): expected ${JSON.stringify(e.expected)}, but ${e.kind}'s expected op is derived and is ${EXPECTED[e.kind]} — the expectation is never authored`);
    if (typeof e.answer !== "string" || !e.answer.trim()) bad(`${at} (${e.question_id} ${e.kind}): "answer" must be a non-empty string with non-whitespace content (got ${JSON.stringify(e.answer) ?? String(e.answer)})`);
    const k = `${e.question_id}::${e.kind}`;
    if (index.has(k)) bad(`${at}: ${e.question_id} ${e.kind} appears twice — one entry per (question, kind) pair`);
    index.set(k, e);
  });
  for (const id of ids) for (const kind of KINDS) {
    if (!index.has(`${id}::${kind}`)) bad(`the key has no entry for ${id} ${kind} — the key is sealed complete or not at all`);
  }
  return index;
}

// --- the closing op --------------------------------------------------------------------------------

// The op that closed one turn, or null. Re-derives `closes` from the params for EVERY op on the turn,
// not only the one claiming to close it: a hand edit that sets closes:true on an off_script decision
// would otherwise ride through unread. A record whose committed `closes` disagrees with its params is
// a hand edit and throws naming its seq.
export function closingOpOf(ops, turn) {
  if (!Array.isArray(ops)) bad("closingOpOf needs the package's op records array");
  if (typeof turn !== "string" || !turn) bad(`closingOpOf needs a turn id (got ${JSON.stringify(turn) ?? String(turn)})`);
  const mine = ops.filter((r) => r?.turn === turn);
  const closers = [];
  for (const r of mine) {
    const rule = CLOSES_WHEN[r.op];
    if (!rule) bad(`turn "${turn}" holds an op line for "${r.op}", which is not one of ${OPS.join(" · ")}`);
    const derived = rule(r.params);
    if (Object.hasOwn(r, "closes") && r.closes !== derived)
      bad(`op seq ${r.seq} (${r.op}, turn ${turn}) records closes ${JSON.stringify(r.closes)} but its params derive ${derived} — the transcript's closes field is the applier's, so a disagreement is a hand edit`);
    if (derived) closers.push(r);
  }
  if (closers.length > 1) bad(`turn "${turn}" holds ${closers.length} closing ops (seq ${closers.map((r) => r.seq).join(", ")}) — one closing op per banked-question turn (R2), so this package was edited by hand`);
  return closers.length ? closers[0].op : null;
}

// How many file_evidence ops the turn filed. Counted, reported beside the matrix, never scored.
export const evidenceCountOf = (ops, turn) => ops.filter((r) => r?.turn === turn && r.op === "file_evidence").length;

// --- byte-equality ---------------------------------------------------------------------------------

// AC #3's hard half: the answers the server stored ARE the sealed ones, byte for byte. No trim, no
// normalisation — appendAnswer stores verbatim, so a single stray character is a permanent line in an
// append-only file the honesty contract forbids anyone to clean up. Throws naming the first ref that
// differs; a package that fails this is re-run under a new slug, never trimmed.
export function assertAnswersSealed(pkg, keyIndex, draw, run, ids) {
  if (!pkg || !Array.isArray(pkg.answers)) bad("assertAnswersSealed needs a package { run, answers, ops }");
  if (!RUNS.includes(run)) bad(`run "${run}" is not one of ${RUNS.join(" · ")}`);
  const { answers } = pkg;
  if (answers.length !== ids.length)
    bad(`the package holds ${answers.length} answer lines, not ${ids.length} — a duplicate line means a turn did not close and the answer was re-submitted, and answers.jsonl is append-only, so the run is re-run under a new slug rather than trimmed`);
  const turns = new Set();
  answers.forEach((a, i) => {
    const wantRef = `a${i + 1}`;
    if (a?.ref !== wantRef) bad(`answer line ${i + 1} carries ref ${JSON.stringify(a?.ref)}, not ${wantRef} — refs are positional and gapless`);
    if (a.question_id !== ids[i]) bad(`${wantRef} answers "${a.question_id}", but the depth's question ${i + 1} is "${ids[i]}" — the run walked a different question order`);
    if (turns.has(a.turn)) bad(`${wantRef} lands on turn "${a.turn}", which already holds an answer — a turn did not close and the answer was re-submitted; the run is re-run, never trimmed`);
    turns.add(a.turn);
    const kind = kindFor(draw, a.question_id, run);
    const entry = keyIndex.get(`${a.question_id}::${kind}`);
    if (!entry) bad(`${wantRef}: the key holds no ${kind} answer for ${a.question_id}`);
    if (a.text !== entry.answer)
      bad(`${wantRef} (${a.question_id} ${kind}) is not the sealed answer.\n  stored: ${JSON.stringify(a.text)}\n  sealed: ${JSON.stringify(entry.answer)}`);
  });
  return answers.length;
}

// --- the score -------------------------------------------------------------------------------------

// PURE over its arguments — same inputs, same output, no fs. The filesystem half is the CLI's, mirroring
// discovery/prd-projection.mjs's readPackage / CLI split.
export function scorePackage(pkg, keyIndex, draw, run, ids) {
  const rows = pkg.answers.map((a) => {
    const kind = kindFor(draw, a.question_id, run);
    const expected = EXPECTED[kind];
    const filed = closingOpOf(pkg.ops, a.turn);
    const filedAny = pkg.ops.some((r) => r?.turn === a.turn);
    const column = filed ?? (filedAny ? "no_close_filed" : "no_close_silent");
    const outcome = filed === expected ? "match" : filed === null ? "no_close" : "mismatch";
    const question = QUESTIONS.find((q) => q.id === a.question_id) ?? null;
    return {
      turn: a.turn, ref: a.ref, question_id: a.question_id, stage: question?.stage ?? null,
      kind, expected, filed, column, outcome, evidence: evidenceCountOf(pkg.ops, a.turn),
    };
  });
  // expected × column. One cell per turn, so the sum IS the turn count.
  const matrix = {};
  for (const kind of KINDS) matrix[kind] = Object.fromEntries(COLUMNS.map((c) => [c, 0]));
  for (const r of rows) matrix[r.kind][r.column] += 1;
  const totals = Object.fromEntries(OUTCOMES.map((o) => [o, rows.filter((r) => r.outcome === o).length]));
  const byKind = Object.fromEntries(KINDS.map((k) => {
    const mine = rows.filter((r) => r.kind === k);
    return [k, { turns: mine.length, ...Object.fromEntries(OUTCOMES.map((o) => [o, mine.filter((r) => r.outcome === o).length])) }];
  }));
  const stages = [...new Set(rows.map((r) => r.stage))].sort((a, b) => a - b);
  const byStage = Object.fromEntries(stages.map((s) => {
    const mine = rows.filter((r) => r.stage === s);
    return [s, { turns: mine.length, ...Object.fromEntries(OUTCOMES.map((o) => [o, mine.filter((r) => r.outcome === o).length])) }];
  }));
  return {
    run, turns: rows.length, rows, matrix, totals, byKind, byStage,
    // Counted, reported, never scored.
    evidence: { ops: rows.reduce((s, r) => s + r.evidence, 0), turnsWithAny: rows.filter((r) => r.evidence > 0).length },
  };
}

// --- the MVP 6 shortlist ---------------------------------------------------------------------------

// MECHANICAL SHORTLIST, HUMAN VERDICT. This does NOT prove MVP 6 and the report must not say it does.
// MVP 6 is "the agent may say what the answer does not name; it may NOT say the answer is wrong and may
// NOT supply what is missing" — a claim about prose, falsifiable only by reading it. These patterns make
// a read of 130-390 turns' prose tractable by putting the candidate sentences in front of a person.
// Committed rather than tuned per run, so two runs of the shortlist are comparable.
export const MVP6_PATTERNS = Object.freeze([
  /\bwrong\b/i, /\bincorrect\b/i, /\byou should\b/i, /\bthe (right|correct) answer\b/i,
  /\binstead,? (you|try)\b/i, /\bactually,/i,
]);

export function mvp6Shortlist(textLines) {
  if (!Array.isArray(textLines)) bad("mvp6Shortlist needs the package's text lines");
  const hits = [];
  for (const line of textLines) {
    const text = typeof line?.text === "string" ? line.text : "";
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const pattern = MVP6_PATTERNS.find((p) => p.test(sentence));
      if (pattern) hits.push({ turn: line.turn ?? null, pattern: String(pattern), sentence: sentence.trim() });
    }
  }
  return { lines: textLines.length, hits };
}

// --- the filesystem half ---------------------------------------------------------------------------

const readJson = (file) => {
  if (!existsSync(file)) bad(`${file} does not exist`);
  try { return JSON.parse(readFileSync(file, "utf8")); }
  catch (e) { bad(`${file} is not valid JSON — ${e.message}`); }
  return null;
};

export const readDraw = () => readJson(DRAW_PATH);
export const readKey = () => readJson(KEY_PATH);

// The package's three files, mirroring discovery/prd-projection.mjs:readPackage. Kept here rather than
// imported so this file's import list stays two modules long and group 33's purity pin stays readable.
export function readGradedPackage(root) {
  const runPath = join(root, "run.json");
  if (!existsSync(runPath)) bad(`no run.json at ${runPath} — that is not a run package`);
  const lines = (name) => (existsSync(join(root, name))
    ? readFileSync(join(root, name), "utf8").split("\n").filter((l) => l.trim()).map((l, i) => {
      try { return JSON.parse(l); } catch (e) { return bad(`${join(root, name)} line ${i + 1} is not valid JSON — ${e.message}`); }
    })
    : []);
  const transcript = lines("transcript.jsonl");
  return {
    run: readJson(runPath),
    answers: lines("answers.jsonl"),
    ops: transcript.filter((l) => l?.type === "op").map(({ type, ts, ...rec }) => rec),
    texts: transcript.filter((l) => l?.type === "text"),
    denied: transcript.filter((l) => l?.type === "denied"),
  };
}

// --- the CLI ---------------------------------------------------------------------------------------

const pad = (s, n) => String(s).padEnd(n);

function printScore(slug, score, ids) {
  const w = Math.max(...COLUMNS.map((c) => c.length), 8) + 2;
  console.log(`\nscore  ${slug}  ·  run column ${score.run}  ·  ${score.turns} turns`);
  console.log(`\n  ${pad("expected", 18)}${COLUMNS.map((c) => pad(c, w)).join("")}`);
  for (const kind of KINDS) {
    const row = score.matrix[kind];
    console.log(`  ${pad(`${kind} → ${EXPECTED[kind]}`, 18)}${COLUMNS.map((c) => pad(row[c], w)).join("")}`);
  }
  const sum = KINDS.reduce((s, k) => s + COLUMNS.reduce((t, c) => t + score.matrix[k][c], 0), 0);
  console.log(`\n  matrix sums to ${sum} of ${score.turns} turns`);
  console.log(`  file_evidence: ${score.evidence.ops} op(s) across ${score.evidence.turnsWithAny} turn(s) — counted, never scored`);
  console.log(`\n  ${pad("kind", 8)}${pad("turns", 8)}${OUTCOMES.map((o) => pad(o, 12)).join("")}`);
  for (const kind of KINDS) {
    const b = score.byKind[kind];
    console.log(`  ${pad(kind, 8)}${pad(b.turns, 8)}${OUTCOMES.map((o) => pad(b[o], 12)).join("")}`);
  }
  console.log(`  ${pad("all", 8)}${pad(score.turns, 8)}${OUTCOMES.map((o) => pad(score.totals[o], 12)).join("")}`);
  console.log(`\n  by stage`);
  console.log(`  ${pad("stage", 8)}${pad("turns", 8)}${OUTCOMES.map((o) => pad(o, 12)).join("")}`);
  for (const [s, b] of Object.entries(score.byStage)) {
    console.log(`  ${pad(s, 8)}${pad(b.turns, 8)}${OUTCOMES.map((o) => pad(b[o], 12)).join("")}`);
  }
  console.log(`\n  ${ids.length} questions in the depth. No target is set: the number is the reading.`);
}

// The synthetic package the selftest drives — every column exercised, hand-built here and never
// presented as a run (group 29's rows and group 32's case 1 are the same shape of legitimate input).
function syntheticPackage() {
  const ids = ["q1", "q2", "q3", "q4", "q5"];
  const op = (seq, turn, name, params) => ({ seq, turn, op: name, params, closes: CLOSES_WHEN[name](params), flagged: [], supersedes: null });
  return {
    ids,
    pkg: {
      run: { slug: "selftest", depth: "selftest" },
      answers: ids.map((id, i) => ({ ref: `a${i + 1}`, turn: `t${i + 1}`, question_id: id, kind: "banked", text: `answer ${i + 1}` })),
      ops: [
        op(1, "t1", "file_evidence", { url: null, ref: "a1", name: "a spreadsheet", provenance: "fictional-scenario", claim_ref: null }),
        op(2, "t1", "record_decision", { question_id: "q1", answer_ref: "a1", level: "business", parent_id: null, evidence_refs: [1], wrong_if: "x", off_script: false }),
        op(3, "t2", "flag_weak_answer", { question_id: "q2", answer_ref: "a2", missing: ["a number"] }),
        op(4, "t3", "open_question", { source: "banked", question_id: "q3", answer_ref: "a3", reason: "not known yet" }),
        op(5, "t4", "record_decision", { question_id: null, answer_ref: "a4", level: "business", parent_id: null, evidence_refs: [], wrong_if: "y", off_script: true }),
        op(6, "t4", "open_question", { source: "off-script", question_id: null, answer_ref: "a4", reason: "an aside" }),
      ],
      texts: [], denied: [],
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : (argv[i + 1] ?? null); };
  try {
    const ids = selectDepth("whole-bank").map((q) => q.id);
    if (argv.includes("--draw")) {
      const seed = flag("--seed");
      if (!seed || seed.startsWith("--")) throw new Error("--draw needs --seed <seed>; the seed is committed in draw.json and never changed afterwards");
      process.stdout.write(`${JSON.stringify({ seed, generatedFor: "#348", table: drawFor(seed, ids).table }, null, 2)}\n`);
    } else if (argv.includes("--check-draw")) {
      const draw = checkDraw(readDraw(), ids);
      for (const row of draw.table) {
        if (new Set(RUNS.map((r) => row[r])).size !== KINDS.length) throw new Error(`question ${row.id} does not meet all three kinds across the three runs (${RUNS.map((r) => row[r]).join(", ")})`);
      }
      for (const r of RUNS) {
        const seen = new Set(draw.table.map((row) => row[r]));
        if (seen.size !== KINDS.length) throw new Error(`run column ${r} holds only ${[...seen].join(", ")} — a uniform column lets the judge read the stream instead of the answer`);
      }
      console.log(`draw ✓  ${draw.table.length} questions × ${RUNS.length} runs, every question meets all three kinds, seed "${draw.seed}"`);
    } else if (argv.includes("--check-key")) {
      const index = checkKey(readKey(), ids);
      console.log(`key ✓  ${index.size} answers, ${ids.length} questions × ${KINDS.length} kinds, every expected op derived`);
    } else if (argv.includes("--selftest")) {
      const { ids: sids, pkg } = syntheticPackage();
      const draw = { seed: "selftest", table: sids.map((id, i) => ({ id, a: KINDS[i % 3], b: KINDS[(i + 1) % 3], c: KINDS[(i + 2) % 3] })) };
      const keyIndex = new Map(sids.flatMap((id) => KINDS.map((k) => [`${id}::${k}`, { question_id: id, kind: k, answer: "", expected: EXPECTED[k] }])));
      for (const [k, e] of keyIndex) e.answer = pkg.answers[sids.indexOf(k.split("::")[0])].text;
      const score = scorePackage(pkg, keyIndex, draw, "a", sids);
      const sum = KINDS.reduce((s, k) => s + COLUMNS.reduce((t, c) => t + score.matrix[k][c], 0), 0);
      const cols = score.rows.map((r) => r.column);
      console.log(`selftest ✓  ${score.turns} synthetic turns · columns ${cols.join(", ")} · matrix sums to ${sum} · ${score.evidence.ops} file_evidence op(s) counted and absent from the matrix`);
    } else if (argv.includes("--mvp6")) {
      const root = flag("--root") ? resolve(flag("--root")) : join(ROOT, "discovery", flag("--slug") ?? "");
      if (!flag("--root") && !flag("--slug")) throw new Error("usage: node tooling/discovery-score.mjs --slug <slug> --mvp6  |  --root <dir> --mvp6");
      const pkg = readGradedPackage(root);
      const list = mvp6Shortlist(pkg.texts);
      console.log(`mvp6 shortlist  ${list.hits.length} candidate sentence(s) from ${list.lines} text line(s) — MECHANICAL SHORTLIST, HUMAN VERDICT`);
      for (const h of list.hits) console.log(`  ${h.turn}  ${h.pattern}  ${h.sentence}`);
    } else if (flag("--slug") || flag("--root")) {
      const slug = flag("--slug");
      const root = flag("--root") ? resolve(flag("--root")) : join(ROOT, "discovery", slug);
      const run = flag("--run");
      if (!RUNS.includes(run)) throw new Error(`--run must be one of ${RUNS.join(" · ")} (it names the draw column this package was recorded on)`);
      const draw = checkDraw(readDraw(), ids);
      const keyIndex = checkKey(readKey(), ids);
      const pkg = readGradedPackage(root);
      const depthIds = selectDepth(pkg.run.depth).map((q) => q.id);
      const sealed = assertAnswersSealed(pkg, keyIndex, draw, run, depthIds);
      console.log(`answers sealed ✓  ${sealed}/${depthIds.length} byte-equal to the key's run-${run} column`);
      printScore(slug ?? root, scorePackage(pkg, keyIndex, draw, run, depthIds), depthIds);
    } else {
      throw new Error("usage: node tooling/discovery-score.mjs [--draw --seed <s> | --check-draw | --check-key | --selftest | --slug <slug> --run <a|b|c> [--mvp6] | --root <dir> --run <a|b|c>]");
    }
  } catch (e) {
    console.error(`score ✗  ${e.message}`);
    process.exit(1);
  }
}
