# Feature: import-run PR B — the live Brilliant read over a direct stdio client, Browse, the binding line (#311)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before
you start implementing. Pay special attention to naming of existing utils, types and models. Import from the
right files.

**This is PR B of #311. PR A (#462, merged as `ce74378`) shipped the drop path, the op, the view and the
mapping editor.** Its plan, `.claude/plans/import-run-recorded-import-311.md`, stays the record of every
decision PR A took; this plan inherits them and does not re-plan them. Read that plan's § Out of Scope,
§ RISKS R1–R4 and § AMENDMENTS before starting.

**Worktree:** cut a fresh one from `origin/main` — `git worktree add -b feat/import-run-live-read-311
/Users/Berzins/Desktop/Linards_current/wt-311b origin/main` — and run `npm ci` in `portal/`, `tooling/icons/`,
`tooling/style-dictionary/` and `tooling/visual-regression/`. The primary tree (`ux-factory`) is a shared
worktree on another branch and 19+ commits behind: never implement there. Every path below is relative to the
new worktree.

## Feature Description

"Import selection" on the canvas page does not work today. PR A's `readBrilliant` classifies REACH and then
refuses with `live-read-not-built`, because nobody had observed what Brilliant's MCP returns. The Phase 0
probe ran on 2026-09-27 (captures in `.claude/plans/import-run-live-read-311-probe/`, $0.279 total), and it
changed the design. The Brilliant MCP is a local stdio router that needs no model at all: a ~60-line Node
JSON-RPC client using built-ins only talks to it directly, for $0 per import, and sees things the Agent
SDK hides — the bridge's own "pair this tab" error, the bound project in `_meta.brilliant`, and a tool list
that can be read AFTER pairing instead of being frozen at `init`.

**The owner chose the direct stdio client over the SDK relay (2026-09-27)**, amending
`docs/epics/canvas-design-import.architecture.md:186-189,208`. PR B therefore:

- adds `portal/lib/brilliant-mcp.mjs` — the stdio JSON-RPC client and the ONE place that knows Brilliant's
  wire shapes (the pure parsers PR A's R1 asked for);
- rewrites `readBrilliant` in `portal/lib/import-run.mjs` on it, removes the SDK entirely from the import path,
  and moves the fence from two SDK sites to one client site;
- adds the binding line (which project the read reaches) with a "Check binding" / "Re-bind" action, and
  "Browse the page" (top-level elements with thumbnails, multi-select, cached per session);
- fixes a converter bug the probe exposed (`spans[...]` lines read as elements);
- adds a fake bridge (`tooling/fake-brilliant-bridge.mjs`) replaying the committed captures, so CI and the
  journey drive the real client end to end, and a free owner-run `--live-brilliant` journey leg.

## User Story

As the owner, with a Brilliant tab open and a component selected
I want to press "Import selection" (or browse the page and pick elements) and get the import record, the
proposal and the side-by-side view, with a clear line saying which project the read reaches
So that a real design reaches the canvas through import at no model cost, and when it cannot, the refusal
tells me the one thing to do (pair the tab, re-bind, or drop a file).

## Problem Statement

1. The live read is not built (`portal/lib/import-run.mjs:160-164`, `LIVE_READ_NOT_BUILT`).
2. Through the SDK, an unpaired tab is indistinguishable from "no workspace open": init takes ~62 s and
   advertises zero Brilliant tools (observed, `probe/down/init-unreachable.json`), and PR A's
   `classifyReach` then says "no workspace is open", which is false when the tab is open but unpaired.
3. The SDK strips `_meta` from `tool_response` (observed, `probe/sdk/02-get_selection.json`), so the panel's
   binding line can never name the project — it is hard-coded "project not exposed by this binding"
   (`portal/public/canvas-import.mjs:112`).
4. The stale-binding refusal's action `{ route: "rebind" }` (`import-run.mjs:150-151`) has no handler:
   `showRefusal` (`canvas-import.mjs:53-64`) falls through to `dropInput.focus()`.
5. No Browse entrance exists.
6. `import/brilliant.mjs` `parseTree` reads a `spans[(0,3,#CFD5E1)]` styled-range line as a child ELEMENT,
   putting the literal into `source.ids` and a phantom child frame into the IR (observed over
   `probe/raw/20-lookup.json`). The selection path never runs `sniffDrop`'s 16-hex id check, so this lands
   in a record.

## Solution Statement

```
page (canvas-import.mjs) ── POST /api/canvas/import {entrance: selection|ids}
                          ── POST /api/canvas/import/binding          (Check binding / Re-bind)
                          ── GET  /api/canvas/import/browse?refresh=   (Browse the page)
server.mjs ── runImport(reader = readBrilliant) · bindingStatus() · browse()
import-run.mjs ── readBrilliant: openBridge → tools/list → init → get_selection → lookup → export
brilliant-mcp.mjs ── openBridge({server | streams}) : JSON-RPC over stdio, the fence at call()
                  ── parseInit · parseSelection · parseLookup · parseExport · bindingOf · classifyBridge
@brilliant-hq/mcp (npx) ── leader bridge ── the paired brilliant.design tab
tooling/fake-brilliant-bridge.mjs ── the same protocol from import/fixtures/brilliant-live/ (CI + journey)
```

One process per import, as the SDK did: a fresh helper binds to the most-recently-active tab on its first
`tools/*` (PROTOCOL.md § 5), so "re-bind" is a fresh session after the owner focuses the right tab — no
persistent client, no state to go stale in the portal.

## Out of Scope / Non-Goals

- **Not included: any model call on the import path.** The SDK leaves `import-run.mjs` completely. Jev
  suggestions (#455) are untouched — they run after recognition, through `import-suggest.mjs`.
- **Not included: pairing automation.** The owner pairs the tab by hand (browser permission + Connect). The
  refusal says how; nothing clicks for them. The pairing steps (Brave's "apps on device" included) go into
  the refusal text and three lines of `discovery/README.md` § imports (Task 8.2). No new runbook file.
- **Not included: a persistent bridge connection or a retry loop.** One read per click (G29: no silent retry).
- **Not included: `rectangle` → its own IR kind.** The probe's rectangle reads as `kind: "frame"` (observed);
  recognition of drawn shapes is not this ticket's. Recorded in NOTES.
- **Not included: live ΔE fidelity (#474) and the Mode 2 exhibit (#475).** Both opened 2026-09-27.
- **Not changing:** the drop path, the mapping editor, `component.propose`, the writer, `withRunLock`, the
  record shape, `canvas-store.mjs`, any committed fixture's converter output (Task 2.1 proves it).

## Feature Metadata

**Feature Type**: New Capability (+ one converter bug fix, + a transport change against the architecture)
**Estimated Complexity**: Medium-High
**Primary Systems Affected**: `portal/lib/` (new `brilliant-mcp.mjs`, `import-run.mjs`), `portal/server.mjs`,
`portal/public/canvas-import.mjs` + `portal.css`, `import/brilliant.mjs`, `tooling/build-checks.mjs` (groups
40, 43), `tooling/canvas-journey.mjs`, new `tooling/fake-brilliant-bridge.mjs`, new
`import/fixtures/brilliant-live/`, docs.
**Dependencies**: `@brilliant-hq/mcp` 0.1.8 run by `npx -y` (unchanged from PR A's `brilliantServer`). No new
dependency. The import path LOSES its SDK dependency.

## Related Work

**Implements**: #311 (PR B; `Closes #311`) · **Epic**: #295,
`docs/epics/canvas-design-import.architecture.md` (§ Boundaries "The import is a recorded run" — AMENDED here)

**Back-references**:
- `.claude/plans/import-run-recorded-import-311.md` — PR A; R1 (shape knowledge in one pure place), R4 (the
  split), Task 4.1/4.2/7.3 (superseded here), AMENDMENTS.
- `.claude/reports/import-run-recorded-import-311-report.md` — PR A's Not-run list, which is this plan's scope.
- `.claude/code-reviews/pr-462-review.md` — F1–F4 (all fixed in PR A; F1's `reload` action shape is reused).
- `.claude/plans/import-run-live-read-311-probe/README.md` — the Phase 0 captures and what each proves.

**Forward-references**: #474 (live ΔE — reads `imports/<id>.reference.png`, which this PR starts writing on a
live read), #475 (Mode 2 exhibit), #313 (ratify reads `proposals/<name>/`, unchanged), #316 (run 1 imports one
part live — the first real use).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `portal/lib/import-run.mjs` (631 lines) — the whole file. The header (:1-46) is the spec you amend.
  Fence :67-126 (`READ_TOOLS` :69, `REBIND_TOOLS` :70, `FENCE_SITES` :71, `importFenceDecision` :75,
  `deniedLine` :81, `site` :91, `importFenceHooks` :106, `importCanUseTool` :119). Reach :128-164
  (`classifyReach` :131, `classifyRead` :147, `LIVE_READ_NOT_BUILT` :160). `runImport` :472-533 (the
  selection branch :487-494 consumes `{ refused }` or `{ text, transcript, reference }` — keep that contract).
  `importView` :541-575 (already renders `reference.png` as a data URL). Reader :577-631 (`IMPORT_MODEL` :579,
  `brilliantServer` :581, prompts :586-587, `readBrilliant` :589).
- `portal/server.mjs` :35-38 (import + comment), :458-500 (the four import routes; mirror their root
  resolution: `resolveRunRoot` + `assertProvenanceRoot`, every body field NAMED).
- `portal/public/canvas-import.mjs` (235 lines) — `showRefusal` :53-64, `done` :66-73, `importSelection`
  :75-84, `buildPanel` :98-117 (binding line :112), `renderView` :180.
- `import/brilliant.mjs` :572-597 (`parseTree`), :451 (`readLine`), :602-620 (`convert`, `ids` derived from
  every node's `id`).
- `import/ir.mjs` :67 (`DROP_CLASS_OF` — reuse kind `unread-atom` → `never-read`; do NOT add a kind).
- `tooling/build-checks.mjs` :13700-13965 (group 43; 43.1 :13731-13747, 43.2 :13757-13785, 43.3 :13787-13799,
  43.8 :13898, group string :13961). :12953-12968 (40.25 fixtures are data: `.txt .json .png .md .css`).
  :12985 (40.27, the last group-40 case — 40.28 goes after it).
- `tooling/canvas-journey.mjs` :1-47 (header: WHAT IT PROVES / CANNOT REACH), :62-66 (arg parsing),
  :102-105 (`MCP_DOWN`, `MCP_HANG`), :113 (child env), :553-576 (I1), :633-656 (I5), :730 (final ✓ line).
- `.claude/references/gates.md` :78 (Group 43), :131 (`canvas-journey.mjs`).
- `discovery/README.md` :598-612 (the import transcript's line types).
- `docs/epics/canvas-design-import.architecture.md` :61, :186-189, :195-198, :208-213.
- `~/.npm/_npx/7cb76904d7713a80/node_modules/@brilliant-hq/mcp/PROTOCOL.md` §1 (stdio: newline-delimited
  JSON-RPC, stdout is JSON-RPC only, logs on stderr), §2 Disclosure (`_meta.brilliant`), § Fragment handoff,
  §5 (binding: first bind wins per agent session; most-recently-active tab).

### The probe captures (all observed 2026-09-27; `P = .claude/plans/import-run-live-read-311-probe`)

| File | What it shows |
|---|---|
| `P/raw/00-initialize-unconnected.json` | `initialize` answered locally, `instructions: "Brilliant is not connected yet…"`, no `_meta` |
| `P/raw/00-tools-list-unpaired.json` | `tools/list` unpaired → after ~46 s `error.code -32000`, `"No Brilliant surface is connected yet. A browser tab to brilliant.design should have opened — grant the one-time local-connection prompt and click Connect, or open the Brilliant desktop app. Then retry."` |
| `P/raw/00-tools-list.json` | 18 tools once paired; the input schemas of `get_selection`, `init`, `list_projects`, `lookup`, `export` |
| `P/raw/10-initialize-connected.json` | `initialize` relayed once paired (`serverInfo.version "1.0.0"`) |
| `P/raw/01-get_selection.json` | `get_selection {}` → JSON-RPC `error -32602 … Missing required property: canvasId` |
| `P/raw/18-init.json` | `init` text: `**sessionCanvasId:** \`playground\``, the design-system catalog, a depth-1 blueprint |
| `P/raw/12-get_selection.json` | `{canvasId,count:1,selectedIds:["630fe03901352c90"],blueprint:"630f… r p(…) … \"Rectangle 1\""}` + `_meta.brilliant {project:{handle:"",name:"",title:""}, tabId, viewOnly:false, surface:"web", otherTabs:[]}` |
| `P/raw/32-get_selection.json` | nothing selected: `{count:0, selectedIds:[], blueprint:""}` |
| `P/raw/42-get_selection.json` | two selected: `selectedIds` ×2, one blueprint joined by `\n`, including `  spans[(0,3,#CFD5E1)]` |
| `P/raw/19-lookup.json`, `43-lookup.json` | `lookup {scope:[ids], format:"blueprint", expandInstances:true}` → `{totalMatches,…,results:[{canvasId,elementIds,blueprint}]}` |
| `P/raw/13-lookup.json` | `lookup` with a non-element id in scope → `result.isError: true`, text `"Error in lookup: Invalid argument(s): Could not resolve scope item…"` |
| `P/raw/16-lookup.json` | `lookup {scope:["playground"], format:"summary"}` → the canvas's elements `{id,name,type[,text]}` (no `parentId` on top-level ones) |
| `P/raw/14-export.json` + `.full.b64` | `export {canvasId, ids, format:"png"}` → `[{type:"image", data, mimeType:"image/png"}, {type:"text", text:"element(s): <id> \| 790x402 \| 2155 bytes \| sha256:<hex>"}]` |
| `P/raw/15-export.json` + `.full.b64` | the same at `width: 160` → 160x81, 315 bytes (the thumbnail shape) |
| `P/raw/04-list_projects.json` | `{"projects":[]}` on the web editor (spike C saw the same) |
| `P/sdk/*` | through the SDK hook: content array only, `_meta` stripped, image reshaped to `{type, source:{data, media_type}}`; `isError` and -32602 arrive at `PostToolUseFailure` — why the SDK was dropped |

### New Files to Create

- `portal/lib/brilliant-mcp.mjs` — the stdio JSON-RPC client + Brilliant's wire shapes (pure parsers).
- `tooling/fake-brilliant-bridge.mjs` — a fake bridge serving the committed captures; exports `serve()`, and
  runs standalone over stdin/stdout for the journey.
- `import/fixtures/brilliant-live/*.json` — the committed captures (Task 1.1 lists them).

### Relevant Documentation

- The MCP stdio transport (newline-delimited JSON-RPC 2.0; `initialize` → `notifications/initialized` →
  `tools/list` / `tools/call`): https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#stdio
  and https://modelcontextprotocol.io/specification/2025-06-18/server/tools#calling-tools (`result.content[]`,
  `result.isError`). Why: the client implements exactly this, nothing more.
- `@brilliant-hq/mcp` PROTOCOL.md (local path above) — the router, pairing, `_meta.brilliant`, binding.

### Patterns to Follow

**Module header** — every file opens with a header citing its governing doc and its invariants (see
`import-run.mjs:1-46`). `brilliant-mcp.mjs`'s header states: what it is, INVARIANTS (built-ins only; the
fence at `call()`; stdout is JSON-RPC only so a non-JSON line is a protocol error, never data; every shape
it knows is pinned by a committed capture under `import/fixtures/brilliant-live/`), and "WHAT IT CANNOT KNOW"
(the pairing state until `tools/list` answers).

**Errors** — plain `Error`s naming the path (`import-run: …`, `brilliant-mcp: …`); a refusal the owner should
read is DATA `{ refused: { kind, message, action } }`, never a throw (`import-run.mjs:147-158` shape, one
action each).

**Injectable seams for CI** — `runImport`'s `reader` (`import-run.mjs:472`) and `overridesDir`; do the same:
`openBridge({ streams })` accepts `{ input, output }` streams so build-checks drives the client in process.

**Existing refusal wording kept** (journey I1 asserts it): not-running's message contains "did not start".

---

## IMPLEMENTATION PLAN

### Phase 1: The fixtures and the fake bridge
Commit the captures as data; build the fake that serves them. **Independent of:** Phase 2.

### Phase 2: The converter fix (`spans[…]`)
**Independent of:** Phase 1 (it reads a capture, so land Phase 1's files first or read from `P/raw/`).

### Phase 3: `brilliant-mcp.mjs` — client + parsers + classifier
**Depends on:** Phase 1 (43.11 reads the fixtures; the client tests drive the fake).

### Phase 4: `import-run.mjs` — the reader, the binding, Browse; the SDK removed
**Depends on:** Phase 3.

### Phase 5: Routes
**Depends on:** Phase 4.

### Phase 6: The panel
**Depends on:** Phase 5.

### Phase 7: Journeys (fake-bridge legs on three engines; `--live-brilliant` owner-run)
**Depends on:** Phase 6.

### Phase 8: Docs, the architecture amendment, the ticket's AC wording
**Depends on:** all above committed.

---

## STEP-BY-STEP TASKS

Execute top to bottom. Keep `node tooling/build-checks.mjs` green after every task (46/46 once
`tooling/icons` is installed — see Level 2).

### Task 1.1 — CREATE `import/fixtures/brilliant-live/` (the committed captures)

- **IMPLEMENT**: a scratch Node script (never committed) copies from `P/raw/` into
  `import/fixtures/brilliant-live/`, keeping each JSON-RPC reply VERBATIM and restoring the stripped PNG data
  from the sibling `.full.b64` (`reply.result.content[0].data = readFileSync(<n>.full.b64, "utf8")`):
  | committed name | from |
  |---|---|
  | `initialize-unpaired.json` | `00-initialize-unconnected.json` |
  | `tools-list-unpaired.json` | `00-tools-list-unpaired.json` (`.reply`) |
  | `initialize.json` | `10-initialize-connected.json` |
  | `tools-list.json` | `00-tools-list.json` — this file is a SUMMARY (names + five schemas), so the fake builds its `tools/list` reply from it: `{result:{tools: names.map(name => ({name, inputSchema: schemas[name] ?? {type:"object"}}))}}`. Say so in the README row. |
  | `init.json` | `18-init.json` (`.reply`) |
  | `get-selection-one.json` · `-none.json` · `-two.json` | `12-` · `32-` · `42-get_selection.json` (`.reply`) |
  | `get-selection-no-canvas.json` | `01-get_selection.json` (`.reply`, the -32602) |
  | `lookup-blueprint-one.json` · `-two.json` | `19-` · `43-lookup.json` (`.reply`) |
  | `lookup-unresolved.json` | `13-lookup.json` (`.reply`, `isError: true`) |
  | `lookup-page.json` | `16-lookup.json` (`.reply`) |
  | `export-png.json` · `export-thumb.json` | `14-` · `15-export.json` (`.reply`, data restored) |
  | `list-projects.json` | `04-list_projects.json` (`.reply`) |
  Plus `README.md` (allowed by 40.25): provenance (2026-09-27, `@brilliant-hq/mcp` 0.1.8, raw stdio client, an
  unbound scratch `playground` canvas, a raw #000000 rectangle and a "Pay" text), "verbatim; never hand-edited;
  a Brilliant change is a re-capture", and one line per file.
- **GOTCHA**: 40.25 allows `.txt .json .png .md .css` only — no `.b64`, no `.mjs`. Do not copy the probe
  scripts. Keep `tabId`/`mcp:` session strings as captured (verbatim rule); they are not secrets.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "import-chain|✗"` → `import-chain ✓` (40.25 walks
  `git ls-files`, so `git add` the directory first). `node -e 'for (const f of require("fs").readdirSync("import/fixtures/brilliant-live")) if (f.endsWith(".json")) JSON.parse(require("fs").readFileSync("import/fixtures/brilliant-live/"+f))'` → silent.
- **SATISFIES**: AC #1 (prerequisite), R1 of PR A.
- **REGENERATES**: none (import/ matches no loc-summary group — 40.26; observed `GROUPS` in
  `agent-layer/gen-loc-summary.mjs:22-26` are `system/`, root/proto pages, `agent-layer/`).

### Task 1.2 — CREATE `tooling/fake-brilliant-bridge.mjs`

- **IMPLEMENT**: header (hand-written canon; what it is: the Brilliant bridge's stdio protocol answered from
  `import/fixtures/brilliant-live/`, for build-checks group 43 and `canvas-journey`; WHAT IT CANNOT REACH: the
  real router, pairing, the browser). `export function serve({ input, output, mode = "paired", log = null })`:
  reads newline-delimited JSON-RPC from `input`, writes replies to `output` (one line each; a notification
  gets no line). `log(msg)` receives every inbound message (43.2 asserts on it). Modes:
  - `paired` — `initialize` → `initialize.json`'s result (with the request's `id`); `tools/list` →
    built from `tools-list.json`; `tools/call` by `params.name`: `init` → `init.json`; `get_selection` →
    `get-selection-one.json` if `arguments.canvasId`, else `get-selection-no-canvas.json`; `lookup` with
    `format:"blueprint"` → `lookup-blueprint-one.json` for one id, `-two.json` for two; with a scope equal to
    the canvas id → `lookup-page.json`; `export` → `export-thumb.json` when `arguments.width`, else
    `export-png.json`; `list_projects` → `list-projects.json`; anything else → a -32601 error.
  - `unpaired` — `initialize` → `initialize-unpaired.json`; `tools/list` → `tools-list-unpaired.json`'s
    error (immediately — the real ~46 s wait is not simulated; say so in the header).
  - `none-selected`, `two-selected` — `paired` with `get_selection` answered from `-none` / `-two`.
  - `hang-call` — `paired`, but `tools/call` never answers.
  - `hang-init` — never answers anything.
  - `exit` — ends `output` at once (in process) / `process.exit(1)` (standalone).
  Standalone guard (`import.meta.url` vs `process.argv[1]`, the repo's standard guard — use `pathToFileURL`,
  memory: import.meta.url percent-encodes): `serve({ input: process.stdin, output: process.stdout, mode:
  process.argv[2] })`, and `process.stdin.on("end", () => process.exit(0))` so a killed parent never leaves an
  orphan (PR A's report: its first hanging fake orphaned).
- **PATTERN**: the reply envelope is `{ jsonrpc: "2.0", id, result | error }`, exactly as captured.
- **VALIDATE**: `printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_selection","arguments":{"canvasId":"playground"}}}' | node tooling/fake-brilliant-bridge.mjs paired` → two lines, the second carrying `selectedIds":["630fe03901352c90"]` (expected).
- **SATISFIES**: AC #1 (the fake-bridge journey), AC #2 (43.2 drives it).
- **REGENERATES**: none (`tooling/` is in no loc-summary group).

### Task 2.1 — FIX `import/brilliant.mjs` `parseTree`: an indented non-element line is an annotation, not a node

- **IMPLEMENT**: in `parseTree` (:572-597), after the `#` comment skip and the indent checks: when
  `depth > 0` and the line's first atom is not a Brilliant element id (`/^[0-9a-f]{16}$/` — the same rule
  `sniffDrop` uses, `import-run.mjs:207-208`), it is an ANNOTATION of `stack[depth - 1]` (the node it is
  indented under). Do not create a node; push onto that parent's `drops` one row built through `ir.drop()`
  with kind `unread-atom` (→ `never-read`, `import/ir.mjs:67`), `slot` = the annotation head (the text before
  the first `[` or `(`, e.g. `spans`), `value` = the trimmed line, `reason` = `` `annotation line "${head}" has no reader — read but not understood` ``.
  Do NOT touch `stack` for an annotation (the next element line's depth arithmetic must be unaffected).
  A depth-0 non-id line keeps today's behaviour (out of scope; note it in the header comment as known).
  Add the rule to the file header's list of what `parseTree` skips, citing #311 PR B and the capture.
- **GOTCHA**: read how `readLine`'s drops are shaped before building the row (`ir.drop()` derives `class`;
  check its signature in `import/ir.mjs`). The committed fixtures carry NO annotation lines (observed:
  `grep -v -E '^\s*([0-9a-f]{16} |#|lookup )' import/fixtures/spike-c-*.blueprint.txt` → empty), so
  `regen-expected` and the committed records must NOT move.
- **VALIDATE**: `node import/regen-expected.mjs && git status --porcelain import/fixtures` → empty (expected);
  `node tooling/regen-import-records.mjs --check` → `no drift` (expected).
- **SATISFIES**: the record's honesty (`source.ids` carries only real element ids).
- **REGENERATES**: none expected — the two commands above prove it.

### Task 2.2 — ADD 40.28 to group 40: the live blueprint's annotation line

- **IMPLEMENT**: after 40.27 (:12985). Read `import/fixtures/brilliant-live/lookup-blueprint-two.json`, take
  `JSON.parse(reply.result.content[0].text).results[0].blueprint`, `convert()` it. Assert: `source.ids` deep-
  equals `["630fe03901352c90","36cc06ddb7e3a767"]`; the text node (`children[1]`) has `children.length === 0`;
  its drops include exactly one `never-read` row whose `slot === "spans"` and whose `value` contains
  `spans[(0,3,#CFD5E1)]`. Positive control first: the same text with the annotation line REMOVED converts to
  the same two ids and zero `spans` rows (so the check is reading the right node). Extend group 40's string by
  one clause.
- **REDDENS**: delete the new branch in `parseTree` → 40.28 fails naming `source.ids` with the third entry
  `spans[(0,3,#CFD5E1)]`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep import-chain` → `✓` (expected).
- **SATISFIES**: the converter fix is gated.
- **REGENERATES**: none.

### Task 3.1 — CREATE `portal/lib/brilliant-mcp.mjs`: the client

- **IMPLEMENT**:
  - `export const TOOLS = Object.freeze(["init", "get_selection", "lookup", "export"])` — the read allow-list,
    BARE MCP names (the `mcp__brilliant__` prefix was the SDK's).
  - `export function openBridge({ server = brilliantServer(), streams = null, allowed = TOOLS, decide, onDeny = null })`
    → `{ request(method, params), call(name, args), close(), exited }`. THE ONE SIGNATURE — Tasks 4.1, 4.2 and
    4.3 call it exactly so, always passing `decide: importFenceDecision`. A missing `decide` is a programming
    error: `openBridge` throws `brilliant-mcp: openBridge needs decide` at construction (never a silent
    deny-everything at call time). With `streams` (the CI
    seam) it uses `{ input, output }` (it writes to `input`, reads `output`); else it `spawn`s
    `server.command`/`server.args` with `stdio: ["pipe","pipe","pipe"]` and `env: { ...process.env,
    ...server.env }`, and drains stderr (never parsed — PROTOCOL §1 says logs go there).
    `request` writes one JSON line with a fresh id and resolves on the matching reply; a stdout line that is
    not JSON rejects every pending request with `brilliant-mcp: stdout carried a non-JSON line` (protocol
    error). Stream end / process exit rejects pending requests with `{ exited: code }`.
  - `call(name, args)` is THE FENCE SITE: `decide(name, allowed)` (injected — `import-run.mjs`'s
    `importFenceDecision`, so there is still ONE predicate) runs FIRST; a denial calls
    `onDeny({ tool: name, input: args, reason })` (the caller turns that into
    `deniedLine({ …, via: "client" })` — `deniedLine` stays in `import-run.mjs`, so no import cycle) and
    resolves `{ denied: reason }` WITHOUT writing to the bridge. A throwing `decide` denies (fail closed, PR
    A's rule); a throwing `onDeny` is swallowed and the denial stands (PR A's "a recording bug must not alter
    the run").
  - `close()` ends stdin and kills the child by its own handle (never by name or port — memory
    `portal-smoke-port-scoped-kill`).
  - `export function brilliantServer(env = process.env)` — MOVED here from `import-run.mjs:581-584`
    unchanged (`UXF_BRILLIANT_MCP` JSON, else `npx -y @brilliant-hq/mcp`). `import-run.mjs` re-exports it only
    if something imports it from there (grep; today only the file itself).
- **GOTCHA**: imports are node built-ins ONLY (`node:child_process`, `node:crypto`). No SDK, no
  `@modelcontextprotocol/sdk`, no zod — 43.1 asserts it. State the `decide`/`onDeny` split in both headers.
- **VALIDATE**: `node -e 'import("./portal/lib/brilliant-mcp.mjs").then(m=>console.log(Object.keys(m).sort().join(",")))'`
  → lists `TOOLS, brilliantServer, openBridge` plus the Task 3.2 exports (expected).
- **SATISFIES**: AC #1, AC #2.
- **REGENERATES**: none (portal/ is in no loc-summary group — PR A report, observed).

### Task 3.2 — ADD the parsers and `classifyBridge` to `brilliant-mcp.mjs` (the ONE place that knows the shapes)

- **IMPLEMENT** (pure; each takes a JSON-RPC reply object exactly as captured):
  - `textOf(reply)` → the joined `result.content[].text`, or `null`.
  - `bindingOf(reply)` → from `reply.result._meta.brilliant`: `{ project: name || title || handle || null,
    tabId, surface, viewOnly, otherTabs: otherTabs.length }`, or `null` when `_meta` is absent (the unpaired
    `initialize` carries none — PROTOCOL §2).
  - `parseInit(reply)` → `{ canvasId }` from `/\*\*sessionCanvasId:\*\*\s*`([^`]+)`/`; throws
    `brilliant-mcp: init named no sessionCanvasId` when absent.
  - `parseSelection(reply)` → `JSON.parse(textOf)` → `{ canvasId, selectedIds, blueprint }`; `selectedIds` must
    be an array of 16-hex strings (throw naming the bad one). NEVER a regex over the text: the probe's
    throwaway regex picked up the fill id `9df0cbadf986e307` (observed, `P/raw/13-lookup.json`).
  - `parseLookup(reply)` → `results[].blueprint` joined by `\n` (in order), plus `elementIds` concatenated;
    `result.isError` → throw with the bridge's text.
  - `parseExport(reply)` → `{ bytes: Buffer.from(image.data, "base64"), width, height, sha256 }` from the
    image block and the `element(s): <id> | WxH | N bytes | sha256:<hex>` text line; throws if the decoded
    bytes' sha256 differs from the line's (an integrity check the capture makes possible — observed both
    lines present).
  - `parsePage(reply)` → the `summary` elements with no `parentId` (top-level), `{ id, name, type }`.
  - `classifyBridge({ phase, exited, timedOut, error, tools })` → at most ONE refusal, each with ONE action:
    | outcome | kind | message (textContent on the page) | action |
    |---|---|---|---|
    | exited/stream end before `initialize` answered | `not-running` | `The Brilliant MCP server did not start (exit <code>).` (keeps "did not start" — journey I1) | `{ label: "Check it runs", hint: "npx -y @brilliant-hq/mcp" }` |
    | timeout before `tools/list` answered | `not-answering` | `The Brilliant bridge did not answer.` | same hint |
    | `tools/list` error whose message contains `No Brilliant surface is connected` | `not-paired` | `Brilliant is not paired with this computer. A brilliant.design tab should have opened: allow its local connection (in Brave, "apps on device"), click Connect, then import again.` plus `detail: <the bridge's message verbatim>` | `{ label: "Import again", retry: true }` |
    | `tools/list` answered without `get_selection` | `not-reachable` | as PR A (`import-run.mjs:139-141`) | as PR A |
    | timeout after `tools/list` answered | `stale-binding` | `Bound to project <p> — it did not answer.` / `The binding did not answer.` (PR A's words) | `{ label: "Re-bind", route: "binding" }` |
    | `selectedIds` empty | `nothing-selected` | PR A's | PR A's |
    | a `tools/call` error or `isError` | `read-failed` | `Brilliant refused the read: <text>` | `{ label: "Drop an exported file instead" }` |
- **GOTCHA**: `classifyReach`/`classifyRead` in `import-run.mjs` take SDK shapes; they are REPLACED by
  `classifyBridge` (Task 4.1 removes them). Keep PR A's exact message strings where the table says so — 43.3
  and I1 match on them.
- **VALIDATE**: Task 3.3.
- **SATISFIES**: AC #1, R1.
- **REGENERATES**: none.

### Task 3.3 — REWRITE 43.1 and 43.3, ADD 43.11 (the parsers over every committed capture)

- **IMPLEMENT**:
  - **43.1** (replace :13731-13747's SDK pins): `import-run.mjs` AND `brilliant-mcp.mjs` import in CI (no
    `portal/node_modules`); the decommented source of each contains no `claude-agent-sdk` (static OR dynamic —
    the lazy import is gone), no `zod`, no `@modelcontextprotocol`; `brilliant-mcp.mjs`'s import specifiers are
    all `node:` built-ins (parse them, as group 36.6 does for canvas-store).
  - **43.3** (replace :13787-13799): `classifyBridge` over every row of the Task 3.2 table, the `not-paired`
    row driven from the COMMITTED `tools-list-unpaired.json` error (not a typed string), the `nothing-selected`
    row from `get-selection-none.json`; each refusal has exactly one `action` with a string `label`; junk
    (`null`, `{}`, `42`) answers `not-running`.
  - **43.11** (new): every parser over its capture — `parseInit(init.json).canvasId === "playground"`;
    `parseSelection` one/none/two → 1/0/2 ids, the two-selected blueprint containing `spans[`;
    `parseSelection(get-selection-no-canvas.json)` throws; `parseLookup` one/two → blueprints that `convert()`
    reads to ids `[630f…]` / `[630f…, 36cc…]`; `parseLookup(lookup-unresolved.json)` throws naming "Could not
    resolve"; `parseExport(export-png.json)` → 790×402, 2155 bytes, sha matches; the thumb → 160×81, 315
    bytes; `parsePage(lookup-page.json)` → 2 entries; `bindingOf(get-selection-one.json)` →
    `{ project: null, surface: "web", otherTabs: 0 }`; `bindingOf(initialize-unpaired.json)` → `null`.
    Positive control first: `readdirSync("import/fixtures/brilliant-live")` has ≥ 15 `.json` files and every
    one is read by at least one case (collect the names read; assert set equality) — a capture nobody reads is
    a capture nothing gates.
- **REDDENS**: (43.1) put `const { query } = await import("@anthropic-ai/claude-agent-sdk")` back into
  `readBrilliant` → names `import-run.mjs` and the SDK; (43.3) change `not-paired`'s match string →
  the committed unpaired error classifies `not-reachable` and 43.3 names it; (43.11) make `parseSelection`
  scrape `/[0-9a-f]{16}/g` from the text → two-selected yields 3 ids (the fill id) and 43.11 names it; drop
  the sha check in `parseExport` and corrupt one byte of a scratch copy → 43.11's corrupted-copy case goes red
  (add that case: a mutated `data` must throw).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "import run"` → `✓` (expected).
- **SATISFIES**: AC #1, AC #2.
- **REGENERATES**: the group-43 string only (no count change — no new group).

### Task 4.1 — REWRITE `readBrilliant` on the client; REMOVE the SDK half

- **IMPLEMENT** in `portal/lib/import-run.mjs`:
  - REMOVE (made unused by this change): `IMPORT_MODEL`, `SYSTEM_PROMPT`, `READ_PROMPT`, `importFenceHooks`,
    `importCanUseTool`, `site()`, `REBIND_TOOLS`, `classifyReach`, `classifyRead`, `LIVE_READ_NOT_BUILT`,
    `brilliantServer` (moved). Grep first: `git grep -n "<name>" -- ':!.claude'` must show only
    `import-run.mjs` and group 43 (observed 2026-09-27: true for all of them).
  - `READ_TOOLS` := `brilliant-mcp.mjs`'s `TOOLS` (re-export or import; one list). `FENCE_SITES` :=
    `["client"]`. Keep `importFenceDecision` and `deniedLine` (the one predicate; the line shape).
  - `export async function readBrilliant({ ids = null, timeoutMs = Number(process.env.UXF_IMPORT_TIMEOUT_MS)
    || 150_000, streams = null, server } = {})`:
    1. `openBridge({ server, streams, allowed: READ_TOOLS, decide: importFenceDecision, onDeny: ({ tool,
       input, reason }) => transcript.push(deniedLine({ tool, input, error: reason, via: "client" })) })`; one
       overall timer (`timedOut`), armed before the first await (PR A's rule, :596-598).
    2. `initialize` (protocolVersion `2025-06-18`, `clientInfo { name: "ux-factory import", version }`) →
       `notifications/initialized` → `tools/list`. Classify with `classifyBridge` at each step.
    3. `call("init", { agentName: "ux-factory import" })` → `parseInit` → `canvasId`.
    4. Without `ids`: `call("get_selection", { canvasId })` → `parseSelection`; empty → `nothing-selected`.
    5. `call("lookup", { scope: ids, format: "blueprint", expandInstances: true })` → `parseLookup` → `text`.
    6. `call("export", { canvasId, ids: [ids[0]], format: "png" })` → `parseExport` → `reference` (the
       Buffer `writeImport` already writes to `imports/<id>.reference.png`).
    7. `binding = bindingOf(<the get_selection or lookup reply>)`.
    8. Always `close()` in `finally`.
    Transcript lines: `meta { entrance, transport: "stdio", server: server.command, allowed }`, then one
    `tool { ts, tool, input, ok, ms, bytes, sha256 }` per call (the response lives in `source.json`, not
    twice — PR A's rule), every `denied` line, and `binding { project, tabId, surface, otherTabs }`. No
    `result`, no `costUsd` (there is no model).
    Returns `{ refused }` or `{ text, transcript, reference, binding }`.
  - `runImport`'s selection branch (:487-494): set `source.project = r.binding?.project ?? null` (today
    hard-coded `null`, :512). Nothing else in `runImport` changes.
  - Header: rewrite invariant 1 ("NO SDK, NO MODEL: the live read is a direct stdio JSON-RPC client"),
    invariant 6 ("ONE FENCE, ONE SITE: the client's `call()`"), and replace "THE LIVE READ IS REACH-ONLY"
    with "THE LIVE READ" (the sequence above, the pairing wait, why one process per import), citing
    `.claude/plans/import-run-live-read-311-pr-b.md` and the owner's 2026-09-27 call.
- **GOTCHA**: the real bridge's unpaired `tools/list` waits ~46–60 s before erroring (observed 45.8 s raw,
  ~62 s through the SDK) and OPENS A BROWSER TAB as a side effect — `timeoutMs` must stay well above that
  (150 s default kept). `tools/list` must be sent after `notifications/initialized`, as the probe did.
  Never `retry`: one `tools/list` per read.
- **VALIDATE**: `cd portal && UXF_BRILLIANT_MCP='{"type":"stdio","command":"node","args":["../tooling/fake-brilliant-bridge.mjs","paired"]}' node -e 'import("./lib/import-run.mjs").then(m=>m.readBrilliant({})).then(r=>console.log(r.refused ?? {bytes:r.text.length, ref:r.reference?.length, binding:r.binding}))'`
  → `{ bytes: 80-ish, ref: 2155, binding: { project: null, … } }` (expected; the fake's args path is relative to
  `portal/`, the portal child's cwd — confirm by reading how `server.mjs` is spawned in the journey :113).
- **SATISFIES**: AC #1, AC #2.
- **REGENERATES**: none.

### Task 4.2 — ADD `bindingStatus()` and `browse()` to `import-run.mjs`

- **IMPLEMENT**:
  - `export async function bindingStatus({ streams, server, timeoutMs } = {})` — steps 1–4 of `readBrilliant`
    (the `get_selection` is read-only and costs ~3 ms, observed) plus `bindingOf(<get_selection reply>)`;
    returns `{ binding, canvasId, selected: selectedIds.length }` or `{ refused }` (an empty selection is NOT
    a refusal here — `selected: 0`). The panel shows `· N selected`; the live leg polls on it. Wrapped in `withRunLock(…,
    "a binding check")` (it spawns the bridge and may open a tab; one Brilliant session at a time).
  - `export async function browse({ refresh = false, streams, server, timeoutMs } = {})` — steps 1–3, then
    `call("lookup", { scope: [canvasId], format: "summary" })` → `parsePage`, then for the first
    `BROWSE_MAX = 12` entries `call("export", { canvasId, ids: [e.id], format: "png", width: 160 })` →
    `thumb: data:image/png;base64,…`. Cache: a module-level `Map` keyed `${binding.tabId}|${canvasId}`, for the
    life of the server process; `refresh` deletes the key first. Returns `{ binding, canvasId, elements:
    [{ id, name, type, thumb }], truncated: total > BROWSE_MAX, cached }` or `{ refused }`. Under
    `withRunLock(…, "a browse")`. A cache hit still needs the key, so it opens the bridge for steps 1–3 —
    state it; the saving is the N exports.
  - Browse → import: the page posts `entrance: "ids", ids: [...]` (existing route); `readBrilliant({ ids })`
    skips step 4. Validate `ids` at the route: an array of 1–`BROWSE_MAX` 16-hex strings, else 400.
- **GOTCHA**: `withRunLock` is not re-entrant — `runImport` already holds it around `readBrilliant`; do NOT
  wrap `readBrilliant` itself. `bindingStatus` and `browse` are separate entry points, so they take it.
- **VALIDATE**: Task 4.3.
- **SATISFIES**: AC #1 (Browse, binding line).
- **REGENERATES**: none.

### Task 4.3 — REWRITE 43.2, ADD 43.12 and 43.13 (the client end to end, in process)

- **IMPLEMENT** (all over `serve()` from the fake, with in-process `PassThrough` pairs as `streams` — no
  spawn in build-checks):
  - **43.2** (replace :13757-13785): positive control — `call("get_selection", {canvasId})` reaches the fake
    (its `log` saw one `tools/call` named `get_selection`); `call("create_modify_elements")`, `call("Write")`,
    `call("execute_commands")` and `call(undefined)` each resolve `{ denied }`, write exactly one `denied`
    line `via: "client"`, and the fake's log shows NO `tools/call` for them (the request never left the
    portal); a throwing `decide` denies; `deniedLine` refuses a `via` outside `["client"]`.
  - **43.12**: `runImport` with the default reader bound to a fake (inject via a `reader` that calls
    `readBrilliant({ streams })`): mode `paired` → record + `reference.png` (2155 bytes) + transcript with four
    `tool` lines and one `binding` line, `checkRecord` passes, `source.project === null`, `source.ids` exactly
    the one selected id, one `component.propose` line; mode `two-selected` → `source.ids` the two ids (the
    annotation fix in effect end to end); modes `unpaired` / `exit` / `none-selected` → the refusal kinds
    `not-paired` / `not-running` / `nothing-selected` and nothing under `build/imports/`; `hang-call` with
    `timeoutMs: 300` → `stale-binding` with `action.route === "binding"`; `hang-init` with `timeoutMs: 300` →
    `not-answering`.
  - **43.13**: `browse()` over `paired` → 2 elements (top-level only), each `thumb` a `data:image/png` URL, a
    second call `cached: true` and the fake's log shows ZERO new `export` calls, `refresh: true` re-exports;
    `bindingStatus()` → `{ binding: { project: null, surface: "web" }, canvasId: "playground", selected: 1 }`,
    and over `none-selected` → `selected: 0` with no `refused`.
- **REDDENS**: (43.2) move the `decide` call after the write in `call()` → the fake's log shows a
  `create_modify_elements` tools/call and 43.2 names it; (43.12) drop the `source.project` line → still green
  (it is null either way) — so ALSO add a case with a fixture-derived `_meta` project: write a scratch copy of
  `get-selection-one.json` with `project.name: "Faster Payment"` served by a `serve({ overrides })` hook, and
  assert `source.project === "Faster Payment"`; removing the line then reds; (43.13) remove the cache → the
  second call's export count is 2 and 43.13 names it.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "import run"` → `✓` (expected).
- **SATISFIES**: AC #1, AC #2.
- **REGENERATES**: none.

### Task 5.1 — ADD the two routes to `portal/server.mjs`

- **IMPLEMENT** beside the import routes (:458-500):
  - `POST /api/canvas/import/binding` (no body fields) → `json(res, 200, await bindingStatus())`.
  - `GET /api/canvas/import/browse?refresh=1` → `json(res, 200, await browse({ refresh: url.searchParams.get('refresh') === '1' }))`.
  - `/api/canvas/import`: validate `b.ids` when `entrance === "ids"` (array, 1–12, each `/^[0-9a-f]{16}$/`)
    → 400 naming the bad value, before `runImport`.
  - Update the import comment at :35-36 ("Statically SDK-free (43.1); the live read is a stdio client —
    brilliant-mcp.mjs") and import `bindingStatus, browse`.
  Both new routes are behind the existing origin guard (it runs before routing, every method — PR A).
  - LOCK CONTENTION on `binding`/`browse` is a refusal, not a 500: `bindingStatus` and `browse` catch
    `withRunLock`'s throw whose message contains `already in flight` and return `{ refused: { kind: "busy",
    message: <the lock's message, which names the holder>, action: { label: "Wait, then try again" } } }`;
    any other throw propagates. `/api/canvas/import` keeps PR A's behaviour (throw → catch-all; the page
    shows it with the reload action) — unchanged, so I5 stays as is.
- **GOTCHA**: 43.13 asserts the busy shape: hold the lock with a pending `runImport` over a `hang-call` fake,
  call `browse()` → `refused.kind === "busy"` and the message names "an import".
- **VALIDATE**: `cd portal && PORT=4799 JOBS_DIR=$(mktemp -d) UXF_BRILLIANT_MCP='{"type":"stdio","command":"node","args":["../tooling/fake-brilliant-bridge.mjs","paired"]}' node server.mjs & SP=$!; sleep 2; curl -s -X POST -H 'Origin: http://127.0.0.1:4799' localhost:4799/api/canvas/import/binding; echo; curl -s 'localhost:4799/api/canvas/import/browse' | head -c 300; kill $SP`
  → a `binding` object; a browse JSON with two elements (expected). Kill only `$SP`.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### Task 6.1 — UPDATE `portal/public/canvas-import.mjs` + `portal.css`: binding line, Browse, the actions

- **IMPLEMENT**:
  - Binding line (:112): initial text `Reads: not checked yet` + a `Check binding` button
    (`data-import-binding-check`). It does not run on load: a check may open a browser tab. On a result:
    `Reads: <project>` or `Reads: this tab's project (name not exposed)`, `· web` / `· desktop`, and
    `· N other tabs` when N > 0. After a selection import the line updates from the response's `binding`
    (return it from `runImport`'s success object — add `binding` next to `view`).
  - `showRefusal` (:53-64): add the two new action shapes — `route: "binding"` → runs the binding check;
    `retry: true` → runs `importSelection()` again (an explicit click, not a retry loop). Show `detail`
    (the bridge's own words) as a second `<p>` via `textContent`.
  - `Browse the page` button (secondary, beside Import selection) → `GET …/browse` → a grid of up to 12
    `<button aria-pressed>` tiles (thumbnail `<img alt="<name>">` + name, `textContent`), a `Refresh` button,
    `Import N selected` (disabled at 0) → `POST /api/canvas/import { entrance: "ids", ids }` → `done()`.
    "Showing 12 of N" when `truncated`.
  - Every new control ≥ 44×44 (journey asserts); styles in `portal.css` under `.cv-import-*`, token-only.
- **PATTERN**: `el()` :19-28, `api()` :39-43, `done()` :66-73 (reuse; a successful ids import reloads with
  `?import=<name>` like a selection import).
- **VALIDATE**: Task 7.1.
- **SATISFIES**: AC #1.
- **REGENERATES**: none (the portal is not in the VR set).

### Task 7.1 — EXTEND `tooling/canvas-journey.mjs`: fake-bridge legs on three engines

- **IMPLEMENT**:
  - `const FAKE = (mode) => JSON.stringify({ type: "stdio", command: process.execPath, args: [path.join(REPO, "tooling/fake-brilliant-bridge.mjs"), mode] })` (absolute path — no cwd question).
  - I1: keep `MCP_DOWN` and the "did not start" assertion. Replace the costUsd assertion (:564-567) with
    `t("I1 · …the refusal is not-running", body.refused?.kind === "not-running", …)` and delete its comment:
    there is no model on this path, so there is no spend to label.
  - I5: `MCP_HANG` → `FAKE("hang-call")`; the `stale-binding` assertion stays; add
    `t("I5 · …its one action is Re-bind, routed to the binding check", firstBody.refused?.action?.route === "binding", …)`.
    I5 stays API-only; the Re-bind CLICK is covered in I10b below.
  - NEW I10b (the `hang-call` child, page): Import selection → refusal "did not answer" → click its one action
    → a POST to `/api/canvas/import/binding` is observed (`page.waitForRequest`) and the binding line updates.
  - NEW I9 (a third portal child with `FAKE("paired")`): open the run → Import → **Check binding** → the line
    reads "this tab's project (name not exposed) · web" → **Import selection** → reload with `?import=` →
    record `i<n>.json` with `source.ids === ["630fe03901352c90"]`, `imports/i<n>.reference.png` on disk, the
    Original pane shows an `<img>` → edit one mapping (drop a part) → `mapping.json` changed and the view
    re-rendered (AC #1a against the fake).
  - NEW I10 (same child restarted with `FAKE("unpaired")`, or a fourth child): Import selection → the refusal
    names "not paired" with ONE action "Import again" and the bridge's own words in the detail line.
  - NEW I11 (the `paired` child): Browse → 2 tiles with `<img>` → select both → Import 2 selected → the record's
    `source.ids` has both ids → Browse again shows the cached grid.
  - Header: WHAT IT PROVES (+ I9–I11), WHAT IT CANNOT REACH (a REAL Brilliant tab and pairing — only
    `--live-brilliant`; the real ~46–60 s unpaired wait, which the fake answers at once).
  - Final ✓ line (:730): extend the import-pass clause.
- **GOTCHA**: memory `stale-serve-wrong-tree` — the driver already asserts `/api/health` reports this
  worktree's HEAD; keep every new child on `freePort()` and kill by its own handle in `finally`. WebKit
  sometimes drops lazy images in scrollers (memory `webkit-lazy-iframe-in-scroller`) — assert the tile
  `<img>` by `complete && naturalWidth > 0` after `scrollIntoViewIfNeeded`, and if WebKit still fails, report
  it per engine rather than weakening the check.
- **VALIDATE**: `(cd portal && npm ci) && node tooling/canvas-journey.mjs all` → `canvas-journey ✓` on chromium,
  firefox and webkit (expected; PR A's counts were 65/64/64 — expect ~+20 each).
- **REDDENS**: point I9's child at `FAKE("none-selected")` → I9 reds naming "Nothing is selected"; remove the
  `retry` branch from `showRefusal` → I10's click focuses the file input and I10 reds.
- **SATISFIES**: AC #1 (both journeys against the fake), AC #2 (lock, via I5).
- **REGENERATES**: none.

### Task 7.2 — ADD the `--live-brilliant` leg (owner-run, free, chromium only)

- **IMPLEMENT**: `node tooling/canvas-journey.mjs chromium --live-brilliant` (parse the flag separately from
  the engine arg at :63): the portal child with NO `UXF_BRILLIANT_MCP` override. NON-INTERACTIVE (the
  implementer's shell cannot press Enter, and the owner prefers no CLI typing): it prints "select one element
  in a PAIRED brilliant.design tab — waiting up to 180 s", then polls `POST /api/canvas/import/binding` and
  every 5 s until the response carries `binding` and `selected >= 1` (Task 4.2's `bindingStatus` returns
  `selected`). On timeout it FAILS naming "no paired selection within 180 s", never skips green. Then: Check binding → a binding
  line; Import selection → record + `reference.png` + a `component.propose` line; edit one mapping → the file
  changes and the view re-renders; Browse → ≥ 1 tile. The leg asserts SHAPES (a 16-hex id in
  `source.ids`, a PNG signature on `reference.png`), never the owner's content.
- **GOTCHA**: pairing needs the owner's hand — in Brave, site settings → brilliant.design → "apps on device"
  → Allow (observed 2026-09-27; memory `brilliant-bridge-pairing-brave`). If the leader bridge belongs to
  another session and never opens a pairing tab, close that session first. $0: no model anywhere.
- **VALIDATE**: owner-run → `canvas-journey ✓ … live-brilliant` (expected).
- **SATISFIES**: AC #1a against real Brilliant.
- **REGENERATES**: none.

### Task 8.1 — AMEND the architecture and the ticket

- **IMPLEMENT**:
  - `docs/epics/canvas-design-import.architecture.md`: edit :61 ("the import run reads Brilliant through a
    direct stdio client"), :186-189 (the Brilliant MCP clause: "allowed on import runs only" becomes "the
    import run is not an agent run: `portal/lib/brilliant-mcp.mjs` speaks the MCP stdio protocol directly and
    its `call()` allows the four read tools by name"), :208-213 ("through the SDK run" → "through a direct
    stdio client; no model"). Append a dated entry under a new `## Addendum 2026-09-27` at the end (mirror
    :379's addendum style): the owner's call, the evidence (probe README, the three SDK observations), and what
    it does not change (every other agent run stays on the SDK).
  - Ticket #311 AC #2's first half: with the owner's OK at PR time (`gh issue edit 311 --body-file …`),
    reword "The fence proven denying `Write` on an import run (feed it, watch the `denied` line)" to "The
    client's fence proven denying `Write` and every Brilliant write tool before the request leaves the portal
    (43.2: the `denied` line, and no `tools/call` at the fake)". The owner approved this rewording when
    choosing the transport; still show the diff before editing.
- **VALIDATE**: `git diff --stat docs/epics/` shows one file; `gh issue view 311 | grep -n "fence"` (after).
- **SATISFIES**: the "stop and flag" rule of CLAUDE.md § Working principles (the flag was raised and answered).
- **REGENERATES**: none.

### Task 8.2 — UPDATE the docs that describe the reader

- **IMPLEMENT**:
  - `.claude/references/gates.md` :78 — Group 43: replace the SDK sentences (43.1's pins, the two-site
    fence, "CI has no SDK", "the live read is not built") with the client's; add 43.11–43.13; keep the
    "cannot reach" clause honest: a real bridge and pairing (`--live-brilliant`), whether a draft is any good,
    pixels. :131 — `canvas-journey.mjs`: I9–I11 and `--live-brilliant`. Group 40's entry: 40.28.
  - Memory `gate-prose-has-three-copies`: the same "cannot reach" wording lives in the group() string
    (build-checks :13961), gates.md :78, and the fake's header — grep all three.
  - `CLAUDE.md` architecture map: `lib/import-run.mjs` line → "Brilliant read (stdio client) or a dropped file
    → record + proposal"; add `lib/brilliant-mcp.mjs  the Brilliant bridge's stdio client + its wire shapes`;
    under `tooling/`: `fake-brilliant-bridge.mjs  the bridge answered from import/fixtures/brilliant-live/`.
    Group count stays 46 (no new group) — `node tooling/drift-check.mjs` leg `group-count` confirms.
  - `discovery/README.md` :601-603 — the transcript's line types: `meta` (entrance, transport, server, allowed
    tools), `tool`, `binding`, `denied`; drop "the model" and "once the live read exists". Add three lines on
    pairing (the tab the bridge opens, the browser's loopback permission — Brave's "apps on device" — and
    Connect).
  - `portal/server.mjs` :35-36 comment (done in 5.1). `.claude/plans/import-run-recorded-import-311.md` —
    append one AMENDMENTS line: "2026-09-27 — PR B planned in `import-run-live-read-311-pr-b.md`; Tasks
    4.1/4.2/7.3/7.4 superseded (direct stdio client, owner's call)".
- **VALIDATE**: `node tooling/drift-check.mjs | tail -2` → `✓ … group-count` (expected; observed passing on
  PR A at 43, now 46 on main).
- **SATISFIES**: CI `verify`.
- **REGENERATES**: none.

---

## TESTING STRATEGY

No suite, no linter (CLAUDE.md § Testing). The gates are build-checks group 40 (40.28) and group 43 (43.1–43.3
rewritten, 43.11–43.13 new), the canvas journey (I1, I5 changed; I9–I11 new) and the owner-run live leg.

### Unit (build-checks, in process, CI)
Parsers over every committed capture (43.11); the classifier over every outcome (43.3); the client's fence
(43.2); the reader, runImport, Browse and the binding check over the fake via PassThrough streams
(43.12–43.13); the converter's annotation rule (40.28).

### Integration (journey, operator-run, three engines)
The page against a portal child whose bridge is the fake in `paired`, `unpaired`, `hang-call` and `exit`
modes. The real bridge only under `--live-brilliant`.

### Edge Cases
- Unpaired tab (the bridge's -32000 after ~46 s, and a browser tab opens) → `not-paired`, one action.
- Nothing selected → `nothing-selected`. Two selected → both ids, one joined blueprint.
- A selection whose blueprint carries `spans[…]` → no phantom id (40.28, 43.12).
- `get_selection` without `canvasId` → never sent (the client always passes it); the capture proves the
  bridge would refuse (43.11).
- `lookup` `isError` → `read-failed`, nothing written.
- A hung call → `stale-binding` with Re-bind → the binding check.
- A non-JSON stdout line → protocol error (add to 43.12: a fake mode `garbage` writing `hello\n`).
- The PNG's sha mismatch → throw (43.11 mutated copy).
- Browse on a canvas with > 12 top-level elements → 12 tiles + "Showing 12 of N" (43.13: a scratch
  `lookup-page` with 14 entries).
- `ids` entrance with a non-hex id or > 12 ids → 400 at the route.

### Proving the checks
Every new check carries its REDDENS mutation above. Run each once, record the failure line in the report,
restore. Positive controls: 43.2 (a read tool reaches the fake), 43.11 (every capture is read), 40.28 (the
annotation-free text converts the same).

---

## VALIDATION COMMANDS

### Level 1: Syntax
`for f in portal/lib/brilliant-mcp.mjs portal/lib/import-run.mjs tooling/fake-brilliant-bridge.mjs import/brilliant.mjs portal/public/canvas-import.mjs; do node --check $f || echo BAD $f; done` → silent.

### Level 2: The CI gates
- `node tooling/build-checks.mjs` → `build ✓  all 46 groups pass`. Pre-flight on `origin/main` c909518 in a
  fresh worktree: 45/46, `icons ✗` only because `tooling/icons` had no `node_modules` (observed) — run
  `cd tooling/icons && npm ci` first.
- `node tooling/drift-check.mjs` (needs `tooling/style-dictionary` installed) → all ✓ incl. `group-count` and
  `import records … no drift`.
- `node tooling/token-lint.mjs` → ✓ (the panel CSS is portal-only, but run it).
- `node import/regen-expected.mjs && git status --porcelain import/` → empty.
- CI with `portal/node_modules` moved aside: `mv portal/node_modules /tmp/pnm && node tooling/build-checks.mjs; mv /tmp/pnm portal/node_modules` → 46/46 (43.1's premise).

### Level 3: Journeys
`node tooling/canvas-journey.mjs all` → ✓ on three engines.

### Level 4: Manual
Portal on a private port with the fake (Task 5.1's command); then the owner's `--live-brilliant` leg.

### Level 5: CodeQL
Local CodeQL per memory `codeql-bundle-local-path` (a new `spawn` of a configured command and a new data
URL path are the likely alert sites; `server.command` comes from the operator's env, not a request).

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Task 7.2 — `--live-brilliant` (pair a tab, select one element) | $0 (no model) + the owner's hand | Yes for AC #1a against REAL Brilliant; the fake-bridge I9 covers the mechanism | report AC #1a (real) as not met and open "import-run: live leg owed" |
| Task 8.1 — edit #311's AC #2 wording | owner's OK | No | note in the PR body |
| Phase 0 probe | $0.279 — **already spent 2026-09-27** | — | — |

---

## ACCEPTANCE CRITERIA

- [ ] AC #1a — bound source → selection → record + proposal on disk → side-by-side view → edit one mapping →
      the file changes and the view re-renders: against the fake on three engines (I9) AND against real
      Brilliant (Task 7.2, owner-run).
- [ ] AC #1b — MCP down → refusal with one action → the same file dropped → same record shape (PR A's I1–I3,
      still green; I1 re-worded).
- [ ] AC #2 — the fence denies `Write` and the Brilliant write tools before the request leaves the portal
      (43.2); `withRunLock` refuses a second request during a run (43.8, I5).
- [ ] AC #3 — unchanged from PR A (35.12 green).
- [ ] AC #4 — nothing under `system/` written (I6 + 43's `gitSnap` still green).
- [ ] Browse: ≤ 12 thumbnails, multi-select, cached per session (43.13, I11).
- [ ] The binding line names the project when `_meta` exposes it and says "not exposed" otherwise (43.12's
      override case, I9).
- [ ] `spans[…]` never reaches `source.ids` (40.28).
- [ ] No SDK or model anywhere on the import path (43.1).
- [ ] Architecture amended; `Closes #311` in the PR body; #474 and #475 linked.

## COMPLETION CHECKLIST

- [ ] Tasks in order, each VALIDATE run
- [ ] Every REDDENS mutation run once, failure line recorded, restored
- [ ] 46/46, drift-check, token-lint green; with `portal/node_modules` aside too
- [ ] Journey green on three engines; live leg run or reported with its tracker
- [ ] Plan, report and review in the same PR

---

## OPEN QUESTIONS / ASSUMPTIONS

- **A1** — one bridge process per import is right: the helper is a follower forwarding to the leader, costs
  ~1 s to start (observed `ready` at 0.9–1.4 s), and a fresh session binds to the most-recently-active tab,
  which is what "re-bind" should mean. If the owner wants a long-lived connection later, `openBridge` is the
  seam.
- **A2** — `init`'s `sessionCanvasId` is the canvas the owner is looking at (observed: the scratch
  `playground`). Unverified on a multi-canvas project; if it names a different canvas than the selection's,
  `get_selection` returns empty and the refusal says nothing is selected. Task 7.2 on a real multi-canvas
  project confirms; record the result.
- **A3** — the project name: `_meta.brilliant.project` was empty strings on the scratch tab (observed).
  Whether a saved project fills `name` is unobserved; the line falls back to "not exposed" honestly.
- **A4** — unbound sources are the norm here: the probe's rectangle and text were raw values, and the
  unbound text size 24 appears in the record as a `never-read` drop (observed by running `runImport` over
  the capture: `checkRecord` ok). Nothing is lost silently.
- **Confidence: 9/10.** Every shape the reader parses is a committed capture, the transport is proven
  (four raw runs, $0), and the chain was run over a live capture. The residual is the real-browser pairing
  (owner's hand) and A2.

## NOTES (open canvas)

### Why the transport changed (owner's call, 2026-09-27)

| | SDK relay (architecture as written) | direct stdio client (chosen) |
|---|---|---|
| cost per import | $0.238 (observed, `P/sdk/result.json`) | $0 |
| unpaired tab | init ~62 s, zero tools, "not reachable" (observed) | the bridge's own -32000 text → `not-paired` |
| project name | `_meta` stripped by the hook (observed) | `_meta.brilliant.project` (observed, empty on scratch) |
| after pairing | a new run is needed (tool list frozen at init) | the next click works |
| fence | two SDK sites around a model | one `call()` site around code |
| dependency | the SDK, lazily | node built-ins |

PR A's plan rejected a direct client because it "needs `@modelcontextprotocol/sdk`"; the probe showed newline-
delimited JSON-RPC over stdio needs nothing (`scripts/raw2.mjs.txt`, 40 lines).

### Pre-flight (run 2026-09-27, detached worktree at `origin/main` c909518)

| Check | Ran | Result | Changed in the plan |
|---|---|---|---|
| PR A landed? | `git log -- portal/lib/import-run.mjs`; `gh pr view 462` | `ce74378` merged; reader reach-only; F1–F4 fixed (`reload`, `too-large`, labelled lock, 400) | plan scoped to PR B only |
| Phase 0 run? | `git grep brilliant-live` | no captures anywhere | ran the probe |
| probe, SDK, no tab | `probe-311.mjs down` | connected, 0 tools, 62.8 s, $0 | `not-paired` kind |
| probe, SDK, tab open unpaired | twice | 0 tools at ~63 s, $0.028 + $0.013 | pairing is the owner's step |
| probe, raw stdio | `raw.mjs` | `initialize` local; `tools/list` -32000 at 45.8 s with "grant … click Connect" | verbatim message in the refusal detail |
| pairing | owner, Brave | blocked until "apps on device" allowed; then 18 tools | memory + README + journey GOTCHA |
| paired read, raw | `raw2`–`raw5` | `get_selection` needs `canvasId`; shapes in the table above; $0 | `init` joins the allow-list; parsers; no regex |
| paired read, SDK | `probe-311.mjs up` | `_meta` stripped, image reshaped, isError → Failure hook; $0.238 | transport question → owner |
| chain over the live read | `runImport` with an injected reader over `20-lookup.json` | `checkRecord` ok; `source.ids` includes `spans[(0,3,#CFD5E1)]`; text size 24 → `never-read` drop; rectangle → `frame` | Task 2.1/2.2 |
| committed fixtures carry annotation lines? | grep | none | regen must not move |
| fence exports used elsewhere? | `git grep` | only `import-run.mjs` + group 43 | safe to remove |
| build-checks | `node tooling/build-checks.mjs` | 45/46, `icons ✗` (no `tooling/icons/node_modules`) | Level 2 note |
| loc-summary groups | `gen-loc-summary.mjs:22-26` | system/, pages, agent-layer/ only | REGENERATES: none everywhere |
| group count | `CLAUDE.md:140` | 46 | no new group → no count edit |
| trackers | `gh issue list` | neither existed | opened #474, #475 |
| 40.8 walks `import/` | read :12528-12534 | it only asserts `genLocSummary({check:true})` has no drift — no file list, no count | new `brilliant-live/` fixtures move nothing |
| other pins on `mcp__brilliant__` / `FENCE_SITES` | `git grep` outside `.claude` | only group 43 (:13759-13792) — rewritten by Task 3.3/4.3 | none |
| expected verdicts / records on main | `node import/regen-expected.mjs && git status --porcelain import/`; `node tooling/regen-import-records.mjs --check` | both `expected verdict ✓` lines, status empty; `import records ✓ … 4 files, 187933 bytes, no drift` | Task 2.1's "must not move" has a baseline |
| advisor review of this plan | — | F1 fence signature inconsistent across 3.1/4.1; open choices in 5.1 and 7.1; live leg needed stdin | one `openBridge` signature; `busy` refusal decided; I1/I5/I10b final; live leg polls `selected` |

Spend on this planning session: **$0.279** (SDK $0.028 + $0.013 + $0.238; raw $0).

### Observed, not acted on
- A rectangle reads as `kind: "frame"` (Brilliant `r`); the "Pay" text was recognised as `demo-notice` and
  then "no builder" — recognition quality for drawn shapes is #316's to meet, not this PR's.
- `list_projects` returns `[]` on the web editor again (spike C saw the same).
- A stale former leader (Tuesday) was still listening on 3363 beside today's leader on 3364. Other sessions'
  helpers are never killed.

### Traps carried in
Shared worktree (verify branch before each commit, stage by path); fresh worktree needs `npm ci` ×4;
`stale-serve-wrong-tree`; `portal-smoke-port-scoped-kill`; `gate-prose-has-three-copies`;
`drift-check-syntax-checks-parked-mjs` (the probe scripts are parked as `.txt`); `webkit-lazy-iframe-in-scroller`
(tile images); `review-validated-premerge-tree` (merge main before review); `owner-merges-fast-verify-landed`.

## AMENDMENTS

- 2026-09-27 — pre-flight line drift (content as described, lines moved): `runImport`'s selection branch is
  `import-run.mjs:489-497` (not :487-494); the hard-coded `source.project: null` is :515 (not :512);
  `parseTree` ends at `brilliant.mjs:598`. Every other cited line resolved.
- 2026-09-27 — Task order vs "green after every task": the import-run.mjs half of 43.1 ("no SDK") and the
  removal of the old 43.2 SDK-site cases (which call `importFenceHooks`/`importCanUseTool` outside `afold`,
  so their removal crashes the file) landed WITH Task 4.1, not 3.3. Task 3.3 added only brilliant-mcp.mjs's
  43.1 half, 43.3 and 43.11.
- 2026-09-27 — Task 3.1: `openBridge` also returns `notify(method, params)` — `notifications/initialized` has
  no id and gets no reply, so sending it through `request()` would wait forever. Task 3.2: `classifyBridge`
  also takes `selection` and `project`; an exit AFTER tools/list answered is `read-failed` ("mid-read"); any
  tools/list error other than the pairing one is `not-reachable`; anything it cannot place fails closed as
  `not-running` (null only on the two explicit successes). Added `failureOf(reply)` so import-run.mjs never
  reads a reply's inside (R1).
- 2026-09-27 — Task 2.1 GOTCHA was incomplete: the committed fixtures carry no annotation lines, but two
  SYNTHETIC build-checks group-40 lines (the D5 absorption cases) used 8-hex ids (`aaaa2222`, `aaaa3333`) at
  depth > 0, which the 16-hex rule now reads as annotations. Lengthened to 16-hex; the ids are asserted
  nowhere. The brilliant.mjs file header has no "what parseTree skips" list — the rule went into the comment
  above `parseTree`, which is that list.
- 2026-09-27 — Task 4.2: browse's summary lookup sends `depth: 0`, as the capture did (`lookup-page.json`);
  it also returns `total` (the page needs "Showing 12 of N"). The cache key uses `init`'s `_meta` (observed:
  `init.json` carries `_meta.brilliant`), so a cache hit opens steps 1–3 only, as planned.
- 2026-09-27 — Task 4.1: the `meta` line's `server` is `"in-process streams"` when `streams` is injected (not
  `npx`, which would be a false record). A non-JSON stdout line THROWS out of readBrilliant (a protocol
  error, never data), so runImport throws to the catch-all — it is not a refusal. `runImport`'s success
  object carries `binding` (Task 6.1's ask) — null on a drop.
- 2026-09-27 — Task 1.1: each capture is re-serialised with a 2-space indent (values unchanged; the probe
  wrote `tools-list-unpaired.json`'s reply on one line). The fake gained `overrides` (43.12/43.13's SYNTHETIC
  cases), a `garbage` mode (the edge case) and a `MODES` export.
