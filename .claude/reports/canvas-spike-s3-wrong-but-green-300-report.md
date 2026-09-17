# Implementation Report — S3, the wrong-but-green detector (#300)

**Plan**: `.claude/plans/canvas-spike-s3-wrong-but-green-300.md`
**Branch**: `feature/canvas-spike-s3-wrong-but-green-300` (worktree `~/Desktop/Linards_current/wt-s3-300`)
**Base**: `6687f8e` → `6687f8e` (unmoved; the plan cites `2e6aabd`, which S2's PR #428 superseded before this ran)
**HEAD**: `b504a26`   **Status**: COMPLETE — except Task 13 (PR) and Task 14 (epic comment), both owner-gated

## Summary

Built the detector the import report lacks: per-pixel CIEDE2000 in CIELAB, aggregated down a six-rung
pre-committed ladder at three region granularities, between Brilliant's own rendering of a committed
fixture and this repo's rendering of the same element under two role maps. **Rung 1 — E4 verbatim —
reads the deliberately wrong mapping GREEN (1.6638 against a 1.3089 floor, needing 2.3). Rung 2 (p95)
fires first, at 3.76x; rung 6 (ink-colour ΔE) fires at 20.6x. WCAG stays 12/12.** The verdict is
therefore "green on rung 1, red on rung 2", which is neither leg of the epic's decision rule and is
reported as itself — closer to the green leg, because E4's *idea* separates the defect and only E4's
*aggregation* cannot. Nothing ships; every file is under `.claude/plans/canvas-spike-s3/`.

## Tasks completed

- [1 + 1a] branch + dedicated worktree, one command → `~/Desktop/Linards_current/wt-s3-300` (merged, see Deviations)
- [2] plan committed first, alone → `65815a3` (CREATE)
- [3] the role map, drop list and both packs → `.claude/plans/canvas-spike-s3/mapping.json` (CREATE)
- [4] the Playwright capture driver → `.claude/plans/canvas-spike-s3/capture.txt` (CREATE)
- [5] capture run, fixture committed → `fixture/*.png`, `fixture/regions.json`, `fixture/harness-*.html.txt` (CREATE)
- [5a] faithful render on firefox + webkit → `fixture/m1-faithful-{firefox,webkit}.png` (CREATE)
- [6] zero-dep PNG decoder → `compare.txt` part 1 (CREATE)
- [7] CIEDE2000, blur, the six-rung ladder, R2 + F4 → `compare.txt` parts 2–3 (CREATE)
- [8] eleven controls, two halves → `controls.txt` (CREATE)
- [9] the comparison run → `raw/deltae.txt` (CREATE)
- [10] `checkPairs` over both packs → `wcag-probe.txt`, `raw/wcag.txt` (CREATE)
- [11] the verdict document → `.claude/plans/canvas-spike-s3/README.md` (CREATE)
- [12] no generated output moved, proven with its positive control (see Validation)
- [13] commits — three, per the plan's rhythm. **PR not opened** (see Not run)
- [14] epic comment — **not posted** (see Not run)

## Tests added

No suite exists in this repo. The test layer is the control battery, `controls.txt`, run pristine and
mutated with both halves verbatim in `raw/controls.txt`.

- **Half 1: 11/11 held.** C1 C2 C3 C4a C4b C5 C6 C7 C8 C9 C10.
- **Half 2: nine went red under their own mutation.** C6 has no mutation by design; C8 stays green by
  design (its mutation collapses the *signal*, not C8 — the plan says so and the run records it).
- `grep -c "DID NOT APPLY" raw/controls.txt` → **0** (observed).

## Proving the checks

| check | mutation | what went red | positive control |
|---|---|---|---|
| C1 CIEDE2000 vs skimage | delete `R_T` | max abs diff 8.88e-14 → **14.545** | 500 fixed-seed random pairs + the four named hex pairs, all within 5e-5 of the plan's values |
| C2 decoder content | Paeth → `v += a` | `#000000 → #ffdd00`, 4 of 12 blocks wrong | 12 known flat colours, every one exact |
| C3 identity | candidate offset one row | 0.0e+0 → **39.91** (`title` rung 3) | `--self ref.png`: every rung 0, score 1.0000 across all 3 granularities |
| C4a exact swap, synthetic | ink threshold 2.3 → 1.15 | 18.215350195 → **13.105** | equals ΔE(#454545,#0c3b2f) to 9.9e-14 |
| C4b coverage identity, real region | ink mean diluted over the region (`/n`) | 6.397057509 → **0.301** | recolour half the core: identity still holds at 17.6% coverage, \|diff\| 3.1e-15 |
| C5 empty measurement | restore `sum/max(len,1)`, remove both refusals | the throw stops firing | `aggregate([])` throws naming "an empty measurement is missing, never a pass" |
| C6 metric agreement | none, by design | — | CIEDE2000 and Oklab both name `subtitle` |
| C7 boxes on the right content | shift every box +20 px | `avatar` modal `#f2f5fa → #f8f8f8` | avatar `#f2f5fa`, chip `#f1f7f2`, both as the fixture's own literals |
| C8 harness integrity | substitute `m1-faithful` for `m1-wrong` | **stays green by design**; the signal collapses (title 1.6638 → 1.3089) | four drop regions identical to 0.0e+0 |
| C9 rung 6 registration-invariance | rung 6 → per-pixel ink | Δ 0.0000 → **7.1361** under a 1 px shift | pristine: rung 6 moves 0.0000 while rung 5 moves 7.1361 |
| C10 rung 6's limitation | core-only ink mask (2.3 → 20) | penalties +1.3689/+1.2450/+1.0644/+0.5243 → 0.0000/**−0.0738**/**−0.0738**/0.0000 | four ink-unchanged regions penalised under M2 |
| Task 3 role count | delete one `drops` entry | `the fixture has 8 colour roles, got 7` | `M1 roles 2 drops 6 total 8` |
| Task 5 region bounds | subtract the root origin twice | `region outside the frame: row,avatar` | 8 names, all inside 361x221 (count asserted too — length 0 passes the bounds test vacuously) |
| Task 10 WCAG | `--color-fg` → `#cccccc` | pair 1 1.61:1 FAIL, **10/12** | `#0c3b2f` 12.48:1 pass 12/12; `#20828d` 4.53:1 pass 12/12 — a wrong colour does not move the count |
| Task 11 README shape | drop `## Timings` | section count 10 → 9 | 10 sections; `2.3` present 4x in the decision section (paraphrasing it drops the count) |
| Task 12 no generated drift | stage a 200-line `system/__probe_s3.mjs` | `loc summary ✗ drift from tracked source` (exit 1) | reverted; `--check` back to green |

**The driver was proven before it was trusted.** The comparison module was written and cleared against
the skimage oracle (C1, 8.88e-14) *before* any fixture pixel was read, so when the floor landed the
metric was already excluded as the suspect. The capture harness was then confirmed independently: all
eight `boundingBox()` rectangles reproduce the plan's pre-flight table to the pixel, `m1-faithful.png`
is 7,308 bytes and `m1-faithful-webkit.png` 9,600 bytes — the exact byte counts the plan recorded — and
every cross-engine floor matches the plan's pre-flight to four decimals. Two independent capture runs
produced byte-identical PNGs for all seven files.

## Validation results

Every figure below is **observed** unless marked.

| command | result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` |
| `node tooling/drift-check.mjs` | `drift-check ✓ syntax · token-css · … · group-count` |
| `node agent-layer/gen-loc-summary.mjs --check` (staged) | `loc summary ✓  3 groups — no drift` |
| `node agent-layer/gen-param-count.mjs --check` | `param count ✓  120 controls — no drift` |
| `node controls.mjs` | half 1 **11/11**; half 2 nine red, C6 n/a, C8 green by design; `DID NOT APPLY` count **0** |
| `node compare.mjs --self fixture/ref.png` | `SELF-IDENTITY PASS — every rung 0, score 1.0000` |
| `node compare.mjs` | the full 3 x 6 x 2 table + M2 + the drop-region control; **rung 1 GREEN, first firing rung 2** |
| `node compare.mjs --engines` | worst rung-6 floor **2.6888** (webkit subtitle); rung 2's **5.1005** |
| `node wcag-probe.mjs` | `polaris (run 3): 12/12 pass` |
| `node --check` on all four parked `.txt` copies | capture ✓ compare ✓ controls ✓ wcag-probe ✓ |
| Level 4, manual side-by-side | `m1-wrong.png` title dark green, subtitle teal; avatar, chip, chip text and chevron unmoved — confirmed by eye and by C8's 0.0e+0 |

**The verdict numbers** (observed, `raw/deltae.txt`, granularity (c) per-part, M1):

| rung | floor | signal | verdict |
|---|---|---|---|
| 1 (E4 verbatim) | 1.3089 | 1.6638 | green — fails 2.3 and fails 2x |
| 2 (p95) | 3.3462 | **12.5861** | **RED** |
| 3 (p99) | 43.9891 | 46.6926 | green — margin fails |
| 4 (blur σ=1.5) | 0.4064 | 1.0430 | green — fails 2.3 |
| 5 (ink per-pixel) | 20.5240 | 27.5252 | green — margin fails (R1 fired, as predicted) |
| 6 (ink-colour) | 0.8716 | **17.9597** | **RED** |

**Derived** (arithmetic shown): rung 2's conservative margin is worst-engine floor ÷ chromium signal =
12.5861 / 5.1005 = **2.47x** against a 2x requirement; rung 6's is 17.9597 / 2.6888 = **6.68x**.

## Not run

- **Task 13's PR.** Not opened — awaiting the owner's go. The body will carry `Closes #300` in the
  **body**, not the title (memory `prs-dont-auto-close-tickets`). Tracker: this report + the next command.
- **Task 14's epic comment (AC3).** Not posted. The plan makes it owner-gated ("Show the owner the
  comment body and get a yes before posting") and it is outward-facing. Tracker: owner's call; the
  established fallback is the S2 rhythm — commit the body as `raw/epic-comment.md` and post in a
  follow-up commit.
- **`raw/timings.txt` with per-step `date +%T` stamps.** Not taken. The README's § Timings is
  reconstructed from file mtimes and the plan commit and says so. No number in the deliverable depends
  on a timing. Tracker: none needed.
- **Brilliant desktop `export(png, outputPath)`.** Owner-only, unpaid, does not block — the plan's paid
  table says so. Tracker: README § Not done, and #307 decides.
- **A Linux measurement.** Named in the README as #307's step; not reachable here.
- **A signal render on firefox or webkit.** Deliberately not run — the plan forbids it as verdict
  shopping. Only the faithful render was captured on the extra engines.

## Deviations from the plan

- **Tasks 1 and 1a merged into one command** `(plan error)`. The plan creates the branch in the shared
  tree, then adds a worktree, then commits the plan from it — but the plan file was **untracked**, so a
  worktree from a fresh branch does not contain it and Task 2 has nothing to commit. Merged into
  `git worktree add <dir> -b <branch> origin/main` plus an explicit copy of both plan files. This also
  avoids `git switch -c` moving the shared tree's HEAD off S2's branch, which a sibling session may be
  on. Logged as AMENDMENTS E2.
- **The candidate's chip string is "On call", not the master blueprint's "Active"** `(plan error)`.
  Task 4 says author every string from `03c-master-blueprint.txt`. The reference `06.svg` is the export
  of instance `1db1b29957b949ca`, which **overrides** the master's chip string; `03-blueprint.txt` and
  `04-htmlflex.html` both say "On call". Authoring "Active" would have made `chip-text` — one of the
  three regions the floor table is read from — pure shaping noise. Geometry and colour roles still come
  from the master, strings from the instance. Logged as AMENDMENTS E1.
- **The decoder accepts colour type 6, not only 2** `(plan error)`. Task 6 says throw on
  `colour type != 2`. Chromium writes ct 2, but **Firefox and WebKit write ct 6 (RGBA) for the same
  screenshot** — observed — so Task 5a's own `--engines` validation was unreachable as specified. The
  decoder now accepts 2 and 6 and **asserts every alpha byte is 255**, throwing by name otherwise,
  rather than silently dropping a channel whose RGB would then not be a colour.
- **C4b is a coverage identity, not the plan's bound** `(plan error)`. The plan asserts
  `0.5 x pairΔE <= inkMean <= pairΔE`, which assumes the solid glyph core is at least half the ink mask.
  Measured, it is **35.1%**, and the bound's lower leg fails. The replacement is **stronger**, not
  looser: `inkMean === (coreN/inkN) x pairΔE` holds as an identity to 1e-9, because an exact-match
  recolour leaves the anti-aliased ink pixels at ΔE 0. The plan's own GOTCHA names that coverage term
  and declines to predict it; this measures it. Its reddening mutation is a source change (dilute over
  the region), and the plan's mutation is kept as the positive control. Logged as AMENDMENTS E5.
- **C10 is rebuilt on the mechanism that is actually operating** `(plan error)`. The plan's mutation
  ("hold the modal fixed to the reference's") was driven and is a **semantic no-op**: three of the four
  ink-unchanged regions have their own fill as their mode, not the paper. The M2 penalty comes from
  **anti-aliased edges blending unchanged ink against a moved paper**, not from modal divergence. Both
  readings are in `raw/controls.txt`. The mutation that does destroy the control is a core-only ink mask
  (2.3 → 20), which collapses the penalty to 0.0000 and −0.0738. Logged as AMENDMENTS E6.
- **The harness records elide the three base64 font blobs.** The plan asks for all four rendered
  variants written out, and all four are. They are ~383 KB each and identical except for three bytes,
  so committing them verbatim would put ~1.5 MB of duplicated Manrope in the repo and bury the `:root`
  diff the file exists to show. The driver replaces each blob with a marker naming its source and byte
  count; the **rendered** HTML is unchanged, proven by the PNGs staying byte-identical across the
  re-run. The four records now diff to exactly the `:root` block (and M2's two `var()` swaps).
- **`--engines` reports all six rungs, not just rung 6.** The plan measured the cross-engine floor for
  rungs 1 and 6 and pinned rung 6's threshold from it. Since the predicate names *whichever rung fires
  first* as #307's recommendation, and that turned out to be rung 2, naming it without its platform
  envelope would have handed #307 an unevidenced threshold. The engine PNGs were already on disk.
  **Rung 2's floor inflates x1.52 across engines (3.3462 → 5.1005) against rung 6's x3.08
  (0.8716 → 2.6888)** — reported as a separate fact, not folded into the predicate's reading.
- **`base` moved before work started.** The plan cites `origin/main` = `2e6aabd`; S2's PR #428 merged
  and it is `6687f8e`. Branched from `6687f8e`. Logged as AMENDMENTS E3.

## Assumptions carried

- **Q1's assumption, plan-sanctioned**: the epic's "try per-section MIN" fallback is a no-op (per-section
  MIN *is* E4's aggregation), so the real fallback space is *within*-region. The ladder walked that
  space in a pre-declared order. Stated in the README and flagged for the epic comment.
- **Q2's assumption, plan-sanctioned**: a Brilliant fixture is a fair stand-in for a Polaris one, because
  the spike reproduces the *defect class* by placing run 3's real emitted values on this element's roles.
  Both halves of the substitution are named in the README's § Setup.
- **A1**: no `build-checks` group in this ticket — group numbers are claimed in merge order and #307
  claims one.
- **A2**: colour roles only in the primary map; M2 is reported as a second row.
- **The predicate names rung 2 because it is first**, not because it separates best. Rung 6 separates by
  20.6x against rung 2's 3.76x, and the pre-commitment is what stops that from changing the answer. The
  README says so explicitly and reports rung 6's margin beside it as data.
- **The conservative margin pairs a worst-engine floor with a chromium signal.** The signal was measured
  on chromium only, by design. Stated as an assumption in the README's § Platform, not as a measurement.

## Additions beyond the plan

- **Q4 and Q5 added to the Verdicts table.** The plan's table answers Q1–Q3. Q4 (which granularity #307
  inherits) was an OPEN QUESTION the plan said "measures all three and recommends one" but gave no
  verdict row; the run answers it — **per-part**, because whole-image fires *nothing* and y-bands inflate
  rung 6's floor from 0.8716 to 9.2145. Q5 records that a sub-JND change (#f8f8f8 → #ffffff, ΔE 1.40) is
  measured and correctly *not* called red, which is the plan's own Edge Case made into a reported result.
- **A fixture determinism check.** Two full capture runs, all seven PNGs compared by SHA-256 — byte-identical.
  Not asked for; it is what makes the committed fixture safe for #307's gate to diff against.
- **`m1-faithful.png` and `m2-faithful.png` proven byte-identical.** M2's faithful values *are* M1's drop
  literals, so they must be. A free extra control on the harness's parameterisation.
- **A standalone-run guard on `compare.txt`**, so the control battery can import the metric without the
  CLI firing and reading the fixture. The plan did not specify one; without it the battery cannot exist.
- **`tooling/style-dictionary/npm install` in the worktree** so `drift-check` could actually run. A fresh
  worktree has no `node_modules` (memory `local-agent-visual-gate-notes`). `node_modules` is gitignored
  and nothing was staged.

## Issues encountered

- **`tokens.neutral.css` binds semantics to primitives through `var()`**, so the WCAG probe's first
  parser returned the primitives and none of the roles `checkPairs` asks for — it threw
  `pair token "color-fg" is not a hex color (got "undefined")`. The parser now resolves the alias chain
  before filtering to hex. The plan's Task 10 GOTCHA anticipated the *overlay* requirement but not the
  indirection.
- **The plan's Task 10 REDDENS predicts 11/12 for `--color-fg: #cccccc`; observed 10/12.** `color-fg`
  appears in **two** of the twelve pairs (on `color-bg` and on `color-bg-surface`), so both fail. Cosmetic,
  but it is a number in the plan that the run did not reproduce, so it is recorded rather than quietly
  matched.
- **Task 5's VALIDATE lists seven part names and calls them "six".** The fixture has **eight**
  `data-part` nodes. The count is asserted at 8.
- **No `system/oklch.mjs` import in the metric.** The plan's Task 7 says reuse `srgbToLinear` "by import
  rather than a second copy". `compare.txt` defines its own, because it must run as a standalone copy in
  a scratchpad with no repo-relative resolution, and because the CIELAB path must match **skimage's**
  matrix and white point exactly for C1's oracle to mean anything. C6 imports `oklch.mjs` for real and
  cross-checks the two metrics agree, which is the stronger version of the same idea.
