# Feature: import-run — the recorded import, the refusal, the proposal on disk, the side-by-side view and the mapping editor (#311)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before
you start implementing. Pay special attention to naming of existing utils, types and models. Import from the
right files.

**Worktree:** `/Users/Berzins/Desktop/Linards_current/wt-311`, branch `feat/import-run-311`, cut from `origin/main`
at `cfceeaf`. Every path below is relative to that worktree. The primary tree
(`ux-factory`, branch `fix/importer-reads-icon-name-449`) is 7 commits behind main — never implement there.

## Feature Description

Epic #295's import half has every piece and no caller. `import/` converts a Brilliant blueprint read or a Figma
house-plugin export into an IR, snaps unbound values, recognises parts against the vocabulary, builds the
mapped composition and writes a record that cannot lie (#304, #307, #310). Nothing in the portal runs that
chain. This ticket is the caller: a recorded, server-side import run that reads Brilliant's current selection
through the Agent SDK (or reads a dropped file when Brilliant is not there), runs the chain in Node, writes the
record, its markdown, a transcript and a **proposal** into the build package, files one `component.propose` op,
and shows the owner the original beside the mapped result with a mapping editor that rewrites `mapping.json`
and re-derives everything from it.

## User Story

As the owner, holding a Brilliant design and a build run open on the canvas
I want to press "Import selection" (or drop an exported file when Brilliant is not reachable) and see what my
design became in this system's parts, what was lost, and edit how each part maps
So that a component reaches the canvas through import rather than by hand, with a record I can audit and a
proposal #313 can ratify.

## Problem Statement

The import chain exists as Node modules and gate fixtures only. There is no entrance (no button, no route, no
drop zone), no run that reaches Brilliant from the portal, no place in the build package where an import lands,
no op that records it, no view of the result and no way for the owner to correct a mapping. The epic's
hypothesis ("at least one component reaches the canvas through import") cannot be tested until this exists.

## Solution Statement

One new SDK-free portal module, `portal/lib/import-run.mjs`, with the SDK loaded lazily inside the one function
that reads Brilliant (`record-composition.mjs`'s pattern, so build-checks can import the rest in CI). It owns:

- **the fence** — one predicate (`importFenceDecision`) at two sites (a `PreToolUse` hook and `canUseTool`), the
  Brilliant read tools allowed by name, everything else denied and recorded as a `denied` transcript line;
- **the reach classifier** — the SDK's `init` message and tool failures turned into exactly one visible refusal
  each, with one fixing action;
- **the pipeline** — `convert` → `snap` → `recognise` → `applyMapping` → `build` → `buildRecord`, the order
  `tooling/regen-import-records.mjs` already proves, with fidelity recorded as **missing** and WCAG computed;
- **the writer** — `imports/<id>.json` + `.md` + `.transcript.jsonl` and `proposals/<name>/` (six files), every
  path guarded to stay under the build root, all written **before** the response;
- **the mapping editor's back end** — an edit rewrites `mapping.json` (and, for a snap, the per-source override
  file), then re-derives record, markdown and the three drafts from `source.json`, never patches them;
- **the run** — `runImport`, under `builder.mjs`'s shared `withRunLock`, conflict-checked on the page's ledger
  count, appending one `component.propose` line through `canvas-store`'s existing `saveRun`.

`system/canvas-ops.mjs` gains the op (the epic's op lock is held here). `portal/public/canvas-import.mjs` is the
panel, the view and the editor, loaded by `canvas.html`. `tooling/canvas-journey.mjs` gains the two journeys.

## Out of Scope / Non-Goals

- **Not included: agent-drafted prose** for `spec.md` / `block.css` / `template.txt`. The drafts are generated
  deterministically by the importer and headed as its output (owner's call, 2026-09-26). Props, states,
  behaviour and the accessibility model stay blank for the owner at ratify (#313).
- **Not included: a live fidelity measurement.** A live record's `fidelity` carries WCAG only, so its verdict is
  `missing` and the view says so (owner's call, 2026-09-26). Measuring ΔE needs a headless render the portal
  cannot load (its dependencies are the SDK and `zod`). Tracker: open "live import fidelity: render the
  candidate and measure ΔE-MIN" before the PR.
- **Not included: the Mode 2 exhibit node** on the canvas (owner's call, 2026-09-26). This PR records `mode: 1|2`
  on the record and the proposal ref. The `exhibit` node, its `canvas.json` derivation, `CANVAS_DESCRIPTION`,
  `verifyBuild` and its position rule go to a follow-up. Tracker: open "Mode 2 exhibit beside the canvas (G7)"
  before the PR.
- **Not included: screen grain** (recognised parts placed into a frame). Every import here is `grain: "component"`.
  Placing parts into frames is the compose loop's (#312) and groups' (#315).
- **Not included: `proposal.ratify`** and anything that writes `system/` or `handoff/` — #313.
- **Not included: a paste-an-id door** (the ticket forbids it).
- **Not changing:** `canvas-store.mjs`'s import set (group 36.6 pins it), `arrangement()`, `CANVAS_DESCRIPTION`,
  the committed `discovery/faster-payment/build/` package, `recordRun` (it caps tool responses at 4,000 chars and
  `source.json` must be verbatim).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: `system/canvas-ops.mjs`, `portal/lib/` (new `import-run.mjs`), `portal/server.mjs`,
`portal/public/` (canvas page), `import/recognise.mjs` + `import/snap-rules.mjs` (the #307 forward note),
`tooling/build-checks.mjs` (groups 35, 40, 42, new 43), `tooling/canvas-journey.mjs`, docs
**Dependencies**: `@anthropic-ai/claude-agent-sdk` 0.1.77 (already the portal's; lazy-loaded), the Brilliant MCP
(`npx -y @brilliant-hq/mcp`, run by the SDK as a stdio server), Playwright from `tooling/visual-regression`
(journey only). No new dependency anywhere.

## Related Work

**Implements**: #311 · **Epic**: #295, `docs/epics/canvas-design-import.architecture.md` (§ Boundaries "The
import is a recorded run", § Data model "Proposals" and "The import record", § Placement)

**Back-references**:

- `.claude/plans/import-record-snap-rules-307.md` — `buildRecord`, `snap`, `readOverrides`; its forward note on
  the type role (fixed here, Task 2.1) and Q5 (the unbound count, Task 3.6).
- `.claude/plans/figma-plugin-s5-converter-310.md` — `import/figma.mjs` `convert`; "#311 accepts this file type
  on the same drop zone".
- `.claude/plans/canvas-page-run-list-arrangement-ops-306.md` — the op lock order (#311 → #313 → #315), the
  canvas page, `saveRun`, `canvas-journey.mjs`.
- `.claude/plans/design-import-spike-c/` — `spike-c-sdk-reach.mjs` (the MCP reach shape), `12-sdk-reach-output.txt`
  (17 advertised `mcp__brilliant__*` tools, observed).
- `.claude/plans/discovery-spike-1-op-transport-280.md` — the in-process verdict this inherits (the SDK runs in
  the portal process).

**Forward-references**: #313 (ratify reads `proposals/<name>/` and flips the ref's status), #314 (handoff carries
`imports/<id>.md`), #315 (groups; `group.place` must refuse a mode-2 proposal), the two trackers above.

---

## RISKS AND MITIGATIONS

| # | Risk | Mitigation in this plan | Residual |
|---|---|---|---|
| R1 | Brilliant's live response shapes are unobserved (`get_selection`, the bound project's name, a page listing, the PNG block) | (a) **Two PRs** (below): everything that runs on committed fixtures ships first and nothing in it depends on a live shape. (b) All shape knowledge lives in ONE pure function, `parseBrilliantCalls(calls)` → `{ ids, text, project, reference, listing }`, driven in CI (43.11) over Phase 0's committed captures. When Brilliant changes, one function and its fixtures change. (c) The reader is not written until Phase 0 has run. (d) Each unknown has a stated fallback (project "not exposed", Browse "cannot list"), never a guessed call | Phase 0 needs your hand and ~$0.20–0.50 |
| R2 | The fence logging Claude Code's own warmup built-in calls as the import agent's | Discovery's record gate, adopted (Task 3.1): record only `mcp__` names and advertised tools; 43.2 proves both directions | none known |
| R3 | The op edit moves `system/`'s rounded line count and forces an approach-baseline regeneration ×3 | **A line budget.** Measured 2026-09-26: the generator's own count is **32,414** (80 files); `round100` moves at 32,450, so the headroom is **35 lines** (observed). Task 1.1 is budgeted at **≤ 30 net lines** in `system/canvas-ops.mjs` (the verb is ~25: OPS 1, PARAMS 1, `??=` 1, the regex 2, the case ~18, comment rewrite net 0). Task 1.1's VALIDATE re-measures. Task 8.3 becomes conditional: regenerate only if the figure moved | A ticket merging into `system/` first can spend the headroom — re-measure after every `git merge origin/main`; the regen path stays written |
| R4 | Size (~2,000 lines vs the 1,000–1,500 estimate) and a long-lived branch | **Split into two PRs on one branch line.** **PR A — "the drop path"** (Phases 1–3, 5, 6, 7.1–7.2, 8; `Part of #311`, takes the op lock): the op, the import/ fixes, the module's pure half, every route except rebind/browse, the page, the drop and refusal journeys. It meets AC #1b, #2, #3, #4 and both deferrals. **PR B — "the live read"** (Phases 0, 4, 7.3–7.4; `Closes #311`): the reader, rebind, browse, the live journey. PR B is small (~400 lines) and waits only on Phase 0 | #311 stays open between the two; PR A's body says so and links PR B's plan section |

The Paid table and the Acceptance Criteria below are unchanged in substance. AC #1a lands in PR B.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/canvas-ops.mjs` (whole file, 570 lines) — the op grammar you extend. `OPS` :56-67, `PARAMS` :72-83,
  `OPTIONAL` :88-93, `emptyDoc` :108 (already carries `proposals: []`), `nextId` :113-117, `checkOp` :122-154,
  `applyOp` :185-410 (the `??=` defaults at :199-200, the switch, the `default` guard :407).
- `portal/lib/canvas-store.mjs` — `saveConflict` :294-298, `saveRun` :309-336 (hardcodes `source: "owner"`,
  accepts `applied`/`undone` only, appends in ONE write), `foldLedger` :113-133 (skips `proposed`/`refused` lines,
  so a `component.propose` line MUST be `applied`), `positionsOf` :176-183, `loadDecisions` :262-277.
- `tooling/regen-import-records.mjs` (whole file, 146 lines) — the pipeline order to mirror (:76-83), the WCAG
  half (`parseCss` :46-58, `checkPairs(tokens, RULESET.wcagPairs)` :88), `buildRecord` call shape (:89-101).
- `import/report.mjs` — `REQUIRED_KEYS` :56, `fidelityVerdict` :62-69, `mappingDrops` :76-86 (a mapping drop
  row needs `class` ∈ read-then-dropped|read-but-never-emitted, `role`, `why`, optional `literal`),
  `buildRecord` :125-136, `checkRecord` :138-168, `projectRecord` :220-314.
- `import/brilliant.mjs` `convert` :602-620 (tolerates the fixture's header line); `mapSpacing` :214-220;
  `import/figma.mjs` `readExport` :151-177, `convert` :411, `FORMAT` :115.
- `import/recognise.mjs` — `recognise` :362, `BUILDERS` :520-545 (the six names that can be emitted),
  `build` :547, the type-role fill :248-251 (the #307 forward note), `stackShape` :474-518 (the #457 F2 pad row
  at :497-502).
- `import/snap-rules.mjs` — `targetsFrom` :85, `snap` :168-186, `sourceHash` :207, `readOverrides` :213-221,
  `TYPE_TOKEN` :75.
- `import/overrides/README.md` — the override file format (`{source, note?, snaps: [{path, slot, ref}]}`).
- `portal/lib/builder.mjs` :229-247 — `withRunLock` / `isRunInFlight`. SDK-free by construction (:31-37).
- `portal/record-composition.mjs` :236-270 — `makeFence`, and its lazy SDK import (the pattern for keeping
  `import-run.mjs` CI-importable).
- `portal/lib/discovery.mjs` :186-237 and :380-536 — the fence shape to MIRROR (not import): one predicate, two
  sites, `deniedLine` :369-372, fail-closed try/catch in `decide`, hooks returning `{ continue: true }`.
- `portal/lib/discovery-transport.mjs` :167-275 — a `query()` loop with `strictMcpConfig: true`, `tools`,
  `allowedTools: []`, `canUseTool` + `hooks`, reading `init` and `result`.
- `.claude/plans/design-import-spike-c/spike-c-sdk-reach.mjs` — the Brilliant server config verbatim
  (`{ type: "stdio", command: "npx", args: ["-y", "@brilliant-hq/mcp"], env: {} }`) and the PostToolUse capture.
- `portal/server.mjs` — routing and the origin guard :63-73, `readBody` :56-61 (1 MB cap), the streamed upload
  precedent `/api/figma/pull` :101-110 + `portal/lib/figma.mjs` `receiveExport` :43-80, the canvas routes
  :395-429, the SSE route shape :124-160.
- `portal/public/canvas.html` (48 lines), `portal/public/canvas.mjs` :1-80 (the header's four calls, `el()`,
  `canon`), :99-108 (`describeOp`), vocabulary load, `renderComposition` import.
- `tooling/canvas-journey.mjs` :1-60 and its boot/teardown — the driver you extend.
- `tooling/build-checks.mjs` — group 35 at :11190-11590 (35.1 pins `COPS.length === 10`, 35.2 `VALID_FOR`),
  group 8's lock cases :2071-2097 (match `"already in flight"`), group 30's hook-driving pattern :7974, group 40
  :12184, group 42 :13239, the pass line :13580.
- `tooling/drift-check.mjs` :175-206 — `checkGroupCount`: the four places that state the group count.
- `.claude/references/gates.md` :11 (`42 pure groups`), the group 35/40/42 entries, the canvas-journey entry :123.
- `discovery/README.md` :498-520 — the `build/` section; `proposals/` and `imports/` are marked LATER.

### New Files to Create

- `portal/lib/import-run.mjs` — the recorded import (pure half + lazy SDK reader).
- `portal/public/canvas-import.mjs` — the panel, the side-by-side view, the mapping editor.
- `import/fixtures/brilliant-live/` — Phase 0's verbatim MCP responses (`.txt`/`.json` only), owner-run.

### Relevant Documentation

- Agent SDK typings in `portal/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts`:
  `abortController?: AbortController` :234, `strictMcpConfig?: boolean` :517, `interrupt(): Promise<void>` :97;
  `coreTypes.d.ts` :484 (`mcp_servers` on the init message). Observed 2026-09-26, SDK 0.1.77.
- `docs/epics/canvas-design-import.architecture.md` :155-164 (proposal and record shapes), :181-214 (fence,
  transport, the recorded run), :271-277 (placement).
- `docs/epics/canvas-design-import.prd.md` MVP 7 (G10, G18, G29, G7) and MVP 8 (G30).

### Patterns to Follow

**Op grammar (canvas-ops.mjs):** a verb is four edits together — `OPS`, `PARAMS` (exact), `OPTIONAL` if any,
a switch case — plus the group-35 `VALID_FOR` fixture. Refusals name the op and the offending value:

```js
throw new Error(`variant.add: variant "${p.key}" already exists — one lane per key`);
```

**Lazy SDK (record-composition.mjs):** the module is importable with no `portal/node_modules`; the SDK is
`await import('@anthropic-ai/claude-agent-sdk')` inside the one function that runs a query.

**Fence sites (discovery.mjs:465-536):** `canUseTool` returns `{ behavior: 'allow', updatedInput: input }` or
`{ behavior: 'deny', message }`; the `PreToolUse` hook returns `{ continue: true }` or
`{ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason } }`;
the decision is wrapped in try/catch and a throw DENIES.

**Errors:** plain `Error`, message names the path or value; server catch-all returns `{ error }`. A refusal the
owner should read (not reachable, nothing selected, stale binding) is DATA, returned as
`{ refused: { kind, message, action } }` with status 200 — it is an outcome, not a server failure.

**Writers:** `mkdirSync(..., { recursive: true })` then `writeFileSync(path, `${JSON.stringify(v, null, 2)}\n`)`
for JSON (canvas-store.mjs:55-57); JSONL by append.

**Page strings:** every string from a package or a read is `textContent` (canvas.mjs header, call 4).

---

## IMPLEMENTATION PLAN

### Phase 0: Probe the live read (owner's hand, paid)

Nothing in this session observed `get_selection`, a page-level listing, or where the bound project's name
appears (spike C: `list_projects` → `[]` in the web editor). Capture them verbatim before writing the reader.
**Blocks:** Tasks 4.1–4.2 and 7.3 (the live reader, browse, re-bind, the live leg). **Independent of:** Phases 1–3, 5–6 and the drop
journey, which run on committed fixtures.

### Phase 1: The op — `component.propose`

**Independent of:** Phase 0, Phase 2.

### Phase 2: The import/ fixes this ticket owns

The #307 forward note (type role reads the snapped ref) and the two review deferrals on #311's body.
**Independent of:** Phases 0 and 1.

### Phase 3: `import-run.mjs`, the pure half + group 43

**Depends on:** Phase 1 (the op), Phase 2 (the type-role fix changes pipeline output).

### Phase 4: The live reader (SDK)

**Depends on:** Phase 0 (response shapes), Phase 3.

### Phase 5: Routes

**Depends on:** Phase 3 (Phase 4 for `/browse` and `/rebind`).

### Phase 6: The page — panel, view, editor

**Depends on:** Phase 5.

### Phase 7: Journeys

**Depends on:** Phase 6.

### Phase 8: Docs + regenerations

**Depends on:** everything above being committed (loc-summary reads tracked content).

---

## STEP-BY-STEP TASKS

Execute top to bottom. Keep build-checks green after every task.

### Task 0.1 — PROBE the Brilliant MCP read (owner-run)

- **IMPLEMENT**: A throwaway script in the scratchpad (never committed), a copy of `spike-c-sdk-reach.mjs` with
  `ALLOWED = ["mcp__brilliant__init", "mcp__brilliant__get_selection", "mcp__brilliant__lookup",
  "mcp__brilliant__export", "mcp__brilliant__list_projects"]` and a prompt that calls, in order: `init`,
  `list_projects`, `get_selection`, `lookup({scope: <selected ids>, format: "blueprint", expandInstances: true})`,
  `export({scope: <one id>, format: "png"})`, and one page-level `lookup` (no scope or the page id `init`
  names, `format: "summary"`). The owner selects spike C's instance `1db1b29957b949ca` in a Brilliant tab first.
  A second run with **no Brilliant tab open** records what `init` advertises when not reachable.
- **CAPTURE**: each call's `tool_input` and full `tool_response` (PostToolUse hook, uncapped) to
  `import/fixtures/brilliant-live/<nn>-<tool>.json`; the two `init` messages' `mcp_servers` and the
  `mcp__brilliant__*` names in `tools` to `import/fixtures/brilliant-live/init-{reachable,unreachable}.json`.
  Strip the PNG base64 to its first 64 chars plus its byte length (a fixture is data, not a picture).
- **DECIDES**: (a) the exact response field that carries the selected ids; (b) whether any response names the
  bound project (else the panel says "project: not exposed by this binding" — never a guess); (c) whether a
  page-level listing exists (else Browse ships as a refusal "this binding cannot list the page" and a tracker);
  (d) the export PNG block shape; (e) the unreachable signature (expected: the server connects and advertises
  no `get_selection`, because this session's own Brilliant MCP reported "Brilliant is not connected yet … then
  call tools/list again" and listed no tools — observed 2026-09-26).
- **VALIDATE**: `ls import/fixtures/brilliant-live/` shows the files; `node tooling/build-checks.mjs` 40.25
  (fixtures are data) still green.
- **SATISFIES**: AC #1 (live half, prerequisite).
- **REGENERATES**: none (import/fixtures matches no loc-summary group — 40.26).

### Task 1.1 — ADD `component.propose` to `system/canvas-ops.mjs`

- **IMPLEMENT**:
  - `OPS` gains `"component.propose"` (11 verbs). Rewrite the comment at :51-55: the four remaining are
    `component.propose` (#311, this ticket), `proposal.ratify` (#313), `group.define` / `group.place` (#315).
  - `PARAMS["component.propose"] = Object.freeze(["name", "recordId", "mode"])`, all required.
  - `applyOp`: add `next.proposals ??= [];` beside `notes`/`variants` (:199-200).
  - The case: `name` must match `PROPOSAL_NAME_RE = /^[a-z][a-z0-9-]{1,39}$/` (a component name; refused by
    name, never normalised — the `VARIANT_KEY_RE` rule); a second proposal with the same `name` is refused; a
    second proposal for the same `recordId` is refused ("one proposal per import record"); `recordId` must match
    `/^i[1-9][0-9]*$/`; `mode` must be `1` or `2`. Push
    `{ id: nextId("pr", new Set(next.proposals.map((x) => x.id))), name, recordId, mode, status: "proposed" }`.
    Header comment on the case: the applier cannot see the filesystem or the vocabulary; that `proposals/<name>/`
    exists and that `name` is not a vocabulary component are `import-run.mjs`'s checks (Task 3.4); `status`
    only ever changes through `proposal.ratify` (#313), which is why nothing here reaches the vocabulary.
- **PATTERN**: `variant.add` :384-404 (regex refusal, duplicate refusal, push).
- **GOTCHA**: `pr` not `p` — `p1` is a PART id in compositions (`screen.set`'s `partId`), and an op never
  carries the id it creates (no `id` slot in PARAMS).
- **GOTCHA (R3, the line budget)**: ≤ 30 net lines added to `system/canvas-ops.mjs`. The headroom before the
  rounded runtime figure moves is 35 lines (observed 2026-09-26). Put the reasoning in one tight case comment;
  the refusal messages carry the rest. Re-measure after the edit and after every merge of `origin/main`:
  `git add system/canvas-ops.mjs && node -e 'const{execFileSync:x}=require("child_process");const f=x("git",["ls-files"],{encoding:"utf8"}).split("\n").filter(p=>/^system\/(wc\/)?[^/]+\.(css|mjs|js)$/.test(p));let n=0;for(const p of f)n+=x("git",["show",":"+p],{encoding:"utf8",maxBuffer:1<<26}).split("\n").length;console.log(n,n<32450?"under — no approach regen":"OVER — Task 8.3 regen applies")'`
  → `32414 under` today (observed); expected ≤ 32444 after the edit.
- **VALIDATE**: `node -e 'import("./system/canvas-ops.mjs").then(({applyOps})=>console.log(JSON.stringify(applyOps([{op:"component.propose",params:{name:"spike-list-row",recordId:"i1",mode:1}}]).proposals)))'`
  → `[{"id":"pr1","name":"spike-list-row","recordId":"i1","mode":1,"status":"proposed"}]` (expected).
- **SATISFIES**: AC #3.
- **REGENERATES**: `system/loc-summary.json` total → Task 8.3; approach baselines only if the budget is
  broken (R3).

### Task 1.2 — UPDATE group 35 in `tooling/build-checks.mjs`

- **IMPLEMENT**:
  - 35.1: `COPS.length === 11`; message "the same eleven verbs — #302's six, #306's four and #311's one".
  - 35.2 `VALID_FOR["component.propose"] = { name: "spike-list-row", recordId: "i1", mode: 1 }`.
  - New **35.12 component.propose**: (a) determinism — applying the VALID_FOR op to the same document twice
    gives deep-equal results and id `pr1`; a second op (other name, `i2`) mints `pr2`; (b) the refusals, each
    matched on what it names: bad name (`"Spike Row"`, `"x"`), duplicate name, duplicate `recordId`, `recordId`
    `"1"`, `mode: 3`, `mode: "1"`, an `id` key (PARAMS exactness); (c) **a proposal never reaches the vocabulary
    without #313**: the document after the op equals the document before it except `proposals` (deep compare
    of every other key), the ref's `status` is `"proposed"`, and `OPS` does not include `"proposal.ratify"` —
    with the message "#313 adds proposal.ratify and must move this assertion in the same PR"; (d) a document
    saved before #311 (no `proposals` key) folds (the `??=`).
  - Update the group 35 `group(...)` description string with one clause for 35.12.
- **PATTERN**: 35.4's `names(fn, ...must)` helper; the `fold` guard at 35.3.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "canvas ops"` → `✓` (expected).
- **REDDENS**: delete the duplicate-name check in the case → 35.12(b) reds naming "duplicate name"; change
  `status: "proposed"` to `"ratified"` → 35.12(c) reds; add `"proposal.ratify"` to OPS → 35.1 and 35.12(c) red.
- **SATISFIES**: AC #3.
- **REGENERATES**: none.

### Task 2.1 — FIX the #307 forward note: the type role reads the snapped or overridden ref

- **IMPLEMENT**:
  - MOVE `TYPE_TOKEN` from `import/snap-rules.mjs:75` into `import/recognise.mjs` (beside `TYPE_ROLE_PX` :144),
    and re-export it from snap-rules (`export { TYPE_TOKEN } from "./recognise.mjs";`) so every existing reader
    (snap-rules :101, build-checks :13565) is unchanged. recognise cannot import snap-rules: snap-rules already
    imports recognise's `TYPE_ROLE_PX` (:56), so the other direction is a cycle.
  - In the role branch (:248-251): if `node.text.size.ref` is a value of `TYPE_TOKEN`, the role is that key
    (inverse lookup); otherwise `nearestRole(node.text.size?.value)` as today. Comment: a snap or an owner
    override writes `ref`, and the record and the output must agree (#307 plan, forward note).
- **GOTCHA**: bound Brilliant refs are `$font.size.md`, not `--type-*`, so the spike C fixture keeps its answer.
- **VALIDATE**: `node import/regen-expected.mjs && git status --porcelain import/` → empty (expected: both
  expected verdicts unchanged); `node tooling/regen-import-records.mjs --check` → `no drift` (expected).
- **SATISFIES**: AC #1 (the editor's snap edit must change the output, Task 3.5).
- **REGENERATES**: `import/fixtures/*.expected.json` and `import/fixtures/records/*` only if the checks above
  report drift — if they do, stop and read the diff: it means a committed fixture text node carried a `--type-*`
  ref, and the change is real.

### Task 2.2 — ADD 42.13: a 4-value pad with mixed bound and unbound sides (#457 F2)

- **IMPLEMENT**: Build an IR node by hand through `import/ir.mjs`'s `node()` / `tok()` with
  `layout.pad = [tok(8, "--spacing-sm"), tok(13, null), tok(16, "--spacing-md"), tok(7, null)]`, a `dir`, and
  no gap; run it through the `stack` builder path (the same entry 42.11 uses for its synthetic unbound gap).
  Assert exactly ONE `layout.pad` drop row of kind `no-token`, `value === "sm,13px,md,7px"`, and that the
  reason names both raw values. This fixes today's behaviour as the contract the review described.
- **PATTERN**: 42.11 "the converter carrying a synthetic unbound gap and stackShape refusing to emit it unsnapped".
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep import-record` → `✓` (expected).
- **REDDENS**: in `stackShape` (:498) map bound sides to `null` instead of their step → value becomes
  `"null,13px,null,7px"` and 42.13 reds naming the value.
- **SATISFIES**: the #457 F2 deferral checkbox on #311.
- **REGENERATES**: none.

### Task 2.3 — ADD 40.27: both converters, one spacing rule (#461 F2)

- **IMPLEMENT**: Bound: `import/figma.mjs` `convert` over `import/fixtures/figma/spike-list-row.export.json`
  gives `selection[0]`'s gap `{ value: 16, ref: "--spacing-md" }` (observed 2026-09-26); a synthetic one-line
  blueprint whose root carries `al(h,y(c),g(16:$spacing.md),pad(16:$spacing.md))` through
  `import/brilliant.mjs` `convert` must give the same `layout.gap` tok and the same `layout.pad[0]`. Unbound: the
  same two with the binding removed (Figma: delete `boundVariables.itemSpacing`, `itemSpacing: 13`; blueprint:
  `g(13)`) must both give `{ value: 13, ref: null }`. Deep-compare the two toks each time.
- **PATTERN**: 40.19 (Figma determinism by path); build the synthetic blueprint the way 42.11 builds its
  unbound-gap line.
- **GOTCHA**: the Brilliant fixture's own gap is `$spacing.xs` (4), not 16 (observed) — do not reuse it here.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep import-chain` → `✓` (expected).
- **REDDENS**: in `import/figma.mjs` :227 bypass `mapSpacing` (return `{ value, ref }` raw) → the bound compare
  reds naming `$spacing`/`--spacing-md`.
- **SATISFIES**: the #461 F2 deferral checkbox on #311.
- **REGENERATES**: none.

### Task 2.4 — ADD 42.14: the type role follows the snapped ref

- **IMPLEMENT**: A text node with `size: tok(14, null)` snaps `proposed` toward caption; with an override
  `{ path, slot: "text.size", ref: "--type-body" }` through `snap(ir, targets, overrides)`, `recognise` + `build`
  of a `text` verdict emit `role: "body"`; without the override, `role: "caption"`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep import-record` → `✓` (expected).
- **REDDENS**: revert Task 2.1's branch → the overridden case emits `caption` and 42.14 reds.
- **SATISFIES**: AC #1 (a snap edit changes the view).
- **REGENERATES**: none.

### Task 3.1 — CREATE `portal/lib/import-run.mjs`: header, constants, the fence

- **IMPLEMENT**:
  - Header: governing docs (epic #295 ticket #311; architecture § Boundaries "The import is a recorded run";
    this plan). State the invariants: statically SDK-free and zod-free (group 43.1 imports it in CI); nothing it
    writes is outside the build root (43.6); the record and transcript are written before any response; the
    drafts are the importer's output, never an agent's; fidelity on a live run is `missing`, never a pass.
  - Imports: node built-ins; `../../import/{brilliant,figma,snap-rules,recognise,report,ir}.mjs`;
    `../../system/wcag.mjs` (`checkPairs`), `../../system/derive.rules.mjs` (`RULESET`);
    `./canvas-store.mjs` (`saveConflict`, `saveRun`, `loadBuild`, `positionsOf`, `loadDecisions`);
    `./builder.mjs` (`withRunLock`); `./env.mjs` (`REPO_DIR`, `JOBS_DIR`).
  - `export const READ_TOOLS = Object.freeze(["mcp__brilliant__get_selection", "mcp__brilliant__lookup",
    "mcp__brilliant__export"])` and `REBIND_TOOLS = Object.freeze(["mcp__brilliant__init"])` (plus
    `mcp__brilliant__list_projects` in whichever list Phase 0 shows it is needed).
  - `export const FENCE_SITES = Object.freeze(["PreToolUse", "canUseTool"])`.
  - `export function importFenceDecision(tool, allowed)` → `{ allow, reason }`: allow iff `allowed` is an array
    containing `tool`; otherwise deny with a reason naming the tool and the allowed list ("an import run reads
    Brilliant and nothing else — Write, Edit, Bash, WebSearch and WebFetch are closed"). Junk → deny.
  - `export const deniedLine = ({ tool, input, error, via }) => ({ type: "denied", ts, tool, input, error, via })`,
    refusing a `via` outside `FENCE_SITES`.
  - `export function importFenceHooks({ allowed, write })` and `export function importCanUseTool({ allowed, write })`
    — one private `site()` that wraps the decision in try/catch (a throw denies), and swallows a `write`
    failure (a recording bug must not alter the run). Both take `{ allowed, mainTools = [], write }`.
    **THE RECORD GATE, discovery's (#343/#349, discovery.mjs:380-455):** a deny writes a `denied` line only when
    the tool is an `mcp__` name or is in `mainTools` (the run's advertised `tools`). Under `tools: []` the CLI's
    warmup subagents still call built-ins (Read, Glob), and recording those would log receipts the import agent
    never earned — the false-receipt class two discovery tickets removed. Every other tool is DENIED silently.
- **PATTERN**: `portal/lib/discovery.mjs` :402-536 (mirror, do not import: `allowsToolName` and `denyReason` are
  discovery-specific).
- **VALIDATE**: from the worktree root, BEFORE `cd portal && npm ci` (wt-311 has no `portal/node_modules` —
  observed): `node -e 'import("./portal/lib/import-run.mjs").then(m=>console.log(Object.keys(m).join(" ")))'`
  prints the exports (expected). A resolution error for the SDK means a static import slipped in; 43.1 is the
  standing proof.
- **SATISFIES**: AC #2 (fence).
- **REGENERATES**: none (`portal/` matches no runtime group).

### Task 3.2 — ADD the reach classifier

- **IMPLEMENT**: `export function classifyReach(init)` over the SDK `init` message:
  - brilliant absent from `mcp_servers`, or its `status !== "connected"` → `{ kind: "not-running", message:
    "The Brilliant MCP server did not start (<status>).", action: { label: "Check it runs", hint: "npx -y
    @brilliant-hq/mcp" } }`;
  - connected but `mcp__brilliant__get_selection` absent from `init.tools` → `{ kind: "not-reachable", message:
    "Brilliant is not reachable — no workspace is open.", action: { label: "Open Brilliant, then import again",
    href: "https://brilliant.design" } }` (the exact signature is Phase 0 (e));
  - else `null`.
  `export function classifyRead({ failures, selection, timedOut, project })`:
  - `timedOut` or a failure whose error matches `/time(d)?\s*out/i` → `{ kind: "stale-binding", message:
    project ? `Bound to project ${project} — it did not answer.` : "The binding did not answer.", action:
    { label: "Re-bind", route: "rebind" } }` (memory: a stale binding presents as 120 s timeouts, not an error);
  - empty selection → `{ kind: "nothing-selected", message: "Nothing is selected in Brilliant.", action:
    { label: "Select a component, then Import selection" } }`;
  - else `null`.
  Every refusal carries exactly one `action`. No retry anywhere (G29).
- **VALIDATE**: 43.3 (expected).
- **SATISFIES**: AC #1 (second journey's refusal).
- **REGENERATES**: none.

### Task 3.3 — ADD `sniffDrop` and the pipeline

- **IMPLEMENT**:
  - `export const MAX_DROP_BYTES = 8 * 1024 * 1024`.
  - `export function sniffDrop(bytes, filename)` → `{ tool: "figma" | "brilliant", text }`: UTF-8 decode; if it
    parses as JSON, hand it to `figma.readExport` (which already refuses a REST read, a token export and a
    wrong format by name — let those messages through); otherwise treat it as a blueprint and let
    `brilliant.convert` refuse. Empty → refused ("the dropped file is empty").
  - `export function runPipeline({ text, tool, mode, mapping, overrides, vocab, contract, packTokens })` →
    `{ ir, verdict, buildDrops, compositions, snaps }`, in this order (regen-import-records.mjs:76-83):
    `convert` (brilliant or figma, `{ mode, grain: "component" }`) → `snap(converted, targetsFrom(contract),
    overrides)` → `recognise(ir, vocab)` → `applyMapping(verdict, mapping)` → `build` ONCE PER TOP-LEVEL CHILD
    (never per node — it recurses) → `renameParts(compositions, mapping)`.
  - `export function applyMapping(verdict, mapping)` → a new verdict tree: for each `mapping.parts[path]`,
    `map: "<vocab name>"` sets `covered: true, name` on the verdict at `path`; `drop: true` sets
    `covered: false`; an unknown `path` throws naming it. `renameParts` sets the built node's `id` to
    `mapping.parts[path].name` (validated `/^[a-z][a-z0-9-]{0,31}$/`).
  - `export function mappingDropRows(mapping)` → one `{ class: "read-then-dropped", role: path, literal: null,
    why: "dropped by the owner in the mapping editor" }` per dropped part — `checkRecord` refuses a record whose
    mapping drops lack a class (report.mjs:76-86).
  - `export function recordFor({ id, source, pipe, mapping, packTokens, mode, attribution, elapsedMs })` →
    `buildRecord({ id, source, ir: pipe.ir, recognition: { verdict: pipe.verdict, buildDrops: pipe.buildDrops },
    mapping: { map: "parts", pack: "tokens.neutral.css", roles: {}, parts: mapping.parts, drops:
    mappingDropRows(mapping) }, fidelity: { wcag }, provenance: { mode, licence: null, attribution }, elapsed:
    { recognition: elapsedMs, ratify: null } })` where `wcag` is `checkPairs(packTokens, RULESET.wcagPairs)`
    folded to `{ pass, total, failing }` exactly as regen-import-records.mjs:88-99. No `deltaEMin`, so
    `fidelityVerdict` answers `missing` — the point.
  - `export function unboundCount(records)` → `{ unbound, total }` over a build's records (`source.bound === false`).
- **GOTCHA**: the pack's colour tokens resolve through `var()` chains — lift `parseCss` from
  regen-import-records.mjs:46-58 into this module (tooling/ is not importable from the portal by convention).
- **VALIDATE**: 43.5 (expected).
- **SATISFIES**: AC #1 ("the same record shape" for both sources), AC #4.
- **REGENERATES**: none.

### Task 3.4 — ADD the drafts, the names, the writer

- **IMPLEMENT**:
  - `export function nextImportId(buildRoot)` → lowest free `i<n>` over `imports/*.json`.
  - `export function proposalName(ir, { taken, vocabNames })` → kebab slug of the first top-level node's
    `component.name ?? name` (e.g. "Spike List Row" → `spike-list-row`), falling back to `import`; if it is a
    vocabulary name or taken, the lowest free `-2`, `-3` suffix. Result satisfies `PROPOSAL_NAME_RE` (import it
    from canvas-ops — export the regex there in Task 1.1).
  - `export function draftProposal({ name, record, compositions })` → `{ "spec.md", "block.css",
    "template.txt" }`, deterministic strings. Each opens with a line saying it was drafted by
    `portal/lib/import-run.mjs` from import record `<id>`, not by an agent, and that props, states, behaviour
    and the accessibility model are the owner's at ratify (#313). `spec.md`: the head the kb-format expects with
    `name`, the provenance (tool, element ids, mode) and empty Props/States/Behaviour/Accessibility sections.
    `block.css`: the standard header `/* ---------- <name> (proposal <name>, import <id>) ---------- */` and one
    root rule whose declarations are the contract tokens the root node carries (`var(--spacing-md)`); no
    literal, ever. `template.txt`: the built compositions as JSON, two-space indent.
  - `export function writeImport(buildRoot, { id, record, transcript, source, name, mapping, drafts, reference })`:
    writes `imports/<id>.json` (canonical sorted JSON like regen-import-records.mjs's `sortKeys`),
    `imports/<id>.md` (`projectRecord`), `imports/<id>.transcript.jsonl`, optional
    `imports/<id>.reference.png`, and `proposals/<name>/{spec.md, block.css, template.txt, source.json,
    mapping.json}` with `mapping.json` = `{ record: id, parts: {} }` on first write. **Every target is resolved and
    refused unless it lies under `buildRoot + sep`** (a `name` of `../../system/x` is refused by name). Order:
    transcript, source, record json, record md, drafts, mapping — so a crash leaves the read on disk first.
- **VALIDATE**: 43.6 (expected).
- **SATISFIES**: AC #1, AC #4.
- **REGENERATES**: none.

### Task 3.5 — ADD the mapping editor's back end

- **IMPLEMENT**: `export function editMapping({ pkgRoot, provenance, name, edit, vocab, contract, packTokens })`
  where `edit` is exactly one of `{ path, rename }`, `{ path, map }` (a `BUILDERS` name — the editor offers only
  those; a name with no builder would be refused by `build` anyway), `{ path, drop: true | false }`, or
  `{ path, slot, ref }` (a snap). Steps: read `proposals/<name>/mapping.json` + `source.json`; apply the edit to
  `mapping.parts[path]` (or, for a snap, merge `{path, slot, ref}` into the override file); re-run
  `runPipeline` from `source.json`'s text; `recordFor` with the SAME id and the ORIGINAL
  `elapsed.recognition` (read from the existing record — an edit is not a new recognition); rewrite record
  json + md + the three drafts + mapping.json through `writeImport`'s guarded writer; return `importView`.
  - The override directory by the ROOT's provenance — the `provenance` the route resolved the package with
    (`resolveRunRoot`), never run.json's declared value: the journey's scratch copy declares `fictional` and is
    stored under the scratch `JOBS_DIR`, and reading the declaration would write into the repo. State this in
    the module header. Fictional root → `import/overrides/`; real root →
    `<JOBS_DIR>/_import-overrides/` (a real designer's file hash is not committed; the architecture's open
    question, answered for now and stated in the header). The override file is
    `{ source: sourceHash(bytes), snaps: [...] }` exactly per `import/overrides/README.md`.
  - An edit naming an unknown `path` or a `ref` outside the slot's family throws naming it (snap-rules'
    `applyOverrides` already refuses the ref — let it).
- **GOTCHA**: never patch the record; `checkRecord` recomputes drops from `mapping` and refuses a mismatch.
- **VALIDATE**: 43.7 (expected).
- **SATISFIES**: AC #1 ("edit one mapping → the file changes and the view re-renders").
- **REGENERATES**: none (43.7 writes to a scratch dir; never to `import/overrides/`).

### Task 3.6 — ADD `runImport`, `importView`

- **IMPLEMENT**:
  - `export async function runImport({ pkgRoot, base, entrance, ids, file, mode = 1, reader = readBrilliant })`:
    1. `withRunLock(async () => { … })` — the WHOLE run, drops included (they write files).
    2. `saveConflict(buildRoot, base)` → throw with that message BEFORE the reader is called (no tokens spent on
       a stale page).
    3. Read: `entrance === "drop"` → `sniffDrop(file.bytes, file.name)`, transcript = one `meta` line
       `{ type: "meta", entrance: "drop", file: name, bytes, sha256 }`; `"selection"` or `"ids"` → `await
       reader({ ids })` → `{ refused } | { text, calls, project, reference, transcript }`. A refusal returns
       `{ refused }` and writes nothing (no record for a read that did not happen).
    4. `t0` → `runPipeline` → `elapsedMs`.
    5. Ids, name, drafts, `writeImport`.
    6. Append the op with `saveRun(pkgRoot, { base: <current ledger length, re-read>, ops: [{ op:
       "component.propose", params: { name, recordId: id, mode }, status: "applied" }], positions:
       positionsOf(loadBuild(buildRoot).canvas), decisions: loadDecisions(pkgRoot) })`. Source is `owner`
       (saveRun hardcodes it): the owner's click caused it and the program wrote it deterministically; the agent
       only relayed the read. State this in the comment.
    7. Return `{ name, recordId: id, count, view: importView(...) }`.
  - `export function importView(pkgRoot, name)` → `{ name, record, md, compositions, reference: <data URI or
    null>, outline, mapping, unbound: unboundCount(...), label }` where `outline` is the IR as a list of
    `{ path, kind, name, text }` rows (the "original" pane when no PNG exists) and `label` states mode, source,
    "drafted by the importer, not by an agent" and "fidelity: missing — not measured, never a pass" when it is.
- **VALIDATE**: 43.8 (expected).
- **SATISFIES**: AC #1, AC #2 (lock).
- **REGENERATES**: none.

### Task 3.7 — CREATE group 43 "import run" in `tooling/build-checks.mjs`

- **IMPLEMENT** (`// --- 43 · the recorded import (#311) ---`, placed after group 42, inside the same
  top-level-await block style as 42):
  - **43.1 SDK-free**: import the module (CI has no `portal/node_modules`; the import succeeding IS the proof).
    Source pin over the DECOMMENTED text: no static `@anthropic-ai/claude-agent-sdk` or `zod` import; exactly
    one `await import("@anthropic-ai/claude-agent-sdk")`, inside `readBrilliant`; the query options block
    contains `strictMcpConfig: true`, `tools: []`, `allowedTools: []`, and both `canUseTool:` and `hooks:` built
    from the same `allowed` variable.
  - **43.2 the fence**: `importFenceDecision` over READ_TOOLS (allow), `Write`, `Edit`, `Bash`, `WebSearch`,
    `WebFetch`, `Read`, `mcp__brilliant__create_modify_elements`, `mcp__brilliant__execute_commands`, `undefined`
    (deny). Drive `importFenceHooks({ allowed: READ_TOOLS, mainTools: ["Write"], write }).PreToolUse[0].hooks[0]({ tool_name:
    "Write", tool_input: { file_path: "system/x.css", content: "x" } })` → `permissionDecision: "deny"` and ONE
    `denied` line with `via: "PreToolUse"`, `tool: "Write"`; the same through `importCanUseTool` → `behavior:
    "deny"`, `via: "canUseTool"`; the record gate both ways — `Write` with NO `mainTools` is denied and writes
    NOTHING (a warmup call), `mcp__brilliant__create_modify_elements` with no `mainTools` is denied and writes
    one line; a predicate forced to throw (pass a hostile `allowed` whose `includes` getter
    throws) DENIES; a `write` that throws leaves the denial intact.
  - **43.3 reach**: `classifyReach` over synthetic init messages for all three branches (+ junk); `classifyRead`
    over timeout, "timed out" failure, empty selection, a clean read; every refusal has exactly one `action`.
  - **43.4 the drop sniff**: the committed Figma export → `figma`; the committed spike C blueprint → `brilliant`;
    a REST-read JSON (`{"document":{}}`), a token JSON, and an empty buffer → refused naming why.
  - **43.5 the pipeline, both sources**: run the Brilliant fixture and the Figma fixture through `runPipeline` +
    `recordFor` → both pass `checkRecord`; their record KEY SETS are equal at the top level and under
    `source`, `fidelity`, `provenance`, `elapsed` (AC #1's "the same record shape"); `fidelity.verdict ===
    "missing"` and `fidelity.wcag.total > 0` for both; `projectRecord` output contains "missing".
    **AC #1b's own pair**: the SAME blueprint text (Phase 0's captured `lookup` response once it exists, spike
    C's blueprint until then) through `runImport` twice in two scratch packages — once via an injected reader
    (`entrance: "selection"`), once dropped — gives equal record key sets and deep-equal `ir`, `recognition`,
    `drops`, `snaps` and `unbound`; only `source.file`, the transcript and `elapsed.recognition` may differ.
  - **43.6 the writer**: `writeImport` into a scratch build root → exactly the expected file set; a `name` of
    `../../system/x` and an `id` of `../x` refused BEFORE any write (scratch dir still empty); bytes of
    `handoff/verdant/vocabulary.json` and a `git status --porcelain -- system handoff` snapshot unchanged after
    the case.
  - **43.7 the mapping editor**: in a scratch package holding one import: a rename changes `template.txt`'s part
    id; a remap `text` → `stack` changes the composition's name; a drop adds exactly one `read-then-dropped`
    row and the record still passes `checkRecord`; a snap edit writes the override file named by
    `sourceHash(source text)` into the scratch override dir with the right `{path, slot, ref}` and the snapped
    composition changes (uses Task 2.1's fix); an unknown path and a cross-family ref are refused; the record's
    `elapsed.recognition` is unchanged by an edit.
  - **43.8 runImport**: with an injected `reader` stub over the spike C blueprint in a scratch package copied
    from `discovery/faster-payment/`: the run writes record + md + transcript + proposal and appends ONE
    ledger line `{ source: "owner", op: "component.propose", status: "applied" }`, and the folded doc has
    `proposals[0].id === "pr1"`; **the order** ("record and transcript before anything is shown"): a second
    package whose reader stub deletes `build/canvas.json` during its call makes the op append throw
    (`arrangement` has no position for f1) — `runImport` rejects, and `imports/i1.json`, `.md` and
    `.transcript.jsonl` are on disk anyway, which only holds if they were written before the append; **the lock**: start one
    `runImport` whose reader awaits a promise, start a second → it throws a message containing
    `"already in flight"`, resolve the first → it returns; **the stale page**: `base` one short → throws the
    `saveConflict` message and the reader's call count is 0; a `{ refused }` reader writes nothing.
  - **43.9 names**: `proposalName` over "Spike List Row", a taken name, a vocabulary name (`list-row`), and junk.
  - **43.10 unboundCount** over three synthetic records.
  - The `group("import run", …)` description ends with what it cannot reach: whether the SDK half BEHAVES
    (CI has no SDK; the Phase 0 probe and the live journey are the observation), whether Brilliant's response
    shapes stay as Phase 0 captured them, whether a draft is any good (a human read at #313), and pixels
    (the portal has no baseline).
  - Change the pass line (:13580) `all 42 groups pass` → `all 43 groups pass`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 43 groups pass` (expected).
- **REDDENS**: (43.1) add `import { query } from '@anthropic-ai/claude-agent-sdk';` at the top → CI import
  fails and 43.1 names the static import; (43.2) make `importFenceDecision` return allow for `Write` → 43.2 reds
  naming Write; (43.6) remove the under-root guard → the traversal name writes outside scratch and 43.6 reds;
  (43.7) make `mappingDropRows` return `[]` → `checkRecord` throws and 43.7 names the drop row; (43.8) move the
  `saveConflict` check after the reader → the call count is 1 and 43.8 reds.
- **SATISFIES**: AC #2, AC #3, AC #4, AC #1 (the record shape half).
- **REGENERATES**: the group count in four places (drift-check leg 7) → Task 8.1.

### Task 4.1 — ADD `readBrilliant` (the live reader)

- **IMPLEMENT**: `export async function readBrilliant({ ids = null, timeoutMs = Number(process.env.UXF_IMPORT_TIMEOUT_MS) || 150_000 })`:
  - `const { query } = await import("@anthropic-ai/claude-agent-sdk");` — the ONLY SDK reference.
  - `export function brilliantServer(env = process.env)` → `JSON.parse(env.UXF_BRILLIANT_MCP)` if set (the
    journey's hook for a down or hanging server), else spike C's config verbatim.
  - `query({ prompt, options: { cwd: REPO_DIR, model: IMPORT_MODEL, maxTurns: 6, systemPrompt, tools: [],
    allowedTools: [], mcpServers: { brilliant: brilliantServer() }, strictMcpConfig: true, abortController,
    canUseTool: importCanUseTool({ allowed: READ_TOOLS, write }), hooks: { ...importFenceHooks({ allowed:
    READ_TOOLS, write }), PostToolUse: [capture], PostToolUseFailure: [captureFailure] } } })`.
    `IMPORT_MODEL = "claude-sonnet-5"` (spike C's; a relay needs reliability more than it needs a cheaper model).
  - The prompt names the exact calls Phase 0 settled (`get_selection`, then `lookup` with the selected ids,
    `format: "blueprint"`, `expandInstances: true`, then `export` PNG of the root id) and says to reply "done"
    and nothing else. With `ids` given (Browse), it skips `get_selection`.
  - On `init`: `classifyReach(msg)` → if a refusal, `abortController.abort()` and return `{ refused }` (expected:
    no model call has happened yet, so nothing is spent — confirm in Task 7.2 from the transcript's result line).
  - The capture hook stores each call's full `tool_response` (never capped) in `calls[]`. It interprets
    NOTHING: `export function parseBrilliantCalls(calls)` → `{ ids, text, project, reference, listing }` is the
    ONE place that knows Brilliant's response shapes (R1), pure, and driven in CI by **43.11** over every
    `import/fixtures/brilliant-live/` capture (each field asserted; a capture with no `lookup` text answers
    `text: null`, which `classifyRead` turns into "the read carried no blueprint"). REDDENS: change the field
    it reads the selected ids from → 43.11 names the capture file.
  - A timer at `timeoutMs` aborts and sets `timedOut`. After the loop: `classifyRead(...)` → `{ refused }` or
    `{ text, calls, project, reference, transcript }`. The transcript lines: `meta` (entrance, model, allowed
    tools, mcp status), one `tool` line per call `{ tool, input, ok, bytes, sha256 }` (the response itself lives
    in `source.json`, not twice), every `denied` line, `text` lines, and `result` `{ ok, costUsd, numTurns,
    durationMs }`. Check `is_error` on the result, not only `subtype` (memory: an error result can wear
    `subtype: "success"`).
- **GOTCHA**: `cwd: REPO_DIR` puts `.mcp.json`'s servers in reach — `strictMcpConfig: true` is what keeps the run's
  MCP surface to Brilliant alone (discovery-transport.mjs :233-238). `undefined`, never `null`, for unset options.
- **VALIDATE**: 43.1 source pin (CI); `cd portal && UXF_BRILLIANT_MCP='{"type":"stdio","command":"node","args":["-e","process.exit(1)"]}' node -e 'import("./lib/import-run.mjs").then(m=>m.readBrilliant({})).then(r=>console.log(JSON.stringify(r.refused)))'`
  → a `not-running` refusal (expected; needs `cd portal && npm ci` and the CLI login).
- **SATISFIES**: AC #1, AC #2.
- **REGENERATES**: none.

### Task 4.2 — ADD `rebind` and `browse`

- **IMPLEMENT**: `export async function rebind()` — the same query shape with `allowed: REBIND_TOOLS`, returns the
  bound project (Phase 0 (b)) or `{ refused }`. `export async function browse({ refresh = false })` — Phase 0 (c)'s
  listing call plus `export` PNG thumbnails for at most `BROWSE_MAX = 12` elements, cached in a module-level
  `Map` keyed by the bound project (or `"unnamed"`) for the life of the server process; `refresh` clears it. If
  Phase 0 found no listing call, `browse` returns `{ refused: { kind: "cannot-list", message: "This Brilliant
  binding cannot list the page's elements.", action: { label: "Use Import selection" } } }` and a tracker is
  opened — do not invent a call.
- **VALIDATE**: owner-run in Task 7.3.
- **SATISFIES**: AC #1 (Browse is the ticket's second entrance).
- **REGENERATES**: none.

### Task 5.1 — ADD the routes to `portal/server.mjs`

- **IMPLEMENT** (after the three canvas routes, each resolving the root with `resolveRunRoot` +
  `assertProvenanceRoot` like them, every body field NAMED, never spread):
  - `POST /api/canvas/import` `{ provenance, slug, base, entrance: "selection" | "ids", ids, mode }` →
    `runImport(...)` → 200 `{ name, recordId, count, view }` or 200 `{ refused }`. A stale page → **409**: the
    route calls `saveConflict` BEFORE `runImport`, as `/api/canvas/save` does (:421-428); the in-lock check stays
    as the second line (a throw there reaches the catch-all as 500, which is why the route checks first). Same
    for the drop route.
  - `POST /api/canvas/import/drop?provenance=&slug=&base=&mode=&name=` — the raw body STREAMED with a
    `MAX_DROP_BYTES` cap (mirror `receiveExport`, portal/lib/figma.mjs :43-80; never `readBody`, whose 1 MB cap
    stays), then `runImport({ entrance: "drop", file: { name, bytes } })`.
  - `GET /api/canvas/import/view?provenance=&slug=&name=` → `importView`.
  - `POST /api/canvas/import/mapping` `{ provenance, slug, name, edit }` → `editMapping` → the new view.
  - `POST /api/canvas/import/rebind` and `GET /api/canvas/import/browse?refresh=` → Task 4.2.
  All state-changing routes sit behind the existing origin guard (it runs before routing, for every method).
- **VALIDATE**: boot on a private port and hit the view route: `cd portal && PORT=4799 JOBS_DIR=$(mktemp -d) node server.mjs & sleep 2; curl -s 'localhost:4799/api/canvas/import/view?provenance=fictional&slug=faster-payment&name=x'`
  → `{"error": …}` naming the missing proposal (expected); kill by PID.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### Task 6.1 — CREATE `portal/public/canvas-import.mjs` and wire it into the canvas page

- **IMPLEMENT**:
  - `canvas.html`: a toolbar button `data-canvas-verb="import"` ("Import"), and an
    `<aside class="cv-import" data-import-panel hidden>` beside `cv-rail`; load `/canvas-import.mjs` as a module.
    The page-scoped `[hidden]{display:none!important}` rule (memory: `hidden` is defeated by an author
    `display`) goes in `portal.css` scoped to `.cv-import`.
  - The panel: the binding line ("Reads: <project>" or "project: not exposed by this binding"), **Import
    selection** (primary, default focus), **Browse the page**, a mode choice (1 "joins the system" · 2 "frozen
    original"), a `role="alert"` refusal area showing `message` and ONE action button, and beneath it the drop
    zone (`<input type="file">` + drag/drop) labelled "Drop a Brilliant blueprint export or a Figma house-plugin
    export".
  - After an import: `history.replaceState` to `?provenance&slug&import=<name>` and `location.reload()` — the
    page's undo history starts after the import, so the page's next undo can never target the server's line
    (foldLedger's last-in-first-out rule would refuse it) and `base` is fresh. On load with `?import=`, open the
    view.
  - The view: two columns, "Original" (the reference PNG as `<img alt>`, else the outline rows as a list) and
    "Mapped" (each composition through `renderComposition` with the page's vocabulary; a null composition shows
    "not emitted — see drops"); the label line; drops grouped by `class` in E1's three classes with counts;
    the fidelity block (verdict word, "missing — not measured, never a pass" when missing, WCAG pass/total); the
    unbound count.
  - The mapping editor: one row per outline path — rename (text input), remap (`<select>` of `BUILDERS` names
    + "drop"), and per snap row a `<select>` of the family's contract tokens; each change POSTs one `edit` to
    `/api/canvas/import/mapping` and re-renders the view from the response. Every string via `textContent`.
  - `canvas.mjs` `describeOp`: `case "component.propose": return `proposed ${p.name} from import ${p.recordId}``.
  - `portal.css`: `.cv-import*` styles, token-only, 44×44 targets.
- **PATTERN**: canvas.mjs `el()` :39-48 (copy into the new module; do not export from canvas.mjs, which is a page
  module with side effects). `renderComposition(vocab, composition, bus)` is `system/agentic-renderer.mjs:707`;
  a node's `id` is emitted as `data-part` (:150-155), so a renamed part is visible in the DOM — assert on it in
  Task 7.1 step 4 when the edit is a rename.
- **VALIDATE**: Task 7.1 (the journey).
- **SATISFIES**: AC #1.
- **REGENERATES**: none (the portal is not in the VR set).

### Task 7.1 — EXTEND `tooling/canvas-journey.mjs`: the drop journey and the refusal (AC #1 second journey)

- **IMPLEMENT**: spawn the portal child with `UXF_BRILLIANT_MCP='{"type":"stdio","command":"node","args":["-e","process.exit(1)"]}'`
  and `UXF_IMPORT_TIMEOUT_MS=8000` in its env. New `importPass(engine)` on the scratch copy of the spine (the
  driver already copies packages into its scratch `JOBS_DIR`):
  1. Open the run → Import → Import selection → the refusal names "did not start" with ONE action button; zero
     new files under the scratch `build/imports/`.
  2. Drop `import/fixtures/spike-c-instance.blueprint.txt` → the view opens after a reload; `imports/i1.json`,
     `.md`, `.transcript.jsonl` and `proposals/<name>/` (five files) exist on disk; the record passes
     `checkRecord`; the ledger's last line is `component.propose`.
  3. Drop `import/fixtures/figma/spike-list-row.export.json` → `i2`; its record's key set equals `i1`'s
     ("the same record shape").
  4. Edit one mapping (drop a part) → `mapping.json` on disk changed, the drop list in the view grew by one,
     `imports/i1.json` re-derived and still passes `checkRecord`.
  5. **The lock**: re-spawn with `UXF_BRILLIANT_MCP` pointing at a server that never answers
     (`["-e","setInterval(()=>{},1e9)"]`), fire Import selection, and while it is pending POST a drop → the second
     response names "already in flight"; after the first resolves (timeout → refusal), a drop succeeds.
  6. `git status --porcelain -- system/ handoff/ discovery/ import/overrides/` in the worktree is unchanged
     across the pass (AC #4).
  Update the header's WHAT IT PROVES and WHAT IT CANNOT REACH (the live read, unless `--live-brilliant`).
- **VALIDATE**: `(cd portal && npm ci) && node tooling/canvas-journey.mjs all` → `canvas-journey ✓` (expected).
- **REDDENS**: point step 2 at a `.png` file → the refusal names the file and no record exists, proving the leg
  reads the page rather than the disk; remove `withRunLock` from `runImport` → step 5 reds.
- **SATISFIES**: AC #1 (second journey), AC #2 (lock), AC #4.
- **REGENERATES**: none.

### Task 7.2 — CONFIRM the refusal spends nothing

- **IMPLEMENT**: `readBrilliant`'s refusal carries `costUsd` — the `result` line's `total_cost_usd` if one
  arrived, else `null`. Step 1 of 7.1 asserts `refused.costUsd === null` in the route's JSON. If a model call
  DID happen before `init`, record the observed cost in the report and move the classification earlier; do
  not paper over it.
- **VALIDATE**: in the journey output (expected: `costUsd: null`, because the abort precedes any model call).
- **SATISFIES**: the plan's cost claim.
- **REGENERATES**: none.

### Task 7.3 — ADD the live leg (owner-run, `--live-brilliant`, chromium only)

- **IMPLEMENT**: with no `UXF_BRILLIANT_MCP` override: the owner selects spike C's instance in Brilliant; the leg
  runs Import selection → record + proposal on disk → the side-by-side view shows a PNG in "Original" → edits
  one mapping → the file changes and the view re-renders (AC #1 first journey). Then Browse → at most 12
  thumbnails, multi-select two → both hand ids to the same converter.
- **VALIDATE**: `node tooling/canvas-journey.mjs chromium --live-brilliant` → `✓` (owner's hand, paid).
- **SATISFIES**: AC #1 (first journey).
- **REGENERATES**: none.

### Task 7.4 — OPTIONAL paid fence probe

- **IMPLEMENT**: `node portal/lib/import-run.mjs --probe-fence` (a CLI guard at the bottom): one run advertising
  `tools: ["Write"]` with the prompt "write the file /tmp/uxf-probe.txt" → the transcript shows a `denied` line
  for Write at `PreToolUse` and the file does not exist.
- **VALIDATE**: owner-run, ~$0.05.
- **SATISFIES**: AC #2's run-time observation (CI's 43.2 is the blocking proof).
- **REGENERATES**: none.

### Task 8.1 — UPDATE the group count and gates.md

- **IMPLEMENT**: `42` → `43` in `CLAUDE.md` (:135 `43 PURE groups`, :212 `build-checks' 43 groups`) and
  `.claude/references/gates.md` :11 (`43 pure groups`). Add a **Group 43** entry to gates.md in the house voice
  (what it drives, what it cannot reach — the same clauses as the group string), extend the Group 35, 40 and 42
  entries by one sentence each (35.12, 40.27, 42.13–42.14), and extend the `canvas-journey.mjs` entry with
  `importPass` and `--live-brilliant`.
- **GOTCHA**: memory "gate prose has three copies" — the group() string, gates.md, and any fixture header. Grep
  all three for each "cannot reach" clause you write.
- **VALIDATE**: `node tooling/drift-check.mjs | tail -1` → `✓ … group-count` (observed passing today at 42).
- **SATISFIES**: CI `verify`.
- **REGENERATES**: n/a (this IS the regeneration).

### Task 8.2 — UPDATE docs

- **IMPLEMENT**:
  - `discovery/README.md` :509-520: `proposals/<name>/` and `imports/<id>.*` lose "LATER"; document the file
    set, `mapping.json`'s shape (`{ record, parts: { <ir path>: { name?, map?, drop? } } }`), the transcript's
    four line types, `component.propose`'s line, and that the drafts are the importer's.
  - `CLAUDE.md` architecture map: after `lib/canvas-store.mjs` add
    `lib/import-run.mjs  the RECORDED IMPORT — Brilliant read (lazy SDK) or a dropped file → record + proposal`;
    :104 and :163 name `canvas-import.mjs` beside `canvas.mjs` as part of the one module page.
  - `import/overrides/README.md`: the real-provenance override directory (`<JOBS_DIR>/_import-overrides/`).
- **VALIDATE**: `node tooling/drift-check.mjs` green.
- **SATISFIES**: CLAUDE.md "Where new code goes" discipline.
- **REGENERATES**: none.

### Task 8.3 — REGENERATE loc-summary, and the approach baselines ONLY if the runtime figure moved

- **IMPLEMENT**: after everything is committed: `node agent-layer/gen-loc-summary.mjs` and
  `git diff system/loc-summary.json`. The total moves (the portal files are counted) — commit that. Under R3's
  budget `runtime.linesApprox` stays 32,400 and no PNG changes (expected). If it moved anyway (a merge from
  `origin/main` spent the headroom), regenerate all three approach baselines from a CLEAN
  DETACHED worktree under `/Users` (not `/private/tmp`), with the `rm` INSIDE the docker `sh -c` after `npm ci`:
  `cd tooling/visual-regression && docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && rm -f baselines/approach-*.png && npx playwright test --update-snapshots --workers=1'`,
  then copy the three PNGs back. Commit loc-summary + PNGs together.
- **GOTCHA**: memories "loc-summary baseline cascade", "loc-summary counts tracked only", "VR gate reads the
  working tree", "VR update skips sub-perceptual" — gen-loc reads COMMITTED content; the `rm` is needed for an
  edit, not only a new file; merge `origin/main` first if the branch is behind, then regenerate.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` on the committed tree → `no drift`;
  `git status --porcelain tooling/visual-regression/baselines/` shows exactly the three approach PNGs (or none if
  the runtime figure did not move — then say so in the report).
- **SATISFIES**: CI `verify` and `visual`.
- **REGENERATES**: `system/loc-summary.json`, `tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png`.

---

## TESTING STRATEGY

No suite (CLAUDE.md § Testing). The gates are build-checks (CI), the drift checks and the journey drivers.

### Unit Tests

Group 43 (new, 10 cases) drives every pure export of `import-run.mjs` with committed fixtures and scratch
directories. Group 35 gains 35.12; group 40 gains 40.27; group 42 gains 42.13–42.14.

### Integration Tests

`tooling/canvas-journey.mjs` `importPass` on three engines (drop, refusal, edit, lock, no system/ writes), plus
the owner-run `--live-brilliant` leg.

### Edge Cases

- A stale page (`base` behind the ledger) → 409 before any spend.
- A second import during a run → "already in flight".
- The same source imported twice → `i2` and a `-2` name; one proposal per record.
- A proposal name equal to a vocabulary component → suffixed, never shadowing.
- A dropped REST read / token export / PNG / empty file → refused naming why, nothing written.
- A mapping edit naming an unknown path or a cross-family ref → refused, files untouched.
- A read whose `lookup` returns no text → refused ("the read carried no blueprint"), no record.
- A Brilliant timeout → stale-binding refusal with Re-bind; never retried.

### Proving the checks

Each check-adding task above names its REDDENS mutation. Run each once before trusting the green; record the
observed failure line in the report. The positive controls: 43.2's allowed tools must pass (a fence that denies
everything is also "denying Write"); 43.5's records must pass `checkRecord` (a case that only asserts refusals
proves nothing about the happy path); 43.8's first run must succeed after the lock refusal.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

- `node --check portal/lib/import-run.mjs && node --check portal/public/canvas-import.mjs`
- `node tooling/drift-check.mjs` (syntax-checks every tracked `.mjs`; group-count leg)
- `node tooling/token-lint.mjs` (observed today: `63 contract tokens · 0 undeclared · 0 orphan`)

### Level 2: Unit Tests

- `node tooling/build-checks.mjs` → `build ✓  all 43 groups pass` (observed today: 42/42 after
  `cd tooling/icons && npm ci`)
- `node tooling/regen-import-records.mjs --check` (observed today: `no drift`)
- `node import/regen-expected.mjs && git status --porcelain import/` (observed today: no change — this script has
  no `--check`; it rewrites, and a clean status is the check)

### Level 3: Integration Tests

- `(cd portal && npm ci) && node tooling/canvas-journey.mjs all`

### Level 4: Manual Validation

- Portal smoke on a private port (memory: port-scoped kill only): `cd portal && PORT=4799 node server.mjs &`,
  `curl -s localhost:4799/api/health` → `stale:false`; open
  `http://localhost:4799/canvas.html?provenance=fictional&slug=faster-payment`, press Import with Brilliant closed
  → the refusal. Kill by PID. Do not import into the committed spine in the repo; the journey uses a scratch copy.

### Level 5: Additional Validation

- `node tooling/canvas-journey.mjs chromium --live-brilliant` (owner).
- CodeQL runs in CI (#387); a new file-write path and a streamed upload are the likely alert sites — the
  under-root guard and the byte cap are the mitigations.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Task 0.1 — the Brilliant probe (Brilliant open, spike C's instance selected; then again with no tab) | ~$0.20–0.50 | **Yes** for Tasks 4.1–4.2 and the live leg; no for the rest | Report the live half as not built; open "import-run: the live reader" |
| Task 7.3 — the live journey leg (Import selection + Browse, 12 thumbnails) | ~$0.20 per import + ~$0.30–0.60 per Browse | Yes for AC #1's first journey | Report AC #1 first journey as not met, name the tracker |
| Task 7.4 — the fence probe advertising Write | ~$0.05 | No (43.2 is the blocking proof) | Note in the report's Not run |
| Task 8.3 — docker VR regen of approach ×3 | none (local docker) | Yes if `runtime.linesApprox` moved | — |
| Two trackers (live fidelity; Mode 2 exhibit) | none | Yes — open before the PR, link from it | — |

---

## ACCEPTANCE CRITERIA

- [ ] AC #1a — bound source → selection → record + proposal on disk → side-by-side view → edit one mapping →
      the file changes and the view re-renders (Task 7.3, owner-run).
- [ ] AC #1b — MCP down → the refusal with its one action → the same file dropped → the same record shape
      (Task 7.1 steps 1–3; 43.5).
- [ ] AC #2 — the fence denies `Write` on an import run with a `denied` line (43.2; optional probe 7.4);
      `withRunLock` refuses a second request during a run (43.8; journey step 5).
- [ ] AC #3 — `component.propose` in the canvas-ops group: malformed throws, the id is deterministic, and a
      proposal never reaches the vocabulary without #313 (35.12).
- [ ] AC #4 — nothing under `system/` is written by this path (43.6's guard; journey step 6).
- [ ] The #457 F2 and #461 F2 deferral checkboxes on #311 ticked (42.13, 40.27).
- [ ] The #307 forward note closed (Task 2.1, 42.14).
- [ ] build-checks 43/43, drift-check, token-lint green; loc-summary and approach baselines current.
- [ ] Two trackers opened and linked from the PR; `Closes #311` in the PR body.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] Every REDDENS mutation run once and its failure line recorded
- [ ] All validation commands executed successfully
- [ ] Journey green on three engines; live leg run or reported as not run with its tracker
- [ ] Acceptance criteria all met or named as not met
- [ ] Plan, report and review in the same PR

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (Phase 0 decides)** — the shape of `get_selection`, where the bound project's name appears, and whether a
  page listing exists. The plan states the fallback for each; none is guessed.
- **A1** — `init` precedes any model call, so a refusal classified at `init` spends nothing (expected; Task 7.2
  checks it).
- **A2** — the op line's `source` is `owner`. The owner's click caused it and the importer wrote it; the agent only
  relayed the read. If the owner reads that differently, the change is one field in `saveRun`'s call site
  (which hardcodes owner) and a new canvas-store writer — flag, don't do.
- **A3** — real-provenance snap overrides live in `<JOBS_DIR>/_import-overrides/`. The architecture leaves this
  open (§ Open questions); this is the minimal answer and it is stated in the module header.
- **A4** — one import = one component-grain record + one proposal. A selection of several elements becomes one
  record with several top-level children, one proposal.
- **Confidence** — 9/10 for everything that runs on committed fixtures (Phases 1–3, 5–8, the drop journey).
  The live reader (Phase 4, Task 7.3) is conditional on Phase 0: it is written against response shapes nobody
  has observed, and each has a stated fallback rather than a guess.
- **A5** — size: ~2,000 lines against the ticket's 1,000–1,500 estimate. The overage is group 43 and the journey
  leg; the product code is inside the estimate.

## NOTES (open canvas)

### Owner calls taken at planning (2026-09-26)

| Call | Taken | Consequence here |
|---|---|---|
| Who drafts spec/css/template | the importer, deterministically | Task 3.4; no second paid leg, no tool to fence |
| Live fidelity | `missing` + WCAG + tracker | Task 3.3; the view says "missing — never a pass" |
| Mode 2 exhibit | deferred | `mode` recorded; no `canvas.json` change; group 36 untouched |
| The two deferrals | included | Tasks 2.2, 2.3 |

### Pre-flight (run 2026-09-26, in wt-311 at `cfceeaf`)

| Check | Ran | Result | Changed in the plan |
|---|---|---|---|
| build-checks on main | `node tooling/build-checks.mjs` | 41/42 — 41.7 red: `tooling/icons` not installed in this fresh worktree; after `npm ci` there, **42/42** (observed) | Gotcha in Level 2 |
| drift-check | `node tooling/drift-check.mjs` | red until `cd tooling/style-dictionary && npm ci`; then ✓ incl. **group-count** (observed) | Found leg 7 pins the count in FOUR places → Task 8.1 |
| token-lint | `node tooling/token-lint.mjs` | ✓ 63 tokens (observed) | — |
| records / expected verdicts | `regen-import-records --check`; `regen-expected` + `git status` | no drift; no change (observed). `regen-expected` has NO `--check` flag | Level 2 wording |
| loc-summary | `gen-loc-summary --check` | no drift; runtime group 32,400 (observed) | Task 8.3 |
| the two converters on spacing | scratch script over both fixtures | Figma fixture gap `{16, --spacing-md}`; Brilliant `SPACING.spacing-md = 16`; the Brilliant fixture's own gap is `$spacing.xs` (4) (observed) | Task 2.3 uses a synthetic 16 line, not the fixture |
| the lock | read builder.mjs :241-247, build-checks :2071-2097 | SDK-free; message contains "already in flight", which group 8 matches (observed) | Reuse, don't copy |
| the op fold | canvas-store :113-133, :309-336 | `proposed` lines are skipped by the fold; `saveRun` hardcodes owner + applied/undone (observed) | `component.propose` is `applied`, appended through `saveRun` |
| undo after a server write | studio-verbs :697-744 | no reset API on the verbs; history is per mount (observed) | the page reloads after an import (Task 6.1) |
| SDK options | typings in the primary tree's `portal/node_modules` (0.1.77) | `abortController`, `strictMcpConfig`, `interrupt()` present (observed) | Task 4.1 |
| unreachable signature | this session's Brilliant MCP | "Brilliant is not connected yet … then call tools/list again", no tools listed (observed) | `classifyReach`'s second branch; Phase 0 (e) confirms |
| canvas-ops roster pin | build-checks 35.1 | `COPS.length === 10` (observed) | Task 1.2 |
| #307's forward note | recognise.mjs :248-251 | the role reads `text.size.value`; `TYPE_TOKEN` lives in snap-rules, which imports recognise (observed) | Task 2.1 moves `TYPE_TOKEN` to break the cycle |

### Rejected alternatives

- **A direct MCP client in Node** (no agent in the loop): needs `@modelcontextprotocol/sdk`, a new portal
  dependency. The SDK is already the portal's MCP client, so the agent relays and the hooks capture.
- **Reading through `recordRun`**: it caps a response at 4,000 chars; the blueprint and PNG must be verbatim.
- **A separate `import-transport.mjs`** (discovery's split): the ticket names one module and
  `record-composition.mjs`'s lazy import already keeps one file CI-importable.
- **Resetting the page's undo stack in place**: no API exists on the verbs, and adding one to a shipped module
  for an operator page is the wrong trade; a reload after an import is honest and free.
- **Re-deriving only the changed part on a mapping edit**: `checkRecord` recomputes drops from the whole mapping,
  so a partial patch is refused by design. The pipeline is milliseconds; re-run it.

### Traps carried in (from memories and references)

Stale `serve.mjs`/portal on nearby ports serving another tree (verify `/api/health` `bootSha` = this HEAD);
port-scoped kills only; SDK error results wearing `subtype: "success"`; a fresh worktree needs `npm ci` in
`portal/`, `tooling/icons/`, `tooling/style-dictionary/`, `tooling/visual-regression/`; the loc/approach cascade;
shared worktree — verify the branch before every commit and stage by explicit path.

## AMENDMENTS

- 2026-09-26 — risks addressed before implementation (owner asked): added § RISKS AND MITIGATIONS. R1: shape
  knowledge isolated in `parseBrilliantCalls` + 43.11 (PR B). R3: measured 35 lines of runtime headroom
  (32,414 vs 32,450); Task 1.1 budgeted at ≤ 30 net lines with a re-measure command, Task 8.3 made
  conditional. R4: split into PR A (drop path, `Part of #311`) and PR B (live read, `Closes #311`). Advisor
  fixes folded in the same day: the fence's record gate (43.2 both directions), AC #1b's same-text pair in
  43.5, overrides routed by the ROOT's provenance, 409 checked in the route before `runImport`.

- 2026-09-26 (implementation, PR A) — **plan error: PR A needed part of Task 4.1.** R4 put the reader in PR B, but
  43.1 pins `await import(sdk)` inside `readBrilliant`, and journey steps 1 and 5 plus Task 7.2 all go through it.
  PR A therefore ships a REACH-ONLY `readBrilliant`: the lazy SDK import, the fenced query, `classifyReach` on the
  init message, a timeout armed before the first await (→ stale-binding), the abort and `costUsd`. When reach
  succeeds it refuses by name (`live-read-not-built`, "drop an exported file instead") instead of guessing a
  response shape. `parseBrilliantCalls`, 43.11, rebind and browse stay in PR B. Two further corrections found by
  running the code: `brilliant.convert` reads ANY text as a tree (a PNG and "hello world" both converted), so
  `sniffDrop` refuses binary and requires 16-hex element ids; and a blueprint cannot carry an unbound text size
  (`t()` reads a size only as `n:$font.size.*`), so 43.7's snap edit runs on a SYNTHETIC unbound Figma export.
  `renameParts` became a one-line hook in `recognise.build` (`verdict.partId` → the node's `id`), because the built
  tree does not carry IR paths. Task 8.3: loc-summary does NOT count the portal (three groups — runtime, pages,
  generators), so "the total moves" was wrong; nothing regenerated. Task 6.1: `portal.css` already carries a
  page-wide `[hidden] { display: none !important; }` (:61), so no scoped rule was added. Task 7.2's `costUsd === null`
  cannot fail on the reach path (the reader aborts on init, so no `result` message arrives); zero spend stays
  EXPECTED under A1 and the journey's label says so.
