# Implementation Report — bump the `verify` job's Node pin off the evicted Node 20

**Plan**: `.claude/plans/ci-node-pin-cache-eviction.md`   **Branch**: `fix/ci-node-pin-154`   **PR**: [#163](https://github.com/linardsb/ux-factory/pull/163)   **Status**: COMPLETE

## Summary

`.github/workflows/verify.yml` pinned `node-version: 20` on the gating `verify` job. Node 20 EOL'd in April 2026 and aged off the `ubuntu-latest` tool cache, so `actions/setup-node@v7` downloaded a ~30 MB tarball from `github.com/actions/node-versions` before every run — a gating job with a live external network dependency. The pin moves to the major `24` (cached at 24.18.0 by image `20260720.247`), and the comment block above it is rewritten, because the pin's justification changes shape: from *"it matches the local baseline"* to *"it is measured to emit identical artifacts, and it is tool-cached."* One file, one behavioural line, plus the comment — which is the larger half of the deliverable.

## Tasks completed

- [1] VERIFY the tree the evidence applies to → branched `fix/ci-node-pin-154` off `origin/main` at `e7c9369`
- [2] RE-RUN the determinism sweep → **SKIPPED per the plan's own DECISION** (see Deviations)
- [3] UPDATE the pin → `.github/workflows/verify.yml` (UPDATE) — `node-version: 20` → `node-version: 24`
- [4] UPDATE the comment block → `.github/workflows/verify.yml` (UPDATE) — all four required points + PR #153's warning preserved
- [5] VERIFY the edit is exactly two lines of behaviour → `git diff --numstat` = one file, `19 4`
- [6] COMMIT and push → `03c95f0`, staged by explicit path
- [9] OPEN the PR → [#163](https://github.com/linardsb/ux-factory/pull/163), `Closes #154` in the body (run **before** Task 7 — see Deviations)
- [7] READ THE RUN LOG → run `30371029699`, job `90314620245` — the step that closes the ticket
- [8] CREATE the report → this file (CREATE)

## Tests added

None — no source code changes, and this repo has no suite by design (CLAUDE.md: *"Done" = run the surface you touched*). The surface here is CI itself, so the `verify` gates **are** the tests. They ran on the real runner under Node 24; results below.

## Validation results

### Level 1 — syntax

```
$ python3 -c "import yaml; yaml.safe_load(open('.github/workflows/verify.yml')); print('yaml ok')"
yaml ok
$ grep -n "node-version" .github/workflows/verify.yml
56:          node-version: 24
$ grep -rn "node-version" .github/workflows/
.github/workflows/verify.yml:41:          node-version: 20      (before the edit — the only pin in the repo)
$ git diff --numstat
19      4       .github/workflows/verify.yml
```

### Level 4 — the acceptance test: the `verify` job's `setup-node` step, `--job`-scoped

Run [30371029699](https://github.com/linardsb/ux-factory/actions/runs/30371029699), job `90314620245`, head `03c95f0`. Verbatim:

```
2026-07-28T14:58:29.9066621Z ##[group]Run actions/setup-node@v7
2026-07-28T14:58:29.9067815Z with:
2026-07-28T14:58:29.9068839Z   node-version: 24
2026-07-28T14:58:29.9069763Z   check-latest: false
2026-07-28T14:58:29.9079946Z   token: ***
2026-07-28T14:58:29.9080915Z   package-manager-cache: true
2026-07-28T14:58:29.9081994Z ##[endgroup]
2026-07-28T14:58:30.0393531Z Found in cache @ /opt/hostedtoolcache/node/24.18.0/x64
2026-07-28T14:58:30.0396798Z ##[group]Environment details
2026-07-28T14:58:30.4709538Z node: v24.18.0
2026-07-28T14:58:30.4710047Z npm: 11.16.0
2026-07-28T14:58:30.4710413Z yarn: 1.22.22
2026-07-28T14:58:30.4711265Z ##[endgroup]
```

- **AC #1 ✓** — `Found in cache @ /opt/hostedtoolcache/node/24.18.0/x64`. The download is gone. The runner resolved the major `24` to **24.18.0** — the exact build the local sweep tested, and the one the image README lists.
- **AC #2 ✓** — `grep -cE "Attempting to download|Acquiring|node-versions/releases"` over that job's log → **0**.

### Level 2 — the gates, on the runner under Node 24 (AC #5)

Same run, verbatim:

```
sd tokens       ✓  css + ios + android → handoff/verdant/tokens
drift-check     ✓  syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces
token-lint      ✓  64 contract tokens · 0 undeclared · 0 orphan · DTCG valid
build ✓  all 10 groups pass
```

Step conclusions, `verify` job: `Set up job` · `checkout@v7` · `setup-node@v7` · `Install Style Dictionary` · `Drift check` · `Token lint` · `Build checks` — **all success**. `visual` — **success**. Run conclusion: **success**.

`drift-check ✓` here is the point: determinism re-proven **on the real runner**, closing the "measured off-runner" caveat neither local sweep could close. `npm ci` under npm 11.16.0 — the one genuine Node 24 risk — passed.

### Level 3 — the container sweep (AC #4)

Carried forward from the plan, measured at `e7c9369` = this branch's merge base. Isolated clone, Docker `--platform linux/amd64`:

| Node | npm | `npm ci` (SD) | drift-check | token-lint | build-checks | unscoped `git status --porcelain` |
|---|---|---|---|---|---|---|
| **24.18.0** | 11.16.0 | ✓ exit 0 | ✓ 8 groups | ✓ | ✓ all 10 groups | **empty** |
| 22.23.1 | 10.9.8 | ✓ exit 0 | ✓ 8 groups | ✓ | — | **empty** |

Not re-run — `git rev-parse --short origin/main` → `e7c9369`, identical to the commit the sweep ran on.

## Deviations from the plan

1. **Task order changed: 6 → 9 → 7 → 8, not 6 → 7 → 8 → 9.** The plan has Task 7 (read the run log) firing after a plain `git push`, but `verify.yml` triggers on `push: branches: [main]` + `pull_request` — a push to `fix/ci-node-pin-154` matches neither. **No run exists until the PR is open.** Task 7's `gh run list --branch fix/ci-node-pin-154` returns empty on a bare push. The PR was therefore opened first (Task 9), which started run `30371029699`, and the log read followed. Consequence, recorded honestly: the **PR body was written before the log line existed**, so it names the acceptance check and points at this report for the literal output rather than quoting it. AC #5 puts the verbatim log in the report, which it does.

2. **Task 2 (the container sweep) skipped, as the plan's own Task 1 DECISION instructs.** `origin/main` is `e7c9369` — byte-for-byte the commit the evidence was measured at — so the artifacts (`loc-summary.json`, `system-graph.json`, `handoff/`) have not moved and the table stands. Recorded here because a skipped validation should be visible, not silent.

3. **Level 2's local `nvm use 24` gate run skipped, deliberately.** Locally it is strictly *weaker* than evidence already in hand: macOS/arm64 rather than linux/x64, and `portal/node_modules` is present on this machine, so `build-checks` group 8's SDK-free invariant would not actually be proven (its **absence** is the proof — CLAUDE.md). The container run at this exact commit already covers linux/x64 *with* portal deps absent, and CI has now re-proven it on the runner itself. Installing an nvm 24 to run a lesser check would add nothing.

4. **`gh run view --log --job` could not be used while the run was in progress** (`visual` was still going; the CLI needs the whole run complete). Substituted `gh api /repos/linardsb/ux-factory/actions/jobs/90314620245/logs`, which returns the completed job's log alone — **the same `--job` scoping the plan requires**, by a different route. Worth recording: the first, premature `grep` for `Attempting to download` returned "none" against an *unavailable* log — a textbook [check that cannot fail](../../MEMORY.md). The negative assertion above was re-run against the real 20,089-byte log **with a positive control** (`grep -c "Found in cache"` → 1) proving the grep could hit at all before its zero was believed.

5. **Two commits on the branch, not one.** The workflow edit + plan landed in `03c95f0`; the report is a second commit, because AC #5 requires it to quote a log that only exists after that first commit was pushed and built. CLAUDE.md's "one atomic commit per ticket" is about the change; the paper trail cannot precede the evidence it records.

## Issues encountered

None blocking. Two observations, both out of scope and flagged rather than fixed (CLAUDE.md: surgical changes):

- **`CLAUDE.md` says `build-checks` has 9 groups; it has 10** — `build analytics` was added by #149/PR #162, and the runner log above prints `all 10 groups pass`. Belongs to #149's paper trail. Already parked in the plan's Open Questions.
- **`verify.yml:41` was the only `node-version` pin in the repo** (`grep -rn "node-version" .github/workflows/`), so no second workflow silently keeps a Node 20 pin. Checked because AC #6 only constrains this file.

**AC #9** — `visual` untouched and no baselines regenerated. Confirmed structurally, not hoped: the `visual` job has **no `setup-node` step** at all (its steps are `checkout@v7` · `npm ci` in `tooling/visual-regression` · `npx playwright test` · `upload-artifact@v7`), and it runs inside the pinned `mcr.microsoft.com/playwright:v1.61.1-jammy` container using *that* container's Node. This change cannot reach it. Nothing in the diff is a rendering input, so `npm run update:docker` was not run — it went green on the first try.

## Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| #1 — pins major `24`, step logs cache hit | ✓ | `Found in cache @ /opt/hostedtoolcache/node/24.18.0/x64` |
| #2 — no download line in **that step** | ✓ | `grep -c` → 0, with a passing positive control |
| #3 — comment states all four points | ✓ | `verify.yml:32–53` |
| #4 — byte-identical artifacts under Node 24 on linux/x64 | ✓ | empty unscoped porcelain at `e7c9369` |
| #5 — gates pass on the runner; report quotes verbatim | ✓ | above |
| #6 — only `verify.yml` changed; no job/step/trigger/permission/action moved | ✓ | `git diff --numstat` → 1 file |
| #7 — PR #153's warning survives | ✓ | final paragraph of the block, kept and extended |
| #8 — `Closes #154`; plan + report + review ship in the PR | **partial** | `Closes #154` ✓ (`gh pr view 163 --json body \| grep -c` → 1); plan ✓ (`03c95f0`); report ✓ (`4ee95fc`); **review pending** — `.claude/code-reviews/pr-163-review.md` is `/piv-review-pr`'s artifact and does not exist yet. Not marked ✓ until it lands on this branch |
| #9 — no VR baselines regenerated, `visual` untouched | ✓ | no `setup-node` in that job; `visual` green |
