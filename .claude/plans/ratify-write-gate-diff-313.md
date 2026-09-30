# Feature: ratify — a proposal becomes a vocabulary member, every gate runs, the diff comes back, git is the owner's (#313)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Base:** `origin/main` at `3b5a6c7` (#314 merged). The primary tree was on `fix/importer-reads-icon-name-449`, 11 commits
behind — branch from `origin/main`, never from that branch. Every `file:line` below was read at `3b5a6c7`.

## Feature Description

An import (#311) leaves a **proposal** in the build package: `build/proposals/<name>/` with an importer-drafted
`spec.md`, `block.css` and `template.txt`, plus one `component.propose` op. Nothing turns that proposal into a real
component today. Ratify is that step: in the portal's import view the owner fills what a drawing cannot carry (props,
states, behaviour, the accessibility model, the render structure, licence), previews the exact write plan, confirms
it, and the portal writes the spec, the CSS block, the admitted template, the palette entry and the wrapper-histogram
pin; runs the whole regenerator chain and `build-checks`; appends `proposal.ratify`; stamps `elapsed.ratify` on the
import record; and returns the gate output and the git diff. The owner commits. Nothing is committed on their behalf.

## User Story

As the owner operating the portal
I want to ratify an imported proposal in one confirmed click
So that a part a designer drew joins the vocabulary through the same chain as a hand-written one, with every gate run
and the diff in front of me before anything reaches git

## Problem Statement

Admission today is the hand-written three-file chain (spec → CSS → renderer template) plus six regenerations and two
pinned copies, ~20 files per component (observed: `git show --stat d04faac` — list #303, 22 files). The import path
stops at a proposal, so the PRD's "one admission path, two entrances" (G6, G17) has no path.

Two facts found in planning change the shape the architecture assumed:

1. **The importer drafts no renderer code.** `template.txt` is JSON `{note, compositions}` (`portal/lib/import-run.mjs:310`),
   and spike C's composition is `[null]` for all three committed fixtures (observed: `runPipeline` over
   `import/fixtures/spike-c-instance.blueprint.txt`, `spike-c-master.blueprint.txt` and `figma/spike-list-row.export.json`
   — every build dropped with `unfillable-required-prop`). So what lands in `templates.admitted.mjs` has to be defined
   here. **Owner's call (2026-09-30): declarative data** — see D1.
2. **The regenerator chain is eight runs, not four.** Pre-flight admitted a probe component by hand in a scratch
   worktree: after the architecture's four, `build-checks` was red on group 42 (`import-record` 42.6, the committed
   records drift) and would have been on group 40 (`regen-expected`) and on `llms.txt` (#419). See NOTES § Pre-flight.

## Solution Statement

- **`system/templates.admitted.mjs`** (new, committed EMPTY): a pure, DOM-free module holding the admitted registry as
  JSON between two marker lines, plus the one validator `checkAdmitted(name, def, spec)`. A definition is data —
  `{tag, class, slots[], children, provenance}` — never code.
- **`system/agentic-renderer.mjs`** gains ONE hand-written interpreter `admittedTemplate(def)` and a spread that adds
  every admitted name the hand-written `TEMPLATES` map does not already hold. After this PR no admission edits the
  renderer (AC #3).
- **`system/canvas-ops.mjs`** gains verb twelve, `proposal.ratify {proposalId, component}`: resolves the proposal,
  refuses Mode 2 (G7) and a second ratify, moves `status` to `"ratified"`.
- **`portal/lib/ratify.mjs`** (new): a PURE planner (`planRatify` → the exact bytes of every write + a hash) and one
  impure runner (`runRatify`) under `withRunLock`: refuse on a dirty tree → recompute the plan and compare the hash →
  fold the ledger with the op applied in memory → write → spawn the chain + `build-checks` → on green append the op
  and stamp the record → return gates + diff; on red leave the files, append nothing, return the revert command.
- **Two routes**, preview and confirm, both behind the unchanged origin guard. A single request can never write:
  confirm needs the hash only preview computes, over bytes that include `HEAD`.
- **The ratify form** inside the import view (`portal/public/canvas-import.mjs`), prefilled from the proposal's drafts,
  with the checklist (catalog baselines, commit, CI) in the UI's own copy.
- **`tooling/ratify-journey.mjs`** (new, operator-run): builds a scratch git tree from the working tree, boots THAT
  tree's portal, drops spike C's fixture, previews, refuses a stale hash, confirms, asserts the six writes, green
  gates and a `git status` equal to the returned set, refuses a second confirm on the now-dirty tree, then renders the
  admitted part on `/components` and on the canvas ×3 engines — and throws the scratch tree away (D3).

## Out of Scope / Non-Goals

- **Not committing the fixture admission.** The journey admits in a scratch tree and deletes it (owner's call D3).
  `/components` baselines therefore do NOT regenerate in this PR.
- **Not "Promote" from a saved group** (G17's second entrance). `group.define`/`group.place` are #315's; ratify's input
  is an import proposal only. The spec's provenance line supports "composed in run X" as a string so #315 can call
  the same planner, but no route or UI reaches it here.
- **Not an agent.** No model drafts props, CSS or structure at ratify. The owner fills them; the drafts prefill.
- **Not wrappers.** An admitted part ships wrapper-less (no `system/wc/vd-*.mjs`), which is exactly why it moves the
  histogram's `without` half.
- **Not a data contract.** An admitted spec is `contract: null` (presentational). A data-bound admission is later.
- **Not executable templates.** The registry never holds a function; a shape the interpreter cannot express is
  admitted by hand through the existing chain (the form says so).
- **Not the VR regen of `/components` per admission** — named in the UI checklist as the owner's step after commit,
  per architecture § "The catalog VR churn per admission is accepted as the cost".
- **Not changing** `import-run.mjs`'s drafting, `recognise.mjs`, the snap rules, or `gen-loc-summary`'s default
  (index-read) behaviour.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: `system/` (registry, renderer, canvas-ops, palette, components.css), `portal/lib/`
(ratify, import-run, canvas-store), `portal/server.mjs`, `portal/public/canvas-import.mjs` + `canvas.mjs`,
`agent-layer/gen-loc-summary.mjs`, `tooling/build-checks.mjs`, `tooling/ratify-journey.mjs`
**Dependencies**: none new. `node:child_process`, `node:crypto`, `node:fs` only. The journey uses the Playwright
already resolved by the other journeys.

## Related Work

**Implements**: #313 (`Closes #313`) · **Epic**: #295, `docs/epics/canvas-design-import.architecture.md`
§ Boundaries "Ratify writes, gates, and stops at the diff (G6)" (:199-207), § "The origin guard applies unchanged"
(:221-223), § "The catalog VR churn per admission" (:268-270), § Placement (:271-277).

**Back-references**:

- `.claude/plans/import-run-recorded-import-311.md` + `import-run-live-read-311-pr-b.md` — the proposal format,
  `writeImport`, the `underLock` busy refusal, the canvas-journey scratch-JOBS_DIR pattern.
- `.claude/plans/canvas-compose-loop-312.md` — `withRunLock` shared across import/compose; the 409 `base` pattern.
- `.claude/plans/canvas-variant-lanes-*314*` (merged as #491) — `withPack` on every write route, build-checks 49.9.
- #475 comment on #313 — `proposal.ratify` must refuse Mode 2; add a 35.14-style case in the same PR (Task 4.1).

**Forward-references**: #315 (Promote → the same `planRatify` with a "composed in run X" provenance) · #319 (the
inbox lists proposals pending ratify — reads `status`).

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/canvas-ops.mjs` :1-47 (conventions), :51-68 (`OPS` + the op-verb-lock comment), :73-85 (`PARAMS`), :90-95
  (`OPTIONAL`), :105 (`PROPOSAL_NAME_RE`), :116 (`emptyDoc`), :136-160 (`checkOp`), :187-199 (`refuseFrozen`), :237
  (unresolved-id message shape), :463-478 (`component.propose` — the case to mirror), :481 (default case), :701-707
  (`exhibitsOf`).
- `system/agentic-renderer.mjs` :21 and :264 (comments carrying "twenty-six" — reword), :152-175 (`withPart`,
  `renderChild`, `el` — the interpreter uses `el` and `renderChild`), :270 (`const TEMPLATES = {`), :383 (`list-row`),
  :487 (`list` — a template that renders `kids` through `renderChild`), :698-700 (`hasTemplate`), :716-721 (the build
  lookup + the drift throw).
- `system/palette.mjs` :30-41 — `CATALOG_COMPONENTS`, the static copy build-checks 21.2 pins.
- `tooling/build-checks.mjs` :95 (header prose "3/23"), :214 (renderer import), :335 (`group()`), :717 (group 3: every
  vocabulary entry `hasTemplate`), :5081-5085 (21.2 palette pin), :5133-5160 (21.4 histogram tripwire + its narrative),
  :11225-11242 (group 35 header + imports), :11246-11258 (35.1, `COPS.length === 11`), :11267-11289 (35.2
  `VALID_FOR`), :11650-11658 (35.12 end — the `:11654` "#313 must move this assertion" line), :11703-11733 (35.14 —
  the pattern for the Mode 2 case), :16201-16230 (47.13 "THE lock, both ways (ratify's leg is #313's)"), :16672-16686
  (49.9 `EXPECTED_POSTS`).
- `system/catalog.mjs` :66-72 — `tabsFor`'s comment carries "3 of 26 today; the 23 absences … 3/23" (reword, Task 1.6).
- `portal/lib/builder.mjs` :244-251 — `withRunLock(fn, what)`, `isRunInFlight()`.
- `portal/lib/import-run.mjs` :1-82 (header invariants; the imports), :160-171 (`loadInputs`), :205-229 (`runPipeline`,
  `recordFor` — `elapsed: {recognition, ratify: null}` at :226), :261 (`DRAFTED`), :263-311 (`rootDeclarations`,
  `draftProposal`), :313-330 (`sortKeys`, `jsonText`, `underRoot`), :329 (`writeImport`), :362-410 (`editMapping`),
  :414-470 (`runImport` — lock, `saveRun` with positions), :487-520 (`isProposalName`, `importView`), :600-625
  (`underLock` — the busy refusal shape).
- `portal/lib/import-measure.mjs` :100-108 (`withMeasurement` — the re-validate-through-`buildRecord` pattern for a
  post-hoc record change), :111-135 (`spawnRender` — the spawn-a-repo-script pattern to mirror).
- `portal/lib/canvas-store.mjs` :47 (`saveBuild`), :72 (`loadBuild`), :110-138 (`foldLedger`, the LIFO undo rule),
  :216 (`positionsOf`), :229 (`verifyBuild`), :385 (`saveConflict`), :460 (`saveRun`).
- `import/report.mjs` :64 (`REQUIRED_KEYS`), :133 (`buildRecord`), :174 (`checkRecord`), :196 (mode check), :257
  (`projectRecord`), :355 (elapsed rendering).
- `portal/server.mjs` :88-89 (origin guard), :444-452 (`withPack`), :457-600 (the canvas routes — mirror
  `/api/canvas/import/mapping` at :577).
- `portal/public/canvas-import.mjs` :79 (`showRefusal`), :321-370 (`renderView` — where the ratify block goes), :379
  (`?import=` boot). `portal/public/canvas.mjs` :134-146 (`describeOp`).
- `portal/lib/env.mjs` — `REPO_DIR` is derived from the file location, so a portal booted from a scratch tree writes
  into that tree. No env seam is needed for the journey.
- `agent-layer/gen-loc-summary.mjs` :28-50 — the index read (`git show :<path>`) and its reason (#56).
- `tooling/drift-check.mjs` :131-141 — the pack order `genHandoff → genVocabulary → genPackBundle → genPackIndex`
  ("MEASURES all three — must run last", #419).
- `tooling/canvas-journey.mjs` :1-90 (header, the scratch/side-portal discipline), :167-214 (`freePort`, the portal
  spawn, `/api/health` identity check), :1728-1745 (the summary line; its "nothing under system/ … changed" claim).
- `system/specs/text.md` — a complete library-primitive spec (the head keys + the four required prose sections).
- `.claude/references/kb-format.md` :14-33 — ComponentSpec head keys; `example` validated by `gen-vocabulary`
  (`agent-layer/gen-vocabulary.mjs:25-45`); prose sections `## Usage · ## States · ## Data binding · ## Accessibility`,
  all four required, in order.
- `system/components.css` :2412, :2467, :2496, :2550, :2595 — the header form for a library primitive:
  `/* ---------- ds-list (system/specs/list.md) — cross-scenario library primitive ---------- */`.

### New Files to Create

- `portal/public/canvas-ratify.mjs` — the ratify form, plan and result view (Task 3.2).
- `system/templates.admitted.mjs` — the registry (empty) + `checkAdmitted` + `ADMIT_TAGS` + the two markers.
- `portal/lib/ratify.mjs` — `planRatify` (pure), `ratifyHash`, the renderers/rewriters (pure), `runRatify` (impure).
- `tooling/ratify-journey.mjs` — the operator-run journey over a scratch git tree.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/canvas-design-import.architecture.md` :138-167 (op vocabulary, proposals, the import record),
  :199-223 (ratify + the origin guard), :264-277 (catalog churn, placement).
- `docs/epics/canvas-design-import.prd.md` MVP 6 (:132-133), G6 (:215), § Success metrics "Import time" (:177 —
  "Elapsed time per import, recognition → ratified").
- `discovery/README.md` ~:655-670 — the proposal package format (add the `ratified` status line, Task 4.4).
- `.claude/references/gates.md` group 21 (:33), the journey section (:116-140) — where the new journey and group go.
- Node `child_process.spawn` (https://nodejs.org/api/child_process.html#child_processspawncommand-args-options) — fixed
  argv, no shell; that is the whole reason the chain cannot be steered by a request.

### Patterns to Follow

**Op verb (canvas-ops):** four edits in three files, together — `OPS` entry, `PARAMS` entry, switch case, build-checks
group 35 cases (`VALID_FOR` + the per-verb loop picks it up). Mirror the `component.propose` case:

```js
case "component.propose": {
  if (typeof p.name !== "string" || !PROPOSAL_NAME_RE.test(p.name)) {
    throw new Error(`component.propose: name ${JSON.stringify(p.name)} is not a component name — …`);
  }
  …
  next.proposals.push({ id: nextId("pr", …), name: p.name, recordId: p.recordId, mode: p.mode, status: "proposed" });
  break;
}
```

**Spawning a repo script** (`portal/lib/import-measure.mjs:114`): `spawn(process.execPath, [path.join(REPO_DIR, "tooling/measure-render.mjs")], { stdio: ["pipe","pipe","pipe"] })`
— absolute script path, fixed argv, stdout/stderr collected, a timer that `SIGKILL`s. Ratify adds `cwd: repoDir`.

**Post-hoc record change** (`import-measure.mjs:100-108`): rebuild through `buildRecord` so `checkRecord` runs; never
patch the JSON in place.

**Refusal shape the page renders** (`import-run.mjs:620-624`): `{ refused: { kind, message, detail?, action: { label, hint? } } }`
answered `200`; a malformed request is `400 { error }`; a stale ledger `409`.

**Route shape** (`server.mjs:577-583`):

```js
if (p === '/api/canvas/import/mapping' && req.method === 'POST') {
  const b = await readBody(req);
  const root = resolveRunRoot({ provenance: b.provenance, slug: b.slug });
  assertProvenanceRoot(b.provenance, root);
  if (!isProposalName(b.name)) return json(res, 400, { error: `name … is not a component name` });
  return json(res, 200, withPack(root, editMapping({ … })));
}
```

**Errors:** plain `Error` whose message names the offending path/value (CLAUDE.md § Ground rules). Header on every new
module citing `epic #295 ticket #313` + the architecture section, with its INVARIANTS numbered and "asserted by
build-checks group N".

---

## DECISIONS (settled — do not reopen)

- **D1 — declarative registry (owner, 2026-09-30).** An admitted definition is JSON data:
  ```json
  { "tag": "div", "class": "ds-person-row",
    "slots": [ { "prop": "name", "as": "text", "tag": "span", "class": "ds-person-row-name" },
               { "prop": "tone", "as": "attr", "attr": "data-tone" } ],
    "children": "none",
    "provenance": { "from": "import", "record": "i1", "run": "fp-ratify", "line": "ported from Brilliant (spike C), licence: owner's own drawing" } }
  ```
  `tag` ∈ `ADMIT_TAGS` = `div span p li section article strong` (containers + inline text; no `a`, `button`, `input`,
  `img`, `script`, `style`, `iframe`). `class` matches `^(ds|vd)-[a-z][a-z0-9-]{1,39}$` and equals the spec head's
  `class`. `as: "text"` writes `textContent` (never `innerHTML`); `as: "attr"` sets one attribute whose name matches
  `^data-[a-z][a-z0-9-]*$`. `children` ∈ `"none" | "many"` and must agree with the spec's `childrenCardinality`
  (`"many"` ⇔ the spec declares it). Every slot's `prop` is a declared spec prop. A shape this cannot express is
  admitted by hand — the form says so.
- **D2 — loc read (owner).** `gen-loc-summary` gains an opt-in that reads the working-tree bytes of **only the files
  ratify wrote**, and the index for every other tracked file: `genLocSummary({ worktreeFiles: [...] })`, CLI
  `--worktree-files <a,b,…>`. Default stays the index. Narrowed from "read the whole worktree" because the loc groups
  also count root/`proto/` HTML and `agent-layer/*.mjs`, which a narrower guard would not cover — in this shared working dir a
  sibling session's uncommitted edit there would be counted, the owner would commit only ratify's files, and CI's
  index-based `--check` would red. A `worktreeFiles` entry that is not tracked is simply absent from `git ls-files`
  (the new spec is `.md`, in no group) — no error.
- **D3 — fixture reverted (owner).** The journey admits spike C's proposal in a scratch git tree built from the working
  tree and deletes it. Nothing admitted lands on `main`; the committed registry is `{}`.
- **D4 — the full chain, in this order, each a fresh `node` child with fixed argv and `cwd: repoDir`:**
  1. `agent-layer/gen-handoff.mjs` 2. `agent-layer/gen-vocabulary.mjs` 3. `agent-layer/gen-pack-bundle.mjs`
  4. `agent-layer/gen-pack-index.mjs` (last of the pack, #419) 5. `agent-layer/gen-system-graph.mjs`
  6. `import/regen-expected.mjs` (group 40) 7. `tooling/regen-import-records.mjs` (group 42.6)
  8. `agent-layer/gen-loc-summary.mjs --worktree-files <the plan's write paths, comma-joined>`
  9. `tooling/token-lint.mjs` (CI's verify runs it, `.github/workflows/verify.yml:88`; the architecture's list omitted it)
  10. `tooling/build-checks.mjs`.
  Stop at the first non-zero exit. **Observed** on a declarative admission at `3b5a6c7` (NOTES item 2c): every step
  exit 0, total ≈ 16.5 s (0.5 + 0.2 + 0.2 + 0.2 + 0.2 + 0.2 + 0.7 + 1.3 + 0.3 + 12.0). **Never import a generator into the portal**: `gen-vocabulary` imports
  `agentic-renderer.mjs`, which imports `templates.admitted.mjs`, and the long-lived portal's ESM cache would validate
  the new spec's `example` against the pre-ratify registry.
- **D5 — the clean-tree guard is two commands, and both must print nothing** (run in `repoDir`):
  1. tracked changes anywhere except prose: `git status --porcelain -uno -- . ':(exclude).claude' ':(exclude).agents' ':(exclude)docs' ':(exclude,glob)*.md'`
  2. untracked files in code dirs: `git status --porcelain -unormal -- system handoff import agent-layer portal tooling discovery proto scenarios worker`
  Why wider than the architecture's `system/` + `handoff/`: ratify writes `tooling/build-checks.mjs` and
  `system/specs/stack.md`, the chain writes `import/fixtures/`, and `build-checks` reads the WHOLE code tree — in this
  shared working dir a sibling session's half-done edit in `agent-layer/` would turn ratify's gate red and be read as
  ratify's fault. Observed: both commands print nothing on the owner's tree today (its `M .claude/skills/…` and root
  `.png`/`.txt` notes are excluded); on a scratch tree, an edit to `agent-layer/lib.mjs` and a new `tooling/zz.mjs`
  are each caught while `.claude/plans/a.md`, `docs/…prd.md` and `__TODO.md` are not. Record as an AMENDMENT on the
  architecture doc (Task 4.4).
- **D11 — the sixth write: the container's allowed children.** A part no container allows cannot be placed in any
  screen. Observed: with the part admitted and every gate green, a `stack` holding it rendered on all three engines as
  `Refused: composition.children[0]: "person-row" is not an allowed child of stack (allowed: card | choice | …)`.
  After adding `"person-row"` to `system/specs/stack.md`'s head `children` (sorted) and re-running the chain: all ten
  steps exit 0 and the canvas rendered "Grace Hopper" inside the stack on chromium, firefox and webkit with no refusal
  and 0 page errors. Precedent: #305 made the same `stack.md` edit for `icon` (`git show cc445e1 -- system/specs/stack.md`).
  So the form has **"May sit inside"**: a multi-select of vocabulary components whose head has
  `childrenCardinality: "many"` (today `stack`, `list`), default `["stack"]`. Ratify rewrites each chosen spec's head
  `"children": [...]` line — exactly one match per file or refuse — inserting the name in sort order. (`list` allows
  `list-row` only by design, `list.md:21`; the form shows it but the default stays `stack`.)
- **D12 — the journey's scratch tree is a `git clone`, never a `git worktree`.** A linked worktree shares the main
  repo's `info/exclude`: pre-flight appended `node_modules` through `git -C <worktree> rev-parse --git-path info/exclude`
  and it landed in THIS repo's `.git/info/exclude` (reverted byte-exact, confirmed by `diff` against a backup). A clone
  has its own `.git`. Proven sequence (NOTES item 2d): `git clone -q --no-hardlinks --no-checkout <repo> <T>` →
  `git -C <T> checkout -q --detach <HEAD>` → `git diff HEAD --binary | git -C <T> apply` → copy
  `git ls-files --others --exclude-standard` (minus `node_modules`, `.claude/`, `.agents/`) → symlink the four
  `node_modules` → `echo node_modules >> <T>/.git/info/exclude` → `git -C <T> add -A && git -C <T> -c user.name=ratify-journey -c user.email=journey@localhost commit -qm scratch`
  → `git -C <T> status --porcelain` empty (observed: 0 lines).
- **D6 — the hash.** `sha256` over canonical JSON (`sortKeys` + `JSON.stringify`) of
  `{ head, proposalId, recordSha, draftsSha, input, writes: [{path, kind, sha256(bytes)}] }` where `head` is
  `git rev-parse HEAD`. Confirm recomputes the plan from the same body and refuses a mismatch naming both hashes. HEAD in
  the hash means a commit between preview and confirm is stale by construction.
- **D7 — a red gate.** Files stay written (the owner reads the red in context); no op is appended; the record is
  untouched; the response carries `revert`: `git checkout -- <tracked writes and regenerated paths> && rm <created files>`.
  The tree is then dirty, so the next ratify refuses until the owner reverts or commits — one rule, no second state.
- **D8 — `elapsed.ratify`** = milliseconds between the `component.propose` line's `at` and the `proposal.ratify` line's
  `at`, both server-written — the PRD's "recognition → ratified", never a client clock.
- **D9 — undo.** The page cannot reach a ratify: its history is session-local and starts empty on every load
  (`portal/public/canvas.mjs:520-540` restores from `verbs` snapshots; `system/studio-verbs.mjs:334`
  `canUndo: () => index > 0`, `:920` "Nothing to undo."), and a green ratify reloads the page (Task 3.2). So the
  store-level refusal is defence against a hand-crafted `POST /api/canvas/save`: `foldLedger` refuses an `undone`
  line restating `proposal.ratify` — "a ratified component leaves the system through git, not undo". That save route
  has no try around `saveRun` (`server.mjs:484-491`), so the answer is the boundary's `500 { error }` naming it.
- **D10 — spec shape** is `kb-format.md`'s, not the importer draft's: `status: "shipped"`, `contract: null`, `class`,
  `props`, `tokens` (every `var(--x)` the CSS uses, in first-use order), `states`, `children` (`[]`, or the allowed child names when `many`),
  `childrenCardinality: "many"` only when `children === "many"` (check how `stack.md`/`list.md` declare it and mirror
  exactly), `example` (required here, so the catalog has a starting state and `gen-vocabulary` proves it renders).
  First line after the fence: none — provenance lives in `## Usage`'s first paragraph: `Admitted by ratify
  (portal/lib/ratify.mjs) from import record <id> in run <slug>: <provenance line>.` Sections `## Usage` (provenance +
  the owner's behaviour prose) · `## States` (one `- **<state>** — …` per state) · `## Data binding` (`contract: null`
  — presentational) · `## Accessibility` (the owner's prose).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation — the registry, the interpreter, the verb, the anchors

Everything a ratify writes into must exist, be committed, and be machine-editable at exactly one anchor each.

### Phase 2: The ratify core

**Depends on:** Phase 1 (the planner rewrites the anchors Phase 1 creates).

### Phase 3: Routes and UI

**Depends on:** Phase 2.

### Phase 4: Gates, journey, docs, regenerations

**Depends on:** Phases 1–3. Task 4.1 (canvas-ops cases) depends only on Task 1.3 and may run right after it.

---

## STEP-BY-STEP TASKS

### Task 1.1 — CREATE `system/templates.admitted.mjs`

- **IMPLEMENT**: Header (hand-written above the markers; machine-written between them), citing epic #295 ticket #313,
  architecture § Boundaries G6, D1. Exports:
  - `ADMIT_TAGS` (frozen), `CHILDREN` = `Object.freeze(["none", "many"])`.
  - `checkAdmitted(name, def, spec)` → throws naming `templates.admitted: <name>.<field>` for: unknown top-level key
    (exact key set `tag class slots children provenance`), tag not in `ADMIT_TAGS`, class regex/mismatch with
    `spec.class`, a slot with unknown keys / `as` not text|attr / text-slot tag not in `ADMIT_TAGS` / attr name regex /
    `prop` not in `spec.props`, duplicate slot prop, `children` not in `CHILDREN` or disagreeing with
    `spec.childrenCardinality`, `provenance` not `{from: "import", record: /^i[1-9]\d*$/, run: slug, line: non-empty string ≤ 200}`.
    Returns `true`. Pure: no DOM, no fs, no imports.
  - Between `// ---- BEGIN ADMITTED (portal/lib/ratify.mjs rewrites the JSON below; never edit by hand) ----` and
    `// ---- END ADMITTED ----`: `export const ADMITTED = deepFreeze(` / `{}` / `);`. The JSON sits on its own lines so
    ratify can `JSON.parse` the text between the `(` line and the `);` line. `deepFreeze` is a local helper defined
    ABOVE the markers.
- **PATTERN**: `system/device-presets.mjs` (a small frozen data module `canvas-ops.mjs` imports); `system/icons.mjs`
  (a generated data module the renderer imports).
- **IMPORTS**: none.
- **GOTCHA**: The portal must NEVER `import` this module to read `ADMITTED` (ESM cache, D4) — ratify reads the file
  TEXT. It may import `checkAdmitted`: pure and data-independent, so a cached copy is still correct. It is a new
  top-level `system/*.mjs`: it moves `loc-summary.json`'s runtime `files` count (80 → 81) and may move `linesApprox`.
  Memory `loc-summary-counts-tracked-only`: `--check` before staging lies — `git add` first.
- **VALIDATE**: `node -e "import('./system/templates.admitted.mjs').then(m=>console.log(Object.keys(m.ADMITTED).length, Object.isFrozen(m.ADMITTED)))"` → `0 true` (expected)
- **SATISFIES**: AC #2, AC #3
- **REGENERATES**: `system/loc-summary.json` (Task 5.1), approach ×3 baselines (Task 5.2).

### Task 1.2 — UPDATE `system/agentic-renderer.mjs` — the interpreter and the spread

- **IMPLEMENT**:
  - `import { ADMITTED } from "./templates.admitted.mjs";` beside `:39`'s icons import.
  - `export function admittedTemplate(def)` → `(props, kids, bus, path) => { const root = el(def.tag, { class: def.class }); for (const s of def.slots) { const v = props[s.prop]; if (v == null) continue; if (s.as === "text") root.appendChild(el(s.tag, { class: s.class, text: String(v) })); else root.setAttribute(s.attr, String(v)); } if (def.children === "many") kids.forEach((c, i) => root.appendChild(renderChild(c, bus, `${path}.children[${i}]`))); return root; }`.
  - Directly after the `TEMPLATES` literal closes: `const HAND_WRITTEN = Object.freeze(Object.keys(TEMPLATES));` then
    `for (const [name, def] of Object.entries(ADMITTED)) if (!Object.hasOwn(TEMPLATES, name)) TEMPLATES[name] = admittedTemplate(def);`
    and `export const admittedCollisions = () => Object.keys(ADMITTED).filter((n) => HAND_WRITTEN.includes(n));`.
    A hand-written template always wins; a collision is a build-checks red (Task 4.2), never a silent swap.
  - Reword `:21` and `:264` to drop "twenty-six" ("one per vocabulary entry: the hand-written map below, plus
    `system/templates.admitted.mjs`'s ratified entries spread in after it").
- **PATTERN**: the `list` template `:487` (kids through `renderChild` with the `.children[i]` path).
- **GOTCHA**: `el()` sets `text` via `textContent` (`:170-175`) — keep it; the interpreter must never build HTML
  strings. Group 3 (`:717`) now passes for admitted names via `hasTemplate` (`Object.hasOwn`) — correct, and the reason
  an EMPTY committed registry makes group 3's admitted leg unable to fail: Task 4.2 drives the interpreter over a
  fixture instead. `gen-vocabulary` imports this module under Node (`gen-vocabulary.mjs:19`) — the new import must stay
  Node-safe (it is: pure data).
- **VALIDATE**: `node agent-layer/gen-vocabulary.mjs` → `vocabulary      ✓  26 components (handoff/verdant/vocabulary.json)` and `git diff --quiet handoff/` (expected: no change).
- **SATISFIES**: AC #3
- **REGENERATES**: loc-summary (Task 5.1).

### Task 1.3 — UPDATE `system/canvas-ops.mjs` — verb twelve, `proposal.ratify`

- **IMPLEMENT**:
  - `OPS` += `"proposal.ratify"`; `PARAMS["proposal.ratify"] = Object.freeze(["proposalId", "component"])`; no
    `OPTIONAL` entry. Update the roster comment `:51-55` ("#313's proposal.ratify is here; group.define/group.place
    remain #315's, the lock still held").
  - Case: `proposalId` must match `/^pr[1-9][0-9]*$/` (throw naming the value); resolve in `next.proposals` — absent →
    `proposal.ratify: proposalId "<id>" does not resolve — this document holds <ids joined ", " or "no proposals">`;
    `mode === 2` → `proposal.ratify: "<name>" is a frozen original (Mode 2, <id>) — it stays beside the flow as an exhibit and never joins the vocabulary (G7)`;
    `status !== "proposed"` → `proposal.ratify: <id> is already <status>`; `component` must match `PROPOSAL_NAME_RE` and
    must not equal another proposal's `component`. Then replace that entry with `{ ...entry, status: "ratified", component: p.component }`.
  - Update `:464-466`'s comment: status moves through `proposal.ratify`; the filesystem half is `portal/lib/ratify.mjs`'s.
- **PATTERN**: `:463-478`; the unresolved-id message `:237`.
- **GOTCHA**: The applier stays filesystem- and vocabulary-blind (header :17-21, pinned by 35.9's import check).
  "Not already a vocabulary component" is `ratify.mjs`'s check, not the applier's. `exhibitsOf` needs no change (Mode
  2 can never be ratified) — assert it in 4.1 rather than editing it.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "canvas ops|groups pass|✗"` — BEFORE Task 4.1 this must
  red on 35.1 (`not the same eleven verbs`) and on `:11654` (`OPS includes proposal.ratify`). That red is the proof the
  pins can fail; Task 4.1 moves them.
- **SATISFIES**: AC #4
- **REGENERATES**: loc-summary (Task 5.1).

### Task 1.4 — UPDATE `portal/lib/canvas-store.mjs` — `foldLedger` refuses undoing a ratify (D9)

- **IMPLEMENT**: In the `undone` branch, before the LIFO comparison: `if (l.op === "proposal.ratify") throw new Error(\`foldLedger: line ${i + 1} (seq ${l.seq}) undoes proposal.ratify — a ratified component leaves the system through git, not undo\`);`.
  Extend the comment block `:110-116` by one sentence.
- **GOTCHA**: The page never offers this undo (D9: history starts empty on load, and ratify reloads). `saveRun` folds
  the whole ledger before writing (:460), so a hand-crafted save carrying the `undone` line is refused before any byte
  is written — journey R11 posts exactly that and asserts the 500 names `proposal.ratify` and the ledger is unchanged.
- **VALIDATE**: covered by Task 4.2 case 50.9.
- **SATISFIES**: AC #4 (ledger integrity)
- **REGENERATES**: none (portal/ is not a loc group).

### Task 1.5 — UPDATE `system/palette.mjs` — one name per line

- **IMPLEMENT**: Reformat `CATALOG_COMPONENTS` to one string per line, alphabetical, unchanged set, so ratify inserts
  one line and the diff is one line. Add to the comment above: "portal/lib/ratify.mjs inserts an admitted name here in
  sort order; the pin below is what refuses a missed one."
- **GOTCHA**: Set unchanged → 21.2 stays green. Runtime lines +21 → counts toward loc (Task 5.1).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "groups pass|✗"` → `build ✓  all 49 groups pass` (observed baseline at `3b5a6c7`: 49 groups, 11.8 s).
- **SATISFIES**: AC #1 (the palette write)
- **REGENERATES**: loc-summary (Task 5.1).

### Task 1.6 — UPDATE the histogram pin into one machine-editable anchor; strip the count copies

- **IMPLEMENT**:
  - `tooling/build-checks.mjs` 21.4 (:5133-5160): keep the narrative comment; below it add
    `const WRAPPER_PIN = { with: 3, without: 23 }; // ratify-pin — portal/lib/ratify.mjs moves this line and appends a reason below; one line, one match`
    and `const WRAPPER_PIN_REASONS = [ // ratify-reasons` / `];` (empty). Replace the literal assertion with
    `ok(withWrapper === WRAPPER_PIN.with && withoutWrapper === WRAPPER_PIN.without, \`the wrapper histogram moved — ${withWrapper} with / ${withoutWrapper} without (pinned ${WRAPPER_PIN.with}/${WRAPPER_PIN.without}; see the tripwire note above)\`)`.
  - Reword the three prose copies to carry no number (memory `gate-prose-has-three-copies`): `build-checks.mjs:95`
    ("tabsFor's wrapper histogram pinned as the #220 tripwire"), `system/catalog.mjs:66-72` ("the pinned histogram in
    build-checks 21.4 is the tripwire the next wrapper, component or ratify moves"), `tooling/catalog-journey.mjs:14`
    only if it states "3/23" as a fixed fact (it says "counted from the fetched pack" — check, then leave or reword).
- **GOTCHA**: Ratify's rewrite matches `^  const WRAPPER_PIN = \{ with: (\d+), without: (\d+) \}; // ratify-pin` with
  the `m` flag and REFUSES unless exactly one match; same for `// ratify-reasons`. The comment text is part of the
  anchor — changing it in a later PR breaks ratify loudly, which is intended.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "groups pass|✗"` → all green; then MUTATE `without: 23` →
  `24` and re-run → `the wrapper histogram moved — 3 with / 23 without (pinned 3/24…` (REDDENS), then revert.
- **SATISFIES**: AC #1 (the pin write)
- **REGENERATES**: loc-summary if `catalog.mjs` line count changes (Task 5.1).

### Task 1.7 — UPDATE `system/components.css` — the append anchor

- **IMPLEMENT**: Append at end of file: `/* ---------- admitted components — portal/lib/ratify.mjs appends one block per ratify below this line (#313) ---------- */`.
  Ratify appends `\n/* ---------- <class> (system/specs/<name>.md) — admitted by ratify from import <id> ---------- */\n.<class> { … }\n[.<class>-<slot> { … }]`.
- **GOTCHA**: Header form mirrors `:2496` (`/* ---------- ds-list (system/specs/list.md) — … ---------- */`), which
  is what token-lint and the docs-chain grep key on. Verify `node tooling/token-lint.mjs` (or however CI's verify runs
  token-lint — check `.github/workflows/verify.yml`) stays green with the marker comment.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 49 groups pass`.
- **SATISFIES**: AC #1 (the CSS write)
- **REGENERATES**: loc-summary (Task 5.1).

### Task 1.8 — UPDATE `agent-layer/gen-loc-summary.mjs` — `--worktree-files` (D2)

- **IMPLEMENT**: `genLocSummary({ check = false, worktreeFiles = [] } = {})`; for a tracked file in `worktreeFiles`
  read `readFileSync(path.join(ROOT, f), "utf8")`, for every other tracked file keep `git show :f`. A non-array or a
  non-string entry throws naming it. CLI `--worktree-files a,b,c`. Header: two sentences — the default and why (#56
  unchanged); the opt-in names exactly the files a caller wrote after proving them clean (ratify, D5), so no other
  session's edit can leak into the count.
- **GOTCHA**: The file list stays `git ls-files`. `drift-check.mjs:68` calls `genLocSummary({ check: true })` — untouched.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` (observed at
  `3b5a6c7`); then `node agent-layer/gen-loc-summary.mjs --worktree-files system/palette.mjs && git diff --quiet system/loc-summary.json && echo same` on a clean tree → `same` (expected).
- **REDDENS** (group 50.12): over a temp edit of `system/palette.mjs` adding 150 lines, `genLocSummary({ check: true, worktreeFiles: ["system/palette.mjs"] })`
  reports drift and `genLocSummary({ check: true })` does not; revert the edit.
- **SATISFIES**: AC #2
- **REGENERATES**: none by itself (`agent-layer/` is the generators group: `files` unchanged, lines may move → Task 5.1 regenerates anyway).

### Task 1.9 — UPDATE `tooling/build-checks.mjs` 23.2 — an admitted root class is read as DATA

- **IMPLEMENT**: 23.2 (`:5597-5607` at `3b5a6c7`, "THE CLICK TARGET IS REAL") greps `agentic-renderer.mjs`'s SOURCE
  for every pack component's root class. An admitted class lives only in `templates.admitted.mjs`'s JSON, so every
  ratify would red here at chain step 9 (observed — D1 probe, NOTES item 2b:
  `agentic-renderer.mjs emits no root class "ds-person-row" for "person-row"`). Import `ADMITTED` from
  `../system/templates.admitted.mjs` and accept `emitsClass(RENDERER_SRC, c.class) || ADMITTED[c.component]?.class === c.class`.
  The interpreter's root is always `def.class` (Task 1.2), so the data IS the emitted class. Update the 23.2 comment
  ("…in all three forms its templates use, or the admitted registry's `class`, which the one interpreter emits as the
  root") and the group-23 detail string.
- **REDDENS**: in the D1 probe shape, set the registry entry's `class` to `ds-other` (spec still `ds-person-row`) →
  23.2 reds naming `ds-person-row`. Checked with the probe patch above: green with the fix (`build ✓  all 49 groups pass`).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 49 groups pass`.
- **SATISFIES**: AC #1 (gates green after a ratify)
- **REGENERATES**: none.

### Task 2.1 — CREATE `portal/lib/ratify.mjs` — the pure half

- **IMPLEMENT** (all exported, all pure — no fs, no spawn; inputs are strings/objects the runner reads):
  - `checkInput(input, ctx)` — the owner's form, validated at the boundary (CLAUDE.md: validate by hand, throw naming
    the path). `input = { component, prefix: "ds"|"vd", props: { <name>: { type: "string"|"number"|"boolean", required, enum?, description } }, states: [string], usage, accessibility, stateNotes: { <state>: string }, structure: { tag, slots, children, allowedChildren? }, containers: [string], css: [{ suffix: ""|"-<slot>", decls: [[prop, value]] }], example: {…}, licence, attribution }`.
    `ctx = { vocabNames, containerNames, proposals, contractTokens }`. `contractTokens` is every `--x` declared in
    `system/tokens.contract.css` (63 today — `token-lint ✓ 63 contract tokens`, observed); `containerNames` is every
    vocabulary component whose head carries `childrenCardinality: "many"` (`stack`, `list`, observed at `stack.md:17`,
    `list.md:14`). Refuse: `component` not `PROPOSAL_NAME_RE`, in `vocabNames`, or another proposal's `component`; a CSS
    `prop` not `^[a-z-]+$`; a CSS value that is not one or more space-separated `var(--x)` with every `--x` in
    `contractTokens` (C2: token-only, no literal); a suffix not `""` or `-<slot class tail>`; a root rule (`suffix ""`)
    with zero declarations (the fixture's drafted root carries NO token — observed `block.css`: "the root carries no
    contract token" — so the owner must give the part at least one); `containers` empty or naming a non-container;
    empty `licence`; `example` missing a required prop; any prose field with a line starting `#` or a fence (50.14).
    Validation is by allowlist `RegExp.test` only, never by `.replace`-stripping — the repo's CodeQL history is 16 fixed
    alerts, 7 of them `incomplete-sanitization`/`bad-tag-filter` from replace-style filters (observed via
    `gh api …/code-scanning/alerts?state=fixed`). Then build the def and run `checkAdmitted` (Task 1.1).
  - `rewriteContainerChildren(text, container, name)` → the spec text with `name` inserted in sort order into the head's
    `"children": [ … ],` line (one line per spec today — observed `stack.md:16`); refuses unless exactly one match and
    the name is absent (D11).
  - `renderSpec(input, ctx)` → the spec text (D10). `renderCssBlock(input, ctx)` → the block (Task 1.7 form).
  - `rewriteRegistry(text, name, def)` → new file text; parses the JSON between the markers, refuses if the markers are
    not each present exactly once or the name exists, inserts, re-emits with keys sorted and `JSON.stringify(_, null, 2)`.
  - `rewritePalette(text, name)` → inserts `  "<name>",` in sort order inside `CATALOG_COMPONENTS`; refuses if the
    array literal is not found exactly once or the name is present.
  - `rewritePin(text, reason)` → `without + 1` on the `// ratify-pin` line and a `  "<reason>",` line before the
    `];` that closes `// ratify-reasons`; refuses unless each anchor matches once. Reason:
    `"<with>/<n> → <with>/<n+1>: <name> admitted by ratify from import <id> (run <slug>) — wrapper-less, no vd-<name> custom element, so its absent vd/react tabs are honest"`.
  - `planRatify({ head, proposal, record, drafts, input, files, ctx })` → `{ writes: [{ path, kind: "create"|"rewrite"|"append", bytes }], pin: { from, to, reason }, palette: { insert }, chain: CHAIN, hash }`.
    `files` carries the current text of `system/templates.admitted.mjs`, `system/palette.mjs`,
    `tooling/build-checks.mjs`, `system/components.css` and each chosen container's `system/specs/<c>.md`. Paths are
    repo-relative literals plus `system/specs/<component>.md` — `component` already passed `PROPOSAL_NAME_RE`, and a
    container name is checked against `containerNames` before it becomes a path. The six writes, in order: create
    `system/specs/<component>.md` · append `system/components.css` · rewrite `system/templates.admitted.mjs` · rewrite
    `system/palette.mjs` · rewrite `tooling/build-checks.mjs` (pin) · rewrite `system/specs/<container>.md` per container.
  - `ratifyHash(obj)` (D6) — `createHash("sha256")` over `jsonText(sortKeys(obj))` (import both from `./import-run.mjs`).
  - `CHAIN` — frozen `[[script, ...args]]`, D4's ten steps; step 8's `--worktree-files` list is appended at run time from
    the plan's write paths. `CLEAN_GUARD` — D5's two argv arrays, frozen.
- **PATTERN**: header + numbered INVARIANTS "asserted by build-checks group 50" (`import-run.mjs:1-82`).
- **IMPORTS**: `node:crypto`, `node:path`; `../../system/canvas-ops.mjs` (`PROPOSAL_NAME_RE`, `applyOp`);
  `../../system/templates.admitted.mjs` (`checkAdmitted` only); `./import-run.mjs` (`sortKeys`, `jsonText`, `loadInputs`,
  `isProposalName`); `./builder.mjs` (`withRunLock`); `./canvas-store.mjs`; `../../import/report.mjs`.
- **GOTCHA**: No SDK, no `zod` anywhere in the import graph — `builder.mjs` must not pull the SDK statically (check:
  `import-run.mjs` already imports `withRunLock` from it and group 43 proves that graph SDK-free; mirror that
  assertion in 50.1). The class used in the spec, CSS and def is `${prefix}-${component}`; the proposal's draft class
  (`vd-<proposalName>`) is only a prefill.
- **VALIDATE**: `node -e "import('./portal/lib/ratify.mjs').then(m=>console.log(typeof m.planRatify, m.CHAIN.length))"` → `function 10` (expected).
- **SATISFIES**: AC #1, AC #2
- **REGENERATES**: none.

### Task 2.2 — ADD `runRatify` to `portal/lib/ratify.mjs` — the impure half

- **IMPLEMENT**: `export async function previewRatify({ pkgRoot, name, input, repoDir = REPO_DIR })` and
  `export async function runRatify({ pkgRoot, name, input, hash, base, repoDir = REPO_DIR, now, runStep = spawnStep })`.
  `runStep(script, args, { cwd })` → `{ code, ms, tail }` is injected (default: the spawn below), the same seam
  `runImport`'s `reader` is (`import-run.mjs:414`) — it is what lets CI hold the lock open mid-ratify (Task 4.2 50.13).
  - Shared read: `loadBuild(path.join(pkgRoot, "build"))` → fold the ledger → find the proposal by `name`; read the
    proposal's drafts and `imports/<recordId>.json`; read the four anchor files from `repoDir`; `head` via
    `execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoDir })` (the `portal/lib/version.mjs:20` form).
  - `previewRatify`: dirty check (below) → apply `{op: "proposal.ratify", params: {proposalId, component}}` to the
    folded doc IN MEMORY (unknown / Mode 2 / already-ratified refuse here, before any write) → `planRatify` → return
    `{ plan: { writes: [{path, kind, lines}] , pin, palette, chain }, hash, checklist }` (no bytes on the wire beyond
    what the form shows; the page shows `path · kind · +lines`). Writes nothing.
  - `runRatify`: everything under `withRunLock(fn, "a ratify")`, busy → the `underLock` refusal shape.
    1. `saveConflict(buildRoot, base)` → 409 path (the route checks it too, before the lock).
    2. Dirty: both `CLEAN_GUARD` commands (D5) via `execFileSync("git", argv, { cwd: repoDir })`; any output →
       `{ refused: { kind: "dirty", message: "Uncommitted code changes — ratify runs every gate over the whole tree and shows only its own writes, so commit or revert these first.", detail: <porcelain lines>, action: { label: "Show the files" } } }`.
       Dirty is checked BEFORE the hash, so a dirty tree always answers `dirty` whatever hash is sent (journey R10b).
    3. Recompute the plan; `hash !== plan.hash` → `{ refused: { kind: "stale", message: "The plan changed since the preview (HEAD, the proposal or the form) — preview again.", detail: "sent <a>, now <b>", action: { label: "Preview again" } } }`.
    4. Apply the op in memory (refusals as in preview).
    5. Resolve every write under `repoDir` with the `underRoot` rule (`import-run.mjs:320`) BEFORE the first byte;
       write them.
    6. For each `CHAIN` entry: `runStep` = `spawn(process.execPath, [path.join(repoDir, script), ...args], { cwd: repoDir, stdio: ["ignore","pipe","pipe"] })`,
       collect, per-step timeout 120 s (observed longest step: `build-checks` 12.0 s; whole chain ≈ 16.5 s), SIGKILL on
       timeout, record `{ step, code, ms, tail: last 20 lines }`. First non-zero → stop. The whole confirm is one HTTP
       request of ~20 s: Node 20's `server.requestTimeout` default is 300 s (observed `node --version` v20.20.2; no
       override in `server.mjs`), and the page shows a busy state for the duration.
    7. Red → `{ gatesRed: true, gates, diff, revert }` (D7). No op, no record change.
    8. Green → `saveRun(pkgRoot, { base, ops: [{ op: "proposal.ratify", params: { proposalId, component }, status: "applied" }], positions: positionsOf(canvas) }, { now })`
       (mirror how `runImport` passes positions for Mode 1); then read the two ledger lines' `at`, and rewrite the record
       via `buildRecord({...record, provenance: { ...record.provenance, licence: input.licence, attribution: input.attribution }, elapsed: { ...record.elapsed, ratify: <ms, D8> }})`
       → `imports/<id>.json` (`jsonText(sortKeys(_))`) + `imports/<id>.md` (`projectRecord`).
    9. Diff: `git status --porcelain` (whole tree, so the journey can compare), `git diff --stat`, `git diff` capped at
       200 000 bytes with `truncated: true` stated, and each created file's text. Return `{ ok: true, component, gates, diff, checklist }`.
- **GOTCHA**: `elapsed.ratify` and the op are written ONLY after green; the record lives under the build root, which for
  a real run is in `JOBS_DIR` — so for a real package the repo's `git status` shows only system/handoff/import/tooling.
  `tooling/icons/node_modules` must exist in `repoDir` or `build-checks` group 41 reds (observed in a fresh worktree at
  `3b5a6c7`: `gen-icons: tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing`); the preview
  checks `existsSync` and refuses with the install command as its one action rather than failing at step 9.
  CodeQL (#387, memory `codeql-leg2-blocks-its-own-fix`): the write targets derive from a request-supplied name —
  keep the `PROPOSAL_NAME_RE` test and the `underRoot` resolve-then-`startsWith` check on the SAME value that reaches
  `writeFileSync`. Evidence this shape passes: `portal/` is in the analysed paths (`.github/codeql/codeql-config.yml:31-34`),
  `import-run.mjs` has written request-named files since #311, and the repo has 0 open alerts and no
  `js/path-injection` alert ever, fixed or open (observed). `git` is called with `execFileSync` and argv arrays only —
  no shell string, so no command-injection sink.
- **VALIDATE**: exercised end to end by Task 4.3; the pure parts by Task 4.2.
- **SATISFIES**: AC #1
- **REGENERATES**: none.

### Task 2.3 — UPDATE `portal/lib/import-run.mjs` — a ratified proposal is read-only; the view carries the form's prefill

- **IMPLEMENT**:
  - `editMapping` (:362): fold the ledger first; if the proposal's `status === "ratified"` →
    `{ refused: { kind: "ratified", message: "<name> is ratified as <component> — its mapping is provenance now; a change is a new import.", action: { label: "Import again" } } }`.
    (It would otherwise reset `elapsed.ratify` via `recordFor` and rewrite the drafts.)
  - `importView` (:489-520): add `status`, `component` (when ratified) and `ratifyPrefill`: `{ component: <proposal name>, prefix: "ds", css: [{ suffix: "", decls: <rootDeclarations of the record's root> }], props: {}, states: ["default"], example: {} }`.
  - Header invariant 4: one clause — "ratify (#313, portal/lib/ratify.mjs) reads them; nothing here reads a ratify".
- **GOTCHA**: `measureImport` (`import-measure.mjs`) rebuilds the record keeping `elapsed` (`:104`), so a measure after
  ratify is harmless; leave it.
- **VALIDATE**: Task 4.2 case 50.10.
- **SATISFIES**: AC #1
- **REGENERATES**: none.

### Task 3.1 — UPDATE `portal/server.mjs` — two routes

- **IMPLEMENT**: After `/api/canvas/import/measure` (:587):
  - `POST /api/canvas/ratify/preview` → body `{ provenance, slug, name, input }` → `resolveRunRoot` +
    `assertProvenanceRoot` + `isProposalName(name)` (400) → `json(res, 200, await previewRatify({ pkgRoot: root, name, input }))`.
    Writes nothing, so NOT through `withPack` — add it to 49.9's exception list beside `import/binding` and `pack`.
  - `POST /api/canvas/ratify/confirm` → body `{ provenance, slug, name, input, hash, base }` → same guards →
    `saveConflict(path.join(root, "build"), b.base)` → 409 → `json(res, 200, withPack(root, await runRatify({ … })))`.
  - Import both from `./lib/ratify.mjs` at the top.
- **GOTCHA**: The origin guard (:88) already runs before routing — do not add a second check. `withPack` regenerates
  `build/handoff/` after the op append; a red confirm appended nothing, so its pack regeneration is a no-op rewrite.
  The request may take ~20–40 s (the chain); no SSE here — a plain JSON answer, with the page showing a busy state.
- **VALIDATE**: `cd portal && PORT=0 node -e "import('./server.mjs')"` is not how this boots — use the smoke in Level 4.
- **SATISFIES**: AC #1
- **REGENERATES**: none.

### Task 3.2 — CREATE `portal/public/canvas-ratify.mjs`; UPDATE `canvas-import.mjs` + `canvas.mjs` — the form, the result, the checklist

The form lives in its OWN module so `canvas-import.mjs` (already the import view, the mapping editor and Measure)
gains one call, not ~300 lines. The server's `checkInput` is the only validator: the page collects, posts, and shows
refusals — it never re-implements a rule, so a UI slip cannot let a bad input through.

- **IMPLEMENT** `portal/public/canvas-ratify.mjs` (header: epic #295 ticket #313, G6; "the owner's half of ratify —
  collects the input, shows the plan and the result; validates nothing the server does not"):
  - `export function ratifySection(view, { api, showRefusal, reload })` → a `section[data-ratify]` or `null`
    (null unless `view.record.provenance.mode === 1 && view.status === "proposed"`; when `view.status === "ratified"`
    it returns a `p[data-ratified]` "Ratified as <component>").
  - A `FIELDS` table drives the simple inputs, one row each `{ key, label, kind: "text"|"textarea"|"select"|"multi", options? }`:
    component · prefix (ds|vd) · usage · accessibility · licence · attribution · containers (multi, from
    `view.ratifyPrefill.containerChoices`) · structure tag (select, `ADMIT_TAGS` from `/system/templates.admitted.mjs`)
    · children (none|many). Three repeating row groups, each with Add/Remove: **props** (name · type · required ·
    description · example value), **slots** (prop · as text|attr · tag or attr name · class suffix), **CSS rules**
    (suffix · property · token select from `view.ratifyPrefill.contractTokens`). States: a comma list plus one note
    textarea per state. Every control carries `data-ratify-field="<key>"` (rows: `data-ratify-row="<group>"` + index)
    — the journey's only selectors.
  - `readForm(root)` → the exact `input` object of Task 2.1 (example values coerced by the prop's type). One function,
    so the posted shape has one author.
  - Preview (`button[data-ratify-preview]`) → `POST /api/canvas/ratify/preview` → shows `path · kind · +lines` per
    write, the pin `from → to`, the palette insert, the containers, the ten chain steps, and the checklist; stores the
    returned `hash` on `button[data-ratify-confirm]`. ANY `input` event inside the section clears the plan and the hash
    (so a stale confirm is reachable only from a second tab or a direct POST — both covered by R5).
  - Confirm → busy state (button disabled, `aria-busy`, "Running ten steps (about 20 s)…") → `POST /api/canvas/ratify/confirm`
    → refused: `showRefusal` · red: each step `step · exit · ms` with its tail in a `<details>`, the porcelain list, the
    diff, and the `revert` command in a `<code>` with a copy button · green: the same result, then `reload()` after
    stashing the result in `sessionStorage["ratify:<name>"]` (try/catch; read and cleared once on the next render).
  - ALL fetched text (tails, diff, porcelain, refusal detail) goes into the DOM through `el(…, { text })` /
    `textContent` only — never `innerHTML`. The repo's CodeQL history has 3 fixed `js/xss-through-dom` alerts
    (`dock.mjs`, `instance-pack.mjs`, `catalog-journey.mjs`; observed), so this is the pattern the gate enforces.
  - The checklist (rendered with the plan AND the result):
    1. "Ratify commits nothing. Read the diff, then commit it yourself."
    2. "Every admission changes /components at rest: after committing, regenerate its baselines from a clean worktree — `cd tooling/visual-regression && npm run update:docker` (neutral, saulera, verdant)."
    3. "If system/loc-summary.json changed, regenerate the approach baselines in the same commit."
    4. "CI's verify job runs drift-check on the committed tree; ratify cannot run it on a dirty one."
- **UPDATE `canvas-import.mjs`**: import `ratifySection`; in `renderView` (:321-370) insert its return (when non-null)
  after the suggestions status and before the "Mapping" h3; pass `api`, `showRefusal` (:79) and a `reload` that
  navigates to the same `?import=<name>` URL (the post-import rule, `canvas-import.mjs:8`). When `view.status === "ratified"`
  render the mapping editor read-only (no edit controls).
- **UPDATE `canvas.mjs`** `describeOp` (:134-146): `case "proposal.ratify": return \`ratified ${p.proposalId} as ${p.component}\`;`.
- **UPDATE Task 2.3's `ratifyPrefill`**: add `containerChoices` (vocabulary names with `childrenCardinality: "many"`,
  default selection `["stack"]`) and `contractTokens` (the 63 `--x` names from `system/tokens.contract.css`).
- **Why a reload is enough**: the portal's static route sends no cache headers at all (`serveFile`, `server.mjs`:
  only `content-type`) — no `Cache-Control`, `ETag` or `Last-Modified`, so the browser has nothing to reuse
  heuristically and a reload refetches `/system/agentic-renderer.mjs`, `templates.admitted.mjs` and
  `/handoff/verdant/vocabulary.json` (`canvas.mjs:1010`). Without the reload a placement is not a crash either: the
  canvas wraps `renderComposition` in try/catch and shows "Refused: …" (`canvas.mjs:186`).
- **GOTCHA**: Portal UI is `el()` + template strings, no framework. Controls ≥ 44×44 (journey R12). The portal is not
  in the VR set (`canvas-journey.mjs:80`). `portal/public/` is in no loc group.
- **VALIDATE**: `node --check portal/public/canvas-ratify.mjs`; Task 4.3 R2–R12.
- **SATISFIES**: AC #1
- **REGENERATES**: none.

### Task 4.1 — UPDATE `tooling/build-checks.mjs` group 35 (canvas ops)

- **IMPLEMENT**:
  - 35.1 (:11250-11253): `COPS.length === 12`; message "the same twelve verbs — #302's six, #306's four, #311's one and #313's one".
  - 35.2 `VALID_FOR` (:11267-11280): `"proposal.ratify": { proposalId: "pr1", component: "person-row" }`.
  - The per-verb positive control (:11473-11486) applies each verb's minimal op to ONE setup doc
    (`screen.compose` ×2 + `connect`), which holds no proposal, so `proposal.ratify` would be refused there
    (observed: the setup at :11480-11484). Append `{ op: "component.propose", params: { name: "kept-row", recordId: "i9", mode: 1 } }`
    to that setup — it mints `pr1`, and its name and record differ from `VALID_FOR["component.propose"]`
    (`spike-list-row`, `i1`), so that verb's own control still owes the document nothing (the :11474-11479 rule).
  - `:11653-11654`: replace the "not in OPS" assertion with `ok(COPS.includes("proposal.ratify"), …)` and keep the
    "a new proposal's status is proposed" assertion.
  - NEW 35.16 after 35.15: over `m = fold([screen.compose, propose frozen-row mode 2 (pr1), propose kept-row mode 1 (pr2)])`:
    `names(ratify("pr2","kept-row"))` → null throw and `status "ratified"`, `component "kept-row"`, every other doc key
    deep-equal (positive control FIRST); unknown `pr9` → names `proposal.ratify`, `"pr9"`, `does not resolve`, `pr1, pr2`;
    `pr1` (Mode 2) → names `frozen original`, `pr1`, `G7`; a second ratify of pr2 → names `already ratified`;
    `component: "Person Row"` → names `not a component name`; `proposalId: "1"` → names `"1"`; an `id` slot → PARAMS
    exactness; `exhibitsOf(after)` still lists pr1 only; a doc with no `proposals` key → does not resolve, no crash.
- **REDDENS**: delete the `mode === 2` branch in the case → 35.16 "frozen original" line reds with `NO THROW`; drop the
  `VALID_FOR` entry → `no VALID_FOR fixture for "proposal.ratify"`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "canvas ops|groups pass"` → `build ✓  all 49 groups pass`.
- **SATISFIES**: AC #4
- **REGENERATES**: none.

### Task 4.2 — ADD build-checks group 50 "ratify" (and extend 49.9)

- **IMPLEMENT** (a `group("ratify", …)` at the end, numbered 50.x in comments; its CANNOT REACH states: the spawned
  chain, git state, the page — `ratify-journey`'s):
  - 50.1 `portal/lib/ratify.mjs` IMPORTED in CI with no `portal/node_modules`; its parsed static + dynamic specifiers
    name no `@anthropic-ai`, `zod`, `@modelcontextprotocol` (mirror group 43's reader).
  - 50.2 `checkAdmitted` over a valid fixture def (true) and 12 mutations each refused naming its field (tag `script`,
    `a`, class `x-y`, class ≠ spec class, slot `as: "html"`, attr `onclick`, unknown prop, duplicate slot prop,
    children `"one"`, `many` vs a spec without cardinality, extra key, provenance line empty).
  - 50.3 `admittedTemplate` driven under the existing DOM stub (`domStubControl()`, `tooling/build-checks.mjs:405`) over the fixture def:
    root tag/class, a text slot's `textContent` equal to a prop carrying `<img src=x onerror=1>` VERBATIM (no element
    created), an attr slot, a `null` prop skipped, `children: "many"` rendering two kids with their `data-part`.
  - 50.5 The committed `ADMITTED` passes `checkAdmitted` against its spec for every entry (vacuous on `{}` — the group
    says "0 entries, vacuous" in its own detail so a green is not misread).
  - 50.6 `planRatify` over a fixture (a proposal, a record, the four real anchor files read from disk, a valid input):
    deterministic (twice → equal), the six writes by path and kind (D11's container rewrite included), the pin `3/23 → 3/24`, the palette insert in
    order; each rewritten text re-parses (registry JSON parses; palette array has the name once; pin line matches once).
  - 50.7 Hash sensitivity: change `head`, the record, a draft byte, and each top-level input field one at a time →
    each changes the hash; identical input → identical hash.
  - 50.8 Refusals by name: CSS literal `#fff` / `12px` / `var(--nope)`; component in the vocabulary (`list-row`);
    missing licence; example missing a required prop; anchors missing and duplicated (for each of the three rewriters).
  - 50.9 `foldLedger` over `[propose, ratify applied, ratify undone]` throws naming `proposal.ratify` and `git`.
  - 50.10 `editMapping` over a scratch package whose ledger has a ratify → `refused.kind === "ratified"`, mapping.json
    byte-identical after.
  - 50.4 export a pure `collisionsOf(admittedKeys, handKeys)` from the renderer and
    make `admittedCollisions()` call it; drive `collisionsOf(["list-row", "person-row"], HAND_WRITTEN)` → `["list-row"]`
    and `collisionsOf([], …)` → `[]`. REDDENS: make it return `[]` always → the `list-row` line reds.
  - 50.12 the loc opt-in (Task 1.8's REDDENS).
  - 50.13 THE LOCK, ratify's leg (the `:16201` hand-off, "ratify's leg is #313's"): (a) a ratify during a gated import
    (47.13's `reader` gate pattern) → `refused.kind === "busy"` naming "an import"; (b) an import during a ratify whose
    injected `runStep` awaits a gate → `runImport` throws "a ratify is already in flight". Both over scratch package
    copies and a scratch `repoDir` whose `runStep` never spawns. Update the `:16201` comment ("both legs now").
  - 50.14 `checkInput` refuses prose fields (usage, accessibility, state notes, prop descriptions) containing a line
    that starts with `#` or a fence (```) — otherwise a `## ` breaks the four-section spec parse and the chain only
    catches it after the files are written (D7 keeps them).
  - 50.15 `rewriteContainerChildren` over the REAL `system/specs/stack.md`: inserts `person-row` between `nav-tabs` and
    `primary-button` (sorted), the head still parses (`parseFencedJson`), and refuses a second insert of the same name,
    a spec with no `"children"` line, and a spec with two. REDDENS: append instead of sorted insert → the order line reds.
  - 50.16 `CLEAN_GUARD` is D5's two argv arrays exactly, and neither contains a shell metacharacter or a request value.
  - 50.11 `CHAIN` equals D4's ten steps (`token-lint` ninth, `build-checks` last), and its pack prefix equals the order `tooling/drift-check.mjs` calls
    `genHandoff`/`genVocabulary`/`genPackBundle`/`genPackIndex` (read as source) — so a reorder of either reds here.
  - 49.9: add both ratify routes to `EXPECTED_POSTS`; confirm through `withPack(`; preview in the exception list;
    update "all eight" → "all ten" in its message AND the group-49 detail string AND gates.md (three copies).
- **REDDENS**: per case — 50.2 remove `script` from the refusal (allow it) → the `tag "script"` line `NO THROW`;
  50.3 swap `text:` for `innerHTML` in the interpreter → the verbatim assertion reds; 50.7 drop `head` from the hashed
  object → "a HEAD change did not change the hash"; 50.9 delete Task 1.4's branch → `NO THROW`; 50.11 swap steps 3/4.
  Run each once, record the message, revert.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 50 groups pass`.
- **SATISFIES**: AC #3, AC #4, AC #1 (pure half)
- **REGENERATES**: none.

### Task 4.3 — CREATE `tooling/ratify-journey.mjs`

Every setup step below was run by hand during planning (NOTES items 2c–2e); the script automates what was observed.

- **IMPLEMENT** (header in the canvas-journey form: WHAT IT PROVES · OPERATOR-RUN · THE SCRATCH TREE · WHAT IT CANNOT
  REACH — pixels, a real Brilliant tab, a human reading the diff):
  - **Scratch tree (D12)**, in a `try` whose `finally` (and SIGINT/SIGTERM) kills children by handle and `rm -rf`s
    `<T>` and the scratch JOBS_DIR: `git clone -q --no-hardlinks --no-checkout <repo> <T>` → `checkout -q --detach <HEAD>`
    → `git diff HEAD --binary | git -C <T> apply` → copy untracked (`git ls-files --others --exclude-standard`, minus
    `node_modules`, `.claude/`, `.agents/`) → symlink `node_modules` for `portal`, `tooling/icons`,
    `tooling/style-dictionary`, `tooling/visual-regression` → `node_modules` into `<T>/.git/info/exclude` → commit →
    assert `git -C <T> status --porcelain` is empty. Record the MAIN tree's `git status --porcelain` and
    `.git/info/exclude` bytes before; assert both identical at the end.
  - **Package**: `cp -R <T>/discovery/faster-payment <J>/_discovery/fp-ratify`; every call uses `provenance=real&slug=fp-ratify`
    (`resolveRunRoot` takes the REQUEST's provenance — `discovery.mjs:93-97` — so package writes land in `<J>`, outside
    `<T>`'s git status).
  - **Portal**: `spawn(process.execPath, ["server.mjs"], { cwd: <T>/portal, env: { …process.env, PORT, JOBS_DIR: <J>, UXF_IMPORT_SUGGEST: "off" } })`
    on a free port; poll `/api/health` until `jobsDir === <J>` and `headSha === git -C <T> rev-parse HEAD` and
    `stale === false` (observed shape: `{"ok":true,…,"jobsDir":"…/jobs313","bootSha":"166e332…","headSha":"166e332…","stale":false}`).
  - **Setup drop (API, not page)**: `POST /api/canvas/import/drop?provenance=real&slug=fp-ratify&base=<ledger length>&name=spike-c.txt&mode=1`
    with the bytes of `<T>/import/fixtures/spike-c-instance.blueprint.txt` → `name === "spike-list-row"`,
    `recordId === "i1"`, `count === 7` (observed, from `base=6`); the last ledger line is `component.propose`.
  - **Chromium, through the page** (`canvas.html?provenance=real&slug=fp-ratify&import=spike-list-row`):
    R1 `section[data-ratify]` present; a Mode 2 drop (`mode=2`, a second fixture copy) shows NO section.
    R2 prefill: component `spike-list-row`, prefix `ds`, containers `stack`.
    R3 fill via `data-ratify-field`: component `person-row`; props `name` (string, required, example "Ada Lovelace"),
    `meta` (string, example "Payee"); states `default`; tag `div`; slots name→text `span` `-name`, meta→text `span`
    `-meta`; children none; CSS root `gap` ← `--spacing-sm`, `padding` ← `--spacing-sm` (the exact tokens the
    planning probe rendered with, both in the contract); usage, accessibility, licence "the owner's own drawing (spike C fixture)".
    R4 Preview → six writes listed (spec create, components.css append, registry, palette, pin, `system/specs/stack.md`),
    pin `3/23 → 3/24`, ten steps; `git -C <T> status --porcelain` still empty.
    R5 STALE HASH on a CLEAN tree: direct POST confirm with the preview's hash, the current `base`, and
    `input.props.meta.example` changed → `refused.kind === "stale"`; tree still clean; ledger length unchanged.
    R6 cross-origin confirm (`origin: http://evil.example`) → 403, tree clean.
    R7 Confirm through the page → the page reloads; the stashed result shows ten steps exit 0, the last tail
    `build ✓  all 50 groups pass`.
    R8 `git -C <T> status --porcelain` as a SET equals the response's porcelain and equals exactly:
    `?? system/specs/person-row.md` + ` M` for `system/templates.admitted.mjs`, `system/components.css`,
    `system/palette.mjs`, `system/specs/stack.md`, `tooling/build-checks.mjs`, `handoff/verdant/{llms.txt,pack.bundle.json,pack.json,vocabulary.json}`,
    `system/system-graph.json`, `import/fixtures/spike-c-instance.expected.json`, `import/fixtures/figma/spike-list-row.expected.json`,
    `import/fixtures/records/spike-c-faithful.json`, `import/fixtures/records/spike-c-wrong-but-green.json`, and
    `system/loc-summary.json` ONLY IF its bytes changed (assert it is in the set iff `git diff` shows it). Derived from
    the planning probe's porcelain (NOTES 2c) minus `agentic-renderer.mjs` (Task 1.2 is already committed in `<T>`)
    plus `stack.md` (D11). Anything else fails naming the path.
    R9 ledger last line `proposal.ratify {proposalId: "pr1", component: "person-row"}` source `owner`; `imports/i1.json`
    `elapsed.ratify` = the two lines' `at` difference in ms (> 0); `provenance.licence` set; `checkRecord` passes;
    the import view shows "Ratified as person-row" and no Ratify section.
    R10 DIRTY: (a) POST preview with the current `base` → `refused.kind === "dirty"`, no hash; (b) POST confirm with the
    current `base` and any hash → `refused.kind === "dirty"`; ledger unchanged.
    R11 UNDO: the page's Undo control is disabled and Cmd+Z says "Nothing to undo." (history empty after the reload);
    a direct `POST /api/canvas/save` appending an `undone` line restating the ratify → status 500, body `error`
    contains `proposal.ratify` and `git`; ledger unchanged.
    R12 44×44 on every `[data-ratify] button, [data-ratify] select, [data-ratify] input[type=checkbox]`.
  - **Render proof, three engines (AC #3)** — the exact probe run in planning (NOTES 2e):
    static server `spawn(process.execPath, [<T>/tooling/visual-regression/serve.mjs], { env: { PORT } })`, then fetch
    `/system/templates.admitted.mjs` and assert it contains `"person-row"` (memory `stale-serve-wrong-tree`);
    open `/components.html#person-row`, wait for `#person-row.cat-component .ds-person-row` → `.ds-person-row-name`
    text "Ada Lovelace" (observed on chromium, firefox, webkit, 0 page errors).
    Canvas: `POST /api/canvas/save` one `screen.compose` whose composition is
    `{ name: "stack", props: { direction: "column", gap: "md" }, children: [{ name: "person-row", props: { name: "Grace Hopper" } }] }`
    with `positions = positionsOf(loadBuild(<J>/…/build).canvas)` plus the new frame's `{ x: 3200, y: 0 }`
    (import `positionsOf`/`loadBuild` from `<T>/portal/lib/canvas-store.mjs`; a hand-built positions map fails with
    `arrangement: node "d7" has no width` — observed); reload `canvas.html` and read `.ds-person-row .ds-person-row-name`
    → "Grace Hopper", zero `.cv-flag` texts starting "Refused" (observed on all three engines once `stack.md` lists the
    part; before D11 all three showed the "not an allowed child of stack" refusal).
    Assert `git -C <T> diff HEAD -- system/agentic-renderer.mjs` is EMPTY.
  - Summary `ratify-journey ✓ …` naming R1–R12 and the render proof per engine; `✗ N assertion(s) failed`, exit 1.
- **PATTERN**: `tooling/canvas-journey.mjs` :167-214 (free port, spawn, health identity), its teardown and summary;
  Playwright resolves at `~/node_modules` via `createRequire(process.env.HOME + "/node_modules/")` (observed working
  in planning; memory `headless-render-data-pages-worker-refused`).
- **GOTCHA**: Kill children by handle only (memory `portal-smoke-port-scoped-kill`). Never `git worktree` for `<T>`
  (D12). The confirm takes ~20 s — give its `fetch`/page wait 120 s.
- **VALIDATE**: `node tooling/ratify-journey.mjs all` → `ratify-journey ✓ …`, exit 0.
- **SATISFIES**: AC #1, AC #3
- **REGENERATES**: none.

### Task 4.4 — UPDATE docs (the index, not the spec — invariants stay in file headers)

- **IMPLEMENT**:
  - `CLAUDE.md` architecture map: rows for `system/templates.admitted.mjs` ("the ratified registry — data, spread into
    the renderer's TEMPLATES; ratify rewrites it"), `portal/lib/ratify.mjs` ("the OWNER'S ADMISSION — write, run the
    chain, return the diff; never git"), `portal/public/canvas-ratify.mjs` (under the portal's `public/` line, if it
    lists modules), `tooling/ratify-journey.mjs`. In "Where new code goes" › **New component spec**: the chain it
    names gains `node tooling/regen-import-records.mjs` (group 42.6 reds without it — observed), and "a new component
    that should be placeable adds itself to `stack.md`'s `children`". Fix the stale group count ("41 PURE groups" →
    "50"; observed 49 at `3b5a6c7`) in both places CLAUDE.md states it. "Where new code goes": a bullet — **Admitting
    an imported part** → the portal's Ratify form; a new admitted-template capability is a `checkAdmitted` +
    `admittedTemplate` edit together, with a group 50 case.
  - `.claude/references/gates.md`: group 50's entry with its CANNOT REACH; the ratify-journey entry; 49.9's "ten".
  - `discovery/README.md` proposal section (~:655-670): the `ratified` status, `component`, `elapsed.ratify`, and that
    a ratified proposal's mapping is read-only.
  - `docs/epics/canvas-design-import.architecture.md`: an AMENDMENTS-style dated note under § Boundaries G6 — "the
    chain is ten runs (D4), the clean-tree guard spans the code tree (D5), the template is declarative (D1), and a ratify also lists the part in a container spec (D11)". Flag it in the
    PR body as a recorded divergence, per CLAUDE.md § Working principles.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → all green (drift-check syntax-checks every tracked `.mjs`,
  memory `drift-check-syntax-checks-parked-mjs` — no fragments parked as `.mjs`).
- **SATISFIES**: AC #2 (the named cost recorded)
- **REGENERATES**: none.

### Task 5.1 — REGENERATE `system/loc-summary.json`

- **IMPLEMENT**: `git add` every changed/new file first (memory `loc-summary-counts-tracked-only`), then
  `node agent-layer/gen-loc-summary.mjs` and `node agent-layer/gen-loc-summary.mjs --check`.
- **VALIDATE**: `loc summary ✓  3 groups — no drift`; runtime `files` 80 → 81 (derived: one new top-level `system/*.mjs`).
- **SATISFIES**: AC #2
- **REGENERATES**: `system/loc-summary.json`.

### Task 5.2 — REGENERATE approach baselines ×3

- **IMPLEMENT**: memories `loc-summary-baseline-cascade` + `vr-gate-reads-working-tree` + `vr-update-skips-subperceptual`:
  commit, then from a clean DETACHED worktree under `/Users` (not `/private/tmp` — Docker file sharing):
  `rm tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png && cd tooling/visual-regression && npm ci && npm run update:docker`;
  copy the three PNGs back; commit. REQUIRED: `approach.html:296` renders `runtime.files` (and :298 `linesApprox`), and
  `files` goes 80 → 81, so all three baselines move (observed at `3b5a6c7`).
- **GOTCHA**: The ticket says "approach ×2"; `PACKS` is three since #302 (`visual.spec.mjs:148`: neutral, saulera,
  verdant) — ×3. Memory `vr-gate-approach-countup-flake`: a "two consecutive stable screenshots" failure on approach is
  the countUp flake; re-run, check `gh pr checks`.
- **VALIDATE**: `gh pr checks <PR>` → `visual` pass.
- **SATISFIES**: AC #2
- **REGENERATES**: `tooling/visual-regression/baselines/approach-*.png`.

---

## RISK REGISTER — every risk named at planning, and what closed it

| # | Risk | Closed by | Evidence (observed 2026-09-30 at `3b5a6c7` unless stated) |
|---|---|---|---|
| R-1 | The architecture's four regenerators leave `build-checks` red | D4: ten steps | A hand admission went red on 42.6 until `regen-import-records`; the declarative admission ran all ten steps exit 0 (NOTES 2c) |
| R-2 | A declarative template fails a source-reading gate | Task 1.9 (23.2 reads `ADMITTED`) | 23.2 red without it, `all 49 groups pass` with it (NOTES 2b) |
| R-3 | An admitted part renders nowhere real | D1 interpreter + the spread | `/components#person-row` rendered "Ada Lovelace" on chromium, firefox, webkit, 0 page errors (NOTES 2e) |
| R-4 | An admitted part cannot be placed in a screen | D11: the container write | Refused inside `stack` on all three engines before; "Grace Hopper" rendered inside `stack` on all three after, 0 refusals (NOTES 2e) |
| R-5 | The line count reads the index and lies | D2: `--worktree-files` | `gen-loc-summary.mjs:42-46` reads `git show :<path>`; the opt-in reads only ratify's files |
| R-6 | A sibling session's edit reds ratify's gate | D5: two-part clean guard | Guard prints nothing on the owner's tree today; catches a scratch `agent-layer/` edit and a new `tooling/` file, ignores `.claude/`, `docs/`, root `.md` |
| R-7 | Stale confirm passes because the tree is dirty, not because of the hash | R5 runs on a CLEAN tree; dirty checked before hash | Task 2.2 step order; journey R5 vs R10 |
| R-8 | Undoing a ratify from the page | D9 | Page history starts empty on load (`studio-verbs.mjs:334`, `:920`); ratify reloads; store refuses a crafted undo |
| R-9 | The open page keeps the old renderer after ratify | Task 3.2 reload | `serveFile` sends no cache headers; a stale placement is a visible "Refused:" flag, not a crash (`canvas.mjs:186`) |
| R-10 | CodeQL blocks the PR | Same write shape as `import-run`; allowlist `.test`; `textContent`; `execFileSync` argv | 0 open alerts; no `js/path-injection` ever; the 16 fixed alerts were sanitisation-by-replace (7) and xss-through-dom (3) — both patterns excluded by rule |
| R-11 | The journey's scratch tree leaks into the real repo | D12: clone, not worktree | A worktree probe wrote into this repo's `.git/info/exclude` (reverted, `diff` clean); the clone probe left it untouched |
| R-12 | The journey setup is guesswork | Task 4.3 uses only observed commands | Clone → apply → commit gave 0 porcelain; portal booted with `stale:false` at the scratch HEAD; the API drop answered `spike-list-row`, `i1`, `count 7`; `positionsOf` is required for a save (a hand map failed on `d7`) |
| R-13 | The portal form is large and drifts from the server's rules | Task 3.2: own module, `FIELDS` table, one `readForm`, no client validation | The server's `checkInput` is the single validator; the page only shows refusals |
| R-14 | Confirm times out | 120 s per step, ~16.5 s total | Timed per step; Node 20 `requestTimeout` 300 s default, no override in `server.mjs` |
| R-15 | The fixture's drafted CSS is empty | `checkInput` requires ≥ 1 root declaration; the journey supplies two contract tokens | Drafted `block.css`: "the root carries no contract token"; `--spacing-sm`/`--spacing-md` rendered and passed token-lint |
| R-16 | The compose agent refuses the new part until the portal restarts | No change needed | `canvas-session.mjs:450` reads `vocabulary.json` inside each turn (`readFileSync(VOCAB_PATH)`), not at module scope; `import-run.mjs`'s `loadInputs()` likewise per call; `builder.mjs` and `import-suggest.mjs` read neither |
| R-17 | The pack regeneration after confirm throws on the new op | No change needed | `agent-layer/gen-build-handoff.mjs` has no op switch; it folds through canvas-store (`applyOps`), which gains the case in Task 1.3; its only `l.op` uses print the op name (`:110`, `:112`) |

What no planning run can prove: that the implementer's code matches these observations. The journey (R1–R12 plus the
render proof) is the check that it does; nothing ships until it prints `ratify-journey ✓`.

## TESTING STRATEGY

No suite (CLAUDE.md § Testing): `build-checks` groups for the pure layer, one operator-run journey for the impure one.

### Unit Tests

Group 35.16 (the verb) and group 50 (the planner, validators, rewriters, hash, interpreter, ledger rule, mapping lock,
chain order). Both run in CI with no `portal/node_modules`.

### Integration Tests

`tooling/ratify-journey.mjs` — the only thing that runs the chain, touches git, and renders an admitted part. Operator-run,
like every journey (no browsers in CI).

### Edge Cases

- Mode 2 proposal: no Ratify section in the UI (R2 negative on a Mode 2 drop — add one assertion), applier refusal (35.16).
- Proposal already ratified: UI line, applier refusal, mapping refusal.
- Component name colliding with the vocabulary, with another proposal's component, or with a hand-written template.
- CSS carrying a literal or an unknown token.
- A prop carrying markup (rendered as text).
- HEAD moving between preview and confirm (hash, D6); the form changing (R5); a stale ledger (409).
- Dirty watched path before preview (preview refuses too) and after a success (R10).
- `tooling/icons/node_modules` absent → preview refusal with the install command.
- A red gate mid-chain → files kept, no op, revert command (drive once by hand: temporarily make the example violate
  the spec in the scratch tree's form so `gen-vocabulary` fails at step 2; assert `gatesRed`, no op line, record untouched).

### Proving the checks

Every Task 4.1/4.2 case carries its REDDENS mutation above; run each once and paste the message into the report. The
positive controls: 35.16's Mode 1 ratify FIRST; 50.2's valid def; 50.6's deterministic plan; R7's green chain. The
advisor's trap, restated: R10 (dirty) can never prove the hash, so R5 runs on a CLEAN tree with only the input changed.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

- `node --check system/templates.admitted.mjs portal/lib/ratify.mjs tooling/ratify-journey.mjs`
- `node tooling/drift-check.mjs` (on a committed tree — it reads `git status` of `handoff/`)

### Level 2: Unit Tests

- `node tooling/build-checks.mjs` → `build ✓  all 50 groups pass`

### Level 3: Integration Tests

- `node agent-layer/gen-loc-summary.mjs --check` · `node agent-layer/gen-system-graph.mjs --check` · `node import/regen-expected.mjs --check`
  (observed at `3b5a6c7`: all three ✓ no drift)
- `node tooling/ratify-journey.mjs all`
- `(cd portal && npm ci) && node tooling/canvas-journey.mjs all` — the existing journey must stay green (its import
  view gained a section; its "nothing under system/ changed" claim still holds because it never confirms).
- `node tooling/catalog-journey.mjs all` (with `node tooling/visual-regression/serve.mjs &` — verify it is YOUR tree,
  memory `stale-serve-wrong-tree`).

### Level 4: Manual Validation

Portal smoke (memory `portal-smoke-port-scoped-kill`): `cd portal && PORT=$(node -e "const s=require('net').createServer().listen(0,()=>{console.log(s.address().port);s.close()})") && (PORT=$PORT node server.mjs & echo $! > /tmp/p.pid) && sleep 2 && curl -s localhost:$PORT/api/health && curl -s -X POST localhost:$PORT/api/canvas/ratify/preview -H 'content-type: application/json' -d '{"provenance":"fictional","slug":"faster-payment","name":"nope"}' ; kill $(cat /tmp/p.pid)`
→ health JSON, then a refusal/400 naming `nope` (expected: no proposal of that name).

### Level 5: Additional Validation

- CodeQL: push and read `gh pr checks` (leg 1 is the diff; memory `codeql-leg2-blocks-its-own-fix`). Optional local run
  with the bundle at `~/.codeql/2.27.0` (memory `codeql-bundle-local-path`) over `portal/lib/ratify.mjs`.
- `/piv-validate` (memory `piv-skills-python-tuned`: build-checks · drift-check · token-lint + a portal smoke).

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| `ratify-journey all` (three browsers, scratch tree) | $0, ~3–5 min | yes | — (must run) |
| A first REAL ratify of an owner-chosen import on `main` | owner's hand; $0 | no | open a follow-up "first real admission" ticket before the PR, citing PRD § Supply |
| `/components` ×3 baseline regen for that real admission | owner's hand | no (not in this PR, D3) | same follow-up |
| approach ×3 baseline regen (Task 5.2) | $0, Docker | yes | — |

No model call anywhere on this path.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — journey over spike C's proposal: preview → confirm → the six writes land (D11 adds the container) → ten steps green → diff
  returned; `git status` equals exactly those files plus the named regenerated set; a confirm with a stale hash is
  refused on a clean tree (R5); a dirty watched path refuses (R10). (Tasks 2.x, 3.x, 4.3)
- [ ] AC #2 — `system/templates.admitted.mjs` committed; `loc-summary.json` regenerated; approach ×3 regenerated
  (runtime `files` 80 → 81 is rendered); the fixture admission REVERTED (scratch tree), so no `/components` regen here. (Tasks 1.1, 5.1, 5.2)
- [ ] AC #3 — an admitted definition renders on `/components` and on the canvas ×3 engines with
  `git diff HEAD -- system/agentic-renderer.mjs` empty in the scratch tree. (Tasks 1.2, 4.3)
- [ ] AC #4 — `proposal.ratify` in `OPS`/`PARAMS`/switch; 35.16 proves it incl. unknown id throws and Mode 2 refused
  with a Mode 1 positive control; `:11654` moved. (Tasks 1.3, 4.1)
- [ ] `build ✓  all 50 groups pass`; `canvas-journey` and `catalog-journey` still green; CodeQL leg 1 green.
- [ ] PR body carries `Closes #313` and names the architecture divergences (D4, D5, D1).

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each VALIDATE run and its output pasted into the report
- [ ] Every REDDENS mutation run once and reverted
- [ ] `git add` before `gen-loc-summary --check`
- [ ] Plan, report and review in the same PR (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`)
- [ ] Op-verb lock: `gh pr list --state open` shows no #315 PR touching `system/canvas-ops.mjs` at branch time
  (observed 2026-09-30: none open)

---

## OPEN QUESTIONS / ASSUMPTIONS

- **A1** — `ds-` is the default prefix for an admitted part (library-generic, like the five primitives); `vd-` is
  offered for a scenario-specific one. The importer's `vd-<name>` draft class is only a prefill.
- **A2** — `children: "many"` maps to the spec head's `"childrenCardinality": "many"` (observed: `stack.md:17`,
  `list.md:14`, a top-level head key), and the spec's `children` then lists the allowed child names — the form asks
  for them when `many` is chosen.
- **A3** — An admitted spec has no `.contract.json` and no `wrapper`, so each admission moves only the histogram's
  `without` half. A future wrapper-carrying admission is a hand edit.
- **A4** — the clean-tree guard (D5) is wider than the architecture's two paths; recorded as an amendment (Task 4.4), not silent.
- **Q1 (non-blocking)** — whether `system/templates.admitted.mjs`'s lines should count toward approach's "view-time
  modules" total is the same open call `canvas-ops.mjs:23-29` records; this plan counts them (they are loaded by
  shipped pages via the renderer).

## NOTES (open canvas)

### Pre-flight (run 2026-09-30 against `origin/main` 3b5a6c7, detached worktree)

1. **Drove the importer over spike C's fixtures** (`runPipeline` via a scratch script): proposal name `spike-list-row`
   for both Brilliant fixtures and the Figma one; verdict `list-row` / `list` covered; `compositions: [null]` in all
   three, dropped as `unfillable-required-prop` (`list-row.value`, `list.empty`). → Changed the plan: nothing upstream
   drafts a renderer template; D1 put to the owner, declarative chosen.
2. **Admitted a probe component by hand** (`probe-row`: spec + CSS block + a `TEMPLATES` line + palette + pin 3/24),
   then ran the architecture's four regenerators + `gen-pack-index` + `gen-system-graph` + `regen-expected` →
   `build-checks` RED: `build import-record ✗ 42.6: the committed import records drift … Regenerate with node tooling/regen-import-records.mjs`.
   After `regen-import-records`: `build ✓  all 49 groups pass`. → D4's chain (token-lint added later, item 2c). CAVEAT: this probe typed the
   template into `agentic-renderer.mjs` — the hand-written path, not D1's. Item 2b re-ran it in D1's shape.
   Probe diff: 13 modified + 1 new file (`handoff/verdant/{llms.txt,pack.bundle.json,pack.json,vocabulary.json}`, both `*.expected.json`,
   `import/fixtures/records/spike-c-{faithful,wrong-but-green}.json`, `system/{components.css,palette.mjs,system-graph.json}`,
   `system/agentic-renderer.mjs` (absent under D1), `tooling/build-checks.mjs`) — the R8 expected set derives from it.
   Worktree reset after.
2b. **The D1 probe** (fresh worktree at `3b5a6c7`): a stub `templates.admitted.mjs` with one `person-row` entry, the
   Task 1.2 interpreter + spread in the renderer (no template line), spec, CSS block, palette, pin 3/24, then D4's
   steps 1–7 → all ✓ (vocabulary `27 components` — `gen-vocabulary`'s example validation rendered through the
   interpreter), then `build-checks` → RED: `build studio docs ✗ agentic-renderer.mjs emits no root class "ds-person-row"`
   (23.2 reads the renderer's SOURCE). With 23.2 accepting the registry's class → `build ✓  all 49 groups pass`, and
   `gen-loc-summary --check` ✓. → Task 1.9 added. Porcelain: the 13 files of item 2 (renderer included, because the
   probe also carried Task 1.2's one-time edit) + `?? system/specs/person-row.md` + `?? system/templates.admitted.mjs`.
   Under a real ratify the renderer is unchanged and the registry is modified, not new — R8's set.
2c. **The full ten-step chain on a declarative admission** (independent clone at `3b5a6c7`, the 2b probe plus two
   props, a two-rule CSS block): every step exit 0 — `handoff pack ✓ 27 specs`, `vocabulary ✓ 27 components`,
   `pack bundle ✓`, `pack index ✓`, `system graph ✓ 63 tokens · 50 consumers · 559 edges`, `expected verdict ✓` ×2,
   `import records ✓ 4 files`, `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`,
   `build ✓  all 49 groups pass`. Clean-tree timings: 0.5 · 0.2 · 0.2 · 0.2 · 0.2 · 0.2 · 0.7 · 1.3 · 0.3 · 12.0 s.
2d. **The scratch tree and the portal** — the D12 sequence gave `porcelain=0`; `server.mjs` booted from the clone with
   `JOBS_DIR` at a scratch dir answered `/api/health` with `stale:false` and the clone's HEAD; the API drop of
   `spike-c-instance.blueprint.txt` answered `{"name":"spike-list-row","recordId":"i1","count":7}`, wrote
   `imports/i1.{json,md,transcript.jsonl}` + `proposals/spike-list-row/`, and left the clone's `git status` empty. The
   drafted `block.css` root carries no token (R-15). A worktree-based first attempt wrote `node_modules` into THIS
   repo's `.git/info/exclude` through the shared git dir — reverted, verified byte-exact against a backup (R-11, D12).
2e. **The render proof, three engines** — `/components.html#person-row` → "Ada Lovelace" in `.ds-person-row-name`
   on chromium, firefox and webkit, 0 page errors. The canvas, a `stack` holding the part: first "Refused: … not an
   allowed child of stack" on all three (R-4); after adding `person-row` to `stack.md`'s `children` and re-running the
   chain (all ten ✓), "Grace Hopper" on all three, no refusal, 0 page errors. The renderer carried only Task 1.2's
   one-time edit; no per-part template line existed.
2f. **Undo, caching, CodeQL, timeouts** — read, not assumed: `studio-verbs.mjs:334`/`:920` (history empty on load);
   `serveFile` headers (`content-type` only); `gh api …/code-scanning/alerts` (0 open; 16 fixed, none path-injection);
   `node --version` v20.20.2 and no `requestTimeout` override in `server.mjs`. All scratch trees and servers removed.
3. **Gates at base**: `build-checks` → `all 49 groups pass`, 11.8 s wall (CLAUDE.md's "41" is stale); `gen-loc-summary --check`,
   `gen-system-graph --check`, `regen-expected --check` → all ✓ no drift. In a fresh worktree group 41 reds until
   `tooling/icons/node_modules` exists → the preview's install refusal and the journey's symlinks.
4. **`gen-loc-summary` reads the index** (`:42-46`) → ratify's run would count nothing it wrote. Put to the owner; D2.
5. **Resolved every citation** listed under CONTEXT REFERENCES at `3b5a6c7`; the three research agents' line numbers
   were spot-checked (canvas-ops :56-85, :187-199, :463-478, :701-707; build-checks :11246-11289, :11650-11658,
   :16201, :16672-16686, :5133-5160; server :444-452, :569-590; import-run :160-330; canvas-store :110-138).
6. **Landed-claim checks**: `proposal.ratify` absent from `OPS` (observed); no ratify route/UI/module exists (`git grep -i ratif`
   — comments and fixtures only); no `.claude/plans/*ratify*`; no committed `proposals/` dir anywhere; `#315` open with
   no open PR (op lock free).
7. **Traps carried as GOTCHAs**: loc tracked-only; approach ×3 not ×2; VR from a clean `/Users` worktree + `rm` to force;
   stale serve; port-scoped kill; gate prose three copies (Task 1.6, 49.9's "eight"); CodeQL leg 2; drift-check
   syntax-checks `.mjs`; icons `node_modules` symlink not ignored.

### Why not the alternatives

- **Owner-typed JS templates** — a request body would become code in a module every shipped page loads through the
  renderer; CodeQL would flag the write, and the honesty/token contract would rest on the owner's JS. Rejected by the owner.
- **Admit as a named composition of existing parts** — that is compose-and-name (#315), not admission; and spike C's
  composition is null anyway.
- **Import the generators in-process** — one fewer spawn each, but the ESM cache makes the vocabulary step validate
  against the stale registry. Rejected (D4).
- **Stage the writes so gen-loc sees them** — touches git state G6 says ratify stops short of. Rejected by the owner (D2).
- **Ratify inside canvas-journey** — its closing claim is that nothing under `system/` changed, and its portal is the
  main tree's; a separate driver with its own scratch tree keeps both statements true.

### Sequencing risk

Task 1.3 reds build-checks until 4.1 lands — do them in one sitting. Tasks 1.5–1.7 are format/anchor-only and must
leave build-checks green on their own; if any reds, the anchor change altered behaviour.

## AMENDMENTS

- 2026-09-30 — hardened before implementation, on the owner's ask to address every risk. Added D11 (the container
  write, found when the canvas refused the admitted part inside `stack`), D12 (clone, not worktree, found when a
  worktree probe leaked into `.git/info/exclude`), `token-lint` as chain step 9, the two-part clean guard (D5), the
  undo and cache evidence (D9, Task 3.2), Task 3.2's own module, Task 4.3 rebuilt from observed commands, the risk
  register, and NOTES 2c–2f. Every change traces to an observation recorded in NOTES.
- 2026-09-30 (implementation) — four plan errors found by running it, fixed, and logged here:
  1. **Chain step 10 would red on 40.8** whenever an admission's added lines cross a 100-line rounding boundary:
     build-checks 40.8 calls `genLocSummary({ check: true })`, which reads the INDEX, while step 8 wrote
     loc-summary.json from ratify's worktree bytes. Fix: build-checks accepts `--loc-worktree-files a,b` and 40.8
     passes it through; ratify appends the same list to step 10 that it appends to step 8. No flag → the index,
     exactly as before (#56 unchanged). The plan's D4 listed build-checks with no arguments.
  2. **Group 50's planning fixture cannot be named `person-row`.** 50.6/50.13/50.15 plan an admission over the REAL
     anchor files, so after any real admission of that name (the journey's clone does exactly this at step 10) the
     plan refuses and an unguarded read crashed the run. Fix: the fixture admits `probe-row` (asserted absent from
     the vocabulary), every expectation is relative to what is committed (the pin one past its value, sort
     positions from the neighbours), and the reads are guarded. The journey still admits `person-row` (R3–R11).
  3. **50.12 as planned (a +150-line palette.mjs edit, index read "no drift") is false inside ratify's own chain,**
     where palette.mjs is one of the listed files. Fix: 50.12 mutates `system/device-presets.mjs` (a loc-group file
     ratify never writes) on top of the same `--loc-worktree-files` list 40.8 reads.
  4. **`ratifySection(view, { api, showRefusal, reload })`**: canvas-import's `showRefusal` routes every action to
     the import panel (its fallback focuses the drop input), so the ratify module renders its own refusals and takes
     `{ api, reload, provenance, slug, base }`.
