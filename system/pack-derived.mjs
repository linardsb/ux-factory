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
import { decodeShareState } from "./share-state.mjs";
import { trackFactoryArrived } from "./analytics.mjs";

// ---------------------------------------------------------------- contract (shared with #76)
// factory-pack        — the SELECTOR, shared with dock.mjs / pack-boot.js. A new "derived"
//                       value joins neutral (default no-op) / saulera / verdant.
// factory-pack-derived — the JSON record, independent of the selector so it survives a toggle
//                       to a committed pack and back (#76 re-offers "your brand" without re-entry).
// factory-pack-prewear — the committed pick that was active when derived was worn (#76), so
//                       unwear() puts back the pack they had instead of dropping them to neutral.
export const SELECTOR_KEY = "factory-pack";
export const RECORD_KEY = "factory-pack-derived";
export const PREWEAR_KEY = "factory-pack-prewear";
export const RECORD_VERSION = 1;
export const NAME_MAX = 40;

// The committed picks the selector may hold. A pristine selector is ABSENT (null), not "neutral":
// pack-boot.js treats anything outside saulera/verdant/derived as the no-op default (VR-critical),
// so restoring "neutral" and removing the key are equivalent — we only ever write back what we read.
const COMMITTED = ["neutral", "saulera", "verdant"];

// Same-tab change signal. The `storage` event fires only in OTHER tabs, so the dock (#76) cannot
// learn about this beat's writes any other way — every mutation of the record or the selector
// announces itself here and the dock re-reads state. Listeners REFLECT state; they never re-apply
// it (wear() below dispatches, so an applying listener would re-enter its own caller).
export const BRAND_CHANGE_EVENT = "factory-brand-change";
// Beat → dock: "arbitrate this pick for me." #76's selectPack owns the one transition — clearRoot
// first, "your brand" always on the NEUTRAL base, every mutation inside the view-transition callback.
// The beat must not grow a second copy of that rule (#102), so it asks instead of re-implementing.
// cancelable: the dock calls preventDefault() to claim the request, which is how the beat learns a
// dock was actually listening and can fall back to the selector-only path when none is.
export const PACK_REQUEST_EVENT = "factory-pack-request";
// Dock → beat: "the pack changed under you, and :root is final." The contract used to run one way
// only (dock listened to the beat, never the reverse), so the beat's label kept claiming a colour was
// on the stage after the dock had cleared it (#103). Emitted only once BOTH the swap has settled and
// the selector is written, so a listener reading ground truth can never catch a half-applied state.
export const PACK_CHANGE_EVENT = "factory-pack-change";
function emitBrandChange() {
  if (typeof window === "undefined") return; // Node import — no bus to announce on
  window.dispatchEvent(new CustomEvent(BRAND_CHANGE_EVENT));
}

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
// Is the stored record's colour set the one actually sitting on :root right now? The ground-truth
// test, shared by the dock's groundTruth() and the beat's syncFromRoot() — ONE implementation, so the
// two surfaces can never disagree about what the page is wearing (#103; it lived only in dock.mjs).
// Also rules out the hero's ~1.2s canned re-skin (spine.mjs), whose values are the demo brand's.
export function derivedOnRoot(rec) {
  const entries = rec && rec.tokens ? Object.entries(rec.tokens) : [];
  if (!entries.length) return false;
  const style = document.documentElement.style;
  return entries.every(([k, v]) => style.getPropertyValue(k) === v);
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
  emitBrandChange(); // the dock offers "your brand" the moment a record exists, with no reload
}
// The "forget" primitive. No UI calls it yet — #76's reset stops WEARING but deliberately keeps the
// record, so "your brand" stays on offer without re-entering a colour; nothing in its acceptance set
// asks the control to forget. Kept as the seam a later forget affordance wires to.
export function clearRecord() {
  try { localStorage.removeItem(RECORD_KEY); } catch { /* private mode — session-only */ }
  emitBrandChange();
}

// ---------------------------------------------------------------- selector: wear / unwear
// wear() makes the whole site wear the derived pack (pack-boot re-applies it pre-paint on nav) and
// backs up the committed pick it displaces, so unwear() can hand it back (#76; #74 shipped without
// the backup and knowingly dropped that pick to neutral).
// The backup is written ONLY on the derived transition: wear() re-fires on every colour change while
// the beat toggle is on (see the colour listener below), and a second write would replace a genuine
// pre-wear pick with "derived" and lose it for good.
export function wear() {
  try {
    const prev = localStorage.getItem(SELECTOR_KEY);
    if (prev !== "derived") {
      if (COMMITTED.includes(prev)) localStorage.setItem(PREWEAR_KEY, prev);
      else localStorage.removeItem(PREWEAR_KEY); // pristine/foreign selector — nothing to hand back
    }
    localStorage.setItem(SELECTOR_KEY, "derived");
  } catch { /* private mode — session-only */ }
  emitBrandChange();
}
// unwear() stops wearing — but only touches the selector if the derived pack is still the active
// selection, so it never clobbers a saulera/verdant choice a visitor made in the dock AFTER wearing
// derived. The pre-wear pack comes back (or the selector goes absent, which pack-boot reads as the
// neutral no-op default), and the backup is spent either way.
export function unwear() {
  try {
    if (localStorage.getItem(SELECTOR_KEY) === "derived") {
      const prewear = localStorage.getItem(PREWEAR_KEY);
      if (COMMITTED.includes(prewear)) localStorage.setItem(SELECTOR_KEY, prewear);
      else localStorage.removeItem(SELECTOR_KEY);
      localStorage.removeItem(PREWEAR_KEY);
    }
  } catch { /* private mode — session-only */ }
  emitBrandChange();
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
// A shared link (#77) puts the SENDER's colour on the stage, so "your colour" would be false —
// and this is the label a recipient actually sees on arrival, because the close card's own note
// sits below the fold. Same affiliation denial as appliedLabel; only the provenance clause changes.
function sharedLabel(name) {
  const notOfficial = name ? `not ${name}'s official design system` : "not an official design system";
  return `This colour came from a shared link and was derived again in this browser. It is a demo, ${notOfficial}.`;
}
function setLabel(node, state, text) {
  node.dataset.state = state;
  node.textContent = text; // textContent — the name can never become markup
}

// sharedRec — the record hydrateFromSharedLink() just built and applied, or null on a normal load.
// Passed in rather than re-read so the beat can tell "this colour is the visitor's" from "this
// colour arrived in a link", which are two different honest labels (AC #3), and so the arrival
// reflects even where localStorage is blocked and readRecord() cannot see what :root is wearing.
function wireBeatBrand(sharedRec = null) {
  const beat = document.getElementById("beat-brand");
  if (!beat) return; // not this page — inert
  const colorInput = beat.querySelector("[data-brand-color]");
  const nameInput = beat.querySelector("[data-brand-name]");
  const wearToggle = beat.querySelector("[data-brand-wear]");
  const resetBtn = beat.querySelector("[data-brand-reset]");
  const label = beat.querySelector("[data-brand-label]");
  if (!colorInput || !label) return; // the two load-bearing nodes must exist

  let current = null; // the --color-* map on :root right now (null ⇒ nothing to clear)

  // Ask the dock to arbitrate a pick. Returns false when nothing claimed it (no dock on this page,
  // or it is not built yet) so the caller can fall back to the selector-only path.
  const requestPack = (target) =>
    !window.dispatchEvent(new CustomEvent(PACK_REQUEST_EVENT, { detail: { target }, cancelable: true }));

  // Provenance, not state (#77): true while the colour on show is the one a shared link brought in.
  // The record is identical either way, so this flag is the only thing that can tell the label where
  // the colour came from. It survives a dock round trip, because a pack toggle does not change where
  // the colour came from, and is cleared the moment the visitor enters a colour of their own.
  let fromSharedLink = Boolean(sharedRec);

  // The beat's shown state ALWAYS matches :root — the invariant this control was written to hold.
  // On load it reflects only a WORN record (pack-boot applied it pre-paint); afterwards the dock
  // calls it again through PACK_CHANGE_EVENT, so a dock-driven clear can never leave the label
  // claiming a colour is on the stage (#103). `applied` is decided by derivedOnRoot, not by the
  // selector alone: the selector can say "derived" while the dock's clearRoot has already stripped
  // the props, and the label must follow the pixels.
  function syncFromRoot({ apply = false } = {}) {
    const stored = readRecord();
    // On the load call a shared record stands in for storage: hydration applied it to :root a moment
    // ago, so it IS what the page wears even where localStorage refused the write (#77). Without
    // this the beat would say "pick a colour" over a page that is visibly wearing one.
    const rec = stored || (apply ? sharedRec : null);
    const selected = stored ? selectorIsDerived() : Boolean(rec); // no storage ⇒ no selector to read
    const worn = Boolean(rec) && selected && (apply ? true : derivedOnRoot(rec));
    if (rec && worn) {
      current = rec.tokens;
      if (rec.brandColor) colorInput.value = rec.brandColor;
      if (nameInput && rec.label && rec.label !== "your brand") nameInput.value = rec.label;
      if (wearToggle) wearToggle.checked = true;
      if (apply) applyToRoot(current); // idempotent with pack-boot; covers a no-storage / no-pack-boot page
      const shownName = sanitizeName(nameInput ? nameInput.value : "");
      // Only the provenance clause differs: "your colour" is false for a colour that arrived in
      // someone else's link, and this label is what a recipient reads on arrival (#77, AC #3).
      if (fromSharedLink) setLabel(label, "shared", sharedLabel(shownName));
      else setLabel(label, "applied", appliedLabel(shownName));
    } else {
      current = null; // stop believing we own keys the dock has already removed — a stale `current`
      if (wearToggle) wearToggle.checked = false; // would make the next colour change clear the wrong keys
      setLabel(label, "empty", emptyLabel());
    }
  }

  // Load: trust the selector and (re-)apply, the #74 behaviour — at this point the hero may not have
  // finished its revert, so derivedOnRoot would read false against a record that pack-boot did apply.
  syncFromRoot({ apply: true });

  // The dock changed the pack (or cleared our colours) — re-read ground truth. REFLECT ONLY: this
  // never requests a pack back, so the two listeners cannot ping-pong.
  window.addEventListener(PACK_CHANGE_EVENT, () => syncFromRoot());

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
    fromSharedLink = false; // their own colour now, whatever a link put here first (#77)
    setLabel(label, "applied", appliedLabel(sanitizeName(name)));
  });

  // Stop wearing. The pre-wear pick must be read BEFORE unwear(), which spends the backup.
  // Routed through the dock so the page re-bases onto the pack we hand back instead of keeping the
  // neutral base "your brand" was riding — the mirror of the wear path below.
  function stopWearing() {
    let prewear = null;
    try { prewear = localStorage.getItem(PREWEAR_KEY); } catch { /* private mode */ }
    const target = COMMITTED.includes(prewear) ? prewear : "neutral";
    if (!requestPack(target)) unwear(); // no dock — selector only, the #74 behaviour
  }

  // Wear across the site → the dock's selectPack, which enforces "your brand always rides the NEUTRAL
  // base" and clears :root first (#102). Before this, wear() only wrote the selector, so toggling while
  // saulera/verdant was active left the derived --color-* props sitting on THAT pack's sheet and blended
  // its ~26 non-colour tokens (type/space/radius) into "your brand" until the next navigation, when
  // pack-boot finally re-pointed the head line. The beat and the next page disagreed about the same brand.
  if (wearToggle) {
    wearToggle.addEventListener("change", () => {
      if (!current) { wearToggle.checked = false; return; }
      if (wearToggle.checked) {
        if (!requestPack("derived")) wear(); // no dock on this page — selector only, as before
      } else stopWearing();
    });
  }

  // Reset → stop wearing + clear :root, but KEEP the record (#76 re-offers it). Back to the empty beat.
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clearRoot(current);
      current = null;
      stopWearing(); // same re-base as the toggle, so reset cannot leave a neutral base behind either
      if (wearToggle) wearToggle.checked = false;
      if (nameInput) nameInput.value = "";
      colorInput.value = colorInput.defaultValue; // the at-rest value from the HTML
      setLabel(label, "empty", emptyLabel());
    });
  }
}

// ---------------------------------------------------------------- shared-link arrival (#77)
// A shared link carries the sender's INPUTS, so the receiving browser re-derives the palette with
// the real engine rather than trusting a colour set from a URL (system/share-state.mjs explains
// the trade). Returns the hydrated record, or null when the URL carries no usable brand.
//
// ORDERING IS LOAD-BEARING, and the <script> tag order in index.html reads as the opposite of what
// makes it work: pack-derived's own tag sits AFTER spine.mjs. What puts this first is dock.mjs —
// it statically imports this module (dock.mjs:23-26) and its tag precedes spine's, so this whole
// module body evaluates before spine's does. That matters because spine.mjs registers the hero with
// activateOn:'load', registerBeat calls activate() synchronously (spine.mjs:56), and heroBeat reads
// isWearingDerived() before its first await (spine.mjs:137). With wear() already written, the guard
// is true and the hero skips its canned re-skin instead of overwriting the shared brand and then
// stripping it on revert. If a future change ever breaks that order the failure is graceful, not
// silent: wireBeatBrand's MutationObserver below re-applies the colour when the hero's revert lands.
function hydrateFromSharedLink() {
  const shared = decodeShareState(location.search);
  if (!shared?.brandColor) return null;
  let rec;
  try {
    rec = buildRecord(shared.brandColor, shared.name);
  } catch (err) {
    // Nothing fails on stage: a refused colour leaves the committed pack exactly as it was.
    console.error("pack-derived: shared link colour refused — committed pack retained", err);
    return null;
  }
  applyToRoot(rec.tokens);
  writeRecord(rec);
  wear(); // backs the displaced committed pick up in PREWEAR_KEY, so the dock's reset hands it back
  // Fired from the success path only, so the count means "a shared link landed and re-derived",
  // never "a link arrived and was refused". Deferred inside the helper — see analytics.mjs.
  trackFactoryArrived();
  // "Your brand" always rides the NEUTRAL base (#102). A returning recipient may have had saulera or
  // verdant selected, in which case pack-boot.js re-pointed the head line pre-paint and these props
  // would blend that pack's non-colour tokens into the shared brand until the next navigation. The
  // dock owns that transition and must not be re-implemented here, but it is not built yet — we are
  // mid-import of its dependency. So ask on the next task, once it is listening. Unclaimed (no dock
  // on this page) this is a no-op, the same fallback the beat's own toggle takes, and on a pristine
  // recipient the base is already neutral so the dock's swap is a re-apply with nothing to load.
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent(PACK_REQUEST_EVENT, { detail: { target: "derived" }, cancelable: true }));
  }, 0);
  return rec;
}

// Self-boot behind a DOM guard so a Node import (drift-check's node --check, any harness) stays clean.
if (typeof document !== "undefined") wireBeatBrand(hydrateFromSharedLink());
