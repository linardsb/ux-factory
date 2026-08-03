// system/build-questions.mjs — Acts 1 and 2 of the pattern builder: the visitor describes their
// own product through the two methods this portfolio works by (epic #134, ticket #136;
// .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.3, .claude/plans/build-questions-breadboard.md).
//
// Ten questions across two acts: seven from Hooked, three from Shaping. The flow shipped at eight
// first (the ticket's enumeration was 6 + 2 while its prose said ten); the owner called it the
// other way, so Act 1 gained the frequency filter and Act 2 gained no-gos. Both are canon the repo
// already carries rather than invented filler, and both are CONSUMED: the frequency answer drives
// the second ethics gate in the verdict panel, and the no-go subtracts a place in breadboard.mjs.
//
// One thing this module deliberately does NOT do: run the guess-then-reveal.
// system/factory-intake.mjs puts the reader's Manipulation-Matrix placement beside THE MAKER's
// authored verdict, which works because Verdant and Fieldwork have an author. Here the product is
// the visitor's own, so there is no second judgment to sit beside theirs. The ethics pair is two
// ordinary questions in the flow and the quadrant renders as a verdict. Mirroring renderEthics
// would ship a compare device with an empty right-hand column.
//
// Both ethics gates read RULESET directly, the way system/derive.mjs:126-141 computes them, so this
// page and the intake wizard can never disagree about a verdict.
//
// This module also owns the BUILD_CHANGE store the whole page publishes into (see below). That is
// twenty-five lines shared by three consumers, which does not earn a file of its own under this
// repo's simplicity rule; if it grows, system/build-state.mjs is the shape to extract.
//
// Node-import-safe: DOM references live inside function bodies, and the mount self-boots behind a
// `typeof document` guard at the very bottom.

import { RULESET } from "./derive.rules.mjs";
import { morph } from "./morph.mjs";

// --- the BUILD_CHANGE contract ---------------------------------------------------------------
// One event on `document`, one state object, published by both acts. Naming and dispatch follow
// pack-derived.mjs's BRAND_CHANGE_EVENT. The payload is the FULL state every time, not a delta, so
// a consumer that mounts late (or re-mounts) never has to reconstruct history:
//
//   { source: "questions" | "breadboard" | "import" | "restore",
//     answers: { trigger, action, rewardType, investment, frequency, improvesLives, wouldUseIt,
//                appetite, shape, nogos },
//     quadrant: "facilitator" | "peddler" | "entertainer" | "dealer",
//     frequencyVerdict: { passes, verdict },
//     board: { places: [{ id, label, affordances: [{ id, label }] }], connections: [[affId, placeId]] },
//     boardIsEdited: boolean,
//     pack: { slug, label, fileName, tokens, note } | null }
//
// Every field is populated from the moment this module loads — the store is seeded with the default
// answers below rather than starting at null — so a consumer never reads a drafted board beside a
// null quadrant, whichever mounts are on the page.
//
// THREE write paths, and they are not interchangeable: `setAnswers` owns `answers`, `publishBuild`
// owns everything else and REFUSES an answers patch, `restoreBuild` writes ALL of it exactly once
// from a payload the share codec already validated. Answers have a module-scope object behind them
// that both wizards and the verdict panel render from, so a patch that set `state.answers` without
// going through it would show on the breadboard and nowhere else. A fourth path would be the smell.
//
// `pack` is what Act 0 imported, and it is here because the share codec is the consumer that
// needed it: an imported export cannot be re-run from a URL (the file is not in it), so the token
// VALUES have to travel. system/build-import.mjs publishes the record it already builds; nothing
// is stored anywhere (build-import.mjs:16-21 argues why), and every value is re-vetted at the one
// point it reaches the DOM.
export const BUILD_CHANGE = "factory:build-change";

// Every answer is a STRING, including the two ethics booleans ("yes"/"no"). One type for the whole
// answer set keeps the later share-link validation uniform: one enum check per field, no special
// case. bool() below is the only place the strings become booleans.
const state = {
  source: null,
  answers: null,
  quadrant: null,
  frequencyVerdict: null,
  board: null,
  boardIsEdited: false,
  pack: null,
};

const bool = (v) => v === "yes";

// The quadrant is always recomputed from the current answers rather than stored by a caller, so no
// publisher can put a quadrant into the state that its own answers do not produce.
export function quadrantFor(answers) {
  return RULESET.ethics.matrix[bool(answers.improvesLives)][bool(answers.wouldUseIt)];
}

// The Hooked frequency filter, computed exactly as system/derive.mjs:126,136 computes it: habit
// design is only legitimate for a behaviour frequent enough to become a habit, and below that the
// honest verdict is a utility. Returned as {passes, verdict} so the panel can show the gate's own
// sentence verbatim rather than a paraphrase of it.
export function frequencyVerdictFor(answers) {
  const passes = Boolean(RULESET.ethics.frequencyFilter[answers.frequency]);
  return { passes, verdict: RULESET.ethics.verdicts[passes ? "pass" : "fail"] };
}

export function readBuild() {
  return structuredClone(state);
}

function publishState(patch) {
  Object.assign(state, patch);
  if (state.answers) {
    state.quadrant = quadrantFor(state.answers);
    state.frequencyVerdict = frequencyVerdictFor(state.answers);
  }
  document.dispatchEvent(new CustomEvent(BUILD_CHANGE, { detail: readBuild() }));
}

// The public publish, for everything that is not an answer (today: the board and its edited flag).
// The refusal is the point: assigning answers here would move the store without moving the object
// the wizards and the verdict panel actually render from, and the page would disagree with itself.
export function publishBuild(patch) {
  if (patch && "answers" in patch) {
    throw new Error("build-questions: answers are written through setAnswers(), never publishBuild()");
  }
  publishState(patch);
}

// --- the questions -----------------------------------------------------------------------------
// act · id · prompt · options {value,label,short} · default · reasoning. Every question carries a
// recommended default AND the one line of reasoning behind it, so the whole flow can be accepted
// and advanced in seconds (factory-intake.mjs's `reasoning` field is the pattern).
//
// Method fidelity, verified against the primary sources and this repo's own grounding doc
// (__UX_UI_Research.md §Layer A / §Layer B, which system/derive.rules.mjs:8 also cites):
//   internal trigger — an emotion or situation stored in memory that cues the behaviour on its own,
//     as against an external cue in the environment.
//   action — the simplest behaviour done in anticipation of a reward; the lever is ability, not
//     motivation (BJ Fogg's behaviour model: motivation, ability, prompt).
//   variable reward — tribe (social) · hunt (resources or information) · self (mastery). Values
//     below come from RULESET.patterns, so this wizard can never offer one the engine rejects.
//   investment — a bit of work the user puts in that makes the product better for them and loads
//     the next trigger.
//   appetite — "the amount of time we want to spend on a project, as opposed to an estimate"
//     (Shape Up, Ryan Singer / Basecamp, basecamp.com/shapeup/1.2-chapter-03). Small batch is one
//     designer and one or two programmers for one or two weeks; big batch is the same size team
//     for a full six week cycle.
//   frequency — the Hooked frequency filter: habit design is only legitimate for a behaviour
//     frequent enough to become a habit, which the method puts at weekly or better. Values come
//     from RULESET.ethics.frequencyFilter, the gate's own key set.
//   no-gos — "things you explicitly declare out of scope in writing" (Shape Up). Scope by
//     subtraction, which is why the answer REMOVES a place in breadboard.mjs rather than adding one.
// Only trigger, action, investment, appetite, shape and no-gos are this page's own enums. The
// reward type and the frequency set belong to the ruleset, and the ethics pair belongs to the
// Manipulation Matrix.

// The two acts, each its own section on the page and its own stepped wizard over a SHARED answer
// set. `done` is what the last step of that act offers instead of a dead disabled button.
export const ACTS = Object.freeze({
  hooked: { label: "Act 1 · Hooked", done: "Go to shaping", target: "act-shape" },
  shaping: { label: "Act 2 · Shaping", done: "See the breadboard", target: "act-breadboard" },
});

const REWARD_LABELS = {
  self: { label: "Their own progress, made visible", short: "own progress" },
  tribe: { label: "Other people: replies, credit, a community", short: "other people" },
  hunt: { label: "Something found: results, information, a match", short: "something found" },
};

// The frequency set is the ruleset's too (RULESET.ethics.frequencyFilter is the gate's own key
// set), so the same rule applies: values from the ruleset, labels local. Labels match
// factory-intake.mjs:145 word for word — a reader who meets both wizards should not be asked the
// same question in two different voices.
const FREQUENCY_LABELS = {
  "multiple-daily": { label: "Several times a day", short: "several times a day" },
  daily: { label: "About daily", short: "about daily" },
  weekly: { label: "Weekly", short: "weekly" },
  monthly: { label: "Monthly", short: "monthly" },
  rarely: { label: "Rarely", short: "rarely" },
};

export const QUESTIONS = Object.freeze([
  {
    act: "hooked",
    id: "trigger",
    prompt: "What feeling brings someone back to your product?",
    reasoning: "Most products start with an external cue like a notification. The ones that last attach to a feeling the person already has. Name the feeling, not the notification.",
    default: "unsure",
    options: [
      { value: "unsure", label: "Unsure where things stand", short: "unsure where things stand" },
      { value: "anxious", label: "Anxious about missing something", short: "anxious about missing something" },
      { value: "stuck", label: "Stuck without an answer", short: "stuck without an answer" },
      { value: "restless", label: "Restless, with a minute to fill", short: "restless" },
    ],
  },
  {
    act: "hooked",
    id: "action",
    prompt: "What is the smallest thing they do when that feeling hits?",
    reasoning: "The lever here is ability, not motivation. Name the simplest behaviour and the design's job becomes making it easier, rather than pushing harder.",
    default: "check",
    options: [
      { value: "check", label: "Check the state of something", short: "check the state of something" },
      { value: "capture", label: "Add something of their own", short: "add something of their own" },
      { value: "find", label: "Search for something", short: "search for something" },
      { value: "respond", label: "Reply to someone", short: "reply to someone" },
    ],
  },
  {
    act: "hooked",
    id: "rewardType",
    prompt: "What do they get back, and why does it keep varying?",
    reasoning: "A reward that is always the same stops pulling. Naming which of the three kinds it is tells you what the screen has to be good at.",
    // Values from the ruleset, labels local — factory-intake.mjs:132-146's rule, so a ruleset edit
    // that renames or drops a reward type breaks loudly at load rather than quietly on stage.
    default: "self",
    options: Object.keys(RULESET.patterns).map((value) => ({ value, ...REWARD_LABELS[value] })),
  },
  {
    act: "hooked",
    id: "investment",
    prompt: "What do they put in that makes it better next time?",
    reasoning: "A bit of the user's own work, stored in the product, loads the next trigger. It is what separates a tool people try once from one they stay in.",
    default: "data",
    options: [
      { value: "data", label: "They tune it: filters, rules, preferences", short: "tuning it" },
      { value: "content", label: "They add their own material", short: "their own material" },
      { value: "social", label: "They connect to other people", short: "connections to people" },
      { value: "track-record", label: "They build up a history worth keeping", short: "a history worth keeping" },
    ],
  },
  {
    act: "hooked",
    id: "frequency",
    prompt: "How often would someone realistically do the core thing?",
    reasoning: "The method's own gate: habit design is only legitimate for a behaviour frequent enough to become a habit, which it puts at weekly or better. Answer for the behaviour, not for how often you would like them to visit.",
    // Values from the ruleset's own filter and labels local, exactly as rewardType above — the
    // direction matters in BOTH senses (#144 finding 9). This question can never offer a frequency
    // the gate has no ruling for, AND a frequency the gate rules on can never go quietly unoffered:
    // a new key with no FREQUENCY_LABELS entry has no label, so the assert below throws at load.
    // The old form filtered a hardcoded list against the ruleset, which guarded only the first.
    default: "daily",
    options: Object.keys(RULESET.ethics.frequencyFilter).map((value) => ({ value, ...FREQUENCY_LABELS[value] })),
  },
  {
    act: "hooked",
    id: "improvesLives",
    prompt: "Does this materially improve the user's life?",
    reasoning: "The first of the two ethics questions. Answer it about the product you would actually ship, not the one in the pitch.",
    default: "yes",
    options: [
      { value: "yes", label: "Yes, measurably", short: "yes, measurably" },
      { value: "no", label: "No, it mostly passes the time", short: "no, it passes the time" },
    ],
  },
  {
    act: "hooked",
    id: "wouldUseIt",
    prompt: "Would you use it yourself?",
    reasoning: "The second ethics question, and the harder one. A no here is not a failure. It is the signal the matrix exists to give you.",
    default: "yes",
    options: [
      { value: "yes", label: "Yes", short: "yes" },
      { value: "no", label: "No", short: "no" },
    ],
  },
  {
    act: "shaping",
    id: "appetite",
    prompt: "How much time is this worth?",
    reasoning: "Appetite is a budget, not an estimate. You fix the time and shape the solution to fit it, instead of estimating a scope you already decided on.",
    default: "small",
    options: [
      { value: "small", label: "Small batch: one or two weeks", short: "small batch" },
      { value: "big", label: "Big batch: a full six week cycle", short: "big batch" },
    ],
  },
  {
    act: "shaping",
    id: "shape",
    prompt: "What rough shape does the solution take?",
    reasoning: "Still no pixels. This is the arrangement the flow wants, and it decides which places your breadboard starts with.",
    default: "overview",
    options: [
      { value: "overview", label: "One place that shows the state of everything", short: "an overview" },
      { value: "worklist", label: "A list to work through, one item at a time", short: "a worklist" },
      { value: "stream", label: "A stream of what is new, newest first", short: "a stream" },
      { value: "steps", label: "A short series of steps, start to finish", short: "a series of steps" },
    ],
  },
  {
    act: "shaping",
    id: "nogos",
    prompt: "What is explicitly out of scope?",
    reasoning: "Shape Up calls these no-gos: things you declare out of scope in writing so they cannot creep back in later. Scoping by subtraction is what keeps a fixed appetite honest, so this answer removes a place from your board.",
    default: "none",
    options: [
      { value: "none", label: "Nothing yet, keep it all in", short: "nothing ruled out" },
      { value: "social", label: "No social features in the first version", short: "no social features" },
      { value: "settings", label: "No configuration in the first version", short: "no configuration" },
      { value: "history", label: "No history or archive in the first version", short: "no history or archive" },
    ],
  },
]);

// The label shown in the running summary, per question — the method's own term for what was asked.
// Exported because system/build-keep.mjs writes the same terms into the downloadable pattern spec,
// and a second copy of "Internal trigger / Variable reward / Appetite" is a method-fidelity bug
// waiting to drift.
export const SUMMARY_TERM = {
  trigger: "Internal trigger",
  action: "Action",
  rewardType: "Variable reward",
  investment: "Investment",
  frequency: "Frequency",
  improvesLives: "Improves lives",
  wouldUseIt: "You would use it",
  appetite: "Appetite",
  shape: "Shape",
  nogos: "No-gos",
};

// Manipulation Matrix quadrant meanings, the four strings lifted VERBATIM from
// system/factory-intake.mjs:153-158, which in turn lifted them from __UX_UI_Research.md §Layer B.
// Duplicated rather than imported: that constant is module-private, and exporting from a shared
// module to serve a new page is the coupling build-import.mjs already refused (build-import.mjs:23).
// The quadrant NAME still comes from RULESET.ethics.matrix, so the two surfaces cannot disagree.
// Exported from HERE, though, for the same reason SUMMARY_TERM is: system/build-keep.mjs writes
// these sentences verbatim into the downloadable spec, and that is a consumer on this same page
// rather than another surface reaching across — a third hand-copy is what would drift.
export const QUADRANT_MEANINGS = {
  facilitator: "improves life ✓ / you'd use it ✓ — the goal.",
  peddler: "improves life ✓ / you wouldn't use it ✗ — warning: you may be overselling.",
  entertainer: "improves life ✗ / you'd use it ✓ — fine in moderation.",
  dealer: "improves life ✗ / you wouldn't use it ✗ — exploitation. Don't.",
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const DEFAULT_ANSWERS = Object.freeze(
  Object.fromEntries(QUESTIONS.map((q) => [q.id, q.default])),
);

// Fail loudly at load, the way factory-intake.mjs:172-180 does: every question needs options, and
// every default has to be one of them. A ruleset edit that empties RULESET.patterns breaks here.
for (const q of QUESTIONS) {
  if (!ACTS[q.act]) throw new Error(`build-questions: "${q.id}" names an act "${q.act}" that has no section`);
  if (!q.options.length) throw new Error(`build-questions: "${q.id}" has no options`);
  if (!q.options.some((o) => o.value === q.default)) {
    throw new Error(`build-questions: "${q.id}" default "${q.default}" is not one of its options`);
  }
  if (q.options.some((o) => !o.label || !o.short)) {
    throw new Error(`build-questions: "${q.id}" has an option missing a label or a short form`);
  }
}

// --- DOM helper (build-import.mjs:46 shape; duplicated per module by the same decision) --------
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "text") node.textContent = v;
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const c of children) if (c != null) node.appendChild(c);
  return node;
}

// The answer set is MODULE scope, not mount scope: the two acts are two sections with two wizards,
// and they describe one product. Each mount reads and writes this, and publishBuild is what tells
// everyone else (the other wizard's verdict panel, the breadboard) that it moved.
const answers = { ...DEFAULT_ANSWERS };

// The one write path for answers, and the one every consumer of BUILD_CHANGE can trust: it moves the
// module-scope object FIRST, then publishes the whole set. A share-link restore in a later slice is
// one call to this, not a new mechanism. Not a dispatch, so this module stays Node-import-safe: the
// store is seeded here at load and the first event is the one a mount or a restore causes.
Object.assign(state, {
  answers: { ...answers },
  quadrant: quadrantFor(answers),
  frequencyVerdict: frequencyVerdictFor(answers),
});

export function setAnswers(patch) {
  Object.assign(answers, patch);
  publishState({ source: "questions", answers: { ...answers } });
}

// The THIRD write path, and the only one that moves everything at once: a shared link arriving
// with a whole build in it (system/build-share.mjs decoded and hand-validated it — nothing is
// re-validated here, and nothing may be validated ONLY here). It goes through the same module-scope
// `answers` object setAnswers writes, so the wizards and the verdict panel move with it, and it
// publishes ONCE: one event, one atomic restore, no half-restored frame on screen.
//
// It deliberately accepts no quadrant and no frequency verdict. publishState recomputes both from
// the answers it just set, so a link can never claim a verdict its own answers do not produce.
export function restoreBuild({ answers: restored, board, boardIsEdited, pack } = {}) {
  if (restored) Object.assign(answers, restored);
  publishState({
    source: "restore",
    answers: { ...answers },
    board: board || null,
    boardIsEdited: Boolean(boardIsEdited),
    pack: pack || null,
  });
}

// Advancing an act moves the page AND the keyboard. Scrolling alone leaves focus on the button in the
// act the visitor just left, so their next Tab resumes behind them, walking back through questions
// they have already answered (#144 finding 8). Prefer the destination's own prompt heading — the
// wizard below already makes those focusable — and fall back to the section's beat title, which needs
// tabindex added because only wizard prompts carry it. `act-breadboard` is the fallback case: it is
// the one target with no wizard in it. preventScroll, so focusing cannot fight the scroll we just
// asked for; the ids carry scroll-margin-top in build.html, so "start" clears the sticky header.
function advanceTo(targetId) {
  const section = document.getElementById(targetId);
  if (!section) return;
  section.scrollIntoView({ block: "start" });
  const heading = section.querySelector(".bx-q-prompt") || section.querySelector(".beat-title");
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

// --- one act's stepped wizard --------------------------------------------------------------
// One question at a time, the factory-intake.mjs:414-459 shape: progress, prompt as a focusable
// heading, reasoning, a native radiogroup named by the prompt, Back / Next. Mounted once per act,
// over the shared answers above.
function mountWizard(root) {
  const wizardEl = root.querySelector("[data-build-wizard]");
  const actKey = root.dataset.act;
  const act = ACTS[actKey];
  const questions = QUESTIONS.filter((q) => q.act === actKey);
  // The mirror of the load-time assert above: a QUESTION naming a missing act throws, so a SECTION
  // naming a missing act throws too. The markup is committed, so a bad data-act is an authoring bug,
  // and failing silently would leave the no-JS fallback copy on screen while JS is running fine —
  // and would withhold the "ready" handle the visual-regression run waits on, hanging it to timeout.
  if (!act) throw new Error(`build-questions: a mount names an act "${actKey}" that does not exist`);
  if (!wizardEl || !questions.length) return;

  // Ids and radio `name`s are keyed per ACT, not per mount (#144 finding 10 — the comment here used
  // to claim per mount, which is more than this code does). Per act is enough for the page that
  // exists: build.html mounts each act exactly once, no question id appears in two acts, so every
  // prompt id and every radiogroup `name` is unique in the document and each radiogroup's
  // aria-labelledby resolves to its OWN prompt. A page mounting the SAME act twice would break both
  // — duplicate ids, and two radiogroups sharing a `name` with no <form> between them, which
  // browsers treat as one mutually exclusive group. That page does not exist and nothing wants it;
  // whoever builds it keys these off a per-mount counter, and updates the two selectors that read
  // the `name` back (the one below in this file, and tooling/build-journey.mjs's shape check).
  const promptId = `bx-q-prompt-${actKey}`;
  let step = 0;

  function renderStep(focusOnRender) {
    const q = questions[step];
    // The step card is its own view-transition group, so a Back/Next morph moves and resizes THIS
    // card instead of crossfading the whole viewport under it (#171). The name is assigned in
    // build.html's stylesheet, keyed off the mount's data-act, rather than here: both wizards are
    // in the document at once and a duplicate view-transition-name aborts the entire transition, so
    // the name has to be per-act — and a per-act constant is a stylesheet's job, not JS's. Writing
    // it here would also be a second inline-style write on this page, which build-checks group 7
    // refuses on purpose.
    const card = el("div", { class: "bx-q-card" });

    card.append(
      el("p", { class: "bx-q-act", text: act.label }),
      el("p", { class: "bx-q-progress", text: `${step + 1} / ${questions.length}` }),
    );

    const promptEl = el("h3", { class: "bx-q-prompt", id: promptId, tabindex: "-1", text: q.prompt });
    card.append(promptEl, el("p", { class: "bx-q-reasoning", text: q.reasoning }));

    // Native radios, so ←/→ navigate the group for free. No trace player runs on this page, so the
    // guardArrows workaround factory-intake.mjs:197 needs is not needed here.
    const group = el("div", { class: "bx-q-radios", role: "radiogroup", "aria-labelledby": promptId });
    for (const opt of q.options) {
      const row = el("label", { class: "bx-q-radio" });
      const input = el("input", { type: "radio", name: `bx-q-${q.id}`, value: opt.value });
      input.checked = answers[q.id] === opt.value;
      input.addEventListener("change", () => setAnswers({ [q.id]: opt.value }));
      row.append(input, el("span", { class: "bx-q-radio-label", text: opt.label }));
      group.append(row);
    }
    card.append(group);

    const footer = el("div", { class: "bx-q-footer" });
    const back = el("button", { type: "button", class: "btn btn-secondary", text: "Back" });
    back.disabled = step === 0;
    // Both nav verbs morph (#171). renderStep already focuses the new prompt AFTER replaceChildren,
    // so wrapping the whole call keeps focus inside the update callback and in its existing order —
    // the callback runs a frame later, and focusing a not-yet-inserted node is a no-op.
    back.addEventListener("click", () => { if (step > 0) { step -= 1; morph(() => renderStep(true)); } });
    const last = step === questions.length - 1;
    const next = el("button", { type: "button", class: "btn btn-primary", text: last ? act.done : "Next" });
    next.addEventListener("click", () => {
      // Nothing is submitted: the answers are live and everything downstream is already drawn from
      // them, so the last step of an act moves to the next act instead of dead-ending on a disabled
      // button.
      if (last) advanceTo(act.target);
      else { step += 1; morph(() => renderStep(true)); }
    });
    footer.append(back, next);
    card.append(footer);

    wizardEl.replaceChildren(card);
    // Back / Next just destroyed the button that had focus. Move focus to the new step's heading so
    // a keyboard or screen-reader user keeps their place (factory-intake.mjs:453-458). Must run
    // after the card is in the document, and never on the initial render, which would steal focus.
    if (focusOnRender) promptEl.focus();
  }

  renderStep();

  // Answers can move without this wizard's radios moving — a share-link restore in a later slice is
  // the case this exists for. The comparison is what keeps it safe: a radio the visitor just clicked
  // already agrees with the store, so their own change returns here and stops, and never destroys
  // the input the browser is still dispatching the change event for. Registered once on `document`,
  // outside renderStep, so replaceChildren cannot leak it.
  document.addEventListener(BUILD_CHANGE, (e) => {
    const next = e.detail && e.detail.answers;
    if (!next) return;
    const shown = wizardEl.querySelector(`input[name="bx-q-${questions[step].id}"]:checked`);
    if (shown && shown.value === next[questions[step].id]) return;
    renderStep(false); // never focus: this change did not come from an interaction with this wizard
  });

  // The settled-state handle the visual-regression gate waits on in Phase 1.5 (memory: a mount with
  // no handle either deadlocks the wait or baselines an empty surface).
  root.dataset.buildQuestions = "ready";
}

// --- the verdict panel ------------------------------------------------------------------------
// Both ethics gates, and the running summary of all ten answers. Live, never gated behind a reveal,
// and never graded: it is the visitor's own reading of their own product. It subscribes to
// BUILD_CHANGE rather than being called directly, because the answers it reads are changed by TWO
// wizards in two different sections.
function mountVerdict(verdictEl) {
  // Renders the answer set it is HANDED, not a module global it happens to share with the wizards.
  // The two are the same object's contents today; they would not be if a later slice published a
  // restored set, and a panel that reads around the payload is how that gets found on stage.
  function render(current) {
    const quadrant = quadrantFor(current);
    const frequency = frequencyVerdictFor(current);
    const panel = el("div", { class: "bx-verdict" });

    panel.append(
      el("p", { class: "bx-verdict-eyebrow", text: "Where your two ethics answers put it" }),
      el("p", { class: "bx-verdict-quadrant", text: cap(quadrant) }),
      el("p", { class: "bx-verdict-meaning", text: QUADRANT_MEANINGS[quadrant] }),
      el("p", { class: "bx-verdict-note", text:
        "Two questions decide the quadrant: does the product materially improve users' lives, and would you use it yourself. This is your reading of your own product, not a score." }),
    );

    // The second gate, and it rules independently of the first. A product can sit in the
    // facilitator quadrant and still fail the frequency filter, which is the whole point of running
    // both: the honest answer for most tools is a utility.
    panel.append(
      el("p", { class: "bx-verdict-eyebrow", text: "The frequency filter" }),
      el("p", {
        class: "bx-verdict-gate",
        "data-passes": String(frequency.passes),
        text: frequency.verdict,
      }),
    );

    const dl = el("dl", { class: "bx-summary" });
    for (const q of QUESTIONS) {
      const opt = q.options.find((o) => o.value === current[q.id]);
      dl.append(
        el("dt", { text: SUMMARY_TERM[q.id] }),
        el("dd", { text: opt ? opt.short : current[q.id] }),
      );
    }
    panel.append(el("h3", { class: "bx-summary-title", text: "Your product so far" }), dl);

    verdictEl.replaceChildren(panel);
  }

  // Two sources change answers — setAnswers ("questions") and restoreBuild ("restore") — and both
  // must reach this panel. The filter exists for the OTHER sources: a breadboard rename publishes
  // per keystroke, and rebuilding the summary on every keypress is churn carrying no new answer.
  // Filtering to "questions" alone shipped #193: a ?b= restore moved every consumer on the page
  // except this one, which kept printing the default verdicts until the visitor's first click.
  document.addEventListener(BUILD_CHANGE, (e) => {
    const source = e.detail && e.detail.source;
    if (source === "questions" || source === "restore") render(e.detail.answers);
  });
  render(readBuild().answers);
  verdictEl.dataset.buildVerdict = "ready";
}

// Self-boot behind a DOM guard so a Node import stays clean; inert on every page without the mounts.
if (typeof document !== "undefined") {
  const roots = document.querySelectorAll("[data-build-questions]");
  for (const root of roots) mountWizard(root);
  const verdictEl = document.querySelector("[data-build-verdict]");
  if (verdictEl) mountVerdict(verdictEl);
  // No boot publish: the store carries the seeded defaults from module load, and every consumer
  // either pulls readBuild() on its own mount (system/breadboard.mjs does) or is mounted here. The
  // publish this replaces re-rendered the verdict panel a second time before a visitor touched
  // anything, and made the breadboard draft its board twice.
}
