// system/pack-imported.mjs — the IMPORTED-pack record: a design a reader dropped on the home
// page, mapped by system/pack-import.mjs and worn across the visit (#130,
// .claude/plans/public-drop-to-reskin.md). The sibling of system/pack-derived.mjs, same shape.
//
// The record contract, and why each part is what it is:
//
//   sessionStorage["factory-pack-imported"] =
//   { v: 1, source: "imported", slug: "acme", label: "Acme", fileName: "acme-tokens.json",
//     ts: 1753500000000,
//     tokens: { "--color-accent": "#4f46e5", "--spacing-md": "16px",
//               "--type-h1": "clamp(28px, 4vw, 44px)", "--shadow-md": "0px 4px 8px #00000014" },
//     note:   "<the pack header, verbatim — what the download carries>",
//     report: { placed, scales, checks, failures, derivedUsed, collapsed, filled, rejected } }
//
// 1. sessionStorage, NOT localStorage (owner call). Per tab, survives same-tab navigation, gone
//    on tab close — which is the lifecycle a reader trying someone else's site expects.
// 2. The imported record does NOT use the `factory-pack` selector. pack-boot.js checks
//    sessionStorage FIRST and returns; only with no imported record does it fall through to the
//    existing localStorage path. Three things fall out, all good: a new tab is a guaranteed no-op
//    (which is exactly what the visual-regression harness needs from pack-boot.js), the reader's
//    committed/derived pick is SHADOWED rather than destroyed, and un-wearing the import restores
//    their previous pack for free.
// 3. Therefore #108's preserveDisplacedRecord/restoreDisplacedRecord machinery is NOT used and NOT
//    extended. "One worn thing at a time" is satisfied by shadowing, and "restore what I had" is
//    satisfied by the dock rows themselves — strictly better than a restore button over a record
//    that was never displaced.
// 4. `tokens` holds ONLY entries that passed vetTokens, and report.rejected names any that did
//    not. Validation happens ONCE, at build time, so the record can never carry something the
//    pre-paint boot would silently drop — and the beat can report the drop honestly.
// 5. `css` is NOT stored. The download re-emits from the engine's own values + note + the
//    contract. Nothing that reaches the DOM as CSS is ever read back out of storage as CSS.
//
// Node-import-safe: document/sessionStorage are referenced only inside function bodies, and this
// module self-boots NOTHING — it is a library the beat, the dock and pack-derived.mjs call.

export const IMPORTED_KEY = "factory-pack-imported";
export const IMPORTED_VERSION = 1;
export const STYLE_ID = "factory-pack-imported-style";
// Same-tab change signal, for the same reason pack-derived.mjs has one: `storage` events fire
// only in OTHER tabs, so this CustomEvent is the only way the dock hears about a write here.
export const IMPORT_CHANGE_EVENT = "factory-import-change";

// The per-entry allowlist. MIRRORED IN SHAPE in pack-boot.js (a classic script cannot import a
// module, so the two predicates are kept identical by hand — the same arrangement pack-derived.mjs
// and pack-boot.js already have for the derived record).
//
// The KEY list is the five families this engine actually imports. Fonts, motion, maxw and gutter
// are deliberately absent: they never import (handover §B G3/G4), they arrive only as contract
// auto-fill, and admitting them would put a font stack — `"Segoe UI"`, quotes and all — through a
// value check it cannot pass, so every import would report "3 values could not be applied safely"
// about tokens the design never offered. Restricting the keys is what keeps `rejected` honest.
const KEY_NAME = /^--(color|spacing|radius|type|shadow)-[a-z0-9-]{1,32}$/;
// The VALUE charset is MEASURED, not guessed: across tokens.contract/neutral/verdant/plusui/saulera
// the values of those five families use only " #%(),-.0123456789" + letters, and the longest is 63
// characters (measured 2026-07-26; re-measure if the contract gains a family). `/` is admitted for
// the modern `rgb(0 0 0 / 10%)` form a design's shadow colour may legitimately use — composeShadow
// passes that string through verbatim, which is the whole reason a per-entry validator exists
// rather than a type check. Everything that could break out of a declaration is excluded:
// ; { } @ \ < > : ' " * &  — and with `*` excluded, `/` cannot open a comment either.
const VALUE_OK = /^[a-zA-Z0-9 #%(),.\/+-]{1,160}$/;
// ...and one negative guard the charset alone cannot express, because `url(` needs no colon to
// reach the network. `url(//host/x.png)` is protocol-relative: every character in it is in the
// class above, so VALUE_OK passes it, and a --color-* value lands in a `background: var(--color-bg)`
// shorthand that expands it into a real third-party GET. Nothing executes and no page content
// leaves (`?` and `&` are excluded, so there is no query string) — but the request happens, and
// /build states at rest that nothing is uploaded. A false sentence rendered on the one page whose
// argument is that its claims are checkable is the bug, whatever the CVSS says.
//
// `url(javascript:x)` was already rejected — on the COLON, which is what hid this: the tamper
// battery's only url() case was the one that could never have got through, so a green gate was
// manufacturing confidence about a function it had never actually tested.
//
// Rejecting `url(` also kills image-set() and cross-fade(), which need a url() inside (their
// string forms need quotes, already excluded). `//` goes too, so a protocol-relative host cannot
// arrive through some other function. Nothing real regresses: no committed pack carries `url(` in
// a token VALUE (the only one in the CSS is saulera's @import header, and `@` is excluded anyway),
// and none of the five families — colour, spacing, radius, type, shadow — is an image property.
// Found by an adversarial review of #137's share link (PR #145); the hole predates it, on home's
// drop surface, and a link is what made it remotely triggerable.
const VALUE_BAD = /url\s*\(|\/\//i;

// vetTokens(map) → { tokens, rejected, skipped }.
//
// The two outcomes are kept APART on purpose, and the distinction is an honesty one:
//   rejected — a token this importer DOES map, whose value could not be applied safely. This is
//              the reader's business and the beat names each one. It is the case the validator
//              exists for: composeShadow passes a design's shadow colour string through verbatim.
//   skipped  — a token outside the five imported families (fonts, motion, layout). These never
//              import by design and arrive only as contract auto-fill, so counting them as
//              "values your design offered that could not be applied" would be a false alarm
//              about tokens the design never offered — and every single import would raise it.
export function vetTokens(map) {
  const tokens = {};
  const rejected = [];
  const skipped = [];
  for (const [key, value] of Object.entries(map || {})) {
    if (!KEY_NAME.test(key)) {
      skipped.push(key);
      continue;
    }
    if (typeof value !== "string" || !VALUE_OK.test(value) || VALUE_BAD.test(value)) {
      rejected.push({ key, value: String(value), why: "the value uses characters or functions a token value never needs, so it is not applied" });
      continue;
    }
    tokens[key] = value;
  }
  return { tokens, rejected, skipped };
}

// buildImportedRecord — built, never hand-written. `values` is the engine's full contract map
// (unprefixed contract names); the record carries the --prefixed, vetted subset plus whatever the
// vet dropped, so the beat can report both.
export function buildImportedRecord({ slug, label, fileName, values, note, report, ts }) {
  const prefixed = {};
  for (const [name, value] of Object.entries(values || {})) prefixed["--" + name] = value;
  const { tokens, rejected } = vetTokens(prefixed);
  return {
    v: IMPORTED_VERSION,
    source: "imported",
    slug,
    label,
    fileName,
    ts: ts ?? Date.now(),
    tokens,
    note,
    report: { ...report, rejected },
  };
}

function parseRecord(raw) {
  if (!raw) return null;
  let rec;
  try { rec = JSON.parse(raw); } catch { return null; }
  if (!rec || rec.v !== IMPORTED_VERSION || rec.source !== "imported" || !rec.tokens || typeof rec.tokens !== "object") {
    return null;
  }
  return rec;
}

// All storage access is try/catch: private mode degrades to this-page-only, and never throws.
export function readImported() {
  let raw;
  try { raw = sessionStorage.getItem(IMPORTED_KEY); } catch { return null; }
  return parseRecord(raw);
}
export function writeImported(rec) {
  try { sessionStorage.setItem(IMPORTED_KEY, JSON.stringify(rec)); } catch { /* private mode — this page only */ }
  emitImportChange();
}
export function clearImported() {
  try { sessionStorage.removeItem(IMPORTED_KEY); } catch { /* private mode — this page only */ }
  removeImportedStyle();
  emitImportChange();
}

function emitImportChange() {
  if (typeof window === "undefined") return; // Node import — no bus to announce on
  window.dispatchEvent(new CustomEvent(IMPORT_CHANGE_EVENT));
}

// applyImported — build the rule from the VETTED entries and set it via textContent, never
// innerHTML. Appended to the END of <head> every time, rather than left wherever it already sits:
// the rule and a pack stylesheet are equal-specificity :root rules, so the later one in document
// order wins, and re-appending means it lands last at call time no matter what a page's head
// order is. (pack-boot.js cannot do this — it runs parser-blocking, so only the elements above
// its own tag exist yet. Its correctness rests on that tag being last in <head>, which is
// measured across all seven pages that load it and recorded in its header.)
export function applyImported(rec) {
  if (!rec || !rec.tokens) return;
  const entries = Object.entries(rec.tokens);
  if (!entries.length) return;
  const rule = ":root {\n" + entries.map(([k, v]) => `  ${k}: ${v};`).join("\n") + "\n}\n";
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
  }
  style.dataset.ts = String(rec.ts);
  style.textContent = rule;
  document.head.appendChild(style); // last in <head> — see above
}

export function removeImportedStyle() {
  if (typeof document === "undefined") return;
  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();
}

// An INLINE custom property on :root outranks a <style> rule, so an imported pack is only
// actually worn once nothing inline is still setting the tokens it carries. Two things put
// values there: a worn "your brand" derived pack, and the hero's ~1.2s canned re-skin on home
// (spine.mjs) — which the hero's own stand-down cannot help with once it has already applied,
// because a reader can wear an import in the middle of that hold. Clearing by FAMILY rather than
// by a known key list is what makes this independent of who wrote them.
export function clearInlineTokens() {
  if (typeof document === "undefined") return;
  const style = document.documentElement.style;
  // Iterate a copy: removeProperty mutates the live list underneath the index.
  for (const name of [...style]) {
    if (KEY_NAME.test(name)) style.removeProperty(name);
  }
}

// Ground truth, the same rule derivedOnRoot follows: is this record what the page is WEARING right
// now? The element must exist AND carry this record's timestamp — a stale style from a superseded
// import must never let the dock claim the current record is on the stage.
export function importedOnPage(rec) {
  if (!rec || typeof document === "undefined") return false;
  const style = document.getElementById(STYLE_ID);
  return Boolean(style) && style.dataset.ts === String(rec.ts);
}

// Wear / un-wear. Deliberately thin: the DOCK owns the transition between packs (#102), so these
// only touch the record and the style element, exactly as pack-derived's wear/unwear only touch
// the selector. unwearImported KEEPS the record, matching pack-derived.mjs:182-188 — reset stops
// wearing but leaves the row on offer, so a reader can put the design back without re-dropping it.
export function wearImported(rec) {
  writeImported(rec);
  applyImported(rec);
}
export function unwearImported() {
  removeImportedStyle();
  emitImportChange();
}
