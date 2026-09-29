// portal/public/canvas-import.mjs — hand-written canon (this repo; not generated). The canvas page's
// IMPORT: the panel (Import selection, the mode choice, the refusal, the drop zone), the side-by-side
// view (the original beside what it became in this system's parts) and the mapping editor (epic #295
// ticket #311; .claude/plans/import-run-recorded-import-311.md Task 6.1). Loaded by canvas.html beside
// canvas.mjs; the server half is portal/lib/import-run.mjs.
//
// FOUR CALLS:
//   1. AFTER AN IMPORT THE PAGE RELOADS, with ?import=<name>. The server appended a component.propose
//      line, and the canvas's undo history is per mount: a reload starts it after the import, so the
//      page's next undo can never target the server's line (foldLedger is last-in-first-out and would
//      refuse it), and the page's base is fresh.
//   2. A REFUSAL IS SHOWN WITH ONE ACTION and nothing else. No retry: the owner decides. "Import again"
//      (not-paired) and "Re-bind" (stale-binding → the binding check) are that one action, run only on
//      the owner's click — never a loop (#311 PR B, .claude/plans/import-run-live-read-311-pr-b.md
//      Task 6.1). A refusal's `detail` is the bridge's own words, shown verbatim as a second line.
//   3. EVERY STRING FROM A PACKAGE OR A READ IS textContent — names, drop reasons and the drawing's
//      own words are someone else's, and nothing here builds markup from a string.
//   4. NOTHING TALKS TO BRILLIANT ON LOAD. The binding check and Browse spawn the bridge, which may
//      open a pairing tab in the owner's browser, so each runs only on a click. The binding line a
//      live import reported is kept in sessionStorage across the reload (a convenience: absent, the
//      line says "not checked yet", which stays true).

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
let checking = false;
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
// The measurement's messages live IN THE VIEW (#474): the panel is hidden independently of the view, so
// a refusal written into refusalBox is invisible to an owner who opened the import by ?import=.
const measureRefusal = el("div", { class: "cv-import-refusal", role: "alert", "data-import-measure-refusal": true });
const measureStatus = el("p", { class: "cv-import-status", role: "status", "data-import-measure-status": true });
let currentName = null;
const modeValue = () => Number(panel.querySelector("input[name=cv-import-mode]:checked")?.value ?? 1);
const bindingLine = el("p", { class: "cv-import-binding", "data-import-binding": true, text: "Reads: not checked yet" });
const browseBox = el("div", { class: "cv-import-browse", "data-import-browse-box": true, hidden: true });
const BINDING_KEY = `uxf-import-binding:${provenance}/${slug}`;

// `binding` is bindingOf()'s shape ({ project, surface, otherTabs, … }) or null (no _meta on the reply).
function showBinding(binding, { selected = null, suffix = "" } = {}) {
  const parts = [`Reads: ${binding?.project || "this tab's project (name not exposed)"}`];
  if (binding?.surface) parts.push(binding.surface);
  if (binding?.otherTabs > 0) parts.push(`${binding.otherTabs} other tab${binding.otherTabs === 1 ? "" : "s"}`);
  if (selected != null) parts.push(`${selected} selected`);
  if (suffix) parts.push(suffix);
  bindingLine.textContent = parts.join(" · ");
}

function showRefusal(refused, box = refusalBox) {
  box.replaceChildren();
  if (!refused) return;
  box.appendChild(el("p", { text: refused.message }));
  if (refused.detail) box.appendChild(el("p", { class: "cv-import-hint", "data-import-detail": true, text: refused.detail }));
  const a = refused.action ?? {};
  const act = a.href
    ? el("a", { class: "btn btn-secondary cv-btn", href: a.href, target: "_blank", rel: "noopener", "data-import-action": true, text: a.label })
    : el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-import-action": true, text: a.label });
  if (!a.href) act.addEventListener("click", () => {
    if (a.reload) location.reload();
    else if (a.route === "binding") checkBinding();
    else if (a.retry) importSelection();
    else if (a.measure) measureFidelity(currentName);
    else if (a.hint) (box === refusalBox ? statusLine : measureStatus).textContent = `Run: ${a.hint}`;
    else if (box === measureRefusal) measureFidelity(currentName);
    else dropInput.focus();
  });
  box.appendChild(act);
  if (a.hint) box.appendChild(el("p", { class: "cv-import-hint", text: a.hint }));
}

const httpRefusal = (status, body) => ({ message: body.error ?? `HTTP ${status}`, action: { label: "Reload the page", reload: true } });

// `live`: the import read Brilliant, so its response's binding is what the read reached.
async function done({ status, body }, { live = false } = {}) {
  busy = false;
  if (status !== 200) { statusLine.textContent = ""; showRefusal(httpRefusal(status, body)); return; }
  if (body.refused) { statusLine.textContent = ""; showRefusal(body.refused); return; }
  if (live) try { sessionStorage.setItem(BINDING_KEY, JSON.stringify(body.binding ?? null)); } catch { /* storage off: the line resets */ }
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
  }), { live: true });
}

// Which project a read reaches. Spawns the bridge, so only on a click (header call 4).
async function checkBinding() {
  if (checking || busy) return;
  checking = true;
  showRefusal(null);
  bindingLine.textContent = "Reads: checking…";
  const { status, body } = await api("/api/canvas/import/binding", { method: "POST" });
  checking = false;
  if (status !== 200 || body.refused) {
    bindingLine.textContent = "Reads: unknown — the check was refused";
    showRefusal(status !== 200 ? httpRefusal(status, body) : body.refused);
    return;
  }
  showBinding(body.binding, { selected: body.selected });
}

// Browse the page: the top-level elements as toggle tiles; the owner picks, then imports by id.
async function browsePage(refresh = false) {
  if (busy || checking) return;
  busy = true;
  showRefusal(null);
  statusLine.textContent = refresh ? "Re-reading the page in Brilliant…" : "Reading the page in Brilliant…";
  const { status, body } = await api(`/api/canvas/import/browse${refresh ? "?refresh=1" : ""}`);
  busy = false;
  statusLine.textContent = "";
  if (status !== 200) { showRefusal(httpRefusal(status, body)); return; }
  if (body.refused) { showRefusal(body.refused); return; }
  showBinding(body.binding);
  renderTiles(body);
}

function renderTiles(body) {
  const picked = new Set();
  const importBtn = el("button", { type: "button", class: "btn btn-primary cv-btn", "data-import-browse-import": true, text: "Import 0 selected" });
  importBtn.disabled = true;
  const sync = () => { importBtn.textContent = `Import ${picked.size} selected`; importBtn.disabled = picked.size === 0; };
  const tiles = body.elements.map((e) => {
    const img = el("img", { alt: e.name || e.type });
    // Only the server's own thumbnail shape reaches src.
    if (typeof e.thumb === "string" && e.thumb.startsWith("data:image/png;base64,")) img.src = e.thumb;
    const tile = el("button", { type: "button", class: "cv-import-tile", "aria-pressed": "false", "data-import-tile": e.id }, img, el("span", { text: e.name || e.type }));
    tile.addEventListener("click", () => {
      if (picked.has(e.id)) picked.delete(e.id); else picked.add(e.id);
      tile.setAttribute("aria-pressed", String(picked.has(e.id)));
      sync();
    });
    return tile;
  });
  importBtn.addEventListener("click", async () => {
    if (busy || !picked.size) return;
    busy = true;
    showRefusal(null);
    statusLine.textContent = `Reading ${picked.size} element(s) in Brilliant…`;
    done(await api("/api/canvas/import", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ provenance, slug, base: getCanvasPage().count, entrance: "ids", ids: [...picked], mode: modeValue() }),
    }), { live: true });
  });
  const refresh = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-import-browse-refresh": true, text: "Refresh" });
  refresh.addEventListener("click", () => browsePage(true));
  const n = body.elements.length;
  const count = body.truncated ? `Showing ${n} of ${body.total}` : `${n} top-level element${n === 1 ? "" : "s"}`;
  browseBox.replaceChildren(
    el("p", { class: "cv-import-hint", "data-import-browse-count": true, text: body.cached ? `${count} · from this session's cache — Refresh to re-read` : count }),
    el("div", { class: "cv-import-tiles", "data-import-tiles": true }, ...tiles),
    el("div", { class: "cv-import-actions" }, importBtn, refresh),
  );
  browseBox.hidden = false;
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
  const browseBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-import-browse": true, text: "Browse the page" });
  browseBtn.addEventListener("click", () => browsePage(false));
  const check = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-import-binding-check": true, text: "Check binding" });
  check.addEventListener("click", checkBinding);
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
    el("div", { class: "cv-import-actions" }, bindingLine, check),
    el("div", { class: "cv-import-actions" }, primary, browseBtn),
    browseBox, mode, refusalBox, statusLine, zone,
  );
  try {
    const kept = sessionStorage.getItem(BINDING_KEY);
    if (kept !== null) showBinding(JSON.parse(kept), { suffix: "at the last Brilliant read" });
  } catch { /* storage off or unreadable: the line stays "not checked yet" */ }
  return primary;
}

// ---- the view and the editor -------------------------------------------------------------------

// #474: render the importer's composition, measure it against the reference, and show the verdict.
async function measureFidelity(name) {
  const btn = viewBox.querySelector("[data-import-measure]");
  if (btn) btn.disabled = true;
  showRefusal(null, measureRefusal);
  measureStatus.textContent = "Rendering the candidate and measuring…";
  try {
    const { status, body } = await api("/api/canvas/import/measure", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provenance, slug, name }),
    });
    if (status !== 200) { measureStatus.textContent = ""; showRefusal(httpRefusal(status, body), measureRefusal); return; }
    if (body.refused) { measureStatus.textContent = ""; showRefusal(body.refused, measureRefusal); return; }
    renderView(body.view);
    measureStatus.textContent = `Measured: ${body.verdict}, worst ΔE ${body.worst?.value ?? "—"}`;
  } finally {
    const b = viewBox.querySelector("[data-import-measure]");
    if (b) b.disabled = false;
  }
}

async function edit(name, e) {
  statusLine.textContent = "Re-deriving…";
  const { status, body } = await api("/api/canvas/import/mapping", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provenance, slug, name, edit: e }),
  });
  if (status !== 200) { statusLine.textContent = `Refused: ${body.error}`; return; }
  statusLine.textContent = "Mapping saved; the record, markdown and drafts were re-derived.";
  // An edit clears any measurement (#474 D6), so the last one's words go too.
  measureStatus.textContent = "";
  showRefusal(null, measureRefusal);
  renderView(body);
}

// #455: Jev's ranked candidates for a part the matcher could not name. A Use button only for a slug
// with a builder — editMapping refuses any other — and the click is the owner's ordinary mapping edit.
function suggestionHint(view, row, s) {
  const items = s.top.map((t) => {
    const p = t.p.toFixed(2);
    if (t.slug === "none") return el("span", { text: `none ${p}` });
    if (!view.builders.includes(t.slug)) return el("span", { text: `${t.slug} ${p} — no builder yet` });
    const use = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-import-use": `${row.path} ${t.slug}`, text: `Use ${t.slug} (${p})` });
    use.addEventListener("click", () => edit(view.name, { path: row.path, map: t.slug }));
    return use;
  });
  const kids = items.flatMap((n, i) => (i ? [" · ", n] : [n]));
  return el("p", { class: "cv-import-hint", "data-import-suggest": row.path }, "Jev suggests (unratified): ", ...kids,
    s.top[0]?.slug === "none" ? " — top pick is none: likely a new component" : null);
}

function editorRows(view) {
  const list = el("ul", { class: "cv-import-editor", "data-import-editor": true });
  const suggested = new Map((view.record.suggestions ?? []).map((s) => [s.path, s]));
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
    const s = suggested.get(row.path);
    list.appendChild(el("li", { "data-import-row": row.path },
      el("span", { class: "cv-import-path", text: `${row.path} · ${label}` }), rename, remap, ...snaps, s ? suggestionHint(view, row, s) : null));
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
  const worst = f.deltaEMin?.worst;
  const fidelity = el("p", { class: "cv-import-fidelity", "data-import-fidelity": f.verdict,
    text: `Fidelity: ${f.verdict === "missing" ? "missing — not measured, never a pass" : f.verdict}${worst ? ` · worst ΔE ${worst.value} at ${worst.region} (threshold ${f.deltaEMin.threshold})` : ""}${f.wcag ? ` · WCAG ${f.wcag.pass}/${f.wcag.total} pairs pass` : ""}` });
  currentName = view.name;
  let measure = null;
  if (view.measurable) {
    measure = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-import-measure": true, text: f.deltaEMin ? "Measure again" : "Measure fidelity" });
    measure.addEventListener("click", () => measureFidelity(view.name));
  }
  viewBox.replaceChildren(
    el("h2", { class: "cv-import-title", text: `Import ${view.recordId} → proposal ${view.name}` }),
    el("p", { class: "cv-where", "data-import-label": true, text: view.label }),
    el("div", { class: "cv-import-cols" }, original, mapped),
    fidelity, ...(measure ? [measure] : []), measureStatus, measureRefusal,
    el("p", { class: "cv-where", "data-import-unbound": true, text: `${view.unbound.unbound} of ${view.unbound.total} imports in this build arrived unbound` }),
    drops,
    el("p", { class: "cv-where", "data-import-suggest-status": true, text: r.suggestions?.length
      ? `Machine suggestions (Jev, unratified): ${r.suggestions.length} node(s)`
      : "Machine suggestions: none on this record (see the import transcript)." }),
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
