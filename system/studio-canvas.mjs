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

// ---- the SPAN layer (#219) ----------------------------------------------------------------------
// A frame is a RECTANGLE of cells, not a cell. Everything below is the rectangle twin of clampSlot's
// answers, and it lives here — beside the caps it clamps against — rather than in the frames module,
// because three layers read it: system/studio-frames.mjs (the descriptors), system/studio-verbs.mjs
// (the occupancy, the gesture and the ui.resize consumer) and tooling/build-checks.mjs (groups 12,
// 13 and 24). CSS cannot import, so system/studio.css mirrors the span tables by hand and group 12
// pins that mirror exhaustively, exactly as it does for the caps and the zoom levels.

// MIN is 1 because a 1×1 frame is a legitimate (tiny) state, and refusing it would need a second
// bound nothing else in the studio has.
export const MIN_SPAN = 1;

// The frame's wrapper class, as ONE constant three modules read. It is NOT `.stx-slot`, and that is
// the ticket's load-bearing call: `.stx-slot` means BOARD WRAPPER — studio-compile.mjs's identity
// and count tripwires, studio.mjs's arrangementNow() and adoptBoard's removal loop all depend on
// that meaning, and they keep it. Frames join .stx-guide and .stx-menu (#217) as a family that is on
// the grid without being a board wrapper.
export const FRAME_CLASS = "stx-frame";

// The MOVABLE families, as ONE selector both this module and studio-verbs.mjs read — exported rather
// than literalled twice for the MAX_COLS / LABEL_MAX / SLOT_MAX reason: the day a fifth family
// becomes movable there is exactly one line to edit, and build-checks can pin it.
//
// NOTE WHAT IS NOT HERE. .stx-guide and .stx-menu are chrome, and #217's SELECTION layer keeps its
// own `.stx-slot`-only scope on purpose — a frame moves and resizes on its own (system/
// studio-frames.mjs's header records why half-widening a selection is a bug factory).
export const MOVABLE = ".stx-slot, .stx-frame";

// clampSpan(slot, span) → { cols, rows } that keep the whole footprint ON THE GRID from `slot`.
// Coerces first, exactly as clampSlot does — a decoded "2" is a real input — and answers MIN_SPAN
// for anything non-finite rather than letting NaN reach an attribute.
//
// THE BOUND IS `MAX_COLS - col + 1`, NOT `MAX_COLS`. A frame at column 11 can be at most 2 wide.
// Getting this wrong looks correct at column 1, which is where it gets tested first.
export function clampSpan({ col, row } = {}, { cols, rows } = {}) {
  const start = clampSlot({ col, row });
  const axis = (v, max) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return MIN_SPAN;
    return Math.min(max, Math.max(MIN_SPAN, n));
  };
  return { cols: axis(cols, MAX_COLS - start.col + 1), rows: axis(rows, MAX_ROWS - start.row + 1) };
}

// footprint(slot, span) → ["c,r", …] — every cell the rectangle covers, in the same string form
// studio-verbs.mjs's occupancyKey produces, so the two sets are directly comparable. The key is
// written out rather than imported because studio-verbs.mjs imports THIS file; group 13 pins the two
// against each other instead, which is the honest place for a coupling a circular import would hide.
//
// A 1×1 span returns exactly [occupancyKey(slot)] — the property that lets the whole occupancy layer
// widen without changing a single existing answer.
export function footprint(slot, span) {
  const start = clampSlot(slot);
  const { cols, rows } = clampSpan(start, span);
  const out = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) out.push(`${start.col + c},${start.row + r}`);
  }
  return out;
}

// fits(slot, span, occupied) → boolean. THE ONE PREDICATE four callers share (stepSlot, groupDelta,
// the resize gesture's preview and the keyboard End), and the reason it is here rather than in a
// mount: `occupied` is a plain Set of keys, so this is pure and build-checks group 13 can drive it —
// which the DOM-reading occupancyExcept() it is fed from never could.
//
// On-grid AND every covered cell free. A footprint that runs off the grid is FALSE, never clamped,
// because clamping a DESTINATION silently moves the reader's frame somewhere they did not ask for —
// stepSlot's "a blocked step is a real answer" rule, extended to rectangles. That is also why this
// and clampSpan must not be merged: clamping is "make this legal geometry", fitting is "is this
// destination free", and the two callers want opposite answers about a collision.
export function fits(slot, span, occupied) {
  const col = Math.round(Number(slot?.col));
  const row = Math.round(Number(slot?.row));
  const cols = Math.round(Number(span?.cols));
  const rows = Math.round(Number(span?.rows));
  if (![col, row, cols, rows].every(Number.isFinite)) return false;
  if (cols < MIN_SPAN || rows < MIN_SPAN) return false;
  if (col < 1 || row < 1) return false;
  if (col + cols - 1 > MAX_COLS || row + rows - 1 > MAX_ROWS) return false;
  const taken = occupied instanceof Set ? occupied : new Set(occupied || []);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) if (taken.has(`${col + c},${row + r}`)) return false;
  }
  return true;
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
    // ATTRIBUTES ONLY. data-col/data-row select grid lines from rules in system/studio.css; nothing
    // here writes a style property, and that is the entire reason the zoom table exists as CSS.
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
    // one — it MOVES that wrapper rather than nesting a second. That is what keeps
    // tooling/studio-journey.mjs:93-100 and tooling/vt-verify.mjs:303-307 green unedited: both do
    // querySelector(".stx-slot") → place(node) → read data-col off that same node.
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
    const place = (node, { col, row, name, component, kind, spanCol, spanRow } = {}) => {
      if (!node) throw new Error("studio-canvas: place() was called with no node");
      const slot = clampSlot({ col, row });
      // WIDENED WITH THE FAMILY, and the parent test with it. Both drivers do
      // querySelector(…) → place(node) → read data-col off that same node, so a frame that nested a
      // second wrapper on its second call would break idempotency for the family that needs it most.
      const isWrapper = (n) => Boolean(n?.classList?.contains("stx-slot") || n?.classList?.contains(FRAME_CLASS));
      const existing = isWrapper(node)
        ? node
        : (isWrapper(node.parentElement) ? node.parentElement : null);
      const wrap = existing || el("div", { class: kind === "frame" ? FRAME_CLASS : "stx-slot" });
      const label = name || node.dataset?.stxName || wrap.dataset.stxName || "Component";

      if (!existing) {
        nextId += 1;
        wrap.setAttribute("data-stx-id", `s${nextId}`);
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
      wrap.setAttribute("data-col", String(slot.col));
      wrap.setAttribute("data-row", String(slot.row));
      // OUT OF THE CREATE BRANCH, like the label (#231 L3): a re-placed frame must not be left
      // wearing a stale span. The span is read from the ARGUMENTS when they carry one and from the
      // wrapper otherwise, so a re-place that mentions no geometry keeps the frame's size instead of
      // silently shrinking it to 1×1 — and it is re-clamped against the NEW column, which is the
      // whole reason clampSpan takes a slot.
      if (wrap.classList.contains(FRAME_CLASS)) {
        const span = clampSpan(slot, {
          cols: spanCol ?? wrap.getAttribute("data-span-col"),
          rows: spanRow ?? wrap.getAttribute("data-span-row"),
        });
        wrap.setAttribute("data-span-col", String(span.cols));
        wrap.setAttribute("data-span-row", String(span.rows));
      }
      stage.appendChild(wrap);
      // Still PLACED, not moved. place() is placement; "moved to column X, row Y" is the mover's
      // sentence and belongs to system/studio-verbs.mjs's one consumer.
      say(`${label} in column ${slot.col}, row ${slot.row}`);
      return slot;
    };

    const handleObj = {
      viewport, scroll, stage, announcer,
      place,
      // Called by studio-verbs.mjs's mount, and by nothing else — see armMoveHandles above.
      armMoveHandles,
      // Exposed so #205's mover announces through the canvas's ONE live region rather than
      // declaring a second one beside it.
      say,
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
