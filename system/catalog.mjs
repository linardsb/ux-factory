// system/catalog.mjs — hand-written canon (this repo; not generated). The component catalog at
// /components (epic #202, ticket #215; architecture §Other eng-lead calls "Docs, two mounts of one
// source", §Data model "Docs catalog carries no new generated artifact").
//
// MOUNT 1 OF TWO. This module renders the docs the repo already GENERATES — the handoff pack, the
// agent vocabulary, the system graph — through the existing view-time join, prepareHandoff(pack,
// vocab, graph). There is deliberately no catalog.json and no second truth anywhere in here: the
// per-component renderer, renderComponentDocs, is exactly what the studio inspector (#218, mount 2)
// imports, and everything it prints is either an artifact's own text, a serialization of a live
// render, or a value getComputedStyle reports at view time. The one hand-written table is
// WRAPPER_ATTRS, and it exists because a mechanical camelCase→kebab projection would FABRICATE an
// API (vd-care-task-row observes `action`; the spec prop is `type`) — build-checks group 21 pins
// every entry against the wrapper source's observedAttributes and the vocabulary's props, and
// tooling/catalog-journey.mjs proves the serialized markup drives the real element.
//
// NO BUS VERB, deliberately: every playground control converges pointer and keyboard natively on
// `input`/`change`/`click`, and no agent path records catalog browsing — a `ui.catalog` verb would
// be one emitter + one consumer invented for symmetry (studio-flow.mjs's recorded reasoning). The
// playground DOES create one action bus per component, because the rendered specimens are the
// site's real templates and their clicks emit real `ui.intent` actions — the status line shows
// them, so a reader sees the bus contract working rather than reading that it exists.
//
// NO VIEW-TRANSITION NAMES: the page names nothing (the #171 lesson; tooling/vt-stack-audit.mjs's
// hazard class). Refusals are content, never throws: renderComposition's validation errors land
// verbatim in the component's role="status" line, the stage keeps its last good render, and
// nothing reaches the console (bus-toggles.mjs's discipline).
//
// Node-import-safe: the pure layer below is DOM-free, every DOM reference sits inside a function
// body, and the self-boot at the bottom is behind a `typeof document` guard — build-checks group
// 21 imports this module under Node.

import { renderComposition } from "./agentic-renderer.mjs";
import { createBus } from "./action-bus.mjs";
import { prepareHandoff, renderMarkdown } from "./handoff-viewer.mjs";

// --- pure layer (DOM-free; gated by build-checks group 21) -----------------------------------

// The VR gate's readiness handle, named once. Set on the catalog root ONLY after a successful
// render (approach's asrc idiom): a broken artifact hangs the pixel gate loudly rather than
// baselining an empty catalog.
export const CATALOG_READY = "data-catalog";

// controlFor(propName, propSpec) → a control descriptor for one vocabulary prop. Bounds appear
// ONLY when the spec declares them — a declared subset carries exactly that subset, and an
// unbounded number carries NO min/max/step keys at all (AC #3: defaulting a range to 0–100 IS
// inventing bounds, so unbounded numerics become a bare number field instead).
export function controlFor(propName, propSpec) {
  const spec = propSpec || {};
  if (Array.isArray(spec.enum)) return { kind: "enum", options: spec.enum };
  if (spec.type === "boolean") return { kind: "boolean" };
  if (spec.type === "number") {
    const d = { kind: "number" };
    for (const k of ["min", "max", "step"]) if (Object.hasOwn(spec, k)) d[k] = spec[k];
    return d;
  }
  return { kind: "text" };
}

// tabsFor(component) → the code-tab ids for one prepareHandoff row. The vd/react pair is
// presence-gated on the pack's OWN portability block (component.wrapper) — 3 of 10 today; the 7
// absences are honest, not gaps to fill, and build-checks group 21 pins the 3/7 histogram as the
// tripwire #220 (or a new wrapper) is meant to trip.
export function tabsFor(component) {
  return ["html", ...(component && component.wrapper ? ["vd", "react"] : []), "json"];
}

// Prop→attribute maps for the three shipped wrappers — the ONE hand-written table in this module,
// and `type: "action"` is the reason it exists (see the header). Values are pinned against each
// wrapper source's observedAttributes and keys against the vocabulary entry's props by build-checks
// group 21, so a drifted entry is a red build, not a silently dead attribute.
export const WRAPPER_ATTRS = {
  "care-task-row": { type: "action", plantName: "plant-name", status: "status", checked: "checked" },
  "plant-card": { name: "name", species: "species", status: "status", photoUrl: "photo-url" },
  "status-chip": { value: "value", label: "label" },
};

// The committed spec source for one component — the copy-as-Markdown fetch target (served
// same-origin; the repo ships its own sources) and group 21's fs existence check.
export function specPath(name) {
  return `system/specs/${name}.md`;
}

// reactSnippet(component, props) — a pure string projection of the SAME attribute map into one
// JSX self-closing element plus the wrapper import line. React 19 sets string attributes on
// custom elements natively (system/wc/README.md's recorded verification), so the attribute form
// is the whole story for primitives; booleans are present-when-true, and a string value carrying
// a quote/backslash/newline ships in the brace-wrapped JSON form so it arrives escaped.
export function reactSnippet(component, props) {
  const attrs = WRAPPER_ATTRS[component.name] || {};
  const parts = [];
  for (const [prop, attr] of Object.entries(attrs)) {
    const v = props ? props[prop] : undefined;
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") {
      if (v) parts.push(attr);
      continue;
    }
    const s = String(v);
    parts.push(/["\\\n]/.test(s) ? `${attr}={${JSON.stringify(s)}}` : `${attr}="${s}"`);
  }
  return `import "./wc/${component.className}.mjs";\n\n<${component.className}${parts.length ? " " + parts.join(" ") : ""} />`;
}

// --- browser-only serialization --------------------------------------------------------------

// vdMarkup(component, props) — the vd-* tab's content: build the custom element node for real and
// serialize it, never author the string (escaping is the parser's job, not a template's). The
// element is deliberately NOT registered on this page — serializing an unknown element gives
// identical markup with no page-wide side effects; tooling/catalog-journey.mjs does the
// live-render proof where it belongs, by importing the wrapper in-page and mounting this exact
// markup.
export function vdMarkup(component, props) {
  const attrs = WRAPPER_ATTRS[component.name] || {};
  const node = document.createElement(component.className);
  for (const [prop, attr] of Object.entries(attrs)) {
    const v = props ? props[prop] : undefined;
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") {
      if (v) node.setAttribute(attr, "");
      continue;
    }
    node.setAttribute(attr, String(v));
  }
  return node.outerHTML;
}

// --- DOM builder (handoff-viewer.mjs shape) — text via textContent, attrs via setAttribute.
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

// Committed spec sources, fetched lazily and cached per component (a failed fetch is evicted so
// the next click retries).
const specSource = new Map();

// resolveTokenValues(scope) — fill every [data-token-value] cell in scope with the value
// getComputedStyle reports RIGHT NOW (inspect.mjs's rule: a resolved value is asked at view time,
// never carried in an artifact). The swatch is an SVG rect with a `fill` presentation attribute,
// deliberately: this module sits in build-checks group 7's zero-inline-style set, and an SVG
// attribute is not a style write. Exported for mount 2 and re-run by the pack-swap observer.
export function resolveTokenValues(scope = document) {
  const styles = getComputedStyle(document.documentElement);
  for (const cell of scope.querySelectorAll("[data-token-value]")) {
    const name = cell.getAttribute("data-token-value");
    const value = styles.getPropertyValue(name).trim();
    cell.textContent = "";
    if (value && typeof CSS !== "undefined" && CSS.supports("color", value)) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "cat-swatch");
      svg.setAttribute("viewBox", "0 0 12 12");
      svg.setAttribute("aria-hidden", "true");
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", "12");
      rect.setAttribute("height", "12");
      rect.setAttribute("rx", "2");
      rect.setAttribute("fill", value);
      svg.appendChild(rect);
      cell.appendChild(svg);
    }
    cell.appendChild(document.createTextNode(value || "—"));
  }
}

// --- the per-component renderer — THE #218 SEAM ----------------------------------------------

// renderComponentDocs(container, component, model, opts = {}) — renders ONE component's docs into
// container. `component` is a prepareHandoff row; `model` is { vocab, portability } (the whole
// vocabulary object for renderComposition, the pack's portability block for the trajectory string
// and the Figma path). This function is what the studio inspector (#218) imports — keep it free of
// page chrome; the count line, index strip, hash handling and pack-swap observer are the page
// mount's, below. `opts` is the seam's forward pocket and is deliberately unused today.
export function renderComponentDocs(container, component, model, opts = {}) {
  const entry = component.vocab;
  const portability = model.portability || null;

  // -- head: name (the hash focus target — the SECTION wrapper owns the id, not the h2),
  // class, non-shipped status pill, the Figma link-out, copy-as-Markdown.
  const head = el("header", { class: "cat-head" });
  head.appendChild(el("h2", { class: "cat-name", tabindex: "-1", text: component.name }));
  head.appendChild(el("span", { class: "cat-class", text: component.className }));
  if (component.status && component.status !== "shipped")
    head.appendChild(el("span", { class: "cat-status-pill", text: component.status }));
  if (portability && portability.figma && portability.figma.import)
    head.appendChild(el("a", { class: "cat-figma", href: `/handoff/verdant/${portability.figma.import}`, text: "Figma import path" }));

  // Copy-as-Markdown: the committed spec source, byte-for-byte — fetched verbatim, no wrapper
  // prose, no reassembly (AC #4: byte-identical beats byte-traceable).
  const copyBtn = el("button", { type: "button", class: "btn btn-secondary cat-copy-md", text: "Copy spec as Markdown" });
  let copyTimer = null;
  copyBtn.addEventListener("click", () => {
    if (copyTimer) { clearTimeout(copyTimer); copyTimer = null; }
    const done = (label) => {
      copyBtn.textContent = label;
      copyTimer = setTimeout(() => { copyBtn.textContent = "Copy spec as Markdown"; copyTimer = null; }, 1600);
    };
    let fetched = specSource.get(component.name);
    if (!fetched) {
      fetched = fetch(`/${specPath(component.name)}`).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      });
      specSource.set(component.name, fetched);
    }
    fetched
      .then((text) => navigator.clipboard.writeText(text))
      .then(() => done("Copied ✓"), () => { specSource.delete(component.name); done("Copy failed"); });
  });
  head.appendChild(copyBtn);
  container.appendChild(head);

  if (!entry) {
    // Every pack component has a vocabulary entry today (group 21's set identity); this branch is
    // the honest degradation if that ever stops being true, not a path with its own design.
    container.appendChild(el("p", { class: "cat-meta-line", text: "not in the agent vocabulary" }));
    return;
  }

  // -- playground: one bus, one stage, one control per prop, one role="status" line shared by
  // the validator's refusals and the specimens' ui.intent readout.
  const bus = createBus();
  const stage = el("div", { class: "cat-stage" });
  const statusLine = el("p", { class: "cat-status-line", role: "status" });
  bus.on("*", (a) => {
    if (a.type === "ui.intent")
      statusLine.textContent = `${a.type} · ${a.params && a.params.intent ? a.params.intent : ""}`;
  });

  // Each control contributes a reader returning [propName, value | undefined]; undefined means
  // the prop is OMITTED from the composition — the playground never invents a value, so a cleared
  // required field is refused by the validator in the validator's own words, and a cleared
  // optional field simply drops out (the template's own absent-prop branch renders).
  const readers = [];
  let lastGoodProps = null;

  function currentProps() {
    const props = {};
    for (const read of readers) {
      const [name, v] = read();
      if (v !== undefined) props[name] = v;
    }
    return props;
  }

  function rerender() {
    const props = currentProps();
    let built;
    try {
      built = renderComposition(model.vocab, { name: component.name, props }, bus);
    } catch (e) {
      // Refusal is content: the message lands verbatim, the stage keeps its last good render,
      // nothing reaches the console (bus-toggles.mjs's discipline).
      statusLine.textContent = e.message;
      return;
    }
    stage.replaceChildren(built);
    lastGoodProps = props;
    statusLine.textContent = "";
    syncTabs();
  }

  const controlsCol = el("div", { class: "cat-controls" });
  for (const [propName, propSpec] of Object.entries(entry.props)) {
    const d = controlFor(propName, propSpec);
    const row = el("label", { class: "cat-control-row" });
    row.appendChild(el("span", { class: "cat-control-name", text: propName }));
    const initial = component.example && component.example[propName] !== undefined
      ? component.example[propName]
      : undefined; // no example → empty defaults; an example is never invented here

    if (d.kind === "enum") {
      const select = el("select", { class: "cat-control", "data-cat-control": true, "data-prop": propName });
      if (!propSpec.required) select.appendChild(el("option", { value: "", text: "(not set)" }));
      for (const opt of d.options)
        select.appendChild(el("option", { value: opt, text: opt, selected: initial === opt }));
      select.addEventListener("change", rerender);
      readers.push(() => [propName, select.value === "" ? undefined : select.value]);
      row.appendChild(select);
    } else if (d.kind === "boolean") {
      const box = el("input", { type: "checkbox", class: "cat-control", "data-cat-control": true, "data-prop": propName, checked: initial === true });
      box.addEventListener("change", rerender);
      readers.push(() => [propName, box.checked ? true : undefined]);
      row.appendChild(box);
    } else if (d.kind === "number") {
      // Bounds come from the descriptor, which carries ONLY what the spec declared: a fully
      // bounded number is a range with a live readout; anything less is a bare number field
      // whose input carries exactly the declared subset and nothing invented (AC #3).
      const bounded = Object.hasOwn(d, "min") && Object.hasOwn(d, "max");
      const input = el("input", {
        type: bounded ? "range" : "number",
        class: "cat-control",
        "data-cat-control": true,
        "data-prop": propName,
        ...(Object.hasOwn(d, "min") ? { min: String(d.min) } : {}),
        ...(Object.hasOwn(d, "max") ? { max: String(d.max) } : {}),
        ...(Object.hasOwn(d, "step") ? { step: String(d.step) } : {}),
        value: initial !== undefined ? String(initial) : "",
      });
      const readout = bounded ? el("output", { class: "cat-control-readout", text: input.getAttribute("value") || "" }) : null;
      input.addEventListener("input", () => {
        if (readout) readout.textContent = input.value;
        rerender();
      });
      readers.push(() => {
        const raw = input.value.trim();
        const n = Number(raw);
        return [propName, raw !== "" && Number.isFinite(n) ? n : undefined];
      });
      row.appendChild(input);
      if (readout) row.appendChild(readout);
    } else {
      const input = el("input", { type: "text", class: "cat-control", "data-cat-control": true, "data-prop": propName, value: initial !== undefined ? String(initial) : "" });
      input.addEventListener("input", rerender);
      readers.push(() => {
        // An empty field means NO value, not the value "" — omit, and the validator decides:
        // a required prop refuses in its own words, an optional one simply drops out.
        const raw = input.value;
        return [propName, raw === "" ? undefined : raw];
      });
      row.appendChild(input);
    }
    controlsCol.appendChild(row);
  }

  const playground = el("div", { class: "cat-playground" }, stage, controlsCol);
  container.appendChild(playground);
  container.appendChild(statusLine);

  // -- code tabs: HTML = the CURRENT stage node re-serialized on every prop change (never a
  // stored string — AC #5); vd/react only when the pack ships a wrapper (tabsFor); JSON = the
  // vocabulary entry. Panels toggle via `hidden` (the page carries the page-wide
  // [hidden] { display: none !important; } rule).
  const tabIds = tabsFor(component);
  const TAB_LABELS = { html: "HTML", vd: "vd-* element", react: "React", json: "JSON" };
  const tabRow = el("div", { class: "cat-tabs", role: "group", "aria-label": `${component.name} code views` });
  const panelsWrap = el("div", { class: "cat-panels" });
  const codeNodes = {};
  const panels = {};
  for (const id of tabIds) {
    const btn = el("button", { type: "button", class: "cat-tab", "data-tab": id, "aria-pressed": String(id === tabIds[0]), text: TAB_LABELS[id] });
    btn.addEventListener("click", () => {
      for (const other of tabRow.querySelectorAll(".cat-tab"))
        other.setAttribute("aria-pressed", String(other === btn));
      for (const [pid, panel] of Object.entries(panels)) panel.hidden = pid !== id;
    });
    tabRow.appendChild(btn);
    const code = el("code", {});
    codeNodes[id] = code;
    const panel = el("pre", { class: "cat-code", "data-panel": id, hidden: id !== tabIds[0] }, code);
    panels[id] = panel;
    panelsWrap.appendChild(panel);
  }
  codeNodes.json.textContent = JSON.stringify(entry, null, 2);
  if (!component.wrapper && portability && portability.webComponents && portability.webComponents.trajectory) {
    // The honest absence note — the pack's own portability trajectory string, verbatim
    // (generated, not authored). Present exactly on the components with no wrapper.
    panelsWrap.appendChild(el("p", { class: "cat-trajectory", text: portability.webComponents.trajectory }));
  }
  container.appendChild(tabRow);
  container.appendChild(panelsWrap);

  function syncTabs() {
    codeNodes.html.textContent = stage.firstElementChild ? stage.firstElementChild.outerHTML : "";
    if (component.wrapper && lastGoodProps) {
      codeNodes.vd.textContent = vdMarkup(component, lastGoodProps);
      codeNodes.react.textContent = reactSnippet(component, lastGoodProps);
    }
  }

  // -- API table: rows from the vocabulary entry — name · type · required · enum · bounds (when
  // declared) · description — plus the states and children lines.
  const api = el("section", { class: "cat-api" });
  api.appendChild(el("div", { class: "cat-eyebrow", text: "API — generated vocabulary" }));
  const apiTable = el("table", { class: "cat-table" });
  const apiHead = el("tr", {});
  for (const h of ["prop", "type", "required", "enum", "bounds", "description"]) apiHead.appendChild(el("th", { text: h }));
  apiTable.appendChild(apiHead);
  for (const [propName, spec] of Object.entries(entry.props)) {
    const tr = el("tr", {});
    tr.appendChild(el("td", {}, el("code", { text: propName })));
    tr.appendChild(el("td", { text: spec.type }));
    tr.appendChild(el("td", { text: spec.required ? "yes" : "—" }));
    tr.appendChild(el("td", { text: Array.isArray(spec.enum) ? spec.enum.join(" | ") : "—" }));
    const bounds = ["min", "max", "step"].filter((k) => Object.hasOwn(spec, k)).map((k) => `${k} ${spec[k]}`);
    tr.appendChild(el("td", { text: bounds.length ? bounds.join(" · ") : "—" }));
    tr.appendChild(el("td", { text: spec.description || "" }));
    apiTable.appendChild(tr);
  }
  api.appendChild(apiTable);
  api.appendChild(el("p", { class: "cat-meta-line", text: `States: ${(entry.states || []).join(" · ") || "—"}` }));
  if (Array.isArray(entry.children) && entry.children.length)
    api.appendChild(el("p", { class: "cat-meta-line", text: `Children: ${entry.children.join(" · ")}` }));
  container.appendChild(api);

  // -- token table: the graph-joined rows — name · contract group · the three packs' RAW declared
  // bindings verbatim (system-graph.json's own committed text, aliases unresolved) · a live value
  // cell resolved at view time. A null-group row still renders: a spec declaring a token the
  // contract lacks stays VISIBLE (prepareHandoff's own rule), never silently dropped.
  if (Array.isArray(component.tokens)) {
    const tok = el("section", { class: "cat-tokens" });
    tok.appendChild(el("div", { class: "cat-eyebrow", text: "Tokens — pack bindings verbatim, value resolved live" }));
    const tokTable = el("table", { class: "cat-table cat-token-table" });
    const tokHead = el("tr", {});
    for (const h of ["token", "group", "neutral", "saulera", "verdant", "live value"]) tokHead.appendChild(el("th", { text: h }));
    tokTable.appendChild(tokHead);
    for (const t of component.tokens) {
      const tr = el("tr", {});
      tr.appendChild(el("td", {}, el("code", { text: t.name })));
      tr.appendChild(el("td", { text: t.group ?? "—" }));
      for (const packName of ["neutral", "saulera", "verdant"])
        tr.appendChild(el("td", {}, el("code", { text: (t.packs && t.packs[packName]) || "—" })));
      tr.appendChild(el("td", { class: "cat-token-value", "data-token-value": t.name }));
      tokTable.appendChild(tr);
    }
    tok.appendChild(tokTable);
    if (component.consumer)
      tok.appendChild(el("p", { class: "cat-meta-line", text: `Measured consumer: ${component.consumer.label}` }));
    container.appendChild(tok);
  }

  // -- prose: the committed spec sections through the SAME bounded markdown renderer
  // handoff.html uses (one renderer, two mounts — never a fork). Accessibility is among them.
  const prose = el("section", { class: "cat-prose" });
  prose.appendChild(el("div", { class: "cat-eyebrow", text: "Spec prose — committed source, rendered" }));
  for (const sec of component.sections || []) {
    prose.appendChild(el("h3", { class: "cat-section-title", text: sec.title }));
    renderMarkdown(prose, sec.body);
  }
  container.appendChild(prose);

  rerender(); // initial render from the example (validateExamples gates that it renders)
  resolveTokenValues(container);
}

// --- page mount ------------------------------------------------------------------------------

function errorCard(message) {
  const card = el("article", { class: "card cat-error" });
  card.appendChild(el("h3", { class: "h3", text: "Catalog unavailable" }));
  card.appendChild(el("p", { class: "muted", text: message }));
  return card;
}

// The browser's native hash scroll fired BEFORE the async render, against a page with no matching
// id — this re-run after render is what makes a deep link survive a cold load and a reload (AC #2).
// Also wired to hashchange, so a ⌘K same-page command moves focus too.
function focusHash() {
  const name = decodeURIComponent(location.hash.slice(1));
  if (!name) return;
  const target = document.getElementById(name);
  if (!target || !target.classList.contains("cat-component")) return;
  target.scrollIntoView();
  const heading = target.querySelector(".cat-name");
  if (heading) heading.focus({ preventScroll: true });
}

// Token value cells go stale when the dock swaps the pack mid-visit: pack-boot.js and dock.mjs
// re-point the ONE tokens.<pack>.css head line, so watch that link's href and re-resolve after
// the new sheet loads. At rest this never fires — pack-boot is a guaranteed no-op by default,
// which is what keeps the pixel gate's capture deterministic.
//
// NOT a bare href-prefix match, which was this function's first version and silently watched the
// WRONG link: /system/tokens.contract.css matches the prefix too and comes first in head order
// (dock.mjs:72 records the same trap for its packLink). Matched by shape, contract excluded —
// deliberately BROADER than dock.mjs's PACK_RE hard allowlist, which is a security gate on
// storage-supplied hrefs; this is only "which line do I observe", and it must keep matching when
// a pack joins that list without a second copy to edit.
function watchPackSwap(root) {
  let link = null;
  for (const candidate of document.querySelectorAll('link[rel="stylesheet"]')) {
    const href = candidate.getAttribute("href") || "";
    if (/\/system\/tokens\.(?!contract)[a-z0-9-]+\.css$/.test(href)) { link = candidate; break; }
  }
  if (!link) return;
  new MutationObserver(() => {
    // BOTH events, exactly as the dock's own swap awaits them (dock.mjs's done handler):
    // tokens.saulera.css @imports a fonts file the static host does not ship, and an engine
    // reports that sheet's settling as `error` while still applying every rule — here `error`
    // means "settled", not "failed", and waiting on load alone leaves the cells stale.
    const refresh = () => resolveTokenValues(root);
    link.addEventListener("load", refresh, { once: true });
    link.addEventListener("error", refresh, { once: true });
  }).observe(link, { attributes: true, attributeFilter: ["href"] });
}

export function mountCatalog() {
  const root = document.querySelector("[data-catalog-root]");
  if (!root) return;

  // Honesty surface — the baked verbatim fictionalNotice in the markup is the source of truth;
  // this fetch only re-confirms it (handoff.html's idiom) and a failure keeps the baked text.
  const notice = document.getElementById("fictional-notice");
  if (notice) {
    fetch("/scenarios/verdant/copy.json")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((copy) => { if (copy && copy.fictionalNotice) notice.textContent = copy.fictionalNotice; })
      .catch(() => { /* keep the baked verbatim notice — no paraphrase, ever */ });
  }

  const load = (url) => fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });

  Promise.all([
    load("/handoff/verdant/pack.json"),
    load("/handoff/verdant/vocabulary.json"),
    load("/system/system-graph.json"),
  ])
    .then(([pack, vocab, graph]) => {
      const model = prepareHandoff(pack, vocab, graph);
      const shared = { vocab, portability: pack.portability ?? null };

      // The count is READ FROM THE ARTIFACT, never a literal (AC #1) — #220 changes data, not
      // this code.
      const count = Object.keys(vocab.components).length;
      const countSlot = document.querySelector("[data-catalog-count]");
      if (countSlot)
        countSlot.textContent = `${count} components — the count is read from the generated vocabulary, never typed here.`;

      // Index strip: plain anchors, structural and top-of-page — position: sticky is a site-wide
      // no-op under body { overflow-x: clip }, so the index never pretends to pin.
      const strip = document.querySelector("[data-catalog-index]");
      if (strip)
        for (const c of model.components)
          strip.appendChild(el("a", { class: "cat-chip", href: `#${c.name}`, text: c.name }));

      for (const c of model.components) {
        const section = el("section", { class: "cat-component", id: c.name });
        renderComponentDocs(section, c, shared);
        root.appendChild(section);
      }

      root.setAttribute(CATALOG_READY, "ready"); // success ONLY — see CATALOG_READY's comment

      focusHash();
      window.addEventListener("hashchange", focusHash);
      watchPackSwap(root);
    })
    .catch((err) => {
      root.textContent = "";
      root.appendChild(errorCard(`Could not load the generated sources — ${err.message}`));
      // ready is never set on this path: the VR gate hangs loud rather than baselining this card.
    });
}

if (typeof document !== "undefined" && document.querySelector("[data-catalog-root]")) mountCatalog();
