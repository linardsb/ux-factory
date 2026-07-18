# Review — PR #16: scenario packages (Verdant + Fieldwork) + Worker mock API + fixture fallback

**Verdict: Request changes** — one High-severity routing bug on the public Worker (one-line fix), two Medium items to fix or explicitly accept. Everything else is in genuinely good shape: full validation suite passes, the honesty contract is honored end to end, and all four documented plan deviations check out as intentional and sound.

Reviewed with fresh eyes (code-reviewer agent + independent verification of every High/Medium finding against the live `wrangler dev` Worker and the validator source). All 25 changed files read in full; no stray files from the parallel #3 session leaked into the diff.

## Validation (all re-run during this review)

| Level | Check | Result |
|---|---|---|
| L1 | `node --check` × 4 modules; 12 JSON files parse | ✓ |
| L2 | `node scenarios/validate.mjs` — both packages, verdicts differ | ✓ (8 q · 35/100 records · habit-justified vs utility) |
| L2− | Negative test: blanked one `reasoning` | ✓ exit 1 naming file + field; tree restored |
| L3 | Worker curl battery under `wrangler dev` | ✓ counts 15/20/60/10/30 · named 404s · 405 on POST · CORS + cache + content-type headers |
| L5 | `gen-token-css.mjs --check`; static serve of `index.html`, `check.html`, helper, fixtures, registry | ✓ no drift; all 200 |

## Issues

### High

**H1 — `worker/api.mjs:37-40`: unsanitized bracket property access resolves inherited `Object.prototype` members, so the Worker answers requests it should 404.**

`FIXTURES` and each pack are plain object literals; `FIXTURES[scenario]` / `pack[collection]` with request-controlled segments hit the prototype chain. Reproduced against the live `wrangler dev` Worker during this review:

| Request | Expected | Actual |
|---|---|---|
| `GET /api/verdant/__proto__` | 404 | **200**, body `{}` |
| `GET /api/verdant/toString` | 404 | **200**, empty body |
| `GET /api/verdant/hasOwnProperty` | 404 | **200**, empty body |
| `GET /api/constructor/name` | 404 | **200**, body `"Object"` |

Impact is capped — the fixtures are public JSON, there's no write path, and `new Response(undefined, …)` is a benign empty body, not a crash. But it's a real broken-contract bug on the repo's one public endpoint, and the repo's premise is inspectable engineering craft. One-line fix:

```js
const pack = Object.hasOwn(FIXTURES, scenario) ? FIXTURES[scenario] : undefined;
// …
const data = pack && Object.hasOwn(pack, collection) ? pack[collection] : undefined;
```

(or build the manifest objects with `Object.create(null)` in `worker/fixtures.mjs`). Re-run the curl battery plus the four requests above (all should 404) after the fix.

### Medium

**M1 — `scenarios/validate.mjs:114-134`: only fixture files reachable through `proto.config.json` `screens[].collections` are validated — a fixture file no screen references is never read.**

Demonstrated by mutation test (against a scratch copy, working tree untouched): a fixture file with a duplicate id, a dangling `plantId`, and a record missing `id`, when not referenced by any screen, passes the validator silently with `✓` and exit 0. Doesn't manifest in the shipped data (every current fixture is screen-referenced), but `proto.config.json`, `worker/fixtures.mjs`, and the fixture directory are three independently hand-maintained lists with nothing cross-checking them — and CLAUDE.md's "New scenario" steps maintain them separately, so drift is the expected failure mode, at which point the Worker serves unvalidated data live while the validator prints green. Suggested fix: glob `fixtures/*.json` per scenario and assert every file is covered by some screen's `collections` (or explicitly listed), and/or assert `worker/fixtures.mjs`'s manifest matches the validated set.

**M2 — `scenarios/fieldwork/copy.json`: `unassignedHeading: "Needs assignment"` has no supporting data — all 60 jobs carry a non-null `techId`.**

The brief and copy make "what's unassigned" a headline of the dispatch board, but #8 will have zero fixture examples to render in that state. Cheap now (one job → `techId: null`), expensive once #8 is mid-build. If the intent is that #8 computes "unassigned" dynamically and an empty state is fine, say so and accept.

### Low (non-blocking)

- `scenarios/validate.mjs:240-242` — verdicts-must-differ proves "not all identical", which is exact for today's N=2 but weaker for N>2; revisit if a third scenario lands.
- `system/scenario-data.mjs:19-25` — `registryPromise ??=` memoizes a *rejected* registry fetch for the page's life; same-origin static file, so acceptable, but noted.
- `worker/api.mjs` — error responses share `cache-control: public, max-age=300` with data responses, so a mistyped 404 is cacheable for 5 minutes.
- `scenarios/fieldwork/copy.json` — `statusLabels["en-route"]` has no matching job in `jobs.json` (likely forward-provisioned for #8; fine).

## Documented deviations — checked, not flagged

All four plan AMENDMENTS (axes enums pinned early against #3's engine contract; validator coherence proofs; `compatibility_date: 2026-05-03` pinned for wrangler 4.86.0; `cache: "no-store"` Worker probe) are recorded, reasoned, and correctly implemented. No *undocumented* divergences from the plan were found.

## What's genuinely good

- **Single-source fixtures by construction**: the Worker bundles the exact committed JSON files the static fallback serves (`with { type: "json" }` imports) — no copy, no drift, provably the same data.
- **`check.html` is XSS-safe**: every dynamic value (including fetched `fictionalNotice` and error messages) goes through `esc()` before touching `innerHTML`; no injectable interpolation point was found.
- **Data coherence is real, not decorative**: all 15 water-task due-date computations check out by hand; the validator's coherence proofs genuinely catch broken date arithmetic, dangling refs, and status inconsistencies (verified by mutation testing).
- **Honesty contract satisfied end to end**: `fictional: true` in both brief heads, real non-templated `fictionalNotice` in both copy decks, and the two verdicts differ for substantive in-content reasons — not flipped strings to satisfy the validator.
- **The `no-store` probe fix** (amendment #4) came from real-browser testing catching the `source` indicator lying for 5 minutes — exactly the rigor the honesty contract asks for.

## Recommendation

Fix **H1** (one line + re-run the curl battery with the four prototype-segment requests), decide **M1/M2** (fix or record acceptance), then this is ready for approval. Low items can ride.
