# Implementation Report — subagent warmup calls recorded as the agent's refusals (#343)

**Plan**: `.claude/plans/discovery-warmup-refusals-343.md`   **Branch**: `fix/343-warmup-refusals` (off `origin/main` at `6ae6939`, PR #342 already merged)   **Status**: COMPLETE, one run-time claim unobserved (see §What the probe did and did not observe)
**Epic**: #279 · **Fixture**: `discovery/instrument-loans-1/` — read, never edited

*Observed* means read from the named command's output or file on 2026-08-31, on this machine, SDK 0.1.77
(bundled CLI 2.0.77), Node v20.20.2. *Derived* shows the arithmetic or the source line. *Expected* is an
assumption.

## Summary

The fence hook recorded every out-of-fence PreToolUse as a `denied` line, and under `tools: []` the only
caller that ever reaches that branch is Claude Code's own subagent warmup. The hook input cannot tell a
warmup call from the main session's (the ticket's `agent-` basename test has nothing to match on — see
§Premise correction), so `fenceHooks` now brackets denials between the SDK's `SubagentStart` and
`SubagentStop` hooks: a set of `agent_id`s, a denial recorded only while it is empty, denied either way.
`denyReason` and `fenceHooks` moved into SDK-free `portal/lib/discovery.mjs` so build-checks group 30
runs the hook functions in CI (case 20, observed red before the guard, green after). `discovery/README.md`
now defines a `denied` line as the discovery agent's own refused call and names the three warmup lines on
`instrument-loans-1` t12 as pre-#343 artefacts that stay. Step 2 (`CLAUDE_CODE_REMOTE`) was dropped.

## Premise correction — the ticket's step 1 mechanism does not exist in this SDK

Observed in `portal/node_modules/@anthropic-ai/claude-agent-sdk/cli.js`:

- `WE(A, Q)` builds the base hook input: `{ session_id: B, transcript_path: Es(B), cwd: l1(), permission_mode: A }`
  with `B = Q ?? q0()`; `q0()` returns `f0.sessionId`, the global session id.
- `AM0` (executePreToolHooks) spreads `WE(Z)` — ONE argument — so `transcript_path` is `Es(q0())`, the
  main session's `<sessionId>.jsonl`, for a sidechain's call too. The sidechain files themselves carry
  `"sessionId": "0e3d30e2-…"` (the main session's) beside `"agentId": "a047a6c"`.
- `lk(agentId)` → `agent-<id>.jsonl` enters a hook input in one place: `GM0`'s SubagentStop
  `agent_transcript_path`. `createHookCallback` forwards `input: B` unchanged.
- `coreTypes.d.ts:176–187` — `BaseHookInput` is `session_id · transcript_path · cwd · permission_mode?`;
  `PreToolUseHookInput` adds `tool_name · tool_input · tool_use_id`. No agent field.

What does identify the caller: `MO0(agentId, agentType)` fires SubagentStart and is awaited
(`for await … of MO0(H, A.agentType, x.signal)`) inside the Agent tool's `call` before the sub-loop; the
warmup goes through that tool (`Ts.call({ prompt: "Warmup", subagent_type, … })`); `GM0` fires SubagentStop
with `agent_id`. `eG7` merges the SDK-registered hooks (`RuA()`) before it consults app state, and `$M0`
includes a matcher-less hook for every event, so both are delivered with no `toolUseContext`. The fix
brackets on those two events. A check asserting behaviour on an `agent-*.jsonl` `transcript_path` would
pass while proving nothing about run time, so it was not written.

## Step 2 (CLAUDE_CODE_REMOTE) — dropped, per the ticket's rule

Observed: 7 exact `CLAUDE_CODE_REMOTE` uses in `cli.js` (excluding `CLAUDE_CODE_REMOTE_*`). Beyond `p$9`
(the warmup skip) the flag also: sets the telemetry field `isClaudeCodeRemote`; alters an auth-source check
(`!G0(process.env.CLAUDE_CODE_REMOTE)` on the `ANTHROPIC_API_KEY` / `apiKeyHelper` branch); disables
`EnterPlanMode` and `ExitPlanMode` (`isEnabled()` false); enables `bash_progress` stream events; sets
`NODE_OPTIONS --max-old-space-size=8192` at entry. Six effects beyond the warmup → dropped.

## Evidence the bug is what the ticket says (observed)

`~/.claude/projects/-Users-Berzins-Desktop-Linards-current-ux-factory-discovery-instrument-loans-1/`:
72 `agent-*.jsonl` files, every one opening with a user message `"Warmup"` and `"isSidechain": true`; two
main-session files. For the fixture's t12: three sidechains opened at 11:21:27.049–.052 (the three warmup
agents); `agent-aec09c5.jsonl` carries 3 `tool_use`; the transcript's three `denied` lines are stamped
11:21:34.745 (Bash `pwd`, Bash `ls -la <root>`, Glob `**/*.{ts,js,json,md}`); the main session file
(`sessionId` per `run.json`) has 0 lines in that second and its only `tool_use` name is
`mcp__discovery__record_decision` (×12). The warmup Bash results in the sidechains carry **our**
`denyReason` text with `"is_error": true` — the fence is what denied them; "the CLI denies those itself"
in the ticket is not what the files show. Across both sessions in that directory, 4 of 72 sidechains made
a tool call at all.

## Tasks completed

- Task 1 `denyReason`, `fenceHooks` (SubagentStart / SubagentStop / PreToolUse / PostToolUseFailure, the
  set, the two guards), the corrected claim above `allowsToolName` → `portal/lib/discovery.mjs` (UPDATE)
- Task 2 imports; the fence section replaced by a pointer (its BOUNDED CLAIM deleted); `probeParenting`
  reads the on-disk transcript's `denied` tools before `rmSync` and the CLI prints the count
  → `portal/lib/discovery-transport.mjs` (UPDATE; `deniedLine`, `toolNameFor` no longer imported there)
- Task 3 group 30 case 20; 30.14's comment; the header line; the import; the summary
  → `tooling/build-checks.mjs` (UPDATE)
- Task 4 the `denied` bullet and the fixture paragraph → `discovery/README.md` (UPDATE)
- No file under `discovery/<slug>/` was opened for writing. `portal/lib/discovery-postures.mjs` untouched;
  the fingerprint printed by the probe is `df6fbc35a5d91537dc417288b67c123e`, the same as before.

## The red run (mutate first)

Step A landed the move and case 20 with the guard ABSENT — behaviourally the pre-fix code. Observed,
`node tooling/build-checks.mjs`, exit 1:

```
build discovery      ✗  7 failure(s)
    · case 20: a denial inside a SubagentStart…SubagentStop bracket must record NO line — it is the CLI's warmup, not the discovery agent (disk 3, heard 3)
    · case 20: a sidechain PostToolUseFailure must record no line either (disk 4)
    · case 20: with one warmup agent still in flight a denial must still record nothing (disk 5)
    · case 20: after the last SubagentStop a denial must be recorded again (disk 6, heard 6)
    · case 20: a main-session applier refusal must be recorded VERBATIM on PostToolUseFailure
    · case 20: an allowed call must record nothing (disk 7)
    · case 20: junk bracket events must leave the main session recording (disk 8)
build ✗  7 failure(s)
```

The other 31 groups were green in that run. Step B added `if (mainSession())` on the two `record(...)`
calls (`portal/lib/discovery.mjs:247,255`); the same command then exited 0.

## Validation results (observed)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 32 groups pass`, exit 0 (run twice: after step B, and after the summary-wording edit) |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay` |
| `cd portal && node lib/discovery-transport.mjs --preflight` | `pre-flight ✓  all 8 rows pass, zero tokens` |
| `cd portal && node lib/discovery-transport.mjs --probe-parenting` (PAID) | `filed: record_decision seq 4 at solution, parent_id 2` · `in-turn parent corrections: 0` · `denied lines on the temp root's transcript: 0` · `cost 0.11081569999999999 USD · 19581 ms · 2 SDK turns` · `probe PARENTED`, exit 0 |
| `node --check` on the three edited `.mjs` | clean |

## What the probe did and did not observe

The probe met all three stated criteria (PARENTED, 0 denied lines, no Bash or Glob line). It does **not**
show the bracket suppressing a warmup call, because in that run the warmup made none: its project dir
(`~/.claude/projects/-private-var-…-discovery-probe-PeP5kJ/`) holds three sidechains, each opening with
`"Warmup"` at 15:33:40.33, each with `tool_use=0`. The pre-fix code would also have left 0 lines on that
run. Derived from the fixture's sidechains, an Explore warmup calls a tool on about 1 run in 6 (4 of 24).

So: the hook logic is proven pure (case 20, red then green); the run-time premise — SubagentStart reaches
the SDK before the warmup agent's first PreToolUse — is derived from `cli.js` (`MO0` awaited before the
sub-loop; hook callbacks are awaited control requests) and **not yet observed**. The ticket authorised one
paid check, so no second probe was run. Group 30's summary and the plan's R1 say exactly this.

## Deviations from the ticket

- D1 Step 1's mechanism replaced (transcript_path basename → SubagentStart/Stop bracket). Reason and
  evidence in §Premise correction; the ticket's intent — deny, record nothing, a `denied` line means the
  discovery agent itself — is what landed.
- D2 Step 2 dropped, per the ticket's own rule (§Step 2).
- D3 The group 30 check tests the bracket, not an `agent-` path — a check on an input shape the SDK never
  produces cannot fail for the right reason.
- D4 The bracket also gates `PostToolUseFailure`, not only PreToolUse: same rule, one place, so a
  subagent's own tool failure never lands as the agent's refusal either. Case 20 asserts it.
  **Reversed in review round 1** (F1, below): that hook is now gated by the tool name, not the bracket.
- D5 `probeParenting` gained a `denied` field and one print line so the paid check is observable from
  its output rather than from a deleted temp root. Nothing else in the probe changed.
- D6 The transport's `fenceHooks` stderr prefix changed from `discovery-transport:` to `discovery:` with
  the move.

## What the gate cannot reach

Whether the CLI fires SubagentStart before a warmup agent's first tool call (derived, above — and since
round 1 it bounds PreToolUse's record only; an op-tool refusal is kept regardless); whether a
fence deny blocks an MCP call (#287's); the model's behaviour under an unchanged prompt on a later date or
a newer SDK (the transport header's standing caveat — a later SDK adding `agent_id` to PreToolUse inputs
would leave the bracket working). A `SubagentStop` that never fires suppresses recording only for the rest
of that turn's `query()`; under `tools: []` the main session's PreToolUse has nothing to suppress, and its
`PostToolUseFailure` — the applier refusals — is no longer under the bracket at all.

## Not touched

`portal/lib/discovery-postures.mjs`; every `transcript.jsonl`, `answers.jsonl`, `run.json`;
`discovery/allergen-matrix-1/` (another session's untracked run) and the rest of the tree's untracked
files. Staged by explicit path.

## Review round 1 (PR #344, `.claude/code-reviews/pr-344-review.md`)

Two findings, both fixed in this PR; neither touches the prompt surface, so the fingerprint
`df6fbc35…` and the fixture stand.

- **F1** (medium) — `PostToolUseFailure` was gated by the bracket (D4), so an applier refusal landing
  while a warmup agent was still in flight (the fixture's warmup sidechains were still open ~7 s after
  CLI start) was dropped silently. It is now gated by the tool: `allowsToolName(input.tool_name)`
  records, the bracket is not consulted. A discovery-agent refusal is always on an op tool and a warmup
  failure never is; and `cli.js` fires the event from the tool's execution catch only (one call site,
  `MG7`), never for a PreToolUse deny, so a non-op failure records nothing in either session. Case 20
  gained both assertions — an op-tool refusal inside the bracket recorded verbatim, a main-session Bash
  failure unrecorded — and the first was proven red under the old gate before the fix:

  ```
  $ node tooling/build-checks.mjs          # PostToolUseFailure gated by mainSession(), case 20 as now
  build discovery      ✗  4 failure(s)
      · case 20: an applier refusal landing INSIDE a warmup bracket must still be recorded — PostToolUseFailure is gated by the tool, not the bracket (disk 1, heard 1)
      · case 20: with one warmup agent still in flight a denial must still record nothing (disk 1)
      · case 20: after the last SubagentStop a denial must be recorded again (disk 2, heard 2)
      · case 20: a main-session applier refusal must be recorded VERBATIM on PostToolUseFailure
  build ✗  4 failure(s)
  ```
  (observed 2026-09-01; the last three are the count cascade behind the first.)

  D4 is thereby reversed for this hook; the SubagentStart-before-first-PreToolUse residual now bounds
  PreToolUse's record only.
- **F2** (low) — `discovery-postures.mjs`'s fingerprint docblock named `denyReason` as the transport's;
  it moved to `discovery.mjs` in this PR. One word, outside the hash.

## Next step

Open PR with `Closes #343`. Optional, ~$0.11 each: repeat `--probe-parenting` until the probe's project dir
shows a warmup sidechain with `tool_use ≥ 1` and the transcript still reports 0 denied lines — that is the
run-time observation this report does not have.
