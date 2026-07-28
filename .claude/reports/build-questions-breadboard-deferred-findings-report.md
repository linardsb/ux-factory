# Implementation Report — the last three deferred findings from the PR #143 review (#144)

**Plan**: `.claude/plans/build-questions-breadboard-deferred-findings.md`
**Branch**: `fix/build-deferred-findings-144` (off `main` at `428b482`)
**Status**: COMPLETE

## Summary

Ticket #144 collected six findings triaged real-but-later out of the PR #143 review. Three were
already closed by other slices — **7** and **8** by #138/PR #147, **13** by #137/PR #145, both
recorded in the ticket's own comments. This PR closes the remaining **three: 9, 10 and 12**, so
`Closes #144` is correct rather than premature.

All three were latent — none was reachable as a visitor-facing defect on `build.html` as shipped.
Each is a place where a comment claimed more than the code guaranteed, or a line of copy could make a
claim the board in front of the reader contradicted. On a page whose subject is method fidelity, that
is the class of defect that matters most.

Two shipped modules changed (one derivation + two comments), and one browser assertion was added.
Both mutation proofs were run: each fix was *shown* to be load-bearing before it counted as done.

## Tasks completed

- Finding 9, part 1 — `FREQUENCY_LABELS` map added beside `REWARD_LABELS` → `system/build-questions.mjs` (UPDATE)
- Finding 9, part 2 — frequency options derived from `Object.keys(RULESET.ethics.frequencyFilter)` → `system/build-questions.mjs` (UPDATE)
- Finding 10 — the ids comment narrowed to the guarantee the code actually holds → `system/build-questions.mjs` (UPDATE, comment-only)
- Finding 12 — `renderToolbar`'s `ruledOut` filtered against the board's current labels → `system/breadboard.mjs` (UPDATE)
- Check `[5b]` — the review's exact repro, driven through the real editor → `tooling/build-journey.mjs` (UPDATE)

Net diff: `system/build-questions.mjs` +39/−13 · `system/breadboard.mjs` +9/−1 ·
`tooling/build-journey.mjs` +61. No new source files.

---

## Finding 9 — the two ruleset-owned enums now derive in the same direction

**What it was.** `rewardType` mapped *from* `Object.keys(RULESET.patterns)`; `frequency` *filtered a
hardcoded list against* `RULESET.ethics.frequencyFilter`. A ruleset key added to `patterns` broke
loudly at load; one added to `frequencyFilter` was silently never offered.

**What changed.** A `FREQUENCY_LABELS` map (labels word-for-word from `factory-intake.mjs:145`), and
the options now derive the same way `rewardType` does. This restores the rule
`system/factory-intake.mjs:132-146` already established for a ruleset-owned enum: values from the
ruleset, labels local.

**The derived options are byte-identical to the list they replace** — same order, labels and shorts,
so nothing visible changed:

```
5
multiple-daily|Several times a day|several times a day
daily|About daily|about daily
weekly|Weekly|weekly
monthly|Monthly|monthly
rarely|Rarely|rarely
default: daily
```

**Mutation proof — the gate fires.** `hourly: true` added to `RULESET.ethics.frequencyFilter`
(`system/derive.rules.mjs:148`), **with the fix in place**:

```
=== import-time ===
build-questions: "frequency" has an option missing a label or a short form

=== build-checks (the CI `verify` gate) ===
Error: build-questions: "frequency" has an option missing a label or a short form
    at .../system/build-questions.mjs:338:11
build-checks exit=1
```

It throws at *import*, before group 1 prints — so no new gate group was needed. `tooling/build-checks.mjs:42`
already imports `QUESTIONS`, which is what turns the load-time assert into a red CI gate. `token-lint`
stayed green under the same mutation (a ruleset key, not a token), as expected.

The ordering of this proof is load-bearing and was respected: the *same* mutation against the unfixed
module is silent (five options offered as if nothing happened — that is finding 9 itself), so a
mutation run before the fix would have proven nothing. The ruleset edit was reverted with
`git checkout --`; `git status --porcelain system/derive.rules.mjs` → 0 changes, and `build-checks`
returned to 8/8.

**Free propagation, worth stating.** `system/build-share.mjs:266-277` validates every restored answer
against `q.options` from `QUESTIONS`. Deriving the frequency options therefore propagates the ruleset
into the share codec's accepted enum with no codec change at all.

**Deliberately not done:** a group 9 in `build-checks.mjs`. A group asserting
`options.map(o => o.value)` equals `Object.keys(frequencyFilter)` would pass by construction — the
"check that cannot fail" shape this repo has been burned by. The file's header count ("Eight groups")
also stays valid, which #150/PR #155 was a fix for.

## Finding 10 — the ids comment now claims exactly what the code guarantees

**What it was.** The comment said ids are "unique per mount"; the code delivers unique per *act*.
The two coincide on the committed page, so this was a false invariant a later reader could have
built on.

**What changed.** The comment, and only the comment. It now states per-act keying, why per act is
sufficient for the page that exists, and precisely what a page mounting the same act twice would
break — plus what whoever builds that page has to change.

**The claims in the new comment were verified, not asserted** (this is a ticket about comments
over-claiming, so the replacement comment had to earn its own statements):

- *"no question id appears in two acts"* → 10 questions, no id in two acts. **Holds.**
- *"every prompt id … is unique in the document"* → 2 radiogroups, 2 distinct ids, both resolve to
  their own prompt; **zero duplicate ids anywhere in the document**.
- *"every radiogroup `name` is unique"* → each `bx-q-*` name is confined to one section. The page's
  third radio name is the appearance dock's `pack` switcher, which shares no namespace with `bx-q-*`.

**The diff is comment-only**, verified by the invariant rather than by a grep that a re-wrapped line
would defeat:

```
$ git diff -- system/build-questions.mjs | grep -E '^[-+]' | grep -E 'promptId|name: `bx-q-'
(prints nothing)
```

The only non-comment changes anywhere in the file are finding 9's `FREQUENCY_LABELS` block and the
one `options:` line. `promptId`, the radio `name`, the read-back selector and
`tooling/build-journey.mjs:132`'s `input[name='bx-q-shape']` are all untouched.

**Deliberately not done:** the per-mount counter and the duplicate-act throw. Both are recorded as
rejected in the plan's Out of Scope and NOTES — the counter churns a committed gate selector to defend
a page that does not exist; the throw would abort the boot loop before `mountVerdict`, costing the
verdict panel and the `[data-build-verdict='ready']` handle the VR gate waits on.

## Finding 12 — the no-go line names only places that are genuinely absent

**What it was.** `renderToolbar` kept asserting "ruled out by your no-go: People, Connections" after
the visitor had added a place and named it "People" — a claim about the board that the board on
screen contradicted.

**What changed.** `ruledOut` is filtered against the labels currently on the board. The comparison is
**exact**, matching `renamePlace`'s own `place.label === label`; a case-folded comparison here would
be a new rule invented for one line.

No new call sites, and adding one would have been wrong: `render()` calls `renderToolbar()` first, so
every `commit()` verb recomputes it, and `renamePlace`/`renameAffordance` call it directly on the
no-full-re-render path. **That rename path is finding 12's actual repro and it was already correct.**

**Mutation proof — the check goes red, on exactly one assertion.** With the filter hand-reverted to
`const ruledOut = NOGO_RULE[answers.nogos] || [];` (hand-edited, never `git stash` — parallel sessions
share this working directory):

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

Exactly one `✗`, and it is the right one — the failure output reproduces the review's defect verbatim.
The other four assertions stayed green, which is what the plan required. With the fix restored:

```
[5b] the no-go line stops naming a place the visitor put back (#144 finding 12)
  ✓ the no-go states what it ruled out (People, Connections)
  ✓ "People" is absent before the edit (Overview · Library)
  ✓ the line stops naming "People" once it is on the board
  ✓ "People" is on the board (Overview · Library · People)
  ✓ the no-go still names what is still absent (Connections)
```

## Tests added

`tooling/build-journey.mjs` check `[5b]` — five assertions, on its own page (adding a place latches
`edited`, and every check below `[5]` builds on the drafted board; same reason `[4d]` runs on its own
page). Every name is read off the running page — `NOGO_RULE` stays module-private and **was not
exported**, so there is no second copy of that list to drift.

The fixture is measured, not arbitrary. `nogos: social` + `investment: content` + `rewardType: tribe`
gives board `[Overview · Library]`, and the same answers with `nogos: none` give
`[Overview · People · Library]` — so the no-go **genuinely subtracted "People"**, and the check
exercises a place that was removed rather than one that was never coming. `social` rules out two
places, so the clause has something left to name after one is put back, which is what proves the fix
*filters* rather than *drops* the clause.

Two of the five assertions are framing — `"People" is absent before the edit` and `"People" is on the
board`. Without the first, the clause might never have named a present place; without the second, a
`renderToolbar` that *threw* would also stop naming it and the check would pass on a broken page.

No new group in `tooling/build-checks.mjs` (see finding 9 above). Findings 10 and 12 are not reachable
from a pure gate — `mountWizard` and `renderToolbar` are closures inside mount functions with no
export, and exposing them for testability would be worse than the defects.

## Validation results

| Gate | Result |
|---|---|
| `node --check` × 3 (`build-questions`, `breadboard`, `build-journey`) | ✓ pass |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/build-checks.mjs` | ✓ **all 8 groups pass**, exit 0 |
| `node agent-layer/gen-loc-summary.mjs --check` (**after** `git add`) | ✓ 3 groups — no drift |
| `node tooling/drift-check.mjs` (**after** `git add`) | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/build-journey.mjs all` | ✓ chromium **108/0** · firefox **108/0** · webkit **108/0**, exit 0 |
| Mutation proof — finding 9's gate | ✓ `build-checks` exit **1** at import, message quoted above |
| Mutation proof — finding 12's `[5b]` | ✓ exactly **one** `✗`, on the intended assertion |

Both loc-summary-aware gates were run **after** `git add`, per the plan's ordering gotcha: they read
git-tracked content, so run before staging they report a false "no drift" (memory
`loc-summary-counts-tracked-only`). **No drift** — the ~+33 net lines across `system/` did not move
the runtime group's nearest-100 rounding, so `system/loc-summary.json` needed no regeneration.

### No VR baseline regeneration — and why, measured on the running page

Both halves were confirmed against a live `build.html`, not read off the defaults:

```
at-rest toolbar line: "3 of 6 places · 5 affordances"
contains a no-go clause? NO → filtering [] is a visual no-op
at-rest Act 1 question: "What feeling brings someone back to your product?"
is it the frequency question? NO → frequency never renders at rest
```

`DEFAULT_ANSWERS.nogos` is `"none"` and `NOGO_RULE.none` is `[]`, so the clause is absent at rest and
filtering an empty array is a pixel-for-pixel no-op. The frequency question renders at step 5 of 7 and
`renderStep()` boots at `step = 0`, so it is never in a baseline — and the derived options are
byte-identical to the removed list anyway. **No baseline was regenerated.** CI `visual` should be
green without one.

### Manual validation

Level 4 items 2 and 3 were verified programmatically rather than by eye:

- **Finding 9** — Act 1 step 5 offers exactly five options in the order
  `Several times a day · About daily · Weekly · Monthly · Rarely`, with **"About daily" preselected**.
- **Finding 10** — two distinct radiogroup ids, each `aria-labelledby` resolving to its own prompt,
  zero duplicate ids in the document.
- **Console clean** throughout (`build.html` loads no `scenario-data.mjs`, so there is no expected
  Worker-refusal noise on this page).
- **Finding 12** — driven end-to-end by `[5b]` on all three engines, plus the mutation proof.

## Deviations from the plan

1. **The finding 10 comment cites "the one below in this file" instead of the literal `:482`.** The
   plan's snippet ended `(\`:482\` here, and tooling/build-journey.mjs's shape check)`. A bare line
   number in a comment is a second number that agrees with the code only today — exactly the drift
   this repo has been bitten by (#150/PR #155 was a stale-count fix). The reference is otherwise
   identical in meaning.
2. **`newName.blur()` was kept in `[5b]`.** The plan's amendment noted it is redundant — `renamePlace`
   is wired to `change` and Playwright's `fill()` already dispatches `input` + `change` — and said to
   keep or drop it but not to debug it. Kept, matching check `[5]`'s existing `firstName.blur()` two
   lines above it.
3. **`[5b]`'s fixture comment states both boards.** The plan's comment claimed the draft "genuinely
   wanted People"; that claim was verified against the real `draftBoard` using the page's own
   `DEFAULT_ANSWERS.shape` (not an explicitly-passed `shape`), and the comment now records both the
   with-no-go and without-no-go boards so the claim is checkable. On a ticket about comments claiming
   more than code guarantees, an unverified comment in the fix would have been the wrong artifact.

Nothing else deviates. No code was written for either rejected alternative to finding 10.

## Issues encountered

None material. One selector correction during the ad-hoc Level 4 verification script (the wizard's
Next button is `button.btn-primary`, not a `data-q-next` hook) — that was in a throwaway scratchpad
script, not in committed code.

Worth flagging for the reviewer, since it looks like a near-miss but is not one: `system/breadboard.mjs`
has **two** `ruledOut` bindings. Line 119 is `draftBoard`'s own subtraction — the rule that removes a
ruled-out place from the draft in the first place — and is correct and untouched. Only the
`renderToolbar` one (line 393) is in scope for finding 12. The mutation script asserted an exact
single-occurrence match to avoid touching the wrong one.
