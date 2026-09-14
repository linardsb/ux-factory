# PR #405 Review — run 1's harness lands: read-fence generalization, pre-run gate, carrier-count edit

**Scope reviewed:** `portal/lib/discovery-transport.mjs`, `portal/lib/discovery-postures.mjs`,
`tooling/build-checks.mjs`, `tooling/run-1-ready.mjs` (new), `.claude/references/gates.md` — diffed
`7c50cba..cd80056`. Also inspected `discovery/faster-payment/{run.json,answers.jsonl,transcript.jsonl}`
for shape sanity, and the three committed probe-fence attempts under
`.claude/reports/discovery-faster-payment-run-291/`.

**Verification performed, not just read:** ran `node tooling/build-checks.mjs` on the branch — exit 0,
`build ✓  all 34 groups pass`; ran `node tooling/run-1-ready.mjs` directly — correctly inverted on
check 5 (`run.json` already exists) as its own header says it should post-run; `node --check`ed all four
JS files; grepped the whole diff-touched surface for stray `"six recording"` text; independently
re-derived the "which packages carry Think's fingerprint" count from the committed `discovery/*/run.json`
files (got 7, matching the new assertion); built a throwaway git repo to empirically test the
`committedAt()` staged-content edge case (see Issue 1).

---

## ✅ Strengths

1. **The `probeFence` generalization is correct and the run-2 shape is byte-identical.** Compared the
   old hardcoded `fixture`/`key` construction against the new `SHAPES['run-2']` closure line by line —
   same `pathMod.join`, same `mkdirSync(dirname, {recursive:true})`, same file content, same `targets`
   key order (`fixture, bank, key, own`). No behavior change for existing callers of `--probe-fence`.

2. **The `held`/`controls` fix is a real bug fix, not speculative hardening**, and the PR's own commit
   trail proves it: `.claude/reports/discovery-faster-payment-run-291/` holds three fence-probe attempts
   — `FAILED-control-misread` (the old first-call-only accessor scored a legitimate retry as a failed
   positive control), `FAILED-bank-oversize` (an unbounded bank Read exceeded the 25k-token cap before
   the `limit: 5` prompt fix landed), and the final `probe-fence.shape-run-1.out.txt` ending in
   `probe BOTH_SITES_HOLD`. The per-attempt (`callsFor` + `.every`/`.some`) rewrite is not vacuous: a key
   that is never attempted still fails `held()` (`cs.length > 0` is required), and for the run-1 shape
   both `_portfolio/decisions.json` and `_portfolio/pre-registration.sealed.md` sit under `base/_portfolio/`
   while every turn's root is `base/run-{a,b,c}/` — genuinely outside the allow-set by construction, not
   by accident of the test data.

3. **`--probe-fence-run-1` CLI dispatch is correct**: the exclusivity check treats it as a distinct flag
   from `--probe-fence` (so passing both is a usage error), and `shape: wantFenceRun1 ? 'run-1' : 'run-2'`
   is unambiguous given that exclusivity.

4. **`tooling/build-checks.mjs` case 23's new real-shape block is honestly scoped.** It documents its own
   limits inline ("PURE: these paths are built with join, never stat'd, so the case holds before the
   owner writes the file") rather than silently implying it proves the physical file's location. The
   gap that leaves — "would case 23 alone catch the sealed file physically moving under the run root?"
   — No, but that gap is closed by `tooling/run-1-ready.mjs`'s checks 1–2, which do call `existsSync`
   against the exact same `SEALED` constant. Verified this division of labor actually holds end to end
   by running `run-1-ready.mjs` against the real committed files (all of checks 1–4 passed silently;
   it stopped at check 5, exactly as documented for a post-run invocation).

5. **The 6→7 carrier-count edit is fully consistent and not a "check that cannot fail."** `30.46`'s count
   is derived by scanning `discovery/*/run.json` off disk (not hand-typed), and I independently
   re-derived the same figure with a shell loop: `bracket-trace-1, bracket-trace-2, faster-payment,
   graded-opus-a, graded-think-a, instrument-loans-1, later-not-never-1` = 7. All five textual sites I
   could find (`discovery-postures.mjs` header, `build-checks.mjs`'s case-30 top comment, its assertion
   message, `30.46`'s comment and assertion, the giant `group("discovery", …)` string, and
   `.claude/references/gates.md`'s group-30 entry) were updated together and a repo-wide grep for
   `"six recording"` in the touched files returns nothing.

6. **`run-1-ready.mjs`'s check ordering is deliberate and correct**: `existsSync` is checked before
   `tracked`/`committedAt` in both precondition 1 and 2, so a deleted or renamed-away file fails at the
   `existsSync` step with a clear message rather than reaching (and being misled by) `git log`'s history
   walk.

7. `execFileSync` throughout `run-1-ready.mjs` is called with an argument array (never a shell string),
   so there's no command-injection surface even though it shells out to `git`. `JOBS_DIR`'s import from
   `portal/lib/env.mjs` is guarded by `existsSync(envFile)` and degrades safely with no `portal/.env`
   present — confirmed by reading `env.mjs`.

---

## ⚠️ Issues Found

### Issue 1 — `committedAt()` can return a stale timestamp for content that isn't actually committed

- **File/lines:** `tooling/run-1-ready.mjs:59-62` (`committedAt`), used at `:69-70` and `:74-76`
- **Severity:** High (logic error in a safety gate whose own header calls its preconditions a
  "one-way door … the metric is unrecoverable")

`committedAt(p)` runs `git log --format=%cI -1 -- <p>` and treats a non-empty result as proof the
*current* file content is committed. That's only true for a file with **no prior history**. For a file
that was committed once and then edited and `git add`ed again (staged, not committed), `git log -1`
still returns the **previous** commit's date — `git log` walks commit history, it never looks at the
index/working tree. So `committedAt()` returns a valid non-null timestamp even though the content on
disk right now was never committed.

Demonstrated empirically:
```
$ git init && echo v1 > f.txt && git add f.txt && git commit -m v1
$ echo "v2 staged only" > f.txt && git add f.txt   # never committed
$ git log --format=%cI -1 -- f.txt
2026-09-14T09:47:02+01:00      # non-empty — committedAt() would NOT fail here
$ git show :f.txt
v2 staged only                 # ...but this is what's actually staged/on disk
```

The header comment's own justification — "`git ls-files --error-unmatch` is satisfied by `git add`
alone, which has no history at all" — is true only for a brand-new path. It doesn't hold once the path
has *any* prior commit.

**Concrete failure scenario:** the sealed pre-registration (`docs/epics/fixtures/*-pre-registration.sealed.md`)
or the one-sentence input is committed once, then the operator (or an agent, accidentally) edits it and
stages the edit but doesn't commit before running `node tooling/run-1-ready.mjs`. Checks 1 and 2 both
report "ready" using stale-but-real timestamps, even though the actual content that will be read by a
human later (via `git show HEAD:<path>`) differs from what's on disk when the sitting starts. This is
exactly the scenario precondition 2 exists to rule out — "written blind … sealed before the run."

For *this* PR's actual run the bug didn't bite (verified: both `faster-payment-input.md` and
`faster-payment-pre-registration.sealed.md` have exactly one commit each and zero pending changes right
now via `git log --oneline` and `git status --porcelain`), but the gate function itself has the hole,
and its header explicitly frames the check as guarding an unrecoverable one-way door.

**Fix:** check that the working tree/index matches HEAD for that path, not just that some commit once
touched it — e.g. `execFileSync('git', ['diff', '--quiet', 'HEAD', '--', p], {cwd: ROOT})` (throws/non-zero
exit on any staged or unstaged difference from HEAD) alongside (or instead of) the `git log` call, or
`git status --porcelain -- <path>` must be empty.

### Issue 2 — the new `--probe-fence-run-1` shape isn't documented at either of its two invariant-carrying homes

- **Files/lines:** `.claude/references/gates.md:90` ("The fence probe" entry); `portal/lib/discovery-transport.mjs:29-33` (module header usage list)
- **Severity:** Medium (pattern/standards compliance — CLAUDE.md: "invariants live in the file that owns
  them" + this repo's own convention that a gate's coverage claim lives in (at minimum) gates.md and the
  file/function header)

`probeFence` gained a `shape` parameter and a second shape (`run-1`, covering
`_portfolio/decisions.json` and `_portfolio/pre-registration.sealed.md`) with its own function-level doc
comment — that part is done well (see Strength 1/2). But neither of the two places a reader would look
for "what does the fence probe cover" was updated:

- `gates.md:90`, **"The fence probe"** entry, still describes only: *"three PAID one-shot turns … over a
  temp tree shaped like run 2 — a fixture under `docs/epics/fixtures/`, the key one directory above it …
  Each turn asks the agent to read the fixture, the bank, the key and its own `answers.jsonl`"* — no
  mention of `--probe-fence-run-1`, the `shape` parameter, or the two-key run-1 case.
- `discovery-transport.mjs`'s own top-of-file usage list (lines 29-33, unchanged by this diff) still
  only lists `--probe-fence`, not `--probe-fence-run-1`.

Group 30's body text in `gates.md` (the giant `#287 added THE READ FENCE …` paragraph) *was* touched for
the unrelated 6→7 edit, so this isn't a case of the file being untouched — the specific "fence probe"
paragraph documenting the paid CLI tool just wasn't updated alongside the code that added a flag to it.
A future reader following the memory convention "grep gates.md + the group() string + a fixture header"
would come away believing the fence probe only ever exercises run 2's shape.

**Fix:** extend the `gates.md:90` paragraph (and, for symmetry with every other probe's file-header
listing, `discovery-transport.mjs:29-33`) to name `--probe-fence-run-1` and the two keys it proves are
denied.

---

## 🔍 Questions/Clarifications

- Is `tooling/run-1-ready.mjs` intended to be copied/parameterized for future runs, or is it deliberately
  a one-off (the `SLUG`/`INPUT`/`SEALED` constants are hardcoded to `faster-payment`)? If it's meant as a
  template for a future run 2/3 gate, Issue 1 should be fixed before it's copied forward — a copy-paste
  would silently carry the hole into every future run's gate.
- `run-1-ready.mjs`'s `tracked()` collapses every `git ls-files --error-unmatch` failure (not-tracked,
  not-a-repo, permission error, git not installed) into the same "not tracked" message. Low-confidence,
  not flagged as an issue above, but worth confirming that's acceptable given the script is meant to be
  run interactively by the operator (who would presumably notice a git-not-found style error regardless
  of the message's specific wording).

---

## ✨ Recommendations

- Consider whether `committedAt()`'s fix (Issue 1) should also assert the sealed file's content hash
  matches what's in `git show HEAD:<path>`, not just "no pending diff" — belt-and-suspenders, though
  `git diff --quiet HEAD --` alone is probably sufficient and simpler.
- The `import.meta.url === pathToFileURL(process.argv[1]).href` CLI-entry guard (used unchanged in both
  `discovery-transport.mjs` and now `run-1-ready.mjs`) breaks if the script is invoked via an absolute
  path through a symlinked directory (confirmed empirically: `node /tmp/x/f.mjs` fails the guard on
  macOS because `/tmp` → `/private/tmp`, while `import.meta.url` resolves through the symlink). This is
  a pre-existing repo-wide pattern, not something this PR introduced, and it does **not** break the
  documented invocation (`cd` to the repo root, then a relative `node tooling/run-1-ready.mjs`, which
  Node resolves against the already-canonicalized `process.cwd()`). Not flagged as an issue for this PR,
  but worth a note in case a future doc ever recommends invoking these scripts by absolute path.

---

## 📋 Review Summary

- **Overall assessment:** Needs revision before being treated as a settled precedent for future runs —
  the substantive code (fence-probe generalization, case 23, the 6→7 count) is correct and well
  cross-verified (build-checks passes all 34 groups on this branch), but Issue 1 is a genuine hole in the
  gate that's supposed to guarantee the "one-way door" precondition, and it should be fixed rather than
  left latent, especially before `run-1-ready.mjs` is reused for a future run.
- **Issues by severity:** High: 1 (`committedAt()` staged-content gap). Medium: 1 (fence-probe doc
  drift in gates.md / file header). Low: 0 flagged (one informational note on the CLI-guard pattern,
  not attributable to this PR).
- **Critical blockers:** none — nothing here is a crash, data-loss, or exploitable-security issue, and
  the actual committed `faster-payment` package is unaffected by Issue 1 (verified: single commit, no
  pending changes on either gated file).

**Do not start fixing these findings without the user's explicit approval.**
