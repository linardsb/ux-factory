# Feature: The graded answer fixture — 195 sealed answers, scored on both postures (#348)

The following plan should be complete, but it is important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

**This ticket spends real money and its central claim is a control, not a mechanism.** Two things void the
whole reading if they slip: the answer author seeing `weakAnswer`, and the recorded answers not being the
sealed ones. Both have a task and a gate below. Read §THE CONTROL before Phase B.

## Feature Description

Every discovery run recorded so far is self-play: an agent wrote the answers and the same model family
judged them. The judge recording a decision on nearly every turn says the pipeline moves, not that the
judge can tell a good answer from a thin one.

This ticket builds the fixture that measures it. For each of the bank's 65 questions, three answers are
authored **blind to that question's weak-answer note**: one that carries the form (K1), one that is thin
(K2), one that says "don't know yet" (K3). The answer → expected closing op key is committed **before any
run**. Six real runs then take those answers through the drawer's own server route at `whole-bank` depth,
three on `think` (claude-sonnet-5) and three on `think-opus` (claude-opus-5), and a pure scorer diffs each
turn's closing op against the key.

The number is the reading. No target is set, and a prompt tightening on the back of it is a new PR and a
re-run, never an edit.

## User Story

As the owner of a discovery platform whose whole claim is that its agent judges form
I want 195 answers authored blind to the rubric, scored against a sealed key on both postures
So that MVP 6 stops being a prompt string I trust and becomes a number I can publish and argue with.

## Problem Statement

`docs/epics/discovery-partner.prd.md` MVP 6 says the agent judges the FORM of an answer, never its
substance — it may say an answer names no number, no user and no alternative, and it may not say the answer
is wrong or supply what is missing. Everything downstream rests on that: the PRD projection, the evidence
ledger, the honesty contract.

It has never been scored. `discovery/allergen-matrix-1/` filed 30 `record_decision` ops in 30 turns; the
uncommitted `my-product-name` run did the same. Both prove the transport, the applier, the projection and
the fingerprint tripwire end to end. **Neither is a reading of judge quality**, because the answers were
written to have exactly the form the question asks for. What no run has ever measured: given an answer that
is thin, does the judge flag it; given "don't know yet", does it park it.

## Solution Statement

A pre-registered, fenced experiment in four moves:

1. **Seal the design first.** The realism brief (what a K1/K2/K3 answer must look like) and the sealed draw
   (which kind each question meets in each run) are committed before the author is asked for a single word.
2. **Author blind.** A fenced Agent SDK harness reuses #287's own predicate — `allowsPath` /
   `fenceDecision` / `fenceHooks` / `fenceCanUseTool` — over an allow-set that is the author's own output
   directory and **nothing else**, with `cwd` equal to that directory. `discovery/bank.mjs`,
   `docs/research/question-bank-source.md`, the PRD and every committed package are denied by name, and the
   denials land as `denied` lines in the author's own `transcript.jsonl`.
3. **Run for real.** A zero-dep driver POSTs each sealed answer to `/api/discovery/turn` — the same route
   the drawer POSTs to, with `runTurn` writing `answers.jsonl` verbatim either way. Six packages under
   `discovery/graded-*/`.
4. **Score purely.** `tooling/discovery-score.mjs` reads a package and the key and reports the confusion
   matrix per kind and per stage, with `file_evidence` counted separately and never scored. No SDK, no
   clock, gated by a new build-checks group.

## Out of Scope / Non-Goals

- **Not tuning the prompt.** No edit to `portal/lib/discovery-postures.mjs`, ever, in this PR. Both
  fingerprints must be byte-stable across all six recordings or the packages are not comparable. A
  tightening on the back of the score is a **new PR and a re-run**.
- **Not a new op verb, param or prompt string.** The epic's op-verb lock is not taken here; nothing this
  ticket adds can move `POSTURES.*.fingerprint`.
- **Not solving the realism gap.** Real answers wander and hedge; these are authored. §THE REALISM GAP
  states it and the report repeats it. Closing it is a later ticket with real interview transcripts.
- **Not re-recording `discovery/instrument-loans-1/`.** Group 32's fixture is untouched.
- **Not a claim about the rehearsal runs.** The report states explicitly that `allergen-matrix-1`'s and
  `my-product-name`'s op counts are not quality readings and does not cite them as one.
- **Not scoring `file_evidence`.** Counted and reported, never scored (it is non-closing).
- **Not proving MVP 6 mechanically.** The scorer produces a *shortlist* of candidate `text` lines; the
  MVP 6 verdict is a human read and the report says so.

## Feature Metadata

**Feature Type**: New Capability (validation scaffolding) + recorded output
**Estimated Complexity**: High — low code difficulty, high sequencing and honesty risk, real money
**Primary Systems Affected**: `discovery/` (six recorded packages) · `tooling/` (the scorer + group 33) ·
`portal/` (two build-time CLIs) · `docs/epics/fixtures/` (the sealed key)
**Dependencies**: `@anthropic-ai/claude-agent-sdk@0.1.77` (author harness only, already a portal dep). No
new dependency. The scorer and the driver are zero-dep Node ESM.

## Related Work

**Implements**: #348 · **Epic**: #279 (`docs/epics/discovery-partner.prd.md` + `.architecture.md`)

**Back-references**

- `.claude/plans/discovery-read-fence-287.md` — the predicate this ticket's author fence reuses. #287 is
  the hard precondition and is **CLOSED** (PR #354, merged at `6ee6da7`); `allowsPath`, `fenceDecision`,
  `fenceHooks`, `fenceCanUseTool`, `deniedLine.via` and `--probe-fence` all exist on `main`.
- `.claude/plans/discovery-file-evidence-347.md` — **CLOSED**. Its `PROVENANCE_RULE` + `name` edit is the
  last thing that moved the fingerprints. They are now stable at `think` `7efdde37…`,
  `think-opus` `cadb3811…` (observed, `node -e` over `POSTURES`).
- `.claude/plans/discovery-whole-bank-opus-posture.md` — shipped `DEPTHS["whole-bank"]` (65 ids, source
  order) and the `think-opus` posture. Both are the axes this fixture runs on.
- `.claude/plans/discovery-run-0-338.md` — the **phasing precedent**: a paid run planned as
  proof-the-mechanism → hard stop → the sitting → derive. Phase C1 below is its Phase A.
- `.claude/plans/discovery-parent-id-341.md` — the fingerprint tripwire and the re-record procedure.
- #291 (OPEN) — the sealed-pre-registration + fenced-key pattern this ticket applies to the whole bank.

**Forward-references**

- (none yet) — a prompt tightening on the back of this score is the follow-up, and it is a new ticket.

---

## THE CONTROL — the four ways the rubric leaks, and what denies each

The ticket's whole worth rests on the answer author never having seen a `weakAnswer` note. An author who
has seen it writes K2 answers thin in exactly the way the note names, and the score then measures the
author, not the judge. `forTheBrowser` (`portal/lib/discovery.mjs:539`) strips `weakAnswer` from
`/api/discovery/config`, so a browser cannot receive it — but an agent with repo read lifts it from four
places, and only naming all four makes the exclusion deliberate:

| Leak | Path | Denied by |
|---|---|---|
| The bank itself | `discovery/bank.mjs` | not in the author's allow-set |
| The same notes, upstream | `docs/research/question-bank-source.md` (group 28 pins every note's first 30 chars **to this file**) | not in the author's allow-set |
| The posture and MVP 6 | `docs/epics/discovery-partner.prd.md` · `.architecture.md` | not in the author's allow-set |
| Judged prose from past runs | `discovery/*/transcript.jsonl` — `flag_weak_answer.missing` names what a note asked for | not in the author's allow-set |

**The allow-set is exactly `[authorRoot]`.** Not `allowSetFor()` — that function hardcodes `BANK_PATH` into
every set it builds (`portal/lib/discovery.mjs:182-190`), because a *discovery run* may read the bank. The
author is not a discovery run. One predicate, a different set: `allowsPath` reads only `.root` and `.paths`
off its argument, so a hand-built `Object.freeze({ root, paths: Object.freeze([root]) })` is the same
predicate over a narrower set, which is precisely #287's per-run design.

### The `cwd` trap — this is the one that silently voids everything

`allowsPath` resolves a relative path **against `allowSet.root`**:

```js
const abs = path.resolve(allowSet.root, p);           // portal/lib/discovery.mjs:207
```

The SDK resolves it against `options.cwd`. If those differ, `Read("discovery/bank.mjs")` resolves inside
the fence to `<authorRoot>/discovery/bank.mjs` — under root, **ALLOWED** — while the SDK reads
`<repo>/discovery/bank.mjs`. The fence green-lights the bank and the transcript records nothing.

**So `options.cwd` MUST equal the author root**, and Task B2's gate case source-pins it. This is the same
property group 30 already pins for `runDiscoveryTurn` ("the real turn with `cwd` equal to the run root",
bought by PR #354 review F2). Copy the pin, do not re-derive it.

### The receipts trap — do not give the author `tools: []`

The instinct is to advertise no tools at all. That produces a **clean transcript with no denials**, and the
AC ("the denials in the author's transcript") then fails silently. The record gate is:

```js
const isRecorded = (tool) => isMcpToolName(tool) || (Array.isArray(mainTools) && mainTools.includes(tool));
```
(`portal/lib/discovery.mjs:348`) — under `tools: []` and no `mcp__` name, a denied `Read` is denied and
**unrecorded** (#349's rule: every built-in denial is the CLI's warmup). Copy `probeFence`'s wiring
instead: `tools: ['Read', 'Grep', 'Glob']`, `mainTools` the same array, the hand-built allow-set,
`cwd: authorRoot`. The author *can* try to read the bank, is refused, and the refusal is a `denied` line
carrying `via`.

---

## THE REALISM GAP — state it, do not solve it here

The rehearsal answers were uniformly well-formed prose with figures in them
(`allergen-matrix-1/answers.jsonl` `a1`: a named person, a frequency, a three-point cost range). **A fixture
built from more well-formed prose measures nothing new.** The realism brief (Task A1) therefore binds the
author:

- **K1 carries the form BADLY.** A range instead of a number ("somewhere between forty and a hundred a
  week"). A hedge ("I think, though I'd want to check"). An artefact cited from memory with no link ("there
  was a thread about it in March"). At least a third of K1 answers must do one of these.
- **K2 is thin against the question, not merely shorter.** It answers a different question, or gives a
  category where the question asks for an instance, or asserts without naming who, when or how much.
- **K3 says the person does not know YET and why**, which is what `open_question` records — not a refusal
  and not a blank.

### The tension the ticket contains, and how it resolves

The ticket says K2 is "thin against *that question's own* `weakAnswer` note" **and** that the author must
not see the note. Both hold, in this order: the brief tells the author what thin *means* in general — the
list is `MVP6_LINE`'s own (`no number, no user, no alternative, no time, no cost`,
`portal/lib/discovery-postures.mjs:49`) — and the author writes an answer missing those, from the question
text alone. **Whether that answer happens to be thin in the specific way the note names is exactly the
thing being measured.** The report states this. It is the honest reading of a blind fixture and it is
weaker than a rubric-aware one, which is the point.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `portal/lib/discovery.mjs` (whole file, ~668 lines) — Why: the fence (`allowSetFor:182`,
  `allowsPath:195`, `fenceDecision:211`, `fenceSite:313`, `fenceCanUseTool:368`, `fenceHooks:409`), the
  answer store (`appendAnswer:244`, `assertTurnWritable:231`, `nextRef:224`), the cursor
  (`sessionView:510`), `openSession:453`, `runTurn:631`. **Its five invariants are the contract this
  ticket must not break.**
- `portal/lib/discovery-transport.mjs` `probeFence()` (lines 439-540) — Why: **the template for the author
  harness.** A standalone fenced `query()` over a temp root: how the fence object is built, how both sites
  are wired, how tool_use/tool_result pairs are read off the stream, how the root is cleaned up.
- `portal/lib/discovery-transport.mjs` `runDiscoveryTurn` (144-220) and `MAIN_TOOLS` (57) — Why: the
  production wiring the author harness deliberately diverges from (a different allow-set, a different tool
  list) and the `cwd: root` pin to copy.
- `discovery/bank.mjs` `QUESTIONS` (99-738), `DEPTHS["whole-bank"]` (782-786), `selectDepth` (802-806) —
  Why: the 65 ids in source order are the run's question order and the key's row order. **Do not read
  `weakAnswer` into anything the author can reach.**
- `discovery/ops.mjs` `OPS`/`PARAMS` (44-58), `checkOp`, `applyOps` — Why: which op closes a turn, and the
  exact param key sets the scorer reads (`off_script`, `source`).
- `portal/lib/discovery-postures.mjs` (whole file) — Why: `MVP6_LINE:49` is the brief's own vocabulary;
  `FINGERPRINT_INPUTS:225` and `fingerprintOf:238` are what must not move. **Read only. Editing this file
  in this PR is a plan violation.**
- `discovery/prd-projection.mjs` `readPackage` (705-730) and the CLI guard (740-768) — Why: the scorer
  mirrors `readPackage`'s shape and the CLI's `--root`/slug/`--stdout` argument convention exactly.
- `tooling/fieldwork-kpis.mjs` (lines 1-30) — Why: **the post-hoc-judge precedent.** Its header states the
  rule the scorer inherits verbatim: a judge tool, never part of an agent prompt.
- `tooling/build-checks.mjs` group 32 (the `parenting` group, ~lines 7130-7175) — Why: the pattern for a
  group whose fixture is a real recorded package on disk, and `same()`/`ok()`/`threw()` usage.
- `tooling/build-checks.mjs` group 30 — Why: where the fence cases live; the author-fence cases in Task B2
  go in **group 33**, not here, but the driving style is group 30's.
- `discovery/README.md` §Files (65) · §File shapes (159) · §The full-depth run (346) · §The read fence
  (398) — Why: the run-package format, and the two section shapes to mirror when documenting the six
  packages.
- `discovery/allergen-matrix-1/run.json` — Why: the `turnStats` cost curve the budget band is derived from,
  and the shape a fixture `run.json` will have.
- `portal/server.mjs` lines 154-245 — Why: the `/api/discovery/{config,session,turn,close}` contract the
  driver speaks, including the SSE frame shapes and the `Origin` rule.
- `portal/lib/origin.mjs` — Why: **an absent `Origin` header passes** (`originAllowed:34`), so a Node
  `fetch` driver needs no header games. Confirm before writing the driver.
- `.claude/references/gates.md` lines 45-53 and 82-84 — Why: the group 28-32 entries the new group 33 entry
  must sit beside, and the two operator-run probes.

### New Files to Create

- `docs/epics/fixtures/graded-answers/brief.md` — the realism brief. Committed **before** the author runs.
- `docs/epics/fixtures/graded-answers/draw.json` — the sealed draw: kind per question per run, with its
  seed. Committed **before** the author runs.
- `docs/epics/fixtures/graded-answers/key.json` — 195 answers + 195 expected closing ops. Committed
  **before** any discovery run.
- `docs/epics/fixtures/graded-answers/author-transcript.jsonl` — the author run's own transcript, denials
  included. The fence's receipt.
- `tooling/discovery-score.mjs` — the pure key/draw helpers **and** the scorer CLI. No SDK, no clock.
- `portal/record-graded-answers.mjs` — the fenced author harness (Agent SDK; build-time only).
- `portal/record-graded-run.mjs` — the run driver (zero-dep; POSTs to the portal).
- `discovery/graded-think-a/` · `graded-think-b/` · `graded-think-c/` · `graded-opus-a/` ·
  `graded-opus-b/` · `graded-opus-c/` — six recorded packages (`run.json` · `answers.jsonl` ·
  `transcript.jsonl` · `prd.md`). **Recorded output. Never hand-written, never hand-edited.**
- `.claude/reports/discovery-graded-answer-fixture-348-report.md` — the run report and the score.

### Files to Update

- `tooling/build-checks.mjs` — **group 33**, the graded fixture's pure half.
- `.claude/references/gates.md` — the group 33 entry + the header line `32 pure groups` → `33 pure groups`.
- `CLAUDE.md` — `build-checks.mjs  32 PURE groups` → `33 PURE groups` (architecture map).
- `discovery/README.md` — a `## The graded answer fixture (#348)` section, in the shape of
  §The full-depth run and §The fence observation.

### Relevant Documentation

- Agent SDK `query()` options — the shape already in use at `portal/lib/discovery-transport.mjs:154-170`
  and `:493`. **Read the repo's two call sites rather than the SDK docs**: `tools`, `allowedTools`,
  `canUseTool`, `hooks`, `cwd`, `model`, `maxTurns`, `resume`. Version pinned at `0.1.77`
  (`portal/package.json`).
- `docs/epics/discovery-partner.prd.md` §MVP 6 (form, never substance) · §Success metrics — Why: the claim
  being scored and the metric rows the report fills.
- `docs/epics/discovery-partner.architecture.md` §Boundaries & contracts (the read fence) · §Data model
  (the op table) — Why: inherited, not re-decided.
- `docs/research/question-bank-source.md` — **the operator may read it; the author agent may not.** Its
  existence is the second leak path and is why the allow-set is `[authorRoot]`.

### Patterns to Follow

**Pure module + lazy SDK, three layers.** `portal/lib/discovery.mjs` is statically SDK-free and
zod-free because build-checks group 30 imports it in CI where `portal/node_modules` does not exist. Same
split here: `tooling/discovery-score.mjs` imports **only Node built-ins (`node:fs`, `node:path`, `node:url`,
`node:crypto`) plus `discovery/bank.mjs` and `discovery/ops.mjs`** — both of which are themselves
import-free and CI-safe, which is exactly why groups 29 and 30 already import them — so group 33 can import
it with no `portal/node_modules`. `portal/record-graded-answers.mjs` is where the SDK lives and **nothing in
`tooling/` may import it**; group 33 reads it as text. Case 11's purity pin is *no SDK, no zod, no clock, no
randomness*, not *no imports*.

**A CLI guard that survives a path with a space** — copy verbatim from `discovery/prd-projection.mjs:740`:

```js
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
```

Never `file://${argv[1]}`: this repo's path contains a space, which `import.meta.url` percent-encodes.

**Throw a plain `Error` naming the offending path** (`agent-layer/lib.mjs`, `discovery/ops.mjs`). No error
taxonomy, no wrapping, no schema library.

**A gate case mutates the source and runs the function.** From `.claude/references/gates.md` and
[[the check that cannot fail]]: every #137 defect survived a green gate by skipping the thing it tested.
Every group 33 case below names the mutation that turns it red.

**Hand-validate at the boundary.** `portal/lib/intake.mjs` and `discovery/ops.mjs:checkOp` — exact key
sets, an unknown key throws, an absent key throws.

**Frozen at both levels.** `Object.freeze` is shallow; a pushable inner array makes a "frozen by mutation"
case pass for the wrong reason (`discovery/ops.mjs:PARAMS`'s comment). Freeze the draw table and its rows.

---

## IMPLEMENTATION PLAN

### Phase A — the sealed design (deterministic, free)

The brief and the draw are written and **committed before the author is asked for a single word**, so no
answer can be reverse-fitted to a kind assignment.

**Tasks:** the realism brief · the sealed draw + its seed · the key's shape, empty · the scorer's pure half
· group 33 for everything in this phase.

### Phase B — the author harness and the blind authoring run

**Depends on:** Phase A (the brief is the author's prompt; the draw decides nothing here — all three kinds
are authored for every question).

**Tasks:** the fenced harness · the fence source-pins in group 33 · one paid author run (≈$2, expected) ·
the key assembled from the author's output and committed.

### Phase C — the six recorded runs

**Depends on:** Phase B (the key must be committed and sealed first) **and** a clean `main` with both
fingerprints unmoved.

**C1 — the smoke turns (≈$0.15, expected).** Two throwaway slugs, one per posture, one turn each, deleted
after. Copies run 0's Phase A: catches an auth surprise, a fingerprint surprise and a driver bug for 1/200
of the full cost.

**HARD STOP → the owner's paid call.**

**C2 — one drawn run per posture** (130 turns, ≈$17 expected). `graded-think-a` + `graded-opus-a`. A
complete, reportable deliverable on its own, at the cost of per-question kind coverage.

**HARD STOP → the owner's paid call.**

**C3 — the remaining four runs** (260 turns, ≈$34 expected). `-b` and `-c` on both postures. Completes
per-question coverage: across a posture's three runs every question meets all three kinds.

### Phase D — the score and the report

**Depends on:** Phase C2 at minimum.

**Tasks:** score every recorded package · the confusion matrix per kind and per stage · the MVP 6 read ·
`discovery/README.md`'s new section · the report.

**Independent of:** nothing — D reads C's output.

---

## STEP-BY-STEP TASKS

Execute in order. Phase A and B tasks are code and are validated on every commit; Phase C tasks spend money
and stop at the marked gates.

### A0 — BRANCH from a clean main

- **IMPLEMENT**: `git fetch origin && git switch -c feat/348-graded-answer-fixture origin/main`. **The
  current working-tree branch is `chore/352-353-strict-mcp-case-relabel`, a sibling session's** — do not
  branch off it. Confirm `node tooling/build-checks.mjs` is green and both fingerprints are unmoved before
  writing a line.
- **GOTCHA**: [[shared-worktree-parallel-sessions]] — parallel sessions share this working directory. Verify
  the branch immediately before every commit and stage by explicit path.
- **VALIDATE**: `git status -sb | head -1` shows the new branch · `node tooling/build-checks.mjs 2>&1 | tail -1`
  reads `build ✓  all 32 groups pass` · `node -e "import('./portal/lib/discovery-postures.mjs').then(m=>console.log(m.POSTURES.think.fingerprint, m.POSTURES['think-opus'].fingerprint))"`
  prints `7efdde37441fbd2591ba4a7dfeecdb6b cadb38117a2660c036d87e32323a8745`.
- **SATISFIES**: the precondition for every AC.

### A1 — CREATE `docs/epics/fixtures/graded-answers/brief.md`

- **IMPLEMENT**: The realism brief, and it is the author agent's literal prompt preamble. Sections:
  *What you are writing* (three answers per question, from the question text alone) · *K1 — has the form,
  carried badly* (the three degradations from §THE REALISM GAP, with a worked example that is **not** a bank
  question) · *K2 — thin* (missing one or more of `MVP6_LINE`'s five: no number, no user, no alternative,
  no time, no cost — quoted, since the author may not read the module) · *K3 — does not know yet, and why*
  · *What you must never do* (never ask to see a rubric, a note, a repo file or a past run; never write in
  the same register twice in a row; never exceed ~120 words).
- **GOTCHA**: The brief must **not** contain any bank question's `weakAnswer` text, nor a paraphrase of one.
  It teaches thinness generically. A1's reviewer check: diff the brief against
  `docs/research/question-bank-source.md`'s "Weak answer:" sentences — zero 30-char overlaps.
- **GOTCHA**: C2 applies — run the brief through `no-ai-slop` against
  `~/.claude/skills/_shared/slop-blacklist.md` before committing. It is prose a human reads.
- **VALIDATE**: `node -e "const b=require('fs').readFileSync('docs/epics/fixtures/graded-answers/brief.md','utf8'); const {QUESTIONS}=await import('./discovery/bank.mjs'); const hit=QUESTIONS.filter(q=>b.includes(q.weakAnswer.slice(0,30))); console.log(hit.length===0?'brief clean':'LEAK: '+hit.map(q=>q.id))"`
  (as an `.mjs` one-liner — top-level await needs ESM).
- **SATISFIES**: AC #2 (the realism brief committed beside the key).

### A2 — CREATE the draw half of `tooling/discovery-score.mjs`

- **IMPLEMENT**: In one new file, the **pure half first** — this file holds both the draw/key helpers and
  the scorer, and imports only `node:fs`, `node:path`, `node:url`, `node:crypto`.
  - `export const KINDS = Object.freeze(['K1','K2','K3'])`
  - `export const EXPECTED = Object.freeze({ K1: 'record_decision', K2: 'flag_weak_answer', K3: 'open_question' })`
  - `export const RUNS = Object.freeze(['a','b','c'])`
  - `export function drawFor(seed, ids)` → frozen-at-both-levels `{ seed, table: [{ id, a, b, c }] }`, where
    **there is no posture argument and there must never be one** — see F1 in §NOTES,
    for question index `i`: `offset = parseInt(createHash('md5').update(seed + ':' + id).digest('hex').slice(0,8), 16) % 3`
    and `kind(run r) = KINDS[(offset + r) % 3]`. **A Latin square with a per-question offset**: every
    question meets all three kinds across the three runs (coverage), and no run is a predictable cycle
    (the judge cannot pattern-match the stream). Deterministic from the committed seed, so the gate
    recomputes it.
  - `export function checkKey(key, ids)` — throws naming the offender: exactly `ids.length * 3` entries,
    one per `(question_id, kind)` pair with no gaps and no repeats, every `question_id` in `ids`, every
    `kind` in `KINDS`, `expected` equal to `EXPECTED[kind]`, every `answer` a non-empty trimmed string.
- **PATTERN**: `discovery/ops.mjs:checkOp` for the exact-key-set boundary validation; `discovery/bank.mjs`'s
  `Object.freeze(...map(Object.freeze))` for both-level freezing.
- **GOTCHA**: No `Date.now()`, no `Math.random()`, no clock anywhere in this file. The draw must be
  reproducible from `seed` alone or the gate cannot check it.
- **VALIDATE**: `node -e "…"` proving `drawFor('x', ids)` is stable across two calls and that for every row
  `new Set([r.a,r.b,r.c]).size === 3`.
- **SATISFIES**: AC #3 (the sealed draw, three runs per posture, every question meeting all three kinds).

### A3 — CREATE `docs/epics/fixtures/graded-answers/draw.json`

- **IMPLEMENT**: `node tooling/discovery-score.mjs --draw --seed "348-graded-answer-fixture" > docs/epics/fixtures/graded-answers/draw.json`.
  Add the `--draw` CLI branch. The file carries `{ seed, generatedFor: "#348", table: [...] }` — 65 rows.
- **GOTCHA**: The seed string is committed **in the file**, so the draw is both sealed and reproducible.
  Pick it now and never change it: changing the seed after a run invalidates every recorded package's kind
  assignment.
- **VALIDATE**: `node tooling/discovery-score.mjs --check-draw` re-derives the table from the committed seed
  and compares — exits 0 with `draw ✓  65 questions × 3 runs, every question meets all three kinds`.
- **SATISFIES**: AC #3.

### A4 — ADD the scorer half to `tooling/discovery-score.mjs`

- **IMPLEMENT**:
  - `export function closingOpOf(ops, turn)` — the closing op for one turn, or `null`. **A closing op is:**
    `record_decision` with `params.off_script === false` · `flag_weak_answer` always · `open_question` with
    `params.source === 'banked'`. `file_evidence` never closes. Read `closes` off the committed record
    **and** re-derive it from the params, and throw if they disagree — the transcript's `closes` is the
    applier's and a disagreement means a hand edit.
  - `export function scorePackage(pkg, key, draw, run)` → per turn: `{ turn, question_id, kind, expected,
    filed, outcome }` where `outcome` is one of **five**: `match` · `mismatch` (a different closing op) ·
    `no_close` (the turn filed nothing that closes) · `unscored_evidence` is **not** an outcome (see below)
    · plus `answer_mismatch` (the stored answer text is not the sealed one — a hard failure, see A5).
  - The confusion matrix is `expected × filed` with columns `record_decision`, `flag_weak_answer`,
    `open_question`, `other closing op`, `no closing op`. **Five columns, not three** — an
    `off_script: true` decision and an `off-script` `open_question` are real filings that close nothing and
    would otherwise vanish from the score.
  - `file_evidence` ops are counted per turn and reported in their own line, never in the matrix.
  - Per-stage breakdown by `question.stage`, taken from the ids (the scorer imports `QUESTIONS` from
    `discovery/bank.mjs` — reading the bank is the *scorer's* right, never the author's).
- **PATTERN**: `tooling/fieldwork-kpis.mjs`'s header, verbatim in spirit: *a JUDGE tool, NEVER part of an
  agent prompt.* Put that sentence in this file's header too.
- **GOTCHA**: `scorePackage` must be **pure** — same inputs, same output, no fs. The fs half is
  `readPackage`-shaped and lives in the CLI branch, mirroring `discovery/prd-projection.mjs:705`.
- **VALIDATE**: covered by A6's gate cases.
- **SATISFIES**: AC #4 (the confusion matrix), AC #5 (the `file_evidence` count).

### A5 — ADD the byte-equality check

- **IMPLEMENT**: `export function assertAnswersSealed(pkg, key, draw, run)` — for every answer line in
  `answers.jsonl`, the `text` field must equal `key[(question_id, drawnKind)].answer` **exactly** (no trim,
  no normalisation — `appendAnswer` stores verbatim). Throws naming the first `ref` that differs, with both
  strings. Also asserts the answer count equals 65 and `nextRef` ordering is `a1…a65` with no gaps.
- **GOTCHA**: This is AC #3's "byte-equal to the sealed answers" and it is what makes the driver (Task C0)
  necessary rather than convenient. 390 hand-pastes cannot deliver it.
- **GOTCHA**: A duplicate answer line (66 answers) means a turn did not close and the driver retried.
  That must be a **hard failure with a named ref**, not a warning — the run is re-run, never trimmed.
- **VALIDATE**: A6.
- **SATISFIES**: AC #3.

### A6 — ADD build-checks **group 33**

- **IMPLEMENT**: A new group in `tooling/build-checks.mjs`, imported from `tooling/discovery-score.mjs`.
  SDK-free like group 8 and group 29, for the same reason. Cases:
  1. **The draw is a Latin square, and it is SHARED ACROSS POSTURES.** `drawFor` over the real 65 ids:
     every row holds all three kinds; each run column holds all three kinds (no uniform stream);
     recomputation from the committed `draw.json`'s seed is byte-equal to the committed table.
     **`drawFor.length === 2`** — it takes `(seed, ids)` and no posture, so `graded-think-a` and
     `graded-opus-a` resolve to the same column `a`, which is what makes the posture comparison a
     one-answer-set comparison. *Mutation: change one row's `b` in the JSON → red naming the id. Second
     mutation: add a posture parameter → red on the arity pin.*
  2. **The draw is deterministic and frozen at both levels.** Two calls deep-equal; a push into a row is
     inert and the length re-reads.
  3. **`checkKey` refuses**, each on its message: a missing pair, a duplicate pair, an id not in the bank,
     a kind off `KINDS`, an `expected` that disagrees with `EXPECTED[kind]`, an empty answer, a
     whitespace-only answer, a non-string answer.
  4. **`EXPECTED` is the closing table.** Iterate `OPS` from `discovery/ops.mjs` in both directions: every
     kind's expected op is in `OPS`; `file_evidence` is the one op no kind expects, asserted **by name** —
     so a fifth verb or a renamed one fails here rather than silently.
  5. **`closingOpOf` — the five outcomes**, driven over a hand-built synthetic transcript: a closing
     `record_decision` (`off_script:false`), an **`off_script:true` decision** (not closing), a
     `flag_weak_answer`, a **banked** `open_question`, an **off-script** `open_question` (not closing), a
     `file_evidence` (not closing), and a turn holding only text (`no_close`). *Mutation: drop the
     `off_script` term → the off-script decision counts as a close → red.*
  6. **`closes` disagreement throws.** A record whose `closes` is `true` but whose params say otherwise
     throws naming the seq.
  7. **`scorePackage`'s matrix sums to the turn count**, over a synthetic package covering all five
     outcomes, with `file_evidence` counted separately and **absent from the matrix**. *Mutation: fold
     `file_evidence` into the matrix → the sum exceeds the turn count → red.*
  8. **`assertAnswersSealed` both directions**: a package whose texts equal the key passes; one byte
     changed in one answer throws naming that `ref`; a 66th answer line throws naming the duplicate.
  9. **THE AUTHOR FENCE, source-pinned** (this is the control, as a gate rather than a review fact) — read
     `portal/record-graded-answers.mjs` as text and assert: it does **not** call `allowSetFor`; it builds
     its allow-set with `paths` of length 1; `cwd` is the author root in the same `query({ options })`
     block; `tools` is `['Read','Grep','Glob']` and equals `mainTools`. *Mutation: point `cwd` at
     `REPO_DIR` → red naming the `cwd`.*
  10. **The author's allow-set denies all four leaks**, driven through the real `allowsPath`: `BANK_PATH`,
      `docs/research/question-bank-source.md`, `docs/epics/discovery-partner.prd.md` and
      `discovery/instrument-loans-1/transcript.jsonl` each **denied**, the author root **allowed** — and
      the same four **allowed** under `allowSetFor({root: REPO_DIR})` as the positive control, so the case
      cannot pass because `allowsPath` denies everything.
  11. **The purity pin**: `tooling/discovery-score.mjs`'s import lines hold no SDK, no zod, no
      `Date.now()`, no `Math.random()`. *Mutation: add `Date.now()` → red.*
  12. **THE JUDGE'S FENCE DENIES THE KEY** (the mirror of case 10, and #291's rule verbatim: *omission is
      not a fence*). Drive the **run's** allow-set — the real `allowSetFor({ root: discovery/graded-think-a,
      reads: [] })` — over `docs/epics/fixtures/graded-answers/key.json`, `draw.json`, `brief.md` and
      `author-transcript.jsonl`: **all four denied**. The package root and `BANK_PATH` allowed, as the
      positive control. Without this the key's exclusion rests on `reads` happening to be empty, which is
      omission, not a fence. *Mutation: add the fixtures directory to `reads` → red.*
  13. **THE BANK NEVER LEARNS FROM THE FIXTURE** (the circularity guard). No `text`, `weakAnswer`, `note` or
      `provenanceNote` in `discovery/bank.mjs` shares a 30-character span with any `key.json` answer. This
      is the failure nobody would ever notice: if a later ticket "improves" a weak-answer note using the
      fixture's own K2 prose, the score becomes circular **forever** and every future reading is void.
      Cheap, exact, and the mirror of A1's brief-leak check. *Mutation: paste 40 chars of a K2 answer into
      a `weakAnswer` → red naming the question id.*
  14. **NOTHING BUT THE SCORER TOUCHES A FIXTURE PACKAGE.** No tracked source file outside
      `tooling/discovery-score.mjs` names a `graded-` slug. Group 28 already uses this exact shape ("no
      tracked page or `system/` module reaching the bank"), so copy it. Keeps the fixture out of every
      future reader by construction rather than by everyone remembering. *Mutation: reference
      `graded-think-a` from `discovery/prd-projection.mjs` → red naming the file.*
- **PATTERN**: group 29 for the refusal battery style; group 30 case 22+ for source pins; group 32 for
  reading a real package off disk.
- **GOTCHA**: Group 33's package-reading cases must **skip cleanly with a named failure when the six
  packages do not exist yet** — Phase A lands before Phase C. Follow group 32's "fails by name when the
  package is absent — it never skips" only for the *key and draw*, which exist from A3; for the six
  packages, gate on `existsSync` and record a `pending` line in the group's ✓ text until C lands, then
  make it required in the same PR's final commit. State which in the group line.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 33 groups pass`. Then each
  mutation above, restored, with the file's md5 checked equal to the pre-mutation hash.
- **SATISFIES**: AC #1's fence proof, AC #4's arithmetic.

### A7 — UPDATE the three cascade sites

- **IMPLEMENT**: `CLAUDE.md` architecture map — `build-checks.mjs   32 PURE groups, in CI` → `33 PURE
  groups`. `.claude/references/gates.md` — the header `## tooling/build-checks.mjs — 32 pure groups, in CI`
  → `33`, plus a **Group 33** entry beside group 32's, in the house shape: what it drives, and the sentence
  naming what it **cannot** reach (*it cannot reach whether the author agent actually obeyed the brief, nor
  whether a K2 answer is thin in the way its own weak-answer note names — both are review facts against the
  committed key; and it cannot reach whether a fence DENY stopped a call at run time, which is the author
  run's own `denied` lines*).
- **GOTCHA**: [[loc-summary-counts-tracked-only]] — `gen-loc-summary` counts `system/`, root/`proto/` pages
  and `agent-layer/` only, so nothing here moves it. Run `node agent-layer/gen-loc-summary.mjs --check`
  anyway before staging (observed clean today).
- **VALIDATE**: `node tooling/drift-check.mjs` ✓ · `grep -c "33 PURE groups" CLAUDE.md` = 1.
- **SATISFIES**: repo convention (a gate that exists is documented where gates are documented).

### A8 — COMMIT Phase A

- **IMPLEMENT**: One atomic commit. Message: `chore(discovery): the graded fixture's sealed design — the
  realism brief, the draw and the scorer, before a word is authored (#348)`.
- **GOTCHA**: CLAUDE.md's approval gate — show the diff and wait for OK before committing.
- **VALIDATE**: `git show --stat HEAD` names only Phase A's files.
- **SATISFIES**: AC #1's "committed and sealed before any run" — the design half.

---

### B1 — CREATE `portal/record-graded-answers.mjs` (the fenced author harness)

- **IMPLEMENT**: A build-time CLI. `node portal/record-graded-answers.mjs --out docs/epics/fixtures/graded-answers [--dry] [--only <question-id>]`.
  - Creates the **author root** — a directory it owns, holding `transcript.jsonl` (the fence writes here
    through `appendTranscript`) and `answers.json` (its own output). Put it at
    `docs/epics/fixtures/graded-answers/` so the transcript commits with the key.
  - Builds the allow-set **by hand**: `Object.freeze({ root: authorRoot, paths: Object.freeze([authorRoot]) })`.
    **Never `allowSetFor`** — see §THE CONTROL.
  - Wires both sites exactly as `probeFence` does:
    `const fence = { allowSet, mainTools: ['Read','Grep','Glob'] }` →
    `canUseTool: fenceCanUseTool(authorRoot, turnId, onLine, fence)` and
    `hooks: fenceHooks(authorRoot, turnId, onLine, fence)`.
  - `query({ prompt, options: { cwd: authorRoot, model: 'claude-sonnet-5', maxTurns: 4,
    tools: ['Read','Grep','Glob'], allowedTools: [], canUseTool, hooks } })`.
  - **One `query()` per bank question**, 65 in all, each returning the three answers for that question and
    nothing else. Per-question rather than batched so the author cannot drift into one template across the
    bank, and so a refused or malformed answer is re-run alone.
  - The prompt is `brief.md` verbatim + the question's `text`, `stage` and `attribution` **only**.
    `weakAnswer`, `note` and `provenanceNote` are never interpolated. Mirror `forTheBrowser`'s field list
    (`portal/lib/discovery.mjs:539`) and say so in a comment.
  - The answers come back as text and the harness parses them (`K1:` / `K2:` / `K3:` blocks) — the author
    has **no write tool**, which is the point. A malformed reply is a re-run of that one question, never a
    hand-fix.
  - `--dry` runs question 1 only and writes nothing, so the wiring is proved before 65 paid calls.
- **PATTERN**: `portal/lib/discovery-transport.mjs:probeFence` (439-540) for the whole shape — the temp
  root, the fence object, the message-stream read, the tool_use/tool_result pairing.
- **IMPORTS**: `import { query } from '@anthropic-ai/claude-agent-sdk'` · `import { appendTranscript,
  fenceCanUseTool, fenceHooks, textLine } from './lib/discovery.mjs'` · `import { QUESTIONS } from
  '../discovery/bank.mjs'`.
- **GOTCHA — the `cwd` trap.** `options.cwd` MUST be `authorRoot`. See §THE CONTROL; group 33 case 9 pins it.
- **GOTCHA — the receipts trap.** `tools` must NOT be `[]`, or a denied `Read` is denied and unrecorded and
  the AC's "denials in the author's transcript" fails silently. See §THE CONTROL.
- **GOTCHA**: This file imports the SDK, so **nothing in `tooling/` may import it**. Group 33 case 9 reads it
  as **text**, never as a module.
- **GOTCHA**: `discovery/bank.mjs` is imported *by the harness process*, which is fine — the harness is
  trusted code. Only the *agent* is fenced. Make that distinction explicit in the file header, because a
  reviewer will read the import and think the control is broken.
- **VALIDATE**: `cd portal && node record-graded-answers.mjs --dry --out /tmp/x` prints the three answers for
  question 1 and writes nothing · group 33 cases 9-10 green.
- **SATISFIES**: AC #1 (the author's fence).

### B2 — RUN the author (one paid run, ≈$2 expected)

- **IMPLEMENT**: `cd portal && node record-graded-answers.mjs --out ../docs/epics/fixtures/graded-answers`.
  Then **read the output**: spot-check ten questions across stages for the brief's degradations (a hedge, a
  range, a from-memory citation in K1; a category-for-instance K2; a reasoned K3). If the register is
  uniform, **tighten the brief and re-run** — never edit an answer.
- **IMPLEMENT**: Add a `denied`-line sanity read: the author's `transcript.jsonl` should carry at least one
  `denied` line **and** every one must name a path outside `authorRoot`. **Zero denials is not automatically
  a pass** — it may mean the author never tried, or it may mean the fence is not being reached. If zero,
  add one probe question to the prompt asking the author to read `discovery/bank.mjs` and report the
  refusal verbatim, re-run that one question, and record the receipt. Report which happened.
- **GOTCHA**: The honesty contract is hard. A bad author run is fixed by a tighter brief and a re-run, never
  by editing `key.json`'s answers.
- **VALIDATE**: `wc -l docs/epics/fixtures/graded-answers/author-transcript.jsonl` · every `denied` line's
  `via` is one of `PreToolUse` / `canUseTool` · every `denied` line's path resolves outside the author root.
- **SATISFIES**: AC #1, AC #2.

### B3 — CREATE `docs/epics/fixtures/graded-answers/key.json` and SEAL it

- **IMPLEMENT**: The harness writes it: 195 entries `{ question_id, kind, answer, expected }` where
  `expected = EXPECTED[kind]` — **derived, never authored**. Validate with `checkKey` before writing.
- **IMPLEMENT**: Commit A1's brief, A3's draw, this key and the author transcript **together**, and note the
  commit sha in the report. That sha is the seal: every recorded package's `startedAt` must be later than
  its commit date, and the report states both.
- **GOTCHA**: Once committed, `key.json` is never edited. A re-run of the author is a new commit that
  **replaces** it, and any package recorded against the old key is void.
- **VALIDATE**: `node tooling/discovery-score.mjs --check-key` → `key ✓  195 answers, 65 questions × 3
  kinds, every expected op derived` · `node tooling/build-checks.mjs` → 33 groups green.
- **SATISFIES**: AC #1 (195 answers, 195 expected ops, committed before any run).

### B4 — COMMIT Phase B

- **IMPLEMENT**: `chore(discovery): 195 answers authored blind to the rubric, the key sealed and the
  author's denials receipted (#348)`. Show the diff, wait for OK.
- **SATISFIES**: AC #1's seal.

---

### C0 — CREATE `portal/record-graded-run.mjs` (the driver)

**Read Q1 in §OPEN QUESTIONS before writing this file.** If the owner rules for hand-driving, this task is
dropped and Phase C becomes six sittings at the drawer; every other task is unchanged.

- **IMPLEMENT**: A zero-dep Node ESM CLI. `node portal/record-graded-run.mjs --slug graded-think-a
  --posture think --run a [--port 4747] [--from <n>] [--dry]`.
  - `--run` is derivable from the slug's suffix; take it explicitly anyway and **assert it matches the
    suffix**. A mis-typed `--run` cannot produce a wrong matrix — `assertAnswersSealed` compares the stored
    text against the key for that column and throws naming the first `ref` — so the failure mode is loud
    rather than silent. State that as the property it is.
  - `POST /api/discovery/session` with `{ slug, provenance: 'fictional', entryMode: 'blank-idea',
    depth: 'whole-bank', branch: null, frontEnd: 'portal', posture, reads: [] }`.
  - Then, per turn: read the cursor from the session view, look up the drawn kind for that
    `cursor.question.id` in `draw.json`, take the sealed answer from `key.json`, and
    `POST /api/discovery/turn` with `{ slug, provenance, questionId: cursor.question.id, text }`. Consume
    the SSE frames (`text` / `op` / `denied` / `done` / `error`) and print a one-line-per-turn progress log.
  - Re-read `sessionView` from the `done` frame and **HALT** if `cursor.index` did not advance by exactly 1.
  - Finally `POST /api/discovery/close`, then run `node discovery/prd-projection.mjs <slug>`.
- **GOTCHA — never retry a non-advancing turn.** A retry appends a second `answers.jsonl` line
  (`appendAnswer` stores verbatim, `nextRef` is positional), which breaks byte-equality permanently in an
  append-only file the honesty contract forbids you to clean up. **Halt, print the turn id, and let the
  operator decide** (the answer is re-submittable by hand for that one turn, or the run is abandoned and
  re-run under a new slug).
- **GOTCHA**: `--from <n>` resumes a halted run at the cursor. It must re-read the cursor from the server,
  never from its own count. Disk is authoritative (invariant 2).
- **GOTCHA**: No `Origin` header needed — `originAllowed` passes an absent one
  (`portal/lib/origin.mjs:34`). Do not invent one.
- **GOTCHA**: `withDiscoveryRunLock` refuses a concurrent turn. The driver is serial by construction; do
  not add concurrency.
- **GOTCHA**: The driver **must not** import the SDK and must not write into the run package. Its only
  writes are stdout and its own log file.
- **PATTERN**: The SSE consumption shape is `portal/public/portal.js`'s discovery turn handler; the CLI
  guard is `discovery/prd-projection.mjs:740`.
- **VALIDATE**: `--dry` prints the first three turns' `{questionId, kind, answer.slice(0,60)}` and POSTs
  nothing.
- **SATISFIES**: AC #3 (byte-equality as a property of the mechanism).

### C1 — the smoke turns (PAID, ≈$0.15 expected)

- **IMPLEMENT**: Start the portal (`cd portal && npm start`). Two throwaway slugs, `smoke-think-348` and
  `smoke-opus-348`, `whole-bank` depth, one turn each through the driver, then `rm -rf` both packages.
  Record, as run 0's Phase A table does: the portal's boot sha from `/api/health`, `turnStats[0]`'s
  `costUsd` / `durationMs` / `ok`, and `postureFingerprint` **equal to the module's current value for that
  posture**.
- **GOTCHA**: **If either fingerprint differs from `7efdde37…` / `cadb3811…`, STOP.** Something moved the
  prompt surface between A0 and here (a sibling session merging a prompt ticket) and the six packages
  would be recorded on a surface about to move. Rebase, re-verify, re-smoke.
- **GOTCHA**: [[portal-smoke-port-scoped-kill]] — never `pkill -f 'node server.mjs'`; kill by PID/port only,
  and expect a sibling session's stale portal on a nearby port. [[stale-serve-wrong-tree]] — curl
  `/api/health`'s boot sha and confirm it is this branch's HEAD before trusting a turn.
- **VALIDATE**: both throwaway packages deleted (`ls discovery/ | grep smoke` empty) ·
  `node tooling/build-checks.mjs` green.
- **SATISFIES**: de-risks AC #3 for 1/200 of the cost.

### ⛔ HARD STOP — the owner's paid call on C2

Report to the owner: the smoke numbers, the derived cost band (§NOTES), and the two options —
C2 alone (2 runs, 130 turns, ≈$17, per-posture coverage but not per-question) or C2+C3 (6 runs, 390 turns,
≈$51, full coverage). **Do not start C2 without an explicit go.**

### C2 — one drawn run per posture (PAID, 130 turns, ≈$17 expected)

- **IMPLEMENT**: `graded-think-a` (posture `think`, run column `a`) then `graded-opus-a` (posture
  `think-opus`, run column `a`). Serial — the run lock refuses concurrency and two runs would race the
  same portal.
- **IMPLEMENT**: After each: `node tooling/discovery-score.mjs --slug <slug> --run a` and
  `node discovery/prd-projection.mjs <slug>` (the projection's bytes are the package's `prd.md`).
- **GOTCHA**: ~17 min/run on sonnet at the observed 16 s/turn; opus is slower and untimed — expect 30-45
  min. Budget the wall clock, and do not leave a halted run half-recorded across a session boundary.
- **GOTCHA**: A run that halts mid-way is **resumable** (`--from`) — disk is authoritative and `openSession`
  resumes. A run that halts and cannot resume is abandoned; its directory is deleted and the slug is retired
  (a slug names four files and the namespace is flat).
- **VALIDATE**: `node tooling/discovery-score.mjs --slug graded-think-a --run a` prints the matrix and
  `answers sealed ✓  65/65 byte-equal` · `node tooling/build-checks.mjs` → 33 groups green with the package
  cases now live.
- **SATISFIES**: AC #3, AC #4 (per posture).

### ⛔ HARD STOP — the owner's paid call on C3

Report the two matrices from C2. **The number is the reading**; if it already answers the question the
owner may stop here, and the report says which of the six runs exist. Do not start C3 without an explicit go.

### C3 — the remaining four runs (PAID, 260 turns, ≈$34 expected)

- **IMPLEMENT**: `graded-think-b`, `graded-think-c`, `graded-opus-b`, `graded-opus-c`, each on its own draw
  column. Same per-run validation as C2.
- **SATISFIES**: AC #3's "six real runs", AC #4's per-question coverage.

---

### D1 — SCORE and write the report

- **IMPLEMENT**: `.claude/reports/discovery-graded-answer-fixture-348-report.md`, in the house shape (see
  `.claude/reports/discovery-run-0-338-report.md` and `discovery-whole-bank-opus-posture-report.md`).
  Every row labelled *observed* / *derived* / *expected*. Sections:
  - **Summary** — what was run, on which fingerprints, at what cost, and which of the six packages exist.
  - **The seal** — the key's commit sha and date; every package's `startedAt` later than it (observed).
  - **The author's fence** — the denials, their `via`, and the paths refused. Or: the author named as a
    person who has not read the bank.
  - **The score, per posture** — the 3×5 confusion matrix and the `file_evidence` count beside it (not in
    it). **No target, no pass/fail verdict.**
    **F3 — per-kind totals ONLY at C2.** With one run per posture every question meets exactly one kind, so
    a per-stage × per-kind cross-tab runs 0-3 per cell (stage 9 holds four questions in total) and would
    publish a table of n=1 cells. **Hold the per-stage breakdown for C3**, where every question has met all
    three kinds. Print one or the other and say which — never both.
  - **The MVP 6 read** — see D2.
  - **What this is not** — verbatim: the rehearsal runs' op counts (`allergen-matrix-1`'s 30/30,
    `my-product-name`'s) are **not** quality readings and are not cited as one; this score is a
    **form-judgement reading taken under the realism gap** in §THE REALISM GAP, on authored rather than real
    answers. **And (F4): where a package's projected `prd.md` shows consecutive turns with no decision, that
    is #285's not-a-form counter reading a DRAW ARTIFACT** — the hash offset produces runs of three or four
    same-kind draws, and a run of K2/K3 is exactly what that counter is built to notice. It is not a
    run-quality finding, and the report says so before anyone quotes it as one.
- **SATISFIES**: AC #4, AC #6.

### D2 — the MVP 6 read

- **IMPLEMENT**: `node tooling/discovery-score.mjs --slug <slug> --mvp6` extracts every `text` line from
  the package and prints a **shortlist**: lines matching a small committed pattern set (`\bwrong\b`,
  `\bincorrect\b`, `you should`, `the (right|correct) answer`, `instead,? (you|try)`, `actually,`). Then a
  **human reads the shortlist and states the verdict** across all recorded turns.
- **GOTCHA**: The script does **not** prove MVP 6 and the report must not say it does. It is a shortlist
  that makes a human read of 130-390 turns tractable. State the shortlist size, the number read, and the
  verdict.
- **VALIDATE**: the shortlist is reproducible (`--mvp6` twice, byte-identical).
- **SATISFIES**: AC #5.

### D3 — UPDATE `discovery/README.md`

- **DECIDE FIRST (F5)**: whether a fixture package carries a `prd.md`. Six projections of deliberately-thin
  answers is ~360KB of committed prose nobody will read. **Recommendation: generate it** — it keeps the six
  packages format-identical to every other committed package, and group 33 then asserts `prd.md` is the
  projection's bytes exactly as group 32 does for `instrument-loans-1` (a free hand-edit detector). If the
  owner prefers three-file packages, say so in the README section and drop the `prd.md` line from C2/C3 and
  the group 33 case. **Do not leave it implicit.**
- **IMPLEMENT**: A `## The graded answer fixture (#348)` section after §The full-depth run, in that
  section's shape: what the six packages are, what they show, and — crucially — **what they are not**. It
  must say (a) these are **fixture runs, not interviews**, (b) the answers are authored and sealed and the
  key is at `docs/epics/fixtures/graded-answers/`, (c) group 32 does **not** read them and their
  fingerprints date them, (d) each package's posture and draw column, **(e) they are EXCLUDED from the
  Switch, completion and not-a-form metric reads** — their `frontEnd: "portal"` is the driver's, not a
  person's choice (Q2) — and **(f) a package may trip #285's consecutive-no-decision counter purely because
  the draw handed it a run of K2/K3, which is a draw artifact and not a run-quality finding** (F4).
- **GOTCHA**: `run.json`'s `label` is set by `LABEL[provenance]` (`portal/lib/discovery.mjs:449`) and the
  operator has no field for it. **Do not add one** — that is a spine change and would move `openSession`.
  The "labelled as a fixture run" AC is carried by **the slug prefix (`graded-`) plus this README section**,
  and the report says so explicitly rather than implying `run.json` says it.
- **VALIDATE**: `node tooling/build-checks.mjs` green (group 28's no-page-reads-the-bank pin unaffected).
- **SATISFIES**: AC #3's labelling, honestly restated.

### D4 — the PR

- **IMPLEMENT**: `piv-create-pr`. Body **must** carry `Closes #348` ([[prs-dont-auto-close-tickets]] — a
  title mentioning `(#348)` closes nothing). Include the plan, the report and the review in the same PR
  (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`).
- **VALIDATE**: `gh pr view --json body -q .body | grep -c "Closes #348"` = 1.

---

## TESTING STRATEGY

This repo has **no test suite, no linter and no type-check** — do not hunt for or invent one (CLAUDE.md
§Testing). "Done" = run the surface you touched.

### The pure half — build-checks group 33

Every case in A6, each with its mutation. The rule from [[the check that cannot fail]]: **mutate the source,
run the function, don't grep it.** After every mutation, restore and confirm the file's md5 equals the
pre-mutation hash.

### The fenced half — the author run itself

The fence's run-time behaviour is not reachable in CI (group 30 states this for the discovery fence and it
is equally true here). The proof is the author run's own `denied` lines, with `via` naming the site. This is
the same standard `--probe-fence` sets: a paid observation, reported.

### The recorded half — the six packages

Their correctness is `build-checks` group 33's package cases (byte-equality, the matrix arithmetic) plus the
`prd.md`-is-the-projection's-bytes compare that group 32 already runs for its own fixture.

### Edge cases that must be exercised

- A turn that files **no** closing op → `no_close`, counted, not silently dropped.
- A `record_decision` with `off_script: true` → **not** a close → `no_close`, and its filing lands in the
  matrix's "other closing op" column only if something else closed the turn.
- An `open_question` with `source: 'off-script'` → **not** a close.
- Multiple `file_evidence` ops on one turn → counted, never scored.
- An answer text that differs by one byte → hard failure naming the `ref`.
- A 66th answer line (a retried turn) → hard failure naming the duplicate.
- A `closes` field disagreeing with the params → throws (a hand edit detector).
- The draw's Latin-square property broken by a hand edit to `draw.json` → red naming the id.

---

## VALIDATION COMMANDS

### Level 1 — the gate

```bash
node tooling/build-checks.mjs                  # → build ✓  all 33 groups pass
node tooling/drift-check.mjs                   # → ✓
node agent-layer/gen-loc-summary.mjs --check   # → loc summary ✓  3 groups — no drift
```

### Level 2 — the new surfaces, standalone

```bash
node tooling/discovery-score.mjs --check-draw
node tooling/discovery-score.mjs --check-key
node tooling/discovery-score.mjs --selftest        # the five outcomes over the synthetic package
cd portal && node record-graded-answers.mjs --dry --out /tmp/graded-dry
cd portal && node record-graded-run.mjs --slug graded-think-a --posture think --run a --dry
```

### Level 3 — the portal boots and answers

```bash
cd portal && npm start                             # → http://localhost:4747
curl -s localhost:4747/api/health                  # → {"ok":true,…} — check the boot sha is THIS branch
curl -s localhost:4747/api/discovery/config | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c=JSON.parse(s);console.log(c.depths.find(d=>d.id==="whole-bank"),c.postures,Object.keys(c.questions[0]))})'
# → whole-bank count 65 · two postures · NO weakAnswer key on a question
```

### Level 4 — manual, per recorded package

```bash
node tooling/discovery-score.mjs --slug graded-think-a --run a
node tooling/discovery-score.mjs --slug graded-think-a --run a --mvp6
node discovery/prd-projection.mjs graded-think-a --stdout | diff - discovery/graded-think-a/prd.md
node -e "const r=require('./discovery/graded-think-a/run.json'); const f=new Set(r.turnStats.map(t=>t.postureFingerprint)); console.log(r.turnStats.length, [...f])"
# → 65 turns, exactly ONE fingerprint across them
```

### Level 5 — the mutation sweep

Each group 33 case's named mutation, applied, gate run, restored, md5 re-checked.

---

## ACCEPTANCE CRITERIA

Mapped from the ticket, in its order.

- [ ] **AC1 — the key.** 65 × 3 answers with expected closing ops, committed and sealed before any run
      (`docs/epics/fixtures/graded-answers/key.json`, 195 entries, `checkKey` green). The author's fence
      proved: no `discovery/bank.mjs` read, denials in `author-transcript.jsonl` with `via`. **Or** the
      author named as a person who has not read the bank.
- [ ] **AC2 — the realism brief** committed beside the key. K1 carries hedged, ranged and from-memory
      answers; K2 is thin against the question, not merely shorter. Spot-checked and reported.
- [ ] **AC3 — six real runs** through the drawer's own route, `whole-bank` depth, three per posture.
      `answers.jsonl` server-written and **byte-equal** to the sealed answers (`assertAnswersSealed` green
      on every package). Never hand-written, never hand-edited; a bad run is re-run.
- [ ] **AC4 — the score, per posture**, per kind and per stage, with the confusion matrix. **No target set.**
      A prompt tightening on the back of it is a new PR and a re-run, never an edit.
- [ ] **AC5 — MVP 6 read** from the `text` lines: the judge never says an answer is wrong and never supplies
      what is missing, across every recorded turn. Shortlist mechanical, verdict human, both stated.
- [ ] **AC6 — the report states** that the rehearsal runs' op counts are not quality readings, and that this
      score is a form-judgement reading taken under the realism gap.
- [ ] **AC7 (repo)** — `build-checks` 33 groups green; `drift-check` ✓; both fingerprints unmoved and equal
      across every package's `turnStats`; `PROVENANCE_RULE`/`EVIDENCE_RULE`/`PARENT_RULE` untouched.
- [ ] **AC8 (repo)** — PR body carries `Closes #348`; plan, report and review in the same PR.

---

## COMPLETION CHECKLIST

- [ ] Branched from a clean `origin/main`, not the sibling session's branch
- [ ] Phase A committed before a single answer was authored
- [ ] Phase B's key committed before a single run was opened; the seal sha in the report
- [ ] The author's allow-set proved to deny all four leak paths (gate) and observed to deny at run time
      (the author's own `denied` lines)
- [ ] `cwd` equals the author root — source-pinned, mutation-proved
- [ ] The smoke turns ran and were deleted; both fingerprints matched before C2
- [ ] Every recorded package: 65 answers, byte-equal, one fingerprint, `prd.md` the projection's bytes
- [ ] `build ✓  all 33 groups pass` · `drift-check ✓` · `gen-loc-summary --check` clean
- [ ] Every group 33 mutation driven red and restored
- [ ] Nothing under `portal/lib/discovery-postures.mjs` changed
- [ ] Nothing under `discovery/instrument-loans-1/` changed
- [ ] The report names what this is NOT (AC6), and the README section says the packages are fixture runs

---

## OPEN QUESTIONS / ASSUMPTIONS

**Q1 (raise before C0, recommend and proceed) — the driver, or 390 hand-pastes?**
The ticket's AC says "six real runs **through the drawer**" and also that `answers.jsonl` must be
**byte-equal to the sealed answers**. Those two clauses are only jointly satisfiable through a driver: 390
hand-pastes cannot deliver byte-equality, and `appendAnswer` stores verbatim with no normalisation, so a
single stray character is a permanent line in an append-only file.
**Recommendation:** the driver (C0). It POSTs to `/api/discovery/turn` — the *same route* the drawer POSTs
to, with the same `runTurn`, the same guards, the same server write. The honesty contract's target is
hand-*writing* the record, not the transport. Close the "through the drawer" clause cheaply by driving
**turn 1 of run 1 by hand in the browser** and the remaining 389 through the driver, and say exactly that in
the report. The drawer's own path is already observed end to end (`allergen-matrix-1`, 30 turns; run 0's A5).
**If the owner rules for hand-driving:** drop C0, and Phase C becomes six sittings. Everything else stands.

**Q2 (decided in-plan, flag at report time) — the spine has NO field that marks a package as a fixture,
and one of the fields it does have feeds the epic's own hypothesis.**
Two halves of one problem:
- `label` is `LABEL[provenance]` and there is no operator field (`portal/lib/discovery.mjs:449`), so
  `run.json` cannot say "fixture run".
- Worse, the driver must POST `frontEnd: 'portal'` — the only other value is `'terminal'` — and
  `FRONT_ENDS` exists precisely because it is **how the PRD's Switch metric is measured**
  (`portal/lib/discovery.mjs:68`). Six packages stamped `portal` read as UI sessions somebody chose. They
  were neither real nor a choice, and Switch is the hypothesis's RIGHT condition, read row by row at epic
  close-out (#317).

**Decision:** do not add a field — that is a spine change touching `openSession`, and this ticket forbids
prompt and spine edits. The fixture marker is the **`graded-` slug prefix**, and **`discovery/README.md`'s
new section and the report must both state that the six packages are EXCLUDED from any Switch, completion
or not-a-form read**. Flagged loudly rather than silently dropped, because the next reader of these packages
is #317's close-out.

**Q3 (report it, do not solve it) — zero author denials.**
If the author never attempts a fenced read, the transcript is empty of denials and the AC's receipt does not
exist. B2 handles it with an explicit probe question. Whether the probe's refusal counts as "the denials in
the author's transcript" is the owner's read; the report states which happened.

### Assumptions

- **A1** — SDK auth via the Mac CLI login works without `portal/.env` ([[local-agent-visual-gate-notes]];
  confirmed by run 0's A6, where `HAS_TOKEN` was false and `turnStats` populated anyway). **Verified by
  C1's smoke turn before any bulk spend.**
- **A2** — Both fingerprints hold across the whole recording window. No open ticket moves them (#352 is
  `strictMcpConfig`, an SDK option **outside** `fingerprintOf`; #353 is a build-checks label bug). C1
  verifies and C2/C3 re-verify per package. **If a sibling session merges a prompt ticket mid-run, the
  packages recorded after it are on a different surface and must be re-run.**
- **A3** — `open_question` with `source: 'banked'` is what a "don't know yet" answer files. Read off the
  system prompt (`portal/lib/discovery-postures.mjs`: *"The answer says the person does not know yet →
  open_question with source banked"*). K3's expected op rests on this sentence.
- **A4** — The whole-bank run's per-turn cost rises across the run because `ledgerBrief` grows and the
  session is resumed per turn. See §NOTES for the arithmetic. Costs are **expected**, not observed.
- **A5** — `#352`'s `strictMcpConfig` change may alter warmup `denied` line counts in the six packages. It
  does not alter the score (the scorer reads `op` lines only). Sequencing note, not a blocker: land #352
  first if it is close, and say in the report which tree the packages were recorded on.

---

## NOTES (open canvas)

### The cost band, derived rather than quoted

The ticket quotes $0.0496/turn from `my-product-name`. That is a 30-turn **mean** and it understates a
65-turn run, because `ledgerBrief` grows every turn and every turn is a fresh resumed `query()`. The curve
from `discovery/allergen-matrix-1/run.json` (30 turns, `think`, observed):

| Turns | Mean $/turn | Mean duration |
|---|---|---|
| t1-t5 | 0.0707 | 15.6 s |
| t6-t10 | 0.0399 | 16.7 s |
| t11-t15 | 0.0492 | 17.8 s |
| t16-t20 | 0.0524 | 15.5 s |
| t21-t25 | 0.0592 | 15.9 s |
| t26-t30 | 0.0652 | 15.3 s |

t1-t5 is the cold cache. From t6 the slope is **+$0.00126/turn** (derived:
`(0.0652 − 0.0399) / 20`). Extrapolated to 65: turns 1-30 = **$1.683** (observed); turns 31-65 at a
midpoint of ≈$0.090 ≈ **$3.17** (derived) → **≈$4.85 per sonnet whole-bank run**.

Opus 5 at 2.5× per token ($5/$25 vs $2/$10 per Mtok), plus adaptive thinking's extra output → **≈$12 per
opus run (expected, wide)**.

- **C1** 2 turns ≈ **$0.15**
- **C2** 1 sonnet + 1 opus ≈ **$17**
- **C3** 2 sonnet + 2 opus ≈ **$34**
- **Total** ≈ **$51** — meaningfully above the ticket's $34, and the report should say why.

**One conservatism worth naming:** `allergen-matrix-1` filed 30 decisions in 30 turns, so its ledger grew
maximally. This fixture files a decision on roughly a third of turns (K1 only), so its ledger grows slower
and the real figure may land lower. Stated as a band, not a point.

Wall clock, serial (the run lock refuses concurrency): sonnet ≈ 17 min/run at 16 s/turn (derived); opus
untimed, expect 30-45 min. **Six runs ≈ 2.5-3 hours of agent time.**

### F1 — the draw is SHARED across postures, and that is the second axis

`drawFor(seed, ids)` returns **one** `{ id, a, b, c }` table. `graded-think-a` and `graded-opus-a` read the
same column and therefore answer the **same 65 answers**. That is not an accident to be tidied up: it is
what makes the posture comparison mean anything — `portal/lib/discovery-postures.mjs`'s own header says
*"the SAME buildThinkTurn prompt under claude-opus-5, so sonnet and opus can be compared on one answer
set. The model string is the whole difference."* Six columns instead of three would destroy that and no
gate downstream could see it, which is why group 33 case 1 pins `drawFor`'s arity.

Read "three runs per posture" as **three draw columns, each run twice — once per posture.**

### Why the draw is a Latin square with a per-question offset, not a rotation

A plain rotation (`kind = KINDS[(i + r) % 3]`) gives coverage but makes run `a` a perfectly regular
K1,K2,K3,K1,K2,K3 stream. The ticket's own reason for the draw is that *"a uniform stream lets the judge
pattern-match the stream rather than the answer"*, and a regular cycle is the second-most pattern-matchable
thing after a uniform one. Hashing the question id with a committed seed gives a per-question offset that is
irregular in the stream and still a Latin square across the three runs. The seed lives **in `draw.json`**,
so the table is both sealed and re-derivable, and group 33 case 1 checks the committed table against the
recomputation.

### Why five matrix columns and not three

`closes` is not a property of the verb:

| Op | Closes when |
|---|---|
| `record_decision` | `off_script === false` |
| `flag_weak_answer` | always |
| `open_question` | `source === 'banked'` |
| `file_evidence` | never |

So a turn can file a `record_decision` and still not close (an off-script one), and a turn can file nothing
that closes at all. With three columns both vanish from the score and the matrix quietly stops summing to
the turn count. Case 7's mutation is exactly this.

### Alternatives weighed and rejected

- **Author the answers by hand (the owner).** Rejected by the ticket's own control: the owner wrote the
  bank. A person who has not read the bank is the sanctioned alternative and is still open (AC1's second
  branch) — it costs the author run's $2 and buys genuinely human prose, which is the realism gap's real
  fix. Worth offering to the owner; not planned for, because scheduling a person is outside this ticket.
- **One batched author call for all 65 questions.** Cheaper and faster; rejected because a single context
  drifts into one template across the bank, which is the failure mode §THE REALISM GAP exists to prevent.
  65 calls at ~$0.03 is ≈$2 and each question is authored fresh.
- **Score against `weakAnswer` similarity rather than the filed op.** Rejected: it measures the author's
  prose against a note, not the judge's filing. The filed op is the thing MVP 6 makes a claim about.
- **A new `kind` field on `answers.jsonl` recording K1/K2/K3.** Rejected: that is a format change to the
  spine's own file, and the draw already carries the mapping. The scorer joins on `question_id` + the
  committed draw column.
- **Making group 33's package cases hard-required from the first commit.** Rejected: Phase A must be
  committable before Phase C spends a penny, so the package cases gate on `existsSync` and the group's ✓
  line says `pending` until C lands. That is stated in the group line, not hidden.

### Sequencing risk

`#352` (`strictMcpConfig`) and `#353` (a group 30 label bug) are open and a sibling session is on
`chore/352-353-strict-mcp-case-relabel` **in this working directory**. Neither moves a fingerprint, so
neither invalidates a package. But [[owner-merges-fast-verify-landed]] and
[[shared-worktree-parallel-sessions]] both apply: diff `origin/main` before each phase's commit, verify the
branch immediately before committing, and stage by explicit path.

## AMENDMENTS

<!-- Append-only. Newest at the bottom. -->

- **2026-09-02 — the silo question, raised by the owner and decided.** The owner asked whether the fixture's
  195 authored answers could contaminate the real bank and the genuine run packages. Five directions were
  named: C1 the author seeing `weakAnswer` (already fenced) · C2 the **judge** seeing `key.json` · C3 a
  future repo-reading agent learning from deliberately-thin K2 answers · C4 #317's close-out counting six
  fake sessions in the Switch / completion / not-a-form reads · C5 someone later "improving" `bank.mjs`'s
  weak-answer notes **from** the fixture's own K2 prose, which would make the score circular forever and is
  the one nobody would notice.

  **Observed:** nothing in the repo globs `discovery/*/` — every reader names a slug (group 32 hardcodes
  `instrument-loans-1`, `prd-projection.mjs` takes a slug or `--root`, `index.html` uses `spine-meridian-1`
  only as a placeholder). So C3 and C4 are prospective, not live.

  Three boundaries were weighed. **O1**, a third `provenance` value (`fixture`): rejected — provenance
  answers "is the product real?" and a fixture run *is* fictional, so it conflates two axes, and it adds a
  `PROVENANCE_RULE` entry, which is a prompt string under the epic's op-verb lock. **O3**, a `sandbox: true`
  flag redirecting the root to `discovery/_sandbox/<slug>` and stamping `run.json`: makes the boundary a
  filesystem fact (~20 lines, no prompt string, no fingerprint move, drawer untouched) and would also fix
  Q2's "`run.json` cannot say fixture run". **O2**, the `graded-` slug prefix plus `discovery/README.md`:
  a convention, which cannot fail a build.

  **Decision — the owner chose to proceed with the plan as written, so O2 stands** and the spine is not
  touched by this ticket. **O3 is recorded here as the better boundary and is available as its own small
  ticket** if the flat `discovery/` namespace becomes a problem; its one honest limit is that it is
  one-directional (it stops a sandbox run landing in the exhibit namespace; it does not stop someone
  forgetting the flag, which is what case 14 covers).

  **Folded in regardless, because they close real holes and are not a design change:** group 33 cases 12
  (C2 — the judge's fence driven against the key, not assumed), 13 (C5 — the circularity guard) and 14 (C3 —
  no other reader may name a fixture slug). C4 remains carried by prose, in Q2's decision and D3's README
  section.

- **2026-09-02 — the brief pins ONE fictional company, and the defect that forced it.** The brief as first
  committed said *"Between questions you may invent a different one"*, so the 65 questions could describe
  65 different companies. **That is a defect, and the owner's question found it.** `ledgerBrief` renders
  this run's decisions by rung into EVERY turn prompt (`discovery-postures.mjs:204`), and `PARENT_RULE`
  instructs the judge to parent each decision under the rung above it. With 65 unrelated products the
  judge would be asked to file a *solution* decision about one company under a *business* decision about
  another — structurally valid, semantically nonsense — and the score would partly measure its reaction to
  incoherence rather than its judgement of FORM, which is the only thing MVP 6 claims. The projected
  `prd.md` would also be unreadable as a document.

  **Fix:** the brief carries a fact sheet — **Ashvale**, a UK company selling rota and compliance software
  to home-care agencies — and every one of the 195 answers draws on it. Each `query()` is fresh with no
  resume, so the author cannot remember what it said before; the sheet is what makes the answers
  consistent. Eleven anchor facts (four people, eleven agencies, £340/month flat, CareLineLive as the
  incumbent, hours-to-build-a-rota as the metric, revenue-funded, CQC, compliance as the breaking part, a
  model off by default with 4 of 11 opted in, nobody owning onboarding).

  **The sheet is deliberately INCOMPLETE and that is load-bearing.** Where it is silent — willingness to
  pay per feature, why a churned customer left, what a carer does with the app on a shift, how the model
  performs against a coordinator — the company genuinely has not found out, and that is what K3 draws on.
  A complete sheet makes "I do not know yet" unwritable, and K3 is a third of the fixture.

  **Named Ashvale, not Meridian**: `discovery/spine-meridian-1/` already exists and two packages sharing a
  name would be confused on sight. Both worked examples moved onto Ashvale too, so the brief does not tell
  the author to answer about one company and then show it three answers about another. The leak check was
  re-run against every `weakAnswer`'s and every question `text`'s first thirty characters: clean.

- **2026-09-02 — the first author run and what it cost.** Halted at question 28 of 65 on **"Credit balance
  is too low"** with $0.919 spent and NO key written, because the harness sealed only at the end. **No
  partial survived: B2 is a full 65-question re-run, not a resume from 28.** Two defects fixed in `476dd51`
  — an `is_error` result is refused carrying the CLI's own message (a result can wear `subtype: "success"`
  AND `is_error: true`, with the error text as the whole assistant message, which is how a billing failure
  came within one missing `K1:` label of being sealed into the key), and answers now append to
  `key.partial.jsonl` as they land. The partial sits OUTSIDE the author root deliberately: the allow-set is
  `[authorRoot]`, so a file inside it would be readable by the next question's agent, and an author that
  can read its own earlier answers writes to its own template.

  **Cost, corrected.** The plan expected ≈$0.03/question. Observed: **$0.110 on the first, cold call and
  ≈$0.035 in steady state** ($0.919 over 27 questions). The plan's ≈$2 for B2 holds; Phase C's ≈$51 is
  unchanged and remains derived, not observed.

- **2026-09-02 — the author's fence, proved at RUN TIME rather than only from source.** `--probe` is a
  separate harness mode, NOT a question added to the authoring prompt: a prompt mentioning the bank, the
  research file or a rubric would contaminate the 195 answers, which is the one thing this ticket cannot
  afford. Verdict **ALL_FOUR_REFUSED** ($0.052): four leak paths attempted, four refused read off the SDK's
  OWN `is_error`, zero leaked, four `denied` lines written `via PreToolUse`, committed at
  `docs/epics/fixtures/graded-answers/author/transcript.jsonl`. This answers **Q3**: the receipt exists and
  is stronger than an incidental denial during authoring would have been.

  A **fifth leak path the plan did not name** was found and closed: `.mcp.json` registers a
  `codebase-search` MCP server and the author's `cwd` is inside this repo, so a repo-search tool would
  reach every weak-answer note while carrying no path the path-fence inspects. Denied by name at both
  fence sites, and `strictMcpConfig: true` keeps it off the advertised surface. Pinned in group 33 cases 9
  and 10.

- **2026-09-02 — `whole-bank` is machine-facing, and this ticket is its first use.** The bank's own entry
  reads *"a stress test of the bank, not an interview"*, and no committed package has ever used it: the
  four in the repo are `full-discovery` (30), `opening-set` (12) ×3 and `scope-check` (6). The fixture is
  therefore a bigger fiction than any real session will ever be — 65 questions across nine stages about one
  invented company — and the fact sheet was built to sustain that, which is more than a real session
  demands. Worth stating in the final report beside the realism gap.

- **2026-09-02 — raised out of this ticket, filed separately: branch inference.** Asking all 65 in source
  order made it visible that a real session's 30 are a **hardcoded literal** in `bank.mjs` today, and that
  the `branch` — the one selection input that decides WHICH 30 a product gets — is a session-start
  parameter chosen before a single question is asked. MVP 5's other two inputs already adapt (conditional
  modules fire on a predicate over the answers, #283; D5 escalation can step the depth up, #285). Draft
  ticket at `~/.claude/jobs/68f4bcec/tmp/ticket-branch-inference.md`, not yet filed. **Out of scope here**
  and it changes nothing about this fixture, which walks `whole-bank` and branches not at all.
