// portal/public/canvas-groups.mjs — hand-written canon (this repo; not generated). The canvas page's GROUPS: the
// inspector's three group fieldsets (save parts as a group, place a group, a copy's overrides) and Promote (epic #295
// ticket #315, G3, G17; .claude/plans/compose-and-name-groups-315.md Task 4.1). Loaded by canvas.mjs, which owns the
// document and the one undo stack; the server half of Promote is portal/lib/promote.mjs.
//
// THREE CALLS:
//   1. DEFINE AND PLACE ARE THE OWNER'S OPS on the page's one undo stack: each fieldset emits a ui.group-* action and
//      canvas.mjs's consumer applies group.define / group.place through the REAL applier, so a bad selection is
//      refused at the gesture. The selection is checkboxes over the frame's resolved tree — the page has no
//      part-selection model on the stage, and group.define derives the parts from the ids, never carries them.
//   2. PROMOTE RELOADS, with ?promoted=<name> (canvas-import.mjs call 1's rule): the server appends a
//      component.propose line the page's history never saw, so a reload starts the undo stack after it. A save in
//      flight refuses Promote on the page; the server's 409 is the second line.
//   3. EVERY STRING FROM A PACKAGE IS textContent — group names, part ids and a copy's text are the owner's words.

import { frameTree, groupInstances } from "/system/canvas-ops.mjs";
import { ratifySection } from "/canvas-ratify.mjs";

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

const qs = new URLSearchParams(location.search);
const provenance = qs.get("provenance");
const slug = qs.get("slug");
const TEXT_PROPS = ["label", "content", "hint", "placeholder", "title"];

const api = async (url, init) => {
  const r = await fetch(url, init);
  const body = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  return { status: r.status, body };
};

const walk = (n, fn) => {
  if (!n || typeof n !== "object") return;
  fn(n);
  for (const c of Array.isArray(n.children) ? n.children : []) walk(c, fn);
};

// groupFieldsets(f, { view, doc, emitFrom, lane, getPage, say }) → fieldsets for openInspector; none off lane A.
export function groupFieldsets(f, { view, doc, emitFrom, lane, getPage, say }) {
  if (lane !== null) return [];
  const groups = Object.values(doc.groups ?? {});
  const out = [];

  // 1. Save parts as a group.
  const parts = [];
  walk(frameTree(view, f.id).tree, (n) => { if (typeof n.id === "string" && !n.id.includes("/")) parts.push(n); });
  if (parts.length) {
    const list = el("div", { class: "cv-checks" });
    for (const n of parts) {
      list.appendChild(el("label", { class: "cv-check" }, el("input", { type: "checkbox", value: n.id, "data-group-part": n.id }), `${n.id} · ${n.name}`));
    }
    const nameIn = el("input", { id: "cv-group-name", "data-group-name": true, autocomplete: "off", maxlength: 40 });
    const target = el("select", { id: "cv-group-target", "data-group-target": true }, el("option", { value: "", text: "a new group" }),
      ...groups.map((g) => el("option", { value: g.id, text: `${g.id} · ${g.name}` })));
    target.addEventListener("change", () => { const g = doc.groups?.[target.value]; if (g) nameIn.value = g.name; });
    const save = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-group-define": true, text: "Save group" });
    save.addEventListener("click", (e) => emitFrom("ui.group-define", e, {
      name: nameIn.value.trim(), partIds: [...list.querySelectorAll("input:checked")].map((b) => b.value), ...(target.value && { groupId: target.value }),
    }));
    out.push(el("fieldset", { class: "cv-fieldset" }, el("legend", { text: "Save parts as a group" }), list,
      el("label", { class: "cv-field", for: "cv-group-name" }, "Name"), nameIn,
      el("label", { class: "cv-field", for: "cv-group-target" }, "Save as"), target, save));
  }

  // 2. Place a group (base frames only — a state inherits its base's copies), and Promote it.
  if (!f.baseId && groups.length) {
    const pick = el("select", { id: "cv-group-pick", "data-group-pick": true }, ...groups.map((g) => el("option", { value: g.id, text: `${g.id} · ${g.name}` })));
    const parents = [];
    walk(f.composition, (n) => { if (n.name !== "group" && typeof n.id === "string" && Array.isArray(n.children)) parents.push(n); });
    const parent = el("select", { id: "cv-group-parent", "data-group-parent": true }, ...parents.map((n) => el("option", { value: n.id, text: `${n.id} · ${n.name}` })));
    const place = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-group-place": true, text: "Place copy" });
    place.disabled = !parents.length;
    place.addEventListener("click", (e) => emitFrom("ui.group-place", e, { groupId: pick.value, parentId: parent.value }));
    const promoteBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-group-promote": true, text: "Promote" });
    promoteBtn.addEventListener("click", () => promote(pick.value, { getPage, say }));
    out.push(el("fieldset", { class: "cv-fieldset" }, el("legend", { text: "Place a group" }),
      el("label", { class: "cv-field", for: "cv-group-pick" }, "Group"), pick,
      el("label", { class: "cv-field", for: "cv-group-parent" }, "Into"), parent,
      ...(parents.length ? [] : [el("p", { class: "cv-flag", text: "This frame has no container with an id to place into." })]),
      place, promoteBtn));
  }

  // 3. The copies on this frame: one text override at a time, merged over the copy's current overrides.
  const copies = groupInstances(doc).filter((i) => i.frameId === f.id);
  if (copies.length) {
    const inst = el("select", { id: "cv-group-instance", "data-group-instance": true }, ...copies.map((c) => el("option", { value: c.instanceId, text: `${c.instanceId} · ${doc.groups?.[c.groupId]?.name ?? c.groupId}` })));
    const partSel = el("select", { id: "cv-group-copy-part", "data-group-copy-part": true });
    const valueIn = el("input", { id: "cv-group-value", "data-group-value": true, autocomplete: "off" });
    const fields = () => {
      const c = copies.find((x) => x.instanceId === inst.value);
      const rows = [];
      walk({ children: doc.groups?.[c?.groupId]?.parts ?? [] }, (n) => {
        for (const k of TEXT_PROPS) if (typeof n.id === "string" && typeof n.props?.[k] === "string") rows.push({ part: n.id, prop: k, value: c?.overrides?.set?.[n.id]?.[k] ?? n.props[k] });
      });
      return rows;
    };
    const fillParts = () => {
      const rows = fields();
      partSel.replaceChildren(...rows.map((r) => el("option", { value: `${r.part} ${r.prop}`, text: `${r.part} · ${r.prop}` })));
      valueIn.value = rows[0]?.value ?? "";
    };
    inst.addEventListener("change", fillParts);
    partSel.addEventListener("change", () => { valueIn.value = fields().find((r) => `${r.part} ${r.prop}` === partSel.value)?.value ?? ""; });
    fillParts();
    const setBtn = el("button", { type: "button", class: "btn btn-secondary cv-btn", "data-group-override": true, text: "Set on this copy" });
    setBtn.addEventListener("click", (e) => {
      const c = copies.find((x) => x.instanceId === inst.value);
      // Split at the LAST space: a prop name never holds one, a part id may (PR #494 review F4).
      const cut = partSel.value.lastIndexOf(" ");
      const part = partSel.value.slice(0, cut), prop = partSel.value.slice(cut + 1);
      if (!c || !part) return;
      const ov = c.overrides ?? {};
      const set = { ...(ov.set ?? {}), [part]: { ...(ov.set?.[part] ?? {}), [prop]: valueIn.value } };
      emitFrom("ui.group-place", e, { instanceId: c.instanceId, overrides: { ...ov, set } });
    });
    out.push(el("fieldset", { class: "cv-fieldset" }, el("legend", { text: "Copies on this frame" }),
      el("label", { class: "cv-field", for: "cv-group-instance" }, "Copy"), inst,
      el("label", { class: "cv-field", for: "cv-group-copy-part" }, "Text"), partSel,
      el("label", { class: "cv-field", for: "cv-group-value" }, "Value"), valueIn, setBtn));
  }
  return out;
}

// Promote: a save in flight refuses on the page; a refusal is said; a 200 reloads at ?promoted=<name> (call 2).
async function promote(groupId, { getPage, say }) {
  const page = getPage();
  if (page.pending.length) { say("Not promoted — a save is still in flight. Try again in a moment."); return; }
  const { status, body } = await api("/api/canvas/promote", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ provenance, slug, base: page.count, groupId }),
  });
  if (status !== 200) { say(`Not promoted — ${body.error ?? `HTTP ${status}`}`); return; }
  if (body.refused) { say(`Not promoted — ${body.refused.message}`); return; }
  history.replaceState(null, "", `?${new URLSearchParams({ provenance, slug, promoted: body.name })}`);
  location.reload();
}

// mountPromoted(getPage) — on boot with ?promoted=<name>: the proposal's label, its dir and the ratify form.
export async function mountPromoted(getPage) {
  const name = qs.get("promoted");
  const panel = document.querySelector("[data-groups-panel]");
  if (!name || !panel) return;
  const { status, body } = await api(`/api/canvas/promote/view?${new URLSearchParams({ provenance, slug, name })}`);
  panel.replaceChildren(el("h2", { class: "cv-groups-title", text: `Promoted ${status === 200 ? `${body.groupId} → proposal ${body.name}` : name}` }));
  if (status !== 200) { panel.appendChild(el("p", { class: "cv-flag", text: body.error ?? `HTTP ${status}` })); panel.hidden = false; return; }
  panel.append(
    el("p", { class: "cv-where", "data-groups-label": true, text: body.label }),
    el("p", { class: "cv-where", "data-groups-dir": true, text: `Written to ${body.dir}` }),
    ratifySection(body, {
      api, provenance, slug, base: () => getPage().count,
      reload: () => { history.replaceState(null, "", `?${new URLSearchParams({ provenance, slug, promoted: body.name })}`); location.reload(); },
    }) ?? el("p", { class: "cv-where", text: `Status: ${body.status}` }),
  );
  panel.hidden = false;
}
