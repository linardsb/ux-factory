# #434 — the ledger: what the agent did, refused and corrected on /factory stays readable

Epic #295. A read-only, persistent, chronological list beside the canvas, fed from the bus's `*`
channel and four `note()` sites in the replay driver, with the live region untouched.

1. `system/studio-ledger.mjs` — `createLedger()` (pure: `note`, `fold`, `rows()`, `onRow`),
   `describeAction`, `renderLedger({host, list})` (textContent only). KINDS = did · refused ·
   corrected · narrated · took-over. → verify: build-checks group 37 (stream order, five kinds,
   refusals by name, hostile text as text, unsubscribe).
2. Wiring — `studio.mjs` creates it beside the bus and renders it where `[data-studio-ledger]`
   exists; `studio-verbs.mjs` gets one `refuse(action, sentence)` helper over its five `Refused:`
   sites (say + note, one string); `replay-driver.mjs` notes every beat in `advance()` (op → did,
   note → narrated, denied → refused, the fence's message verbatim), a counted `corrected` row in
   `relayout()`, the board refusal in `reflect()`, the take-over in `onTouch`.
   → verify: chromium probe of the four AC rows; mutation (relayout note removed) red; live-region
   write count on the committed run equal before/after (observed).
3. `factory.html` mount (hidden, empty at rest) + one sentence; `studio.css` token-only block;
   `instance.html` carries no mount.
4. `tooling/studio-journey.mjs` `ledgerPass` — the four running-page ACs on three engines.
5. Regenerate `loc-summary.json` (file count 78 → 79 shows on /approach), the /factory and /approach
   baselines (Docker), CLAUDE.md map + counts, gates.md row 37.
