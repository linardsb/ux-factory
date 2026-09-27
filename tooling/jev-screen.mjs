// tooling/jev-screen.mjs — the contradiction screen's operator CLI (#453, #466), over the SAME functions
// the portal's audit route runs (portal/lib/discovery-screen.mjs). It never touches a run package.
//
// The Jev modes (#453 — the measured record):
//   node tooling/jev-screen.mjs <document.md> --claims   FREE. Prints the split; for the frozen fixture
//        only (md5 below) writes tooling/jev-screen/fixture-claims.json — the committed claim ids the
//        screen rubric and build-checks 45.2 read.
//   node tooling/jev-screen.mjs <document.md> --smoke    PAID (≈ $0.0005). Stage 1 over the first three
//        claims (full state) and stage 2 over c001 ↔ c002, one request each: proves the request shape
//        and measures latency before a full run. Writes nothing; its answers are never scored.
//   node tooling/jev-screen.mjs <document.md>            PAID (≈ $0.01). The full screen. Retries 429/529
//        only (2 s, 4 s, 8 s); any other failure aborts and WRITES NOTHING. For the frozen fixture only,
//        writes tooling/jev-screen/screen-run.json — the verbatim responses build-checks 45.8 replays.
//   node tooling/jev-screen.mjs <fixture.md> --diagnostic   PAID (≈ $0.001). The #453 follow-up: stage 2
//        alone on the 16 pre-registered pairs (tooling/jev-screen/diagnostic.mjs; the rubric's §Diagnostic
//        is the receipt), in the fewest requests, retrying 429/529 only. Frozen fixture only. On success
//        writes tooling/jev-screen/diagnostic-run.json, which build-checks 45.12 replays; on any failure
//        WRITES NOTHING. Run once — never re-run for a better score.
//   node tooling/jev-screen.mjs --labels-template        FREE. Writes tooling/jev-screen/labels.json with
//        every kept pair of both screens and `real: null`, for the OWNER to fill. Refuses to overwrite a
//        file whose `by` is set. The session never writes a verdict.
//
// The Claude modes (#466 — pre-registered in the rubric's §One Claude call):
//   node tooling/jev-screen.mjs <document.md> --claude   FREE, the default. Prints the exact request,
//        claudePromptSha, the model, the document's md5 and which run file a paid run would write (the
//        fixture → claude-fixture-run.json, docs/epics/discovery-partner.prd.md → claude-live-run.json,
//        anything else → nothing), and checks the mapper reaches every rubric join on the fixture.
//        Never imports the SDK.
//   node tooling/jev-screen.mjs --claude --smoke         FREE. The same, for SMOKE_DOC below.
//   node tooling/jev-screen.mjs <document.md> --claude --paid <sha8>   PAID. <sha8> is the first 8 hex of
//        claudePromptSha, copied from the dry run. Refused before the SDK is imported unless (i) the rubric
//        registers this promptSha, (ii) nothing under the screen's files is uncommitted, (iii) the last
//        rubric commit is on a remote branch, and (iv) for the fixture and live runs, the smoke's run file
//        exists. A no-answer writes nothing and may be repeated; the first ANSWER is the run, written
//        once whatever it says, and never re-run.
//   node tooling/jev-screen.mjs --claude --smoke --paid <sha8>   PAID. The mechanism smoke on SMOKE_DOC,
//        never scored: writes claude-smoke-run.json once.
//   node tooling/jev-screen.mjs --claude-labels-template   FREE. Writes tooling/jev-screen/
//        claude-labels.json with every kept pair of each Claude run and `real: null`, for the OWNER.
//        Refuses to overwrite a file whose `by` is set.
//
// Any other --flag is refused by name, so a typo never falls through to the paid Jev run.
//
// Every run file is GENERATED from real API responses. Never hand-edit one (honesty contract): an edited
// wording moves questionsSha or promptSha, which build-checks group 45 checks. One completed run is the
// result — never re-run for a better score.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { askJev, JEV_MODEL } from "../portal/lib/jev.mjs";
import { execFileSync } from "node:child_process";
import { CLAIMS_VERSION, splitClaims } from "../discovery/claims.mjs";
import {
  batches, CLAUDE_SCREEN, CLAUDE_TIMEOUT_MS, claudeLines, claudePromptSha, claudeRequest, estTokens,
  mapQuote, QUESTION_TEMPLATES, readScreen, REQUEST_TOKEN_BUDGET, SCREEN_TIMEOUT_MS,
  screenDocument, stage1Question, stage1State, stage2Questions, tensionsOf,
  T2, T_SAME,
} from "../portal/lib/discovery-screen.mjs";
import { diagnosticBatches, recognise, verdictOf } from "./jev-screen/diagnostic.mjs";
import { JOINS, scoreClaudeRun } from "./jev-screen/claude-score.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "tooling/jev-screen");
export const FIXTURE_MD5 = "ab6eb0ee6cdd3b7802ecfcbe90db2377";
const PRICE_PER_M = 0.042; // the Models page's input price for jev-1.13.0; output is free
const GENERATED = "GENERATED by tooling/jev-screen.mjs from real TypeSafe API responses — never edit; re-run instead";
const md5 = (s) => createHash("md5").update(s).digest("hex");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const questionsSha = () => sha256(JSON.stringify(QUESTION_TEMPLATES));
const die = (msg) => { console.error(`jev-screen: ${msg}`); process.exit(1); };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Each call's `ms` is its SUCCESSFUL attempt only; backoff sleeps are not Jev latency.
const timed = [];
async function ask(body, opts) {
  for (const wait of [2000, 4000, 8000, null]) {
    const t0 = performance.now();
    try {
      const r = await askJev(body, opts);
      timed.push(Math.round(performance.now() - t0));
      return r;
    } catch (e) {
      const status = e.message.match(/^jev: (\d{3}) /)?.[1];
      if (wait === null || (status !== "429" && status !== "529")) throw e;
      await sleep(wait);
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// The Claude screen (#466). SMOKE_DOC is synthetic and never scored: one invented product, one planted
// contradiction (the first Monday against the 15th). It proves the harness before the scored run.
// ---------------------------------------------------------------------------------------------------
export const SMOKE_DOC = `# Kettle Club — product brief

Kettle Club is a monthly tea subscription for people who brew loose-leaf tea at home.

## What a member gets

- One box a month with three loose-leaf teas and a tasting card.
- Every box ships on the first Monday of the month.
- Members can pause deliveries from their account page.

## Operations

Boxes ship on the 15th of each month from our Leeds warehouse.
Tracking links are emailed the day a box leaves the warehouse.
`;

const RUBRIC = "docs/epics/fixtures/discovery-partner.screen-rubric.md";
const LIVE_PRD = "docs/epics/discovery-partner.prd.md";
const FIXTURE_PATH = "docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md";
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const FLAGS = ["--claims", "--smoke", "--diagnostic", "--labels-template", "--claude", "--paid", "--claude-labels-template"];
for (const a of argv) if (a.startsWith("--") && !FLAGS.includes(a)) die(`unknown flag ${a} — the flags are ${FLAGS.join(" ")}`);
const paidSha = flag("--paid") ? argv[argv.indexOf("--paid") + 1] : null;
if (flag("--paid") && !flag("--claude")) die("--paid belongs to --claude");
const docArg = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--paid");

if (flag("--claude-labels-template")) {
  const out = join(DIR, "claude-labels.json");
  if (existsSync(out) && JSON.parse(readFileSync(out, "utf8")).by) die(`${relative(ROOT, out)} carries the owner's verdicts (by is set) — refusing to overwrite it`);
  const screens = {};
  for (const [name, file] of [["claude-fixture", "claude-fixture-run.json"], ["claude-live", "claude-live-run.json"]]) {
    const f = join(DIR, file);
    if (existsSync(f)) screens[name] = tensionsOf(JSON.parse(readFileSync(f, "utf8")).lines).map(({ a, b }) => ({ a, b, real: null, note: "" }));
  }
  if (!Object.keys(screens).length) die("no claude-fixture-run.json or claude-live-run.json — run the paid Claude screen first");
  writeFileSync(out, `${JSON.stringify({ by: null, at: null, screens }, null, 2)}\n`);
  console.log(`jev-screen ✓ wrote ${relative(ROOT, out)} — ${Object.entries(screens).map(([k, v]) => `${k}: ${v.length} pair(s)`).join(" · ")}. The owner sets real (true|false), by: "owner" and at.`);
  process.exit(0);
}

if (flag("--claude")) await claudeMode();

if (flag("--labels-template")) {
  const out = join(DIR, "labels.json");
  if (existsSync(out) && JSON.parse(readFileSync(out, "utf8")).by) die(`${relative(ROOT, out)} carries the owner's verdicts (by is set) — refusing to overwrite it`);
  const runFile = join(DIR, "screen-run.json");
  if (!existsSync(runFile)) die("no tooling/jev-screen/screen-run.json — run the paid screen first");
  const row = ({ a, b }) => ({ a, b, real: null, note: "" });
  const screens = { "screen-run": tensionsOf(JSON.parse(readFileSync(runFile, "utf8")).lines).map(row) };
  const pkg = join(ROOT, "discovery/partner-audit-3");
  if (existsSync(join(pkg, "screen.jsonl"))) screens["partner-audit-3"] = tensionsOf(readScreen(pkg)).map(row);
  writeFileSync(out, `${JSON.stringify({ by: null, at: null, screens }, null, 2)}\n`);
  console.log(`jev-screen ✓ wrote ${relative(ROOT, out)} — ${Object.entries(screens).map(([k, v]) => `${k}: ${v.length} pair(s)`).join(" · ")}. The owner sets real (true|false), by: "owner" and at.`);
  process.exit(0);
}

if (!docArg) die("usage: node tooling/jev-screen.mjs <document.md> [--claims | --smoke | --diagnostic] | --labels-template");
const docPath = resolve(docArg);
const text = readFileSync(docPath, "utf8");
const docMd5 = md5(text);
const isFixture = docMd5 === FIXTURE_MD5;
const claims = splitClaims(text);

if (flag("--claims")) {
  console.log(`claims: ${claims.length} · md5 ${docMd5} · version ${CLAIMS_VERSION}`);
  if (!isFixture) { console.log("not the frozen fixture — nothing written"); process.exit(0); }
  const out = join(DIR, "fixture-claims.json");
  writeFileSync(out, `${JSON.stringify({
    $description: "GENERATED by tooling/jev-screen.mjs --claims from the frozen fixture — never edit; re-run instead",
    source: relative(ROOT, docPath), md5: docMd5, claimsVersion: CLAIMS_VERSION, claims,
  }, null, 2)}\n`);
  console.log(`jev-screen ✓ wrote ${relative(ROOT, out)}`);
  process.exit(0);
}

if (flag("--diagnostic")) {
  if (!isFixture) die(`--diagnostic runs on the frozen fixture only (md5 ${FIXTURE_MD5}); this document is ${docMd5} — nothing written`);
  const ranAt = new Date().toISOString();
  const state = QUESTION_TEMPLATES.stage2State;
  const requests = [];
  const answers = {};
  try {
    for (const batch of diagnosticBatches(claims)) {
      const questionIds = Object.keys(batch);
      const response = await ask({ state, questions: batch }, { timeoutMs: SCREEN_TIMEOUT_MS });
      for (const id of questionIds) if (!response?.answers?.[id]) throw new Error(`Jev answered no ${id}`);
      requests.push({ stage: 2, questionIds, response: { model: response.model, answers: response.answers, usage: response.usage ?? null } });
      Object.assign(answers, response.answers);
    }
    if (requests.some((r) => r.response.model !== JEV_MODEL)) throw new Error(`answered by ${requests.map((r) => r.response.model).join(", ")}, not ${JEV_MODEL}`);
  } catch (e) { die(`${e.message} — nothing written`); }
  let pairs;
  try { pairs = recognise(answers, { t2: T2, tSame: T_SAME }); } catch (e) { die(`${e.message} — nothing written`); }
  const { verdict, found } = verdictOf(pairs);
  console.log("join · finding · class · contradicts · same_subject · RECOGNISED");
  for (const p of pairs) console.log(`${p.a} ↔ ${p.b} · ${p.finding} · ${p.class} · ${p.contradicts.toFixed(2)} (${p.choice}) · ${p.sameSubject.toFixed(2)} · ${p.recognised ? "yes" : "no"}`);
  const tokens = requests.map((r) => r.response.usage?.input_tokens);
  const total = tokens.every(Number.isFinite) ? tokens.reduce((s, t) => s + t, 0) : null;
  console.log(`contradiction-class findings recognised: ${found.length} / 3 (${found.join(", ") || "none"}) → ${verdict} (rule: ≥ 2, at T2 ${T2} and T_SAME ${T_SAME})`);
  console.log(`requests ${requests.length} · input tokens ${total ?? "?"} (observed, usage) · cost $${total === null ? "?" : (total * PRICE_PER_M / 1e6).toFixed(5)} (derived: tokens × $${PRICE_PER_M}/M) · latency ${timed.join(" / ")} ms`);
  const out = join(DIR, "diagnostic-run.json");
  writeFileSync(out, `${JSON.stringify({
    $description: GENERATED, model: JEV_MODEL, ranAt, docMd5, claimsVersion: CLAIMS_VERSION, questionsSha: questionsSha(),
    pairs, requests: requests.map((r, i) => ({ ...r, ms: timed[i] })),
  }, null, 2)}\n`);
  console.log(`jev-screen ✓ wrote ${relative(ROOT, out)}`);
  process.exit(0);
}

if (flag("--smoke")) {
  const state = stage1State(claims);
  const qs1 = {};
  for (const c of claims.slice(0, 3)) qs1[`pick_${c.id}`] = stage1Question(c, claims);
  const est1 = estTokens(state) + Object.values(qs1).reduce((s, q) => s + estTokens(q), 0);
  // A second stage-1 request with 30 questions: the option-heavy JSON is what overflowed the estimate,
  // and two usage figures solve for per-state and per-question tokens. Its answers are not printed.
  const qs30 = {};
  for (const c of claims.slice(3, 33)) qs30[`pick_${c.id}`] = stage1Question(c, claims);
  const est30 = estTokens(state) + Object.values(qs30).reduce((s, q) => s + estTokens(q), 0);
  let r1, r2, r30;
  try {
    r1 = await ask({ state, questions: qs1 }, { timeoutMs: SCREEN_TIMEOUT_MS });
    r2 = await ask({ state: QUESTION_TEMPLATES.stage2State, questions: stage2Questions(claims[0], claims[1]) }, { timeoutMs: SCREEN_TIMEOUT_MS });
    r30 = await ask({ state, questions: qs30 }, { timeoutMs: SCREEN_TIMEOUT_MS });
  } catch (e) { die(e.message); }
  const u3 = r1.usage?.input_tokens, u30 = r30.usage?.input_tokens;
  const perQ = (u30 - u3) / 27, perState = u3 - 3 * perQ;
  const ch = (x) => JSON.stringify(x).length;
  const avgQChars = Object.values(qs30).reduce((s, q) => s + ch(q), 0) / 30;
  console.log(`calibration: 3 questions ${u3} tok (est ${est1}) · 30 questions ${u30} tok (est ${est30}) · per question ${perQ.toFixed(0)} tok for ${avgQChars.toFixed(0)} chars (${(avgQChars / perQ).toFixed(2)} chars/token) · state ${perState.toFixed(0)} tok for ${ch(state)} chars (${(ch(state) / perState).toFixed(2)} chars/token) · 30-question request ${timed[2]} ms`);
  for (const id of Object.keys(qs1)) {
    const a = r1.answers?.[id];
    if (typeof a?.choice !== "string" || !Number.isFinite(a.probabilities?.[a.choice])) die(`smoke: ${id} came back without choice + probabilities — ${JSON.stringify(a)}`);
    console.log(`${id} → ${a.choice} p ${a.probabilities[a.choice]} · confidence ${a.confidence}`);
  }
  const rel = r2.answers?.[`relation_${claims[0].id}_${claims[1].id}`];
  const same = r2.answers?.[`same_${claims[0].id}_${claims[1].id}`];
  if (!Number.isFinite(rel?.probabilities?.contradicts)) die(`smoke: relation came back without probabilities.contradicts — ${JSON.stringify(rel)}`);
  if (!Number.isFinite(same?.noul)) die(`smoke: same_subject came back without a noul — ${JSON.stringify(same)}`);
  console.log(`relation → ${rel.choice} ${JSON.stringify(rel.probabilities)} · same_subject noul ${same.noul}`);
  // The pre-registered latency rule (plan Task 16b, R3), per REQUEST, since the timeout is per request.
  const qsAll = {};
  for (const c of claims) qsAll[`pick_${c.id}`] = stage1Question(c, claims);
  const largest = Math.max(...batches(qsAll, state).map((b) => estTokens(state) + Object.values(b).reduce((s, q) => s + estTokens(q), 0)));
  const projected = Math.round(timed[0] * (largest / est1));
  console.log(`latency rule: ${timed[0]} ms × (largest stage-1 request est ${largest} ÷ smoke est ${est1}) = ${projected} ms projected vs ${SCREEN_TIMEOUT_MS / 2} ms (half of SCREEN_TIMEOUT_MS) at REQUEST_TOKEN_BUDGET ${REQUEST_TOKEN_BUDGET} → ${projected > SCREEN_TIMEOUT_MS / 2 ? "HALVE the budget" : "fits"}`);
  console.log(`smoke ✓ shape ok · stage1 ${timed[0]} ms / ${r1.usage?.input_tokens} tok (est ${est1}) · stage2 ${timed[1]} ms / ${r2.usage?.input_tokens} tok`);
  process.exit(0);
}

// The paid run.
const ranAt = new Date().toISOString();
let result;
try { result = await screenDocument(text, { ask }); } catch (e) { die(`${e.message} — nothing written`); }
const { lines, requests } = result;
const summary = lines.at(-1);
for (const t of tensionsOf(lines)) {
  const pair = lines.find((l) => l.type === "pair" && l.a.id === t.a.id && l.b.id === t.b.id);
  console.log(`${t.a.id} ↔ ${t.b.id}  contradicts ${t.contradicts.toFixed(2)}  same ${pair.sameSubject.toFixed(2)}`);
  console.log(`  ${t.a.id} (${t.a.section}): ${t.a.text}`);
  console.log(`  ${t.b.id} (${t.b.section}): ${t.b.text}`);
}
const est = requests.filter((r) => r.stage === 1).map((r) => estTokens(stage1State(claims))
  + r.questionIds.reduce((s, id) => s + estTokens(stage1Question(claims.find((c) => `pick_${c.id}` === id), claims)), 0));
const sorted = [...timed].sort((a, b) => a - b);
const n1 = requests.filter((r) => r.stage === 1).length;
console.log(`claims ${summary.claims} · picks ${summary.picks} · candidates ${summary.candidates} · kept ${summary.kept} · t1 ${summary.t1}`);
console.log(`requests ${requests.length} (stage 1: ${n1}, stage 2: ${requests.length - n1}) · input tokens ${summary.inputTokens} (observed, usage) · est. stage-1 tokens ${est.reduce((s, e) => s + e, 0)} · cost $${summary.inputTokens === null ? "?" : (summary.inputTokens * PRICE_PER_M / 1e6).toFixed(5)} (derived: tokens × $${PRICE_PER_M}/M) · latency p50 ${sorted[Math.ceil(sorted.length / 2) - 1]} ms, max ${sorted.at(-1)} ms`);
if (!isFixture) { console.log("not the frozen fixture — nothing written"); process.exit(0); }
const out = join(DIR, "screen-run.json");
writeFileSync(out, `${JSON.stringify({
  $description: GENERATED, model: JEV_MODEL, ranAt, docMd5, claimsVersion: CLAIMS_VERSION, questionsSha: questionsSha(),
  requests: requests.map((r, i) => ({ ...r, ms: timed[i] })), lines,
}, null, 2)}\n`);
console.log(`jev-screen ✓ wrote ${relative(ROOT, out)}`);

async function claudeMode() {
  const smoke = flag("--smoke");
  if (smoke && docArg) die("--claude --smoke screens SMOKE_DOC and takes no document");
  if (!smoke && !docArg) die("usage: node tooling/jev-screen.mjs <document.md> --claude [--paid <sha8>] | --claude --smoke [--paid <sha8>]");
  const text = smoke ? SMOKE_DOC : readFileSync(resolve(docArg), "utf8");
  const docMd5 = md5(text);
  const kind = smoke ? "smoke" : docMd5 === FIXTURE_MD5 ? "fixture" : resolve(docArg) === join(ROOT, LIVE_PRD) ? "live" : null;
  const out = kind && join(DIR, `claude-${kind}-run.json`);
  const req = claudeRequest(text);
  const sha = claudePromptSha();
  console.log(`claude screen · model ${CLAUDE_SCREEN.model} · K ${CLAUDE_SCREEN.K} · timeout ${CLAUDE_TIMEOUT_MS} ms · promptSha ${sha}`);
  console.log(`document ${smoke ? "SMOKE_DOC (synthetic, never scored)" : relative(ROOT, resolve(docArg))} · md5 ${docMd5} · ${splitClaims(text).length} claims · claims version ${CLAIMS_VERSION}`);
  console.log(`system ${req.system.length} chars · prompt ${req.prompt.length} chars`);
  console.log(`prompt head: ${JSON.stringify(req.prompt.slice(0, 200))}`);
  console.log(`prompt tail: ${JSON.stringify(req.prompt.slice(-200))}`);
  console.log(out ? `→ would write ${relative(ROOT, out)}` : "→ nothing (not the fixture, the live PRD or the smoke)");
  if (out && existsSync(out)) die(`${relative(ROOT, out)} exists — one run, never re-run`);
  // The mapper's self-check: an 8-word window of every non-control join claim's own source lines must
  // map to that claim on the fixture, or a 0/3 could be the mapper's.
  const fx = readFileSync(join(ROOT, FIXTURE_PATH), "utf8");
  const fc = JSON.parse(readFileSync(join(DIR, "fixture-claims.json"), "utf8")).claims;
  const lines = fx.split(/\r?\n/);
  const ids = [...new Set(JOINS.flatMap((j) => [j.a, j.b]))];
  const unreached = ids.filter((id) => {
    const c = fc.find((x) => x.id === id);
    const w = lines.slice(c.line - 1, c.endLine).join(" ").replace(/[*_`|]/g, " ").split(/\s+/).filter(Boolean);
    for (let i = 0; i + 8 <= w.length; i += 1) { const r = mapQuote(w.slice(i, i + 8).join(" "), fx, fc); if (r.status === "mapped" && r.claim === id) return false; }
    return true;
  });
  if (unreached.length) die(`mapper does not reach ${unreached.join(", ")} on the fixture`);
  console.log(`mapper reaches all ${JOINS.length} joins ✓ (${ids.length} claims)`);
  if (!flag("--paid")) { console.log(`dry run — nothing sent. To spend the run: --paid ${sha.slice(0, 8)}`); process.exit(0); }

  // PAID. Every interlock refuses before the SDK is imported.
  if (paidSha !== sha.slice(0, 8)) die(`sha8 ${paidSha} is not claudePromptSha's ${sha.slice(0, 8)} — read the dry run first`);
  if (!kind) die("--paid runs only on the fixture, the live PRD or --smoke — nothing else is written, so nothing else is paid for");
  if (!readFileSync(join(ROOT, RUBRIC), "utf8").includes(`promptSha = ${sha}`)) die(`the rubric does not register promptSha ${sha}`);
  const dirty = git("status", "--porcelain", "--", "portal/lib/discovery-screen.mjs", "portal/lib/discovery-screen-call.mjs", RUBRIC, "tooling/jev-screen.mjs", "tooling/jev-screen/");
  if (dirty) die(`uncommitted changes are in play — commit them first:\n${dirty}`);
  const receipt = git("log", "-1", "--format=%H", "--", RUBRIC);
  if (!git("branch", "-r", "--contains", receipt)) die(`the pre-registration commit ${receipt} is on no remote branch — push it first`);
  if (kind !== "smoke" && !existsSync(join(DIR, "claude-smoke-run.json"))) die("run the smoke first (--claude --smoke --paid <sha8>)");

  const { askScreen } = await import("../portal/lib/discovery-screen-call.mjs");
  const ranAt = new Date().toISOString();
  let response;
  const t0 = performance.now();
  try { response = await askScreen(req, { timeoutMs: CLAUDE_TIMEOUT_MS }); }
  catch (e) { die(`no answer after ${Math.round(performance.now() - t0)} ms — ${e.message} — nothing written; a no-answer may be repeated, and the report counts it`); }
  const runLines = claudeLines({ text, result: response });
  writeFileSync(out, `${JSON.stringify({
    $description: "GENERATED by tooling/jev-screen.mjs --claude --paid from one real Claude answer — never edit; never re-run",
    model: CLAUDE_SCREEN.model, ranAt, receipt, docMd5, claimsVersion: CLAIMS_VERSION, promptSha: sha,
    ...(kind === "fixture" ? {} : { text }),
    request: req, response, lines: runLines,
  }, null, 2)}\n`, { flag: "wx" });
  const sum = runLines.at(-1);
  console.log(`answered in ${Math.round(performance.now() - t0)} ms · init tools ${JSON.stringify(response.init?.tools)} · mcp ${JSON.stringify(response.init?.mcpServers)} · modelUsage ${JSON.stringify(Object.keys(response.modelUsage ?? {}))} · cost $${response.costUsd} (observed)`);
  console.log(`parse ${sum.parse}${sum.parsedBy ? ` (${sum.parsedBy})` : ""} · returned ${sum.returned} · malformed ${sum.malformed} · kept ${sum.kept}`);
  for (const l of runLines.filter((x) => x.type === "quoted-pair"))
    console.log(`#${l.index} ${l.kept ? "KEPT" : `dropped (${l.reason})`} · ${l.sideA.status}${l.sideA.claim ? ` ${l.sideA.claim}` : ` (${l.sideA.reason})`} ↔ ${l.sideB.status}${l.sideB.claim ? ` ${l.sideB.claim}` : ` (${l.sideB.reason})`}\n    a: ${JSON.stringify(l.quoteA)}\n    b: ${JSON.stringify(l.quoteB)}\n    why: ${l.why}`);
  if (kind === "fixture") {
    const sc = scoreClaudeRun(runLines);
    console.log("finding · class · state · by pair");
    for (const f of sc.findings) console.log(`${f.finding} · ${f.class} · ${f.state} · ${f.by.join(", ") || "—"}`);
    console.log(`contradiction-class findings FOUND: ${sc.found.length} / ${sc.of} (${sc.found.join(", ") || "none"})`);
  }
  console.log(`jev-screen ✓ wrote ${relative(ROOT, out)}`);
  process.exit(0);
}
