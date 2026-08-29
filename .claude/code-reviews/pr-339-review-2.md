# PR #339 review — the discovery spine (#284)

**Head** 8f25acc · **Base** main @ `4ac9fb22baadfdce0ab542d603a12562cb57f123` · **Round** 2 · **Reviewer** code-reviewer agent (clean context) + numbers pass by the session · 2026-08-29

## Summary

Round 2 covers commit `8f25acc`, which claims F1–F5 closed plus one finding of its own (an optional-call short-circuit that skipped the transcript append when no listener was attached). All five are closed, each re-derived rather than read: the F1 probe (a directory at `transcript.jsonl`, so the append throws) returns `isError` and leaves the holder at 0 ops; the F3 mutation (drop the entryMode guard) turns exactly two case-16 assertions red; no `onLine?.(append` site remains. The base has not moved, so the guarantees pass did not trigger.

Three new items, none above Medium. Codes continue from round 1.

## Issues

**F6 · Medium · `tooling/build-checks.mjs:5781-5791` (group 30 case 16)** — the case calls `openSession` with `provenance: "fictional"`, which `resolveRunRoot` maps to `REPO_DIR/discovery/<slug>` — the real tree, not `TMP`. Group 30's own header says every package-root case uses a temp directory. Two consequences, both observed: with a guard removed the mutation creates `discovery/ci-refused-never-written/` in the working tree; and a stale directory of that name (no code defect) fails the final `existsSync` assertion, so the gate can go red on a filesystem leftover. **Fix:** assert the ordering from source the way case 12 does (every `bad(` / `selectDepth(` in `openSession`'s body indexes before its `mkdirSync(`), which tests the invariant without touching disk; or, at minimum, name case 16 as the stated exception in the header and `rmSync` that exact slug before and after.

**F7 · Low · `portal/lib/discovery-transport.mjs:105`** — `onLine?.(written)` now sits inside the `try` whose `catch` returns `isError`. A listener that throws (an SSE write racing a closed socket) tells the agent the op was refused when it was filed and folded. `fenceHooks`' `record()` already wraps its listener call to stderr for this reason. **Fix:** move `onLine?.(written)` after the `try`, or wrap it as `record` does.

**F8 · Low · `.claude/reports/discovery-spine-run-package-284-report.md` §Review round 1** — "a truncated `run.json` / `.jsonl` throws naming the file and line": `readRun` passes no line, so `run.json` names the file only. Numbers pass: the subject overclaims by one word. **Fix:** "naming the file (and the line, for `.jsonl`)".

## Round-1 findings

| | Verdict | Evidence |
|---|---|---|
| F1 | closed | append at :103 precedes `state.current = next` at :104; EISDIR probe → `isError`, 0 ops (observed) |
| F2 | closed | §The fence now labels the allow path "observed in spike 1 (#280), not re-observed here" |
| F3 | closed | five refusals at discovery.mjs:224-229 precede `mkdirSync` at :231; `threw` returns the Error so `.message` is right; mutation red on 2 assertions (observed) — but see F6 |
| F4 | closed | server.mjs:164-165 and :172-173, each with its own request's provenance |
| F5 | closed | `parseNamed` after `bad`, no TDZ; `readJsonl` captures the line index before filtering blanks, so the number is the file's line |

## Numbers pass

Every figure in the delta re-derived on `8f25acc`: "three sites" → 3 `onLine?.(written)`, 0 old pattern (observed) · "five refusals" → five `refusedOpen` assertions · "fails both assertions" → 2 red under the mutation (observed) · "ledger at 0 ops" → probe (observed) · CI `verify` and `visual` ran on `8f25acc`, not the prior head (observed via `gh run list`). The one overclaim is F8.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ all 30 groups pass |
| `cd portal && node lib/discovery-transport.mjs --preflight` | ✅ 7/7, zero tokens |
| portal boots, `/api/health`, both F4 routes answer | ✅ |
| CI `verify` · `visual` on `8f25acc` | ✅ · ✅ |
| `gen-loc-summary --check` | ✅ no drift |

## Done well

- F1 is a real reorder verified by failure injection, not code moved near the bug; the short-circuit find is a genuine latent defect caught by the probe.
- `readJsonl` numbers lines before filtering blanks — the easy thing to get wrong.
- Case 16 is a behavioural drive that goes red for the right reason; F6 is about where it writes, not whether it bites.

## Recommendation

**Approve once F6 lands** (minutes: a source-order assertion, or a scoped cleanup plus a header amendment). F7 and F8 ride along. Posted as a comment: a solo repo cannot self-approve.
