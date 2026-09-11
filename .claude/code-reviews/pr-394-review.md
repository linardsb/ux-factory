# PR #394 review — later, not never (#392)

**Head** `a667b39` · **Base** `main` @ `73c49ddaf5c6412c2358072dcf5f71450e7ea8f0` · **Round** 1 (no prior report, so the guarantees pass does not apply)

## Summary

One bank entry, one projection section, one shared renderer, and the gate work to hold all three. The change is well-scoped and the evidence in the PR body is unusually strong — nine driven mutations, a positive control that the new case's guard body is reached, and an explicit `AC #7 NOT MET` rather than a quiet omission. I re-ran the gates on a clean tree and re-derived every figure in the body; they all hold.

Five findings, none critical or high. **F1 is a wrong number on an operator-facing surface in a file this PR already touches** — worth the one-line fix before merge.

## Validation

Re-run on a **clean detached worktree at `a667b39`** (`git worktree add … a667b39 --detach`), because the shared working tree carries three unrelated modified files from a sibling session.

| Gate | Command | Result |
|---|---|---|
| build-checks | `node tooling/build-checks.mjs` | ✅ exit 0 — `build ✓ all 34 groups pass` |
| drift-check | `node tooling/drift-check.mjs` | ✅ exit 0 — syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count |
| token-lint | `node tooling/token-lint.mjs` | ✅ exit 0 — 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| transport preflight | `cd portal && node lib/discovery-transport.mjs --preflight` | ✅ `pre-flight ✓ all 8 rows pass, zero tokens` |
| visual regression (local) | n/a | Correctly n/a — the commit's file list holds no root HTML, no `proto/`, nothing under `system/` |

**CI, which four local gates cannot speak to** — `gh pr checks 394`, all six green:

| Check | Result |
|---|---|
| `verify` | ✅ pass (25s) |
| `visual` | ✅ pass (1m12s) — ran regardless of the correct n/a reasoning, and no `approach` countUp flake |
| `codeql` / `CodeQL` | ✅ pass (1m26s / 2s) — **this is the first discovery PR under #387's new blocking gate**, and it is clean |
| `audit` | ✅ pass (14s) |
| `gates-green` (aggregator) | ✅ pass |

`mergeStateStatus: CLEAN` · `mergeable: MERGEABLE` · not a draft. Merge base is `73c49dd`, so the branch is current and the findings below were validated against the tree that will merge.

## The numbers pass

Every figure in the PR body re-derived independently at `a667b39`. All observed unless stated.

| Claim | Method | Verdict |
|---|---|---|
| bank 76 entries · whole-bank 65 | ran `QUESTIONS.length`, `DEPTHS["whole-bank"].ids.length` | ✅ 76 · 65 |
| unfaceted list 31 · budget 31 | `selectDepth("full-discovery").length`, `FULL_DISCOVERY_BUDGET` | ✅ 31 · 31 |
| new id at index 19, not last | `fd.indexOf("s4-parked-for-later")` → 19 of 31; last is `s9-strength-of-evidence` | ✅ |
| presets 22 / 22 / 28 / 16 | ran all four (two of which are prose-only, not gate-pinned) | ✅ regulated 22 · b2b-saas 22 · internal-tool 28 · consumer 16 |
| `SECTIONS.length === 12` | ran it; note 31.1 asserts `size === n`, so 12 is **derived**, not pinned (pre-existing shape, not this PR's) | ✅ 12 |
| seven `prd.md` each `4 0` | `git show --numstat a667b39 -- 'discovery/*/prd.md'` | ✅ seven × `4 0`; content is blank / `## Later, not never` / blank / `_TBD…_`, inserted between Non-goals and Open questions |
| Think / Think-Opus / Grill fingerprints unmoved | **computed live on both trees**, not grepped | ✅ `7efdde37…`, `cadb3811…`, `76b7847d…` identical at `73c49dd` and `a667b39` |
| Create-PRD moved to `ea523ac1…` | computed live | ✅ `f0e7599c…` (main) → `ea523ac1…` (head) |
| pin counts 5 / 5 / 2 | `grep -c` on both trees | ✅ 5 / 5 / 2 both sides — see F5 on what this proves |

**The budget claim, re-derived independently** (this is the figure with the most downstream risk, because a budget that grows can silently admit a vector that used to overflow):

Base is twelve + block = 16. Module budgets are 7 · 6 · 6 · 6 · 6. Enumerating **all 32 facet vectors** through `selectDepth("full-discovery", v)` gives composed lengths `{16: 1, 22: 4, 23: 1, 28: 6, 29: 4}` and **16 vectors throwing overflow** — max fitting 29, min triple 16+6+6+6 = 34. The 30 → 31 bump lands in the empty gap `[30, 33]`. **No previously-overflowing vector is admitted by the wider budget**, and the "ten pairs fit, sixteen overflow" pin still holds (1 + 5 + 10 = 16 fitting). Verified negative, observed.

### Mutation spot-checks

The mutation table is the PR's strongest evidence and it is the only evidence no longer in the tree. I re-drove three of the nine on a clean worktree copy, reverting each:

| Mutation | Observed |
|---|---|
| `s4-parked-for-later` moved LAST in the depth list | ✅ red, 6 failures, naming it: `s4-parked-for-later sits at 30 of 31 — it must follow s3-deliberately-not-doing and never be LAST (deriveCursor reads the last closer's position…)` |
| the `t10` fixture op deleted | ✅ **exactly one** failure, the vacuity guard by name — `31.17: the fixture has no decision on s4-parked-for-later at seq 14 (got none) — the case below is then vacuous`. **Zero `TypeError`s.** |
| `later:` renderer aimed at `NON_GOAL_QUESTIONS` | ✅ red with **three** 31.17 assertions firing from *inside* `if (later?.seq === 14)` — the positive control that the guard body is reached, so 31.17 is not a check that cannot fail |

Also verified directly: no leftover `renderNonGoals` reference anywhere in the repo, and `crossRefByQuestion` is defined at `discovery/prd-projection.mjs:612` against uses at `:719` / `:720` — definition precedes use, so the `function` → `const` arrow change carries no TDZ risk.

### The `deriveCursor` invariant, read rather than taken on trust

This is the load-bearing claim — "not last, or every earlier full-discovery recording reads unfinished" — so I read the function rather than accepting the gate message. `portal/lib/discovery.mjs:645-659`:

```js
const pos = questions.findIndex((q) => q.id === qid);   // qid = the LAST closer's question
return held ? at(pos, 2) : at(pos + 1, 1);              // at(): done = index >= questions.length
```

The cursor is a **position in the live list**, not a count. `allergen-matrix-1` (the only committed `full-discovery` package, unfaceted) closes on `s9-strength-of-evidence`, which is still `DEPTHS["full-discovery"].ids[30]` — the last element of the 31-list (observed). So `pos + 1 = 31 >= 31` → `done: true`, unchanged. Had the id been appended last, `s9-strength-of-evidence` would sit at index 29, giving `pos + 1 = 30 < 31` → `done: false` and a finished package reading as one question short. **The author's reasoning is correct and the placement is the right one.** ✅

One documented consequence, not a defect: the cursor's `total` for that historical package is now 31 while it answered 30, with `done: true`. `discovery/README.md` was updated in this PR to say exactly that ("30 of the 30 it was asked (the unfaceted list is 31 since #392)"), and `prd.md` renders no cursor.

### The "exactly one cross-ref home" loop

`SECTIONS.filter((r) => r.axis === "cross-ref" && r.from.includes(id))` is substring matching over prose. Checked for collisions: the three cross-ref rows' `from` strings are Success metrics (names no id), Non-goals (`s3-deliberately-not-doing`, `s4-out-of-bounds`) and Later (`s4-parked-for-later`); no id is a substring of another, so every count is 1 today. ✅ Latently brittle — a future hand-written `from` that mentions an id in passing would break the count — but not a defect, and both id-carrying rows build their `from` by joining the constants.

## Findings

### F1 (Medium) — `portal/public/portal.js:934` — a live UI string still says the unfaceted list is 30

```js
if (!plan.declared) { el.textContent = 'No vector declared — full discovery runs its unfaceted 30. Tick a fact, …
```

This renders into `#discovery-facet-note` in the discovery drawer. The list is **31** as of this PR. The same file's comment at `:684` *was* updated by this diff (`the unfaceted list — 31 since #392`), so the figure was swept in this file and the visible string was missed.

**Failure scenario:** an operator opens the discovery drawer, declares no vector, and reads "full discovery runs its unfaceted 30" while `/api/discovery/config` — which the PR body itself verified off the wire — answers `31`, and the session then walks 31 questions. Two numbers for one list, on the surface a person actually reads.

**Why no gate caught it:** `grep -rn "runs its unfaceted" tooling/` returns nothing — no group pins this string.

**Fix:** update the string. Consider interpolating the config's own count rather than a literal, so it cannot drift again.

### F2 (Low) — `discovery/bank.mjs:1045` — stale `30` in a comment twelve lines above the constant set to `31`

```js
// block, 16) — and is not the same input as {} (no vector; today's unfaceted 30).
```

`FULL_DISCOVERY_BUDGET = 31` is at `:1057`. CLAUDE.md's rule is that invariants live in the file that owns them and the header *is* the specification, so a spec comment reading 30 beside a constant reading 31 is the drift that rule exists to prevent. Same file, already in the diff.

(`discovery/bank.mjs:863`'s "run 0 — thirty of thirty landed" is a *historical* statement and remains true; the README's parallel sentence for `allergen-matrix-1` was given a clarifier and this one was not. Optional tidy, not a defect.)

### F3 (Low) — `.claude/references/gates.md:51` — a second copy of the stale `#289` clause, undisclosed

The PR body discloses the clause `…a FULL-WIDTH run package, which does not exist until #289 lands` surviving in `tooling/build-checks.mjs`'s group 31 summary, and correctly declines to fix it. But **this diff rewrites two lines carrying that clause, not one** — `gates.md:51`'s Group 31 entry is `1 deletion / 1 addition` in this diff and re-asserts the same sentence. #289 closed at `2026-09-11T09:25Z`, before this commit at `11:18Z`.

The clause's *conclusion* still holds (no full-width package exists on disk — every committed package is `scope-check`, `opening-set`, `full-discovery`-unfaceted or `whole-bank`), but its stated *reason* is now false. `gates.md` is the doc CLAUDE.md points a reviewer at before trusting a green run, so a false claim there costs more than the same claim in a group summary.

**Fix:** either extend the disclosure to name both surfaces, or correct both now. A third copy at `tooling/build-checks.mjs:8176` is untouched by this PR and is genuinely #289's follow-up.

### F4 (Low) — `.claude/skills/plan-create-prd/SKILL.md` carries more than the PR body describes

The PR body and plan P1 justify this file's inclusion as "the new `SECTIONS` row's `why` cites the house shape's §*Later, not never*, and that edit was uncommitted in the shared tree." The committed diff also adds, in the same file:

- a required one-line **status header** (`**Status:** intent · grilled <date> · architecture: TBD · sliced: TBD`) with a "each later step replaces its TBD in place" rule — new scope, unrelated to #392;
- **"non-goals with reasons"** threaded through the frontmatter description, §8 and the checklist.

Both read as coherent and finished, and they are plausibly the same session's house-shape update. But the tree is shared (the plan itself notes three sibling-session files beside this one), and the disclosure names only the §9 half. **Confirm those two edits are yours and complete** before merge — if another session was mid-edit on this file, this commits a snapshot of unfinished work under #392.

No gate reads this file; `discovery/prd-projection.mjs` cites it in prose only.

### F5 (Low) — the fingerprint evidence cites the wrong instrument

> `7efdde37…`, `cadb3811…` and `76b7847d…` appear 5, 5 and 2 times in `build-checks.mjs` on both `main` and this head.

Counts confirmed (5 / 5 / 2 both trees). But a stable **pin count** proves the pin *text* did not move; it says nothing about whether the *computed* fingerprint still equals it. The real evidence is 30.46 passing in the green run — and, now, direct observation: I imported `POSTURES` on both trees and the three computed values are byte-identical, with `create-prd` the sole move. **The claim is true; the stated method does not support it.** Worth correcting because this repo's numbers discipline is the thing that caught #87 and #107.

## What's good

- **The vacuity guard on 31.17 is the right shape.** `ok(later?.seq === 14, …)` outside the block, everything else inside it — a deleted fixture op fails by name in one assertion instead of taking the group down with a `TypeError`. Driven and confirmed.
- **The ordering invariant is pinned with its reason in the failure message.** `…never be LAST (deriveCursor reads the last closer's position, so a last-placed id makes every earlier full-discovery recording read unfinished)` — the next person to move that id learns why from the red output, not from archaeology.
- **The shared renderer is the correct de-duplication**, and the "exactly one cross-ref home per question id" loop makes the Non-goals/Later split enforceable rather than conventional. The leak this ticket exists to close is refused by gate, both directions.
- **`AC #7 NOT MET` stated plainly**, with the mechanism proven without the paid run and the run tracked as #393, and 30.46's Think-carrier count deliberately held at five until it lands. That is the honesty contract working exactly as designed — it is not an open concern and should not be read as one.
- The architecture doc amendment (D1a) and README budget line were updated in the same PR, so the decision record does not lag the constant.
- The commit stages 20 explicit paths, never `-A`, on a shared worktree.

## Recommendation

**Approve — but land F1 first: it is a one-line fix in a file already in this diff, and merging without it ships a wrong number to the surface the operator reads.**

No critical or high issues. All four gates green on a clean tree at `a667b39`, all six CI checks green, `mergeStateStatus CLEAN`, and the change matches its stated intent.

**F2** and **F3** are cheap enough to ride along in the same fix commit. **F4** needs a yes/no from you rather than a code change — it is the one thing I cannot resolve from here. **F5** is a PR-body correction, no code.

---
*Reviewed with fresh context. The deep pass was run in this context — the `code-reviewer` agent was dispatched and independently confirmed F1 and F2 before being stopped as redundant. A human reviews the code plus this review and merges.*
