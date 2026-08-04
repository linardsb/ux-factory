// system/system-graph.mjs — hand-written canon (this repo; not generated). View-time
// "shape of the system" exhibit (portfolio-ux-uplift §Phase 5): renders the GENERATED
// system/system-graph.json (agent-layer/gen-system-graph.mjs, drift-checked in CI) as a
// two-column bipartite token↔consumer graph — nothing here is hand-drawn, every node and
// count is the artifact's. At rest NO edges are drawn (calm, stable baseline); hovering
// OR keyboard-focusing a node draws its edges and shows the detail line — the interaction
// IS the demonstration (a token's blast radius, a component's token diet). Pack bindings
// are quoted verbatim from the artifact (neutral's var(--…) alias text included).
//
// Two exports mirroring trace-player.mjs's pure/DOM split:
//   prepareGraph(json)                — PURE and DOM-free: validates the artifact's shape,
//                                       indexes token→consumers / consumer→tokens.
//   renderSystemGraph(container, model) — builds the SVG (createElementNS discipline,
//                                       agentic-renderer.mjs idiom); returns { destroy }.
// The module injects no <style> — factory.html owns the sg-* styles (page-owns-exhibit).
//
// PAN / ZOOM (#173). The exhibit is a bounded window the reader handles: drag to pan,
// ⌘/Ctrl-wheel (and trackpad pinch, which arrives as wheel + ctrlKey) to zoom, plus an
// explicit button row for the keyboard. Zoom writes the SVG's RENDERED width/height against
// the UNCHANGED viewBox, so strokes, text and drawEdge's user-space coordinates all scale
// from one property write — no CSS transform, no per-element math. Pan is drag-to-SCROLL on
// a real scroll container, which is what keeps the 96 tabbable nodes reachable: the browser
// scrolls a focused node into view and arrow keys scroll the box (2.4.7 / 2.4.11). A clipped
// transformed layer would have to buy both back with hand-written focus→pan math.
//
// EVERY MEASUREMENT HAPPENS INSIDE AN EVENT HANDLER. factory.html mounts this graph into
// #shape, which the tab controller has already `hidden` — so at mount time every rect in
// this subtree is 0×0 and stays wrong until the reader opens the tab. Hence: at rest scale 1
// and scroll 0,0 (no measured fit-to-width default), and nothing reads clientWidth until a
// pointerdown/wheel/click says the box is real.

const SVGNS = "http://www.w3.org/2000/svg";

// Zoom bounds and the button row's step. Reset returns to exactly 1, so the at-rest geometry
// is byte-identical to boot (WIDTH * 1 === the width attribute the <svg> already carries).
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 1.25;

// Layout constants (structural literals): row rhythm and the two column x positions.
const ROW = 17;
const GROUP_GAP = 8;
const PAD_TOP = 20;
const PAD_BOTTOM = 16;
const TOKEN_TEXT_X = 225; // right-aligned label
const TOKEN_NODE_X = 238;
const CONSUMER_NODE_X = 622;
const CONSUMER_TEXT_X = 634;
const WIDTH = 940;

// --- DOM builders — text via textContent, attrs via setAttribute (never innerHTML).
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
function svg(tag, attrs, ...children) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  for (const c of children) if (c != null) node.appendChild(c);
  return node;
}
function svgText(x, y, text, attrs) {
  const t = svg("text", { x, y, ...(attrs || {}) });
  t.textContent = text;
  return t;
}

// prepareGraph(json) → { tokens, consumers, byToken, byConsumer, counts }. Pure (no DOM)
// so it runs under Node. Throws a plain Error naming the missing key — the artifact is
// generated and drift-checked, so a top-level shape check is enough (prepareHandoff rule).
export function prepareGraph(json) {
  if (!json || typeof json !== "object") throw new Error("system-graph: artifact is not an object");
  for (const key of ["tokens", "consumers", "counts"])
    if (!json[key]) throw new Error(`system-graph: missing "${key}" in system-graph.json`);
  if (!Array.isArray(json.tokens) || !json.tokens.length)
    throw new Error('system-graph: "tokens" empty in system-graph.json');
  if (!Array.isArray(json.consumers) || !json.consumers.length)
    throw new Error('system-graph: "consumers" empty in system-graph.json');
  const byToken = new Map(json.tokens.map((t) => [t.name, []]));
  const byConsumer = new Map();
  for (const c of json.consumers) {
    byConsumer.set(c.id, c.tokens);
    for (const tok of c.tokens) {
      const list = byToken.get(tok);
      if (list) list.push(c.id);
    }
  }
  return { tokens: json.tokens, consumers: json.consumers, byToken, byConsumer, counts: json.counts };
}

// renderSystemGraph(container, model) — the DOM half. All colour comes from the sg-*
// classes factory.html styles (fg-muted / border / accent-highlight only).
export function renderSystemGraph(container, model) {
  // ----- Positions. Left: tokens in source order, grouped with a group label per contract
  // section. Right: consumers spread evenly over the same height.
  const tokenPos = new Map();
  let y = PAD_TOP;
  const groupLabels = [];
  let lastGroup = null;
  for (const t of model.tokens) {
    if (t.group !== lastGroup) {
      y += lastGroup === null ? 0 : GROUP_GAP;
      groupLabels.push({ label: t.group, y });
      y += ROW + 4; // the label gets its own row plus breathing room before the first token
      lastGroup = t.group;
    }
    tokenPos.set(t.name, y);
    y += ROW;
  }
  const height = y + PAD_BOTTOM;
  const consumerPos = new Map();
  const innerH = height - PAD_TOP - PAD_BOTTOM;
  model.consumers.forEach((c, i) => {
    consumerPos.set(c.id, PAD_TOP + (i + 0.5) * (innerH / model.consumers.length));
  });

  // ----- Static frame: legend (real counts — never hand-written), scrolling SVG, detail line.
  const legend = el("p", { class: "sg-legend", text:
    `${model.counts.tokens} contract tokens · ${model.counts.consumers} consumer blocks · 3 packs — ` +
    "measured, not drawn. Hover or focus a node to draw its edges; a filled dot is a spec-backed " +
    "component. Drag the map to move it; ⌘/Ctrl-scroll, pinch, or the buttons to zoom." });
  const root = svg("svg", {
    class: "sg-svg", width: WIDTH, height, viewBox: `0 0 ${WIDTH} ${height}`,
    role: "img", "aria-label":
      "Bipartite graph: contract tokens on the left, the component blocks that consume them on the right.",
  });
  const edges = svg("g", { class: "sg-edges" });
  root.appendChild(edges);
  const scroll = el("div", { class: "sg-scroll" });
  scroll.appendChild(root);
  const detail = el("p", { class: "sg-detail", "aria-live": "polite", text:
    "Hover or focus a token to see its consumers and its value in each pack." });

  // keepInView(node) — scroll a newly focused node inside the window. MEASURED IN THE HANDLER,
  // never at mount (#shape is hidden then and every rect is 0×0).
  //
  // This is NOT redundant with the browser's own focus scrolling, and #173 shipped without it for
  // one round: FIREFOX DOES NOT SCROLL A FOCUSED *SVG* ELEMENT INTO VIEW AT ALL — not on Tab, not
  // on an explicit scrollIntoView({block:"nearest"}); both no-op (chromium and webkit do both).
  // That only became reachable when the exhibit gained a max-height and turned into a real vertical
  // scroll container: before, the SVG stood full-height in the page flow and tabbing scrolled the
  // DOCUMENT, which Firefox handles. Without this, tabbing to node 60 of 96 on Firefox moves focus
  // to something the reader cannot see — WCAG 2.4.7 Focus Visible / 2.4.11 Focus Not Obscured.
  // Written to run on every engine rather than sniffing one: where the browser already did the
  // work the node is inside the box, both branches are false, and this is a no-op.
  const FOCUS_MARGIN = 12;
  const keepInView = (node) => {
    const r = node.getBoundingClientRect();
    const b = scroll.getBoundingClientRect();
    if (!r.height && !r.width) return; // panel still hidden — nothing meaningful to measure
    if (r.top < b.top) scroll.scrollTop -= b.top - r.top + FOCUS_MARGIN;
    else if (r.bottom > b.bottom) scroll.scrollTop += r.bottom - b.bottom + FOCUS_MARGIN;
    if (r.left < b.left) scroll.scrollLeft -= b.left - r.left + FOCUS_MARGIN;
    else if (r.right > b.right) scroll.scrollLeft += r.right - b.right + FOCUS_MARGIN;
  };

  for (const g of groupLabels)
    root.appendChild(svgText(TOKEN_TEXT_X, g.y + 8, g.label, { class: "sg-group-label", "text-anchor": "end" }));

  // ----- Interaction: hover and keyboard focus are the same gesture (focus/blur mirror
  // mouseenter/leave); edges exist only while a node is active.
  const nodeById = new Map(); // "t:--name" / "c:id" → <g>
  const clear = () => {
    edges.textContent = "";
    for (const n of nodeById.values()) n.classList.remove("is-hl");
  };
  const drawEdge = (y1, y2) =>
    edges.appendChild(svg("path", {
      class: "sg-edge",
      d: `M ${TOKEN_NODE_X + 5} ${y1} C ${TOKEN_NODE_X + 140} ${y1}, ${CONSUMER_NODE_X - 140} ${y2}, ${CONSUMER_NODE_X - 5} ${y2}`,
    }));
  const packLine = (t) =>
    ["neutral", "saulera", "verdant"].map((p) => `${p}: ${t.packs[p] ?? "—"}`).join(" · ");
  const activateToken = (t) => {
    clear();
    nodeById.get(`t:${t.name}`).classList.add("is-hl");
    for (const id of model.byToken.get(t.name) || []) {
      nodeById.get(`c:${id}`).classList.add("is-hl");
      drawEdge(tokenPos.get(t.name), consumerPos.get(id));
    }
    detail.textContent = `${t.name} — ${packLine(t)}`;
  };
  const activateConsumer = (c) => {
    clear();
    nodeById.get(`c:${c.id}`).classList.add("is-hl");
    for (const tok of c.tokens) {
      nodeById.get(`t:${tok}`).classList.add("is-hl");
      drawEdge(tokenPos.get(tok), consumerPos.get(c.id));
    }
    detail.textContent = `${c.label} — ${c.tokens.length} contract tokens${c.spec ? ` · ${c.spec}` : ""}`;
  };
  const wire = (node, activate) => {
    node.addEventListener("mouseenter", activate);
    node.addEventListener("mouseleave", clear);
    node.addEventListener("focus", () => { activate(); keepInView(node); });
    node.addEventListener("blur", clear);
  };

  for (const t of model.tokens) {
    const gy = tokenPos.get(t.name);
    const node = svg("g", { class: "sg-node", tabindex: "0" },
      svg("title", {}),
      svg("circle", { cx: TOKEN_NODE_X, cy: gy, r: 3.5 }),
      svgText(TOKEN_TEXT_X, gy + 3.5, t.name, { "text-anchor": "end" }));
    node.querySelector("title").textContent = `${t.name} — ${packLine(t)}`;
    nodeById.set(`t:${t.name}`, node);
    wire(node, () => activateToken(t));
    root.appendChild(node);
  }
  for (const c of model.consumers) {
    const gy = consumerPos.get(c.id);
    const node = svg("g", { class: `sg-node${c.spec ? " sg-spec" : ""}`, tabindex: "0" },
      svg("title", {}),
      svg("circle", { cx: CONSUMER_NODE_X, cy: gy, r: 3.5 }),
      svgText(CONSUMER_TEXT_X, gy + 3.5, c.label, {}));
    node.querySelector("title").textContent =
      `${c.label} — ${c.tokens.length} contract tokens${c.spec ? ` · ${c.spec}` : ""}`;
    nodeById.set(`c:${c.id}`, node);
    wire(node, () => activateConsumer(c));
    root.appendChild(node);
  }

  // ----- Zoom controls. Real buttons with visible text — this is the keyboard path, and the
  // only zoom affordance a reader who never touches a trackpad will find.
  const level = el("span", { class: "sg-zoom-level", "aria-live": "polite", text: "100%" });
  const outBtn = el("button", { type: "button", class: "btn btn-secondary sg-zoom-btn", text: "Zoom out" });
  const inBtn = el("button", { type: "button", class: "btn btn-secondary sg-zoom-btn", text: "Zoom in" });
  const resetBtn = el("button", { type: "button", class: "btn btn-secondary sg-zoom-btn", text: "Reset" });
  const zoomRow = el("div", { class: "sg-zoom" }, outBtn, inBtn, resetBtn, level);

  let scale = 1;
  const syncControls = () => {
    level.textContent = `${Math.round(scale * 100)}%`;
    outBtn.disabled = scale <= MIN_SCALE;
    inBtn.disabled = scale >= MAX_SCALE;
  };

  // setScale(next, anchorX, anchorY) — anchors are box-relative px; default is the box centre,
  // measured HERE (call time) and never at mount, because the panel may still be hidden.
  const setScale = (next, anchorX, anchorY) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    if (clamped === scale) return;
    const ax = anchorX ?? scroll.clientWidth / 2;
    const ay = anchorY ?? scroll.clientHeight / 2;
    // The content point under the anchor, in unscaled viewBox units, read with the OLD scale.
    const cx = (scroll.scrollLeft + ax) / scale;
    const cy = (scroll.scrollTop + ay) / scale;
    scale = clamped;
    root.style.width = `${WIDTH * scale}px`;
    root.style.height = `${height * scale}px`;
    scroll.scrollLeft = cx * scale - ax; // the browser clamps both to the new scroll range
    scroll.scrollTop = cy * scale - ay;
    syncControls();
  };

  outBtn.addEventListener("click", () => setScale(scale / ZOOM_STEP));
  inBtn.addEventListener("click", () => setScale(scale * ZOOM_STEP));
  // Reset is both axes: back to the at-rest exhibit, whether the reader zoomed, panned or both.
  resetBtn.addEventListener("click", () => {
    setScale(1);
    scroll.scrollLeft = 0;
    scroll.scrollTop = 0;
  });

  // ----- Drag to pan. Pointer capture (not document listeners — destroy()'s contract) so a
  // drag that leaves the box still tracks. Touch bails out: native touch scrolling already pans.
  let pan = null;
  scroll.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.pointerType === "touch") return;
    pan = { id: e.pointerId, x: e.clientX, y: e.clientY, left: scroll.scrollLeft, top: scroll.scrollTop };
    scroll.setPointerCapture(e.pointerId);
    scroll.classList.add("is-panning");
  });
  scroll.addEventListener("pointermove", (e) => {
    if (!pan || e.pointerId !== pan.id) return;
    scroll.scrollLeft = pan.left - (e.clientX - pan.x);
    scroll.scrollTop = pan.top - (e.clientY - pan.y);
  });
  const endPan = (e) => {
    if (!pan || e.pointerId !== pan.id) return;
    if (scroll.hasPointerCapture(e.pointerId)) scroll.releasePointerCapture(e.pointerId);
    pan = null;
    scroll.classList.remove("is-panning");
  };
  scroll.addEventListener("pointerup", endPan);
  scroll.addEventListener("pointercancel", endPan);

  // ----- Wheel zoom, anchored at the cursor. ONLY with ⌘/Ctrl held (a trackpad pinch arrives
  // as wheel + ctrlKey, so pinch needs no extra code). Plain wheel is deliberately untouched:
  // it scrolls the box and then chains to the page, so a mid-page exhibit never traps scroll.
  scroll.addEventListener("wheel", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const r = scroll.getBoundingClientRect(); // measured in the handler — see the header note
    setScale(scale * Math.exp(-e.deltaY / 300), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // Keyboard needs nothing else: the button row is the explicit path, arrow keys scroll a
  // focused scroll container, and Tab moves through the sg-node elements — each of which the
  // browser scrolls into view natively, because this is a real scroll container.

  container.append(legend, zoomRow, scroll, detail);

  // Parity with trace-player/handoff-viewer: no document-level listeners, so destroy()
  // only clears the container — the embedder contract is kept.
  const destroy = () => { container.textContent = ""; };
  return { destroy };
}
