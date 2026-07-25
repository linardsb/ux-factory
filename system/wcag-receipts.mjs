// system/wcag-receipts.mjs — hand-written canon (this repo; not generated). The WCAG-receipt
// presentation, extracted from peak.mjs so two hosts share ONE receipt contract: the home peak
// (system/peak.mjs, epic #70 ticket #75) and the private-instance peak (system/instance.mjs,
// epic #70 ticket #81). Governing doc: docs/epics/portfolio-v3-experience.prd.md §6.1 beat 3.
//
// Why its own module rather than instance.mjs importing peak.mjs: peak.mjs imports pack-derived.mjs
// (transitively, via intake-beat.mjs too), whose module tail runs hydrateFromSharedLink() UNGUARDED
// by any mount — on a URL carrying ?brand=… it applies derived colours to :root, writes the record
// and calls wear(). On a private instance that would let a forwarded query param silently override
// the company's PINNED pack, which is the one thing that page must never lose. Extracting these ~45
// lines removes the hazard structurally rather than by comment.
//
// Pure + DOM-only: no imports at all (the caller passes derive()'s `checks` array), so importing
// this module can have no side effect anywhere. The el() builder below is deliberately duplicated
// from peak.mjs:89-99 — a 10-line private helper is a cheaper price than a shared dependency.

// The receipt rows a peak SHOWS — the pairs a reader sees on the light card screen (the rest of the
// 12 are page-chrome pairs). The headline pass-count is computed over ALL 12, and any FAILING pair
// is surfaced even when it is outside this set (the engine shows the gate working, never hides a
// reject — derive.rules.mjs ethos). Matched by the ruleset's verbatim `usage` strings.
export const RECEIPT_USAGES = [
  "body text on cards / alt sections",
  "captions on cards",
  "accent text on cards",
  "button label on an accent fill",
];

// Element builder — never innerHTML from data, so engine-/visitor-supplied strings stay inert text.
// (Duplicated from peak.mjs by design; see the header.)
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") n.textContent = v;
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
}

// Build the real receipts from derive().checks. Headline over ALL pairs; shown rows = the card-
// relevant subset plus any failing pair (surfaced honestly — never a hard-coded "Pass AA").
// The returned root carries class="peak-receipts" AND data-peak-receipts: both hosts replace their
// static seed by querying [data-peak-receipts], so the fresh node must be findable the same way.
export function buildReceipts(checks) {
  const total = checks.length;
  const passed = checks.filter((c) => c.pass).length;
  const allPass = passed === total;

  const shown = checks.filter((c) => RECEIPT_USAGES.includes(c.usage));
  for (const c of checks) if (!c.pass && !shown.includes(c)) shown.push(c); // never hide a reject

  const wrap = el("div", { class: "peak-receipts", "data-peak-receipts": true });
  wrap.appendChild(el("p", { class: `peak-receipts-headline${allPass ? "" : " is-flagged"}` },
    el("span", { class: "peak-receipts-mark", "aria-hidden": "true", text: allPass ? "✓" : "!" }),
    el("span", {
      text: allPass
        ? `All ${total} contrast pairs pass AA`
        : `${passed} of ${total} contrast pairs pass AA, ${total - passed} flagged`,
    })));

  for (const c of shown) {
    wrap.appendChild(el("div", { class: `wcag-row${c.pass ? "" : " is-fail"}` },
      el("span", { class: "wcag-pair", text: c.usage }),
      el("span", { class: "wcag-ratio", text: `${c.ratio.toFixed(2)}:1` }),
      el("span", { class: c.pass ? "wcag-pass" : "wcag-fail", text: c.pass ? "Pass AA" : "Fails AA" })));
  }
  return wrap;
}
