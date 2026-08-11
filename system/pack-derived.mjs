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
// #130: an IMPORTED pack shadows the derived one. Imported STRICTLY ONE WAY — pack-imported.mjs
// imports nothing back, so dock.mjs → pack-derived.mjs → pack-imported.mjs stays acyclic and the
// self-boot at the bottom of this file cannot be caught mid-graph.
import { IMPORT_CHANGE_EVENT, importedOnPage, readImported } from "./pack-imported.mjs";

// ---------------------------------------------------------------- contract (shared with #76)
// factory-pack        — the SELECTOR, shared with dock.mjs / pack-boot.js. A new "derived"
//                       value joins neutral (default no-op) / saulera / verdant / plusui.
// factory-pack-derived — the JSON record, independent of the selector so it survives a toggle
//                       to a committed pack and back (#76 re-offers "your brand" without re-entry).
// factory-pack-prewear — the committed pick that was active when derived was worn (#76), so
//                       unwear() puts back the pack they had instead of dropping them to neutral.
// factory-pack-derived-prewear — the visitor's OWN derived record, preserved when a shared link
//                       (#77) overwrites it. The record key can hold only one record and a worn
//                       brand must be THE record (pack-boot.js reads it pre-paint on every page),
//                       so the arrival displaces what is there; this is where it is kept so the
//                       dock can hand it back (#108). Never read pre-paint — pack-boot ignores it.
export const SELECTOR_KEY = "factory-pack";
export const RECORD_KEY = "factory-pack-derived";
export const PREWEAR_KEY = "factory-pack-prewear";
export const PREWEAR_RECORD_KEY = "factory-pack-derived-prewear";
export const RECORD_VERSION = 1;
export const NAME_MAX = 40;

// The committed picks the selector may hold. A pristine selector is ABSENT (null), not "neutral":
// pack-boot.js treats anything outside saulera/verdant/plusui/derived as the no-op default
// (VR-critical), so restoring "neutral" and removing the key are equivalent — we only ever write
// back what we read. Kept in step with dock.mjs's PACKS: a pack missing here is selectable but not
// RESTORABLE — unwearing "your brand" would drop the reader to neutral instead of what they had.
const COMMITTED = ["neutral", "saulera", "verdant", "plusui"];

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
export function buildRecord(hex, name, { origin } = {}) {
  return {
    v: RECORD_VERSION,
    source: "derived",
    label: sanitizeName(name) || "your brand",
    ts: Date.now(),
    brandColor: hex,
    tokens: deriveBrandTokens(hex),
    // Provenance, written ONLY by the shared-link path. An ABSENT field means the visitor entered
    // this colour themselves — which is also what every record stored before #108 means, so an
    // existing record needs no migration. Both validators (parseRecord below, pack-boot.js:31)
    // check v/source/tokens and ignore unknown fields, so this is invisible to every consumer
    // that does not ask for it.
    ...(origin === "shared" ? { origin: "shared" } : {}),
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
// The record shape check, shared by both keys so a preserved record can never be handed back on
// looser terms than the live one (it becomes the live one on restore).
function parseRecord(raw) {
  if (!raw) return null;
  let rec;
  try { rec = JSON.parse(raw); } catch { return null; }
  if (!rec || rec.v !== RECORD_VERSION || rec.source !== "derived" || !rec.tokens || typeof rec.tokens !== "object") {
    return null;
  }
  return rec;
}
export function readRecord() {
  let raw;
  try { raw = localStorage.getItem(RECORD_KEY); } catch { return null; }
  return parseRecord(raw);
}
// The record a shared link displaced, or null. Same validation as the live record, because a
// restore promotes this straight into RECORD_KEY.
export function readDisplacedRecord() {
  let raw;
  try { raw = localStorage.getItem(PREWEAR_RECORD_KEY); } catch { return null; }
  return parseRecord(raw);
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

// ------------------------------------------------- the record a shared link displaced (#108)
// preserveDisplacedRecord — called by hydrateFromSharedLink BEFORE it overwrites the record.
// Preserves ONLY a record the visitor authored: a second shared link must not offer the FIRST
// sender's colour back as "the colour you entered", which would be an affiliation claim by the
// back door. That one condition is correct in every ordering, because the visitor's own next
// colour entry clears the backup (see the colour handler below), so there is never a stale one
// to protect.
function preserveDisplacedRecord() {
  const outgoing = readRecord();
  if (!outgoing || outgoing.origin === "shared") return;
  try { localStorage.setItem(PREWEAR_RECORD_KEY, JSON.stringify(outgoing)); } catch { /* private mode — session-only */ }
}
// The visitor authored a colour of their own, so the preserved one is spent — restoring it after
// this would undo a pick they just made. Silent: the caller's writeRecord() emits the one change
// event, and the dock re-reads both keys from it.
export function clearDisplacedRecord() {
  try { localStorage.removeItem(PREWEAR_RECORD_KEY); } catch { /* private mode — session-only */ }
}
// Hand the preserved record back: it becomes THE record again and the backup is spent. Storage
// only — the caller owns the :root transition (the dock's selectPack, which is the one place
// allowed to move the page between packs). Returns the restored record, or null when there is
// nothing preserved.
export function restoreDisplacedRecord() {
  const rec = readDisplacedRecord();
  if (!rec) return null;
  // Remove BEFORE writeRecord: writeRecord emits BRAND_CHANGE_EVENT synchronously and the dock's
  // listener re-reads this key to decide whether to keep offering the restore. Emitting first
  // would leave the offer up over a spent backup.
  try { localStorage.removeItem(PREWEAR_RECORD_KEY); } catch { /* private mode — session-only */ }
  writeRecord(rec);
  return rec;
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
// Passed in rather than re-read so the arrival still reflects where localStorage is blocked and
// readRecord() cannot see what :root is wearing. It carries origin:"shared" like any other
// hydrated record, so the label below reads provenance from the record either way (#108); telling
// "the visitor's colour" from "a colour that arrived in a link" is no longer this argument's job.
function wireBeatBrand(sharedRec = null) {
  const beat = document.getElementById("beat-brand");
  if (!beat) return; // not this page — inert
  const colorInput = beat.querySelector("[data-brand-color]");
  const nameInput = beat.querySelector("[data-brand-name]");
  const wearToggle = beat.querySelector("[data-brand-wear]");
  const resetBtn = beat.querySelector("[data-brand-reset]");
  const label = beat.querySelector("[data-brand-label]");
  if (!colorInput || !label) return; // the two load-bearing nodes must exist

  // Arm the stage's colour crossfade (portfolio.css's #beat-brand #reskin-preview.is-animated,
  // gated behind no-preference there — so this class is added unconditionally and CSS decides).
  // Until #216 the armer was initIntake() at system/factory-intake.mjs:705; #216 deleted home's
  // wizard and its intake-beat.mjs caller, which left that block committed and DEAD — the derived
  // colours snapped instead of crossfading. Armed here because this module owns #beat-brand and
  // derives the very colours the block transitions. The rAF is PR #55's and is load-bearing: arm
  // one frame after mount so a worn record or a shared link — both applied synchronously above —
  // land on the first paint without animating in.
  requestAnimationFrame(() => beat.querySelector("#reskin-preview")?.classList.add("is-animated"));

  let current = null; // the --color-* map on :root right now (null ⇒ nothing to clear)
  // The record the name input was last filled from (ts|label). syncFromRoot re-runs on every pack
  // change, so without this it would rewrite the input from an UNCHANGED record — see below.
  let syncedSig = null;

  // Ask the dock to arbitrate a pick. Returns false when nothing claimed it (no dock on this page,
  // or it is not built yet) so the caller can fall back to the selector-only path.
  const requestPack = (target) =>
    !window.dispatchEvent(new CustomEvent(PACK_REQUEST_EVENT, { detail: { target }, cancelable: true }));

  // The beat's shown state ALWAYS matches :root — the invariant this control was written to hold.
  // On load it reflects only a WORN record (pack-boot applied it pre-paint); afterwards the dock
  // calls it again through PACK_CHANGE_EVENT, so a dock-driven clear can never leave the label
  // claiming a colour is on the stage (#103). `applied` is decided by derivedOnRoot, not by the
  // selector alone: the selector can say "derived" while the dock's clearRoot has already stripped
  // the props, and the label must follow the pixels.
  function syncFromRoot({ apply = false } = {}) {
    // An imported pack (#130) is what the page is WEARING, so the beat must not claim the
    // visitor's colour is on the stage — same invariant as #103, honoured the same way: read
    // ground truth, take the empty branch, add no flag. The record is untouched, so picking
    // "your brand" in the dock brings the colour straight back.
    const importedRec = readImported();
    if (importedRec && importedOnPage(importedRec)) {
      current = null;
      if (wearToggle) wearToggle.checked = false;
      setLabel(label, "empty", emptyLabel());
      return;
    }
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
      // Clear as well as set, but ONLY when the record changed. Restoring a record whose label is the
      // generic fallback must not leave a previous sender's company name in the input (#108) — and a
      // re-sync of the SAME record must not wipe a name the visitor is midway through typing. The name
      // reaches the record only on the next colour change, so an unconditional clear made the form's
      // own order (colour, then name, then "Wear it") erase the name on the wear, which also dropped it
      // out of the label's affiliation denial. ts|label is the identity: a restore brings a different
      // record, so it still clears. Never reset when the pack is unworn — a clear-then-re-wear would
      // then wipe the input the same way.
      const sig = rec.ts + "|" + rec.label;
      if (nameInput && sig !== syncedSig) {
        nameInput.value = rec.label && rec.label !== "your brand" ? rec.label : "";
      }
      syncedSig = sig;
      if (wearToggle) wearToggle.checked = true;
      if (apply) applyToRoot(current); // idempotent with pack-boot; covers a no-storage / no-pack-boot page
      const shownName = sanitizeName(nameInput ? nameInput.value : "");
      // Only the provenance clause differs: "your colour" is false for a colour that arrived in
      // someone else's link, and this label is what a recipient reads on arrival (#77, AC #3).
      // Provenance now lives ON the record (buildRecord stamps origin only on the shared-link path),
      // so it survives a dock round trip, a page navigation, and a restore, and it cannot get out of
      // step with what :root is wearing the way a closure flag could (#103's failure mode).
      if (rec.origin === "shared") setLabel(label, "shared", sharedLabel(shownName));
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
  // An import was worn, replaced or cleared in this same tab (#130). Same rule, same reflection:
  // storage events do not fire in the same tab, so this CustomEvent is the only way to hear it.
  window.addEventListener(IMPORT_CHANGE_EVENT, () => syncFromRoot());

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
    clearDisplacedRecord(); // their own colour now — the preserved one is spent (#108)
    writeRecord(record);    // emits the one change event, so the dock drops the offer in the same tick
    // This record was BUILT from the inputs, so they already agree — claim the signature so the next
    // syncFromRoot leaves the name box alone. Without this the first re-sync (the "Wear it" toggle)
    // reads a record it has never seen and clears a name typed after the colour.
    syncedSig = record.ts + "|" + record.label;
    if (wearToggle && wearToggle.checked) wear(); // keep wearing across a colour change
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
    rec = buildRecord(shared.brandColor, shared.name, { origin: "shared" });
  } catch (err) {
    // Nothing fails on stage: a refused colour leaves the committed pack exactly as it was.
    console.error("pack-derived: shared link colour refused — committed pack retained", err);
    return null;
  }
  // After the build, before the overwrite: a refused colour must preserve nothing, because the
  // visitor's own record survives untouched in that case and there is nothing to hand back (#108).
  preserveDisplacedRecord();
  applyToRoot(rec.tokens);
  writeRecord(rec);
  // Two different backups, two different keys. wear() backs up the displaced COMMITTED PICK in
  // PREWEAR_KEY so the dock's reset hands that pack back (#76); preserveDisplacedRecord above
  // backs up the displaced RECORD in PREWEAR_RECORD_KEY so the dock can hand the visitor's own
  // colour back (#108). A visitor already wearing their own brand has neither a committed pick to
  // displace nor a prev !== "derived" transition, which is exactly why the second key exists.
  wear();
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
