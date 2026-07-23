// system/factory-intake.mjs — view-time guided intake wizard + live re-skin + the ethics
// guess-then-reveal, for TWO inlined scenarios (hand-written canon, this repo; not
// generated). The designed Station 1 + Station 2 surface for the Factory page: a stepped
// guided wizard drives the real derivation engine (system/derive.mjs) and re-skins a
// sample of real components live, scoped to a preview container, plus a staged "how it's
// generated" narrative rendered from the engine's own output (brand→accessible palette +
// WCAG · density→scales · reward→patterns · frequency→ethics verdict) and — new in 10.3 —
// the platform's one guess-then-reveal moment: the reader places the product on the
// Manipulation Matrix, then compares with the maker's authored verdict.
// Spec: docs/epics/ai-first-ux-factory.architecture.md §Recommended approach (approach B —
// view-time-safe); epic #1, ticket #10, slice 10.3 (integration; closes #10).
//
// Two scenarios, one method: Verdant (plant care, consumer) and Fieldwork (dispatch, B2B).
// A toggle re-seeds the wizard, re-skins the sample from the new axes, and swaps the staged
// narrative — most importantly the ethics verdict, which rules the OTHER way for Fieldwork
// (monthly frequency → "utility; habit mechanics rejected"). Both configs are INLINED (not
// fetched): a fetch on toggle would reintroduce the two failure modes 10.2 inlined to avoid —
// a "Runs now" badge stranded over a non-rendering wizard on a fetch failure, and an async
// repaint racing the visual-regression capture. With exactly two known scenarios, a config
// loader is speculative generality; scenarios/<slug>/{copy,intake.defaults}.json stay the
// durable authoring record and the module inlines a distilled copy (same call 10.2 made).
//
// Approach B (can't fail on stage): derive() runs synchronously behind a try/catch; on any
// throw the preview's inline props are cleared (reverting to the committed neutral pack) and
// an honest note shows. Everything is synchronous after the deferred module load — no network
// at view time; the trace player at Station 5 replays a committed file.
//
// Config seam (epic #38, ticket #43): the wizard is SHARED, not forked. init() is exported as
// initIntake(config) — factory.html auto-inits with the inlined SCENARIOS (default config →
// byte-identical behaviour, its VR baseline untouched); the private-instance shell
// (system/instance.mjs) marks its mount with data-intake="external" to stand down the import-time
// auto-init, then calls initIntake() itself with a scenario config built from a compiled company
// package. assertScenarioConfig runs on both — load-time on the inlined map, call-time on whatever
// a page supplies. Governing doc: docs/epics/per-company-brief.architecture.md §Other ("the wizard
// is shared, not forked").

import { derive } from "./derive.mjs";
import { RULESET } from "./derive.rules.mjs";
import { trackFactoryDriven } from "./analytics.mjs";
import { countUp } from "./motion.mjs";

// Untrusted-value escape — verbatim from derive.html:165. Used for the few strings assembled
// into markup (the WCAG rows / notes / patterns lists, as derive.html does); structural nodes
// are built with createElement + textContent.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// --- The two inlined scenarios ---------------------------------------------------------------
// SCENARIOS[slug] = { label, fictionalNotice, wizard:[{axis,prompt,reasoning}], defaults,
//                     makerMatrix, ethicsReveal:{verdict,narrative} }.
// wizard prompts are scenario-independent reader-facing questions; the reasoning is the
// per-scenario recommended-default rationale, distilled ≤ ~30 words (teach discipline) from
// scenarios/<slug>/intake.defaults.json. fictionalNotice + ethicsReveal come from copy.json.
// makerMatrix is the AUTHOR's own Manipulation-Matrix placement (part of the reveal, NOT the
// reader's start state); null where a scenario omits the booleans by design ("needs no matrix").
// Exported so a host beat can pass a single scenario as a Verdant-only config (index.html #73).
export const SCENARIOS = {
  verdant: {
    label: "Verdant · plant care",
    fictionalNotice: "Verdant is a fictional product, invented for this demonstration. No real company, users, or data are involved.",
    wizard: [
      {
        axis: "brandColor",
        prompt: "What colour carries the brand?",
        reasoning: "Verdant's leaf-green. Whatever you pick, the engine keeps the hue and negotiates only lightness — as far down as the WCAG contrast floor demands, never further.",
      },
      {
        axis: "density",
        prompt: "What kind of product is it, and how do people use it?",
        reasoning: "A plant-care overview is browsed calmly at home, not scanned under pressure, so it can breathe — a comfortable spacing and type scale.",
      },
      {
        axis: "rewardType",
        prompt: "Who is it for, and what brings them back?",
        reasoning: "Verdant's reward is mastery made visible — plants kept alive, overdue tasks trending to zero. That is a 'self' reward, so the engine picks progress-stat patterns.",
      },
      {
        axis: "frequency",
        prompt: "How often would someone realistically do the core thing?",
        reasoning: "Per-plant care is weekly, but the aggregate check-in is near-daily — inside the habit zone (weekly or better), so a designed habit loop is legitimate here. Below weekly, the engine rules habit mechanics out.",
      },
    ],
    // scenarios/verdant/intake.defaults.json → axes. improvesLives / wouldUseIt are the
    // author's matrix position (below, in makerMatrix), NOT seeded here — the reader places them.
    defaults: { brandColor: "#2F7A4D", density: "comfortable", rewardType: "self", frequency: "daily" },
    makerMatrix: { improvesLives: true, wouldUseIt: true },
    // scenarios/verdant/copy.json → ethicsReveal
    ethicsReveal: {
      verdict: "habit-justified",
      narrative: "The frequency filter passes: with a dozen plants on staggered rhythms, the check-in is a near-daily behavior — inside the habit zone. And the Manipulation Matrix places Verdant in the facilitator quadrant: it materially improves users' lives (plants stay alive) and the maker would use it daily. So the habit loop is designed deliberately — trigger, action, variable reward of the self kind — because here it serves the user's own goal. Not every product earns this; the Fieldwork scenario shows the same gate ruling the other way.",
    },
  },
  fieldwork: {
    label: "Fieldwork · dispatch (B2B)",
    fictionalNotice: "Fieldwork is a fictional product, invented for this demonstration. No real company, users, or data are involved.",
    wizard: [
      {
        axis: "brandColor",
        prompt: "What colour carries the brand?",
        reasoning: "Fieldwork's alert orange — a dispatch board reads as live operations, not calm. The engine keeps your hue and moves only lightness, down to the WCAG contrast floor.",
      },
      {
        axis: "density",
        prompt: "What kind of product is it, and how do people use it?",
        reasoning: "Compact — the dispatcher works under time pressure, assigning in seconds. Density that packs the whole board into one glance beats anything that adds a click.",
      },
      {
        axis: "rewardType",
        prompt: "Who is it for, and what brings them back?",
        reasoning: "Hunt — the reward is finding the right technician for the job, fast: scanning, matching, resolving. Not social proof or self-mastery — locating the answer under load.",
      },
      {
        axis: "frequency",
        prompt: "How often would someone realistically do the core thing?",
        reasoning: "Monthly — the only habit candidate is the customer's recurring booking, below the habit zone (weekly or better). A designed habit loop has nothing legitimate to attach to here.",
      },
    ],
    // scenarios/fieldwork/intake.defaults.json → axes. The two matrix booleans are omitted
    // by design ("the honest verdict needs no matrix") — makerMatrix is null; preserve that.
    defaults: { brandColor: "#B4530A", density: "compact", rewardType: "hunt", frequency: "monthly" },
    makerMatrix: null,
    // scenarios/fieldwork/copy.json → ethicsReveal
    ethicsReveal: {
      verdict: "utility",
      narrative: "The frequency filter fails: the only behavior a habit loop could target — the customer's recurring booking — happens monthly at best, far below the habit zone. The dispatcher is in the tool all day, but that engagement is externally triggered by arriving work, not an internal itch to amplify. So the method rules habit mechanics out, and the design goes the other way: compact density, zero ceremony, success measured in seconds-to-assignment and SLA breaches caught early — never time-in-app. Same gate as Verdant, opposite verdict. That refusal is the demonstration.",
    },
  },
};
const DEFAULT_SCENARIO = "verdant"; // pins the visual-regression baseline (deterministic cold load)

// Option VALUES come live from RULESET (single source of truth) so the wizard can never offer
// an option the engine would reject; only the display LABELS live here. Scenario-independent.
const ENUM = {
  density: Object.keys(RULESET.scales),
  rewardType: Object.keys(RULESET.patterns),
  frequency: Object.keys(RULESET.ethics.frequencyFilter),
};
// Stakeholder option wording (D4): the reader picks a plain-product answer; the engine enum member
// stays the option's VALUE (LABELS is display-only). Shared across scenarios — the phrasings describe
// the OPTION, not one product, so they read true whether the host is Verdant, Fieldwork, or a company.
const LABELS = {
  density: { compact: "Fast — used under time pressure", comfortable: "Calm — browsed at home, no time pressure", spacious: "Roomy — lots of detail to lay out" },
  rewardType: { tribe: "For other people — community, social proof", hunt: "To find or track something", self: "To make their own progress visible" },
  frequency: { "multiple-daily": "Several times a day", daily: "About daily", weekly: "Weekly", monthly: "Monthly", rarely: "Rarely" },
};

// Manipulation Matrix — the four quadrant meanings, lifted VERBATIM (not invented) from
// __UX_UI_Research.md §Layer B (:65–68); the compare-notes register — two judgments side by
// side, the reader's guess never graded, no red X — is that doc's §10 voice contract. The
// quadrant NAME per cell comes from the same canon the engine reads (RULESET.ethics.matrix),
// so the widget and derive() can never disagree.
const QUADRANT_MEANINGS = {
  facilitator: "improves life ✓ / you'd use it ✓ — the goal.",
  peddler: "improves life ✓ / you wouldn't use it ✗ — warning: you may be overselling.",
  entertainer: "improves life ✗ / you'd use it ✓ — fine in moderation.",
  dealer: "improves life ✗ / you wouldn't use it ✗ — exploitation. Don't.",
};
// The 2×2, row-major: (improves, use). Row 1 = improves-yes, columns = use-yes | use-no.
const CELLS = [
  { improvesLives: true, wouldUseIt: true },
  { improvesLives: true, wouldUseIt: false },
  { improvesLives: false, wouldUseIt: true },
  { improvesLives: false, wouldUseIt: false },
].map((c) => ({ ...c, quadrant: RULESET.ethics.matrix[c.improvesLives][c.wouldUseIt] }));

// Fail-fast, per scenario: each enum non-empty, and every default a real member of its enum — so a
// future ruleset edit that renames/drops a key breaks loudly here, not on stage. Reads module-level
// ENUM (from RULESET, the single source of truth); parameterized over the scenario map so initIntake
// can re-run it on a page-supplied config (ticket #43's seam), not only the inlined SCENARIOS.
// Named assertScenarioConfig — NOT validateScenarios, which is scenarios/validate.mjs's export.
function assertScenarioConfig(scenarios) {
  for (const [slug, s] of Object.entries(scenarios)) {
    for (const axis of ["density", "rewardType", "frequency"]) {
      if (!ENUM[axis].length) throw new Error(`factory-intake: RULESET exposes no options for "${axis}"`);
      if (!ENUM[axis].includes(s.defaults[axis])) throw new Error(`factory-intake: ${slug} default "${s.defaults[axis]}" is not a valid "${axis}"`);
    }
  }
}
assertScenarioConfig(SCENARIOS); // load-time failure on the inlined scenarios (preserves 10.2's guarantee)

// --- DOM helpers (structural nodes; trace-player convention — text via textContent) ----------
function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

// The trace player (mounted at Station 5) registers a document-level keydown that calls
// preventDefault() on ←/→ to step. Native radio groups (the wizard, the scenario toggle) also
// navigate with ←/→ — a document-level preventDefault would hijack that native nav from anywhere
// on the page (the exact a11y PR #37 hardened). Guard: a bubble-phase listener on each control
// container that stopPropagation()s ←/→ — the player never sees the event (so it can't step or
// preventDefault), and native nav survives because we DON'T preventDefault. The trace still steps
// on ←/→ when focus is outside these controls (the player's own designed behaviour).
function guardArrows(node) {
  if (!node) return;
  node.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation();
  });
}

// The exported init (ticket #43's seam): behind a document guard at the bottom so `import()` under
// Node (the parse check) never touches the DOM; inert on any page lacking its three required anchors.
// config = { scenarios, defaultScenario, askedAxes } — the first two default to the inlined map so
// factory.html's call is byte-identical; the shell (instance.mjs) passes a scenario config built from a
// company package. askedAxes (optional array) restricts the wizard to a SUBSET of the scenario's axes —
// home (#73) asks the three non-brand axes; a null askedAxes asks the full wizard. answers still seeds
// every default (brandColor included), so derive() runs on the whole axis set no matter what is asked.
export function initIntake({ scenarios = SCENARIOS, defaultScenario = DEFAULT_SCENARIO, askedAxes = null } = {}) {
  assertScenarioConfig(scenarios); // re-validate whatever config arrived (page-supplied or the default)
  const wizardMount = document.getElementById("factory-wizard");
  const previewRoot = document.getElementById("reskin-preview");
  const narrativeRoot = document.getElementById("factory-narrative");
  if (!wizardMount || !previewRoot || !narrativeRoot) return;
  // Optional per-scenario chrome anchors — each guarded individually so the module stays inert
  // where a surface is absent (graceful under a partial page).
  const toggleMount = document.getElementById("scenario-toggle");
  const ethicsMount = document.getElementById("ethics-gate");
  const scenarioNotice = document.getElementById("fw-scenario-notice");
  const handoffNote = document.getElementById("handoff-note");
  const summaryMount = document.getElementById("factory-summary");

  let active = defaultScenario;
  let answers = { ...scenarios[active].defaults };
  let step = 0;
  let ethicsPlacement = null; // reader's {improvesLives, wouldUseIt} — NEVER prefilled from the scenario
  let driven = false; // fire-once guard for the "factory driven" analytics event
  let appliedKeys = [];

  // Fire once on the FIRST of any drive — wizard change, scenario toggle, or ethics placement.
  function markDriven() {
    if (!driven) { driven = true; trackFactoryDriven(); }
  }

  // --- live re-skin (approach B: view-time-safe) --------------------------------------------
  // `animate` gates the WCAG-table row entrance (the .fw-animate class renderNarrative adds). Only
  // the renders where the table genuinely (re)appears pass true: initial mount and the scenario
  // toggle. Every within-scenario value change goes through setAnswer → run(false) — see there.
  function run(animate = true) {
    let result;
    try {
      result = derive(answers);
    } catch (err) {
      return fallback(err);
    }
    // Inline custom properties on the preview root outrank the contract + pack layers — scoped
    // here (not <html>) so the chrome + wizard + Stations 3–5 stay un-re-skinned.
    for (const k of appliedKeys) previewRoot.style.removeProperty("--" + k);
    appliedKeys = Object.keys(result.tokens);
    for (const [k, v] of Object.entries(result.tokens)) previewRoot.style.setProperty("--" + k, v);
    previewRoot.dataset.reskin = "ready"; // readiness signal for the visual-regression gate
    renderNarrative(result, animate);
  }

  // On any derive() throw: clear props → the container inherits the committed neutral pack, and
  // an honest note replaces the narrative. Unreachable via the bounded UI — this is the guarantee.
  function fallback(err) {
    for (const k of appliedKeys) previewRoot.style.removeProperty("--" + k);
    appliedKeys = [];
    previewRoot.dataset.reskin = "fallback";
    narrativeRoot.replaceChildren(el("p", "fw-note muted", "Live derivation unavailable — showing the neutral pack."));
    console.error(err);
  }

  // Every within-scenario value change updates the WCAG table IN PLACE, so it must NOT re-fire the
  // staggered row entrance (run(false)): on the continuous colour drag the animation restarts on
  // each freshly-built row every `input` tick and later rows never settle (blank table); on a radio
  // change it would re-cascade rows whose content didn't even change (checks depend on brandColor
  // alone). Mount + scenario toggle keep the entrance (run() → true).
  function setAnswer(axis, value) {
    answers[axis] = value;
    markDriven(); // first user-initiated change only
    run(false);
  }

  // --- scenario toggle: swap the whole Station-1/2 pipeline (synchronous, no fetch) ----------
  function setScenario(slug) {
    if (!scenarios[slug]) return;
    active = slug;
    answers = { ...scenarios[slug].defaults }; // matrix booleans intentionally NOT seeded
    step = 0;
    ethicsPlacement = null; // un-place the reader's ethics guess
    markDriven(); // toggling IS a drive → fire-once analytics
    renderScenarioChrome(); // fictional label · active proto · handoff note
    renderToggle(); // reflect the new checked state
    renderWizard();
    run(); // re-skin + narrative for the new scenario
    renderEthics(); // reset the Manipulation-Matrix beat to un-placed
  }

  function renderToggle() {
    if (!toggleMount) return;
    // a11y: arrow-navigating the radio group fires change → setScenario → this rebuild, which
    // replaceChildren()s away the radio the user just acted on and drops focus to <body>. Mirror
    // renderWizard's guard: read focus BEFORE the swap, then restore it to the now-checked radio —
    // but only if focus was inside the toggle. contains() is false for Safari's mouse-click quirk
    // (clicking a radio doesn't focus it), so a mouse toggle never gets unwanted focus.
    const hadFocus = toggleMount.contains(document.activeElement);
    const fieldset = el("fieldset", "fw-toggle");
    fieldset.appendChild(el("legend", "fw-toggle-legend", "Scenario"));
    const group = el("div", "fw-toggle-options");
    let activeInput;
    for (const slug of Object.keys(scenarios)) {
      const label = el("label", "fw-toggle-option");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "fw-scenario-toggle";
      input.value = slug;
      input.checked = slug === active;
      if (input.checked) activeInput = input;
      input.addEventListener("change", () => setScenario(slug));
      label.appendChild(input);
      label.appendChild(el("span", "fw-toggle-label", scenarios[slug].label));
      group.appendChild(label);
    }
    fieldset.appendChild(group);
    toggleMount.replaceChildren(fieldset);
    if (hadFocus && activeInput) activeInput.focus(); // AFTER it's in the document (focus on a detached node is a no-op)
  }

  // The non-wizard per-scenario surfaces. Honesty-surface sweep made mechanical: under either
  // scenario, no surface may claim an artifact that doesn't exist. Stations 4–5 respond to the
  // toggle by stating what runs via the capability indicator, with Verdant's REAL pack + trace
  // always reachable — the toggle labels the gap, it never hides the real thing.
  function renderScenarioChrome() {
    const s = scenarios[active];
    if (scenarioNotice) scenarioNotice.textContent = s.fictionalNotice; // honesty surface #1
    // Station 3 — show only the active scenario's proto figure; keep the other in the DOM (hidden).
    document.querySelectorAll(".factory-embed-figure[data-scenario]").forEach((fig) => {
      fig.hidden = fig.dataset.scenario !== active;
    });
    // Station 4 — the pack links always point at Verdant's real pack; only the note changes.
    if (handoffNote) {
      handoffNote.textContent = active === "verdant"
        ? "The pack an engineer would actually receive: every component's spec head, engineer docs, and agent vocabulary side by side, generated from one source — plus the whole thing as a single JSON download. Inspect it."
        : "Fieldwork's handoff pack is in build. The pack linked below is Verdant's — a real, generated pack, always reachable — so you can still inspect exactly what an engineer receives from this method.";
    }
  }

  // --- the guided wizard (one decision at a time) -------------------------------------------
  function renderControl(axis) {
    const wrap = el("div", "fw-control");
    if (axis === "brandColor") {
      const label = el("label", "fw-color");
      const input = document.createElement("input");
      input.type = "color";
      input.value = answers.brandColor;
      // a11y: the wrapping <label> also holds the live hex readout (valueSpan), so without an
      // explicit name the control's accessible name resolves to the hex value, not its purpose.
      input.setAttribute("aria-label", "Brand colour");
      const valueSpan = el("span", "fw-color-value", answers.brandColor);
      input.addEventListener("input", () => {
        valueSpan.textContent = input.value;
        setAnswer("brandColor", input.value);
      });
      label.appendChild(input);
      label.appendChild(valueSpan);
      wrap.appendChild(label);
      return wrap;
    }
    const group = el("div", "fw-radios");
    group.setAttribute("role", "radiogroup");
    // a11y: name the group with the step's visible prompt (the h3#fw-prompt rendered above it),
    // so a screen reader announces the question rather than an unnamed radio group.
    group.setAttribute("aria-labelledby", "fw-prompt");
    for (const value of ENUM[axis]) {
      const row = el("label", "fw-radio");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "fw-" + axis;
      input.value = value;
      input.checked = answers[axis] === value;
      input.addEventListener("change", () => setAnswer(axis, value));
      row.appendChild(input);
      row.appendChild(el("span", "fw-radio-label", LABELS[axis][value]));
      group.appendChild(row);
    }
    wrap.appendChild(group);
    return wrap;
  }

  function renderWizard(focusOnRender) {
    // askedAxes (config): a host may ask a SUBSET of the scenario's axes (home asks the three
    // non-brand axes; factory/instance pass none → the full wizard). answers already carries every
    // default, so filtering the ASKED steps never starves derive() (brandColor stays seeded).
    const full = scenarios[active].wizard;
    const asked = askedAxes ? full.filter((a) => askedAxes.includes(a.axis)) : full;
    if (askedAxes && !asked.length) {
      console.warn(`factory-intake: askedAxes [${askedAxes.join(", ")}] matched no axis of ` +
        `"${active}" (has ${full.map((a) => a.axis).join(" | ")}) — showing the full wizard`);
    }
    const wiz = asked.length ? asked : full; // never render an empty wizard on a misconfigured askedAxes
    const w = wiz[step];
    const card = el("div", "fw-card");
    card.appendChild(el("p", "fw-progress", `${step + 1} / ${wiz.length}`));
    const promptEl = el("h3", "fw-prompt", w.prompt);
    promptEl.id = "fw-prompt";  // stable target for the radiogroup's aria-labelledby
    promptEl.tabIndex = -1;     // programmatically focusable (out of tab order) so Back/Next can land focus here
    card.appendChild(promptEl);
    card.appendChild(el("p", "fw-reasoning muted", w.reasoning));
    card.appendChild(renderControl(w.axis));

    const footer = el("div", "fw-footer");
    const back = el("button", "btn btn-secondary", "Back");
    back.type = "button";
    back.disabled = step === 0;
    back.addEventListener("click", () => { if (step > 0) { step -= 1; renderWizard(true); } });
    const last = step === wiz.length - 1;
    const next = el("button", "btn btn-primary", last ? "Review" : "Next");
    next.type = "button";
    // The preview is always live, so there is no submit; on the last step "Review" jumps to the
    // generated result (instant scroll — reduced-motion-safe) rather than dead-ending disabled.
    next.addEventListener("click", () => {
      if (last) previewRoot.scrollIntoView({ block: "start" });
      else { step += 1; renderWizard(true); }
    });
    footer.appendChild(back);
    footer.appendChild(next);
    card.appendChild(footer);

    wizardMount.replaceChildren(card); // replaces the static "Loading…" seed on first mount
    // a11y: on Back/Next the button that held focus was just destroyed by replaceChildren — move
    // focus to the new step's heading so keyboard / screen-reader users keep their place. Must run
    // AFTER the card is in the document (focus on a detached node is a no-op). NOT on the initial
    // render (called with no arg) — focusing on page load would steal focus + scroll.
    if (focusOnRender) promptEl.focus();
  }

  // --- staged "how it's generated" narrative + WCAG table (rendered from the engine output) --
  function beat(num, title) {
    const s = el("section", "fw-beat");
    const h = el("h4", "fw-beat-title");
    h.appendChild(el("span", "fw-beat-num", num));
    h.appendChild(el("span", null, title));
    s.appendChild(h);
    return s;
  }

  function renderNarrative(result, animate = true) {
    const frag = document.createDocumentFragment();

    // Beat 1 — Brand → accessible palette: the WCAG checks table (shown passing at the defaults;
    // a pathological colour can legitimately FAIL — that honesty is the proof the check is real),
    // then the brand-vs-accessibility negotiation from result.notes.
    const b1 = beat("01", "Brand → accessible palette");
    const table = el("table", "fw-checks");
    if (animate) table.classList.add("fw-animate"); // entrance stagger only on discrete renders (see run())
    table.innerHTML =
      "<thead><tr><th></th><th>pair</th><th>ratio</th><th>min</th><th>AA</th></tr></thead><tbody>" +
      result.checks.map((c, i) => `
        <tr style="--i:${i}">
          <td><span class="fw-swatch" style="background:${esc(c.fgValue)}"></span><span class="fw-swatch" style="background:${esc(c.bgValue)}"></span></td>
          <td>${esc(c.fg)} / ${esc(c.bg)}<br><span class="muted">${esc(c.usage)}</span></td>
          <td>${c.ratio.toFixed(2)}</td><td>${c.min}</td>
          <td class="${c.pass ? "ok" : "bad"}">${c.pass
            ? '<svg class="check-draw" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5 5 9.5 10 3" pathLength="1"/></svg>pass'
            : "FAIL"}</td>
        </tr>`).join("") + "</tbody>";
    b1.appendChild(table);
    b1.appendChild(el("p", "fw-beat-sub", "What the engine negotiated"));
    const notes = el("ul", "fw-notes muted");
    notes.innerHTML = result.notes.length
      ? result.notes.map((n) => `<li><strong>${esc(n.action)}</strong>${n.token ? " · " + esc(n.token) : ""} — ${esc(n.why)}${n.from !== null ? ` (${esc(n.from)} → ${esc(n.to)})` : ""}</li>`).join("")
      : "<li>none — the brand colour passed every rule untouched</li>";
    b1.appendChild(notes);
    frag.appendChild(b1);

    // Beat 2 — Density → scales: the emitted spacing steps + type ramp, and the modular ratio.
    const b2 = beat("02", "Density → scales");
    const t = result.tokens;
    const ratio = RULESET.scales[result.input.density].ratio;
    b2.appendChild(el("p", "fw-scale",
      `Spacing md · lg · xl: ${t["spacing-md"]} · ${t["spacing-lg"]} · ${t["spacing-xl"]}. `
      + `Type: body ${t["type-body"]}, h3 ${t["type-h3"]}, on a ${ratio}× modular ramp.`));
    frag.appendChild(b2);

    // Beat 3 — Reward → patterns: the selected patterns; habit mechanics that fail the frequency
    // filter are shown struck-through with their gate tag — the gate shown working, not hiding.
    const b3 = beat("03", "Reward → patterns");
    const plist = el("ul", "fw-patterns");
    plist.innerHTML = result.patterns.map((p) => `
      <li class="${p.gatedBy ? "fw-gated" : ""}"><strong>${esc(p.name)}</strong>${p.gatedBy ? `<span class="fw-gated-tag">rejected: ${esc(p.gatedBy)}</span>` : ""}<br>
      <span class="muted">${esc(p.why)} <code>${esc(p.components.join(" "))}</code></span></li>`).join("");
    b3.appendChild(plist);
    frag.appendChild(b3);

    // Beat 4 — Frequency → verdict: the ethics-gate verdict, derived from frequency ALONE and
    // always visible. This is the load-bearing "verdicts differ" swap — it flips live on every
    // answer/toggle change with NO interaction (present in every derive() result, booleans or
    // not). The Manipulation-Matrix guess-then-reveal (renderEthics) is a SEPARATE beat that
    // touches only ethics.quadrant; the frequency verdict is never gated behind the reveal.
    const b4 = beat("04", "Frequency → verdict");
    b4.appendChild(el("p", "fw-verdict max-prose", result.ethics.verdict));
    frag.appendChild(b4);

    narrativeRoot.replaceChildren(frag);
    // Ratios count up to their measured value on discrete renders only (mount / scenario
    // toggle) — never on within-scenario value changes, where counting on every input tick
    // would strobe. countUp itself no-ops under reduced motion.
    if (animate) for (const td of table.querySelectorAll("tbody td:nth-child(3)")) countUp(td, td.textContent);
    renderSummary(result);
  }

  // The four-cell stat strip above the collapsed narrative (#factory-summary, optional — absent on
  // instance.html). Every number is read from the same derive() result the narrative renders, so
  // the strip can never disagree with the evidence behind the disclosure.
  function renderSummary(result) {
    if (!summaryMount) return;
    const cell = (n, l) => {
      const c = el("div", "cell");
      c.append(el("div", "n", n), el("div", "l", l));
      return c;
    };
    const passN = result.checks.filter((c) => c.pass).length;
    const kept = result.patterns.filter((p) => !p.gatedBy).length;
    const gated = result.patterns.length - kept;
    summaryMount.replaceChildren(
      cell(result.input.brandColor, "brand colour in"),
      cell(`${passN}/${result.checks.length}`, passN === result.checks.length ? "contrast pairs pass AA" : "contrast pairs pass AA (failures shown below)"),
      cell(`${RULESET.scales[result.input.density].ratio}×`, "modular type ramp"),
      cell(gated ? `${kept} · ${gated}` : String(kept), gated ? "patterns kept · gated by ethics" : "patterns kept"),
    );
  }

  // --- the ethics guess-then-reveal: the Manipulation Matrix, run out loud -------------------
  // Rendered into its OWN container (#ethics-gate), NOT #factory-narrative — renderNarrative()
  // replaceChildren()s on every run(), which would wipe the reader's placement on any wizard
  // change. Kept out of that path, the placement survives answer changes and resets only on a
  // scenario toggle. Compare-notes register (hard): two judgments side by side, the reader's
  // guess never graded, no red X.
  function renderEthics() {
    if (!ethicsMount) return;
    const s = scenarios[active];

    const section = el("section", "fw-ethics");
    section.appendChild(el("h4", "fw-ethics-title", "Place it on the Manipulation Matrix"));
    section.appendChild(el("p", "fw-ethics-intro muted",
      "Two questions decide it: does the product materially improve users' lives, and would you use it yourself? Place it below, then compare with the maker — not a quiz, just two judgments side by side."));

    const matrix = el("div", "fw-matrix");
    matrix.setAttribute("role", "group");
    matrix.setAttribute("aria-label", "Place the product on the Manipulation Matrix");

    const cellButtons = [];
    let revealBtn;
    const revealPanel = el("div", "fw-reveal");
    revealPanel.hidden = true;
    // a11y: the reveal appears below the button without moving focus; make it a live region so a
    // screen-reader user is told the compare-notes content arrived. role="status" implies a polite,
    // atomic live region; renderReveal unhides it BEFORE inserting content so the change announces.
    revealPanel.setAttribute("role", "status");

    function selectCell(cell, btn) {
      ethicsPlacement = { improvesLives: cell.improvesLives, wouldUseIt: cell.wouldUseIt };
      markDriven(); // placing the product IS a drive
      for (const rec of cellButtons) {
        const on = rec.el === btn;
        rec.el.classList.toggle("is-selected", on);
        rec.el.setAttribute("aria-pressed", on ? "true" : "false");
        rec.mark.textContent = on ? "✓ your placement" : ""; // text marker, never colour-only (WCAG)
      }
      if (revealBtn) revealBtn.disabled = false;
      // If the reveal is already open, re-placing to a different cell must re-derive it — otherwise
      // the matrix (new cell) and the panel (old placement) contradict each other on screen.
      if (revealPanel && !revealPanel.hidden) renderReveal(revealPanel, s);
    }

    function cellButton(cell) {
      // A <button aria-pressed>, not a radio: buttons have no native ←/→ nav, so they can't
      // collide with the trace player's document-level arrow listener (see guardArrows).
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fw-quadrant";
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label",
        `${cap(cell.quadrant)} — improves lives: ${cell.improvesLives ? "yes" : "no"}, would use it: ${cell.wouldUseIt ? "yes" : "no"}`);
      btn.appendChild(el("span", "fw-quadrant-name", cap(cell.quadrant)));
      const mark = el("span", "fw-quadrant-mark");
      btn.appendChild(mark);
      cellButtons.push({ el: btn, mark });
      btn.addEventListener("click", () => selectCell(cell, btn));
      return btn;
    }

    matrix.append(
      el("span", "fw-matrix-corner"),
      el("span", "fw-matrix-colhead", "Would use it — Yes"),
      el("span", "fw-matrix-colhead", "Would use it — No"),
      el("span", "fw-matrix-rowhead", "Improves lives — Yes"),
      cellButton(CELLS[0]), // facilitator
      cellButton(CELLS[1]), // peddler
      el("span", "fw-matrix-rowhead", "Improves lives — No"),
      cellButton(CELLS[2]), // entertainer
      cellButton(CELLS[3]), // dealer
    );
    section.appendChild(matrix);

    const actions = el("div", "fw-ethics-actions");
    revealBtn = el("button", "btn btn-primary fw-reveal-btn", "Compare with the maker");
    revealBtn.type = "button";
    revealBtn.disabled = true; // enabled once the reader places a cell
    revealBtn.addEventListener("click", () => renderReveal(revealPanel, s));
    actions.appendChild(revealBtn);
    section.appendChild(actions);
    section.appendChild(revealPanel);

    ethicsMount.replaceChildren(section);
  }

  // Reveal (compare notes): the reader's placement → THEIR quadrant, shown beside the maker's
  // authored verdict. The maker's verdict does NOT change with the reader's guess — two
  // professionals' judgments side by side, never graded. The reader's quadrant comes from the
  // real engine (derive with their two booleans), behind the same view-time-safe try/catch.
  function renderReveal(revealPanel, s) {
    if (!ethicsPlacement) return;
    let quadrant;
    try {
      quadrant = derive({ ...answers, improvesLives: ethicsPlacement.improvesLives, wouldUseIt: ethicsPlacement.wouldUseIt }).ethics.quadrant;
    } catch (err) {
      revealPanel.hidden = false;
      revealPanel.replaceChildren(el("p", "fw-note muted", "Live derivation unavailable — the placement can't be computed right now."));
      console.error(err);
      return;
    }

    const cols = el("div", "fw-reveal-cols");

    const left = el("div", "fw-reveal-col");
    left.appendChild(el("p", "fw-reveal-eyebrow", "Where you placed it"));
    left.appendChild(el("p", "fw-reveal-quadrant", cap(quadrant)));
    left.appendChild(el("p", "fw-reveal-meaning muted", QUADRANT_MEANINGS[quadrant]));

    const right = el("div", "fw-reveal-col");
    right.appendChild(el("p", "fw-reveal-eyebrow", "The maker's verdict"));
    if (s.makerMatrix) {
      const mq = RULESET.ethics.matrix[s.makerMatrix.improvesLives][s.makerMatrix.wouldUseIt];
      right.appendChild(el("p", "fw-reveal-quadrant", cap(mq)));
    } else {
      // No-quadrant scenario (Fieldwork): the maker didn't place it — the frequency filter
      // already decided. The reader still gets THEIR quadrant on the left; the lesson is the gap.
      right.appendChild(el("p", "fw-reveal-quadrant", "Not placed"));
      right.appendChild(el("p", "fw-reveal-meaning muted", "The frequency filter already decided — the honest verdict needs no matrix."));
    }
    right.appendChild(el("p", "fw-reveal-narrative max-prose", s.ethicsReveal.narrative));

    cols.append(left, right);
    revealPanel.hidden = false; // unhide the live region BEFORE inserting content so role="status" announces the change (matches the error path above)
    revealPanel.replaceChildren(cols);
  }

  // Guard native ←/→ nav on the control containers from the trace player's document listener.
  // Added once on the stable mount elements (they persist across replaceChildren re-renders).
  guardArrows(wizardMount);
  guardArrows(toggleMount);
  guardArrows(ethicsMount);

  // Initial auto-render — settles the default (Verdant) skin; does NOT fire analytics.
  renderScenarioChrome();
  renderToggle();
  renderEthics();
  renderWizard();
  run();
  // Arm the re-skin transition ONE frame after the first settle, so the initial paint is
  // transition-free (no load-flash) and the reduced-motion VR capture stays instant. Every
  // subsequent re-skin (answer change, scenario toggle) then interpolates its colours. The
  // transition itself is CSS on #reskin-preview.is-animated, gated behind no-preference. (Phase 3)
  requestAnimationFrame(() => previewRoot.classList.add("is-animated"));
}

// Auto-init ONLY when no page has claimed the seam: a #factory-wizard marked data-intake="external"
// (the shell's static mount) stands the default config down so instance.mjs can call initIntake()
// with its own. factory.html has no marker → the querySelector is null → today's code path, unchanged.
if (typeof document !== "undefined" && !document.querySelector('#factory-wizard[data-intake="external"]')) initIntake();
