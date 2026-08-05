# Feature: Studio 8 — the single-file export, the grown keep rail, and the two win-metric routes (#210)

The following plan should be complete, but it is important that you validate documentation, codebase
patterns and task sanity before you start implementing.

Pay special attention to the naming of existing utils, types and models. Import from the right files.
**This ticket's single biggest failure mode is forking a module it should have imported** — `specMarkdown`,
`vetTokens`, `compose`, `renderComposition`, `compileSteps`, `flipTo`. Every one of them already exists.

---

## Feature Description

/factory is the studio. Since #206 it holds a canvas; since #207 the board compiles into real
token-skinned components; since #208 the share codec carries the grid arrangement; since #209 the
canvas is assembled on arrival by a replay driver playing a committed real agent run.

**The visitor still cannot leave with anything.** /factory has no keep rail at all (verified: `factory.html`
carries `[data-build-import]`, `[data-studio]`, `[data-studio-tablist]` and nothing else — no
`[data-build-keep]`, no download, no share control). The one route measuring the studio is
`/factory/took-over` (#209).

This ticket adds the leave-with-the-artifact half of the epic's MVP:

1. **A runnable single-file HTML export**, assembled client-side from the same sources the page renders
   (token contract + the live pack + `components.css` inlined, the composed components serialized from
   `renderComposition`'s own live output, the grid arrangement preserved), downloadable, and openable
   cold from `file://` with zero network requests.
2. **A studio keep rail** on /factory with three artifact tiers — the runnable export · the per-build
   handoff pack (`pattern-spec.md` + `breadboard.json` + the two SVGs, imported from the /build rail's
   own generators) · the share link now carrying the arrangement (#208's `g` field, which /build
   structurally cannot produce). All three hide when the board is bare.
3. **`?b=` restore on /factory**, which is what makes the share link a round trip rather than a one-way
   emission — and which makes `studio.mjs:388-394`'s recorded-but-unimplemented **declined driver mount**
   reachable for the first time (issue #210's only comment; PR #240 review finding 6, deferred here).
4. **Two one-shot virtual routes** — share created · export downloaded — each a static literal fired from
   its own success path.

Task 1 is **spike 3**, and it runs before the exporter is built.

## User Story

As a **hiring manager evaluating this portfolio**
I want to **leave with the thing the studio just built — a file I can open, and a link that rebuilds it**
So that **the capability I watched is something I still hold after I close the tab, and the evidence
survives into the conversation with my colleagues.**

## Problem Statement

The studio's whole hypothesis is *experienced* capability rather than *read* capability. An evaluator who
watches a real recorded run assemble a board, compiles it into real components, and moves the pieces
around, currently reaches the bottom of /factory with nothing in their hands. The epic's success metric —
"keep/share above the current /build keep-rail baseline within 4 weeks" — has no instrumentation on
/factory and no artifact to instrument. The share link that /build produces cannot express what the studio
uniquely produces: an arrangement.

## Solution Statement

A new `system/studio-export.mjs` assembles a self-contained HTML document in the browser from four fetched
sources plus the live DOM, and a new `system/studio-keep.mjs` mounts a three-tier rail on /factory that
imports — never forks — the /build rail's artifact generators. Two new literals join `system/analytics.mjs`
beside `/factory/took-over`, each fired from a success path only. `system/studio.mjs` grows a `?b=` restore
that seeds the canvas with the visitor's own board and mounts the replay driver **declined**.

The export is a *client-side assembly*, not a build step, not an upload, and not hand-written markup — the
same three promises /build already makes, extended to a runnable artifact.

## Out of Scope / Non-Goals

The architecture's Export paragraph says "the composed **screens**, a minimal nav script" — that sentence
is written for the finished epic, not for this ticket, and it is the gold-plating trap here.

- **Not included: multi-screen flows or any navigation script.** #207 compiles today's *single* pattern.
  There is exactly one screen to export. The exporter emits **no nav script and no router**. Places-become-
  screens and connections-become-navigation are **#212**, which extends this exporter — expected, sanctioned
  re-work per PRD §MVP ("before flows"). Write the exporter so #212 extends it (one `screens: [...]` array
  with one entry), but ship one screen.
- **Not included: the docs catalog, the inspector docs, or any `example` spec field** (#211/#215/#218).
- **Not included: a new export FORMAT** — no zip, no React, no Figma. One HTML file, plus the existing four
  /build downloads re-mounted.
- **Not changing: /build's keep rail.** `build-keep.mjs`'s mount stays exactly as it is; /build gets no
  export tier and no new route. We import from that file; we do not edit its behaviour. (One comment on
  `specMarkdown` gets amended — see Task 6 — because it currently states a contract this ticket falsifies.)
- **Not changing: `system/pack-imported.mjs`'s `vetTokens`.** The export *relies* on it as the one
  application point. A second escaping opinion in the exporter is the bug, not the fix.
- **Not changing: `system/action-bus.mjs`** (the standing rule since #176).
- **Not included: a take-over route change.** `/factory/took-over` ships and stays as #209 built it.
- **Not included: exporting the fat-marker blocks.** The export is the *composed product*. A board that
  compiles to nothing exports nothing, and says so.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (a spike, a new surface with at-rest baseline churn, a previously-unreachable
code branch going live, and two analytics literals on a page that already carries one)
**Primary Systems Affected**: `/factory` (`factory.html`, `system/studio.mjs`, `system/studio.css`),
`system/analytics.mjs`, `tooling/build-checks.mjs`, `tooling/studio-journey.mjs`, the loc/param/baseline
cascades
**Dependencies**: none new — vanilla, zero-dep, no build step (hard constraint)

## Related Work

**Implements**: [#210](https://github.com/linardsb/ux-factory/issues/210) · **Epic**:
[#202](https://github.com/linardsb/ux-factory/issues/202) → `docs/epics/prototype-studio.architecture.md`
(§Data model → *Export*; §Boundaries & contracts → *Analytics*; §Spikes 3)

**Back-references** (decisions inherited, not reopened):

- `.claude/plans/studio-canvas-stage-204.md` — the grid model (`data-col`/`data-row`, `MAX_COLS`/`MAX_ROWS`)
  the export must reproduce.
- `.claude/plans/studio-compile-beat-207.md` — `compileSteps` + the positional in-place swap; the exporter
  reuses the beat's pure result and its memoized vocabulary rather than re-deriving either.
- `.claude/plans/studio-share-codec-v2-208.md` — the `g` arrangement field; the rail's share tier is the
  only producer of it in the repo.
- `.claude/plans/studio-replay-driver-takeover-209.md` — the driver whose *declined* mount this ticket
  implements, and `/factory/took-over`, whose shape the two new routes copy.
- `.claude/plans/build-pattern-render-keep-rail.md` — the /build rail this one is the sibling of.

**Forward-references**:

- **#212 (flows)** extends `studio-export.mjs` from one screen to 2–4 with a nav script. Leave the seam;
  do not build it.
- **#213 (studio gates)** folds the INP budget over the export click.
- **#222 (instances)** re-shells onto this rail.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

| File | Lines | Why |
|---|---|---|
| `system/build-keep.mjs` | whole (390) | The rail this one is the sibling of. `specMarkdown` (74-182) is **imported**, not forked. `settledUrl` (251-256), `currentUrl` (265-267), `download` (216-224), `artifactButton` (226-230), `svgNode` (56-63), the `copyBtn` handler (269-304), the three-tier hide (317-323), the `?b=` restore (356-377). Every one of these is a pattern to mirror. |
| `system/studio.mjs` | whole (505) | Where the rail mounts, where `?b=` lands, and **388-394** — the recorded declined-mount requirement this ticket makes reachable. `publishBoard` (454-468) is the seam the rail listens through. |
| `system/studio-compile.mjs` | 90-143 (`compileSteps`), 212-300 (mount), 300-325 (`loadVocabulary`), 560-600 (the returned handle) | The exporter needs the beat's composition + its memoized vocabulary. **The handle exposes neither today** — Task 5 adds one accessor. |
| `system/analytics.mjs` | 129-244 (the /build pair + `flipTo` + `onVirtualRoute`), 273-299 (`trackFactoryTookOver`) | The exact shape both new trackers copy. `:287` literally says "#210 is about to put two more routes on this same page". |
| `system/build-share.mjs` | 65-76 (constants), 253-315 (`encodeBuild`), 316+ (`decodeBuild`), 495 (`shareUrl`) | `encodeBuild({...state, arrangement})` is how `g` is written. `decodeBuild` returns `{ state, reason }` with `state.arrangement`. |
| `system/pack-imported.mjs` | 60-126 (`VALUE_OK`, `VALUE_BAD`, `VALUE_HUGE`, `vetTokens`) | **The escaping AC's real answer.** `VALUE_OK` excludes `< > : ; { } " '` — so no imported token value can break out of the export's `<style>`. State this dependency in the exporter's header; do not re-implement it. |
| `system/build-import.mjs` | 100-175 | How the pack reaches the page: `el.style.setProperty(k, v)` on every `[data-build-stage]` (`:153`) — **not** on `:root`. `#build-stage` on /factory is the canvas column. This is where the exporter reads live token values from. |
| `system/pattern-render.mjs` | 48-70 (`compose`), 84-93 (`OUT_OF_LIBRARY`, `REFUSED`, `INSPECT_IDS`) | The honesty sentences, imported verbatim. |
| `system/agentic-renderer.mjs` | 31 (`validateComposition`), 369 (`renderComposition`) | `renderComposition(vocab, composition, bus)` returns real DOM. Serializing **its** output is AC #3. |
| `system/studio-canvas.mjs` | 34-73 (pure layer, `clampSlot`), `MAX_COLS`/`MAX_ROWS`/`ZOOM_LEVELS` | Caps are **imported**, never re-literalled (group 12 pins the mirror both ways). |
| `system/build-card.mjs` | the `esc`/`clip` discipline | AC #4's named precedent: escape once, at the template. |
| `factory.html` | 79 (`[hidden]{display:none!important}` — **already present**), 106-180 (Act 0), 182-340 (the studio shell), 397-430 (the close + the script block) | Where the rail's markup goes and which script tag mounts it. |
| `build.html` | 47-58, 540-570 | The `[hidden]` note and the keep-rail tier CSS, as precedent. |
| `system/studio.css` | whole | The rail's styles go here. Zero literals; tokens only. |
| `tooling/build-checks.mjs` | 103 (`group()`), 867 (group 6 "artifacts"), 1531 (group 10 "analytics"), 2790+ (group 16 + the verdict tail) | Where 6 and 10 grow and where group 17 is added. **The `all 16 groups pass` string at the very bottom becomes 17.** |
| `tooling/studio-journey.mjs` | its #209 half | The running-page driver. Every "both directions on the running page" assertion lives here, not in build-checks. |
| `system/param-manifest.json` | the `/factory` entries (71-79) | New controls join under the existing `/factory` key. |
| `CLAUDE.md` | the architecture map | The one-paragraph headers every new canon module carries. |

### New Files to Create

- `system/studio-export.mjs` (~380) — the single-file export builder. Pure layer (`exportHtml(...)` → a
  string) + a thin DOM-side `collectSources()`. Node-import-safe.
- `system/studio-keep.mjs` (~260) — the studio's keep rail. Mounts on `[data-studio-keep]`, imports
  `specMarkdown`/`cardSvg`/`boardSvg`/`encodeBuild`/`shareUrl` from the /build modules.
- `.claude/reports/studio-export-keep-rail-210-spike3.md` — spike 3's verdict, branch taken, and the
  evidence (Task 1). Committed in the same PR.
- `.claude/reports/` implementation report + `.claude/code-reviews/pr-<N>-review.md` at the end (repo rule).

### Relevant Documentation

- `docs/epics/prototype-studio.architecture.md` §Data model → *Export* (`:107-109`), §Boundaries &
  contracts → *Analytics* (`:120-122`), §Spikes 3 (`:205-210`). **Read all three verbatim.**
- [MDN — `Blob` / `URL.createObjectURL`](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
  — Why: `build-keep.mjs:216-224`'s download already uses it; the export is a bigger blob, same shape.
- [MDN — `XMLSerializer` / `outerHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element/outerHTML)
  — Why: AC #3 says serialize the renderer's own live output. `outerHTML` on a detached container is the
  whole mechanism; there is no library.
- [MDN — CSS `@import` and `url()` inside `file://`](https://developer.mozilla.org/en-US/docs/Web/CSS/@import)
  — Why: any surviving `@import` or relative `url()` in the inlined CSS is a network request the export's
  claim forbids.

  **⚠️ SCANNED — and one pack fails. This is a design input, not a spike unknown.** Every
  `system/tokens.*.css` + `components.css` + the contract were grepped:

  | File | `@import` / `url(` |
  |---|---|
  | `tokens.contract.css`, `tokens.neutral.css`, `tokens.plusui.css`, `tokens.verdant.css`, `components.css` | none (neutral's only hits are prose in its header) |
  | **`tokens.saulera.css:19`** | **`@import url("../fonts/fonts.css");` — a LIVE RULE, not a comment** |

  And `system/fonts/` **does not exist** — the reference is already dangling on the live site.
  `tooling/visual-regression/visual.spec.mjs:123` records this as a known condition ("saulera's missing
  /fonts/fonts.css stays"). saulera is not a hypothetical: `dock.mjs`'s `PACKS` (`:39-47`) offers it, and the
  VR gate captures **every page under neutral *and* saulera** (`visual.spec.mjs:117`).

  **Therefore the exporter STRIPS `@import` from every fetched stylesheet**, unconditionally, and states in
  the export's own provenance block that a self-hosted face did not travel and the system font stack is
  substituted. That is the ticket's honesty clause applied to a real gap — "a downgraded artifact described
  accurately beats a headline claim that is 90% true" — and it is a smaller downgrade than it sounds,
  because the referenced file is absent on the live site too. Inlining the face as data: URIs is **out of
  scope**; if the owner wants exported files to carry the real face, that is a follow-up ticket with its own
  weight budget.
- [WCAG 2.2 SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
  — Why: the rail's buttons and the link field mirror `build-keep.mjs`'s existing labelling.

### Patterns to Follow

**Module header** — every new canon file opens with a governing-doc citation (CLAUDE.md ground rule). Copy
the shape of `system/studio-compile.mjs:1-51`: what it is, the load-bearing calls made here so later
tickets inherit rather than re-argue them, and the Node-import-safety sentence.

**The pure/DOM split** (`studio-canvas.mjs:34-73`, `studio-verbs.mjs:60-235`, `studio.mjs:58-114`,
`studio-compile.mjs:62-143`): plain data in, plain data out at the top of the file, so
`tooling/build-checks.mjs` drives it under Node with no browser. `studio-export.mjs` **must** carry this
split — `exportHtml({ css, tokens, markup, meta })` returns a string and touches no DOM.

**Total by contract** (`arrangeBoard`, `compileSteps`, `parseTrace`): junk in → a defined empty answer,
never a throw.

**The local `el` helper is COPIED, never shared** (`studio.mjs:121-130`, `build-keep.mjs:41-51`,
`device-frame.mjs:33`). Do the same; a shared one would couple deliberately independent surfaces.

**Node-import safety**: no DOM reference outside a function body; the self-boot at the bottom behind
`if (typeof document !== "undefined")`.

**Zero inline styles, zero markup-from-a-string** (build-checks group 7 — the `vetting` group,
`tooling/build-checks.mjs:913-1021`). **RESOLVED — read this before writing a line of Task 4 or 6.** The
predicate was checked, and it is stricter than it looks:

```js
for (const sink of [".innerHTML", ".outerHTML", ".insertAdjacentHTML(", "document.write("])
  ok(!src.includes(sink), …);          // :954-956 — plain substring, over the WHOLE FILE
```

Three consequences, all load-bearing:

1. **`.outerHTML` IS BANNED.** The earlier draft of this plan had Task 6 reading `node.outerHTML` — that is
   a hard failure the moment `studio-export.mjs`/`studio-keep.mjs` join `MODULES` (`:913-918`), which they
   must: that list already carries `studio-canvas`, `studio-verbs`, `studio.mjs`, `studio-compile` and
   `replay-driver`, and the group's own summary says "no exception argued". **Use
   `new XMLSerializer().serializeToString(node)`** — it is not on the sink list, and correctly so: the list
   bans markup *sinks* (writing a string into the live document), and serialization is a read. The Blob is
   never assigned to any node on the page, so nothing else in the group is touched.
2. **The ban includes COMMENTS.** `src.includes` does not know what a comment is. The group's own note
   (`:950-953`) records that member access is matched with a leading dot precisely because modules explain
   in prose why they avoid these APIs — but `.outerHTML` written in a header paragraph still carries the
   dot and still fails. **When the exporter's header explains why it serializes rather than scrapes, write
   `outerHTML` with no leading dot.** This is the kind of thing that goes red on the last commit.
3. Building the export **string** is fine and needs no exception: nothing in the group forbids constructing
   a string, only handing one to a document sink.

**Announcement + refusal discipline**: refusals go to the live region / an honest card, never a throw
(`bus-toggles.mjs`, `studio-verbs.mjs`, `studio-compile.mjs:335-355`). `tooling/studio-journey.mjs` asserts
a clean console.

**Analytics tracker shape**: module-level `const X_PATH = "/literal"` + a module-level `let xFired = false`
+ `export function trackX() { if (xFired) return; xFired = true; flipTo(X_PATH); }`. Own fire-once flag per
event (`analytics.mjs:64-67` — a shared flag lets whichever fires first suppress the other).

---

## IMPLEMENTATION PLAN

### Phase 0: Spike 3 — export fidelity

**Independent of:** everything. It runs first and its verdict decides Phase 2's copy.

Hand-assemble one export by hand from the fetched sources, open it cold, and record the verdict.

### Phase 1: The analytics routes

**Independent of:** Phase 0. Two literals + two trackers + group 10's growth. Small, self-contained, and it
resolves the **route-name collision** before anything calls a tracker.

### Phase 2: The exporter module

**Depends on:** Phase 0 (the verdict picks which copy ships) and Phase 1 (nothing, but the tracker exists).

### Phase 3: The rail — markup, styles, mount

**Depends on:** Phase 2.

### Phase 4: `?b=` on /factory + the declined driver mount

**Depends on:** Phase 3 (the rail is what produces the link this restores).

### Phase 5: The gates

**Depends on:** Phases 1–4. `build-checks` groups 6, 10 and a new 17; `studio-journey`'s #210 half.

### Phase 6: The cascades

**Depends on:** everything. loc-summary + both approach baselines · param-manifest + param-count · both
factory baselines from a clean detached worktree.

---

## STEP-BY-STEP TASKS

Execute in order. Every task states the criterion it advances.

---

### Task 1 · SPIKE 3 — hand-assemble one export and open it cold

- **IMPLEMENT**: Serve the repo (`node tooling/visual-regression/serve.mjs &`, or `npx serve .`). Open
  `/factory`, let the replay settle, press **Compile the board**. Then in the console, hand-assemble one
  export file and save it. The point is to answer the fidelity question **before** a module is written to
  a shape the answer invalidates.

  Assemble it from exactly the four sources the real exporter will use, so the spike tests the real thing:

  ```js
  // 1. the three stylesheets, fetched as text
  const packHref = [...document.querySelectorAll('link[rel=stylesheet]')]
    .map(l => l.getAttribute('href')).find(h => /\/tokens\.[a-z0-9-]+\.css$/.test(h) && !h.includes('contract'));
  const css = (await Promise.all([
    '/system/tokens.contract.css', packHref, '/system/components.css',
  ].map(u => fetch(u).then(r => r.text())))).join('\n');

  // 2. the live inline pack props (an IMPORTED or DERIVED pack lives here, NOT in the stylesheet)
  const stage = document.querySelector('[data-build-stage]');
  const inline = stage.getAttribute('style') || '';

  // 3. the composed components — renderComposition's OWN live output, serialized
  const wrappers = [...document.querySelectorAll('[data-stx-id]')];
  const screen = wrappers.map(w => ({
    col: w.getAttribute('data-col'), row: w.getAttribute('data-row'),
    html: [...w.children].find(c => !c.classList.contains('stx-grab')).outerHTML,
  }));

  // 4. write the file
  const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <title>spike</title><style>${css}</style><style>:root{${inline}}</style>
  <style>.ex-grid{display:grid;gap:1rem;grid-auto-flow:row}</style></head>
  <body><main class="ex-grid">${screen.map(s => s.html).join('\n')}</main></body></html>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([doc], {type:'text/html'}));
  a.download = 'spike3.html'; a.click();
  ```

- **RUN THE CHECKLIST — all six, and record each answer.** The decision rule is only meaningful if the
  failure modes were actually exercised:
  1. **Cold `file://` open in a fresh browser profile** (not a reload of a served page). Does it render?
     **And settle the serializer here, not in Task 6.** `XMLSerializer().serializeToString()` emits *XML*
     serialization — self-closed voids (`<br />`) and an `xmlns="http://www.w3.org/1999/xhtml"` on the
     serialized root. Both are inert in a document parsed as `text/html`, so this very likely renders
     identically — but "very likely" is not what AC #2 ("no missing style") is owed. Serialize one real
     composed node **both** ways in the console, diff the two strings, and compare the `file://` render.
     If the serializer distorts anything, the group-7-safe fallback is to `append(node.cloneNode(true))`
     into a container and read the container's markup by a non-banned path — **decide it now**, because
     Task 4 and Task 6 both hard-code the choice.
  2. **Zero network requests** — DevTools Network panel, `file://`, hard reload. Any request at all is a
     gap. **Known in advance: under the saulera pack the naive assembly WILL make one** (the dangling
     `@import` at `tokens.saulera.css:19`). Confirm the strip closes it; this checklist item exists to
     verify the fix, not to discover the problem.
  3. **The imported-pack case, not only neutral.** Drop a token JSON on Act 0 (or press *Derive a palette*
     with a non-default colour) **before** compiling, then export. Does the exported file wear the
     visitor's colours? — memory `derived-pack-inline-vs-stylesheet`: a derived pack is inline props, so an
     export that only inlines the stylesheet is faithful under neutral and wrong under everything else.
  4. **The saulera pack via the appearance dock**, so a re-pointed `tokens.<pack>.css` link is exercised —
     and so the `@import` strip is exercised on the one pack that needs it. Also switch to **verdant** and
     **plusui** (`dock.mjs:39-47` — four packs ship, and the export must be right under all four).
     **Under saulera, open the studio page and the export SIDE BY SIDE and compare the type.** The
     reasoning says they should match — the `@import` target is absent on the live site too, so both fall
     back to the system stack — but that is a deduction, and the provenance sentence Q3 writes is only
     honest if it names the gap that actually exists. If the two differ, that sentence is describing the
     wrong thing and must be rewritten before it ships.
  5. **No `history.replaceState`, no `fetch`, no module `import`** anywhere in the emitted file —
     all three throw or fail on `file://`.
  6. **The arrangement survives.** Move a component to another column before exporting; does the export
     reflect it? (If the naive `grid-auto-flow` above loses it, that is a finding, not a failure —
     Task 7 owns the arrangement CSS.)

- **DECISION RULE** (verbatim from the ticket): **faithful → the export is the keep rail's headline
  artifact** · **gaps → scope the export to per-screen HTML + the pack download, stated honestly in the
  rail's own copy.**
- **WRITE**: `.claude/reports/studio-export-keep-rail-210-spike3.md` — the six answers, the verdict, the
  branch taken, and one sentence on what the rail's copy therefore says. Commit it.
- **GOTCHA**: Do not skip straight to "faithful". The spike exists because three of the six checks
  (imported pack, zero requests, arrangement) have plausible failure modes, and AC #1 requires the copy to
  match the branch actually taken.
- **VALIDATE**: the spike file opens from `file://` with an empty Network panel; the report exists.
- **SATISFIES**: AC #1, and it gates AC #2.

---

### Task 2 · UPDATE `system/analytics.mjs` — two new virtual routes

- **IMPLEMENT**: beside `trackFactoryTookOver` (`:273-299`), in the same `/factory, the studio (epic #202)`
  section, add two trackers in the established shape:

  ```js
  const FACTORY_LINK_PATH = "/factory/link-copied";
  let linkCopiedFired = false;
  export function trackFactoryLinkCopied() { … flipTo(FACTORY_LINK_PATH); }

  const FACTORY_EXPORTED_PATH = "/factory/exported";
  let exportedFired = false;
  export function trackFactoryExported() { … flipTo(FACTORY_EXPORTED_PATH); }
  ```

- **⚠️ THE ROUTE-NAME COLLISION — this is the one real defect this task exists to avoid.** The obvious
  names are already taken. `system/analytics.mjs` already declares `/factory/driven` (`:36`),
  `/factory/built` (`:61`), **`/factory/shared` (`:76`)** and `/factory/arrived` (`:98`) — and **all four
  fire from home's spine, not from /factory**. A virtual route IS the entire payload, so reusing
  `/factory/shared` for "share created on the studio" makes the two events indistinguishable in CF Web
  Analytics and the win metric this ticket exists to produce is unattributable from day one. Group 10
  asserts that a path is *static* — it does not assert that it is *unique*, so nothing would catch it.
  **Use `/factory/link-copied` and `/factory/exported`.** Both are verified free.
- **`flipTo`, not the simple `trackToolInspect` shape** — `analytics.mjs:284-288` already argues why for
  this page: /factory carries the appearance dock (which writes `location.hash`) and #206's hash-routed
  inspector panels, so both of `flipTo`'s protections are reachable. And these two routes are exactly the
  overlap case the overlapping-flip rule exists for — an export click and a copy click can land inside
  each other's 50 ms window.
- **CALLER CONTRACT**: build the URL and put it in the address bar **before** calling `trackFactoryLinkCopied`
  (`analytics.mjs:236-239`). `trackFactoryExported` fires **after** the blob click, from the success path,
  never from a settled flag (memory `spine-analytics-slot-fires-regardless`).
- **PATTERN**: `system/analytics.mjs:226-244` and `:295-299`.
- **GOTCHA**: no `?b=` payload, no slug, no pattern name, no seq — the path is the whole payload.
- **VALIDATE**: `node tooling/build-checks.mjs` (group 10 still green before it is extended in Task 15).
- **SATISFIES**: AC #5.

---

### Task 3 · UPDATE `tooling/build-checks.mjs` group 10 — a uniqueness case that fails today

- **IMPLEMENT**: in the analytics group (`:1531` and the block above it), add a case that collects **every**
  module-level virtual path literal in `system/analytics.mjs` and asserts they are pairwise distinct.
  Read them by importing the module and driving each exported tracker on a stub `location`/`history`
  (the group already does this — mirror its existing harness), collecting the pushed paths.
- **GOTCHA**: **this check must be able to fail** (memory `check-that-cannot-fail`). Prove it: temporarily
  point `FACTORY_EXPORTED_PATH` at `/factory/shared`, run the group, watch it go red, revert. Record that
  in the implementation report.
- **PATTERN**: group 10's existing cases D and E.
- **VALIDATE**: `node tooling/build-checks.mjs`
- **SATISFIES**: AC #5.

---

### Task 4 · CREATE `system/studio-export.mjs` — the pure layer

- **IMPLEMENT**: the string builder, DOM-free and Node-importable:

  ```js
  export function exportHtml({ title, css, inlineTokens, slots, meta })  // → a complete HTML string
  ```

  - `css` — the three stylesheets already concatenated (fetched DOM-side, passed in as text).
  - `inlineTokens` — a `{ "--color-accent": "#…" }` map from the live stage. **Emitted through
    `vetTokens` from `system/pack-imported.mjs`** — imported, not re-implemented. `VALUE_OK` already
    excludes `< > : ; { } " '`, which is precisely what makes a `</style>` breakout impossible; say so in
    the header and rely on it.
  - `slots` — `[{ col, row, html }]`, where `html` is `renderComposition`'s own output serialized with
    **`new XMLSerializer().serializeToString(node)`** — **never** `node.outerHTML`, which build-checks
    group 7 bans by plain substring (see Patterns above; the ban reaches comments too).
  - **`css` is `@import`-stripped by this function**, not by the caller — one place decides, and group 17
    asserts the output. saulera ships a live `@import url("../fonts/fonts.css")` at `tokens.saulera.css:19`
    pointing at a directory that does not exist, and the dock offers saulera to every reader.
  - `meta` — `{ patternLabel, places, affordances, connections, packLabel, builtOn }` for the provenance
    footer. Every number **counted**, none hand-written (`pattern-rules.mjs`'s honesty rule, inherited).
  - Emits **one** small hand-written layout block that places each slot at its `col`/`row` — the
    arrangement is the studio's unique artifact and CSS grid line placement is how it survives. Import
    `MAX_COLS`/`MAX_ROWS` from `studio-canvas.mjs`; **never re-literal them** (group 12's rule).
  - Emits a provenance block in the document itself, honest and matching the spike's branch: what the file
    is, that it was assembled in the visitor's browser, that no model was called, and the two-claims
    sentence `build-keep.mjs:177-179` already makes (imported as a constant if practical, otherwise
    written in the same words and cross-referenced). **Decided: IMPORTED, not re-written.** `build-keep.mjs`
    does not export those lines today, so export them from there as one `const` and use it in both places —
    the same one-generator-two-surfaces move Tier 2 makes with `specMarkdown`. This is settled here because
    Task 13 asserts those sentences by **identity** against the imported constant, and a re-written copy
    makes that assertion impossible to write. (It is the second and last change to `build-keep.mjs`, beside
    the `specMarkdown` comment amendment.)
  - **NO script tag. NO nav. NO fetch. NO `history` call.** (Out of Scope; and spike checklist item 5.)
- **TOTAL BY CONTRACT**: null/garbage `slots`, a null `css`, junk `inlineTokens` → a valid document that
  honestly says nothing was composed. Never a throw.
- **PATTERN**: `system/build-card.mjs`'s escape-once-at-the-template discipline; `studio-compile.mjs:90-143`'s
  pure-layer shape.
- **IMPORTS**: `{ vetTokens }` from `./pack-imported.mjs`, `{ MAX_COLS, MAX_ROWS }` from `./studio-canvas.mjs`.
- **GOTCHA — no raw control bytes.** Group 7 also fails any `MODULES` file carrying a raw C0 byte
  (`tooling/build-checks.mjs:965-967`); the note there records that `replay-driver.mjs` shipped literal
  `U+0000`/`U+0001` field separators and made `grep` and `rg` go silent on the one file whose header is a
  list of invariants. If the exporter wants a separator or a sentinel while joining CSS and markup, write
  it as a `\u0000`-style **escape**, never a literal byte. Runtime behaviour is identical; the file stays text.
- **GOTCHA**: the `slots[].html` strings come from the serialized form of nodes the *renderer* built — they are
  already-escaped DOM serialization and must **not** be escaped a second time (double-escaping is the exact
  bug `build-card.mjs`'s "escaped once" note exists about). The `title` and `meta` strings **are** text and
  **do** need escaping. Keep the two categories visibly separate in the code.
- **VALIDATE**: `node -e "import('./system/studio-export.mjs').then(m=>console.log(m.exportHtml({}).length))"`
  → a number, no throw.
- **SATISFIES**: AC #2, #3, #4.

---

### Task 5 · UPDATE `system/studio-compile.mjs` — expose the composition and the vocabulary

- **IMPLEMENT**: add one accessor to the returned `handleObj` (`:560-600`):

  ```js
  // #210's seam. The exporter needs renderComposition's OWN output and the vocabulary that validates
  // it, and both already exist here — a second fetch and a second compose would be two opinions about
  // what this board renders as. Returns null when there is nothing to compose.
  async composed() { … }   // → { result, vocab } | null
  ```

  It calls `compileSteps(getBoard(), answers)` and `await loadVocabulary()`, returning both. It performs
  **no DOM work** and does not change `state` — pressing Export must not run the beat.
- **GOTCHA**: reuse the memoized `loadVocabulary` (`:308`) and inherit its degraded branch — if the
  vocabulary cannot be read, `composed()` answers `{ result, vocab: null }` and the rail shows the
  **same** "Not available" sentence `renderUnavailable` (`:350`) already prints. A third fetch with its own
  failure copy is a second opinion.
- **GOTCHA**: `composed()` awaits, so it must re-check `destroyed` before returning (the file's liveness
  rule, `:~490`).
- **PATTERN**: the `getBoard` seam #209 added to this same signature — the precedent for "the studio's next
  ticket needs a read, not a fork".
- **VALIDATE**: `node tooling/build-checks.mjs` (group 15 unchanged and green).
- **SATISFIES**: AC #3.

---

### Task 6 · CREATE `system/studio-keep.mjs` — the studio's rail

- **IMPLEMENT**: `mountStudioKeep(root, { getBoard, getSummary, getArrangement, compile, canvas })`,
  mounting on `[data-studio-keep]`. Three tiers plus an empty state, mirroring `build-keep.mjs:186-194`:

  - **Tier 1 — the runnable export.** One primary button. On click: `await compile.composed()` → render
    that composition through `renderComposition(vocab, composition, createBus())` into a **detached**
    container → read each node's `outerHTML` → pair each with its wrapper's `data-col`/`data-row` from the
    live canvas → fetch the three stylesheets → `exportHtml(...)` → `download("prototype.html", …,
    "text/html")` → **`trackFactoryExported()` on the success path only.**
  - **Tier 2 — the per-build handoff pack.** Four buttons, all **imported** generators:
    `specMarkdown(state, named, composition)` from `build-keep.mjs`, `cardSvg`/`boardSvg` from
    `build-card.mjs`, and `JSON.stringify(board)`. Not one line of them is re-written here.

    **⚠️ `specMarkdown` needs a state /factory does not have — resolve this BEFORE writing the file.**
    It destructures `{ answers, quadrant, frequencyVerdict, board, pack }` unguarded
    (`build-keep.mjs:75`) and then does `appetite.options.find(o => o.value === answers.appetite)`
    (`:79`) and `QUADRANT_MEANINGS[quadrant]` (`:97`). On /factory `readBuild()` returns
    `answers: null, quadrant: null, frequencyVerdict: null` (`build-questions.mjs:65-73`) — which is
    precisely why `studio.mjs:387` carries `stored.answers ?? DEFAULT_ANSWERS`. Passing the raw store
    **throws** on line 79; passing it with only `answers` filled prints `undefined` into the ethics
    section.

    **The answer, and it needs no change to `build-keep.mjs`:** `quadrantFor(answers)` and
    `frequencyVerdictFor(answers)` are both **exported pure functions** from `build-questions.mjs`
    (`:79`, `:87`), and `publishState` (`:99-100`) computes the store's own two fields with exactly
    those calls. So the rail assembles the spec's state itself:

    ```js
    const answers = stored.answers ?? DEFAULT_ANSWERS;   // studio.mjs:387's line, same reason
    const state = { answers, quadrant: quadrantFor(answers),
                    frequencyVerdict: frequencyVerdictFor(answers), board, pack };
    ```

    No invented data, no second opinion, and the same two functions the store uses. **The honesty
    obligation:** the downloaded spec must say the answers are the *recommended* ones and not the
    visitor's — `renderSummary` (`studio.mjs:283-287`) already tells the reader this on the page, and a
    downloaded file that quietly drops that sentence would be the one dishonest artifact in the rail.
    Add it to the rail's own copy beside the button; do **not** edit `specMarkdown` to carry it, or the
    /build download changes too.
  - **Tier 3 — the share link.** `shareUrl(await settledUrl(), await encodeBuild({ ...state, arrangement }))`
    where `arrangement` is read from the **live canvas** (`data-col`/`data-row` per place id) — /factory is
    the only page in the repo that can produce a `g` field. Then `replaceUrl`, then the field, then
    **`trackFactoryLinkCopied()`**, in that order (the caller contract).
  - **`settledUrl()`** — copy `build-keep.mjs:251-256` verbatim, comment and all, and cite it. It is the
    `onVirtualRoute()` contract, and with three routes now on this page the window it guards is *more*
    reachable, not less.
  - **The bare-board hide**: `emptyEl.hidden = !bare`, and all three tier containers `hidden = bare`.
    `factory.html:79` already carries `[hidden]{display:none!important}`, so the author-`display` trap
    (memory `hidden-defeated-by-author-display`) is closed **on this page** — verify that any new
    `studio.css` rule for the tiers does not reintroduce it (no bare `display:` on a tier selector without
    the `[hidden]` rule winning).
- **UPDATE** `system/build-keep.mjs:71-73` — the comment on `specMarkdown` currently reads "Exported for the
  committed gate, **not for another surface**". This ticket makes that false. Amend it to name
  `system/studio-keep.mjs` as the second consumer and restate the rule it still carries (one generator, two
  surfaces; never forked). **This is the only change to that file.**
- **GOTCHA**: mount the rail's readiness handle in a `finally` — `root.dataset.studioKeep = "ready"` on
  every path, including the early returns (the `device-frame.mjs`/`studio.mjs` precedent). The pixel gate
  and `studio-journey` both wait on it.
- **GOTCHA**: refusals go to the rail's own note paragraph and `canvas.say(...)`, never a throw and never
  `console.error` — `studio-journey`'s no-page-errors contract is a real assertion.
- **PATTERN**: `system/build-keep.mjs` end to end.
- **VALIDATE**: `node -e "import('./system/studio-keep.mjs')"` → no throw (Node-import safety).
- **SATISFIES**: AC #2, #3, #6.

---

### Task 7 · UPDATE `factory.html` + `system/studio.css` — the rail's markup and styles

- **IMPLEMENT**: a `[data-studio-keep]` block below the studio shell (before `#verify-further`), with a
  `<noscript>` sentence in the same voice as the canvas's (`factory.html:234-242`) — the rail is entirely
  script-produced. Add `<script type="module" src="/system/studio-keep.mjs">` to the script block, after
  `studio.mjs` (which mounts and exposes `getStudio()`).
- **IMPLEMENT**: the tier styles in `system/studio.css` — tokens only, no literals, and **no view-transition
  name anywhere** (the #171 lesson; #190 has not landed).
- **GOTCHA — AT-REST**: the rail is visible at rest once the replay settles (the board is non-bare), so it
  **is** in the pixel baseline. Keep the at-rest state deterministic: no timestamp in any visible string, no
  animation that has not finished by the ready handle. `specMarkdown` interpolates `new Date()` — that is a
  *download*, never rendered on the page. Keep it that way.
- **VALIDATE**: `npx serve .` → /factory renders under the neutral pack; console clean; the rail appears.
- **SATISFIES**: AC #2, #6.

---

### Task 8 · UPDATE `system/studio.mjs` — mount the rail off `publishBoard`

- **IMPLEMENT**: the rail reads the board, summary and arrangement through the existing `live` handle;
  `publishBoard` (`:454-468`) already updates all three at settle and at take-over — add the rail's
  refresh there, in the same place, for the same reason the comment gives.
- **GOTCHA**: **do not** make the rail a second mover and **do not** let it write the build store
  (`:34-37` — "THIS FILE READS THE BUILD STORE AND NEVER WRITES IT"). The rail reads.
- **VALIDATE**: `npx serve .` → the rail's numbers match the "This build" panel's after the replay settles.
- **SATISFIES**: AC #2, #6.

---

### Task 9 · UPDATE `system/studio.mjs` — `?b=` restore on /factory

- **IMPLEMENT**: before the canvas is populated, read `SHARE_PARAM` from `location.search`; if present,
  `await decodeBuild(param)`. On success, seed `board` from `state.board` and the arrangement from
  `state.arrangement`, place the blocks at their restored slots (through `clampSlot`, never a raw
  col/row), and adopt the restored pack the way `build-import.mjs` already does. On failure, scrub the
  param through `settledUrl()` and say why — `build-keep.mjs:356-377` is the whole pattern, refusal
  sentence included.
- **GOTCHA**: `mountStudio` is currently synchronous below the glossary call. `decodeBuild` is async. Keep
  the `finally`-set `data-studio="ready"` semantics exactly: the handle must still be set on **every**
  path, and it must not be set *before* the restore has settled, or the pixel gate captures a page mid-restore
  (`build-keep.mjs:382-384` makes the same call for the same reason).
- **⚠️ GOTCHA — THE NO-`?b=` PATH MUST STAY SYNCHRONOUS.** This is a baseline-*timing* change, not only a
  correctness one. Today `data-studio="ready"` resolves synchronously at mount and `[data-replay="settled"]`
  is the late handle; the VR gate and `studio-journey` both wait on them in that order. If an `await` lands
  on the common path, every gate's timing shifts on a page where nothing actually changed — and the pixel
  gate re-baselines that class of drift rather than catching it. **Read `location.search` for `SHARE_PARAM`
  BEFORE any await and branch async only when it is present.** Verify it: run
  `node tooling/studio-journey.mjs all` against a clean `/factory` before and after this task and confirm
  identical handle timing, and run `update:docker` on a `/factory` with no `?b=` and confirm **zero** pixel
  churn from this task alone (the rail's churn is Task 7's and must not be confounded with it).
- **VALIDATE**: `npx serve .`, copy a link from the rail, open it in a fresh tab → the same board, the same
  arrangement, the same pack.
- **SATISFIES**: AC #2, #6.

---

### Task 10 · UPDATE `system/studio.mjs` + `system/replay-driver.mjs` — the declined mount

- **IMPLEMENT**: this is issue #210's comment, and PR #240 review finding 6. `studio.mjs:388-394` records
  that a visitor-supplied board "must place what the visitor brought and let the driver mount in a
  **declined state** rather than assembling over it", and `mountReplay` is called unconditionally. Task 9
  makes the `own` branch reachable for the first time.

  Add a `declined: !!own` option to `mountReplay`; in the driver, an early return in `start()` that skips
  playback. **Both constraints #240 added must be honoured:**
  1. **Re-enable the compile beat.** `studio.mjs:472` calls `compile.setEnabled(false)` immediately before
     mounting the driver and re-enables on settle / take-over / mount failure. A driver that mounts declined
     and never settles leaves /factory's primary control dead. The declined branch must call
     `publishBoard(own)` (or otherwise reach `compile.setEnabled(true)`).
  2. **Adopt the `tookOver` state, not `ready`.** The whole transport is disabled once `tookOver` is set
     (#240). A declined mount is closer to "already handed over" than to "ready".
- **IMPLEMENT**: the chrome says so honestly — the replay panel states that this board is the visitor's own,
  restored from a link, so the recorded run did not play. It must not read as a broken replay.
- **GOTCHA**: `[data-replay]` is what the pixel gate and `studio-journey` wait on. The declined path must
  set it in the same `finally`, to a value the gates can distinguish (`"declined"`).
- **GOTCHA**: delete or rewrite `studio.mjs:388-394`'s comment — it says "no code path reaches the `own`
  branch today, so it is untested by construction". After this task that sentence is false, and a stale
  comment that says code is unreachable is worse than none.
- **VALIDATE**: `npx serve .` → `/factory?b=<a link the rail produced>` shows the visitor's board, no replay,
  a working Compile button, and honest chrome.
- **SATISFIES**: AC #2, #6, and the carried-over finding 6.

---

### Task 11 · UPDATE `tooling/build-checks.mjs` — group 6 grows

- **IMPLEMENT**: extend the `artifacts` group (`:867`) to drive `exportHtml` over the same hostile fixtures
  the SVG templates already face: a hostile place label, a hostile token value, an over-long label, and a
  token map that `vetTokens` rejects whole. Assert the emitted document (a) parses (`DOMParser` is not
  available under Node — use a structural assertion: no unescaped `</style>` outside the intended tags, no
  `<script`, balanced tag counts), (b) contains **no** rejected token value, (c) escapes the text fields
  exactly once.
- **GOTCHA**: **run the function; do not grep for the constant** (memory `check-that-cannot-fail`). Mutate
  `exportHtml` to skip escaping, watch the group go red, revert, and record it.
- **VALIDATE**: `node tooling/build-checks.mjs`
- **SATISFIES**: AC #4.

---

### Task 12 · UPDATE `tooling/build-checks.mjs` — group 10 grows

- **IMPLEMENT**: extend the analytics group for the two new routes, matching what the group already proves
  for `/factory/took-over`: both paths static literals, no `?b=` payload against a `location.search` that
  *is* carrying a real payload, each fires exactly once, the real URL restored verbatim including the hash —
  **and the OVERLAPPING-FLIP case in both orderings** (export-then-copy and copy-then-export), which is now
  a three-route page. Update the group's summary string.
- **VALIDATE**: `node tooling/build-checks.mjs`
- **SATISFIES**: AC #5.

---

### Task 13 · ADD `tooling/build-checks.mjs` group 17 — the exporter's pure layer

- **IMPLEMENT**: a new group driving `studio-export.mjs` under Node:
  - the emitted document carries **no** `fetch`, `import`, `<script`, `@import` or `url(` — the zero-request
    claim, asserted on the produced string rather than on the sources. **The CSS fixture must be the real
    committed files read off disk** — `system/tokens.contract.css` + **each of the four shipped packs in
    turn** (`neutral`, `saulera`, `verdant`, `plusui`, read from `dock.mjs`'s `PACKS` rather than
    hand-listed) + `system/components.css` — never a synthetic string. **This check demonstrably can fail:**
    `tokens.saulera.css:19` carries a live `@import url("../fonts/fonts.css")`, so removing the strip turns
    this case red on real committed input with no mutation needed. That is the difference this group is
    for (memory `check-that-cannot-fail`), and it is worth stating in the group's summary line;
  - the arrangement survives: a slot at col 4 row 2 emits grid line placement for col 4 row 2;
  - `MAX_COLS`/`MAX_ROWS` are **imported** and not re-literalled in the exporter (the group-12 discipline,
    both directions);
  - totality over ~10 junk inputs — null, garbage slots, a hostile token map, an empty composition — never
    a throw;
  - determinism: two runs of the same input produce byte-identical strings (no timestamp, no counter);
  - the honesty sentences in the provenance block asserted by **identity** against their imported constants,
    not by substring.
- **STATE THE BOUNDARY** the way groups 9, 11, 13 and 16 do: the cold-`file://` render, the zero *actual*
  requests, the rail's both-ways hide and the download success path are `tooling/studio-journey.mjs`'s and
  the spike's — say so in the group's summary line.
- **UPDATE** the verdict tail: `all 16 groups pass` → `all 17 groups pass`.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓ all 17 groups pass`
- **SATISFIES**: AC #2, #3, #4.

---

### Task 14 · UPDATE `tooling/studio-journey.mjs` — the #210 half

- **IMPLEMENT**, cross-engine (`chromium|firefox|webkit|all`), the things build-checks structurally cannot
  reach:
  1. **The three tiers hide when the board is bare, asserted BOTH WAYS on the running page** (AC #6). The
     reachable bare-board path on /factory is a `?b=` link whose board has no places — /factory has no
     remove verb, so produce one on /build (which does), or encode one directly with `encodeBuild`. Assert
     the empty state is visible and each tier has **zero client rects**, then restore a non-bare board and
     assert the exact inverse.
  2. **Export click → a download happens**, via Playwright's `waitForEvent("download")`, and the downloaded
     bytes parse as HTML containing the composed components.
  3. **Copy click → the address bar carries a real `?b=` with a `g` field**, and the pathname is **not**
     virtual (the `settledUrl` contract, driven rather than reasoned about).
  4. **The two routes fire once each**, observed through `history` pushes, and the real URL is restored.
  5. **The declined mount**: navigate to `/factory?b=<a restorable link>`, assert the visitor's board is on
     the canvas, `[data-replay="declined"]`, **no** `agent.*` emission at all, and the Compile button
     **enabled** (constraint 1 of Task 10 — the one that would otherwise ship a dead primary control).
  6. **Reduced motion** and a clean console throughout.
- **GOTCHA**: the artifact/route-timing race #209 already hit — a listener attached after the first beat
  counts short. Attach before navigation (route-delay the artifact fetch, exactly as the #209 half does).
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then `node tooling/studio-journey.mjs all`
- **SATISFIES**: AC #2, #5, #6.

---

### Task 15 · UPDATE `system/param-manifest.json` + regenerate the count

- **IMPLEMENT**: one entry per new control under the existing `/factory` key (the export button, the four
  pack downloads as one row if the manifest's counting rules say so — **read `$description` and follow it**,
  the share control). Then `node agent-layer/gen-param-count.mjs`.
- **GOTCHA**: CI `verify` drift-checks this. An omitted control is a review-catchable gap.
- **VALIDATE**: `node agent-layer/gen-param-count.mjs --check` (or whatever the drift flag is — read the
  file) exits 0.
- **SATISFIES**: repo cascade rule.

---

### Task 16 · REGENERATE `system/loc-summary.json` + the two approach baselines

- **IMPLEMENT**: two new tracked source files ⇒ `node agent-layer/gen-loc-summary.mjs`, then regenerate
  approach's two baselines — approach.html **renders** these numbers (memory `loc-summary-baseline-cascade`).
- **GOTCHA**: `gen-loc` reads git-tracked content, so run it **after** staging (memory
  `loc-summary-counts-tracked-only`).
- **VALIDATE**: `node tooling/drift-check.mjs` (or the `verify` job's command) is clean on a clean tree.
- **SATISFIES**: repo cascade rule.

---

### Task 17 · REGENERATE factory's two visual baselines

- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker`, from a **clean detached worktree
  under `/Users`** — the gate screenshots the dirty tree and Docker cannot share `/private/tmp` (memories
  `vr-gate-reads-working-tree`, `local-agent-visual-gate-notes`).
- **GOTCHA — the baseline-collision rule**: branch from **`origin/main`** (currently `f55cfb2`, #209's
  merge), **not from the current HEAD** — the local `feature/studio-replay-driver-takeover-209` branch still
  carries five post-merge commits that the squash already folded in, and branching from it would replay
  them. If `main` moves before
  review, **merge `main` first, then re-run `update:docker`**, and check `mergeStateStatus` before triaging
  any review finding (memory `review-validated-premerge-tree`).
- **GOTCHA**: `maxDiffPixels:100` swallows a few changed digits — a green update run is not proof the page
  did not change (memory `vr-tolerance-hides-text-changes`). Eyeball the two new PNGs.
- **VALIDATE**: `npm run update:docker` completes; the two `factory-*.png` baselines are updated in the diff.
- **SATISFIES**: repo cascade rule.

---

### Task 18 · The PR

- **IMPLEMENT**: PR body carries **`Closes #210`** (memory `prs-dont-auto-close-tickets` — a title
  mentioning `(#210)` closes nothing). The plan, the spike report, the implementation report and the review
  all live in **this** PR (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`).
- **SATISFIES**: repo rule.

---

## TESTING STRATEGY

This repo has no suite, no linter and no type-check — do not hunt for one. "Done" = run the surface you
touched (CLAUDE.md). The gates are the tests.

### CI-reachable (pure, no browser) — `tooling/build-checks.mjs`
Groups 6 (escaping over hostile fixtures), 10 (the two routes + uniqueness + overlapping flips), and the new
17 (the exporter's pure layer). Every case **runs** the function.

### Operator-run, cross-engine — `tooling/studio-journey.mjs`
Everything that is a running-page fact: the both-ways hide, the real download, the real address bar, the
declined mount, the enabled Compile button, the clean console.

### Cold-open — the spike, and one repeat after implementation
Open a *real* exported file from `file://` in a fresh profile with the Network panel open. This is the only
check for AC #2 and no automated gate replaces it. Repeat it once against the shipped exporter, not only
against the spike's hand-assembly.

### Pixel gate — `tooling/visual-regression`
The rail is at-rest visible. Its baseline churn is expected and Task 17 owns it.

### Edge cases that must be exercised
- A board that compiles to **nothing** (out-of-library / empty) → the export tier says what it is rather
  than emitting an empty document that claims to be a product.
- The vocabulary **unavailable** → the same sentence `renderUnavailable` prints, not a new one.
- A **bare** board → all three tiers hidden, both directions.
- An **imported** pack and a **derived** pack → the export wears them (spike checklist 3).
- The **saulera** pack via the dock → the re-pointed stylesheet is inlined (checklist 4).
- An export click and a copy click **inside each other's 50 ms window**, both orderings.
- `?b=` carrying an arrangement that no longer describes the board → the codec drops `g` by itself
  (`build-share.mjs`'s `arrangementSlots`); do not add a second opinion.
- A **hostile** token value and a hostile place label through the export template.

## VALIDATION COMMANDS

### Level 1 — module sanity
```bash
node -e "import('./system/studio-export.mjs').then(()=>console.log('export ok'))"
node -e "import('./system/studio-keep.mjs').then(()=>console.log('keep ok'))"
```

### Level 2 — the CI gate
```bash
node tooling/build-checks.mjs        # must print: build ✓  all 17 groups pass
```

### Level 3 — the drift checks CI runs
```bash
node agent-layer/gen-param-count.mjs
node agent-layer/gen-loc-summary.mjs
node tooling/drift-check.mjs
```

### Level 4 — the running page
```bash
node tooling/visual-regression/serve.mjs &
node tooling/studio-journey.mjs all
node tooling/build-journey.mjs all        # /build must be unregressed
node tooling/vt-verify.mjs                # /factory's boot transition count must be unchanged
npx serve .                                # then open /factory by hand
```

### Level 5 — the pixel gate
```bash
cd tooling/visual-regression && npm run update:docker   # from a clean detached worktree under /Users
```

---

## ACCEPTANCE CRITERIA

Mapped to the ticket's own list.

- [ ] **AC #1** — Spike 3 run; verdict and branch recorded in `.claude/reports/…-spike3.md`, and the rail's
      copy matches the branch taken. (Task 1, Task 6.)
- [ ] **AC #2** — An exported file opened cold from `file://` in a fresh browser renders the composed product
      under the visitor's pack, with **no network request** and no missing style. (Tasks 1, 4, 6, 7;
      re-verified by hand after implementation.)
- [ ] **AC #3** — The export is assembled from the same fetched sources the page renders; **no hand-written
      markup anywhere in it** — `renderComposition`'s own live output is serialized. (Tasks 4, 5, 6, 13.)
- [ ] **AC #4** — Hostile labels and imported token values neutralised at the template, **once** — the same
      discipline as `build-card.mjs`, and `vetTokens` as the single application point. (Tasks 4, 11.)
- [ ] **AC #5** — Both routes fire exactly once, from their success paths, static literal paths, no `?b=`
      payload; group 10 grows to prove it **including the overlapping-flip case**. (Tasks 2, 3, 12, 14.)
      Plus: the two literals collide with none of the seven already in the module.
- [ ] **AC #6** — All three artifact tiers hide when the board is bare, asserted **both ways on the running
      page**. (Tasks 6, 7, 14.)

Riding requirements (epic-level, stated once there and inherited):

- [ ] `Closes #210` in the PR body.
- [ ] Plan + spike report + implementation report + review committed in this PR.
- [ ] `param-manifest.json` + `gen-param-count.mjs`; `gen-loc-summary.mjs` + both approach baselines; both
      factory baselines.
- [ ] `node tooling/build-checks.mjs` green at 17 groups; `studio-journey all` green on three engines.
- [ ] Every new check **proven able to fail** by mutating the source (recorded in the report).

---

## COMPLETION CHECKLIST

- [ ] Spike 3's six checks run and answered, verdict committed
- [ ] All tasks completed in order, each validated immediately
- [ ] `build-checks` prints `all 17 groups pass`
- [ ] `studio-journey.mjs all` green; `build-journey.mjs all` unregressed; `vt-verify` unchanged
- [ ] A real export opened cold from `file://`, Network panel empty
- [ ] `/factory?b=…` restores board, arrangement and pack, with a declined driver and a live Compile button
- [ ] Baselines regenerated from a clean detached worktree; the two new factory PNGs eyeballed
- [ ] No inline styles, no view-transition names, no `console.error` on any path
- [ ] `build-keep.mjs`'s `specMarkdown` comment amended; `studio.mjs:388-394`'s comment rewritten

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes** (each would change the plan if wrong):

1. **The rail goes on /factory, not /build.** Three independent confirmations: `analytics.mjs:287` says
   "#210 is about to put two more routes on this same page" (that page being /factory);
   `build-keep.mjs:258-264` says "/build has no canvas, so it can neither show an arrangement nor edit one"
   while the ticket's headline is the share link *carrying the arrangement*; and the success metrics are
   studio metrics. `build-keep.mjs` is named as a seam because we **import** from it.
2. **The export is the composed product, not the fat-marker blocks.** A board that has not compiled is
   exported by re-running the pipeline through `compile.composed()`; the reader does not have to press
   Compile first.
3. **One screen.** No nav script. #212 owns flows.
4. **The route literals are `/factory/link-copied` and `/factory/exported`.** Verified free against the
   seven existing literals. If the owner prefers different names, only Task 2's two constants change.

**Questions raised during planning, and CLOSED — kept here because each one's answer is a constraint:**

- **Q1 — is the bare board actually reachable on /factory? YES, and the driver can build the link itself.**
  At rest the replay autoplays to a full board; /factory has no *remove* verb (`studio-verbs.mjs` owns
  move/undo/redo only) and Act 0's "Clear the canvas" clears the **pack**, not the board. The reachable
  path is a `?b=` link carrying a board with no places — and that round-trips, **verified by running it**:

  ```
  $ node -e '…encodeBuild({answers: DEFAULT_ANSWERS, board:{places:[],connections:[]}, pack:null})…'
  encoded:        AT2PMQ7CMBRD7-L5D7D-GyAxwoQYQuqWiDQJSZqq…
  decoded places: {"places":[],"connections":[]}
  ```

  So Task 14's bare-board case builds its own link with `encodeBuild` — it does **not** need to go via
  /build, and AC #6 is assertable both ways on a real page. (This was the plan's largest residual risk: an
  AC whose state might not be reachable.)
- **Q2 — does group 7 flag the exporter? YES, on `.outerHTML` — and the fix is decided.** Predicate read at
  `tooling/build-checks.mjs:954-956`: a plain `src.includes` over four sinks, whole file, comments included.
  Use `XMLSerializer().serializeToString()`; write `outerHTML` without a leading dot in prose. Full
  reasoning in **Patterns to Follow**. No exception is argued and none is needed.
- **Q3 — do the shipped stylesheets survive inlining? Three of four packs yes; saulera no.**
  `tokens.saulera.css:19` is a live `@import` to a directory that does not exist. The exporter strips
  `@import` and states the substitution. Full table in **Relevant Documentation**.
- **Q4 — how much of `studio.css` does the export need?** The plan emits a small hand-written grid block
  rather than inlining the page sheet (which carries canvas chrome — grab handles, zoom rows — the export
  has no use for). Spike checklist item 6 confirms it is sufficient; if it is not, widen the block, do not
  inline `studio.css`.
- **Q5 — the `<title>` of the exported document.** It names the pattern, which is visitor-influenced text
  and therefore escaped as text (not as markup). Task 4's two-category rule covers it; confirm no place
  label reaches it unescaped.

**Genuinely open — the only one left, and it is the spike's whole purpose:**

- **Spike 3's verdict.** Everything the spike could have discovered *statically* has now been discovered
  statically (Q1–Q3 above). What remains is the one thing only a cold open can answer: does a real browser,
  opening a real `file://` document with no server, paint the composed components correctly under a
  visitor's pack. Both copy branches are written below; the implementer keeps one.

  > **Faithful branch (rail copy):** "A single file that runs. Open it anywhere — no server, no build step,
  > nothing to install. It carries this system's tokens and components inline, wearing your design values."
  >
  > **Gaps branch (rail copy):** "The screen as a standalone HTML file, plus your pack. It carries the
  > components and your token values inline; \<the measured gap, named exactly\>. It is not a substitute for
  > the running studio, and this line says so rather than the file pretending otherwise."

  Under either branch the provenance block also carries the font sentence from Q3.

---

## NOTES (open canvas)

**Why the exporter re-renders rather than scraping the canvas.** The obvious implementation is
`stage.innerHTML`. It is wrong three ways: at rest the stage holds fat-marker blocks, not components, so
the export would be of the wrong thing; the wrappers carry canvas chrome (`.stx-grab` handles, ARIA wiring,
`data-stx-id`) that means nothing outside the studio; and it would couple the export's fidelity to whether
the reader happened to press Compile. Calling `renderComposition` into a detached container gives us the
renderer's *own* output — which is literally what AC #3 asks for — with no canvas chrome and no ordering
dependency. The arrangement is then read separately, from `data-col`/`data-row` on the live wrappers, which
is also exactly what the share codec's `g` field reads. **One source for the components, one source for the
arrangement, and the two are the same two the share link uses.**

**Why the routes are `flipTo` and not the simple shape.** `analytics.mjs:284-288` already made this call for
`/factory/took-over` and named this ticket in the reasoning. /factory carries the appearance dock (which
writes `location.hash`) and #206's hash-routed inspector, so the live-hash restore matters; and with three
routes on one page the overlapping-flip rule stops being theoretical. An export click and a copy click 30 ms
apart is an ordinary thing for a reader to do.

**The `settledUrl` dependency is now load-bearing in a way it was not on /build.** On /build there were two
routes and one of them (`/build/pattern`) fires from a render, far from the copy click. On /factory there
are three, and **two of them are the rail's own buttons**. `build-keep.mjs:239-250`'s whole paragraph applies
here with more force, not less. Copy it, cite it, and do not shorten it.

**The declined mount is the ticket's quietest risk.** It is the one place where this ticket turns on code
that has never run. Two failure modes, both named in the #240 comment and both silent: a dead Compile button
(the beat is disabled immediately before the driver mounts and only re-enabled on settle/take-over/failure —
none of which a declined mount reaches), and a transport that is `ready` when it should be `tookOver`. Task
14's journey case 5 is what makes both loud.

**Rejected alternative — grow /build's rail instead.** It would need no new page markup and no baseline
churn. Rejected because /build has no canvas: it cannot show an arrangement, cannot compile, and cannot
produce the `g` field the ticket's own headline names. The studio's metrics would also stay unmeasured,
which is the ticket's other half.

**Rejected alternative — a build-time export generator.** It would be smaller and provably correct under
Node. Rejected because it contradicts the ticket in its first sentence ("assembled **client-side** from the
same sources the page renders") and the whole committed-rules-in-the-browser argument: an export produced by
a generator is a claim about the generator, not about what the reader just watched happen.

**Sequencing note.** Task 1 (the spike) gates Tasks 4/6/7's copy but nothing else. Tasks 2/3 (analytics) are
genuinely independent and can land first — doing so means the collision is resolved before any caller
exists, which is the cheapest moment to be wrong about a route name.

## AMENDMENTS

<!-- append-only; newest at the bottom -->

- 2026-08-05 — pre-execution review pass, five corrections folded in before any code was written:
  (1) Task 6 now resolves `specMarkdown`'s missing `quadrant`/`frequencyVerdict`/null-`answers` state on
  /factory — it would have thrown at `build-keep.mjs:79` — via the exported `quadrantFor`/`frequencyVerdictFor`,
  with the honesty sentence the downloaded spec now owes the reader. (2) Task 9 gains the hard constraint
  that the no-`?b=` path stays synchronous, because `data-studio="ready"`'s timing is what both gates wait
  on. (3) Group 17's zero-request assertion is pinned to the **real committed CSS files** rather than a
  synthetic fixture, so it can actually fail. (4) The two-claims honesty sentence is decided as IMPORTED
  (Task 4 previously said "if practical"), because Task 13 asserts it by identity. (5) Task 17's branch
  point corrected to `origin/main` rather than the local #209 branch.
- 2026-08-05 — second pass: the four remaining open questions were closed by **running the checks rather
  than deferring them to the implementer**, which is what took the confidence from 9 to 9.5.
  **Q2 → a real defect caught pre-implementation:** build-checks group 7 bans `.outerHTML` by plain
  substring over the whole file, comments included (`tooling/build-checks.mjs:954-956`) — the plan's own
  Task 6 would have failed the gate as written. Switched to `XMLSerializer().serializeToString()`, with the
  write-it-without-the-leading-dot note for the header prose. **Q3 → a real fidelity gap found statically:**
  `system/tokens.saulera.css:19` is a **live** `@import url("../fonts/fonts.css")` — not a header comment,
  as both the plan and the review had assumed — pointing at a directory that does not exist; saulera is
  dock-selectable and VR-captured, so the exporter now strips `@import` unconditionally and states the font
  substitution, and group 17's zero-request assertion becomes one that fails on real committed input rather
  than needing a mutation. **Q1 → the plan's largest residual risk retired:** an empty board round-trips
  through the share codec, verified by running `encodeBuild`/`decodeBuild` under Node, so AC #6's
  bare-board state is genuinely reachable on /factory and Task 14 builds the link itself rather than
  routing through /build. Only spike 3's cold-open verdict remains open, and both copy branches are now
  written verbatim for the implementer to choose between.
- 2026-08-05 — third pass, three additions and one self-inflicted proof that the C0 rule is real:
  (a) spike checklist item 1 now settles the **serializer** — `XMLSerializer` emits XML serialization
  (self-closed voids, an `xmlns` on the serialized root), inert in a `text/html` document but a difference
  between what the studio paints and what the export paints, so it is diffed in the console during the
  spike rather than assumed in Task 6, with the `cloneNode` fallback named; (b) Task 4 gains the
  **raw-control-byte** GOTCHA (group 7 `:965-967`, `replay-driver.mjs`'s precedent); (c) spike item 4 now
  compares the studio and the export **side by side under saulera**, because Q3's provenance sentence is
  only honest if it names the gap that actually exists rather than the deduced one. And while writing (b)
  this document acquired a literal `U+0000` inside the very sentence warning against literal `U+0000`s —
  detected by running the group-7 predicate over the plan itself, and stripped. The rule earns its place.
