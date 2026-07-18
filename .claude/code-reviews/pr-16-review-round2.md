# Review — PR #16 (Round 2): scenario packages (Verdant + Fieldwork) + Worker mock API + fixture fallback

**Verdict: ✅ Approve** *(advisory — posted as a comment; see note)*

Round 1 (`.claude/code-reviews/pr-16-review.md`) requested changes on three findings; commit `60baa89` addresses all three. This round reviews the **current state** (`60baa89`) with fresh eyes — an independent code-review agent primed to this repo's *actual* standards, plus full re-validation — and confirms the fixes hold. What remains is one Medium dev-tooling nit (fails closed) and two Low items; none block merge.

> **How this is posted:** `gh` is authenticated as the PR author (`linardsb`), and GitHub blocks self-approval, so this lands as a **comment** with an advisory-approve verdict rather than a formal Approve. A second account/human should click Approve to satisfy branch protection.

Reviewed in an isolated `git worktree` (not `gh pr checkout`) because this working tree is shared with a live parallel session — the branch switched under me mid-review (`data-connected-prototypes` → `agentic-bridge`), confirming the shared-tree hazard. All 25 changed files read in full; no stray files from parallel tickets leaked into the diff.

## Round-1 findings — all fixed (verified)

| # | Round-1 finding | Fix in `60baa89` | Verified |
|---|---|---|---|
| **H1** | `api.mjs` bare bracket access resolved inherited `Object.prototype` members → `GET /api/verdant/toString` returned **200** | `Object.hasOwn` guard on **both** path segments (`api.mjs:39,41`) | ✅ **at runtime** — `__proto__`, `constructor`, `prototype`, `hasOwnProperty`, `toString`, `valueOf` all now **404**; body `{"error":"unknown collection \"toString\""}`, no leaked member |
| **M1** | Validator only checked fixtures reachable via `proto.config` screens; an unreferenced file was served unvalidated | `readdirSync` coverage check rejects any `fixtures/*.json` not referenced by a screen (`validate.mjs:141-143`) | ✅ code + green run |
| **M2** | `unassignedHeading: "Needs assignment"` had no data — all 60 jobs carried a `techId` | `job-052` now has `techId: null` | ✅ data (1 unassigned job to render) |

## Validation (re-run this round)

| Level | Check | Result |
|---|---|---|
| L1 | `node --check` × 4 modules; 12 JSON files parse | ✅ |
| L2 | `node scenarios/validate.mjs` | ✅ `verdant` (8q · 2col · 35rec · habit-justified) · `fieldwork` (8q · 3col · 100rec · utility) · verdicts differ |
| L2⁻ | Negative: blank a `reasoning` → exit 1 naming file+field; identical verdicts → exit 1 | ✅ both |
| L3 | Worker curl battery under `wrangler dev` (cached 4.86.0) | ✅ health · 15 plants · 60 jobs · 404/405/204 · `Allow: GET` · CORS `*` · **H1 proto-segments all 404** |
| L5 | `gen-token-css.mjs --check` (regression) | ✅ 46 contract + 53 pack tokens — no drift |
| L4 | Browser fallback (worker ↔ static) | ⏸️ **not re-run** — relied on the author's report; the helper's `source`-truthfulness was traced independently (below) and its server side exercised via L3 |

## Remaining findings

### 🟡 Medium — `scenarios/validate.mjs:26-28` (`isoDay`) throws an *unnamed* error on out-of-range dates
`isoDay` regex-gates `YYYY-MM-DD`, then round-trips through `Date`. Well-formatted but out-of-**range** values (month `13`, day `32`/`00`) produce an Invalid `Date`, so `.toISOString()` throws `RangeError: Invalid time value` instead of returning `false`. Confirmed end-to-end: a brief with `"today": "2026-13-01"` aborts with `scenarios ✗  Invalid time value` — exit 1, so it **fails closed** (no false pass), but names **neither the file nor the field**, which is exactly the guarantee this file's own header makes ("every throw names the offending file and field"). Reachable by a plausible author typo. Same root cause makes siblings latent-crash on malformed input: `addDays` with a non-numeric interval (`:191`), `byId[t.plantId]` when a water task has `plantId:null` (`:190`), `scheduledStart.slice` on an absent field (`:201`).
*Fix (one line):* `const d = new Date(s + "T00:00:00Z"); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === s;` — then the well-formed-but-invalid date fails to the named caller error instead.
*Dev-tooling only — not a shipped surface, not a correctness/honesty bug. Non-blocking.*

### 🔵 Low — `validate.mjs:121,142`: unguarded `collections[...]` access
The `collections` map (a plain `{}` at `:114`) is read with bare bracket access — `if (collections[name]) continue;` (`:121`) and the coverage check `!collections[f.slice(0,-5)]` (`:142`) — the exact hazard `api.mjs` deliberately guards. A collection/fixture named after a prototype member (`toString.json`) would hit an inherited truthy value and be silently skipped by the M1 coverage check the comment calls load-bearing. Absurd filename + trusted local input → theoretical, but an internal inconsistency with `api.mjs`; guard with `Object.hasOwn` to match.

### 🔵 Low — `system/scenario-data.mjs:20`: memoized rejected registry promise
`registryPromise ??=` caches a *rejected* `/scenarios/index.json` fetch for the page's life, pinning the session to `source:"static"` even if the Worker later answers. It never lies (static *did* answer) and a reload retries — benign for a same-origin committed file. Noted only.

## Honesty contract — independently verified (the load-bearing property)
- **`source` can't lie** (`scenario-data.mjs:34-54`): `"worker"` is returned only when `base` is truthy **and** `res.ok` **and** `res.json()` resolves — all under `cache:"no-store"`. Every worker-failure mode (network throw, `AbortSignal.timeout`, non-2xx, JSON-parse throw) falls through to the static fetch and reports `"static"`; the sole `throw` is a missing static fixture, and it names the path.
- **Fictional content can't ship unlabeled**: validator hard-requires `fictional:true` (`:57`) and a `/fiction/i`-matching `fictionalNotice` (`:100-101`); `check.html:72` renders it, escaped.
- **Verdicts differ for real reasons** — `habit-justified` vs `utility`, argued substantively in both briefs' Behaviour-model + Ethics-position sections, enforced by the validator (verified: identical verdicts → exit 1).

## What's genuinely good
- **`api.mjs` prototype-pollution handling is textbook** — `Object.hasOwn` on both segments, with a comment explaining precisely why bare access would leak `/__proto__` and `/toString` as 200s. Verified 404 at runtime.
- **Single-source fixtures by construction** — the Worker bundles the exact committed JSON the static fallback serves (`with { type: "json" }` imports); no copy, no drift, provably the same bytes.
- **`check.html` is XSS-safe** — every dynamic value (including fetched `fictionalNotice` and error messages) passes through `esc()` in text position before touching `innerHTML`.
- **Coherence is engineered, not decorative** — per-scenario proofs (water due = `lastWatered + interval`, `done ⟺ completedAt`, `overdue ⟹ lapsed SLA`, ±date windows) genuinely catch broken data, verified by mutation testing.
- **All four documented plan deviations are legitimate** — axes-enum alignment to #3's engine contract, coherence proofs, `compatibility_date: 2026-05-03` pin for wrangler 4.86.0, `no-store` Worker probe — each recorded in AMENDMENTS and sound. No *undocumented* divergence found.

## Recommendation
**Approve.** The Round-1 blockers (H1/M1/M2) are fixed and verified — H1 at runtime, M1 in code, M2 in data. The Medium `isoDay` guard is a worthwhile fast-follow (one line, restores the validator's named-error contract) but does not block merge: it's dev tooling and fails closed. The two Low items can ride.

---
*Process note for the maintainer: this repo's `code-reviewer` agent is tuned for Python / FastAPI / SQLAlchemy / MyPy — a mismatch for this vanilla-JS / Node-ESM / Cloudflare-Worker codebase (its rubric would flag "missing type annotations", which `CLAUDE.md` explicitly forbids). I routed the independent deep pass to a general agent primed with this repo's real standards instead. Worth retuning via `meta-agent` for the JS/Workers stack so future `piv-review-pr` runs get an on-target second pass.*

🤖 Reviewed with [Claude Code](https://claude.com/claude-code) — `piv-review-pr`
