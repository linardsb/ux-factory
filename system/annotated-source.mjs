// system/annotated-source.mjs — hand-written canon (this repo; not generated). View-time
// renderer for the annotated-source blocks on approach.html
// (docs/epics/annotated-source-glossary.architecture.md; PRD §6 legibility bar — the blocks
// read as evidence, not pedagogy: real shipped code beside the author's plain-English prose).
//
// Two exports mirroring handoff-viewer.mjs's pure/DOM split:
//   prepareAnnotatedSource(data) — PURE and DOM-free (Node-import safe). Shallow shape check
//     only: system/annotated-source.json is a trusted, CI-drift-checked generated artifact,
//     not user input (same posture as prepareHandoff). Returns { snippets, byId }. No fetch —
//     the page fetches and hands the JSON here.
//   renderAnnotatedSource(container, model, id) — builds one figure: eyebrow (file · lines ·
//     extraction statement) · title · the extracted code verbatim · the prose. Content is
//     built element-by-element via textContent — never innerHTML from data. The module
//     injects no <style> (portfolio.css owns the classes). Returns { destroy }.

// --- DOM builder (agentic-renderer.mjs shape) — text via textContent, attrs via setAttribute.
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

// prepareAnnotatedSource(data) → { snippets, byId }. Pure (no DOM) so it runs under Node.
export function prepareAnnotatedSource(data) {
  if (!data || !Array.isArray(data.snippets) || !data.snippets.length)
    throw new Error("annotated-source: snippets missing or empty");
  const byId = {};
  for (const s of data.snippets) {
    if (byId[s.id]) throw new Error(`annotated-source: duplicate snippet id "${s.id}"`);
    byId[s.id] = s;
  }
  return { snippets: data.snippets, byId };
}

// renderAnnotatedSource(container, model, id) — render one snippet into container.
export function renderAnnotatedSource(container, model, id) {
  const s = model.byId[id];
  if (!s) throw new Error(`annotated-source: unknown snippet "${id}"`);
  container.textContent = ""; // mirror handoff-viewer.mjs — clear before (re)render

  const note = el("div", { class: "asrc-note" });
  for (const p of s.prose) note.appendChild(el("p", { text: p }));

  container.appendChild(
    el("figure", { class: "asrc-block" },
      // Eyebrow reuses the SHIPPED .card-kicker register (precedent: trace-player.mjs emits
      // shipped .btn classes). Factual honesty framing — file · lines · how it got here.
      el("figcaption", { class: "card-kicker", text: `${s.file} · lines ${s.startLine}–${s.endLine} · extracted from the shipped source at build time` }),
      el("h3", { class: "asrc-title", text: s.title }),
      el("pre", { class: "asrc-code" }, el("code", { text: s.code })),
      note
    )
  );

  const destroy = () => { container.textContent = ""; };
  return { destroy };
}
