# PR #19 Review — Round 2 (fix commit `8e3c899`)

**Verdict: APPROVE.** All five round-1 findings are resolved in the code at HEAD — verified in the
source, not taken from the fix summary — and the fix diff introduces no new issues. Validation is
fully green, including a live regeneration proving the handoff pack is byte-stable.

Reviewed with fresh eyes in an isolated worktree at `8e3c899` (agentic gate — `piv-review-pr`
round 2; deep pass by the `code-reviewer` agent, validation run independently by the reviewing
session). Scope: the fix commit against the round-1 report
(`.claude/code-reviews/pr-19-review.md`); the round-1 approval of everything else stands.

## Round-1 findings — verification

| # | Finding (severity) | Status | Evidence |
|---|---|---|---|
| 1 | fw-panel titles not headings (Medium) | **Resolved** | All three panels now `<h3 class="fw-panel-title">` (`proto/fieldwork.html:145,149,155`); hierarchy sane (page `<h1>` → board `<h2>` → panel `<h3>`, no skips); new `.fw-panel-title` rule inherits the eyebrow styling, no orphaned selectors for the old span |
| 2 | `priority` ungoverned (Medium) | **Resolved** | Author call recorded: `priority` is a real middle tier. `priorityLabels` in `scenarios/fieldwork/copy.json:20`; enum check in `COHERENCE.fieldwork` (`scenarios/validate.mjs:218-219`) — negative-tested live: a bogus value fails naming the exact record; per-tier `fw-priority` variants use existing semantic tokens only; page renders `esc(c.priorityLabels[j.priority] ?? j.priority)`; no fixture data changed, consistent with the author call |
| 3 | `screen-header.md` `<h1>` prose stale (Low) | **Resolved** | Both prose passages amended to "top-level heading within its frame" — now accurate for what ships; `handoff/verdant/pack.json` diff is exactly those two lines |
| 4 | `"ok"` chip label hardcoded (Low) | **Resolved** | `okLabel` in `scenarios/verdant/copy.json:20`, read like its siblings, still through `esc()` |
| 5 | Duplicated fictional today (Low) | **Resolved as disposed** | Comment added at `TODAY`/`SLA_SOON` (`proto/fieldwork.html:60-61`); alignment left as-is — exactly the round-1 disposition (non-blocking) |

## Validation (at `8e3c899`, fresh worktree)

| Check | Result |
|---|---|
| `node scenarios/validate.mjs` | ✓ verdant 43 records · fieldwork 104; verdicts differ; new priority enum active |
| Negative test of the new enum check | ✓ bogus tier fails with `job-001 priority "bogus-tier" not in [urgent, priority, routine]`; reverted, suite green again |
| `node agent-layer/gen-token-css.mjs --check` | ✓ 46 contract + 53 pack tokens, no drift |
| `node agent-layer/gen-handoff.mjs` ×2 | ✓ regenerated live (after `npm install` in `tooling/style-dictionary`) — byte-identical to the committed `handoff/verdant/`, `git status` clean |
| Token lint (hex/rgb/hsl over `components.css` + `proto.css`) | ✓ zero literals — the two new `fw-priority` variants use `--color-fg` / `--color-fg-muted` |
| XSS discipline on the new render path | ✓ `priorityLabels` lookup passes through `esc()` like every other fixture-derived value |

## New issues in the fix diff

None. Specifically checked: token literals in the new CSS, colour-never-alone on the three priority
tiers (distinct label text per tier — holds), orphaned selectors from the span→h3 change, escaping
on the new label lookup, heading-level sanity, and scope creep in the spec/pack diff (prose-only).

## What's good

- The priority fix governs the vocabulary end to end — copy, validator, CSS, render path — rather
  than just styling the missing variants; the negative-tested enum check means the seam round 1
  flagged can't silently reopen for this field.
- The `.fw-panel-title` rule inherits the eyebrow styling from `.fw-panel-head` instead of
  duplicating values — the visual is preserved with a three-line rule.
- The fix summary comment on the PR matches what's actually in the commit, item for item.

## Recommendation

**Approve.** The agentic gate is green: round-1 findings closed, no new issues, validation fully
green. Remaining before merge is process, not code: this PR is stacked on #16 — retarget to `main`
after #16 merges — and the round-1 process note stands (the epic snapshot `4a3997b` carries
ticket #3/#7 work that should get its own gate somewhere). A human now reviews and merges.
