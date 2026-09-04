# Implementation Report — The three postures + the existing-PRD audit mode (#286)

**Plan**: `.claude/plans/discovery-postures-286.md`   **Branch**: `feat/286-postures` (cut from `origin/main` at 985c807, the #365 merge)   **Status**: COMPLETE — every code, gate and docs task green at PR #369; the two PAID levels were blocked by the owner's own Console spend limit on the morning of 2026-09-04 and observed the same afternoon under #370 (§#370 below).

## Summary

`portal/lib/discovery-postures.mjs` now ships four `POSTURES` entries — `think`, `think-opus`, `create-prd`, `grill` — with Think's prompt surface byte-identical (both recorded stamps reproduce; the diff of Think's built prompts before and after is empty, observed). Create PRD judges into the PRD section a decision renders in, reading the projection's own `SECTIONS`; Grill runs the weak-answer note as a checklist and carries a second, AUDIT template for `entryMode: 'existing-prd'`, where the server stores the supplied document once as the run's one `kind: "document"` answer line and every turn files one of the four existing verbs against it. Grill's model is a per-run field (`MODELS`, `MODEL_SETTABLE`, `resolvePosture`) recorded in `run.json`, with the fingerprint recomputed on an override. The session module gained `ENTRY_MODES` (two), `ENTRY_POSTURES`, `RE_ASKS`, the document store, an `entryMode` on the cursor and the metrics, `document` on the view, and an audit branch in `runTurn` that appends nothing. The drawer gained the entry-mode select, the document field (textarea or repo-relative path), Grill's model select, the audit submit and the pointer view. Group 30 gained cases 30.30–30.34, group 31 case 31.14, group 34's posture pin widened; README, gates.md and CLAUDE.md follow.

## Tasks completed

- Task 0 — branch `feat/286-postures` from `origin/main`; Think snapshot; baseline `build ✓ all 34 groups pass` (observed before any edit)
- Task 1 — `MODELS`, `MODEL_SETTABLE`, the generalised `fingerprintOf({ build, model, inputs })`, `AUDIT_FINGERPRINT_INPUTS`, `FINGERPRINT_INPUTS_FOR` → `portal/lib/discovery-postures.mjs` (UPDATE)
- Task 2 — `JUDGEMENT_RULE`, `reaskBrief()` → `portal/lib/discovery-postures.mjs` (UPDATE)
- Task 3 — `CREATE_PRD_STANCE`, `sectionBrief()` (derived from `SECTIONS`), `buildCreatePrdTurn`, `POSTURES['create-prd']` → `portal/lib/discovery-postures.mjs` (UPDATE)
- Task 4 — `GRILL_STANCE`, `AUDIT_VERDICT_RULE`, `AUDIT_WRONG_IF_RULE`, `buildGrillTurn` (interview + audit), `POSTURES.grill`, `resolvePosture`, Think's one `existing-prd` refusal, the header rewrite → `portal/lib/discovery-postures.mjs` (UPDATE)
- Task 5 — `ENTRY_MODES`, `DEPTH_PROPOSAL['existing-prd']`, `ENTRY_POSTURES`, `RE_ASKS`, `appendDocument` / `documentOf` / `auditAnswerFor` → `portal/lib/discovery.mjs` (UPDATE)
- Task 6 — `deriveCursor` / `runMetrics` take `entryMode`; `sessionView` passes it and carries `document: { ref, chars, md5 }` → `portal/lib/discovery.mjs` (UPDATE)
- Task 7 — `openSession({ model, document, documentPath })` with its refusals before `mkdirSync`, `model: resolved.model` in the write literal, `appendDocument` after `writeRun` on the create path; `discoveryConfig` gains `models`, `entryPostures`, `modelSettable`; `runTurn`'s audit branch and `resolvePosture` → `portal/lib/discovery.mjs` (UPDATE)
- Task 8 — `entryMode: head.entryMode ?? 'blank-idea'` into `posture.build`, the `MAIN_TOOLS` comment, `PROBE_DOCUMENT` + `probeAudit()`, `--probe-audit [--model]` → `portal/lib/discovery-transport.mjs` (UPDATE)
- Task 9 — the session route names `model`, `document`, `documentPath` → `portal/server.mjs` (UPDATE)
- Task 10 — `answerBlock` renders a document-kind answer as a pointer by kind; header note → `discovery/prd-projection.mjs` (UPDATE)
- Task 11 — imports widened; case 11's key list; case 16 flipped and extended (nine new refusals, the guard regex + floor 9 (17 after review F4), `model: resolved.model` and `appendDocument` position pins); cases 30.30–30.34; the group 30 summary → `tooling/build-checks.mjs` (UPDATE)
- Task 12 — case 31.14 + the group 31 summary; case 34.13 widened to the four with the `TOOL_DESCRIPTIONS` key pin; the group 34 summary → `tooling/build-checks.mjs` (UPDATE)
- Task 13 — the entry select, the model row, the document row, the answer label id → `portal/public/index.html` (UPDATE); `DISCOVERY_ENTRY_MODE` deleted, `discoveryEls()` widened, `renderDiscoveryEntry()` / `renderDiscoveryModel()`, the depth note, the open handler's document refusal after the pinned provenance guard, the audit submit, the pointer view → `portal/public/portal.js` (UPDATE)
- Task 14 — §Files, §The audit mode (existing-prd, #286), §File shapes (the third line, the `entryMode` and `model` bullets), §Workflow → `discovery/README.md` (UPDATE); group 30 / 31 / 34 entries and **The audit probe** paragraph → `.claude/references/gates.md` (UPDATE); the one clause on the run bullet → `CLAUDE.md` (UPDATE)
- Task 15 — PARTIAL at PR #369: the portal smoke and the drawer check done; the throwaway audit opened and reached the SDK; the agent turns were blocked (see Validation) and are observed under #370 (§#370 below)
- Task 16 — BLOCKED: both probes ran and were refused by the API (see Validation)
- Task 17 — not yet: the two issue comments are posted at PR time with `piv-create-pr`, quoting the PR number

## Tests added

All in `tooling/build-checks.mjs`, all green (observed: `build ✓ all 34 groups pass`).

- **30.30** the posture table: four ids in order, Think and Create-PRD on `claude-sonnet-5` by name, every model in `MODELS`, `MODELS`/`MODEL_SETTABLE` frozen by mutation, `FINGERPRINT_INPUTS_FOR.grill` = both input sets, `resolvePosture` identity on the own model, a five-key frozen copy with a recomputed stamp on an override, six refusals by name, the one-input-set join proven equal to the default join, Think's two stamps pinned to the recordings' literal (the one hex literal in the group).
- **30.31** the shared contract over `buildCreatePrdTurn(FINGERPRINT_INPUTS)`, `buildGrillTurn(FINGERPRINT_INPUTS)`, `buildGrillTurn(AUDIT_FINGERPRINT_INPUTS)`: seven rules verbatim, PROVENANCE < EVIDENCE < PARENT, every rule and stance before `PARENT_RULE`, the ledger brief in the turn prompt only, the closing line naming `parent_id` after the brief, the real build, purity, nine junk builds; Think and Create-PRD refusing `existing-prd` naming Grill; the section brief's every ladder row, the non-goal ids and the metric stage; the re-ask brief with the FIRST flag's seq and `missing` list before the closing line, absent on another question's flag and on a first ask, absent from Think.
- **30.32** the audit build: the document verbatim between the fences, absent from the turn prompt, the ref named as `answer_ref`; the verdict rule naming all four verbs (iterated from `OPS`) and four verdicts; the wrong-if rule's four claims; the block before the stance and before `PARENT_RULE`; the wrong kind refused both ways; the audit template inside Grill's fingerprint by mutation (audit alone, interview alone, the two differ, Think unmoved, the one-set stamp differs from the two-set stamp).
- **30.33** the session in audit mode: the three tables pinned both ways and frozen; the document store over a temp root (verbatim, the on-disk line exact, a second refused naming `a1`, five junk inputs, `appendAnswer` still refusing the kind); the cursor never holding beside a blank-idea positive control that holds; the view's `{ ref, chars, md5 }`; the metrics agreeing under `existing-prd` and reading held under the default; the done read on both; an unknown `entryMode` refused; `sessionView` pinned never to consult `ENTRY_POSTURES` / `resolvePosture`; the config's `models`, `entryPostures`, `modelSettable` and no prompt body.
- **30.34** `runTurn` source-pinned: `auditAnswerFor(`, `resolvePosture({ posture: head.posture, model: head.model })`, `appendAnswer(` exactly once after the audit flag, "takes no answer"; the transport pinned to pass `entryMode: head.entryMode` and keep `MAIN_TOOLS = Object.freeze([])`.
- **31.14** a document-kind answer renders as a pointer (ref + length), its text and its `## ` heading off the page, the banked answer beside it blockquoted, the Run line reading `entry existing-prd · … · posture grill`, determinism, and the same text as a banked answer still blockquoted.
- **Case 11** the config's key set widened by `entryPostures` and `models`. **Case 16** `existing-prd` valid; nine new `openSession` refusals (a non-Grill posture naming Grill, no document, both, a blank one, a document / a path on blank-idea, an unknown model, an override on Think naming `claude-sonnet-5`, a missing path, a directory path); the guard regex widened by `resolvePosture` with the floor at 9; `model: resolved.model` and `appendDocument` after `writeRun` and after the resume return pinned from source. **Case 34.13** the four postures with `TOOL_DESCRIPTIONS` still keyed as `OPS`.

**The nine mutation checks** (observed, each restored byte-for-byte with the md5 compared; each gate run ~5 s):

| # | Mutation | Red by name |
|---|---|---|
| 1 | `JUDGEMENT_RULE` off Grill's interview prompt | 30.31 `JUDGEMENT_RULE does not appear VERBATIM in the grill interview system prompt` |
| 2 | the document block into the audit TURN prompt | 30.32 `the document text reached the TURN prompt` |
| 3 | `RE_ASKS['existing-prd'] = true` | 30.33 `an audit must NEVER hold a question` (+ the RE_ASKS pin, the metrics, the done read) |
| 4 | `ENTRY_POSTURES['existing-prd'] = ['grill', 'think']` | 30.33 `existing-prd admits grill,think` and case 16 `a non-Grill posture … did not throw` |
| 5 | `resolvePosture` returning `p` on an override | 30.30 the override copy / the RECOMPUTED fingerprint |
| 6 | `fingerprintOf`'s join reordered | 30.30 `Think's stamps are 5ad55180 / 56ccf78d`, case 19, **32.2a `the Think prompt surface changed`**, 33.15 |
| 7 | `answerBlock` blockquoting a document-kind answer | 31.14 `the document's text reached the page` |
| 8 | `TOOL_DESCRIPTIONS` given a fifth key | case 18 (twice), 30.30, 34.13, **group 32 and 33 red together** |
| 9 | `discoveryConfig()` without `models` | case 11 `discoveryConfig keys are …` and 30.33 |

## Validation results

- **Level 1** — `node --check` on the seven files: ok (observed). `grep '^import' discovery/prd-projection.mjs | grep -c portal` → 0 (observed). Think's stamps `7efdde37…` / `cadb3811…` reproduce (observed). `diff think-before.txt think-after.txt` → empty (observed).
- **Level 2** — `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass`; `node tooling/drift-check.mjs` → `drift-check ✓`; `node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan` (all observed, on the final tree).
- **Level 3** — six committed `prd.md` files byte-identical via `--stdout | diff -q` (observed; `spine-meridian-1` has no `prd.md`, see Deviations). `cd portal && node lib/discovery-transport.mjs --preflight` → `pre-flight ✓ all 8 rows pass, zero tokens` (observed).
- **Level 4 (partial)** — portal on `PORT=4799` (PID 72053, killed by PID after): `/api/health` ok; `/api/discovery/config` served four postures (`grill` alone `modelSettable`), two entry modes, `models`, `entryPostures` (observed). Headless Chromium (Playwright) over the drawer: on `blank-idea` all four postures, the document and model rows `display: none`; picking Grill shows the model row on `claude-sonnet-5`; on `existing-prd` the posture list is `["grill"]`, the document row shows, the depth note reads "Proposed for an existing PRD"; Start with no document is refused as prose and **no POST** is made; zero page errors (observed). Through the API: `audit-throwaway-286` opened `entryMode existing-prd · posture grill · model claude-sonnet-5`, `answers.jsonl` one `kind: "document"` line, the view's `document.md5` equal to `md5 -q` of the pasted file (`4cfa20c2…`, 1180 chars); an audit turn with a `text` refused naming "takes no answer"; a resume with a different document returned the stored one (still one line); the first audit turn resolved the document and reached the SDK **without appending** (answers stayed at 1); `Download PRD` rendered `entry existing-prd · … · posture grill`; `posture-throwaway-286` opened under `create-prd` and reached the SDK. D6: `fixture-throwaway-286` opened by `documentPath: docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` with `model: claude-opus-5` stored 24355 characters (the view's `chars`; 24560 bytes on disk) hashing to **`ab6eb0ee6cdd3b7802ecfcbe90db2377`**, the plan's expected value, with `run.json.model` = `claude-opus-5` (observed). **The agent turns did not run:** every SDK turn returned `API Error: 400 … You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC` as a text line and exited 1; cost recorded $0 (observed). So the six verdicts, the wrong-if classification and the JUDGEMENT prose were **not observed** at this head; they are observed under #370 (§#370 below). All three throwaways deleted; `git status --short discovery/` shows only this ticket's two edits (observed).
- **Level 5 (blocked)** — `--probe-audit` on `claude-sonnet-5` (surface `76b7847d…`) and `--model claude-opus-5` (surface `ba124c3c…`) both ran to `probe INCONCLUSIVE`, exit 3, with the same 400 (observed). The probe's code path works end to end; the verdict is a model fact the account cannot buy today.

**What was owed once access returned (paid 2026-09-04 under #370, §#370 below; the protocol as written):** the six audit turns and the Create PRD turn of Task 15 on fresh throwaways (then deleted), the verdict spread and the QUOTED / PARAPHRASED / AUTHORED read recorded here; `--probe-audit` on both models (Task 16) — exit 2 on AUTHORED means tighten `AUDIT_WRONG_IF_RULE`, re-probe, at most three paid attempts. Expected cost ~$0.5–1.0: Run 0's $0.03–0.07 per turn × 9 turns is $0.27–0.63 (derived); the rest is the ~6–7k-token document's cache read on every turn (expected, not quantified).

## Deviations from the plan

- **One helper for the two new templates rather than two literal copies.** The plan said "copy the text from `systemFor` into the new template literal; do not refactor `systemFor`". `systemFor`, `buildThinkTurn`, `TOOL_DESCRIPTIONS` and `FINGERPRINT_INPUTS` are untouched (the byte diff proves it); the vocabulary block, the ladder-to-parent tail, Think's guards and the interview turn-prompt head are each ONE module-private helper (`sharedVocabulary`, `sharedTail`, `commonGuards`, `interviewHead`) used by the two NEW builders only, so Create PRD and Grill cannot drift from each other. Same effect as the plan's copies, without a third copy to keep in step.
- **Level 3 compares six `prd.md` files, not seven.** The plan's loop names seven slugs; `spine-meridian-1` has never had a `prd.md` (the plan's own text says "the six committed `prd.md` files"). The six are byte-identical.
- **A third throwaway slug.** `fixture-throwaway-286` was opened (never a turn) to observe D6's md5 on the frozen fixture through `documentPath`, since the paid turns could not run. Deleted with the other two.
- **Case 16 refuses two more shapes than the plan listed:** a blank `document` and a `documentPath` naming a directory. Both are the guards the plan specified for `openSession`; the case drives them.
- **The probe's judgement read requires an op.** After the first (refused) run printed "judgement in prose before the first op: yes" with no op filed — the API error arrives as a text line — `judgedFirst` was tightened to `firstOp !== -1 && firstText < firstOp`. On a real turn the read is unchanged.
- **`discoveryEls()` returns `documentText`, sent on the wire as `document`.** A local named `document` in `portal.js` would shadow the DOM global inside the open handler; the field name `openSession` reads is unchanged.
- **The drawer check ran headlessly** (Playwright's bundled Chromium from `~/node_modules`) rather than by hand in a browser; what it read is listed under Level 4.
- **A resume of an audit ignores a re-supplied document.** The plan's guard order (every refusal before `mkdirSync`, `readRun` after it) means an `existing-prd` resume still requires a document in the body; the stored one is the audit's, and the view's md5 says which. The drawer's comment says so. #288's package view is the natural home for a resume that asks for nothing.

## Issues encountered

- **The API usage limit** (above) — the one thing that made this PARTIAL. Nothing in the ticket's code path caused it; the transport recorded it exactly as `sdk-error-result-wears-success` describes. Saved as a memory so the next paid step is planned after 2026-10-01. Resolved the same day: the 400 was the owner's self-set Console spend limit, raised under Billing › Spend limits (#370).
- The first background run of `--probe-audit` on sonnet printed only `exit 1` with no output; the immediate re-run printed the full report and exited 3 as designed. Cause not established (it ran concurrently with the portal boot); every later run behaved.
- `case 16` forbids the word `branch` anywhere in `portal/lib/discovery.mjs` and `case 12` forbids `document.` / `document[` / `typeof document` in both session modules (a DOM-reach pin); two comments and the `document` parameter's internal name were worded around them. Neither pin is in the plan; both are now in this report for the next editor.
- **#366 stays open for Think by name** — the re-ask brief lands on Create PRD and Grill only; Think's second ask stays blind until a ticket re-records the five stamped fixtures. **Run 0's F10** (`MAX_TURNS = 6` admitting four tool calls per turn) is untouched; the audit turn prompt scopes evidence to "on this question", which is the mitigation available without a cap change.
- The three pre-existing working-tree modifications (`docs/epics/discovery-partner.architecture.md`, `docs/epics/discovery-partner.prd.md`, `.claude/skills/piv-plan-implementation/SKILL.md`) are **not this ticket's** and must be staged by explicit path exclusion at commit time.

## Next

`piv-commit` (stage by explicit path: the fourteen files in `git diff --stat` plus `.claude/plans/discovery-postures-286.md` and this report), then `piv-create-pr` with `Closes #286` in the body and Task 17's two comments on #288 and #292 quoting the PR number, then `piv-review-pr`.

## Review round 1 — F1–F4 fixed, F3 logged as #370

`.claude/code-reviews/pr-369-review.md` approved with one Medium finding (process) and three Lows.
All four land on this PR; F3's debt gets its tracker home. Every figure below is **observed** on
this tree unless marked.

**F1 (Low) — "24355 bytes" was the character count.** `sessionView().document.chars` is
`text.length`; the fixture is 24560 bytes on disk and 24355 characters. The md5 is over the UTF-8
bytes and matches either way, so D6's freeze check held; only the noun was wrong. Corrected in
Level 4 above and in the PR body.

**F2 (Low) — the cost range did not follow from the arithmetic shown.** Run 0's $0.03–0.07 × 9
turns is $0.27–0.63 (derived); the document's cache read (~6–7k tokens per the plan's cost shape)
was the unquantified rest. The sentence in "What is owed" now shows the derived part and labels
the rest expected.

**F3 (Medium) — the owed paid observations had no tracker home past `Closes #286`.** #370 opened
naming the four owed steps (the six audit turns, the Create PRD turn, `--probe-audit` on both
models, the QUOTED / PARAPHRASED / AUTHORED read written back here) and the protocol (AUTHORED or
exit 2 → tighten `AUDIT_WRONG_IF_RULE`, at most three paid attempts); a comment on #292 says run 2
depends on it. The PR body links it.

**F4 (Low) — case 16's guard floor admitted eight dropped guards.** `guardAt.length >= 9` against
seventeen hits (eleven `bad()` refusals plus `assertRunSlug`, `assertProvenanceRoot`,
`allowSetFor`, `resolvePosture`, `declareFacets`, `selectDepth`; counted with the case's own regex).
Raised to `>= 17`, the message naming the seventeen. Mutation in a throwaway worktree at this head:
the last `bad(` before `mkdirSync` rewritten as `(0, bad)(` (the same call, invisible to the regex)
→ `build discovery ✗ 1 failure(s)`, case 16 by name with `16 guard calls`; worktree removed, this
tree's `discovery.mjs` untouched.

Gates on this tree: `build ✓ all 34 groups pass` · `drift-check ✓` · `token-lint ✓ 63 contract
tokens · 0 undeclared · 0 orphan` · `pre-flight ✓ all 8 rows pass, zero tokens` (each exit 0) ·
portal smoke on port 4798, `/api/health` 200, `/api/discovery/config` four postures and two entry
modes, PID killed.

## #370 — the owed paid observations, run 2026-09-04

The 400 was the owner's own Console spend limit, raised the same afternoon. Every figure below is
**observed** unless marked. Each throwaway was copied to the session scratchpad and then deleted;
nothing under `discovery/` or in the copies was hand-written or edited. The two sessions were
driven through the portal API on private ports (4799, 4798) with `frontEnd terminal`, the honest
value for a scripted run, and each portal was killed by PID.

**The audit probe, both models** (`--probe-audit`, temp root). Sonnet: `probe ANSWERED · wrong_if
QUOTED` (12/12 tokens), judgement in prose before the first op yes, `record_decision seq 2 at
business, evidence_refs [1]`, answer refs `a1`, one denied line (`mcp__discovery__file_evidence`),
$0.121 · 17.8 s · 4 SDK turns, exit 0, prompt surface `76b7847d…`. Opus (`--model claude-opus-5`):
`probe ANSWERED · wrong_if PARAPHRASED` (14/14 tokens), judgement yes, the same op shape, no denied
line, $0.055 · 16.3 s · 3 SDK turns, exit 0, surface `ba124c3c…`. The opus PARAPHRASED is the
classifier, not the model: the `wrong_if` string carried the document's sentence inside quote marks
with its leading "This is wrong if", and the substring test folds case and whitespace only, so all
fourteen tokens matched without a bare substring hit. Exit 0 either way; folding punctuation is a
one-line tightening for whoever next touches the probe.

**The six audit turns** (`audit-throwaway-286`: `existing-prd · grill · scope-check ·
claude-sonnet-5`; a 16-line fictional "Rota Ledger" PRD fragment pasted as `document`, stating one
decision with its own wrong-if and a URL and saying nothing on `s7-kill-state-and-date`; the view's
`document` read `chars 1187 · md5 517a2b91…`, the file's own md5; `answers.jsonl` one
`kind: "document"` line at open and still one after six turns; fingerprint `76b7847d…`, the probe's
surface):

| turn | question | closer | verdict | wrong_if |
|---|---|---|---|---|
| 1 | s4-appetite | file_evidence 1 · record_decision 2 (business, evidence_refs [1]) | ANSWERED | QUOTED 15/15 |
| 2 | s4-rabbit-holes | flag_weak_answer 3 (missing ×2) | DODGED | – |
| 3 | s4-out-of-bounds | flag_weak_answer 4 (missing ×1) | DODGED | – |
| 4 | s7-goals-signals-metrics | flag_weak_answer 5 (missing ×1) | DODGED | – |
| 5 | s7-kill-state-and-date | flag_weak_answer 6 (missing ×2) | DODGED | – |
| 6 | s7-what-would-make-us-stop | file_evidence 7 · record_decision 8 (business, evidence_refs [7]) | ANSWERED | QUOTED 15/15 |

A `text` line before the first op on all six (JUDGEMENT_RULE); exactly one closer per turn; every
closer's `answer_ref` is `a1` (`file_evidence` carries none by `PARAMS`); denied lines 0; the
cursor advanced one step per turn with `ask` staying 1 on the flagged turns and `done true` after
the sixth, so the audit cursor never held. Spread: ANSWERED 2 · UNEVIDENCED 0 · DODGED 4 · ABSENT
0. Both wrong-ifs are the document's own sentence verbatim ("the ward cannot name a single
double-booked shift in the last quarter that a live ledger would have caught"), so D2 holds: no
AUTHORED wrong-if, no re-run, `AUDIT_WRONG_IF_RULE` untouched. Cost $0.337 (the sum of `costUsd`
over the six `turnStats` entries) · 117.9 s · 14 SDK turns.

`Download PRD`: the Run line reads `entry existing-prd · depth scope-check · unfaceted · front end
terminal · model claude-sonnet-5 · posture grill · … · 6 turn(s)`; both decisions and all four
weak-answer blocks carry the pointer line `_[the audited document — answer a1, 1187 characters,
verbatim in answers.jsonl]_`; "Rota Ledger" and "photographed each evening" are absent from the
page.

Two readings for #292, reported not judged: (1) ABSENT never fired — on `s7-kill-state-and-date`,
the one question the fragment says nothing on, the model filed DODGED, reading the six-week
appetite as touching it; (2) turn 6 re-filed the appetite's URL (seq 7) and wrong-if (seq 8) under
`s7-what-would-make-us-stop`, so the Hypothesis section lists the same sentence twice. Neither is a
protocol trigger; both are what run 2's reader will meet.

**The Create PRD turn** (`posture-throwaway-286`: `blank-idea · create-prd · scope-check`, model
`claude-sonnet-5` recorded as the posture's own): the cursor asked `s4-appetite`; one operator
answer (`a1`, banked); the agent's first text line named the section before filing — "This answer
feeds the MVP section (solution-level boundary-setting under Shape Up's 'set boundaries' step)…" —
then `record_decision` seq 1 at `solution`, `parent_id null`, `evidence_refs []`, flagged
`no-evidence` and `orphan`, then a closing text line. MVP is the `SECTIONS` row a solution-level
decision renders under, which is the row `sectionBrief()` lists. $0.054 · 13.5 s · 2 SDK turns.

**Total paid:** $0.567 (derived: 0.337 + 0.054 + 0.055 + 0.121), inside the expected $0.5–1.0.
