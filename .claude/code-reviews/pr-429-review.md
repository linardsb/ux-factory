# PR #429 review — S3, the wrong-but-green detector (#300)

**Head** `97a4883` · **Base** `main` @ `6687f8eca77052999cba021f7a19b7bc3578f035` · reviewed 2026-09-17
· 28 files, +4047/−0, all under `.claude/plans/canvas-spike-s3*` and `.claude/reports/` · round 1

## Summary

The measurement holds and I could not break it. I copied the four parked `.txt` scripts to `.mjs` in a
fresh scratchpad and re-ran every one: `raw/deltae.txt`, `raw/engines.txt` and `raw/controls.txt` come
back **byte-identical** (modulo the timestamp and the scratchpad path), `--self ref.png` passes, and a
full `capture.txt` re-run against a scratch fixture dir reproduces **all five PNGs, `regions.json` and all
four harness records byte-identical** to the committed ones. The fixture's provenance closes end to end
from a different session in a different directory.

Eleven findings, two High. Neither touches the spike's headline answer — rung 1 reads GREEN and that
survives everything below. Both are about what the PR hands **#307**: which rung it names, and whether
the scripts it is told to inherit can be run by anyone but this machine.

Recommendation: **request changes** — F1 and F2 before merge, F3–F7 in the same pass.

## Findings

### F1 — High · the 256 px rule is not E4's, and it decides the rung #307 inherits

`compare.txt:206`, plan `65815a3:488` and `:1102`.

```js
const MIN_AREA = 256;   // R2: 16x16. Mirrors visual_scorer.py:32's _MIN_SECTION_HEIGHT_PX = 8
```

It does not mirror it. E4's rule is a minimum section **height** of 8 px; this is a minimum **area** of
256 px. `chevron` is 9x16 — height 16, so it passes E4's rule; area 144, so it fails this one and is
excluded from every MIN aggregation.

**Failure scenario, measured.** I re-ran `compare.mjs` with `MIN_AREA = 0` and nothing else changed:

| rung | with the rule (committed) | with the rule lifted |
|---|---|---|
| 2 | floor 3.3462 (title) → signal 12.5861 (title), ≥2x → **RED** | floor **8.3125 (chevron)** → signal 12.5861, 12.5861 < 16.6249 → **green** |
| 6 | RED | RED |
| **first firing rung** | **2** | **6** |

Rung 1 reads GREEN under both, so Q1 — the spike's actual question — is unaffected. What moves is Q2's
answer and the whole "one number for #307 before it picks a rung" section, which weighs rung 2's thin
2.47x conservative headroom against rung 6's 6.68x. #307 picks a rung off that paragraph.

**This is not shopping.** The rule is genuinely pre-committed: plan `65815a3:1094-1102` declares it, with
chevron's rung-1 mean of 1.924 already measured during planning, and no signal render existed then. The
defect is the false equivalence and the unreported sensitivity, not the choice. F4 makes the case for the
rule stronger, not weaker.

**Fix.** Correct the claim in all three copies — it is the spike's own rule at a per-part granularity E4
does not have, adopted for the reason the README already gives well ("no paper to dilute"). Then add one
line to README § The decision:

> At per-part granularity, with the 256 px region-size rule lifted, `chevron`'s floor p95 of 8.3125
> becomes rung 2's floor, the margin condition fails (12.5861 < 16.6249) and the first firing rung is
> **6**, not 2. Rung 1 reads GREEN either way. Granularities (a) and (b) are unaffected — no region
> there is under 256 px — but (c) is the one Q4 recommends #307 inherit.

That line makes rung 6 the safer inheritance on two independent grounds instead of one, which is useful
to #307 rather than embarrassing to this spike.

### F2 — High · the parked scripts run only on this machine, and one only until AC14 runs

`compare.txt:20-21`, `capture.txt:23,30`, `controls.txt:22-23`, `wcag-probe.txt:7-8`; `README.md:412-414`.

```js
const MAIN  = "/Users/Berzins/Desktop/Linards_current/ux-factory";
const SPIKE = process.env.SPIKE_DIR || path.join(process.env.HOME, "Desktop/Linards_current/wt-s3-300/.claude/plans/canvas-spike-s3");
```

The same preamble is copy-pasted into all four. `SPIKE`'s fallback names **this throwaway worktree**,
which AC14 prescribes deleting after merge (`report.md:145`). `SPIKE_DIR` is set nowhere — not in
`.github/workflows/verify.yml`, not in the README's run recipe, which says only "copy it to a `.mjs` in a
scratchpad". `MAIN` is a hardcoded absolute home path, and in `compare.txt` it is also **dead** — never
read in that file (the only other match is the unrelated `IS_MAIN` at `:386`).

**Failure scenario.** #307 merges this, runs `git worktree remove wt-s3-300` exactly as AC14 instructs,
copies `compare.txt` to a scratchpad exactly as § Files documents, and gets ENOENT on `ref.png`.
`compare.txt` is billed as "the shape #307's gate inherits" (`compare.txt:9-10`), so this is the first
thing it meets — in the one file where portability was the point.

**Fix.** The repo already has the pattern committed: `tooling/build-checks.mjs:302` resolves from
`fileURLToPath(import.meta.url)`, no env var and no home fallback. One shared-preamble change covers all
four scripts. Drop `compare.txt`'s dead `MAIN` while you are in there. At minimum, put `SPIKE_DIR=<dir>`
into README § Files' run instruction.

### F3 — Medium · the PR's most load-bearing number cannot be regenerated by anyone else

`controls.txt:25` — `const PY = path.join(process.env.HOME, "Desktop/email-hub/.venv/bin/python")`.

C1's `8.88e-14` agreement with `skimage.color.deltaE_ciede2000` is cited in the README, the report ("the
metric was already excluded as the suspect") and the PR body ("cleared before the fixture was read") as
the reason every other number can be trusted. It is produced by shelling out to a venv in a sibling
project on this Mac. It really ran — my re-run of `controls.mjs` invoked that interpreter and reproduced
`8.88e-14` — but nobody on another machine, and nobody here once that venv moves, can re-derive it.
Neither the README's C1 row nor § Not done says so.

To be fair to the choice: `email-hub` is not an arbitrary sibling, it is where **E4 itself lives** —
`visual_scorer.py` is the subject of the entire comparison, and the README cites it by line. Depending on
it is defensible; leaving the dependency undisclosed and unversioned is the finding.

**Fix.** Either name the dependency in § Not done with the setup step to recreate it, or check a second
independent CIEDE2000 implementation into the spike dir so C1's evidence travels with the code it
certifies.

### F4 — Medium · `chevron` is the worst region, not the second worst

`README.md:118-119`, plan `:931` and `:1098`: *"Its floor mean of 1.9239 is the second worst of any
region."*

Ranked mechanically over all fourteen regions the run measures (1 whole + 5 ybands + 8 parts), chevron's
1.9239 is the **largest**; title's 1.3089 — the region the same document calls "the worst per-part region"
at `:13` — is second. Originates in the plan, stated twice there, and it is the one plan error this PR's
four-error catalogue did not catch, with the data to catch it sitting in the same table.

Changes no verdict — chevron is excluded by R2 either way — and it **understates** the argument: if
chevron is the outright worst, R2 is removing the single worst-scoring region from a MIN aggregation,
which is a stronger case for the rule. Free to fix, and it is load-bearing for F1's fix.

**Fix.** "the worst of any region", three sites.

### F5 — Medium · "Copied verbatim" is an abridgement

`README.md:146`.

Diffed against `git show 65815a3:<plan>` lines 948-977, the block drops the plan's entire **"Units,
stated so the predicate has one reading"** paragraph (`:952-955`) and truncates the rung-6 sentence
mid-clause, losing `(**2.689**, WebKit, subtitle; the cross-engine table is in R3)` and the three
sentences that justify T(6) = 5.0. No ellipsis marks either cut. Everything retained is
character-identical.

**Failure scenario.** That block is the document's load-bearing anti-shopping evidence — a reader checking
the pre-commitment diffs exactly it against the commit, and it does not match. Nothing omitted changes the
predicate's meaning and the omitted numbers reappear in § Platform, so the defect is the word, not the
content.

**Fix.** "Abridged from the plan committed in `65815a3`", with `…` at the two cuts.

### F6 — Medium · the reading table hides that floor and signal can come from different regions

`README.md:173-181`; `compare.txt:313-317`.

The aggregator picks the worst region of each pair independently, so the margin condition can compare a
floor from one region against a signal from another. `raw/deltae.txt` prints the names and shows it:
granularity (c) rung 4 reads `floor= 0.4064 (title)  signal= 1.0430 (subtitle)`, and again at (b). The
README's table drops the names, so both columns read as one region. M2's rung 4 is called **RED** on such
a pair.

**It moves nothing here, and the write-up should say so.** Re-derived same-region: M1 rung 4 is green on
title (0.4064 → 0.8842) and on subtitle (0.0936 → 1.0430), neither reaching 2.3; M2 rung 4 on subtitle is
0.0936 → 2.3042, still RED; and rung 2, the named answer, is same-region at every granularity. Every
stated verdict survives the stricter reading. A seam in the predicate #307 inherits, not an error in the
reading.

**Fix.** Print the region names in the README's table as the raw output already does, plus one sentence
saying the two halves are chosen independently and that the verdict is the same either way here.

### F7 — Medium · C6 compares two formulas over one pipeline's own output

`controls.txt:191-201`.

```js
const byCiede = [...stats].sort((a,b) => b.inkColourDeltaE - a.inkColourDeltaE)[0];
const byOklab = [...stats].sort((a,b) => oklabDE(b.inkMeanHexA, b.inkMeanHexB) - oklabDE(a.inkMeanHexA, a.inkMeanHexB))[0];
```

Both legs consume `statsOne`'s output from the same `inkOf`/`modal` extraction. A wrong region box, a
wrong mask threshold or a wrong modal colour corrupts both identically and C6 still reports "agree". What
it can actually catch is two distance formulas ranking one already-fixed pair of colours differently — and
at this fixture's margins (title 13.9654 against subtitle 17.9597) a flip is unlikely. The two legs are
not even fed identical inputs: `inkColourDeltaE` uses the unquantised float means, `oklabDE` the 8-bit
rounded hex. The "no mutation by design" disclosure is honest about the missing mutation; it does not say
the two legs share nearly their whole pipeline. This is the repo's own `check-that-cannot-fail` class.

**Fix.** Either feed C6 an independent recomputation of the ink means, or narrow the framing to "the two
formulas agree on ranking given the same extracted colours."

### F8 — Low · one raw file cannot be re-derived from what is committed

`raw/wcag.txt:50-52`; `wcag-probe.txt`.

`wcag-probe.txt` reproduces the first 49 lines of `raw/wcag.txt` exactly and stops. The last three lines —
the `--color-fg` reddening control — have no committed producer. § Files does disclose it ("plus its
reddening control"), so it is not smuggled, and I verified the arithmetic against `system/wcag.mjs`:
`#cccccc` 1.6059, `#0c3b2f` 12.4832, `#20828d` 4.5268, matching the file's 1.61 / 12.48 / 4.53. Every
other raw file in this PR re-runs byte-identically; this is the one that cannot.

**Fix.** Fold the mutation into `wcag-probe.txt` behind a flag, the way `controls.txt` carries its own.

### F9 — Low · C8's mutated half is self-identical by construction

`controls.txt`, C8's mutated branch. Substituting `m1-faithful` for `m1-wrong` compares `mean(ref, fa)`
against itself, which is zero for **every** region, not only the four drop regions C8 asserts about — so
half 2 exercises none of the box-placement or region-reading logic. The doc and AC5 both disclose that C8
stays green and explain what collapses, so this is a precision note: the evidence that the boxes land
correctly is C7 and C3, not C8's own mutation.

**Fix.** One line saying the mutated comparison is self-identical by construction.

### F10 — Low · three stale worktrees, not two

report `:145` (AC14) and plan `:311`: *"The repo already carries two stale worktrees (`wt-292-restore`,
`wt-spike-b`)"*. `git worktree list` shows a third: `ux-factory-wt-12` on `feature/portability-proofs`,
whose ticket landed on main in July (memory `ticket-12-worktree-state`). The instruction the sentence
carries — do not add another — is right; the count is not.

### F11 — Low · three one-line corrections

- report `:105`: *"rung 2's conservative margin is worst-engine floor ÷ chromium signal = 12.5861 /
  5.1005 = 2.47x"* — the arithmetic shown is signal ÷ floor. The number is right and README § Platform
  states the relation correctly; only the report's formula reads backwards.
- report `:6`: **HEAD**: `b504a26` is stale. `2bd6edc` and `97a4883` followed, and `97a4883` edited the
  report itself.
- `README.md:194` cites `architecture.md:312-313` for "green → try per-section MIN before dropping it";
  it is at `:313-314` (`:312` is the spike line). Same miscount at plan `:638` and `:862`. Checked at both
  `6687f8e` and the plan's originally-cited `2e6aabd`, so this is not base drift.

### N1 — note · "twice the worst floor" is printed four times into the evidence

`compare.txt:368` prints `T(6) = 5.0, twice the worst floor of three engines` into the predicate legend,
landing four times in `raw/deltae.txt`. Twice of 2.6888 is 5.378; 5.0 is 1.86x. README `:342` says 1.86x
correctly and plan `65815a3:970` carries the loose phrasing, so nothing drifted — but the legend is the
copy a #307 reader meets first. One word: "above".

## Validation

All observed, run by me on the PR head in `~/Desktop/Linards_current/wt-s3-300`.

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓  all 34 groups pass` |
| `node tooling/drift-check.mjs` | ✅ `drift-check ✓ syntax · token-css · … · group-count` |
| `node tooling/token-lint.mjs` | ✅ `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `gen-loc-summary --check` | ✅ no drift — **and its positive control re-driven**: a staged 200-line `system/` probe → `loc summary ✗` exit 1, reverted clean |
| `gen-param-count --check` | ✅ `120 controls — no drift` |
| portal smoke, `/api/health` | ✅ `{"ok":true,…}` (run from the primary tree — the fresh worktree has no `portal/node_modules`; the PR touches no portal file) |
| CI on the PR | ✅ 6/6 — verify, visual, audit, codeql, CodeQL, gates-green · `mergeStateStatus` CLEAN |
| `node compare.mjs` | ✅ **byte-identical** to `raw/deltae.txt` |
| `node compare.mjs --engines` | ✅ **byte-identical** to `raw/engines.txt` |
| `node compare.mjs --self ref.png` | ✅ every rung 0, score 1.0000 |
| `node controls.mjs` | ✅ **byte-identical** to `raw/controls.txt` — 11/11 pristine, 9 red, `DID NOT APPLY` 0. The skimage oracle really ran (see F3) |
| `node wcag-probe.mjs` | ✅ reproduces `raw/wcag.txt` except its last 3 lines — F8 |
| `node capture.mjs` (Playwright, scratch fixture dir) | ✅ `ref.png`, 4 candidate PNGs, `regions.json` and all 4 harness records **byte-identical by SHA-256** |
| `node --check` on all five parked `.txt` copies | ✅ |

## The numbers pass

Every figure in the PR body, the README and the report traces to a run, and the runs reproduce. What I
re-derived rather than took:

- **AC4's pre-commitment holds.** `git show 65815a3:<plan> | grep -E '1.6638|12.5861|17.9597|13.9654|2.9927|15.5356|27.5252|1.0508|18.2654|2.0136'` → **no hits**. No signal figure exists in the plan commit.
- **"Observed on the merged tree" is true.** `git merge-base --is-ancestor 6687f8e 97a4883` → yes.
- **The FLOOR's provenance closes.** `06.svg` declares exactly `#454545 #575757 #f8f8f8 #e1e1e1` — the
  mapping's four `sourceValue`s — plus `#f2f5fa` and `#f1f7f2`, which are C7's two modal assertions. The
  faithful pack is the source's own literals, so the floor is a floor.
- **"E4 verbatim" is accurate**, checked on the noun not the digits: `visual_scorer.py:104-115` is mean
  per-pixel CIEDE2000 → `1 - mean/_DELTA_E_MAX`, `:40` sets `_DELTA_E_MAX = 100.0`, `:212` is `min` over
  section scores. The `ssim` field name is back-compat only (`:51-53`). Rung 1's `1 - mean/100` is exactly it.
- **Rung 4's blur is faithful too.** E4's `_apply_blur` (`:93-100`) is `scipy.ndimage.gaussian_filter` with
  per-channel sigma; the port's radius `floor(4σ+0.5)` and half-sample `reflect` edges match scipy's
  defaults. E4's own `blur_sigma` defaults to 0.0, and the spike claims only the conventions, not the use.
- **The margins.** 12.5861/3.3462 = 3.76x · 17.9597/0.8716 = 20.61x · 5.1005/3.3462 = 1.52x ·
  2.6888/0.8716 = 3.08x · 12.5861/5.1005 = 2.47x · 17.9597/2.6888 = 6.68x. `ΔE(#f8f8f8,#ffffff)` = 1.4004
  → the "ΔE 1.40" of Q5. All as stated.
- **The byte counts.** `m1-faithful.png` 7,308 and `m1-faithful-webkit.png` 9,600, both as claimed and both
  reproduced by my own capture run. PNG colour types: chromium 2, firefox and webkit 6 — E7 is real.
- **The elision arithmetic.** 126,600 base64 chars → 94,950 decoded bytes. Checks out.
- **`97a4883` edited the harness records and the driver's marker string together**, and my fresh run
  reproduces the new records — so they are driver-written, not hand-edited. That is the honesty-critical
  check on this PR and it passes.

## What is good

- **The controls are not decorative.** Nine of eleven redden under their own mutation. Two plan-specified
  mutations that turned out **not** to redden their control (C4b's bound, C10's modal hold) are reported as
  findings and replaced with stronger checks rather than quietly swapped — the repo's
  `check-that-cannot-fail` lesson actually applied. F7 and F9 are where that discipline thins, not where
  it is absent.
- **The metric was cleared before the fixture was read**, against the same function E4 calls, to 8.88e-14
  over 500 fixed-seed pairs — so when the floor landed the metric was already excluded as the suspect.
- **Rung 5 is kept in the ladder and reported failing**, with its floor (20.5240) larger than the signal's
  own ink ΔE (18.2154) — the obvious fix for E4's dilution, published as the worst rung of the six so #307
  does not reach for it. The most useful thing in the document after the verdict.
- **The reading is stated as itself.** "Green on rung 1, red on rung 2" is neither leg of the epic's
  decision rule, and the PR says so instead of rounding to a leg. Rung 6's 20.6x is reported beside rung
  2's 3.76x as data and explicitly not substituted for it.
- **Four plan errors found by driving the plan rather than reading it**, each logged with the measurement
  that exposed it. E5 and E7 would each have silently voided a control or a whole validation step.
- **CIEDE2000 term by term** matches Sharma-Wu-Dalal 2005, including the `C1'C2' = 0` special cases in the
  hue-average branches; sRGB→Lab matches skimage's matrix, D65 white point and 0.008856 threshold. The
  metric is correct, not just deterministic.

## Recommendation

**Request changes** — F1 and F2 before merge; F3–F7 are edits to the same three files and belong in the
same pass. F8–F11 and N1 are optional.

Nothing here touches `system/`, `tooling/`, `agent-layer/` or `handoff/`; the throwaway boundary holds,
the `.txt` parking is correct, and `drift-check`'s `node --check` sweep does not adopt any of it. Plan,
report and this review are all in the PR, and the body carries `Closes #300`.
