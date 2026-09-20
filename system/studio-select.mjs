// system/studio-select.mjs — hand-written canon (this repo; not generated). The studio canvas's
// SELECTION layer (epic #202 — docs/epics/prototype-studio.architecture.md §Key decisions
// "Module seams"; ticket #217; .claude/plans/studio-canvas-affordances-217.md).
//
// #204 shipped a stage that pans and zooms, #205 made ONE component movable. A reader who has used
// any design tool reaches immediately for a marquee, a group drag and a right-click. This file is
// the first two thirds of that: which components are chosen, by pointer and by keyboard, and the
// context menu that reaches every canvas verb without a shortcut. The GROUP MOVE itself belongs to
// system/studio-verbs.mjs, because a carry lives there — the split is stated below.
//
// The calls this file makes, recorded here so #221/#223 inherit rather than re-argue them:
//
//   1. THE SELECTION IS DOM STATE, NOT A MODULE Set. `data-stx-selected` on the .stx-slot wrapper,
//      `.is-selected` for the visual. studio-verbs.mjs reads it LIVE at pick-up; nothing is
//      mirrored, so there is no cross-module handle and no import cycle (verbs never imports this
//      file). It is studio.mjs:517-520's recorded reasoning — "a mirror here would be a second copy
//      of the arrangement that could disagree with the canvas the reader is looking at" — and it is
//      what makes adoptBoard's wrapper removal (studio.mjs:614) clear the selection for free.
//      No aria-selected: the wrappers carry no listbox or grid role, so it would be invalid. No
//      aria-pressed on the grab handle either, for studio-verbs.mjs:40-44's reason. The selection's
//      accessible signal is the live region's count sentence.
//   2. SELECTION IS NOT A BUS VERB; THE GROUP MOVE IS. The bus carries MODEL changes and a
//      selection is VIEW state — it is in no history entry, in no share payload (build-share.mjs's
//      `g` carries slots), in no export, and no replay op selects. `ui.select` would therefore be
//      one emitter and one consumer invented for symmetry inside a single module, which is exactly
//      what studio-flow.mjs's header declined for `ui.navigate`. Parity is enforced STRUCTURALLY
//      instead: both input paths call one internal applySelection(), and tooling/studio-journey.mjs
//      proves SET IDENTITY between them. What would change the call, so the next reader does not
//      have to guess: the day a replay op records a selection, or a second module needs to observe
//      one. The one bus verb this ticket adds is `ui.move-group`, and it lives with the mover.
//   3. THE MARQUEE SNAPS TO CELLS AND DRAWS NO RUBBER BAND. Its feedback IS the live .is-selected
//      outline on the cells it currently covers. A free-pixel band between grid lines would show a
//      region the grammar cannot hold — the same sentence AC #3 applies to a guide over an empty
//      column — and it would need a positioned overlay with a pixel style, near #171's stacking
//      hazard. Everything here renders through attributes on the existing grid, so this module
//      writes ZERO inline styles and joins build-checks group 7 with no exception argued.
//   4. THE KEYBOARD ANCHOR IS CAPTURED ONCE, NOT LOOKED UP PER PRESS. Shift+Arrow extends a
//      rectangle from an anchor to a moving cursor, and both are state in the mount: the anchor is
//      taken on the FIRST Shift+Arrow (from the focused wrapper) and survives every later press
//      until Escape, ⌘/Ctrl+A or a new marquee clears it. Re-deriving it from the focused wrapper
//      on each press re-anchors on the second one, so Shift+Right then Shift+Down selects a 1×2
//      instead of a 2×2 — and the driver's set-identity assertion against a pointer marquee, which
//      is AC #1's whole claim, would fail as what reads like a feature bug.
//
// TWO ACCESSIBILITY CRITERIA, AND ONLY ONE OF THEM IS THIS FILE'S DRAG. WCAG 2.2 SC 2.5.7 Dragging
// Movements requires a SINGLE-POINTER alternative to the marquee drag — that is the context menu's
// `Select this` / `Select all` items plus Shift-click, none of which drags. SC 2.1.1 Keyboard is
// what ⌘/Ctrl+A, Shift+Arrow and the Shift+F10 menu satisfy. Recorded which-is-which the way
// studio-verbs.mjs:33-38 does, because claiming a keyboard path for 2.5.7 would be a different
// criterion answered.
//
// ⌘/Ctrl+A IS FOCUS-SCOPED, and the bound is real rather than incidental: it is handled on
// .stx-scroll, where ⌘Z/⌘Y already live (studio-verbs.mjs:749-759), so it reaches the canvas only
// while the scroller or a descendant holds focus and is the browser's own document select-all
// everywhere else. That is also why `Select all` is a MENU ITEM: the criterion must not be
// satisfied only for readers who know the shortcut.
//
// THE REPLAY TAKE-OVER COUPLING, INHERITED AND NOT FIXED (replay-driver.mjs:744-748, :781-782). The
// driver registers its take-over listeners on canvas.scroll in the CAPTURE phase, so they fire
// before this module's stage listeners and no stopPropagation() here can suppress a handover — that
// is correct today BY THE DRIVER'S CAPTURE FLAG ALONE, and moving that listener to the bubble phase
// would silently stop a Shift-drag mid-replay from handing over while the driver kept authoring
// underneath the visitor. The driver's discriminator also returns early for `ctrlKey || metaKey`,
// so ⌘/Ctrl+A mid-replay SELECTS WITHOUT HANDING OVER, exactly as ⌘Z already does, while
// Shift+Arrow, Shift+F10 and every pointer press DO hand over. Do not "fix" that asymmetry here:
// the same line governs ⌘Z/⌘Y and its current set is gated by #209/#213's journey rows. Nothing is
// at risk (selecting changes nothing the driver writes, and the first actual move hands over); what
// is at risk is a future reader assuming symmetry, so studio-journey pins BOTH sides.
//
// Node-import safe: no DOM outside a function body and no self-boot, because tooling/build-checks.mjs
// imports this file directly for its pure exports (group 22). studio.html and system/studio.mjs
// mount it explicitly.

// The ticket's ONE new cross-module import, and it runs select → verbs only: the verbs read the
// selection off the DOM (call 1 above), so there is no cycle. SPOKEN_MAX is the live region's
// naming bound, IMPORTED rather than re-typed because a second copy of it is a thing that drifts.
// The canvas's own constants join it at #302: the stage box bounds the marquee, the node pitch is
// one keyboard step, and setPos places the menu — the same four values the canvas clamps against,
// read from the module that owns them rather than re-derived here.
import { DIRS, SPOKEN_MAX } from "./studio-verbs.mjs";
import { NODE_GAP, NODE_H, NODE_W, STAGE_H, STAGE_W, setPos } from "./studio-canvas.mjs";

// ---- the pure layer ----------------------------------------------------------------------------
// Everything below takes plain data and returns plain data, so build-checks group 22 drives it in CI
// with no browser — the same split studio-canvas.mjs:34-73 and studio-verbs.mjs:60-62 carry.

// The menu's item vocabulary. FROZEN, and both levels of it: a menu whose labels a later edit could
// mutate at runtime is a menu whose two open paths could disagree, which is the one property AC #4
// turns on. The contextual pair is declared beside the unconditional four rather than inside
// menuItems(), so the whole vocabulary is one readable list.
//
// EVERY ITEM IS A REAL VERB. There is deliberately no delete, duplicate or z-order item: the pattern
// grammar has none, and a menu item that always refuses is a lie about capability rather than an
// honest refusal. (A refusal is content when the verb exists and this input fails; it is a fake when
// the verb does not exist at all.)
export const MENU_SELECT = Object.freeze({ id: "select", label: "Select this" });
export const MENU_DESELECT = Object.freeze({ id: "deselect", label: "Deselect this" });
export const MENU_ITEMS = Object.freeze([
  Object.freeze({ id: "select-all", label: "Select all" }),
  Object.freeze({ id: "clear", label: "Clear selection" }),
  Object.freeze({ id: "undo", label: "Undo" }),
  Object.freeze({ id: "redo", label: "Redo" }),
]);

const item = (id) => MENU_ITEMS.find((i) => i.id === id);

// The ordered items for ONE node's menu. Pure, which is what lets the driver assert the
// pointer-opened and keyboard-opened menus against ONE source rather than against each other —
// comparing them to each other passes happily when both are wrong in the same way.
//
// `Select this` and `Deselect this` are exclusive, never both: the item names what activating it
// will do, and offering both makes the reader guess which one describes the current state.
// Destructured in the BODY, not the signature: a default parameter covers `undefined` and not
// `null`, and every export here is total over junk by contract (pointOf below carries the same fix
// for the coercion).
export function menuItems(state) {
  const { selected, anySelected, canUndo, canRedo } = state && typeof state === "object" ? state : {};
  const out = [selected ? MENU_DESELECT : MENU_SELECT, item("select-all")];
  // Present only when there IS a selection to clear — the one conditional item, and it is
  // conditional rather than disabled because "Clear selection" on an empty canvas is not a verb
  // whose moment has not come, it is a verb with nothing to act on.
  if (anySelected) out.push(item("clear"));
  out.push({ ...item("undo"), disabled: !canUndo }, { ...item("redo"), disabled: !canRedo });
  return out;
}

// A POINT ON THE STAGE, coerced and clamped once (#302). Until the grid was retired this was
// the canvas's slot clamp over a {col,row}; the shape changed and the posture did not — a null
// destructures and throws, every entry point here is total over junk by contract, so the coercion
// happens once rather
// than at four call sites that would each have to remember it. Clamped to the stage because that is
// the only bound left, and because a marquee corner outside it would select by a rule the reader
// cannot see.
const pointOf = (v) => {
  const o = v && typeof v === "object" ? v : {};
  const axis = (n, max) => {
    const x = Number(n);
    return Number.isFinite(x) ? Math.min(max, Math.max(0, x)) : 0;
  };
  return { x: axis(o.x, STAGE_W), y: axis(o.y, STAGE_H) };
};

// Two points in the stage's unscaled space → the rectangle between them, normalized (either drag
// direction gives the same range) and clamped through pointOf so "on the stage" keeps its ONE
// definition. The rectangle is in PIXELS now, not cells, and it is left/top/right/bottom rather than
// col1/row1/col2/row2 — the old names meant grid lines and would read as cells to the next person.
export function marqueeRange(a, b) {
  const p = pointOf(a);
  const q = pointOf(b);
  return {
    left: Math.min(p.x, q.x),
    top: Math.min(p.y, q.y),
    right: Math.max(p.x, q.x),
    bottom: Math.max(p.y, q.y),
  };
}

// Every id inside the inclusive range, IN THE ORDER GIVEN — which on the running page is DOM order,
// the studio's standing correspondence with board order (studio.mjs:510-516). Total over junk: a
// missing range or a slot list of nonsense answers [], never a throw.
// A NODE IS IN RANGE WHEN ITS BOX OVERLAPS THE RECTANGLE, not when its origin is inside it, and
// that is the one real change of meaning (#302). A cell either was or was not in the rectangle; a
// free-positioned node has extent, and a marquee dragged across the middle of a wide node that
// touches neither of its corners has to select it — anything else is a rule the reader cannot see.
// Overlap is inclusive on all four edges, exactly as the cell rectangle was.
export function idsInRange(nodes, range) {
  const r = range && typeof range === "object" ? range : null;
  if (!r || !Array.isArray(nodes)) return [];
  const out = [];
  for (const s of nodes) {
    if (!s || s.id == null) continue;
    const x = Number(s.x);
    const y = Number(s.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    // A node with no declared size is a point — the honest reading of "I was not told how big this
    // is", and it makes the answer identical to the old one for a zero-extent node.
    const w = Number.isFinite(Number(s.w)) ? Number(s.w) : 0;
    const h = Number.isFinite(Number(s.h)) ? Number(s.h) : 0;
    if (x <= r.right && x + w >= r.left && y <= r.bottom && y + h >= r.top) out.push(s.id);
  }
  return out;
}

// The point the menu is placed at, plus the two booleans saying it must open LEFTWARDS / UPWARDS
// because there is not a menu's width of stage left to its right or below it.
//
// WITHOUT THIS a menu opened near the far edge renders past it, outside the scrollable area, where
// the reader who just right-clicked cannot see it and cannot scroll to it. The flip is still two
// attribute selectors in studio.css rather than a measured offset, which is what keeps the menu out
// of setPos's budget entirely — it is chrome positioned relative to its own anchor, not a node.
//
// THE THRESHOLD IS A MENU'S WORTH OF ROOM (#302), not "the last column". Under the grid the last
// column WAS the threshold and the boundary was >=, so group 22 asserted both sides of it. Free
// positions have no last column, so the honest question is whether the menu fits, and MENU_W/MENU_H
// are that question's terms. Both sides are still asserted, for the same reason: an off-by-one here
// is invisible everywhere except at the edge.
export const MENU_W = NODE_W;
export const MENU_H = NODE_H;
export function menuAnchor(x, y, stageW = STAGE_W, stageH = STAGE_H) {
  const bound = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
  const sw = bound(stageW, STAGE_W);
  const sh = bound(stageH, STAGE_H);
  const at = pointOf({ x, y });
  return {
    x: Math.min(at.x, sw),
    y: Math.min(at.y, sh),
    flipX: at.x + MENU_W > sw,
    flipY: at.y + MENU_H > sh,
  };
}

// One Shift+Arrow press: step the CURSOR one node pitch in `dir` and return the rectangle from the
// (unmoving) ANCHOR to it. The cursor is clamped to the stage and NEVER SKIPS WHAT IS IN THE WAY — a
// selection rectangle includes what it covers, which is the opposite of a carry's rule, and is why
// this is its own function rather than a call into the mover.
//
// IT REPLACES, IT DOES NOT UNION, and that is a decision rather than an omission. The rectangle from
// anchor to cursor becomes the WHOLE selection, so a stray Shift-click from an earlier interaction
// is discarded. Chosen over a union because it makes AC #1's identity claim — "an equivalent
// keyboard path selects the same set" — hold UNCONDITIONALLY rather than only from a cleared start:
// the marquee also replaces (Shift is the marquee's own trigger, so there is no plain-drag marquee
// for it to add to), and two verbs that both replace are two verbs a reader can predict. Shift-click
// stays the additive path — that is what it is for. The announcement is the resulting count, which
// is honest about the discard without narrating it.
export function extendSelection(anchor, cursor, dir) {
  const a = pointOf(anchor);
  const from = pointOf(cursor == null ? anchor : cursor);
  if (!Array.isArray(dir) || dir.length !== 2) return { cursor: from, range: marqueeRange(a, from) };
  const dc = Number(dir[0]);
  const dr = Number(dir[1]);
  // A non-finite direction answers the cursor it was handed rather than letting NaN reach the
  // coercion, which would silently answer the origin — a jump, not a refusal.
  if (!Number.isFinite(dc) || !Number.isFinite(dr)) return { cursor: from, range: marqueeRange(a, from) };
  // ONE STEP IS ONE NODE PITCH (#302). A cell step was a unit because a cell was the unit; the
  // keyboard now needs a distance, and the node pitch is the one distance on this stage that means
  // something to a reader — it is exactly what the rank layout puts between two nodes, so a press
  // moves the cursor from one to the next rather than by a number nobody chose.
  const next = pointOf({ x: from.x + dc * (NODE_W + NODE_GAP), y: from.y + dr * (NODE_H + NODE_GAP) });
  return { cursor: next, range: marqueeRange(a, next) };
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (studio-canvas.mjs:80,
// studio-verbs.mjs:216, device-frame.mjs:33). Every node is built element by element — group 7 bans
// every markup-from-string sink across these modules, which is why a hostile component label can
// never become markup anywhere in the studio, the context menu's contextual item included.
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

// The two sentences an EMPTY selection can produce, and they are not one sentence with two callers:
// a marquee that caught nothing never had a selection to clear, and "Selection cleared." after
// dragging over empty canvas describes an event that did not happen.
const NOTHING = "Nothing to select.";
const CLEARED = "Selection cleared.";

let live = null; // the mounted selection layer — the exported seam below drives THIS one

// The driver's seam (bus-toggles.mjs:70's idiom, and the reason it is an export rather than a
// window.__ global: page globals are not this repo's test surface).
export const getSelect = () => live;

export function mountCanvasSelect(canvas, { bus } = {}) {
  const viewport = canvas && canvas.viewport;
  try {
    // Validated at the boundary, throwing a plain Error naming what is missing — the project
    // convention (studio-verbs.mjs:243-249). studio.html's try/catch renders these as "Refused: …".
    if (!canvas || !canvas.stage || !canvas.scroll || typeof canvas.say !== "function") {
      throw new Error("studio-select: a mounted canvas handle { stage, scroll, say } is required");
    }
    if (!bus || typeof bus.emit !== "function") {
      throw new Error("studio-select: an action bus { emit } is required");
    }

    const { stage, scroll } = canvas;

    // The keyboard rectangle's two corners. THE ANCHOR IS CAPTURED ONCE (call 4 in the header) and
    // survives every later Shift+Arrow; only Escape, ⌘/Ctrl+A, a marquee, a Shift-click or a menu
    // verb resets it. Re-deriving it per press re-anchors on the second one, turning a 2×2 into a
    // 1×2 — which fails AC #1's identity assertion looking exactly like a feature bug.
    let anchor = null;
    let cursor = null;
    let marquee = null;
    let menu = null;

    // --- reading the stage ----------------------------------------------------------------------
    // DOM in, plain data out — and READ LIVE, never mirrored. The selection lives on the wrappers
    // (call 1), so a board redraft that removes them (studio.mjs:614) clears it for free and there
    // is no second copy to disagree with the canvas the reader is looking at.
    const slots = () => [...stage.querySelectorAll(".stx-slot")];
    const idOf = (node) => node.getAttribute("data-stx-id");
    const nameOf = (node) => node.getAttribute("data-stx-name") || "Component";
    // The node's BOX in the stage's unscaled space, read off the four custom properties setPos
    // writes. parseFloat drops the "px" and answers NaN for an unwritten property, which pointOf and
    // idsInRange both coerce — so a node placed before the module booted reads as a point at the
    // origin rather than crashing the marquee.
    // THE MEASURED HEIGHT WHEN NONE IS AUTHORED (#302), and it is the difference between a working
    // marquee and one that selects nothing. idsInRange asks whether a node's BOX overlaps the
    // rectangle — its own comment says a rule the reader cannot see is the thing to avoid — and a
    // board wrapper carries no --h at all, so `prop("--h") || 0` made every block on /factory a
    // zero-height LINE at its own top edge. Two consequences, both measured on the running page:
    // a marquee dragged straight across all four blocks selected none of them, and the only
    // rectangle that could have caught them needed a top edge of exactly 0, which a pointer cannot
    // reach through the scroller's 1px border. #217's AC #1 was dead on the shipped route.
    //
    // NOT the same question studio-verbs.mjs's boxOf answers, which is why the two differ and both
    // are right. That one feeds the SNAPSHOT, where `h: null` means "this node has never carried a
    // height" and inventing one would claim a property in a structure two drivers deep-compare.
    // This one feeds a HIT TEST, where the honest extent is what the node actually occupies.
    const boxOf = (node) => {
      const prop = (name) => parseFloat(node.style.getPropertyValue(name));
      const h = prop("--h");
      return {
        id: idOf(node),
        x: prop("--x") || 0,
        y: prop("--y") || 0,
        w: prop("--w") || node.offsetWidth || 0,
        h: (Number.isFinite(h) ? h : node.offsetHeight) || 0,
      };
    };
    const chosenNodes = () => [...stage.querySelectorAll(".stx-slot[data-stx-selected]")];
    const chosenIds = () => chosenNodes().map(idOf);
    // A LIVE CARRY OWNS THE CANVAS, and it is detected off the DOM for the same reason the selection
    // is carried there: .is-picked is studio-verbs.mjs's own visual state, so this needs no handle
    // into that module and cannot go stale. Nothing here starts while a component is in the
    // reader's hand — a marquee would eat the sticky drop, and a menu mid-carry offers verbs that
    // contradict the gesture in progress.
    // WIDENED AT #219 to any picked node, not just a board wrapper: a device frame being moved or
    // resized is just as live a carry, and a marquee started mid-resize would eat its sticky drop.
    // `.is-picked` only ever appears on a movable wrapper (studio-verbs.mjs's pickUp writes it), so
    // the narrower selector bought nothing and cost this case. Note what did NOT widen and must not:
    // chosenNodes() above stays `.stx-slot`-scoped, which is the line that keeps a frame out of the
    // selection whole rather than half in it (system/studio-frames.mjs's header).
    const carrying = () => Boolean(stage.querySelector(".is-picked"));

    const resetAnchor = () => { anchor = null; cursor = null; };

    // --- THE ONE PLACE THE SELECTION IS WRITTEN ---------------------------------------------------
    // Both input paths — every pointer path and every keyboard path — come through here. That is
    // what replaces the bus's structural parity guarantee for a verb that is deliberately not on the
    // bus (call 2), and it is why tooling/studio-journey.mjs can assert SET IDENTITY between them
    // and be asserting a wiring rather than a coincidence.
    //
    // `say` is a parameter and not a second function: a marquee writes the selection on every
    // rAF-throttled frame and must announce ONCE, on release (D12's contract table), so the live
    // frames pass say:false and the release announces. Splitting it into a silent writer and a
    // speaking wrapper would give the two paths two entry points, which is the property this
    // function exists to have.
    const applySelection = (ids, { say = true, empty = CLEARED } = {}) => {
      const want = new Set(Array.isArray(ids) ? ids : []);
      const chosen = [];
      for (const node of slots()) {
        const on = want.has(idOf(node));
        node.toggleAttribute("data-stx-selected", on);
        node.classList.toggle("is-selected", on);
        if (on) chosen.push(node);
      }
      if (!say) return chosen;
      if (!chosen.length) { canvas.say(empty); return chosen; }
      // The same SPOKEN_MAX shape restoreVerb uses, with the cap IMPORTED rather than re-typed: a
      // live region is spoken end to end, so past the bound the count is the useful part.
      const named = chosen.slice(0, SPOKEN_MAX).map(nameOf).join(", ");
      const rest = chosen.length - SPOKEN_MAX;
      canvas.say(rest > 0
        ? `${chosen.length} selected: ${named}, and ${rest} more.`
        : `${chosen.length} selected: ${named}.`);
      return chosen;
    };

    // --- geometry: a client point → the stage's unscaled space ------------------------------------
    // THREE STEPS SINCE #302, not four. The grid's track-list read is gone — there are no tracks to
    // parse, so there is no getComputedStyle in this chain at all, which removes the synchronous
    // layout read spike 2 measured as its pessimistic case rather than merely hoisting it out of the
    // move handler. The scroller's rect and scroll offsets are still read LIVE: they are cheap, and
    // a momentum scroll can move them mid-marquee.
    //
    // Miss the scroll offset and it is wrong the moment the reader has panned; miss the scale divide
    // and it is wrong at every scale but 1 — and BOTH look fine at 100% scrolled to 0,0, which is
    // where it gets tested first. studio-journey runs the hit-test in three conditions for that
    // reason, and the marquee joins them.
    const pointOnStage = (e) => {
      const r = scroll.getBoundingClientRect();
      const s = canvas.scale || 1;
      return {
        x: (e.clientX - r.left + scroll.scrollLeft) / s,
        y: (e.clientY - r.top + scroll.scrollTop) / s,
      };
    };

    const ac = new AbortController();
    const { signal } = ac;

    // --- the context menu -------------------------------------------------------------------------
    const menuItemNodes = () => (menu ? [...menu.el.querySelectorAll(".stx-menu-item")] : []);

    // preventScroll ON EVERY FOCUS CALL IN THE MENU, and it is load-bearing rather than polite: the
    // menu is a child of the scrolling stage, so a plain .focus() can scroll the scroller — which
    // would fire the scroll listener that CLOSES the menu, on the very frame it opened. With it,
    // every scroll the listener sees is genuinely the reader's.
    const focusItem = (index) => {
      const items = menuItemNodes();
      if (!items.length) return;
      const i = (index + items.length) % items.length;
      for (const [j, item] of items.entries()) item.tabIndex = j === i ? 0 : -1; // APG roving tabindex
      items[i].focus({ preventScroll: true });
    };

    const closeMenu = ({ restoreFocus = true } = {}) => {
      if (!menu) return;
      const { el: node, invoker } = menu;
      menu = null;
      node.remove();
      // FOCUS RETURNS TO THE INVOKER (APG). Without it a keyboard reader who pressed Escape is left
      // on <body>, at the top of the tab order, several stops from the component they were working
      // on — which is the failure mode a menu with no focus management always has.
      if (restoreFocus && invoker && invoker.isConnected) invoker.focus({ preventScroll: true });
    };

    const runItem = (id, node, detail) => {
      const source = detail === 0 ? "keyboard" : "pointer"; // agentic-renderer.mjs:208's idiom
      const id0 = idOf(node);
      resetAnchor();
      if (id === "select") applySelection([...chosenIds(), id0]);
      else if (id === "deselect") applySelection(chosenIds().filter((x) => x !== id0));
      else if (id === "select-all") applySelection(slots().map(idOf));
      else if (id === "clear") applySelection([]);
      // Undo and Redo EMIT and do nothing else — studio-verbs.mjs's existing consumers apply them,
      // so the menu is a third emitter of an existing verb rather than a second implementation of
      // one. It is also why this module mounts AFTER the verbs: the consumers must exist by the
      // time a menu can first emit.
      else if (id === "undo" || id === "redo") bus.emit({ type: `ui.${id}`, source });
      closeMenu();
    };

    // WHERE FOCUS GOES BACK TO, resolved HERE rather than at each call site so all three callers get
    // it — the `contextmenu` handler (whose `|| node` fallback is every right-click that misses the
    // 24×24 corner handle, i.e. nearly all of them), the keydown handler, and tooling's
    // openMenu(node, node). A `.stx-slot` wrapper carries NO tabindex (studio-canvas.mjs:307-338
    // gives it a `.stx-grab` button and the component, and nothing else focusable), so an invoker
    // that IS the wrapper makes closeMenu()'s focus() a silent no-op and drops the reader on <body>
    // — the failure the APG note at :362 exists to prevent, arriving through the pointer path.
    //
    // `tabIndex >= 0` OR `=== activeElement`, and the second half is load-bearing rather than belt
    // and braces: after a compile, studio-flow.mjs's screen headings are `tabindex="-1"` elements
    // living INSIDE these wrappers, and Shift+F10 on a focused heading must return the reader to
    // that heading, not to the wrapper's grab handle. A bare `tabIndex >= 0` test would quietly
    // regress the keyboard path to fix the pointer one. openMenu is called synchronously from both
    // handlers, so activeElement is still the pre-menu focus when this reads it.
    const focusTargetFor = (node, invoker) => {
      const ok = invoker && invoker.isConnected
        && (invoker.tabIndex >= 0 || invoker === document.activeElement);
      return ok ? invoker : (node?.querySelector(":scope > .stx-grab") || node);
    };

    const openMenu = (node, rawInvoker) => {
      const invoker = focusTargetFor(node, rawInvoker);
      // IDEMPOTENT (the belt-and-braces guard). Several engines synthesise a `contextmenu` event for
      // Shift+F10 and the ContextMenu key IN ADDITION to delivering the keydown, so both handlers
      // can fire for one press; re-opening on the same invoker is a no-op rather than a menu that
      // flickers or loses its focus. Compared on the RESOLVED invoker, which also collapses the case
      // where an engine retargets its synthesised `contextmenu` to the wrapper while the keydown
      // gives the handle: two raw invokers, one focus target, so the guard still holds.
      if (menu && menu.invoker === invoker) return;
      closeMenu({ restoreFocus: false });
      if (carrying()) return; // a live carry owns the canvas
      const box = boxOf(node);
      const at = menuAnchor(box.x, box.y);
      const verb = (which) => viewport?.querySelector(`[data-stx-verb="${which}"]`);
      const list = el("div", {
        class: "stx-menu",
        role: "menu",
        "aria-label": `Actions for ${nameOf(node)}`,
        "data-flip-x": at.flipX || null,
        "data-flip-y": at.flipY || null,
      });
      // The menu is a NODE ON THE STAGE, so it is positioned the way every other node is — through
      // setPos, which is what keeps the write count at group 7's budget. It carries no --h: its
      // height is its items'.
      setPos(list, at.x, at.y, MENU_W);
      // ONE SOURCE FOR BOTH OPEN PATHS. The pure menuItems() decides what a menu holds, so the
      // pointer-opened and keyboard-opened lists are identical by construction rather than by two
      // builders that agree today — which is what makes AC #4's "identical items" checkable.
      for (const item of menuItems({
        selected: node.hasAttribute("data-stx-selected"),
        anySelected: chosenNodes().length > 0,
        // Read off the buttons, which ARE the live display of the history's answer (#217's
        // data-stx-verb seam). Absent buttons — a canvas mounted without the verbs — read as
        // disabled, which is the honest answer rather than an offer nothing can fulfil.
        canUndo: Boolean(verb("undo")) && !verb("undo").disabled,
        canRedo: Boolean(verb("redo")) && !verb("redo").disabled,
      })) {
        // aria-disabled, NOT the `disabled` ATTRIBUTE, and the difference is the whole of APG's
        // advice here: a disabled <button> cannot take focus, so End would skip straight past a
        // trailing Undo/Redo pair and a keyboard reader would never learn the items exist. With
        // aria-disabled every item is reachable and announced as unavailable, and runItem() is what
        // refuses to act on one. Caught by the driver's Home/End row, where `End` landed on the
        // first item because the last two could not be focused.
        list.appendChild(el("button", {
          type: "button",
          class: "stx-menu-item",
          role: "menuitem",
          tabindex: "-1",
          "data-stx-item": item.id,
          "aria-disabled": item.disabled ? "true" : null,
          text: item.label,
        }));
      }
      // A STAGE SIBLING, never a wrapper child: .stx-slot { overflow: hidden } (studio.css:90) would
      // clip it, and that rule is load-bearing for the compiled screens.
      stage.appendChild(list);
      menu = { el: list, invoker, node }; // already resolved + connectedness-checked by focusTargetFor
      focusItem(0);
    };

    // --- pointer: the marquee and the Shift-click toggle -------------------------------------------
    // REGISTERED IN THE CAPTURE PHASE ON THE STAGE, so it beats studio-verbs.mjs's bubble listener
    // regardless of mount order and neither the mover nor studio-canvas.mjs's ancestor pan handler
    // ever sees a Shift press. (For a press whose target IS the stage the two would run in
    // registration order anyway, because the verbs bail on `!closest(".stx-slot")` — the capture
    // flag is what makes the ON-A-SLOT case order-independent.)
    //
    // IT DOES NOT SUPPRESS THE REPLAY TAKE-OVER, and that is true only because the driver captures
    // on canvas.scroll — an ANCESTOR — so its listener has already run (replay-driver.mjs:781-782,
    // and the header records what breaks if that ever moves to the bubble phase).
    // ONE PRESS, TWO VERBS, AND THE DRAG IS WHAT SEPARATES THEM. A Shift-press that never leaves its
    // origin CELL is a Shift-CLICK (toggle this component's membership — the additive path, and what
    // makes extendSelection free to replace); a Shift-press that crosses into another cell is a
    // MARQUEE. Deciding on the press target instead — "on a slot means toggle" — is what this
    // handler did first, and it is wrong on the canvas that matters: on a stage packed with
    // components almost every cell is occupied, so a marquee could only ever be started from the
    // empty margin. Caught by driving the real harness, where a Shift-drag across a 2×2 selected
    // exactly one component.
    //
    // THE THRESHOLD IS A DRAG DISTANCE (#302). Under the grid it was a CELL CROSSING — the smallest
    // change a marquee could express, and it needed no literal. Free positions have no cell, so the
    // smallest expressible change is a pixel, and a one-pixel tremor between pointerdown and
    // pointerup would turn every click into a drag. DRAG_SLOP is the literal that replaces the cell,
    // and it is stated rather than hidden: 4 px is the usual platform threshold and is well under
    // the 24 px minimum target size, so it cannot swallow a deliberate small marquee.
    const DRAG_SLOP = 4;
    const paintMarquee = (m, e) => {
      const at = pointOnStage(e);
      if (!m.dragged) {
        if (Math.abs(at.x - m.origin.x) < DRAG_SLOP && Math.abs(at.y - m.origin.y) < DRAG_SLOP) return null; // still a click
        m.dragged = true;
      }
      return applySelection(idsInRange(slots().map(boxOf), marqueeRange(m.origin, at)), { say: false });
    };

    stage.addEventListener("pointerdown", (e) => {
      if (!e.shiftKey || e.button !== 0 || e.pointerType === "touch") return; // the PRD's touch non-goal
      if (carrying()) return; // let the verbs finish the carry — do not eat its sticky drop
      e.stopPropagation();
      e.preventDefault(); // no text selection under the drag, and no native context menu path
      resetAnchor();
      // NOTHING IS WRITTEN YET. Until the pointer moves past DRAG_SLOP this press is still a click,
      // and repainting the selection here would make a plain Shift-click briefly replace the set it
      // is supposed to add to.
      marquee = {
        pointerId: e.pointerId,
        origin: pointOnStage(e),
        before: chosenIds(),
        node: e.target.closest?.(".stx-slot") || null,
        dragged: false,
        raf: 0,
        pending: null,
      };
      try { stage.setPointerCapture(e.pointerId); } catch { /* capture unavailable — the move listener still tracks */ }
    }, { capture: true, signal });

    stage.addEventListener("pointermove", (e) => {
      if (!marquee || marquee.pointerId !== e.pointerId) return;
      // THE FIREFOX BUG, THIRD OCCURRENCE (studio-canvas.mjs:243-253, device-frame.mjs:137-152):
      // once a captured pointer leaves the window firefox keeps delivering pointermove with
      // clientX 0 and buttons 0. Without this the marquee sticks and every later move re-selects.
      if ((e.buttons & 1) === 0) { endMarquee(true); return; }
      marquee.pending = e;
      if (marquee.raf) return; // rAF-throttled, like the carry's preview
      marquee.raf = requestAnimationFrame(() => {
        if (!marquee) return;
        marquee.raf = 0;
        paintMarquee(marquee, marquee.pending);
      });
    }, { signal });

    // `restore` is the cancel path: a pointercancel or a lost capture puts the reader's PRE-marquee
    // selection back, because a marquee that was interrupted never happened.
    function endMarquee(restore) {
      if (!marquee) return;
      const m = marquee;
      marquee = null;
      if (m.raf) cancelAnimationFrame(m.raf);
      try { stage.releasePointerCapture(m.pointerId); } catch { /* already released */ }
      if (restore) { applySelection(m.before, { say: false }); return; }
      // THE QUEUED FRAME IS FLUSHED BEFORE THE STILL-THERE TEST, which is R3's lesson borrowed from
      // the carry (studio-verbs.mjs:502-518): the last pointermove of a quick drag is often still
      // pending on release, and reading `dragged` before flushing it makes a fast marquee read as a
      // click. Same bug, same engine order — webkit's rAF flushes last.
      if (m.pending) paintMarquee(m, m.pending);
      if (!m.dragged) {
        // A SHIFT-CLICK. On empty canvas it is deliberately nothing at all — no change and no
        // sentence, because "Nothing to select." would describe an event that did not happen.
        if (!m.node || !stage.contains(m.node)) return;
        const id = idOf(m.node);
        applySelection(m.before.includes(id) ? m.before.filter((x) => x !== id) : [...m.before, id]);
        return;
      }
      // ANNOUNCED ONCE, HERE, at the end of the whole drag (D12): the reader was watching their own
      // hand, and a sentence per crossed cell is the same defect as a history entry per crossed cell.
      // The empty answer is "Nothing to select." and not "Selection cleared." — a marquee that
      // caught nothing never had a selection to clear.
      applySelection(chosenIds(), { empty: NOTHING });
    }

    stage.addEventListener("pointerup", (e) => {
      if (!marquee || marquee.pointerId !== e.pointerId) return;
      endMarquee(false);
    }, { signal });
    stage.addEventListener("pointercancel", (e) => {
      if (!marquee || marquee.pointerId !== e.pointerId) return;
      endMarquee(true);
    }, { signal });
    stage.addEventListener("lostpointercapture", (e) => {
      if (!marquee || marquee.pointerId !== e.pointerId) return;
      endMarquee(true);
    }, { signal });

    // --- the menu's two open paths ------------------------------------------------------------------
    // The `contextmenu` event covers the pointer open on every engine.
    stage.addEventListener("contextmenu", (e) => {
      const node = e.target.closest?.(".stx-slot");
      if (!node || !stage.contains(node)) return;
      e.preventDefault();
      openMenu(node, e.target.closest?.(".stx-grab") || node);
    }, { signal });

    // THE KEYDOWN BRANCH IS A PRIMARY PATH, NOT A FALLBACK. Several engines also synthesise
    // `contextmenu` for these two keys, which is exactly why openMenu is idempotent — writing this
    // from the start and guarding the overlap is cheaper than discovering a webkit gap after both
    // modules are written, when the fix would be a new code path rather than a tweak.
    stage.addEventListener("keydown", (e) => {
      if (menu && menu.el.contains(e.target)) return; // the menu's own keys are handled below
      if (!((e.shiftKey && e.key === "F10") || e.key === "ContextMenu")) return;
      const node = e.target.closest?.(".stx-slot");
      if (!node || !stage.contains(node)) return;
      e.preventDefault();
      openMenu(node, e.target);
    }, { signal });

    // The menu's OWN keyboard: WAI-ARIA APG's menu pattern — Arrow wrap, Home/End, Escape closes and
    // returns focus, Tab closes (a menu is not a tab stop the reader walks past).
    stage.addEventListener("keydown", (e) => {
      if (!menu || !menu.el.contains(e.target)) return;
      const items = menuItemNodes();
      const at = items.indexOf(e.target);
      if (e.key === "ArrowDown") { e.preventDefault(); focusItem(at + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(at - 1); }
      else if (e.key === "Home") { e.preventDefault(); focusItem(0); }
      else if (e.key === "End") { e.preventDefault(); focusItem(items.length - 1); }
      // THIS ESCAPE BRANCH IS CURRENTLY UNREACHABLE, and it is kept rather than deleted because
      // what makes it dead is a fact about ANOTHER listener, not about this one: the document-level
      // Escape handler at :684 is registered in the CAPTURE phase and shares this closure's `menu`,
      // so by the time a key event bubbles back down to `stage` — a descendant — `menu` is already
      // null and the guard at :597 has returned. Behaviour is identical either way (both branches
      // preventDefault and call the same closeMenu()), which is why no gate can see this. Give that
      // document listener a bubble registration, a stopPropagation, or a narrower Escape guard and
      // this line is load-bearing again — so it stays, named, as the APG pattern this handler
      // claims to implement in full (PR #263 review, finding 4).
      else if (e.key === "Escape") { e.preventDefault(); closeMenu(); }
      else if (e.key === "Tab") closeMenu();
    }, { signal });

    stage.addEventListener("click", (e) => {
      const item = e.target.closest?.(".stx-menu-item");
      // aria-disabled is the refusal, since the items are deliberately still focusable buttons.
      if (!menu || !item || !menu.el.contains(item) || item.getAttribute("aria-disabled") === "true") return;
      runItem(item.getAttribute("data-stx-item"), menu.node, e.detail);
    }, { signal });

    // A PRESS OUTSIDE CLOSES IT, focus NOT restored — the reader has already moved on and yanking
    // focus back to the invoker would fight the thing they just pressed.
    document.addEventListener("pointerdown", (e) => {
      if (!menu || menu.el.contains(e.target)) return;
      closeMenu({ restoreFocus: false });
    }, { capture: true, signal });

    // A SCROLL OF THE CANVAS CLOSES IT (R7). The menu is anchored to a CELL, so a pan leaves it
    // visually detached from the block it belongs to — a menu floating over an unrelated component
    // is worse than no menu. Passive: it never needs to prevent the scroll it is reacting to.
    scroll.addEventListener("scroll", () => closeMenu({ restoreFocus: false }), { passive: true, signal });

    // --- keyboard: the selection verbs --------------------------------------------------------------
    // ON canvas.scroll, where ⌘Z/⌘Y already live (studio-verbs.mjs:749-759), which is what makes
    // ⌘/Ctrl+A FOCUS-SCOPED: it reaches the canvas only while the scroller or a descendant holds
    // focus, and is the browser's own document select-all everywhere else. That bound is real, it is
    // stated in this header, in the help line and in the driver's printed bounds sentence — and it
    // is why `Select all` is also a MENU ITEM, so the criterion is not satisfied only for readers
    // who know the shortcut.
    scroll.addEventListener("keydown", (e) => {
      if (carrying()) return; // a live carry owns the arrows and Escape
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        resetAnchor();
        applySelection(slots().map(idOf));
        return;
      }
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = DIRS[e.key];
      if (!dir) return; // not ours — let the page have the key
      e.preventDefault(); // or the scroller also scrolls
      // CAPTURED ONCE (call 4). The focused wrapper is the natural origin; with focus on the
      // scroller itself the first selected block is, and an empty canvas answers the stage origin.
      if (!anchor) {
        const focused = document.activeElement?.closest?.(".stx-slot");
        const from = (focused && stage.contains(focused)) ? focused : chosenNodes()[0];
        const at = from ? boxOf(from) : { x: 0, y: 0 };
        anchor = { x: at.x, y: at.y };
        cursor = anchor;
      }
      const next = extendSelection(anchor, cursor, dir);
      cursor = next.cursor;
      // ANNOUNCED ON EVERY PRESS, INCLUDING ONE THE EDGE BLOCKED — studio-verbs.mjs:718-721's rule,
      // and the same reason: a keyboard reader with no per-step feedback cannot tell a rectangle
      // that grew from one that hit the edge.
      applySelection(idsInRange(slots().map(boxOf), next.range));
    }, { signal });

    // ESCAPE AT THE DOCUMENT LEVEL, for studio-verbs.mjs:733's reason — a body-drag focuses nothing,
    // so the keydown lands on <body> and never bubbles through the stage. GUARDED ON THIS MODULE'S
    // OWN LIVE STATE and nothing else (D11): Escape during a carry must not cancel a marquee, and
    // Escape during a marquee must not cancel a carry. Each listener returns immediately unless its
    // own verb is live, and the journey asserts the non-interference in both directions.
    //
    // IN THE CAPTURE PHASE, and that is the load-bearing half rather than a style choice. The
    // verbs' Escape handler is on `stage`, a DESCENDANT, so on a bubble listener here the carry has
    // ALREADY been cancelled by the time this runs — carrying() reads .is-picked, which is gone —
    // and one Escape both cancelled the carry AND cleared the selection. Capturing makes the
    // decision on the state as the reader left it. Nothing is stopped from propagating, so the
    // verbs' cancel still happens and the replay driver still sees the key.
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (menu) { e.preventDefault(); closeMenu(); return; }
      if (marquee) { e.preventDefault(); endMarquee(true); return; }
      // A SELECTION IS ALSO A STATE ESCAPE GETS OUT OF (AC #5), but only when nothing else is live —
      // and only when the canvas is where the reader is, or Escape anywhere on /factory would clear
      // a selection they cannot see.
      if (!carrying() && chosenNodes().length && scroll.contains(document.activeElement)) {
        e.preventDefault();
        resetAnchor();
        applySelection([]);
      }
    }, { capture: true, signal });

    const handleObj = {
      bus,
      // The driver's injection point, and the reason the whole module has one: tooling's
      // source-parity assertions drive THIS selection rather than a second one.
      applySelection,
      chosenIds,
      openMenu,
      closeMenu,
      get menu() { return menu; },
      get marquee() { return marquee; },
      destroy() {
        ac.abort();
        closeMenu({ restoreFocus: false });
        marquee = null;
        if (live === handleObj) live = null;
      },
    };
    live = handleObj;
    return handleObj;
  } finally {
    // Every path, including the boundary throws above, so a gate fails on the missing thing instead
    // of deadlocking to timeout (studio-canvas.mjs:372-375, studio-verbs.mjs:781-785).
    viewport?.setAttribute("data-canvas-select", "ready");
  }
}
