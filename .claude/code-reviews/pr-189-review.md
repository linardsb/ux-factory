# Code Review — PR #189

**feat(build): View Transition morphs + inspect mount + copy cut on /build — and the VT × VR spike (#171)**
`feature/build-vt-morphs-171` → `main` · 20 files · +1493 / −71 · reviewed against `CLAUDE.md`

## Recommendation: **REQUEST CHANGES** — one line, in a file this PR already edits

Everything this PR claims, it delivers. Every gate is green — including CI's `verify` **and** `visual` on
the Linux baselines — and the three claims it rests on (the morphs really open, the stacking audit really
fires, the journey really covers the new wiring) I reproduced myself on all three engines rather than
taking the report's word for them.

The one blocker is **H1**: `refreshInspect()` doesn't reset `hovered`, and I reproduced the consequence —
**the inspect bubble stops auto-hiding** — on chromium and firefox. It is a one-line fix in `inspect.mjs`,
which this PR already changes, and it lands here by the PR's own precedent: deviation 9 pulled in the M3
fix on the reasoning that "/build is the first page with enough triggers for that to be ordinary." The
same sentence is true of this one, for the same reason.

Everything else is a Medium in a new tool plus three Lows. Fix H1 and this is a clear approve.

The headline is that the spike returned a **negative result and the PR shipped it as a tool.** The plan's
premise ("`view-transition-name` has ZERO render effect at rest") was wrong, the VR gate structurally
could not catch it, and the response was a committed check plus a corrected rule in `CLAUDE.md` rather
than a note in a report. That is the right shape for a spike ticket.

---

## Validation

Run locally on this branch, clean tree.

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ **all 10 groups** |
| `node tooling/drift-check.mjs` | ✓ all 11 checks |
| `node agent-layer/gen-param-count.mjs --check` | ✓ 73 controls, no drift |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ 3 groups, no drift |
| `node agent-layer/gen-inspect-data.mjs --check` | ✓ 14 components, no drift |
| `node tooling/build-journey.mjs chromium` | ✓ **141 passed · 0 failed** — the PR's count, reproduced |
| `node tooling/vt-verify.mjs chromium` | ✓ 11/11 · boot `calls=0` · each family `calls=1` · rename `calls=0` · reduced motion `calls=0` |
| `node tooling/vt-verify.mjs firefox` | ✓ 11/11 — same result (firefox 151) |
| `node tooling/vt-verify.mjs webkit` | ✓ 11/11 — same result (webkit 26.5). **All three engines reproduced.** |
| `node tooling/vt-stack-audit.mjs` | ✓ 6 states · no layout shift · every overlap z-indexed |
| **Mutation: `z-index: 1` deleted from `build.html`, audit re-run** | ✗ **18 unresolved `z-index: auto` overlaps, exit 1** — the check provably fires on the bug it was written for |
| **H1 probe: hover a tile → rebuild the stage → keyboard open/close** | ✗ **bubble stuck open on chromium + firefox** (webkit inconclusive) — see H1 |
| Visual-regression gate | **Not run locally** (Linux baselines vs macOS renderer = false failures). **CI is the authority and it is green** — see below. |
| `gh pr checks 189` | ✓ `verify` **pass** (15s) · ✓ `visual` **pass** (1m2s) |

AC2 is confirmed by CI's Linux run, not left open: this branch is `feature/build-vt-morphs-171`, so the
D11 `feature/v3-*` visual-job freeze does not apply and the `visual` job genuinely gates here.

Two independent confirmations worth calling out:

- **`boot calls=0` on all three engines.** That is the load-bearing property for the pixel gate and for
  #172, and it is now empirical rather than argued. The cross-engine claim in the PR body reproduces
  exactly, on the same three engine versions quoted.
- **The audit's mutation test reproduces.** The report quotes "4 unresolved overlaps"; that is the
  default-board state exactly. Across all six states it is 18. Both numbers are right.

I also checked the one thing `gen-param-count --check` cannot check — that the manifest matches reality.
`data-inspect-toggle` is on `build.html` **and** `index.html`; the manifest carries an entry for each
(`/` pre-existing, `/build` added here). Correctly counted, no under-count. Blast radius is clean too:
`inspect.mjs` is the only changed module reaching a second page, and every change in it is inside an
event handler or a new function, so home's at-rest pixels are untouched — consistent with "exactly 4
baselines churned".

---

## Issues

### High

**H1 · `system/inspect.mjs:290-295` — `refreshInspect()` doesn't reset `hovered`, so the bubble stops
auto-hiding. Reproduced on chromium and firefox.**

`setInspect(false)` resets all three pieces of interaction state (`:253-259`):

```js
hide();
hovered = false;
focusTrigger = null;
dismissedTrigger = null;
```

`refreshInspect()`, added here, resets none of them (`:290-295`):

```js
function refreshInspect() {
  if (!on) return;
  if (activation) activation.abort();
  hide();
  activate();
}
```

**The mechanism, measured.** I instrumented the removal: when `paint()`'s `root.replaceChildren(body)`
destroys the hovered tile, **no pointer-exit event is delivered for it at all** — I listened for
`mouseout`, `mouseleave`, `pointerout` and `pointerleave` in the capture phase and got an empty list on
all three engines:

```
chromium  tile-detached=true · exit-events=[]
firefox   tile-detached=true · exit-events=[]
webkit    tile-detached=true · exit-events=[]
```

So nothing clears `hovered`, and `activation.abort()` then removes the very `mouseleave` listener that
otherwise would. `hovered` stays `true` with the pointer over ordinary page content.

**The consequence, reproduced.** `armHide`'s timer body opens `if (hovered) return;` (`:185`), so with the
flag stuck, *no* subsequent hide can fire. Driving it — pointer resting on a rendered tile, board emptied
by synthetic clicks so the real pointer never moves and ends over non-mount content, then a keyboard-only
focus into a mount and blur:

```
chromium  pointer-on-mount-after=false · kb-opened=true · STUCK-OPEN=true
firefox   pointer-on-mount-after=false · kb-opened=true · STUCK-OPEN=true
webkit    pointer-on-mount-after=false · kb-opened=false · (didn't open — inconclusive, not a pass)
```

The bubble stays on screen after focus has left. That contradicts the module's own header contract
(`inspect.mjs:13`: "persistent — it stays until hover/focus leaves, Esc, or scroll"). Esc and scroll still
force-hide, so WCAG 1.4.13 *dismissible* is not violated — but *persistent* is, and for a keyboard user
who has stopped touching the mouse there is no hover/focus gesture left that recovers it.

**Regression or latent?** Strictly latent in `inspect.mjs` — removing a hovered node has always delivered
no `mouseleave`. But /build is the first page where a `[data-inspect]` mount is *rebuilt underneath the
pointer at runtime*, which is what makes it reachable, and this PR is what mounts inspect there. That is
the identical argument the PR uses for including the M3 fix (deviation 9), so it belongs in the same PR.

**Fix** — mirror the branch one function above:

```js
function refreshInspect() {
  if (!on) return;
  hovered = false; focusTrigger = null; dismissedTrigger = null;
  if (activation) activation.abort();
  hide();
  activate();
}
```

`focusTrigger` and `dismissedTrigger` are not independently reachable on /build today — the three
primitives `pattern-render` tags are non-focusable `div`s, which I confirmed by driving it — but they are
the same line, and #172 adds pages where a rebuilt focusable mount would reach them.

**Worth a journey assertion**, since [16b] doesn't cover it: its M3/graze scenario always moves the
pointer away before the re-render, so `hovered` is already correctly clear by the time `refreshInspect()`
runs there. The uncovered gesture is *hover a tile → change the board without moving the pointer → the
bubble must still hide afterwards*.

### Medium

**M1 · `tooling/vt-stack-audit.mjs:147-158` — hazard A false-positives on the first other page it is pointed at, and the tool exists for #172.**

`node tooling/vt-stack-audit.mjs /index.html` exits **1**, deterministically, 3/3:

```
── at rest  (3 named element(s): site-header, nav-active, page-title)
   A · layout   ✗ 1 element(s) move when the names are removed
        359|DIV|0,0,0,0  →  359|DIV|794,5382,502,104
vt-stack-audit ✗  1 state(s) with layout shift · 0 overlap(s) with no explicit z-index
```

It is not a real hazard. I re-ran the audit's sequence byte-for-byte with **`KILL_NAMES` replaced by a
no-op** — names left completely intact — and got the identical delta, 3/3:

```
NO-OP (control) run 1: 1 "moved"
   359|DIV|0,0,0,0  →  359|DIV|794,5382,502,104     ← same row, names never touched
```

So the "movement" is the tool's own two-sample comparison, not a containing-block shift. The tell is in
the data: `0,0,0,0` → a real box is an element whose box was **not measurable at the first sample**, and
removing a `view-transition-name` cannot do that — a containing-block change relocates a positioned
descendant that already has a box. (I did not pin down *why* home's `.peak-ethics-body` is unmeasurable at
that instant, and the finding doesn't need it: the no-op control settles causation on its own.)

The gap is that the noise filter discounts only elements the engine reports as *animating*
(`vt-stack-audit.mjs:59-61, 149`). It does not discount an element that had **no box at all** at sample
time — the actual failure mode here, and the one that recurs on any page with a disclosure, a lazy beat,
or off-screen content.

Why it matters beyond cosmetics: this tool is committed *for* #172 — `CLAUDE.md` now calls it "the check
to run BEFORE naming anything… and the one #172 needs on every page it touches." A gate that opens red
for a non-reason gets its red ignored, which is how the next real `.bx-bb-lines` gets through.

I sized it across the rest of the shipped IA so #172 knows what it is inheriting — **2 of 7 pages
false-positive, the other 5 are clean:**

| page | hazard A |
|---|---|
| `/approach` `/factory` `/work` `/contact` `/404` | ✓ clean (6, 2, 11, 1, 1 animating elements discounted) |
| `/index` | ✗ 1 "moved" — false positive (control above) |
| `/roundtrip` | ✗ 1 "moved" — same signature |

Hazard B is clean on all seven. So the tool is usable, but not yet as an unattended gate.

*Hypothesis, not a claim, offered because #172 will want it:* `roundtrip.html` is one of the four pages
carrying `transition: … content-visibility … allow-discrete`, and home's flagged node sits inside a
`<details>` disclosure. An element inside a `content-visibility`-transitioning subtree plausibly has no
measurable box at some phases, which would explain both hits and make the zero-area filter the general
fix. I did not verify this — causation is already settled by the no-op control without it.

Fix — one line, and it is the tool's own stated intent:

```js
const shifted = b
  .filter((row, i) => row !== c[i])
  .filter((row) => !noise.has(row.split("|")[0]))
  // An element with no box in EITHER sample was not laid out then; a containing-block change moves
  // boxes, it does not create them. Same isolation discipline this PR prescribes for the VR gate.
  .filter((row, _i) => !row.endsWith("|0,0,0,0") && !(c[b.indexOf(row)] || "").endsWith("|0,0,0,0"));
```

The stronger form is the one the PR already argues for elsewhere: run the no-op control and subtract it,
so hazard A measures the *delta caused by removing the names* rather than a raw sample pair. That is
precisely the isolation-run reasoning the spike prescribes for the VR gate, applied to this tool.

**Not a merge blocker** — tooling only, operator-run, never in CI, and hazard A is clean on /build in all
six states. But it should be fixed before #172 adopts the tool, and it is cheap now.

### Low

**L1 · `tooling/vt-verify.mjs:113, 121, 128` — the three "…is its own group" assertions cannot attribute
a group to a family, and one of them under-enforces its label.**

`document.getAnimations()` returns the pseudo animations for *every* named element the transition
captured, not the ones the interaction was about — so all three lists are effectively the same list. Its
own chromium output shows it: family 1 (a wizard step) reports `bx-pattern`, and family 3 (the pattern
stage) reports `bx-q-hooked`.

```
✓ family 1 · the step card is its own group   bx-pattern bx-q-shaping root page-title site-header bb-place-p3 bx-q-hooked …
✓ family 3 · the pattern stage is its own group   root bx-q-shaping bb-place-p1 bx-q-hooked bx-pattern …
```

There is a second reason the word "group" is doing more work than it has earned: the extraction at `:65`
strips the pseudo *kind* along with the parens —

```js
.replace(/^::view-transition-\w+\(/, "")
```

`\w+` matches `group`, `old`, `new` and `image-pair` alike, so all four collapse into one name set and
`groups.includes("bx-pattern")` proves *some* `::view-transition-*` pseudo carried that name, not that a
`::view-transition-group(...)` ran.

The check is still real for its *stated* purpose — a typo'd or duplicated name shows up as a missing
group, which is what the header says it catches — and the `calls === 1` half genuinely is per-family. It
is the labels that claim more than is proven. Keep the pseudo kind and match on
`::view-transition-group(`, and either reword to "the name resolves" or intersect against a snapshot
taken before the interaction.

Separately, `places.length > 1` (`:121`) is weaker than the label "every place is its own group": with
four places on the board, a partial naming failure leaving two named still passes. `places.length` equal
to the board's place count is the assertion the label already claims.

**L2 · `tooling/build-checks.mjs:573` — the `STYLE_WRITE` comment overclaims.**

The comment says it counts "BOTH ways a value can reach an inline style." Tested against the regex as
written:

```
MATCH     el.style.color = x;            (the new case)
MATCH     el.style.setProperty("--c", x) (pre-existing)
MATCH     el.style.cssText = s;
no match  el.style["color"] = x;         computed key
no match  el.style[k] = x;               computed key
no match  Object.assign(el.style, o);
no match  el.setAttribute("style", s);
no match  el.style.color += x;           the `[^=]` cannot reach past the `+`
```

Four forms through, plus aliasing (`const s = el.style; s.color = x;`), which is out of reach for any
regex-based check and should simply be stated as such. Given that this PR's own deviation 5 exists *because* the previous version of this
check silently missed a whole category, the comment is the part to fix: either add the alternations or
narrow the claim to what it actually counts. Low because nothing in the tree uses the missed forms —
this is about the next person trusting the sentence.

**L3 · `CLAUDE.md:80` — the architecture map says `build-checks` has "9 groups"; it prints 10.**

The tenth is `build analytics` (added with the virtual-route work). Pre-existing drift, not introduced
here — but this PR inserts two new lines directly beneath that sentence, so it is the natural place to
correct it. One character.

### Verified and cleared (raised, then ruled out)

- **`prevKey` cannot diverge from what was painted** (`pattern-render.mjs:303-310`). `render()` writes
  `prevKey` from its own plan while `paint()` re-plans a frame later, which looks like a bookkeeping race.
  It is not: every store write dispatches `BUILD_CHANGE` synchronously, so any state change is immediately
  followed by a `render()` that updates `prevKey`; and when a change lands inside a live transition,
  `morph()`'s `active` flag makes that `paint()` run **synchronously**, so pixels and `prevKey` advance
  together. `loadVocab()` (`:142`) routes the vocabulary arrival through `render()` with `prevKey === null`,
  which is why boot paints without morphing — confirmed empirically by `vt-verify` (`boot calls=0`).
- **`focusTrigger` / `dismissedTrigger` are not independently reachable on /build** (the other two thirds
  of H1). I drove it: the three primitives `pattern-render` tags are non-focusable `div`s, so
  `focusTrigger` can never point at a node the stage rebuilds, and `dismissedTrigger` is only ever
  compared, never dereferenced, so a detached node degrades to inert. They are the same line as the H1
  fix, so there is no reason to leave them asymmetric.
- **No injection surface on `viewTransitionName`.** The only dynamic value is `bb-place-${place.id}`;
  `place.id` comes from `nextId` (`breadboard.mjs:172-176`) and every restored board re-validates it
  against `PLACE_ID = /^p[0-9]{1,2}$/` (`build-share.mjs:57, 293`).
- **View-transition names are unique per document, including under a crafted `?b=`.** `[data-pattern-stage]`
  resolves to one element; `.bx-q-card` is named per act (`bx-q-hooked` / `bx-q-shaping`) and each act root
  holds exactly one card. For the places: `decodeBuild()` rejects a duplicate place id
  (`build-share.mjs:294`) and a duplicate affordance id (`:306`) before `restoreBuild()` is ever reached,
  and `restoreBuild()` has exactly one caller (`build-keep.mjs:360`) fed only by that validated output —
  so a share link cannot mint two `bb-place-p1` elements and silently abort every transition on the page.
  The pre-existing site-wide names (`site-header`, `page-title`, `nav-active` — `portfolio.css:49-60`) do
  not collide, and reduced motion is killed twice over (`morph.mjs:29-33` and `portfolio.css:64-70`).
- **`param-manifest` is not under-counted.** `data-inspect-toggle` is on `build.html` *and* `index.html`;
  the manifest carries an entry for each. (`gen-param-count --check` could not have told you this — it
  only proves the count matches the manifest, not that the manifest matches the page.)
- **Copy claims check out.** Six beats (00–05) for "six acts"; the Hooked act's seven question ids match
  the "five … the last two are his Manipulation Matrix" split exactly; Act 03's three match `appetite` /
  `shape` / `nogos`. Group 1's three stale-string assertions (`"Two of the five"`, `"other three"`,
  `"not in the library"`) have zero occurrences in `build.html` — the copy cut left no contradiction.
- **Focus and live-region ordering inside the morph callbacks.** `applyPendingFocus` /
  `promptEl.focus()` run inside the callback after the DOM swap (`build-questions.mjs:478, 486`,
  `breadboard.mjs:221-229`), and `[data-bb-live]` sits outside the re-rendered subtree
  (`build.html:903`), so `announce()` still speaks during a transition. Correct.
- **Blast radius.** `inspect.mjs` is the only changed module reaching a second page (home); every change
  in it is inside an event handler or a new function, so home's at-rest pixels are untouched — which is
  why "exactly 4 baselines churned" is the right number and CI's `visual` agrees.

---

## What's done well

**The spike was answered honestly, against its own author's interest.** The plan predicted
`view-transition-name` was render-inert at rest; it is not, and the PR says so in the body, the report,
`CLAUDE.md`, and a comment in `build.html` beside the fix. It also names the reason the two-stage VR
protocol *cannot* catch this class of bug — `update:docker` regenerates the baseline from the same tree,
so it re-baselines the regression — and replaces the recommended gate for #172 with the isolation run.
That is a load-bearing correction to a sibling ticket's plan, delivered as a tool rather than a warning.

**`vt-verify.mjs` closes a gap the other two gates structurally cannot.** `morph()` falls through to a
plain mutation whenever it cannot transition, so a morph that silently stopped firing leaves every
end-state assertion green — "the page still works" is exactly what the failure looks like. Wrapping
`startViewTransition` before any module evaluates and reading `getAnimations()` for the running pseudos
is the right instrument, and it catches the specific silent failure that matters (a duplicate name aborts
the whole transition, and surfaces here as a *missing* group).

**The shared `active` flag in `morph.mjs` is reasoned from the actual dispatch model,** not from taste.
`BUILD_CHANGE` is synchronous, so a board commit runs pattern-render's listener inside its own update
callback; three inline wrappers would have had the nested call skip the in-flight transition and kill the
board morph on exactly the edits that also rename the pattern. The module header states this, and it is
the correct call.

**Deviation 3 is a genuine bug fix, not a refactor.** `morph()` runs its callback a frame later, so a
closure captured at request time can repaint an older state over a newer one — observed as a real journey
flake. Splitting `plan()` / `paint()` / `render()` so `paint()` re-plans from `readBuild()` makes every
paint idempotent. I traced the interleavings: because every store write dispatches `BUILD_CHANGE`
synchronously and the suppressed-nested path paints synchronously *and* updates `prevKey`, the bookkeeping
and the pixels cannot diverge.

**The security surface is genuinely closed, and the check that guards it was widened in the same PR.**
The only dynamic value reaching `viewTransitionName` is `bb-place-${place.id}`, where `place.id` comes
from `nextId` and is re-validated by `build-share.mjs`'s `PLACE_ID` (`/^p[0-9]{1,2}$/`, `build-share.mjs:293`)
on any restored board. Deviation 5 is the notable part: extending group 7 to count direct `.style.x =`
assignments revealed a hole that **existed before this PR** — the invariant only ever matched
`.setProperty(`.

**The M3 false-green write-up is the most valuable paragraph in the report.** A check passed twice under
a mutation that reverted the fix, because the parked pointer was sitting on the header — which `site.js`
tags as a mount and which `body{overflow-x:clip}` makes non-sticky, so whether that corner is a trigger
depends on scroll. `park()` now asks the page what is under each candidate point and returns whether
anything carrying a mount is still `:hover`, so the helper proves its own postcondition. That is the
repo's own "check that cannot fail" rule applied to the author's own new check.

**Copy claims check out against the code.** The hero stamp now says "six acts" and `build.html` carries
beats 00–05 (the old "four acts" was a real factual error). Act 02's lead — "Five come from Nir Eyal's
Hooked model … the last two are his Manipulation Matrix" — maps exactly onto the seven Hooked-act
question ids (`trigger`, `action`, `rewardType`, `investment`, `frequency` + `improvesLives`,
`wouldUseIt`), and Act 03's three onto `appetite`, `shape`, `nogos`. The "all five patterns are in the
library" claim is gated by build-checks group 1.

**Process compliance is clean.** `Closes #171` is in the PR body; the plan and report are committed in
the PR; the `param-manifest` entry, the regenerated `param-count.json` / `loc-summary.json`, and the four
churned baselines are all in the same PR, which is exactly the cascade `CLAUDE.md` requires.

---

## Resolution (fixes applied on this branch)

`origin/main` merged first — the branch was `DIRTY` after PR #188 (#175) landed. `system/loc-summary.json`
and `system/param-count.json` conflicted and were resolved by **regeneration**, never by hand. The merge
moves `param-count` 73 → **75**, and `approach.html` renders that total; the runtime `loc-summary` group
approach also renders (61 files / 19,200 lines) is unchanged.

| finding | outcome | proof |
|---|---|---|
| **H1** `refreshInspect()` leaves `hovered` stuck | **fixed** | `inspect.mjs` resets all three pieces; new journey block `[16c]`, mutation-red on chromium + firefox + webkit |
| **L1** `vt-verify` group labels / `places.length > 1` | **fixed** | only `::view-transition-group(` collected; places asserted as an exact SET; mutation-red on a single dropped name |
| **L2** `STYLE_WRITE` comment overclaims | **fixed** | comment now names the four counted forms and the five it cannot reach, verified absent from all eight modules |
| **L3** `CLAUDE.md` "9 groups" | **fixed** | now 10, with group 10 (build analytics) named |
| **M1** `vt-stack-audit` hazard A false positives | **deferred → #190** | cross-linked from #172 and #164; `CLAUDE.md`'s entry now carries the caveat |

### H1 — the fix, and why the obvious test for it was a check that cannot fail

The one-line prescription was applied verbatim, `focusTrigger` and `dismissedTrigger` included. The
assertion took three attempts, and the two discarded ones are the point:

1. **Emptying the board** is the natural setup and is a false green. Every board verb places focus and the
   page loses ~950px of height, so it scrolls ~1,400px, drags real mounts under the resting pointer and
   delivers a genuine `mouseleave` — measured: `scroll/height 5538/7795 → 4143/6852`, with
   `mouseleave<DIV.ds-metric-tile>` in the capture log. `hovered` is cleared for a legitimate reason and
   the assertion passes with the bug in place. It did: **the first version was green under the mutation.**
2. **Focusing the act-0 button where it lies** opens the bubble and then loses it — chromium scrolls the
   off-screen element a frame later despite `focus({preventScroll:true})`, and the engine's own 1.4.13
   scroll-dismiss hides it. Measured as `attr:aria-describedby=inspect-bubble → SCROLL → aria-describedby=null`.
3. Run as a continuation of `[16b]` it was green under the mutation for two further reasons: `[16b]` leaves
   the act-0 button already focused (so `focus()` fires no `focusin`, and there is no open to hide), and
   its rename shifts the steps list enough that chromium and firefox **do** deliver the exit event.

`[16c]` therefore gets its own context and a gesture measured clean on all three engines: rest on the last
step of the tall `steps` list, switch to the short `overview` grid. Its three preconditions are asserted,
not assumed — no scroll, no pointer exit on any mount, nothing left under the pointer — so a setup that
rescues `hovered` itself fails loudly instead of passing quietly.

**Mutation proof.** With the three-line reset reverted, `build-journey all` reports **148 passed · 1 failed
on each of chromium, firefox and webkit** — only the H1 assertion, so every precondition still held and the
defect was genuinely exercised. Restored: **149 · 0 on all three.** The review had webkit down as
inconclusive (`kb-opened=false`); that was an artifact of the probe's gesture, not an engine limit.

### L1 — one correction to the prescription

`places.length` equal to the board's place count fails 3-vs-4 on all three engines, and correctly so: the
verb ADDS a place, and a name that exists only in the new state has nothing to interpolate from, so no
`::view-transition-group` runs for it. The exact claim is the set of places present **before** the verb,
and it is asserted as a set rather than a count — a mutation dropping `p2`'s name alone turns it red, which
`> 1` would have passed.

### Gates on the merged tree

`build-checks` ✓ all 10 groups · `drift-check` ✓ all 11 · `gen-param-count --check` ✓ 75 · `gen-loc-summary
--check` ✓ · `vt-verify all` ✓ 11/11 × 3 engines · `build-journey all` ✓ 149 · 0 × 3 engines.

**Open item pending CI:** `approach.html` now renders 75 where the committed approach baselines were
regenerated at 73. One digit; `maxDiffPixels: 100` may or may not swallow it. CI's `visual` job is the
authority — if it goes red on approach, the two baselines get regenerated from a clean Docker run.
