# Feature: the compose loop — one screen per turn, the fence, the decision link proposed, missing states as proposals, one undo history (#312)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The build canvas (`portal/public/canvas.html`, #306) lets the owner arrange a flow by hand. This ticket puts the
agent on it, inside the owner's loop. The owner optionally writes one brief and presses "Ask for a screen". A real
Agent SDK turn then reads the package's PRD and the generated vocabulary context. It files exactly one
`screen.compose`, which is validated against `handoff/verdant/vocabulary.json` and recorded in `build/ops.jsonl` as
`status: proposed` (`source: agent`), and then it yields.

The page shows the proposal as a card: the rendered screen, its `why`, the brief it answered, and Accept / Refuse.

- **Accept** is the owner's own op on the page. It lands as an `accepted` line carrying `fromStep`, and it sits on
  the page's one undo stack, so Cmd+Z takes the frame away with an `undone` line.
- **Refuse** lands as a `refused` line.

The completeness check (`missingStates`) flags each base screen's missing states ("error: missing"). Clicking one
starts the same kind of turn, asking for exactly that state (`state.add`).

Every turn writes `build/transcript.jsonl`, which holds:

- the turn line;
- the owner's brief (`source: owner`), or its recorded absence;
- the agent's text;
- every fence denial and every refusal;
- a stats line recording `maxTurns`.

## User Story

As the owner holding a discovery PRD on the build canvas
I want the agent to propose one screen (or one missing state) per turn, with its reason, for me to accept or refuse
So that every screen on the canvas traces to a recorded op and a stated decision, and nothing the agent drafted
enters the design without my verdict

## Problem Statement

S6 (#308, PR #460) proved that one resumed SDK session files one validated `screen.compose` per turn and yields.
It proved it in a throwaway driver (`.claude/plans/canvas-spike-s6/driver.txt`) that held the document in memory.

Four gaps remain on `origin/main`:

- Nothing in the portal runs a compose turn.
- Nothing writes an agent's line into a build package.
- `canvas-store.saveRun` refuses every status except `applied` and `undone` (`portal/lib/canvas-store.mjs:376-378`),
  so the page cannot record a verdict.
- No surface shows `missingStates`: `canvas.mjs` never imports it.

## Solution Statement

Discovery's approach C, one layer up: an SDK-free session module, and one lazily imported transport file that
holds the SDK.

- **`portal/lib/canvas-session.mjs`** (new, SDK-free, imported by CI). It holds:
  - the prompt: S6's `ROLE · LOOP · ESCAPE · TURN_ASK` byte for byte, `vocabContext` lifted from the driver, and
    the new brief and state asks;
  - the handler core `fileProposal`: vocabulary validation, D4, part ids, one call per turn, and the state target;
  - the fence: one predicate called from two sites;
  - the build transcript's line constructors, the escape classifier (F2's fixed regex) and the turn outcome;
  - `composeView` for the page;
  - `runComposeTurn`, which runs the whole turn under `builder.mjs` `withRunLock(fn, "a compose turn")`.
- **`portal/lib/canvas-transport.mjs`** (new). It is the one compose file that imports
  `@anthropic-ai/claude-agent-sdk` and `zod`. `composeQuery` wires the in-process tool, the fence, `tools: []`,
  `strictMcpConfig: true`, `resume` and `maxTurns`. It returns stats that carry `maxTurns` and `isError`. The file
  also carries a zero-token `--preflight`.
- **`portal/lib/canvas-store.mjs`** (extended). It gains:
  - `openProposals(lines)`, a pure read;
  - `appendAgentLine`, the server-side writer of `proposed` and `refused` agent lines; the store is still the
    only writer of `ops.jsonl`;
  - a wider `saveRun` that takes the owner's `accepted` and `refused` verdict lines with `fromStep`;
  - a `verifyBuild` that checks verdict lines on every committed package.
- **`portal/server.mjs`** gains `POST /api/canvas/compose`, and `GET /api/canvas/run` gains
  `compose: composeView(root)`.
- **`portal/public/canvas.mjs` + `canvas.html` + `portal.css`** gain:
  - the compose panel in the rail: the brief, Ask, the proposal card and the last outcome;
  - Accept and Refuse through the bus;
  - one missing-state button per missing key in every base frame's caption.
- **`tooling/fake-compose-agent.mjs`** (new) is a scripted `composeQuery` over the REAL handler and fence. Build-checks
  group 47 and the journey's compose pass use it. It costs $0 and its header says what it cannot prove.
- **The gates:**
  - build-checks group 47;
  - a compose pass in `canvas-journey.mjs`;
  - a paid, owner-run `--live-compose` leg, whose receipt is committed. The owner decided that this leg blocks
    the PR.

## Out of Scope / Non-Goals

- **Not included:**
  - **Forks and two-lane alternatives.** That is #320's policy on top of this loop. `FORK_ASK` is not shipped, and
    nothing here decides what counts as a fork.
  - **The `Stop` hook.** S6 took branch 1 (`canvas-spike-s6/README.md` Q2). Group 47 pins its absence.
  - **Ratify (#313).** The lock AC's ratify leg belongs to #313. This plan proves compose × import in both
    directions and lists ratify under Not run.
  - **`DESIGN.md` (#321), the inbox (#319), stale frames and supersede (#318), and G19's dialog-as-state.** A state
    override carrying `add` is REFUSED here by name. `frameTree` flags `add` and ignores it
    (`system/canvas-ops.mjs:575`), so the state would render identical to its base.
  - **An in-card editor.** "Edit is an owner op on top" means: accept, then use the existing verbs (Details →
    frame.link, frame.size, remove).
  - **Reading "the board".** A discovery package has no board, so there is no source to read (Q4).
- **Not changing:**
  - **Anything under `system/`**, and with it the loc-summary, the approach baselines, the handoff pack and
    `param-count.json`. See REGENERATES.
  - **`discovery/<slug>/transcript.jsonl`.** The owner decided that the compose transcript is
    `build/transcript.jsonl`.
  - **`discovery/ops.mjs`, and `discovery.mjs`'s fence.** Only `allowsPath`, `READ_TOOLS` and `isMcpToolName` are
    reused.
  - **The op vocabulary.** No op is added, as the ticket says. `state.add` is filed as it stands. Its `why` lives
    on the transcript's op line (the owner's call), never in its params.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (~1,100–1,400 lines across 9 files, plus one paid leg). Its three agent risks were retired by a paid Phase 0 probe (AMENDMENTS 2026-09-29).
**Primary Systems Affected**:

- `portal/lib/`: new session and transport modules; extended canvas-store
- `portal/server.mjs`
- `portal/public/canvas.{mjs,html}` + `portal.css`
- `tooling/build-checks.mjs`, `tooling/canvas-journey.mjs`
- `discovery/README.md`, `CLAUDE.md`, `.claude/references/gates.md`

**Dependencies**: `@anthropic-ai/claude-agent-sdk` ^0.1.77 and `zod` ^4.4.3, both already in `portal/package.json`.
No new dependency.

## Related Work

**Implements**: #312 (`Closes #312`)

**Epic**: #295, `docs/epics/canvas-design-import.architecture.md`:

- § Boundaries, "The compose loop is server-sequenced, resume-per-turn"
- § Placement, `canvas-session.mjs`
- Addendum 2026-08-28, D3 and D4

**Back-references**:

- `.claude/plans/canvas-spike-s6/README.md` + `driver.txt`. Why: the verdict (branch 1), plus the constants, the
  context generator, the zod shape, the preflight rows and the classifier that this ticket productises. Also the
  F1 and F2 findings from the PR #460 review.
- `.claude/plans/canvas-page-run-list-arrangement-ops-306.md`. Why: the page, the save route, `saveRun`, and the
  undo adapter (D1/D8/D10/D11) that this plan extends.
- `.claude/plans/import-run-live-read-311-pr-b.md`. Why: `withRunLock(fn, what)`'s labelled holder, and the
  `UXF_BRILLIANT_MCP` env seam as the precedent for a journey fake.
- `portal/lib/discovery.mjs` + `discovery-transport.mjs` (#284, #287, #349, #352). Why: the SDK-free/transport
  split, the two-site fail-closed fence, and `strictMcpConfig`.

**Forward-references**:

- #320 (forks) builds on `runComposeTurn`'s `ask`.
- #313 (ratify) adds its leg to group 47.13's lock case.
- #316 (run 1) exercises this loop for real.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

Line numbers are for `origin/main` at `171af6c`, read this session.

- **`.claude/plans/canvas-spike-s6/driver.txt`**:
  - `:69-87` `vocabContext` (lift it verbatim);
  - `:99-128` the tool handler (validate, apply, write, then move the holder);
  - `:102-108` the zod shape: `z.looseObject`, because `z.object` strips props (S6 PF2);
  - `:133-155` `ESCAPE_RE` and `classifyTurn`;
  - `:266-309` preflight PF1–PF7;
  - `:312-317` `ROLE`, `LOOP`, `ESCAPE`, `YIELD_CONTRACT`, `TURN_ASK`, `FORK_ASK`;
  - `:348` system prompt assembly;
  - `:353` one stable cwd for resume;
  - `:410-430` the `query()` options;
  - `:441-451` the stats line.
- **`.claude/plans/canvas-spike-s6/README.md`**:
  - Q2 says `LOOP` and `ESCAPE` ship verbatim, or S6 re-opens.
  - The "Hook observation" section: whether an in-process `isError` fires `PostToolUse` or `PostToolUseFailure`
    was NOT observed.
  - Prompt fingerprint `c903170484396973`.
- **`system/canvas-ops.mjs`**:
  - `:56-85` `OPS`/`PARAMS`. `screen.compose` takes `screenId, why, composition, decisionRefs?`. `state.add` takes
    `baseId, stateKey, override`.
  - `:240-259` `screen.compose`: the D4 refusal and the frame shape.
  - `:266-302` `state.add`: the base must be a screen, the key must be in `STATE_KEYS`, one state per key.
  - `:510-522` `missingStates`.
  - `:552-592` `frameTree`, whose flags include `dangling-set`, `dangling-hide` and `unsupported-add`.
  - `:607-615` `placeDecision`.
- **`system/agentic-renderer.mjs:46`** `validateComposition(vocab, composition, path)`. It throws naming the path.
- **`portal/lib/canvas-store.mjs`**:
  - `:1-33` the header: one concern, SDK-free, the 36.6 pin;
  - `:100` `STATUSES`;
  - `:115-135` `foldLedger`: applies `applied|accepted`, skips `proposed|refused`, and treats `undone` as LIFO;
  - `:224-254` `verifyBuild`;
  - `:349-357` `saveConflict`;
  - `:368-395` `saveRun` (the gate to widen is at `:376-378`).
- **`portal/lib/builder.mjs:236-250`** `withRunLock(fn, what)`: it refuses, never queues, and names the holder.
- **`portal/lib/import-run.mjs`**:
  - `:413-416` `runImport`, which runs under `withRunLock(…, "an import")`;
  - `:620-627` `underLock`: a busy lock becomes `{ refused: { kind: "busy" } }`.
- **`portal/lib/discovery.mjs`**:
  - `:172-178` `BANK_PATH`, `READ_TOOLS`;
  - `:199-231` `allowSetFor`/`allowsPath`: pure, and fail closed;
  - `:233-242` `fenceDecision` (mirror its shape, but do NOT reuse it; see G3);
  - `:370-376` `deniedLine`;
  - `:403-464` `fenceSite`;
  - `:466-536` `fenceCanUseTool`/`fenceHooks`;
  - `:1000-1004` `withDiscoveryRunLock` (NOT the lock to use).
- **`portal/lib/discovery-transport.mjs`**:
  - `:1-33` the header;
  - `:109-150` `buildOpServer`: disk first, then the holder, and a listener error goes to stderr;
  - `:167-270` `runDiscoveryTurn`: `resume: head.sessionId || undefined`, `strictMcpConfig`, and the session id
    recorded at init.
- **`portal/server.mjs`**:
  - `:31` the canvas-store import;
  - `:432-451` `GET /api/canvas/run`;
  - `:452-460` `POST /api/canvas/save`;
  - `:468-484` `POST /api/canvas/import`: 409 first, then 400s, then the runner.
- **`portal/public/canvas.mjs`**:
  - `:94` `getCanvasPage`;
  - `:135-151` `gatherPositions`/`takenBoxes`;
  - `:155-169` `frameParts`. The caption chip "No decision linked" is G15's flag, and it is already live.
  - `:171` `frameSig`;
  - `:191-204` `placeFrame`;
  - `:368-400` `reconcile`;
  - `:406-415` `applyOwnerOp`;
  - `:420-449` `adapter` (the undo restatement);
  - `:452-490` `scheduleSave`/`flush`;
  - `:609-647` `registerConsumers`;
  - `:671-716` `boot`, with the wildcard save trigger at `:712`.
- **`portal/public/canvas.html`**: the rail `<aside class="cv-rail">` gets the compose panel.
- **`portal/public/canvas-import.mjs:1-24`**: import RELOADS after its server-written line. Compose must NOT
  (NOTES N2).
- **`system/action-bus.mjs:54`**: `TYPE_RE = /^(ui|agent)\.[a-z][a-z-]*$/`, so `ui.proposal-accept` and
  `ui.proposal-refuse` are legal.
- **`tooling/build-checks.mjs`**:
  - `:7658` #352's `strictMcpConfig` source pin;
  - `:11888-11900` 36.6;
  - `:11920-11957` 36.8. The case at `:11945` refuses `proposed` and must stay green.
  - `:13955-13975` group 43's opening helpers;
  - `:14219-14233` 43.8's gated-`reader` lock case;
  - `:15747` group 46's `group(...)`;
  - `:15754` `"all 46 groups pass"`.
- **`tooling/canvas-journey.mjs`**:
  - `:1-73` the header;
  - `:143-205` `boot` and `withPortal` (a side child with `extraEnv`);
  - `:222-249` `seed`;
  - `:251-258` `waitLines`/`gitDiscovery`;
  - `:260-307` the page helpers;
  - `:309-610` `leg`, which calls `importPass` at `:608`;
  - `:1240-1303` main.
- **`discovery/README.md:578-700`**: the build-half spec.
- **`.claude/references/gates.md:74-84`**: the entries for groups 41–46.

### New Files to Create

- `portal/lib/canvas-session.mjs`: the compose loop, SDK-free (~450 lines).
- `portal/lib/canvas-transport.mjs`: the SDK wiring plus `--preflight` (~200 lines).
- `tooling/fake-compose-agent.mjs`: the scripted `composeQuery` for group 47 and the journey (~120 lines).
- `.claude/plans/canvas-compose-loop-312/raw/live-1/`: the paid leg's receipt (`ops.jsonl`, `transcript.jsonl`,
  `stdout.txt`). The live leg writes it, and it is never edited.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- **Agent SDK TypeScript `query()` options**: https://docs.claude.com/en/api/agent-sdk/typescript#options. Why: the
  transport's option block. The repo's working truth on 0.1.77 is `discovery-transport.mjs:194-214`.
- **Agent SDK custom tools**: https://docs.claude.com/en/api/agent-sdk/custom-tools. Why: a tool is named
  `mcp__<server>__<tool>`, and a dot is illegal there, hence `screen_compose`.
- **Zod 4 objects** (`z.looseObject`): https://zod.dev/api#objects.

### Patterns to Follow

**Refusal, never queue (the lock).** `portal/lib/builder.mjs:244-248`:

```js
export async function withRunLock(fn, what = 'a composition run') {
  if (inFlight) bad(`${inFlight} is already in flight — wait for it to finish (the portal holds one run at a time)`);
  inFlight = what;
  try { return await fn(); } finally { inFlight = null; }
}
```

**Two fence sites over one fail-closed predicate.** Shape in `discovery.mjs:403-536`. The PreToolUse deny is:

```js
return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
```

**Disk first, holder second, and the listener is never an `isError`.** `discovery-transport.mjs:127-139`.

**Every body parameter named; the 409 before the runner.** `server.mjs:468-484`.

**Import-graph pin by parsed specifiers.** Use 43.1's quote-agnostic regex,
`/^\s*import\s+(?:[^'"]*?from\s+)?["']([^"']+)["']/gm`.

**Naming:**

- Tools: `screen_compose` and `state_add`, on server `canvas`, giving `mcp__canvas__screen_compose` and
  `mcp__canvas__state_add`.
- Transcript `type`s: `turn · text · init · op · denied · refused · stats`.
- Turn ids: `c1, c2, …`.

**Errors.** Plain `Error`s that name the path or seq. A refusal the owner reads (busy, an open proposal, no
prd.md) is data: `200 { refused: { kind, message } }`, as import does it. A stale base is a 409.

**Package strings are `textContent`** (`canvas.mjs` call 4).

---

## IMPLEMENTATION PLAN

### Phase 1: The store learns verdicts and agent lines (`canvas-store.mjs`)

SDK-free, no new import. After this phase, `ops.jsonl` can hold `proposed → accepted/refused (fromStep) → undone`,
and every committed package is gated on it.

### Phase 2: The session (`canvas-session.mjs`) + the fake (`tooling/fake-compose-agent.mjs`)

**Depends on:** Phase 1.

### Phase 3: The transport (`canvas-transport.mjs`)

**Depends on:** Phase 2. **Independent of:** Phase 4. It needs `cd portal && npm ci` for its preflight.

### Phase 4: The route and the page

**Depends on:** Phase 2. **Independent of:** Phase 3, because the page is exercised through the fake.

### Phase 5: The gates (group 47 + the journey's compose pass)

**Depends on:** Phases 1, 2 and 4, plus Phase 3 for the source pins in 47.14.

### Phase 6: Docs, then the paid leg

**Depends on:** everything. The paid leg runs last, on the finished tree.

---

## STEP-BY-STEP TASKS

**REGENERATES: none, for every task below.** This is measured, not assumed:

- `gen-loc-summary`'s three groups are `system/…`, the root and `proto/` `.html` pages, and `agent-layer/*.mjs`
  (`agent-layer/gen-loc-summary.mjs:22-26`).
- The portal is not in the VR set (`canvas-journey.mjs:57`).
- Nothing here touches `system/`, `handoff/` or a shipped page.

If a task finds itself editing `system/`, STOP. That triggers the loc-summary and approach-baseline cascade
(memory `loc-summary-baseline-cascade`) and breaks this plan's premise.

### Task 1.1 UPDATE `portal/lib/canvas-store.mjs` — `openProposals`, `appendAgentLine`

- **IMPLEMENT**:
  - **`export function openProposals(lines)`** is a pure read. It returns the lines with `status === "proposed"`
    and `source === "agent"` whose `seq` no later line names as `fromStep`, in ledger order. It is total over junk.
  - **`export function appendAgentLine(pkgRoot, { op, params, status }, { now = () => new Date().toISOString() } = {})`**
    returns `{ seq, count }`. It is synchronous and does this in order:
    1. Read `existing`.
    2. Refuse any status other than `proposed` or `refused`:
       `appendAgentLine: status "<s>" — an agent line is proposed or refused; accepted, applied and undone are the owner's`.
    3. For `proposed`, two checks:
       - `openProposals(existing).length === 0`, else throw
         `appendAgentLine: seq <n> (<op> <what>) is still waiting for the owner's verdict — one open proposal at a time (LOOP)`;
       - `applyOp(foldLedger(existing).doc, { op, params })` must not throw. If it throws, prefix the message with
         `appendAgentLine: `.
    4. Build the line: `{ seq: existing.length + 1, at: now(), source: "agent", op, params, status }`.
    5. `mkdirSync`, then `appendFileSync`.
  - **Never write `canvas.json` here.** Neither status changes the fold, so the arrangement is unchanged by
    construction.
- **PATTERN**: `saveRun` `:368-395`; `foldLedger` `:115-135`.
- **IMPORTS**: add `applyOp` to the existing `../../system/canvas-ops.mjs` import. That module must stay the only
  non-built-in import (36.6).
- **GOTCHA**: there is no `base` parameter. The session holds the run lock for the whole turn, and the page holds
  its saves during its own turn (Task 4.3), so the line is appended at the current length and the page adopts the
  returned `count`. A second tab that saves mid-turn gets the existing 409 on its next save, which is today's
  behaviour.
- **VALIDATE**:
  `node -e 'import("./portal/lib/canvas-store.mjs").then(m=>console.log(typeof m.appendAgentLine, typeof m.openProposals))'`
  → `function function` (expected).
- **REDDENS**: drop the open-proposal guard. 47.12's "second proposal while one is open" goes red:
  `appended a second proposal while seq <n> was open`.
- **SATISFIES**: AC #1.

### Task 1.2 UPDATE `portal/lib/canvas-store.mjs` — `saveRun` takes verdicts

- **IMPLEMENT**: replace the status gate at `:376-379`.
  - **`applied` and `undone`** behave as today. A line of either status that carries `fromStep` is refused:
    `saveRun: op <i> is <status> and carries fromStep — only a verdict (accepted, refused) names the proposal it answers`.
  - **`accepted` and `refused`** must carry an integer `fromStep`, checked by a private
    `checkVerdict(existing, lines, i)` before any write. `fromStep` must name a line in `existing` with
    `status === "proposed"` and `source === "agent"`, whose `canon({op, params})` equals the verdict's. No line in
    `existing`, and no earlier line in this batch, may already name that seq. Each refusal names both seqs:
    - `saveRun: op <i> answers seq <n>, which is not an agent's proposal`;
    - `…restates <op> but seq <n> proposed <op'> — a verdict restates exactly what it answers`;
    - `…seq <n> already has a verdict (seq <m>)`.
  - **Line shape**: `{ seq, at, source: "owner", op, params, status, ...(fromStep !== undefined && { fromStep }) }`.
  - **`proposed` stays refused.** The message 36.8 matches at `:11945` must still match: keep "proposed and refused
    are a proposal's", or update 36.8 in the same commit.
  - **After the checks, nothing else changes:** the existing fold, the frame.link check, `arrangement` and the
    append run as today. `accepted` is already folded (`:120`), so the new frame needs a position, or `arrangement`
    refuses it by name.
- **PATTERN**: `:381-389`.
- **GOTCHA**: `adapter.restore` writes `undone` as `{op, params, status}` with no `fromStep` (`canvas.mjs:426-430`).
  The `undone` line restates the op, so `foldLedger`'s LIFO check (`:125`) passes against the `accepted` line.
  Never add `fromStep` to an undo line: the README pins "no new key" (`README.md:664-666`).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "build package"` → ✓. It was observed green at `171af6c`.
- **REDDENS**: drop the "already has a verdict" check. 47.12's double-accept case goes red:
  `a second verdict on seq <n> was accepted`.
- **SATISFIES**: AC #1.

### Task 1.3 UPDATE `portal/lib/canvas-store.mjs` — `verifyBuild` checks verdict lines

- **IMPLEMENT**: two additions to the per-line loop (`:231-238`):
  - A line carrying `fromStep` must have status `accepted` or `refused`. It must name an EARLIER line with
    `status: "proposed"`, `source: "agent"` and the same op and params, and it must be the only line that names
    that seq.
  - An agent line carrying `fromStep` is refused: `an agent line never answers a proposal`.
  - An `accepted` line with no `fromStep` is refused: `an accepted line names the proposal it answers` —
    `foldLedger` folds it either way, so without this a verdict unlinked from any proposal would pass.

  Every message takes the form `ops.jsonl line <n>: …`.
- **GOTCHA**: no committed package carries a verdict today. `faster-payment`'s six lines are all `applied` owner
  lines (observed), so group 36 stays green. 47.12 is the positive control.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "build package"` → ✓.
- **REDDENS**: a scratch ledger whose `fromStep` names an `applied` line must make `verifyBuild` return
  `ops.jsonl line <n>: fromStep <m> names a applied line, not an agent's proposal`.
- **SATISFIES**: AC #1 ("honest source values", gated on disk).

### Task 2.1 CREATE `portal/lib/canvas-session.mjs` — header, constants, prompt

- **IMPLEMENT**:
  - **The header** cites epic #295 ticket #312, the architecture's § Boundaries (compose loop) and § Placement, and
    Addendum D3/D4. It states eight invariants:
    1. The module is statically SDK-free and zod-free, and the transport is lazy-imported after every guard.
    2. Disk is authoritative. The session id is the last `init` line's.
    3. One open proposal and one call per turn, enforced in code: the LOOP sentence made true.
    4. The fence is one predicate called from two sites, failing closed.
    5. The brief is the owner's text, verbatim. It is never an op and never rewritten.
    6. A refusal is a line, never a retry.
    7. There is no `Stop` hook (S6 branch 1).
    8. What the fake cannot prove.
  - **S6's four constants, byte for byte** from `driver.txt:312-316`: `ROLE`, `LOOP`, `ESCAPE`, `TURN_ASK`. Do NOT
    ship `FORK_ASK` (it is #320's) or `YIELD_CONTRACT` (branch 1 did not need it).
  - **The new prompt text.** Each piece is a named export and each feeds `promptFingerprint()`:
    - `BRIEF_LEAD = "The owner's brief for this turn, in their words:"`
    - `STATE_ASK = ({ frameId, screenId, stateKey }) =>`
      ``Next: the ${stateKey} state of ${screenId} (${frameId}). Call `state_add` once with baseId "${frameId}", stateKey "${stateKey}", an override that sets or hides parts by the ids in the base screen below, and a `why` naming the PRD decision (by seq) it serves and the reason.``
    - `SCREEN_TOOL_DESCRIPTION` = S6's `TOOL_DESCRIPTION` (`driver.txt:94`) verbatim, plus
      `" Give every part an id (a short slug) so a later state can address it."` plus
      the decisionRefs sentence (copy it from `probe.txt:42`, never from this markdown).
    - **The eight strings are COPIED BYTE FOR BYTE from `canvas-compose-loop-312-probe/probe.txt:36-43`**
      (ROLE, LOOP, ESCAPE, TURN_ASK, BRIEF_LEAD, STATE_ASK, SCREEN_TOOL_DESCRIPTION, STATE_TOOL_DESCRIPTION).
      The prose in this plan paraphrases them. Before any other task starts, run
      `node -e 'import("./portal/lib/canvas-session.mjs").then(m=>console.log(m.promptFingerprint()))'`
      → `9690d4c955be652c`. That is the probe's run-4 surface, the same value 47.2b pins.
      These are exactly the two sentences run 4 of the probe ran under (`canvas-compose-loop-312-probe/probe.txt`,
      plan fingerprint `9690d4c955be652c`). Without the second one, the agent cited seqs only inside `why`
      (0 `decisionRefs` across 3 proposals, runs 2–3). With it, run 4 filed `["7","23"]`.
    - `STATE_TOOL_DESCRIPTION = "Propose one missing state of a screen already on the canvas. baseId: the screen's frame id. stateKey: the state asked for. override: { set: { partId: { prop: value } }, hide: [partId] } naming parts by their ids. why: one sentence naming the PRD decision (by seq) it serves and the reason."`
  - **The session constants:**
    - `MODEL = "claude-sonnet-5"`.
    - `MAX_TURNS = 4`. The comment gives the arithmetic: `num_turns` is 1 plus the number of tool calls. A clean
      turn is therefore 2, and a turn whose second call the handler refuses is 3.
    - `MCP_SERVER = "canvas"`, `SCREEN_TOOL = "screen_compose"`, `STATE_TOOL = "state_add"`, and
      `toolNameFor = (t) => \`mcp__${MCP_SERVER}__${t}\``.
    - `ESCAPE_RE = /^[^A-Za-z\n]*NOT COVERED:/m` (F2).
    - `RECORDED_BUILTINS = Object.freeze(["Write", "Edit", "WebSearch", "WebFetch"])`.
    - `TRANSCRIPT_FILE = "transcript.jsonl"`, which lives under `build/`.
  - **`vocabContext(vocab, vocabSha)`**, lifted VERBATIM from `driver.txt:69-87`.
  - **`buildSystemPrompt({ vocab, vocabSha, prd })`** returns
    `[ROLE, LOOP, ESCAPE, "", "## Vocabulary", "", vocabContext(vocab, vocabSha), "", "## PRD", "", prd].join("\n")`.
  - **`turnPrompt({ doc, ask, brief })`** builds, in order:
    1. `The canvas holds:\n${holds}`, where `holds` has one line per base frame, `${screenId} — ${why}`, or
       reads `nothing yet`.
    2. When there is a brief: `\n\n${BRIEF_LEAD}\n"${brief}"`.
    3. `\n\n`, then the ask. A screen ask adds `TURN_ASK`. A state ask adds `STATE_ASK(…)`, then
       `\n\nThe base screen:\n`, then `JSON.stringify(frameTree(doc, ask.baseId).tree, null, 2)`.
  - **`promptFingerprint()`** is the first 16 hex characters of the sha256 of
    `[ROLE, LOOP, ESCAPE, TURN_ASK, STATE_ASK({frameId:"f0",screenId:"s",stateKey:"error"}), BRIEF_LEAD, SCREEN_TOOL_DESCRIPTION, STATE_TOOL_DESCRIPTION].join("\n")`.
- **IMPORTS**:
  - `node:fs`, `node:path`, `node:crypto`, `node:url`;
  - `../../system/canvas-ops.mjs` (`applyOp`, `frameTree`, `missingStates`, `STATE_KEYS`);
  - `../../system/agentic-renderer.mjs` (`validateComposition`);
  - `./canvas-store.mjs` (`appendAgentLine`, `foldLedger`, `loadBuild`, `openProposals`, `saveConflict`, `OPS_FILE`);
  - `./builder.mjs` (`withRunLock`);
  - `./discovery.mjs` (`allowsPath`, `READ_TOOLS`, `isMcpToolName`);
  - `./env.mjs` (`REPO_DIR`).

  Every one of these is SDK-free and already imported in CI by groups 8, 30 and 36.
- **GOTCHA** G1: `agentic-renderer.mjs` imports in Node (group 3 does it, and so does `driver.txt:54`).
- **GOTCHA** G2: copy the four constants as single-quoted strings, exactly as the driver writes them, so that 47.2
  holds.
- **VALIDATE**:
  `node -e 'import("./portal/lib/canvas-session.mjs").then(m=>{const c=require("crypto");console.log(c.createHash("sha256").update([m.ROLE,m.LOOP,m.ESCAPE,m.TURN_ASK,"Next: the screen where the customer chooses the amount and sends the first payment."].join("\n")).digest("hex").slice(0,16))})'`
  → `c903170484396973`. That value was observed this session from `driver.txt`'s own constants; from the module it
  is expected.
- **REDDENS**: change one character of `LOOP`. 47.2 goes red:
  `the four S6 constants no longer reproduce S6's fingerprint c903170484396973 (got …) — a change to LOOP or ESCAPE re-opens S6`.
- **SATISFIES**: AC #4 (the generator), and S6's condition.

### Task 2.2 ADD to `canvas-session.mjs` — the build transcript

- **IMPLEMENT**:
  - `readComposeTranscript(pkgRoot)`: a missing file reads as `[]`. A malformed line throws, naming the file and
    its 1-based line number.
  - `appendComposeLine(pkgRoot, line)`: append-only, and it stamps `ts`.
  - The constructors. Each is the only way to build its line type:
    - `turnLine({ turn, ask, briefed })` → `{ type: "turn", turn, ask, briefed }`
    - `briefLine({ turn, text })` → `{ type: "text", source: "owner", turn, text }`
    - `agentText({ turn, text })` → `{ type: "text", source: "agent", turn, text }`
    - `initLine({ turn, sessionId, model, tools })`
    - `opLine({ turn, seq, tool, args, status })`. The `args` are the full tool arguments; a state proposal's
      `why` lives here (the owner's call on Q2).
    - `deniedLine({ turn, tool, input, error, via })`, where `via` is one of
      `PreToolUse · canUseTool · PostToolUseFailure`.
    - `refusedLine({ turn, kind, seq, error, text })`, where `kind` is one of
      `vocabulary · applier · ids · one-per-turn · wrong-target · not-covered · schema`.
    - `statsLine({ turn, … })`
  - The turn id is `c${1 + count of turn lines}`.
- **GOTCHA** G4 (the owner's Q1): the transcript is `build/transcript.jsonl`, never the package's
  `transcript.jsonl`. Writing into the package's file would create one in a stand-in. `loadDecisions`
  (`canvas-store.mjs:301-304`) would then stop returning `null`, and the page would silently stop flagging the
  stand-in.
- **VALIDATE**: 47.7 (expected).
- **SATISFIES**: AC #2, AC #3.

### Task 2.3 ADD to `canvas-session.mjs` — the fence

- **IMPLEMENT**:
  - **`composeAllowSet(pkgRoot)`** returns
    `Object.freeze({ root: path.resolve(pkgRoot), paths: Object.freeze([path.resolve(pkgRoot), VOCAB_PATH]) })`,
    where `VOCAB_PATH = path.join(REPO_DIR, "handoff/verdant/vocabulary.json")`. The brief is the package's
    `prd.md`, which sits under `pkgRoot`.
  - **`composeFenceDecision(allowSet, tool, input, ownTools)`**:
    - it allows iff `ownTools.includes(tool)`;
    - `READ_TOOLS` go through `allowsPath`;
    - anything else is denied by name:
      `${tool} is not this compose turn's tool (${ownTools.join(", ")}) — a compose turn has no write, web or other MCP tool, and Read is fenced to the run package and vocabulary.json`;
    - junk input is denied.
  - **`composeFence({ pkgRoot, turn, ownTools, onLine })`** returns `{ canUseTool, hooks }`, built from one
    private `site()` that mirrors `fenceSite`:
    - the decision is try/caught, so a throw becomes a fail-closed denial;
    - the record gate `isMcpToolName(tool) || RECORDED_BUILTINS.includes(tool)` decides which denials write a
      `denied` line;
    - `hooks` is `{ PreToolUse, PostToolUseFailure }`. There is no `PostToolUse` and no `Stop`.
- **GOTCHA** G3: do NOT reuse discovery's `fenceDecision`. It allows `mcp__discovery__*` by name (`:156-160`), and
  its `denyReason` names discovery's tools.
- **GOTCHA** G5 (#349): under `tools: []`, the CLI's warmup subagents hit this fence (pwd, ls, find, Glob).
  `RECORDED_BUILTINS` names only tools that no observed warmup calls. So a `Write` fed to the fence writes its
  `denied` line (AC #2), while a warmup `Glob` is denied without a line. The header states both halves.
- **GOTCHA** G6: the handler writes the `refused` line for its own refusals, and returns an `isError` whose text
  starts `refused: `. `PostToolUseFailure` records `kind: "schema"` only when the tool is an own tool AND the error
  text matches `-32602` or `Input validation error` (`driver.txt:390`). The probe answered S6's open question: a handler `isError` fires `PostToolUseFailure` (observed twice each in
  probe run 2 T1 and run 3 T3). So without this rule every handler refusal would be recorded twice.
- **VALIDATE**: 47.5 and 47.6 (expected).
- **REDDENS**: remove `"Write"` from `RECORDED_BUILTINS`. 47.6 goes red:
  `Write was denied at PreToolUse but wrote no denied line — AC #2 watches the line`.
- **SATISFIES**: AC #2.

### Task 2.4 ADD to `canvas-session.mjs` — `fileProposal`, the handler core

- **IMPLEMENT**: `fileProposal(ctx, tool, args)`, where `ctx = { pkgRoot, turn, ask, vocab, calls: [], onLine }`.
  It never throws; it returns either `{ content: [{type:"text", text}] }` or `{ isError: true, content }`. Its
  steps, in order:
  1. **One call per turn.** Push the call onto `ctx.calls`. If this is the second call, it is a
     `kind: "one-per-turn"` refusal (`this turn already made its one proposal call — the owner decides before the next turn (LOOP)`),
     transcript-only per step 5.
  2. **The tool matches the ask.** A screen ask needs `screen_compose`, and a state ask needs `state_add`.
     Anything else is a `kind: "wrong-target"` refusal.
  3. **Build the params.** For `screen_compose`: `{ screenId, why, composition, decisionRefs }` (the tool requires `decisionRefs`; `[]` is legal and is the G15 flag's case).
     For `state_add`: `{ baseId, stateKey, override }`, keeping `why` aside for the transcript. A state call must
     have `baseId === ask.baseId` and `stateKey === ask.stateKey`, or it is a `wrong-target` refusal.
  4. **Validate.**
     - **A screen**, in this order:
       1. `validateComposition(vocab, composition)` (a failure is `vocabulary`).
       2. Every node **below the root** carries a non-empty string `id`, and every id in the tree is unique. The
          root is exempt: a root is never hidden (`frameTree` flags `hide-root`), so a state addresses children. A
          failure is `ids`, naming the first offender's path, e.g. `composition.children[2]`. The probe drove this:
          ids required on the root refused run 2 T1, whose seven children all had ids; with the root exempt, 0 of 3
          later proposals were refused on ids.
       3. `applyOp(doc, {op:"screen.compose", params})` (a failure is `applier`; this covers D4 and frozen
          originals).
     - **A state**, in this order:
       1. `override.add !== undefined` is an `applier` refusal naming G19.
       2. An empty `why` is a refusal naming D4.
       3. `next = applyOp(doc, {op:"state.add", params})` (a failure is `applier`).
       4. `frameTree(next, newId)` must carry no `dangling-*` flag (an `applier` refusal naming the part).
       5. `validateComposition(vocab, tree)` (a failure is `vocabulary`).
  5. **Which refusals reach the ledger — the one list.** `vocabulary`, `applier` and `ids` refusals write an
     agent `refused` line through `appendAgentLine(…, { status: "refused" })`, then the transcript's
     `refusedLine({ seq, kind, error })` and `opLine({ status: "refused", args })`. `one-per-turn`,
     `wrong-target`, `schema` and `not-covered` are TRANSCRIPT-ONLY (a `refusedLine` with no `seq`): nothing
     was proposed that the ledger could restate. Both return `isError` with `refused: ${error}`. 47.9 and 47.10
     assert against this list.
  6. **On success:** `appendAgentLine(…, { status: "proposed" })`, then `opLine({ seq, status: "proposed", args })`.
     Return `filed seq ${seq}: ${op} "${what}" (proposed — the owner decides)`, which is S6's wording
     (`driver.txt:121`) with the seq in place of the frame id.
- **PATTERN**: `driver.txt:112-125`; `discovery-transport.mjs:118-147`.
- **GOTCHA** G7: part ids are a session-level rule; `canvas-ops` accepts id-less trees. S6's screens carried 0 ids
  (`grep -c '#' raw/run-2/outline.txt` → 0, observed). Without ids no state can address a part, and
  `missingStates` flags that screen forever. The root is exempt (step 4); the probe settled the rule (Q1).
- **GOTCHA** G8: catch `validateComposition` and `applyOp` separately, so that `kind` names the layer that refused.
- **VALIDATE**: 47.9 and 47.10 (expected).
- **REDDENS**: skip the ids walk for children. 47.10's id-less-child case goes red:
  `a composition with an id-less child was filed as proposed — every part below the root needs an id so its states can address it`.
  A second mutation, requiring the root's id again, reds the positive control (`the root-only id-less composition was refused`).
- **SATISFIES**: AC #1, AC #3, C5.

### Task 2.5 ADD to `canvas-session.mjs` — the classifier, the view, the turn

- **IMPLEMENT**:
  - **`classifyComposeTurn(lines)`** returns the first that applies:
    1. `proposed`, when the turn has a proposed op line;
    2. `refused`, when it has a refused line whose kind is vocabulary, applier, ids, wrong-target or schema;
    3. `escape`, when agent text matches `ESCAPE_RE`;
    4. `empty-yield` otherwise.
  - **`composeView(pkgRoot)`** returns `{ open, last, turns }`:
    - `open` is the one open proposal joined with its transcript op line. It carries the `why` (for a state),
      the `brief` from the turn's owner line (or `null`), and the `turn`.
    - `last` is `{ turn, outcome, error?, text?, briefed }` for the latest turn.
    - A package with no `build/transcript.jsonl` answers `{ open, last: null, turns: 0 }`.
  - **`export async function runComposeTurn({ pkgRoot, base, ask, brief = null, transport = null, now })`**:
    1. **Guards, before the lock and before the SDK.** `checkComposeRequest({ ask, brief })` is exported, so the
       route runs the same rule:
       - `ask` is `{kind:"screen"}` or `{kind:"state", baseId, stateKey ∈ STATE_KEYS}`;
       - `brief` is `null` or a string of 1–500 characters after trimming;
       - `prd.md` exists in the package, or the turn is refused with
         `this package has no prd.md — a compose turn reads the PRD or the labelled stand-in brief`.
    2. **`return withRunLock(async () => { … }, "a compose turn")`.** Inside the lock, in order:
       1. Throw on `saveConflict(buildRoot, base)`.
       2. If `openProposals` finds one, throw `seq <n> (<what>) is waiting for your verdict — accept or refuse it first (LOOP)`.
       3. For a state ask, `missingStates` must list that key for that base frame.
       4. Write `turnLine`, and then `briefLine` if the turn is briefed.
       5. Read the vocabulary and its sha, and the PRD, now.
       6. Resolve the transport: `transport ?? (await loadTransport()).composeQuery`. `loadTransport` imports
          `UXF_COMPOSE_TRANSPORT` when that env var is set, and `./canvas-transport.mjs` otherwise.
       7. Call the transport with `{ systemPrompt, prompt, cwd: buildRoot, resume: lastSessionId || undefined, model: MODEL, maxTurns: MAX_TURNS, tool: { name, fullName, description, handler }, ...composeFence(…), onInit, onText }`.
          `onInit` writes `initLine` at once, and `onText` writes `agentText` as the text arrives.
       8. Classify the turn. On `escape`, write `refusedLine({ kind: "not-covered", text })`.
       9. Write `statsLine({ …stats, maxTurns: MAX_TURNS, outcome, promptFingerprint: promptFingerprint(), vocabSha, model: MODEL })`.
       10. Return `{ count, outcome, view: composeView(pkgRoot) }`.
- **GOTCHA** G9 (memory `sdk-error-result-wears-success`): `ok` is `subtype === "success" && !isError`. When `ok`
  is false, the outcome is `failed`, and the error text goes on the stats line. Lines are written as they arrive.
- **GOTCHA** G10: `cwd: buildRoot` stays the same for a package across turns, which is what makes resume work
  (`driver.txt:353`). A fictional package's `buildRoot` sits inside this repo, one directory below `.mcp.json`,
  so `strictMcpConfig: true` is load-bearing (#352).
- **GOTCHA** G11: the session id is the last `init` line's `sessionId`, never `run.json`'s. That field belongs to
  the discovery session.
- **VALIDATE**: 47.7, 47.8 and 47.11 (expected).
- **REDDENS**: drop the open-proposal guard. 47.8 goes red: `a second turn ran while seq <n> was open`.
- **SATISFIES**: AC #1, #3, #4 (escape), #5.

### Task 2.6 CREATE `tooling/fake-compose-agent.mjs`

- **IMPLEMENT**: `export async function composeQuery(opts)`, with the transport's signature. It calls
  `opts.onInit({ sessionId: "fake-<n>", tools: [opts.tool.fullName] })` and returns
  `{ sessionId, stats: { numTurns, durationMs: 0, costUsd: 0, ok: true, isError: false, transport: "fake" }, advertised }`.

  Its behaviour is chosen **only** by the owner's brief, which it reads back out of `opts.prompt` after
  `BRIEF_LEAD`:

  | The brief | What the fake does |
  |---|---|
  | starts `impossible:` | `onText("NOT COVERED: <rest>")`, and no tool call |
  | starts `fence:` | For each of `Write`, `WebFetch` and `mcp__brilliant__get_selection`, it calls both `opts.hooks.PreToolUse[0].hooks[0]({ tool_name, tool_input: {} })` and `opts.canUseTool(tool_name, {})`. Then it calls `onText("Fence probed.")` and files no proposal. |
  | starts `twice:` | It calls the handler twice, with the screen fixture. |
  | starts `invalid:` | It files the screen fixture with one child renamed `hero-banner`. |
  | anything else, screen ask | It files the in-file fixture `CHOOSE_AMOUNT`: a `stack` of `screen-header#title`, `text-field#amount` and `primary-button#continue`, every node below the root with an id, and the root deliberately WITHOUT one (the exemption's positive control). `decisionRefs: ["7"]`. The `why` is `Serves the owner's brief: "<brief>"`, or `No brief this turn.` |
  | anything else, state ask | It files `state_add { baseId, stateKey, override: { set: { <first text-field id in the base tree, else the first id>: { hint: "Something went wrong — check the amount." } } }, why }`. It parses `baseId` and `stateKey` out of the prompt's `STATE_ASK` line. |

  It refuses to run when `path.resolve(opts.cwd)` is inside the repo:
  `the fake agent writes source: "agent" lines and must never touch a committed package`.

  The header says three things:

  - This is a SCRIPTED stand-in for the model.
  - Every line it causes says `source: "agent"`, only inside a scratch package, and its stats say
    `transport: "fake"`.
  - It proves the plumbing (handler, fence, transcript, lock, page). It cannot prove that a model yields, names the
    brief, or escapes; those belong to `--live-compose`.
- **PATTERN**: `tooling/fake-brilliant-bridge.mjs`.
- **GOTCHA**: import nothing from `portal/node_modules`, so group 47 can use this file in CI.
- **VALIDATE**: `node --check tooling/fake-compose-agent.mjs` → no output (expected).
- **SATISFIES**: the $0 halves of AC #1–#4.

### Task 3.1 CREATE `portal/lib/canvas-transport.mjs`

- **IMPLEMENT**:
  - **The header:** this is the one compose file that imports the SDK and zod. It is lazy-imported, and it carries
    the S6 and #284 observations that apply.
  - **`export async function composeQuery({ systemPrompt, prompt, cwd, resume, model, maxTurns, tool, canUseTool, hooks, onInit, onText })`**:
    - **The zod shapes.**
      - Screen: `{ screenId: z.string(), why: z.string(), composition: z.looseObject({ name: z.string() }), decisionRefs: z.array(z.string()) }`. `decisionRefs` is REQUIRED at the tool, and stays optional in
        `canvas-ops`' `PARAMS`. The op grammar is unchanged; only the agent's tool asks for it (probe run 4).
      - State: `{ baseId: z.string(), stateKey: z.string(), override: z.looseObject({}), why: z.string() }`.
    - **The server.** `createSdkMcpServer({ name: MCP_SERVER, version: "1.0.0", tools: [tool(name, description, shape, handler)] })`.
    - **The query.** `query({ prompt, options: { cwd, model, maxTurns, systemPrompt, resume, tools: [], allowedTools: [], mcpServers: { [MCP_SERVER]: server }, strictMcpConfig: true, canUseTool, hooks, env: subscriptionEnv() } })`.
    - **`subscriptionEnv()`** is `const { ANTHROPIC_API_KEY, ...rest } = process.env; return rest;`. It is exported
      so group 47 can drive it. The SDK builds the child's env as `{ ...options.env ?? process.env }`
      (`sdk.mjs:8592`), so this is what makes "auth is the subscription" true. `CLAUDE_CODE_OAUTH_TOKEN`
      (`env.mjs:27`) passes through when set; otherwise the CLI's own login applies. Both halves were observed:
      probe run 1, with the key inherited, failed `Credit balance is too low` at $0, and a one-turn check with the
      key still in the parent and `env` passed without it answered `ok` at $0.0002.
    - **The stream:**
      - `system/init` calls `onInit({ sessionId, model, tools })`;
      - `assistant` text calls `onText(text)`;
      - `result` fills the stats: `{ numTurns, durationMs, costUsd, the four token counts, subtype, isError: msg.is_error === true, ok, transport: "sdk", sdk: <version> }`.
  - **`--preflight`** (zero tokens) runs over the REAL server's handlers, on a temp copy of
    `discovery/faster-payment` under `os.tmpdir()`. It prints `preflight ✓ 8/8` or `✗`.

    | Row | Check |
    |---|---|
    | PF1 | `tools/list` returns one tool, and `required` (sorted) is `composition,decisionRefs,screenId,why`. |
    | PF2 | A depth-3 composition with an unknown key arrives deep-equal. |
    | PF3 | A valid screen whose parts carry ids is answered `filed seq`. |
    | PF4 | `hero-banner` is answered `refused: composition.children[0]:…`. |
    | PF5 | `why: ""` is answered with `(D4)`. |
    | PF6 | A call with no composition gets `-32602`, and the handler count does not move. |
    | PF7 | A valid screen with an id-less CHILD is refused, naming `id`; the same screen with only the root id-less is filed. |
    | PF8 | The state tool's `required` is `baseId,override,stateKey,why`. |
- **IMPORTS**: `@anthropic-ai/claude-agent-sdk` (`createSdkMcpServer`, `query`, `tool`), `zod`, and
  `./canvas-session.mjs`.
- **GOTCHA** G12: `resume: sessionId || undefined`. The SDK treats `null` as a value to resume from. A resumed
  session may advertise a DIFFERENT tool than the turn before: probe run 3 used one session id across
  `screen_compose` → `state_add` → `screen_compose`, with each init listing exactly that turn's tool (observed).
- **GOTCHA** G12b (memory `sdk-error-result-wears-success`, and probe run 1): a failed auth arrives as
  `subtype: "success"`, `is_error: true`, and the error text as the assistant's message. Its text line is written
  (it is what happened), the stats line carries `ok: false`, and the outcome is `failed`, never `empty-yield`.
- **GOTCHA** G13: the preflight reaches `server.instance.server._requestHandlers` (`driver.txt:270-271`). If that
  path is gone, the preflight prints PF0 `unreachable` and exits 2. It must never pass in that state.
- **VALIDATE**: `cd portal && npm ci && node lib/canvas-transport.mjs --preflight` → `preflight ✓ 8/8` (expected).
- **REDDENS**: replace `z.looseObject` with `z.object`. PF2 goes red, and so do PF3 and PF7 (props are stripped;
  S6's README records this mutation as observed).
- **SATISFIES**: AC #2 (the options), and AC #6 through the session's stats line.

### Task 4.1 UPDATE `portal/server.mjs` — the compose route + the view

- **IMPLEMENT**:
  - Import `{ checkComposeRequest, composeView, runComposeTurn }` from `./lib/canvas-session.mjs`. This is a static
    import, which is safe because the module is SDK-free.
  - In `GET /api/canvas/run`, add `compose: composeView(root)`.
  - Add `POST /api/canvas/compose` after `/api/canvas/save`:
    1. `b = await readBody(req)`, then `resolveRunRoot` and `assertProvenanceRoot`.
    2. A stale base is a 409 (`saveConflict`).
    3. A request that fails `checkComposeRequest` is a 400.
    4. Call `runComposeTurn({ pkgRoot: root, base: b.base, ask: b.ask, brief: b.brief ?? null })` and return 200.
    5. The three owner-facing refusals come back as `200 { refused: { kind, message } }`: `busy` (already in
       flight), `open-proposal` (waiting for your verdict) and `no-prd`. Anything else is re-thrown to the
       catch-all.
- **PATTERN**: `server.mjs:468-484`.
- **GOTCHA**: name every parameter; never spread `{...b}`. `transport` is not a route parameter, so it is
  unreachable from HTTP. Only the env seam reaches it.
- **VALIDATE**: a portal smoke on a free port, killing only its own PID (memory `portal-smoke-port-scoped-kill`):

  ```bash
  P=$(node -e 'const s=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})')
  (cd portal && PORT=$P node server.mjs >/tmp/p312.log 2>&1 & echo $! >/tmp/p312.pid); sleep 2
  curl -s localhost:$P/api/health | head -c 80
  curl -s "localhost:$P/api/canvas/run?provenance=fictional&slug=faster-payment" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).compose)))'
  kill $(cat /tmp/p312.pid)
  ```

  Expected: `{"ok":true…` from `/api/health`, and `{"open":null,"last":null,"turns":0}` for `compose`.
- **SATISFIES**: AC #1.

### Task 4.2 UPDATE `portal/public/canvas.html` + `portal/public/portal.css`

- **IMPLEMENT**:
  - The first child of `<aside class="cv-rail">` is
    `<section class="cv-compose" data-compose-panel aria-label="Compose"></section>`.
  - Add token-only CSS in the style of `portal.css:288-312`: `.cv-compose`, `.cv-compose-card`,
    `.cv-compose-why`, `.cv-compose-brief`, `.cv-compose-actions`, `.cv-missing` and `.cv-missing-btn`.
  - Buttons use `btn btn-secondary cv-btn`, which the journey's 44×44 check already reaches.
- **VALIDATE**: `grep -c "data-compose-panel" portal/public/canvas.html` → `1`.
- **SATISFIES**: AC #1, #3.

### Task 4.3 UPDATE `portal/public/canvas.mjs` — panel, accept/refuse, missing-state asks

- **IMPLEMENT**:
  - **Header, call 6, "THE AGENT PROPOSES, THE OWNER DISPOSES (#312)".** A proposal is never in `doc`. Accept is
    the owner's op on this page's undo stack (`accepted` + `fromStep`); refuse is a `refused` line. A turn never
    reloads the page, unlike `canvas-import.mjs` call 1: a `proposed` line enters no fold, so the page adopts
    `count` and keeps its history.
  - **State.** Add `let compose = null` and `let composing = false`. `boot` sets `compose = run.compose`, and
    `getCanvasPage` also returns `compose`.
  - **`applyOwnerOp(op, { commit = true, line = null } = {})`** pushes `{ ...op, status: "applied", ...line }`.
  - **`flush()`** gets a first guard after `broken`: `if (composing) { again = true; return; }`.
  - **`renderCompose()`** fills `[data-compose-panel]`:
    - A labelled `<textarea id="cv-brief" maxlength="500">`.
    - `[data-compose-ask]` "Ask for a screen". It is disabled while `composing || compose.open || broken`, and a
      status line says why.
    - When a proposal is open, a card holding:
      - "Proposed by the agent · turn c<n>";
      - the rendered screen: for a screen, `renderComposition(vocab, params.composition)`; for a state,
        `frameTree(applyOp(doc, op), newId).tree`, rendered; either wrapped in try/catch into `Refused: …`;
      - `Why: …`;
      - `Your brief: "…"`, or `No brief this turn.`;
      - the proposed decisions, or the G15 flag `No decision named — it will be flagged`;
      - `[data-compose-accept]` and `[data-compose-refuse]`.
    - The last outcome, one of: `Refused: …`, `Not covered: …`, `The agent proposed nothing this turn.`, or
      `The turn failed: …`.
    - Everything is `textContent`.
  - **Missing states (G27).** In `frameParts`, a base frame's caption gets `el("span", {class:"cv-missing"})`. It
    holds one button per `missingStates(doc)` key for that frame:
    `data-cv-ask-state="${f.id}:${key}"`, with `aria-label="Ask for a proposal: the ${key} state of ${frameName(f)}"`
    and the text `${key}: missing`. `frameSig` adds `missing`. Import `missingStates`.
  - **`askTurn(ask)`**, delegated from both ask controls:
    1. Return if `broken || composing`.
    2. Flush first with `flushSettled()`: up to 20 ticks, else say "Not asked — the page could not save first".
    3. Set `composing = true`, and render.
    4. `POST /api/canvas/compose` `{ provenance, slug, base: count, ask, brief }`.
    5. Handle the answer:
       - 409: set `broken` and show the reload message.
       - `refused`: say it.
       - OK: `count = body.count`, `compose = body.view`, and clear the brief.
    6. `finally`: `composing = false`, render, then flush if `again` is set.
  - **Accept and refuse go through the bus**, because the wildcard save is the only save trigger (call 2).
    - On `ui.proposal-accept`:
      1. Guard that the target id is `String(compose.open.seq)`.
      2. Run a trial `applyOp` in a try/catch. A throw is said as `Refused: …`.
      3. Place the new frame: `boxes.set(newId, placeDecision(anchorBox, takenBoxes(), { w: width, h: NODE_H }))`.
         The anchor box is the rightmost base frame for a screen, and the base frame for a state.
      4. `applyOwnerOp(op, { line: { status: "accepted", fromStep: seq } })`.
      5. Set `compose.open = null`, render, and say `Accepted … as <newId>.`
    - On `ui.proposal-refuse`:
      1. `pending.push({ op, params, status: "refused", fromStep: seq })`.
      2. Set `compose.open = null`, render, and say `Refused …`.
    - The buttons emit with the `source` rule from `emitFrom`.
- **PATTERN**: `openInspector`'s `emitFrom` (`:523`); `addNote` (`:644`); `placeCard`'s `placeDecision` (`:298`).
- **GOTCHA** G14: `placeDecision` places in the anchor's ROW, right of everything in it. An exhibit sits in the
  frames' top row, so the accepted frame lands to the right of any exhibit. `flush`'s clash backstop
  (`:465`) stays in place anyway.
- **GOTCHA** G15: `effective` holds `{op, params}` exactly as `applyOwnerOp` pushes it. So `adapter.restore`'s
  diff (`:425-426`) emits an `undone` line that restates the accepted compose, and the store's LIFO check passes.
- **GOTCHA** G16: the page's history starts at load (`README.md:667`). The journey's undo step therefore runs
  before any reload.
- **GOTCHA** G17 (memory `hidden-defeated-by-author-display`): build and remove nodes rather than toggling
  `hidden`.
- **VALIDATE**: `node --check portal/public/canvas.mjs`, then the journey's compose pass.
- **SATISFIES**: AC #1, #3, G15, G26, G27.

### Task 5.1 ADD `tooling/build-checks.mjs` — group 47 "compose session"

- **IMPLEMENT**: a block after group 46's `group(...)` at `:15747`, in group 43's shape.
  - **The helpers:**
    - `pkgCopy`, the stand-in shape: `run.json`, `prd.md` and `build/`, with no `transcript.jsonl`;
    - `ledger` and `tx` (which reads `build/transcript.jsonl`);
    - `gitSnap` over `discovery portal/lib system handoff`;
    - `deep`, `threw`, `athrew`, `fold`, `afold`.
  - **The header** carries an honesty rule: every agent line in this group comes from the fake or an inline
    scripted transport, inside a scratch copy. It also states what the group cannot reach: a model's behaviour,
    the SDK's option handling, hook delivery, and the page.
  - **The cases:**

    | Case | What it drives |
    |---|---|
    | 47.1 | `canvas-session.mjs` imports in CI, where there is no `portal/node_modules`. Its parsed specifiers are exactly `node:*`, `../../system/{canvas-ops,agentic-renderer}.mjs` and `./{canvas-store,builder,discovery,env}.mjs`. It names no SDK or zod, and its one dynamic `import(` names `./canvas-transport.mjs`. That transport is the only `portal/lib/canvas-*.mjs` naming the SDK. 36.6 is re-asserted unchanged. |
    | 47.2 | `sha16([ROLE, LOOP, ESCAPE, TURN_ASK, FORK_ASK].join("\n")) === "c903170484396973"`. `FORK_ASK` is parsed out of `driver.txt` by regex, never copied. `S.FORK_ASK` and `S.YIELD_CONTRACT` are both asserted `undefined`. |
    | 47.3 | `vocabContext(VOCAB)` carries `### <name>\n` for every key of `vocabulary.json`; the count is derived from the keys (26 today, observed). A synthetic `zz-probe` component appears in `buildSystemPrompt`'s output, and a removed component disappears from it. |
    | 47.4 | `ESCAPE_RE` passes `NOT COVERED: x`, `**NOT COVERED:** x`, `1. NOT COVERED: x` and `- NOT COVERED: x`, and fails `This is NOT COVERED: x` and `Proposed a screen.`. The old regex is asserted to FAIL the `1.` case: that is the control, observed `false` this session. |
    | 47.5 | `composeFenceDecision`. The own tool is allowed. `Write`, `Edit`, `WebSearch`, `WebFetch`, `Bash`, `mcp__brilliant__get_selection` and `mcp__discovery__record_decision` are denied by name. A Read of `<pkg>/prd.md` or `vocabulary.json` is allowed. A Read of `CLAUDE.md` or `<pkg>-evil/x` is denied. Six junk tools are denied. A hostile allow-set is denied at both sites. |
    | 47.6 | `Write`, `WebFetch` and the MCP tool, each fed to both sites, are each denied with one `denied` line and the right `via`: six lines. The own tool is allowed with no line. The control: a `Glob` denial writes no line. |
    | 47.7 | A fake screen turn writes one proposed/agent line. A briefed turn's transcript runs `turn` → owner `text` → `init` → `op` → `stats`. An un-briefed turn has `briefed:false` and no owner line. The stats line carries `maxTurns === MAX_TURNS`, the fingerprint, `transport:"fake"` and `outcome:"proposed"`. `composeView` shows the open proposal with its brief. |
    | 47.8 | A second turn while a proposal is open is refused, and nothing moves. |
    | 47.9 | `twice:` gives one proposed line plus one `one-per-turn` refusal, and exactly one new ops line (`one-per-turn` is transcript-only, Task 2.4 step 5). |
    | 47.10 | Refusals by Task 2.4 step 5's list. With an agent `refused` ops line and a transcript line: `invalid:` (vocabulary), `why: ""` (applier, D4), a composition with an id-less CHILD (ids, naming `composition.children[i]`) beside its positive control, the same composition with only the ROOT id-less, which is FILED; an unknown part (applier), `add` (applier, G19). Transcript-only, no ops line: a wrong stateKey (wrong-target). |
    | 47.11 | `impossible:` writes no ops line and a `not-covered` refusal, with `outcome: "escape"`. A text reply without the marker gives `empty-yield`. **The outcome comes from the lines, never the words** (probe run 2 T1): an inline transport whose one call is refused (ids) and whose closing text says "I've proposed the payee-form screen" classifies `refused`, and `composeView(pkg).last.outcome === "refused"`. A stats line with `ok: false` (a scripted `is_error: true` with `subtype: "success"`, probe run 1's shape) classifies `failed`. |
    | 47.2b | `S.promptFingerprint() === "9690d4c955be652c"`, the surface probe run 4 ran under (`canvas-compose-loop-312-probe/raw/run-4/T1.jsonl` stats line). A change to `BRIEF_LEAD`, `STATE_ASK`, either tool description or the four S6 constants re-opens the probe, and the message says so. |
    | 47.16 | `subscriptionEnv()` over a synthetic env `{ANTHROPIC_API_KEY:"k", CLAUDE_CODE_OAUTH_TOKEN:"t", PATH:"p"}` returns `{CLAUDE_CODE_OAUTH_TOKEN:"t", PATH:"p"}`, and never mutates `process.env`. The transport's `query(` block passes `env: subscriptionEnv()` (in 47.14's source pin). |
    | 47.12 | The AC #1 ledger: proposed → `saveRun` accepted (with a position) → state proposed → `saveRun` refused → `saveRun` undone. The statuses read `proposed, accepted, proposed, refused, undone`; the sources read `agent, owner, agent, owner, owner`. The frame leaves the fold, the proposed line stays intact, and `verifyBuild` is `[]`. Refused cases: a second verdict, a verdict restating other params, `fromStep` on an applied line, and `fromStep` naming an owner line. A hand-mutated ledger fails `verifyBuild`. `appendAgentLine` refuses a second open proposal. |
    | 47.13 | The lock both ways. A gated inline transport makes `runImport` reject with `a compose turn is already in flight`. A gated `runImport` reader makes `runComposeTurn` reject with `an import is already in flight`. Both first calls then complete. Ratify's leg is named as #313's. |
    | 47.14 | Source pins. The transport's `query(` block has `strictMcpConfig: true`, `tools: []`, `allowedTools: []`, `maxTurns`, `canUseTool`, `hooks`, `resume` with `\|\| undefined`, `env: subscriptionEnv()`, and no `Stop`. `decisionRefs: z.array(z.string())` carries no `.optional()`. The compose route calls `saveConflict` before `runComposeTurn`, names every field, and has no `transport`. The run route carries `compose: composeView(root)`. |
    | 47.15 | `gitSnap()` is unchanged. |
  - Close with `group("compose session", "<paragraph>")`, and change `:15754` to `"all 47 groups pass"`.
- **GOTCHA** G18 (memory `check-that-cannot-fail`): each case runs the function. Only 47.14 is a source pin, and it
  says so.
- **GOTCHA** G19 (memory `gate-prose-has-three-copies`): the "cannot reach" clause lives in the group string,
  `gates.md` and the fake's header. Keep the three identical.
- **VALIDATE**: `(cd tooling/icons && npm ci) && node tooling/build-checks.mjs 2>&1 | tail -2` →
  `build ✓  all 47 groups pass`. Without the icons install, `icons ✗` is the environment only (observed in the
  clone).
- **REDDENS** (each run once, recorded in the report):

  | Case | Mutation |
  |---|---|
  | 47.2 | change a character of `LOOP` |
  | 47.3 | skip the first vocabulary entry |
  | 47.4 | revert the regex |
  | 47.6 | drop `Write` from `RECORDED_BUILTINS` |
  | 47.8 | drop the open guard |
  | 47.9 | drop `calls.length > 1` |
  | 47.10 | skip the ids walk for children; separately, require the root's id |
  | 47.12 | drop the double-verdict check |
  | 47.13 | use `withDiscoveryRunLock` instead |
  | 47.14 | delete `strictMcpConfig`; separately, delete `env: subscriptionEnv()` |
  | 47.2b | append one word to `STATE_TOOL_DESCRIPTION` |
  | 47.11 | classify by `onText` instead of the op lines |
  | 47.16 | return `{ ...process.env }` |
- **SATISFIES**: AC #1–#7.

### Task 5.2 UPDATE `tooling/canvas-journey.mjs` — the compose pass (C1–C12), $0

- **IMPLEMENT**:
  - **`seed()`** adds `fp-compose`: `run.json`, `prd.md` and `build/`, with no `transcript.jsonl`.
  - **`composePass(engine, t, step, errors)`** runs after `measurePass` (`:609`), inside
    `withPortal(MCP_DOWN, fn, { extraEnv: { UXF_COMPOSE_TRANSPORT: path.join(REPO, "tooling/fake-compose-agent.mjs") } })`.
    The main portal child never gets the fake.
  - **The steps:**
    - **C1**: the panel shows, Ask is enabled, and the package carries the stand-in flag.
    - **C2**: a turn briefed `payee form, no dialog, error state inline`. The card shows the brief, and its `why`
      quotes it. The last ops line is proposed/agent `screen.compose`. The owner line precedes the turn's `init`.
    - **C3**: Accept. f3 appears. The last ops line is accepted/owner with `fromStep`. The `error: missing`
      button shows on f3.
    - **C4**: click `[data-cv-ask-state="f3:error"]`. The last ops line is a proposed/agent `state.add` with
      f3/error.
    - **C5**: Refuse. The last ops line is refused/owner with `fromStep`, and no new frame appears.
    - **C6**: the last four lines read `proposed, accepted, proposed, refused` from `agent, owner, agent, owner`.
    - **C7**: undo. The last line is an `undone` restating C2's op. f3 is gone from the stage and the disk fold,
      and C2's proposed line is byte-identical on disk.
    - **C8**: an empty-brief turn records `briefed:false` and no owner line. Then Refuse.
    - **C9**: `impossible: a live map of nearby branches`. The ledger does not move, the transcript has a
      `not-covered` line, and the page says `Not covered: …`.
    - **C10**: `fence: probe`. Six `denied` lines, and the ledger does not move.
    - **C11**: `verifyBuild` is `[]`, and the page doc equals the disk fold.
    - **C12**: the compose buttons are at least 44×44, there are no page errors, and `gitDiscovery()` is
      unchanged.
  - Add THE COMPOSE PASS (#312) and its cannot-reach to the header, and a compose clause to the tally line.
- **PATTERN**: `importPass` (`:636+`), `withPortal` (`:173-205`).
- **GOTCHA** G20 (memories `stale-serve-wrong-tree`, `portal-smoke-port-scoped-kill`): `withPortal` already
  asserts `bootSha === HEAD` and kills by handle. Never add a kill by name pattern.
- **GOTCHA** G21 (memory `webkit-lazy-iframe-in-scroller`): wrap each C-step in `step()`, so that a webkit throw
  is named rather than ending the leg.
- **VALIDATE**: `node tooling/canvas-journey.mjs all` → ✓ on three engines, with the compose clause (expected).
- **REDDENS**: make `verbs.commit()` skip on accept (`commit: false`). C7 goes red: `undo did not remove f3`.
- **SATISFIES**: the $0 halves of AC #1–#4.

### Task 6.1 UPDATE docs — README, CLAUDE.md, gates.md

- **IMPLEMENT**:
  - **`discovery/README.md`, § The build half:**
    - Add a subsection, `### build/transcript.jsonl — the compose loop`. It covers the seven line types with an
      example of each, the turn-id rule, "the brief is the owner's words, verbatim, never an op", and why the file
      is not the package's `transcript.jsonl` (G4).
    - Under `### ops.jsonl`, rewrite the `fromStep` bullet (`:652-653`) as the verdict rule:
      - agent lines are `proposed | refused`;
      - the owner's verdict is `accepted | refused` plus `fromStep`, restating the proposal, one per proposal;
      - an undone accepted line restates the op, without `fromStep`;
      - `appendAgentLine` sits beside `saveRun`.

      "No committed line carries one yet" stays true, because the live receipt lands under `.claude/plans/`, not
      under `discovery/`.
  - **`CLAUDE.md`, the map**, one line each for `lib/canvas-session.mjs`, `lib/canvas-transport.mjs` and
    `tooling/fake-compose-agent.mjs`. Also: change `46 PURE groups` to `47` (`:141`) and `46 groups` to `47`
    (`:222`), and extend the `lib/canvas-store.mjs` line.
  - **`.claude/references/gates.md`**: a `**Group 47 — the compose session**` entry after 46 (`:84`), and a
    compose-pass clause in the `canvas-journey.mjs` entry.
- **GOTCHA** G22 (memory `drift-check-syntax-checks-parked-mjs`): nothing under `.claude/plans/` is `.mjs`.
- **VALIDATE**: `node tooling/drift-check.mjs` → ✓ (with icons installed), and
  `grep -c "47 PURE groups" CLAUDE.md` → `1`.
- **SATISFIES**: documentation; the F1 fact recorded.

### Task 6.2 ADD `--live-compose` to `tooling/canvas-journey.mjs`, then RUN it (PAID, owner-run, blocks the PR)

- **IMPLEMENT**:
  - **The flag.** Chromium only, and not together with `--live-brilliant`. Widen the `badFlag` check at `:97-98`.
  - **The leg.** A side portal with no `UXF_COMPOSE_TRANSPORT`, over a fresh `fp-compose`. The budget cap is
    `$1.00`, summed from the stats lines.
  - **The turns:**
    - **L1**: a briefed screen turn (`payee form, no dialog, error state inline`). Accept it if it proposed. If it
      is refused (1 of 3 first calls in the probe), Refuse is not needed: nothing is open. Ask AGAIN as a fresh
      turn, with the same brief, up to twice. Each re-ask is a new turn with its own lines, so it is not an
      in-turn retry. Stop the leg `failed` only after three refusals, and report them as Q6 evidence, not as a
      code failure.
    - **L2**: the `error` flag on the accepted frame. Refuse it if it proposed.
    - **L3**: `a live map of the customer's nearby branches with walking directions`. An escape is expected, not
      guaranteed.
    - **L4**: an un-briefed screen turn, then Refuse.
  - **Asserted: SHAPES only.**
    - `ok: true`, `transport: "sdk"` and `maxTurns === 4` on every stats line;
    - the init lines advertise exactly the turn's tool;
    - one `sessionId` across all four turns;
    - L1's owner line comes before its `init`;
    - `verifyBuild` is `[]`.
  - **Reported, not asserted**: whether L1's `why` names the brief, L3's outcome, and L2's validity.
  - **The receipt.** Copy `build/ops.jsonl`, `build/transcript.jsonl` and stdout into
    `.claude/plans/canvas-compose-loop-312/raw/live-1/`. That directory must not exist beforehand.
- **GOTCHA** G23 (memory `discovery-run-cache-ttl-cost`): run the four turns back to back. Expected cost is
  derived from the probe's observed turns: $0.08–0.23 per screen turn and $0.14 for a state turn, about $0.40–0.60
  in all, under the $1.00 cap.
- **GOTCHA** G23b: auth is the transport's `subscriptionEnv()`, so an exported `ANTHROPIC_API_KEY` no longer
  matters (probe run 1). If a turn still reads `Credit balance is too low`, the leg stops `failed` on it (G12b),
  never retries, and spends $0.
- **GOTCHA** G24 (memory `honesty-contract-mirror-direction`): the leg's clicks on Accept and Refuse are the
  operator's scripted verdicts for a receipt, not the owner's design judgement. The report says so.
- **VALIDATE**: `node tooling/canvas-journey.mjs chromium --live-compose` → `canvas-journey ✓ … live-compose`.
  Cost is about $0.40–0.60, derived from the probe's observed turns (G23).
- **SATISFIES**: the model halves of AC #3 and AC #4; AC #6.

---

## TESTING STRATEGY

There is no test suite (CLAUDE.md § Testing). Four gates cover this ticket:

- build-checks group 47: in CI, pure, $0;
- the transport `--preflight`: zero tokens, but needs the portal's dependencies;
- `canvas-journey.mjs all`: three engines, $0, using the fake;
- `--live-compose`: paid and owner-run.

### Unit Tests

Group 47.1–47.14. They drive the real session, store, fence and handler over scratch copies. The model is replaced
by the fake or by an inline transport, and each case says which.

### Integration Tests

- The journey's C1–C12: the real portal, page, routes and store, on three engines.
- The preflight: the real SDK server's handlers, and its zod layer.

### Edge Cases

- **A stale page** gets a 409 before any token (route), and again inside the lock (session).
- **A busy lock** gives `busy`. **An open proposal** gives `open-proposal`. **No `prd.md`** gives `no-prd`.
- **The six refusal kinds**, plus `one-per-turn`, are each a line and never a retry.
- **The escape marker** is found after numbering or markup, and a mid-sentence "NOT COVERED:" is not an escape.
- **Accepting a state whose base was removed** makes the page's `applyOp` refuse, and the page says so.
- **Undoing an accepted compose** writes an `undone` line. A redo writes an `applied` owner line (Q3).
- **A `Write`, `WebFetch` or MCP call fed to the fence** is denied at both sites, with a line at each. A warmup
  `Glob` is denied with no line.

### Proving the checks

Every check carries a REDDENS mutation. The implementer runs each mutation once, records the red message, and
reverts. The positive controls are:

- 47.4: the old regex fails `1. NOT COVERED:`;
- 47.6: a `Glob` denial writes no line;
- 47.13: both first calls complete;
- 47.12: the frame leaves the fold after undo;
- C7: the proposed line stays intact.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

- `node --check portal/lib/canvas-session.mjs portal/lib/canvas-transport.mjs tooling/fake-compose-agent.mjs portal/public/canvas.mjs`
- `node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
  (observed at `171af6c`).

### Level 2: Unit Tests

- `(cd tooling/icons && npm ci) && node tooling/build-checks.mjs 2>&1 | tail -2` → `build ✓  all 47 groups pass`.
  Observed at `171af6c` without the icons install: 45 groups ✓, and `icons ✗` from the environment.
- `node tooling/drift-check.mjs` → ✓. Observed without icons: `drift ✗ gen-icons: … npm ci`.
- `node agent-layer/gen-loc-summary.mjs --check` → no drift (expected).

### Level 3: Integration Tests

- `cd portal && npm ci && node lib/canvas-transport.mjs --preflight` → `preflight ✓ 8/8`.
- The portal smoke in Task 4.1.
- `node tooling/canvas-journey.mjs all`.

### Level 4: Manual Validation

- Open `canvas.html?provenance=fictional&slug=faster-payment`. Check three things:
  - loading the page makes zero saves;
  - the compose panel shows;
  - f1 carries `empty · partial · loading: missing` buttons.

  Do not press Ask on the in-repo package unless you mean to commit the result.

### Level 5: Additional Validation (Optional)

- CodeQL runs diff-scoped on the PR. The new route reaches a path only through `resolveRunRoot` +
  `assertProvenanceRoot`.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| `canvas-journey.mjs chromium --live-compose` (Task 6.2), receipt committed | ~$0.40–0.60 (derived from the probe's observed turns), capped at $1.00 | **yes** (owner, 2026-09-29) | n/a: it blocks |
| The owner's read of L1's `why` against the brief, and of L3's outcome | owner's hand | no. The receipt is committed. | report's Not run → #316 |
| Ratify's leg of AC #5 | n/a (#313 is unbuilt) | no | #313 (it adds a 47.13 leg) |

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** (`fp-compose`, three engines, the fake; C2–C7, plus 47.12 in CI):
  - turn 1 proposes one screen and yields;
  - Accept;
  - the missing-state flag appears, and "Ask for a proposal" asks for exactly that state;
  - Refuse;
  - `ops.jsonl` reads `proposed, accepted, proposed, refused` from `agent, owner, agent, owner`;
  - undo writes an `undone` line, the frames are gone, and the proposal is intact.
- [ ] **AC #2**: `Write`, `WebFetch` and the MCP are each fed to both fence sites; each is denied with its `denied`
  line (47.6, C10).
- [ ] **AC #3**:
  - on a briefed turn, the owner's line comes first and the card shows the brief (C2, 47.7);
  - the `why` names the brief: the plumbing is proven by the fake, and the model's behaviour is observed on L1;
  - an un-briefed turn records `briefed: false` (C8, 47.7).
- [ ] **AC #4**:
  - the vocabulary context comes from the generator, run over `vocabulary.json` (47.3);
  - the escape is a recorded refusal (47.11, C9; the model on L3).
- [ ] **AC #5**: `withRunLock` holds across compose and import, both ways (47.13). Ratify's leg is #313's.
- [ ] **AC #6** (F1): `maxTurns` is on every stats line.
- [ ] **AC #7** (F2): `ESCAPE_RE = /^[^A-Za-z\n]*NOT COVERED:/m`, with the `1. NOT COVERED:` case and the old regex
  as the control (47.4).
- [ ] The gates are green: build-checks 47/47, drift-check, token-lint, the preflight and the journey. `system/`
  and `handoff/` are untouched.
- [ ] The PR body says "Auth is the subscription, unchanged; turns are one proposal each for that reason", and
  carries `Closes #312`.

---

## COMPLETION CHECKLIST

- [ ] Every task is done in order, with its VALIDATE output pasted into the report.
- [ ] Every REDDENS mutation has been run once and its red message recorded.
- [ ] `--live-compose` has run, and its receipt is committed.
- [ ] The plan, the report (`.claude/reports/canvas-compose-loop-312-report.md`) and the review are in the same PR.
- [ ] `git diff --stat origin/main -- system/ handoff/` is empty.

---

## OPEN QUESTIONS / ASSUMPTIONS

The owner decided three things this session (2026-09-29):

- the compose transcript is `build/transcript.jsonl`;
- a state proposal's reason lives on the transcript's op line;
- the paid live leg blocks the PR.

Still open:

- **Q1 (SETTLED by the probe).** Every part below the root needs an id. The agent complied on 3 of 3 proposals
  once the root was exempt (runs 3–4), and run 3's state override addressed those ids. The rule stays a
  session-level refusal (G7).
- **Q2 (RESOLVED by the Phase 0 probe, 2026-09-29, $0.82).** The new prompt surface was run for real
  (`canvas-compose-loop-312-probe/README.md`):
  - a briefed turn's `why` named the brief;
  - a state turn filed exactly the asked target with a valid override;
  - the resume held across the tool change;
  - an impossible screen escaped.

  Three corrections came out of it, all folded in above: the root is exempt from the id rule, `decisionRefs` is
  required at the tool, and the outcome is taken from the lines.
- **Q6 — one in-turn correction? (the owner's product call; not a risk to this plan).** In both refused probe
  turns (run 2 T1, run 3 T3), the agent's second call was the correct fix, and the ticket's "never a retry"
  refused it. After the root exemption, 1 of 3 screen turns (runs 3–4: run 3 T1, run 3 T3, run 4 T1) was refused on its first call, by the vocabulary; 0 of 3 on ids. The plan keeps the
  ticket's rule. Allowing ONE correction is a one-line change in `fileProposal` (`ctx.calls.length > 1` → allow a
  second call only after a refusal), with 47.9 inverted to match.
- **Q3. Redo after undoing an accepted compose** appends an `applied` owner line, following the README's redo
  rule. From then on, the agent's authorship is traceable only through the earlier `proposed` line. Recorded, not
  changed.
- **Q4. "The board"** has no source in a discovery package, so nothing is read for it.
- **Q5. The stand-in.** `faster-payment` now carries a real run's transcript (#291 is closed). "The stand-in brief"
  is therefore the journey's `fp-compose`, a copy without `transcript.jsonl`.

## NOTES (open canvas)

**N1 — the pre-flight**, run against `origin/main` at `171af6c`, in a fresh clone (`~/Desktop` returned EPERM
mid-session).

- `build-checks`: 45 groups ✓ and `icons ✗`, because `tooling/icons` is not installed in the clone. Environment
  only.
- `drift-check`: `✗ gen-icons`, same cause. `token-lint`: ✓ 63 tokens.
- The S6 driver's `--selftest`: `✓ 17/17`.
- S6's fingerprint, recomputed from `driver.txt`'s constants, is `c903170484396973`. It matches all four stats
  lines in `raw/run-2`, which is what makes 47.2 possible.
- The vocabulary sha is `a2bfea9494d879de`, the same as S6's. So today's generated context is exactly the context
  S6 ran with, over 26 components.
- The escape regex over six strings: the old one misses `1. NOT COVERED:` and `_NOT COVERED:`; the new one catches
  both, and still rejects `This is NOT COVERED:`.
- The Q1 probe: appending an owner line to the package `transcript.jsonl` left `prd-projection` byte-identical and
  build-checks unchanged. The owner still chose `build/transcript.jsonl`, for the stand-in reason (G4).
- S6's outline carries 0 part ids, hence G7 and Q1.
- **Checked against `origin/main`, and not there:** a session module, `appendAgentLine`, verdicts in `saveRun`,
  `missingStates` on the page, a committed `fromStep`, and a `Stop` hook.
- **Checked against `origin/main`, and present:** `withRunLock(fn, what)`, `placeDecision`, `frameTree`,
  `missingStates`, `allowsPath`, `isMcpToolName`, and `UXF_BRILLIANT_MCP`.
- **What changed in the plan because of the pre-flight:**
  - 47.2 became a fingerprint pin.
  - Part ids became a rule.
  - `RECORDED_BUILTINS` was added (G5): #349's record gate would deny a `Write` fed to it and write no line.
  - Discovery's `fenceDecision` was ruled out (G3).
  - The group count is 46 → 47. This session's context copy of CLAUDE.md said 41; `origin/main`'s says 46.

**N2 — why no reload after a turn.** `canvas-import.mjs` reloads because the server wrote an `applied` line that
the page's history never saw. A `proposed` line enters no fold, so the page's `doc` and `effective` stay exact.
Adopting `count` is enough, and the undo history survives across turns, which is G26's point.

**N3 — alternatives rejected:**

- **A server-side accept route.** The page would have to reload, or mirror a server-written op onto its undo
  stack. The architecture wants accept to undo "like any move".
- **Reusing `fenceSite` through `extraTools`.** Rejected for G3's reason.
- **The package transcript**, and **`why` on `state.add`.** Both were the owner's calls against.

**N5 — the store half of AC #1, proven at $0 against `origin/main`'s real code.**
`foldLedger` + `arrangement` + `verifyBuild` from `portal/lib/canvas-store.mjs`, over the committed
`faster-payment` ledger plus five lines built from probe run 4's REAL screen:
`proposed/agent → accepted/owner (fromStep) → proposed/agent (state.add error of f3) → refused/owner (fromStep) →
undone/owner`.

- After the accept: f3 exists, and `missingStates` lists `empty, error, partial, loading` for it.
- After the undo: frames `f1,f2`, and `effective` is back to 6 lines.
- `verifyBuild` returns `[]`.
- The accepted tree passes `validateComposition`.

So the fold, the arrangement and the gate need NO change for AC #1. Only `saveRun`'s status gate (Task 1.2) and
`verifyBuild`'s verdict checks (Task 1.3) are new store code.

**N4 — traps carried** (memories and references): G9, G17, G18, G19, G20, G22, G23 and G24 above.
`shared-worktree-parallel-sessions`: this checkout is on `fix/importer-reads-icon-name-449`, so branch off
`origin/main` into a worktree of its own. `owner-merges-fast-verify-landed`: re-fetch before opening the PR.

## AMENDMENTS

- 2026-09-29 — **Phase 0 probe run, and the risks closed** (owner: "address all risks"). 4 runs, $0.8157, receipts
  in `canvas-compose-loop-312-probe/`.
  - **R1 (the new prompt surface): closed.** The brief is named in `why`, the state turn is valid, and the escape
    works. It needed three corrections: a root-exempt id rule, `decisionRefs` required at the tool, and the
    outcome taken from the lines.
  - **R2 (resume across a tool change): closed.** One session id across `screen_compose` → `state_add` →
    `screen_compose`.
  - **R3 (the store half of the page flow): closed at $0.** The real `foldLedger`, `arrangement` and
    `verifyBuild` run the full AC #1 sequence over run 4's real screen (N5).
  - **R3 (the page half): reduced by construction.** Accept reuses `applyOwnerOp` and the verbs' existing snapshot
    and undo path unchanged, beyond one spread-in `line`. That is the path #306's journey already proves for
    remove + undo.
  - **R4 (ratify's lock leg): re-scoped.** It is #313's, and cannot be run before ratify exists. 47.13 pins that
    compose uses THE `builder.mjs` lock, so ratify inherits the proof by importing the same function.
  - **New and closed: auth.** A shell `ANTHROPIC_API_KEY` sent run 1 to an unfunded API account. The transport
    now passes `env` without it (`subscriptionEnv`), verified.
  - **Answered: which hook an `isError` fires** (`PostToolUseFailure`).
  - Q6 (one in-turn correction) is added for the owner.

- 2026-09-29 — **Implementation pre-flight: plan errors, fixed before implementing.** (piv-implement, base
  `171af6c`.)
  - **47.16 could not drive `subscriptionEnv` from the transport (plan error).** The transport imports the SDK
    statically, and CI has no `portal/node_modules`, so group 47 cannot import it. `subscriptionEnv` lives in
    `canvas-session.mjs` (SDK-free) and the transport imports it from there; 47.14 still pins
    `env: subscriptionEnv()` inside the `query(` block.
  - **47.1 and the env seam (plan error).** `loadTransport` must reach both `./canvas-transport.mjs` and
    `UXF_COMPOSE_TRANSPORT`. It is ONE `import()` whose argument picks between the two; 47.1 pins exactly one
    dynamic import whose text names `./canvas-transport.mjs`.
  - **The preflight's rows need fresh state (plan error).** One shared context and package would refuse PF5 and
    PF7's positive half on the one-call-per-turn counter and the open-proposal guard once PF3 files. Each row
    gets a fresh copy of `discovery/faster-payment` and a fresh handler context, over the exported
    `buildComposeServer`, which `composeQuery` also uses. 47.10's root-exempt control likewise runs on its own copy.
  - **`checkComposeRequest({ ask, brief })` has no `pkgRoot` (plan error).** The `no-prd` refusal is inside
    `runComposeTurn`. `composeRefusal(message)` (exported) maps the three owner-facing refusals — `busy`,
    `open-proposal`, `no-prd` — by stable message fragments, `underLock`'s way; the route uses it.
  - **A blank brief.** The rule is `null` or 1–500 characters after trimming, so `""` is a 400: the page sends
    `null` for a blank textarea (C8). The brief is stored verbatim; only its trimmed length is judged.
  - **47.12 positions.** An accepted compose's `decisionRefs` derive a `d<ref>` card, and `arrangement` refuses a
    node with no position, so 47.12's `saveRun` passes `d7` beside `f3`.
