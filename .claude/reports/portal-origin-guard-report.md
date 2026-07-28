# Report — the portal's Origin guard (#157)

Plan: `.claude/plans/portal-origin-guard.md`. Closes #157, deferred from PR #156's review (High 1's
"optional, closes the whole class" half).

## What shipped

| file | change |
| --- | --- |
| `portal/lib/origin.mjs` | new · the predicate: `allowedOrigins(port)` + `originAllowed(origin, port)` |
| `portal/server.mjs` | the guard, before ANY routing, `403` JSON; import; one stale comment corrected |
| `tooling/build-checks.mjs` | group 9 + the header bookkeeping it drags along |
| `CLAUDE.md` | the `portal/lib/` map entry and the build-checks description (8 groups → 9) |

Three decisions worth the reader's time:

**Two origins, not one, and not three.** `http://localhost:<PORT>` and `http://127.0.0.1:<PORT>`
both pass. Same-origin `fetch` POSTs *do* send `Origin`, so a naive `origin !== expected` would
break the drawer, the intake form and the chat pane for whichever host the operator typed — `npm
start` prints the first, the bind address is the second. `http://[::1]:<PORT>` is deliberately
absent: `server.listen(PORT, '127.0.0.1')` means nothing can connect over IPv6 loopback, so a page
at that origin cannot exist, and a third string to keep in sync for an unreachable address is the
rot the guard exists to avoid.

**All methods, not a POST list.** A same-origin `fetch` GET sends no `Origin` at all, so the guard
is a no-op on the portal's own reads, and a cross-origin GET's response is unreadable anyway. One
check with no method list beats a whitelist someone has to remember when a route is added.

**An absent Origin passes.** It is not a browser cross-origin request — curl, the runbook's
commands, every same-origin GET. `Origin: null` (sandboxed iframe, `file://`) is *present* and
unlisted, so it rejects.

## What the gate does and does not cover

Group 9 proves the **predicate**. It cannot prove the **wiring**: `server.mjs` imports `chat.mjs` →
the Agent SDK, and CI has no `portal/node_modules` by design (group 8's whole point), so CI can
never boot the server. Both the group's own comment and build-checks' header say so in those words,
because a group described as "the origin guard is gated" would be the same shape as every #137
defect. **The live drive below is the only proof the guard is called, and it has to be re-driven if
the handler is restructured.**

## Validation

**1 · build-checks — 9/9 green**, group 9 reporting `2 loopback origins accepted · 3 absent forms
pass · 16 hostile origins refused · port is a parameter`.

**2 · Mutation — the group fails when the predicate breaks.** Four mutations of `origin.mjs`, each
run through the real gate:

| mutation | result |
| --- | --- |
| `originAllowed` → `return true` | ✗ 17 failures |
| exact match → `startsWith` | ✗ 6 failures (`:4747.evil.com`, `:47470`, trailing `/`, `#`, the joined duplicate header) |
| drop `127.0.0.1` from the allowlist | ✗ 2 failures |
| absent-Origin early return removed | ✗ 3 failures |

The fourth is worth recording: it first came back **green**, because the `perl` pattern silently
failed to match — the mutation harness reproducing the exact defect class it exists to catch. Fixed
the pattern, confirmed the edit landed in the file, then re-ran. Restore verified byte-identical
against a pre-mutation copy.

**3 · SDK-free** — `mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs`
→ all 9 groups pass, so group 9's import reaches no SDK. Restored.

**4 · The live drive — all four POST surfaces, on a running portal.** Booted on `PORT=4788` because
4747 was already serving the operator's own session (left untouched); the non-default port also
exercises the "port is a parameter" path. Each route under six origins. No token was spent and no
file was written: every route's own validation fires before its expensive work, which is what makes
"reached the route" observable for free.

| route | `evil.com` / `null` / `:4788.evil.com` | `localhost` / `127.0.0.1` / no Origin |
| --- | --- | --- |
| `/api/intake` | `403` refusal JSON | `500 company is required` — reached |
| `/api/chat` | `403` refusal JSON | `400 message required` — reached |
| `/api/figma/pull` | `403` refusal JSON | `500 … not a usable pack slug` — reached |
| `/api/build/run` | `403` refusal JSON | `200` + SSE `{"type":"error"…not a usable scenario name}` — reached |

`/api/build/run` is asserted on the **body**, not the status: that route writes `200` + an SSE error
event on a validation failure, so only the body distinguishes "guard rejected" from "guard passed,
route refused". A hostile origin gets JSON `403` and no stream at all — the guard fires before
`readBody`, so no run starts.

**5 · Reads and static still serve.** `/api/cards` and `/api/build/config` → `200` under both
allowed origins, `403` under `evil.com`; `/`, `/portal.js` and `/system/tokens.contract.css` → `200`
with no Origin. Nothing in the repo calls the portal cross-origin (grepped), so there was no
legitimate consumer to break.

**6 · The socket check.** An 8 MB `text/plain` body with `Origin: http://evil.com` to
`/api/figma/pull?slug=hangtest` → prompt `403`, no hang, and neither `system/tokens.hangtest.css`
nor `tooling/figma/exports/hangtest.json` was created. This is the path that would have surfaced a
403-before-read wedging the socket, because `receiveExport` streams outside `readBody`'s 1 MB cap.

**7 · Repo gates** — `drift-check ✓` (syntax · token-css · annotated-source · loc-summary ·
system-graph · handoff · scenarios · traces), `token-lint ✓`, `gen-loc-summary --check ✓ no drift`
(run **after** staging — a check before staging is a false negative). No shipped page or `system/`
file changed, so no visual baseline churn.

## Left undone, deliberately

- **CORS response headers.** Nothing legitimately reads this server cross-origin; `Access-Control-*`
  would only widen it.
- **`receiveExport` bypasses `readBody`'s 1 MB cap** (`portal/server.mjs:72` streams to disk). Real,
  pre-existing, and now unreachable cross-origin — but an unbounded local write is still there.
  **Flagged here only — no follow-up issue filed**, and #157 closes with this PR, so it needs its
  own ticket if it is to survive. Not fixed here: it is a different failure and a different fix.
- **Any authn.** This is a CSRF guard on a loopback-bound local workbench, not a login.
