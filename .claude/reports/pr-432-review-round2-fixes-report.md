# PR #432 — round-2 review findings: what was fixed, what was deferred

**Review** `.claude/code-reviews/pr-432-review-round2.md` (posted as [PR #432 comment 5761005994](https://github.com/linardsb/ux-factory/pull/432#issuecomment-5761005994)) · **Round** 2 · **8 findings** — 2 high, 1 medium, 5 low
**Branch** `feature/canvas-swap-grid-retired-302` · **Before** `a10a3d0` · **Fix commit** `7ffb94a`
**Worked in** `/Users/Berzins/Documents/wt-432-fix`, a worktree created for this: the branch was checked out nowhere (the two `Documents/` worktrees are detached at the same SHA) and this session's primary tree is on `fix/factory-canvas-width-pin-433`, the branch stacked **above** this PR.

## The checklist

| | Finding | Call | Landed |
|---|---|---|---|
| F1 | high · the Validation table's three engine figures are not this tree's | fix now | measured; PR body |
| F2 | high · "`gates.md` now says so" — it does not | fix now | `7ffb94a` |
| F3 | medium · a fourth stale clause, in `keepPass`'s own header | fix now | `7ffb94a` |
| F4 | low · `DRAG_SLOP` has no gate of any kind | **defer** | issue #436 |
| F5 | low † · `measuredBoxOf`'s `\|\| 0` can restore the bug it fixed | **defer** | issue #437 |
| F6 | low † · `clone(checkOp(op))` adds an unnamed throw | **defer** | issue #437 |
| F7 | low · the fixes report's own correction of the review was wrong | fix now | `7ffb94a` |
| F8 | low · two figures that do not survive re-derivation | fix now | `7ffb94a` (b) + PR body (a) |

**5 of 5 fixed, 3 of 3 deferred with an issue each.** The three deferrals are the owner's calls, taken before any editing: F4 out because it is the only item that would ADD coverage and would move every engine's row total while F1 is being measured; F5 and F6 out because neither has a demonstrated live path and both become reachable through the same door, #306.

## Fixed

### F1 · high · the Validation table's three engine figures were another tree's

**What was wrong.** The PR body published, under a heading reading *"All observed on the final tree"*:

> `node tooling/studio-journey.mjs all` → **chromium 525/0 · firefox 521/0 · webkit 521/0**

Those are `f544b0a`'s numbers, from `.claude/reports/canvas-swap-grid-retired-free-substrate-302-report.md:614`. Round 1 added **eight** rows to `tooling/studio-journey.mjs` and **none of them is engine-gated**, so 521 was arithmetically impossible on this tree. The body then contradicted itself twenty lines down, reporting chromium at 533.

**Verified independently rather than taken from the review.** The eight added `t(` calls sit in `selectPass` and the zoom/anchor section; every pass is invoked unconditionally per engine (`:1705-1712`, `:2806-2808`), and the file's only engine conditional is the chromium-only CDP frame check at `:6995`. So the expected numbers are 525+8 = 533 and 521+8 = 529.

**Run, on `7ffb94a`, all three engines:**

| engine | result |
|---|---|
| chromium | **533 passed, 0 failed** |
| firefox | **529 passed, 0 failed** |
| webkit | **529 passed, 0 failed** |

Both non-chromium engines landed on exactly the predicted 529. **Webkit counted rather than aborting** — worth stating, because this driver puts two proto iframes on a native-scroll stage, and an iframe clipped out of view by an inner overflow scroller is never requested on webkit and surfaces as a throw that ends the leg. It did not happen here, so 529 is coverage and not a stopped-here number.

**The toolchain, because a bare digit is not reproducible.** `@playwright/test` **1.59.1** (resolved from `~/node_modules`), browser builds `chromium-1217 · firefox-1511 · webkit-2272`. Round 1's `533` was produced under whatever was resolvable then, which cannot now be known — see the shared-resource note below.

**The tree under the browser was verified, not assumed.** The review recorded a trap this round: its own first run reported `chromium 530/3` because port 4791 was held by a sibling session serving `fix/factory-canvas-width-pin-433`, the branch stacked **above** this PR, whose `3f95d83` deletes the pin those three rows are shaped by. The driver's own guard cannot catch that, because a stacked branch carries this PR's `studio-layers.mjs` verbatim. So:

- the server was started from `/Users/Berzins/Documents/wt-432-fix` on **port 4795**, chosen after finding 4791 and 4792 both held by siblings (4792 refused with `EADDRINUSE` on the first attempt);
- its listener PID was asserted equal to the PID this session started (`67396`), before the run and again after the Playwright install;
- the **served** `system/studio.css` was asserted to still carry #214's pin and no `#433`:

```
$ curl -s http://127.0.0.1:4795/system/studio.css | grep -n 'max-content'
530:.stu-shell .stx-viewport { width: max-content; }
$ curl -s http://127.0.0.1:4795/system/studio.css | grep -c '#433'
0
```

#### The one failure, and why it is not a finding

The first `all` run — the one that produced the three numbers above for firefox and webkit — reported chromium as **532 passed, 1 failed**:

```
✗ frame check · zero long-animation-frame entries overlap the drag window
  [{"start":16070.3,"duration":50.40000003576279}]
```

That is `perfPass`'s chromium-only 4×-CPU-throttled drag: one long-animation-frame entry of **50.4 ms** against a **≥ 50 ms** threshold, 0.8% over. The row immediately above it, `worst rAF gap inside the throttled drag ≤ 50 ms`, passed.

**Three pieces of evidence, in increasing strength:**

1. **The commit cannot reach it.** `7ffb94a` touches three files; in the only `.mjs` among them, the number of changed lines that are not comments is **0** (`git diff a10a3d0 7ffb94a -- tooling/studio-journey.mjs | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -vE '^[+-]\s*//' | wc -l`). No runtime code changed, so no frame-timing measurement could have moved.
2. **The machine was not quiet.** `uptime` during that run read **load averages: 105.01 43.68 25.91**. A sibling session was running its own three-engine journey concurrently — PID 33217, cwd `/Users/Berzins/Documents/wt-432-review`, started 13:39:45 (identified by `lsof -a -p <pid> -d cwd`, after both processes appeared in `ps` under the same command line).
3. **The A/B.** The leg was re-run alone once the machine went quiet (load **4.16**), same tree, same server, same port:

```
$ BASE=http://127.0.0.1:4795 node tooling/studio-journey.mjs chromium
  ✓ frame check · worst rAF gap inside the throttled drag ≤ 50 ms
  ✓ frame check · zero long-animation-frame entries overlap the drag window
  ── chromium: 533 passed, 0 failed
studio-journey ✓ …
```

Exit 0. The row passed, and the leg total is **533**, which is also round 1's own quiet-machine figure. The two runs differ by exactly that one row and by nothing else.

**This is a measurement of the machine, not of the tree** — and it is recorded rather than dropped, because a matching flake signature can still be a real regression and the only thing that separates them is running it again under the other condition. `533/0` is the number the table carries; `532/1` under load is stated beside it.

### F2 · high · the arrow overlay's "cannot reach" clause was in one place, and the PR claimed another

**What was wrong.** The PR body's *Still outstanding* paragraph and the round-1 fixes report's F6 row both said `gates.md` records that the arrow overlay's DOM half is unreachable. It did not. `.claude/references/gates.md` is the file CLAUDE.md sends a reader to **before trusting a green run**, and its Group 12 paragraph still described the group as it stood before round 1 added the 20 `arrowPath` cases.

**Observed, on `a10a3d0` before the fix:**

```
$ git show feature/canvas-swap-grid-retired-302:.claude/references/gates.md \
    | grep -in 'setArrows\|arrowPath\|overlay\|#306'
167:Two hazards per page: A · does anything MOVE when every name is removed … B · does any
    positioned element overlap a named one from OUTSIDE its subtree …
```

One hit, and it is `vt-stack-audit`'s use of the word *overlap* — nothing to do with the arrow overlay. The clause existed only in `tooling/build-checks.mjs:2847`, group 12's own `group()` string.

**Why it is the repo's own recorded failure mode.** A "cannot reach" clause lives in three copies — `gates.md`, the `group()` string, and a fixture header. Two of the three had drifted apart and the PR asserted they had not.

**The third copy checked, not assumed.** Group 12's section comment at `tooling/build-checks.mjs:2625` summarises the stage box and `setPos`, and makes no arrow claim at all — so it was not a fourth drift site and was left alone.

**Fix.** `gates.md`'s Group 12 paragraph now carries the `arrowPath` cases and, in the file's own italic voice for a limitation, the overlay's DOM half:

> *The whole DOM half of the arrow overlay is out of reach — the SVG layer, its marker def, the MutationObserver and `setArrows`, which has NO CALLER anywhere in this repo until #306's live page, so no running-page row and no pixel reaches any of it either.*

The round-1 report's F6 row now says where the clause actually was, and that this row claimed `gates.md` when round 1 had not touched it.

**The machine-read leg checked.** `tooling/drift-check.mjs:179` parses `gates.md` for `/(\d+) pure groups/g` in its group-count leg. That string is still present exactly once after the edit, and `drift-check` passes all thirteen legs.

### F3 · medium · a fourth stale clause, in the header of the function the other three were in

**What was wrong.** `tooling/studio-journey.mjs:2991`, `keepPass`'s section header, still claimed this pass owns *"whether the address bar really carries the arrangement"*. The `g` field is retired with the grid, the decoder refuses one by name, and P5 retired the two rows that asserted the old claim. The assertions went; the paragraph describing them stayed. Same class as F4 and F8b from round 1, at a fourth site — and it predates this PR (`b90ec55`, #241) but was made false by it.

**Fix** — restated as the retirement, in the voice `:3113` and `:3411` already use:

```
// file over, whether the tiers really hide, whether the address bar really carries NO arrangement —
// `g` is retired with the grid and the decoder refuses one BY NAME (#302), so what travels is the
// board alone, and the two rows that asserted the old claim were retired with it — and whether the
// declined mount really leaves a live Compile button.
```

**Comment-only.** `node --check tooling/studio-journey.mjs` passes and no assertion changed, so the row totals below are comparable to round 1's.

### F7 · low · the round-1 report's correction of the review was itself wrong

**What was wrong.** The report said *"F8b named `:3347`, which is already correct on this tree"*, then separately reported *"a fourth turned up beside them: the comment at `:3395`"*.

**Observed:**

```
$ git show f544b0a:tooling/studio-journey.mjs | sed -n '3345,3349p'
  });
  // THE CLAIM IS RETIRED, NOT TRANSLATED (#302, Task 1.5b's fifth site — the four the report names
  // are at :2965-2991 and in studio.mjs, keepPass's g-restore row and param-manifest.json). These
  // two rows asserted that the copied link CARRIED the sender's arrangement, which was the codec's
```

`:3346` is the heading the report read; `:3347` is the stale `:2965-2991` citation, exactly where the review pointed. And `f544b0a:3395` is the 503 console exemption in `teardownPass` — an unrelated comment. The "fourth site" was the same comment, renumbered by the fix session's own earlier edits.

**Fix.** The bullet now states that the review's citation was right, that this bullet read the heading a line above it, and that the fourth site was a renumbering. No code consequence — the fix landed either way.

### F8b · low · a `loc-summary` figure that read as final state

**What was wrong.** The report said `loc-summary` moved **31,500 → 31,600**, with no commit scoping, in a section that reads as the PR's final state.

**Re-derived, per commit:**

| commit | runtime `linesApprox` | total |
|---|---|---|
| `f544b0a` | 31,500 | 39,500 |
| `36c7d52` | 31,600 | 39,600 |
| `37e76f9` | **31,700** | 39,600 |
| `a10a3d0` | **31,700** | 39,600 |

Produced by reading `system/loc-summary.json` out of each commit with `git show` and parsing it, not by re-running the generator.

**Fix.** Both numbers now carry their commit, and the grand total's single move is stated. `37e76f9` regenerated the three `approach` baselines in the same commit, so no cascade is owed.

### F8a · low · "median" naming a minimum — PR body

The PR body says the interleaved A/B gave a *"fix tree median **14,577** ms to settle"*. The report's table gives two fix-tree samples, `14,577 / — / 14,591`: 14,577 is the **minimum**; the median of two is 14,584. PR head's three samples (`14,613 / 14,731 / 14,599`) do give a median of 14,613, so that half was right. The conclusion — the fix tree is marginally faster — is unaffected. Corrected in the PR body rather than the report, since the report never used the word.

## Deferred, and why

### F4 · `DRAG_SLOP` has no gate of any kind → **issue #436**

**Observed:** `grep -n DRAG_SLOP tooling/build-checks.mjs tooling/studio-journey.mjs` returns **zero** hits in either file. `DRAG_SLOP` (`system/studio-select.mjs:568`) is unexported and the path is DOM-only, so build-checks structurally cannot reach it and the running-page gate simply has no row. Of the twenty round-1 fixes, it is the only one with no verification surface at all — and the round-1 report claims none, so the gap is stated rather than hidden.

**Why deferred:** the owner's call. It is the one item in this set that would ADD coverage rather than correct prose, and a new row moves every engine's total by one — which would have to be measured by a second three-engine run, or would reproduce F1's own defect in the table this round exists to fix.

### F5 · `measuredBoxOf`'s `|| 0`, and F6 · `clone()`'s unnamed throw → **issue #437**

Both are the reviewer's unverified (†) findings, and both are unreachable today:

- **F5** (`system/studio-verbs.mjs:398`) restores P3's exact zero-height shape if `offsetHeight` ever reads 0, with no refusal. The reviewer looked for a live path and found evidence **against** one — no `hidden` on the canvas mount in `factory.html`, and the handler only acts on already-selected `.stx-slot`s. Reachability is unproven, not demonstrated.
- **F6** (`system/canvas-ops.mjs`) throws `DataCloneError` naming no path on a function or symbol inside `op.params`, against that file's own convention for its other seventeen refusals. Unreachable from JSONL, which is the stated write path; reachable from a JS caller composing an op.

**Why deferred:** the owner's call, and both become reachable through the same door — #306, which is what loads a build document and composes ops from JS. Filed as one issue so they are re-triaged together rather than assumed closed.

### Not deferred, not fixed — the review's own "Notes, not findings"

The note that a hand-edited `canvas.json` escapes the three new op-time refusals is correct and the reviewer calls it almost certainly by design. It is not a finding, the review did not file it as one, and it is #306's question. No action here.
## A shared resource I broke, and what state it is in now

**The Playwright browser cache at `~/Library/Caches/ms-playwright` is shared by every tool on this machine, and installing into it prunes what it does not recognise.**

Three different Playwright versions are installed here, each wanting its own browser builds:

| package | version | builds it needs |
|---|---|---|
| `~/node_modules/@playwright/test` | 1.59.1 | `chromium-1217 · firefox-1511 · webkit-2272` |
| `ux-factory/tooling/visual-regression/node_modules/playwright-core` | 1.61.1 | `chromium-1228 · firefox-1532 · webkit-2311` |
| `~/node_modules/playwright-core` | 1.63.0 | `chromium-1243 · firefox-1543 · webkit-2359` |

The journey drivers resolve `require("@playwright/test")` to the **1.59.1** row. The cache held the **1.61.1** row — the pixel gate's — and nothing else, so the first three-engine attempt failed on all three engines with `Executable doesn't exist`, zero rows, before a page loaded.

**Installing 1.59.1's builds removed the pixel gate's.** Observed mid-download:

```
$ ls ~/Library/Caches/ms-playwright/
__dirlock   ffmpeg-1011        # 1228/1532/2311 gone, 1217/1511/2272 not yet down
```

Two sibling sessions held ports 4791 and 4792 at the time, and one of them (PID 33217, cwd `wt-432-review`) was running its own three-engine journey. It resolves the same 1.59.1 row, so it was unaffected — but anything reaching for the **pixel gate's** browsers in that window would have failed.

**The restore.** `tooling/visual-regression`'s builds were reinstalled by running that package's own `playwright-core` installer, so the set the pixel gate needs is back. `~/node_modules/playwright-core@1.63.0`'s set was installed too — a mistake on my part: I reached for the top-level `playwright` before checking which package the pruned ids belonged to, and they belonged to the pixel gate. That cost disk, not correctness. Nothing was pruned by either restore.

**Final state, observed** (`ls ~/Library/Caches/ms-playwright/`):

```
chromium-1217  chromium-1228  chromium-1243
chromium_headless_shell-1217  chromium_headless_shell-1228  chromium_headless_shell-1243
firefox-1511   firefox-1532   firefox-1543
webkit-2272    webkit-2311    webkit-2359
ffmpeg-1011
```

All three sets coexist, so every Playwright installed on this machine can launch. **Not claimed:** that the pixel gate was re-run. It normally runs in Docker (`npm run update:docker`), which carries its own browsers, so the host cache is not what it uses — the restore puts the host back as it was rather than proving anything about the gate.

**A trap worth recording, because it cost two dead background jobs.** Two waiters written as `until ! pgrep -f 'cli.js install'; do sleep; done` never exit: `pgrep -f` matches the waiter's **own** command line, which contains that string. They had to be killed by PID. Wait on the installer's PID (`until ! ps -p <pid>`), never on a pattern the waiter itself contains.

**It is also a fact about F1's evidence.** Round 1's `533 passed` was produced under whatever was resolvable then, which cannot now be known to have been 1.59.1. That is why the corrected PR-body line names the toolchain as well as the counts — a bare digit is not reproducible, and two runs under different browser builds are not the same measurement.
## Validation

All observed in `/Users/Berzins/Documents/wt-432-fix` on `7ffb94a`, except the journey's firefox and webkit legs, which ran in the same invocation as the loaded chromium leg and are marked as such.

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | **`build ✓ all 36 groups pass`** — and this worktree has no `portal/node_modules`, so group 8's SDK-free invariant was proven the way CI proves it |
| `node tooling/drift-check.mjs` (staged) | **✓** — thirteen legs: syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count |
| `node tooling/token-lint.mjs` | **✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid** |
| `node agent-layer/gen-loc-summary.mjs --check` | **✓ 3 groups — no drift** |
| `node agent-layer/gen-param-count.mjs --check` | **✓ 121 controls — no drift** |
| portal smoke, `PORT=4788` | `{"ok":true,…,"bootSha":"a10a3d0…","stale":false}`, killed by PID |
| `node tooling/studio-journey.mjs all` | **chromium 532/1 · firefox 529/0 · webkit 529/0** — load 105, a sibling journey running beside it |
| `node tooling/studio-journey.mjs chromium` | **533 passed, 0 failed**, exit 0 — load 4.16, the A/B that retires the one failure |
| `gh pr checks 432` | **6/6 pass** on `7ffb94a`: audit · codeql · CodeQL · gates-green · verify · visual |
| `gh pr view 432 --json mergeStateStatus` | **CLEAN**, base still `287445e1` |

**Staged before `drift-check`, by explicit path** — `gen-loc` reads git-tracked content (`git show :<path>`), so a `--check` on an unstaged tree is a false pass. Explicit paths rather than `git add -A`, because parallel sessions share the primary working directory.

**No baseline cascade was owed and none was run.** `gen-loc-summary` counts `system/`, the repo root + `proto/`, and `agent-layer/`. This commit touches `.claude/` and `tooling/` only, so `loc-summary` does not move and `approach`'s rendered number does not change. CI's `visual` job is green on `7ffb94a`, which is stronger than a local Docker run.

**The portal was untouched** — no file under `portal/` is in the diff — but the smoke ran anyway, since the standing rule here is to run it even on a docs-only change.

## Cycles

**One.** Every finding was triaged before any editing, the five fixes landed in a single commit, and the only re-run was F1's own A/B — a measurement the finding asked for, not a retry of a failed fix.

## The gate's own verdict

`gh pr checks 432` reports **6 of 6 passing** on `7ffb94a` — `audit`, `codeql`, `CodeQL`, `gates-green`, `verify`, `visual` — with `mergeStateStatus` **CLEAN** and the base unmoved at `287445e1`. That is the gate's statement, quoted. It is not this report's claim that the PR is ready: the owner's Level 5 read of `/factory` and `/studio.html` in a real browser is still outstanding, by the plan's own instruction.
