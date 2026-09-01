# PR #351 review — the fence records a denial by tool name (#349)

**Head** `0470dca` · **Base** `main` @ `7ec618fc0a35a158f8ad79159b5d1e2ce406ba42` · first round · mergeState CLEAN

**Recommendation: approve.** No critical or high issues. Five low-to-medium items, none blocking; F1
is the only one I would fold in before merge, and it is a comment in an untouched file.

## Summary

The ticket bought an observation, designed the fix against what it saw, mutated the gate before
trusting it, and paid for a second recording to verify. That is the whole shape #349 asked for, and
the evidence is committed rather than narrated: `bracket-trace-1`'s trace is the smoking gun
(`SubagentStart` ×3 on `t1`, never again across eleven resumed turns, while `SubagentStop` fires on
every one), and `bracket-trace-2` is the control that would have failed had the warmup gone quiet.

The replacement discriminator is sound and needs no ordering. Under `tools: []` the main session is
advertised the op server's `mcp__` tools only; the CLI's warmup agents run with `mcpClients: []`
hardcoded in `BP0` (verified in the pinned SDK 0.1.77 bundle), so a built-in name can only be the
CLI's. `ListMcpResourcesTool` and `ReadMcpResourceTool` — the two names that look like MCP and are
not — are covered explicitly by case 20's false list.

## The numbers pass

Every figure in the PR body and the report was re-derived from the raw committed artefacts, not read
back from prose. All correct.

| Claim | Re-derivation | Verdict |
|---|---|---|
| `bracket-trace-1` $0.513 | `Σ turnStats.costUsd` = 0.513426 | observed ✅ |
| `bracket-trace-2` $0.565 | 0.564942 | observed ✅ |
| $1.078 over 24 turns | 1.078368; 12 + 12 | observed ✅ |
| `SubagentStart` on the create turn only, 0 of 11 resumed | trace-1: `t1` only | observed ✅ |
| `SubagentStop` on every turn | `t1` 2, `t2`–`t12` 3 (`t9` 2) | observed ✅ |
| trace-1 47 lines, the per-turn table | matches row for row | observed ✅ |
| trace-1 transcript 8 `denied` (7 warmup + 1 agent) | Bash ×4, Glob ×3, `mcp__discovery__file_evidence` ×1 | observed ✅ |
| trace-2 16 warmup denials over 5 turns, Bash ×14 + `ListMcpResourcesTool` ×2, all `recorded: false` | matches | observed ✅ |
| trace-2 transcript 0 `denied`, 15 ops | 12 `record_decision` + 3 `file_evidence` | observed ✅ |
| both packages stamp `7efdde37` | `7efdde37441fbd2591ba4a7dfeecdb6b` on all 24 turns | observed ✅ |
| the twelve answers byte-equal to `instrument-loans-1` | compared on `ref`/`turn`/`question_id`/`kind`/`text` | observed ✅ |
| the 79-line recording named six built-ins across eleven turns | `git show 42cca5e` → Bash 53, Glob 9, Grep 7, `ListMcpResourcesTool` 6, `ReadMcpResourceTool` 3, Read 1 = 79, 11 turns | observed ✅ |
| `instrument-loans-1` now four `denied`, Bash, `t4` and `t6` | matches the rewritten README paragraph | observed ✅ |
| gates.md "four true and fourteen false" | counted in case 20 | observed ✅ |
| SDK 0.1.77 | `portal/package.json`, lock and installed tree agree | observed ✅ |
| both `prd.md` files are the projection's bytes | re-ran `prd-projection --stdout`, diff clean | observed ✅ |

**The mutation, reviewer-run rather than derived.** A throwaway worktree at `0470dca` with the bracket
restored (the `Set`, the two hooks, `recorded = subagents.size === 0`) puts group 30 red with
**exactly 13** failures across cases 20 and 22 — the count the report claims, with its two quoted
lines verbatim, `(disk 3, heard 3)` included. Worktree removed. The check can fail, and it fails on
the case the bracket gate never could.

**The attribution question, closed.** `PF1` shows the main session's advertised list is exactly
`OPS` — `ListMcpResourcesTool` and `ReadMcpResourceTool` are not in it, so gating on `mcp__` drops no
real receipt. That is what makes the tool-name rule an attribution and not a guess.

## Issues

**F1 (medium) — `portal/lib/discovery-transport.mjs:409-410`: a retired claim survives as a verb.**
The parenting probe's comment reads "A Bash or Glob here is the CLI's warmup recorded as the agent's
refusal — **the defect #343 closed**." This PR is the proof that #343 closed nothing at run time: its
bracket was structurally absent on every resumed turn. The file is untouched by the diff, so the
sentence ships as a live, false attribution on a diagnostic surface — an operator running
`--probe-parenting` and seeing a `Bash` in `denied` would conclude the bracket regressed, when the
correct read is now that the tool-name gate broke or `tools: []` stopped holding. Under CLAUDE.md the
header is the specification, and this one now specifies the wrong ticket.
*Fix:* one sentence — "…recorded as the agent's refusal; since #349 the recorder gates on the tool
name, so a built-in here means the gate broke."

**F2 (low) — `portal/lib/discovery.mjs:259`: "outside the run root" is stated, not enforced.**
The header promises the trace names a file outside the run root; `traceTo` never checks it. Case 22
proves only that the *unarmed* instrument does not default into the package — it never drives an
armed path pointing inside one. Nothing else validates a run package's file set either (group 32
checks `run.json` and `prd.md` exist, not what else is there), so a misconfigured arming would put a
fourth file in a package meant for commit. Opt-in, off by default, single operator.
*Fix:* either resolve-and-refuse a path under `root`, or soften the sentence to operator discipline.

**F3 (low) — `DISCOVERY_FENCE_TRACE` is never named in `discovery/README.md`.**
The new §"The fence observation and its verification" says "with the fence trace armed" and the
§Workflow command block does not carry the variable, while case 22's own comment calls the trace a
standing criterion "the verify criterion needs again on every future re-observation". The README
names concrete levers elsewhere (`JOBS_DIR`), and it is the operator-facing page.
*Fix:* one line in §Workflow — `DISCOVERY_FENCE_TRACE=<path outside the run root>`.

**F4 (low) — the project `.mcp.json` is not fenced off, and the preflight cannot see it.**
`discovery-transport.mjs:144` sets `cwd: root`, which for a fictional run is `discovery/<slug>/`
**inside this repo**, one directory below a `.mcp.json` declaring a `codebase-search` server. Neither
`strictMcpConfig` nor `settingSources` is set, so whether the CLI merges that server into a real run's
advertised surface is undetermined from the bundle. `PF1` cannot answer it: the preflight's root is a
temp dir under `/var/folders`, outside the repo, so it verifies the advertisement in a different cwd
from every real run. **This does not weaken the fix** — a foreign `mcp__` name would still be
correctly attributed to the main session (warmup's `mcpClients: []` is unconditional) and still denied
by `allowsToolName`. Empirically no `mcp__codebase-search__*` name appears anywhere in either run's
transcript or trace, which is evidence rather than proof.
*Fix (follow-up ticket, not this PR):* `strictMcpConfig: true` on the query options, and a line in
gates.md's group 30 "cannot reach" clause noting the preflight's cwd differs from a run's.

**F5 (low, pre-existing) — the case label `30.20` is used twice**, at `tooling/build-checks.mjs:5992`
(#338's provenance default) and `:6114` (the fence hooks). Both are on `main` at `7ec618f`, so this PR
did not introduce it; naming it because a failure message reading "case 20" is now ambiguous between
two unrelated blocks. Rename the later one when group 30 is next touched.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 32 groups pass` (reviewer-run) |
| the bracket restored as a mutation | ✅ red — exactly 13 failures, the report's two quoted lines verbatim (reviewer-run, throwaway worktree, removed) |
| `cd portal && node lib/discovery-transport.mjs --preflight` | ✅ all 8 rows, zero tokens; PF1 advertised == `OPS` (reviewer-run) |
| `node tooling/drift-check.mjs` | ✅ all twelve checks green (reviewer-run) |
| `node discovery/prd-projection.mjs <slug> --stdout` ×2 | ✅ both committed `prd.md` files are the projection's bytes (reviewer-run) |
| CI `verify` | ✅ pass |
| CI `visual` | ✅ pass |
| visual regression, local | not run — no shipped page touched; `portal/` is never deployed |

## What is good

- **The observation was bought before the fix was designed.** #349 named two candidates that produce
  identical transcripts; the instrument was built to tell them apart, and the trace is committed as
  primary evidence rather than summarised. The report is explicit that *why* the CLI drops the start
  hook on a resumed session is unobserved, and that nothing depends on the cause.
- **The gate was mutated before it was trusted**, and the mutation reproduces exactly. This is the
  repo's own "check that cannot fail" doctrine applied to the check that replaced one.
- **Case 22 tests the instrument's failure modes**, not just its happy path: off by default proven by
  *both* the path and a listing of the run root, decisive when armed, and an unwritable path proven
  not to escape the hook or cost the real recording.
- **Scope discipline.** F1 in the report (`file_evidence` with `url: ""`) is logged for a follow-up
  rather than fixed inline, correctly — the applier is under the op-verb lock and a description edit
  would move the posture fingerprint. Both packages stamp `7efdde37`, so nothing moved.
- **The README paragraph now reads honestly in both directions**: the surviving warmup lines are
  named, counted and dated rather than cleaned up, and the sentence telling a reader how to read one
  (`an op tool is the agent, a built-in is the CLI`) is kept.
- **The removal is clean.** No module outside `discovery.mjs` and `build-checks.mjs` referenced the
  bracket hooks, and `appendFileSync` was already imported, so the SDK-free/zod-free invariant is
  untouched.

## Next

`piv-fix-review-findings` on F1 if you want it in this PR — a one-sentence comment edit in
`portal/lib/discovery-transport.mjs`. F2/F3 are cheap enough to fold in with it. F4 wants its own
ticket. F5 is housekeeping for whoever next touches group 30.
