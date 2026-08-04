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
//   3. ZOOM AND ARRANGEMENT ARE ATTRIBUTES. data-zoom selects a scale from a table declared in
//      system/studio.css; data-col/data-row select grid lines from rules in the same sheet. This
//      module therefore writes ZERO inline styles, which is what lets it join build-checks group 7
//      with no exception argued — `writes === 1` stays literally true. The cost is that `fit()`
//      snaps to a level at or below the ideal ratio instead of fitting exactly. Recorded as a
//      trade: stepped is also announceable and has a finite tamper surface for #208's codec.
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
// The caps are exported because #208's share codec imports THEM rather than re-typing a bound —
// the breadboard.mjs LABEL_MAX / pattern-rules.mjs SLOT_MAX precedent. CSS cannot import, so
// system/studio.css mirrors these by hand and build-checks group 12 pins the mirror exhaustively.
export const MAX_COLS = 12;
export const MAX_ROWS = 8;

// Discrete levels, not a continuous scale — see call 3 in the header. ZOOM_REST is the index of
// 1.0: at rest the stage is scale 1 and scrolled to 0,0.
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2];
export const ZOOM_REST = 2;

// The ONE place a slot is validated, so #205's mover and #208's decoder share one definition of
// "on the grid" instead of each clamping in its own way. Coerces first (a decoded string "4" is a
// real input), then rejects everything non-finite to 1 rather than letting NaN propagate into an
// attribute.
export function clampSlot({ col, row } = {}) {
  const axis = (v, max) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return 1;
    return Math.min(max, Math.max(1, n));
  };
  return { col: axis(col, MAX_COLS), row: axis(row, MAX_ROWS) };
}

// The index of the largest level whose scale still fits the content in the available box. Snapping
// DOWN is what lets fit be discrete without ever overflowing the viewport — a level ABOVE the
// ratio would fit nothing, it would just be closer.
//
// A zero (or non-finite) content dimension means the panel was hidden at call time, which is #173's
// "measure at call time, never at mount" trap arriving as a division by zero. Answer ZOOM_REST: the
// honest reading of "I cannot measure this" is "leave it at 1", never Infinity.
export function fitLevel(availableW, availableH, contentW, contentH) {
  const nums = [availableW, availableH, contentW, contentH].map(Number);
  if (!nums.every((n) => Number.isFinite(n) && n > 0)) return ZOOM_REST;
  const ratio = Math.min(nums[0] / nums[2], nums[1] / nums[3]);
  let index = 0;
  for (let i = 0; i < ZOOM_LEVELS.length; i += 1) if (ZOOM_LEVELS[i] <= ratio) index = i;
  return index;
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (device-frame.mjs:33,
// scrub.mjs:104). A shared one would be a dependency between modules that are deliberately
// independent surfaces.
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

// A trackpad pinch arrives as many small ctrl+wheel deltas on every engine. Stepping a level per
// raw event makes zoom unusable, so deltas accumulate and only a gesture past this threshold steps.
const WHEEL_STEP = 40;

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
    viewport.setAttribute("data-zoom", String(ZOOM_REST));

    const say = (message) => { announcer.textContent = message; };

    // --- zoom -----------------------------------------------------------------------------------
    let level = ZOOM_REST;
    const syncControls = () => {
      readout.textContent = `${Math.round(ZOOM_LEVELS[level] * 100)}%`;
      outBtn.disabled = level <= 0;
      inBtn.disabled = level >= ZOOM_LEVELS.length - 1;
    };

    // setZoom(index, anchorX, anchorY) — anchors are box-relative px; the default is the box
    // centre, measured HERE (call time) and never at mount, because the panel may still be hidden.
    // The content point under the anchor is read with the OLD scale, the attribute flips, and the
    // scroll offset is restored so the thing under the cursor stays under the cursor.
    const setZoom = (index, anchorX, anchorY) => {
      const next = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, Math.round(Number(index)) || 0));
      if (next === level) return level;
      const ax = anchorX ?? scroll.clientWidth / 2;
      const ay = anchorY ?? scroll.clientHeight / 2;
      const cx = (scroll.scrollLeft + ax) / ZOOM_LEVELS[level];
      const cy = (scroll.scrollTop + ay) / ZOOM_LEVELS[level];
      level = next;
      viewport.setAttribute("data-zoom", String(level));
      scroll.scrollLeft = cx * ZOOM_LEVELS[level] - ax; // the browser clamps both to the new range
      scroll.scrollTop = cy * ZOOM_LEVELS[level] - ay;
      syncControls();
      return level;
    };

    // Measured unscaled, with offsetWidth/offsetHeight rather than a bounding rect: a rect reports
    // the POST-transform box, so at any level ≠ 1 fit would be computing against its own last
    // answer and converge on nonsense.
    const fit = () => {
      const chosen = fitLevel(scroll.clientWidth, scroll.clientHeight, stage.offsetWidth, stage.offsetHeight);
      setZoom(chosen, 0, 0);
      scroll.scrollLeft = 0;
      scroll.scrollTop = 0;
      // Announced as the level reached, never as "everything is in view" — below the smallest level
      // nothing fits, and fit() floors there rather than inventing a scale. Claiming otherwise would
      // be a sentence the discrete table cannot always keep.
      say(`Zoom ${Math.round(ZOOM_LEVELS[level] * 100)} percent, fit to the canvas`);
      return level;
    };

    const reset = () => {
      setZoom(ZOOM_REST, 0, 0);
      scroll.scrollLeft = 0;
      scroll.scrollTop = 0;
      say("Zoom 100 percent, back to the top left");
      return level;
    };

    const ac = new AbortController();
    const { signal } = ac;

    outBtn.addEventListener("click", () => { setZoom(level - 1); }, { signal });
    inBtn.addEventListener("click", () => { setZoom(level + 1); }, { signal });
    fitBtn.addEventListener("click", fit, { signal });
    resetBtn.addEventListener("click", reset, { signal });

    // --- wheel ----------------------------------------------------------------------------------
    // ⌘/Ctrl-wheel ONLY, which also covers a trackpad pinch — every engine delivers a pinch as a
    // wheel event with ctrlKey set, so pinch needs no extra code. A BARE WHEEL IS NEVER TOUCHED:
    // it scrolls the box and then chains to the page, so a canvas embedded mid-page never traps the
    // reader's scroll. That is the dark pattern this whole handler exists to not be.
    let wheelAcc = 0;
    scroll.addEventListener("wheel", (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) < WHEEL_STEP) return;
      const direction = wheelAcc < 0 ? 1 : -1; // wheel up / pinch out zooms in
      wheelAcc = 0;
      const r = scroll.getBoundingClientRect(); // measured in the handler — see setZoom's note
      setZoom(level + direction, e.clientX - r.left, e.clientY - r.top);
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
    // ATTRIBUTES ONLY. data-col/data-row select grid lines from rules in system/studio.css; nothing
    // here writes a style property, and that is the entire reason the zoom table exists as CSS.
    //
    // The announcement says PLACED, not moved. At #204 nothing has moved — place() is initial
    // placement and the mover is #205 — so "moved to column 2" would be a claim this ticket cannot
    // make, and #205 would inherit the wrong phrasing rather than writing its own verb.
    const place = (node, { col, row, name } = {}) => {
      if (!node) throw new Error("studio-canvas: place() was called with no node");
      const slot = clampSlot({ col, row });
      node.classList.add("stx-slot");
      node.setAttribute("data-col", String(slot.col));
      node.setAttribute("data-row", String(slot.row));
      stage.appendChild(node);
      say(`${name || node.dataset.stxName || "Component"} in column ${slot.col}, row ${slot.row}`);
      return slot;
    };

    const handleObj = {
      viewport, scroll, stage, announcer,
      place,
      fit,
      reset,
      setZoom,
      get level() { return level; },
      destroy() {
        ac.abort();
        zoomRow.remove();
        announcer.remove();
        scroll.remove();
        viewport.removeAttribute("data-zoom");
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
