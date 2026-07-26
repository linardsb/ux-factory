# Feature: import a design's scale, not just its colour — and let a reader see it

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

`tooling/figma/figma-pull.mjs` turns a Figma file into `system/tokens.<slug>.css`, a pack the shell
re-skins from by swapping one `<head>` line. Today every one of its 16 `ROLES` is a colour, so an
imported pack is **the design's colour on this repo's scale** — its `spacing-md` is `16px` because
that is *this repo's* default, not because the design said so (handover §B gap G2).

This feature adds four non-colour families to the importer — **spacing, radius, the type ramp and
shadows** — sourced from a plugin export's number variables / dimension tokens and effect styles,
mapped by ordered rank rather than by name, gated so a design that can't fill a family leaves it
auto-filled and *says so in the pack header*. It also finishes the visible half: `tokens.plusui.css`
is committed and renders correctly but isn't selectable in the appearance dock, so no reader can
ever see an imported design. One radio row fixes that.

It ships on top of the already-written G1 work (arbitrary colour naming) that sits unmerged on this
branch, so one PR closes the whole "port any design into the portfolio" arc.

## User Story

As a **hiring manager reading this portfolio**
I want to **switch the whole site onto a design system that was imported from someone else's Figma
file, and see honestly what did and didn't come across**
So that **I can verify the token contract really is brand-agnostic — not take the claim on trust**

And, underneath it:

As the **operator importing a design**
I want **one command to bring across a design's scale, radius, type and shadows as well as its
colour**
So that **an imported pack is the design's system, not just its palette on my defaults**

## Problem Statement

Two problems, one arc:

1. **An imported pack overclaims by omission.** `gen-pack-css` auto-fills the ~48 contract tokens
   the importer doesn't set, from *this repo's* contract defaults. The pack header currently says
   nothing about which families are the design's and which are this repo's. A reader (or a future
   operator) sees `--spacing-md: 16px` in `tokens.plusui.css` and has no way to know Plus UI never
   said that. That is exactly the kind of quiet overclaim the honesty contract exists to prevent.
2. **The proof is invisible.** `system/tokens.plusui.css` is committed, valid, WCAG-checked — and
   unreachable. `system/dock.mjs`'s `PACKS` lists `neutral | saulera | verdant` only, and
   `system/pack-boot.js`'s hard allowlist matches the same three. A capability nobody can see is
   not evidence of anything.

## Solution Statement

**Scale import.** Add a `SCALE_ROLES` table beside `ROLES`, one entry per contract token in the four
families, each naming its family and its rank within that family. Classify every `dimension` /
`shadow` entry the read returns into a family by name keyword (type ramp tested first — see
Gotchas), sort each family's imported values, and fill the family's slots **by rank** when the
design offers at least as many values as the family has slots. Otherwise the family stays
auto-filled. Everything imported, dropped, and auto-filled is named in the pack header.

**Explicit override.** `--map` (built by the G1 work for colours) is extended to any contract token,
so `{ "spacing-md": "Spacing/4", "shadow-lg": "Elevation/High" }` pins a value the inference gets
wrong. Explicit always beats inference — the rule the colour path already follows.

**Dock.** Add `plusui` to `PACKS`, `PACK_RE` and `pack-boot.js`'s allowlist, labelled as imported
third-party design work. `neutral` stays the markup default, so `pack-boot.js` remains a guaranteed
no-op on a fresh visit — the property the VR harness depends on.

## Out of Scope / Non-Goals

- **Not included: fonts (gap G3).** Dropped by decision this session. `font-display/body/mono` stay
  auto-filled and reported. A Figma export gives a font *name*, not a file; shipping a face is a
  licence-bound step. G3 stays open and documented as open.
- **Not included: components (gap G4).** Figma returns fills and coordinates, not a Button's hover
  state or focus ring. Components stay token-only and wear the imported values. **Not a gap.**
- **Not included: the parity artifact.** `portability.figma.parity` stays `null` on purpose
  (handover §A) — it needs a Figma file seeded from this repo's own DTCG, which needs a human.
- **Not included: extending the REST read side.** Measured this session: the cached Plus UI REST
  read returns 258 entries, 244 colours and 14 named-but-**valueless** text/effect styles
  (`Box Shadow/shadow-lg` → `value: null`), because `collectStyleFills` only reads *fills*. Scales
  therefore import from `--from <export.json>` only. On a REST read the run reports that the file
  offered no scale values — it does not fake them.
- **Not included: the portal drop-UI.** `.claude/plans/figma-drop-portal-ui.md` is a separate
  deliverable that sits on top of this one. This plan only owes it a structured return value.
- **Not included: re-importing `tokens.plusui.css`.** It must come out **byte-identical** — that is
  this plan's regression test, and its cached read carries no scale values anyway (measured above).
- **Not changing:** `tokens.contract.css` / `tokens.neutral.css` (generated from
  `tokens.source.json`, drift-checked), the colour role table, `pickRamps`/`negotiate`/`checkPairs`,
  or any committed VR baseline.

## Feature Metadata

**Feature Type**: Enhancement (extends an existing build-time tool) + a small New Capability (dock row)
**Estimated Complexity**: Medium
**Primary Systems Affected**: `tooling/figma/` (importer), `system/dock.mjs` + `system/pack-boot.js`
(the pack switcher), `docs/figma-runbook.md` + `system/figma-import.md` (+ the generated handoff pack)
**Dependencies**: none new. Zero-dep Node ESM, as the rest of the factory tooling.

## Related Work

**Implements**: `.claude/plans/figma-any-design-handover.md` §C prompts 2 and 3 (prompt 1 already
implemented on this branch) · **Epic**: none — this arc was never ticketed (see Open Questions).

**Back-references**:

- `.claude/plans/figma-any-design-handover.md` — Why: §A holds owner decisions and *measured* facts
  that must not be reopened (Enterprise gate, rate budget, refuse-rather-than-guess). **Read §A
  before starting.**
- `.claude/plans/figma-token-import-handover.md` — Why: the predecessor thread. One claim in it is
  wrong (a `FIGMA_TOKEN` leak); the owner confirmed no rotation is pending.
- Commits `35c2c6c`, `d4b1a60` on this branch — Why: the G1 engine (`deriveRamps`, `readMap`,
  `nearestRung`) this work extends. They are the first two commits of the same PR.

**Forward-references**:

- `.claude/plans/figma-drop-portal-ui.md` — the portal drop zone. Consumes `runPull()`'s return
  value; §3 of that plan asserts no core extraction is needed. Task 12 here keeps that true.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

Paths are relative to the repo root **in the `ux-factory-wt-figma` worktree** (see Working Rules).

- `tooling/figma/figma-pull.mjs` (whole file, ~400 lines) — Why: the file you are extending. Read
  the header comment first; it is the governing doc for the tool's honesty rules. Key landmarks:
  `ROLES` (L53), `toRamps` (L77), `deriveRamps` (L103), `readMap` (L136), `nearestRung` (L160),
  `pickRamps` (L~180), `negotiate` (L~205), `runPull` (L~232), the `label` header builder
  (L~330–380), the stdout report (L~385–400).
- `tooling/figma/figma-read.mjs` L125–194 — Why: `entriesFromVariables`, `leafEntry`,
  `entriesFromExport`, `entriesFromStyles`. This is where a value gets its `type`. **Measured
  behaviour you must not re-derive:**
  - DTCG `{"$value":"4px","$type":"dimension"}` → `{name, type:"dimension", value: 4}` (a **number**)
  - DTCG shadow `{"$value":{color,offsetX,offsetY,blur,spread},"$type":"shadow"}` → one entry,
    `type:"shadow"`, `value:` the **object**
  - Figma number variables (`resolvedType:"FLOAT"`) → `{type:"dimension", value: <number>}`
  - Tokens Studio `{value:{x,y,blur,spread,color,type},type:"boxShadow"}` → **shattered** into
    `shadow/md/value/x`, `/y`, `/blur`, `/spread`, `/color`, `/type` leaf entries (Task 6 reassembles)
  - `Array.isArray(node) → return` (L177): font stacks never become entries
- `agent-layer/gen-pack-css.mjs` L60–130 — Why: `isUsableValue` accepts **a non-empty string or an
  array of strings — never a number**. Every imported dimension must be formatted to `"16px"` before
  it reaches `genPackCss`, or the run throws `unusable value 16`. Also: an unknown token name throws
  (the name whitelist is `tokens.source.json`'s contract group), and `filled` (the auto-fill list)
  comes back on the return — that is what the header must report.
- `system/tokens.source.json` contract group — Why: the exact slot names and defaults. Verified this
  session:
  - spacing (8): `spacing-xs 4px · sm 8px · md 16px · lg 24px · xl 32px · 2xl 48px · 3xl 64px · 4xl 96px`
  - radius (3): `radius-sm 4px · md 8px · lg 16px`
  - shadows (3): `shadow-sm "0 1px 2px rgba(0,0,0,0.06)" · md "0 4px 6px rgba(0,0,0,0.08)" ·
    lg "0 10px 15px rgba(0,0,0,0.10)"`
  - type ramp (8): `type-display clamp(40px,6vw,76px) · h1 clamp(32px,4vw,56px) ·
    h2 clamp(24px,2.5vw,34px) · h3 20px · lead clamp(18px,1.5vw,22px) · body 16px · caption 13px ·
    eyebrow 12px` — **four are clamps, four are plain px**
- `system/dock.mjs` L28–34 (`PACKS`, `PACK_IDS`, `PACK_RE`), L134–155 (`renderPacks`), L168–200
  (`selectPack` — the three inline-vs-committed rules) — Why: prompt 3's touch points. Rule 2 in
  `selectPack` explains why "your brand" rides the neutral base; do not disturb it.
- `system/pack-boot.js` (39 lines, whole file) — Why: the second, deliberately duplicated allowlist.
  Read its header: the default no-op is **VR-critical**.
- `system/portfolio.css` L898–920 — Why: `.dock-panel { display: none }`, `.is-open` is the only
  thing that paints it. This is the evidence that prompt 3 churns no baselines.
- `tooling/visual-regression/visual.spec.mjs` L14–60 — Why: 10 pages × 2 packs; every `page.goto` is
  hashless, and `dock.mjs:329` opens the panel only on `location.hash === "#appearance"`. Hence
  zero expected churn.
- `docs/figma-runbook.md` L118–136 ("What a design needs, and what actually comes across") — Why:
  the section that currently says colour is all that comes across. It must stop being true *before*
  you change that text.
- `system/figma-import.md` — Why: ships **inside the handoff pack**. Editing it without
  regenerating turns CI's `verify` job red (blocking, gates main).

### New Files to Create

- `tooling/figma/fixtures/scales-dtcg.json` — synthetic DTCG export: a full 8-value spacing group,
  3 radii, 8 type sizes, 3 DTCG shadow objects, plus a colour ramp so the run can complete.
- `tooling/figma/fixtures/scales-partial.json` — a design that offers 5 spacing values and 12 type
  sizes: proves the under-count family auto-fills and the over-count family drops-and-reports.
- `tooling/figma/fixtures/scales-tokens-studio.json` — Tokens Studio `boxShadow` shape, for the
  reassembly path.
- `tooling/figma/maps/fixture-scales.json` — a `--map` pinning a spacing slot and a shadow, proving
  explicit beats inference across token types.
- `tooling/figma/maps/fixture-missing.json` — `{ "spacing-md": "Nope/Missing" }`, proving a map entry
  naming a style the file doesn't publish throws instead of falling back.

Fixtures are committed on purpose: `gen-loc-summary`'s three groups are `system/*.{css,mjs,js}`,
root/`proto/*.html`, `agent-layer/*.mjs` — **`tooling/` is in none of them**, so committed fixtures
change no counted number and churn no baseline. They make the verification repeatable by a reader,
which is the repo's whole disposition.

### Relevant Documentation

- Handover: `.claude/plans/figma-any-design-handover.md` §A (do-not-reopen) and §B (the gap map).
- [DTCG format — dimension & shadow types](https://tr.designtokens.org/format/#dimension)
  - Sections: `dimension`, `shadow` composite type
  - Why: the `$value` shapes `entriesFromExport` already parses; the shadow object's member names
    (`color, offsetX, offsetY, blur, spread`) are what Task 6 composes CSS from.
- [Figma REST — local variables](https://www.figma.com/developers/api#variables)
  - Section: "Get local variables" — required plan **Enterprise**
  - Why: the measured wall behind `--from`. **Do not propose a paid plan as a fix** (handover §A).
- [MDN — `clamp()`](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp)
  - Why: Task 5 preserves the contract's clamp shape while swapping the imported max.
- `.claude/references/token-system.md` — the token mechanic, if a contract question comes up.

### Patterns to Follow

**A role table, not a chain of ifs.** The colour path declares intent as data and iterates:

```js
// tooling/figma/figma-pull.mjs:53
const ROLES = [
  { token: "color-fg", ramp: "neutral", step: 900 },
  { token: "color-accent", ramp: "accent", step: 600 },
  …
];
```

Mirror it exactly — `SCALE_ROLES` is a flat array of `{ token, family, rank }`, and the importer
loops it. No per-family bespoke code paths.

**Refuse, or ship and say so — never guess.** Both shapes exist in the file and both are correct in
their place:

```js
// refuse (figma-pull.mjs:~190) — ambiguity the tool must not resolve alone
throw new Error(`figma-pull: ${candidates.length} ramps could be the brand colour, … --accent <hue>.`);

// ship and say so (figma-pull.mjs:~355) — a shortfall the pack can carry honestly
`\n * STILL FAILING (no value the design offers satisfies these — the pack ships saying so): …`
```

A family that can't be filled is the **second** shape: auto-fill, name it in the header, carry on.

**Every emitted value names its source.** `placed[]` carries a human `source` string per token and
the report prints it:

```js
placed.push({ token: role.token, ramp: hue, step, source: rungSource(hue, step, role.step) });
console.log(`${p.token.padEnd(28)} ${String(values[p.token]).padEnd(9)} ← ${p.source}`);
```

Scale roles push into the same `placed[]` with the same field, so the existing report renders them
with no change to the printer.

**Errors:** plain `Error`s whose message names the offending path/token (`agent-layer/lib.mjs`
convention). No taxonomy, no wrapping.

**Header comments:** entry-point files open with a header citing their governing doc. You are
*editing* one — extend its prose to cover scales; do not bolt a second header on.

---

## IMPLEMENTATION PLAN

### Phase 0: Get the branch honest before adding to it

`feature/figma-any-naming` is **9 commits behind `origin/main`** (verified: `git rev-list --count
feature/figma-any-naming..origin/main` → 9). The owner merges fast and this thread has already
orphaned commits three times. Merge first, re-verify the baseline, then build.

**Tasks:** merge `origin/main`; re-run the three baseline checks; confirm the plusui regeneration is
still byte-identical.

### Phase 1: The scale foundation

**Depends on:** Phase 0.

**Tasks:** the `SCALE_ROLES` table, the family classifier, the fixtures.

### Phase 2: Core — import the four families

**Depends on:** Phase 1.

**Tasks:** rank-fill with the `≥ N` gate, CSS value formatting per family (including clamp
preservation and shadow composition), Tokens Studio shadow reassembly, `--map` for any token type.

### Phase 3: Report honestly

**Depends on:** Phase 2.

**Tasks:** the pack-header lines (imported per family · dropped · auto-filled · unclassified), and
the structured return the portal plan will consume.

### Phase 4: Make it visible (prompt 3)

**Independent of:** Phases 1–3 — it touches only `system/dock.mjs` and `system/pack-boot.js` and
depends on nothing the importer does. It is in the same PR by decision, not by dependency; if
Phase 2 stalls, Phase 4 can still ship.

**Tasks:** the fourth pack row, the second allowlist, the attribution copy.

### Phase 5: Docs, regeneration, validation

**Depends on:** Phases 2 and 4 (the docs must describe what became true).

**Tasks:** runbook + `system/figma-import.md`, regenerate the handoff pack and bundle, run every
gate, open the PR, read CI.

---

## STEP-BY-STEP TASKS

Execute in order. Every task is atomic and independently testable.

All commands run from the repo root of **`/Users/Berzins/Desktop/Linards_current/ux-factory-wt-figma`**.
That is a hard precondition, verified: `readFigma` resolves `--from` with
`resolve(process.cwd(), from)` (`figma-read.mjs:284`), so a repo-relative fixture path only works
from the repo root.

`SCRATCH` below means the session scratchpad — export it once:
`export SCRATCH=/private/tmp/claude-501/-Users-Berzins-Desktop-Linards-current-ux-factory/<session>/scratchpad`
(any writable dir outside the repo works).

### 1. UPDATE the branch — merge `origin/main`

- **IMPLEMENT**: `git fetch origin && git merge origin/main`. Resolve any generated-file conflict
  (`system/loc-summary.json`, `handoff/**`) **by regeneration, never by hand-editing**.
- **GOTCHA**: `drift-check` run *mid-merge* reports false drift — it compares staged-vs-HEAD. If
  `git diff --quiet` is clean, complete the merge and re-run on the clean tree.
- **VALIDATE**: `git rev-list --count feature/figma-any-naming..origin/main` → `0`
- **SATISFIES**: AC #12

### 2. VERIFY the baseline — the regression test must pass before you change anything

- **IMPLEMENT**: nothing. Run the checks and record the output.
- **PATTERN**: this exact command is the committed regeneration line in `tokens.plusui.css`'s header.
- **GOTCHA**: `--offline` spends **zero** Figma requests and replays `tooling/figma/.raw/` — which
  exists **only in this worktree** (gitignored). Never run without `--offline`/`--from`; budget is
  ~6 reads/month, 3 spent 2026-07-25.
- **VALIDATE**:
  ```bash
  node tooling/figma/figma-pull.mjs --slug plusui --neutral gray --accent indigo --page Color --offline \
    && git diff --quiet system/tokens.plusui.css && echo "BYTE-IDENTICAL ✓"
  node tooling/drift-check.mjs && node tooling/token-lint.mjs
  ```
  (All three were verified green on the pre-merge branch head this session — a failure here means
  the merge broke something, not that the plan is wrong.)
- **SATISFIES**: AC #7, #12

### 3. CREATE the fixtures

- **IMPLEMENT**: the four files listed under *New Files to Create*. Each export must also carry a
  usable colour ramp (≥5 rungs, one near-grey + one saturated) so `runPull` can complete — a scale
  fixture with no colours hits the `none of the N styles read is a colour` throw first.
  - `scales-dtcg.json`: `spacing/{1..8}` (4,8,16,24,32,48,64,96 px), `radius/{sm,md,lg}`,
    `text/{...}` 8 sizes (12,13,16,18,20,24,32,40), `shadow/{sm,md,lg}` as DTCG `$type:"shadow"`
    objects.
  - `scales-partial.json`: 5 spacing values, 12 `text/*` sizes, no radii, no shadows.
  - `scales-tokens-studio.json`: the `{value:{x,y,blur,spread,color,type},type:"boxShadow"}` shape.
  - `maps/fixture-scales.json`: `{ "spacing-md": "Spacing/4", "shadow-lg": "Elevation/High" }`.
- **PATTERN**: shape them like the DTCG the repo already emits — `node agent-layer/gen-tokens.mjs`'s
  output is the reference for `$value`/`$type` nesting.
- **VALIDATE**:
  ```bash
  node -e 'import("./tooling/figma/figma-read.mjs").then(async m=>{const r=await m.readFigma({from:"tooling/figma/fixtures/scales-dtcg.json"});const t={};for(const e of r.entries)t[e.type??"null"]=(t[e.type??"null"]||0)+1;console.log(t)})'
  ```
  → must show `dimension: 19`, `shadow: 3`, `color: ≥10`.
- **SATISFIES**: AC #9

### 3b. ADD an optional destination to `runPull` — so a fixture run never writes into `system/`

- **IMPLEMENT**: `runPull({ …, out = null })` → `const dest = out ? resolve(process.cwd(), out) :
  \`${ROOT}/system/tokens.${slug}.css\`;` plus an `--out <path>` flag in the CLI arg block. Default
  behaviour is unchanged.
- **GOTCHA**: `gen-loc-summary`'s runtime group is `/^system\/(wc\/)?[^/]+\.(css|mjs|js)$/` over
  **git-tracked** files. An untracked `system/tokens.fixt.css` is invisible to it — but one
  `git add -A` turns every fixture run into a counted file and a red `verify`. `--out` removes the
  failure mode rather than policing it. **Also: stage by explicit path, never `git add -A`** — this
  worktree is shared with parallel sessions.
- **VALIDATE**:
  ```bash
  node tooling/figma/figma-pull.mjs --slug chk --from tooling/figma/fixtures/scales-dtcg.json --out "$SCRATCH/chk.css"
  test -f "$SCRATCH/chk.css" && test ! -f system/tokens.chk.css && echo "--out honoured ✓"
  ```
- **SATISFIES**: AC #9, #12

### 4. ADD `SCALE_ROLES` + the family classifier to `tooling/figma/figma-pull.mjs`

- **IMPLEMENT**: beside `ROLES` (L53), a flat table and an exported classifier.

  ```js
  // Rank is the family's OWN slot order, not a global "smallest first": spacing/radius/shadows
  // run small → large, the type ramp runs large → small (its first slot is a display size).
  // Rank 1 therefore takes the smallest imported spacing and the LARGEST imported type size.
  const SCALE_ROLES = [
    { token: "spacing-xs", family: "spacing", rank: 1 }, … { token: "spacing-4xl", family: "spacing", rank: 8 },
    { token: "radius-sm",  family: "radius",  rank: 1 }, … { token: "radius-lg",  family: "radius",  rank: 3 },
    { token: "type-display", family: "type",  rank: 1 }, … { token: "type-eyebrow", family: "type", rank: 8 },
    { token: "shadow-sm",  family: "shadow",  rank: 1 }, … { token: "shadow-lg",  family: "shadow",  rank: 3 },
  ];
  const FAMILY_ORDER = { spacing: "asc", radius: "asc", shadow: "asc", type: "desc" };
  ```

  Type ramp slot order, exactly: `type-display, type-h1, type-h2, type-lead, type-h3, type-body,
  type-caption, type-eyebrow` — that is the contract's own **descending size** order (h3 20px sits
  below lead's 22px max), verified against `tokens.source.json`.

  ```js
  // Which family a dimension belongs to. TYPE IS TESTED FIRST on purpose: the Plus UI file names
  // its text styles "Regular/size 5", so a "size" keyword under spacing would swallow font sizes.
  const FAMILY_KEYWORDS = [
    { family: "type",    re: /(^|[\/\s_-])(text|font|type|typography|heading|body)/i },
    { family: "radius",  re: /(^|[\/\s_-])(radius|corner|rounded|round)/i },
    { family: "shadow",  re: /(^|[\/\s_-])(shadow|elevation|depth)/i },
    { family: "spacing", re: /(^|[\/\s_-])(spacing|space|gap|inset|padding|margin)/i },
  ];
  export function classifyDimension(name) { … }   // → family | null
  ```

- **GOTCHA**: bare `size` is deliberately **not** a spacing keyword (see above). An entry matching
  nothing returns `null` and lands in the header's *unclassified* line — never silently dropped.
- **VALIDATE**:
  ```bash
  node -e 'import("./tooling/figma/figma-pull.mjs").then(({classifyDimension:c})=>{
    const cases={"spacing/4":"spacing","Spacing/md":"spacing","radius/lg":"radius","Corner/Small":"radius",
    "text/base":"type","Regular/size 5":null,"Semi Bold/text-2xl":"type","shadow/md":"shadow","Elevation/High":"shadow","opacity/50":null};
    for(const [k,v] of Object.entries(cases)){const got=c(k)??null; console.log(got===v?"✓":"✗", k, got);} })'
  ```
  Every line must be `✓`. (`Regular/size 5` → `null` is correct: it matches no keyword once bare
  `size` is excluded, and the fixture names its type sizes `text/*`.)
  **Coupled to Open Question #2** — if the owner puts `size` back (under *type*, never spacing),
  this assertion flips to `"Regular/size 5": "type"`. Change both together or the case lies.
- **SATISFIES**: AC #1, #6

### 5. ADD the rank-fill + CSS formatting for spacing, radius and the type ramp

- **IMPLEMENT**: a function that takes the classified entries and returns
  `{ values, placed, report }` for the dimension families.
  - Gate: a family fills **only if `imported.length >= slots.length`**. Fewer → the family is
    skipped entirely (every slot auto-fills) and recorded as `short`.
  - More → sort by `FAMILY_ORDER[family]`, take the first N, record the rest as `dropped`.
  - Dedupe identical values before counting (a design that publishes `4px` twice offers one value).
  - **Formatting — `isUsableValue` rejects numbers.** Every value becomes a string:
    - spacing / radius: `` `${n}px` ``
    - type ramp, plain-px slots (`type-h3, type-body, type-caption, type-eyebrow`): `` `${n}px` ``
    - type ramp, clamp slots (`type-display, type-h1, type-h2, type-lead`): **keep the contract's
      clamp shape and swap the max**, scaling the min by the same ratio:
      ```js
      // contract: clamp(32px, 4vw, 56px); imported max 64px → ratio 64/56 → min 36.57…
      // emit:     clamp(37px, 4vw, 64px)   (Math.round on the min, vw term untouched verbatim)
      ```
      `Math.round` is not cosmetic: a committed pack carrying `clamp(36.571428571px, …)` is what a
      reviewer flags, and the fractional px buys nothing.
      Read the contract default with the existing `loadContract` path in `gen-pack-css` — do **not**
      hardcode the four clamps in the importer. Parse with
      `/^clamp\(\s*([\d.]+)px\s*,\s*([^,]+),\s*([\d.]+)px\s*\)$/`; if a default doesn't match that
      shape, emit plain px and say so in the header rather than throwing.
- **GOTCHA**: the vw term stays the contract's — the *responsive behaviour* is this repo's, the
  *number* is the design's, and the header must say exactly that.
- **VALIDATE**:
  ```bash
  node tooling/figma/figma-pull.mjs --slug fixt --from tooling/figma/fixtures/scales-dtcg.json --out "$SCRATCH/fixt.css"
  grep -E "spacing-(xs|4xl)|radius-lg|type-(display|body|eyebrow)" "$SCRATCH/fixt.css"
  ```
  Expect `--spacing-xs: 4px`, `--spacing-4xl: 96px`, `--radius-lg: 16px`, `--type-body: 16px`,
  `--type-display: clamp(…, 6vw, 40px)`, `--type-eyebrow: 12px`.
  Then the rank-direction proof, which is the one that catches an inverted ramp:
  ```bash
  node tooling/figma/figma-pull.mjs --slug fixt2 --from tooling/figma/fixtures/scales-partial.json --out "$SCRATCH/fixt2.css"
  # 12 type sizes ≥ 8 slots → type imports; 5 spacing values < 8 slots → spacing auto-fills
  grep -E "type-display|type-eyebrow|spacing-md" "$SCRATCH/fixt2.css"
  ```
  `type-display` **must** carry the LARGEST imported size; `type-eyebrow` carried the 8th-largest
  until the 2026-07-26 amendment (see AMENDMENTS) — under the even-spread rule an over-offered
  type family gives it the SMALLEST imported size (scales-partial: `10px`);
  `spacing-md` must still be the contract default `16px`.
- **SATISFIES**: AC #1, #2, #3

### 6. ADD shadow import — DTCG objects and Tokens Studio reassembly

- **IMPLEMENT**:
  - DTCG: `{color, offsetX, offsetY, blur, spread}` → `` `${x} ${y} ${blur}${spread?` ${spread}`:""} ${color}` ``,
    normalising bare numbers to `px`. An 8-digit hex (`#00000014`) is a legal CSS colour — pass it
    through; do not convert to `rgba()`.
  - Tokens Studio: detect sibling leaf entries matching
    `^(?<base>.+)\/value\/(x|y|blur|spread|color|type)$`, group by `base`, and compose the same
    string. A group missing `color` or `blur` is skipped and named as unclassified — never
    half-composed.
  - Rank by *visual weight*: sort ascending by `blur + spread` (ties broken by `|y|`), so rank 1 is
    the subtlest.
- **GOTCHA**: `entriesFromExport` never emits arrays (L177), so a multi-layer shadow arrives as
  either an object (DTCG, first layer only) or shattered leaves. Multi-layer shadows are out of
  scope: import the first layer and name the truncation in the header.
- **VALIDATE**:
  ```bash
  node tooling/figma/figma-pull.mjs --slug fixt3 --from tooling/figma/fixtures/scales-tokens-studio.json --out "$SCRATCH/fixt3.css"
  grep -E "shadow-(sm|md|lg)" "$SCRATCH/fixt3.css"   # three composed CSS shadows, none a default
  ```
- **SATISFIES**: AC #4

### 7. UPDATE `readMap` — pin any contract token, not only colours

- **IMPLEMENT**: extend `readMap` so a map entry may name a **dimension or shadow** style as well as
  a colour. Look the name up across all entries (not just the colour filter), format by the target
  token's family, and pin it. A pinned slot **bypasses the family count gate** and is never
  reordered. Keep the two existing throws (no match / ambiguous match) verbatim in shape.
- **PATTERN**: `readMap` (figma-pull.mjs:136) — its last-segment fallback and its refuse-on-ambiguity
  rule apply unchanged.
- **GOTCHA**: a map may pin a slot in a family that is otherwise short; that is the point. The
  family's *other* slots still auto-fill and are still reported.
- **VALIDATE**:
  ```bash
  node tooling/figma/figma-pull.mjs --slug fixt4 --from tooling/figma/fixtures/scales-partial.json \
    --map tooling/figma/maps/fixture-scales.json --out "$SCRATCH/fixt4.css"
  grep -E "spacing-md|shadow-lg" "$SCRATCH/fixt4.css"   # both the pinned values, not defaults

  # the refusal path — a committed map naming a style the file doesn't publish
  node tooling/figma/figma-pull.mjs --slug fixt4b --from tooling/figma/fixtures/scales-dtcg.json \
    --map tooling/figma/maps/fixture-missing.json --out "$SCRATCH/fixt4b.css"; echo "exit=$?"
  ```
  The second run **must exit non-zero** with a message naming `spacing-md`, the missing style, and
  what the file does publish — and must **not** write `$SCRATCH/fixt4b.css`. Assert against the
  message your extended `readMap` actually emits (the colour path's wording may no longer apply to a
  dimension token); no process substitution — `readMap` does `readFileSync(resolve(cwd, path))` and
  a `/dev/fd/*` path is not reliable here.
- **SATISFIES**: AC #5

### 8. UPDATE the pack header — say what came from the design and what didn't

- **IMPLEMENT**: extend the `label` template (figma-pull.mjs:~330) with lines that only appear when
  they have something to say, in the file's existing ` * ` style:
  ```
   * Scale imported from this file: spacing (8 of 8 values, smallest→largest), type ramp (8 of 12 —
     dropped: 11px, 14px, 48px, 60px). The fluid clamp() shape is this repo's contract; the numbers
     are the design's.
   * Scale NOT imported, auto-filled from this repo's contract defaults: radius (design offered 2,
     needs 3), shadows (none found). These values are NOT the design's.
   * Dimensions read but not classified into a family: opacity/50, grid/columns.
  ```
- **PATTERN**: mirror the existing `STILL FAILING` / `Rung numbers DERIVED` lines — same voice, same
  "the pack ships saying so" posture.
- **GOTCHA**: `genPackCss` returns `filled` (every auto-filled token). Derive the "NOT imported" line
  from **that**, not from a parallel list you maintain — one source of truth.
- **VALIDATE**:
  ```bash
  node tooling/figma/figma-pull.mjs --slug fixt5 --from tooling/figma/fixtures/scales-partial.json --out "$SCRATCH/fixt5.css"
  sed -n '1,25p' "$SCRATCH/fixt5.css"    # read the header; every claim must be true of the values below
  ```
  Read it. **Never commit an artifact whose numbers you haven't read.**
- **SATISFIES**: AC #6, #8

### 9. UPDATE `runPull`'s return — structured, so the portal can render it

- **IMPLEMENT**: add `scales` to the returned object without changing any existing key:
  ```js
  return { slug, dest, values, checks, stepped, failures,
    scales: { imported: {…family: {slots, taken, dropped, rule}}, short: […], autoFilled: r.filled,
              unclassified: […] } };
  ```
- **PATTERN**: `.claude/plans/figma-drop-portal-ui.md` §3 asserts `runPull` is already the whole
  engine. Keep that true — additive keys only.
- **GOTCHA**: the CLI's stdout report stays as-is plus a per-family line; the **pack header** is the
  contractual reporting surface (owner's call this session).
- **VALIDATE**:
  ```bash
  node -e 'import("./tooling/figma/figma-pull.mjs").then(async m=>{const r=await m.runPull({slug:"fixt6",from:"tooling/figma/fixtures/scales-partial.json",out:process.env.SCRATCH+"/fixt6.css"});console.log(JSON.stringify(r.scales,null,2))})'
  ```
- **SATISFIES**: AC #10

### 10. VERIFY the regression — `tokens.plusui.css` unchanged

- **IMPLEMENT**: nothing. Re-run Task 2's command.
- **GOTCHA**: this is the whole safety net for an automatic (non-flagged) import. It holds because
  the cached Plus UI REST read carries **no valued** non-colour entries (measured: 14 text/effect
  styles, all `value: null`). Your classifier must therefore also ignore `value: null` entries — if
  plusui changes, that filter is missing.
- **VALIDATE**:
  ```bash
  node tooling/figma/figma-pull.mjs --slug plusui --neutral gray --accent indigo --page Color --offline \
    && git diff --quiet system/tokens.plusui.css && echo "BYTE-IDENTICAL ✓"
  ```
- **SATISFIES**: AC #7

### 11. UPDATE `system/dock.mjs` — the fourth pack row

- **IMPLEMENT**:
  ```js
  const PACKS = [
    { id: "neutral",  name: "neutral",  note: "the no-brand default (generated)" },
    { id: "saulera",  name: "saulera",  note: "reference client pack (hand-authored)" },
    { id: "verdant",  name: "verdant",  note: "factory-derived, generated from the recorded pack-seed run" },
    { id: "plusui",   name: "Plus UI",  note: "imported from someone else's Figma file — their design work, not mine" },
  ];
  const PACK_RE = /\/system\/tokens\.(neutral|saulera|verdant|plusui)\.css$/;
  ```
- **GOTCHA**: `neutral` **stays** the markup default in every page's `<head>` — do not touch the
  `<link>`. `renderPacks` appends the derived "your brand" row after `PACKS`, so plusui sits fourth
  and "your brand" fifth; rule 2 of `selectPack` keeps "your brand" on the neutral base, so plusui
  is outside the derived path by construction — verify, don't assume.
- **VALIDATE**: `npx serve .` then open `http://localhost:3000/#appearance`, pick **Plus UI**: the
  site re-skins, the head link reads `/system/tokens.plusui.css`, reload restores it, then pick
  neutral and confirm it reverts. Enter a brand colour on home, pick "your brand", confirm it still
  rides neutral (not plusui).
- **SATISFIES**: AC #11

### 12. UPDATE `system/pack-boot.js` — the second allowlist

- **IMPLEMENT**: `if (pack === "saulera" || pack === "verdant" || pack === "plusui") { … }`
- **GOTCHA**: this duplication is deliberate (read the file header). With empty storage the script
  must stay a **guaranteed no-op** — the VR harness depends on it. Change only the allowlist test.
- **VALIDATE**: with `factory-pack=plusui` in localStorage, hard-reload and confirm no neutral flash
  (the swap happens pre-paint); clear storage and confirm the page loads neutral with no JS effect.
- **SATISFIES**: AC #11

### 13. UPDATE `docs/figma-runbook.md`

- **IMPLEMENT**: rewrite "What a design needs, and what actually comes across" (L118+) so it states,
  accurately: colours (numbered or derived), and — **from a plugin export only** — spacing, radius,
  the type ramp and shadows, each all-or-nothing against its slot count; fonts and components never;
  everything else auto-filled from this repo's defaults and named in the pack header.
- **GOTCHA**: this doc was wrong once already in this thread. **Do not overclaim.** Do not describe
  the REST path as importing scales — it cannot, and the run says so.
- **VALIDATE**: read the section against a real header you produced in Task 8. Every sentence must
  be true of that output.
- **SATISFIES**: AC #8

### 14. UPDATE `system/figma-import.md` and REGENERATE the handoff pack

- **IMPLEMENT**: mirror the runbook correction into the shipped doc, then:
  ```bash
  node agent-layer/gen-handoff.mjs && node agent-layer/gen-pack-bundle.mjs
  ```
- **GOTCHA**: `system/figma-import.md` is **copied into the handoff pack** (`gen-handoff.mjs:67`).
  Editing without regenerating turns CI's `verify` job red, and that job gates main. `system/*.md`
  is not counted by `loc-summary` (its runtime group is `.css|.mjs|.js` only), so no baseline
  cascade here.
- **VALIDATE**: `node tooling/drift-check.mjs` → `✓ … handoff …`
- **SATISFIES**: AC #8, #12

### 15. RUN the full gate set and commit

- **IMPLEMENT**: commit in atomic slices — scales engine · dock · docs+regen — each message stating
  what + the doc reference (CLAUDE.md convention). The plan file itself is committed in this PR.
- **VALIDATE**:
  ```bash
  node tooling/drift-check.mjs
  node tooling/token-lint.mjs
  node agent-layer/gen-loc-summary.mjs --check
  git diff --quiet system/tokens.plusui.css && echo "plusui untouched ✓"
  test -z "$(git status --short tooling/visual-regression/)" && echo "no baseline PNG touched ✓"
  git status --short system/  # only the files you meant — no tokens.fixt*/chk-* pack
  ```
  Stage by **explicit path**, never `git add -A`: this worktree is shared with parallel sessions,
  and an accidental `system/tokens.fixt.css` becomes a counted file (`loc-summary` runtime group)
  and a red `verify`.
- **SATISFIES**: AC #12

### 16. OPEN the PR and read CI

- **IMPLEMENT**: `gh pr create` against `main`. Title states what, body carries summary · what
  changed · validation status. **No `Closes #N`** — no ticket exists (owner's call; see Open
  Questions).
- **GOTCHA**: PR #115's checks returned `startup_failure` on every attempt earlier today — a GitHub
  incident, not a repo fault. If it recurs, rerun; don't go hunting the workflow YAML.
- **VALIDATE**: `gh pr checks <n>` → `verify` **pass** and `visual` **pass**. A red `visual` means
  something *did* paint at rest — investigate rather than regenerate baselines reflexively.
- **SATISFIES**: AC #13

---

## TESTING STRATEGY

This repo has **no test suite, no linter, no type-check** (CLAUDE.md). "Done" = run the surface you
touched. Testing here is therefore fixture round-trips plus the standing gates.

### Fixture round-trips (the unit tests of this change)

| Fixture | Proves |
|---|---|
| `scales-dtcg.json` | all four families fill at exactly-N; formatting per family is correct |
| `scales-partial.json` | short family auto-fills; over-count family drops-and-reports; **rank direction** |
| `scales-tokens-studio.json` | shattered `boxShadow` leaves reassemble into one CSS shadow |
| `maps/fixture-scales.json` | `--map` pins non-colour tokens and bypasses the count gate |
| the cached Plus UI read (`--offline`) | **the regression**: byte-identical output |

### Integration

- The dock: a real browser, all four packs, plus the derived "your brand" interaction.
- `pack-boot.js`: pre-paint restore with storage set, and the guaranteed no-op with storage empty.
- CI: `verify` (drift-check · token-lint · loc-summary) and `visual` (10 pages × 2 packs).

### Edge Cases

- A family with **zero** values → auto-fills silently in the values, loudly in the header.
- A family with **exactly** N → fills, nothing dropped.
- A family with duplicates (`4px` twice) → deduped before counting.
- A dimension matching no keyword → unclassified line, never guessed into a family.
- A DTCG default that isn't a parseable `clamp()` → plain px, stated in the header.
- A Tokens Studio shadow group missing `color` → skipped, named, not half-composed.
- A `--map` naming a style the file doesn't publish → throws, listing what it does publish.
- `--map` pinning a slot in an otherwise-short family → pinned slot imports, siblings auto-fill.
- A REST read (no `--from`) → no scales, header says the file offered none.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node tooling/drift-check.mjs      # syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces
node tooling/token-lint.mjs       # 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid
```

### Level 2: Fixture round-trips

```bash
for f in scales-dtcg scales-partial scales-tokens-studio; do
  node tooling/figma/figma-pull.mjs --slug "chk-$f" --from "tooling/figma/fixtures/$f.json" \
    --out "$SCRATCH/chk-$f.css" || exit 1
done
test -z "$(ls system/tokens.chk-* 2>/dev/null)" && echo "nothing written into system/ ✓"
```

### Level 3: The regression + the artifact gates

```bash
node tooling/figma/figma-pull.mjs --slug plusui --neutral gray --accent indigo --page Color --offline
git diff --quiet system/tokens.plusui.css && echo "plusui BYTE-IDENTICAL ✓"
node agent-layer/gen-loc-summary.mjs --check
```

### Level 4: Manual validation

```bash
npx serve .    # then http://localhost:3000/#appearance
```

- Pick each of the four packs; the site re-skins, the one `<head>` line changes, the choice survives
  a reload with no neutral flash.
- Clear localStorage → the page loads neutral, `pack-boot.js` does nothing.
- Enter a brand colour on home → "your brand" appears fifth and rides the neutral base.
- Read a produced pack header end to end and check every claim against the values below it.

### Level 5: CI

```bash
gh pr checks <n>    # verify: pass · visual: pass
```

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** Spacing and radius import from a plugin export by rank, smallest→largest, formatted `Npx`.
- [ ] **AC2** The type ramp imports by rank **largest→smallest**: `type-display` takes the largest
      imported size, `type-eyebrow` the 8th-largest.
- [ ] **AC3** Clamp-valued type slots keep the contract's `clamp(min, vw, max)` shape with the
      imported value as the max, the vw term verbatim, and the min scaled by the same ratio and
      **`Math.round`ed to whole px** (no fractional px in a committed pack).
- [ ] **AC4** Shadows import from DTCG shadow objects **and** from Tokens Studio's shattered
      `.../value/{x,y,blur,spread,color}` leaves, composed into one CSS shadow, ranked subtlest-first.
- [ ] **AC5** `--map` pins any contract token — colour, dimension or shadow — beats inference, and
      bypasses the family count gate for that slot.
- [ ] **AC6** A family whose design offers fewer values than it has slots imports **nothing** and is
      named in the pack header as auto-filled from this repo's defaults; extra values are dropped
      and listed; unclassified dimensions are listed.
- [ ] **AC7** `system/tokens.plusui.css` regenerates **byte-identical** under
      `--slug plusui --neutral gray --accent indigo --page Color --offline`.
- [ ] **AC8** `docs/figma-runbook.md` and `system/figma-import.md` describe exactly what imports —
      no claim that the REST path brings scales, no claim about fonts or components.
- [ ] **AC9** Five fixtures committed under `tooling/figma/` reproduce every behaviour above with no
      network access and zero Figma request spend, and `--out` keeps every fixture pack out of
      `system/`.
- [ ] **AC10** `runPull()` returns a `scales` object alongside its existing keys; no existing key
      changes shape.
- [ ] **AC11** `plusui` is selectable in the appearance dock, labelled as someone else's design work;
      `neutral` remains the markup default and `pack-boot.js` remains a no-op with empty storage.
- [ ] **AC12** `drift-check`, `token-lint`, `gen-loc-summary --check` all green; the handoff pack and
      bundle regenerated in the same commit as the `figma-import.md` edit.
- [ ] **AC13** CI `verify` **and** `visual` pass on the PR. No baseline PNG is modified.

---

## COMPLETION CHECKLIST

- [ ] Branch merged up to `origin/main` before any new work
- [ ] All tasks completed in order, each validation run immediately
- [ ] No `system/tokens.fixt*.css` / `chk-*` left in the tree; `git status --short
      tooling/visual-regression/` empty (AC13 verified locally, not only in CI)
- [ ] Every produced pack header **read**, not just generated
- [ ] Full gate set green locally
- [ ] Manual dock + pack-boot check done in a real browser
- [ ] Acceptance criteria all met
- [ ] Plan + report committed in this PR (`.claude/plans/`, `.claude/reports/`)
- [ ] `gh pr checks` read after push — not assumed

---

## OPEN QUESTIONS / ASSUMPTIONS

**Decided this session (do not reopen):** one PR on `feature/figma-any-naming` keeping the two G1
commits; work in `ux-factory-wt-figma`; synthetic fixtures + `--offline` only (zero request spend);
all four families; `≥ N` count gate taking the first N by rank; clamp shape preserved with the max
swapped; automatic (not flag-gated) import; `--map` extended to all token types; Tokens Studio
shadows reassembled; reporting must land in the pack header; fonts (G3) **dropped**; dock gets a
fourth row labelled as third-party work, never the default, outside the derived-brand path; VR
assumed zero-churn with CI as the proof; **no `Closes #N`** since no ticket exists.

**Assumptions worth a push-back:**

1. **Rank direction is per-family, not global.** "Take the lowest N by rank" is read as *the
   family's own slot order* — so spacing rank 1 is the smallest value and type rank 1 is the
   **largest**. Read globally-smallest-first, a 12-size design would give `type-display` a ~12px
   value: an inverted ramp that every gate would pass. AC2 exists to catch it.
2. **Bare `size` is not a spacing keyword.** The option text listed `size` under spacing, but the
   real Plus UI file names its text styles `Regular/size 5` — the keyword would swallow font sizes.
   Narrowed to `spacing|space|gap|inset|padding|margin`, with type tested first. If you want `size`
   back, it belongs under type, not spacing.
3. **Reporting lands in the header *and* the return.** You named the header as the required surface;
   the structured return was a separate yes (for the portal plan). Both are implemented; stdout keeps
   its existing lines.
4. **No `Closes #N` deviates from CLAUDE.md.** Recorded once, by your explicit call — this arc was
   never ticketed. If you'd rather it were, one umbrella issue before the PR fixes it.
5. **Multi-layer shadows import their first layer only**, with the truncation named in the header.
   Not raised in the interview; flagged rather than guessed at silently.
6. **`--out` is a small scope addition** (Task 3b) not in the original prompts. It exists so a
   fixture run never writes into `system/`, which `gen-loc-summary` counts. Cut it if you'd rather
   keep the diff minimal — the fallback is `rm` after every fixture run plus explicit-path staging,
   which is a discipline rather than a guarantee.
7. **Zero VR churn is a reasoned expectation, not a measurement.** `.dock-panel { display:none }`
   (`portfolio.css:900`) + `.is-open` only on `location.hash === "#appearance"` (`dock.mjs:329`) +
   hashless `page.goto` in `visual.spec.mjs` ⇒ the fourth row never paints at rest. CI decides.

---

## NOTES (open canvas)

### Why automatic import is safe here — measured, not hoped

Automatic (rather than `--scale`-flagged) import is only safe if `tokens.plusui.css` genuinely can't
change. It can't, and the reason is specific:

```
file: Plus UI — FREE Figma UI Kit (Community)   entries: 258   {"null":14,"color":244}
non-color sample: Semi Bold/text-2xl=null | Regular/size 5=null | Box Shadow/shadow-lg=null …
```

`entriesFromStyles` types only `FILL` styles as colour, and `collectStyleFills` only harvests
*fills* off the node walk — so text and effect styles arrive **named but valueless**. Filter
`value == null` before classifying and the REST path contributes nothing to any family, which is
both the honest outcome and the byte-identity guarantee. If plusui ever changes, that filter is what
went missing.

### Why the REST read isn't worth extending

Extending `collectStyleFills` into effect/text styles would make plusui importable beyond colour —
and would immediately break the regression test, force a deliberate re-import, and put the whole
"an imported pack carries the design's scale" claim on a code path this repo can only exercise
against one community file. `--from` sees everything REST gates behind Enterprise, costs no requests,
and is already the documented path. Rejected deliberately, not overlooked.

### The rank-direction trap, stated once more

| Family | Slot order | Rank 1 takes |
|---|---|---|
| spacing | `xs → 4xl` | smallest imported |
| radius | `sm → lg` | smallest imported |
| shadow | `sm → lg` | subtlest (`blur+spread` ascending) |
| **type** | `display → eyebrow` | **largest imported** |

### Sequencing risk

Phase 4 (dock) is independent of Phases 1–3 and touches files no other phase does. If the scale work
runs long or a family turns out to be messier than the fixtures suggest, the dock commit still ships
the visible half of the arc on its own. The reverse isn't true — don't reorder.

### What this leaves open, deliberately

- **G3 fonts** — dropped by decision, still a real gap; the runbook should say so plainly.
- **The parity artifact** — pending a human in Figma (handover §A, runbook §B).
- **The public drop-to-re-skin exhibit** — `figma-drop-portal-ui.md` §6. The thesis made literal;
  needs the mapping core extracted to a view-time-safe module, which touches `system/` and *would*
  cascade `loc-summary` + the two approach baselines.

## AMENDMENTS

<!-- append-only; newest at the bottom -->

**2026-07-25 — Open Question #4 reversed: the PR carries `Closes #N` after all.** The plan recorded
"no ticket exists, so no trailer" as an explicit call. On review the owner chose the other fix the
question itself offered: umbrella issue #121 was written retroactively (scope, the three problems,
and the deliberate non-goals — fonts, components, the parity artifact, extending the REST read), and
PR #120's body now closes it. Nothing in the implementation changed. The reason to prefer this: a
merged PR that closes nothing leaves the work looking unplanned, which cost a wasted planning pass
once already (#78), and CLAUDE.md makes the trailer mandatory — a one-off exemption is a worse
precedent than a five-minute retroactive ticket.

## AMENDMENTS

- **2026-07-26 (owner decision, issue #127):** the rank-fill rule is amended for over-offered
  families. AC1/AC2's extreme-N fill was designed against curated exports (offered ≈ slots); the
  first real full-scale dump (Plus UI via variables2json — 35 spacing values, 13 font sizes)
  produced a degenerate pack (spacing capped at 12px, 96px body text). When offered > slots the
  fill now takes an EVEN SPREAD across the sorted range (direction per family unchanged); offered
  == slots keeps the exact fill. The header/report name the spread rule wherever it applied.
  Companion fix, same issue: `classifyDimension` excludes weight/letter-spacing/tracking names
  from the type family — a font-weight of 700 is not a 700px size.
- **2026-07-26 (#129):** the radius family excludes pill sentinels (values ≥ 999px, e.g.
  Tailwind's `rounded-full` 9999px) — a shape utility, not a surface radius; under the spread
  rule it would have landed on `radius-lg` and pilled every panel. Excluded values are named in
  the header's unclassified list, same treatment as the weight exclusion.
  Recorded trade-off (PR #132 review): regenerating the committed plusui pack from the plugin
  export replaced the header's specific file identity — previously `"Plus UI -  FREE Figma UI
  Kit and Design System (2026) v2.0 (Community)" (key 1h9hLlYs6S9CO1xGyBcBVX)` — with the local
  export's name, because a plugin export carries no file metadata the generated header could
  read. The kit's identity stays on record here and in the dock's attribution note
  (`system/dock.mjs`), which names the design work a reader actually sees.
