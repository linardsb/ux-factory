# S5 — the Figma house plugin

**Real run, 2026-09-26, 11:27 local (`raw/spike-list-row.export.json`).** Ticket [#310](https://github.com/linardsb/ux-factory/issues/310) ·
epic [#295](https://github.com/linardsb/ux-factory/issues/295) · `docs/epics/canvas-design-import.architecture.md`
§ Spikes item 4. Executable plan `.claude/plans/figma-plugin-s5-converter-310.md`.

The fixture was **built for the test**, not drawn by a designer. The plugin's **Build S5 fixture** command
created the variables, the component set and every binding from the plan's Task A5 recipe, and the owner then ran
**Export selection**. *Derived, not reported:* the owner did not name the path. The file-list screenshot is
11:17 and the export 11:27; ten minutes fits Build (about 5) and not the hand recipe (30–45). The census shows the
recipe's exact names and values either way. So this run answers whether a plugin can **read**
auto-layout and variable names. It does not show how a real designer binds (PRD § Assumptions; #316's real run).
The export is committed verbatim: `cmp` against the owner's download reported no difference. `census.txt` is the
plan's Task A6 command output, verbatim.

## Verdicts

| Q | Verdict | Evidence |
|---|---|---|
| **Q1 — does the dump carry auto-layout props?** | **Yes.** 3 of 8 nodes are auto-layout (`Spike List Row` HORIZONTAL, `Text block` VERTICAL, `Status chip` HORIZONTAL). Each carries `itemSpacing`, all four `padding*`, both axis alignments and both `layoutSizing*` values, and the values are the recipe's (root gap 16, pad 16×4, `FIXED`/`HUG`; chip pad 4/8/4/8, `CENTER`/`CENTER`, `HUG`/`HUG`; Text block `FILL`/`HUG`). | `census.txt:1-2` |
| **Q2 — `boundVariables` with resolved names, and where paint bindings sit** | **Yes: 29 aliases, 29 resolved to a name, 0 UNRESOLVED.** Every name is the recipe's (`spacing/md`, `color/text/primary`, `radius/full`, `font/size/md` …), and every one reports collection `ux-factory`. **Paint bindings sit at both levels.** Each of the 6 bound fills appears once as a node-level array (`boundVariables.fills[0]`) and once as a per-paint binding (`fills[0].boundVariables.color`), with the same id. That is 17 scalar + 6 + 6 = 29. | `census.txt:3-32`; `.variables` in the export |
| **Q3 — the branch** | **Branch 1: deterministic.** Decision table row 1: auto-layout props are carried, and every alias resolves, with at least one alias in each family the recipe binds: spacing (`census.txt:4`), colour (`:9`), radius (`:22`), type (`:13`). Refs are filled the same way as Brilliant's. | `census.txt` |
| **Q4 — text bindings: alias or array?** | **Array.** `fontSize` and `fills` on each TEXT node are one-entry arrays of `VARIABLE_ALIAS` (`boundVariables.fontSize.0`). The converter reads an array only when every entry is the same id (plan F2). | `census.txt:13,16,29`; `.selection[0].children[1].children[0].boundVariables` (Text 1) |
| **Q5 — transport** | **Download worked.** The file landed in `~/Downloads` as `spike-list-row.export.json`, named by the UI from the selection. Copy was not needed and is untested. **The manifest `id` was accepted as committed**: the plugin files' hashes below match commit `0307940`, and the working tree was clean after the run. Build's closing message was not reported, but the census shows all 23 of the recipe's bindings present, so no `NOT BOUND` list was owed (derived). | `git status` after the run; the Setup table |

## What the export does not bind (so `source.bound` is expected false on branch 1)

Branch 1 is decided by "every alias resolves", not by `bound`. The recipe itself leaves these slots unbound:

- `Text 2` line height: `{"unit":"PERCENT","value":150}` with no alias (the recipe says "line height 150 %", unbound).
- `Text block` padding: `0,0,0,0`, unbound (the recipe says "padding 0").
- `Status chip` gap: `0`, unbound (the recipe says "gap 0").
- Font family on every text: `Inter`. The recipe binds sizes, not families.

Under the plan's F3 rule, the three unbound zeros/defaults arrive as absent, not as losses. The line height arrives as
`tok(1.5, null)`, for the snap step.

## Geometry (checked before the census)

`caret-right` is 8.73 × 16, `Avatar` 32 × 32 and the root 360 × 76, the recipe's sizes (`.selection[0]` and its
children's `width`/`height`). The chevron's long axis is the one the glyph box reads, and it matches spike C's
`s(8.73,16)`.

## Cross-source: the same drawing through both converters

The committed verdicts `import/fixtures/spike-c-instance.expected.json` (Brilliant) and
`import/fixtures/figma/spike-list-row.expected.json` (Figma), node by node. Nothing was tuned to make these match
(recognise.mjs R1–R4). Build-checks 40.19 asserts the Figma column by path.

| Node | Brilliant | Figma | Why they differ |
|---|---|---|---|
| root (the person row) | `list-row`, scored 0.575 (name-match + prop-fit on `label`) | **`list`, scored 0.7** (name-match + kind-fit on `layout`) | The Figma root is auto-layout (`HORIZONTAL`), so it has a layout and `list` earns kind-fit on it beside the name match ("Spike List Row" holds "list"). Spike C's root line carries no `al()`, so there `list` scored the name match alone (0.45). `list-row` still scores 0.575 in Figma and comes second. **The emitted set does not change.** `build()` over every node of both verdicts (40.6's sweep, run by hand) emits `stack`, `text` ×3 and `icon` for both sources. Both roots are refused: Brilliant's for `list-row.value`, Figma's for `list.empty` (plus the chip's `status-chip.value`), observed 2026-09-26. **The read is the owner's:** whether an auto-layout row component should read as a list. |
| Avatar | floor, 0.45 | floor, 0.45 | same |
| Text block | `stack`, structural fallback | `stack`, structural fallback | same. The Figma pad is absent (an unbound 0, F3). Brilliant's is a `no-token` drop for `$spacing.none` |
| Text 1 / Text 2 | `text`, scored 0.95 | `text`, scored 0.95 | same, by role through the bound size. Figma reads `Inter` with `ref: null` (the recipe binds no family) and the text sizing as `hug` (Brilliant: `fill`) |
| Status chip | `status-chip`, scored 0.575 | `status-chip`, scored 0.575 | same |
| Text 3 | `text`, scored 0.95 | `text`, scored 0.95 | same |
| Chevron / `caret-right` | `icon`, scored 0.5 | `icon`, scored 0.5 | same. 8.73 × 16 reads `md` in both |

## Setup

| | |
|---|---|
| Figma desktop | 126.9.10 (`CFBundleShortVersionString` of `/Applications/Figma.app`), Free plan |
| Figma file / page | `ux-factory S5 spike` / `Page 1` (`.source` in the export) |
| Plugin | `tooling/figma/plugin/` at commit `0307940`: `code.js` sha256 `ea8dad707cb1…`, `manifest.json` `8f25ec402f77…`, `ui.html` `207a8216fb4d…` |
| Manifest id | `ux-factory-house-export`, as committed |
| Fixture built by | the **Build S5 fixture** command — *derived* from the 10-minute window (screenshot 11:17, export 11:27), not reported by the owner |
| Export | `raw/spike-list-row.export.json`, 15 417 bytes, sha256 `b61fa79d4c0c6dcf…` |
| Fixture copy | `import/fixtures/figma/spike-list-row.export.json`, byte-identical (`cmp`), sha256 `b61fa79d4c0c6dcf…` |
| Variables | 13 in the export, all in the collection `ux-factory`: the recipe's 7 FLOAT + 6 COLOR |

## Not done

The fixture does not exercise these, so the converter's handling of them is covered only by synthetic cases:

- `SPACE_BETWEEN` / `SPACE_EVENLY` / `SPACE_AROUND` main alignment and `BASELINE` cross alignment
- `layoutMode: "GRID"` and `layoutWrap: "WRAP"` (the dump carries `layoutWrap` as Figma reports it; here every auto-layout node reports `NO_WRAP`)
- `effects` (none drawn), strokes (none drawn), `dashPattern`
- mixed text (`fontSize: "mixed"`), a hidden layer, an unresolved library variable
- Copy in the plugin window (Download worked, so Copy was never needed)
- whether a real designer binds like the recipe; the read is the owner's, and #316's real run tests it

## Files

- `raw/spike-list-row.export.json`: the owner's export, verbatim
- `raw/census.txt`: the plan's Task A6 census over it, verbatim
