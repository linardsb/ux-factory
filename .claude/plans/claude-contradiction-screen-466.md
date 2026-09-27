# Feature: the contradiction screen as one Claude call over the whole document (#466)

The following plan should be complete, but validate documentation, codebase patterns and task sanity before you
start implementing. Pay special attention to the names of existing exports and import from the right files.

**Tree the citations are against.** Every `path:NN` below was read on `origin/main` (a73645f) **plus #465's six
files** (the state Phase 0 produces). `tooling/build-checks.mjs` line numbers from 14157 on are shifted by #465's
+35 lines relative to bare `origin/main`. Re-anchor by the case label (`45.8`, `45.12`) instead of trusting a number.

## Feature Description

Replace the Jev contradiction screen's *route path* with one Claude call. The call reads the stored document and
returns the pairs of statements that cannot both be true, each side as a verbatim quote. A pure mapper turns each
quote into a claim id through the document's own lines. Only pairs where both quotes land on exactly one claim
reach the audit prompt, through the unchanged `tensionsBlock`. The call is pre-registered and run once on the
frozen fixture, then once on the live PRD. Both runs are committed verbatim and replayed in build-checks group 45.
The screen stays off.

## User Story

As the owner running a Grill audit on an existing PRD
I want a machine screen that actually surfaces the document's internal contradictions before the audit starts
So that the audit can raise contradictions across sections, which its one-question-per-turn shape cannot see.

## Problem Statement

Run 2 found 0 of MVP 13's 8 findings because the audit never holds two distant claims together. #453's Jev screen
also found 0/3 contradiction-class findings, with every miss at stage 1. #465's diagnostic then showed that stage 2
recognises 0/3 even when handed the known joins, so scaling Jev is not the fix. The pre-registered FAIL branch is
this ticket: one Claude call over the whole document.

## Solution Statement

- `portal/lib/discovery-screen.mjs` (SDK-free, still imported in CI) gains the Claude screen's **pure half**. That
  covers the prompt constants, the request builder, the answer parser, the quote → claim mapper, the line builder
  and `screenSession` rewired to it. The Jev functions stay, because they are the measured record that 45.8/45.12
  replay.
- A new `portal/lib/discovery-screen-call.mjs` holds the **one SDK call** (`askScreen`). `server.mjs` and the CLI
  inject it as `ask`, which is the same injection seam #453 used for `askJev`.
- `tooling/jev-screen/claude-score.mjs` scores a run against the rubric's joins. It never calls Claude.
- `tooling/jev-screen.mjs --claude` covers the dry run (free, the default) and the paid run (`--paid <sha8>`,
  behind a pre-registration interlock), plus a never-scored mechanism smoke on a synthetic document. The paid run
  writes `claude-fixture-run.json` or `claude-live-run.json`, once each.
- `discovery/prd-projection.mjs`'s Tensions section and `tensionsOf` learn the new line types. Jev lines render
  byte-identically, and partner-audit-3 is unmoved.
- Build-checks 45.6 is re-pointed at the Claude path, and new cases 45.13 (pure half), 45.14 (fixture replay) and
  45.15 (live replay) are added.

## Out of Scope / Non-Goals

- Not changing: the rubric's joins, classes or anchors; the frozen fixture; `discovery/claims.mjs` or
  `CLAIMS_VERSION`; `fixture-claims.json`.
- Not changing: `tensionsBlock`, `TENSION_RULE`, `SCREEN_FINGERPRINT_INPUTS`, `screenFingerprintOf`. 45.7 pins the
  screened Grill-on-Opus stamp at `1dd1b6e4d0aaf43273190239ac74f18a`, which partner-audit-3 carries.
- Not included: turning the screen on. **`SCREEN_AUDIT` stays `false` and the route keeps `b.screen === true`, even
  if the fixture run finds ≥ 1 contradiction-class finding.** Requirement 5 names the condition under which a later
  ticket *may* turn it on. This ticket records the verdict and nothing more.
- Not included: deleting Jev code, `screen-run.json`, `diagnostic-run.json` or `labels.json`. They are evidence.
- Not included: a new audit run through the drawer (no partner-audit-4). The screen is measured by the CLI.
- Not included: writing any owner verdict. Precision is reported as *pending the owner*.
- Not included: a second paid run of either kind, ever. There are no re-runs for a better score.

## Feature Metadata

**Feature Type**: Enhancement (replaces a measured-and-failed mechanism behind an existing seam)
**Estimated Complexity**: Medium-High (small code, strict honesty protocol, one-shot paid run)
**Primary Systems Affected**: `portal/lib/discovery-screen.mjs`, new `portal/lib/discovery-screen-call.mjs`,
`portal/server.mjs`, `discovery/prd-projection.mjs`, `tooling/jev-screen.mjs`, `tooling/jev-screen/`,
`tooling/build-checks.mjs` group 45, the screen rubric, `discovery/README.md`, `.claude/references/gates.md`
**Dependencies**: `@anthropic-ai/claude-agent-sdk` 0.1.77 (already the portal's dependency; no new package)

## Related Work

**Implements**: #466 (`Closes #466` in the PR body) · **Epic**: #279 lineage,
`docs/epics/discovery-partner.architecture.md`

**Back-references**:
- `.claude/plans/jev-contradiction-screen-453.md` (untracked in the primary tree; read it if present). It carries
  the screen's D-decisions (D3 thresholds, D4 `raisedBy`, D7 separate scoring), which this ticket inherits except
  where it replaces Jev.
- PR #464 (merged, a73645f): the screen, the rubric and group 45.1–45.11.
- PR #465 (merged into `feat/jev-contradiction-screen-453` **after** #464 was squashed, so **not on `main`**). It
  holds the diagnostic, the rubric's §Diagnostic and 45.12. It is re-landed by Phase 0.

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — read before implementing

- `portal/lib/discovery-screen.mjs` (all 305 lines). The four invariants in the header (:16-48), `LINE_TYPES`
  (:87), `readScreen`/`writeScreen` (:274-292), `screenSession` (:295-305) and `tensionsOf` (:269-272). You
  edit this module. Its import list is pinned by 45.1 (`SCREEN_ALLOWED`, build-checks ~:14201).
- `portal/lib/jev.mjs`: the client shape `ask(body, { timeoutMs })` and its error prefix `jev: <status>`. The
  new `askScreen` mirrors the injection seam, not the transport.
- `portal/lib/discovery-proposer.mjs:263-300`: the house pattern for one `query()` and for reading its `result`
  message. It checks `is_error` as well as `subtype`, and reads `total_cost_usd` and `usage`.
- `portal/lib/import-run.mjs:583-600`: `tools: [], allowedTools: [], strictMcpConfig: true, abortController`, and
  capturing the `system`/`init` message.
- `portal/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts`. Read it for
  `abortController` (:234), `outputFormat` (:407-413), `settingSources` (:500-507: omitted means **no filesystem
  settings, no CLAUDE.md**) and `maxThinkingTokens` (:370).
- `.../entrypoints/sdk/coreTypes.d.ts:442-470`: `SDKResultMessage`, meaning `subtype`, `is_error`, `result`,
  `total_cost_usd`, `usage`, `modelUsage` and `permission_denials`.
- `portal/server.mjs:209-221`: the screen's route branch (`b.screen === true && view.created && entryMode ===
  'existing-prd'`).
- `portal/lib/discovery.mjs:1156`: `tensions: audit ? tensionsOf(readScreen(root)) : [],`. Keep it
  **byte-identical**, because 45.7 regex-pins it.
- `portal/lib/discovery-postures.mjs:611-631` (`TENSION_RULE`, `tensionsBlock`, `tensionsGuard`) and `:886-898`
  (`SCREEN_FINGERPRINT_INPUTS`, `screenFingerprintOf`). Read them. **Do not edit either.**
- `portal/public/portal.js:956-986`: `SCREEN_AUDIT` and the status line. The line reads "Screening the document for
  contradictions (Jev)". That copy changes (Task 9). The constant does not.
- `discovery/prd-projection.mjs:750-801` (`norm`, `hasWindow`, `raisedBy`, `keptRank`, `renderTensions`) and
  `:808-848` (`projectPrd`'s screen handling). The mapper's normalisation starts from `norm` (:761).
- `discovery/claims.mjs:1-30` (header rules). A claim's `text` is **reformatted**: tables become `Header: cell · …`,
  list markers are stripped and lines are joined. That is why quotes map through **source lines**, not claim text.
- `tooling/jev-screen.mjs` (all). The CLI's modes, the `ask` retry wrapper (:52-65), `--diagnostic` (:104-136) as
  the write-once-on-success pattern, and `--labels-template` (:71-83), which refuses because `labels.json`'s `by`
  is set.
- `tooling/jev-screen/diagnostic.mjs` (after Phase 0): `DIAGNOSTIC_JOINS`, `CONTRADICTION_FINDINGS`. The scorer
  **reuses the joins** (minus the controls). It does not restate them.
- `tooling/jev-screen/fixture-claims.json`: 90 claims, each `{id, section, line, endLine, text}`. c044 is
  `:155-173` and is a wide claim.
- `docs/epics/fixtures/discovery-partner.screen-rubric.md` (all 201 lines after Phase 0). You append a section to
  it. The joins are under §Contradiction class (:43-62) and §Tension-shaped (:64-78). The mapping rule is at :23.
- `tooling/build-checks.mjs` group 45 (~:14154-14490). The header comment carries the honesty rule, then 45.1,
  45.6 (~:14297), 45.7 (~:14322-14355), 45.8 (~:14357), 45.9, 45.11, 45.12 (~:14457), 45.10 and the `group(...)`
  prose string (~:14489).
- `.claude/references/gates.md:82`: group 45's prose. **This is the third copy of the gate prose** (memory: gate
  prose has three copies: `gates.md`, the `group()` string and the group header comment). Update all three.
- `discovery/README.md:274+` (§The contradiction screen) and `:90-92` (the `screen.jsonl` line types).

### New Files to Create

- `portal/lib/discovery-screen-call.mjs`: `askScreen({ system, prompt, model, timeoutMs })`, the one SDK `query()`.
- `tooling/jev-screen/claude-score.mjs`: `scoreClaudeRun(lines)` → per-finding states + verdict. No Claude.
- `tooling/jev-screen/claude-smoke-run.json`: GENERATED by the paid mechanism smoke on `SMOKE_DOC`. Never scored,
  never hand-edited.
- `tooling/jev-screen/claude-fixture-run.json`: GENERATED by the paid fixture run. Never hand-edited.
- `tooling/jev-screen/claude-live-run.json`: GENERATED by the paid live run. It embeds the screened text.
- `tooling/jev-screen/claude-labels.json`: GENERATED template (`by: null`, every kept pair `real: null`) for the
  owner.

### Relevant Documentation

- Agent SDK TypeScript reference, `code.claude.com/docs/en/agent-sdk/typescript`: `query()` Options and
  `SDKResultMessage`. Why: the call's options and the answered/no-answer boundary. The installed `.d.ts` files
  above are authoritative for 0.1.77.
- Pricing (claude-api skill, cached 2026-06-24): `claude-sonnet-5` $2 / $10 per M; `claude-opus-5` $5 / $25 per M.

### Patterns to Follow

**Error naming.** `const bad = (msg) => { throw new Error(\`discovery-screen: ${msg}\`); };` is already at
`discovery-screen.mjs:68`. Reuse it.

**Write once, never rewrite.** Use `writeFileSync(path, …, { flag: 'wx' })` after an `existsSync` refusal
(`discovery-screen.mjs:288-292`). The CLI's run files follow the same rule: refuse if the file exists.

**Result reading** (`discovery-proposer.mjs:285-299`), verbatim idiom:
```js
} else if (msg.type === 'result') {
  stats = { ..., costUsd: msg.total_cost_usd ?? null, ok: msg.subtype === 'success' && msg.is_error !== true };
```

**Generated-file stamp.** `GENERATED` string plus `$description` (`tooling/jev-screen.mjs:43`, `:131`).

**Build-checks honesty rule (group 44/45 header).** An injected `ask` may only FAIL or REPLAY a committed response
verbatim. Synthetic inputs appear only in a case labelled SYNTHETIC that drives pure functions directly.

---

## IMPLEMENTATION PLAN

### Phase 0: Re-land #465 on `main` (its own PR, before this ticket's branch)

**Why:** #464 was squash-merged at 11:32:24Z. #465 merged into #464's *branch* 20 s later and never reached `main`
(observed: `git diff --stat origin/main origin/feat/jev-contradiction-screen-453` shows exactly #465's six files).
The issue's requirement 6 ("like 45.8 and 45.12") and the scorer's reuse of `DIAGNOSTIC_JOINS` both depend on it.
Keep the branches `origin/feat/jev-screen-diagnostic` and `origin/feat/jev-contradiction-screen-453`. They are the
only home of `b2cbd3d`, the pre-registration receipt the rubric cites (:175).

### Phase 1: The pure half (SDK-free)

**Depends on:** Phase 0.

Covers the prompt constants, the request builder, the parser, the mapper, the line builder, `screenSession`'s
rewiring and the `tensionsOf` dispatch. It includes the 45.13 synthetic cases, which drive only the pure functions.

### Phase 2: The SDK call, the route and the CLI

**Depends on:** Phase 1. Covers `askScreen`, `server.mjs`'s injection, `tooling/jev-screen.mjs --claude` (dry by
default) and the fail-visible 45.6 rework.

### Phase 3: The projection

**Independent of:** Phase 2 (it needs only Phase 1's line shapes). `renderTensions` and a synthetic case in 45.9.

### Phase 4: Pre-register (its own commit, before any paid call)

**Depends on:** Phases 1–3 committed. The owner answers Q2 (the model) before this commit.

### Phase 5: The two paid runs, the scorer and the replays

**Depends on:** Phase 4's commit **pushed** (the CLI interlock refuses otherwise). Order: the mechanism smoke on
the synthetic `SMOKE_DOC` (never scored), then the fixture run, then the live run.

---

## STEP-BY-STEP TASKS

### Task 0 — RE-LAND #465 (separate PR, closes nothing)

- **IMPLEMENT**: from a clean worktree (the primary tree is shared and dirty; memory: shared worktree), run:
  ```
  git worktree add ../wt-reland-465 -b chore/reland-465 origin/main
  cd ../wt-reland-465 && git diff origin/main origin/feat/jev-contradiction-screen-453 | git apply --index
  ```
  Commit `chore(discovery): re-land #465's stage-2 diagnostic, lost to the stacked squash (refs #465, #453)`.
  The PR body names `b2cbd3d` as the pre-registration receipt, which lives on `origin/feat/jev-screen-diagnostic`.
  It carries `Refs #465`, not `Closes`.
- **GOTCHA**: a fresh worktree needs `cd tooling/icons && npm ci` or build-checks 41.7 reds with "phosphor … is
  missing" (observed in pre-flight; environmental, not code). The memory entry names `npm ci` in portal,
  visual-regression and style-dictionary too.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 45 groups pass`, and `node tooling/drift-check.mjs` → ✓.
  Observed on this tree state: group 45 `✓` including the 45.12 prose, and the only red was 41.7 from the missing
  icons install.
- **SATISFIES**: precondition for AC 6 · **REGENERATES**: none (the files are committed artifacts)

### Task 1 — UPDATE `portal/lib/discovery-screen.mjs`: the Claude screen's constants and request

- **IMPLEMENT** (exports, one frozen table so a hash can pin it):
  ```js
  export const CLAUDE_SCREEN = Object.freeze({
    model: 'claude-sonnet-5',       // Q2 — the owner confirms before the pre-registration commit
    K: 10,                          // at most K pairs kept, in returned order (as Jev's K)
    timeoutMs: 300000,              // the route's and the CLI's abort, per call (5 min: an abort is a no-answer, and every no-answer costs)
    system: `…`,                    // CLAUDE_SYSTEM below, verbatim
    open: '<<<DOCUMENT', close: 'DOCUMENT>>>',
  });
  export function claudeRequest(text) {   // pure: the exact system + prompt the call sends
    return { model: CLAUDE_SCREEN.model, system: CLAUDE_SCREEN.system,
             prompt: `${CLAUDE_SCREEN.open}\n${text}\n${CLAUDE_SCREEN.close}` };
  }
  export const claudePromptSha = () => sha256(JSON.stringify(CLAUDE_SCREEN));  // node:crypto, already imported
  ```
  Draft `system` wording. The owner may edit it **before** Phase 4, never after. It uses Jev's own definition
  ("cannot both be true of the same product at the same time") so the two screens are asked the same question. It
  must name **no** finding, section, number or example from the rubric or run 2:
  ```
  You check one product requirements document for internal contradictions. A contradiction is two statements in this document that cannot both be true of the same product at the same time. Only the document against itself counts: not the document against the world, and not a gap, a risk, a vague passage or a missing detail.

  Return at most 10 pairs, strongest first. Fewer is a good answer, and an empty list is the right answer when there are none.

  Each side is a quote copied character for character from the document: one contiguous span inside a single paragraph, list item or table cell, long enough to occur only once in the document. No ellipsis, no paraphrase, no added words.

  Answer with one JSON object and nothing else, in exactly this shape:
  {"pairs":[{"quote_a":"…","quote_b":"…","why":"one sentence on why both cannot hold"}]}
  ```
- **PATTERN**: `QUESTION_TEMPLATES` (`discovery-screen.mjs:92-113`) is frozen and hashed into `questionsSha`
  (`tooling/jev-screen.mjs:46`).
- **GOTCHA**: `outputFormat: {type:'json_schema'}` exists in 0.1.77 (`runtimeTypes.d.ts:413`), but it is
  **rejected on purpose**. In the Claude Code harness it runs as an extra structured-output turn with its own
  failure subtype (`error_max_structured_output_retries`, `coreTypes.d.ts:460`). Whether it works under
  `maxTurns: 1` and `tools: []` cannot be proven without a paid call, and a paid call before the pre-registration
  is forbidden. Plain JSON text with the parse rule in Task 3 is deterministic. Record this in NOTES and in the
  rubric.
- **GOTCHA**: 45.1's `SCREEN_ALLOWED` is exact both ways. Add **no** import (`createHash` is already imported).
- **VALIDATE**: `node -e "import('./portal/lib/discovery-screen.mjs').then(S=>console.log(S.claudePromptSha(), S.claudeRequest('x').prompt))"` (expected: a 64-hex sha and `<<<DOCUMENT\nx\nDOCUMENT>>>`)
- **SATISFIES**: AC 1 · **REGENERATES**: none

### Task 2 — ADD the quote → claim mapper to `discovery-screen.mjs`

- **IMPLEMENT** `mapQuote(quote, text, claims)` → `{ status: 'mapped'|'unmapped'|'ambiguous', claim: id|null,
  reason }`. The rule (pre-registered verbatim in Task 11):
  1. **Normalise** one line or one quote the same way (`normLine`): straighten curly quotes (`norm`'s two
     replacements, `prd-projection.mjs:761`); map em dash `—` and en dash `–` to `-` (the fixture holds 59 em dashes
     and 2 en dashes, observed, and a model may copy either as a hyphen); map a non-breaking space to a space;
     replace a markdown link `[x](y)` with `x` (4 links in the fixture); delete every `*`, `_` and backtick;
     replace `\|` with `|`; collapse whitespace; trim; lower-case. **For the quote only**, then strip trailing
     `.`, `,`, `;` and `:` (a model often closes a quote with a full stop the span does not carry). No fuzzy
     matching of any kind: after this normalisation the quote is an exact substring or it is not.
  2. **Index the document**: split `text` on `\r?\n`, normalise each line, skip empty results, and join with one
     space. Record each kept line's `[start, end)` in the joined string and its 1-based source line number.
  3. **Find** every occurrence of the normalised quote in the joined string (overlapping allowed). Each occurrence
     touches a set of source lines. Its **claim set** is every claim with `line ≤ N ≤ endLine` for some touched N
     (the rubric's own mapping rule, `screen-rubric.md:23`).
  4. **Decide**:
     - empty quote after normalising, or it contains `…` or `...` → `unmapped` (`ellipsis`/`empty`);
     - no occurrence → `unmapped` ("matches no claim");
     - occurrences whose claim sets differ → `ambiguous` ("matches two": repeated text in different claims);
     - the claim set is empty (the quote lies only in a heading, a table header or a separator row) → `unmapped`;
     - the claim set holds ≥ 2 claims (the quote crosses a claim boundary) → `ambiguous`;
     - exactly one claim → `mapped`.
- **ADD** `mapPairs(pairs, text, claims)` → per returned pair, in returned order: `{ index, quoteA, quoteB, why,
  sideA, sideB, a, b, kept, reason }`. `a`/`b` are the brief claims (`{id, section, text}`, lower id as `a`) when
  both sides are mapped. `kept` is true for the first `K` pairs that have both sides mapped, `a.id !== b.id`, and
  no earlier kept pair with the same ids. `reason` for a non-kept pair is one of `unmapped`, `ambiguous`,
  `same-claim`, `duplicate` or `outside-K`.
- **PATTERN**: `hasWindow`/`norm` (`prd-projection.mjs:761-767`); `brief` (`discovery-screen.mjs:115`).
- **GOTCHA**: do **not** import from `discovery/prd-projection.mjs`. 45.1 pins the imports, and the projection
  imports nothing from `portal/`. Copy the two quote-straightening replacements. Do not share them.
- **GOTCHA**: match against **source lines**, never `claim.text`. Table-row claims read `What: … · Where: …`
  (observed `fixture-claims.json` c018), so a quote from a table cell would never match the claim text.
- **VALIDATE**: 45.13 (Task 12). Expected positive control: a quote of `The bank itself. Seeded from the CXO doc's
  ten stages` (no asterisks) maps to `c044`.
- **SATISFIES**: AC 2 · **REGENERATES**: none

### Task 3 — ADD the parser and the line builder to `discovery-screen.mjs`

- **IMPLEMENT** `parseClaudeAnswer(resultText)` → `{ ok: true, pairs }` or `{ ok: false, reason }`. It never throws
  on model output. The rule:
  1. `trim()`. If the text starts with ```` ``` ````, drop the first line; if it then ends with ```` ``` ````, drop
     that last line.
  2. `JSON.parse`. On failure, **one fallback**: take the substring from the first `{` to the last `}` of the
     trimmed text and `JSON.parse` that (it tolerates a sentence of prose before or after the object, the most
     likely deviation from "nothing else"). A second failure gives `{ok:false, reason:'not JSON'}`. Record which
     step parsed in the summary line as `parsedBy: 'direct'|'fence'|'braces'`.
  3. The top level must be an object with an array `pairs`. Anything else gives `{ok:false, reason}`.
  4. Each item needs a non-empty string `quote_a`, a non-empty string `quote_b` and a string `why`. A malformed item
     is recorded `{ malformed: true, index }`, never kept, and does not fail the rest. Extra keys are ignored.
- **ADD** `claudeLines({ text, result, now })`. `result` is `askScreen`'s return, `{ model, resultText, costUsd,
  usage, init }`. It produces:
  - one `quoted-pair` line per parsed item: `{type:'quoted-pair', ts, model, index, quoteA, quoteB, why, sideA,
    sideB, a?, b?, kept, reason?}`;
  - then one `claude-summary` line: `{type:'claude-summary', ts, model, docMd5, claimsVersion, claims,
    returned, malformed, kept, parse: 'ok'|<reason>, promptSha, costUsd, inputTokens, outputTokens}`.

  An unparseable answer writes **no** pair lines and a summary with `parse: '<reason>'`, `kept: 0`.
- **ADD** `'quoted-pair'` and `'claude-summary'` to `LINE_TYPES`. `readScreen` must accept them.
- **UPDATE** `tensionsOf(lines)`. When a `claude-summary` line is present, return the kept `quoted-pair` lines in
  `index` order as `{ a, b, contradicts: null }`. Otherwise keep the current Jev path byte-for-byte.
  `tensionsBlock` reads only `a`/`b` (`discovery-postures.mjs:617-624`), so `contradicts: null` is safe. Confirm
  `tensionsGuard` checks only `a`/`b` `id`/`text`.
- **GOTCHA**: `discovery.mjs:1156` stays byte-identical (45.7 regex). The dispatch lives inside `tensionsOf`.
- **VALIDATE**: 45.13 (Task 12)
- **SATISFIES**: AC 1, AC 2 · **REGENERATES**: none

### Task 4 — UPDATE `screenSession` in `discovery-screen.mjs` to run the Claude screen

- **IMPLEMENT**: `screenSession(root, text, { ask, now })`. `ask` is **required**, and a missing one is refused
  **before** any write (`bad('screenSession needs ask — the route injects askScreen')`). Body: `const result = await
  ask(claudeRequest(text), { timeoutMs: CLAUDE_SCREEN.timeoutMs })`, then `writeScreen(root, claudeLines(...))`.
  Any throw from `ask` writes the one `unavailable` line (invariant 3), unchanged. Return `{ status: 'ran', kept,
  reason: null }`, or `{ status: 'unavailable', kept: 0, reason }`. An unparseable answer is `status: 'ran'`, `kept:
  0`: the model answered, and the summary line carries `parse`.
- **UPDATE** the module header. The route now runs the Claude screen. The Jev functions are the measured record
  (45.8/45.12), not the route. Keep invariants 1–3. Rewrite invariant 4 for Claude: the prompt, model, K and the
  mapping are pre-registered in the rubric's new section, and `claudePromptSha` binds them. Replace the OFF BY
  DEFAULT paragraph's "follow-up" sentence with this ticket's result, after Phase 5. Update the IMPORTS line (the
  SDK call is injected from `./discovery-screen-call.mjs`, never imported here).
- **GOTCHA**: `screenDocument` (Jev) keeps its default `ask = askJev` and stays exported. 45.8 replays it.
- **VALIDATE**: 45.6 (Task 7)
- **SATISFIES**: AC 1 · **REGENERATES**: none

### Task 5 — CREATE `portal/lib/discovery-screen-call.mjs` (the one SDK call)

- **IMPLEMENT**:
  ```js
  import { mkdtempSync, rmSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
  import { query } from '@anthropic-ai/claude-agent-sdk';
  export async function askScreen({ model, system, prompt }, { timeoutMs }) {
    const cwd = mkdtempSync(join(tmpdir(), 'screen-'));      // nothing to read, even if a tool slipped in
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), timeoutMs);
    let init = null, result = null;
    try {
      const q = query({ prompt, options: { cwd, model, systemPrompt: system, maxTurns: 1, tools: [], allowedTools: [],
        mcpServers: {}, strictMcpConfig: true, abortController } });   // settingSources omitted = no CLAUDE.md, no settings
      for await (const msg of q) {
        if (msg.type === 'system' && msg.subtype === 'init') {
          init = { model: msg.model, tools: msg.tools ?? null, mcpServers: msg.mcp_servers ?? null };
          if (!Array.isArray(init.tools) || init.tools.length) { abortController.abort(); throw new Error(`screen-call: init advertised tools ${JSON.stringify(init.tools)} — refusing before the model answers`); }
        } else if (msg.type === 'result') result = msg;
      }
    } finally { clearTimeout(timer); rmSync(cwd, { recursive: true, force: true }); }
    if (!result) throw new Error('screen-call: no result message — no answer');
    if (result.subtype !== 'success' || result.is_error === true || typeof result.result !== 'string')
      throw new Error(`screen-call: no answer — ${result.subtype}${result.is_error ? ' (is_error)' : ''}: ${String(result.result ?? '').slice(0, 200)}`);
    return { model: init?.model ?? model, init, resultText: result.result, costUsd: result.total_cost_usd ?? null,
      usage: { input_tokens: result.usage?.input_tokens ?? null, output_tokens: result.usage?.output_tokens ?? null },
      modelUsage: result.modelUsage ?? null,          // WHO answered: `model` alone echoes the request
      permissionDenials: result.permission_denials ?? [] };
  }
  ```
  Header: what/why (the screen's one Claude call, injected into `screenSession` by the route and by the CLI,
  never imported by `discovery-screen.mjs` because CI has no `portal/node_modules`). It also names the
  answered/no-answer boundary.
- **PATTERN**: `discovery-proposer.mjs:263-299`; `import-run.mjs:583-600`.
- **GOTCHA**: **The answered/no-answer line** (memory: SDK error result wears success). `subtype:'success'` with
  `is_error:true` carries the CLI's own error text ("Credit balance is too low") and is **no answer**. Throw so it
  becomes `unavailable` on the route. In the CLI, nothing is written and the attempt can be repeated.
- **GOTCHA**: the init message's fields are confirmed in 0.1.77 (`coreTypes.d.ts:475-499`, `SDKSystemMessage`):
  `tools: string[]`, `mcp_servers: {name,status}[]`, `model: string`, `cwd`, `skills`. Assert `tools.length === 0`
  **and** `mcp_servers.length === 0`, and record `skills` too (expected `[]` with `settingSources` omitted). Do not
  assert on `slash_commands`, which lists built-ins.
- **GOTCHA**: `maxTurns: 1` with no tools: a result of `error_max_turns` would mean the harness wanted a second
  turn. That is no answer, and it throws.
- **GOTCHA**: do not add `canUseTool: async …` here or in the transport. Group 30 case 12 refuses an inline
  `canUseTool: async` in `discovery-transport.mjs` ("a second copy of the fence"). With `tools: []` and no MCP
  server there is nothing to fence, and the init assertion is the evidence.
- **VALIDATE**: `cd portal && node -e "import('./lib/discovery-screen-call.mjs').then(m=>console.log(typeof m.askScreen))"` (expected `function`; this makes **no** call)
- **SATISFIES**: AC 1, AC 7 · **REGENERATES**: none

### Task 6 — UPDATE `portal/server.mjs:209-221`

- **IMPLEMENT**: `import { askScreen } from './lib/discovery-screen-call.mjs';` and `screen = await
  screenSession(root, documentOf(view.answers).text, { ask: askScreen });`. Keep `b.screen === true &&
  view.created && …` exactly. Update the comment: Claude, not Jev, and still off unless asked.
- **GOTCHA**: 45.7's regex `if\s*\(\s*b\.screen\s*===\s*true\s*&&\s*view\.created` must still match.
- **VALIDATE**: portal smoke on a private free port. Memory: kill only your own PID (`kill $!`), never by port or
  by name. Start `node server.mjs` from `portal/` in the background, with the port override `portal/lib/env.mjs`
  reads (check the variable name there), then `curl -s localhost:<port>/api/health` → `ok`, then `kill $!`. The
  #453 report (`.claude/reports/jev-contradiction-screen-453-report.md:87`) records the same smoke.
- **SATISFIES**: AC 7 · **REGENERATES**: none

### Task 7 — UPDATE build-checks 45.6 (fail-visible through the Claude path)

- **IMPLEMENT**: replace the cases that drive `screenSession` through the real `askJev`. The new cases are:
  - (a) `screenSession(root, FIXTURE, {})` with no `ask` throws by name and writes **no** file;
  - (b) an injected `ask` that throws (`new Error('screen-call: no answer — error_during_execution: x')`) leaves
    exactly one `unavailable` line naming the reason, and no throw;
  - (c) an injected `ask` that rejects on timeout does the same;
  Keep the `writeScreen`/`readScreen` refusals, and extend `readScreen` to accept the two new types.
  **Delete** the old 45.6 positive control (inside 45.8, ~:14385-14389, which replays Jev through `screenSession`,
  a path that no longer exists). Jev's `screenDocument` replay in 45.8 stays. **Between this task and Task 15 the
  success path has no replay control**, because `claude-fixture-run.json` does not exist until Task 14. The
  success-path control is added in Task 15 as case (d). Do not reference the run file here, or every commit before
  the paid run reds on a missing file.
- **GOTCHA**: `askJev`'s missing-key and 429 cases belong to group 44 (`jev.mjs`). They leave 45.6, and nothing
  about `jev.mjs` changes. Say so in the gate prose.
- **REDDENS**: remove the try/catch in `screenSession` → (b) reads `screenSession threw on an ask failure instead of
  writing unavailable`. Delete the missing-`ask` refusal → (a) reads `screenSession with no ask wrote …`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "jev screen|45\.6"`
- **SATISFIES**: AC 6 · **REGENERATES**: none

### Task 8 — UPDATE `tooling/jev-screen.mjs`: the `--claude` mode (dry by default)

- **IMPLEMENT**:
  - `node tooling/jev-screen.mjs <doc> --claude` is **FREE**. It prints `claudeRequest(text)` (system and prompt
    lengths, the first and last 200 characters of the prompt), `claudePromptSha()`, the model, the doc md5 and
    which output file a paid run would write (fixture → `claude-fixture-run.json`; `docs/epics/discovery-partner.prd.md`
    → `claude-live-run.json`; anything else → "nothing"). It also refuses if that file exists. **Self-check**: it
    maps one 8-word window per rubric join side through `mapQuote` and prints `mapper reaches all 13 joins ✓`.
    It never imports the SDK.
  - `--claude --paid <sha8>` is **PAID** (≈ $0.04). `<sha8>` must equal the first 8 hex of `claudePromptSha()`:
    the operator can only type it after reading the dry run, and it cannot match if the code drifted from what the
    dry run printed. **The pre-registration interlock** refuses before any SDK import unless all of these hold,
    each naming what failed:
    - (i) the rubric contains `promptSha = <claudePromptSha()>` (the code is what was registered);
    - (ii) `git status --porcelain -- portal/lib/discovery-screen.mjs portal/lib/discovery-screen-call.mjs
      docs/epics/fixtures/discovery-partner.screen-rubric.md tooling/jev-screen.mjs tooling/jev-screen/` is empty
      (nothing unregistered is in play);
    - (iii) the last commit touching the rubric is on a remote branch: `git branch -r --contains <sha>` is non-empty
      (the receipt was pushed before the run);
    - (iv) for the fixture and live runs, `claude-smoke-run.json` exists (the mechanism was proven first, below).

    Then dynamic `await import('../portal/lib/discovery-screen-call.mjs')` inside this branch only, so every other
    mode stays SDK-free, and:
    1. refuse if the output file exists ("one run — never re-run");
    2. `ranAt = new Date().toISOString()`;
    3. call `askScreen(claudeRequest(text), { timeoutMs: CLAUDE_SCREEN.timeoutMs })`;
    4. **on a throw** (no answer), print the reason and exit 1, **writing nothing**. A repeat is allowed only for a
       no-answer, and the report counts every attempt and its cost;
    5. **on a return** (answered), build `claudeLines` and **always write** the file, parseable or not:
       `{ $description: GENERATED, model, ranAt, docMd5, claimsVersion, promptSha, request: claudeRequest(text),
       response: <askScreen's return verbatim>, lines }`, plus, for the live file only, `text` (the screened
       document verbatim) so the replay is self-contained;
    6. print the kept pairs and, for the fixture, `scoreClaudeRun(lines)`'s table (Task 13).
  - `--claude --smoke --paid <sha8>` is **PAID** (≈ $0.01), **never scored**, and takes no document argument. It
    screens `SMOKE_DOC`, a synthetic 12-line document committed as a frozen constant in `tooling/jev-screen.mjs`.
    It describes an invented product ("Kettle Club", a tea subscription) and carries **one planted contradiction**
    ("Every box ships on the first Monday of the month." against "Boxes ship on the 15th of each month."). It shares
    no word, section or number with the fixture, the rubric or run 2. The run goes through the same `askScreen`,
    `claudeRequest`, `claudeLines` and interlocks (i)–(iii), and writes `claude-smoke-run.json` once, in the same
    shape. Its purpose is the mechanism only: init advertised no tools, the registered model answered
    (`modelUsage`), the result parsed and `parsedBy` is recorded, and the mapper resolved the quotes against a
    document the model really quoted. It proves the harness before the one scored run, without spending that run.
    If the smoke answers but shows a **harness** defect (tools advertised, a non-success subtype, a timeout), the
    fix is an AMENDMENT committed and pushed before the fixture run. What may change is pre-registered in Task 11:
    harness options only, **never** the prompt, the model, the output shape, the parse or the scoring.
  - `--claude-labels-template` is **FREE**. It writes `tooling/jev-screen/claude-labels.json` (`{ by: null, at:
    null, screens: { 'claude-fixture': [...], 'claude-live': [...] } }`, each kept pair `{a, b, real: null, note:
    ''}`). It refuses to overwrite a file whose `by` is set.
- **PATTERN**: `--diagnostic` (`:104-136`) for write-on-success-only; `--labels-template` (`:71-83`).
- **GOTCHA** (the one-run hazard; memory: empty env var does not blank a key). The SDK authenticates through the
  CLI login, so **there is no key to unset**, and any `--paid` invocation that passes the interlocks spends the
  run. `--paid <sha8>` is explicit, and the dry run is the default. Run `--claude` (dry) and read its output before `--paid`, every
  time. #465 lost its planned no-key check exactly this way.
- **GOTCHA**: update the CLI header's mode list (it says "Five modes").
- **REDDENS** (manual, each recorded in the report, none makes a call): `--paid deadbeef` → `sha8 deadbeef is not
  claudePromptSha's <8hex>`; a one-word edit to `CLAUDE_SCREEN.system` with no rubric change → `the rubric does not
  register promptSha <64hex>`; an unpushed rubric commit → `the pre-registration commit <sha> is on no remote
  branch — push it first`; the fixture `--paid` with no smoke file → `run the smoke first`.
- **ADD** an unknown-flag refusal at the top of the CLI: any `--x` outside `--claims --smoke --diagnostic
  --labels-template --claude --paid --claude-labels-template` exits 1 naming the flag. `--smoke` keeps its Jev
  meaning without `--claude`, and means the Claude smoke with it. Today a typo like
  `--claud` on the fixture falls through to the **paid Jev run**, which writes `screen-run.json` without checking
  whether it exists (`:180-203`): it spends money and overwrites committed evidence. **REDDENS** (manual, recorded
  in the report): `node tooling/jev-screen.mjs <fixture> --claud` must print `unknown flag --claud` and make no call.
- **VALIDATE**: `node tooling/jev-screen.mjs docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md --claude` (expected: the sha, `→ would write tooling/jev-screen/claude-fixture-run.json`, `mapper reaches all 13 joins ✓`; no network)
- **SATISFIES**: AC 1, AC 3, AC 4 · **REGENERATES**: none

### Task 9 — UPDATE `portal/public/portal.js:974-976` (copy only)

- **IMPLEMENT**: `'Screening the document for contradictions (Claude) — this can take a few minutes.'`. Change the
  comment at :956-957 to name #466. **`const SCREEN_AUDIT = false;` is untouched.**
- **GOTCHA**: 45.7 pins `/const SCREEN_AUDIT = false;/` and `/screen:\s*SCREEN_AUDIT/`.
- **VALIDATE**: `grep -n "SCREEN_AUDIT" portal/public/portal.js` (expected: `false` at the const, and unchanged uses)
- **SATISFIES**: AC 7 · **REGENERATES**: none

### Task 10 — UPDATE `discovery/prd-projection.mjs`: render Claude screen lines

- **IMPLEMENT**: at the top of `renderTensions`, after the `unavailable` branch, branch on `screen.find(l =>
  l?.type === 'claude-summary')`:
  - header: `` Claude `<model>` · <claims> claims · <returned> pair(s) returned · <kept> kept (both quotes on one claim each)<parse ≠ ok ? ` · answer unparseable: <reason>` : ''>. Machine screen, unverified: a pair below is what a model flagged, not a finding. ``
  - no kept → `The screen ran and kept no pair.`
  - per kept `quoted-pair` in `index` order: `` #### <a.id> ↔ <b.id> · quoted · <raised by the audit (seq N, rule) | not raised> ``,
    then the two claims exactly as the Jev path renders them (`*id* — section:` plus `blockquote(text)`), then
    `*Why (model):* <fold(why)>`, then `*Owner's verdict:* _not recorded here — see tooling/jev-screen/claude-labels.json_`.
  - The Jev path below stays byte-for-byte.
- **UPDATE** the section comment (:753-757) to name both line families.
- **GOTCHA**: all 11 committed `prd.md` files and partner-audit-3's Tensions section must stay byte-identical
  (45.9 byte-compares partner-audit-3; group 31/32 re-project the others). `raisedBy` is unchanged: it reads
  `a`/`b` `id`/`text`, which the new kept lines carry.
- **VALIDATE**: 45.9 (Task 12) plus `node tooling/build-checks.mjs` (groups 31/32 green)
- **SATISFIES**: AC 7 · **REGENERATES**: none

### Task 11 — PRE-REGISTER: append §"One Claude call over the whole document" to the screen rubric (its OWN commit)

- **IMPLEMENT**: in `docs/epics/fixtures/discovery-partner.screen-rubric.md`, after §Diagnostic's Result, add:
  - **Why**: #465's FAIL branch, and the issue link.
  - **Who wrote it, and when**: the session, before any paid call of #466. This commit is the receipt. Its sha goes
    into the PR body and the report (squash merges erase it from `main`, so keep the branch).
  - **What is sent**: `claudeRequest(fixture)` exactly. Name the model, and `promptSha = <the value
    claudePromptSha() prints now>`. Paste the system text verbatim in a fenced block. The prompt is the document
    between the delimiters. Harness options: `tools: []`, `allowedTools: []`, no MCP server, `strictMcpConfig`,
    `maxTurns: 1`, no `settingSources` (no CLAUDE.md or settings), and a temp `cwd`. Nothing else leaves the
    machine: no rubric, no labels, no run-2 file.
  - **Output shape and parse**: Task 3's rule, verbatim, including that a malformed item is dropped and that an
    unparseable answer is the run.
  - **The mechanism smoke, and what "nothing moves" covers**. The issue fixes four things at this commit: the
    prompt wording, the model, the output shape and the scoring rule (this section adds the parse and the mapping,
    which are part of the output shape and the scoring). **None of them moves after this commit, for any reason.**
    Before the fixture run, one paid call screens the synthetic `SMOKE_DOC` (quoted here verbatim). It is never
    scored and shares nothing with the fixture or the rubric, so it gives no score to tune against. Its only job
    is to prove the harness: no tools advertised, the registered model answering, a result that parses. If it
    exposes a harness defect, only the **harness options** (`cwd`, `maxTurns`, `timeoutMs`, the
    tools/MCP/settings isolation and the SDK plumbing in `discovery-screen-call.mjs`) may change, by an amendment
    to this section, committed and pushed before the fixture run. A smoke whose answer merely disagrees with the
    planted contradiction changes nothing.
  - **Who answered**: `result.modelUsage` must carry the registered model as a key. If the harness also bills
    another model (for example a small helper call), that key is reported with its cost and never changes the
    score. If the registered model is absent, the run was answered by another model: it is reported as that
    and scored as registered, never re-run.
  - **Answered vs no answer**: a no-answer (a transport error, an abort or timeout, no result, a non-success
    subtype, `is_error: true`) writes nothing and may be repeated, and every attempt is reported. The first
    **answered** call is the run: written whatever it says, scored as registered, never repeated.
  - **Quote → claim mapping**: Task 2's rule, verbatim, including the five named cases (no claim, two claims by
    repetition, crossing a boundary, heading-only, both quotes on one claim) and the ellipsis rule.
  - **Kept**: Task 2's `kept` rule and `K = 10`.
  - **Scoring**: a finding is **FOUND** when a kept pair joins it (the joins of §Contradiction class and
    §Tension-shaped, via `DIAGNOSTIC_JOINS` minus the controls; #8 needs two distinct positions). It is **OUTSIDE
    K** when only a mapped, non-kept `outside-K` pair joins it, and **MISSED** otherwise. Never rounded up. An
    ambiguous or unmapped side joins nothing. Report contradiction-class `found / 3`, itemise the tension-shaped
    findings beside it (never added), and list every returned pair with its mapping status. Precision = owner-judged
    real / kept, from `claude-labels.json`, reported "pending the owner" until `by: "owner"`.
  - **The live check**: one paid call on `docs/epics/discovery-partner.prd.md` at its md5 when run, reported beside
    the fixture score and never pooled with it. It is not scored against this rubric, because the live PRD is the
    document the findings were fixed in. Kept pairs are listed for the owner's labels.
  - **Decision tied to the result**: if ≥ 1 contradiction-class finding is FOUND, a later ticket *may* turn the
    screen on (issue req. 5). This ticket turns nothing on.
  - "No wording, model, K, mapping or scoring rule moves after this commit."
- **GOTCHA**: this commit touches **only** the rubric (and, if the owner edits the wording, the one constant in
  `discovery-screen.mjs`, whose new `promptSha` goes in the same commit). Run the dry mode after the commit and
  confirm it prints the registered sha.
- **GOTCHA**: **push the branch to origin right after this commit and before Task 14** (`git push -u origin
  <branch>`). A local commit's timestamp is weak evidence, and a squash merge plus branch auto-delete can erase
  it (memory: stacked PR squash; #465's receipt `b2cbd3d` survives only on a kept branch). Record the **pushed** sha
  (`git ls-remote origin <branch>`) in the report and the PR body. Keep the branch after merge.
- **VALIDATE**: `git log -1 --format='%H %cI' -- docs/epics/fixtures/discovery-partner.screen-rubric.md` and `git ls-remote origin <branch>` (the same sha), then `node tooling/jev-screen.mjs <fixture> --claude` prints the registered sha
- **SATISFIES**: AC 1, AC 2 · **REGENERATES**: none

### Task 12 — ADD build-checks 45.13 (the pure half, SYNTHETIC, labelled) and extend 45.9

- **IMPLEMENT** 45.13, which drives the pure functions directly with no `ask`:
  - `parseClaudeAnswer`: a fenced ```` ```json ```` answer parses (`parsedBy: 'fence'`); `Here are the pairs:
    {…} Hope this helps.` parses (`parsedBy: 'braces'`); `not JSON`; a top level with no `pairs`; one malformed
    item among two valid ones → 2 pairs + 1 malformed; an empty `pairs` → ok, 0.
  - normalisation, on the real fixture: a quote that uses ` - ` where the fixture has ` — ` maps; a quote ending in an
    added `.` maps; a quote with curly quotes where the fixture has straight quotes maps.
  - `mapQuote` on the **real fixture** (positive controls): for **every** claim id in a non-control join (13 ids,
    derived from `DIAGNOSTIC_JOINS.filter(j => j.class !== 'control')`, never retyped), an 8-word window taken
    from its **source lines** (`fixture-claims.json` `line`/`endLine` into the fixture text) maps `mapped` to that
    id. c044 is also quoted without its asterisks (`The bank itself. Seeded from`), which gives
    `c044`.
  - negatives: an ellipsis → `unmapped`; a string absent from the fixture → `unmapped`; the heading-only text
    `Target user and JTBD` (fixture :123, and nowhere else: observed by grep) → `unmapped` (its claim set is
    empty); `ten stages` (at :155 in c044 and :182 in c048: observed) → `ambiguous` by repetition; a span crossing
    two claims' lines → `ambiguous` by boundary.
  - **span sanity** (real data): every claim's `line` is greater than the previous claim's `endLine` in
    `fixture-claims.json`. An overlap would make a quote ambiguous by construction, and a 0/3 would then belong to
    the mapper. Observed in pre-flight: no overlaps.
  - `mapPairs`: both quotes on one claim → `same-claim`; a repeated pair → `duplicate`; 12 mapped pairs → exactly
    10 `kept`, then `outside-K`.
  - `tensionsOf` on synthetic Claude lines returns the kept pairs in index order with `contradicts: null`. On Jev
    lines it is unchanged (re-assert on `screen-run.json`'s lines, equal to the prior result).
  - `claudePromptSha()` equals the sha recorded in the rubric section. Read it from the rubric with a regex on
    `promptSha = <64 hex>`. This binds the code to the pre-registration.
- **EXTEND** 45.9: a synthetic `claude-summary` + one kept `quoted-pair` projects `#### cA ↔ cB · quoted · not
  raised`, `*Why (model):*` and the `claude-labels.json` pointer. An unparseable summary projects `answer
  unparseable`. partner-audit-3's byte compare is unchanged.
- **REDDENS**:
  - delete the backtick/asterisk strip in `normLine` → `45.13: c044 quoted without its asterisks mapped unmapped, not c044`;
  - change `ambiguous` to pick the first occurrence → `45.13: a span crossing two claims mapped c0xx, not ambiguous`;
  - edit one word of `CLAUDE_SCREEN.system` → `45.13: claudePromptSha … is not the pre-registered …`;
  - change `K` to 11 → `45.13: 12 mapped pairs kept 11`;
  - remove the `claude-summary` branch from `renderTensions` → `45.9: a synthetic Claude kept pair does not render its quoted heading, the model's why and the claude-labels.json pointer`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "jev screen"` (expected ✓)
- **SATISFIES**: AC 2, AC 6 · **REGENERATES**: none

### Task 13 — CREATE `tooling/jev-screen/claude-score.mjs`

- **IMPLEMENT**: `import { DIAGNOSTIC_JOINS, CONTRADICTION_FINDINGS } from './diagnostic.mjs'`. Take `JOINS =
  DIAGNOSTIC_JOINS.filter(j => j.class !== 'control')`. `scoreClaudeRun(lines)` returns `{ findings: [{ finding,
  class, state: 'FOUND'|'OUTSIDE K'|'MISSED', by: [pairIndex…] }], found: [...contradiction ids FOUND], of: 3 }`.
  A pair joins a finding's join `{a,b}` when its mapped ids equal `{a,b}` as a set. Header: pre-registered in the
  rubric §One Claude call; never calls Claude; imports `diagnostic.mjs` only.
- **GOTCHA**: `diagnostic.mjs` imports `discovery-screen.mjs`, which is fine in CI. Never import
  `tooling/jev-screen.mjs` (its top level parses argv and exits).
- **REDDENS** (via 45.14): make `scoreClaudeRun` ignore `kept` → the positive control's OUTSIDE-K case reads FOUND.
- **VALIDATE**: `node -e "import('./tooling/jev-screen/claude-score.mjs').then(m=>console.log(m.scoreClaudeRun([])))"` (expected: every finding `MISSED`, `found: []`)
- **SATISFIES**: AC 3 · **REGENERATES**: none

### Task 13b — PAID: the mechanism smoke (once, never scored)

- **IMPLEMENT**: `node tooling/jev-screen.mjs --claude --smoke` (dry: prints the smoke request and the sha), then
  `node tooling/jev-screen.mjs --claude --smoke --paid <sha8>`. Commit `tooling/jev-screen/claude-smoke-run.json`.
  Read the file and confirm: `response.init.tools` is `[]`, `response.init.mcpServers` is `[]`, the registered
  model is a key of `response.modelUsage`, `lines.at(-1).parse === 'ok'` and `parsedBy` is recorded. If a check
  fails for a **harness** reason, stop: amend per Task 11, commit, push, and only then continue. Do not re-run the
  smoke to get a nicer answer. A second smoke is allowed only after a harness amendment, as
  `claude-smoke-run-2.json`, and the first file stays committed.
- **GOTCHA**: interlocks (i)–(iii) apply, so the pre-registration commit must be pushed first.
- **VALIDATE**: `node -e "const r=require('./tooling/jev-screen/claude-smoke-run.json');console.log(r.response.init, Object.keys(r.response.modelUsage||{}), r.lines.at(-1))"`
- **SATISFIES**: AC 1 (the mechanism proven before the one scored run) · **REGENERATES**: none

### Task 14 — PAID: the fixture run (once)

- **IMPLEMENT**: (1) run the dry mode and read it; (2) `node tooling/jev-screen.mjs docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md --claude --paid <sha8>`;
  (3) commit `claude-fixture-run.json` as its own commit. The printed score goes into the rubric's §Result and the
  PR body **as computed**, never edited.
- **GOTCHA**: confirm Phase 4's commit precedes `ranAt` (`git log -1 --format=%cI` vs the file). If the call
  errors with no answer, record the attempt and its reason in the report before repeating.
- **VALIDATE**: `node -e "const r=require('./tooling/jev-screen/claude-fixture-run.json');console.log(r.model,r.ranAt,r.promptSha,r.response.costUsd,r.lines.at(-1))"`
- **SATISFIES**: AC 3 · **REGENERATES**: none (the run file is generated by the run itself)

### Task 15 — ADD build-checks 45.14 (replay the fixture run)

- **IMPLEMENT**:
  - **bound**: `model === CLAUDE_SCREEN.model`, `docMd5 === md5(FIXTURE)`, `claimsVersion === C.CLAIMS_VERSION`,
    `promptSha === claudePromptSha()`, and `request` deep-equal to `claudeRequest(FIXTURE)`;
  - **invariant 1 evidence**: `response.init.tools` is an array of length 0, and `response.init.mcpServers` is
    empty or absent;
  - **replay**: `screenSession(tempRoot(), FIXTURE, { ask: replay })`. The replay asserts it received exactly
    `claudeRequest(FIXTURE)` and `timeoutMs === CLAUDE_SCREEN.timeoutMs`, then returns `response` verbatim. The
    written lines minus `ts` equal the file's `lines` minus `ts`;
  - **score**: `scoreClaudeRun(lines)` equals the numbers pinned in a literal that mirrors the rubric's §Result
    (found/3 and each finding's state);
  - **model evidence**: `response.modelUsage` (captured verbatim by `askScreen`, Task 5) has the registered
    model as a key. Any other key is handled by the rule pre-registered in Task 11 (reported, never scored).
    `response.permissionDenials` is `[]`;
  - **45.6 (d), moved here**: the same replay through `screenSession` writes only `quoted-pair`/`claude-summary`
    lines and returns `status:'ran'`;
  - **positive control** (in memory): clone `response`, replace `resultText` with a JSON answer whose one pair
    quotes 8-word windows from c043's and c077's source lines. That must score #6 FOUND. The same pair placed 11th
    behind 10 other mapped pairs must score OUTSIDE K.
- **ALSO REPLAY the smoke** (`claude-smoke-run.json`, and `-2` if present) the same way over the embedded
  `SMOKE_DOC`: request and sha bound, init tools empty, lines reproduced. No score. This puts **real** model output
  through the mapper in CI, beside the synthetic cases.
- **ADD** a source pin: `tooling/build-checks.mjs` never names `discovery-screen-call.mjs` or `askScreen` outside a
  string literal, so CI cannot spend. **REDDENS**: add `import("../portal/lib/discovery-screen-call.mjs")` to group
  45 → `45.14: build-checks reaches the paid call`.
- **REDDENS**: flip one kept line's `kept` in memory → the lines compare fails at that index. Edit `CLAUDE_SCREEN.K`
  → `45.14: … differs`. Make the scorer ignore `kept` → the positive control's OUTSIDE-K case reads FOUND.
- **GOTCHA**: `if (!existsSync(file)) ok(false, …)`. Absence must red, never skip (memory: the check that cannot fail).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "jev screen"`
- **SATISFIES**: AC 3, AC 6 · **REGENERATES**: none

### Task 16 — PAID: the live run (once), then ADD 45.15

- **IMPLEMENT**: dry, then `node tooling/jev-screen.mjs docs/epics/discovery-partner.prd.md --claude --paid <sha8>`
  (observed md5 today `e820f96bf32f0dc3930779abb6fba61a`, 51,471 bytes; record the md5 at run time). Commit
  `claude-live-run.json`.
- **ADD** 45.15: `docMd5 === md5(run.text)` (the **embedded** text, never the working-tree file, so a later edit to
  the live PRD cannot red CI or silently skip); `promptSha` and `request` bound to `claudeRequest(run.text)`; the
  init tools are empty; the replay through `screenSession` over `run.text` with `splitClaims(run.text)`
  reproduces `lines`. No score (the live PRD is not scored).
- **REDDENS**: change one character of `run.text` in memory → `45.15: the embedded text's md5 is not docMd5`.
- **SATISFIES**: AC 4, AC 6 · **REGENERATES**: none

### Task 17 — FREE: the owner's label template, then the docs and gate prose

- **IMPLEMENT**:
  - `node tooling/jev-screen.mjs --claude-labels-template`, then commit `claude-labels.json` (`by: null`).
  - **Extend 45.11**: when `claude-labels.json` exists, its `claude-fixture`/`claude-live` pairs equal
    `tensionsOf` of each run exactly, and when `by === 'owner'` every `real` is boolean.
    **REDDENS**: drop one pair from the template in memory → `45.11: claude-labels.json is missing cX ↔ cY from claude-fixture`.
  - The rubric §Result: the table as `scoreClaudeRun` printed it, precision "pending the owner (claude-labels.json
    `by: null`)", the live run's kept pairs listed beside it, cost (`costUsd` observed) and every attempt.
  - `discovery/README.md` §The contradiction screen and the line-type list at :90-92: add `quoted-pair ·
    claude-summary`, and say that the route runs Claude and that the Jev lines are the #453 record.
  - **Gate prose, all three copies** (memory: gate prose has three copies): the group-45 header comment
    (~:14154), the `group("jev screen", …)` string and `.claude/references/gates.md:82`. Cover 45.6 re-pointed,
    45.13–45.15 and 45.11 extended. The "cannot reach" line adds: the live API's behaviour today, run-to-run
    variance (one run each), whether Claude's pairs generalise beyond one fixture, and the route (unchanged reason).
- **SATISFIES**: AC 3, AC 6 · **REGENERATES**: none (`drift-check`'s group-count stays 45; no new group)

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). The gate is `tooling/build-checks.mjs` group 45.

### Unit (pure, in CI)

45.13 on SYNTHETIC inputs covers the parser, the mapper and `mapPairs`. It adds positive controls on the **real
fixture** proving that the mapper can reach every rubric join. Without that, a 0/3 could be a mapper failure.

### Integration (replay, in CI)

45.14 and 45.15 run `screenSession` through a verbatim replay of each committed response and bind the model, the
prompt sha, the request, the document and the claims version. 45.6 covers fail-visible behaviour with injected
failures only.

### Edge Cases

An ellipsis in a quote. A quote in a heading only. A quote repeated in two claims. A quote crossing a claim
boundary. Both quotes in one claim. A duplicate pair. More than K mapped pairs. A fenced JSON answer. One malformed
item. A wholly unparseable answer (the run still counts). A `success` result with `is_error: true` (no answer). A
timeout (abort, no answer). Init advertising a tool (refused before the model answers).

### Proving the checks

Every new case has a REDDENS mutation above. Run each mutation once, confirm the named message, restore, and
confirm `git diff` is clean. Put the table in the report. The positive controls (13 joins reachable; c043/c077
FOUND; OUTSIDE K) are run before any green is trusted.

---

## VALIDATION COMMANDS

### Level 1: Syntax
`node --check portal/lib/discovery-screen.mjs portal/lib/discovery-screen-call.mjs tooling/jev-screen.mjs tooling/jev-screen/claude-score.mjs discovery/prd-projection.mjs`

### Level 2: The gate
`node tooling/build-checks.mjs` → `build ✓  all 45 groups pass`, and `node tooling/drift-check.mjs` → ✓. Stage the
new files first: memory records that loc-summary and syntax read tracked content, though no loc group matches
these paths.

### Level 3: Dry run (free)
`node tooling/jev-screen.mjs docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md --claude`
`node tooling/jev-screen.mjs docs/epics/discovery-partner.prd.md --claude`

### Level 4: Manual
Portal smoke on a private port: `/api/health` ok. Then POST `/api/discovery/session` for a throwaway fictional
existing-prd package **without** `screen: true` and confirm no `screen.jsonl` is written. Do **not** send `screen:
true` (that is a paid call). Kill only your own PID.

### Level 5: Mutation table (Task 12/14/15/16/17 REDDENS), recorded in the report.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Q2: the owner confirms the model (and optionally the wording) before Task 11 | owner's hand | yes | — |
| Task 13b: mechanism smoke on `SMOKE_DOC`, never scored | ≈ $0.01 (derived: ~1.5k in × $2/M + ~1k out × $10/M) | yes | — |
| Task 14: fixture run, `claude-sonnet-5` | ≈ $0.04 (derived: ~11k in × $2/M + ~2–4k out incl. thinking × $10/M ≈ $0.04–0.06) | yes | — |
| Task 16: live run | ≈ $0.07 (derived: 51 KB ≈ 2.1× the fixture's input) | yes (issue req. 4) | — |
| Owner's precision labels in `claude-labels.json` | owner's hand | no, but **AC 3b is reported NOT MET** until `by: "owner"` | open the tracker ticket **before** the PR, and name it in the report's Not run |
| Owner confirms the itemised score at PR review | owner's hand | no (rubric scoring rule 5) | PR review |

---

## ACCEPTANCE CRITERIA

- [ ] AC 1: a pre-registration commit touching only the rubric (plus the one constant, if the owner edited it)
      fixes the prompt (verbatim + `promptSha`), the model, the output shape and parse, and the scoring. It precedes
      both runs' `ranAt`, and its sha is in the PR body.
- [ ] AC 2: the rubric states the quote → claim mapping through `fixture-claims.json` line spans, including "no
      claim" and "two claims". 45.13 drives it on synthetic cases and reaches all 13 joins on the real fixture.
- [ ] AC 3a (session): the fixture run is committed verbatim. The rubric's §Result reports contradiction-class
      `found / 3` with the tension-shaped findings itemised beside it, computed by `scoreClaudeRun`.
- [ ] AC 3b (owner): precision = owner-judged real / kept, from `claude-labels.json` signed `by: "owner"`. Reported
      **NOT MET** until then, never as "met, pending". The session writes no verdict.
- [ ] AC 4: one live run on `docs/epics/discovery-partner.prd.md` is committed with its text embedded, and reported
      beside the fixture score, never pooled.
- [ ] AC 5: `SCREEN_AUDIT = false` and `b.screen === true` are unchanged (45.7 green), whatever the score.
- [ ] AC 6: 45.6 re-pointed, 45.13/45.14/45.15 added and 45.11 extended. Each is reddened once by its named
      mutation. `node tooling/build-checks.mjs` → `all 45 groups pass`.
- [ ] AC 7: the route injects `askScreen`, Jev lines project byte-identically (partner-audit-3 plus 11 `prd.md`
      files), and `/api/health` answers.

## COMPLETION CHECKLIST

- [ ] Phase 0 PR merged, and its six files are on `main` (`git ls-tree origin/main tooling/jev-screen/diagnostic.mjs`)
- [ ] Tasks 1–17 in order, each VALIDATE run
- [ ] Mutation table in the report
- [ ] Plan, report and review in the PR; `Closes #466` in the body

---

## RISK REGISTER — each risk, its mitigation, and what is left

| Risk | Mitigation in this plan | Left after mitigation |
|---|---|---|
| **R1** An accidental paid call spends the one run. There is no key to unset: the SDK authenticates through the CLI login. | The dry run is the default. `--paid <sha8>` needs the prompt sha, which the operator can only copy from the dry run. Four interlocks refuse before the SDK is imported: rubric registers the sha, tree clean, receipt pushed, smoke done. An output file that exists is refused. Unknown flags are refused, which closes the typo → paid-Jev path. build-checks is pinned never to reach `askScreen`. Every interlock has a named REDDENS that makes no call. | None the code can close further. A deliberate `--paid <sha8>` is the intended act. |
| **R2** The harness behaves differently from its types (tools advertised, a second turn, a different model, a timeout). | A **pre-registered mechanism smoke** on the synthetic `SMOKE_DOC` runs before the scored run (Task 13b). The init guard aborts before the model answers. `modelUsage` records who answered. The timeout is 300 s. A no-answer never counts as the run. Only harness options may change after the smoke, and the rubric says so before any call. | Covered. A harness surprise costs one ≈ $0.01 smoke, not the scored run. |
| **R3** The answer does not parse, and an unparseable answer is the run. | The shape is stated in the prompt. The parse tolerates a fence and prose around the object (the `braces` fallback), extra keys, and one malformed item. The smoke shows Sonnet's real formatting before the scored run. `parsedBy` is recorded. | Only an answer with no JSON object at all fails. That is a real result, recorded as one. |
| **R4** 0/3 comes from the mapper, not the model. | Quotes map by source lines, not reformatted claim text. The normalisation covers markdown markers, links, curly quotes, dashes, NBSP and a trailing full stop, each justified by observed fixture content. 45.13 proves all 13 join claims reachable, spans non-overlapping (observed), and each normalisation case on the real fixture. The smoke and both runs replay real model quotes through the mapper in CI. Every unmapped or ambiguous quote is listed in the result, so a mapper-caused miss is visible, never silent. | A quote the model paraphrased stays unmapped by the pre-registered rule. That is the model's miss, and it is shown. |
| **R5** Precision needs the owner's labels. | The labels template is generated automatically. AC 3b is split out and reported NOT MET until `by: "owner"`, and the tracker ticket is opened before the PR. | The owner's hand. It does not bear on whether the implementation succeeds in one pass. |
| **R6** Stacked-PR loss and a lost receipt. | Phase 0 re-lands #465 as its own PR. The pre-registration commit is pushed before the run (interlock iii), and its pushed sha is recorded. The branch is kept after merge. | None. |

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 — Phase 0 as its own PR.** Recommended, because #465's content belongs on `main` whatever this ticket does.
  The alternative is folding the six files into this ticket's first commit. That works, but it mixes a re-land into
  a pre-registered ticket.
- **Q2 — the model.** Default `claude-sonnet-5` ($2/$10). It is the only model consistent with the issue's
  $0.03–0.05. `claude-opus-5` ($5/$25) would cost ≈ 2.5× that (≈ $0.10–0.15 per audit open), and it is what Grill
  runs on. The owner answers before Task 11's commit, not before implementation starts.
- **Q3 — the draft wording** (Task 1). It deliberately names no finding, section, number or example. The owner may
  edit it before Task 11. After that it is frozen.
- **A1**: harness auth is the Mac CLI login (memory), so no `portal/.env` key is needed. This also means a paid
  call cannot be prevented by unsetting a key (Task 8 GOTCHA).
- **A2**: 300 s is enough for one Sonnet call on ~11k input tokens (the live PRD, ~2.1× that). An abort is a
  no-answer, not the run. The smoke's `durationMs` is the first observation, and it arrives before the scored run.
- **A3**: the SDK's `system`/`init` message carries `tools` and `mcp_servers` in 0.1.77 (read in pre-flight,
  `coreTypes.d.ts:475-499`). Whether the harness honours `tools: []` by advertising none is first observed on the
  **smoke**, not the scored run. If init advertises a tool, `askScreen` aborts before the model answers: no answer,
  nothing written, and a harness amendment lands before any retry.

## NOTES (open canvas)

**Why "replace" means the route, not the module.** Deleting Jev's `screenDocument`, `judgePairs` and the rest would
break 45.8 and 45.12, which replay the committed evidence of #453/#465. Those files are the reason this ticket
exists. The route swaps its screen, and the Jev half stays importable as the measured record. The header says so.

**Why map through source lines.** The rubric already maps anchors by `line ≤ N ≤ endLine` (:23). Claim text is
reformatted (tables, list markers, joins), so a verbatim quote from the document often is not a substring of any
`claim.text`. Mapping through the document's lines uses the rubric's own rule, and it handles table cells and
c044's bold lead-in. Stripping `*`, `_` and backticks on both sides handles the likeliest formatting mismatch (a
model quoting "The bank itself." without the asterisks).

**Why "ambiguous never counts".** The issue asks how a quote that matches two claims is scored. Counting it would
round up: it would credit a side the model did not pin down. The rubric's own rule is "never rounded up" (:98).

**Why the unparseable answer is the run.** Otherwise a bad answer could be discarded and re-asked, which is a
re-run for a better score by another name. The parse rule is lenient where it costs nothing (a fence, extra keys, a
single malformed item) and strict at the top level.

**Why not `outputFormat`.** See Task 1's GOTCHA. The mechanism cannot be proven without a paid call before the
pre-registration.

**Pre-flight (what was run, what it said, what changed):**
- `gh issue view 466` and `gh pr view 464/465`: #465 merged at 11:32:44Z into `feat/jev-contradiction-screen-453`,
  20 s after #464 squashed into `main`. `git ls-tree origin/main` has no `diagnostic.mjs` or
  `diagnostic-run.json`, and `git diff --stat origin/main origin/feat/jev-contradiction-screen-453` gives exactly
  six files, +669/−8. **This added Phase 0** and moved every build-checks citation onto the main+#465 tree.
- `node tooling/build-checks.mjs` on main+#465 (scratch worktree): group 45 ✓ (45.1–45.12). The one failure was
  41.7, "phosphor … missing", from the fresh worktree with no `tooling/icons` install. **This added the `npm ci`
  GOTCHA to Task 0.**
- `node tooling/drift-check.mjs`: the same icons-install failure. It is environmental.
- `grep outputFormat` in the SDK `.d.ts`: first run on `sdk.d.ts` alone gave a false negative. Found in
  `entrypoints/sdk/runtimeTypes.d.ts:413`, alongside `settingSources` at :507 (omitted means isolation) and
  `abortController` at :234. `SDKResultMessage` (`coreTypes.d.ts:442-470`) has `structured_output` and the
  `error_max_structured_output_retries` subtype. **Decision recorded: plain JSON plus a pre-registered parse, with
  `outputFormat` rejected and the reason written down.**
- `fixture-claims.json` c018 reads `What: … · Where: …` (a table row, reformatted), which confirms that claim text
  is not verbatim document text. **This fixed the mapping to source lines.**
- `labels.json` `by` is already set ("claude (session verdict at the owner's instruction…)"), so
  `--labels-template` refuses. **This gave a separate `claude-labels.json` and its own template mode.**
- Live PRD: 51,471 bytes, md5 `e820f96b…` today. It is not frozen, **so 45.15 binds embedded text**, never the
  working-tree file.
- `gen-loc-summary.mjs` GROUPS match only `system/`, root/proto `.html` and `agent-layer/`. **No loc-summary or VR
  cascade.**
- 45.7's source regexes (`discovery.mjs` `tensions:` line, the `server.mjs` `b.screen === true`, the drawer's
  `SCREEN_AUDIT`): **Tasks 3, 6 and 9 carry GOTCHAs to keep them matching.**
- `fixture-claims.json` span order: no claim's `line` is ≤ the previous claim's `endLine` (observed: "overlaps:
  none"). **This made the span-sanity assertion a real-data case in 45.13.**
- Fixture grep: `ten stages` occurs at :155 (c044) and :182 (c048), and `Target user and JTBD` only at :123 (a
  heading). **These fixed 45.13's two negatives to named, verified inputs.**
- A second review pass (advisor) caught the missing run file before Task 14 (**moved 45.6 (d) into Task 15**),
  precision written as optional (**split AC 3**), `model` echoing the request (**added `modelUsage`**), an
  unpushed receipt (**push before the run**), and the CLI's typo-to-paid-Jev path (**unknown-flag refusal**).
- Traps carried from memory: shared worktree; SDK error result wears success; empty env var does not blank a key
  (here, no key at all); the check that cannot fail; gate prose has three copies; portal smoke kills only its own
  PID; stacked PR squash loses children (the Phase 0 cause, and the pre-registration receipt's exposure).

**Confidence: 10/10 for one-pass implementation**, with Q1–Q3 answered or taken at their defaults. Every citation
was resolved on the tree it names. Every existing-code command was run. Every new check has a named mutation. The
one uncontrollable factor, the harness's behaviour on a paid call, is now observed on a pre-registered,
never-scored smoke **before** the scored run, instead of during it (R2). What a 10 does not promise is the
**score**: the fixture may still come out 0/3. That is the measurement this ticket exists to make, not an
implementation failure.

## AMENDMENTS

- 2026-09-27 — before execution, at the owner's request ("address risks, confidence to 10"):
  - added the RISK REGISTER;
  - the pre-registration interlock (`--paid <sha8>` plus four refusals) and the build-checks pin that it never
    reaches the paid call;
  - the pre-registered mechanism smoke on a synthetic document (Task 13b, replayed in 45.14);
  - the parse's `braces` fallback and `parsedBy`;
  - dash, NBSP and trailing-punctuation normalisation, justified by observed fixture counts (59 em dashes, 2 en
    dashes, 4 links, no ellipses);
  - the timeout raised from 180 s to 300 s.

- 2026-09-27 — during execution (piv-implement):
  - **Q1–Q3 answered by the owner**: Phase 0 as its own PR (#467), stacked; the model is **`claude-opus-5`**, not
    the default `claude-sonnet-5` (the owner's choice after asking which is better; the rubric records the budget
    overrun as deliberate); the Task 1 wording as drafted; the three paid runs in this session.
  - **(plan error) Task 12's sha pin cannot ship with Phases 1–3.** The rubric's `promptSha` line does not exist
    until Task 11, and Task 11's commit may touch only the rubric, so the pin would red every commit before it.
    It landed as its own commit straight after the pre-registration commit.
  - **(plan error) `timeoutMs` inside the hashed `CLAUDE_SCREEN`** contradicted Task 11's rule that harness
    options may move after the smoke without moving the registered sha. It is `CLAUDE_TIMEOUT_MS`, outside the
    table, and was raised from 300 s to 600 s for Opus's thinking time (the route's screen is off regardless).
  - **(plan error) interlock (ii) forces a commit order**: `claude-score.mjs`, then each run file, committed before
    the next paid call.
  - The smoke's run file also embeds its screened text (the plan named `text` for the live file only), so 45.14
    replays it without importing the CLI, whose top level exits.
