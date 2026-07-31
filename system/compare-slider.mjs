// system/compare-slider.mjs — before/after compare-slider primitive, hand-written canon (this repo; not generated).
// Spec: docs/epics/prototyping-feel-uplift.architecture.md §New pieces (slider row: two overlaid
//       layers + clip-path divider, pointer + keyboard; img-comparison-slider rejected — shadow DOM
//       fights token-only CSS). Epic #164, ticket #170 — closes #170.
//
// A pure library module: exports one factory, self-boots NOTHING, and touches `document` only
// inside the function body (Node-import-safe, same shape as pack-imported.mjs). The two mount
// hosts — brand-import.mjs (home report) and derivation-roundtrip.mjs (factory + /roundtrip) —
// build their own layer content and hand it in; this file owns only the comparison mechanics.
//
// The whole position state is ONE custom property on the root, `--cmp-pos`: the overlay's
// clip-path and the divider's `left` both derive from it in CSS (portfolio.css .cmp-*), so the
// two can never desync mid-drag, and the keyboard-step glide transitions both uniformly.

// ARIA slider pattern (w3.org/WAI/ARIA/apg/patterns/slider/): role="slider" + tabindex="0" on the
// handle, aria-valuemin/max/now + aria-valuetext kept current on EVERY position write — a focused
// slider's value changes are announced by AT automatically.
export function createCompareSlider({ base, overlay, baseLabel, overlayLabel, label, initial = 50 }) {
  const div = (cls) => {
    const n = document.createElement("div");
    n.className = cls;
    return n;
  };

  const root = div("cmp");
  const baseLayer = div("cmp-layer cmp-base");
  const overLayer = div("cmp-layer cmp-over");
  baseLayer.append(base);
  overLayer.append(overlay);

  // Corner tags: the overlay is clipped from the RIGHT (visible left of the divider), so its tag
  // sits top-left; the base shows right of the divider, tag top-right. Labels are host-supplied
  // display text and land via textContent only.
  const overTag = div("cmp-tag cmp-tag-over");
  overTag.textContent = overlayLabel;
  const baseTag = div("cmp-tag cmp-tag-base");
  baseTag.textContent = baseLabel;
  overLayer.append(overTag);
  baseLayer.append(baseTag);

  const divider = div("cmp-divider");
  const handle = div("cmp-handle");
  handle.setAttribute("role", "slider");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", label);
  handle.setAttribute("aria-valuemin", "0");
  handle.setAttribute("aria-valuemax", "100");
  divider.append(handle);

  root.append(baseLayer, overLayer, divider);

  // The one write point: clamp, then update the custom property + both ARIA values together.
  let pos = Math.min(100, Math.max(0, initial));
  function setPos(pct) {
    pos = Math.min(100, Math.max(0, pct));
    root.style.setProperty("--cmp-pos", `${pos}%`);
    const rounded = Math.round(pos);
    handle.setAttribute("aria-valuenow", String(rounded));
    handle.setAttribute("aria-valuetext", `${rounded}% — ${overlayLabel}`);
  }
  setPos(pos);

  // Pointer: down anywhere on the root jumps the divider there and starts a drag (dragging the
  // image, not just the thumb, is the expected affordance in every reference compare tool).
  // The rect is re-read per move — layout can shift under a live drag.
  const pctFromX = (clientX) => {
    const rect = root.getBoundingClientRect();
    return rect.width ? ((clientX - rect.left) / rect.width) * 100 : pos;
  };
  root.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    root.setPointerCapture(e.pointerId);
    root.classList.add("is-dragging");
    setPos(pctFromX(e.clientX));
  });
  root.addEventListener("pointermove", (e) => {
    if (root.classList.contains("is-dragging")) setPos(pctFromX(e.clientX));
  });
  const release = () => root.classList.remove("is-dragging");
  root.addEventListener("pointerup", release);
  root.addEventListener("pointercancel", release);

  // Keyboard on the handle: 5-point steps, Home/End to the clamps. preventDefault on handled
  // keys only, so Tab and everything else pass through untouched.
  const STEP = 5;
  const KEYS = {
    ArrowLeft: () => pos - STEP, ArrowDown: () => pos - STEP,
    ArrowRight: () => pos + STEP, ArrowUp: () => pos + STEP,
    Home: () => 0, End: () => 100,
  };
  handle.addEventListener("keydown", (e) => {
    const next = KEYS[e.key];
    if (!next) return;
    e.preventDefault();
    setPos(next());
  });

  return root;
}
