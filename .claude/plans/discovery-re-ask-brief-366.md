# Feature: the discovery re-ask brief reaches Think

The following plan should be complete, but it is important that you validate documentation, codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

> **Read this first — the ticket is materially stale.** `reaskBrief(ops, questionId)` already exists at `portal/lib/discovery-postures.mjs:189` and is already interpolated into Create PRD's turn prompt (`:414`, `:417–418`) and the Grill interview's (`:456`, `:459–460`). #286 built it. What is missing is Think and Think on Opus alone, and the gate at `tooling/build-checks.mjs:7186` currently forbids exactly that, by name. This plan is scoped to that remainder plus the two prose corrections it forces. **Do not reimplement `reaskBrief`.**

## Feature Description

On a held question's second ask, the discovery agent is handed the first `flag_weak_answer`'s `missing` list so it judges the new answer against what it said was lacking rather than flagging afresh for something the answer now names. Two of the four postures already get that brief. Think and Think on Opus — the two postures every committed recording ran under — do not, so on a second ask they see only the turn counter and the new answer text.

Giving Think the brief with Create PRD's interpolation pattern **verbatim** moves zero fingerprints, because the ledger `fingerprintOf` hashes carries no `flag_weak_answer`, so the empty-brief branch collapses to exactly the `\n\n` Think already has. The whole change is one line of code plus one line of interpolation, four gate lines and seven prose sites.

The plan also closes a hole the ticket does not mention and the module header denies: the brief's *wording* sits outside every posture fingerprint today, on the two postures that already carry it. Verified — rewriting the brief's first sentence leaves all five stamps unmoved and the gate green. This plan closes it with a verbatim gate pin, not with a fingerprint widening, and records the exclusion where the module already records its other deliberate exclusions.

## User Story

As the person answering discovery questions in the portal's drawer
I want the agent's second look at my re-written answer to be measured against the gaps it named the first time
So that a second ask is a re-judgement rather than a fresh, blind one

## Problem Statement

`deriveCursor` (`portal/lib/discovery.mjs:613`) holds a question for a second ask when the last closer on a ladder depth is a `flag_weak_answer`. The drawer shows the person "asked again" (`portal/public/portal.js:996`). But under Think, the turn prompt on that second ask is **byte-identical to a build with the flag removed from the ledger** — `ledgerBrief` filters to `op === 'record_decision'`, so the flag that caused the re-ask contributes nothing anywhere. The agent's only signal that it has seen this question before is a turn counter it has no reason to read that way.

Verified with `node -e "…buildThinkTurn({...F, ledger: flagged}).prompt === buildThinkTurn({...F, ledger: []}).prompt"` → `true`.

## Solution Statement

1. `buildThinkTurn` interpolates `reaskBrief(ledger, question.id)` using **Create PRD's exact form** — `${reask ? \`\n${reask}\n\` : ''}` in place of the existing blank line. The empty branch collapses to `\n\n`, so a first ask stays byte-identical and every stamp holds. This is the whole behavioural change; it fixes `think` and `think-opus` together, because both entries in `POSTURES` carry `build: buildThinkTurn`.
2. Group 30 case 31's existing loop widens from two builds to three, so Think inherits all five re-ask assertions rather than getting a bespoke one.
3. The line that currently forbids the brief on Think (`:7186`) is replaced by two pins that close the wording hole: the brief's produced string pinned verbatim, and `FINGERPRINT_INPUTS.ledger` asserted to hold no `flag_weak_answer`, so the expensive branch cannot be taken by accident.
4. Case 30 gains a key-set pin on `FINGERPRINT_INPUTS_FOR`, so the *other* route into the expensive branch fails by a name that states the bill. Today's gate already reddens on that route — eight assertions, four of them naming the cause in words — but not one of them says what re-recording would cost.
5. Five prose sites state the old scope and are corrected; two more — the header's `:70` over-claim and the exclusion-list addition — make **seven, across five tasks**. AC #5 derives the figure and every other section quotes it.

**`cursor.ask` is deliberately not plumbed.** The ticket's title names it, and this plan does not deliver it: `reaskBrief` derives the second ask from the ledger, so `discovery-transport.mjs:153`'s build call needs no new argument, and the brief's own first sentence ("This is the second ask of this question") carries the information `cursor.ask` would have carried. Passing `ask` as well would be a second record of one fact. The ticket's substance — the first flag's `missing` list in the turn prompt — is fully delivered, so the PR closes #366.

## Out of Scope / Non-Goals

- **Not included: plumbing `cursor.ask` into `posture.build`.** See above — the information arrives through the ledger instead.
- **Not included: putting the re-ask branch inside any posture fingerprint.** Measured at $7.561 and 142 paid turns for `think`/`think-opus`; free but asymmetric for `create-prd`/`grill`. This is the owner's call, it is written up in OPEN QUESTIONS and in the paid-steps table, and this plan's recommendation is not to.
- **Not included: a paid re-observation of the brief.** No committed recording has ever taken a second ask on any posture, so the brief is an unobserved prompt string in all four. A one-turn probe is a follow-up.
- **Not changing: the audit's brief-free turn prompt.** `RE_ASKS = { 'blank-idea': true, 'existing-prd': false }` (`portal/lib/discovery.mjs:567`) is a decision — a document cannot answer twice — and `tooling/build-checks.mjs:7212` pins it. Leave both alone.
- **Not changing: `reaskBrief` itself**, `ledgerBrief`, `deriveCursor`, the drawer, the transport, or any committed run package.
- **Not fixing: the closing line's "Parent candidates" pointer on an empty ledger.** On a second ask of the first question the ledger holds no decisions, so `ledgerBrief` takes its `none` branch and prints no "Parent candidates:" line, while the closing sentence still says "take parent_id from the 'Parent candidates' line above". The `none` branch does answer the question in its own words ("pass parent_id null"), so this is an infelicity, not a defect — and it is inside `buildThinkTurn`'s template, so touching it would move Think's stamp. Separate ticket if anyone wants it.

## Feature Metadata

**Feature Type**: Enhancement (finishing a partially-landed capability)
**Estimated Complexity**: Low — two source lines, four gate lines, seven prose sites; every branch measured before writing
**Primary Systems Affected**: `portal/lib/discovery-postures.mjs`, `tooling/build-checks.mjs` groups 30/31, `.claude/references/gates.md`
**Dependencies**: none new. The gate runs with no `portal/node_modules`; the module is statically SDK-free and must stay so.

## Related Work

**Implements**: GitHub issue #366 (`Closes #366` in the PR body — a title mentioning `(#366)` closes nothing) · **Epic**: #279, `docs/epics/discovery-partner.architecture.md`

**Back-references**:

- `.claude/plans/discovery-postures-286.md` — Why: #286 built `reaskBrief`, `JUDGEMENT_RULE`, `FINGERPRINT_INPUTS_FOR` and case 31. This plan finishes its one deferred half.
- `.claude/plans/discovery-session-rules-285.md` — Why: #285 built the hold rule (`RE_ASKS`, `deriveCursor`) this brief serves, and excluded posture edits for the fingerprint churn this plan measures at zero.
- `.claude/plans/discovery-parent-id-341.md` — Why: `ledgerBrief`, the turn-prompt/system-prompt split and the fingerprint's freshness contract are #341's.

**Forward-references**:

- (none yet — a follow-up would be the `--probe-reask` observation and, if the owner asks for it, the fingerprint widening)

---

## CONTEXT REFERENCES

### Relevant codebase files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

All line numbers are against `31a46e8` (branch `feat/366-plan`). They shift as your own edits land — **anchor every edit on the quoted string, not the number.**

- `portal/lib/discovery-postures.mjs:183–196` — `reaskBrief`, the function that already exists. Read its comment; two of its sentences become false in this ticket.
- `portal/lib/discovery-postures.mjs:261–298` — `buildThinkTurn`. The one code change is at `:294` (the blank line between `${ledgerBrief(ledger)}` and `Judge it,`).
- `portal/lib/discovery-postures.mjs:389–424` — `buildCreatePrdTurn`. **This is the pattern to mirror**: `const reask = reaskBrief(ledger, question.id);` before the template, and `${reask ? \`\n${reask}\n\` : ''}` on its own line between the ledger brief and the closing line.
- `portal/lib/discovery-postures.mjs:440–470` — the Grill interview branch, the same pattern a second time. Two call sites, so the form is house-settled.
- `portal/lib/discovery-postures.mjs:507–557` — `FINGERPRINT_INPUTS` (`:527`), `AUDIT_FINGERPRINT_INPUTS` (`:541`), `FINGERPRINT_INPUTS_FOR` (`:548`), `fingerprintOf` (`:553`). The seam that makes this free: the ledger at `:532–536` holds three `record_decision` records and no flag, so `reaskBrief` returns `''` on every fingerprint computation.
- `portal/lib/discovery-postures.mjs:31–35` and `:70–73` — the two header paragraphs that state the old scope.
- `portal/lib/discovery-postures.mjs:514–519` — the declared list of things that sit OUTSIDE the fingerprint ("an edit to one of those does not make the fixture stale by name"). The re-ask branch joins this list.
- `tooling/build-checks.mjs:7126–7188` — group 30 case 31, the shared-contract case. The loop at `:7177` and the Think line at `:7186`.
- `tooling/build-checks.mjs:7105–7124` — group 30 case 30. The `FINGERPRINT_INPUTS_FOR.grill` shape assertion at `:7111` and the Think hex literal at `:7122`.
- `tooling/build-checks.mjs:7212` — case 32's audit pin. **Do not touch.**
- `tooling/build-checks.mjs:8178` (group 32) and `:8634` (group 33) — the only two per-package fingerprint comparisons in the repo. Both must stay green.
- `portal/lib/discovery.mjs:560–570, 596–616` — `RE_ASKS` and `deriveCursor`. Read-only context: this is what decides a second ask happens at all.
- `portal/lib/discovery-transport.mjs:153` — the one `posture.build(...)` call. Read-only: it is not changed, and knowing why is part of the ticket.
- `.claude/references/gates.md:49` (group 30) and `:53` (group 32) — the gate write-ups.

### New files to create

- none.

### Relevant documentation

- `discovery/README.md:265–277` — the run-package format's hold-rule paragraph, including why a pre-#285 package can read as held. Read for context; no edit needed.
- `docs/epics/discovery-partner.architecture.md` §Boundaries — the per-posture model call. No decision here is reopened.

### Patterns to follow

**The interpolation form is load-bearing and is not a matter of taste.** Three forms were measured against Think's stamp. Only two leave it at `7efdde37`:

```js
// Create PRD's form, verbatim — USE THIS. Think's stamp stays 7efdde37.
${ledgerBrief(ledger)}
${reask ? `\n${reask}\n` : ''}
Judge it, then file your one op …
```

The obvious form is the expensive one:

```js
// DO NOT — moves Think's stamp to bc5b2de9 and stales three packages (142 paid turns).
${ledgerBrief(ledger)}

${reask}
Judge it, then file your one op …
```

**A load-bearing prompt string lives in one exported place, so a tightening is a one-line diff the gate notices** (the module header, `:44–48`). `reaskBrief` is a function rather than a constant because it interpolates a seq and a list, so the gate pins its *produced* string instead — same guarantee, same one-line diff.

**A gate case that iterates its subjects gains a new subject by one array entry**, not by a bespoke assertion beside the loop. Case 31's loop already reads `for (const [label, build] of [[…], […]])`; Think joins it as a third entry.

---

## IMPLEMENTATION PLAN

**All four phases are ONE commit.** `CLAUDE.md` §Git asks for one atomic commit per ticket, and Phase 1 deliberately leaves the gate red on `tooling/build-checks.mjs:7186` — so nothing is committed until Phase 3's prose has landed and the gate is green again. Do not commit or push between phases.

### Phase 1: the code change

One line added, one line replaced, in `buildThinkTurn`. After this phase the gate is red on exactly one assertion — `:7186`, the deliberate pin whose own message names #366 — and green everywhere else. That intermediate red is expected and is the proof the pin was doing its job.

### Phase 2: the gate

**Depends on:** Phase 1 (the assertions describe the new behaviour).

Widen case 31's loop to Think, replace the Think-must-not line with the two new pins, add the key-set pin to case 30. After this phase the gate is green again.

### Phase 3: the prose

**Depends on:** Phase 2 (the group description restates what the case now asserts).

Five sites state the old scope and become false in Phase 1: `reaskBrief`'s comment, the header's `NOT reach Think` sentence, case 31's header comment, the gate's group description and `gates.md:49`. Two more make seven — the header's `:70` over-claim, which was already false before this ticket, and the re-ask branch added to the module's own list of declared exclusions. Seven sites, five tasks; the figure is derived in AC #5.

### Phase 4: validation

**Depends on:** Phase 3.

Full gate, the four reddening mutations driven and reverted, and a portal boot. The four are **M1** (the brief's wording, task 3), **M2** (Think's interpolation removed, task 2), **M3** (a `flag_weak_answer` appended to `FINGERPRINT_INPUTS.ledger`, task 3) and **M4** (a `think` key in `FINGERPRINT_INPUTS_FOR`, task 4).

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom.

### UPDATE `portal/lib/discovery-postures.mjs` — `buildThinkTurn` carries the re-ask brief

- **IMPLEMENT**: In `buildThinkTurn`, after the comment block that ends `// likely to act on), and it points back at the brief above rather than restating it.` and immediately before `const prompt = \`Turn ${turn}.` — that second anchor **occurs twice**, at `:282` here and at `:493` in Grill's audit template (`Turn ${turn}. Audit.`, which the shorter string is a prefix of), so take the FIRST match; the comment block above it is what disambiguates — insert:
  ```js
  const reask = reaskBrief(ledger, question.id);
  ```
  Then, inside that template, replace the **blank line** between `${ledgerBrief(ledger)}` and `Judge it, then file your one op against question_id` with:
  ```
  ${reask ? `\n${reask}\n` : ''}
  ```
  Nothing else in the template moves. Driven with a first-match replace: it lands at `:282`, and `diff` against the unpatched file returns exactly those two lines.
- **PATTERN**: `portal/lib/discovery-postures.mjs:414` and `:417–418` (`buildCreatePrdTurn`) — copy the two lines verbatim, including the ternary's exact spacing and its `''` empty branch. The Grill interview at `:456`, `:459–460` is the same pattern a second time.
- **IMPORTS**: none — `reaskBrief` is defined in this module at `:189`.
- **GOTCHA**: **The blank line is replaced, not added to.** `${ledgerBrief(ledger)}\n` + `''` + `\nJudge it` reproduces the `\n\n` Think has today. Writing `${ledgerBrief(ledger)}\n\n${reask}\nJudge it` instead moves Think's stamp from `7efdde37` to `bc5b2de9`, which stales `instrument-loans-1`, `graded-think-a` and `graded-opus-a` — 142 paid turns. Check the stamp before you go further (the VALIDATE below).
- **GOTCHA**: this file is **statically SDK-free and zod-free** (header `:39–42`) — group 30 imports it in CI with no `portal/node_modules`. Add no import.
- **OPTIONAL, not a prose site**: `buildCreatePrdTurn`'s comment at `:386–387` says its turn prompt "carries the re-ask brief on a second ask". `buildThinkTurn`'s two comment blocks — `:257–260` (the ledger is a required argument) and `:276–281` (the weak-answer note, and the closing line's recency) — were read against the patched template and neither states anything this change makes false, so no edit is forced. Mirroring Create PRD's sentence is welcome; it is **not** one of AC #5's seven sites and no VALIDATE checks it.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-366 && node -e "import('./portal/lib/discovery-postures.mjs').then(m=>{for(const [k,v] of Object.entries(m.POSTURES))console.log(k,v.fingerprint);console.log('grill@opus',m.resolvePosture({posture:'grill',model:'claude-opus-5'}).fingerprint);const F=m.FINGERPRINT_INPUTS;const f=[...F.ledger,{seq:4,op:'flag_weak_answer',params:{question_id:F.question.id,answer_ref:'a4',missing:['a number','a user']}}];console.log('think second ask carries brief:',/second ask/i.test(m.buildThinkTurn({...F,ledger:f}).prompt));})"`

  Driven on the patched copy, observed:
  ```
  think 7efdde37441fbd2591ba4a7dfeecdb6b
  think-opus cadb38117a2660c036d87e32323a8745
  create-prd edc7c52db9d58d59213e93e65cd8d28c
  grill 76b7847d4ebbd9d8f16f9726ff0f4f0f
  grill@opus ba124c3c1edb19905101aceca7c12e22
  think second ask carries brief: true
  ```
  All five hexes must match those bytes exactly. If any differs, the interpolation form is wrong — revert and re-copy from `:417–418`.
- **REDDENS**: n/a (this task adds behaviour, not a check). It does turn one existing check red, deliberately: `node tooling/build-checks.mjs` after this task alone exits 1 and gives `build discovery      ✗  1 failure(s)` · `case 31: Think must NOT carry the re-ask brief — its surface is stamped on five recordings (#366 stays open for Think by name)` · `build ✗  1 failure(s)`, and nothing else. Observed on the patched copy, with all five stamps unmoved on the same tree. The next task removes that pin.
- **SATISFIES**: AC #1, AC #2
- **REGENERATES**: none. `agent-layer/gen-loc-summary.mjs:22–26`'s `GROUPS` regexes are `^system/(wc/)?[^/]+\.(css|mjs|js)$`, `^(?:[^/]+|proto/[^/]+)\.html$` and `^agent-layer/[^/]+\.mjs$` — `portal/` and `tooling/` match none of them, so `system/loc-summary.json` and the two `approach` VR baselines do not move. No shipped page, no token, no spec, no `param-manifest` entry is touched.

### UPDATE `tooling/build-checks.mjs` — case 31's loop gains Think

- **IMPLEMENT**: change
  ```js
  for (const [label, build] of [["create-prd", buildCreatePrdTurn], ["grill", buildGrillTurn]]) {
  ```
  to
  ```js
  for (const [label, build] of [["create-prd", buildCreatePrdTurn], ["grill", buildGrillTurn], ["think", buildThinkTurn]]) {
  ```
  Think then inherits all five of the loop's assertions: the brief present verbatim, sitting after the ledger brief and before the closing line, absent from the system prompt, byte-identical on a flag for a different question, and absent on a first ask.
- **PATTERN**: `tooling/build-checks.mjs:7177`. `buildThinkTurn` is already imported into this file (used at `:7167`, `:7186`) — no import change.
- **GOTCHA**: the loop's ordering assertion reads `second.prompt.indexOf(brief) > second.prompt.indexOf("Parent candidates:")`. It holds for Think because `FINGERPRINT_INPUTS.ledger` has three decisions, so `ledgerBrief` renders its "Parent candidates:" branch. It would **not** hold over an empty ledger — do not "simplify" the loop's inputs.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-366 && node tooling/build-checks.mjs 2>&1 | grep -E "^build (✓|✗)|^    · "` — at this point one failure remains (`case 31: Think must NOT carry the re-ask brief …`), removed by the next task.
- **REDDENS**: remove the `const reask` line and restore the plain blank line in `buildThinkTurn`, then run the gate. Observed on that mutation:
  ```
  build discovery      ✗  2 failure(s)
      · case 31: the think second-ask turn prompt does not carry the re-ask brief VERBATIM (#366)
      · case 31: the think re-ask brief must sit after the ledger brief and BEFORE the closing line
  ```
  Revert the mutation afterwards.
- **SATISFIES**: AC #3
- **REGENERATES**: none (see the previous task's evidence).

### UPDATE `tooling/build-checks.mjs` — replace the Think-must-not pin with the wording pin and the exclusion pin

- **IMPLEMENT**: delete
  ```js
  ok(!/second ask/i.test(buildThinkTurn({ ...FINGERPRINT_INPUTS, ledger: flagged }).prompt), "case 31: Think must NOT carry the re-ask brief — its surface is stamped on five recordings (#366 stays open for Think by name)");
  ```
  and put in its place, still inside case 31's block:
  ```js
  ok(brief === "This is the second ask of this question. Your earlier flag (seq 4) said the answer lacked: a number · a user. Judge the NEW answer against that list; do not repeat the flag for something it now names.", `case 31: the re-ask brief WORDING moved — got ${JSON.stringify(brief)}. Either reaskBrief's template was edited, or this case's own flagged fixture was (seq 4, "a number · a user") — recompute the literal from the fixture if so. The brief sits OUTSIDE every posture fingerprint (FINGERPRINT_INPUTS.ledger carries no flag, so the branch is unreachable from the hash), so this literal is the only thing that makes an edit to it go red (#366)`);
  ok(!FINGERPRINT_INPUTS.ledger.some((r) => r.op === "flag_weak_answer"), "case 31: FINGERPRINT_INPUTS.ledger gained a flag_weak_answer — the re-ask branch would enter all four stamps and stale instrument-loans-1, graded-think-a and graded-opus-a (142 paid turns, $7.561). It is DELIBERATELY outside the hash; the wording pin above is what guards the branch instead (#366)");
  ```
- **PATTERN**: the neighbouring assertion at `:7176` already hardcodes `seq 4` and `a number · a user` from the same `flagged` fixture, so a literal here is house-consistent rather than novel.
- **GOTCHA**: `brief` is already in scope from `:7175` (`const brief = reaskBrief(flagged, qid);`) — do not recompute it.
- **GOTCHA**: the literal is coupled to the case's own `flagged` fixture (seq 4, `["a number", "a user"]`), so editing that fixture reddens this pin too — which is why the failure message names both causes. Both assertions above were transcribed straight out of this plan file into a patched copy of the gate and driven there: green as written, and reddening with the message pasted below.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-366 && node tooling/build-checks.mjs 2>&1 | grep -E "^build (✓|✗)"` → must print `build ✓  all 34 groups pass`. Observed, `exit=0`, on a copy carrying tasks 1–3 (the code change, the widened loop and these two pins) and nothing else.
- **REDDENS**: change `This is the second ask` to `This is the SECOND ask` inside `reaskBrief`'s returned template, then run the gate. Observed:
  ```
  build discovery      ✗  1 failure(s)
      · case 31: the re-ask brief WORDING moved — got "This is the SECOND ask of this question. Your earlier flag (seq 4) said the answer lacked: a number · a user. Judge the NEW answer against that list; do not repeat the flag for something it now names.". Either reaskBrief's template was edited, or this case's own flagged fixture was (seq 4, "a number · a user") — recompute the literal from the fixture if so. The brief sits OUTSIDE every posture fingerprint (FINGERPRINT_INPUTS.ledger carries no flag, so the branch is unreachable from the hash), so this literal is the only thing that makes an edit to it go red (#366)
  ```
  Note that this same mutation is **green on `origin/main`** — driven, `build ✓ all 34 groups pass` — which is the hole this pin closes. Second mutation: append `Object.freeze({ seq: 4, op: 'flag_weak_answer', params: Object.freeze({ question_id: 'fp-question', missing: Object.freeze(['a number']) }) })` to `FINGERPRINT_INPUTS.ledger`. Observed: 14 failures across three groups, including
  ```
      · case 31: FINGERPRINT_INPUTS.ledger gained a flag_weak_answer — …
      · case 30: Think's stamps are f7e65bec / f4c53c92 — the five recordings carry 7efdde37 / cadb3811 …
      · 32.2a: the Think prompt surface changed since the fixture was recorded (fixture 7efdde37 vs current f7e65bec) …
      · 33.15: graded-think-a carries fingerprint(s) 7efdde37, not the current think surface f7e65bec …
  ```
  Revert both mutations afterwards.
- **SATISFIES**: AC #3, AC #4
- **REGENERATES**: none.

### UPDATE `tooling/build-checks.mjs` — case 30 pins `FINGERPRINT_INPUTS_FOR`'s key set

- **IMPLEMENT**: immediately after the existing `FINGERPRINT_INPUTS_FOR.grill` shape assertion, add:
  ```js
  ok(same(Object.keys(FINGERPRINT_INPUTS_FOR), ["grill"]), `case 30: FINGERPRINT_INPUTS_FOR holds ${Object.keys(FINGERPRINT_INPUTS_FOR).join(", ")} — Grill alone has a second TEMPLATE, and every other posture hashes the one default set. A key added here widens a stamp and stales the recordings that carry it: instrument-loans-1, graded-think-a and graded-opus-a are 142 paid turns (#366)`);
  ```
- **PATTERN**: `tooling/build-checks.mjs:7110` (`ok(same([...MODEL_SETTABLE], ["grill"]), …)`) — the same key/member-set shape, in the same case. `same` is already in scope.
- **GOTCHA**: the existing line at `:7111` asserts the grill entry's *value* and `:7112` asserts the *freeze*; neither notices a new key. That is the gap — but **it is narrower than a first reading suggests, and the pin should be justified honestly.** Driven: with a `think` key wired into `POSTURES.think`'s stamp and this pin *absent*, today's gate already fails **8 times**, and four of those name the cause in words rather than in hex — `case 19` ×3 (among them "the hash is not over the inputs it exports" and "the fingerprint must be built from the FIXED inputs only"), plus `34.13: POSTURES.think.fingerprint is not the live hash of its own build and model`; `case 30: the one-input-set join must equal the default join and the posture's own stamp` names it too. The hex drift is `:7122`, `32.2a` and `33.15`. So the second route is **not** silent today. What none of those eight lines states is the **bill** — 142 paid turns across `instrument-loans-1`, `graded-think-a` and `graded-opus-a` — and that is what this pin adds, in the shape `:7110` already uses.
- **GOTCHA**: the pin also fires on a **bare `think` key with no wiring**, a change that moves no stamp at all. Driven: `think` stays at `7efdde37`, nothing else in the gate moves, and this pin is the single failure. That is deliberate — a half-finished widening is still a widening, and the edit that finishes it is one line away.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-366 && node tooling/build-checks.mjs 2>&1 | grep -E "^build (✓|✗)"` → `build ✓  all 34 groups pass`. Observed, `exit=0`, on a copy carrying the full change set — tasks 1–4.
- **REDDENS**: two edits to `portal/lib/discovery-postures.mjs`, together. First a second input set — the fixed inputs with a flag appended to their ledger. It does **not** exist in the repo, so the mutation introduces it, and it is written out here rather than named:
  ```js
  export const REASK_FINGERPRINT_INPUTS = Object.freeze({ ...FINGERPRINT_INPUTS, ledger: Object.freeze([...FINGERPRINT_INPUTS.ledger, Object.freeze({ seq: 4, op: 'flag_weak_answer', params: Object.freeze({ question_id: 'fp-question', missing: Object.freeze(['a number']) }) })]) });
  ```
  Then a key pointing at it, and Think's stamp wired to that key:
  ```js
  export const FINGERPRINT_INPUTS_FOR = Object.freeze({
    think: Object.freeze([FINGERPRINT_INPUTS, REASK_FINGERPRINT_INPUTS]),
    grill: Object.freeze([FINGERPRINT_INPUTS, AUDIT_FINGERPRINT_INPUTS]),
  });
  // in POSTURES.think:
  fingerprint: fingerprintOf({ build: buildThinkTurn, model: THINK_MODEL, inputs: FINGERPRINT_INPUTS_FOR.think }),
  ```
  Think's stamp then reads `8a4a26a315f9e9d16454a6e03afc99fd`; `think-opus` stays at `cadb3811…`, because only `think` was wired. Observed on **the full change set — all four tasks — plus this mutation**, `node tooling/build-checks.mjs`, `exit=1`, all nine lines:
  ```
  build discovery      ✗  6 failure(s)
      · case 19: fingerprintOf over the posture does not reproduce its own stored fingerprint — not deterministic
      · case 19: the fingerprint recomputed from FINGERPRINT_INPUTS is 7efdde37, the module's is 8a4a26a3 — the hash is not over the inputs it exports
      · case 19: the fingerprint must be built from the FIXED inputs only — a build over altered inputs differs, and the module's hash does not follow it
      · case 30: FINGERPRINT_INPUTS_FOR holds think, grill — Grill alone has a second TEMPLATE …
      · case 30: the one-input-set join must equal the default join and the posture's own stamp
      · case 30: Think's stamps are 8a4a26a3 / cadb3811 — the five recordings carry 7efdde37 / cadb3811 …
  build parenting      ✗  1 failure(s)
      · 32.2a: the Think prompt surface changed since the fixture was recorded (fixture 7efdde37 vs current 8a4a26a3) …
  build graded fixture ✗  1 failure(s)
      · 33.15: graded-think-a carries fingerprint(s) 7efdde37, not the current think surface 8a4a26a3 …
  build proposals      ✗  1 failure(s)
      · 34.13: POSTURES.think.fingerprint is not the live hash of its own build and model
  build ✗  9 failure(s)
  ```
  The new line is the only one that names the **bill**. Revert both edits afterwards.
- **SATISFIES**: AC #4
- **REGENERATES**: none.

### UPDATE `portal/lib/discovery-postures.mjs` — `reaskBrief`'s comment

- **IMPLEMENT**: in the comment block at `:183–188`, change `// The re-ask brief (#366, for the two #286 postures).` to name all three interview builds, and delete the final sentence `Think's second ask stays blind — #366 stays open for Think by name (the header says why).` Replace it with the reason the branch is unhashed, in one sentence: the ledger `fingerprintOf` hashes carries no `flag_weak_answer`, so this string sits outside every stamp and group 30 case 31's verbatim pin is what guards it.
- **PATTERN**: the neighbouring `ledgerBrief` comment at `:161–168`, which states purity, the exact fields read, and the invariant that ties it to `FINGERPRINT_INPUTS` ("widen both or neither").
- **GOTCHA**: keep the sentence `'' when the question was never flagged, so a first ask is byte-identical to a build without it` — it is now the load-bearing statement for all four postures, not two.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-366 && grep -n "stays blind\|for the two #286 postures" portal/lib/discovery-postures.mjs` → must return nothing.
- **REDDENS**: n/a (prose).
- **SATISFIES**: AC #5
- **REGENERATES**: none.

### UPDATE `portal/lib/discovery-postures.mjs` — the two header paragraphs

- **IMPLEMENT**: **two separate prose sites in this one task — AC #5 counts them separately, so tick them separately.**
  1. `:31–35` — the sentence `the two additions the new postures carry — JUDGEMENT_RULE (Run 0's F9) and reaskBrief (#366) — do NOT reach Think` is now half false. Split it: `JUDGEMENT_RULE` still does not reach Think; `reaskBrief` now does, and reaches it **without moving either stamp**, because the fingerprint's ledger carries no flag so the brief's branch is unreachable from the hash (#366). Keep `A Think edit is a ticket that re-records those fixtures` — it is still true of any edit that moves a stamp.
  2. `:70` — `THE FINGERPRINT COVERS EVERY TEMPLATE A POSTURE HAS (#286)` is true per template and false per **branch**. Qualify it in the same paragraph: it covers every template over the fixed inputs, and a template branch the fixed inputs do not reach — today, only the re-ask branch — sits outside it by construction.
- **PATTERN**: the header's existing habit of stating an invariant and immediately naming what it cannot reach (see `:31–36` and `:507–526`).
- **GOTCHA**: this is the file's own specification (`CLAUDE.md` §Ground rules — "invariants live in the file that owns them"), so an unfixed over-claim here is the defect, not a documentation nicety. It is the same class as the memory note **"the check that cannot fail"**: the tripwire skipping the branch it was added for.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-366 && grep -c "NOT reach Think" portal/lib/discovery-postures.mjs` → `0` (site 1 landed), then `sed -n '66,80p' portal/lib/discovery-postures.mjs | grep -c "per template"` → at least `1` (site 2 landed). Then read `sed -n '28,40p;66,80p' portal/lib/discovery-postures.mjs` back and confirm neither claim over-states, and `node tooling/build-checks.mjs 2>&1 | grep -E "^build (✓|✗)"` → `build ✓  all 34 groups pass` (comments are not hashed; a comment edit must not move a stamp — if one moves, you edited a template by accident).
- **REDDENS**: n/a (prose).
- **SATISFIES**: AC #5
- **REGENERATES**: none.

### UPDATE `portal/lib/discovery-postures.mjs` — add the re-ask branch to the declared exclusions

- **IMPLEMENT**: in the comment block above `FINGERPRINT_INPUTS` (`:507–526`), extend the existing sentence that lists what sits outside the hash — `the tool input schemas (TOOL_SCHEMA …), the fence's deny text (denyReason …) and the SDK's own preset sit OUTSIDE it — an edit to one of those does not make the fixture stale by name` — with the re-ask branch as a fourth entry, and give its reason, which differs from the other three:
  - those three are outside **structurally** (a cycle, a different module, the SDK's own);
  - the re-ask branch is outside because the fixed ledger holds no `flag_weak_answer`, and it is **left** outside deliberately: no committed recording has ever taken a second ask, so hashing the branch would declare 142 paid turns stale over prompts that genuinely did not change. `whole-bank` is not in `portal/lib/discovery.mjs`'s `LADDER`, so `graded-think-a` and `graded-opus-a` could not have taken one even in principle.
  - name its guard: group 30 case 31's verbatim wording pin, plus the two pins that make widening the hash a named failure rather than an accident.
- **PATTERN**: the same block's treatment of a per-posture SDK option (`:519–522`) — state the exclusion, state what it would take to fold it in, and name where that must happen.
- **GOTCHA**: do not write this as a to-do. It is a decision with a stated reason and a stated guard, and the OPEN QUESTIONS below record who can revisit it and at what price.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-366 && sed -n '505,530p' portal/lib/discovery-postures.mjs | grep -c "re-ask"` → at least `1`. Then read that range back in full and confirm it states the exclusion, its reason and its guard, and `node tooling/build-checks.mjs 2>&1 | grep -E "^build (✓|✗)"` → `build ✓  all 34 groups pass`.
- **REDDENS**: n/a (prose).
- **SATISFIES**: AC #5
- **REGENERATES**: none.

### UPDATE `tooling/build-checks.mjs` — the two case-description strings

- **IMPLEMENT**: two edits.
  1. The case-31 header comment at `:7126–7130`: `THE SHARED CONTRACT over all three new builds (#286)` becomes four builds, and the trailing clause `and the re-ask brief (#366) present with the first flag's seq and missing list on a second ask and absent otherwise.` gains the new scope and the two new pins.
  2. The `group("discovery", …)` ✓ description at `:7541`. It contains, verbatim, `the re-ask brief present with the first flag's seq and missing list on the second ask and absent otherwise (#366, for the two new postures; Think's stays blind by name)`. Replace the parenthetical with the new scope (all three interview builds; the audit still carries none) and add the wording pin and the fingerprint exclusion, so the group's own ✓ line states what it now proves.
- **PATTERN**: the group description is the gate's own write-up and already carries its "What it cannot reach" clause at the end of the string — the branch's unobserved status belongs there, not in the assertions.
- **GOTCHA**: this string is one enormous template literal on a single line. Edit it with a targeted string replacement, not by re-typing the line.
- **GOTCHA**: also state in the "what it cannot reach" tail that **no recording has ever taken a second ask on any posture**, so the brief's effect on a model is unobserved — that is the honest limit of everything this ticket lands. Verified: zero questions closed twice across all seven committed packages.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-366 && grep -c "for the two new postures" tooling/build-checks.mjs` → `0`. Then `node tooling/build-checks.mjs 2>&1 | grep -E "^build (✓|✗)"` → `build ✓  all 34 groups pass`.
- **REDDENS**: n/a (prose).
- **SATISFIES**: AC #5
- **REGENERATES**: none.

### UPDATE `.claude/references/gates.md` — group 30's write-up

- **IMPLEMENT**: on line 49, the clause `the re-ask brief (#366) present on a second ask and absent otherwise, for the two new postures only` becomes the new scope: present on all three interview builds and absent from the audit, its wording pinned verbatim because the branch sits outside every posture fingerprint, and `FINGERPRINT_INPUTS_FOR`'s key set pinned so widening a stamp fails by name. Line 49 carries **two** `*Cannot reach: …*` spans — one closing the #285 clause, one closing the #288 clause at the end of the line — so do not append to either. Open a `#366 added: … *Cannot reach: no recording has ever taken a second ask, so the brief is an unobserved prompt string on every posture.*` clause of its own at the end of the line, in the shape the PATTERN bullet below describes.
- **PATTERN**: line 49's existing per-ticket clauses (`#341 added: …`, `#347 added: …`, `#286 added THE THREE POSTURES …`). Append `#366 added: …` in the same shape rather than rewriting #286's clause wholesale — except for the one factual correction, which must land.
- **GOTCHA**: `.claude/references/gates.md` is the cross-file home for facts no single module owns (`CLAUDE.md` §Ground rules). Do not restate the module header's invariants here; state what the *gate* now proves.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-366 && grep -n "for the two new postures only" .claude/references/gates.md` → nothing; `grep -c "#366" .claude/references/gates.md` → at least `1`.
- **REDDENS**: n/a (prose).
- **SATISFIES**: AC #5
- **REGENERATES**: none.

---

## TESTING STRATEGY

There is no test suite, no linter and no type-check in this repo — do not hunt for one (`CLAUDE.md` §Ground rules). "Done" means the gate is green, the reddening mutations are proven, and the portal boots.

### Unit tests

`tooling/build-checks.mjs` group 30 is the unit layer. It imports `portal/lib/discovery-postures.mjs` directly and runs the real builders over `FINGERPRINT_INPUTS` — it never greps the source for this behaviour. Every assertion this plan adds runs a function.

### Integration tests

Groups 32 (`discovery/instrument-loans-1/`) and 33 (`graded-think-a`, `graded-opus-a`) compare committed recordings' `postureFingerprint` values against the live `POSTURES[...].fingerprint`. They are the integration layer here: they are the only thing that can tell you the prompt surface moved under a recording. Both must stay green, and their staying green is a positive result, not an absence of one — the M3 and M4 mutations above show them going red when the surface really moves.

### Edge cases

- **First ask, no flag anywhere** — `reaskBrief` returns `''` and the prompt must be byte-identical to today's. Covered by the loop's `first-ask prompt carries a re-ask brief` assertion, now over Think too.
- **A flag on a different question** — must leave the prompt byte-identical. Covered by the loop's `byte-identical to a first ask` assertion, now over Think too.
- **Two flags on the same question** — the FIRST one's seq and list, not the last. Covered at `:7176` (`!brief.includes("later")`).
- **Empty ledger on a second ask** — `ledgerBrief` takes its `none` branch, so there is no "Parent candidates:" line. Not covered by the loop (its fixture has three decisions) and deliberately not fixed here; see Non-Goals.
- **Audit** — no brief, ever. Covered at `:7212`, untouched.

### Proving the checks

Every check this plan adds has a named mutation above, each one **driven before the plan was written** on a hard-linked scratch copy, with the failure text pasted. The positive controls are the green runs recorded beside them. The wording pin's control is the strongest one available: the same mutation is **green on `origin/main` today**, so the pin closes a live gap rather than restating one.

---

## VALIDATION COMMANDS

Run from `/Users/Berzins/Desktop/Linards_current/wt-366`.

### Level 1: syntax and style

```bash
node --check portal/lib/discovery-postures.mjs
node --check tooling/build-checks.mjs
```

### Level 2: the gate (the repo's main check, and CI's)

```bash
node tooling/build-checks.mjs 2>&1 | grep -E "^build (✓|✗)|^    · "
```
Expected: `build ✓  all 34 groups pass`. Baseline on `31a46e8` before any edit: same, `exit=0` — driven.

### Level 3: the fingerprints, stated explicitly

```bash
node -e "import('./portal/lib/discovery-postures.mjs').then(m=>{for(const [k,v] of Object.entries(m.POSTURES))console.log(k,v.fingerprint);console.log('grill@opus',m.resolvePosture({posture:'grill',model:'claude-opus-5'}).fingerprint)})"
```
Expected, unchanged from `31a46e8`:
```
think 7efdde37441fbd2591ba4a7dfeecdb6b
think-opus cadb38117a2660c036d87e32323a8745
create-prd edc7c52db9d58d59213e93e65cd8d28c
grill 76b7847d4ebbd9d8f16f9726ff0f4f0f
grill@opus ba124c3c1edb19905101aceca7c12e22
```

### Level 4: manual validation — read the prompt the agent will get

```bash
node -e "import('./portal/lib/discovery-postures.mjs').then(m=>{const F=m.FINGERPRINT_INPUTS;const f=[...F.ledger,{seq:4,op:'flag_weak_answer',params:{question_id:F.question.id,answer_ref:'a4',missing:['a number','a named person','a frequency']}}];console.log(m.buildThinkTurn({...F,ledger:f}).prompt)})"
```
Read it. The brief must sit on its own paragraph after the parent-candidates block and before `Judge it, then file your one op`, with one blank line either side, and the system prompt must not contain it.

### Level 5: CI's other two steps, and the portal

```bash
node tooling/token-lint.mjs
node tooling/drift-check.mjs      # writes handoff/ — run on a CLEAN tree only
```
Neither should have anything to say about this change (no token, no spec, no shipped page). **`drift-check` run mid-merge reports false drift** — if the branch is behind `origin/main`, complete the merge first and re-run on a clean tree; a generated-file conflict is resolved by regeneration, never by hand.

Portal smoke, because the changed module is portal code. **Run it exactly as written** — this form was driven end to end and leaves nothing behind:
```bash
PORT=4791 node portal/server.mjs & echo $! > /tmp/portal-366.pid
sleep 2 && curl -s http://127.0.0.1:4791/api/health; echo
kill "$(cat /tmp/portal-366.pid)"; sleep 1
lsof -nP -iTCP:4791 -sTCP:LISTEN || echo "port 4791 clear"
```
Observed: the health JSON carrying `"ok":true` and `"stale":false`, then `bash: line 2: 5970 Terminated: 15   PORT=4791 node portal/server.mjs`, then `port 4791 clear`. `PORT` is honoured at `portal/lib/env.mjs:26` (`Number(process.env.PORT || 4747)`), and `env.mjs` resolves its paths from `import.meta.url`, so the server runs from the repo root and needs no `cd`.

**Do not write it as `cd portal && PORT=4791 node server.mjs & echo $!`.** The `&` backgrounds the whole AND-list, so `$!` captures the **subshell** rather than node. Driven verbatim: `bash: line 3: 5719 Terminated: 15   cd portal && PORT=4791 node server.mjs`, and then `node 5721 Berzins 15u IPv4 … TCP 127.0.0.1:4791 (LISTEN)` — the stray had to be killed by PID afterwards. That form leaves the machine dirtier than it found it, on the one trap this plan carries. `(cd portal && PORT=4791 exec node server.mjs) & echo $!` is the other correct shape; the `exec` is what makes `$!` node's own PID.

The `lsof` line is not decoration — it is AC #7's only proof the process actually died.

**Kill by PID or port only. Never `pkill -f 'node server.mjs'`** — parallel sessions run recorders in this worktree family and that command kills theirs. Expect stale portals on nearby ports; `lsof -nP -iTCP:4790-4799 -sTCP:LISTEN` names what is taken, so pick a free one.

The visual gate is **not** in scope: no shipped page changes, and it is Linux-baseline so it fails locally on macOS regardless.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| **The fingerprint decision** — whether the re-ask branch goes inside `think`/`think-opus`'s stamp | $7.561 and 142 paid turns to re-record `instrument-loans-1` (12t, $0.424), `graded-think-a` (65t, $3.243) and `graded-opus-a` (65t, $3.894), plus a re-pin of the hex literal at `tooling/build-checks.mjs:7122`; ceiling $8.639 / 166 turns if `bracket-trace-1` and `-2` are re-recorded too | **No** — this plan's recommendation is not to, and the code lands either way | Open a follow-up ticket if the owner chooses to widen the hash. The plan's gate pins make that choice a named failure rather than a silent one. |
| **The re-ask branch on `create-prd` and `grill` inside their stamps** — free, because no package was ever recorded under either posture | $0, two gate lines (`:7111`'s shape assertion and the new key-set pin) | **No** — this plan recommends against it as a half-measure; see OPEN QUESTIONS Q2 | Same follow-up ticket as above |
| **`--probe-reask`** — a one-turn paid observation that a model actually uses the brief on a second ask | one turn, roughly $0.03–$0.06 by the per-turn costs in `discovery/*/run.json` | **No** | Open a follow-up before the PR. Every other load-bearing prompt string in this module bought its confidence with a real run (`--probe-parenting`, `--probe-audit`); this one has not, and no committed package has ever taken a second ask on any posture. |
| **The owner's verdict on Q1/Q2 below** | the owner's hand | **No** | The plan records the recommendation and its evidence; the implementer does not decide it. |

No step in this plan spends money. Do not run `portal/record-*.mjs` without `--dry`.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — `buildThinkTurn`'s turn prompt carries the first `flag_weak_answer`'s seq and `missing` list on a second ask of that question, and is byte-identical to today's on a first ask or on a flag against a different question. Both `think` and `think-opus` get it, from the one edit.
- [ ] **AC #2** — all five posture fingerprints are unchanged: `7efdde37` / `cadb3811` / `edc7c52d` / `76b7847d` / `ba124c3c`. No committed run package is edited, re-recorded or staled.
- [ ] **AC #3** — group 30 case 31 asserts the re-ask contract over Think through the same loop it uses for the other two interview builds, and the loop reddens when the interpolation is removed (message pasted in the task).
- [ ] **AC #4** — the brief's wording is pinned verbatim, and both routes into the expensive branch (a flag in `FINGERPRINT_INPUTS.ledger`; a key in `FINGERPRINT_INPUTS_FOR`) fail by name with a message that states the bill.
- [ ] **AC #5** — no **live** prose — the module, the gate and `.claude/references/gates.md` — still says the brief reaches two postures only, or that Think's second ask stays blind, or that the fingerprint covers every branch. #286's committed plan and report carry both strings and stay as written, and so do this plan and its report, which quote the old strings as evidence. **Seven sites**, and one task carries two of them: `portal/lib/discovery-postures.mjs` ×4 (`reaskBrief`'s comment · the header's `NOT reach Think` sentence · the header's `COVERS EVERY TEMPLATE` claim · the `FINGERPRINT_INPUTS` exclusion list), `tooling/build-checks.mjs` ×2 (case 31's header comment · the group description), `.claude/references/gates.md` ×1.
- [ ] **AC #6** — `node tooling/build-checks.mjs` prints `build ✓  all 34 groups pass`; groups 32 and 33 are green on their live per-package fingerprint comparisons.
- [ ] **AC #7** — the portal boots and `/api/health` answers on a private port.
- [ ] **AC #8** — the PR body carries `Closes #366`, and its validation section states which of the paid steps were not run and names their tracker.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's VALIDATE run and its output matched
- [ ] All four reddening mutations — M1, M2, M3, M4 — driven and reverted, with the observed messages in the report
- [ ] `node tooling/build-checks.mjs` green
- [ ] `node tooling/token-lint.mjs` and `node tooling/drift-check.mjs` green on a clean tree
- [ ] Portal boots; `/api/health` answers; the process killed by PID
- [ ] `git status` shows exactly three changed files plus this plan and the report — no run package, no generated artifact
- [ ] Acceptance criteria all met
- [ ] Plan, report and review in the same PR (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`)

---

## OPEN QUESTIONS / ASSUMPTIONS

### Q1 — the fingerprint decision (owner's call, and the hardest thing in this ticket)

The re-ask branch of the turn template is not covered by any posture fingerprint, on any posture, today. `fingerprintOf` hashes `build(FINGERPRINT_INPUTS)`, and that fixed ledger (`portal/lib/discovery-postures.mjs:532–536`) holds three `record_decision` rows and no `flag_weak_answer`, so `reaskBrief` returns `''` every time the hash is computed. **Verified by mutation:** changing the brief's first sentence from `This is the second ask` to `This is the SECOND ask` on `origin/main` leaves all five stamps at their committed hexes and leaves `node tooling/build-checks.mjs` printing `build ✓ all 34 groups pass`. The module header at `:70` says the opposite — "THE FINGERPRINT COVERS EVERY TEMPLATE A POSTURE HAS" — which is true per template and false per branch.

Three branches, all measured rather than estimated:

| Branch | What it buys | Gate cost | Paid cost |
|---|---|---|---|
| **1. Think gets the brief; the branch stays unhashed on all four postures** (this plan) | The ticket's substance, on every posture. The wording guarded by a verbatim gate pin instead of the hash. | 4 lines: the loop widened, `:7186` replaced by two pins, one key-set pin in case 30. Measured: `build ✓ all 34 groups pass`. | **$0** |
| **2. Branch 1 plus a re-ask input set for `create-prd` and `grill` only** | Their branch inside their stamps. Free because no committed package was ever recorded under either posture — all seven are `think` or `think-opus`. | 2 lines, and it fights the key-set pin this plan adds. Measured **on top of branch 1's edits** (`node tooling/build-checks.mjs`, `exit=1`): 2 failures, both in case 30 — `FINGERPRINT_INPUTS_FOR.grill must be [FINGERPRINT_INPUTS, AUDIT_FINGERPRINT_INPUTS]`, because a third set breaks `:7111`'s length-2 shape, and the key-set pin, `FINGERPRINT_INPUTS_FOR holds create-prd, grill`. Groups 32 and 33 green. `:7186` does not appear — branch 1 deletes it. | **$0** |
| **3. Branch 2 plus a re-ask input set for `think` and `think-opus`** | The branch inside every stamp. | Measured naively (a flag appended to the shared `FINGERPRINT_INPUTS.ledger`): **14 failures across three groups** — 11 in `discovery`, 1 in `parenting` (`32.2a … fixture 7efdde37 vs current f7e65bec`), 2 in `graded fixture` (`graded-think-a` and `graded-opus-a` named stale). Plus a re-pin of the hex literal at `:7122`. | **$7.561 / 142 paid turns** — `instrument-loans-1` 12t $0.424, `graded-think-a` 65t $3.243, `graded-opus-a` 65t $3.894. Ceiling **$8.639 / 166 turns** if `bracket-trace-1` (12t $0.513) and `-2` (12t $0.565) are re-recorded too. |

**Recommendation: branch 1.** Three reasons, in order of weight.

1. **Branch 3 would buy false staleness.** Zero questions were closed twice across all seven committed packages, so no recorded turn's prompt ever contained the brief. Folding the branch into the hash would declare 142 turns stale over prompts that genuinely did not change. `whole-bank` is not in `portal/lib/discovery.mjs`'s `LADDER` (`:510`), so `graded-think-a` and `graded-opus-a` could not have taken a second ask even in principle — their 25 weak flags never held.
2. **The module already keeps a list of deliberate exclusions from the surface hash** (`:514–519`: `TOOL_SCHEMA`, `denyReason`, the SDK's preset — "an edit to one of those does not make the fixture stale by name"). Adding the re-ask branch to that list is house-consistent. The reason differs and the comment must say so: those three are excluded structurally, this one is excluded because hashing it would misreport recordings that never took it.
3. **Branch 2 is the worst of the three.** It hashes the branch on the two postures nothing has ever run under and leaves it unhashed on the two everything has, which is harder to explain than either extreme and buys no real protection.

The wording hole is real and must be closed either way — this plan closes it with a verbatim pin, which is free, covers all four postures at once, and is how every other load-bearing string in this module is guarded (`PARENT_RULE`, `JUDGEMENT_RULE`, `AUDIT_VERDICT_RULE`, pinned verbatim by cases 16, 31 and 32).

**Wrong if:** a recording is ever made that takes a second ask. From that moment the branch is part of a real prompt surface and the freshness argument inverts — the hash should then cover it, and the re-record bill is paid at that point, not before.

### Q2 — does #366 close with the branch unhashed?

Yes, on this plan's reading: the ticket asks for the first flag's `missing` list in the turn prompt, and it lands on every posture. The unhashed branch is a newly-documented seam with a named guard, not unfinished #366. If the owner disagrees, the alternative is to land branch 1 and re-title #366 to the fingerprint question — but do not leave it open with the current title, which will then be false for all four postures.

### Q3 — does the brief need a paid observation before it is trusted?

Probably, eventually. It is an unobserved prompt string: no recording has taken a second ask, so nobody has seen a model use it. Every other load-bearing string here bought its confidence with a real run (`--probe-parenting` after #341's rehearsal filed null 18 of 18 times; `--probe-audit` for the wrong-if rule). A `--probe-reask` in the same shape is a one-turn observation. It is in the paid table, it does not block this PR, and it should get its own ticket.

### Q4 — should the brief carry the earlier answer's text as well as the missing list?

Not in this ticket. `reaskBrief` reads `params.question_id` and `params.missing` and never answer text, which is consistent with the answer-by-reference rule the whole grammar rests on. It does mean the agent judges the new answer against a list of gaps without seeing what it is an improvement on. Worth a design conversation; it would change `reaskBrief`'s output and therefore the two postures already carrying it, so it is a separate ticket with its own gate re-pin.

### Q5 — does #366 stay labelled Low?

Its severity rested on "it can only re-flag blind", which is accurate. The cost that justified deferring it twice (#285 excluded posture edits for fingerprint churn; #366 repeats the reasoning) is measurably zero. The label is the owner's to change; the plan does not.

### Assumptions

- The gate's `same()` helper is in scope in case 30 — confirmed, used two lines above the insertion point.
- No parallel session is mid-edit on `portal/lib/discovery-postures.mjs`. **Verify the branch immediately before committing and stage by explicit path** — this worktree family shares a working directory with parallel ticket sessions.
- The op-verb lock does not apply: no verb is added, no `PARAMS` entry moves, `discovery/ops.mjs` is untouched.

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed in the plan

Everything below was driven read-only against `/Users/Berzins/Desktop/Linards_current/wt-366` at `31a46e8`. **The worktree was never written to.** Every patch went to a `cp -al` hard-linked copy under the session scratchpad, with the target file `unlink`ed before writing so the original inode was never touched. Confirmed after every run: `git status --porcelain` empty, and the module still importing as `7efdde37`.

**1. Every VALIDATE that touches existing code was driven.**

| Command | Observed |
|---|---|
| `node tooling/build-checks.mjs` on HEAD | `build ✓  all 34 groups pass`, `exit=0` — the baseline every measurement below is diffed against |
| the fingerprint one-liner on HEAD | `think 7efdde37… · think-opus cadb3811… · create-prd edc7c52d… · grill 76b7847d… · grill@opus ba124c3c…` |
| the fingerprint one-liner on the Form-A patched copy | **all five byte-identical**, and `think second ask carries brief: true` |
| `node tooling/build-checks.mjs` on the Form-A copy | `build discovery ✗ 1 failure(s) · case 31: Think must NOT carry the re-ask brief — its surface is stamped on five recordings (#366 stays open for Think by name)`. Nothing else. Groups 32 and 33 green. |
| `node tooling/build-checks.mjs` on the full change set (code + 4 gate lines) | `build ✓  all 34 groups pass` |
| M1 (`second ask` → `SECOND ask` in `reaskBrief`) | 1 failure, the wording pin, message pasted in the task |
| M2 (Think's interpolation removed, gate widened) | 2 failures, both from the widened loop, named `think` |
| M3 (a flag appended to `FINGERPRINT_INPUTS.ledger`) | **14 failures across three groups** — `discovery ✗ 11`, `parenting ✗ 1`, `graded fixture ✗ 2` |
| M4 (a `think` key added to `FINGERPRINT_INPUTS_FOR` **and wired into `POSTURES.think`'s stamp**) | **9 failures** — the key-set pin by name, alongside case 19 ×3, case 30's one-input-set-join line, case 30's hex pin, `32.2a`, `33.15` and `34.13` |
| the same M1 mutation on **unpatched HEAD** | `build ✓  all 34 groups pass` — the hole, confirmed live |

**2. Every citation resolved.** `reaskBrief` at `:189` with call sites at `:414`/`:417–418` and `:456`/`:459–460`; the header claims at `:31–35` and `:70`; the comment at `:183–188`; `FINGERPRINT_INPUTS` at `:527–537` with its exclusion list at `:514–519`; `FINGERPRINT_INPUTS_FOR` at `:548–550`; `RE_ASKS` at `discovery.mjs:567` and `deriveCursor`'s hold at `:613`; `LADDER` at `:510`; the drawer's `asked again` at `portal.js:996`; the transport's single build call at `discovery-transport.mjs:153`; the gate at `:7111`, `:7122`, `:7177`, `:7186`, `:7212`, `:7541`, `:8178`, `:8634`; `gates.md:49`. Each opened and read this session.

**3. Landed claims checked against the tree.**
- The issue says the brief "never reaches the turn prompt" → **false for two of four postures.** `grep -n 'reaskBrief'` returns the definition plus four call-site lines.
- The issue says it "needs a fingerprint bump and the group 32 fixture regenerated in the same PR" → **disproven.** Measured: zero stamps move, one gate line flips, group 32 green.
- All seven committed packages are `think` or `think-opus` — so `create-prd` and `grill` have gates, fingerprints and a full prompt surface with **zero paid observation behind them**. Derived from `for f in discovery/*/run.json; do node -e "…j.posture…"; done`.
- Zero questions closed twice, across all seven. Derived from a per-package fold over `transcript.jsonl` counting closers by `question_id`.
- `spine-meridian-1` (committed 2026-08-29) has a `flag_weak_answer` at seq 2 whose next closer sits on the *next* question — it predates #285's hold rule (`git log -S "asks < 2"` → `38adc90`, 2026-09-04). `discovery/README.md:269–272` already documents that such a package reads as held today.
- `allergen-matrix-1` carries `df6fbc35`, already stale against the current `7efdde37`, with a green gate — no group compares its stamp. `bracket-trace-1` and `-2` are in the same position. **Three of the six stamped packages are gate-compared, not all six.** Worth knowing before treating a green run as proof every recording matches the tree.

**4. Tasks reconciled.** The one place a GOTCHA constrains an IMPLEMENT — the interpolation form — the IMPLEMENT names the form and the GOTCHA names the alternative and its price. The re-record bill is derived once (`0.424 + 3.243 + 3.894 = 7.561`; `12 + 65 + 65 = 142`) and every section that quotes it quotes those figures. Every MIRROR target was opened and confirmed to obey the rule the task states.

**5. Known traps checked and carried.**
- *A fingerprint change stales committed recordings by name* — the whole subject of Q1; carried as a GOTCHA on task 1 and measured in M3/M4.
- *`gen-loc-summary` counts tracked files, cascading to `loc-summary.json` and the two approach VR baselines* — **does not apply**, and the evidence is the source rather than an assertion: `agent-layer/gen-loc-summary.mjs:22–26`'s three `GROUPS` regexes match `system/`, root/`proto/` HTML and `agent-layer/` only. `portal/` and `tooling/` match none. `REGENERATES: none` on every task.
- *A `tokens.source.json` change needs `gen-handoff` too* — does not apply; no token is touched.
- *`drift-check` run mid-merge reports false drift* — carried in Level 5.
- *The visual gate is Linux-baseline and fails locally on macOS* — carried in Level 5; out of scope anyway.
- *Kill servers by PID only* — carried in Level 5, with the reason (parallel sessions' recorders) **and with a command that actually does it**: the first draft backgrounded an AND-list, so `kill $!` reached the subshell and left node listening. Both forms driven; the failing one is written into Level 5 as the thing not to do.
- *`drift-check` syntax-checks every tracked `.mjs`, including `.claude/plans`* — this plan is `.md`, so nothing to park as `.txt`.
- *A PR title mentioning `(#N)` closes nothing* — carried in Related Work and AC #8.
- *Shared worktree, parallel sessions* — carried in Assumptions.
- *"The check that cannot fail"* — this is that pattern exactly: the tripwire skipping the branch it was added for. Named in the header task's GOTCHA.

### What changed in the plan because of the pre-flight

- **The plan was rescoped from "build the re-ask brief" to "give it to Think".** The issue's headline claim is stale; reimplementing `reaskBrief` is the top defect class in this repo (52% of reports) and would have been the natural reading of the ticket.
- **The interpolation form was promoted from an implementation detail to a GOTCHA with a measured price**, after three forms were tested and one of them moved the stamp.
- **Two gate lines were added that the ticket does not ask for** — the wording pin and the exclusion pin — after M1 on unpatched HEAD came back green, proving a live hole.
- **A fourth gate line was added** (the key-set pin) after noticing that case 30 asserts `FINGERPRINT_INPUTS_FOR`'s value and its freeze but not its key set. The first draft justified it as closing a silent route; the adversarial pass measured that route and found today's gate already reddens on it eight times, four of them in words. The pin's real value is the one thing those eight lines do not state — the re-record bill. M4 confirms it fails by name.
- **The header correction at `:70` was added** — it was already false before this ticket and would have been left false by a narrower reading.
- **`cursor.ask` was explicitly moved to Non-Goals with its reason**, because the issue's title names it and a reviewer diffing against that title would otherwise read the PR as half-done.
- **The "Parent candidates" pointer was investigated and demoted.** On an empty ledger the closing line points at a line `ledgerBrief` did not print — but the `none` branch answers the question in its own words, so it is an infelicity, not the defect it first looked like. Out of scope, and fixing it inside Think's template would cost $7.561.

### Adversarial pre-flight, 2026-09-07 — the eleven findings

A second, adversarial pass was run against this plan and returned eleven findings, three of them medium. **All eleven were re-derived against the tree in this session and all eleven hold; none was rejected.** Every figure below names the tree that produced it — the earlier write-up labelled one measurement against the wrong tree, and naming them is what stops that recurring.

Each tree is a `cp -al` hard-linked copy under the session scratchpad, with the target file unlinked before writing so the worktree's inode was never touched — confirmed after every run by `git status --porcelain`, which stayed at this plan alone.

| Tree | What it carries | `node tooling/build-checks.mjs` |
|---|---|---|
| **A** — the code change alone | task 1 only | `exit=1`, `build discovery      ✗  1 failure(s)`, the `:7186` pin and nothing else. All five stamps unmoved, `think second ask carries brief: true` |
| **B** — the full change set | tasks 1–4 | `exit=0`, `build ✓  all 34 groups pass` |
| **B⁻** — the change set without the key-set pin | tasks 1–3 | `exit=0`, `build ✓  all 34 groups pass` — task 3's VALIDATE |
| **C** — B plus M4 | the `think` key wired into Think's stamp | `exit=1`, **9 failures** |
| **D** — B minus the key-set pin, plus M4 | | `exit=1`, **8 failures** — the comparison the key-set GOTCHA now rests on |
| **E** — B plus a bare `think` key, unwired | | `exit=1`, **1 failure**, the key-set pin alone; `think` still `7efdde37` |
| **F** — B plus branch 2's input sets | Q1's branch 2 | `exit=1`, **2 failures**, both in case 30 |

What each finding changed:

- **F1 (medium)** — the portal smoke. The old form was driven verbatim and reproduced the defect: the subshell died (PID 5719) while node kept the port (PID 5721, killed afterwards by PID). Replaced with a form driven clean, plus the `lsof` line that gives AC #7 its proof. The `exec` alternative was driven too, on port 4793, and is clean as well.
- **F2 (medium)** — `REASK_FINGERPRINT_INPUTS` exists nowhere in the repo (`grep -rn "REASK_FINGERPRINT_INPUTS" --include="*.mjs" --include="*.js" --include="*.md" .` returns this plan alone), so M4 was not executable as written. The mutation now writes the constant out and says it introduces it.
- **F3 (medium)** — the key-set GOTCHA over-claimed, and its pasted output was cut to four of nine lines, all of them ones that support the claim. Tree D shows the cause already named in words four times with the pin absent; tree C's full nine-line list is now pasted, and tree E's bare-key case is stated.
- **F4** — the prose figure is derived once and quoted: five sites state the old scope, two more make seven, across five tasks.
- **F5** — four mutations, not three, named M1–M4 in Phase 4 and the checklist so the report's Not-run section can be read against them.
- **F6** — task 1's third GOTCHA ordered an edit and pointed at a prose task that does not cover it. `buildThinkTurn`'s two comment blocks (`:257–260`, `:276–281`) were read against the patched template and neither becomes false, so the bullet is optional and the pointer is gone.
- **F7** — four citation offsets corrected: `:507–551` → `:507–557` (the old range excluded `fingerprintOf` at `:553`), `:531–535` → `:532–536`, `:38–41` → `:39–42`, and NOTES' `:527–536` → `:527–537`. A fifth was found while re-resolving them and corrected too: `buildThinkTurn` spans `:261–298`, not `:264–301`.
- **F8** — the insertion anchor occurs twice (`:282` and `:493`); the task now says so and says which match to take.
- **F9** — AC #5 claimed the whole repo and could not be ticked: #286's plan and report carry both strings, and so does this plan. Scoped to live prose.
- **F10** — `gates.md` line 49 carries two `*Cannot reach:*` spans, so "the group's existing italics" named nothing. The task now opens a `#366 added:` clause of its own.
- **F11** — Q1's branch-2 row named the `:7186` line, which branch 1 deletes, so it had been measured on today's gate rather than on branch 1. Re-measured on tree F.

M1, M2 and M3 were re-driven as well and each reproduced its pasted output exactly: M1 one failure (the wording pin) on tree B, and `build ✓  all 34 groups pass` on unpatched HEAD; M2 two failures, both naming `think`; M3 14 failures across three groups, `think f7e65bec` / `think-opus f4c53c92`.

### The prompt, before and after

Today, on a second ask under Think (driven over `FINGERPRINT_INPUTS` with a `flag_weak_answer` at seq 1 and an otherwise empty decision ledger), the whole turn prompt is:

```
Turn fp.

The question (stage 0, FIXED):
A fixed question for the fingerprint.

What a weak answer to this question looks like:
A fixed weak-answer note.

The person's answer, stored as fp1:
A fixed answer.

Decisions in this run so far: none. A stakeholder, solution or transition decision filed now has no parent candidate — pass parent_id null.

Judge it, then file your one op against question_id "fp-question" and answer_ref "fp1" — and, if that op is a record_decision below business, take parent_id from the "Parent candidates" line above.
```

`Think byte-identical to a build with the flag removed from the ledger: true`. After this ticket, one paragraph is inserted before the closing line:

```
This is the second ask of this question. Your earlier flag (seq 1) said the answer lacked: a number · a named person · a frequency. Judge the NEW answer against that list; do not repeat the flag for something it now names.
```

### Confidence

**9.5/10** for one-pass success. The whole change set was written, run and reddened before the plan was, on a hard-linked copy; the exact diff is two source lines and four gate lines, and every failure message in this plan is pasted from a real run rather than predicted. The remaining half-point is Q1 — if the owner chooses branch 3, the implementer's work is unchanged but a re-record follows, and that is not a decision this plan makes.

### Note on the template

The skill's final section asks for a companion `.claude/plans/<same-name>.html` build brief. Not written: this session's write permission is the single `.md` path above, and the house rule is that deliverables are `.md` at the named path with no unrequested HTML. Deliberate omission, not a miss.

## AMENDMENTS

- 2026-09-07 — adversarial pre-flight correction pass. Eleven findings re-derived against the tree; all eleven held and none was rejected. Fixed: the portal-smoke command (it killed a subshell, not node), M4's undefined `REASK_FINGERPRINT_INPUTS`, the key-set GOTCHA's over-claim and its truncated output, the prose-site count, the mutation count, task 1's comment GOTCHA, five citation offsets, the non-unique insertion anchor, AC #5's repo-wide claim, the unnamed `gates.md` span, and Q1's branch-2 measurement. The headline was re-derived on a hard-linked copy: giving Think the brief in Create PRD's form moves zero fingerprints and turns exactly one assertion red — `case 31` at `tooling/build-checks.mjs:7186`, `exit=1`. No task, phase or acceptance criterion was added or removed.
