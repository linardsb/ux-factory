# Feature: Legibility surfaces — annotated source blocks + glossary term definitions

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing. Pay special attention to naming
of existing tokens, classes, and module exports — import from the right files, mirror the shipped
generator and view-time-module idioms exactly.

## Feature Description

Two new legibility surfaces on `approach.html`, implementing
`docs/epics/annotated-source-glossary.architecture.md` (patterns borrowed from
[zarazhangrui/codebase-to-course](https://github.com/zarazhangrui/codebase-to-course); no code adopted):

1. **Annotated-source blocks** — two figures in the `#case` section showing *real, shipped code*
   beside hand-written plain-English prose. The code is **extracted at build time** by a new
   zero-dep generator (`agent-layer/gen-annotated-source.mjs`) from anchor-marked regions of the
   live source files into one committed JSON artifact — so the code shown can never drift from the
   code that runs. A missing/ambiguous anchor is a hard build failure; the artifact joins the CI
   drift-check gate.
2. **Glossary term definitions** — seven technical terms in the existing `approach.html` copy get
   a quiet dotted underline and a hover/focus definition bubble (WCAG 1.4.13: hover *and* focus,
   dismissible with Esc, persistent, hoverable; fixed-position so no ancestor `overflow` clips it).

Register (hard constraint from PRD §6 legibility bar): **no pedagogy framing** — no "learn",
no callouts, no quiz energy. The blocks read as evidence ("this is the actual rule"), the
tooltips as quiet clarification.

## User Story

As a **hiring manager (non-engineer) evaluating this UX-engineering portfolio**
I want to **see the actual shipped code behind the site's claims, explained in plain English, and understand its technical terms in place**
So that **the "verify, don't trust" proof is legible to me on the page — not locked behind reading a GitHub repo I can't parse.**

## Problem Statement

The platform's proof is the repo itself, but source code is only legible to the engineer half of
the audience. `approach.html` §05 ("In practice") *claims* token discipline and
accessibility-by-construction in prose; the code that makes those claims true is invisible to a
non-technical reader. The copy also uses terms (semantic tokens, token contract, brand pack,
llms.txt…) that a recruiter can't be assumed to know.

## Solution Statement

Extract two real code regions at build time (the `.btn-primary` rule — pure token discipline; the
derive engine's accent-contrast negotiation — accessibility as a rule) into a committed,
drift-checked JSON artifact; render them in `#case` via a new hand-written view-time module using
the established fetch → pure prepare → DOM render pattern (`handoff.html` / `handoff-viewer.mjs`).
Mark seven terms in the existing copy with `<dfn data-term>`; a second small module wires the
definition bubble. Styles in `portfolio.css` (portfolio surface — **never** `components.css`).

## Out of Scope / Non-Goals

- **Not touching `factory.html`** — factory placement of annotated blocks (e.g. the renderer's
  refusal branch beside the agentic embeds) is the named follow-up, **after** motion Phase 3
  (`.claude/plans/portfolio-motion-phase03-factory-showpiece.md`), which owns that file's edits.
  Scoping v1 to `approach.html` is what makes this plan independent of Phase 3.
- **Not changing** `system/components.css`, any token file, or anything in the handoff pack. No
  new semantic tokens. No `gen-token-css` / `gen-handoff` regen.
- **Not building** line-by-line annotations (course-repo style) — region-level prose per the
  architecture doc's data model. Not building a "Glossary" page/section — inline terms only.
- **Not adopting** any code, CSS, or asset from codebase-to-course.
- **Not adding** motion — the bubble shows/hides instantly; zero new animation (no motion-token
  work, no reduced-motion complexity beyond what exists).
- **Not marking terms** on pages other than `approach.html` in v1 (the glossary map is
  superset-ready; other pages are follow-up).

## Feature Metadata

**Feature Type**: New Capability (exhibit surface + one build-time generator)
**Estimated Complexity**: Medium (five small new files, four small edits; every piece mirrors a shipped idiom)
**Primary Systems Affected**: `approach.html`, `system/portfolio.css`, `system/` view-time modules, `agent-layer/` generators, `tooling/drift-check.mjs`, VR gate
**Dependencies**: none new (zero-dep Node ESM + vanilla page modules)

## Related Work

**Implements**: [docs/epics/annotated-source-glossary.architecture.md](../../docs/epics/annotated-source-glossary.architecture.md) (decisions inherited, not re-decided) · **Epic**: `docs/epics/ai-first-ux-factory.*` (PRD §6 legibility layer)

**Back-references** (inherits decisions from):

- `docs/epics/annotated-source-glossary.architecture.md` — extraction-over-copying, anchor
  hard-fail, portfolio.css boundary, WCAG 1.4.13 posture, rejected borrows.
- Established idioms: `gen-token-css.mjs` (check mode), `gen-pack-bundle.mjs` (standalone guard,
  determinism), `handoff-viewer.mjs` + `handoff.html` (pure/DOM split, fetch pattern, textContent-only).

**Forward-references**:

- Factory-page placement (renderer refusal-branch block) — separate plan, after Phase 3 lands.

**Documented deviation from the architecture doc**: it says the work "lands after motion
Phase 3." That sequencing existed only because of `factory.html` collision; v1 touches
`approach.html` only, so it can land before/parallel to Phase 3. Not a decision reversal.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `agent-layer/gen-pack-bundle.mjs` (whole file, 63 lines) — Why: the generator template to
  MIRROR: header comment style, `ROOT` resolved from the module (line 15 — build-time paths are
  NEVER cwd-relative), determinism notes, `pathToFileURL` standalone guard (lines 58-63 — the
  repo path contains a space; naive `file://${argv[1]}` never matches), `✓` log-line format.
- `agent-layer/gen-token-css.mjs` (lines 133-156) — Why: the **check-mode contract to mirror
  exactly**: `gen<Name>({ check = false } = {})` → returns `{ …, drifted: [fileNames] }`; `--check`
  CLI flag; standalone run exits 1 on drift.
- `tooling/drift-check.mjs` (whole file, 87 lines) — Why: where the new check registers. Mirror
  `checkTokenCss()` (lines 38-44: in-memory check, throw naming the regen command). Note step 1
  (`checkSyntax`) already `node --check`s every tracked `.mjs` — the new generator and modules are
  auto-covered. Update the final `✓` summary line (line 82).
- `system/handoff-viewer.mjs` (lines 1-34, 38-76, 178-257) — Why: the view-time module template:
  header-comment register ("hand-written canon"), `el()` DOM builder (lines 24-34 — copy it),
  pure `prepare*` (throws plain Error, DOM-free so Node can import) + `render*` (textContent only,
  never innerHTML from data; module injects no `<style>`; returns `{ destroy }`).
- `handoff.html` (lines 152-183) — Why: the page-side wiring pattern: inline
  `<script type="module">`, `fetch` committed JSON with `if (!r.ok) throw`, `.then(render)`,
  `.catch` degrade. Also lines 45/81/99: the mono font stack precedent
  (`ui-monospace, SFMono-Regular, Menlo, monospace`) — there is **no** `--font-mono` token.
- `approach.html` (whole file, 351 lines) — Why: the host page. `#case` section (lines 210-273)
  hosts the blocks after the `.decision-card` grid (ends line 271). Term occurrences to mark:
  "semantic tokens" (line 236), "token contract" (line 253), "brand pack" (line 254),
  "structured data" + "llms.txt" (line 266), "activation" (line 105), "retention" (line 106).
  Script block at lines 346-349 — the new module script goes after line 349, before `</body>`.
- `system/portfolio.css` (lines 1-40, 79-96) — Why: file header states the promotion rule + the
  "only semantic tokens, raw values only where noted" rule (the mono stack needs such a note);
  `.skip-link` (lines 25-38) shows the inverse-surface token pairing to reuse for the bubble
  (`--color-bg-inverse` / `--color-fg-on-inverse-strong`); reduced-motion kill-switch context.
- `system/portfolio.css` (lines 112-119) — Why: `.card-kicker` — the shipped eyebrow register;
  the module emits this class directly for the block eyebrow (precedent: `trace-player.mjs`
  emits shipped `.btn` classes), so no new eyebrow CSS is needed.
- `system/components.css` (lines 541-547) — Why: `.decision-card` — the visual sibling sitting in
  the SAME `#case` grid; `.asrc-block` mirrors its surface/border/radius/padding recipe (minus the
  accent left-border — exhibit chrome, not a decision record).
- `system/components.css` (lines 169-174) — Why: **snippet 1's region.** Anchors verified unique:
  `.btn-primary {` (×1) → `.btn-primary:active` (×1).
- `system/derive.rules.mjs` (lines 39-55) — Why: **snippet 2's region.** Anchors verified unique:
  `// Brand-preservation bounds:` (×1) → `fgContrastMin: 4.5,` (×1).
- `tooling/visual-regression/visual.spec.mjs` (lines 15-34, 67-73) — Why: the `approach` PAGES
  entry (line 17) gains a `waitReady` selector; the generic waitReady loop (lines 70-73) already
  supports it (string or array). Hermeticity note (lines 43-46): same-origin fetch to
  `127.0.0.1:4757/system/annotated-source.json` passes the route filter — no gate change needed.
- `.claude/plans/portfolio-motion-phase03-factory-showpiece.md` (Out of Scope + file list) — Why:
  proves `approach.html` is not in Phase 3's blast radius (it edits factory.html,
  factory-intake.mjs, trace-player.mjs, trace.html only).

### New Files to Create

- `agent-layer/annotated-source.spec.json` — hand-authored spec: snippet ids, file paths, anchor
  strings, titles, prose (the author's voice).
- `agent-layer/gen-annotated-source.mjs` — the extractor generator (zero-dep, check mode,
  standalone guard).
- `system/annotated-source.json` — GENERATED committed artifact (run the generator; never hand-edit).
- `system/annotated-source.mjs` — hand-written canon view-time module (pure prepare + DOM render).
- `system/glossary.mjs` — hand-written canon term-definition module (TERMS map + `initGlossary`).

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/annotated-source-glossary.architecture.md` — the governing decisions (this plan's contract).
- [WCAG 1.4.13 Content on Hover or Focus](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html)
  — the three requirements the bubble must satisfy: dismissible (Esc without moving pointer/focus),
  hoverable (pointer can move onto the bubble), persistent (stays until hover/focus removed or dismissed).
- [WAI-ARIA tooltip role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role)
  — `role="tooltip"` + trigger `aria-describedby` while open.

### Patterns to Follow

**Generator shape** (`gen-pack-bundle.mjs:15,58-63` + `gen-token-css.mjs:135`):

```js
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export function genAnnotatedSource({ check = false } = {}) { … return { snippets: n, drifted: [] }; }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { … console.log("annotated source ✓  …"); }
```

**View-time module shape** (`handoff-viewer.mjs`): `el()` builder copied verbatim; `prepare*` pure
and throwing plain Errors naming the offending path; `render*` builds DOM via `textContent` only;
no `<style>` injection; no self-init at import (Node-import safe); `{ destroy }` returned.

**Page wiring** (`handoff.html:152-183`): inline module script, fetch → prepare → render → set a
ready flag for VR; `.catch` hides the exhibit (and deliberately never sets the ready flag, so CI
fails loudly instead of baselining a broken state — same philosophy as the proto pages'
`data-source` wait, `visual.spec.mjs:61-65`).

**Error handling**: throw plain `Error` whose message names the offending path/anchor
(`agent-layer/lib.mjs` convention). No taxonomy, no wrapping.

**Headers**: feature files open with a comment citing the governing doc — here
`docs/epics/annotated-source-glossary.architecture.md` (+ PRD §6 legibility bar).

---

## IMPLEMENTATION PLAN

### Phase 1: The artifact chain (spec → generator → committed JSON → CI gate)

Build-time only; provable end-to-end before any page work.

**Tasks:** spec file · generator with check mode · run + commit artifact · drift-check registration.

### Phase 2: View-time modules

**Independent of:** nothing — needs Phase 1's artifact shape, but can be written in parallel once
the spec's JSON shape (Task 1) is fixed.

**Tasks:** `annotated-source.mjs` · `glossary.mjs`.

### Phase 3: Page integration + styles

**Depends on:** Phases 1-2.

**Tasks:** `portfolio.css` additions · `approach.html` markup + term marks + module script.

### Phase 4: Gates

**Depends on:** Phase 3.

**Tasks:** VR `waitReady` · docker baseline regen (same PR) · CLAUDE.md map lines · full validation.

---

## STEP-BY-STEP TASKS

### 1. CREATE `agent-layer/annotated-source.spec.json`

- **IMPLEMENT**: Hand-authored spec (this file is the author's voice — review its prose at PR):

  ```json
  {
    "$description": "Hand-authored spec for gen-annotated-source.mjs: which real source regions are extracted (by unique anchor strings) and the plain-English prose shown beside them. The prose is the author's voice; the code is extracted at build time and never hand-copied (docs/epics/annotated-source-glossary.architecture.md).",
    "snippets": [
      {
        "id": "btn-primary-tokens",
        "file": "system/components.css",
        "anchorStart": ".btn-primary {",
        "anchorEnd": ".btn-primary:active",
        "title": "The primary button's colour, in full",
        "prose": [
          "This is the entire colour styling of the site's primary button: three semantic tokens. There is no hex value here to drift out of sync — the button asks for \"the accent\", and whichever brand pack is loaded decides what that is.",
          "The hover and active steps read from the same contract, so even the interaction states re-skin when the pack changes. Swapping one stylesheet line restyles every button on the site, states included."
        ]
      },
      {
        "id": "derive-accent-contrast",
        "file": "system/derive.rules.mjs",
        "anchorStart": "// Brand-preservation bounds:",
        "anchorEnd": "fgContrastMin: 4.5,",
        "title": "Accessibility as a rule, not a review step",
        "prose": [
          "When the factory derives a design system from a brand colour, this is the rule that negotiates the accent: stay as close to the brand as the bounds allow, then darken in 0.01 steps until the colour reads at WCAG AA contrast (4.5:1) against the derived card surface.",
          "Because that surface is lighter than the page ground, the one condition guarantees three contrast pairs at once. And if the hard floor is reached without passing, the check fails honestly — it reports a miss rather than shipping a near-miss."
        ]
      }
    ]
  }
  ```

- **GOTCHA**: Anchor uniqueness is already verified (each string appears exactly once in its
  file). Do not "improve" the anchors; the generator enforces uniqueness anyway.
- **VALIDATE**: `node -e "JSON.parse(require('node:fs').readFileSync('agent-layer/annotated-source.spec.json','utf8')); console.log('ok')"`
- **SATISFIES**: AC #2, #7.

### 2. CREATE `agent-layer/gen-annotated-source.mjs`

- **IMPLEMENT**: Zero-dep generator. Header comment cites the architecture doc + honesty rationale
  (extraction so shown code can't drift) + `Standalone: node agent-layer/gen-annotated-source.mjs [--check]`.
  Logic:
  1. `ROOT` from module dir (MIRROR `gen-pack-bundle.mjs:15`).
  2. Read + parse the spec; validate by hand at the boundary (MIRROR `portal/lib/intake.mjs`
     posture): `snippets` is a non-empty array; each has non-empty string `id` (unique across
     spec), `file`, `anchorStart`, `anchorEnd`, `title`, non-empty string-array `prose`. Throw
     plain Errors naming the offending path (`snippets[1].anchorEnd`).
  3. Per snippet: read the source file; split on `\n`; find lines containing `anchorStart` /
     `anchorEnd` via substring match. **Exactly one** line may match each anchor — zero or >1 →
     `throw new Error("annotated-source: anchor \"…\" matched N lines in system/… — fix agent-layer/annotated-source.spec.json")`.
     End line must be ≥ start line (throw otherwise). Slice inclusive; `code = lines.join("\n")`;
     record 1-based `startLine`/`endLine`.
  4. Emit `{ $description: "GENERATED by agent-layer/gen-annotated-source.mjs from agent-layer/annotated-source.spec.json — do not edit. Code fields are extracted verbatim from the named files; regenerate after any edit inside an anchored region.", generatedFrom: "agent-layer/annotated-source.spec.json", snippets: [{ id, file, startLine, endLine, title, prose, code }] }`
     as `JSON.stringify(out, null, 2) + "\n"` → `system/annotated-source.json`.
  5. Check mode (MIRROR `gen-token-css.mjs:135-152` **exactly**): `genAnnotatedSource({ check = false } = {})`;
     with `check`, compare in memory vs disk, write nothing, return
     `{ snippets: n, drifted: ["system/annotated-source.json"] | [] }`. Standalone guard
     (MIRROR `gen-pack-bundle.mjs:58-63`, `pathToFileURL`): `--check` flag → exit 1 on drift;
     write mode logs `annotated source ✓  2 snippets (system/annotated-source.json)`.
- **IMPORTS**: `readFileSync, writeFileSync` from `node:fs`; `dirname, join, resolve` from
  `node:path`; `fileURLToPath, pathToFileURL` from `node:url`.
- **GOTCHA**: Deterministic byte output (spec order preserved, `+ "\n"` terminator) — the CI gate
  re-runs this. No `Date`/timestamps in output.
- **VALIDATE**: `node agent-layer/gen-annotated-source.mjs` prints the `✓` line;
  `node agent-layer/gen-annotated-source.mjs --check` exits 0; then prove the drift guard:
  temporarily edit a character inside `.btn-primary`'s block → `--check` exits 1 → revert →
  exits 0. And prove anchor hard-fail: temporarily break an anchor string in the spec → write
  mode throws naming the anchor → revert.
- **SATISFIES**: AC #2, #3.

### 3. RUN generator; COMMIT `system/annotated-source.json`

- **IMPLEMENT**: `node agent-layer/gen-annotated-source.mjs`; verify the two `code` fields are
  byte-identical to `system/components.css:169-174` and `system/derive.rules.mjs:39-55`.
- **VALIDATE**: `git diff --stat` shows only the new artifact;
  `node -e "const j=JSON.parse(require('node:fs').readFileSync('system/annotated-source.json','utf8')); console.log(j.snippets.map(s=>s.id+' '+s.startLine+'-'+s.endLine).join('\n'))"`
- **SATISFIES**: AC #1, #2.

### 4. UPDATE `tooling/drift-check.mjs` — register the new artifact

- **IMPLEMENT**: `import { genAnnotatedSource } from "../agent-layer/gen-annotated-source.mjs";`
  add after `checkTokenCss()` (MIRROR its shape, lines 38-44):

  ```js
  // 2b. Annotated-source drift — check mode writes nothing; compares in-memory regen vs disk.
  function checkAnnotatedSource() {
    const r = genAnnotatedSource({ check: true });
    if (r.drifted.length)
      throw new Error(
        `annotated-source drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-annotated-source.mjs`
      );
  }
  ```

  Call it between `checkTokenCss()` and `checkHandoff()`; extend the summary line:
  `"drift-check     ✓  syntax · token-css · annotated-source · handoff · scenarios · traces"`.
- **GOTCHA**: `checkSyntax` (step 1) already covers the new `.mjs` files via `git ls-files` — no
  registration needed there (they must be `git add`ed for CI to see them).
- **VALIDATE**: `node tooling/drift-check.mjs` → green with the new segment in the ✓ line.
  (Requires `tooling/style-dictionary/node_modules` — `cd tooling/style-dictionary && npm ci` if missing.)
- **SATISFIES**: AC #5.

### 5. CREATE `system/annotated-source.mjs`

- **IMPLEMENT**: Hand-written canon module, header citing the architecture doc + PRD §6 register
  ("evidence, not pedagogy"). MIRROR `handoff-viewer.mjs`'s split:
  - Copy the `el()` builder verbatim (`handoff-viewer.mjs:24-34`).
  - `export function prepareAnnotatedSource(data)` — PURE, DOM-free. Shallow shape check
    (trusted, CI-drift-checked artifact — same posture as `prepareHandoff`, lines 38-43): throw
    if `data.snippets` missing/empty; build `byId` object; throw on duplicate id. Return
    `{ snippets, byId }`.
  - `export function renderAnnotatedSource(container, model, id)` — throw
    `annotated-source: unknown snippet "${id}"` if absent. Build (all `textContent`, no innerHTML):

    ```
    figure.asrc-block
      figcaption.card-kicker    → "system/components.css · lines 169–174 · extracted from the shipped source at build time"
      h3.asrc-title             → snippet.title
      pre.asrc-code > code      → snippet.code   (verbatim, indentation preserved)
      div.asrc-note             → one <p> per prose entry
    ```

    Eyebrow text: `` `${s.file} · lines ${s.startLine}–${s.endLine} · extracted from the shipped source at build time` `` —
    factual honesty framing, no "learn". The eyebrow reuses the SHIPPED `.card-kicker` class
    (portfolio.css:112-119; precedent for a module emitting shipped classes:
    `trace-player.mjs`'s `.btn .btn-secondary` controls). Clear container first; return
    `{ destroy }` (MIRROR `handoff-viewer.mjs:178-179, 253-256`).
- **GOTCHA**: No self-init, no `<style>` injection, no fetch (the page fetches). Module must be
  importable under Node without touching the DOM.
- **VALIDATE**: `node --check system/annotated-source.mjs` and
  `node --input-type=module -e "import('./system/annotated-source.mjs').then(m=>{m.prepareAnnotatedSource({snippets:[{id:'a',file:'f',startLine:1,endLine:2,title:'t',prose:['p'],code:'c'}]}); console.log('ok')})"`
- **SATISFIES**: AC #1, #7.

### 6. CREATE `system/glossary.mjs`

- **IMPLEMENT**: Hand-written canon module, header citing the architecture doc + WCAG 1.4.13.
  - `const TERMS = { … }` — the seven v1 definitions (author's voice; review at PR):
    - `semantic-token`: "A named design value that describes its role — --color-accent, --spacing-md — rather than a literal colour or size. Components reference the name; whichever brand pack is loaded supplies the value."
    - `token-contract`: "The complete list of semantic tokens components are allowed to use, each with a neutral fallback. It's the interface between the components and any brand: satisfy the contract and the whole site re-skins."
    - `brand-pack`: "One CSS file that assigns a brand's values to the token contract. Swapping that single file — one line in the page head — re-skins every component on the site."
    - `structured-data`: "Machine-readable JSON-LD embedded in a page so software can read what the page is about, not just scrape its text."
    - `llms-txt`: "A plain-text index of a site written for AI agents — the way sitemap.xml is written for search crawlers."
    - `activation`: "The moment a new user first gets real value from a product — the early signal that predicts whether they'll stay."
    - `retention`: "Whether people come back and keep using the thing after the first try — the slower, more honest measure that a feature worked."
  - `export function initGlossary(root = document)`:
    1. Create one bubble: `el("div", { class: "glossary-bubble", id: "glossary-bubble", role: "tooltip", hidden: true })`, append to `document.body`.
    2. For each `root.querySelectorAll("[data-term]")`: unknown key in `TERMS` →
       `throw new Error(\`glossary: unknown term "\${key}" on approach.html\`)` (fails loudly in
       dev AND blocks the VR ready flag — the page script aborts before setting it).
    3. Show on `mouseenter`/`focusin` of a trigger: set bubble `textContent` (never innerHTML),
       unhide, position `fixed` from `trigger.getBoundingClientRect()` — below the term, flipped
       above if within `~120px` of the viewport bottom, `left` clamped to `8px` margins; set
       trigger `aria-describedby="glossary-bubble"`.
    4. Hide on trigger `mouseleave`/`focusout` **via a ~120ms timeout** that the bubble's own
       `mouseenter` cancels (1.4.13 hoverable) and bubble `mouseleave` re-arms; hide immediately
       on `Escape` (document `keydown`, only while open — 1.4.13 dismissible) and on `scroll`
       (passive, window) since a fixed bubble would detach from scrolling text. On hide: `hidden`,
       remove `aria-describedby` from the trigger.
    5. Return `{ destroy }` removing the bubble + document/window listeners.
- **GOTCHA**: No self-init (Node-import safe). Exactly one bubble node reused for all terms.
  Instant show/hide — no animation, so no reduced-motion branch needed and zero VR surface
  (interaction-only).
- **VALIDATE**: `node --check system/glossary.mjs` and
  `node --input-type=module -e "import('./system/glossary.mjs').then(()=>console.log('ok'))"`
- **SATISFIES**: AC #4, #8.

### 7. UPDATE `system/portfolio.css` — exhibit + term + bubble styles

- **IMPLEMENT**: New commented section at the end. Semantic tokens only, with ONE noted raw-value
  exception (mono stack — no `--font-mono` token exists; MIRROR `handoff.html:45` and note it,
  per the file-header rule "no raw values except where noted"). At-rest change → follow the
  baseline-callout comment convention (name the affected baselines):

  ```css
  /* ---------- Annotated source + glossary (approach.html §05; system/annotated-source.mjs +
     system/glossary.mjs — docs/epics/annotated-source-glossary.architecture.md).
     At-rest addition: changes the approach-neutral + approach-saulera baselines (regen in this PR). */
  ```

  The CSS below is paste-ready — **every token name is verified against
  `system/tokens.contract.css`** (`--color-fg-muted`:23, `--color-bg`:24, `--color-bg-surface`:25,
  `--color-border`:26, `--color-bg-inverse`:39, `--color-fg-on-inverse-strong`:41,
  `--font-display`:49, `--spacing-md`:55, `--spacing-lg`:56, `--radius-sm`:63, `--radius-md`:64,
  `--shadow-md`:69, `--type-body`:92, `--type-caption`:93). No eyebrow class needed
  (module emits shipped `.card-kicker`).

  ```css
  .asrc-block {
    margin: 0; /* figure reset */
    background: var(--color-bg-surface);   /* surface recipe mirrors .decision-card (components.css:541-547), minus its accent left-border */
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
  }
  .asrc-title {
    font-family: var(--font-display);
    font-size: var(--type-body);
    margin: 0 0 var(--spacing-md);
  }
  .asrc-code {
    margin: 0 0 var(--spacing-md);
    padding: var(--spacing-md);
    overflow-x: auto;
    background: var(--color-bg);           /* page ground inset inside the surface card */
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }
  .asrc-code code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; /* raw stack: no --font-mono token exists — same noted exception as handoff.html:45 */
    font-size: var(--type-caption);
    white-space: pre;
    tab-size: 2;
  }
  .asrc-note p { color: var(--color-fg-muted); }
  .asrc-note p + p { margin-top: var(--spacing-md); }

  dfn.term {
    font-style: normal;                    /* kill dfn's default italic */
    text-decoration: underline dotted var(--color-fg-muted);
    text-underline-offset: 0.15em;
    cursor: help;
  }
  .glossary-bubble {
    position: fixed;
    z-index: 90;                           /* under .skip-link's 100 (portfolio.css:29) */
    max-width: 36ch;
    padding: var(--spacing-md);
    background: var(--color-bg-inverse);   /* inverse pairing mirrors .skip-link, portfolio.css:30-31 */
    color: var(--color-fg-on-inverse-strong);
    font-size: var(--type-caption);
    line-height: 1.5;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
  }
  ```

- **GOTCHA**: No motion. Nothing in `components.css`. If you adjust any value, keep to tokens —
  the only permitted raw values are the mono stack (noted) and unitless/em micro-values
  (`line-height`, `text-underline-offset`, `tab-size`, `z-index`), matching the file's existing
  practice (e.g. `.card-kicker`'s raw `12px` at line 114).
- **VALIDATE**: `node tooling/token-lint.mjs` (portfolio.css isn't its subject, but run the gate);
  visual check in Task 8.
- **SATISFIES**: AC #1, #4, #6.

### 8. UPDATE `approach.html` — exhibit markup, term marks, module script

- **IMPLEMENT**:
  1. **Exhibit** — in `#case`, after the `.decision-card` grid's closing `</div>` (line 271),
     inside the same `.container`:

     ```html
     <div class="grid grid-2 mt-2xl" id="asrc" hidden>
       <div data-snippet="btn-primary-tokens"></div>
       <div data-snippet="derive-accent-contrast"></div>
     </div>
     ```

     Rendered by the script below; starts `hidden`, unhidden on successful render (prevents an
     empty-grid gap if fetch fails — the degrade is silent for visitors, loud for CI).
  2. **Terms** — wrap the seven occurrences (lines per CONTEXT REFERENCES; e.g. line 236):
     `components may only reference <dfn class="term" data-term="semantic-token" tabindex="0">semantic tokens</dfn>` —
     likewise `token-contract` (253), `brand-pack` (254), `structured-data` + `llms-txt` (266),
     `activation` (105), `retention` (106). Keep surrounding copy byte-identical — wrap, don't rewrite.
  3. **Script** — after line 349's `analytics.mjs`, MIRROR `handoff.html:152-183`:

     ```html
     <script type="module">
       import { initGlossary } from "/system/glossary.mjs";
       import { prepareAnnotatedSource, renderAnnotatedSource } from "/system/annotated-source.mjs";
       initGlossary(document);
       const wrap = document.getElementById("asrc");
       fetch("/system/annotated-source.json")
         .then((r) => { if (!r.ok) throw new Error(`annotated-source.json → ${r.status}`); return r.json(); })
         .then((data) => {
           const model = prepareAnnotatedSource(data);
           for (const mount of wrap.querySelectorAll("[data-snippet]"))
             renderAnnotatedSource(mount, model, mount.dataset.snippet);
           wrap.hidden = false;
           wrap.dataset.asrc = "ready";   // VR waits on this — set ONLY on full success
         })
         .catch(() => {});                 // visitor: exhibit stays hidden · CI: waitReady times out loudly
     </script>
     ```

- **GOTCHA**: `initGlossary` runs before the fetch chain; if it throws (unknown term) the whole
  module aborts and `data-asrc` is never set → VR red, by design. Do not set the ready flag in
  `.catch`. Grid/`mt-2xl`/`.container` are existing shipped classes — reuse, don't restyle.
- **VALIDATE**: `npx serve .` → `http://localhost:3000/approach.html`: two blocks render in §05
  with real code; each term shows its bubble on hover AND on Tab-focus; Esc dismisses; pointer
  can travel onto the bubble; bubble never clipped at viewport edges; kill the JSON path
  temporarily → page renders cleanly with no exhibit and no console error spam.
- **SATISFIES**: AC #1, #4, #7, #8.

### 9. UPDATE `tooling/visual-regression/visual.spec.mjs` — approach waitReady

- **IMPLEMENT**: Line 17 →
  `{ name: 'approach',        url: '/approach.html',        kind: 'ia', waitReady: '#asrc[data-asrc="ready"]' },`
  with a one-line comment mirroring the factory note: the annotated-source exhibit renders after
  an async fetch and sets `[data-asrc="ready"]` on success — wait so the paint can't race the
  capture, and a broken artifact fails loudly instead of baselining an empty exhibit.
- **VALIDATE**: covered by Task 10's docker run.
- **SATISFIES**: AC #5.

### 10. REGENERATE VR baselines (same PR — at-rest change)

- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker` (the script runs
  `npm ci` inside the container itself — no outer install needed) — expect exactly
  `approach-neutral.png` + `approach-saulera.png` to change; commit them in this PR.
- **GOTCHA** (memories `visual-regression-baseline-trap` + `local-agent-visual-gate-notes`):
  baselines are Linux-rendered — only the docker run is authoritative; a local macOS
  `npm test` failing broadly is platform noise, not regression. If pages other than
  approach change, STOP — something leaked (a portfolio.css selector too broad?); fix before regen.
  **The package has only two scripts — `test` and `update:docker` (verified in
  `tooling/visual-regression/package.json`); there is NO `test:docker`.** The authoritative
  check run is the update command minus `--update-snapshots` (below).
- **VALIDATE** (from `tooling/visual-regression/`):

  ```bash
  docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression \
    mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && npx playwright test'
  ```

  → all 18 captures green against the regenerated baselines.
- **SATISFIES**: AC #5, #6.

### 11. UPDATE `CLAUDE.md` — architecture map (two module lines + artifact note)

- **IMPLEMENT**: In the `system/` map block, after the `handoff-viewer.mjs` line, add:

  ```
  annotated-source.mjs + glossary.mjs   legibility surfaces (hand-written canon): render build-time-extracted real-code snippets (system/annotated-source.json, generated by agent-layer/gen-annotated-source.mjs from its spec — drift-checked) + WCAG 1.4.13 term-definition bubbles on approach.html (docs/epics/annotated-source-glossary.architecture.md)
  ```

  Keep it to this one entry (the `agent-layer/` block's generic "one file per emitted artifact"
  line already covers the generator).
- **VALIDATE**: read the diff — map style matches neighbours (terse, lowercase annotations).
- **SATISFIES**: AC #9.

### 12. VALIDATE — full battery

- **IMPLEMENT**: run every command in VALIDATION COMMANDS, in order, on the feature branch
  (`feature/annotated-source-glossary` off `main`; per memory `shared-worktree-parallel-sessions`:
  verify the branch immediately before committing, stage by explicit path).
- **SATISFIES**: all ACs.

---

## TESTING STRATEGY

No test suite exists (convention: "run the surface you touched"). Testing = the generator's own
hard-fail proofs + manual browser walk-through + the CI gates (drift-check, VR).

### Generator proofs (Task 2's validate steps, run once, reverted)

- Drift: edit inside an anchored region → `--check` exits 1 → revert.
- Anchor loss: break an anchor in the spec → write mode throws naming the anchor → revert.
- Determinism: run write mode twice → `git status --porcelain system/annotated-source.json` empty
  after the second run.

### Integration (manual, Chrome + Safari + Firefox)

- Blocks render with code visually identical to the source regions; horizontal scroll on narrow
  viewports contained inside `.asrc-code` (no page-level x-scroll).
- Tooltips: hover, Tab-focus, Esc, pointer-onto-bubble, viewport-edge flip/clamp, scroll-hide.
- Keyboard-only pass: every `dfn.term` reachable by Tab, definition appears on focus, Esc works.
- Degrade: rename the JSON temporarily → clean page, hidden exhibit, no errors thrown to console.
- Reduced-motion pass: nothing to gate (no new motion) — confirm no regression from the CSS additions.

### Edge cases

- Term at the very start/end of a line near the viewport edge (clamp). · Two rapid hovers across
  adjacent terms (bubble re-targets, no orphan). · Focus then hover then Esc (single hide path). ·
  Spec prose containing quotes/backticks (JSON-escaped, rendered via textContent — no injection). ·
  Snippet region indentation preserved verbatim (derive snippet is 4-space nested — intentional). ·
  A future source edit shifting line numbers but not anchors → regen changes only
  `startLine`/`endLine` + eyebrow (correct behaviour, not a bug).

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node --check agent-layer/gen-annotated-source.mjs
node --check system/annotated-source.mjs
node --check system/glossary.mjs
```

### Level 2: Generator + artifact

```bash
node agent-layer/gen-annotated-source.mjs            # ✓ line
node agent-layer/gen-annotated-source.mjs --check    # exit 0
node --input-type=module -e "import('./system/annotated-source.mjs').then(()=>console.log('ok'))"
node --input-type=module -e "import('./system/glossary.mjs').then(()=>console.log('ok'))"
```

### Level 3: Repo gates

```bash
node tooling/drift-check.mjs      # ✓ syntax · token-css · annotated-source · handoff · scenarios · traces
node tooling/token-lint.mjs
```

### Level 4: Live surface

```bash
npx serve .    # → /approach.html — Integration walk-through above
```

### Level 5: Visual-regression (authoritative, docker)

```bash
cd tooling/visual-regression
npm run update:docker    # regen: approach-neutral + approach-saulera ONLY (script npm-ci's inside the container)
# check run (no test:docker script exists — this is the update command minus --update-snapshots):
docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression \
  mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && npx playwright test'
```

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — `approach.html` §05 shows the two annotated-source blocks; each `code` field is
      byte-identical to its live source region; prose reads as evidence, with zero pedagogy
      framing (no "learn", no callout).
- [ ] **AC #2** — The artifact is generated, never hand-edited; eyebrow states file · lines ·
      build-time extraction factually.
- [ ] **AC #3** — Removing/duplicating an anchor makes the generator throw naming the anchor and
      spec file; editing inside a region makes `--check` (and CI) fail until regen.
- [ ] **AC #4** — All seven terms show definitions on hover AND focus; Esc dismisses; bubble is
      hoverable and persistent (WCAG 1.4.13); never clipped by ancestor overflow.
- [ ] **AC #5** — `drift-check` green including the new step; VR green with regenerated
      approach-neutral + approach-saulera baselines committed in the same PR; **no other baseline
      changes**.
- [ ] **AC #6** — `components.css`, all token files, handoff pack, `factory.html`: untouched.
- [ ] **AC #7** — Honesty contract intact: shown code extracted (not copied), prose is authored
      human voice, nothing presented as agent output.
- [ ] **AC #8** — Keyboard-only + screen-reader basics: terms focusable, `role="tooltip"` +
      `aria-describedby` wired while open.
- [ ] **AC #9** — CLAUDE.md map updated; both new modules Node-import safe; works in
      Chrome + Safari + Firefox.

## COMPLETION CHECKLIST

- [ ] Spec → generator → artifact chain proven (drift, anchor-loss, determinism) with all
      temporary edits reverted.
- [ ] drift-check registered + summary line updated.
- [ ] Modules mirror handoff-viewer (pure/DOM split, textContent-only, no self-init, destroy).
- [ ] portfolio.css additions token-only except the noted mono stack; baseline-callout comment present.
- [ ] approach.html copy wrapped, not rewritten; ready flag set only on full success.
- [ ] VR waitReady added; docker regen shows exactly the two approach baselines changed.
- [ ] All validation commands green; cross-browser + keyboard walk-through done.
- [ ] Branch verified before commit; staged by explicit path; one atomic commit citing the
      architecture doc.

---

## OPEN QUESTIONS / ASSUMPTIONS

**Verified facts (checked against the working tree while planning — not assumptions):**

1. Anchor strings grep-counted ×1 each in their files; the generator re-enforces uniqueness on
   every run, so future drift is caught, not assumed away.
2. `waitReady` in `visual.spec.mjs` is generic (lines 70-73 accept any page's selector) — no
   harness change needed beyond the one PAGES entry.
3. The VR hermeticity route (127.0.0.1:4757 only) passes the same-origin JSON fetch
   (`visual.spec.mjs:43-46`); the VR webServer serves the repo root on 4757
   (`playwright.config.mjs:22-26`), so `/system/annotated-source.json` is reachable.
4. No `--font-mono` token exists; the raw mono stack with a noted exception mirrors
   `handoff.html:45` and satisfies portfolio.css's header rule.
5. Every token name in Task 7's CSS exists in `system/tokens.contract.css` (line numbers cited
   in the task) — nothing is invented.
6. No naming collisions anywhere in shipped HTML/CSS/modules for `#asrc`, `.term`,
   `.glossary-bubble`, or `data-term` (repo-wide grep clean).
7. `tooling/visual-regression/package.json` has exactly two scripts: `test` and `update:docker`
   — the plan's docker check command is derived from the latter, not from a guessed script name.

**For user review at PR (content, not architecture):** the snippet prose (Task 1) and the seven
term definitions (Task 6) are draft author-voice copy — expect wording edits, which are cheap
(prose lives in the spec/module; a prose-only change still requires artifact regen for Task 1).

**Questions that would change the plan:** none blocking. If the user prefers the exhibit under
§07 "The work should explain itself" instead of §05 "In practice", only Task 8's insertion point
moves (§05 chosen because the blocks *are* that section's evidence).

## NOTES (open canvas)

- **Why the exhibit starts `hidden` + a ready flag, instead of an error card** (handoff.html shows
  an error card): approach.html is a marketing-register page — a broken-exhibit card would be
  noise for a visitor. CI still can't miss the breakage because the VR wait times out. This is the
  proto-pages' "the catch-branch never sets data-source, so a wrong baseline can't be produced"
  philosophy applied to an IA page.
- **Why two snippets, not three**: the third candidate (renderer refusal branch) is
  factory-page material — it belongs beside the agentic embeds, and factory.html is Phase 3's
  file. Deferring it keeps this plan collision-free.
- **Why region-level prose, not line-by-line**: the course repo pairs every line with English;
  our register is evidence, not tutorial — one or two paragraphs beside the block keep the
  subtlety bar. (Also in the architecture doc's data model.)
- **Line numbers in the committed artifact go stale-safe**: they're regenerated on every source
  change that CI sees (drift gate), so the eyebrow's "lines 169–174" is always true at HEAD —
  a property hand-written HTML could never guarantee.
- **Glossary map lives in the module, not a fetched JSON**: seven strings don't justify a second
  fetch + ready-gate; inline keeps initGlossary synchronous, which is what lets a bad term key
  block the VR ready flag for free.

## AMENDMENTS

<!-- Append-only after first execution. Newest at the bottom. -->

- (none yet)
