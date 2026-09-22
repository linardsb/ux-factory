// system/studio-canvas.mjs — hand-written canon (this repo; not generated). The studio's canvas
// substrate (epic #202 — docs/epics/prototype-studio.architecture.md §Key decisions "Stack &
// libraries" / "Data model"; ticket #204; .claude/plans/studio-canvas-stage-204.md).
//
// A 2-D surface that holds REAL token-skinned components. Everything the studio does later — drag
// (#205), the orchestrator (#206), the compile beat (#207), the codec's arrangement field (#208),
// the replay driver (#209) — sits on this file, so its three substrate calls are the load-bearing
// ones and each is made here rather than re-argued downstream:
//
//   1. THE STAGE IS DOM. Placed things are real components, so the token contract, the inspect
//      bubbles and Tab order keep working by construction rather than by re-implementation. A
//      <canvas> or an SVG stage would cost all three.
//   2. PAN IS NATIVE SCROLL. A real scroll container is the substrate and a drag writes
//      scrollLeft/scrollTop. A transform-translate stage would be shorter to write and would break
//      three things at once: the browser cannot scroll a translated element into view for Tab
//      (a WCAG requirement, not a nicety), the scrollbar stops being an affordance, and touch
//      panning has to be rebuilt. #173 made this call for the system graph; the canvas inherits it.
//   3. POSITION AND SCALE ARE CUSTOM PROPERTIES, WRITTEN THROUGH TWO NAMED HELPERS (#302). This
//      call REPLACES the one that stood here from #204 to #301 — "zoom and arrangement are
//      attributes": a stepped scale table and four families of per-axis grid-line rules, all
//      declared in system/studio.css. That bought a module writing ZERO inline styles, which let it
//      join build-checks group 7 with no exception argued. It cost three things the studio now
//      needs: nothing could sit between two slots, `fit()` snapped to a level at or below the
//      ideal ratio instead of fitting exactly, and a frame was a rectangle of CELLS.
//
//      So the stage is now free space. setPos(el, x, y, w, h) writes --x/--y/--w/--h and
//      setScale(stage, s) writes a continuous --stx-scale; the sheet reads those properties and
//      selects on no attribute. THE WRITE COUNT IS NO LONGER ZERO, and the gate moved with it
//      rather than being widened: build-checks group 7 is re-pinned FUNCTION-SCOPED to
//      setPos · setScale · build-import.mjs's applyToStage, so a third write site anywhere in the
//      studio still fails it. A file-scoped exemption for this file would have satisfied the words
//      and killed the invariant.
//
//      CALLS 1 AND 2 ABOVE SURVIVE VERBATIM and were kept on purpose, not overlooked: the stage is
//      still DOM and pan is still native scroll. Only this third call was retired.
//
// The stage names NOTHING for a view transition. #171 shipped a real at-rest regression by naming
// elements that then became containing blocks for an absolutely positioned overlay, and the pixel
// gate re-baselined it. Movement here is layout, and tooling/vt-verify.mjs asserts zero
// ::view-transition-* pseudos AFTER proving the movement happened.
//
// Node-import safe: no DOM outside a function body and no self-boot, because tooling/build-checks.mjs
// imports this file directly for its pure exports. The harness (studio.html) mounts it explicitly;
// the designed surface is /factory, and that is #206's route surgery, not this ticket's.

// ---- the pure layer ----------------------------------------------------------------------------
// Two class constants and nothing else. The two axis caps, the stepped zoom table, its rest index
// and six slot/span functions were this layer until #302 retired the grid. Nothing replaced them
// one-for-one: under free positioning there is no cell to clamp to, no rectangle of cells to compute
// a footprint for, and no discrete level to snap a fit down to. What replaced the whole set is the
// two write helpers in the next section — setPos and setScale — plus the STAGE constants they
// clamp against. The retired names are deliberately not repeated here: #302's definition of done is a
// repo-wide grep for them, and it matches comments.

// The frame's wrapper class, as ONE constant three modules read. It is NOT `.stx-slot`, and that is
// #219's load-bearing call: `.stx-slot` means BOARD WRAPPER — studio-compile.mjs's identity and
// count tripwires and studio.mjs's adoptBoard removal loop both depend on that meaning, and they
// keep it. Frames join .stx-guide and .stx-menu as a family that sits on the stage
// without being a board wrapper.
export const FRAME_CLASS = "stx-frame";

// The MOVABLE families, as ONE selector both this module and studio-verbs.mjs read — exported rather
// than literalled twice: the day a fifth family becomes movable there is exactly one line to edit,
// and build-checks can pin it.
//
// NOTE WHAT IS NOT HERE. .stx-guide and .stx-menu are chrome, and #217's SELECTION layer keeps its
// own `.stx-slot`-only scope on purpose — a frame moves and resizes on its own (system/
// studio-frames.mjs's header records why half-widening a selection is a bug factory).
export const MOVABLE = ".stx-slot, .stx-frame";


// ---- the two write helpers ---------------------------------------------------------------------
// THE ONLY TWO PLACES THE STUDIO WRITES AN INLINE STYLE, and build-checks group 7 is pinned to
// exactly that: FUNCTION-SCOPED, a budget per function, plus a whole-file total that must equal the
// sum of the slices — so a write anywhere else in this file, or anywhere in the other studio
// modules, fails it. Widening the group's FILE list instead would have satisfied #302's words and
// killed the invariant, which is why the predicate slices function bodies rather than reading names.
//
// WHY CUSTOM PROPERTIES RATHER THAN left/top/width. The sheet stays in charge of what a position
// MEANS: a slot translates by (--x, --y), a frame does the same and additionally reads --h, and the
// minimap draws its rectangles from the same four values. One writer, several readers, and no
// module deciding on its own that a node is positioned absolutely.
//
// WHY translate RATHER THAN left/top, which is the same thing said once in the sheet: a transform
// is composited and does not invalidate layout, and a drag writes one of these per frame.

// The stage's own box, in unscaled px. These are the retired grid's exact outer dimensions
// (12 x 220 + 11 x 16 across, 8 x 140 + 7 x 16 down), kept rather than re-chosen so the canvas is
// the same size it has always been — a stage that silently changed size would move every pixel
// baseline for a reason nobody decided. CSS cannot import, so system/studio.css mirrors both by hand
// and build-checks group 12 pins the mirror.
export const STAGE_W = 2816;
export const STAGE_H = 1232;

// The scale bounds. CONTINUOUS, not a table: fit() may land anywhere between them, which is the
// whole point of retiring the five-step one — "fit" now actually fits. SCALE_REST is a scale and
// says so; the index that used to stand here is gone with the table it indexed.
export const SCALE_MIN = 0.1;
export const SCALE_MAX = 4;
export const SCALE_REST = 1;

// The DEFAULT node box and the pitch a laid-out flow uses, in unscaled px. Not caps and not cells:
// a node may be any size setPos() clamps to, and a caller that wants its own pitch says so (the
// studio.html harness does). These three are what system/studio.css declares as --stx-slot-w,
// --stx-slot-h and --stx-gap, hand-mirrored because CSS cannot import; group 12 pins all three.
export const NODE_W = 220;
export const NODE_H = 140;
export const NODE_GAP = 16;

// The smallest a node may be made. WCAG 2.2 SC 2.5.8's 24 x 24 minimum target size, applied to the
// thing itself rather than only to its handles: a node resized below it cannot be picked up again by
// pointer, which is a trap the keyboard path would then be the only way out of.
export const MIN_SIZE = 24;

// setPos(el, x, y, w, h) -> the position actually written. THE ONE WRITER of a node's place and size.
//
// NON-FINITE IS THE EDGE THAT MATTERS, and it is not theoretical. `--x: NaN` makes the whole
// `transform: translate(var(--x), var(--y))` declaration invalid at computed-value time; the
// declaration drops SILENTLY and the node renders at 0,0, which reads as a layout bug rather than as
// bad input. Every value is coerced and a non-finite one falls back before anything is written —
// the retired slot clamp's posture, kept, with cells swapped for pixels.
//
// CLAMPED TO THE STAGE, AND THAT IS THE ONLY BOUND LEFT. The grid had cells to collide in, so a move
// could be BLOCKED and the mover said so out loud ("Blocked, still in column X, row Y."). Free
// positions have none: nothing blocks a free move, inventing a collision rule would be inventing a
// rule #302 never asked for, and that sentence is DELETED rather than translated. The stage edge is
// what remains, the clamp lives here so "on the stage" has one definition, and the return value is
// what the announcement names — where the node landed, never where it was asked to go.
//
// `h` IS OPTIONAL, and its absence is meaningful rather than a default. A board wrapper has no
// authored height — it is as tall as its component — and writing one would hand every wrapper a
// height nobody chose. A device frame has one, and system/studio.css reads --h on .stx-frame alone.
export function setPos(el, x, y, w, h) {
  if (!el || !el.style) throw new Error("studio-canvas: setPos() was called with no element");
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  const width = Math.max(MIN_SIZE, num(w, MIN_SIZE));
  const height = h == null ? null : Math.max(MIN_SIZE, num(h, MIN_SIZE));
  const px = Math.min(Math.max(0, num(x, 0)), Math.max(0, STAGE_W - width));
  const py = Math.min(Math.max(0, num(y, 0)), Math.max(0, STAGE_H - (height ?? 0)));
  el.style.setProperty("--x", `${px}px`);
  el.style.setProperty("--y", `${py}px`);
  el.style.setProperty("--w", `${width}px`);
  if (height !== null) el.style.setProperty("--h", `${height}px`);
  return { x: px, y: py, w: width, h: height };
}

// setScale(root, s) -> the scale actually written. THE ONE WRITER of zoom, and of the scroll extent
// that has to move with it.
//
// THE ARGUMENT IS THE VARIABLE SCOPE, NOT THE STAGE, and that is a real call rather than a naming
// preference. Two elements on different branches read what this writes: .stx-stage reads
// --stx-scale for its transform, and .stx-sizer — the stage's PARENT — reads the two extent values
// that give the scroller something to scroll. A custom property inherits DOWN, so no write on the
// stage can reach the sizer. The one element that is an ancestor of both is .stx-viewport, which is
// also where system/studio.css already declares --stx-scale's rest value, so this writes where the
// sheet already says the scope is.
//
// THE EXTENT IS WRITTEN IN THE SAME CALL, deliberately. It used to be a calc() over the cap
// variables, which meant zoom moved the scale and the sheet moved the extent, and the two could
// disagree for one frame. One write path, one fact.
//
// CLAMPED AND NEVER NaN, for setPos's reason: a non-finite scale would make `scale()` invalid and
// the stage would silently snap to 1 while the readout claimed otherwise.
export function setScale(root, s) {
  if (!root || !root.style) throw new Error("studio-canvas: setScale() was called with no element");
  const n = Number(s);
  const scale = Number.isFinite(n) ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, n)) : SCALE_REST;
  root.style.setProperty("--stx-scale", String(scale));
  root.style.setProperty("--stx-extent-w", `${STAGE_W * scale}px`);
  root.style.setProperty("--stx-extent-h", `${STAGE_H * scale}px`);
  return scale;
}

// ---- the arrow geometry (#302) -------------------------------------------------------------------
// arrowPath(from, to) → { x1, y1, x2, y2 } or null — the segment between two node boxes, clipped to
// each one's edge so the line starts where the first box ends and stops where the second begins.
//
// DERIVED, NEVER STORED. An arrow is a claim that two nodes are connected; where it is drawn is a
// consequence of where they are. Storing endpoints would make the claim and the picture two facts
// that can disagree the moment either node moves — Excalidraw's binding shape, and the reason the
// overlay redraws from positions rather than being told coordinates.
//
// THE CLIP IS ON THE LINE OF CENTRES, which is the one choice here worth stating. The alternative —
// always leaving the right edge and entering the left — draws a line that doubles back whenever the
// target is to the LEFT of its source, and the rank layout produces exactly that for a back edge
// (replay/build-northwind-restock.board.json really carries one).
//
// Returns NULL rather than a zero-length segment for two boxes that overlap or share a centre: there
// is no honest line between them, and drawing a dot would be a mark the reader cannot interpret.
// Total over junk, because the overlay redraws on every frame of a drag and a throw there kills the
// gesture rather than one arrow.
export function arrowPath(from, to) {
  const box = (b) => {
    const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
    const x = n(b && b.x);
    const y = n(b && b.y);
    const w = n(b && b.w);
    const h = n(b && b.h);
    if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0) return null;
    return { cx: x + w / 2, cy: y + h / 2, hw: w / 2, hh: h / 2 };
  };
  const a = box(from);
  const b = box(to);
  if (!a || !b) return null;
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  if (!dx && !dy) return null;
  // The scale that puts the centre-to-centre ray on a box's edge: whichever axis it leaves first.
  const edge = (r, ex, ey) => {
    const tx = ex ? Math.abs(r.hw / ex) : Infinity;
    const ty = ey ? Math.abs(r.hh / ey) : Infinity;
    return Math.min(tx, ty);
  };
  const ta = edge(a, dx, dy);
  const tb = edge(b, dx, dy);
  // The two boxes overlap when the clipped start is already past the clipped end.
  if (ta + tb >= 1) return null;
  return {
    x1: a.cx + dx * ta, y1: a.cy + dy * ta,
    x2: b.cx - dx * tb, y2: b.cy - dy * tb,
  };
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (device-frame.mjs:33,
// scrub.mjs:104). A shared one would be a dependency between modules that are deliberately
// independent surfaces.
const SVG_NS = "http://www.w3.org/2000/svg";
// SVG via createElementNS, and every arrow's geometry written as a PRESENTATION ATTRIBUTE rather
// than a style — system/studio-minimap.mjs's idiom, and for its reason: geometry-as-attributes is
// what keeps a second module out of group 7's named-writer list. setPos and setScale are the two
// writers; an overlay that reached for .style would be a third.
const svgEl = (tag, attrs) => {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    n.setAttribute(k, String(v));
  }
  return n;
};

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

let live = null; // the mounted canvas — the exported seam below drives THIS one, never a new one

// The driver's seam (device-frame.mjs:48's idiom). tooling/studio-journey.mjs reaches the canvas
// through this, never through a window global — page globals are not this repo's test surface.
export const getCanvas = () => live;

// The KEYBOARD's step — a NEW constant with a new name, because the old one was a table of levels
// the zoom snapped to and this is a multiplier the buttons apply to a continuous scale.
// system-graph.mjs makes the same call on the same page. 1.25 is four steps from 1 to ~2.44 and four
// back to ~0.41, which is a usable number of presses across the whole range.
//
// EXPORTED, for the reason tooling/studio-journey.mjs's import block states about every number it
// reads: a driver that retyped it would compute its expectations from its OWN copy, and a change
// here would move the page and leave the driver green. A round trip being lossless is true of any
// ratio, so it pins nothing.
export const ZOOM_STEP = 1.25;

// A trackpad pinch arrives as many small ctrl+wheel deltas on every engine. Under the discrete table
// these accumulated to a threshold and then STEPPED a level; continuous scale needs no threshold, so
// each delta is applied directly as an exponential factor. The divisor is tuned so a one-notch mouse
// wheel (~100) is about one keyboard step.
const WHEEL_SCALE = 450;

export function initStudioCanvas(root = document) {
  const viewport = root.querySelector("[data-studio-canvas]");
  try {
    // A page with no viewport is not an error — build-checks and the drivers import this module for
    // its constants alone. The `finally` still resolves the readiness handle, so a gate fails on
    // the missing thing instead of deadlocking to timeout (device-frame.mjs:195-199).
    if (!viewport) return null;

    // --- structure ------------------------------------------------------------------------------
    // Built element by element. Group 7 bans every markup-from-string sink across these modules,
    // and the ban is the reason a hostile label can never become markup anywhere in the studio.
    viewport.classList.add("stx-viewport");

    const stage = el("div", { class: "stx-stage", "data-stx-stage": "" });

    // --- the arrow overlay (#302) -----------------------------------------------------------------
    // INSIDE THE SCALED STAGE, AND A SIBLING OF THE NODES. Both halves are decisions.
    //
    // Inside, because the stage carries the scale: the overlay rescales for free and a zoom triggers
    // ZERO arrow redraws. Outside it, every zoom would be a full arrow re-layout — spike S1 measured
    // 0 redraws across 72 wheel events with it in here, and that number is the reason.
    //
    // A SIBLING, never a child of a node, because #171's regression arrives here through a different
    // door. A `transform` other than `none` makes an element a containing block for every absolutely
    // positioned descendant (CSS Transforms 1 §3) — exactly as `view-transition-name` does, which is
    // what #171 shipped. Every node on this stage now carries one, so an overlay nested inside any of
    // them would be positioned against THAT node rather than against the stage, and every arrow would
    // be drawn in the wrong space. The pixel gate cannot catch that class (gates.md), and neither can
    // vt-stack-audit — its instrument is removing view-transition-names, and there are none here to
    // remove. The structure is the guard.
    //
    // FIRST CHILD, so arrows paint UNDER the nodes: a line between two boxes runs through empty
    // stage, and a line drawn OVER a box is a mark across content the reader is trying to read. The
    // guides make the same call for the same reason.
    const arrowHead = svgEl("marker", {
      id: "stx-arrowhead", viewBox: "0 0 10 10", refX: "9", refY: "5",
      markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse",
    });
    arrowHead.appendChild(svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "stx-arrow-head" }));
    const arrowDefs = svgEl("defs", null);
    arrowDefs.appendChild(arrowHead);
    const arrowLayer = svgEl("svg", {
      class: "stx-arrows",
      // The stage's own unscaled box, so a user unit IS a stage pixel and arrowPath's answers can be
      // written straight in. Hand-mirrored from STAGE_W/STAGE_H, which group 12 pins.
      viewBox: `0 0 ${STAGE_W} ${STAGE_H}`,
      // aria-hidden because an arrow is a PICTURE of a connection the layers list already states in
      // words; announcing it twice makes the list unusable. The connection's own announcement is the
      // verb's, not the overlay's.
      "aria-hidden": "true",
    });
    arrowLayer.appendChild(arrowDefs);
    stage.appendChild(arrowLayer);
    const sizer = el("div", { class: "stx-sizer" }, stage);
    const scroll = el("div", { class: "stx-scroll", "data-stx-scroll": "", tabindex: "0",
      "aria-label": "Canvas — drag to pan, arrow keys to scroll" }, sizer);

    // Real buttons with visible text: this IS the keyboard path for zoom, and the only affordance a
    // reader who never touches a trackpad will find (system-graph.mjs makes the same call).
    const readout = el("span", { class: "stx-zoom-level", "aria-live": "polite", text: "100%" });
    const outBtn = el("button", { type: "button", class: "btn btn-secondary stx-zoom-btn", text: "Zoom out" });
    const inBtn = el("button", { type: "button", class: "btn btn-secondary stx-zoom-btn", text: "Zoom in" });
    const fitBtn = el("button", { type: "button", class: "btn btn-secondary stx-zoom-btn", text: "Fit" });
    const resetBtn = el("button", { type: "button", class: "btn btn-secondary stx-zoom-btn", text: "Reset" });
    const zoomRow = el("div", { class: "stx-zoom" }, outBtn, inBtn, fitBtn, resetBtn, readout);

    // Its own live region rather than the page's. A canvas verb that moves something and says
    // nothing is worse than no verb at all (the breadboard's discipline, extended to 2-D), and a
    // module that depends on its host having declared a region would announce nothing on the day
    // #206 mounts it somewhere else.
    const announcer = el("p", { class: "stx-live", role: "status", "aria-live": "polite" });

    viewport.append(zoomRow, scroll, announcer);
    setScale(viewport, SCALE_REST);

    const say = (message) => { announcer.textContent = message; };

    // --- zoom -----------------------------------------------------------------------------------
    // CONTINUOUS since #302. There is no table to index and no attribute to select: setScale writes
    // --stx-scale and the two scroll-extent values on the viewport, and the sheet reads them.
    //
    // THE SCALE WRITE IS COALESCED TO ONE PER FRAME, and that is S1's own recommendation rather
    // than a precaution — it measured that a per-event write is what costs the drag, and that
    // `content-visibility: auto` (the mitigation #302's ticket proposed) does not cull this
    // substrate on Chromium at all, because translate positioning and a scaled ancestor each defeat
    // it independently. A pinch delivers many wheel events per frame; without this, each one writes
    // three custom properties and forces the engine to re-resolve the sizer.
    let scale = SCALE_REST;
    let scaleFrame = 0;
    // THE SCROLL OFFSET THE PENDING SCALE OWES (#302, PR #432's F3), held as the CONTENT POINT to
    // keep under the anchor rather than as a pixel offset — the target is a function of the scale,
    // and the scale has not been written yet. setZoom used to write scrollLeft/scrollTop on the two
    // lines after queueScale() with the comment "the browser clamps both to the new range"; that
    // was true on main, where data-zoom was written synchronously. It stopped being true the moment
    // the scale write moved into an rAF: the scroll range comes from --stx-extent-w/h, .stx-sizer
    // reads them (studio.css:70-74) and setScale writes them INSIDE this flush, so a zoom-in
    // clamped against the OLD, smaller extent and nothing re-applied the target afterwards. Derived
    // for 1 → 1.25 at scrollLeft 1500, anchor x 800, clientWidth 1000: wanted 2075, old max 1816,
    // so 259 screen px of drift, growing with how far the reader had panned.
    //
    // FLUSHING EARLY INSTEAD WAS MEASURED AND REJECTED. Chromium, 4x CPU throttle, 120 ctrl+wheel
    // events over 40 frames: coalesced held a p50 frame gap of 16.7 ms with no frame over 33 ms,
    // a synchronous flush gave 23.9-25.6 ms and dropped 1-3 frames (two samples each). The write
    // the header's own S1 note is about is the one being coalesced, so it stays coalesced and the
    // scroll target rides with it — scale and scroll land in the SAME frame, which is a stronger
    // property than the old code had, not a weaker one.
    let pendingAnchor = null;
    const flushScale = () => {
      scaleFrame = 0;
      setScale(viewport, scale);
      if (!pendingAnchor) return;
      const { cx, cy, ax, ay } = pendingAnchor;
      pendingAnchor = null;
      scroll.scrollLeft = cx * scale - ax; // the extent is current now, so this clamp is the right one
      scroll.scrollTop = cy * scale - ay;
    };
    const queueScale = () => {
      if (scaleFrame) return;
      // requestAnimationFrame is the coalescer; a synchronous fallback keeps the harness and any
      // non-animating host correct rather than silently never writing.
      scaleFrame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(flushScale) : 0;
      if (!scaleFrame) flushScale();
    };

    const syncControls = () => {
      readout.textContent = `${Math.round(scale * 100)}%`;
      outBtn.disabled = scale <= SCALE_MIN;
      inBtn.disabled = scale >= SCALE_MAX;
    };

    // setZoom(next, anchorX, anchorY) — `next` is a SCALE now, not an index. Anchors are box-relative
    // px; the default is the box centre, measured HERE (call time) and never at mount, because the
    // panel may still be hidden. The content point under the anchor is read with the OLD scale, the
    // scale flips, and the scroll offset is restored so the thing under the cursor stays under it.
    // system/system-graph.mjs:247-260 is the shipped model this follows.
    const setZoom = (next, anchorX, anchorY) => {
      const n = Number(next);
      const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, Number.isFinite(n) ? n : SCALE_REST));
      if (clamped === scale) return scale;
      const ax = anchorX ?? scroll.clientWidth / 2;
      const ay = anchorY ?? scroll.clientHeight / 2;
      // A SECOND CALL INSIDE THE SAME FRAME — which is every pinch — would read a scroll offset the
      // first call has not written yet, so the content point comes from the pending target when
      // there is one. `scale` is still the pending call's scale at this line, which is exactly the
      // scale that target will be applied at.
      const fromLeft = pendingAnchor ? pendingAnchor.cx * scale - pendingAnchor.ax : scroll.scrollLeft;
      const fromTop = pendingAnchor ? pendingAnchor.cy * scale - pendingAnchor.ay : scroll.scrollTop;
      const cx = (fromLeft + ax) / scale;
      const cy = (fromTop + ay) / scale;
      scale = clamped;
      pendingAnchor = { cx, cy, ax, ay };
      queueScale();
      syncControls();
      return scale;
    };

    // FIT NOW ACTUALLY FITS. The discrete table could only snap DOWN to a level at or below the
    // ideal ratio, so "fit" was always an under-estimate and the announcement had to say "the level
    // reached" rather than "everything is in view". A continuous scale can be the ratio itself.
    //
    // The stage is a fixed unscaled box, so the ratio is read from the constants rather than
    // measured — offsetWidth would report the POST-transform box at any scale but 1 and fit would be
    // computing against its own last answer.
    //
    // A ZERO (or non-finite) AVAILABLE DIMENSION means the panel was hidden at call time — #173's
    // "measure at call time, never at mount" trap arriving as a division by zero. The old answer was
    // the rest level, and it is kept verbatim: the honest reading of "I cannot measure this" is
    // "leave it at 1", never Infinity.
    const fit = () => {
      const aw = scroll.clientWidth;
      const ah = scroll.clientHeight;
      const ratio = [aw, ah].every((n) => Number.isFinite(n) && n > 0)
        ? Math.min(aw / STAGE_W, ah / STAGE_H)
        : SCALE_REST;
      setZoom(ratio, 0, 0);
      // THE ORIGIN, WHATEVER THE READER HAD PANNED TO, so setZoom's anchored target is dropped
      // rather than re-applied on the next frame (#302, PR #432's F3). These two writes stay
      // SYNCHRONOUS and stay correct: 0 is inside every extent, so no flush can clamp it away.
      pendingAnchor = null;
      scroll.scrollLeft = 0;
      scroll.scrollTop = 0;
      say(`Zoom ${Math.round(scale * 100)} percent, fit to the canvas`);
      return scale;
    };

    const reset = () => {
      setZoom(SCALE_REST, 0, 0);
      // THE ORIGIN, WHATEVER THE READER HAD PANNED TO, so setZoom's anchored target is dropped
      // rather than re-applied on the next frame (#302, PR #432's F3). These two writes stay
      // SYNCHRONOUS and stay correct: 0 is inside every extent, so no flush can clamp it away.
      pendingAnchor = null;
      scroll.scrollLeft = 0;
      scroll.scrollTop = 0;
      say("Zoom 100 percent, back to the top left");
      return scale;
    };

    const ac = new AbortController();
    const { signal } = ac;

    outBtn.addEventListener("click", () => { setZoom(scale / ZOOM_STEP); }, { signal });
    inBtn.addEventListener("click", () => { setZoom(scale * ZOOM_STEP); }, { signal });
    fitBtn.addEventListener("click", fit, { signal });
    resetBtn.addEventListener("click", reset, { signal });

    // --- wheel ----------------------------------------------------------------------------------
    // ⌘/Ctrl-wheel ONLY, which also covers a trackpad pinch — every engine delivers a pinch as a
    // wheel event with ctrlKey set, so pinch needs no extra code. A BARE WHEEL IS NEVER TOUCHED:
    // it scrolls the box and then chains to the page, so a canvas embedded mid-page never traps the
    // reader's scroll. That is the dark pattern this whole handler exists to not be.
    scroll.addEventListener("wheel", (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      // EXPONENTIAL, not additive: a zoom that added a constant would move fast at 0.2 and crawl at
      // 3. exp(-delta / WHEEL_SCALE) makes one notch the same proportional change at every scale,
      // which is also what makes the cursor anchor feel stable. No accumulator any more — the scale
      // is continuous, so every delta is a real answer, and the per-frame coalescing in queueScale
      // is what keeps a pinch's event flood to one write.
      const r = scroll.getBoundingClientRect(); // measured in the handler — see setZoom's note
      setZoom(scale * Math.exp(-e.deltaY / WHEEL_SCALE), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false, signal });

    // --- pan ------------------------------------------------------------------------------------
    // Pointer capture, not document listeners, so a drag that leaves the box still tracks and
    // destroy() genuinely detaches everything. Touch bails out: native touch scrolling already pans.
    let pan = null;
    const endPan = (e) => {
      if (!pan || (e && e.pointerId !== pan.id)) return;
      try { scroll.releasePointerCapture(pan.id); } catch { /* already released */ }
      pan = null;
      scroll.classList.remove("is-panning");
    };

    scroll.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.pointerType === "touch") return;
      // A PRESS ON A REAL CONTROL IS A CLICK, NOT A PAN. Capture retargets the pointerup to this
      // scroller, and the click event — which fires on the common ancestor of the down and up
      // targets — then lands here instead of on the control, so the control silently never
      // activates. Latent for any interactive component on the harness's stage; #212's nav buttons
      // made it reachable on /factory. The TRUE mirror of studio-verbs.mjs's body-drag rule
      // ("body-drag must not fight a real control"), [tabindex] included — #212's screen headings
      // carry -1 — except the scroller ITSELF, which has one (:116) and is every press's ancestor:
      // the closest() walk-up trap the verbs' node.contains scoping exists for. The grab handles
      // never reach this line — the verbs' handler stops propagation for every press it owns.
      const control = e.target.closest?.("button, a, input, select, textarea, [tabindex]");
      if (control && control !== scroll) return;
      pan = { id: e.pointerId, x: e.clientX, y: e.clientY, left: scroll.scrollLeft, top: scroll.scrollTop };
      try { scroll.setPointerCapture(e.pointerId); } catch { /* capture unavailable — the move listener still tracks */ }
      scroll.classList.add("is-panning");
    }, { signal });

    scroll.addEventListener("pointermove", (e) => {
      if (!pan || e.pointerId !== pan.id) return;
      // Bail BEFORE applying the delta. Firefox, once a captured pointer leaves the window, keeps
      // delivering pointermove with clientX 0 and buttons 0 — applied literally that is a huge
      // jump, which is the bug tooling/proto-journey.mjs caught in device-frame.mjs:137-152. And on
      // every engine a button released outside the window delivers no pointerup at all, so without
      // this the pan sticks and every later move keeps scrolling.
      if ((e.buttons & 1) === 0) { endPan(e); return; }
      scroll.scrollLeft = pan.left - (e.clientX - pan.x);
      scroll.scrollTop = pan.top - (e.clientY - pan.y);
    }, { signal });

    scroll.addEventListener("pointerup", endPan, { signal });
    scroll.addEventListener("pointercancel", endPan, { signal });

    // --- arrangement ----------------------------------------------------------------------------
    // THROUGH setPos, AND ONLY setPos (#302). A position is --x/--y/--w (and --h for a frame), and
    // the sheet translates by them; nothing here reaches el.style directly, which is what keeps
    // group 7's function-scoped budget true.
    //
    // The announcement says PLACED, not moved. At #204 nothing has moved — place() is initial
    // placement and the mover is #205 — so "moved to column 2" would be a claim this ticket cannot
    // make, and #205 would inherit the wrong phrasing rather than writing its own verb.
    //
    // THE SLOT IS A WRAPPER, NOT THE COMPONENT (#205). Until then the rendered component WAS the
    // .stx-slot, and one of the library's shapes renders as a bare <button>
    // (agentic-renderer.mjs:239-249's primary-button) — so Enter or Space on a slot would be
    // ambiguous between activating the component and picking it up. The wrapper carries the
    // arrangement attributes and holds an explicit .stx-grab move button, which gives every
    // component the same unambiguous keyboard target and satisfies SC 2.5.7's single-pointer
    // alternative for the drag (system/studio-verbs.mjs's header records which criterion is which).
    //
    // IDEMPOTENT: called with a node that already IS a wrapper — or with a component already inside
    // one — it MOVES that wrapper rather than nesting a second. Both drivers rely on it: each does
    // querySelector(".stx-slot") -> place(node) -> read the position off that same node.
    // THE HANDLE IS THIS MODULE'S STRUCTURE AND ANOTHER MODULE'S BEHAVIOUR (#231 L2). place() draws
    // the .stx-grab button, but every listener that makes it do anything — and the #stx-move-help
    // element its aria-describedby points at — are created by studio-verbs.mjs's mountCanvasVerbs.
    // A canvas mounted ALONE therefore used to hand a keyboard reader one dead tab stop per
    // component, each describing itself through an IDREF that resolves to nothing. Neither existing
    // gate could see it, because both mount both.
    //
    // So the handle is born DISABLED and undescribed, and arming it is the verbs' mount announcing
    // itself. The id comes from the module that OWNS the instructions element rather than being
    // literalled twice, and arming is idempotent and forward-acting: a component placed after the
    // verbs mounted is armed at creation.
    //
    // TWO IDS SINCE #219, for the same reason there was one: the frames' .stx-resize handle is drawn
    // by place() and armed by the verbs, and its instructions element (#stx-resize-help) belongs to
    // the module that created it. A second parameter rather than an object, so every existing caller
    // is unchanged and a host that arms only the move handles is still a legal call.
    let armed = false;
    let helpId = null;
    let resizeHelpId = null;
    const armMoveHandles = (describedBy, resizeDescribedBy) => {
      armed = true;
      helpId = typeof describedBy === "string" && describedBy ? describedBy : null;
      resizeHelpId = typeof resizeDescribedBy === "string" && resizeDescribedBy ? resizeDescribedBy : null;
      for (const grab of stage.querySelectorAll(".stx-grab")) {
        grab.disabled = false;
        if (helpId) grab.setAttribute("aria-describedby", helpId);
      }
      for (const grip of stage.querySelectorAll(".stx-resize")) {
        grip.disabled = false;
        if (resizeHelpId) grip.setAttribute("aria-describedby", resizeHelpId);
      }
    };

    let nextId = 0;
    // `component` is the VOCABULARY SHAPE of what is being placed ("metric-tile"), and it is
    // optional because the canvas holds nodes that genuinely have none — /factory's fat-marker
    // blocks are the drafted board drawn by system/studio.mjs, not library components. Recorded on
    // the wrapper so system/studio-verbs.mjs can put the real shape on the bus's `target.component`
    // instead of the display label (#232); a caller that does not know a shape supplies none, and
    // the action carries none, which is the honest answer rather than an invented name.
    //
    // `kind` IS THE FOURTH FAMILY'S ONE BRANCH (#219). kind: "frame" builds a .stx-frame wrapper —
    // a device frame is on the grid but is NOT a board wrapper (FRAME_CLASS's comment says why) —
    // and it spans, so spanCol / spanRow join col / row as the geometry the caller supplies.
    // Everything else is shared deliberately: the idempotency contract two drivers rely on, the
    // handle-first tab order, the born-inert handle, the re-label fix (#231 L3), the id counter and
    // the say() on placement are six rules someone argued for, and a second wrapper builder in
    // system/studio-frames.mjs would be a second copy of all six.
    const place = (node, { x, y, w, h, name, component, kind, id } = {}) => {
      if (!node) throw new Error("studio-canvas: place() was called with no node");
      // WIDENED WITH THE FAMILY, and the parent test with it. Both drivers do
      // querySelector(...) -> place(node) -> read the position off that same node, so a frame that
      // nested a second wrapper on its second call would break idempotency for the family that
      // needs it most.
      const isWrapper = (n) => Boolean(n?.classList?.contains("stx-slot") || n?.classList?.contains(FRAME_CLASS));
      const existing = isWrapper(node)
        ? node
        : (isWrapper(node.parentElement) ? node.parentElement : null);
      const wrap = existing || el("div", { class: kind === "frame" ? FRAME_CLASS : "stx-slot" });
      const label = name || node.dataset?.stxName || wrap.dataset.stxName || "Component";

      if (!existing) {
        // AN ID THE CALLER OWNS (#306). The canvas page places build-document nodes under the
        // document's own ids (f1, n1, d7) so setArrows resolves them by the ids the ops use. The
        // counter still advances, so a page mixing both kinds cannot collide, and a duplicate is
        // refused: a second node answering setArrows' lookup would draw arrows to the wrong one.
        if (id != null && stage.querySelector(`[data-stx-id="${CSS.escape(String(id))}"]`)) {
          throw new Error(`studio-canvas: place() was given id "${id}", which is already on the stage`);
        }
        nextId += 1;
        wrap.setAttribute("data-stx-id", id != null ? String(id) : `s${nextId}`);
        // The handle FIRST, so it is the wrapper's first tab stop and a reader meets the move
        // affordance before the component's own controls. Its behaviour and its instructions
        // element both belong to system/studio-verbs.mjs, which is why it is born INERT and armed
        // by that module's mount — see armMoveHandles() below. No aria-pressed: it would describe
        // the button's own toggle state rather than the component being carried (that header).
        const born = el("button", { type: "button", class: "stx-grab" });
        if (!armed) born.disabled = true;
        else if (helpId) born.setAttribute("aria-describedby", helpId);
        wrap.appendChild(born);
        wrap.appendChild(node);
        // The resize handle, AFTER the component: a frame's first tab stop is still Move, and Resize
        // is the last, so the reader meets the two verbs in the order the grammar teaches them. Born
        // inert and armed by studio-verbs.mjs's mount, exactly as .stx-grab is (#231 L2).
        if (kind === "frame") {
          const grip = el("button", { type: "button", class: "stx-resize" });
          if (!armed) grip.disabled = true;
          else if (resizeHelpId) grip.setAttribute("aria-describedby", resizeHelpId);
          wrap.appendChild(grip);
        }
      }
      wrap.setAttribute("data-stx-name", label);
      // OUT OF THE CREATE BRANCH (#231 L3). place(node, { name }) on an existing wrapper is a
      // RE-LABEL — #206 does exactly that — and the announced name and the handle's accessible name
      // must not be allowed to disagree: data-stx-name was written on every call and the aria-label
      // only on the first, so a re-placed component kept announcing "Move <the old name>".
      const grab = wrap.querySelector(":scope > .stx-grab");
      if (grab) grab.setAttribute("aria-label", `Move ${label}`);
      // ITS TWIN, AND FOR THE SAME TWO REASONS (#219, PR #267 H1). The resize handle's only visual is
      // a CSS background-image corner glyph, which contributes NOTHING to the accessible name, and
      // aria-describedby is a description and never a name — so without this line the control's
      // computed name is "" and every frame's last tab stop announces a bare "button" (SC 4.1.2).
      // Out of the create branch like the label above, so a re-place cannot leave a stale name; the
      // `:scope >` guard is what makes it a no-op for a board wrapper, which has no such handle.
      const grip = wrap.querySelector(":scope > .stx-resize");
      if (grip) grip.setAttribute("aria-label", `Resize ${label}`);
      if (typeof component === "string" && component) wrap.setAttribute("data-stx-component", component);
      // THE SIZE IS READ FROM THE ARGUMENTS WHEN THEY CARRY ONE AND FROM THE WRAPPER OTHERWISE, so a
      // re-place that mentions no geometry keeps what the node already had rather than silently
      // shrinking it to the floor. That was #231 L3's rule for the label and it is the same rule
      // here. The fallback for a width nobody has ever supplied is the default node box; for a
      // HEIGHT it is nothing at all, because a board wrapper has no authored height and inventing
      // one would give every wrapper a size nobody chose (D-c).
      const px = (v) => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : null; };
      const width = w ?? px(wrap.style.getPropertyValue("--w")) ?? NODE_W;
      const isFrame = wrap.classList.contains(FRAME_CLASS);
      const height = isFrame ? (h ?? px(wrap.style.getPropertyValue("--h")) ?? NODE_H) : undefined;
      const at = setPos(wrap, x ?? px(wrap.style.getPropertyValue("--x")) ?? 0,
        y ?? px(wrap.style.getPropertyValue("--y")) ?? 0, width, height);
      stage.appendChild(wrap);
      // Still PLACED, not moved. place() is placement; "moved to X, Y" is the mover's sentence and
      // belongs to system/studio-verbs.mjs's one consumer. The numbers are setPos's ANSWER rather
      // than the arguments, so a node clamped to the stage edge is announced where it actually is.
      say(`${label} at ${Math.round(at.x)}, ${Math.round(at.y)}`);
      return at;
    };

    // --- the arrows -------------------------------------------------------------------------------
    // setArrows(list) declares WHAT is connected; nothing here is told WHERE. `list` is
    // [{ id, from: { frameId, partId? }, to: { frameId }, trigger? }] — the shape #302's build
    // document emits — and every redraw re-derives geometry from the two nodes' own properties.
    //
    // REDRAWN ON A MOVE, rAF-COALESCED. The position is an inline style now, so `style` is what a
    // move mutates and the observer has to name it — the same filter studio-layers.mjs and
    // studio-minimap.mjs carry, and the same failure if it is wrong: the arrows freeze where they
    // were first drawn and the page otherwise works.
    //
    // NO DRIVER ASSERTION IS OWED THAT THE COALESCING ENGAGED. S1 observed the deferral engaging on
    // WebKit alone under a real scripted gesture (42 redraws → 5); on Chromium and Firefox Playwright
    // cannot deliver pointermoves faster than the frame rate, so there is nothing to coalesce and the
    // coalesced configuration is identical to the bare one BY CONSTRUCTION. A check asserting it
    // engaged cannot fire on two of three engines — #423's G1 shape, and this is where it would
    // recur.
    let arrows = [];
    let arrowFrame = 0;
    const nodeBox = (id) => {
      const node = stage.querySelector(`[data-stx-id="${CSS.escape(String(id))}"]`);
      if (!node) return null;
      const prop = (name) => parseFloat(node.style.getPropertyValue(name));
      const h = prop("--h");
      return { x: prop("--x") || 0, y: prop("--y") || 0, w: prop("--w") || NODE_W, h: Number.isFinite(h) ? h : node.offsetHeight };
    };
    const drawArrows = () => {
      arrowFrame = 0;
      for (const line of [...arrowLayer.querySelectorAll(".stx-arrow")]) line.remove();
      for (const a of arrows) {
        const seg = arrowPath(nodeBox(a?.from?.frameId), nodeBox(a?.to?.frameId));
        // A dangling arrow DRAWS NOTHING and is not dropped from the list: the document still says
        // the two are connected, and an overlay silently editing that claim is the overlay deciding
        // what the build document means.
        if (!seg) continue;
        arrowLayer.appendChild(svgEl("line", {
          class: "stx-arrow", "data-stx-arrow": a.id ?? null,
          x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2,
          "marker-end": "url(#stx-arrowhead)",
        }));
      }
    };
    const queueArrows = () => {
      if (arrowFrame || !arrows.length) return;
      arrowFrame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(drawArrows) : 0;
      if (!arrowFrame) drawArrows();
    };
    const setArrows = (list) => {
      arrows = (Array.isArray(list) ? list : []).filter((a) => a && a.from && a.to);
      drawArrows();
      return arrows.length;
    };
    const arrowObserver = typeof MutationObserver === "function" ? new MutationObserver(queueArrows) : null;
    arrowObserver?.observe(stage, { attributes: true, attributeFilter: ["style"], subtree: true, childList: true });

    const handleObj = {
      viewport, scroll, stage, announcer,
      place,
      setArrows,
      // Called by studio-verbs.mjs's mount, and by nothing else — see armMoveHandles above.
      armMoveHandles,
      // Exposed so #205's mover announces through the canvas's ONE live region rather than
      // declaring a second one beside it.
      say,
      fit,
      reset,
      setZoom,
      // `scale` now, not `level`: the old name meant an index into a table that no longer exists,
      // and a name that means an index while it holds a scale is how the next reader gets it wrong.
      get scale() { return scale; },
      destroy() {
        ac.abort();
        arrowObserver?.disconnect();
        if (scaleFrame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(scaleFrame);
        if (arrowFrame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(arrowFrame);
        zoomRow.remove();
        announcer.remove();
        scroll.remove();
        viewport.classList.remove("stx-viewport");
        if (live === handleObj) live = null;
      },
    };
    syncControls();
    live = handleObj;
    return handleObj;
  } finally {
    // Every path, including the early return above and any throw.
    viewport?.setAttribute("data-studio-canvas", "ready");
  }
}
