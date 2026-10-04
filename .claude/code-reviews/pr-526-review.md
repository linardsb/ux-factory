# PR #526 review — the trace player labels each card Said or Did (#496)

**Head** 0e3ce847ef89632770f14103880a33086e4b3c4a · **Base** main @ `c35c39a7a01d75b87965ea3841b67fcdf2f663ac` (first round; base equals current origin/main)

**Recommendation: approve (advisory comment; solo repo, self-approval not available).** No critical, high or medium issues. One low finding, which is the PR's own open question Q3 restated as an on-page wording risk. Squash on merge, as the PR body asks.

## Summary

`system/trace-player.mjs` prepends a `Said` (text step) or `Did` (tool step) label to every card, makes it the card's accessible name via `aria-labelledby`, adds a header sentence citing Chen et al. 2025, and splits each act head into `N steps · S said · D did`. All DOM writes go through the existing `el()` helper with `textContent`; no `innerHTML`. A new operator-run driver, `tooling/trace-journey.mjs`, checks /trace.html and /roundtrip.html across three engines with every expected value taken from `parseTrace` over the served trace.

## Issues

### Low

**F1** `system/trace-player.mjs:38` (`KINDS_NOTE`) — the on-page sentence says Did cards "are calls it actually made". On /roundtrip, pack-seed-verdant's denied `Bash` call is labelled Did, and on /factory the studio ledger (`replay-driver.mjs:710`) files the same kind of event as `refused`. A reader can see one refused call called "Did" in the trace panel and "refused" in the ledger. The PR documents the labelling as Q3, so this is not an undocumented deviation; the point here is that the header sentence, not only the label, is the exposed claim under the honesty contract. Fix options for the owner: answer Q3 with a third label (touches `KIND_LABEL`, journey [4]/[5]/[7]), or reword the note to "calls it made (including ones the fence refused)". Not blocking.

## Validation (all observed in a clean worktree of 0e3ce84)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 51 groups pass` |
| `node tooling/drift-check.mjs` | `✓` all 15 passes (after `npm ci` in tooling/icons, style-dictionary, visual-regression; first run red only on the missing install) |
| `node tooling/token-lint.mjs` | `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `BASE=<private port> node tooling/trace-journey.mjs all` | 37 passed, 0 failed on chromium, firefox, webkit |
| Mutation M1 (swap `KIND_LABEL`), chromium | 24 passed, 13 failed; the five new `[7]` parseTrace checks red. File restored, `git status` clean |
| CI (`gh pr checks 526`) | verify, audit, codeql, CodeQL, visual, gates-green: all pass |

Not run by this review: `studio-journey`, `instance-journey`, `vt-verify`, VoiceOver. The report lists the same items as not run, with reasons.

## Numbers pass

- 37 assertions per engine: derived 18 per page ([0]1 [1]1 [2]1 [3]1 [4]2 [5]2 [6b]1 [7]1+4×2) × 2 + [8] = 37; my run printed 37 (observed).
- First-version driver 29 = (14 × 2) + 1; M0 "18 failed, 11 passed" and M3 "2 failed, 27 passed" both sum to 29 (derived, consistent).
- Trace totals: demo-notice 23 steps = 8 text / 15 tool; pack-seed-verdant 14 = 6 / 8; roundtrip Plan act 2 / 4 (observed, `parseTrace` over the committed JSONL).
- M1 "5 of 8 acts": three acts are 1 text / 1 tool (demo gate, demo implement, verdant gate), so a swap is invisible there and 5 remain (derived), and my M1 run reddened exactly those 5 (observed).
- Baseline heights 6773→6908, 7086→7265, 6762→6896 (observed, `sips` on origin/main vs head).
- The 25% / 39% figures and the arXiv id match my reading of Chen et al. 2025; the paper was not re-fetched in this review (expected, not observed).

## What is good

- The plan error in `[7]` was caught by mutation, fixed by reading `parseTrace` rather than the player's own table, and logged as an amendment. That is the correct fix: only an independent source can see a consistently wrong table.
- `[6b]` covers the accname gap (an `aria-hidden` labelledby target still names the element), with M3 proving `[5]` alone stays green against it.
- The driver refuses to run against a server that is not serving this tree's player, which addresses the stale-serve problem directly.
- No new CSS: `.card-kicker` is reused, and every mount that renders the player (trace.html, roundtrip.html, factory.html, instance.html) loads `portfolio.css`, so the label is styled on all four.
- Page-unique label ids via a module counter handle two players on one page.
