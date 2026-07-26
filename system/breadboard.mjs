// system/breadboard.mjs — Act 3 of the pattern builder: the visitor's answers become a breadboard
// they can edit (epic #134, ticket #136; .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.3,
// .claude/plans/build-questions-breadboard.md).
//
// Breadboarding is Shape Up's lowest-fidelity design tool, and the definitions are exact
// (Ryan Singer / Basecamp, basecamp.com/shapeup/1.3-chapter-04):
//
//   Places      "things you can navigate to, like screens, dialogs, or menus that pop up"
//   Affordances "things the user can act on, like buttons and fields"
//   Connections "show how the affordances take the user from place to place"
//
// That third definition decides this module's data model. A connection's SOURCE is an AFFORDANCE,
// not a place — so affordances carry ids and a connection is [affordanceId, placeId]. A
// place-to-place model would have been a wrong definition rendered on a page whose whole subject is
// working from the method faithfully, which is an honesty bug, not a modelling preference.
//
//   board = { places:      [{ id, label, affordances: [{ id, label }] }],
//             connections: [[affordanceId, placeId]] }
//
// `connections` is the only record of what leads where. An affordance does not carry its own target
// as well, because two places to write the same fact is two places for them to disagree.
//
// The draft rules below are committed and commented, the way system/derive.rules.mjs is: a reader
// can open this file and see every rule that turned their eight answers into a board. Nothing here
// calls a model, at view time or any other time.
//
// Node-import-safe: draftBoard is pure and exported for that reason (slice 1c's pattern rules read
// a board, and a pure drafter is what makes that runnable from `node -e`). Every DOM reference
// lives inside a function body, and the mount self-boots behind a `typeof document` guard.

import { BUILD_CHANGE, DEFAULT_ANSWERS, publishBuild, readBuild } from "./build-questions.mjs";

// The appetite, in Shape Up's sense of a budget rather than an estimate, is enforced as a cap on
// the drafted board. Six is the hard ceiling either way; small batch hammers scope down to three.
const MAX_PLACES = 6;
const MAX_AFFORDANCES = 6;
const APPETITE_CAP = { small: 3, big: MAX_PLACES };

// --- the draft rules ---------------------------------------------------------------------------

// The shape answer names the place the visitor lands in. Everything else hangs off it.
const SHAPE_PLACE = {
  overview: "Overview",
  worklist: "Worklist",
  stream: "Latest",
  steps: "Get started",
};

// The action is the smallest behaviour. Some actions need a place of their own; "check" does not,
// because the place the visitor already landed in is what they came to check. `opener` is the
// affordance on the entry place, and it is the one that carries the connection.
const ACTION_RULE = {
  check: { place: null, opener: "Filter", own: null },
  capture: { place: "Add", opener: "New item", own: "Save" },
  // "Results" deliberately matches the hunt reward's place name: searching for something and being
  // rewarded by what you find land in the same place, and rule 3 below collapses them into one.
  find: { place: "Results", opener: "Search field", own: "Open a result" },
  respond: { place: "Thread", opener: "Reply", own: "Send" },
};

// The variable reward needs somewhere to be collected. Reward types are the ruleset's three.
const REWARD_PLACE = {
  tribe: { place: "People", own: "Follow" },
  hunt: { place: "Results", own: "Open a result" },
  self: { place: "Progress", own: "Set a target" },
};

// The investment is the user's own work, so it needs somewhere for that work to accumulate.
const INVESTMENT_PLACE = {
  content: { place: "Library", own: "Add to library" },
  data: { place: "Settings", own: "Save changes" },
  social: { place: "Connections", own: "Invite" },
  "track-record": { place: "Profile", own: "Edit profile" },
};

// A no-go is Shape Up's "thing you explicitly declare out of scope in writing". It is the one
// answer that SUBTRACTS: scoping by subtraction is what keeps a fixed appetite honest, so a no-go
// removes the place it rules out before the appetite gets to truncate what is left.
const NOGO_RULE = {
  none: [],
  social: ["People", "Connections"],
  settings: ["Settings"],
  history: ["Profile", "Library"],
};

// draftBoard(answers) — pure. The rules, in order:
//   1. The entry place comes from `shape`.
//   2. `action`, `rewardType` and `investment` each want a place; an action of "check" wants none.
//   3. Two rules that name the same place produce one place, not two (find + hunt both want a
//      results place, and a breadboard with two identical places is a modelling error).
//   3b. `nogos` removes the places it rules out. Declared out of scope means not drawn.
//   4. `appetite` truncates what survives: small batch keeps three places, big batch up to six.
//   5. The entry place gets one affordance per surviving place, and that affordance is what the
//      connection runs from. An action with no place of its own still gets its affordance, with
//      nothing to connect to, because plenty of real affordances act in place.
//   6. Every other place gets the one affordance its own rule names.
export function draftBoard(answers) {
  const a = { ...DEFAULT_ANSWERS, ...(answers || {}) };
  const action = ACTION_RULE[a.action] || ACTION_RULE.check;

  const wanted = [];
  if (action.place) wanted.push({ place: action.place, own: action.own, opener: action.opener });
  const reward = REWARD_PLACE[a.rewardType];
  if (reward) wanted.push({ ...reward, opener: `Open ${reward.place}` });
  const investment = INVESTMENT_PLACE[a.investment];
  if (investment) wanted.push({ ...investment, opener: `Open ${investment.place}` });

  const seen = new Set();
  const unique = wanted.filter((w) => !seen.has(w.place) && seen.add(w.place));
  const ruledOut = NOGO_RULE[a.nogos] || [];
  const kept = unique.filter((w) => !ruledOut.includes(w.place));
  const cap = APPETITE_CAP[a.appetite] || MAX_PLACES;
  const survivors = kept.slice(0, Math.max(0, cap - 1));

  const places = [{ id: "p1", label: SHAPE_PLACE[a.shape] || SHAPE_PLACE.overview, affordances: [] }];
  const connections = [];

  // The action's own affordance sits on the entry place whether or not it leads anywhere.
  if (!action.place && action.opener) {
    places[0].affordances.push({ id: "p1a1", label: action.opener });
  }

  survivors.forEach((w, i) => {
    const placeId = `p${i + 2}`;
    const affId = `p1a${places[0].affordances.length + 1}`;
    places[0].affordances.push({ id: affId, label: w.opener });
    connections.push([affId, placeId]);
    places.push({
      id: placeId,
      label: w.place,
      affordances: w.own ? [{ id: `${placeId}a1`, label: w.own }] : [],
    });
  });

  return { places, connections };
}

// --- DOM helper (build-import.mjs:46 shape; duplicated per module by the same decision) --------
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "text") node.textContent = v;
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const c of children) if (c != null) node.appendChild(c);
  return node;
}

const SVG_NS = "http://www.w3.org/2000/svg";

// Ids only ever come from this counter or from draftBoard, so they are always [a-z0-9] and safe in
// an attribute selector. Anything a visitor types goes into a label, never into an id.
function nextId(prefix, taken) {
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

function mount(root) {
  const toolbarEl = root.querySelector("[data-bb-toolbar]");
  const placesEl = root.querySelector("[data-bb-places]");
  const canvasEl = root.querySelector("[data-bb-canvas]");
  const linesEl = root.querySelector("[data-bb-lines]");
  const liveEl = root.querySelector("[data-bb-live]");
  if (!toolbarEl || !placesEl || !canvasEl || !linesEl || !liveEl) return;

  // Pulled, not awaited: build-questions.mjs publishes on its own mount, and this module may load
  // before or after it. Reading the store here means the two work in either script order.
  const seed = readBuild();
  let answers = seed.answers || { ...DEFAULT_ANSWERS };
  let board = draftBoard(answers);
  // Latches on the first edit. After that an answer change no longer redrafts, because a silent
  // redraft would delete the visitor's work; a "Re-draft from answers" button appears instead.
  let edited = false;
  let connectFrom = null; // the affordance id waiting for a target, while connect mode is on
  let pendingFocus = null; // a selector, applied after the next render puts the new tree in the DOM

  const announce = (text) => { liveEl.textContent = text; };
  const targetOf = (affId) => (board.connections.find(([from]) => from === affId) || [])[1] || null;
  const placeById = (id) => board.places.find((p) => p.id === id);
  const affCount = () => board.places.reduce((n, p) => n + p.affordances.length, 0);

  function publish() {
    publishBuild({ source: "breadboard", board: structuredClone(board), boardIsEdited: edited });
  }

  // Every edit verb ends here: mark the board dirty, re-render, publish the full state, say what
  // happened. `focus` is a selector into the tree that render() is about to build.
  function commit(message, focus) {
    edited = true;
    pendingFocus = focus || null;
    render();
    publish();
    announce(message);
  }

  // --- the edit verbs -------------------------------------------------------------------------

  function addPlace() {
    if (board.places.length >= MAX_PLACES) {
      announce(`This board is at its cap of ${MAX_PLACES} places. Remove one to add another.`);
      return;
    }
    const id = nextId("p", new Set(board.places.map((p) => p.id)));
    board.places.push({ id, label: "New place", affordances: [] });
    commit(`Place added. ${board.places.length} of ${MAX_PLACES}.`, `[data-place="${id}"] .bx-bb-name`);
  }

  function removePlace(id) {
    const place = placeById(id);
    if (!place) return;
    const gone = new Set(place.affordances.map((f) => f.id));
    board.places = board.places.filter((p) => p.id !== id);
    // A connection is dead if its target went, or if the affordance it ran from went with the place.
    board.connections = board.connections.filter(([from, to]) => to !== id && !gone.has(from));
    if (connectFrom && gone.has(connectFrom)) connectFrom = null;
    commit(`Removed the place "${place.label}". ${board.places.length} of ${MAX_PLACES}.`, "[data-bb-add-place]");
  }

  function renamePlace(id, label) {
    const place = placeById(id);
    if (!place || place.label === label) return;
    place.label = label;
    // No full re-render: that would replace the input the caret is sitting in. The label is already
    // on screen (the visitor typed it), so the rest of the job is the toolbar (a rename is the edit
    // that puts the Re-draft button on screen), the lines, and the publish.
    edited = true;
    renderToolbar();
    publish();
    drawLines();
    announce(`Place renamed to "${label}".`);
  }

  function addAffordance(placeId) {
    const place = placeById(placeId);
    if (!place) return;
    if (place.affordances.length >= MAX_AFFORDANCES) {
      announce(`"${place.label}" is at its cap of ${MAX_AFFORDANCES} affordances.`);
      return;
    }
    const taken = new Set(board.places.flatMap((p) => p.affordances.map((f) => f.id)));
    const id = nextId(`${placeId}a`, taken);
    place.affordances.push({ id, label: "New affordance" });
    commit(`Affordance added to "${place.label}".`, `[data-aff="${id}"] .bx-bb-chip-name`);
  }

  function removeAffordance(placeId, affId) {
    const place = placeById(placeId);
    if (!place) return;
    const aff = place.affordances.find((f) => f.id === affId);
    if (!aff) return;
    place.affordances = place.affordances.filter((f) => f.id !== affId);
    board.connections = board.connections.filter(([from]) => from !== affId);
    if (connectFrom === affId) connectFrom = null;
    commit(`Removed the affordance "${aff.label}" from "${place.label}".`, `[data-place="${placeId}"] .bx-bb-add-aff`);
  }

  function renameAffordance(affId, label) {
    for (const place of board.places) {
      const aff = place.affordances.find((f) => f.id === affId);
      if (!aff || aff.label === label) continue;
      aff.label = label;
      edited = true;
      renderToolbar();
      publish();
      drawLines();
      announce(`Affordance renamed to "${label}".`);
      return;
    }
  }

  // Reconnect, in two picks: the affordance, then the place it takes the user to. Picking the place
  // it already leads to clears the connection, so one control both sets and unsets.
  function startConnect(affId) {
    connectFrom = affId;
    pendingFocus = "[data-bb-target]";
    render();
    announce("Pick the place this affordance takes the user to. Press Escape to cancel.");
  }

  function cancelConnect() {
    const was = connectFrom;
    connectFrom = null;
    pendingFocus = was ? `[data-aff="${was}"] .bx-bb-connect` : null;
    render();
    announce("Connecting cancelled.");
  }

  function pickTarget(placeId) {
    const affId = connectFrom;
    if (!affId) return;
    const owner = board.places.find((p) => p.affordances.some((f) => f.id === affId));
    if (owner && owner.id === placeId) {
      announce("An affordance cannot lead to the place it already sits in. Pick another place.");
      return;
    }
    const current = targetOf(affId);
    board.connections = board.connections.filter(([from]) => from !== affId);
    const cleared = current === placeId;
    if (!cleared) board.connections.push([affId, placeId]);
    connectFrom = null;
    const place = placeById(placeId);
    commit(
      cleared ? `Connection to "${place.label}" cleared.` : `Connected to "${place.label}".`,
      `[data-aff="${affId}"] .bx-bb-connect`,
    );
  }

  function redraft() {
    board = draftBoard(answers);
    edited = false;
    connectFrom = null;
    pendingFocus = "[data-bb-add-place]";
    render();
    publish();
    announce("Board re-drafted from your answers. Your edits were replaced.");
  }

  // --- render ---------------------------------------------------------------------------------

  function renderToolbar() {
    const bar = el("div", { class: "bx-bb-bar" });

    const add = el("button", {
      type: "button",
      class: "btn btn-secondary bx-bb-btn",
      "data-bb-add-place": true,
      text: "Add place",
    });
    add.disabled = board.places.length >= MAX_PLACES;
    add.addEventListener("click", addPlace);
    bar.append(add);

    if (edited) {
      const again = el("button", { type: "button", class: "btn btn-ghost bx-bb-btn", text: "Re-draft from answers" });
      again.addEventListener("click", redraft);
      bar.append(again);
    }

    // The no-go is stated on the board, not just in the answers: a place that is missing because it
    // was ruled out should say so, or its absence reads as something the drafter forgot.
    const ruledOut = NOGO_RULE[answers.nogos] || [];
    bar.append(el("p", { class: "bx-bb-count", text:
      `${board.places.length} of ${MAX_PLACES} places · ${affCount()} affordances`
      + (ruledOut.length ? ` · ruled out by your no-go: ${ruledOut.join(", ")}` : "") }));

    if (connectFrom) {
      const cancel = el("button", { type: "button", class: "btn btn-ghost bx-bb-btn", text: "Cancel" });
      cancel.addEventListener("click", cancelConnect);
      bar.append(el("p", { class: "bx-bb-connecting", text:
        "Connecting. Pick the place this affordance takes the user to, or press Escape." }), cancel);
    }

    toolbarEl.replaceChildren(bar);
  }

  function renderChip(place, aff) {
    const chip = el("span", { class: "bx-bb-chip", "data-aff": aff.id });

    const name = el("input", {
      class: "bx-bb-chip-name",
      value: aff.label,
      "aria-label": `Affordance in ${place.label}`,
      size: Math.max(8, Math.min(28, aff.label.length + 1)),
    });
    name.addEventListener("change", () => renameAffordance(aff.id, name.value.trim() || aff.label));
    chip.append(name);

    const to = targetOf(aff.id);
    const target = to ? placeById(to) : null;
    const connect = el("button", {
      type: "button",
      class: "bx-bb-connect" + (target ? " is-connected" : ""),
      text: target ? `→ ${target.label}` : "Connect",
      "aria-label": target
        ? `Connected to ${target.label}. Change or clear this connection.`
        : `Connect "${aff.label}" to a place`,
    });
    connect.addEventListener("click", () => startConnect(aff.id));
    chip.append(connect);

    const remove = el("button", {
      type: "button",
      class: "bx-bb-remove",
      text: "×",
      "aria-label": `Remove the affordance "${aff.label}"`,
    });
    remove.addEventListener("click", () => removeAffordance(place.id, aff.id));
    chip.append(remove);

    return chip;
  }

  function renderPlace(place, index) {
    const isEntry = index === 0;
    const section = el("section", {
      class: "bx-bb-place" + (isEntry ? " is-entry" : ""),
      "data-place": place.id,
      "aria-label": `Place ${index + 1}: ${place.label}`,
    });

    const head = el("div", { class: "bx-bb-place-head" });
    head.append(el("span", { class: "bx-bb-numeral", "aria-hidden": "true", text: String(index + 1) }));

    const name = el("input", {
      class: "bx-bb-name",
      value: place.label,
      "aria-label": `Name of place ${index + 1}`,
    });
    name.addEventListener("change", () => renamePlace(place.id, name.value.trim() || place.label));
    head.append(name);

    if (isEntry) head.append(el("span", { class: "bx-bb-tag", text: "start" }));

    const remove = el("button", {
      type: "button",
      class: "bx-bb-remove",
      text: "×",
      "aria-label": `Remove the place "${place.label}"`,
    });
    remove.addEventListener("click", () => removePlace(place.id));
    head.append(remove);
    section.append(head);

    const chips = el("div", { class: "bx-bb-chips" });
    for (const aff of place.affordances) chips.append(renderChip(place, aff));
    if (!place.affordances.length) {
      chips.append(el("p", { class: "bx-bb-none", text: "No affordances here yet." }));
    }
    section.append(chips);

    const foot = el("div", { class: "bx-bb-place-foot" });
    const addAff = el("button", {
      type: "button",
      class: "bx-bb-add-aff",
      text: "Add affordance",
    });
    addAff.disabled = place.affordances.length >= MAX_AFFORDANCES;
    addAff.addEventListener("click", () => addAffordance(place.id));
    foot.append(addAff);

    // Only while connect mode is on, and never on the place the waiting affordance sits in: a real
    // button per place is what makes the second pick keyboard-reachable without a roving tabindex.
    if (connectFrom && !place.affordances.some((f) => f.id === connectFrom)) {
      const pick = el("button", {
        type: "button",
        class: "btn btn-primary bx-bb-target",
        "data-bb-target": true,
        text: "Connect here",
        "aria-label": `Connect to ${place.label}`,
      });
      pick.addEventListener("click", () => pickTarget(place.id));
      foot.append(pick);
    }
    section.append(foot);

    return section;
  }

  function render() {
    renderToolbar();

    if (!board.places.length) {
      placesEl.replaceChildren(el("div", { class: "bx-bb-empty" },
        el("p", { class: "bx-bb-empty-title", text: "This board has no places left." }),
        el("p", { class: "bx-bb-empty-note", text:
          "Add one to start again from scratch, or re-draft the whole board from your answers." })));
      drawLines();
      applyPendingFocus();
      return;
    }

    const frag = document.createDocumentFragment();
    board.places.forEach((place, i) => frag.append(renderPlace(place, i)));
    placesEl.replaceChildren(frag);
    drawLines();
    applyPendingFocus();
  }

  // Focus lands somewhere deliberate after every verb, because replaceChildren just destroyed the
  // control that had it and the browser drops focus to <body> (factory-intake.mjs:453-458). Must run
  // after the new tree is in the document; focusing a detached node is a no-op.
  function applyPendingFocus() {
    if (!pendingFocus) return;
    const node = root.querySelector(pendingFocus);
    pendingFocus = null;
    if (!node) return;
    node.focus();
    // A rename input is being focused so it can be typed in, so put the caret at the end rather
    // than selecting the placeholder text the visitor is about to replace.
    if (node.tagName === "INPUT" && typeof node.setSelectionRange === "function") {
      const n = node.value.length;
      node.setSelectionRange(n, n);
    }
  }

  // --- the connection lines --------------------------------------------------------------------
  // Decoration, and marked as such: the overlay is aria-hidden, and every connected affordance
  // already renders its target as text on the chip ("→ Library"). That text is what a screen reader
  // reads and what the live region announces, so a failed measurement costs the lines and nothing
  // else. Redrawn after every render, on container resize, and once after the fonts settle.
  function drawLines() {
    linesEl.replaceChildren();
    const canvas = canvasEl.getBoundingClientRect();
    if (!canvas.width || !canvas.height) return;
    // Lines are a wide-layout affordance. Once the places stack into one column they would run down
    // the cards they pass, converge on the same few pixels, and say nothing the chip's own "→ Place"
    // text does not already say. The track count is read from the grid rather than from a duplicated
    // breakpoint, so the CSS stays the one place the layout is decided.
    if (getComputedStyle(placesEl).gridTemplateColumns.split(/\s+/).length < 2) return;
    linesEl.setAttribute("viewBox", `0 0 ${canvas.width} ${canvas.height}`);

    for (const [affId, placeId] of board.connections) {
      const from = placesEl.querySelector(`[data-aff="${affId}"]`);
      const to = placesEl.querySelector(`[data-place="${placeId}"]`);
      if (!from || !to) continue;
      const f = from.getBoundingClientRect();
      const t = to.getBoundingClientRect();
      if (!f.width || !t.width) continue;

      const x1 = f.right - canvas.left;
      const y1 = f.top + f.height / 2 - canvas.top;
      // Two cases, and they need different curves. Side by side (the wide layout, where the entry
      // place holds one column and the rest stack in the other), the line runs across into the
      // target's near edge and the bezier bends horizontally. Stacked (narrow screens, where every
      // place is full width), it runs down into the target's top edge and the bezier has to bend
      // VERTICALLY — a horizontal bend on a vertical run throws the curve out sideways past the
      // cards, which is what it did before this branch existed.
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "bx-bb-line");
      if (t.left >= f.right || t.right <= f.left) {
        const x2 = (t.left >= f.right ? t.left : t.right) - canvas.left;
        const y2 = t.top + 24 - canvas.top;
        const bend = Math.max(24, Math.abs(x2 - x1) / 2);
        path.setAttribute("d", `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
      } else {
        // Enter the target under the source where possible, inset so the line lands on the card
        // rather than on its corner. A target ABOVE the source is entered at its BOTTOM edge with
        // the bend reversed: bending downward toward a target that is up there sends the curve
        // looping back over the very card it is supposed to land on.
        const down = t.top >= f.bottom;
        const x2 = Math.min(Math.max(x1, t.left + 24 - canvas.left), t.right - 24 - canvas.left);
        const y2 = (down ? t.top : t.bottom) - canvas.top;
        const bend = Math.max(24, Math.abs(y2 - y1) / 2);
        const c1 = down ? y1 + bend : y1 - bend;
        const c2 = down ? y2 - bend : y2 + bend;
        path.setAttribute("d", `M ${x1} ${y1} C ${x1} ${c1}, ${x2} ${c2}, ${x2} ${y2}`);
      }
      linesEl.append(path);

      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("class", "bx-bb-dot");
      dot.setAttribute("cx", String(x1));
      dot.setAttribute("cy", String(y1));
      dot.setAttribute("r", "3");
      linesEl.append(dot);
    }
  }

  // --- listeners on stable nodes: registered once, outside render() ------------------------------
  // Everything inside the rendered subtree dies with it on replaceChildren, which is why the render
  // path cannot leak. These three are the ones that would (guardArrows, factory-intake.mjs:685, is
  // the same once-at-mount discipline).
  document.addEventListener(BUILD_CHANGE, (e) => {
    const detail = e.detail;
    if (!detail || detail.source !== "questions" || !detail.answers) return;
    answers = detail.answers;
    if (edited) { renderToolbar(); return; } // their edits stand; the re-draft button is the way back
    board = draftBoard(answers);
    render();
    publish();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && connectFrom) {
      e.preventDefault();
      cancelConnect();
    }
  });

  if (typeof ResizeObserver === "function") new ResizeObserver(() => drawLines()).observe(canvasEl);
  document.fonts?.ready?.then(() => drawLines());

  render();
  publish();

  // The settled-state handle Phase 1.5's visual-regression run waits on.
  root.dataset.breadboard = "ready";
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-breadboard]");
  if (root) mount(root);
}
