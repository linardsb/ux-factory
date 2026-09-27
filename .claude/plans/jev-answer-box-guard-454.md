# Feature: Jev guard on the discovery answer box (#454)

The following plan should be complete, but validate documentation, codebase patterns and task sanity before you
start implementing. Pay special attention to the names of existing utils, types and models, and import from the
right files.

## Feature Description

When a person types a look-up request ("Look up Confirmation of Payee…") into the discovery drawer's **answer
box** (`#discovery-answer`) instead of the off-script box (`#discovery-offscript`), the text is currently stored as
their answer. The turn closes, no search runs, and nothing reports it. This ticket adds a pre-submit check. Jev
(TypeSafe's System One classifier) reads the answer in one HTTP request with two yes/no questions. If the text
reads like a look-up, the drawer asks the person whether to send it as a look-up or as their answer, and the
person's click decides. Jev writes nothing to the run package. It is a prompt to the person, never a gate, and
any failure submits exactly as today.

## User Story

As the operator running a discovery session in the portal drawer
I want the drawer to notice when I've typed a look-up request into the answer box
So that my look-ups actually run (and cite sources) instead of silently becoming answer prose.

## Problem Statement

Run 1 (`discovery/faster-payment`, 2026-09-13) planned five look-ups and fired none. Four answer lines (a3, a5,
a10, a23) hold the text `Look it up: … Answer: …`. A banked turn advertises no tools (`MAIN_TOOLS = []`,
`portal/lib/discovery-transport.mjs:80`), so `WebSearch` never ran. No CI group can reach this, because the
failure depends on which textarea a person typed into.

## Solution Statement

- `portal/lib/jev.mjs`: a zero-dependency `fetch` client for `POST https://api.typesafe.ai/v1/systemone`, with the
  model pinned to `jev-1.13.0`. #453 reuses it.
- `portal/lib/discovery-guard.mjs`: the two Noul questions (`look_up`, `aside`), the pure `decide(answers, T)`,
  and `checkAnswer(...)`, which runs the refusals and then one Jev call, and fails open on any Jev failure.
- One route, `POST /api/discovery/check-answer`, in `portal/server.mjs`.
- The drawer's submit handler calls the route before `postDiscoveryTurn`. On `look-up` or `aside` it shows an
  inline choice. "Send as a look-up" puts the text in the off-script box and fires the existing
  `offScriptControl('look-up', …)`. The answer box **keeps** its text so the person can trim it to their own answer
  (owner decision, 2026-09-27). "Send as my answer" submits unchanged and skips the guard.
- `tooling/jev-guard-eval.mjs` (operator-run, needs the key): runs every labelled item through the real API,
  commits the raw responses to `tooling/jev-guard/eval-run.json`, prints a threshold sweep and applies the
  pre-registered threshold rule (§NOTES D3).
- build-checks **group 44 "jev guard"**: recomputes the stated numbers from the committed real responses, drives
  `decide`'s branches from them, and drives fail-open and the refusals with injected failures only.

## Out of Scope / Non-Goals

- Not included: any write to `answers.jsonl` or `transcript.jsonl`, or any run-package format change. The person's
  click is the record.
- Not included: reclassifying after submit, or letting Jev choose `intent`. `intent` stays the person's
  declaration; `assertAffordance` and `appendAnswer` in `portal/lib/discovery.mjs` are untouched.
- Not changing: Think, Create PRD and Grill prompts (`discovery-postures.mjs`), so no prompt fingerprint moves.
- Not included: splitting a mixed "look-up + answer" text. The whole text goes as the look-up, and the person trims
  the answer box themselves (owner decision).
- Not included: the guard on existing-PRD audits. There is no answer box there, and the route refuses them by name.
- Not included: #453 (the contradiction screen) or #455 (import suggestions).
- Not changing: `.env` handling in `env.mjs`. It already loads any `KEY=value`, including `TYPESAFE_API_KEY`.

## Feature Metadata

**Feature Type**: New Capability (small)
**Estimated Complexity**: Medium. The code is small; the eval and the honesty rules around the committed fixture
take the care.
**Primary Systems Affected**: portal (server route, two lib modules, drawer JS/HTML/CSS), tooling (eval script,
build-checks group 44), docs (gates.md, CLAUDE.md map)
**Dependencies**: TypeSafe HTTP API (`jev-1.13.0`), with `TYPESAFE_API_KEY` in `portal/.env`. **Absent on this
machine today** (observed: `portal/.env` holds only `FIGMA_TOKEN` and `FIGMA_FILE_KEY`).

## Related Work

**Implements**: #454 (`Closes #454`) · **Epic**: follows #279 (closed); architecture
`docs/epics/discovery-partner.architecture.md`. Build order in the ticket: #454 → #453 → #455.

**Back-references**:

- #289 (the off-script controls, `AFFORDANCES = ['look-up','aside']`, `LOOK_IT_UP_RULE`) — the path "Send as a
  look-up" reuses unchanged.
- Memory `drawer-lookup-silently-skipped` — the observed failure this ticket addresses.
- `.claude/plans/proposals-from-a-discovery-package-ticket.md` — the #359 precedent for a lib module behind one
  discovery route.

**Forward-references**:

- #453 reuses `portal/lib/jev.mjs` (`askJev`, `JEV_MODEL`) and must not fork it.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

All line numbers were read on `origin/main` @ `ce74378` this session.

- `portal/server.mjs:1-70` — imports, `json`, `readBody`, the origin guard before routing (`:66-67`).
- `portal/server.mjs:171-208` — the discovery open route. It is the **named-parameters-never-a-spread** pattern and
  comment to mirror.
- `portal/server.mjs:210-227` — `resolveRunRoot` + `assertProvenanceRoot`, the pair every discovery route runs.
- `portal/server.mjs:347-383` — `/api/discovery/turn`, where your route goes (just above it).
- `portal/server.mjs:487-489` — the catch-all `json(res, 500, { error })`.
- `portal/lib/env.mjs` (whole file, 27 lines) — the `.env` loader, which runs at import time and never overrides
  an existing `process.env` value.
- `portal/lib/discovery.mjs:1-60` — the header voice and the five invariants. Note invariant 1: the file is
  statically SDK-free so CI can import it.
- `portal/lib/discovery.mjs:85-113` — `assertRunSlug`, `resolveRunRoot`, `assertProvenanceRoot`.
- `portal/lib/discovery.mjs:266-274` — `assertAffordance`; the existing-PRD refusal wording to echo.
- `portal/lib/discovery.mjs:538-541` — `readRun(root)`, which returns `null` when there is no `run.json`.
- `portal/lib/discovery-postures.mjs:163-173` — `AFFORDANCES` and `LOOK_IT_UP_RULE`.
- `portal/lib/discovery-transport.mjs:186-187` — `fetching = affordance !== null` → `tools = [...FETCH_TOOLS]`.
  This is why "Send as a look-up" really can search (AC #3 is reachable).
- `discovery/bank.mjs:1061` — `questionById(id)` → `{ id, stage, text, attribution, label, note, weakAnswer }`.
  Use `.text` only; never send `note`/`weakAnswer` (the agent's rubric, which `discoveryConfig()` strips from the
  browser for the same reason).
- `portal/public/portal.js:7-11` — `api()`, which throws on a non-2xx response.
- `portal/public/portal.js:996-1050` — `renderDiscoverySession`, which re-derives every disabled state.
- `portal/public/portal.js:1317-1366` — `DISCOVERY_TURN_CONTROLS` and `postDiscoveryTurn`.
- `portal/public/portal.js:1395-1444` — the submit handler, park, and `offScriptControl` plus its two listeners.
- `portal/public/index.html:241-275` — the answer label, the actions row, `#discovery-offscript-row`,
  `#discovery-status`.
- `portal/public/portal.css:57-61` — the page-wide `[hidden] { display: none !important; }`. It already covers a
  new hidden block.
- `tooling/build-checks.mjs:318-337` — `ok()`, `failed`, `group()`.
- `tooling/build-checks.mjs:13666-13940` — group 43. Mirror its shape: a `// --- N · name (#ticket) ---` header
  with WHAT THIS GROUP CANNOT REACH, one `{ … }` block, `threw`/`athrew` helpers, `group("…", "…")` at the end.
- `tooling/build-checks.mjs` last lines — `console.log("\nbuild ✓  all 43 groups pass")`.
- `tooling/drift-check.mjs:183-205` — `checkGroupCount`. It reads **four** count claims: the build-checks ✓ line,
  CLAUDE.md `43 PURE groups`, CLAUDE.md `build-checks' 43 groups`, and gates.md `43 pure groups`. All four must
  say 44.
- `.claude/references/gates.md:11-80` — the group list format `**Group N — name** (#ticket, files): … *cannot
  reach …*`.
- `discovery/faster-payment/answers.jsonl` — a3, a5, a10 and a23 are the positives. Line fields are `ref`, `ts`,
  `turn`, `question_id`, `kind`, `text`.

### New Files to Create

- `portal/lib/jev.mjs` — the TypeSafe `fetch` client (`askJev`, `JEV_MODEL`, `JEV_URL`).
- `portal/lib/discovery-guard.mjs` — the questions, `stateFor`, `decide`, the thresholds with their reason, and
  `checkAnswer`.
- `tooling/jev-guard-eval.mjs` — the operator-run eval.
- `tooling/jev-guard/labels.json` — the owner-confirmed positives (hand-written by the owner's decision; this is a
  label, not agent output).
- `tooling/jev-guard/eval-run.json` — GENERATED by the eval from real API responses. Never hand-edited.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [TypeSafe HTTP API](https://docs.typesafe.ai/api.md): endpoint, `Authorization: Bearer`, request
  `{ model, state, questions }`, response `{ model, answers: { <id>: { type: "noul", noul } }, usage }`, errors
  401/422/429/529.
- [Noul primitive](https://docs.typesafe.ai/primitives/noul.md): `instructions` (string), `criteria` as
  `{ "true": …, "false": … }`, and threshold guidance.
- [Fan-out](https://docs.typesafe.ai/patterns/fan-out.md): all questions in one request, evaluated in parallel.
- [State](https://docs.typesafe.ai/concepts/state.md): named JSON fields; reference them in backticks
  (`` `answer` ``, `` `question` ``).
- [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md): confirms the `jev-1.13` line
  exists.
- Not in primary docs (**unverified, secondary sources only**): the ~150 ms latency and $0.042/M input pricing.
  The eval measures latency; cost stays a labelled estimate.
- Not retrievable: the exact error-body JSON shape. The client must not depend on it (read `res.status`, and the
  body text only for the message).

### Patterns to Follow

**Route branch** (mirror `server.mjs:171-208`): each body field named, never a spread:

```js
if (p === '/api/discovery/check-answer' && req.method === 'POST') {
  const b = await readBody(req);
  return json(res, 200, await checkAnswer({ slug: b.slug, provenance: b.provenance, questionId: b.questionId, text: b.text }));
}
```

**Errors**: plain `Error`, message names the offending thing, prefixed by module (`discovery.mjs:57`:
`const bad = (msg) => { throw new Error(\`discovery: ${msg}\`); }`). Use `discovery-guard:` and `jev:` prefixes. No
error taxonomy.

**Header**: open each new file with a header citing its governing doc (`#454`, and `epic #279` lineage) and its
invariants. The header is the specification (CLAUDE.md §Ground rules).

**Drawer**: `$()` helper, `textContent` for any server or user text (never `innerHTML`), and `hidden` toggles,
which the page-wide `[hidden]` rule enforces.

**Build-checks group**: failures via `ok(cond, "44.N: …")`, a final `group("jev guard", "<what it proves> … What it
cannot reach: …")`.

---

## IMPLEMENTATION PLAN

### Phase 0: Owner prerequisite — the key

`TYPESAFE_API_KEY=<key>` in `portal/.env`. Phases 1–3 can be written without it. Phase 4 (the eval) cannot, and
build-checks group 44 needs Phase 4's committed file, so **the PR cannot go green without the key**.

### Phase 1: The client and the guard module (pure, CI-importable)

`jev.mjs` first, then `discovery-guard.mjs` (it imports `jev.mjs`).

### Phase 2: The route and the drawer

**Depends on:** Phase 1.

### Phase 3: The eval script and the labels

**Depends on:** Phase 1 (imports `QUESTIONS`, `stateFor`, `decide`, `askJev`). **Independent of:** Phase 2.

### Phase 4: Run the eval, set T, commit the responses

**Depends on:** Phases 0 and 3.

### Phase 5: Group 44 and the gate literals

**Depends on:** Phase 4 (reads `eval-run.json`). The fail-open and refusal cases (44.4–44.6) can be written before
Phase 4.

### Phase 6: Live validation (portal smoke, AC #3, AC #4)

**Depends on:** Phases 2 and 4.

---

## STEP-BY-STEP TASKS

### Task 1 — CREATE `portal/lib/jev.mjs`

- **IMPLEMENT**:
  - `import './env.mjs';` (side effect: loads `portal/.env`, so the CLI eval also sees the key).
  - `export const JEV_URL = 'https://api.typesafe.ai/v1/systemone';`
  - `export const JEV_MODEL = 'jev-1.13.0';`
  - `export async function askJev({ state, questions }, { key = process.env.TYPESAFE_API_KEY, model = JEV_MODEL, timeoutMs = 1500, fetchImpl = fetch } = {})`:
    1. `if (!key) throw new Error('jev: TYPESAFE_API_KEY is not set in portal/.env')`. This throws **before** any
       fetch.
    2. `const res = await fetchImpl(JEV_URL, { method: 'POST', headers: { authorization: \`Bearer ${key}\`, 'content-type': 'application/json' }, body: JSON.stringify({ model, state, questions }), signal: AbortSignal.timeout(timeoutMs) })`.
    3. `if (!res.ok) throw new Error(\`jev: ${res.status} from ${JEV_URL}${detail}\`)`, where `detail` is at most
       200 characters of `await res.text().catch(() => '')`. Never echo the key.
    4. `const body = await res.json()`. If `body.model !== model`, throw
       `jev: asked for ${model}, answered by ${body.model}`. This pins the model, so a silent upgrade cannot change
       T's meaning.
    5. Return `body` verbatim (`{ model, answers, usage }`).
  - Header: what and why, the #454 citation, "no SDK — the fetch is the whole client", "#453 reuses this; do not
    fork", the pin rationale, and the unverified latency/pricing claim labelled as such.
- **PATTERN**: `portal/lib/env.mjs` (zero-dep, hand-rolled); error style from `discovery.mjs:57`.
- **IMPORTS**: `./env.mjs` only. Global `fetch` and `AbortSignal.timeout` exist on Node ≥ 18 (observed: Node
  v20.20.2 locally).
- **GOTCHA**: `env.mjs` never overrides an existing `process.env` value, and it runs once at import. "Remove the
  key" (AC #4) therefore means deleting the `.env` line **and restarting the portal**, with `TYPESAFE_API_KEY`
  unset in the shell.
- **GOTCHA**: do not add retries here. The drawer path must fail within 1.5 s; the eval does its own retry (Task
  6).
- **VALIDATE**: `node -e "import('./portal/lib/jev.mjs').then(m=>console.log(m.JEV_MODEL, m.JEV_URL))"`, expected
  `jev-1.13.0 https://api.typesafe.ai/v1/systemone`.
- **SATISFIES**: AC #3 and AC #4 (the transport); the standing rule (no SDK, pinned model).
- **REGENERATES**: none. `portal/` matches no `loc-summary` group (observed: the three groups are `system/`,
  root/proto HTML and `agent-layer/`, `agent-layer/gen-loc-summary.mjs:23-25`, and `total` sums only those).

### Task 2 — CREATE `portal/lib/discovery-guard.mjs`

- **IMPLEMENT**:
  - Imports: `readRun`, `resolveRunRoot`, `assertProvenanceRoot` from `./discovery.mjs`; `questionById` from
    `../../discovery/bank.mjs`; `askJev` from `./jev.mjs`.
  - `export const QUESTIONS = Object.freeze({ look_up: {...}, aside: {...} })`, each `{ type: 'noul', instructions, criteria: { true, false } }`:
    - `look_up.instructions`: "Does `answer` contain a request for information to be found, searched or checked
      (for example 'look up X', 'find figures on Y', 'what does the research say about Z'), instead of, or as
      well as, the person's own answer to `question`?"
    - `look_up.criteria.true`: "It asks for something to be looked up, searched, found or checked, **even if an
      answer to `question` is also present in the same text**."
    - `look_up.criteria.false`: "It is the person's own answer. Citing, quoting or summarising something they
      already found, or saying they still need to find something out themselves, is not a request."
    - `aside.instructions`: "Is `answer` about something other than `question`, raised beside it?"
    - `aside.criteria.true`: "Most of it addresses a different topic from `question`: a concern, a new idea or a
      question for the interviewer."
    - `aside.criteria.false`: "It addresses `question`, even briefly, vaguely or badly."
    - The "even if an answer is also present" clause is load-bearing: all four positives are mixed
      (`Look it up: … Answer: …`). A criterion reading "rather than the person's own answer" would score them no.
  - `export const stateFor = ({ question, answer }) => ({ question, answer });` — the one state builder the route and
    the eval share, so they cannot drift.
  - `export const T_LOOK_UP = <from Task 8>; export const T_ASIDE = <from Task 8, or null — see D3>;`. Until Task 7, set both to
    `null`; `decide` throws on a null threshold, so an unfinished module fails open rather than prompting.
  - `export function decide(answers, { lookUp = T_LOOK_UP, aside = T_ASIDE } = {})`:
    - Throw if `lookUp` is not a number in (0,1). `aside` may be a number in (0,1) **or `null`, meaning the aside
      question is disabled** (D3's aside stop branch); any other value throws.
    - Throw `discovery-guard: Jev answered no <id> noul` if `answers?.look_up?.noul` or `answers?.aside?.noul` is
      not a finite number.
    - `if (answers.look_up.noul >= lookUp) return 'look-up'; if (aside !== null && answers.aside.noul >= aside) return 'aside'; return 'answer';`
    - The two return values match `AFFORDANCES` exactly (`discovery-postures.mjs:163`). Import `AFFORDANCES` and
      assert `['look-up','aside']` is a subset at module load, so a rename there reddens here.
  - `export async function checkAnswer({ slug, provenance, questionId, text }, { ask = askJev } = {})`:
    1. **Refusals (these throw; the route's catch-all returns 500, and the drawer fails open on any non-2xx):**
       - `const root = resolveRunRoot({ provenance, slug }); assertProvenanceRoot(provenance, root);`
       - `const head = readRun(root); if (!head) throw … 'no run.json under …'`
       - `if ((head.entryMode ?? 'blank-idea') === 'existing-prd')` throw naming it: "an existing-prd audit has no
         answer box, so there is nothing to guard (#454 Design 5)".
       - `const q = questionById(questionId); if (!q)` throw naming `questionId`.
       - `if (typeof text !== 'string' || !text.trim())` throw.
    2. **The call, fail-open:**
       `const t0 = performance.now(); try { const r = await ask({ state: stateFor({ question: q.text, answer: text }), questions: QUESTIONS }); return { verdict: decide(r.answers), lookUp: r.answers.look_up.noul, aside: r.answers.aside.noul, ms: Math.round(performance.now() - t0), failOpen: null }; } catch (e) { return { verdict: 'answer', lookUp: null, aside: null, ms: Math.round(performance.now() - t0), failOpen: e.message }; }`
  - Header: the #454 citation; "Jev routes, Claude does the work"; the four invariants (writes nothing · fails
    open · never sends the weak-answer rubric · the verdict is advice, the person's click is the record); **T_LOOK_UP
    and T_ASIDE with their reason and the measured numbers** (filled in Task 8); Q1 decided "on for both
    provenances" (owner, 2026-09-27) with the reason.
- **PATTERN**: `discovery.mjs:85-113` for the refusal pair; the `bad()` style.
- **GOTCHA**: `readRun` returns `null` rather than throwing for a missing package. Handle it explicitly, or a real
  provenance slug with no directory reaches Jev.
- **GOTCHA**: no `endedAt` refusal. The ticket doesn't ask for one, and the turn route already refuses a closed
  session. Group 44 uses the closed `faster-payment` package, which is valid under this rule.
- **GOTCHA**: only `q.text` goes into state. Sending `note`/`weakAnswer` would leak the rubric to a third party.
- **VALIDATE**:
  `node --input-type=module -e "import {QUESTIONS,decide} from './portal/lib/discovery-guard.mjs'; console.log(Object.keys(QUESTIONS)); try{decide({})}catch(e){console.log(e.message)}"`
  Expected: `[ 'look_up', 'aside' ]` and a threshold-null refusal message.
- **SATISFIES**: AC #1 (the thing measured), AC #4 (fail-open), Design 2, Design 4 and Design 5.
- **REGENERATES**: none.

### Task 3 — ADD the route to `portal/server.mjs`

- **IMPLEMENT**: `import { checkAnswer } from './lib/discovery-guard.mjs';` next to the discovery imports (`:16`),
  with a one-line comment. Add the branch shown under §Patterns immediately **above**
  `if (p === '/api/discovery/turn'` (`:347`). Add a comment: named parameters (reason: `server.mjs:173-175`);
  returns 200 even when Jev fails (fail-open lives in the module); refusals throw into the catch-all.
- **GOTCHA**: the origin guard (`:66-67`) already runs before routing. Add nothing for CSRF.
- **VALIDATE** (observed before the change: `POST /api/discovery/check-answer` → `{"error":"not found"}`). After the
  change, on a free port:
  `curl -s -X POST localhost:$P/api/discovery/check-answer -H 'content-type: application/json' -d '{"slug":"partner-audit-1","provenance":"fictional","questionId":"s6-process-as-it-runs","text":"x"}'`
  Expected: `{"error":"discovery-guard: an existing-prd audit has no answer box…"}` (500).
- **SATISFIES**: Design 1 and Design 5; AC #5 (the portal boots).
- **REGENERATES**: none.

### Task 4 — UPDATE `portal/public/index.html` (the choice block)

- **IMPLEMENT**: directly after the answer `<label>` (`:241-244`), before the actions row:

  ```html
  <!-- #454: Jev's pre-submit check. Advice only — the person's click decides, and nothing here is recorded. -->
  <div id="discovery-guard" class="portal-guard" hidden>
    <p id="discovery-guard-prompt"></p>
    <div class="portal-form-actions">
      <button class="btn btn-primary" type="button" id="discovery-guard-offscript"></button>
      <button class="btn btn-secondary" type="button" id="discovery-guard-answer">Send as my answer</button>
    </div>
  </div>
  ```

- **GOTCHA**: `type="button"` on both, or they submit `#discovery-form` and re-enter the guard.
- **VALIDATE**: `grep -c 'id="discovery-guard' portal/public/index.html` → `4` (the div, the p, two buttons).
- **SATISFIES**: Design 3; AC #3.
- **REGENERATES**: none. The portal has no VR baseline (group 43's header: "the portal has no baseline").

### Task 5 — UPDATE `portal/public/portal.js` (the guard in the submit path)

- **IMPLEMENT**:
  1. Name the two running lines once:
     `const LOOKUP_LINE = 'Looking it up — the agent may search the web. This spends real tokens.'` and
     `const ASIDE_LINE = 'Taking that off-script — this spends real tokens.'`. Use them in the two existing
     listeners (`:1443-1444`) and in the guard. The literal text stays identical.
  2. Extract the body of the existing submit handler's `postDiscoveryTurn({...})` call (`:1404-1411`) into
     `const submitAnswer = ({ audit, questionId, text }) => postDiscoveryTurn({...same...})`, and set the
     `'Judging…'` label inside it. The submit handler and "Send as my answer" both call it.
  3. `async function guardVerdict(questionId, text)` returns the verdict and **never throws**:
     `try { const { slug, provenance } = discoveryEls(); const r = await fetch('/api/discovery/check-answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, provenance, questionId, text }), signal: AbortSignal.timeout(2500) }); if (!r.ok) return 'answer'; const j = await r.json(); return j.verdict === 'look-up' || j.verdict === 'aside' ? j.verdict : 'answer'; } catch { return 'answer'; }`
     The 2.5 s client cap sits above the server's 1.5 s Jev cap plus local overhead. It exists so a hung portal can
     never block a submit.
  4. In the submit handler, after the empty-text check and **only when `!audit`**:
     - Set `discovery.checking = true`. Disable every `DISCOVERY_TURN_CONTROLS` element and `#discovery-answer`, and
       set status to `'Checking which box this belongs in…'`.
     - `const verdict = await guardVerdict(questionId, text);`
     - In a `finally`: set `discovery.checking = false` and call `renderDiscoverySession()`, which restores every
       disabled state.
     - If `verdict === 'answer'`, call `submitAnswer(...)`. Otherwise call `showGuardChoice(verdict, { questionId, text })`.
     - Also: `if (discovery.running || discovery.checking || !discovery.session) return;` at the handler top.
  5. `showGuardChoice(verdict, { questionId, text })`:
     - Set `#discovery-guard-prompt.textContent`. For look-up: `'This reads like a look-up. Send it to the agent to
       search, or send it as your answer?'`. For aside: `'This reads like something beside the question. Send it
       as "Ask something else", or as your answer?'`.
     - Set `#discovery-guard-offscript.textContent` to `'Send as a look-up'` or `'Send as something else'`.
     - Store `{ verdict, questionId, text }` on `discovery.guard`, un-hide `#discovery-guard`, and move focus to the
       primary button.
  6. The two button listeners:
     - `#discovery-guard-offscript`: hide the block, `$('#discovery-offscript').value = g.text`, then
       `await offScriptControl(g.verdict, g.verdict === 'look-up' ? LOOKUP_LINE : ASIDE_LINE)()`. The answer box is
       **not** cleared (owner decision). `offScriptControl` already leaves it alone and clears the off-script box.
       After it resolves, append to the status line: `' Your answer box still holds that text — trim it to your
       own answer, then submit.'`
     - `#discovery-guard-answer`: hide the block, then `submitAnswer({ audit: false, questionId: g.questionId, text: g.text })`.
       This bypasses the guard, so the verdict is not asked twice.
  7. Hide `#discovery-guard` and null `discovery.guard` in three places: on `#discovery-answer` `input` (stale
     advice for changed text), at the top of `renderDiscoverySession` when `discovery.guard?.questionId !==
     cursor.question?.id`, and at the start of `postDiscoveryTurn`.
- **PATTERN**: `postDiscoveryTurn`'s disable loop (`:1325`); `offScriptControl` (`:1432-1442`); `textContent` for
  all prose.
- **GOTCHA**: the double-submit window. `discovery.running` is set only inside `postDiscoveryTurn`, so without
  `discovery.checking` a second Enter during the ~150 ms–1.5 s check starts a second check and then a second turn.
- **GOTCHA**: `renderDiscoverySession` resets `#discovery-submit.textContent` (`:1006`). Call it in the guard's
  `finally` **before** `submitAnswer` sets `'Judging…'`, not after.
- **GOTCHA**: `offScriptControl` returns early on empty `#discovery-offscript`. Set `.value` **before** invoking it.
- **GOTCHA**: audit turns send no text and must never call the guard (the route would refuse; the drawer skips it).
- **VALIDATE**: `node --check portal/public/portal.js` → no output. The behaviour is Phase 6 (no CI group can run
  portal.js; see `portal.js:1318-1320`'s own comment).
- **SATISFIES**: Design 3 and Design 4; AC #3 and AC #4.
- **REGENERATES**: none.

### Task 6 — UPDATE `portal/public/portal.css`

- **IMPLEMENT**: one block, `.portal-guard { border: 1px solid var(--color-border); padding: var(--spacing-md); margin-block: var(--spacing-md); }`,
  with a `/* #454 … */` comment. Tokens only (the file already uses `var(--color-border)` and
  `var(--spacing-md)`, `portal.css:4-6`).
- **VALIDATE**: `grep -n "portal-guard" portal/public/portal.css` → one rule.
- **SATISFIES**: Design 3. **REGENERATES**: none.

### Task 7 — CREATE `tooling/jev-guard/labels.json` and `tooling/jev-guard-eval.mjs`

- **IMPLEMENT** `labels.json`:

  ```json
  { "$description": "Owner-labelled positives for the #454 guard: run-1 answer lines that were look-ups typed into the answer box. Confirmed by the owner in the #454 planning session, 2026-09-27. a22 is NOT a positive (its look-up half is absent). Negatives are derived by tooling/jev-guard-eval.mjs, never listed here.",
    "positives": [
      { "package": "faster-payment", "ref": "a3" }, { "package": "faster-payment", "ref": "a5" },
      { "package": "faster-payment", "ref": "a10" }, { "package": "faster-payment", "ref": "a23" } ],
    "synthetic": [] }
  ```

  If the owner later adds synthetic or owner-written positives, they go in a separate
  `tooling/jev-guard/synthetic.jsonl`, and the eval reports them as their own row, never pooled (AC #1).
- **IMPLEMENT** `jev-guard-eval.mjs` (operator-run; header states it needs the key and spends about
  $0.002, **unverified** pricing):
  1. Items: read `discovery/*/answers.jsonl`, keep `kind === "banked"`. Positives are the labelled refs; assert each
     exists and its text starts with `Look it up`, or throw naming it. Negatives are every other banked line,
     **deduplicated by exact text** and excluding any text equal to a positive. Each item is
     `{ package, ref, questionId, label, sha: sha256(text) }`, with the question text from `questionById`.
     - Expected counts (derived, observed today): 257 banked lines, 164 unique texts. Positives = 4. Negatives =
       164 − 4 = **160** unique (253 lines before dedup). The `graded-opus-a`/`graded-think-a` answer sets are
       byte-identical (65/65 observed), so without dedup they would double-count.
  2. Per item, `askJev({ state: stateFor(...), questions: QUESTIONS }, { timeoutMs: 10000 })`. Retry on `429`/`529`
     only, with backoff of 2 s, 4 s, 8 s, then throw. Items run **sequentially** (≈164 calls). Record
     `ms = performance.now()` delta per call.
  3. Any other error aborts the run and **writes nothing**. A partial eval must not be committed.
  4. Output: `tooling/jev-guard/eval-run.json`, containing
     `{ $description: "GENERATED by tooling/jev-guard-eval.mjs from real TypeSafe API responses — never edit; re-run instead", model, ranAt, questionsSha: sha256(JSON.stringify(QUESTIONS)), items: [{ package, ref, questionId, label, sha, answers /* verbatim */, usage, ms }], threshold: { lookUp, aside, rule }, summary: { nPos, nNeg, lookUpRecall, lookUpFalsePrompt, promptRate, asideFalsePrompt, latencyMs: { p50, p95, over1500 } } }`.
     `answers` is the response's `answers` object copied **verbatim**.
  5. Print a sweep over T ∈ {0.10, 0.15, …, 0.90}: look_up recall (x/4), look_up false-prompt rate (x/160), and
     the combined prompt rate.
  6. Apply the **pre-registered rule** (§NOTES D3) in code. Write the chosen `threshold` into the file and print
     `set T_LOOK_UP = … and T_ASIDE = … in portal/lib/discovery-guard.mjs`. Do not auto-edit the module; the
     implementer copies the values and the numbers into its header.
  7. If the rule finds no admissible T, **print why and exit 1 without writing**. That is a stop for the owner,
     never a reason to adjust the rule.
- **IMPORTS**: `node:fs`, `node:path`, `node:crypto`, `node:url`; `../portal/lib/jev.mjs`,
  `../portal/lib/discovery-guard.mjs`, `../discovery/bank.mjs`.
- **GOTCHA**: `decide` throws while the thresholds are `null`. The sweep calls `decide(answers, { lookUp: t, aside: t2 })`
  with explicit thresholds, never the defaults.
- **GOTCHA**: `.mjs` under `.claude/plans/` gets syntax-checked by drift-check. Put no code fragments there as
  `.mjs` (memory `drift-check-syntax-checks-parked-mjs`). This script lives under `tooling/`, which is fine.
- **VALIDATE** (without the key): `node tooling/jev-guard-eval.mjs` → exits non-zero naming `TYPESAFE_API_KEY`,
  and no `eval-run.json` is written (expected).
- **SATISFIES**: AC #1 and AC #2.
- **REGENERATES**: `tooling/jev-guard/eval-run.json` (committed, drift-checked by group 44.2).

### Task 8 — RUN the eval (owner key), set T, commit the file

- **IMPLEMENT**: `node tooling/jev-guard-eval.mjs`. Paste the sweep table into the report. Copy `T_LOOK_UP` and
  `T_ASIDE` into `discovery-guard.mjs`, and write the header paragraph: T, the rule, the reason, recall x/4,
  false-prompt x/160, combined prompt rate, latency p50/p95/over-1500 ms, and `jev-1.13.0`.
- **GOTCHA**: honesty contract (hard). `eval-run.json` is never hand-edited. A bad question wording is fixed by
  editing `QUESTIONS` and re-running. That moves `questionsSha`, which group 44 checks.
- **GOTCHA**: if `over1500` is large, many real submits will fail open (no prompt). Report it. Do not raise the
  1.5 s timeout without the owner's decision (the ticket fixes 1.5 s).
- **VALIDATE**: `node -e "const r=require('./tooling/jev-guard/eval-run.json');console.log(r.model,r.summary)"` →
  `jev-1.13.0` plus the numbers you copied.
- **SATISFIES**: AC #1 and AC #2. **REGENERATES**: `eval-run.json`.

### Task 9 — ADD group 44 "jev guard" to `tooling/build-checks.mjs`

Add it after group 43's block, before the final failure tally. Header:
`// --- 44 · the jev guard (#454) ---`, with WHAT THIS GROUP CANNOT REACH: the live API's behaviour today, whether
T generalises beyond 164 texts, the drawer (portal.js has no CI runner), and the route wiring (CI has no
`portal/node_modules`, and `server.mjs` imports `chat.mjs`).

**THE HONESTY RULE FOR THIS GROUP** (state it in the header): every probability the group reads comes from
`eval-run.json`. An injected `ask` may only **fail**: throw, abort, report a status, or return a shape with a
missing field. It never returns a `noul` number. A fake that returns `{ look_up: { noul: 0.9 } }` would be a
hand-written Jev response.

Cases (each `ok(cond, "44.N: …")`):

- **44.1 import graph.** Decomment both sources (`src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'')`,
  the group 43 idiom). For `jev.mjs` the static import specifiers are exactly `['./env.mjs']`. For
  `discovery-guard.mjs` they are a subset of `['./discovery.mjs','../../discovery/bank.mjs','./jev.mjs','./discovery-postures.mjs']`.
  Neither contains `claude-agent-sdk` or `zod`. `JEV_MODEL === 'jev-1.13.0'`. `JEV_URL` is the documented
  endpoint.
  - **REDDENS**: add `import 'zod';` to `discovery-guard.mjs` →
    `44.1: discovery-guard.mjs imports zod — the guard must stay SDK- and zod-free`.
- **44.2 the committed eval matches the tree.**
  - `eval-run.json` exists and `model === JEV_MODEL`.
  - `questionsSha === sha256(JSON.stringify(QUESTIONS))`.
  - Positives in the file equal `labels.json`'s refs.
  - Every item's `sha` equals sha256 of the text currently at `<package>/answers.jsonl` → `ref`. This is
    *present and unchanged*, **not** set-equality with today's negatives, so a new discovery package landing on
    another ticket does not red this group.
  - Every item has finite `answers.look_up.noul` and `answers.aside.noul`.
  - **REDDENS**: edit one word of `QUESTIONS.look_up.instructions` →
    `44.2: QUESTIONS changed since eval-run.json was recorded (sha …≠…) — re-run tooling/jev-guard-eval.mjs`.
  - Positive control: with the file untouched, the group is green.
- **44.3 the stated numbers recompute.** Run `decide(item.answers)` with the module's own `T_LOOK_UP`/`T_ASIDE`
  over the committed items. Recompute recall, look_up false-prompt, combined prompt rate and aside false-prompt;
  each equals `eval-run.json.summary`. `T_LOOK_UP === threshold.lookUp` and `T_ASIDE === threshold.aside`. The
  module header source contains the literal recall `x/4` and false-prompt `y/160` strings.
  - **REDDENS**: change `T_LOOK_UP` by one grid step → `44.3: T_LOOK_UP 0.xx ≠ the recorded threshold 0.yy`. Also:
    change `>=` to `>` in `decide`, which moves at least one recomputed count only if a noul sits exactly on T.
    Name it in the report if it doesn't move, because then 44.3 cannot see that mutation.
- **44.4 decide's branches, driven by real responses.** If `T_ASIDE === null`, assert no committed item decides
  `'aside'` and that `decide(item.answers, { lookUp: T_LOOK_UP, aside: null })` never returns it. At least one positive item decides `'look-up'` and at
  least one negative decides `'answer'`, found by searching the committed items, never constructed. `decide({})`
  throws naming `look_up`. `decide(item.answers, { lookUp: null })` throws naming the threshold.
  - **REDDENS**: make `decide` return `'answer'` unconditionally →
    `44.4: no committed positive decides "look-up" at T`.
- **44.5 fail-open, with the real `askJev` where possible.**
  - `askJev(x, { key: '', fetchImpl: counter })` throws naming `TYPESAFE_API_KEY` with **0** fetch calls.
  - `askJev` with a `fetchImpl` that returns `{ ok: false, status: 429, text: async () => '' }` throws naming
    `429`.
  - `askJev` with a `fetchImpl` that rejects with `DOMException('…','TimeoutError')` throws.
  - `askJev` with a `fetchImpl` answering `{ ok: true, json: async () => ({ model: 'jev-9' }) }` throws naming
    both models. This is a model mismatch; no probability is fabricated.
  - Then `checkAnswer({ slug: 'faster-payment', provenance: 'fictional', questionId: <a3's>, text: 'x' }, { ask })`,
    with each failing `ask` wrapping one of those `askJev` calls, returns
    `{ verdict: 'answer', failOpen: <non-empty>, lookUp: null }`.
  - **REDDENS**: remove the `try/catch` in `checkAnswer` →
    `44.5: checkAnswer threw on a missing key instead of failing open`.
- **44.6 refusals never reach Jev.** A counting `ask` records calls. Each of the following throws naming its cause,
  with **0** calls:
  - `partner-audit-1` (existing-prd) → "existing-prd".
  - An unknown `questionId` → names it.
  - Empty text.
  - A bad slug → `assertRunSlug`'s message.
  - `provenance: 'real'` with slug `no-such-run-454` → "no run.json".
  - **Positive control**: a valid call through a failing `ask` records exactly **1** call.
  - **REDDENS**: move the `existing-prd` check after the `ask` call → `44.6: partner-audit-1 reached Jev (1 call)`.
- **44.7 nothing moved.** `git status --porcelain -- discovery portal/lib tooling/jev-guard` is identical before
  and after the group. This mirrors group 43's `gitSnap`.

End with
`group("jev guard", "portal/lib/jev.mjs + portal/lib/discovery-guard.mjs (#454): … What it cannot reach: …")`.

- **PATTERN**: group 43 (`tooling/build-checks.mjs:13666-13940`), including `threw`/`athrew` and `gitSnap`.
- **GOTCHA**: `discovery-guard.mjs` imports `jev.mjs`, which imports `env.mjs`, which reads `portal/.env` if
  present. In CI there is no `.env`. Locally, the operator's real key sits in `process.env` during build-checks,
  so **every 44.x case must inject `ask`/`fetchImpl`/`key`**. A case that calls the real `askJev` without
  injection would spend a call locally and fail in CI: the check that behaves differently in the two places.
- **GOTCHA**: gate prose has three copies (memory `gate-prose-has-three-copies`): the `group()` string, gates.md,
  and the group header comment. Write the "cannot reach" clause identically in all three.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -3` → `build jev guard ✓ …` and
  `build ✓  all 44 groups pass` (expected).
- **SATISFIES**: AC #1 (numbers reproducible offline), AC #4 (fail-open, unit level) and AC #5.
- **REGENERATES**: none.

### Task 10 — UPDATE the four group-count claims and the docs

- **IMPLEMENT**:
  - `tooling/build-checks.mjs`: `all 43 groups pass` → `all 44 groups pass`.
  - `CLAUDE.md`: `43 PURE groups` → `44 PURE groups` (architecture map, `:136` on main) and `build-checks' 43
    groups` → `44` (`:213`).
  - `.claude/references/gates.md:11`: `43 pure groups` → `44 pure groups`, and add a
    `**Group 44 — the jev guard** (#454, portal/lib/jev.mjs + portal/lib/discovery-guard.mjs + tooling/jev-guard/eval-run.json): … *cannot reach …*`
    entry after Group 43 (`:78`).
  - CLAUDE.md architecture map, under `portal/`, after `lib/origin.mjs`: add
    `lib/jev.mjs                 the TypeSafe (Jev) fetch client — no SDK; model pinned; #453 reuses it` and
    `lib/discovery-guard.mjs     the answer-box guard — two Noul questions, decide(), fail-open (#454)`.
  - Under `tooling/`, add
    `jev-guard-eval.mjs          the guard's labelled eval — operator-run, needs TYPESAFE_API_KEY (→ jev-guard/)`.
- **GOTCHA**: `tooling/drift-check.mjs:189-194` reads exactly those four claims. Missing one reddens CI `verify`
  with `group-count drift: …`.
- **VALIDATE**: `node tooling/drift-check.mjs 2>&1 | tail -1` → `drift-check ✓ … group-count` (observed green on
  main after `npm ci` in `tooling/icons`, `tooling/style-dictionary` and `portal`).
  - **REDDENS** (existing leg, confirm it bites): leave gates.md at 43 → `group-count drift: .claude/references/gates.md: says 43 groups, build-checks defines 44`.
- **SATISFIES**: AC #5. **REGENERATES**: none.

### Task 11 — Live validation (Phase 6)

- **Portal smoke** (memory `portal-smoke-port-scoped-kill`): use an OS-assigned free port, `PORT=$P node server.mjs &`,
  `PID=$!`, curl `/api/health` → `{"ok":true,…}`, then `kill $PID` only. Never `pkill` or kill by port.
- **Route with key**: POST `{ slug: "faster-payment", provenance: "fictional", questionId: "s6-process-as-it-runs", text: <a3's text> }`
  (a3's own `question_id`, observed) → `{"verdict":"look-up", "lookUp":…, "ms":…}`. Record `ms`.
- **AC #3 (paid, owner key and SDK login)**:
  1. Open a **throwaway fictional** session `jev-guard-probe-454` (blank idea, Think) in the drawer. It must not
     be `faster-payment`, which is closed (`endedAt` set, so `assertAffordance` refuses) and committed.
  2. Paste a3's full text into the answer box and press Submit → the choice appears.
  3. Press "Send as a look-up".
  4. Confirm: `discovery/jev-guard-probe-454/answers.jsonl` has a line with `kind: "off-script"` and
     `intent: "look-up"`; `transcript.jsonl` shows a `WebSearch`/`WebFetch` use or `file_evidence` with a non-null
     `url`; the answer box still holds the text.
  5. Copy the relevant lines into the report, then `rm -rf discovery/jev-guard-probe-454`. It is never staged.
     This is a proof run, not a committed package (the honesty contract forbids editing one, not discarding an
     uncommitted probe).
- **AC #4**: remove the `.env` line, confirm `TYPESAFE_API_KEY` is unset in the shell, **restart** the portal, and
  submit an ordinary answer on the probe session **before** step 5's deletion.
- **Order**: run the eval and the final `build-checks` / `drift-check` only **after** the probe directory is gone. The
  eval and several discovery groups glob `discovery/*/` from disk and would read it. Confirm
  `git status --porcelain -- discovery` is empty before staging. It goes straight to "Judging…" with
  no choice, and the route answers `failOpen: "jev: TYPESAFE_API_KEY is not set…"`. Restore the key afterwards.
- **Memory `stale-serve-wrong-tree`**: curl an edited file (`/portal.js` contains `guardVerdict`) before trusting the
  drawer.
- **SATISFIES**: AC #3, AC #4 and AC #5.
- **REGENERATES**: none.

---

## TESTING STRATEGY

There is no test suite (CLAUDE.md §Testing). "Tests" here means build-checks group 44, which is pure and runs in CI,
plus the operator-run eval and the live drawer check.

### Unit tests (group 44)

44.1–44.7 above: import graph, eval-tree binding, recomputed numbers, `decide`'s branches from real responses,
fail-open through the real `askJev` with injected failures, refusals with zero calls, and no tracked path moved.

### Integration

`tooling/jev-guard-eval.mjs` against the live API (operator), then the drawer walk in Task 11.

### Edge cases

- Mixed look-up + answer text (all four positives), covered by the criteria clause and measured by recall.
- Text that *cites* a source ("the FCA's 2023 figures show…"): it must score no. The negatives contain such lines
  (e.g. `faster-payment` a20).
- "I'm honestly not sure…" (`graded-*` a2): a real answer admitting uncertainty, a hard negative.
- The person edits the answer while the choice is shown → the choice hides (Task 5.7).
- A double Enter during the check → `discovery.checking` blocks it.
- Jev slower than 1.5 s → fail-open. The eval's `over1500` count says how often.
- Model upgraded server-side → `askJev` throws on mismatch → fail-open.
- Audit session → drawer skips the guard; route refuses.

### Proving the checks

Every 44.x case carries a REDDENS mutation above. Run each one once, observe the named failure, revert, and paste
the lines into the report. Positive controls: 44.2 green on the untouched file; 44.6's one-call valid path.

---

## VALIDATION COMMANDS

### Level 1: Syntax

- `node --check portal/lib/jev.mjs portal/lib/discovery-guard.mjs tooling/jev-guard-eval.mjs portal/public/portal.js`
- `node tooling/drift-check.mjs` (syntax-checks every tracked `.mjs`, plus group-count)

### Level 2: Pure gates

- `node tooling/build-checks.mjs` → `build ✓  all 44 groups pass`
- `node agent-layer/gen-loc-summary.mjs --check` **after `git add`** (memory `loc-summary-counts-tracked-only`) →
  no drift expected, because `portal/` and `tooling/` match no group.

### Level 3: Operator

- `node tooling/jev-guard-eval.mjs` (key) → the sweep, the chosen T and `eval-run.json`.

### Level 4: Manual

- Task 11: portal smoke, the route with the key, AC #3 walk, AC #4 walk.

### Level 5: CI

- The `verify` job (build-checks · drift-check · token-lint) and CodeQL. The new outbound `fetch` targets a
  constant URL, so no SSRF surface is expected (expected, not observed).

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Obtain `TYPESAFE_API_KEY` and put it in `portal/.env` | owner's hand | **yes**: group 44 needs `eval-run.json` | none; the PR waits |
| `node tooling/jev-guard-eval.mjs` (~164 Jev calls, ~50k input tokens) | ≈ $0.002 (derived from the **unverified** $0.042/M) | **yes**: AC #1, AC #2, group 44 | none |
| AC #3 drawer walk: one look-up turn on a throwaway fictional session (Think, Sonnet, WebSearch) | ≈ $0.15–0.40 (run-1 turns cost ~$0.12 each without search; expected) | **yes**: AC #3 | open one before the PR if the SDK login or credit is unavailable |
| AC #4 fail-open walk | free (no Jev call; the banked turn it submits costs ≈ $0.12) | yes: AC #4 | as above |
| If the eval finds no admissible T (D3) | owner decision | yes | owner decides: reword the questions and re-run, or relax the ceiling |

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** A labelled set, measured: 4 owner-confirmed positives (faster-payment a3, a5, a10, a23) and 160
  deduplicated negatives (253 banked lines before dedup; 257 total banked minus 4 positives). Recall and
  false-prompt rate at T are reported, with T and its reason in `discovery-guard.mjs`'s header. Any synthetic
  positives are in a separate file and reported separately.
- [ ] **AC #2** `node tooling/jev-guard-eval.mjs` reproduces those numbers (operator-run, needs the key), and group
  44 recomputes them offline from the committed responses.
- [ ] **AC #3** In the drawer, a3's text typed into the answer box triggers the choice. "Send as a look-up" yields
  an `intent: "look-up"` off-script line, and the agent's search runs (observed in `transcript.jsonl`).
- [ ] **AC #4** With the key removed and the portal restarted, submit behaves exactly as before (fail-open,
  observed).
- [ ] **AC #5** `node tooling/build-checks.mjs` green (44 groups); `node tooling/drift-check.mjs` green; the portal
  boots and `/api/health` answers.
- [ ] Nothing is written to any run package by the guard (44.7; the route has no write path).
- [ ] Every 44.x REDDENS mutation was observed failing, with the output in the report.

---

## COMPLETION CHECKLIST

- [ ] Tasks 1–11 in order, each VALIDATE run
- [ ] Eval run and `eval-run.json` committed unedited; T copied into the module header with its reason
- [ ] Group 44 green, and every REDDENS observed
- [ ] Four group-count claims at 44; gates.md entry; CLAUDE.md map lines
- [ ] Portal smoke, AC #3 and AC #4 observed, and the probe package deleted, never staged
- [ ] Plan, report and review in the same PR; PR body carries `Closes #454`

---

## OPEN QUESTIONS / ASSUMPTIONS

Decided by the owner in this planning session (2026-09-27):

- D1 Positives = faster-payment a3, a5, a10, a23. a22 is a negative.
- D2 "Send as a look-up" sends the whole text as the look-up immediately and **keeps** the answer box text for the
  person to trim.
- D4 Q1: the guard is on for both provenances. The text sent is one answer plus the banked question, never the
  package.
- D5 The speculative `aside` stays. Its false-prompt rate is reported; its recall is unmeasured (no labelled
  asides).

Assumptions (flag if wrong):

- A1 The key will be available before the PR. Without it, Phases 4–5 cannot finish, and the PR must not open with
  a stubbed fixture.
- A2 `jev-1.13.0` is still served. If the API answers with another model, `askJev` throws and the eval aborts. That
  is a stop for the owner, not a reason to repin silently.
- A3 The client's 2.5 s cap and the server's 1.5 s cap are acceptable. The ticket fixes 1.5 s for Jev; the 2.5 s is
  this plan's.

## NOTES (open canvas)

### D3 — the pre-registered threshold rule (fixed before the eval runs)

Written now so T is chosen by a rule with a reason, never tuned until a wanted answer comes out (CLAUDE.md's
import-core convention, applied here).

- Grid: T ∈ {0.10, 0.15, …, 0.90}.
- **T_LOOK_UP** = the **highest** grid T at which look_up recall equals the maximum recall seen anywhere on the
  grid, **provided** the look_up false-prompt rate at that T is ≤ 2% (≤ 3 of 160).
  - If that fails, T_LOOK_UP = the highest grid T with recall ≥ 3/4 and false-prompt ≤ 2%.
  - If none exists, stop (exit 1, write nothing) and hand it to the owner.
- **T_ASIDE** = the **lowest** grid T at which the combined prompt rate (`decide ≠ 'answer'`) on negatives is
  ≤ 3% (≤ 4 of 160), given T_LOOK_UP. **If no grid T meets that, T_ASIDE = `null` (aside disabled) and the
  guard ships look-up only**; the eval prints that, and the report names it. Lowest, because its recall cannot be measured, so we take as much as the
  false-prompt budget allows.
- Why 2% and 3%: a session is about 30 answers. 3% ≈ 0.9 unnecessary prompts per session, and each costs one
  click. A miss costs what run 1 cost: a failed AC and an unsourced evidence record. The ceiling is set by the
  cheap side.
- Why "highest T at max recall": at equal recall, a higher T can only lower false prompts.
- With 4 positives, recall moves in 25% steps, so the number is coarse. The report must say so, and the header
  must state n.

### Pre-flight (run this session against `origin/main` @ `ce74378`, detached worktree)

- `gh issue view 454`, and #453's state: **OPEN**, so `portal/lib/jev.mjs` does not exist. This ticket adds it
  (observed: `git ls-tree origin/main portal/lib/` has no `jev.mjs`; `git grep -i typesafe` over code on main
  finds nothing).
- `portal/.env` keys: `FIGMA_TOKEN` and `FIGMA_FILE_KEY` only. **No `TYPESAFE_API_KEY`**, so the table marks it
  blocking.
- Banked-line census: 257 lines (30+12+12+24+65+65+12+34+3), matching the ticket's "257". **164 unique**, and
  `graded-opus-a` ≡ `graded-think-a` (65/65 identical). This changed the plan: the negatives are deduplicated
  (160), and the ticket's "257" would double-count and include the 4 positives.
- Positive scan (regex over all banked lines): exactly faster-payment a3, a5, a10 and a23 begin `Look it up`. The
  other hits (allergen a26, graded a2, later-not-never a22) are ordinary answers. All four positives are
  **mixed** look-up + answer, which changed the `look_up` criteria (the "even if an answer is also present"
  clause) and produced owner decision D2.
- `discovery-transport.mjs:186-187`: an off-script turn with an affordance gets `[...FETCH_TOOLS]`, so AC #3's
  "search runs" is reachable with the drawer change alone. The risk was checked and cleared.
- `faster-payment/run.json` has `endedAt` set, so AC #3 needs a throwaway session. That added the paid row.
- `questionById` resolves every committed banked `question_id` (0 missing, observed), so the eval's state
  building cannot hit a null question.
- `node tooling/build-checks.mjs` on main: first run **1 failure** (41.7: `tooling/icons/node_modules` missing in
  a fresh worktree). After `cd tooling/icons && npm ci`: **`build ✓  all 43 groups pass`** (observed).
  `node tooling/drift-check.mjs`: failed on style-dictionary deps until `npm ci` in `tooling/style-dictionary`
  and `portal`, then **✓ … group-count** (observed). **GOTCHA for the implementer in a fresh worktree: `npm ci` in
  `portal/`, `tooling/icons/` and `tooling/style-dictionary/` first** (memory `local-agent-visual-gate-notes`).
- Portal smoke on a free port: `/api/health` → `{"ok":true,…}`; `POST /api/discovery/check-answer` →
  `{"error":"not found"}` (observed: the route is absent today).
- Group-count claims: `tooling/drift-check.mjs:189-194` names four. On main, CLAUDE.md says 43 in both places.
  The session's loaded CLAUDE.md said 41 because the working tree is on the older #449 branch; main is 43.
- `loc-summary`: only `system/`, root/proto HTML and `agent-layer/` are counted, and `total` sums only those, so
  no regen and no approach-baseline cascade.
- TypeSafe docs (research agent, primary-source pages cited above): endpoint, bearer auth, request and response
  shapes, Noul `criteria` `{true,false}`, and the `jev-1.13.0` id format confirmed. Latency and pricing appear
  **only** in third-party posts, so they are labelled unverified here. `migrating-to-v1.md` is a 404.

### Rejected alternatives

- **Separate Jev calls per question**: rejected. Fan-out in one request is the documented pattern and costs no
  latency.
- **Jev in the browser**: rejected. The key must stay server-side (CLAUDE.md §Secrets).
- **Hand-labelled "golden" Jev outputs in build-checks**: rejected. That would be a hand-written agent response
  under the honesty contract. Only failures are injected.
- **Set-equality of the eval's negatives with today's banked lines**: rejected. Any new discovery package would
  red group 44 on an unrelated ticket. "Present and unchanged" binds the file to the tree without that coupling.
- **Splitting mixed text with Jev extraction**: out of scope (D2). The person trims.

## AMENDMENTS

- 2026-09-27 — advisor pass before hand-off: task refs fixed (thresholds set in Task 8), D3 gained an aside stop
  branch (`null` = disabled), Task 11 orders the eval and gates after the probe directory is deleted.

- 2026-09-27 — implementation pre-flight (plan errors):
  - 44.5 bullets 2–4 called the real `askJev` with a fake `fetchImpl` but no `key`. With no key in CI (or locally
    without `.env`) the missing-key throw fires before the fake is reached, so "throws naming 429" would pass or fail
    by machine. Fixed: every 44.5 call except the missing-key case passes `key: 'k'`, and each asserts the fake was
    called exactly once.
  - 44.4 "`decide({})` throws naming `look_up`": while the thresholds are `null`, `decide` refuses the threshold
    first. The case now passes an explicit valid threshold (`{ lookUp: 0.5, aside: null }`) so it reaches the
    missing-noul refusal. No noul value is constructed.
  - The worktree has its own gitignored `portal/.env`. The key belongs in `wt-454/portal/.env`, and AC #4's "remove
    the line" means that file.
- 2026-09-27 — **D3 amended by the owner (O1)** after the first eval: the sets separated (highest negative look_up
  0.31, lowest positive 0.95), and the original first branch took the grid's top, T = 0.90, a 0.05 margin under four
  look-ups that all open "Look it up:". New first branch: when the sets separate, T_LOOK_UP = the grid T nearest the
  gap's midpoint (ties to the lower T), provided it keeps max recall and false-prompt ≤ 2%. Otherwise the original
  rule applies unchanged. T_ASIDE's rule is unchanged. `eval-run.json` was regenerated by re-running, never edited.
