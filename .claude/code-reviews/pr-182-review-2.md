# PR #182 Review (round 2, post-#183/#184) — compare slider (#170)

**Verdict: REQUEST CHANGES** — not for the code, which is approve-quality, but because the branch is now stale and **CONFLICTING** with main: #183 (⌘K palette) and #184 (home uplift #169) merged after this PR was cut, and six files conflict in a way where "pick a side" is wrong on every one of them. Fresh-context review at head `630eb22` vs current main `d123806`, validated in an isolated worktree; deep pass by the code-reviewer agent.

## The blocker (High)

**H1 — Branch conflicts with main; the conflicted artifacts must be *regenerated on the merged tree*, not resolved by choosing a side.**
A dry-run merge of `origin/main` conflicts in exactly six files:

| File | Why neither side is correct |
|---|---|
| `system/param-count.json` | main is at **69** (post-#183/#184); this PR's regenerated 65 predates both. Merged truth ≈ 72 — regenerate. |
| `system/loc-summary.json` | main is at 94 files / 26,000 lines; this PR's 93 / 25,700 is stale. Regenerate after staging. |
| `baselines/approach-{neutral,saulera}.png` | Both sides re-captured them. Main's carry the ⌘K chrome hint **and** the 69-count render; this PR's carry neither. Must be re-captured on the merged tree (delete first — memory: sub-perceptual skips). |
| `baselines/roundtrip-{neutral,saulera}.png` | Same: main's have the ⌘K hint, this PR's have the slider — only a fresh capture has both. |

Note the current green `visual` check proves nothing about the merged state: it ran the branch's own render against the branch's own baselines. After the merge + regeneration, re-run `update:docker` and expect approach ×2 + roundtrip ×2 to churn (now with hint + slider + 72 count together).

Also worth knowing: this branch's `portfolio.css` contains #168's entire `.nav-palette-hint` block (it leaked in from the shared working tree — the diff vs the old base shows it as this PR's addition). It happens to be byte-identical to what #183 merged, so git auto-merges it cleanly and no action is needed, but it's why the report's "stage by explicit path" discipline didn't fully isolate the ticket: the shared file itself carried the other session's hunks.

## Code findings (unchanged from the committed round-1 review, independently re-verified)

The two Mediums in the committed `pr-182-review.md` were both **CONFIRMED** by a fresh code-reviewer pass. Since H1 forces a new commit on this branch anyway, fold the fixes in now rather than deferring:

- **M1 — overlay can silently clip** (`portfolio.css` `.cmp-base`/`.cmp-over`): `.cmp-over` is `absolute; inset:0` while the base alone defines the box height; an import with a taller type/spacing scale clips the overlay's bottom under `overflow:hidden` with no cue. Fix: grid-stack the layers (`.cmp-layer { grid-area: 1/1 }`, drop `absolute` from `.cmp-over`).
- **M2 — chip colour can disagree with its printed hex** (`brand-import.mjs` `compareSection`/`buildSample`): pin maps are built only over vetted keys, but `buildSample` hardcodes four swatch tokens; an import missing one leaves it unpinned on both layers, so the chip follows the live dock pack while the `<code>` text prints the neutral literal. Fix: pin the union of vetted keys + the four specimen tokens, neutral-literal fallback on both sides.

### Low

- **L3 (new)** — `concreteValue()` returns `""` when an alias chain bottoms out on a non-`$value` node (`brand-import.mjs:173–183`). Unreachable with today's contract (no such alias exists), but a silent empty string breaks the file's own named-error convention — fall back to `cssValue($value)` of the unresolved alias, or throw naming the token.
- **L1/L2** from round 1 (tag DOM order after layer content; drag never focuses the handle) stand as noted there.

## Validation (isolated worktree at PR head)

| Check | Result |
|---|---|
| `node --check` + Node-import smoke (3 modules) | ✓ |
| `gen-param-count --check` | ✓ (65 — correct *for this branch*, stale vs main, see H1) |
| `tooling/drift-check.mjs` | ✓ all groups |
| `tooling/build-checks.mjs` | ✓ all 10 groups |
| CI `verify` + `visual` | ✓ on the branch — **not valid for the merged state** (H1) |
| Dry-run merge with `origin/main` | ✗ 6 conflicts |

## What's good (echoing round 1, re-verified fresh)

- The primitive is clean: one write point (`setPos`) keeps `--cmp-pos` + both ARIA values atomic; Node-import-safe; labels via `textContent` only.
- Security discipline held: `vetTokens` is the single gate for visitor values on both the comparison and "Wear it" paths; nothing visitor-controlled reaches `innerHTML` or an unvetted style write.
- `.cmp-*` CSS is fully token-disciplined; the round-trip mount reads only the committed diff.
- All three documented deviations (concrete-literal pins · four baselines · flex-wrap hex cells) are sound calls, properly reported.

## Requested changes

1. Merge `origin/main` into the branch; resolve `portfolio.css`/`param-manifest.json` normally (they auto-merge), then **regenerate** `param-count.json` + `loc-summary.json` on the merged tree (mid-merge drift-check false-positive caveat: complete the merge first).
2. Delete + re-capture the four conflicted baselines via `update:docker` from a clean worktree; verify approach shows 72 and roundtrip shows hint + slider.
3. Fold in the M1 + M2 fixes (and L1–L3 if cheap) in the same push.
4. Re-run drift-check, build-checks, and the cross-engine scratchpad check on the merged tree.

(Solo-repo note: GitHub blocks formal reviews on one's own PR; this verdict is posted as a comment.)
