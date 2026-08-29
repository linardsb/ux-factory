# PR #339 review — the discovery spine (#284)

**Head** 6b50181 · **Base** main @ `4ac9fb22baadfdce0ab542d603a12562cb57f123` · **Round** 1 · **Reviewer** code-reviewer agent (clean context) + numbers pass by the session · 2026-08-29

## Summary

The spine does what the ticket says: one banked question per turn, the answer server-written before the SDK enters, at most one closing op through an in-process MCP tool, a run package on disk that survives reload and restart. The three-module split is real and CI-enforced by absence; answer-by-reference has teeth at the applier, not in prose; the origin guard runs before the five routes and every body parameter is named. The committed run is internally consistent and its one `denied` line is a real mid-turn R2 correction. Spike-2 verdict (clean) is supported by the transcript.

Two Medium findings, both small; three Low. Nothing Critical or High.

## Issues

**F1 · Medium · `portal/lib/discovery-transport.mjs:97-100`** — the op handler advances `state.current` before the durable write. If `appendTranscript` throws (`ENOSPC`, `EACCES`), the catch returns `isError` to the agent, but the in-memory ledger already holds the op as filed and, for a closer, the turn as closed; a same-turn retry is refused as "already closed" while `transcript.jsonl` has no such line, so the op is lost for that turn. The next `runTurn` rebuilds from disk, so the damage is one turn — but it breaks the file's own "disk is authoritative" invariant, and `fenceHooks`' `record()` a few lines down already shows the discipline. **Fix:** append first, then assign `state.current`; or revert the holder in the catch.

**F2 · Medium · `.claude/reports/discovery-spine-run-package-284-report.md` §The fence** — "the `PreToolUse` hook fired for each [MCP call]" is stated as this run's observation. Nothing in this run logs the allow path (the fence hooks write only on `PostToolUse` / `PostToolUseFailure`), so the sentence is spike 1's observation (#280's verdict on #279) carried forward. The deny path is correctly labelled unproven; the allow-path sentence needs the same provenance label ("observed in spike 1, not re-observed here"). Numbers-pass finding: a claim credited to a run that did not produce it.

**F3 · Low · `tooling/build-checks.mjs:208`** — `openSession` is imported and never used. It also marks a gap: `openSession`'s five refusals (entryMode, frontEnd, posture, non-null branch, unknown depth) and its resume-vs-create branch have no CI case; case 9 hand-writes the three files instead. Either drive them from the import or drop it.

**F4 · Low · `portal/server.mjs:160-170`** — GET `/api/discovery/session` and POST `/api/discovery/close` call `resolveRunRoot` without `assertProvenanceRoot`, unlike `openSession` and `runTurn`. Not exploitable today (`JOBS_DIR` is an import-time const already validated at creation), but a future route copied from this shape inherits the gap. Add the call for consistency.

**F5 · Low · `portal/lib/discovery.mjs:201-204`** — `readRun` / `readJsonl` surface a truncated file as a bare `SyntaxError` with no path, against the module's own naming discipline. Wrap and re-throw naming the file.

Informational: `withDiscoveryRunLock` is global across slugs and its message names "the same run package" for a cross-slug conflict too; mirrors `builder.mjs` verbatim, so a precedent, not a new mistake.

## Numbers pass

Every figure in the PR body and the report was re-derived from `discovery/spine-meridian-1/` and the tree, not from the session: 7 SDK turns · 48 105 ms · $0.1011 · 2 969 output tokens · per-turn rows · 10 lines (6 text / 3 op / 1 denied) · 5 routes · 7 PF rows · 30 groups · 2 × `min-height: 44px`. Derived figures (481 s, 70 turns, $1.01) are labelled derived and the arithmetic reproduces. The thin answer does not string-match the weak-answer note (checked). The one unsourced claim is F2.

Documented deviations D1–D4 accepted as intentional; no undocumented divergence from the plan found.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ all 30 groups pass |
| `cd portal && node lib/discovery-transport.mjs --preflight` | ✅ 7/7, zero tokens |
| portal boots, `/api/health` | ✅ |
| CI `verify` · `visual` | ✅ · ✅ |
| `gen-loc-summary --check` | ✅ no drift |

## Done well

- SDK isolation proven by absence (group 30 case 12 matches import lines, not substrings); the lazy import sits after every guard.
- `appendAnswer` has one call site, before the SDK enters; no op parameter carries text.
- `assertRunSlug` is the single choke point for every disk path; no traversal surface.
- `sessionId` recorded at SDK init, cursor derived from closed turns only — restart resume is by construction, and it was exercised.
- `discoveryConfig()` strips `weakAnswer` at the source (read, not trusted).
- The drawer escapes every dynamic string; no raw `innerHTML` of agent or human text.
- Group 30 is data-driven throughout; the four mutations in the report corroborate it.

## Recommendation

**Approve once F1 and F2 land** (both are minutes: reorder two lines; relabel one sentence). F3–F5 can ride along or defer. Posted as a comment: a solo repo cannot self-approve.
