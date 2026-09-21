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

import { FRAME_CLASS, MIN_SIZE, MOVABLE, NODE_GAP, NODE_H, NODE_W, STAGE_H, STAGE_W, setPos } from "./studio-canvas.mjs";

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
// the LABEL_MAX / SLOT_MAX reason: system/studio-select.mjs writes the same shape of
// sentence for the selection, and a cap re-typed there is a second copy that drifts. Nothing about
// its value or its use changed in the move; build-checks group 13 pins it.
export const SPOKEN_MAX = 3;

// The alignment guides for a carry: the x values and the y values where a CARRIED member and a
// non-carried PEER line up. Deduplicated, sorted ascending, empty when nothing aligns.
//
// BOTH HALVES ARE REQUIRED, and that is the whole rule rather than a refinement. A guide over a line
// holding only carried members says nothing the reader cannot already see; a guide over one holding
// neither is a claim about an alignment that does not exist — the lie the AC forbids. So the gate
// does not count guides: it forces one onto a line nothing is on and watches red.
//
// IT COMPARES EDGES, NOT ORIGINS (#302). Under the grid a column was a column and two nodes either
// shared it or did not. Free positions align on any of THREE lines per axis — leading edge, centre,
// trailing edge — and a reader dragging a 220-wide node under a 456-wide one is aligning centres far
// more often than origins. Only exact equality counts, on each of the three separately: a tolerance
// would make the guide appear before the alignment is real, which is the same false claim by a
// slower route.
//
// Total over junk: a non-array on either side answers empty, and a member with a non-finite position
// is skipped rather than contributing a NaN line nothing can equal.
export function guidesFor(carried, peers) {
  const edges = (n, key, sizeKey) => {
    const at = Number(n && n[key]);
    if (!Number.isFinite(at)) return [];
    const size = Number(n && n[sizeKey]);
    return Number.isFinite(size) && size > 0 ? [at, at + size / 2, at + size] : [at];
  };
  const axis = (key, sizeKey) => {
    const mine = new Set();
    for (const c of Array.isArray(carried) ? carried : []) for (const e of edges(c, key, sizeKey)) mine.add(e);
    const out = new Set();
    for (const p of Array.isArray(peers) ? peers : []) for (const e of edges(p, key, sizeKey)) if (mine.has(e)) out.add(e);
    return [...out].sort((a, b) => a - b);
  };
  return { xs: axis("x", "w"), ys: axis("y", "h") };
}

// ---- align and distribute (#302 Phase 5) --------------------------------------------------------

// THE EIGHT VERBS, as data rather than as eight functions, so the bus wiring, the menu and this
// file's own switch all read one list and a ninth cannot be half-added. The names obey
// action-bus.mjs's TYPE_RE — lowercase, hyphens, exactly one dot — so `ui.align-left`, never
// `ui.alignLeft`.
//
// "centre" AND "middle" are the two axes' words for the same idea, which is the convention every
// design tool uses and the reason the list is not four verbs with an axis param: a reader looking
// for "middle" should find it.
export const ALIGN_VERBS = Object.freeze([
  "align-left", "align-centre", "align-right",
  "align-top", "align-middle", "align-bottom",
  "distribute-h", "distribute-v",
]);

// THE NUDGE STEP, and the floor is a DECISION the plan pins: --spacing-xs = 4px. There is no
// --spacing-none — #301 decided against it (system/specs/stack.md) and build-checks group 3 asserts
// its absence — so the scale starts at 4 and so does this. Typed rather than read from the sheet
// because this is Node-import-safe code and getComputedStyle is not available to it; group 13 pins
// the pair against tokens.contract.css.
export const NUDGE_STEP = 4;

// THE MEASURED BOX, PURE (#437, PR #432's F5). boxOf answers what a node has AUTHORED and a board
// wrapper authors no height; the readers that do ARITHMETIC (guides, align, distribute) need one,
// and offsetHeight supplies it. The old fallback was `offsetHeight || 0`, which is the exact shape
// round-1's F2 fixed — a zero-height box makes every board block a line, so align-bottom aligns
// tops and a marquee across four blocks selects nothing — restored silently whenever offsetHeight
// reads 0 (a hidden or not-yet-laid-out canvas). fit()'s posture for an unmeasurable read is to
// say so rather than coerce a number, and this matches it: the caller decides what a refusal
// means (the align verbs announce it; the guides skip the peer). Pure so group 13 can prove the
// refusal fires.
export function measuredBox(box, offsetHeight, id = "a component") {
  if (Number.isFinite(box?.h)) return box;
  if (Number.isFinite(offsetHeight) && offsetHeight > 0) return { ...box, h: offsetHeight };
  throw new Error(`${id} has no measurable height (offsetHeight ${offsetHeight}) — the canvas is hidden or not laid out yet, and a 0 here would put every edge on one line`);
}

// readingOrder(boxes) → ids in ROW-MAJOR order — the order a sighted reader's eye takes across the
// canvas, which is what "moved to 3 of 7" is counting (#302's T16).
//
// ROW-MAJOR NEEDS A DEFINITION OF "SAME ROW", and free positions do not come with one: two nodes at
// y 100 and y 104 are on the same row to a reader and two different rows to a sort. The band is one
// node height, which is the smallest thing on this stage that has a height, and the tie inside a
// band is broken left to right.
//
// IT IS FIXED BUCKETING, NOT A RELATIVE BAND, and the difference is worth stating because the
// obvious reading of the paragraph above is the one this does not do (#302, PR #432's F11).
// Math.floor(y / ROW_BAND) cuts the stage into fixed stripes: y 0 and y 139 share a row while y 130
// and y 150 do not, so it is NOT "within one node of each other" — two nodes a few pixels apart
// read as two rows whenever the boundary happens to fall between them. That is the deliberate
// choice rather than a bug: bucketing is total, order-independent and deterministic, which is what
// an ordinal in a live-region sentence needs, and a true relative band is a clustering pass whose
// answer depends on which node you start from. Group 13's fixture straddles a boundary so the
// property asserted is the one implemented.
//
// STATED AS REVERSIBLE. A band is a judgement, not a fact, and the architecture marks the snap
// family as a reversible call; if the canvas later grows a real row concept, this reads from it
// instead. Nothing else depends on the number it produces except the sentence.
export const ROW_BAND = NODE_H;

export function readingOrder(boxes) {
  const list = (Array.isArray(boxes) ? boxes : []).filter((b) => b && b.id != null
    && Number.isFinite(Number(b.x)) && Number.isFinite(Number(b.y)));
  return [...list]
    .sort((a, b) => {
      const rowA = Math.floor(Number(a.y) / ROW_BAND);
      const rowB = Math.floor(Number(b.y) / ROW_BAND);
      return rowA === rowB ? Number(a.x) - Number(b.x) : rowA - rowB;
    })
    .map((b) => String(b.id));
}

// alignMoves(boxes, verb) → [{ id, x, y }] — the destination for every box, or [] when the verb
// cannot act.
//
// TWO OR MORE, ALWAYS. Aligning one thing is a no-op with a sentence, and distributing fewer than
// three is already distributed — both answer [] rather than moving something to where it is, which
// is what lets the caller say "nothing to align" instead of announcing a move that did not happen.
//
// IT MOVES NOTHING TO ITS OWN POSITION EITHER: a box already on the target line is left out of the
// answer entirely, so the history entry and the announcement both describe what actually changed.
//
// PURE, so build-checks group 13 drives every verb without a browser. Total over junk.
export function alignMoves(boxes, verb) {
  const list = (Array.isArray(boxes) ? boxes : []).filter((b) => b && b.id != null
    && Number.isFinite(Number(b.x)) && Number.isFinite(Number(b.y)));
  if (!ALIGN_VERBS.includes(verb) || list.length < 2) return [];
  const n = (v) => Number(v);
  const w = (b) => (Number.isFinite(Number(b.w)) ? Number(b.w) : 0);
  const h = (b) => (Number.isFinite(Number(b.h)) ? Number(b.h) : 0);
  const at = (b) => ({ id: b.id, x: n(b.x), y: n(b.y) });

  // DISTRIBUTE NEEDS THREE. With two, the ends are the ends and there is nothing between them.
  if (verb === "distribute-h" || verb === "distribute-v") {
    if (list.length < 3) return [];
    const horizontal = verb === "distribute-h";
    // Ordered by position, not by selection order: "distribute" means even gaps along the axis as
    // the READER sees them, and honouring click order would reshuffle the row.
    const sorted = [...list].sort((a, b) => (horizontal ? n(a.x) - n(b.x) : n(a.y) - n(b.y)));
    const size = horizontal ? w : h;
    const start = horizontal ? n(sorted[0].x) : n(sorted[0].y);
    const last = sorted[sorted.length - 1];
    const end = (horizontal ? n(last.x) : n(last.y)) + size(last);
    // EQUAL GAPS, not equal centres. Equal centres looks wrong the moment two nodes differ in size,
    // which on this canvas is the normal case — a phone frame beside a board wrapper.
    const total = sorted.reduce((sum, b) => sum + size(b), 0);
    const gap = (end - start - total) / (sorted.length - 1);
    const out = [];
    let cursor = start;
    for (const b of sorted) {
      const want = horizontal ? { ...at(b), x: cursor } : { ...at(b), y: cursor };
      if (want.x !== n(b.x) || want.y !== n(b.y)) out.push(want);
      cursor += size(b) + gap;
    }
    return out;
  }

  const xs = list.map((b) => n(b.x));
  const rights = list.map((b) => n(b.x) + w(b));
  const ys = list.map((b) => n(b.y));
  const bottoms = list.map((b) => n(b.y) + h(b));
  const target = {
    "align-left": Math.min(...xs),
    "align-right": Math.max(...rights),
    "align-centre": (Math.min(...xs) + Math.max(...rights)) / 2,
    "align-top": Math.min(...ys),
    "align-bottom": Math.max(...bottoms),
    "align-middle": (Math.min(...ys) + Math.max(...bottoms)) / 2,
  }[verb];
  const out = [];
  for (const b of list) {
    const want = { ...at(b) };
    if (verb === "align-left") want.x = target;
    else if (verb === "align-right") want.x = target - w(b);
    else if (verb === "align-centre") want.x = target - w(b) / 2;
    else if (verb === "align-top") want.y = target;
    else if (verb === "align-bottom") want.y = target - h(b);
    else if (verb === "align-middle") want.y = target - h(b) / 2;
    if (want.x !== n(b.x) || want.y !== n(b.y)) out.push(want);
  }
  return out;
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

export function mountCanvasVerbs(canvas, { bus, ledger } = {}) {
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
    // The node's BOX, read off the four properties setPos wrote. `h` is NULL for a board wrapper and
    // a number for a frame, which is D-c's distinction carried through every reader below: a wrapper
    // has no authored height, and reading one as 0 would make a resize think it had shrunk.
    const boxOf = (node) => {
      const prop = (name) => parseFloat(node.style.getPropertyValue(name));
      const h = prop("--h");
      return {
        x: prop("--x") || 0,
        y: prop("--y") || 0,
        w: prop("--w") || NODE_W,
        h: Number.isFinite(h) ? h : null,
      };
    };
    // A REFUSAL IS SAID AND WRITTEN IN ONE CALL (#434). canvas.say is the live region, transient by
    // design; ledger.note is the row that stays. One helper so the two cannot drift (R2 in the
    // ticket) — the sentence is the same string on both paths, and the source is the action's own.
    const refuse = (action, sentence) => {
      canvas.say(sentence);
      ledger?.note("refused", sentence, action?.source === "pointer" || action?.source === "agent" || action?.source === "voice" ? action.source : "keyboard");
    };
    // THE SAME BOX, MEASURED (#302, PR #432's F2). boxOf answers what the node has AUTHORED, and for
    // a board wrapper that is `h: null` — right for the snapshot, wrong for anything doing ARITHMETIC
    // on a bottom edge. alignMoves coerces a null height to 0, so align-bottom aligned TOPS to the
    // bottom-most node's top, align-middle aligned tops to the mid-line and distribute-v equalised
    // top spacing; guidesFor's edges() drops the centre and bottom guides for a box with no height.
    // Both readers take `.stx-slot` only — frames are deliberately unselectable — so every one of
    // those was wrong on 100% of the nodes it can act on, with build-checks green: the BX fixture
    // hands alignMoves an explicit h on every box, which is the shape the page never produces.
    //
    // offsetHeight is the UNSCALED layout height — a transform on an ancestor does not reach it — so
    // it lands in stage units beside --x/--y/--w. studio-select.mjs:331 (the hit test) and
    // studio-minimap.mjs:315 already read geometry exactly this way, and for the same reason.
    // snapshot()'s boxOf is left alone: the two questions are genuinely different.
    const measuredBoxOf = (node) => measuredBox(boxOf(node), node.offsetHeight, node.getAttribute("data-stx-id") || "a component");
    const isFrame = (node) => node.classList.contains(FRAME_CLASS);
    const idOf = (node) => node.getAttribute("data-stx-id");
    const nameOf = (node) => node.getAttribute("data-stx-name") || "Component";

    // A SNAPSHOT ENTRY SAYS WHAT THE NODE'S GEOMETRY IS, so `h` is recorded only for a node that HAS
    // one — a board wrapper does not, and writing `h: 0` for it would be claiming a property it has
    // never carried, in a structure two drivers deep-compare. That rule is #205's, kept verbatim
    // through #302's change of units; build-checks group 13 asserts both halves and proves the
    // comparison reaches the fourth field.
    const snapshot = () => {
      const out = {};
      for (const node of slots()) {
        const id = idOf(node);
        if (!id) continue;
        const box = boxOf(node);
        out[id] = box.h == null
          ? { x: box.x, y: box.y, w: box.w }
          : { x: box.x, y: box.y, w: box.w, h: box.h };
      }
      return out;
    };

    // THE ONE PLACE A POSITION IS WRITTEN AFTER PLACEMENT, and it writes through setPos rather than
    // touching a style property — which is what keeps this module out of build-checks group 7's
    // named-writer list entirely. applySlot and applySpan were two functions because a slot and a
    // span were two attribute pairs; setPos takes both, so this is one.
    //
    // A missing `h` is passed through as undefined rather than as a number: setPos omits the
    // property entirely for it, so a board wrapper never acquires a height on a move.
    const applyBox = (node, box) => setPos(node, box.x, box.y, box.w, box.h ?? undefined);

    // NOTHING BLOCKS A FREE MOVE (#302, D-d). What stood here was occupancyExcept — the set of every
    // cell every non-carried peer covered, rebuilt at gesture start, which the pure group layer
    // tested every candidate destination against. Free positions have no cells to collide in, so
    // there is no occupancy to compute and no destination to refuse; inventing a collision rule
    // would be inventing a rule #302 never asked for, and one the reader would experience as the
    // canvas refusing to put a thing where they put it.
    //
    // TWO CONSEQUENCES, WRITTEN DOWN RATHER THAN DISCOVERED. First, "blocked" stops existing as a
    // state, and the sentence that announced it ("Blocked, still in column X, row Y.") is DELETED
    // rather than translated — an announcement for a state nothing produces is worse than none,
    // because a later reader takes it as evidence the state exists. Second, the only bound left is
    // the stage edge, setPos clamps to it, and every announcement below names THE POSITION REACHED
    // rather than the position asked for. An arrow press at the edge therefore announces the same
    // numbers twice, and that repetition is the feedback.

    // --- the alignment guides (#217) ------------------------------------------------------------
    // At most two elements — one vertical, one horizontal — created lazily, positioned by the SAME
    // setPos every node uses, and removed on drop, cancel and clear.
    //
    // A GUIDE IS A LINE, so it takes its cross-axis extent from the stage: the vertical one is
    // MIN_SIZE wide and the full stage tall, the horizontal one the reverse. Sized here rather than
    // in the sheet because setPos writes --w and --h and the sheet reads them — a guide that took
    // its size from a rule would be the only node on this stage whose geometry came from two places.
    //
    // PREPENDED to the stage rather than appended: every node is positioned, so paint order is DOM
    // order, and a guide is a ground wash UNDER the components rather than a tint over the alignment
    // it is pointing out (studio.css says the same).
    //
    // A GUIDE IS A CLAIM THAT AN ALIGNMENT EXISTS. guidesFor only reports a line where a CARRIED
    // member and a non-carried PEER share it, and the mount adds nothing to that: the first of each
    // axis is drawn, both arrays being sorted so the choice is deterministic. Showing every aligned
    // column would be honest too, and is not done because three highlighted columns read as noise —
    // but showing one where none aligns is the lie AC #3 forbids, which is why the gate forces a
    // guide onto a provably empty column and watches the check go red rather than counting guides.
    let xGuide = null;
    let yGuide = null;
    const setGuide = (existing, vertical, value) => {
      if (value == null) { existing?.remove(); return null; }
      const node = existing || el("div", { class: "stx-guide", "aria-hidden": "true" });
      if (vertical) setPos(node, value, 0, MIN_SIZE, STAGE_H);
      else setPos(node, 0, value, STAGE_W, MIN_SIZE);
      if (!node.isConnected) stage.insertBefore(node, stage.firstChild);
      return node;
    };
    const clearGuides = () => {
      xGuide = setGuide(xGuide, true, null);
      yGuide = setGuide(yGuide, false, null);
    };
    // Rendered for a SINGLE-node carry too, not only for a group: AC #3 does not scope guides to
    // groups, guidesFor handles one member as naturally as N, and a single drag is the commonest
    // gesture on this canvas — scoping them would leave the gate exercising only the rarer path.
    const renderGuides = () => {
      if (!gesture) { clearGuides(); return; }
      const carriedNodes = new Set(gesture.members.map((m) => m.node));
      // A peer that cannot be measured contributes NO guide rather than a zero-height one (#437):
      // a guide is advisory, and a refusal mid-drag would end the gesture over a peer's geometry.
      const peers = slots().filter((n) => !carriedNodes.has(n)).flatMap((n) => {
        try { return [measuredBoxOf(n)]; } catch { return []; }
      });
      // MEASURED ON BOTH SIDES (#302, PR #432's F2). members[].current comes from boxOf, so a carried
      // board wrapper arrived here with `h: null` and edges() gave it a top edge and nothing else —
      // the centre and bottom guides this function's own comment promises never fired for one. The
      // members themselves keep the authored box: applyBox writes it back on a cancel, and inventing
      // an --h there would claim a property the wrapper has never carried.
      const carried = gesture.members.map((m) => (Number.isFinite(m.current.h)
        ? m.current
        : { ...m.current, h: m.node.offsetHeight || 0 }));
      const { xs, ys } = guidesFor(carried, peers);
      xGuide = setGuide(xGuide, true, xs.length ? xs[0] : null);
      yGuide = setGuide(yGuide, false, ys.length ? ys[0] : null);
    };

    // --- the FLIP, used by undo/redo ONLY -------------------------------------------------------
    // element.animate() never touches .style, so build-checks group 7's STYLE_WRITE predicate does
    // not count it AND tooling/studio-journey.mjs's running-page style assertion stays true. Both
    // halves matter: the first alone would read as a dodge; the second is what makes the write-site
    // claim a property of the shipped page rather than of its source.
    //
    // IT ANIMATES `translate`, NOT `transform`, AND THAT IS NOT A STYLE CHOICE (#302). Every node now
    // carries `transform: translate(var(--x), var(--y))` from the sheet, and a Web Animations
    // keyframe on `transform` REPLACES the computed value for the animation's whole duration — it
    // does not add to it. MEASURED on all three engines with the real rule: a node at rest at
    // 300,200 given `[{transform: "translate(-40px,-30px)"}, {transform: "none"}]` renders at
    // -40,-30 — it snaps to the stage origin, applies the delta from THERE, and slides back. Not a
    // subtle wrongness: the node leaves the canvas entirely, on every undo.
    //
    // The individual transform properties (`translate`/`rotate`/`scale`) are applied BEFORE
    // `transform` when the used value is built (CSS Transforms 2), so a keyframe on `translate`
    // COMPOSES with the sheet's transform instead of replacing it. Same measurement, same three
    // engines: 260,170 — exactly rest minus the delta. `composite: "add"` on the transform animation
    // is the other correct answer and was not taken: it makes the keyframes' meaning depend on a
    // second, less-read option, and `{ transform: "none", composite: "add" }` reads as a no-op.
    //
    // NOTHING ELSE MAY PUT A `translate` ON A MOVABLE NODE, for the mirror of the same reason. The
    // context menu's flip uses one (system/studio.css), and that is safe precisely because a menu is
    // not in MOVABLE and never reaches this function.
    //
    // THE SCALE DIVIDE IS LOAD-BEARING. getBoundingClientRect deltas are POST-transform, and a
    // translate on the child applies in the child's UNSCALED local space — so without the divide the
    // travel is wrong at every scale but 1, and looks perfect at 100%, which is where it gets tested
    // first. studio-canvas.mjs's fit() documents the identical trap.
    const animateTo = (node, before) => {
      if (reduceMotion()) return;
      const after = node.getBoundingClientRect();
      const s = canvas.scale || 1;
      const dx = (before.left - after.left) / s;
      const dy = (before.top - after.top) / s;
      if (!dx && !dy) return;
      node.animate(
        [{ translate: `${dx}px ${dy}px` }, { translate: "none" }],
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
        const now = boxOf(node);
        // THE SIZE IS PART OF "DID ANYTHING CHANGE" (#219's rule, kept), and this line is where
        // forgetting that costs the whole feature: a resize leaves x and y untouched, so a
        // position-only comparison drops every pure resize out of `moving` — Undo then reports
        // "Nothing to undo" while the frame keeps its new size. `want.h` is absent for a board
        // wrapper, which arrives as undefined on both sides and compares equal.
        const samePos = now.x === want.x && now.y === want.y;
        const sameSize = now.w === want.w && (want.h ?? null) === now.h;
        if (samePos && sameSize) continue;
        moving.push({ node, want, sizeOnly: samePos, before: node.getBoundingClientRect() });
      }
      for (const m of moving) applyBox(m.node, m.want);
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
    // THE ALIGN ROW (#302 Phase 5.2). A BUTTON EACH, not a menu and not a key chord, for the reason
    // every other verb on this canvas has a visible control: a bus verb with no affordance is
    // reachable by an injected action and by nobody, and "each with a keyboard path" is satisfied by
    // a real <button> for free — it is focusable, it is in Tab order, and Enter and Space work
    // without this module writing a key handler.
    //
    // DISABLED UNTIL TWO ARE SELECTED, which is the same call menuItems makes for Clear: a verb with
    // nothing to act on is not a verb whose moment has not come. syncControls keeps them in step.
    //
    // ONE param-manifest ENTRY, not eight — the manifest's own granularity rule ("a stepped player's
    // button row = 1").
    const alignBtns = ALIGN_VERBS.map((verb) => {
      // SHORT TEXT, FULL ACCESSIBLE NAME. Eight buttons reading "Distribute across" wrapped the verb
      // row onto three lines and pushed the canvas below the fold on a 1000px viewport — measured,
      // not guessed: the scroller's centre landed at y 1005 and a wheel over it hit the window
      // instead. The visible word is enough under the group's own "Align and distribute the
      // selection" label; aria-label carries the whole verb, so a reader tabbing through still hears
      // what each one does rather than a bare "Left".
      const full = verb.replace("align-", "Align ").replace("distribute-h", "Distribute across").replace("distribute-v", "Distribute down");
      const btn = el("button", {
        type: "button", class: "btn btn-secondary stx-verb-btn", "data-stx-verb": verb,
        "aria-label": full,
        text: verb.startsWith("align-")
          ? verb.slice(6, 7).toUpperCase() + verb.slice(7)
          : (verb === "distribute-h" ? "Across" : "Down"),
      });
      // NO { signal } HERE, and that is the reason rather than an omission: `ac` and its signal are
      // declared ~550 lines below, with the pointer handlers, so naming it here is a temporal dead
      // zone — the mount throws before the row exists and /factory and /instance both go blank. The
      // whole row is removed by destroy() with verbRow, which detaches these listeners with it.
      btn.addEventListener("click", () => bus.emit({ type: `ui.${verb}`, source: "pointer" }));
      return btn;
    });
    const alignRow = el("div", { class: "stx-align", role: "group", "aria-label": "Align and distribute the selection" }, ...alignBtns);
    const verbRow = el("div", { class: "stx-verbs" }, undoBtn, redoBtn, alignRow, help, selectHelp, resizeHelp);
    viewport.insertBefore(verbRow, scroll);
    // ARM THE MOVE HANDLES (#231 L2). studio-canvas.mjs draws the .stx-grab button but owns none of
    // its behaviour, so it is born disabled and undescribed; this line is the moment that stops
    // being true, and it passes the id of the element THIS module just created rather than letting
    // the canvas literal it a second time. After it, place() arms new handles at creation.
    canvas.armMoveHandles(help.id, resizeHelp.id);

    const history = createHistory(snapshot());
    const syncControls = () => {
      const chosenCount = stage.querySelectorAll(".stx-slot[data-stx-selected]").length;
      for (const btn of alignBtns) btn.disabled = chosenCount < 2;
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
        refuse(action, `Refused: no component ${JSON.stringify(id)} on this canvas.`);
        return; // DOM untouched
      }
      // HOSTILE INPUT NEVER REACHES A PROPERTY. setPos coerces and clamps at the write, so this is
      // the one place the params are read and nothing here has to repeat the clamp — the caller's
      // numbers go in and setPos's ANSWER comes back, which is what the sentence below names.
      const p = action?.params || {};
      const now = boxOf(node);
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
      const at = setPos(node, p.x, p.y, p.w ?? now.w, (p.h ?? now.h) ?? undefined);
      history.push(snapshot());
      canvas.say(`${nameOf(node)} moved to ${Math.round(at.x)}, ${Math.round(at.y)}.`);
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
        refuse(action, `Refused: no component ${JSON.stringify(id)} on this canvas.`);
        return; // DOM untouched
      }
      // THE ONE REFUSAL THIS CONSUMER OWNS THAT ui.move's does not. Span attributes on a .stx-slot
      // would select nothing (system/studio.css scopes both tables to .stx-frame), so the action
      // would be a silent no-op wearing the shape of a success. Refused as CONTENT, never a throw —
      // action-bus.mjs:71-81 would turn a throw into a console line the reader never sees AND trip
      // studio-journey's no-page-errors contract.
      if (!isFrame(node)) {
        refuse(action, `Refused: ${nameOf(node)} is not resizable.`);
        return; // DOM untouched
      }
      // setPos coerces and clamps, so hostile params never reach a property; the position is the
      // node's own, because a resize moves nothing.
      const at = boxOf(node);
      const want = action?.params || {};
      // #230's adopt, for the source with no gesture behind it — the same call ui.move's consumer
      // makes, composing for the same reason: adopt fills MISSING ids only.
      history.adopt(snapshot());
      // IT DOES NOT CONSULT OCCUPANCY, exactly as the two consumers above do not. The gesture
      // enforced it during preview, and a refusal here would make an injected source:"agent" resize
      // behave differently from a pointer one — precisely the parity AC #3 turns on. The consequence,
      // stated rather than discovered: an injected resize CAN grow a frame over a peer's cells. That
      // is the caller's business, and no gesture and no replay can produce it.
      const sized = setPos(node, at.x, at.y, want.w ?? at.w, want.h ?? at.h ?? NODE_H);
      history.push(snapshot());
      canvas.say(`${nameOf(node)} resized to ${Math.round(sized.w)} by ${Math.round(sized.h)}.`);
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
        refuse(action, "Refused: that group move named no components.");
        return; // DOM untouched
      }
      const known = slots();
      const resolved = [];
      for (const move of moves) {
        const id = String(move?.id ?? "");
        const node = known.find((n) => idOf(n) === id);
        if (!node) {
          refuse(action, `Refused: no component ${JSON.stringify(id)} on this canvas.`);
          return; // DOM untouched — nothing has been applied yet
        }
        resolved.push({ node, want: move }); // setPos clamps at the write; nothing hostile reaches a property
      }
      // #230's adopt, for the source with no gesture behind it — the same call ui.move's consumer
      // makes, and it composes for the same reason: adopt fills MISSING ids only.
      history.adopt(snapshot());
      for (const r of resolved) {
        const was = boxOf(r.node);
        r.at = setPos(r.node, r.want.x, r.want.y, r.want.w ?? was.w, (r.want.h ?? was.h) ?? undefined);
      }
      history.push(snapshot()); // ONE entry, so ONE undo puts every member back
      const named = resolved.slice(0, SPOKEN_MAX)
        .map((r) => `${nameOf(r.node)} at ${Math.round(r.at.x)}, ${Math.round(r.at.y)}`)
        .join("; ");
      const rest = resolved.length - SPOKEN_MAX;
      canvas.say(rest > 0 ? `Moved: ${named}, and ${rest} more.` : `Moved: ${named}.`);
      syncControls();
    });

    // --- align and distribute (#302 Phase 5) ------------------------------------------------------
    // EIGHT VERBS, ZERO NEW WRITERS. Each one READS the selection, asks the pure alignMoves where
    // everything should go, and EMITS ui.move-group — so the one consumer that writes a position is
    // still the one consumer that writes a position, there is still one history entry per gesture,
    // and an injected agent align is byte-identically the same path as a keyboard one. Applying them
    // here would have been a second mover, which is the thing this module's header exists to forbid.
    //
    // ONE ANNOUNCEMENT, and it is the move-group consumer's. Align moves N nodes synchronously, and
    // a role="status" region announces only its FINAL textContent per task — writing N sentences in
    // one task announces the last and silently deletes the rest. This codebase has paid for that
    // twice (studio-compile.mjs's non-zero reduced-motion pause, replay-driver.mjs's drainActs), so
    // the verbs below say nothing themselves except when there is nothing to do.
    const offAlign = ALIGN_VERBS.map((verb) => bus.on(`ui.${verb}`, (action) => {
      const chosen = [...stage.querySelectorAll(".stx-slot[data-stx-selected]")];
      if (chosen.length < 2) {
        canvas.say(`Select two or more components to ${verb.startsWith("align") ? "align" : "distribute"} them.`);
        return; // DOM untouched
      }
      let boxes;
      try {
        boxes = chosen.map((n) => ({ id: idOf(n), ...measuredBoxOf(n) }));
      } catch (e) {
        refuse(action, `Refused: ${e.message}`); // said AND written to the ledger, never coerced — measuredBox (#437), refuse (#434)
        return; // DOM untouched
      }
      const moves = alignMoves(boxes, verb);
      if (!moves.length) {
        // A REAL ANSWER, not a failure: everything is already on the line. Said out loud for the
        // reason every blocked keypress used to be — a verb that does nothing and says nothing is
        // worse than no verb.
        canvas.say(`Already ${verb.startsWith("align") ? "aligned" : "distributed"}.`);
        return;
      }
      bus.emit({ type: "ui.move-group", source: action?.source ?? "keyboard", params: { moves } });
    }));

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
        .map((m) => (m.sizeOnly
          ? `${nameOf(m.node)} at ${Math.round(m.want.w)} by ${Math.round(m.want.h)}`
          : `${nameOf(m.node)} at ${Math.round(m.want.x)}, ${Math.round(m.want.y)}`))
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

    // The plain-data entry the pure layer takes, built in ONE place: guidesFor compares EDGES, so a
    // member handed no width aligns on its origin alone and the centre and trailing-edge guides
    // silently never fire for it.
    const memberEntry = (m) => ({ id: m.id, ...m.current });

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
          params: { w: gesture.currentSize.w, h: gesture.currentSize.h },
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
          params: { moves: gesture.members.map((m) => ({ id: m.id, x: m.current.x, y: m.current.y })) },
        });
        return;
      }
      const shape = shapeOf(gesture.node);
      bus.emit({
        type: "ui.move",
        source,
        target: { ...(shape ? { component: shape } : {}), id: gesture.id, label: nameOf(gesture.node) },
        params: { x: gesture.current.x, y: gesture.current.y },
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
    // the bottom-right one. `originSize` / `currentSize` are the two fields that do.
    const pickUp = (node, source, kind = "move") => {
      const origin = boxOf(node);
      // A frame being resized must have a height to change, and a board wrapper reached here would
      // have none — the ui.resize consumer refuses that case by name, and this is the gesture path's
      // own fallback rather than a second refusal.
      const size = { w: origin.w, h: origin.h ?? NODE_H };
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
        originSize: size,
        currentSize: size,
        members: carried.map((n) => {
          const b = boxOf(n);
          return { node: n, id: idOf(n), origin: b, current: b };
        }),
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
          canvas.say(`${nameOf(node)} ready to resize, ${Math.round(size.w)} by ${Math.round(size.h)}. Arrow keys to size it, Enter to finish, Escape to cancel.`);
        } else {
          canvas.say(gesture.members.length > 1
            ? `${gesture.members.length} components picked up at ${Math.round(origin.x)}, ${Math.round(origin.y)}. Arrow keys to move, Enter to drop, Escape to cancel.`
            : `${nameOf(node)} picked up at ${Math.round(origin.x)}, ${Math.round(origin.y)}. Arrow keys to move, Enter to drop, Escape to cancel.`);
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
      if (gesture.pending) preview(pointFor(gesture.pending));
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
        ? (gesture.currentSize.w !== gesture.originSize.w || gesture.currentSize.h !== gesture.originSize.h)
        : gesture.members.some((m) => m.current.x !== m.origin.x || m.current.y !== m.origin.y);
      if (moved) emitGesture(source);
      const g = clearGesture();
      if (!moved) {
        if (g.kind === "resize") {
          canvas.say(`${nameOf(g.node)} left at ${Math.round(g.originSize.w)} by ${Math.round(g.originSize.h)}.`);
        } else {
          canvas.say(g.members.length > 1
            ? `${g.members.length} components put down at ${Math.round(g.origin.x)}, ${Math.round(g.origin.y)}.`
            : `${nameOf(g.node)} put down at ${Math.round(g.origin.x)}, ${Math.round(g.origin.y)}.`);
        }
      }
    };

    // EVERY member goes back to its own origin, not the anchor's delta applied in reverse: the two
    // are the same for a rigid translation and differ the moment a future verb is not one, and this
    // is also the guard studio.mjs:467 leans on when a compile lands mid-carry (#251, now over N).
    const cancel = () => {
      if (!gesture) return;
      const g = gesture;
      if (g.kind === "resize") applyBox(g.node, { ...g.origin, ...g.originSize });
      else for (const m of g.members) applyBox(m.node, m.origin);
      clearGesture();
      if (g.kind === "resize") {
        canvas.say(`Cancelled, ${nameOf(g.node)} back at ${Math.round(g.originSize.w)} by ${Math.round(g.originSize.h)}.`);
        return;
      }
      canvas.say(g.members.length > 1
        ? `Cancelled, ${g.members.length} components back where they were.`
        : `Cancelled, ${nameOf(g.node)} back at ${Math.round(g.origin.x)}, ${Math.round(g.origin.y)}.`);
    };

    // --- geometry -------------------------------------------------------------------------------
    // THREE STEPS SINCE #302, not four, and no per-gesture measurement at all. The fourth step was a
    // hit-test against the stage's resolved grid track list, read once per gesture through
    // getComputedStyle — the synchronous layout read spike 2 measured as its pessimistic case, kept
    // off the move handler's frames by being hoisted rather than by being removed. There are no
    // tracks to read, so it is removed: this file now makes no getComputedStyle call on any path.
    //
    // THE PART MOST LIKELY TO BE SILENTLY WRONG is what remains. The stage's UNSCALED local space is
    // what every reader below works in; getting there from a pointer event is the rect, the scroll
    // offset and the scale divide, in that order. Miss the scroll offset and it is wrong the moment
    // the reader has panned; miss the divide and it is wrong at every scale but 1 — and BOTH look
    // fine at 100% scrolled to 0,0, which is where it will be tested first. studio-journey runs the
    // hit-test in three separate conditions for exactly that reason. The scroller's rect and scroll
    // offsets are read LIVE in the handler: they are cheap, and a momentum or keyboard scroll can
    // move them mid-gesture.
    // THE GRAB OFFSET, and it is the difference between picking a thing up and teleporting it.
    // preview() takes the ANCHOR'S DESTINATION ORIGIN, because that is what the keyboard path has —
    // a node and a step. A pointer has neither: it has a POINT, and the point is wherever inside the
    // node the reader happened to press. Handing that point to preview() directly moves the node's
    // TOP-LEFT to the cursor, so a node grabbed by its centre jumps half its own width and height
    // the instant the pointer moves one pixel.
    //
    // MEASURED, NOT REASONED ABOUT: a drag from a node's own centre to exactly one pitch below it
    // landed the node at 111, 198 rather than 0, 156 — off by half a node on each axis, which is
    // precisely NODE_W/2 and NODE_H/2. No pure gate can see it; the running driver's AC #1 identity
    // case is what caught it, and it caught it because the keyboard path and the pointer path are
    // asserted to reach the SAME place.
    //
    // Recorded at pick-up and subtracted at every preview, so the point under the reader's finger
    // stays under it for the whole gesture.
    const pointFor = (e) => {
      const at = pointOnStage(e);
      const off = gesture?.grabOffset ?? { x: 0, y: 0 };
      return { x: at.x - off.x, y: at.y - off.y };
    };

    const pointOnStage = (e) => {
      const r = scroll.getBoundingClientRect(); // live: a scroll can move mid-gesture
      const s = canvas.scale || 1;
      return {
        x: (e.clientX - r.left + scroll.scrollLeft) / s,
        y: (e.clientY - r.top + scroll.scrollTop) / s,
      };
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
    // `at` is the ANCHOR's destination and every member translates by the same delta. There is no
    // all-or-nothing rule any more: it existed because a destination could be OCCUPIED, and the
    // identity-with-the-input return was the only signal a partially-moved set could fail. Nothing
    // blocks a free move (D-d), so every member always moves and the only thing that stops one is
    // setPos's clamp at the stage edge — see preview() for what that means for a group.

    // The resize half of preview(), and the reason it is a private function rather than a second
    // entry point: `preview` keeps its NAME and its three call sites (the rAF callback, flushPreview
    // and the sticky-drop branch), so there is nothing to decide about which of them a resize goes
    // through. It sets a size from a desired BOTTOM-RIGHT corner and clamps it to the stage.
    //
    // NO PER-AXIS FALLBACK ANY MORE, and that is #302 removing a mechanism rather than dropping one.
    // It existed because an all-or-nothing OCCUPANCY test refused the growth a frame did have room
    // for whenever the other axis was blocked by a peer — on the shipped canvas the commonest
    // gesture on the commonest frame. Nothing blocks a free resize (D-d), so both axes always take
    // the reader's own request and the three candidates collapse to one.
    const applyPreviewSize = (want) => {
      const at = gesture.origin;
      const w = Math.max(MIN_SIZE, Math.min(Number(want.w) || MIN_SIZE, STAGE_W - at.x));
      const h = Math.max(MIN_SIZE, Math.min(Number(want.h) || MIN_SIZE, STAGE_H - at.y));
      if (w === gesture.currentSize.w && h === gesture.currentSize.h) return false;
      gesture.currentSize = { w, h };
      applyBox(gesture.node, { x: at.x, y: at.y, w, h });
      renderGuides();
      return true;
    };
    const previewSize = (corner) => applyPreviewSize({
      w: corner.x - gesture.origin.x,
      h: corner.y - gesture.origin.y,
    });
    // "The largest that fits" had exactly one honest definition under the grid — maximal AREA,
    // widest on a tie — and it needed OCCUPANCY, which is why it was a search over every candidate
    // span. Nothing blocks a free resize, so the largest that fits is simply the stage's remaining
    // room from the frame's own origin: one expression, no search.
    const largestSize = () => ({ w: STAGE_W - gesture.origin.x, h: STAGE_H - gesture.origin.y });

    const preview = (at) => {
      // ONE ENTRY POINT, TWO KINDS (#219). For a resize the argument is the desired BOTTOM-RIGHT
      // corner rather than a destination, which is what makes the pointer path free: the same
      // pointOnStage() chain feeds both.
      if (gesture.kind === "resize") return previewSize(at);
      // THE ANCHOR MOVES FIRST AND ITS REAL TRAVEL IS WHAT THE OTHERS FOLLOW (#302). The delta used
      // to be `at - gesture.current`, and `gesture.current` is read back off the anchor's LANDED
      // box — so the moment the anchor hit the stage edge and stopped, every later frame recomputed
      // the same negative delta from the clamped position and applied it AGAIN. A group dragged
      // downwards along the left edge did not deform, it SHEARED: the anchor stood still at x 0
      // while every other member slid left at ~34 px a frame until they stacked on top of it.
      // Measured on /factory: two selected blocks at 0 and 236 both ended at 0. #217's AC #2 — "the
      // selection keeps its shape" — was false on the shipped route for any drag that touched an
      // edge, and no pure gate can see it because every property written was individually correct.
      //
      // Anchor-driven removes the feedback loop entirely: the anchor is asked for `at`, setPos says
      // where it actually landed, and THAT travel is what the rest translate by. A clamped anchor
      // yields a zero delta, so the group stops as one — which is what the thing under the reader's
      // hand not moving should mean.
      //
      // MEMBERS STILL DEFORM AT THE EDGE, and that stays deliberate (D-d): setPos clamps each one
      // independently, so a member that reaches the edge stops while the others keep coming. The
      // alternative is refusing the whole gesture, which is the "blocked" behaviour #302 deleted.
      // What is gone is only the case where the ANCHOR's own clamp drove the deformation.
      if (at.x === gesture.current.x && at.y === gesture.current.y) return false;
      const anchorWas = boxOf(gesture.node);
      const anchorAt = applyBox(gesture.node, { x: at.x, y: at.y, w: anchorWas.w, h: anchorWas.h });
      const dx = anchorAt.x - anchorWas.x;
      const dy = anchorAt.y - anchorWas.y;
      for (const m of gesture.members) {
        if (m.node === gesture.node) {
          m.current = { x: anchorAt.x, y: anchorAt.y, w: anchorAt.w, h: anchorAt.h };
          continue;
        }
        if (!dx && !dy) continue;
        const want = { x: m.current.x + dx, y: m.current.y + dy, w: m.current.w, h: m.current.h };
        const landed = applyBox(m.node, want);
        m.current = { x: landed.x, y: landed.y, w: landed.w, h: landed.h };
      }
      // The anchor's own current is what every existing branch reads, so it is kept in step here
      // rather than recomputed at each reader. Read back off the ANCHOR's landed position, not by
      // adding the delta: at the stage edge the two differ, and the announcement names this one.
      gesture.current = { ...gesture.current, ...boxOf(gesture.node) };
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
        preview(pointFor(e));
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
      // WHERE INSIDE THE NODE THE PRESS LANDED, so the point under the finger stays under it.
      //
      // A RESIZE TAKES ONE TOO, and the comment here used to say it did not: "its argument is the
      // desired bottom-right CORNER, and the corner the reader is dragging is the cursor itself".
      // That is true of the corner and false of the CONTROL — the press lands on .stx-resize, whose
      // centre is inset from the corner it represents, so the first preview snapped the corner to
      // the cursor and the frame lost that inset on BOTH axes the instant the pointer moved. It is
      // 3f2b367's move teleport exactly, one gesture over: measured at 14px per axis on the
      // shipped frames, on a drag whose x never moved at all. A grid resize snapped to a track and
      // absorbed it unless the inset happened to cross a boundary; free sizes cannot.
      //
      // Measured from the CORNER for a resize and from the ORIGIN for a move, because those are the
      // two points their previews are expressed in. pointFor() subtracts whichever was recorded.
      const down = pointOnStage(e);
      g.grabOffset = g.kind === "resize"
        ? { x: down.x - (g.origin.x + g.currentSize.w), y: down.y - (g.origin.y + g.currentSize.h) }
        : { x: down.x - g.origin.x, y: down.y - g.origin.y };
      g.fromHandle = Boolean(handle);
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
        preview(pointFor(gesture.pending));
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
        ? (gesture.currentSize.w === gesture.originSize.w && gesture.currentSize.h === gesture.originSize.h)
        : (gesture.current.x === gesture.origin.x && gesture.current.y === gesture.origin.y);
      if (still && gesture.fromHandle) {
        // A CLICK on the handle, not a drag: stay picked up. This is SC 2.5.7's single-pointer
        // alternative — the reader moves the pointer with no button held and presses again to drop.
        // pointerId is cleared here so the implicit capture release below finds nothing of ours to
        // cancel; the move handler switches to the sticky branch for the same reason.
        gesture.sticky = true;
        gesture.pointerId = null;
        try { gesture.node.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        canvas.say(gesture.kind === "resize"
          ? `${nameOf(gesture.node)} ready to resize, ${Math.round(gesture.currentSize.w)} by ${Math.round(gesture.currentSize.h)}. Move the pointer and click to finish, or use the arrow keys; Escape cancels.`
          : (gesture.members.length > 1
            ? `${gesture.members.length} components picked up at ${Math.round(gesture.origin.x)}, ${Math.round(gesture.origin.y)}. Move the pointer and click to drop, or use the arrow keys; Escape cancels.`
            : `${nameOf(gesture.node)} picked up at ${Math.round(gesture.origin.x)}, ${Math.round(gesture.origin.y)}. Move the pointer and click to drop, or use the arrow keys; Escape cancels.`));
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
        pickUp(node, "keyboard", handle.classList.contains("stx-resize") ? "resize" : "move");
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
        if (e.key === "Home") {
          e.preventDefault();
          applyPreviewSize({ w: MIN_SIZE, h: MIN_SIZE });
        } else if (e.key === "End") {
          e.preventDefault();
          applyPreviewSize(largestSize());
        } else {
          const step = DIRS[e.key];
          if (!step) return; // not ours — let the page have the key
          e.preventDefault(); // or the scroller also scrolls
          // The arrows move the BOTTOM-RIGHT CORNER, which is the corner the pointer path drags.
          // See the move branch below: a bare arrow nudges, Shift takes a whole node.
          // The same two steps the move path takes, for the same reason: a resize is a placement
          // gesture too, and a frame's width is the kind of thing a reader wants to the pixel.
          const by = e.shiftKey ? [NODE_W + NODE_GAP, NODE_H + NODE_GAP] : [NUDGE_STEP, NUDGE_STEP];
          previewSize({
            x: gesture.origin.x + gesture.currentSize.w + step[0] * by[0],
            y: gesture.origin.y + gesture.currentSize.h + step[1] * by[1],
          });
        }
        // ANNOUNCED ON EVERY PRESS, and the size named is the one REACHED — D-d's rule, applied to
        // the resize path. There is no blocked variant any more because nothing blocks a free
        // resize: a press at the stage edge announces the same numbers twice, and that repetition is
        // the feedback a keyboard reader gets instead of a sentence about a state that no longer
        // exists.
        canvas.say(`${Math.round(gesture.currentSize.w)} by ${Math.round(gesture.currentSize.h)}.`);
        return;
      }

      const dir = DIRS[e.key];
      if (!dir) return; // not ours — let the page have the key
      e.preventDefault(); // or the scroller also scrolls

      // ONE RESOLVER, WHERE THERE WERE TWO (#302). The single-node path walked past an occupied
      // cell and the group path was all-or-nothing, and the whole reason they had to differ was
      // OCCUPANCY: skipping is right for one node and deforms a group, refusing is right for a group
      // and makes one node feel stuck. Nothing blocks a free move (D-d), so there is nothing to skip
      // and nothing to refuse, and the two collapse into preview()'s one translate-every-member.
      // The deep-equality case group 13 kept to catch a reuse of the wrong one went with them.
      //
      // TWO STEPS, AND THE SMALL ONE IS THE DEFAULT (#302 Phase 5.1). A bare arrow NUDGES by
      // NUDGE_STEP — the spacing scale's floor, 4px — because a carry is how a reader places a thing
      // exactly, and a keyboard path that could only move in node-sized jumps would be a worse tool
      // than the pointer rather than an equal one. SC 2.5.7 asks for an alternative, not a coarser
      // one.
      //
      // Shift gives the node pitch, so crossing the stage is a few presses rather than seven hundred.
      // That is the same distance studio-select.mjs's Shift+Arrow rectangle and the minimap's arrows
      // use, so "shift means a whole node" is one rule across three keyboard paths — and Shift is
      // free here because studio-select.mjs's own Shift+Arrow bails while a carry is live (:688).
      const step = e.shiftKey ? [NODE_W + NODE_GAP, NODE_H + NODE_GAP] : [NUDGE_STEP, NUDGE_STEP];
      preview({
        x: gesture.current.x + dir[0] * step[0],
        y: gesture.current.y + dir[1] * step[1],
      });
      // ANNOUNCED ON EVERY PRESS, and the position named is the one REACHED rather than the one
      // asked for (D-d). A keyboard user with no per-step feedback is flying blind for the whole
      // gesture; announcing unconditionally is also what makes the driver's exact N + 2 count
      // independent of which N it chose. There is no blocked variant: a press at the stage edge
      // announces the same numbers twice, which is the feedback.
      //
      // The group sentence NAMES THE COUNT rather than a component (R8): a whole-canvas selection
      // stopped by the edge is correct and would otherwise be silent about why.
      // T16's SENTENCE, and it is NEW VOCABULARY rather than an extension of anything: no
      // announcement in this repo used an ordinal or a pixel value before #302, because a grid
      // position was already the reader's coordinate. A free position is not, so the sentence says
      // both — WHERE the thing is in the reading order, which is what a person navigating the canvas
      // needs, and BY HOW MUCH the press moved it, which is what tells them the nudge landed.
      const n = gesture.members.length;
      const order = readingOrder(slots().map((node) => ({ id: idOf(node), ...boxOf(node) })));
      const place = order.indexOf(gesture.id) + 1;
      const by = `${Math.round(dir[0] * step[0])}, ${Math.round(dir[1] * step[1])}`;
      const at = `${Math.round(gesture.current.x)}, ${Math.round(gesture.current.y)}`;
      canvas.say(n > 1
        ? `${n} components moved by ${by}, anchor at ${at}.`
        : (place > 0 ? `Moved by ${by} to ${at}, ${place} of ${order.length}.` : `Moved by ${by} to ${at}.`));
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
        for (const off of offAlign) off();
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
