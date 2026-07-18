# Review — PR #24 · round 2 (fresh code-reviewer pass + fixes)

**Ticket** #5 · Epic #1 · **Head** `feature/trace-recorder-player` → **Base** `feature/agentic-bridge` · reviewed at `82cea6b` · fixes landed in `c212912` + `6172eda` · **Recommendation: ✅ APPROVE**

Round 1 (`pr-24-review.md`, posted 2026-07-18 08:02) approved at `82cea6b` with follow-ups. This round ran an independent code-reviewer pass in a clean worktree, which surfaced **one new finding round 1 missed**, then landed fixes for it plus round 1's two cheap, well-specified items. Everything else round 1 deferred is now tracked in a follow-up issue.

## New finding (this round)

### Medium — the Bash node-only fence was not actually enforced (fixed in `c212912`)
Proven by the committed raw trace itself: two Bash steps with `"command":"true"` recorded `ok:true` with real execution-shaped responses. The permission layer's fast path auto-allows "trivially safe" commands **without ever consulting `canUseTool`** — so the fence never saw them, while the code and report framed the node-only rule as a safety-critical guarantee.

**Fix:** `recordRun` now wires the same fence into a **PreToolUse hook**, which fires before every tool execution, fast path or not — denying via `permissionDecision: 'deny'`, adding no opinion on allow, failing closed on fence error. The reviewer-suggested `permissionMode: 'dontAsk'` was checked against the bundled CLI and **rejected**: dontAsk auto-denies *before* consulting `canUseTool`, which would have broken the fence's legitimate Write/Edit/node allows.

**Verified live** (two real scratch-dir Haiku runs through the shipped `recordRun`, ~$0.17): `true` — the exact fast-path bypass command — and `echo …` are both denied (the agent's summary quotes the fence's denial message verbatim) while `node -e "console.log('node-ok')"` still executes `ok:true`. No shipped trace content touched (honesty contract).

## Round-1 items landed this round

- **Medium (curated↔raw pairing), fixed in `6172eda`:** `validate-trace.mjs` now requires each curated trace's sibling `<slug>.raw.jsonl` to exist with a matching `meta.sessionId` — a `--force` re-run that was never re-curated now fails loudly. Negative-tested both ways (missing sibling; mismatched sessionId); the committed pair still ✓.
- **Low (`.env` fence case-sensitivity), fixed in `6172eda`:** secrets regex now `/i` — a Write to `.ENV` on macOS's case-insensitive filesystem no longer bypasses the deny.
- **Known gap (README marker regex), fixed in `c212912`:** `traces/README.md` now documents the shipped scan-every-line, marker-alone-on-its-line, last-marker-wins parse instead of the plan-era start-anchored regex.
- Also in `c212912`: `validate-trace.mjs` rejects `artifact.path` values whose `..` segments escape the repo root (this round's Low; negative-tested).

## Deferred to follow-up issue (round-1 items, unchanged)

Secret-pattern redaction over recorder output (round-1 Medium — design work, shipped trace verified clean) · `trace.html` token fallback mismatches · `--dry` cwd isolation · player result-stat guards · `destroy()` requirement note for #10.

## Validation

| Check | Result |
|---|---|
| `node tooling/validate-trace.mjs` (after all fixes) | ✓ both traces, 23 steps · 4 phases · 1 artifact |
| Negative tests: `..` escape · missing raw sibling · sessionId mismatch | ✓ all fail naming `file:line: field` |
| `node --check` on all touched .mjs | ✓ |
| Live fence verification (2 real Haiku scratch runs) | ✓ bypass class denied, node allowed |
| Honesty contract | ✓ no `traces/` content touched by any fix |

**A human now reviews the code + both review rounds and merges.**
