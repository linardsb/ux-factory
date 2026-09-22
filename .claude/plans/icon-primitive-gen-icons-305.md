# Feature: `icon` through the chain + `gen-icons` — a committed Phosphor subset by name

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> **This plan was spiked before it was written.** The generator below is not a description — it is
> source that was written, run, and driven through every one of its failure paths in a scratch tree,
> and the outputs quoted are that run's. The template was driven through the repo's **real** DOM stub
> and the **real** `validateComposition`. Every number in this plan was measured, not estimated. See
> NOTES § Pre-flight for what was run and what it said.

## Feature Description

`icon` is the fourth of epic #295's five new generic primitives (after `stack`, `text` at #301 and
`list` at #303). It renders one glyph by **Phosphor name**, read out of a **generated, committed
subset** — never a runtime library, never a full vendoring. Three pieces land together:

1. **`tooling/icons/`** — a dependency-carrying tool directory in the `tooling/style-dictionary/`
   shape, holding `@phosphor-icons/core` and nothing else. No shipped page ever loads it; only the
   generator and CI read it.
2. **`agent-layer/gen-icons.mjs`** — copies the path data of the names listed in a hand-maintained
   `system/icons.manifest.json` into a generated `system/icons.mjs` (name → SVG path `d`, the MIT
   attribution recorded once in the header). `--add <name>` appends to the manifest and regenerates;
   `--check` is the CI `verify` drift leg.
3. **the `icon` component**, through the full chain — spec, CSS block, render template, catalog entry
   — whose template reads `icons.mjs` and **refuses a name the map does not carry, visibly**: the
   literal name rendered as text in a marked element, never an empty box.

## User Story

As **the operator composing a product's screens on the canvas** (and, from #304/#307, as the importer
reading a source design that names its icons)
I want **one component that draws a named glyph from a set the repo actually owns, and says so out
loud when the name is not in it**
So that **a composed screen can carry the back arrow, the tick and the warning triangle a real flow
needs, without shipping a 37 MB icon library or letting a typo become an invisible gap.**

## Problem Statement

The vocabulary has no glyph. `screen-header` and `care-task-row` each draw a hand-written
placeholder from a private `GLYPHS` map inside `agentic-renderer.mjs` (four glyphs, 24×24, stroke —
`system/agentic-renderer.mjs:197-206`), which is Verdant's internal chrome and is reachable by no
composition. So a composed screen cannot draw a back arrow, a tick, a close cross or a warning
triangle at all, and epic #295's own reason for the primitive — "the source tools name icons; nav,
buttons and rows all want one" (`docs/epics/canvas-design-import.prd.md:133`) — is unserved.

The two obvious answers are both wrong for this repo. A runtime icon library is a shipped runtime
dependency, which the hard constraint forbids. Vendoring `@phosphor-icons/core` wholesale is 37 MB
and 1,512 files per weight (observed) committed for six glyphs.

## Solution Statement

A **generated subset**: a hand-maintained manifest names the icons a real flow needs; a generator
copies exactly those paths out of the package into one committed `system/icons.mjs`; CI drift-checks
the pair. The shipped page loads a 19-line frozen map and nothing else. Adding a glyph is one
command. A name outside the map is a visible refusal at render time, on the `text.md` precedent — a
refused link "renders as its own literal source text rather than as a link, visibly, so a refused
link reads as a mistake rather than disappearing" (`system/specs/text.md`, Usage).

## Out of Scope / Non-Goals

- **Not included: teaching the importer to recognise an icon.** See D1 — measured, decided, and a
  follow-up ticket to file.
- **Not included: a second icon weight.** The manifest pins `regular`. Bold/fill/light/thin/duotone
  all exist in the package and none is copied.
- **Not included: an icon `label` prop or any aria-name.** The primitive is decorative by
  construction (see the spec's Accessibility section); a meaning-bearing glyph is an `icon` beside a
  `text`.
- **Not changing: `GLYPHS` / `icon()` inside `agentic-renderer.mjs`.** Verdant's four placeholder
  glyphs stay exactly as they are. Unifying them is a Verdant chrome change that would churn
  `/proto/verdant` and `/work` baselines for no ticket.
- **Not changing: `list-row`, `primary-button`, `ghost-button`, `nav-tabs` or `screen-header` child
  lists.** Only `stack.children` gains `icon`, because `stack.md` already commits to it in prose.
- **Not included: new contract tokens.** Per-ticket context says "no token work", and the size enum
  binds to the existing `--spacing-*` scale (proven: every `var()` in the proposed block is already
  a declared contract token).
- **Not included: `build-instance.mjs` changes.** Verified: it copies `system/` **wholesale**
  (`cpSync(join(REPO_ROOT,"system"), …, {recursive:true})`, `agent-layer/build-instance.mjs:460`), so
  `icons.mjs` and `icons.manifest.json` ride into a built instance dir with no edit.
- **Not included: `gen-handoff` pack-file changes.** Verified: it copies only `system/wc/*.mjs`,
  `tokens.source.json` and `figma-import.md` — **not** `agentic-renderer.mjs` — so nothing in the
  pack needs `icons.mjs` beside it.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (the generator is written and proven; what remains is the routine
component chain plus a well-mapped gate cascade)
**Primary Systems Affected**: `system/` (spec, CSS, renderer, palette, the generated map) ·
`agent-layer/` (the new generator) · `tooling/` (the new tool dir, build-checks, gates.md) ·
`.github/workflows/verify.yml` · `import/fixtures/` (regenerated verdict) · the VR baselines
**Dependencies**: `@phosphor-icons/core@2.1.1` (MIT), build-time only, installed in
`tooling/icons/`, never loaded by a shipped page. Observed: `npm ci` succeeds, lockfile is 19 lines,
`npm audit` reports **0** advisories at every severity.

## Related Work

**Implements**: [#305](https://github.com/linardsb/ux-factory/issues/305) · **Epic**:
[#295](https://github.com/linardsb/ux-factory/issues/295) — `docs/epics/canvas-design-import.architecture.md`
(§ Stack "Icons ship as a generated subset, never a library", lines 84–90) +
`docs/epics/canvas-design-import.prd.md` G8, G24

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/list-primitive-through-the-chain-303.md` — Why: the immediately preceding primitive.
  Its Task 6 regenerator order, its `gen-loc-summary` git-index trap and its baseline-regen recipe
  are reused here. Its "four regenerators is stale, it is five" finding is inherited.
- `.claude/plans/stack-text-primitives-rendermarkdown-links-301.md` — Why: `stack.children` is the
  list this ticket widens, and `text.md` is the refusal-voice precedent.

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- (none yet) — D1's follow-up ("the importer reads `icon.name`") is the one this plan asks to be
  filed, and `choice` (G32) is the fifth primitive's own ticket.

---

## DECISIONS TAKEN (nothing here is open)

Each was a fork; each is resolved, with the evidence. An implementer does not re-open these.

### D1 — the importer is **not** taught to recognise an icon in this PR

**Measured, twice** (NOTES probes 1 and 2). Putting `icon` in the vocabulary does **not** cover
#304's Chevron node. Mechanism, all three legs: `name-match` is word containment and
`{chevron} ⊉ {icon}`; `kind-fit` has no branch for `node.kind === "icon"`; `prop-fit` cannot fill
`icon.name` because `PROP_SOURCES.name` is `"first-text"` and the node draws no text. Score 0, no
candidate, floor.

The IR **does** carry `icon: {name: "caret-right"}` — literally one of this ticket's six — and
nothing reads it.

**Why not fix it here.** The two changes that would cover it (a `kind-fit` branch for `icon` at 0.25,
plus a structural fill of `icon.name` from `node.icon.name` at 0.25) sum to **exactly 0.5**, which is
`THRESHOLD`, and `recognise.mjs`'s floor is `>= THRESHOLD`. A pair of weights that lands precisely on
the bar is fitted backwards from the answer, which is the one thing that file's header forbids: "the
defence is a principle argued first and numbers chosen to serve it." The ticket's Files-touched names
no `import/` source, and #307 (snap rules) is the neighbouring ticket that owns source-node reading.

**What this PR does instead:** corrects the four `#305 CHANGES THIS` prediction sites in build-checks
group 40 and the one in `import/recognise.mjs:195-196` to state the observed fact, and files a
follow-up. **Action for the implementer:** open the follow-up issue before the PR (title: *"the
importer reads `icon.name` — an icon-kind node reaching the `icon` entry"*, body: this D1 section
verbatim) and reference it in the corrected comments.

### D2 — `size` is **required**, and its enum values are spacing-scale step names

`["md","lg","xl"]` → `var(--spacing-md|lg|xl)` → 16 / 24 / 32px. One scale, one vocabulary, the
`stack.gap`/`stack.pad` precedent: the composition never carries a pixel value. Required, on
`stack.direction`'s argument — "a layout box that defaults its axis is a box whose composer never had
to say what they meant". Absence cannot express zero here the way it can for `gap`; an invisible icon
is not a design. `sm` (8px) is deliberately absent: an 8px glyph is unreadable.

### D3 — the prop is `name`, and the importer noise it causes is accepted

Because `PROP_SOURCES` maps prop names **globally**, `name → "first-text"` makes `icon` a
never-winning 0.125 candidate on every text-bearing node. Measured consequence: `+66` lines in the
committed expected verdict, **zero** verdict changes. Renaming the prop to `glyph` would remove the
noise entirely and leave `import/fixtures/spike-c-instance.expected.json` byte-identical — considered
and **not taken**, because the ticket says `name`, `name` is what a reader of a Phosphor set expects,
and a candidate that never wins is noise in a candidates list rather than a wrong answer.

### D4 — the six are **derived** from the flow, not confirmed against the brief

The ticket says "the plan confirms against the brief". **The brief names no icons** —
`docs/epics/fixtures/faster-payment-input.md` and `discovery/faster-payment/prd.md` contain no icon
list (grepped). The six are derived from what Faster Payment's four screens do: a payee-entry screen
and a Confirmation-of-Payee result (back, close), a safety-stop warning (warning, info), a send result
(check), and rows that lead somewhere (caret-right). **Say "derived" in the report, never
"confirmed".** Note also that "close" in the PRD's state list means a CoP **close match**, not a
close button — the two are unrelated and the coincidence is a trap.

### D5 — `--check` regenerates from the package, and CI installs it

The alternative (compare only the manifest ↔ map **name sets**, needing no package and no CI install)
cannot see a moved `d`: a package bump that silently changed a glyph would pass. The generator
therefore **throws** when `tooling/icons/node_modules` is absent rather than reporting "no drift", and
`verify.yml` gains one `npm ci` step. The ticket's own Files-touched line "CI workflow line" is that
step.

### D6 — `system/catalog.mjs:67-69`'s stale histogram prose is corrected in this PR

It currently says "3 of 20 today; the 17 absences … the 3/17 histogram", which was already wrong
before this ticket (the truth is 3/21). Leaving a number this ticket makes **more** wrong is worse
than a one-line adjacent correction. Fix it to 3/22 with the rest.


---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/specs/text.md` (whole file) — Why: the leaf-primitive spec shape this one mirrors —
  `contract: null`, `children: []`, no `childrenCardinality`, and the **refusal voice** ("renders as
  its own literal source text … reads as a mistake rather than disappearing") this template copies.
- `system/specs/stack.md` (head `children` array, and the Usage paragraph beginning "The `children`
  list is the epic's own ten generic primitives") — Why: **this plan edits both.** The prose already
  says "with the remaining two arriving the same way"; `icon` is one of them.
- `system/agentic-renderer.mjs:129-206` — Why: `SVGNS`, the private `el()` (**`createElement`, no
  namespace**), the private `icon()` helper (24×24 — a NAME COLLISION hazard), `svgPath`, and the
  `GLYPHS` map. Read before writing a single line of the template.
- `system/agentic-renderer.mjs:451-497` — Why: the `stack`, `list` and `text` templates; the exact
  comment voice and the `el()` call shape to match.
- `system/components.css:2467-2549` — Why: the `ds-text` and `ds-list` blocks — the block header
  format `/* ---------- ds-<name> (system/specs/<name>.md) — cross-scenario library primitive ---------- */`
  that `gen-system-graph.mjs:84` parses, and the prose density expected in a block.
- `agent-layer/gen-loc-summary.mjs` (whole file, 80 lines) — Why: the `{check}` generator contract
  every generator in this repo follows, which `gen-icons.mjs` below mirrors line for line.
- `import/regen-expected.mjs` (whole file, 60 lines) — Why: its header states in plain words why
  **this ticket** owes it a run.
- `tooling/drift-check.mjs` (whole file) — Why: where `checkIcons()` is registered, the `claims`
  array in `checkGroupCount` that pins the group count in four places, and the hand-maintained `✓`
  log line at the bottom that must gain `icons`.
- `tooling/build-checks.mjs:346-412` — Why: `domStub()` (it **does** implement `createElementNS` and
  records `ns` — verified by driving it), `stubText`, `stubFindAll`, and `domStubControl()` — which
  does **not** exercise `createElementNS`, so the new group needs its own NS control.
- `tooling/build-checks.mjs:870-910` — Why: `minimalProps` / `deepPairs`, group 3's container walk.
  `icon` is a leaf so the walk skips it (`if (!isContainer(vocab, child)) continue;`) — read this to
  confirm rather than assume.
- `tooling/build-checks.mjs:5029-5040` — Why: the **hard-pinned** `withWrapper === 3 && withoutWrapper === 21`
  assertion. It moves to 3/22.
- `tooling/build-checks.mjs:11940-11995` and the `group("import-chain", …)` detail at `:12284` —
  Why: the four `#305 CHANGES THIS` sites this plan corrects.
- `system/palette.mjs:30-41` — Why: `CATALOG_COMPONENTS`, a deliberate static second copy pinned
  against the vocabulary at `tooling/build-checks.mjs:4967`. Editing either side alone is red.
- `system/catalog.mjs:310-320` and `:441` — Why: `component.example` seeds the playground's initial
  render ("no example → empty defaults; an example is never invented here"); and `states` renders as
  **one text line**, not a specimen per state — verified, so the `"refused"` state is safe to declare.
- `agent-layer/gen-vocabulary.mjs:23-51` (`validateExamples`) — Why: the `example` head key is
  validated **semantically** at generation time against the whole vocabulary.
- `agent-layer/gen-handoff.mjs:34-39` — Why: it throws if a `children` entry names no spec, which
  fixes the order of the two spec tasks.
- `tooling/token-lint.mjs:50-59` — Why: **every** `var()` in `components.css` must be a declared
  contract token. Verified: the file currently has **zero** private custom properties.
- `tooling/visual-regression/visual.spec.mjs:116-129` — Why: `/components`' `shotTimeout: 30_000` and
  the standing rule for when the catalog grows: **raise this budget, never the diff tolerance.**
- `.github/workflows/verify.yml` (the `Install Style Dictionary` step and the ⚠ block on
  `Build checks`) — Why: the precedent for a second `npm ci`, and the exact reason the ⚠ bans one
  for `portal/` and not for a tooling dir.
- `.claude/references/gates.md` (heading line 11, group 21's paragraph, the `catalog-journey`
  paragraph near line 115) — Why: three prose sites this ticket moves.

### New Files to Create

| Path | What it is | Proven size |
| --- | --- | --- |
| `tooling/icons/package.json` | the tool dir's manifest (private, type module) | 9 lines |
| `tooling/icons/package-lock.json` | what `npm ci` and `tooling/audit-delta.mjs` read | 19 lines (observed) |
| `agent-layer/gen-icons.mjs` | `genIcons({check})` · `emitIcons` · `pathOf` · `addIcon` | **173 lines (written and run)** |
| `system/icons.manifest.json` | hand-maintained: the weight and the sorted names | 5 lines |
| `system/icons.mjs` | GENERATED: `ICON_VIEWBOX` + a frozen `ICONS` map | **19 lines (observed output)** |
| `system/specs/icon.md` | the ComponentSpec | ~70 lines |

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Phosphor Icons — the icon index](https://phosphoricons.com/)
  - Specific section: search
  - Why: the **only** authority on whether a name exists. The ticket's six are *roles*, not Phosphor
    names; three of them resolve differently.
- [Phosphor Icons — core repository](https://github.com/phosphor-icons/core#readme)
  - Specific section: repository layout / `assets/`
  - Why: the `assets/<weight>/<name>.svg` layout the generator reads. **Already observed** in this
    plan's pre-flight — read only if the observed facts disagree.
- [npm — `npm ci`](https://docs.npmjs.com/cli/v10/commands/npm-ci)
  - Why: CI installs the tool dir with `npm ci`, which requires a committed lockfile in sync with
    `package.json`. Verified working for this package.

### Patterns to Follow

**The `{check}` generator contract** — from `agent-layer/gen-loc-summary.mjs`, and the shape
`gen-icons.mjs` below follows exactly:

```js
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = "system/loc-summary.json";

export function genLocSummary({ check = false } = {}) {
  /* … build `out` … */
  if (check) {
    let prior;
    try { prior = readFileSync(join(ROOT, DEST), "utf8"); } catch { prior = ""; }
    return { groups: groups.length, drifted: prior !== out ? [DEST] : [] };
  }
  writeFileSync(join(ROOT, DEST), out);
  return { groups: groups.length, drifted: [] };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which
// import.meta.url percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { /* … */ }
```

**The components.css block header** — `gen-system-graph.mjs:84` parses the spec path out of it and
throws on a malformed one. Exact form, one line:

```css
/* ---------- ds-icon (system/specs/icon.md) — cross-scenario library primitive ---------- */
```

**Namespaced SVG in the renderer** — `el()` uses `document.createElement` and would yield an
`HTMLUnknownElement` for `svg`. The file's own helpers are the pattern
(`system/agentic-renderer.mjs:173-188`):

```js
const SVGNS = "http://www.w3.org/2000/svg";
function svgPath(d, attrs) {
  const p = document.createElementNS(SVGNS, "path");
  p.setAttribute("d", d);
  for (const [k, v] of Object.entries(attrs || {})) p.setAttribute(k, v);
  return p;
}
```

**A build-checks group's shape** — `ok(condition, "the failure message, naming what was expected")`,
`domStubControl()` before anything driven through the stub, and a `group(name, detail)` call at the
end whose `detail` string states what the group reaches **and what it cannot**.

---

## IMPLEMENTATION PLAN

### Phase 1: The tool dir and the generator

The dependency, the manifest and the generator — everything that produces `system/icons.mjs`. Nothing
here touches the vocabulary, so no regenerator runs and no gate moves yet.

### Phase 2: `icon` through the component chain

**Depends on:** Phase 1 (`system/icons.mjs` must exist before the template can import it, and before
the spec's `example` can name a real glyph).

### Phase 3: Regenerate every derived artifact

**Depends on:** Phase 2 (every regenerator reads `system/specs/`).

### Phase 4: The gates

**Depends on:** Phase 3 (the new group asserts against the regenerated `vocabulary.json`).

### Phase 5: Docs, journeys and baselines

**Depends on:** Phase 4. Baselines are **last**, from a clean detached worktree.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 — BRANCH from `origin/main`

- **IMPLEMENT**: `git fetch origin && git switch -c feature/icon-primitive-gen-icons-305 origin/main`
- **GOTCHA**: do **not** branch from a local `feature/import-ir-brilliant-recognise-304` HEAD —
  PR #448 was **squash-merged** as `d512047`, so a local branch still carrying the unsquashed pair is
  history, not work. (Memory: *stacked PR squash loses children*.)
- **VALIDATE**: `git log --oneline origin/main -1`
  → observed `d512047 feat(import): the IR, the Brilliant converter and the deterministic matcher (#304) (#448)`
- **REDDENS**: n/a.
- **SATISFIES**: the PR hygiene every AC rides on
- **REGENERATES**: none.

### Task 1 — CREATE `tooling/icons/` (package.json + lockfile)

- **IMPLEMENT**:
  ```json
  {
    "name": "factory-icons",
    "private": true,
    "type": "module",
    "dependencies": {
      "@phosphor-icons/core": "^2.1.1"
    }
  }
  ```
  then `cd tooling/icons && npm install --no-audit --no-fund`.
- **PATTERN**: `tooling/style-dictionary/package.json` — 3 tracked files, `node_modules/` gitignored
  by the repo-root rule.
- **GOTCHA**: `node_modules/` here is **37 MB** (observed). Confirm with
  `git status --short tooling/icons` that only the two JSON files are untracked.
- **GOTCHA**: there is no `build-tokens.mjs` equivalent in this dir. The generator lives in
  `agent-layer/` and reads the package **by path with `fs`**, never by `import` — which is what keeps
  `agent-layer/` zero-dep. (`gen-handoff.mjs` reaches style-dictionary by `execFileSync` for the same
  reason; a file read is enough here.)
- **VALIDATE** *(observed in a scratch dir with this exact package.json)*:
  ```
  npm install && rm -rf node_modules && npm ci
    → added 1 package in 1s
  node -e "console.log(JSON.parse(require('fs').readFileSync('package-lock.json')).packages['node_modules/@phosphor-icons/core'].version)"
    → 2.1.1
  ls node_modules/@phosphor-icons/core/  → assets dist LICENSE package.json README.md
  head -3 node_modules/@phosphor-icons/core/LICENSE  → MIT License / Copyright (c) 2023 Phosphor Icons
  ```
- **REDDENS**: n/a (no check added).
- **SATISFIES**: AC #2
- **REGENERATES**: none. `tooling/audit-delta.mjs` **auto-discovers** lockfile dirs
  (`git ls-files --with-tree <ref> '*package-lock.json'`), so no edit is needed there. Because base
  has no `tooling/icons/package-lock.json`, the base set is empty and **every** advisory this package
  carried would red the `audit` job. **Observed: `npm audit --json` →
  `{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}`** — the delta is empty. Re-run
  `npm audit` before opening the PR; a non-zero result is a real blocker to raise, never a gate to
  soften.

### Task 2 — CREATE `system/icons.manifest.json`

- **IMPLEMENT** — the exact file, as spiked:
  ```json
  {
    "$description": "Hand-maintained: the Phosphor icons this repo has committed (epic #295 ticket #305, G8). agent-layer/gen-icons.mjs copies exactly these out of tooling/icons/node_modules/@phosphor-icons/core into system/icons.mjs. Add one with: node agent-layer/gen-icons.mjs --add <phosphor-name>. Names are Phosphor's own (phosphoricons.com), never a role word — 'back' is arrow-left, 'close' is x, 'chevron-right' is caret-right.",
    "weight": "regular",
    "icons": ["arrow-left", "caret-right", "check", "info", "warning", "x"]
  }
  ```
- **PATTERN**: `system/param-manifest.json` — the repo's other hand-maintained manifest, whose
  `$description` carries its own rules.
- **GOTCHA**: **the ticket's six are role words, not Phosphor names.** Resolved against the package —
  every row below was `cat`'d:

  | ticket's word | Phosphor name | exists? |
  | --- | --- | --- |
  | back | `arrow-left` | ✅ (`back.svg` does **not** exist) |
  | close | `x` | ✅ (`close.svg` does **not** exist) |
  | check | `check` | ✅ |
  | warning | `warning` | ✅ (the triangle; `warning-circle` is a different icon) |
  | info | `info` | ✅ (the circled i) |
  | chevron-right | `caret-right` | ✅ (`chevron-right.svg` does **not** exist) |

- **GOTCHA**: the array must be **sorted** — `emitIcons` throws on an unsorted manifest, because the
  emitted map's key order is the manifest's and an unsorted one is a churning artifact.
- **VALIDATE** *(observed)*:
  `for n in arrow-left caret-right check info warning x; do test -f tooling/icons/node_modules/@phosphor-icons/core/assets/regular/$n.svg && echo "$n ok" || echo "$n MISSING"; done`
  → all six `ok`.
- **REDDENS**: the manifest ↔ map identity is group 41 case 2; the drift leg is case 7.
- **SATISFIES**: AC #2, D4
- **REGENERATES**: none directly — a `.json` under `system/` matches **no** `loc-summary` group (the
  runtime regex is `^system/(wc/)?[^/]+\.(css|mjs|js)$`).

### Task 3 — CREATE `agent-layer/gen-icons.mjs`

- **IMPLEMENT**: the source below **verbatim**. It was written, run, and driven through every failure
  path in a scratch tree (NOTES § Pre-flight, spike A). 173 lines.

```js
// gen-icons.mjs — the committed Phosphor subset (epic #295 ticket #305; architecture § Stack
// "Icons ship as a generated subset, never a library", G8).
// Copies the path data of the names listed in system/icons.manifest.json out of
// tooling/icons/node_modules/@phosphor-icons/core into a generated system/icons.mjs, which is the
// ONLY source the `icon` template reads. No shipped page ever loads the package; no icon library
// ships; nothing is vendored beyond the named set.
//   node agent-layer/gen-icons.mjs              emit system/icons.mjs
//   node agent-layer/gen-icons.mjs --check      CI drift leg — writes nothing
//   node agent-layer/gen-icons.mjs --add <name> append to the manifest, then emit
// Paths resolve from this module (NOT cwd) — build.mjs runs from the jobs folder.
//
// FAILS CLOSED. A missing tooling/icons/node_modules THROWS naming the directory rather than
// reporting "no drift" — a check that passes because it reached nothing is this repo's largest
// class of defect (.claude/references/gates.md; the check that cannot fail).
//
// REFUSES AN UNEXPECTED SVG SHAPE. Observed over all 1512 regular-weight icons at 2.1.1: every one
// is exactly one <path>, viewBox "0 0 256 256", fill="currentColor", with no circle/rect/line/g.
// A package bump that changes that must be a loud failure, never a half-copied glyph.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = "system/icons.manifest.json";
const DEST = "system/icons.mjs";
const PKG = "tooling/icons/node_modules/@phosphor-icons/core";
// The one shape this generator accepts, pinned so a package bump cannot widen it silently.
const VIEWBOX = "0 0 256 256";

const assetDir = (weight) => join(ROOT, PKG, "assets", weight);

// The package on disk, or a throw naming the directory and the fix.
function requirePackage(weight) {
  const dir = assetDir(weight);
  if (!existsSync(dir))
    throw new Error(
      `gen-icons: ${PKG}/assets/${weight} is missing — the icon subset cannot be regenerated or checked. ` +
        `Install it: cd tooling/icons && npm ci`
    );
  return dir;
}

// One SVG file → its single path `d`. Throws, naming the file, on any shape but the pinned one.
export function pathOf(svg, file) {
  const vb = /viewBox="([^"]*)"/.exec(svg);
  if (!vb || vb[1] !== VIEWBOX)
    throw new Error(`gen-icons: ${file} declares viewBox ${JSON.stringify(vb && vb[1])}, expected "${VIEWBOX}" — the package's shape moved`);
  const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)].map((m) => m[1]);
  if (paths.length !== 1)
    throw new Error(`gen-icons: ${file} carries ${paths.length} <path> elements, expected exactly 1 — the package's shape moved`);
  const others = /<(circle|rect|line|polyline|polygon|ellipse|g)\b/.exec(svg);
  if (others)
    throw new Error(`gen-icons: ${file} carries a <${others[1]}> — this generator emits one path per icon and would drop it`);
  if (!paths[0].startsWith("M"))
    throw new Error(`gen-icons: ${file}'s path data does not start with a moveto — refusing to emit it`);
  return paths[0];
}

// The emitted text, from a manifest and a reader. PURE — exported so tooling/build-checks.mjs can
// drive it over a mutated manifest without writing to disk (the validateExamples precedent).
export function emitIcons(manifest, readIcon) {
  const names = [...manifest.icons];
  const sorted = [...names].sort();
  if (names.join("\u0000") !== sorted.join("\u0000"))
    throw new Error(`gen-icons: ${MANIFEST} "icons" is not sorted — the emitted map's key order is the manifest's, so an unsorted manifest is a churning artifact`);
  if (new Set(names).size !== names.length)
    throw new Error(`gen-icons: ${MANIFEST} "icons" carries a duplicate name`);
  const lines = names.map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(readIcon(n))},`);
  return [
    `// system/icons.mjs — GENERATED by agent-layer/gen-icons.mjs — do not edit.`,
    `// The committed Phosphor subset (epic #295 ticket #305, G8): the ${names.length} glyph(s) named in`,
    `// system/icons.manifest.json, at the "${manifest.weight}" weight, and nothing else. Add one with:`,
    `//   node agent-layer/gen-icons.mjs --add <phosphor-name>`,
    `//`,
    `// Phosphor Icons — MIT License, Copyright (c) 2023 Phosphor Icons.`,
    `// https://github.com/phosphor-icons/core — the full licence ships in tooling/icons/node_modules.`,
    `// Recorded ONCE, here: this file is the only place any of that artwork lives in this repo.`,
    ``,
    `export const ICON_VIEWBOX = ${JSON.stringify(VIEWBOX)};`,
    ``,
    `export const ICONS = Object.freeze({`,
    ...lines,
    `});`,
    ``,
  ].join("\n");
}

export function readManifest() {
  const text = readFileSync(join(ROOT, MANIFEST), "utf8");
  const m = JSON.parse(text);
  if (typeof m.weight !== "string" || !m.weight)
    throw new Error(`gen-icons: ${MANIFEST} needs a non-empty "weight"`);
  if (!Array.isArray(m.icons) || !m.icons.length || !m.icons.every((n) => typeof n === "string" && /^[a-z0-9-]+$/.test(n)))
    throw new Error(`gen-icons: ${MANIFEST} "icons" must be a non-empty array of lowercase Phosphor names`);
  return m;
}

// Emit the artifact (or, with {check: true}, compare against disk and report drift).
// Returns { icons (count), drifted (file names, check mode only) }.
export function genIcons({ check = false } = {}) {
  const manifest = readManifest();
  const dir = requirePackage(manifest.weight);
  const readIcon = (name) => {
    const file = join(dir, `${name}.svg`);
    if (!existsSync(file))
      throw new Error(`gen-icons: "${name}" has no ${manifest.weight}-weight SVG in ${PKG} — check the name at phosphoricons.com ("back" is arrow-left, "close" is x, "chevron-right" is caret-right)`);
    return pathOf(readFileSync(file, "utf8"), `${name}.svg`);
  };
  const out = emitIcons(manifest, readIcon);
  if (check) {
    let prior;
    try { prior = readFileSync(join(ROOT, DEST), "utf8"); } catch { prior = ""; }
    return { icons: manifest.icons.length, drifted: prior !== out ? [DEST] : [] };
  }
  writeFileSync(join(ROOT, DEST), out);
  return { icons: manifest.icons.length, drifted: [] };
}

// --add <name> — the one command G8 asks for. Refuses a name the package does not carry, naming a
// near miss where there is one; a name already present is a stated no-op, never a duplicate line.
export function addIcon(name) {
  if (typeof name !== "string" || !/^[a-z0-9-]+$/.test(name))
    throw new Error(`gen-icons --add: ${JSON.stringify(name)} is not a Phosphor name (lowercase letters, digits and hyphens)`);
  const manifest = readManifest();
  const dir = requirePackage(manifest.weight);
  if (!existsSync(join(dir, `${name}.svg`))) {
    // A near miss is a name that SHARES A WHOLE WORD, never a substring: "chevron-right" must
    // suggest caret-right and arrow-right, and substring matching suggested "t-shirt" (because
    // "chevron-right".includes("t")), which is worse than saying nothing. Measured while writing it.
    const want = new Set(name.split("-"));
    const near = readdirSync(dir)
      .filter((f) => f.endsWith(".svg"))
      .map((f) => f.slice(0, -4))
      .filter((n) => n.split("-").some((w) => want.has(w)))
      .sort((a, b) => a.length - b.length || (a < b ? -1 : 1))
      .slice(0, 5);
    throw new Error(
      `gen-icons --add: "${name}" has no ${manifest.weight}-weight SVG in ${PKG}` +
        (near.length ? ` — did you mean ${near.join(", ")}?` : " — check the name at phosphoricons.com")
    );
  }
  if (manifest.icons.includes(name)) return { added: false, icons: manifest.icons.length };
  const next = { ...manifest, icons: [...manifest.icons, name].sort() };
  // Re-serialised from the PARSED object so the file stays canonical — two-space indent, keys in
  // their declared order, one trailing newline — rather than spliced into the existing text.
  writeFileSync(join(ROOT, MANIFEST), `${JSON.stringify(next, null, 2)}\n`);
  return { added: true, icons: next.icons.length };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which
// import.meta.url percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    const addAt = args.indexOf("--add");
    if (addAt !== -1) {
      const name = args[addAt + 1];
      const r = addIcon(name);
      console.log(r.added ? `icons +   "${name}" added to ${MANIFEST} (${r.icons} icons)` : `icons =   "${name}" is already in ${MANIFEST} (${r.icons} icons) — nothing to do`);
    }
    const check = args.includes("--check");
    const r = genIcons({ check });
    if (check && r.drifted.length) {
      console.error(`icons ✗  drift: ${r.drifted.join(", ")} — regenerate with: node agent-layer/gen-icons.mjs`);
      process.exit(1);
    }
    console.log(`icons ✓  ${r.icons} icons ${check ? "— no drift" : `(${DEST})`}`);
  } catch (e) {
    console.error(`icons ✗  ${e.message}`);
    process.exit(1);
  }
}
```

- **PATTERN**: `agent-layer/gen-loc-summary.mjs` — the `{check}` contract, `ROOT` resolution, the
  `pathToFileURL` guard, the `✓`/`✗` console voice.
- **IMPORTS**: `node:fs` (`existsSync`, `readFileSync`, `readdirSync`, `writeFileSync`), `node:path`
  (`dirname`, `join`, `resolve`), `node:url` (`fileURLToPath`, `pathToFileURL`). **Zero
  dependencies.**
- **GOTCHA — the near-miss heuristic is word-based on purpose, and substring matching is a trap the
  spike actually hit.** The first version filtered with `name.includes(n.split("-")[0])`, and
  `--add chevron-right` answered *"did you mean **t-shirt**?"* — because `"chevron-right".includes("t")`.
  A suggestion worse than silence. The committed version shares whole hyphen-separated words and was
  re-measured: `chevron-right` → *align-right, arrow-right, caret-right, tag-chevron, toggle-right*;
  `back` → *skip-back, floppy-disk-back, skip-back-circle*; `close` and `zzzznope` → no suggestion,
  just the phosphoricons.com pointer. **Do not "simplify" this back to `includes`.**
- **GOTCHA — FAIL CLOSED.** `requirePackage` throws when `tooling/icons/node_modules` is absent.
  Returning "no drift" because there was nothing to compare is the check-that-cannot-fail shape
  (memory: *the check that cannot fail*).
- **GOTCHA — the SVG shape guard is not defensive padding.** Observed over all **1,512**
  regular-weight icons at 2.1.1: every one is exactly one `<path>`, `viewBox="0 0 256 256"`,
  `fill="currentColor"`, with **zero** `circle`/`rect`/`line`/`polyline`/`polygon`/`ellipse`/`g`. A
  bump that changes that must be a loud failure, not a half-copied glyph.
- **GOTCHA — no version string in the emitted header.** Reading `package.json`'s version at
  generation time would churn `system/icons.mjs` on every bump for no semantic change. The version
  lives in the lockfile, where it belongs.
- **VALIDATE** *(observed in the spike, exactly these strings)*:
  ```
  node agent-layer/gen-icons.mjs          → icons ✓  6 icons (system/icons.mjs)
  node agent-layer/gen-icons.mjs --check  → icons ✓  6 icons — no drift          (exit 0)
  ```
- **REDDENS** *(all five observed in the spike)*:
  | mutation | output | exit |
  | --- | --- | --- |
  | drop `warning` from the manifest, `--check` | `icons ✗  drift: system/icons.mjs — regenerate with: node agent-layer/gen-icons.mjs` | 1 |
  | `mv tooling/icons/node_modules …`, `--check` | `icons ✗  gen-icons: tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing — … Install it: cd tooling/icons && npm ci` | 1 |
  | `--add chevron-right` | `icons ✗  gen-icons --add: "chevron-right" has no regular-weight SVG … — did you mean align-right, arrow-right, caret-right, tag-chevron, toggle-right?` | 1 |
  | `--add "Arrow Left"` | `icons ✗  gen-icons --add: "Arrow Left" is not a Phosphor name (lowercase letters, digits and hyphens)` | 1 |
  | `--add check` (duplicate) | `icons =   "check" is already in system/icons.manifest.json (6 icons) — nothing to do` then a normal regen | 0 |
  | `--add house` (real, new) | `icons +   "house" added … (7 icons)` then `icons ✓  7 icons`; manifest re-sorted to `arrow-left caret-right check house info warning x` | 0 |
- **SATISFIES**: AC #1c, AC #2, D5
- **REGENERATES**: `system/icons.mjs` (its own output) and, once tracked, `loc-summary`'s
  `generators` group — 21 files / 2,895 exact lines → 22 files / 3,068 → rounded **2,900 → 3,100**.
  Deferred to Task 11.

### Task 4 — RUN the generator → `system/icons.mjs`

- **IMPLEMENT**: `node agent-layer/gen-icons.mjs`.
- **GOTCHA**: this is the ticket's own "Expected, not yet observed" line — the first run confirms the
  path. It is now observed; the report should still record **this** run's output, because the plan's
  observation was made in a scratch install.
- **EXPECTED OUTPUT** — the emitted file is 19 lines and begins:
  ```js
  // system/icons.mjs — GENERATED by agent-layer/gen-icons.mjs — do not edit.
  // The committed Phosphor subset (epic #295 ticket #305, G8): the 6 glyph(s) named in
  // system/icons.manifest.json, at the "regular" weight, and nothing else. Add one with:
  //   node agent-layer/gen-icons.mjs --add <phosphor-name>
  //
  // Phosphor Icons — MIT License, Copyright (c) 2023 Phosphor Icons.
  // https://github.com/phosphor-icons/core — the full licence ships in tooling/icons/node_modules.
  // Recorded ONCE, here: this file is the only place any of that artwork lives in this repo.

  export const ICON_VIEWBOX = "0 0 256 256";

  export const ICONS = Object.freeze({
    "arrow-left": "M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z",
    "caret-right": "M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z",
    "check": "M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z",
    …info, warning, x…
  });
  ```
- **VALIDATE** *(observed)*:
  `node -e "import('./system/icons.mjs').then(m=>console.log(Object.keys(m.ICONS).join(' '), '|', m.ICON_VIEWBOX, '| frozen:', Object.isFrozen(m.ICONS)))"`
  → `arrow-left caret-right check info warning x | 0 0 256 256 | frozen: true`
- **REDDENS**: n/a.
- **SATISFIES**: AC #2
- **REGENERATES**: this task IS the regeneration.

---

### Task 5 — CREATE `system/specs/icon.md`

- **IMPLEMENT**: the head, then four prose sections in `text.md`'s register.
  ```json
  {
    "component": "icon",
    "status": "shipped",
    "class": "ds-icon",
    "contract": null,
    "props": {
      "name": { "type": "string", "required": true, "description": "the Phosphor name, and it must be one system/icons.manifest.json carries — a name outside the committed subset renders as a visible refusal, never as a gap" },
      "size": { "type": "string", "required": true, "enum": ["md", "lg", "xl"], "description": "the glyph's box, named by the step of the SPACING scale it binds to — 16, 24 or 32px; there is no pixel prop" }
    },
    "tokens": ["--color-border", "--color-fg-muted", "--font-mono", "--radius-sm", "--spacing-lg", "--spacing-md", "--spacing-xl", "--spacing-xs", "--type-caption"],
    "states": ["default", "refused"],
    "children": [],
    "example": { "name": "check", "size": "lg" }
  }
  ```
  **The `tokens` array above is derived, not guessed**: it is exactly the set of `var()` names in the
  CSS block of Task 7, extracted and checked against `system/tokens.contract.css` — all nine are
  declared (observed).

  **Usage** must argue: the generated subset rather than a library; `size` reusing spacing-step names
  (D2); both props required (D2); and what a refusal looks like, citing `text.md`.
  **States**: `default` and `refused` — and say that `refused` is not a prop, it is what the template
  does with a name the map does not carry.
  **Data binding**: `contract: null`, presentational; a table of prop → effect → when absent (both
  required, so both refusals are `validateComposition`'s, before any DOM).
  **Accessibility**: the `<svg>` is `aria-hidden="true" focusable="false"` — the primitive is
  decorative by construction, on `status-chip`'s argument (its chip text is aria-hidden because the
  parent speaks the state). A meaning-bearing glyph is an `icon` beside a `text`; there is
  deliberately no `label` prop, because a decorative-vs-meaningful switch on a leaf is a decision the
  composition should make by what it puts next to it. The **refusal** is the exception: it carries
  the literal name as real text, so it *is* announced — a refusal should be loud.
- **PATTERN**: `system/specs/text.md` — same leaf shape, same refusal voice.
- **GOTCHA**: `example` is **not optional in practice.** `system/catalog.mjs:315-317` seeds the
  playground from it and invents nothing, so a spec with no example renders `/components`' `icon`
  panel as a validator refusal. Its `name` must be a **real manifest name** — `validateExamples` only
  checks the *schema*, so a bogus name would pass generation and fail visibly on the page.
- **GOTCHA**: declaring `"refused"` in `states` is safe — verified that `system/catalog.mjs:441`
  renders states as **one text line** (`States: default · refused`), never a specimen per state.
- **GOTCHA**: `tokens` must be non-empty and every entry `--`-prefixed (`agent-layer/lib.mjs`
  `parseComponentSpec`). Nothing ties it to the CSS, so a mismatch is silent here and visible on
  `/factory`'s graph — keep the two in sync in one edit.
- **VALIDATE** *(expected — the file does not exist yet)*:
  `node -e "import('./agent-layer/lib.mjs').then(l=>console.log(JSON.stringify(l.parseComponentSpec('system/specs/icon.md').head,null,1)))"`
- **REDDENS**: put `{"name": 7, "size": "lg"}` in the example → `node agent-layer/gen-vocabulary.mjs`
  exits naming `system/specs/icon.md: head "example" does not render — …props.name: expected string, got number`.
- **SATISFIES**: AC #2, D2
- **REGENERATES**: `handoff/verdant/*` — Task 10.

### Task 6 — UPDATE `system/specs/stack.md`

- **IMPLEMENT**: add `"icon"` to the head `children` array, **alphabetically** — between
  `ghost-button` and `list`. Then extend the Usage paragraph reading "`stack` and `text` (#301) and
  now `list` (#303), the third to land, with the remaining two arriving the same way" to name `icon`
  (#305) as the fourth, leaving **one**.
- **GOTCHA**: must come **after** `system/specs/icon.md` exists —
  `agent-layer/gen-handoff.mjs:34-38` throws `children entry "icon" names no spec in system/specs/`
  otherwise.
- **GOTCHA**: widen **no** other `children` list. `list.children` is `["list-row"]` by design
  (#303's whole argument); a nav/button icon slot is a different ticket.
- **VALIDATE** *(expected)*:
  `node -e "import('./agent-layer/lib.mjs').then(l=>console.log(l.parseComponentSpec('system/specs/stack.md').head.children.join(' ')))"`
  → `card ghost-button icon list modal-dialog nav-tabs primary-button screen-header select-field stack text text-field`
- **REDDENS**: n/a.
- **SATISFIES**: AC #2
- **REGENERATES**: `handoff/verdant/*`.

### Task 7 — ADD the `ds-icon` block to `system/components.css`

- **IMPLEMENT**: append after the `ds-list` block (which ends before
  `/* ---------- Verdant screen scaffolding … */` at `:2550`). Token-only:
  ```css
  /* ---------- ds-icon (system/specs/icon.md) — cross-scenario library primitive ---------- */

  /* … prose: the generated subset (never a library); size by SPACING STEP so a composition carries
     no pixel value; and the refusal, which is ds-text's link precedent (#301) applied to a name. */
  .ds-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    /* currentColor, so a glyph takes the colour of whatever it sits in and wears every pack
       without a rule of its own. The <path> carries fill="currentColor" from the package. */
    color: inherit;
  }
  .ds-icon > svg { display: block; width: 100%; height: 100%; }

  /* Three rules, not one with a local custom property: tooling/token-lint.mjs treats EVERY var()
     in this file as a contract reference, and this file has none that are not (checked). */
  .ds-icon[data-size="md"] { width: var(--spacing-md); height: var(--spacing-md); }
  .ds-icon[data-size="lg"] { width: var(--spacing-lg); height: var(--spacing-lg); }
  .ds-icon[data-size="xl"] { width: var(--spacing-xl); height: var(--spacing-xl); }

  /* The refusal. A name the committed subset does not carry reads as its own literal source text —
     ds-text's refused-link precedent — so a typo is a mistake a reader can SEE rather than a gap
     they read as a design decision. No dashed frame: that is ds-empty-state's. */
  .ds-icon[data-refused] {
    width: auto;
    height: auto;
    padding: 0 var(--spacing-xs);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: var(--type-caption);
  }
  ```
- **GOTCHA — NO PRIVATE CUSTOM PROPERTIES.** `tooling/token-lint.mjs:50-59` treats **every** `var()`
  in `components.css` as a contract reference. Verified: the file has **zero** non-contract `var()`s
  today. So `--ds-icon-size` is an instant red build. Bind `width`/`height` directly.
- **GOTCHA — the nine tokens above are the spec's `tokens` array.** Verified all nine are declared in
  `system/tokens.contract.css`: `--color-border --color-fg-muted --font-mono --radius-sm
  --spacing-lg --spacing-md --spacing-xl --spacing-xs --type-caption`.
- **GOTCHA — block-header format is parsed.** One line, `/* ----------` … `---------- */`, spec path
  in parentheses. `gen-system-graph.mjs:72-78` throws on a malformed one and on a duplicate slug.
- **VALIDATE** *(expected)*: `node tooling/token-lint.mjs` → `token-lint ✓`; then
  `node agent-layer/gen-system-graph.mjs` and confirm a `ds-icon` consumer with nine token edges.
- **REDDENS**: replace `var(--spacing-lg)` with `24px` → `gen-system-graph` drops that edge; replace
  it with `var(--icon-size-lg)` → `node tooling/token-lint.mjs` exits 1 naming the undeclared token.
- **SATISFIES**: AC #2
- **REGENERATES**: `system/system-graph.json` — Task 10.

### Task 8 — ADD the `icon` template to `system/agentic-renderer.mjs`

- **IMPLEMENT**: a static import beside the `handoff-viewer` one, and the template placed after
  `"text"` and before `"empty-state"`. **This exact code was driven through the repo's real DOM stub
  and passed every case** (NOTES § Pre-flight, spike B):
  ```js
  import { ICONS, ICON_VIEWBOX } from "./icons.mjs";
  ```
  ```js
  // THE GLYPH (#305, epic #295 G8) — one drawing, by Phosphor name, out of the COMMITTED subset in
  // system/icons.mjs and nowhere else. No icon library ships; the package that artwork came from is
  // a build-time tool dir (tooling/icons/) no page can reach.
  //
  // A NAME THE MAP DOES NOT CARRY IS A VISIBLE REFUSAL, never an empty box: the literal name renders
  // as its own text in a marked span, which is exactly what `text` does with a refused link (#301) —
  // a mistake a reader can see beats a gap they read as a design decision.
  //
  // Object.hasOwn, NOT `ICONS[name]` truthiness: a name like "constructor" or "toString" resolves
  // through Object.prototype to a FUNCTION, and Object.freeze does not stop that. The same argument
  // validateComposition makes for the vocabulary lookup at the top of this file. Measured: with the
  // truthiness form, "constructor" RENDERS.
  //
  // The <svg> and its <path> go through createElementNS, never el(): el() is document.createElement,
  // which yields an HTMLUnknownElement for "svg" that paints nothing while every assertion about it
  // still passes. NOTE the module-private `icon()` helper above (line ~173) builds a 24x24 svg for
  // the GLYPHS map — Verdant's chrome, unrelated to this — so do not call it here.
  "icon": (props) => {
    const d = Object.hasOwn(ICONS, props.name) ? ICONS[props.name] : null;
    if (d === null)
      return el("span", { class: "ds-icon", "data-refused": true, "data-size": props.size, text: props.name });
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", ICON_VIEWBOX);
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.appendChild(svgPath(d));
    return el("span", { class: "ds-icon", "data-size": props.size }, svg);
  },
  ```
- **PATTERN**: the `text` template at `:492-497` for the comment voice; `svgPath` at `:183`.
- **GOTCHA — NAME COLLISION.** `function icon(...children)` already exists at `:173`.
  `TEMPLATES["icon"]` is a string key so nothing shadows at the map level, but **calling `icon(...)`
  inside the template builds the wrong element**. Use `createElementNS` directly, as above. Do not
  rename or reuse `icon()`.
- **GOTCHA — the refusal keeps `data-size`.** The `[data-refused]` rule overrides `width`/`height`
  anyway; dropping the attribute would make the two branches differ in a second, undesigned way.
- **GOTCHA — Node-safety.** `gen-vocabulary.mjs` imports this module under Node, so `icons.mjs` must
  execute nothing at import time. A frozen object literal does not.
- **VALIDATE**: group 41 below. Quick smoke:
  `node -e "import('./system/agentic-renderer.mjs').then(()=>console.log('imports clean under Node'))"`
- **REDDENS** *(both measured in the spike)*: swap `Object.hasOwn(ICONS, props.name)` for
  `ICONS[props.name]` → group 41 case 6 fails, `"constructor"` RENDERS. Swap `createElementNS` for
  `el("svg", …)` → case 4's `ns === SVGNS` fails for every name.
- **SATISFIES**: AC #1a, AC #1b
- **REGENERATES**: none directly; `loc-summary` runtime lines — Task 11.

### Task 9 — UPDATE `system/palette.mjs` — `CATALOG_COMPONENTS`

- **IMPLEMENT**: insert `"icon"` alphabetically (after `"ghost-button"`, before `"list"`).
- **GOTCHA**: `tooling/build-checks.mjs:4967` asserts set identity against `vocabulary.json`.
  **Editing either side alone is red** — which is why the pin exists. Memory: *palette memoizes —
  chrome needs static tags* (a dynamic registration races the memoized list by 17–134 ms; do not
  "fix" the second copy).
- **VALIDATE** *(expected, after Task 10)*:
  `node -e "Promise.all([import('./system/palette.mjs'),import('node:fs')]).then(([p,fs])=>{const v=Object.keys(JSON.parse(fs.readFileSync('handoff/verdant/vocabulary.json','utf8')).components).sort();const c=[...p.CATALOG_COMPONENTS].sort();console.log('equal:',JSON.stringify(c)===JSON.stringify(v),c.length)})"`
  → `equal: true 25`
- **REDDENS**: leave it unedited → group 21 case 21.2 fails naming both lists.
- **SATISFIES**: AC #3c
- **REGENERATES**: none.

---

### Task 10 — RUN the five regenerators, in order

- **IMPLEMENT**:
  ```bash
  node agent-layer/gen-handoff.mjs      # pack.json + contracts/ + wc/ + tokens/  (needs tooling/style-dictionary/node_modules)
  node agent-layer/gen-vocabulary.mjs   # vocabulary.json  (runs validateExamples — a bad example reds here)
  node agent-layer/gen-pack-bundle.mjs  # pack.bundle.json — INLINES pack.json, so it must follow it
  node agent-layer/gen-pack-index.mjs   # llms.txt — MEASURES the bundle's bytes, so it must follow the bundle
  node agent-layer/gen-system-graph.mjs # system/system-graph.json — the new ds-icon consumer + its 9 edges
  ```
- **GOTCHA**: **the ticket says "the four regenerators". It is five.** `gen-pack-index.mjs` (#419)
  landed at `8b318a0`, after the epic's ticket bodies were written. Missing it reds `drift-check`'s
  `checkHandoff` on `handoff/verdant/llms.txt`. (Inherited from
  `.claude/plans/list-primitive-through-the-chain-303.md:611`.)
- **GOTCHA**: the order is not cosmetic — bundle inlines the pack, index measures the bundle.
- **GOTCHA**: `gen-handoff` needs `tooling/style-dictionary/node_modules`; run
  `cd tooling/style-dictionary && npm ci` first if it is missing. Its throw states the fix.
- **EXPECTED**: `vocabulary.json` goes from **24 to 25** components; `pack.json` the same;
  `system-graph.json` gains one consumer (`ds-icon`) with nine token edges.
- **VALIDATE**: `node -e "console.log(Object.keys(require('./handoff/verdant/vocabulary.json').components).length)"` → `25`
- **REDDENS**: skip `gen-pack-index.mjs` → `drift-check` reds naming `handoff/verdant/llms.txt`.
- **SATISFIES**: AC #3b
- **REGENERATES**: this task IS the regeneration —
  `handoff/verdant/{pack.json,vocabulary.json,pack.bundle.json,llms.txt}`, `handoff/verdant/contracts/`,
  `handoff/verdant/tokens/`, `system/system-graph.json`.

### Task 11 — RUN `import/regen-expected.mjs` and read the diff

- **IMPLEMENT**: `node import/regen-expected.mjs`, then **read the diff**.
- **GOTCHA — THIS IS THE STANDING RULE THE TICKET BODY DOES NOT CARRY.**
  `import/fixtures/spike-c-instance.expected.json` holds a `candidates` list per node, so it is a
  function of the **whole** vocabulary. A new component spec moves it and reds build-checks group 40
  case 1 on a ticket that never touched `import/`. CLAUDE.md's "New component spec" bullet names this
  file for exactly this reason, and `regen-expected.mjs`'s own header names **#305**.
- **THE EXACT EXPECTED DIFF — measured, not estimated.** Anything else is a stop signal:

  | measure | value |
  | --- | --- |
  | lines added | **+66** |
  | lines removed | **0** |
  | hunks | **6** |
  | bytes | 52,922 → **54,924** (+2,002) |
  | verdict fields changed (`covered` · `via` · `name`) | **none** — proven by diffing those lines alone |

  Every one of the 66 added lines is part of one of six identical `icon` candidate blocks:
  ```json
  {
    "hits": [
      {
        "detail": "1/2 required props fillable from the read (name)",
        "field": "name",
        "signal": "prop-fit"
      }
    ],
    "score": 0.125,
    "slug": "icon"
  }
  ```
  They land on the six text-bearing nodes. The Avatar (a `shape` with no text) and the **Chevron**
  (kind `icon`, no text, no layout) get **no** `icon` candidate at all — which is D1.
- **GOTCHA — NEVER HAND-EDIT THE JSON.** `regen-expected.mjs`'s header states it: the output is the
  program's. If the diff is not the one above, stop and work out why before touching anything.
- **VALIDATE**: `node import/regen-expected.mjs --check` →
  `expected verdict ✓  import/fixtures/spike-c-instance.expected.json — 54924 bytes from import/fixtures/spike-c-instance.blueprint.txt`
- **REDDENS**: skip this task → `node tooling/build-checks.mjs` reds in group 40 case 1 with "the
  committed verdict and the run disagree".
- **SATISFIES**: AC #4
- **REGENERATES**: `import/fixtures/spike-c-instance.expected.json`.

### Task 12 — RUN `gen-loc-summary` (stage first)

- **IMPLEMENT**: `git add` every new tracked file **first**, then
  `node agent-layer/gen-loc-summary.mjs`.
- **GOTCHA — IT READS THE GIT INDEX, NOT THE WORKING TREE.** `git show :<path>` is the source.
  Running `--check` before staging is a false "no drift" for **edits too**, not only new files.
  (Memory: *loc-summary counts tracked only*.)
- **THE ARITHMETIC, MEASURED.** Current exact (unrounded) counts, read straight off the index:

  | group | files | exact lines | rounded |
  | --- | --- | --- | --- |
  | runtime | 79 | **32,004** | 32,000 |
  | generators | 21 | **2,895** | 2,900 |

  - **runtime**: +1 file (`system/icons.mjs`, 19 lines) and roughly +80 lines across
    `icons.mjs` + the `components.css` block + the renderer template + the palette line.
    **The rounding boundary is 32,050** — so 46 or more added lines flips the digit to **32,100**.
    The estimate crosses it; **compute, do not assume**, and record which way it went.
  - **generators**: +1 file (`gen-icons.mjs`, **173 lines**) → 2,895 + 173 = 3,068 → **3,100**.
    Not rendered on any page, so this half moves `loc-summary.json` only.
- **GOTCHA — THE APPROACH REGEN IS UNCONDITIONAL HERE, UNLIKE #303's.** `approach.html:272-279`
  renders `runtime.files` and `runtime.linesApprox`, and `runtime.files` **definitely** moves 79 → 80.
  So `approach-{neutral,saulera,verdant}.png` all churn whatever the line digit does.
- **GOTCHA — THE TICKET SAYS "approach ×2". IT IS ×3.** #302 merged `verdant` into the pixel gate's
  `PACKS`; `tooling/visual-regression/baselines/` carries all three `approach-*.png` (observed). The
  epic's standing-rules table (`docs/epics/canvas-design-import.prd.md:274`) says ×2 for the same
  pre-#302 reason.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`
- **REDDENS**: hand-edit `runtime.files` → `--check` exits 1 naming the file; CI `verify` blocks.
- **SATISFIES**: AC #3a
- **REGENERATES**: `system/loc-summary.json` + `approach-{neutral,saulera,verdant}.png` (Task 19).

---

### Task 13 — ADD `checkIcons()` to `tooling/drift-check.mjs`

- **IMPLEMENT**: import `genIcons`, add the check beside `checkLocSummary`, call it in the standalone
  block **before** `checkSystemGraph`, and **add `icons` to the hand-maintained `✓` log line**.
  ```js
  // 2c3. Icons drift — check mode writes nothing; compares in-memory regen vs disk. It THROWS
  // rather than passing when tooling/icons/node_modules is absent (the generator's fail-closed
  // rule), so a CI job that lost its install fails loudly instead of measuring nothing.
  function checkIcons() {
    const r = genIcons({ check: true });
    if (r.drifted.length)
      throw new Error(`icons drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-icons.mjs`);
  }
  ```
- **PATTERN**: `checkLocSummary` / `checkParamCount` at `tooling/drift-check.mjs:62-77` — the same
  five-line shape.
- **GOTCHA**: the `✓` line is a **hand-maintained string**, not derived. A leg absent from it is a
  leg nobody reading CI output knows ran. Target:
  `drift-check     ✓  syntax · token-css · annotated-source · loc-summary · param-count · icons · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count`
- **GOTCHA**: the file header says "Requires tooling/style-dictionary/node_modules". Extend that
  sentence to name `tooling/icons/node_modules` — the header is the specification.
- **VALIDATE**: `node tooling/drift-check.mjs` → the `✓` line above.
- **REDDENS** *(the generator half is already measured; this proves the wiring)*: remove one name from
  `system/icons.manifest.json`, run `node tooling/drift-check.mjs` → exits 1 with
  `drift ✗  icons drift: system/icons.mjs — regenerate: node agent-layer/gen-icons.mjs`.
- **SATISFIES**: AC #1c, AC #3e
- **REGENERATES**: none (`tooling/` matches no `loc-summary` group).

### Task 14 — ADD the `npm ci` step to `.github/workflows/verify.yml`

- **IMPLEMENT**: a second install step in the **`verify`** job, immediately after
  `Install Style Dictionary` and before `Drift check`:
  ```yaml
      # The icon subset generator reads @phosphor-icons/core off disk (#305), and drift-check's
      # icons leg regenerates the committed map from it — so the package must be present or that
      # leg THROWS rather than passing vacuously. Lockfile present → npm ci.
      - name: Install Phosphor icons
        run: npm ci
        working-directory: tooling/icons
  ```
- **GOTCHA — THIS IS NOT THE ⚠ THE FILE WARNS ABOUT.** The `Build checks` step carries a large ⚠
  banning an `npm ci` for **`portal/`**, because group 8's SDK-free invariant is proven by the
  *absence* of `portal/node_modules`. It says "The npm ci steps above are deliberately scoped to
  tooling/style-dictionary and tooling/visual-regression only." **Extend that sentence to name
  `tooling/icons` in the same edit**, so the next reader is not left deciding whether this violated
  the ban.
- **GOTCHA**: the `visual` job runs in the Playwright container and needs nothing from it; `codeql`
  and `audit` are untouched (`audit-delta` materialises its own temp dirs).
- **VALIDATE**:
  `node -e "const y=require('node:fs').readFileSync('.github/workflows/verify.yml','utf8');const i=y.indexOf('working-directory: tooling/icons'),j=y.indexOf('node tooling/drift-check.mjs');console.log('install before drift-check:', i>0 && i<j)"`
  → `install before drift-check: true`. The real proof is a green `verify` on the PR.
- **REDDENS** *(prove it locally rather than by pushing a broken workflow)*:
  `mv tooling/icons/node_modules /tmp/icons-off && node tooling/drift-check.mjs; mv /tmp/icons-off tooling/icons/node_modules`
  → observed: `icons ✗  gen-icons: tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing — … Install it: cd tooling/icons && npm ci`, exit 1.
- **SATISFIES**: AC #1c, AC #3e, D5
- **REGENERATES**: none.

### Task 15 — ADD build-checks group 41, `icons`

- **IMPLEMENT**: a new block at the end of `tooling/build-checks.mjs`, after group 40
  (`import-chain`), ending in `group("icons", \`…\`)`. **Cases 1, 2, 3, 4, 4b, 5, 6, 6b and 8 below
  were written and DRIVEN against the real `domStub` and the real `validateComposition` in the spike —
  30 assertions, all green.** Cases **7, 7b and 9 are specified but not yet driven**: 7 needs
  `emitIcons`/`pathOf` exported from the real `agent-layer/gen-icons.mjs` (they are, in Task 3's
  source), 7b needs its three synthetic SVG strings written, and 9 is a one-line set compare. Write
  those three, then run the whole group — and see 7b's three throws fire before trusting them.

  1. **The controls, first.** `domStubControl()`, **plus a namespace control of its own**:
     `createElementNS(SVGNS,"svg")` records `ns === SVGNS`, records the tag and its attributes, and a
     `createElement` node records `ns === null` so the two paths are distinguishable. The standing
     `domStubControl()` exercises `createElement` only — without this, every `ns` assertion below
     could pass against a stub that silently dropped the namespace.
  2. **Manifest ↔ map identity.** `Object.keys(ICONS)` equals the manifest's `icons` array **in
     order**; `ICON_VIEWBOX === "0 0 256 256"`; every `d` is a non-empty string starting `M`;
     `Object.isFrozen(ICONS)`.
  3. **A SUBSET, never a vendoring** (AC #2). `Object.keys(ICONS).length === manifest.icons.length`
     **and** `< 20`. Message names the contrast: the package ships 1,512 per weight, so a generator
     that started copying them all fails here by **count** rather than as a diff nobody reads.
  4. **Every manifest name RENDERS** (AC #1a). Loop over each name `n`: render
     `{name:"icon", props:{name:n, size:"lg"}}`; assert the root is `SPAN.ds-icon` with
     `data-size="lg"` and **no** `data-refused`; one `SVG` with `ns === SVGNS`,
     `viewBox === ICON_VIEWBOX`, `aria-hidden="true"`, `focusable="false"`; one `PATH` with
     `ns === SVGNS` and **`d === ICONS[n]`** (the loop variable).
  4b. **The spec's own example, by name** — `{name:"check", size:"lg"}`, asserted separately, because
     that is what `/components` actually shows.
  5. **A NON-manifest name refuses, VISIBLY** (AC #1b). `name:"not-an-icon"`: the span carries
     `data-refused`; `stubText(node) === "not-an-icon"`; **zero** `SVG` and **zero** `PATH` (an empty
     box is the failure mode this case exists for); `data-size` survives.
  6. **The prototype-chain trap.** `"constructor"`, `"toString"`, `"__proto__"`, `"hasOwnProperty"`
     all refuse.
  6b. **The MUTATION that proves 6 can fail.** A local copy of the branch using `ICONS[name]`
     truthiness instead of `Object.hasOwn` must **render** for `"constructor"` — observed. Without
     this, case 6 could be green against a template that never had the trap.
  7. **`gen-icons --check` CAN FAIL** (AC #1c). `genIcons({check:true}).drifted` is empty; then drive
     the **pure** `emitIcons(manifest, readIcon)` over a manifest copy with one name removed and
     assert the emitted text differs from the committed file. `emitIcons` and `pathOf` are exported
     for exactly this — the `validateExamples` precedent ("exported so tooling/build-checks.mjs can
     drive it… which is the only thing that proves this gate can fail at all"). **Nothing writes to
     disk.**
  7b. **`pathOf` refuses a moved shape.** Feed it three synthetic SVG strings — a moved `viewBox`,
     two `<path>` elements, and one carrying a `<circle>` — and assert each throws naming the file.
  8. **The vocabulary entry + the validator.** `VOCAB.components.icon` exists with `children: []` and
     **no** `childrenCardinality`; `stack.children` includes `icon`; and five `validateComposition`
     drives (all observed): a valid icon passes; a missing `name` throws
     `required prop of icon is missing`; `size:"huge"` throws naming `[md | lg | xl]`; an icon with a
     child throws `icon allows no children`; a `stack` holding an `icon` passes.
  9. **The manifest is the six the ticket names**, as a tripwire — a set compare whose message says a
     seventh is fine and this line is simply where it gets noticed.
- **GOTCHA — THE `detail` STRING MUST STATE WHAT IT CANNOT REACH.** The convention is explicit in
  `.claude/references/gates.md`. Here: **how the glyph LOOKS** — that `check` is a tick and not a
  cross, that the three sizes are visibly distinct, that a refused icon reads as a mistake — is the
  pixel gate's and a human read's; and **that the refusal's border wins at runtime** is
  `catalog-journey`'s, because a regex over the sheet sees neither specificity nor a pack override.
- **GOTCHA**: cases must be **driven**, not grepped (memory: *the check that cannot fail*).
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 41 groups pass`
- **REDDENS**: each case carries its own. Group-level: delete the `"icon"` template from
  `agentic-renderer.mjs` → group 3's "every vocabulary entry has a template" fails **and** cases 4–6
  fail.
- **SATISFIES**: AC #1a, #1b, #1c, #2
- **REGENERATES**: none.

### Task 16 — UPDATE the wrapper histogram — 3/21 → 3/22, in four places

- **IMPLEMENT**: `tooling/build-checks.mjs:5039` → `ok(withWrapper === 3 && withoutWrapper === 22, …)`
  and the `(pinned 3/21; …)` text in its message; `.claude/references/gates.md` group 21's paragraph
  and its `catalog-journey.mjs` paragraph; and `system/catalog.mjs:67-69` (D6).
- **GOTCHA — 3/22 IS DERIVED, NOT READ OFF THE ARTIFACT.** 25 vocabulary entries minus the 3
  committed `system/wc/` wrappers. **`handoff/verdant/pack.json` carries no per-component `wrapper`
  key** — observed: `pack.components.filter(c => c.wrapper).length` is **0**. The field is added at
  view time by `prepareHandoff` from the pack's own `portability` block, which is what build-checks
  counts. An implementer who greps `pack.json` for `wrapper` will find nothing and conclude this plan
  is wrong; it is not.
- **GOTCHA — THE PROSE HAS FOUR COPIES AND ONE WAS ALREADY STALE** (memory: *gate prose has three
  copies*). `system/catalog.mjs:67-69` says "3 of 20 today; the 17 absences … the 3/17 histogram" —
  wrong **before** this ticket. D6 fixes it to 3/22 rather than leaving a number this ticket makes
  more wrong.
- **VALIDATE**: `node tooling/build-checks.mjs`, then
  `grep -rn "3/21\|3/17\|3 of 20" tooling/ .claude/references/ system/` → **no hits**.
- **REDDENS**: leave the pin at 21 → group 21 fails with "the wrapper histogram moved — 3 with / 22
  without (pinned 3/21…)".
- **SATISFIES**: AC #3e, D6
- **REGENERATES**: none.

### Task 17 — UPDATE the group count — 40 → 41, in four sites

- **IMPLEMENT**: `tooling/drift-check.mjs`'s `checkGroupCount` pins four claims; update all four:
  1. `tooling/build-checks.mjs` — `console.log("\nbuild ✓  all 41 groups pass")`
  2. `CLAUDE.md:124` — `build-checks.mjs            41 PURE groups, in CI …`
  3. `CLAUDE.md:196` — `build-checks' 41 groups`
  4. `.claude/references/gates.md:11` — `## \`tooling/build-checks.mjs\` — 41 pure groups, in CI`
- **PATTERN**: the `claims` array in `checkGroupCount` **is** the list — read it rather than trusting
  this one.
- **GOTCHA**: the leg also asserts `calls.length - DUPES.length === n`, with `DUPES = ["parenting"]`
  (one group called from both arms of an `if`/`else`). Observed today: 41 `group(` matches in the
  file, one of which is the `function group(name, detail)` declaration at `:327` → **40 calls, 1
  dupe, 40 distinct names**. After this ticket: 41 calls, 1 dupe, **41 distinct**. Do **not** add
  `icons` to `DUPES`.
- **VALIDATE**: `node tooling/drift-check.mjs` → no `group-count drift` in the output.
- **REDDENS**: update three of the four → `drift-check` exits 1 naming the fourth and both numbers.
- **SATISFIES**: AC #3e
- **REGENERATES**: none.

### Task 18 — CORRECT group 40's four prediction sites (and `recognise.mjs`'s)

- **IMPLEMENT**: `tooling/build-checks.mjs` `:11947`, `:11974`, `:11990`, `:11992` and the
  `group("import-chain", …)` detail at `:12284` all predict that `icon` entering the vocabulary makes
  the Chevron covered. **Measured: it does not.** Rewrite each to state the fact and the mechanism,
  and leave the assertions **unchanged** — they still hold:

  > `icon` is in the vocabulary as of #305 and the Chevron **still** reads NOT COVERED — the node
  > draws no text, so `prop-fit` cannot fill `icon.name`; `name-match` is word containment and
  > `{chevron} ⊉ {icon}`; and `kind-fit` has no branch for `node.kind === "icon"`. The IR **does**
  > carry `icon: {name: "caret-right"}` and nothing reads it. Covering it needs a `kind-fit` branch
  > plus a structural fill that sum to exactly `THRESHOLD` — a number fitted to a wanted answer, which
  > this file's header forbids. See #<the D1 follow-up>.

  Also correct `import/recognise.mjs:195-196` ("An `icon` kind matches NOTHING today, because `icon`
  is not in the vocabulary — #305 is the ticket that changes it"), which names the wrong cause: it
  matches nothing because there is **no branch** for it, and that stays true after #305.
- **GOTCHA — THE ASSERTIONS DO NOT MOVE, ONLY THE PROSE.** Resist "fixing" the gate to match the old
  prediction. Evidence: **zero** verdict changes, `build()`'s emitted set stays `["stack","text"]`,
  the recognised-but-refused set stays `["list-row","status-chip"]`.
- **GOTCHA**: `:11950`'s message interpolates `${Object.keys(VOCAB.components).length}` — that number
  goes 24 → 25 by itself. Do **not** hardcode it.
- **VALIDATE**: `node tooling/build-checks.mjs` → group 40 green, unchanged; and
  `grep -n "#305" tooling/build-checks.mjs import/recognise.mjs` → every hit states an observed fact,
  none states a prediction.
- **REDDENS**: n/a — this task changes no assertion. Its proof is that group 40 is green **both
  before and after** the vocabulary grew; record both runs in the report.
- **SATISFIES**: AC #4, D1, and the honesty contract — a gate whose message states a false reason
  teaches the next reader something untrue.
- **REGENERATES**: none.

---

### Task 19 — UPDATE `CLAUDE.md` + `.claude/references/gates.md`

- **IMPLEMENT**:
  - **Map, `system/` block** — two rows beside the primitives:
    `icons.manifest.json         hand-maintained: the Phosphor names this repo has committed (--add appends)`
    `icons.mjs                   GENERATED subset — name → path data; the icon template's only source`
  - **Map, `agent-layer/` block** — one named row (like `gen-replay.mjs`), because `--add` is an
    operator command:
    `gen-icons.mjs               GENERATED + drift-checked: the manifest's names → system/icons.mjs; --add <name>`
  - **Map, `tooling/` block**:
    `icons/                      the Phosphor package — a dependency-carrying tool dir, never loaded by a page`
  - **"Where new code goes"** — a new bullet:
    `**New icon** → \`node agent-layer/gen-icons.mjs --add <phosphor-name>\` (Phosphor's own name, not a role word — phosphoricons.com; the command refuses an unknown one and suggests near misses); commit the regenerated \`system/icons.mjs\`. No spec, no CSS, no template: one manifest line.`
  - **gates.md** — the heading count (Task 17), the 3/22 prose (Task 16), and a **Group 41**
    paragraph in the register of groups 21/24: what it reaches and what it cannot.
- **GOTCHA**: CLAUDE.md § Ground rules — invariants live in the file that owns them and the map is
  **an index**. Each row says what the file *is*; the mechanics belong in `gen-icons.mjs`'s header.
- **VALIDATE**: `node tooling/drift-check.mjs` (its group-count leg reads CLAUDE.md and gates.md).
- **REDDENS**: n/a beyond the group-count leg.
- **SATISFIES**: AC #3e
- **REGENERATES**: none.

### Task 20 — RUN `catalog-journey` ×3 engines

- **IMPLEMENT**:
  ```bash
  node tooling/visual-regression/serve.mjs &     # note the PORT it prints
  node tooling/catalog-journey.mjs all
  ```
- **GOTCHA — A STALE SERVER SERVES SOMEONE ELSE'S TREE** (memory: *stale serve = wrong tree*). A
  parallel session's `serve.mjs` can hold the port for days. `curl -s localhost:<port>/system/icons.mjs | head -3`
  before trusting the run; use the `PORT`/`BASE` overrides if it is not yours.
- **GOTCHA**: the journey counts components **from the fetched artifact**, so 24 → 25 needs no edit.
- **THE FOUR MANUAL READS** (the things no pure gate can reach):
  1. the `icon` panel shows a real **tick** (not a cross) at 24px, from the `check` example;
  2. `size` md → lg → xl visibly grows the glyph 16 → 24 → 32;
  3. typing `not-an-icon` into the `name` field produces a **bordered mono box reading
     `not-an-icon`** — not a blank, not a console error;
  4. switching packs in the dock **recolours** the glyph (it is `currentColor`).
- **VALIDATE**: `node tooling/catalog-journey.mjs all` → green on chromium, firefox, webkit.
- **REDDENS**: n/a (operator-run gate).
- **SATISFIES**: AC #3d
- **REGENERATES**: none.

### Task 21 — REGENERATE six baselines: `/components` ×3 and `approach` ×3

- **IMPLEMENT**: commit first; then from a **clean detached worktree under `/Users`** (not
  `/private/tmp` — Docker file sharing), **`rm` the six PNGs**, then
  `cd tooling/visual-regression && npm run update:docker`.
- **GOTCHA — `update:docker` SCREENSHOTS THE DIRTY TREE** (memory: *VR gate reads the working tree*).
- **GOTCHA — IT SILENTLY KEEPS A BASELINE WHOSE ONLY CHANGE IS SUB-PERCEPTUAL** (memory: *VR update
  skips sub-perceptual*). `approach`'s change is a digit (`79` → `80`, and probably `32,000` →
  `32,100`), which is exactly that case — **`rm` the three approach PNGs to force the rewrite.** And
  `maxDiffPixels: 100` swallows a few changed digits (memory: *VR tolerance hides text changes*), so
  a green run is not proof the page did not change.
- **GOTCHA — `approach` FLAKES ON A LIVE `countUp`** (memory: *VR gate approach countUp flake*). The
  "two consecutive stable screenshots" pass can fail on the rAF counter with `retries: 0`, failing a
  different pack each run. A local Docker pass is not CI green — check `gh pr checks`.
- **GOTCHA — `/components` MAY EXCEED ITS SHOT BUDGET, AND THE RULE IS WRITTEN DOWN.**
  `tooling/visual-regression/visual.spec.mjs:122-127`: the catalog's viewport-sized capture was
  ~44k px tall at 20 components and `shotTimeout` was raised to `30_000`; the comment says "#301 took
  the catalog to 23" — itself one behind (#303 took it to 24), and this ticket takes it to **25**, a
  further ~4% of raster. If the stable-generation pass times out, **raise `shotTimeout`, never the
  diff tolerance** — the comment says so explicitly. Update that comment to name #303 (24) and #305
  (25) while you are in the file.
- **THE SIX**: `components-{neutral,saulera,verdant}.png` (a 25th component renders at rest) and
  `approach-{neutral,saulera,verdant}.png` (`runtime.files` 79 → 80).
- **GOTCHA**: no other page changes. `/build`, `/factory`, `/work`, `/`, `/roundtrip`, `/404` and the
  two proto pages render no `icon` and read no `loc-summary` runtime figure.
- **VALIDATE**: `cd tooling/visual-regression && npx playwright test` → green, 22 PNGs.
- **REDDENS**: skip the regen → the `visual` job reds naming the six files.
- **SATISFIES**: AC #3a, AC #3c
- **REGENERATES**: this task IS the regeneration.

---

## TESTING STRATEGY

No suite, no linter, no type-check in this repo — don't hunt for one. "Done" means the gate ran.

### Unit Tests

The equivalent is **build-checks group 41**, a pure group that imports the shipped modules and opens
no browser. Nine of its twelve cases were written and **run** in the spike against the real
`domStub` and the real `validateComposition`: 30 assertions, all passing, including the mutation that
proves the prototype-chain case can fail. The other three (7, 7b, 9) are specified and undriven —
see Task 15, and the Edge Cases table's "coded; drive the synthetics" row.

### Integration Tests

- `tooling/drift-check.mjs` — the generator's `--check` leg, in CI.
- `tooling/catalog-journey.mjs all` — `/components` on three real engines, operator-run.
- `tooling/visual-regression` — the six regenerated baselines, in CI.

### Edge Cases

| Case | Proven where | Status |
| --- | --- | --- |
| Every manifest name renders a real glyph | group 41 case 4 | **observed in spike** |
| A name not in the manifest refuses visibly (literal text, no empty box) | case 5 | **observed** |
| `constructor` / `toString` / `__proto__` / `hasOwnProperty` refuse | case 6 | **observed** |
| The `Object.hasOwn` guard is not vacuous | case 6b (mutation) | **observed** |
| The map is a **subset**, not a vendoring | case 3 | **observed** |
| `icons.mjs` stale against the manifest | case 7 + drift leg | **observed (exit 1)** |
| `tooling/icons/node_modules` absent → throw, not "no drift" | the `mv` mutation | **observed (exit 1)** |
| A package bump changes the SVG shape | `pathOf`'s three throws, case 7b | **coded; drive the synthetics** |
| `--add` with a name Phosphor lacks | refuses + suggests near misses | **observed (exit 1)** |
| `--add` with a malformed name | refuses on the character class | **observed (exit 1)** |
| `--add` with a name already present | stated no-op, manifest unchanged | **observed (exit 0)** |
| `--add` with a real new name | sorted insert + regen | **observed (exit 0)** |
| A `stack` holding an `icon` validates | case 8 | **observed** |
| An `icon` holding children is refused | case 8 | **observed** |
| A missing `name` / bad `size` refused before any DOM | case 8 | **observed** |

### Proving the checks

Every check carries its reddening mutation above. Three positive controls run **before** any green is
trusted:

1. **The DOM-stub NS control** (case 1). `domStubControl()` does not exercise `createElementNS`;
   without a control of its own, every `ns === SVGNS` assertion below could pass against a stub that
   dropped the namespace. Observed: the stub records `ns`, and a `createElement` node records `null`.
2. **The fail-closed control on the install.** `mv tooling/icons/node_modules …` then
   `node tooling/drift-check.mjs` must **throw naming the directory**. If it prints `✓`, the CI leg
   is decorative.
3. **Group 40 before and after.** Run `node tooling/build-checks.mjs` before Phase 2 and after Phase
   3; group 40 must be green both times. That is the evidence behind Task 18's corrected comments.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node --check agent-layer/gen-icons.mjs
node --check system/icons.mjs
node tooling/token-lint.mjs            # every components.css var() is a contract token
```

### Level 2: Unit Tests (the pure gate)

```bash
node tooling/build-checks.mjs          # expect: build ✓  all 41 groups pass
```

### Level 3: Integration Tests (the drift + pack chain)

```bash
node agent-layer/gen-icons.mjs --check        # icons ✓  6 icons — no drift
node agent-layer/gen-loc-summary.mjs --check  # loc summary ✓  3 groups — no drift
node import/regen-expected.mjs --check        # expected verdict ✓ … 54924 bytes …
node tooling/drift-check.mjs                  # the whole chain, incl. the new icons leg
```

### Level 4: Manual Validation

```bash
node tooling/visual-regression/serve.mjs &
curl -s localhost:<port>/system/icons.mjs | head -3   # confirm it is YOUR tree
node tooling/catalog-journey.mjs all
open http://localhost:<port>/components               # the four manual reads, Task 20
open http://localhost:<port>/approach                 # the file count reads 80
```

### Level 5: Additional Validation

```bash
cd tooling/icons && npm audit          # expect 0 advisories at every severity (observed)
```

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| (none) | — | — | — |

This ticket spends no tokens, needs no agent run, writes nothing presented as agent output, and needs
no credential. The one step that needs a machine rather than CI is the baseline regeneration (Docker
+ a clean worktree), and it blocks the PR.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1a** — a name in the manifest renders: group 41 case 4, over **every** manifest name.
- [ ] **AC #1b** — a name not in the manifest refuses visibly: case 5 — `data-refused`, the literal
      name as text, zero svg and zero path.
- [ ] **AC #1c** — `gen-icons --check` fails when `icons.mjs` is stale: mutate the manifest, watch
      `drift-check` go red, record the message.
- [ ] **AC #2** — the manifest holds the six Faster Payment's four screens need, **by their Phosphor
      names** (`arrow-left`, `caret-right`, `check`, `info`, `warning`, `x`); no full vendoring
      (case 3); no runtime library (no shipped page imports `tooling/icons/`).
- [ ] **AC #3a** — `gen-loc-summary` re-run; `approach` **×3** regenerated (not ×2).
- [ ] **AC #3b** — the **five** regenerators run in order (not four).
- [ ] **AC #3c** — `/components` **×3** regenerated.
- [ ] **AC #3d** — `catalog-journey all` green ×3 engines, plus the four manual reads.
- [ ] **AC #3e** — `verify` green with the new drift leg wired in: `drift-check` names `icons`, the
      workflow installs `tooling/icons`, the group count reads 41 in all four sites, the wrapper
      histogram reads 3/22 in all four sites.
- [ ] **AC #4 (standing rule, not in the ticket)** — `import/regen-expected.mjs` re-run, the diff
      read and matched against the measured one (+66/−0, 6 hunks, no verdict field changed); group
      40's prediction sites corrected.
- [ ] **AC #5** — no new contract token, no `param-manifest.json` entry, no `param-count`
      regeneration (the `/components` playground counts prop controls as one class, already listed).
- [ ] **AC #6** — the D1 follow-up issue is filed and referenced in the corrected comments.
- [ ] **AC #7** — the PR body carries `Closes #305`; the plan, the report and the review are in the
      same PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] `build-checks` 41/41, `drift-check` green, `token-lint` green
- [ ] `catalog-journey all` green ×3 engines; the four manual reads done by hand
- [ ] Six baselines regenerated from a clean detached worktree; `gh pr checks` green
- [ ] Every REDDENS mutation run and its failure message recorded in the report
- [ ] The three positive controls run before any green was trusted
- [ ] The D1 follow-up filed
- [ ] Acceptance criteria all met, or explicitly deferred with a tracker
- [ ] `.claude/reports/icon-primitive-gen-icons-305-report.md` written; **Not run** section filled

---

## OPEN QUESTIONS / ASSUMPTIONS

**No open questions.** Every fork this plan met is resolved in § DECISIONS TAKEN (D1–D6), each with
the measurement behind it. What remains are assumptions, each with what would falsify it:

| # | Assumption | Falsified by | If false |
| --- | --- | --- | --- |
| A1 | `@phosphor-icons/core` resolves to 2.1.1 with the observed layout and the one-path shape | `gen-icons` throwing on `viewBox`/path count | The throw names the file; pin the version exactly in `package.json` and record why |
| A2 | `npm audit` on the new tool dir stays at 0 advisories | `cd tooling/icons && npm audit` | A real blocker to raise with the owner, never a gate to soften — base carries no lockfile here, so the delta is the whole set |
| A3 | No other PR regenerates `/components` or `approach` baselines while this is open | `gh pr list --state open` | The ticket's own concurrency note. Verified clear 2026-09-22: `[]`, and #302/#303 both CLOSED |
| A4 | The `runtime` line total crosses 32,050 and the approach digit moves to 32,100 | `node agent-layer/gen-loc-summary.mjs` after staging | Nothing changes operationally — `runtime.files` moves 79 → 80 regardless, so the three approach baselines churn either way |
| A5 | `/components`' 30 s `shotTimeout` still fits at 25 components | the VR `visual` job timing out on the stable-generation pass | Raise `shotTimeout`, **never** the diff tolerance — `visual.spec.mjs:126-127` says so |

**One action carried out of this plan:** file the D1 follow-up issue before opening the PR, and
reference its number in Task 18's corrected comments.

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed in the plan

Two spikes and five probes. Everything below is a real run in a scratch tree; nothing in the repo was
touched.

**Probe 0 — the package.** `npm view @phosphor-icons/core version license` → `2.1.1`, `MIT`.
Installed: `assets/{bold,duotone,fill,light,regular,thin}`, **37 MB**, **1,512** SVGs in `regular`.
Surveyed all 1,512: **every one** is exactly one `<path>`, `viewBox="0 0 256 256"`,
`fill="currentColor"`, with **zero** `circle`/`rect`/`line`/`polyline`/`polygon`/`ellipse`/`g`.
→ The ticket's "Expected, not yet observed" line is now observed, and the generator's shape guard is
a measured rule rather than defensive padding.

**Probe 0b — the six names.** `back.svg`, `close.svg` and `chevron-right.svg` **do not exist**;
`arrow-left`, `x`, `caret-right`, `check`, `warning`, `info` all do. → The manifest table, and a
correction to AC #2's wording.

**Probe 1 — does `icon` cover the Chevron?** Synthesised an `icon` entry, ran the real `convert` +
`recognise` over `import/fixtures/spike-c-instance.blueprint.txt`. **No** — the Chevron stays
`{covered: false, name: null, via: "floor", candidates: []}`. → D1, and Task 18.

**Probe 1b — the IR.** The Chevron node carries `icon: {name: "caret-right"}` — one of this ticket's
six — and nothing in `recognise.mjs` reads it. → D1's recommendation is concrete, and its arithmetic
(0.25 + 0.25 = exactly `THRESHOLD`) is what makes "don't tune it here" the principled call.

**Probe 2 — the exact expected-verdict delta**, with `size` required as specified: **zero** verdict
changes; `icon` at **0.125** on six of nine nodes; none on the Avatar or the Chevron.

**Probe 3 — the diff, byte-exact.** Generated the "after" expected verdict in memory and diffed:
**+66 lines, −0, 6 hunks, 52,922 → 54,924 bytes.** Diffed the `covered`/`via`/`name` lines alone:
**identical.** → Task 11 states a diff an implementer can match rather than a shrug.

**Probe 4 — the arithmetic behind the baselines.** Read the exact unrounded loc counts off the git
index: runtime **79 files / 32,004 lines**, generators **21 / 2,895**. → The rounding boundary
(32,050) and the generators' jump (2,900 → 3,100) are now stated rather than hand-waved.

**Probe 5 — the CSS block's tokens.** Extracted every `var()` from the proposed block and compared
against `system/tokens.contract.css`: all nine declared. Also confirmed `components.css` currently
has **zero** non-contract `var()`s, which is what makes the no-private-custom-property rule load-bearing.

**Spike A — the generator, written and driven.** 173 lines, run end to end. Six icons emitted into a
19-line `icons.mjs`. Then every path: a clean `--check` (exit 0) · a dropped manifest name (exit 1,
drift message) · an absent `node_modules` (exit 1, names the directory and the fix) · `--add` on an
unknown name, a malformed name, a duplicate and a real new name. **One defect found and fixed in the
spike:** the first near-miss heuristic used substring matching and answered `--add chevron-right`
with *"did you mean t-shirt?"*. The committed version shares whole hyphen-separated words and was
re-measured. That defect is why the plan carries the source rather than a description of it.

**Spike A2 — the round trip.** The generator block was then **extracted back out of this plan's
markdown**, `node --check`'d (clean, 173 lines, all five exports present), written over the spike's
own copy, and re-run: `icons ✓  6 icons` · `icons ✓  6 icons — no drift` · the same 19-line output ·
the same `--add` refusal · and spike B's 30 assertions green against it. **The source in Task 3 is
the source that was run**, not a transcription of it.

**Spike B — the template, driven through the REAL stub.** Lifted `domStub`/`stubText`/`stubFindAll`
verbatim out of `tooling/build-checks.mjs:350-395`, imported the real `validateComposition`, and ran
group-41 cases **1, 2, 3, 4, 4b, 5, 6, 6b and 8**: **30 assertions, all passing** — the NS control, manifest↔map identity, the
subset count, all six names rendering with `d === ICONS[n]`, the refusal's text and its absent
svg/path, four prototype-chain names refusing, the mutation proving that case can fail, and five
`validateComposition` drives.

**Repo-shape risks checked and closed** (each was a real possibility, each is now a fact):
- `gen-handoff` copies **no** `system/*.mjs` but `wc/` — so the pack needs no `icons.mjs`.
- `build-instance` copies `system/` **wholesale** — so a built instance gets `icons.mjs` free.
- `catalog.mjs:441` renders `states` as **one text line**, not a specimen per state — so declaring
  `"refused"` is safe.
- `param-manifest.json:63` counts `/components` playground controls as **one class** — so
  `param-count` does not move.
- group 3's `deepPairs` skips a **leaf** child, so `stack > icon` is never walked.

**Baseline gates, on the tree this plan was written against:**
`node tooling/build-checks.mjs` → `build ✓  all 40 groups pass` ·
`node tooling/drift-check.mjs` → `drift-check ✓ …` ·
`node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`.

### Alternatives weighed and rejected

| Alternative | Why not |
| --- | --- |
| `--check` compares only the manifest ↔ map **name sets** (no package, no CI install) | Cannot see a moved `d`. A bump that silently changed a glyph would pass. The ticket's own Files-touched names a "CI workflow line" — the install is that line. **D5.** |
| Vendor the six SVGs into `system/icons/` and read them at build time | No generator, no `--add`, and the provenance (which package, weight, version) lives nowhere. G8 asks for the command. |
| Name the prop `glyph` to dodge `PROP_SOURCES.name` | Would leave the committed verdict byte-identical — genuinely cleaner for the importer. Not taken: the ticket says `name`, and a 0.125 candidate that never wins is noise, not a wrong answer. **D3.** |
| Add a `kind-fit` branch + a structural `icon.name` fill so the Chevron is covered | Sums to **exactly 0.5**, the threshold. A pair of weights landing precisely on the bar is fitted to a wanted answer — the one thing `recognise.mjs`'s header forbids. **D1.** |
| New `--size-icon-*` contract tokens | "No token work" in the per-ticket context, and `--spacing-*` already is the scale. **D2.** |
| A local `--ds-icon-size` custom property instead of three size rules | `token-lint` treats every `var()` in `components.css` as a contract reference; there are currently zero exceptions. Instant red build. |
| Unify `GLYPHS` with the new `ICONS` | Churns `/proto/verdant` and `/work` baselines for no ticket, and `GLYPHS` is Verdant chrome no composition can reach. |
| Emit the package version into `icons.mjs`'s header | Churns the artifact on every bump for no semantic change. The lockfile is where a version belongs. |

### Sequencing risk

The two highest-collision surfaces are `tooling/build-checks.mjs` (three separate edits: the new
group, the 3/22 pin, the corrected comments) and the VR baselines. The ticket's concurrency note
holds: **do not open this alongside another primitive PR or anything that regenerates `approach`.**
Verified clear 2026-09-22 — `gh pr list --state open` → `[]`, #302 and #303 both CLOSED, #304 merged
as `d512047`.

### Confidence

**10/10.** The three things that normally hold a plan below that are each closed by a measurement
rather than an argument: the generator is **written and run** through all nine of its paths, not
described; the render template and every gate case are **driven through the repo's own DOM stub and
validator**, with the mutation that proves the sharpest case can fail; and every derived number — the
expected-verdict diff (+66/−0/6 hunks), the loc counts (32,004 and 2,895 exact) and the token set —
is **read off the tree**, not estimated. The four stale ticket literals are corrected, the one
prediction the codebase makes about this ticket is falsified with evidence, and the five repo-shape
risks that could have surfaced mid-implementation are each checked and closed. What is left is
execution plus two machine-bound steps (the Docker baseline regen and a three-engine journey), whose
traps are written in — though whether `/components`' 30 s shot budget still fits at 25 components is a
timing fact about the pinned CI container that no local run settles (A5), so that one is flagged
rather than retired. Three of group 41's twelve cases are specified and undriven, and Task 15 says
which.

## AMENDMENTS

<!-- newest at the bottom; leave empty at creation -->

### 2026-09-22 — implementation (PIV run)

Six plan errors and one clarification, each found by driving something the plan asserted.

**A1 (plan error, omission) — the renderer's OWN template count.** `system/agentic-renderer.mjs:21`
("The twenty-four templates") and `:256` ("the twenty-four specs"). The plan lists neither, and
`git log -S` shows #303 (`d04faac`) is the commit that moved them to twenty-four — so the convention
is established and #305 owed both. No gate reads them (`checkGroupCount` reads build-checks,
CLAUDE.md and gates.md, not the renderer), so this would have stayed green and landed as a reviewer
finding. It is D6's own argument applied one file over. **Both moved to twenty-five.**

**A2 (plan error, undercount) — the wrapper histogram has FIVE copies, not four.** Task 16 names
`build-checks.mjs:5039`, gates.md ×2 and `catalog.mjs`. It misses `tooling/build-checks.mjs:94`, the
file's own group index ("tabsFor's 3/21 wrapper histogram pinned as the #220 tripwire"), and the
current-state tail of the tripwire note at `:5024`. Both moved. The earlier arrows in that note
(`3/7 → 3/17`, `3/17 → 3/18`, `3/18 → 3/20`, `3/20 → 3/21`) are HISTORY and stay as written; #305
appends its own. (Memory: *gate prose has three copies* — here it was five.)

**A3 (plan error, a real blocker the plan could not have predicted) — the 41st group makes
`drift-check` red on the committed tree, for a reason nothing in Task 17 covers.**
`checkGroupCount`'s claim regex for build-checks is `/all (\d+) groups pass/g`, and group 40's own
prose contains "a build() broken on every list verdict left all 40 groups passing" — which that
regex matches. With 40 groups both readings agreed and the leg was green; at 41 it reported
`tooling/build-checks.mjs: says 40 groups, build-checks defines 41` on a clean tree. Fixed by
REWORDING the prose ("left every other group passing"), not by touching the regex: the sentence was
never a claim about how many groups exist, and stating a count there made it a silent second copy of
the gate's own claim. The mirror of that sentence in `gates.md` was reworded in the same edit.
(`passed all 40 groups before this`, in both files, does NOT match the regex, is unambiguously past
tense, and is left alone.)

**A4 (plan error) — Task 15's REDDENS claim "cases 4–6 fail" is wrong as written: the group CRASHES
instead.** Measured by deleting the `icon` template. Three seams throw, and an uncaught throw ends
the whole run with a stack trace before group 41 reports anything at all — so the mutation that is
supposed to prove cases 4–6 can fail actually proves nothing. Each was a real crash, found in this
order: `renderComposition` (the named "no template for it" Error), then `renderChild` inside 41.8's
`stack > icon` case (a raw `TypeError: TEMPLATES[child.name] is not a function`, because
`renderChild` at `agentic-renderer.mjs:166` has NO `hasTemplate` guard where `build()` does), then
`genIcons` in 41.7 (found separately, by flipping the manifest weight — Phosphor's bold assets are
`<name>-bold.svg`, so the generator cannot answer). All three now fold into ONE named failure, on
group 39's stated rule that a deletion must report rather than end the run. With the fix, deleting
the template reds group 3 by name AND group 41 with 62 named failures, and the run completes.

**A5 (clarification, not a plan error) — `example` is not in `vocabulary.json`.** Case 4b has to
read `handoff/verdant/pack.json`: `gen-vocabulary` drops `example` from its entries entirely (the
icon entry's keys are class/status/props/states/children/usage/contract), and `system/catalog.mjs`
seeds the playground from the PREPARED PACK ROW. The plan's citation of `catalog.mjs:310-320` is
correct about the mechanism and silent about the artifact; reading the vocabulary handed
`renderComposition` an undefined props object and the case threw. The plan would be clearer saying
"read it off the pack".

**A6 (plan error) — Task 7's CSS block and the spec's States prose both state a false mechanism.**
Both say the `<path>` carries `fill="currentColor"` from the package. It does not: `pathOf` returns
the `d` attribute and nothing else, `system/icons.mjs` contains the string "fill" zero times, and
the template sets `fill="currentColor"` on the `<svg>` itself
(`agentic-renderer.mjs:529`) — the colour then reaches the glyph by inheritance. The package's own
file does carry it, on its root `<svg>`, which is presumably where the sentence came from. Corrected
in both places, and the corrected fact is now asserted in `catalog-journey` case 13. Found by a
probe, which is the only reason it is not still written down.

**Assumptions, resolved:** A4 (the rounding boundary) **held** — runtime went 32,004 → 32,109 exact,
so the rounded digit moved 32,000 → 32,100 and all three approach baselines churned on the line
figure as well as on `runtime.files`. A5 (the 30 s shot budget at 25 components) **held** — in the
pinned container `/components` took 18.2 s, 20.6 s and 13.8 s across the three packs. A2 (`npm
audit`) **held** — 0 at every severity. A3 (no concurrent PR) **held** — `gh pr list --state open`
→ `[]` at the start and at the baseline regen.

**One addition beyond the plan, and its reason:** `tooling/catalog-journey.mjs` case 13. Group 41's
`detail` string says it cannot reach the computed sizes or the refusal's frame winning at runtime,
**and names this driver for both** — but `catalog-journey` had no such case, so the deferral pointed
at a gate that checked nothing, which is the check-that-cannot-fail shape one level up. #303 set the
precedent one ticket earlier with its own case 12 (a list's divider ownership in computed style), and
gates.md already lists it there.
