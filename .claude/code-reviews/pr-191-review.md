# Code Review — PR #191 · View Transition morphs on the remaining state swaps (#172)

**Branch**: `feature/view-transitions-172` → `main` · **Merge state**: `CLEAN` (merge-base `ee2d733` **is**
`origin/main` tip, so everything below was validated against the tree that would actually land)
**Scope**: 9 files, +895 / −24 · 4 wrap sites, 1 driver, 1 rules clause, 1 generated total

**Recommendation: REQUEST CHANGES** — one High correctness regression, reproduced on all three engines.
Everything else in the PR is disciplined work that does what it says.

*A `code-reviewer` deep pass ran in parallel and reached the High finding independently, by reading rather
than running. Its two additional findings are folded in below — both re-verified by measurement before
inclusion: the first confirmed as stated, the second confirmed but far narrower than first characterized.*

---

## Summary

The wrap discipline this PR sets out — *state mutates synchronously outside the callback, only the paint
goes inside, and the paint reads live state* — is right, and it is applied correctly at every one of the
four sites. The `pick()` split (deviation 2) and the decision to keep `bus.emit` outside the callback
(deviation 3) are both correct calls that a mechanical reading of the plan would have got wrong.

The miss is the corollary of that same discipline that the PR did not state: **`morph()` returns before it
mutates, so any code placed *after* the call also runs before the mutation.** Three of the four sites end at
the `morph()` call and are clean. The fourth — `trace-player.mjs` — deliberately moved `scrollIntoView`
*outside* the callback, and that line now runs against the pre-mutation DOM, where the card it targets is
still `display: none`.

---

## Issues

### 🔴 High — `system/trace-player.mjs:211` · forward stepping silently stopped scrolling

`apply()` now calls `morph(mutate)` and then, on the next line, scrolls:

```js
morph(() => { cards.forEach(...toggle 'trace-step-hidden'...); ... });   // :203 — runs a frame LATER
if (scroll && current >= 0 && cards[current]) cards[current].scrollIntoView({ block, behavior: 'smooth' });  // :211 — runs NOW
```

`document.startViewTransition` queues its update callback; it does not run it synchronously. So at `:211`
the newly-current card still carries `.trace-step-hidden`, which is `display: none`
(`trace.html:44`, `factory.html:123`, `roundtrip.html:46`, `instance.html:192`). Per CSSOM-View,
`scrollIntoView` on an element with no layout box returns early — **the scroll is a no-op.**

**Failure scenario.** A reader on `/trace.html` (23 steps) clicks `Next ▶`, or presses `→`, or hits `▶ Play`.
The counter advances and the card is revealed, but the page never scrolls to it. After a few steps the
newly-revealed card is below the fold and `Next` looks like it does nothing. Affects `next()` (`:213`),
`reveal()` forward (`:215`) and autoplay (`:232`). `prev()` is unaffected — that card already had a box.

**Reproduced, all three engines** (instrumented `Element.prototype.scrollIntoView` to record
`getComputedStyle(this).display` at call time; static server on the PR tree):

| Engine | Path | `display` at scroll time | has layout box | `window.scrollY` |
|---|---|---|---|---|
| chromium 149 | **no-preference (morph active)** | `none` | **false** | 0 → **0** |
| chromium 149 | reduced-motion (morph bypassed) | `block` | true | 0 → **180** |
| firefox 151 | **no-preference (morph active)** | `none` | **false** | 0 → **0** |
| firefox 151 | reduced-motion (morph bypassed) | `block` | true | 0 → **179** |
| webkit 26.5 | **no-preference (morph active)** | `none` | **false** | 0 → **0** |
| webkit 26.5 | reduced-motion (morph bypassed) | `block` | true | 0 → **179** |

The inversion is the tell: the **fallback** paths (reduced motion, no `startViewTransition`) still scroll
correctly; only the feature path — the default reader on a current browser — is broken. This contradicts
the PR's stated contract ("zero behaviour change") and is undocumented in the report's deviations.

**Why no gate caught it.** The pixel gate never interacts. `vt-verify`'s trace assertions check
`calls === 1` and that `.trace-progress` text moved — both stay green with the scroll dead. I ran
`vt-verify all` against this tree: **108/108 pass while the regression is live.** To be precise about the
characterization: these assertions are *not* the repo's `check-that-cannot-fail` shape — they test what they
claim and they can fail (the report's mutation table shows all three doing so). The scroll is simply untested
surface. The genuine `check-that-cannot-fail` in this diff is the Medium below, where the assertion would stay
green even for the thing it exists to prove.

**This is an inherited plan defect, not an implementer slip.** The plan prescribes this exact shape —
`.claude/plans/view-transitions-sitewide-172.md:283-290` says *"the `scrollIntoView` call runs AFTER the
mutation callback (immediately after the `morph()` call is fine — smooth scroll is async and must not sit
inside the snapshot callback)"* and gives the code verbatim. The first half of that reasoning is right
(the scroll must not be inside the callback); the second half assumes "after the call" means "after the
mutation", which is precisely what `startViewTransition` does not guarantee. **Fix the plan doc in the same
pass** — it is committed in this PR and will be copied by the next ticket that reaches for the pattern.

Two process notes, offered as such rather than as findings. The plan's own VALIDATE step for this task
(*"`/trace.html`: Next/Prev/arrows/Show-all/Play all work"*) would have surfaced it by eye, and the report's
validation table records no manual browser pass of the trace surface — only `vt-verify` and the Node gates.
And this is the second consecutive ticket in this epic where the frame-gap between `morph()` and its callback
produced a defect (#171's deviation 3 was the stale paint; this is the stale read). The PR states the rule
for writes — *state outside, paint inside, paint reads live state* — but not the symmetric one for reads:
**anything after a `morph()` call sees the old DOM.** Worth adding to `system/morph.mjs`'s header, where the
next caller will actually read it.

**Fix.** Scroll *after* the mutation. The clean version needs the inlined helper to return what the canon
returns (see Low below):

```js
const morph = (mutate) => {
  if (!live || morphing || reduceMotion.matches || !document.startViewTransition) { mutate(); return Promise.resolve(); }
  morphing = true;
  const vt = document.startViewTransition(mutate);
  vt.ready.catch(() => {});
  vt.finished.catch(() => {}).finally(() => { morphing = false; });
  return (vt.updateCallbackDone || vt.finished).catch(() => {});   // mirrors morph.mjs:44
};

function apply(scroll, block = 'center') {
  const done = morph(() => { /* unchanged */ });
  if (scroll && current >= 0) done.then(() => { if (cards[current]) cards[current].scrollIntoView({ block, behavior: 'smooth' }); });
}
```

`updateCallbackDone` is exactly "the DOM is mutated", not "the animation is over" — `morph.mjs:42-44`
documents that it exists for this case — so the scroll still starts while the crossfade runs. Reading
`cards[current]` inside the `.then` also keeps the live-state discipline the rest of the PR follows.

**And add the assertion**, or the fix is unfalsifiable for the same reason the bug was: in `vt-verify`'s
`SITEWIDE` entry for trace, capture `window.scrollY` before the verb and assert it moved (or assert the
current card's `getBoundingClientRect()` is in the viewport). The PR's own mutation-testing table is the
right standard here — this check should be made to fail on purpose before it is trusted.

---

### 🟡 Medium — `tooling/vt-verify.mjs:88-92, 241-276` · the site-wide block cannot detect an aborted transition, and its stated premise is inaccurate

The header comment and the PR body both assert:

> **No `view-transition-name` is written anywhere.** This is the default root crossfade …

That is true of *this diff* but not of the site. `system/portfolio.css:49,50,60` names three elements —
`site-header`, `page-title`, `nav-active` — and all 13 shipped pages load that sheet. Measured on the PR
tree, a home wizard-step morph captures **four** groups, not one:

| Surface | groups captured (chromium / firefox / webkit agree) |
|---|---|
| `/index.html` wizard step | `root`, `page-title`, `site-header`, `nav-active` |
| `/trace.html` step | `root` (bare harness — no injected chrome) |

**The conclusion still holds**: this PR adds no `view-transition-name`, therefore no new at-rest stacking
context, therefore **#190 genuinely is not a blocker.** That part is correct and I verified it — the diff
contains no CSS at all. But the *reason* given is wrong, and it matters, because the named groups do
participate in these transitions and a **duplicate name silently aborts the whole transition** — the exact
failure `/build`'s block guards with `groups.includes("bx-q-hooked")` etc.

The five site-wide assertions cannot see that: an aborted transition still counts `calls === 1`, still
applies the mutation, still changes the end state, still reaches the same state under reduce. So if a
future page ever renders two `.page-hero h1`s or a second `.site-header`, every morph on that page dies and
this driver stays green.

**Fix**: add one assertion per site-wide surface — `groups.includes("root")` at minimum (a live transition
always builds a root group; an aborted one builds none), and correct the header comment + PR body to say
"this ticket writes no new names; the three in `portfolio.css:49-60` participate."

---

### 🟡 Medium — `.claude/reports/…-172-report.md:144-148` · the shared-`active`-flag justification is factually wrong

The report says the now-shared `morph.mjs` `active` flag is benign because *"no #172 wrap site can be
re-entered from inside another's update callback (**they are separate pages**…)"*. They are not separate pages:

- `index.html:417` loads `intake-beat.mjs` → `factory-intake.mjs` → `morph.mjs`; `index.html:419` loads
  `brand-import.mjs` → `morph.mjs`. Same page, same module instance (ES modules are per-page singletons).
- `instance.mjs:58,60` imports both `initIntake` and `renderStudy`, mounting them at `:188` and `:382`.

And the flag is not released when the DOM settles — `morph.mjs:41` clears it on `.finished`, i.e. after the
whole crossfade. Measured on the PR tree (home wizard, two `Next` clicks at varying gaps):

| gap between verbs | 0 ms | 60 ms | 150 ms | 250 ms | 400 ms | 600 ms |
|---|---|---|---|---|---|---|
| morphs opened | 1/2 | 1/2 | 1/2 | 1/2 | **2/2** | **2/2** |

So the flag is held ~250–400 ms. Any second morph verb inside that window — including one on a *different*
feature that merely shares the page — silently falls through to a plain snap.

**The behavioural impact is cosmetic** (a missed crossfade, never a wrong state), and holding through
`.finished` is defensible: releasing early would let the new transition skip the running one. The finding is
that the *committed justification is wrong*, so the next person reasoning about this flag starts from a false
premise. Correct the report; if the cross-feature coupling is unwanted, scope the flag per call-site the way
`trace-player`'s inlined copy already does by construction.

### 🔵 Low — `system/agentic-study.mjs:165` · deferring `renderControls()` opens a ~1–2 frame stale-index window

`renderControls()` binds each row's buttons to the index captured at render time
(`agentic-study.mjs:202-204`, `onclick: () => removeTile(i)`). Before this PR that render ran synchronously,
so the stale row was gone before the handler returned and the window was **zero**. Now it runs inside the
morph callback, so the old row stays clickable for a frame or two.

Measured — second `Remove` click on the **last** row, querying the DOM fresh each time (a real click can only
hit what is attached):

| gap | 0 ms | 8 ms | 16 ms | 32 ms | 60 ms |
|---|---|---|---|---|---|
| stale row still attached | yes | yes | yes | no | no |
| uncaught `TypeError` | **yes** | **yes** | **yes** | none | none |

`Cannot destructure property 'name' of 'working[i]' as it is undefined` — `removeTile`'s first line
(`agentic-study.mjs:165`) reads `working[i]` for an index the splice already removed.

**Bounded and minor**: the throw happens *before* the splice, so nothing is corrupted — one console error and
the second removal is dropped. A ~16–30 ms double-hit is out of reach for mouse double-clicks (~80–150 ms) and
only borderline reachable via key auto-repeat. Reporting it because the PR widened a zero-width window, not
because it is likely. A guard clause (`if (!working[i]) return;`) closes it in one line.

### 🔵 Low — `system/trace-player.mjs:189-197` · the inlined replica diverges from the canon it cites

The copy cites `morph.mjs:37-41` and reproduces the two `.catch` handles faithfully, but drops
`morph.mjs:44`'s return value. The canon returns `updateCallbackDone` *specifically* so callers can act
after the mutation; the replica returns `undefined`, which is why the natural fix for the High finding
isn't reachable without touching this helper. Worth aligning even independently of the fix — a replica
documented as "the same six lines" should not quietly have a different signature. (The header-contract
reason for inlining rather than importing is sound and not in question.)

---

## Validation

All run against the PR tree in `ux-factory-wt-172`, on a static server over the same tree.

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 10 groups (3 modules gained a `morph.mjs` import — Node-import safety holds) |
| `node tooling/drift-check.mjs` | ✓ all 11 checks |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift (tree committed + clean, so this is a true green) |
| `node tooling/vt-verify.mjs all` | ✓ **108/108, 0 failures** — chromium 149 · firefox 151 · webkit 26.5. Reproduces the PR's claim exactly, **and stays green with the High finding live** |
| AC2 — VR baselines untouched | ✓ **0 files** under `tooling/visual-regression` in `git diff --name-only origin/main...HEAD` |
| `approach.html` loc claim | ✓ verified in markup (`:241` selects the `runtime` group; `:246`/`:248` render `runtime.files`/`runtime.linesApprox`, never `total`) — the grand-total flip cannot churn a baseline |
| **Scroll behaviour, `/trace.html`** | ✗ **regression, 3/3 engines** (table above) |
| Focus after wizard morph | ✓ `document.activeElement` is `H3#fw-prompt` after `Next` on all three engines — `promptEl.focus()` inside the update callback works |

Documented deviations 1–7 were treated as intentional decisions, not findings. All seven are sound; 2 and 3
are the load-bearing ones and both are argued correctly.

---

## What's good

- **The frame-gap discipline is right and consistently applied.** `pick()` gaining an `animate` param with a
  `paint()` split (deviation 2) is a genuine catch — wrapping at the listener as the plan wrote it would have
  re-shipped #171's stale-paint bug. Same for keeping `bus.emit` outside the callback (deviation 3): moving
  pure data inside buys nothing and would have reordered the bus log against the pin at `agentic-study.mjs:149`.
- **`brand-import.mjs:381`** — both statements in one callback so the cleared-token frame is never painted, and
  the fallback-only wrap (the dock owns the claimed path) avoids starting a second transition that would skip
  the dock's. Correct on both counts, and it respects the `derived-pack-inline-vs-stylesheet` constraint.
- **The mutation-testing table is the right standard**, and the "surface actually changed" assertion earns its
  place — the report shows the end-state check staying green with the morph removed, which is exactly why both
  assertions exist. The High finding above is a request to extend that same standard one assertion further.
- **Honest about what is not covered.** Declining to assert `brand-import`'s fallback leg because no Playwright
  context reproduces the private-browsing state — rather than writing a check that cannot fail — is the correct
  call and correctly disclosed.
- **The `CLAUDE.md` narrowing (deviation 7) is a real fix, not scope creep.** Home opening 2 at load was
  measured, the reason it is still pixel-gate-safe (`data-spine="ready"` set only after the revert) is stated,
  and `vt-verify` now encodes it as an expected count with its reason. A known-false invariant in the rules file
  every session loads was worth correcting here.
- The loc-summary reasoning (deviation 6) was re-measured post-#171 rather than inherited from the plan, and the
  `approach.html` claim was checked in the markup. Both verified above.

---

## Recommendation

**Request changes.** One High finding: fix the scroll ordering in `trace-player.mjs:211`, correct the plan doc
at `:283-290` that prescribed it, and add the assertion that would have caught it.

The two Mediums are both small and worth the same pass — one `groups.includes("root")` per site-wide surface
plus correcting the "no names anywhere" premise, and correcting the report's "separate pages" claim about the
shared `active` flag. The two Lows are one line each (`return` the settle promise; guard `working[i]`) and
neither would block on its own.

Scope was checked against the plan and nothing was silently dropped: the four wrap sites, the `dock.mjs`
verify-only and the `handoff-viewer` no-op all match, and the deliberately-excluded continuous-input paths
(`factory-intake`'s `setAnswer()`/`run()`) are correctly left alone.

Everything else — the four wrap sites, the gates, AC2, the deviations — is sound and independently reproduced.

*Reviewed against `CLAUDE.md` + the ticket's plan and report. Findings verified by running the surfaces, not
by reading them.*
