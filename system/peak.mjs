// system/peak.mjs — hand-written canon (this repo; not generated). Beat 3 of the v3 home spine:
// the built-screen peak — the emotional peak, visually singular (epic #70 ticket #75; PRD §6.1
// beat 3 / P2c; architecture §Analytics "/factory/built", boundary "Nothing fails on stage").
//
// When the reader reaches the peak, a REAL Verdant product screen assembles: the declarative
// renderer (#11) builds a COMMITTED example composition into a detached mount, re-skinned to the
// visitor's brand + density via the real derive() engine (#3); WCAG receipts are drawn from the
// real contrast pairs; the Manipulation-Matrix verdict is a guess-then-reveal; and a restrained
// adjust-live surface OBEYS a valid change and REFUSES an out-of-vocabulary one, naming the exact
// path — the refusal IS the thesis (a governed, contract-enforcing system), not a toy. No view-time
// LLM; the reader replays a committed build. Everything wraps try/catch → the committed static
// still (build-then-swap: the still is never destroyed until the live tree is proven). /factory/built
// fires once on arrival.
//
// Honesty (hard, CLAUDE.md contract): EXAMPLE_COMPOSITION below is HAND-AUTHORED and framed as a
// committed example — never labelled "agent output"/"real run" (real runs live in proto/compositions/
// with paired traces). Epic #86 later swaps only the composition SOURCE (committed → per-employer
// agent-composed on a private instance); this render/receipt/adjust machinery is unchanged, which is
// exactly why the example is a plain {name,props,children}[] the renderer already accepts. All copy
// is true of a committed example.
//
// Node-import-safe: DOM/fetch are touched only inside the beat effect (which the spine runs only in a
// browser); registerBeat no-ops with no DOM (spine.mjs:48), so `node --check` and any Node harness
// import cleanly.

import { derive } from "./derive.mjs";
import { readRecord } from "./pack-derived.mjs";
import { getHomeAnswers } from "./intake-beat.mjs";
import { renderComposition, validateComposition } from "./agentic-renderer.mjs";
import { createBus } from "./action-bus.mjs";
import { registerBeat } from "./spine.mjs";
import { trackFactoryBuilt } from "./analytics.mjs";

// ---------------------------------------------------------------------------- the committed example

// Hand-authored EXAMPLE — NOT an agent run (those live in proto/compositions/ with paired traces).
// A coherent Verdant "Today" screen that demonstrates the renderer + the vocabulary contract; every
// node/prop/enum validates against handoff/verdant/vocabulary.json (proven under Node before wiring).
// Epic #86 replaces this const with a real per-employer agent-composed view — the machinery around it
// does not change. (stat-tile.value is a number; photoUrl omitted → the card's monogram placeholder.)
const EXAMPLE_COMPOSITION = [
  { name: "screen-header", props: { title: "Today", showSettings: true } },
  { name: "stat-tile", props: { kind: "moisture", value: 34, unit: "%", label: "Moisture" } },
  { name: "stat-tile", props: { kind: "light", value: 820, unit: "lx", label: "Light" } },
  { name: "care-task-row", props: { type: "water", plantName: "Monstera", status: "overdue" } },
  { name: "care-task-row", props: { type: "water", plantName: "Fiddle-leaf Fig", status: "due" } },
  { name: "plant-card", props: { name: "Snake Plant", species: "Sansevieria trifasciata", status: "ok" } },
  { name: "primary-button", props: { label: "Log care" } },
];

// ---------------------------------------------------------------------------- constants

const VOCAB_URL = "/handoff/verdant/vocabulary.json";
const CANNED_BRAND = "#2f7a4d"; // the canned Verdant brand (spine.mjs CANNED_AXES) — the fallback hex
const DEFAULT_HOME_AXES = { density: "comfortable", rewardType: "self", frequency: "daily" }; // pack-derived DEFAULT_AXES
const REVEAL_PAIR = { improvesLives: true, wouldUseIt: true }; // Verdant's canonical ethics answers → facilitator

const STATUS_ENUM = ["ok", "due", "overdue"]; // care-task-row.status enum (vocabulary owns the truth)
const PROBE_STATUS = "urgent"; // deliberately OUT of the status enum — the boundary the probe reaches past

// The engine keeps Nir Eyal's canonical quadrant names (derive.rules.mjs — a versioned artifact also
// shown on factory/instance to a deeper audience); the PEAK humanizes each to a plain label + gloss,
// the canonical term demoted to a small tag (#57 humanize-at-presentation precedent). Peak-only for #75.
const QUADRANT_LABELS = {
  facilitator: { label: "Genuinely useful", gloss: "helps people, and its maker would use it too" },
  peddler:     { label: "Preachy",          gloss: "sold as good-for-you, but the maker wouldn't use it" },
  entertainer: { label: "Just entertainment", gloss: "enjoyable, but it doesn't improve lives" },
  dealer:      { label: "Exploitative",     gloss: "hooks people without helping them" },
};
const QUADRANT_ORDER = ["facilitator", "peddler", "entertainer", "dealer"];

// The receipt rows the peak SHOWS — the pairs a reader sees on this light card screen (the rest of
// the 12 are page-chrome pairs). The headline pass-count is computed over ALL 12, and any FAILING
// pair is surfaced even when it is outside this set (the engine shows the gate working, never hides
// a reject — derive.rules.mjs ethos). Matched by the ruleset's verbatim `usage` strings.
const RECEIPT_USAGES = [
  "body text on cards / alt sections",
  "captions on cards",
  "accent text on cards",
  "button label on an accent fill",
];

// ---------------------------------------------------------------------------- DOM helpers

const clone = (v) => JSON.parse(JSON.stringify(v));

// Element builder — never innerHTML from data, so agent-/visitor-supplied strings stay inert text
// (mirrors agentic-study.mjs:25). `text` sets textContent; on*/addEventListener wire handlers.
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") n.textContent = v;
    else if (k === "onclick" || k === "onchange") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
}

// ---------------------------------------------------------------------------- inputs + derive

// The peak's derive input: brand from the #beat-brand record (#74) — falling back to the wizard's
// seeded brandColor, then the canned Verdant hex; the three non-brand axes from the live home wizard
// (#73) via the additive getHomeAnswers() seam, falling back to the Verdant defaults. Reads fresh
// each call so a brand/answer changed above the fold is reflected when the peak activates.
function readInputs() {
  const axes = getHomeAnswers() || DEFAULT_HOME_AXES;
  const brandColor = readRecord()?.brandColor || axes.brandColor || CANNED_BRAND;
  return { density: axes.density, rewardType: axes.rewardType, frequency: axes.frequency, brandColor };
}

// computeDerived(ethicsPair?) → the full derive() result. ethics.quadrant is present ONLY when both
// matrix booleans are given, so the base build passes none and the ethics reveal passes REVEAL_PAIR.
// Throws exactly as derive() does on a bad hex — the caller degrades to the still.
function computeDerived(ethicsPair) {
  return derive({ ...readInputs(), ...(ethicsPair || {}) });
}

// Scoped re-skin: apply the FULL derived token set as inline custom properties on the live screen
// ONLY (not :root — never fight the dock's committed-pack line-swap or the hero's :root revert). The
// full set (not the color-only :root filter) is deliberate: the screen is a CONTAINED preview like
// factory-intake's previewRoot (factory-intake.mjs:252), so the density-driven spacing/type scales
// visibly shift the screen too — the peak reflects the visitor's answers, not just their colour.
function applyDerivedTokens(target, tokens) {
  for (const [k, v] of Object.entries(tokens)) target.style.setProperty("--" + k, v);
}

// ---------------------------------------------------------------------------- WCAG receipts

// Build the real receipts from derive().checks. Headline over ALL pairs; shown rows = the card-
// relevant subset plus any failing pair (surfaced honestly — never a hard-coded "Pass AA").
function buildReceipts(checks) {
  const total = checks.length;
  const passed = checks.filter((c) => c.pass).length;
  const allPass = passed === total;

  const shown = checks.filter((c) => RECEIPT_USAGES.includes(c.usage));
  for (const c of checks) if (!c.pass && !shown.includes(c)) shown.push(c); // never hide a reject

  const wrap = el("div", { class: "peak-receipts", "data-peak-receipts": true });
  wrap.appendChild(el("p", { class: `peak-receipts-headline${allPass ? "" : " is-flagged"}` },
    el("span", { class: "peak-receipts-mark", "aria-hidden": "true", text: allPass ? "✓" : "!" }),
    el("span", {
      text: allPass
        ? `All ${total} contrast pairs pass AA`
        : `${passed} of ${total} contrast pairs pass AA, ${total - passed} flagged`,
    })));

  for (const c of shown) {
    wrap.appendChild(el("div", { class: `wcag-row${c.pass ? "" : " is-fail"}` },
      el("span", { class: "wcag-pair", text: c.usage }),
      el("span", { class: "wcag-ratio", text: `${c.ratio.toFixed(2)}:1` }),
      el("span", { class: c.pass ? "wcag-pass" : "wcag-fail", text: c.pass ? "Pass AA" : "Fails AA" })));
  }
  return wrap;
}

// ---------------------------------------------------------------------------- ethics guess-then-reveal

// Enhance the static <details> into the guess-then-reveal. The reader guesses (plain labels), then a
// click computes the CANONICAL verdict from the real engine — computeDerived(REVEAL_PAIR).ethics
// .quadrant → "facilitator" — and confirms or corrects, plain label leading, Eyal's term as a tag.
// Kept a <details> disclosure so no-JS shows the honest static shape (the body is the JS-only layer).
function enhanceEthics(host) {
  const body = host.querySelector(".peak-ethics-body");
  if (!body) return;
  body.replaceChildren();
  body.appendChild(el("p", { class: "peak-ethics-intro", text: "Guess where Verdant sits on the Manipulation Matrix, then reveal the engine's read." }));

  const choices = el("div", { class: "peak-ethics-choices", role: "group", "aria-label": "Guess Verdant's quadrant" });
  const result = el("div", { class: "peak-ethics-result", hidden: true, role: "status", "aria-live": "polite" });
  let guessed = null;

  function reveal() {
    let quadrant;
    try {
      quadrant = computeDerived(REVEAL_PAIR).ethics.quadrant;
    } catch {
      return; // derive refused — leave the static body, reveal nothing (fail-closed)
    }
    const truth = QUADRANT_LABELS[quadrant] || { label: quadrant, gloss: "" };
    const right = guessed === quadrant;
    result.replaceChildren(
      el("p", { class: "peak-ethics-verdict" },
        el("span", { class: "peak-ethics-verdict-label", text: truth.label }),
        el("span", { class: "peak-ethics-verdict-tag", text: `Eyal's “${quadrant}” quadrant` })),
      el("p", { class: "peak-ethics-gloss muted", text: `Verdant ${truth.gloss}, so its habit loop serves the user's own goal.` }),
      el("p", { class: "peak-ethics-judge", text: right
        ? "That matches your guess."
        : `You guessed “${QUADRANT_LABELS[guessed].label}.” The honest read is “${truth.label}.”` }));
    result.hidden = false;
  }

  QUADRANT_ORDER.forEach((q) => {
    const btn = el("button", { type: "button", class: "peak-ethics-choice", "aria-pressed": "false", text: QUADRANT_LABELS[q].label });
    btn.addEventListener("click", () => {
      guessed = q;
      for (const b of choices.children) b.setAttribute("aria-pressed", String(b === btn));
      reveal();
    });
    choices.appendChild(btn);
  });
  body.append(choices, result);
}

// ---------------------------------------------------------------------------- the beat effect

// Build-then-swap: the static #71 still is retained until the live tree is PROVEN. Any failure —
// vocab fetch, derive() throw, or a composition the renderer refuses — logs once and leaves the
// still exactly as it was (nothing fails on stage). Runs inside the spine's own try/catch too.
async function peakEffect({ el: beatEl, reduce }) {
  const still = beatEl.querySelector(".peak-screen");
  const screenCol = beatEl.querySelector(".peak-screen-col") || (still && still.parentElement);
  const side = beatEl.querySelector(".peak-side");
  if (!still || !screenCol) return; // unexpected markup — leave the still untouched

  // 1 · vocabulary (fetch; degrade to the still on any failure, never throw to the reader)
  let vocab;
  try {
    const res = await fetch(VOCAB_URL);
    if (!res.ok) throw new Error(`${VOCAB_URL} → ${res.status}`);
    vocab = await res.json();
  } catch (err) {
    console.error("peak: vocabulary unavailable — static still retained", err);
    return;
  }

  // 2 · derive on the visitor's brand + answers (degrade to the still on a bad hex)
  let derived;
  try {
    derived = computeDerived();
  } catch (err) {
    console.error("peak: derive() refused — static still retained", err);
    return;
  }

  // 3 · build the live screen DETACHED — renderComposition validates first, so an out-of-vocabulary
  //     node throws HERE (still untouched) rather than half-mounting a broken screen.
  const bus = createBus();
  const working = clone(EXAMPLE_COMPOSITION); // the deep-cloned WORKING copy — the const is never mutated
  const liveScreen = el("div", { class: "peak-screen peak-screen--live", "aria-label": "Verdant — a built example screen" });
  try {
    liveScreen.appendChild(renderComposition(vocab, working, bus));
  } catch (err) {
    console.error("peak: live build refused — static still retained", err);
    return;
  }

  // 4 · wear the brand + density (scoped to the screen), then swap. The entrance is armed BEFORE
  //     insertion so the assembly plays from paint (no flash of the final state first); under reduced
  //     motion the class is never added → the inserted screen IS the final state instantly.
  applyDerivedTokens(liveScreen, derived.tokens);
  if (!reduce) liveScreen.classList.add("discrete-render");
  still.replaceWith(liveScreen);

  // The built screen is now on stage — THIS is "reached the built screen", so fire the analytics
  // here (own fire-once guard), NOT from the spine's analytics slot: that slot runs after the effect
  // whether the build succeeded or fell through to the still, which would count a failed build as a
  // reach. Every fallback above returns before this line, so the metric stays true to its name.
  trackFactoryBuilt();

  // 5 · real receipts replace the faux rows (or append into the side if the host is absent)
  if (side) {
    const host = side.querySelector("[data-peak-receipts]");
    const receipts = buildReceipts(derived.checks);
    if (host) host.replaceWith(receipts);
    else side.insertBefore(receipts, side.querySelector(".peak-ethics"));
  }

  // 6 · the ethics guess-then-reveal
  const ethics = beatEl.querySelector(".peak-ethics");
  if (ethics) enhanceEthics(ethics);

  // 7 · the restrained adjust-live — one valid control + the out-of-vocabulary refusal probe.
  //     A re-render repaints the screen STATICALLY: the .discrete-render entrance gate is dropped
  //     first, so a status change never re-triggers the assembly animation on the rebuilt children
  //     (entrance-anim-on-continuous-rebuild). The probe is NON-destructive (validates a hypothetical,
  //     never mutates `working`) and shows the verbatim path-naming refusal — the thesis.
  const idx = working.findIndex((n) => n.name === "care-task-row");
  if (idx < 0) return; // a composition with no adjustable row — the screen still assembled; no control

  const rerender = () => {
    liveScreen.classList.remove("discrete-render"); // static repaint (factory-intake run(false) precedent)
    liveScreen.replaceChildren(renderComposition(vocab, working, bus));
  };

  const surface = el("div", { class: "peak-adjust" });
  const refusal = el("div", { class: "peak-refusal", hidden: true });
  const setRefusal = (msg) => {
    refusal.replaceChildren();
    if (!msg) { refusal.hidden = true; return; }
    refusal.hidden = false;
    refusal.append(
      el("span", { class: "peak-refusal-tag", text: "Refused" }),
      el("code", { class: "peak-refusal-msg", text: msg })); // verbatim, textContent — untrusted
  };

  const row = working[idx].props;
  const label = `${row.type[0].toUpperCase() + row.type.slice(1)} ${row.plantName}`;
  const select = el("select", { class: "peak-adjust-select", "aria-label": `Status for ${label}` });
  for (const s of STATUS_ENUM) select.appendChild(el("option", { value: s, selected: s === row.status }, s));
  select.appendChild(el("option", { value: PROBE_STATUS }, `${PROBE_STATUS} (not in vocabulary)`));

  select.addEventListener("change", () => {
    const v = select.value;
    if (v === PROBE_STATUS) {
      // Non-destructive probe: validate a HYPOTHETICAL with an out-of-vocabulary status, show the
      // exact refusal, revert the control — the working screen is never touched.
      const probed = clone(working);
      probed[idx].props = { ...probed[idx].props, status: PROBE_STATUS };
      bus.emit({ type: "ui.intent", source: "pointer", target: { component: "care-task-row", id: String(idx) }, params: { intent: "probe-out-of-vocabulary", status: PROBE_STATUS } });
      try {
        validateComposition(vocab, probed);
        setRefusal(`(the probe was accepted, which is unexpected; "${PROBE_STATUS}" should not be a valid status)`);
      } catch (e) {
        setRefusal(e.message); // e.g. composition[3].props.status: "urgent" is not in enum [ok | due | overdue]
      }
      select.value = row.status; // revert — the screen is unchanged
      return;
    }
    // A valid change: mutate the working copy, announce the intent on the bus, repaint statically.
    working[idx].props = { ...working[idx].props, status: v };
    row.status = v; // keep the local reference in sync for the next label/enum read
    bus.emit({ type: "ui.intent", source: "pointer", target: { component: "care-task-row", id: String(idx) }, params: { intent: "set-status", status: v } });
    rerender();
    setRefusal(null);
  });

  surface.append(
    el("p", { class: "peak-adjust-eyebrow", text: "Adjust it" }),
    el("p", { class: "peak-adjust-hint", text: "Change a task's status and the screen re-renders. Then pick “not in vocabulary” and watch the system refuse it, naming the exact path. That same contract is what makes agent-composed UI safe." }),
    el("div", { class: "peak-adjust-control" },
      el("span", { class: "peak-adjust-label", text: label }),
      select),
    refusal);
  screenCol.appendChild(surface);
}

// ---------------------------------------------------------------------------- register

// activateOn:'visible' is required — the PRD success metric is visitors who REACH the built screen;
// 'load' would fire /factory/built for everyone. No spine `analytics` slot on purpose: that slot runs
// after the effect regardless of whether the build succeeded, so /factory/built is fired from inside
// the effect on the success path instead (see peakEffect), keeping the metric true to "reached the
// built screen". Node-safe: with no DOM registerBeat no-ops, so the import stays clean.
registerBeat("beat-peak", { effect: peakEffect, activateOn: "visible" });
