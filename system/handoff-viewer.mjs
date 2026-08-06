// system/handoff-viewer.mjs — hand-written canon (this repo; not generated). View-time
// handoff-pack viewer: one source → engineer docs + agent vocabulary (epic #1, ticket #14;
// architecture §Data model line 39, PRD §6.4).
//
// Two exports mirroring trace-player.mjs's pure/DOM split:
//   prepareHandoff(pack, vocab, graph?) — PURE and DOM-free (so #10 and Node checks can call it):
//     joins the pack's components to the vocabulary by component name, returns
//     { components, composition }. No fetch — the page fetches and hands the pair here
//     (keeps #10 free to inline or preload). The optional third argument (system-graph.json) adds
//     the docs join #215/#218 consume — example · wrapper · tokens · consumer — at view time and
//     with no new generated artifact (#211); omit it and those fields degrade to null.
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

// prepareHandoff(pack, vocab, graph = null) → { components, composition }. Pure (no DOM) so it runs
// under Node. Throws a plain Error if the pack is corrupt (it is generated, not user input).
//
// The third argument is system/system-graph.json, and it is OPTIONAL by design: handoff.html's
// shipped two-arg call keeps working byte-for-byte, and a caller that wants the fuller picture
// passes the graph. What the join adds per component — `example`, `wrapper`, `tokens`, `consumer` —
// is what the component catalog (#215) and the studio inspector (#218) need, and it is computed HERE,
// AT VIEW TIME, from three artifacts that already exist. There is deliberately NO generated
// catalog.json: a fourth artifact joining three others is a fourth thing that can drift, and the
// join is cheap and pure (epic #202; architecture §Data model, "Docs catalog carries no new
// generated artifact").
//
// No token VALUE is computed or carried anywhere in here. The `packs` values that ride along on a
// token entry are system-graph.json's own committed text — the packs' RAW declared bindings, aliases
// unresolved — and a consumer wanting a real resolved colour asks getComputedStyle at view time, the
// rule inspect.mjs already obeys.
export function prepareHandoff(pack, vocab, graph = null) {
  // Shallow on purpose: pack.json is a trusted, CI-drift-checked generated artifact, not user
  // input — a top-level shape check is enough. (Deeper than trace-player's parseTrace, which
  // guards an externally-recorded file.)
  if (!pack || !Array.isArray(pack.components) || !pack.components.length)
    throw new Error("handoff: pack.components missing or empty");
  const vocabComponents = (vocab && vocab.components) || {};
  // Same shallow-trust posture as the pack check above: these are generated, CI-drift-checked
  // artifacts, so an absent or malformed graph degrades every joined field to null rather than
  // throwing — which is exactly what makes the two-arg call site work unchanged.
  const wrapperFiles = new Set(pack.portability?.webComponents?.files ?? []);
  const graphTokens = Array.isArray(graph?.tokens) ? new Map(graph.tokens.map((t) => [t.name, t])) : null;
  // Filtered before the Map: 23 of the graph's 33 consumers are structural blocks carrying
  // `spec: ""`, which would all collapse onto the key "" and silently leave the last one winning.
  // The sole lookup below never asks for "", so this costs nothing today — it is here so a future
  // caller iterating .values() (#215/#218) does not inherit a wrong consumer (PR #242 review, Low 2).
  const graphConsumers = Array.isArray(graph?.consumers) ? new Map(graph.consumers.filter((k) => k.spec).map((k) => [k.spec, k])) : null;
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
      // aiPatterns is optional (#41) — include it in the head projection only when the spec
      // actually carries it, so a non-AI component's "Source (spec head)" JSON stays a faithful
      // picture of its real head (no injected `null` key). The dedicated block below is the
      // legible projection of the same array.
      ...(c.aiPatterns ? { aiPatterns: c.aiPatterns } : {}),
      // example is optional too (#211) — same conditional-spread reason as aiPatterns: this object
      // is an explicit field PICK, not `...c`, so an added head key is silently dropped unless it is
      // named here, and injecting a `null` key would make the "Source (spec head)" JSON a picture of
      // a head that does not exist.
      ...(c.example ? { example: c.example } : {}),
    };
    return {
      name: c.component,
      status: c.status,
      className: c.class,
      contractPath: c.contract ?? null, // pack's contract is a PATH STRING (or null)
      head,
      aiPatterns: c.aiPatterns ?? null, // carried out for the dedicated rubric block (null on non-AI specs)
      sections: c.sections,
      // vocab entry's own `.contract` is the full INLINED DataContract object (or null) —
      // a different shape from contractPath; the vocab <pre> shows it, that's the point.
      vocab: vocabComponents[c.component] ?? null,
      // The live playground's starting props (#211), or null. Read off the PACK, never the
      // vocabulary: `example` is deliberately not projected into vocabulary.json, which is a prompt
      // input the composition and build recorders are fenced against being fed (gen-vocabulary.mjs).
      example: c.example ?? null,
      // Wrapper presence — read off the pack's OWN portability block; no new input, no fs. Joined on
      // the component's CLASS, not its name: wrappers are wc/vd-plant-card.mjs, and library
      // primitives like metric-tile (class ds-metric-tile) correctly have none. 3 of 10 today; the 7
      // missing wrappers are riding debt the architecture records, and the catalog's vd-* code tab
      // stays presence-gated on this rather than promising a file that is not in the pack.
      wrapper: wrapperFiles.has(`wc/${c.class}.mjs`) ? `wc/${c.class}.mjs` : null,
      // Token bindings — resolved against the ALREADY-COMMITTED system-graph. An unresolved name
      // degrades to a null `group` rather than being dropped, so a spec declaring a token the
      // contract does not have stays VISIBLE to a caller instead of silently shortening the array.
      tokens: graphTokens && Array.isArray(c.tokens)
        ? c.tokens.map((t) => graphTokens.get(t) ?? { name: t, group: null, packs: {} })
        : null,
      // The components.css block that MEASURABLY consumes tokens for this spec, or null when the
      // block is structural-only (gen-system-graph.mjs drops zero-token blocks) or absent entirely.
      consumer: graphConsumers ? graphConsumers.get(`system/specs/${c.component}.md`) ?? null : null,
    };
  });
  return { components, composition: (vocab && vocab.composition) ?? null };
}

// --- Markdown-subset renderer (private) ----------------------------------------------------

// Inline pass: split on **bold** / `code`, classify each piece, build text/element nodes.
// Bold and code are never nested in this data, so a single-regex split suffices. Empty
// strings (between adjacent tokens and at the ends of split()) are skipped.
// Assumes every `**` in the pack data is a paired bold marker — two `**` with no `*` between
// them span as one bold run (all committed section bodies have even, adjacent pairs; a future
// spec edit introducing an unpaired `**` would mis-render).
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

    // AI-UX patterns carried (#41) — the component-level half of the five-pillar rubric, shown
    // as a legible highlight when the spec declares them (the same array also appears in the
    // Source (spec head) JSON below). pillar · pattern is the emphasis, `how` the muted detail.
    if (c.aiPatterns?.length) {
      const ai = el("section", { class: "hv-aipatterns" });
      ai.appendChild(el("div", { class: "hv-eyebrow", text: "AI-UX patterns carried" }));
      for (const p of c.aiPatterns) {
        const row = el("div", { class: "hv-aipattern" });
        row.appendChild(el("p", { class: "hv-aipattern-head" },
          el("strong", { text: p.pillar }),
          document.createTextNode(` · ${p.pattern}`)));
        row.appendChild(el("p", { class: "hv-aipattern-how hv-muted", text: p.how }));
        ai.appendChild(row);
      }
      article.appendChild(ai);
    }

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
    const vocabEyebrow = el("div", { class: "hv-eyebrow", text: "Agent vocabulary (generated from the same head)" });
    vocabSec.appendChild(vocabEyebrow);
    if (c.vocab) {
      // Copy agent prompt (portfolio-ux-uplift §Phase 5): a self-contained excerpt — the
      // composition grammar + this component's entry — an agent could compose against.
      // 100% generated data (vocabulary.json content); the label names exactly what it is.
      // Rides the eyebrow like the DataContract link above (docsEyebrow idiom).
      const copyBtn = el("button", { type: "button", class: "btn btn-secondary hv-copy", text: "Copy agent prompt" });
      let copyTimer = null;
      copyBtn.addEventListener("click", () => {
        if (copyTimer) { clearTimeout(copyTimer); copyTimer = null; }
        const done = (label) => {
          copyBtn.textContent = label;
          copyTimer = setTimeout(() => { copyBtn.textContent = "Copy agent prompt"; copyTimer = null; }, 1600);
        };
        const excerpt = JSON.stringify(
          { composition: model.composition, components: { [c.name]: c.vocab } },
          null,
          2
        );
        navigator.clipboard.writeText(excerpt).then(() => done("Copied ✓"), () => done("Copy failed"));
      });
      vocabEyebrow.appendChild(copyBtn);
      vocabSec.appendChild(el("pre", { class: "hv-json" }, el("code", { text: JSON.stringify(c.vocab, null, 2) })));
    } else {
      vocabSec.appendChild(el("p", { class: "hv-p hv-muted", text: "not in the agent vocabulary" }));
    }
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
