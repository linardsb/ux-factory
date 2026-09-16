# PR #422 review — S1, the free-position substrate under load (#297)

**Head** `c7b63b58` · **Base** `main` @ `894feeeb56d41510c5567ff5ee8a12a945f6787b`
**Reviewed** 2026-09-16 · first round (no prior `pr-422-review*.md`, so the guarantees pass is not triggered)
**State** OPEN · `MERGEABLE` / `CLEAN` · 16 files, +3105/−0, all under `.claude/`

## Recommendation

**Request changes — prose, attribution and one trailer. The verdict stands and the spike does not need
re-running.** 1 high · 2 medium · 4 low (F5–F7 in the addendum, from the code-reviewer agent's apparatus pass).

**The apparatus is sound.** The compositions are real, the arrow redraw is model-derived and genuinely
per-move (the 42-redraw arithmetic only closes if 40 real moves each redrew), the controls can fail and
two of them did, and the sampler was proven able to go red before any green was believed. That is why
the one reading below is worth acting on: a trustworthy apparatus recorded it.

One sentence in the deliverable is false against this PR's own committed raw output, and three surfaces
credit a real measured failure to a known apparatus artefact (**F1**). The figures are all correct and
correctly labelled; the decision-rule branch does not move. This is the #107 shape — a digit that
survives re-observation without licensing the sentence built on it. One commit of prose fixes it.
Separately, `Closes #297` would close the ticket with its epic-comment AC still open (**F2**).

**Acceptance criteria, as reviewed:**

| AC | state | note |
|---|---|---|
| #1 README in spike C's shape | ⚠️ **partial** | verdicts · setup · caveats · node count · not-done all present and strong. "INP per gesture per engine **per configuration**" is delivered for (a) and throttled (a) only; (b)'s absence is stated and reasoned, **(c)'s is not**. See F1. |
| #2 verdict comment on epic #295 | ❌ **not done** | owner-gated, drafted, correctly not posted. See F2. |
| #3 nothing under `system/` moves; harness not `.mjs` | ✅ | diff against base touches only `.claude/plans` and `.claude/reports`; `find … -name '*.mjs'` → 0 (observed) |

## Validation

| gate | run at | exit | result |
|---|---|---|---|
| `node tooling/build-checks.mjs` | `c7b63b58` | **0** | **all 34 groups pass** (observed) |
| `node tooling/drift-check.mjs` | `c7b63b58` | **0** | **✓ all 13 checks** (observed) |
| `git diff --stat 894feee..c7b63b5 -- system/ tooling/ agent-layer/ handoff/` | — | 0 | **empty** — no protected tree moved (observed) |

Both gates ran in a detached worktree at the PR head. `drift-check` first failed with
`ERR_MODULE_NOT_FOUND: style-dictionary` — the fresh-worktree artefact the report already names — and
went green after linking `tooling/style-dictionary/node_modules`. Same cause the author recorded; not a
finding.

**Figures re-derived at `c7b63b58`** (the report cites `9b2e862`, one commit earlier — re-deriving at head
closes that staleness rather than leaving it). All seven headline figures are **observed and correctly
labelled**:

| figure | claim | re-derived from `raw/` | ✅ |
|---|---|---|---|
| worst drag INP, cfg (a) | 56.0 ms | `chromium-a-throttled.txt` — all 3 drag rows 56.0; `all-a.txt` max 48.0 | ✅ |
| worst drag INP, run-wide | 64.0 ms | `chromium-c-throttled.txt` marquee-drag ×5 | ✅ |
| worst (a) drag rAF gap | 33.3 ms | `chromium-a-throttled.txt`, all 3 drag rows | ✅ |
| worst drag rAF gap, run-wide | 33.4 ms | `chromium-c-throttled.txt` drag @0.5 | ✅ |
| throttled zoom sweep | 83/241 over 33 ms, 1 LoAF | `chromium-a-throttled.txt` | ✅ |
| derived 34.4% | 83 ÷ 241 = 34.44% | arithmetic sound, labelled `derived` | ✅ |
| stage nodes / headroom | 681 · 119 to spare | `all-a.txt`; 800 − 681, labelled `derived` | ✅ |
| zoom cost | 0 redraws / 72 wheel events | `zoom-cost-probe.txt` | ✅ |

The PR body's "worst drag INP" configuration labelling — corrected at PR time in commit `c7b63b58` — is
right. That correction is the model of the pass this review is running; it just did not reach the
sentence below.

## Issues

### F1 — High · a false absolute claim, and three surfaces that hide the row falsifying it

`.claude/plans/canvas-spike-s1/README.md:17` (Verdicts table, first row) ends:

> …**zero** frames over 33 ms and **zero** long-animation-frames in every unthrottled drag on every engine.

**`raw/all-c.txt` falsifies it.** chromium, cfg=c, **unthrottled**, marquee-drag ×5:

```
  marquee-drag x5            INP 56.0 ms
                             … max 33.3 · >33 ms: 1 · LoAF: 1 · redraws 42
    FAIL  zero LoAF entries overlap the marquee-drag window  ·  [{"start":1617.699999988079,"duration":51.80000001192093}]
```

Re-derived from that leg's own JSON: window `t0 1602.8 → t1 2992.3`, LoAF at `1617.7` for `51.8 ms` —
14.9 ms inside the window, above the `≥ 50 ms` bar. **The driver's own assertion flagged it FAIL**
(`driver.txt:273`), against the threshold the README itself names at line 82 ("worst rAF gap ≤ 50 ms,
**zero LoAF ≥ 50 ms in the window**"). A sweep of every drag row in all five legs finds **exactly one**
such row run-wide — this one. So the clause is false by one row, and the row is on the primary engine,
unthrottled.

**It is not dismissible as "a different configuration," on the README's own argument.** Line 151 reads:
"(c) is not a mitigation for drags; at one move per frame it *is* (a), so this is run-to-run spread, not
a configuration effect." That identity is what licenses importing cfg=c's *worse* 64.0 ms and 33.4 ms as
the run-wide worst drag figures two clauses earlier. Having claimed the identity for the figures, the
same identity carries the LoAF. You cannot import one and not the other.

The harness bears the identity out: `harness.html:236–237` shows (c)'s drag path differs from (a) only
by a pending-flag rAF hop around the same `redrawArrows()`, and the observed redraw count is identical
(42 vs 42 on every engine, every leg). That row measures the same substrate under the same gesture.

**No cause is named here, deliberately.** The entry sits 14.9 ms into the window, which is suggestive of
gesture-start cost, but nothing in this run isolates gesture-start from steady-state. Report the
observation and that the driver flagged it; naming a mechanism would be the #121 error.

**Four fix surfaces — the fourth is not in the working tree:**

1. `README.md:17` — the false clause. Scope it: *"…in every unthrottled **configuration-(a)** drag on
   every engine; one unthrottled cfg=c chromium marquee-drag recorded 1 frame over 33 ms and a 51.8 ms
   LoAF, which its own check flagged."*
2. `README.md:315` (Files table) — "3 checks failed: the deferral control on chromium/firefox, **and on
   webkit's standard regime**." WebKit's control **PASSED** (`42 → 5`, DEFERRAL ENGAGED). The third
   failure is chromium's drag-window LoAF. No per-regime check is emitted; the control fires once per
   engine.
3. `.claude/reports/…-297-report.md:83` — `| node driver.mjs all c | 1 | 3 fails — the deferral control
   (the finding) |`. Two of the three are.
4. **The PR body**, "Driver legs" table: `| all c | 1 | 3 fails — the deferral control, which is F2 |`.
   Most-read surface, and the only one a file-edit pass will miss.

**The cheapest fix is the one AC #1 already asked for.** `README.md:192`, the Configuration (c) section,
reports redraw counts only — no gesture table — so the one place a reader goes for cfg=c omits the
hardest unthrottled row in the matrix. AC #1 reads "INP per gesture per engine **per configuration**";
(b) and (c) have no such table. The (b) omission is stated and reasoned in *What was not done*; the (c)
omission is not stated anywhere. Rendering the cfg=c table from `raw/all-c.txt` — the data is already
committed — satisfies the AC and makes the falsifying row visible in the same edit.

**Why High and not Medium:** the swap PR (#302) inherits this verdict. A reader of "zero
long-animation-frames in every unthrottled drag on every engine," told in the same breath that the three
failures are a known apparatus artefact, has no reason to open `all-c.txt`. That is a figure a later
ticket could de-scope work on.

**Why it does not reopen the verdict:** the plan defines "zero dropped frames" as the **rAF-gap** metric
("the portable cross-engine metric … is what 'zero dropped frames' is measured with everywhere",
`canvas-spike-s1-substrate-load-297.md:312`). That row's worst gap was 33.3 ms, inside 50 ms. Branch 1
for T4/T5 survives, the count of 3 is right, and only the sentence around it is wrong.

### F2 — Medium · `Closes #297` will close the ticket with AC #2 unmet

The PR body carries `Closes #297`. Ticket #297's AC #2 is:

> The verdict line and the branch taken are **posted as a comment on epic #295** before #302 is planned
> (the spike-verdict-before-dependent-planning rule).

It is **not done** — correctly. The comment is outward-facing on a tracker the owner reads, the plan
made it owner-gated, and the report and PR body both say so plainly. Leaving it unposted is the right
call and the honesty contract working in the direction that costs something (memory
`honesty-contract-mirror-direction`).

**The defect is the trailer, not the omission.** `Closes #N` in a PR body does close on merge (memory
`prs-dont-auto-close-tickets`, confirmed on PR #145). So merging this closes #297 with the one AC that
exists to gate #302's planning still open — and #302 is the swap PR behind the epic's one-way door. The
ticket stops being the reminder.

**Fix: post the drafted comment on #295 before merge, then merge.** Owner's action — the draft is in the
report, and epic #295 currently carries no S1 verdict comment (checked, observed: latest two comments
are the inherited-spike note of 2026-08-28 and the borrowability-audit note of 2026-09-15).

Dropping the `Closes #297` trailer would also keep the ticket open, but it trades an unmet AC for a
violated house rule — CLAUDE.md § Git: "A PR body **MUST** carry a `Closes #N` trailer for the ticket it
finishes." Available, but it costs a rule; the comment is the right fix.

### F3 — Low · `driver.txt:245–255`, the @0.5 drag prints two cells it never asserts

The `drag one frame @ 0.5` block runs `measureINP` and `sample` with `{ loaf }`, prints both in `row(...)`,
then asserts only the scale-aware movement check and `worst rAF gap <= 50 ms`. There is no `INP <= 200 ms`
check and no `zero LoAF` check, unlike the `@1.0` block (`driver.txt:239–241`) and the marquee block
(`driver.txt:272–274`).

Every printed @0.5 value is comfortably inside, so no claim rests on a wrong cell. But the verdict's
"every drag row on every engine" quantifies over two rows per leg that the apparatus never gated — the
`check-that-cannot-fail` shape, pointed at the gate rather than the check. One line each in that block.

### F4 — Low · the drag divides by the *initial* scale, not by `--sx-scale`

`harness.html:259–260`:

```js
const dx = (e.clientX - drag.px) / SCALE;
const dy = (e.clientY - drag.py) / SCALE;
```

`SCALE` is the query-string constant, fixed at load. The ⌘-wheel handler (`harness.html:278–285`)
updates `liveScale` and writes `--sx-scale`, and never touches `SCALE`. So after a zoom, a drag divides
by a stale factor.

**No number in this PR is affected.** The driver opens a separate page load per gesture and never zooms
mid-run — `driver.txt:245` says so in its own comment — so `SCALE === liveScale` for the whole of every
drag row, and the observed `expected 440.0 px · observed 440.0 px` at `?scale=0.5` is right.

**The reason to flag it is the sentence, not the harness.** Deviation #4 and the README's control table
both describe this as "the handler divides by `--sx-scale`". It divides by the scale the page loaded
with. In a throwaway harness those are the same thing; in the real studio zoom and drag interleave,
which is the whole point of a canvas — so a swap-PR author inheriting that phrase inherits a bug. Either
read `getComputedStyle(...).getPropertyValue("--sx-scale")` (or `liveScale`) in the handler, or reword
the two descriptions to say "the load-time scale, since the harness never zooms mid-gesture".

### Minor — the PR body's file count

"9 raw output files" (PR body, *What changed*) matches neither count. `raw/` holds **11** tracked files
at `c7b63b58`: **8** driver/probe stdout captures and **3** `.source.txt` probe sources. Nothing rests on
it; fix it in the same pass as F1 since the body is already being edited.

## What is good

- **The controls are the point of this spike and they were built to fire, then fired.** Both configuration
  controls refused their own number rather than reporting one — cfg=b blocked Chromium's (b) figures, cfg=c
  blocked the deferral figures — and each refusal became a reported finding (the PR body's own two, which
  are not this review's F1–F3) instead of a green row. That is the right instinct and it is rarer than it
  should be.
- **The `--slow-arrows` mutation proved the sampler can go red before any green was believed** (16.8 →
  133.3 ms, `>33 ms` 0 → 41, LoAF 0 → 41). The apparatus was shown capable of failing first. This is
  exactly what memory `check-that-cannot-fail` asks for and it was done unprompted.
- **The confounded first containment probe was published under Issues, not quietly dropped.** It would
  have supported a cross-engine claim that is false (Firefox and WebKit do cull). Writing up a
  near-miss that nobody would have caught is the honesty contract working in the direction that costs
  something.
- **The zoom-cost probe corrected a mitigation the README had already asserted.** "Defer arrow redraws
  during zoom" was wrong — 0 redraws across 72 wheel events — and the probe was added *because* the draft
  claim needed checking. The architecture's own prescribed remedy was contradicted by measurement and the
  contradiction was reported rather than softened.
- **`content-visibility: auto` was isolated, not just observed failing.** The 4-case placement × scale
  matrix turns "it didn't cull" into "T4's translate positioning and T2's scaled ancestor each defeat it
  independently on Chromium 149, and Firefox/WebKit are unaffected" — which is what the swap PR can
  actually act on. The claim is correctly bounded to three named builds and a date.
- **T2 was split out rather than folded into a green drag verdict.** The easy sentence ("holds on all
  three → ship T2/T4/T5") was available, would have passed the plan's own decision rule, and would have
  been retracted by the README's own Caveat 6. Declining it is the single best judgement call in this PR.
- **AC #2 was left owner-gated and not posted.** The epic #295 verdict comment is drafted in the report
  and not on the tracker. Correct — outward-facing, and not the agent's call.
- **Caveat 8** ("the harness is cheaper than the substrate it stands for") names ten absent subsystems and
  states plainly that a green S1 licenses "the three new properties hold," never "the canvas will be
  fast." That is the caveat most likely to be skipped and it is the most load-bearing one here.
- All five documented deviations are genuine plan errors caught before implementing, and all are logged.
  None is flagged in this review; that is what a documented deviation is for.

## Not findings — checked and cleared

- **All seven headline figures** re-derived from `raw/` at head. Correct, and each correctly labelled
  `observed` or `derived`. See the validation table.
- **The `n/a by spec` cells.** Wheel and scroll carry `interactionId: 0` and `inp-observer.mjs:38` drops
  falsy ids. The README prints `n/a by spec`, never `0 ms`, on every such cell — the trap the plan named
  at line 317 and it was avoided everywhere.
- **The `swept 0.3 -> 2.0 -> 0.3` display** against `"seen":{"min":0.25,"max":2}` in the JSON — `toFixed(1)`
  rounding of 0.25, not a different number.
- **`git status` over the protected trees.** Verified empty by diff against the base: only `.claude/plans`
  and `.claude/reports` moved.
- **Gates run at the described commit.** The PR body claims `c7b63b5`; both gates re-run there, green.
- **Every derived percentage.** 56/200 = 28%, 33.3/50 = 67%, 64/200 = 32%, 33.4/50 = 67%, 83/241 = 34.4%.
  All sound, all labelled.
- **The node arithmetic.** 665 scroller nodes − 29 arrows ÷ 30 frames ≈ 21.2 → "about 21 per frame";
  119 ÷ 21.2 ≈ 5.6 → "about 5.6 more frames"; 40 × 21.2 > 800 → "a real flow at 40+ frames crosses the
  warning"; the plan's ~45-node headroom estimate → "~755". Each follows.
- **Engine versions.** `chromium 149.0.7827.55 · firefox 151.0 · webkit 26.5` appear in the probe's own
  stdout, not only in prose.
- **"The two heaviest cells in the whole table are zoom sweeps."** True of the (a) table: webkit 43.0 and
  chromium 33.4; the next is webkit's @0.5 drag at 23.0.
- **`scrollend` 40/40 · 40/40 · 31/40.** Matches `all-a.txt`, the cited file. (WebKit reads 27 in `all-b`
  and 32 in `all-c`; the verdict is "does it fire", which holds everywhere, so the spread is not a claim.)
- **Timings table** 14:45:37 → 15:00:03 supports "~15 min" and "nothing was cut for time".
- **The compositions are genuinely real.** `harness.html:134–174` imports `renderComposition` from the
  real `/system/agentic-renderer.mjs`, fetches the real `vocabulary.json` and `pack.json`, and builds
  every frame from committed `example` props. Verified independently: all 8 names in `PARTS` exist in
  `pack.json` with an example, and all 20 components carry one — so no frame can silently render empty.
  A throw would fail the top-level await and show as a page error, which every leg asserts zero of.
- **The redraw counts prove the drag really recomputed geometry per move.** `redrawArrows` fires once at
  load, once per `pointermove`, and once on `pointerup` — 1 + 40 + 1 = **42**, which is the observed
  count in every (a) and (b) drag row on every engine. WebKit's engaged (c) run reads 5, consistent with
  1 + ~3 coalesced + 1. The arithmetic is only satisfiable by 40 real moves with a real redraw each, so
  T5 was genuinely under load.
- **The zoom handler matches the zoom-cost finding.** `harness.html:278–285` `preventDefault()`s and
  writes only `--sx-scale` — no arrow redraw on the path, which is why the probe reads 0/72. The claim
  follows from the code, not only from the count.
- **Arrow geometry reads the model, never `getBoundingClientRect()` per arrow per move**
  (`harness.html:216–228`), so the row measures the substrate rather than the harness's own layout
  thrash. That is the harder thing to get right and it was got right.
- **The headed-browser eyeball pass and the `/favicon.ico` 404** are self-reported and not reproducible
  from the artefacts. Recorded as such, not counted against the PR — the honesty contract asks for the
  label, which is present.

---

## Addendum — the `code-reviewer` agent's apparatus pass

Dispatched per the skill's Phase 4; it returned after the review above was posted. Three further findings,
each re-verified here against `c7b63b5` before being written down. Codes continue from F4 rather than
renumbering. **None changes a figure, and none reopens the verdict.**

### F5 — Medium · `driver.txt:267–271`, the marquee control cannot fail on four of its five frames

```js
const movedAll = await p.evaluate(() => [...document.querySelectorAll('.sx-frame[data-picked="1"]')]
  .every((e) => parseFloat(e.style.getPropertyValue("--x")) > 0));
…
t("all five picked frames moved together — the gesture is genuinely five times heavier",
  movedAll && d.movedEnough, …);
```

`movedAll` tests `--x > 0`, not that anything moved. Re-derived from `harness.html:183–188`
(`PAD + (i % COLS) * PITCH_X + ((i * 37) % 60)`), frames 0–4 start at **x = 40, 407, 714, 1081, 1388** —
every one already positive before the pointer goes down — and the drag adds **+220**, so the predicate
holds whether the handler moved four, one or none of them.

The other conjunct, `d.movedEnough`, is the rigorous scale-aware check — but `dragFrame` captures
`before`/`after` for **`id: 0` alone** (`driver.txt:135–157`). So four of the five picked frames have no
movement proof at all, and the check named "all five picked frames moved together" is the one thing it
cannot detect.

**The mechanism does work** — `harness.html:261–267` writes `--x`/`--y` for every id in `drag.ids`, read
and confirmed. So the marquee row really is five frames moving and no figure is wrong. What is wrong is
that the spike's *evidence* for "genuinely five times heavier" is a control that would stay green if it
weren't. This is the repo's own `check-that-cannot-fail` shape, and it lands on the marquee row —
the same row F1's LoAF fired on.

Medium here because nothing shipped is false; **treat it as High before this driver is reused**, which
the swap PR's own harness is the obvious candidate to do.

*Fix*: capture before/after for all five picked ids and apply the existing
`Math.abs(observedDx - expectedDx) < 5` test to each.

### F6 — Low · the frame-count floor guards one gesture block in five

`driver.txt:125–126` computes `max: gaps[gaps.length - 1] ?? 0` and `over33` from the same array, so an
empty or single-entry `gaps` reports `max: 0, over33: 0` — indistinguishable from a genuinely clean
window. Only the `@1.0` drag block carries the guard against that (`driver.txt:238`,
`s.frames >= 20`); the `@0.5` drag, the marquee, the zoom and the pan blocks do not.

It never fired in this run — 302/241/215/66 frames observed per leg — so no number is affected. It is
the same class as F3: a printed cell no assertion stands behind. One line per block.

### F7 — Low · "nothing else" is elimination, not isolation

`README.md` (verdicts and §The numbers): "**The zoom cost is the browser re-rasterising 30 scaled
compositions, nothing else.**"

The zoom-cost probe is sound and proves what it measures: 0 arrow redraws across 72 wheel events. But
`harness.html:48–52` sizes the scroll extent as
`width: calc(var(--sx-content-w) * var(--sx-scale))` — so every `--sx-scale` write also resizes
`.sx-sizer` and forces a layout, a second scale-dependent cost on the same path (and one the real
substrate shares, `studio.css:69`). The probe rules arrows out; it does not separate rasterisation from
sizer relayout.

Same class as F1 — a sentence stronger than the run behind it, and the skill's named attribution defect:
what was held constant to isolate the credited mechanism? Here, nothing was. The practical
recommendation survives untouched (coalescing the scale write to one per frame reduces both costs), so
this is a wording fix: "the cost is re-rasterising 30 scaled compositions plus the sizer's own
scale-dependent relayout; arrows are ruled out, the two are not separated."

### Cleared by the agent's pass, independently of mine

- The rAF sampler is a faithful mirror of `studio-journey.mjs`'s trusted implementation, and
  `OBSERVER_INIT` / `summarize` / `violations` are genuinely imported, not reimplemented.
- The rendering path fails loud three ways: `renderComposition` validates before building and throws;
  `pageerror` listeners attach before `goto`; and `data-ready="1"` is never set on a throw, so
  `waitForSelector` would time out. A silently empty frame is not reachable.
- The corrected containment probe's two placement modes are genuinely orthogonal to scale.
- No uncaveated cost bias in the harness: the 8 composed templates average *more* DOM construction than
  the 12 unused ones and include the heaviest of all 20 (`list-row`); the absent CSS transition on the
  scaled path matches the real substrate's own deliberate absence (`studio.css:466`); and the omitted
  `@property` registration is already disclosed at `README.md:73–74`.
- `driver.txt:112–116` reads `window.__loaf` with no flush after `t1`, so a tail-of-window LoAF could in
  principle arrive late. Inherited byte-for-byte from `studio-journey.mjs:6418–6422` **on purpose**, so
  the two passes stay comparable. Not a defect in this PR; a note for whenever `studio-journey.mjs`
  itself is revisited.

**Revised count: 1 high · 2 medium · 4 low.** The recommendation is unchanged — prose, attribution, one
trailer, and now four small driver edits. No re-run.

---

_Posted by `piv-review-pr`. A human now reviews the code, this review, and merges._
