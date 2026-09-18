# S3 — the wrong-but-green detector (ΔE-MIN against a foreign render)

Branch `feature/canvas-spike-s3-wrong-but-green-300`, off `origin/main` `6687f8e`, 2026-09-17. Ticket
[#300](https://github.com/linardsb/ux-factory/issues/300), epic [#295](https://github.com/linardsb/ux-factory/issues/295).
A throwaway measurement: does per-pixel CIEDE2000, aggregated the way `visual_scorer.py` aggregates it,
score spike A run 3's green-body-text mapping as wrong while every formal check stays green? Nothing
ships. Nothing under `system/`, `tooling/`, `agent-layer/` or `handoff/` was touched.

## Verdicts

| Q | Verdict | Evidence |
|---|---|---|
| **Q1 — does rung 1, E4 verbatim, read the wrong mapping red?** | **No. GREEN.** Worst per-part region `title`: floor **1.3089**, signal **1.6638**. It fails the JND condition (1.6638 < 2.3) *and* the margin condition (1.6638 < 2 x 1.3089 = 2.6179). E4's per-region mean divides an ink-only error by a region that is 95.3% paper. | `raw/deltae.txt` |
| **Q2 — does any rung separate signal from floor, and which?** | **Yes — two do. Rung 2 (p95) is the first**, floor 3.3462 → signal **12.5861**, a 3.76x margin. **Rung 6 (ink-colour ΔE) fires far harder**, floor 0.8716 → signal **17.9597**, a **20.6x** margin. Under the pre-committed predicate the first firing rung is named, so **the predicate's answer is rung 2**. The platform envelope, measured after, is what separates them — see § Platform. | `raw/deltae.txt` |
| **Q3 — does WCAG stay 12/12 on the wrong pack?** | **Yes. 12/12.** `--color-fg: #0c3b2f` on `#ffffff` reads **12.48:1**; `--color-fg-muted: #20828d` reads **4.53:1**. Every declared pair passes while the body text is a dark green. | `raw/wcag.txt` |
| **Q4 — which region granularity should #307 inherit?** | **Per-part (c).** At whole-image granularity **no rung fires at all** — the defect is invisible. At E4's y-bands only rung 2 fires, and rung 6's floor inflates from 0.8716 to **9.2145** because a band mixes title, surface and chip into one unstable ink population. Per-part is also what the IR already gives (`architecture.md:167-171`). | `raw/deltae.txt` |
| **Q5 — does the detector fire on a colour a human cannot see?** | **No, and that is the point.** Under M2 the surface role moves `#f8f8f8 → #ffffff`, **ΔE 1.40** — below the 2.3 JND. Rung 6 reports it on the four ink-unchanged regions at **0.5742–1.3896**, all under the 5.0 threshold, so it is measured and not called red. | `raw/controls.txt` C10 |

**The reading, stated as itself.** The epic's decision rule has two legs: red → "the detector exists";
green → "the aggregation is wrong, not the idea". The observed result is **green on rung 1, red on
rung 2 and rung 6**, which is neither leg as written. It is **closer to the green leg**: E4's *idea* —
per-pixel CIEDE2000 against a foreign render — separates this defect by 20.6x, and only E4's
*aggregation*, the per-region arithmetic mean, cannot see it. The detector's organ works; the statistic
E4 reads off it is the wrong one for an ink-sized defect.

## Setup

**The element** is spike C's committed fixture, instance `1db1b29957b949ca` "Spike List Row", read from
Brilliant on 2026-08-27 (`.claude/plans/design-import-spike-c/`).

**The reference** `fixture/ref.png` is that fixture's `06.svg` rasterised in Chromium at
`deviceScaleFactor: 1`. The SVG carries Brilliant's own text positions and three embedded Manrope
`@font-face` blocks, so the raster is **Brilliant's** rendering of the element, not this repo's.

**The candidate** is a hand-authored DOM whose colours are `var(--color-*)` references under a role map,
rendered twice: once under a faithful pack (the source's own literals) to measure the cross-renderer
noise **floor**, once under `.claude/plans/design-import-spike-a/tokens.polaris.spike.css` — spike A
run 3's real output, read from that file and not retyped — to measure the **signal**.

**Two deviations, stated rather than smuggled:**

1. **The reference is an SVG raster, not Brilliant's own `export(png)`.** Spike C's caveat 1 records
   that the web editor returns PNG inline only and persisted nothing, so no true PNG export exists on
   disk. The SVG is Brilliant's own geometry, its own glyph positions and its own font binaries, so the
   raster reproduces Brilliant's rendering; but it is a re-rasterisation, and a desktop
   `export(png, outputPath)` would be strictly better. It is an owner-only, unpaid upgrade — § Not done.
2. **The element is spike C's Brilliant fixture, not a Polaris artefact.** The ticket names spike A run
   3's mapping; that mapping was produced against Shopify Polaris, and no Brilliant element is Polaris.
   The Polaris source JSONs are not on disk (`polaris-json/` lived in `wt-spike-b`'s scratchpad and is
   gone). The spike therefore reproduces the *defect class*: it places run 3's **real emitted values**
   on this element's colour roles. The values are spike A's, the element is spike C's.

**The map.** `mapping.json`. M1 is colour-text-only and is the verdict map: `color.text.primary →
--color-fg` (#454545 → #0c3b2f) and `color.text.secondary → --color-fg-muted` (#575757 → #20828d).
M2 adds `color.surface → --color-bg-surface` and `color.outline.variant → --color-border`, and is
reported as a second row, never the verdict. The remaining six of the eight colour roles the active
lane renders are dropped, classified in E1's three classes — two `read-then-dropped` (M1's scope
choice; both are mapped under M2) and four `read-but-never-emitted` (the contract has no success,
container or disabled role).

**On the honesty of the pre-committed predicate.** The plan committed in `65815a3` already contains
measured floor numbers, and that is deliberate, not a leak. The floor is a property of the **harness** —
how much two renderers disagree about a picture they both draw correctly — and it was measured during
planning to choose an aggregation. The **signal** is a property of the **mapping**, and **no render of
`tokens.polaris.spike.css` existed at plan-commit time**; every number in the Verdicts table above was
produced after `65815a3`. The commit order is the evidence.

**The harness rebuild is independently confirmed.** The planning session's scratchpad was gone, so the
capture driver was rebuilt from the plan's prose. All eight `boundingBox()` rectangles reproduce the
plan's pre-flight table to the pixel; `m1-faithful.png` is **7,308 bytes** and `m1-faithful-webkit.png`
**9,600 bytes**, the exact byte counts the plan recorded; and every floor number in § Platform matches
the plan's pre-flight to four decimals. Two independent capture runs produced **byte-identical** PNGs
for all seven files, so the fixture is deterministic on this machine.

## Timings

Derived from file mtimes and the plan commit, not from per-step `date` stamps — those were not taken
(§ Not done).

| step | at | note |
|---|---|---|
| plan + predicate committed (`65815a3`) | 21:11:09 | before any fixture pixel was compared |
| `mapping.json` | 21:11:25 | |
| metric written, C1 oracle cleared | ~21:13 | decoder + CIEDE2000, proven against skimage before any fixture read |
| first capture, all eight boxes matched | ~21:13 | the discriminating check |
| control battery, 11/11 pristine | 21:17:45 | two rebuilds (C4b, C10) — see § Proving the checks |
| comparison, engines, WCAG | 21:17:45 | |
| final capture re-run + determinism check | 21:18:00 | all 7 PNGs byte-identical to the first run |

## The numbers

**M1, granularity (c) per-part.** FLOOR = `ref` vs `m1-faithful`; SIGNAL = `ref` vs `m1-wrong`.
Each cell is the region's own statistic; the rung's value is the worst **scored** region.

| region | area | rung 1 mean | rung 2 p95 | rung 3 p99 | rung 4 blur | rung 5 ink | rung 6 inkColour | ink% |
|---|---|---|---|---|---|---|---|---|
| **title** floor | 14,300 | 1.3089 | 3.3462 | 43.9891 | 0.4064 | 20.5240 | 0.0030 | 4.7 |
| **title** signal | 14,300 | **1.6638** | **12.5861** | 46.6926 | 0.8842 | 27.5252 | **13.9654** | 4.7 |
| **subtitle** floor | 14,300 | 0.6973 | 0.4070 | 24.2755 | 0.0936 | 14.1489 | 0.8716 | 4.6 |
| **subtitle** signal | 14,300 | 1.0508 | 3.9974 | 26.6210 | 1.0430 | 21.4832 | **17.9597** | 4.6 |
| text-block floor | 29,172 | 0.9834 | 1.0234 | 31.1303 | 0.2451 | 17.3773 | 0.5318 | 4.5 |
| text-block signal | 29,172 | 1.3307 | 6.4542 | 34.4885 | 0.9447 | 24.5429 | 15.5356 | 4.5 |
| row floor | 79,200 | 0.4461 | 0.0000 | 15.8867 | 0.1384 | 2.1386 | 0.0977 | 16.3 |
| row signal | 79,200 | 0.5740 | 0.0000 | 22.5757 | 0.3971 | 2.8771 | 2.0136 | 16.3 |

**The drop-region control row.** Under M1 the six dropped roles render at the same literal in both
candidates, so these four regions must be identical between FLOOR and SIGNAL. They are, to 0.0e+0:

| region | area | floor mean | signal mean | \|diff\| |
|---|---|---|---|---|
| avatar | 1,024 | 0.1210 | 0.1210 | 0.000e+0 |
| chip | 12,528 | 0.2654 | 0.2654 | 0.000e+0 |
| chip-text | 10,000 | 0.2721 | 0.2721 | 0.000e+0 |
| chevron | 144 | 1.9239 | 1.9239 | 0.000e+0 |

If one of them had moved, the harness would have a bug rather than the mapping. This is control C8.

**R2 and F4, applied and named.** The region-size rule excludes exactly one region on this fixture:
**`chevron`, 144 px < 256** — reported above, never scored. Its floor mean of 1.9239 is **the worst of
any region** measured here — larger than `title`'s 1.3089, and larger than every yband and the whole
image — for purely geometric reasons (9x16, 29.9% ink, no paper to dilute), which is precisely what the
rule exists to keep out of a MIN aggregation.

**Whose rule it is.** The 256 px area floor is **this spike's own**, declared in the plan before the run
and not E4's. `visual_scorer.py:32`'s `_MIN_SECTION_HEIGHT_PX = 8` is a minimum section **height**; this
is a minimum **area**, at a per-part granularity E4 has no equivalent of. `chevron` is 9x16: it passes
E4's rule on height (16 >= 8) and fails this one on area (144 < 256). The reason for adopting it is the
one above — a region that is nearly all glyph has no paper to dilute it — not a citation.

**The mask-degenerate rule (F4)** (`inkN/n > 0.5`) trips **nothing**: the worst ink share observed is `yband3` at **40.8%**. The rule is
therefore defensive here and untested by this fixture — a fact #304's differently drawn source may change.

**The other two granularities.**

| granularity | rung 1 | first firing rung | note |
|---|---|---|---|
| (a) whole image | floor 0.4658 → signal 0.5927, green | **none — no rung fires** | one 361x221 region dilutes an ink defect past every statistic in the ladder |
| (b) E4's five y-bands | floor 1.2580 → signal 1.5775, green | rung 2 (yband1) | rung 6's floor inflates to **9.2145** and it stops firing: a band mixes title, surface and chip into one ink population whose average is unstable across renderers |
| (c) per-part | floor 1.3089 → signal 1.6638, green | **rung 2** | rung 6 fires at 20.6x |

Five bands was fixed before the run and is arbitrary by admission — E4 derives bands from an email's
vertical sections and a list row has none. **That y-bands misfit a horizontal component is the finding;
the band count is not a parameter that was swept.**

**M2 — the secondary map, a second row and never the verdict.** Adding the two large-area roles makes
**rung 1 fire**: floor 1.3089 → signal **2.9927** on `title`, clearing both 2.3 and 2 x 1.3089. Rungs 2,
4 and 6 fire too. This is the single most useful thing M2 says: **E4's per-region mean can see a wrong
*surface* colour and cannot see a wrong *text* colour**, because the mean is area-weighted and the
defect is not. A metric that only notices large-area roles will pass exactly the class of defect spike
A shipped.

## The decision, and its condition

Abridged from the plan committed in `65815a3`, before any fixture number was measured. Everything
retained is character-identical and `…` marks the two cuts: the first drops the plan's "Units, stated so
the predicate has one reading" paragraph (every threshold is read on the ΔE figure, never on the score),
the second the rung-6 threshold's justification, whose numbers reappear in § Platform:

> Let `worst(P, g, r)` be the worst region of pair `P` at granularity `g` under rung `r`, where "worst"
> means the largest ΔE statistic (equivalently the smallest E4 score — the same ordering, **not** the same
> number).
>
> …
>
> - `FLOOR = (ref, m1-faithful)`
> - `SIGNAL = (ref, m1-wrong)`
>
> **Rung 1 is the verdict rung.** It is E4 verbatim: per-region mean ΔE → `score = 1 - mean/100` →
> overall `MIN(scores)`, at granularity **(c)**, per-part.
>
> **RED** iff `meanΔE(SIGNAL, c, 1) >= 2.3` **and** `meanΔE(SIGNAL, c, 1) >= 2 x meanΔE(FLOOR, c, 1)`,
> where `meanΔE(P, c, 1)` is the worst per-part region's mean ΔE — i.e. `(1 - MIN(scores)) x 100`.
>
> 2.3 is the CIEDE2000 just-noticeable difference — a human would see it. The 2x is a stated margin
> choice, not a published one.
>
> **The same two conditions apply at every rung, with one absolute threshold raised by measurement.**
> At rungs 2–6 the JND condition reads `>= 2.3` **except at rung 6, where it reads `>= 5.0`** — twice
> the worst floor any of the three engines produced …
>
> **If rung 1 is green**, the ladder is walked in this fixed order and the **first** rung meeting the
> same two conditions is named as #307's recommended aggregation.

**The reading.**

| rung | statistic | floor | signal | >= T? | >= 2x floor? | verdict |
|---|---|---|---|---|---|---|
| 1 | region mean ΔE — **E4 verbatim** | 1.3089 (title) | 1.6638 (title) | no (T=2.3) | no (2.6179) | **green** |
| 2 | region p95 | 3.3462 (title) | **12.5861** (title) | yes | yes (6.6924) | **RED** |
| 3 | region p99 | 43.9891 (title) | 46.6926 (title) | yes | no (87.9782) | green |
| 4 | blurred mean, σ=1.5 | 0.4064 (title) | 1.0430 (**subtitle**) | no | yes (0.8129) | green |
| 5 | ink-masked per-pixel mean | 20.5240 (title) | 27.5252 (title) | yes | no (41.0480) | green |
| 6 | **ink-colour ΔE** | 0.8716 (subtitle) | **17.9597** (subtitle) | yes (T=5.0) | yes (1.7432) | **RED** |

**The two halves are chosen independently**, and the names say where that bites. The aggregator takes
the worst region of each pair on its own, so a rung can compare a floor from one region against a signal
from another — rung 4 above does, and so does rung 4 at granularity (b) (`raw/deltae.txt` prints the
names). Re-derived same-region, every verdict here survives: M1 rung 4 is green on `title`
(0.4064 → 0.8842) and on `subtitle` (0.0936 → 1.0430), neither reaching 2.3; M2's rung 4 on `subtitle`
is 0.0936 → 2.3042 and stays RED; and **rung 2, the named answer, is same-region at every
granularity**. It is a seam in the predicate #307 inherits, not an error in this reading.

**Rung 1 is GREEN. The first rung meeting both conditions is RUNG 2, and the predicate names it.**

Two things the predicate obliges and this document does not quietly revise:

- The predicate says *first*, and rung 2 is first. It is named as the predicate's answer even though
  rung 6 separates by 20.6x against rung 2's 3.76x, because choosing the better-separating rung after
  seeing the numbers is exactly the shopping the pre-commitment exists to prevent.
- **What the predicate did not cover is each rung's platform envelope.** The plan measured the
  cross-engine floor for rungs 1 and 6 only, and pinned rung 6's threshold from it. That evidence is now
  measured for all six rungs (§ Platform) and it is material to what #307 should build. It is reported as
  a separate fact, not folded into the reading.

**What the 256 px rule is worth, measured.** With it lifted (`MIN_AREA = 0`, nothing else changed;
the mutation is observable — the `excluded:` line stops naming `chevron` and `scored=` goes 7 → 8),
`chevron`'s floor p95 of **8.3125** becomes rung 2's floor, the margin condition fails
(12.5861 < 16.6249) and **the first firing rung is 6, not 2**. Rung 1 reads GREEN either way, so Q1 is
untouched. Granularities (a) and (b) are unaffected — no region there is under 256 px — but **(c) is the
one Q4 recommends #307 inherit**, so the rung named above rests on the rule. It makes rung 6 the safer
inheritance on two independent grounds rather than one: 20.6x separation, and independence from a
region-size rule this spike chose for itself.

**The epic's stated fallback is a no-op as written.** `canvas-design-import.architecture.md:313-314`
says "green → try per-section MIN before dropping it". Per-section MIN **is** E4's specified aggregation
(`visual_scorer.py:212`), so following it literally re-runs rung 1 and gets the same green. The real
fallback space is *within*-region — p95, p99, blurred mean, ink-masked mean, ink-colour ΔE — not across
regions, and that is the space this ladder walked.

**If the mapping had been right**, every rung reads the floor and nothing fires. That is the FLOOR
column, and it is what makes the SIGNAL column mean something.

## Proving the checks

Eleven controls, each run pristine and mutated. Both halves verbatim in `raw/controls.txt`.
`grep -c "DID NOT APPLY" raw/controls.txt` → **0**.

| control | what it proves | mutation | what went red |
|---|---|---|---|
| **C1** | the CIEDE2000 port equals `skimage.color.deltaE_ciede2000` — the same function E4 calls — over 500 fixed-seed pseudo-random sRGB pairs | delete the `R_T` hue-rotation term | max abs diff **8.88e-14 → 14.545** (worst pair `[212,105,175]`/`[97,123,131]`: port 39.8507, skimage 25.3057). **The four named hex pairs do not move under this mutation** — all four are near-neutral, where `R_T ≈ 0`. That is why C1 samples random pairs and not just those four |
| **C2** | the decoder is right on **content**, not just on length: 12 known flat colours rendered by the same Playwright, screenshotted, decoded, every block compared to its hex | replace the Paeth predictor with `v += a` | `#fedcba → #ffdcba`, `#000000 → #ffdd00`, `#ffffff → #fedc00`, `#7f7f7f → #7e5c29` |
| **C3** | identity — `ref.png` against itself is 0 under **every** rung at **every** granularity | offset the candidate by one row | worst non-zero **0.0e+0 → 39.91** (`c parts title` rung 3) |
| **C4a** | a known swap measures **exactly** on synthetic input: paper `#ffffff`, a hard-edged ink block, a `#f8f8f8` frame (ΔE 1.40 — below the 2.3 mask threshold, above half of it) | halve the ink threshold to 1.15 | inkMean **18.215350195 → 13.105**; the frame joins the mask, its own ΔE is 0, and the mean falls |
| **C4b** | on the **real** anti-aliased region, `inkMean === (coreN/inkN) x pairΔE` as an identity to 1e-9 | source: dilute the ink mean over the whole region (`/n` instead of `/inkN`) | 6.397057509 **→ 0.301**, identity broken by 6.096 |
| **C5** | **an empty measurement is missing, never a pass** — zero regions must throw | restore `sum/max(len,1)` and remove both refusals | the throw stops firing and `aggregate([])` returns a score instead of refusing |
| **C6** | two distance FORMULAS rank the same worst region — Oklab ΔE (`system/oklch.mjs:37`) against CIEDE2000, **given the same extracted ink means**. Both legs consume one `statsOne` extraction, so a wrong box, mask or modal corrupts both identically and C6 still agrees; the boxes are C7's evidence and identity is C3's. The legs are not even fed identical inputs — CIEDE2000 reads the unquantised float means, Oklab the 8-bit hex | **none, by design** — a disagreement stops the run and is reported | both name `subtitle` (CIEDE2000 17.9597, Oklab 0.0853) |
| **C7** | the region boxes land on the right **content** — `avatar`'s modal is `#f2f5fa`, `chip`'s is `#f1f7f2` | shift every box +20 px | `avatar` modal `#f2f5fa → #f8f8f8` |
| **C8** | **the harness measured what it claims to** — the four drop regions are identical between the two candidates to 0.0e+0 | substitute `m1-faithful` for `m1-wrong` | **C8 stays green, by design.** The drops were never going to move; what collapses is the signal — `title` 1.6638 → 1.3089, `subtitle` 1.0508 → 0.6973, both back to the floor. C8 catches a wrong pack link, a stale PNG or a mis-parameterised harness, which is a different failure from anything C1–C7 reaches. **The mutated comparison is self-identical by construction** — substituting `m1-faithful` compares `mean(ref, fa)` against itself, zero for *every* region and not only the four asserted, so half 2 exercises no box-placement or region-reading logic. Half 1 is where C8 does its work |
| **C9** | **rung 6 is registration-invariant** — the whole reason it is in the ladder | make rung 6 compare per-pixel ink instead of the two ink averages | pristine: a 1 px shift moves rung 6 by **0.0000** while rung 5 moves by **7.1361**. Mutated: rung 6 moves by 7.1361 too — the invariance is gone |
| **C10** | **rung 6's own limitation is stated, not hidden** — under M2 the moved surface penalises four regions whose **ink never changed**, via their anti-aliased edges | core-only ink mask (threshold 2.3 → 20) | pristine penalties `avatar +1.3689`, `chip +1.2450`, `chip-text +1.0644`, `chevron +0.5243`. Mutated: `+0.0000`, **−0.0738**, **−0.0738**, `+0.0000` — M2 reads *better* than M1 and the limitation is invisible |

**Two checks that are green for cheap, named because a green there means nothing.**

- **The decoder's length identity** `h * (1 + w * 3) === inflated.length` reads `239564 === 239564` under
  a *broken* Paeth predictor. It is an arithmetic check, not a content check. **C2 is the one that can
  fail**, and both are kept because neither alone is sufficient.
- **`gen-loc-summary --check`** is green on any tree that does not touch `system/`. Its positive control
  is mandatory and was driven — see § Validation below.

**Two plan-specified mutations were driven and found not to redden their control.** Both are recorded
rather than quietly swapped:

- **C4b's** plan mutation ("recolour only half the core") leaves the coverage identity holding at the
  new coverage (17.6%, inkMean 3.198528754, |diff| 3.1e-15). It is kept as C4b's **positive control** —
  it is what proves the coverage term is measured per run and not a constant fitted to one number.
- **C10's** plan mutation ("hold the modal fixed to the reference's") is a **semantic no-op** on this
  fixture: three of the four regions' modes are their own fill, not the paper, so holding the mode fixed
  changes nothing, and on the fourth (`chevron`, whose mode really does move `#f8f8f8 → #ffffff`) the
  penalty survives anyway. The mechanism is the anti-aliased **blend**, not the mode. Both readings are
  in `raw/controls.txt`.

## The floor, and why it decides the metric

This is the spike's most transferable finding and #307's actual input.

A same-renderer comparison — this repo's render under a right map against this repo's render under a
wrong map — would prove only that CIEDE2000 notices a colour change. True by construction, worth
nothing. The question is whether the signal survives comparing **a foreign tool's rendering** to **this
repo's**: different text shaping, different anti-aliasing, different sub-pixel geometry. That noise is
the floor, and the verdict is the margin above it.

**The obvious fix for E4's dilution is the worst rung of the six.** Masking to the glyph pixels and
taking their mean — rung 5 — has a floor of **20.5240** on `title`, **larger than the signal's own ink
ΔE of 18.2154**. It would have scored the wrong mapping as *better* than a faithful one. The cause is
glyph misregistration: the reference draws text as SVG `<text>` at Brilliant's own advance positions,
the candidate lets Chromium shape it, and an ink pixel in one image is a paper pixel in the other —
exactly the pixels an ink mask selects. **Per-pixel comparison of text across two shapers is unsound at
this scale.** Rung 5 is kept in the ladder and reported failing so #307 does not reach for it.

Rung 5's observed signal, 27.5252 against a floor of 20.5240, is a 1.34x margin — it clears the JND and
fails the 2x margin. The margin condition is what caught it; the JND condition alone would have passed it.

| mitigation | title floor | subtitle floor | chip-text floor |
|---|---|---|---|
| none (rung 5, ink-masked per-pixel mean) | **20.5240** | 14.1489 | 2.3013 |
| Gaussian blur σ = 1.5, region mean (rung 4) | 0.4064 | 0.0936 | 0.1104 |
| **ink-colour ΔE (rung 6)** | **0.0030** | **0.8716** | **0.2833** |

Blur fixes misregistration but not dilution — it is still a mean over ~95% paper, and rung 4's signal
(1.0430) never reaches 2.3. **Ink-colour ΔE fixes both**: it masks to ink so the paper cannot dilute,
and it compares the *average ink colour* rather than pixel positions, so a sub-pixel shift moves nothing
(C9: 0.0000 under a 1 px shift). The mean ink colour of the title region is `#777777` in both faithful
images — a mid-grey, because anti-aliasing blends glyph into paper and the same blend happens on both
sides — and `#58786f` under the wrong pack.

σ = 1.5 was fixed in the plan from a four-point sweep run against the **floor only**, before the signal
existed, and was not re-swept here.

**Rung 6's price, measured.** Because it masks each image by that image's own modal colour, a change to
the **paper** moves the ink average on a region whose **ink** never changed. C10 measures it: under M2,
`avatar` reads 1.3896 and `chip` 1.3473 with ink that is byte-identical. Both sit under the 5.0
threshold so neither is called red, but a source that moves surfaces and text together will inflate
rung 6 for the wrong reason. #307 inherits this limitation along with the rung.

## The plan's derived prediction, reconciled

The plan wrote a prediction down **before the run** so that a divergence would be evidence rather than a
shrug, and ended it: *"If the observed numbers contradict any of this, the harness is suspect before the
metric is."* Reconciling it is therefore part of the deliverable, not an optional courtesy.

| predicted (derived, in the plan) | observed | reading |
|---|---|---|
| title region mean ΔE ≈ 0.047 x 18.22 = **0.86** | signal **1.6638**, floor **1.3089**, increment **0.3549** | **not comparable to either figure as written** — see below |
| subtitle ≈ 0.046 x 23.17 = **1.07** | signal **1.0508** | lands on it, and that is a coincidence of the same kind |
| **rung 1 predicted GREEN** | **GREEN** | held |
| rung 5 predicted to fail in the other direction (floor 20.52 > the signal's own ink ΔE 18.22) | floor **20.5240**, signal **27.5252**, fails on margin at 1.34x | held |
| rung 6 predicted to separate cleanly | floor **0.8716**, signal **17.9597**, 20.6x | held |

**Why the two mean-ΔE numbers are not comparable, and why that is not a harness fault.** The prediction
models the region mean as if the ink swap were the *only* difference between the two images — a zero
floor. The observed signal is not that: it is the mean over a comparison that already carries the
cross-renderer floor, and **the same ink pixels carry both the misregistration error and the colour
error**. CIEDE2000 is not additive over two error sources on one pixel, so `signal ≈ floor + prediction`
was never the right identity, and neither `1.6638` (which includes the floor) nor `0.3549` (the naive
subtraction) is the quantity `0.86` names. The subtitle's apparent agreement (predicted 1.07, observed
total 1.0508) is the same arithmetic landing near the mark by accident: its floor is 0.6973, roughly half
the title's, so the unmodelled term is smaller there.

**What the prediction was actually for, and it held.** Its load-bearing claim was *qualitative* — that a
region ~95% paper would dilute an ink-sized defect below the 2.3 JND, so **rung 1 would read green not
because the mapping is right but because the mean divides the error by the paper**. Observed: 1.6638,
below 2.3, below 2 x the floor. All three rung-level predictions held. **The harness is not suspect: the
region geometry, the byte counts and every cross-engine floor reproduce the plan's pre-flight exactly
(§ Setup).** What the prediction got wrong is its own arithmetic model of how a floor and a signal
combine, and that is a correction to the plan's NOTES rather than to anything measured here.

## Platform

Every number above is macOS. The faithful render was captured on all three Playwright engines at
`deviceScaleFactor: 1` and re-scored. **Only the faithful render** — capturing the wrong render three
ways would invite reading a verdict off whichever engine separates best.

| engine | title r1 | title r6 | subtitle r1 | subtitle r6 | chip-text r6 |
|---|---|---|---|---|---|
| chromium | 1.3089 | 0.0030 | 0.6973 | 0.8716 | 0.2833 |
| firefox | 0.5697 | 0.4077 | 0.6973 | 0.8716 | 0.6906 |
| webkit | 1.4018 | **2.2093** | 0.8451 | **2.6888** | 0.8756 |

**The whole ladder's cross-engine floor** — worst scored region per engine, which the plan measured for
rungs 1 and 6 only:

| rung | chromium | firefox | webkit | worst | inflation vs chromium |
|---|---|---|---|---|---|
| 1 | 1.3089 | 0.6973 | 1.4018 | 1.4018 | x1.07 |
| **2** | 3.3462 | 1.0035 | **5.1005** | **5.1005** | **x1.52** |
| 3 | 43.9891 | 24.2755 | 45.1914 | 45.1914 | x1.03 |
| 4 | 0.4064 | 0.1547 | 0.4130 | 0.4130 | x1.02 |
| 5 | 20.5240 | 14.1489 | 22.0693 | 22.0693 | x1.08 |
| **6** | 0.8716 | 0.8716 | **2.6888** | **2.6888** | **x3.08** |

**Worst rung-6 floor across three engines: 2.6888** (WebKit `subtitle`). Rung 6's absolute threshold of
5.0 sits 1.86x above it, which is why the plan set it there rather than at the textbook 2.3 — 2.3 is
*inside* WebKit's noise and would pass a faithful map rendered in WebKit.

**Can platform variance close the observed margin?** Taking the worst engine's floor against the
chromium signal — a conservative pairing, and the honest one, because the signal was only ever measured
on chromium:

- **rung 2**: 12.5861 / 5.1005 = **2.47x**. The margin condition requires 2x, so rung 2 clears it by 23%.
- **rung 6**: 17.9597 / 2.6888 = **6.68x**. Clears by 234%.

So **both survive**, but rung 2's headroom is thin and rung 6's is not. **This assumes the signal does
not shrink on another engine, which was not measured and was deliberately not measured.** A Linux CI
runner is a fourth engine-and-platform combination and none of these three is it: this repo's visual
gate is Linux-baselined and a local macOS run fails 16 checks for platform reasons alone. **#307
re-measures on Linux before pinning any threshold.** What this bounds is the *shape* of the risk —
rung 6's floor tripled across three engines while rung 2's rose by half, and rung 6 still has three times
rung 2's proportional headroom.

## Not done

- **Brilliant desktop `export(png, outputPath)`** of `1db1b29957b949ca`, which would replace the SVG
  raster with a true PNG export. Owner's hand — the desktop app must be running and `init`-bound. It
  does not block: the SVG is Brilliant's own geometry and fonts, and the deviation is named in § Setup.
  #307 decides whether it wants the upgrade.
- **A `build-checks` group.** Group numbers are claimed in merge order (architecture § Concurrency) and
  #307 claims one. This ticket commits the fixture the group will read and nothing more.
- **`imports/<id>.json`, the import record, and every part of the fidelity block.** #307.
- **Geometry, type and spacing fidelity.** The primary map moves colour roles only and holds the
  source's geometry fixed across both renders, because wrong-but-green is a colour defect and a
  geometry-inclusive map would let layout error masquerade as colour error.
- **A second source, a Figma file, or a live Brilliant session.** The fixture was already on disk.
- **A vision loop.** E8 retired email-hub's `visual_verify.py`; this spike does not revive it.
- **A Linux measurement.** Named above as #307's step.
- **A signal render on firefox or webkit.** Deliberate — see § Platform.
- **A CIEDE2000 oracle that travels with the code.** C1's `8.88e-14` agreement — the reason every other
  number here can be trusted, because it clears the metric before any fixture is read — is produced by
  shelling out to `~/Desktop/email-hub/.venv/bin/python` (scikit-image) on **this machine**. That venv is
  not an arbitrary sibling: `email-hub` is where E4's own `visual_scorer.py` lives, the subject of the
  whole comparison. But it is a machine dependency, and nobody on another machine — and nobody here once
  that venv moves — can re-derive C1 without recreating it. `CIEDE_ORACLE=<python>` points `controls.txt`
  and `raw/oracle-probe.txt` at any interpreter that can `import skimage`; both refuse by name if the
  path does not exist, rather than failing as a bare ENOENT. **Setup:**
  `python3 -m venv .venv && .venv/bin/pip install scikit-image numpy`, then
  `CIEDE_ORACLE=$PWD/.venv/bin/python`. Checking a second independent CIEDE2000 implementation into the
  spike dir would close it properly; #307 inherits the choice.
- **Per-step `date +%T` stamps** (`raw/timings.txt` in the plan's file list). Not taken; § Timings is
  reconstructed from file mtimes and the plan commit, and says so. No number in this document depends
  on a timing.

## Files

```
README.md                       this document — the verdict
mapping.json                    the role map, the drop list in E1's three classes, both packs
capture.txt          PARKED     the Playwright capture driver — reference, four candidates, the boxes
compare.txt          PARKED     the pure-Node, zero-dep comparison — the shape #307's gate inherits
controls.txt         PARKED     the eleven controls and their mutation harness
wcag-probe.txt       PARKED     checkPairs over both packs
fixture/
  ref.png                       Brilliant's 06.svg rasterised, 361x221, DSF 1 — the reference
  m1-faithful.png               map M1 under the faithful pack — the FLOOR render  } the fixture pair
  m1-wrong.png                  map M1 under tokens.polaris.spike.css — the SIGNAL render
  m2-faithful.png               map M2 under the faithful pack (byte-identical to m1-faithful)
  m2-wrong.png                  map M2 under tokens.polaris.spike.css
  m1-faithful-firefox.png       the FAITHFUL render only, for the platform envelope
  m1-faithful-webkit.png        ditto — the verdict pair stays chromium
  regions.json                  the eight per-part rectangles in the shared 361x221 space
  harness-m1-faithful.html.txt  all four rendered variants; the :root block is the only difference
  harness-m1-wrong.html.txt     (the three base64 Manrope blobs are elided from the RECORD only —
  harness-m2-faithful.html.txt   identical in all four, ~126,700 base64 chars / ~95,000 decoded font
  harness-m2-wrong.html.txt      bytes each, and they would hide the three-byte :root diff that matters)
raw/
  capture.txt                   capture driver stdout, all three engines, verbatim
  deltae.txt                    comparison stdout, verbatim — the numbers
  controls.txt                  the control battery, pristine half and mutated half
  engines.txt                   the three-engine table, and every rung's cross-engine floor
  oracle.txt                    the skimage CIEDE2000 cross-check, verbatim
  oracle-probe.txt   PARKED     the script that produced oracle.txt — import compare.mjs beside it
  wcag.txt                      checkPairs over both packs, verbatim, plus its reddening control
```

Run a parked script by copying it to a `.mjs` in a scratchpad — Node refuses a `.txt` module entry, and
`tooling/drift-check.mjs:29` runs `node --check` over every tracked `.mjs`, which a throwaway spike
script has no business being in. **Run it from inside a checkout**: the four repo-reading scripts
(`compare`, `capture`, `controls`, `wcag-probe`) walk up from the working directory for
`.claude/plans/canvas-spike-s3/mapping.json` and refuse by name if they find none, so no path is tied to
the throwaway worktree this spike was written in (which AC14 deletes after merge). `oracle-probe.txt`
needs no repo path — only `compare.mjs` beside it, and an oracle.

```
cp compare.txt /tmp/compare.mjs
cd <checkout> && node /tmp/compare.mjs [--self <png>] [--engines]
```

| override | what it replaces | needed when |
|---|---|---|
| `UXF_ROOT=<checkout>` | the cwd walk | running from outside a checkout |
| `UXF_VR_TREE=<checkout>` | `ROOT/tooling/visual-regression` — Playwright's node_modules, used by `capture.txt` and control C2 | the checkout you run from is a fresh worktree, which has none |
| `CIEDE_ORACLE=<python>` | `~/Desktop/email-hub/.venv/bin/python` — C1's skimage oracle | any machine but this one — see § Not done |

`controls.txt` needs `compare.mjs` copied **beside it** in the scratchpad; `raw/oracle-probe.txt` imports
it the same way. Every raw file re-derives from these scripts: `raw/wcag.txt` including its last three
reddening-control lines, which the probe now produces rather than leaving to a hand run.
