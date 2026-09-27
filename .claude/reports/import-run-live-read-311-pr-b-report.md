# Implementation Report — import-run PR B: the live Brilliant read over a direct stdio client (#311)

**Plan**: `.claude/plans/import-run-live-read-311-pr-b.md`   **Branch**: `feat/import-run-live-read-311` (worktree
`wt-311b`)   **Base**: `c909518` → `c909518` (origin/main did not move; re-fetched before the final gate run)
**Status**: COMPLETE (Task 8.1's edit to #311's body awaits the owner's OK — see Not run)

## Summary
"Import selection" now works against real Brilliant, with no model and no SDK on the import path. A
built-ins-only stdio JSON-RPC client (`portal/lib/brilliant-mcp.mjs`) replaces the SDK relay. It holds the one
fence site at `call()` and the only parsers of Brilliant's wire shapes, each shape pinned by a committed
capture. The panel gains a binding line (Check binding / Re-bind), Browse the page (up to 12 thumbnails,
multi-select, a per-session cache) and the pairing refusal in the bridge's own words. The converter no longer
reads a `spans[…]` styled-range line as an element. The work was split between three implementation
subagents (Tasks 1.1–4.3 · 6.1 + 7.1 + 7.2 plumbing) and the coordinator (5.1, 8.1, 8.2, validation).

#474 and #475 are **not in this PR**. Per the owner's 2026-09-27 call they ship as separate PRs. Their plans
were written in parallel with this one.

## Tasks completed
- 1.1 captures → `import/fixtures/brilliant-live/` (16 `.json` + `README.md`) (CREATE)
- 1.2 fake bridge → `tooling/fake-brilliant-bridge.mjs` (CREATE)
- 2.1 annotation rule → `import/brilliant.mjs` `parseTree` (UPDATE)
- 2.2 · 3.3 · 4.3 gates → `tooling/build-checks.mjs`: 40.28, 43.1–43.3 rewritten, 43.11–43.13 new (UPDATE)
- 3.1 · 3.2 client + parsers + `classifyBridge` → `portal/lib/brilliant-mcp.mjs` (CREATE)
- 4.1 · 4.2 reader on the client, SDK removed, `bindingStatus`, `browse`, `busy` refusal → `portal/lib/import-run.mjs` (UPDATE)
- 5.1 routes `POST /api/canvas/import/binding`, `GET /api/canvas/import/browse`, `ids` validation → `portal/server.mjs` (UPDATE)
- 6.1 binding line, Browse, the new refusal actions → `portal/public/canvas-import.mjs`, `portal/public/portal.css` (UPDATE)
- 7.1 · 7.2 I1/I5 changed, I9 · I10 · I10b · I11 new, `--live-brilliant` → `tooling/canvas-journey.mjs` (UPDATE)
- 8.1 architecture amendment + Addendum 2026-09-27 → `docs/epics/canvas-design-import.architecture.md` (UPDATE)
- 8.2 docs → `.claude/references/gates.md` (groups 40, 43, `canvas-journey`), `CLAUDE.md` map (two lines),
  `discovery/README.md` (transcript line types + pairing), PR A plan AMENDMENTS line (UPDATE)

## Tests added
- build-checks **40.28**: the committed two-selected capture converts to exactly the two element ids, with the
  `spans` line as one `never-read` row.
- **43.11**: every parser over every committed capture, with a set-equality check that each capture is read.
- **43.12**: `runImport` → `readBrilliant` → the client → the fake, over seven modes plus a SYNTHETIC `_meta`
  project and a non-JSON line.
- **43.13**: Browse (cache, refresh, a SYNTHETIC 14-element page truncated to 12), `bindingStatus`, and `busy`
  under a held lock.
- **43.1–43.3** rewritten for the client: no SDK/zod/@modelcontextprotocol anywhere; the fence at one site with
  no `tools/call` reaching the fake on a denial; `classifyBridge` over every outcome.
- canvas-journey **I9** (paired: binding line, import, the reference image shown, a mapping edit), **I10**
  (unpaired: one action "Import again" plus the bridge's words), **I10b** (Re-bind click → the binding POST),
  **I11** (Browse: two tiles → one two-id record → cached), and the owner-run **`--live-brilliant`** leg.

## Proving the checks
| Check | Mutation | Failure line (observed) | Restored |
|---|---|---|---|
| 40.28 | `parseTree` annotation branch disabled | `40.28: source.ids read ["630fe03901352c90","36cc06ddb7e3a767","spans[(0,3,#CFD5E1)]"] …` | green |
| 40.28 control | filter looks for `"nomatch"` | `40.28: the positive control — … with 1 spans rows … expected … and none` | green |
| 43.1 | SDK `await import` put back in `readBrilliant` | `43.1: portal/lib/import-run.mjs names the Agent SDK, zod or @modelcontextprotocol (static or dynamic) …` | green |
| 43.2 | request written before `decide` | `43.2: create_modify_elements reached the fake bridge as a tools/call — the request left the portal before the fence decided` | green |
| 43.2 control | `decide` denies everything | `43.2: the positive control — get_selection reached the fake 0 times …` | green |
| 43.3 | not-paired match string changed | `43.3: the committed unpaired tools/list error classified {…"kind":"not-reachable"…} — expected not-paired` | green |
| 43.11 | `parseSelection` scrapes `/[0-9a-f]{16}/g` | `43.11: parseSelection one/none/two read ids [["630f…","9df0cbadf986e307"],[],[…3 ids]] …` | green |
| 43.11 | sha check removed | `43.11: parseExport accepted a PNG with one byte flipped …` | green |
| 43.11 control | list-projects read removed | `43.11: 16 captures on disk, 15 read — unread: ["list-projects.json"]` | green |
| 43.12 | `source.project` hard-coded null | `43.12: SYNTHETIC — a capture whose _meta names project "Faster Payment" wrote source.project null …` | green |
| 43.13 | cache disabled | `43.13: a second browse answered cached false after 2 new exports …` | green |
| 43.13 | busy catch disabled | `43.13: browse / bindingStatus during an import answered {} / undefined — a busy refusal naming "an import" …` | green |
| I9 | child on `FAKE("none-selected")` | `✗ I9 · Import selection → a record, not a refusal  {"kind":"nothing-selected","message":"Nothing is selected in Brilliant.",…}` | green |
| I10 | `retry` branch removed from `showRefusal` | `✗ I10 · clicking "Import again" sends the import again (one click, one request)  no POST /api/canvas/import followed the click` | green |

The driver itself was proven on known-bad input: both journey mutations above went red on the page, and the
fake's `none-selected` mode produced the real refusal shape.

## Validation results (all observed, on the final tree at base c909518)
- Level 1: `node --check` on the seven touched `.mjs` files → silent.
- `node tooling/build-checks.mjs` → `build ✓  all 46 groups pass`. Also 46/46 with `portal/node_modules` moved
  aside (43.1's premise; subagent run, observed).
- `node tooling/drift-check.mjs` → `✓ syntax · … · group-count`.
- `node tooling/token-lint.mjs` → `✓ 63 contract tokens · 0 undeclared · 0 orphan`.
- `node import/regen-expected.mjs` → both `expected verdict ✓`, and `git status import/` shows no committed
  verdict moved. `node tooling/regen-import-records.mjs --check` → `4 files, 187933 bytes, no drift`.
- Task 5.1 smoke (port 4817, fake `paired`, killed by `$!`):
  - `/binding` → `{binding:{project:null,…,surface:"web"},canvasId:"playground",selected:1}`
  - `/browse` → 2 elements, then `cached:true` on the second call
  - `ids:["zz"]` → 400 `ids: "zz" is not a Brilliant element id`
- `node tooling/canvas-journey.mjs all` → chromium 95 / firefox 94 / webkit 94 passed, 0 failed (PR A:
  65/64/64).
- **`node tooling/canvas-journey.mjs chromium --live-brilliant` → 9 passed, 0 failed, against a real paired
  brilliant.design tab (owner-run, 2026-09-27, $0).** AC #1a (real) met.
- Level 5 CodeQL, run locally with bundle 2.27.0, `--codescanning-config`, the `javascript-security-extended`
  suite: 31 results, 15 high. **None is new in this diff.**
  - Two high results sit in touched files, and both lines exist unchanged on origin/main:
    `canvas-journey.mjs:144` (main :121, `js/file-system-race`) and `import-run.mjs:377` (main :445,
    `nextMapping.parts[edit.path]`, `js/remote-property-injection`, PR A's code).
  - Zero results in `brilliant-mcp.mjs` or `fake-brilliant-bridge.mjs`.
  - `gh api …/code-scanning/alerts?ref=refs/heads/main&state=open` → no open alerts.
  - The CI gate's own verdict on the PR is the authority.

## Not run
- Task 8.1's second half: editing #311's AC #2 wording (`gh issue edit 311`). The diff was shown to the owner
  and is awaiting their OK; tracker: the PR body.
- The "Showing 12 of N" line on the PAGE: the fake has two elements. The server side is gated by 43.13's
  SYNTHETIC 14-element page.
- 44×44 is measured on the first Browse tile only.

## Deviations from the plan
- **Captures re-serialised with a 2-space indent**, values unchanged. The plan says "verbatim". The JSON values
  are byte-for-byte the bridge's; only whitespace differs, and the fixture README says so.
- **The binding line after an import** comes from sessionStorage and is shown after the reload with "· at the
  last Brilliant read". The plan said to update it from the response, but the page reloads at once, so the
  update would never be seen.
- **A refused binding check** reads "Reads: unknown — the check was refused" and shows the refusal.
- **The I9 driver** captures the import response through a Playwright route, because the reload discards it.
- **I5** runs through the shared `withPortal` helper (so it gains the HEAD/jobsDir/stale check), and I10b has
  its own `hang-call` child.
- **`--live-brilliant`** runs only the live leg and refuses any engine but chromium (exit 2).
- **Additions to the client and reader**: `openBridge` also returns `notify()`; the extra `classifyBridge`
  inputs, `failureOf()`, and a browse with `depth: 0` plus `total`. Each is logged in the plan's AMENDMENTS
  with its reason.
- **Two synthetic group-40 ids lengthened to 16-hex** (plan error: Task 2.1's GOTCHA missed them).
- **Task order**: part of 43.1/43.2 landed with 4.1, not 3.3 (plan error: removing the SDK exports would
  otherwise crash build-checks mid-sequence).

## Assumptions carried
- A1: one bridge process per read, binding check or browse. Each binding poll in the live leg starts a fresh
  bridge.
- A2: `init`'s `sessionCanvasId` is the canvas in view. It held on the live run's canvas. It remains unverified
  on a multi-canvas project.
- A3: the project name falls back to "this tab's project (name not exposed)" when `_meta` carries empty
  strings.
- A non-JSON stdout line is a protocol error that reaches the catch-all as a 500, not a refusal.

## Additions beyond the plan
- The fake's `overrides`, `garbage` mode and `MODES` export (for the SYNTHETIC cases and the edge case the plan
  lists).
- The journey driver cleans up its children on an uncaught crash. An early mutation run orphaned four of this
  worktree's portal children; they were identified by their scratch `JOBS_DIR` and killed by PID.

## Issues encountered
- A first local CodeQL attempt failed on a wrong binary path (`codeql/codeql` vs `codeql`); it was re-run.
- Planning for #474 found that only this PR's live read writes `reference.png`, so #474 must branch after this
  PR merges.
