// portal/public/canvas-import.mjs — hand-written canon (this repo; not generated). The canvas page's
// IMPORT: the panel (Import selection, the mode choice, the refusal, the drop zone), the side-by-side
// view (the original beside what it became in this system's parts) and the mapping editor (epic #295
// ticket #311; .claude/plans/import-run-recorded-import-311.md Task 6.1). Loaded by canvas.html beside
// canvas.mjs; the server half is portal/lib/import-run.mjs.
//
// THREE CALLS:
//   1. AFTER AN IMPORT THE PAGE RELOADS, with ?import=<name>. The server appended a component.propose
//      line, and the canvas's undo history is per mount: a reload starts it after the import, so the
//      page's next undo can never target the server's line (foldLedger is last-in-first-out and would
//      refuse it), and the page's base is fresh.
//   2. A REFUSAL IS SHOWN WITH ONE ACTION and nothing else. No retry: the owner decides.
//   3. EVERY STRING FROM A PACKAGE OR A READ IS textContent — names, drop reasons and the drawing's
//      own words are someone else's, and nothing here builds markup from a string.

import { renderComposition } from "/system/agentic-renderer.mjs";
import { getCanvasPage } from "/canvas.mjs";

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
const $ = (s) => document.querySelector(s);

const qs = new URLSearchParams(location.search);
const provenance = qs.get("provenance");
const slug = qs.get("slug");
const DROP_CLASSES = ["never-read", "read-then-dropped", "read-but-never-emitted"];

let vocab = null;
let busy = false;
const panel = $("[data-import-panel]");
const viewBox = $("[data-import-view]");

const api = async (url, init) => {
  const r = await fetch(url, init);
  const body = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  return { status: r.status, body };
};

// ---- the panel ---------------------------------------------------------------------------------

const refusalBox = el("div", { class: "cv-import-refusal", role: "alert", "data-import-refusal": true });
const statusLine = el("p", { class: "cv-import-status", role: "status", "data-import-status": true });
const modeValue = () => Number(panel.querySelector("input[name=cv-import-mode]:checked")?.value ?? 1);

function showRefusal(refused) {
  refusalBox.replaceChildren();
  if (!refused) return;
  refusalBox.appendChild(el("p", { text: refused.message }));
  const a = refused.action ?? {};
  const act = a.href
    ? el("a", { class: "btn btn-secondary cv-btn", href: a.href, target: "_blank", rel: "noopener", "data-import-action": true, text: a.label })
    : el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-import-action": true, text: a.label });
  if (!a.href) act.addEventListener("click", () => (a.reload ? location.reload() : a.hint ? statusLine.textContent = `Run: ${a.hint}` : dropInput.focus()));
  refusalBox.appendChild(act);
  if (a.hint) refusalBox.appendChild(el("p", { class: "cv-import-hint", text: a.hint }));
}

async function done({ status, body }) {
  busy = false;
  if (status !== 200) { statusLine.textContent = ""; showRefusal({ message: body.error ?? `HTTP ${status}`, action: { label: "Reload the page", reload: true } }); return; }
  if (body.refused) { statusLine.textContent = ""; showRefusal(body.refused); return; }
  const next = new URLSearchParams({ provenance, slug, import: body.name });
  history.replaceState(null, "", `?${next}`);
  location.reload();
}

async function importSelection() {
  if (busy) return;
  busy = true;
  showRefusal(null);
  statusLine.textContent = "Reading the selection in Brilliant…";
  done(await api("/api/canvas/import", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ provenance, slug, base: getCanvasPage().count, entrance: "selection", mode: modeValue() }),
  }));
}

async function importFile(file) {
  if (busy || !file) return;
  busy = true;
  showRefusal(null);
  statusLine.textContent = `Importing ${file.name}…`;
  const q = new URLSearchParams({ provenance, slug, base: String(getCanvasPage().count), mode: String(modeValue()), name: file.name });
  done(await api(`/api/canvas/import/drop?${q}`, { method: "POST", body: file }));
}

const dropInput = el("input", { type: "file", class: "cv-import-file", "data-import-file": true, accept: ".txt,.json" });
dropInput.addEventListener("change", () => importFile(dropInput.files?.[0]));

function buildPanel() {
  const primary = el("button", { type: "button", class: "btn btn-primary cv-btn", "data-import-selection": true, text: "Import selection" });
  primary.addEventListener("click", importSelection);
  const mode = el("fieldset", { class: "cv-import-mode" },
    el("legend", { text: "Mode" }),
    el("label", {}, el("input", { type: "radio", name: "cv-import-mode", value: "1", checked: true }), " 1 — joins the system"),
    el("label", {}, el("input", { type: "radio", name: "cv-import-mode", value: "2" }), " 2 — frozen original"));
  const zone = el("label", { class: "cv-import-drop", "data-import-drop": true },
    el("span", { text: "Drop a Brilliant blueprint export or a Figma house-plugin export" }), dropInput);
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("is-over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
  zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("is-over"); importFile(e.dataTransfer?.files?.[0]); });
  panel.replaceChildren(
    el("h2", { class: "cv-import-title", text: "Import" }),
    el("p", { class: "cv-import-binding", "data-import-binding": true, text: "Reads: project not exposed by this binding" }),
    primary, mode, refusalBox, statusLine, zone,
  );
  return primary;
}

// ---- the view and the editor -------------------------------------------------------------------

async function edit(name, e) {
  statusLine.textContent = "Re-deriving…";
  const { status, body } = await api("/api/canvas/import/mapping", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provenance, slug, name, edit: e }),
  });
  if (status !== 200) { statusLine.textContent = `Refused: ${body.error}`; return; }
  statusLine.textContent = "Mapping saved; the record, markdown and drafts were re-derived.";
  renderView(body);
}

function editorRows(view) {
  const list = el("ul", { class: "cv-import-editor", "data-import-editor": true });
  for (const row of view.outline) {
    const part = view.mapping.parts?.[row.path] ?? {};
    const label = `${row.name ?? row.kind}${row.text ? ` — “${row.text}”` : ""}`;
    const rename = el("input", { type: "text", value: part.name ?? "", placeholder: "part name", "aria-label": `Part name for ${label}`, "data-import-rename": row.path });
    rename.addEventListener("change", () => { if (rename.value.trim()) edit(view.name, { path: row.path, rename: rename.value.trim() }); });
    const current = part.drop ? "drop" : (part.map ?? "");
    const remap = el("select", { "aria-label": `Maps to, for ${label}`, "data-import-remap": row.path },
      el("option", { value: "", text: `as recognised (${row.recognised ?? "not covered"})` }),
      ...view.builders.map((b) => el("option", { value: b, text: b })),
      el("option", { value: "drop", text: "drop" }));
    remap.value = current;
    remap.addEventListener("change", () => {
      if (remap.value === "drop") edit(view.name, { path: row.path, drop: true });
      else if (remap.value === "") edit(view.name, { path: row.path, drop: false });
      else edit(view.name, { path: row.path, map: remap.value });
    });
    const snaps = row.snaps.filter((s) => s.family).map((s) => {
      const sel = el("select", { "aria-label": `${s.slot} token for ${label}`, "data-import-snap": `${row.path} ${s.slot}` },
        el("option", { value: "", text: `${s.slot}: ${s.value} (${s.outcome})` }),
        ...(view.snapChoices[s.family] ?? []).map((r) => el("option", { value: r, text: r })));
      if (s.ref) sel.value = s.ref;
      sel.addEventListener("change", () => { if (sel.value) edit(view.name, { path: row.path, slot: s.slot, ref: sel.value }); });
      return sel;
    });
    list.appendChild(el("li", { "data-import-row": row.path },
      el("span", { class: "cv-import-path", text: `${row.path} · ${label}` }), rename, remap, ...snaps));
  }
  return list;
}

function renderView(view) {
  const r = view.record;
  const original = el("div", { class: "cv-import-col" }, el("h3", { text: "Original" }));
  if (view.reference) original.appendChild(el("img", { src: view.reference, alt: `The original ${view.name}, as exported from ${r.source.tool}` }));
  else original.appendChild(el("ul", { class: "cv-import-outline", "data-import-outline": true },
    ...view.outline.map((o) => el("li", { text: `${o.path.replace(/^ir/, "")} ${o.kind} ${o.name ?? ""}${o.text ? ` “${o.text}”` : ""}` }))));
  const mapped = el("div", { class: "cv-import-col", "data-import-mapped": true }, el("h3", { text: "Mapped" }));
  for (const c of view.compositions) {
    if (!c) { mapped.appendChild(el("p", { class: "cv-flag", text: "not emitted — see drops" })); continue; }
    try { mapped.appendChild(renderComposition(vocab, c)); }
    catch (e) { mapped.appendChild(el("p", { class: "cv-flag", text: `Refused by the renderer: ${e.message}` })); }
  }
  const drops = el("div", { class: "cv-import-drops", "data-import-drops": true }, el("h3", { text: `Drops (${r.drops.length})` }));
  for (const cls of DROP_CLASSES) {
    const rows = r.drops.filter((d) => d.class === cls);
    drops.appendChild(el("p", { class: "cv-import-drop-class", "data-drop-class": cls, text: `${cls} — ${rows.length}` }));
    if (rows.length) drops.appendChild(el("ul", {}, ...rows.map((d) => el("li", { text: `${d.path} ${d.slot}: ${d.reason}` }))));
  }
  const f = r.fidelity;
  const fidelity = el("p", { class: "cv-import-fidelity", "data-import-fidelity": f.verdict,
    text: `Fidelity: ${f.verdict === "missing" ? "missing — not measured, never a pass" : f.verdict}${f.wcag ? ` · WCAG ${f.wcag.pass}/${f.wcag.total} pairs pass` : ""}` });
  viewBox.replaceChildren(
    el("h2", { class: "cv-import-title", text: `Import ${view.recordId} → proposal ${view.name}` }),
    el("p", { class: "cv-where", "data-import-label": true, text: view.label }),
    el("div", { class: "cv-import-cols" }, original, mapped),
    fidelity,
    el("p", { class: "cv-where", "data-import-unbound": true, text: `${view.unbound.unbound} of ${view.unbound.total} imports in this build arrived unbound` }),
    drops,
    el("h3", { text: "Mapping" }),
    editorRows(view),
  );
  viewBox.hidden = false;
}

// ---- boot ---------------------------------------------------------------------------------------

const toggle = $("[data-canvas-verb=import]");
if (panel && toggle && provenance && slug) {
  const primary = buildPanel();
  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) primary.focus();
  });
  toggle.setAttribute("aria-expanded", "false");
  vocab = await fetch("/handoff/verdant/vocabulary.json").then((r) => r.json());
  const name = qs.get("import");
  if (name) {
    const { status, body } = await api(`/api/canvas/import/view?${new URLSearchParams({ provenance, slug, name })}`);
    if (status === 200) renderView(body);
    else { viewBox.hidden = false; viewBox.replaceChildren(el("p", { class: "cv-flag", role: "alert", text: body.error ?? `HTTP ${status}` })); }
  }
}
