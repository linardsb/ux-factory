# Review — PR #159 · one Origin guard before all routing (#157)

**Verdict: approve.** 0 Critical · 0 High · 0 Medium · 2 Low. Nothing blocks the merge.

Reviewed with fresh eyes (`code-reviewer` agent + independent verification against a running portal on
`PORT=4799`). The guard does what the PR body says it does, and I confirmed the one claim CI can
never make — that it is actually **called** — rather than reading it off the report.

## What I verified myself, not relayed

The gate can only prove the predicate. So I booted the portal and drove it:

| request | result |
| --- | --- |
| `GET /api/health`, no Origin | `200` |
| `POST /api/intake`, `Origin: http://evil.com` | `403` refusal JSON |
| `POST /api/intake`, `Origin: null` | `403` |
| `POST /api/intake`, `Origin: http://localhost:4799.evil.com` | `403` — the suffix trap holds |
| `POST /api/intake`, `Origin: http://localhost:4799` | `500 company is required` — **reached the route** |
| `POST /api/intake`, `Origin: http://127.0.0.1:4799` | `500 company is required` — **both origins pass** |
| `GET /api/cards`, `Origin: http://evil.com` / no Origin | `403` / `200` |
| `POST /api/chat`, hostile Origin | `403` **JSON, no SSE stream** — no token spent |
| `POST /api/build/run`, hostile Origin | `403` **JSON, no SSE stream** — no run started |

Non-default port throughout, so "the port is a parameter" is exercised end to end, not just asserted.

**Socket check.** An 8 MB `text/plain` body with a hostile Origin to `/api/figma/pull?slug=hangtest`
→ prompt `403`, and a **second request over the same keep-alive socket** answered `200`. Node drains
the unconsumed body itself; responding before reading wedges nothing. No `system/tokens.hangtest.css`,
no `tooling/figma/exports/hangtest.json`, working tree clean afterwards.

**Route reachability.** Enumerated every route in `portal/server.mjs`. Every state-changing one is
`POST`; a `GET` to any of them falls through to the static handler and 404s. Browsers send `Origin`
on all non-`GET`/`HEAD` requests — `fetch`, XHR, `sendBeacon`, and cross-origin `<form>` POST
navigations alike — so **there is no request shape that both omits `Origin` and reaches a
state-changing route**. The "all methods, no POST whitelist" call is right and costs nothing.

**Predicate edge cases.** Duplicate `Origin` headers are joined by Node into one comma-space string,
never an array, so `req.headers.origin` is `string | undefined` and the exact-match rejects the
joined form (the battery's own case). Casing, whitespace, scheme, prefix/suffix near-misses all
reject correctly.

**Gate honesty.** Group 9 imports the shipped `portal/lib/origin.mjs` directly — not a
reimplementation — and that module has zero imports, which is a stronger structural proof of
SDK-free than the `mv portal/node_modules` run. Mutating `originAllowed` to `return true` turns the
group red with 17 failures, reproducing the report's number exactly; file restored byte-identical.
The stated scope ("proves the predicate, not the wiring, because `server.mjs` reaches the SDK") holds
against the real import graph.

## Validation

| gate | result |
| --- | --- |
| `node tooling/build-checks.mjs` | **✓ all 9 groups** — group 9: `2 loopback origins accepted · 3 absent forms pass · 16 hostile origins refused · port is a parameter` |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ 3 groups — no drift |
| live portal drive | ✓ (table above) |
| CI `verify` / `visual` | ✓ pass / ✓ pass |

No shipped page or `system/` file changed, so no visual-baseline churn — and the visual job agrees.

## Low 1 — a doc pointer that does not resolve

`tooling/build-checks.mjs:1013` cites `.claude/reports/portal-origin-guard.md`. The file is
`.claude/reports/portal-origin-guard-report.md`; nothing exists at the cited path.

It's a one-word fix, and it matters slightly more than a typo because that comment's whole job is the
standing instruction *"it has to be re-driven if the handler is restructured"* — the reader it is
written for is the one who needs the path to resolve. Grepped the rest: this is the only broken
reference across `origin.mjs`, `server.mjs`, `CLAUDE.md`, the plan and the report.

**Fix:** `portal-origin-guard.md` → `portal-origin-guard-report.md`.

## Low 2 — DNS rebinding is the one reachable gap the docs never name

There's no `Host` allowlist, so a rebound page — origin literally `http://attacker.example:<PORT>`,
DNS-flipped to 127.0.0.1 — still reads `/api/cards`, `/api/health`, `/api/build/config`,
`/sites/<slug>/…`: from the browser's view those are same-origin GETs, which send no `Origin` and
take the "absent passes" branch.

**This PR does not create that and strictly improves the posture** — a rebound page's *POST* now
carries an unlisted `Origin` and gets `403`, so the token- and quota-spending half is closed. The
residual is read-only and pre-existing, and neither the plan, the report nor the PR body claims
otherwise, so there is no false-completeness claim to flag.

What's worth one line: the docs spend a paragraph in three places on `http://[::1]:<PORT>` — an
origin that is *provably unreachable* given `listen(PORT, '127.0.0.1')` — and never name the one
that is reachable. Add a bullet to the plan's **Out of scope** list
(`.claude/plans/portal-origin-guard.md:89-94`): *"Host-header / DNS-rebinding read exposure on the
GET routes — pre-existing, read-only, not this ticket's named class."* No code change.

## One finding I am dropping, having checked it

The deep pass flagged the report's `receiveExport (portal/server.mjs:72)` citation as stale, since
the call sits at `:81` after the guard's nine lines. It resolves **correctly against `main`** —
`git show main:portal/server.mjs` puts `receiveExport` on line 72 — which is the same pre-fix
convention the plan uses for `:46`, `:39-44` and `:152`. Consistent, not stale. Not a finding.

## What's done well

- **The two-origin call is the load-bearing one, and it's right.** `localhost` + `127.0.0.1`, and
  explicitly not `[::1]` because `listen(PORT, '127.0.0.1')` makes a page at that origin impossible.
  A third string to keep in sync for an unreachable address would be exactly the rot the guard
  exists to prevent. I confirmed both allowed origins reach the route on a live portal — a naive
  single-origin check really would have broken the drawer for whichever host the operator typed.
- **The 16-case hostile battery targets real string-matching traps**, not filler: suffix
  (`:4747.evil.com`), prefix (`:47470`), trailing `/` and `#`, scheme, case, whitespace, and the
  duplicate-header join. Three of them start with an allowed origin, which is precisely why the match
  is `===`.
- **The scope statement is in three places and every one of them is accurate** — module header, gate
  comment, `CLAUDE.md`. "Group 9 proves the predicate, not the wiring" is the opposite of the #137
  defect shape, and it is stated *before* a reader can be misled by a green ✓.
- **The mutation discipline, including its own failure.** Four mutations run through the real gate,
  and the report records that the fourth came back green because the `perl` pattern silently missed —
  the harness reproducing the exact defect class it exists to catch, written down rather than
  quietly fixed. That is the "check that cannot fail" standard applied to the checker.
- **The withdrawn `receiveExport` finding.** A claim that reached the PR body, then was driven both
  ways against a running portal and retracted by name, with the 32 MB cap's three mechanisms
  documented and no face-saving follow-up issue filed. Withdrawing a wrong finding in public is
  harder than never making it.
- Zero new dependencies, SDK-free by inspection as well as by test, and the `403` before `readBody`
  is what keeps a hostile POST from spending a token or streaming a file to disk.

## Recommendation

**Approve.** Both Lows are documentation-only and neither blocks. If they're picked up, the
`build-checks.mjs:1013` path is a one-word edit worth landing before merge, since a pointer that
can't resolve defeats the instruction it carries; the DNS-rebinding bullet can equally follow later.

The wiring is proven only by the live drive above and in the report — if the request handler is ever
restructured, that drive has to be re-run. That is the honest cost of a guard CI cannot boot, and
the PR says so itself.
