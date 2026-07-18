# PR #30 Review — fix: PR #16 review lows — registry retry, no-store errors, en-route fixture (#18)

**Verdict: APPROVE** — all three fixes independently traced and verified correct; validation green first-hand; no Critical/High/Medium findings.

_Reviewed with fresh eyes (piv-review-pr + code-reviewer agent). This is the author's own PR in a solo repo, so GitHub blocks a formal `--approve`; the verdict is posted as a review comment instead._

## Summary

Three surgical, independent fixes closing the actionable Low-severity findings from the PR #16 review (issue #18):

1. `system/scenario-data.mjs` — `loadRegistry()` no longer memoizes a *rejected* `/scenarios/index.json` fetch; a `.catch` resets `registryPromise = null` and rethrows, so the next call retries. Success path stays memoized (single fetch/page).
2. `worker/api.mjs` — the single `json()` choke point now sets `cache-control: no-store` on every non-200, so a mistyped route's 404 isn't replayed for 5 minutes. 200s keep `public, max-age=300`; the 405 keeps `allow: GET`.
3. `scenarios/fieldwork/fixtures/{jobs,schedule}.json` — `job-006` flipped to `en-route`, dated the fictional today, seated in tech-04's lane — giving a status that already existed in `copy.json` and `components.css:1823` its first real fixture coverage.

Item 1 (pairwise-distinct verdicts for N>2) is correctly **deferred, not built** — `scenarios/validate.mjs` is untouched, and the deferral trigger (a third scenario) is recorded on #18. All four touched code files read in full; the two committed docs (`.claude/plans/…`, `.claude/reports/…`) match the repo's existing convention.

## Validation (run first-hand, not trusted from the report)

| Check | Command | Result |
|-------|---------|--------|
| Syntax | `node --check` on both `.mjs` | ✅ pass |
| JSON parse | both fixtures | ✅ pass |
| Coherence | `node scenarios/validate.mjs` | ✅ `verdant ✓`, `fieldwork ✓` (104 records), verdicts differ |
| Registry retry | Node memo probe | ✅ `OK: next call retries` |
| Worker 200s | `/api/health`, `/api/fieldwork/jobs` (live `wrangler dev`) | ✅ `200 · public, max-age=300`; `en-route` served (count 1) |
| Worker 404s | `/api/nope/x`, `/api/verdant/__proto__`, `/api/verdant/nope` | ✅ `404 · no-store` |
| Worker 405 | `POST /api/health` | ✅ `405 · no-store · allow: GET` |
| Worker 204 | `OPTIONS /api/health` | ✅ `204`, no cache-control (out of scope, unchanged) |

The `no-store` fix does **not** leak onto 200s, and the 405's `allow: GET` survives — the two things most likely to break with this edit.

## Issues

### Critical / High / Medium

None found.

### Low

**L1 — `...(status !== 200 && {...})` is correct today but silently assumes "non-200 ⇒ don't cache"** — `worker/api.mjs:21`

Spreading a boolean (`{...false}`) is safe — `ToObject(false)` has no own enumerable properties, so it contributes nothing; standard, correct JS, not a bug. The only latent caveat: if a conditional-GET / `304 Not Modified` path is ever added, this idiom would slap `no-store` on the 304 too — wrong for a revalidation response. Not reachable today (no ETag/`If-None-Match` handling; only 200/204/404/405 exist). Informational note for future-you, **no fix needed now**.

## Verification detail

**`loadRegistry()` concurrency (`system/scenario-data.mjs:19-31`)** — traced by promise identity, not just read:
- Synchronous concurrent callers (the `Promise.all([...])` fan-outs in `proto/fieldwork.html` and `proto/verdant.html`) all observe `registryPromise` before the `.catch` runs, so `??=` short-circuits — one shared in-flight fetch, no duplicate requests.
- Success: `.catch` never fires; `registryPromise` stays the resolved promise — memoization preserved.
- Failure: the `.catch` resets `registryPromise = null` and rethrows with no `await` between — no window to observe a stale-but-not-yet-nulled reference; callers holding the settled (rejected) promise are unaffected by the variable reset.
- Both real consumers (`apiBase()`, `scenarios/check.html:52`) handle the rejection (`.catch(() => "")`, `try/catch`) — no floating rejection. **No footgun.**

**`json()` header spread ordering** — every status the Worker actually returns: 200 (no-op spread, `public, max-age=300` preserved), 404 (`no-store`, `extra {}`), 405 (`no-store` then `allow: GET` last, no collision), 204 (bypasses `json()`). Matches the "errors are never cached" comment.

**Fixture edit vs. validator (~224-243) and render path (~55-125)** — field-by-field:
- `today = 2026-07-14`; job-006 `scheduledStart` day inside `today ±14d`.
- `(status==="done") !== (completedAt!==null)` → `false !== false` → no throw; not `overdue`, so `slaDue < today` skipped; `priority` in enum; `schedule.json` date in window.
- **No double-booking**: tech-04's other jobs (`job-019`/07-27, `job-029`/07-18, `job-030`/07-15, `job-044`/07-12) miss 07-14; `slot-day-04`'s other slots stay `null`; `job-006` appears once in `schedule.json`.
- **No region incoherence**: job-006 `south` = tech-04 (Tom Sikora) `south`.
- **Render**: `slaDue === SLA_SOON` ("2026-07-16") trips `atRisk()` (`<=`), so job-006 renders in both the Attention panel (styled `data-status="en-route"` chip + SLA mark) and tech-04's lane; assigned, so correctly absent from "Needs assignment". All fields go through `esc()` — no new XSS surface.

## What's done well

- Each fix is minimal and traces directly to its named finding — no scope creep.
- The `.catch`-reset-rethrow correctly threads promise identity through a shared, memoized, concurrently-called loader — easy to get subtly wrong (reset before vs. after rethrow, racing a newer promise) and it's right.
- `worker/api.mjs` reuses the single `json()` choke point rather than special-casing routes — matches the file's own "one error boundary" convention.
- The fixture choice closes a real gap (a status with copy + CSS + contract coverage but zero fixture) rather than adding speculative surface — YAGNI-respecting.
- Item 1 deferred as an explicit, triggered decision, not silently dropped; `validate.mjs` untouched.
- Zero-dep Node ESM / vanilla JS conventions preserved; no new dependencies.

## Recommendation

**Approve — ship as-is.** No Critical/High/Medium issues; validation green first-hand. The one Low (L1) is purely informational for a hypothetical future 304 path that doesn't exist yet.

---
*Review: full read-through of all 4 changed code files + independent trace of concurrency/spread/fixture-coherence claims + `node scenarios/validate.mjs` + live `wrangler dev` curl battery (all green). code-reviewer agent dispatched for the deep pass; findings converged.*
