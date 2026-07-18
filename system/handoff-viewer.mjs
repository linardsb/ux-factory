// system/handoff-viewer.mjs — hand-written canon (this repo; not generated). View-time
// handoff-pack viewer: one source → engineer docs + agent vocabulary (epic #1, ticket #14;
// architecture §Data model line 39, PRD §6.4).
//
// Two exports mirroring trace-player.mjs's pure/DOM split:
//   prepareHandoff(pack, vocab) — PURE and DOM-free (so #10 and Node checks can call it):
//     joins the pack's components to the vocabulary by component name, returns
//     { components, composition }. No fetch — the page fetches and hands the pair here
//     (keeps #10 free to inline or preload).
//   renderHandoffViewer(container, model) — builds the DOM: per component, three projections
//     of one source side by side — the spec head (source) · the engineer prose · the agent
//     vocabulary entry generated from that same head. Adjacency is the argument (PRD §6:
//     shown, not told) — no pedagogy callout. Returns a destroy() for #10 to call before
//     re-rendering. Semantic classes only; the module injects no <style> (handoff.html owns it).
//
// Prose sections carry a bounded markdown subset — the exhaustive construct census across all
// 28 section bodies: paragraphs (with \n soft-breaks), **bold**, `code`, `- ` unordered lists,
// pipe tables (with a |---| separator to drop), and ```json fences. A private line-walking
// renderer handles exactly that and nothing more (headings/links/blockquotes/ordered-lists
// have census 0 — building them is a zero-dep violation + YAGNI). Content is built
// element-by-element via textContent — never innerHTML from data.

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

// prepareHandoff(pack, vocab) → { components, composition }. Pure (no DOM) so it runs under
// Node. Throws a plain Error if the pack is corrupt (it is generated, not user input).
export function prepareHandoff(pack, vocab) {
  if (!pack || !Array.isArray(pack.components) || !pack.components.length)
    throw new Error("handoff: pack.components missing or empty");
  const vocabComponents = (vocab && vocab.components) || {};
  const components = pack.components.map((c) => {
    // Only the machine-head fields — explicitly picked, NOT `...c`: the pack component also
    // carries `contract` (a path string) and `sections` (prose), which render elsewhere.
    const head = {
      component: c.component,
      status: c.status,
      class: c.class,
      props: c.props,
      tokens: c.tokens,
      states: c.states,
      children: c.children,
    };
    return {
      name: c.component,
      status: c.status,
      className: c.class,
      contractPath: c.contract ?? null, // pack's contract is a PATH STRING (or null)
      head,
      sections: c.sections,
      // vocab entry's own `.contract` is the full INLINED DataContract object (or null) —
      // a different shape from contractPath; the vocab <pre> shows it, that's the point.
      vocab: vocabComponents[c.component] ?? null,
    };
  });
  return { components, composition: (vocab && vocab.composition) ?? null };
}

// --- Markdown-subset renderer (private) ----------------------------------------------------

// Inline pass: split on **bold** / `code`, classify each piece, build text/element nodes.
// Bold and code are never nested in this data, so a single-regex split suffices. Empty
// strings (between adjacent tokens and at the ends of split()) are skipped.
function inlineInto(node, text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  for (const part of parts) {
    if (!part) continue;
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**"))
      node.appendChild(el("strong", { text: part.slice(2, -2) }));
    else if (part.length > 2 && part.startsWith("`") && part.endsWith("`"))
      node.appendChild(el("code", { class: "hv-inline-code", text: part.slice(1, -1) }));
    else node.appendChild(document.createTextNode(part));
  }
  return node;
}

// Split a `| a | b |` row into cells, dropping the empty leading/trailing cells the bounding
// pipes produce. (No escaped pipes in this data — the census is bounded.)
function splitRow(row) {
  const cells = row.trim().split("|");
  if (cells.length && cells[0].trim() === "") cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
  return cells;
}

// renderMarkdown(container, md) — a line-walker (NOT blank-line block-splitting: a multi-line
// fence would break that). Detection order: fence → list → table → paragraph.
function renderMarkdown(container, md) {
  const lines = String(md).split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // blank
    if (!trimmed) { i++; continue; }

    // fence — triple backtick opens; consume raw until the closing fence, never parsed.
    if (trimmed.startsWith("```")) {
      i++; // skip the opening fence
      const buf = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) buf.push(lines[i++]);
      i++; // skip the closing fence (if present)
      container.appendChild(el("pre", { class: "hv-code" }, el("code", { text: buf.join("\n") })));
      continue;
    }

    // list — consecutive `- `/`* ` items (no blank line between them in this data).
    if (/^[-*] /.test(line.trimStart())) {
      const ul = el("ul", { class: "hv-list" });
      while (i < lines.length && /^[-*] /.test(lines[i].trimStart())) {
        ul.appendChild(inlineInto(el("li", {}), lines[i].trimStart().replace(/^[-*] /, "")));
        i++;
      }
      container.appendChild(ul);
      continue;
    }

    // table — consecutive `|` rows; first is <th>, the |---| separator is dropped.
    if (line.trimStart().startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) rows.push(lines[i++]);
      const table = el("table", { class: "hv-table" });
      let headerDone = false;
      for (const row of rows) {
        const cells = splitRow(row);
        if (cells.every((c) => /^:?-+:?$/.test(c.trim()))) continue; // drop separator row
        const tr = el("tr", {});
        const tag = headerDone ? "td" : "th";
        for (const c of cells) tr.appendChild(inlineInto(el(tag, {}), c.trim()));
        table.appendChild(tr);
        headerDone = true;
      }
      container.appendChild(table);
      continue;
    }

    // paragraph — consume consecutive non-blank/list/table/fence lines; internal \n
    // soft-breaks collapse to whitespace (join on space), never a block break.
    const buf = [];
    while (i < lines.length) {
      const l = lines[i];
      const t = l.trim();
      if (!t || t.startsWith("```") || /^[-*] /.test(l.trimStart()) || l.trimStart().startsWith("|")) break;
      buf.push(t);
      i++;
    }
    container.appendChild(inlineInto(el("p", { class: "hv-p" }), buf.join(" ")));
  }
  return container;
}

// --- The viewer ----------------------------------------------------------------------------

// renderHandoffViewer(container, model) where model = { components, composition }.
export function renderHandoffViewer(container, model) {
  container.textContent = ""; // mirror trace-player.mjs — clear before (re)render
  const root = el("div", { class: "hv-root" });

  // Page-level composition contract the vocabulary declares — plain prose, descriptive label.
  if (model.composition) {
    const panel = el("section", { class: "hv-composition" });
    panel.appendChild(el("div", { class: "hv-eyebrow", text: "Composition contract" }));
    for (const key of ["shape", "childrenRule", "chipRule"])
      if (model.composition[key]) panel.appendChild(el("p", { class: "hv-p", text: model.composition[key] }));
    root.appendChild(panel);
  }

  for (const c of model.components) {
    const article = el("article", { class: "hv-component" });

    const head = el("header", { class: "hv-component-head" });
    head.appendChild(el("h2", { class: "hv-name", text: c.name }));
    head.appendChild(el("span", { class: "hv-class", text: c.className }));
    // Honesty surface: a non-shipped status is shown, not hidden (not a pedagogy callout).
    if (c.status && c.status !== "shipped") head.appendChild(el("span", { class: "hv-status", text: c.status }));
    article.appendChild(head);

    const grid = el("div", { class: "hv-grid" });

    // Projection 1 — the machine head (source).
    const headSec = el("section", { class: "hv-head" });
    headSec.appendChild(el("div", { class: "hv-eyebrow", text: "Source (spec head)" }));
    headSec.appendChild(el("pre", { class: "hv-json" }, el("code", { text: JSON.stringify(c.head, null, 2) })));
    grid.appendChild(headSec);

    // Projection 2 — the human docs (rendered prose). The contract link rides the eyebrow.
    const docsSec = el("section", { class: "hv-docs" });
    const docsEyebrow = el("div", { class: "hv-eyebrow", text: "Engineer docs" });
    if (c.contractPath)
      docsEyebrow.appendChild(el("a", { class: "hv-contract-link", href: `/handoff/verdant/${c.contractPath}`, text: " · DataContract" }));
    docsSec.appendChild(docsEyebrow);
    for (const sec of c.sections || []) {
      docsSec.appendChild(el("h3", { class: "hv-section-title", text: sec.title }));
      renderMarkdown(docsSec, sec.body);
    }
    grid.appendChild(docsSec);

    // Projection 3 — the agent vocabulary entry, generated from the same head.
    const vocabSec = el("section", { class: "hv-vocab" });
    vocabSec.appendChild(el("div", { class: "hv-eyebrow", text: "Agent vocabulary (generated from the same head)" }));
    if (c.vocab)
      vocabSec.appendChild(el("pre", { class: "hv-json" }, el("code", { text: JSON.stringify(c.vocab, null, 2) })));
    else
      vocabSec.appendChild(el("p", { class: "hv-p hv-muted", text: "not in the agent vocabulary" }));
    grid.appendChild(vocabSec);

    article.appendChild(grid);
    root.appendChild(article);
  }

  container.appendChild(root);

  // Parity with trace-player.mjs: the embedder (#10) must call destroy() before re-rendering.
  // No document-level listeners here, so it only clears the container — the contract is kept.
  const destroy = () => { container.textContent = ""; };
  return { destroy };
}
