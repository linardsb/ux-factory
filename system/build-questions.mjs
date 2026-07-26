// system/build-questions.mjs — Acts 1 and 2 of the pattern builder: the visitor describes their
// own product through the two methods this portfolio works by (epic #134, ticket #136;
// .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.3, .claude/plans/build-questions-breadboard.md).
//
// Eight questions, not ten. The ticket's scope line says ten; its own enumeration is six (Hooked)
// plus two (Shaping), and AC4 caps the flow at ten rather than requiring them. Padding to the cap
// would add ceremony the method does not ask for.
//
// Two things this module deliberately does NOT do:
//
//   1. It does not run the guess-then-reveal. system/factory-intake.mjs puts the reader's
//      Manipulation-Matrix placement beside THE MAKER's authored verdict, which works because
//      Verdant and Fieldwork have an author. Here the product is the visitor's own, so there is no
//      second judgment to sit beside theirs. The ethics pair is two ordinary questions in the flow
//      and the quadrant renders as a verdict. Mirroring renderEthics would ship a compare device
//      with an empty right-hand column.
//   2. It does not ask the frequency question. derive()'s other ethics gate (habit-justified vs
//      utility) needs a seventh Act 1 question, and the intake wizard on the home spine already
//      asks it. This act produces the QUADRANT, read from RULESET.ethics.matrix — the same canon
//      factory-intake.mjs:165 reads, so the two surfaces can never disagree about a quadrant.
//
// This module also owns the BUILD_CHANGE store the whole page publishes into (see below). That is
// twenty-five lines shared by three consumers, which does not earn a file of its own under this
// repo's simplicity rule; if it grows, system/build-state.mjs is the shape to extract.
//
// Node-import-safe: DOM references live inside function bodies, and the mount self-boots behind a
// `typeof document` guard at the very bottom.

import { RULESET } from "./derive.rules.mjs";

// --- the BUILD_CHANGE contract ---------------------------------------------------------------
// One event on `document`, one state object, published by both acts. Naming and dispatch follow
// pack-derived.mjs's BRAND_CHANGE_EVENT. The payload is the FULL state every time, not a delta, so
// a consumer that mounts late (or re-mounts) never has to reconstruct history:
//
//   { source: "questions" | "breadboard",
//     answers: { trigger, action, rewardType, investment, improvesLives, wouldUseIt, appetite, shape },
//     quadrant: "facilitator" | "peddler" | "entertainer" | "dealer",
//     board: { places: [{ id, label, affordances: [{ id, label }] }], connections: [[affId, placeId]] },
//     boardIsEdited: boolean }
//
// Act 0's imported token values are NOT in here yet. system/build-import.mjs holds its record in
// module state and publishes nothing; the first consumer that actually needs those values is the
// share codec, so that slice wires the seam rather than this one guessing at its shape.
export const BUILD_CHANGE = "factory:build-change";

// Every answer is a STRING, including the two ethics booleans ("yes"/"no"). One type for the whole
// answer set keeps the later share-link validation uniform: one enum check per field, no special
// case. bool() below is the only place the strings become booleans.
const state = {
  source: null,
  answers: null,
  quadrant: null,
  board: null,
  boardIsEdited: false,
};

const bool = (v) => v === "yes";

// The quadrant is always recomputed from the current answers rather than stored by a caller, so no
// publisher can put a quadrant into the state that its own answers do not produce.
export function quadrantFor(answers) {
  return RULESET.ethics.matrix[bool(answers.improvesLives)][bool(answers.wouldUseIt)];
}

export function readBuild() {
  return structuredClone(state);
}

export function publishBuild(patch) {
  Object.assign(state, patch);
  if (state.answers) state.quadrant = quadrantFor(state.answers);
  document.dispatchEvent(new CustomEvent(BUILD_CHANGE, { detail: readBuild() }));
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
// Only trigger, action, investment, appetite and shape are this page's own enums. The reward type
// belongs to the ruleset, and the ethics pair belongs to the Manipulation Matrix.

const REWARD_LABELS = {
  self: { label: "Their own progress, made visible", short: "own progress" },
  tribe: { label: "Other people: replies, credit, a community", short: "other people" },
  hunt: { label: "Something found: results, information, a match", short: "something found" },
};

export const QUESTIONS = Object.freeze([
  {
    act: "Act 1 · Hooked",
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
    act: "Act 1 · Hooked",
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
    act: "Act 1 · Hooked",
    id: "rewardType",
    prompt: "What do they get back, and why does it keep varying?",
    reasoning: "A reward that is always the same stops pulling. Naming which of the three kinds it is tells you what the screen has to be good at.",
    // Values from the ruleset, labels local — factory-intake.mjs:132-146's rule, so a ruleset edit
    // that renames or drops a reward type breaks loudly at load rather than quietly on stage.
    default: "self",
    options: Object.keys(RULESET.patterns).map((value) => ({ value, ...REWARD_LABELS[value] })),
  },
  {
    act: "Act 1 · Hooked",
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
    act: "Act 1 · Hooked",
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
    act: "Act 1 · Hooked",
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
    act: "Act 2 · Shaping",
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
    act: "Act 2 · Shaping",
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
]);

// The label shown in the running summary, per question — the method's own term for what was asked.
const SUMMARY_TERM = {
  trigger: "Internal trigger",
  action: "Action",
  rewardType: "Variable reward",
  investment: "Investment",
  improvesLives: "Improves lives",
  wouldUseIt: "You would use it",
  appetite: "Appetite",
  shape: "Shape",
};

// Manipulation Matrix quadrant meanings, the four strings lifted VERBATIM from
// system/factory-intake.mjs:153-158, which in turn lifted them from __UX_UI_Research.md §Layer B.
// Duplicated rather than imported: that constant is module-private, and exporting from a shared
// module to serve a new page is the coupling build-import.mjs already refused (build-import.mjs:23).
// The quadrant NAME still comes from RULESET.ethics.matrix, so the two surfaces cannot disagree.
const QUADRANT_MEANINGS = {
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

function mount(root) {
  const wizardEl = root.querySelector("[data-build-wizard]");
  const verdictEl = root.querySelector("[data-build-verdict]");
  if (!wizardEl || !verdictEl) return;

  const answers = { ...DEFAULT_ANSWERS };
  let step = 0;

  function setAnswer(id, value) {
    answers[id] = value;
    publishBuild({ source: "questions", answers: { ...answers } });
    renderVerdict();
  }

  // --- the stepped wizard ---------------------------------------------------------------------
  // One question at a time, the factory-intake.mjs:414-459 shape: progress, prompt as a focusable
  // heading, reasoning, a native radiogroup named by the prompt, Back / Next.
  function renderStep(focusOnRender) {
    const q = QUESTIONS[step];
    const card = el("div", { class: "bx-q-card" });

    card.append(
      el("p", { class: "bx-q-act", text: q.act }),
      el("p", { class: "bx-q-progress", text: `${step + 1} / ${QUESTIONS.length}` }),
    );

    const promptEl = el("h3", { class: "bx-q-prompt", id: "bx-q-prompt", tabindex: "-1", text: q.prompt });
    card.append(promptEl, el("p", { class: "bx-q-reasoning", text: q.reasoning }));

    // Native radios, so ←/→ navigate the group for free. No trace player runs on this page, so the
    // guardArrows workaround factory-intake.mjs:197 needs is not needed here.
    const group = el("div", { class: "bx-q-radios", role: "radiogroup", "aria-labelledby": "bx-q-prompt" });
    for (const opt of q.options) {
      const row = el("label", { class: "bx-q-radio" });
      const input = el("input", { type: "radio", name: `bx-q-${q.id}`, value: opt.value });
      input.checked = answers[q.id] === opt.value;
      input.addEventListener("change", () => setAnswer(q.id, opt.value));
      row.append(input, el("span", { class: "bx-q-radio-label", text: opt.label }));
      group.append(row);
    }
    card.append(group);

    const footer = el("div", { class: "bx-q-footer" });
    const back = el("button", { type: "button", class: "btn btn-secondary", text: "Back" });
    back.disabled = step === 0;
    back.addEventListener("click", () => { if (step > 0) { step -= 1; renderStep(true); } });
    const last = step === QUESTIONS.length - 1;
    const next = el("button", {
      type: "button",
      class: "btn btn-primary",
      text: last ? "See the breadboard" : "Next",
    });
    next.addEventListener("click", () => {
      // Nothing is submitted: the answers are live and the board below is already drafted from
      // them, so the last step goes to the board instead of dead-ending on a disabled button.
      if (last) document.getElementById("act-breadboard")?.scrollIntoView({ block: "start" });
      else { step += 1; renderStep(true); }
    });
    footer.append(back, next);
    card.append(footer);

    wizardEl.replaceChildren(card);
    // Back / Next just destroyed the button that had focus. Move focus to the new step's heading so
    // a keyboard or screen-reader user keeps their place (factory-intake.mjs:453-458). Must run
    // after the card is in the document, and never on the initial render, which would steal focus.
    if (focusOnRender) promptEl.focus();
  }

  // --- the verdict beside the wizard ----------------------------------------------------------
  // The quadrant and the running summary, both live. Not gated behind a reveal, and never graded:
  // it is the visitor's own placement of their own product.
  function renderVerdict() {
    const quadrant = quadrantFor(answers);
    const panel = el("div", { class: "bx-verdict" });

    panel.append(
      el("p", { class: "bx-verdict-eyebrow", text: "Where your two ethics answers put it" }),
      el("p", { class: "bx-verdict-quadrant", text: cap(quadrant) }),
      el("p", { class: "bx-verdict-meaning", text: QUADRANT_MEANINGS[quadrant] }),
      el("p", { class: "bx-verdict-note", text:
        "Two questions decide the quadrant: does the product materially improve users' lives, and would you use it yourself. This is your reading of your own product, not a score." }),
    );

    const dl = el("dl", { class: "bx-summary" });
    for (const q of QUESTIONS) {
      const opt = q.options.find((o) => o.value === answers[q.id]);
      dl.append(
        el("dt", { text: SUMMARY_TERM[q.id] }),
        el("dd", { text: opt ? opt.short : answers[q.id] }),
      );
    }
    panel.append(el("h3", { class: "bx-summary-title", text: "Your product so far" }), dl);

    verdictEl.replaceChildren(panel);
  }

  renderStep();
  renderVerdict();
  // Publish the seeded defaults so a consumer that mounts after this one still starts from a
  // complete answer set. system/breadboard.mjs also pulls readBuild() on its own mount, so the two
  // modules work in either script order.
  publishBuild({ source: "questions", answers: { ...answers } });

  // The settled-state handle the visual-regression gate waits on in Phase 1.5 (memory: a mount with
  // no handle either deadlocks the wait or baselines an empty surface).
  root.dataset.buildQuestions = "ready";
}

// Self-boot behind a DOM guard so a Node import stays clean; inert on every page without the mount.
if (typeof document !== "undefined") {
  const root = document.querySelector("[data-build-questions]");
  if (root) mount(root);
}
