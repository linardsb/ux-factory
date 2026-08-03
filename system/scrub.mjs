// system/scrub.mjs — hand-written canon (this repo; not generated). The scrub primitive:
// drag a number, or arrow-key it, and watch the generated system respond (epic #164 ticket
// #169 — docs/epics/prototyping-feel-uplift.architecture.md §New pieces "Scrub values").
// makeScrubbable() wires one element as a WAI-ARIA slider driven by pointer delta or keys;
// the guarded home mount below renders three of them under the intake stage's #reskin-preview:
// brand hue re-runs the REAL derivation engine (system/derive.mjs) per change; corner radius
// and spacing set the contract's own tokens directly — the caption on the page says which is
// which (honesty contract). #174 imports makeScrubbable for approach's derive probe and
// ignores the mount.
//
// LAST-WRITER-WINS with the intake wizard: both write custom properties on #reskin-preview
// (the factory-intake.mjs:282 seam), so whoever acted last owns the preview — the documented,
// honest interplay, not a bug. The handles cache NOTHING: every interaction start (pointerdown,
// each keydown step) and every focusin calls read() — the live computed value — so a wizard
// re-run can never leave a handle fighting or displaying stale state.
//
// Node-import safe: no top-level DOM access outside the guarded init (derive-probe posture).
// portfolio.css owns every class; this module injects no <style> and rebuilds no DOM per tick.

import { derive } from "./derive.mjs";
import { hexToOklch, oklchToHex, toGamut } from "./oklch.mjs";
import { getHomeAnswers } from "./intake-beat.mjs";

// --- the primitive ---------------------------------------------------------------------------

const PX_PER_STEP = 3; // drag gain: one step per 3px of pointer travel

// Wire `handle` as a scrubbable number. read() is the caller's "current computed value" getter —
// called at every interaction start and on focus, never cached (see header). onChange(value)
// receives clamped, step-quantized values; pointer-move calls are rAF-throttled.
export function makeScrubbable(handle, { min, max, step, read, unit = "", label, format, onChange }) {
  const fmt = format || ((v) => `${v}${unit}`);
  const clamp = (v) => Math.min(max, Math.max(min, Math.round(v / step) * step));

  handle.setAttribute("role", "slider");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", label);
  handle.setAttribute("aria-valuemin", String(min));
  handle.setAttribute("aria-valuemax", String(max));

  const reflect = (v) => {
    handle.setAttribute("aria-valuenow", String(v));
    if (unit) handle.setAttribute("aria-valuetext", fmt(v));
    handle.textContent = fmt(v);
  };
  const apply = (v) => { reflect(v); onChange(v); };

  let base = 0, startX = 0, dragging = false, raf = 0, pending = 0;
  const wiring = new AbortController();
  const { signal } = wiring;

  handle.addEventListener("pointerdown", (e) => {
    // A frame still pending from the previous drag would apply that drag's stale value on top
    // of this one's fresh read.
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    base = clamp(read());
    startX = e.clientX;
    dragging = true;
    reflect(base);
    handle.setPointerCapture(e.pointerId);
  }, { signal });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    pending = clamp(base + Math.round((e.clientX - startX) / PX_PER_STEP) * step);
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; apply(pending); });
  }, { signal });
  const end = () => { dragging = false; };
  handle.addEventListener("pointerup", end, { signal });
  handle.addEventListener("pointercancel", end, { signal });

  handle.addEventListener("keydown", (e) => {
    const cur = clamp(read());
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = clamp(cur + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = clamp(cur - step);
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    if (next === null) return;
    e.preventDefault();
    apply(next);
  }, { signal });

  // A keyboard user landing here sees the LIVE value, not whatever was last scrubbed.
  handle.addEventListener("focusin", () => reflect(clamp(read())), { signal });

  reflect(clamp(read()));
  // reflect() is exposed (not just set()) for a call site whose value can change from OUTSIDE the
  // handle — approach's probe, where the colour picker writes the same brand the handles read.
  // set() would fire onChange and round-trip the reader's picked colour through OKLCH, perturbing
  // it; reflect() re-reads and re-displays only. The home mount below ignores the return value.
  return {
    set: (v) => apply(clamp(v)),
    reflect: () => reflect(clamp(read())),
    destroy: () => { wiring.abort(); cancelAnimationFrame(raf); },
  };
}

// --- the home stage mount --------------------------------------------------------------------

// The wizard's non-brand defaults (scenarios/verdant — same set spine.mjs's canned axes carry),
// used only until the wizard has published its first live answer set.
const DEFAULT_AXES = { brandColor: "#2f7a4d", density: "comfortable", rewardType: "self", frequency: "daily" };

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

function mountStageScrub() {
  const host = document.querySelector("[data-stage-scrub]");
  const preview = document.getElementById("reskin-preview");
  if (!host || !preview) return;

  const prop = (name) => getComputedStyle(preview).getPropertyValue(name).trim();
  const propPx = (name, fallback) => {
    const v = parseFloat(prop(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const setPx = (name, v) => preview.style.setProperty(name, `${Math.round(v)}px`);

  // The hue base is the brief's brand colour (the wizard's live one once it has run); the hue
  // handle reads the PREVIEW's computed accent instead — derive() negotiates lightness and
  // chroma but preserves hue, so the accent tracks whatever was last derived, wizard run or
  // scrub alike (the wizard's own answers never learn a scrubbed hue). Defensive ||0 / catch:
  // hexToOklch pins near-achromatic hue to 0, and an unparsable computed value (a worn derived
  // pack can hold non-hex colour formats) falls back to the brief's brand hue.
  const brandHex = () => (getHomeAnswers() ?? DEFAULT_AXES).brandColor.toLowerCase();
  const readHue = () => {
    try { return Math.round(hexToOklch(prop("--color-accent"))?.h) || 0; }
    catch { try { return Math.round(hexToOklch(brandHex()).h) || 0; } catch { return 0; } }
  };

  const row = (labelText, handleAttrs) => {
    const handle = el("span", { class: "stage-scrub-handle", ...handleAttrs });
    host.appendChild(el("span", { class: "stage-scrub-field" },
      el("span", { class: "stage-scrub-label", text: labelText }), handle));
    return handle;
  };

  host.appendChild(el("p", { class: "stage-scrub-cap",
    text: "Or drag the numbers. Hue re-runs the live derivation engine; radius and spacing set the system's tokens directly. Running the brief again takes the stage back." }));

  // Deliberately a plain BOUNDED slider, no 0/360 wrap: all three rows share one keyboard
  // model (Home/End are real endpoints), and aria-valuemin/max stay honest.
  makeScrubbable(row("Brand hue", { "data-scrub": "hue" }), {
    min: 0, max: 360, step: 2, unit: "°", label: "brand hue", read: readHue,
    onChange: (h) => {
      const lch = toGamut({ ...hexToOklch(brandHex()), h });
      const { tokens } = derive({ ...(getHomeAnswers() ?? DEFAULT_AXES), brandColor: oklchToHex(lch) });
      for (const [k, v] of Object.entries(tokens))
        if (k.startsWith("color-")) preview.style.setProperty("--" + k, v);
    },
  });

  makeScrubbable(row("Corner radius", { "data-scrub": "radius" }), {
    min: 0, max: 24, step: 1, unit: "px", label: "corner radius",
    read: () => propPx("--radius-md", 8),
    onChange: (v) => { setPx("--radius-md", v); setPx("--radius-lg", v * 1.5); },
  });

  makeScrubbable(row("Spacing", { "data-scrub": "spacing" }), {
    min: 2, max: 32, step: 1, unit: "px", label: "spacing",
    read: () => propPx("--spacing-md", 16),
    onChange: (v) => { setPx("--spacing-sm", v / 2); setPx("--spacing-md", v); setPx("--spacing-lg", v * 1.5); },
  });
}

if (typeof document !== "undefined") mountStageScrub();
