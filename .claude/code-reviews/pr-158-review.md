# Code Review — PR #158

**Title:** fix(build): three latent findings — one enum guarded both ways, one comment that over-claimed, one line that could contradict the board (#144)
**Branch:** `fix/build-deferred-findings-144` → `main` · **Head:** `008bd3b` · **State:** OPEN
**Scope:** 5 files, +1484 / −13 — of which **3 are source** (`system/build-questions.mjs`, `system/breadboard.mjs`, `tooling/build-journey.mjs`); the other two are the ticket's plan and report, which repo convention requires to ship in the same PR.

**Recommendation: APPROVE.** No Critical, no High, no Medium. Two Low notes below, both optional and both in the same "a comment claims slightly more than the code guarantees" class the ticket exists to close — which is the right register for them, not a reason to hold the PR.

---

## Summary

Three latent defects, one per finding, each fixed surgically and each matched to the smallest change that closes it. Nothing here is reachable as a visitor-facing bug on `build.html` as shipped, and the PR says so up front rather than inflating the severity.

What raises this above a routine bug-fix review is that **every load-bearing claim in the PR body is falsifiable, and I falsified none of them.** I re-ran the author's two mutation proofs from scratch in an isolated worktree and both reproduced exactly. That is the standard this repo's own memory (`check-that-cannot-fail`) asks for, and it is met.

This PR was reviewed twice, independently: a `code-reviewer` agent pass and this one, each re-running the proofs separately. **Both landed on 0 Critical / 0 High / 0 Medium, and both surfaced the same single comment-precision Low (L2 below)** without seeing the other's work. Convergence on that one point is the strongest signal in this review; L1 was found by only one of the two passes.

---

## Independent verification

I did not take the PR's validation table on trust. Everything below I ran myself.

### The two mutation proofs — both reproduce

**Finding 12 — is `[5b]` load-bearing?** I created a detached worktree, reverted *only* the two-line `renderToolbar` fix, served that tree on its own port, and ran the committed driver against it:

```
[5b] the no-go line stops naming a place the visitor put back (#144 finding 12)
  ✓ the no-go states what it ruled out (People, Connections)
  ✓ "People" is absent before the edit (Overview · Library)
  ✗ the line stops naming "People" once it is on the board
      3 of 6 places · 3 affordances · ruled out by your no-go: People, Connections
  ✓ "People" is on the board (Overview · Library · People)
  ✓ the no-go still names what is still absent (Connections)

build-journey chromium  ✗  107 passed · 1 failed
```

**Exactly one `✗`, on the intended assertion, and the failure output reproduces the defect verbatim** — the line asserts People is ruled out while People sits on the board. The other four assertions stay green, so the check is targeted rather than a blunt instrument. This matches the PR body precisely.

**Finding 9 — is the load-time assert really the gate?** Both directions, `hourly: true` added to `RULESET.ethics.frequencyFilter`:

| Module under test | Result |
|---|---|
| **Fixed** (this PR) | `exit 1` — `Error: build-questions: "frequency" has an option missing a label or a short form`, thrown at import, before group 1 prints |
| **Unfixed** (`origin/main`) | `build ✓ all 8 groups pass`, exit 0 — `hourly` **silently never offered** |

The second row *is* finding 9, measured rather than quoted. And it confirms the PR's reasoning for adding no group 9: `build-checks.mjs:42` already imports `QUESTIONS`, so that throw is already a red CI gate.

### The "nothing visible changes" claim

Computed against the real module, not read off the source:

```
IDENTICAL to the removed hardcoded list (order + label + short): true
DEFAULT_ANSWERS.frequency: daily | nogos: none
  multiple-daily  passes:true   daily  passes:true   weekly  passes:true
  monthly         passes:false  rarely passes:false
```

The derived options are byte-identical in value, label, short **and order**. The false-valued `monthly`/`rarely` keys survive `Object.keys` and still reach the ruleset's fail sentence — the PR flags this as the exact reason not to "tidy" it into `Object.entries(...).filter(([,v]) => v)`, and that warning is correct: doing so would silently delete the verdict panel's fail path. Worth preserving that comment on any future pass.

One clarification worth recording for the next reader: `frequencyVerdictFor()` is untouched by this diff and indexes `RULESET.ethics.frequencyFilter` **directly**, so it is independent of the options-derivation change. The risk above is therefore specifically that a future `Object.entries(...).filter(...)` would stop the fail-path values from ever being *offered* — the verdict function itself would keep working, which is precisely what would make the regression hard to spot.

### Every path that can change the clause

I enumerated all four `renderToolbar()` call sites and traced the `BUILD_CHANGE` listener rather than accepting "all ten sites reach it":

| Path | Reaches `renderToolbar`? |
|---|---|
| `renamePlace` (`:269`) / `renameAffordance` (`:307`) — the two verbs that skip `render()` | direct call ✓ |
| `render()` (`:546`) — every `commit()`-driven verb | first statement ✓ |
| restore/adopt (`detail.source === "restore"`, board present) | `render()` ✓ |
| restore with no board → redraft | `render()` ✓ |
| answers changed, board **not** edited | `draftBoard` + `render()` ✓ |
| answers changed **while edited** (`:677`) — `nogos` changes against a board the answer never drafted | direct `renderToolbar()` ✓ |

No stale-clause path found. The claim holds.

### Visual-regression risk — confirmed by CI, not just argued

The PR argues no baseline regeneration is needed. Verified three ways. `DEFAULT_ANSWERS.nogos` is `"none"` and `NOGO_RULE.none` is `[]` (`breadboard.mjs:89`), so at rest the clause is absent and filtering an empty array is a pixel-for-pixel no-op. Measured on a live page, the at-rest toolbar reads `3 of 6 places · 5 affordances` with no no-go clause, and the Act 1 question rendered at rest is the **trigger** question ("What feeling brings someone back to your product?", step 1) — frequency lives at step 5 and never renders at rest, so the changed enum cannot reach a baseline. And CI agrees:

```
verify   pass   17s
visual   pass   51s
mergeStateStatus: CLEAN
```

This matters because this repo's memory (`visual-regression-baseline-trap`, `vr-tolerance-hides-text-changes`) records that local gates cannot catch baseline churn. Here the real gate ran and is green.

### Cross-engine

Run locally against the branch, all three engines the driver supports:

```
build-journey chromium  ✓  108 passed · 0 failed
build-journey firefox   ✓  108 passed · 0 failed
build-journey webkit    ✓  108 passed · 0 failed
```

`[5b]` is green in all three. This closes the single-engine blind spot recorded in `vr-gate-single-engine-blindspot` — `[5b]` leans on `fill()`/`blur()`, `locator().last()`, and `$$eval` over input `.value`, which are exactly the APIs that diverge across engines.

### The finding-10 comment's own factual claims

The ticket is about comments over-claiming, so the replacement comment deserves the same scrutiny. Both checkable claims hold:

- *"build.html mounts each act exactly once"* — `build.html:744` `data-act="hooked"`, `:777` `data-act="shaping"`. Two mounts, two distinct acts. ✓
- *"the two selectors that read the `name` back"* — grep for the `bx-q-` **name** scheme returns exactly two readers: `build-questions.mjs:497` and `build-journey.mjs:132`. Not three. ✓

### State isolation of the new page

`[5b]` runs on its own page inside the shared context. The build store is a module-level in-memory `state` object (`build-questions.mjs:91-102`) with no `localStorage`/`sessionStorage` backing, so a new page gets a fresh module instance and cannot leak `edited`/answers into checks `[6]`+. Confirmed empirically by the three green full runs.

---

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 8 groups pass |
| `node tooling/build-journey.mjs` chromium / firefox / webkit | ✓ 108/0 · 108/0 · 108/0 |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ 3 groups — no drift |
| `node --check` × 3 | ✓ |
| CI `verify` / `visual` | ✓ pass / ✓ pass · mergeState **CLEAN** |

Everything in the PR's own table reproduced. Nothing red.

---

## Issues

### Critical — none
### High — none
### Medium — none

### Low

**L1 · `tooling/build-journey.mjs:310` — `putBack = named[0]` is order-dependent, and the fixture comment claims more than that guarantees.**

The comment above the fixture states the draft "genuinely wanted `People`, so the no-go really did subtract it: the check exercises a place that was removed, not one that was never coming." I verified that is true today:

```
board WITH social no-go : Overview · Library
board WITHOUT the no-go : Overview · People · Library
ACTUALLY subtracted     : People
```

But it is true only because `NOGO_RULE.social` happens to list `People` before `Connections` (`breadboard.mjs:89`), and `named[0]` takes whichever the clause renders first. Reorder that array to `["Connections", "People"]` and `putBack` becomes `Connections` — which the draft never wanted. **All five assertions still pass, and the comment is now false.** That is precisely finding 10's defect class, reproduced inside finding 12's fix.

*Fix (optional):* pick `putBack` by measurement instead of position — or, cheaper and in keeping with the "no second copy" instinct the check already shows, add one clause to the comment naming the dependency: that `named[0]` is the subtracted place *given the current order of `NOGO_RULE.social`*. Not worth a code change on its own; worth folding in if the file is touched again.

**L2 · `system/build-questions.mjs:427` — the opening clause compresses two different keying schemes.**

*"Ids and radio `name`s are keyed per ACT"* — the prompt id is (`bx-q-prompt-${actKey}`, `:436`), but the radio `name` is keyed per **question id** (`bx-q-${q.id}`, `:456`), not per act. The distinction is real: two acts sharing a question id would collide even with one mount each.

To be fair to the comment, this is a compression rather than an over-claim: the very next sentence states the precise condition ("no question id appears in two acts") — verified, 10 questions with no id shared across acts — so every consequence it draws, including the "same act mounted twice breaks both" failure mode, is correct. Flagging it only because this ticket sets the bar there.

*Fix (optional):* "…prompt ids are keyed per act and radio `name`s per question id — and no question id appears in two acts, so both are unique in the document."

**This is the one point both independent review passes found**, which is the main reason it is written up rather than dropped as a nitpick.

---

## What's done well

- **Both fixes were proven load-bearing by mutation, not asserted.** Both proofs reproduce exactly as documented. On a repo whose memory records that "every defect survived a green gate the same way — the check skipped the thing it tested," this is the discipline the codebase asks for and rarely gets.
- **The restraint is the right call, three times over.** No group 9 (it would pass by construction — the "check that cannot fail" shape); no per-mount counter (it would churn a committed gate selector to defend a page that does not exist, and the duplicate-act throw would abort the boot loop before `mountVerdict`, costing the VR gate its ready handle); `NOGO_RULE` stays module-private. Each rejection is reasoned in the plan rather than silently skipped.
- **`Object.keys` over `Object.entries().filter()` is the non-obvious correct choice,** and the PR explains why: the tidier form would silently kill the verdict panel's fail path. Flagging it in the body for the reviewer is exactly right.
- **The fix restores an existing repo pattern** (`factory-intake.mjs:132-146`) rather than inventing one, and the labels stay word-for-word identical across both wizards.
- **Two small `[5b]` details that look like padding but are load-bearing.** `await waitForSelector("[data-breadboard='ready']")` (`:293`) is necessary, not decorative — `settle()` waits on the keep rail and the pattern stage, *not* the breadboard, and every `[5b]` assertion reads the breadboard toolbar, so without it the check would race the mount rather than test the fix. And `newName.blur()`, which the plan flagged as possibly redundant since `fill()` already dispatches `change`, is worth keeping on its own merits: WebKit is the engine most likely to need a second path to `change`, so it is engine-difference insurance rather than dead code.
- **`[5b]` reads every name off the running page** rather than hardcoding "People" — no second copy of `NOGO_RULE` to drift. The check also asserts the place really is on the board, so it cannot pass by the clause vanishing for an unrelated reason (a thrown render), and it asserts the *remaining* name unconditionally rather than behind an `if` that could never be false. The comment records that the first draft had that `if`/`skip` shape and why it was removed.
- **Deviations are documented and each is defensible** — notably refusing to put a bare `:482` in a comment ("a second number that agrees with the code only today"), which is the same instinct the ticket is about.
- **The PR body flags its own soft spots** — the two `ruledOut` bindings, the false-valued keys, and that AC #4's "every edit path" is audited rather than driven. A body that volunteers where it is weakest is easier to trust, and the audit checked out when I re-traced it.

---

## Recommendation

**Approve and merge.** Three latent defects closed with three surgical changes, one new browser assertion proven to go red, zero regressions across three engines and both CI jobs, and no baseline churn. The `Closes #144` trailer is in the body, so the ticket will close on merge — worth confirming after, given this repo's history of tickets staying open (`prs-dont-auto-close-tickets`).

The two Low notes are optional polish and need not block or delay the merge.
