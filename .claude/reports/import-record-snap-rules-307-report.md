# Implementation Report — the import record and the snap rules (#307)

**Plan**: `.claude/plans/import-record-snap-rules-307.md`   **Branch**: `feature/import-record-snap-rules-307` (worktree `../wt-307`)   **Base**: `9aebeb7` → `9aebeb7` (origin/main did not move; `git log HEAD..origin/main` empty, observed)   **Status**: COMPLETE

## Summary

This change adds four modules under `import/` and `tooling/`:

- **`import/fidelity.mjs`**: S3's rung-6 wrong-but-green detector (the ink-colour ΔE of each part), lifted from the spike. It has one stated fix: when a text disappears from the candidate, the part now reads high instead of 0.
- **`import/snap-rules.mjs`**: matches each unbound value to a contract token. There are three outcomes (exact, proposed, dropped), plus a per-source override table keyed by the file's sha256.
- **`import/report.mjs`**: the import record. Its drops, snaps, unbound counts and verdict are all derived, and a validator refuses any record whose stored copy disagrees. It also checks O3b and folds the record into markdown.
- **`tooling/regen-import-records.mjs`**: generates the two fixture records.

The converter now carries unbound spacing through to the snap step. `stackShape` records an unsnapped gap as a drop instead of emitting `gap: null`. Build-checks group 42 gates all of it.

## Tasks completed
- T1 `import/fixtures/s3/` (CREATE) — 7 byte copies; `cmp` silent on all 7 (observed)
- T2 `import/fidelity.mjs` (CREATE)
- T3 `import/ir.mjs` (UPDATE) — `no-snap-target`, `unmapped-role`, `no-contract-role`
- T4 `import/brilliant.mjs` (UPDATE) — unbound spacing → `tok(value, null)`, header "THREE DELIBERATE CHANGES"
- T5 `import/recognise.mjs` (UPDATE) — `stackShape` guard; R4 re-pointed to #456
- T6 `import/snap-rules.mjs` (CREATE)
- T7 `import/fixtures/polaris-unbound.ir.json`, `import/fixtures/overrides/4a80dd5f…aa5.json`, `import/overrides/README.md` (CREATE)
- T8 `import/report.mjs` (CREATE)
- T9 `tooling/regen-import-records.mjs` + `import/fixtures/records/spike-c-{wrong-but-green,faithful}.{json,md}` (CREATE / GENERATED)
- T10 `tooling/build-checks.mjs` group 42 (UPDATE), tally → "all 42 groups pass"
- T11 group 40 prose, `.claude/references/gates.md` (count, group 40 re-points, new group 42 paragraph), `CLAUDE.md` (map, count ×2, two bullets), tracker **#456** opened
- T12 Linux floor written into `fidelity.mjs`'s THRESHOLD comment (the plan's measured 2.0709; not re-run, as the plan directs)
- T13 Node 24 / Linux determinism check (below)

## Tests added
Build-checks group 42, cases 42.1–42.12, all green: `node tooling/build-checks.mjs` → `build ✓  all 42 groups pass` (observed, macOS Node 20.20.2 and Linux Node 24.21.0).

## Proving the checks
Each mutation below was applied by a scratch harness, the full build-checks run was taken, and the source was restored. All 17 turned their named case red (observed). Four rows (42.5b and 42.11c–e) were added after review: the first 13 did not cover the pad halves of Tasks 4 and 5, the shared-side write, or the per-row class check.

| Mutation | Case that went red (first line) | Positive control |
|---|---|---|
| `ciede2000` default `kH = 2` | 42.1 "Sharma pair 1 … reads 1.3175, the paper says 2.0425" (+ 42.2/42.6/42.8/42.11 downstream) | pairs match to 4 dp unmutated |
| `THRESHOLD = 20` | 42.2 "m1-wrong.png (worst 17.9597) reads green against THRESHOLD 20" | faithful 0.8716 and WebKit 2.6888 read green |
| revert D2 (`inkA.mean && inkB.mean ? … : 0`) | 42.3 "a region whose text vanished scored 0" | 25.278 unmutated |
| `fidelityVerdict` green when `deltaEMin` absent and WCAG passes | 42.4 "fidelityVerdict(deltaEMin null, wcag 12/12) reads green" | the other five empties read missing |
| `checkRecord` skips the completeness compare (`n = 0`) | 42.5 "a record missing a drop row was accepted … NO THROW" + the hollowed-tree case | 42.5 control: both committed records pass `checkRecord` |
| one space appended to `spike-c-faithful.md` | 42.6 "the committed import records drift: …spike-c-faithful.md" | `--check` no drift unmutated |
| O3b compares reference to reference | 42.7 "O3b refusal did not fire" (the mutation also refused the committed pair) | the two committed records accepted |
| tolerance `<` for `<=` | 42.8 "9 exact / 1 proposed / 10 dropped" + rows 9, 12 and 19 named | 20 rows 9/4/7 unmutated |
| `proposed` writes `ref` | 42.9 "a near match resolved silently" ×4 | the exact Badge radius fills `--radius-sm` |
| override rewrites every same-slot row | 42.10 "the override changed [5 rows]" | exactly 2 rows change unmutated |
| revert Task 4 (converter) | 42.11 "the converter read g(12) as null with rows [no-token]" | `{value:12, ref:null}` unmutated |
| revert Task 5 (`stackShape` guard) | 42.11 "built as {…"gap":null…} with rows []" | the `no-token` row is recorded unmutated |
| unfreeze `TOLERANCE` | 42.12 "snap-rules.TOLERANCE is not frozen" | the frozen probe passes on six tables |
| drop `checkRecord`'s per-row class check | 42.5 "a row re-classed in the verdict tree AND the stored list was accepted … NO THROW" | the committed records pass |
| revert Task 4's pad loop (converter) | 42.11 "the converter read pad(16) as null" + the pad build case + the one-side override | four `{value:16, ref:null}` sides unmutated |
| `false` the `stackShape` pad guard | 42.11 "the unsnapped pad built as {…} with rows [no-token@layout.gap, prop-shape@layout.pad]" | one `no-token` row on `layout.pad`, no `pad` prop |
| snap write sets `.ref` on the existing object | 42.11 "an override on layout.pad[0] alone left the sides as [--spacing-lg ×4]" | `[lg, md, md, md]` unmutated |

The drivers were proven as well:

- **42.6's ragged-table detector** is itself controlled: a synthetic `| x |` row under a two-cell header must be caught before the records are read.
- **42.3's mutation**: the verdict still read red, but through `text-block`, not `subtitle`. The painted subtitle also changes the ink mean of the enclosing text-block region. The assertion is on the subtitle's own value, so the case still names the hole.

## Validation results
- L1 `node --check` over `import/*.mjs`, `tooling/regen-import-records.mjs`, `tooling/build-checks.mjs` — no FAIL (observed)
- L2 `node tooling/build-checks.mjs` → `build ✓  all 42 groups pass` (observed); `node import/regen-expected.mjs --check` → `expected verdict ✓ … 55884 bytes` (observed, unchanged from before the ticket); `node tooling/regen-import-records.mjs --check` → `✓ … 4 files, 185155 bytes, no drift` (observed)
- L3 `node tooling/drift-check.mjs` → `drift-check ✓ … group-count` (observed; it needed `cd tooling/style-dictionary && npm ci` in the fresh worktree); `node tooling/token-lint.mjs` → `✓ 63 contract tokens · 0 undeclared · 0 orphan` (observed); `node agent-layer/gen-loc-summary.mjs --check` after staging → `loc summary ✓  3 groups — no drift` (observed)
- T13 `docker run --platform linux/amd64 node:24` with the checkout mounted read-only, running `regen-import-records --check`, `regen-expected --check` and the full `build-checks`:
  - output: `v24.21.0 · import records ✓ no drift · expected verdict ✓ · build ✓  all 42 groups pass` (observed)
  - driver check: the container printed `v24.21.0`, so a different Node really ran.
  - a full-precision ΔE sum over 1,376 colour pairs (86 red steps × 16 green steps) was bit-identical between Node 20 and 24 (observed). The plan's 6.03e-14 figure was **not** reproduced by that probe, and I did not re-run the plan's region-level measurement. The 4 dp rounding stays as the stated guard.
- Portal smoke: `PORT=4791 node server.mjs` → `/api/health` `{"ok":true,…,"bootSha":"9aebeb7…","stale":false}` (observed, served from this worktree); killed by PID.
- L4 manual: read `spike-c-wrong-but-green.md` in full. It shows the wrong-but-green line, 12/12 WCAG beside the red ΔE, the chevron named as excluded, and six mapping drops under their two classes.

## Not run
- **Task 12 Linux re-capture.** The plan records the floor as already measured (2.0709) and tells the implementer not to re-run it. The figure is carried, not re-derived.
- **L5 CodeQL.** It runs in CI on the PR. `readOverrides` refuses any file name that is not 64 hex characters before joining it to the directory.
- **Posting S3's verdict to epic #295 (Q2).** That is the owner's hand. The drafted text is in the plan's Q2.
- **Visual regression.** No shipped page changed.

## Deviations from the plan
- **(plan error) The degenerate exclusion string has no `%`.** It is now `name(ink share X > 0.5)` instead of S3's `ink 55.0% > 50%`, because Task 8 and 42.6 forbid `%`. No committed region is degenerate.
- **(plan error) 42.6's `%` assertion is on the template, with drop reasons removed.** One reason quotes `list-row.value`'s spec description verbatim (`"94%"`). The JSON and md keep it as written.
- **(plan error) `measureImages(A, B, regions)` is exported beside `measure`.** 42.3 paints pixels in memory, and the module has no PNG encoder. `measure` decodes, hashes and calls it.
- **(plan error) The Sharma pairs were not listed in the plan.** I used Sharma 2005 pairs 1, 7, 17, 25 and 34. All five match the plan's five values to 4 dp.
- **(plan error) Task 11 named 5 `#307` sites; more needed re-pointing.** The sites changed, from `git diff`:
  - build-checks group 40: the header's cannot-reach clause, the directory-sweep comment, the 40.3 note and its failure message, the 40.4 "will move" note, the 40.16 comment, the 40.18 failure message, and three places in the `group()` string.
  - gates.md group 40: three places.
  - `recognise.mjs` R4: two.
  - `brilliant.mjs`: the header convention, the removed reason string, and line 458.
  - `ir.mjs` invariant 1.
  - Three of these said "#307's converter" for what is #310's: 40.16, its group-string twin, and `brilliant.mjs:458`. gates.md had the same phrase, fixed too.
- All five are logged in the plan's AMENDMENTS.

## Assumptions carried
- Q1 rung 6 over rung 2 (D1). The owner's call; the PR body flags it.
- Q3 type targets are TYPE_ROLE_PX's four roles.
- Q4 the fixture override lives in `import/fixtures/overrides/`.
- Q5 `unbound` counts per record.
- The faithful record's WCAG overlays S3's `packs.faithful.values` (four roles) on neutral, as S3's own probe did. The result is 12/12, matching `raw/wcag.txt`.
- The regenerator reads no `import/overrides/`, so an owner's fix cannot move a gate fixture.

## Additions beyond the plan
- **`path: "mapping"` on mapping drop rows.** Without it, those rows rendered as "at —" in the md. It is derived in one place (`derivedDrops`), which both `buildRecord` and `checkRecord` call.
- **`source.sha256` and `deltaEMin.candidate.file` in the record.** The md's Source section shows the hash the override table keys on, and the candidate's file makes the render traceable.
- **`checkRecord` also refuses** a stored `snaps` that disagrees with the IR's `node.snaps`, and a `source.bound` that disagrees with `ir.source.bound`. Both are derived fields, which is D8's rule.
- **`wrongButGreen(f)` is exported** so the md fold and any caller share one predicate.
- **A no-family or non-numeric unbound value drops with a reason** instead of throwing.
- **42.5 has a case the plan did not list:** a class flipped in both the verdict tree and the stored list. It is the only input the per-row `DROP_CLASS_OF` check can refuse, because the derived compare agrees there. Without it the check would be unreachable in the gate.
- **42.11's synthetic line gained `pad(16)`,** with three assertions: the unbound pad reaches the IR, `stackShape` refuses it, and a one-side override leaves the other three sides alone.

## Issues encountered
- **The plan's `.html` companion is committed beside the `.md`.** `git ls-tree origin/main .claude/plans` holds 10 `.html` files, S3's own plan among them, so there is precedent. It was the owner's file, not produced in this run.
- **The fresh worktree needed `npm ci`** in `tooling/icons` (group 41's drift leg), `tooling/style-dictionary` (drift-check) and `portal` (the smoke). This is the known fresh-worktree cost; none of it is committed.
- **`structuredClone` keeps the converter's shared pad-side object.** Every snap write puts in a fresh `tok()` rather than setting `.ref`, so an override on one side cannot change all four.
