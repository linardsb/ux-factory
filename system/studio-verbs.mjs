// system/studio-verbs.mjs — hand-written canon (this repo; not generated). The studio canvas's
// MANIPULATION layer (epic #202 — docs/epics/prototype-studio.architecture.md §Key decisions
// "Data model" / "Interaction"; ticket #205; .claude/plans/studio-canvas-manipulation-205.md).
//
// #204 shipped a stage that pans, zooms and HOLDS components; placement was programmatic only. This
// file makes it operable: a placed component can be picked up and moved to another grid slot by
// pointer or entirely from the keyboard, every move is announced by the slot it landed in, every
// move is undoable, and every move travels system/action-bus.mjs with an honest `source`.
//
// The load-bearing calls, made here so #206/#207/#209/#217 inherit rather than re-argue them:
//
//   1. THE BUS IS THE DRIVE PATH, NOT AN OBSERVER. Both input paths EMIT one ui.move and do nothing
//      else; a single consumer applies it. "The keyboard path produces the identical model change as
//      the pointer path" is then true by construction rather than by two code paths that happen to
//      agree — and a third source (a source:"agent" action injected through getVerbs(), which is
//      exactly what #209's replay driver is) moves the same node through the same code. This is the
//      second application of system/bus-toggles.mjs:157-159's pattern; action-bus.mjs is NOT edited,
//      and if you find yourself editing it the design has gone wrong.
//   2. A GESTURE IS A PREVIEW; ONLY THE DROP COMMITS. Pointer drag and keyboard arrow-stepping move
//      the node live while remembering the origin; the drop emits EXACTLY ONE ui.move. The rejected
//      alternative — commit per slot crossing — gives a five-slot drag five undo entries, five
//      announcements and a five-step Escape. One gesture = one action = one announcement = one
//      history entry, for both paths.
//   3. AN OCCUPIED CELL IS NOT ENTERABLE. No swap (one gesture would move two nodes, so a second
//      announcement to word and a second thing to undo) and no stacking (which makes "moved to
//      column 2, row 1" a lie, because two nodes share the cell). One rule both paths share: the
//      occupancy set is built at gesture start, the arrow resolver skips non-enterable cells and the
//      pointer hit-test keeps the last valid slot. There is no drop refusal to word.
//   4. UNDO/REDO IS A SNAPSHOT STACK of the whole arrangement, pure and DOM-free, so CI deep-compares
//      it instead of the driver eyeballing the stage. At #205 the snapshot is the ARRANGEMENT; #206's
//      board extends its CONTENTS without touching the stack.
//
// TWO ACCESSIBILITY CRITERIA, AND THEY ARE NOT THE SAME ONE. WCAG 2.2 SC 2.5.7 Dragging Movements
// requires a SINGLE-POINTER alternative to a drag — that is the .stx-grab button: click to pick up,
// click to drop, no dragging movement anywhere in the path. SC 2.1.1 Keyboard is what the Enter /
// arrows / Enter path satisfies. Conflating them would let this file claim 2.5.7 compliance for a
// keyboard affordance, which is a different criterion; both are implemented, and this comment is
// where which-is-which is recorded.
//
// NO aria-pressed ON THE HANDLE. It means a toggle button's own on/off state, so a screen reader
// would say "Move Metric 1, pressed" — a sentence about the button rather than about the component
// being carried. aria-grabbed is the semantic that would fit and it is deprecated in ARIA 1.2. The
// picked-up state is carried by the live region (which announces the pick-up, every arrow step and
// the drop) and visually by .is-picked.
//
// NOT TOUCH AUTHORING. pointerType === "touch" bails without starting a gesture, per the PRD's
// stated non-goal: no mobile AUTHORING parity — mobile watches the replay and uses the form path.
// Recorded as a decision here rather than left as an unexplained gap.
//
// MOVEMENT ANIMATES ONLY ON UNDO/REDO, through element.animate() — the one movement the reader's own
// hand or keypress did not track. See animateTo() for why that call is legal rather than a way
// around build-checks group 7.
//
// Node-import safe: no DOM outside a function body and no self-boot, because tooling/build-checks.mjs
// imports this file directly for its pure exports. The harness (studio.html) mounts it explicitly;
// the designed surface is /factory, and that is #206's route surgery.

import { MAX_COLS, MAX_ROWS, ZOOM_LEVELS, clampSlot } from "./studio-canvas.mjs";

// ---- the pure layer ----------------------------------------------------------------------------
// Everything below takes plain data and returns plain data, so build-checks group 13 drives it in CI
// with no browser — the same split system/studio-canvas.mjs:34-73 carries for the substrate.

// The arrow vocabulary, as [dcol, drow]. Shared by the keyboard path and by #217's future verbs
// rather than re-derived from key names in a switch.
export const DIRS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

// The stack's cap. ~1 KB a snapshot at studio scale, so 50 is ~50 KB and generous; the point of a
// cap at all is that a long session cannot grow the stack without bound.
export const HISTORY_MAX = 50;

// One string per cell, so occupancy is a Set lookup rather than an array scan per candidate.
export function occupancyKey({ col, row } = {}) {
  return `${col},${row}`;
}

// ONE arrow step. Walks one cell in `dir` and KEEPS WALKING in the same direction while candidates
// are occupied, so a peer in the way is skipped rather than landed on (call 3 in the header). Stops
// at the grid edge and returns `from` UNCHANGED when no free cell exists that way — a blocked step
// is a real answer the keyboard path announces, not a silent no-op.
//
// Never returns an occupied or off-grid slot.
//
// WHAT ACTUALLY TERMINATES THE WALK is the grid-edge return: the walk is SINGLE-AXIS — it never
// turns — so every iteration moves one cell further out and the edge is reached in at most that
// axis's cap. `limit` is a BACKSTOP the current code makes unreachable, and saying so is the point:
// removing it and re-running group 13 leaves every case green, which was verified by mutation
// rather than assumed. It is kept because the edge test is the kind of condition a later edit
// (#217's multi-node gesture) could get wrong, and an unreachable bound is cheaper than a hang —
// but the check that proves a fully occupied direction returns is proving the EDGE test, not this.
export function stepSlot(from, dir, occupied) {
  const start = clampSlot(from);
  if (!Array.isArray(dir) || dir.length !== 2) return start;
  const [dc, dr] = dir;
  const taken = occupied instanceof Set ? occupied : new Set(occupied || []);
  const limit = dc ? MAX_COLS : MAX_ROWS;

  let { col, row } = start;
  for (let i = 0; i < limit; i += 1) {
    col += dc;
    row += dr;
    if (col < 1 || col > MAX_COLS || row < 1 || row > MAX_ROWS) return start; // walked off the grid
    if (!taken.has(occupancyKey({ col, row }))) return { col, row };
  }
  return start;
}

// A point ALREADY IN THE STAGE'S UNSCALED LOCAL SPACE → a slot. `geom` is
// { cols: number[], rows: number[], colGap, rowGap } — USED track sizes, read from the resolved grid
// (getComputedStyle(stage).gridTemplateColumns) rather than from --stx-slot-w, because a used value
// is a layout fact and needs no per-engine argument about whether var(--spacing-md, 16px) resolves
// inside a computed custom property. system/breadboard.mjs:628 reads the grid the same way.
//
// THE GAP RULE, decided rather than discovered because group 13 asserts it: a point landing IN A GAP
// resolves to the track BEFORE it. The band for track i therefore runs from its start to the start of
// track i+1, and the last track's band runs to infinity (clamped).
//
// THIS FUNCTION DOES NO COORDINATE CONVERSION. Getting from a clientX/clientY to its argument is a
// four-step chain that lives in the mount, deliberately, so this stays pure and CI-drivable.
export function hitSlot(x, y, geom = {}) {
  const walk = (v, tracks, gap) => {
    const list = Array.isArray(tracks) ? tracks : [];
    const n = Number(v);
    if (!Number.isFinite(n) || list.length === 0) return 1; // clampSlot's posture: never NaN onward
    let edge = 0;
    for (let i = 0; i < list.length; i += 1) {
      edge += (Number(list[i]) || 0) + (Number(gap) || 0); // the gap belongs to the track BEFORE it
      if (n < edge) return i + 1;
    }
    // Deliberately UNCLAMPED here: clampSlot below is the one definition of "on the grid", so a
    // stylesheet that drifted to more tracks than the cap is caught in exactly one place. An
    // Math.min() here as well would read as belt-and-braces and is worse than that — it makes the
    // clampSlot call unreachable, so the check that exists to prove the clamp can no longer fail.
    // Found by mutating it: with both, removing clampSlot left group 13 green.
    return list.length;
  };
  return clampSlot({
    col: walk(x, geom.cols, geom.colGap),
    row: walk(y, geom.rows, geom.rowGap),
  });
}

// The undo/redo stack over { stack, index }. Every snapshot is structuredClone'd on the way IN and
// on the way OUT, so a caller can never reach into history and mutate a stored arrangement — the
// property group 13 proves by mutating a returned snapshot and reading history back, never by
// grepping for the call.
//
// push() truncates the redo tail before appending (the standard rule, and the one that makes "undo,
// redo, then a new move" behave) and drops from the FRONT past HISTORY_MAX, adjusting `index` so the
// cursor still points at the same entry.
export function createHistory(initial) {
  const stack = [structuredClone(initial ?? {})];
  let index = 0;

  const at = () => structuredClone(stack[index]);

  return {
    push(snap) {
      stack.length = index + 1; // the redo tail is discarded by a new move
      stack.push(structuredClone(snap ?? {}));
      index = stack.length - 1;
      while (stack.length > HISTORY_MAX) {
        stack.shift();
        index -= 1;
      }
      return at();
    },
    undo() {
      if (index > 0) index -= 1; // at the bottom this is a no-op, never a throw
      return at();
    },
    redo() {
      if (index < stack.length - 1) index += 1;
      return at();
    },
    canUndo: () => index > 0,
    canRedo: () => index < stack.length - 1,
    current: at,
    depth: () => stack.length,
  };
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (studio-canvas.mjs:80,
// device-frame.mjs:33). Every node is built element by element — group 7 bans every
// markup-from-string sink across these modules, which is why a hostile component label can never
// become markup anywhere in the studio.
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

const reduceMotion = () => typeof matchMedia === "function"
  && matchMedia("(prefers-reduced-motion: reduce)").matches;

let live = null; // the mounted mover — the exported seam below drives THIS one, never a new one

// The driver's seam (bus-toggles.mjs:70's idiom, and the reason it is an export rather than a
// window.__ global: page globals are not this repo's test surface). tooling/studio-journey.mjs
// injects its source:"agent" ui.move through the bus this returns, which is precisely #209's
// mechanism proven a wave early.
export const getVerbs = () => live;

export function mountCanvasVerbs(canvas, { bus } = {}) {
  const viewport = canvas && canvas.viewport;
  try {
    // Validated at the boundary, throwing a plain Error naming what is missing — the project
    // convention (bus-toggles.mjs:73-76). studio.html's try/catch renders these as "Refused: …".
    if (!canvas || !canvas.stage || !canvas.scroll || typeof canvas.say !== "function") {
      throw new Error("studio-verbs: a mounted canvas handle { stage, scroll, say } is required");
    }
    if (!bus || typeof bus.emit !== "function" || typeof bus.on !== "function") {
      throw new Error("studio-verbs: an action bus { emit, on } is required");
    }

    const { stage, scroll } = canvas;

    // --- reading the arrangement ----------------------------------------------------------------
    // DOM in, plain data out. The pure history stores exactly this shape, and #206 extends its
    // CONTENTS (a board alongside the arrangement) without touching the stack.
    const slots = () => [...stage.querySelectorAll(".stx-slot")];
    const slotOf = (node) => ({
      col: Number(node.getAttribute("data-col")) || 1,
      row: Number(node.getAttribute("data-row")) || 1,
    });
    const idOf = (node) => node.getAttribute("data-stx-id");
    const nameOf = (node) => node.getAttribute("data-stx-name") || "Component";

    const snapshot = () => {
      const out = {};
      for (const node of slots()) {
        const id = idOf(node);
        if (id) out[id] = slotOf(node);
      }
      return out;
    };

    // The ONE place data-col / data-row are written after placement. Attributes only — the grid
    // lines come from rules in system/studio.css, which is what keeps this module's inline-style
    // write count at zero (studio-canvas.mjs's call 3, inherited).
    const applySlot = (node, slot) => {
      node.setAttribute("data-col", String(slot.col));
      node.setAttribute("data-row", String(slot.row));
    };

    // Built at gesture start — peers do not move during a gesture — and EXCLUDING the node being
    // carried, or it could never move off its own cell.
    const occupancyExcept = (node) => {
      const taken = new Set();
      for (const peer of slots()) if (peer !== node) taken.add(occupancyKey(slotOf(peer)));
      return taken;
    };

    // --- the FLIP, used by undo/redo ONLY -------------------------------------------------------
    // element.animate() never touches .style, so build-checks group 7's STYLE_WRITE regex does not
    // count it AND tooling/studio-journey.mjs's running-page hasAttribute("style") assertion stays
    // literally true. Both halves matter: the first alone would read as a regex dodge; the second is
    // what makes zero-inline-styles a real property of the shipped page rather than of its source.
    //
    // THE SCALE DIVIDE IS LOAD-BEARING. getBoundingClientRect deltas are POST-transform, and a
    // translate() on the child applies in the child's UNSCALED local space — so without the divide
    // the travel is wrong at every level ≠ 1, and looks perfect at 100%, which is where it gets
    // tested first. studio-canvas.mjs:166-168 documents the identical trap for fit().
    const animateTo = (node, before) => {
      if (reduceMotion()) return;
      const after = node.getBoundingClientRect();
      const s = ZOOM_LEVELS[canvas.level] || 1;
      const dx = (before.left - after.left) / s;
      const dy = (before.top - after.top) / s;
      if (!dx && !dy) return;
      node.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: 160, easing: "ease-out" },
      );
    };

    // Restore a whole snapshot: measure EVERY rect first, then apply EVERY slot, then animate.
    // Per-node measure-apply-animate is wrong the moment more than one node moves — applying the
    // first re-lays out the grid, so the second's "before" is already stale. At #205 one entry moves
    // and either shape looks right; #217's multi-move inherits this one.
    const restore = (snap) => {
      const moving = [];
      for (const node of slots()) {
        const want = snap[idOf(node)];
        if (!want) continue;
        const now = slotOf(node);
        if (now.col === want.col && now.row === want.row) continue;
        moving.push({ node, want, before: node.getBoundingClientRect() });
      }
      for (const m of moving) applySlot(m.node, m.want);
      for (const m of moving) animateTo(m.node, m.before);
      return moving;
    };

    // --- the verb controls ----------------------------------------------------------------------
    const undoBtn = el("button", { type: "button", class: "btn btn-secondary stx-verb-btn", text: "Undo" });
    const redoBtn = el("button", { type: "button", class: "btn btn-secondary stx-verb-btn", text: "Redo" });
    // One static instructions element, referenced by every handle's aria-describedby, so the
    // affordance is discoverable ON FOCUS — before pick-up — rather than only after the reader has
    // guessed that Enter does something.
    const help = el("p", {
      class: "stx-verb-help",
      id: "stx-move-help",
      text: "Enter to pick up, arrow keys to move, Enter to drop, Escape to cancel.",
    });
    const verbRow = el("div", { class: "stx-verbs" }, undoBtn, redoBtn, help);
    viewport.insertBefore(verbRow, scroll);

    const history = createHistory(snapshot());
    const syncControls = () => {
      undoBtn.disabled = !history.canUndo();
      redoBtn.disabled = !history.canRedo();
    };

    // --- THE ONE CONSUMER -----------------------------------------------------------------------
    // The only place a slot is committed. A synthetic ui.move emitted straight onto the bus moves the
    // node identically, which is what makes the three sources genuinely interchangeable — and is the
    // assertion tooling/studio-journey.mjs makes on a FRESH page with no gesture performed first.
    //
    // REFUSALS GO TO THE LIVE REGION, NEVER A THROW. action-bus.mjs:70-77 wraps every handler in
    // try/catch → console.error, so a thrown refusal would become a console line the reader never
    // sees AND would trip studio-journey's no-console-errors contract.
    const offMove = bus.on("ui.move", (action) => {
      const id = String(action?.target?.id ?? "");
      const node = slots().find((n) => idOf(n) === id);
      if (!node) {
        canvas.say(`Refused: no component ${JSON.stringify(id)} on this canvas.`);
        return; // DOM untouched
      }
      const slot = clampSlot(action?.params); // hostile input never reaches an attribute
      // NO TRAVEL ANIMATION HERE, and that is the decision rather than an omission: a move the
      // reader's own hand or keypress tracked does not need to be shown to them again. animateTo()
      // is undo/redo's alone — the one movement nothing tracked.
      //
      // The consumer does NOT consult occupancy. The gesture enforced it during preview, and adding
      // a refusal here would make an injected source:"agent" move behave differently from a pointer
      // one, which is precisely the parity AC #1 is about. The consequence, stated rather than
      // discovered: an injected move CAN stack two components on one cell. That is the caller's
      // business, and #209's replay only ever plays back slots a real gesture produced.
      applySlot(node, slot);
      history.push(snapshot());
      canvas.say(`${nameOf(node)} moved to column ${slot.col}, row ${slot.row}.`);
      syncControls();
    });

    // Bounded at three named components, because a live region is spoken end to end: a restore that
    // moved twenty of them would otherwise be one sentence a screen-reader user has to sit through
    // before they can do anything else. Past the bound it says how many, which is the useful part.
    const SPOKEN_MAX = 3;
    const restoreVerb = (snap, word) => {
      const moved = restore(snap);
      syncControls();
      if (!moved.length) { canvas.say(`Nothing to ${word.toLowerCase()}.`); return; }
      const named = moved.slice(0, SPOKEN_MAX)
        .map((m) => `${nameOf(m.node)} in column ${m.want.col}, row ${m.want.row}`)
        .join("; ");
      const rest = moved.length - SPOKEN_MAX;
      canvas.say(rest > 0 ? `${word}: ${named}, and ${rest} more.` : `${word}: ${named}.`);
    };

    const offUndo = bus.on("ui.undo", () => {
      if (!history.canUndo()) { canvas.say("Nothing to undo."); return; }
      restoreVerb(history.undo(), "Undone");
    });
    const offRedo = bus.on("ui.redo", () => {
      if (!history.canRedo()) { canvas.say("Nothing to redo."); return; }
      restoreVerb(history.redo(), "Redone");
    });

    // --- the gesture ----------------------------------------------------------------------------
    // null, or { id, node, origin, current, occupied, source, pointerId?, geom?, raf?, pending? }.
    // Written as a single object with a `node` field rather than a list, but shaped so #217's
    // multi-move is a plausible future: a gesture holding a LIST of nodes changes this object and
    // nothing about the consumer, the history or the announcement vocabulary.
    let gesture = null;

    const emitMove = (source) => {
      bus.emit({
        type: "ui.move",
        source,
        target: { component: nameOf(gesture.node), id: gesture.id },
        params: { col: gesture.current.col, row: gesture.current.row },
      });
    };

    const pickUp = (node, source) => {
      const origin = slotOf(node);
      gesture = {
        id: idOf(node),
        node,
        origin,
        current: origin,
        occupied: occupancyExcept(node),
        source,
        sticky: false,
      };
      node.classList.add("is-picked");
      // ANNOUNCED ONLY WHEN THE PICK-UP IS ITSELF A VERB. Pressing the button down to start a DRAG
      // is not one — the reader is about to watch their own hand carry the thing, exactly the
      // argument that keeps slot crossings silent, and announcing it would make one pointer gesture
      // two announcements. The keyboard pick-up IS a verb (nothing else tells the reader they are
      // now carrying something), and so is the click-to-pick-up of the single-pointer path, which
      // announces from its own branch in the pointerup handler.
      if (source === "keyboard") {
        canvas.say(`${nameOf(node)} picked up, column ${origin.col}, row ${origin.row}. Arrow keys to move, Enter to drop, Escape to cancel.`);
      }
      return gesture;
    };

    const clearGesture = () => {
      if (!gesture) return null;
      const g = gesture;
      gesture = null;
      if (g.raf) cancelAnimationFrame(g.raf);
      g.node.classList.remove("is-picked");
      if (g.pointerId != null) {
        try { g.node.releasePointerCapture(g.pointerId); } catch { /* already released */ }
      }
      return g;
    };

    // Apply a preview frame that is still queued. The move handler is rAF-throttled, so the LAST
    // pointermove of a gesture is often still pending when the button comes up — and dropping then
    // would commit the slot from the frame before it. That is a real bug, not a test artifact: a
    // quick drag and release lands the component one cell short of where the reader let go. It
    // surfaced on webkit, whose rAF is the slowest to flush, and would have been an intermittent
    // wrong answer on every engine.
    //
    // CALLED FROM TWO PLACES, and they cover each other rather than each having its own detector:
    // removing BOTH turns studio-journey's whole pointer section red on webkit, removing EITHER
    // alone leaves it green because the other still flushes. Stated rather than left implied — the
    // honest reading is that the pair is proven and neither half is individually.
    const flushPreview = () => {
      if (!gesture || !gesture.raf) return;
      cancelAnimationFrame(gesture.raf);
      gesture.raf = 0;
      if (gesture.pending) preview(pointToSlot(gesture.pending, gesture.geom));
    };

    // The drop: exactly ONE ui.move, unless the gesture ended where it began — a click that moved
    // nothing is not a move, so it emits nothing and writes no history entry.
    const drop = (source) => {
      if (!gesture) return;
      flushPreview();
      const moved = gesture.current.col !== gesture.origin.col || gesture.current.row !== gesture.origin.row;
      if (moved) emitMove(source);
      const g = clearGesture();
      if (!moved) canvas.say(`${nameOf(g.node)} put down in column ${g.origin.col}, row ${g.origin.row}.`);
    };

    const cancel = () => {
      if (!gesture) return;
      const g = gesture;
      applySlot(g.node, g.origin);
      clearGesture();
      canvas.say(`Cancelled, ${nameOf(g.node)} back in column ${g.origin.col}, row ${g.origin.row}.`);
    };

    // --- geometry -------------------------------------------------------------------------------
    // Read ONCE per gesture, at gesture start: a getComputedStyle in the move handler is the
    // synchronous layout read spike 2 deliberately measured as its pessimistic case. The scroller's
    // rect and scrollLeft/scrollTop are read LIVE in the move handler instead — they are cheap, and
    // a momentum or keyboard scroll can move them mid-gesture.
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

    // THE COORDINATE CHAIN, and the part most likely to be silently wrong. hitSlot takes a point in
    // the stage's UNSCALED local space; getting there from a pointer event is four steps in this
    // order. Miss the scroll offset and the hit-test is wrong the moment the reader has panned; miss
    // the divide and it is wrong at every level ≠ 1 — and BOTH look fine at 100% scrolled to 0,0,
    // which is where it will be tested first. studio-journey runs the hit-test in three separate
    // conditions for exactly that reason.
    const pointToSlot = (e, geom) => {
      const r = scroll.getBoundingClientRect(); // live: a scroll can move mid-gesture
      const s = ZOOM_LEVELS[canvas.level] || 1;
      const x = (e.clientX - r.left + scroll.scrollLeft) / s;
      const y = (e.clientY - r.top + scroll.scrollTop) / s;
      return hitSlot(x, y, geom);
    };

    // A preview is instant and silent on the pointer path — the reader is watching their own hand
    // move the thing. It writes attributes and nothing else.
    const preview = (slot) => {
      if (slot.col === gesture.current.col && slot.row === gesture.current.row) return false;
      if (gesture.occupied.has(occupancyKey(slot))) return false; // keep the last valid slot
      gesture.current = slot;
      applySlot(gesture.node, slot);
      return true;
    };

    const ac = new AbortController();
    const { signal } = ac;

    // --- pointer --------------------------------------------------------------------------------
    // DELEGATED ON THE STAGE, not attached per wrapper. place() is called AFTER mount by the harness,
    // by studio-journey's seam, by vt-verify's probe and by everything #206 does, so per-wrapper
    // listeners would only ever exist for the wrappers that happened to be there at mount time.
    stage.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.pointerType === "touch") return; // see the header's touch non-goal
      const node = e.target.closest?.(".stx-slot");
      if (!node || !stage.contains(node)) return;

      // A live STICKY gesture: this press IS the drop, wherever the pointer is. That is the second
      // half of SC 2.5.7's single-pointer path — click to pick up, move, click to drop, and no
      // dragging movement anywhere in it.
      if (gesture) {
        if (!gesture.sticky) return; // a second pointer during a drag is not a second gesture
        e.stopPropagation();
        e.preventDefault();
        preview(pointToSlot(e, gesture.geom));
        drop("pointer");
        return;
      }

      // Body-drag must not fight a real control: a click on the primary-button ON THE STAGE
      // activates it, and only the handle always drags.
      //
      // SCOPED INSIDE THE WRAPPER, and that half is load-bearing rather than defensive. closest()
      // walks ANCESTORS too, and studio-canvas.mjs:116 gives .stx-scroll a tabindex — so an
      // unscoped test matches the scroller for every component on the stage and body-drag never
      // starts anywhere. It presents as "drag does nothing", with the handle still working.
      const handle = e.target.closest?.(".stx-grab");
      const interactive = e.target.closest?.("button, a, input, select, textarea, [tabindex]");
      if (interactive && node.contains(interactive) && !handle) return;

      e.stopPropagation(); // or studio-canvas.mjs:225's ancestor pan handler also starts panning
      e.preventDefault(); // no text selection under the drag
      const g = pickUp(node, "pointer");
      g.pointerId = e.pointerId;
      g.fromHandle = Boolean(handle);
      g.geom = readGeom();
      // preventDefault() above suppresses the press's own focus, so the handle is focused
      // explicitly: a reader who picked up with the mouse can then finish with the arrow keys.
      if (handle) handle.focus?.({ preventScroll: true });
      // Capture is NOT optional: live re-slotting moves the node out from under the cursor, so
      // without it the gesture dies on the first crossing.
      try { node.setPointerCapture(e.pointerId); } catch { /* capture unavailable — the move listener still tracks */ }
    }, { signal });

    // A press anywhere else in the scroller also drops a sticky gesture, so a reader can never be
    // left carrying something with no obvious way to put it down.
    scroll.addEventListener("pointerdown", (e) => {
      if (!gesture || !gesture.sticky || e.target.closest?.(".stx-slot")) return;
      drop("pointer");
    }, { signal });

    stage.addEventListener("pointermove", (e) => {
      if (!gesture) return;
      if (!gesture.sticky && gesture.pointerId !== e.pointerId) return;
      // Bail BEFORE applying anything. Firefox, once a captured pointer leaves the window, keeps
      // delivering pointermove with clientX 0 and buttons 0 — read literally that is a jump to the
      // origin slot. studio-canvas.mjs:232-242 carries this guard for the pan; proto-journey caught
      // the same bug in device-frame.mjs:137-152. A STICKY gesture is exempt by construction: it
      // holds no button and no capture, so buttons 0 is its normal state rather than a lost pointer.
      if (!gesture.sticky && (e.buttons & 1) === 0) { cancel(); return; }
      gesture.pending = e;
      if (gesture.raf) return; // rAF-throttled (scrub.mjs:65)
      gesture.raf = requestAnimationFrame(() => {
        if (!gesture) return;
        gesture.raf = 0;
        preview(pointToSlot(gesture.pending, gesture.geom));
      });
    }, { signal });

    // pointerup runs FIRST and clears the gesture, so the cancel path below finds nothing to cancel.
    // lostpointercapture also fires on a normal release on some engines, and an unguarded cancel
    // handler therefore runs after EVERY clean drop and undoes it — a bug whose whole symptom is
    // "drag does nothing", which nothing else distinguishes from a drag that never started.
    stage.addEventListener("pointerup", (e) => {
      if (!gesture || gesture.sticky || gesture.pointerId !== e.pointerId) return;
      // Flushed BEFORE the still-there test, not just inside drop(): a quick drag whose last frame
      // is still queued would otherwise read as a click and become a sticky pick-up instead of a
      // drop — the same stale-frame bug wearing the other hat.
      flushPreview();
      const still = gesture.current.col === gesture.origin.col && gesture.current.row === gesture.origin.row;
      if (still && gesture.fromHandle) {
        // A CLICK on the handle, not a drag: stay picked up. This is SC 2.5.7's single-pointer
        // alternative — the reader moves the pointer with no button held and presses again to drop.
        // pointerId is cleared here so the implicit capture release below finds nothing of ours to
        // cancel; the move handler switches to the sticky branch for the same reason.
        gesture.sticky = true;
        gesture.pointerId = null;
        try { gesture.node.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        canvas.say(`${nameOf(gesture.node)} picked up, column ${gesture.origin.col}, row ${gesture.origin.row}. Move the pointer and click to drop, or use the arrow keys; Escape cancels.`);
        return;
      }
      drop("pointer");
    }, { signal });
    stage.addEventListener("pointercancel", (e) => {
      if (!gesture || gesture.sticky || gesture.pointerId !== e.pointerId) return;
      cancel();
    }, { signal });
    stage.addEventListener("lostpointercapture", (e) => {
      if (!gesture || gesture.sticky || gesture.pointerId !== e.pointerId) return;
      cancel();
    }, { signal });

    // --- keyboard -------------------------------------------------------------------------------
    // Delegated for the same reason as the pointer path. Handled on keydown throughout: Space on a
    // <button> fires click on KEYUP, so keydown + preventDefault is what stops the page scrolling
    // and stops the verb double-firing through the click.
    stage.addEventListener("keydown", (e) => {
      const handle = e.target.closest?.(".stx-grab");
      // A STICKY pointer pick-up is keyboard-operable too — the handle holds focus, so a reader who
      // started with the mouse can finish with the arrows. A gesture mid-DRAG is not: the button is
      // still down and the pointer is the thing steering.
      const carried = gesture && (gesture.source === "keyboard" || gesture.sticky);

      if (!carried) {
        if (!handle) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        if (gesture) return; // a pointer gesture is live — not this path's business
        e.preventDefault();
        const node = handle.closest(".stx-slot");
        if (!node) return;
        const g = pickUp(node, "keyboard");
        g.geom = readGeom();
        return;
      }

      if (e.key === "Escape") { e.preventDefault(); cancel(); return; }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drop("keyboard"); return; }

      const dir = DIRS[e.key];
      if (!dir) return; // not ours — let the page have the key
      e.preventDefault(); // or the scroller also scrolls

      const next = stepSlot(gesture.current, dir, gesture.occupied);
      const moved = preview(next);
      // ANNOUNCED ON EVERY PRESS, INCLUDING A BLOCKED ONE. A keyboard user with no per-step feedback
      // is flying blind for the whole gesture, unable to tell a step blocked by a peer from one
      // blocked by the grid edge. Announcing unconditionally is also what makes the driver's exact
      // N + 2 count independent of which N it chose.
      canvas.say(moved
        ? `Column ${gesture.current.col}, row ${gesture.current.row}.`
        : `Blocked, still in column ${gesture.current.col}, row ${gesture.current.row}.`);
    }, { signal });

    // ESCAPE REACHES A POINTER DRAG, and that needs a document listener rather than a stage one. A
    // body-drag focuses nothing — only the handle path calls focus() — so the keydown lands on
    // <body> and never bubbles through the stage. A drag is a modal state and Escape is the way out
    // of it, so this is scoped to exactly that: it fires only while a gesture is live, and the stage
    // handler above runs FIRST on the keyboard path and clears the gesture, so this one finds
    // nothing left to cancel and never double-fires.
    document.addEventListener("keydown", (e) => {
      if (!gesture || e.key !== "Escape") return;
      cancel();
    }, { signal });

    // --- the verb controls' inputs --------------------------------------------------------------
    // Both paths EMIT and do nothing else — the same discipline as the move verbs, so #209's replay
    // can undo through the identical contract.
    const emitVerb = (type, e) => bus.emit({
      type,
      // agentic-renderer.mjs:208's idiom, verbatim: a keyboard-activated click reports detail 0.
      source: e && e.detail === 0 ? "keyboard" : "pointer",
    });
    undoBtn.addEventListener("click", (e) => emitVerb("ui.undo", e), { signal });
    redoBtn.addEventListener("click", (e) => emitVerb("ui.redo", e), { signal });

    scroll.addEventListener("keydown", (e) => {
      if (!(e.metaKey || e.ctrlKey) || gesture) return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        emitVerb(e.shiftKey ? "ui.redo" : "ui.undo", e);
      } else if (k === "y") {
        e.preventDefault();
        emitVerb("ui.redo", e);
      }
    }, { signal });

    syncControls();

    const handleObj = {
      bus,
      history,
      snapshot,
      get gesture() { return gesture; },
      destroy() {
        ac.abort();
        clearGesture();
        offMove();
        offUndo();
        offRedo();
        verbRow.remove();
        if (live === handleObj) live = null;
      },
    };
    live = handleObj;
    return handleObj;
  } finally {
    // Every path, including the boundary throws above, so a gate fails on the missing thing instead
    // of deadlocking to timeout (studio-canvas.mjs:285-288 / device-frame.mjs:195-199).
    viewport?.setAttribute("data-canvas-verbs", "ready");
  }
}
