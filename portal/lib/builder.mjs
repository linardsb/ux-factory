// portal/lib/builder.mjs — the operator path: /build's ten answers brief a real composition run
// (epic #134 ticket #140, absorbing epic #86's floor path;
// .claude/plans/build-operator-path-portal-drawer.md).
//
// /build's ten questions already do one job: in a visitor's browser, system/pattern-rules.mjs names
// a UI pattern from them and renders it. This module gives the SAME ten answers a second, build-time
// job — they draft the QUESTION a real Agent SDK run answers about a scenario's own data, and that
// run's committed composition ships into the private-instance prototype slot. Same answers, same
// vocabulary, same renderer; one path runs committed rules in a browser, the other briefs a real
// agent at build time.
//
// THREE RULES draft the question, and they are countable on purpose:
//   1. the `shape` answer NAMES the question   (SHAPE_QUESTION)
//   2. the `action` answer names WHO it is for (ACTION_STANCE, one appended clause)
//   3. the OTHER EIGHT answers enter no prompt (QUESTION_INPUTS says which two do)
// Rule 3 is the one the surface has to keep honest, so tooling/build-checks.mjs group 8 changes
// each of the other eight, one at a time, and asserts the drafted question is byte-identical.
//
// TWO THINGS THIS MODULE DOES NOT DO.
//   • It does not change the prompt. portal/record-composition.mjs's header claim — "the prompt is
//     built ONLY from the vocabulary + the scenario's declared fixtures + the question + the slot
//     bounds + the scenario's DEFINITIONS-ONLY computeRules" — stays byte-true, because the answers
//     reach the agent only as the question TEXT. Appending them as a behaviour-model block is the
//     tempting design and it is the one that would make that sentence false.
//   • It does not write a scenario's compose.json. computeRules is the honesty firewall; drafting it
//     from brief prose is exactly the mechanism that would launder "which metrics answer this" into
//     the prompt. loadComposeConfig's refusal is surfaced verbatim instead, and the format is
//     documented in scenarios/README.md.
//
// NOTHING IN THIS MODULE'S GRAPH REACHES @anthropic-ai/claude-agent-sdk, and that is structural
// rather than incidental. tooling/build-checks.mjs imports this file to gate the rules, and it runs
// in CI where portal/node_modules does not exist — so a static SDK import anywhere here would take
// the gate down with it. record-composition.mjs loads the SDK lazily inside runComposition (see its
// import block), which is what lets both of its exports be imported plainly below. The invariant is
// therefore ONE sentence, and CI's absence of portal deps is what proves it: the SDK loads only when
// a run actually starts, after every guard in runBuild has already passed.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  frequencyVerdictFor, QUADRANT_MEANINGS, quadrantFor, QUESTIONS, SUMMARY_TERM,
} from '../../system/build-questions.mjs';
import { loadComposeConfig, runComposition } from '../record-composition.mjs';
import { REPO_DIR } from './env.mjs';

const bad = (msg) => { throw new Error(`builder: ${msg}`); };

// --- rule 1 ---------------------------------------------------------------------------------------
// The `shape` answer names the question. The SAME answer that names the pattern in the browser
// (pattern-rules.mjs rule 1) names the question here — that symmetry is the claim this ticket earns.
// `s` is the scenario's own `subject` string from its compose.json, interpolated so the question is
// self-contained: it is stored in the manifest and rendered as the view's title on the instance,
// where "What has changed most recently?" with no subject would be a question about nothing.
export const SHAPE_QUESTION = Object.freeze({
  overview: (s) => `What is the overall state of ${s} right now?`,
  worklist: (s) => `Which items in ${s} need attention first, and where does each one stand?`,
  stream: (s) => `What has changed most recently in ${s}, and what does it mean?`,
  steps: (s) => `Where does the work in ${s} stand, from first step to finished?`,
});

// --- rule 2 ---------------------------------------------------------------------------------------
// The `action` answer names who it is answered for, as one appended clause. Hooked's action is the
// simplest behaviour someone does when the trigger hits; here it decides whose reading the composed
// view has to serve, which is a real constraint on what the agent puts in the slot.
export const ACTION_STANCE = Object.freeze({
  check: 'needs to see where things stand',
  capture: 'is about to add something of their own',
  find: 'is looking for one specific thing',
  respond: 'has to answer someone',
});

// --- rule 3 ---------------------------------------------------------------------------------------
// The other eight answers enter no prompt. They are the ethics record shown beside the run (the
// Manipulation Matrix quadrant + the frequency gate) and the operator's own reading of the product.
// Naming which two are load-bearing is the point: a surface implying all ten reached the agent would
// be the kind of sentence #139 deleted rather than let stand.
export const QUESTION_INPUTS = Object.freeze(['shape', 'action']);

// Draft the question from the two load-bearing answers. Throws naming the answer AND its value,
// because a `shape` option added to build-questions.mjs without a rule here is a config the rules
// have not caught up with — the same loud failure a new PATTERNS entry gets in build-checks.
export function draftQuestion(answers, subject) {
  if (!answers || typeof answers !== 'object') bad('draftQuestion needs an answers object');
  if (typeof subject !== 'string' || !subject.trim()) bad('draftQuestion needs the scenario\'s subject string');
  const shape = answers.shape;
  const action = answers.action;
  if (!Object.hasOwn(SHAPE_QUESTION, shape)) bad(`rule 1 has no question for shape "${shape}" (${Object.keys(SHAPE_QUESTION).join(' | ')})`);
  if (!Object.hasOwn(ACTION_STANCE, action)) bad(`rule 2 has no stance for action "${action}" (${Object.keys(ACTION_STANCE).join(' | ')})`);
  return `${SHAPE_QUESTION[shape](subject)} Answer it for someone who ${ACTION_STANCE[action]}.`;
}

// --- the answer set -------------------------------------------------------------------------------
// Built with a null-prototype lookup so "__proto__" is an ordinary unknown key rather than a hole.
const BY_ID = Object.assign(Object.create(null), Object.fromEntries(QUESTIONS.map((q) => [q.id, q])));
const IDS = QUESTIONS.map((q) => q.id);

// Returns a frozen, normalised answer set, or throws naming the offender. An UNKNOWN key is refused
// rather than ignored: it means the caller and system/build-questions.mjs disagree about what the
// ten questions are, and quietly dropping it would let the two drift apart unnoticed.
export function validateAnswers(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) bad(`answers must be an object of the ten question ids (${IDS.join(' | ')})`);
  for (const key of Object.keys(raw)) {
    if (!Object.hasOwn(BY_ID, key)) bad(`"${key}" is not one of the ten questions (${IDS.join(' | ')})`);
  }
  const out = Object.create(null);
  for (const q of QUESTIONS) {
    if (!Object.hasOwn(raw, q.id)) bad(`"${q.id}" is missing — every one of the ten questions needs an answer`);
    const value = raw[q.id];
    if (!q.options.some((o) => o.value === value)) {
      bad(`"${q.id}" answer ${JSON.stringify(value)} is not one of its options (${q.options.map((o) => o.value).join(' | ')})`);
    }
    out[q.id] = value;
  }
  return Object.freeze(out);
}

// --- the contract guards --------------------------------------------------------------------------
// Both values reach a filesystem path — loadComposeConfig builds scenarios/<scenario>/, and the
// runner builds traces/<slug>.raw.jsonl — and since #140 both arrive from an HTTP body, so be exact
// about what that body is. Binding 127.0.0.1 stops a REMOTE client; it does nothing about a page
// open in the operator's own browser, which can POST here cross-origin (no preflight — readBody
// JSON.parses regardless of content-type). So these are contract guards AND the route's parameter
// whitelist is load-bearing: runOptions below is why no HTTP body can reach the runner's
// destructive `force` path. (The remaining, non-destructive half of that gap — a cross-origin POST
// can still START a token-spending run on a fresh slug — is #157, and it is a portal-wide fix.)
// Framed the way agent-layer/build-instance.mjs:184 frames compositionRef.
// Each is an exported named function so tooling/build-checks.mjs can call it: a guard reachable only
// by starting a real agent run is a guard nobody tests.
const SCENARIO_RE = /^[a-z0-9-]{1,40}$/;
const RUN_SLUG_RE = /^[a-z0-9-]{1,48}$/;

export function assertScenarioSlug(scenario) {
  if (typeof scenario !== 'string' || !SCENARIO_RE.test(scenario))
    bad(`"${scenario ?? ''}" is not a usable scenario name — lowercase letters, digits and hyphens only, 1–40 characters (it names scenarios/<scenario>/)`);
  return scenario;
}

// The same check runComposition re-applies internally. Here it is for the earlier, better message —
// figma.mjs sets the precedent (assertSlug fires in receiveExport AND again in runFigmaPull).
export function assertRunSlug(slug) {
  if (typeof slug !== 'string' || !RUN_SLUG_RE.test(slug))
    bad(`"${slug ?? ''}" is not a usable run slug — lowercase letters, digits and hyphens only, 1–48 characters (it names traces/<slug>.raw.jsonl and the proposal file)`);
  return slug;
}

// --- the privacy refusal --------------------------------------------------------------------------
// Its own exported function so the gate can call it with an in-memory head and no fake package is
// ever written to disk. It demands `=== true`, so a head with the key MISSING refuses too — the
// posture agent-layer/lib.mjs:160 takes, that provenance is explicit or it is not provenance.
export function assertFictional(head, slug) {
  if (head && head.fictional === true) return head;
  throw new Error(`builder: "${slug}" is a real-provenance package (fictional: ` +
    `${JSON.stringify(head?.fictional)}) — real employer material is never composed inside ` +
    `this public repo, because every run path in portal/record-composition.mjs writes under ` +
    `the repo (proto/compositions/, traces/). See scenarios/README.md §Provenance; compile ` +
    `and compose it out of repo instead.`);
}

// A local five-line read of brief.md's json head, and deliberately NOT agent-layer/lib.mjs's
// parseCompanyBrief: that one hard-requires axes, intake, screens and copy (lib.mjs:174-199), and
// every committed scenario brief carries only {slug, name, fictional, domain, oneLiner, today} —
// so it throws on all three of them.
function readBriefHead(scenario) {
  const rel = `scenarios/${scenario}/brief.md`;
  const file = path.join(REPO_DIR, 'scenarios', scenario, 'brief.md');
  if (!existsSync(file)) bad(`${rel} does not exist — a scenario package needs a brief (scenarios/README.md §Package layout)`);
  const m = readFileSync(file, 'utf8').match(/```json\n([\s\S]*?)```/);
  if (!m) bad(`${rel} has no \`\`\`json head — the provenance flags live in it (scenarios/README.md §brief.md)`);
  try { return JSON.parse(m[1]); }
  catch (e) { bad(`${rel}: the json head is not valid JSON — ${e.message}`); }
}

// --- the scenario ---------------------------------------------------------------------------------
// Everything the drawer needs about one package, or a throw naming what is wrong with it. The
// compose.json half comes from the runner's OWN loadComposeConfig, imported rather than re-parsed,
// so the drawer and the run can never disagree about whether a package is composable — and the
// refusal an operator meets is the runner's own well-worded one, which is the only spec for
// compose.json they get at that moment.
export function readScenario(scenario) {
  assertScenarioSlug(scenario);
  const head = readBriefHead(scenario);
  assertFictional(head, scenario);
  const config = loadComposeConfig(scenario);
  return {
    slug: scenario,
    name: head.name || scenario,
    subject: config.subject,
    today: config.today,
    slots: config.slots,
    questions: config.questions,
    fixtures: config.fixtures,
  };
}

// Every scenario package, composable or not — a package that throws is listed WITH its refusal
// message rather than silently dropped, because "why can't I use verdant?" is a question the drawer
// has to answer on the spot, and verdant (no compose.json) is the case that proves it.
export function listScenarios() {
  const dir = path.join(REPO_DIR, 'scenarios');
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(dir, e.name, 'brief.md')))
    .map((e) => e.name)
    .sort()
    .map((slug) => {
      let name = slug;
      try { name = readBriefHead(slug).name || slug; } catch { /* the refusal below names the reason */ }
      try {
        readScenario(slug);
        return { slug, name, composable: true, reason: null };
      } catch (err) {
        return { slug, name, composable: false, reason: err.message };
      }
    });
}

// --- the run slug ---------------------------------------------------------------------------------
// SCENARIO-PREFIXED, and that is the whole point: the drafted question is deterministic from ten
// enum answers, so two scenarios sharing a `shape` produce byte-identical question text →
// identical slugify() output → a collision in the FLAT traces/ namespace. The prefix plus the
// runner's no-`--force` default turns a silent overwrite into a loud throw. Normalised the same way
// slugify() normalises, because a slot name is a free per-scenario string and a scenario that named
// one "Summary Strip" would otherwise produce a slug no path guard accepts.
export function slugFor(scenario, answers, slot) {
  const raw = `${scenario}-${answers?.shape ?? ''}-${slot ?? ''}`;
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
    .replace(/-+$/, '') || 'composition';
}

// --- the concurrency answer -----------------------------------------------------------------------
// upsertIndex (record-composition.mjs:307-318) is read-modify-write on the scenario manifest, and
// dropShipped/rmSync delete from traces/ unsequenced. One terminal made that safe by construction; a
// clickable button does not. Two near-simultaneous runs silently lose a manifest entry, so the
// second caller is REFUSED rather than queued — a queued run would spend real tokens the operator
// did not knowingly ask for twice.
//
// Exported rather than an inline boolean inside runBuild, and that is the design decision: an
// inline flag is unreachable from tooling/build-checks.mjs, which cannot import the SDK, so the
// guard would ship unproven.
let inFlight = false;

export async function withRunLock(fn) {
  if (inFlight) bad('a composition run is already in flight — wait for it to finish (both runs would read-modify-write the same manifest)');
  inFlight = true;
  try { return await fn(); } finally { inFlight = false; }
}

export const isRunInFlight = () => inFlight;

// --- the SSE projection ---------------------------------------------------------------------------
// recordRun's write() fires for THREE line types: the meta line first, then every step, then the
// result. Only steps are progress. The meta line carries `cwd` (an absolute home-dir path) and
// `sessionId`, and the drawer needs neither — so this returns null for anything that is not a step
// and the caller skips the send.
//
// A step line can carry a 4000-char tool_response (RESPONSE_CAP) plus a full tool input. The drawer
// shows PROGRESS; traces/<slug>.jsonl is the record. WHITELIST, never blacklist — a field added to
// the recorder later must not start streaming by default.
//
// A pure exported function so server.mjs holds no shape opinion of its own: a projection written
// inline in the route is one the gate cannot reach, and it would drift from the one the gate checks.
export const STEP_EVENT_TEXT_MAX = 400;

export function stepEvent(line) {
  if (!line || line.type !== 'step') return null;
  return {
    type: 'step',
    phase: line.phase ?? null,
    kind: line.kind ?? null,
    tool: line.tool ?? null,
    ok: line.ok ?? null,
    denied: line.denied ?? false,
    artifact: line.artifact?.path ?? null,
    text: typeof line.text === 'string' ? line.text.slice(0, STEP_EVENT_TEXT_MAX) : null,
  };
}

// --- the drawer's two entry points ------------------------------------------------------------------

// The preview: pure, instant, and spends nothing. `slot` defaults to the scenario's first declared
// slot — operator-chosen, never derived from an answer, because slot names are free per-scenario
// strings and a shape → slot-name map would break on the first scenario that names its slots
// differently.
export function draftRun({ scenario, answers, slot }) {
  assertScenarioSlug(scenario);
  const config = readScenario(scenario);
  const checked = validateAnswers(answers);
  const slots = Object.keys(config.slots);
  const chosen = slot ?? slots[0];
  if (!Object.hasOwn(config.slots, chosen)) bad(`slot must be one of: ${slots.join(' | ')} (got "${chosen}")`);
  const question = draftQuestion(checked, config.subject);
  return {
    question,
    slot: chosen,
    bounds: config.slots[chosen],
    slots,
    subject: config.subject,
    today: config.today,
    fixtures: config.fixtures,
    defaultSlug: slugFor(scenario, checked, chosen),
    inputs: [...QUESTION_INPUTS],
    // Shown beside the run, never blocking it: a dealer quadrant or a failed frequency filter is the
    // operator's own reading of the employer's product, and refusing to run on it would be theatre.
    verdict: {
      quadrant: quadrantFor(checked),
      meaning: QUADRANT_MEANINGS[quadrantFor(checked)],
      frequency: frequencyVerdictFor(checked),
      summary: QUESTIONS.map((q) => ({
        id: q.id,
        term: SUMMARY_TERM[q.id],
        value: q.options.find((o) => o.value === checked[q.id]).short,
      })),
    },
  };
}

// Every guard, plus the exact parameter object runComposition is handed (minus onStep, which is a
// hook rather than data). Split out of runBuild and exported for the same reason withRunLock and
// stepEvent are: a rule that lives inline inside runBuild is one tooling/build-checks.mjs cannot
// reach, because reaching it means starting a real agent run.
//
// `force` IS NOT A PARAMETER, and its absence is the security boundary. runComposition's `force`
// skips the "traces/<slug>.raw.jsonl exists" throw, and past that throw the runner rmSync's the
// committed proposal and recordRun truncates the committed raw trace to zero bytes — before the SDK
// query, so it lands even if the run then dies on auth. Destructuring it here would make an HTTP
// body the only thing standing between a page in the operator's browser and a committed honesty
// artifact. The CLI keeps its --force: record-composition.mjs:496 calls runComposition directly.
export function runOptions({ scenario, answers, question, slot, slug, dry }) {
  assertScenarioSlug(scenario);
  const config = readScenario(scenario);   // ← the fictional:false + no-compose.json refusals
  validateAnswers(answers);                // the answers are the run's record
  if (!Object.hasOwn(config.slots, slot)) bad(`slot must be one of: ${Object.keys(config.slots).join(' | ')} (got "${slot}")`);
  assertRunSlug(slug);
  if (typeof question !== 'string' || !question.trim()) bad('a question is required');
  return { scenario, question, slot, slug, isDry: Boolean(dry), force: false };
}

// The run. It re-runs EVERY guard itself, because /api/build/run is a separate route from
// /api/build/draft and a POST can reach it having never touched the preview. The question is passed
// through AS GIVEN, so an operator's edit is honoured verbatim — the breadboard's "drafted then
// editable" contract, and the check the rules cannot perform (they cannot know whether a drafted
// question is answerable from a given scenario's fixtures).
export async function runBuild({ scenario, answers, question, slot, slug, dry, onStep }) {
  const options = runOptions({ scenario, answers, question, slot, slug, dry });
  return withRunLock(() => runComposition({ ...options, onStep }));
}
