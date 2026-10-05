# Feature: the import reads Brilliant through `read({ paths })` (#530)

Validate the codebase patterns and the task sanity below before you start implementing. Names, line numbers
and captured values were read on `origin/main` 82054e0 on 2026-10-05.

## Feature Description

Brilliant's MCP retired `lookup`. The tool is still listed in `tools/list`, but any call to it gets back a
one-line redirect: "There is no tool named lookup: the read is read({ paths })…". The portal's live import
calls `lookup` twice: `portal/lib/import-run.mjs:643` reads the selection's blueprint (the text description
of a design) and `:692` reads the page summary (the list of top-level elements). So both **Import
selection** and **Browse the page** fail on every element. This plan moves both reads to `read`. It also
moves the read allow-list (the four tools the import may call) and the parsers (the functions that pull
data out of Brilliant's replies). The fake bridge, the committed captures, build-checks and
`run-316-ready.mjs` check 7 move with them, in one PR.

## User Story

As the owner running #316 Run 1
I want Import selection and Browse the page to read a live Brilliant canvas again
So that the sitting paused at seq 73 can resume at step 5 (the import) without a workaround

## Problem Statement

The import path speaks to a tool that no longer reads anything. Three things make it worse than a rename.
1. **The reply format changed.** `lookup` answered JSON (`{results:[{blueprint, elementIds}]}`). `read`
   answers a fenced document: an opening ` ```bl ` line, then `file("<canvas path>")`, then the blueprint
   rows, then a closing ` ``` `. A summary read puts one JSON line inside the same fence. Observed in
   `.claude/plans/import-read-paths-530-probe/raw/04-read.json`, `07-read.json` and `11-read.json`.
2. **The canvas id changed shape.** `init`'s `sessionCanvasId` is now the canvas path
   (`The Ultimate Email Design System (Community)/12  Klaviyo Cart Abandonment.bl`, with two spaces, in
   `raw/01-init.json`), not `playground`. Every committed capture is from the old session. A new `read`
   capture next to an old `init`/`get_selection` capture would describe a session that never existed.
3. **The retired `lookup` does not fail loudly.** `raw/03-lookup.json` is a normal result, with no
   `isError` and no JSON-RPC error. Only a parser that expects a fence can tell it apart from a real read.

## Solution Statement

- `TOOLS` becomes `["init", "get_selection", "read", "export"]`.
- `parseLookup` is replaced by `parseRead(reply)`, which returns `{ path, text }`. It strips the one ` ```bl `
  fence and its `file("…")` line and hands the rows to `import/brilliant.mjs` unchanged.
- `parsePage` reads the summary JSON out of the same fence.
- The selection read becomes `read({ paths: [canvasId], ids, format: "blueprint", expandInstances: true })`.
  `raw/05-read.json` shows this works. `raw/09-read.json` shows that an id read without its canvas path is
  refused once the canvas is unloaded.
- Browse becomes `read({ paths: [canvasId], format: "summary" })`. The `depth` argument is dropped:
  Brilliant documents it as blueprint-only.
- The whole `brilliant-live/` capture set (bar the two unpaired captures) is re-captured in one paired
  session on a scratch canvas the owner draws. This is the owner's call of 2026-10-05: a scratch canvas, not
  the Community email file the probe paired with.
- The retired `lookup` reply is committed as `lookup-retired.json`. It is the gate for AC #4: `parseRead`
  refuses it naming `lookup`, and the fence refuses a `lookup` call before it leaves the portal.

**How Browse works now (the issue's question).** `read` *does* give a page's top-level summary. Over the
canvas path with `format: "summary"`, it returns only the top-level elements. Three observations from
`raw/07-read.json` and `raw/08-read.json`:
- `matchCount` 4.
- "Ecommerce 2" reports `childCount 8`, and none of its children are listed.
- Adding `depth: 0` gives a byte-identical body.

So Browse keeps its shape, with no fallback.

## Out of Scope / Non-Goals

- Not touching `discovery/faster-payment/`, the `run/faster-payment-316` branch or the `wt-316-sitting`
  worktree. The sitting merges `main` after this lands (issue § Constraint).
- Not changing the file-drop route. A dropped blueprint `.txt` never calls `lookup` (issue § What happened).
- Not removing `import/brilliant.mjs:582`'s `lookup ` provenance-header skip. The committed `.txt` reads
  (spike C, 43.16's `SYN`) still start with that header. It is the drop format's convention, not a call.
- Not using `read`'s `sessionId`, `query` or filters. Only plain ids are passed, and `#refs` are never used,
  so per-session ref resolution never applies.
- Not touching the discovery drawer's "Look it up" control (`portal/public/portal.js:1082`, `:1601`). It is
  unrelated: discovery #289.
- Not re-measuring `import/fixtures/measure-live/`. Those are #474's own captures and are not read by the
  fake bridge.

## Feature Metadata

**Feature Type**: Bug Fix (an external API changed)
**Estimated Complexity**: Medium. The code change is small. The fixture recapture moves about 18 asserted
literals across groups 40, 42 and 43 and `canvas-journey.mjs`.
**Primary Systems Affected**: `portal/lib/brilliant-mcp.mjs`, `portal/lib/import-run.mjs`,
`tooling/fake-brilliant-bridge.mjs`, `import/fixtures/brilliant-live/`, `tooling/build-checks.mjs` groups
40.28, 42.15 and 43, `tooling/canvas-journey.mjs`, `tooling/run-316-ready.mjs`
**Dependencies**: `@brilliant-hq/mcp` (npx, the live router). There is no new package.

## Related Work

**Implements**: #530 (`Closes #530`) · **Epic**: #295, `docs/epics/canvas-design-import.architecture.md`
(§ Boundaries "The import is a recorded run", as amended by the owner's 2026-09-27 direct-client call)

**Back-references**:
- `.claude/plans/import-run-live-read-311-pr-b.md`. Why: built the stdio client, the parsers, the fake and the
  capture set this plan replaces. Its Task 1.1 recapture procedure is the precedent.
- `.claude/plans/import-run-live-read-311-probe/`. Why: the probe scripts this plan's probe mirrors
  (`scripts/raw5.mjs.txt`), and the scratch-canvas recipe (README).

**Forward-references**: #316 Run 1 resumes step 5 after `run/faster-payment-316` merges `main`.

---

## CONTEXT REFERENCES

### Relevant Codebase Files (read these before implementing)

- `portal/lib/brilliant-mcp.mjs:1-36`: the header, with invariant 4 ("a Brilliant change is a re-capture,
  never a guess here"). This header gets rewritten.
- `portal/lib/brilliant-mcp.mjs:39`: `TOOLS`.
- `portal/lib/brilliant-mcp.mjs:144-174`: `textOf`, `failureOf`, `refusedBy`, `jsonText`. These are the
  helpers `parseRead` reuses.
- `portal/lib/brilliant-mcp.mjs:202-230`: `parseLookup`, `parseExport` and `parsePage`, the parsers being
  replaced.
- `portal/lib/import-run.mjs:28-50`: header invariant 6 names the four tools, and THE LIVE READ describes
  the call sequence (`→ lookup {format:"blueprint"} →`).
- `portal/lib/import-run.mjs:87`: the import line (`parseLookup`).
- `portal/lib/import-run.mjs:95`: `READ_TOOLS = TOOLS`.
- `portal/lib/import-run.mjs:100-104`: `importFenceDecision`. It is unchanged: it allows by `allowed.includes`.
- `portal/lib/import-run.mjs:567-575`: the `EXPORT_SCALE` comment cites `tools-list.json`'s
  `schemas.export.properties.scale`, so that schema must survive the recapture.
- `portal/lib/import-run.mjs:620-650`: `readBrilliant`.
- `portal/lib/import-run.mjs:678-705`: `browse`.
- `portal/lib/import-measure.mjs:39`: it also cites `schemas.export.properties.scale`.
- `tooling/fake-brilliant-bridge.mjs` (all 95 lines): the header (MODES, WHAT IT CANNOT REACH), and
  `call()`'s `lookup` branch at `:48-52`.
- `tooling/run-316-ready.mjs:13`, `:47` and `:82`: check 7's comment, `READ_TOOLS` and the check.
- `import/fixtures/brilliant-live/README.md`: the provenance table. It is rewritten for the new set.
- `.claude/plans/import-run-live-read-311-probe/scripts/raw5.mjs.txt`: the raw stdio probe shape.
  `.claude/plans/import-read-paths-530-probe/scripts/probe530.mjs.txt` is its #530 descendant.
- `tooling/build-checks.mjs`. Every site that moves:
  - `:14704-14717` (40.28) reads `lookup-blueprint-two.json`'s `results[0].blueprint` and pins
    `IDS = ["630fe03901352c90", "36cc06ddb7e3a767"]` plus the `spans[(0,3,#CFD5E1)]` annotation line.
  - `:15505-15513` (42.15) reads `export-png.json` and expects 790x402, plus "not opaque" without `{ over }`.
  - `:15639-15641` holds `LIVE_DIR`, `liveRead` and `live()`.
  - `:15667` (43.1/43.2) pins `deep(M.READ_TOOLS) === deep(["init","get_selection","lookup","export"])`.
  - `:15675` holds 43.2's denied list `["create_modify_elements","Write","execute_commands",undefined]`, and
    `:15684` holds the matching `lines.length === 4` and tool list.
  - `:15677`: `get_selection { canvasId: "playground" }`.
  - `:15692`: a throwing-decide case calls `b.call("lookup", {})`. It stays valid: any name works there.
  - `:15707-15720` (43.3 classifier): `"Brilliant refused the read: Error in lookup"` comes from
    `lookup-unresolved.json`.
  - `:15940-15987` (43.11): ONE/TWO, `playground`, the export sizes `790/402/2155` and `160/81/315`,
    `parseLookup` ×3, `parsePage` and its two elements, `names.length === 18`, and `onDisk.length >= 15`.
  - `:15993-16030` (43.12): ONE/TWO, `reference.png` `=== 2155`, and the transcript tools
    `"init,get_selection,lookup,export"` at `:16014-16016` and the message at `:16026`.
  - `:16057` (43.13): `b1.canvasId === "playground"` and `elements.length === 2`.
  - `:16066-16073`: the SYNTHETIC 14-element page, built by mutating `lookup-page.json`'s JSON body.
  - `:16079`: `s1.canvasId === "playground"`.
  - `:16327`: the `group("import run", …)` prose ("both lookups converted", "the page's two top-level
    elements", "a 2155-byte reference.png").
- `tooling/canvas-journey.mjs:1325`: `const SELECTED = "630fe03901352c90"`.

### New Files to Create

- `import/fixtures/brilliant-live/read-blueprint-one.json`, `read-blueprint-two.json`, `read-page.json`,
  `read-unresolved.json` and `lookup-retired.json`: verbatim captures.
- `.claude/plans/import-read-paths-530-probe/scripts/capture530.mjs.txt`: the committed-set capture script,
  parked as `.txt`. Drift-check runs `node --check` over every tracked `.mjs`; see memory
  "drift-check syntax-checks parked .mjs".

### Removed

- `import/fixtures/brilliant-live/lookup-blueprint-one.json`, `lookup-blueprint-two.json`, `lookup-page.json`
  and `lookup-unresolved.json`. They are replaced by the `read-*` captures above. Git history keeps them.

### Relevant Documentation

- Brilliant `read`'s tool description, as served live on 2026-10-05 and captured in
  `raw/00-tools-list.json`. These parts matter:
  - `paths` takes canvas paths (".bl optional"). `ids` takes element ids "with their canvas in paths".
  - `format` is one of `"blueprint"` (default), `"summary"` (id, name, type, parentId, parentName,
    childCount, text snippet) or `"skeleton"`.
  - `depth` is "Only meaningful when format=blueprint".
  - `expandInstances` is READ-ONLY.
  - `limit` "Defaults to 50".
- `lookup`'s live description: "Retired. A call answers the one line that names the door: edit({ text }) to
  write, read({ paths }) to read." **`edit` is a write tool and is new since #311.**
- `@brilliant-hq/mcp` PROTOCOL.md §1 (newline-delimited JSON-RPC on stdout) and §2 (`_meta.brilliant`). The
  transport is unchanged: `raw/00-initialize.json` gives the same `initialize` shape.

### What the probe observed (2026-10-05, `@brilliant-hq/mcp` via npx, paired web tab, $0, no model)

Scripts are `scripts/probe530.mjs.txt` and `probe530b.mjs.txt`. The raw replies are in `raw/`. All of this
was read off the Community email canvas and is planning evidence only. None of it is committed as a fixture.

| # | Call | Answer |
|---|---|---|
| 00 | `tools/list` | 23 tools: get_selection, export, **read**, list_projects, **edit**, create_modify_elements, create_html, **lookup**, read_objects_result, objects_result, convert_html, execute_commands, get_knowledge, init, generate_image, generate_svg, vectorize_image, remove_background, capture_ui, list_capture_targets, render_ui, list_stagers, send_feedback |
| 01 | `init` | `**sessionCanvasId:** \`<folder>/<canvas>.bl\`` — the existing `parseInit` regex still matches |
| 02 | `get_selection {canvasId}` | JSON as before: `{canvasId, count, selectedIds, blueprint}`; `_meta.brilliant` present (`project.name` set) |
| 03 | `lookup {scope, format, expandInstances}` | **ok, not isError**: `There is no tool named lookup: the read is read({ paths }), each document answered as a fence. The same call through it: read({ paths: ["362c…"], format: "blueprint" }).` |
| 04/06 | `read {ids, format:"blueprint", expandInstances}` | ` ```bl ` / `file("<path>")` / rows (2-space indent, unchanged DSL) / ` ``` ` — one text block, `_meta` present |
| 05 | `read {paths:[canvasId], ids, …}` | byte-identical body to 04 |
| 07/08 | `read {paths:[canvasId], format:"summary"}` (± `depth:0`) | ` ```bl ` / `file(…)` / `{"matchCount":4,"returnedCount":4,"elements":[{id,name,type[,text][,childCount]}…]}` / ` ``` ` — top-level only, no `parentId` keys |
| 09 | `read {ids:[unknown]}` | `isError: true`, `Error in read: Invalid argument(s): Could not resolve scope item: "9df0…". … Pair with a canvas path …` |
| 11 | `read {ids:[a,b]}` | ONE fence, both roots at depth 0 in id order |
| 12/13 | `export {canvasId:<path>, ids, format:"png", scale:1 \| width:160}` | unchanged shape; the `element(s): id \| WxH \| N bytes \| sha256:` line still present |
| 14 | `read {paths:["No Such Folder/Nope"]}` | `isError`, `Canvas "No Such Folder/Nope" does not exist in this project…` |

### Patterns to Follow

**A parser reads a reply object as captured and throws with the bridge's words.** Mirror
`brilliant-mcp.mjs:203-208`:
```js
export function parseLookup(reply) {
  const v = jsonText(reply, "lookup");
  if (!Array.isArray(v?.results)) throw new Error("brilliant-mcp: lookup.results is not an array");
  ...
```
**Errors** are plain `Error`s prefixed `brilliant-mcp: <tool>`, naming the offending field (CLAUDE.md §
Ground rules, Errors).

**A capture is verbatim.** It is one JSON-RPC reply object re-serialised with a 2-space indent, with the
PNG base64 restored from its `.full.b64` sibling (README § "Verbatim; never hand-edited"). `tools-list.json`
is the one exception: it is a summary the probe writes (`{names, _meta, schemas}`), and the fake builds its
reply from it (`fake-brilliant-bridge.mjs:39-42`).

**A build-checks case** follows `fold(label, fn, fallback)` → `ok(cond, message-naming-the-observed-value)`.
See `:15953-15955`.

---

## IMPLEMENTATION PLAN

### Phase 0: Recapture the committed set (owner's hand plus $0 probe)

The owner draws the scratch canvas. The implementer runs the capture script three times, once per selection
state, and copies the replies into `brilliant-live/`. Nothing else starts until the fixtures are on disk,
because every literal in Phases 2–3 comes from them.

### Phase 1: The wire (`brilliant-mcp.mjs`)

**Depends on:** Phase 0 (the parsers are written against the committed captures, never against this plan's
snippets)

`TOOLS`, `parseRead`, `parsePage` and the header.

### Phase 2: The reader and the fake

**Depends on:** Phase 1

`import-run.mjs`'s two reads, the header and the import line. The fake bridge's `read` and `lookup`
branches.

### Phase 3: The gates

**Depends on:** Phases 0–2

build-checks 40.28, 42.15 and 43.*, `canvas-journey.mjs`'s `SELECTED`, `run-316-ready.mjs` check 7, and the
prose copies.

---

## STEP-BY-STEP TASKS

### 0.0 SETUP the worktree

- **IMPLEMENT**: Work in `/Users/Berzins/Desktop/Linards_current/wt-530` on branch
  `fix/import-read-paths-530`, which is already created off `origin/main` 82054e0. Run `npm ci` in `portal/`,
  `tooling/icons/`, `tooling/visual-regression/` and `tooling/style-dictionary/`.
- **GOTCHA**: The primary tree (`ux-factory/`) is on a stale branch, `fix/importer-reads-icon-name-449`. Do
  not work there. Never touch `wt-316-sitting`.
- **VALIDATE**: `node tooling/run-316-ready.mjs 2>&1 | grep -c "check 7"` prints `0`, meaning check 7 is
  green. Observed today: before `npm ci`, checks 9, 10 and 11 are red, and 10 and 11 are red only because
  `tooling/icons/node_modules` is missing.
- **SATISFIES**: none (setup) · **REGENERATES**: none

### 0.1 OWNER: draw the scratch canvas

- **IMPLEMENT**: Ask the owner to do this in a Brilliant project they own, in a Brave tab that is paired with
  "apps on device" allowed (memory "Brilliant bridge pairing (Brave)"):
  1. Open a NEW canvas named `Scratch/Import probe`.
  2. Draw a rectangle with a raw `#000000` fill and a **corner radius of 8 or more**.
  3. Write a text "Pay" whose **first three characters are coloured** `#CFD5E1` (one span).
  4. Select only the rectangle.
  5. **Close every other Brilliant tab**, the Community email tab in particular. The helper binds to the
     focused, most recently active tab (memory "Brilliant MCP binding"), and the 2026-10-05 probe bound to
     the email canvas for exactly that reason.
- **GOTCHA**: The corner radius guarantees transparent corner pixels. 42.15 asserts that the export throws
  "not opaque" without `{ over }`, and a square black rectangle may export fully opaque. The coloured span
  reproduces the `spans[(…)]` annotation line that 40.28 pins. The two probe reads had no `spans[` line
  (`grep -c 'spans\['` on `raw/11-read.json` gave 0).
- **SATISFIES**: AC #1, AC #2 (prerequisite) · **REGENERATES**: none

### 0.2 CREATE `.claude/plans/import-read-paths-530-probe/scripts/capture530.mjs.txt` and RUN it three times

- **IMPLEMENT**: Copy `probe530.mjs.txt` to the scratchpad as `.mjs`. Change it to write the replies in the
  committed shape: the bare JSON-RPC reply object, with PNG data written to `<tag>.full.b64` and stubbed.
  Each run calls `initialize` → `tools/list` → `init` → `get_selection {canvasId}`. From there:
  - **Pass A (rectangle selected):** also `get_selection {}` (no canvasId) → `get-selection-no-canvas`;
    `read {paths:[canvasId], ids:[sel], format:"blueprint", expandInstances:true}` → `read-blueprint-one`;
    `read {paths:[canvasId], ids:["9df0cbadf986e307"], format:"blueprint"}` → `read-unresolved`;
    `read {paths:[canvasId], format:"summary"}` → `read-page`; `lookup {scope:[sel], format:"blueprint",
    expandInstances:true}` → `lookup-retired`; `export {canvasId, ids:[sel], format:"png", scale:1}` →
    `export-png`; `export {…, width:160}` → `export-thumb`; `list_projects {}` → `list-projects`. Also
    write `initialize.json`, and `tools-list.json` as the summary `{ names, _meta, schemas }` holding the
    schemas for `get_selection, export, read, lookup, list_projects, init`. That is the same set as #311
    with `read` added.
  - **Pass B (owner deselects all):** `get_selection` → `get-selection-none`.
  - **Pass C (owner selects rectangle then "Pay"):** `get_selection` → `get-selection-two`;
    `read {paths:[canvasId], ids:<both>, …}` → `read-blueprint-two`.
- **GOTCHA (wrong-canvas guard)**: The script must exit before writing any file unless `init`'s
  `sessionCanvasId` contains `Import probe`. Print the id it got. Without this, a capture of the wrong tab
  looks valid.
- **GOTCHA**: Before copying `read-unresolved.json`, confirm `result.isError === true` and that the text
  contains `Could not resolve`. The probe's unresolved id belonged to an unloaded canvas (`raw/09`). A fill id
  on the BOUND canvas, sent WITH `paths`, has not been tried. If Brilliant answers it with a normal result, use
  `ids:["0000000000000000"]` instead, and record which id was used in the README row.
- **GOTCHA**: The unresolved read needs a scope item that resolves nowhere. Use the fill id from pass A's
  blueprint (`f[(<fillId>,#000000)]`) as #311 did: it is a 16-hex id that is not an element. Keep
  `initialize-unpaired.json` and `tools-list-unpaired.json` as they are. The pairing step is unchanged, and
  recapturing them needs an unpaired tab plus a 46 s wait.
- **GOTCHA**: `init.json` and `get-selection-*.json` must come from passes in the same tab. 43.11 asserts
  `bindingOf(initialize.json)` deep-equals `bindingOf(get-selection-one.json)`. That holds only if
  `initialize` and the selection come from one paired session. Write `initialize.json` from pass A.
- **GOTCHA**: The owner's project is NAMED this time (the probe's `_meta.brilliant.project.name` was set).
  `bindingOf(...).project` is no longer `null`, so 43.11 `:15973`, 43.12 `:16012` (`R.source.project ===
  null`) and 43.13 `:16079` move to the captured name.
- **VALIDATE**: `ls import/fixtures/brilliant-live/*.json | wc -l` prints `17`: 15 from passes A–C plus the
  two unpaired captures (expected). Then
  `node -e 'for (const f of ["read-blueprint-one","read-blueprint-two","read-page"]) console.log(f, require("./import/fixtures/brilliant-live/"+f+".json").result.content[0].text.split("\n")[0])'`
  prints ` ```bl ` three times. Then `grep -c 'spans\[' import/fixtures/brilliant-live/read-blueprint-two.json`
  must not be 0.
- **SATISFIES**: AC #1, AC #2, AC #4 · **REGENERATES**: the fixture set itself (`git rm` the four `lookup-*.json`)

### 0.3 UPDATE `import/fixtures/brilliant-live/README.md`

- **IMPLEMENT**: Rewrite the header (date 2026-10-05, the version `npx` resolved, the `Scratch/Import probe`
  canvas, "the owner's project, drawn for the test") and the table, one row per file. Add a row for
  `lookup-retired.json` that says it is the retired tool's redirect, kept as the AC #4 gate. Keep the
  "Verbatim; never hand-edited" paragraph unchanged.
- **VALIDATE**: `grep -c '^| `' import/fixtures/brilliant-live/README.md` prints `17` (expected).
- **SATISFIES**: AC #4 · **REGENERATES**: none

### 1.1 UPDATE `portal/lib/brilliant-mcp.mjs` — `TOOLS`, `parseRead`, `parsePage`, header

- **IMPLEMENT**:
  - `TOOLS = Object.freeze(["init", "get_selection", "read", "export"])`. Update its comment: `read`
    replaced `lookup` when Brilliant retired it (#530).
  - REMOVE `parseLookup`. ADD `parseRead(reply)`:
    1. `refusedBy(reply, "read")`.
    2. `t = textOf(reply)`.
    3. The text must match exactly one fence `/^```bl\nfile\("([^"]*)"\)\n([\s\S]*?)\n```$/`, after one
       `trim()`. If it does not, throw `brilliant-mcp: read answered no single \`\`\`bl fence: <first 80
       chars>`. For `lookup-retired.json` the 80 characters begin "There is no tool named lookup", so the
       thrown message names `lookup` by quoting the bridge. That is AC #4's "by name".
    4. Return `{ path, text: body }`.

    Refuse more than one fence by name ("read answered N fences — one canvas per read"). A `paths:[canvasId]`
    read cannot span canvases, so a second fence means the call changed.
    **`films:` lines are refused by name, not skipped.** `read`'s description says a canvas answer "lists
    the films that name it above its fence (`films: Motion/Launch.bm`)". No capture pins that shape, so
    accepting it would be a guess (header invariant 4). When the text before the fence has a line starting
    `films:`, throw `brilliant-mcp: read listed films above the fence (<line>) — no capture pins that shape;
    re-capture a canvas a film names (#530)`. That way the owner meets the real cause at #316 step 5, not
    "no single fence". A SYNTHETIC 43.11 case (a `films: Motion/Launch.bm` line prepended to
    `read-blueprint-one`'s text) asserts the message contains `films:`.
  - Make `parsePage(reply)` call `parseRead`, `JSON.parse` the body (throwing `read's summary is not JSON`),
    and require `Array.isArray(v.elements)` and `v.returnedCount === v.elements.length`. Return
    `{ elements: [...top-level, as before, keeping the !parentId filter], total: v.matchCount }`. The
    `!parentId` filter cannot fire on a summary read today, but it costs nothing and guards against a
    future `read` that lists descendants. Say so in one comment line.
  - Header: update invariant 4's capture-set sentence and the opening paragraph's tool list. Add one line:
    "`read` answers a fence, not JSON: ```` ```bl ```` / `file(path)` / rows / ```` ``` ```` (captures
    read-*.json). `lookup` is listed but retired. It answers a plain redirect, not an error, so only
    parseRead's fence test catches a client still calling it (lookup-retired.json)."
- **PATTERN**: `brilliant-mcp.mjs:168-174` (`refusedBy`, `jsonText`) and `:203-208`.
- **GOTCHA**: `import-run.mjs` uses only `.text`. Do not invent `elementIds`: `read` has no such field.
  43.11 derives the ids by converting, which is the stronger check anyway.
- **GOTCHA**: Do not strip the fence in `import/brilliant.mjs`. `brilliant-mcp.mjs` owns the wire shapes
  (header invariant 4), and `convert()` has no rule for ` ```bl ` or `file(`.
- **VALIDATE**: `node -e 'import("./portal/lib/brilliant-mcp.mjs").then(m=>{const L=f=>JSON.parse(require("fs").readFileSync("import/fixtures/brilliant-live/"+f));console.log(m.TOOLS, m.parseRead(L("read-blueprint-one.json")).path, m.parsePage(L("read-page.json")).total); try{m.parseRead(L("lookup-retired.json"))}catch(e){console.log(e.message)}})'`.
  Expected output: the four tools, `Scratch/Import probe.bl` (or the path `init` named), `2`, and a message
  containing `no single` and `lookup`.
- **SATISFIES**: AC #4 · **REGENERATES**: none. `portal/lib/` is in no `loc-summary` runtime group; confirm
  with `node agent-layer/gen-loc.mjs --check` after commit (memory "loc-summary counts tracked only").

### 2.1 UPDATE `portal/lib/import-run.mjs` — the two reads, the import line, the header

- **IMPLEMENT**:
  - `:87`: replace `parseLookup` with `parseRead`.
  - `:643-645`: `const l = await s.call("read", { paths: [s.canvasId], ids: read, format: "blueprint",
    expandInstances: true }, project);` → `const { text } = parseRead(l.reply);`.
  - `:691-694`: `read { paths: [s.canvasId], format: "summary" }`. Change the comment to cite
    `read-page.json` and say that a summary over the path is top-level only (`childCount` but no children),
    so `depth` is not sent. Then `const { elements: all, total } = parsePage(l.reply);` and set the entry's
    `total` to `total` in place of `all.length`.
  - Header `:32`: `init, get_selection, read, export`. `:45`: `→ read {paths:[canvas], ids, format:"blueprint"}`.
    `:622`: "the binding then comes from the read reply".
- **GOTCHA**: `truncated` stays `all.length > BROWSE_MAX`. The SYNTHETIC 14-element case must now also
  set `matchCount`/`returnedCount` to 14, or `total` reads 2.
- **VALIDATE**: `grep -n '"lookup"\|parseLookup' portal/lib/import-run.mjs portal/lib/brilliant-mcp.mjs`
  prints nothing.
- **SATISFIES**: AC #1, AC #2, AC #4 · **REGENERATES**: none

### 2.2 UPDATE `tooling/fake-brilliant-bridge.mjs`

- **IMPLEMENT**: Replace the `lookup` branch with:
  - `read`: `format === "summary"` with no `ids` → `read-page.json`. Default or `"blueprint"` with ids →
    `ids.length >= 2 ? read-blueprint-two : read-blueprint-one`. Ids not in either capture's scope (the
    pass-A unresolved id) → `read-unresolved.json`.
  - `lookup` → `lookup-retired.json`. That is Brilliant's real words, not -32601, so a client that regresses
    meets the live behaviour.

  Update the header: the MODES line, and WHAT IT CANNOT REACH ("Brilliant's own validation (it answers any
  `read` by id count and format)") and its export sentence ("it serves the one 790×402 capture … whatever scale"),
  rewritten to name the new scale-1 capture's size.
- **PATTERN**: the existing `call()` at `:44-55`.
- **GOTCHA**: The unresolved routing needs the unresolved id, and a reply carries no input. Declare
  `const UNRESOLVED = "<id>"` with a comment naming `read-unresolved.json` and its README row. Do not regex
  it out of the error text.
- **VALIDATE**: covered by 43.12/43.13 in Task 3.3.
- **SATISFIES**: AC #3, AC #4 · **REGENERATES**: none

### 3.1 UPDATE `tooling/build-checks.mjs` 40.28 (`:14704-14717`) and 42.15 (`:15505-15513`)

- **IMPLEMENT**:
  - 40.28: do NOT call `parseRead`. Group 40 stays portal-free (its import-graph assertion covers
    `import/` only, and 40.28 is the import-chain group). Read `result.content[0].text`, assert its first
    line is ` ```bl `, its second starts `file(` and its last is ` ``` ` — so the slicing cannot rot
    silently — then drop those three lines. Set `IDS` to pass C's two ids.
  - 42.15: change the expected `790x402` to the scale-1 export's captured size, as a literal in the gate
    that matches the capture's README row. The gate never parses the README.
- **GOTCHA**: 40.28's positive control is "the same read with the spans line removed". It still applies
  unchanged.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "import-chain|import-record"` shows both ✓.
- **REDDENS**: Delete the `spans[` line from a local copy of the fixture and point 40.28 at it. Expected
  failure: 40.28 names the phantom child. For 42.15, flip one IDAT byte. The existing "does not match its
  own sha256" case covers that.
- **SATISFIES**: AC #3 · **REGENERATES**: none

### 3.2 UPDATE `tooling/build-checks.mjs` 43.1–43.3 (`:15667-15720`)

- **IMPLEMENT**:
  - `:15667`: `["init", "get_selection", "read", "export"]`.
  - `:15675`: add `"edit"` and `"lookup"` to the denied list. `edit` is Brilliant's new write door, and
    `lookup` is the retired tool. Update `:15684`'s count (`4` → `6`) and the tool list.
  - `:15677`: use the captured canvas path in place of `"playground"`.
  - `:15720`: change the expected prefix to `"Brilliant refused the read: Error in read"`, sourced from
    `read-unresolved.json`.
- **REDDENS**: Put `"lookup"` back in `TOOLS`. Expected: 43.1 fails on the deep-equal, and 43.2 fails
  "lookup answered … it must resolve { denied }". Put `"edit"` into `TOOLS`: 43.2 fails "edit reached the fake
  bridge as a tools/call".
- **SATISFIES**: AC #3, AC #4 ("no write tool reachable") · **REGENERATES**: none

### 3.3 UPDATE `tooling/build-checks.mjs` 43.11–43.13 (`:15940-16110`) and the group prose (`:16327`)

- **IMPLEMENT**:
  - Set `ONE`/`TWO` to pass C's ids (pass A's single id must equal `ONE`) and the canvas to the captured path.
  - Replace `parseLookup` with `parseRead` over `read-blueprint-{one,two}`. Keep the convert-to-ids
    assertion. Drop the `elementIds` half. Add the assertion `.path === canvasId`.
  - `read-unresolved.json` must throw naming "Could not resolve".
  - NEW (AC #4): `parseRead(lookup-retired.json)` throws, and the message includes both `no single` and
    `There is no tool named lookup`.
  - NEW (AC #4, end to end): `viaFake` with `overrides: { "read-blueprint-one.json": live("lookup-retired.json") }`
    throws naming `lookup` and writes nothing.
  - Exports: the captured W/H/bytes for both.
  - `parsePage(read-page.json)` → `{ elements: [rect, Pay], total: 2 }`.
  - `names.length === 23`, and `names.includes("edit")`.
  - `onDisk.length >= 17`.
  - 43.12: `reference.png` uses the captured byte count, the transcript tools are `"init,get_selection,read,export"`,
    `:16026`'s message says "from the read reply", and `R.source.project` uses the captured project name.
  - 43.13: `canvasId`, the `project` assertions and the SYNTHETIC page. Mutate `read-page.json`'s fenced JSON:
    split off the fence, pad `elements` to 14, and set `matchCount = returnedCount = 14`. Then override the
    key `"read-page.json"`.
  - `:16327` prose: replace "both lookups converted" with "both reads de-fenced and converted, the retired
    lookup reply refused by name". Update the byte count and "the page's two top-level elements (a summary
    over the canvas path, top-level only)". Add `edit` and `lookup` to the denied list. Keep the "What it
    cannot reach" clause, and add: "whether Brilliant's next rename keeps the fence; a re-capture is the only
    answer".
- **GOTCHA**: The 43.11 every-file-read sweep (`:15985`) fails on any capture nobody reads. `lookup-retired.json`
  is read by the new case, and `initialize.json` by `:15975`. If `get-selection-no-canvas.json` was not
  captured in pass A, the sweep tells you.
- **GOTCHA**: Gate prose has three copies (memory "Gate prose has three copies"): the `group()` string, this
  fixture README, and `.claude/references/gates.md` § Group 43 (`:80`, which carries `2155` once and no
  `lookup` — observed). grep all three for `lookup`, `2155` and `playground`.
- **REDDENS**: (a) Remove the fence check in `parseRead` and use `textOf` raw. Expected: 43.11 fails "the
  one-element read converted to ids [] / threw on ```bl". (b) Revert `import-run.mjs:643` to `"lookup"`.
  Expected: 43.12 fails, with the fence denying `lookup` because it is not in `TOOLS`, which gives a
  read-failed refusal naming "lookup is not one of this run's tools". (c) Drop `matchCount` from the
  synthetic page. Expected: 43.13 fails "total 2".
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^ *import run"` shows ✓.
- **SATISFIES**: AC #3, AC #4 · **REGENERATES**: none

### 3.4 UPDATE `tooling/canvas-journey.mjs:1325` and `tooling/run-316-ready.mjs`

- **IMPLEMENT**: Set `SELECTED` to pass A's id. In run-316-ready: `:47` becomes
  `READ_TOOLS = ['init', 'get_selection', 'read', 'export']`, and the `:13` comment gets "(init ·
  get_selection · read · export since #530)".
- **REDDENS**: Set `TOOLS` back to `lookup`. Expected: `run-316 ✗ check 7 — brilliant-mcp.mjs TOOLS is
  [...,"lookup",...], not the four read tools [...,"read",...]`.
- **VALIDATE**: `node tooling/run-316-ready.mjs 2>&1 | grep "check 7"` prints nothing, meaning green.
  Checks 1–5 read `discovery/faster-payment/` on THIS tree, which is `main`'s copy. Read it; do not write it.
- **SATISFIES**: AC #3 · **REGENERATES**: none

### 3.5 UPDATE `.claude/references/gates.md` § Group 43

- **IMPLEMENT**: Change the `2155` byte count (the only stale literal there, observed) to match 3.3's
  prose, and name `read` wherever the line lists the read tools. Make no other edit.
- **VALIDATE**: `grep -n "lookup" .claude/references/gates.md` hits only the group 40 line (`:72`), which
  is about the `.txt` header.
- **SATISFIES**: AC #3 · **REGENERATES**: none

---

## TESTING STRATEGY

No suite (CLAUDE.md § Testing). The gates are build-checks groups 40, 42 and 43, `canvas-journey.mjs`'s
import pass ×3 engines over the fake bridge, the owner-run `--live-brilliant` leg against the real bridge,
and `run-316-ready.mjs` check 7.

### Edge cases

- The retired `lookup` reply, both as a parse and end to end (3.3).
- `edit` and `lookup` called through the fence (3.2).
- An unresolved id (`read-unresolved.json`), the isError path.
- A two-element read (one fence, two roots) and its `spans[` annotation (40.28).
- A page with more than BROWSE_MAX elements (SYNTHETIC, 43.13), where `total` comes from `matchCount`.
- A multi-fence reply (SYNTHETIC in 43.11: concatenate `read-blueprint-one`'s text twice). It must throw
  naming "2 fences".

### Proving the checks

Every REDDENS above is run once, then reverted. The positive control for the AC #4 gate is the committed
`lookup-retired.json` itself: it is real Brilliant output that must be refused.

---

## VALIDATION COMMANDS

### Level 1: Syntax
`for f in portal/lib/brilliant-mcp.mjs portal/lib/import-run.mjs tooling/fake-brilliant-bridge.mjs tooling/run-316-ready.mjs tooling/canvas-journey.mjs tooling/build-checks.mjs; do node --check $f || echo FAIL $f; done`

### Level 2: The CI gate
- `node tooling/build-checks.mjs`: all groups ✓. Observed today on the unchanged tree without
  `node_modules`: only `build icons` ✗ (41.7, the missing `tooling/icons/node_modules`); after Task 0.0's
  `npm ci` the baseline is expected all-green.
- The CI `verify` job's drift-check and token-lint (memory "PIV skills are Python-tuned": run piv-validate
  even on this PR).
- `node agent-layer/gen-loc.mjs --check` after staging (memory "loc-summary counts tracked only").

### Level 3: Journeys
`node tooling/visual-regression/serve.mjs &` on its own port (memory "Stale serve = wrong tree": use
PORT+BASE overrides and curl-verify `portal/lib/import-run.mjs` is this tree's), then
`node tooling/canvas-journey.mjs all`. The import pass must be green on chromium, firefox and webkit.

### Level 4: Manual / live
- `node tooling/canvas-journey.mjs chromium --live-brilliant` with the scratch canvas paired.
- In the portal against a **scratch copy** of a fictional package (never `discovery/faster-payment`):
  Import selection on the rectangle writes `imports/i1.*`; Browse the page lists rectangle and "Pay".
- `node tooling/run-316-ready.mjs`: check 7 green.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| 0.1 draw `Scratch/Import probe` (radius rectangle, "Pay" with a 3-char span) | owner's hand, ~5 min | yes: every fixture literal comes from it | none; nothing can proceed |
| 0.2 passes B and C: deselect, then select two | owner's hand, seconds | yes | none |
| `canvas-journey --live-brilliant` (AC #2 live) | $0, owner's paired tab | yes for AC #1/#2 | #530 stays open |
| Live Import selection in the portal (AC #1) | $0, owner's tab | yes | #530 stays open |

---

## ACCEPTANCE CRITERIA

- [ ] AC #1: A live Import selection of a real element writes `imports/i1.*` in a scratch package copy.
- [ ] AC #2: Browse the page lists a live page's top-level elements.
- [ ] AC #3: build-checks green; canvas-journey's import pass green ×3; `run-316-ready` check 7 ✓ with
      `init · get_selection · read · export`.
- [ ] AC #4: No `lookup` call left on the import path. `parseRead` refuses the committed retired-lookup reply
      naming `lookup`, and the fence denies `lookup` and `edit` before a byte leaves the portal.

## COMPLETION CHECKLIST

- [ ] Phase 0 fixtures committed verbatim, README rewritten, four `lookup-*.json` removed
- [ ] Every REDDENS run once and reverted
- [ ] build-checks, canvas-journey ×3, `--live-brilliant`, run-316-ready check 7 run, with results in the report
- [ ] Plan, report and review in the same PR; body carries `Closes #530`

## OPEN QUESTIONS / ASSUMPTIONS

- **A1** (assumed): The scratch canvas lives in a project the owner owns and may commit. The owner chose
  this on 2026-10-05, replacing the Community email file the probe paired with.
- **A2** (assumed from one canvas): `read {paths:[canvas], format:"summary"}` is top-level only on every
  canvas. The evidence is one canvas with 4 roots and an 8-child frame not expanded. If the recapture's
  `read-page.json` lists the "Pay" text's parent or any child, the `!parentId` filter is what keeps Browse
  correct, and 43.11 then asserts it fires.
- **A3**: Brilliant's `tools/list` is captured as a summary (23 names plus six schemas). The fake serves only
  those six schemas. That is the same limitation as #311.
- **A4**: The probe's raw email captures (`.claude/plans/import-read-paths-530-probe/raw/`) are **not
  committed**, because they hold the Community template's text. They stay untracked in `wt-530` for the
  implementer to read. The committed evidence is the probe's `README.md`, which holds the "What the probe
  observed" table, plus the two scripts. Every `raw/NN` citation in this plan refers to a row of that table.

## NOTES (open canvas)

**Why recapture everything, not add `read-*` beside the old set.** `init` now names the canvas by path, and
the fake answers with whatever capture matches the tool. A `read` reply whose `file("…")` names a path,
served after an `init` that says `playground`, is a session Brilliant never produced. Ids would also
disagree: 43.12 asserts `source.ids` equals the selection, and the selection capture's ids would not appear
in a new read. The unpaired pair is kept because nothing in it references a canvas.

**Why `paths` plus `ids`, not `ids` alone.** Captures 04 and 05 are identical while the canvas is active.
Capture 09's error says ids resolve only against "the active canvas + recently-loaded canvases" and to pair
them with a path otherwise. A Browse → import reads ids the owner picked from a tile. Sending the path makes
that read independent of which canvas is active.

**Why the fence test is the AC #4 gate rather than a string match on "lookup".** A gate that greps the
reply for "lookup" passes only while Brilliant phrases the redirect that way. The structural test (exactly
one ` ```bl ` fence with a `file(` line) refuses the redirect, and it also refuses any other non-read answer
a future rename produces. The redirect's own words then make the throw name `lookup`.

**Rejected:** keeping `lookup` in `TOOLS` beside `read` "for compatibility". That would make five tools,
breaking the four-tool invariant and run-316-ready check 7, and it allows a call that can only answer a
redirect.

**Pre-flight (run 2026-10-05 on `origin/main` 82054e0, in `wt-530`).**
- Every `lookup` site was grepped. There are 8 in `brilliant-mcp.mjs`, 6 in `import-run.mjs`, 5 in the fake
  and 5 in `import/brilliant.mjs` (the `.txt` header skip and its comments, out of scope). In
  `build-checks.mjs`, the discovery hits at `:7106-10333` are the look-up drawer and are unrelated. The import
  hits are at `:14408-14709`, `:15667-16110` and `:16327`. `canvas-journey.mjs` has 0 `lookup` hits but pins
  `SELECTED` at `:1325`. `portal/public` hits are discovery only. `docs/epics/canvas-design-import.architecture.md`
  has 0 hits.
- `node tooling/run-316-ready.mjs` was run. Check 7 is green today; checks 9–11 are red only because the
  fresh worktree has no node_modules. Plan change: Task 0.0 runs `npm ci`.
- 42.15 (`:15511`) was found to read `export-png.json`. The issue did not list it. Plan change: Task 3.1 and
  the corner-radius instruction in 0.1, because 42.15 needs an alpha pixel.
- 40.28's `spans[` dependency: the new two-id probe read has 0 `spans[` lines. Plan change: the coloured span
  in 0.1, and the advisor's alternative (keeping the old file for group 40) was rejected once the owner chose
  a scratch canvas.
- `bindingOf` on the probe gave a non-null `project.name`. Plan change: the three `project === null`
  assertions are listed in 0.2's GOTCHA.
- `edit` was found in the live `tools/list`; it was not there at #311's 18 tools. Plan change: 3.2 adds it to
  the denied list.
- `importFenceDecision` (`:100-104`) was confirmed to need no change.
- **Export scale 2 → 1**: the old `export-png.json` was taken at Brilliant's default scale 2 (395 → 790).
  Measurement is on demand, not part of `runImport` (`import-run.mjs:25`), and no fake-bridge import is
  measured: 43.16 uses SYNTHETIC references, and canvas-journey measures #474's own `measure-live` seed.
  `placeExhibit` uses the fixed `EXHIBIT_SIZE` (`canvas-store.mjs:257`), so 43.15's 1518/1870 do not move.
  What moves: 42.15's size, 43.11's export sizes, and 43.12's `reference.png` bytes. Task 2.2 also rewrites the
  fake header's "the one 790×402 capture … whatever scale" sentence to name the new capture and scale 1.
- The advisor's review produced these plan changes: the wrong-canvas guard and the step to close other tabs
  (0.1, 0.2), the `films:` refusal (1.1), the `read-unresolved` isError check (0.2), and raw captures kept
  untracked (A4).

## AMENDMENTS

- **2026-10-05, Task 0.1 (canvas name).** The owner drew the scratch canvas as project `scratch-import-probe`,
  canvas `main.bl`, not `Scratch/Import probe`. The wrong-canvas guard in `capture530.mjs.txt` now requires
  both `_meta.brilliant.project.name === "scratch-import-probe"` and `sessionCanvasId === "main.bl"`; its first
  run against the plan's guard exited before writing (observed `init bound "main.bl"`). Every `Scratch/Import
  probe.bl` in Tasks 1.1/3.x reads `main.bl`.
- **2026-10-05, plan error (the rows, not only the fence).** The probe proved the fence shape but never ran a
  read's rows through `import/brilliant.mjs`'s `convert()`. Brilliant's text rows now carry `lh(auto,1.21)`
  (one `lh(auto,1.22)` was already in `raw/`), and `parseValue` throws `unparseable value: auto,1.21` — so a
  live import of any text throws before a record is written (AC #1). Fix: `import/brilliant.mjs` reads
  `lh(auto,<finite number>)` as `lineHeight: null` (parity with #311's capture of the same drawing, which had
  no `lh`, and with `figma.mjs`'s F3 AUTO → null); any other `lh(auto…)` still throws. Gated by a new 40.28
  assertion. A $0 sweep of every probe blueprint read (04, 05, 06, 11, 15) through `parseRead` + `convert()`
  throws nothing after the fix.
- **2026-10-05, plan error (Task 3.5 scope).** `.claude/references/gates.md` § Group 42 also carried the old
  export size (`790×402`), not only § Group 43's `2155`. Both moved; § Group 43's denied list now names `edit`
  and `lookup`, so `grep lookup gates.md` hits :80 as well as :72 — the denied-list wording the plan asks 3.3
  to add.
