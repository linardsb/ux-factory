# brilliant-live — Brilliant's MCP bridge, captured over raw stdio (#530; first set #311 PR B)

Re-captured whole 2026-10-05 from `@brilliant-hq/mcp` 0.1.9 (what `npx -y` resolved) by a raw Node stdio
JSON-RPC client (no model, no Agent SDK), when Brilliant retired `lookup` for `read({ paths })`. The canvas
is `main.bl` in the owner's project `scratch-import-probe`, drawn for the test: a raw #000000 rectangle
with a 12 corner radius and a "PAY" text whose three characters carry a #CFD5E1 span. Three passes in one
tab: A (rectangle selected), B (nothing selected), C (rectangle, then "PAY"). The capture script:
`.claude/plans/import-read-paths-530-probe/scripts/capture530.mjs.txt`. The two unpaired captures are
#311's, kept: nothing in them names a canvas (`.claude/plans/import-run-live-read-311-probe/`).

**Verbatim; never hand-edited.** Each file is one JSON-RPC reply object exactly as the bridge wrote it
(re-serialised with a 2-space indent; no value changed). The #530 script kept the two PNGs' base64
whole and wrote nothing until the bytes' sha256 equalled the one the bridge's own text line names (#311's
probe stripped it to a stub and restored it from a `.full.b64` sibling, with the same check). `tabId` and `mcp:` session strings are kept as
captured; they are not secrets. **A Brilliant change is a re-capture, never an edit.**

Read by `portal/lib/brilliant-mcp.mjs`'s parsers (build-checks 43.11 reads every file) and served by
`tooling/fake-brilliant-bridge.mjs` (43.2, 43.12, 43.13 and the canvas journey).

| File | Pass | What it is |
|---|---|---|
| `initialize-unpaired.json` | #311 `raw/00-initialize-unconnected.json` | `initialize` before pairing — answered locally, "Brilliant is not connected yet", no `_meta` |
| `tools-list-unpaired.json` | #311 `raw/00-tools-list-unpaired.json` (`.reply`) | `tools/list` before pairing — `error -32000`, "No Brilliant surface is connected yet…" (after 45.8 s) |
| `initialize.json` | A | `initialize` once paired (`serverInfo.version "1.0.0"`), `_meta.brilliant.project.name "scratch-import-probe"` |
| `tools-list.json` | A | a SUMMARY the script wrote, not a reply: the 23 tool names (`edit` and `read` new since #311) + six input schemas (get_selection, export, read, lookup, list_projects, init). The fake builds its `tools/list` reply from it |
| `init.json` | A | `init` — `**sessionCanvasId:** \`main.bl\``, the catalog, a depth-1 blueprint |
| `get-selection-one.json` | A | one selected: `selectedIds ["d37836a642d995ba"]` + `_meta.brilliant` |
| `get-selection-no-canvas.json` | A | `get_selection {}` → `error -32602`, "Missing required property: canvasId" |
| `read-blueprint-one.json` | A | `read {paths:["main.bl"], ids:[rect], format:"blueprint", expandInstances:true}` → one ```` ```bl ```` fence: `file("main.bl")`, the rows |
| `read-unresolved.json` | A | the same with the fill id `9df0cbadf986e307` (not an element) → `result.isError: true`, "Could not resolve scope item" |
| `read-page.json` | A | `read {paths:["main.bl"], format:"summary"}` → the fence around `{matchCount 2, returnedCount 2, elements}` — top-level only |
| `lookup-retired.json` | A | `lookup {scope:[rect], format:"blueprint", expandInstances:true}` → the retired tool's redirect, a normal result ("There is no tool named lookup…"). Kept as the gate: parseRead refuses it by name |
| `export-png.json` | A | `export … format:"png", scale:1` → 387x122, 885 bytes |
| `export-thumb.json` | A | the same at `width: 160` → 160x50, 421 bytes (a Browse thumbnail) |
| `list-projects.json` | A | `list_projects {}` → the one project, `scratch-import-probe` |
| `get-selection-none.json` | B | nothing selected: `count 0` |
| `get-selection-two.json` | C | two selected; the blueprint carries a `spans[(0,3,#CFD5E1)]` annotation line |
| `read-blueprint-two.json` | C | `read` over both ids — one fence, both roots, the annotation line again |
