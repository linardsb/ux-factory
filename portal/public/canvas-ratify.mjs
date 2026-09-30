// portal/public/canvas-ratify.mjs — hand-written canon (this repo; not generated). THE OWNER'S HALF OF RATIFY:
// collects the input, shows the plan and the result; validates nothing the server does not (epic #295 ticket
// #313, G6; .claude/plans/ratify-write-gate-diff-313.md Task 3.2). The server half is portal/lib/ratify.mjs.
//
// FOUR CALLS:
//   1. THE SERVER'S checkInput IS THE ONLY VALIDATOR. The page collects (one readForm, so the posted shape has
//      one author), posts, and shows refusals. A UI slip cannot let a bad input through.
//   2. ANY EDIT CLEARS THE PLAN AND ITS HASH. So a stale confirm is reachable only from a second tab or a direct
//      POST, and the server refuses both (the hash covers HEAD, the proposal and every write's bytes).
//   3. EVERY FETCHED STRING IS textContent — gate tails, the diff, porcelain lines, refusal details. Nothing here
//      builds markup from a string.
//   4. A GREEN RATIFY RELOADS. The renderer, the registry and the vocabulary are refetched (the portal sends no
//      cache headers), and the canvas's undo history starts empty, so no page can reach an undo of the ratify.
//      The result survives the reload once, through sessionStorage.

import { ADMIT_TAGS } from "/system/templates.admitted.mjs";

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

// The simple inputs, one row each. `multi` renders one checkbox per option.
const FIELDS = [
  { key: "component", label: "Component name", kind: "text" },
  { key: "prefix", label: "Class prefix", kind: "select", options: ["ds", "vd"] },
  { key: "tag", label: "Root element", kind: "select", options: ADMIT_TAGS },
  { key: "children", label: "Children", kind: "select", options: ["none", "many"] },
  { key: "allowedChildren", label: "Allowed children (comma-separated, when many)", kind: "text" },
  { key: "containers", label: "May sit inside", kind: "multi" },
  { key: "states", label: "States (comma-separated)", kind: "text" },
  { key: "usage", label: "Usage — what the part is and when to use it", kind: "textarea" },
  { key: "accessibility", label: "Accessibility — the model a reader of the spec needs", kind: "textarea" },
  { key: "licence", label: "Licence — whose drawing this is and on what terms", kind: "text" },
  { key: "attribution", label: "Attribution (optional)", kind: "text" },
];

const STASH = (name) => `ratify:${name}`;
const list = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

function field(f, value, choices) {
  const id = `cv-ratify-${f.key}`;
  if (f.kind === "multi") {
    return el("fieldset", { class: "cv-ratify-multi" }, el("legend", { text: f.label }),
      ...choices.map((c) => el("label", {}, el("input", { type: "checkbox", value: c, checked: value.includes(c), "data-ratify-field": f.key }), ` ${c}`)));
  }
  const ctl = f.kind === "select"
    ? el("select", { id, "data-ratify-field": f.key }, ...f.options.map((o) => el("option", { value: o, text: o })))
    : f.kind === "textarea" ? el("textarea", { id, rows: "3", "data-ratify-field": f.key })
      : el("input", { id, type: "text", "data-ratify-field": f.key });
  ctl.value = value ?? "";
  return el("label", { class: "cv-ratify-field", for: id }, el("span", { text: f.label }), ctl);
}

// A repeating group: rows of controls, each with Remove, and one Add.
function group(key, title, makeRow, initial) {
  const rows = el("div", { class: "cv-ratify-rows", "data-ratify-group": key });
  const add = (v = {}) => {
    const row = el("div", { class: "cv-ratify-row", "data-ratify-row": key }, ...makeRow(v));
    const rm = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: "Remove", "data-ratify-remove": key });
    rm.addEventListener("click", () => { row.remove(); rows.dispatchEvent(new Event("input", { bubbles: true })); });
    row.appendChild(rm);
    rows.appendChild(row);
    return row;
  };
  for (const v of initial) add(v);
  const addBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: `Add ${title}`, "data-ratify-add": key });
  addBtn.addEventListener("click", () => { add(); rows.dispatchEvent(new Event("input", { bubbles: true })); });
  return { box: el("fieldset", { class: "cv-ratify-group" }, el("legend", { text: title }), rows, addBtn), add };
}

const input = (cell, attrs = {}) => el("input", { type: "text", "data-ratify-cell": cell, "aria-label": cell, ...attrs });
const select = (cell, options, value) => {
  const s = el("select", { "data-ratify-cell": cell, "aria-label": cell }, ...options.map((o) => el("option", { value: o, text: o })));
  if (value != null) s.value = value;
  return s;
};
const withValue = (node, v) => { node.value = v ?? ""; return node; };

// readForm(root) → the exact `input` object portal/lib/ratify.mjs's checkInput reads.
export function readForm(root) {
  const f = (k) => root.querySelector(`[data-ratify-field="${k}"]`);
  const cells = (row) => Object.fromEntries([...row.querySelectorAll("[data-ratify-cell]")].map((c) => [c.dataset.ratifyCell, c.type === "checkbox" ? c.checked : c.value]));
  const rows = (g) => [...root.querySelectorAll(`[data-ratify-row="${g}"]`)].map(cells);
  const props = {};
  const example = {};
  for (const r of rows("props")) {
    if (!r.name) continue;
    props[r.name] = { type: r.type, required: r.required, description: r.description };
    if (r.example !== "") example[r.name] = r.type === "number" ? Number(r.example) : r.type === "boolean" ? r.example === "true" : r.example;
  }
  const slots = rows("slots").filter((r) => r.prop).map((r) => (r.as === "attr"
    ? { prop: r.prop, as: "attr", attr: r.target }
    : { prop: r.prop, as: "text", tag: r.target, suffix: r.suffix }));
  const css = [];
  for (const r of rows("css")) {
    if (!r.property) continue;
    let rule = css.find((x) => x.suffix === r.suffix);
    if (!rule) { rule = { suffix: r.suffix, decls: [] }; css.push(rule); }
    rule.decls.push([r.property, r.value.trim().split(/\s+/).filter(Boolean).map((t) => `var(${t})`).join(" ")]);
  }
  const states = list(f("states").value);
  const stateNotes = Object.fromEntries([...root.querySelectorAll("[data-ratify-note]")]
    .filter((t) => states.includes(t.dataset.ratifyNote)).map((t) => [t.dataset.ratifyNote, t.value]));
  const children = f("children").value;
  return {
    component: f("component").value.trim(),
    prefix: f("prefix").value,
    props, states, stateNotes,
    usage: f("usage").value, accessibility: f("accessibility").value,
    structure: { tag: f("tag").value, slots, children, ...(children === "many" ? { allowedChildren: list(f("allowedChildren").value) } : {}) },
    containers: [...root.querySelectorAll('[data-ratify-field="containers"]:checked')].map((c) => c.value),
    css, example,
    licence: f("licence").value, attribution: f("attribution").value,
  };
}

// The gates, the porcelain, the diff and (red) the revert command — all textContent.
function resultView(r) {
  const box = el("div", { class: "cv-ratify-result", "data-ratify-result": r.ok ? "green" : "red" });
  box.appendChild(el("p", { class: "cv-import-status", text: r.ok ? `Ratified as ${r.component}: every gate green. Nothing is committed.`
    : r.error ? `Ratify stopped on an error: ${r.error}. ${r.appended ? "Every gate was green and the ledger records the ratify, but the import record was not stamped." : "The files written before it are left in the tree; nothing was appended to the ledger."}`
      : "A gate went red. The files are left written so you can read the failure in context; nothing was appended to the ledger." }));
  const steps = el("ol", { class: "cv-ratify-steps", "data-ratify-steps": true });
  for (const g of r.gates ?? []) {
    steps.appendChild(el("li", { "data-ratify-step": g.step, "data-ratify-exit": String(g.code) },
      el("span", { text: `${g.step} · exit ${g.code} · ${g.ms} ms` }),
      el("details", {}, el("summary", { text: "output" }), el("pre", { class: "cv-ratify-pre", "data-ratify-tail": true, text: g.tail }))));
  }
  box.appendChild(steps);
  if (r.revert) {
    const code = el("code", { "data-ratify-revert": true, text: r.revert });
    const copy = el("button", { type: "button", class: "btn btn-secondary cv-btn", text: "Copy the revert command" });
    copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(r.revert); copy.textContent = "Copied"; } catch { copy.textContent = "Copy failed — select the text"; } });
    box.append(el("p", { class: "cv-import-hint", text: "To undo the writes and the regenerations:" }), code, copy);
  }
  const d = r.diff ?? {};
  box.append(
    el("h4", { text: "git status (the whole tree)" }),
    el("ul", { class: "cv-ratify-porcelain", "data-ratify-porcelain": true }, ...(d.porcelain ?? []).map((l) => el("li", { text: l }))),
    el("details", {}, el("summary", { text: `The diff${d.truncated ? " (truncated at 200 000 bytes)" : ""}` }), el("pre", { class: "cv-ratify-pre", "data-ratify-diff": true, text: `${d.stat ?? ""}\n${d.diff ?? ""}` })),
    ...(d.created ?? []).map((c) => el("details", {}, el("summary", { text: `New file: ${c.path}` }), el("pre", { class: "cv-ratify-pre", text: c.text }))),
  );
  box.appendChild(checklistView(r.checklist));
  return box;
}

const checklistView = (items) => el("ol", { class: "cv-ratify-checklist", "data-ratify-checklist": true }, ...(items ?? []).map((t) => el("li", { text: t })));

function planView(res) {
  const p = res.plan;
  return el("div", { class: "cv-ratify-plan", "data-ratify-plan": true },
    el("h4", { text: "What ratify will write" }),
    el("ul", {}, ...p.writes.map((w) => el("li", { "data-ratify-write": w.path, text: `${w.path} · ${w.kind} · ${w.lines >= 0 ? "+" : ""}${w.lines} lines` }))),
    el("p", { "data-ratify-pin": true, text: `Wrapper histogram pin: ${p.pin.from} → ${p.pin.to}` }),
    el("p", { text: `Palette: inserts ${p.palette.insert} · listed inside: ${p.containers.join(", ")}` }),
    el("h4", { text: `Then ${p.chain.length} gate steps, stopping at the first red` }),
    el("ol", { "data-ratify-chain": true }, ...p.chain.map((c) => el("li", { text: c }))),
    checklistView(res.checklist));
}

function showRefused(box, refused) {
  box.replaceChildren();
  if (!refused) return;
  box.appendChild(el("p", { text: refused.message }));
  if (refused.detail) box.appendChild(el("pre", { class: "cv-ratify-pre", "data-ratify-detail": true, text: refused.detail }));
  if (refused.action?.label) box.appendChild(el("p", { class: "cv-import-hint", text: `Next: ${refused.action.label}${refused.action.hint ? ` — ${refused.action.hint}` : ""}` }));
}

// ratifySection(view, { api, reload, provenance, slug, base }) → a section[data-ratify], a p[data-ratified], or null.
export function ratifySection(view, { api, reload, provenance, slug, base }) {
  let stashed = null;
  try { stashed = JSON.parse(sessionStorage.getItem(STASH(view.name)) ?? "null"); sessionStorage.removeItem(STASH(view.name)); } catch { /* storage off */ }
  if (view.status === "ratified") {
    return el("div", { class: "cv-ratify", "data-ratified": view.component },
      el("p", { class: "cv-import-status", text: `Ratified as ${view.component}. Its mapping is provenance now; a change is a new import.` }),
      stashed ? resultView(stashed) : null);
  }
  if ((view.mode ?? view.record?.provenance?.mode) !== 1 || view.status !== "proposed") return null;

  const pre = view.ratifyPrefill ?? {};
  const section = el("section", { class: "cv-ratify", "data-ratify": view.name, "aria-labelledby": "cv-ratify-title" });
  const values = { component: pre.component, prefix: pre.prefix ?? "ds", tag: "div", children: "none", allowedChildren: "", containers: pre.containers ?? ["stack"], states: (pre.states ?? ["default"]).join(", "), usage: "", accessibility: "", licence: "", attribution: "" };
  const simple = FIELDS.map((f) => field(f, values[f.key], f.key === "containers" ? pre.containerChoices ?? [] : null));

  const notes = el("div", { class: "cv-ratify-notes", "data-ratify-notes": true });
  const syncNotes = () => {
    const keep = Object.fromEntries([...notes.querySelectorAll("[data-ratify-note]")].map((t) => [t.dataset.ratifyNote, t.value]));
    notes.replaceChildren(...list(section.querySelector('[data-ratify-field="states"]').value).map((s) =>
      el("label", { class: "cv-ratify-field" }, el("span", { text: `State "${s}" — what it looks like and when` }),
        withValue(el("textarea", { rows: "2", "data-ratify-note": s }), keep[s]))));
  };

  const props = group("props", "prop", (v) => [
    withValue(input("name", { placeholder: "name" }), v.name),
    select("type", ["string", "number", "boolean"], v.type),
    el("label", {}, el("input", { type: "checkbox", "data-ratify-cell": "required", "aria-label": "required", checked: Boolean(v.required) }), " required"),
    withValue(input("description", { placeholder: "description" }), v.description),
    withValue(input("example", { placeholder: "example value" }), v.example),
  ], []);
  const slots = group("slots", "slot", (v) => [
    withValue(input("prop", { placeholder: "prop" }), v.prop),
    select("as", ["text", "attr"], v.as),
    withValue(input("target", { placeholder: "tag (span) or data-attribute" }), v.target ?? "span"),
    withValue(input("suffix", { placeholder: "class suffix, e.g. -name" }), v.suffix),
  ], []);
  const tokens = el("datalist", { id: "cv-ratify-tokens" }, ...(pre.contractTokens ?? []).map((t) => el("option", { value: t })));
  const css = group("css", "CSS rule", (v) => [
    withValue(input("suffix", { placeholder: "suffix (empty = root)" }), v.suffix),
    withValue(input("property", { placeholder: "property" }), v.property),
    withValue(input("value", { placeholder: "--token (space-separated)", list: "cv-ratify-tokens" }), v.value),
  ], (pre.css ?? []).flatMap((r) => r.decls.map(([property, value]) => ({ suffix: r.suffix, property, value: (value.match(/--[a-z0-9-]+/g) ?? []).join(" ") }))));

  const planBox = el("div", { "data-ratify-plan-box": true });
  const refusal = el("div", { class: "cv-import-refusal", role: "alert", "data-ratify-refusal": true });
  const status = el("p", { class: "cv-import-status", role: "status", "data-ratify-status": true });
  const previewBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-ratify-preview": true, text: "Preview the ratify" });
  const confirmBtn = el("button", { type: "button", class: "btn btn-primary cv-btn", "data-ratify-confirm": true, text: "Ratify: write, run every gate, show the diff", disabled: true });
  const result = el("div", { "data-ratify-result-box": true }, stashed ? resultView(stashed) : null);
  let hash = null;
  let busy = false;
  const clear = () => { hash = null; confirmBtn.disabled = true; planBox.replaceChildren(); };

  previewBtn.addEventListener("click", async () => {
    if (busy) return;
    clear();
    showRefused(refusal, null);
    status.textContent = "Planning…";
    const { status: code, body } = await api("/api/canvas/ratify/preview", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ provenance, slug, name: view.name, input: readForm(section) }),
    });
    status.textContent = "";
    if (code !== 200) { showRefused(refusal, { message: body.error ?? `HTTP ${code}`, action: { label: "Reload the page" } }); return; }
    if (body.refused) { showRefused(refusal, body.refused); return; }
    hash = body.hash;
    confirmBtn.dataset.hash = hash;
    planBox.replaceChildren(planView(body));
    confirmBtn.disabled = false;
  });

  confirmBtn.addEventListener("click", async () => {
    if (busy || !hash) return;
    busy = true;
    confirmBtn.disabled = true;
    previewBtn.disabled = true;
    section.setAttribute("aria-busy", "true");
    status.textContent = "Running ten steps (about 20 s)…";
    const { status: code, body } = await api("/api/canvas/ratify/confirm", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ provenance, slug, name: view.name, input: readForm(section), hash, base: base() }),
    });
    busy = false;
    section.removeAttribute("aria-busy");
    previewBtn.disabled = false;
    status.textContent = "";
    if (code !== 200) { showRefused(refusal, { message: body.error ?? `HTTP ${code}`, action: { label: "Reload the page" } }); clear(); return; }
    if (body.refused) { showRefused(refusal, body.refused); clear(); return; }
    if (body.ok) {
      try { sessionStorage.setItem(STASH(view.name), JSON.stringify(body)); } catch { /* storage off: the reload shows the ratified line only */ }
      reload();
      return;
    }
    clear();
    result.replaceChildren(resultView(body));
  });

  section.addEventListener("input", (e) => {
    if (e.target?.dataset?.ratifyField === "states") syncNotes();
    if (hash) clear();
  });
  section.addEventListener("change", () => { if (hash) clear(); });

  section.append(
    el("h3", { id: "cv-ratify-title", text: "Ratify — admit this proposal into the vocabulary" }),
    el("p", { class: "cv-import-hint", text: "Fill what a drawing cannot carry. The drafts only prefill; the server checks every field. A shape this form cannot express (another element, behaviour, a data contract) is admitted by hand through the spec → CSS → template chain." }),
    ...simple, notes, props.box, slots.box, tokens, css.box,
    el("div", { class: "cv-import-actions" }, previewBtn, confirmBtn),
    status, refusal, planBox, result,
  );
  syncNotes();
  return section;
}
