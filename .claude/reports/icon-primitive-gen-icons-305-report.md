# Implementation Report — `icon` through the chain + `gen-icons`

**Plan**: `.claude/plans/icon-primitive-gen-icons-305.md`
**Branch**: `feature/icon-primitive-gen-icons-305`
**Base**: `d512047` → `d512047` (re-fetched at the baseline step; `git rev-list --count HEAD..origin/main` → `0`, so main did not move under this run)
**Status**: COMPLETE

## Summary

`icon` is in the vocabulary as the fourth of epic #295's five generic primitives, drawing one glyph by Phosphor name out of a generated, committed subset — `system/icons.mjs`, 19 lines, six glyphs — with `@phosphor-icons/core` confined to `tooling/icons/`, a build-time tool dir read off disk by path and never imported. A name the map does not carry renders as its own literal text in a framed mono box rather than as an empty box, and `Object.hasOwn` keeps `constructor` out. `agent-layer/gen-icons.mjs` emits the map, `--add <name>` is the one command that grows it, and `--check` is a new `drift-check` leg that regenerates from the package (so a bump that silently moved a path is a red build) and **throws** rather than reporting "no drift" when the install is absent. build-checks group 41 is the 41st group.

## Tasks completed

| Task | Path | Action |
| --- | --- | --- |
| 0 | branch `feature/icon-primitive-gen-icons-305` from `origin/main` | CREATE |
| 1 | `tooling/icons/package.json` · `package-lock.json` | CREATE |
| 2 | `system/icons.manifest.json` | CREATE |
| 3 | `agent-layer/gen-icons.mjs` (173 lines) | CREATE |
| 4 | `system/icons.mjs` (19 lines, GENERATED) | CREATE |
| 5 | `system/specs/icon.md` | CREATE |
| 6 | `system/specs/stack.md` — `children` + the Usage paragraph | UPDATE |
| 7 | `system/components.css` — the `ds-icon` block | UPDATE |
| 8 | `system/agentic-renderer.mjs` — the template, the import, **and the header's template count (A1)** | UPDATE |
| 9 | `system/palette.mjs` — `CATALOG_COMPONENTS` | UPDATE |
| 10 | `handoff/verdant/{pack,vocabulary,pack.bundle}.json` · `llms.txt` · `contracts/` · `tokens/` · `system/system-graph.json` | REGENERATE |
| 11 | `import/fixtures/spike-c-instance.expected.json` | REGENERATE |
| 12 | `system/loc-summary.json` | REGENERATE |
| 13 | `tooling/drift-check.mjs` — `checkIcons()`, the header, the `✓` line | UPDATE |
| 14 | `.github/workflows/verify.yml` — the `npm ci` step + the ⚠ scoping sentence | UPDATE |
| 15 | `tooling/build-checks.mjs` — group 41, `icons` | UPDATE |
| 16 | the wrapper histogram 3/21 → 3/22 in **five** sites (A2), incl. D6's `system/catalog.mjs` | UPDATE |
| 17 | the group count 40 → 41 in the four `claims` sites, **plus the reword A3 forced** | UPDATE |
| 18 | group 40's four prediction sites + `import/recognise.mjs:198`, all referencing **#449** | UPDATE |
| 19 | `CLAUDE.md` (3 map rows + the "New icon" bullet) · `.claude/references/gates.md` (count, 3/22 ×2, the Group 41 paragraph, the case-13 sentence) | UPDATE |
| 20 | `catalog-journey all` + the four reads | RUN |
| 21 | six baselines + `visual.spec.mjs`'s shot-budget comment | REGENERATE |
| AC #6 | the D1 follow-up issue | FILED as **#449** |

Four commits: `68f0690` (the feature) · `55f17e5` (catalog-journey case 13) · `0720f39` (the pack, after A6's prose fix) · `22d0f6b` (the six baselines).

## Tests added

**`tooling/build-checks.mjs` group 41, `icons`** — 12 cases, all driven against the real `domStub`, the real `renderComposition` and the real `validateComposition`; nothing grepped, nothing written to disk.

41.1 the NS control (its own, beside `domStubControl()`) · 41.2 manifest ↔ map identity in order, viewBox, frozen, every `d` a moveto · 41.3 a subset by count · 41.4 every manifest name rendered, `d` compared **by loop variable** · 41.4b the pack's example · 41.5 the refusal, incl. zero svg/zero path · 41.6 five prototype-chain names · 41.6b the truthiness mutation · 41.7 `genIcons({check:true})` + pure `emitIcons` drift, unsorted and duplicate refusals · 41.7b `pathOf` over five synthetic SVGs + the real shape as control · 41.8 the vocabulary entry + six `validateComposition` drives + the nested `stack > icon` render · 41.9 the six-name and weight tripwires.

**`tooling/catalog-journey.mjs` case 13** (9 assertions) — see § Additions beyond the plan.

## Proving the checks

Every row observed. "restored" means the unmutated tree was re-run and returned to green.

| # | Mutation | What went red | Positive control |
| --- | --- | --- | --- |
| M-A | `Object.hasOwn(ICONS, …)` → `ICONS[props.name]` truthiness | group 41 ✗ 10 failures — 41.6 for `constructor`, `toString`, `__proto__`, each twice ("resolved through Object.prototype and the template treated it as path data") | restored → 41/41 |
| M-B | `createElementNS` → `el("svg", {})` | group 41 ✗ 6 — 41.4 for all six names, "created with namespace null … paints NOTHING while every other assertion here still passes"; **only** the `ns` assertions moved, which is why 41.1 exists | restored → 41/41 |
| M-C | delete the `icon` template | group 3 ✗ by name ("documented but not composable"), group 22 ✗, **group 41 ✗ 62 named failures**, run completes. *Before the A4 fix this CRASHED and group 41 reported nothing* | restored → 41/41 |
| M-D | hand-edit `system/icons.mjs`, drop `"x"` | group 41 ✗ 7 — 41.2 (names both lists), 41.3 (5 vs 6), 41.4 ×3 for `x`, **41.7 both legs** | restored → 41/41 |
| M-E | `domStub`'s `createElementNS` drops the namespace | group 41 ✗ 13, and **41.1 reports first** ("does not record the NAMESPACE it was given") — the control doing its job | restored → 41/41 |
| M-F | remove `"icon"` from `CATALOG_COMPONENTS` | group 21 ✗ "palette.mjs CATALOG_COMPONENTS has drifted from the generated vocabulary", naming both lists | restored → 41/41 |
| M-G | `"example": {"name": 7, …}` | `gen-vocabulary` **exit 1**: `system/specs/icon.md: head "example" does not render — icon.example.props.name: expected string, got number` | restored → `vocabulary ✓ 25` |
| M-H1 | `var(--spacing-lg)` → `24px` | `gen-system-graph` drops the edge: `ds-icon` token edges 9 → 8, `--spacing-lg` absent | restored → 9 edges |
| M-H2 | `var(--spacing-lg)` → `var(--icon-size-lg)` | `token-lint` **exit 1**: `references undeclared token(s): --icon-size-lg` | restored → `token-lint ✓` |
| M-I | `CLAUDE.md` left at 40 | `checkGroupCount` names it: `CLAUDE.md (architecture map): says 40 groups, build-checks defines 41` | the leg CLEAN at 41 in all four claims |
| M-J | manifest `weight` → `"bold"` | group 41 ✗ 5 — 41.7 (the throw, folded and **named**) + **41.9's weight pin**, run completes. *Before the A4 fix this CRASHED* | restored → 41/41 |
| M-K | drop a manifest name, run the **whole** `drift-check` | **exit 1**: `drift ✗  icons drift: system/icons.mjs — regenerate: node agent-layer/gen-icons.mjs` | `drift-check ✓ … icons …` |
| M-L | `mv tooling/icons/node_modules`, run the **whole** `drift-check` | **exit 1**: `drift ✗  gen-icons: tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing — … Install it: cd tooling/icons && npm ci`. This is the fail-closed control for Task 14's CI step, and it reports from the `icons` leg (which runs before `checkHandoff`), not from a later one | restored |
| M-M | `--add house` (a real 7th glyph) + regen | group 41 ✗ **41.9's tripwire**, naming the set and saying a seventh is fine | restored |
| CJ-1 | remove the `[data-refused]` rule | case 13 ✗ 2 — "border=0px none", and **"refused 24px vs glyph 24px"** (the box collapses to the glyph, which is the empty-box failure mode) | restored → 49/48/48 |
| CJ-2 | frame **every** `.ds-icon`, size none | case 13 ✗ 1 — **its own control**: "a RENDERED glyph beside it has no frame … border=1px solid" | restored |
| CJ-3 | `color: inherit` → `#1a1a1a` | case 13 ✗ 1 — "the glyph takes its parent's colour … got rgb(26, 26, 26)" | restored |

**The generator's own nine paths**, all observed and all matching the plan's quoted strings byte for byte: clean run · clean `--check` (exit 0) · dropped name (exit 1, drift message) · absent `node_modules` (exit 1, names the dir and the fix) · `--add chevron-right` (exit 1, near misses `align-right, arrow-right, caret-right, tag-chevron, toggle-right`) · `--add "Arrow Left"` (exit 1, character class) · `--add back` (exit 1, `skip-back, floppy-disk-back, skip-back-circle`) · `--add close` / `--add zzzznope` (exit 1, no suggestion, the phosphoricons.com pointer) · `--add check` (exit 0, stated no-op, manifest byte-identical) · `--add house` (exit 0, sorted insert, 7 icons).

**The three positive controls the plan names, all run before any green was trusted:**

1. **The DOM-stub NS control** — 41.1. Observed: the stub records the NS it is given, a `createElement` node records `null`, and M-E proves the control fires first.
2. **Fail-closed on the install** — M-L. Observed: throws naming the directory, exit 1. It does not print `✓`.
3. **Group 40 before and after** — `build ✓ all 40 groups pass` on `d512047` before Phase 2; and after Phase 3 (vocabulary 24 → 25) group 40 was **green, unchanged**, with the only red being the 3/22 histogram. That is the evidence behind Task 18's corrected comments.

**The driver proven before it was trusted** — the four-reads probe and case 13 were both reddened on known-bad input (CJ-1/2/3 above) before either was reported as evidence.

## Validation results

Every figure below names the command that produced it; all are **observed** unless marked.

### Level 1 — syntax and style
```
node --check agent-layer/gen-icons.mjs          → clean
node --check system/icons.mjs                   → clean
node tooling/token-lint.mjs                     → token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
```

### Level 2 — the pure gate
```
node tooling/build-checks.mjs                   → build ✓  all 41 groups pass
```
`group(` arithmetic, read off the source as `checkGroupCount` reads it: **42 calls, 41 distinct, 1 known dupe** (`parenting`); `icons` appears once and is **not** in `DUPES`.

### Level 3 — the drift and pack chain
```
node agent-layer/gen-icons.mjs --check          → icons ✓  6 icons — no drift
node agent-layer/gen-loc-summary.mjs --check    → loc summary ✓  3 groups — no drift
node agent-layer/gen-param-count.mjs --check    → param count ✓  121 controls — no drift   (AC #5: unmoved)
node import/regen-expected.mjs --check          → expected verdict ✓ … 54924 bytes …
node tooling/drift-check.mjs                    → drift-check ✓  syntax · token-css · annotated-source ·
    loc-summary · param-count · icons · system-graph · inspect-data · inspect-mounts · handoff ·
    scenarios · traces · replay · group-count
```

**The regenerators** (Task 10, five in order): `handoff pack ✓ 25 specs` · `vocabulary ✓ 25 components` · `pack bundle ✓ 16 files` · `pack index ✓ 17 files` · `system graph ✓ 63 tokens · 48 consumers · 550 edges`, with a `ds-icon` consumer carrying exactly **nine** token edges and its spec path parsed out of the block header.

**The expected-verdict diff — the plan's sharpest tripwire, matched exactly.** Before: **52,922 bytes** (observed, matching the plan's premise). After: **54,924 bytes**. `git diff --numstat` → **`66  0`**; hunks → **6**; **zero removals**, so no existing line changed and no verdict field could have moved. All 66 added lines are six identical `"slug": "icon"` candidate blocks at **score 0.125**, one `prop-fit` hit on `name`, on the six text-bearing nodes. Read back per node: the Avatar (`candidates: [avatar]`, floor) and the **Chevron** (`covered: false, via: "floor", candidates: []`) get **no** `icon` candidate — D1 reproduced on the real tree, which is what Task 18's corrected comments now state.

**The loc arithmetic**, read straight off the git index before and after staging (derived where marked):

| group | before | after | rounded |
| --- | --- | --- | --- |
| runtime | 79 files / **32,004** exact | 80 files / **32,109** exact | 32,000 → **32,100** |
| generators | 21 files / **2,895** exact | 22 files / **3,069** exact | 2,900 → **3,100** |
| total | 117 / 40,200 | 119 / 40,400 | — |

Both "before" figures match the plan's Probe 4 exactly. Assumption **A4 held**: runtime crossed 32,050, so the approach pages' line figure moved as well as `runtime.files`.

### Level 4 — the browser gates
```
BASE=http://127.0.0.1:4791 node tooling/catalog-journey.mjs all
  → catalog-journey ✓  all assertions passed on chromium, firefox, webkit
    chromium: 49 passed, 0 failed · firefox: 48 · webkit: 48
    (the chromium extra is case 11's CDP-only listener count, as the existing output states)
```
The server was **curl-verified as this tree** before the run (`/system/icons.mjs` exists nowhere else). That check earned its place twice over — see § Issues.

**The four manual reads (AC #3d), driven in all three engines rather than eyeballed** — 18 assertions per engine, 0 failures, 0 page or console errors:

1. the `icon` panel draws the package's **own** `check` path data (byte-equal to `assets/regular/check.svg`) at a computed **24×24**, with the `<path>` really in the SVG namespace so it paints;
2. `md` → `lg` → `xl` compute **16×16 → 24×24 → 32×32**;
3. `not-an-icon` produces a **1px solid**, `ui-monospace` box reading the literal name at **643×22px** with **zero** svg;
4. swapping the pack link recolours the glyph — `rgb(26,26,26)` → `rgb(31,38,33)` — and the `fill="currentColor"` sits on the `<svg>` with the `<path>` carrying **none**, so the colour arrives by inheritance (this is A6).

**The pixel gate.** From a clean detached worktree at `/Users/Berzins/wt-icons-305-baselines` (`git status --short` empty before the run), the six PNGs **removed first**, then `npm run update:docker`: all six came back as *"A snapshot doesn't exist … writing actual"*, **33 passed**. A plain verification run in the same container then passed **33/33**. The other **27** shots matched their committed baselines — the evidence that no other page moved. Assumption **A5 held**: `/components` took **18.2 s / 20.6 s / 13.8 s** across the three packs, inside the 30 s `shotTimeout`.

Because `maxDiffPixels` swallows a few changed digits, the figures were read off the rendered page rather than inferred from a green run: `/approach` settles at **80 files · 32,100 lines · 121 controls** (polled to two stable reads, since `countUp` runs on rAF).

### Level 5 — additional
```
cd tooling/icons && npm audit --json
  → {"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}      (A2 held)

node tooling/audit-delta.mjs d512047            # the exact call the CI `audit` job makes
  → audit-delta: comparing d512047 → working tree across 4 directories:
      portal, tooling/icons, tooling/style-dictionary, tooling/visual-regression
    tooling/icons: absent at base — every advisory it carries reads as new
    tooling/icons: base 0 advisories, head 0, new 0
    tooling/style-dictionary: base 5 advisories, head 5, new 0
  → audit-delta ✓  no advisory ID present at head that the base did not carry   (exit 0)
```
The second command is what proves the claim, and it is a different claim from the first: `npm audit`
says the package is clean, `audit-delta` says **the gate can see the new directory**. It
auto-discovered `tooling/icons` with no edit (the plan's prediction), stated the absent-at-base case
in its own words, and the delta is empty — so the `audit` job is green on this diff for a measured
reason rather than an inferred one. `tooling/style-dictionary`'s 5 pre-existing build-time advisories
are carried at base and head, which is exactly the case the delta design exists for.
`@phosphor-icons/core` **2.1.1**, MIT ("Copyright (c) 2023 Phosphor Icons"), 37 MB of `node_modules`, **1,512** regular-weight SVGs, 19-line lockfile, `node_modules/` covered by the repo-root `.gitignore` rule (`git check-ignore -v` → `.gitignore:2`). The shape survey was **re-run on this install**, not inherited: all 1,512 are exactly one `<path>`, `viewBox="0 0 256 256"`, `fill="currentColor"`, with **zero** `circle`/`rect`/`line`/`polyline`/`polygon`/`ellipse`/`g`. `back.svg`, `close.svg` and `chevron-right.svg` do **not** exist; all six committed names do.

## Not run

- **The `verify` workflow itself.** Task 14's own VALIDATE says "the real proof is a green `verify` on the PR". The static check passed (`install before drift-check: true`) and the leg it installs for was proven locally both ways (M-K, M-L). **Tracker: the PR's own CI run.**
- **`gh pr checks`.** No PR is open yet; `piv-create-pr` is the next step. The plan flags `/approach`'s `countUp` as a known CI flake independent of this diff. **Tracker: the PR's own CI run.**
- **The CodeQL gate's leg 2.** Not reachable before the PR exists. Noted because an alert `main` already carries reds every open PR (memory: *codeql leg 2 blocks its own fix*). **Tracker: the PR's own CI run.**
- **`build-journey`, `proto-journey`, `studio-journey`, `instance-journey`, `vt-verify`.** Not in the plan's validation set and no surface they cover changed — nothing renders an `icon`, and only `/components` and `/approach` moved at rest. Deliberately not run.

Nothing in this report is verified by reading code instead of running it, with one exception stated as such: that the `verify.yml` step ordering is correct is a static string check plus the local proof of the leg, not a CI run.

## Deviations from the plan

1. **`(plan error)` A1 — the renderer's own template count.** The plan lists no site for it; `agentic-renderer.mjs:21` and `:256` both said "twenty-four" and #303 is the commit that put them there. Moved to twenty-five. No gate reads them, so this would have shipped silently.
2. **`(plan error)` A2 — the wrapper histogram has five copies, not four.** Task 16 misses `build-checks.mjs:94` (the file's group index) and the current-state tail of the tripwire note at `:5024`. Both moved; the four history arrows in that note are left as written.
3. **`(plan error)` A3 — the 41st group makes `drift-check` red for a reason Task 17 does not cover.** `checkGroupCount`'s regex `/all (\d+) groups pass/g` also matches group 40's prose "left all 40 groups passing". At 40 groups both readings agreed; at 41 the leg reported a false stale claim on a clean tree. Fixed by **rewording the prose**, not the regex — that sentence was never a claim about the group count, and stating one there made it a silent second copy of the gate's own claim. The mirror sentence in `gates.md` was reworded in the same edit.
4. **`(plan error)` A4 — Task 15's group-level REDDENS is wrong as written.** "delete the `icon` template → cases 4–6 fail" was measured: the group **crashed** and reported nothing. Three seams throw (`renderComposition`; `renderChild`, which has no `hasTemplate` guard where `build()` does; and `genIcons`), each found by a separate mutation. All three now fold into one named failure on group 39's stated rule. With the fix, M-C reds group 3 by name **and** group 41 with 62 named failures.
5. **`(plan error)` A6 — Task 7's CSS block and the spec's States prose state a false mechanism.** Both said the `<path>` carries `fill="currentColor"` from the package. `pathOf` returns the `d` and nothing else; `system/icons.mjs` contains "fill" **zero** times; the template sets it on the `<svg>` (`agentic-renderer.mjs:529`). Corrected in both places, and the corrected fact is now asserted in case 13.
6. **Clarification (not a plan error) A5 — case 4b reads `handoff/verdant/pack.json`, not `vocabulary.json`.** `gen-vocabulary` drops `example` from its entries; `system/catalog.mjs` seeds the playground from the prepared **pack row**. The plan cites the right mechanism and is silent on the artifact.

All six are logged under AMENDMENTS in the plan with the date and what was wrong.

## Assumptions carried

Plan-sanctioned, honoured as written — **not** deviations.

- **D1** — the importer is not taught to read `icon.name` here; the measurement was reproduced on the real tree (the Chevron stays `floor` with an empty candidates list) and **#449** is filed with the D1 section as its body and referenced in all five corrected comments.
- **D2** — `size` required, enum `["md","lg","xl"]` binding to `--spacing-md|lg|xl` (16/24/32, verified against `tokens.contract.css`). No `sm`, no pixel prop.
- **D3** — the prop stays `name`, and the `+66`-line importer noise is accepted as noise in a candidates list rather than a wrong answer.
- **D4** — the six are **DERIVED** from Faster Payment's four screens, never "confirmed against the brief": the brief names no icons. Three resolve to a name no designer reaches for first (`back`→`arrow-left`, `close`→`x`, `chevron-right`→`caret-right`), and "close" in the PRD's state list means a CoP **close match**.
- **D5** — `--check` regenerates from the package and CI installs it; the alternative (name-set compare) cannot see a moved `d`.
- **D6** — `system/catalog.mjs`'s histogram prose was already stale at 3/17 before this ticket and is corrected to 3/22, with its `#220` history clause rewritten rather than digit-substituted.
- **Non-goals held**: `GLYPHS`/`icon()` in the renderer untouched; no second weight; no `label` prop; no new contract token; no `param-manifest` entry (`param count ✓ 121 — no drift`); `build-instance.mjs` and `gen-handoff`'s pack-file list unchanged.
- **Plan source used verbatim** where it said verbatim: `gen-icons.mjs` is 173 lines as written, and its emitted output matches the plan's quoted 19 lines byte for byte.

## Additions beyond the plan

**`tooling/catalog-journey.mjs` case 13 — the icon's three sizes and its refusal, in computed style** (9 assertions, chromium/firefox/webkit).

Group 41's `detail` string states it cannot reach the computed sizes or the refusal's frame winning at runtime, **and names `catalog-journey` for both**. `catalog-journey` had no such case, so that deferral pointed at a gate that checked nothing — the check-that-cannot-fail shape one level up from the cases themselves. #303 set the precedent one ticket earlier with its own case 12 (a list's divider ownership in computed style), which `gates.md` already lists there. Case 13 asserts: `md`/`lg`/`xl` computing 16/24/32px; the glyph taking a wrapper's own colour (currentColor reduced to its actual mechanism, inheritance, without a second stylesheet — case 11 owns the pack swap); the fill on the `<svg>` with the `<path>` carrying none (A6); and a refused name reading as its own text with zero svg, framed and mono — **with a rendered glyph beside it in the same document and pack as the control**, without which every refusal assertion is satisfied by a sheet that framed every `.ds-icon` and sized none. Reddened three ways before being reported (CJ-1/2/3). Named in `gates.md`'s `catalog-journey` paragraph.

Everything else listed under § Deviations is a correction the plan asked for in spirit (D6's rule: do not leave a number this ticket makes more wrong) or a blocker that had to be cleared for a gate to pass.

## Issues encountered

**The stale-serve trap fired, and the curl check is what caught it.** Verifying `/approach`'s rendered figures, the served `/system/loc-summary.json` came back `files: 76, linesApprox: 30800` — neither this tree nor base. `lsof -ti:4792` → pid **46441**, cwd `/Users/Berzins/Documents/wt-302-base`: a **parallel session's** `serve.mjs`, holding the port I had chosen. It was left running (port-scoped kill only, and it is not mine); the read was redone on a verified-free port (4838) after curling two files that exist only here. Had the check been skipped, the report would have recorded 76/30,800 as this ticket's figures.

**`drift-check`'s handoff leg cannot pass on an uncommitted tree.** `checkHandoff` reads `git status --porcelain -- handoff/`, which is non-empty for staged changes too, so the leg only goes green after a commit. It cost one extra commit (`0720f39`): A6's prose fix changed `icon.md`'s Usage text, which is a `pack.json` field, so the chain owed another run.

**`renderChild` has no `hasTemplate` guard** where `build()` does (`agentic-renderer.mjs:166` vs `:690`), so a missing template for a **child** surfaces as a raw `TypeError` rather than the renderer's own named Error. Pre-existing and left alone (surgical changes); recorded in case 41.8's comment, in the gates.md paragraph, and here, because it is the reason that seam needed its own catch.

**`--add` on a weight whose assets are named differently fails at the generator, not at 41.9.** Phosphor's bold files are `<name>-bold.svg`, so flipping `weight` to `"bold"` makes `gen-icons` throw on `arrow-left` before the weight pin is ever read. 41.9's weight assertion is still reachable — by editing the manifest without regenerating, which is what M-J does — and it reds by name there.

---

## Review fixes — PR #450, round 1

Review: `.claude/code-reviews/pr-450-review.md` (posted as
[a PR comment](https://github.com/linardsb/ux-factory/pull/450#issuecomment-5779323118); solo repo, so
`gh pr review --request-changes` is refused on one's own PR). Verdict: **request changes on F1 alone**.

**6 of 6 fixed.** Owner triage: all six, not the reviewer's F1+F6-then-F2 order.

- [x] **F1** (High) — group 41's fallback re-parses the same bad bytes inside its own `catch`
- [x] **F2** (Medium) — two stale wrapper-histogram copies
- [x] **F3** (Low) — "asserted by count against the 1,512 icons" describes a bound of 20
- [x] **F4** (Low) — 41.7b's "positive control" never reads the package
- [x] **F5** (Low) — "Six plan errors" is five plan errors and one clarification
- [x] **F6** (Low) — 41.7's degraded path emits two cascading failures

### F1 · `agent-layer/gen-icons.mjs` + `tooling/build-checks.mjs`

**Mechanism.** `readManifest`'s only non-validation throw source is its own `JSON.parse`, so the guard
written to turn a bad manifest into a *named failure* re-ran the identical parser over the identical
bytes inside the `catch` — guaranteed to re-throw, not merely at risk of it.

**What it was:** genuinely reachable, for anyone running `node tooling/build-checks.mjs` standalone —
CLAUDE.md's main gate. Not reachable in CI, where `verify.yml` runs `Drift check` first and that leg exits
1 on the same bytes. Nothing in `system/` is implicated.

Two edits. The parse is now a **pure, exported `parseManifest(text)`** whose throw names the path, on the
`emitIcons` / `validateExamples` precedent ("exported so build-checks can drive it… which is the only
thing that proves this gate can fail at all"); `readManifest()` is the fs half and nothing more. The
group's fallback is one `catch` deeper: a **validation** refusal still leaves parseable bytes, so every
case runs against the real manifest; a **parse** refusal degrades to the committed map's own shape.

**Driven four ways** (each mutation restored, `md5 system/icons.manifest.json` → `ff05c2f9f378d3336db77220bbe6e249`
verified, tree re-run to `build ✓  all 41 groups pass`):

```
malformed JSON, BEFORE:   SyntaxError at tooling/build-checks.mjs:12321 — group 41 prints NOTHING,
                          no ✓, no ✗, and the script's own tally never runs
malformed JSON, AFTER:    build icons  ✗  2 failure(s)
                            · 41: readManifest() refused system/icons.manifest.json — gen-icons:
                              system/icons.manifest.json is not valid JSON — Expected property name…
                            · 41.7: genIcons({check:true}) THREW — gen-icons: system/icons.manifest.json
                              is not valid JSON — Expected property name…
                          build ✗  2 failure(s)          ← the tally runs; no stack trace
weight: "" (VALIDATION):  4 named failures, unchanged — the raw-bytes path still serves
node_modules removed:     3 failures → 1 (F6), the one naming the directory and the fix verbatim
```

**The review's proposed fallback was measured, not adopted.** `.claude/references/…` memory rule "a
review's proposed fix is a claim" — `catch { MANIFEST = { weight: "regular", icons: [] }; }` under the
same mutation produces **8** failures where the committed-map fallback produces 2:

```
· 41.2: system/icons.mjs and the manifest disagree — map [arrow-left, …] vs manifest []
· 41.3: the map carries 6 glyphs and the manifest names 0
· 41.7: emitIcons over the committed manifest does not reproduce system/icons.mjs
· 41.7: an UNSORTED manifest was accepted
· 41.7: a DUPLICATE name was accepted
· 41.9: the committed set is []
```

Six of those describe defects that did not happen, which is F6's complaint one level up. Worse, 41.4's
`for (const n of MANIFEST.icons)` loop (`:12399`) runs **zero** times under it, so the render coverage
goes silently to nothing — the check-that-cannot-fail shape. The committed-map fallback keeps every
template, refusal, `pathOf` and validator case running for real and makes three identity cases
self-comparisons, which the top-of-group comment now states in full.

**41.7c pins it, and the pin is proven able to fail.** Six synthetic strings through `parseManifest`
(malformed JSON, empty `weight`, absent `weight`, empty `icons`, non-array `icons`, a capitalised name),
each throw required to name the **file** and say what is wrong, with a well-formed manifest as the
positive control. Reverting F1's named parse throw:

```
build icons  ✗  2 failure(s)
  · 41.7c: the throw for "{ % not json }" does not name the FILE — got "Expected property name or '}'
    in JSON at position 2"
  · 41.7c: the throw for "{ % not json }" does not say what is wrong (expected to mention "is not valid
    JSON") — got "Expected property name or '}' in JSON at position 2"
```

Restored → `build ✓  all 41 groups pass`.

### F2 · `system/handoff-viewer.mjs:123` · `tooling/catalog-journey.mjs:14`

**What it was:** a false completeness claim in prose, no gate implicated. `handoff-viewer.mjs:123` was
reported as F1b on PR #447 one ticket ago, not applied, and this ticket incremented its denominator again
— it had survived two reviews. Re-derived from the artifacts rather than from the review:

```
handoff/verdant/vocabulary.json   → 25 components
handoff/verdant/pack.json         → portability.webComponents.files = 3
                                    ["wc/vd-care-task-row.mjs","wc/vd-plant-card.mjs","wc/vd-status-chip.mjs"]
```

`3 of 23 today; the 20` → `3 of 25 today; the 22`; `3/7` → `3/22`. Comment-only, and `handoff-viewer.mjs`
keeps its line count (371 → 371), so the `runtime` loc group does not move and no baseline cascades.
The complete current-state set is five files — `gates.md` ×2, `system/catalog.mjs`,
`tooling/build-checks.mjs` ×3 (`:94`, `:5026`, `:5041`), `handoff-viewer.mjs`, `catalog-journey.mjs` — all
now reading 3/22, found by a search that does not encode the current value:
`git grep -nE '3/[0-9]{1,2}|3 of [0-9]+ today' -- '*.mjs' '*.md'`.

### F3 · F4 — analyser-legible prose, no behaviour change

Group 41's `detail` string and `gates.md`'s Group 41 paragraph, the two surfaces the review named, both
now say the subset claim is asserted by an **upper bound of 20** (`1512` appears only in the failure
message; nothing there reads the package), and that 41.7b's positive control is the **committed map's**
shape reproduced from `ICONS.check` — which is why the group survives a missing install, and why a
package whose shape genuinely moved is caught by the **drift leg** instead. The inline comment at
`:12373–12376` already stated both correctly and is left as written. Swept for further copies:
`git grep -ln "package's real shape"` and `"three throwing seams"` both return nothing.

### F5 — the PR body

"Six plan errors" → "Six amendments — five plan errors and one clarification", matching this report's own
classification of A5. Amendment 2 rewritten to the verified five-file set; amendment 4 records the fourth
throwing seam. `gen-icons.mjs` line count 173 → 184.

### F6 · `tooling/build-checks.mjs` 41.7

The two follow-on assertions are guarded on `cleanErr === null` rather than run over a
`{ drifted: ["(threw)"], icons: -1 }` placeholder, which 41.4's own throw-catch already did for its root.
Measured with the package uninstalled: 3 failures → 1.

### Deferred — none

Every finding was fixed. The review's one out-of-scope note — `tooling/build-checks.mjs:6242`, group 28's
file sweep crashing uncaught on a missing git-tracked `system/`-prefixed file — is pre-existing, untouched
by this PR, and stays out: it is a defect in a sweep this ticket never wrote, and folding it in would put
an unrelated failure mode in a ticket about icons. It is the reason F1's table has only one fixable row.

### Gates re-run after the fixes

Local, at `4a5d3e2`:

| Gate | Result |
| --- | --- |
| `node tooling/build-checks.mjs` | `build ✓  all 41 groups pass` |
| `node tooling/drift-check.mjs` (staged) | `drift-check ✓` — 14 legs incl. `icons` and `loc-summary` |
| `node tooling/token-lint.mjs` | `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `node agent-layer/gen-icons.mjs --check` | `icons ✓  6 icons — no drift` |
| `node import/regen-expected.mjs --check` | `54924 bytes` — unmoved, no spec changed |
| portal smoke (`PORT=4791`) | `/api/health` 200 `ok:true`, `/` 200; port-scoped kill |

**`loc-summary` regenerated.** The grand total moved **40,400 → 40,500** (`gen-icons.mjs` 173 → 184 lines
for `parseManifest`). The `runtime` group is unchanged at 80 files / 32,100 lines, and `approach.html:272`
reads **only** the `runtime` group — read from the page, not assumed — so no visual baseline churns. The
first staged run caught this as `build import-chain ✗ 1 failure(s)` plus a red `drift-check` leg; both go
green after the regen.

CI at this head, **read after confirming `headRefOid` equals the local `HEAD`**: `verify` 25s, `visual`
1m30s, `audit` 15s, `codeql` 1m40s, `CodeQL` 3s, `gates-green` 3s — all pass; `mergeStateStatus` CLEAN.

**A trap worth recording:** `gh pr checks 450 --watch` run immediately after the push reported six greens
that belonged to the **pre-push** head. GitHub took ~2.5 minutes to move `headRefOid` off `8aa5db0`, and a
run on the new SHA did not exist until then. The PR head must be compared to the local `HEAD` before any
check read is trusted.

### Not re-run, and why

`catalog-journey` (the review's 49/48/48 at `8aa5db0`): the only change to `tooling/catalog-journey.mjs` is
one comment on line 14, and `drift-check`'s `syntax` leg `node --check`s every tracked `.mjs`. The other
journey drivers and `vt-verify` cover nothing these edits touch — no shipped page's at-rest render changed,
which the green `visual` job confirms independently.
