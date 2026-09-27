// portal/lib/import-suggest.mjs — hand-written canon (this repo; not generated). MACHINE SUGGESTIONS for
// the design-import nodes the matcher could not name (epic #295 ticket #455; .claude/plans/
// jev-import-suggestions-455.md). When import/recognise.mjs ends a node on `floor` ("not covered") or
// `structural-fallback` (a laid-out box it calls `stack`), the owner ratifying the import would read all
// the vocabulary entries by hand. This module asks Jev (TypeSafe's System One classifier, ./jev.mjs) one
// Choice question per such node — "which component is this a drawing of?" — and returns the top three
// ranked components with their probabilities, which import-run.mjs stores BESIDE the verdict in the
// record's `suggestions` field.
//
// THE MATCHER DECIDES, JEV NARROWS, THE OWNER RATIFIES. Eight invariants, each asserted by build-checks
// group 46, not assumed:
//
//   1. NEVER A VERDICT. Nothing here writes `mapping`, `recognition` or a verdict; the output is a
//      separate field, and picking a suggestion in the editor is an ordinary owner mapping edit.
//   2. THE TRIGGER IS CODE: only a verdict whose `via` is in SUGGEST_VIA is sent. A scored verdict never
//      is, and an import with no unnamed node makes no call at all.
//   3. TEXT ONLY, FILTERED STATE. Jev degrades on a large state full of irrelevant detail (ticket Design
//      2), so a node is sent as TEMPLATE.stateKeys and nothing else, empty fields omitted.
//   4. IT FAILS OPEN. Any failure — no key, a timeout, a 4xx/5xx, a model mismatch, a malformed answer —
//      returns `suggestions: []` with the reason; suggest() never throws, and the import never fails
//      because of Jev.
//   5. NO THRESHOLD (ticket A4). Eight labelled nodes cannot support one; #454's 164-item eval is the
//      precedent to follow once there are enough. The view shows raw probabilities, and a `none` top pick
//      reads "likely a new component" whatever its probability.
//   6. SDK- AND ZOD-FREE: imports ./jev.mjs and ../../import/ir.mjs only.
//   7. ONE NODE PER REQUEST, AT MOST MAX_IN_FLIGHT AT ONCE (plan D3). The criteria are sent per question
//      either way, so packing nodes into one request saves nothing and needs a calibrated batch size
//      against the size limit (a ≈ 55,580-token request was refused 400 max_tokens_exceeded; the largest
//      observed accepted is 38,875, discovery-screen.mjs). A failed wave stops the next: the result is
//      all or nothing, so later waves would be spent for nothing.
//      SMOKE, 2026-09-27 (`node tooling/import-suggest.mjs --smoke`, spike C's avatar disc): one node
//      is 7,092 input tokens observed against the 38,875 largest-accepted (the 1.7 chars/token estimate
//      said ≈ 16,757; the vocabulary's usage prose tokenises denser than option-heavy JSON); latency
//      454 ms, so SUGGEST_TIMEOUT_MS stays at 15 s (the rule: raise it to 5× the latency past 3 s).
//   8. ON FOR BOTH PROVENANCES (owner, 2026-09-27, Q1), and exactly this leaves the machine: layer
//      names, component and icon names, text content, child names and kinds, and the layout direction of
//      each unnamed node. Never ids, positions, colours, sizes, drops or the source file.
import { askJev } from "./jev.mjs";
import { walk } from "../../import/ir.mjs";

export const SUGGEST_VIA = Object.freeze(["floor", "structural-fallback"]);
export const SUGGEST_PROVENANCES = Object.freeze(["fictional", "real"]);   // Q1, owner 2026-09-27
export const NONE = "none";
export const TEMPLATE = Object.freeze({
  question: "Which component of this design system is `node` a drawing of?",
  none: "a part this vocabulary does not have",
  stateKeys: Object.freeze(["kind", "layer", "component", "icon", "texts", "children", "dir"]),
});
export const SUGGEST_TIMEOUT_MS = 15000;   // per request; ~0.5–1.5 s expected (#453: 490 ms per 12k tokens)
export const MAX_IN_FLIGHT = 4;            // requests at once; worst case 15 nodes = 4 waves ≤ 60 s under the lock
export const MAX_TEXTS = 5, MAX_TEXT_CHARS = 80;

const bad = (msg) => { throw new Error(`import-suggest: ${msg}`); };
const unit = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

// Pre-order, the order recognise() built the tree in.
export function unnamedPaths(verdict) {
  const out = [];
  const go = (v) => { if (v?.kind && SUGGEST_VIA.includes(v.via)) out.push(v.path); (v?.children ?? []).forEach(go); };
  go(verdict);
  return out;
}

const empty = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export function nodeState(n) {
  const texts = [];
  walk(n, (d) => { if (typeof d.text?.content === "string" && d.text.content && texts.length < MAX_TEXTS) texts.push(d.text.content.slice(0, MAX_TEXT_CHARS)); });
  const children = (n.children ?? []).filter((c) => c.kind).map((c) => [c.kind, c.name].filter(Boolean).join(" ")).join(", ");
  const all = { kind: n.kind, layer: n.name, component: n.component?.name, icon: n.icon?.name, texts, children, dir: n.layout?.dir };
  return Object.fromEntries(TEMPLATE.stateKeys.filter((k) => !empty(all[k])).map((k) => [k, all[k]]));
}

// `stack` stays in (ticket Design 3): this is a ranking for a human, not a verdict.
export function criteriaFrom(vocab) {
  const slugs = Object.keys(vocab?.components ?? {});
  if (slugs.length === 0) bad("the vocabulary has no components — there is nothing to rank");
  if (slugs.includes(NONE)) bad(`the vocabulary has a component named "${NONE}", which is the option for a part it does not have`);
  return { ...Object.fromEntries(slugs.map((s) => [s, vocab.components[s].usage ?? null])), [NONE]: TEMPLATE.none };
}

// The node's data rides in its OWN question's instructions; the request's `state` is a constant stub
// (plan D1, TypeSafe's "how to build" potential_duplicate pattern).
export function questionsFor(ir, verdict, vocab) {
  const byPath = new Map();
  walk(ir, (n, p) => byPath.set(p, n));
  const criteria = criteriaFrom(vocab);
  const questions = {}, paths = {};
  unnamedPaths(verdict).forEach((p, i) => {
    const node = byPath.get(p);
    if (!node) bad(`verdict path ${p} is not a node of the IR`);
    questions[`n${i}`] = { type: "choice", instructions: { question: TEMPLATE.question, node: nodeState(node) }, criteria };
    paths[`n${i}`] = p;
  });
  return { questions, paths };
}

// A missing option reads as absent, so a later vocabulary addition does not red a committed run.
export function parseAnswer(answer, options, at = "answer") {
  if (answer?.type !== "choice") bad(`${at}.type is ${JSON.stringify(answer?.type)}, not "choice"`);
  const probs = answer.probabilities;
  if (!probs || typeof probs !== "object" || Array.isArray(probs)) bad(`${at}.probabilities is not an object`);
  for (const [k, v] of Object.entries(probs)) {
    if (!options.includes(k)) bad(`${at}.probabilities.${k} is not an option sent`);
    if (!unit(v)) bad(`${at}.probabilities.${k} is ${v}, not a number in [0, 1]`);
  }
  if (!unit(answer.confidence)) bad(`${at}.confidence is ${answer.confidence}, not a number in [0, 1]`);
  const top = Object.entries(probs)
    .sort(([a, pa], [b, pb]) => (pb - pa) || (options.indexOf(a) - options.indexOf(b)))
    .slice(0, 3)
    .map(([slug, p]) => ({ slug, p: Math.round(p * 1e4) / 1e4 }));
  return { top, confidence: answer.confidence };
}

export async function suggest({ ir, verdict, vocab }, { ask = askJev, now = () => new Date().toISOString(), inFlight = MAX_IN_FLIGHT } = {}) {
  let calls = 0;
  try {
    const { questions, paths } = questionsFor(ir, verdict, vocab);
    const ids = Object.keys(questions);
    if (ids.length === 0) return { suggestions: [], ran: false, reason: "no unnamed node", requests: 0, usage: null };
    if (!Number.isInteger(inFlight) || inFlight < 1) bad(`inFlight is ${inFlight}, not a positive integer`);
    const options = Object.keys(questions[ids[0]].criteria);
    const bodies = [];
    for (let i = 0; i < ids.length; i += inFlight) {
      // async, so an ask that throws synchronously still counts as a call and the wave still starts whole.
      bodies.push(...await Promise.all(ids.slice(i, i + inFlight).map(async (id) => {
        calls += 1;
        return ask({ state: { task: "design import" }, questions: { [id]: questions[id] } }, { timeoutMs: SUGGEST_TIMEOUT_MS });
      })));
    }
    const usage = { input_tokens: 0, output_tokens: 0 };
    const suggestions = ids.map((id, i) => {
      const body = bodies[i];
      for (const k of Object.keys(usage)) usage[k] += Number.isFinite(body?.usage?.[k]) ? body.usage[k] : 0;
      return { path: paths[id], ...parseAnswer(body?.answers?.[id], options, `answers.${id}`), model: body.model, ts: now() };
    });
    return { suggestions, ran: true, reason: null, requests: ids.length, usage };
  } catch (e) {
    return { suggestions: [], ran: false, reason: e.message, requests: calls, usage: null };
  }
}
