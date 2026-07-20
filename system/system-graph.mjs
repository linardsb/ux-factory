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

const SVGNS = "http://www.w3.org/2000/svg";

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
    "measured, not drawn. Hover or focus a node to draw its edges; a filled dot is a spec-backed component." });
  const root = svg("svg", {
    class: "sg-svg", width: WIDTH, height, viewBox: `0 0 ${WIDTH} ${height}`,
    role: "img", "aria-label":
      "Bipartite graph: contract tokens on the left, the component blocks that consume them on the right.",
  });
  const edges = svg("g", { class: "sg-edges" });
  root.appendChild(edges);
  const detail = el("p", { class: "sg-detail", "aria-live": "polite", text:
    "Hover or focus a token to see its consumers and its value in each pack." });

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
    node.addEventListener("focus", activate);
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

  const scroll = el("div", { class: "sg-scroll" });
  scroll.appendChild(root);
  container.append(legend, scroll, detail);

  // Parity with trace-player/handoff-viewer: no document-level listeners, so destroy()
  // only clears the container — the embedder contract is kept.
  const destroy = () => { container.textContent = ""; };
  return { destroy };
}
