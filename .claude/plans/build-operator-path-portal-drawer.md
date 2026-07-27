# Feature: the operator path — the /build questionnaire drives a real composition run

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and modules. Import from the right files —
in particular, **import the question config from `system/build-questions.mjs`, never re-declare it**.

Ticket: [#140](https://github.com/linardsb/ux-factory/issues/140) · Epic:
[#134](https://github.com/linardsb/ux-factory/issues/134) (plan
`.claude/plans/hooked-shapeup-pattern-builder.md`, Slice 3) · Records the absorbed intent of closed
epic [#86](https://github.com/linardsb/ux-factory/issues/86).

## Feature Description

/build's ten questions currently do one thing: in the visitor's browser, committed rules
(`system/pattern-rules.mjs`) name a UI pattern from their answers and render it. This ticket gives
the **same ten answers** a second, build-time job: in the portal, they draft the **question a real
Agent SDK run answers** about a scenario's own data, and that run's committed composition ships into
the private-instance prototype slot.

The claim it earns is the one the epic plan called out as the reason to build /build on the agentic
renderer at all: *the operator's agent proposes into the exact surface the visitor played with*. Same
answers, same vocabulary, same renderer — one path runs committed rules in a browser, the other
briefs a real agent at build time.

Nothing about the run's honesty machinery changes. `buildTask()` in
`portal/record-composition.mjs` is not touched: the prompt is still built only from the vocabulary,
the scenario's declared fixtures, the question, the slot bounds and the DEFINITIONS-ONLY
`computeRules`. What this ticket adds is **who authored the question** — committed rules over ten
enum answers instead of an operator typing into a terminal — plus the portal UI that shows the draft,
the ethics verdict and the live run.

## User Story

As the operator preparing a bespoke application instance
I want to answer the same ten method questions in the portal and watch a real agent compose a view of
that company's data
So that the composed screen that ships in their private instance is briefed by the method the
portfolio claims to work by, without me hand-writing a prompt or hand-editing an artifact.

## Problem Statement

Three gaps sit between the shipped questionnaire and a shipped instance:

1. **The questionnaire is browser-only.** `system/build-questions.mjs` is Node-import-safe (verified:
   `node -e "import('./system/build-questions.mjs')"` returns 10 questions), but nothing build-time
   reads it. The operator path is a hand-typed CLI question with no relationship to the method.
2. **The runner is CLI-only and signals failure by side effect.** `portal/record-composition.mjs`
   keeps `main()` module-private and reports invalid/PIV-incomplete runs with `process.exitCode = 1`
   plus stderr. Exposed to a server as-is, a failed run would set the *portal process's* exit code
   and return normally — the UI would render success over a dropped artifact.
3. **`compose.json` is load-bearing and undocumented.** The runner hard-validates seven fields of
   `scenarios/<slug>/compose.json` and throws well, but the file appears nowhere in
   `scenarios/README.md`, `scenarios/validate.mjs` or `agent-layer/gen-company-package.mjs`. An
   operator meeting the refusal has no spec to write against.

## Solution Statement

A new `portal/lib/builder.mjs` holding **three committed rules** that draft a composition question
from the answers, plus a portal drawer that renders the shipped question config, previews the draft
against the scenario's own slot bounds, and streams the real run.

```
portal drawer  ──  the SHIPPED QUESTIONS config (GET /api/build/config)
      │                   ten answers, defaults + reasoning, accept-and-advance
      ▼
builder.mjs    ──  rule 1: `shape`  names the question      ─┐
                   rule 2: `action` names who it is for      │  drafted, then EDITABLE
                   rule 3: the other eight enter no prompt  ─┘  (the breadboard's contract)
      │            + the ethics verdict, from build-questions.mjs's own functions
      ▼
record-composition.runComposition()  ── UNCHANGED prompt construction, unchanged fence
      │                                  now returns {ok, reason, paths, stats} instead of exitCode
      ▼
proto/compositions/northwind/<slug>.json + traces/<slug>.{raw.jsonl,jsonl} + index.json upsert
      ▼
instance.html (already wired, #89) renders the new entry through renderStudy — no code change
```

The scenario is chosen from the in-repo packages that carry a `compose.json`. **`builder.mjs`
refuses a package whose `brief.md` head says `fictional: false`**, naming the privacy boundary —
because every real-run path in `record-composition.mjs` is anchored to `REPO_DIR`, and real employer
material is never written inside this public repo.

## Out of Scope / Non-Goals

- **Not included: running against a real, out-of-repo company package.** `loadComposeConfig`,
  `refsFor`, the `readOk` fence set, `compDir`, `rawOut` and `curatedOut` are all `REPO_DIR`-anchored
  and the CLI has no path flags. Giving the runner a `--root`/`--out` seam means editing the honesty
  fence itself and re-siting the privacy guard — a ticket of its own. This one ships the **refusal**
  instead, so the first real use fails loudly with a message naming `scenarios/README.md §Provenance`.
  Owner decision, 2026-07-27.
- **Not included: a `compose.json` generator or scaffold writer.** `computeRules` is the honesty
  firewall; a generator that drafts it from brief prose is precisely the mechanism that would launder
  "which metrics answer this" into the prompt. The refusal (already well-worded in
  `loadComposeConfig`) is surfaced verbatim, and the format is **documented** in
  `scenarios/README.md` instead.
- **Not included: the ceiling engine** (screenshots → bespoke specs, epic #86 §Spike 2 / issue #90).
  This is the floor path only, per that epic's fidelity-ladder decision.
- **Not included: running `build-instance.mjs` or `wrangler` from the portal.** Deploy stays a
  printed, human step (hard, from `per-company-brief.architecture.md`). The drawer prints the
  `--compositions` command; it does not run it.
- **Not changing:** `buildTask()`, `PIV_COMPOSE_SYSTEM`, `makeFence`, `SECRET_PATHS`, the curate →
  validate keep-gate, or any committed composition/trace already on disk.
- **Not changing:** any shipped page. No `system/*.mjs|css` file is added or edited, so
  `loc-summary.json` does not move and no visual baseline is touched (verified against
  `gen-loc-summary.mjs`'s three group regexes and `visual.spec.mjs`'s page list —
  `instance.html` is not in the VR set).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `portal/` (new lib + 3 routes + drawer), `portal/record-composition.mjs`
(library extraction), `tooling/build-checks.mjs` (one new group), docs
**Dependencies**: none new. `@anthropic-ai/claude-agent-sdk` is already the portal's sole dependency
and is reached only through `record-composition.mjs`, via a **dynamic import** (see Task 3's GOTCHA).

## Related Work

**Implements**: [#140](https://github.com/linardsb/ux-factory/issues/140) · **Epic**:
[#134](https://github.com/linardsb/ux-factory/issues/134) —
`.claude/plans/hooked-shapeup-pattern-builder.md` §"Slice 3 — the operator path (absorbs #86)"

**Back-references**:

- `.claude/plans/hooked-shapeup-pattern-builder.md` — Why: the epic plan. Slice 3's scope, and the
  NOTES entry ("slice 3 gets 'the operator's agent proposes into the exact surface you played with'
  for free") that this ticket cashes in.
- `docs/epics/generative-prototyper.architecture.md` — Why: the **inherited** architecture for this
  path. Missing pieces #1 (parameterized runner, done by #88) and #3 (build-instance bespoke step,
  done by #89); the floor-vs-ceiling ladder; the privacy and honesty boundaries. **Do not re-decide
  anything in it.**
- `.claude/plans/floor-runner-parameterize-composition-spike1.md` (#88) — Why: defines `compose.json`
  and the byte-level prompt-fidelity technique this plan reuses as a gate.
- `.claude/plans/floor-into-instance-prototype-slot-reader-adjust.md` (#89) — Why: the downstream
  half is already built; this plan must not touch it.
- `.claude/plans/build-questions-breadboard.md` (#136) — Why: the shipped question config, the
  BUILD_CHANGE contract, and the "drafted then editable" contract this plan mirrors.
- `.claude/plans/figma-drop-portal-ui.md` (#116/#124) — Why: the portal drawer precedent —
  `portal/lib/figma.mjs`'s "one return shape for both outcomes", `assertSlug`, the drawer markup.

**Forward-references**: (none yet — the out-of-repo runner seam and epic #90's ceiling engine are the
two natural follow-ups.)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `portal/record-composition.mjs` (whole, 434 lines) — Why: the runner being extracted. Read
  `loadComposeConfig` (66-105), `buildTask` (167-196) **which must not change**, `makeFence`
  (228-252), `summarize` (262-280), `main` (322-420) and the CLI guard (422-434).
- `system/build-questions.mjs` (lines 114-332 the config, 78-89 the two verdict functions, 287-313
  `SUMMARY_TERM` + `QUADRANT_MEANINGS`) — Why: the config to import, never fork. Note it is
  Node-import-safe by design and `DEFAULT_ANSWERS` is derived from `QUESTIONS`.
- `system/pattern-rules.mjs` (whole) — Why: the model for `builder.mjs`'s rules module — committed
  rules that name a thing from answers, with a header that states plainly what the rules read and
  what they do not invent. Mirror its voice.
- `portal/lib/figma.mjs` (whole, 103 lines) — Why: the portal-lib pattern. `assertSlug`'s
  reserved-name refusal (25-34), "one shape for both outcomes" (84-103).
- `portal/lib/chat.mjs` (31-82) — Why: the only SSE precedent —
  `send = (obj) => res.write(\`data: ${JSON.stringify(obj)}\n\n\`)`, `res.on('close', …)` to
  interrupt, `res.end()` at the finish.
- `portal/lib/trace-recorder.mjs` (57-119, 165-219) — Why: where the optional `onStep` hook goes,
  and the "a recording bug must never alter the run it observes" discipline every hook here follows.
- `portal/server.mjs` (43-95) — Why: the route-dispatch idiom. Note `readBody`'s 1 MB cap and the
  single catch-all returning `{ error }`.
- `portal/public/index.html` (lines 54-90, the `#figma-drawer`) + `portal/public/portal.js`
  (135-249, the figma drawer logic) — Why: the drawer markup + JS to mirror. Note `esc()` (line 3)
  and that `postPull` exists because the shared `api()` helper assumes JSON — this drawer's
  streaming route needs the same kind of exception.
- `scenarios/northwind/compose.json` + `scenarios/fieldwork/compose.json` — Why: the two configs the
  drawer reads; northwind's `subject` string is what the drafted questions interpolate.
- `scenarios/northwind/brief.md` (lines 11-19, the json head) — Why: the `fictional` flag the
  privacy refusal reads.
- `proto/compositions/northwind/index.json` — Why: the manifest the run upserts into, and the exact
  entry shape (`slug, question, slot, proposal, trace`).
- `instance.html` (lines 711-725, the `INSTANCE_CONFIG.composition` block) + `system/instance.mjs`
  (330-395, `renderPrototype`) — Why: proof that the downstream needs **no change** — the shell reads
  the whole manifest, so a fourth entry renders automatically.
- `tooling/build-checks.mjs` (1-60 header + helpers, 109-162 group 1) — Why: the gate to extend.
  `ok()` / `group()` / the "every group iterates PATTERNS so a new entry fails loudly" discipline,
  and the hardcoded `all 7 groups pass` line at the very bottom.
- `scenarios/README.md` (§Provenance, §Package layout, §File shapes) — Why: where the `compose.json`
  section belongs, and the provenance language the privacy refusal must cite.

### New Files to Create

- `portal/lib/builder.mjs` — the operator path: answer validation, the three drafting rules, the
  scenario reader with the privacy refusal, and the run wrapper. ~280 lines.

### Files to Modify

- `portal/record-composition.mjs` — export `runComposition` with a structured return; CLI wrapper
  keeps the exit-code behaviour. Also export `loadComposeConfig` (the drawer needs slots + subject).
- `portal/lib/trace-recorder.mjs` — one optional `onStep` parameter.
- `portal/server.mjs` — three routes.
- `portal/public/index.html` · `portal.js` · `portal.css` — the drawer.
- `tooling/build-checks.mjs` — group 8 + header + the verdict count.
- `scenarios/README.md` · `docs/epics/generative-prototyper.architecture.md` · `CLAUDE.md` — docs.

### Generated by the real run (committed, never hand-edited)

- `proto/compositions/northwind/<slug>.json` · `traces/<slug>.raw.jsonl` · `traces/<slug>.jsonl` ·
  `proto/compositions/northwind/index.json` (upsert).

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/generative-prototyper.architecture.md` §"Key decisions" + §"Open questions" (the
  resolved `compose.json` shape, line 124) — the inherited architecture. Adds the honesty-firewall
  wording this plan must not weaken.
- `traces/README.md` — the Trace JSONL contract the keep-gate enforces; `traces/` is a **flat**
  namespace, which is why slugs must be scenario-prefixed.
- `.claude/references/kb-format.md` — only if a record shape is touched (it should not be).
- [MDN — Server-sent events / EventSource](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format)
  — Why: the `data: …\n\n` framing. Note the drawer must POST, so it reads the stream with
  `res.body.getReader()` exactly as `portal.js:386-403` already does for chat, **not** `EventSource`.

### Patterns to Follow

**Module headers cite their governing doc** (project rule):

```js
// portal/lib/builder.mjs — the operator path: /build's ten answers brief a real composition run
// (epic #134 ticket #140, absorbing epic #86's floor path;
// .claude/plans/build-operator-path-portal-drawer.md).
```

**Hand-validate at the boundary and throw an Error naming the offender** — the whole repo's idiom
(`portal/lib/figma.mjs:28-34`, `record-composition.mjs:78`):

```js
const bad = (msg) => { throw new Error(`builder: ${msg}`); };
if (!Object.hasOwn(byId, id)) bad(`"${id}" is not one of the ten questions (${ids.join(' | ')})`);
```

**One return shape for both outcomes; a refusal is an outcome, not a fault** (`figma.mjs:84-103`).
Only real faults reach `server.mjs`'s catch-all.

**Rules are named and countable, and the module says what it does NOT do** — `pattern-rules.mjs`'s
voice, and the #139 discipline of deleting a sentence rather than letting it overclaim.

**A hook may never alter the run it observes** (`trace-recorder.mjs:106-114`) — `onStep` is wrapped
in try/catch and its failure is a non-fatal stderr line.

**Escape at the boundary in portal UI** — `esc()` (`portal.js:3`) on every interpolated string; a
value on its way into a `style` attribute is proven first (`swatchStyle`, `portal.js:140`).

---

## IMPLEMENTATION PLAN

### Phase 1 — the library seam (no UI)

Make the runner callable and observable without changing what it says to the agent.

**Tasks:** export `runComposition` with a structured return · move the `process.exitCode` writes into
the CLI wrapper · export `loadComposeConfig` · add `onStep` to `recordRun`.

### Phase 2 — the committed rules

**Depends on:** Phase 1 only for the dynamic-import target's name.

`portal/lib/builder.mjs`: answer validation, the three rules, the scenario reader + privacy refusal,
the run wrapper.

### Phase 3 — the gate

**Depends on:** Phase 2. **Independent of:** Phase 4 — write it before the UI, so the UI is built on
checked rules.

`tooling/build-checks.mjs` group 8: call the rules, mutate their inputs, prove rule 3's claim, and
prove `builder.mjs` imports with no portal dependencies installed.

### Phase 4 — the drawer

**Depends on:** Phases 1-2.

Three routes + the portal UI: config → draft preview → streamed run → result with the next command.

### Phase 5 — the real run + docs

**Depends on:** all of the above.

One real, honesty-clean run through the drawer against northwind; commit its artifacts; confirm the
instance slot renders it; document `compose.json`; record the #86 absorption.

---

## STEP-BY-STEP TASKS

Execute in order. Each task is independently testable.

### UPDATE `portal/lib/trace-recorder.mjs`

- **IMPLEMENT**: add an optional `onStep` to `recordRun`'s destructured parameter object. Call it
  from inside `write()` — one place, so meta, every step and the result all flow through it:
  ```js
  const write = (obj) => {
    appendFileSync(outFile, JSON.stringify(obj) + '\n');
    if (onStep) { try { onStep(obj); } catch (e) {
      process.stderr.write(`trace-recorder: onStep error (non-fatal): ${e.message}\n`); } }
  };
  ```
- **PATTERN**: `trace-recorder.mjs:110-114` — the hook wrapper whose comment is "a recording bug must
  never alter the run it observes". Extend that comment to cover `onStep`.
- **GOTCHA**: the callback receives the **redacted** object, because redaction happens before
  `write` is called. That is correct and load-bearing — an SSE consumer must never see an unredacted
  string. Say so in the header comment.
- **VALIDATE**: `node -e "import('./portal/lib/trace-recorder.mjs').then(m=>console.log(typeof m.recordRun))"`
  (needs `portal/node_modules`; run from the repo root after `cd portal && npm install`).
- **SATISFIES**: AC6

### REFACTOR `portal/record-composition.mjs` → export `runComposition`

- **IMPLEMENT**: rename `main` → `export async function runComposition({ scenario, question, slot,
  slug, isDry, force, onStep })`. Thread `onStep` into both `recordRun` calls. Replace every
  `process.exitCode = 1` inside it with a structured **return**:
  ```js
  // ok: the composition validated AND the curated trace passed the keep-gate.
  // reason: null | 'invalid-composition' | 'piv-incomplete' | 'not-clean'
  return { ok, reason, slug, dry, question, slot, scenario,
           paths: { proposal, rawTrace, curatedTrace, index },   // repo-relative, null on --dry
           stats: { steps, phases, nullPhaseSteps, artifacts, denials, costUsd, nodes, entries } };
  ```
  Also `export { loadComposeConfig }`, and **assert the slug inside `runComposition` itself**
  (`/^[a-z0-9-]{1,48}$/`) — it interpolates into `traces/${slug}.raw.jsonl` and
  `proto/compositions/${scenario}/${slug}.json`, and as an exported library function it can no
  longer rely on a caller having checked. `portal/lib/figma.mjs` sets the precedent: `assertSlug`
  fires in `receiveExport` **and again** in `runFigmaPull`. `builder.mjs` checking first is for the
  better message, not instead of this. (Group 7's one-application-point invariant is the same
  principle.) Keep **every `process.stderr.write` line exactly where it
  is** — the CLI's output must not change, and in server context they land in the portal's console.
  `summarize()` stops setting `process.exitCode`; it returns `clean` and the caller decides.
  The CLI guard becomes:
  ```js
  runComposition({ … }).then((r) => { if (!r.ok) process.exit(1); })
    .catch((err) => { console.error(`composition ✗  ${err.message}`); process.exit(1); });
  ```
- **PATTERN**: `agent-layer/build-instance.mjs:314` + its CLI guard at 429 — an exported function
  plus a thin standalone wrapper, the repo's standard shape for a runnable module.
- **GOTCHA (load-bearing)**: **do not touch `buildTask`, `PIV_COMPOSE_SYSTEM`, `refsFor`,
  `makeFence`, `SECRET_PATHS`, `assertValid`, `curateTrace`/`validateTrace` ordering, or
  `dropShipped`.** The file's header claim ("the prompt is built ONLY from …") is load-bearing and
  stays true only because this refactor is a signalling change, not a prompt change. A diff that
  touches those functions is the wrong diff.
- **GOTCHA**: `summarize` currently prints via `console.log`; leave it. The SSE stream carries its
  own structured `done` event built from the return value, not from parsed stdout.
- **VALIDATE** — run all three **the moment this refactor is written**, not at PR time:
  1. exports exist:
     `node -e "import('./portal/record-composition.mjs').then(m=>console.log(typeof m.runComposition, typeof m.loadComposeConfig))"`
     → `function function`
  2. the CLI still refuses cleanly:
     `node portal/record-composition.mjs 2>&1 | head -2` → the usage error naming the scenario arg
  3. **the fence is untouched** — mechanical, not a human reading a diff:
     ```
     git diff origin/main -- portal/record-composition.mjs | grep -E '^[+-]' \
       | grep -E 'Compose a dashboard view|may read ONLY the vocabulary|IMPLEMENT by writing|VALIDATE by running exactly|You are the ux-factory UI-composition agent|SECRET_PATHS =|const flags = new Set' \
       && { echo 'FENCE TOUCHED — wrong diff'; exit 1; } || echo 'fence intact'
     ```
     The `const flags = new Set` line is in the grep on purpose: it is the CLI's argv parser, and a
     new `--root`/`--out` flag appearing there is this ticket drifting into its own Non-Goal.
- **SATISFIES**: AC6, AC7

### CREATE `portal/lib/builder.mjs`

- **IMPLEMENT**, in this order:

  1. **Header** citing the ticket + this plan, and stating the three rules and the two things this
     module does not do (it does not change the prompt; it does not write `compose.json`).

  2. **Imports** — `QUESTIONS`, `DEFAULT_ANSWERS`, `SUMMARY_TERM`, `QUADRANT_MEANINGS`,
     `quadrantFor`, `frequencyVerdictFor` from `../../system/build-questions.mjs`; `REPO_DIR` from
     `./env.mjs`; `node:fs` + `node:path`. **Nothing else at module scope.**

  3. **`validateAnswers(raw)`** — returns a frozen, normalised answer set. Refuses: a non-object; a
     missing question id; a value not among that question's `options[].value`; any key not in
     `QUESTIONS` (refuse, don't ignore — an unknown key means the caller and the config disagree).
     Build the lookup with `Object.create(null)` / `Object.hasOwn` so `__proto__` is inert.

  4. **The three rules.** Exported as data so the gate can iterate them:
     ```js
     // Rule 1 — the `shape` answer names the question. The SAME answer that names the pattern in
     // the browser (pattern-rules.mjs rule 1) names the question here.
     export const SHAPE_QUESTION = Object.freeze({
       overview: (s) => `What is the overall state of ${s} right now?`,
       worklist: (s) => `Which items in ${s} need attention first, and where does each one stand?`,
       stream:   (s) => `What has changed most recently in ${s}, and what does it mean?`,
       steps:    (s) => `Where does the work in ${s} stand, from first step to finished?`,
     });
     // Rule 2 — the `action` answer names who it is answered for, as one appended clause.
     export const ACTION_STANCE = Object.freeze({
       check:   'needs to see where things stand',
       capture: 'is about to add something of their own',
       find:    'is looking for one specific thing',
       respond: 'has to answer someone',
     });
     // Rule 3 — the OTHER EIGHT answers enter no prompt. They are the ethics record shown beside
     // the run (quadrant + frequency gate) and the operator's own reading of the product. Saying
     // which two answers are load-bearing is the point: a surface that implied all ten reached the
     // agent would be the kind of sentence #139 deleted.
     export const QUESTION_INPUTS = Object.freeze(['shape', 'action']);
     ```
     `draftQuestion(answers, subject)` → `` `${SHAPE_QUESTION[shape](subject)} Answer it for someone
     who ${ACTION_STANCE[action]}.` ``, throwing (naming the answer + its value) if either enum has
     no rule.

  5. **`assertScenarioSlug(scenario)`** and **`assertRunSlug(slug)`** — `/^[a-z0-9-]{1,40}$/` and
     `/^[a-z0-9-]{1,48}$/` respectively, each throwing and naming the offender. Both are needed
     because both reach a filesystem path: `loadComposeConfig` builds
     `path.join(REPO_DIR, 'scenarios', scenario)` and the runner builds
     `traces/${slug}.raw.jsonl`, neither with a character guard, and both values now arrive from an
     HTTP body. Frame them as `build-instance.mjs:184` frames `compositionRef` — **contract guards,
     not trust boundaries** (the portal binds 127.0.0.1 only). `assertRunSlug` is the same check
     `runComposition` re-applies internally; here it is for the earlier, better message.

  6. **`readScenario(slug)`** — reads `scenarios/<slug>/brief.md`'s json head with a **local
     five-line fence read**: `readFileSync` → `match(/```json\n([\s\S]*?)```/)` → `JSON.parse`,
     throwing a message naming the path if either step fails. **Do not use
     `agent-layer/lib.mjs`'s `parseCompanyBrief`** — it hard-requires `axes`, `intake`, `screens`
     and `copy` in the head (`lib.mjs:174-199`), and every committed scenario brief carries only
     `{slug, name, fictional, domain, oneLiner, today}`, so it throws on all of them. Then the
     `compose.json` via the now-exported `loadComposeConfig`. Returns
     `{ slug, name, subject, today, slots, questions, fixtures }`.

     **The privacy refusal is its own exported function** — `readScenario` calls it, and the gate
     calls it directly with an in-memory head, so no fake package is ever written to disk:
     ```js
     export function assertFictional(head, slug) {
       if (head && head.fictional === true) return head;
       throw new Error(`builder: "${slug}" is a real-provenance package (fictional: ` +
         `${JSON.stringify(head?.fictional)}) — real employer material is never composed inside ` +
         `this public repo, because every run path in portal/record-composition.mjs writes under ` +
         `the repo (proto/compositions/, traces/). See scenarios/README.md §Provenance; compile ` +
         `and compose it out of repo instead.`);
     }
     ```
     Note it demands `=== true`, so a head with the key **missing** refuses too — the same posture
     `agent-layer/lib.mjs:160` takes ("provenance is explicit").

  7. **`listScenarios()`** — every directory under `scenarios/` with a `compose.json`, each as
     `{ slug, name, composable: boolean, reason: string|null }`; a package that throws is listed
     **with its refusal message**, never silently dropped (the drawer shows why it can't be used).

  8. **`draftRun({ scenario, answers, slot })`** — the drawer's preview: validates the answers, reads
     the scenario, drafts the question, resolves the slot (default: the first declared slot), and
     returns `{ question, slot, bounds, slots, subject, defaultSlug, verdict, inputs }` where
     `verdict = { quadrant, meaning: QUADRANT_MEANINGS[quadrant], frequency: frequencyVerdictFor(…),
     summary: [{ term: SUMMARY_TERM[id], value: option.short }] }`.

  9. **`slugFor(scenario, answers, slot)`** → `` `${scenario}-${answers.shape}-${slot}` `` truncated
     to 48 chars. **Why scenario-prefixed:** the drafted question is deterministic from ten enum
     answers, so two scenarios sharing a `shape` would produce byte-identical questions →
     identical `slugify()` output → a collision in the **flat** `traces/` namespace. Prefixing plus
     the runner's existing no-`--force` default turns that into a loud throw.

  10. **`withRunLock(fn)`** — the whole concurrency answer, exported **so the gate can call it
     without an SDK**:
     ```js
     // `upsertIndex` (record-composition.mjs:307-318) is read-modify-write on the scenario
     // manifest, and dropShipped/rmSync delete from traces/ unsequenced. One terminal made that
     // safe by construction; a clickable button does not. Two near-simultaneous runs silently
     // lose a manifest entry, so the second caller is REFUSED rather than queued — a queued run
     // would spend real tokens the operator did not knowingly ask for twice.
     let inFlight = false;
     export async function withRunLock(fn) {
       if (inFlight) throw new Error('builder: a composition run is already in flight — wait for it to finish (both runs would read-modify-write the same manifest)');
       inFlight = true;
       try { return await fn(); } finally { inFlight = false; }
     }
     export const isRunInFlight = () => inFlight;
     ```
     Exporting it is the design decision: an inline boolean inside `runBuild` is unreachable from
     `build-checks.mjs` (which cannot import the SDK), so the guard would ship unproven.

  11. **`stepEvent(line)`** — the SSE projection, a **pure exported function**, so `server.mjs` has
     no shape opinion of its own and the gate can assert what never leaves the process:
     ```js
     // `recordRun`'s write() fires for THREE line types: the meta line first, then every step,
     // then the result. Only steps are progress. The meta line carries `cwd` (an absolute
     // home-dir path) and `sessionId`, and the drawer needs neither — so this returns null for
     // anything that is not a step and the caller skips the send.
     //
     // A step line can carry a 4000-char tool_response (RESPONSE_CAP) plus a full tool input. The
     // drawer shows PROGRESS; traces/<slug>.jsonl is the record. WHITELIST, never blacklist — a
     // field added to the recorder later must not start streaming by default.
     export const STEP_EVENT_TEXT_MAX = 400;
     export function stepEvent(line) {
       if (!line || line.type !== 'step') return null;
       return { type: 'step', phase: line.phase ?? null, kind: line.kind ?? null,
         tool: line.tool ?? null, ok: line.ok ?? null, denied: line.denied ?? false,
         artifact: line.artifact?.path ?? null,
         text: typeof line.text === 'string' ? line.text.slice(0, STEP_EVENT_TEXT_MAX) : null };
     }
     ```
     The run's outcome reaches the drawer through the `done` event built from `runComposition`'s
     structured return — never by the drawer reconstructing it from the result line.

  12. **`runBuild({ scenario, answers, question, slot, slug, dry, force, onStep })`** — re-runs
     **every** guard itself, because `/api/build/run` is a separate route from `/api/build/draft`
     and a POST can reach it having never touched the preview:
     ```js
     assertScenarioSlug(scenario);
     const config = readScenario(scenario);        // ← the fictional:false + no-compose.json refusals
     validateAnswers(answers);                     // the answers are the run's record
     if (!Object.hasOwn(config.slots, slot)) throw new Error(`builder: slot must be one of …`);
     assertRunSlug(slug);                          // /^[a-z0-9-]{1,48}$/ — exported, see below
     if (typeof question !== 'string' || !question.trim()) throw new Error('builder: a question is required');
     return withRunLock(async () => {
       const { runComposition } = await import('../record-composition.mjs'); // dynamic — see GOTCHA
       return runComposition({ scenario, question, slot, slug, isDry: dry, force, onStep });
     });
     ```
     The **question is passed through as given**, so an operator edit is honoured verbatim. Every
     guard above is an exported named function (`assertScenarioSlug`, `assertRunSlug`,
     `assertFictional`, `validateAnswers`) rather than an inline condition, for one reason: the
     gate must be able to call each one directly. A guard that can only be reached by starting a
     real agent run is a guard nobody tests.

- **PATTERN**: `system/pattern-rules.mjs` (rules-as-data + a header that says what is not invented);
  `portal/lib/figma.mjs` (portal-lib shape, refusal-as-outcome).
- **GOTCHA (structural, checked by the gate)**: the import of `record-composition.mjs` **must be
  dynamic, inside `runBuild`**. A static import pulls `trace-recorder.mjs` →
  `@anthropic-ai/claude-agent-sdk`, and `tooling/build-checks.mjs` runs in CI where
  `portal/node_modules` does not exist. Keeping it dynamic is what lets the rules be gated at all.
- **GOTCHA**: never re-declare a question, an option value, a summary term or a quadrant meaning —
  import all four. A second copy is the drift `build-questions.mjs:283-313` already warns about.
- **GOTCHA**: `frequencyVerdictFor`/`quadrantFor` read `RULESET` directly; call them, never
  reimplement, or the portal and the page could disagree about a verdict.
- **VALIDATE**:
  ```
  node -e "import('./portal/lib/builder.mjs').then(m=>{
    for (const shape of ['overview','worklist','stream','steps'])
      console.log(shape, '→', m.draftQuestion({shape, action:'check'}, 'the Northwind wholesale-stock dashboard'));
    console.log(JSON.stringify(m.listScenarios(), null, 2));})"
  ```
  Four distinct, grammatical questions and a scenario list naming `fieldwork` + `northwind`.
- **SATISFIES**: AC1, AC2, AC3, AC8

### UPDATE `tooling/build-checks.mjs` — group 8, "the operator path's committed rules"

- **IMPLEMENT**: a new group after group 7. Every assertion **calls** the function — no grep, no
  shape-only check (memory: *the check that cannot fail*):
  - **Coverage, driven by the shipped config**: for every `option.value` of the `shape` question in
    `QUESTIONS`, `SHAPE_QUESTION` has an entry; likewise `action` → `ACTION_STANCE`. Iterating the
    config means a new option added in `build-questions.mjs` fails here loudly, exactly as a new
    `PATTERNS` entry without a `BOARD_FOR` fixture does.
  - **Distinctness + non-emptiness**: the four drafted questions are four distinct non-empty strings
    that each contain the subject string and end with the stance clause.
  - **Rule 2 is load-bearing**: changing only `action` changes the drafted question (all four
    values → four distinct results for a fixed `shape`).
  - **Rule 3 is true**: changing each of the other **eight** answer ids, one at a time, leaves the
    drafted question byte-identical. This is the assertion that keeps the drawer's claim honest.
  - **`QUESTION_INPUTS` names real ids** and exactly the ids proven load-bearing above.
  - **`validateAnswers` refuses**: a missing id, an out-of-enum value, an unknown key, `__proto__`,
    and a non-object — each throwing with the offending name in the message.
  - **The privacy refusal fires on the RUN path, not only the preview**: `runBuild` must throw for a
    `fictional: false` package **before** the dynamic import — assert it by calling `runBuild` with a
    scenario stubbed to a `fictional: false` head and checking that it rejects with a message
    containing `scenarios/README.md`, and that no run was started. `/api/build/draft` and
    `/api/build/run` are separate routes; a check that only covers `draftRun` makes AC3 a claim
    about a function nobody has to call. Also assert the same for `assertFictional(head, slug)`
    directly (an exported helper, so the fixture stays in memory — never write a fake package to
    disk).
  - **`assertScenarioSlug` refuses** `../`, an absolute path, an empty string and a 41-character
    name — `loadComposeConfig` interpolates `scenario` into a filesystem path. Likewise
    `assertRunSlug` for `../`, `a/b`, `''` and 49 characters — `slug` interpolates into
    `traces/${slug}.raw.jsonl`.
  - **Slugs cannot collide across scenarios**: `slugFor` over the **cross product** of every
    `listScenarios()` slug × every `shape` option × a fixed slot yields all-distinct values, each
    starting with its scenario slug and each passing `assertRunSlug`. This is what actually closes
    the flat-`traces/` collision — the drafted question is deterministic from ten enum answers, so
    two scenarios sharing a `shape` produce byte-identical question text, and `slugify()` alone
    would map them to one file.
  - **`stepEvent` is a whitelist**: given a synthetic step carrying `response` (5 KB), `input`
    (a secret-shaped string), `toolUseId` and an unknown future field, the projection contains
    **none of them** — assert `Object.keys(stepEvent(fixture))` equals the exact expected key set,
    so a new recorder field cannot start streaming by default. And `text` longer than
    `STEP_EVENT_TEXT_MAX` comes back truncated to exactly that length.
  - **`stepEvent` drops the non-step lines**: a `{type:'meta', cwd:'/Users/…', sessionId:'…'}`
    fixture and a `{type:'result', …}` fixture both return **`null`** — the meta line is the one
    that carries an absolute home-dir path, and it is the first thing `write()` emits.
  - **`withRunLock` refuses the second caller**: start one that resolves on a deferred promise,
    assert a concurrent call rejects with a message containing "already in flight", release the
    first, assert `isRunInFlight()` is false and a third call now succeeds — including the
    `finally` path, by making the first call **throw** and asserting the lock still released. This
    runs with no SDK, which is exactly why `withRunLock` is exported rather than inline.
  - **Dep-freedom**: the group's own `import` of `portal/lib/builder.mjs` is the proof — in CI there
    is no `portal/node_modules`, so a static SDK import anywhere in its module graph fails the job.
    State that in the group's comment so nobody "fixes" it by installing portal deps in CI.
    **This invariant is CI-only**: locally `portal/node_modules` exists, so a static SDK import
    passes green on your machine. Verify it the one way that works locally —
    `mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv back`.
- **PATTERN**: group 1 (`build-checks.mjs:109-162`) for the iterate-the-config discipline; `ok()` /
  `group()` for reporting.
- **GOTCHA**: update the file header's group list **and** the final `all 7 groups pass` line at the
  very bottom to 8. A stale count is a small lie in a file whose whole job is not telling them.
- **GOTCHA**: the header says the file "imports the SHIPPED modules directly". Amend it to name the
  one portal import and why it is here (same questionnaire, and CI is the only place the dep-freedom
  claim can be proven).
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 8 groups pass`. Then **mutate to
  prove the gate bites**: temporarily add a fifth `shape` option to `system/build-questions.mjs` and
  re-run → group 8 must fail; revert.
- **SATISFIES**: AC8

### ADD three routes to `portal/server.mjs`

- **IMPLEMENT**, placed with the other `/api` branches, above the `/sites/` matcher:
  - `GET /api/build/config` → `{ questions: QUESTIONS, defaults: DEFAULT_ANSWERS, summaryTerms:
    SUMMARY_TERM, quadrantMeanings: QUADRANT_MEANINGS, questionInputs: QUESTION_INPUTS, scenarios:
    listScenarios() }`. One route means the drawer **cannot** fork the config.
  - `POST /api/build/draft` → `readBody` → `draftRun(body)` → 200 JSON. Pure and instant.
  - `POST /api/build/run` → `readBody`, then SSE exactly as `/api/chat` does:
    ```js
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache',
                         connection: 'keep-alive' });
    const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
    try {
      const r = await runBuild({ ...body, onStep: (line) => {
        const ev = stepEvent(line);       // null for the meta + result lines — see builder.mjs
        if (ev) send(ev);
      } });
      send({ type: 'done', result: r });
    } catch (e) { send({ type: 'error', message: e.message }); }
    res.end();
    ```
- **PATTERN**: `server.mjs:55-77` (the intake + chat branches).
- **GOTCHA**: `/api/build/run` must **not** go through the shared `json()` helper — it has already
  written SSE headers. Its errors are `{type:'error'}` events, not the catch-all's `{error}` body.
- **GOTCHA**: the `onStep` payload is a whole trace line and can be a few KB (`RESPONSE_CAP` is
  4000). `server.mjs` must call `builder.mjs`'s exported `stepEvent` and have **no shape opinion of
  its own** — a projection written inline here is one the gate cannot reach, and it would drift from
  the one the gate does check.
- **VALIDATE**: `cd portal && npm start`, then
  `curl -s localhost:4747/api/build/config | head -c 400` and
  `curl -s -X POST localhost:4747/api/build/draft -H 'content-type: application/json' -d '{"scenario":"northwind","answers":{…defaults…}}'`
  → the drafted question. Also `curl -s localhost:4747/api/health` still answers.
- **SATISFIES**: AC4

### ADD the builder drawer to `portal/public/index.html` + `portal.js` + `portal.css`

- **IMPLEMENT**:
  - `index.html`: a `#btn-builder` toolbar button beside `#btn-figma`, and a
    `<div class="portal-drawer" id="builder-drawer" hidden>` mirroring `#figma-drawer`'s structure:
    a scenario `<select>`, a `<div id="builder-questions">` the JS fills, a slot `<select>`, a
    **`<textarea id="builder-question">` holding the drafted question (editable — the breadboard's
    contract)**, a run-slug input (`pattern="[a-z0-9\-]{1,48}"`), a `--dry` checkbox **checked by
    default**, Run / Cancel, `#builder-status` (`aria-live="polite"`) and `#builder-report`.
  - `portal.js`: fetch `/api/build/config` on drawer open; render the ten questions as native
    radiogroups with each question's `reasoning` line beneath its prompt (accept-and-advance — every
    default is pre-selected, so the operator can go straight to Run); on any change, POST
    `/api/build/draft` and repaint the question textarea, the slot's bounds **verbatim**, the ethics
    verdict and the ten-answer summary. Mark the two `questionInputs` questions visibly as the ones
    that reach the agent, and state in one sentence that the other eight are the ethics record —
    both driven by the served `questionInputs`, never a hardcoded list.
    Run streams the response with `res.body.getReader()` (the chat reader loop, `portal.js:386-403`),
    appending a line per `phase` change and per tool step, then renders the result: ok/refused, the
    reason, the artifact paths, cost, and — on a non-dry `ok` — the **exact next command**:
    ```
    node ../ux-factory/agent-layer/build-instance.mjs <brief.md> --out <dir> \
      --pack <tokens.<slug>.css> --trace <derivation.jsonl> \
      --compositions proto/compositions/<scenario>
    ```
    plus the "commit the artifacts" reminder (the `renderReport` "To keep it" block is the model).
  - `portal.css`: reuse `portal-drawer` / `portal-form` / `portal-chip` / `portal-table-scroll`.
    Add only what is genuinely new — a phase-log list and the question textarea.
- **PATTERN**: `portal.js:135-249` (the figma drawer: open/focus/cancel, a non-`api()` fetch for the
  odd route, `renderReport`) and `portal.js:374-403` (the SSE reader loop).
- **GOTCHA**: focus the **first** control on open (`$('#builder-scenario').focus()`), matching
  `portal.js:144`'s reasoning.
- **GOTCHA**: `esc()` every interpolated value — the scenario `subject`, the slot bounds, the
  drafted question and every streamed step come from disk or a model and land in `innerHTML`.
- **GOTCHA**: a real run takes 2-5 minutes. Disable Run while streaming, and say what is happening
  ("recording the run — this takes a few minutes and spends real tokens"). Do not add a client
  timeout; the stream ends on `done` or `error`.
- **GOTCHA**: `--dry` defaults **checked**. The first click of a new drawer must not spend a real run
  or overwrite anything; `--dry` writes to a scratch dir and never touches `traces/`.
- **VALIDATE**: `cd portal && npm start` → open the drawer, accept all defaults, confirm the preview
  shows a grammatical question + northwind's `insight-panel` bounds verbatim + the `facilitator`
  quadrant; change `shape` and watch the question change; change `nogos` and watch it **not** change.
  Then run with `--dry` checked → the phase log shows plan → gate → implement → validate and the
  result reports `DRY (not shipped)`.
- **SATISFIES**: AC4, AC5

### RUN the real composition through the drawer (northwind)

- **IMPLEMENT**: run against `northwind` with `shape: stream`, `action: check`, slot
  `insight-panel`, slug `northwind-stream-insight-panel`. Chosen because northwind's fixtures carry
  `updatedOn` (per its `compose.json` fixture hint) so "what has changed most recently" is
  answerable, and because it does not duplicate any of the three committed northwind questions.

  **Dry first, and treat it as the answerability gate — not as a warm-up.** `--dry` is already a
  full Agent SDK run against the **real** repo data (`record-composition.mjs:337-353`: absolute
  `refsFor`, the same fence, the same model); it just writes to a scratch dir and never touches
  `traces/`. So a dry run that reports `in-process validateComposition ✓` has *proven* the drafted
  question is answerable from these fixtures within this slot's bounds — which is precisely the
  thing the committed rules cannot know. **Only promote to a real run after that line appears.** A
  dry run that comes back invalid or PIV-dirty costs the same as a real one and tells you the same
  thing, before anything is committed or overwritten.
- **GOTCHA (honesty, hard)**: if the run is invalid or not PIV-clean, the runner drops the shippable
  artifacts and exits non-ok — **that is correct**. **Never** hand-edit a composition or a JSONL.
  Budget ~$0.50-1 per run, two attempts.
- **GOTCHA (the retry rule, decided here so it is not decided at $1 a go)**: for this ticket a weak
  run is fixed by **the drafted question wording only**. `PIV_COMPOSE_SYSTEM` is explicitly out of
  bounds — AC7 requires it byte-identical, and changing it would alter the construction behind the
  three committed northwind traces, making them and the new one products of different prompts.
  If two question rewordings fail, **stop and flag it**; that is a signal about the scenario or the
  slot, not a prompt to tune.
- **GOTCHA**: auth is the Mac CLI login (memory: no `portal/.env` token here). The drawer's status
  line should surface `HAS_TOKEN` the way `/api/health` already does.
- **VALIDATE**:
  - `node tooling/validate-trace.mjs` → green (also run in-process by the keep-gate).
  - `git status --short` → exactly four paths: the proposal, the two trace files, the manifest.
  - `node -e "import('./system/agentic-renderer.mjs').then(m=>{const fs=require('node:fs');m.validateComposition(JSON.parse(fs.readFileSync('handoff/verdant/vocabulary.json','utf8')),JSON.parse(fs.readFileSync('proto/compositions/northwind/northwind-stream-insight-panel.json','utf8')));console.log('valid')})"`
  - `node scenarios/validate.mjs` → still green.
- **SATISFIES**: AC5, AC9

### VERIFY the instance slot renders the new view (no code change expected)

- **IMPLEMENT**: nothing. `instance.html:720` points `INSTANCE_CONFIG.composition.index` at
  `/proto/compositions/northwind/index.json` and `system/instance.mjs:376-383` maps the **whole**
  manifest into `renderStudy`, so a fourth entry appears on its own.
- **VALIDATE**: `npx serve .` → `/instance.html` → the prototype slot lists four composed views
  including the new one, `#instance-prototype[data-prototype="ready"]`, zero console errors from the
  slot. (Worker-refused fetches elsewhere on the page are expected — memory: *headless render: data
  pages Worker-refused*.)
- **SATISFIES**: AC5

### UPDATE `scenarios/README.md` — document `compose.json`

- **IMPLEMENT**: a `### compose.json (optional — the composition config)` subsection under
  §"File shapes", stating: the seven fields and their meaning; that it is **ignored by
  `validate.mjs` by design** and parsed only by `record-composition.mjs`'s `loadComposeConfig`; that
  `computeRules` must state the fixed `today` and carries **definitions only** — never which
  tiles or metrics answer a question; and that a package without one simply cannot be composed
  (the runner refuses, naming the file). Lift the resolved shape verbatim from
  `docs/epics/generative-prototyper.architecture.md:124` so the two cannot drift.
- **GOTCHA**: the ticket says a compose.json format change needs "BOTH parsers updated". That premise
  does not hold here: per #88's resolution the scenario validator deliberately ignores
  `compose.json`, so there is exactly **one** parser. Do not invent a second one to satisfy the
  sentence — record the finding in the PR body instead.
- **VALIDATE**: `node scenarios/validate.mjs` → green (documentation only); the new section names all
  seven fields `loadComposeConfig` validates (`grep -c` the field names against
  `record-composition.mjs:79-103`).
- **SATISFIES**: AC10

### UPDATE the epic + architecture docs (the #86 absorption record)

- **IMPLEMENT**:
  - `docs/epics/generative-prototyper.architecture.md`: a short **Status** amendment recording that
    epic #86's floor path landed as epic #134 slice 3 (#140); tick Missing pieces #1 (#88) and #3
    (#89) as done and add the operator UI as delivered here; state that the out-of-repo real-company
    run and the ceiling (#90) remain open, with the reason (`REPO_DIR` anchoring + the privacy
    boundary). Do not restate decisions — link them.
  - `CLAUDE.md`: add `portal/lib/builder.mjs` to the architecture map's `portal/lib/` line; extend
    the "New composition proposal" bullet in §"Where new code goes" with the portal route as the
    UI-first path (owner preference) and the CLI as the equivalent; note group 8 in the
    `tooling/build-checks.mjs` line.
  - A comment on issue #140 and on epic #86 recording the absorption, per the ticket's own scope
    bullet.
- **VALIDATE**: `node tooling/drift-check.mjs` and `node tooling/token-lint.mjs` → green (docs
  should not move either, but this catches an accidental generated-file edit).
- **SATISFIES**: AC10

---

## TESTING STRATEGY

This repo has no test suite, linter or type-checker by rule. "Done" = run the surface you touched.

### Unit-level (the committed gate)

`tooling/build-checks.mjs` group 8 — the assertions listed in its task. All of them **call** the
functions and several **mutate** an input to prove the assertion bites. The rule-3 check (eight
answers changed one at a time, question byte-identical) is the one that keeps the UI's claim honest.

### Integration-level

1. `--dry` run through the drawer: proves auth, the SSE stream, all four PIV markers, the
   Write→artifact pairing, the fence denials, and in-process `validateComposition` — for a fraction
   of a real run's cost.
2. One real run: proves the keep-gate (curate → `validateTrace`), the manifest upsert and the
   committed-artifact shape.
3. `/instance.html` render: proves the downstream needs no change.

### Edge cases

Every refusal below is **already asserted by group 8 at the function level** — that is the point of
exporting each guard as a named function. What is listed here is only the part a unit check cannot
see: whether the *surface* behaves correctly when the refusal fires. Run these once, by hand, after
the drawer is built.

- **Privacy refusal** — select a package whose head says `fictional: false`; the drawer must show
  the refusal naming `scenarios/README.md §Provenance` and offer **no Run affordance** (not a
  Run button that fails on click — a capability the operator cannot exercise must not be offered,
  the same rule `instance.mjs:360` follows).
- **No `compose.json`** — pick `verdant` (which has none); the drawer must show
  `loadComposeConfig`'s refusal verbatim rather than a generic error, because that message is the
  only spec the operator gets at that moment.
- **Slug already used** — re-run an existing slug without force; the drawer must surface the
  runner's "… exists — pass --force …" throw, and `git status` must be clean afterwards.
- **Two runs at once** — click Run twice, and POST `/api/build/run` from a second tab; the second
  must be refused by `withRunLock`. The button should also disable itself, but the lock is what
  makes that cosmetic rather than load-bearing.
- **A run POST that skipped the preview** — `curl -X POST /api/build/run` with a scenario the drawer
  would have refused; identical refusal, since `runBuild` re-runs every guard.
- **A bad answer set** — POST `/api/build/draft` with `{"shape":"nonsense"}`; a 500 whose body names
  `shape` and its allowed values, not a stack trace.
- **Client disconnect mid-run** — close the drawer during a run; the server must not crash. The SSE
  writes go nowhere once the socket is gone; add `res.on('close', …)` per `chat.mjs:58`. Note that
  `withRunLock` still releases via its `finally`, so a disconnect cannot wedge the lock — check
  that a run started after a disconnect is accepted.
- **A weak run** — if the model crams two PIV markers into one block, `validateTrace` drops the
  shippable artifacts and the drawer must report **refused**, with the raw trace kept for
  inspection. Exercise this on the `--dry` path, where it costs the same and commits nothing.

---

## VALIDATION COMMANDS

Run every one before opening the PR.

### Level 1 — imports, dep-freedom, and the fence

```
node -e "import('./portal/lib/builder.mjs').then(m=>console.log('rules ok', Object.keys(m.SHAPE_QUESTION).join(','), m.QUESTION_INPUTS.join(',')))"
node -e "import('./system/build-questions.mjs').then(m=>console.log(m.QUESTIONS.length))"

# the fence is untouched (also run at refactor time, not only here)
git diff origin/main -- portal/record-composition.mjs | grep -E '^[+-]' \
  | grep -E 'Compose a dashboard view|may read ONLY the vocabulary|IMPLEMENT by writing|VALIDATE by running exactly|You are the ux-factory UI-composition agent|SECRET_PATHS =|const flags = new Set' \
  && { echo 'FENCE TOUCHED — wrong diff'; exit 1; } || echo 'fence intact'

# dep-freedom: CI proves this by NOT having portal deps, so locally you must take them away
mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; \
  mv portal/node_modules.off portal/node_modules
```

### Level 2 — the committed gate

```
node tooling/build-checks.mjs          # → build ✓  all 8 groups pass
node tooling/validate-trace.mjs        # → every committed trace, including the new pair
node scenarios/validate.mjs
node tooling/drift-check.mjs
node tooling/token-lint.mjs
```

Then prove group 8 **bites**, since a gate that cannot fail is the one failure mode this repo has
met repeatedly. Each mutation must turn the group red; revert each before the next:

| Mutate | Group 8 must fail on |
|---|---|
| add a fifth `shape` option in `system/build-questions.mjs` | rule-1 coverage |
| make `slugFor` drop the scenario prefix | the cross-product distinctness check |
| add `response` to `stepEvent`'s returned object | the exact-key-set assertion |
| make `stepEvent` return the meta line instead of `null` | the non-step-lines-dropped assertion |
| make `withRunLock` release in `try` instead of `finally` | the throw-path lock release |
| have `draftQuestion` read `answers.nogos` | the rule-3 byte-identity check |

### Level 3 — the portal surface

```
cd portal && npm start
curl -s localhost:4747/api/health
curl -s localhost:4747/api/build/config | head -c 400
curl -s -X POST localhost:4747/api/build/draft -H 'content-type: application/json' \
  -d '{"scenario":"northwind","answers":{"trigger":"unsure","action":"check","rewardType":"self","investment":"data","frequency":"daily","improvesLives":"yes","wouldUseIt":"yes","appetite":"small","shape":"stream","nogos":"none"}}'
```

**The wiring assertion.** Group 8 proves each guard works when *called*; nothing there proves
`server.mjs` actually calls them — and `/api/build/run` is exactly where a hand-rolled
`send({type:'step', step})` or a skipped `readScenario` would slip back in. This is the one place
the route-to-guard wiring is observable, and it costs no tokens because the refusal fires before the
dynamic import:

```
# a scenario the guards must refuse → an SSE `error` event naming the boundary, and NO run started
curl -sN -X POST localhost:4747/api/build/run -H 'content-type: application/json' \
  -d '{"scenario":"<a package whose head says fictional:false>","answers":{…},"question":"x","slot":"summary-strip","slug":"wiring-probe","dry":true}' \
  | grep -q 'scenarios/README.md' && echo 'run-path guard wired' || echo 'GUARD NOT WIRED'
```

If no `fictional: false` package is on hand, the same assertion works with
`{"scenario":"verdant"}` (no `compose.json`) against `grep -q 'compose.json'` — either way it is
the run route, not the draft route, that must refuse. Confirm `git status --short` is clean after.

### Level 4 — the real run and its downstream

Through the drawer (`--dry` first, then real), then:

```
git status --short                     # exactly the four generated paths
npx serve .                            # → /instance.html shows four composed views
```

### Level 5 — CI parity

`node tooling/build-checks.mjs` is the job CI runs for this ticket. The visual job is unaffected: no
shipped page, `system/` module or `agent-layer/` generator changes, so no baseline and no
`loc-summary.json` movement. **Confirm that** with `node agent-layer/gen-loc-summary.mjs --check`
before pushing.

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** — `portal/lib/builder.mjs` imports the question config from
      `system/build-questions.mjs`; no question, option value, summary term or quadrant meaning is
      re-declared anywhere in the portal.
- [ ] **AC2** — three named, committed rules draft a question from the answers: `shape` names it,
      `action` names who it is for, and the other eight enter no prompt — the third stated in the
      module, asserted in the gate, and said plainly in the drawer.
- [ ] **AC3** — `builder.mjs` refuses a `fictional: false` package with a message naming the privacy
      boundary, and refuses a package with no `compose.json` by surfacing the runner's own message —
      **on the run path as well as the preview path**, since they are separate routes. `scenario`
      and `slug` are character-guarded, and `slug` is re-asserted inside `runComposition`.
- [ ] **AC4** — the portal drawer renders the ten questions with their defaults and reasoning, shows
      the drafted question (**editable**) beside the chosen slot's bounds verbatim and the ethics
      verdict, and streams the run's PIV phases live.
- [ ] **AC5** — one REAL run, driven from the drawer, ships a valid composition + a validating PIV
      trace pair + a manifest upsert, and `/instance.html` renders it in the prototype slot with no
      code change to `instance.mjs` or `instance.html`.
- [ ] **AC6** — `runComposition` returns a structured `{ok, reason, paths, stats}`; no library path
      sets `process.exitCode`; the CLI's behaviour and printed output are unchanged.
- [ ] **AC7** — `buildTask`, `PIV_COMPOSE_SYSTEM`, `refsFor`, `makeFence`, `SECRET_PATHS` and the
      CLI's argv parser are byte-identical to `origin/main`, proven by the fence grep in the
      refactor task's VALIDATE (run at the time of the change, and again before the PR).
- [ ] **AC8** — `node tooling/build-checks.mjs` prints `all 8 groups pass`, **and** each of the five
      mutations in the Level-2 table turns group 8 red (proven one at a time, each reverted). A
      green gate is not evidence until it has been made to fail.
- [ ] **AC9** — no trace or composition content is hand-written or hand-edited; every committed
      artifact came out of the recorder.
- [ ] **AC10** — `scenarios/README.md` documents `compose.json`;
      `docs/epics/generative-prototyper.architecture.md` records the #86 absorption; `CLAUDE.md`'s
      map names `portal/lib/builder.mjs`.
- [ ] **AC11** — no shipped page, `system/` module or `agent-layer/` generator changed;
      `gen-loc-summary.mjs --check` clean; no visual baseline touched.
- [ ] **AC12** — every guard is an exported named function reachable by the gate without the Agent
      SDK: `assertScenarioSlug`, `assertRunSlug`, `assertFictional`, `validateAnswers`,
      `withRunLock`, `stepEvent`. None is an inline condition inside `runBuild`, and `server.mjs`
      re-implements none of them. Group 8 calls each one directly, **and** the Level-3 wiring
      assertion proves `/api/build/run` actually reaches them (a unit check on a function the route
      never calls is the failure mode this exists to close).

---

## COMPLETION CHECKLIST

- [ ] Branch cut from `origin/main` (**not** the current `feature/build-full-pattern-library`, which
      is behind and carries five uncommitted shipped-page copy edits that are not this ticket's)
- [ ] All tasks executed in order, each validated immediately
- [ ] All Level 1-5 validation commands run and green
- [ ] The five group-8 mutations each turned the gate red, and each was reverted
- [ ] `--dry` returned `in-process validateComposition ✓` **before** any real run was started
- [ ] The real run's four artifacts committed, unedited
- [ ] Plan, report and review committed **in this PR** (`.claude/plans/`, `.claude/reports/`,
      `.claude/code-reviews/pr-<N>-review.md`) — the repo rule
- [ ] PR **body** carries `Closes #140` (a title mentioning `(#140)` closes nothing — memory)
- [ ] Epic #86 and issue #140 commented with the absorption record

---

## OPEN QUESTIONS / ASSUMPTIONS

- **A1 (owner-decided, 2026-07-27)** — slice 3 is scoped to the **in-repo fictional** path. The
  out-of-repo real-company run is a follow-up; this ticket ships the refusal.
- **A2** — the drafted question is **editable** before the run, mirroring the breadboard's
  "drafted then editable" contract. The rules cannot know whether a drafted question is answerable
  from a given scenario's fixtures; the operator reading it before spending a real run is the check.
- **A3** — the slot is **operator-chosen** from `compose.json`'s declared slots (defaulting to the
  first), not derived from an answer. Slot names are free per-scenario strings
  (`summary-strip`/`insight-panel` today), so a `shape → slot-name` map would be a hidden coupling
  that breaks on the first scenario that names its slots differently.
- **A4** — the ethics verdict is **shown, never blocking**. A `dealer` quadrant or a failed frequency
  filter is the operator's own reading of the employer's product; refusing to run on it would be
  theatre, and the portfolio's position is that the gate informs rather than gates.
- **A5** — `compose.json` has **one** parser (`loadComposeConfig`), not two: `scenarios/validate.mjs`
  ignores it by design per #88. The ticket's "BOTH parsers updated" clause does not apply.
- **Q1** — should `/api/build/run` also accept the operator's own free-typed question with no
  answers at all (a pure CLI-replacement mode)? Assumed **no** — that is what the CLI is for, and
  a second entry point would let the drawer bypass the rules it exists to demonstrate.
- **Q2** — the drawer currently offers one question per run. If a real instance wants three composed
  views (northwind has three), that is three runs. Assumed acceptable for this ticket; a batch mode
  is a follow-up if the operator finds it tedious.

## NOTES (open canvas)

**Why the answers must not enter the prompt as prose.** The tempting design is to append the ten
answers to the task as a behaviour-model block. It is wrong for a specific reason:
`record-composition.mjs`'s header carries a load-bearing claim — *"The prompt is built ONLY from the
vocabulary + the SCENARIO'S declared fixtures + the question + the slot bounds + the scenario's
DEFINITIONS-ONLY computeRules … This construction is the inspectable proof."* Adding a block would
make that sentence false and require re-arguing the honesty firewall from scratch. Routing the
answers through the **question text** instead leaves the claim byte-true and gives a sharper story:
the same ten answers, two different committed rule sets, one in the browser and one at build time.

**Why `portal/lib/`, not `system/`.** Three reasons, all checkable: it is build-time-only, so a
shipped page must never be able to import it; the ticket names the path; and a new `system/*.mjs`
would move `loc-summary.json`'s runtime group, which `approach.html` renders — cascading into two
visual baselines for zero reader benefit (memory: *loc-summary baseline cascade*).

**Why group 8 lives in `build-checks.mjs` rather than a new `builder-checks.mjs`.** A separate file
needs a CI workflow edit and, more importantly, would be a gate nobody runs. `build-checks` is
already the epic's committed gate and already imports `build-questions.mjs`. The cost is one honest
header amendment — the file's "imports the SHIPPED modules directly" line gains a named exception —
and the benefit is that the dep-freedom invariant is proven by CI's *absence* of portal
`node_modules`, which no local run can prove.

**Alternatives weighed and rejected.**

| Option | Why not |
|---|---|
| Shell out to `node portal/record-composition.mjs …` from the server | Loses the structured result, forces stdout parsing, and makes the failure paths (`exitCode`) even harder to read correctly. |
| Let the answers pick from `compose.json`'s authored `questions` | Reduces the ten answers to a dropdown; the questionnaire becomes decorative. |
| Derive the slot from `shape` | Couples the rules to per-scenario slot names (see A3). |
| Auto-generate `compose.json` from the brief | The `computeRules` firewall. See Non-Goals. |
| A batch mode running all four shapes | Four real runs per click, ~$4, before the single-run path has been used once. |

**Risks, and what removes them.** Each of these started as a warning in a risk register. A warning
is a thing the implementer has to remember at the wrong moment, so each one is now either designed
out or asserted by a command that runs during implementation. The right-hand column is the thing to
run; if it passes, the risk is not a risk.

| Was a risk | What removes it | Proven by |
|---|---|---|
| Refactoring a file whose fence is the honesty contract | The refactor is signalling-only by construction — `runComposition` changes *how failure is reported*, never what the agent is told. The five fence functions are named in the task as untouchable. | The `git diff … \| grep -E 'Compose a dashboard view\|…'` command, run **at the moment of the refactor** (task VALIDATE step 3), not at PR time |
| A weak real run burning $1 and leaving a dropped artifact | `--dry` is already a full agent run over real data — it *is* the answerability check the committed rules can't perform. The real run is only reached after a dry run prints `in-process validateComposition ✓`. | The dry-first sequence in the real-run task; the runner's own keep-gate drops anything that fails either way |
| Slug collision in the flat `traces/` namespace | `slugFor` is scenario-prefixed, so identical question text across scenarios can no longer map to one file. | Group 8's cross-product check: every scenario × every `shape` → all-distinct, all scenario-prefixed, all passing `assertRunSlug` |
| SSE leaking a 4 KB trace line (or a future recorder field) per step | `stepEvent` is an exported **whitelist** projection; `server.mjs` holds no shape opinion of its own. | Group 8 asserts the exact key set against a fixture carrying `response`/`input`/`toolUseId`/an unknown field, plus the `text` truncation |
| Drifting into the out-of-repo path this ticket declared a Non-Goal | The refusal *is* the feature, and the CLI's argv parser is inside the fence grep — a new `--root`/`--out` flag fails the same command that guards the prompt. | `const flags = new Set` in the refactor task's grep |
| A guard that only guards the preview route | Every refusal lives in `runBuild`, and each is an **exported named function** (`assertScenarioSlug`, `assertRunSlug`, `assertFictional`, `validateAnswers`) so the gate can call it directly. | Group 8 asserts the `fictional: false` refusal **on the run path**, before the dynamic import |
| Concurrency the CLI never had (`upsertIndex` is read-modify-write) | `withRunLock` refuses the second caller rather than queueing it — a queued run would spend real tokens nobody asked for twice. Exported, not inline, precisely so it can be tested without the SDK. | Group 8's deferred-promise check, including the throw path releasing the lock |
| A rule claiming more than it does ("all ten answers brief the agent") | Rule 3 is stated in the module, and the drawer's copy is driven by the served `QUESTION_INPUTS`, never a hardcoded list. | Group 8 mutates each of the other eight answers and asserts the drafted question is byte-identical |
| The dep-freedom invariant passing locally and failing in CI | It is CI's *absence* of `portal/node_modules` that proves it, so it cannot be checked by adding something. | `mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs` before pushing |

**What is left, honestly.** One thing does not reduce to a check: whether the composed view *reads
as that company's product*. #88 measured exactly this and called it — content fidelity high, form
fidelity generic — and recorded the fix (the `ds-` list-row primitive, since shipped as `#139`'s
`list-row`). That is a judgment made by looking at the rendered slot, and this plan asks for it in
the instance-render step rather than pretending a command settles it.

**Sequencing note.** Phase 3 (the gate) is deliberately written **before** the drawer. The drawer's
central honest claim — that eight of the ten answers reach no prompt — is a claim only the gate can
keep true, and building the UI first invites a surface that says more than the rules do.

## AMENDMENTS

<!-- newest at the bottom; leave empty at creation -->
