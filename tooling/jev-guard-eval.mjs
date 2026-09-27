// tooling/jev-guard-eval.mjs — the #454 answer-box guard's labelled eval. OPERATOR-RUN: it needs
// TYPESAFE_API_KEY in portal/.env and spends real Jev calls (~164, sequential; ≈ $0.002 at the
// $0.042/M input price third-party posts quote — UNVERIFIED, TypeSafe's docs state no price).
//
// What it does, in order:
//   1. Builds the item set from disk: the owner-labelled positives in tooling/jev-guard/labels.json,
//      and as negatives every OTHER banked answer line under discovery/*/answers.jsonl, deduplicated by
//      exact text (graded-opus-a and graded-think-a are byte-identical answer sets, so without the
//      dedup they would count twice). It prints the census before the first call.
//   2. Asks Jev both questions (portal/lib/discovery-guard.mjs QUESTIONS, stateFor) per item, with a
//      10 s timeout and retry on 429/529 only (2 s, 4 s, 8 s). Any other failure aborts and WRITES
//      NOTHING — a partial eval must never be committed.
//   3. Sweeps T over 0.10…0.90 and applies the PRE-REGISTERED rule (plan D3, below) in code. If no
//      look_up threshold is admissible it prints why and exits 1 without writing: that is the owner's
//      decision, never a reason to adjust the rule.
//   4. Writes tooling/jev-guard/eval-run.json — the verbatim `answers` of every response — and prints
//      the two values to copy into discovery-guard.mjs. It does not edit the module.
//
// eval-run.json is GENERATED from real API responses. Never hand-edit it (honesty contract): a bad
// question wording is fixed by editing QUESTIONS and re-running, which moves questionsSha, which
// build-checks group 44.2 checks.
//
// THE RULE (D3), fixed before the first run and amended once by the owner (2026-09-27, below):
//   T_LOOK_UP, when the sets SEPARATE (the lowest positive look_up score is above the highest negative):
//     the grid T nearest the midpoint of that gap (a tie goes to the lower T), provided it keeps the
//     grid's maximum recall and a false-prompt count ≤ 3/160 (2%). The amendment: the first run
//     separated 0.31 | 0.95, and the original first branch took the grid's top (0.90), 0.05 under four
//     look-ups that all open "Look it up:". The midpoint spends the margin evenly on both sides, which
//     is the only defensible place when nothing between the sets was measured.
//   Otherwise, or if that T fails its proviso: the highest grid T at which look_up recall equals the
//     maximum recall anywhere on the grid, provided its look_up false-prompt count is ≤ 2%; else the
//     highest grid T with recall ≥ 3/4 and false-prompt ≤ 2%; else stop.
//   T_ASIDE = the lowest grid T at which the combined prompt count on negatives (decide ≠ "answer",
//     at T_LOOK_UP) is ≤ 4/160 (3%); if none, null — the aside question is disabled.
//   2% and 3% are set by the cheap side: a session is ~30 answers, so 3% ≈ 0.9 unneeded prompts, each
//   one click. Highest T at max recall, because at equal recall a higher T can only lower false
//   prompts; lowest T_ASIDE, because its recall cannot be measured (no labelled asides).
//   The false-prompt ceilings are fractions of the negatives actually counted, floored.
//
// Standalone: node tooling/jev-guard-eval.mjs
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { askJev, JEV_MODEL } from "../portal/lib/jev.mjs";
import { decide, QUESTIONS, stateFor } from "../portal/lib/discovery-guard.mjs";
import { questionById } from "../discovery/bank.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "tooling/jev-guard");
const OUT = join(DIR, "eval-run.json");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const GRID = Array.from({ length: 17 }, (_, i) => (10 + 5 * i) / 100);

// 1 — the items.
const labels = JSON.parse(readFileSync(join(DIR, "labels.json"), "utf8"));
const banked = [];
for (const pkg of readdirSync(join(ROOT, "discovery")).sort()) {
  const file = join(ROOT, "discovery", pkg, "answers.jsonl");
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n").filter(Boolean)) {
    const a = JSON.parse(line);
    if (a.kind === "banked") banked.push({ package: pkg, ...a });
  }
}
const positives = labels.positives.map(({ package: pkg, ref }) => {
  const a = banked.find((b) => b.package === pkg && b.ref === ref);
  if (!a) throw new Error(`jev-guard-eval: labelled positive ${pkg}/${ref} is not a banked answer line`);
  if (!a.text.startsWith("Look it up")) throw new Error(`jev-guard-eval: labelled positive ${pkg}/${ref} does not start "Look it up"`);
  return { ...a, label: "positive" };
});
const posTexts = new Set(positives.map((p) => p.text));
const seen = new Set();
const negatives = [];
for (const a of banked) {
  if (posTexts.has(a.text) || seen.has(a.text)) continue;
  seen.add(a.text);
  negatives.push({ ...a, label: "negative" });
}
console.log(`census: ${banked.length} banked lines · ${positives.length} positives · ${negatives.length} negatives (unique text)`);

// 2 — the calls.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Each item's `ms` is its SUCCESSFUL attempt only: backoff sleeps and refused attempts are not Jev
// latency, and over1500 is the figure that says how often the drawer's 1.5 s cap would fail open.
async function ask(state) {
  let retries = 0;
  for (const wait of [2000, 4000, 8000, null]) {
    const t0 = performance.now();
    try {
      const r = await askJev({ state, questions: QUESTIONS }, { timeoutMs: 10000 });
      return { r, ms: Math.round(performance.now() - t0), retries };
    } catch (e) {
      const status = e.message.match(/^jev: (\d{3}) /)?.[1];
      if (wait === null || (status !== "429" && status !== "529")) throw e;
      retries += 1;
      await sleep(wait);
    }
  }
}
const items = [];
for (const a of [...positives, ...negatives]) {
  const q = questionById(a.question_id);
  if (!q) throw new Error(`jev-guard-eval: ${a.package}/${a.ref} names question "${a.question_id}", which is not in the bank`);
  const { r, ms, retries } = await ask(stateFor({ question: q.text, answer: a.text }));
  items.push({ package: a.package, ref: a.ref, questionId: a.question_id, label: a.label, sha: sha256(a.text), answers: r.answers, usage: r.usage ?? null, ms, retries });
  process.stdout.write(".");
}
process.stdout.write("\n");

// 3 — the sweep and the rule.
const pos = items.filter((i) => i.label === "positive");
const neg = items.filter((i) => i.label === "negative");
const count = (rows, lookUp, aside, verdict) => rows.filter((i) => (verdict === "prompt" ? decide(i.answers, { lookUp, aside }) !== "answer" : decide(i.answers, { lookUp, aside }) === verdict)).length;
console.log("T     look_up recall   look_up false-prompt   aside false-prompt (aside alone)");
for (const t of GRID) {
  const asideAlone = neg.filter((i) => i.answers.aside.noul >= t).length;
  console.log(`${t.toFixed(2)}  ${count(pos, t, null, "look-up")}/${pos.length}              ${count(neg, t, null, "look-up")}/${neg.length}                  ${asideAlone}/${neg.length}`);
}
const lookUpCeil = Math.floor(neg.length * 0.02);
const promptCeil = Math.floor(neg.length * 0.03);
const recallAt = (t) => count(pos, t, null, "look-up");
const fpAt = (t) => count(neg, t, null, "look-up");
const maxRecall = Math.max(...GRID.map(recallAt));
const atMax = GRID.filter((t) => recallAt(t) === maxRecall).at(-1);
let lookUp = null;
let rule;
const minPos = Math.min(...pos.map((i) => i.answers.look_up.noul));
const maxNeg = Math.max(...neg.map((i) => i.answers.look_up.noul));
const mid = (minPos + maxNeg) / 2;
const nearest = GRID.reduce((best, t) => (Math.abs(t - mid) < Math.abs(best - mid) - 1e-9 ? t : best), GRID[0]);
if (minPos > maxNeg && recallAt(nearest) === maxRecall && fpAt(nearest) <= lookUpCeil) {
  lookUp = nearest;
  rule = `separated sets (highest negative ${maxNeg}, lowest positive ${minPos}): the grid T nearest the gap's midpoint ${mid.toFixed(3)}, recall ${recallAt(nearest)}/${pos.length}, false-prompt ${fpAt(nearest)}/${neg.length} ≤ ${lookUpCeil}`;
} else if (fpAt(atMax) <= lookUpCeil) {
  lookUp = atMax;
  rule = `highest T at the grid's maximum look_up recall (${maxRecall}/${pos.length}), false-prompt ${fpAt(atMax)}/${neg.length} ≤ ${lookUpCeil}`;
} else {
  lookUp = GRID.filter((t) => recallAt(t) >= 3 && fpAt(t) <= lookUpCeil).at(-1) ?? null;
  rule = `fallback: highest T with recall ≥ 3/${pos.length} and false-prompt ≤ ${lookUpCeil}/${neg.length} (at max recall ${maxRecall}, T ${atMax} false-prompted ${fpAt(atMax)})`;
}
if (lookUp === null) {
  console.error(`jev-guard-eval: no admissible look_up threshold — at max recall ${maxRecall}/${pos.length} (T ${atMax}) false-prompt is ${fpAt(atMax)}/${neg.length} > ${lookUpCeil}, and no T reaches recall ≥ 3 within that ceiling. Nothing written; this is the owner's decision (plan D3).`);
  process.exit(1);
}
const aside = GRID.find((t) => count(neg, lookUp, t, "prompt") <= promptCeil) ?? null;
rule += aside === null
  ? `; aside disabled (null): no grid T keeps the combined prompt count ≤ ${promptCeil}/${neg.length}`
  : `; aside = lowest T with combined prompt count ≤ ${promptCeil}/${neg.length}`;

// 4 — the file.
const sorted = items.map((i) => i.ms).sort((a, b) => a - b);
const pct = (p) => sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
const summary = {
  nPos: pos.length,
  nNeg: neg.length,
  lookUpRecall: count(pos, lookUp, aside, "look-up"),
  lookUpFalsePrompt: count(neg, lookUp, aside, "look-up"),
  promptRate: count(neg, lookUp, aside, "prompt"),
  asideFalsePrompt: count(neg, lookUp, aside, "aside"),
  latencyMs: { p50: pct(0.5), p95: pct(0.95), over1500: sorted.filter((m) => m > 1500).length },
};
writeFileSync(OUT, `${JSON.stringify({
  $description: "GENERATED by tooling/jev-guard-eval.mjs from real TypeSafe API responses — never edit; re-run instead",
  model: JEV_MODEL,
  ranAt: new Date().toISOString(),
  questionsSha: sha256(JSON.stringify(QUESTIONS)),
  items,
  threshold: { lookUp, aside, rule },
  summary,
}, null, 2)}\n`);
console.log(`rule: ${rule}`);
console.log(`summary: recall ${summary.lookUpRecall}/${summary.nPos} · look_up false-prompt ${summary.lookUpFalsePrompt}/${summary.nNeg} · combined prompt ${summary.promptRate}/${summary.nNeg} · aside false-prompt ${summary.asideFalsePrompt}/${summary.nNeg} · latency p50 ${summary.latencyMs.p50} ms, p95 ${summary.latencyMs.p95} ms, over 1500 ms ${summary.latencyMs.over1500}`);
console.log(`set T_LOOK_UP = ${lookUp} and T_ASIDE = ${aside} in portal/lib/discovery-guard.mjs`);
console.log(`jev-guard-eval ✓ wrote ${OUT.slice(ROOT.length + 1)}`);
