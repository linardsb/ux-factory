# Plan — the portal's Origin guard (#157)

Deferred from PR #156's review (High 1's "optional, closes the whole class" half). The destructive
half — a caller setting `force` and deleting a committed proposal — shipped fixed in #156. This is
the remaining, pre-existing class.

## The problem, restated from the code

`portal/server.mjs:46` routes every request with no `Origin` or `Referer` check anywhere in the
handler, and `readBody` (`portal/server.mjs:39-44`) `JSON.parse`s the body regardless of
`content-type`. So a cross-origin `fetch(..., {mode:'no-cors', headers:{'content-type':'text/plain'}})`
— or a plain `<form enctype="text/plain">` — is a *simple* request: no preflight, opaque response,
but the request **is delivered** and the side effect happens.

Binding `127.0.0.1` (`portal/server.mjs:152`) stops a remote client. It does nothing about a page
open in the operator's own browser while the portal is running, which is its normal state during a
work session.

What that reaches:

| route | cost |
| --- | --- |
| `/api/build/run` | a real, token-spending agent run on a fresh slug (the overwrite guard only fires on a slug that already has a trace) |
| `/api/chat` | tokens |
| `/api/figma/pull` | writes `system/tokens.<slug>.css`, consumes the file's ~6 GET-file/month budget, and streams a body to disk **outside** `readBody`'s 1 MB cap |

Nothing is destructive: `runOptions` has no `force` parameter at all after #156, and
`portal/lib/figma.mjs:28-33`'s `RESERVED` set means an import can never clobber a generated or
committed pack. The cost is tokens, a Figma quota, and stray files.

## The fix

One guard at the top of the request handler, rejecting when `req.headers.origin` is present and is
not the portal's own origin.

**The trap.** Same-origin `fetch` POSTs *do* send `Origin`, so a naive `origin !== expected` reject
breaks the drawer, the intake form and the chat pane unless it accepts **both**
`http://localhost:<PORT>` and `http://127.0.0.1:<PORT>`. Both are in live use — `npm start` prints
the first (`portal/server.mjs:153`), the bind address is the second, and an operator types either.

**Not `[::1]`.** `server.listen(PORT, '127.0.0.1')` means nothing can ever connect over IPv6
loopback, so a page at that origin cannot exist. Two entries, not three — a third string to keep in
sync for an unreachable address is exactly the rot this guard exists to avoid.

**All methods, not a POST list.** A same-origin `fetch` GET sends no `Origin` at all, so the guard
is a no-op on the portal's own reads; a cross-origin GET's response is unreadable anyway. One check
with no method list to drift beats a whitelist that has to be remembered when a route is added —
the same reasoning `stepEvent` applies one module over.

## Steps

1. **`portal/lib/origin.mjs`** (new, pure, zero-dep, SDK-free) → verify: imports under
   `node --input-type=module` with `portal/node_modules` moved aside.
   - `allowedOrigins(port)` — the two loopback origins.
   - `originAllowed(origin, port)` — `true` when the header is absent (not a browser cross-origin
     request: curl, the README's commands, a same-origin GET); exact string match otherwise, so
     `Origin: null` (sandboxed iframe, `file://`) rejects.
2. **`portal/server.mjs`** — the guard, before all routing, returning `403` JSON → verify: the live
   curl battery in step 5.
3. **`tooling/build-checks.mjs` group 9** — the predicate, called directly, over both loopback
   hosts plus the near-miss battery (`null`, wrong port, `http://localhost:<PORT>.evil.com`,
   trailing slash, `https`, case) → verify: `node tooling/build-checks.mjs` prints 9 ✓ lines, and
   mutating `originAllowed` to `=> true` turns group 9 red.
   - Bookkeeping this drags along: build-checks' header count line, its numbered list, its "ONE
     NAMED EXCEPTION" framing (now two), and CLAUDE.md's build-checks description.
   - **Group 9 proves the predicate, not the wiring.** `server.mjs` imports `chat.mjs`, which
     imports the Agent SDK, so CI — which has no `portal/node_modules` by design — can never boot
     the server. The live curls in step 5 are the only proof the guard is actually *called*. A
     group described as "the origin guard is gated" would be the same shape as every #137 defect.
4. **loc-summary** — `git add` first, then `node agent-layer/gen-loc-summary.mjs --check` (a check
   before staging is a false "no drift"). Expected clean: its three groups are `system/`, root+proto
   HTML and `agent-layer/`, and neither touched file is in one.
5. **Drive all four POST surfaces** (the ticket's named verification) → verify: for each of
   `/api/intake`, `/api/chat`, `/api/figma/pull`, `/api/build/run`, a hostile `Origin` gets `403`
   and *both* legitimate origins reach the route.
   - No run may spend a token or write a file. Each route's own validation fires before its
     expensive work, which is what makes "reached the route" observable for free:
     `createIntake({})` throws `company is required` before any `mkdirSync`; `/api/chat` answers
     `400 message required` before `streamChat`; `assertSlug` fires at the top of `receiveExport`;
     `runBuild` validates before any agent call.
   - **On `/api/build/run`, assert on the body, not the status** — that route writes `200` + an SSE
     error event on a validation failure, so only the body distinguishes "guard rejected" (403
     JSON) from "guard passed, route refused".
   - One rejected request **with a body attached**, to confirm a 403 returned before reading
     doesn't hang the socket — `/api/figma/pull`'s streamed `receiveExport` is the path that would
     surface it.
   - Plus the CLAUDE.md "Done" bar: portal boots, `/api/health` answers, the UI loads by hand.

## Out of scope

- CORS response headers. Nothing legitimately reads this server cross-origin; adding
  `Access-Control-*` would only widen it.
- Any authn. This is a CSRF guard on a loopback-bound local workbench, not a login.
- The `receiveExport` 1 MB-cap bypass noted above: real, but not destructive and not this ticket.

Refs: `.claude/code-reviews/pr-156-review.md` High 1 · issue #157 · epic #134 ticket #140.
