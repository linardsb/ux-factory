# PR #91 re-review — delta `ef95f08` ("warn on fully-unmatched askedAxes")

**Recommendation: APPROVE** (posted as a comment — self-approval is blocked on your own PR).

This is a **re-review of the follow-up fix commit only**. The full 8-file #73 feature was reviewed with fresh eyes in `pr-91-review.md` (APPROVE) and is not re-litigated here. The deep pass was run in a clean context by an independent reviewer briefed on this repo's vanilla-JS standards — the stock `code-reviewer` agent is Python/FastAPI-tuned and would only add noise (same call as the first review).

**Delta scope:** 4 lines at `system/factory-intake.mjs:390-393` — a `console.warn` when a host passes a non-empty `askedAxes` that matches no axis, sitting in front of the pre-existing full-wizard fallback.

---

## Validation

Run in a **clean worktree at `ef95f08`** — the main working tree is contaminated by a *parallel session's* uncommitted `system/components.css` edit, which throws a false local `system-graph` drift (the original review flagged the same). The committed PR content is clean:

| Check | Result |
|---|---|
| `token-lint` | ✓ 61 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `loc-summary --check` | ✓ 3 groups — no drift |
| `system-graph --check` (isolated committed HEAD) | ✓ 61 tokens · 28 consumers · 304 edges — no drift |
| Parse — `factory-intake` / `intake-beat` / `instance` | ✓ all import; `factory-intake` exports `SCENARIOS, initIntake` |
| **Runtime — home in headless Chromium** | ✓ progress `"1 / 3"`, **0 console output** (the warn is correctly silent under valid config) |

**No side effect on any shipped page — verified affirmatively.** All three production callers pass a config the guard never trips: `intake-beat.mjs` passes a valid 3-axis array (`["density","rewardType","frequency"]`); `factory.html` auto-inits with `askedAxes=null`; `instance.mjs` passes none. In every current path `askedAxes && !asked.length` is **false** → zero console output at rest → no VR-baseline impact, no regression to the approved feature.

---

## Issues by severity

**Critical / High / Medium:** none.

### Low (all non-blocking — out-of-declared-scope or out-of-contract inputs no current caller produces)

1. **Partial-typo `askedAxes` stays silent.** `system/factory-intake.mjs:390`
   The guard fires only on a *total* miss. `["density","rewardTyp"]` (one valid, one typo) leaves `asked.length === 1`, so no warn — and the wizard silently drops the typo'd axis. That's the same silent-misconfig class the commit set out to eliminate, just narrower, and genuinely outside the title's "fully-unmatched" scope. **Heads-up for the #74 build-instance pass** (generated per-company `askedAxes` is exactly where a typo becomes likely): warn per-axis on any `askedAxes` member not in `full.map(a => a.axis)`.

2. **A non-array truthy `askedAxes` (e.g. the string `"brand"`) now throws at `askedAxes.join(", ")`**, blanking the page — where before it silently fell back to the full wizard. `system/factory-intake.mjs:391`
   `askedAxes` is documented `array | null` (line 208–210), so a string is a caller contract violation **no current caller makes**; per CLAUDE.md's "no error handling for impossible scenarios" a fix is **optional**. It is, though, a narrow crack in the commit's own "no throw — never blank a shipped page" rationale. The convention-match if you want it closed: an `Array.isArray(askedAxes)` boundary throw in `initIntake` (beside `assertScenarioConfig`, ~line 212) — a named error, not a cryptic mid-render `TypeError`. (`full.map(...).join()` is safe — `full` is already validated at line 389; `active` is always a valid key.)

3. **Nit — the warn lives in the per-render `renderWizard`.** `system/factory-intake.mjs:390`
   `renderWizard` runs on mount, Back, Next, and scenario toggle, so a genuinely misconfigured host re-logs the same warning on every navigation rather than once. Only manifests in an already-broken config (loud is arguably fine there), and per-render placement is defensible because `active` changes via the toggle. Not worth changing unless folded into a boundary check (see #2).

---

## What's good

- **warn-not-throw is the right divergence from `derive.mjs`** (which *throws* on unknown density/reward/frequency at `derive.mjs:29–35`): here a safe fallback exists (the full wizard renders), so warning beats blanking for the axis-mismatch case.
- **Correct guard for every real case** — silent for `null` (full wizard) and for the normal subset; fires only on a non-empty-but-fully-unmatched array, exactly as the title claims. The message is honest and specific: it names the offending axes, the scenario's available set, and the recovery.
- **Surgical + honest** — 4 lines, one spot, no adjacent churn; a dev-facing `console.warn`, so the honesty contract (reader-facing surfaces) is untouched.

---

## Recommendation

**APPROVE.** The delta does exactly what it claims for its declared scope, is verified to have zero effect on all three production callers and no VR-baseline impact, and validation is green on the clean HEAD. The three findings are all LOW edge cases (out-of-declared-scope, or out-of-contract inputs no current caller produces) — none blocks merge. Item 1 is a genuine heads-up worth carrying into **#74**.

**For the human merging** (unchanged from the first review): this is a **stacked PR** — base is `feature/v3-hero` (PR #85), not `main`. Merge #85 first, then retarget/rebase #91 to `main`.

_Re-reviewed 2026-07-23. Gates green (clean worktree @ `ef95f08`); runtime observed in Chromium. Fresh-eyes deep pass by an independent clean-context reviewer._
