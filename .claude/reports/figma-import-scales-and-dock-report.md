# Implementation Report — import a design's scale, not just its colour (+ the dock row)

**Plan**: `.claude/plans/figma-import-scales-and-dock.md`
**Branch**: `feature/figma-any-naming` (carries the two G1 commits `35c2c6c`, `d4b1a60`)
**Status**: COMPLETE

## Summary

`figma-pull.mjs` now brings a design's **spacing, radius, type ramp and shadows** across as well as
its colours, from a plugin export's dimension / shadow values — mapped by **rank** (the same
by-order discipline the colour roles use), all-or-nothing per family, with everything imported,
dropped, unclassified and auto-filled named in the pack header. `--map` was widened to pin any
contract token, and `--out` keeps fixture runs out of `system/`. The visible half shipped too:
`tokens.plusui.css` — someone else's design work, imported from a public Community Figma file — is
now selectable in the appearance dock, labelled as such.

`system/tokens.plusui.css` regenerates **byte-identical**, which is the regression this whole change
had to survive.

## Tasks completed

| Task | File | |
|---|---|---|
| 1–2 merge + baseline | — | merged `origin/main` (9 commits), re-verified the three gates |
| 3 fixtures | `tooling/figma/fixtures/{scales-dtcg,scales-partial,scales-tokens-studio}.json` | CREATE |
| 3 maps | `tooling/figma/maps/{fixture-scales,fixture-missing}.json` | CREATE (dir didn't exist) |
| 3b `--out` | `tooling/figma/figma-pull.mjs` | UPDATE |
| 4 `SCALE_ROLES` + `classifyDimension` | `tooling/figma/figma-pull.mjs` | UPDATE |
| 5 rank-fill + CSS formatting | `tooling/figma/figma-pull.mjs` (`fillScales`, `formatScale`) | UPDATE |
| 5 contract defaults | `agent-layer/gen-pack-css.mjs` (`loadContract` exported) | UPDATE |
| 6 shadows (DTCG + Tokens Studio) | `tooling/figma/figma-pull.mjs` (`collectScales`, `composeShadow`) | UPDATE |
| 7 `--map` for any token | `tooling/figma/figma-pull.mjs` (`readMap`) | UPDATE |
| 8 pack header | `tooling/figma/figma-pull.mjs` (`scaleNote`) | UPDATE |
| 9 structured return | `tooling/figma/figma-pull.mjs` (`scales` key) | UPDATE |
| 10 regression | — | plusui byte-identical |
| 11 dock row | `system/dock.mjs` | UPDATE |
| 12 pre-paint allowlist | `system/pack-boot.js` | UPDATE |
| 12b prewear allowlist | `system/pack-derived.mjs` (`COMMITTED`) | UPDATE — **not in the plan**, see deviations |
| 13 runbook | `docs/figma-runbook.md` | UPDATE |
| 14 shipped doc + regen | `system/figma-import.md`, `handoff/verdant/{figma-import.md,pack.bundle.json}` | UPDATE |

## Tests added

No suite exists (CLAUDE.md). Testing is fixture round-trips + a real-browser check, both repeatable
by a reader with no network and zero Figma request spend.

**Fixture round-trips** (`--out` to the scratchpad, nothing written into `system/`):

| Fixture | Result |
|---|---|
| `scales-dtcg.json` (19 dimensions, 3 shadows, 12 colours) | all four families fill at exactly-N. `spacing-xs 4px`, `spacing-4xl 96px`, `radius-lg 16px`, `type-display clamp(21px, 6vw, 40px)`, `type-body 16px`, `type-eyebrow 12px`, `shadow-lg 0px 12px 24px -4px #0000001a` |
| `scales-partial.json` (5 spacing, 12 type, 1 shadow, 0 radii, 1 unclassifiable) | type imports 8 of 12 (`display` = 60px largest, `eyebrow` = 14px 8th-largest), dropped `13,12,11,10px` listed; spacing/radius/shadow short → auto-filled, `spacing-md` stays the contract's `16px`; `opacity/subtle` reported unclassified |
| `scales-tokens-studio.json` | 3 shattered `boxShadow` groups reassembled into one CSS shadow each, ranked subtlest-first; the 4th group (no colour) skipped and **named**, not half-composed |
| `maps/fixture-scales.json` on `scales-partial` | `spacing-md 20px` and `shadow-lg 0px 16px 32px -8px #00000026` pinned — both in families too short to import, i.e. the count gate bypassed |
| `maps/fixture-missing.json` | exits **1**, message names `spacing-md`, the missing style and all 19 dimensions the file publishes; no file written |
| classifier unit cases | 10/10 (`Regular/size 5` → `null`, `Semi Bold/text-2xl` → `type`, `Elevation/High` → `shadow`) |
| a map pinning a slot in a family that **did** fill | pin wins, sibling ranks untouched (`spacing-lg` still rank 4), and the source records what it overrode |
| plusui `--offline` | **byte-identical** |

**Real browser (Chromium, Playwright, static-served)** — 15/15 assertions: fresh visit loads
neutral; four committed rows with Plus UI last; picking it re-points the head line and repaints
(`--color-accent #2563eb → #4f46e5` measured on `approach.html`); the choice survives a cross-page
reload **pre-paint** (checked at `waitUntil: "commit"`, so no neutral flash); the radio reflects it;
reverting to neutral restores the neutral value; **empty storage → neutral with zero JS errors**
(the VR-critical no-op); "your brand" appears fifth and rides the **neutral** base, not plusui; and
unwearing returns to plusui.

## Validation results

```
node tooling/drift-check.mjs          ✓  syntax · token-css · annotated-source · loc-summary ·
                                         system-graph · handoff · scenarios · traces
node tooling/token-lint.mjs           ✓  64 contract tokens · 0 undeclared · 0 orphan · DTCG valid
node agent-layer/gen-loc-summary.mjs --check   ✓  3 groups — no drift
git diff --quiet system/tokens.plusui.css      ✓  BYTE-IDENTICAL
git status --short tooling/visual-regression/  ✓  empty — no baseline PNG touched
ls system/tokens.chk-* / tokens.fixt*          ✓  none — --out held
```

**Visual regression, measured not reasoned** — `npm run update:docker` (the Linux baselines, in
Docker) on a clean tree: **18 passed, zero PNGs rewritten**. The fourth radio row lives inside
`.dock-panel { display: none }` and nothing at rest sizes off the fieldset, so at-rest renders are
identical across all 9 pages × 2 packs. AC13 holds locally; CI `verify` + `visual` are still read on
the PR rather than assumed.

Note for the portal drop-UI (`figma-drop-portal-ui.md`), which consumes this return: `scales.imported`
is keyed **only** by families that actually filled — a short family appears in `scales.short` and
nowhere in `imported`, so a consumer rendering all four families must read both keys.

## Deviations from the plan

1. **The pack header is silent when a read offered no scale at all** (rather than saying "the file
   offered no scale values"). Those two plan clauses contradict each other: any new header line on
   the REST path breaks AC7's byte-identity for `tokens.plusui.css`. Resolved by gating the whole
   scale block on "this read produced ≥1 valued dimension or shadow" — total silence when there was
   nothing to report — and printing the absence on **stdout**, which is not committed. Both AC6 and
   AC7 hold.
2. **A third allowlist was updated**: `system/pack-derived.mjs`'s `COMMITTED` (the prewear list).
   The plan named two. Without it, plusui is selectable but not *restorable* — unwearing "your
   brand" would drop the reader to neutral instead of the pack they had.
3. **`scales-partial.json` carries one shadow** (`Elevation/High`), where the plan said "no
   shadows". Task 7's own validate command pins `shadow-lg` to that style against this fixture, so
   the two were inconsistent. One shadow is also the better test: the family is still short (1 of
   3), which is exactly the "pin in an otherwise-short family" case AC5 asks for.
4. **`loadContract` is exported from `gen-pack-css.mjs`** rather than the importer re-reading
   `tokens.source.json`. The plan said to use "the existing `loadContract` path"; it was module-
   private. Exporting it is the one-source-of-truth reading.
5. **The "NOT imported" header line is derived from the fill decision, not from `genPackCss`'s
   `filled`.** `filled` only exists on the return, and the header is an *input* to that call. The
   fill decision is the thing that causes the auto-fill, so it is the source, not a parallel list —
   and `r.filled` is still what the structured return reports.
6. **`tooling/figma/maps/` did not exist** (the runbook referenced it, nothing had created it). The
   two fixture maps create it.
7. **`system/system-graph.json` still covers three packs.** Adding plusui there would change the
   rendered `#shape` exhibit on `factory.html` and churn VR baselines, which AC13 forbids. The
   generated note says "the three committed packs", which stays accurate. Left as a follow-up.

## Issues encountered

- The merge of `origin/main` brought `system/instance-pack.mjs` and touched `dock.mjs`; both were
  clean merges and the post-merge baseline was re-verified before any new work.
- `--color-accent` read on `index.html` is the hero's canned re-skin, not the pack's — the paint
  assertion was re-run on `approach.html` to measure the sheet itself.
- The `system/*` edits (+8 dock, +3 pack-derived) did not tip a `loc-summary` 100-line boundary;
  checked immediately after the dock change rather than at the end.

## Still open, deliberately

Fonts (G3), the parity artifact (needs a human in Figma), multi-layer shadows (first layer only,
stated in the header), and the public drop-to-re-skin exhibit — all recorded in the plan's own
"What this leaves open".
