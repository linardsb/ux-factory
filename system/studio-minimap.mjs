// system/studio-minimap.mjs — hand-written canon (this repo; not generated). The studio's MINIMAP
// (epic #202 — docs/epics/prototype-studio.architecture.md §Other eng-lead calls; ticket #221;
// .claude/plans/studio-layers-minimap-221.md).
//
// The whole 12×8 stage at a glance in the inspector rail, with a live viewport rectangle tracking
// pan and zoom; a click moves the view, arrow keys pan a cell at a time. Six calls are made here
// so a later editor inherits rather than re-argues them:
//
//  1. GEOMETRY IS ATTRIBUTES — SVG PRESENTATION ATTRIBUTES. build-checks group 7 pins
//     `writes === 1` inline-style write across every studio module, and the viewport rectangle is
//     continuous geometry, so the mechanism had to be one the write-site gate has nothing to count:
//     setAttribute("x"|"y"|"width"|"height") on SVG rects is the studio's own "geometry is
//     attributes" grammar applied literally — the same forcing function that made #219 resize in
//     grid spans instead of px. system-graph.mjs already establishes SVG-with-token-fills on this
//     very page.
//  2. TRACKED BY EVENTS, NEVER A TIMER: a passive scroll listener (rAF-coalesced), a
//     MutationObserver on the viewport's style + data-compile-state (a compile re-sizes the
//     tracks themselves, so the content box and viewBox are re-measured on that path), a
//     ResizeObserver on the scroller, a window resize listener, and the stage observer for the
//     cells — which PATCHES a moved wrapper's own cell per frame and reserves the full
//     measure-and-redraw for childList and compile-state changes, the split #213's 4×-throttled
//     drag check is the measurement of. The scale observer is the SOLE correct path for a zoom
//     taken at scroll 0,0 — no scroll event fires there, but the visible fraction changed — which
//     is why that observer exists at all and why the journey's sole-detector case rides on it.
//  3. NO BUS VERB, DELIBERATELY. Viewport position is view state — no history entry, no share
//     bytes, no export bytes, no replay op (zoom and pan already have no verb; studio-select.mjs
//     call 2's reasoning, fifth application). What would change the call: a share payload that
//     carries a viewport.
//  4. NOT A TAKE-OVER, BY STRUCTURE. replay-driver.mjs's discriminator listens for pointerdown and
//     keydown on canvas.scroll in the capture phase (:795-796); this rail lives outside that
//     element, and the programmatic scrollLeft/scrollTop writes below fire only a `scroll` event,
//     which the driver does not watch. A minimap jump mid-replay is therefore the zoom-row/⌘A
//     class — asserted by the journey, never made true by code here.
//  5. TWO WIDTHS, EACH HONEST FOR ITS OWN QUESTION — AND ON BOTH SURFACES THEY NOW AGREE (#433).
//     The split was written for /factory, where #214's `.stu-shell .stx-viewport { width:
//     max-content }` pin sized the whole viewport to the sizer: scrollWidth <= clientWidth at every
//     zoom, scrollLeft pinned at 0, and the PAGE WINDOW the only horizontal clip there was, so the
//     scroller's clientWidth was not a viewport statement. #433 deleted that pin and the scroller
//     is the column's own 776px box with a real horizontal range, exactly like studio.html's
//     harness — so visibleWidth() and clientWidth answer the same number on every surface this
//     module mounts on, and the split costs nothing on either. IT IS KEPT rather than collapsed
//     because the two questions are still different ones: the VIEW RECT and the announcement ask
//     what the reader can SEE, which a scroller running past the window edge would still overstate,
//     and the JUMP targets ask what the browser will ACCEPT, so the computed clamp agrees with the
//     scroll-range truth. Measured in the update, never at mount. Vertical is deliberately NOT
//     window-clipped: the scroller genuinely scrolls that axis, and page scroll is the PAGE's
//     viewport, not the canvas's — this is a canvas instrument, not a browser-window one.
//  6. THE KEYBOARD AFFORDANCE RIDES A VISIBLE CAPTION, NEVER aria-label (#273). The map is a
//     focusable role-less div, and ARIA 1.2 prohibits naming on the generic role — so the
//     aria-label that used to carry the whole affordance sentence was formally not exposed at
//     all. The caption is the #stx-move-help idiom (studio-verbs.mjs:568-575): one static visible
//     <p> under the map, referenced by the map's aria-describedby — which IS permitted on every
//     role — so the affordance is discoverable on focus AND readable by sighted readers, the
//     idiom's whole point. role="application" was the REJECTED alternative: it strips native
//     reading semantics inside and is a heavy hammer for one small widget. The aria-label is
//     DROPPED rather than shortened — a short name on a generic is the same formal violation as
//     a long one, the visible h3 "Minimap" already names the panel, and what focus needs exposed
//     is the affordance, which the description now carries.
//
// TWO ACCESSIBILITY CRITERIA, RECORDED WHICH-IS-WHICH (studio-verbs.mjs:41-46's discipline):
// click-to-jump is a single-pointer action — nothing here drags, so SC 2.5.7 is not even engaged;
// the arrow keys on the focused map are SC 2.1.1's path. Every keypress announces the resulting
// visible range, an edge-blocked press included (the verbs' per-press rule) — the announcement is
// the range REACHED, so a blocked press honestly repeats the unchanged one.
//
// Refusals are content through canvas.say, never throws; zero inline styles; every node element by
// element, SVG via createElementNS (group 7's terms, joined with no exception argued).
//
// Node-import safe: no DOM outside a function body and no self-boot — system/studio.mjs mounts
// this exactly as it mounts the layers list. build-checks group 26 drives the pure layer.

import { FRAME_CLASS, MOVABLE, NODE_GAP, NODE_H, NODE_W } from "./studio-canvas.mjs";

// ---- the pure layer ----------------------------------------------------------------------------
// Plain data in, plain data out, so build-checks group 26 drives it in CI with no browser. The
// coordinate work below is studio-verbs.mjs's pointToSlot chain INVERTED, with the same two
// missing-term traps: forget the scroll term and it is wrong panned, forget the scale divide and
// it is wrong at any zoom ≠ 1 — and both look fine at 100% at 0,0, which is where it gets tested
// first. Group 26 runs each case as the sole detector it is.

// mapView(metrics) → { x, y, w, h } — the visible rectangle in UNSCALED stage space. w/h are
// capped to the content box and x/y clamped to [0, content − w/h], so the rect never exits the
// stage it depicts. Junk (any non-finite input, or scale ≤ 0) answers the HONEST WHOLE VIEW —
// { x: 0, y: 0, w: contentW, h: contentH } with unreadable content dimensions reading as 0 —
// pinned in group 26 so the fallback is a contract rather than an accident.
// Destructured in the BODY, not the signature — a default parameter covers `undefined` and not
// `null`, and every export here is total over junk by contract (studio-select.mjs:110-113 records
// the same fix). The three siblings below carry it too.
export function mapView(metrics) {
  const { scrollLeft, scrollTop, clientW, clientH, scale, contentW, contentH } = metrics && typeof metrics === "object" ? metrics : {};
  const cw = Number.isFinite(Number(contentW)) && Number(contentW) > 0 ? Number(contentW) : 0;
  const ch = Number.isFinite(Number(contentH)) && Number(contentH) > 0 ? Number(contentH) : 0;
  const whole = { x: 0, y: 0, w: cw, h: ch };
  const s = Number(scale);
  const nums = [scrollLeft, scrollTop, clientW, clientH].map(Number);
  if (!Number.isFinite(s) || s <= 0 || !nums.every(Number.isFinite) || !cw || !ch) return whole;
  const w = Math.min(cw, nums[2] / s);
  const h = Math.min(ch, nums[3] / s);
  const x = Math.min(Math.max(0, nums[0] / s), cw - w);
  const y = Math.min(Math.max(0, nums[1] / s), ch - h);
  return { x, y, w, h };
}

// jumpFrom({ fx, fy }, metrics) → { left, top } — the scroll target that CENTERS the viewport on
// the content point the fractions name, clamped to [0, content*scale − client] on each axis. The
// clamp floor wins at the corners, so a click in the far quadrant lands the view AT the edge
// rather than past it. Total over junk: { left: 0, top: 0 }.
export function jumpFrom(point, metrics) {
  const { fx, fy } = point && typeof point === "object" ? point : {};
  const { clientW, clientH, scale, contentW, contentH } = metrics && typeof metrics === "object" ? metrics : {};
  const s = Number(scale);
  const nums = [fx, fy, clientW, clientH, contentW, contentH].map(Number);
  if (!Number.isFinite(s) || s <= 0 || !nums.every(Number.isFinite)) return { left: 0, top: 0 };
  const [x, y, cw, chh, w, h] = nums;
  const axis = (fraction, content, client) => {
    const max = Math.max(0, content * s - client);
    return Math.min(max, Math.max(0, fraction * content * s - client / 2));
  };
  return { left: axis(x, w, cw), top: axis(y, h, chh) };
}

// nodeRect(box) → { x, y, w, h } — a wrapper's rectangle in unscaled stage space.
//
// IT IS A COERCION NOW, AND THAT IS THE POINT (#302). What stood here was ~70 lines over three
// functions — trackOffsets walking a CSS Grid track list, cellRect turning a slot and a span into a
// rectangle by summing covered tracks plus interior gaps, and the assertion that a 2x3 rect equals
// the union of its six 1x1 rects. Every one of them existed to answer "where is this cell", and the
// answer had to be reconstructed because the position was a grid line rather than a place. A free
// position IS the rectangle: setPos wrote --x/--y/--w/--h and this reads them back. The union
// property the old gate proved is not translated, because there is nothing left to derive that could
// disagree with itself.
//
// Total over junk: zeros, never a throw — an unmounted wrapper's properties read as "".
export function nodeRect(box) {
  const o = box && typeof box === "object" ? box : {};
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  return { x: num(o.x), y: num(o.y), w: num(o.w), h: num(o.h) };
}

// visibleCount(view, boxes) → { visible, total } — how many nodes the viewport rect actually shows.
//
// THE ANNOUNCEMENT'S SUBJECT CHANGED WITH THE SUBSTRATE. It used to be "columns 2 to 4, rows 1 to 3",
// which visibleRange derived by walking the same track list cellRect did. There are no columns to
// name, and naming a pixel range instead ("viewing 236 to 1,180") is a sentence no listener can act
// on. What a reader actually wants to know from a minimap is how much of their work is on screen, so
// that is what it says.
//
// THE OVERLAP RULE IS studio-select.mjs's idsInRange, deliberately: a node is visible when its box
// overlaps the view, not when its origin is inside it, or a wide node the viewport sits in the
// middle of would be counted as off screen. Two modules, one definition of "this rectangle touches
// that one" — re-deriving it here would be a second answer waiting to disagree.
//
// Total over junk: { visible: 0, total: 0 }.
export function visibleCount(view, boxes) {
  const v = view && typeof view === "object" ? view : null;
  const list = Array.isArray(boxes) ? boxes : [];
  if (!v || !list.length) return { visible: 0, total: list.length };
  const left = Number(v.x);
  const top = Number(v.y);
  const right = left + Number(v.w);
  const bottom = top + Number(v.h);
  if (![left, top, right, bottom].every(Number.isFinite)) return { visible: 0, total: list.length };
  let visible = 0;
  for (const b of list) {
    const r = nodeRect(b);
    if (r.x <= right && r.x + r.w >= left && r.y <= bottom && r.y + r.h >= top) visible += 1;
  }
  return { visible, total: list.length };
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (studio-canvas.mjs:167).
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

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs) => {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    n.setAttribute(k, String(v));
  }
  return n;
};

// The affordance sentence the caption carries (call 6 in the header) — the affordance tail only:
// the visible h3 "Minimap" already names the panel, so the caption does not repeat it.
const MAP_HELP = "Click to move the view; arrow keys pan the canvas one cell, "
  + "Home returns to the top left.";

let live = null; // the mounted minimap — the exported seam below drives THIS one

// The driver's seam (studio-layers.mjs's idiom, same sentence): tooling reaches the minimap
// through this, never through a window global.
export const getMinimap = () => live;

export function mountStudioMinimap(root, { canvas } = {}) {
  const mount = root?.querySelector?.("[data-studio-minimap]");
  try {
    // Constants-only import case: no mount node, no mount — the `finally` still resolves the
    // handle wherever there is a node to carry it.
    if (!mount) return null;

    if (!canvas || !canvas.viewport || !canvas.scroll || !canvas.stage || typeof canvas.say !== "function"
      || !Number.isFinite(canvas.scale)) {
      throw new Error("studio-minimap: a mounted canvas handle { viewport, scroll, stage, say, scale } is required");
    }

    const { viewport, scroll, stage } = canvas;

    // The content box, measured UNSCALED with offsetWidth/offsetHeight — a bounding rect is
    // post-transform, so at any level ≠ 1 the viewBox would be computing against the scale it is
    // supposed to factor out (studio-canvas.mjs:253-255's fit() trap). NOT constant, and the
    // compiled state is why: studio.css flips --stx-slot-h from 140px to 480px under
    // [data-compile-state="rendered"], so the stage's box GROWS when a board compiles — these are
    // re-measured (and the viewBox re-written) inside every full cells rebuild, which the
    // compile-state observer below forces.
    let contentW = stage.offsetWidth;
    let contentH = stage.offsetHeight;

    // NO TRACK MEASUREMENT AT ALL SINCE #302, and that is the largest thing this module lost. It
    // read the stage's resolved gridTemplateColumns/Rows through getComputedStyle — a forced style
    // recalc, kept off the gesture's frames only by the rebuild/patch split below — in order to
    // reconstruct where a cell was. A node's rectangle is now written on the node, so the read is a
    // parseFloat and the recalc is gone from this file entirely.

    // --- structure ------------------------------------------------------------------------------
    const title = el("h3", { class: "stu-panel-title", text: "Minimap" });
    // A focusable interactive div, NOT role="img" (it is interactive) and NOT a button (Enter and
    // Space have nothing to activate — the verbs are click-to-jump and the arrows). No aria-label:
    // naming is prohibited on the generic role, so the caption below is the exposure (call 6).
    const map = el("div", { class: "stu-map", tabindex: "0", "aria-describedby": "stu-map-help" });
    const svg = svgEl("svg", {
      "aria-hidden": "true",
      viewBox: `0 0 ${contentW} ${contentH}`,
      focusable: "false",
    });
    const bg = svgEl("rect", { class: "stu-map-bg", x: 0, y: 0, width: contentW, height: contentH });
    // The view rect is appended LAST so it paints on top of every cell; rebuilds below insert
    // cells BEFORE it rather than re-appending it.
    const view = svgEl("rect", { class: "stu-map-view", x: 0, y: 0, width: contentW, height: contentH });
    svg.append(bg, view);
    map.appendChild(svg);
    // The visible caption the map's aria-describedby resolves to — the #stx-move-help idiom
    // (call 6): the module that OWNS the element owns the id (studio-verbs.mjs:591's rule).
    const help = el("p", { class: "stu-map-help", id: "stu-map-help", text: MAP_HELP });
    mount.append(title, map, help);

    // --- the metrics, read live every update ----------------------------------------------------
    // The reader-visible width (call 5 in the header): the scroller's box intersected with the
    // window edge, so a scroller running past that edge cannot overstate what is on screen. Since
    // #433 it never does on either surface, and this is the term that would catch it if one did.
    // Measured in the update, never at mount — #173's measure-at-call-time trap; the box is
    // post-layout, and the scroller carries no transform (the stage inside it does), so the rect is
    // safe to intersect. documentElement.clientWidth rather than innerWidth: the page's own
    // scrollbar is not visible canvas.
    const visibleWidth = () => {
      const r = scroll.getBoundingClientRect();
      const docW = document.documentElement.clientWidth;
      return Math.max(0, Math.min(r.right, docW) - Math.max(r.left, 0));
    };
    const viewMetrics = () => ({
      scrollLeft: scroll.scrollLeft,
      scrollTop: scroll.scrollTop,
      clientW: Math.min(scroll.clientWidth, visibleWidth()),
      clientH: scroll.clientHeight,
      scale: canvas.scale || 1,
      contentW,
      contentH,
    });
    // The jump's metrics are the SCROLL-RANGE truth — the scroller's real client size — so
    // jumpFrom's clamp and the browser's own scrollLeft clamp agree by construction, never a target
    // the write silently discards. Vacuous on /factory until #433 (the horizontal range was 0 and
    // both answered 0); the range is 2042px there now and the agreement is a real claim.
    const jumpMetrics = () => ({
      clientW: scroll.clientWidth,
      clientH: scroll.clientHeight,
      scale: canvas.scale || 1,
      contentW,
      contentH,
    });

    const updateView = () => {
      const v = mapView(viewMetrics());
      view.setAttribute("x", String(v.x));
      view.setAttribute("y", String(v.y));
      view.setAttribute("width", String(v.w));
      view.setAttribute("height", String(v.h));
    };

    // One flush per animation frame across every event source: a momentum scroll delivers events
    // faster than paint, and each flush is a metrics read plus four attribute writes.
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; updateView(); });
    };

    // --- the cells ------------------------------------------------------------------------------
    const cellsOf = () => [...map.querySelectorAll(".stu-map-cell")];
    // A wrapper's rect is the four properties setPos wrote. A slot carries no --h, so its height is
    // its rendered one — measured rather than invented, because a board wrapper's height really is
    // its component's and there is nothing authored to read.
    const wrapperRect = (wrapper) => {
      const prop = (name) => parseFloat(wrapper.style.getPropertyValue(name));
      const h = prop("--h");
      return nodeRect({
        x: prop("--x"), y: prop("--y"), w: prop("--w"),
        h: Number.isFinite(h) ? h : wrapper.offsetHeight,
      });
    };
    // The FULL rebuild: tracks, content box and viewBox re-measured, every cell redrawn. This is
    // the childList / compile-state path — never the per-frame one (see the observer below): a
    // getComputedStyle here is a forced style recalc, and #213's 4×-throttled drag check is what
    // keeps it off the gesture's frames.
    const rebuildCells = () => {
      contentW = stage.offsetWidth;
      contentH = stage.offsetHeight;
      svg.setAttribute("viewBox", `0 0 ${contentW} ${contentH}`);
      bg.setAttribute("width", String(contentW));
      bg.setAttribute("height", String(contentH));
      for (const cell of cellsOf()) cell.remove();
      for (const wrapper of stage.querySelectorAll(MOVABLE)) {
        const frame = wrapper.classList.contains(FRAME_CLASS);
        const r = wrapperRect(wrapper);
        const cell = svgEl("rect", {
          class: frame ? "stu-map-cell stu-map-cell--frame" : "stu-map-cell",
          x: r.x, y: r.y, width: r.w, height: r.h,
        });
        // Keyed to its wrapper, so the attribute path below can PATCH this one cell instead of
        // rebuilding the set — the plan's observer discipline, and the drag-frame budget's answer.
        cell.setAttribute("data-for", wrapper.getAttribute("data-stx-id") || "");
        svg.insertBefore(cell, view); // before the view rect, so the viewport always paints on top
      }
      // The view rect re-scales IN THE SAME FLUSH as the viewBox it lives in: an updateView rAF
      // registered before this rebuild (an earlier scroll in the same frame) fires first, against
      // the old content box — without this, the rect sits mis-scaled until the next event heals it.
      updateView();
    };
    // The per-frame path: a moved or resized wrapper re-draws ITS cell from the already-measured
    // tracks — four attribute writes, no style recalc, no node churn. A cell the map has never
    // seen falls back to the full rebuild.
    const patchCells = (wrappers) => {
      for (const wrapper of wrappers) {
        if (!wrapper.isConnected) { rebuildCells(); return; }
        const cell = svg.querySelector(`.stu-map-cell[data-for="${wrapper.getAttribute("data-stx-id")}"]`);
        if (!cell) { rebuildCells(); return; }
        const r = wrapperRect(wrapper);
        cell.setAttribute("x", String(r.x));
        cell.setAttribute("y", String(r.y));
        cell.setAttribute("width", String(r.w));
        cell.setAttribute("height", String(r.h));
      }
    };

    // --- tracking (no timer — call 2 in the header) ---------------------------------------------
    const ac = new AbortController();
    const { signal } = ac;

    scroll.addEventListener("scroll", schedule, { passive: true, signal });
    // A GUARANTEED FINAL SYNC once momentum scrolling ends (#306, T7). The rAF-coalesced scroll
    // listener above stays the live path, so an engine without scrollend loses nothing.
    if ("onscrollend" in window) scroll.addEventListener("scrollend", schedule, { passive: true, signal });

    // The window edge is a term in visibleWidth(), and a resize can move it without moving the
    // scroller's own box, so the resize is its own event source alongside the ResizeObserver below.
    // An event, not a timer — call 2 holds.
    window.addEventListener("resize", schedule, { passive: true, signal });

    // THE ZOOM OBSERVER IS THE SOLE CORRECT PATH FOR A ZOOM TAKEN AT SCROLL 0,0: setZoom restores
    // the scroll offset, and at 0,0 that write changes nothing, so no scroll event fires — but the
    // visible fraction just changed. The journey's sole-detector case rides on exactly this wire.
    // data-compile-state joins the filter because a COMPILE re-sizes the tracks themselves
    // (studio.css flips --stx-slot-h under it), which is a full-rebuild event, never a patch.
    const zoomObserver = new MutationObserver((records) => {
      if (records.some((r) => r.attributeName === "data-compile-state")) scheduleCells(true);
      schedule();
    });
    // THE ZOOM IS AN INLINE --stx-scale ON THE VIEWPORT NOW (#302), so the filter is `style`. This
    // observer is the SOLE correct path for a zoom taken at scroll 0,0 — no scroll event fires
    // there, but the visible fraction changed — so a stale filter here silently freezes the view
    // rect for exactly the case the observer exists to catch.
    zoomObserver.observe(viewport, { attributes: true, attributeFilter: ["style", "data-compile-state"] });

    // A window resize changes clientWidth with no scroll and no zoom.
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(scroll);

    // The stage observer, with studio-layers.mjs's record discipline: only MOVABLE stage wrappers
    // are cell events — guides, menus and compiled inner content churn under the same subtree.
    // SPLIT LIKE THE LAYERS LIST'S, and for a measured reason rather than symmetry: a childList
    // change (a placed or removed wrapper) is a FULL rebuild, but a gesture churns the position on
    // every cell crossing, and a full rebuild there — a getComputedStyle plus a whole-SVG redraw
    // inside the drag's frame — is what #213's 4×-throttled drag check flagged as a long animation
    // frame. Attribute records therefore PATCH the touched wrappers' own cells.
    let cellsRaf = 0;
    let cellsRebuild = false;
    const cellsTouched = new Set();
    const flushCells = () => {
      cellsRaf = 0;
      const full = cellsRebuild;
      cellsRebuild = false;
      const wrappers = [...cellsTouched];
      cellsTouched.clear();
      if (full) rebuildCells();
      else patchCells(wrappers);
    };
    const scheduleCells = (full) => {
      if (full) cellsRebuild = true;
      if (!cellsRaf) cellsRaf = requestAnimationFrame(flushCells);
    };
    const stageObserver = new MutationObserver((records) => {
      let any = false;
      for (const record of records) {
        if (record.type === "childList") {
          if (record.target !== stage) continue;
          const hit = [...record.addedNodes, ...record.removedNodes]
            .some((n) => n.nodeType === 1 && n.matches?.(MOVABLE));
          if (hit) { cellsRebuild = true; any = true; }
        } else if (record.type === "attributes") {
          const t = record.target;
          if (t.nodeType === 1 && t.parentElement === stage && t.matches?.(MOVABLE)) { cellsTouched.add(t); any = true; }
        }
      }
      if (any) scheduleCells(false);
    });
    stageObserver.observe(stage, {
      childList: true,
      subtree: true,
      attributes: true,
      // THE POSITION IS AN INLINE STYLE NOW (#302) — four attribute names came out and `style` went
      // in. Missing this leaves every cell frozen where it was first drawn for the whole of a move,
      // which no gate on the pure layer can see.
      attributeFilter: ["style"],
    });

    // --- the announcement -----------------------------------------------------------------------
    // Announced from the RE-MEASURED scroller, never from the requested target: the browser clamps
    // a scrollLeft write on assignment, so reading back is what makes an edge-blocked press
    // honestly announce the unchanged range.
    const sayRange = () => {
      const { visible, total } = visibleCount(mapView(viewMetrics()),
        [...stage.querySelectorAll(MOVABLE)].map(wrapperRect));
      canvas.say(total === 0
        ? "Nothing on the canvas yet."
        : `Showing ${visible} of ${total} on the canvas.`);
    };

    // --- pointer: click-to-jump -----------------------------------------------------------------
    // Touch is deliberately ACCEPTED here: a tap-to-jump is navigation, not authoring, so the
    // PRD's mobile-authoring non-goal does not apply to it.
    map.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType !== "touch") return;
      // preventDefault stops a text-selection drag; nothing inside the map is focusable, so the
      // one thing it also suppresses — focus-on-mousedown — is restored explicitly, which is what
      // chains the keyboard path off a click.
      e.preventDefault();
      map.focus({ preventScroll: true });
      // Measured IN THE HANDLER, never at mount (#173's measure-at-call-time trap — the rail
      // resizes under the shell's 900px media query).
      const r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const target = jumpFrom(
        { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height },
        jumpMetrics(),
      );
      scroll.scrollLeft = target.left;
      scroll.scrollTop = target.top;
      updateView();
      sayRange();
    }, { signal });

    // --- keyboard (SC 2.1.1's path) -------------------------------------------------------------
    // Arrows pan ONE NODE PITCH — times the current scale, so one press moves the view by the same
    // visible distance at every zoom. It was one grid CELL, read off the measured track list; the
    // pitch is what replaced the cell everywhere else on this substrate (studio-select.mjs's
    // keyboard step reads the same two constants), so the two paths still agree by construction.
    // Home returns to the top left. Every press announces what is REACHED, an edge-blocked press
    // included.
    map.addEventListener("keydown", (e) => {
      const s = canvas.scale || 1;
      const stepX = (NODE_W + NODE_GAP) * s;
      const stepY = (NODE_H + NODE_GAP) * s;
      if (e.key === "ArrowLeft") scroll.scrollLeft -= stepX;
      else if (e.key === "ArrowRight") scroll.scrollLeft += stepX;
      else if (e.key === "ArrowUp") scroll.scrollTop -= stepY;
      else if (e.key === "ArrowDown") scroll.scrollTop += stepY;
      else if (e.key === "Home") { scroll.scrollLeft = 0; scroll.scrollTop = 0; }
      else return;
      e.preventDefault(); // or the page scrolls under the press too
      updateView();
      sayRange();
    }, { signal });

    rebuildCells();

    const handleObj = {
      root: mount,
      map,
      svg,
      refresh: () => rebuildCells(),
      destroy() {
        zoomObserver.disconnect();
        resizeObserver.disconnect();
        stageObserver.disconnect();
        if (raf) cancelAnimationFrame(raf);
        if (cellsRaf) cancelAnimationFrame(cellsRaf);
        ac.abort();
        title.remove();
        map.remove();
        help.remove();
        if (live === handleObj) live = null;
      },
    };
    live = handleObj;
    return handleObj;
  } finally {
    // Every path, including the early return and the boundary throw (studio-layers.mjs's rule).
    mount?.setAttribute("data-studio-minimap", "ready");
  }
}
