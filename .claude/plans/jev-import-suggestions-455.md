# Feature: Jev suggestions for design-import nodes the matcher cannot name (#455)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before
you start implementing. Pay special attention to naming of existing utils, types and models. Import from the
right files.

**Worktree:** `/Users/Berzins/Desktop/Linards_current/wt-plan-455`, a detached checkout of `origin/main` at
`f4f5229` made during planning. Create the branch there: `git -C ../wt-plan-455 switch -c feat/jev-import-suggest-455`.
Every path below is relative to that worktree. The primary tree (`ux-factory`, branch
`fix/importer-reads-icon-name-449`) is behind main: never implement there. The worktree is fresh, so run
`cd tooling/icons && npm ci` once (build-checks 41.7 reds without it, see VALIDATION) and `cd portal && npm ci`
before the canvas journey. This plan and its `.html` brief were written in the primary tree's `.claude/plans/`;
copy both into the worktree so they ship in the PR. Before the first commit, `git fetch && git log --oneline
HEAD..origin/main -- import portal/lib tooling/build-checks.mjs portal/public/canvas-import.mjs portal/server.mjs`
must print nothing; if it prints anything, rebase first and re-run the Level 2 baseline (memory
`review-validated-premerge-tree`).

## Owner decisions (answered 2026-09-27, before the plan was final)

- **Q1: both provenances.** A real import's unnamed parts' layer names, component and icon names, text content,
  child names and layout direction go to TypeSafe, as fictional ones do (mirrors #454's Q1). Never ids, positions,
  colours, sizes, drops or the source file. `SUGGEST_PROVENANCES = ["fictional", "real"]`.
- **Q2: instance + master, 8 nodes.** The one committed Jev run covers both of spike C's reads:
  `spike-c-instance.blueprint.txt` (2 unnamed) and `spike-c-master.blueprint.txt` (6 unnamed). The owner labels 8.

## Feature Description

When the design importer's rule-based matcher (`import/recognise.mjs`) cannot name a node, it says so: the
verdict's `via` is `floor` ("not covered") or `structural-fallback` (a laid-out box it calls `stack`). The person
ratifying the import then reads all 26 vocabulary entries by hand to decide what the node is. This ticket asks
Jev (TypeSafe's System One classifier, reached through the existing `portal/lib/jev.mjs`) one Choice question per
unnamed node ("which component is this a drawing of?") and records the top 3 ranked components with their
probabilities **beside** the verdict, in a new `suggestions` field of the import record. The matcher still
decides; Jev narrows the list; the owner ratifies. Picking a suggestion in the mapping editor is an ordinary
owner mapping edit.

## User Story

As the owner, ratifying a design import on the canvas page
I want the parts the matcher could not name to show three ranked candidates with their probabilities
So that I pick from three instead of scanning 26, and a `none` top pick tells me the part is likely a new component

## Problem Statement

On spike C's committed instance read, 2 of 8 nodes are unnamed (observed, see NOTES pre-flight): the avatar disc
(`ir.children[0].children[0]`, a `shape`, `via: floor`) and the text block (`ir.children[0].children[1]`, a
`frame`, `via: structural-fallback`). The master read has 6 more. The matcher is word- and structure-based by design
(R1–R4 in `import/recognise.mjs:21-104`), so a part whose name carries no vocabulary word stays unnamed. The ratify
step has no ranked list to start from.

## Solution Statement

A new portal module, `portal/lib/import-suggest.mjs`, outside `import/` so `import/` keeps its pure import graph
(build-checks 40.7). It:

1. picks the unnamed nodes **in code** (`via` of `floor` or `structural-fallback`; a scored verdict is never sent);
2. builds a small, filtered, text-only state per node from the IR;
3. asks one Choice question per node, **one node per request**, at most 4 requests in flight, with the 26
   vocabulary slugs (their `usage` text as criteria) plus `none`;
4. parses each answer into `{ path, top: [{slug, p}] ×3, confidence, model, ts }`;
5. **fails open**: any failure (no key, a timeout, a 4xx/5xx, a model mismatch, a malformed answer) gives
   `suggestions: []` and a transcript line saying why. The import itself never fails because of Jev.

`runImport` (`portal/lib/import-run.mjs`) takes an injectable `suggester` (default: none, so existing callers and
build-checks group 43 never reach the network); the two import routes in `portal/server.mjs` pass the real one.
`import/report.mjs` gains an optional `suggestions` field (validated by `checkRecord`, projected under
"Machine suggestions (Jev, unratified)"). `editMapping` carries the prior suggestions forward unchanged. The
canvas page's mapping editor shows the top 3 beside each unnamed row, with a "Use" button for the slugs that have
a builder.

A tooling CLI, `tooling/import-suggest.mjs`, makes the one real run over both spike C reads and commits the verbatim
requests and responses, which build-checks group 46 replays. The owner labels what each of the 8 nodes really is;
agreement is reported as observed. No confidence threshold is set (ticket A4).

## Out of Scope / Non-Goals

- Not changing any weight, threshold or verdict in `import/recognise.mjs`, and not putting `stack` back in scoring
  (R1–R4 stand). `import/regen-expected.mjs` is not run; the committed verdict does not move.
- No confidence threshold (ticket A4). The view shows raw probabilities; "likely a new component" fires when
  `none` is the top pick, whatever its probability.
- No new builders. Only 6 of 26 slugs have a `BUILDERS` entry (`stack text list-row status-chip icon list`,
  observed); a suggestion for any other slug is shown as information, with no Use button, because
  `applyMapping` refuses a non-builder name (`portal/lib/import-run.mjs:250`). Builders arrive with #313 and later.
- `none` is never wired to "drop". It is a finding for the owner to read, not an action.
- No Jev call on a mapping edit; no call in CI; no call on the canvas journey; no call on a shipped page; no retries
  in the portal (`portal/lib/jev.mjs:13-14` policy).
- Not touching `tooling/regen-import-records.mjs` or the two committed fixture records: they carry no
  `suggestions` key and must stay byte-identical (build-checks 42.6).
- Not writing the owner's labels. The session writes the template; the owner fills it.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `portal/lib/` (new module + import-run), `import/report.mjs` (schema), `portal/server.mjs`
(two routes), `portal/public/canvas-import.mjs` (view), `tooling/build-checks.mjs` (group 46), `tooling/canvas-journey.mjs`
**Dependencies**: TypeSafe HTTP API (`POST https://api.typesafe.ai/v1/systemone`, model pinned `jev-1.13.0`); a
`TYPESAFE_API_KEY` in the operator's environment (observed: set in the shell, absent from `portal/.env`)

## Related Work

**Implements**: #455 (`Closes #455`) · **Epic**: #295, `docs/epics/canvas-design-import.architecture.md`

**Back-references**:

- `.claude/plans/import-record-snap-rules-307.md`: the record schema and `checkRecord`'s derived-vs-stored rule
- `.claude/plans/import-run-recorded-import-311.md`: `runImport`, `editMapping`, the view and the editor. #311 is
  still OPEN, but PR #462 (PR A) landed the view, the mapping editor and the routes this ticket needs; the
  dependency is met for this ticket
- `.claude/plans/jev-answer-box-guard-454.md`: `portal/lib/jev.mjs`, the fail-open pattern, the provenance decision
- `.claude/plans/jev-contradiction-screen-453.md`: Choice questions with structured instructions, the request-size
  history, the committed-run + owner-labels pattern

**Forward-references**:

- the owner-labels ticket opened in Task 13 (precedent #468)

---

## CONTEXT REFERENCES

### Relevant Codebase Files: READ THESE BEFORE IMPLEMENTING

- `portal/lib/jev.mjs` (whole file, 42 lines): `askJev({state, questions}, {key, model, timeoutMs = 1500, fetchImpl})`,
  `JEV_MODEL = 'jev-1.13.0'`, refuses an answer from any other model, no retries. **Reuse; do not fork** (its line 19).
- `portal/lib/discovery-guard.mjs:1-47, 104-122`: the fail-open shape (`try { ask } catch { return {…, failOpen: e.message} }`),
  `ask = askJev` injection, and the header discipline (invariants stated, numbers with provenance).
- `portal/lib/discovery-screen.mjs:80-94, 136-148`: Choice questions with **structured instructions**
  (`instructions: { question, a, b }`) and the request-size history: a request estimated at 55,580 tokens was refused
  `400 max_tokens_exceeded`; the largest accepted observed request is **38,875 tokens** (line 88); option-heavy
  JSON runs at **1.70 chars/token**. Do not import its `batches()`: this ticket sends one node per request (D3).
- `portal/lib/import-run.mjs:280-300` (`runPipeline`, `recordFor`), `:407-448` (`editMapping`, re-derives the whole
  record, so it must carry suggestions forward), `:456-510` (`runImport`, under `withRunLock`, record written before
  the op), `:517-554` (`importView`, returns the whole record to the page), `:263-268` (`loadInputs`).
- `portal/lib/discovery.mjs:93-98` (`resolveRunRoot`: `fictional` → `<repo>/discovery/<slug>`, `real` →
  `<JOBS_DIR>/_discovery/<slug>`).
- `import/report.mjs:57` (`REQUIRED_KEYS`, **do not add `suggestions`**), `:122-134` (`buildRecord`), `:136-172`
  (`checkRecord`), `:224-314` (`projectRecord`, D9 markdown subset: no `#` headings, no nested lists, no `%`, no
  dates or clocks, every table cell through `cell()`).
- `import/recognise.mjs:21-35` (R1, R2), `:412-429` (the verdict shape
  `{ path, kind, name, score, via, covered, hits, candidates, drops, children }`).
- `import/ir.mjs`: `walk(ir, (node, path) => …)`; paths are `ir.children[0].children[1]` and match verdict paths.
- `portal/public/canvas-import.mjs:120-196`: `edit(name, e)`, `editorRows(view)`, `renderView(view)`, the `el()`
  helper; invariant 3 (line 13): every string from a package or a read is `textContent`.
- `portal/server.mjs:37` (import line), `:462-469` (`/api/canvas/import`, reads `b.provenance` from a JSON body),
  `:470-482` (`/api/canvas/import/drop`, a local `provenance` from the query string).
- `tooling/regen-import-records.mjs:32` imports `buildRecord` directly and passes no `suggestions`, so
  `buildRecord` must add the key **only when it is passed**.
- `tooling/build-checks.mjs:13962-13990` (group 44's header: injected `ask`/`fetchImpl` may only fail or replay a
  committed response verbatim), `:13991-14015` (44.1's import-graph check), `:13700-13730` (group 43's helpers:
  `deep`, `threw`, `athrew`, `fold`, `afold`, `scratch`, `pkgCopy`, `ledger`, `gitSnap`; block-scoped, so copy what
  you need), `:13832-13840` (43.5's runImport-through-a-reader pattern), `:14650-14651` (the last group, `jev
  screen`, and its closing brace: group 46 goes after it), `:14657` (`"build ✓  all 45 groups pass"`: becomes 46).
- `tooling/jev-screen.mjs:1-46` (CLI header: FREE/PAID modes, refused unknown flags, GENERATED run files, labels
  template that refuses to overwrite once `by` is set), `:73-89` (retry on 429/529 only).
- `tooling/canvas-journey.mjs:111-113, 632-634` (the two portal spawns with `...process.env`), `:148, 162-165` (the
  scratch `_discovery/fp-import` package copy: `run.json`, `answers.jsonl`, `transcript.jsonl`, `build/` from
  `discovery/faster-payment`), `:553-600` (`importPass`, I2 and I3's `keysOf` compare).
- `.claude/references/gates.md:11` (header "45 pure groups"), `:80-82` (groups 44 and 45 entries to mirror).

### New Files to Create

- `portal/lib/import-suggest.mjs`: the trigger, the state filter, the question builder, the parser, `suggest()`
- `tooling/import-suggest.mjs`: the operator CLI (dry run, smoke, the one committed run, labels template, report)
- `tooling/import-suggest/spike-c-run.json`: GENERATED by the CLI from real calls; never hand-written
- `tooling/import-suggest/labels.json`: the owner's labels template, written by the CLI with `by: null`

### Relevant Documentation

- [TypeSafe API reference](https://docs.typesafe.ai/api.md): Choice question (`type: "choice"`, `instructions`
  string | object | array, `criteria` map option → description, max 255 options); Choice answer
  `{ type, choice, probabilities (sum 1), confidence }`; errors 401/422/429/529.
- [Choice primitive](https://docs.typesafe.ai/primitives/choice.md): questions in one request are evaluated in
  parallel; option names and descriptions are both sent to the model.
- [How to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md): put
  code-sourced data in a structured `instructions` object and refer to it in backticks (the `potential_duplicate`
  example). This is why each node's data rides in its own question's `instructions`, not in the shared `state`.

### Patterns to Follow

**Structured instructions** (`portal/lib/discovery-screen.mjs:147`):
```js
[`relation_${a.id}_${b.id}`]: Object.freeze({ type: 'choice', instructions: Object.freeze({ question: relation.question, a: a.text, b: b.text }), criteria: relation.criteria }),
```

**Fail open with the reason kept** (`portal/lib/discovery-guard.mjs:116-121`):
```js
try {
  const r = await ask({ state: stateFor({ question: q.text, answer: text }), questions: QUESTIONS });
  return { verdict: decide(r.answers), …, failOpen: null };
} catch (e) {
  return { verdict: 'answer', …, failOpen: e.message };
}
```

**Errors**: plain `Error`, message names the path (`import-suggest: answers.n1.probabilities.avatr is not an option sent`).

**Group layout**: a block `{ … }` with local helpers, numbered `// --- 46.N …` sections, `ok(cond, "46.N: …")`,
then one `group("import suggest", "<what it proves> … What it cannot reach: …")`. Mirror group 44's header.

---

## RISK REGISTER (each closed by a design choice or a check)

| # | Risk | Closed by |
|---|---|---|
| R1 | A request over Jev's size limit is refused | One node per request (≈ 17k tokens expected) against the largest request observed accepted, 38,875 (D3). The smoke asserts the observed size is under it; 46.5 asserts every committed request's `usage.input_tokens` is too |
| R2 | Many unnamed nodes → 429s → an empty list on big imports | At most `MAX_IN_FLIGHT = 4` requests at once, in waves (D3); 46.7 counts the calls |
| R3 | The shell's `TYPESAFE_API_KEY` makes a local check or the journey spend real calls | `runImport`'s default suggester is none (D2); every group-46 case injects `ask`/`key`/`fetchImpl`; the journey sets `UXF_IMPORT_SUGGEST=off` (Task 5, pinned by 46.12) |
| R4 | `editMapping` rebuilds the record and silently drops suggestions | Task 3 carries them; 46.10 with its REDDENS |
| R5 | The committed fixture records or their `.md` move | `buildRecord` adds the key only when passed; `suggestions` stays out of `REQUIRED_KEYS`; 42.6 unchanged, 46.9 asserts the committed md has no suggestions section |
| R6 | A later new spec reds this group on an unrelated PR | 46.5 compares the node state sent, never the criteria; `parseAnswer` accepts a missing option; replay matches by question id |
| R7 | The Use button offers a slug `editMapping` refuses | Use only for `view.builders` slugs (D5); the Task 10 walk clicks a builder slug |
| R8 | A timing value makes the byte-identity check flaky | 46.8 compares the record's fields minus `elapsed` (the 43.5 precedent) plus the four proposal files byte for byte |
| R9 | The Task 10 walk writes into the committed repo | `provenance=real` against a scratch `JOBS_DIR` copy (Q1 answered "both"), exactly the canvas journey's layout |
| R10 | A bad or unlucky paid run tempts a re-run for a better answer | The CLI refuses to overwrite an existing run file; any failure writes nothing; one completed run is the result |
| R11 | The owner's labels are not in the PR | Not an implementation risk: AC #2 is split into what the PR reports (the top 3, observed) and what the owner adds; Task 13 opens the follow-up ticket; 46.11 validates the file in either state |
| R12 | The branch falls behind `main` mid-work (a sibling session merges) | The fetch/log guard in the Worktree note, repeated in Task 13 before the PR |

---

## IMPLEMENTATION PLAN

### Phase 1: The suggestion module (pure over an injected `ask`)
Task 1. `portal/lib/import-suggest.mjs`.

### Phase 2: The record schema
**Independent of:** Phase 1. Task 2. `import/report.mjs`.

### Phase 3: Wiring
**Depends on:** Phases 1 and 2. Tasks 3–5: `runImport`/`recordFor`/`editMapping`, the routes, the journey seam.

### Phase 4: The real call
**Depends on:** Phase 1. Tasks 6–8: the CLI, the smoke, the one committed run and the labels template.

### Phase 5: The view
**Depends on:** Phase 3. Tasks 9–10.

### Phase 6: The gate, the docs, the handoff
**Depends on:** Phases 1–5 (46.5 and 46.8 replay the committed run). Tasks 11–13.

---

## STEP-BY-STEP TASKS

### Task 1. CREATE `portal/lib/import-suggest.mjs`

- **IMPLEMENT**:
  - Header (mirror `discovery-guard.mjs`'s shape): cites epic #295 ticket #455; the rule "THE MATCHER DECIDES, JEV
    NARROWS, THE OWNER RATIFIES"; invariants, each named as asserted by build-checks group 46:
    1. NEVER A VERDICT. Nothing here writes `mapping`, `recognition` or a verdict; the output is a separate field.
    2. THE TRIGGER IS CODE: only `via` in `SUGGEST_VIA`; a scored verdict is never sent.
    3. TEXT ONLY, FILTERED STATE (Jev degrades on large state full of irrelevant detail: ticket Design 2).
    4. FAILS OPEN: any failure returns `suggestions: []` with the reason; `suggest()` never throws.
    5. NO THRESHOLD (A4): 8 labelled nodes cannot support one; #454's 164-item eval is the precedent to follow later.
    6. SDK- AND ZOD-FREE: imports `./jev.mjs` and `../../import/ir.mjs` only.
    7. ONE NODE PER REQUEST, AT MOST FOUR IN FLIGHT (NOTES D3), with the smoke's observed size written beside it.
    8. ON FOR BOTH PROVENANCES (owner, 2026-09-27, Q1), and exactly what leaves the machine: layer names,
       component and icon names, text content, child names and kinds, layout direction of each unnamed node.
       Never ids, positions, colours, sizes, drops or the source file.
  - Exports (14):
    ```js
    export const SUGGEST_VIA = Object.freeze(["floor", "structural-fallback"]);
    export const SUGGEST_PROVENANCES = Object.freeze(["fictional", "real"]);   // Q1, owner 2026-09-27
    export const NONE = "none";
    export const TEMPLATE = Object.freeze({
      question: "Which component of this design system is `node` a drawing of?",
      none: "a part this vocabulary does not have",
      stateKeys: Object.freeze(["kind", "layer", "component", "icon", "texts", "children", "dir"]),
    });
    export const SUGGEST_TIMEOUT_MS = 15000;   // per request; ~0.5–1.5 s expected (#453: 490 ms per 12k tokens)
    export const MAX_IN_FLIGHT = 4;            // requests at once; worst case 15 nodes = 4 waves ≤ 60 s under the lock
    export const MAX_TEXTS = 5, MAX_TEXT_CHARS = 80;
    export function unnamedPaths(verdict)              // pre-order paths with v.kind && SUGGEST_VIA.includes(v.via)
    export function nodeState(node)                    // → only TEMPLATE.stateKeys, empty fields omitted
    export function criteriaFrom(vocab)                // → { ...slug: usage (verbatim, null if absent), none: TEMPLATE.none }
    export function questionsFor(ir, verdict, vocab)   // → { questions: { n0: {...}, n1: {...} }, paths: { n0: path, … } }
    export function parseAnswer(answer, options)       // → { top: [{slug, p}] ×3, confidence }
    export async function suggest({ ir, verdict, vocab }, { ask = askJev, now = () => new Date().toISOString(), inFlight = MAX_IN_FLIGHT } = {})
    //   → { suggestions: [...], ran: boolean, reason: string|null, requests: n, usage: {input_tokens, output_tokens}|null }
    ```
    (`MAX_TEXTS` and `MAX_TEXT_CHARS` are two exports: 14 in all.)
  - `nodeState(n)`: `kind: n.kind`, `layer: n.name`, `component: n.component?.name`, `icon: n.icon?.name`, `texts`:
    `n.text?.content` then every descendant text's content in `walk` order, each cut to `MAX_TEXT_CHARS`, at most
    `MAX_TEXTS`; `children`: one line, direct children as `"<kind> <name>"` joined by `", "`; `dir: n.layout?.dir`.
    Omit a key whose value is null, undefined, `""` or `[]`.
  - `questionsFor`: ids `n0, n1, …` in `unnamedPaths` order; each
    `{ type: "choice", instructions: { question: TEMPLATE.question, node: nodeState(node) }, criteria }`, one
    shared `criteria` object built once. Look nodes up by walking the IR into a `Map(path → node)`.
  - `criteriaFrom`: throws if the vocabulary has a slug named `none` or has zero components. `stack` is included
    (ticket Design 3: a ranking for a human, not a verdict).
  - `parseAnswer(answer, options)`: throws, naming the field, when `answer?.type !== "choice"`, `probabilities` is
    not an object, a key is not in `options`, a value is not a finite number in [0, 1], or `confidence` is not a
    finite number in [0, 1]. `top` = the 3 highest probabilities, ties broken by the order of `options`; `p`
    rounded to 4 dp. A missing option is allowed (read as absent), so a later vocabulary addition does not red a
    committed run.
  - `suggest()`: `const { questions, paths } = questionsFor(...)`; zero questions → `{ suggestions: [], ran: false,
    reason: "no unnamed node", requests: 0, usage: null }` **with no call**. Otherwise refuse (fail open, reason
    names it) when `inFlight` is not a positive integer. One request per id, sent in waves of `inFlight`:
    `for (let i = 0; i < ids.length; i += inFlight) results.push(...await Promise.all(ids.slice(i, i + inFlight).map((id) => ask({ state: { task: "design import" }, questions: { [id]: questions[id] } }, { timeoutMs: SUGGEST_TIMEOUT_MS }))))`.
    Parse each answer `body.answers[id]` against `Object.keys(criteria)`. Any throw anywhere → `{ suggestions: [],
    ran: false, reason: e.message, requests: <calls made>, usage: null }` (all or nothing; a failed wave stops the
    next). On success each suggestion is `{ path: paths[id], top, confidence, model: body.model, ts: now() }`;
    `usage` summed over the responses; `requests = ids.length`.
- **PATTERN**: `portal/lib/discovery-guard.mjs:104-122` (inject `ask`, fail open); `discovery-screen.mjs:147` (structured instructions).
- **IMPORTS**: `import { askJev } from "./jev.mjs"; import { walk } from "../../import/ir.mjs";` Nothing else.
- **GOTCHA**: `askJev` reads `process.env.TYPESAFE_API_KEY` by default, and this shell exports one (memory
  `env-empty-var-does-not-blank-key`). Anything you run while testing that reaches `askJev` without an explicit
  `key: ""` or an injected `ask` **spends a real call**. Pass `timeoutMs` explicitly: the 1500 ms default is sized
  for the answer box, not a 17k-token question.
- **GOTCHA**: `state` is required by the API and shared by every question in a request; it stays a constant stub,
  and the node's data is in its own question's `instructions` (docs, "How to build").
- **VALIDATE**: `node -e 'import("./portal/lib/import-suggest.mjs").then(m => console.log(Object.keys(m).length, Object.keys(m).sort().join(" ")))'` (expected: `14` and the names above)
- **SATISFIES**: AC #1 (the trigger, the separate field), AC #2 (the call)
- **REGENERATES**: none

### Task 2. UPDATE `import/report.mjs`: the optional `suggestions` field

- **IMPLEMENT**:
  - Header: one paragraph "MACHINE SUGGESTIONS (#455)": optional, never in `REQUIRED_KEYS`; absent on a record made
    before #455 and on the committed fixtures; never derived (a stored observation, like `fidelity.deltaEMin`);
    `checkRecord` checks its shape and that no suggestion sits on a scored node.
  - `buildRecord({ …, suggestions })`: spread `...(suggestions !== undefined ? { suggestions } : {})` into the record.
  - `checkRecord`: when `Object.hasOwn(r, "suggestions")`: an array; unique `path`s; each path is a verdict node
    (walk `r.recognition.verdict`) with a `kind` and `via !== "scored"`; `top` is an array of 1–3 `{slug: non-empty
    string, p: finite in [0,1]}` in non-increasing `p`; `confidence` finite in [0,1]; `model` and `ts` non-empty
    strings. Messages name the index: `record.suggestions[1].path: "ir.children[0].children[2]" is a scored node —
    a suggestion sits beside a verdict the matcher could not reach, never beside one it made`.
  - `projectRecord`: after the **Structure** table, only when `Object.hasOwn(r, "suggestions")`:
    `para("**Machine suggestions (Jev, unratified)**")`; empty → `para("None on this record: the import transcript's \`suggest\` line says why (no key, a failure, or no unnamed node).")`;
    else one bullet per suggestion: `` `path` (name) — `slug` 0.6200, `slug` 0.2100, `slug` 0.0800 — confidence 0.5500 · model `jev-1.13.0` ``
    (name from the IR-walk `names` map the Structure table already builds; numbers via `toFixed(4)`), plus
    `` — top pick is `none`: likely a new component `` when `top[0].slug === "none"`. Never print `ts`, never a `%`.
- **PATTERN**: `import/report.mjs:136-172` (`checkRecord`'s message style), `:258-269` (`names` map + Structure).
- **IMPORTS**: none new (`walk` is already imported).
- **GOTCHA**: build-checks 42.6 regenerates both committed records byte for byte through `buildRecord` and renders
  their `.md`; with no `suggestions` passed, both must be unchanged. **Do not** add `suggestions` to
  `REQUIRED_KEYS`: a legacy record would then fail `checkRecord`.
- **GOTCHA**: a remapped unnamed node's `via` becomes `"mapping"` (`applyMapping`, `import-run.mjs:252`), which is why
  the rule is `via !== "scored"` rather than `SUGGEST_VIA.includes(via)`. `import/` may not import from `portal/`,
  so the lists cannot be shared; 46.2 checks they agree.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "import-record|import run"` (expected: both ✓)
- **REDDENS**: see 46.9.
- **SATISFIES**: AC #1 (the separate field), AC #3 (the projection)
- **REGENERATES**: none (the committed records carry no key; 42.6 proves byte-identity)

### Task 3. UPDATE `portal/lib/import-run.mjs`: `recordFor`, `runImport`, `editMapping`

- **IMPLEMENT**:
  - `recordFor({ …, suggestions })` → pass `suggestions` through to `buildRecord` (undefined stays undefined).
  - `runImport({ …, suggester = null })`: after `runPipeline` and the `elapsedMs` line (the Jev call must not count
    as recognition time):
    ```js
    const sug = suggester
      ? await suggester({ ir: pipe.ir, verdict: pipe.verdict, vocab: inp.vocab })
      : { suggestions: [], ran: false, reason: "suggestions are off on this call", requests: 0, usage: null };
    transcript.push({ type: "suggest", ts: new Date().toISOString(), ran: sug.ran, reason: sug.reason,
      nodes: sug.suggestions.length, requests: sug.requests, usage: sug.usage });
    ```
    and `recordFor({ …, suggestions: sug.suggestions })`. `suggestions` is therefore always present (possibly `[]`)
    on a record `runImport` writes, so the canvas journey's I3 `keysOf` compare of i1 and i2 still holds.
  - `editMapping`: `recordFor({ …, suggestions: prior.suggestions })`. No suggester call on an edit.
  - Header: one short paragraph "SUGGESTIONS (#455)": `suggester` is injected by the routes; the default is none so
    group 43 never reaches the network; an edit carries the prior list forward unchanged.
- **PATTERN**: `reader = readBrilliant` injection at `import-run.mjs:456`.
- **IMPORTS**: none in this file (the routes import `suggest`).
- **GOTCHA**: the `suggester` runs inside `withRunLock`; that is intended and bounded (≤ 4 waves × 15 s for a
  15-node import). The record and transcript are still written before any response (invariant 3).
- **GOTCHA**: `transcript` is `r.transcript ?? []` on the reader path and a fresh array on the drop path; push onto
  the same array `writeImport` receives.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "import run"` (expected: ✓, group 43 unchanged)
- **SATISFIES**: AC #1, AC #3 (carry-forward)
- **REGENERATES**: none

### Task 4. UPDATE `portal/server.mjs`: the two import routes pass the real suggester

- **IMPLEMENT**: `import { suggest as suggestImport, SUGGEST_PROVENANCES } from './lib/import-suggest.mjs';` and a
  helper beside the routes:
  `const suggesterFor = (prov) => (process.env.UXF_IMPORT_SUGGEST !== 'off' && SUGGEST_PROVENANCES.includes(prov) ? suggestImport : null);`
  then `suggester: suggesterFor(b.provenance)` in `/api/canvas/import` (JSON body) and
  `suggester: suggesterFor(provenance)` in `/api/canvas/import/drop` (query string).
- **PATTERN**: `UXF_BRILLIANT_MCP` / `UXF_IMPORT_TIMEOUT_MS`, the existing env seams for the journey.
- **GOTCHA**: `server.mjs` cannot be imported in CI (it reaches the SDK through `lib/chat.mjs`), so its wiring is
  pinned from source in 46.12, which looks for these exact two call forms.
- **VALIDATE**: `node --check portal/server.mjs`; the Task 10 walk
- **SATISFIES**: AC #3
- **REGENERATES**: none

### Task 5. UPDATE `tooling/canvas-journey.mjs`: suggestions off, and asserted off

- **IMPLEMENT**: add `UXF_IMPORT_SUGGEST: "off"` to both spawn envs (`:113`, `:634`). In I2 add
  `t("I2 · suggestions are off on the journey: the record carries suggestions [] and the transcript's suggest line says so", …)`
  reading `readRec("i1").suggestions` and the last `suggest` line of `i1.transcript.jsonl` (`ran === false`,
  reason `"suggestions are off on this call"`).
- **GOTCHA**: the spawns inherit `...process.env` and the shell exports `TYPESAFE_API_KEY`: without this seam the
  journey would spend a real call per drop and its records would differ run to run.
- **VALIDATE**: `node --check tooling/canvas-journey.mjs`; the Level 3 run
- **SATISFIES**: AC #4 (no regression)
- **REGENERATES**: none

### Task 6. CREATE `tooling/import-suggest.mjs` (the dry run and the smoke)

- **IMPLEMENT**: header mirroring `tooling/jev-screen.mjs:1-46`. `READS = ["import/fixtures/spike-c-instance.blueprint.txt", "import/fixtures/spike-c-master.blueprint.txt"]` (Q2). Modes:
  - `node tooling/import-suggest.mjs` FREE: each read through `runPipeline({ text, tool: "brilliant", ...loadInputs() })`;
    prints the unnamed paths, each node's state, the option count, `templateSha` (= sha256 of
    `JSON.stringify(TEMPLATE)`), the estimated tokens per question (`JSON.stringify(question).length / 1.7`), and the
    run file a paid run would write. No call.
  - `--smoke` PAID (≈ $0.0007): the instance read's FIRST unnamed node alone, one request, through `askJev` with the
    retry wrapper; prints `usage.input_tokens`, the latency and the top 3; **exits 1 if `input_tokens > 38875`**
    (R1). Writes nothing; never scored.
  - `--run`, `--labels-template`, `--report`: Task 8.
  - Unknown flags refused by name before any mode runs (`jev-screen.mjs:118-119`). Retry 429/529 only, 2 s / 4 s /
    8 s (`jev-screen.mjs:73-89`).
- **IMPORTS**: `askJev, JEV_MODEL` from `../portal/lib/jev.mjs`; the Task 1 exports; `loadInputs, runPipeline` from
  `../portal/lib/import-run.mjs` (SDK-free statically, proven by 43.1).
- **GOTCHA**: the FREE mode never calls `askJev`; every paid mode sits behind an explicit flag.
- **VALIDATE**: `node tooling/import-suggest.mjs` (expected: instance 2 unnamed, `ir.children[0].children[0]` and
  `ir.children[0].children[1]`; master 6, the paths in NOTES; 27 options; ≈ 17,000 estimated tokens per question)
- **SATISFIES**: AC #2
- **REGENERATES**: none

### Task 7. RUN the smoke (paid, ≈ $0.0007)

- **IMPLEMENT**: `node tooling/import-suggest.mjs --smoke`. It must exit 0. Write the observed `input_tokens`,
  latency and date into `import-suggest.mjs`'s header beside invariant 7 ("one node: N tokens observed against the
  38,875 largest-accepted; latency M ms"). Requests in a wave run in parallel, so the timeout only has to cover one
  request: if the observed latency is over `SUGGEST_TIMEOUT_MS / 5` (3 s), raise `SUGGEST_TIMEOUT_MS` to 5 × the
  latency and say so in the header.
- **GOTCHA**: expected ≈ 17,000 tokens (27,749 `usage` chars + JSON and state ≈ 29,000 chars ÷ 1.70). The smoke
  exiting 1 means one node is too large: stop and bring the observed number to the owner (the only remedy is
  trimming the criteria, which changes the ticket's Design 3). With a 2.3× margin this is not expected.
- **VALIDATE**: the smoke's exit code 0 and its printed `input_tokens`
- **SATISFIES**: AC #2
- **REGENERATES**: none

### Task 8. ADD `--run`, `--labels-template`, `--report`; RUN `--run` once (paid, ≈ $0.0057)

- **IMPLEMENT**:
  - `--run` PAID: for each of `READS`, calls **the same** `suggest()` with a retrying `ask` that records every
    request body and response body verbatim. Refuses if `tooling/import-suggest/spike-c-run.json` exists (R10).
    Checks `ran === true` for every read; on any failure writes nothing and exits 1 with the reason. Writes:
    ```json
    { "note": "GENERATED by tooling/import-suggest.mjs from real TypeSafe API responses — never edit; re-run instead. What it cannot show: whether the ranking is right (the owner's labels.json and --report) or the live API today.",
      "model": "jev-1.13.0", "templateSha": "…", "inFlight": 4, "at": "<ISO>",
      "reads": [ { "fixture": "import/fixtures/spike-c-instance.blueprint.txt", "fixtureSha256": "…",
                   "requests": [ { "id": "n0", "body": { "model", "state", "questions" }, "response": { "model", "answers", "usage" }, "ms": 0 } ],
                   "suggestions": [ …suggest()'s output… ] },
                 { "fixture": "import/fixtures/spike-c-master.blueprint.txt", … } ] }
    ```
  - `--labels-template` FREE: writes `tooling/import-suggest/labels.json` =
    `{ "by": null, "at": null, "nodes": [ { "fixture", "path", "layer", "kind", "label": null, "note": "" } ] }`,
    8 rows from the run file; `label` is the owner's slug or `"none"`. Refuses to overwrite a file whose `by` is set.
  - `--report` FREE: with `labels.by` set, prints per node: the owner's label, Jev's top 3 with p, `top-1` and
    `in top 3`; totals as `k/8`, `none` results named. With `by` unset, prints "the owner has not labelled" and exits 0.
  - Export the labels checker `checkLabels(labels, run, vocabSlugs)` (pure; throws naming the row) so 46.11 can drive
    it on a copy.
- **GOTCHA**: never hand-write or hand-edit the run file or the labels' `label`/`by`/`at` fields (honesty contract;
  memory `honesty-contract-mirror-direction`). The session writes the template only.
- **VALIDATE**: `node tooling/import-suggest.mjs --run` once → the file exists, `reads[0].suggestions.length === 2`,
  `reads[1].suggestions.length === 6`, 8 requests in all, every `usage.input_tokens ≤ 38875`; then
  `node tooling/import-suggest.mjs --labels-template` (8 rows) and `node tooling/import-suggest.mjs --report`
  (expected: "the owner has not labelled")
- **SATISFIES**: AC #1 (the committed responses), AC #2 (the observed top 3 per node)
- **REGENERATES**: `tooling/import-suggest/spike-c-run.json`, `tooling/import-suggest/labels.json` (committed)

### Task 9. UPDATE `portal/public/canvas-import.mjs`: suggestions in the editor

- **IMPLEMENT**:
  - In `editorRows(view)`, for a row whose path has a suggestion in `view.record.suggestions ?? []`: append
    `el("p", { class: "cv-import-hint", "data-import-suggest": row.path }, "Jev suggests (unratified): ", …)` with,
    per `top` item: a builder slug (`view.builders.includes(slug)`) → a
    `button.btn.btn-secondary.cv-btn[data-import-use="<path> <slug>"]` with text `Use ${slug} (${p.toFixed(2)})`
    calling `edit(view.name, { path: row.path, map: slug })`; any other slug → a `span` with text
    `${slug} ${p.toFixed(2)} — no builder yet`; `none` → a `span` `none ${p.toFixed(2)}`. When `top[0].slug === "none"`
    add `" — top pick is none: likely a new component"`.
  - In `renderView`, before the Mapping heading: one `p.cv-where[data-import-suggest-status]` saying
    `Machine suggestions (Jev, unratified): ${n} node(s)` or, for `[]` or a missing field,
    `Machine suggestions: none on this record (see the import transcript).`
- **PATTERN**: `canvas-import.mjs:130-160` (`editorRows`), the `el()` helper; `cv-import-hint` and
  `btn btn-secondary cv-btn` already exist (`portal.css:380` and the panel), so **no CSS change**.
- **GOTCHA**: every string from the record through `el({ text })` / text nodes (the file's invariant 3). The Use
  button calls the existing mapping route, so the edit is the owner's `mapping.json` edit; nothing records that a
  suggestion was involved (ticket Design 6).
- **VALIDATE**: `node --check portal/public/canvas-import.mjs`; the Task 10 walk
- **SATISFIES**: AC #3
- **REGENERATES**: none (the portal has no VR baseline)

### Task 10. RUN the portal walk with a key (paid, ≈ $0.0014)

- **IMPLEMENT**:
  1. `S=$(mktemp -d)`; copy `discovery/faster-payment/{run.json,answers.jsonl,transcript.jsonl}` and
     `discovery/faster-payment/build/` into `$S/_discovery/fp-walk/` (the canvas journey's layout, `:162-165`).
  2. `(cd portal && JOBS_DIR=$S PORT=<free port> node server.mjs) &`; `P=$!`; wait for `curl -s localhost:<port>/api/health`.
  3. Open `/canvas.html?provenance=real&slug=fp-walk` (Playwright or agent-browser), open Import, drop
     `import/fixtures/spike-c-instance.blueprint.txt`.
  4. Confirm: the status line reads `Machine suggestions (Jev, unratified): 2 node(s)`; both unnamed rows show three
     suggestions; save a copy of `$S/_discovery/fp-walk/build/imports/i1.json`'s `suggestions`.
  5. Click a `[data-import-use]` button whose slug is a builder (on the text block, expected `stack` or `list-row`;
     the avatar disc will plausibly rank `avatar`, which has no builder and no button). If neither row offers a
     builder slug, drive the same edit through the Mapping select (`[data-import-remap]`) and say so in the report:
     AC #3's route is the same.
  6. Confirm: `proposals/<name>/mapping.json` has `parts[<path>].map === <slug>`, `imports/i1.json`'s
     `suggestions` are byte-equal to step 4's copy, and the editor re-rendered.
  7. `kill $P` (only that PID; memory `portal-smoke-port-scoped-kill`); `git status` in the worktree shows no change
     under `discovery/`.
- **GOTCHA**: `provenance=real` resolves to `$JOBS_DIR/_discovery/<slug>` (`discovery.mjs:96`), so nothing lands
  in the repo (R9). The server reads `JOBS_DIR` at import time: set it on the command, not after.
- **VALIDATE**: the three reads in step 6, pasted into the report with the screenshot
- **SATISFIES**: AC #3
- **REGENERATES**: none

### Task 11. ADD build-checks group 46 `import suggest`

Insert after group 45's closing `}` (`tooling/build-checks.mjs:14651`) and change the summary line (`:14657`) to
`"build ✓  all 46 groups pass"`.

Header (mirror group 44's): what it binds; **the honesty rule**: every probability read here comes from
`tooling/import-suggest/spike-c-run.json`; an injected `ask`/`fetchImpl` may only fail or replay a committed
response verbatim; every case injects `ask`, `key` or `fetchImpl` (the operator's key is in `process.env` locally).
The checkRecord/projectRecord cases may build a SYNTHETIC record, labelled so in the message, because they test
the template, not Jev. **What it cannot reach**: the live API today, whether Jev's ranking is right (the owner's
labels and `--report` are the observation), the canvas page (no CI runner; the Task 10 walk), and the route wiring
beyond the source pin.

Shared setup: `const INSTANCE`, `const MASTER` = `runPipeline` over the two blueprints with `loadInputs()`;
`const RUN` = the parsed run file or null; `replayAsk(read)` = an `ask` that finds the committed request whose
`id` equals the single question key in `body.questions` and returns its `response` verbatim (throws naming the id
if absent), counting calls.

Sections (each `ok()` message starts `46.N:`):

- **46.1 import graph**: `await import("../portal/lib/import-suggest.mjs")` succeeds (CI has no `portal/node_modules`);
  the decommented source's import specifiers are exactly `["./jev.mjs", "../../import/ir.mjs"]`; no
  `claude-agent-sdk` or `zod`; `SUGGEST_PROVENANCES` deep-equals `["fictional", "real"]` (Q1).
  REDDENS: add `import "./import-run.mjs";` → "46.1: import-suggest.mjs imports [...] beyond …".
- **46.2 the trigger**: `unnamedPaths(INSTANCE.verdict)` is exactly `["ir.children[0].children[0]",
  "ir.children[0].children[1]"]`; `unnamedPaths(MASTER.verdict)` is the 6 paths in NOTES; no `SUGGEST_VIA` value is
  `"scored"` (the rule `report.mjs` enforces); a counting throwing `ask` over a SYNTHETIC copy of the instance verdict
  with every `via` set to `"scored"` gets **0** calls and `reason: "no unnamed node"`.
  REDDENS: add `"scored"` to `SUGGEST_VIA` → "46.2: unnamedPaths over the instance answered 8 paths".
- **46.3 the state filter**: for every unnamed node in both reads, `Object.keys(nodeState(n))` ⊆
  `TEMPLATE.stateKeys` and no value contains a 16-hex IR id or a `#rrggbb`; the text block's state has
  `texts: ["Amara Okafor", "Last seen 2 min ago"]` and `dir: "column"`; a SYNTHETIC node with 9 texts of 200 chars
  gives 5 texts of 80.
  REDDENS: add `style: n.style` to `nodeState` → "46.3: nodeState(ir.children[0].children[0]) carries style".
- **46.4 the criteria**: `criteriaFrom(VOCAB)` has every vocabulary slug in vocabulary order, then `none` last;
  `stack` present; each value is the entry's `usage` verbatim; a vocabulary with a `none` slug is refused.
  REDDENS: filter `stack` out in `criteriaFrom` → "46.4: stack is missing from the options".
- **46.5 the committed run**: the file exists (message: run `node tooling/import-suggest.mjs --run`, needs a key);
  `model === JEV_MODEL`; `templateSha` equals today's; `inFlight === MAX_IN_FLIGHT`; `reads[].fixture` are the two
  blueprints and each `fixtureSha256` equals the committed file's; per read, each request's
  `body.questions[id].instructions` deep-equals today's `questionsFor(...)` instructions for that id (the state
  builder is what was sent; **criteria are not compared**, R6); every request has exactly one question and
  `response.usage.input_tokens ≤ 38875` (R1); parsing each committed answer against **its own request's** criteria
  keys reproduces the committed `suggestions` (minus `ts`); every `top` has 3 items, non-increasing, `p` in [0,1].
  REDDENS: change `TEMPLATE.question`'s wording → "46.5: TEMPLATE changed since spike-c-run.json was recorded — re-run".
- **46.6 parseAnswer refusals**, each built by breaking a copy of a committed answer: `type: "noul"`, `probabilities`
  deleted, an extra key `avatr`, a value of `NaN`, a value of `1.5`, `confidence` deleted: each throws naming the
  field. Positive control first: the unbroken committed answer parses.
  REDDENS: remove the "key not in options" test in `parseAnswer` → "46.6: an answer naming avatr was accepted".
- **46.7 fail open and the in-flight cap, through the real `askJev`, failures only**: `suggest()` over the
  instance with `ask: (b, o) => askJev(b, { ...o, key: "" })` → `ran: false`, `suggestions: []`, reason names
  `TYPESAFE_API_KEY`; with a `fetchImpl` answering 429, one that aborts (timeout), one answering another model: each
  `ran: false` with the reason and **no throw**; with `inFlight: 0`: `ran: false`, 0 calls. The cap: over the MASTER
  read (6 unnamed), a counting throwing `ask` makes exactly `MAX_IN_FLIGHT` (4) calls (the first wave fails, the
  second never starts), and `replayAsk` makes 6 calls and returns 6 suggestions equal to the committed ones.
  REDDENS: replace the waves with one `Promise.all` over every id → "46.7: a failing first wave made 6 calls, expected 4".
- **46.8 AC #1: the matcher's output is identical with and without suggestions**: two `runImport` runs over the
  instance blueprint in two `pkgCopy`s (drop entrance, scratch overrides dir): (a) no `suggester`, (b)
  `suggester: (x) => suggest(x, { ask: replayAsk(instanceRead) })`. Assert: the two records'
  `ir, recognition, drops, snaps, unbound, mapping, source, fidelity` are `deep`-equal (NOT the whole record:
  `elapsed.recognition` differs run to run, R8, the 43.5 precedent); `mapping.json`, `template.txt`, `spec.md`,
  `block.css` are byte-equal (`readFileSync(...).equals(...)`); (b)'s `suggestions` equal the committed ones (minus
  `ts`); (a)'s are `[]`; the transcripts' last `suggest` lines have `ran` false and true.
  REDDENS: in `recordFor`, set `mapping.parts[s.path] = { map: s.top[0].slug }` for each suggestion → "46.8: the
  record's mapping differs with suggestions".
- **46.9 the record schema**: 46.8(b)'s record passes `checkRecord`; a copy with one suggestion's path moved to
  `ir.children[0].children[2]` (the scored status chip) is refused naming "scored node"; unsorted `top`, 4 items,
  `p` 1.2, a duplicate path: each refused by index; a record with no `suggestions` key passes (legacy);
  `REQUIRED_KEYS` does not include `suggestions`. `projectRecord`: 46.8(b)'s md contains `**Machine suggestions
  (Jev, unratified)**` and both paths, no `%` in the section, no ISO timestamp (`/\d{4}-\d{2}-\d{2}T/`); 46.8(a)'s says
  "None on this record"; the committed `spike-c-faithful.json` renders with no "Machine suggestions" line; a
  SYNTHETIC record whose first suggestion's `top` is reordered to put `none` first says "likely a new component", and
  each committed suggestion says it iff its top pick is `none`; 46.8(b)'s md renders through the real
  `renderMarkdown` with no ragged table (group 42.6's DOM-stub pattern, control first).
  REDDENS: make `checkRecord` accept any `via` → "46.9: a suggestion on the scored status chip was accepted".
- **46.10 an edit carries suggestions forward**: `editMapping` on 46.8(b)'s package with
  `{ path: "ir.children[0].children[1]", map: "stack" }` → the record's `suggestions` `deep`-equal to before;
  `mapping.json`'s `parts["ir.children[0].children[1]"].map === "stack"`; that verdict node's `via === "mapping"`;
  `checkRecord` passes.
  REDDENS: delete `suggestions: prior.suggestions` from `editMapping` → "46.10: an edit dropped the suggestions".
- **46.11 the labels file**: `checkLabels(committedLabels, RUN, slugs)` passes; the 8 rows' `(fixture, path)` pairs
  equal the run's; while `by === null` every `label` is null; once `by` is set every `label` is a slug or `"none"`.
  REDDENS (on an in-memory copy, never the committed file): `by: "owner"` with one `label: "avatr"` → "46.11: label
  avatr at spike-c-instance ir.children[0].children[0] is not a slug".
- **46.12 the route wiring, pinned from source**: `server.mjs`'s decommented source imports `suggest` and
  `SUGGEST_PROVENANCES` from `./lib/import-suggest.mjs`, defines `suggesterFor` gated on
  `UXF_IMPORT_SUGGEST !== 'off'` and `SUGGEST_PROVENANCES.includes`, and contains both `suggester: suggesterFor(b.provenance)`
  and `suggester: suggesterFor(provenance)`; `canvas-journey.mjs` sets `UXF_IMPORT_SUGGEST: "off"` exactly twice.
  REDDENS: remove the `suggester:` from the drop route → "46.12: /api/canvas/import/drop does not pass suggester".
- **46.13 nothing tracked moved**: `git status --porcelain -- import portal/lib tooling/import-suggest handoff system discovery`
  unchanged across the group.

Then `group("import suggest", "…")` in group 44's style, ending with the "What it cannot reach" sentence above.

- **PATTERN**: `tooling/build-checks.mjs:13962-14015` (group 44), `:13700-13760` (group 43 helpers).
- **GOTCHA**: every case that could reach `askJev` injects `ask`, `key` or `fetchImpl` (R3).
- **GOTCHA**: `ok()` only accumulates; wrap every constructive call in `fold`/`afold` so a throw is a named failure,
  not a crash (`build-checks.mjs:11656`'s lesson).
- **GOTCHA**: run each REDDENS mutation, see the named failure, revert; record each in the report with the observed
  message (memory `check-that-cannot-fail`).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -3` (expected: `build ✓  all 46 groups pass`)
- **SATISFIES**: AC #1, AC #3, AC #4
- **REGENERATES**: none

### Task 12. UPDATE `.claude/references/gates.md`

- **IMPLEMENT**: line 11 "45 pure groups" → "46 pure groups"; add a **Group 46 — machine suggestions for unnamed
  import nodes** (#455, `portal/lib/import-suggest.mjs` + `tooling/import-suggest/spike-c-run.json`) entry after
  Group 45, in the same shape: what it binds, the honesty rule, what it cannot reach. The three copies of the
  "cannot reach" clause (gates.md, the `group()` string, the run file's `note`) must say the same things (memory
  `gate-prose-has-three-copies`).
- **VALIDATE**: `grep -c "46 pure groups\|Group 46" .claude/references/gates.md` (expected: 2)
- **SATISFIES**: AC #4
- **REGENERATES**: none

### Task 13. OPEN the labels ticket, then the PR

- **IMPLEMENT**: `gh issue create` "Owner labels for #455's spike C suggestions (8 nodes)": how to fill
  `tooling/import-suggest/labels.json` (`label`: a slug or `none`, `by: "owner"`, `at`), then
  `node tooling/import-suggest.mjs --report`, and where the agreement goes (a comment on #455). Labels "Jev". Re-run
  the R12 fetch/log guard, then open the PR with `Closes #455` and the labels ticket linked.
- **VALIDATE**: `gh issue view <n>` shows it; the PR body carries `Closes #455`
- **SATISFIES**: AC #2 (the owner half has a tracker)
- **REGENERATES**: none

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). The gate is build-checks group 46, in CI, plus the operator-run canvas journey and
the paid Task 10 walk.

### Unit
46.1–46.7, 46.9 and 46.11: the module's pure functions, the record schema and the labels checker, driven, never
grepped (46.12 is the one source pin, for wiring CI cannot import).

### Integration
46.8 and 46.10: `runImport` and `editMapping` end to end in scratch package copies, with the committed responses
replayed.

### Edge cases
- zero unnamed nodes → no call; more unnamed nodes than the in-flight cap (the master read, 6) → two waves;
- no key, 429, timeout, model mismatch, malformed answer → `[]`, never a throw, the import still completes;
- a legacy record with no `suggestions` key → valid, and its md unchanged;
- an unnamed node the owner remaps (`via: "mapping"`) keeps its suggestion;
- `none` as the top pick; a non-builder slug (no Use button);
- a future vocabulary addition → the committed run still parses (criteria not compared; missing options allowed).

### Proving the checks
Every section in Task 11 carries its REDDENS mutation. Run each, confirm the named failure, revert, and list them
in the report with the observed message. Positive controls: 46.6 parses the unbroken answer first; 46.2's zero-call
case and 46.7's cap use a counting `ask` that would record a call; 46.7's `replayAsk` leg proves the waves do
complete; 46.9's renderMarkdown case runs the stub control first.

---

## VALIDATION COMMANDS

### Level 1: Syntax
- `for f in portal/lib/import-suggest.mjs tooling/import-suggest.mjs portal/public/canvas-import.mjs portal/lib/import-run.mjs import/report.mjs portal/server.mjs tooling/canvas-journey.mjs; do node --check "$f" || echo "FAIL $f"; done` (expected: no output)

### Level 2: The gate
- `node tooling/build-checks.mjs` → `build ✓  all 46 groups pass` (observed baseline on `origin/main` f4f5229: 44 ✓
  and `icons ✗` from 41.7 "tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing": the fresh
  worktree, not a regression; `cd tooling/icons && npm ci` fixes it)
- `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` (observed on the baseline;
  none of this ticket's paths is in a loc group: `system/`, root pages, `agent-layer/` only). Run it after staging
  (memory `loc-summary-counts-tracked-only`).
- `node tooling/drift-check.mjs` (CI `verify` also `node --check`s every tracked `.mjs`)
- `import/` still imports without `portal/node_modules`: group 40.7 ✓ (the `import/` graph is unchanged)

### Level 3: Journey
- `node tooling/visual-regression/serve.mjs &` then `node tooling/canvas-journey.mjs all` (operator-run; memory
  `stale-serve-wrong-tree`: curl-verify the served tree first)

### Level 4: Manual (paid)
- Task 10's walk.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Q1, Q2 | owner's hand | answered 2026-09-27 | — |
| Task 7 smoke (1 node) | ≈ $0.0007 | yes: proves R1 on the real API | none; required |
| Task 8 `--run` (8 nodes, both reads) | ≈ $0.0057 | yes: AC #1's committed responses | none; required |
| Task 10 portal walk with a key (2 nodes) | ≈ $0.0014 | yes: AC #3's click | none; required |
| The owner's 8 labels + `--report` agreement | owner's hand | no | Task 13's ticket; list under **Not run** |
| `canvas-journey.mjs all` | free, operator-run | no, but run it | report **Not run** if skipped |

Costs derived at $0.042 per million input tokens (the #454 header's figure, UNVERIFIED in TypeSafe's docs):
≈ 17,000 tokens per node ≈ $0.0007; 1 + 8 + 2 = 11 node-requests ≈ $0.0078 in all.

---

## ACCEPTANCE CRITERIA

- [ ] 46.8: for spike C's instance, the record's matcher-derived fields, `mapping.json`, `template.txt`, `spec.md`
      and `block.css` are identical with and without suggestions, run through `runImport`, not grepped; suggestion
      parsing is tested against `tooling/import-suggest/spike-c-run.json`, committed responses from real calls (46.5, 46.6)
- [ ] The PR reports Jev's top 3 for each of spike C's **8** unnamed nodes (instance 2, master 6; the ticket's "3"
      predates #449/#456, see NOTES), from the committed run, including any `none` result. The owner's labels and the
      agreement follow in Task 13's ticket, reported as observed
- [ ] The canvas view renders the suggestions; clicking Use on a builder slug records an owner mapping edit
      (`mapping.json`), and the suggestions are unchanged (46.10 + Task 10)
- [ ] `node tooling/build-checks.mjs` green (46 groups); `gen-loc-summary --check` unchanged; `import/` still imports
      in CI without `portal/node_modules` (40.7)
- [ ] No threshold constant exists; a `none` top pick says "likely a new component" with its probability beside it
- [ ] Every REDDENS mutation run and recorded in the report

---

## COMPLETION CHECKLIST

- [ ] Tasks 1–13 in order, each VALIDATE run
- [ ] The run file and labels template committed; no hand edits
- [ ] Labels ticket opened and linked
- [ ] Plan, report and review in the PR (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`); body carries `Closes #455`

---

## OPEN QUESTIONS / ASSUMPTIONS

No open questions: Q1 and Q2 were answered by the owner on 2026-09-27 (top of this plan).

- **A1**: the size limit is per request; the largest accepted request observed is 38,875 tokens
  (`discovery-screen.mjs:88`) and a ≈ 55,580-token request was refused. One node (≈ 17k expected) sits under the
  former with a 2.3× margin, and the smoke (Task 7) and 46.5 turn the expectation into an observation.
- **A2**: Jev accepts an object under `instructions` for a Choice (docs, and `discovery-screen.mjs:147` in production).

## NOTES (open canvas)

**D1. Where each node's data rides.** The API has one `state` per request, shared by every question. Putting all
unnamed nodes in `state` and pointing each question at one would give each question every other node's detail,
which is the large-state failure the ticket cites. So `state` is a constant stub and each node rides in its own
question's `instructions` object (`{ question, node }`), the documented `potential_duplicate` pattern.

**D2. The default suggester is none.** Group 43 calls `runImport` about ten times. A default of "call Jev" would, on
this machine (the shell exports the key), spend real calls in a local build-checks run and fail open in CI: the same
group behaving differently in the two places. The routes opt in; the journey opts out by env.

**D3. One node per request, four in flight.** Weighed against packing nodes per request (the ticket's "one request
per import"): packing needs a calibrated batch size and risks the 400 on an unlucky estimate; one node per request
costs the same tokens (the criteria are sent per question either way), is ≈ 17k tokens against a 38,875 observed
ceiling, and makes each request independently checkable (46.5). Parallel waves keep latency near one round trip for
≤ 4 nodes. The cap of 4 bounds burst load (R2) and the lock time (≤ 4 waves × 15 s for 15 nodes). A failed wave
stops the next: the result is all or nothing anyway, so later waves would be spent for nothing.

**D4. Why suggestions are stored, not derived.** `checkRecord` recomputes everything derivable (drops, snaps,
unbound). Suggestions are an observation from outside the repo, like `fidelity.deltaEMin`: the record stores them
and `checkRecord` checks shape and placement (never on a scored node) only.

**D5. Builders limit the Use button.** 6 of 26 slugs have a builder (observed). A Use button for `avatar` would call
`editMapping`, which throws (`applyMapping`, `import-run.mjs:250`). So non-builder suggestions are shown with "no
builder yet"; AC #3 is demonstrated on a builder slug, with the Mapping select as the stated fallback in Task 10.

**Pre-flight (run 2026-09-27 against `origin/main` f4f5229 in `wt-plan-455`).**
- `gh issue view 307/311/453/454`: #307, #453, #454 CLOSED; #311 OPEN, but PR #462 merged its view, editor and
  routes (observed). `portal/lib/jev.mjs` and `portal/lib/import-run.mjs` exist on main (observed, `git ls-tree`).
- Unnamed nodes (drove `runPipeline` over the fixtures): spike C instance **2** (`ir.children[0].children[0]` shape
  floor; `ir.children[0].children[1]` frame structural-fallback); spike C master **6**
  (`ir.children[0].children[0]` frame fallback, `ir.children[0].children[0].children[0]` shape floor,
  `ir.children[0].children[0].children[1]` frame fallback, `ir.children[0].children[1]` frame fallback,
  `ir.children[0].children[1].children[0]` shape floor, `ir.children[0].children[1].children[1]` frame fallback);
  Figma spike-list-row **2**. The ticket's "3 of 8" predates #449/#456, which named the chevron
  (`ir.children[0].children[3]` now `icon`, scored 0.5). **Changed:** AC #2 reads 8 nodes (Q2).
- Vocabulary: **26** components (ticket: 25), so **27** options with `none`; `usage` totals **27,749 chars**
  (observed). **Changed:** the cost estimate (ticket ≈ 2k tokens per node; derived ≈ 17k) and "one request per
  import" (now one per node, D3).
- `BUILDERS`: 6 (`stack text list-row status-chip icon list`, observed). **Changed:** Use button scope (D5).
- TypeSafe docs fetched: Choice request/answer shapes as quoted above; structured `instructions` supported.
- `tooling/regen-import-records.mjs:32` calls `buildRecord` directly (observed). **Changed:** `buildRecord` adds the
  key only when passed, so 42.6 stays byte-identical.
- `node tooling/build-checks.mjs` on the clean tree: 44 ✓, `icons ✗` (41.7, missing `tooling/icons` node_modules in
  a fresh worktree). `node agent-layer/gen-loc-summary.mjs --check`: ✓ no drift. Both observed.
- `tooling/build-checks.mjs:14657` prints `"build ✓  all 45 groups pass"` (observed). **Changed:** Task 11 edits it.
- `tooling/canvas-journey.mjs:113, 634` spawn the portal with `...process.env` (observed); `:162-165` copy the
  scratch `_discovery/fp-import` package. **Changed:** Task 5's seam and Task 10's walk layout.
- `resolveRunRoot` (`portal/lib/discovery.mjs:95-96`): `fictional` → the repo, `real` → `JOBS_DIR` (observed).
  **Changed:** Task 10 uses `real` + scratch `JOBS_DIR` (R9).
- `server.mjs:462-482`: `/api/canvas/import` reads `b.provenance`, the drop route a local `provenance` (observed).
  **Changed:** Task 4 names both.
- Build-checks numbering: groups 40–45 are `import-chain, icons, import-record, import run, jev guard, jev screen`
  (observed section markers `40.1`…`45.1`); the new group is 46.
- `editMapping` (`import-run.mjs:407-448`) re-derives the record through `recordFor` (observed). **Changed:** Task 3
  carries `prior.suggestions`; 46.10 proves it.

**Size.** Ticket estimate 250–400 lines; this plan is ≈ 600–700 (module ≈ 150, CLI ≈ 180, gate ≈ 220, the rest
≈ 80), mostly the gate and the CLI the committed-response AC requires.

**Confidence: 10/10.** Every literal the tasks depend on was observed on `origin/main` this session; both owner
decisions are answered; each risk in the register has a design choice and a check with a named REDDENS; the only
external unknown (the per-request size) has a 2.3× margin and is turned into an observation before anything
depends on it; the one owner-hand step is outside the PR's done-line by construction.

## AMENDMENTS

- 2026-09-27 — owner answered Q1 (both provenances) and Q2 (instance + master, 8 nodes). Batching changed from a
  smoke-calibrated `NODES_PER_REQUEST` to one node per request with `MAX_IN_FLIGHT = 4` (D3), removing the
  calibration dependency. Added the risk register, Task 13 (labels ticket + PR), the 46-groups summary line edit,
  the elapsed-free compare in 46.8, the `real`-provenance scratch walk in Task 10 and the explicit provenance
  variables in Task 4.
- 2026-09-27 (implementation, base `f4f5229`). Five plan errors found while implementing:
  1. `portal/lib/import-run.mjs` citations had drifted by about 8 lines: `recordFor` is at `:269`,
     `editMapping` at `:415-451` and `runImport` at `:459-515`. The code they describe is unchanged.
  2. The plan never listed `CLAUDE.md`'s two copies of the group count (the architecture map and
     §On-demand context). `drift-check`'s group-count leg caught it. Both now read 46, and the map gains
     `lib/import-suggest.mjs` and `import-suggest.mjs` beside their Jev siblings.
  3. The 1.7 chars/token estimate was about 2.4× too high for this request. Observed 7,092 input tokens
     per node against ≈ 16,757 estimated: the vocabulary's `usage` prose tokenises more densely than the
     option-heavy JSON the ratio was calibrated on. Cost is ≈ $0.0003 per node, not ≈ $0.0007.
  4. 46.3's REDDENS ("add `style: n.style` to `nodeState`") cannot redden this implementation, because
     `nodeState` filters on `TEMPLATE.stateKeys`, so a key added before the filter is dropped. The
     mutation that does redden it adds `style` after the filter.
  5. A fresh worktree also needs `cd tooling/style-dictionary && npm ci`, or `drift-check` stops at its
     `sd tokens` leg.
