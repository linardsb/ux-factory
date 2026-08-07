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
//  4. THE PRODUCT'S LAYOUT IS THE BOARD'S OWN ORDER (#212): screens in board order, each screen's
//     components in the board's affordance order — "no new bytes", the epic architecture's line.
//     Canvas coordinates deliberately do NOT travel: the share link (`g`, #208) is the arrangement
//     carrier per the epic PRD §3, and the provenance block below claims no geometry this file no
//     longer carries. (#210's grid placement table went with them — a flow's screens are not cells.)
//
//  5. NO SCRIPT, NO ROUTER, NO fetch, NO history CALL — all of which throw or fail on file://. #212
//     turned places into screens and connections into navigation, and the sanctioned nav-script
//     seam was NOT taken: navigation is fragment-only anchors (`#s<k>`), and one-screen-at-a-time
//     is CSS — `.sx-flow:has(:target) .sx-screen:not(:target){display:none}`, written in the
//     HAS-HIDES direction on purpose, so an engine without :has() hides nothing and degrades to
//     every screen stacked with working fragment jumps, never a blank page.
//
// TOTAL BY CONTRACT: null, garbage screens, a null css, a hostile token map → a valid document that
// honestly says nothing was composed. Never a throw (arrangeBoard / compileSteps / parseTrace's
// discipline, inherited).
//
// Node-import safe: this file touches no DOM at all, not even inside a function body — the DOM-side
// half is the caller's (system/studio-keep.mjs). tooling/build-checks.mjs group 17 drives it under
// Node over the REAL committed stylesheets.

import { vetTokens } from "./pack-imported.mjs";
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

// stripImports(css) → css with every @import AT-RULE removed and every comment left intact.
//
// A scanner rather than a regex, for call 2 in the header. It walks the string once: inside a
// comment span it copies verbatim (so prose that merely mentions the at-rule is untouched), and
// outside one it drops from "@import" to the terminating semicolon. A comment that is never closed
// runs to the end of the string, which is what the browser's own parser does with it too.
//
// IT IS STRING-BLIND, and that is a limit rather than parser-equivalence: `/*`, `@import` and `;`
// are treated as structural wherever they appear, including inside a CSS string literal or a
// `url()`, so `@import url("a;b.css")` would stop at the quoted semicolon. Unreachable on this
// page's inputs — three fixed literals plus a href matched against studio-keep.mjs's PACK_LINK_RE,
// and all six committed sheets are clean — and the fix if it ever is reachable is to teach this
// scanner about quote spans, not to reach for a regex again (PR #241 review, Low 6).
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

// The export's own layout, and ALL of it. system/studio.css is deliberately not inlined: it carries
// canvas chrome — grab handles, zoom rows, the transport — that an exported product has no use for
// and would be lying about (there is nothing here to drag). If this block ever proves insufficient,
// widen it rather than reaching for the page sheet.
//
// Token-only, like every sheet in this repo: the frame reads --spacing-*, --color-* and --type-*, so
// the export re-skins with the pack exactly as the site does.
//
// THE LAST RULE IS THE FLOW'S WHOLE PRESENTATION, and its direction is load-bearing (header call 5):
// once a navigation is followed, only the targeted screen shows — written as has-HIDES, so an engine
// without :has() simply hides nothing and the document degrades to every screen stacked, fragment
// jumps still working. The other direction (has-shows) would blank the page on those engines.
const FRAME_CSS = `
.sx-page{max-width:none;padding:var(--spacing-xl, 32px);display:flex;flex-direction:column;gap:var(--spacing-xl, 32px)}
.sx-flow{display:flex;flex-direction:column;gap:var(--spacing-xl, 32px)}
.sx-screen{display:grid;gap:var(--spacing-lg, 24px);grid-template-columns:minmax(0,22rem);justify-content:start;align-content:start}
.sx-screen-name{margin:0;font-size:var(--type-h4)}
.sx-screen-empty{color:var(--color-fg-muted);max-width:60ch;margin:0}
.sx-nav{display:flex;flex-direction:column;gap:var(--spacing-sm, 8px);align-items:flex-start}
.sx-nav a{color:var(--color-accent)}
.sx-empty{color:var(--color-fg-muted);max-width:60ch}
.sx-prov{border-top:1px solid var(--color-border);padding-top:var(--spacing-lg, 24px);max-width:78ch;color:var(--color-fg-muted);font-size:var(--type-small)}
.sx-prov h2{font-size:var(--type-h4)}
.sx-prov p{margin:0 0 var(--spacing-sm, 8px)}
.sx-facts{display:flex;flex-wrap:wrap;gap:var(--spacing-md, 16px);margin:0 0 var(--spacing-md, 16px);padding:0;list-style:none}
.sx-flow:has(:target) .sx-screen:not(:target){display:none}
`;

// The sentence a document with nothing composed carries. An export of a board that compiles to
// nothing is still an honest artifact — it is an empty document that SAYS it is empty, which is the
// out-of-library card's discipline applied to a file (pattern-render.mjs's retained refusal).
const NOTHING_COMPOSED = "This board did not compile to any components, so this file carries none. "
  + "Nothing was mocked up in their place — an empty document that says it is empty is a truer "
  + "artifact than a drawn one that is not the product.";

// Rule S4's surface sentence (#212): a place with no affordances is still a screen — it can be a
// connection's destination — and this is what that screen says instead of invented content.
// Declared HERE, in the DOM-free leaf, and imported by system/studio-flow.mjs for the canvas,
// because the two surfaces make the same statement about the same board fact and a second sentence
// would be this studio giving two accounts of one thing (VOCAB_UNAVAILABLE's own argument, #210).
export const EMPTY_SCREEN = "Nothing to act on here. The board drew this place as a destination "
  + "with no work in it, and this screen says so rather than inventing content.";

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

// exportHtml({ title, css, inlineTokens, screens, meta }) → a complete HTML document, as a string.
//
//   title         text — the flow's (entry pattern's) label. Visitor-influenced, so escaped as TEXT.
//   css           the three stylesheets already concatenated, fetched DOM-side and passed in.
//                 @import-stripped HERE rather than by the caller: one place decides, and group 17
//                 asserts the OUTPUT rather than the input.
//   inlineTokens  { "--color-accent": "#…" } read off the live [data-build-stage]. An imported or a
//                 DERIVED pack lives here and NOT in any stylesheet (build-import.mjs:153 writes the
//                 stage, never :root), so an export that inlined only the sheet would be faithful
//                 under neutral and wrong under everything a visitor brings.
//   screens       [{ name, type, slots: [{ html }], nav: [{ label, target }] }] — one entry per
//                 screen, in BOARD ORDER; html is renderComposition's serialized own output, in the
//                 board's affordance order; `target` is the 1-based index of the destination screen.
//   meta          { patternLabel, screens, places, affordances, connections, packLabel,
//                   hasVisitorTokens } for the provenance block. Every number COUNTED by the caller
//                 from the board, none invented (pattern-rules.mjs's honesty rule, inherited).
//
// NO TIMESTAMP, NO COUNTER, NO RUN ID anywhere in this document, and that is a contract rather than
// an omission: two exports of the same board must be byte-identical, which build-checks group 17
// asserts. specMarkdown interpolates a build date and is allowed to — it is a different artifact
// with a different claim. A `builtOn` field was drafted for this meta and deliberately dropped: no
// caller filled it, and a determinism claim with an unfilled escape hatch in it is not one.
export function exportHtml({ title, css, inlineTokens, screens, meta } = {}) {
  const m = meta && typeof meta === "object" ? meta : {};
  const label = typeof title === "string" && title.trim() ? title.trim() : "A prototype from ux factory";

  // Only screens that are objects; within one, only slots carrying real serialized markup and only
  // nav entries carrying a real 1-based index. Junk is dropped rather than guessed at, and the
  // second pass below drops any nav entry pointing past the last section — every href this file
  // emits resolves to a section IN it, which is the one structural claim a fragment-only navigation
  // has to make.
  const shown = [];
  for (const screen of Array.isArray(screens) ? screens : []) {
    if (!screen || typeof screen !== "object") continue;
    const slots = (Array.isArray(screen.slots) ? screen.slots : [])
      .filter((s) => s && typeof s === "object" && typeof s.html === "string" && s.html);
    const nav = (Array.isArray(screen.nav) ? screen.nav : [])
      .filter((n) => n && typeof n === "object" && Number.isInteger(n.target) && n.target >= 1);
    shown.push({ name: String(screen.name ?? ""), slots, nav });
  }
  for (const screen of shown) {
    screen.nav = screen.nav.filter((n) => n.target <= shown.length);
  }

  const vetted = vetTokens(inlineTokens || {});
  const decls = Object.entries(vetted.tokens).map(([k, v]) => `${k}:${v};`).join("");

  // One <section> per screen. The ids are GENERATED integers (s1…sN), so nothing visitor-supplied
  // ever reaches an id or an href; slot.html is SERIALIZED DOM and is emitted verbatim (the
  // escape-once rule — it was escaped when it was built).
  const sections = shown.map((screen, i) => {
    const heading = `<h2 class="sx-screen-name">${esc(screen.name || `Screen ${i + 1}`)}</h2>`;
    const content = screen.slots.length
      ? screen.slots.map((slot) => slot.html).join("\n")
      : `<p class="sx-screen-empty">${esc(EMPTY_SCREEN)}</p>`;
    const nav = screen.nav.length
      ? `\n<nav class="sx-nav" aria-label="${esc(`Where ${screen.name || `screen ${i + 1}`} leads`)}">${screen.nav.map((n) => `<a href="#s${n.target}">${esc(n.label)}</a>`).join("\n")}</nav>`
      : "";
    return `<section class="sx-screen" id="s${i + 1}">\n${heading}\n${content}${nav}\n</section>`;
  });

  const facts = [
    ["Screens", m.screens], ["Places", m.places], ["Affordances", m.affordances], ["Connections", m.connections],
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

  const body = sections.length
    ? `<main class="sx-flow">\n${sections.join("\n")}\n</main>`
    : `<main class="sx-flow"><p class="sx-empty">${esc(NOTHING_COMPOSED)}</p></main>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(label)}</title>
<style>${stripImports(css)}</style>
<style>:root{${decls}}</style>
<style>${FRAME_CSS}</style>
</head>
<body class="sx-page">
${body}
<footer class="sx-prov">
<h2>${esc(label)}</h2>
<ul class="sx-facts">${facts}</ul>
<p>${esc("Assembled in your own browser on the /factory studio page of ux factory, from the same "
  + "stylesheets and the same renderer that page uses. Nothing was uploaded — the shipped site is "
  + "static and has nowhere to upload to. No model was called, at view time or any other time.")}</p>
<p>${esc(`Each screen was typed and its components composed by the committed rules in `
  + `system/pattern-rules.mjs and validated against the generated component vocabulary before any `
  + `of them reached the page. The screens are in the board's own order; each screen's components `
  + `are in the board's affordance order; the navigation is the board's connections — every link `
  + `in this file leads to another screen in it.`)}</p>
<p>${claims}</p>
<p>${esc(FONT_NOTE)}</p>
</footer>
</body>
</html>
`;
}
