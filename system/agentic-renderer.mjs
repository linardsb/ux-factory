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
// The twenty-one templates are the canonical DOM realization of the specs' Data binding + Accessibility
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
// Templates — the canonical DOM realization of the twenty-one specs, one per vocabulary
// entry with no exception since #211 closed demo-notice's gap. Classes match
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

  // Library-generic primitive (ds-, cross-scenario) — the one component both demo scenarios
  // reuse (ticket #13). Non-interactive like stat-tile (no glyph, no bus); DOM order is
  // label → value → unit (spec's Accessibility note); tone rides an is-* class for the
  // warn/critical fill-inversion (neutral = base, no modifier — mirrors stat-tile's one state).
  "metric-tile": (props) => el("div", { class: `ds-metric-tile${props.tone && props.tone !== "neutral" ? " is-" + props.tone : ""}` },
    el("p", {},
      el("span", { class: "ds-metric-label", text: props.label }),
      el("span", { class: "ds-metric-reading" },
        el("span", { class: "ds-metric-value", text: String(props.value) }),
        props.unit != null ? el("span", { class: "ds-metric-unit", text: props.unit }) : null))),

  // Library-generic primitive (ds-, cross-scenario) — one named entity per row, the row-shaped
  // sibling of metric-tile (ticket #101). Non-interactive like metric-tile (no bus); DOM order is
  // reading order (name → meta → value → unit → status) so the row is heard as one sentence;
  // `status` is FREE text rendered as the row's own pill — deliberately NOT a status-chip child,
  // which would re-lock this primitive to Verdant's ok|due|overdue enum (spec's Usage prose).
  "list-row": (props) => el("div", { class: `ds-list-row${props.tone && props.tone !== "neutral" ? " is-" + props.tone : ""}` },
    el("p", {},
      el("span", { class: "ds-row-text" },
        el("span", { class: "ds-row-name", text: props.label }),
        props.meta != null ? el("span", { class: "ds-row-meta", text: props.meta }) : null),
      el("span", { class: "ds-row-reading" },
        el("span", { class: "ds-row-value", text: String(props.value) }),
        props.unit != null ? el("span", { class: "ds-row-unit", text: props.unit }) : null),
      props.status != null ? el("span", { class: "ds-row-status", text: props.status }) : null)),

  // Library-generic primitive (ds-, cross-scenario) — one position in a sequence, the third of the
  // three (ticket #139). Non-interactive like its two siblings (no bus); DOM order IS reading order
  // (position → label → detail) so the step is heard as one sentence; the ordinal is REAL TEXT
  // rather than a CSS counter, so it reaches the accessibility tree (spec's Accessibility note);
  // `tone` rides an is-* class for the warn/critical fill-inversion. It carries no done/current/todo
  // — a step that claimed progress its source does not record would be an invented fact, which is
  // the whole argument of the spec.
  "sequence-step": (props) => el("div", { class: `ds-sequence-step${props.tone && props.tone !== "neutral" ? " is-" + props.tone : ""}` },
    el("p", {},
      el("span", { class: "ds-sequence-step-position", text: `Step ${props.position} of ${props.total}` }),
      el("span", { class: "ds-sequence-step-label", text: props.label }),
      props.detail != null ? el("span", { class: "ds-sequence-step-detail", text: props.detail }) : null)),

  // Honesty surface #1, and the component that closes this map's one gap (epic #202 ticket #211): it
  // had a spec and a vocabulary entry and no template, which is "documented but not composable" — the
  // exact hole the ten new components must never repeat, and what build-checks group 3 now asserts
  // over the WHOLE vocabulary rather than over the names compose() happens to emit. Non-interactive
  // (no bus). role="note" and plain text content, never aria-hidden, never truncated: the disclosure
  // must reach assistive tech on the same terms as sighted readers (spec's Accessibility prose).
  "demo-notice": (props) => el("p", { class: "vd-demo-notice", role: "note", text: props.text }),

  // ---- The ten library components (#220) — ds-, cross-scenario, each mirroring one of the
  // templates above (spec: system/specs/<name>.md). ----

  // MIRROR of primary-button: the quiet sibling — same emission, no fill; native disabled
  // suppresses the click for free.
  "ghost-button": (props, kids, bus) => {
    const btn = el("button", {
      type: "button",
      class: "ds-ghost-button",
      disabled: props.disabled === true,
      text: props.label,
    });
    btn.addEventListener("click", (e) => busEmit(bus, "ghost-button", e, { intent: "commit", label: props.label }));
    return btn;
  },

  // A PORT of Shopify Polaris's Avatar (spike/design-import — spec: system/specs/avatar.md, which
  // states the projection and what it drops). Non-interactive like stat-tile (no bus). role="img"
  // named by the person; the initials are aria-hidden so a reader hears the name, never "NO".
  "avatar": (props) => {
    const size = props.size === "sm" || props.size === "lg" ? ` is-${props.size}` : "";
    const initials = props.initials != null ? props.initials : String(props.name).trim().charAt(0);
    return el("span", { class: `ds-avatar${size}`, role: "img", "aria-label": props.name },
      el("span", { "aria-hidden": "true", text: initials }));
  },

  // The container primitive — the single-child rule made visible: the one validated child renders
  // through its OWN template (validateComposition recursed before build reached here), so the card
  // adds a frame, never behaviour. DOM order title → body → child → footnote is reading order.
  "card": (props, kids, bus, path) => {
    const card = el("section", { class: "ds-card" },
      el("p", { class: "ds-card-title", text: props.title }),
      props.body != null ? el("p", { class: "ds-card-body", text: props.body }) : null);
    const child = kids[0];
    if (child) card.appendChild(TEMPLATES[child.name](child.props ?? {}, [], bus, `${path}.children[0]`));
    if (props.footnote != null) card.appendChild(el("p", { class: "ds-card-footnote", text: props.footnote }));
    return card;
  },

  // Absence stated plainly, with one invited action. A plain div, no role="status": a live region
  // announces CHANGES, and this renders at-rest absence (spec's Accessibility prose).
  "empty-state": (props, kids, bus, path) => {
    const box = el("div", { class: "ds-empty-state" },
      el("p", { class: "ds-empty-state-title", text: props.title }),
      props.body != null ? el("p", { class: "ds-empty-state-body", text: props.body }) : null);
    const child = kids[0];
    if (child) box.appendChild(TEMPLATES[child.name](child.props ?? {}, [], bus, `${path}.children[0]`));
    return box;
  },

  // Determinate only. The TRACK carries role="progressbar" (a progressbar's descendants are
  // presentational to AT, so the role must not swallow `detail`); the visible caption row is
  // aria-hidden because it mirrors exactly what the role already announces (the status-chip
  // precedent). The fill width is CSSOM, not a setAttribute("style") — data, not design, and
  // CSP-safe. Clamped, and the readout prints the clamped number: bar and text always agree.
  "progress-indicator": (props) => {
    const v = Math.min(100, Math.max(0, props.value));
    const fill = el("span", { class: "ds-progress-fill" });
    fill.style.width = v + "%";
    return el("div", { class: `ds-progress-indicator${v === 100 ? " is-complete" : ""}` },
      el("p", { class: "ds-progress-caption", "aria-hidden": "true" },
        el("span", { class: "ds-progress-label", text: props.label }),
        el("span", { class: "ds-progress-value", text: `${v}%` })),
      el("span", {
        class: "ds-progress-track",
        role: "progressbar",
        "aria-label": props.label,
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(v),
      }, fill),
      props.detail != null ? el("p", { class: "ds-progress-detail", text: props.detail }) : null);
  },

  // The library's first real <input> (the primary-button precedent: templates render working
  // native elements). Implicit label wrapping — no ids minted, nothing to collide. No bus: a
  // value change is not an intent in this vocabulary (spec's Usage prose).
  "text-field": (props) => {
    const input = el("input", {
      type: "text",
      class: "ds-text-field-input",
      value: props.value,
      placeholder: props.placeholder,
      disabled: props.disabled === true,
    });
    return el("label", { class: "ds-text-field" },
      el("span", { class: "ds-text-field-label", text: props.label }),
      input,
      props.hint != null ? el("span", { class: "ds-text-field-hint", text: props.hint }) : null);
  },

  // text-field's compact sibling. The magnifier is inline SVG in currentColor (the stat-tile
  // glyph precedent) — aria-hidden decoration on a field the label already names. No bus.
  "search-input": (props) => {
    const input = el("input", {
      type: "search",
      class: "ds-search-input-input",
      value: props.value,
      placeholder: props.placeholder,
    });
    return el("label", { class: "ds-search-input" },
      el("span", { class: "ds-search-input-label", text: props.label }),
      el("span", { class: "ds-search-input-box" },
        el("span", { class: "ds-search-input-glyph", "aria-hidden": "true" },
          icon(svgCircle(11, 11, 8, STROKE), svgPath("M21 21l-4.35-4.35", STROKE))),
        input));
  },

  // The choice field, depicted CLOSED: one real <option> — the chosen value — because the option
  // LIST is the consuming product's data, which the composition model deliberately does not carry
  // (spec's Usage prose). No bus.
  "select-field": (props) =>
    el("label", { class: "ds-select-field" },
      el("span", { class: "ds-select-field-label", text: props.label }),
      el("span", { class: "ds-select-field-control" },
        el("select", { class: "ds-select-field-input", disabled: props.disabled === true },
          el("option", { text: props.value }))),
      props.hint != null ? el("span", { class: "ds-select-field-hint", text: props.hint }) : null),

  // MIRROR of care-task-row: the row flips its OWN state first, then reports the new value — the
  // composing surface owns what "on" means. role="switch" announces on/off, which is the
  // vocabulary a setting speaks; the track/thumb pair is aria-hidden decoration.
  "toggle-switch": (props, kids, bus) => {
    const on = props.on === true;
    const row = el("button", {
      type: "button",
      role: "switch",
      "aria-checked": String(on),
      class: `ds-toggle-switch${on ? " is-on" : ""}`,
      disabled: props.disabled === true,
    },
      el("span", { class: "ds-toggle-switch-label", text: props.label }),
      el("span", { class: "ds-toggle-switch-track", "aria-hidden": "true" },
        el("span", { class: "ds-toggle-switch-thumb" })));
    row.addEventListener("click", (e) => {
      const next = row.getAttribute("aria-checked") !== "true";
      row.setAttribute("aria-checked", String(next));
      row.classList.toggle("is-on", next);
      busEmit(bus, "toggle-switch", e, { intent: "toggle", on: next, label: props.label });
    });
    return row;
  },

  // The DEPICTION of navigation, never the behaviour — navigation is chrome (studio-flow.mjs's
  // recorded rule), so: spans, no handlers, no tab/tablist roles (roles without behaviour lie to
  // AT), aria-current on the one active label. The pipe encoding and the clamp are the spec's
  // Data-binding rule: split on |, trim, drop empties; active clamps into the rendered set.
  "nav-tabs": (props) => {
    const items = String(props.items).split("|").map((s) => s.trim()).filter(Boolean);
    const active = Math.min(Math.max(1, Math.trunc(props.active)), Math.max(items.length, 1));
    return el("div", { class: "ds-nav-tabs" },
      ...items.map((label, i) => el("span", {
        class: `ds-nav-tabs-item${i + 1 === active ? " is-active" : ""}`,
        "aria-current": i + 1 === active ? "true" : false,
        text: label,
      })));
  },

  // An inline, NON-modal decision surface — role="group", deliberately not role="dialog": a
  // dialog role promises trapped focus and a dismiss path a pure template cannot honestly
  // implement (spec's Usage prose). Two real buttons, each MIRRORING primary-button's emission;
  // DOM order puts the way out before the commitment.
  "modal-dialog": (props, kids, bus) => {
    const actions = el("div", { class: "ds-modal-dialog-actions" });
    if (props.dismissLabel != null) {
      const dismiss = el("button", { type: "button", class: "ds-modal-dialog-dismiss", text: props.dismissLabel });
      dismiss.addEventListener("click", (e) => busEmit(bus, "modal-dialog", e, { action: "dismiss", label: props.dismissLabel }));
      actions.appendChild(dismiss);
    }
    const confirm = el("button", { type: "button", class: "ds-modal-dialog-confirm", text: props.confirmLabel });
    confirm.addEventListener("click", (e) => busEmit(bus, "modal-dialog", e, { action: "confirm", label: props.confirmLabel }));
    actions.appendChild(confirm);
    return el("section", { class: "ds-modal-dialog", role: "group", "aria-label": props.title },
      el("p", { class: "ds-modal-dialog-title", text: props.title }),
      el("p", { class: "ds-modal-dialog-body", text: props.body }),
      actions);
  },
};

// Does this renderer know how to build that component? The drift `build()` refuses below, asked as
// a question rather than met on stage: tooling/build-checks.mjs group 3 runs it over EVERY generated
// vocabulary entry — widened from "every name /build's compose() emits" by #211, once demo-notice
// stopped being the written-down exception — so a spec with no template fails a committed gate under
// Node instead of a visitor's render. Exported rather than exporting TEMPLATES itself — the map is the renderer's
// own business, and "is there a template" is the only thing a caller needs to know.
export const hasTemplate = (name) => Object.hasOwn(TEMPLATES, String(name));

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
