# Code review — PR #188 · `feat(proto)`: pack skin + dock + inspect on Verdant/Fieldwork (#175)

**Reviewed at** `eee4de9` · base `origin/main` @ `0224953` (merge-base is current — no generated-file conflict)
**Recommendation: REQUEST CHANGES** — two Medium defects, both introduced by this PR, both with small fixes.
Nothing Critical or High. Everything else in a large, unusually well-documented change verified clean.

## Summary

This is careful work. The central risk — moving 296 lines of chrome CSS between two sheets — was
verified independently and is **genuinely byte-identical**: comparing comment-stripped declaration
multisets, the only net-new declarations in `components.css` are the 5 lines of the new
`.dock`-scoped reduced-motion block. Zero value drift. The report's deviations are honest, the
factory-churn prediction was tested rather than assumed, and deviation 6 (post-render inspect
re-init) is a real defect caught before merge.

Both findings below are the same shape: **the PR adds two new controls to the proto pages, and the
validation covered one of them.** The dock got a reduced-motion rule and a load-order comment; the
inspect toggle got neither, and the load-order comment turns out to be false for both.

## Issues

### 1. [Medium] The ⌘K palette can permanently lose commands on the two proto pages — a race that exists on no other page

`proto/verdant.html:199-206`, `proto/fieldwork.html:216-223`

Every other shipped page loads the dock with a **static** module tag before `palette.mjs`
(`index.html:414-415` → `:426`), so document order guarantees the dock exists when the palette
builds its command list. The proto pages instead use a **dynamic** `import()` inside a body-end
module, which cannot even begin until the inline data module's top-level `await` chain settles —
on fieldwork that is a vocabulary fetch plus two *sequential* `await fillSlot(...)` calls
(`proto/fieldwork.html:198-203`). `palette.mjs` then memoizes its command list on first open
(`commands ??= buildCommands()`, `system/palette.mjs:216`) and never rebuilds it.

**Measured, all three engines** (local server, warm cache — a real network widens this):

| Page | chromium | firefox | webkit |
|---|---|---|---|
| `/proto/fieldwork.html` | palette live **29ms** before dock | **134ms** | **50ms** |
| `/proto/verdant.html` | **17ms** | **100ms** | **21ms** |
| `/approach.html` (control) | dock ready first (0ms) | 0ms | 0ms |
| `/work.html` (control) | dock ready first (0ms) | 0ms | 0ms |

**Failure scenario** — reader presses ⌘K while the page is still settling. Opening the palette
inside that window memoizes a list with `"Copy tokens"` missing, permanently for that page view.
Reproduced against a settled-page control on the same page (settled: present everywhere):

| | chromium | firefox | webkit |
|---|---|---|---|
| fieldwork, palette opened immediately | present | **missing** | present |
| verdant, palette opened immediately | present | **missing** | **missing** |

Firefox loses it on both pages, matching its widest window; chromium is intermittent at 17–29ms.
Only `"Copy tokens"` is affected — `"Turn inspect mode on"` keys off `[data-inspect]`
(`system/palette.mjs:119`), which the page's own `innerHTML` has already landed by then, and it was
present in every controlled run.

**The mechanism matters for the fix:** the gap is the time to fetch *and* evaluate `dock.mjs`'s
module graph, which cannot start until the body-end module runs, because a dynamic `import()` is
only discovered at evaluation. A static tag is fetched at parse time and evaluated in document
order — which is exactly why the control pages measure 0ms.

**Suggested fix (needs your design call, so treat this as the measurement plus an option, not a
prescription):** give `dock.mjs` a static `<script type="module" src>` tag like the other eight
pages and move the top-window check inside it — `buildDock()`/`buildRuler()` early-return when
`window.self !== window.top`. Two caveats I could not resolve from the outside:

- **Leave `inspect.mjs` exactly as the PR has it.** An early return inside `inspect.mjs` would break
  the in-frame path this PR deliberately preserves and I agree with: `palette.mjs:126-127` lazily
  imports it and calls `getInspect() ?? initInspect()`, so a reader driving ⌘K inside a frame still
  gets the layer. Gating the module itself kills that.
- **`dock.mjs` imports `pack-derived.mjs`,** whose module tail honours `?brand=`. That already runs
  on these pages today via the dynamic import — a static tag makes it run *earlier*, not newly — but
  it is worth confirming it does not race `pack-boot.js`'s pre-paint restore before you commit to it.

Note that dropping the two `await fillSlot(...)` calls does **not** fix this: it shifts the dock and
the palette earlier by the same amount, leaving the gap unchanged.

Related: the comment "Script order mirrors index.html: dock → inspect → palette"
(`proto/verdant.html:191`, `proto/fieldwork.html:208`) is demonstrably false as written — the
relative order matches, the loading mechanism and therefore the timing do not. Worth correcting
whichever way the fix goes.

### 2. [Medium] The PR's own new control is the one thing its new reduced-motion kill-switch misses

`system/components.css:2439-2445` vs `proto/verdant.html:41`, `proto/fieldwork.html:43`

The new kill-switch scopes `.dock, .dock *, .dock *::before, .dock *::after`. `.inspect-toggle` is
a `.btn` sitting in `.proto-head-tools` — a *sibling* of `<aside class="dock">`, not a descendant —
so it is not covered, and `portfolio.css`'s universal kill-switch is not loaded on these pages at
all. `.btn` carries real motion: colour transitions plus `transform: scale(0.96)` on `:active`
over `var(--motion-bounce)` (`system/components.css:170,174`).

**Measured on `/proto/verdant.html`, all three engines:**

| Element | `reduce` | `no-preference` |
|---|---|---|
| `.dock-toggle` (covered) | `1e-05s` ✓ | `0.16s, 0.16s, 0.3s` |
| `.inspect-toggle` (**new, uncovered**) | `0.2s, 0.2s, 0.3s` ✗ | `0.2s, 0.2s, 0.3s` |
| `.vd-care-task-row` (pre-existing) | `0s` | `0s` |
| `.vd-plant-card` (pre-existing) | `0s` | `0s` |

Identical durations under both preferences = completely unchecked. This is **not** a pre-existing
gap the move exposed: every pre-existing proto element measures `0s`, so this PR introduces the
first unchecked motion on these two pages. A reduced-motion reader pressing the button gets the
full spring squish.

The report's validation — "dock transitions collapse to `1e-05s` under `reduce`" — is accurate and
was run properly; it just tested the control that was already covered. (Repo memory
`check-that-cannot-fail`: the check skipped the thing it tested.)

**Minimal fix:** add `.inspect-toggle` to the selector list at `system/components.css:2440`.

### 3. [Low] `vd-status-chip` is the site's first inspect mount on an `aria-hidden="true"` element

`proto/verdant.html:99`

The chip is removed from the accessibility tree, yet inspect mode gives it a visible dashed outline
and `cursor: help`, and `show()` sets `aria-describedby` on it (`system/inspect.mjs:154`) where no
AT will ever read it. Home's mounts are `<section>`, `<article>`, `<a class="btn">` — non-focusable
mounts are established and fine (the engine wires mouse *and* focus deliberately), but none is
`aria-hidden`. Measured: all six verdant mounts open a bubble by mouse on all three engines —
**including the `disabled` `#log-care`**, confirming the report's finding — while four of six are
not keyboard-reachable, which matches home's existing pattern and is not itself a new defect.
Consider dropping the mount to the chip's parent row, or accepting it explicitly in a comment.

### 4. [Low] Toggling inspect from inside a `work.html` embed persists globally

`system/palette.mjs:126-127` → `system/inspect.mjs:222-232`

The gating comment says a reader who deliberately drives ⌘K inside the frame "still gets the layer",
which is a reasonable call — but `toggleInspect()` uses the default `{ persist: true }`, writing
`factory-inspect=on` to same-origin `localStorage`. A later **top-level** visit to either proto page
then auto-enables inspect mode on a visit where the reader never asked for it. Fix: pass
`{ persist: false }` when `window.self !== window.top`.

### 5. [Low] The un-regenerated `approach` baselines now encode stale digits

Deviation 2 is documented and its reasoning (avoiding the known count-up flake, memory
`vr-gate-approach-countup-flake`) is legitimate — recording the cost, not disputing the call.
`approach.html:241-265` renders `runtime.linesApprox` and `params.total`; both changed
(18,900 → 19,000 and 72 → 74), and the committed baselines still hold the old digits because the
delta sits under `maxDiffPixels: 100` (`playwright.config.mjs:21`). Per memory
`vr-tolerance-hides-text-changes`, a green run under that tolerance is not evidence the page is
unchanged. Concrete downstream cost: the next PR touching `approach` will show a diff mixing its
own change with #175's. Your call whether to force the re-capture here or leave a note for #176.

## Validation

| Check | Result |
|---|---|
| `node tooling/drift-check.mjs` — run on the **clean** tree, not staged | ✓ all 11 groups |
| CI `verify` / `visual` at `eee4de9` | ✓ both pass |
| Base freshness (`merge-base` vs `origin/main`) | ✓ identical — no conflict |
| CSS move byte-identical (independent multiset check) | ✓ only the 5-line kill-switch is new |
| `data-inspect` ↔ `inspect-data.json` | ✓ gated by drift-check's `inspect-mounts` group |
| `param-manifest` → `param-count` | ✓ reconciles to 74 |
| Ruler does **not** leak onto the protos | ✓ sections land in `main > div > div`; confirmed in the baselines |
| Dock genuinely present in the 4 new baselines | ✓ capture width 1280 > the 1100px hide threshold |
| Cross-engine probes run for this review | 5 probes × chromium/firefox/webkit |

**Note on this commit:** the review file itself is committed to the PR branch per the CLAUDE.md
artifact rule, which moves the head off `eee4de9` and re-triggers CI. It is a markdown-only change;
confirm both jobs are green at the new head before merging, and read any `approach` failure as the
known count-up flake (memory `vr-gate-approach-countup-flake`) rather than a regression.

## What's good

- **The move is honest.** Verified independently rather than taken on trust, and it holds exactly.
- **Deviation 6 is a real save** — `inspect.mjs` wiring triggers once at activation while the page
  still awaits its data would have shipped a screen wired to nothing. The `destroy()`-before-create
  guard with `persist: false` makes the re-init correct, which I confirmed by reading the teardown path.
- **Deviation 1 was tested, not assumed** — predicting factory churn and then proving it doesn't
  materialise (`graphVisible=false panelHidden=true`) is the right instinct.
- **Deviation 3 corrects the plan rather than following it** — catching that the plan's "+3 / total
  65→68" was stale, and that a duplicate manifest entry would throw, is exactly the sort of thing
  that usually ships as a silent undercount.
- Rendering `work.html`'s embeds **unmasked** to check what the masked VR gate could not say
  anything about — that is the discipline that found deviation 7.
- Architecture-map edits are accurate: exactly 10 pages load `pack-boot.js` and `dock.mjs`
  (`instance.html` only mentions them in opt-out comments), and the tag is genuinely last in `<head>`
  on both new pages.
- Honest degradation throughout, and the copy cut is more honest than what it replaced
  ("An agent composed this at build time, not live in your browser").

## Recommendation

**Request changes** — fix #1 and #2 (both small), then this is ready. #3–#5 are judgement calls the
author is better placed to make than the reviewer; none should block.
