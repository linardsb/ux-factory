// system/studio-export.mjs — hand-written canon (this repo; not generated). The studio's SINGLE-FILE
// EXPORT (epic #202 — docs/epics/prototype-studio.architecture.md §Data model → "Export"; ticket
// #210; .claude/plans/studio-single-file-export-keep-rail-210.md; spike 3's verdict is
// .claude/reports/studio-export-keep-rail-210-spike3.md).
//
// One HTML document that RUNS: the composed product the reader just watched a recorded agent run
// assemble, with the token contract, the live pack and components.css inlined, arranged at the
// coordinates they left it at, opening cold from file:// with no server, no build step and no
// network request at all. It is a CLIENT-SIDE ASSEMBLY, never a build step and never an upload —
// the same three promises /build already makes, extended to a runnable artifact.
//
// The load-bearing calls made here, so #212 inherits them rather than re-arguing them:
//
//  1. NO MARKUP IS HAND-WRITTEN FOR THE PRODUCT. `slots[].html` is renderComposition's OWN output,
//     serialized by the caller with `new XMLSerializer().serializeToString(node)`. Serializing is a
//     READ, which is why it is not on build-checks group 7's sink list — that list bans markup SINKS
//     (writing a string into the live document), and this module hands its string to a Blob and to
//     nothing else. The alternative (clone into a container, read the container's markup) needs a
//     banned member, and the two forms were diffed in a real browser during spike 3: they differ by
//     exactly one inert `xmlns` attribute on the serialized root and render identically on chromium,
//     firefox and webkit. (Written without a leading dot on purpose where this paragraph names the
//     banned member: group 7 matches by plain substring over the WHOLE FILE, comments included.)
//
//  2. THE @import STRIP IS COMMENT-AWARE, and that is spike 3's finding rather than a nicety. The
//     plan specified `css.replace(/@import[^;]*;/g, "")`. Run over the real committed
//     system/tokens.saulera.css, that regex matches the word "@import" inside the pack's own HEADER
//     COMMENT (:17, prose: "@import must precede all rules") and consumes to the next ";" — which is
//     the real at-rule three lines later — taking the comment's closing marker with it. The comment
//     then stays open and swallows `:root {`, so the whole saulera pack drops out: measured at 449
//     sheet rules → 447, --color-amber empty, the accent falling back to the contract's #2563eb.
//     Silently, under a pack the appearance dock offers to every reader. The scanner below walks
//     comment spans instead, and build-checks group 17 asserts BOTH directions on the real files —
//     no surviving at-rule, AND saulera's own declarations still there.
//
//     The strip is not cosmetic: the live /factory page under saulera really does request
//     /fonts/fonts.css and really does get a failure (system/fonts/ does not exist; the pixel gate
//     records the same condition at visual.spec.mjs:123). An export is allowed to be smaller than
//     the site. It is not allowed to reach the network while claiming it does not.
//
//  3. VISITOR TOKEN VALUES GO THROUGH vetTokens, IMPORTED. system/pack-imported.mjs is the ONE
//     application point for every value a visitor supplies, on home, on /build and here. Its
//     VALUE_OK charset excludes `< > : ; { } " '`, which is exactly what makes a `</style>` breakout
//     impossible in the block below — that is a dependency, stated, not a coincidence. A second
//     escaping opinion in this file would be the bug, not the fix.
//
//  4. THE ARRANGEMENT IS THE STUDIO'S UNIQUE ARTIFACT, so it is CSS grid LINE PLACEMENT rather than
//     source order. MAX_COLS and MAX_ROWS are IMPORTED from studio-canvas.mjs and the placement
//     table is generated from them (group 12's rule: the caps are never re-literalled).
//
//  5. NO SCRIPT, NO NAV, NO ROUTER, NO fetch, NO history CALL. All three of those last ones throw or
//     fail on file://. #212 turns places into screens and connections into navigation and extends
//     `screens` from one entry to several — the seam is one array; the nav script is that ticket's.
//
//  6. ONE SCREEN. #207 compiles today's single pattern, so there is exactly one to export.
//
// TOTAL BY CONTRACT: null, garbage slots, a null css, a hostile token map → a valid document that
// honestly says nothing was composed. Never a throw (arrangeBoard / compileSteps / parseTrace's
// discipline, inherited).
//
// Node-import safe: this file touches no DOM at all, not even inside a function body — the DOM-side
// half is the caller's (system/studio-keep.mjs). tooling/build-checks.mjs group 17 drives it under
// Node over the REAL committed stylesheets.

import { vetTokens } from "./pack-imported.mjs";
import { MAX_COLS, MAX_ROWS } from "./studio-canvas.mjs";
import { NO_DESIGN_IMPORTED, TWO_CLAIMS } from "./build-keep.mjs";

// build-card.mjs:68's escape, copied for its reason: escape ONCE, at the template, and keep the two
// categories of string visibly apart. Everything routed through here is TEXT (a pattern label, a
// place count, a provenance sentence). The composed components' markup is NOT — it is already
// serialized DOM, and escaping it a second time is the exact bug build-card.mjs's "escaped once"
// note exists about.
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const num = (v, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
};

// stripImports(css) → css with every @import AT-RULE removed and every comment left intact.
//
// A scanner rather than a regex, for call 2 in the header. It walks the string once: inside a
// comment span it copies verbatim (so prose that merely mentions the at-rule is untouched), and
// outside one it drops from "@import" to the terminating semicolon. A comment that is never closed
// runs to the end of the string, which is what the browser's own parser does with it too.
//
// TOTAL: a non-string answers "".
export function stripImports(css) {
  if (typeof css !== "string" || !css) return "";
  let out = "";
  let i = 0;
  while (i < css.length) {
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i + 2);
      const stop = end === -1 ? css.length : end + 2;
      out += css.slice(i, stop);
      i = stop;
      continue;
    }
    if (css.startsWith("@import", i)) {
      const semi = css.indexOf(";", i);
      i = semi === -1 ? css.length : semi + 1;
      continue;
    }
    out += css[i];
    i += 1;
  }
  return out;
}

// The placement table, GENERATED from the imported caps. MAX_COLS × MAX_ROWS one-line rules, so a
// cell class exists for every address the canvas can hold and the export can never be handed a slot
// it has no rule for. This is what makes importing the caps load-bearing rather than decorative:
// widen the canvas and this table widens with it, in the same commit, with no edit here.
function placementRules() {
  const rules = [];
  for (let c = 1; c <= MAX_COLS; c += 1) {
    for (let r = 1; r <= MAX_ROWS; r += 1) {
      rules.push(`.sx-c${c}-r${r}{grid-column:${c};grid-row:${r}}`);
    }
  }
  return rules.join("");
}

// The export's own layout, and ALL of it. system/studio.css is deliberately not inlined: it carries
// canvas chrome — grab handles, zoom rows, the transport — that an exported product has no use for
// and would be lying about (there is nothing here to drag). Spike 3 checklist 6 confirmed this block
// is sufficient for the arrangement to survive; if it ever is not, widen this block rather than
// reaching for the page sheet.
//
// Token-only, like every sheet in this repo: the frame reads --spacing-*, --color-* and --type-*, so
// the export re-skins with the pack exactly as the site does.
const FRAME_CSS = `
.sx-page{max-width:none;padding:var(--spacing-xl, 32px);display:flex;flex-direction:column;gap:var(--spacing-xl, 32px)}
.sx-screen{display:grid;gap:var(--spacing-lg, 24px);justify-content:start;align-content:start}
.sx-empty{color:var(--color-fg-muted);max-width:60ch}
.sx-prov{border-top:1px solid var(--color-border);padding-top:var(--spacing-lg, 24px);max-width:78ch;color:var(--color-fg-muted);font-size:var(--type-small)}
.sx-prov h2{font-size:var(--type-h4)}
.sx-prov p{margin:0 0 var(--spacing-sm, 8px)}
.sx-facts{display:flex;flex-wrap:wrap;gap:var(--spacing-md, 16px);margin:0 0 var(--spacing-md, 16px);padding:0;list-style:none}
`;

// The sentence a document with nothing composed carries. An export of a board that compiles to
// nothing is still an honest artifact — it is an empty document that SAYS it is empty, which is the
// out-of-library card's discipline applied to a file (pattern-render.mjs's retained refusal).
const NOTHING_COMPOSED = "This board did not compile to any components, so this file carries none. "
  + "Nothing was mocked up in their place — an empty document that says it is empty is a truer "
  + "artifact than a drawn one that is not the product.";

// The font sentence, and it is spike 3's MEASURED one rather than the deduced one it replaces. The
// pack's declared families are token VALUES and they travel in the inlined pack; the self-hosted
// face a pack may @import (saulera does) is stripped — and that file is missing from the running
// site too, so the studio and this document fall back to the same next entry in the same stack.
// Measured side by side under saulera on all three engines. Nothing was lost here that the site has.
const FONT_NOTE = "The type is this pack's own declared families, inlined with the rest of its token "
  + "values. A pack may also reference a self-hosted face file; that reference is stripped, because a "
  + "file that reaches the network is not a file that runs anywhere. On this site's packs it changes "
  + "nothing you can see — the referenced file is absent from the running site as well, so the studio "
  + "and this document fall back to the same stack.";

// exportHtml({ title, css, inlineTokens, slots, meta }) → a complete HTML document, as a string.
//
//   title         text — the pattern's label. Visitor-influenced, so escaped as TEXT.
//   css           the three stylesheets already concatenated, fetched DOM-side and passed in.
//                 @import-stripped HERE rather than by the caller: one place decides, and group 17
//                 asserts the OUTPUT rather than the input.
//   inlineTokens  { "--color-accent": "#…" } read off the live [data-build-stage]. An imported or a
//                 DERIVED pack lives here and NOT in any stylesheet (build-import.mjs:153 writes the
//                 stage, never :root), so an export that inlined only the sheet would be faithful
//                 under neutral and wrong under everything a visitor brings.
//   slots         [{ col, row, html }] — html is renderComposition's serialized own output.
//   meta          { patternLabel, places, affordances, connections, packLabel, hasVisitorTokens,
//                   builtOn } for the provenance block. Every number COUNTED by the caller from the
//                 board, none invented (pattern-rules.mjs's honesty rule, inherited).
export function exportHtml({ title, css, inlineTokens, slots, meta } = {}) {
  const m = meta && typeof meta === "object" ? meta : {};
  const label = typeof title === "string" && title.trim() ? title.trim() : "A prototype from ux factory";

  // Only slots that carry BOTH a real on-grid address and real serialized markup. A slot that
  // carries neither is dropped rather than guessed at — placing it at 1,1 would be this file
  // inventing an arrangement, which is the one thing the arrangement must never be.
  const cells = [];
  let maxCol = 0;
  let maxRow = 0;
  for (const slot of Array.isArray(slots) ? slots : []) {
    if (!slot || typeof slot !== "object") continue;
    const col = num(slot.col, MAX_COLS);
    const row = num(slot.row, MAX_ROWS);
    if (col === null || row === null) continue;
    if (typeof slot.html !== "string" || !slot.html) continue;
    if (col > maxCol) maxCol = col;
    if (row > maxRow) maxRow = row;
    // slot.html is SERIALIZED DOM and is emitted verbatim. The class name is built from two
    // integers this function validated, so nothing visitor-supplied reaches an attribute here.
    cells.push(`<div class="sx-cell sx-c${col}-r${row}">${slot.html}</div>`);
  }

  const vetted = vetTokens(inlineTokens || {});
  const decls = Object.entries(vetted.tokens).map(([k, v]) => `${k}:${v};`).join("");

  // The grid is sized to what is actually on it, and the cells are addressed by generated class.
  // `min-content` rows rather than equal ones, so an empty row between two occupied ones collapses
  // instead of leaving a band of nothing the reader has to scroll past.
  const screenCss = cells.length
    ? `.sx-screen{grid-template-columns:repeat(${maxCol},minmax(0,22rem));grid-template-rows:repeat(${maxRow},min-content)}`
    : "";

  const facts = [
    ["Places", m.places], ["Affordances", m.affordances], ["Connections", m.connections],
  ].filter(([, v]) => Number.isFinite(v))
    .map(([term, v]) => `<li><strong>${esc(term)}</strong> ${esc(String(v))}</li>`)
    .join("");

  // THE CLAIM BRANCH. build-keep.mjs's TWO_CLAIMS says "the TOKEN VALUES above are yours" — which is
  // only TRUE when the visitor actually brought a design. At rest on /factory nobody has, and the
  // export wears the site's own pack, so printing it there would be the one dishonest line in the
  // artifact. specMarkdown branches at exactly this point for exactly this reason; this inherits the
  // branch rather than inventing a second rule about when a claim is honest.
  const claims = m.hasVisitorTokens
    ? `${esc(`Wearing: ${m.packLabel || "your own design values"}.`)} ${TWO_CLAIMS.map((line) => esc(line)).join(" ")}`
    : esc(`${NO_DESIGN_IMPORTED} The components and the token values here are both this site's, so `
      + "there is no second claim to make about whose design work this is.");

  const body = cells.length
    ? `<main class="sx-screen">\n${cells.join("\n")}\n</main>`
    : `<main class="sx-screen"><p class="sx-empty">${esc(NOTHING_COMPOSED)}</p></main>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(label)}</title>
<style>${stripImports(css)}</style>
<style>:root{${decls}}</style>
<style>${placementRules()}${FRAME_CSS}${screenCss}</style>
</head>
<body class="sx-page">
${body}
<footer class="sx-prov">
<h2>${esc(label)}</h2>
<ul class="sx-facts">${facts}</ul>
<p>${esc("Assembled in your own browser on the /factory studio page of ux factory, from the same "
  + "stylesheets and the same renderer that page uses. Nothing was uploaded — the shipped site is "
  + "static and has nowhere to upload to. No model was called, at view time or any other time.")}</p>
<p>${esc(`The components were composed by the committed rules in system/pattern-rules.mjs and `
  + `validated against the generated component vocabulary before any of them reached the page. `
  + `They are arranged here at the coordinates you left them at on the canvas.`)}</p>
<p>${claims}</p>
<p>${esc(FONT_NOTE)}</p>
${m.builtOn ? `<p>${esc(`Built ${m.builtOn}.`)}</p>` : ""}
</footer>
</body>
</html>
`;
}
