// system/agentic-renderer.mjs — hand-written canon (this repo; not generated).
// The declarative renderer for agent-composed UI: it interprets a {name, props, children}
// composition against the known component vocabulary ONLY, and refuses anything else. This is
// what makes agentic UI safe by construction — the same managed-freedom argument as the token
// contract (epic #1, ticket #11; architecture §Agentic UI, line 23: "the design system built
// in Exhibit 1 is what makes agentic UI safe in Exhibit 2").
//
// Two exports:
//   validateComposition(vocab, composition, path?) — PURE and DOM-free. Recurses the tree and
//     throws a plain Error naming the offending path (composition[2].children[0].props.value)
//     on: unknown component, out-of-vocabulary prop, missing required prop, wrong type, enum
//     violation, disallowed/too-many children, or a status-chip child that competes with its
//     parent's status. This is what ticket #13 calls under Node for build-time composition runs
//     (architecture lines 86–88), so it must not touch the DOM.
//   renderComposition(vocab, composition, bus) — validates first (refusal before any DOM), then
//     builds real components with createElement/textContent and wires every interaction onto the
//     bus. All DOM is built element-by-element — never innerHTML from props — so agent-supplied
//     props cannot inject markup. That IS the "agent never emits raw HTML/CSS" non-goal (PRD §8),
//     enforced by construction.
//
// The six templates are the canonical DOM realization of the specs' Data binding + Accessibility
// prose (system/specs/*.md); their classes are exactly what ticket #8's component CSS styles
// (system/components.css). Vocabulary in, real components out — the vocabulary is passed as an
// argument (not fetched here) so the module stays pure and Node-runnable; the caller owns loading.

// ---------------------------------------------------------------------------
// validateComposition — pure, DOM-free. Error voice mirrors system/derive.mjs:
// name the offending path, enumerate what was allowed.
// ---------------------------------------------------------------------------

export function validateComposition(vocab, composition, path = "composition") {
  if (Array.isArray(composition)) {
    composition.forEach((node, i) => validateComposition(vocab, node, `${path}[${i}]`));
    return composition;
  }

  const node = composition;
  if (!node || typeof node !== "object" || typeof node.name !== "string") {
    throw new Error(`${path}: expected a node { name, props, children? }, got ${node === null ? "null" : typeof node}`);
  }

  // Own-property lookup: a node named "toString"/"constructor" must refuse cleanly (unknown
  // component), never resolve to an Object.prototype member (parity with scenarios/validate.mjs).
  const entry = Object.hasOwn(vocab.components, node.name) ? vocab.components[node.name] : undefined;
  if (!entry) {
    throw new Error(`${path}: unknown component "${node.name}" (vocabulary: ${Object.keys(vocab.components).join(" | ")})`);
  }

  const props = node.props ?? {};
  if (typeof props !== "object" || Array.isArray(props)) {
    throw new Error(`${path}.props: must be an object`);
  }

  // Out-of-vocabulary props — a prop the component does not declare. Own-property check so an
  // agent-supplied "__proto__"/"toString" key (a real own key after JSON.parse) is refused, not
  // silently accepted via the prototype chain.
  for (const key of Object.keys(props)) {
    if (!Object.hasOwn(entry.props, key)) {
      throw new Error(`${path}.props.${key}: "${key}" is not a prop of ${node.name} (allowed: ${Object.keys(entry.props).join(" | ")})`);
    }
  }

  // Required, type, enum — head schema v1 uses only string/number/boolean.
  for (const [name, spec] of Object.entries(entry.props)) {
    const has = name in props;
    if (spec.required && !has) {
      throw new Error(`${path}.props.${name}: required prop of ${node.name} is missing`);
    }
    if (!has) continue;
    const value = props[name];
    if (typeof value !== spec.type) {
      throw new Error(`${path}.props.${name}: expected ${spec.type}, got ${typeof value}`);
    }
    if (spec.enum && !spec.enum.includes(value)) {
      throw new Error(`${path}.props.${name}: "${value}" is not in enum [${spec.enum.join(" | ")}]`);
    }
  }

  // Children — at most one, only if the entry allows children, only an allowed name.
  const kids = node.children;
  if (kids !== undefined) {
    if (!Array.isArray(kids)) throw new Error(`${path}.children: must be an array when present`);
    if (kids.length > 0) {
      if (entry.children.length === 0) {
        throw new Error(`${path}.children: ${node.name} allows no children`);
      }
      if (kids.length > 1) {
        throw new Error(`${path}.children: ${node.name} allows at most one child (got ${kids.length})`);
      }
      const child = kids[0];
      const childPath = `${path}.children[0]`;
      if (!child || typeof child !== "object" || typeof child.name !== "string") {
        throw new Error(`${childPath}: expected a node { name, props, children? }`);
      }
      if (!entry.children.includes(child.name)) {
        throw new Error(`${childPath}: "${child.name}" is not an allowed child of ${node.name} (allowed: ${entry.children.join(" | ")})`);
      }
      validateComposition(vocab, child, childPath); // validates the child's own props/enums
      // One signal per card: an explicit status-chip may only relabel the derived state,
      // never change it. A child whose value differs from the parent's status means two
      // competing states — the composition is wrong (status-chip's Usage prose).
      if (child.name === "status-chip" && "status" in props && child.props?.value !== props.status) {
        throw new Error(`${childPath}.props.value: "${child.props?.value}" competes with the parent ${node.name}'s status "${props.status}" — one signal per card; an explicit status-chip may only relabel the derived state, not change it`);
      }
    }
  }

  return composition;
}

// ---------------------------------------------------------------------------
// DOM construction — browser-only. Every function below references `document`,
// so it must run only inside a render call; the top-level module import stays
// Node-safe (nothing here executes at import time).
// ---------------------------------------------------------------------------

const SVGNS = "http://www.w3.org/2000/svg";
const STROKE = { fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" };

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

function icon(...children) {
  const s = document.createElementNS(SVGNS, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("width", "18");
  s.setAttribute("height", "18");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("focusable", "false");
  for (const c of children) s.appendChild(c);
  return s;
}
function svgPath(d, attrs) {
  const p = document.createElementNS(SVGNS, "path");
  p.setAttribute("d", d);
  for (const [k, v] of Object.entries(attrs || {})) p.setAttribute(k, v);
  return p;
}
function svgCircle(cx, cy, r, attrs) {
  const c = document.createElementNS(SVGNS, "circle");
  c.setAttribute("cx", cx);
  c.setAttribute("cy", cy);
  c.setAttribute("r", r);
  for (const [k, v] of Object.entries(attrs || {})) c.setAttribute(k, v);
  return c;
}

// Placeholder-grade glyphs (aria-hidden; #8 may refine the paths, not the structure).
const GLYPHS = {
  moisture: () => icon(svgPath("M12 3S6 10 6 14a6 6 0 0 0 12 0C18 10 12 3 12 3Z", { fill: "currentColor" })),
  light: () => icon(
    svgCircle(12, 12, 4, STROKE),
    svgPath("M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19", STROKE),
  ),
  back: () => icon(svgPath("M15 5l-7 7 7 7", STROKE)),
  settings: () => icon(svgCircle(12, 12, 3, STROKE), svgCircle(12, 12, 8, STROKE)),
};

// The status-chip is always aria-hidden: its parent card/row speaks the state in its own
// accessible name (spec: chip text aria-hidden against double announcement).
function statusChip(props) {
  return el("span", { class: `vd-status-chip is-${props.value}`, "aria-hidden": "true", text: props.label });
}

// Chip rule: derived by default (canonical label = value.toUpperCase(), per status-chip's Data
// binding prose); an explicit status-chip child overrides only the label (validation has already
// guaranteed its value equals the parent's status).
function resolveChip(status, kids) {
  const explicit = kids.find((k) => k && k.name === "status-chip");
  const chipProps = explicit ? explicit.props : { value: status, label: String(status).toUpperCase() };
  return statusChip(chipProps);
}

// An <img src> is both an injection surface (javascript:/data:) and a beacon surface (a cross-
// origin host silently exfiltrates via the image request) — the contract says site-relative.
// Resolve with the browser's own parser against the page base, then require the SAME ORIGIN:
// this defers every normalisation quirk to the engine that actually loads the src (backslash-as-
// slash for http/https, C0-control stripping, tab/newline removal), so no hand-rolled regex can
// drift from it. Render-path only (validateComposition never calls this), so new URL + location
// are fine here. Same-origin is narrower than allow-external-https, but post-resolution "//evil"
// and "https://cdn" are indistinguishable (both https, both cross-origin) — blocking the beacon
// requires same-origin, and the contract already ships photoUrl as a site-relative path (no demo images).
function safePhotoUrl(url, path) {
  let resolved;
  try {
    resolved = new URL(url, document.baseURI);
  } catch {
    throw new Error(`${path}.props.photoUrl: "${url}" is not a valid URL`);
  }
  if (resolved.origin !== location.origin) {
    throw new Error(`${path}.props.photoUrl: "${url}" must be a site-relative (same-origin) URL — no cross-origin host, javascript:/data:, or protocol-relative //`);
  }
  return url;
}

function busEmit(bus, name, e, params) {
  bus.emit({
    type: "ui.intent",
    source: e.detail === 0 ? "keyboard" : "pointer",
    target: { component: name },
    params,
  });
}

// ---------------------------------------------------------------------------
// Templates — the canonical DOM realization of the six specs. Classes match
// system/components.css (ticket #8); data-driven state rides is-* classes and
// native attributes, never bespoke state classes.
// ---------------------------------------------------------------------------

const TEMPLATES = {
  "status-chip": (props) => statusChip(props),

  "stat-tile": (props) => {
    // DOM order label → value+unit so screen readers hear "Moisture, 34 %"; the CSS
    // reverses it visually (spec's Accessibility note).
    const glyph = (GLYPHS[props.kind] || GLYPHS.moisture)();
    return el("div", { class: "vd-stat-tile" },
      el("p", {},
        el("span", { class: "vd-stat-label", text: props.label }),
        el("span", { class: "vd-stat-reading" },
          el("span", { class: "vd-stat-glyph", "aria-hidden": "true" }, glyph),
          el("span", { class: "vd-stat-value", text: String(props.value) }),
          el("span", { class: "vd-stat-unit", text: props.unit }),
        ),
      ),
    );
  },

  "primary-button": (props, kids, bus) => {
    const btn = el("button", {
      type: "button",
      class: "vd-primary-button",
      disabled: props.disabled === true, // native disabled — suppresses the click for free
      text: props.label,
    });
    btn.addEventListener("click", (e) => busEmit(bus, "primary-button", e, { intent: "commit", label: props.label }));
    return btn;
  },

  "plant-card": (props, kids, bus, path) => {
    const card = el("a", {
      class: `vd-plant-card${props.status === "overdue" ? " is-overdue" : ""}`,
      href: "#", // #8 wires real navigation; in composition mode the card previews the intent
      "aria-label": `${props.name}, ${props.status}`,
    });
    const thumb = props.photoUrl != null
      ? el("span", { class: "vd-plant-thumb", "aria-hidden": "true" },
          el("img", { src: safePhotoUrl(props.photoUrl, path), alt: "", width: "48", height: "48" }))
      : el("span", { class: "vd-plant-thumb", "aria-hidden": "true", text: props.name[0] }); // monogram
    const text = el("span", { class: "vd-plant-text" },
      el("span", { class: "vd-plant-name", text: props.name }),
      props.species != null ? el("span", { class: "vd-plant-species", text: props.species }) : null);
    card.append(thumb, text, resolveChip(props.status, kids));
    card.addEventListener("click", (e) => {
      e.preventDefault();
      busEmit(bus, "plant-card", e, { intent: "open", name: props.name });
    });
    return card;
  },

  "care-task-row": (props, kids, bus) => {
    const verb = props.type[0].toUpperCase() + props.type.slice(1);
    const checked = props.checked === true;
    const row = el("button", {
      type: "button",
      role: "checkbox",
      "aria-checked": String(checked),
      class: `vd-care-task-row is-${props.status}${checked ? " is-checked" : ""}`,
      "aria-label": `${verb} ${props.plantName}, ${props.status}`,
    });
    row.append(
      el("span", { class: "vd-task-check", "aria-hidden": "true" }),
      el("span", { class: "vd-task-label", text: `${verb} ${props.plantName}` }),
      resolveChip(props.status, kids),
    );
    row.addEventListener("click", (e) => {
      // The row flips its own state first, then reports the new value (the composing surface
      // owns what a toggle means — same philosophy as primary-button's spec).
      const next = row.getAttribute("aria-checked") !== "true";
      row.setAttribute("aria-checked", String(next));
      row.classList.toggle("is-checked", next);
      busEmit(bus, "care-task-row", e, { intent: "toggle", checked: next, type: props.type, plantName: props.plantName });
    });
    return row;
  },

  "screen-header": (props, kids, bus) => {
    // Empty-slot rule: lead and trail slots are always present so the centred title never
    // shifts when affordances toggle. The header attaches no scroll listener — it owns no
    // state beyond scroll elevation (spec), which the composing surface drives via is-scrolled.
    const lead = props.showBack
      ? el("button", { type: "button", class: "vd-header-affordance back", "aria-label": "Back" }, GLYPHS.back())
      : el("span", {});
    if (props.showBack) lead.addEventListener("click", (e) => busEmit(bus, "screen-header", e, { intent: "back" }));

    const trail = props.showSettings
      ? el("button", { type: "button", class: "vd-header-affordance settings", "aria-label": "Settings" }, GLYPHS.settings())
      : el("span", {});
    if (props.showSettings) trail.addEventListener("click", (e) => busEmit(bus, "screen-header", e, { intent: "settings" }));

    return el("header", { class: "vd-screen-header" },
      lead,
      el("h1", { class: "vd-screen-title", text: props.title }),
      trail);
  },
};

// ---------------------------------------------------------------------------
// renderComposition — validate, then build DOM. A vocabulary entry with no template
// is a drift bug, refused like any other.
// ---------------------------------------------------------------------------

export function renderComposition(vocab, composition, bus, path = "composition") {
  validateComposition(vocab, composition, path); // refusal before any DOM
  return build(vocab, composition, bus, path);
}

function build(vocab, node, bus, path) {
  if (Array.isArray(node)) {
    const frag = document.createDocumentFragment();
    node.forEach((n, i) => frag.appendChild(build(vocab, n, bus, `${path}[${i}]`)));
    return frag;
  }
  const template = Object.hasOwn(TEMPLATES, node.name) ? TEMPLATES[node.name] : undefined;
  if (!template) {
    throw new Error(`${path}: "${node.name}" is in the vocabulary but this renderer has no template for it — renderer and vocabulary have drifted`);
  }
  return template(node.props ?? {}, node.children ?? [], bus, path);
}
