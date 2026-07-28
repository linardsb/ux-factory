# Code Review — PR #161 · `/build` joins the footer site index (#148)

**Branch**: `feature/build-footer-site-index` → `main` · **Head**: `a5fdc5a`
**Reviewed**: 2026-07-28, fresh context, in an isolated worktree at the PR head
**Verdict**: **APPROVE** — with two prose corrections recommended before merge (neither is functional,
neither needs re-validation)

---

## Summary

One footer item, and an honest accounting of what one footer item costs. The diff is four small live
files plus 16 regenerated baselines, and the claims it makes about itself hold up when measured
independently.

The ticket's grievance was real and the fix is the minimum that closes it: `client.neutral.config.js`
calls the footer "the full site index" while `/build` was reachable from exactly two pages. It now has
a route from every page that renders chrome.

Two things this PR does that raise the bar rather than meet it:

- **It corrected the ticket instead of obeying it.** #148 says "nav is a five-item set today". It
  isn't — the nav is three items plus the Contact CTA, and the five-item set is the footer's `Site`
  column. #148 also explicitly delegates the choice ("decide nav vs footer-index vs both; /build may
  not belong there"), so footer-only is inside the ticket's scope, not a reduction of it, and the
  reason given (#71/D6) is the right one.
- **The baseline count was measured, not inherited.** #148 and both live claim sites said "all 20".
  The real number is 16 — the two proto pages load neither `site.js` nor a client config. Both claim
  sites now say 16 *and* name the exception.

---

## Issues

### Medium — `CLAUDE.md:80` still says "both links in resolve"; there are now three

`tooling/build-checks.mjs · build-journey.mjs` map entry, last clause of the `build-journey`
sentence:

> …the dock mid-flow, and that **both links in** resolve. Operator-run, not in CI (epic #134,
> tickets #137, #138)

Block [17]'s first loop now clicks **three** rows (`tooling/build-journey.mjs:677-680`), and my own
chromium run prints nine assertions from that loop. So "both" is false as of this diff, and the
trailing ticket list omits `#148`.

This is the same copy-contradicts-state defect the PR exists to fix, one line away in the same file
it already edited (`CLAUDE.md:49`). It survived because the plan's sweep grepped for *"footer index"*
and *"20 baselines"* phrasing — this line contains neither.

**Fix** — `CLAUDE.md:80`: `both links in resolve` → `all three links in resolve`, and
`(epic #134, tickets #137, #138)` → `(epic #134, tickets #137, #138, #148)`.

**Heads-up before you apply it:** the unmerged `fix/portal-origin-guard-157` branch (`94efe2d`)
rewrites this *same line* (8 groups → 9, plus the `origin.mjs` entry on `:59`). Whichever lands
second resolves by hand — the two edits touch different clauses of the line, so it is a
reconcile-not-rethink conflict.

### Low — the report's assertion count for block [17] is off by 3 at both ends

`.claude/reports/build-footer-site-index-report.md:47-48`:

> block [17] gained a third row, taking the block from **11 to 14** assertions

Counting the `t()` calls: the first loop asserts 3 per row, the JS-off loop 1 per row over 2 rows.
Before: 2×3 + 2 = **8**. After: 3×3 + 2 = **11**. My chromium run prints exactly 11 lines under [17],
which pins the post-change number empirically. The delta of 3 is right; both absolutes are 3 too high.

Cosmetic, and it changes no gate. Flagged only because it sits in the one paragraph whose job is
counting, in a report whose surrounding claims (+34px / +37px / four untouched) are exact.

**Fix** — `.claude/reports/build-footer-site-index-report.md:47`: `from 11 to 14` → `from 8 to 11`.

---

## Validation — run independently against the PR tree, not taken from the body

| Gate | Result |
|---|---|
| CI `verify` | ✓ pass (18s) |
| CI `visual` | ✓ pass (48s) |
| `node --check` × `client.neutral.config.js`, `build-journey.mjs` | ✓ |
| `agent-layer/gen-loc-summary.mjs --check` | ✓ exit 0 — 3 groups, no drift |
| `tooling/drift-check.mjs` | ✓ exit 0 — all 8 checks |
| `tooling/build-checks.mjs` | ✓ exit 0 — all 8 groups (group 8's SDK-free invariant genuinely proven: the review worktree has no `portal/node_modules`) |
| `tooling/build-journey.mjs chromium` | ✓ **111 passed · 0 failed**, block [17] green on all three link-ins |
| Baseline audit (re-measured from the PNGs) | ✓ see below |

**The baseline claim, re-measured rather than trusted** — every chrome-bearing baseline, old height →
new height, straight off the committed files:

- **+34px on all eight neutral shots · +37px on all eight saulera shots · width unchanged at 1280**
- `proto-verdant-{neutral,saulera}`, `proto-fieldwork-{neutral,saulera}` — **byte-identical** (md5 match)

That is exactly the commit message's claim, and the uniformity is what makes it evidence: one extra
`.footer-col li` at each pack's line height, on every page that has a footer, nothing else anywhere.

**Also checked, nothing to report:** no page carries JSON-LD `SiteNavigationElement`, so no structured
data disagrees with the rendered footer · all 11 pages loading `client.neutral.config.js` were
enumerated (the report's manual walk covers the three outside the VR set — `handoff`,
`agentic-ui-study`, `instance` — and that list is complete) · `.footer-col ul`/`li` carries no
`nth-child` or count-dependent rule, so a sixth item is structurally free · `.site-footer
a[href="/build"]` is unambiguous on `/approach.html` (no other `/build` reference in its static
markup) · the config entry needs only `label` + `href`, and `key` is correctly omitted (nav-only) ·
`nav` and `footer.columns` are independent keys in `site.js`, so the footer edit cannot touch nav
rendering.

**On the JS-off omission** — correct, and for the reason written into the file. `site.js` is a plain
synchronous classic script (`approach.html:215`), so with JavaScript off there is no header, nav *or*
footer on any page. The footer link is exactly as available as the nav is; the two static links in
remain the JS-off route. (That same sync-script fact is also why `link.isVisible()` — which does not
auto-wait — is safe here: the chrome exists before `load` fires. Worth knowing if the chrome loading
ever moves to `defer` or a module; it would go red, not silently green.)

---

## What's good

- **The audit is the deliverable.** "16 moved, not 20" was a number that could have been copied
  forward from the ticket and wasn't — it was measured, the exception was named, and both live claim
  sites were corrected. Height-delta uniformity as the proof that nothing else leaked in is the right
  instrument, and it reproduces.
- **The nav was left alone on principle, not on preference.** Adding `/build` there would have
  silently reversed #71/D6. Flagging that rather than drifting past it is exactly what CLAUDE.md asks
  for, and the reasoning is recorded in the config comment where the next reader will hit it.
- **The AMENDMENTS entry is on the plan that authored the non-goal**, not on every plan that repeated
  the number in passing. That is a defensible, consistently applied boundary — historical docs stay
  historical.
- **The deferral was honoured in both directions.** #138 deferred this so its "eight PNGs moved" claim
  stayed true; this PR pays the cost as a headline instead of burying it in someone else's diff.
- **#160 is disclosed, evidenced and not fixed here.** A deployed private instance renders chrome
  pointing at pages the deploy dir doesn't contain — two epics older than #148, made one entry worse
  by this PR, filed with its evidence rather than smuggled into scope. The issue exists and is open;
  I checked.
- **The new [17] row asserts by clicking, and the reason it isn't in the JS-off loop is written down.**
  A future reader doesn't have to reconstruct why one of three rows is missing.

---

## Recommendation

**Approve.** No critical or high issues; every gate green, including CI and my own independent runs;
the change matches the ticket's intent and corrects the ticket where the ticket was wrong.

Fix `CLAUDE.md:80` before merge — it is a two-word edit and the alternative is shipping a PR about a
false claim that leaves a false claim in the same file. The report's count is optional polish. Neither
touches a gate, so neither needs re-validation.
