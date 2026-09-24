# Feature: S6 — the compose turn (spike, #308)

The following plan should be complete, but validate documentation, codebase patterns and task sanity before you
start implementing. **Every `file:line` below was read on `origin/main` at `4d9adf6`** (the primary checkout was
on `fix/importer-reads-icon-name-449`, 73 files behind; do not cite from it).

## Feature Description

A time-boxed spike that answers the compose loop's one real risk before #312 is planned: under
**resume-per-turn** (one SDK session, resumed once per turn, the server deciding when a turn starts), does the
agent file **one** vocabulary-validated `screen.compose` for **one** screen and yield, or does it run ahead and
draft the flow? Three turns over Faster Payment, dry, plus one fork-probe turn. The output is a README with
per-turn numbers, the raw transcripts, the branch the decision rule takes, and a verdict comment on epic #295.

## User Story

As the owner planning #312 (the compose loop)
I want observed numbers on whether one turn yields one screen
So that the loop ships as designed, or with a yield contract, or with a `Stop` hook, decided by evidence rather
than by guess.

## Problem Statement

Architecture § Boundaries (`docs/epics/canvas-design-import.architecture.md:190-194`) commits the compose loop to
"one turn proposes one screen (G13) … and yields". Nothing has tested whether a model given a whole PRD and a
tool that files screens stops after one. If it drafts the flow, #312's accept/refuse/edit rhythm collapses and
the owner stops driving (addendum D1–D5, `:383-397`). Two riders ride on the same runs: B5 (does the generated
vocabulary context produce mobile-like screens, or is `DESIGN.md` #321 pulled forward) and D5 (at a flagged-open
decision, does the agent offer two alternatives or pick one — input to #320's budget rule).

## Solution Statement

One parked driver (`driver.txt`, run as a scratchpad `.mjs` copy — S2's precedent) that:

1. builds an **in-process SDK tool** `screen_compose` (#280's verdict: `.claude/plans/discovery-spike-1-op-transport/README.md:12-16`)
   whose handler runs `validateComposition(vocab, composition)` then `applyOp` on an **in-memory** build
   document — dry: nothing is written under `discovery/`, `system/` or anywhere outside the spike dir;
2. generates the vocabulary context at run time from `handoff/verdant/vocabulary.json` (T13's minimal form) and
   puts the "not covered" escape in the prompt as an explicit outcome;
3. runs four `query()` calls on **one** session — turn 1 opens it, turns 2, 3 and the fork turn `resume` it —
   and records every text block, every op attempt (filed or refused), every denial and every result's numbers
   to per-turn JSONL files;
4. classifies each turn with a **pure** function over those lines, proven on synthetic lines at zero tokens
   before any money is spent;
5. carries the decision rule's later branches as flags (`--contract`, `--stop-hook`) so a re-run changes one
   named constant and nothing else.

## Out of Scope / Non-Goals

- Not included: `portal/lib/canvas-session.mjs`, any route, any canvas UI, the accept/refuse/edit flow — #312.
- Not included: an alternatives tag on `screen.compose`, or any op change — #320 (and the op-verb lock). The
  applier refuses an unknown param by name today (observed below), so the spike must not add one.
- Not included: `system/DESIGN.md` — #321, and only on B5's branch, by the owner's read.
- Not included: a render harness page. B5's instrument is a generated text outline (see Open Questions Q3).
- Not changing: `discovery/faster-payment/**` (the committed build package already holds an owner-composed
  add-payee screen and must never be read by the agent or written by the driver), `system/`, `portal/`,
  `handoff/`, `tooling/`. `recordRun` (`portal/lib/trace-recorder.mjs:64`) is NOT extended — it takes no
  `resume` and no `mcpServers`; the driver calls `query()` directly with the same hook set (Q5).
- No trace under `traces/`: the ticket parks transcripts under the spike dir; they are raw recorder output,
  not the curated Trace format.

## Feature Metadata

**Feature Type**: Spike (research; ships no product code)
**Estimated Complexity**: Medium (the driver is ~300 lines; the risk is measuring the wrong thing)
**Primary Systems Affected**: none shipped — `.claude/plans/canvas-spike-s6/` only
**Dependencies**: `@anthropic-ai/claude-agent-sdk` 0.1.77 + `zod` 4.4.3 from `portal/node_modules` (observed);
the CLI's own login for auth (memory: no `portal/.env` token needed)

## Related Work

**Implements**: #308 · **Epic**: #295 — `docs/epics/canvas-design-import.architecture.md` (§ Spikes item 5,
`:321-326`; § Boundaries `:190-199`; addendum D3/D4/D5/B5 `:390-393`)

**Back-references**:

- `.claude/plans/discovery-spike-1-op-transport/` — #280: the in-process tool, the zod raw shape, the loader
  from `portal/node_modules`, the two-site fence. This spike is its compose-side twin.
- `portal/lib/discovery-transport.mjs` — the resume-per-turn loop in production (discovery's approach C), which
  #312 is "one layer up" from (architecture `:59-61`). The driver mirrors its `query()` options and result read.
- `.claude/plans/canvas-spike-s2/README.md:86-90` — the parking rule: driver as `.txt`, copied to the scratchpad
  as `.mjs` to run.
- `.claude/plans/discovery-faster-payment-run-291.md` — produced `discovery/faster-payment/`, this spike's input.

**Forward-references**: #312 (consumes the branch) · #320 (consumes the fork row) · #321 (opened or closed on B5).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING (all on `origin/main`)

- `docs/epics/canvas-design-import.architecture.md:96-98` — the vocabulary context is generated at run time;
  "not covered" is an explicit outcome. `:190-199` — the loop and the transport. `:321-326` — S6's question,
  spike, decision rule. `:337-338` — the `Stop` hook is only after S6. `:390-393` — D3, D4, D5, B5.
- `system/canvas-ops.mjs:56-90` — `OPS` (`:56`), `PARAMS["screen.compose"]` (`:73`) = `[screenId, why, composition, decisionRefs]`,
  `decisionRefs` optional (`OPTIONAL`, `:88-89`). `:213-233` — the `screen.compose` case: refuses an empty `why` (D4), mints `f<n>`,
  pushes a frame. **It does NOT validate the composition against the vocabulary** — the handler must.
  `:412-419` — `applyOps(ops, doc)` takes `{op, params}` envelopes only.
- `system/agentic-renderer.mjs:46` — `validateComposition(vocab, composition, path)`: throws naming the path.
- `handoff/verdant/vocabulary.json` — `{ $description, scenario, generatedFrom, composition, components }`;
  26 components; each entry `{ class, status, props{type, required, enum?, description}, states, children[],
  childrenCardinality?, usage }`. `stack` and `list` carry `childrenCardinality: "many"`.
- `portal/lib/discovery-transport.mjs:49-78` — `MAX_TURNS` and the arithmetic: `num_turns = 1 + tool calls`,
  a refused op costs a slot, and the loop returns as soon as an assistant message has no `tool_use`.
  `:109-151` — `buildOpServer`: refusal is an `isError` result, never a throw. `:167-265` — `runDiscoveryTurn`:
  `resume: head.sessionId || undefined`, `tools`, `allowedTools: []`, `mcpServers`, `strictMcpConfig: true`,
  the init/assistant/result read and the stats shape (tokens from `msg.usage`). `:277-320` — the zero-token
  pre-flight through `server.instance.server._requestHandlers` (a private API; unreachable ⇒ exit non-zero).
- `.claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs:25-35` — `fromPortal(name)`, the
  package.json-entry loader. `:135-160` — the fence: `canUseTool` allows one tool name, `PreToolUse` denies the
  rest, `PostToolUse`/`PostToolUseFailure` recorded.
- `portal/record-composition.mjs:1-30` — the honesty header to mirror: the prompt is built only from the
  vocabulary + the declared input; no seed example anywhere. `MODEL = 'claude-sonnet-5'` (`:47`).
- `discovery/faster-payment/prd.md` (414 lines, 38 425 B) — the input. `run.json`: "Real run — fictional
  scenario", model `claude-sonnet-5`, 24 turns. The flow's four screens come from its answers (seq 6, 7, 8, 11):
  add payee → Confirmation of Payee result → scam-safety stop → amount and send. **seq 11** (`prd.md` §Transition
  note) is the one decision the PRD flags open in prose: "Settle in advance: whether the first release puts a
  limit on the first payment to a new payee, and what it is." Its `## Open questions` section reads "the run
  parked no question" — see NOTES, finding N4.
- `discovery/faster-payment/build/ops.jsonl` — six owner ops, seq 1 an owner-composed add-payee `stack`. It is
  the **positive fixture** for the pre-flight and must never reach the agent.

### New Files to Create

- `.claude/plans/canvas-spike-s6/driver.txt` — the driver (parked; never `.mjs` in the tree).
- `.claude/plans/canvas-spike-s6/raw/selftest.txt` · `raw/preflight.txt` — zero-token outputs, verbatim.
- `.claude/plans/canvas-spike-s6/raw/run-<n>/turn-1.jsonl · turn-2.jsonl · turn-3.jsonl · fork.jsonl · stdout.txt · verdict.json · outline.txt`
- `.claude/plans/canvas-spike-s6/README.md` — the verdict.
- `.claude/reports/canvas-spike-s6-compose-turn-308-report.md` — the implementation report (CLAUDE.md § Git).

### Relevant Documentation

- Agent SDK TypeScript reference (hooks, `resume`, `canUseTool`, `createSdkMcpServer`):
  https://docs.claude.com/en/api/agent-sdk/typescript — Why: the `Stop` hook's `{ decision: 'block', reason }`
  output (branch 3) and the `resume` option. The installed types are the authority:
  `portal/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts:174` lists `"Stop"` in
  `HOOK_EVENTS` (observed).
- MCP tool-name rule (`^[a-zA-Z0-9_-]{1,64}$`): https://modelcontextprotocol.io/specification/2025-06-18/server/tools
  — Why: the op is `screen.compose`, the tool must be `screen_compose`; both are recorded.

### Patterns to Follow

**Refusal as a result** (`portal/lib/discovery-transport.mjs:143-147`):
```js
} catch (e) {
  return { isError: true, content: [{ type: 'text', text: e.message }] };
}
```
**Resume** (`:199-200`): `resume: head.sessionId || undefined` — undefined, never null.
**Result numbers** (`:237-251`): `num_turns`, `duration_ms`, `total_cost_usd`, `usage.input_tokens`,
`output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `subtype === 'success'`.
**Errors**: plain `Error`, message names the path (CLAUDE.md § Ground rules). **No logging library**: the
driver writes JSONL lines and a timestamped stdout log (`[12.3s] …`, spike 1's `log`).

---

## IMPLEMENTATION PLAN

### Phase 1: Branch and inputs
Branch from `origin/main`; create the spike dir; confirm the inputs match the numbers in this plan.

### Phase 2: The driver, zero-token half
The loader, the vocabulary-context generator, the tool and its handler, the classifier, the prompt constants.
`--selftest` and `--preflight` both green before Phase 3. **Depends on:** Phase 1.

### Phase 3: The paid runs
Run 1 (the loop as #312 would ship it). The decision rule chooses whether run 2 (`--contract`) and run 3
(`--contract --stop-hook`) happen. At most three paid runs. **Depends on:** Phase 2 green.

### Phase 4: Verdict
README, epic comment, report, PR. **Depends on:** Phase 3's last run.

---

## STEP-BY-STEP TASKS

### Task 1 — CREATE the branch and the spike dir

- **IMPLEMENT**: work in a dedicated worktree, never by switching the shared primary checkout:
  `git fetch origin && git worktree add -b spike/canvas-s6-compose-turn-308 ../ux-factory-s6 origin/main`, then in it
  `mkdir -p .claude/plans/canvas-spike-s6/raw` and `cd portal && npm ci` (the driver loads the SDK from
  `<repo>/portal/node_modules`; a fresh worktree has none, and `--repo` must point at a tree that does).
- **GOTCHA**: parallel sessions share this working dir (memory: shared-worktree). Run `git branch --show-current`
  immediately before every commit, and stage by explicit path only. The primary checkout carries unrelated
  untracked files (`__mock_discoveries.md`, review files) — never `git add -A`.
- **VALIDATE**: `git log --oneline -1` → `4d9adf6 …` or a later main commit; `git status --porcelain -- system portal discovery handoff tooling` → empty.
- **SATISFIES**: precondition for all ACs. **REGENERATES**: none.

### Task 2 — CREATE `driver.txt`: loader, paths, args

- **IMPLEMENT**: top-of-file header (what, why, the governing doc: `epic #295 ticket #308; architecture § Spikes
  S6`), the honesty rule (the prompt is built only from the generated vocabulary context + `prd.md` + fixed
  driver text; no example composition anywhere), and how to run it:
  `cp .claude/plans/canvas-spike-s6/driver.txt "$SCRATCH/s6.mjs" && node "$SCRATCH/s6.mjs" --repo "$PWD" <mode>`.
  Args: `--repo <abs>` (required; refuse if `<repo>/system/canvas-ops.mjs` is missing), one mode of
  `--selftest | --preflight | --run <n>`; `--out <dir>` (required with `--run`, created if missing), optional `--contract`, `--stop-hook`, `--budget <usd>` (default 3.00).
  Every repo module is imported by absolute URL: `import(pathToFileURL(path.join(REPO, 'system/canvas-ops.mjs')).href)`.
  SDK and zod via spike 1's `fromPortal` (`spike-1-op-transport.mjs:25-35`) with `PORTAL = path.join(REPO, 'portal')`.
- **PATTERN**: `spike-1-op-transport.mjs:20-38`.
- **GOTCHA**: spike 1 derived `REPO` from `import.meta.url` — that breaks once the file is copied to the
  scratchpad. Use `--repo`. The copy must be `.mjs` (Node refuses a `.txt` entry — S2 README `:88-89`).
- **GOTCHA**: `tooling/drift-check.mjs:31-38` runs `node --check` over every tracked `*.mjs`; the driver stays
  `.txt` in the tree, which is why the ticket parks it that way.
- **VALIDATE**: `node "$SCRATCH/s6.mjs"` with no args → exits non-zero naming `--repo`.
- **SATISFIES**: AC #1 (transport recorded). **REGENERATES**: none — `.claude/` is outside every
  `gen-loc-summary` group and outside the CodeQL `paths` allowlist (`.github/codeql/codeql-config.yml` header).

### Task 3 — ADD the vocabulary context generator `vocabContext(vocab)`

- **IMPLEMENT**: a pure function over `vocab.components` → text, one block per component, in the file's key
  order: `name` · each prop as `prop` (+ `!` if required) `: type` or `enum a|b|c` · `children: a, b (many)` or
  `children: none` · the **first sentence** of `usage` (up to the first `. ` or newline, capped at 160 chars).
  Prefixed with `vocabulary.json` `generatedFrom` and a sha256 of the file's bytes, both recorded on every
  stats line. Observed size of this projection on `origin/main`: **5 588 chars** for 26 components (prop list +
  first usage line); the implementer records the real figure.
- **GOTCHA**: generated, never hand-authored (architecture `:96`). Do not filter out the Verdant-locked
  components (`plant-card`, `care-task-row`, `stat-tile`, `status-chip`, `demo-notice`): whether the agent
  forces one into a bank screen is B5's strongest objective signal.
- **VALIDATE**: `--selftest` prints the context's char count and component count (expected 26).
- **REDDENS**: delete one component from a cloned vocab in the self-test → the component-count assertion
  fails naming the missing name.
- **SATISFIES**: AC #1 (ticket scope: context generated at run time). **REGENERATES**: none.

### Task 4 — ADD the tool, the handler and the in-memory document

- **IMPLEMENT**: `SERVER = 'canvas-s6'`, tool `screen_compose` (op `screen.compose`; `FULL = 'mcp__canvas-s6__screen_compose'`).
  Schema, a zod **raw shape** from `portal/node_modules/zod`:
  `{ screenId: z.string(), why: z.string(), composition: z.looseObject({ name: z.string() }), decisionRefs: z.array(z.string()).optional() }`.
  Handler, in order: (1) `validateComposition(vocab, args.composition)`; (2) build `params` with only the
  defined keys (drop `decisionRefs` when undefined); (3) `next = applyOp(state.doc, { op: 'screen.compose', params })`;
  (4) append the op line `{k:'op', turn, tool:'screen_compose', op:'screen.compose', params, status:'proposed', frameId}`
  **before** updating `state.doc = next` (disk first — `discovery-transport.mjs:127-131`); (5) reply
  `filed <frameId>: screen.compose "<screenId>" (proposed — the owner decides)`. On any throw: append
  `{k:'op', …, status:'refused', error: e.message}` and return `isError` with the message verbatim.
- **PATTERN**: `discovery-transport.mjs:109-151`.
- **GOTCHA**: `canvas-ops` refuses unknown params by name — observed: `screen.compose: unknown param
  "alternatives" — it takes screenId, why, composition, decisionRefs`. So an agent that invents a tag gets a
  refusal it can read; record it, do not widen the schema.
- **GOTCHA**: `z.object` would strip unknown keys and the recorded op would not be what the model sent.
  `z.looseObject` keeps them (observed, below).
- **GOTCHA**: dry means `state.doc` lives in memory for one run; nothing is written under `discovery/`.
- **VALIDATE**: `--preflight` (Task 6).
- **SATISFIES**: AC #1 (validated or not, per op). **REGENERATES**: none.

### Task 5 — ADD the classifier `classifyTurn(lines, { kind })` and `--selftest`

- **IMPLEMENT**: pure; `lines` are one turn's JSONL objects; `kind ∈ {'screen','fork'}`. Let `filed` = op lines
  with `status:'proposed'`, `refused` = `status:'refused'`, `ids` = distinct `filed[].params.screenId`,
  `escape` = any `k:'text'` line matching `/^NOT COVERED:/m`. Outcome for `kind:'screen'`:
  `runs-ahead` if `ids.size ≥ 2`; `runs-ahead-repeat` if `filed` repeats a `screenId` accepted in an earlier turn;
  `alternatives` if `filed.length ≥ 2 && ids.size === 1`; `clean` if `filed.length === 1`
  (refused-then-filed is clean, `corrections = refused.length`); `escape` if `filed.length === 0 && escape`;
  `empty-yield` if nothing filed and no marker. For `kind:'fork'`: `two-lanes` (2 filed, one screenId),
  `picked-one` (1 filed), `asked` (0 filed, a `?` in the last text line), `fork-runs-ahead` (≥2 screenIds), else
  `fork-empty`. **The fork turn never enters the run's runs-ahead count** — two lanes are D5's question, not
  a runaway.
  Run verdict: `clean` iff turns 1–3 are all `clean` or `escape`, AND `sessionIds` identical across all four
  turns, AND no result `is_error`. `runs-ahead` iff any of turns 1–3 is `runs-ahead` or `alternatives`.
  `empty-yield` on any of turns 1–3 is its own row (the branch-3 `Stop` hook targets exactly this — Q1).
  `--selftest` asserts 15 named cases and prints `selftest ✓ 15/15` or exits 1 naming the case. Screen (7):
  `clean`, `clean-after-refusal`, `runs-ahead-two-screens`, `runs-ahead-repeat`, `alternatives`, `escape`,
  `empty-yield`. Fork (5): `two-lanes`, `picked-one`, `asked`, `fork-runs-ahead`, `fork-empty`. Run (1):
  `session-changed`. Plus Task 3's `context-26` and Task 8's `outline-add-payee`.
- **SHAPE** (the one piece of logic the verdict rests on — write it as given, then prove it):
  ```js
  export function classifyTurn(lines, { kind, accepted = new Set() }) {
    const ops = lines.filter((l) => l.k === 'op');
    const filed = ops.filter((l) => l.status === 'proposed');
    const refused = ops.filter((l) => l.status === 'refused');
    const ids = new Set(filed.map((l) => l.params.screenId));
    const texts = lines.filter((l) => l.k === 'text').map((l) => l.text);
    const escape = texts.some((t) => /^NOT COVERED:/m.test(t));
    const repeat = filed.some((l) => accepted.has(l.params.screenId));
    const base = { filed: filed.length, refused: refused.length, ids: [...ids] };
    if (ids.size >= 2) return { ...base, outcome: kind === 'fork' ? 'fork-runs-ahead' : 'runs-ahead' };
    if (kind === 'fork') {
      if (filed.length >= 2) return { ...base, outcome: 'two-lanes' };
      if (filed.length === 1) return { ...base, outcome: 'picked-one', repeat };
      return { ...base, outcome: /\?\s*$/.test(texts.at(-1) ?? '') ? 'asked' : 'fork-empty' };
    }
    if (repeat) return { ...base, outcome: 'runs-ahead-repeat' };
    if (filed.length >= 2) return { ...base, outcome: 'alternatives' };
    if (filed.length === 1) return { ...base, outcome: 'clean', corrections: refused.length };
    return { ...base, outcome: escape ? 'escape' : 'empty-yield' };
  }
  ```
  Run verdict (`classifyRun(turns)`): `failed` if any stats line has `isError` or `subtype !== 'success'`, or
  the four `sessionId`s are not identical, or a turn has no stats line; else `runs-ahead` if any screen turn is
  `runs-ahead`, `runs-ahead-repeat` or `alternatives`; else `empty-yield` if any screen turn is; else `clean`.
  The fork outcome is reported beside the verdict, never inside it. A fork turn that repeats an earlier screen
  (the agent already proposed the send screen in turns 1–3) is `picked-one`/`two-lanes` with `repeat: true` —
  the brief asked for that screen, so a repeat there is not a runaway.
- **GOTCHA**: this is the check-that-cannot-fail trap (memory): a classifier never shown a runaway line set
  reads every run clean. The self-test IS the positive control, and it runs before any paid run.
- **VALIDATE**: `node "$SCRATCH/s6.mjs" --repo "$PWD" --selftest > .claude/plans/canvas-spike-s6/raw/selftest.txt` → `selftest ✓ 15/15` (expected).
- **REDDENS**: change `ids.size >= 2` to `ids.size >= 3` → the two-screen runaway fixture classifies `alternatives`
  or `clean` → `selftest ✗ runs-ahead-two-screens: expected runs-ahead, got …`, exit 1. Revert.
  Second mutation: drop the session-id equality from the run verdict → the changed-session fixture reads
  `clean` → `selftest ✗ session-changed`.
- **SATISFIES**: AC #1 (the branch taken is derived, not judged). **REGENERATES**: none.

### Task 6 — ADD `--preflight` (zero tokens, the real server)

- **IMPLEMENT**: build the real server; reach `server.instance?.server?._requestHandlers`; if unreachable, print
  `PF0 ✗ unreachable` and exit 2 (never pass vacuously — `discovery-transport.mjs:274-276`). Rows:
  PF1 `tools/list` advertises exactly `screen_compose` with `required` = `["screenId","why","composition"]`;
  PF2 a depth-3 composition carrying one unknown key arrives at the handler deep-equal to what was sent;
  PF3 the committed add-payee composition (`build/ops.jsonl` line 1 `params`) is filed and `state.doc.frames`
  holds one `f1`; PF4 a child named `hero-banner` is refused `isError` with a message starting
  `composition.children[0]:`; PF5 `why: ""` is refused with the D4 text; PF6 a call with no `composition` is
  refused `-32602` before the handler (handler call count unchanged); PF7 a Verdant enum violation
  (`plant-card.status: "thirsty"`) is refused naming `[ok | due | overdue]`.
- **PATTERN**: `discovery-transport.mjs:277-320`.
- **VALIDATE**: `node "$SCRATCH/s6.mjs" --repo "$PWD" --preflight > .claude/plans/canvas-spike-s6/raw/preflight.txt` → `preflight ✓ 7/7` (expected).
- **REDDENS**: swap `z.looseObject` for `z.object` → PF2 goes red (`extra` stripped). Swap the handler order so
  `applyOp` runs without `validateComposition` → PF4 and PF7 go red (the applier accepts any composition).
- **SATISFIES**: AC #1 ("whether it validated" is only meaningful if validation is proven to fire). **REGENERATES**: none.

### Task 7 — ADD the prompt constants and the turn runner

- **IMPLEMENT**: named constants, each included in a sha256 `promptFingerprint` recorded on every stats line:
  - `ROLE` — "You compose screens for a product flow on a build canvas, from the PRD below, using only the
    vocabulary below."
  - `LOOP` (run 1, the loop as #312 ships it) — "The canvas works one screen per turn: each turn you propose one
    screen by calling `screen_compose` once, with a `why` naming the PRD decision (by seq) it serves and the
    reason. The owner accepts, edits or refuses it before the next turn starts."
  - `ESCAPE` — "If a part the screen needs is not in the vocabulary, compose without it and name the missing
    part in `why`. If the screen cannot be composed at all, reply with a line starting `NOT COVERED:` naming the
    missing part, and call nothing."
  - `YIELD_CONTRACT` (only with `--contract`; positive framing, per memory recorder-run-positive-framing) —
    "When `screen_compose` replies `filed`, your turn is complete: reply with one sentence naming the screen you
    proposed. The next screen is the next turn's work."
  - `vocabContext(vocab)` then `prd.md` verbatim, each under a heading.
  Turn prompts (driver text, recorded as `{k:'driver', turn, text}` — **never** `source: owner`):
  turns 1–3 — "The canvas holds: <each accepted frame as `screenId — why`, or `nothing yet`>. Propose the next
  screen." Fork turn — same prefix, then "Next: the screen where the customer chooses the amount and sends the
  first payment." It must not mention alternatives, options or seq 11 (it would answer its own question).
  Runner per turn: `query({ prompt, options: { cwd: RUN_CWD, model: 'claude-sonnet-5', maxTurns: 10,
  systemPrompt, resume: sessionId || undefined, tools: [], allowedTools: [], mcpServers: { 'canvas-s6': server },
  strictMcpConfig: true, canUseTool, hooks } })`. The fence: `canUseTool` allows only `FULL`; `PreToolUse`
  denies everything else and appends `{k:'denied', turn, tool, site}`; `PostToolUseFailure` appends the
  schema-layer refusals the handler never sees. With `--stop-hook`: a `Stop` hook that returns
  `{ decision: 'block', reason: 'No screen was filed this turn. File one screen_compose, or reply NOT COVERED: <part>.' }`
  when the turn's lines hold no filed op and no escape, at most once per turn: return `{}` when
  `input.stop_hook_active` is true (`coreTypes.d.ts:223-225`; output `decision?: 'approve' | 'block'` at `:258`,
  observed at 0.1.77). Count every call as `stopHookCalls` on the stats line — a hook that never fires in SDK
  mode is a finding, not a pass.
  After each screen turn, auto-accept in memory: append `{k:'accept', turn, frameId, source:'driver-dry'}`.
  Stats line per turn: `sessionId, numTurns, durationMs, wallMs, costUsd, inputTokens, outputTokens,
  cacheReadTokens, cacheCreationTokens, subtype, isError, promptFingerprint, vocabSha, model, sdk, zod, node`.
  Budget across runs: at start, sum `costUsd` from every sibling `raw/run-*/verdict.json` (and any partial
  run's stats lines), add this run's turns as they land, and refuse the next turn once the total exceeds
  `--budget` — so 3.00 caps all paid runs together, not one process.
- **PATTERN**: `discovery-transport.mjs:192-263`; fence `spike-1-op-transport.mjs:141-156`.
- **GOTCHA**: **`maxTurns: 10`, deliberately loose.** `num_turns = 1 + tool calls` (`discovery-transport.mjs:57-62`),
  so 10 admits nine calls — room for four composes plus corrections. A tight cap, or a handler that refuses a
  second compose in one turn, would make run 1 clean by construction. No enforcement in run 1.
- **GOTCHA**: **resume needs one stable `cwd`.** `RUN_CWD = mkdtempSync(...)` once per run, reused by all four
  turns. The SDK keys session files by project dir; a fresh temp dir per turn silently starts a fresh session.
  The classifier's session-id equality is what catches it.
- **GOTCHA**: a result can be `subtype:'success'` with `is_error:true` (memory: sdk-error-result-wears-success,
  "Credit balance is too low"). Check both; a run with either is a failed run, not a verdict.
- **GOTCHA**: write every line as it happens (`appendFileSync`), never at the end — a mid-run throw must leave
  the transcript on disk.
- **GOTCHA**: a 400 "specified API usage limits" is the owner's own Console spend limit, not a tier cap
  (memory). Stop and tell the owner; do not retry.
- **VALIDATE**: `--selftest` and `--preflight` still green after the edit.
- **SATISFIES**: AC #1, AC #2. **REGENERATES**: none.

### Task 8 — ADD the outline writer (B5's instrument) and the per-run verdict

- **IMPLEMENT**: after the fork turn, write `outline.txt`: for each filed composition, `screenId — why` then an
  indented tree `name#id {prop: value, …}`, and the B5 proxies per screen: root is `stack direction:column`
  (y/n); first child a heading `text` or `screen-header` (y/n); exactly one `primary-button` and it is the last
  child (y/n); Verdant-locked parts used (list); nesting depth. Write `verdict.json`: per-turn outcome, the run
  verdict, the fork outcome, sums of cost/tokens/elapsed.
- **VALIDATE**: `--selftest` includes one outline over the add-payee fixture and asserts the root/heading/button
  proxies read `y/y/y` and Verdant-locked reads `none`.
- **REDDENS**: point the fixture's root at `card` → the root proxy reads `n` and the assertion fails.
- **SATISFIES**: B5 input (owner's read). **REGENERATES**: none.

### Task 9 — RUN run 1 (paid)

- **IMPLEMENT**: `O=.claude/plans/canvas-spike-s6/raw/run-1; mkdir -p "$O"; set -o pipefail; node "$SCRATCH/s6.mjs" --repo "$PWD" --run 1 --out "$O" | tee "$O/stdout.txt"`.
  The verdict is read from `$O/verdict.json`, never from the exit status.
- **DECIDE** from `verdict.json`, by this table and nothing else (no owner gate — every row is decided):

  | Run verdict | Next | Branch recorded |
  |---|---|---|
  | `clean` | stop | 1 — ship the spine |
  | `runs-ahead` (incl. `alternatives` on a screen turn) | next run adds `--contract` | 2 if that run is clean |
  | `runs-ahead` again with `--contract` | next run adds `--stop-hook` | 3 — reached, with its result |
  | `empty-yield` on any of turns 1–3, no runs-ahead | next run adds `--stop-hook` (the hook's own target) | "empty-yield", with the hook's result |
  | `failed` (`is_error`, session id changed, budget stop, SDK throw) | fix the driver, re-run the SAME flags | none — a failed run is not a verdict |

  A failed run still counts toward the three-run cap if it spent tokens. Run numbers are never reused.
- **GOTCHA**: the transcripts are never hand-edited (honesty contract). A bad run is a prompt constant change
  and a new run number.
- **VALIDATE**: `ls .claude/plans/canvas-spike-s6/raw/run-1/` → the seven files; `node -e` over `verdict.json`
  prints the verdict.
- **SATISFIES**: AC #1, AC #2. **REGENERATES**: none.

### Task 10 — RUN run 2 (`--contract`) and, only if needed, run 3 (`--contract --stop-hook`)

- **IMPLEMENT**: the same command with the flags Task 9's table names, run numbers 2 and 3. Branch 3 runs as
  the ticket states it: the ticket's decision rule is the owner's, and a run costs ~$1, so it is measured, not
  debated. The README says what the hook targets (a yield with nothing filed), whether it fired (the driver counts
  `Stop` hook calls per turn and records `stopHookCalls`), and whether it could have fixed what was seen. Three
  paid runs is the cap; a fourth is not in this ticket.
- **GOTCHA**: branch 3's hook, as the ticket words it, blocks a yield **with nothing filed**. It cannot stop an
  over-filing turn. If run 2 still runs ahead, run 3 will record whether the hook changes anything; the README
  must say what the hook targets and whether it could have fixed what was seen (Q1).
- **SATISFIES**: AC #1 (the branch taken). **REGENERATES**: none.

### Task 11 — CREATE `README.md`

- **IMPLEMENT**, sections in S2's order (`.claude/plans/canvas-spike-s2/README.md`):
  **Verdicts** (`| Q | Verdict | Evidence |`): Q1 one op, one yield per turn? · Q2 the branch taken · Q3
  transport (in-process tool `screen_compose` → op `screen.compose`, SDK/zod/node versions, `resume` observed by
  identical session ids) · Q4 B5 proxies (numbers only; the read is the owner's) · Q5 D5 fork outcome.
  **Per turn** (`| run | turn | screenId | op emitted | validated | corrections | outcome | elapsed ms | tokens in/out/cache-read/cache-write | cost |`),
  every cell copied from `verdict.json` / the stats lines, cited `raw/run-n/turn-k.jsonl:<line>`.
  **Setup** (model, prompt fingerprint per run, vocab sha, context size, maxTurns and why, budget).
  **Finding: the fork list** (NOTES N4). **Proving the checks** (`| control | mutation | what went red | positive control |`
  — Tasks 3, 5, 6, 8). **Not done** (the owner's B5 read if not given; #321 untouched). **Files**.
- **GOTCHA**: every number is copied from a raw file and cited; nothing typed from memory (S2 and spike 1's rule).
- **SATISFIES**: AC #1, AC #2. **REGENERATES**: none.

### Task 12 — VALIDATE the repo is untouched, commit, PR, post the verdict

- **VALIDATE**: `git status --porcelain` shows only `.claude/plans/canvas-spike-s6/**`, the plan, its `.html`
  brief and the report. `node tooling/build-checks.mjs` → `build ✓  all 42 groups pass` (observed on
  `origin/main` at plan time). `node tooling/drift-check.mjs` → `drift-check ✓ …`. `node tooling/token-lint.mjs`
  → `token-lint ✓`. Fresh worktree: `cd tooling/icons && npm ci` and `cd tooling/style-dictionary && npm ci`
  first, or both gates fail on missing `node_modules` (observed at plan time — not a regression).
- **IMPLEMENT**: one commit, `spike(canvas): S6 — the compose turn, <branch> (#308, architecture § Spikes S6)`,
  staged by explicit path. PR body carries `Closes #308`, the verdict table, the plan/report paths. Post the
  verdict: `gh issue comment 295 --body-file <tmp>` — the verdict table, the branch, the fork finding, and the
  README link on the PR branch.
- **SATISFIES**: AC #3. **REGENERATES**: none.

---

## TESTING STRATEGY

No suite (CLAUDE.md § Testing). The spike's own checks are `--selftest` (the classifier, the context generator,
the outline proxies — pure) and `--preflight` (the real tool server, zero tokens). The repo gates run only to
prove nothing outside the spike dir moved.

### Edge Cases

- The agent files a compose, is refused, corrects, files again → `clean`, `corrections: 1`.
- The agent files two composes for different screens → `runs-ahead`.
- The agent files two for the same screen on a non-fork turn → `alternatives`, counted as runs-ahead for the
  decision rule (it drafted more than one proposal).
- The agent replies `NOT COVERED:` → `escape`, a clean yield.
- The agent re-proposes an already accepted screen → `runs-ahead` (repeat).
- The session id changes between turns → the run is void for Q1, whatever the outcomes.
- A schema-layer `-32602` refusal (missing field) never reaches the handler; it is recorded from
  `PostToolUseFailure` and counts as a refused attempt.

### Proving the checks

| Check | Mutation that reddens it | Positive control |
|---|---|---|
| classifier runaway | `ids.size >= 3` | the two-screen synthetic set |
| resume equality | drop the session-id clause | the changed-session synthetic set |
| schema passthrough (PF2) | `z.object` for `z.looseObject` | depth-3 + extra key |
| vocabulary validation (PF4, PF7) | skip `validateComposition` | `hero-banner`, `status: "thirsty"` |
| context completeness | drop a component from a cloned vocab | count 26 |
| B5 root proxy | fixture root → `card` | add-payee fixture |

---

## VALIDATION COMMANDS

### Level 1: Syntax
`node --check "$SCRATCH/s6.mjs"` (the scratch copy; the tracked file is `.txt`).

### Level 2: Zero-token checks
`node "$SCRATCH/s6.mjs" --repo "$PWD" --selftest` → `selftest ✓ 15/15` (expected)
`node "$SCRATCH/s6.mjs" --repo "$PWD" --preflight` → `preflight ✓ 7/7` (expected)

### Level 3: Repo untouched
`node tooling/build-checks.mjs` → `build ✓  all 42 groups pass` (observed at plan time)
`node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · … · group-count` (observed)
`node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed)
`git status --porcelain -- system portal discovery handoff tooling` → empty

### Level 4: Manual
Read `outline.txt` against the PRD's four screens; confirm every filed `why` names a seq that exists in `prd.md`.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Run 1 (4 turns, sonnet-5) | ~$0.40–1.00 (derived below) | yes — no verdict without it | — |
| Run 2 `--contract` | same | only if run 1 runs ahead | — |
| Run 3 (flags per Task 9's table) | same | only if run 2 is not clean | — |
| B5 read: "do the screens read un-mobile-like?" → open or close #321 | owner's hand | no | #321 stays open, README says "owner's read pending" |

Cost derivation (expected): system prompt ≈ 38 425 B PRD + ~5.6 k chars context + ~1.5 k fixed ≈ 45 k chars ≈
11–12 k tokens. Turn 1 writes the cache; turns 2–4 read it. Precedents: spike 1 $0.092 for 4 turns with a tiny
prompt; discovery turns $0.063 warm / $0.184 cold (memory: discovery-run-cache-ttl-cost — the 5-minute TTL).
The driver runs turns back to back, so turns 2–4 should be warm: ~$0.10–0.25 per turn. `--budget 3.00` caps
all three runs together.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — `.claude/plans/canvas-spike-s6/README.md` records per turn: the op emitted, whether it validated,
      elapsed, tokens; the branch taken; the transport used.
- [ ] AC #2 — the three recorded screen-turn transcripts (plus the fork turn) are parked under
      `.claude/plans/canvas-spike-s6/raw/run-<n>/`, unedited driver output.
- [ ] AC #3 — the verdict is posted as a comment on epic #295.
- [ ] `--selftest` and `--preflight` green before the first paid run, and their outputs committed.
- [ ] Nothing outside `.claude/` changed; build-checks, drift-check and token-lint green.

## COMPLETION CHECKLIST

- [ ] Tasks 1–12 in order; `--selftest`/`--preflight` green before Task 9
- [ ] Every README number cited to a raw file line
- [ ] Report at `.claude/reports/canvas-spike-s6-compose-turn-308-report.md`
- [ ] PR body carries `Closes #308`

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 — branch 3 targets a different failure.** The ticket's third branch is "the `Stop` hook refusing a yield
  with nothing filed". That catches **under**-filing; the spike's question is **over**-filing. A hook cannot
  stop a turn that files two screens. The mechanism that can is a handler refusing a second compose in one turn
  (discovery's "refuse the next closer", `discovery-transport.mjs:67-70`). **Decided:** the rule runs as the
  ticket states it (Task 9's table); `empty-yield` is routed to the hook, which is exactly its target; the README
  names the mismatch so #312's planner can choose the per-turn refusal if over-filing survives the contract. No
  owner gate on any paid step.
- **Q2 — un-briefed turns.** Turns 1–3 carry no owner brief (D3's "a turn with no brief is allowed"), which is
  the case most likely to run ahead. A briefed turn names the screen and makes running ahead less likely, so an
  un-briefed clean result is the stronger claim. Assumed; say if #312's default is briefed.
- **Q3 — B5's instrument.** The plan gives the owner a text outline and objective proxies, not a rendered page
  (memory: no unrequested pages). If the owner wants to see the screens rendered at phone width, a ~60-line
  harness over `renderComposition` (`system/agentic-renderer.mjs:707`) + `createBus` (`system/action-bus.mjs:56`)
  is a small follow-up. Not built unless asked.
- **Q4 — input is the real run-1 PRD, not a stand-in brief.** The ticket says "the Faster Payment brief"; G23's
  stand-in was replaced when #291 ran, so `discovery/faster-payment/prd.md` is the input. Its provenance is
  "Real run — fictional scenario" and the README says so.
- **Q5 — `recordRun` is not reused.** The ticket names it as a seam, but it takes no `resume` or `mcpServers`
  (`trace-recorder.mjs:64`); extending it is a `portal/` change the spike should not make. The driver mirrors its
  hook set instead. #312 decides whether `recordRun` grows those options.
- **Assumed:** model `claude-sonnet-5` (the recorders' and Think's model); `emptyDoc()` start; the driver
  auto-accepts in memory between turns, recorded as `driver-dry`.

## NOTES (open canvas)

### Pre-flight (run at plan time, 2026-09-24)

1. **Validator, zero tokens, on `origin/main`** (scratchpad extraction):
   - positive — `add-payee composition validates` (the owner's committed `stack` → text, text-field, primary-button).
   - negative — `composition.children[0]: "hero-banner" is not an allowed child of stack (allowed: card | choice | …`.
   - enum — `composition.props.status: "thirsty" is not in enum [ok | due | overdue]`.
   - `why: ""` — `screen.compose: "why" must be one sentence naming the decision and the reason …` (D4 fires).
   - extra param — `screen.compose: unknown param "alternatives" — it takes screenId, why, composition, decisionRefs`.
2. **N1 — `applyOps` refused the committed `ops.jsonl` as-is:** `op 0 (screen.compose): unknown key "seq" on the
   op envelope — an op is exactly { op, params }`. Mapped to `{op, params}`, it folds to `f1:add-payee/ideal
   f2:undefined/error arrows 1`, and `missingStates` reads `add-payee missing empty, partial, loading`. Plan
   change: PF3 feeds `line.params`, never the line.
3. **N2 — the tool schema, zero tokens, against the installed SDK 0.1.77 + zod 4.4.3:** both
   `z.looseObject({ name })` and `z.record(z.string(), z.unknown())` advertise `required: ["screenId","why","composition"]`,
   deliver a depth-3 composition with an extra key **deep-equal** to the handler, and refuse a missing
   `composition` with `MCP error -32602: Input validation error` before the handler. `looseObject` also
   advertises `name` as required, so the plan pins it.
4. **N3 — gates on a clean `origin/main` worktree:** first run red on `tooling/icons/node_modules … missing`
   and then on the Style Dictionary build — both fresh-worktree installs, not regressions. After `npm ci` in both:
   `build ✓ all 42 groups pass` (CLAUDE.md still says 41 — not this ticket's to fix), `drift-check ✓`,
   `token-lint ✓ 63 contract tokens`.
5. **N4 — the fork list for this package is empty by #320's definition.** #320 counts a fork as a decision the
   projection lists as open (`open_question` not closed). Faster Payment's `prd.md` records `open_question 0` and
   "the run parked no question", while seq 11 flags the first-payment limit as unsettled in prose. So #320,
   built as written, would find no fork on run 1's package. The fork probe here uses seq 11 anyway (the ticket
   says "a decision the brief flags open"), and the README records the gap for #320. No decision taken here.
6. **Landed-claim checks:** `canvas-session.mjs` does not exist on main (grep, `portal/lib/`) — correct, #312's.
   `.claude/plans/canvas-spike-s6/` does not exist on main. `Stop` is in `HOOK_EVENTS` at 0.1.77 (observed).
   `vocabulary.json` holds 26 components including `stack`, `text`, `list`, `icon`, `choice` (observed).
7. **N5 — the session id is stable across a resume (observed).** `~/.claude/projects/…-discovery-faster-payment/`
   holds one main session file, `0f808208-….jsonl`: 159 lines, all with that one `sessionId`, 55 user messages,
   and `run.json` records the same id — 24 resumed turns, one id. So equality across turns is a valid resume check.
8. **Traps carried in:** shared worktree (Task 1); `.txt` parking (Task 2); check-that-cannot-fail (Task 5);
   `is_error` on success (Task 7); spend-limit 400 (Task 7); positive framing (Task 7); cache-TTL cost (cost
   table); owner's verdicts are the owner's (B5, Q3); fresh-worktree installs (Task 12).

### Risk register (each with its mitigation in a task)

| # | Risk | Mitigation | Where |
|---|---|---|---|
| R1 | The grader reads every run clean because it never met a runaway | 15 named synthetic cases incl. both runaway shapes; two mutations shown red | Task 5 |
| R2 | Turns silently start fresh sessions, so "one screen per turn" is really "one screen per conversation" | one `RUN_CWD` per run; identical `sessionId`s required; stable id on resume observed on #291's 24 turns (N5) | Tasks 5, 7 |
| R3 | A cap or a handler refusal makes run 1 clean by construction | `maxTurns: 10` (nine calls), no per-turn limit in any run | Task 7 |
| R4 | The schema strips keys, so the recorded op is not what the model sent | `z.looseObject`; PF2 deep-equal; observed at plan time (N2) | Tasks 4, 6 |
| R5 | "Validated" means nothing because the applier never checks the vocabulary | `validateComposition` before `applyOp`; PF4/PF7 prove it fires | Tasks 4, 6 |
| R6 | Auth or spend-limit failure mid-run reads as a result | `is_error` and `subtype` both checked → `failed`, never a verdict; stop on a 400 spend-limit and tell the owner | Tasks 7, 9 |
| R7 | Money runs away across attempts | cross-run budget sum, $3.00; three-run cap; failed runs count | Task 7, 10 |
| R8 | The `Stop` hook never fires in SDK mode, so branch 3 "passes" untested | `stopHookCalls` recorded per turn; zero calls is reported as "hook not observed" | Task 7, 10 |
| R9 | The driver breaks when copied out of the tree | `--repo` required and checked; SDK from `<repo>/portal/node_modules`, installed in Task 1 | Tasks 1, 2 |
| R10 | The agent sees the owner's add-payee screen and copies it | the prompt holds only the generated context + `prd.md`; `tools: []` so nothing can be read; `emptyDoc()` start | Tasks 4, 7 |
| R11 | Shared-checkout collision with a sibling session | dedicated worktree; branch checked before commit; explicit-path staging | Tasks 1, 12 |
| R12 | Any paid step waits on the owner | none does: Task 9's table decides every branch; B5 is the only owner read and it does not block the PR | Tasks 9, 10 |

What stays outside the plan's control, by design: the model's behaviour is the thing being measured, so a
"runs ahead" verdict is a result, not a failure of the plan.

### Confidence

**10/10 for one-pass implementation.** Every SDK surface the driver touches was observed at the installed
version (tool schema N2, session stability N5, `Stop` hook and option types above); the only novel logic is
given verbatim with its proofs; every branch after a paid run is decided by a table, so the implementer never
stops to ask.

### Why the classifier, not a reading

A spike like this reads green the easy way: run it, look at turn 1, see one screen, write "clean". The
runaway shapes are specific (a second `screenId`, a repeat, two for one screen, a new session), and each is a
line pattern. Writing them as a pure function and proving each on a synthetic set means the verdict is computed
from the transcript, and a reviewer can re-derive it.

### What would change the plan

- Run 1 clean on all three turns → #312 ships the spine; runs 2 and 3 never happen.
- The fork turn files two lanes → D5's mechanism is natural and #320 can keep "two drafts, one turn".
  Picks one → #320's fallback ("one proposal plus an alternative-not-drafted line") is the realistic default.

## AMENDMENTS

- 2026-09-24 — risk pass before implementation: owner gates on paid steps replaced by Task 9's decision table; `classifyTurn` given verbatim; `Stop` hook shape and `stopHookCalls` pinned from the 0.1.77 types; cross-run budget; dedicated worktree + `portal` install; risk register R1–R12 and confidence 10/10 added to NOTES.
- 2026-09-24 — implementation pre-flight (every cited `file:line` resolved on `4d9adf6`; SDK 0.1.77, zod 4.4.3 observed). Two **plan errors** fixed before any paid run:
  (1) `classifyTurn` counted a runaway over FILED screenIds only, so a turn that files one screen and then tries a second that the handler refuses read `clean` — the attempt is the evidence. Added `attempted` (distinct screenIds over all op lines, refused included; schema-layer refusals written from `PostToolUseFailure` with `tool_input`'s screenId) and outcome `runs-ahead-attempted`, counted as runs-ahead by `classifyRun`; self-test case + mutation added.
  (2) `/^NOT COVERED:/m` missed `**NOT COVERED:**` / `- NOT COVERED:`, which would misroute an escape to `empty-yield` and the next run to the `Stop` hook. Now `/^[^\w\n]*NOT COVERED:/m`; self-test case `escape-bold` + mutation added. Self-test count 15 → 17.
  Also: `verdict.json` is written in `finally` (a throw still leaves a `failed` verdict); a 300 s per-turn abort; the vocabulary context carries `vocabulary.json`'s own generated `composition.shape` + `childrenRule` lines so the node shape is stated from the file, not from driver text.
