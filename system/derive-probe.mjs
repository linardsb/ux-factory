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

import { derive } from "./derive.mjs";

// The colour is the probe's one variable; the other intake answers are held fixed and named in
// the strip. The default brand is light enough that the clamp + the darkening fire at rest.
const FIXED = { density: "comfortable", rewardType: "self", frequency: "weekly" };
const DEFAULT_BRAND = "#8ecf6a";
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
      out,
      el("p", { class: "asrc-probe-fixed", text: `other intake answers held fixed: density ${FIXED.density} · reward ${FIXED.rewardType} · frequency ${FIXED.frequency}` })));

  function run(hex) {
    const result = derive({ brandColor: hex, ...FIXED });
    const accent = result.tokens[PAIR.fg];
    brandHex.textContent = hex;
    swatch.setAttribute("style", `background:${accent}`); // engine-emitted hex — the exhibit's one literal
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

  const onInput = () => run(input.value);
  input.addEventListener("input", onInput);
  run(DEFAULT_BRAND);

  return { destroy() { input.removeEventListener("input", onInput); container.textContent = ""; } };
}
