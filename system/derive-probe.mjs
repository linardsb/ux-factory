// system/derive-probe.mjs — hand-written canon (this repo; not generated). View-time companion
// to the derive-accent-contrast annotated-source block on approach.html §05: the reader hands
// the SHIPPED engine (system/derive.mjs — the same file the block quotes) a brand colour and
// the strip reports what the rule did — the negotiated accent, the measured contrast pair, and
// the engine's own `notes` verbatim (docs/epics/annotated-source-glossary.architecture.md;
// PRD §6 legibility — evidence register: the code shown and the code run are one file). No
// fetch, no model call — derive() is the same deterministic module derive.html drives.
//
// renderDeriveProbe(container) → { destroy }. All content via textContent (never innerHTML);
// the module injects no <style> (portfolio.css owns the classes — annotated-source.mjs posture).
//
// Two scrub handles (#174) sit beside the picker: brand HUE and brand LIGHTNESS, both wired
// through the shared makeScrubbable primitive system/scrub.mjs ships for home's intake stage —
// one primitive, one keyboard model, no second code path. Each drag re-runs the SAME derive()
// the picker does, so the strip keeps reporting the engine verbatim. Lightness is the exhibit's
// sharp edge: the rule's own accent clamp is [0.35, 0.60], so scrubbing the brand up past it and
// watching the engine pull the accent back down is the rule demonstrating itself.
//
// Sync is BIDIRECTIONAL and the two directions need different code. handle → picker goes through
// apply(), which writes input.value (an assignment fires no `input` event, so it cannot loop).
// picker → handle goes through reflect(): makeScrubbable reads live but only AT an interaction,
// so after the reader picks a colour the handles would keep DISPLAYING the old numbers until
// touched — two controls disagreeing on screen. run() must not reflect: mid-drag the handle has
// already reflected the pending value, and re-reading it back out of the hex would jitter it.
//
// Lightness is bounded 20–95, not 0–100: measured, below ~20 and above ~95 the sRGB round-trip
// collapses chroma (0.020 at l=0.05) and the hue handle stops moving the colour. At these bounds
// chroma survives and hue reads back within 0.6°, and they still straddle the engine's clamp in
// both directions — which is the whole point of the exhibit. aria-valuemin/max report them.

import { derive } from "./derive.mjs";
import { makeScrubbable } from "./scrub.mjs";
import { hexToOklch, oklchToHex, toGamut } from "./oklch.mjs";

// The colour is the probe's one variable; the other intake answers are held fixed and named in
// the strip. The default brand is light enough that the clamp + the darkening fire at rest.
const FIXED = { density: "comfortable", rewardType: "self", frequency: "weekly" };
const DEFAULT_BRAND = "#8ecf6a";
const DEFAULT_HUE = 135;             // hexToOklch(DEFAULT_BRAND).h === 135.4, rounded
const L_RANGE = { min: 20, max: 95 }; // see the header — outside these the hue handle goes dead
const PAIR = { fg: "color-accent", bg: "color-bg-surface" }; // the pair the exhibited rule secures

// --- DOM builder (annotated-source.mjs shape) — text via textContent, attrs via setAttribute.
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

export function renderDeriveProbe(container) {
  if (!container) throw new Error("derive-probe: a DOM container is required");
  container.textContent = ""; // mirror annotated-source.mjs — clear before (re)render

  const input = el("input", { type: "color", id: "asrc-probe-color", value: DEFAULT_BRAND });
  const brandHex = el("code", { class: "asrc-probe-hex", text: DEFAULT_BRAND });
  const swatch = el("span", { class: "asrc-probe-swatch", "aria-hidden": "true" });
  const accentHex = el("code", { class: "asrc-probe-hex" });
  const out = el("div", { class: "asrc-probe-out", "aria-live": "polite" });

  // Handle text is written by makeScrubbable's reflect() — left empty here on purpose.
  const hueEl = el("span", { class: "stage-scrub-handle", "data-scrub": "probe-hue" });
  const lightEl = el("span", { class: "stage-scrub-handle", "data-scrub": "probe-lightness" });
  const field = (labelText, handle) =>
    el("span", { class: "asrc-probe-field" },
      el("span", { class: "asrc-probe-slabel", text: labelText }), handle);

  container.appendChild(
    el("div", { class: "asrc-probe" },
      el("p", { class: "card-kicker", text: "the rule above, executed — system/derive.mjs running in this page" }),
      el("div", { class: "asrc-probe-row" },
        el("label", { class: "asrc-probe-label", for: "asrc-probe-color", text: "Brand colour" }),
        input,
        brandHex,
        el("span", { class: "asrc-probe-arrow", text: "→", "aria-hidden": "true" }),
        el("span", { class: "asrc-probe-label", text: "negotiated accent" }),
        swatch,
        accentHex),
      el("div", { class: "asrc-probe-scrub" },
        el("p", { class: "asrc-probe-cap",
          text: "Or drag these numbers instead. Both feed the same rule. Around the middle of the lightness range it hands the colour straight back; drag lightness up and the bounds start pulling the accent down again." }),
        field("Hue", hueEl),
        field("Lightness", lightEl)),
      out,
      el("p", { class: "asrc-probe-fixed", text: `the other three answers this rule normally gets are held still, so colour is the only thing changing: density ${FIXED.density} · reward ${FIXED.rewardType} · frequency ${FIXED.frequency}` })));

  // Assigned below, but referenced by onInput — which can only fire once the handles exist.
  let hueHandle, lightHandle;

  function run(hex) {
    const result = derive({ brandColor: hex, ...FIXED });
    const accent = result.tokens[PAIR.fg];
    brandHex.textContent = hex;
    // A registered <color> property (portfolio.css) so the swatch glides between derived accents
    // instead of snapping. The value is engine-emitted hex — the exhibit's one literal.
    swatch.style.setProperty("--asrc-probe-accent", accent);
    accentHex.textContent = accent;

    out.textContent = "";
    const check = result.checks.find((c) => c.fg === PAIR.fg && c.bg === PAIR.bg);
    if (check) {
      out.appendChild(el("p", { class: "asrc-probe-check",
        text: `accent as text on the derived card surface: ${check.ratio}:1 — AA needs ≥ ${check.min}:1 · ${check.pass ? "pass" : "fail (reported, not shipped)"}` }));
    }
    const notes = result.notes.filter((n) => typeof n.token === "string" && n.token.startsWith("color-accent"));
    if (notes.length) {
      const list = el("ul", { class: "asrc-probe-notes" });
      for (const n of notes) list.appendChild(el("li", { text: `${n.action} — ${n.why}` }));
      out.appendChild(list);
    } else {
      out.appendChild(el("p", { class: "asrc-probe-check", text: "no adjustment needed — this brand colour already clears every bound" }));
    }
  }

  // The one place the brand is set from a handle. input.value = … fires no `input` event, so
  // this can never loop back through onInput.
  function apply(hex) {
    input.value = hex;
    run(hex);
  }

  // Read the LIVE picker value at every interaction — never a cached "last hue" (scrub.mjs's
  // no-caching contract). || DEFAULT_HUE is the achromatic guard: hexToOklch pins a near-grey's
  // hue to 0, which would otherwise read as 0° and jump the handle.
  const readHue = () => {
    try { return Math.round(hexToOklch(input.value).h) || DEFAULT_HUE; }
    catch { return DEFAULT_HUE; }
  };
  const readL = () => {
    try { return Math.round(hexToOklch(input.value).l * 100); }
    catch { return Math.round(hexToOklch(DEFAULT_BRAND).l * 100); }
  };

  // Both onChanges spread the LIVE brand, so scrubbing one axis preserves the other two.
  // Deliberately plain bounded sliders, no 0/360 wrap — the same keyboard model as home's three
  // handles, and aria-valuemin/max stay honest.
  hueHandle = makeScrubbable(hueEl, {
    min: 0, max: 360, step: 2, unit: "°", label: "brand hue", read: readHue,
    onChange: (h) => apply(oklchToHex(toGamut({ ...hexToOklch(input.value), h }))),
  });
  lightHandle = makeScrubbable(lightEl, {
    min: L_RANGE.min, max: L_RANGE.max, step: 1, unit: "%", label: "brand lightness", read: readL,
    onChange: (v) => apply(oklchToHex(toGamut({ ...hexToOklch(input.value), l: v / 100 }))),
  });

  // The picker is the one path the handles don't already track: reflect() re-displays, it does
  // not re-derive. run() must NOT do this — see the header.
  const onInput = () => { run(input.value); hueHandle.reflect(); lightHandle.reflect(); };
  input.addEventListener("input", onInput);
  run(DEFAULT_BRAND);

  return {
    destroy() {
      hueHandle.destroy();
      lightHandle.destroy();
      input.removeEventListener("input", onInput);
      container.textContent = "";
    },
  };
}
