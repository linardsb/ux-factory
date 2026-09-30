# Feature: variants as lanes, the per-lane completeness check, and the build package's handoff pack (#314)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Start from `origin/main` (a0c03f0 or later), never from the branch this plan was written on.** The checked-out
branch at planning time (`fix/importer-reads-icon-name-449`) is behind main: its CLAUDE.md says 41 groups, main's says
48. `git fetch && git switch -c feat/variant-lanes-handoff-pack-314 origin/main`. The working dir is shared with
parallel sessions (memory: shared-worktree-parallel-sessions) — verify the branch right before every commit and stage
by explicit path.

## Proof — the core of this plan has already run (2026-09-29)

Most of this plan was implemented once in a throwaway worktree of `origin/main` a0c03f0 and driven there, so the
implementer applies code that has been tested rather than re-deriving it from prose. The result is committed beside this
plan:

| File | What it is |
|---|---|
| `variant-lanes-handoff-pack-314.proof.patch` | 21 files, +917/−31: canvas-ops lanes, the generator, store, server, page, CSS, the fixture, both generated packs, `loc-summary.json`, the three approach baselines. `git apply --check` is clean on a0c03f0 (observed). |
| `variant-lanes-handoff-pack-314.lanes-driver.txt` | The Playwright lane journey (L1–L9) that drove the patched page. Port it into `canvas-journey.mjs` as pass L. |
| `variant-lanes-handoff-pack-314.mermaid-parse.txt` | The Mermaid parse check (mermaid 11.17.2 + jsdom 29.1.1, run from a scratch dir, never committed), with a positive control. |
| `variant-lanes-handoff-pack-314.route-pin.txt` | The prototype of build-checks 49.9, the write-route pin. |

What was observed on the patched tree:

- `node tooling/build-checks.mjs` → `build ✓  all 48 groups pass`. Groups 35, 36, 43 and 47 stay green under the lane
  rewrite of `missingStates`/`frameTree` and the new `verifyBuild` clause.
- `node tooling/drift-check.mjs` → ✓, all 14 legs.
- `node agent-layer/gen-build-handoff.mjs --check` before generating → `✗ drift:` naming all 8 files, exit 1. After
  generating → `✓  2 packages, 8 files — no drift`.
- The lane driver passes 17/17 checks on each of chromium, firefox and webkit, with no page errors. Mutating the flow
  panel to ignore the lane turns L4 and L6 red.
- Mermaid parses all three rendered diagrams. The control, a truncated `f1 -->`, is refused.
- `loc-summary`: runtime 32,500 → **32,600**, generators 3,100 → 3,400, total 41,300. `update:docker` (after rm of the
  three approach PNGs) → 33 passed in 1.2 min, and exactly `approach-{neutral,saulera,verdant}.png` changed.
- Every positive control listed under Task 4.3 fired as specified (outputs recorded in the tasks).

**What the patch does NOT contain:** the fixture README (Task 3.1), build-checks 35.15, 36.12 and group 49 (Tasks
4.1–4.3), the drift leg (4.4), journey pass L in `canvas-journey.mjs` (5.4), docs (6.1) and the follow-up ticket (7.4).
Those are tooling and docs: none of them moves `loc-summary` or a VR baseline.

## Feature Description

A build package (`discovery/<slug>/build/`) can already hold named variants — `variant.add` landed in #306 and stores
`{key, overrides: {frameId: override}}` — but nothing reads them. The canvas shows one version of the flow, the
completeness check (`missingStates`) ignores lanes (its `variantKey` filter reads a frame field nothing sets, so
`missingStates(doc, "b")` answers `[]` for every document), and the handoff pack (`agent-layer/gen-handoff.mjs`) knows
only the Verdant component pack and reads no build package at all.

This ticket makes a variant a **lane**: the canvas page gets a lane switcher, lane B is edited as a draft and kept as
ONE `variant.add`, and three things switch with the lane through one code path in `system/canvas-ops.mjs` — the
rendered frames, the completeness check and the state diagram. A lane may leave a frame out (`{omit: true}`), which
is how lane B can lack a state lane A has. A new generator writes a per-package handoff pack beside the package —
`flow.md` (Mermaid `stateDiagram-v2` per lane, G5's "tapping Continue goes to…" sentences, missing states per lane),
`drops.md`, `refusals.md`, `lineage.json` and the import records' markdown — gated in build-checks and in CI's drift
check.

## User Story

As the owner handing a design to an engineer
I want each variant of a flow shown, checked and diagrammed as its own lane, and a pack that carries the flow, what
the import dropped, what was refused and which decision each screen embodies
So that the handoff says what exists per variant and where it came from, instead of one picture with no provenance

## Problem Statement

- G33 (two versions of Faster Payment side by side) is stored but invisible: no page shows a lane, and the check
  and the diagram cannot differ between lanes.
- A lane cannot express "this state does not exist in B": a lane override works at part level inside frames that
  already exist, so AC #1's "missing error on B only" is not representable today (observed: `applyOp` accepts
  `{f2: {omit: true}}` today only because `variant.add` never checks override keys, and nothing reads `omit`).
- The architecture's "handoff pack, extended" (`docs/epics/canvas-design-import.architecture.md:177-179`) has no code:
  `grep -rn "flow.md\|lineage.json\|stateDiagram"` over `agent-layer portal discovery tooling` returns nothing.

## Solution Statement

1. **`system/canvas-ops.mjs` — the lane reads (no new verb, no PARAMS change).** `laneKeys`, `laneDoc`, a lane
   argument on `frameTree`, `missingStates(doc, lane)` rewritten to resolve the lane first, `flowEdges` and
   `stateDiagram`. `variant.add` tightens: override keys exactly `set · hide · add · omit`, `omit` must be `true` and
   stand alone, and key `"a"` is refused (it is the base lane's name).
2. **`agent-layer/gen-build-handoff.mjs` — the pack generator.** A pure `renderPack(pkg)` → `{path: text}`, a thin
   reader `readBuildPackage(pkgRoot)`, a writer `writeBuildHandoff(pkgRoot)` into `<pkg>/build/handoff/`, and
   `genBuildHandoff({check})` over every committed package (`discovery/*/build` + `tooling/fixtures/builds/*/build`).
3. **The canvas page** (`portal/public/canvas.{html,mjs}`, `portal/public/portal.css`): lane select, New lane / Keep lane /
   Discard, an "In lane b" section in the frame inspector (set one text prop, leave the frame out), a flow panel
   showing `stateDiagram` for the active lane, and a "Write handoff pack" button → `POST /api/canvas/pack`.
4. **Gates.** Group 35 gains the lane reads + the tightened refusals (35.15); group 36 gains `laneFlaws` in
   `verifyBuild` (36.12); new **group 49 "build handoff"** compares both committed packs to `renderPack` in process;
   `tooling/drift-check.mjs` gains a `build-handoff` leg (AC #3); `canvas-journey.mjs` gains pass L (AC #2).
5. **Fixtures.** The committed spine (`discovery/faster-payment/build/`) gets its generated pack. A SYNTHETIC two-lane
   package, `tooling/fixtures/builds/two-lane/build/`, is typed through the real `applyOps` + `saveBuild` (D-a) and
   gets its pack.

## Out of Scope / Non-Goals

- **No new op verb and no PARAMS change** (ticket: "Adds no op"). A kept lane is **read-only**: editing it later needs a
  `variant.set` verb, which takes the epic's op-verb lock — a follow-up, not this ticket (owner, 2026-09-29, "Draft,
  then one op").
- **Not included: the #314 comment's three proposals** — data on each arrow (needs a `connect` param, op lock), the
  as-is record as a pack file, and as-is-to-flow traceability (owner, 2026-09-29: defer all). Open the follow-up
  ticket before the PR (Task 7.4).
- **Not changing `system/handoff-viewer.mjs` or `handoff.html`.** Its markdown subset has no headings and no Mermaid
  (`system/handoff-viewer.mjs:15-18`), and touching `handoff.html` cascades its VR baselines. The new pack files are
  read as files, not on a page.
- **Not changing `agent-layer/gen-handoff.mjs`, `gen-pack-index.mjs`, `gen-pack-bundle.mjs` or anything under
  `handoff/verdant/`.** The Verdant pack is a component pack; a build package's pack is per package (see NOTES D1).
- **No lane on the compose loop.** `portal/lib/canvas-session.mjs` keeps calling `missingStates(doc)` (lane A); in a
  non-A lane the page shows missing states as plain chips, never ask buttons (a compose state proposal is an A-lane
  `state.add`).
- **No Mermaid rendering anywhere.** The diagram is text; the page shows it in a `<pre>`. Whether Mermaid parses it is
  checked by hand once (Level 4), never by a gate.
- **Not rendering `overrides.add`.** `frameTree` already flags `unsupported-add` (`system/canvas-ops.mjs:575`); lanes
  inherit that.
- **No jobs-folder drift check.** Every write route regenerates the pack (`withPack`), and the drift leg covers
  committed packages. A pack in the jobs folder that someone edits by hand is not detected (NOTES D3).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (~1,000 lines across 11 files; one applier case tightened; one new generator; one page
feature; three gate extensions)
**Primary Systems Affected**: `system/canvas-ops.mjs`, `agent-layer/gen-build-handoff.mjs` (new),
`portal/lib/canvas-store.mjs`, `portal/server.mjs`, `portal/public/canvas.{html,mjs}`, `portal/public/portal.css`,
`tooling/build-checks.mjs`, `tooling/drift-check.mjs`, `tooling/canvas-journey.mjs`, docs
**Dependencies**: none new. Node built-ins only; Playwright (existing, `tooling/visual-regression`) for the journey.

## Related Work

**Implements**: #314   ·   **Epic**: #295 — `docs/epics/canvas-design-import.architecture.md` (§ Data model lines
103-179; G33 at `docs/epics/canvas-design-import.prd.md:116`, G5 at `:159`, Completion + Honest fidelity at `:175`,
`:179`)

**Back-references**:

- `.claude/plans/canvas-page-run-list-arrangement-ops-306.md` — `variant.add` (lines 57, 104, 527, 1319: "the lane UI
  and per-variant check are #314's"), the page, the store, D-a/D-b.
- `.claude/plans/import-record-snap-rules-307.md:59-60` — `imports/<id>.md` is written in the `renderMarkdown` subset
  "so #314 needs no rewrite"; this ticket copies it into the pack verbatim.
- `.claude/plans/canvas-compose-loop-312.md` — `refused` lines, the build transcript's `refused` kinds.
- `.claude/plans/as-is-ground-truth-486.md:40,65` — the as-is traceability half was handed to #314; deferred here by
  the owner.

**Forward-references**:

- (to open, Task 7.4) the follow-up carrying the #314 comment's three proposals + `variant.set`.
- #313 (ratify) and #315 (groups) hold the op-verb lock next; this ticket edits `variant.add`'s case, so rebase onto
  whichever lands first.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

All line numbers are `origin/main` a0c03f0.

- `system/canvas-ops.mjs` (678 lines — read it whole). Key spans:
  - `:56-68` OPS, `:73-85` PARAMS (unchanged), `:97-99` `VARIANT_KEY_RE`, `:103` `plainObject`.
  - `:412-433` the `variant.add` case — the one case this ticket tightens.
  - `:361-376` `frame.remove` — refuses while a lane overrides the frame (`lanes = next.variants.filter(...)`).
  - `:470-477` "A READ IS NOT A VERB … TOTAL OVER JUNK" — the posture every new read keeps.
  - `:485-500` `resolve(base, override)` — the ONE merge rule; `set` then `hide`, dangling flagged.
  - `:502-522` `missingStates` — `:515` is the `base.variantKey` filter this ticket REPLACES.
  - `:539-592` `frameTree` — layers at `:572`: `[{ set: base.sets }, state?.overrides, state ? { set: state.sets } : null]`.
- `portal/lib/canvas-store.mjs` — `saveBuild` `:47-61`, `loadBuild` `:72-92`, `foldLedger` (`:116`), `arrangement`
  (`:155`, reads no `variants`), `verifyBuild` `:229-268`, `listBuilds` `:282-301`, `readJsonl` `:303-307`,
  `loadDecisions` `:315-331` (no evidence refs today). Header `:20-23`: the import graph is node built-ins +
  `canvas-ops.mjs` ONLY (group 36.6 pins it) — nothing new may be imported here.
- `portal/public/canvas.mjs` (918 lines). Key spans: `:48` the canvas-ops import; `:105` `getCanvasPage`; `:109-115`
  `frameName`/`spoken`; `:168-190` `frameParts`, `missingOf`, `frameSig`; `:387-421` `reconcile` (`:420`
  `canvas.setArrows(doc.arrows)`); `:426-436` `applyOwnerOp`; `:440-469` the undo `adapter`; `:480-514` `flush`;
  `:714-790` `openInspector`; `:804-834` `registerConsumers`; `:866-916` `boot`.
- `portal/public/canvas.html` (53 lines) — toolbar `:28-34`, rail `:38-43`, inspector popover `:47`.
- `portal/server.mjs:443-483` — the canvas routes; `resolveRunRoot` + `assertProvenanceRoot` on every one; save route
  `:473-480` is the shape the new pack route mirrors.
- `agent-layer/gen-replay.mjs:165-195` — the `{check}` → `drifted[]` generator shape, both-directions orphan discovery
  (`:170-178`), CLI guard `:199-210`.
- `agent-layer/gen-handoff.mjs:9-13,49,64` — the clean-slate `rmSync` of an owned subdir (#64): the pack's `imports/`
  subdir follows it.
- `tooling/drift-check.mjs:26` (imports), `:163-173` `checkReplay` (the leg to mirror), `:208-224` the runner and the
  `drift-check ✓` line, `:176-205` the group-count leg (the four pinned count strings).
- `tooling/build-checks.mjs`:
  - `:327-343` `ok` / `group`; `:11221` the verdict `if` block that groups 35-48 live inside; `:16403-16411` group 48's
    end and the `all 48 groups pass` line.
  - Group 35 `:11224-11735` — `VALID_FOR` `:11270-11281` (`variant.add` fixture `{ key: "b", overrides: { f1: { set: {} } } }`
    at `:11278`), `fold()` `:11301-11303`, the 35.3 refusal idiom `:11380-11402`, 35.6 `missingStates` `:11530-11546`,
    the group string `:11735`.
  - Group 36 `:11738-12055` — the store import `:11761`, 36.3 mutations `:11840-11846`, 36.9 `loadDecisions`
    `:11970-11985`, the group string `:12055`.
  - Group 39 `:12206-12370` — the in-process "pure renderer vs committed bytes" pattern (`:12252-12260`) and its rule
    that a check never calls a writing generator.
  - Group 42 `:13546-13936` — committed SYNTHETIC fixtures labelled as such in messages.
- `tooling/canvas-journey.mjs` — header `:1-100`; `REPO` `:110`; `boot` `:167`; `seed` `:250-278`; `ledger`/`waitLines`
  `:279-287`; `gitDiscovery`/`gitImportScope` `:287-288`; `openCanvas` `:289`; `openDetails` `:324`; `leg` `:338-365`;
  step 12a/12 `:564-587` (page-doc vs disk fold); 15 `:617` (44×44).
- `discovery/README.md:622-842` — the build half: layout block `:631-641`, `ops.jsonl` `:690-733` (the ten-verbs
  paragraph `:725-733`), the build transcript `:735-768` (refused kinds `:761-763`), `canvas.json` `:770-796`, spine
  `:798-826`, "What the gate reads" `:828-841`.
- `discovery/faster-payment/build/ops.jsonl` (6 lines) and `canvas.json` (positions f1 0/0, f2 472/0, d7 894/0, d8
  1206/0) — the spine.
- `discovery/faster-payment/transcript.jsonl` — `record_decision` seq 7 (`answer_ref a4`, `evidence_refs []`) and seq 8
  (`a5`, `[]`); `file_evidence` seqs 1, 2, 5, 13, 24, 25; seq 3 has `evidence_refs [1, 2]` (the resolving control).
- `import/ir.mjs:60` `DROP_CLASSES`; `import/fixtures/records/spike-c-wrong-but-green.{json,md}` — a real record (21
  drops: 13 read-then-dropped, 8 read-but-never-emitted, 0 never-read); drop row keys `class, kind, path, reason, ref,
  slot, value` (converter) or `class, role, literal, why` (owner drop, `portal/lib/import-run.mjs:201`).
- `portal/lib/import-run.mjs:103` (`denied` line shape `{type, ts, tool, input, error, via}`), `:333-345` the
  `imports/<id>.{json,md,transcript.jsonl,reference.png}` paths.
- `portal/lib/canvas-session.mjs:162-178` — `REFUSAL_KINDS` and the build transcript's `refused` line
  `{type, turn, kind, seq?, error?, text?}`; `canvas-store.mjs:411-430` `appendAgentLine` (a refused agent line carries
  no `params`).
- `.claude/references/gates.md:7` (the CI legs sentence), `:11` (`48 pure groups`), `:59` (group 35), `:61` (group
  36), `:86-88` (groups 47-48 — the entry format), `:135` (`canvas-journey.mjs`).

### New Files to Create

- `agent-layer/gen-build-handoff.mjs` — pure `renderPack` + `readBuildPackage` + `writeBuildHandoff` +
  `genBuildHandoff({check})` + CLI.
- `tooling/fixtures/builds/two-lane/build/ops.jsonl`, `canvas.json` — SYNTHETIC two-lane package (typed, applied,
  saved through the real store).
- `tooling/fixtures/builds/two-lane/README.md` — one paragraph: SYNTHETIC, typed for the gate, not a design; how it
  was produced.
- GENERATED: `discovery/faster-payment/build/handoff/{flow.md,drops.md,refusals.md,lineage.json}` and
  `tooling/fixtures/builds/two-lane/build/handoff/{flow.md,drops.md,refusals.md,lineage.json}`.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Mermaid state diagrams](https://mermaid.js.org/syntax/stateDiagram.html) — §"States" (`s2 : This is a state
  description`), §"Transitions" (`s1 --> s2: A transition`). Why: the exact line grammar `stateDiagram` emits. A label
  containing `:` `;` `#` `{` `}` or a newline is unsafe; the renderer strips them (Task 1.4).
- `docs/epics/canvas-design-import.architecture.md:124-137` — "One override shape, three uses" + `missingStates`
  "run in three places … resolving its override map over the A lane first". Why: the one-code-path rule.
- `.claude/references/gates.md:1-13` — every gate states what it cannot reach; the group-count pin.

### Patterns to Follow

**A pure read** (`system/canvas-ops.mjs:470-477`): total over junk, never throws, returns a list or `{…, flags}`.

**An applier refusal** — names the verb, the offending value and the rule (`canvas-ops.mjs:413-415`):
```js
throw new Error(`variant.add: key ${JSON.stringify(p.key)} is not a lane key — lowercase letters, digits and hyphens, 1–24, starting with a letter or digit`);
```

**A generator with check mode** (`agent-layer/gen-replay.mjs:180-194`):
```js
const drifted = [];
for (const slug of slugs) {
  const out = JSON.stringify(artifactFor(slug), null, 2) + "\n";
  const dest = join(REPLAY, `${slug}.json`);
  if (check) {
    let prior;
    try { prior = readFileSync(dest, "utf8"); } catch { prior = ""; } // a MISSING artifact counts as drift
    if (prior !== out) drifted.push(`replay/${slug}.json`);
  } else writeFileSync(dest, out);
}
return { runs: slugs.length, ops: total, drifted };
```
CLI guard (`gen-handoff.mjs:100-104`): `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`
— `pathToFileURL`, because the repo path contains a space.

**A drift leg** (`tooling/drift-check.mjs:168-173`):
```js
function checkReplay() {
  const r = genReplay({ check: true });
  if (r.drifted.length)
    throw new Error(`replay drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-replay.mjs`);
}
```

**A build-checks refusal battery** (`tooling/build-checks.mjs:11380-11402`) — `[label, fn, ...mustName]` rows,
`ok(names(fn, ...must) === null, …)`; every constructive call through `fold()`; reads optional-chained, because
`ok()` only accumulates and an uncaught throw kills the run before any named failure prints.

**A page owner op** (`portal/public/canvas.mjs:817`): emit a `ui.*` bus event from the gesture; a consumer in
`registerConsumers` calls `applyOwnerOp({ op, params })`, which applies through the real applier, queues a pending
line and reconciles. Bus types must match `/^(ui|agent)\.[a-z][a-z-]*$/` (`system/action-bus.mjs:54`).

**Strings from a package reach the page only as `textContent`** (`canvas.mjs:20-21`, call 4) — the flow panel's
`<pre>` included.

---

## IMPLEMENTATION PLAN

### Phase 1: The lane reads in `system/canvas-ops.mjs`

The one code path every later phase calls. Pure, DOM-free, no new import.

### Phase 2: The pack generator

**Depends on:** Phase 1 (`laneKeys`, `laneDoc`, `missingStates(doc, lane)`, `flowEdges`, `stateDiagram`).

### Phase 3: Fixtures and the generated packs

**Depends on:** Phase 1 (the fixture's `variant.add` uses `omit`, which the tightened case must accept) and Phase 2.

### Phase 4: The gates (build-checks 35.15, 36.12, group 49; the drift leg)

**Depends on:** Phases 1-3. **Independent of:** Phase 5 — the page and the gates can be built in parallel once Phase
3's fixtures exist.

### Phase 5: The canvas page, the pack route, the journey

**Depends on:** Phases 1-2.

### Phase 6: Docs

**Depends on:** Phases 1-5 (it documents what landed).

### Phase 7: Regenerate, validate, hand off

**Depends on:** everything.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 — Branch and apply the proof patch

- **IMPLEMENT**:
  ```
  git fetch origin && git status --porcelain -- system agent-layer portal tooling discovery   # expect only this session's untracked plans
  git switch -c feat/variant-lanes-handoff-pack-314 origin/main
  git apply --index .claude/plans/variant-lanes-handoff-pack-314.proof.patch
  git branch --show-current                                                                     # feat/variant-lanes-handoff-pack-314
  ```
- **GOTCHA**: if `origin/main` has moved past a0c03f0 and `git apply` fails, run `git log a0c03f0..origin/main --stat`.
  Then apply with `git apply --3way` and resolve against the moved file. The likely movers are `system/canvas-ops.mjs`
  (#313/#315, the op-verb lock) and `portal/server.mjs`. At planning time no open PR and no remote branch touched
  `canvas-ops.mjs` (observed with `gh pr list` and `git ls-remote`). If the conflict is in `system/loc-summary.json` or
  a baseline PNG, never hand-merge it. Take main's version and regenerate it (Task 7.1).
- **GOTCHA**: shared working dir (memory: shared-worktree-parallel-sessions). Check the branch before every commit.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 48 groups pass`, and
  `node agent-layer/gen-build-handoff.mjs --check` → `build handoff  ✓  2 packages, 8 files — no drift`. Both need
  `npm ci` in `tooling/icons` and `tooling/style-dictionary` first.
- **COMPLETES**: Tasks 1.1–1.4, 2.1, 3.1 (except its README), 3.2, the store half of 4.2, 5.1–5.3 and 7.1. For those
  tasks, read the task as the specification of what the patch does and run its VALIDATE. Do not rewrite the code.
- **SATISFIES**: all three ACs (their code); the remaining tasks add the gates that prove them.
- **REGENERATES**: already regenerated inside the patch: `system/loc-summary.json` and the three approach baselines.

### Task 1.1 — UPDATE `system/canvas-ops.mjs`: tighten `variant.add` (omit, exact override keys, key "a")

- **IMPLEMENT**: in the `variant.add` case (`:412-433`), after the key regex check (`:413-415`):
  - refuse `p.key === "a"`: `` `variant.add: "a" is lane A — the base document itself, which every other lane is its differences on; name the new lane b, c, …` ``.
  - inside the `for (const [fid, ov] of Object.entries(p.overrides))` loop, after `plainObject(ov)` (`:424-426`):
    - unknown keys: `const LANE_OVERRIDE_KEYS = Object.freeze(["set", "hide", "add", "omit"]);` (module scope, beside
      `VARIANT_KEY_RE` `:99`, exported) — for each `k` not in it throw `` `variant.add: unknown key "${k}" in the override for "${fid}" — a lane override takes ${LANE_OVERRIDE_KEYS.join(", ")}` ``.
    - `ov.omit !== undefined && ov.omit !== true` → `` `variant.add: "omit" on "${fid}" must be true — a frame is either left out of the lane or not` ``.
    - `ov.omit === true && Object.keys(ov).length > 1` → `` `variant.add: "${fid}" is left out of lane "${p.key}" and also carries ${Object.keys(ov).filter((k) => k !== "omit").join(", ")} — a frame left out has nothing to set` ``.
  - Update the comment at `:429-430` ("The lane UI and the per-variant completeness check are #314's") to say what
    `omit` means: the frame does not exist in this lane; omitting a BASE leaves its states out too (laneDoc's rule).
  - Update the header comment `:51-55` NOT AT ALL (no verb added) — but add one line under the `VARIANT_KEY_RE`
    comment: `"a"` is reserved for the base lane.
- **PATTERN**: `canvas-ops.mjs:413-427` (the existing refusals, same voice).
- **IMPORTS**: none.
- **GOTCHA**: this edits an existing verb's case under the epic's op-verb lock's spirit (the lock is about ADDING a
  verb, `:52-55`). Before starting, `git log origin/main --oneline -- system/canvas-ops.mjs` — if #313 or #315 has
  landed a verb since a0c03f0, rebase first. Do NOT touch `OPS`, `PARAMS`, `OPTIONAL` or `VALID_FOR`.
- **GOTCHA**: `refuseFrozen("variant.add", ov.add, next)` at `:427` must still run for a non-omit entry — keep it after
  the new checks.
- **VALIDATE**: `node -e 'import("./system/canvas-ops.mjs").then(m=>{const d=m.applyOps([{op:"screen.compose",params:{screenId:"s",why:"w",composition:{name:"stack",id:"r"}}}]);for(const o of [{key:"a",overrides:{}},{key:"b",overrides:{f1:{omit:1}}},{key:"b",overrides:{f1:{omit:true,set:{}}}},{key:"b",overrides:{f1:{bogus:1}}}]){try{m.applyOp(d,{op:"variant.add",params:o});console.log("ACCEPTED",JSON.stringify(o))}catch(e){console.log("refused:",e.message)}}console.log(m.applyOp(d,{op:"variant.add",params:{key:"b",overrides:{f1:{omit:true}}}}).variants.length)})'`
  — expected: four `refused:` lines, then `1`. (Observed BEFORE the change on a0c03f0: `{f2:{omit:true}}` and key
  `"a"` are both ACCEPTED — see NOTES pre-flight.)
- **REDDENS**: covered by 35.15's refusal rows (Task 4.1).
- **SATISFIES**: AC #1 (a lane can lack a state).
- **REGENERATES**: `system/loc-summary.json` (runtime group) — at Task 7.1, not now.

### Task 1.2 — ADD `laneKeys`, `laneDoc` to `system/canvas-ops.mjs`

- **IMPLEMENT** (new section after `canDeleteBasePart`, before `frameTree`, header `// ---- #314: lanes ----`):
  - `export const BASE_LANE = null;` — the A lane's key. Comment: lane A is the document itself; `doc.variants`
    holds only the other lanes (G33: "variant B stored as differences on A").
  - `export function laneKeys(doc)` → `[null, ...keys]` — `null` first, then every `doc.variants[i].key` that is a
    string, in document order. Total over junk.
  - `export function laneDoc(doc, lane)` → `{ doc, flags }`:
    - `lane == null` → `{ doc: <frames/arrows/variants of doc, junk-filtered>, flags: [] }` (a shallow structural copy;
      never mutate the argument).
    - unknown lane key → `{ doc: { ...base, frames: [], arrows: [] }, flags: [{ kind: "unknown-lane", lane }] }` — a
      lane that does not exist holds no frames, so nothing in it is missing (stated in the comment; this keeps
      `missingStates`'s "empty means the floor is met" true of what was checked).
    - known lane: `omitted = new Set(ids whose override has omit === true)`; a state whose `baseId` is omitted is
      omitted too; `frames` = the rest; `arrows` = those whose `from.frameId` and `to.frameId` both survive;
      `flags` = one `{ kind: "omitted", frameId, lane }` per omitted frame, in frame order. Frames are NOT resolved
      here — `frameTree` does the part layering (one merge rule).
- **PATTERN**: `missingStates` `:510-522` (junk filter `frames.filter((f) => f && typeof f === "object")`).
- **GOTCHA**: `laneDoc` must not import or call the applier — reads never throw.
- **VALIDATE**: `node --check system/canvas-ops.mjs` (expected: no output). Behaviour is proven in Task 4.1.
- **SATISFIES**: AC #1, AC #2.
- **REGENERATES**: none now.

### Task 1.3 — UPDATE `frameTree` and `missingStates` to take a lane

- **IMPLEMENT**:
  - `frameTree(doc, frameId, lane = null)`: if `lane != null`, `const v = variantOf(doc, lane)` (a private helper:
    `doc.variants.find((x) => x && x.key === lane)`); if the frame (or its base) is omitted in the lane, return
    `{ tree: null, flags: [{ kind: "omitted", frameId, lane }] }`. Unknown lane → `{ tree: null, flags: [{ kind: "unknown-lane", lane }] }`.
    Layers (`:572`) become, for a state:
    `[{ set: base.sets }, laneOv(base.id), state.overrides, { set: state.sets }, laneOv(state.id)]` and for a base:
    `[{ set: base.sets }, laneOv(base.id)]`, where `laneOv(id) = v?.overrides?.[id] ?? null` with `omit` stripped.
    **The order is the decision**: the lane's change to a base reaches every state of that base (a state IS its base
    except where it says), and the state's own override still wins over it (the error state's "Send anyway" survives
    lane B relabelling Continue); the lane's override of a state frame is applied last. Write that as the comment.
  - `missingStates(doc, lane = null)`: replace `:515` (`base.variantKey` filter) and the `variantKey` prose at `:509`
    with `const frames = laneDoc(doc, lane).doc.frames` then the unchanged loop. The header comment says "resolves the
    lane first (G33) — the page, build-checks group 49 and the handoff generator call this one function".
- **PATTERN**: `frameTree` `:552-592` unchanged otherwise; `resolve` stays the only merge.
- **GOTCHA**: existing callers pass no lane (`portal/public/canvas.mjs:189`, `portal/lib/canvas-session.mjs:431`,
  `tooling/build-checks.mjs:11531,11543,11545`) — lane `null` must give byte-identical answers to today's. 35.6 stays
  green unmodified; run it after this task.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build (canvas ops|build package|compose session)"` —
  expected `✓` on all three (observed on a0c03f0: all three `✓`).
- **SATISFIES**: AC #1, AC #2.
- **REGENERATES**: none now.

### Task 1.4 — ADD `flowEdges` and `stateDiagram`

- **IMPLEMENT**:
  - `export function frameLabel(doc, frameId)` → `screenId` for a base, `` `${stateKey} of ${base.screenId}` `` for a
    state, the id when unknown. Mirrors `portal/public/canvas.mjs:110-114` `frameName` (the page keeps its own; do not
    refactor the page to import this — surgical).
  - `export function flowEdges(doc, lane = null)` → one entry per arrow of `laneDoc(doc, lane).doc`, in arrow order:
    `{ id, from, to, fromLabel, toLabel, partId, partText, trigger }`. `partText` = the resolved part's
    `props.label ?? props.content ?? null` from `frameTree(doc, from, lane).tree` (walk by `id`) — so lane B's relabel
    shows on B's arrow. Total over junk.
  - `export function stateDiagram(doc, lane = null)` → string: `"stateDiagram-v2"` then, per surviving frame in frame
    order, `` `  ${id} : ${mm(frameLabel)}` ``, then per edge `` `  ${from} --> ${to} : ${mm(label)}` `` where `label` =
    `tapping ${partText}` when a part has text, else `from ${partId}`, else `on load`; then `, when ${trigger}` if a
    trigger exists. A lane with no frames answers `"stateDiagram-v2"` alone. `mm(s)` = `String(s).replace(/[\r\n]+/g, " ").replace(/[:;#{}<>"]/g, "").replace(/\s+/g, " ").trim()`. Lines joined with `\n`, no trailing newline.
- **PATTERN**: `frameTree`'s walk (`:563-568`).
- **GOTCHA**: ids are `f<n>` so they are valid Mermaid state ids; never emit a screenId as an id.
- **VALIDATE** (expected, on the spine, lane A):
  ```
  node -e 'Promise.all([import("./portal/lib/canvas-store.mjs"),import("./system/canvas-ops.mjs")]).then(([s,m])=>console.log(m.stateDiagram(s.foldLedger(s.loadBuild("discovery/faster-payment/build").ops).doc)))'
  ```
  expected output:
  ```
  stateDiagram-v2
    f1 : add-payee
    f2 : error of add-payee
    f1 --> f2 : tapping Continue, when Confirmation of Payee returns a non-match
  ```
- **SATISFIES**: AC #1 (flow.md content), AC #2 (the page's diagram).
- **REGENERATES**: none now.

### Task 2.1 — CREATE `agent-layer/gen-build-handoff.mjs`

- **IMPLEMENT**. Header in the house voice citing `#314, epic #295, docs/epics/canvas-design-import.architecture.md
  § Data model "The handoff pack, extended"`, stating: pure core / thin shell; the pack is per package at
  `<pkg>/build/handoff/`, never under `handoff/verdant/` (NOTES D1); regenerated, never hand-edited; CANNOT REACH
  (whether Mermaid parses flow.md — a human paste into mermaid.live; whether a drop's reason is right — the import's
  own gate, group 42; whether a decision is a good one).
  - `export const PACK_FILES = Object.freeze(["flow.md", "drops.md", "refusals.md", "lineage.json"]);`
  - `export function readBuildPackage(pkgRoot)` → `{ slug, ops, transcript, answers, buildTranscript, imports }`:
    `ops` from `loadBuild(join(pkgRoot, "build")).ops` (throw naming the path if `loadBuild` answers null);
    `transcript`/`answers` = parsed `<pkg>/transcript.jsonl` / `answers.jsonl` or `null` when absent;
    `buildTranscript` = `<pkg>/build/transcript.jsonl` lines or `[]`; `imports` = for every `build/imports/*.json`
    (sorted; excluding nothing else — `.transcript.jsonl` and `.md` are not `.json`): `{ id, record, md: text|null,
    transcript: lines|[] }`. A private `readJsonl` (copy `canvas-store.mjs:303-307`; it is not exported).
  - `export function renderPack(pkg)` → `{ "flow.md", "drops.md", "refusals.md", "lineage.json", ...{"imports/<id>.md": md} }` — PURE, no fs, no clock:
    - `doc = foldLedger(pkg.ops).doc` (the store's fold — one fold rule).
    - **flow.md**: `# Flow — ${slug}` · a one-paragraph provenance line (generated by
      `agent-layer/gen-build-handoff.mjs` from `build/ops.jsonl` (#314); regenerated, a hand edit is lost; lane A is
      the document, every other lane its differences, G33) · per `laneKeys(doc)`: `## Lane A (base)` or
      `## Lane ${key}`; for a non-A lane a `Differences from lane A:` list (`- ${fid} · set ${part}.${prop} → "${value}"`,
      `- ${fid} · hide ${part}`, `- ${fid} · add (not rendered; flagged)`, `- ${fid} · left out of this lane`), then a
      ```` ```mermaid ```` fence around `stateDiagram(doc, key)`, then the G5 sentences from `flowEdges` —
      `- From ${fromLabel} (${from}), tapping ${partText} goes to ${toLabel} (${to}), when ${trigger}.` (variants for
      no part text / no trigger as in Task 1.4) or `- No arrows in this lane.` — then `Missing states (the floor is
      ideal · empty · error · partial · loading):` and one `- ${label} (${frameId}): ${missing.join(", ")}` per
      `missingStates(doc, key)` entry, or `- None — every screen in this lane meets the floor.`; then, if
      `frameTree` flags any `dangling-set`/`dangling-hide`/`unsupported-add` for this lane, `Flagged: …` lines
      (flagged and shown, never dropped).
    - **drops.md**: `# Drops — ${slug}` · provenance line · if `imports.length === 0`: the line
      `No imports — this build package has no import records, so nothing was dropped.` (AC #1: written, never omitted).
      Else per record `## Import ${id}` and, for EACH of `DROP_CLASSES` (import from `../import/ir.mjs`), a
      `### ${class}` heading and either `- ${row.path ?? row.role} · ${row.kind ?? "owner"} — ${row.reason ?? row.why}`
      per row or `- none`. A record with no `imports/<id>.md` gets the line `The record's markdown projection is
      missing — it is not in this pack.`
    - **refusals.md**: `# Refusals — ${slug}` · provenance line · three sections, each always present:
      `## On the ledger` — every `ops.jsonl` line with `status === "refused"`: agent lines
      `- seq ${seq} · agent · ${op} — ${kind}: ${error}` (kind/error joined from the `buildTranscript` `refused` line
      with the same `seq`; `reason not recorded` when none), owner verdicts `- seq ${seq} · owner refused the
      proposal at seq ${fromStep} (${op})`; `## Before the ledger` — `buildTranscript` `refused` lines with no `seq`
      (`one-per-turn · wrong-target · schema · not-covered`): `- turn ${turn} · ${kind} — ${error ?? text}`;
      `## Imports` — every `denied` line of every import transcript: `- ${id} · ${tool} denied via ${via} — ${error}`.
      Empty section → `- none`. Collapse whitespace in every quoted string (`/\s+/g → " "`).
    - **lineage.json**: `JSON.stringify(x, null, 2) + "\n"` of
      `{ $description, transcript: "present"|"absent", frames: [...], decisions: [...], embodies: [...] }`:
      - `frames`: every frame in doc order — `{ frameId, label, baseId|null, decisionRefs: [...], via: baseId|null, flags }`;
        a BASE with no refs → `flags: ["no-decision"]`; a STATE with no refs → `via: baseId`, no flag (its chain is its
        base's).
      - `decisions`: one per distinct ref in frame order — `{ id, questionId, answerRef, answer: "resolved"|null,
        evidence: [{ seq, name, provenance }], flags }`. Flags, each only when true: `no-transcript` (package
        transcript absent), `unresolved-decision` (no `record_decision` op line with that seq), `unresolved-answer`
        (`answer_ref` not a `ref` in answers.jsonl), `no-evidence` (`evidence_refs` empty), `unresolved-evidence:<seq>`
        (an evidence ref with no `file_evidence` op line). **Flagged, never dropped**: an unresolvable ref still gets
        its row.
      - `embodies`: `{ frameId, decisionId }` per frame × ref — the derived `embodies` edges.
      - `$description`: one sentence: frame → decision → answer → evidence by id (transcript seq, answers.jsonl ref,
        file_evidence seq); a broken link is a flag on its row, never a missing row.
    - `"imports/<id>.md"`: the record's `md`, byte for byte.
    - Every `.md` ends with exactly one `\n`.
  - `export function writeBuildHandoff(pkgRoot)` → `{ dir, files }`: `dir = join(pkgRoot, "build", "handoff")`;
    `rmSync(join(dir, "imports"), { recursive: true, force: true })` (the #64 clean slate, scoped to the one owned
    subdir); `mkdirSync`; write every `renderPack` entry.
  - `export const PACKAGE_ROOTS = [join(ROOT, "discovery"), join(ROOT, "tooling/fixtures/builds")]` and
    `export function committedPackages()` → `listBuilds(PACKAGE_ROOTS.map((dir) => ({ provenance: "fictional", dir })))`
    mapped back to absolute package roots (`join(dir, slug)`).
  - `export function genBuildHandoff({ check = false } = {})` → `{ packages, files, drifted }`: for each committed
    package, `renderPack(readBuildPackage(p))`; in check mode compare each file to disk (missing = drift) AND list
    every file under `<p>/build/handoff/` (recursive) that `renderPack` did not produce as drift (`orphan`) — the
    both-directions rule of `gen-replay.mjs:170-178`; otherwise `writeBuildHandoff(p)`. Paths in `drifted` are
    repo-relative.
  - CLI: `node agent-layer/gen-build-handoff.mjs [--check]` → `build handoff  ✓  <n> packages, <m> files` (or
    `✗ drift: … — regenerate with: node agent-layer/gen-build-handoff.mjs`, exit 1); `--root <pkgRoot>` writes one
    package (the operator's path for a jobs-folder package).
- **PATTERN**: `agent-layer/gen-replay.mjs:165-210` (check mode + CLI); `gen-handoff.mjs:49,64` (clean slate).
- **IMPORTS**: `node:fs` (`existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync`),
  `node:path`, `node:url` (`fileURLToPath, pathToFileURL`); `{ foldLedger, listBuilds, loadBuild }` from
  `../portal/lib/canvas-store.mjs`; `{ flowEdges, frameLabel, frameTree, laneDoc, laneKeys, missingStates, stateDiagram, STATE_KEYS }`
  from `../system/canvas-ops.mjs`; `{ DROP_CLASSES }` from `../import/ir.mjs`.
- **GOTCHA**: agent-layer importing `portal/lib/canvas-store.mjs` is new in direction. It is safe for CI because the
  store's graph is node built-ins + canvas-ops (`canvas-store.mjs:20-23`, pinned by 36.6) — and `import/ir.mjs` is
  node-only (group 40). Group 49 pins this module's graph too (Task 4.3).
- **GOTCHA**: `ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")` — never cwd (`gen-handoff.mjs:15`).
- **GOTCHA**: no `new Date()` anywhere in the renderer — byte-identical output is what the drift leg compares.
- **VALIDATE**: `node agent-layer/gen-build-handoff.mjs --check; echo "exit $?"` — expected (before Task 3.2 writes
  anything): `✗ drift:` naming `discovery/faster-payment/build/handoff/flow.md` etc. and `exit 1` (a missing pack is
  drift — the positive control for AC #3).
- **SATISFIES**: AC #1, AC #3.
- **REGENERATES**: `system/loc-summary.json` (generators group, 3058 lines today → +~350) at Task 7.1.

### Task 3.1 — CREATE the two-lane fixture `tooling/fixtures/builds/two-lane/`

- **IMPLEMENT**: D-a's recipe (`discovery/README.md:808-814`): type the ops, fold with the real `applyOps`, write with
  the real `saveBuild`. Run once from the repo root (a one-off `node -e`; never commit it as a `.mjs` — memory:
  drift-check syntax-checks parked `.mjs`):
  ```js
  // node --input-type=module -e '…'
  import { readFileSync } from "node:fs";
  import { applyOps } from "./system/canvas-ops.mjs";
  import { arrangement, saveBuild } from "./portal/lib/canvas-store.mjs";
  const spine = readFileSync("discovery/faster-payment/build/ops.jsonl", "utf8").trim().split("\n").map(JSON.parse);
  const extra = [
    { op: "state.add", params: { baseId: "f1", stateKey: "loading", override: { set: { continue: { label: "Checking the name…" } } } } },
    { op: "connect", params: { from: { frameId: "f1", partId: "continue" }, to: { frameId: "f3" }, trigger: "the name check is still running" } },
    { op: "variant.add", params: { key: "b", overrides: { f1: { set: { continue: { label: "Check the name" } } }, f2: { omit: true } } } },
  ];
  const all = [...spine.map(({ op, params }) => ({ op, params })), ...extra];
  const doc = applyOps(all);
  const lines = all.map((o, i) => ({ seq: i + 1, at: "2026-09-29T00:00:00.000Z", source: "owner", op: o.op, params: o.params, status: "applied" }));
  const positions = { f1: { x: 0, y: 0 }, f2: { x: 472, y: 0 }, f3: { x: 472, y: 700 }, d7: { x: 894, y: 0, w: 280 }, d8: { x: 1206, y: 0, w: 280 } };
  saveBuild("tooling/fixtures/builds/two-lane/build", arrangement(doc, positions), lines);
  ```
  The positions shape matches `positionsOf` (`canvas-store.mjs:216-223`: `{x, y}` for a frame, `{x, y, w}` otherwise).
  This exact recipe was dry-run at planning time against a0c03f0 into the scratchpad (with Task 1.1 NOT applied —
  today's applier accepts `omit` unvalidated): `verifyBuild` → `[]`, frames `f1:ideal f2:error f3:loading`, arrows
  `a1 a2`, lane-A `missingStates` → `["empty","partial"]`. Run it AFTER Task 1.1 so the tightened case accepts it too.
  Then `README.md`: "SYNTHETIC — typed for build-
  checks group 49 and the drift leg (#314), not a design and not a run. The first six ops are the spine's; the last
  three add a loading state, an arrow to it, and lane b, which relabels Continue and leaves the error state out. No
  transcript.jsonl, so every decision ref is flagged no-transcript in lineage.json — deliberately. Reproduce: …" (paste
  the recipe).
- **GOTCHA**: `tooling/fixtures/builds/` is outside `discovery/`, so group 36's `listBuilds` never sees it — its
  "every committed line is owner" rule is not what makes this honest; the README label is. It sits under
  `tooling/fixtures/` beside `harborlight/` (the instance-journey fixture) by the same convention.
- **GOTCHA**: `state.add` `loading` with an override that sets `continue.label` proves the state's override WINS over
  lane b's base relabel in lane b (Task 1.3's order): in lane b, f3's Continue reads "Checking the name…", not "Check
  the name". That is 35.15's order assertion over a committed fixture.
- **VALIDATE**:
  `node -e 'import("./portal/lib/canvas-store.mjs").then(s=>console.log(JSON.stringify(s.verifyBuild(s.loadBuild("tooling/fixtures/builds/two-lane/build")))))'`
  — expected `[]`.
- **SATISFIES**: AC #1 (the two-lane fixture).
- **REGENERATES**: none (fixture files are committed as written).

### Task 3.2 — GENERATE both packs

- **IMPLEMENT**: `node agent-layer/gen-build-handoff.mjs` then `--check`.
- **VALIDATE**: `node agent-layer/gen-build-handoff.mjs --check` → `build handoff  ✓  2 packages, 8 files` (derived: 2
  packages × 4 files, no imports in either). Then read both `flow.md` files and confirm by eye:
  - spine: one section `## Lane A (base)`; missing `add-payee (f1): empty, partial, loading`.
  - two-lane, lane A: arrows f1→f2 and f1→f3, both "tapping Continue"; missing `empty, partial`.
  - two-lane, lane b: differences list names f1's set and f2 left out; diagram has f1 and f3 only, arrow
    `f1 --> f3 : tapping Check the name, when the name check is still running`; missing `empty, error, partial`.
  - spine `lineage.json`: decisions 7 and 8, `answerRef` a4 and a5, `flags: ["no-evidence"]` each; f2 `via: "f1"`.
  - both `drops.md`: the "No imports" line.
- **SATISFIES**: AC #1, AC #3.
- **REGENERATES**: the eight pack files (commit them).

### Task 4.1 — ADD build-checks 35.15 "lanes" (in group 35, before its `group(...)` call at `:11735`)

- **IMPLEMENT**, all through `fold()` / optional chaining:
  - **The refusals** (35.3's row idiom): key `"a"` (must name `"a"` and `lane A`), `omit: 1` (`"omit"`, `must be true`),
    `{omit: true, set: {}}` (`left out`, `set`), `{bogus: 1}` (`unknown key "bogus"`); and the positive control that
    `{f1: {omit: true}}` and `{f1: {set: {}, hide: [], add: []}}` are ACCEPTED (without it the battery passes on an
    applier that refuses every override).
  - **`laneKeys`**: `[null]` on `emptyDoc()`, `[null, "b"]` after the `VALID_FOR` lane; total over 5 junk docs.
  - **`laneDoc`**: omitting a base omits its states and every arrow touching either; an unknown lane answers no frames
    plus an `unknown-lane` flag; the argument is not mutated (compare `deep()` before/after).
  - **`frameTree` layer order**: a doc with base `f1` (part `continue` label "Continue"), state `f2` whose override sets
    `continue.label` "Send anyway", lane b setting `f1.continue.label` "Check the name" and `f2.continue.hint` "x":
    lane b's f1 reads "Check the name"; lane b's f2 reads "Send anyway" (the state's own override wins) with hint "x";
    lane A's f1 reads "Continue". An omitted frame answers `tree: null` with an `omitted` flag.
  - **`missingStates` per lane**: on the committed two-lane fixture (`loadBuild` + `foldLedger`),
    `missingStates(doc)[0].missing` deep-equals `["empty","partial"]` and `missingStates(doc, "b")[0].missing`
    deep-equals `["empty","error","partial"]` — "error on B only" (AC #1); `missingStates(doc, "zz")` is `[]`.
  - **`stateDiagram` / `flowEdges`**: the spine's lane-A text equals Task 1.4's expected block exactly; lane b of the
    fixture has no `f2` line and its arrow label says `tapping Check the name`; a label containing `a:b;c#d` is
    emitted as `abcd`.
  - Append to group 35's `group()` string a sentence starting `#314's lanes (35.15): …` naming every case above, and
    the CANNOT REACH addition "whether Mermaid parses the text (a human paste)".
- **PATTERN**: `tooling/build-checks.mjs:11380-11402` (refusal rows), `:11530-11546` (35.6).
- **GOTCHA**: 35.6 must stay unmodified and green — it pins the lane-A behaviour.
- **GOTCHA**: `import` the new names into group 35's canvas-ops import (find it with
  `grep -n "canvas-ops.mjs" tooling/build-checks.mjs | head`).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build canvas ops"` → `✓`.
- **REDDENS**: (a) delete the `omit`-with-other-keys throw → the `{omit:true,set:{}}` row fails `…must name "left out"
  — got NO THROW`; (b) swap `laneOv(base.id)` after `state.overrides` in `frameTree` → "lane b's f2 reads Send anyway"
  fails; (c) restore `:515`'s `base.variantKey` filter → the fixture's lane-b `missingStates` answers `[]` and fails.
  Run all three, see red, revert.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### Task 4.2 — ADD `laneFlaws` to `verifyBuild` + build-checks 36.12

- **IMPLEMENT**:
  - `portal/lib/canvas-store.mjs`: `export function laneFlaws(doc)` → `string[]`: for every variant, every override key
    that names no frame in `doc.frames` → `` `lane "${key}" overrides "${fid}", which the ops do not create` ``. Call it
    in `verifyBuild` on the folded doc (`:254`): `derivedDoc = foldLedger(ops).doc; out.push(...laneFlaws(derivedDoc))`
    — fold once and reuse it for `arrangement`. Header comment: through the applier this is unreachable today
    (`variant.add` refuses an unknown frame and `frame.remove` refuses an overridden one), so it is a TRIPWIRE for a
    loosened applier and the ticket's "the ops.jsonl ↔ canvas.json gate extends to variants"; its positive control is
    a hand-built document.
  - `loadDecisions` (`:315-331`): add `evidenceRefs: Array.isArray(l.params?.evidence_refs) ? [...l.params.evidence_refs] : []`
    to each row — the generator's lineage reads it (one join rule, not a second transcript reader for decisions).
  - build-checks 36.12: `laneFlaws` on a hand-built `{frames:[{id:"f1"}], variants:[{key:"b",overrides:{f9:{}}}]}`
    names `f9` and `b` (positive control); `[]` on the folded two-lane fixture; `verifyBuild` over the two-lane
    fixture → `[]`; 36.9's `loadDecisions` d7 row now carries `evidenceRefs` `[]` and seq 3's `[1, 2]`. Extend group
    36's `group()` string: `· 36.12 #314: …` + import `laneFlaws` at `:11761`.
- **GOTCHA**: `canvas-store.mjs` may import nothing new (36.6 pins node built-ins + canvas-ops).
- **GOTCHA**: `loadDecisions` feeds the page and `saveRun` (`server.mjs:480`, `:463`): an added field is inert there;
  do not rename existing fields.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "^build build package"` → `✓`.
- **REDDENS**: remove the lane blocker from `frame.remove` (`canvas-ops.mjs:367`, `lanes = []`) in a scratch edit, then
  fold `[compose, variant.add {b:{f1:{set:{}}}}, frame.remove f1]` through `verifyBuild` → it reports `lane "b" overrides
  "f1", which the ops do not create`. Revert. (Record the observed message in the report.)
- **SATISFIES**: ticket scope bullet "the ops.jsonl ↔ canvas.json gate extends to variants"; AC #1 (lineage evidence).
- **REGENERATES**: none.

### Task 4.3 — ADD build-checks group 49 "build handoff"

- **IMPLEMENT** after group 48's `group(...)` (`:16403`), inside the verdict block, banner `// --- 49 · the build
  package's handoff pack (#314) ---`:
  - 49.1 import graph: `agent-layer/gen-build-handoff.mjs` parsed specifiers are node built-ins +
    `../portal/lib/canvas-store.mjs` + `../system/canvas-ops.mjs` + `../import/ir.mjs` exactly (mirror 36.6's parser;
    a bare `import "x";` matched too, `:11570`).
  - 49.2 committed bytes: for each of `committedPackages()` (must include `faster-payment` and `two-lane` — assert by
    name, a discovery that finds nothing is not a pass), `renderPack(readBuildPackage(p))` equals every committed file
    under `<p>/build/handoff/` byte for byte, and no committed file is unrendered. Existence asserted before each read
    (ENOENT would end the run).
  - 49.3 AC #1 over the fixture's rendered `flow.md`: it contains `## Lane b`; lane b's missing line names `error`;
    lane A's does not.
  - (Observed on the patch: decision 3 → `a1`, evidence `1:contact centre call volume/cost data`,
    `2:app store reviews`, no flags; `"99"` → `["unresolved-decision"]`; the fixture's 7 and 8 → `["no-transcript"]`;
    the spike-c record → 22 list rows (21 drops + one `- none`), 3 class headings, `never-read` → `- none`, md
    byte-equal; the four refusal kinds each in their section; `renderPack` deterministic.)
  - 49.4 lineage: the spine's `lineage.json` chains `f1 → 7 → a4` and `f1 → 8 → a5` by id, each flagged `no-evidence`;
    a mutated in-memory package whose f1 links `["3", "99"]` renders decision 3 with evidence seqs `[1, 2]` resolved
    (names "contact centre call volume/cost data", "app store reviews") AND a row for `"99"` flagged
    `unresolved-decision` — present, not dropped; a package with no transcript flags every ref `no-transcript`.
  - 49.5 drops: the spine's `drops.md` contains the "No imports" line (AC #1: written, never omitted); an in-memory
    package whose `imports` holds `spike-c-wrong-but-green`'s committed record + md renders all three class headings,
    13 + 8 rows and `- none` under `never-read`, and `imports/spike-c-wrong-but-green.md` byte-equal to the committed md.
  - 49.6 refusals: an in-memory package with (a) an agent `refused` ledger line at seq 7 and a build-transcript
    `refused` line `{seq: 7, kind: "vocabulary", error: "no such component"}`, (b) an owner verdict `refused` with
    `fromStep`, (c) a transcript-only `one-per-turn` refusal, (d) an import transcript `denied` line — each appears in
    its section; the empty package renders `- none` three times.
  - 49.7 determinism: `renderPack` twice → identical; no `Date` in the module source.
  - 49.8 the drift predicate: `genBuildHandoff({ check: true }).drifted` is `[]` on the committed tree.
  - 49.9 every write route regenerates the pack: port `variant-lanes-handoff-pack-314.route-pin.txt`
    (`unpackedWriteRoutes`). Read `portal/server.mjs` as source, the case-21 way, because server.mjs reaches the SDK and
    cannot be imported in CI. Assert the eight POST `/api/canvas/*` routes are found by name (a pin that finds nothing
    is not a pass), and `missing` is `[]`. REDDENS: `withPack(root, editMapping(` → `(editMapping(` names
    `/api/canvas/import/mapping` (observed).
  - `group("build handoff", "…")` — what each case asserts, then `CANNOT REACH: whether Mermaid parses flow.md (a human
    paste into mermaid.live), whether a drop's reason is true (group 42's), whether the page's Write button writes
    (canvas-journey pass L), whether a decision is a good one`.
  - Change `all 48 groups pass` → `all 49 groups pass` (`:16410`).
- **PATTERN**: group 39 `:12206-12370` (pure renderer vs committed bytes, existence before read, mutations over the
  RENDERED text); group 48's layout for numbering.
- **GOTCHA**: group 39's rule — a check never calls a WRITING generator. 49.8 uses `check: true` only.
- **GOTCHA**: the group name `"build handoff"` must be distinct — drift-check's group-count leg counts distinct names
  (`drift-check.mjs:176-205`).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -2` → `build ✓  all 49 groups pass` (in a tree with
  `tooling/icons` and `tooling/style-dictionary` installed — without them group 41 is red for that reason alone,
  observed on a fresh worktree of a0c03f0).
- **REDDENS**: (a) edit one byte of the committed `discovery/faster-payment/build/handoff/flow.md` → 49.2 fails naming
  the file; (b) change `renderPack` to skip `drops.md` when there are no imports → 49.5 fails; (c) make lineage drop
  unresolvable refs (`.filter(Boolean)`) → 49.4's `"99"` row fails; (d) delete `two-lane/` → 49.2's by-name
  assertion fails. Run each, see red, revert.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### Task 4.4 — ADD the drift leg `checkBuildHandoff` to `tooling/drift-check.mjs`

- **IMPLEMENT**: `import { genBuildHandoff } from "../agent-layer/gen-build-handoff.mjs";` beside `:26`; a
  `checkBuildHandoff()` after `checkReplay()` mirroring `:168-173` with the message
  `` `build-handoff drift: ${r.drifted.join(", ")} — regenerate: node agent-layer/gen-build-handoff.mjs` ``; call it after
  `checkReplay();` (`:222`); append ` · build-handoff` to the `drift-check ✓` line (`:224`).
- **GOTCHA**: the existing `handoff` leg's porcelain check is scoped to `handoff/` (`:133-150`) and cannot see
  `discovery/*/build/handoff/` — that is why this leg exists (AC #3).
- **VALIDATE**: `node tooling/drift-check.mjs` → the ✓ line ending `· replay · build-handoff · group-count` (needs both
  `npm ci`s, see 4.3).
- **REDDENS**: append `x` to `discovery/faster-payment/build/handoff/flow.md` → `drift ✗  build-handoff drift:
  discovery/faster-payment/build/handoff/flow.md`; add an empty `…/handoff/stray.md` → drift names `stray.md` (the
  orphan direction). Revert both.
- **SATISFIES**: AC #3.
- **REGENERATES**: none.

### Task 5.1 — ADD `POST /api/canvas/pack` to `portal/server.mjs`

- **IMPLEMENT** after the save route (`:473-480`): read body, `resolveRunRoot({ provenance: b.provenance, slug: b.slug })`,
  `assertProvenanceRoot(b.provenance, root)`, `if (!loadBuild(path.join(root, "build"))) return notFound(res);`, then
  `const r = writeBuildHandoff(root); return json(res, 200, { files: r.files.map((f) => path.relative(root, f)) });`.
  Comment: `build/handoff/` has two portal writers, this route and the save route below. Named body params only,
  never a spread (the comment at `:470-472`).
  AND a `withPack(root, body)` helper, defined once above the canvas routes (in the patch). It calls
  `writeBuildHandoff(root)` and returns `body`, or, on a throw, `{ ...body, packError }`. **Every** route that writes
  into a build package answers through it: save, compose (both the result and the `{ refused }` data answer), import,
  import/drop, import/mapping and import/measure. The pack is therefore never older than its package, whatever wrote
  last (Q4, resolved). A pack that fails to write never turns a saved ledger into a 500; the page shows `Saved — pack
  not written: …`. build-checks 49.9 pins that every POST `/api/canvas/*` route except the read-only `import/binding`
  and `pack` calls `withPack(`, so a seventh write route added later without it goes red by name.
- **IMPORTS**: `import { writeBuildHandoff } from '../agent-layer/gen-build-handoff.mjs';`.
- **GOTCHA**: the origin guard (`portal/lib/origin.mjs`) runs before routing for every POST — no extra work, but the
  journey asserts it (L7).
- **GOTCHA**: case 21 (`build-checks.mjs:7615`) forbids `server.mjs` importing `writePrd`; this writes `build/handoff/`,
  inside the build half the canvas routes already write. It does not touch `prd.md`, `answers.jsonl` or
  `transcript.jsonl`.
- **OBSERVED** (proof): the lane driver's L5 shows the save route regenerating the pack (`## Lane b` on disk after Keep
  lane), L7 shows the button's output equal to `renderPack`, and L7 shows `http://evil.example` answered 403.
- **VALIDATE**: portal smoke on an OS-assigned free port, killing only its own PID (memory: portal-smoke-port-scoped-kill):
  ```
  S=<your scratchpad dir>; P=$(node -e 'const s=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})'); (cd portal && PORT=$P node server.mjs >"$S/pack-smoke.log" 2>&1 & echo $! > "$S/pack-smoke.pid"); curl -s --retry 20 --retry-connrefused --retry-delay 0 localhost:$P/api/health; curl -s -X POST -H 'content-type: application/json' -H "origin: http://localhost:$P" -d '{"provenance":"fictional","slug":"faster-payment"}' localhost:$P/api/canvas/pack; kill $(cat "$S/pack-smoke.pid"); git status --porcelain -- discovery/
  ```
  expected: health JSON; `{"files":["build/handoff/flow.md",…]}`; `git status` empty (the regenerated committed pack is
  byte-identical). Check `origin.mjs` for the accepted origin form before trusting a 403.
- **SATISFIES**: AC #2 ("the pack regenerates").
- **REGENERATES**: none.

### Task 5.2 — UPDATE `portal/public/canvas.html` + `portal/public/portal.css`

- **IMPLEMENT**: in the toolbar (`:28-34`), after Import: a `<label class="cv-lane" for="cv-lane">Lane</label>
  <select id="cv-lane" data-canvas-lane></select>`, `<button … data-canvas-verb="lane-new">New lane</button>`,
  `<button … data-canvas-verb="lane-keep" hidden>Keep lane</button>`, `<button … data-canvas-verb="lane-discard" hidden>Discard lane</button>`,
  `<button … data-canvas-verb="pack">Write handoff pack</button>`. In the rail (`:38-43`), before the minimap:
  `<section class="cv-flow" data-canvas-flow aria-label="Flow for this lane"><h2 class="cv-flow-title">Flow</h2><pre class="cv-flow-text" data-canvas-flow-text></pre><ul class="cv-flow-missing" data-canvas-flow-missing></ul></section>`.
  CSS in `portal/public/portal.css` beside the existing `.cv-*` rules: token-only (`var(--…)`), `.cv-flow-text { white-space: pre-wrap; overflow-wrap: anywhere; }`, and a `.cv-omitted` frame flag style.
- **GOTCHA**: `hidden` loses to any author `display` rule (memory: hidden-defeated-by-author-display). This page already
  carries the page-wide `[hidden] { display: none !important; }` (`portal/public/portal.css:61`), so no new rule is
  needed. The driver's L1 asserts the computed `display` all the same.
- **GOTCHA**: 44×44 targets (journey step 15 pattern) for every new control.
- **VALIDATE**: covered by Task 5.4's journey.
- **SATISFIES**: AC #2.
- **REGENERATES**: none (the portal is not in the VR set — `.claude/references/gates.md:135`).

### Task 5.3 — UPDATE `portal/public/canvas.mjs`: lanes, the draft, the flow panel, the pack button

- **IMPLEMENT**:
  - Imports (`:48`): add `laneDoc, laneKeys, stateDiagram`.
  - State: `let lane = null;` (the active lane key; `null` = A) and `let laneDraft = null;` (`{ key, overrides }` while a
    new lane is being drafted). Header: add call 7 — "A LANE IS DRAFTED, THEN KEPT AS ONE OP (#314, owner 2026-09-29).
    Edits in a draft change nothing on disk; Keep lane writes one variant.add with the whole override map; a kept lane
    is read-only until a variant edit verb exists. Switching lanes is view state and saves nothing."
  - `viewDoc()` → `laneDraft ? applyOp(doc, { op: "variant.add", params: { key: laneDraft.key, overrides: laneDraft.overrides } }) : doc`
    — the draft previewed through the REAL applier, so a bad draft is refused at gesture time, never at Keep.
  - `frameParts(f)` (`:168`): `frameTree(viewDoc(), f.id, lane)`; an `omitted` flag renders `el("p", { class: "cv-flag cv-omitted", text: \`Not in lane ${lane}\` })` instead of the screen.
  - `missingOf(f)` (`:189`): `missingStates(viewDoc(), lane)`. In `frameParts`, when `lane !== null` render each missing
    key as `el("span", { class: "cv-chip", text: \`${key}: missing in lane ${lane}\` })` — NOT a `data-cv-ask-state`
    button (a compose state proposal is an A-lane `state.add`).
  - `frameSig` (`:190`): add `lane` to the canon object so a lane switch repaints.
  - `reconcile` (`:420`): `canvas.setArrows(laneDoc(viewDoc(), lane).doc.arrows)`; then `renderFlow()`.
  - `renderFlow()`: `[data-canvas-flow-text].textContent = stateDiagram(viewDoc(), lane)`; the missing list from
    `missingStates(viewDoc(), lane)` as `<li>` textContent; `renderLaneSelect()` — options `A (base)` (value `""`) +
    every `laneKeys(doc)` key + the draft (`b (draft)`), selected = current.
  - Lane select `change` → `lane = value || null`; if a draft exists and the user leaves it, keep the draft (switching
    back returns to it). `reconcile()`. No bus event, no save.
  - New lane → a native `prompt`-free inline input: reuse the inspector popover pattern is overkill — use a small
    `<input data-canvas-lane-key>` shown beside the button with a Create button; the key must pass `/^[a-z0-9][a-z0-9-]{0,23}$/`,
    not be `a`, not exist — refuse by `canvas.say("Refused: …")` using `applyOp`'s own message (preview
    `variant.add` with `{}` overrides and catch). On success `laneDraft = { key, overrides: {} }`, `lane = key`, show
    Keep/Discard, `reconcile()`.
  - Inspector (`openInspector`, `:714`): when `laneDraft && lane === laneDraft.key`, add a fieldset `In lane ${key}`:
    a part `<select>` listing the frame's resolved tree parts that have a string `label`/`content`/`hint`/`placeholder`
    prop (value `partId`), a prop `<select>` filled from that part's string props, a value `<input>` prefilled with the
    current value, a "Set in lane" button, and a "Leave out of lane" button. Set → `laneDraft.overrides[fid] = { ...(o), set: { ...o.set, [part]: { ...o.set?.[part], [prop]: value } } }` (removing `omit`); Leave out → `laneDraft.overrides[fid] = { omit: true }`. Each: validate via `viewDoc()` in a try (on throw, revert and `canvas.say("Refused: …")`), then `reconcile()` and `canvas.say` what changed. For a KEPT lane (not the draft) show one line: `Lane ${lane} is kept — its overrides are read-only (#314).`
  - Keep lane → `bus.emit({ type: "ui.variant-add", source, params: { key, overrides } })`. The consumer in
    `registerConsumers` must clear `laneDraft` BEFORE `applyOwnerOp`, and restore it if the op is refused. Pre-flight
    caught this: `applyOwnerOp` reconciles, and `reconcile()` previews the draft over `doc`, so a draft still set when
    `doc` gains lane b throws `variant "b" already exists`. The patch carries the fixed order. Discard → `laneDraft = null; lane = null; reconcile();` (nothing was written).
  - `describeOp` (`:122-134`): `case "variant.add": return \`kept lane ${p.key}\`;` (undo announces it).
  - Undo of a kept lane (adapter `:442-457`) restores `doc`; if `lane` names a key no longer in `laneKeys(doc)` and is
    not the draft, set `lane = null` before `reconcile()`.
  - Write handoff pack → `await flushSettled()` (`:521`) first (the pack must read what the page has saved), then `POST
    /api/canvas/pack` `{ provenance, slug }`; on 200 `setSave(\`Handoff pack written — ${files.length} files in build/handoff/\`)`; on error `setSave(\`Pack not written — ${error}\`)`.
  - `getCanvasPage` (`:105`): add `lane, laneDraft` for the journey.
  - `renderLabel` (`:861-863`): the fictional sentence becomes `Saves into this repo at discovery/${slug}/build/ — the
    handoff pack updates on save; after a compose turn or an import, press Write handoff pack before you commit. Or
    git checkout the folder to discard.`
  - `flush` (`:500-506`): if the body carries `packError`, `setSave(\`Saved — pack not written: ${body.packError}\`)`.
- **PATTERN**: `registerConsumers` `:804-834`; `openInspector`'s fieldsets `:723-757`; `flushSettled` `:521-529`.
- **GOTCHA**: `viewDoc()` runs the applier on every reconcile — fine at this size, but compute it once per
  `reconcile()` and pass it down rather than calling it per frame.
- **GOTCHA**: every package string reaches the DOM via `textContent` / `el(..., { text })` (call 4) — the lane key and
  the part values included.
- **GOTCHA**: do not let a lane switch or a draft edit call `bus.emit` — the bus wildcard is the only save trigger
  (`:910`, call 2); a draft edit must write nothing (the journey asserts the ledger length).
- **VALIDATE**: `node --check portal/public/canvas.mjs` (expected: no output); behaviour in Task 5.4.
- **SATISFIES**: AC #2.
- **REGENERATES**: none (`portal/` is in no loc group and no VR set).

### Task 5.4 — ADD canvas-journey pass L "lanes" (`tooling/canvas-journey.mjs`)

- **IMPLEMENT**: in `seed()` (`:250-278`) add an `fp-lanes` copy (run.json, answers.jsonl, transcript.jsonl, build/ —
  the `fp-measure` block's shape). A `lanesPass(base, page, t, step)` called from `leg` after the main steps (before
  15's target sweep so its controls are counted), steps:
  - L1 open `real/fp-lanes`: the lane select holds exactly `A (base)`; Keep/Discard hidden (assert computed
    `display === "none"`, not just the attribute).
  - L2 New lane `b` → select shows `b (draft)`, Keep/Discard visible; ledger length unchanged (`ledger("fp-lanes").length === 6`).
    Key `a` refused (the page says `Refused:` and names lane A); nothing written.
  - L3 f1 Details → In lane b → part `continue`, prop `label`, value `Check the name` → Set in lane → f1's text
    contains `Check the name`; ledger still 6.
  - L4 f2 Details → Leave out of lane b → f2 shows `Not in lane b`; f1's chips include `error: missing in lane b` as a
    non-button (`[data-cv-ask-state="f1:error"]` count 0); the flow panel text has no `f2` line.
  - L5 Keep lane → `waitLines("fp-lanes", 7)`; line 7 deep-equals `{op:"variant.add", params:{key:"b", overrides:{f1:{set:{continue:{label:"Check the name"}}}, f2:{omit:true}}}, status:"applied", source:"owner"}` on those keys.
    The save regenerated the pack: the scratch package's `build/handoff/flow.md` now contains `## Lane b` (Q4's default).
  - L6 switch to `A (base)` → f1 reads `Continue`; f1's missing asks are buttons for `empty, partial, loading` and no
    `error`; the flow panel contains `f1 --> f2`. Switch to `b` → panel lacks `f1 --> f2`; the missing list names
    `error`. Ledger still 7 (a switch writes nothing).
  - L7 Write handoff pack → `build/handoff/flow.md` exists under the scratch package, contains `## Lane b`, and equals
    `renderPack(readBuildPackage(<scratch pkg>))["flow.md"]` (import the generator in the driver); a POST from
    `http://evil.example` is refused (the origin guard) and writes nothing.
  - L8 undo (Cmd/Ctrl+Z) → an `undone` line restating the `variant.add`; the select no longer lists `b`.
  - L9 `verifyBuild(loadBuild(buildDir("fp-lanes")))` → `[]`; the page doc equals `foldLedger(ledger("fp-lanes")).doc`.
  - Header: add pass L to the pass list at the top; the step-15 target sweep includes the new toolbar controls and the
    inspector's lane buttons.
- **PATTERN**: port `variant-lanes-handoff-pack-314.lanes-driver.txt` (proven: 17/17 × 3 engines) into the driver's
  `t`/`step` idiom, using `openDetails` (`:324`) and **`undo` (`:332`, which focuses `.stx-scroll` before
  `ControlOrMeta+z`)**. Pre-flight's first run pressed the key with focus elsewhere and L8 failed on all three engines
  for that reason alone. Steps 3-12a (`:394-566`) and the evil-origin fetch in 13 (`:588-594`) are the other patterns.
- **GOTCHA**: a stale `serve.mjs`/portal on a port can serve a sibling tree (memory: stale-serve-wrong-tree) — the
  driver already asserts `bootSha === HEAD`; commit (or stash-free run on a clean tree) before trusting a green leg.
- **GOTCHA**: `git status -- discovery/` must be unchanged after the leg (`gitBefore` `:352`) — the pack is written into
  the SCRATCH package only.
- **VALIDATE**: `(cd portal && npm ci) && (cd tooling/visual-regression && npm ci) && node tooling/canvas-journey.mjs all`
  — expected: every leg's last line reports 0 fails on chromium, firefox and webkit.
- **REDDENS**: comment out the `ui.variant-add` consumer → L5 fails (`waitLines` stays at 6); make lane switch call
  `scheduleSave()` → L6's "still 7" fails only if a pending line is written — so instead mutate `renderFlow` to ignore
  `lane` → L6's `b` panel still contains `f1 --> f2` and fails. Run one, see red, revert.
- **SATISFIES**: AC #2.
- **REGENERATES**: none.

### Task 6.1 — UPDATE docs

- **IMPLEMENT**:
  - `discovery/README.md`: layout block (`:631-641`) gains `handoff/  the handoff pack (#314) — GENERATED by
    agent-layer/gen-build-handoff.mjs: flow.md · drops.md · refusals.md · lineage.json · imports/<id>.md`; the
    "written by the canvas and by nothing else" sentence (`:624-625`) names the pack route and the CLI as the pack's
    writers; the ten-verbs paragraph (`:725-733`) adds `variant.add`'s override keys `set · hide · add · omit`, `omit`
    alone and `true`, key `a` refused; a new `### Lanes and the handoff pack (#314)` subsection after `canvas.json`
    (before "How the committed spine was produced") — lane A is the document, a lane is drafted then kept as one op, a
    kept lane is read-only, `omit` and its base rule, the layer order, the four files and what each flags, "an empty
    drops.md says no imports", "regenerate: node agent-layer/gen-build-handoff.mjs" (or the page's button), the
    two-lane fixture is SYNTHETIC; "What the gate reads" (`:828-841`) names group 49 and the drift leg.
  - `.claude/references/gates.md`: `:7` (CI legs) adds the `build-handoff` drift leg; `:11` → `49 pure groups`; the
    group 35 entry (`:59`) and group 36 entry (`:61`) each gain their #314 sentence; a new `**Group 49 — the build
    package's handoff pack** (#314, agent-layer/gen-build-handoff.mjs)` entry after group 48 with its CANNOT REACH
    clause; `canvas-journey.mjs` (`:135`) gains pass L.
  - `CLAUDE.md`: `48 PURE groups` → `49 PURE groups` (`:144` on main) and `build-checks' 48 groups` → `49` (the
    `On-demand context` bullet) — both pinned by drift-check.
  - `system/canvas-ops.mjs` header: nothing about the lock changes; the "pure reads" section comment names the lane
    reads.
- **GOTCHA**: a "cannot reach" clause lives in THREE copies — gates.md, the `group()` string and the module/fixture
  header (memory: gate-prose-has-three-copies). Grep all three for group 35, 36 and 49 before calling docs done.
- **VALIDATE**: `node tooling/drift-check.mjs` (the group-count leg reads all four pins) → ✓.
- **SATISFIES**: ticket scope bullet "`discovery/README.md`'s `build/` section documents the pack's new files".
- **REGENERATES**: none.

### Task 7.1 — CONFIRM loc-summary and the approach baselines (regenerated inside the patch)

- **IMPLEMENT**: nothing, unless a task changed a file under `system/` or `agent-layer/` beyond the patch. No later
  task should: build-checks, drift-check, the journey, the fixture README and the docs are counted by no loc group.
  The patch was measured with the counter `gen-loc-summary.mjs` actually uses (`git show :<f>`.split("\n").length,
  i.e. `wc -l` + 1 per file). Runtime 32,522 → **32,600** and generators → **3,400** (observed). The three approach
  baselines were rm'd and regenerated by `update:docker` from a clean committed tree under `/Users`: 33 passed, 1.2 min,
  exactly `approach-{neutral,saulera,verdant}.png` changed.
- **GOTCHA**: if you DID touch `system/` or `agent-layer/` after Task 0, stage everything and run
  `node agent-layer/gen-loc-summary.mjs` (memory: loc-summary-counts-tracked-only). If runtime `linesApprox` then leaves
  32600, rm the three approach PNGs and re-run `cd tooling/visual-regression && npm run update:docker` from a clean
  detached worktree under `/Users` (memory: vr-gate-reads-working-tree, vr-update-skips-subperceptual).
- **VALIDATE**: `git add -A && node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`.
  After the push, `gh pr checks` shows `visual` green. Compare the PR head SHA to local HEAD first (memory:
  pr-head-lag-stale-checks).
- **SATISFIES**: AC #3 (verify green).
- **REGENERATES**: none beyond the patch.

### Task 7.2 — Full validation

- `node tooling/build-checks.mjs` → `build ✓  all 49 groups pass`.
- `node tooling/drift-check.mjs` → the ✓ line including `build-handoff`.
- `node tooling/token-lint.mjs` → ✓ (portal.css is not linted as components, but run it: CI does).
- `node tooling/canvas-journey.mjs all` → 0 fails ×3 engines.
- Portal smoke (Task 5.1's command).
- `/piv-validate` (memory: piv-skills-python-tuned — maps to the CI `verify` job + a portal smoke; run it, never skip).

### Task 7.3 — Mermaid parse check (scratch, never committed)

- **IMPLEMENT**: in your scratchpad, `npm init -y && npm i mermaid@11.17.2 jsdom@29.1.1`, copy
  `variant-lanes-handoff-pack-314.mermaid-parse.txt` there as `parse.mjs`, and run
  `node parse.mjs <repo>/discovery/faster-payment/build/handoff/flow.md <repo>/tooling/fixtures/builds/two-lane/build/handoff/flow.md`.
- **VALIDATE**: expected (observed at planning) `control refused ✓` then 3 × `parsed`, exit 0. `mermaid.parse` is
  lenient: `a {b} ; c` and `x: y` labels both parse. So the control, a truncated `f1 -->` that MUST be refused, is what
  makes a pass mean something. Paste the output into the report.
- **WHY SCRATCH**: a committed dependency dir would put ~100 packages under the CI audit-delta gate for a check whose
  input is already byte-pinned by group 49.2. The committed text was proven to parse, and 49.2 keeps it that text.

### Task 7.4 — Open the follow-up ticket

- `gh issue create` (after showing the owner the text) titled "Lanes you can edit, and the #314 comment's three
  proposals" carrying: `variant.set` (op lock), data on each arrow (a `connect` param, op lock), the as-is record as a
  distinct pack file, and as-is-to-flow traceability (a pure read like `auditTraceability`, needs a fixture with both
  a build and an as-is). Link it from the PR body. `Part of epic #295`.

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). The gates are build-checks (pure, CI), drift-check (CI), and canvas-journey
(operator-run, three engines).

### Unit Tests

build-checks 35.15 (lane reads + refusals), 36.12 (`laneFlaws`, `loadDecisions` evidence), group 49 (pack renderers vs
committed bytes; lineage, drops, refusals over in-memory packages).

### Integration Tests

The drift leg (committed packs = regeneration, both directions); canvas-journey pass L (page → ledger → pack on disk).

### Edge Cases

- A lane omitting a BASE: its states and their arrows vanish from the lane; the check skips that base.
- A lane override on a STATE frame (the fourth layer): applied last (35.15).
- A lane naming an unknown key: `laneDoc` flags `unknown-lane`, `missingStates` answers `[]`.
- A lane relabelling a part the state also relabels: the state wins (fixture f3).
- Key `"a"`, `omit: 1`, `omit` with `set`, an unknown override key: refused by name.
- No imports → drops.md's "No imports" line; no refusals → three `- none`.
- No package transcript → every ref `no-transcript`; a ref absent from the transcript → `unresolved-decision`, row kept.
- Mermaid-unsafe characters in a trigger (`:` `;` `#`) → stripped from the diagram, kept verbatim in the prose line.
- Undo of a kept lane while it is the active lane → the page returns to lane A.

### Proving the checks

Every check above carries its REDDENS mutation. Positive controls: 35.15's accepted overrides; 36.12's hand-built
dangling doc; 49.4's resolving decision 3; 49.5's real import record; the drift leg's missing-pack red at Task 2.1
(observed before Task 3.2 writes the packs).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

- `node --check system/canvas-ops.mjs agent-layer/gen-build-handoff.mjs portal/public/canvas.mjs portal/server.mjs tooling/build-checks.mjs tooling/drift-check.mjs tooling/canvas-journey.mjs` (one file per call if your node rejects several).
- `node tooling/token-lint.mjs`

### Level 2: Unit Tests

- `node tooling/build-checks.mjs` → `build ✓  all 49 groups pass` (observed baseline on a0c03f0 fresh worktree: 47 ✓,
  group 41 ✗ only for a missing `npm ci` in `tooling/icons` — install first).

### Level 3: Integration Tests

- `node tooling/drift-check.mjs` → ✓ including `build-handoff`.
- `node agent-layer/gen-build-handoff.mjs --check` → `✓  2 packages, 8 files`.
- `node tooling/canvas-journey.mjs all` → 0 fails, three engines.

### Level 4: Manual Validation

- Portal on a free port → open `canvas.html?provenance=fictional&slug=faster-payment` → New lane `b`, relabel
  Continue, leave out f2, watch the flow panel and f1's chips change, switch lanes, Discard (nothing written: `git
  status -- discovery/` clean). Do NOT Keep on the committed spine unless you mean to commit a lane.
- Task 7.3's Mermaid paste.

### Level 5: Additional Validation (Optional)

- `/piv-validate`.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Approach VR baseline regen | done inside the proof patch (Docker, 1.2 min) | only if Task 7.1's GOTCHA fires | none |
| Mermaid parse check (Task 7.3) | scratch `npm i`, no tokens | no, since 49.2 byte-pins the proven text | note in the report's Not run if skipped |
| Follow-up ticket text (Task 7.4) | owner's approval of the text | no | open it before the PR |

No agent run, no API spend: every op in this ticket is an owner op or a typed synthetic fixture.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1: build-checks over the committed spine + the two-lane fixture — `flow.md` per lane equals its committed
  text (49.2); a missing `error` state on lane b only is reported for b only (35.15, 49.3); `lineage.json` chains by id
  and a broken chain is flagged, never dropped (49.4); an empty `drops.md` says "No imports", never omitted (49.5).
- [ ] AC #2: canvas-journey pass L — add lane b → override one text in b → the diagram and the check switch with the
  lane → the pack regenerates (L2-L7), three engines.
- [ ] AC #3: `verify`'s drift check covers the new pack files — a stale `flow.md` is red (Task 4.4's REDDENS, observed).
- [ ] Scope: `missingStates(doc, lane)` is the one function the page, group 49 and the generator call; the `ops.jsonl`
  ↔ `canvas.json` gate extends to variants (`laneFlaws`); `discovery/README.md` documents the pack.
- [ ] No new verb; `OPS`/`PARAMS` unchanged (35.1 green unmodified).
- [ ] `loc-summary.json` regenerated; approach baselines regenerated if the runtime number moved.
- [ ] PR body carries `Closes #314`; plan, report and review in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] Every REDDENS mutation run and seen red, then reverted
- [ ] build-checks 49/49, drift-check ✓, canvas-journey 0 fails ×3
- [ ] Portal smoke green, own PID killed
- [ ] Follow-up ticket opened and linked
- [ ] Branch verified before each commit; staged by explicit path

---

## RISK REGISTER — each closed with evidence

| # | Risk | How it is closed | Evidence (observed 2026-09-29) |
|---|---|---|---|
| R1 | A stale pack after compose or import turns CI red, and owner edits break group 36's promise | `withPack` on all six write routes, plus 49.9's pin | Driver L5: the save regenerated the pack. Pin: 8 routes found, 0 missing; mutation names `import/mapping` |
| R2 | The lane layer order is wrong | Order fixed and argued (D4), asserted by 35.15 and by the fixture's f3 | Lane b: f1 reads "Check the name", f3 keeps "Checking the name…", lane A's f1 reads "Continue" |
| R3 | A concurrent op-verb change to `canvas-ops.mjs` | Task 0's `--3way` path; no concurrent change exists today | `gh pr list`: no open PR touches the file; `git ls-remote`: no #313/#315 branch |
| R4 | The loc and baseline cascade | Done inside the patch and measured with the generator's own counter | Runtime → 32,600; `update:docker` 33 passed; exactly 3 PNGs changed |
| R5 | Branching from the stale branch | Task 0 branches from `origin/main` and asserts `all 48 groups pass` before any edit | The patch applies cleanly to a0c03f0 |
| R6 | The page's draft/keep/undo flow | Implemented and driven in three engines | 17/17 × 3. Caught and fixed there: the Keep ordering bug and the undo focus |
| R7 | The Mermaid text is invalid | Parsed by mermaid 11.17.2 with a refusing control, then byte-pinned by 49.2 | 3 × parsed; `f1 -->` refused |

## OPEN QUESTIONS / ASSUMPTIONS

Settled by the owner on 2026-09-29 (this planning session):

- **Q1 → `omit: true`** is how a lane leaves a frame out; `variant.add` validates override keys exactly.
- **Q2 → draft, then one op**; a kept lane is read-only until a follow-up adds an edit verb.
- **Q3 → the #314 comment's three proposals are deferred** to a follow-up ticket.

- **Q4 → every write route regenerates the pack** (resolved while addressing R1). `withPack` sits on all six write
  routes, and 49.9 pins it. A stale pack can only come from a hand edit, which the drift leg catches for committed
  packages.

Assumptions this plan makes (flag if wrong):

- **A1** — the generator is a sibling, `agent-layer/gen-build-handoff.mjs`, not a branch inside `gen-handoff.mjs`. The
  architecture says "`gen-handoff` reads the build package"; the plan reads that as "the handoff generator family",
  because `gen-handoff.mjs` takes no argument, runs Style Dictionary as a child process and writes one fixed Verdant
  dir. Nothing about the pack's content changes if this is wrong — only the file name.
- **A2** — the pack lives at `<pkg>/build/handoff/`, not under the repo's `handoff/` (NOTES D1).
- **A3** — lane A's key is `null` in code and `A (base)` in every label; `"a"` is refused as a lane key.
- **A4** — the page's "override one text" edits a part's string `label`/`content`/`hint`/`placeholder` only — no free
  prop names, no non-string values.

## NOTES (open canvas)

### D1 — where the pack goes: `<pkg>/build/handoff/`

A real package lives in the jobs folder and is never committed (CLAUDE.md, discovery run bullet: "real →
`<JOBS_DIR>/_discovery/<slug>/`"). A pack written under the repo's `handoff/` would carry a real run's decisions and
answers into the repo. Beside the package, the pack travels with the package's provenance. Also: `gen-pack-index.mjs`
throws on any file under `handoff/verdant/` without a ROUTES line, and `gen-pack-bundle.mjs` inlines every file there —
a build pack inside the Verdant dir would churn `pack.bundle.json` and `llms.txt` for an unrelated reason. Cost: the
existing `handoff/` porcelain drift leg cannot see it, hence Task 4.4.

### D2 — why the lane reads live in `canvas-ops.mjs`

The ticket and the architecture both say one code path, called live on the canvas, in build-checks and by the
generator. The page can import only `/system/*` modules (it is served from `portal/public/` with `/system/` mapped), so
the reads must be in `system/`. That costs loc (runtime group) and triggers the approach baseline cascade — accepted,
as #302 accepted it for the same file (`canvas-ops.mjs:22-29`).

### D3 — the pack follows every write

Six routes write into a build package: save, compose, import, drop, mapping and measure. The first draft of this plan
regenerated the pack on none of them and added a button. That would have turned CI red after any owner edit on the
in-repo spine, and falsified group 36's promise that owner edits stay green. The second draft regenerated on save only,
which left compose refusals and imports stale. The plan now puts one helper, `withPack`, on every write route, plus a
source pin (49.9) so a new route cannot skip it. That adds one import to `server.mjs` and one call per route. The
button remains as an explicit "write it now".

### D4 — the layer order

`base.sets → lane[base] → state.overrides → state.sets → lane[state]`. Alternatives rejected: lane last for everything
(lane B's relabel of Continue would overwrite the error state's "Send anyway" — the state's own design lost); lane
first (a lane could not change what `screen.set` wrote on the base). The chosen order is "A lane is the A document with
differences, resolved over A first" (architecture `:135-137`), with a state still being its base except where it says.

### D5 — why refusals.md has three sections

The ticket says "the `refused` lines from `ops.jsonl`, the agent's and the import's". Pre-flight found that an import's
refusal never reaches `ops.jsonl` (`portal/lib/import-run.mjs:433`: "no record for a read that did not happen"); the
only import refusals on disk are `denied` lines in `imports/<id>.transcript.jsonl`. And four compose refusal kinds are
transcript-only (`discovery/README.md:761-763`). Listing only ledger lines would silently omit both; the file keeps them
in named sections instead.

### Rejected

- A `variantKey` on frames (the old `missingStates` filter's assumption) — needs a PARAMS change; the owner chose `omit`.
- Rendering Mermaid on the page — a runtime dependency on a portal page for a text the owner can paste; the `<pre>` is
  the diagram.
- Committing the two-lane package under `discovery/` — it would appear in the portal's run list and in group 36 as if
  it were a design. `tooling/fixtures/builds/` keeps it a fixture.
- Adding lanes to the committed spine — the spine is the package's own argument (README `:800-806`); a lane typed by an
  agent and labelled `owner` would be the agent writing the owner's design (memory: honesty-contract-mirror-direction).

### Pre-flight (run 2026-09-29 on a detached worktree of origin/main a0c03f0)

1. **Driven:** `node tooling/build-checks.mjs` → 47 ✓, group 41 ✗ `tooling/icons/node_modules/@phosphor-icons/core/assets/regular
   is missing` (fresh worktree, no `npm ci`; memory: local-agent-visual-gate-notes). Recorded as an environment trap in
   Levels 2 and 4.3.
2. **Driven:** a scratch fold of the spine: frames `f1` (add-payee) and `f2` (error of f1); `missingStates` →
   `[{frameId:"f1",screenId:"add-payee",missing:["empty","partial","loading"]}]`; f1's tree carries `continue` with
   `props.label "Continue"` and `account` with `hint` — so Task 1.4's expected text uses "tapping Continue".
3. **Driven:** `applyOp(spine, variant.add {key:"b", overrides:{f1:{set:…}, f2:{omit:true}}})` → ACCEPTED today, stored
   verbatim, and `variant.add {key:"a"}` → ACCEPTED today. Both became Task 1.1's refusals/rules; the plan originally
   assumed `omit` would be refused as unknown.
4. **Landed claims vs origin/main:** `grep` for `flow.md|drops.md|refusals.md|lineage.json|stateDiagram` in code →
   none (only docs/plans). `variantKey` → only `canvas-ops.mjs:509,510,515`. No lane UI in `portal/`. `gen-handoff.mjs`
   reads no build package. Group count 48 (not CLAUDE.md-on-this-branch's 41) → new group is 49, four pins.
5. **Citations resolved:** every `file:line` above was opened this session on a0c03f0. Two corrections made during
   pre-flight: `loadDecisions` returns no evidence refs (→ Task 4.2 extends it); an import refusal is not an ops.jsonl
   line (→ D5).
6. **Traps carried:** loc-summary cascade + tracked-only counting (7.1); VR reads the working tree (7.1); three copies of
   gate prose (6.1); portal smoke kills its own PID (5.1); hidden vs author display (5.2); stale serve / bootSha (5.4);
   drift-check syntax-checks parked `.mjs` (3.1); PR head lag (7.1); op-verb lock (1.1).
7. **Runtime line count observed with `wc`:** 32,442 (runtime) and 3,058 (generators). The committed loc-summary says
   32,500 and 3,100, so `wc` undercounts the generator's measure. Task 7.1 therefore reads the regenerated number and
   does not predict it.
8. **Driven:** Task 3.1's fixture recipe into the scratchpad → `verifyBuild` `[]`, lane-A missing `["empty","partial"]`
   (Task 3.2's and 35.15's expected values). `origin.mjs:23` allows `http://localhost:<port>` and
   `http://127.0.0.1:<port>` exactly — Task 5.1's smoke sends the first.
9. **Pins checked for the new edges:** `tooling/build-checks.mjs` 35.9 (`:11569-11574`) pins canvas-ops.mjs's IMPORTS to
   `./device-presets.mjs`, not its exports, so the new lane exports are free. Case 21 (`:7605-7616`) pins `server.mjs`
   against importing or calling `writePrd`, not against other imports, so `writeBuildHandoff` is allowed. Its message
   says "no HTTP request may write into a run package", but the canvas save route already writes `build/`, and the
   pack stays inside `build/`. 47.1 (`:15814-15823`) pins canvas-session and canvas-store imports, and neither changes.

## AMENDMENTS

- 2026-09-29 — Risks R1–R7 closed with a throwaway-worktree implementation. What changed: the proof patch plus Task 0.
  Q4 resolved as "every write route" (`withPack`, 49.9). Task 5.3 gained the Keep ordering fix and Task 5.4 the undo
  focus, both found by driving the page. Task 7.1 became a confirmation: loc 32,600, three baselines, already done.
  Task 7.3 became a scripted parse with a control. The `hidden` GOTCHA was dropped (`portal.css:61` already covers it).
  Confidence moved from 8.5 to 9.5. The code risks are closed. The half point left is the gate code the patch does
  not contain (group 49, 35.15, 36.12, the drift leg, the journey port), which the implementer still writes. Every one
  of those has a proven prototype or observed expected values here.
- 2026-09-29 (implementation) — one gap the proof could not see. The lane driver ran standalone, never inside the
  full `canvas-journey.mjs`, so it could not catch a side effect on another pass. On the patched tree, firefox's
  I12 (`the Measure fidelity button measures at least 44×44`) read `1374×43.999969482421875`. It reproduced, and
  base a0c03f0 passes it (firefox 149/0). The cause is a float artefact, observed with a diagnostic: the button's
  computed height, its client-rect height and its `offsetHeight` are all exactly 44, but it now sits at a fractional
  y (471.1), so Playwright's `boundingBox` reads 43.99997. Fix: I12 rounds the box to 0.01 px before comparing.
  The other 44×44 checks are unchanged. No plan task was wrong; this was a gap in the plan's coverage.
