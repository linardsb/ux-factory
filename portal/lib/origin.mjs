// portal/lib/origin.mjs — the portal's one CSRF guard (#157).
//
// The portal binds 127.0.0.1 and is never deployed, which stops a REMOTE client and nothing else.
// It says nothing about a page open in the operator's own browser while the portal is running —
// its normal state during a work session. `readBody` JSON.parses regardless of `content-type`, so
// a cross-origin `fetch(..., {mode:'no-cors', headers:{'content-type':'text/plain'}})` or a plain
// `<form enctype="text/plain">` is a SIMPLE request: no preflight, opaque response, side effect
// delivered. That reaches a token-spending agent run (/api/build/run, /api/chat) and a Figma pull
// that writes a pack file and spends the file's ~6 GET-file/month budget.
//
// Its own module rather than a few lines in server.mjs for one reason: server.mjs imports chat.mjs,
// which imports the Agent SDK, so nothing that reaches it can run in CI (which has no
// portal/node_modules, by design — see tooling/build-checks.mjs group 8). Here, the predicate is
// SDK-free and build-checks group 9 calls it directly.

// Both are in live use and both must pass: `npm start` prints http://localhost:<PORT>, the bind
// address is 127.0.0.1, and an operator types either. Reject one and the drawer, the intake form
// and the chat pane break for whichever they typed.
//
// NOT http://[::1]:<PORT> — server.listen(PORT, '127.0.0.1') means nothing can ever connect over
// IPv6 loopback, so a page at that origin cannot exist. A third string to keep in sync for an
// unreachable address is the rot this guard exists to avoid.
export const allowedOrigins = (port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`];

// True when the request may proceed.
//
// An ABSENT Origin passes: it is not a browser cross-origin request. curl, the runbook's commands
// and every same-origin GET send no Origin at all, and a cross-origin GET's response is unreadable
// anyway. Present-but-unlisted rejects, which is what `Origin: null` — a sandboxed iframe or a
// file:// page — arrives as.
//
// Exact string match, never a prefix or a substring: `http://localhost:4747.evil.com` and
// `http://localhost:47470` both start with an allowed origin.
export function originAllowed(origin, port) {
  if (origin === undefined || origin === null || origin === '') return true;
  return allowedOrigins(port).includes(origin);
}
