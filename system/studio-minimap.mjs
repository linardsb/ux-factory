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
//     continuous geometry, so the mechanism had to be one the regex has nothing to count:
//     setAttribute("x"|"y"|"width"|"height") on SVG rects is the studio's own "geometry is
//     attributes" grammar applied literally — the same forcing function that made #219 resize in
//     grid spans instead of px. system-graph.mjs already establishes SVG-with-token-fills on this
//     very page.
//  2. TRACKED BY EVENTS, NEVER A TIMER: a passive scroll listener (rAF-coalesced), a
//     MutationObserver on the viewport's data-zoom + data-compile-state (a compile re-sizes the
//     tracks themselves, so the content box and viewBox are re-measured on that path), a
//     ResizeObserver on the scroller, a window resize listener, and the stage observer for the
//     cells — which PATCHES a moved wrapper's own cell per frame and reserves the full
//     measure-and-redraw for childList and compile-state changes, the split #213's 4×-throttled
//     drag check is the measurement of. The data-zoom observer is the SOLE correct path for a zoom
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
//  5. TWO WIDTHS, EACH HONEST FOR ITS OWN QUESTION. On /factory the scroller NEVER overflows
//     horizontally: #214's `.stu-shell .stx-viewport { width: max-content }` pin sizes the whole
//     viewport to the sizer, so scrollWidth <= clientWidth at every zoom, scrollLeft stays pinned
//     at 0, and the PAGE WINDOW is the only horizontal clip there is (recorded in
//     tooling/studio-journey.mjs:4027-4033 — "a block at column 12 sits off-screen and
//     un-scrollable-to"). The scroller's clientWidth is therefore not a viewport statement on that
//     page. So the VIEW RECT and the announcement measure the reader-visible width — the
//     scroller's box intersected with the window edge, in the update, never at mount — while the
//     JUMP targets use the scroller's real client size, the scroll-range truth, so the computed
//     clamp agrees with the browser's own. On a bounded scroller (studio.html's harness) the two
//     widths are identical and this call costs nothing. Vertical is deliberately NOT
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

import { FRAME_CLASS, MOVABLE, ZOOM_LEVELS } from "./studio-canvas.mjs";

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

// trackOffsets(tracks, gap) → cumulative START offsets [0, t0+g, t0+g+t1+g, …] — the inverse of
// hitSlot's walk, with the same rule: the gap belongs to the track BEFORE the next start. Total
// over junk: a non-array answers [], an unreadable track or gap reads as 0.
export function trackOffsets(tracks, gap) {
  if (!Array.isArray(tracks)) return [];
  const g = Number(gap) || 0;
  const out = [];
  let edge = 0;
  for (const track of tracks) {
    out.push(edge);
    edge += (Number(track) || 0) + g;
  }
  return out;
}

// cellRect(slot, span, geom) → { x, y, w, h } — a wrapper's footprint in unscaled stage space,
// from the MEASURED tracks (readGeom's { cols, rows, colGap, rowGap } shape). Span-aware: a 1×1
// span is one track, and a W×H rect equals the union of its W·H unit rects by construction — the
// width is the covered tracks plus the (span − 1) interior gaps, which is footprint()'s definition
// drawn instead of keyed. Total over junk: { x: 0, y: 0, w: 0, h: 0 }.
export function cellRect(slot, span, geometry) {
  const geom = geometry && typeof geometry === "object" ? geometry : {};
  const axis = (index, count, tracks, gap) => {
    const list = Array.isArray(tracks) ? tracks : [];
    if (!list.length) return { at: 0, size: 0 };
    const g = Number(gap) || 0;
    const i = Math.min(list.length, Math.max(1, Math.round(Number(index)) || 1)) - 1;
    const n = Math.min(list.length - i, Math.max(1, Math.round(Number(count)) || 1));
    const offsets = trackOffsets(list, g);
    let size = (n - 1) * g;
    for (let k = 0; k < n; k += 1) size += Number(list[i + k]) || 0;
    return { at: offsets[i], size };
  };
  const x = axis(slot?.col, span?.cols, geom.cols, geom.colGap);
  const y = axis(slot?.row, span?.rows, geom.rows, geom.rowGap);
  return { x: x.at, y: y.at, w: x.size, h: y.size };
}

// visibleRange(view, geom) → { col1, col2, row1, row2 } — the inclusive cell range the viewport
// rect covers, for the announcement sentence. The band rule is hitSlot's: a point in a gap belongs
// to the track before it. The far edge is sampled one pixel inside the rect, so a viewport whose
// edge kisses the next track's start does not claim a column it shows nothing of. Total over junk:
// the 1,1 cell.
export function visibleRange(view, geometry) {
  const geom = geometry && typeof geometry === "object" ? geometry : {};
  const band = (v, tracks, gap) => {
    const list = Array.isArray(tracks) ? tracks : [];
    const n = Number(v);
    if (!Number.isFinite(n) || !list.length) return 1;
    let edge = 0;
    for (let i = 0; i < list.length; i += 1) {
      edge += (Number(list[i]) || 0) + (Number(gap) || 0);
      if (n < edge) return i + 1;
    }
    return list.length;
  };
  const x = Number(view?.x);
  const y = Number(view?.y);
  const w = Number(view?.w);
  const h = Number(view?.h);
  const col1 = band(x, geom.cols, geom.colGap);
  const row1 = band(y, geom.rows, geom.rowGap);
  const col2 = Math.max(col1, band(Number.isFinite(w) ? x + Math.max(0, w - 1) : x, geom.cols, geom.colGap));
  const row2 = Math.max(row1, band(Number.isFinite(h) ? y + Math.max(0, h - 1) : y, geom.rows, geom.rowGap));
  return { col1, col2, row1, row2 };
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
      || !Number.isFinite(canvas.level)) {
      throw new Error("studio-minimap: a mounted canvas handle { viewport, scroll, stage, say, level } is required");
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

    // The measured tracks (readGeom — the verbs'/select's idiom, third copy is the convention).
    // Read once at mount for the offsets; re-read inside the mutation rebuild, where it is cheap
    // and rare, so a compiled state's grown tracks draw where they really are.
    const readGeom = () => {
      const cs = getComputedStyle(stage);
      const track = (v) => String(v || "").trim().split(/\s+/).map(parseFloat).filter(Number.isFinite);
      return {
        cols: track(cs.gridTemplateColumns),
        rows: track(cs.gridTemplateRows),
        colGap: parseFloat(cs.columnGap) || 0,
        rowGap: parseFloat(cs.rowGap) || 0,
      };
    };
    let geom = readGeom();

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
    // window edge, because on /factory the scroller itself never overflows horizontally and the
    // window is the only horizontal clip there is. Measured in the update, never at mount — #173's
    // measure-at-call-time trap; the box is post-layout, and the scroller carries no transform (the
    // stage inside it does), so the rect is safe to intersect. documentElement.clientWidth rather
    // than innerWidth: the page's own scrollbar is not visible canvas.
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
      scale: ZOOM_LEVELS[canvas.level] || 1,
      contentW,
      contentH,
    });
    // The jump's metrics are the SCROLL-RANGE truth — the scroller's real client size — so
    // jumpFrom's clamp and the browser's own scrollLeft clamp agree by construction: on /factory
    // the horizontal range is 0 and both answer 0, never a target the write silently discards.
    const jumpMetrics = () => ({
      clientW: scroll.clientWidth,
      clientH: scroll.clientHeight,
      scale: ZOOM_LEVELS[canvas.level] || 1,
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
    const wrapperRect = (wrapper) => cellRect(
      { col: wrapper.getAttribute("data-col"), row: wrapper.getAttribute("data-row") },
      { cols: wrapper.getAttribute("data-span-col"), rows: wrapper.getAttribute("data-span-row") },
      geom,
    );
    // The FULL rebuild: tracks, content box and viewBox re-measured, every cell redrawn. This is
    // the childList / compile-state path — never the per-frame one (see the observer below): a
    // getComputedStyle here is a forced style recalc, and #213's 4×-throttled drag check is what
    // keeps it off the gesture's frames.
    const rebuildCells = () => {
      geom = readGeom();
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

    // The window edge is a term in visibleWidth() and the scroller's own box never moves when the
    // window resizes (it is max-content on /factory), so the resize is its own event source. An
    // event, not a timer — call 2 holds.
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
    zoomObserver.observe(viewport, { attributes: true, attributeFilter: ["data-zoom", "data-compile-state"] });

    // A window resize changes clientWidth with no scroll and no zoom.
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(scroll);

    // The stage observer, with studio-layers.mjs's record discipline: only MOVABLE stage wrappers
    // are cell events — guides, menus and compiled inner content churn under the same subtree.
    // SPLIT LIKE THE LAYERS LIST'S, and for a measured reason rather than symmetry: a childList
    // change (a placed or removed wrapper) is a FULL rebuild, but a gesture churns data-col/row on
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
      attributeFilter: ["data-col", "data-row", "data-span-col", "data-span-row"],
    });

    // --- the announcement -----------------------------------------------------------------------
    // Announced from the RE-MEASURED scroller, never from the requested target: the browser clamps
    // a scrollLeft write on assignment, so reading back is what makes an edge-blocked press
    // honestly announce the unchanged range.
    const sayRange = () => {
      const { col1, col2, row1, row2 } = visibleRange(mapView(viewMetrics()), geom);
      canvas.say(`Viewing columns ${col1} to ${col2}, rows ${row1} to ${row2}.`);
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
    // Arrows pan one CELL — track size + gap, times the current scale, so one press moves the view
    // by one grid cell regardless of zoom. Home returns to the top left. Every press announces the
    // range REACHED, an edge-blocked press included.
    map.addEventListener("keydown", (e) => {
      const s = ZOOM_LEVELS[canvas.level] || 1;
      const stepX = ((geom.cols[0] || 0) + geom.colGap) * s;
      const stepY = ((geom.rows[0] || 0) + geom.rowGap) * s;
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
