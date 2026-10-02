# Feature: commit both fenced handoff-seam runs as labelled fixtures (#330)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

On 2026-08-28 two fresh `claude` sessions were each started in a directory holding only a copy of the handoff
pack (`handoff/verdant/`). One acted as a backend engineer (`~/Desktop/seam-run`: a zero-dep mock API, a demo
page, a curl transcript, 28 logged questions). One acted as an iOS engineer (`~/Desktop/port-run`: a SwiftUI
`CareTaskRow.swift`, a web→iOS translation table, 33 logged questions). Epic #329's evidence table, success
metrics and four downstream tickets cite these runs, but they live only on the owner's Desktop. This ticket
copies them into the repo, byte for byte, minus their `pack/` copies, with a README per run that labels the run
and states what the agent could see, which prompt it was given, and which commit its pack came from.

## User Story

As a reader checking epic #329's claims (the owner, a reviewer, or a downstream ticket's implementer)
I want the two fenced runs committed unedited, with their fence, prompt and pack commit stated beside them
So that every "seam-run Q1" or "port-run T20" citation resolves to a tracked file, and T3/T4b have their fixtures.

## Problem Statement

The epic's evidence is unreachable by anyone but the owner, and it can be lost or edited without a trace. T3
(#334) needs `2026-08-28-seam/server.mjs` and T4b (#335) needs `2026-08-28-port/translation.md` T20–T25 as
committed inputs.

## Solution Statement

Copy both directories excluding `pack/` with `rsync -a --exclude pack/` into
`docs/epics/fixtures/handoff-seam/2026-08-28-{seam,port}/`, force-add the one git-ignored file
(`server.log`), and add one hand-written `README.md` per run. No CI change: drift-check's existing syntax leg
already runs `node --check` on every tracked `.mjs`, and the pre-flight proved it reaches this file (NOTES).

## Out of Scope / Non-Goals

- Not included: any edit to a run file, including trailing whitespace, line endings, a typo, or a stale claim
  inside `notes.md`. The honesty contract forbids it (CLAUDE.md §Ground rules; epic "Constraints carried").
- Not included: the `pack/` copies. They are byte-identical to `handoff/verdant/` at `6f1376b` (observed) and
  restorable from git; the README says how.
- Not included: a new `verify.yml` step. The ticket's "+1 CI step" estimate is superseded by evidence (Q2).
- Not included: a reconstructed prompt. If the owner cannot supply the verbatim text, the README states it was
  not retained (Q1). Writing it from memory or from the run's outputs would be hand-writing the run's input.
- Not changing: `.gitignore` (one `git add -f` instead of a negation rule), `docs/epics/handoff-seam.prd.md`
  (its "committed by T1" wording stays true after this lands), CodeQL scope (`docs/` is outside its allowlist).
- Not included: a mapping of `server.mjs`'s routes to bindings (that is T3's Q2, `--map` or README list).

## Feature Metadata

**Feature Type**: New Capability (tracked evidence)
**Estimated Complexity**: Low (one owner-dependent input)
**Primary Systems Affected**: `docs/epics/fixtures/` only
**Dependencies**: none (no library, no network, no paid run)

## Related Work

**Implements**: #330 (`Closes #330`)   ·   **Epic**: #329, `docs/epics/handoff-seam.prd.md` (D7: runs live under
`docs/epics/fixtures/handoff-seam/`, beside the pre-grill PRD fixture; no separate architecture doc)

**Back-references**:

- `docs/epics/handoff-seam.prd.md` §T1, D7, "Constraints carried" - Why: placement, label wording, honesty rule.
- Memory `handoff-seam-epic-state` - Why: records that the runs are T1's unedited artifact.

**Forward-references**:

- #334 (T3) mounts `2026-08-28-seam/server.mjs` for its second green; needs the README's pack-restore command.
- #335 (T4b) uses `2026-08-28-port/translation.md` T20–T25 as its fixture.
- #336 (T4a) re-runs the port prompt; it needs the verbatim prompt this ticket records (or learns it is lost).

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `tooling/drift-check.mjs` (lines 33-46, `checkSyntax`) - Why: runs `node --check` on every `git ls-files "*.mjs"`;
  this is the CI step that satisfies AC #4. Runs inside verify.yml's "Drift check" step (verify.yml line 85-86).
- `.gitignore` (line 11, `*.log`) - Why: ignores `server.log`; needs `git add -f`.
- `.github/codeql/codeql-config.yml` (`paths:` allowlist) - Why: `docs/` is not in it, so CodeQL never scans the
  run's `server.mjs` (whose `serveStatic` would otherwise be a path-injection candidate).
- `agent-layer/gen-loc-summary.mjs` (lines 24-28, `GROUPS`) - Why: only `system/`, root/`proto/` html and
  `agent-layer/` count, so the fixtures move no loc-summary figure and no approach baseline.
- `docs/epics/handoff-seam.prd.md` (lines 4, 49-51) - Why: T1's wording, the label string.
- `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` (lines 1-10) - Why: the sibling fixture;
  its header states provenance and what is NOT reachable plainly. Mirror that register.
- `/Users/Berzins/Desktop/claude-code-second-brain/Fredis/Memory/thinking/2026-08-28-component-system-backend-seam.md`
  (line 108) - Why: the only written statement of the fence ("a fresh agent given only `handoff/verdant/`, no repo,
  no web, no questions allowed, logging every question before deciding"). Outside the repo; quote it, cite it.

### New Files to Create

- `docs/epics/fixtures/handoff-seam/2026-08-28-seam/` - 8 run files, copied: `curl.md`, `index.html`, `notes.md`,
  `questions.md`, `render-after.png`, `render-before.png`, `server.log`, `server.mjs`
- `docs/epics/fixtures/handoff-seam/2026-08-28-port/` - 4 run files, copied: `CareTaskRow.swift`, `notes.md`,
  `questions.md`, `translation.md`
- `docs/epics/fixtures/handoff-seam/2026-08-28-seam/README.md` - label, fence, prompt, commit, timeline, inventory
- `docs/epics/fixtures/handoff-seam/2026-08-28-port/README.md` - same shape
- `.claude/reports/handoff-seam-run-fixtures-330-report.md` - the implementation report (same PR)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `tooling/drift-check.mjs:33-46` - Why: the syntax leg's scope (every tracked `.mjs`); gates.md has no section for it.
- CLAUDE.md §Ground rules "Honesty contract" and §Git (plan, report and review in the same PR; `Closes #N`).

### Patterns to Follow

**Copy, never retype:** `rsync -a --exclude pack/ <src>/ <dest>/` (trailing slashes matter: copy contents).

**README register** — plain declarative provenance, each fact with its source, nothing the evidence does not
show. Mirror the pre-grill fixture's "Inputs" paragraph: it names where each input lives and says plainly what
is not reachable.

**Evidence to quote in the READMEs (all observed 2026-10-02 during pre-flight):**

| Fact | Source |
|---|---|
| seam launch: `mkdir -p ~/Desktop/seam-run && cp -R ~/Desktop/Linards_current/ux-factory/handoff/verdant ~/Desktop/seam-run/pack && cd ~/Desktop/seam-run && claude` | `~/.zsh_history` line 748 |
| port launch: same with `port-run` | `~/.zsh_history` line 745 |
| seam prompt: one paste, 16 lines + first, `[Pasted text #1 +16 lines]`, session `a88ec5fc-b0f3-4992-b162-28b883e4fe71`, 2026-08-28 20:43:36 BST | `~/.claude/history.jsonl` line 17202 |
| port prompt: `[Pasted text #1 +21 lines]`, session `a9b674a0-1c49-4dc4-92eb-dda3fff265d9`, 20:45:58 BST | `~/.claude/history.jsonl` line 17207 |
| seam follow-up turn: "give me path to notes.md", 20:56:07 BST | history.jsonl line 17208 |
| port follow-up: `/clear` at 21:13:18 BST, then unrelated sessions (`/piv-slice-epic …`, two planning questions) started from that directory | history.jsonl lines 17211-17217 |
| last run-file write: 20:53 (seam: `notes.md`, `questions.md`… mtimes 20:48–20:53; port: 20:51–20:53) | `ls -l` of both dirs |
| `pack/` == `handoff/verdant` at `6f1376b84045bae4bec6aa5a9613beef0c5bde6e` (merge of PR #325, 2026-08-28 17:16 BST) | `diff -rq` vs `git archive 6f1376b handoff/verdant`: empty, both runs |

The `history.jsonl` line numbers are a point-in-time pointer; quote session id + timestamp as the durable key.

---

## IMPLEMENTATION PLAN

### Phase 0: Owner input (blocking AC #1's "prompt")

Ask the owner for the two pasted prompts verbatim. If they have them, they go into the READMEs inside a fenced
block, unchanged. If not, the README records the fallback (Task 4) and the report marks AC #1 as partly met.

### Phase 1: Copy

**Independent of:** Phase 0 (the copy does not depend on the prompt).

### Phase 2: READMEs

**Depends on:** Phase 0 and Phase 1.

### Phase 3: Validate, report, PR

---

## STEP-BY-STEP TASKS

### Task 1 — CREATE a clean worktree and branch off `origin/main`

- **IMPLEMENT**: `git fetch origin && git worktree add -b docs/handoff-seam-fixtures-330 ../wt-330 origin/main`.
  Symlink the two tool `node_modules` from the primary tree (drift-check needs both):
  `ln -s "$PWD/tooling/style-dictionary/node_modules" ../wt-330/tooling/style-dictionary/node_modules` and the
  same for `tooling/icons/node_modules` (run from the primary tree root). Work only in `../wt-330`.
- **GOTCHA**: the primary tree is on `fix/importer-reads-icon-name-449` with ~100 untracked files and parallel
  sessions share it (memory `shared-worktree-parallel-sessions`). Never commit there.
- **GOTCHA**: the `tooling/icons/node_modules` symlink shows as `??` in `git status` (`.gitignore`'s
  `node_modules/` matches directories, not a symlink file). Never `git add -A`; stage by explicit path.
- **VALIDATE**: `git -C ../wt-330 rev-parse --abbrev-ref HEAD` → `docs/handoff-seam-fixtures-330`
- **SATISFIES**: precondition
- **REGENERATES**: none

### Task 2 — CREATE the two run directories by copy

- **IMPLEMENT** (in `../wt-330`):
  ```bash
  D=docs/epics/fixtures/handoff-seam
  mkdir -p $D/2026-08-28-seam $D/2026-08-28-port
  rsync -a --exclude pack/ ~/Desktop/seam-run/ $D/2026-08-28-seam/
  rsync -a --exclude pack/ ~/Desktop/port-run/ $D/2026-08-28-port/
  git add $D/2026-08-28-seam $D/2026-08-28-port
  git add -f $D/2026-08-28-seam/server.log
  ```
- **GOTCHA**: `server.log` is ignored by `.gitignore:11 *.log` and plain `git add` skips it silently (observed in
  pre-flight: 11 of 12 files staged). The `-f` add is required, and the count check below catches its absence.
- **GOTCHA**: never open a run file in an editor that strips trailing whitespace or adds a final newline on save.
- **VALIDATE**: `git ls-files docs/epics/fixtures/handoff-seam | wc -l` → `12` (observed in pre-flight)
- **VALIDATE**: `git diff --cached --stat | tail -1` → `12 files changed, 1885 insertions(+)` (observed)
- **SATISFIES**: AC #1 (tracked), AC #3
- **REGENERATES**: none (loc-summary groups do not match `docs/`; pre-flight drift-check green)

### Task 3 — PROVE the copy is byte-identical from the INDEX, not the working tree

- **IMPLEMENT**:
  ```bash
  S=$(mktemp -d)
  git ls-files -z docs/epics/fixtures/handoff-seam | xargs -0 git checkout-index --prefix=$S/
  diff -r -x pack -x README.md ~/Desktop/seam-run $S/docs/epics/fixtures/handoff-seam/2026-08-28-seam && echo SEAM-EMPTY-DIFF
  diff -r -x pack -x README.md ~/Desktop/port-run $S/docs/epics/fixtures/handoff-seam/2026-08-28-port && echo PORT-EMPTY-DIFF
  ```
  Re-run after the commit with `git archive HEAD docs/epics/fixtures/handoff-seam | tar -x -C $S2` in place of
  `checkout-index`, so the proof covers committed bytes.
- **GOTCHA**: `-x README.md` is safe only because neither Desktop directory has a `README.md` (observed). If one
  appears there, stop: the exclusion would hide a run file.
- **VALIDATE**: both `*-EMPTY-DIFF` lines print (observed in pre-flight, index form)
- **REDDENS**: append one byte to the staged `questions.md` (`printf x >> …; git add …`) → `diff` prints
  `Files … differ` and no `SEAM-EMPTY-DIFF`. Restore: re-run Task 2's rsync for that run, `git add` the file, re-run
  the diff. (`git checkout HEAD --` fails: `origin/main` has no copy; `git checkout --` restores the mutated index.)
- **SATISFIES**: AC #3
- **REGENERATES**: none

### Task 4 — CREATE `2026-08-28-seam/README.md` and `2026-08-28-port/README.md`

- **IMPLEMENT**: one README per run, these sections in this order. Every factual line cites its source from the
  evidence table above.
  Use these exact `##` headings (Task 4's VALIDATE greps two of them): `## The pack it read`, `## The fence`,
  `## The prompt`, `## Timeline`, `## Files`, `## Who reads it`.
  1. **Title + label.** `# Fenced run: backend engineer (2026-08-28)` / `# Fenced run: iOS engineer (2026-08-28)`,
     then the label verbatim on its own line: `**real agent run, 2026-08-28, fenced to the pack, unedited**`.
  2. **The pack it read.** Commit `6f1376b` (full SHA, "merge of PR #325"). The pack copy is not committed here;
     it was byte-identical to `handoff/verdant/` at that commit (the `diff -rq` result, dated). Restore:
     `git archive 6f1376b handoff/verdant | tar -x -C <tmp> && cp -R <tmp>/handoff/verdant pack` (seam README
     adds: `server.mjs` reads `./pack/contracts/*.contract.json` at boot and serves `/pack/*`, so it does not
     start without this).
  3. **The fence.** What was set up: the launch command verbatim (zsh history), so the working directory held
     only `pack/`; the instructions, per the vault doc line 108 quote. What it could not prevent, stated plainly:
     "no repo, no web" was an instruction, not a sandbox; user-level `~/.claude/` configuration (global
     `CLAUDE.md`, output style, skills) loads in every session started on this machine. Do not claim a model name
     or a tool restriction: neither is recorded.
  4. **The prompt.** Owner-supplied verbatim text in a fenced block, unchanged. **Fallback, if the owner does not
     have it:** "The prompt was pasted (one paste, N lines; `~/.claude/history.jsonl`, session `<id>`,
     `<timestamp>`). Its text was not retained: the paste cache and the session transcript were purged before
     2026-10-02. It is not reconstructed here, because a reconstruction would be hand-written input presented as
     the run's." Do not paraphrase the run's own echoes of its rules (`questions.md` line 3) as the prompt.
  5. **Timeline and what "unedited" rests on.** Start time, last file write 20:53, the later turns (seam: one owner
     turn at 20:56:07 asking for a path; port: `/clear` at 21:13:18 and later unrelated sessions in that directory),
     and that no run file's mtime is later than 20:53 (observed 2026-10-02; git does not keep mtimes, so the README
     is where that evidence lives). Then the copy method (rsync excluding `pack/`, `server.log` force-added) and
     the `diff -r` command from Task 3 so anyone can re-check against the Desktop copies while they exist.
  6. **Files.** One line per file saying what it is, taken from the run's own `notes.md` where it says so.
  7. **Who reads it.** seam: CI's drift-check syntax leg runs `node --check` on `server.mjs`; nothing else reads it
     until #334 mounts it. port: #335 uses `translation.md` T20–T25; #336 re-runs the port prompt.
- **PATTERN**: `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md:1-10` (provenance, plainly).
- **GOTCHA**: a README is authored text, so it may describe the run but never restate a run's finding as fact
  ("the pack has defect X") without attributing it to the run ("the run logged X as Q7").
- **GOTCHA**: copy for the owner is never indented (memory `copy-never-indented`); the verbatim prompt goes in a
  fenced code block, not a blockquote.
- **VALIDATE**: `for f in docs/epics/fixtures/handoff-seam/*/README.md; do for s in "real agent run, 2026-08-28, fenced to the pack, unedited" 6f1376b "## The fence" "## The prompt"; do grep -qF "$s" "$f" || echo "MISSING $s in $f"; done; done` → no output (expected)
- **REDDENS**: delete the label line from one README → `MISSING real agent run… in …/README.md`
- **SATISFIES**: AC #1 (label, fence, prompt, commit)
- **REGENERATES**: none

### Task 5 — VERIFY the CI syntax leg reaches `server.mjs` (no workflow edit)

- **IMPLEMENT**: run the positive control, then restore:
  ```bash
  F=docs/epics/fixtures/handoff-seam/2026-08-28-seam/server.mjs
  echo '}' >> $F && node tooling/drift-check.mjs 2>&1 | head -2; git checkout -- $F
  node --check $F && echo restored
  ```
- **VALIDATE** (observed in pre-flight):
  `drift ✗  syntax error in docs/epics/fixtures/handoff-seam/2026-08-28-seam/server.mjs (node --check failed):`
  then after restore `restored`.
- **REDDENS**: the mutation above is the reddening; if drift-check stays green with the stray `}`, the file is not
  tracked (check Task 2's count) and AC #4 is not met.
- **GOTCHA**: `git checkout -- $F` restores from the INDEX, so run this after Task 2's `git add`; before it, the
  checkout fails and the file stays mutated.
- **SATISFIES**: AC #4
- **REGENERATES**: none

### Task 6 — RUN the full gate set, commit, report, PR

- **IMPLEMENT**: run Level 1–3 below; commit only the fixture paths and the plan/report by explicit path:
  `git add docs/epics/fixtures/handoff-seam .claude/plans/handoff-seam-run-fixtures-330.md .claude/plans/handoff-seam-run-fixtures-330.html .claude/reports/handoff-seam-run-fixtures-330-report.md`
  (plus `git add -f …/server.log` if a re-copy happened). Message:
  `docs(epics): commit both handoff-seam fenced runs as labelled fixtures (#330, epic #329 D7)` + the
  co-author trailer. PR body ends with `Closes #330`. Re-run Task 3 against `git archive HEAD`.
- **GOTCHA**: the plan file was written in the primary tree; copy it into `../wt-330/.claude/plans/` before
  staging. Reviews land as `.claude/code-reviews/pr-<N>-review.md` in the same PR (CLAUDE.md §Git).
- **GOTCHA**: `gh pr checks --watch` straight after a push can report the previous head (memory
  `pr-head-lag-stale-checks`); compare `headRefOid` to local HEAD first.
- **VALIDATE**: `git show --name-only --format= HEAD | grep -c '^docs/epics/fixtures/handoff-seam/'` → `14`
  (12 run files + 2 READMEs; expected). Not `--stat`: piped, it truncates long paths from the left.
- **SATISFIES**: AC #2, AC #4 (in CI)
- **REGENERATES**: none

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). The checks are: the file count, the byte diff from the index and from `HEAD`,
drift-check's syntax leg with a positive control, and the full verify job.

### Edge Cases

- `server.log` silently not staged (ignored) → Task 2's count is 11, not 12.
- An editor normalises a run file → Task 3's diff names it.
- A future `.gitattributes` with `text=auto eol=lf` would rewrite CRLF on checkout; none exists today (observed:
  no `.gitattributes`), and the `git archive HEAD` diff in Task 6 is the guard.

### Proving the checks

| Check | Reddening mutation | Observed in pre-flight |
|---|---|---|
| drift-check syntax leg covers `server.mjs` | append `}` | red, names the file |
| byte diff (Task 3) | append a byte to a staged run file | not run (expected `Files … differ`) |
| README contents grep (Task 4) | delete the label line | not run (expected `MISSING …`) |
| file count | omit `git add -f server.log` | 11 files (observed before the `-f` add) |

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

- `node tooling/drift-check.mjs` → `drift-check     ✓  syntax · token-css · … · group-count` (observed with the 12
  files staged)
- `node tooling/token-lint.mjs` → `token-lint      ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
  (observed)

### Level 2: Unit Tests

- `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass` (observed with the 12 files staged)

### Level 3: Integration Tests

- Task 3's `diff -r` from the index and from `git archive HEAD`.
- Task 5's positive control.
- piv-validate maps to the CI verify job plus a portal smoke (memory `piv-skills-python-tuned`); run it even though
  this is a docs/fixture PR.

### Level 4: Manual Validation

- Read both READMEs top to bottom against the evidence table. Every sentence either cites a source or is the label.
- Optional, not required by any AC: restore `pack/` into a scratch copy of `2026-08-28-seam/` and `node server.mjs`
  boots with the line in `server.log`. Do not do this inside the repo (it would write `pack/` beside a tracked file).

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Owner supplies the two prompts verbatim, or confirms they are lost | owner's hand | yes, until answered; if "lost", the PR proceeds with the fallback and the report marks AC #1 partly met | answer on #330 |

No paid step. No VR baseline moves (no shipped page changes).

---

## ACCEPTANCE CRITERIA

- [ ] Both directories tracked: 12 run files (8 seam incl. `server.log`, 4 port) + 2 READMEs.
- [ ] Each README states the label verbatim, the fence (set-up and limits), the prompt VERBATIM, and commit
      `6f1376b`. If the owner confirms the prompts are lost, the README carries the fallback, this box stays
      unticked, and the report says why.
- [ ] `node tooling/drift-check.mjs` clean.
- [ ] `diff -r -x pack -x README.md` of each Desktop run against the committed copy is empty (from `git archive HEAD`).
- [ ] CI verify's "Drift check" step runs `node --check` on `2026-08-28-seam/server.mjs` and is green (proven
      reachable by the Task 5 mutation).
- [ ] Plan, report and review in the PR; body carries `Closes #330`.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] drift-check, token-lint, build-checks green
- [ ] Byte diffs empty from index and from HEAD
- [ ] Positive control for the syntax leg observed
- [ ] Owner answer on Q1 recorded in the report
- [ ] `../wt-330` and `../wt-330-preflight` removed after merge

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (answered 2026-10-02: lost — see AMENDMENTS).** The prompts were pastes (16 and 21 lines). Their text is not on disk: no
  paste-cache entry for content hashes `5a0a8b6da70afe80`/`fb6d716db26dd65f`, no session transcript for
  `a88ec5fc…`/`a9b674a0…`, no file-history copy, no other transcript containing the run's column header (all
  observed 2026-10-02). Do you still have them (for example in the chat where they were drafted)? If yes, paste
  them and they go in verbatim. If no, the README states they were not retained, and AC #1 is reported as partly
  met. Recommended: check before implementing; the copy (Phase 1) can proceed meanwhile.
- **Q2 (decided here, flag only).** No new `verify.yml` step. drift-check's `checkSyntax` already runs
  `node --check` on every tracked `.mjs`, inside verify's "Drift check" step; a second step would be a second copy
  of the same check. The ticket's "1 CI step" was an estimate, not a decision.
- **Assumption A1.** "Commit as-is unless drift-check/verify object" covers `.gitignore`: `.gitignore` is not a
  gate, so `server.log` is force-added rather than dropped.
- **Assumption A2.** The Desktop copies are unchanged since 2026-08-28 20:53 (mtimes observed). If the owner knows
  of a later edit, stop: the run state is then not recoverable from the Desktop.

## NOTES (open canvas)

### Pre-flight (run 2026-10-02 in a detached worktree `../wt-330-preflight` off `origin/main` at `ea82873`)

1. **Copied and staged** with rsync. `git status` showed 11 added files; `server.log` missing.
   `git check-ignore -v` → `.gitignore:11:*.log`. Added `git add -f`; count 12. Plan changed: Task 2 carries the
   `-f` add and a count check.
2. **drift-check** with the fixtures staged → `drift-check ✓ syntax · … · group-count`. **token-lint** ✓.
   **build-checks** → `all 51 groups pass`. No loc-summary drift (groups do not match `docs/`).
3. **Positive control**: appended `}` to `server.mjs` → `drift ✗  syntax error in
   docs/epics/fixtures/handoff-seam/2026-08-28-seam/server.mjs (node --check failed)`. Plan changed: dropped the
   ticket's new CI step (Q2).
4. **Byte diff from the index** (`git checkout-index --prefix`) against both Desktop dirs, excluding `pack` and
   `README.md` → empty both.
5. **Pack provenance**: `git archive 6f1376b handoff/verdant` vs each Desktop `pack/` → `diff -rq` empty both. The
   ticket's commit claim is now evidenced, not only asserted; it goes in the README.
6. **CodeQL**: `docs/` is outside `.github/codeql/codeql-config.yml`'s `paths` allowlist, so the agent-written
   `serveStatic` (a path-join over a request path) cannot raise a blocking alert. No change needed.
7. **Prompt search**: zsh history (launch commands, lines 745/748), `~/.claude/history.jsonl` (pastes,
   lines 17202/17207, follow-ups 17208/17211-17217), paste-cache (125 entries, neither hash), `~/.claude/projects`
   (no transcript for either session id; only this session contains the column header), file-history (two hits on
   "fenced", both unrelated), vault thinking doc (fence described, prompt not quoted). Plan changed: Q1 and the
   README fallback.
8. **Build-checks sweeps** over tracked files (`build-checks.mjs` ~6368: shipped html must not reach
   `discovery/bank`; ~10741: no `graded-*` slug in tracked `.mjs/.html/.js`): `index.html` and `server.mjs`
   match neither; confirmed by the green run.

### Rejected

- A `.gitignore` negation (`!docs/epics/fixtures/handoff-seam/**/server.log`): a rule for one file; `-f` is enough
  and tracked files stay tracked.
- Dropping `server.log`: the ticket allows it only if a gate objects; none did.
- Committing `pack/`: duplicates 776 KB already in git history at `6f1376b`, and would put a second, ungenerated
  copy of the pack in the tree beside the generated one.

## AMENDMENTS

- 2026-10-02 — pre-report review: AC #1 tightened to the verbatim prompt; Task 6 count uses `--name-only`; Task 3
  restore corrected; README headings pinned to Task 4's grep; gates.md citation replaced. Plan `.html` briefs are
  tracked on main (25 observed), so Task 6 keeps staging it.
- 2026-10-02 — Q1 answered by the owner: "i dont have prompts". Task 4 uses the fallback in both READMEs (pasted,
  line count, session id, timestamp, not retained, not reconstructed). The prompt part of AC #1 stays unticked and
  the report says why; the PR body says so too. Phase 0 is closed and no longer blocks. Downstream: #336's re-run of
  the port prompt cannot reuse the original text and needs a new prompt, labelled as new.
- 2026-10-02 — implementation: Task 4's restore command `git archive 6f1376b handoff/verdant | tar …` fails as written
  when run from inside the fixture directory, because the pathspec is relative to the working directory. The READMEs
  use `git -C <repo root> archive 6f1376b handoff/verdant`, run in scratch and proven (`diff -rq` vs the Desktop
  `pack/` empty, server boot line identical to `server.log`). Task 3's REDDENS case printed a line diff
  (`45a46 > x`), not `Files … differ`, because both files are text; it is still a red (exit 1, no `SEAM-EMPTY-DIFF`).
