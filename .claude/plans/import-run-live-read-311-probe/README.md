# #311 PR B — Phase 0 probe captures (2026-09-27)

Verbatim captures of Brilliant's live read, `@brilliant-hq/mcp` 0.1.8. Planning artefact for
`.claude/plans/import-run-live-read-311-pr-b.md`; the implementer copies the listed files into
`import/fixtures/brilliant-live/` (Task 1.1).

- `down/` — Agent SDK, no tab paired: `connected`, zero Brilliant tools, init at 62.8 s. $0.
- `up/` (discarded), SDK runs before pairing: zero tools at 63 s. $0.028 + $0.013.
- `raw/` — a Node stdio JSON-RPC client, no model, $0. `00-*` unpaired; `1x`/`3x`/`4x` paired
  (one selected · nothing selected · two selected). `*.full.b64` hold the stripped PNG data.
- `sdk/` — Agent SDK while paired, $0.238: what the PostToolUse hook's `tool_response` carries
  (the content array only — `_meta` is stripped; the image is `{type, source:{data, media_type}}`;
  an `isError` result and a -32602 arrive at PostToolUseFailure as `error` text).
- `scripts/` — the throwaway probes, parked as `.txt` (drift-check syntax-checks tracked `.mjs`).

The canvas was an unbound scratch `playground` (a raw #000000 rectangle and a "Pay" text); the spike C
fixture no longer exists. Pairing needed Brave's "apps on device" (loopback) permission.
