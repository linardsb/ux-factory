# Report — #349: the warmup bracket observed, replaced by a tool-name gate, verified on a recording

Ticket #349 (epic #279, #338 F7). Plan: `.claude/plans/discovery-bracket-trace-349.md`. Branch
`fix/349-bracket-trace` off `main` at `7ec618f` (PR #350 merged).

## What was done

- **The observation was bought** (plan M2): `discovery/bracket-trace-1/`, the parenting fixture's
  twelve answers driven through the drawer with the bracket still in place and the trace armed.
- **The fix follows the observation** (M3, candidate A): both recording hooks in
  `portal/lib/discovery.mjs`'s `fenceHooks` are gated by the **tool name** — `isMcpToolName`, a new
  exported predicate — and the `SubagentStart` / `SubagentStop` hooks are removed. The instrument stays
  as `DISCOVERY_FENCE_TRACE` (tool + recorded per denial), off by default.
- **The gate was mutated first** (M4): group 30 case 20 rewritten, case 22 slimmed.
- **The docs the fix makes true** (M5): `discovery/README.md` §File shapes, §The parenting fixture, the
  package list and a new §The fence observation; `discovery.mjs`'s two headers; group 30's summary
  clause; `gates.md` group 30.
- **Verified on a second recording** (M6): `discovery/bracket-trace-2/`.

## The observation (bracket-trace-1, observed)

Same twelve answers as `instrument-loans-1` (`ref` / `turn` / `question_id` / `kind` / `text` equal,
by compare). 12 of 12 turns, **$0.513**, fingerprint `7efdde37` on every turn. The trace
(`.claude/reports/discovery-bracket-trace-349/bracket-trace-1.trace.jsonl`, 47 lines):

| turn | SubagentStart | SubagentStop | denials | recorded | `starts` at denial |
|---|---|---|---|---|---|
| t1 (create) | 3 (Explore, Plan, Bash) | 2 | 3 Bash | 0 | 3 |
| t2 (resume) | 0 | 3 | 2 Bash, 2 Glob | 4 | 0 |
| t3–t8 (resume) | 0 | 3 each | 0 | 0 | — |
| t9 (resume) | 0 | 2 | 2 Bash, 1 Glob | 3 | 0 |
| t10–t12 (resume) | 0 | 3 each | 0 | 0 | — |

**Candidate A, with a mechanism.** `SubagentStart` was delivered on the session's create turn only —
0 of 11 resumed turns — while `SubagentStop` arrived on every turn. Every turn after the first is a
resume (the transport's resume-per-turn), so the bracket was structurally absent for the whole run,
not merely late. The variance across recordings (3, 79, 4, and now 7) is how much the warmup did
after the hooks were live, with nothing suppressing it. Candidate B (closed on the last stop) is ruled
out for these turns: there was no start to close.

**Why the CLI drops the start hook on a resumed session is not observed.** It is inside `cli.js`
(the warmup fires from `p$9` at startup; the start hooks run from `MO0` inside the agent runner);
this run shows the delivery, not the cause, and the fix does not depend on the cause.

The transcript carries **8** `denied` lines: the 7 warmup built-ins above, plus one that IS the
agent's — see F1.

## The fix

Under `tools: []` the main session is advertised the op server's `mcp__` tools and nothing else
(the init message's tool list; preflight PF1 compares it to `OPS`). The CLI's warmup agents run with
`mcpClients: []` and the built-in set (`cli.js` `p$9` → `BP0`, read in the SDK 0.1.77 bundle). So an
`mcp__` name is the only name the discovery agent can call and a built-in the only name a warmup
agent can call — a discriminator that needs no hook ordering. A `PreToolUse` denial is recorded iff
`isMcpToolName(tool_name)`; denied either way. `PostToolUseFailure` was already tool-gated (PR #344
F1). No `discovery-postures.mjs` edit, so no fingerprint moved (both packages stamp `7efdde37`); no
verb, no param, no transcript edit.

What the rule cannot see: an SDK that stopped honouring `tools: []` — the agent's own Bash call would
be denied and unrecorded, a lost receipt rather than a false one. PF1 is the run-time check.

## The mutation (observed)

With the fix in, `build-checks` is green. With the bracket put back — a `Set`, the two bracket hooks,
`recorded = subagents.size === 0` — group 30 fails **13** assertions, the first two being:

- `case 20: fenceHooks must register exactly PreToolUse and PostToolUseFailure … (got PostToolUseFailure,PreToolUse,SubagentStart,SubagentStop)`
- `case 20: a built-in denied with no SubagentStart ever delivered must record NO line — it is the CLI's warmup, and the CLI does not deliver SubagentStart on a resumed turn (disk 3, heard 3)`

That second line is the case the bracket gate could never fail, because #343's case 20 always fired
the start first — the ticket's "check that cannot fail". Restored to the fix: green.

## The verification (bracket-trace-2, observed)

Same twelve answers, recorded after the fix with `DISCOVERY_FENCE_TRACE` armed. 12 of 12 turns,
**$0.565**, fingerprint `7efdde37`, 15 ops, 3 `file_evidence` (t1, t2 ×2). The trace
(`bracket-trace-2.trace.jsonl`, 16 lines): warmup denials on t2 (3), t3 (4), t4 (3), t7 (3), t10 (3)
— Bash ×14, `ListMcpResourcesTool` ×2 — **all `recorded: false`**. The transcript carries **zero**
`denied` lines. The warmup was not quiet; it left no line.

## Deviations from the plan

**D1 — the drawer was driven by headless Chromium (Playwright 1.59.1), not by hand**, the #347
session's driver with the slug parameterised. Real form controls, real `/api/discovery/*` routes, real
origin guard, the server wrote `answers.jsonl`. Same deviation and reason as PR #345 and PR #350.

**D2 — both packages are committed as labelled fixtures** (`discovery/bracket-trace-1/`,
`discovery/bracket-trace-2/`, each with a projected `prd.md`). The ticket asked for one verifying
recording; the observation package is the pairing evidence for the trace and stays. Neither is read
by group 32.

**D3 — the instrument was renamed** `DISCOVERY_BRACKET_TRACE` → `DISCOVERY_FENCE_TRACE` and slimmed
(no `open` set, no `starts` — there is no bracket to report on). It was uncommitted before this PR,
so nothing depended on the old name.

## Findings

**F1 — `file_evidence` sent `url: ""` beside a `ref`, and the applier refused it** (bracket-trace-1,
t10: `exactly one of "url" or "ref" must be non-null (got both)`). The agent then filed the decision
without the evidence row. An empty string is "non-null" to the applier and to `TOOL_SCHEMA`'s
`string|null`; the model treated it as absent. Not this ticket's: an applier change is under the
op-verb lock and a description change moves the fingerprint. Recorded here for a follow-up decision
(treat `""` as absent in the applier, or say "null, not an empty string" in the tool description).

**F2 — `file_evidence` counts vary across recordings of one sheet: 0 succeeded on bracket-trace-1
(the t10 refusal), 3 on bracket-trace-2, 3 on instrument-loans-1's current recording.** One recorded
session each; not a regression claim in either direction, and not this ticket's subject.

**F3 — a stale portal on 4747** answered `/api/health` without `bootSha` during this session (a
process older than #338 F1). Not used; both recordings went through a fresh process on 4749 booted
from `7ec618f`. Left running — it is not this branch's.

## Validation results

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 32 groups pass` (observed, working tree) |
| the bracket put back as a mutation | ❌ 13 failures in group 30, case 20's "no SubagentStart ever delivered" among them (observed), then restored |
| `cd portal && node lib/discovery-transport.mjs --preflight` | ✅ all 8 rows, zero tokens (observed) |
| `node tooling/drift-check.mjs` | ✅ all twelve checks green on the staged tree (observed) |
| `node discovery/prd-projection.mjs bracket-trace-1` / `-2` | ✅ 11 sections, 12 ops · 11 sections, 15 ops (observed) |
| recorded run with zero built-in `denied` lines AND a busy warmup | ✅ bracket-trace-2: 0 denied, 16 warmup denials in the trace (observed) |
| visual regression | not run — no shipped page touched; `portal/` is never deployed |

Paid: $0.513 + $0.565 = **$1.078** over 24 turns (observed, summed over `turnStats`).
