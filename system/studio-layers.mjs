// system/studio-layers.mjs — hand-written canon (this repo; not generated). The studio's LAYERS
// LIST (epic #202 — docs/epics/prototype-studio.architecture.md §Other eng-lead calls; ticket #221;
// .claude/plans/studio-layers-minimap-221.md).
//
// Every placed thing on the /factory canvas — the board's wrappers AND the device frames — as a
// keyboard-navigable list docked in the inspector rail: a second, LINEAR route to everything the
// 2-D stage holds. Four calls are made here so a later editor inherits rather than re-argues them:
//
//  1. A REFLECTION, NEVER A MIRROR WITH STATE. The list is re-derived from the stage's DOM on every
//     MutationObserver flush; nothing here remembers an arrangement, a name or a selection, so there
//     is no second copy to disagree with the canvas the reader is looking at (studio-select.mjs
//     call 1's reasoning, applied to a whole panel). DOM order is board order — the studio's
//     standing correspondence (studio.mjs's arrangementNow) — so the list needs no sort.
//  2. THE SELECTION IS WRITTEN THROUGH applySelection AND NOWHERE ELSE. A row press calls the one
//     writer studio-select.mjs exposes; this module never touches data-stx-selected itself, so the
//     journey's set-identity assertions keep asserting a wiring rather than a coincidence — and the
//     count sentence a press announces is applySelection's own, deliberately not duplicated here.
//  3. FRAMES ARE OUTSIDE THE SELECTION, HERE TOO. A frame row is an ACTION (bring it into view),
//     never a toggle: system/studio-frames.mjs's header records why half-widening the selection is
//     a bug factory, and passing a frame id to applySelection would not even half-widen it — that
//     function iterates .stx-slot only, so the want-set would clear every slot's selection and
//     announce "Selection cleared." about a press that meant the opposite.
//  4. NO BUS VERB, DELIBERATELY. Selection is view state (studio-select.mjs call 2 — this module is
//     precisely "a second module needs to observe one", but the observation is a DOM read via
//     MutationObserver, not a consumer, and the WRITE still goes through the one applySelection).
//     `ui.select` would be one emitter and one consumer invented for symmetry — studio-flow.mjs's
//     recorded reasoning, fourth application. What would change the call: a replay op that selects,
//     or a share payload that carries a selection.
//
// NO TIMER ANYWHERE: the reflection is event-driven (one MutationObserver), coalesced to one update
// per animation frame — build-checks group 25/26's source pin keeps that true. Arrow presses in the
// list move FOCUS only, with no announcement: the focused button's own accessible name is the
// feedback, and a say() per press would turn the canvas's ONE live region into noise
// (studio-docs.mjs call 5's reasoning for focusin, applied to roving focus).
//
// Refusals are content through canvas.say, never throws — a thrown refusal would trip
// tooling/studio-journey.mjs's no-page-errors contract. Zero inline styles, every node element by
// element (build-checks group 7, joined with no exception argued).
//
// Node-import safe: no DOM outside a function body and no self-boot — system/studio.mjs mounts this
// exactly as it mounts the docs layer and the frames. build-checks group 25 drives the pure layer.

import { FRAME_CLASS, MOVABLE } from "./studio-canvas.mjs";

// ---- the pure layer ----------------------------------------------------------------------------
// Plain data in, plain data out, so build-checks group 25 drives it in CI with no browser — the
// same split every studio module carries.

// layerEntries(nodes) → [{ id, name, kind, selectable, sentence }], IN THE ORDER GIVEN — which on
// the running page is DOM order, i.e. board order. `sentence` is the row's position text:
// "column C, row R" for a 1×1, with ", W by H" appended for a spanning footprint (the frames').
//
// `selectable` is false EXACTLY for kind "frame" — the pure statement of call 3 above, and the
// tripwire build-checks group 25 pins for the day someone widens the selection layer.
//
// Total over junk: a non-array answers []; an entry with no id is skipped (a wrapper the canvas has
// not finished placing is not a row); non-finite geometry coerces to 1, clampSlot's posture.
export function layerEntries(nodes) {
  if (!Array.isArray(nodes)) return [];
  const num = (v) => {
    const n = Math.round(Number(v));
    // Floored at 1, not merely finite: `null` coerces to a finite 0, and no grid the canvas can
    // hold has a column 0 — clampSlot's floor, without importing the caps for a sentence.
    return Number.isFinite(n) && n >= 1 ? n : 1;
  };
  const out = [];
  for (const node of nodes) {
    if (!node || typeof node !== "object" || node.id == null || node.id === "") continue;
    const kind = node.kind === "frame" ? "frame" : "slot";
    const col = num(node.col);
    const row = num(node.row);
    const cols = Math.round(Number(node.cols));
    const rows = Math.round(Number(node.rows));
    const spanning = Number.isFinite(cols) && Number.isFinite(rows) && (cols > 1 || rows > 1);
    out.push({
      id: String(node.id),
      name: typeof node.name === "string" && node.name ? node.name : "Component",
      kind,
      selectable: kind !== "frame",
      sentence: spanning
        ? `column ${col}, row ${row}, ${cols} by ${rows}`
        : `column ${col}, row ${row}`,
    });
  }
  return out;
}

// toggleId(ids, id) → a NEW array with `id`'s membership flipped. Never mutates its input — the
// caller hands it chosenIds() and passes the answer straight to applySelection, and an in-place
// mutation would edit a list another closure may still hold (createHistory's clone-proof reasoning).
// Total over junk: a non-array reads as empty, a null id toggles nothing.
export function toggleId(ids, id) {
  const list = Array.isArray(ids) ? ids.filter((x) => x != null) : [];
  if (id == null) return list.slice();
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

// ---- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module (studio-canvas.mjs:167,
// studio-select.mjs:212). A shared one would be a dependency between deliberately independent
// surfaces.
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

// The static caption every reader meets once, instead of an announcement per focus step — the
// studio's static-caption rule (#stx-move-help's idiom). It states call 3 in reader words.
const HELP_ID = "stu-layers-help";
const HELP_TEXT = "Everything on the canvas, in board order. Enter selects a component on the "
  + "canvas too; frames move on their own and sit outside the selection, so Enter brings one into "
  + "view instead.";

let live = null; // the mounted layers list — the exported seam below drives THIS one

// The driver's seam (studio-select.mjs:233's idiom): tooling/studio-journey.mjs reaches the list
// through this, never through a window global.
export const getLayers = () => live;

export function mountStudioLayers(root, { canvas, select } = {}) {
  const mount = root?.querySelector?.("[data-studio-layers]");
  try {
    // A page without the mount node is not an error — build-checks imports this module for its
    // pure exports, and studio.html deliberately carries no rail. The `finally` still resolves the
    // readiness handle wherever there is a node to carry it.
    if (!mount) return null;

    // Validated at the boundary, throwing a plain Error naming what is missing — the project
    // convention (studio-select.mjs:240-245).
    if (!canvas || !canvas.stage || !canvas.scroll || typeof canvas.say !== "function") {
      throw new Error("studio-layers: a mounted canvas handle { stage, scroll, say } is required");
    }
    if (!select || typeof select.applySelection !== "function" || typeof select.chosenIds !== "function") {
      throw new Error("studio-layers: a selection handle { applySelection, chosenIds } is required");
    }

    const { stage } = canvas;

    // --- reading the stage ----------------------------------------------------------------------
    // MOVABLE imported, never re-literalled: the day a fifth family becomes movable there is one
    // line to edit and this list follows it (studio-canvas.mjs:79-85). Filtered to placed wrappers
    // — place() writes data-stx-id on creation, so an id-less match is a node mid-construction.
    const slots = () => [...stage.querySelectorAll(MOVABLE)].filter((n) => n.getAttribute("data-stx-id"));
    const entryOf = (node) => ({
      id: node.getAttribute("data-stx-id"),
      name: node.getAttribute("data-stx-name"),
      col: node.getAttribute("data-col"),
      row: node.getAttribute("data-row"),
      kind: node.classList.contains(FRAME_CLASS) ? "frame" : "slot",
      selected: node.hasAttribute("data-stx-selected"),
      cols: node.getAttribute("data-span-col"),
      rows: node.getAttribute("data-span-row"),
    });

    // --- structure ------------------------------------------------------------------------------
    const title = el("h3", { class: "stu-panel-title", text: "Layers" });
    const help = el("p", { class: "stu-layers-help", id: HELP_ID, text: HELP_TEXT });
    // tabindex="-1" ON THE LIST ITSELF, and it is firefox that makes it load-bearing: that engine
    // puts scrollable overflow containers in the sequential tab order, so without it the scroller
    // is a stop of its own between the minimap and the first row — and "the list is ONE tab stop"
    // stops being true on exactly one engine. An explicit -1 removes it from Tab everywhere while
    // keeping the rows the focus targets (caught by layersPass ×3 engines).
    const list = el("ul", { class: "stu-layers-list", tabindex: "-1", "aria-describedby": HELP_ID });
    // Shown by appending and hidden by removing, never by `hidden`: an author display rule on the
    // class would silently defeat the attribute (the /build #138 lesson), and add/remove needs no
    // rule to stay honest against.
    const empty = el("p", { class: "stu-layers-empty muted", text: "Nothing on the canvas yet." });
    mount.append(title, help, list);

    const rowNodes = () => [...list.querySelectorAll(".stu-layer")];

    const buildRow = (row, selected) => {
      const btn = el("button", {
        type: "button",
        class: "stu-layer",
        "data-layer-id": row.id,
        tabindex: "-1",
      },
      el("span", { class: "stu-layer-name", text: row.name }),
      // The frame badge is real markup, never CSS content — generated content is a screen-reader
      // gamble, and the badge is half of how a reader learns which rows are actions.
      row.kind === "frame" ? el("span", { class: "stu-layer-kind", text: "frame" }) : null,
      el("span", { class: "stu-layer-pos", text: row.sentence }));
      if (row.kind === "frame") {
        btn.setAttribute("data-layer-kind", "frame");
      } else {
        // aria-pressed on board rows ONLY: a frame row is an action, not a toggle, and pressed
        // state on it would claim a selection membership call 3 says it cannot have.
        btn.setAttribute("aria-pressed", selected ? "true" : "false");
        btn.classList.toggle("is-selected", Boolean(selected));
      }
      return el("li", { class: "stu-layers-item" }, btn);
    };

    // Roving tabindex (the focusItem idiom, studio-select.mjs:355-361): ONE tab stop, arrows move
    // within. preventScroll on every focus call — the rail is in normal flow, but the canvas
    // scroller is one scrollIntoView away and a plain focus() can drag the page.
    const setTabbable = (id) => {
      const rows = rowNodes();
      if (!rows.length) return null;
      const target = rows.find((r) => r.getAttribute("data-layer-id") === id) || rows[0];
      for (const r of rows) r.tabIndex = r === target ? 0 : -1;
      return target;
    };

    const rebuild = () => {
      const hadFocus = list.contains(document.activeElement);
      const keepId = (hadFocus
        ? document.activeElement.closest?.(".stu-layer")
        : list.querySelector('.stu-layer[tabindex="0"]'))?.getAttribute("data-layer-id");
      const wrappers = slots();
      const rows = layerEntries(wrappers.map(entryOf));
      list.textContent = "";
      rows.forEach((row, i) => list.appendChild(buildRow(row, wrappers[i].hasAttribute("data-stx-selected"))));
      const target = setTabbable(keepId);
      // Focus is restored ONLY when the rebuild destroyed the reader's focus — a redraft while a
      // row was held must not strand them on <body>, and a rebuild while they were elsewhere must
      // not yank them here.
      if (hadFocus && target) target.focus({ preventScroll: true });
      if (rows.length) empty.remove();
      else if (!empty.isConnected) mount.appendChild(empty);
    };

    // The in-place patch for attribute churn. LOAD-BEARING rather than an optimisation: a rebuild
    // on data-stx-selected would destroy the very row the reader just pressed, mid-interaction.
    const patchRow = (wrapper) => {
      const id = wrapper.getAttribute("data-stx-id");
      const btn = rowNodes().find((r) => r.getAttribute("data-layer-id") === id);
      if (!btn) { rebuild(); return; } // a wrapper the list has never seen — re-derive whole
      const [row] = layerEntries([entryOf(wrapper)]);
      if (!row) return;
      btn.querySelector(".stu-layer-name").textContent = row.name;
      btn.querySelector(".stu-layer-pos").textContent = row.sentence;
      if (row.kind !== "frame") {
        const on = wrapper.hasAttribute("data-stx-selected");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.classList.toggle("is-selected", on);
      }
    };

    // --- reflection -----------------------------------------------------------------------------
    // ONE observer, coalesced to one flush per animation frame: gestures churn data-col per rAF
    // frame and a flush per record would do the same work N times. Records are FILTERED to MOVABLE
    // stage wrappers — .stx-guide, .stx-menu and compiled inner content also mutate under this
    // subtree and none of them is a row.
    let raf = 0;
    let needRebuild = false;
    const touched = new Set();
    const flush = () => {
      raf = 0;
      const doRebuild = needRebuild;
      needRebuild = false;
      const nodes = [...touched];
      touched.clear();
      if (doRebuild) { rebuild(); return; }
      for (const node of nodes) if (node.isConnected) patchRow(node);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(flush); };

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") {
          // Wrappers are direct children of the stage; a childList change anywhere deeper is
          // compiled content churning and is not a row event.
          if (record.target !== stage) continue;
          const hit = [...record.addedNodes, ...record.removedNodes]
            .some((n) => n.nodeType === 1 && n.matches?.(MOVABLE));
          if (hit) needRebuild = true;
        } else if (record.type === "attributes") {
          const t = record.target;
          if (t.nodeType === 1 && t.parentElement === stage && t.matches?.(MOVABLE)) touched.add(t);
        }
      }
      if (needRebuild || touched.size) schedule();
    });
    observer.observe(stage, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-col", "data-row", "data-stx-name", "data-stx-selected", "data-span-col", "data-span-row"],
    });

    const ac = new AbortController();
    const { signal } = ac;

    // --- activation -----------------------------------------------------------------------------
    // Delegated click: Enter and Space on the focused button arrive as clicks natively, so the
    // keyboard path needs no second handler and cannot drift from this one.
    list.addEventListener("click", (e) => {
      const btn = e.target.closest?.(".stu-layer");
      if (!btn || !list.contains(btn)) return;
      const id = btn.getAttribute("data-layer-id");
      const wrapper = slots().find((n) => n.getAttribute("data-stx-id") === id);
      if (!wrapper) {
        // Content, never a throw — and the DOM stays untouched; the next observer flush removes
        // the stale row.
        canvas.say("Refused: that component is no longer on the canvas.");
        return;
      }
      if (wrapper.classList.contains(FRAME_CLASS)) {
        // Call 3: never applySelection — a frame id in the want-set would clear every slot's
        // selection and announce "Selection cleared." about the opposite intent.
        wrapper.scrollIntoView({ block: "nearest", inline: "nearest" });
        canvas.say(`${wrapper.getAttribute("data-stx-name") || "Frame"} brought into view.`);
        return;
      }
      const next = toggleId(select.chosenIds(), id);
      // The announcement is applySelection's own count sentence — deliberately not duplicated.
      select.applySelection(next);
      if (next.includes(id)) wrapper.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, { signal });

    // --- the list's keyboard --------------------------------------------------------------------
    // Arrows move the roving focus (wrap), Home/End jump. FOCUS ONLY, no announcement — the
    // focused button's own accessible name is the feedback (the header records why).
    //
    // WITHOUT preventScroll, deliberately, and differently from every other focus call here: the
    // list is its OWN scroller, and a long board overflows it — an arrow press must bring the next
    // row into that box or the roving focus walks off-screen. The menu's preventScroll reasoning
    // (a scroll CLOSES it) does not transfer: nothing here closes on scroll.
    list.addEventListener("keydown", (e) => {
      const btn = e.target.closest?.(".stu-layer");
      if (!btn) return;
      const rows = rowNodes();
      const at = rows.indexOf(btn);
      let next = -1;
      if (e.key === "ArrowDown") next = (at + 1) % rows.length;
      else if (e.key === "ArrowUp") next = (at - 1 + rows.length) % rows.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = rows.length - 1;
      if (next < 0) return;
      e.preventDefault();
      setTabbable(rows[next].getAttribute("data-layer-id"));
      rows[next].focus();
    }, { signal });

    rebuild();

    const handleObj = {
      root: mount,
      list,
      refresh: rebuild,
      destroy() {
        observer.disconnect();
        if (raf) cancelAnimationFrame(raf);
        ac.abort();
        title.remove();
        help.remove();
        list.remove();
        empty.remove();
        if (live === handleObj) live = null;
      },
    };
    live = handleObj;
    return handleObj;
  } finally {
    // Every path, including the early return and the boundary throws, so a gate fails on the
    // missing thing instead of deadlocking to timeout (studio-select.mjs:723-727).
    mount?.setAttribute("data-studio-layers", "ready");
  }
}
