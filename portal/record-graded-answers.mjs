// portal/record-graded-answers.mjs — the FENCED answer author for the graded fixture (epic #279,
// ticket #348; .claude/plans/discovery-graded-answer-fixture-348.md §THE CONTROL).
//
// Build-time only. Nothing shipped reads this file, and NOTHING IN tooling/ MAY IMPORT IT: it imports
// the Agent SDK, and build-checks runs in CI where portal/node_modules does not exist. Group 33 case 9
// reads it as TEXT, never as a module.
//
// WHAT IT IS. For each of the bank's 65 questions it asks one fresh agent for three answers — K1 (has
// the form, carried badly), K2 (thin), K3 (does not know yet) — written from the question's own words
// and from docs/epics/fixtures/graded-answers/brief.md, and from nothing else. The 195 answers become
// key.json, which is sealed before any discovery run is opened. Six recorded runs then take those
// answers through the drawer's own route and tooling/discovery-score.mjs diffs each turn's closing op
// against the key. If the author has seen a question's weak-answer note, the score measures the author
// rather than the judge, and the ticket is void — so the author is fenced, and the fence's refusals are
// the receipt.
//
// THE HARNESS IMPORTS THE BANK AND THAT IS NOT THE LEAK. This process is trusted code: it reads
// QUESTIONS to build the prompts. What it interpolates is exactly the field list
// portal/lib/discovery.mjs:forTheBrowser sends to the browser — id, stage, text, attribution, label —
// and weakAnswer, note and provenanceNote are never among them. Only the AGENT is fenced.
//
// THE ALLOW-SET IS EXACTLY [authorRoot], BUILT BY HAND. Never allowSetFor: that function puts BANK_PATH
// into every set it builds, because a DISCOVERY RUN may read the bank. The author is not a discovery
// run. allowsPath reads only `.root` and `.paths` off its argument, so a frozen two-field object is the
// same predicate over a narrower set — which is exactly #287's per-run design. The author root is a
// directory of its own INSIDE the fixture directory rather than the fixture directory itself, so a
// re-run cannot read the key.json or the draw.json a previous run left beside it.
//
// FIVE WAYS THE RUBRIC COULD LEAK, AND WHAT DENIES EACH:
//   the bank                discovery/bank.mjs                        outside the allow-set
//   the same notes upstream docs/research/question-bank-source.md     outside the allow-set
//   the posture and MVP 6   docs/epics/discovery-partner.prd.md, .architecture.md   outside the set
//   judged prose            discovery/*/transcript.jsonl              outside the allow-set
//   a repo-search MCP tool  .mcp.json's codebase-search server        denied BY NAME at both fence
//                                                                     sites, and kept off the
//                                                                     advertised surface entirely by
//                                                                     strictMcpConfig
//
// THE cwd TRAP — the one that silently voids everything. allowsPath resolves a relative path against
// allowSet.root; the SDK resolves it against options.cwd. If those differ, Read("discovery/bank.mjs")
// is checked as <authorRoot>/discovery/bank.mjs — under root, ALLOWED — while the SDK reads the real
// one. options.cwd MUST equal the author root. Group 33 case 9 source-pins it.
//
// THE RECEIPTS TRAP — do not give the author tools: []. The fence's record gate is
// `isMcpToolName(tool) || mainTools.includes(tool)` (discovery.mjs fenceSite): under tools: [] a denied
// Read is denied and UNRECORDED, so the transcript comes back clean and the fence's receipt does not
// exist. tools is ['Read','Grep','Glob'] and mainTools is the same array. The author may TRY the bank;
// it is refused; the refusal is a `denied` line carrying `via`.
//
// ONE query() PER QUESTION, never one batched call for 65: a single context drifts into one template
// across the bank, and a template is the failure mode the realism brief exists to prevent. A malformed
// reply is re-run for that ONE question and is never hand-fixed — the honesty contract is hard here, and
// a bad author run is fixed by a tighter brief and a re-run, never by editing an answer.
//
//   cd portal && node record-graded-answers.mjs --dry     question 1, brief read from --out, temp root, writes nothing
//   cd portal && node record-graded-answers.mjs --out ../docs/epics/fixtures/graded-answers
//   cd portal && node record-graded-answers.mjs --out <dir> --only s4-appetite

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { query } from '@anthropic-ai/claude-agent-sdk';
import { QUESTIONS } from '../discovery/bank.mjs';
import { fenceCanUseTool, fenceHooks } from './lib/discovery.mjs';

// The author's built-in tool surface. Advertised so a denial is RECORDED (see the receipts trap), not
// because the author needs them: every path it can name is refused.
const AUTHOR_TOOLS = Object.freeze(['Read', 'Grep', 'Glob']);
const AUTHOR_MODEL = 'claude-sonnet-5';
// A clean authoring turn is one assistant message. Four leaves room for a fenced read to be refused and
// for the author to carry on, without room to work through a second question.
const MAX_TURNS = 4;

const bad = (msg) => { throw new Error(`record-graded-answers: ${msg}`); };

// Exactly forTheBrowser's field list (portal/lib/discovery.mjs) — weakAnswer, note and provenanceNote
// are never here, and a field added to this object is a leak.
const forTheAuthor = (q) => ({ id: q.id, stage: q.stage, text: q.text, attribution: q.attribution, label: q.label });

export function promptFor(brief, q) {
  const seen = forTheAuthor(q);
  return `${brief}

---

Here is the question. Write K1, K2 and K3 for it, and nothing else.

Stage ${seen.stage} of the interview.
Attributed to: ${seen.attribution}

The question: ${seen.text}
`;
}

// The three labelled blocks, off the assistant's own text. A block runs to the next label or to the
// end. Refuses a reply missing any of the three, or one whose block is empty — a malformed reply is
// re-run for that question and is never repaired here.
export function parseAnswers(text, id) {
  if (typeof text !== 'string' || !text.trim()) bad(`${id}: the author returned no text`);
  const out = {};
  for (const kind of ['K1', 'K2', 'K3']) {
    // (?![\s\S]) is END OF INPUT. `$` under the m flag matches every line end, which truncated a
    // multi-line answer at its first newline.
    const m = text.match(new RegExp(`^[ \\t]*\\**${kind}\\**[ \\t]*:[ \\t]*([\\s\\S]*?)(?=^[ \\t]*\\**K[123]\\**[ \\t]*:|(?![\\s\\S]))`, 'm'));
    const body = m?.[1]?.trim().replace(/^["“](.*)["”]$/s, '$1').trim();
    if (!body) bad(`${id}: the author's reply has no usable ${kind} block — re-run this one question; never hand-write an answer`);
    out[kind] = body;
  }
  return out;
}

// ONE fenced query for ONE question. The turn id is the question id, so a `denied` line says which
// question's authoring refused what.
async function authorOne({ authorRoot, brief, q, onLine }) {
  // BY HAND, never allowSetFor — see the header. Frozen at both levels.
  const allowSet = Object.freeze({ root: authorRoot, paths: Object.freeze([authorRoot]) });
  const fence = { allowSet, mainTools: AUTHOR_TOOLS };
  const turn = q.id;
  const text = [];
  const qy = query({
    prompt: promptFor(brief, q),
    options: {
      cwd: authorRoot,
      model: AUTHOR_MODEL,
      maxTurns: MAX_TURNS,
      tools: AUTHOR_TOOLS,
      allowedTools: [],
      strictMcpConfig: true,
      canUseTool: fenceCanUseTool(authorRoot, turn, onLine, fence),
      hooks: fenceHooks(authorRoot, turn, onLine, fence),
    },
  });
  let stats = null;
  for await (const msg of qy) {
    if (msg.type === 'assistant') {
      for (const b of msg.message?.content || []) if (b.type === 'text' && b.text) text.push(b.text);
    } else if (msg.type === 'result') {
      stats = { id: q.id, costUsd: msg.total_cost_usd ?? null, durationMs: msg.duration_ms ?? null, ok: msg.subtype === 'success' };
    }
  }
  return { answers: parseAnswers(text.join('\n'), q.id), stats };
}

export async function recordGradedAnswers({ out, dry = false, only = null }) {
  const fixtureDir = path.resolve(out);
  const brief = readFileSync(path.join(fixtureDir, 'brief.md'), 'utf8');
  const questions = only ? QUESTIONS.filter((q) => q.id === only) : (dry ? QUESTIONS.slice(0, 1) : QUESTIONS);
  if (!questions.length) bad(`no bank question with id "${only}"`);

  // Under --dry the author root is a temp directory, removed on exit: the wiring is identical and
  // nothing durable is written. probeFence does the same, for the same reason.
  const authorRoot = dry ? mkdtempSync(path.join(tmpdir(), 'graded-author-dry-')) : path.join(fixtureDir, 'author');
  mkdirSync(authorRoot, { recursive: true });

  const denied = [];
  const onLine = (line) => { if (line?.type === 'denied') denied.push(line); };
  const entries = [];
  const stats = [];
  try {
    for (const [i, q] of questions.entries()) {
      const r = await authorOne({ authorRoot, brief, q, onLine });
      for (const kind of ['K1', 'K2', 'K3']) entries.push({ question_id: q.id, kind, answer: r.answers[kind], expected: null });
      if (r.stats) stats.push(r.stats);
      const spent = stats.reduce((s, t) => s + (t.costUsd ?? 0), 0);
      console.log(`  ${String(i + 1).padStart(2)}/${questions.length}  ${q.id.padEnd(34)} ${['K1', 'K2', 'K3'].map((k) => `${k} ${String(r.answers[k].split(/\s+/).length).padStart(3)}w`).join('  ')}  $${spent.toFixed(3)}`);
      if (dry) for (const kind of ['K1', 'K2', 'K3']) console.log(`\n${kind}: ${r.answers[kind]}\n`);
    }
  } finally {
    if (dry) rmSync(authorRoot, { recursive: true, force: true });
  }

  const cost = stats.reduce((s, t) => s + (t.costUsd ?? 0), 0);
  return { entries, stats, cost, denied, authorRoot: dry ? null : authorRoot, fixtureDir, wrote: null };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : (argv[i + 1] ?? null); };
  const dry = argv.includes('--dry');
  const only = flag('--only');
  // fileURLToPath, never new URL(...).pathname: this repo's path contains a space, which
  // import.meta.url percent-encodes.
  const out = flag('--out') ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/epics/fixtures/graded-answers');
  try {
    const r = await recordGradedAnswers({ out, dry, only });
    console.log(`\nauthor ${dry ? '(dry) ' : ''}✓  ${r.entries.length} answers · $${r.cost.toFixed(3)} · ${r.denied.length} denied line(s)`);
    for (const d of r.denied) console.log(`  denied  via ${d.via}  ${d.tool}  ${JSON.stringify(d.input)}`);
    if (dry) {
      console.log('\ndry run: nothing was written. The wiring is proved; run without --dry to author the bank.');
    } else {
      // expected is DERIVED from the kind, never authored — tooling/discovery-score.mjs owns the table
      // and checkKey re-asserts it. Imported here rather than duplicated.
      const { EXPECTED, checkKey } = await import('../tooling/discovery-score.mjs');
      const keyPath = path.join(r.fixtureDir, 'key.json');
      const authored = r.entries.map((e) => ({ ...e, expected: EXPECTED[e.kind] }));
      // A re-run of ONE question MERGES into the sealed key, replacing that question's three entries.
      // The merge is done by this process, never by hand: an operator editing an answer into key.json is
      // the honesty violation this whole ticket exists to avoid. A --only run with no key to merge into
      // is refused rather than writing a three-entry key that checkKey would reject anyway.
      let key;
      if (only) {
        if (!existsSync(keyPath)) bad(`--only re-runs one question into an existing key, and there is none at ${keyPath} — author the whole bank first`);
        const prior = JSON.parse(readFileSync(keyPath, 'utf8'));
        const replaced = new Set(authored.map((e) => `${e.question_id}::${e.kind}`));
        key = { ...prior, authoredAt: new Date().toISOString(), entries: [...prior.entries.filter((e) => !replaced.has(`${e.question_id}::${e.kind}`)), ...authored] };
        // Source order, so the file's row order is the bank's and a diff reads.
        const order = new Map(QUESTIONS.map((q, i) => [q.id, i]));
        key.entries.sort((a, b) => (order.get(a.question_id) - order.get(b.question_id)) || a.kind.localeCompare(b.kind));
      } else {
        key = { generatedFor: '#348', authoredAt: new Date().toISOString(), entries: authored };
      }
      checkKey(key, QUESTIONS.map((q) => q.id));
      writeFileSync(keyPath, `${JSON.stringify(key, null, 2)}\n`);
      console.log(`key ✓  ${key.entries.length} answers → ${keyPath}\ntranscript: ${path.join(r.authorRoot, 'transcript.jsonl')}`);
    }
  } catch (e) {
    console.error(`author ✗  ${e.message}`);
    process.exit(1);
  }
}
