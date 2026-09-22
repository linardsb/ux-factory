# Implementation Report — canvas.html, the run list, canvas-store's routes, and the four arrangement ops (#306)

**Plan**: `.claude/plans/canvas-page-run-list-arrangement-ops-306.md`   **Branch**: `feature/canvas-page-arrangement-ops-306` (worktree `../wt-306`)   **Base**: `eb58d54` → `{{HEAD}}` (origin/main unchanged at `eb58d54` when re-fetched)   **Status**: {{STATUS}}

## Summary

The owner can open a build run from the portal (`#/canvas`), arrange its frames, notes and decision cards on
#302's free canvas, and every change lands in the run package: `ops.jsonl` by append, `canvas.json` rewritten
from the derivation. Four ops arrive in `system/canvas-ops.mjs` (`frame.remove`, `frame.link`, `annotate`,
`variant.add`) plus `frame.size`'s free `width`; `portal/lib/canvas-store.mjs` gains the ledger fold with
last-in-first-out undo lines, the `canvas.json` derivation, the gate predicate `verifyBuild`, the run list, the
decision reader and an append-only, conflict-checked `saveRun`; three routes serve them. One undo stack covers
positions and the document through a `docHook` on the shared verbs. `tooling/canvas-journey.mjs` proves the
page on three engines by booting its own portal.

## Tasks completed

- 0.1 worktree + before-state → `../wt-306` from `origin/main` (`eb58d54`); deps installed in portal, visual-regression, style-dictionary, icons
- 1.1 → `system/device-presets.mjs` (UPDATE): `WIDTH_MIN`/`WIDTH_MAX` 320/2560
- 1.2 → `system/canvas-ops.mjs` (UPDATE): four verbs, `frame.size` width form, `notes`/`variants` guard
- 1.3 → `system/canvas-ops.mjs` (UPDATE): `frameTree`, `placeDecision`
- 1.4 → `tooling/build-checks.mjs` group 35 (UPDATE)
- 2.1–2.2 → `portal/lib/canvas-store.mjs` (UPDATE): `CANVAS_DESCRIPTION`, `foldLedger`, `arrangement`, `positionsOf`, `verifyBuild`, `listBuilds`, `loadDecisions`, `provenanceLabel`, `saveConflict`, `saveRun`
- 2.3 → `discovery/faster-payment/build/canvas.json` (REGENERATED through the store; `ops.jsonl` untouched)
- 2.4 → `tooling/build-checks.mjs` group 36 (REWRITTEN: 36.0–36.10)
- 3.1 → `portal/server.mjs` (UPDATE): `GET /api/canvas/runs`, `GET /api/canvas/run`, `POST /api/canvas/save`, `/handoff/` in the static proxy
- 4.1 → `system/studio-canvas.mjs` (UPDATE): `place()` takes an `id`, refuses a duplicate
- 4.2 → `system/studio-verbs.mjs` (UPDATE): `docHook` boundary check, `$doc` in snapshot, `restore` → `{moving, said}`, `resized` hook, `commit()`; group 13 case
- 4.3 → `system/studio-minimap.mjs` (UPDATE): `scrollend`
- 4.5 → `tooling/studio-journey.mjs` (UPDATE): two hook-off assertions
- 5.1 → `portal/public/canvas.html` (CREATE)
- 5.2–5.4 → `portal/public/canvas.mjs` (CREATE); `.cv-*` rules in `portal/public/portal.css` (UPDATE)
- 5.5 → `portal/public/portal.js` (`renderRuns`, `#/canvas`), `portal/public/index.html` (Canvas link) (UPDATE)
- 6.1 → `tooling/canvas-journey.mjs` (CREATE)
- 7.1 → `CLAUDE.md` (UPDATE); 7.2 → `.claude/references/gates.md`, `discovery/README.md`, `system/canvas-ops.mjs` header (UPDATE)
- 7.4 → `system/loc-summary.json` (REGENERATED); approach baselines {{VR}}

## Tests added

- **Group 35** (build-checks): the roster at ten; `VALID_FOR` fixtures for the four verbs; 35.3b happy fold (n1 minted and edited in place, relink replaces, `width: 600` → `preset: null`, one lane, remove f2 takes a1); 19 new refusals matched on what they name; 35.10 `frameTree` (base set, state override, state's own set on top, hidden node DROPPED, no `hidden` prop anywhere, both trees pass the real `validateComposition`, dangling set flagged, hidden root flagged and kept, unknown frame → `tree: null`, total over junk); 35.11 `placeDecision` (894 then 1206 on the spine, a lower row ignored, junk skipped, junk anchor → origin). 35.9's import regex now matches bare imports.
- **Group 36**: 36.0 discovery floor; 36.1 `checkPackage` over every committed package + the spine's prefix pin; 36.2 D7 control in memory from the frozen prefix; 36.3 four mutations through `verifyBuild`; 36.4 `$description === CANVAS_DESCRIPTION`; 36.5 round trip (unchanged); 36.6 import pin widened by exactly `canvas-ops.mjs` + bare imports + `RUN_SLUG_RE` byte-equal to `discovery.mjs`'s; 36.7 `foldLedger`; 36.8 `saveRun`; 36.9a `provenanceLabel`; 36.9 `listBuilds`/`loadDecisions`; 36.10 the owner's edit stays green.
- **Group 13**: a `docHook` missing `resized` refused by name at the boundary, in Node.
- **studio-journey**: "no document value in the snapshot without a hook (#306)" on `studio.html` and on `/factory`.
- **canvas-journey** (new, operator-run): steps 1–16 of the plan plus 10b (pointer edit) and 12a (page document before reload vs `foldLedger(ops)`); 46 assertions on chromium (the forced-fallback leg is chromium-only), 45 on firefox and webkit.

## Proving the checks

Every mutation was applied, run, and reverted (`git status` clean after each; observed).

| # | Check | Mutation | Went red (observed) | Positive control |
|---|---|---|---|---|
| 1.2 | 35.1/35.2 roster | add the four verbs before touching group 35 | `OPS … not the same six verbs`; `no VALID_FOR fixture for "frame.remove"` (and the other three) | — |
| M0 | 35.3b | `nextId("n", …)` → `nextId("f", …)` | `annotate minted [{"id":"f1",…}]` + the fold threw on the n1 edit | this IS the positive control (run first) |
| 35-a | VALID_FOR | delete `annotate`'s fixture | `no VALID_FOR fixture for "annotate"` | the happy fold applies all four |
| 35-b | frame.remove blocker | variant half dropped (`lanes = []`) | `…variant b — got NO THROW` | the state-blocker case still passes |
| 35-c | frameTree | write `hidden` back instead of dropping | the drop case, the no-`hidden` case, and `validateComposition` refusing `"hidden" is not a prop of text` | both trees validate on the clean tree |
| 35-d | annotate noteId | stop resolving `noteId` | `n9 … got NO THROW` | the edit-in-place case |
| 35-e | placeDecision | `x = anchor.x + anchor.w + gap` | first card at `{"x":422}` | 894/1206 on the clean tree |
| 35.9 | canvas-ops import pin | add `import "node:fs";` | `imports ["node:fs","./device-presets.mjs"]` | — |
| 36.0 | discovery floor | point the dir at an empty scratch dir | `found no committed build package` | faster-payment found |
| 36.6 | store import pin | add `import "@anthropic-ai/claude-agent-sdk";` | **stayed GREEN at first** (regex missed bare imports) → after the regex fix: `imports [… ,"@anthropic-ai/claude-agent-sdk"]` | — |
| 36.7 | foldLedger LIFO | pop without comparing | the wrong-op case `got null` and 36.10's past-load undo | apply-undo-redo equals plain apply |
| 36.8 | saveRun append-only | `saveBuild` truncate-rewrite instead of append | `did not leave the original ledger as a BYTE-identical prefix` | the byte prefix holds on the clean tree |
| 36.3 | embodies derivation | `arrangement` skips embodies edges | `faster-payment: canvas.json edges "e-f1-d7" carries a fact the ops do not` (×2) + the prefix control | — |
| 36.10 | prefix pin | restore `lines.length === 6` | `the owner's edits … turned the per-package check red` | 36.10 green on the clean tree |
| 36.9a | provenanceLabel | root wins | `read {"mismatch":true,"text":"Real product, neutral skin"}` | the agreeing pair |
| R2 | D7 control's source | owner relink dropping decision 7 saved into the spine through `saveRun`; (a) gate as written → **green**; (b) D7 control read off the committed `canvas.json` → `derives nodes ["f1","f2","d8"]` red | (a) is the control | spine restored with `git checkout` |
| G13 | docHook boundary | move the check below `const { stage, scroll }` and touch `stage` | `got stage.querySelector is not a function` | — |
| R1 | hook-off snapshot | `snapshot()` adds `$doc: null` without a hook | both studio-journey rows red: `studio.html […"$doc"…]`, `/factory ["s1",…,"$doc"]` (run on chromium, killed by PID once both printed) | green on the clean tree ({{R1COUNT}}) |
| M1 | canvas-journey 8 | `adapter.restore` pushes no `undone` lines | `8 · ledger line 10 is undone …` (and 9/10 cascade) | clean run 46/46 |
| M2 | canvas-journey 10 | remove `docHook?.resized(...)` | `10 · exactly one new frame.size line from the drag — []` | clean run |
| M3 | canvas-journey 2 | **plan's wording (emit on load) stayed green — absorbed by the save dedupe by design**; R2's wording, save once on load | `2 · ZERO save requests … 1 request(s)` | clean run |
| M4 | health jobsDir | `JOBS_DIR` unset in the child env | `the portal's jobsDir is …/Linards jobs folder, not the scratch dir …` before any leg | clean run |
| M5 | named exit | `child.kill("SIGKILL")` inside step 6 | `chromium threw: portal exited (code null) during 6 · …` (one step earlier than the plan said) | clean run |
| M6 | preflight | `mv portal/node_modules` | `portal/node_modules/@anthropic-ai/claude-agent-sdk is missing — run cd portal && npm ci first … Nothing was spawned.`; 0 scratch dirs left | — |
| M7 | 5b forced fallback clamp | `left = r.left` | **stayed GREEN at 1000 px** → after pinning the button to the right edge at 760 px: `{"l":613.9,…,"r":965.9,…,"vw":760}` red | clean forced leg in view |
| M8 | in-repo notice | `discovery/${run.provenance}/build/` | `2 · the save notice names … discovery/fictional/build/` | clean run |
| M9 | editor tabindex | drop `ed.tabIndex = 0` | **stayed GREEN on keyboard-only step 4** → new step 10b: `10b · a click-then-type edit lands as ONE annotate … []` | clean 10b |
| M10 | 12a page = disk | `pending` carries a different frame.link list than the page applied | `12a · … equals foldLedger(ops.jsonl)` red; the post-reload `12` compare stayed GREEN (why it is no longer the page=disk claim) | clean run |

Assertions no single mutation reddens: none known among the new ones.

## Validation results

| Command | Result | Provenance |
|---|---|---|
| `node tooling/build-checks.mjs \| tail -1` (before, on `eb58d54`) | `build ✓  all 41 groups pass` | observed |
| `node agent-layer/gen-loc-summary.mjs --check` (before) | `loc summary ✓  3 groups — no drift`; runtime 80 files / 32,100 | observed |
| `node tooling/build-checks.mjs \| tail -1` (at `4218800`) | `build ✓  all 41 groups pass` | observed |
| same with `portal/node_modules` moved away | `build ✓  all 41 groups pass` | observed |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · token-css · … · group-count` | observed |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` | observed |
| `node --check portal/public/portal.js portal/public/canvas.mjs tooling/canvas-journey.mjs` | no output | observed |
| Task 3.1 curl smoke (`PORT=4871`) | runs list has faster-payment; `[ 'f1', 'f2' ] 20 What would have to be true for this option to work?`; vocab `200`; evil origin `403`; stale base `409` | observed |
| `node agent-layer/gen-loc-summary.mjs` then `git diff -U0` | runtime `32100 → 32300`, total `40500 → 40700` | observed (the plan derived ~32,300) |
| `node tooling/canvas-journey.mjs chromium` | {{CJ_CH}} | observed |
| `node tooling/canvas-journey.mjs firefox` | {{CJ_FF}} (inspector branch: anchor) | observed |
| `node tooling/canvas-journey.mjs webkit` | {{CJ_WK}} (inspector branch: fallback — the geometry check fired) | observed |
| `studio-journey all` BEFORE (clean `eb58d54` worktree on :4797) | {{SJ_BEFORE}} | observed |
| `studio-journey all` AFTER (wt-306 on :4791) | {{SJ_AFTER}} | observed |
| `catalog-journey all` | {{CAT}} | observed |
| approach baselines (Docker, clean detached worktree) | {{VRRESULT}} | observed |

## Not run

- **Level 4 (manual portal walk)** — not run by hand; journey step 2 performs the same check automatically (opens the in-repo `faster-payment`, asserts zero save requests and an unchanged `git status -- discovery/`).
- **Level 5 (the owner's read in a real browser)** — owner's hand; tracker: epic #295 close-out.
- **CI `verify`, `visual`, `codeql`** — run on the pushed head; not yet pushed. This PR adds a request-body-to-file-write route (`POST /api/canvas/save`) and a new `innerHTML` sink (`renderRuns`, every value through `esc()` / `encodeURIComponent`). If CodeQL reds on either, the fix belongs in this PR.
- **Q2 — accepting the regenerated spine `canvas.json`** — the plan marks it blocking and it is the owner's call; **awaiting the owner**, not accepted.
- **The first baseline attempt** ran against the live worktree on :4791 and was killed at chromium 460 passed / 1 failed ("browser has been closed" — the kill). It is not a baseline; the baseline is the re-run on the clean `eb58d54` worktree.

## Deviations from the plan

- **`.cv-stage .stx-frame { position: absolute; }` in `portal.css`** (plan error). `system/studio.css:348`'s `.stx-frame { position: relative }` overrides the node families' `position: absolute` (`:104`), so frames flow. Measured on `/factory` at `eb58d54`: frame s2's authored `--y` 312 renders at 608. The page restores `absolute` scoped to itself; `studio.css` is not touched (that would move `/factory` at rest, which R1 forbids). **Worth its own ticket — not opened; say if you want one.**
- **"Add note" places the note below everything, not at the view centre** (plan error). At the centre it landed on top of f2 and became unclickable once f2 was re-created (found by step 10b).
- **Journey 5b's forced-fallback leg runs at 760 px with the button pinned to the scroller's right edge**, not at the default viewport (plan error: the clamp mutation stayed green).
- **Journey step 10b and step 12a added** (plan errors: the tabindex mutation and the page=disk claim were unreachable as planned).
- **The import regexes of 35.9 and 36.6 match bare imports** (plan error: 36.6's own REDDENS could not redden).
- **M5 reddens at step 6's boundary** rather than step 7 (the leg aborts naming "portal exited" one step earlier).
- **`frame.size` refusals and `saveRun` error paths map to HTTP 500** through the server's one catch-all, not a 4xx. The plan named only the 409; a refused op never reaches the server from the page (D10).

## Assumptions carried

- Q1 default (no new key; undone line restates the op; LIFO check) — implemented.
- Q2 default (regenerate the spine through the store) — implemented; acceptance awaits the owner.
- Q3 default (`width` joins `preset`, exactly one) — implemented.
- Q4 default (`getCoalescedEvents` deferred) — not implemented.
- Q5 default (no note delete; undo removes a note just added) — implemented.
- Q6 default (`variant.add` grammar only, no page control) — implemented.
- Q7 default (frame.remove cascades arrows and says so) — implemented; the announcement counts them.
- A height-only pointer resize records no `frame.size` op (the width is the document's fact; the height is arrangement and saves as the frame's authored `h`).
- A frame's height is saved only once authored (by canvas.json or a resize); until then it is measured from its content and never written.

## Additions beyond the plan

- `place()` duplicate-id refusal names the id (the plan asked for it; the message is new).
- The canvas page clamps a decision card's transcript answer to four lines (`-webkit-line-clamp`) so a long answer does not dominate the stage.
- Focus stays on a frame's Details button across a re-render of that frame (re-inserting a focused node blurs it).

## Issues encountered

- The first studio-journey baseline would have taken ~2.5 h reading the live worktree, which blocked Phase 4. It was killed and re-run from a clean detached worktree (`~/Documents/wt-306-base`, :4797) so `system/` could be edited meanwhile.
- About fifteen canvas-journey runs overlapped the re-run baseline. studio-journey carries timing-sensitive INP rows, so before/after are compared by the SET of ✗ lines, not by pass counts.
- Port 4792 was held by a sibling session's server; the baseline used 4797, checked with `curl | cmp` against the base tree.
