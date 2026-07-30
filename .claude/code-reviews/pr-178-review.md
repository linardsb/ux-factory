# PR #178 Review — measured live-control count: manifest + generator, drift-checked (#167)

**Verdict: REQUEST CHANGES** — one High issue (trivial fix), everything else verified clean. Fix the NUL bytes, re-verify the diff renders as text, and this is an approve.

## Summary

The implementation is faithful to the loc-summary pattern and to the honesty contract: a committed
manifest → deterministic generator → drift-checked artifact → JS-rendered number on approach.html,
with the degrade path hiding the exhibit rather than showing a stale claim. Validation was re-run
independently in this review (not just read from the report) and everything held. One defect blocks
merge: the generator source file contains literal raw NUL bytes, so git treats the PR's core new
file as **binary** — its diff is invisible to line-based review, blame, and `log -p`.

## Issues

### High

**H1 — `agent-layer/gen-param-count.mjs` contains two literal raw NUL bytes (0x00); the file is binary to git.**
Verified by byte inspection: offsets 1753 and 2095 — inside the comment `// "page␀selector" → first index`
and the dedup key `const key = entry.page + "␀" + entry.selector;`. `git diff main...HEAD --stat`
shows `Bin 0 -> 4092 bytes`, which is also why the PR's file list reports 0 additions for it.
The delimiter intent is sound (a CSS selector can contain spaces, so space is unsafe as a compound
key separator), but it must be the *escape sequence*, not the control character itself.

Fix (2 characters, no behaviour change):
- line ~32 comment: write `"page\0selector"` as backslash-zero text
- line ~38: `const key = entry.page + "\0" + entry.selector;` using the `\0` escape
- then confirm `git diff main...HEAD -- agent-layer/gen-param-count.mjs` renders as a text diff,
  regenerate nothing (output is unaffected), and force-push/amend or add a fix commit.

No other `.mjs` in the repo carries a raw NUL — this is a one-off, not a pattern.

### Medium

None.

### Low

**L1 — Manifest `$description` scope wording.** It says "the 10 VR-gated shipped pages + chrome"
but only 7 pages have entries. The omissions are *correct* (fieldwork's agentic slots render
non-interactive metric-tiles; contact/404 have no controls — verified against
`system/agentic-renderer.mjs`), but the rule "a page with zero controls simply has no entries" is
implicit. One clause in `$description` would close it. Non-blocking.

**L2 — Epic metric already exceeded (not a code defect).** Measured 62 vs the epic's "≥40 from ~20"
(`docs/epics/prototyping-feel-uplift.prd.md`). Already flagged in the PR body and report as an
owner decision on epic #164 — correctly not silently amended. Nothing to change in this PR.

## Validation (re-run in this review, not inherited)

| Check | Result |
|---|---|
| `node --check agent-layer/gen-param-count.mjs` | ✓ |
| Generator run + rerun | ✓ 62 controls, byte-identical |
| `--check` mode | ✓ green |
| Mutation proof (drop entry → check) | ✓ RED, exit 1; restored → green |
| Validation throws (missing field / duplicate / empty) | ✓ fire and name the entry (agent-tested live) |
| `node tooling/drift-check.mjs` | ✓ summary includes `param-count` |
| CI (`verify` + `visual`) | ✓ both pass |

## What's done well

- **Determinism proven, not asserted**: stable page ordering (`chrome` pinned, `localeCompare` rest),
  no time/randomness, trailing newline — byte-identical reruns confirmed.
- **Drift wiring is a faithful sibling of `checkLocSummary`** — same `{check:true}` in-memory compare,
  summary line extended, manifest-edit-without-regen fails loudly.
- **Degrade path extends, not forks, the `#asrc` discipline**: the third `grab()` sits in the same
  `Promise.all`; any failure hides the whole exhibit and never sets `data-asrc="ready"` — no fake
  number can reach a visitor, and CI's `waitReady` catches it.
- **Manifest accuracy spot-checks all matched source** — dock controls, /build wizard navs,
  breadboard verbs, and the four keep-rail downloads in `build-keep.mjs`'s actual render order,
  including the report's documented selector corrections.
- **Cascades handled**: loc-summary regenerated for the new tracked file; both approach VR baselines
  regenerated from a clean worktree; CLAUDE.md convention bullet matches what the code does.
- **Deviations documented** in `.claude/reports/param-count-manifest-generator-report.md` and all
  verified intentional — none flagged as issues.

## Recommendation

Fix H1 (two `\0` escapes), verify the file diffs as text, optionally add the L1 clause, then this
merges. The epic-metric decision (L2) belongs on issue #164 after merge, as already planned.

— agentic review gate (piv-review-pr, fresh context); a human makes the final call.
