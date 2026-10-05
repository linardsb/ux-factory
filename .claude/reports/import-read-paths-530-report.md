# Implementation Report — the import reads Brilliant through `read({ paths })` (#530)

**Plan**: `.claude/plans/import-read-paths-530.md`   **Branch**: `fix/import-read-paths-530` (worktree `wt-530`)
**Base**: 82054e0 → 82054e0 (`git fetch` at report time: `origin/main` unmoved, nothing to merge)   **Status**: COMPLETE

## Summary
Both live Brilliant reads moved from the retired `lookup` to `read`. The selection read is
`read {paths:[canvas], ids, format:"blueprint", expandInstances:true}` and Browse is
`read {paths:[canvas], format:"summary"}`. `parseLookup` is replaced by `parseRead`. It accepts exactly one
```` ```bl ```` fence and refuses everything else by name: the retired redirect, a second fence and a `films:`
line. `TOOLS` is now `init · get_selection · read · export`.

The whole `brilliant-live/` capture set was re-captured in one paired session on the owner's scratch canvas.
Every gate moved with it. A defect outside the plan surfaced along the way: Brilliant's text rows now carry
`lh(auto,1.21)`, which the converter threw on, so `import/brilliant.mjs` now reads an AUTO line height as null.

## Tasks completed
- 0.0 setup: `npm ci` in portal, tooling/icons, tooling/visual-regression and tooling/style-dictionary. `run-316 ready ✓ 12 checks` before any edit (observed).
- 0.1 the owner drew the canvas as project `scratch-import-probe` / canvas `main.bl`. It holds a #000000 rectangle with `rd(12)` and "PAY" with `spans[(0,3,#CFD5E1)]`. This differs from the plan's name; see Deviations.
- 0.2 `.claude/plans/import-read-paths-530-probe/scripts/capture530.mjs.txt` (CREATE) was run for passes A, B and C. Fifteen captures went into `import/fixtures/brilliant-live/` (CREATE/UPDATE) and the four `lookup-*.json` files were removed (`git rm`).
- 0.3 `import/fixtures/brilliant-live/README.md` (UPDATE): the header and a 17-row table.
- 1.1 `portal/lib/brilliant-mcp.mjs` (UPDATE): `TOOLS`, `parseRead`, `parsePage` (now returns `{elements, total}`) and the header.
- 2.1 `portal/lib/import-run.mjs` (UPDATE): both reads, the import line, the header, and `total` taken from `matchCount`.
- 2.2 `tooling/fake-brilliant-bridge.mjs` (UPDATE): the `read` routing, `UNRESOLVED = "9df0cbadf986e307"`, `lookup` → `lookup-retired.json`, and the header.
- 3.1 to 3.3 `tooling/build-checks.mjs` (UPDATE): 40.28, 42.15, 43.2, 43.3, 43.11, 43.12, 43.13 and the group 40/42/43 prose.
- 3.4 `tooling/canvas-journey.mjs` (UPDATE) `SELECTED`, and `tooling/run-316-ready.mjs` (UPDATE) check 7.
- 3.5 `.claude/references/gates.md` (UPDATE) § Groups 40, 42 and 43.
- Beyond the plan: `import/brilliant.mjs` (UPDATE) for `lh(auto,n)` → null, and canvas-journey I9's binding literal.

## Tests added
No suite (CLAUDE.md § Testing). New gate cases:
- 43.11: `parseRead` over both reads, with `.path === "main.bl"` and ids derived by converting the rows.
- 43.11: `read-unresolved` throws "Could not resolve".
- 43.11: the **retired lookup** is refused with `no single` plus "There is no tool named lookup" (AC #4).
- 43.11: SYNTHETIC two-fence and `films:` cases.
- 43.12: SYNTHETIC empty `_meta` project reads `source.project` null. This restores the record-level half of the null-project coverage the named capture moved.
- 43.11: `parsePage` returns `{elements:[rect, PAY], total: 2}`, the tool list has 23 names including `edit`, and `list_projects` names the one project.
- 43.12: **end to end**, a read answered with `lookup-retired.json` throws naming `lookup` and writes nothing (AC #4).
- 43.2: `edit` and `lookup` are denied before a byte reaches the fake (six denials).
- 40.28: the fence's three lines are asserted before slicing, and the PAY text's `lh(auto,1.21)` reads `lineHeight` null.

## Proving the checks
Harness: apply one mutation, run the named gate, restore (`scratchpad/mut.py`; the tree was restored after every case, confirmed by `git status`).

| # | Mutation | Went red (observed) |
|---|---|---|
| R1 | `spans[` line deleted from `read-blueprint-two.json` | 40.28 positive control ("the capture LACKS the annotation") + the spans-row case |
| R2 | one byte flipped in `export-png.json`'s PNG | 42.15 (decoded to nothing), 43.11, 43.15 |
| R3a | `lookup` added to `TOOLS` | 43.2 allow-list deep-equal; "lookup reached the fake bridge as a tools/call" |
| R3b | `edit` added to `TOOLS` | 43.2 "edit reached the fake bridge as a tools/call" |
| R4 | `parseRead` returns `textOf` raw (fence test bypassed) | 43.11 ids include "```bl"; retired lookup threw ""; parsePage not JSON; 43.12 ids (17 failures) |
| R5 | `import-run.mjs` selection read back to `"lookup"` | 43.12 ×5: "lookup is not one of this run's tools" (the fence denies it) |
| R6 | SYNTHETIC page without `matchCount` | 43.13 "total 2" |
| R7 | `TOOLS` back to `lookup` | `run-316 ✗ check 7 — … not the four read tools [...,"read",...]` |
| R8a | `lh(auto,…)` branch removed | 40.28 throws `unparseable value: auto,1.21` (6), group 43 (4) |
| R8b | `lh(auto,n)` parsed as the number | 40.28 "lineHeight {"value":1.21,"ref":null}" |
| R9 | `films:` refusal removed | **first run: stayed green**. The no-single-fence throw also quotes the `films:` line. The assertion was tightened to the refusal's own words (`read listed films above the fence (films: Motion/Launch.bm)`) and then went red. |
| R10 | multi-fence refusal removed | 43.11 "a read answering two fences threw null" |
| R11 | `bindingOf` keeps an empty project name (`p.name ?? null`) | 43.12 SYNTHETIC empty project wrote `source.project ""` |

R8a, R8b and R9 were re-run after the `lh(auto` regex rewrite and the `films:` scope change below, and all three are still red (observed).

Positive controls:
- **AC #4**: the committed `lookup-retired.json` is real Brilliant output, and it is refused.
- **40.28**: the annotation-free read is still the existing control.
- **The lh rule**: spike C's bound `lh(1.5:$font.lineHeight.normal)` still reads `{1.5, ref}`. A direct convert showed this (observed), and `node import/regen-expected.mjs` plus `node tooling/regen-import-records.mjs` produce no diff outside `brilliant-live/` (observed: `git status import/fixtures/` showed nothing else).

## Validation results
All observed:
- Level 1 syntax: `node --check` on all seven touched `.mjs` files, no failure.
- Level 2:
  - `node tooling/build-checks.mjs` → `build ✓ all 52 groups pass`, on the final staged tree.
  - `node tooling/drift-check.mjs` exit 0: `drift-check ✓ syntax · token-css · … · group-count`.
  - `node tooling/token-lint.mjs` exit 0: `63 contract tokens · 0 undeclared · 0 orphan`.
  - `node agent-layer/gen-loc-summary.mjs --check` after staging → `loc summary ✓ 3 groups — no drift`.
- Level 3: `node tooling/canvas-journey.mjs all` → chromium 259/0, firefox 258/0, webkit 258/0. It spawns its own portal on an OS-chosen port. It was run twice, the second time on the final tree after the post-review changes, with the same counts. build-checks, drift-check, token-lint and the loc check were also re-run on that final staged tree, all ✓ (observed).
- Level 4, live ($0, the owner's paired tab, rectangle and PAY both selected):
  - `node tooling/canvas-journey.mjs chromium --live-brilliant` passed 9/0. L2 Import selection wrote a record that passes checkRecord, plus a PNG `reference.png` and one `component.propose` line, into the journey's scratch jobs dir. L4 Browse showed ≥ 1 tile. L5 found git status unchanged.
  - The journey asserts shapes only, so a direct `readBrilliant({})` against the real bridge followed. It returned ids `["d37836a642d995ba","ac97393dda604ee1"]`, project `scratch-import-probe`, an 885-byte reference, tools `init:true get_selection:true read:true export:true`, and `lh(auto` present with the PAY `lineHeight` null.
- `node tooling/run-316-ready.mjs` → 11/12 before the commit, where only check 6 (clean tree) was red on the staged change. After the commit it gave `run-316 ready ✓ 12 checks` (observed).
- Portal smoke on a private port 47930 → `/api/health` `{"ok":true,…,"stale":false}`; killed by PID.
- Probe sweep ($0): every probe blueprint read of the real designer's email canvas (`raw/04, 05, 06, 11, 15`) goes through `parseRead` + `convert()` with no throw. Their `unread-atom` drops are pre-existing classes and are listed under Issues.

## Not run
- Live Import selection and Browse **in the portal UI by hand** (plan Level 4 bullet 2). The `--live-brilliant` leg drives the same UI routes in a real portal over a scratch package copy, against the real bridge, and the direct `readBrilliant` confirmed the content. Owner's call whether a hand pass is still wanted.
- Visual-regression pixel gate: no shipped page changed. `portal/` and `tooling/` are not in the VR set.

## Deviations from the plan
- **Canvas name.** The owner drew project `scratch-import-probe` / canvas `main.bl`, not `Scratch/Import probe`. The capture guard requires both names; its first run under the plan's guard exited before writing anything (observed `init bound "main.bl"`). Every `Scratch/Import probe.bl` in the plan reads `main.bl`. The project is **named and public** (`list-projects.json` carries `visibility: public` and its `brilliant.design` URL). It is committed as the owner's scratch canvas, per A1.
- **`import/brilliant.mjs` changed (plan error).** The plan said not to touch the converter beyond the fence. The rows changed too: `lh(auto,1.21)` threw, so any live text import failed (AC #1). The converter now reads `lh(auto,<finite number>)` as null, with the reason in the header's "THREE CONVENTIONS" block. Any other `lh(auto…)` still throws. Logged in AMENDMENTS.
- **canvas-journey I9 literal (plan error).** The plan listed only `SELECTED` for this file. I9 pinned "this tab's project (name not exposed)", the null-project rendering, and the named capture moved it to `scratch-import-probe · web`. The page's null-project branch has **no journey coverage now** (43.12's SYNTHETIC case still covers a named override at the record level).
- **gates.md § Group 42 (plan error).** § Group 42 carried `790×402` as well as § Group 43's `2155`. Both moved, and `grep lookup gates.md` now hits :80 as well as :72 because the denied list names `lookup`. Logged in AMENDMENTS.
- **Fixture README's "Verbatim" paragraph.** The plan said to keep it unchanged, but its PNG sentence described #311's strip-and-restore, which is false for this set. The script kept the base64 whole and checked its sha256 before writing. The sentence now states both.
- **`gen-loc.mjs` (plan error).** The file is `agent-layer/gen-loc-summary.mjs`.
- **gates.md § Group 43 was mirrored beyond 3.5's "make no other edit".** 3.3 added a cannot-reach clause and the AC #4 cases to the `group()` string, so § 43 now carries them too, keeping the gate prose in step across its copies.
- **43.11 `films:` assertion** is stricter than the plan's "message contains `films:`". That wording could not fail (R9).

## Assumptions carried
- A2 holds: `read-page.json` is top-level only (`matchCount 2`, no `parentId` keys), so the `!parentId` filter does not fire on the capture.
- A4: the probe's `raw/` stays untracked. The probe dir's `.gitignore` (`raw/`) is committed so it stays out.
- `truncated` stays `all.length > BROWSE_MAX` (plan 2.1).
- The unresolved read used the fill id `9df0cbadf986e307`. It answered `isError` "Could not resolve" with `paths` sent, so the `0000…` fallback was not needed (observed).

## Additions beyond the plan
- **Post-review hardening (advisor F1).** The first `lh(auto` test, `/^auto,\s*[^,]+$/`, had two overlapping quantifiers. That shape is what CodeQL's `js/polynomial-redos` check flags, and a dropped `.txt` reaches `convert()` through the portal's HTTP body. It also accepted `lh(auto, )`, because `Number(" ")` is 0. It is now `a.startsWith("auto,") && /^\d+(\.\d+)?$/.test(a.slice(5).trim())`. `lh(auto, )`, `lh(auto)` and `lh(auto,$x)` all throw now (observed). CodeQL was not run locally; the overlap was removed rather than proven safe.
- The `films:` scan now reads only the text before the first ```` ```bl ````, as the plan scoped it. Before this change it scanned the whole reply.
- The 43.16 message that described "the committed brilliant-live shape: 395 → 790" now names #311's shape before #530 re-captured it at scale 1.
- `capture530.mjs.txt` writes the PNG base64 whole after a sha256 check rather than stubbing and restoring it. The result is the same verbatim bytes with one fewer manual step.
- The converter header's first line now says `read` (fence stripped by brilliant-mcp.mjs) instead of `lookup`.

## Issues encountered
- Unread atoms on the real designer's canvas (probe 11, read only, not committed). They are pre-existing classes the converter records as `unread-atom` drops, not new with #530: `clip` ×33, `ext(…)` ×~45, unbound font sizes (`12/14/16/28/36`), raw family names (`Inter v3`, `Roboto Mono`), `valign(c)`, `pos(i)`, `join(m)`, and a bare `r` ×2 (context not inspected). #316's real run will meet these as drop rows, not throws.
- `.claude/plans/import-read-paths-530.html` is left untracked. It came from the planning session; whether to commit it is the owner's call.
