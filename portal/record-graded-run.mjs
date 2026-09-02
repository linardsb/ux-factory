// portal/record-graded-run.mjs — the graded fixture's run driver (epic #279, ticket #348;
// .claude/plans/discovery-graded-answer-fixture-348.md Phase C).
//
// Build-time only, ZERO-DEP: node:fs, node:path, node:url, node:child_process and global fetch. It does
// NOT import the Agent SDK and it never writes into a run package — its only writes are stdout and,
// through the portal, the server's own appendAnswer. Nothing in tooling/ imports it.
//
// WHY A DRIVER AND NOT 390 HAND-PASTES. The ticket asks for two things at once: six real runs through
// the drawer's own route, AND answers.jsonl byte-equal to the sealed key. appendAnswer stores the
// submitted text VERBATIM — no trim, no normalisation — into an append-only file the honesty contract
// forbids anyone to clean up, so one stray character from a paste is a permanent wrong line and the
// package is void. This POSTs to /api/discovery/turn: the SAME route the drawer POSTs to, the same
// runTurn, the same guards, the same server-side write. The honesty contract's target is hand-WRITING
// the record, and nothing here writes a record.
//
// NEVER RETRY A NON-ADVANCING TURN. A turn the agent yields without closing leaves the cursor where it
// was (discovery.mjs invariant 4), so a re-submit appends a SECOND answers.jsonl line for the same
// question and byte-equality is broken permanently. The driver HALTS, prints the turn, and lets the
// operator decide: re-submit that one turn by hand at the drawer, or abandon the slug and re-run under
// a new one (a slug names four files and discovery/ is a flat namespace, so a retired slug stays
// retired).
//
// DISK IS AUTHORITATIVE. Every turn re-reads the cursor from the server rather than counting its own
// submissions, so a resumed run cannot drift. --from is the operator's STATED expectation, checked
// against the server's cursor and refused on a disagreement — it never tells the server where to start.
//
// NO Origin HEADER. portal/lib/origin.mjs:originAllowed passes an absent one, so a Node fetch needs no
// header games; inventing one would be inventing a browser this is not.
//
// SERIAL BY CONSTRUCTION. withDiscoveryRunLock refuses a concurrent turn, and two runs would race the
// same portal — do not add concurrency.
//
//   cd portal && npm start                                   # in another shell
//   node portal/record-graded-run.mjs --slug graded-think-a --posture think --run a --dry
//   node portal/record-graded-run.mjs --slug graded-think-a --posture think --run a

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { QUESTIONS } from '../discovery/bank.mjs';
import { checkDraw, checkKey, kindFor, readDraw, readKey, RUNS } from '../tooling/discovery-score.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEPTH = 'whole-bank';

const bad = (msg) => { throw new Error(`record-graded-run: ${msg}`); };

const api = async (base, route, method, body) => {
  const res = await fetch(`${base}${route}`, {
    method,
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { bad(`${method} ${route} answered ${res.status} with non-JSON: ${text.slice(0, 200)}`); }
  if (json.error) bad(`${method} ${route} refused: ${json.error}`);
  return json;
};

// One SSE turn. Consumes the frames the route emits (text · op · denied · done · error) and returns the
// `done` frame's view, which is the server's own sessionView — the cursor this driver trusts.
async function postTurn(base, { slug, provenance, questionId, text }, onEvent) {
  const res = await fetch(`${base}/api/discovery/turn`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug, provenance, questionId, text }),
  });
  if (!res.body) bad('the turn route returned no body — is the portal running?');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let view = null;
  let error = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split('\n\n');
    buf = frames.pop() ?? '';
    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      let ev;
      try { ev = JSON.parse(line.slice(6)); } catch { continue; }
      if (ev.type === 'done') view = ev.view;
      else if (ev.type === 'error') error = ev.message;
      else onEvent?.(ev);
    }
  }
  if (error) bad(`the turn failed: ${error}`);
  if (!view) bad('the turn stream ended with no done frame — the connection dropped mid-turn; re-read the session before deciding anything');
  return view;
}

// `turns` bounds the walk for the SMOKE run (Phase C1): two throwaway slugs, one turn each, deleted
// after — run 0's Phase A shape, catching an auth surprise, a fingerprint surprise and a driver bug for
// 1/200 of a full run's cost. Unbounded for a real recording.
export async function recordGradedRun({ slug, posture, run, port = 4747, from = null, dry = false, turns = Infinity }) {
  if (!RUNS.includes(run)) bad(`--run must be one of ${RUNS.join(' · ')} — it names the draw column`);
  // A mis-typed --run cannot produce a wrong matrix: assertAnswersSealed compares the stored text
  // against the key for THIS column and throws naming the first ref. The suffix check makes the failure
  // loud here instead of at scoring time.
  if (!slug.endsWith(`-${run}`)) bad(`slug "${slug}" does not end in "-${run}" — the slug's suffix names the draw column and they must agree`);

  const ids = QUESTIONS.map((q) => q.id);
  const draw = checkDraw(readDraw(), ids);
  const keyIndex = checkKey(readKey(), ids);
  const base = `http://127.0.0.1:${port}`;
  const provenance = 'fictional';

  const health = await api(base, '/api/health', 'GET');
  console.log(`portal ✓  ${JSON.stringify(health)}`);

  const answerFor = (questionId) => {
    const kind = kindFor(draw, questionId, run);
    const entry = keyIndex.get(`${questionId}::${kind}`);
    if (!entry) bad(`the key holds no ${kind} answer for ${questionId}`);
    return { kind, text: entry.answer };
  };

  if (dry) {
    console.log(`\ndry run — ${slug} · posture ${posture} · column ${run} · depth ${DEPTH}. Nothing is POSTed.`);
    for (const id of ids.slice(0, 3)) {
      const a = answerFor(id);
      console.log(`  ${id.padEnd(34)} ${a.kind}  ${JSON.stringify(a.text.slice(0, 60))}…`);
    }
    return { dry: true, turns: 0, slug };
  }

  let view = await api(base, '/api/discovery/session', 'POST', {
    slug, provenance, entryMode: 'blank-idea', depth: DEPTH, branch: null, frontEnd: 'portal', posture, reads: [],
  });
  if (view.head.posture !== posture || view.head.depth !== DEPTH)
    bad(`the existing package at discovery/${slug} is posture ${view.head.posture} depth ${view.head.depth}, not ${posture}/${DEPTH} — disk is authoritative and a resumed session keeps its own head; use a fresh slug`);
  if (from !== null && view.cursor.index !== from)
    bad(`--from ${from} does not match the server's cursor (${view.cursor.index}) — disk is authoritative; re-read the package and pass the cursor it actually holds, or omit --from`);

  const started = Date.now();
  let walked = 0;
  while (!view.cursor.done && walked < turns) {
    const before = view.cursor.index;
    const q = view.cursor.question;
    const a = answerFor(q.id);
    const t0 = Date.now();
    let ops = 0;
    view = await postTurn(base, { slug, provenance, questionId: q.id, text: a.text }, (ev) => { if (ev.type === 'op') ops += 1; });
    const closed = view.cursor.index === before + 1;
    const last = view.head.turnStats?.[view.head.turnStats.length - 1] ?? {};
    console.log(`  ${String(before + 1).padStart(2)}/${view.cursor.total}  ${q.id.padEnd(34)} ${a.kind}  ${ops} op(s)  ${((Date.now() - t0) / 1000).toFixed(1)}s  $${(last.costUsd ?? 0).toFixed(4)}  ${closed ? 'closed' : 'DID NOT CLOSE'}`);
    if (!closed)
      bad(`turn ${before + 1} (${q.id}) did not close — the cursor is still at ${view.cursor.index}. NOT RETRYING: a re-submit would append a second answers.jsonl line for this question and break byte-equality permanently in an append-only file. Re-submit this one answer by hand at the drawer, or abandon slug "${slug}" (delete discovery/${slug} and retire the slug) and re-run under a new one.`);
    walked += 1;
  }

  if (walked >= turns && !view.cursor.done) {
    const stats = view.head.turnStats ?? [];
    return { slug, posture, run, turns: walked, smoke: true, cost: stats.reduce((s, t) => s + (t.costUsd ?? 0), 0), minutes: (Date.now() - started) / 60000, fingerprints: [...new Set(stats.map((t) => t.postureFingerprint))], stats };
  }
  await api(base, '/api/discovery/close', 'POST', { slug, provenance });
  const cost = (view.head.turnStats ?? []).reduce((s, t) => s + (t.costUsd ?? 0), 0);
  const prints = execFileSync('node', [path.join(REPO, 'discovery/prd-projection.mjs'), slug, '--force'], { cwd: REPO, encoding: 'utf8' });
  process.stdout.write(prints);
  return { slug, posture, run, turns: view.cursor.total, cost, minutes: (Date.now() - started) / 60000, fingerprints: [...new Set((view.head.turnStats ?? []).map((t) => t.postureFingerprint))] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : (argv[i + 1] ?? null); };
  try {
    const slug = flag('--slug');
    const posture = flag('--posture');
    if (!slug || !posture) throw new Error('usage: node portal/record-graded-run.mjs --slug <slug> --posture <think|think-opus> --run <a|b|c> [--port 4747] [--from <n>] [--turns <n>] [--dry]');
    const r = await recordGradedRun({
      slug, posture, run: flag('--run'),
      port: Number(flag('--port') ?? 4747),
      from: flag('--from') === null ? null : Number(flag('--from')),
      turns: flag('--turns') === null ? Infinity : Number(flag('--turns')),
      dry: argv.includes('--dry'),
    });
    if (!r.dry) console.log(`\nrun ✓  ${r.slug} · ${r.turns} turns · $${r.cost.toFixed(2)} · ${r.minutes.toFixed(0)} min · fingerprint(s) ${r.fingerprints.join(', ')}`);
  } catch (e) {
    console.error(`run ✗  ${e.message}`);
    process.exit(1);
  }
}
