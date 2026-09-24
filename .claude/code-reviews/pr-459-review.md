# PR #459 review — `choice` through the chain (#309)

**Head** a1f826841a25f1b7158ed14aa210416b889f51e4 · **Base** main @ `8eb35a9c4c339027015049b1a1a7441c0850ef3c`

**Recommendation: approve.** No critical, high or medium issues. One low comment-drift fix, optional before merge.

Round 1 (no prior review), base equal to current `origin/main`, so the guarantees pass does not apply.

## Issues

### Low

**F1** `system/catalog.mjs:67-70` — the comment contradicts itself after the edit. The PR changed "3/22" to "3/23" in the middle of the sentence but left "3 of 25 today; the 22 absences" before it, so one comment now states two different counts. The history line also stops at "#305's primitives to 22". The report's "`git grep "3/22"` → only tripwire notes" check could not catch it, because the prose form never contains the string `3/22`.
Fix: "3 of 26 today; the 23 absences" and "…then #301, #303, #305 and #309's primitives to 23".

No other findings. The code-reviewer agent reported no Medium+ issues; its two Low notes describe documented decisions (the fieldset/legend gap Q2, and the saulera handling in case 14), not defects.

## Validation

All observed in a clean detached worktree at `a1f8268`, after `npm ci` in `tooling/icons` and `tooling/style-dictionary`.

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓ all 42 groups pass` |
| `node tooling/drift-check.mjs` | `drift-check ✓` all 14 legs |
| `gen-loc-summary.mjs --check` | `loc summary ✓ 3 groups — no drift` |
| `gen-param-count.mjs --check` | `param count ✓ 121 controls — no drift` |
| `catalog-journey.mjs all` (private port 4893, `choice.md` curl-verified 200) | chromium 72 · firefox 71 · webkit 71 passed, 0 failed |
| CI on head | CodeQL, audit, codeql, gates-green, verify, visual: all pass |

The first build-checks run went red on group 41 (`tooling/icons/node_modules` missing in the fresh worktree). That was the environment, not the PR: it went green after `npm ci`.

## Numbers pass

| Figure (PR body / report) | Provenance | Checked |
|---|---|---|
| `all 42 groups pass` | observed | reproduced |
| catalog-journey 72/71/71 | observed | reproduced exactly |
| importer `66 0` ×3, six `choice` candidates at 0.083 | observed | `git diff --numstat` gives `66 0` on all three; 6 `choice` entries, all `0.083` |
| "no verdict or top candidate moved" | observed | top candidate compared across all 8 candidate lists in each of the 3 JSONs, main vs head: 0 moved |
| loc 32,300 → 32,400, 40,700 → 40,800 | observed | `--check` no drift on head |
| "~30% taller" (26 vs 20) | derived, labelled as such in the report | 26/20 = 1.30 |
| `33 passed` VR ×2 | observed (Docker) | not re-run; CI `visual` green on head |
| mutation table M1–M5, C1–C5 | observed per report | not re-run |

## What is done well

- Radio exclusivity is the native `name`, with no script, so the component cannot disagree with the engine. Case 14's constant-name control (two radios in different groups both staying checked) is the assertion that can see a template writing one fixed name, and the report shows it going red under that mutation.
- The CSS uses only tokens and tints the real input through `accent-color` instead of redrawing it. The disabled state has one source: `:disabled` on the input, reached through a sibling selector.
- The input is nested in its label with no minted id, so two choices on one screen cannot collide.
- The spec names the fieldset/legend gap and does not cover it with an ARIA role.
- The owner decisions (Q1/D1, Q2) and both deviations are flagged in the PR body.

## Not reviewed

- The manual `/components#choice` read under each pack (the PR says it was not run). Case 14 covers the same states in computed style.
