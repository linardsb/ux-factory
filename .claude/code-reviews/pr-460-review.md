# PR #460 review — spike(canvas): S6, the compose turn, branch 1 (#308)

**Head** `47678bb5ff081fad36833c7f018d41236a92bb06` · **Base** main @ `4d9adf6eeb22f96cf517780588aea20c5f5d182a` · first round (no prior report, guarantees pass not triggered) · reviewed 2026-09-24 in a detached temp worktree

## Summary

A spike PR: 18 files, +1857/-0, all under `.claude/` (driver kept as `driver.txt`, README, raw transcripts, plan, HTML brief, report). No product code changed (`git diff origin/main..HEAD -- system portal discovery handoff tooling import agent-layer` is empty, observed). The branch-1 verdict is supported by the committed transcripts: every figure I checked reproduces, and the committed driver reproduces the run's prompt fingerprint and its zero-token check outputs byte for byte. One Medium finding on the provenance of the `maxTurns: 10` claim that Q1's evidence depends on; three Lows. **Recommendation: approve** (posted as a comment: GitHub refuses an author's self-approve).

## Issues

### Critical / High
None.

### Medium

**F1 — `maxTurns: 10` is stated as a run fact but the run never recorded it.** `README.md` Q1 and § Setup say `num_turns` 2 was measured "against a deliberately loose `maxTurns: 10`". That is what makes Q1 a check that can fail: under a cap of 2, `num_turns 2` would be forced. But no file under `raw/run-2/` mentions `maxTurns` (grep, observed). The `driver` and `init` lines don't record it, nor do `stats`, `stdout.txt` or `verdict.json`. The prompt fingerprint (`driver.txt:349`) hashes `ROLE`, `LOOP`, `ESCAPE` and the two asks, not the cap. So the claim comes from reading `driver.txt:415`, not from the run's output. That makes it `derived`, not `observed`.
- Mitigation (observed): the committed driver reproduces the run's fingerprint `c903170484396973`, and its `--selftest` and `--preflight` output is byte-identical to `raw/selftest.txt` and `raw/preflight.txt`. The committed driver is very likely the one that ran. The cap still sits outside what those checks cover.
- Why Medium: #312 is told to carry `LOOP`/`ESCAPE` verbatim, and "a change re-opens S6" is keyed to the fingerprint. A change to the cap would not move the fingerprint, so that tripwire does not cover it.
- Fix: label the provenance in README Q1 and § Setup ("`maxTurns: 10`, from `driver.txt:415`; not recorded by the run"). In the driver, write `maxTurns` into the `stats` line (or the `driver` line), or add it to the fingerprint, so #312 and any re-run record it. Don't edit `raw/`.

### Low

**F2 — `ESCAPE_RE` misses a numbered-list prefix.** `driver.txt:133` `/^[^\w\n]*NOT COVERED:/m` does not match `1. NOT COVERED: …`, because `1` is a word character. Such an escape would classify as `empty-yield`, not `escape`. That outcome is also non-clean, so it cannot mask as `clean`, and no escape occurred in run 2. Fix if #312 reuses the regex: `/^[^A-Za-z\n]*NOT COVERED:/m`, plus a self-test case.

**F3 — `firstChildHeading` folds two signals into one flag.** `driver.txt:199` returns `y` for either a `text{role:"heading"}` or a `screen-header`. README Q4 reports it as "open with `screen-header`". That is true for this run: all four trees start with `screen-header` (re-derived from the op lines, observed). The proxy alone does not guarantee that reading. Rename or split the flag before #321 reuses the B5 proxies.

**F4 — the driver header omits the `npm ci` prerequisite.** `driver.txt:17-19` lists the `--selftest`, `--preflight` and `--run` commands. `--preflight` throws `ENOENT … portal/node_modules/@anthropic-ai/claude-agent-sdk` in a fresh worktree until `cd portal && npm ci` is run (observed). The plan's Task 1 says so; the header, which is the file a re-runner opens, does not. Add one line.

## Validation

| Check | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 42 groups pass` (observed). The first run was red on `icons` only because the fresh worktree lacked `tooling/icons/node_modules`; green after `npm ci`. Environment, not a finding |
| `node tooling/drift-check.mjs` | ✅ `drift-check ✓` on all 14 legs (observed), after `npm ci` in `tooling/icons` and `tooling/style-dictionary` (same environmental cause) |
| `node tooling/token-lint.mjs` | ✅ `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed) |
| Driver `--selftest` (scratch `.mjs` copy) | ✅ `selftest ✓ 17/17`, byte-identical to `raw/selftest.txt` (observed) |
| Driver `--preflight` | ✅ `preflight ✓ 7/7`, byte-identical to `raw/preflight.txt` (observed, after `portal` `npm ci`) |
| Fingerprint recomputed from the committed `driver.txt` constants | ✅ `c903170484396973`, matches `stdout.txt` and `verdict.json` (observed) |
| CI at head | ✅ `verify`, `codeql`, `CodeQL`, `visual`, `audit`, `gates-green` all pass |
| Paid `--run` | not run (review costs nothing) |

## Numbers pass

Every figure below was re-derived from the committed raw files, not from `verdict.json`'s own summary:

- **Q1:** `numTurns: 2` and `subtype: success` on `turn-1/2/3.jsonl:7` and `fork.jsonl:7`. One `tool_use` per turn. 0 `denied` lines, where `denied` is the literal the driver writes at `driver.txt:382,425`. One `sessionId` `1f579c0c-…` across all four files. Observed.
- **Q4 B5 proxies** from each `:4` op line: 4/4 roots are `stack` with `direction: column`; 4/4 first children are `screen-header`; last children are `primary-button`, `ghost-button`, `primary-button` and `modal-dialog` (the fork tree has 0 `primary-button`), which gives 2/4. Depths are 2, 2, 2, 3. None of the five Verdant-locked names appears. Observed.
- **Q5:** the `turn-3.jsonl` hint reads verbatim "New payees have a first-payment limit of £1,000 while we confirm this account". `prd.md:318` sits under seq 11 (heading at :312) and `prd.md:364` under seq 23 (heading at :361). `prd.md:7` records `open_question 0`. Observed.
- **Level-4 seq citations:** `grep -c "seq <n> ·"` → 1 for each of 6, 7, 8, 11, 12, 23 and 30. Observed.
- **Per-turn table totals:** derived and correct. Cost 0.15416 + 0.04387 + 0.03698 + 0.04576 = 0.28076; SDK ms 59 506; wall ms 69 296; output tokens 4 195; cache read 127 879; cache write 21 279.
- **The only figure without a run behind it is `maxTurns: 10` → F1.**

## What's good

- The two plan errors (a runaway counted over filed screens only, and an escape regex that markup defeats) were caught before any money was spent. Each is logged in AMENDMENTS with a self-test case and a mutation that goes red. The first was a check that could not fail, and it was fixed ahead of the evidence it would have corrupted.
- The claims stop where the evidence stops. Q2 says the run shows the agent follows `LOOP`'s one-call instruction, not that it yields unprompted. Q5 declines to answer D5 because the probe missed its target, and says why.
- Run 1's credit failure is kept as a failed run under its own number rather than overwritten, and the SDK's `success` + `is_error` shape is recorded correctly.
- The N4 finding (Faster Payment's projection lists 0 open questions while seq 11 is unsettled in prose) is concrete, cited, and handed to its owner (#320).
- Every README cell names its source file and line, and each one checked out.

## Recommendation

**Approve.** No Critical or High findings. Validation is green locally and in CI. F1 is a provenance label plus a one-field recording change, and it can land in this PR or be carried into #312. F2–F4 are optional.
