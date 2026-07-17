# Feature: Trace recorder + trace player — PIV-act replay of real agent runs (folds spike 5)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

"Agents visible, honestly." A build-time **trace recorder** wraps a Claude Agent SDK session (the portal's existing dependency — architecture §Where it plugs in: "its Agent SDK dependency becomes the trace recorder") in SDK **hook callbacks** and emits the **Trace** artifact: JSONL of real agent-run steps, each step paired with the artifact it produced and tagged with its PIV phase (`plan | gate | implement | validate`). A view-time **trace player** — a vanilla ES module beside `site.js` — renders a committed trace as **stepped annotated cards grouped into the four PIV acts**, not a log. One real run is recorded, deterministically curated for length, committed, and labeled "real run, curated for length" (honesty surface #2).

This ticket also **folds spike 5** (trace recording quality): record one real generation run, assess signal-to-noise and curation effort. Decision rule: curated trace reads as engineering → ship the pattern; else re-run with tighter agent prompts. **NEVER hand-write a trace** (honesty contract, hard).

## User Story

As a hiring manager reading the Factory page
I want to replay the actual agent run that produced an artifact in this repo, structured as plan → gate → implement → validate
So that "AI agents built this under governance" is something I can verify step by step — visible review gates, visible checks passing — instead of a claim.

## Problem Statement

The platform's core argument is verification over persuasion, and its AI story runs entirely at build time (no live LLM calls at view time — hard constraint). Today nothing captures what the build-time agents actually do: no recorder exists, no trace format is defined, and no shipped surface can replay a run. Downstream, #10's Factory page needs traces as the "agents visible" station, and the honesty contract needs its second named surface ("real run, curated") to exist as a real, labeled artifact.

## Solution Statement

- **Format:** `traces/README.md` pins the Trace JSONL line schema (meta line → step lines → result line) including the honesty labeling rules and the never-hand-write rule.
- **Recorder:** `portal/lib/trace-recorder.mjs` wraps `query()` with `PostToolUse` + `PostToolUseFailure` hook callbacks (tool steps: name + input + response + artifact path, failures included honestly) and the message loop (assistant text = the annotation layer; init/result = meta). PIV-phase tags come from the **agent's own phase markers** (`[[piv:plan]]` … emitted per the run's system prompt) — tags are derived from the real run, never assigned by hand.
- **Runner:** `portal/record-trace.mjs` — CLI entry defining the recorded task (a real one: author the `demo-notice` ComponentSpec that #8's prototypes need for honesty surface #1), the PIV-phase system prompt, and a `canUseTool` fence (writes inside the repo only, no secrets, Bash limited to `node …`). Writes `traces/demo-notice.raw.jsonl`.
- **Curation:** `tooling/curate-trace.mjs` — zero-dep, **deterministic**: truncates long inputs/responses, strips phase-marker lines, applies only explicitly listed drop rules, and records exactly what it did in the curated meta. Selection and truncation only — step text is never rewritten.
- **Player:** `system/trace-player.mjs` — `parseTrace()` + `renderTracePlayer()`: four act sections, stepped card reveal (next/prev + keyboard), honesty label rendered from meta. Driven raw by a bare `trace.html` at repo root (the `derive.html` pattern); the designed surface is #10's Factory page.
- **Validator:** `tooling/validate-trace.mjs` — the format's drift guard (parses every line, enforces phase order, artifact pairing, honesty label). Candidate CI gate for #9.

## Out of Scope / Non-Goals

- **Not the Factory page or its "agents visible" station** — that's #10. This ticket ships the player + a bare test page only; #10 embeds and styles it.
- **Not recording multiple runs or a trace library/registry** — AC is ≥1 committed run. An index (for #10 to list traces) is deferred until #10 needs it; `trace.html` takes a `?trace=` param with a default.
- **Not a portal UI/API feature** — no portal route, no SSE, no browser recording UI. The recorder is a CLI run by the author (`node portal/record-trace.mjs`).
- **Not changing** `portal/lib/chat.mjs`, `system/components.css`, tokens, the Worker, scenarios, or `agent-layer/` generators. (The recorded run itself writes one new spec file in `system/specs/` and regenerates `handoff/verdant/` — that is the run's real work product, not a code change of this ticket.)
- **No live agent calls at view time** — the player replays committed JSONL; `trace.html` fetches a static file.
- **No screenshots/video/asciinema** — the trace is structured data; the player is the presentation.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (code is modest and patterns exist in-repo; the risk is recorded-run quality, which spike 5's decision rule governs)
**Primary Systems Affected**: `portal/` (recorder lib + CLI), new `traces/` (committed artifact), `tooling/` (curate + validate scripts), `system/` (one new ES module), repo root (`trace.html`), `_headers`, `CLAUDE.md`
**Dependencies**: `@anthropic-ai/claude-agent-sdk` **^0.1.77 — already installed** in `portal/` (the whole point: the existing dependency becomes the recorder). Zero new deps anywhere. Recording requires auth: `CLAUDE_CODE_OAUTH_TOKEN` in `portal/.env` or the CLI login on this Mac (`portal/lib/env.mjs` / chat.mjs precedent).

## Related Work

**Implements**: [linardsb/ux-factory#5](https://github.com/linardsb/ux-factory/issues/5) — PR closes with `Closes #5`
**Epic**: [#1](https://github.com/linardsb/ux-factory/issues/1) + `docs/epics/ai-first-ux-factory.architecture.md` (§Data model — Trace, line 40 · §Where it plugs in, line 21 · §Stack — Claude Agent SDK, line 30 · spike 5, lines 83–84 · honesty boundary, line 47). These are **inherited decisions, not re-decided here.**

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/scenario-packages-worker-mock-api.md` — Why: the bare-check-page pattern (`scenarios/check.html`), the format-README-first discipline, honesty surfaces #1/#3 conventions, and the `copy.json` `fictionalNotice` field the recorded run's component exists to render.
- `.claude/plans/live-derivation-engine.md` — Why: `derive.html` is the exact "bare test page drives a system module raw" precedent `trace.html` mirrors; also the "designed surface is #10" framing.
- `.claude/plans/handoff-data-layer.md` — Why: ComponentSpec format + `parseComponentSpec` + `gen-handoff.mjs` are the validation gates the recorded run runs into (its validate phase regenerates the pack).

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- (none yet — #10 Factory page will embed the player and should back-reference this file; #9 CI gates may adopt `tooling/validate-trace.mjs`)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `docs/epics/ai-first-ux-factory.architecture.md` (lines 19–21, 30, 40, 47, 60, 83–84) — Why: the inherited decisions: recorder = Agent SDK hooks in the portal; Trace = JSONL steps + artifact pairing + PIV tags; player = stepped annotated cards grouped into acts; honesty label wording; deploy = commit the artifacts; spike 5's decision rule.
- `portal/lib/chat.mjs` (lines 38–56: `query()` options + `canUseTool` fence · lines 60–77: message loop over `msg.type === 'assistant'` content blocks and `'result'`) — Why: **the house Agent SDK usage this recorder MIRRORS** — options shape, session-id capture from `system/init`, the tool-hint extraction (`block.input?.query || … || block.input?.file_path`), and the write-fence style.
- `portal/lib/env.mjs` (whole file, 27 lines) — Why: `REPO_DIR`/`PORTAL_DIR` path resolution and the `.env`/token loading the runner imports; `HAS_TOKEN` for the pre-flight auth check.
- `portal/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts` (lines 174–249: `HOOK_EVENTS`, `BaseHookInput`, `PreToolUseHookInput`, `PostToolUseHookInput`, `PostToolUseFailureHookInput` · lines 441–474: `SDKResultMessage`) — Why: **ground truth for the installed version** (0.1.77). Verified during planning: `PostToolUseHookInput = { session_id, transcript_path, cwd, permission_mode?, hook_event_name:'PostToolUse', tool_name, tool_input, tool_response, tool_use_id }`; `PostToolUseFailureHookInput` adds `error: string`. Success result carries `num_turns`, `duration_ms`, `total_cost_usd`, `usage`, `session_id`.
- `portal/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts` (lines 49–60: `HookCallback`, `HookCallbackMatcher` · lines 340–352: `Options.hooks`) — Why: exact callback signature `(input, toolUseID, { signal }) => Promise<HookJSONOutput>`; config shape `hooks: { PostToolUse: [{ hooks: [cb] }] }` (no `matcher` = all tools); return `{ continue: true }`.
- `agent-layer/lib.mjs` (lines 63–115: `parseComponentSpec`) — Why: the validation gate the recorded run's artifact must pass — head field checks (`component` = filename stem, `status`, `class`, `props`, `tokens` `--`-prefixed, `states`, `children`, `contract` null or sibling path) and the four required prose sections.
- `agent-layer/gen-handoff.mjs` (lines 1–7 header · lines 19–35 · tail: `pathToFileURL` standalone guard) — Why: the recorded run's validate-phase command; also the house header + guard pattern for the new CLI/scripts.
- `system/scenario-data.mjs` (lines 1–13) — Why: the "hand-written canon" header register for `system/trace-player.mjs`, including how a load-bearing honesty field is documented in a header comment.
- `derive.html` (lines 1–30 and the `<script type="module">` at 160–216) — Why: the bare-harness page `trace.html` mirrors — CSS trio + `portfolio.css`, `noindex`, harness-chrome `<style>` scoped to tokens, module script driving a `system/` module raw.
- `scenarios/verdant/copy.json` + `scenarios/fieldwork/copy.json` (`fictionalNotice` field) — Why: the data the recorded run's `demo-notice` component is specified against (honesty surface #1 as a component).
- `system/specs/primary-button.md` (whole file) — Why: the closest presentational sibling (`contract: null`) the recorded agent is pointed at as its pattern; read it to sanity-check the task prompt names real fields.
- `.claude/references/kb-format.md` (whole file, 29 lines) — Why: the ComponentSpec head schema v1 the recorded run must satisfy; the run's prompt names this file for the agent's plan phase.
- `_headers` (tail) — Why: cache-rule format for the `/traces/*` addition.
- `CLAUDE.md` (§Architecture map, §Where new code goes, §Ground rules) — Why: placement rules (view-time behaviour = ES module beside `site.js`; secrets only in `portal/.env`; deploy = commit artifacts; honesty contract hard; errors = plain `Error` naming the path).

### New Files to Create

- `traces/README.md` — Trace format spec (line schema, phase markers, honesty rules, record→curate→validate workflow); written FIRST, everything conforms to it
- `portal/lib/trace-recorder.mjs` — recorder library: `recordRun(config)` wraps `query()` with hooks + message loop, appends JSONL
- `portal/record-trace.mjs` — CLI runner: PIV system prompt, the real task, tool fence; emits `traces/<slug>.raw.jsonl`
- `traces/demo-notice.raw.jsonl` — GENERATED by the real run (committed: the inspectable, uncurated source)
- `tooling/curate-trace.mjs` — deterministic curation: raw → `traces/<slug>.jsonl`; records its own rules in the output meta
- `traces/demo-notice.jsonl` — GENERATED curated trace, labeled "Real run, curated for length"
- `tooling/validate-trace.mjs` — zero-dep trace validator (`✓` line per trace or exit 1 naming file + line + field)
- `system/trace-player.mjs` — the player module: `parseTrace(jsonlText)` + `renderTracePlayer(container, trace)`
- `trace.html` — bare harness page at repo root driving the player against the committed trace

The recorded run itself produces (agent-written, committed as its work product): `system/specs/demo-notice.md` (+ regenerated `handoff/verdant/pack.json`).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- **The installed SDK's own `.d.ts` files (paths above) are the authority** — they were read during planning and the hook/message shapes in this plan are copied from them verbatim. The current npm release is **0.3.x** with more hook events and a different runtime pairing; the portal pins `^0.1.77`. **Do not bump the SDK in this ticket** — web docs describing 0.3.x will not match the installed types; trust the local `.d.ts` on any conflict.
- [Agent SDK hooks guide](https://code.claude.com/docs/en/agent-sdk/hooks) — Why: hook semantics (when each event fires, matcher rules — tool-name exact/regex/wildcard, never file paths — and the warning that a thrown hook callback interrupts the agent).
- [Agent SDK TypeScript reference](https://code.claude.com/docs/en/agent-sdk/typescript) — Why: `query()` options context (`cwd`, `model`, `maxTurns`, `systemPrompt`, `allowedTools`, `canUseTool`) around the hooks option.
- No other external docs needed — player, curation, and validation are vanilla JS against in-repo patterns.

### Patterns to Follow

**Recorder hooks config** (shape from `runtimeTypes.d.ts:340-352`, callback from `:49-60`):

```js
const q = query({
  prompt: task,
  options: {
    cwd: REPO_DIR, model, maxTurns, systemPrompt, allowedTools, canUseTool,
    hooks: {
      PostToolUse:        [{ hooks: [async (input) => { record(toolStep(input, true));  return { continue: true }; }] }],
      PostToolUseFailure: [{ hooks: [async (input) => { record(toolStep(input, false)); return { continue: true }; }] }],
    },
  },
});
```

**Message loop** (MIRROR `portal/lib/chat.mjs:60-77`): `system/init` → capture `session_id` into the meta line; `assistant` → content blocks, `text` blocks become `kind:"text"` steps (scan for `[[piv:…]]` markers first); `result` → the trailing result line (`num_turns`, `duration_ms`, `total_cost_usd`, `is_error`).

**Write fence** (MIRROR `chat.mjs:47-54`): resolve against `REPO_DIR`, prefix-check with `path.sep`, deny with a message naming the boundary; deny any path matching `/\.env|\.sessions\.json/`; Bash allowed only when `/^node /.test(input.command)`.

**File headers** (feature/entry files cite the governing doc):

```js
// portal/record-trace.mjs — build-time trace recording run (epic #1, ticket #5).
// Architecture §Where it plugs in: the portal's Agent SDK dependency becomes the
// trace recorder. Emits traces/<slug>.raw.jsonl — a REAL agent run; the honesty
// contract forbids hand-writing or hand-editing trace content (curation =
// tooling/curate-trace.mjs: selection + truncation only, rules recorded in meta).
```

**Standalone-run guard + errors + ✓ log lines** (from `agent-layer/gen-handoff.mjs` tail / `scenarios/validate.mjs`): `pathToFileURL` comparison (repo path contains a space); `throw new Error(\`${path}: what's wrong\`)`; aligned `trace demo-notice   ✓  47 steps · 4 phases · 1 artifact` output.

**Canon module header** (for `system/trace-player.mjs`, register per `system/scenario-data.mjs:1-13`): name the honesty-load-bearing behavior — the player must render `meta.label` verbatim and visibly.

---

## IMPLEMENTATION PLAN

### Phase 1: Trace format contract

`traces/README.md` first — the line schema everything else conforms to (recorder writes it, curator transforms it, validator enforces it, player renders it).

### Phase 2: Recorder

**Depends on:** Phase 1

`portal/lib/trace-recorder.mjs` (library), then `portal/record-trace.mjs` (runner with the verbatim PIV prompt + task + fence). Gate: the `--dry` smoke run is green (hooks fire, markers parsed, artifact paired) before any real-run spend.

### Phase 3: The real run + curation + validation

**Depends on:** Phase 2 (and auth: token in `portal/.env` or CLI login)

Record the real run → `traces/demo-notice.raw.jsonl`. Write `tooling/curate-trace.mjs`, produce the curated trace. Write `tooling/validate-trace.mjs`, both traces pass. **Spike 5 assessment happens here** (decision rule below) — a re-run with a tighter prompt loops within this phase.

### Phase 4: Player + harness page

**Depends on:** Phase 1 (format) and Phase 3 (a real committed trace to render — never a hand-written fixture).

`system/trace-player.mjs`, then `trace.html`.

### Phase 5: Integration touches + full validation

`_headers`, `CLAUDE.md`, every validation command, honesty pass.

---

## STEP-BY-STEP TASKS

### CREATE `traces/README.md`

- **IMPLEMENT**: The Trace format spec. Document:
  - **Line schema** (JSONL, one JSON object per line):
    - Line 1 `meta`: `{ "type": "meta", "version": 1, "slug", "task", "label", "model", "sessionId", "startedAt", "cwd" }`. Curated traces add `"curation": { "from", "rules": [names], "droppedSteps", "inputTruncatedAt", "responseTruncatedAt" }` and merge the run stats (`numTurns`, `durationMs`, `totalCostUsd`) up from the result line. `label` is the honesty surface: raw = `"Real run — raw, uncurated"`, curated = `"Real run, curated for length"` (architecture line 47 wording).
    - Step lines: `{ "type": "step", "seq", "ts", "phase": "plan|gate|implement|validate", "kind": "text", "text" }` or `{ …, "kind": "tool", "tool", "input", "ok": true|false, "error"?, "response", "responseTruncated", "toolUseId", "artifact"?: { "path" } }`. `artifact.path` (repo-relative) is REQUIRED on successful `Write`/`Edit` steps — the step↔artifact pairing the epic's Trace definition demands.
    - Last line `result`: `{ "type": "result", "ok", "numTurns", "durationMs", "totalCostUsd", "endedAt" }`.
  - **Phase tagging**: phases come from the agent's own `[[piv:<phase>]]` marker lines (the run's system prompt mandates them: marker alone on its own line, first line of a text block, each exactly once, in PIV order); the recorder scans text blocks with `/^\s*\[\[piv:(plan|gate|implement|validate)\]\]/` and tags every subsequent step with the current phase; curation strips the marker lines from displayed text. Steps before the first marker carry `"phase": null` → the validator fails the trace → tighten the prompt and re-run (spike 5's rule), never patch by hand.
  - **Dry runs**: `node portal/record-trace.mjs --dry` smoke-tests the recorder against a scratch directory; dry output NEVER lands in `traces/` — this directory holds only real, shippable runs.
  - **The honesty rules (hard)**: a trace file is only ever produced by `portal/record-trace.mjs` from a real run; curation is `tooling/curate-trace.mjs` only — selection + truncation, never rewriting; every curated meta records exactly what curation did; raw + curated are BOTH committed so readers can diff them.
  - **Workflow**: record (`node portal/record-trace.mjs`) → curate (`node tooling/curate-trace.mjs traces/<slug>.raw.jsonl traces/<slug>.jsonl`) → validate (`node tooling/validate-trace.mjs traces/<slug>.jsonl`) → view (`trace.html?trace=<slug>`).
- **PATTERN**: `scenarios/README.md` — short, declarative format doc written before the content it governs.
- **VALIDATE**: `test -s traces/README.md && head -5 traces/README.md`
- **SATISFIES**: AC #1 (trace format defined), AC #2 (labeling rules pinned)

### CREATE `portal/lib/trace-recorder.mjs`

- **IMPLEMENT**: `export async function recordRun({ slug, task, taskSummary, systemPrompt, model, maxTurns, allowedTools, canUseTool, outFile })`:
  - Open the JSONL (`mkdirSync` the dir, start fresh file). Maintain `seq`, `currentPhase = null`, a `write(obj)` helper using `appendFileSync` (crash-leaves-partial-file, never corrupts prior lines).
  - Build `query({ prompt: task, options: { cwd: REPO_DIR, model, maxTurns, systemPrompt, allowedTools, canUseTool, hooks } })` with the two hook matchers from **Patterns to Follow**. Tool step from hook input: `{ tool: input.tool_name, input: input.tool_input, ok, error?: input.error, response: trim(input.tool_response, 4000), responseTruncated, toolUseId: input.tool_use_id }`; when `tool_name` is `Write`/`Edit` and `ok`, set `artifact.path` = `tool_input.file_path` made repo-relative (`path.relative(REPO_DIR, resolve(...))`).
  - Iterate the query (MIRROR `chat.mjs:60-77`): `system/init` → write the meta line (`sessionId: msg.session_id`, `startedAt`, `model`, `slug`, `task: taskSummary`, raw label); `assistant` text blocks → detect `^\s*\[\[piv:(plan|gate|implement|validate)\]\]` (update `currentPhase`, keep the marker in the raw text), write `kind:"text"` steps; `result` → write the result line from `num_turns`/`duration_ms`/`total_cost_usd`/`is_error`.
  - Return `{ outFile, steps: seq, phases: seenPhases }` for the runner's ✓ line. Throw plain `Error`s naming `outFile` on failure.
- **PATTERN**: header per **Patterns to Follow**; SDK import exactly as `chat.mjs:3` (`import { query } from '@anthropic-ai/claude-agent-sdk'`).
- **IMPORTS**: `@anthropic-ai/claude-agent-sdk`, `node:fs`, `node:path`, `./env.mjs` (`REPO_DIR`).
- **GOTCHA #1**: this file MUST live under `portal/` — the SDK resolves from `portal/node_modules`; an `agent-layer/` placement cannot import it. (Also the architecture's exact wording: the portal's dependency becomes the recorder.)
- **GOTCHA #2**: hook callbacks must return a `HookJSONOutput` — return `{ continue: true }` always; a recorder must never block or mutate the run it observes. **Wrap the entire hook body in try/catch** (log to stderr, still return `{ continue: true }`): a thrown hook callback can interrupt the agent run — a recording bug must never alter the run being recorded.
- **GOTCHA #3**: text blocks and hook firings interleave in real chronology because both append through one shared `seq` — do not buffer steps and sort later.
- **GOTCHA #4**: record `PostToolUseFailure` steps with `ok: false` and keep them through curation — a failed check that gets fixed IS the governance story; hiding it would break the honesty contract.
- **VALIDATE**: `node --check portal/lib/trace-recorder.mjs && node -e "import('./portal/lib/trace-recorder.mjs').then(m => console.log(typeof m.recordRun))"` → `function`
- **SATISFIES**: AC #1 (recorder hooks into an Agent SDK session)

### CREATE `portal/record-trace.mjs`

- **IMPLEMENT**: the runner (header per **Patterns to Follow**). Two modes: `node portal/record-trace.mjs --dry` (smoke test, cheap) and `node portal/record-trace.mjs` (the real run). Defines:
  - **PIV system prompt — use this text verbatim** (a `const PIV_SYSTEM`; tuning it later is spike 5's lever #2, recorded in AMENDMENTS):

    ```
    You are the ux-factory build agent. You work in four strictly ordered PIV phases:
    plan, gate, implement, validate. You MUST announce each phase by emitting its
    marker ALONE on its own line, as the FIRST line of a text block, before any work
    of that phase: [[piv:plan]] then [[piv:gate]] then [[piv:implement]] then
    [[piv:validate]]. Emit each marker exactly once, in that order, and never place
    a marker anywhere except the first line of a text block.

    plan: read every file the task names, then state exactly what you will build
    (for a ComponentSpec: every head field and the four prose sections).
    gate: before writing anything, adversarially review your own plan against the
    spec format, the token rules, and the honesty contract in the files you read.
    State plainly what passes and what you corrected.
    implement: write the file(s).
    validate: run the command(s) the task names and report the real result. If a
    check fails, fix and re-run inside this phase.

    Narrate your decisions in short plain paragraphs — say WHY, not just what.
    Your text and tool calls are being recorded and will be published verbatim as
    an engineering trace. Do not mention the recording; just work well.
    ```

  - **The task — use this text verbatim** (a `const TASK`; the run's real work product):

    ```
    Author system/specs/demo-notice.md — the ComponentSpec for demo-notice, the
    fictional-scenario notice component (the visible label that a demo scenario is
    fictional; honesty surface #1). It renders a scenario's fictionalNotice string.

    Read first, in this order:
    1. .claude/references/kb-format.md            (the spec head schema + prose sections)
    2. system/specs/primary-button.md             (closest sibling: presentational, contract: null)
    3. scenarios/verdant/copy.json                (the fictionalNotice data it renders)
    4. system/tokens.source.json                  (the contract group — the only token names you may use)

    Constraints: status "spec" (no CSS exists yet — ticket #8 ships it and flips the
    status); contract: null (presentational — the composing page passes the notice
    text as a prop); class "vd-demo-notice" (the spec joins the Verdant pack that
    agent-layer/gen-handoff.mjs emits; Fieldwork's variant lands with ticket #8);
    props must include the notice text; keep it as small as an honest component can be.

    Validate with: node agent-layer/gen-handoff.mjs
    (it parses every spec including yours and regenerates handoff/verdant/ — a real
    gate that throws on any head violation).
    ```

  - **Fence**: `allowedTools: ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash']`; `canUseTool` per **Patterns to Follow** (writes inside repo only — in `--dry` mode inside the dry dir only — secrets denied, Bash = `node …` only). `model: 'claude-sonnet-5'` (chat.mjs precedent), `maxTurns: 50` (`--dry`: 12).
  - **`--dry` mode** (run it BEFORE spending on the real run): same recorder, same PIV system prompt, tiny task — create a scratch dir via `mkdtempSync(join(tmpdir(), 'trace-dry-'))`, task = "Work through all four PIV phases to produce <dryDir>/smoke.md containing a two-sentence summary of the ComponentSpec head schema in .claude/references/kb-format.md. plan: read that file. gate: review your summary plan. implement: write smoke.md. validate: run node --check on nothing — instead re-read smoke.md and confirm it says what you intended." Output JSONL → `<dryDir>/smoke.raw.jsonl`, **never `traces/`**. This exercises the risky mechanics for pennies: hooks firing, marker compliance by the model, phase tagging, Write→artifact pairing, JSONL well-formedness.
  - **Preflights (real mode)**: refuse to run if `traces/demo-notice.raw.jsonl` exists unless `--force` (protects the committed artifact from an accidental clobber); verify `tooling/style-dictionary/node_modules` exists (gen-handoff shells out to it) — verified INSTALLED at planning time, keep the check as insurance; print the auth mode line (chat.mjs register: token from .env, or "no token — falling back to the CLI login on this Mac" — **planning-time fact: `HAS_TOKEN` is `false` on this machine, the CLI-login fallback is the expected path and is exactly how portal chat already authenticates here**).
  - **End-of-run summary**: after `recordRun` returns, print the aligned ✓ line (steps · phases seen in order · null-phase step count · artifacts · ~cost). A non-zero null-phase count or missing/misordered phase = bad run, visible immediately, before curation.
  - `pathToFileURL` standalone guard.
- **IMPORTS**: `./lib/trace-recorder.mjs`, `./lib/env.mjs` (side-effect: loads `portal/.env`; `REPO_DIR`, `HAS_TOKEN`), `node:fs`, `node:os`, `node:path`, `node:url`.
- **GOTCHA #1**: run it FROM anywhere — resolve all paths from `import.meta.url`/`env.mjs`, never cwd.
- **GOTCHA #2**: SDK default loads NO filesystem settings (`settingSources` default is empty) — the recorded agent does NOT see CLAUDE.md automatically. That is desirable: every convention it needs is a file the prompt tells it to READ, so the reads show up as visible plan-phase steps in the trace. Do not add `settingSources`.
- **GOTCHA #3**: the prompts above are `const`s in this file, not external files — the runner IS the record of what produced each trace (inspectable proof); if you tune them, the diff shows it.
- **VALIDATE**: `node --check portal/record-trace.mjs`, then `node portal/record-trace.mjs --dry` → ✓ line shows 4 phases in order, 0 null-phase steps, 1 artifact (smoke.md), and the dry JSONL parses line by line
- **SATISFIES**: AC #1

### RUN the recording — GENERATE `traces/demo-notice.raw.jsonl`

- **IMPLEMENT**: the dry run from the previous task's VALIDATE must be green first (marker compliance proven for pennies). Then `node portal/record-trace.mjs`. Watch it complete (~2–5 min, ~30–50 steps) and read the end-of-run summary: 4 phases in order, 0 null-phase steps. Then inspect: `head -3 traces/demo-notice.raw.jsonl`, confirm meta line, `[[piv:plan]]` in the first text step, tool steps carrying `input` + `response`, the `Write` step carrying `artifact.path: "system/specs/demo-notice.md"`, result line `ok: true`. Confirm the run's work product exists and parses: `node agent-layer/gen-handoff.mjs` → `✓` (idempotent re-run).
- **GOTCHA #1**: if the agent skipped markers or phases are out of order, do NOT edit the JSONL — tighten `PIV_SYSTEM` (lever #2), re-run with `--force`, and note the tuning in AMENDMENTS. That loop IS spike 5.
- **GOTCHA #2**: costs real tokens (sonnet-5, bounded by `maxTurns: 50`) — the dry run exists so prompt bugs are found at `maxTurns: 12` prices, not here.
- **VALIDATE**: `wc -l traces/demo-notice.raw.jsonl` (≥ ~20 lines) + the inspections above
- **SATISFIES**: AC #2 (≥1 real recorded run), AC #1 (valid JSONL with PIV tags + artifact pairing)

### CREATE `tooling/curate-trace.mjs`

- **IMPLEMENT**: `node tooling/curate-trace.mjs <raw.jsonl> <out.jsonl>` — zero-dep, deterministic. Rules as named constants at the top (v1): `strip-piv-markers` (remove lines matching exactly `/^\s*\[\[piv:(plan|gate|implement|validate)\]\]\s*$/` from text steps — the same regex family the recorder scans with; phase field already carries the tag), `truncate-input-700` (stringify tool inputs, cap at 700 chars, always preserving `file_path`/`command` keys whole), `truncate-response-400`, `drop-empty-text` (a text step that was ONLY its marker becomes empty after the strip and is dropped by this rule — the counts still add up in `curation.droppedSteps`). NO other drops in v1 — spike 5's assessment decides whether drop rules are needed; any added rule gets a name in the constant list and shows up in the curated meta automatically. Output meta = raw meta + curated `label` + `curation: { from, rules, droppedSteps, inputTruncatedAt, responseTruncatedAt }` + run stats merged from the result line. **Selection + truncation only — this script must be structurally incapable of rewriting step text** (transform = whole-step drop, marker strip, or length cap; assert no other mutation).
- **PATTERN**: MIRROR `scenarios/validate.mjs` structure — header citing ticket + honesty rule, boundary function throwing `Error`s naming file + line number, `pathToFileURL` guard, aligned ✓ output (`curated demo-notice   ✓  51 → 47 steps · 4 dropped (empty text) · label set`).
- **IMPORTS**: `node:fs`, `node:path`, `node:url` only.
- **VALIDATE**: `node tooling/curate-trace.mjs traces/demo-notice.raw.jsonl traces/demo-notice.jsonl && head -1 traces/demo-notice.jsonl | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const m=JSON.parse(d);if(m.label!=='Real run, curated for length')throw new Error('label');if(!m.curation)throw new Error('curation record');console.log('meta ✓')})"`
- **SATISFIES**: AC #2 (committed run labeled "real run, curated for length")

### CREATE `tooling/validate-trace.mjs`

- **IMPLEMENT**: `node tooling/validate-trace.mjs [file…]` (default: every `traces/*.jsonl`). Checks per file: every line parses as JSON; line 1 is `meta` with `version === 1`, non-empty `slug`/`task`/`model`/`sessionId`, and a `label` matching `/real run/i`; step `seq` strictly increasing; every step `phase` ∈ the four PIV phases (null → fail, naming the line); first-seen phase order is exactly `plan → gate → implement → validate` and all four occur; every successful `Write`/`Edit` step carries `artifact.path`, repo-relative, and the file exists in the repo; last line is `result`. Curated files (meta has `curation`) must list ≥1 rule AND contain no `[[piv:` remnant in any step text (marker strip proven, and stray mid-text markers — a prompt violation — can't slip into the shipped trace unseen). One aligned ✓ line per file; any failure throws an `Error` naming `file:line: field`, exit 1.
- **PATTERN**: MIRROR `scenarios/validate.mjs` — same structure, guard, error convention.
- **GOTCHA**: raw traces still contain the `[[piv:…]]` marker lines and that is valid; only phase-tag correctness is enforced, not marker absence.
- **VALIDATE**: `node tooling/validate-trace.mjs` → two ✓ lines (raw + curated), exit 0. Negative check: `node -e` a copy with a broken phase into the scratchpad, expect exit 1 naming the line — never mutate the real traces, even temporarily.
- **SATISFIES**: AC #1 (valid trace JSONL, machine-enforced)

### ASSESS — spike 5 decision gate

- **IMPLEMENT**: read `traces/demo-notice.jsonl` end to end as a reader would. Decision rule (ticket, verbatim): **curated trace reads as engineering → ship the pattern; else re-run with tighter agent prompts. NEVER hand-write a trace.** Concretely check: annotations explain *why*, not just *what*; the gate phase contains a real self-review (not a rubber stamp); the validate phase shows the actual `✓`; signal-to-noise after v1 curation rules is acceptable (if reads drown the story, add a named drop rule to `curate-trace.mjs` and re-curate — deterministic, honest — before resorting to a re-run).
- **VALIDATE**: record the verdict + what was tuned in this plan's AMENDMENTS section and the execution report.
- **SATISFIES**: the spike-5 fold (ticket scope), AC #2

### CREATE `system/trace-player.mjs`

- **IMPLEMENT**: hand-written canon (header per `system/scenario-data.mjs:1-13`, citing ticket #5 + architecture §Data model — Trace; note the honesty-load-bearing rule: `meta.label` is rendered verbatim, prominently, always). Exports:
  - `parseTrace(jsonlText)` → `{ meta, steps, result }`. Hand-validate: meta first, steps have `seq`/`phase`/`kind` — throw `Error`s naming line numbers (project convention). No DOM use — parse is pure (node-testable).
  - `renderTracePlayer(container, trace)` → builds the DOM and returns `{ next, prev, reveal, revealAll, destroy }`:
    - **Header strip**: `meta.task`, the label badge (`meta.label` verbatim — honesty surface #2 on screen), model, date, `numTurns`, `durationMs` humanized, `totalCostUsd` (transparency: show the real cost), step count.
    - **Four act sections** in fixed order plan → gate → implement → validate, each with an act header (phase name + step count) — the governance skeleton visible before any card is revealed. Steps grouped by their `phase` tag, chronological within the act.
    - **Stepped cards**: one card per step. `kind:"text"` = annotation card (the agent's own words — this is the "annotated", never paraphrased). `kind:"tool"` = compact card: tool name, input hint (MIRROR `chat.mjs:70` extraction: `query || url || file_path || pattern || command`), `ok` / `✗ + error`, `artifact.path` as a chip when present, truncated `response` inside `<details>`.
    - **Stepping**: cards hidden until reached; Next/Prev buttons + ArrowRight/ArrowLeft advance/retreat `current`; current card highlighted and scrolled into view; a "Show all" control reveals everything (skimmers). No autoplay.
    - Semantic classes only (`trace-player`, `trace-act`, `trace-step`, `trace-step--tool`, `trace-artifact`, …) + existing component classes (`card`, `muted`, `section-label`); ALL styling via tokens; the module injects no `<style>`.
    - **Layout to build** (pins the design; #10 restyles later):

      ```
      ┌ trace-player ──────────────────────────────────────────────┐
      │ Authoring a ComponentSpec: demo-notice                     │
      │ [Real run, curated for length]  claude-sonnet-5 · 2026-07-…│
      │ 47 steps · 12 turns · 3m 41s · ~$0.31 (SDK estimate)       │
      │                    [◀ Prev] [Next ▶] [Show all]            │
      ├ trace-act ── 1 · plan ─────────────────────── 9 steps ─────┤
      │ ┌ trace-step (text) ─────────────────────────────────────┐ │
      │ │ I'll read the spec format first, because the head …    │ │
      │ └────────────────────────────────────────────────────────┘ │
      │ ┌ trace-step--tool ──────────────────────────────────────┐ │
      │ │ Read · .claude/references/kb-format.md        ✓        │ │
      │ │ ▸ response (first 400 chars)                           │ │
      │ └────────────────────────────────────────────────────────┘ │
      │ ░ hidden until stepped ░                                   │
      ├ trace-act ── 2 · gate ─────────────────────── 4 steps ─────┤
      ├ trace-act ── 3 · implement ────────────────── 6 steps ─────┤
      │ │ Write · system/specs/demo-notice.md  ✓  [artifact] │    │
      ├ trace-act ── 4 · validate ─────────────────── 5 steps ─────┤
      └────────────────────────────────────────────────────────────┘
      ```
- **PATTERN**: DOM building with template strings + `createElement` as in `portal/public/portal.js` render functions; but zero portal imports — this ships.
- **GOTCHA #1**: no bare specifiers, no imports at all ideally — shipped raw via `<script type="module">`; must not fetch (the page fetches, the player renders — keeps #10 free to inline or preload).
- **GOTCHA #2**: render `meta.label`, `text`, `error` with `textContent` (never innerHTML interpolation of trace content) — trace text is real agent output, treat as untrusted for XSS hygiene.
- **VALIDATE**: `node --check system/trace-player.mjs` + `node -e "import('./system/trace-player.mjs').then(async m => { const t = m.parseTrace(require('node:fs').readFileSync('traces/demo-notice.jsonl','utf8')); console.log(t.meta.slug, t.steps.length, 'parse ✓'); })"` (parse is DOM-free so this runs under Node)
- **SATISFIES**: AC #3 (player renders stepped annotated cards grouped into the four PIV acts; zero runtime deps)

### CREATE `trace.html`

- **IMPLEMENT**: bare harness page at repo root (MIRROR `derive.html:1-30`): CSS trio + `portfolio.css`, `noindex`, favicon, header comment citing ticket #5 + "the designed surface is the Factory page (ticket #10)". Body: one `section`/`container` with a short explainer in the check-page register (what a trace is, that the player replays a committed real run, "stop reading and inspect `traces/` in the repo if you'd rather"), a mount `<div id="player">`, and a small harness-chrome `<style>` (tokens only) for the `trace-*` classes. `<script type="module">`: read `?trace=` param (default `demo-notice`, allow `[a-z0-9-]+` only), `fetch('/traces/' + slug + '.jsonl')`, `parseTrace`, `renderTracePlayer`; render fetch/parse failures as a visible error card naming the path (project error convention, browser edition).
- **GOTCHA**: sanitize the `?trace=` param before interpolating into the fetch path (regex above) — same-origin only, no `../`.
- **VALIDATE**: `npx serve .` → open `http://localhost:3000/trace.html`: label badge visible, four act headers, stepping works with keyboard, Show all works, artifact chip on the Write step, `?trace=nope` shows the error card.
- **SATISFIES**: AC #3 (bare test page), AC #2 (label rendered)

### UPDATE `_headers`

- **IMPLEMENT**: ADD a `/traces/*` block with `Cache-Control: public, max-age=300, must-revalidate` (same tier as `/scenarios/*` — traces change at authoring time).
- **PATTERN**: exact format of the existing `/scenarios/*` block.
- **VALIDATE**: `grep -A1 "/traces/\*" _headers`
- **SATISFIES**: AC #3 (trace served sanely when deployed)

### UPDATE `CLAUDE.md`

- **IMPLEMENT**: surgical additions only:
  - Architecture map: `traces/` (committed real agent-run traces — format: `traces/README.md`; raw + curated pairs; validate: `node tooling/validate-trace.mjs`) · `system/trace-player.mjs` on the system block (view-time trace replay, driven raw by `/trace.html`, designed surface = Factory page) · note on the portal block that `record-trace.mjs` records build-time agent runs · `tooling/` gains the curate/validate scripts.
  - "Where new code goes": **New trace** → record a REAL run via `node portal/record-trace.mjs`, curate via `node tooling/curate-trace.mjs`, validate via `node tooling/validate-trace.mjs`; hand-writing or hand-editing trace content is forbidden (honesty contract, hard).
- **VALIDATE**: `grep -n "traces/" CLAUDE.md`
- **SATISFIES**: AC #1 (the pattern is institutionalized)

---

## TESTING STRATEGY

Project rule (CLAUDE.md §Testing): **no suite, no linter — "done" = run the surface you touched.** Do not invent a test framework.

### Unit-level

- `node --check` every new `.mjs`.
- `parseTrace` exercised under Node (DOM-free) against the real committed trace.
- `tooling/validate-trace.mjs` run on both raw + curated; one negative run against a deliberately broken COPY in the scratchpad (never mutate real traces).

### Integration

- The real recording run end to end (the recorder's only meaningful test IS a real run — auth required).
- Curate → validate → player pipeline on the run's actual output.
- `trace.html` in a real browser: stepping, keyboard, Show all, error card on bad `?trace=`.

### Edge Cases

- Tool failure mid-run (`PostToolUseFailure`) → `ok:false` step recorded, rendered with `✗`, survives curation.
- Agent emits text before the first `[[piv:plan]]` marker → `phase:null` → validator fails → prompt tightened, re-run (spike loop, not a code fix).
- Long `Write` inputs (whole file bodies) → raw keeps them, curated truncates at 700 chars with `file_path` preserved.
- Trace fetch 404 / malformed line → visible error card naming the path; `parseTrace` names the line number.
- `?trace=../x` → rejected by the slug regex.

### Regression

- Portal still boots: `cd portal && npm start` → `/api/health` answers (recorder shares `lib/env.mjs`; chat untouched).
- `node agent-layer/gen-handoff.mjs` → ✓ (the run's spec addition regenerates cleanly; re-run is idempotent).
- `node scenarios/validate.mjs` + `node agent-layer/gen-token-css.mjs --check` → untouched surfaces still clean.

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node --check portal/lib/trace-recorder.mjs && node --check portal/record-trace.mjs \
  && node --check tooling/curate-trace.mjs && node --check tooling/validate-trace.mjs \
  && node --check system/trace-player.mjs
```

### Level 2: Dry smoke (before the real run — pennies)

```bash
node portal/record-trace.mjs --dry   # ✓ line: 4 phases in order · 0 null-phase · 1 artifact
```

### Level 3: The real run (auth: CLI login on this Mac — verified; or token in portal/.env)

```bash
node portal/record-trace.mjs                 # → traces/demo-notice.raw.jsonl + its ✓ line
node agent-layer/gen-handoff.mjs             # run's work product regenerates: ✓
```

### Level 4: Curate + validate

```bash
node tooling/curate-trace.mjs traces/demo-notice.raw.jsonl traces/demo-notice.jsonl
node tooling/validate-trace.mjs              # ✓ per trace file, exit 0
```

### Level 5: Browser (player)

```bash
npx serve .    # → http://localhost:3000/trace.html
# label badge "Real run, curated for length" visible · four acts · stepping + keyboard
# · artifact chip on the Write step · ?trace=nope → error card
```

Run non-interactively with the `agent-browser` skill (load it first): open the page, assert the label badge text, press ArrowRight three times, screenshot, then open `?trace=nope` and assert the error card names the path.

### Level 6: Regression

```bash
cd portal && npm start &   # /api/health answers; kill after
node scenarios/validate.mjs && node agent-layer/gen-token-css.mjs --check
```

---

## ACCEPTANCE CRITERIA

(from issue #5, expanded)

- [ ] Recorder hooks into an Agent SDK session portal-side (`Options.hooks`: `PostToolUse` + `PostToolUseFailure` callbacks) and emits trace JSONL that `tooling/validate-trace.mjs` passes: PIV-phase tags on every step, `artifact.path` pairing on every successful Write/Edit.
- [ ] ≥1 REAL recorded run committed — `traces/demo-notice.raw.jsonl` + `traces/demo-notice.jsonl` — curated meta labeled exactly "Real run, curated for length" (honesty surface #2), curation self-describing (rules + drops recorded in meta).
- [ ] Player renders the committed trace as stepped annotated cards grouped into the four PIV acts on `trace.html`; zero runtime deps; label rendered verbatim; agent text shown as-written (textContent, no paraphrase).
- [ ] Spike 5 verdict recorded (AMENDMENTS + report): curated trace reads as engineering, or the re-run/tightening loop that got it there is documented.
- [ ] No hand-written or hand-edited trace content anywhere; recorder/curator are the only producers; the rule is written into `traces/README.md` and `CLAUDE.md`.
- [ ] Zero regressions: portal boots + `/api/health`; `gen-handoff` ✓; scenarios + token generators clean.
- [ ] All new entry files open with headers citing ticket #5 / architecture sections (project convention).

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each task's VALIDATE ran clean at the time
- [ ] Level 1–6 validation commands all pass
- [ ] The committed trace read end-to-end once for the honesty contract (labels correct, nothing implies more than what ran)
- [ ] Spike-5 verdict + any prompt/curation tuning appended to AMENDMENTS
- [ ] `_headers` + `CLAUDE.md` updated, nothing else touched (surgical)
- [ ] Commit message per convention, e.g. `trace recorder + player: PIV-act replay of a real agent run (epic #1, ticket #5)`; PR body carries `Closes #5`

---

## OPEN QUESTIONS / ASSUMPTIONS

**Verified during planning (facts, not assumptions):**

- SDK hook/message shapes: read from the installed `0.1.77` `.d.ts` files (paths + line numbers in CONTEXT REFERENCES).
- `tooling/style-dictionary/node_modules` is INSTALLED → the run's validate phase can shell out to Style Dictionary.
- `HAS_TOKEN` is `false` on this machine → the real run authenticates via the CLI-login fallback, the same path portal chat already uses here (`portal/server.mjs:87` prints exactly this state).
- `system/specs/primary-button.md` is presentational (`contract: null`, class `vd-primary-button`) → it is the right sibling to point the recorded agent at, and `vd-demo-notice` follows its class convention.
- `scenarios/verdant/copy.json` carries `fictionalNotice` ("Verdant is a fictional product, invented for this demonstration. …") → the component the run specs has real data to render.

**Assumptions (proceeding on these; flag in PR if any feels wrong):**

1. **Both raw AND curated traces are committed.** The raw file is the verifiability anchor — a reader can diff raw→curated and see curation touched nothing but length. Deploy-=-commit prefers visible artifacts; size is trivial (tens of KB). If the raw file embarrasses (it shouldn't — that's what re-runs are for), the honest fix is a better run, not a hidden raw.
2. **The recorded task is the `demo-notice` ComponentSpec** — real (needed by #8 to render `fictionalNotice`, honesty surface #1), bounded (~1 spec file + pack regen), and it exercises a genuine validation gate (`parseComponentSpec`). If a demo-notice spec already exists by implementation time, substitute an equivalent real, needed, spec-sized task — the recorder doesn't care; the trace must be of real work.
3. **Model: `claude-sonnet-5`** (chat.mjs precedent). One-line swap if a stronger model should author the exhibit; meta records whatever actually ran, so honesty holds either way.
4. **Phase tags derive from the agent's own `[[piv:…]]` markers.** This is the only tagging mechanism compatible with "never hand-write": the run itself declares its phases; the recorder transcribes. Misbehavior → validator fails → re-run with a tighter prompt (spike 5's loop), never hand-tagging.
5. **The recorder does not load filesystem settings** (SDK default; no `settingSources`) — the run's conventions come from files the prompt names, which makes the agent's reads visible trace steps. Also isolates the recorded run from the author's global CLAUDE.md (reproducibility + honesty).
6. **`trace.html` ships** (noindex'd, like `derive.html` and `scenarios/check.html`) — inspectable proof beats a gitignored scratch page.
7. **No trace registry yet** — one committed run; `?trace=` param + default covers it. #10 adds an index if/when it lists multiple traces.
8. **SDK pin**: shapes verified against installed `0.1.77` type declarations during planning. If `npm install` bumps the minor and hook types drift, the local `.d.ts` is the authority — re-check the two files cited in CONTEXT REFERENCES.

**Questions for the user (none blocking — defaults chosen):**

- None critical. The recording costs real API tokens (one sonnet-5 run, `maxTurns: 50`, likely well under a dollar — the meta line will show the exact figure). If recording should wait for an explicit go-ahead, say so before the RUN task.

## NOTES (open canvas)

**Why hooks + message loop, not one or the other:** hooks (`PostToolUse`) hand over `tool_input` AND `tool_response` together with `tool_use_id` in one payload — pairing a step with its artifact needs exactly that. But hooks never fire for plain assistant text, and the annotation layer (the agent narrating its decisions) IS the product here — that comes from iterating the query like `chat.mjs` already does. So: hooks for tool steps, message loop for text/meta/result, one shared `seq` for chronology. `PreToolUse` adds nothing for a passive recorder (its data is a subset of PostToolUse's) — rejected to keep the recorder observational.

**Considered: message-iteration-only (no hooks).** Tool results also arrive in the message stream as `tool_result` blocks inside the SDK-synthesized user messages, correlatable to `tool_use` blocks by `tool_use_id` — a recorder could pair steps without hooks at all. Rejected: the epic pins the mechanism ("trace recorder (Agent SDK hooks)" — architecture §Missing pieces; ticket scope says "using Claude Agent SDK hooks"), an inherited decision, and hooks are genuinely better here: one payload instead of cross-message correlation state, plus `PostToolUseFailure` delivering the failure `error` explicitly. The message loop stays for what hooks can't see (text, init, result).

**Rejected: parsing `transcript_path`.** `BaseHookInput.transcript_path` points at the SDK's own session transcript — tempting as a free recorder, but the format is internal/undocumented, it isn't step-paired with artifacts, and coupling a shipped artifact's provenance to a private file format is exactly the fragility this repo avoids. The hook payloads are the documented, typed surface.

**Rejected: recorder as an `agent-layer/` generator.** Generators are deterministic ledger→artifact emitters registered in `build.mjs` and runnable zero-dep from the jobs folder. The recorder is neither deterministic nor zero-dep (SDK), and module resolution pins it under `portal/` anyway. The curate/validate halves ARE deterministic and zero-dep — hence `tooling/`, beside `spike-palette.mjs`.

**"Stepped annotated cards grouped into acts, not a log" — the design reading:** the four act headers render up front (empty), so the reader sees the governance skeleton — plan, gate, implement, validate — before a single step. Stepping fills the skeleton in. A log shows what happened; this shows what happened *inside a structure that was there first*. That inversion is the whole point of the PIV framing, and it's why grouping is by phase tag with chronology preserved within acts.

**Curation honesty mechanics:** the curated meta names its own rules and counts (`curation: { rules, droppedSteps, … }`) — "no silent caps" applied to the honesty surface itself. Combined with the committed raw file, curation is fully auditable: `label` says curated, meta says how, raw says from what.

**Cost transparency:** the result line's `total_cost_usd` flows into the curated meta and the player header. A hiring manager seeing "this run cost ~$0.31" is exactly the build-vs-buy literacy the portfolio wants to perform. It is a client-side estimate (SDK price table), so render it as an approximation ("~$0.31, SDK estimate") — the honesty contract applies to numbers too.

**Seam inventory** (who consumes what — useful when reviewing #9/#10 plans):

| Consumer | Reads |
| --- | --- |
| #10 Factory page | `traces/*.jsonl` via `parseTrace` + `renderTracePlayer` (station 5, "agents visible") |
| #9 CI gates | `node tooling/validate-trace.mjs` as a candidate third-family check |
| #8 prototypes | `system/specs/demo-notice.md` — the recorded run's work product |
| Future runs | `portal/record-trace.mjs` pattern — new task const per run, same recorder |

**Recorded-run quality levers (in escalation order, all honesty-safe):** 1) tighter task prompt (name exact files, exact validate commands); 2) tighter PIV system prompt (marker discipline, "narrate why not what"); 3) named curation drop rules (deterministic, recorded in meta); 4) full re-run. Hand-editing is not on the list at any escalation level.

## AMENDMENTS

(append-only; newest at the bottom)
