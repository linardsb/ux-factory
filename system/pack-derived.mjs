// system/pack-derived.mjs — the D5b "your brand" derived-pack record + #beat-brand wiring
// (epic #70 ticket #74 · PRD §6.1 D3/D5b · architecture "Your-brand persistence = (b)").
// A visitor enters a brand COLOUR (+ an optional name, label-only); the real view-time
// derive() engine turns it into a full WCAG-checked colour set, applied stage-side to
// :root so the whole site can wear it. This module owns the record (serialised to
// localStorage) and the in-beat control; system/pack-boot.js re-applies a WORN record
// pre-paint on every page. Colour tokens ONLY — spacing/type from a colour input would
// reflow the page (mirror spine.mjs's isColorToken filter).
//
// Honesty (hard, architecture boundary "Honesty labeling for derived brands"): the derived
// pack is always labelled derived-on-this-page, never an official design system; a visitor
// name renders ONLY inside that label as inert capped textContent, never as an affiliation
// claim; the colour is the only thing derive() ever sees, and nothing is sent anywhere.
//
// Node-import-safe: the helpers reference document/localStorage only inside function bodies,
// and the DOM wiring self-boots behind a `typeof document` guard at the very bottom — so the
// parse check (node --check) and any Node harness import cleanly.

import { derive } from "./derive.mjs";

// ---------------------------------------------------------------- contract (shared with #76)
// factory-pack        — the SELECTOR, shared with dock.mjs / pack-boot.js. A new "derived"
//                       value joins neutral (default no-op) / saulera / verdant.
// factory-pack-derived — the JSON record, independent of the selector so it survives a toggle
//                       to a committed pack and back (#76 re-offers "your brand" without re-entry).
export const SELECTOR_KEY = "factory-pack";
export const RECORD_KEY = "factory-pack-derived";
export const RECORD_VERSION = 1;
export const NAME_MAX = 40;

// The three throwaway non-brand axes derive() also requires. Only color-* is ever used, so
// these values never reach the page — they exist to satisfy the engine's bounded input.
export const DEFAULT_AXES = { density: "comfortable", rewardType: "self", frequency: "daily" };

// The per-entry allowlist, mirrored in SHAPE from pack-boot.js (a classic script can't import
// this module, so the two predicates are kept identical by hand): every applied key a --color-
// custom property, every value a concrete hex. derive() emits exactly this, so keeping the record
// to this shape makes the stage-side apply and the pre-paint re-apply set an IDENTICAL token set;
// applyToRoot re-checks it per entry so a foreign entry gets the SAME scrutiny on both appliers.
const KEY_NAME = /^--color-[a-z0-9-]+$/;
const HEX_VALUE = /^#[0-9a-fA-F]{3,8}$/;

// ---------------------------------------------------------------- pure helpers

// deriveBrandTokens(hex) → { "--color-accent": "#…", … }. Runs the REAL engine; throws exactly
// as derive() does on a non-#rrggbb hex (validation is the caller's honest error path, not swallowed).
// Filtered to color-* tokens with a concrete HEX value. derive() also returns five static
// color-mix() relatives (e.g. --color-fg-on-inverse-muted = mix of var(--color-fg-on-inverse)):
// those are brand-INDEPENDENT, live in the always-loaded contract layer (tokens.contract.css:43-47),
// and self-heal off the hex bases we DO set — so re-applying them inline would be redundant and
// they'd fail pack-boot's hex allowlist on navigation, splitting home from every other page.
export function deriveBrandTokens(hex) {
  const { tokens } = derive({ brandColor: hex, ...DEFAULT_AXES });
  const out = {};
  for (const [k, v] of Object.entries(tokens)) {
    if (k.startsWith("color-") && HEX_VALUE.test(v)) out["--" + k] = v;
  }
  return out;
}

// sanitizeName — visitor input, so trim + hard-cap. Rendered via textContent only; empty → "".
export function sanitizeName(name) {
  return typeof name === "string" ? name.trim().slice(0, NAME_MAX) : "";
}

// buildRecord — the architecture's record contract, built (never hand-written). label falls back
// to the honest generic when no name is given; tokens are the --prefixed colour set. brandColor
// keeps the RAW visitor input (the tokens carry the NEGOTIATED accent, which can differ a lot from
// the entered hex) so the picker restores what they actually chose; pack-boot ignores this field.
export function buildRecord(hex, name) {
  return {
    v: RECORD_VERSION,
    source: "derived",
    label: sanitizeName(name) || "your brand",
    ts: Date.now(),
    brandColor: hex,
    tokens: deriveBrandTokens(hex),
  };
}

// ---------------------------------------------------------------- :root apply / clear
// Inline custom properties on <html> outrank the contract + pack layers, so applying the
// derived colour set re-skins the whole page live (dock.mjs's committed-pack line-swap and
// this coexist last-write-wins — see the plan's integration notes). Per-entry KEY_NAME + HEX_VALUE
// check mirrors pack-boot.js:34-37 so a foreign/tampered record entry never reaches :root here
// when pack-boot would reject it on the next page — a clean derived record passes every entry.
export function applyToRoot(tokens) {
  const style = document.documentElement.style;
  for (const [k, v] of Object.entries(tokens || {})) {
    if (KEY_NAME.test(k) && typeof v === "string" && HEX_VALUE.test(v)) style.setProperty(k, v);
  }
}
export function clearRoot(tokens) {
  const style = document.documentElement.style;
  for (const k of Object.keys(tokens || {})) style.removeProperty(k);
}

// ---------------------------------------------------------------- record read / write / clear
// All localStorage access is try/catch (private mode → session-only, mirror dock.mjs:65).
export function readRecord() {
  let raw;
  try { raw = localStorage.getItem(RECORD_KEY); } catch { return null; }
  if (!raw) return null;
  let rec;
  try { rec = JSON.parse(raw); } catch { return null; }
  if (!rec || rec.v !== RECORD_VERSION || rec.source !== "derived" || !rec.tokens || typeof rec.tokens !== "object") {
    return null;
  }
  return rec;
}
export function writeRecord(rec) {
  try { localStorage.setItem(RECORD_KEY, JSON.stringify(rec)); } catch { /* private mode — session-only */ }
}
// The "forget" primitive (#76 owns the UI for it); #74's reset stops WEARING but keeps the record.
export function clearRecord() {
  try { localStorage.removeItem(RECORD_KEY); } catch { /* private mode — session-only */ }
}

// ---------------------------------------------------------------- selector: wear / unwear
// wear() makes the whole site wear the derived pack (pack-boot re-applies it pre-paint on nav).
export function wear() {
  try { localStorage.setItem(SELECTOR_KEY, "derived"); } catch { /* private mode — session-only */ }
}
// unwear() stops wearing — but only touches the selector if the derived pack is still the active
// selection, so it never clobbers a saulera/verdant choice a visitor made in the dock AFTER wearing
// derived. It does NOT restore a committed pick made BEFORE: wear() overwrites the selector with no
// backup, so that earlier choice is already gone and a reload lands on neutral. That pre-wear lost-
// pick is a known #76 transient (the redesigned selector there arbitrates prewear/derived properly);
// #74 accepts it under the plan's last-write-wins selector model (NOTES §"Why one selector key").
export function unwear() {
  try {
    if (localStorage.getItem(SELECTOR_KEY) === "derived") localStorage.removeItem(SELECTOR_KEY);
  } catch { /* private mode — session-only */ }
}
function selectorIsDerived() {
  try { return localStorage.getItem(SELECTOR_KEY) === "derived"; } catch { return false; }
}

// ---------------------------------------------------------------- #beat-brand control (#74)
// The minimal in-beat affordance so persistence is self-testable; #76 owns the polished global
// pack selector (and re-offering a not-worn stored record). The beat's shown state always MATCHES
// :root: on load it reflects only a WORN record (which pack-boot already applied pre-paint), so the
// label never claims "wearing" over a neutral site.

// Honest label copy (humanizer: no dashes, active voice, plain words). The visitor name is inert
// capped textContent and appears ONLY inside these strings — never as an affiliation claim.
const emptyLabel = () => "Pick a colour. The demo derives a full palette and checks every contrast pair. Nothing you enter leaves your browser.";
const errorLabel = () => "That colour could not be used. Pick another one.";
function appliedLabel(name) {
  const notOfficial = name ? `not ${name}'s official design system` : "not an official design system";
  return `Your colour is on the stage, derived into a full palette. It is a demo, ${notOfficial}.`;
}
function setLabel(node, state, text) {
  node.dataset.state = state;
  node.textContent = text; // textContent — the name can never become markup
}

function wireBeatBrand() {
  const beat = document.getElementById("beat-brand");
  if (!beat) return; // not this page — inert
  const colorInput = beat.querySelector("[data-brand-color]");
  const nameInput = beat.querySelector("[data-brand-name]");
  const wearToggle = beat.querySelector("[data-brand-wear]");
  const resetBtn = beat.querySelector("[data-brand-reset]");
  const label = beat.querySelector("[data-brand-label]");
  if (!colorInput || !label) return; // the two load-bearing nodes must exist

  let current = null; // the --color-* map on :root right now (null ⇒ nothing to clear)

  // Reflect only a WORN record on load, so the beat matches :root (pack-boot already applied it).
  const rec = readRecord();
  if (rec && selectorIsDerived()) {
    current = rec.tokens;
    if (rec.brandColor) colorInput.value = rec.brandColor;
    if (nameInput && rec.label && rec.label !== "your brand") nameInput.value = rec.label;
    if (wearToggle) wearToggle.checked = true;
    applyToRoot(current); // idempotent with pack-boot; covers a no-storage / no-pack-boot page
    setLabel(label, "applied", appliedLabel(sanitizeName(nameInput ? nameInput.value : "")));
  } else {
    setLabel(label, "empty", emptyLabel());
  }

  // The #72 hero re-skins :root then REVERTS (~1.2s in) by removeProperty()-ing the same --color-*
  // keys — so a colour entered during that window gets stripped when the hero finishes. The hero
  // touches :root only until it signals data-spine="ready", so re-assert our colour once, then.
  // Reads the hero's DOM handle only (no spine.mjs import — #74 stays independent, task 4b's fix
  // is on the hero side; this is its mirror on the input side).
  const heroEl = document.getElementById("beat-hero");
  if (heroEl && heroEl.dataset.spine !== "ready") {
    const obs = new MutationObserver(() => {
      if (heroEl.dataset.spine !== "ready") return;
      obs.disconnect();
      if (current) applyToRoot(current); // restore whatever is applied when the hero's revert lands
    });
    obs.observe(heroEl, { attributes: true, attributeFilter: ["data-spine"] });
  }

  // Enter a colour → derive + apply stage-side + store the record. Worn only if the toggle is on.
  colorInput.addEventListener("change", () => {
    const name = nameInput ? nameInput.value : "";
    let record;
    try {
      record = buildRecord(colorInput.value, name);
    } catch (err) {
      // Unreachable via the native picker (always #rrggbb); the honest error path if it ever throws.
      console.error(err);
      setLabel(label, "error", errorLabel());
      return;
    }
    clearRoot(current);
    current = record.tokens;
    applyToRoot(current);
    writeRecord(record);
    if (wearToggle && wearToggle.checked) wear(); // keep wearing across a colour change
    setLabel(label, "applied", appliedLabel(sanitizeName(name)));
  });

  // Wear across the site → toggle the selector. Only meaningful once a colour is applied.
  if (wearToggle) {
    wearToggle.addEventListener("change", () => {
      if (!current) { wearToggle.checked = false; return; }
      if (wearToggle.checked) wear(); else unwear();
    });
  }

  // Reset → stop wearing + clear :root, but KEEP the record (#76 re-offers it). Back to the empty beat.
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clearRoot(current);
      current = null;
      unwear();
      if (wearToggle) wearToggle.checked = false;
      if (nameInput) nameInput.value = "";
      colorInput.value = colorInput.defaultValue; // the at-rest value from the HTML
      setLabel(label, "empty", emptyLabel());
    });
  }
}

// Self-boot behind a DOM guard so a Node import (drift-check's node --check, any harness) stays clean.
if (typeof document !== "undefined") wireBeatBrand();
