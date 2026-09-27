# brilliant-live — Brilliant's MCP bridge, captured over raw stdio (#311 PR B)

Captured 2026-09-27 from `@brilliant-hq/mcp` 0.1.8 by a raw Node stdio JSON-RPC client (no model, no
Agent SDK), against an unbound scratch `playground` canvas holding a raw #000000 rectangle and a "Pay"
text. The probe and its full notes: `.claude/plans/import-run-live-read-311-probe/`.

**Verbatim; never hand-edited.** Each file is one JSON-RPC reply object exactly as the bridge wrote it
(re-serialised with a 2-space indent; no value changed). The probe stripped the two PNGs' base64 to a
stub, and the full data was restored from its own `.full.b64` sibling — the restored bytes' sha256
equals the one the bridge's own text line names. `tabId` and `mcp:` session strings are kept as
captured; they are not secrets. **A Brilliant change is a re-capture, never an edit.**

Read by `portal/lib/brilliant-mcp.mjs`'s parsers (build-checks 43.11 reads every file) and served by
`tooling/fake-brilliant-bridge.mjs` (43.2, 43.12, 43.13 and the canvas journey).

| File | From the probe | What it is |
|---|---|---|
| `initialize-unpaired.json` | `raw/00-initialize-unconnected.json` | `initialize` before pairing — answered locally, "Brilliant is not connected yet", no `_meta` |
| `tools-list-unpaired.json` | `raw/00-tools-list-unpaired.json` (`.reply`) | `tools/list` before pairing — `error -32000`, "No Brilliant surface is connected yet…" (after 45.8 s) |
| `initialize.json` | `raw/10-initialize-connected.json` | `initialize` once paired (`serverInfo.version "1.0.0"`) |
| `tools-list.json` | `raw/00-tools-list.json` | a SUMMARY the probe wrote, not a reply: the 18 tool names + five input schemas. The fake builds its `tools/list` reply from it |
| `init.json` | `raw/18-init.json` (`.reply`) | `init` — `**sessionCanvasId:** \`playground\``, the catalog, a depth-1 blueprint |
| `get-selection-one.json` | `raw/12-get_selection.json` (`.reply`) | one selected: `selectedIds ["630fe03901352c90"]` + `_meta.brilliant` |
| `get-selection-none.json` | `raw/32-get_selection.json` (`.reply`) | nothing selected: `count 0` |
| `get-selection-two.json` | `raw/42-get_selection.json` (`.reply`) | two selected; the blueprint carries a `spans[(0,3,#CFD5E1)]` annotation line |
| `get-selection-no-canvas.json` | `raw/01-get_selection.json` (`.reply`) | `get_selection {}` → `error -32602`, "Missing required property: canvasId" |
| `lookup-blueprint-one.json` | `raw/19-lookup.json` (`.reply`) | `lookup {scope:[id], format:"blueprint", expandInstances:true}` |
| `lookup-blueprint-two.json` | `raw/43-lookup.json` (`.reply`) | the same over both ids — the annotation line again |
| `lookup-unresolved.json` | `raw/13-lookup.json` (`.reply`) | a fill id in scope → `result.isError: true`, "Could not resolve scope item" |
| `lookup-page.json` | `raw/16-lookup.json` (`.reply`) | `lookup {scope:["playground"], format:"summary", depth:0}` → the canvas's top-level elements |
| `export-png.json` | `raw/14-export.json` (`.reply`, data from `14-export.full.b64`) | `export … format:"png"` → 790x402, 2155 bytes |
| `export-thumb.json` | `raw/15-export.json` (`.reply`, data from `15-export.full.b64`) | the same at `width: 160` → 160x81, 315 bytes (a Browse thumbnail) |
| `list-projects.json` | `raw/04-list_projects.json` (`.reply`) | `{"projects":[]}` on the web editor |
