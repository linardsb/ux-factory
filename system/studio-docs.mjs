// system/studio-docs.mjs — hand-written canon (this repo; not generated). The studio's DOCKED
// COMPONENT DOCS (epic #202 — docs/epics/prototype-studio.architecture.md §Other eng-lead calls
// "Docs, two mounts of one source"; ticket #218; .claude/plans/studio-inspector-docs-218.md).
//
// Click — or simply focus — a real component on the /factory canvas and its generated documentation
// opens in the inspector beside the work: the live playground, the API and token tables, the code
// tabs, the committed spec prose. Seven calls are made here so a later editor inherits rather than
// re-argues them.
//
//  1. MOUNT 2 OF TWO, AND IT RENDERS NOTHING ITSELF. renderComponentDocs is imported from
//     system/catalog.mjs, the join is prepareHandoff(pack, vocab, graph) from
//     system/handoff-viewer.mjs, the heading shift is that renderer's own headingTags, and the
//     compaction is one class in system/catalog.css. There is no docs markup in this file at all
//     beyond an empty-state sentence and a refusal sentence. If this module ever needs to DRAW a
//     docs row, that is a missing seam in catalog.mjs, not a licence to copy it — a second copy of
//     a doc fact is exactly what "no generated catalog artifact" was decided to avoid.
//
//  2. THE INDEX IS DERIVED, NOT WRITTEN. className → row comes from the generated pack, and the
//     renderer's root class IS that class (agentic-renderer.mjs's templates emit `component.class`
//     verbatim), so a rename anywhere in the chain moves both sides together and build-checks
//     group 23 goes red the day they stop agreeing. It is NOT an extension of
//     system/pattern-render.mjs's INSPECT_IDS: that list is hand-copied from inspect-data.json,
//     covers three primitives, and an unknown id there aborts the whole inspect activation. This
//     one is generated, covers every pack component, and its failure mode is one dead click. Two
//     lists, two jobs, two sources — merging them would give the merged list both failure modes.
//
//  3. LAZY BY DISCRIMINATOR, AND THE DISCRIMINATOR IS THE POINT. Nothing is fetched until the stage
//     holds a COMPILED_SELECTOR node — i.e. until the visitor presses Compile. At rest this page has
//     issued no request for this panel, which is the property #206 argued for the three absorbed
//     exhibits and the property the pixel gate depends on. An eager fetch here would be invisible to
//     every gate in the repo — identical pixels, no artifact, no browser in CI — so the RULE is a
//     pure function (shouldLoad) gated by build-checks group 23, and the WIRING is
//     tooling/studio-journey.mjs's docsPass, which is the only thing that can see it.
//
//  4. DELEGATION, NOT PER-NODE LISTENERS. A compile, a revert, a ?b= restore, a method redraft and
//     an undo all replace the nodes on the stage. Two listeners on canvas.stage cannot be orphaned
//     by any of them; N listeners on N components would be.
//
//  5. NO ANNOUNCEMENT, DELIBERATELY. focusin fires on every Tab step through a compiled screen, so
//     a say() per focus would turn the canvas's ONE live region into noise for the reader most
//     likely to be using it. The affordance is stated ONCE, statically, as a visible caption every
//     trigger points at through aria-describedby — studio-verbs.mjs's #stx-move-help idiom, and
//     that file's recorded call that each affordance gets its OWN element rather than extending
//     someone else's sentence.
//
//  6. NO BUS VERB, DELIBERATELY. Reading docs is not a canvas verb: pointer and keyboard converge
//     natively (click and focusin), and no agent path records it. A `ui.docs` verb would be one
//     emitter and one consumer invented for symmetry — studio-flow.mjs's recorded reasoning, third
//     application. Revisit only when a replay records a doc read.
//
//  7. A DELIBERATE BEHAVIOUR CHANGE TO THE INSPECT LAYER, NOT A SIDE EFFECT. studio-compile.mjs's
//     applySwap already writes data-inspect on these same three primitives, and they were HOVER-ONLY
//     because nothing made them focusable. tabindex="0" changes that: inspect.mjs's focusin path now
//     fires on them too, so tabbing through a compiled screen opens the inspect bubble AND these
//     docs. That is coherent expert-mode behaviour and is accepted here — inspect.mjs's own ownEvent
//     guard exists for a different double-open (the nested [data-term] case) and is untouched. The
//     pair was checked by hand on the running page; it reads as one act.
//
// Refusals are content, never throws: a failed artifact fetch renders a sentence in the panel
// naming the url, and nothing reaches the console (bus-toggles.mjs's discipline;
// tooling/studio-journey.mjs's no-page-errors contract is a real assertion). Nothing here animates,
// so there is no reduced-motion branch to write.
//
// Node-import safe: no DOM outside a function body, and NO SELF-BOOT — system/studio.mjs mounts this
// exactly as it mounts the keep rail and the method band. build-checks group 23 imports it under
// Node and drives its pure layer; group 7 includes it in the zero-inline-styles / no-markup-from-a-
// string set with no exception argued.

import { renderComponentDocs, watchPackSwap } from "./catalog.mjs";
import { prepareHandoff } from "./handoff-viewer.mjs";

// --- the pure layer (DOM-free; gated by build-checks group 23) ---------------------------------

// The inspector panel this module owns. Not one of the three ids fixed by four inbound entry points
// (studio.mjs's PANELS comment) — no ⌘K command and no cross-page link resolves to it, deliberately:
// the palette memoizes its command list at first open and a deep link into a panel that is empty
// until the visitor compiles is chrome churn for nothing.
export const DOCS_PANEL_ID = "component-docs";

// The static affordance sentence's element id — the IDREF every trigger's aria-describedby carries.
export const DOCS_HELP_ID = "stu-docs-help";

// The decoration. Its VALUE is the component's vocabulary name, so the delegated handler resolves a
// row without a second lookup table keyed on class.
export const DOCS_ATTR = "data-studio-docs";

// "This canvas has compiled" — named ONCE and exported so build-checks asserts the same string this
// module branches on rather than a copy of it. It is studio-flow.mjs's renderScreen root class: a
// screen exists only after studio-compile.mjs's applySwap has run, and before that the stage holds
// studio.mjs's fat-marker place blocks, which are drafted PLACES and have no docs to show.
export const COMPILED_SELECTOR = ".stf-screen";

// The three generated artifacts, in one place and in the order loadDocsModel asks for them, so the
// join below cannot be given two of them. Root-absolute, like every other fetch on this page.
export const DOCS_SOURCES = [
  "/handoff/verdant/pack.json",
  "/handoff/verdant/vocabulary.json",
  "/system/system-graph.json",
];

// The panel's at-rest sentence lives in factory.html's markup and NOT as a constant here, so it
// renders with JS off — it states the PRECONDITION out loud (before Compile the canvas holds drafted
// places, not vocabulary components) and inventing docs for a fat-marker block is the one
// hand-written thing this ticket exists to avoid. The refusal path below replaces that paragraph,
// which is the honest trade: a reader whose artifacts 404 needs to know that, not the precondition.

// docsIndex(components) → Map<className, row> over prepareHandoff's rows.
//
// THROWS on a duplicate class, and that is a judgement about the input rather than defensiveness:
// pack.json is a generated, CI-drift-checked artifact, so two components claiming one class is a
// corruption, not a user mistake — and silently keeping the last one would make a click open the
// WRONG component's docs, which is worse than a red build. A row with no className is skipped: the
// pack has none today, and a class-less component has nothing on the canvas to click.
export function docsIndex(components) {
  const index = new Map();
  for (const row of Array.isArray(components) ? components : []) {
    const className = row && typeof row.className === "string" ? row.className : "";
    if (!className) continue;
    if (index.has(className))
      throw new Error(`studio-docs: two components claim the class "${className}" — `
        + `"${index.get(className).name}" and "${row.name}"`);
    index.set(className, row);
  }
  return index;
}

// shouldLoad({ compiled, loaded, loading }) → boolean. THE LAZY RULE AS A FUNCTION, not as an `if`
// buried inside refresh(): fetch only once the stage has compiled, only once, and never while a load
// is already in flight.
//
// It is a function because "at rest this page fetched nothing" is invisible to every gate that can
// run without a browser — the pixel gate sees identical pixels either way, drift-check sees no
// artifact, and build-checks holds no DOM. So the RULE is gated in CI here (group 23's truth table)
// and the WIRING is tooling/studio-journey.mjs's docsPass. Neither is sufficient alone.
export function shouldLoad(state) {
  const s = state || {};
  return Boolean(s.compiled) && !s.loaded && !s.loading;
}

// loadDocsModel(fetchLike = fetch) → { model, shared, index }.
//
// THE JOIN LIVES HERE AND NOWHERE ELSE, and that is what makes "one source, two mounts" a gated fact
// rather than a decorative one. The regression this shape exists to catch is a quiet one: dropping
// to the two-argument prepareHandoff(pack, vocab) still renders a plausible panel, but `tokens`,
// `example`, `wrapper` and `consumer` all degrade to null and the inspector becomes silently poorer
// than /components — no console error, no pixel difference, nothing to notice. Because the join is
// in one pure-ish function taking its fetch as an argument, build-checks group 23 drives it with a
// stub over the committed files and asserts the third argument's fields survived.
//
// `shared` is exactly the { vocab, portability } model shape mountCatalog builds — the same object
// renderComponentDocs takes on the other page, assembled the same way and not a second opinion.
//
// Throws a plain Error naming the failing url. Nothing throws at the reader: the caller turns this
// into the panel's refusal sentence.
export async function loadDocsModel(fetchLike = fetch) {
  const loaded = [];
  for (const url of DOCS_SOURCES) {
    const res = await fetchLike(url);
    if (!res || !res.ok) throw new Error(`${url} → HTTP ${res ? res.status : "no response"}`);
    loaded.push(await res.json());
  }
  const model = prepareHandoff(loaded[0], loaded[1], loaded[2]);
  return {
    model,
    shared: { vocab: loaded[1], portability: loaded[0].portability ?? null },
    index: docsIndex(model.components),
  };
}

// --- the mount ---------------------------------------------------------------------------------

// Copied rather than imported, like every other hand-written canon module in the studio
// (studio.mjs:134, studio-flow.mjs:46, studio-canvas.mjs:80). Text via textContent, attributes via
// setAttribute — group 7 bans every markup-from-a-string sink across these files.
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

// The inert handle. Returned whenever a piece of the page this module needs is absent — a degraded
// page must not throw, and every caller's `docs?.refresh()` should keep costing nothing.
// mountStudioKeep's posture on a missing root, adopted rather than reinvented.
const INERT = { refresh() {}, open() {}, destroy() {}, panelIndex: -1 };

// mountStudioDocs(root, { canvas, inspector }) → { refresh, open, destroy, panelIndex }
//
// `canvas` is initStudioCanvas's handle (this module reads canvas.stage and nothing else on it);
// `inspector` is wireInspector's return — which is NULL on a page with no tablist, and is treated
// exactly like a missing mount node rather than reached into optimistically.
export function mountStudioDocs(root, { canvas, inspector } = {}) {
  if (!root || !canvas || !canvas.stage || !inspector || !Array.isArray(inspector.tabs)) return INERT;

  const mountNode = root.querySelector(`[${DOCS_ATTR}-mount]`);
  const emptyNode = root.querySelector(`[${DOCS_ATTR}-empty]`);
  if (!mountNode || !emptyNode) return INERT;

  // Derived, never passed as a magic number: studio.mjs hands over the panel list and this file
  // finds its own index in it, so a reordered tablist moves this with it.
  const panelIndex = inspector.tabs.findIndex((t) => t.getAttribute("aria-controls") === DOCS_PANEL_ID);
  if (panelIndex < 0) return INERT;

  const stage = canvas.stage;
  const wiring = new AbortController();

  let index = null;      // Map<className, row>
  let byName = null;     // Map<name, row> — open()'s lookup, built once beside the index
  let shared = null;     // { vocab, portability }
  let loaded = false;
  let loading = false;
  let helpNode = null;
  let observing = false;

  // The refusal, and the empty state, share the one paragraph the markup already carries — a second
  // node would be a second thing to keep in sync with a state machine of two states.
  const say = (text) => {
    emptyNode.textContent = text;
    emptyNode.hidden = false;
    mountNode.textContent = "";
  };

  // Created on the FIRST successful decoration rather than at mount, deliberately. It is visible
  // caption text (this repo ships no visually-hidden utility — checked, there is none in
  // components.css), the triggers it describes do not exist before Compile, and a hint sitting in
  // the at-rest capture would both mislead the reader and churn the pixel baseline for a state it
  // does not describe.
  //
  // Its OWN element, joining the verbs' two caption lines rather than extending either sentence —
  // studio-verbs.mjs's recorded call: a reader focused on one component does not want the marquee's
  // grammar read to them, and the same holds in reverse. Placed in that row when it exists and in
  // the viewport otherwise, never inside .stx-scroll: a paragraph in the scroller would be a
  // paragraph the canvas pans.
  function ensureHelp() {
    if (helpNode) return;
    helpNode = el("p", {
      class: "stx-verb-help",
      id: DOCS_HELP_ID,
      text: "Focus or click a component to read its generated docs in the inspector.",
    });
    const verbs = canvas.viewport?.querySelector(".stx-verbs");
    (verbs || canvas.viewport)?.appendChild(helpNode);
  }

  // Idempotent by construction: a node already carrying DOCS_ATTR is skipped, so calling this after
  // every canvas render costs one querySelectorAll per class and writes nothing twice.
  //
  // SCOPED TO canvas.stage AND NEVER document — the docs panel's own playground renders real
  // components (.ds-metric-tile and friends), so a document-wide scan would decorate the panel with
  // triggers pointing back into itself.
  function decorate() {
    if (!index) return;
    let decorated = 0;
    for (const [className, row] of index) {
      for (const node of stage.querySelectorAll(`.${className}`)) {
        if (node.hasAttribute(DOCS_ATTR)) continue;
        node.setAttribute(DOCS_ATTR, row.name);
        // setAttribute, not node.tabIndex = 0: group 7 reads the SOURCE, and an attribute write is
        // unambiguous where a property assignment invites the question.
        node.setAttribute("tabindex", "0");
        node.setAttribute("aria-describedby", DOCS_HELP_ID);
        decorated += 1;
      }
    }
    if (decorated) ensureHelp();
  }

  // ONE in-flight promise, and it holds no fetch and no join of its own — loadDocsModel is the only
  // path to a model, which is what keeps the CI-gated function the real one.
  function ensureModel() {
    if (loading) return;
    loading = true;
    loadDocsModel()
      .then((result) => {
        index = result.index;
        byName = new Map(result.model.components.map((c) => [c.name, c]));
        shared = result.shared;
        loaded = true;
        loading = false;
        // ONCE per mount, never per open(): the observer closes over mountNode and re-resolves the
        // token cells in place when the dock swaps the pack. One per open would leave a live
        // MutationObserver behind for every component the reader ever clicked.
        if (!observing) { observing = true; watchPackSwap(mountNode); }
        decorate();
      })
      .catch((err) => {
        // Content, never a throw and never console.error. `loading` is cleared so the next canvas
        // render retries — a transient failure is not a verdict about the files
        // (studio-compile.mjs's memoize-the-success-not-the-failure call, inherited).
        loading = false;
        say(`Those docs could not be loaded — ${err.message}. The canvas is unaffected; compile again to retry.`);
      });
  }

  function open(name) {
    const row = byName ? byName.get(name) : null;
    if (!row) {
      say(`No generated docs are joined to "${name}" — it is not in the committed pack.`);
      return;
    }
    // CHILDREN, never the node: watchPackSwap closes over mountNode, and replacing the element
    // would leave the observer re-resolving a detached subtree.
    mountNode.textContent = "";
    emptyNode.hidden = true;
    // level 4 — the panel's own title is an h3 (factory.html's .stu-panel-title), so the component
    // name is an h4 and its spec sections h5. One renderer, one call, no fork.
    renderComponentDocs(mountNode, row, shared, { level: 4 });
    // `false` IS LOAD-BEARING. activate(i, true) moves focus to the tab, which on the focusin path
    // would yank focus out of the canvas on every Tab press and make the keyboard route unusable.
    inspector.activate(panelIndex, false);
  }

  function refresh() {
    const compiled = Boolean(stage.querySelector(COMPILED_SELECTOR));
    // Nothing to clear on the uncompiled path: the decoration lives on nodes that are already gone,
    // and the panel deliberately KEEPS the last component's docs — they describe a component, not
    // the canvas, so clearing them would be inventing a "the canvas changed" claim.
    if (!compiled && !loaded) return;
    // The lazy rule is the pure function's answer, never a second `if` written here.
    if (shouldLoad({ compiled, loaded, loading })) ensureModel();
    decorate();
  }

  const fromEvent = (e) => {
    // closest() resolves the INNERMOST trigger, which is correct and intended: clicking a
    // vd-status-chip inside a vd-care-task-row opens the chip's docs, because the chip is what the
    // reader pointed at. Scanning outside-in would be the surprising one.
    const node = e.target instanceof Element ? e.target.closest(`[${DOCS_ATTR}]`) : null;
    if (node) open(node.getAttribute(DOCS_ATTR));
  };
  stage.addEventListener("click", fromEvent, { signal: wiring.signal });
  stage.addEventListener("focusin", fromEvent, { signal: wiring.signal });

  // SHAPE-MATCHING, NOT A COMPLETE TEARDOWN, and said so rather than left to be discovered: the
  // watchPackSwap MutationObserver started in the load path is NOT disposed here, because
  // catalog.mjs's watchPackSwap calls .observe() and returns nothing to call. Inert today —
  // mountStudioCore runs once per page load, there is no re-mount path and nothing calls destroy()
  // (studio-keep.mjs and studio-method.mjs have the same posture). Giving that export a disposer is
  // a change to MOUNT 1's contract as well, so it belongs to whichever ticket first needs a real
  // re-mount, not to a docs panel that never gets one.
  function destroy() {
    wiring.abort();
    for (const node of stage.querySelectorAll(`[${DOCS_ATTR}]`)) {
      node.removeAttribute(DOCS_ATTR);
      node.removeAttribute("tabindex");
      node.removeAttribute("aria-describedby");
    }
    mountNode.textContent = "";
    helpNode?.remove();
    helpNode = null;
  }

  return { refresh, open, destroy, panelIndex };
}
