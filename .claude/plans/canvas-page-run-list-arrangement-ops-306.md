# Feature: canvas.html, the run list, canvas-store's routes, and the four arrangement ops (#306)

The following plan should be complete, but validate documentation and codebase patterns and task sanity
before you start implementing. Pay special attention to the names of existing utils, types and models, and
import from the right files.

## Feature Description

The owner opens a build run in the portal, arranges its frames, sticky notes and decision cards on the free
canvas #302 shipped, and every change lands in the run package on disk: `ops.jsonl` (the truth,
append-only) and `canvas.json` (the arrangement, derived plus authored positions). Four new ops arrive in
`system/canvas-ops.mjs`, which holds the epic's op-verb lock for this ticket: `frame.remove`, `frame.link`,
`annotate` and `variant.add`. The page is `portal/public/canvas.html`, a module page on the same
`system/studio-*.mjs` substrate `studio.html` and `/factory` use. The SPA gains a run list that links to it.

## User Story

As the owner, operating the factory on my laptop,
I want to open a build run in the portal and arrange its screens, notes and the decisions they embody on a
free canvas, with every edit undoable and saved to the run package,
So that the package on disk is the design, and a stakeholder can audit each screen against the decision
that produced it.

## Problem Statement

#302 retired the grid and proved the build document with one committed spine
(`discovery/faster-payment/build/`), but nothing can edit a build package. `canvas-store.mjs` has no route
(`portal/lib/canvas-store.mjs:9-11`), no page renders a `canvas-ops` document (observed: no `studio-*.mjs`
imports `canvas-ops.mjs`), there is no way to remove a frame, link one to a decision, write a note, or
declare a variant, and undo exists only for positions (`system/studio-verbs.mjs:280-332`).

## Solution Statement

Six layers, in dependency order:

1. **Grammar** — four ops plus a `width` form of `frame.size` in `canvas-ops.mjs`, and two pure reads the
   page needs: `frameTree` (a frame's renderable composition, with sets, overrides and hides resolved) and
   `placeDecision` (where a newly linked decision card sits by default).
2. **Store** — `canvas-store.mjs` gains the ledger fold (`foldLedger`, with last-in-first-out undo lines),
   the `canvas.json` derivation (`arrangement`), the gate predicate (`verifyBuild`), the run list
   (`listBuilds`), the decision reader (`loadDecisions`) and an append-only `saveRun`. All Node-only, so
   none of it costs runtime lines of code.
3. **Routes** — `GET /api/canvas/runs`, `GET /api/canvas/run`, `POST /api/canvas/save` in `server.mjs`,
   behind the existing origin guard, plus `/handoff/` added to the static proxy so the page can fetch
   the vocabulary.
4. **System seams** — `place()` accepts an `id`; `mountCanvasVerbs` accepts an optional `docHook`
   adapter so ONE snapshot stack covers positions and the document (T9); the minimap listens for
   `scrollend` (T7).
5. **The page** — `canvas.html` + `canvas.mjs` + `.cv-*` rules in `portal.css`; the SPA's `#/canvas` route.
6. **The gate** — `tooling/canvas-journey.mjs`, three engines, booting its own portal against a scratch
   jobs folder; build-checks groups 35 and 36 widened.

## Out of Scope / Non-Goals

- **Not included: the compose loop** (`canvas-session.mjs`, agent `screen.compose` proposals) — later
  ticket. This page arranges what the ledger already holds; it creates no screens.
- **Not included: the variant lane UI and the per-variant completeness check** — #314. `variant.add`
  lands as grammar + group 35 cases only, with no control on the page.
- **Not included: `group.define` / `group.place`** (#315), import (#311), ratify (#313). They queue behind
  this ticket's op lock in that order: #311, #313, #315.
- **Not included: decision supersede and stale frames** (D2, #318). The card shows the decision the id
  names; it does not follow `supersedes`.
- **Not included: deleting a note.** `annotate` creates and edits; undo removes a note just added. See Q5.
- **Not included: embodies arrows drawn on the canvas.** The edges are derived into `canvas.json`; on the
  page the link shows as the card's "Embodied by" line and the frame caption's chips. `setArrows` draws
  one arrow style, and a dashed embodies line would need a relation-aware overlay nobody asked for yet.
- **Not included: `getCoalescedEvents`** — deferred, flagged Q4.
- **Not changing: `/factory`, `studio.html`, `instance.html`.** The three system seams are additive and
  inert without their new arguments; `studio-journey all` must stay green to prove it.
- **Not changing: `portal.js` stays a classic script.** It gains one hash route and nothing that imports.
- **Not changing: CI.** `canvas-journey.mjs` is operator-run like every journey driver
  (`tooling/studio-journey.mjs:31-38`); nothing is added to `verify.yml`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (~1,300–1,600 lines across 13 files; one new driver)
**Primary Systems Affected**: `system/canvas-ops.mjs` · `system/device-presets.mjs` ·
`system/studio-canvas.mjs` · `system/studio-verbs.mjs` · `system/studio-minimap.mjs` ·
`portal/lib/canvas-store.mjs` · `portal/server.mjs` · `portal/public/{canvas.html,canvas.mjs,portal.js,
portal.css,index.html}` · `tooling/build-checks.mjs` (groups 13, 35, 36) · `tooling/canvas-journey.mjs` ·
`tooling/studio-journey.mjs` (two assertions, R1) ·
`discovery/faster-payment/build/canvas.json` · docs
**Dependencies**: none new. Playwright is resolved out of `tooling/visual-regression/node_modules` as every
driver does; the portal's own `node_modules` must be installed locally to boot it (it is, observed).

## Related Work

**Implements**: #306 · **Epic**: #295, `docs/epics/canvas-design-import.architecture.md` (inherited: the
op vocabulary and ledger line shape § Data model; the bus as the only drive contract § Boundaries; R1's
provenance branch; the origin guard; T7/T8/T9; placement rule § Other eng-lead calls)

**Back-references**:

- `.claude/plans/canvas-swap-grid-retired-free-substrate-302.md` — the substrate, `canvas-ops.mjs`, the
  spine, group 35/36. Its forward reference (`:153`) names this ticket's scope.
- `.claude/plans/measured-box-and-params-refusals-437.md` — `plainData` exists because this page composes
  ops in memory (`system/canvas-ops.mjs:139-144`).
- `.claude/plans/icon-primitive-gen-icons-305.md`, `list-primitive-through-the-chain-303.md` — the
  vocabulary the page renders against.

**Forward-references**:

- #311 (import), #313 (ratify), #315 (groups) take the op lock after this in that order; #314 builds the
  lane UI on `variant.add`; #318 extends `frame.link` into re-confirm; #319's inbox reads `listBuilds`.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/canvas-ops.mjs` (whole file, 385 lines) — the grammar you extend. `OPS` `:56-63`, `PARAMS`
  `:68-75`, `OPTIONAL` `:79-82`, `emptyDoc` `:91`, `nextId` `:96-100`, `checkOp` `:105-137`,
  `plainData` `:145-153`, `applyOp` `:168-303` (switch `:192-301`), `applyOps` `:305-316`, `resolve`
  `:333-348`, `missingStates` `:358-370`, `canDeleteBasePart` `:377-385`.
- `system/device-presets.mjs` (40 lines) — `DEVICE_PRESETS`, `PRESET_NAMES`, `presetWidth`.
- `portal/lib/canvas-store.mjs` (83 lines) — `saveBuild` truncates and rewrites (`:46-47`) despite the
  header's "append-only"; `loadBuild(root)` takes the **`build/`** dir, not the package root.
- `portal/lib/discovery.mjs:79-111` — `RUN_SLUG_RE`, `assertRunSlug`, `resolveRunRoot` (returns the
  **package** root), `assertProvenanceRoot`. Reuse; do not re-implement.
- `portal/server.mjs:36-57` (`serveFile`, `json`, `readBody` with its 1 MB cap), `:68-69` (the origin
  guard, before all routing, every method), `:203-218` (the GET and POST route shapes to mirror),
  `:167-199` (a 409 returned as a value, not thrown — `resumeMismatch`), `:397` (the `/system/` +
  `/assets/` static proxy; the ticket's `:153` is wrong), `:400` (the `PUBLIC_DIR` fallback — `canvas.html`
  and `canvas.mjs` are served with no route).
- `portal/lib/env.mjs:23` — `JOBS_DIR` honours `process.env.JOBS_DIR`, which is how the journey isolates.
- `studio.html:81-167` — the boot sequence to mirror: `initStudioCanvas()` → `canvas.place(...)` →
  `createBus()` → `mountCanvasVerbs(canvas, {bus})` → `mountCanvasSelect(canvas, {bus})`.
- `system/studio-canvas.mjs:60,69,106-108` (`FRAME_CLASS`, `MOVABLE`, `NODE_W/H/GAP`), `:133-145`
  (`setPos`), `:347,352` (the `role="status"` announcer and `say`), `:611-667` (`place()` — mints
  `s<n>` at `:624-626` with no id parameter), `:684-716` (`setArrows`, resolves endpoints by
  `data-stx-id`).
- `system/studio-verbs.mjs:280-332` (`createHistory`), `:362-372` (`mountCanvasVerbs` signature and
  boundary checks), `:428-439` (`snapshot`), `:568-590` (`restore`), `:741-773` (the `ui.resize`
  consumer; its `history.push` is `:770`), `:873-896` (`restoreVerb`, the undo/redo consumers),
  `:1305` (the body-drag `interactive` guard — a `contenteditable` without `tabindex` is NOT in it),
  `:1545-1555` (Cmd/Ctrl+Z on the scroller), `:1559-1577` (the returned handle).
- `system/studio-minimap.mjs:206` (mount signature), `:303-306` (`schedule`), `:369` (the scroll listener).
- `system/studio-layers.mjs:141` (`mountStudioLayers(root, { canvas, select })`).
- `system/action-bus.mjs:53-54` — `SOURCES`, and `TYPE_RE` allows exactly one dot: `ui.frame-remove`, never
  `ui.frame.remove`.
- `system/agentic-renderer.mjs:46` (`validateComposition` — enum-checks every prop key, so a `hidden` prop
  is refused), `:139-163` (the `id` node key → `data-part`), `:689` (`renderComposition`).
- `system/inspect.mjs:57,95-106,150-162` + `system/components.css:3165-3176` — the Popover + anchor
  positioning precedent with a JS-positioned fallback.
- `portal/public/portal.js:7-11` (`api()`), `:1495-1500` (the router), `portal/public/index.html:16-24`
  (the header bar the Canvas link joins), `portal/public/portal.css:198-204` (the 44px target rules).
- `tooling/build-checks.mjs:11077-11368` (group 35 "canvas ops": `:11102-11118` roster pinned at SIX,
  `:11120-11138` `VALID_FOR`, `:11140` happy fold, `:11198` refusals, `:11354-11365` import pin),
  `:11373-11531` (group 36 "build package": `:11405` pins `lines.length === 6`, `:11409-11414` every line
  `applied` and `owner`, `:11423-11453` the reproduce compare assuming every node is a frame, `:11455-11488`
  the mutations, `:11522-11529` the store's node-built-ins import pin).
- `tooling/studio-journey.mjs:31-52` (operator-run header, Playwright via `createRequire`), `:133-146`
  (stale-serve guard), `:521-543` (a leg's `t()` and `open()`), `:7420-7432` (the engine loop and exit code).
- `discovery/faster-payment/build/{ops.jsonl,canvas.json}` — the spine: six owner ops, frames `f1`, `f2`,
  arrow `a1`, and `f1.decisionRefs = ["7","8"]` with **no** decision nodes or embodies edges yet.
- `discovery/faster-payment/transcript.jsonl` — 30 op lines, 20 of them `record_decision`; the decision
  id is the line's `seq`. Seq 7 = `s1-what-would-have-to-be-true` (answer `a4`), seq 8 =
  `s2-riskiest-assumption` (`a5`), seq 10 = `s4-appetite` (`a7`).
- `discovery/README.md:498-608` — the build half's format section you update.

### New Files to Create

- `portal/public/canvas.html` — the module page shell.
- `portal/public/canvas.mjs` — the page's module: load, render, verbs, inspector, save queue; exports
  `getCanvasPage()` as the driver seam.
- `tooling/canvas-journey.mjs` — the three-engine journey that boots its own portal.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [MDN: Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) — `popover="auto"`,
  `showPopover()`, light dismiss. Why: the frame inspector.
- [MDN: CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning)
  — `anchor-name`, `position-anchor`, `position-area`. Why: the inspector sits by its frame; Firefox
  needs the JS fallback `inspect.mjs` already carries.
- [MDN: `scrollend` event](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event) —
  feature-detect with `"onscrollend" in window`. Why: T7's minimap sync.
- [MDN: `contenteditable`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable)
  — the `plaintext-only` value; detect support by assigning it and reading `el.contentEditable` back.
  Why: T8's note editor with the `<textarea>` fallback.
- [WCAG 2.2 SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)
  and [SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) —
  the AC says 44×44, which is SC 2.5.5 (AAA) sizing; 2.5.8 is the AA floor at 24. Build to 44.
- `.claude/references/gates.md:59,61,80-121` — group 35/36 entries and the journey-driver section.

### Patterns to Follow

**A verb is four edits, together** (`system/canvas-ops.mjs:50-55`, `:66-67` + `tooling/build-checks.mjs:11120`):
an `OPS` entry, a `PARAMS` entry (EXACT), a `switch` case, and a group 35 `VALID_FOR` fixture. The
`VALID_FOR` loop fails by name on a verb with no fixture (`build-checks.mjs:11130`).

**Refusals name the path and the reason, and name the blocker** — mirror `state.add`'s twin refusal:

```js
// system/canvas-ops.mjs:238-241
const twin = next.frames.find((f) => f.baseId === base.id && f.stateKey === p.stateKey);
if (twin) {
  throw new Error(`state.add: "${base.id}" already carries a "${p.stateKey}" state (${twin.id}) — one design per state per screen, …`);
}
```

**Ids minted from the document, never carried by an op** — `nextId("n", new Set(next.notes.map((n) => n.id)))`
(`canvas-ops.mjs:96-100`). `annotate`'s `noteId` is an EDIT target and must resolve, or it becomes the
smuggling slot the rule forbids.

**Reads are total over junk; refusals throw** (`canvas-ops.mjs:318-325`). `frameTree` and `placeDecision`
return a value for any input; the applier throws.

**Route shape** (`portal/server.mjs:203-218`): resolve the package root with the pair
`resolveRunRoot` + `assertProvenanceRoot`, name every body parameter (never a spread — the comment at
`:131-139` says why), delegate to a `portal/lib` function, `json(res, code, value)`. A conflict is a
returned message mapped to 409 (`:193-197`), not a thrown error.

**Store IO idioms** (`canvas-store.mjs:44-51`): `mkdirSync` recursive, `appendFileSync` per JSONL line,
`JSON.stringify(x, null, 2) + "\n"` for a whole-file JSON rewrite, errors name the file and the 1-based line.

**Bus verbs** (`system/studio-verbs.mjs:1536-1543`): a control emits `{type, source}` with
`source: e && e.detail === 0 ? "keyboard" : "pointer"`; one consumer applies; the consumer announces
through `canvas.say`.

**44px targets** (`portal/public/portal.css:198-204`): `min-height: 44px; min-width: 44px` on buttons,
`min-height: 44px` on select/input, and a checkbox gets its hit area from its label.

**A driver's leg** (`tooling/studio-journey.mjs:521-543`): `t(name, cond, extra)` counts; the engine loop
prints `── <engine>: N passed, M failed` and exits non-zero on any failure.

---

## DECISIONS THIS PLAN TAKES (each flagged where it touches an epic-level shape)

- **D1 — the undo line restates the op it undoes, and carries no new key** (Q1). The pinned line shape is
  `{seq, at, source, op, params, status, fromStep?}`. An undo appends
  `{seq, at, source: "owner", op, params, status: "undone"}` whose `op`/`params` deep-equal the op being
  undone. Undo is last-in-first-out, so `foldLedger` checks the undone line against the TOP of the
  effective stack and throws naming both seqs on a mismatch. Redo appends the same op again as a new
  `applied` line. `proposed` and `refused` lines are skipped (no page writes them yet).
- **D2 — `frame.size` gains a free `width`, exactly one of `preset`/`width`** (Q3). `width` is an integer in
  `[WIDTH_MIN, WIDTH_MAX] = [320, 2560]` (exported from `device-presets.mjs`); it sets `preset: null`. The
  committed spine's two `frame.size` lines carry `preset` only and stay valid. The edge-drag is #219's
  existing corner handle (`.stx-resize`), whose single-pointer click-move-click path already exists
  (`studio-verbs.mjs:1390`); the inspector adds an exact numeric width input.
- **D3 — `annotate {noteId?, text}`**: no `noteId` creates `n<k>`; a `noteId` edits and must resolve. Blank
  text is refused, so a note abandoned empty records nothing. No delete (Q5).
- **D4 — `frame.link {frameId, decisionRefs}` REPLACES the frame's list.** One verb covers link, unlink and
  #318's re-confirm. Each ref is a non-empty string, no duplicates. The applier cannot see the transcript,
  so `saveRun` refuses a ref that resolves to no `record_decision` WHEN the package has a transcript, and
  accepts any ref when it has none (the stand-in: flagged, not blocked).
- **D5 — `frame.remove {frameId}`** is refused while any state names the frame as its base or any variant
  overrides it, naming each blocker. Arrows touching the frame go with it, and the announcement counts them
  (Q7).
- **D6 — `variant.add {key, overrides}`**: key `/^[a-z0-9][a-z0-9-]{0,23}$/`, unique; `overrides` is a plain
  object whose keys each resolve to a frame and whose values are plain objects. Grammar only (Q6).
- **D7 — embodies edges and decision nodes derive from `frame.decisionRefs`, whichever op set them.** So the
  committed spine's `canvas.json` is regenerated through the store to add `d7`, `d8` and two embodies edges
  (Q2). Decision node id `d<ref>`, ref `decision:<ref>`; embodies edge id `e-<frameId>-d<ref>`; note node
  ref `note:<id>`.
- **D8 — one undo stack, through a named hook** (T9). `mountCanvasVerbs(canvas, { bus, ledger, docHook })`
  where `docHook = { capture(), restore(value), resized(id, box) }`. `snapshot()` adds `$doc: capture()`;
  `restore(snap)` calls `docHook.restore(snap.$doc)` BEFORE positions; the `ui.resize` consumer calls
  `docHook.resized(id, sized)` immediately before its `history.push` (`:770`); the handle gains
  `commit()`. No bus-registration-order dependency anywhere. The option is NOT named `document`: the mount
  body calls the DOM global `document.addEventListener` at `studio-verbs.mjs:1529`, and a destructured
  `document` would shadow it and throw on every page that passes no hook (`/factory`, `studio.html`).
- **D9 — the gate predicate is Node-only.** `foldLedger`, `arrangement`, `verifyBuild` live in
  `canvas-store.mjs`, which now imports `../../system/canvas-ops.mjs` (SDK-free, pinned by 35.9). Group
  36.6's pin widens by exactly that one path.
- **D10 — the save is append-only, synchronous and conflict-checked.** The page sends
  `{provenance, slug, base, ops, positions}`; the server compares `base` to the ledger's line count and
  appends with no `await` between, so two tabs get a 409 instead of an interleaved ledger. An op the
  applier refuses writes nothing and is announced; it is never recorded as `refused` (that status is a
  proposal's).
- **D11 — the page never saves without a gesture.** Placement on load (including default placement of a
  decision card missing from `canvas.json`) goes through `canvas.place`, never the bus; saves are
  scheduled only from a bus wildcard consumer.
- **D12 — the label reads `run.json` first.** `provenanceLabel({declared, root})`: the package's own
  `run.json` provenance wins, the root is the fallback, and a disagreement is flagged on the page. The
  ticket's "fictional flow, neutral skin" is asserted on the in-repo fictional package.

---

## RISKS AND HOW THE PLAN CLOSES THEM

Each risk names the tasks that close it, the check that proves it closed, and what is left. A risk whose
proof has no reddening mutation is not closed.

### R1 — the undo hook edits a module `/factory` and `studio.html` run on

**Risk.** `studio-verbs.mjs` is shared. A slip in the `docHook` path (a snapshot that gains a key without a
hook, a changed `restore()` return shape, a boundary check that runs too late) breaks the public
`/factory` canvas, which no canvas-journey step opens.

**Closed by:**
- Task 0.1 measures `studio-journey all` on the untouched tree first, so "the counts must not drop" is
  compared with this machine's own numbers, not a number copied from an old report.
- Task 4.2 places the `docHook` boundary check beside the `bus` check (`:370-372`), before any DOM access,
  and adds a group 13 ("verbs") case that drives it in CI. Every call through the hook is `docHook?.`.
- Task 4.5 adds two `studio-journey` assertions: on `/studio.html` and on `/factory`, with no hook passed,
  `getVerbs().snapshot()` has no `$doc` key.
- Task 7.4's baseline run must rewrite the three approach PNGs and NO `factory-*.png`. An at-rest change
  to `/factory` would show up there as a fourth file.

**Proof (REDDENS):** make `snapshot()` add `$doc: null` unconditionally → Task 4.5's two assertions fail
by page. Move the `docHook` check below `const { stage, scroll } = canvas` and have it touch `stage` → the
group 13 case fails with an error that does not name `resized`.

**Residual.** Motion on `/factory` that neither driver asserts (none is known).

### R2 — the committed spine becomes editable, and CI pins it

**Risk.** Group 36 pinned the spine at six `applied` lines and asserted its decision cards directly. The
owner's first edit through the page (an appended line, or unlinking decision 7) would turn CI red. The
reverse risk: a gate run, or a stray gesture, rewriting a committed package nobody meant to change.

**Closed by:**
- Task 2.4 runs one per-package function, `checkPackage(slug, pkg)`, over every committed package
  (`verifyBuild` plus the ledger rules) and a PREFIX pin on the spine's first six lines. The D7 positive
  control (d7, d8, `e-f1-d7`, `e-f1-d8`) is computed IN MEMORY from those six frozen lines, never read
  off the committed `canvas.json`, so an owner's later unlink cannot red it.
- Task 2.4's new case 36.10 simulates the owner: on a scratch copy of the spine it saves, through the real
  `saveRun`, a note, a relink that DROPS decision 7, a `frame.remove` of f2 and its undo, then runs
  `checkPackage` on the result → no failures. That proves the owner's edit stays green, rather than
  assuming it.
- The page cannot undo past its own load (the history starts at load), so no page action can touch the
  first six lines: they stay a prefix by construction, and 36.10 includes a direct attempt (an `undone`
  line restating line 6 appended on top of an owner line) that `foldLedger` refuses.
- Task 5.1 shows, for an in-repo package, "Saves into this repo at `discovery/<slug>/build/` — commit to
  keep it, or `git checkout` the folder to discard." Journey step 2 asserts the notice.
- Journey: `git status --porcelain -- discovery/` is identical before and after every leg, and step 2
  opens the in-repo package with ZERO save requests.

**Proof (REDDENS):** restore the old `lines.length === 6` pin → 36.10 fails naming the line count. Assert
the D7 control against the committed `canvas.json` and run 36.10's relink against a scratch copy wired in
as the committed dir → it fails. Make the page save once on load → journey step 2 fails.

**Residual.** An owner edit committed in an unrelated PR. That is review's job, and the notice says where
the bytes went.

### R3 — the journey is the first driver to boot the portal

**Risk.** The portal is one process name across every session on this machine. A driver that talks to the
wrong portal gives a green run over the wrong tree (memory `stale-serve-wrong-tree`). A driver that dies
mid-run can leave a child process holding a port, or a scratch dir with a copy of a transcript. And
`server.mjs` statically imports the Agent SDK through `lib/chat.mjs:3`, so a missing
`portal/node_modules` fails as an unexplained crash.

**Closed by (all in Task 6.1):**
- A preflight that refuses by name when `portal/node_modules/@anthropic-ai/claude-agent-sdk` is absent:
  "run `cd portal && npm ci` first".
- The server path is resolved from the journey file's own location (`import.meta.url`), so the child runs
  THIS worktree's code. `/api/health` must report `jobsDir === scratch`, `bootSha` equal to this worktree's
  `git rev-parse HEAD`, and `stale: false`.
- The scratch dir comes from `mkdtempSync(os.tmpdir())` and is asserted to be outside the repo and not the
  default jobs folder, so the real `_discovery/` is never read or written.
- The child's stdout and stderr go to `<scratch>/portal.log`. An early exit (`child.on("exit")`) or a
  15 s health timeout prints the log's last 40 lines and exits 1 with the reason. A port lost to a race
  (EADDRINUSE in the log) is retried once on a new port.
- Teardown in `finally`, and in `SIGINT`/`SIGTERM` handlers: `SIGTERM` to the child's PID, `SIGKILL`
  after 3 s if it is still alive, then `rmSync(scratch, { recursive: true })`. Never a name-pattern kill
  (memory `portal-smoke-port-scoped-kill`).

**Proof (REDDENS):** start with `JOBS_DIR` unset in the child env → the `jobsDir` assertion fails before
any leg. Kill the child from inside step 6 → step 7 fails naming "portal exited (code …)", not a timeout.
Rename `portal/node_modules` → the preflight refusal prints and nothing is spawned.

**Residual.** A second copy of the journey running at the same moment. Each run gets its own port and
scratch dir, so the two runs cannot see each other.

### R4 — the line-count cascade on the approach page

**Risk.** New lines in `system/` move the runtime count the approach page shows. The known ways this goes
wrong are all recorded: a count taken before staging reads the old blobs; a branch behind `main` drifts in
CI only; `update:docker` skips a one-digit change inside its pixel tolerance and leaves a stale number in
a green baseline; and the approach page's count-up animation can flake one run.

**Closed by (Task 7.4, rewritten):**
- Merge `origin/main` first, then stage, then regenerate. The regen decision is MEASURED: diff
  `runtime.linesApprox` in `system/loc-summary.json`. It moved → three approach PNGs. It did not →
  none. Only `total` moved → `loc-summary.json` alone.
- The baselines are regenerated from a clean detached worktree of the COMMITTED head under `/Users`, with
  the `rm` inside the container after `npm ci`, so a failed install cannot leave the tree short.
- Afterwards: `git status --porcelain tooling/visual-regression/baselines/` lists exactly the three
  approach PNGs, and each new PNG is opened and its rendered count read against `loc-summary.json` by eye,
  because the pixel gate's tolerance can hide a changed digit.
- After the push: `gh pr view --json headRefOid` must equal local `HEAD` before any check result is
  trusted. An approach-only `visual` failure reading "two consecutive stable screenshots" is re-run once
  before it is treated as a regression (memory `vr-gate-approach-countup-flake`).

**Proof.** CI `verify` (the drift leg) and `visual` green on the pushed head, with the read-back above.

**Residual.** None known beyond CI's own flake rate.

### R5 — the inspector popover off-screen on the fallback path

**Risk.** Firefox takes the JS-positioned fallback when `CSS.supports("anchor-name: --a")` is false. A
fallback that places the popover off-screen hides the device and decision controls from a pointer user,
and makes the 44 px measurement read a clipped box.

**Closed by:** Task 5.4's fallback clamps the popover inside the viewport, and flips it above its button
when there is no room below. It sets `data-cv-pos` to `"anchor"` or `"fallback"`. Journey step 5b asserts,
on every engine, that the open popover's rect lies fully inside the viewport, and records which branch
ran. It then FORCES the fallback on chromium with `page.addInitScript` stubbing `CSS.supports` for
`anchor-name` (the forced-fallback shape `system/components.css:3165-3168` already names) and asserts the
same. Targets are measured after `scrollIntoView` and a settled scroll.

**Proof (REDDENS):** remove the clamp → the forced-fallback leg fails on a frame near the right edge (the
journey opens the rightmost frame's inspector on purpose).

**Residual.** Anchor positioning's visual placement on an engine that supports it is not pixel-gated.
The owner's Level 5 read covers it.

---

## IMPLEMENTATION PLAN

### Phase 0: branch and before-state

Branch from `origin/main` in a dedicated worktree (parallel sessions share the main checkout — memory
`shared-worktree-parallel-sessions`). Record the before-state.

### Phase 1: the grammar

`canvas-ops.mjs` + `device-presets.mjs` + group 35. Pure, CI-reachable, no DOM.

### Phase 2: the store

**Depends on:** Phase 1 (the fold and the derivation apply ops).
`canvas-store.mjs` + group 36 generalised + the spine's `canvas.json` regenerated.

### Phase 3: the routes

**Depends on:** Phase 2.
`server.mjs`: three routes and `/handoff/` in the static proxy.

### Phase 4: the system seams

**Independent of:** Phases 2–3 (it touches only `system/studio-*`). Can run in parallel with them.
`place()` id, the verbs' document hook + `commit()`, minimap `scrollend`; then `studio-journey all`.

### Phase 5: the page and the run list

**Depends on:** Phases 1, 3, 4.

### Phase 6: the journey

**Depends on:** Phase 5.

### Phase 7: docs, then the generated cascade last

**Depends on:** everything staged. `loc-summary` and the approach baselines are regenerated after the
last `system/` edit is staged, never before (memory `loc-summary-counts-tracked-only`).

---

## STEP-BY-STEP TASKS

### Task 0.1 — CREATE the worktree and record the before-state

- **IMPLEMENT**:
  ```bash
  git fetch origin
  git worktree add ../wt-306 -b feature/canvas-page-arrangement-ops-306 origin/main
  cd ../wt-306 && (cd portal && npm ci) && (cd tooling/visual-regression && npm ci) && (cd tooling/style-dictionary && npm ci) && (cd tooling/icons && npm ci)
  node tooling/build-checks.mjs | tail -1
  node agent-layer/gen-loc-summary.mjs --check
  PORT=4791 node tooling/visual-regression/serve.mjs &   # rooted at THIS worktree
  BASE=http://127.0.0.1:4791 node tooling/studio-journey.mjs all | tail -5   # R1's baseline counts
  ```
- **VALIDATE**: observed on `34ffc82` (2026-09-22): `build ✓  all 41 groups pass`;
  `loc summary ✓  3 groups — no drift`; `system/loc-summary.json` runtime `files: 80, linesApprox: 32100`.
  Exact runtime count 32,109 (derived: `wc -l` total 32,029 + 80 files, because the generator counts
  `split("\n").length` per file, `agent-layer/gen-loc-summary.mjs:45`). Record the per-engine
  `studio-journey` counts in the report; Task 4.4 compares against them (R1). The last recorded run was
  chromium 537 · firefox 533 · webkit 533 (`.claude/reports/factory-canvas-width-pin-retired-433-report.md:101`).
- **GOTCHA**: `git branch --show-current` in the same command as every commit. Stage by explicit path; the
  main checkout carries untracked plans and transcripts that are not yours.
- **SATISFIES**: none (setup). **REGENERATES**: none.

### Task 1.1 — UPDATE `system/device-presets.mjs`: the width bounds

- **IMPLEMENT**: `export const WIDTH_MIN = 320;` and `export const WIDTH_MAX = 2560;` with one comment: 320
  is the narrowest phone still in use (the iPhone SE's logical width) and 2560 a wide desktop; the
  bounds exist so a free width is refused by name rather than clamped silently, and the page's numeric
  input reads the same two numbers.
- **PATTERN**: `device-presets.mjs:28-33` (frozen data, a comment per choice).
- **VALIDATE**: `node -e 'import("./system/device-presets.mjs").then(m=>console.log(m.WIDTH_MIN,m.WIDTH_MAX))'`
  → `320 2560` (expected).
- **SATISFIES**: device mode (G20). **REGENERATES**: runtime LOC (batched to Task 7.4).

### Task 1.2 — UPDATE `system/canvas-ops.mjs`: four verbs, and `frame.size`'s width form

- **IMPLEMENT**:
  - Import `WIDTH_MIN, WIDTH_MAX` beside the existing names from `./device-presets.mjs` (the import PATH is
    unchanged, so 35.9's pin `["./device-presets.mjs"]` stays green).
  - `OPS` gains, in this order after `disconnect`: `"frame.remove"`, `"frame.link"`, `"annotate"`,
    `"variant.add"`. Rewrite the comment above it: #306 lands four of the eight; the remaining four
    (`group.define`, `group.place`, `component.propose`, `proposal.ratify`) are #315/#313's.
  - `PARAMS`: `"frame.size": ["frameId", "preset", "width"]`, `"frame.remove": ["frameId"]`,
    `"frame.link": ["frameId", "decisionRefs"]`, `annotate: ["noteId", "text"]`,
    `"variant.add": ["key", "overrides"]` — each inner array frozen.
  - `OPTIONAL`: `"frame.size": ["preset", "width"]`, `annotate: ["noteId"]`.
  - `applyOp` guard: after the frames/arrows check add `next.notes ??= []; next.variants ??= [];` (a
    document saved before #306 may lack neither, but a hand-built one in a test may).
  - `frame.size`: exactly one of `preset`/`width` is present, else throw
    `frame.size: give "preset" or "width", exactly one — this op carried ${…}`. The `preset` branch is
    unchanged. The `width` branch: `Number.isInteger(p.width) && p.width >= WIDTH_MIN && p.width <= WIDTH_MAX`,
    else throw naming the range; then `f.preset = null; f.width = p.width;` with a comment that `null` is
    the recorded fact "custom, chosen by dragging or typing", not a missing value.
  - `frame.remove`: resolve the frame; `states = next.frames.filter((x) => x.baseId === f.id)`;
    `lanes = next.variants.filter((v) => v && Object.hasOwn(v.overrides ?? {}, f.id))`; if either is
    non-empty throw
    `frame.remove: "${id}" is still overridden — ${states.map(s => `${s.stateKey} (${s.id})`)} ${lanes.map(v => `variant ${v.key}`)} — remove those first, because each is this frame plus its differences and would be left overriding nothing`.
    Otherwise splice it out and filter `next.arrows` to those whose `from.frameId` and `to.frameId` are
    both not `f.id`.
  - `frame.link`: resolve the frame; `decisionRefs` must be an array of non-empty strings with no
    duplicates, else throw naming which rule failed and the offending value; `f.decisionRefs = [...p.decisionRefs]`.
    Comment: REPLACES the list, so one verb is link, unlink and #318's re-confirm; the applier cannot see
    the transcript, so existence is the save route's check (D4).
  - `annotate`: `text` must be a string with non-whitespace content, else throw
    `annotate: "text" must say something — a note left blank records nothing (T8)`. With `noteId`:
    find it in `next.notes` or throw `annotate: noteId "${id}" does not resolve — this document holds …;
    an op names a note to EDIT, never the id of one it creates`, then set `.text`. Without: push
    `{ id: nextId("n", new Set(next.notes.map((n) => n.id))), text: p.text }`.
  - `variant.add`: key must match `/^[a-z0-9][a-z0-9-]{0,23}$/` and be new; `overrides` a plain object
    (not array, not null); each key resolves through `frame(key, "overrides key")`; each value a plain
    object. Push `{ key: p.key, overrides: p.overrides }`. Comment: stored as an override map keyed by
    frame id (G33); the lane UI and per-variant check are #314's.
- **PATTERN**: `canvas-ops.mjs:193-301` for every case; `:238-241` for naming a blocker.
- **IMPORTS**: none new beyond the two names.
- **GOTCHA**: `p` is already a clone (`:179`), so storing `p.decisionRefs`/`p.overrides` directly is safe;
  do not add a second clone. Keep the `default:` case (`:298-300`).
- **GOTCHA**: `frame.remove` must not reuse `canDeleteBasePart` — that asks about a PART; this asks about a
  whole frame. Different question, different message.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "canvas ops|all .* groups"` → RED at this
  point, naming `OPS … are not the same six verbs` and `no VALID_FOR fixture for "frame.remove"` (expected
  — Task 1.4 fixes the pins; this red is the proof the roster checks reach the new verbs).
- **SATISFIES**: AC #2. **REGENERATES**: runtime LOC (Task 7.4).

### Task 1.3 — ADD two pure reads to `system/canvas-ops.mjs`: `frameTree` and `placeDecision`

- **IMPLEMENT**:
  - `frameTree(doc, frameId) → { tree, flags }` — the renderable composition for a frame, or
    `{ tree: null, flags: [{ kind: "unknown-frame", frameId }] }`. For a base frame: the base's
    `composition` with `base.sets` applied. For a state: the same, then `state.overrides`, then the state's
    own `sets`. **Reuse `resolve()`**: flatten the tree to `parts = {id: props}` (nodes without an `id`
    cannot be addressed and pass through), fold `resolve({parts}, layer)` over the layers
    `[{set: base.sets}, state?.overrides, {set: state?.sets}]` (skipping absent ones, concatenating
    `flags`), then write props back by id and DROP every node whose resolved props carry `hidden: true`.
    The written-back props must never contain `hidden` — `validateComposition` enum-checks prop keys and
    would refuse it (`agentic-renderer.mjs:46`). An `overrides.add` (G19 dialogs, later) is flagged
    `{kind: "unsupported-add"}` and ignored. A hidden ROOT is flagged `{kind: "hide-root"}` and kept.
  - `placeDecision(anchor, taken, size = { w: 280, h: 160 }, gap = 32) → {x, y}` — the default spot for a
    decision card: in the anchor's ROW, to the right of everything already in it. A box is in the row when
    its vertical band `[y, y + (h ?? size.h))` intersects the anchor's; `x = max(right edges of the row's
    boxes) + gap`, `y = anchor.y`. A second card for the same row therefore lands right of the first,
    whatever either renders as in height. `taken` is AUTHORED boxes (from `canvas.json` or this session's
    placements), never measured ones, so the page and the Node regeneration compute the same answer.
    Deterministic, total (junk boxes skipped). Comment: one rule for both sides, so no position in a
    committed file was hand-chosen; and why not "right of the anchor": on the spine that is x 422, on top
    of f2 at x 472.
- **PATTERN**: `resolve` `:333-348` (flag, never drop), `missingStates` `:358-370` (total over junk).
- **GOTCHA**: `canvas-ops.mjs` may import `./device-presets.mjs` and nothing else (35.9). The 280/160/32
  literals stay local; do not import `NODE_GAP` from `studio-canvas.mjs`.
- **VALIDATE** (expected, after Task 1.4): the spine's `frameTree(doc, "f1").tree` contains
  `hint: "We check this against the name you gave."`; `frameTree(doc, "f2").tree` contains
  `label: "Send anyway"` and the non-match hint.
- **SATISFIES**: AC #3 (the card sits beside its frame), the page's render path. **REGENERATES**: Task 7.4.

### Task 1.4 — UPDATE `tooling/build-checks.mjs` group 35 ("canvas ops")

- **IMPLEMENT**:
  - 35.1: the roster is TEN (`:11103`), message updated; import `WIDTH_MIN, WIDTH_MAX` beside the preset
    names (`:11095`).
  - 35.2 `VALID_FOR`: `"frame.remove": { frameId: "f2" }`, `"frame.link": { frameId: "f1", decisionRefs: ["7"] }`,
    `annotate: { text: "check the copy with legal" }`, `"variant.add": { key: "b", overrides: { f1: { set: {} } } }`.
  - 35.3 happy fold, extended through `fold`: compose f1, state f2 on f1, connect f1→f2, `annotate` →
    `n1`; `annotate {noteId:"n1", text}` edits in place (still one note); `frame.link` replaces
    `["7","8"]` with `["10"]`; `frame.size {width: 600}` → `preset === null && width === 600`;
    `variant.add` → one lane; then `frame.remove f2` on a doc WITHOUT the lane → f2 gone and `a1` gone.
  - 35.4 refusals, each through `names(fn, …words)`: `frame.remove` of f1 while f2 exists names
    `error (f2)`; of f1 while a lane overrides it names `variant b`; unresolved frameId; `frame.link` with a
    string, with `[""]`, with `["7","7"]`; `annotate` with `"   "`, with `noteId: "n9"` (names "does not
    resolve"), with `text: 7`; `variant.add` with key `"B!"`, a duplicate key, an overrides key `f9`, an
    array overrides, a non-object value; `frame.size` with both, with neither, with `width: 319`,
    `2561`, `390.5`.
  - NEW 35.x `frameTree`: over a hand-built doc whose composition carries ids — base `sets` land; a state's
    `set` lands on top; `hide` DROPS the node and no node anywhere in the returned tree has a `hidden`
    prop; the returned tree passes the real `validateComposition` against
    `handoff/verdant/vocabulary.json` (import from `../system/agentic-renderer.mjs`, Node-safe at import);
    a dangling set is flagged `dangling-set`; an unknown frame → `tree: null`.
  - NEW 35.x `placeDecision`: with the spine's two frames (`f1` 0/0/390, `f2` 472/0/390, no heights) the
    first card lands at `{x: 894, y: 0}` and a second, with the first in `taken`, at `{x: 1206, y: 0}`; a
    box in a lower row does not move it; junk in `taken` does not throw.
  - REDDENS for it: place at `anchor.x + anchor.w + gap` → the first case reads x 422, not 894.
  - Update the `group("canvas ops", …)` detail string: what it now covers and what it cannot reach
    (whether the page RENDERS the tree — `canvas-journey`).
- **PATTERN**: `build-checks.mjs:11099-11100` (`threw`, `names`), `:11140-11197` (`fold`).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build canvas ops|all .* groups"` →
  `build canvas ops ✓` and `all 41 groups pass` (expected; group 36 is untouched until Phase 2 and
  still green because the spine's ops are unchanged).
- **REDDENS**:
  - Delete `"annotate"` from `VALID_FOR` → `no VALID_FOR fixture for "annotate"`.
  - In `frame.remove`, drop the variant half of the blocker test → the `variant b` refusal case fails with
    `NO THROW`.
  - In `frameTree`, write `hidden: true` back instead of dropping → the "no hidden prop" case fails, and
    `validateComposition` refuses the tree naming `hidden`.
  - In `annotate`, stop checking that `noteId` resolves → the `n9` case fails with `NO THROW`.
  - **Positive control first**: before trusting the refusals, confirm the happy fold's `n1` assertion fails
    when `nextId("n", …)` is changed to `nextId("f", …)`.
- **SATISFIES**: AC #2. **REGENERATES**: none (build-checks is not counted).

### Task 2.1 — UPDATE `portal/lib/canvas-store.mjs`: fold, derive, verify

- **IMPLEMENT**:
  - Header: replace "NO ROUTE IN THIS PR" with the #306 facts; replace "NO SDK, AND NOTHING THAT COULD
    REACH ONE. It imports node:fs and node:path and nothing else" with: node built-ins plus
    `../../system/canvas-ops.mjs`, itself pinned SDK-free by group 35.9; group 36.6 pins exactly this set.
    Correct the "APPEND-ONLY" paragraph: `saveBuild` writes a NEW package whole (the spine, the round
    trip); `saveRun` is the live path and only appends.
  - `import { applyOps, emptyDoc } from "../../system/canvas-ops.mjs";` plus `readdirSync, statSync`.
  - `CANVAS_DESCRIPTION` — the committed `$description` text, amended to say nodes include notes and
    decision cards and edges include `embodies`, keeping all four divergences' wording (group 36.4
    asserts them by name).
  - `foldLedger(lines) → { doc, effective }` where `effective` is the applied lines in stack order. Status
    `applied`/`accepted` push; `proposed`/`refused` skip; `undone` requires a non-empty stack whose top's
    `{op, params}` deep-equals the line's (canonical sorted-key compare, as build-checks' `deep`), else
    throw `foldLedger: line ${i+1} (seq ${l.seq}) undoes ${l.op} but the last applied op is seq ${top.seq}
    (${top.op}) — undo is last-in-first-out`; any other status throws naming it. Then
    `doc = applyOps(effective.map(({op, params}) => ({op, params})))`.
  - `arrangement(doc, positions) → { $description, nodes, edges }`. Nodes: every frame
    `{id, type: "frame", x, y, width: f.width, ...(h != null && {height: h}), ref}` with ref
    `state:${stateKey} of ${baseId}` or `screen:${screenId}` (group 36.2's exact strings); every note
    `{id, type: "note", x, y, width: pos.w, height?, ref: "note:<id>"}`; every decision ref in frame order
    then ref order, deduplicated, `{id: "d<ref>", type: "decision", …, ref: "decision:<ref>"}`. Key order
    `id, type, x, y, width, height?, ref` (the committed file's). Edges: arrows
    `{id, fromNode, toNode, relation: "flows"}`, then embodies `{id: "e-<f>-d<ref>", fromNode: f,
    toNode: "d<ref>", relation: "embodies"}`. A node with no entry in `positions` throws naming its id.
  - `positionsOf(canvas) → {id: {x, y, w?, h?}}` — `w` for non-frames only (a frame's width is derived).
  - `verifyBuild({ ops, canvas }) → string[]` — empty means clean. Ledger shape (seqs 1-based and gapless,
    `at` an ISO string ending `Z`, `source` ∈ owner|agent, `status` in the enum, no `"x":`/`"y":` in any
    serialised line); `foldLedger` does not throw; `deep(arrangement(doc, positionsOf(canvas)))` equals
    `deep(canvas)` — each mismatch reported naming the node or edge id.
- **PATTERN**: `canvas-store.mjs:44-51`, `:63-82` (name the file and the 1-based line).
- **GOTCHA**: `verifyBuild` takes positions FROM the file it checks, so a moved node can never fail it (the
  #302 inverse case, kept), while any node or edge the ops do not produce, or a width they disagree with,
  always does.
- **VALIDATE**: Task 2.4's group 36.
- **SATISFIES**: AC #1 (the gate predicate). **REGENERATES**: none (`portal/` matches no loc group).

### Task 2.2 — UPDATE `portal/lib/canvas-store.mjs`: list, read, append-only save

- **IMPLEMENT**:
  - `listBuilds(roots) → [{ provenance, slug, label, hasTranscript }]`, `roots = [{provenance, dir}]`.
    Missing `dir` → none. Children: `isDirectory()`, name matches `/^[a-z0-9-]{1,48}$/` (the discovery
    slug rule — skip, never throw, since `discovery/` also holds `bank.mjs` and `README.md`), and has a
    `build/` directory. `label` from `run.json`'s `label` when it parses, else `null`. Sorted by
    provenance then slug.
  - `loadDecisions(pkgRoot) → null | [{ id, questionId, answerRef, answer, wrongIf, level }]` — `null` when
    there is no `transcript.jsonl` (the stand-in). Otherwise every line with `type === "op"` and
    `op === "record_decision"`; `id = String(line.seq)`; `answer` joined from `answers.jsonl` by `ref`
    (null when absent). A malformed line throws naming file and line.
  - `provenanceLabel({ declared, root }) → { text, mismatch }` — the honesty contract's label. `declared`
    (run.json's `provenance`) wins when present, because it is the package's own statement about its
    content; the root is the fallback. `fictional` → "Fictional flow, neutral skin"; `real` → "Real
    product, neutral skin"; `mismatch: true` when both are known and differ. Why: the journey copies the
    fictional Faster Payment package into the real root for isolation, and labelling it by root would call
    a fictional scenario real.
  - `listBuilds` rows also carry `declared` (run.json's provenance, or null) so the SPA row shows the same
    label.
  - `saveConflict(buildRoot, base) → string | null` — the message when `base !== ` the ledger's line count.
  - `saveRun(pkgRoot, { base, ops, positions, decisions }, { now = () => new Date().toISOString() } = {})`
    — ALL SYNCHRONOUS. Read the ledger; stamp each incoming `{op, params, status}` as
    `{seq: base + i + 1, at: now(), source: "owner", op, params, status}`; refuse any `status` other than
    `applied`/`undone` (the page writes nothing else); fold existing + new (a refusal throws before any
    write); when `decisions` is an array, refuse a `frame.link` ref not among their ids; derive
    `arrangement(doc, positions)` (throws on a missing position before any write); then append the lines
    and rewrite `canvas.json`. Return `{ count: base + ops.length }`.
- **GOTCHA**: `saveRun` takes the PACKAGE root (it needs `transcript.jsonl` for nothing — decisions are
  passed in — but `build/` is `join(pkgRoot, "build")`). `loadBuild`/`saveBuild` keep taking `build/`.
  Name the parameter `pkgRoot` vs `buildRoot` everywhere so the two cannot be crossed silently.
- **GOTCHA**: no `await` anywhere in `saveConflict` → `saveRun`. That is what makes the 409 hold between
  two tabs.
- **VALIDATE**: Task 2.4.
- **SATISFIES**: scope bullet 2, D4, D10. **REGENERATES**: none.

### Task 2.3 — REGENERATE `discovery/faster-payment/build/canvas.json` through the store (Q2)

- **IMPLEMENT**: a throwaway script in your scratch dir (never committed): `loadBuild` → `foldLedger` →
  positions = `positionsOf(existing canvas)` plus, for `d7` then `d8`, `placeDecision(f1Box, takenSoFar)`
  over the AUTHORED boxes (f1 and f2 carry no height, so none is invented) → expected `d7` at 894/0 and
  `d8` at 1206/0 → `writeFileSync` of `arrangement(...)` in the store's JSON idiom. Record the script's
  text and output in the report.
- **GOTCHA**: `ops.jsonl` is not touched: `git diff --stat discovery/faster-payment/build/ops.jsonl` must
  be empty.
- **VALIDATE**: `git diff discovery/faster-payment/build/canvas.json` shows only the new `$description`
  text, two `decision` nodes and two `embodies` edges (expected).
- **SATISFIES**: D7. **REGENERATES**: this file.

### Task 2.4 — UPDATE `tooling/build-checks.mjs` group 36 ("build package")

- **IMPLEMENT**:
  - 36.0 NEW: discover every committed `discovery/*/build/` via `listBuilds([{provenance: "fictional", dir:
    join(ROOT_DIR, "discovery")}])`; FLOOR: at least one, and `faster-payment` is among them.
  - 36.1: one local function, `checkPackage(slug, pkg)`, runs `verifyBuild(pkg)` and reports each failure
    with the slug; it is called for every committed package here and again by 36.10 (R2).
    The spine-specific pins become a PREFIX pin, so the owner arranging the spine through the page cannot
    red CI while a rewritten history still does: the spine has at least six lines and lines 1–6's `op`s
    are `screen.compose, frame.size, state.add, frame.size, screen.set, connect` with line 1's screenId
    `add-payee`. Remove the `lines.length === 6` and every-line-`applied` pins (`:11405`, `:11413`).
  - 36.2: replace the hand-rolled compare (`:11423-11453`) with `verifyBuild`. The D7 positive control is
    computed IN MEMORY from the spine's frozen first six lines: `arrangement(foldLedger(lines.slice(0, 6)).doc,
    positions)` carries nodes `d7`, `d8` and edges `e-f1-d7`, `e-f1-d8`. It never reads the committed
    `canvas.json`, so an owner who later unlinks decision 7 cannot red it (R2).
  - 36.3 mutations, all through `verifyBuild`: corrupted `screenId` → a failure naming the ref (kept); a
    MOVED frame → still `[]` (kept); an embodies edge dropped from the canvas → fails; an extra `note`
    node the ops never made → fails ("carries a fact the ops do not").
  - 36.4: the committed `$description` equals `CANVAS_DESCRIPTION`, and still names all four divergences.
  - 36.5 (round trip): unchanged.
  - 36.6: the store's imports must be node built-ins plus exactly `../../system/canvas-ops.mjs`.
  - 36.7 NEW `foldLedger`: apply, undo (pops), redo (re-applied line) → same doc as the plain apply; an
    `undone` line restating the WRONG op throws naming both seqs; `proposed`/`refused` skipped; an unknown
    status throws.
  - 36.8 NEW `saveRun` on a scratch copy of the spine (`mkdtempSync(join(tmpdir(), …))`): the original bytes
    of `ops.jsonl` (length read at run time, not hard-coded) are a byte-identical prefix after an append (append-only, measured); lines are stamped
    `owner` with gapless seqs; a refused op (`frame.remove f1`) throws AND leaves both files byte-identical;
    `status: "proposed"` refused; an unresolved `frame.link` ref refused when `decisions` is an array and
    accepted when it is `null`; a missing position refused naming the id; `saveConflict` returns a message
    for a stale `base` and `null` for the right one.
  - 36.9a NEW `provenanceLabel`: declared fictional + root real → "Fictional flow, neutral skin" with
    `mismatch: true`; declared null + root real → "Real product, neutral skin", no mismatch; declared
    fictional + root fictional → no mismatch. REDDENS: prefer the root → the first case reads "Real
    product".
  - 36.9 NEW `listBuilds` over a scratch tree (a good package, a dir without `build/`, a file, a slug with
    a capital, and an absent root) → exactly the good one; `loadDecisions` on faster-payment → 20
    decisions, id `"7"` with `answerRef "a4"`; on a dir with no transcript → `null`.
  - 36.10 NEW, the owner's edit stays green (R2): on a scratch copy of the spine, `saveRun` a note, a
    `frame.link` on f1 with `["8"]` (dropping decision 7), a `frame.remove` of f2 and its `undone` line;
    then `checkPackage` on the result → no failures, and the prefix pin still holds. Then append an
    `undone` line restating line 6 on top of the owner's last applied line → `foldLedger` refuses it
    (the history before load cannot be undone).
  - Rewrite the `group("build package", …)` detail string to say all of the above and what it cannot reach
    (the page — `canvas-journey`).
- **PATTERN**: `build-checks.mjs:11393-11402` (guard every call that can throw, so `ok()` failures print).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build build package|all .* groups"` →
  `✓` and `all 41 groups pass` (expected). Then `node tooling/drift-check.mjs` → clean.
- **REDDENS**:
  - 36.0: point the discovery dir at an empty scratch dir → `found no committed build package`.
  - 36.6: add `import "@anthropic-ai/claude-agent-sdk";` to the store → the pin names it. Revert.
  - 36.7: in `foldLedger`, pop without comparing → the wrong-op case fails with `NO THROW`.
  - 36.8: make `saveRun` call `saveBuild` (truncate-rewrite) → the byte-prefix case fails.
  - 36.3: make `arrangement` skip embodies edges → the committed spine itself fails 36.2.
  - 36.10: restore the old `lines.length === 6` pin → 36.10 fails naming the line count.
- **SATISFIES**: AC #1 (the #302 gate on any fixture). **REGENERATES**: none.
- **GOTCHA** (memory `gate-prose-has-three-copies`): the group's detail string, `gates.md:59/61` and any
  fixture header all state what the group covers; update all three in Task 7.2.

### Task 3.1 — UPDATE `portal/server.mjs`: three routes and the `/handoff/` proxy

- **IMPLEMENT**:
  - Import `listBuilds, loadBuild, foldLedger, loadDecisions, saveConflict, saveRun` from
    `./lib/canvas-store.mjs`; `questionById` from `../discovery/bank.mjs`.
  - `GET /api/canvas/runs` → `json(res, 200, listBuilds([{ provenance: "fictional", dir: path.join(REPO_DIR, "discovery") }, { provenance: "real", dir: path.join(JOBS_DIR, "_discovery") }]))`.
  - `GET /api/canvas/run?provenance&slug` → `root = resolveRunRoot(...)`; `assertProvenanceRoot(...)`;
    `pkg = loadBuild(path.join(root, "build"))` (404 when `null`); `{ doc, effective } = foldLedger(pkg.ops)`;
    `decisions = loadDecisions(root)` each enriched with `question: questionById(d.questionId)?.text ?? null`;
    `label = provenanceLabel({ declared: <run.json's provenance, or null>, root: provenance })`;
    respond `{ provenance, slug, label, doc, effective: effective.map(({op, params}) => ({op, params})),
    count: pkg.ops.length, canvas: pkg.canvas, decisions }`.
  - `POST /api/canvas/save` → `b = await readBody(req)`; resolve + assert the root; `conflict =
    saveConflict(path.join(root, "build"), b.base)`; 409 with it if set; else
    `json(res, 200, saveRun(root, { base: b.base, ops: b.ops, positions: b.positions, decisions: loadDecisions(root) }))`.
    Every parameter named.
  - `:397`: `p.startsWith('/handoff/')` joins `/system/` and `/assets/` — read-only committed pack files.
- **PATTERN**: `server.mjs:203-218`, `:193-197`.
- **GOTCHA**: the origin guard at `:68-69` already runs before these; add nothing. Do not write a real
  (`JOBS_DIR`) package inside the repo — `assertProvenanceRoot` refuses it, which is why every route runs
  the pair.
- **VALIDATE** (observed-able now, run it):
  ```bash
  PORT=4871 node portal/server.mjs & PID=$!; sleep 2
  curl -s localhost:4871/api/canvas/runs | head -c 300
  curl -s 'localhost:4871/api/canvas/run?provenance=fictional&slug=faster-payment' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s);console.log(r.doc.frames.map(f=>f.id),r.decisions.length,r.decisions.find(d=>d.id==="7").question)})'
  curl -s -o /dev/null -w '%{http_code}\n' localhost:4871/handoff/verdant/vocabulary.json
  curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Origin: http://evil.example' localhost:4871/api/canvas/save -d '{}'
  kill $PID
  ```
  Expected: the runs array includes `{"provenance":"fictional","slug":"faster-payment",…}`;
  `[ 'f1', 'f2' ] 20 What would have to be true for this option to work?`; `200`; `403`.
- **GOTCHA** (memory `portal-smoke-port-scoped-kill`): kill by PID, never by name pattern.
- **SATISFIES**: scope bullets 1–2, origin guard. **REGENERATES**: none.

### Task 4.1 — UPDATE `system/studio-canvas.mjs`: `place()` accepts an `id`

- **IMPLEMENT**: `place(node, { x, y, w, h, name, component, kind, id } = {})`. In the create branch
  (`:624-626`), `wrap.setAttribute("data-stx-id", id ?? \`s${nextId}\`)` — still increment `nextId` so a
  mixed page cannot collide. Refuse an id already on the stage with a thrown Error naming it (a second
  node answering `setArrows`' lookup would draw arrows to the wrong one). Comment: #306's page places
  build-document nodes under the document's own ids (`f1`, `n1`, `d7`) so `setArrows` resolves them.
- **VALIDATE**: `node tooling/build-checks.mjs | tail -1` → `all 41 groups pass` (expected; group 12
  exercises `place` through its stub — run it rather than assume).
- **SATISFIES**: arrows resolve on the page. **REGENERATES**: Task 7.4.

### Task 4.2 — UPDATE `system/studio-verbs.mjs`: the document hook and `commit()` (D8)

- **IMPLEMENT**:
  - Signature `mountCanvasVerbs(canvas, { bus, ledger, docHook } = {})` — never `document` (D8: it would
    shadow the global used at `:1529`, the only bare `document.`/`window.` use in the mount body,
    grepped). Validate at the boundary, BESIDE the bus check (`:370-372`) and before
    `const { stage, scroll } = canvas`: when present, `capture`, `restore` and `resized` must be
    functions, else throw naming the missing one (R1).
  - `snapshot()`: when `docHook` is set, `out.$doc = docHook.capture()` after the node loop. `$doc` can
    never collide with a `data-stx-id`.
  - `restore(snap)`: FIRST `const said = docHook && snap.$doc !== undefined ? docHook.restore(snap.$doc) : null;`
    (this re-creates or removes nodes), then the existing position loop; return `{ moving, said }` — update
    `restoreVerb` (`:873-887`), which is `restore`'s only caller (`:874`, grepped) so "Nothing to undo." is said only when nothing moved AND `said` is empty,
    and a non-empty `said` leads the sentence.
  - `ui.resize` consumer: between `setPos` and `history.push(snapshot())` (`:769-770`), call
    `docHook?.resized(id, sized)`. Comment: a named hook rather than a second bus consumer, so a resize is
    ONE history entry holding the new width in both the arrangement and the document, with no dependency on
    the order consumers were registered in.
  - Handle: `commit()` → `history.adopt(snapshot()); history.push(snapshot()); syncControls();` — the
    page's call after it applies an op.
  - Header: one paragraph under call 4 stating that #306 extends the snapshot's CONTENTS with an opaque
    document value, the stack itself unchanged.
- **PATTERN**: `:741-773` (a consumer's adopt → apply → push → say → sync).
- **GOTCHA**: without a `docHook`, every snapshot must be byte-identical to today's (no `$doc` key),
  because `/factory` and `studio.html` deep-compare them. Run `studio-journey all` (Task 4.4).
- **ADD** to group 13 ("verbs", closes at `build-checks.mjs:3397`): call `mountCanvasVerbs` with a stub
  handle `{ stage: {}, scroll: {}, say() {}, armMoveHandles() {} }`, a stub bus, and
  `docHook: { capture() {}, restore() {} }` → throws naming `resized`. It runs in Node because the check
  sits before any DOM access, and the `finally` (`:1580-1584`) only touches `viewport?.`. Update the
  `group("verbs", …)` detail string.
- **REDDENS**: move the `docHook` check below the first `stage.` use → the case fails with an error that
  does not name `resized`.
- **VALIDATE**: `node tooling/build-checks.mjs | tail -1` → `all 41 groups pass` (expected; group 13
  imports this file's pure exports and must still load).
- **SATISFIES**: T9, AC #1's undo step, R1. **REGENERATES**: Task 7.4.

### Task 4.3 — UPDATE `system/studio-minimap.mjs`: `scrollend` (T7)

- **IMPLEMENT**: after `:369`, `if ("onscrollend" in window) scroll.addEventListener("scrollend", schedule, { passive: true, signal });`
  with a comment: a guaranteed final sync after momentum scrolling ends; the rAF-coalesced `scroll`
  listener stays the live path, so an engine without `scrollend` loses nothing.
- **VALIDATE**: covered by Task 4.4.
- **SATISFIES**: T7 (scrollend half). **REGENERATES**: Task 7.4.

### Task 4.4 — RUN `studio-journey all` as the regression gate for 4.1–4.3

- **IMPLEMENT**:
  ```bash
  PORT=4791 node tooling/visual-regression/serve.mjs &   # your own server: memory stale-serve-wrong-tree
  BASE=http://127.0.0.1:4791 node tooling/studio-journey.mjs all
  ```
- **VALIDATE**: `studio-journey ✓` on chromium, firefox, webkit, zero failed, and each engine's passed
  count at least Task 0.1's own measurement (plus Task 4.5's two assertions once they land).
- **GOTCHA**: the driver's stale-serve guard (`:133-146`) compares a served system file to the local one;
  it only protects you if the server roots at THIS worktree.
- **SATISFIES**: "not changing /factory, studio.html", R1. **REGENERATES**: none.

### Task 4.5 — ADD the hook-off assertions to `tooling/studio-journey.mjs` (R1)

- **IMPLEMENT**: two `t()` lines, one in the `studio.html` leg after the verbs are ready
  (`journey`, `:521-543`) and one in `factoryPass` (`:1735`): `Object.hasOwn(snap, "$doc") === false`
  where `snap` is read with `page.evaluate(() => import("/system/studio-verbs.mjs").then((m) =>
  m.getVerbs().snapshot()))` — the idiom at `studio-journey.mjs:315`. Name them "no document value in the
  snapshot without a hook (#306)".
- **VALIDATE**: `BASE=http://127.0.0.1:4791 node tooling/studio-journey.mjs all` → green, two more passed
  per engine than Task 0.1 (expected).
- **REDDENS**: make `snapshot()` add `$doc: null` unconditionally → both new assertions fail, one per page.
- **SATISFIES**: R1. **REGENERATES**: none.

### Task 5.1 — CREATE `portal/public/canvas.html`

- **IMPLEMENT**: `<!doctype html>`, `<title>Canvas · ux factory portal</title>`, stylesheets in
  `studio.html:21-24`'s order (`/system/tokens.contract.css`, `/system/tokens.neutral.css`,
  `/system/components.css`, `/system/studio.css`) then `/portal.css`. Body: the portal header bar
  (`index.html:16-18`'s brand link back to `/#/canvas`), a toolbar `<div class="cv-toolbar">` holding the
  provenance label `<p class="cv-label" data-canvas-label>`, a save-location notice
  `<p class="cv-where" data-canvas-where>` (for a `fictional` root: "Saves into this repo at
  `discovery/<slug>/build/` — commit to keep it, or `git checkout` the folder to discard."; for `real`:
  "Saves into the jobs folder, never committed." — R2), an "Add note" button
  (`data-canvas-verb="annotate"`), and the save status `<p role="status" data-canvas-save>`; then
  `<div data-studio-canvas>`, `<div data-studio-minimap>`, `<div data-studio-layers>`; one
  `<div popover="auto" class="cv-inspector" id="cv-inspector">`; and
  `<script type="module" src="/canvas.mjs"></script>`.
- **GOTCHA**: `portal/public/` is served by the fallback at `server.mjs:400`; no route is needed.
- **VALIDATE**: `curl -s -o /dev/null -w '%{http_code}' localhost:<port>/canvas.html` → `200` (expected).
- **SATISFIES**: scope bullet 1. **REGENERATES**: none.

### Task 5.2 — CREATE `portal/public/canvas.mjs` — load and render

- **IMPLEMENT**:
  - Read `provenance` and `slug` from `location.search`; `fetch('/api/canvas/run?…')` and
    `fetch('/handoff/verdant/vocabulary.json')`. Any failure renders a visible refusal in the toolbar
    ("Refused: …"), never a blank stage.
  - Label: render the route's `label` object (Task 3.1) — its text, and when `mismatch` is set a visible
    flag beside it: "Stored under the jobs folder, but run.json says fictional." (or the reverse).
  - `canvas = initStudioCanvas()`. Place, in this order, all through `canvas.place(node, {…, id})` and
    never through the bus:
    - each frame as `kind: "frame"`: `div.stx-frame-box` holding a `p.stx-frame-cap` (the frame's name —
      `screenId`, or `"<stateKey> of <base screenId>"` — its decision chips, a "No decision linked" chip
      when `decisionRefs` is empty, and a "Details" button) and `div.cv-screen` holding
      `renderComposition(vocab, frameTree(doc, id).tree)`; width `f.width`; x/y/h from `canvas.nodes`, else
      a default row (`x = i × (width + 64)`, `y = 0`); with no authored `h`, measure the rendered content's
      height after placement and re-place with it.
    - each note as a slot: an editor element (Task 5.4) showing `note.text`.
    - each decision card (refs in frame order, deduplicated) as a slot: heading "Decision <id>", the
      question text, the answer, "Wrong if: …", "Embodied by: <frame names>"; width 280 (the rule's
      `size.w`), height left to its content; when `decisions` is `null`,
      the flag "Not found — this package has no transcript.jsonl (a stand-in), so there is nothing to link
      yet."; when non-null but the id is missing, "Not found in this package's transcript." Position from
      `canvas.nodes`, else `placeDecision(firstEmbodyingFrameBox, takenSoFar)` over authored boxes only
      (Task 1.3).
  - `canvas.setArrows(doc.arrows)`.
  - `bus = createBus()`; register the page's consumers (Task 5.3); `verbs = mountCanvasVerbs(canvas, { bus,
    docHook: adapter })`; `select = mountCanvasSelect(canvas, { bus })`;
    `mountStudioLayers(document.body, { canvas, select })`; `mountStudioMinimap(document.body, { canvas })`
    — check each mount's `root.querySelector` expectation.
  - `bus.on("*", scheduleSave)` LAST, so it runs after every exact consumer (`action-bus.mjs:86-97`).
  - Set `document.documentElement.dataset.canvasPage = "ready"` in a `finally`.
  - `export const getCanvasPage = () => ({ doc, effective, count, pending })` — the driver seam
    (`studio-verbs.mjs:355-359`'s idiom; page globals are not the test surface).
- **IMPORTS**: `/system/agentic-renderer.mjs` (`renderComposition`), `/system/action-bus.mjs`,
  `/system/studio-canvas.mjs` (`initStudioCanvas`, `setPos`, `NODE_H`), `/system/studio-verbs.mjs`,
  `/system/studio-select.mjs`, `/system/studio-layers.mjs`, `/system/studio-minimap.mjs`,
  `/system/canvas-ops.mjs` (`applyOp`, `frameTree`, `placeDecision`), `/system/device-presets.mjs`.
- **GOTCHA**: every string from the transcript, answers or notes is set with `textContent`, never
  `innerHTML` — CodeQL's DOM XSS query runs on this repo and blocks on high alerts (CLAUDE.md §Testing).
- **GOTCHA**: loading must not POST. The only save trigger is the bus wildcard, and placement never emits.
- **SATISFIES**: scope bullets 1, 4 (decision card). **REGENERATES**: none.

### Task 5.3 — ADD the verbs, the document adapter and the save queue to `canvas.mjs`

- **IMPLEMENT**:
  - `applyOwnerOp(op, { commit = true } = {})`: `try { next = applyOp(doc, op) } catch (e) { canvas.say(\`Refused: ${e.message}\`); return false; }`
    — nothing recorded. Otherwise `doc = next`, `effective.push(op)`, `pending.push({ ...op, status:
    "applied" })`, `reconcile()`, and `verbs.commit()` when `commit`.
  - Consumers (single-dot names, `action-bus.mjs:54`), each announcing its result:
    - `ui.annotate` `{params: {noteId?, text}}` → `annotate`; "Note n1 added." / "Note n1 saved."
    - `ui.frame-link` `{target: {id}, params: {decisionRefs}}` → "Add payee (f1) now embodies decisions 7, 8, 10."
    - `ui.frame-remove` `{target: {id}}` → "Removed error of add-payee (f2) and 1 arrow."; the refusal is the
      applier's message.
    - `ui.frame-size` `{target: {id}, params: {preset} | {width}}` → "add-payee (f1) is now tablet, 834 px
      wide." / "…is now custom, 600 px wide."
  - `adapter.capture()` → `{ doc, ops: effective }` (the verbs clone it).
  - `adapter.restore(value)` → `k` = length of the common prefix of `effective` and `value.ops` (canonical
    deep-equal); push `{...effective[j], status: "undone"}` for `j` from the end down to `k`, then
    `{...value.ops[j], status: "applied"}` for `j` from `k` up; `doc = value.doc; effective = value.ops`;
    `reconcile()`; return the sentence ("Undone: removed f2." / "Redone: …") or `""` when the ops are
    unchanged (a pure move).
  - `adapter.resized(id, box)`: when `id` is a frame, `applyOwnerOp({op: "frame.size", params: {frameId:
    id, width: clamp(Math.round(box.w), WIDTH_MIN, WIDTH_MAX)}}, { commit: false })` — the verbs push the
    entry — and re-apply `setPos` if the rounded width differs from the DOM's.
  - `reconcile()`: add nodes the doc has and the stage lacks (position: the last box this page saw for that
    id, else the defaults of Task 5.2), remove nodes the stage has and the doc lacks (remembering their
    box), re-render a frame whose `frameTree` output or width changed, update note text, add/remove
    decision cards to match the ref union, then `canvas.setArrows(doc.arrows)`.
  - `scheduleSave` → one microtask-coalesced `flush()`: gather positions for every node
    (`{x, y, h?}` for frames, `{x, y, w, h?}` otherwise, read from the `--x/--y/--w/--h` properties as
    `boxOf` does, `studio-verbs.mjs:388-397`); skip when `pending` is empty and positions equal the last
    saved; else POST `{provenance, slug, base: count, ops: pending, positions}`; on 200 `count +=
    ops.length; pending = []`, status "Saved"; on failure status "Not saved — <error>. Reload to continue."
    and stop saving. One request in flight at a time; a flush requested meanwhile runs after it.
- **GOTCHA**: `applyOp` refusing is the normal path for `frame.remove` on a base with states. It is
  announced, and it is NOT sent to the server — `refused` is a proposal status (D10).
- **GOTCHA**: the undone line restates the op (D1), so `adapter.restore` must push copies of the effective
  entries themselves, not reconstructed ops.
- **SATISFIES**: AC #1 (undo, save), AC #4 (announcements). **REGENERATES**: none.

### Task 5.4 — ADD the note editor, the inspector and the toolbar to `canvas.mjs`

- **IMPLEMENT**:
  - **Note editor (T8)**: create a `div`, assign `contentEditable = "plaintext-only"`, and if reading it back
    does not return `"plaintext-only"`, use a `<textarea>` instead. Give the editor `tabindex="0"` and an
    `aria-label` "Note n1". On `focus` remember the text; on `blur`, if the trimmed text changed and is
    non-empty, emit ONE `ui.annotate` (one undo entry per gesture); if it is empty on a NEW note, remove the
    node and record nothing. `Escape` restores the remembered text and blurs. Stop propagation of
    Cmd/Ctrl+Z/Y keydowns inside the editor so text undo stays the browser's.
  - **"Add note"** button → creates an empty note node at the centre of the visible stage (under
    `canvas.scroll`'s scroll offset and the current scale), focuses its editor, and announces "New note —
    type, then Tab away to save."
  - **Inspector** (Popover + anchor positioning): a frame's "Details" button opens `#cv-inspector` for that
    frame. Anchor branch when `CSS.supports("anchor-name: --a")` (set `anchor-name` on the button, mark
    `data-cv-pos="anchor"`), JS-positioned fallback otherwise — `system/inspect.mjs:57,150-162`'s shape.
    The fallback clamps the popover inside the viewport and flips it above the button when there is no
    room below; either branch sets `data-cv-pos` to `"anchor"` or `"fallback"` (R5).
    Contents: **Device** — a `<select>` of `PRESET_NAMES` plus "custom", a `<input type="number" min=320
    max=2560 step=1>` for the width, and an "Apply size" button → `ui.frame-size`; **Decisions** — one
    labelled checkbox per decision (`id · question`), pre-checked from `decisionRefs`, and a "Link
    decisions" button → `ui.frame-link`; on a stand-in the checkboxes are absent and a paragraph says why,
    and the button is disabled with that reason as its description; **Remove frame** → `ui.frame-remove`.
    Focus moves into the popover on open and back to the Details button on close.
  - Toolbar and inspector CSS go in `portal/public/portal.css` under a `/* canvas.html (#306) */` section,
    `.cv-` prefixed, contract tokens only; 44px targets per `portal.css:198-204`, the checkbox hit area
    from its label.
- **GOTCHA**: `studio-verbs.mjs:1305`'s body-drag guard matches `[tabindex]` but not `[contenteditable]`,
  so the `tabindex="0"` is what stops a press in the editor starting a move.
- **GOTCHA** (memory `hidden-defeated-by-author-display`): if any `.cv-` rule sets `display`, a `hidden`
  element stays visible; use the popover's own show/hide, and assert visibility both ways in the journey.
- **SATISFIES**: AC #4, T7 (Popover), T8, G20. **REGENERATES**: none (`portal.css` is not a system file
  and no shipped page loads it).

### Task 5.5 — UPDATE the SPA: `#/canvas` route and the header link

- **IMPLEMENT**:
  - `index.html:19-20`: `<a class="btn btn-secondary" href="#/canvas">Canvas</a>` before the spacer's
    buttons.
  - `portal.js`: `renderRuns()` — `api('/api/canvas/runs')`, two sections ("Fictional — in this repo",
    "Real — jobs folder, never committed"), one row per run: slug, `label`, "transcript" or "stand-in: no
    transcript", and a link `/canvas.html?provenance=…&slug=…`. An empty section says "No build packages
    here yet." `route()` (`:1495`) dispatches `#/canvas` to it before the card match.
  - Every interpolated value through `esc()` (`portal.js:3`).
- **VALIDATE**: `node --check portal/public/portal.js` → no output (expected).
- **SATISFIES**: scope bullet 1 (run list). **REGENERATES**: none.

### Task 6.1 — CREATE `tooling/canvas-journey.mjs`

- **IMPLEMENT**: header in `studio-journey.mjs:1-38`'s voice: what it proves, operator-run, not in CI, and
  why it is the first driver that boots the portal (`canvas.html` needs the routes). Structure:
  - Playwright via `createRequire` from `tooling/visual-regression/` (`studio-journey.mjs:40-50`).
  - Scratch: `mkdtempSync(join(tmpdir(), "canvas-journey-"))`; per engine, rebuild
    `<scratch>/_discovery/fp-journey/` (a copy of `discovery/faster-payment/` — `run.json`,
    `answers.jsonl`, `transcript.jsonl`, `build/`) and `<scratch>/_discovery/fp-stand-in/` (`run.json`
    and `build/` only — no transcript), so every leg starts identical. The copied `run.json` keeps
    `provenance: "fictional"` on purpose: step 3 asserts the page labels it fictional and flags the root.
  - Preflight (R3): refuse by name, before anything is spawned, when
    `portal/node_modules/@anthropic-ai/claude-agent-sdk` is missing — `server.mjs` imports the SDK through
    `lib/chat.mjs:3` — with "run `cd portal && npm ci` first". Assert the scratch dir is outside the repo
    and is not the default jobs folder.
  - Boot (R3): a free port from `net.createServer().listen(0)`; `spawn(process.execPath,
    [join(REPO, "portal/server.mjs")], { env: { ...process.env, PORT, JOBS_DIR: scratch } })`, where
    `REPO` is resolved from `import.meta.url`, so the child runs this worktree's code. stdout and stderr
    go to `<scratch>/portal.log`. Poll `/api/health` up to 15 s. ASSERT `health.jobsDir === scratch`,
    `health.bootSha === git rev-parse HEAD` and `health.stale === false`. On an early `exit` event or a
    timeout, print the log's last 40 lines and exit 1 naming the reason. EADDRINUSE in the log → retry
    once on a new port.
  - Teardown (R3), in `finally` AND in `SIGINT`/`SIGTERM` handlers: `SIGTERM` to the child's PID,
    `SIGKILL` after 3 s if still alive, then `rmSync(scratch, { recursive: true, force: true })`. Never a
    name-pattern kill.
  - Before and after each leg: `git status --porcelain -- discovery/` must be identical.
  - Each engine, one leg, `t(name, cond)` per assertion:
    1. `/#/canvas` lists `faster-payment` (fictional), `fp-journey` and `fp-stand-in` (real), the last as
       a stand-in.
    2. Open the in-repo `faster-payment`: label "Fictional flow, neutral skin" with NO mismatch flag; the
       save-location notice names `discovery/faster-payment/build/` (R2); ZERO
       requests to `/api/canvas/save` during load and a 1 s idle (a request listener); no two nodes'
       rendered boxes overlap.
    3. Open `fp-journey`: `[data-canvas-page="ready"]`; label "Fictional flow, neutral skin" WITH the
       mismatch flag (its run.json says fictional, its root is real — kept deliberately); frames `f1`, `f2`; f1 contains "We check this
       against the name you gave."; f2 contains "Send anyway"; arrow `a1` drawn; cards `d7`, `d8` show
       "What would have to be true for this option to work?".
    3b. Every node's rendered box, read with `getBoundingClientRect`, overlaps no other (the default
        placement check, on real heights).
    4. Keyboard: focus "Add note", Enter, type "Check the CoP copy with legal", Tab → the live region says
       "Note n1 added."; on disk line 7 is `annotate` `{text}` `applied` `owner`.
    5. Keyboard: f1's Details (Enter), check decision 10 (Space), "Link decisions" (Enter) → announcement;
       line 8 is `frame.link {frameId:"f1", decisionRefs:["7","8","10"]}`; card `d10` present.
    5b. With an inspector open on every engine: its rect lies fully inside the viewport, and the branch
        (`data-cv-pos`) is recorded in the output. Then, on chromium only, reload with
        `page.addInitScript` stubbing `CSS.supports` to answer `false` for `anchor-name`, open the
        RIGHTMOST frame's inspector, and assert `data-cv-pos="fallback"` and the same in-viewport rule (R5).
    6. f1's Details → Remove frame → the announcement names `error (f2)`; still 8 lines.
    7. f2's Details → Remove frame → `f2` and `a1` gone; line 9 `frame.remove {frameId:"f2"}`.
    8. Cmd/Ctrl+Z on the scroller → `f2` and `a1` back; line 10 is `undone` restating line 9.
    9. f1's Details → width 600 → Apply size → line 11 `frame.size {frameId:"f1", width:600}`; ONE undo →
       f1's `--w` is 390 AND line 12 is `undone` restating line 11 (one gesture, one entry).
    10. Pointer: drag f1's `.stx-resize` corner once → exactly one new `frame.size` line; ONE undo → width
        restored and one `undone` line (the `resized` hook's single entry, D8).
    11. Reload: `n1` shows its text, `d10` present, `f2` present, f1 390 wide.
    12. Node side: `verifyBuild(loadBuild(<fp-journey>/build))` → `[]`; and
        `foldLedger(ops).doc` deep-equals `getCanvasPage().doc` read through
        `page.evaluate(() => import("/canvas.mjs").then((m) => m.getCanvasPage().doc))`.
    13. `fetch` from Node: `POST /api/canvas/save` with `Origin: http://evil.example` → 403, ledger line
        count unchanged; with a stale `base` → 409, unchanged.
    14. Open `fp-stand-in`: `d7`/`d8` carry the "no transcript.jsonl (a stand-in)" flag; the inspector has
        no decision checkboxes and says why; moving a card still saves (`canvas.json` changes) — flagged,
        not blocked.
    15. Every new control (Add note, Details, inspector select/input/buttons, checkbox labels) measures at
        least 44 × 44 CSS px, read after `scrollIntoView` and a settled scroll.
    16. No `pageerror` events across the leg.
  - Engine loop, per-engine tally, final `canvas-journey ✓|✗`, exit code: `studio-journey.mjs:7420-7432`.
- **GOTCHA** (memory `webkit-lazy-iframe-in-scroller`): a driver throw aborts a leg silently; wrap each
  numbered step so a throw becomes a failed `t()` naming the step, and read a per-engine tally after one
  as "stopped here".
- **GOTCHA** (memory `hover-probes-race-smooth-scroll`): wait for `scrollY` to settle before measuring or
  hovering.
- **VALIDATE**: `node tooling/canvas-journey.mjs all` → `canvas-journey ✓`, three engines, zero failed
  (expected).
- **REDDENS** (run each, confirm red, revert):
  - In `adapter.restore`, skip pushing `undone` lines → step 8 fails: line 10 missing.
  - Remove `docHook?.resized(...)` from the verbs → step 10 fails: no `frame.size` line.
  - Make the page emit a bus action on load → step 2 fails: a save request seen.
  - Start the journey with `JOBS_DIR` unset in the child env → the `jobsDir` assertion fails before any leg.
  - Kill the child from inside step 6 → step 7 fails naming "portal exited (code …)", not a timeout.
  - Rename `portal/node_modules` → the preflight refusal prints and nothing is spawned.
  - Remove the fallback clamp → step 5b's forced-fallback leg fails on the rightmost frame.
  - Make the in-repo notice read from the wrong field → step 2 fails.
  - In `canvas.html`, drop `tabindex` from the note editor → step 4 fails (the press starts a move and the
    text never lands).
- **SATISFIES**: AC #1, #3, #4; R2, R3, R5. **REGENERATES**: none.

### Task 7.1 — UPDATE `CLAUDE.md`

- **IMPLEMENT** (AC #5):
  - `:152` "Portal UI feature" gains: "The one exception is `portal/public/canvas.html` + `canvas.mjs`, a
    module page (the canvas needs `system/` modules a classic script cannot import); the SPA links to it
    from `#/canvas`."
  - Map, `portal/`: `lib/canvas-store.mjs` line rewritten ("the build package: list · load · append-only
    save, the ledger fold and the canvas.json derivation; routes in server.mjs"); `public/` line names
    `canvas.html` + `canvas.mjs`, the one module page.
  - Map, `tooling/`: `canvas-journey.mjs    the canvas page ×3 engines, boots its own portal   (→ references/gates.md)`.
  - `:201`: "the five journey drivers" → "the six journey drivers".
- **VALIDATE**: `node tooling/drift-check.mjs` → clean (the group-count leg reads CLAUDE.md; 41 is unchanged).
- **SATISFIES**: AC #5. **REGENERATES**: none.

### Task 7.2 — UPDATE `.claude/references/gates.md`, `discovery/README.md`, the two module headers

- **IMPLEMENT**:
  - `gates.md:59` (group 35) and `:61` (group 36): the new coverage in the same voice as each `group()`
    string; add a `canvas-journey.mjs` paragraph after `instance-journey.mjs` (`:119`), stating what it
    cannot reach (the pixel look of the page; a real Brilliant import; two-tab behaviour beyond the 409).
  - `discovery/README.md` build section (`:498-608`): ten verbs; the undone line's shape (D1) and redo; the
    live writer (`saveRun`, append-only) beside `saveBuild`; decision and note nodes and embodies edges; the
    spine's `canvas.json` regenerated at #306 and how.
  - `system/canvas-ops.mjs` header `:22-30`: the first runtime consumer is `portal/public/canvas.mjs`, an
    OPERATOR page, not a shipped one; the open owner question about counting it in the runtime total
    stands.
- **VALIDATE**: `grep -n "six" .claude/references/gates.md CLAUDE.md` shows no stale "six ops"/"six verbs"
  claim about `canvas-ops` (expected).
- **SATISFIES**: documentation. **REGENERATES**: none.

### Task 7.3 — RUN the full validation set (below) on the staged tree

### Task 7.4 — REGENERATE `system/loc-summary.json` and the approach baselines, last (R4)

- **IMPLEMENT**, in this order:
  1. Bring the branch level with `main`, so CI's merge-ref count is the count you generate (memory
     `loc-summary-counts-tracked-only`):
     ```bash
     git fetch origin && git merge origin/main      # resolve any loc-summary.json conflict by regenerating, never by hand
     ```
  2. Stage every source change, then regenerate and MEASURE:
     ```bash
     git add system/canvas-ops.mjs system/device-presets.mjs system/studio-canvas.mjs system/studio-verbs.mjs system/studio-minimap.mjs
     node agent-layer/gen-loc-summary.mjs
     git diff -U0 system/loc-summary.json
     ```
     Decision rule, applied to that diff and nothing else:
     - `runtime.linesApprox` moved → regenerate the three approach PNGs (step 3).
     - only `total` or `pages` moved → commit `loc-summary.json` alone; no PNGs.
     - nothing moved → nothing.
     Expected: `runtime` 32,100 → 32,300 (derived: 32,109 + roughly 200 added lines), so step 3 runs.
  3. Commit, then regenerate from a CLEAN detached worktree of that commit under `/Users` (not
     `/private/tmp`, which Docker does not share; memory `vr-gate-reads-working-tree`), with the `rm` inside
     the container after `npm ci`, so a failed install cannot leave the tree short (memory
     `loc-summary-baseline-cascade`):
     ```bash
     git worktree add --detach ~/wt-306-vr HEAD
     cd ~/wt-306-vr/tooling/visual-regression
     docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression mcr.microsoft.com/playwright:v1.61.1-jammy \
       sh -c 'npm ci && rm -f baselines/approach-neutral.png baselines/approach-saulera.png baselines/approach-verdant.png && npx playwright test --update-snapshots --workers=1'
     ```
     (the image tag is `tooling/visual-regression/package.json:8`'s; `--workers=1` because a factory
     update has timed out under CPU contention before).
  4. Read the result back:
     - `git -C ~/wt-306-vr status --porcelain tooling/visual-regression/baselines/` lists EXACTLY the
       three approach PNGs. A `factory-*.png` in the list means `/factory` changed at rest, which R1 says
       must not happen: stop and find out why.
     - Open each new approach PNG and read the rendered count against `loc-summary.json`'s runtime
       figure. The gate's pixel tolerance can pass a stale digit (memory `vr-tolerance-hides-text-changes`).
     - Copy the three PNGs into the branch worktree, commit, and remove `~/wt-306-vr`.
  5. After the push: `gh pr view <N> --json headRefOid` must equal `git rev-parse HEAD` before any check
     result is read (memory `pr-head-lag-stale-checks`). An approach-only `visual` failure reading "two
     consecutive stable screenshots" is re-run once before it is treated as a regression (memory
     `vr-gate-approach-countup-flake`).
- **VALIDATE**: `node tooling/drift-check.mjs` clean on the committed, fully merged tree (never mid-merge —
  memory `drift-check-mid-merge-false-positive`); CI `verify` and `visual` green on the pushed head.
- **GOTCHA**: a local `--check` before staging reads the committed blob and says "no drift" falsely.
- **SATISFIES**: CI `verify`, R4. **REGENERATES**: `system/loc-summary.json`, three approach PNGs.

---

## TESTING STRATEGY

No unit-test framework (CLAUDE.md §Testing). The pure layers are proven in build-checks groups 35 and 36
(CI); the page is proven by `tooling/canvas-journey.mjs` on three engines (operator-run); the shared
substrate's non-regression by `tooling/studio-journey.mjs all`.

### Unit (build-checks)

Group 35: every verb has a fixture, a happy application and at least one refusal matched on the words it
must name; `frameTree` renders through the real validator; `placeDecision` never overlaps. Group 36: every
committed package passes `verifyBuild`; the fold's undo is last-in-first-out; `saveRun` is append-only,
atomic on refusal, conflict-checked; `listBuilds` filters junk.

### Integration (canvas-journey)

The ticket's own sequence — open a run → add a note → link a frame → remove a frame → undo → reload —
ending in the Node-side `verifyBuild` and a document equality between disk and page.

### Edge cases

- `frame.remove` on a base with a state (refused, named), on a state (arrows cascade), then undo.
- Undo after a refused op (nothing to undo from it: the refusal pushed no entry).
- A new note abandoned empty (no op, node removed).
- Resize by pointer, by keyboard, by the numeric input — one entry each.
- The stand-in: no transcript → cards flagged, links disabled with the reason, moves still saved.
- Two tabs: the second save gets 409 and says so.
- A package in `_discovery/` whose slug has a capital or no `build/` is not listed.

### Proving the checks

Every check above carries its REDDENS mutation. Run the positive control before trusting any green: 35's
`nextId` mutation, 36's empty-discovery-dir floor, the journey's unset-`JOBS_DIR` start.

---

## VALIDATION COMMANDS

### Level 1: Syntax & style

```bash
node tooling/drift-check.mjs          # syntax-checks every tracked .mjs, the group count, the generators
node tooling/token-lint.mjs           # portal.css is not linted as a system file; run it anyway
node --check portal/public/portal.js portal/public/canvas.mjs tooling/canvas-journey.mjs
```

### Level 2: Unit

```bash
node tooling/build-checks.mjs | tail -1      # build ✓  all 41 groups pass
mv portal/node_modules /tmp/pnm-306 && node tooling/build-checks.mjs | tail -1; mv /tmp/pnm-306 portal/node_modules
                                             # the CI shape: groups 35/36 must pass with no portal deps
```

### Level 3: Integration

```bash
PORT=4791 node tooling/visual-regression/serve.mjs &
BASE=http://127.0.0.1:4791 node tooling/studio-journey.mjs all     # the substrate did not move
node tooling/canvas-journey.mjs all                                # boots its own portal
node tooling/catalog-journey.mjs all                               # renderer untouched, cheap to confirm
```

### Level 4: Manual

`cd portal && PORT=4872 node server.mjs`, open `http://localhost:4872/#/canvas`, open `faster-payment`,
confirm it renders and that nothing under `discovery/` changes until you move something
(`git status discovery/`). Then revert any change you make to the committed spine unless the owner
wants it kept.

### Level 5: Owner's read

The owner's own hand in a real browser: does arranging here feel like a tool? Not written by this PR.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Answer Q1–Q7 (defaults stated) | owner's hand | no — defaults ship | this PR's body |
| Q2: accept the regenerated spine `canvas.json` | owner's hand | yes — group 36.2 asserts it | this PR |
| Level 5: the owner's read of `canvas.html` | owner's hand | no | epic #295 close-out |
| Approach baselines regen (Docker, R4) | local Docker time | yes — CI `visual` | this PR |
| Read the three regenerated approach PNGs by eye (R4) | owner's or implementer's eyes, 1 minute | yes | this PR |

No step spends tokens: no agent runs in this ticket.

---

## ACCEPTANCE CRITERIA

- [ ] `tooling/canvas-journey.mjs all` green on chromium, firefox and webkit: open a run → add a note → link
      a frame to a decision → remove a frame → undo → reload, and the package on disk passes
      `verifyBuild` and matches the page's document.
- [ ] Group 35 proves each of the four ops with a malformed op that throws and a well-formed one that
      applies; `frame.remove` is refused while a state or a variant overrides the frame.
- [ ] The decision card renders from `transcript.jsonl` (question text for d7) and is flagged on the stand-in.
- [ ] Every verb has a keyboard path with an announcement; new controls measure at least 44 × 44.
- [ ] CLAUDE.md: the `canvas.html` exception to the portal-UI rule; the map updated for `canvas-store.mjs`,
      `canvas.html`/`canvas.mjs` and `canvas-journey.mjs`; six journey drivers.
- [ ] `build-checks` 41 groups green, also with `portal/node_modules` absent; `drift-check` and `token-lint`
      clean; `studio-journey all` green; CI `verify`, `visual` and `codeql` green.
- [ ] Nothing under `discovery/` is written by any gate run.
- [ ] R1–R5 each closed as § RISKS states: its check run, its reddening mutation run and reverted, and
      any residual written in the report.

---

## COMPLETION CHECKLIST

- [ ] Tasks done in order; each VALIDATE run and its output recorded in the report.
- [ ] Every REDDENS mutation run and reverted, including each risk's (§ RISKS).
- [ ] Plan, report and review in the PR (`.claude/plans/`, `.claude/reports/`,
      `.claude/code-reviews/pr-<N>-review.md`); PR body carries `Closes #306`.

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 — the undo line's shape.** Default: no new key; the `undone` line restates the op and the fold
  checks it against the top of the stack (D1). Alternative: add `undoes: <seq>`, which reads more directly
  and extends the pinned line shape. The default keeps the architecture's shape and still makes a wrong
  undo fail loudly.
- **Q2 — regenerating the committed spine's `canvas.json`.** Default: yes. Decision cards and embodies edges
  derive from `frame.decisionRefs`, which f1 already carries from its compose op, so the file is out of date
  under the new rule; it is rewritten through the store with `placeDecision`'s positions, ops untouched.
  Alternative: derive embodies only from `frame.link` ops. That leaves the file alone but makes the
  compose op's own claim that f1 embodies decisions 7 and 8 invisible.
- **Q3 — a free width on `frame.size`.** Default: `width` joins `preset`, exactly one. The architecture's
  frame shape has `width` and `preset` and the PRD asks for edge-drag widths; the op had no way to record
  one. The committed lines stay valid.
- **Q4 — `getCoalescedEvents` (T7) deferred.** For a move or resize preview only the latest point matters,
  so reading coalesced events changes no outcome, and `studio-canvas.mjs:693-699` records that Playwright
  can only show coalescing on WebKit, so no check could redden on the other two engines. Popover, anchor
  positioning and `scrollend` are adopted. Override if the architecture's "adopted as stated" must hold
  literally.
- **Q5 — deleting a note.** Default: not in this ticket (undo removes a note just added). A fifth verb or
  an `annotate` delete form would need the op lock; #315 holds the next slot.
- **Q6 — `variant.add` has no page control.** Default: grammar only; #314 owns the lane UI. AC #4's "every
  verb has a keyboard path" is read as every verb the page offers.
- **Q7 — `frame.remove` takes its arrows with it.** Default: cascade and say so in the announcement.
  Alternative: refuse while arrows touch the frame, which costs one `disconnect` per arrow first.
- **Assumption**: the decision id is the transcript line's `seq` as a string. Observed: the spine's
  `decisionRefs: ["7","8"]` are transcript seqs 7 and 8, and `discovery/README.md:579` describes them
  as decisions 7 and 8.
- **Assumption**: frames stay outside marquee selection and align (the #219 decision recorded in
  `studio-frames.mjs`); notes and decision cards are slots, so they select and align.

## NOTES (open canvas)

### Pre-flight, run 2026-09-22 against `34ffc82` (`origin/main` = `eb58d54`, no diff under the touched paths)

| Ran | Observed | Changed in the plan |
|---|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 41 groups pass`; group 35 is named "canvas ops", 36 "build package" | VALIDATE greps use those names |
| `node agent-layer/gen-loc-summary.mjs --check` | `✓ no drift`; runtime 80 files / 32,100 | Task 7.4's arithmetic |
| exact runtime count | 32,109 (wc 32,029 + 80) | ~+200 lines tips it to 32,300 → approach baselines regenerate |
| read `studio.html:81-167` | mounts canvas, verbs, select only; never `setArrows` | the page mounts layers and minimap itself |
| read `studio-canvas.mjs:611-626` | `place()` mints `s<n>`, no id option | Task 4.1 |
| read `action-bus.mjs:54` | `TYPE_RE` allows one dot | verb names `ui.frame-remove` etc. |
| read `server.mjs:397,400` | `/system/` proxy is at `:397` (ticket said `:153`); no `/handoff/` route | Task 3.1 adds `/handoff/` |
| read `canvas-store.mjs:46-47` | `saveBuild` truncates and rewrites | `saveRun` appends; 36.8 measures the byte prefix |
| read `build-checks.mjs:11103,11405,11413` | roster pinned at 6; spine pinned at 6 lines, all `applied` | Tasks 1.4 and 2.4 rewrite them, spine pin becomes a prefix pin |
| read `canvas.json` | f1 has `decisionRefs ["7","8"]` but no decision nodes or embodies edges | D7 / Q2 regeneration |
| transcript fold | 20 `record_decision`; seq 7 → `s1-what-would-have-to-be-true` / `a4`; seq 10 → `s4-appetite` | journey links decision 10 |
| `questionById("s1-what-would-have-to-be-true").text` | "What would have to be true for this option to work?" | journey step 3's literal |
| read `studio-verbs.mjs:1305` | `[contenteditable]` not in the body-drag guard | editor gets `tabindex="0"` |
| read `studio-verbs.mjs:770` | the resize consumer pushes its own history entry | D8's named `resized` hook |
| read `agentic-renderer.mjs:46` | props are enum-checked | `frameTree` drops hidden nodes instead of passing `hidden` |
| `lsof` | portals already on 4747 and others from sibling sessions | the journey spawns its own and asserts `jobsDir` |
| `PORT=4873 JOBS_DIR=/private/tmp/cj-probe node portal/server.mjs`, then curl | `/api/health` → `"jobsDir":"/private/tmp/cj-probe"`; `/handoff/verdant/vocabulary.json` → 404; `/system/canvas-ops.mjs` → 200; killed by PID | confirms the journey's isolation assertion is reachable and Task 3.1's `/handoff/` line is needed |

**Found by review before the report, and corrected in place:** the verbs option was first named
`document`, which shadows the global the mount uses at `studio-verbs.mjs:1529` (renamed `docHook`;
grepped: that is the only bare `document.`/`window.` in the mount body, and `restore` has one caller,
`:874`); the label was first read from the root, which would have called the journey's fictional copy
"real" (D12); and `placeDecision` first placed right of the anchor, which is x 422, on top of the spine's
f2 at x 472 (now right of the anchor's whole row: 894, then 1206).

### Why the undo hook lives in studio-verbs

Two stacks (the verbs' position stack and a page document stack) would interleave wrongly: move a note,
remove a frame, press Cmd+Z, and the verbs would undo the move. A proxy bus hiding `ui.undo` from the verbs
leaves their Undo button's enabled state driven by the wrong stack. An opaque `$doc` value inside the
existing snapshot keeps one stack, one button state, one Cmd+Z path, and costs about 25 lines in the
module.

### Why the gate predicate is in the store, not canvas-ops

The page never needs `foldLedger` or `arrangement`: the server folds on load and derives on save.
Keeping them Node-side keeps them out of the runtime line count the approach page renders, and puts them
beside the only writer of the files they judge.

### The popover anchor

Moved into § RISKS as R5, with its clamp, its forced-fallback leg and its reddening mutation.

## AMENDMENTS

- 2026-09-22 — § RISKS added at the owner's request ("address all risks"): R1–R5 each given closing
  tasks, a proof with a reddening mutation, and a stated residual. New: Task 4.5 (studio-journey hook-off
  assertions), group 13's `docHook` boundary case, group 36's `checkPackage` + 36.10 (the owner's edit
  stays green) with the D7 control moved onto the frozen prefix, the in-repo save notice, the journey's
  preflight / health / teardown hardening and forced-fallback leg, and a rewritten Task 7.4 with a
  measured regen rule and read-back. Before the plan was approved, so no executed work changes.
- 2026-09-22 (implementation, base `eb58d54`) — plan errors found by running the plan, each fixed in
  place in the code and logged here rather than corrected silently:
  - **Line citations off by one.** `origin/main` moved from `34ffc82` to `eb58d54` (a merge with an
    identical tree), and group 35/36 anchors sit one line lower (`VALID_FOR` `:11121`, the six-line pin
    `:11406`). No behavioural difference.
  - **36.6's REDDENS could not redden.** The store's import pin matched `import … from "x";` only, so the
    plan's own mutation (a bare `import "@anthropic-ai/claude-agent-sdk";`) passed the pin. The regex now
    matches bare imports; 35.9 (the canvas-ops pin) had the identical gap and got the identical fix.
  - **Group 40 red between Phase 1 and Task 7.4.** The plan's per-phase VALIDATE expected "all 41 groups
    pass", but group 40 runs the loc-summary drift check, which reads COMMITTED blobs — so every
    committed `system/` edit reds it until Task 7.4 regenerates. Expected, not a regression.
  - **R5's clamp mutation stayed green.** At 1000 px the rightmost frame's Details button lands mid-view
    after scrollIntoView and a popover's width fits beside it either way. The forced-fallback leg now runs
    at 760 px with the button pinned to the scroller's right edge; the mutation reddens.
  - **The `tabindex` mutation (M9) stayed green.** Step 4 is keyboard-only, and a contenteditable takes
    focus without a tabindex; the tabindex only matters to a POINTER press (the body-drag guard). Added
    step 10b (click-then-type edit of n1); the mutation reddens it.
  - **"Emit a bus action on load" (M3) is absorbed by design.** The save queue skips when nothing is
    pending and positions equal the last save, so an emit on load sends nothing — correct behaviour. The
    reddening mutation used is R2's own wording, "make the page save once on load".
  - **M5 fails at step 6's boundary, not step 7.** The step wrapper checks the child after each step, so a
    kill inside step 6 aborts the leg naming "portal exited (code null) during 6 · …" — the property the
    plan wanted (named exit, not a timeout) holds one step earlier.
  - **Step 12's page-vs-disk compare was vacuous as written.** After step 11's reload the page's document
    IS the server's fold of disk, so comparing it with a Node fold of disk compares a thing with itself.
    Added 12a BEFORE the reload (the page's own applyOp/adapter.restore document vs `foldLedger(ops)`),
    proven by a mutation that sends a different frame.link list than the page applied (12a red; the
    post-reload compare stays green, which is the proof it was vacuous).
  - **"Add note" at the view centre landed on top of frames**, which made the note unclickable under a
    re-created frame (found by step 10b). A new note now goes below everything placed, at the visible
    left edge, and is scrolled into view.
  - **`.stx-frame { position: relative }` (`system/studio.css:348`) overrides the node families'
    `position: absolute` (`:104`), so frames FLOW.** Measured on `/factory` at `eb58d54`: frame s2's
    authored `--y` is 312 and it renders at 608 (s1's height below). Not fixed in `studio.css` (that
    moves `/factory` at rest, which R1 forbids); `portal.css` restores `absolute` scoped to
    `.cv-stage .stx-frame`. Flagged for its own ticket.
