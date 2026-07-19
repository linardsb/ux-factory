// system/factory-intake.mjs — view-time guided intake wizard + live re-skin (hand-written
// canon, this repo; not generated). The designed Station 1 + Station 2 surface for the
// Factory page: a stepped 4-question wizard drives the real derivation engine
// (system/derive.mjs) and re-skins a sample of real components live, scoped to a preview
// container, plus a staged "how it's generated" narrative rendered from the engine's own
// output (brand→accessible palette + WCAG checks · density→scales · reward→patterns ·
// frequency→ethics verdict).
// Spec: docs/epics/ai-first-ux-factory.architecture.md §Recommended approach (approach B —
// view-time-safe); epic #1, ticket #10, slice 10.2.
//
// Finalized intake cut (closes the PRD's last open question — intake final cut = 3–5 asked):
// FOUR asked mechanical axes — brand colour · density · reward type · behaviour frequency —
// each mapping straight to a derive() input and visibly steering output. The ethics pair
// (improvesLives / wouldUseIt) is DEFERRED to slice 5.7 (the guess-then-reveal Manipulation
// Matrix); result.ethics.verdict still derives from frequency alone. The 8 narrative
// discovery questions (intake.defaults.json) are defaulted silently — they don't feed derive().
//
// Approach B (can't fail on stage): derive() runs synchronously behind a try/catch; on any
// throw the preview's inline props are cleared (reverting to the committed neutral pack) and
// an honest note shows. Verdant is the sole scenario this slice renders; its config is inlined
// (not fetched) so the on-load apply settles before any screenshot and there is no
// config-load failure state to design — the scenario toggle slice introduces the fetch path.

import { derive } from "./derive.mjs";
import { RULESET } from "./derive.rules.mjs";
import { trackFactoryDriven } from "./analytics.mjs";

// Untrusted-value escape — verbatim from derive.html:165. Used for the few strings assembled
// into markup (the WCAG rows / notes / patterns lists, as derive.html does); structural nodes
// are built with createElement + textContent.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// The inlined Verdant config: prompt + reasoning per axis (authoring source stays the durable
// record — scenarios/verdant/intake.defaults.json). Reasoning kept ≤ ~30 words (teach discipline).
const WIZARD = [
  {
    axis: "brandColor",
    prompt: "What colour carries the brand?",
    reasoning: "Verdant's leaf-green. Whatever you pick, the engine keeps the hue and negotiates only lightness — as far down as the WCAG contrast floor demands, never further.",
  },
  {
    axis: "density",
    prompt: "How much breathing room should the interface have?",
    reasoning: "Comfortable — a plant-care overview is browsed calmly at home, not scanned under time pressure, so it can breathe rather than pack every pixel.",
  },
  {
    axis: "rewardType",
    prompt: "What kind of variable reward brings people back?",
    reasoning: "Self — the reward is mastery made visible: plants kept alive, overdue tasks trending to zero. Not social proof, not a hunt for novelty.",
  },
  {
    axis: "frequency",
    prompt: "How often would the core behaviour realistically happen?",
    reasoning: "Per-plant care is weekly, but the aggregate check-in is near-daily — inside the Hooked habit zone (weekly or better), so a designed habit loop is legitimate here.",
  },
];

// Verdant defaults (scenarios/verdant/intake.defaults.json → axes). Every reader can accept
// all four with Next×4 and still see the full Verdant skin — "recommended default, override
// within bounds". improvesLives / wouldUseIt are intentionally omitted (5.7).
const DEFAULTS = { brandColor: "#2F7A4D", density: "comfortable", rewardType: "self", frequency: "daily" };

// Option VALUES come live from RULESET (single source of truth) so the wizard can never offer
// an option the engine would reject; only the display LABELS live here.
const ENUM = {
  density: Object.keys(RULESET.scales),
  rewardType: Object.keys(RULESET.patterns),
  frequency: Object.keys(RULESET.ethics.frequencyFilter),
};
const LABELS = {
  density: { compact: "Compact", comfortable: "Comfortable", spacious: "Spacious" },
  rewardType: { tribe: "Tribe — social", hunt: "Hunt — resources / information", self: "Self — mastery / completion" },
  frequency: { "multiple-daily": "Multiple times a day", daily: "Daily", weekly: "Weekly", monthly: "Monthly", rarely: "Rarely" },
};

// Fail-fast at load: each enum non-empty, and every default a real member of its enum — so a
// future ruleset edit that renames/drops a key breaks loudly here, not silently on stage.
for (const axis of ["density", "rewardType", "frequency"]) {
  if (!ENUM[axis].length) throw new Error(`factory-intake: RULESET exposes no options for "${axis}"`);
  if (!ENUM[axis].includes(DEFAULTS[axis])) throw new Error(`factory-intake: default "${DEFAULTS[axis]}" is not a valid "${axis}"`);
}

// --- DOM helper (structural nodes; trace-player convention — text via textContent) ----------
function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

// self-init behind a document guard so `import()` under Node (the Task-2 parse check) never
// touches the DOM; the module is inert on any page lacking its three anchors.
function init() {
  const wizardMount = document.getElementById("factory-wizard");
  const previewRoot = document.getElementById("reskin-preview");
  const narrativeRoot = document.getElementById("factory-narrative");
  if (!wizardMount || !previewRoot || !narrativeRoot) return;

  const answers = { ...DEFAULTS };
  let step = 0;
  let appliedKeys = [];
  let driven = false; // fire-once guard for the "factory driven" analytics event

  // --- live re-skin (approach B: view-time-safe) --------------------------------------------
  function run() {
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
    renderNarrative(result);
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

  function setAnswer(axis, value) {
    answers[axis] = value;
    if (!driven) { driven = true; trackFactoryDriven(); } // first user-initiated change only
    run();
  }

  // --- the guided wizard (one decision at a time) -------------------------------------------
  function renderControl(axis) {
    const wrap = el("div", "fw-control");
    if (axis === "brandColor") {
      const label = el("label", "fw-color");
      const input = document.createElement("input");
      input.type = "color";
      input.value = answers.brandColor;
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

  function renderWizard() {
    const w = WIZARD[step];
    const card = el("div", "fw-card");
    card.appendChild(el("p", "fw-progress", `${step + 1} / ${WIZARD.length}`));
    card.appendChild(el("h3", "fw-prompt", w.prompt));
    card.appendChild(el("p", "fw-reasoning muted", w.reasoning));
    card.appendChild(renderControl(w.axis));

    const footer = el("div", "fw-footer");
    const back = el("button", "btn btn-secondary", "Back");
    back.type = "button";
    back.disabled = step === 0;
    back.addEventListener("click", () => { if (step > 0) { step -= 1; renderWizard(); } });
    const last = step === WIZARD.length - 1;
    const next = el("button", "btn btn-primary", last ? "Review" : "Next");
    next.type = "button";
    // The preview is always live, so there is no submit; on the last step "Review" jumps to the
    // generated result (instant scroll — reduced-motion-safe) rather than dead-ending disabled.
    next.addEventListener("click", () => {
      if (last) previewRoot.scrollIntoView({ block: "start" });
      else { step += 1; renderWizard(); }
    });
    footer.appendChild(back);
    footer.appendChild(next);
    card.appendChild(footer);

    wizardMount.replaceChildren(card); // replaces the static "Loading…" seed on first mount
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

  function renderNarrative(result) {
    const frag = document.createDocumentFragment();

    // Beat 1 — Brand → accessible palette: the WCAG checks table (shown passing at the defaults;
    // a pathological colour can legitimately FAIL — that honesty is the proof the check is real),
    // then the brand-vs-accessibility negotiation from result.notes.
    const b1 = beat("01", "Brand → accessible palette");
    const table = el("table", "fw-checks");
    table.innerHTML =
      "<thead><tr><th></th><th>pair</th><th>ratio</th><th>min</th><th>AA</th></tr></thead><tbody>" +
      result.checks.map((c) => `
        <tr>
          <td><span class="fw-swatch" style="background:${esc(c.fgValue)}"></span><span class="fw-swatch" style="background:${esc(c.bgValue)}"></span></td>
          <td>${esc(c.fg)} / ${esc(c.bg)}<br><span class="muted">${esc(c.usage)}</span></td>
          <td>${c.ratio.toFixed(2)}</td><td>${c.min}</td>
          <td class="${c.pass ? "ok" : "bad"}">${c.pass ? "pass" : "FAIL"}</td>
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

    // Beat 4 — Frequency → verdict: the ethics-gate verdict (derived from frequency alone; the
    // Manipulation Matrix quadrant + guess-then-reveal are 5.7, deferred).
    const b4 = beat("04", "Frequency → verdict");
    b4.appendChild(el("p", "fw-verdict max-prose", result.ethics.verdict));
    frag.appendChild(b4);

    narrativeRoot.replaceChildren(frag);
  }

  renderWizard();
  run(); // initial auto-render — settles the Verdant default skin; does NOT fire analytics
}

if (typeof document !== "undefined") init();
