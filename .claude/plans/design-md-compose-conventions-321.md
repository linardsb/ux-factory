# Feature: `system/DESIGN.md`, the compose agent's composition conventions (#321, B5)

The following plan should be complete, but validate documentation, codebase patterns and task sanity before you
start. Every mechanism in it has been **built and run once at $0 in throwaway worktrees** (NOTES § Pre-flight).
The working code is parked under `.claude/plans/design-md-321-probe/`, so most tasks are "port this probe file",
not "write from a description". Line numbers are `origin/main` @ `4b59c64`, before any edit.

## Feature Description

The compose agent (`portal/lib/canvas-session.mjs`) builds one mobile screen per turn from the generated
vocabulary (`handoff/verdant/vocabulary.json`). The vocabulary says which parts exist. Nothing says how this system
puts those parts together into a screen, so two runs of the same brief can lay the same screen out differently.
This ticket adds `system/DESIGN.md`. It is a committed conventions file, read into the compose agent's system prompt
per turn the way `vocabulary.json` is. It is written as **screen templates**: a named screen kind with its part
order. It also holds a few layout, state and copy rules. A build check keeps it from naming a part the vocabulary
lacks. Every compose turn records the version it read. Two paid dry re-runs of S6 measure whether the agent
follows the file and whether two runs of one brief converge.

## User Story

As the owner composing screens on the build canvas
I want the compose agent to pick from named screen templates in a committed conventions file
So that the same brief produces the same screen kinds and part order, and I change the conventions in one place.

## Problem Statement

S6's run 2 (`.claude/plans/canvas-spike-s6/raw/run-2/outline.txt`) produced four screens. All four open with a
`stack` column and a `screen-header`. Two of the four break the "one primary button, last" shape:
- f2 puts a `ghost-button` after the `primary-button`;
- f4 has no `primary-button`, and folds the scam-safety stop into a `modal-dialog`.

The vocabulary cannot state a layout convention, so nothing in the prompt asks for one. The owner opened #321 on
S6's B5 branch on 2026-10-03, in this plan's planning session, and gave no reason beyond choosing "Open it". This
plan records only the choice (Q1).

## Solution Statement

1. **The mechanism, in `canvas-session.mjs`:**
   - `parseDesign(text, vocab)` is pure. It reads the version, every backticked vocabulary reference and every
     `parts` block, and returns `problems[]`.
   - `readDesign()` throws on any problem.
   - `buildSystemPrompt` gets a required `design` argument, placed under `## Conventions` between the vocabulary and
     the PRD.
   - `runComposeTurn` reads the file once per turn, **before the turn's first line**, and writes `designVersion`
     and `designSha` on the stats line.
   - `ROLE`, `LOOP`, `ESCAPE` and `promptFingerprint()` do not change.
2. **The checks:** build-checks group 47 gains 47.20–47.24 plus one 47.14 source pin. This is not a new group, so
   "51 groups" moves nowhere.
3. **The content:** the owner's answer of 2026-10-03 was "you dictate, but drafted with an unbiased agent". A
   **tool-less SDK call** drafts the file from a pinned brief, with every input inline. Its init line proves it had
   no tools, and the script aborts if any tool appears. It never sees S6's outputs, the Faster Payment PRD or this
   session. The owner edits and approves the draft before any paid run.
4. **The measurement:** a sibling S6 driver (`driver-321.txt`) does five things:
   - it fixes PR #460 review F3;
   - it includes `DESIGN.md` through the shipped `buildSystemPrompt`;
   - it classifies each screen against the templates;
   - it re-outlines run 2 at $0;
   - it makes two paid dry runs (runs 3 and 4).
   The convergence table between runs 3 and 4 is the Stripe test.

## Out of Scope / Non-Goals

- **Not included: editing `.claude/plans/canvas-spike-s6/driver.txt`.** Build-checks 47.2 parses its `FORK_ASK`
  by regex (`tooling/build-checks.mjs:17406-17408`). Its line numbers are cited by `portal/lib/canvas-session.mjs:55-56`
  and `:102`, by the S6 README (`:415`) and by the #312 plan. `driver-321.txt` is a sibling, so S6's evidence
  driver stays as it ran.
- **Not changing:** `ROLE`, `LOOP`, `ESCAPE`, `TURN_ASK`, either tool description, `promptFingerprint()`,
  `MAX_TURNS`, the fence, the op grammar.
- **Not included: G19's dialog-as-state** (a state override that ADDS a part). The session still refuses it
  (`canvas-session.mjs:330-331`, observed). The brief tells the drafter that a state only sets or hides base parts.
- **Not included: #420's judge predicates.** `tooling/composition-judge.mjs` grades `scenarios/<slug>/`
  compositions under `PIV_COMPOSE_SYSTEM`, not canvas `screen.compose` ops. Follow-up ticket at PR time: "canvas
  compositions as a judge input + DESIGN.md templates as predicates". `parseDesign().templates` is the input that
  ticket needs.
- **Not included: a slop lint.** C4 has no gate here (observed). The voice is the owner's read at the gate.
- **Not included: committing the Stripe transcript.** `docs/research/no_zombie_UIs.txt` is untracked and absent
  from `origin/main` (observed). Citations point at the #321 comment of 2026-10-01 (Q3).
- **Not included: a briefed turn, a state turn, a new fork probe.** The re-runs repeat S6's four-turn plan exactly.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium. The code is small and already prototyped. The owner gate and two paid runs sit in
the middle.
**Primary Systems Affected**: `portal/lib/canvas-session.mjs`, `tooling/build-checks.mjs` group 47, `system/DESIGN.md` (new), `.claude/plans/canvas-spike-s6/`, `.claude/plans/design-md-321/`
**Dependencies**: none new.
- `npm ci` in `tooling/icons` (build-checks group 41) and `tooling/style-dictionary` (drift-check).
- `npm ci` in `portal` (preflight, drafter, paid runs, journey).
- `npm ci` in `tooling/visual-regression` (the journey's I12 needs `@playwright/test`).

## Related Work

**Implements**: #321 · **Epic**: #295, `docs/epics/canvas-design-import.architecture.md` (§ Stack ~96-99, § Open
questions ~350, Addendum row B5 ~395)

**Back-references**:
- `.claude/plans/canvas-spike-s6-compose-turn-308.md` + `.claude/plans/canvas-spike-s6/README.md`: S6, whose B5
  branch opens this, and whose driver is `driver-321.txt`'s base.
- `.claude/plans/canvas-compose-loop-312.md`: `canvas-session.mjs`'s invariants. A change to LOOP or ESCAPE
  re-opens S6.
- `.claude/code-reviews/pr-460-review.md` F3: the `firstChildHeading` split.
- `.claude/plans/design-md-321-probe/`: this plan's $0 prototypes (NOTES).

**Forward-references**:
- (to open at PR time) the #420 follow-up above.

---

## CONTEXT REFERENCES

### Relevant Codebase Files (read before implementing)

- `portal/lib/canvas-session.mjs`:
  - 1-40, the eight invariants. Invariant 1 means **no new import**; 47.1 pins the list at `build-checks.mjs:17389`.
  - 52-87, the prompt constants and their pins.
  - 98-126, `subscriptionEnv`, `vocabContext` and `buildSystemPrompt`.
  - 141-142, `promptFingerprint` (untouched).
  - 189, `statsLine`.
  - 450-549, `runComposeTurn`: transport load 481-488, `before` 490, `turnLine` 493, vocabulary read 496-498,
    `buildSystemPrompt` 508, stats 540-543.
- `tooling/build-checks.mjs` group 47, 17331-17928:
  - header and CANNOT REACH, 17331-17338;
  - helpers, 17339-17378;
  - 47.1, 17380;
  - 47.2/47.2b, 17405-17418;
  - 47.3, 17419-17430;
  - 47.7, 17476-17500 (the scratch-turn pattern);
  - 47.14, 17685-17701 (source pins);
  - 47.17's `deep(l).slice` at 17723 (see Task 1.3's GOTCHA);
  - 47.15, 17924-17926;
  - the `group("compose session", …)` string, 17928.
  - `:328` is the global `VOCAB`.
- `agent-layer/gen-loc-summary.mjs:25-29`: `GROUPS`, entries `{ id, label, test }`.
- `.claude/plans/canvas-spike-s6/driver.txt`: `driver-321.txt`'s base. Key lines:
  - 59 `PRD`; 64-87 context; 176-209 `outlineOf` (F3 at 199); 212-256 selftest; 267-306 preflight; 311-318 constants;
  - 337-492 `run()`: `systemPrompt` 348, fingerprint 349, `query` 410-430, stats object 443-450, verdict 479-488;
  - 494-496 dispatch.
- `.claude/plans/canvas-spike-s6/README.md`: the tables the new rows go in.
- `portal/lib/env.mjs:11-17`: importing it fills unset `process.env` keys from `portal/.env`.
- `system/canvas-ops.mjs:148` (`STATE_KEYS`) and `:376` (`case "state.add"`).
- `agent-layer/build.mjs:62-63`: a **different** `DESIGN.md`, the per-company constitution at a deploy's site root.
- `agent-layer/build-instance.mjs:458` copies `system/` wholesale, so the file rides into instances, unlinked and
  `noindex`. `agent-layer/gen-handoff.mjs:38-39,172` copies `specs/`, `wc/` and `figma-import.md` only, so the pack
  does not move.
- `.claude/references/gates.md:88`: group 47's entry, the third copy of its prose.
- `docs/epics/canvas-design-import.architecture.md:96-99, :350, :395`.

### Probe artefacts (port these; each was run, NOTES has the outputs)

- `.claude/plans/design-md-321-probe/parse.mjs.txt`: the reference `parseDesign` + `templateOf`, 100 lines.
- `.claude/plans/design-md-321-probe/session-checks.patch.txt`: the full `canvas-session.mjs` + `build-checks.mjs`
  diff that gave `build ✓  all 51 groups pass`, plus the fixture as `system/DESIGN.md`. **The fixture is synthetic.
  Never commit it as the conventions.**
- `.claude/plans/design-md-321-probe/driver-321.txt`: the finished sibling driver (`selftest ✓ 26/26`,
  `preflight ✓ 7/7`). `driver-321-vs-driver.diff.txt` is its diff against S6's driver.
- `.claude/plans/design-md-321-probe/draft.txt`: the tool-less drafter, with the brief embedded (`--dry` run).
- `.claude/plans/design-md-321-probe/fixture-design.md.txt`: the synthetic DESIGN.md used by every probe.
- `.claude/plans/design-md-321-probe/vocab-context-diff.mjs.txt` + `.out.txt`: the R2 receipt.
- `driver-stub.patch.txt`: the minimal session stub the driver probe used. It is superseded by
  `session-checks.patch.txt`, and kept for provenance.

### New Files to Create

- `system/DESIGN.md`: the conventions, drafted tool-less and then edited and approved by the owner.
- `.claude/plans/design-md-321/draft.txt`: the drafter script (from the probe).
- `.claude/plans/design-md-321/prompt-<n>.txt`, `draft-<n>.jsonl`, `draft-<n>.md`: the drafter's output,
  verbatim. Only `n = 1` unless a format re-run is needed (at most 3).
- `.claude/plans/canvas-spike-s6/driver-321.txt` (from the probe).
- `.claude/plans/canvas-spike-s6/raw/run-2/outline-321.txt`: run 2 re-outlined, $0, labelled derived.
- `.claude/plans/canvas-spike-s6/raw/vocab-context-321.txt`: the R2 receipt against the live tree.
- `.claude/plans/canvas-spike-s6/raw/run-3/`, `raw/run-4/`, `raw/converge-3-4.txt`.
- `.claude/reports/design-md-compose-conventions-321-report.md`.
- `.claude/plans/design-md-321-probe/`: already present. Commit it with the PR as the plan's evidence.

### Relevant Documentation

- PRD C3 (honesty, both directions), C4, C5: `docs/epics/canvas-design-import.prd.md:103-105`.
- Precedent (not quotation; Q3): the #321 comment of 2026-10-01.
- `.claude/references/gates.md` § group 47.

### Patterns to Follow

**Pure function returning `problems[]`, thrown at the boundary.** CLAUDE.md § Ground rules. `readDesign` throws
`canvas-session: system/DESIGN.md — <problem>; <problem>`.

**Read before the first append.** PR #485 F6's precedent (`canvas-session.mjs:481-482`): anything that can refuse
a turn runs before `turnLine`.

**A check RUNS the function on a mutated input, positive control first, and asserts the mutation applied.** 47.3 at
17419-17430.

**Driver and drafter output is never edited.** A bad run is recorded or re-run, never fixed (S6 README "Run 1").

---

## IMPLEMENTATION PLAN

### Phase 1: The mechanism (`canvas-session.mjs` + build-checks)

Port the probe patch. Prove the pure cases on the fixture in scratch. The full group runs green once Phase 2
commits the real file.

### Phase 2: The content (owner gate at the end)

**Depends on:** Phase 1 (`parseDesign` validates the draft).
The tool-less drafter writes `draft-1.md`, which is copied to `system/DESIGN.md` and checked. Then **STOP** for the
owner.

### Phase 3: The sibling driver and the free runs

**Depends on:** Phase 1. **Independent of:** Phase 2. Selftest and preflight need no `DESIGN.md`, because the
driver loads it lazily (proven with the file renamed away). Only `--reoutline` waits for the approved file.

### Phase 4: The paid runs and the README rows

**Depends on:** Phase 2's approval and Phase 3 green.

### Phase 5: Docs and records

---

## STEP-BY-STEP TASKS

**Setup.**
- Fresh worktree from `origin/main`, branch `feat/design-md-321` (memory `shared-worktree-parallel-sessions`).
- Then `for d in tooling/icons tooling/style-dictionary portal tooling/visual-regression; do (cd $d && npm ci); done`.
- `SCRATCH=<session scratchpad>`.

Without these installs:
- build-checks group 41 reds ("tooling/icons/node_modules/… is missing", observed on `4b59c64`; CI is green there);
- drift-check reds ("Style Dictionary build failed", observed by the probe);
- the journey's I12 reds.

### Task 1.1 PORT `parseDesign` and its constants into `portal/lib/canvas-session.mjs`

- **IMPLEMENT**: port `parse.mjs.txt` as exports placed after `sha16` (line 89), as the probe did:
  `REQUIRED_KINDS = Object.freeze(["list","detail","form","empty","error"])` and `parseDesign(text, vocab)`.
  Add `export const DESIGN_PATH = path.join(REPO_DIR, "system/DESIGN.md");` beside `VOCAB_PATH` (line 87).
  The rules, as the probe implements them, with each problem naming its token and 1-based line:
  1. **Version**: exactly one `^Version: ([1-9]\d*)$` line, else
     `Version: expected exactly one "Version: <n>" line, found <k>`. A `Version:` line inside a parts block also
     fails rule 4's line grammar, so it cannot slip through.
  2. **Fences**: a line walk. Only ```` ```parts ```` opens a block. Any other info string gives
     `line N: only ```parts fences are allowed (found ```<info>)`, and an unclosed fence gives
     `line N: a fence is never closed`. Fenced lines are blanked before rule 3 runs, so line numbers stay true.
  3. **Backticked references** outside fences match
     `REF_RE = /^([a-z][a-z0-9]*(?:-[a-z0-9]+)*)(?:\.([A-Za-z][A-Za-z0-9]*)(?:=([^\s=`]+))?)?$/`, else
     `line N: backticks hold vocabulary references only (found "<span>")`. Then:
     - unknown name gives `line N: unknown part "<name>"`;
     - unknown prop gives `line N: "<name>" has no prop "<prop>"`;
     - a value outside the enum (or not `true`/`false` for a boolean) gives `line N: "<name>.<prop>" does not take "<value>"`.
  4. **Templates**: each parts block must sit under `## Screen templates` › `### <kind>` (kind
     `/^[a-z][a-z0-9-]*$/`), with one block per kind.
     - Lines match `/^([a-z][a-z0-9]*(?:-[a-z0-9]+)*)([?+*])?$/` and name a vocabulary component.
     - Each line is stored as `{ name, mark }`: `?` zero or one, `+` one or more, `*` zero or more.
     - At least one line has mark `""` or `"+"`, else `line N: template "<kind>" has no non-optional part`, where
       N is the fence line.
     - Missing section: `templates: no "## Screen templates" section`. Missing required kind:
       `templates: missing "<kind>"`.
  5. **Turn mechanics**: `/screen_compose|state_add|NOT COVERED/` on any line gives
     `line N: the turn mechanics (tools, the escape phrase) belong to LOOP/ESCAPE, never DESIGN.md`.
- **PATTERN**: `parse.mjs.txt` verbatim, minus `templateOf`, which belongs to the driver.
- **IMPORTS**: none.
- **GOTCHA**: the `+`/`*` marks are required, not decoration. Without them, run 2's three-field form matched no
  template (pre-flight finding: four of four screens read `none`).
- **VALIDATE**: `cp .claude/plans/design-md-321-probe/fixture-design.md.txt "$SCRATCH/fx.md" && node --input-type=module -e "const fs=await import('node:fs');const S=await import('./portal/lib/canvas-session.mjs');const v=JSON.parse(fs.readFileSync('handoff/verdant/vocabulary.json','utf8'));const p=S.parseDesign(fs.readFileSync(process.env.SCRATCH+'/fx.md','utf8'),v);console.log(p.version,Object.keys(p.templates).join(','),p.refs.length,JSON.stringify(p.problems))"`
  Expected (observed on the prototype): `1 list,detail,form,empty,error 7 []`.
- **SATISFIES**: AC #2, AC #6.
- **REGENERATES**: none. `portal/` matches no loc group.

### Task 1.2 ADD `readDesign`, the `design` argument and the stats fields

- **IMPLEMENT** (as in `session-checks.patch.txt`):
  - `readDesign(file = DESIGN_PATH, vocab)` reads the bytes and parses them. On problems it throws
    `` `canvas-session: ${path.relative(REPO_DIR, file)} — ${problems.join("; ")}` ``. Otherwise it returns
    `{ text, version, sha: sha16(bytes) }`.
  - `buildSystemPrompt({ vocab, vocabSha, prd, design })`:
    - throws `canvas-session: buildSystemPrompt needs design (system/DESIGN.md's text) — the conventions are part of every compose prompt`
      when `design` is not a non-blank string;
    - returns `[ROLE, LOOP, ESCAPE, "", "## Vocabulary", "", vocabContext(vocab, vocabSha), "", "## Conventions", "", design, "", "## PRD", "", prd].join("\n")`.
  - `runComposeTurn`: move lines 496-498 (the vocabulary read) up to before `const before = …` (490), then add
    `const design = readDesign(DESIGN_PATH, vocab);`. Pass `design: design.text` at 508. Add
    `designVersion: design.version, designSha: design.sha` beside `vocabSha` at 542.
  - Header: add one sentence after the prompt paragraph (52-57). DESIGN.md (#321) sits between the vocabulary and
    the PRD; it is read per turn, before the first line, and refused whole on any problem; it stays out of
    `promptFingerprint()`; its version and sha ride the stats line.
- **GOTCHA**: `promptFingerprint()` stays byte-identical, because 47.2b pins `32e186e7fedd687d`.
- **VALIDATE**: `node --check portal/lib/canvas-session.mjs` (expected clean).
- **SATISFIES**: AC #2, AC #6.
- **REGENERATES**: none.

### Task 1.3 PORT the group 47 cases into `tooling/build-checks.mjs`

- **IMPLEMENT** (as in `session-checks.patch.txt`):
  - **47.3**: add `design: "D"` to both `buildSystemPrompt` calls (17428-17429).
  - **47.20, right after 47.3, not at the end:**
    - `D_TEXT`/`D` from `system/DESIGN.md`;
    - `ok(D.problems.length === 0 && REQUIRED_KINDS.every(k => D.templates[k]?.length) && Number.isInteger(D.version), "47.20: system/DESIGN.md has problems … or misses a required kind")`;
    - then `if (D.problems.length) throw new Error("47.20: system/DESIGN.md has problems … — every compose turn below reads it, so the group stops here")`.
  - **47.21** (end of the `if (S && F)` block): the eleven-row mutation table. The positive control comes first,
    and each row asserts `mutated !== D_TEXT` before asserting a problem includes its token. Rows and tokens:
    1. `action-bar` in prose → `action-bar`
    2. first parts block's `screen-header` → `hero-banner`
    3. `` `screen-header.colour` `` → `colour`
    4. `` `text.role=banner` `` → `banner`
    5. `` `one primary action` `` → `vocabulary references only`
    6. `NOT COVERED: x` → `LOOP/ESCAPE`
    7. Version line removed → `Version`
    8. a second `Version: 2` → `Version`
    9. `### error` → `### oops` → `"error"`
    10. a `js` fence → `fences`
    11. every first-block line marked `?`, with any existing mark stripped first → `non-optional`
  - **47.22**: the prompt carries `D_TEXT` whole, with `## Vocabulary` < `## Conventions` < the last `## PRD`, and
    `Version: <n>`. A missing `design` throws "needs design".
  - **47.23**: a fake turn (the 47.7 pattern, `pkgCopy("design23")`) writes a stats line with
    `designVersion === D.version` and `designSha === sha16(file bytes)`. `readDesign` on a scratch copy with
    `` `action-bar` `` throws, naming it.
  - **47.24**: `GROUPS.filter(g => g.test("system/DESIGN.md"))` is empty. The message lists `g.id` (GROUPS has
    `id`, not `name`). Positive control: `system/canvas-ops.mjs` matches.
  - **47.14 pin** (after the `/api/canvas/run` assertion):
    `sessCode.indexOf("readDesign(DESIGN_PATH") >= 0 && sessCode.indexOf("readDesign(DESIGN_PATH") < sessCode.indexOf("appendComposeLine(pkgRoot, turnLine(")`.
  - The group header's CANNOT REACH gains one line: whether a model follows the file (runs 3-4), a part named in
    unbackticked prose, and C4 voice. The `group()` string gains the matching clause.
- **GOTCHA (observed by the probe)**: `ok()` reports at group end. With a bad `DESIGN.md` and 47.20 at the end,
  47.17's message crashes first (`TypeError … reading 'slice'` at 17723), which kills the run before 47.20 speaks.
  Hence 47.20 goes early, with the throw.
- **GOTCHA**: 47.15 snapshots `git status` of `discovery portal/lib system handoff`. Write scratch files only under
  `scratch()`.
- **GOTCHA**: gate prose has three copies (memory `gate-prose-has-three-copies`). Task 5.2 does the third.
- **VALIDATE** (after Task 2.2 lands the file): `node tooling/build-checks.mjs 2>&1 | tail -2`. Expected
  `build ✓  all 51 groups pass` (observed on the prototype with the fixture). Before Phase 2, use the fixture in
  scratch only: copy it to `system/DESIGN.md`, run, then delete it. Never commit the fixture.
- **REDDENS** (each observed on the prototype, then reverted):
  - 47.20: `action-bar` in the file → `Error: 47.20: system/DESIGN.md has problems ["line 5: unknown part \"action-bar\""] — every compose turn below reads it, so the group stops here`
  - 47.21 row 2: drop the template-line vocabulary check → `47.21 unknown part in a template: no problem names "hero-banner" ([])`
  - 47.21 control: make row 9's search string absent (`### erorr`) → `47.21 required kind missing: mutation did not apply`
  - 47.22: drop the Conventions block → `47.22: the system prompt does not carry DESIGN.md between the vocabulary and the PRD, with its version`
  - 47.23: drop `designSha: design.sha` → `47.23: the stats line carries designVersion 1 and designSha undefined, not the committed file's 1 / 88a7afcf121f365b`
  - 47.14: move `readDesign` below `turnLine` → `47.14: runComposeTurn reads DESIGN.md after the turn's first appended line …`
  - 47.24: add `|md` to the runtime regex → `47.24: system/DESIGN.md matches loc-summary group(s) ["runtime"] …`. It also reds
    import-chain and ratify 50.12 (both read loc-summary), so do this in scratch only and revert.
- **SATISFIES**: AC #2.
- **REGENERATES**: none. The count stays 51.

### Task 2.1 Draft with the tool-less drafter

- **IMPLEMENT**:
  1. `cp .claude/plans/design-md-321-probe/draft.txt .claude/plans/design-md-321/draft.txt`.
  2. `cp .claude/plans/design-md-321/draft.txt "$SCRATCH/draft.mjs"`.
  3. `node "$SCRATCH/draft.mjs" --repo "$PWD" --dry --out .claude/plans/design-md-321`. Expected, observed on the
     probe:
     - `brief 3949 chars`, `model claude-sonnet-5`;
     - input 1 at 63178 chars, sha16 `59380758647765a7`, which must equal the vocabulary's;
     - input 2 at 2917 chars; input 3 at 615 chars;
     - user prompt about 70995 chars.
     If the brief text moved, the counts move with it.
  4. Read `prompt-1.txt` once. It must hold only the brief and the three inputs.
  5. `node "$SCRATCH/draft.mjs" --repo "$PWD" --draft 1 --out .claude/plans/design-md-321`. One paid call.
  6. Validate `draft-1.md` with the Task 1.1 VALIDATE command, pointed at it.
- **The brief** is the `BRIEF` constant in `draft.txt`, reviewed in this plan's pre-flight. It covers inline inputs,
  the `? + *` marks, no backticks on paths or phrases, and provenance "drafted by an agent from the inputs listed in
  its drafting brief". It never claims the owner's approval.
- **Isolation is verified, not stated.** The call runs with `tools: []`, `allowedTools: []`, `mcpServers: {}`,
  `strictMcpConfig: true`, `settingSources: []`, a deny-all `canUseTool` and an empty temp cwd. The script aborts
  before the model answers if the init message lists any tool or MCP server. The init line, with its tools list,
  is the first transcript line.
- **Format failures**: run `--draft 2 --fix .claude/plans/design-md-321/draft-1.md`, which embeds the previous
  draft and its problems, because a fresh call has no memory. Make at most three drafts, and never edit one. If
  draft 3 still fails, stop and show the owner.
- **VALIDATE**: `head -1 .claude/plans/design-md-321/draft-1.jsonl | jq '.tools, .mcpServers'`. Expected `[]` and
  `[]`, or the init refusal fires first. Then the Task 1.1 command on `draft-1.md`, expecting `[]` problems.
- **SATISFIES**: the owner's instruction; prerequisite for AC #3-#4.
- **REGENERATES**: none.

### Task 2.2 CREATE `system/DESIGN.md`, then STOP for the owner

- **IMPLEMENT**:
  - `cp draft-<last>.md system/DESIGN.md`, then run build-checks (expected green).
  - **Stop.** Ask the owner to edit the file in place and say "approved". Suggest no content.
  - After approval, add one plain-text provenance line under the header paragraph, with no backticks (rule 3).
    Write "Edited and approved by the owner on <date>; the agent's draft is
    .claude/plans/design-md-321/draft-<n>.md." or "Approved without edits by the owner on <date> …", whichever
    happened.
  - Commit `system/DESIGN.md`, so its sha is fixed before the paid runs.
- **GOTCHA**: honesty both ways (memory `honesty-contract-mirror-direction`). Never write the owner's reasons or
  edits.
- **VALIDATE**:
  - `node tooling/build-checks.mjs 2>&1 | tail -2` → `build ✓  all 51 groups pass`;
  - `node tooling/drift-check.mjs` → no drift;
  - `git diff --no-index .claude/plans/design-md-321/draft-<n>.md system/DESIGN.md` shows the owner's edits.
- **SATISFIES**: AC #2, the owner gate.
- **REGENERATES**: none (47.24; the pack copies only specs, wc and figma-import.md).

### Task 3.1 CREATE `.claude/plans/canvas-spike-s6/driver-321.txt` from the probe

- **IMPLEMENT**: `cp .claude/plans/design-md-321-probe/driver-321.txt .claude/plans/canvas-spike-s6/driver-321.txt`.
  Its diff against S6's driver is `driver-321-vs-driver.diff.txt`. The behaviour it carries, for the reviewer:
  - **`DESIGN.md`** goes through `S.buildSystemPrompt` and is **loaded lazily**, only in `run()` and
    `--reoutline`.
  - **`env: S.subscriptionEnv()`** is set on `query`, because importing the session loads `portal/.env`
    (`env.mjs:11-17`).
  - **No `--contract`/`--stop-hook`.** The fingerprint is `sha([ROLE, LOOP, ESCAPE, TURN_ASK, FORK_ASK])` =
    `c903170484396973`.
  - **F3 split.** `opensWithHeader` (`screen-header` first) and `firstChildHeading` (`text{role:"heading"}` first)
    are separate flags. The B5 line also prints `kind` and `skeleton`.
  - **`templateOf(c, templates)`** builds `(?:name,)<mark>`. It returns `none (root)` for a non-column root, `none`
    when no template matches, and `ambiguous (a, b)` when several do. `outlineOf(frames, templates)` takes the
    templates (the add-payee selftest passes `{}`).
  - **Stats and verdict** carry `designVersion`, `designSha` and `auth: 'subscription'`.
  - **`--reoutline <runDir>`** skips a missing `fork.jsonl`. It writes `outline-321.txt` headed `# DERIVED at $0 …`.
  - **`--converge <A> <B>`** needs `--repo`. It refuses unequal turn counts and refuses any turn where
    `filed !== 1` (checked per turn). It prints one row per turn, `screenId · kind · skeleton · same screen ·
    match`, and the footer `converged: k/n · mismatched: <turns>`. It writes `converge-<a>-<b>.txt` into
    `dirname(A)`, which is `raw/`.
  - **The selftest** has 26 rows: 17 inherited (`outline-add-payee` now expects `y/n/y/y/none`), plus 8 new, plus
    `converge-unsafe`.
- **GOTCHA**: the driver's `ESCAPE_RE` is `/^[^\w\n]*NOT COVERED:/m` (S6's own). The session's is
  `/^[^A-Za-z\n]*NOT COVERED:/m`. The driver keeps S6's regex so the rows compare. Note it in the README Setup.
- **GOTCHA**: never touch `driver.txt` (47.2 reads it).
- **VALIDATE**: `cp .claude/plans/canvas-spike-s6/driver-321.txt "$SCRATCH/s321.mjs" && node "$SCRATCH/s321.mjs" --repo "$PWD" --selftest | tail -1`
  Expected `selftest ✓ 26/26` (observed).
- **REDDENS** (observed on the probe):
  - restore `|| first.name === 'screen-header'` on `firstChildHeading` → reds `opens-with-header`;
  - drop the per-turn `filed === 1` guard → reds `converge-unsafe`;
  - turn the optional mark into required → reds `template-required` (`got none`) and `template-ambiguous`.
- **SATISFIES**: AC #5, and the instrument for AC #3-#4.
- **REGENERATES**: none.

### Task 3.2 Free runs: preflight, the R2 receipt, and run 2 re-outlined

- **IMPLEMENT**:
  - `node "$SCRATCH/s321.mjs" --repo "$PWD" --preflight` (expected `preflight ✓ 7/7`, observed).
  - R2 receipt against the live tree:
    `cp .claude/plans/design-md-321-probe/vocab-context-diff.mjs.txt "$SCRATCH/vc.mjs" && node "$SCRATCH/vc.mjs" 4d9adf6 HEAD | tee .claude/plans/canvas-spike-s6/raw/vocab-context-321.txt`.
    Expected, as observed against `4b59c64`:
    `old a2bfea9494d879de 5549 chars · new 59380758647765a7 5549 chars · lines 168/168 · differing lines [1]`.
    If `vocabulary.json` moved again since `4b59c64`, the line list says what changed. More lines than `[1]` is a
    third variable, and the README states it.
  - After Task 2.2:
    `node "$SCRATCH/s321.mjs" --repo "$PWD" --reoutline .claude/plans/canvas-spike-s6/raw/run-2`.
- **VALIDATE**: `grep -c "B5:" .claude/plans/canvas-spike-s6/raw/run-2/outline-321.txt` → `4`. Every frame reads
  `opens with screen-header y · first child heading n`. That was observed against the fixture, with kinds form,
  detail, form, none. Under the approved file the kinds may differ, and the README records what it says.
- **SATISFIES**: AC #3's baseline row, AC #5, R2.
- **REGENERATES**: none.

### Task 4.1 PAID: runs 3 and 4

- **Preconditions**:
  - the owner has approved and `system/DESIGN.md` is committed (`git status --porcelain system/DESIGN.md` is empty);
  - selftest and preflight are green;
  - the subscription login works:
    `env $(env | grep -o '^ANTHROPIC_[A-Z_]*' | sed 's/^/-u /') claude -p "ok" --max-turns 1` answers. It is the
    driver's env rule (no `ANTHROPIC_*`), so it proves the same login the runs will use (memory
    `env-empty-var-does-not-blank-key`).
- **IMPLEMENT**:
  ```
  set -o pipefail
  R=.claude/plans/canvas-spike-s6/raw; mkdir -p $R/run-3 $R/run-4
  node "$SCRATCH/s321.mjs" --repo "$PWD" --run 3 --out $R/run-3 --budget 1.30 | tee $R/run-3/stdout.txt
  node "$SCRATCH/s321.mjs" --repo "$PWD" --run 4 --out $R/run-4 --budget 1.30 | tee $R/run-4/stdout.txt
  node "$SCRATCH/s321.mjs" --repo "$PWD" --converge $R/run-3 $R/run-4
  ```
  - `mkdir` comes first because `tee` opens its file before the driver's `mkdirSync`. The driver's "already holds
    a run" check looks for `.jsonl` only, so a dir holding just `stdout.txt` passes.
  - `--budget 1.30` caps every `raw/run-*` stats line. Runs 1 and 2 already count $0.2808, which leaves about
    $1.02 for the pair (derived).
- **STOP RULES (pinned)**:
  - **Run 3 is not `clean`.** Record it, and ask the owner before run 4 or before merging the include (R1).
  - **A mechanical failure** (auth, crash, credit; `failed` with a `why` naming it, costing about $0): one re-run
    under the next number.
  - **Runs 3 and 4 disagree.** That is a finding against `DESIGN.md`, recorded. **No third run.**
- **VALIDATE**: `jq '.verdict, .designVersion, .designSha, .auth, .totals.costUsd, [.b5[].kind]' $R/run-3/verdict.json`
  Expected `"clean"`, the approved version, its sha, `"subscription"`, about $0.28-$0.40, and four kinds.
- **SATISFIES**: AC #3, AC #4.
- **REGENERATES**: none.

### Task 4.2 UPDATE `.claude/plans/canvas-spike-s6/README.md`

- **IMPLEMENT** (append only; run 2's cells stay):
  - **Verdicts**: add **Q6, "#321 B5 re-run with `system/DESIGN.md` v<n> (sha <x>)"**. It gives:
    - runs 3-4's verdicts, with Q1 re-checked;
    - the kind per screen;
    - the split proxies;
    - Verdant-locked use;
    - the evidence paths.
  - **Q4**: add one sentence on run 2 re-outlined (`raw/run-2/outline-321.txt`, $0): kinds, and opens-with-header
    4/4.
  - **Per turn**: rows for runs 3-4, copied from the stats lines.
  - **Setup**, for runs 3-4:
    - the design version and sha;
    - the vocabulary sha, with the context-identical-except-line-1 receipt;
    - system prompt chars;
    - auth `subscription`;
    - the fingerprint still `c903170484396973`, and why;
    - the `ESCAPE_RE` note.
  - **New section "Convergence (#321 AC #4)"**: paste `raw/converge-3-4.txt`, then the verdict line. Each mismatch
    is a finding against DESIGN.md, with no re-run.
  - **Not done**: replace the B5 bullet with "the owner opened #321 on 2026-10-03 (no reason recorded)". Add that
    the re-runs used S6's prompt surface (`maxTurns` 10, S6's tool description and fork ask), not the shipped one.
  - **Files**: list the new files.
- **GOTCHA**: every number is copied from a raw file and names it (the README's line 9 rule).
- **VALIDATE**: `grep -c "run-3\|run-4" .claude/plans/canvas-spike-s6/README.md` → at least 6. Check each copied
  cell against `jq`.
- **SATISFIES**: AC #3, AC #4.
- **REGENERATES**: none.

### Task 5.1 UPDATE the architecture doc and `CLAUDE.md`

- **IMPLEMENT**:
  - **§ Stack (~96-99)**: replace "A committed `DESIGN.md` and the Blueprint projection (T12) are wave 3." with:
    "A committed `system/DESIGN.md` (T13's conventions: screen templates plus layout, state and copy rules) was
    pulled forward by S6's B5 branch, opened by the owner on 2026-10-03 (#321). It is read into the compose prompt
    per turn, refused whole if it names a part `vocabulary.json` lacks, and versioned on the stats line. Precedent
    (not quotation; source unconfirmed): the Stripe talk summarised on #321, 2026-10-01. The Blueprint projection
    (T12) stays wave 3."
  - **~350**: "T12's Blueprint projection: wave 3, with S4. (T13's `DESIGN.md` was pulled forward, #321.)"
  - **~395, row B5**: append "Opened 2026-10-03; landed in #321's PR."
  - **CLAUDE.md** map, under `system/`: `  DESIGN.md                   the compose agent's composition conventions — screen templates, read per turn (≠ a deploy's site-root DESIGN.md)`.
- **VALIDATE**: `grep -n "system/DESIGN.md" docs/epics/canvas-design-import.architecture.md CLAUDE.md` → 2 or more.
- **REGENERATES**: none.

### Task 5.2 UPDATE `.claude/references/gates.md` group 47 entry

- **IMPLEMENT**: append the group-string clause and the CANNOT REACH line from Task 1.3 to line 88's paragraph.
- **VALIDATE**: `grep -n "DESIGN.md" .claude/references/gates.md` → 1 or more, inside group 47's paragraph.
- **REGENERATES**: none.

### Task 5.3 Records

- **IMPLEMENT**:
  - The report.
  - Comments on #321 and #295 with the Q6 numbers and the convergence line, numbers only. Say "opened by the owner,
    2026-10-03", with no reason.
  - The #420 follow-up ticket.
  - PR body with `Closes #321`. The plan, brief, probe dir, report and review all go in the PR.
- **SATISFIES**: AC #1, the PR rules.
- **REGENERATES**: none.

---

## TESTING STRATEGY

There is no suite here (CLAUDE.md § Testing). The proof is in three layers:
- group 47 proves the mechanism (eleven mutations plus five cases, each with an observed red);
- the driver's selftest and preflight prove the instrument (26 + 7);
- two paid runs observe the model.

### Edge cases (each handled in the probe code)

- A file with zero templates gets five "missing" problems, so it cannot pass vacuously.
- Repetition: three `text-field`s match `text-field*` or `text-field+`.
- `NOT COVERED:` in backticks is refused twice (rules 3 and 5).
- An unclosed fence is refused.
- A `Version:` line inside a parts block fails the line grammar.
- Plain-prose part names are invisible. This is stated as CANNOT REACH, and the owner's read covers it.
- The vocabulary dropping a templated part: 47.20 reds in CI, and every compose turn refuses until the file is
  fixed (fail closed).
- A broken file writes no turn line (the 47.14 pin).

### Proving the checks

Every REDDENS above was applied and observed red on the prototype in this plan's pre-flight. The implementer
re-runs each one once and records "went red with <message>" in the report.

---

## VALIDATION COMMANDS

### Level 1: Syntax and CI verify
- `node --check portal/lib/canvas-session.mjs && node --check tooling/build-checks.mjs`
- `node tooling/drift-check.mjs` (needs the `tooling/style-dictionary` install; observed passing on the prototype)
- `node tooling/token-lint.mjs`

### Level 2: The gate
- `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass` (observed on the prototype)

### Level 3: Instrument and integration
- `node "$SCRATCH/s321.mjs" --repo "$PWD" --selftest` → `26/26`; `--preflight` → `7/7` (observed)
- `node tooling/canvas-journey.mjs chromium`. The prototype got 256 passed and 3 failed, all I12, all
  "no @playwright/test under tooling/visual-regression/node_modules". The Setup install clears it, so expect all
  green. Use `PORT`/`BASE` overrides if a sibling session holds the port (memory `stale-serve-wrong-tree`).

### Level 4: Manual
- Portal smoke on an OS-assigned port, `curl /api/health`, then kill only `$!` (memory `portal-smoke-port-scoped-kill`).
- Run 3's `system prompt <n> chars` = 44,203 + the DESIGN.md length (in chars) + 18. Derived from the probe:
  45,292 − 44,203 − 1,071 = 18, which is the `## Conventions` heading plus its separators. The vocabulary sha in
  line 1 has the same length either way.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Tool-less draft (Task 2.1), up to 3 calls | ~$0.08 per call, derived: about 18k input tokens (71k chars ÷ 4) + about 2k output, uncached, on the subscription | yes | n/a |
| Owner edits and approves `system/DESIGN.md` (Task 2.2) | owner's hand | **yes**. No paid run and no merge before it | n/a |
| Run 3, the dry re-run with the file | ~$0.28-$0.40 (derived from run 2's $0.28076, observed, plus a larger cache write) | **yes** (AC #3) | open a ticket before the PR |
| Run 4, the convergence twin | ~$0.28-$0.40 | **yes** (AC #4) | open a ticket before the PR |
| Confirm the Stripe talk's source | owner's hand | no. Cited as precedent | stays open on #321 |
| A recorded reason for "Open it" | owner's hand | no | Q1 |

Total expected spend: $0.64-$1.04, capped at $1.02 for the runs by `--budget 1.30`.

---

## ACCEPTANCE CRITERIA

- [ ] #321 AC #1: opened only on S6's branch. The owner's "Open it" (2026-10-03) is recorded in the S6 README, on
      #321 and on #295, with no invented reason.
- [ ] #321 AC #2: 47.20-47.24 and the 47.14 pin are green. Every component name in `DESIGN.md` exists in
      `vocabulary.json`. The prompt includes the file and its version. Each check reds under its named mutation.
- [ ] #321 AC #3: run 3 with the file is recorded in the S6 README as a second row, beside run 2 re-outlined.
- [ ] #321 AC #4: runs 3 and 4's skeletons are side by side, paired by turn, with `converged: k/4`. Mismatches are
      findings, with no third run.
- [ ] #321 AC #5: F3 is split in `driver-321.txt`, proven by `opens-with-header`.
- [ ] The version and sha are on every compose stats line (47.23) and on runs 3-4.
- [ ] The file is not counted by `loc-summary` (47.24).
- [ ] 47.2 and 47.2b are green (prompt constants and fingerprint unchanged).
- [ ] CI verify is green, and the CodeQL gate is green.

---

## COMPLETION CHECKLIST

- [ ] Tasks done in order, with the owner gate respected before Task 4.1
- [ ] Every REDDENS re-run once and recorded
- [ ] Level 1-4 run, outputs in the report
- [ ] README cells copied from raw files
- [ ] Gate prose updated in all three places
- [ ] `Closes #321` in the PR body

---

## RISKS (each addressed)

| Risk | What could go wrong | How the plan handles it | Residual |
|---|---|---|---|
| **R1** the include changes the prompt S6's branch 1 was observed under | the agent runs ahead or files nothing with the conventions present | Run 3 is that observation. The stop rule pauses before run 4 and before merge if it is not `clean`. The include ships only after a `clean` run 3 or an owner decision. The ACs ask for the outcome to be **recorded**, so a finding still completes the ticket | none for the implementer. A non-clean run is a finding, and the owner decides |
| **R2** two variables differ from run 2 | the vocabulary sha moved, and that, not the file, explains a difference | Receipt: the real `vocabContext` at both commits differs in **line 1 only** (the sha), 168/168 lines, 5,549 chars each (observed). Task 3.2 re-takes it against the live tree and commits it. The PRD is unchanged since 2026-09-14 (observed) | none: the agent-facing text differs by 16 chars of hash |
| **R3** the drafter is not really isolated | it reads S6 outputs and fits the test | A tool-less SDK call with inputs inline. The init line records `tools: []`, and the script aborts before the model answers if any tool or MCP server appears. The exact prompt is committed as `prompt-1.txt` | none: what it saw is a committed file |
| **R4** cost or auth surprises | API billing, the spend-limit 400, a credit error disguised as success | Subscription env (every `ANTHROPIC_*` stripped). A `claude -p` check before spending. A hard cap of `--budget 1.30`. `classifyRun` treats `isError` as `failed` (memory `sdk-error-result-wears-success`), and one mechanical re-run is allowed | at most about $1.02 + $0.24, capped |
| **R5** the implementer misreads the plan | a literal is wrong at run time | Every mechanism already ran: the session plus checks (`51 groups ✓`, 7 REDDENS observed), the driver (`26/26`, `7/7`, re-outline, converge ×3, lazy load), the drafter (`--dry`). Port the probe files, don't rewrite them | the owner's content may break a fixture assumption. The parser reports it by line, and the drafter's `--fix` loop absorbs it |

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1: B5's reason.** The owner chose "Open it". The option's explanation was this session's wording, so records
  say "opened by the owner, 2026-10-03" only.
- **Q2: "2. but needs to be drafted with unbiased agent".** Read as: the owner decides the content; a tool-less
  agent with no access to S6's outputs drafts; the owner edits and approves. If the owner meant "ship the draft
  without my edit", Task 2.2's gate becomes approve-only, and nothing else changes.
- **Q3: the Stripe citation** stays precedent-only until the source is confirmed. Committing the transcript is not
  this ticket's call.
- **Assumptions**: the fork turn stays, because `classifyRun` needs four turns and the rows must compare. Kind comes
  from the matcher only, because asking the agent to name it would change the `why` format LOOP and D4 define. The
  subscription bills runs 3-4, and billing does not change the model's input.

## NOTES (open canvas)

### Pre-flight, round 1 (planning session, against `origin/main` @ `4b59c64`)

| Ran | Observed | Changed in the plan |
|---|---|---|
| `node tooling/build-checks.mjs` | 50/51, `icons` red on a missing `tooling/icons/node_modules`. `compose session ✓`. CI verify `success` on `4b59c64` | Setup installs |
| S6 `driver.txt --selftest` | `selftest ✓ 17/17`, context 5,549 chars | the base count for driver-321 |
| loc `GROUPS` vs `system/DESIGN.md` | `[]` | 47.24 is real, with a positive control |
| vocab sha | `59380758647765a7` vs S6's `a2bfea9494d879de` | R2 |
| `prd.md` history | last change 2026-09-14, before S6 | no third variable |
| owner's add-payee, line 1 | opens with `text{role:"heading"}` | `outline-add-payee` expects `y/n/y/y/none` |
| citations into `driver.txt` | session `:55-56,102`, README `:415`, #312 plan, 47.2's regex | sibling driver |
| `env.mjs:11-17` | fills unset keys from `portal/.env` | `subscriptionEnv()` in the driver |
| `canvas-session.mjs:330-331` | `override.add` refused (G19) | the brief's state sentence is true |

### Pre-flight, round 2 (prototypes in throwaway worktrees, $0, two parallel scouts)

| Prototype | Observed | Changed in the plan |
|---|---|---|
| `parse.mjs` on the fixture + 11 mutations | control `[]`. 11/11 mutations each refused by name | rule messages pinned verbatim |
| `templateOf` on run 2 (first grammar, `?` only) | **4/4 `none`**: three `text-field`s cannot match one line | **added `+` and `*`**, then: form, detail, form, none |
| all-`*` template | refused `no non-optional part` | "non-optional" = mark `""` or `"+"` |
| session + build-checks patch | `build ✓  all 51 groups pass`. drift-check passes after the style-dictionary install | 47.20 moved early with a throw (47.17's message crashes first, at 17723). 47.24 uses `g.id`. Control example fixed to `### erorr`. The 47.14 pin asserts `>= 0` |
| 7 REDDENS | each red with the message quoted in Task 1.3. 47.24's also reds import-chain and ratify 50.12 | the "scratch only" warning |
| `canvas-journey chromium` | 256 passed, 3 failed (I12: no `@playwright/test`) | `tooling/visual-regression` in Setup |
| driver-321 | `selftest ✓ 26/26`, `preflight ✓ 7/7`. Re-outline: 4 frames, opens-with-header y ×4. Converge: 4/4, 3/4 naming turn-2, and the unsafe pair refused. Lazy load proven with the file renamed away. Prompt 45,292 = 44,203 + 1,071 fixture + 18 | Task 3.1 is now "copy the probe". Stats line is 443, not 449. `outlineOf` takes templates. Converge needs `--repo` and refuses unequal counts |
| tool-less drafter `--dry` | brief 3,949 chars. Input sha16 `59380758647765a7` equals the vocabulary's. Prompt 70,995 chars. `--fix` embeds the previous draft | Task 2.1 replaces the general-purpose Agent. Isolation is verified by the init line |
| `vocab-context-diff` | 168/168 lines, only `[1]` differs | R2 closed with a receipt |

### Rejected alternatives

- **A new group 52.** It moves "51 groups" in three places for no extra power.
- **A separate `system/design-conventions.mjs`.** One parser with two consumers; `canvas-session.mjs` owns the prompt.
- **Matching kebab words in free prose.** It cannot tell a prop from a part, which is the check-that-cannot-fail
  class. The three-form grammar plus `parts` fences gives each span one meaning.
- **`DESIGN.md` inside `promptFingerprint()`.** Every content edit would break 47.2b, and it would mix turn
  mechanics with conventions.
- **A general-purpose Agent as drafter.** Its isolation was instruction-only (round-2 finding). Replaced.
- **The convergence test on `canvas-journey --live-compose`.** It costs more ($0.48 for four turns), it writes
  verdicts by script rule, and AC #3 names an S6 re-run.

### Confidence: 10/10 for one-pass implementation

Every task that writes code now ports a file that was built and run once at $0 against the real tree, with outputs
recorded above. Every command's expected output was observed, not assumed. What remains outside the implementer's
control is three things:
- the model's behaviour, which the ACs record rather than require;
- the owner's edit, which has a gate;
- the spend, which has a cap and stop rules.

None of them can force an unplanned change to the code.

## AMENDMENTS

- 2026-10-03: v2, before execution. The owner asked for confidence 10 with every risk addressed. Changes:
  - prototyped everything at $0, with two parallel scouts;
  - added the `+`/`*` marks after the matcher read run 2 as 4/4 `none`;
  - replaced the general-purpose drafter with a tool-less SDK call whose isolation is checked;
  - moved 47.20 early with a throw;
  - added the R2 receipt;
  - corrected the line refs (stats at 443), 47.24's `g.id`, and the control example;
  - added the style-dictionary and visual-regression installs;
  - added the RISKS table.
- 2026-10-03: execution (base `4b59c64`), plan errors found and corrected in the report rather than the code:
  - Task 2.1 step 4 reads `prompt-1.txt` before the paid call, but `--dry` writes `prompt.txt`; `prompt-<n>.txt` is
    written only by `--draft <n>`. The dry and paid prompts were asserted equal (sha16 `bc4ffb4cffc4245a` both) and
    `prompt.txt` deleted.
  - Task 2.1 VALIDATE `head -1 draft-1.jsonl | jq '.tools, .mcpServers'` reads the `k:"prompt"` line, which the
    drafter writes before `query`, so it prints `null null`. The init line is line 2. Use
    `jq -c 'select(.k=="init") | {tools, mcpServers, skills}' draft-1.jsonl`.
  - Paid steps table: the drafter cost $0.5713 (observed), not ~$0.08. 24,244 Sonnet output tokens (thinking) cost
    $0.4510; the CLI's own side calls on Haiku 4.5 ($0.0142) and Opus 4.5 ($0.1061) make up the rest.
  - Task 5.1 VALIDATE: the CLAUDE.md map line sits under `system/` without the prefix, like every map line, so
    `grep -n "system/DESIGN.md" … CLAUDE.md` finds the architecture doc only (1, not 2 or more).
