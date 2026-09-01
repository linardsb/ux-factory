# Plan — #287: the read fence — one per-run allow-list predicate, two call sites, failing closed

Ticket #287 (epic #279). Branch `feat/287-read-fence` off PR #351's head `9a4117f` (it rewrote the
fence hooks this plan widens; `main` is `7ec618f` underneath). Worktree `../ux-factory-wt-287`.

## Feature description

Today `portal/lib/discovery.mjs`'s fence is a **tool-name** allow-list: the four `mcp__discovery__*`
op tools pass, everything else is denied, and the deny branch's only real caller is the CLI's own
subagent warmup (#343/#349). There is no path predicate, and `canUseTool` in the transport is an
inline copy of the same name check rather than a second call site of one function.

#287 adds the **read** half the architecture records (§Boundaries & contracts, "The read fence is an
allow-list, and it runs twice"): one pure predicate over a **per-run allow-set** — *this run may read
its own package, the bank, and whatever `run.json` names as its input — nothing else* — called from
`canUseTool` **and** from the `PreToolUse` hook, both failing closed, every denial written as a
`denied` transcript line that names **which call site** refused it.

## User story

As the operator recording run 1 / run 2, I want the agent's reads fenced to a list I can read in
`run.json`, so the scoring key (`_portfolio/decisions.json` + the sealed file; the findings list
printed in `docs/epics/discovery-partner.prd.md` one directory above the fixture) is refused by
mechanism rather than by omission — and I can prove it from the transcript.

## Problem statement

Both scoring keys sit inside directories the agent can reach. A deny-list across two trees drifts;
`canUseTool` alone can be bypassed by the permission fast path (trace-recorder.mjs's own header);
and today a `canUseTool` denial leaves **no** transcript line at all (the CLI fires no
`PostToolUseFailure` for a permission deny), so a refusal there would be silent.

## Solution statement

- `allowSetFor({ root, reads })` — builds the run's allow-set from `run.json` (disk is authoritative:
  a resumed session rebuilds the same fence). Entries: the run root, `discovery/bank.mjs`, and each
  `reads` entry resolved against `REPO_DIR`.
- `allowsPath(allowSet, p)` — **the predicate.** Pure over its two arguments, no fs, no SDK. Allow
  iff `path.resolve(allowSet.root, p)` equals an entry or lies under one (`entry + sep` prefix).
  Denies with a reason naming the path and the set. Junk in → deny, never a throw ("denied when the
  predicate is not reached" is the caller's try/catch; junk is the predicate's own fail-closed).
- `fenceDecision(allowSet, tool, input)` — one decision for both sites: op tool → allow; `Read` /
  `Grep` / `Glob` → `allowsPath` over the tool's path field (`Grep`/`Glob` with no path search the
  cwd, which is the root); anything else → `denyReason(tool)` (Write/Edit/Bash stay closed —
  AC #6). `WebSearch` / `WebFetch` are **not** path tools: the decision is independent of the
  allow-set and the reason names no path (AC #5).
- `fenceHooks(root, turn, onLine, { allowSet, mainTools })` and the new
  `fenceCanUseTool(root, turn, onLine, { allowSet, mainTools })` — the two call sites, one factory
  each, both calling `fenceDecision` through a try/catch that denies on throw. Both record a
  `denied` line carrying `via: 'PreToolUse' | 'canUseTool'`. The #349 recording rule widens by one
  term: `recorded = isMcpToolName(tool) || mainTools.includes(tool)` — a built-in the main session is
  actually advertised is the agent's; under `tools: []` (every real run today) nothing changes.
- The transport wires both from ONE `fence` object; `tools` stays `[]` for real runs (`MAIN_TOOLS`).
- `--probe-fence` — the PAID sibling of `--probe-parenting`: three one-shot query() calls over a
  temp tree shaped like run 2 (a fixture under `docs/epics/fixtures/`, the key at
  `docs/epics/discovery-partner.prd.md`, the package as cwd), `tools: ['Read']`, driven **hook only**,
  **canUseTool only**, and **both**, so the report can show a denial from each site alone.

## Out of scope / non-goals

- Not enabling `Read` for real runs. `tools: []` stays; #286 (`existing-prd` entry mode) / the run-2
  ticket widen `MAIN_TOOLS` and write `reads` from the drawer. The fence is wired now so that
  widening is one array edit.
- Not opening `WebSearch` / `WebFetch` — that is #289's affordance. This ticket only asserts the
  path allow-list never touches them.
- Not #285's session rules. #285 is still OPEN; the two tickets share `discovery.mjs` but not a
  function. Recorded as Q3.
- No op verb, no `TOOL_SCHEMA` edit, no `discovery-postures.mjs` edit (no fingerprint move), no
  transcript edit anywhere, no new run package.
- Not a drawer change. `reads` is accepted by the route and stored; the drawer does not send it yet.

## Feature metadata

**Type** Enhancement · **Complexity** Medium · **Systems** `portal/lib/discovery.mjs`,
`portal/lib/discovery-transport.mjs`, `portal/server.mjs`, `tooling/build-checks.mjs` group 30,
`discovery/README.md`, `.claude/references/gates.md` · **Dependencies** none new (SDK 0.1.77).

## Related work

**Implements** #287 · **Epic** `docs/epics/discovery-partner.architecture.md` (§Key decisions "One
hook, not five"; §Boundaries & contracts) · **Back-references** `.claude/plans/discovery-spine-run-package-284.md`
(the transport, `tools: []`), `.claude/plans/discovery-bracket-trace-349.md` (the tool-name recording
rule this widens) · **Forward** #286 (`reads` from the drawer), run-2 ticket (`MAIN_TOOLS: ['Read']`).

---

## CONTEXT REFERENCES

### Read before implementing

- `portal/lib/discovery.mjs` lines 1–35 (header, invariants 1–4), 140–300 (`allowsToolName`,
  `isMcpToolName`, `deniedLine`, `denyReason`, `fenceHooks` incl. the trace), 335–360 (`openSession`).
- `portal/lib/discovery-transport.mjs` 118–190 (`runDiscoveryTurn` — the query options; the
  `canUseTool` inline copy to replace), 330–420 (`probeParenting` — the probe shape to mirror),
  420–449 (the CLI branch).
- `portal/record-build.mjs` 180–223 (`makeFence` — the deny-text style, identity-not-suffix path
  compares) and `portal/lib/trace-recorder.mjs` 130–165 (the fail-closed `fenceHook`).
- `tooling/build-checks.mjs` 5663–5700 (group 30 header + helpers), 5818–5825 (case 10 key pins),
  6100–6240 (cases 14, 20, 22 — the fence cases), 6258–6282 (the summary clause), 133–139 (the index).
- `discovery/README.md` §Honesty rules (the `denied` paragraph), §File shapes, §run.json, §Workflow.
- `.claude/references/gates.md` lines 49 and 82 (group 30 entry; the parenting-probe paragraph).
- SDK: `entrypoints/sdk/runtimeTypes.d.ts` 19–48 (`CanUseTool` → `{ behavior, updatedInput | message }`),
  `entrypoints/sdk/coreTypes.d.ts` 176–190, 254–265 (`PreToolUseHookInput`; the deny shape).

### Files to change

`portal/lib/discovery.mjs` · `portal/lib/discovery-transport.mjs` · `portal/server.mjs` ·
`tooling/build-checks.mjs` · `discovery/README.md` · `.claude/references/gates.md` · this plan ·
`.claude/reports/discovery-read-fence-287-report.md` + `.claude/reports/discovery-read-fence-287/`
(the probe's stdout and its fence trace).

### Patterns to follow

- Guards throw `bad('discovery: …')` naming the value; predicates return `{ allow, reason }`.
- Every hook is try/caught; a recording failure goes to stderr and never alters the run.
- Line shapes have one constructor each; group 30 pins their key sets; the README documents them.
- A check must be able to fail: drive the function, mutate the source, watch it go red.
- Header comments are the spec; `.claude/references/gates.md` holds only what no file owns.

---

## IMPLEMENTATION PLAN

### Phase 1 — the predicate and the two sites (`portal/lib/discovery.mjs`)

**M1** Add after `isMcpToolName`:
- `export const BANK_PATH = path.join(REPO_DIR, 'discovery', 'bank.mjs')`.
- `export const READ_TOOLS = Object.freeze({ Read: 'file_path', Grep: 'path', Glob: 'path' })`.
- `export const FENCE_SITES = Object.freeze(['PreToolUse', 'canUseTool', 'PostToolUseFailure'])`.
- `allowSetFor({ root, reads = [] })` → frozen `{ root, paths }`; refuses a non-absolute root and a
  `reads` that is not an array of non-empty strings (by name).
- `allowsPath(allowSet, p)` as in the solution statement. Symlink-blind by design (pure); the roots
  are real paths (repo or JOBS_DIR) — state it in the comment.
- `fenceDecision(allowSet, tool, input)`.
- `denyReason(name)` text: "…the discovery session has no write tools; Read, Grep and Glob are fenced
  to the run's read allow-set" (the old "no read tools" is now false).

**M2** `deniedLine({ turn, tool, input, error, via })` — `via` validated against `FENCE_SITES`, key
set `error,input,tool,ts,turn,type,via`. `PostToolUseFailure`'s record passes `via: 'PostToolUseFailure'`.

**M3** Hoist the shared `record` + `trace` + fail-closed `decide` into a private
`fenceSite({ root, turn, onLine, allowSet, mainTools })`. `fenceHooks(root, turn, onLine, opts = {})`
keeps its signature (case 20/22 call it with three args) and gains the fourth; `PreToolUse` calls
`decide`, records with `via: 'PreToolUse'`, traces `{ event: 'PreToolUse.deny', tool, recorded }`
(keys unchanged — case 22 pins them). New `export function fenceCanUseTool(root, turn, onLine, opts = {})`
→ `async (tool, input) => ({ behavior: 'allow', updatedInput: input } | { behavior: 'deny', message })`,
records with `via: 'canUseTool'`, traces `canUseTool.deny`.

**M4** `openSession({ …, reads = [] })` — validate through `allowSetFor` BEFORE `mkdirSync` (case 16
pins guard order from source — add `allowSetFor` to its regex), store `reads` in `run.json` after
`branch`. Header: a fifth invariant paragraph on the fence, and rewrite the "#287 owns" sentences.

### Phase 2 — the wiring (`portal/server.mjs`, `portal/lib/discovery-transport.mjs`)

**M5** Route: `reads: b.reads ?? []` (named, never spread).

**M6** Transport: `const MAIN_TOOLS = Object.freeze([])` with the `tools: []` comment moved onto it;
in `runDiscoveryTurn` build `const fence = { allowSet: allowSetFor({ root, reads: head.reads ?? [] }), mainTools: MAIN_TOOLS }`,
then `tools: MAIN_TOOLS`, `canUseTool: fenceCanUseTool(root, turn, onLine, fence)`,
`hooks: fenceHooks(root, turn, onLine, fence)`. Update the "--- the fence ---" comment block.

**M7** `probeFence()` + the `--probe-fence` CLI branch (usage line lists all three). Temp tree
realpath'd (`/var` → `/private/var`). Prompt: read four paths in order with `Read` only — the fixture,
`BANK_PATH`, the key, `<root>/answers.jsonl` — and report per file the first line verbatim or the
refusal verbatim; never retry. Three `query()` calls, `tools: ['Read']`, `allowedTools: []`,
`maxTurns: 8`, no resume, each with its own transcript root (`run-a/`, `run-b/`, `run-c/`, each a
package with `run.json { reads: [fixture] }`):
- A `hook-only`: `hooks: fenceHooks(…fence)`, `canUseTool` = allow-all that logs it was reached;
- B `canUseTool-only`: no hooks, `canUseTool: fenceCanUseTool(…fence)`;
- C `both`: the production wiring.
Each site function is wrapped by a probe-side counter (`reached: [{ site, tool, path }]`) — outside
the fence, so it observes without altering. From the message stream keep every `tool_use` (name +
file_path) and its `tool_result` (`is_error`). Verdict: `BOTH_SITES_HOLD` when A denies the key via
`PreToolUse`, B denies it via `canUseTool`, and the fixture, the bank and the package read
successfully in all three; `HOOK_ONLY_HOLDS` when B let the key through (the fast path — the reason
the hook exists); else `FAILED`. Exit 0 / 2 / 3. Print: per turn a line per read (allowed/denied,
site, `via` from the transcript), the transcript's `denied` lines as JSON, cost. Root deleted on exit.

### Phase 3 — the gate (`tooling/build-checks.mjs` group 30)

**M8** Case 10: `deniedLine` keys now include `via`; junk `via` throws by name.

**M9** New case 23 — `allowSetFor` + `allowsPath`, the two shapes from the ticket:
- run 1: root `/jobs/_discovery/run-1`, `reads: []` → `<root>/answers.jsonl` allow, `BANK_PATH` allow,
  `/jobs/_portfolio/decisions.json` deny, `/jobs/_portfolio/pre-registration.sealed.md` deny;
- run 2: root `<REPO>/discovery/run-2`, `reads: [FIXTURE]` → `FIXTURE` allow,
  `docs/epics/discovery-partner.prd.md` deny, `docs/epics/fixtures/` deny, a sibling fixture deny,
  `<root>/../../docs/epics/discovery-partner.prd.md` deny (normalised), `<root>-evil/x` deny (sep),
  `answers.jsonl` (relative) allow, `../x` deny;
- reasons name the path; junk paths and a junk/empty allow-set deny with "fail closed", never throw;
  `allowSetFor` refuses a relative root and a junk `reads` by name; the result is frozen and pure.

**M10** New case 24 — `fenceDecision`: op tools allow under a null allow-set; `Read` with no
`file_path` denies; `Grep`/`Glob` with no path → root → allow, with a path outside → deny;
`Write`/`Edit`/`Bash`/`NotebookEdit` deny by name even for a path inside the root (AC #6);
`READ_TOOLS` keys pinned `Glob,Grep,Read`; `WebSearch`/`WebFetch` (AC #5): not in `READ_TOOLS`,
`fenceDecision` identical under `{ paths: [] }` and under a set holding the whole filesystem, the
reason never contains "allow-set" or a path; a throwing allow-set (a `paths` getter that throws)
makes the RAW predicate throw — proving the next case's try/catch is doing the catching.

**M11** New case 25 — the two call sites over a temp root, `mainTools: ['Read']`:
- hook: `Read` outside → deny shape + one `denied` line `via: 'PreToolUse'`, `input.file_path` kept,
  listener heard once; `Read` inside → `{ continue: true }`, nothing recorded; `Bash` → denied,
  unrecorded (the warmup rule still holds); `mainTools: []` + `Read` outside → denied, unrecorded,
  traced `recorded: false`;
- `fenceCanUseTool`: the same battery → `{ behavior: 'deny', message }` + `via: 'canUseTool'`;
  allow → `{ behavior: 'allow', updatedInput }` with `updatedInput === input`;
- fail closed: the throwing allow-set → both sites deny with "fail closed" and neither throws;
  `opts` omitted (no allow-set) → `Read` denied at both sites, op tools still pass;
- the two sites agree on every input in the battery (one predicate, proven by comparing decisions).

**M12** Case 12 transport pins: `canUseTool:\s*fenceCanUseTool\(`, `hooks:\s*fenceHooks\(`,
`allowSetFor\(\{ root, reads: head\.reads`, and no `allowsToolName(` inline in the query options.
Case 16: `allowSetFor` added to the guard regex (count ≥ 8). Import the new exports. Update the
index (lines 133–139), the summary clause, and `gates.md` group 30 + a fence-probe paragraph after
the parenting probe's.

### Phase 4 — docs (`discovery/README.md`)

**M13** §Honesty rules: the `denied` bullet gains the read fence and `via`; §File shapes: the two
`denied` examples carry `via`; §run.json: `"reads": []` in the example + a bullet; §Workflow: the
`--probe-fence` line; a short §"The read fence (#287)" naming what the probe showed and where its
trace lives. `CLAUDE.md`'s discovery bullets stay true — no edit.

### Phase 5 — verify (in this order)

1. `node tooling/build-checks.mjs` → all 32 green.
2. **Mutate**: flip `allowsPath`'s hit test to `abs.startsWith(a)` (drops the sep) → run 2's
   `<root>-evil/x` line red; flip to `return { allow: true }` → both shapes red; restore → green.
   Record the counts.
3. `cd portal && node lib/discovery-transport.mjs --preflight` → 8 rows.
4. `cd portal && DISCOVERY_FENCE_TRACE=<scratchpad>/probe-fence.trace.jsonl node lib/discovery-transport.mjs --probe-fence`
   (PAID, ~$0.2–0.5) → stdout + trace copied to `.claude/reports/discovery-read-fence-287/`.
5. `node tooling/drift-check.mjs` (loc-summary counts `system/`, pages and `agent-layer/` only — no
   regen expected; the syntax step covers the new code).
6. Portal boots on a fresh port; `/api/health` answers; `POST /api/discovery/session` with
   `reads: ['docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md']` on a scratch slug
   → `run.json.reads` holds it; a junk `reads` is refused by name; scratch package removed (a
   package written by a smoke test is never committed).

---

## ACCEPTANCE CRITERIA (ticket → where proven)

- AC 1 one exported pure predicate, allow/deny with a reason → `allowsPath`, case 23.
- AC 2 called from `canUseTool` and a fail-closed `PreToolUse` hook; unknown path denied when the
  predicate is reached and when it is not → `fenceCanUseTool` + `fenceHooks`, case 25 (throwing
  allow-set, missing allow-set), case 12 pins, the probe (run time).
- AC 3 a denial writes a `denied` line → case 25 (both sites), the probe's transcripts.
- AC 4 run 1's and run 2's shapes, mutated → case 23 + Phase 5 step 2.
- AC 5 WebSearch/WebFetch untouched by the path allow-list → case 24.
- AC 6 no write tools reachable → case 24 (`Write`/`Edit`/`Bash` deny by name with an in-root path),
  `tools: []` unchanged.
- The report shows denials from both call sites → the probe's turns A and B.

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (assumed)** Real runs keep `tools: []`; `Read` is advertised only inside the probe. The fence
  is wired and gated for the day `MAIN_TOOLS` widens.
- **Q2 (assumed)** `via` is a new field on the `denied` line — an additive format change, documented;
  packages recorded before #287 carry no `via` and are never edited.
- **Q3** #285 is OPEN and #287 lists it as a dependency. Nothing here touches the depth ladder or the
  counters; the overlap is the file, not a function. Proceeding.
- **Q4 (assumed)** Whether the CLI consults `canUseTool` for a `Read` outside the cwd is not in the
  repo's observations; the probe observes it. If the fast path lets turn B's key read through, the
  verdict says `HOOK_ONLY_HOLDS` and the report says so — that outcome is the reason the hook exists,
  not a failure of the ticket.
- **Q5 (assumed)** Branching from PR #351's head; if #351 grows before this merges, merge it in.

## NOTES

- Why not a static allow-list: run 2 must admit `docs/epics/fixtures/<fixture>` and refuse its parent
  directory's `discovery-partner.prd.md`; a list built for run 1 has no entry for either.
- Why `reads` lives in `run.json`: invariant 2 (disk is authoritative). A resumed session after a
  server restart rebuilds the same allow-set; a fence held only in memory would silently widen.
- Why the recording rule widens by `mainTools` and not by `session_id`: the hook input's session_id,
  transcript_path and cwd are the main session's for a subagent call too (#349's header). Under
  `tools: []` the term is empty and #349's behaviour is byte-identical.
- Why three probe turns rather than one: the hook runs before the permission flow, so under the
  production wiring a `canUseTool` denial of the same call can never be observed. Each site has to
  be shown holding alone — which is the property the ticket wants (either may be bypassed).
- Cost: three one-shot turns, each 2–6 SDK turns, ~$0.2–0.5 expected.

## AMENDMENTS

- 2026-09-01 — Q4 answered by the probe: the CLI consults `canUseTool` for a read outside the cwd
  (turn B denied the key there) and does NOT consult it for a read inside the cwd (turns A and C:
  the allow-all callback was never reached for `answers.jsonl`). Verdict `BOTH_SITES_HOLD`.
- 2026-09-01 — case 23's "absolute or repo-relative" assertion was wrong as planned: a relative path
  resolves against the run root (the SDK's cwd), never the repo; the case now pins that rule.
- 2026-09-01 — the probe's first run reported `FAILED` because the nonce was checked on a 160-char
  excerpt; fixed to check the whole tool result and re-run ($0.442 + $0.398).
- 2026-09-01 — case 25's trace read now guards `existsSync`: under the allow-everything mutation the
  gate died on ENOENT instead of failing by name.
- 2026-09-01 — the HTML build brief was not produced (owner's standing rule: no unrequested pages).
