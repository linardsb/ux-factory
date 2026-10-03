# Feature: the park view on the graded scorer, a blind borderline re-audit, and a labelled read (#506)

The following plan should be complete, but it is important that you validate documentation and codebase patterns
and task sanity before you start implementing. Pay special attention to the names of existing exports in
`tooling/discovery-score.mjs`; import only from the files named here.

## Feature Description

`tooling/discovery-score.mjs` already scores the two committed graded packages (`discovery/graded-think-a`,
`discovery/graded-opus-a`) as a 3×5 matrix. This ticket adds a `--park` view that cuts that matrix along the one
failure #348 found: the judge filing `open_question` (a "park": "you don't know yet") where the sealed key expected
something else. The view lists each miss with the agent's own `reason` text and crosses the K2 misses against a
**new, blind, named borderline set**. That set replaces #348's "11 borderline" K2 answers, which were counted but
never named anywhere.

The deliverable that #508 consumes is the report `.claude/reports/discovery-park-506.md`: the frozen counts per model,
the borderline overlap, and a **session read, labelled as the session's and not the owner's**. The read either says
"no agent-side park change" or names one change, together with its fingerprint cost (which recorded packages a
prompt edit would make stale, and what re-recording them costs).

## User Story

As the owner deciding whether #508 should spend at least $7.55 re-recording packages under a changed park prompt,
I want a deterministic per-model breakdown of every park miss, with the agent's own reason and whether the answer
sat on the K2/K3 boundary,
so that the prompt change #508 carries (or the decision to carry none) rests on named turns rather than a ratio.

## Problem Statement

- The 3×5 matrix gives the ratio. Park precision is 26/38 = 68% on Sonnet and 27/37 = 73% on Opus. Park recall is
  26/28 = 93% and 27/28 = 96% (observed: `--slug … --run a` on d5c7536). The matrix does not say **which** turns were
  mis-parked or **why the agent said** it parked them.
- `discovery/README.md:1102` and `.claude/reports/discovery-graded-answer-fixture-348-report.md:322` both say that
  "7–8 of the K2 mismatches sit inside that band" of 11 borderline K2s. **That figure has no source.** The #348
  auditor's final message names only the 3 "carries" ids and says "11 more are borderline" without listing them.
  The figure was written as "8 mismatches sits inside that band", meaning 8 ≤ 11: it is the parked-K2 count, not an
  id overlap. Verified this session against the #348 session transcript (`50ec50be…` 12:45:30Z) and every text,
  thinking, tool_use and tool_result block in its auditor transcript (`agent-a9eaae280f921babb`).

## Solution Statement

1. **Blind re-audit (owner decision, 2026-10-03).** A read-only subagent with **no tools** gets every question's
   text plus its K1 and K2, inline, in bank order. It returns one verdict per question: `clean`, `borderline` or
   `carries`, the same three classes #348's auditor used. It sees no transcript, no op, no draw and no score, so its
   set cannot be fitted to the misses. Its JSON is committed verbatim as
   `docs/epics/fixtures/graded-answers/borderline.json`, inside a four-key wrapper the session writes.
2. **`--park <slug>`** in the scorer: a pure `parkView(pkg, score, borderline)` plus a printer. The draw column comes
   from the slug's `-a|-b|-c` suffix, as 33.15 already does. `assertAnswersSealed` runs before scoring, exactly as
   the `--slug` path does.
3. **Group 33 case 33.16.** A synthetic package covers every class. `checkBorderline` refuses bad input. On the real
   packages it checks an **invariant that survives #508's re-record**, never the frozen counts.
4. **The report** freezes the counts (they move when #508 re-records) and carries the session read.
5. **README:1102** is corrected to point at #506's numbers. The #348 report is history and stays as committed.

## Out of Scope / Non-Goals

- **No prompt edit.** `discovery-postures.mjs` is not touched; that work is #508's.
- **No paid run.** No `record-*` run and no re-record of any package.
- **No threshold.** The view prints counts, and the read is labelled as a read. The README says "No target is set".
- **Not editing #348's report** (`.claude/reports/discovery-graded-answer-fixture-348-report.md`). It is a historical
  record, and the correction lives in #506's report and the README.
- **Not `-b`/`-c` packages.** `--park` accepts them by suffix, but none is recorded.
- **Not re-sealing the key.** `borderline.json` is a separate file. `key.json` and `draw.json` stay byte-identical.

## Feature Metadata

**Feature Type**: Enhancement (measurement tooling) + a labelled read
**Estimated Complexity**: Medium. About 130 lines of code, one new fixture file, and one subagent audit.
**Primary Systems Affected**: `tooling/discovery-score.mjs`, `tooling/build-checks.mjs` (group 33), `.claude/references/gates.md`, `discovery/README.md`, `docs/epics/fixtures/graded-answers/`
**Dependencies**: none new. Node built-ins and `discovery/` modules only (33.11).

## Related Work

**Implements**: #506 · **Epic**: #504 (`gh issue view 504`; rules R1–R5). No architecture doc: #504 says decisions
land as amendments to `docs/epics/discovery-partner.prd.md`, and this ticket makes none.

**Back-references**:
- `.claude/plans/discovery-graded-answer-fixture-348.md`: the scorer, key, draw and group 33 this extends.
- `.claude/reports/discovery-graded-answer-fixture-348-report.md:160-166, 318-326`: the unsourced borderline claim.
- `.claude/plans/discovery-re-ask-brief-366.md`: the size calibration the ticket cites.

**Forward-references**:
- #508 reads this report's recommendation and fingerprint-cost table. It must merge **after** this ticket, because
  #508 re-records both graded packages and the counts here are frozen against d5c7536's recordings.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

Line numbers are on `origin/main` @ `d5c7536`. **The session's current branch (`fix/importer-reads-icon-name-449`)
is behind main and carries an unrelated modified SKILL.md. Branch from `origin/main`.**

- `tooling/discovery-score.mjs` (all 447 lines). Key parts:
  - 1-48: the header. Its CLI usage block gets one new line.
  - 60-62: `FIXTURE_DIR`, `DRAW_PATH`, `KEY_PATH`; mirror these for `BORDERLINE_PATH`.
  - 153-186: `checkKey`, the exact-key-set validator to mirror for `checkBorderline`.
  - 246-279: `scorePackage`. Its `rows` carry `turn, ref, question_id, stage, kind, expected, filed, column, outcome`.
  - 315-316: `readDraw`/`readKey`.
  - 320-336: `readGradedPackage`, whose `.ops` drop `type`/`ts`.
  - 342-365: `printScore`, the printing idiom (`pad`).
  - 390-447: the CLI `else if` chain.
- `tooling/build-checks.mjs`:
  - 316-321: the import list from `./discovery-score.mjs`. Add `parkView`, `checkBorderline`, `PARK_CLASSES`,
    `BORDERLINE_VERDICTS`.
  - 10397-10407: group 33's block-local helpers (`threw33`, `same33`, `IDS`, `FIXTURE`, `GRADED_SLUGS`, `decomment`,
    `pending33`).
  - 10524-10560: 33.7, the synthetic-package pattern (`rec`, `pkg`, `draw`, `keyIndex`) to MIRROR.
  - 10658-10671: 33.11, the purity pin. The new code must hold no `Date.now()`, `new Date(`, `Math.random()`,
    `writeFileSync`, `appendFileSync`, `mkdirSync` or `rmSync`, comments included only if they are NOT whole-line.
    `decomment` strips whole-line `//` comments only.
  - 10734-10750: 33.14, the slug sweep. It is unaffected because `tooling/discovery-score.mjs` is exempt, and the
    new case lives in `build-checks.mjs`, which is also exempt.
  - 10752-10797: 33.15, the real-package loop to MIRROR for the 33.16 invariant (`run = slug.slice(-1)`,
    `readGradedPackage`, `assertAnswersSealed`, `scorePackage`).
  - 10799: the `group("graded fixture", …)` string, one of the three prose copies.
- `.claude/references/gates.md:55`: the group 33 prose, the second copy.
- `discovery/README.md:1066-1104`: §The graded answer fixture. Line 1102 holds the sentence to correct.
- `portal/lib/discovery-postures.mjs`, read only, for the read and the cost table:
  - :174 `PARK_RULE`, the drawer-only park.
  - :230 `AUDIT_VERDICT_RULE`.
  - :327 `TOOL_DESCRIPTIONS.open_question`.
  - :349 Think's park line in `systemFor`.
  - :388 the audit refuses the drawer park.
  - :504 `sharedVocabulary`, interpolated at :592 (Create PRD), :662 (Grill interview) and :701 (Grill audit).
  - :697 `AUDIT_VERDICT_RULE` in the audit template.
  - :806-809 `fingerprintOf`, which hashes `JSON.stringify(TOOL_DESCRIPTIONS)` into every stamp.
  - :829-856 the four postures `think`, `think-opus`, `create-prd`, `grill`.
- `tooling/build-checks.mjs:10347`: 32.7's live-compared list (`instrument-loans-1`, `graded-opus-a`,
  `partner-audit-1/2/3`). `graded-think-a` is compared by 33.15. `:8409` is 30.32, which pins the audit build.

### New Files to Create

- `docs/epics/fixtures/graded-answers/borderline.json`: the blind re-audit's verdicts, committed verbatim.
- `.claude/reports/discovery-park-506.md`: the counts, the overlap, the cost table and the labelled session read.
- `.claude/plans/discovery-park-scorer-506.html`: the build brief (already written beside this plan).

### Relevant Documentation

None external. Everything is in-repo. `discovery/README.md` §The graded answer fixture defines K1/K2/K3, and
`docs/epics/fixtures/graded-answers/brief.md` is the answer author's spec. Read it to word the audit's definition
of "borderline", but **do not** paste its fact sheet into the audit prompt.

### Patterns to Follow

**Exact-key-set validation** (`discovery-score.mjs:159-186`, `checkKey`): reject a non-object, any unknown key and
any missing key, and make every message name the offender. Prefix messages with `discovery-score: ` via `bad()`
(`:64`), and return an index `Map`.

**Frozen vocab** (`:69`, `:78`): `export const X = Object.freeze([...])`.

**Pure function plus filesystem half** (`:244-245`): `parkView` takes no fs. The CLI reads the files.

**Printing** (`:342-365`): `console.log` with `pad(s, n)` and two-space indents. The closing line states that no
target is set.

**Group 33 case style** (`build-checks.mjs:10524-10560`): a numbered header comment naming the mutation, a block
scope, `ok(cond, "33.N: message")`, and the `33.N positive control:` wording for controls.

---

## IMPLEMENTATION PLAN

### Phase 0: Branch
Parallel sessions share the primary tree, and it carries an unrelated modified `SKILL.md`, so do NOT
`git switch` there. Make a dedicated worktree instead:
`git fetch && git worktree add -b feat/506-park-scorer ../ux-factory-wt-506 origin/main && (cd ../ux-factory-wt-506/tooling/icons && npm ci)`.
Copy the untracked plan and brief into it: `.claude/plans/discovery-park-scorer-506.{md,html}`. Stage only by
explicit path. Check: `git log --oneline -1` shows `d5c7536` or a later commit. If main has moved, re-run the Phase-2 VALIDATEs and compare them with the observed numbers below
before trusting the frozen counts. **If either graded package's `run.json` changed, stop.** #508 may have landed.

### Phase 1: The blind borderline re-audit (data first, so the code is built against the real file)
Build the prompt from `key.json` plus the bank (question `text` only, never `weakAnswer` or `note`). Dispatch one
subagent with no tools, save its JSON verbatim inside the wrapper, and check the transcript for zero tool calls.

### Phase 2: The scorer
**Depends on:** Phase 1 only for the CLI read of `borderline.json`. `parkView`'s pure half can be written in
parallel.
Add `BORDERLINE_PATH`, `BORDERLINE_VERDICTS`, `checkBorderline`, `readBorderline`, `PARK_CLASSES`, `parkView`,
`printPark`, the `--park` CLI branch and a header usage line.

### Phase 3: The gate
Add case 33.16 and update the three prose copies.

### Phase 4: Report + README
**Depends on:** Phases 1–2 (the numbers).
Write the report and correct README:1102.

---

## STEP-BY-STEP TASKS

### T1 CREATE the audit prompt (scratchpad only, never committed as `.mjs`)

- **IMPLEMENT**: from the branch root, write the prompt as **five batch files of 13 questions each** (bank order,
  questions 1–13, 14–26, 27–39, 40–52, 53–65) to the session scratchpad. They go there rather than the repo, so
  drift-check's `node --check` sweep never sees a stray file. A 13-object JSON reply is far less likely to come back
  malformed than a 65-object one, and a failed batch is re-run alone. Questions are judged independently, so
  batching changes nothing about the verdicts.
  ```bash
  node --input-type=module -e '
  import { readFileSync, writeFileSync } from "node:fs";
  import { selectDepth } from "./discovery/bank.mjs";
  const key = JSON.parse(readFileSync("docs/epics/fixtures/graded-answers/key.json", "utf8"));
  const ans = (id, k) => key.entries.find((e) => e.question_id === id && e.kind === k).answer;
  const qs = selectDepth("whole-bank");
  const pre = readFileSync(process.argv[1] + "/borderline-preamble.txt", "utf8");
  for (let b = 0; b < 5; b++) {
    const part = qs.slice(b * 13, b * 13 + 13);
    const body = part.map((q) => `### ${q.id} (stage ${q.stage})\nQUESTION: ${q.text}\nK1: ${ans(q.id, "K1")}\nK2: ${ans(q.id, "K2")}`).join("\n\n");
    writeFileSync(`${process.argv[1]}/borderline-batch-${b + 1}.txt`, pre.replaceAll("<N>", String(part.length)) + "\n\n" + body + "\n");
  }
  ' "$SCRATCH"
  ```
  `$SCRATCH/borderline-preamble.txt` holds this preamble, verbatim:
  ```text
  You are auditing a fixture of interview answers. Use NO tools: everything you need is below, and you must not
  read, search or run anything. Answer from this text alone.

  Each of the <N> questions below has two answers written for a fictional company. K1 is meant to CARRY what the
  question asks for, often imperfectly. K2 is meant to be THIN: on-topic, but without the thing the question
  reaches for.

  For EACH question, first decide which ONE slot the question reaches for (a number, a person, a date, a named
  alternative, a cost, a criterion), then read K2 against that slot only. Restating the company's general facts
  does not fill a slot. Give K2 exactly one verdict:
  - "clean": K2 does not fill the slot. It is thin.
  - "borderline": K2 takes the easy half of the question and refuses the hard half, or fills the slot so vaguely
    that a careful reader could fairly call it either thin or not-known-yet.
  - "carries": K2 fills the slot with a checkable, responsive fact, so it is as good as K1 minus a detail.
  Use K1 only as the comparison for "carries". There is no target count. Judge each question on its own.

  Return ONLY a JSON array, with no prose and no code fence before or after it, of exactly <N> objects, one per
  question, in the order given:
  {"question_id": "<id>", "verdict": "clean" | "borderline" | "carries", "why": "<one sentence naming the slot and what K2 does with it>"}
  ```
- **PATTERN**: the #348 auditor's slot-first method (its prompt and output are in session transcript
  `50ec50be-cb0d-4097-b431-f384168b2f7d/subagents/agent-a9eaae280f921babb.jsonl`). This prompt adds the blindness:
  no file access, no K3, no draw.
- **GOTCHA**: do NOT include the draw column, any transcript or prd.md content, any count from this plan, or any
  mention of a prior borderline count. The headers carry the question id, not a running number, so no "11" appears
  by accident. The auditor must not learn which K2s were in run `a` or which were parked. Do not include
  `weakAnswer`: those notes are the bank's own definition of thin, and 33.13 exists so the key never converges on
  them by construction.
- **VALIDATE**: `cat "$SCRATCH"/borderline-batch-*.txt | grep -c '^### '` → `65`, and
  `grep -c '^### ' "$SCRATCH"/borderline-batch-*.txt` → `13` per file (expected).
  `cat "$SCRATCH"/borderline-batch-*.txt | grep -ciE 'graded-|open_question|parked|weakAnswer|borderline count'` → `0`
  (expected). A key answer could in principle contain "parked", so if the count is non-zero, read the hit before
  acting; the auditor must not be told the result, but the answers themselves may use the word.
- **SATISFIES**: AC #3 (the borderline overlap).
- **REGENERATES**: none.

### T2 DISPATCH the auditors and commit the primary's verdicts verbatim

- **IMPLEMENT**:
  1. **Primary auditor, on a model that judged neither package.** The judges were `claude-sonnet-5` and
     `claude-opus-5`. Dispatch five `Agent` calls in ONE message, one per batch file, each with
     `subagent_type: "general-purpose"`, `model: "fable"` and the batch file's full contents as the prompt. Save
     each reply verbatim to `$SCRATCH/borderline-raw-<b>.txt`.
  2. **Cross-check auditor.** Dispatch the same five prompts again with `model: "haiku"`, saved to
     `$SCRATCH/borderline-xcheck-<b>.txt`. It is never committed. It exists only to measure how much the verdicts
     depend on which model reads them (R1 below).
  3. **Validate every reply before anything is written.** Use the stand-alone check below, which needs no T3 code.
     The `id list` is that batch's 13 question ids in bank order.
     ```bash
     node --input-type=module -e '
     import { readFileSync } from "node:fs";
     import { selectDepth } from "./discovery/bank.mjs";
     const [file, b] = process.argv.slice(1);
     const want = selectDepth("whole-bank").slice((b - 1) * 13, b * 13).map((q) => q.id);
     const got = JSON.parse(readFileSync(file, "utf8").trim());
     const V = ["clean", "borderline", "carries"];
     if (!Array.isArray(got) || got.length !== want.length) throw new Error(`batch ${b}: ${got?.length} entries, not ${want.length}`);
     got.forEach((e, i) => {
       const keys = Object.keys(e).sort().join(",");
       if (keys !== "question_id,verdict,why") throw new Error(`batch ${b} entry ${i}: keys ${keys}`);
       if (e.question_id !== want[i]) throw new Error(`batch ${b} entry ${i}: ${e.question_id}, want ${want[i]}`);
       if (!V.includes(e.verdict)) throw new Error(`batch ${b} entry ${i}: verdict ${e.verdict}`);
       if (typeof e.why !== "string" || !e.why.trim()) throw new Error(`batch ${b} entry ${i}: empty why`);
     });
     console.log(`batch ${b} ✓ ${got.length}`);
     ' "$SCRATCH/borderline-raw-1.txt" 1
     ```
     Run it for all five primary files and all five cross-check files.
  4. **Assemble.** Write `docs/epics/fixtures/graded-answers/borderline.json` as exactly
     `{ "generatedFor": "#506", "method": "<one sentence: blind slot-first audit of all 65 K2 answers against question text and K1, in five batches of 13, no tool use, no transcript, draw or score shown>", "auditor": "fable (Agent tool model param), no tools used", "entries": [...batch1, ...batch5] }`,
     re-serialised with 2-space indent and a trailing newline. The session writes the wrapper and the concatenation.
     Every entry is the agent's, unedited.
- **GOTCHA**: honesty contract (CLAUDE.md §Ground rules): **never hand-edit an entry**.
  - If a reply fails the step-3 check, re-dispatch THAT batch with the same prompt and the same model.
  - The only allowed transformation is stripping a wrapping code fence (```json … ```), done mechanically by
    removing the first and last line. Record it per batch in the report.
  - Allow up to 3 attempts per batch. All attempts are recorded in the report, failed ones included.
  - Re-serialising is not an edit; changing a string is.
  - Fallback if a batch fails 3 times: split it into 13 one-question prompts, reusing the same preamble with
    `<N>` = 1. That cannot fail on length, and it keeps the same judging rule.
- **VALIDATE** (blindness receipt): each `Agent` result names its agent id. For each of the ten ids:
  `f=$(ls ~/.claude/projects/-Users-Berzins-Desktop-Linards-current-ux-factory/*/subagents/agent-<id>.jsonl)` then
  `node -e 'const L=require("fs").readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean).map(JSON.parse);console.log(L.flatMap(x=>Array.isArray(x.message?.content)?x.message.content:[]).filter(b=>b.type==="tool_use").length)' "$f"` → `0`.
  Record every agent id, its model and this count in the report. A non-zero count voids that batch. Re-dispatch it
  and count it as an attempt.
- **VALIDATE** (assembled file): `node -e 'const b=require("./docs/epics/fixtures/graded-answers/borderline.json");console.log(b.entries.length, new Set(b.entries.map(e=>e.question_id)).size, [...new Set(b.entries.map(e=>e.verdict))].sort())'`
  → `65 65 [ … ]`, a subset of `borderline, carries, clean` (expected).
- **VALIDATE** (cross-check agreement, for R1): count the ids where fable and haiku give the same verdict, as
  `agree/65`. List every disagreement on an id that is a K2 row in run `a` (T5's view prints those ids). Both
  numbers go in the report's overlap section, and the read must say whether its conclusion survives using haiku's
  set instead. Run `--park` once with haiku's set in a scratch copy of the file
  (`BORDERLINE_PATH` stays the committed one: write haiku's entries inside the same four-key wrapper over the committed file, run `--park` for both slugs, restore with `git checkout -- docs/epics/fixtures/graded-answers/borderline.json`, then `git diff --exit-code` the fixture).
- **SATISFIES**: AC #3.
- **REGENERATES**: none. `docs/` is outside every loc-summary group (observed: `node agent-layer/gen-loc-summary.mjs --check` → `3 groups — no drift`).

### T3 ADD the borderline vocabulary, validator and reader to `tooling/discovery-score.mjs`

- **IMPLEMENT**:
  - After `KEY_PATH` (`:62`), add `export const BORDERLINE_PATH = join(FIXTURE_DIR, "borderline.json");`.
  - After `OUTCOMES` (`:98`), add `export const BORDERLINE_VERDICTS = Object.freeze(["clean", "borderline", "carries"]);`.
  - After `checkKey`, add `export function checkBorderline(list, ids)`, mirroring `checkKey`. The wrapper keys are
    exactly `generatedFor, method, auditor, entries`. Each entry is exactly `question_id, verdict, why`, with
    `verdict ∈ BORDERLINE_VERDICTS` and `why` a non-empty string. There is one entry per id, with no unknown or
    duplicate ids. It returns `Map<question_id, verdict>`.
  - Beside `readKey` (`:316`), add `export const readBorderline = () => readJson(BORDERLINE_PATH);`.
  - Give the new block a header comment that says: the set is a blind re-audit's read (#506), **not** #348's
    unnamed 11; it is K2-only by construction; it is a separate file because `key.json` is sealed.
- **PATTERN**: `discovery-score.mjs:153-186`.
- **GOTCHA**: 33.11. No `new Date(`, even inside a string. Messages go through `bad()`.
- **VALIDATE**: `node -e 'import("./tooling/discovery-score.mjs").then(async m=>{const {selectDepth}=await import("./discovery/bank.mjs");console.log(m.checkBorderline(m.readBorderline(),selectDepth("whole-bank").map(q=>q.id)).size)})'` → `65` (expected).
- **SATISFIES**: AC #1, AC #2.
- **REGENERATES**: none.

### T4 ADD `PARK_CLASSES` and the pure `parkView`

- **IMPLEMENT** (after `scorePackage`):
  ```js
  // The park view (#506). Three confusion classes cut from the same rows scorePackage returns:
  //   a   K3 → not parked   the person said "don't know yet" and the judge filed something else
  //   b   K2 → parked       a thin answer the key expected flagged
  //   bPrime (printed "b′")  K1 → parked   an answer that carries its form, which the key expected recorded
  export const PARK_CLASSES = Object.freeze({
    a: Object.freeze({ kind: "K3", parked: false, label: "a" }),
    b: Object.freeze({ kind: "K2", parked: true, label: "b" }),
    bPrime: Object.freeze({ kind: "K1", parked: true, label: "b′" }),
  });
  export function parkView(pkg, score, borderline) { … }
  ```
  `parkView` returns:
  - `parks`: a COUNT (an integer) of rows with `filed === "open_question"`.
  - `k3`: count of K3 rows. `k3Parked`: K3 rows that were parked.
  - `precision: { num: k3Parked, den: parks }` and `recall: { num: k3Parked, den: k3 }`, both as integers. The
    printer formats the percentage with `Math.round`.
  - The keys are ASCII (`a`, `b`, `bPrime`), so no code ever has to type U+2032. The printer prints `label`, so the
    output still reads "b′" as the ticket names it.
  - `classes`: for each `PARK_CLASSES` key, the matching rows, each as
    `{ ref, question_id, stage, filed, why, band }`. `why` is the filing op's own text:
    - `params.reason` for `open_question`;
    - `params.missing.join("; ")` for `flag_weak_answer`;
    - `params.wrong_if` for `record_decision`;
    - `null` when nothing closed.
    Find the op via `pkg.ops.find((o) => o.turn === row.turn && o.op === row.filed && CLOSES_WHEN[o.op](o.params))`.
    `band` is `borderline.get(question_id)` for K2 rows and `null` for K1 and K3 rows. The set is K2-only, so a K1
    or K3 row is never "in band".
  - `k2`: the K2 rows' band counts (`{ clean, borderline, carries }`) and the K2 misses' band counts. A K2 miss is
    any K2 row with `outcome !== "match"`, which takes in K2→park and K2→record alike.
  - It throws via `bad()` if `borderline` lacks a K2 row's id. `checkBorderline` makes that unreachable, so the
    throw only guards against misuse.
- **GOTCHA**: the `why` lookup must re-check closing (via `CLOSES_WHEN`). A turn can hold an off-script
  `open_question` that does not close it, and the closing op is the one `closingOpOf` chose. Only one closer exists
  per turn, because `closingOpOf` throws otherwise.
- **VALIDATE**: covered by T7's synthetic case and by T6's CLI.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

### T5 ADD `printPark` and the `--park` CLI branch

- **IMPLEMENT**:
  - `printPark(slug, model, view)` prints:
    - a title line: `park  <slug>  ·  <model>  ·  run column <r>  ·  <turns> turns`;
    - `parks <n> · K3 <n> · precision k3Parked/parks (NN%) · recall k3Parked/k3 (NN%)`;
    - per class, `class <label>  <kind> → <parked|not parked>  <count>`, then one indented line per row:
      `<ref>  <question_id>  stage <s>  filed <verb>  [band <v>]  — <why>`;
    - the borderline block: `K2 turns <n>: clean x · borderline y · carries z`, and
      `K2 misses <m>: clean · borderline · carries`;
    - a closing line: `The borderline set is a blind re-audit's read (borderline.json), not a key. The score supplies counts, never the verdict; no threshold is set.`
  - CLI branch: put it **before** `else if (flag("--slug") || flag("--root"))` (`:428`), as
    `else if (argv.includes("--park")) { … }`. Steps:
    1. `const slug = flag("--park")`. Refuse when it is missing or starts with `--`, using the usage message.
    2. `const run = RUNS.find((r) => slug.endsWith(`-${r}`))`. Refuse with
       `--park reads the draw column from the slug's -a/-b/-c suffix` when it is undefined.
    3. `checkDraw`, `checkKey`, `checkBorderline` and `readGradedPackage(join(ROOT, "discovery", slug))`.
    4. `depthIds` from `pkg.run.depth`, then `assertAnswersSealed`.
    5. `scorePackage`, `parkView`, `printPark`.
  - Add `--park <slug>` to the usage string at `:441`, and add one header usage line after `:48`:
    `//   node tooling/discovery-score.mjs --park <slug>             the park view: misses by class, with the agent's reason`.
- **GOTCHA**: 33.14 exempts this file, so naming a slug in a comment is fine here, but keep the code generic. The
  header usage line must stay a whole-line comment. `decomment` keeps trailing comments, and 33.11's patterns
  would read one.
- **VALIDATE** (the counts were observed this session with a probe over the same functions at d5c7536; T5's printer
  must reproduce them):
  - `node tooling/discovery-score.mjs --park graded-think-a` → `claude-sonnet-5`, parks 38, precision 26/38 (68%),
    recall 26/28 (93%).
    - class a: 2 (a18 `s3-deliberately-not-doing`, a46 `s7-kill-state-and-date`, both `flag_weak_answer`).
    - class b: 8 (a14, a17, a31, a32, a42, a44, a52, a61).
    - class b′: 4 (a27, a28, a34, a58).
  - `node tooling/discovery-score.mjs --park graded-opus-a` → `claude-opus-5`, parks 37, precision 27/37 (73%),
    recall 27/28 (96%).
    - class a: 1 (a18).
    - class b: 7 (a14, a17, a31, a42, a44, a51, a52).
    - class b′: 3 (a27, a28, a35).
  - Determinism: `diff <(node tooling/discovery-score.mjs --park graded-think-a) <(node tooling/discovery-score.mjs --park graded-think-a)` → empty. Then `git status --porcelain` → unchanged, so the view writes nothing.
  - Refusals:
    - `node tooling/discovery-score.mjs --park` → exit 1 with the usage message.
    - `node tooling/discovery-score.mjs --park nosuchslug-a` → exit 1 with `no run.json at …`.
    - `node tooling/discovery-score.mjs --park graded-think` → exit 1 naming the suffix rule.
- **SATISFIES**: AC #1.
- **REGENERATES**: none. `tooling/` is outside loc-summary.

### T6 RUN the existing scorer paths unchanged

- **VALIDATE**:
  - `node tooling/discovery-score.mjs --slug graded-think-a --run a` → the matrix observed at d5c7536:
    K1 `14 1 4 0 0`, K2 `2 8 8 0 0`, K3 `0 2 26 0 0`, sum 65.
  - Opus: K1 `14 2 3 0 0`, K2 `0 11 7 0 0`, K3 `0 1 27 0 0`.
  - `--selftest`, `--check-draw` and `--check-key` → `✓`.
- **SATISFIES**: no regression (AC #5).
- **REGENERATES**: none.

### T7 ADD case 33.16 to `tooling/build-checks.mjs` and extend the import list

- **IMPLEMENT**:
  - Add `BORDERLINE_VERDICTS, checkBorderline, PARK_CLASSES, parkView` to the import at `:316-321`. The list there
    is alphabetical-ish, so match it.
  - Add 33.16 directly after 33.15's block (before `group("graded fixture"…)`), with a header comment naming its
    mutations. Its parts:
    - **(a) Synthetic package, every class.** Use 33.7's `rec`/`pkg`/`draw`/`keyIndex` shape with six real bank
      ids `IDS.slice(0, 6)`. The draw assigns the kinds explicitly, `a: ["K1","K1","K2","K2","K3","K3"][i]`, so the
      classes are certain rather than derived from a rotation. Ops:
      - t1 K1 `record_decision` (match);
      - t2 K1 `open_question` banked (b′);
      - t3 K2 `open_question` banked (b);
      - t4 K2 `record_decision` (K2 miss, not a park);
      - t5 K3 `flag_weak_answer` (a);
      - t6 K3 `open_question` banked (match).

      Borderline map: `IDS[2] → "borderline"`, `IDS[3] → "clean"`, every other id `"clean"`. Assert:
      - `classes.a` is `[t5]`, `classes.b` is `[t3]` and `classes.bPrime` is `[t2]`, compared by ref;
      - `parks === 3`, `precision {1,3}`, `recall {1,2}`;
      - t3's `why` equals its op's `reason`, and t5's `why` equals its `missing` joined;
      - `band` is `"borderline"` on t3 and `null` on t2 and t5;
      - K2 misses `{ clean: 1, borderline: 1, carries: 0 }`, which counts t4.
    - **(b) `checkBorderline` refusals**, `threw33` plus a message regex as in 33.3. Cases:
      - an unknown wrapper key;
      - a missing `entries`;
      - 64 entries;
      - a duplicate id;
      - an unknown id;
      - a verdict `"thin"`;
      - an empty `why`;
      - an unknown entry key.

      Positive control: a well-formed 65-entry list built from `IDS` validates, and `.size === 65`.
    - **(c) The committed file**: `checkBorderline(JSON.parse(readFileSync(join(FIXTURE, "borderline.json"))), IDS)`
      does not throw. It is **required** (it fails by name when absent), like 33.15's `REQUIRED`.
    - **(d) The re-record-proof invariant on every present graded package.** Loop like 33.15. For each package:
      1. Count the banked parks straight from the transcript:
         `pkg.ops.filter((o) => o.op === "open_question" && CLOSES_WHEN.open_question(o.params)).length`.
      2. Assert `classes.b.length + classes.bPrime.length + view.k3Parked === thatCount`.
      3. Assert `classes.a.length + view.k3Parked === view.k3`.

      Name no counts in the case. They move when #508 re-records, and the report is where they are frozen.
- **GOTCHA**:
  - Assert once that `Object.keys(PARK_CLASSES)` is exactly `["a","b","bPrime"]`, and that the labels are
    `["a","b","b′"]`. A fourth class, or a renamed one, then fails by name.
  - Group 33's helpers are block-scoped. Put 33.16 inside the same `{ … }` as 33.1–33.15.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "graded fixture|^build [✓✗]"` → `graded fixture ✓`, and
  `build ✓` once `tooling/icons` has `npm ci`. On a fresh worktree, group 41 (icons) fails on a missing
  `tooling/icons/node_modules`. That failure was observed on clean d5c7536 and is an environment gap, not a
  regression (memory: local-agent-visual-gate-notes).
- **REDDENS** (drive each one, observe red, then revert):
  1. In `parkView`, drop the b′ class, for example by changing `bPrime`'s `kind` to `"K9"`. Then (a) goes red with
     `33.16: classes.bPrime…`, and (d) goes red on both real packages, because the sums fall short by 4 (Sonnet:
     34 ≠ 38) and by 3 (Opus: 34 ≠ 37). Derived from the observed b′ counts.
  2. In `parkView`, set `band` for K1 rows too. Then (a) goes red, because t2's band must be `null`.
  3. Change `checkBorderline` to accept any verdict. Then (b)'s `"thin"` case goes red.
  4. Move `borderline.json` aside. Then (c) goes red, naming the file.
- **SATISFIES**: AC #1 and AC #5. AC #2 is kept green: the case lives in build-checks, which is exempt from 33.14.
- **REGENERATES**: none.

### T8 UPDATE the three prose copies of group 33

- **IMPLEMENT**: one clause, added identically in substance to all three copies:
  - the `group("graded fixture", …)` string (`build-checks.mjs:10799`);
  - `.claude/references/gates.md:55`;
  - the group-33 header comment (`build-checks.mjs:10376-10396`).

  The clause reads: "the park view (#506): every class over a synthetic package with a K2 park, a K1 park and a
  flagged K3, the borderline validator's eight refusals, the committed blind re-audit required, and on each
  recorded package the classes re-summed against the banked `open_question` count taken straight from its
  transcript". Add to each copy's cannot-reach clause: "nor whether a parked K2 was a mis-grade or an answer on
  the boundary: the borderline set is a blind re-audit's read, not a key".
- **GOTCHA**: memory gate-prose-has-three-copies says to grep all three before declaring done:
  `grep -n "park view" tooling/build-checks.mjs .claude/references/gates.md` → at least 3 hits.
- **VALIDATE**: that grep, plus `node tooling/build-checks.mjs` green for group 33.
- **SATISFIES**: AC #5 (gate documentation stays true).
- **REGENERATES**: none.

### T9 CORRECT `discovery/README.md:1102`

- **IMPLEMENT**: keep "the substance audit flagged 11 of 65 K2 answers as borderline". Replace "and 7–8 of the K2
  mismatches sit inside that band" with a short statement of three facts:
  - the 11 ids were never recorded;
  - the 7–8 was the count of parked K2 turns, not an overlap;
  - #506 re-audited all 65 K2s blind (`docs/epics/fixtures/graded-answers/borderline.json`) and the overlap is in
    `.claude/reports/discovery-park-506.md`.

  Add `    node tooling/discovery-score.mjs --park graded-think-a      # the park view; the read is the report's` after README:1169 (the scorer's command block at :1161-1169, observed).
- **GOTCHA**: build-checks pins none of this README text (`grep -n "borderline\|softest seam" tooling/build-checks.mjs`
  → no hits, observed). Do not touch the #348 report.
- **VALIDATE**: `grep -n "7–8" discovery/README.md` → no hits (expected).
- **SATISFIES**: AC #3 (the borderline overlap is stated truthfully).
- **REGENERATES**: none.

### T10 WRITE `.claude/reports/discovery-park-506.md`

- **IMPLEMENT**: sections:
  1. **Provenance**: tree SHA, the two packages, their fingerprints (`7efdde37…` think, `cadb3811…` think-opus) and
     the statement "frozen before #508 re-records".
  2. **Counts per model**: paste both `--park` outputs verbatim, and a precision/recall table.
  3. **Borderline overlap**:
     - the re-audit's counts by verdict;
     - the K2 rows and K2 misses by band;
     - the correction of the "7–8" figure and its evidence (the #348 session transcript and the auditor transcript);
     - the blindness receipt (agent id, model, 0 tool calls);
     - the audit prompt preamble, verbatim.
  4. **Fingerprint cost**: the table below, re-derived on the final tree.
  5. **Session read**: headed `## Session read — written by the implementing session, not the owner's verdict`.
     - Ground it only in the class rows and their `why` text. Name the pattern(s) you see in the agent's park
       reasons. Two examples from the probe: "sits with Dan" / "wasn't party to", which defer to a colleague, and
       "No … figure is given", which is flag language filed as a park.
     - Compare the patterns against the wording of `:349`/`:514` ("The answer says the person does not know yet →
       open_question").
     - End with exactly one of two outcomes: "no agent-side park change", or one named change to ONE of
       `TOOL_DESCRIPTIONS.open_question`, `systemFor`, `sharedVocabulary` or `AUDIT_VERDICT_RULE`, with its cost row.
     - State what the read cannot separate: a mis-grade from a boundary answer, and the realism gap (README).
     - Use no threshold.
  6. **Not run**: the paid and owner-only table.
- **Fingerprint cost table** (derived this session from `fingerprintOf` at `:806-809`, the four posture templates,
  32.7's list at `:10347`, 33.15, and `costUsd` summed over distinct turns in each `run.json`):

  | Change surface | Stamps moved | Live-compared packages to re-record | Recorded cost | Hardcoded literals to rewrite in `tooling/build-checks.mjs` |
  |---|---|---|---|---|
  | `TOOL_DESCRIPTIONS.open_question` (:327) | all four (think, think-opus, create-prd, grill) and Grill-on-Opus | instrument-loans-1 $0.42, graded-think-a $3.24, graded-opus-a $3.89, partner-audit-1/2/3 $0.16+$1.62+$2.07 | **$11.40** | :8334, :8949-8953 (30.46 carriers count `=== 7`), :8960, :8964, :8968, :16269 |
  | `systemFor` (:349) | think, think-opus | instrument-loans-1, graded-think-a, graded-opus-a | **$7.55** | :8334, :8949, :8950, :8952-8953 |
  | `sharedVocabulary` (:514) | create-prd, grill, Grill-on-Opus | partner-audit-1/2/3 (no create-prd package is live-compared) | **$3.85**; it does not touch the graded fixture, so it cannot be measured on it | :8960, :8964, :8968, :16269 |
  | `AUDIT_VERDICT_RULE` (:230) | grill, Grill-on-Opus | partner-audit-1/2/3 | **$3.85** | :8960, :8964, :16269, plus 30.32 (:8409), which pins the rule word for word |

  **Derive, don't copy.** Before writing the read, re-derive the table on the implementing tree with the two
  commands below, and paste their output into the report under the table. If either disagrees with the table, the
  output wins, and the report says what moved.
  ```bash
  # dollars per live-compared package: costUsd summed over distinct turns
  for s in instrument-loans-1 graded-think-a graded-opus-a partner-audit-1 partner-audit-2 partner-audit-3; do node -e 'const r=require("./discovery/"+process.argv[1]+"/run.json");const m=new Map();for(const t of r.turnStats||[])m.set(t.turn,t.costUsd||0);console.log(process.argv[1],r.posture,"$"+[...m.values()].reduce((a,b)=>a+b,0).toFixed(2))' $s; done
  # every hardcoded stamp literal in the gate
  grep -n "7efdde37\|cadb3811\|76b7847d\|ba124c3c\|ea523ac1" tooling/build-checks.mjs | cut -c1-120
  ```
  Which template carries which rule is fixed by source: `systemFor` feeds Think's builds; `sharedVocabulary` is
  interpolated in Create PRD, Grill interview and Grill audit; `AUDIT_VERDICT_RULE` appears only in Grill audit;
  `TOOL_DESCRIPTIONS` is hashed into every stamp. Confirm with
  `grep -n "sharedVocabulary()\|AUDIT_VERDICT_RULE}\|systemFor(" portal/lib/discovery-postures.mjs`.

  Literals found by `git grep -n "7efdde37\|cadb3811\|76b7847d\|ba124c3c\|ea523ac1" origin/main -- tooling/` this
  session. Re-run the grep on the implementing tree: the literals move the moment a stamp does. Non-live packages
  still carrying `7efdde37` go stale, and that is accepted: `faster-payment` (R2), `later-not-never-1` and
  `bracket-trace-1/2`. Say so in the read. 30.46's carriers count (`=== 7`) also changes with any re-record.

  A Think-only fix that should also reach Create PRD and Grill needs `systemFor` AND `sharedVocabulary`, which costs
  $11.40. Re-derive this table on the implementing tree. If `discovery/*/run.json` changed, the dollars change.
- **SATISFIES**: AC #3, AC #4.
- **REGENERATES**: none.

---

## TESTING STRATEGY

There is no test suite (CLAUDE.md §Testing). The proof is group 33 case 33.16 plus driving the CLI.

### Unit-level (33.16a/b)
A synthetic package with every class and a K2 non-park miss. The checkBorderline refusal battery, with a positive
control.

### Integration (33.16c/d + the T5 CLI)
The committed `borderline.json` validated. The class sums re-derived against the transcript's own banked-park count,
on both real packages.

### Edge cases
- A turn that holds an off-script `open_question` plus a banked decision. `why` must come from the closing op.
  33.5's t4 shape covers the not-closing half.
- A K2 → `record_decision` miss: a K2 miss that is not a park. It counts in the band tally, not in class b.
- A K3 → `record_decision`: it is in class a. It is 0 on both models, and t5 covers class a via the flag.
- A slug with no suffix, a missing slug, or a slug with no package. Each is a refusal (T5).

### Proving the checks
Each REDDENS mutation in T7 is driven red and then reverted, and the report records the observed red message.
Positive controls: the well-formed 65-entry borderline validates (b), and the real packages' invariant holds green
before mutation 1 is applied (d).

---

## VALIDATION COMMANDS

### Level 1: Syntax
`node --check tooling/discovery-score.mjs && node --check tooling/build-checks.mjs`
`node tooling/drift-check.mjs`. This is CI's verify step, and it `node --check`s every tracked `.mjs`.

### Level 2: The scorer
`node tooling/discovery-score.mjs --selftest && node tooling/discovery-score.mjs --check-draw && node tooling/discovery-score.mjs --check-key`
`node tooling/discovery-score.mjs --park graded-think-a` and `node tooling/discovery-score.mjs --park graded-opus-a`
(the expected values are in T5).

### Level 3: The gate
`node tooling/build-checks.mjs`, with group 33 `✓` and `build ✓` (`tooling/icons` needs `npm ci` first in a fresh
worktree).
`node agent-layer/gen-loc-summary.mjs --check` → `no drift`.

### Level 4: Manual
Read the four `--park` class listings next to their `why` lines before writing the session read. Any read whose
example quote cannot be found in that output is not grounded.

### Level 5: piv-validate
Run it, even though the change is tooling only (memory: piv-skills-python-tuned). That means build-checks,
drift-check, token-lint and the portal smoke on a private port. Kill only your own PID.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Blind re-audit subagent (T2) | Claude Code subagent tokens, no API spend | yes, because `borderline.json` is required by 33.16(c) | n/a, it must run |
| Owner accepts or overrules the session read | owner's hand, at review | no. The read is labelled as the session's, by the owner's decision of 2026-10-03 | #508 picks it up |
| Any re-record | none in this ticket | no | #508 |

---

## ACCEPTANCE CRITERIA

- [ ] AC #1: `node tooling/discovery-score.mjs --park graded-think-a` and `… --park graded-opus-a` print classes a,
  b and b′ with per-row `why`, the precision/recall line and the borderline block. The output is deterministic
  (identical across two runs), and the run leaves `git status` unchanged.
- [ ] AC #2: 33.11 and 33.14 stay green. The scorer imports only `node:` modules and `../discovery/`, and no tracked
  `.mjs` other than the scorer and build-checks names a graded slug in code.
- [ ] AC #3: `.claude/reports/discovery-park-506.md` holds the counts per model, the borderline overlap against the
  committed blind re-audit (with the "7–8" correction and the blindness receipt), and the read, headed as the
  session's and not the owner's.
- [ ] AC #4: the read's outcome names its fingerprint cost from the table (stamps moved, packages, dollars, and
  30.32 if `AUDIT_VERDICT_RULE`).
- [ ] AC #5: `node tooling/build-checks.mjs` is green, with 33.16 present and each T7 REDDENS mutation observed red.
- [ ] `discovery/README.md` no longer carries the unsourced "7–8" overlap claim.
- [ ] The PR body and the report's opening both say that AC #3's "which of the 11" was replaced by the blind
  re-audit, on the owner's decision of 2026-10-03, because the 11 were never named.
- [ ] The PR body carries `Closes #506`. The plan, report and review go in the same PR.

---

## COMPLETION CHECKLIST

- [ ] Phase 0–4 tasks done in order.
- [ ] Every VALIDATE run, with observed output in the report.
- [ ] Every REDDENS driven and reverted.
- [ ] The three prose copies updated (grep receipt).
- [ ] The auditor transcript shows 0 tool calls.
- [ ] `borderline.json` entries are byte-for-byte the agent's (only the wrapper is the session's).

---

## OPEN QUESTIONS / ASSUMPTIONS

- **A1 (decided by the owner, 2026-10-03):** the borderline set is a fresh blind re-audit, committed and labelled
  as new. It is not a reconstruction of #348's 11.
- **A2 (decided by the owner, 2026-10-03):** the session drafts the read, labelled as the session's. The owner
  accepts or overrules it at review.
- **A3:** the draw column for `--park` comes from the slug suffix (33.15's rule) rather than a `--run` flag, so AC
  #1's command works as written.
- **A4 (R1, mitigated):** the primary auditor is `fable`, a model that judged neither package. A second blind
  auditor (`haiku`) gives the agreement figure and a sensitivity run (T2). The read states whether its conclusion
  survives haiku's set. What remains is that all three are Claude models. The report names this as a limitation,
  and no mitigation inside this ticket removes it.
- **A5:** "per model" means one `--park` call per slug. The two packages differ only in model and posture, and
  that is the comparison.

## RISK REGISTER (each with its mitigation in a task)

| Risk | Mitigation | Where |
|---|---|---|
| R1 shared model bias between auditor and judge | primary auditor `fable` judged neither package; `haiku` cross-check; agreement plus a sensitivity `--park` run reported; the read must survive both sets | T2, A4, T10 |
| R2 cost table understates #508's work | a column for hardcoded literals; the table re-derived by command on the implementing tree, with the output pasted | T10 |
| R3 shared primary tree, stale branch | dedicated worktree from `origin/main` with `npm ci` in `tooling/icons`; stage by explicit path; stop if either graded `run.json` changed | Phase 0 |
| R4 malformed auditor JSON | 13-question batches; a stand-alone validator before any write; up to 3 attempts per batch; a one-question fallback that cannot fail on length | T1, T2 |
| R5 auditor reads files despite the instruction | per-agent tool_use count from its own transcript must be 0, or the batch is void | T2 |
| R6 non-ASCII class key typed two ways | ASCII keys, with the prime only in a printed `label`; key and label lists pinned in 33.16 | T4, T7 |
| R7 cited line numbers drift if main moves | every anchor named by symbol as well as line; Phase 0 re-runs the T5/T6 VALIDATEs and stops on any changed count | Phase 0, T5, T6 |

## NOTES (open canvas)

### Pre-flight, run this session against `origin/main` @ d5c7536 (detached worktree in the scratchpad)

1. **Driven:**
   - `--slug graded-think-a --run a` and `--slug graded-opus-a --run a` reproduce the ticket's numbers:
     12/17 and 10/13 misses are parks; precision 26/38 and 27/37; recall 26/28 and 27/28.
   - A throwaway probe over `scorePackage` gave the per-class rows quoted in T5.
   - `gen-loc-summary --check` → no drift.
   - `build-checks` showed group 33 ✓, and one failure, group 41 icons, caused by a missing
     `tooling/icons/node_modules` (environment, not code).
2. **Citations resolved:** postures :174 :230 :327 :349 :388 :504/:514 :592 :662 :697 :701 :806-809 :829-856;
   build-checks :316-321, :10347, :10397-10407, :10524-10560, :10658-10671, :10734-10750, :10752-10797, :10799;
   gates.md:55; README:1066-1104.
3. **Landed claims:**
   - No `--park`, `parkView` or `borderline.json` on main (grep).
   - **The borderline ids exist nowhere.** Grepped the repo, `.claude/`, and every block type in the #348 session
     and its auditor transcript. This changed the plan: the ticket's "which of the 11" became the owner-chosen blind
     re-audit (A1), and the README correction (T9) was added.
4. **Reconciled:**
   - The ticket's class (a), "K3 answered → flagged", is widened to "K3 → not parked" so a K3 → record would also be
     caught. It is 0 on both, observed.
   - The ticket's $7.55 (epic R3) equals this plan's `systemFor` row; derived $0.42 + $3.24 + $3.89.
5. **Traps carried:**
   - three gate-prose copies (T8);
   - 33.11's regexes scanning comments (T3/T5);
   - drift-check `node --check`s `.mjs` under `.claude/plans`, so no `.mjs` is parked there (T1 uses the
     scratchpad);
   - the fresh-worktree `npm ci` (T7);
   - piv-validate runs regardless (Level 5);
   - kill only your own PID (Level 5);
   - the honesty contract in both directions (T2, A2).

### Pre-flight, second pass (risk hardening, 2026-10-03)
- T1's batch builder was driven on `origin/main` @ d5c7536 in a throwaway worktree:
  - 5 files × 13 `### ` headers = 65;
  - leak grep → 0;
  - `<N>` replaced in both places, so `replaceAll` is required (`replace` would have left the second one);
  - about 13.8k words in total, so about 2.8k words per batch.
- T2's validator was driven on a fenced fake reply for batch 2, with the fence stripped by `sed '1d;$d'` →
  `batch 2 ✓ 13`.
- The `### <n>.` running number in the first draft would have put "11." into the prompt next to the ban on "11".
  The headers now carry the question id only.

**Confidence: 10/10.** Every step with an external dependency (the auditor's reply) has a validator, a bounded
retry and a fallback that cannot fail on length. Every number the implementer must match was observed on
d5c7536. The only thing a fresh session could not reproduce from this plan is the read's verdict, and by the
owner's decision that is the session's own labelled judgement, not a value to match.

### Why the invariant and not the counts in the gate
#508 re-records both graded packages under a new stamp (epic R3). A case that pins 8/4/2 would go red on #508's
correct work, and someone would "fix" it by updating numbers, which is the check-that-cannot-fail pattern in
reverse. The invariant (the classes re-sum to the transcript's own banked-park count) holds on any honest recording
and reddens when the view drops or double-counts a class.

### Why `why` is in the view
The counts say how many. The agent's `reason`/`missing` text is the only evidence of why it parked, and the read
depends on it. Two examples from the probe:
- Sonnet a32, `s5-gross-margin`, K2 parked: "No actual gross margin figure is given…". That is a flag's sentence
  filed as a park.
- Opus a14: "Outside the respondent's remit…". That is a deferral to a colleague read as not-known.

### Rejected
- **Reconstructing #348's 11 by reading the K2s now and calling the set "the 11".** That would be false
  attribution.
- **Committing the audit prompt as a `.mjs` builder.** drift-check would syntax-check it, and it would add a new
  reader of `key.json`. The prompt is recorded verbatim in the report instead.
- **A `--run` flag on `--park`.** It contradicts AC #1's command, and 33.15 already derives the column from the
  suffix.

## AMENDMENTS

- 2026-10-03: the risks were hardened at the owner's request.
  - R1: the primary auditor is `fable`, with a `haiku` cross-check and a sensitivity run.
  - R4: the audit runs in 13-question batches, with a validator, bounded retries and a one-question fallback.
  - R6: the class keys are ASCII.
  - R2: the cost table is re-derived by command.
  - A risk register was added.
  - Fixed an "11" leak into the audit prompt via running numbers.
- 2026-10-03 (implementation):
  - T2's sensitivity restore said `git checkout -- …borderline.json`. The file is untracked until commit, so it was
    restored from a byte-copy backup and `cmp`-checked instead.
  - The T10 literal lines (:8334, :8949-8953, :16269, :8409) shift by +1 (the import list) and, for :16269, by +97
    (case 33.16). On the implementing tree they are :8335, :8950-8954, :16366 and :8410.
  - T2's blindness receipt counted tool calls only. Every subagent's auto-loaded `MEMORY.md` index carried the count
    "11 borderline K2s". This is recorded in the report rather than mitigated.
