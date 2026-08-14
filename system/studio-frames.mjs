// system/studio-frames.mjs — hand-written canon (this repo; not generated). The studio's DEVICE
// FRAMES (epic #202 — docs/epics/prototype-studio.architecture.md §Other eng-lead calls "Protos on
// canvas are iframes of the existing proto pages, which persist standalone"; ticket #219;
// .claude/plans/studio-protos-as-frames-219.md).
//
// The two data-connected prototypes — Verdant's phone screen and Fieldwork's dispatch board — sit on
// the /factory canvas as real <iframe>s of the shipped proto pages, arranged by the same
// data-col / data-row grammar as everything else, moved by the same handle and the same ui.move
// verb, and resized by ui.resize. Seven calls are made here so a later editor inherits rather than
// re-argues them.
//
//  1. NO PROTO FILE IS EDITED, AND THAT IS THE DESIGN WORKING RATHER THAN LUCK. proto/verdant.html
//     and proto/fieldwork.html already gate the dock, the inspect layer, the ⌘K palette and the
//     standalone device frame on `window.self === window.top` (#175, #176), so an embed gets the
//     pack skin and no nested chrome for free. Nothing in this file compensates for chrome, and
//     tooling/studio-journey.mjs's framesPass asserts the absence on the frame's own contentDocument
//     — the assertion that goes red the day a proto page drops its guard, which the pixel gate
//     structurally cannot make.
//
//  2. THE FOURTH GRID FAMILY, NOT A FIFTH .stx-slot. `.stx-slot` means BOARD WRAPPER:
//     studio-compile.mjs's identity and count tripwires, studio.mjs's arrangementNow() (#208's `g`)
//     and adoptBoard's removal loop all depend on that meaning. Teaching four shipped mechanisms and
//     ~100 driver assertions the difference between a wrapper and a frame costs far more than one
//     exported selector; .stx-guide and .stx-menu (#217) made the same call and left the registry
//     (build-checks group 12's GRID_FAMILIES) that catches a fourth.
//
//  3. IT DRAWS NO WRAPPER. studio-canvas.mjs's place() builds it, through one `kind: "frame"` branch,
//     so the frames inherit the idempotency contract two drivers rely on, the handle-first tab
//     order, the born-inert handles, the re-label fix (#231 L3), the id counter and the say() on
//     placement. Thirty duplicated lines here would be six re-argued rules.
//
//  4. GEOMETRY IS ATTRIBUTES, AND RESIZE IS SPAN — NOT PIXELS. build-checks group 7 asserts
//     `writes === 1` inline-style write across every studio module, and this is a studio module, so
//     #176's px `--frame-w` mechanism is not available to it. data-span-col / data-span-row select
//     `grid-*-end: span K` rules from system/studio.css. The trade this inherits is that resize is
//     STEPPED — which is also what makes it announceable ("3 columns by 3 rows") and gives it a
//     finite tamper surface, exactly the trade fit() records for zoom.
//
//  5. A FRAME IS OUTSIDE #217's SELECTION LAYER, AND THAT IS A LINE RATHER THAN AN OMISSION. A
//     selection is a set of components you act on together; a device frame is an exhibit on the same
//     surface. The real reason is the second one: half-widening is a bug factory —
//     studio-select.mjs's chosenNodes() is `.stx-slot[data-stx-selected]` while studio-verbs.mjs's
//     slots() is now MOVABLE, so a marquee that could MARK a frame chosenNodes() never RETURNS would
//     drop it from a group move with no visible cause. So: a frame moves and resizes ON ITS OWN,
//     stated in #stx-resize-help and asserted by framesPass (a marquee over a frame selects nothing).
//     WHAT IS ALREADY READY for the day that ticket arrives: groupDelta and groupStep are
//     footprint-aware, because preview() routes every gesture through groupDelta, single-node ones
//     included. WHAT IS NOT: studio-verbs.mjs's `groupOccupancy` — the one function in that family
//     this ticket does not widen, because nothing calls it with a spanning member while frames stay
//     out of the selection. Widen the selection layer and forget it, and the failure is a group move
//     that lets a frame overlap a peer: silent, with no gate watching.
//
//  6. A DROPPED OR DERIVED BRAND DOES NOT REACH THE FRAMES, and the caption says so to the reader.
//     build-import.mjs writes vetted custom properties onto [data-build-stage] — the canvas column —
//     and custom properties do not cross a document boundary. The frames wear the reader's COMMITTED
//     pack (neutral · saulera · verdant · plusui), booted by each frame's own pack-boot.js and
//     re-pointed live when the dock swaps. Copying the vetted token map into the frame document
//     would make the one-application-point vetting invariant `writes === 1` become 2, which is the
//     whole property that group exists to protect. Owner decision 2026-08-14: state it, log a
//     follow-up, do not solve it here.
//
//  7. NO BUS, DELIBERATELY — this module takes no bus and emits nothing. Every action on a frame is
//     studio-verbs.mjs's: the move gesture, the resize gesture, the two consumers, the one history.
//     A bus handle here would be a parameter with no call site, and the day someone gives it one the
//     canvas has two movers (studio-verbs.mjs's call 1, and replay-driver.mjs's "a second AUTHOR,
//     never a second MOVER").
//
// AN <iframe> SWALLOWS POINTER EVENTS, and that is correct rather than a limitation to work around:
// the prototype inside is live and usable, which is the entire point of embedding the real page. It
// means a drag that starts ON a frame's content never reaches the canvas's pan handler and never
// starts a move — the frame's own .stx-grab handle is the only way to move it, and .stx-resize is
// the only way to resize it. Both are drawn above the iframe by studio.css for that reason.
//
// Refusals are content, never throws (bus-toggles.mjs's discipline): a frame whose src 404s renders
// the browser's own error inside the box, the caption still reads and the standalone link still
// resolves. Nothing here reaches the console, which is what keeps studio-journey's no-page-errors
// contract intact.
//
// Node-import safe: no DOM outside a function body and no self-boot, because tooling/build-checks.mjs
// imports this file directly for FRAMES and packHref. system/studio.mjs mounts it, LAST.

import { FRAME_CLASS } from "./studio-canvas.mjs";
import { watchPackSwap } from "./catalog.mjs";

// ---- the pure layer ----------------------------------------------------------------------------

// The two committed prototypes, and nothing else — a module-level descriptor list rather than page
// markup, so build-checks group 24 can assert every `src` is a real committed file and that the two
// footprints are on the grid, disjoint from each other and CLEAR OF ROW 1. Row 1 is where
// studio.mjs's arrangeBoard puts every place, so a frame overlapping it would collide with a board
// the replay driver has not built yet.
//
// The footprints were decided against the REAL 1280px capture: .stx-scroll is 640px tall on
// /factory, so a frame starting at row 2 has 3 rows (452px) before it runs past the visible box, and
// the canvas column shows about five columns. 2×3 at (1,2) and 3×3 at (3,2) is therefore the largest
// pair that is wholly visible at rest — which is what factory-neutral.png shows. Changing these
// numbers is a baseline change; group 24 keeps them honest either way.
export const FRAMES = Object.freeze([
  Object.freeze({
    id: "verdant",
    src: "/proto/verdant.html",
    standalone: "/proto/verdant.html",
    title: "Verdant — plant overview, the real prototype",
    name: "Verdant prototype",
    col: 1, row: 2, spanCol: 2, spanRow: 3,
    caption: "Verdant, running for real. It wears this site's pack — a brand you drop re-skins the canvas around it, not inside it.",
    link: "Open Verdant on its own page",
  }),
  Object.freeze({
    id: "fieldwork",
    src: "/proto/fieldwork.html",
    standalone: "/proto/fieldwork.html",
    title: "Fieldwork — dispatch board, the real prototype",
    name: "Fieldwork prototype",
    col: 3, row: 2, spanCol: 3, spanRow: 3,
    caption: "Fieldwork, running for real. It wears this site's pack — a brand you drop re-skins the canvas around it, not inside it.",
    link: "Open Fieldwork on its own page",
  }),
]);

// The pack line's shape, matched EXACTLY as system/catalog.mjs:521 matches it and for the same
// reason: a bare href prefix also matches /system/tokens.contract.css, which comes FIRST in head
// order (dock.mjs:72 records the same trap). Deliberately broader than dock.mjs's PACK_RE — that
// allowlist is a security gate on storage-supplied hrefs, and this is only "which line is the pack".
const PACK_HREF_RE = /\/system\/tokens\.(?!contract)[a-z0-9-]+\.css$/;

// packHref(doc) → the href that document is currently wearing, or null. Takes a document rather than
// reading the global one, which is what lets it answer for a frame's contentDocument as well as for
// the top one — and what lets build-checks group 24 drive it over a stub with no browser.
//
// The value it returns has ALREADY been vetted by whoever wrote it (dock.mjs's PACK_RE allowlist, or
// pack-boot.js's), so nothing here validates storage content and NO SECOND ALLOWLIST IS BORN.
export function packHref(doc = document) {
  return packLink(doc)?.getAttribute("href") ?? null;
}

export function packLink(doc = document) {
  for (const candidate of doc?.querySelectorAll?.('link[rel="stylesheet"]') || []) {
    const href = candidate?.getAttribute?.("href") || "";
    if (PACK_HREF_RE.test(href)) return candidate;
  }
  return null;
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (studio-canvas.mjs:80,
// studio-verbs.mjs:316). Every node is built element by element — build-checks group 7 bans every
// markup-from-string sink across these modules.
const el = (tag, attrs, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") n.textContent = v;
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
};

let live = null; // the mounted frames — the exported seam below drives THESE, never a new set

// The driver's seam (device-frame.mjs:48's idiom, and the reason it is an export rather than a
// window.__ global: page globals are not this repo's test surface).
export const getFrames = () => live;

export function mountStudioFrames(canvas, { root = document } = {}) {
  const mount = root?.querySelector?.("[data-studio-frames]") || null;
  try {
    // Validated at the boundary, throwing a plain Error naming what is missing — the project
    // convention (bus-toggles.mjs:73-76). A page with no hook is NOT an error: studio.html drives
    // the substrate raw and carries none, and build-checks imports this file for its pure exports.
    if (!mount) return null;
    if (!canvas || typeof canvas.place !== "function" || !canvas.stage) {
      throw new Error("studio-frames: a mounted canvas handle { stage, place } is required");
    }

    const wrappers = [];
    for (const frame of FRAMES) {
      // loading="lazy" is a HEDGE, not a contract (two full proto boots are real added load on a
      // page that already spends 14 s on the replay). Nothing below depends on when it resolves:
      // the wrapper's height is CSS, the readiness handle is set at mount in the `finally`, and the
      // pixel gate masks the iframe's content — so an engine that ignores the attribute inside a
      // scroll container changes nothing that is asserted anywhere.
      const iframe = el("iframe", { src: frame.src, title: frame.title, loading: "lazy" });
      const caption = el("div", { class: "stx-frame-cap" },
        el("p", { text: frame.caption }),
        el("a", { href: frame.standalone, text: frame.link }));
      const box = el("div", { class: "stx-frame-box" }, iframe, caption);
      canvas.place(box, {
        kind: "frame",
        col: frame.col, row: frame.row,
        spanCol: frame.spanCol, spanRow: frame.spanRow,
        name: frame.name,
      });
      // place() returns the SLOT, not the wrapper, so the wrapper is read back off the node it
      // wrapped — the same read the canvas's own idempotency branch performs.
      const wrap = box.parentElement;
      if (wrap?.classList.contains(FRAME_CLASS)) {
        // The marker group 24 and framesPass key on. NOT the wrapper's identity — data-stx-id is
        // the canvas's, assigned by a counter, and a driver that hard-coded "s5" would break the
        // day the replay places one more block.
        wrap.setAttribute("data-stx-frame", frame.id);
        wrappers.push({ id: frame.id, wrap, iframe });
      }
    }

    // THE PACK RE-POINT. Each frame boots its OWN pack pre-paint — pack-boot.js inside the iframe
    // reads the same localStorage the dock writes — so this handles exactly one case: the reader
    // swapping the dock while the frames are already loaded. Observing the top document's pack LINK
    // rather than listening for dock.mjs's PACK_CHANGE_EVENT is deliberate: the link is what
    // pack-boot.js re-points too, so a pack restored before any dock exists is the same observation.
    //
    // Cross-document access is same-origin only; on file:// it throws, so every touch is caught and
    // a frame that has not loaded yet simply needs nothing.
    const repoint = () => {
      if (!live) return; // destroyed mid-swap
      const href = packHref(document);
      if (!href) return;
      for (const f of wrappers) {
        try {
          const link = packLink(f.iframe.contentDocument);
          if (link && link.getAttribute("href") !== href) link.setAttribute("href", href);
        } catch { /* cross-origin or not yet loaded — its own pack-boot already answered */ }
      }
    };
    const packWatcher = watchPackSwap(mount, repoint);

    const handleObj = {
      frames: wrappers,
      repoint,
      destroy() {
        packWatcher?.disconnect();
        for (const f of wrappers) f.wrap.remove();
        if (live === handleObj) live = null;
      },
    };
    live = handleObj;
    return handleObj;
  } finally {
    // Every path, including the no-hook early return and the boundary throw above, so a gate fails
    // on the missing thing instead of deadlocking to timeout (device-frame.mjs:195-199).
    mount?.setAttribute("data-studio-frames", "ready");
  }
}
