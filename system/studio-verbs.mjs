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
// #219 ADDED A SECOND VERB, ui.resize, AND IT HAD TO EARN ITSELF. Two later tickets recorded "NO BUS
// VERB, deliberately" (studio-flow.mjs, studio-docs.mjs), so a third verb is a claim against them
// rather than an analogy with ui.move — the argument is at the consumer. What it operates on is
// system/studio-frames.mjs's device frames, the FOURTH grid family: `slots()` therefore reads
// studio-canvas.mjs's exported MOVABLE selector rather than ".stx-slot", and everything downstream
// gained span-awareness with a 1×1 DEFAULT, so every answer for a board wrapper is byte-identical.
// A resize shares the ONE gesture object, distinguished by `kind` (pickUp says why).
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

import { FRAME_CLASS, MAX_COLS, MAX_ROWS, MIN_SPAN, MOVABLE, ZOOM_LEVELS, clampSlot, clampSpan, fits, footprint } from "./studio-canvas.mjs";

// A slot that carries no span reads as a 1×1 RECTANGLE, and that default is the whole reason #219's
// widening is safe: every function below answers byte-identically for a .stx-slot, which is what lets
// build-checks group 13's existing cases run unedited as the proof the widening preserved behaviour.
const UNIT_SPAN = Object.freeze({ cols: MIN_SPAN, rows: MIN_SPAN });
const spanFrom = (m) => (m && (m.cols != null || m.rows != null)
  ? { cols: Number(m.cols) || MIN_SPAN, rows: Number(m.rows) || MIN_SPAN }
  : UNIT_SPAN);

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

// How many components a live-region sentence NAMES before it switches to counting. A live region is
// spoken end to end, so a verb that moved twenty of them would otherwise be one sentence a screen
// reader user has to sit through before they can do anything else; past the bound the count is the
// useful part. Hoisted to module scope and exported at #217 (it lived inside mountCanvasVerbs) for
// the MAX_COLS / LABEL_MAX / SLOT_MAX reason: system/studio-select.mjs writes the same shape of
// sentence for the selection, and a cap re-typed there is a second copy that drifts. Nothing about
// its value or its use changed in the move; build-checks group 13 pins it.
export const SPOKEN_MAX = 3;

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
//
// `span` IS A 1×1 RECTANGLE BY DEFAULT (#219), so a .stx-slot's answers are byte-identical: the
// candidate test below becomes fits({col,row}, 1×1, taken), which on an on-grid cell is exactly
// `!taken.has(key)`. A frame is tested by its WHOLE footprint, which is the difference that matters —
// a 2×3 blocked by ONE of its six cells is a real refusal that a top-left-only test would let
// through, and would land the frame overlapping a peer.
export function stepSlot(from, dir, occupied, span) {
  const start = clampSlot(from);
  if (!Array.isArray(dir) || dir.length !== 2) return start;
  const [dc, dr] = dir;
  const taken = occupied instanceof Set ? occupied : new Set(occupied || []);
  const limit = dc ? MAX_COLS : MAX_ROWS;
  const size = spanFrom(span);

  let { col, row } = start;
  for (let i = 0; i < limit; i += 1) {
    col += dc;
    row += dr;
    if (col < 1 || col > MAX_COLS || row < 1 || row > MAX_ROWS) return start; // walked off the grid
    if (fits({ col, row }, size, taken)) return { col, row };
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

// ---- the GROUP layer (#217) ---------------------------------------------------------------------
// One selection moves as one thing. Everything below is the multi-node twin of stepSlot's answers,
// and the reason it is a separate set of functions rather than a loop over stepSlot is stated at
// groupDelta: a group step is ALL-OR-NOTHING, and stepSlot is deliberately not.

// The occupancy set for a GROUP: every slot in `all` whose id is NOT a member. Excluding EVERY
// member is the whole point — exclude only an anchor and each member blocks its neighbour's
// destination, so a group of two adjacent blocks can never move at all in the direction they are
// adjacent along. occupancyExcept() in the mount is the single-node shape this generalises.
//
// NOT WIDENED TO FOOTPRINTS AT #219, and that is a stated boundary rather than an oversight. Nothing
// calls it with a spanning member while device frames stay outside #217's selection layer
// (system/studio-frames.mjs's header records why they do), and widening a function no caller
// exercises would be a rule with no gate behind it. THE DAY A LATER TICKET PUTS FRAMES IN THE
// SELECTION, THIS IS THE FUNCTION TO WIDEN: the failure mode of forgetting it is a group move that
// lets a frame overlap a peer — silent, and with nothing watching.
export function groupOccupancy(all, members) {
  const held = new Set(Array.isArray(members) ? members : []);
  const taken = new Set();
  for (const slot of Array.isArray(all) ? all : []) {
    if (!slot || held.has(slot.id)) continue;
    taken.add(occupancyKey(slot));
  }
  return taken;
}

// Translate EVERY member by [dcol, drow], or return `members` UNCHANGED. There is no partial answer:
// if any destination leaves the grid or lands on a non-member peer, the whole set stays put, and the
// keyboard path announces that as a blocked step exactly as it does for one node.
//
// WHY NOT stepSlot PER MEMBER, since that is the shape a reader reaches for first: stepSlot KEEPS
// WALKING past occupied cells (see its comment), which for N nodes lands members at DIFFERENT
// offsets and deforms the selection — two blocks a column apart come back adjacent. Skipping is the
// right answer for one node (a peer in the way is a thing to step over) and the wrong one for a
// group (the group's shape is the thing being moved). Detected by deep-equality on the blocked case
// in build-checks group 13, never by "did anything move?", which a partial move passes.
//
// The grid test is clampSlot's, so "on the grid" keeps its one definition (studio-canvas.mjs:50):
// a destination the clamp would CHANGE is a destination off the grid.
export function groupDelta(members, dcol, drow, occupied) {
  const list = Array.isArray(members) ? members.filter((m) => m && Number.isFinite(Number(m.col)) && Number.isFinite(Number(m.row))) : [];
  if (!list.length) return Array.isArray(members) ? members : [];
  // ALL-OR-NOTHING COVERS VALIDITY TOO, not just the grid edge and the occupied peer. A MIXED array
  // — some entries readable, some not — otherwise came back SHORTER than it went in, which is a
  // partial move wearing the shape of a successful one: the caller gets a list it can apply and the
  // unreadable members simply vanish from the selection, silently. Unreachable from either live call
  // site (both build their entries from the live DOM), but the identity return is the contract this
  // function states, and group 13's totality sweep only ever fed it WHOLESALE-invalid arrays, so the
  // gap sat behind a green gate (PR #263 review, finding 3). Placed AFTER the empty-list return, not
  // before: past that line `members` is provably a non-empty array, so reading .length is safe.
  if (list.length !== members.length) return members;
  const dc = Number(dcol);
  const dr = Number(drow);
  if (!Number.isFinite(dc) || !Number.isFinite(dr)) return members;
  const taken = occupied instanceof Set ? occupied : new Set(occupied || []);

  const moved = [];
  for (const m of list) {
    const want = { col: Number(m.col) + dc, row: Number(m.row) + dr };
    const clamped = clampSlot(want);
    if (clamped.col !== want.col || clamped.row !== want.row) return members; // off the grid
    // A MEMBER MAY BE A RECTANGLE (#219). The clampSlot test above still owns "is the ORIGIN on the
    // grid" — kept rather than folded into fits(), because it rejects a fractional destination that
    // fits()'s rounding would accept, and that is an existing answer. fits() then adds the two
    // questions a spanning member brings: does the whole FOOTPRINT stay on the grid, and is every
    // covered cell free. For a 1×1 member it is exactly the taken.has() line it replaces.
    //
    // NOT OPTIONAL, and easy to miss: preview() routes EVERY gesture through groupDelta, single-node
    // ones included — so a frame dragged on its own would otherwise be collision-tested by its
    // top-left cell alone and would happily overlap a peer with the rest of its footprint.
    if (!fits(clamped, spanFrom(m), taken)) return members; // a non-member peer holds a covered cell
    moved.push({ ...m, col: clamped.col, row: clamped.row });
  }
  return moved;
}

// ONE arrow step for a group, in DIRS' vocabulary. Written over groupDelta rather than beside it so
// there is one all-or-nothing rule, not two that agree today.
export function groupStep(members, dir, occupied) {
  if (!Array.isArray(dir) || dir.length !== 2) return Array.isArray(members) ? members : [];
  return groupDelta(members, dir[0], dir[1], occupied);
}

// The alignment guides for a carry: the columns and rows where a CARRIED member and a non-carried
// PEER line up. Deduplicated, sorted ascending, empty when nothing aligns.
//
// BOTH HALVES ARE REQUIRED, and that is AC #3's whole sentence rather than a refinement. A guide
// over a column holding only carried members says nothing the reader cannot already see; a guide
// over a column holding neither is a claim about an alignment that does not exist — the lie the AC
// forbids. So the gate does not count guides: it forces one onto an empty column and watches red.
export function guidesFor(carried, peers) {
  const axis = (key) => {
    const mine = new Set();
    for (const s of Array.isArray(carried) ? carried : []) {
      const n = Number(s && s[key]);
      if (Number.isFinite(n)) mine.add(n);
    }
    const out = new Set();
    for (const p of Array.isArray(peers) ? peers : []) {
      const n = Number(p && p[key]);
      if (Number.isFinite(n) && mine.has(n)) out.add(n);
    }
    return [...out].sort((a, b) => a - b);
  };
  return { cols: axis("col"), rows: axis("row") };
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
    // Teach EVERY entry about ids it has never seen, at the position given — and never touch an id
    // it already knows (#230).
    //
    // The stack is seeded once, at mount, but studio-canvas.mjs's place() is a NORMAL post-mount
    // call — it is the whole reason the verbs delegate their listeners on `stage`. A component
    // placed afterwards is in no earlier entry, so restore() skipped it: the undo consumed an entry,
    // the node did not move, and the reader was left with a greyed-out Undo and a phantom step.
    //
    // FILLING EVERY ENTRY IS THE TRUTHFUL ANSWER, not just the one at the cursor. For an arrangement
    // that predates the node, "where was it then" has exactly one honest value — where it first
    // appeared — so undoing twice leaves it there rather than somewhere invented. And it is why the
    // fill is MISSING-IDS-ONLY: overwriting a known id would rewrite the past the reader is
    // navigating, and it would break the two call sites composing (see the mount).
    adopt(partial) {
      const add = structuredClone(partial ?? {});
      for (const entry of stack) {
        for (const [id, slot] of Object.entries(add)) {
          if (!(id in entry)) entry[id] = structuredClone(slot);
        }
      }
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
    if (!canvas || !canvas.stage || !canvas.scroll || typeof canvas.say !== "function"
      || typeof canvas.armMoveHandles !== "function") {
      throw new Error("studio-verbs: a mounted canvas handle { stage, scroll, say, armMoveHandles } is required");
    }
    if (!bus || typeof bus.emit !== "function" || typeof bus.on !== "function") {
      throw new Error("studio-verbs: an action bus { emit, on } is required");
    }

    const { stage, scroll } = canvas;

    // --- reading the arrangement ----------------------------------------------------------------
    // DOM in, plain data out. The pure history stores exactly this shape, and #206 extends its
    // CONTENTS (a board alongside the arrangement) without touching the stack.
    // MOVABLE, not ".stx-slot", since #219 — the ONE selector studio-canvas.mjs exports so the two
    // modules cannot disagree about which families move. It is deliberately NOT what
    // studio-compile.mjs's tripwires, studio.mjs's arrangementNow() or adoptBoard's removal loop
    // query: those three mean BOARD WRAPPER and must keep meaning it.
    const slots = () => [...stage.querySelectorAll(MOVABLE)];
    const slotOf = (node) => ({
      col: Number(node.getAttribute("data-col")) || 1,
      row: Number(node.getAttribute("data-row")) || 1,
    });
    // A node with no span attribute IS 1×1 (#219). Read rather than assumed, so the frame's real
    // rectangle reaches the occupancy set and the gesture's collision test.
    const spanOf = (node) => spanFrom({
      cols: node.getAttribute("data-span-col"),
      rows: node.getAttribute("data-span-row"),
    });
    const isFrame = (node) => node.classList.contains(FRAME_CLASS);
    const idOf = (node) => node.getAttribute("data-stx-id");
    const nameOf = (node) => node.getAttribute("data-stx-name") || "Component";

    // A SNAPSHOT ENTRY SAYS WHAT THE NODE'S GEOMETRY IS, so cols/rows are recorded only for a node
    // that HAS a span — a board wrapper does not, and writing `cols: 1` for it would be claiming a
    // property it has never carried, in a structure two drivers deep-compare. Every existing entry
    // is therefore byte-identical to what #205 recorded.
    const snapshot = () => {
      const out = {};
      for (const node of slots()) {
        const id = idOf(node);
        if (!id) continue;
        out[id] = isFrame(node) ? { ...slotOf(node), ...spanOf(node) } : slotOf(node);
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

    // applySlot's sibling for the rectangle (#219), and the ONE place data-span-* are written after
    // placement. Attributes only, for applySlot's reason — the span tables are rules in
    // system/studio.css, which is what keeps this module's inline-style write count at zero.
    const applySpan = (node, span) => {
      node.setAttribute("data-span-col", String(span.cols));
      node.setAttribute("data-span-row", String(span.rows));
    };

    // Built at gesture start — peers do not move during a gesture — and EXCLUDING every node being
    // carried, or a member could never move off its own cell and a group could never move at all
    // (each member would block its neighbour's destination). One member is the #205 case; the pure
    // groupOccupancy above is the same rule written over plain data so CI can drive it.
    //
    // EVERY CELL OF EVERY PEER since #219, not one key per peer: a device frame occupies a rectangle,
    // and a set built from top-left corners would let a block step into the middle of one. footprint()
    // produces the same string form occupancyKey does — and for a 1×1 peer it produces exactly
    // [occupancyKey(slot)], which is why every existing answer is unchanged.
    const occupancyExcept = (nodes) => {
      const carried = new Set(Array.isArray(nodes) ? nodes : [nodes]);
      const taken = new Set();
      for (const peer of slots()) {
        if (carried.has(peer)) continue;
        for (const cell of footprint(slotOf(peer), spanOf(peer))) taken.add(cell);
      }
      return taken;
    };

    // --- the alignment guides (#217) ------------------------------------------------------------
    // At most two elements — one column, one row — created lazily, placed by data-col / data-row on
    // the SAME grid every slot uses, and removed on drop, cancel and clear. Attributes only, so this
    // ticket's half of the module keeps the zero-inline-style property #204 established.
    //
    // PREPENDED to the stage rather than appended: .stx-slot is position: relative, so it paints
    // above this static grid item whatever the order, and a guide is a ground wash UNDER the
    // components rather than a tint over the alignment it is pointing out (studio.css says the same).
    //
    // A GUIDE IS A CLAIM THAT AN ALIGNMENT EXISTS. guidesFor only reports a line where a CARRIED
    // member and a non-carried PEER share it, and the mount adds nothing to that: the first of each
    // axis is drawn, both arrays being sorted so the choice is deterministic. Showing every aligned
    // column would be honest too, and is not done because three highlighted columns read as noise —
    // but showing one where none aligns is the lie AC #3 forbids, which is why the gate forces a
    // guide onto a provably empty column and watches the check go red rather than counting guides.
    let colGuide = null;
    let rowGuide = null;
    const setGuide = (existing, attr, value) => {
      if (value == null) { existing?.remove(); return null; }
      const node = existing || el("div", { class: "stx-guide", "aria-hidden": "true" });
      node.setAttribute(attr, String(value));
      if (!node.isConnected) stage.insertBefore(node, stage.firstChild);
      return node;
    };
    const clearGuides = () => {
      colGuide = setGuide(colGuide, "data-col", null);
      rowGuide = setGuide(rowGuide, "data-row", null);
    };
    // Rendered for a SINGLE-node carry too, not only for a group: AC #3 does not scope guides to
    // groups, guidesFor handles one member as naturally as N, and a single drag is the commonest
    // gesture on this canvas — scoping them would leave the gate exercising only the rarer path.
    const renderGuides = () => {
      if (!gesture) { clearGuides(); return; }
      const carriedNodes = new Set(gesture.members.map((m) => m.node));
      const peers = slots().filter((n) => !carriedNodes.has(n)).map(slotOf);
      const { cols, rows } = guidesFor(gesture.members.map((m) => m.current), peers);
      colGuide = setGuide(colGuide, "data-col", cols.length ? cols[0] : null);
      rowGuide = setGuide(rowGuide, "data-row", rows.length ? rows[0] : null);
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
        // A node the snapshot does not know is now ONLY a node REMOVED from the stage since — a
        // post-mount PLACEMENT is adopted into every entry the moment it is first moved (#230), so
        // this `continue` is no longer the phantom-undo path it used to be. Do not read it as one.
        if (!want) continue;
        const now = slotOf(node);
        // THE SPAN IS PART OF "DID ANYTHING CHANGE" (#219), and this line is where forgetting that
        // costs the whole feature: a resize leaves col and row untouched, so a slot-only comparison
        // drops every pure resize out of `moving` — Undo then reports "Nothing to undo" while the
        // frame keeps its new size. `want.cols` is absent for a board wrapper, which is the 1×1
        // default arriving as undefined on both sides and comparing equal.
        const wantSpan = want.cols == null ? null : { cols: want.cols, rows: want.rows };
        const nowSpan = wantSpan ? spanOf(node) : null;
        const sameSlot = now.col === want.col && now.row === want.row;
        const sameSpan = !wantSpan || (nowSpan.cols === wantSpan.cols && nowSpan.rows === wantSpan.rows);
        if (sameSlot && sameSpan) continue;
        moving.push({ node, want, wantSpan, spanOnly: sameSlot, before: node.getBoundingClientRect() });
      }
      for (const m of moving) {
        applySlot(m.node, m.want);
        if (m.wantSpan) applySpan(m.node, m.wantSpan);
      }
      for (const m of moving) animateTo(m.node, m.before);
      return moving;
    };

    // --- the verb controls ----------------------------------------------------------------------
    // data-stx-verb is #217's seam and the whole of it: the context menu offers Undo and Redo, and
    // must know whether the history can do them. It reads THESE buttons' `disabled` rather than
    // taking a history handle, for studio.mjs:513-516's recorded reason — the buttons already ARE
    // the live display of canUndo/canRedo (syncControls writes them), and a second source could
    // disagree with the one the reader is looking at. An attribute rather than an index into
    // .stx-verb-btn, because an index is a contract nothing states and everything breaks.
    const undoBtn = el("button", { type: "button", class: "btn btn-secondary stx-verb-btn", "data-stx-verb": "undo", text: "Undo" });
    const redoBtn = el("button", { type: "button", class: "btn btn-secondary stx-verb-btn", "data-stx-verb": "redo", text: "Redo" });
    // One static instructions element, referenced by every handle's aria-describedby, so the
    // affordance is discoverable ON FOCUS — before pick-up — rather than only after the reader has
    // guessed that Enter does something.
    const help = el("p", {
      class: "stx-verb-help",
      id: "stx-move-help",
      text: "Enter to pick up, arrow keys to move, Enter to drop, Escape to cancel.",
    });
    // #217's verbs get their OWN element, and the existing sentence above is byte-identical — every
    // handle's aria-describedby points at `help` by IDREF, and it must keep describing the MOVE
    // affordance only. A reader focused on one component does not want the marquee's grammar read
    // to them; a reader looking at the canvas does, which is what a second visible line is for.
    //
    // This IS the discovery path for the context menu (nothing else advertises Shift+F10), and that
    // is a stated bet rather than an oversight: a per-block "⋯" button would churn every wrapper
    // and add a control per component, which belongs to #221. Flagged for #223's hallway test.
    const selectHelp = el("p", {
      class: "stx-verb-help",
      text: "Shift-drag to select several, Shift-click to add one. With the canvas focused, ⌘/Ctrl+A selects all. Right-click or Shift+F10 on a component opens its menu.",
    });
    // #219's resize gets its OWN element too, on the rule this file already set for #217's: an
    // affordance does not extend someone else's sentence. It is referenced by every .stx-resize's
    // aria-describedby, and its ID is passed to canvas.armMoveHandles below rather than literalled
    // in studio-canvas.mjs — the module that OWNS the element owns the id.
    //
    // "A FRAME MOVES AND RESIZES ON ITS OWN" is in this sentence deliberately: it is where the reader
    // meets #219's stated line that device frames are outside the selection layer.
    const resizeHelp = el("p", {
      class: "stx-verb-help",
      id: "stx-resize-help",
      text: "Enter to start resizing, arrow keys to size it, Enter to finish, Escape to cancel. A frame moves and resizes on its own.",
    });
    const verbRow = el("div", { class: "stx-verbs" }, undoBtn, redoBtn, help, selectHelp, resizeHelp);
    viewport.insertBefore(verbRow, scroll);
    // ARM THE MOVE HANDLES (#231 L2). studio-canvas.mjs draws the .stx-grab button but owns none of
    // its behaviour, so it is born disabled and undescribed; this line is the moment that stops
    // being true, and it passes the id of the element THIS module just created rather than letting
    // the canvas literal it a second time. After it, place() arms new handles at creation.
    canvas.armMoveHandles(help.id, resizeHelp.id);

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
    // REFUSALS GO TO THE LIVE REGION, NEVER A THROW. action-bus.mjs:71-81 wraps every handler in
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
      // The OTHER adopt (#230), for the source with no gesture behind it: an injected agent move
      // previewed nothing, so here — and only here — snapshot() still reports the node's origin.
      // The two call sites compose precisely BECAUSE adopt fills missing ids only: after a pick-up
      // has adopted this node, this call finds it present and leaves the recorded origin alone.
      //
      // The rejected alternative, which the review named: place() calling getVerbs()?.reseed().
      // studio-verbs.mjs imports studio-canvas.mjs, so that edge is a circular import — and it
      // would put the fix in the module that does not own the history.
      history.adopt(snapshot());
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

    // THE THIRD CONSUMER (#219), and the verb it applies had to EARN ITSELF against two recorded
    // refusals. system/studio-flow.mjs and system/studio-docs.mjs both wrote "NO BUS VERB,
    // deliberately", because pointer and keyboard converge natively on `click` and a verb invented
    // for symmetry is one emitter and one consumer nobody needed. Resize is different on both counts:
    //
    //   1. THE PATHS DO NOT CONVERGE. A continuous pointer drag and a stepped keypress are different
    //      gestures producing the same fact, so without ONE commit point they would be two
    //      implementations that happen to agree — exactly the shape call 1 of this header forbids.
    //   2. UNDO NEEDS ONE COMMIT POINT. The AC says a resize is undoable and this canvas has exactly
    //      one history. A resize that wrote attributes directly would leave Undo stepping back over
    //      a MOVE the reader did earlier, which is worse than no undo at all.
    //
    // The bonus is #209's parity for free: an injected source:"agent" ui.resize resizes identically,
    // and studio-journey's framesPass proves it on a fresh page with no gesture first.
    const offResize = bus.on("ui.resize", (action) => {
      const id = String(action?.target?.id ?? "");
      const node = slots().find((n) => idOf(n) === id);
      if (!node) {
        canvas.say(`Refused: no component ${JSON.stringify(id)} on this canvas.`);
        return; // DOM untouched
      }
      // THE ONE REFUSAL THIS CONSUMER OWNS THAT ui.move's does not. Span attributes on a .stx-slot
      // would select nothing (system/studio.css scopes both tables to .stx-frame), so the action
      // would be a silent no-op wearing the shape of a success. Refused as CONTENT, never a throw —
      // action-bus.mjs:71-81 would turn a throw into a console line the reader never sees AND trip
      // studio-journey's no-page-errors contract.
      if (!isFrame(node)) {
        canvas.say(`Refused: ${nameOf(node)} is not resizable.`);
        return; // DOM untouched
      }
      const span = clampSpan(slotOf(node), action?.params); // hostile input never reaches an attribute
      // #230's adopt, for the source with no gesture behind it — the same call ui.move's consumer
      // makes, composing for the same reason: adopt fills MISSING ids only.
      history.adopt(snapshot());
      // IT DOES NOT CONSULT OCCUPANCY, exactly as the two consumers above do not. The gesture
      // enforced it during preview, and a refusal here would make an injected source:"agent" resize
      // behave differently from a pointer one — precisely the parity AC #3 turns on. The consequence,
      // stated rather than discovered: an injected resize CAN grow a frame over a peer's cells. That
      // is the caller's business, and no gesture and no replay can produce it.
      applySpan(node, span);
      history.push(snapshot());
      canvas.say(`${nameOf(node)} resized to ${span.cols} columns by ${span.rows} rows.`);
      syncControls();
    });

    // THE SECOND CONSUMER, IN THE SAME BLOCK (#217). One selection moves as one thing: one
    // history.push, one canvas.say, one undo. It joins here rather than in studio-select.mjs so the
    // mover stays ONE module and applySlot stays the one place a slot is written — a second module
    // applying slots is precisely the shape call 1 of this header refuses.
    //
    // NO `target`, and that is the honest envelope rather than a saving: a group move has no single
    // subject, so naming one (the anchor) would let a consumer that read it move the wrong thing.
    //
    // IT DOES NOT CONSULT OCCUPANCY, exactly as ui.move's does not (:386-391): the gesture enforced
    // it during preview, and a refusal here would make an injected source:"agent" group move behave
    // differently from a pointer one — precisely the parity AC #1 turns on. The consequence, stated
    // rather than discovered: an injected group move CAN stack components on one cell. That is the
    // caller's business.
    //
    // EVERY ID IS RESOLVED BEFORE ANY SLOT IS WRITTEN, so a payload naming one missing component
    // leaves the DOM UNTOUCHED instead of half-applied. The refusal is the live region's, never a
    // throw — action-bus.mjs:71-81 would turn a throw into a console line the reader never sees AND
    // trip studio-journey's no-page-errors contract.
    const offMoveGroup = bus.on("ui.move-group", (action) => {
      const moves = Array.isArray(action?.params?.moves) ? action.params.moves : [];
      if (!moves.length) {
        canvas.say("Refused: that group move named no components.");
        return; // DOM untouched
      }
      const known = slots();
      const resolved = [];
      for (const move of moves) {
        const id = String(move?.id ?? "");
        const node = known.find((n) => idOf(n) === id);
        if (!node) {
          canvas.say(`Refused: no component ${JSON.stringify(id)} on this canvas.`);
          return; // DOM untouched — nothing has been applied yet
        }
        resolved.push({ node, slot: clampSlot(move) }); // hostile input never reaches an attribute
      }
      // #230's adopt, for the source with no gesture behind it — the same call ui.move's consumer
      // makes, and it composes for the same reason: adopt fills MISSING ids only.
      history.adopt(snapshot());
      for (const r of resolved) applySlot(r.node, r.slot);
      history.push(snapshot()); // ONE entry, so ONE undo puts every member back
      const named = resolved.slice(0, SPOKEN_MAX)
        .map((r) => `${nameOf(r.node)} in column ${r.slot.col}, row ${r.slot.row}`)
        .join("; ");
      const rest = resolved.length - SPOKEN_MAX;
      canvas.say(rest > 0 ? `Moved: ${named}, and ${rest} more.` : `Moved: ${named}.`);
      syncControls();
    });

    // SPOKEN_MAX is module scope since #217 — see its declaration for why it moved. The vocabulary
    // below is unchanged; studio-select.mjs writes the selection's count sentence to the same bound.
    //
    // TWO words, not one derived from the other: the success sentence leads with the past participle
    // ("Undone: …") and the nothing-moved sentence names the verb ("Nothing to undo."). Deriving
    // either from the other gave "Nothing to undone."
    //
    // The nothing-moved branch is still REACHABLE after #230 closed the phantom undo, so it is not
    // dead code to delete: a gesture cannot commit a zero-length move (a press that moved nothing
    // emits no ui.move at all), but an INJECTED agent move to the slot a node already occupies
    // pushes an entry identical to its predecessor, and undoing across it moves nothing.
    const restoreVerb = (snap, word, verb) => {
      const moved = restore(snap);
      syncControls();
      if (!moved.length) { canvas.say(`Nothing to ${verb}.`); return; }
      // A RESTORED RESIZE IS NAMED AS A SIZE (#219). The node did not move, so "in column 3, row 2"
      // would be a true sentence about the wrong fact — the reader pressed Undo to get the size back
      // and needs to hear that it came back.
      const named = moved.slice(0, SPOKEN_MAX)
        .map((m) => (m.spanOnly
          ? `${nameOf(m.node)} at ${m.wantSpan.cols} columns by ${m.wantSpan.rows} rows`
          : `${nameOf(m.node)} in column ${m.want.col}, row ${m.want.row}`))
        .join("; ");
      const rest = moved.length - SPOKEN_MAX;
      canvas.say(rest > 0 ? `${word}: ${named}, and ${rest} more.` : `${word}: ${named}.`);
    };

    const offUndo = bus.on("ui.undo", () => {
      if (!history.canUndo()) { canvas.say("Nothing to undo."); return; }
      restoreVerb(history.undo(), "Undone", "undo");
    });
    const offRedo = bus.on("ui.redo", () => {
      if (!history.canRedo()) { canvas.say("Nothing to redo."); return; }
      restoreVerb(history.redo(), "Redone", "redo");
    });

    // --- the gesture ----------------------------------------------------------------------------
    // null, or { id, node, origin, current, members, occupied, source, pointerId?, geom?, raf?,
    // pending? }.
    //
    // #217 MADE THE FORECAST TRUE, and it cost exactly what :430-434 said it would: `members` is the
    // list — [{ node, id, origin, current }], the ANCHOR included and length 1 for an ordinary carry
    // — and `node` / `id` / `origin` / `current` stay the ANCHOR's, so every existing pointer and
    // keyboard branch reads the same fields it always did and a single-node gesture behaves
    // byte-identically. The consumer, the history and the announcement vocabulary were untouched by
    // the shape change; what #217 added beside them is one more bus verb, not a second mover.
    //
    // Members are in DOM ORDER (querySelectorAll's), which is the studio's standing correspondence
    // with board order (studio.mjs:510-516) — so the group sentence names components in the order
    // the reader sees them rather than in the order they happened to be clicked.
    let gesture = null;

    // `component` IS THE VOCABULARY SHAPE, `label` IS THE DISPLAY NAME (#232). This used to emit
    // the label under `component` — "Metric 1" where agentic-renderer.mjs:209 and
    // bus-toggles.mjs both put the shape — which is a field whose meaning depended on
    // which module emitted it. Harmless while the one consumer read only `target.id`, and settled
    // HERE rather than left for #209's replay driver to inherit as the second consumer: a driver
    // that logs or matches on `component` would have been matching a display string.
    //
    // The shape is read from the wrapper, where place()'s caller recorded it, and is OMITTED when
    // the canvas holds something that has none — /factory's fat-marker blocks are the drafted
    // board, not library components, and naming one "stu-place" would be inventing a vocabulary
    // entry. An action with no `component` is the honest shape of "the canvas moved a node".
    const shapeOf = (node) => node.getAttribute("data-stx-component") || null;

    // The plain-data entry the pure group layer takes, built in ONE place (#219) because the span is
    // easy to omit from the second copy: a member carrying no cols/rows is tested by its top-left
    // cell alone, so a frame dragged on its own — preview() routes EVERY gesture through groupDelta,
    // single-node ones included — would happily overlap a peer with the rest of its footprint. For a
    // .stx-slot, spanOf() answers 1×1 and the entry is what it always was, plus two fields the pure
    // layer's default already assumed.
    const memberEntry = (m) => ({ id: m.id, col: m.current.col, row: m.current.row, ...spanOf(m.node) });

    const emitGesture = (source) => {
      // #219's third branch. A resize names ONE subject and carries a size rather than a slot, and it
      // uses the same envelope discipline the two branches below argue for: `component` is the
      // vocabulary shape, `label` is the display name, and a node with no shape carries neither.
      if (gesture.kind === "resize") {
        const shape = shapeOf(gesture.node);
        bus.emit({
          type: "ui.resize",
          source,
          target: { ...(shape ? { component: shape } : {}), id: gesture.id, label: nameOf(gesture.node) },
          params: { cols: gesture.currentSpan.cols, rows: gesture.currentSpan.rows },
        });
        return;
      }
      // ONE VERB FOR ONE NODE, ONE FOR MANY — and `ui.move-group` carries NO `target`, deliberately:
      // there is no single subject to name, and inventing one (the anchor) would make a consumer
      // that read it move the wrong thing. Both are applied by a consumer in this same module, so
      // applySlot stays the one place a slot is written and the mover stays one module.
      if (gesture.members.length > 1) {
        bus.emit({
          type: "ui.move-group",
          source,
          params: { moves: gesture.members.map((m) => ({ id: m.id, col: m.current.col, row: m.current.row })) },
        });
        return;
      }
      const shape = shapeOf(gesture.node);
      bus.emit({
        type: "ui.move",
        source,
        target: { ...(shape ? { component: shape } : {}), id: gesture.id, label: nameOf(gesture.node) },
        params: { col: gesture.current.col, row: gesture.current.row },
      });
    };

    // ONE GESTURE OBJECT, DISTINGUISHED BY `kind` — not a sibling `resizing` state (#219). TWELVE
    // handlers key on `gesture` (six on stage, two on scroll, the document Escape listener,
    // flushPreview, clearGesture, and studio.mjs's compile-time verbs.cancel()), and a second state
    // variable means a second condition in every one of them, each failing silently. Widening the
    // object is what #217 did when it added `members`, and it buys mutual exclusion for free: stage
    // pointerdown already returns early when a non-sticky gesture is live.
    //
    // For a resize, `members` is [the frame] — a frame is outside the selection layer by decision —
    // and `origin` / `current` NEVER change: the top-left corner is fixed and the reader is dragging
    // the bottom-right one. `originSpan` / `currentSpan` are the two fields that do.
    const pickUp = (node, source, kind = "move") => {
      const origin = slotOf(node);
      // THE SELECTION IS READ LIVE OFF THE DOM, at pick-up, with no cross-module handle — which is
      // what lets system/studio-select.mjs own the selection without this file importing it, and
      // what makes a selection cleared by a board redraft (studio.mjs:614 removes the wrappers)
      // disappear from here for free. A carry is a GROUP only when the picked-up node is itself
      // selected AND more than one node is: picking up an UNselected block while a selection exists
      // moves that block alone, which is what every design tool does and what keeps the single-node
      // path reachable at all times.
      //
      // DELIBERATELY STILL `.stx-slot`-SCOPED after #219's MOVABLE widening, and this is the line
      // that keeps a half-widened selection layer from existing: studio-select.mjs's chosenNodes()
      // is `.stx-slot[data-stx-selected]` too, so the two agree about what a selection contains. A
      // resize is always single-node for the same reason.
      const chosen = [...stage.querySelectorAll(".stx-slot[data-stx-selected]")];
      const carried = kind === "resize"
        ? [node]
        : (node.hasAttribute("data-stx-selected") && chosen.length > 1 ? chosen : [node]);
      // ADOPT AT PICK-UP, NOT ONLY IN THE CONSUMER — because a gesture is a PREVIEW. Both input
      // paths write slots to the DOM live and emit their one ui.move at the DROP, so by the time
      // the consumer runs, snapshot() reports a post-mount node's DESTINATION and adopting there
      // would record it as its own origin. Undo would then "restore" it to where it already sits,
      // and #230 would survive for the two paths a human actually uses. Here nothing has moved yet.
      history.adopt(snapshot());
      gesture = {
        kind,
        id: idOf(node),
        node,
        origin,
        current: origin,
        originSpan: spanOf(node),
        currentSpan: spanOf(node),
        members: carried.map((n) => ({ node: n, id: idOf(n), origin: slotOf(n), current: slotOf(n) })),
        occupied: occupancyExcept(carried),
        source,
        sticky: false,
      };
      for (const m of gesture.members) m.node.classList.add("is-picked");
      // The guides are part of the carry's feedback, so they exist from the pick-up rather than from
      // the first movement: a keyboard reader who picks up a block already aligned with a peer sees
      // that alignment before pressing an arrow.
      //
      // THEY RENDER DURING A RESIZE TOO, and that is correct rather than an oversight: the frame's
      // ORIGIN does not move for the whole gesture, so a guide drawn at pick-up is a claim that stays
      // true until the drop. guidesFor reads members' `current`, which for a resize IS the origin.
      renderGuides();
      // ANNOUNCED ONLY WHEN THE PICK-UP IS ITSELF A VERB. Pressing the button down to start a DRAG
      // is not one — the reader is about to watch their own hand carry the thing, exactly the
      // argument that keeps slot crossings silent, and announcing it would make one pointer gesture
      // two announcements. The keyboard pick-up IS a verb (nothing else tells the reader they are
      // now carrying something), and so is the click-to-pick-up of the single-pointer path, which
      // announces from its own branch in the pointerup handler.
      if (source === "keyboard") {
        if (kind === "resize") {
          canvas.say(`${nameOf(node)} ready to resize, ${gesture.currentSpan.cols} columns by ${gesture.currentSpan.rows} rows. Arrow keys to size it, Enter to finish, Escape to cancel.`);
        } else {
          canvas.say(gesture.members.length > 1
            ? `${gesture.members.length} components picked up, column ${origin.col}, row ${origin.row}. Arrow keys to move, Enter to drop, Escape to cancel.`
            : `${nameOf(node)} picked up, column ${origin.col}, row ${origin.row}. Arrow keys to move, Enter to drop, Escape to cancel.`);
        }
      }
      return gesture;
    };

    const clearGesture = () => {
      if (!gesture) return null;
      const g = gesture;
      gesture = null;
      if (g.raf) cancelAnimationFrame(g.raf);
      for (const m of g.members) m.node.classList.remove("is-picked");
      clearGuides();
      // Capture is only ever taken on the ANCHOR — the members follow it, they are not each their
      // own pointer target — so there is exactly one release here however many nodes moved.
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
      // "MOVED" MEANS ANY MEMBER CHANGED SLOT (R9). Per-member is the easy thing to get wrong here:
      // reading only the anchor lets a group whose anchor happened to land back on its origin
      // commit nothing while N-1 members sit somewhere new, and reading "every member" refuses a
      // real move for the same reason in reverse. The gate is the history depth delta — exactly 1
      // for a real move, 0 for a null one.
      //
      // KIND-AWARE SINCE #219: a resize never moves, so the members test would report every resize
      // as a null gesture and emit nothing at all.
      const moved = gesture.kind === "resize"
        ? (gesture.currentSpan.cols !== gesture.originSpan.cols || gesture.currentSpan.rows !== gesture.originSpan.rows)
        : gesture.members.some((m) => m.current.col !== m.origin.col || m.current.row !== m.origin.row);
      if (moved) emitGesture(source);
      const g = clearGesture();
      if (!moved) {
        if (g.kind === "resize") {
          canvas.say(`${nameOf(g.node)} left at ${g.originSpan.cols} columns by ${g.originSpan.rows} rows.`);
        } else {
          canvas.say(g.members.length > 1
            ? `${g.members.length} components put down in column ${g.origin.col}, row ${g.origin.row}.`
            : `${nameOf(g.node)} put down in column ${g.origin.col}, row ${g.origin.row}.`);
        }
      }
    };

    // EVERY member goes back to its own origin, not the anchor's delta applied in reverse: the two
    // are the same for a rigid translation and differ the moment a future verb is not one, and this
    // is also the guard studio.mjs:467 leans on when a compile lands mid-carry (#251, now over N).
    const cancel = () => {
      if (!gesture) return;
      const g = gesture;
      if (g.kind === "resize") applySpan(g.node, g.originSpan);
      else for (const m of g.members) applySlot(m.node, m.origin);
      clearGesture();
      if (g.kind === "resize") {
        canvas.say(`Cancelled, ${nameOf(g.node)} back at ${g.originSpan.cols} columns by ${g.originSpan.rows} rows.`);
        return;
      }
      canvas.say(g.members.length > 1
        ? `Cancelled, ${g.members.length} components back where they were.`
        : `Cancelled, ${nameOf(g.node)} back in column ${g.origin.col}, row ${g.origin.row}.`);
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
    //
    // ONE FUNCTION FOR ONE NODE AND FOR N (#217), and keeping the NAME is the load-bearing part
    // rather than a tidiness call. `preview` is invoked from three places — the rAF callback,
    // flushPreview and the sticky-drop branch — and R3's whole lesson is that flushPreview's two
    // call sites cover each other and neither is individually proven (:502-518). Giving the group
    // path its own entry point would have meant deciding, three times, which of them the group goes
    // through; there is nothing to decide if there is one function.
    //
    // `slot` is the ANCHOR's destination; every member translates by the same delta, all-or-nothing
    // through the pure groupDelta. Blocked (or off-grid) leaves the whole set on its last valid
    // position, which is exactly what the single-node path already did — groupDelta returns the very
    // array it was handed, so identity is the "nothing changed" signal and no member is half-moved.
    // The resize half of preview(), and the reason it is a private function rather than a second
    // entry point: `preview` keeps its NAME and its three call sites (the rAF callback, flushPreview
    // and the sticky-drop branch), so there is nothing to decide about which of them a resize goes
    // through. It sets a span from a desired BOTTOM-RIGHT corner, clamps it to the grid, and previews
    // only if the whole footprint fits — otherwise the last valid span stands, exactly as a blocked
    // move keeps the last valid slot.
    // PER-AXIS FALLBACK, and it is the difference between a corner that resizes and one that feels
    // dead. A pointer drag moves BOTH axes at once, so an all-or-nothing test refuses the growth the
    // frame does have room for whenever the other axis is blocked — on the shipped canvas that is
    // the commonest gesture on the commonest frame, because Verdant sits directly left of Fieldwork
    // and can only grow downwards. So: try the whole request, then the request with the blocked axis
    // left where it is. Every candidate is still the reader's own request in at least one axis and
    // the frame never goes anywhere they did not drag it.
    //
    // The KEYBOARD path is unaffected by construction, which is why there is one implementation and
    // not two: an arrow changes ONE axis, so both fallbacks collapse to the current span, are skipped
    // by the equality test, and the press is announced as blocked — the honest per-press answer.
    const applyPreviewSpan = (want) => {
      const asked = clampSpan(gesture.origin, want);
      const candidates = [
        asked,
        { cols: gesture.currentSpan.cols, rows: asked.rows }, // the row change alone
        { cols: asked.cols, rows: gesture.currentSpan.rows }, // the column change alone
      ];
      for (const span of candidates) {
        if (span.cols === gesture.currentSpan.cols && span.rows === gesture.currentSpan.rows) continue;
        if (!fits(gesture.origin, span, gesture.occupied)) continue; // keep the last valid span
        gesture.currentSpan = span;
        applySpan(gesture.node, span);
        renderGuides();
        return true;
      }
      return false;
    };
    const previewSpan = (corner) => applyPreviewSpan({
      cols: corner.col - gesture.origin.col + 1,
      rows: corner.row - gesture.origin.row + 1,
    });
    // "The largest that fits" has exactly one honest definition — maximal AREA, widest on a tie —
    // and it needs occupancy, which is why fits() is pure and shared rather than folded into the
    // clamp. At most MAX_COLS × MAX_ROWS candidates, once per End press.
    const largestSpan = () => {
      const max = clampSpan(gesture.origin, { cols: MAX_COLS, rows: MAX_ROWS });
      let best = { cols: MIN_SPAN, rows: MIN_SPAN };
      let bestArea = 0;
      for (let cols = MIN_SPAN; cols <= max.cols; cols += 1) {
        for (let rows = MIN_SPAN; rows <= max.rows; rows += 1) {
          if (!fits(gesture.origin, { cols, rows }, gesture.occupied)) continue;
          const area = cols * rows;
          if (area > bestArea || (area === bestArea && cols > best.cols)) { best = { cols, rows }; bestArea = area; }
        }
      }
      return best;
    };

    const preview = (slot) => {
      // ONE ENTRY POINT, TWO KINDS (#219). For a resize the argument is the desired BOTTOM-RIGHT
      // corner rather than a destination, which is what makes the pointer path free: the same
      // pointToSlot() chain feeds both.
      if (gesture.kind === "resize") return previewSpan(slot);
      const dcol = slot.col - gesture.current.col;
      const drow = slot.row - gesture.current.row;
      if (!dcol && !drow) return false;
      const before = gesture.members.map(memberEntry);
      const after = groupDelta(before, dcol, drow, gesture.occupied);
      if (after === before) return false; // keep the last valid slot
      for (let i = 0; i < gesture.members.length; i += 1) {
        const m = gesture.members[i];
        m.current = { col: after[i].col, row: after[i].row };
        applySlot(m.node, m.current);
      }
      // The anchor's own current is what every existing branch reads, so it is kept in step here
      // rather than recomputed at each reader.
      gesture.current = { col: gesture.current.col + dcol, row: gesture.current.row + drow };
      renderGuides();
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
      // MOVABLE, not ".stx-slot" (#219). This is the line that resolves the gesture's SUBJECT, and it
      // runs BEFORE the handle test below — so leaving it narrow would return early on every press on
      // a frame, and the symptom would be "the resize handle does nothing" arriving from a line
      // nobody was looking at.
      const node = e.target.closest?.(MOVABLE);
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
      // BOTH HANDLES (#219), and `fromHandle` reads the widened match on purpose: it is what makes
      // SC 2.5.7's click-move-click path (the sticky branch in pointerup below) cover the resize with
      // no new code. Derive it from .stx-grab alone and a click on the corner starts a gesture that
      // can never be finished with a second click.
      const handle = e.target.closest?.(".stx-grab, .stx-resize");
      const interactive = e.target.closest?.("button, a, input, select, textarea, [tabindex]");
      if (interactive && node.contains(interactive) && !handle) return;

      e.stopPropagation(); // or studio-canvas.mjs:225's ancestor pan handler also starts panning
      e.preventDefault(); // no text selection under the drag
      const g = pickUp(node, "pointer", handle?.classList.contains("stx-resize") ? "resize" : "move");
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
      // MOVABLE (#219): un-widened, a press on a frame during a sticky carry would drop the gesture
      // HERE and then run the stage handler for the same press — two drops for one click.
      if (!gesture || !gesture.sticky || e.target.closest?.(MOVABLE)) return;
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
      // KIND-AWARE (#219). A resize's `current` NEVER changes, so the slot comparison alone would
      // report every resize drag as a click and leave the reader stickily carrying a frame they had
      // just finished sizing — the drop would never happen and the ui.resize would never be emitted.
      const still = gesture.kind === "resize"
        ? (gesture.currentSpan.cols === gesture.originSpan.cols && gesture.currentSpan.rows === gesture.originSpan.rows)
        : (gesture.current.col === gesture.origin.col && gesture.current.row === gesture.origin.row);
      if (still && gesture.fromHandle) {
        // A CLICK on the handle, not a drag: stay picked up. This is SC 2.5.7's single-pointer
        // alternative — the reader moves the pointer with no button held and presses again to drop.
        // pointerId is cleared here so the implicit capture release below finds nothing of ours to
        // cancel; the move handler switches to the sticky branch for the same reason.
        gesture.sticky = true;
        gesture.pointerId = null;
        try { gesture.node.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        canvas.say(gesture.kind === "resize"
          ? `${nameOf(gesture.node)} ready to resize, ${gesture.currentSpan.cols} columns by ${gesture.currentSpan.rows} rows. Move the pointer and click to finish, or use the arrow keys; Escape cancels.`
          : (gesture.members.length > 1
            ? `${gesture.members.length} components picked up, column ${gesture.origin.col}, row ${gesture.origin.row}. Move the pointer and click to drop, or use the arrow keys; Escape cancels.`
            : `${nameOf(gesture.node)} picked up, column ${gesture.origin.col}, row ${gesture.origin.row}. Move the pointer and click to drop, or use the arrow keys; Escape cancels.`));
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
      const handle = e.target.closest?.(".stx-grab, .stx-resize");
      // A STICKY pointer pick-up is keyboard-operable too — the handle holds focus, so a reader who
      // started with the mouse can finish with the arrows. A gesture mid-DRAG is not: the button is
      // still down and the pointer is the thing steering.
      const carried = gesture && (gesture.source === "keyboard" || gesture.sticky);

      if (!carried) {
        if (!handle) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        if (gesture) return; // a pointer gesture is live — not this path's business
        e.preventDefault();
        const node = handle.closest(MOVABLE); // MOVABLE (#219): a frame's handle finds no .stx-slot
        if (!node) return;
        const g = pickUp(node, "keyboard", handle.classList.contains("stx-resize") ? "resize" : "move");
        g.geom = readGeom();
        return;
      }

      if (e.key === "Escape") { e.preventDefault(); cancel(); return; }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drop("keyboard"); return; }

      // THE RESIZE'S KEYBOARD MODEL IS THIS CANVAS'S, NOT #176's, and that is a deliberate departure
      // from the design this migrates. #176's standalone splitter COMMITTED on every arrow press,
      // because it had no history and no surrounding grammar. Here Enter picks up, arrows preview,
      // Enter drops and Escape cancels — the sentence #stx-move-help already teaches. Three reasons:
      // one gesture is one history entry (so Undo after a keyboard resize undoes THE RESIZE, not its
      // last column); the reader learns one grammar for the canvas instead of two; and
      // Escape-to-cancel exists at all, which a commit-per-press model cannot offer. The cost is one
      // extra keypress at each end, and it is the right trade.
      //
      // Home / End are the APG splitter's vocabulary kept: minimum, and the largest that fits. The
      // handle is a <button> rather than a role="separator" because a splitter is ONE-DIMENSIONAL and
      // this control sizes two axes — recorded here rather than left for a reviewer to wonder about.
      if (gesture.kind === "resize") {
        let sized;
        if (e.key === "Home") {
          e.preventDefault();
          sized = applyPreviewSpan({ cols: MIN_SPAN, rows: MIN_SPAN });
        } else if (e.key === "End") {
          e.preventDefault();
          sized = applyPreviewSpan(largestSpan());
        } else {
          const step = DIRS[e.key];
          if (!step) return; // not ours — let the page have the key
          e.preventDefault(); // or the scroller also scrolls
          // The arrows move the BOTTOM-RIGHT CORNER, which is the corner the pointer path drags.
          sized = previewSpan({
            col: gesture.origin.col + gesture.currentSpan.cols - 1 + step[0],
            row: gesture.origin.row + gesture.currentSpan.rows - 1 + step[1],
          });
        }
        // ANNOUNCED ON EVERY PRESS, INCLUDING A BLOCKED ONE, for the reason the move path records
        // below: a keyboard reader with no per-step feedback cannot tell a step blocked by a peer
        // from one blocked by the grid edge.
        canvas.say(sized
          ? `${gesture.currentSpan.cols} columns by ${gesture.currentSpan.rows} rows.`
          : `Blocked, still ${gesture.currentSpan.cols} columns by ${gesture.currentSpan.rows} rows.`);
        return;
      }

      const dir = DIRS[e.key];
      if (!dir) return; // not ours — let the page have the key
      e.preventDefault(); // or the scroller also scrolls

      // TWO RESOLVERS, AND THEY ARE NOT THE SAME ONE. stepSlot KEEPS WALKING past an occupied cell,
      // which is right for one node — a peer in the way is a thing to step over. groupStep is
      // ALL-OR-NOTHING, which is right for many — walking would land members at different offsets
      // and deform the selection the reader is holding. Reusing stepSlot here is the silent bug
      // group 13's deep-equality case exists to catch (R1).
      let moved;
      if (gesture.members.length > 1) {
        const before = gesture.members.map(memberEntry);
        const after = groupStep(before, dir, gesture.occupied);
        moved = after !== before && preview({ col: gesture.current.col + dir[0], row: gesture.current.row + dir[1] });
      } else {
        // The span is passed (#219) so a MOVING frame is stepped by its whole footprint. For a
        // .stx-slot spanOf() answers 1×1 and this is byte-identical to the call it replaces.
        moved = preview(stepSlot(gesture.current, dir, gesture.occupied, spanOf(gesture.node)));
      }
      // ANNOUNCED ON EVERY PRESS, INCLUDING A BLOCKED ONE. A keyboard user with no per-step feedback
      // is flying blind for the whole gesture, unable to tell a step blocked by a peer from one
      // blocked by the grid edge. Announcing unconditionally is also what makes the driver's exact
      // N + 2 count independent of which N it chose.
      //
      // The group sentence NAMES THE COUNT rather than a component (R8): a whole-canvas selection
      // that can only be stopped by the edge is correct and would otherwise be silent about why.
      const n = gesture.members.length;
      if (n > 1) {
        canvas.say(moved
          ? `${n} components in column ${gesture.current.col}, row ${gesture.current.row}.`
          : `Blocked, ${n} components still in column ${gesture.current.col}, row ${gesture.current.row}.`);
      } else {
        canvas.say(moved
          ? `Column ${gesture.current.col}, row ${gesture.current.row}.`
          : `Blocked, still in column ${gesture.current.col}, row ${gesture.current.row}.`);
      }
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
      cancel, // the orchestrator's carry-across-swap guard (#251); a silent no-op with no live gesture
      get gesture() { return gesture; },
      destroy() {
        ac.abort();
        clearGesture(); // also removes the guides, on every teardown path
        offMove();
        offMoveGroup();
        offResize();
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
