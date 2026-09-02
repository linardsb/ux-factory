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
//   cd portal && node record-graded-answers.mjs --out ../docs/epics/fixtures/graded-answers [--budget 15]
//   cd portal && node record-graded-answers.mjs --out <dir> --only s4-appetite
//   cd portal && node record-graded-answers.mjs --probe   the fence receipt: four leak paths, refused, recorded

import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
      stats = { id: q.id, costUsd: msg.total_cost_usd ?? null, durationMs: msg.duration_ms ?? null, ok: msg.subtype === 'success' && !msg.is_error };
      // A result can carry subtype "success" AND is_error true, with the CLI's own message as the whole
      // assistant text — "Credit balance is too low" is what halted the first author run at question 28,
      // and it arrived looking like a normal turn. An error result is NEVER an answer: refuse it here,
      // carrying the CLI's message, or a billing failure becomes 195 sealed answers with a few lines of
      // error prose among them.
      if (msg.is_error || msg.subtype !== 'success') bad(`${q.id}: the SDK returned an error result (${msg.subtype}) — ${String(msg.result ?? 'no message')}`);
    }
  }
  if (!stats) bad(`${q.id}: the SDK stream ended with no result message — the CLI died mid-turn`);
  return { answers: parseAnswers(text.join('\n'), q.id), stats };
}

// THE FENCE RECEIPT (plan Q3). An author that never attempts a fenced read leaves a transcript with no
// `denied` line, and AC #1's receipt then does not exist — zero denials is not automatically a pass,
// because it cannot tell "never tried" from "the fence was never reached". This is ONE extra query under
// the IDENTICAL fence, asking the author to try the four leak paths and report each refusal verbatim.
// It is deliberately NOT a question added to the authoring prompt: a prompt that mentions the bank, the
// research file or a rubric would contaminate the 195 answers, which is the one thing this ticket cannot
// afford. Same shape as discovery-transport.mjs's --probe-fence, and the same standard: a paid
// observation, reported. "denied" is read off the SDK's OWN is_error, never off the fence that claims it.
export async function probeAuthorFence({ authorRoot, onLine }) {
  const allowSet = Object.freeze({ root: authorRoot, paths: Object.freeze([authorRoot]) });
  const fence = { allowSet, mainTools: AUTHOR_TOOLS };
  const turn = 'fence-probe';
  const targets = [
    path.join(REPO, 'discovery/bank.mjs'),
    path.join(REPO, 'docs/research/question-bank-source.md'),
    path.join(REPO, 'docs/epics/discovery-partner.prd.md'),
    path.join(REPO, 'discovery/instrument-loans-1/transcript.jsonl'),
  ];
  const prompt = `Using the Read tool and nothing else, attempt to read each of these files IN THIS ORDER, and then report, per file, EITHER its first line verbatim OR the refusal message verbatim. Never retry a refused read, never guess a file's content, and attempt all four.
${targets.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
  const calls = [];
  const text = [];
  let stats = null;
  const qy = query({
    prompt,
    options: {
      cwd: authorRoot, model: AUTHOR_MODEL, maxTurns: 8, tools: AUTHOR_TOOLS, allowedTools: [],
      strictMcpConfig: true,
      canUseTool: fenceCanUseTool(authorRoot, turn, onLine, fence),
      hooks: fenceHooks(authorRoot, turn, onLine, fence),
    },
  });
  for await (const msg of qy) {
    if (msg.type === 'assistant') {
      for (const b of msg.message?.content || []) {
        if (b.type === 'tool_use') calls.push({ id: b.id, tool: b.name, path: b.input?.file_path ?? null, isError: null });
        if (b.type === 'text' && b.text) text.push(b.text);
      }
    } else if (msg.type === 'user') {
      for (const b of (Array.isArray(msg.message?.content) ? msg.message.content : [])) {
        if (b.type !== 'tool_result') continue;
        const c = calls.find((x) => x.id === b.tool_use_id);
        if (c) c.isError = Boolean(b.is_error);
      }
    } else if (msg.type === 'result') {
      stats = { costUsd: msg.total_cost_usd ?? null, durationMs: msg.duration_ms ?? null, ok: msg.subtype === 'success' };
    }
  }
  const attempted = targets.filter((t) => calls.some((c) => c.path === t));
  const refused = targets.filter((t) => calls.some((c) => c.path === t && c.isError === true));
  const leaked = targets.filter((t) => calls.some((c) => c.path === t && c.isError === false));
  return { targets, calls, attempted, refused, leaked, text, stats, verdict: leaked.length ? 'LEAKED' : (refused.length === targets.length ? 'ALL_FOUR_REFUSED' : 'INCONCLUSIVE') };
}

// A SPEND CEILING, because this loop makes 65 paid calls unattended and the observed per-question cost
// (~$0.11 on the first, cold call) is 3.5x the plan's estimate. Checked AFTER each question, so the
// overshoot is at most one question's cost. A halt loses the run's money and writes no key — the answers
// are never half-sealed.
export async function recordGradedAnswers({ out, dry = false, only = null, budget = 15 }) {
  const fixtureDir = path.resolve(out);
  const brief = readFileSync(path.join(fixtureDir, 'brief.md'), 'utf8');
  const questions = only ? QUESTIONS.filter((q) => q.id === only) : (dry ? QUESTIONS.slice(0, 1) : QUESTIONS);
  if (!questions.length) bad(`no bank question with id "${only}"`);

  // Under --dry the author root is a temp directory, removed on exit: the wiring is identical and
  // nothing durable is written. probeFence does the same, for the same reason.
  const authorRoot = dry ? mkdtempSync(path.join(tmpdir(), 'graded-author-dry-')) : path.join(fixtureDir, 'author');
  mkdirSync(authorRoot, { recursive: true });

  // THE PARTIAL, AND WHY IT IS OUTSIDE THE AUTHOR ROOT. The first author run halted at question 28 of 65
  // on "Credit balance is too low" and lost 27 questions' answers, because the key was written only at
  // the end. Each question's three answers are now appended as they land, and a re-run SKIPS what is
  // already there — so a halt costs one question, not a run. It sits in the fixture directory rather
  // than in the author root: the author's allow-set is [authorRoot], so a file inside it would be
  // readable by the next question's agent, and an author that can read its own earlier answers writes to
  // its own template — the failure mode one query() per question exists to prevent. Removed once
  // key.json is sealed.
  const partialPath = path.join(fixtureDir, 'key.partial.jsonl');
  const done = new Map();
  // NOT under --only: that flag exists to RE-AUTHOR one question, and loading the partial would skip it
  // and merge the stale answer straight back.
  if (!dry && !only && existsSync(partialPath)) {
    for (const line of readFileSync(partialPath, 'utf8').split('\n').filter((l) => l.trim())) {
      const rec = JSON.parse(line);
      done.set(rec.question_id, rec);
    }
    console.log(`resuming: ${done.size} question(s) already authored in ${path.basename(partialPath)}`);
  }

  const denied = [];
  const onLine = (line) => { if (line?.type === 'denied') denied.push(line); };
  const entries = [];
  const stats = [];
  try {
    for (const [i, q] of questions.entries()) {
      if (done.has(q.id)) {
        const prior = done.get(q.id);
        for (const kind of ['K1', 'K2', 'K3']) entries.push({ question_id: q.id, kind, answer: prior[kind], expected: null });
        continue;
      }
      // ONE retry, for a malformed reply only. A refused result already threw with the CLI's own message
      // (a billing failure must halt at once, not be retried 65 times), and a hand-fix is never an option.
      let r;
      try { r = await authorOne({ authorRoot, brief, q, onLine }); }
      catch (e) {
        if (/error result/.test(e.message)) throw e;
        console.log(`  retrying ${q.id} — ${e.message}`);
        r = await authorOne({ authorRoot, brief, q, onLine });
      }
      for (const kind of ['K1', 'K2', 'K3']) entries.push({ question_id: q.id, kind, answer: r.answers[kind], expected: null });
      if (!dry) appendFileSync(partialPath, `${JSON.stringify({ question_id: q.id, ...r.answers })}\n`);
      if (r.stats) stats.push(r.stats);
      const spent = stats.reduce((s, t) => s + (t.costUsd ?? 0), 0);
      console.log(`  ${String(i + 1).padStart(2)}/${questions.length}  ${q.id.padEnd(34)} ${['K1', 'K2', 'K3'].map((k) => `${k} ${String(r.answers[k].split(/\s+/).length).padStart(3)}w`).join('  ')}  $${spent.toFixed(3)}`);
      if (dry) for (const kind of ['K1', 'K2', 'K3']) console.log(`\n${kind}: ${r.answers[kind]}\n`);
      if (spent > budget) bad(`the run has spent $${spent.toFixed(2)}, over the $${budget.toFixed(2)} ceiling, after ${i + 1} of ${questions.length} questions — halted, and no key was written. Raise --budget deliberately and re-run, or tighten the brief`);
    }
  } finally {
    if (dry) rmSync(authorRoot, { recursive: true, force: true });
  }

  const cost = stats.reduce((s, t) => s + (t.costUsd ?? 0), 0);
  return { entries, stats, cost, denied, resumed: done.size, authorRoot: dry ? null : authorRoot, fixtureDir, partialPath, wrote: null };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : (argv[i + 1] ?? null); };
  const dry = argv.includes('--dry');
  const only = flag('--only');
  const probeOnly = argv.includes('--probe');
  // fileURLToPath, never new URL(...).pathname: this repo's path contains a space, which
  // import.meta.url percent-encodes.
  const out = flag('--out') ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/epics/fixtures/graded-answers');
  try {
    if (probeOnly) {
      const authorRoot = dry ? mkdtempSync(path.join(tmpdir(), 'graded-probe-dry-')) : path.join(path.resolve(out), 'author');
      mkdirSync(authorRoot, { recursive: true });
      const seen = [];
      const pr = await probeAuthorFence({ authorRoot, onLine: (l) => { if (l?.type === 'denied') seen.push(l); } });
      if (dry) rmSync(authorRoot, { recursive: true, force: true });
      console.log(`\nprobe ${pr.verdict}  ·  $${(pr.stats?.costUsd ?? 0).toFixed(3)}  ·  ${pr.attempted.length}/4 attempted, ${pr.refused.length} refused by the SDK's own is_error, ${pr.leaked.length} leaked  ·  ${seen.length} denied line(s) written`);
      for (const l of seen) console.log(`  denied  via ${l.via}  ${l.tool}  ${l.input?.file_path ?? JSON.stringify(l.input)}`);
      for (const t of pr.leaked) console.log(`  LEAKED  ${t}`);
      process.exit(pr.verdict === 'ALL_FOUR_REFUSED' ? 0 : (pr.verdict === 'LEAKED' ? 3 : 2));
    }
    const r = await recordGradedAnswers({ out, dry, only, budget: Number(flag('--budget') ?? 15) });
    console.log(`\nauthor ${dry ? '(dry) ' : ''}✓  ${r.entries.length} answers (${r.resumed} resumed from the partial) · $${r.cost.toFixed(3)} this run · ${r.denied.length} denied line(s)`);
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
      // The partial has served its purpose the moment the key validates; leaving it behind would put a
      // second, divergent copy of the answers in the fixture directory.
      rmSync(r.partialPath, { force: true });
      console.log(`key ✓  ${key.entries.length} answers → ${keyPath}\ntranscript: ${path.join(r.authorRoot, 'transcript.jsonl')}`);
    }
  } catch (e) {
    console.error(`author ✗  ${e.message}`);
    process.exit(1);
  }
}
