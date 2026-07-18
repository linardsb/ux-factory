# Feature: PR #16 review Lows — registry retry, no-store errors, en-route fixture (#18)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, record shapes, and the fixture coherence rules. Import from the right files.

## Feature Description

Close out GitHub issue #18 — the four Low-severity findings deferred from the PR #16 review (`.claude/code-reviews/pr-16-review.md`). Three are acted on, one is explicitly deferred with a note:

- **Item 2 (fix):** `system/scenario-data.mjs` memoizes a *rejected* registry fetch for the page's life — a transient failure of `/scenarios/index.json` sticks until reload. Clear the memo on rejection so the next call retries.
- **Item 3 (fix):** `worker/api.mjs` error responses share `cache-control: public, max-age=300` with data responses, so a mistyped 404 is cacheable for 5 minutes. Non-200s become `no-store`.
- **Item 4 (decided — fix):** `statusLabels["en-route"]` in `scenarios/fieldwork/copy.json` has no matching job, and `.fw-status-chip[data-status="en-route"]` (`system/components.css:1823`) never renders. The dispatch board exists since #8, so the status vocabulary gets real fixture data now: one job flipped to `en-route` on the fictional today and seated in its tech's lane, mirroring how the existing `on-site` job is modeled.
- **Item 1 (deferred — do NOT build):** the verdicts-must-differ check in `scenarios/validate.mjs:278-280` proves "not all identical", exact for N=2 but weaker for N>2. Stays as-is until a third scenario lands; record that decision as a comment on issue #18. **No code change for this item.**

## User Story

As a technical reader inspecting this repo's craft
I want the review's non-blocking findings visibly resolved or explicitly dispositioned
So that the public Worker behaves correctly under failure, and the board's full status vocabulary is backed by real fixture data — the repo's premise is inspectable engineering.

## Problem Statement

Issue #18 tracks four known Lows. Two are latent correctness papercuts on shipped surfaces (sticky failed registry fetch; 5-minute-cacheable 404s on the one public endpoint). One is a data gap: the board's `en-route` status exists in copy, CSS, and the DataContract vocabulary but no fixture ever exercises it. One is a premature generalization the project has decided not to build yet.

## Solution Statement

Three surgical edits (one function, one helper, two fixture records) plus an issue comment. No new files, no new checks, no schema changes.

**Item 4 decision rationale:** the user directed "decide now — add one en-route job or record the intent". Decision: **add the job.** The board landed in #8, the chip CSS and copy label already exist, and the precedent is exact — M2 in the same review was fixed by giving "Needs assignment" one real record (`job-052`, `techId: null`), and the validator now guards it (`validate.mjs:240-242`). Same move here: the fictional moment (~17:00 on 2026-07-14, while tech-01 is on-site at Two Bridges Hotel 16:30–18:00) gets one tech en route to a callout. Fixtures are hand-authored fictional data (labeled as such) — editing them does not touch the honesty contract, which governs agent-output traces.

## Out of Scope / Non-Goals

- **Not building item 1** (pairwise-distinct verdicts for N>2). Deferral trigger — a third entry in `scenarios/index.json` — is recorded on issue #18, nowhere else. No code, no TODO comment churn.
- **Not adding** a validator guard for "at least one en-route job" (the Needs-assignment guard at `validate.mjs:240-242` was review-mandated; this wasn't).
- **Not changing** the 204 OPTIONS response in `worker/api.mjs` (doesn't use the `json()` helper; no body, no cache-control today — leave it).
- **Not touching** `job-052` (the M2 unassigned exemplar), the 07-15/07-16 schedule slots, verdant fixtures, `copy.json` (already has the `en-route` label), or `worker/fixtures.mjs` (imports the JSON files directly — record edits flow through automatically).
- **Not renumbering or adding records** — item 4 is a field edit on an existing job, not a 65th record.

## Feature Metadata

**Feature Type**: Bug Fix (review follow-ups)
**Estimated Complexity**: Low
**Primary Systems Affected**: `system/scenario-data.mjs` (shipped loader), `worker/api.mjs` (public mock API), `scenarios/fieldwork/fixtures/` (jobs + schedule)
**Dependencies**: none new. Validation uses `wrangler` (already in `worker/`) and Node ≥18 (`fetch` built-in).

## Related Work

**Implements**: linardsb/ux-factory#18 (PR body: `Closes #18`)   ·   **Epic**: epic #1 surfaces, but #18 is a review-follow-up issue, not an epic ticket — no engineering-plan inheritance beyond the architecture rules already in CLAUDE.md.

**Back-references**:

- `.claude/plans/scenario-packages-worker-mock-api.md` — the plan that built all four touched surfaces (ticket #4, PR #16)
- `.claude/code-reviews/pr-16-review.md` — the review that produced these findings; H1/M1/M2 already fixed in `60baa89`

**Forward-references**:

- (none yet — item 1 revisit lives on issue #18)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/scenario-data.mjs` (all 55 lines) — Why: item 2 target. `loadRegistry()` lines 17-25 holds the `registryPromise ??=` memo; note the header comment explains `source` is load-bearing for the honesty contract, and `apiBase()` (line 27-30) swallows registry failure via `.catch(() => "")` in `loadCollection` — that behavior stays.
- `worker/api.mjs` (all 48 lines) — Why: item 3 target. `HEADERS` (11-15) carries the shared `cache-control`; `json()` helper (17-18) is the single choke point — every non-200 (404s at 30/40/42/46, 405 at 27) flows through it. The 405 passes `extra = { allow: "GET" }`, so `...extra` must stay last.
- `scenarios/fieldwork/fixtures/jobs.json` — Why: item 4 target. 64 records (grew from 60 since the review — job-061..064 added unassigned during board work; expected, don't "fix"). Record shape: see job-001/job-006 below.
- `scenarios/fieldwork/fixtures/schedule.json` — Why: item 4 target. 30 records, one per tech per day over 2026-07-14/15/16, each with exactly 3 slots `{start, durationMin, jobId}` (null when empty). `slot-day-04` = tech-04 on 2026-07-14, all three slots empty.
- `scenarios/validate.mjs` (lines 144-175 generic checks; 224-243 fieldwork coherence) — Why: the constraints the fixture edit must satisfy. Jobs: `scheduledStart` within ±14d of `head.today` (2026-07-14, from `scenarios/fieldwork/brief.md` head); `status === "done"` ⟺ `completedAt !== null`; `overdue` ⟹ `slaDue < today`; priority enum. **No status enum for jobs** — `en-route` needs no validator change. Generic walk: any `<thing>Id` must resolve (slot `jobId` → jobs ids); schedule dates within `[today, today+7]`.
- `proto/fieldwork.html` (lines 62-64, 84-125) — Why: proves where the new status renders. `TODAY = "2026-07-14"`, `SLA_SOON = "2026-07-16"` (`atRisk` uses `slaDue <= SLA_SOON`). Styled status chip (`statusChip`, 88-89) renders only in the "Needs attention" / unassigned panels via `jobRow`; lane slot chips (112-116) render the plain label text `statusLabels[j.status]`. This is why the task also tightens `slaDue` — it puts the job in the attention panel so the `data-status="en-route"` chip CSS actually renders.
- `system/components.css:1823` — Why: the pre-existing `.fw-status-chip[data-status="en-route"]` rule this change finally exercises. Read-only; do not edit.

### New Files to Create

None.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- Issue #18 (`gh issue view 18`) — the ticket; items quoted in Feature Description.
- `.claude/code-reviews/pr-16-review.md` — original findings with line references and the curl battery this plan re-runs.
- CLAUDE.md "Ground rules" — token discipline (not touched here), error convention (plain `Error`, path-naming — matches the existing `loadRegistry` throw), "Deploy = commit the artifacts".

### Patterns to Follow

**The one-choke-point response helper** (`worker/api.mjs:17-18`) — extend in place, don't add a second helper:

```js
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
```

**The on-site precedent for item 4** — `job-032` is the model: status `on-site`, `scheduledStart` on the fictional today (16:30), assigned (`tech-01`), seated in that tech's today schedule record (`slot-day-01`, slot `{start: "16:30", durationMin: 90, jobId: "job-032"}`). The en-route job copies this modeling one hour later.

**Comment style** — this repo's comments state the constraint the code can't show, often citing the driving decision (`// no-store: source: "worker" must mean the API answered NOW`, `scenario-data.mjs:38-40`). One short line each, same register.

---

## IMPLEMENTATION PLAN

All three code phases are independent of each other (different files, no shared state); they're sequenced only for tidy commits. Phase 4 depends on all of them.

### Phase 1: Registry retry (item 2) — `system/scenario-data.mjs`

### Phase 2: Uncacheable errors (item 3) — `worker/api.mjs`

**Independent of:** Phase 1

### Phase 3: En-route fixture (item 4) — fieldwork jobs + schedule

**Independent of:** Phases 1–2

### Phase 4: Validation, PR, issue disposition

**Depends on:** Phases 1–3

---

## STEP-BY-STEP TASKS

### CREATE branch `feature/pr16-review-lows`

- **IMPLEMENT**: `git checkout -b feature/pr16-review-lows` from up-to-date `main`.
- **GOTCHA**: this working tree is shared with parallel sessions — re-verify the branch (`git branch --show-current`) immediately before every commit, and stage by explicit path only.
- **VALIDATE**: `git branch --show-current` → `feature/pr16-review-lows`
- **SATISFIES**: process (AC #6)

### UPDATE `system/scenario-data.mjs` — clear the memo on rejection

- **IMPLEMENT**: chain a `.catch` onto the memoized promise that resets the memo and rethrows:

  ```js
  export function loadRegistry() {
    registryPromise ??= fetch("/scenarios/index.json")
      .then((res) => {
        if (!res.ok) throw new Error(`/scenarios/index.json: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .catch((err) => {
        // a failed fetch must not stick for the page's life — drop the memo so the next call retries
        registryPromise = null;
        throw err;
      });
    return registryPromise;
  }
  ```

- **PATTERN**: existing throw message format kept verbatim (`scenario-data.mjs:21`); comment register per `scenario-data.mjs:38-40`.
- **GOTCHA**: rethrow so callers still see the rejection — `loadCollection`'s `apiBase().catch(() => "")` fallback-to-static behavior must not change. Concurrent callers of the same in-flight promise all reject once and the memo clears once; that's correct.
- **VALIDATE**: `node --check system/scenario-data.mjs`, then from repo root:

  ```bash
  node --input-type=module -e '
  const m = await import("./system/scenario-data.mjs");
  const p1 = m.loadRegistry(); p1.catch(() => {});
  try { await p1; } catch {}
  const p2 = m.loadRegistry(); p2.catch(() => {});
  console.log(p1 === p2 ? "FAIL: rejected registry fetch memoized" : "OK: next call retries");'
  ```

  (In Node the relative-URL fetch rejects, which is exactly the path under test. Prints `FAIL` on the old code, `OK` on the fix. If Node ever throws synchronously on the invalid URL instead, fall back to a browser check: DevTools → block `/scenarios/index.json` → call `loadRegistry()` twice from the console on `/scenarios/check.html`.)
- **SATISFIES**: AC #1

### UPDATE `worker/api.mjs` — `no-store` on non-200s

- **IMPLEMENT**: override cache-control inside the single `json()` helper; keep `...extra` last:

  ```js
  const json = (body, status = 200, extra = {}) =>
    new Response(JSON.stringify(body), {
      status,
      // errors are never cached — a mistyped route's 404 must not be replayed for 5 minutes
      headers: { ...HEADERS, ...(status !== 200 && { "cache-control": "no-store" }), ...extra },
    });
  ```

- **PATTERN**: one choke point, no second helper (`api.mjs:17-18`); spreading a falsy `&&` result is a no-op, an idiom already acceptable in this codebase's compact style.
- **GOTCHA**: the 405 passes `extra = { allow: "GET" }` — no key collision, but order matters if that ever changes; `extra` stays last. The 204 OPTIONS response is out of scope.
- **VALIDATE**: `node --check worker/api.mjs`; full runtime battery in the validation task below.
- **SATISFIES**: AC #2

### UPDATE `scenarios/fieldwork/fixtures/jobs.json` — flip `job-006` to en-route

- **IMPLEMENT**: edit exactly three fields of `job-006` (Copperworks Brewery · Block B, south, callout, priority, 60 min, `tech-04`):
  - `"status"`: `"scheduled"` → `"en-route"`
  - `"scheduledStart"`: `"2026-07-17T10:30:00Z"` → `"2026-07-14T17:30:00Z"`
  - `"slaDue"`: `"2026-07-20"` → `"2026-07-16"`

  Leave `completedAt: null` and every other field untouched. Story told by the data: SLA closing in (07-16 = the board's at-risk boundary), the callout pulled forward to today, tech-04 en route at ~17:00 while tech-01 is on-site next door in the timeline (16:30–18:00).
- **PATTERN**: `job-032` (the on-site exemplar) — same modeling: today-dated, assigned, coherent with its schedule slot.
- **GOTCHA**: `job-006` is currently in **no** schedule slot (slotted jobs are exactly job-005/026/030/032/043), so seating it creates no double-booking. `tech-04` is south, `job-006` is south — region-coherent. Validator constraints all hold: start-day = today (±14d ✓), not `done` so `completedAt` stays null ✓, not `overdue` so no `slaDue < today` requirement ✓ (`slaDue` 07-16 ≥ today 07-14). Do NOT pick a different job without re-checking all of the above.
- **VALIDATE**: `node scenarios/validate.mjs` → both scenarios ✓, verdicts differ.
- **SATISFIES**: AC #3

### UPDATE `scenarios/fieldwork/fixtures/schedule.json` — seat job-006 in tech-04's today lane

- **IMPLEMENT**: in record `slot-day-04` (tech-04, `"date": "2026-07-14"`), fill the **first** slot: `{ "start": null, "durationMin": null, "jobId": null }` → `{ "start": "17:30", "durationMin": 60, "jobId": "job-006" }`. Slots 2–3 stay empty.
- **PATTERN**: `slot-day-01`'s filled slot for job-032 (`{"start": "16:30", "durationMin": 90, "jobId": "job-032"}`) — start matches the job's `scheduledStart` time, duration matches the job's `durationMin`.
- **GOTCHA**: `worker/fixtures.mjs` imports these JSON files directly (`with { type: "json" }`) — no manifest to update.
- **VALIDATE**: `node scenarios/validate.mjs` (the generic walk resolves `jobId` → jobs; schedule date within the board window).
- **SATISFIES**: AC #3

### Run the full validation battery

- **IMPLEMENT**: execute VALIDATION COMMANDS Levels 1–4 below, in order.
- **VALIDATE**: every command's expected output, verbatim below.
- **SATISFIES**: AC #5

### CREATE PR + disposition issue #18

- **IMPLEMENT**: commit per repo convention (one atomic commit, message = what + doc reference, e.g. `fix: PR #16 review lows — registry retry, no-store errors, en-route fixture (#18)`), push, open PR with `Closes #18` in the body (via `/piv-create-pr`). Then post the item-1 disposition comment on the issue:

  ```
  gh issue comment 18 --body "Items 2–4 resolved in PR #<n>: the registry fetch no longer memoizes rejection (system/scenario-data.mjs), Worker non-200s are now \`cache-control: no-store\` (worker/api.mjs), and the board's en-route status has real fixture data — job-006 moved to the fictional today and seated in tech-04's lane (jobs.json + schedule.json), mirroring the on-site exemplar job-032.

  Item 1 stays deferred by decision, not oversight: the verdicts-must-differ check (scenarios/validate.mjs) proves \"not all identical\", which is exact while N=2. Strengthen to pairwise-distinct only when a third scenario lands in scenarios/index.json. Nothing to build until then."
  ```

- **GOTCHA**: shared worktree — `git branch --show-current` immediately before committing; `git add` explicit paths only (`system/scenario-data.mjs worker/api.mjs scenarios/fieldwork/fixtures/jobs.json scenarios/fieldwork/fixtures/schedule.json`).
- **VALIDATE**: `gh pr view --json body | grep -i "closes #18"`; `gh issue view 18 --comments` shows the disposition comment.
- **SATISFIES**: AC #4, AC #6

---

## TESTING STRATEGY

No test suite exists and none is added (CLAUDE.md: "don't hunt for or invent one"). "Done" = run the surface you touched:

### Unit-ish

- The Node one-liner above is a real behavioral check of the memo-clearing path (rejection is guaranteed in Node because the URL is relative).

### Integration

- `node scenarios/validate.mjs` — the full coherence suite over both scenario packages.
- The `wrangler dev` curl battery — live Worker, asserting status + cache-control per route class.

### Edge Cases

- Positive Worker routes keep `public, max-age=300` (the fix must not leak `no-store` onto 200s — the honesty-contract probe in `scenario-data.mjs` depends on client-side `no-store`, not server-side).
- Prototype-pollution segments (`/api/verdant/__proto__`, `/api/constructor/name`) still 404 — and are now uncacheable.
- 405 keeps its `allow: GET` header alongside the new `no-store`.
- Board renders with the Worker **down** (static fallback) — the en-route chip must appear from static fixtures too (same files, so it will; verify visually once).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node --check system/scenario-data.mjs && node --check worker/api.mjs && node -e "JSON.parse(require('fs').readFileSync('scenarios/fieldwork/fixtures/jobs.json'));JSON.parse(require('fs').readFileSync('scenarios/fieldwork/fixtures/schedule.json'));console.log('json ok')"
```

### Level 2: Unit Tests

The registry-retry one-liner from the scenario-data task → prints `OK: next call retries`.

### Level 3: Integration Tests

```bash
node scenarios/validate.mjs        # both scenarios ✓, verdicts differ (habit-justified vs utility)
```

Worker battery — terminal A: `cd worker && npx wrangler dev` (port 8787); terminal B:

```bash
curl -si http://127.0.0.1:8787/api/health              | grep -iE "^HTTP|cache-control"   # 200 · public, max-age=300
curl -si http://127.0.0.1:8787/api/fieldwork/jobs      | grep -iE "^HTTP|cache-control"   # 200 · public, max-age=300
curl -si http://127.0.0.1:8787/api/fieldwork/jobs      | grep -c "en-route"               # ≥1 — the new job is served
curl -si http://127.0.0.1:8787/api/nope/x              | grep -iE "^HTTP|cache-control"   # 404 · no-store
curl -si http://127.0.0.1:8787/api/verdant/__proto__   | grep -iE "^HTTP|cache-control"   # 404 · no-store
curl -si http://127.0.0.1:8787/api/verdant/nope        | grep -iE "^HTTP|cache-control"   # 404 · no-store
curl -si -X POST http://127.0.0.1:8787/api/health      | grep -iE "^HTTP|cache-control|allow" # 405 · no-store · allow: GET
```

### Level 4: Manual Validation

```bash
npx serve .   # repo root
```

Open `http://localhost:3000/proto/fieldwork.html` (no Worker running → source indicator says "data: static fixtures"):

- tech-04's lane shows a filled slot chip: `17:30 Copperworks Brewery · En route`
- "Needs attention" panel lists Copperworks Brewery with the styled **En route** chip (`data-status="en-route"`) and the SLA warning mark
- "Needs assignment" panel unchanged (job-052 + job-061..064 still there)
- `/scenarios/check.html` still renders green

### Level 5: Additional Validation (Optional)

With `wrangler dev` up, reload the board on `127.0.0.1` and confirm the source indicator flips to "data: live mock API" and the en-route chip persists.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — a rejected `/scenarios/index.json` fetch is not memoized: the next `loadRegistry()` call issues a new fetch (Node one-liner prints `OK`); success path still memoized (single fetch per page life).
- [ ] AC #2 — every non-200 `worker/api.mjs` response carries `cache-control: no-store`; every 200 keeps `public, max-age=300`; 405 keeps `allow: GET`.
- [ ] AC #3 — exactly one `en-route` job exists (`job-006`), dated the fictional today, assigned to `tech-04`, seated in `slot-day-04`; `node scenarios/validate.mjs` passes; the chip renders in both the attention panel and the lane.
- [ ] AC #4 — issue #18 carries the item-1 deferral comment (trigger: third scenario in `scenarios/index.json`); no N>2 code was written.
- [ ] AC #5 — no regressions: full curl battery matches expectations; check page green; board renders under static fallback.
- [ ] AC #6 — one atomic commit on `feature/pr16-review-lows`, PR closes #18.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] Curl battery run against live `wrangler dev` (not reasoned about)
- [ ] Board manually rendered once (static fallback at minimum)
- [ ] Issue #18 comment posted; PR body says `Closes #18`
- [ ] Staged by explicit path; branch verified before commit (shared worktree)

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Assumption:** editing hand-authored fixture data is legitimate under the honesty contract (it governs agent-output traces, not fictional demo fixtures — both packages are `fictional: true` and labeled). Consistent with M2's fix in the same review.
- **Assumption:** `job-006` (a callout) is the right pick — callouts are the natural "tech dispatched now" story. Any candidate satisfying the GOTCHA checklist works; the specific choice is not load-bearing.
- **Assumption:** closing #18 via the PR is correct even though item 1 is deferred — the deferral + trigger is recorded on the issue itself, which is the disposition the user asked for ("note that on the issue, don't build it"). If the user prefers #18 stay open as the standing reminder, drop `Closes #18` from the PR body and say "Items 2–4 resolved in #<n>" instead — a one-word change at PR time.
- **Noted drift since review:** jobs.json grew 60 → 64 (job-061..064, unassigned) and unassigned jobs 1 → 5 during the #8/#13 board work. This plan's queries reflect current `main`; nothing to fix.

## NOTES (open canvas)

- **Why `slaDue` moves too (item 4):** the styled `data-status` chip only renders through `jobRow` (attention/unassigned panels); lane slots show plain label text. An en-route job that is neither at-risk nor unassigned would exercise the copy label but never the CSS at `components.css:1823`. Tightening `slaDue` to the `SLA_SOON` boundary (07-16, `atRisk` uses `<=`) puts it in "Needs attention" — both surfaces render, three fields changed instead of two. Rejected alternative: also making it unassigned (`techId: null`) — contradicts "en route" semantics (someone must be driving).
- **Rejected alternative for item 3:** shorter `max-age` on errors (the issue offered it) — `no-store` is the review's primary suggestion, simpler, and matches the client-side probe philosophy already in `scenario-data.mjs` ("an error state must not lie for 5 minutes").
- **Rejected alternative for item 2:** retry-with-backoff or a `finally`-based reset — over-engineering; `finally` would also clear the *successful* memo, defeating it. The `.catch`-reset-rethrow is the minimum that fixes the finding.
- **Item 1 disposition location:** on the issue only, per the user's exact instruction. A code comment at the check site was considered and dropped — "surgical changes" wins, and `validate.mjs`'s COHERENCE header already documents how a third scenario slots in.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
