# Feature: Jev contradiction screen before the Grill audit (#453)

The following plan should be complete, but validate documentation, codebase patterns and task sanity before you
start implementing. Pay special attention to the names of existing exports and import them from the right files.
Every line number below was read on `origin/main` at `a9918a9` (#454 merged, PR #463) on 2026-09-27.

## Feature Description

Run 2 (`discovery/partner-audit-2`, PR #406) found 0 of the 8 held-out MVP 13 findings. The audit judges the
document against one banked question per turn, so two claims that contradict each other across sections are
never put in front of the agent together. This ticket adds a cheap machine screen in front of the Grill audit:

1. `discovery/claims.mjs` splits the audited document into claims (paragraphs, list items, table rows), each
   with a stable id (`c001`…), its heading path and its source line. Pure, deterministic, Node built-ins only.
2. `portal/lib/discovery-screen.mjs` asks Jev (TypeSafe's classifier, the #454 client `portal/lib/jev.mjs`)
   two stages of questions: stage 1, one Choice per claim, "which other claim cannot be true at the same time
   as this one?"; stage 2, two questions per candidate pair (`relation`: supports / contradicts /
   not_established; `same_subject`: yes/no). It keeps at most K pairs.
3. Every stage-1 pick and every stage-2 pair is written, server-side and once, to the run package's new
   `screen.jsonl` (A3), or one `unavailable` line when Jev cannot be reached (fail-visible).
4. The Grill audit's SYSTEM prompt gets a "Candidate tensions (machine screen, unverified)" block plus one rule
   sentence, only when the screen kept at least one pair. The agent uses the verdict it already has (DODGED →
   `flag_weak_answer`) and names both claim ids. No fifth verb.
5. `discovery/prd-projection.mjs` renders a "Tensions (machine screen)" section from `screen.jsonl`: each kept
   pair, and whether the audit raised it.
6. `tooling/jev-screen.mjs` is the operator CLI over the same functions; it commits one real response set that
   build-checks replays in CI (no key in CI).

## User Story

As the portal operator auditing an existing PRD
I want the audit agent to see the claim pairs a classifier flagged as possibly contradictory
So that cross-section contradictions (MVP 13's run-2 misses) reach the agent at a fraction of a cent

## Problem Statement

The Grill audit's turn shape (one banked question against one document) cannot surface contradictions
between two places in the document. Run 2 missed every cross-document finding (`discovery/README.md:1040-1048`).
Asking Claude to compare all ~88 × 87 / 2 ≈ 3.8k claim pairs costs a whole session.

## Solution Statement

Jev screens all pairs for about a cent; Claude judges the short list inside the audit it already runs; the owner
rules on precision in a separate owner-written file. The prompt addition is **conditional and separately
stamped** (the #289 affordance pattern), so Grill's pinned stamps and the two committed audit packages do not
go stale (D1 below, Q1).

## Out of Scope / Non-Goals

- Not included: a closing turn in which Claude judges every kept pair explicitly (the ticket's D1). Ship the
  prompt block; the raised / not-raised column measures whether the closing turn is needed.
- Not included: checking a look-up turn's prose against its cited source (A5). Needs a quote field in
  `discovery/ops.mjs` first; its own ticket.
- Not changing: the four op verbs, `AUDIT_VERDICT_RULE`, `AUDIT_WRONG_IF_RULE`, Think's and Create-PRD's
  strings, `SECTIONS`, `POSTURES`' stamps, `partner-audit-1/2`, `discovery-guard.mjs`, `jev.mjs`'s behaviour.
- Not included: a screen on blank-idea sessions, a screen on resume, a re-screen of an existing package.
- Not included: retries in the portal path. A 429 or timeout writes `unavailable` and the audit opens without
  the block (the ticket's fail-visible rule).
- Not included: tuning thresholds against the rubric. The thresholds are label-free and pre-registered (D3).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (six modules, one new gate group, two paid runs, one owner step)
**Primary Systems Affected**: discovery run package, Grill audit prompt, PRD projection, portal session route
**Dependencies**: TypeSafe System One HTTP API (`jev-1.13.0`), through the existing `portal/lib/jev.mjs`. No new
npm dependency.

## Related Work

**Implements**: #453 · **Epic**: follows epic #279 (closed), `docs/epics/discovery-partner.architecture.md`

**Back-references**:

- `.claude/plans/jev-answer-box-guard-454.md` + report — Why: landed `portal/lib/jev.mjs`, the eval pattern
  (`tooling/jev-guard-eval.mjs` → committed verbatim responses → build-checks replay), the fail-open shape.
- `.claude/plans/discovery-postures-286.md` — Why: the audit template, the document in the system prompt, the
  per-template fingerprint.
- `.claude/plans/discovery-affordances-289.md` — Why: the precedent for a conditional prompt surface with its
  own stamp (`AFFORDANCE_FINGERPRINT`, `affordanceFingerprintOf`) so existing stamps do not move.
- `.claude/plans/discovery-pre-grill-audit-run-292.md` — Why: how run 2 was pre-registered, opened and scored.

**Forward-references**: #455 (import suggestions) and the A5 look-up check reuse `askJev` and this ticket's
`relation` question.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `portal/lib/jev.mjs` (all 42 lines) — the client. `askJev({state, questions}, {key, model, timeoutMs = 1500,
  fetchImpl})`. **Default timeout is 1500 ms**: the screen must pass its own. It refuses a response from any
  model but `jev-1.13.0`. Exports exactly `JEV_MODEL`, `JEV_URL`, `askJev` (observed).
- `portal/lib/discovery-guard.mjs` (lines 1-126) — the header shape for thresholds with a stated rule; `QUESTIONS`
  frozen at every level; `stateFor` shared by route and eval; injected `ask` for tests.
- `tooling/jev-guard-eval.mjs` (lines 1-176) — the operator CLI shape: census first, calls, rule in code, write the
  verbatim `answers` + `usage` to one committed JSON, never a partial file, `$description` "GENERATED … never edit".
- `portal/lib/discovery-postures.mjs`:
  - lines 20-29 — the audit mode; the document sits in the SYSTEM prompt so the session's prompt cache holds.
  - lines 74-101 — the list of template branches **outside** the posture hash, each with its guard named. A new
    branch goes on this list or it is unguarded.
  - lines 216, 224, 231 — `GRILL_STANCE`, `AUDIT_VERDICT_RULE`, `AUDIT_WRONG_IF_RULE` (do not edit).
  - lines 609-690 — `buildGrillTurn`; the audit `systemPrompt` literal at 647-673. The block goes between
    `DOCUMENT>>>` and `${GRILL_STANCE}`.
  - lines 692-770 — `FINGERPRINT_INPUTS`, `AUDIT_FINGERPRINT_INPUTS`, the affordance input sets,
    `FINGERPRINT_INPUTS_FOR`, `fingerprintOf`.
  - lines 836-852 — `affordanceFingerprintOf` + `AFFORDANCE_FINGERPRINT`: MIRROR for the screen stamp.
- `portal/lib/discovery-transport.mjs` lines 167-176 (`runDiscoveryTurn` signature and its one `posture.build`
  call) and 236-259 (`turnStats` stamping, the conditional `affordanceFingerprint` spread at 257).
- `portal/lib/discovery.mjs`:
  - lines 312-336 — `appendDocument`, `documentOf`, `auditAnswerFor`.
  - lines 742-812 — `openSession` (synchronous; create path vs resume; returns `{...view, created}`).
  - lines 1103-1158 — `runTurn` (the one call into `runDiscoveryTurn`).
  - line 890 — `sessionView().document` = `{ ref, chars, md5 }` (never the text).
- `portal/server.mjs` lines 188-209 — `POST /api/discovery/session`.
- `portal/public/portal.js` lines 957-1000 — the drawer's open handler (`#discovery-start-status`).
- `discovery/prd-projection.mjs`:
  - lines 1-60 — the header: "SIX sources", "reads three files and writes one".
  - lines 209-316 — `SECTIONS` (imported by `discovery-postures.mjs` for Create-PRD's `sectionBrief`: **do not add
    a row**).
  - lines 754-790 — `projectPrd`: honesty header at 773, sections loop at 780-786, `Architecture` line at 788.
  - lines 801-842 — `readJsonl`, `readPackage`.
  - exports `fold`, `cell`, `blockquote` (lines 99, 119, 126) — reuse for the new section.
- `discovery/README.md` lines 65-113 (§Files, "THREE files during a session and FIVE after a proposal run"),
  222-265 (§The audit mode), 266-359 (§File shapes), 995-1074 (§The pre-grill audit: run 2's configuration and score).
- `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` — the frozen fixture. md5
  `ab6eb0ee6cdd3b7802ecfcbe90db2377`, 313 lines, 3,929 words, 11 headings, 44 list-item lines, 19 table lines,
  14 blockquote lines, 0 code fences (all observed).
- `docs/epics/fixtures/discovery-partner.run-2-rubric.md` — MIRROR for the screen rubric: anchors by fixture line,
  FOUND / PARTIAL / MISSED clauses, reachability declared before the run, commit timestamp as the receipt.
- `tooling/build-checks.mjs`:
  - line 329 — `group(name, detail)`; helpers (`threw`, `athrew`, `same`, `gitSnap`) are **local to each group**.
  - lines 8918-8945 — case 30.46: Grill's stamps pinned to `76b7847d4ebbd9d8f16f9726ff0f4f0f` (sonnet) and
    `ba124c3c1edb19905101aceca7c12e22` (opus). Must stay green unedited.
  - lines 10005-10016 — 32.7: every committed audit package's `postureFingerprint` must equal the current
    surface; no committed package carries an `affordanceFingerprint`.
  - lines 10718-10742 — 34.5b: `prd-projection.mjs`'s `join(root, "…")` filenames pinned to exactly
    `answers.jsonl, prd.md, run.json, transcript.jsonl`.
  - lines 13950-14142 — group 44 "jev guard": MIRROR its scaffolding (dynamic import, import-graph pin, replay of
    committed responses through an injected `ask`, injected failures, `gitSnap` before/after).
  - line 14145 — `console.log("\nbuild ✓  all 44 groups pass")`.
- `tooling/drift-check.mjs` lines 176-206 — the group-count leg: four literals must equal the distinct group
  names (`build-checks.mjs` pass line, CLAUDE.md "44 PURE groups", CLAUDE.md "build-checks' 44 groups",
  `gates.md` "44 pure groups").

### New Files to Create

- `discovery/claims.mjs` — `splitClaims(markdown)` → `[{ id, section, line, endLine, text }]`. Pure.
- `portal/lib/discovery-screen.mjs` — the questions, batching, selection, thresholds, line shapes,
  `screenDocument`, `tensionsOf`, `readScreen`, `writeScreen`, `screenSession`.
- `tooling/jev-screen.mjs` — operator CLI.
- `tooling/jev-screen/fixture-claims.json` — GENERATED by `node tooling/jev-screen.mjs <fixture> --claims`; the
  committed ids.
- `tooling/jev-screen/screen-run.json` — GENERATED by the CLI's paid run; verbatim responses.
- `tooling/jev-screen/labels.json` — **owner-written**: the owner's real / not-real verdict per kept pair.
- `docs/epics/fixtures/discovery-partner.screen-rubric.md` — pre-registered before the first paid call.
- `discovery/partner-audit-3/` — the recorded run (server-written: `run.json`, `answers.jsonl`,
  `transcript.jsonl`, `screen.jsonl`; projected: `prd.md`).
- `.claude/reports/jev-contradiction-screen-453-report.md` — the report (found/missed, costs, not-run).

### Relevant Documentation

- [TypeSafe API reference](https://docs.typesafe.ai/api.md) — Choice question: `criteria` is a map of option →
  description or `null`, **at most 255 options**; a Choice answer carries `choice`, `probabilities` (every option,
  sums to 1) and `confidence`. Noul answer: `noul` in 0..1. `instructions` may be an object whose fields the
  question names in backticks. Errors: 422 on a malformed body, 429 rate limit.
- [Models](https://docs.typesafe.ai/models) — `jev-1.13.0`: **64k tokens per request** (state + all questions);
  **32k for state + the longest question**; price **$0.042 per million input tokens**, output free; 1,200 rpm.
- [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13) — §Indirection and §Large state:
  accuracy falls with indirection and with irrelevant state. Stage 1 is exposed to both (88 options named by id
  over a 5.5k-token state). This is a known risk the fixture run measures, not a reason to redesign mid-run.
- [Fan-out](https://docs.typesafe.ai/patterns/fan-out.md) — every question in one request is evaluated in parallel.

### Patterns to Follow

**Header-as-specification.** Every new module opens with a header citing `#453` and stating its invariants;
the architecture map in CLAUDE.md only indexes it.

**Errors.** `const bad = (msg) => { throw new Error(\`discovery-screen: ${msg}\`); };` (as
`discovery-guard.mjs:59`). The message names the offending field or path.

**Frozen tables.** `Object.freeze` at every level for question sets (as `discovery-guard.mjs:68-85`).

**Injected I/O for CI.** `screenDocument(text, { ask = askJev })` — build-checks passes a replay `ask`
(as `checkAnswer(..., { ask })`, `discovery-guard.mjs:104`).

**Generated JSON.** `$description: "GENERATED by tooling/jev-screen.mjs from real TypeSafe API responses — never
edit; re-run instead"` (as `jev-guard-eval.mjs:165`).

**Conditional prompt surface with its own stamp.** `affordanceFingerprintOf = ({ build, model }) =>
fingerprintOf({ build, model, inputs: AFFORDANCE_INPUT_SETS })` (`discovery-postures.mjs:836`), stamped
`...(cond ? { affordanceFingerprint: affordanceFingerprintOf(posture) } : {})` off the RESOLVED posture
(`discovery-transport.mjs:257`).

---

## DECISIONS (made in planning; each traced)

- **D1 — conditional block + separate stamp, NOT a Grill stamp move (departs from the ticket; Q1).** The ticket says
  "The Grill fingerprint moves and gets re-recorded". On main that reddens 30.46 (two literal pins) and 32.7
  (`partner-audit-1` and `partner-audit-2` must carry the current surface), and turning 32.7 green again means
  re-recording `partner-audit-2`, which replaces the 0/8 baseline this ticket is measured against (~$1.8 for
  both re-records, derived from `turnStats`: $0.16 + $1.615). So: the block and its rule render only when
  `tensions.length > 0`; with no tensions `buildGrillTurn` is byte-identical to today, so every existing stamp
  holds. The screened surface gets `SCREEN_FINGERPRINT_INPUTS` and `screenFingerprintOf(posture)`, stamped as
  `screenFingerprint` on the `turnStats` of screened turns only. This is #289's affordance design, applied again.
- **D2 — the screen runs from the route, on the create path only.** `openSession` stays synchronous (every group 30
  case calls it directly). `POST /api/discovery/session` awaits `screenSession(root, documentText)` when
  `view.created && view.head.entryMode === 'existing-prd'`. A resume never re-screens. `screen.jsonl` is built in
  memory and written **once** (`writeScreen` refuses an existing file), so a crash mid-screen leaves no partial
  block for a resumed session. It is always written on the create path of an audit: either the run's lines or one
  `unavailable` line.
- **D3 — label-free, pre-registered thresholds.** Fixed in the module header BEFORE the first paid call, and not
  derived from the rubric:
  - `T1 = 0` — every stage-1 pick whose `choice !== 'none'` is a candidate. Reason: stage 2 is the filter, and a
    stage-1 threshold chosen by looking at which picks were true would be tuned towards the answer. Proviso: if the
    candidate count needs more than `STAGE2_MAX_REQUESTS = 3` stage-2 requests, T1 becomes the lowest value on
    the grid 0.05…0.95 (step 0.05) that fits, computed in code and recorded in the summary line.
  - `T_SAME = 0.5` — `same_subject.noul ≥ 0.5`: the noul's own midpoint (the docs call Jev calibrated).
  - `T2 = 0.5` — `relation.probabilities.contradicts ≥ 0.5`: a majority of the probability mass, not a plurality
    of three.
  - `K = 10` — the ticket's start value. Kept = passes T_SAME and T2, ranked by `contradicts` descending, ties by
    `a` id then `b` id, first K.
  The fixture run's only role is to report the counts these produce. No threshold moves after it (the
  `import/recognise.mjs` rule). If the run keeps zero pairs, that is the result.
- **D4 — "raised by the audit" is decided by ids OR by both quotes, fixed before run 3.** The rule sentence tells
  the agent to name both claim ids in the `flag_weak_answer` `missing[]` entry it files. The projection marks a kept
  pair "raised by the audit" when any `flag_weak_answer` op's `missing[]` joined text either (a) matches both ids
  as whole words (`\bc017\b`), or (b) contains a verbatim 30-character window of each claim's text (both claims,
  compared after collapsing whitespace and straightening quotes; a claim shorter than 30 characters is matched
  whole). Rule (b) covers an agent that quotes but forgets the ids, so no hand count is needed. The page names which
  rule matched (`by ids` / `by quotes`). Fixed here; never loosened after run 3.
- **D5 — owner labels live outside the package.** `tooling/jev-screen/labels.json`, written by the owner
  (as `tooling/jev-guard/labels.json`). `prd.md`'s Tensions section stays byte-matched by group 45, so an owner
  verdict written into it would redden the gate.
- **D6 — run 3 matches run 2.** `existing-prd`, `full-discovery`, facets `hasModel` only, Grill on
  `claude-opus-5`, fictional, `documentPath` = the fixture, new slug `partner-audit-3`, driven through the drawer
  (`frontEnd: 'portal'`). Only the screen differs.
- **D7 — two screens, scored separately.** The CLI screen (`screen-run.json`) and the session's screen
  (`partner-audit-3/screen.jsonl`) are two Jev runs, and Jev's scores are not bit-stable across runs
  (`discovery-guard.mjs:51-53`). The report scores each against the rubric and names which one every number is from.

---

## IMPLEMENTATION PLAN

### Phase 0: Worktree baseline

Fresh worktree off `origin/main`; `cd tooling/icons && npm ci` (group 41 and drift-check's icons leg are red
without it, observed); `cd portal && npm ci`. Baseline: `node tooling/build-checks.mjs` → 44 groups green.

### Phase 1: The splitter and the committed ids (pure, free)

`discovery/claims.mjs`, the CLI's `--claims` mode, `tooling/jev-screen/fixture-claims.json`.

### Phase 2: Pre-registration (free; must be committed before any paid call)

The screen rubric + the D3 constants in the module header, in one commit whose timestamp is the receipt.

**Depends on:** Phase 1 (the rubric names claim ids).

### Phase 3: The screen module and the CLI (pure parts free; the run is paid)

`portal/lib/discovery-screen.mjs`, `tooling/jev-screen.mjs`.

**Depends on:** Phase 2 for the paid run only. The code can be written in parallel with Phase 2.

### Phase 4: The audit prompt, the transport, the route, the drawer line

**Independent of:** Phase 3's paid run. **Depends on:** Phase 3's `tensionsOf` / `readScreen` exports.

### Phase 5: The projection

**Independent of:** Phase 4.

### Phase 6: The gate (group 45), 32.7, 34.5b, counts, docs

**Depends on:** Phases 1-5 code.

### Phase 7: Paid and owner steps

CLI run on the fixture → commit `screen-run.json` → score. Run 3 through the drawer → project → commit. Owner
labels. Report.

**Depends on:** Phase 2 committed (hard) and `TYPESAFE_API_KEY` in `portal/.env`.

---

## STEP-BY-STEP TASKS

### Task 0 — SETUP worktree

- **IMPLEMENT**: `git fetch origin && git worktree add ../ux-factory-453 -b feat/jev-contradiction-screen-453 origin/main`
  (a path under `/Users`, not `/private/tmp` — Docker sharing, memory `vr-gate-reads-working-tree`, even though no VR
  run is expected). Copy this plan and its brief onto the new branch
  (`cp .claude/plans/jev-contradiction-screen-453.{md,html}` from the primary tree — untracked there, on another
  branch, and the plan belongs in this ticket's PR). Then `cd tooling/icons && npm ci`, `cd portal && npm ci`, and copy `portal/.env` from the primary
  tree only if it holds `TYPESAFE_API_KEY`.
- **GOTCHA**: parallel sessions share the primary working dir (memory `shared-worktree-parallel-sessions`). Stage by
  explicit path; check the branch before every commit.
- **PRECONDITION (R1)**: `grep -c '^TYPESAFE_API_KEY=.' portal/.env` → `1`. If `0`, ask the owner to add the key
  NOW, in the first message of the session, so it is in place by Task 16b. Tasks 1-16 are free and proceed while
  waiting; nothing paid is attempted without it.
- **VALIDATE**: `node tooling/build-checks.mjs | tail -1` → `build ✓  all 44 groups pass`. Observed on a fresh
  worktree WITHOUT `npm ci` in `tooling/icons`: `build icons ✗ 41.7: genIcons({check:true}) THREW — … Install it: cd
  tooling/icons && npm ci` and 43 other groups ✓.
- **SATISFIES**: baseline for AC #7. **REGENERATES**: none.

### Task 1 — CREATE `discovery/claims.mjs`

- **IMPLEMENT**: `export function splitClaims(markdown)` → frozen array of frozen `{ id, section, line, endLine, text }`.
  Rules, in this order, over `markdown.split(/\r\n|\r|\n/)`:
  1. A fenced block (```` ``` ```` or `~~~` to its closing fence) is ONE claim, text verbatim (inner lines joined
     with `\n`). No fence is in the fixture; tested synthetically.
  2. An ATX heading (`/^(#{1,6})\s+(.*?)\s*#*\s*$/`) ends the current claim and sets the heading stack at its level
     (truncate deeper levels). It is not a claim.
  3. A blank line or a thematic break (`/^\s{0,3}([-*_])(\s*\1){2,}\s*$/`) ends the current claim.
  4. A table: a line starting `|`. The first row of a table is its header (not a claim); a separator row
     (`/^\|?\s*:?-{3,}/`) is skipped; each data row is one claim whose text is the cells as
     `Header: cell · Header: cell` (cells trimmed, empty cells skipped, `\|` kept as a literal pipe).
  5. A list item starts at `/^(\s*)([-*+]|\d+[.)])\s+/` at ANY indent — each item, nested or not, is its own claim;
     the marker is stripped. Following non-blank lines that are not themselves a new item, heading, table row or
     fence are its continuation.
  6. A blockquote line (`/^\s{0,3}>\s?/`) has the marker stripped and joins the current paragraph.
  7. Anything else starts or continues a paragraph.
  Continuation lines are joined with one space after `trim()`. Ids are `c` + 3-digit zero-padded index in document
  order (`c001`); refuse (throw) past `c999`. `section` is the heading path joined with ` › `, or `(preamble)` before
  the first heading. `line` is the 1-based source line the claim starts on and `endLine` the line it ends on (equal for a table row).
  The rubric maps an anchor like `:157` to the claim whose `line ≤ 157 ≤ endLine`. Empty text is dropped before an id is
  allocated. Refuse a non-string input by name.
  Also export `CLAIMS_VERSION = 1` (bumped on any rule change; it is part of what `screen-run.json` records).
- **PATTERN**: header shape `discovery/prd-projection.mjs:1-60` (pure, no clock, "Standalone" line); line-ending split
  `prd-projection.mjs:98`.
- **IMPORTS**: none (Node built-ins not even needed). Group 45 pins the import list to `[]`.
- **GOTCHA**: the throwaway count during planning was **88 claims**, max 276 words, 4 claims over 120 words (observed
  with a simpler rule set). The real count is whatever Task 2 commits; do not type 88 anywhere a gate reads.
  A list item's continuation that is itself indented list syntax is a NEW item (rule 5 wins), which is what the
  fixture's nested `   - **Traceability upward.**` items need (fixture :200-208).
- **VALIDATE**: `node -e 'import("./discovery/claims.mjs").then(m=>{const c=m.splitClaims(require("fs").readFileSync("docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md","utf8"));console.log(c.length,c[0].id,c.at(-1).id);console.log(JSON.stringify(c.find(x=>x.line>=204&&x.line<=208)))})'`
  (expected: a count near 88, `c001`, the transition-note item with `section` `discovery-partner.prd.md › MVP`).
- **SATISFIES**: AC #5 (splitter). **REGENERATES**: none.

### Task 2 — CREATE `tooling/jev-screen.mjs` (`--claims` mode first) + `tooling/jev-screen/fixture-claims.json`

- **IMPLEMENT**: `node tooling/jev-screen.mjs <document.md> --claims` reads the file, prints
  `claims: N · md5 <hex> · version <CLAIMS_VERSION>`, and writes `tooling/jev-screen/fixture-claims.json` =
  `{ $description, source: <repo-relative path>, md5, claimsVersion, claims }` **only** when `<document.md>` is the
  frozen fixture (compare md5 to `ab6eb0ee6cdd3b7802ecfcbe90db2377`); for any other file it prints and writes nothing.
  The paid mode is Task 5.
- **PATTERN**: `tooling/jev-guard-eval.mjs:49-53,164-176`.
- **VALIDATE**: `node tooling/jev-screen.mjs docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md --claims`
  → `claims: N · md5 ab6eb0ee6cdd3b7802ecfcbe90db2377 · version 1` and `jev-screen ✓ wrote tooling/jev-screen/fixture-claims.json`.
- **SATISFIES**: AC #5 (committed ids). **REGENERATES**: `tooling/jev-screen/fixture-claims.json` (this command).

### Task 3 — CREATE `docs/epics/fixtures/discovery-partner.screen-rubric.md` (pre-registration)

- **IMPLEMENT**: MIRROR `discovery-partner.run-2-rubric.md`'s shape. For each MVP 13 finding, the fixture lines of
  each side, **the claim ids those lines map to in `fixture-claims.json`** (both sides), and the class:
  - **contradiction-class (the AC's denominator)**: #2 transition-note rule vs its worked example (`:204-208` vs
    `:157`, `:212`); #6 parity (`:152-154` vs `:274`); #8 the internal wobble only ("~30" / "thirty" / "10 stages":
    `:53`, `:174`, `:182`; the bank-count half is unreachable, as run 2 declared).
  - **tension-shaped, reported beside and never inside the denominator**: #4 (`:163-173` vs `:212-216`),
    #5 (`:104`, `:126` vs `:150-151`), #7 (`:184-187`, `:182` vs `:123-130`).
  - **out of class**: #1, #3 (need facts outside the document or are framing, not contradiction).
  Scoring states, per finding and per screen: **KEPT** (a kept pair with one claim from each side) · **CONFIRMED
  BUT DROPPED** (a stage-2 pair line with `kept: false` joining the two sides; name which threshold dropped it) ·
  **PICKED ONLY** (a stage-1 pick joins the sides but no stage-2 line exists — only possible if T1's proviso fired)
  · **MISSED** (no pick joins them). FOUND = KEPT. Never rounded up. Rule: the same scoring for the CLI screen and
  run 3's screen, reported side by side (D7); for run 3 additionally RAISED / NOT RAISED per kept pair (D4).
  State the D3 constants verbatim and say they were fixed before this file's commit.
- **GOTCHA**: this is the implementing session's anchor file, not a verdict (as run 2's rubric,
  `discovery-partner.run-2-rubric.md:10-14`). The owner may reclassify findings **before** the commit; never after
  the first paid call (Q2).
- **VALIDATE**: `git log -1 --format='%H %cI' -- docs/epics/fixtures/discovery-partner.screen-rubric.md portal/lib/discovery-screen.mjs`
  shows the pre-registration commit; its time is earlier than `screen-run.json`'s `ranAt`.
- **SATISFIES**: AC #2 (pre-registered scoring). **REGENERATES**: none.

### Task 4 — CREATE `portal/lib/discovery-screen.mjs`

- **IMPLEMENT**:
  - Header: `#453`, the pipeline, the four invariants — (1) **only the document leaves the machine**: state is the
    claims of the one stored document, never the ledger, the bank's rubric or any other file; (2) **server-written,
    once**: `screen.jsonl` is written by `writeScreen` and nothing else, refused if it exists; (3) **fail-visible**:
    any failure writes exactly one `unavailable` line with the reason and the audit opens without the block;
    (4) **the thresholds are D3's, pre-registered, label-free, meaningful only against `jev-1.13.0`**, with each
    constant's reason.
  - `export const SCREEN_TIMEOUT_MS = 60000;` (a 60k-token request's latency is unmeasured; the drawer shows a
    "screening" status while it waits — Task 9). Latency is measured by the CLI (`requests[i].ms`), never written into a line.
  - `export const T1 = 0, T_SAME = 0.5, T2 = 0.5, K = 10, STAGE2_MAX_REQUESTS = 3;`
    `export const REQUEST_TOKEN_BUDGET = 56000;` (under the documented 64k, margin for the estimate) and
    `export const STATE_PLUS_QUESTION_BUDGET = 30000;` (under 32k). Token estimate:
    `estTokens = (x) => Math.ceil(JSON.stringify(x).length / 3)` — conservative; the CLI prints the observed
    `usage.input_tokens` beside it.
  - `export const PICK_NONE = 'none';`
  - `export function stage1State(claims)` → `{ claims: claims.map(({ id, section, text }) => ({ id, section, text })) }`.
  - `export function stage1Question(target, claims)` → frozen `{ type: 'choice', instructions: { question: "Which
    claim in `claims` states something that cannot be true of the same product at the same time as `target`?
    Answer none when no claim does.", target: { id, section, text } }, criteria: { <every other id>: null, none:
    'No claim in `claims` conflicts with `target`.' } }`. Question id = `pick_<targetId>`. Refuse > 254 other claims
    by name (the 255-option limit; the fixture is far under it).
  - `export function stage2Questions(a, b)` → `{ [\`relation_${a.id}_${b.id}\`]: { type: 'choice', instructions:
    { question: 'Does claim `a` support, contradict, or neither establish nor contradict claim `b`?', a: a.text,
    b: b.text }, criteria: { supports: 'Claim `a` makes claim `b` more likely to be true.', contradicts: 'Claim `a`
    and claim `b` cannot both be true of the same product at the same time.', not_established: 'Claim `a` neither
    supports nor contradicts claim `b`.' } }, [\`same_${a.id}_${b.id}\`]: { type: 'noul', instructions: { question:
    'Are `a` and `b` about the same part of the product?', a: a.text, b: b.text }, criteria: { true: 'Both describe
    the same feature, rule, number or promise.', false: 'They describe different parts of the product, even if they
    share words.' } } }`. Stage-2 state: `'Two claims from one product requirements document.'`.
  - `export function batches(questions, state)` — greedy packing in insertion order into requests whose
    `estTokens(state) + Σ estTokens(question)` ≤ `REQUEST_TOKEN_BUDGET`; refuse by name any single question with
    `estTokens(state) + estTokens(q) > STATE_PLUS_QUESTION_BUDGET`. Deterministic.
  - `export function picksFrom(answers)` → `[{ claim, picked, p }]` from every `pick_*` answer: `picked =
    answer.choice`, `p = answer.probabilities[answer.choice]`. Refuse a missing/non-finite probability by name.
  - `export function candidatePairs(picks, t1)` → unordered pairs (`a.id < b.id`) for picks with `picked !== 'none'
    && p >= t1`; when both directions pick each other, one pair with `stage1P = max`; sorted by `a` then `b`.
  - `export function chooseT1(picks)` → `T1` unless the candidate count needs more than `STAGE2_MAX_REQUESTS`
    stage-2 requests under `batches`; then the lowest grid value 0.05…0.95 that fits (D3 proviso).
  - `export function judgePairs(pairs, answers)` → each pair plus `relation` (`{ choice, probabilities }` verbatim),
    `sameSubject` (the noul), and `kept` per D3 (T_SAME, T2, rank, K).
  - Line shapes (all carry `ts` and, except `unavailable`, `model` from the response):
    `{ type: 'pick', ts, model, claim, picked, p }` ·
    `{ type: 'pair', ts, model, a: { id, section, text }, b: { id, section, text }, stage1P, relation, sameSubject, kept }` ·
    `{ type: 'summary', ts, model, docMd5, claimsVersion, claims, picks, candidates, kept, t1, thresholds: { T_SAME, T2, K }, requests, inputTokens }` ·
    **No latency in any line**: a line is a pure function of the responses (plus `ts`), so 45.8's replay can
    reproduce it. The CLI times each request itself and stores it as `requests[i].ms` in `screen-run.json`.
    `{ type: 'unavailable', ts, reason }`. Export `LINE_TYPES`.
  - `export async function screenDocument(text, { ask = askJev, now = () => new Date().toISOString() } = {})` →
    `{ lines, requests }` where `requests = [{ stage, questionIds, response }]` (verbatim `{ model, answers, usage }`
    per call). Calls `ask({ state, questions }, { timeoutMs: SCREEN_TIMEOUT_MS })` — **`ask` receives the options
    object as its second argument, so the replay stub in CI and the real `askJev` share one signature.** Throws on
    any failure (the caller decides).
  - `export function tensionsOf(lines)` → the kept pairs as `[{ a: {id, section, text}, b: {…}, contradicts }]` in
    kept rank order; `[]` for no lines or an `unavailable` line.
  - `export function readScreen(root)` → parsed lines of `<root>/screen.jsonl` or `[]` if absent; refuses an unknown
    `type` naming the line number (as `prd-projection.mjs:830-833`).
  - `export function writeScreen(root, lines)` — refuses if `screen.jsonl` exists; `writeFileSync` once.
  - `export async function screenSession(root, text, { ask } = {})` → try `screenDocument`; on success
    `writeScreen(root, lines)`; on any throw `writeScreen(root, [{ type: 'unavailable', ts, reason: e.message }])`.
    Returns `{ status: 'ran' | 'unavailable', kept, reason }`. It never throws for a Jev failure.
- **IMPORTS**: `node:fs`, `node:path`, `node:crypto` (md5), `./jev.mjs` (`askJev`, `JEV_MODEL`),
  `../../discovery/claims.mjs`. **Nothing else** — in particular not `./discovery.mjs` (it will import this module;
  a cycle would put exports in TDZ) and not the SDK or zod (CI imports it with no `portal/node_modules`).
- **GOTCHA**: `askJev`'s default `timeoutMs` is 1500 (`jev.mjs:25`); a 60k-token request will abort under it. Pass
  `SCREEN_TIMEOUT_MS` explicitly.
- **GOTCHA**: never write a response by hand, and never shape a CI stub answer by hand except in labelled
  **synthetic** refusal cases (the #454 rule: success paths replay committed responses).
- **VALIDATE**: `node -e 'import("./portal/lib/discovery-screen.mjs").then(m=>console.log(Object.keys(m).sort().join(" ")))'`
  lists the exports above; `node --check portal/lib/discovery-screen.mjs`.
- **SATISFIES**: AC #1, #6. **REGENERATES**: none.

### Task 5 — ADD the paid mode to `tooling/jev-screen.mjs`

- **IMPLEMENT**: `node tooling/jev-screen.mjs <document.md>` (no flag): split → `screenDocument` with the real
  `askJev` → print, per kept pair, `c017 ↔ c052  contradicts 0.83  same 0.91` and both texts; then
  `requests N (stage 1: n1, stage 2: n2) · input tokens T (observed, usage) · est. tokens E · cost $X (derived:
  T × $0.042/M, the Models page price) · latency p50/max ms`. Retry only 429/529 at 2 s / 4 s / 8 s (CLI only, as
  `jev-guard-eval.mjs:86-100`); any other failure aborts and **writes nothing**. On success, for the frozen fixture
  only (md5 check), write `tooling/jev-screen/screen-run.json` = `{ $description, model, ranAt, docMd5,
  claimsVersion, questionsSha, requests, lines }`, where `questionsSha = sha256(JSON.stringify` of the stage-1
  question template + stage-2 template + criteria)` so an edited wording stales the file by name.
  The CLI never touches a run package.
- **VALIDATE** (free): `TYPESAFE_API_KEY= node tooling/jev-screen.mjs docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md`
  → exits 1 with `jev: TYPESAFE_API_KEY is not set in portal/.env` and writes nothing (`git status --porcelain tooling/jev-screen` unchanged).
- **SATISFIES**: AC #1, #3. **REGENERATES**: `tooling/jev-screen/screen-run.json` (paid; Task 17).

### Task 6 — UPDATE `portal/lib/discovery-postures.mjs`

- **IMPLEMENT**:
  - `export const TENSION_RULE = \`A candidate tension is evidence, not a finding. When the question on the table
    touches either claim of a pair, judge that pair against the document: if the two claims cannot both hold of this
    product, that is DODGED — file flag_weak_answer with one missing entry that names both claim ids and quotes both
    claims. If they can both hold, or the question touches neither claim, ignore the pair and do not mention it.\`;`
  - `export function tensionsBlock(tensions)` → `''` for `[]`; otherwise
    ```
    Candidate tensions (machine screen, unverified) — pairs of claims in the document a classifier scored as possibly contradicting each other:
    - <a.id> (<a.section>): "<fold(a.text)>" ↔ <b.id> (<b.section>): "<fold(b.text)>"
    …

    ${TENSION_RULE}
    ```
    Use `fold` from `prd-projection.mjs` (already imported module) so a newline in a claim cannot open a structure.
  - `buildGrillTurn({ …, tensions = [] })`: validate `tensions` is an array of `{a:{id,text},b:{id,text}}`; refuse a
    non-empty `tensions` on a non-audit build by name. In the audit `systemPrompt`, insert
    `${tensions.length ? \`\n${tensionsBlock(tensions)}\n\` : ''}` **directly after `DOCUMENT>>>`** and before the blank
    line preceding `${GRILL_STANCE}`, so that with `[]` the string is byte-identical to today's.
  - `export const SCREEN_FINGERPRINT_INPUTS = Object.freeze({ ...AUDIT_FINGERPRINT_INPUTS, tensions: Object.freeze([
    Object.freeze({ a: Object.freeze({ id: 'fp-c1', section: 'FIXED', text: 'A fixed claim.' }), b: Object.freeze({ id:
    'fp-c2', section: 'FIXED', text: 'A fixed other claim.' }), contradicts: 0.9 }) ]) });`
    `export const screenFingerprintOf = ({ build, model }) => fingerprintOf({ build, model, inputs: [SCREEN_FINGERPRINT_INPUTS] });`
    Do **not** add it to `FINGERPRINT_INPUTS_FOR`.
  - Header: add a fifth bullet to the "outside the hash" list (lines 83-99): "the TENSIONS BLOCK (#453), on Grill's
    audit template — `AUDIT_FINGERPRINT_INPUTS` carries no tensions, so the block renders for no posture stamp; it is
    covered by `screenFingerprintOf` instead, stamped as `screenFingerprint` on a screened turn's stats. Guarded by
    group 45's stamp cases." And one sentence in the audit-mode paragraph (lines 20-29) that the block sits after the
    document, before the stance, and only when the screen kept a pair.
- **GOTCHA**: `POSTURES.grill.fingerprint` must still equal `76b7847d4ebbd9d8f16f9726ff0f4f0f` and Grill-on-Opus
  `ba124c3c1edb19905101aceca7c12e22` (30.46), and Think's two stamps must not move (30.46, groups 32/33). If any
  moves, the `tensions = []` path is not byte-identical — fix the template, never the pin.
- **GOTCHA**: order is load-bearing (`discovery-postures.mjs:53-57`); case 31/32 assert the document block precedes
  `GRILL_STANCE` and every rule precedes `PARENT_RULE`. The block sits inside that window.
- **GOTCHA**: group 30 case 12 (`build-checks.mjs:7621-7630`) scans `discovery.mjs` and `discovery-postures.mjs` for a
  DOM reach (`/\b(document|window)\s*[.[]/`) — never write `document.x` or `document[` in either; name variables
  `doc` / `documentText`. It also forbids a static import of the transport. No import-specifier pin on
  `discovery.mjs` exists (grep in planning), so Task 8's new import needs no gate edit.
- **VALIDATE**: `node -e 'import("./portal/lib/discovery-postures.mjs").then(m=>{console.log(m.POSTURES.grill.fingerprint, m.resolvePosture({posture:"grill",model:"claude-opus-5"}).fingerprint, m.POSTURES.think.fingerprint)})'`
  → observed today: `76b7847d4ebbd9d8f16f9726ff0f4f0f ba124c3c1edb19905101aceca7c12e22 7efdde37441fbd2591ba4a7dfeecdb6b`; must print the same after.
- **SATISFIES**: AC #4 (the block). **REGENERATES**: none.

### Task 7 — UPDATE `portal/lib/discovery-transport.mjs`

- **IMPLEMENT**: `runDiscoveryTurn({ …, tensions = [] })`; pass `tensions` into the one `posture.build` call (line 175);
  in `stats`, after the `affordanceFingerprint` spread (line 257):
  `...(tensions.length ? { screenFingerprint: screenFingerprintOf(posture) } : {}),` with a comment mirroring 252-256
  (off the RESOLVED posture). Import `screenFingerprintOf`. Leave `runDiscoveryTurnObserved` (line 829) untouched —
  a probe runs unscreened.
- **VALIDATE**: `node --check portal/lib/discovery-transport.mjs`; `grep -n "screenFingerprint: screenFingerprintOf(posture)" portal/lib/discovery-transport.mjs` → one line.
- **SATISFIES**: AC #4. **REGENERATES**: none.

### Task 8 — UPDATE `portal/lib/discovery.mjs` `runTurn`

- **IMPLEMENT**: import `{ readScreen, tensionsOf }` from `./discovery-screen.mjs`; in `runTurn`, pass
  `tensions: audit ? tensionsOf(readScreen(root)) : []` to `runDiscoveryTurn`. Add one sentence to the comment above
  `runTurn` (lines 1062-1102): the audit reads the screen's kept pairs from disk every turn, and because
  `screen.jsonl` is written once at create, the system prompt stays byte-stable across the session.
- **GOTCHA**: `discovery.mjs` is imported by build-checks group 30 with no `portal/node_modules`;
  `discovery-screen.mjs` → `jev.mjs` → `env.mjs` is SDK-free, so this stays true. `env.mjs` loads `portal/.env` on
  import — harmless in CI (absent file).
- **VALIDATE**: `node -e 'import("./portal/lib/discovery.mjs").then(()=>console.log("ok"))'` → `ok` with
  `portal/node_modules` moved aside is not needed; group 30 proves it in Task 13.
- **SATISFIES**: AC #4. **REGENERATES**: none.

### Task 9 — UPDATE `portal/server.mjs` session route + `portal/public/portal.js`

- **IMPLEMENT**: in `POST /api/discovery/session`, after the `mismatch` check and before `json(res, 200, view)`:
  ```js
  // #453. The contradiction screen, on an audit's CREATE path only (a resume never re-screens). It writes
  // screen.jsonl once — the run's lines, or one `unavailable` line — and never throws for a Jev failure.
  let screen = null;
  if (view.created && view.head.entryMode === 'existing-prd') screen = await screenSession(root, documentOf(view.answers).text);
  return json(res, 200, screen ? { ...view, screen } : view);
  ```
  Resolve `root` with the route's existing `resolveRunRoot` + `assertProvenanceRoot` pair (the same pair the GET
  route runs, server.mjs:215-217). Read the document text with `documentOf` from `discovery.mjs` over
  `view.answers` (`sessionView` returns `answers`, `discovery.mjs:870,885` — verified in planning).
  In `portal.js`'s open handler: for `entryMode === 'existing-prd'`, set `#discovery-start-status` to
  `Screening the document for contradictions (Jev) — this can take up to a minute.` before the POST; on the
  response, if `r.screen`, show `Contradiction screen: ${r.screen.kept} pair(s) kept.` or `Contradiction screen did
  not run: ${r.screen.reason}. The audit opens without it.` via `textContent`.
- **GOTCHA**: the route is not reachable from CI (server.mjs imports chat.mjs → SDK; group 44's own "cannot reach").
  The drawer walk in Task 18 is the observation.
- **VALIDATE**: portal smoke on an OS-assigned port, kill only its own PID (memory `portal-smoke-port-scoped-kill`):
  `cd portal && PORT=0 node server.mjs & …` then `curl -s localhost:$P/api/health`. With no key, open a throwaway
  fictional audit (`slug: jev-453-smoke`, `documentPath` = the fixture) → response carries
  `screen: { status: 'unavailable', reason: 'jev: TYPESAFE_API_KEY is not set in portal/.env' }` and
  `discovery/jev-453-smoke/screen.jsonl` holds one `unavailable` line. **Delete that throwaway package** before commit.
- **SATISFIES**: AC #4, #7. **REGENERATES**: none.

### Task 10 — UPDATE `discovery/prd-projection.mjs`

- **IMPLEMENT**:
  - `projectPrd(pkg)`: accept optional `pkg.screen` (array; default `[]`; refuse a non-array by name).
  - Honesty header (line 773): when `screen.length`, append `` and `screen.jsonl` (a machine screen, #453) `` to the
    list of folded files; when empty, the sentence is byte-identical to today.
  - After the SECTIONS loop and before the `Architecture` line, when `screen.length`, push
    `## Tensions (machine screen)` and its body (NOT a `SECTIONS` row — `sectionBrief` reads SECTIONS and 30.46 pins
    Create-PRD's stamp):
    - an `unavailable` line → `**Screen did not run** — <fold(reason)>. The audit ran without candidate tensions.`
    - otherwise one line of provenance from the summary (`jev model · N claims · K kept of C candidates · T_SAME /
      T2 / K`), then, per kept pair in rank order: `#### <a.id> ↔ <b.id> · contradicts <p> · <raised>` where `<raised>`
      is `raised by the audit (seq N)` or `not raised`, then both claims as `blockquote` with their sections, then
      `*Owner's verdict:* _not recorded here — see tooling/jev-screen/labels.json_`. Zero kept pairs →
      `The screen ran and kept no pair.`
    - raised rule (D4): any op with `op === 'flag_weak_answer'` whose `params.missing.join(' ')` (a) matches
      `new RegExp(\`\\b${a.id}\\b\`)` and the same for `b.id`, or (b) contains, after `norm` (collapse whitespace,
      straighten ‘’“” to '"), some 30-character window of `norm(a.text)` and some of `norm(b.text)` (whole text when
      shorter). Name the lowest such seq and the rule: `raised by the audit (seq N, by ids|by quotes)`. Export the
      matcher as `raisedBy(tension, ops)` so group 45 drives it directly.
  - `readPackage(root)`: add `screen: readJsonl(join(root, "screen.jsonl")).map((l) => l.value)` — the literal
    `join(root, "screen.jsonl")`, so 34.5b's regex reads it.
  - Header: "SIX sources" → SEVEN (the seventh: the machine screen's own lines, rendered in their own section and
    never as a decision); "reads three files and writes one" → four; the §PURE core sentence unchanged.
- **GOTCHA**: absent `screen.jsonl` → `[]` → the page is byte-identical to today for every committed package
  (partner-audit-1/2 have none). Group 31's fixtures and 34.5a's byte compare stay green only if this holds.
- **GOTCHA**: 34.5b (`build-checks.mjs:10739`) pins the filenames; Task 14 updates it in the same commit.
- **GOTCHA**: `prd-projection.mjs`'s decommented source must not contain the word "proposals" (34.5b, line 10736).
- **VALIDATE**: `node discovery/prd-projection.mjs partner-audit-2 --stdout | md5` equals
  `node discovery/prd-projection.mjs partner-audit-2 --stdout | md5` run on `origin/main` (byte-identical; observe
  both before and after).
- **SATISFIES**: AC #4, #5. **REGENERATES**: none (committed `prd.md` files are hand-editable and not regenerated).

### Task 11 — UPDATE `discovery/README.md`

- **IMPLEMENT**: §Files tree: add `screen.jsonl` under `<slug>/` ("the contradiction screen's lines — SERVER-WRITTEN
  ONCE at an audit's create, never appended, never hand-edited; four types: pick · pair · summary · unavailable
  (#453)") and `partner-audit-3/` with a one-line description. Change "THREE files during a session and FIVE after a
  proposal run" to state that an existing-prd session writes a fourth, `screen.jsonl`, at create. Add a
  `## The contradiction screen (#453)` section: the pipeline, the four line shapes with one example each (taken from
  the real run, never invented), the D3 thresholds pointer (the module header is the spec), fail-visible, the
  owner-labels file, what the projection renders. After Task 18, add `## The screened audit (partner-audit-3)` in the
  shape of §The pre-grill audit: configuration, stamps (`postureFingerprint` + `screenFingerprint`), cost, and the
  found/missed per screen.
- **VALIDATE**: `grep -n "screen.jsonl" discovery/README.md` ≥ 3 hits.
- **SATISFIES**: ticket Design 4. **REGENERATES**: none.

### Task 12 — CREATE build-checks group 45 "jev screen" (pure half)

- **IMPLEMENT** in `tooling/build-checks.mjs` after group 44, MIRRORING group 44's scaffolding (local `threw`,
  `athrew`, `same`, dynamic imports, `gitSnap` over `discovery portal/lib tooling/jev-screen docs/epics/fixtures`):
  - **45.1 import graph**: `discovery/claims.mjs` imports nothing; `discovery-screen.mjs` imports exactly
    `node:fs, node:path, node:crypto, ./jev.mjs, ../../discovery/claims.mjs`; neither names `claude-agent-sdk` or
    `zod`; `discovery-screen.mjs` does not import `./discovery.mjs`.
    **REDDENS**: add `import './discovery.mjs';` to discovery-screen.mjs → `45.1: discovery-screen.mjs imports ["./discovery.mjs"] beyond …`.
  - **45.2 splitter determinism**: `splitClaims(fixture)` deep-equals `fixture-claims.json.claims`; the file's `md5`
    equals the fixture's; `claimsVersion === CLAIMS_VERSION`; ids gapless `c001…`; every claim's `[line, endLine]` span
    contains its first data token — for a paragraph or list item the first 20 characters of its text, for a table
    row its first non-empty data cell (the text is rewritten as `Header: cell · …`, so its prefix is not on the
    source line) — a positive control that the span is real.
    **REDDENS**: change rule 5 to skip nested items → `45.2: splitClaims(fixture) differs from fixture-claims.json at c0NN`.
  - **45.3 splitter rules, synthetic (labelled)**: a fenced block is one claim; a table header is not a claim and a
    data row renders `Header: cell · …`; a nested item is its own claim; a blockquote joins its paragraph; CRLF and LF
    give the same claims; a heading resets deeper levels; non-string input refused by name; 1000 claims refused.
    **REDDENS**: drop the table-header skip → `45.3: the table header became a claim`.
  - **45.4 questions + batching**: `stage1Question` has every other id + `none` and not the target's own id;
    `batches` over the fixture's stage-1 questions: each request's estimate ≤ `REQUEST_TOKEN_BUDGET`, questions
    preserved in order, union = all; a synthetic oversized question refused by name.
    **REDDENS**: include the target's own id in criteria → `45.4: pick_c001 offers c001 itself`.
  - **45.5 selection (synthetic, labelled)**: `candidatePairs` dedups a mutual pick into one pair with the max `p`;
    `none` never pairs; `judgePairs` keeps exactly those with `sameSubject ≥ 0.5 && contradicts ≥ 0.5`, ranked,
    capped at K (feed K+2 passing pairs → K kept, the two lowest dropped with `kept: false`); `chooseT1` returns `T1`
    under budget and the lowest fitting grid value over it.
    **REDDENS**: `>` for `>=` on T2 → `45.5: a pair at contradicts 0.5 exactly was dropped`.
  - **45.6 fail-visible**: `screenSession` over a temp root with injected failures (missing key through the real
    `askJev` with `key: ''`, a 429 stub, a timeout stub, a model-mismatch stub) → exactly one `unavailable` line
    naming the reason, `{ status: 'unavailable' }` returned, no throw; `writeScreen` refuses an existing file;
    `readScreen` refuses an unknown `type` naming the line. Positive control: a successful replay (45.8) writes
    lines of types `pick`/`pair`/`summary` only.
    **REDDENS**: make `screenSession` rethrow → `45.6: screenSession threw on a 429 instead of writing unavailable`.
  - **45.7 prompt surface**: `buildGrillTurn(AUDIT_FINGERPRINT_INPUTS)` (no tensions) `systemPrompt` contains neither
    `Candidate tensions` nor `TENSION_RULE`; `POSTURES.grill.fingerprint === '76b7847d…'` and Grill-on-Opus
    `=== 'ba124c3c…'` still (belt over 30.46); with `SCREEN_FINGERPRINT_INPUTS` the block sits after `DOCUMENT>>>`
    and before `GRILL_STANCE`, `TENSION_RULE` appears once and before `PARENT_RULE`, both ids appear, and the turn
    prompt carries none of it; `screenFingerprintOf(POSTURES.grill) !== POSTURES.grill.fingerprint`, is 32-hex,
    and differs for the Opus-resolved posture; one trailing space on `TENSION_RULE`'s rendering moves it
    (build a spaced variant as 30.49 does, `build-checks.mjs:8983`); a non-empty `tensions` on the interview template
    and on Think are refused by name. Pin `screenFingerprintOf(resolvePosture({posture:'grill',model:'claude-opus-5'}))`
    to its literal (computed once in Task 12, pasted, and named as the value partner-audit-3 carries).
    **REDDENS**: render the block unconditionally → `45.7: Grill's prompt surface MOVED` (and 30.46 reddens too).
  - **45.8 replay the committed real run** (`tooling/jev-screen/screen-run.json`): `model === JEV_MODEL`;
    `docMd5` = fixture md5; `claimsVersion` current; `questionsSha` recomputed equal; then `screenDocument(fixture,
    { ask: replay })` where `replay` hands back `requests[i].response` verbatim in order and asserts each call's
    question ids equal `requests[i].questionIds` (the batching is deterministic) → the produced `lines` minus `ts`
    deep-equal the committed `lines` minus `ts` — the whole compare (no line carries latency; Task 4). Every stage-1 pick has a line; every candidate pair has a pair line
    with `kept` (A3). Positive control: flipping one committed `relation.probabilities.contradicts` below T2 in memory
    changes `kept` on that pair.
    **REDDENS**: change `K` to 9 → `45.8: produced lines differ from screen-run.json at pair …`.
  - **45.9 projection**: synthetic package + a synthetic `unavailable` line → section reads `**Screen did not run**`;
    no screen → page byte-identical to the same package's projection without the key (`projectPrd({run,answers,ops})`
    vs `projectPrd({run,answers,ops,screen:[]})`); a synthetic flag naming both ids → `raised by the audit (seq N)`,
    one naming only one id → `not raised`. Then the REAL one: `projectPrd(readPackage('discovery/partner-audit-3'))`'s
    `## Tensions (machine screen)` section equals, byte for byte, the same section cut out of the committed
    `discovery/partner-audit-3/prd.md`. Positive control: the section is non-empty and names at least one kept pair.
    **REDDENS**: change the raised regex to match one id → `45.9: a flag naming only c0NN reads raised`. Also
    synthetic: a flag quoting both claims' 30-char windows with no ids → `by quotes`; quoting only one → not raised.
  - **45.10 nothing moved**: `gitSnap()` before === after.
  - `group("jev screen", "…")` — the detail string states what it proves and **what it cannot reach**: the live API
    today; whether Jev's picks generalise beyond the one fixture; whether a kept pair is real (the owner's labels);
    the route and the drawer (no CI runner; Task 18's walk is the observation).
- **GOTCHA**: the #137 class ("the check that cannot fail", memory `check-that-cannot-fail`): every case above has
  a positive control or a mutation named in REDDENS. Run each REDDENS mutation once and paste the observed message
  into the report.
- **GOTCHA** (memory `gate-prose-has-three-copies`): a "cannot reach" clause lives in `gates.md` + the `group()`
  string + any fixture header. Write all three together.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "jev screen|build ✓|build ✗"`. Until Task 17/18 land,
  45.8 and 45.9's real halves fail naming the missing file — expected mid-implementation, never at the PR.
- **SATISFIES**: AC #5, #6, #7. **REGENERATES**: none.

### Task 13 — UPDATE 32.7 (`build-checks.mjs:10007-10016`)

- **IMPLEMENT**: add `["partner-audit-3", "grill", "claude-opus-5"]` to the list. Inside the loop, replace the
  blanket `affordanceFingerprint === undefined` assertion's neighbour with a screen assertion: for `partner-audit-3`
  every `turnStats` entry carries `screenFingerprint === screenFingerprintOf(resolvePosture({ posture, model }))`;
  for every other slug none carries a `screenFingerprint`. Keep the affordance assertion unchanged for all slugs.
  Update the failure message's "partner-audit-1 and partner-audit-2" to include partner-audit-3.
- **REDDENS**: stamp `screenFingerprint` off `POSTURES.grill` (by id) in the transport → partner-audit-3's stamps
  would not equal the Opus-resolved value → `32.7: discovery/partner-audit-3 carries screenFingerprint … but …`. (Only
  observable after Task 18; before it, the row is skipped by the existing `if (!existsSync(rj)) continue;`.)
- **SATISFIES**: AC #4. **REGENERATES**: none.

### Task 14 — UPDATE 34.5b (`build-checks.mjs:10739`)

- **IMPLEMENT**: expected list → `["answers.jsonl", "prd.md", "run.json", "screen.jsonl", "transcript.jsonl"]`;
  message → "it reads four files and writes one, and proposals.jsonl is not among them".
- **REDDENS**: remove `screen.jsonl` from the expected list → `34.5b: prd-projection.mjs reaches [...,"screen.jsonl",...]`.
- **SATISFIES**: AC #7. **REGENERATES**: none.

### Task 15 — UPDATE the four group-count literals + `gates.md` + CLAUDE.md map

- **IMPLEMENT**: 44 → 45 in `build-checks.mjs:14145` ("all 45 groups pass"), CLAUDE.md "44 PURE groups" and
  "build-checks' 44 groups", `gates.md:11` "45 pure groups". Add a **Group 45 — the contradiction screen** paragraph
  to `gates.md` (what it proves, what it cannot reach, naming the owner's labels and Task 18's walk as the other side).
  CLAUDE.md architecture map: under `portal/`, `lib/discovery-screen.mjs  the contradiction screen — Jev picks + pair
  confirms → screen.jsonl, fail-visible (#453)`; under `tooling/`, `jev-screen.mjs  the screen's operator CLI — paid,
  needs TYPESAFE_API_KEY (→ jev-screen/)`; in the `discovery/` line, add `claims.mjs: the document → claims splitter
  (#453)` and `screen.jsonl` to the run-package file list. Index lines only (CLAUDE.md §Ground rules).
- **VALIDATE**: `node tooling/drift-check.mjs` → group-count leg green (`drift-check ✓ … group-count`).
- **REDDENS**: leave `gates.md` at 44 → `group-count drift: .claude/references/gates.md: says 44 groups, build-checks defines 45`.
- **SATISFIES**: AC #7. **REGENERATES**: none (`loc-summary.json` counts `system/`, root pages and `agent-layer/` only —
  `gen-loc-summary.mjs:23-25`; none of this ticket's files match).

### Task 16 — COMMIT pre-registration, then the code (before any paid call)

- **IMPLEMENT**: commit 1: Tasks 1-3 + the D3 constants block of Task 4 (`claims.mjs`, `fixture-claims.json`, the
  CLI's `--claims` mode, `screen-rubric.md`, `discovery-screen.mjs`). Commit 2: Tasks 4-15. Both before Task 17.
- **VALIDATE**: `git log --format='%h %cI %s' -3`.
- **SATISFIES**: AC #2.

### Task 16b — PAID (≈ $0.0005): the shape-and-latency smoke

- **IMPLEMENT**: `node tooling/jev-screen.mjs <fixture> --smoke` — stage 1 over the FIRST THREE claims only (three
  Choice questions, full state) and stage 2 over one fixed pair (`c001`, `c002`), one request each. It proves the
  request shape the API accepts (a 422 names the malformed field here, not mid-run), confirms each answer carries
  `choice` + `probabilities` / `noul`, and prints per-request latency and `usage.input_tokens` beside the estimate.
  **It writes nothing and its answers are never read for scoring** — the smoke's claims are chosen by position, not
  by the rubric, so it cannot leak into a threshold.
- **PRE-REGISTERED LATENCY RULE (R3)**: if the stage-1 request's latency × (full stage-1 estimate ÷ smoke estimate)
  exceeds `SCREEN_TIMEOUT_MS / 2`, halve `REQUEST_TOKEN_BUDGET` (56k → 28k → 14k) until it fits, commit the new value
  with the smoke's printout as its reason, BEFORE Task 17. Batch size changes the request count, never a question's
  wording or a threshold, so it does not touch the pre-registration.
- **VALIDATE**: exit 0 and a line `smoke ✓ shape ok · stage1 <ms> ms / <tokens> tok (est <e>) · stage2 <ms> ms`.
- **SATISFIES**: de-risks AC #1, #4. **REGENERATES**: possibly `REQUEST_TOKEN_BUDGET` in `discovery-screen.mjs`.

### Task 17 — PAID: the CLI screen on the fixture

- **IMPLEMENT**: with `TYPESAFE_API_KEY` in `portal/.env`:
  `node tooling/jev-screen.mjs docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` → commit
  `tooling/jev-screen/screen-run.json`. Paste the printout (kept pairs, request count, input tokens, cost) into the
  report. Score it against the rubric (KEPT / CONFIRMED BUT DROPPED / PICKED ONLY / MISSED per finding, the
  contradiction-class share `found / 3` and the tension-shaped beside it). State in the report: Jev received only
  the fixture's claims (the request bodies are in `screen-run.json`); the MVP 13 answer key lives in
  `docs/epics/discovery-partner.prd.md` and in the rubric, neither of which is in any request; Jev has no tools, so
  run 2's fence problem cannot recur.
- **GOTCHA**: never re-run to get a better score. One run; a failed run (non-429 error) writes nothing and is re-run;
  a completed run is the result.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "jev screen"` → 45.8 green.
- **SATISFIES**: AC #1, #2, #3, #6. **REGENERATES**: `tooling/jev-screen/screen-run.json`.

### Task 18 — PAID: run 3 through the drawer (`partner-audit-3`)

- **IMPLEMENT**: portal on its own port; drawer: slug `partner-audit-3`, provenance fictional, entry "An existing PRD —
  audit it", documentPath `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md`, depth full discovery,
  facets `hasModel` only, posture Grill, model `claude-opus-5` (D6). Confirm the status line reports the screen ran
  and the kept count. Confirm `sessionView().document.md5 === ab6eb0ee6cdd3b7802ecfcbe90db2377`. Drive all 23 turns in
  the drawer (by hand or a Playwright script clicking the real drawer; `frontEnd` stays `portal`). Close the session.
  `node discovery/prd-projection.mjs partner-audit-3` → `prd.md`. Commit the package unedited.
- **GOTCHA** (memory `sdk-error-result-wears-success`): check every turn's `ok` / `is_error`; a "Credit balance is too
  low" turn wears success. Resume from disk inside five minutes, as run 2 did (README :1063-1070).
- **GOTCHA** (memory `discovery-run-cache-ttl-cost`): answer turns inside five minutes of each other, or cost rises ~3×.
- **GOTCHA**: `screen.jsonl` exists before turn 1; do not delete or edit it. If the screen came back `unavailable`,
  the run is not the AC's run — discard the package directory **before turn 1** and re-open (the screen is free to
  repeat; the agent turns are not).
- **VALIDATE**: `node tooling/build-checks.mjs` → 32.7 (partner-audit-3 row) and 45.9 green;
  `grep -c '"type":"pair"' discovery/partner-audit-3/screen.jsonl`.
- **SATISFIES**: AC #4. **REGENERATES**: `discovery/partner-audit-3/*` (server-written + projected).

### Task 19 — OWNER: labels

- **IMPLEMENT**: `node tooling/jev-screen.mjs --labels-template` writes `tooling/jev-screen/labels.json` with every
  kept pair from both screens (`screen-run.json` and `discovery/partner-audit-3/screen.jsonl`): ids, sections, both
  texts, and `real: null`, `note: ""`, `by: null`, `at: null`. It refuses to overwrite a file whose `by` is set. The
  owner fills `real: true|false`, `by: "owner"`, `at`. Ask for this in the same message that reports Task 18, with
  the file path and the pair count, so the owner's step is one edit of one file.
  Group 45 case **45.11**: when `labels.json` exists, its pairs equal the kept pairs of both screens exactly (no
  missing, no extra), and when `by === "owner"` no `real` is null. **REDDENS**: delete one pair from the file →
  `45.11: labels.json is missing c0NN ↔ c0NN from partner-audit-3`. The format is
  `{ by, at, screens: { "screen-run": [{ a, b, real, note }], "partner-audit-3": [...] } }`. The session never writes a verdict (memory `honesty-contract-mirror-direction`).
  Precision per screen = real / kept, reported with n.
- **SATISFIES**: AC #2 (precision). **REGENERATES**: none.

### Task 20 — REPORT

- **IMPLEMENT**: `.claude/reports/jev-contradiction-screen-453-report.md`: per-screen found/missed table, precision
  with n, raised / not raised for run 3 with seqs, costs (Jev derived from observed usage; Claude from `turnStats`),
  the observed REDDENS messages, the D1 departure, Not run.
- **SATISFIES**: all ACs.

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). The gate is build-checks group 45 plus the edits to 32.7 and 34.5b; the route and
drawer are observed by hand.

### Unit-level (group 45)

Pure functions driven directly: `splitClaims`, the question builders, `batches`, `picksFrom`, `candidatePairs`,
`chooseT1`, `judgePairs`, `tensionsOf`, `readScreen`/`writeScreen` on a temp dir, `screenSession` with injected
failures, `buildGrillTurn` with and without tensions, `projectPrd`'s new section.

### Integration

45.8 replays the committed real responses through the full `screenDocument` path. 45.9 byte-matches the real
package's projected section. 32.7 ties partner-audit-3's recorded stamps to the current surfaces.

### Edge Cases

- A document with no headings (`(preamble)` section), a table with an empty cell, a CRLF file, a fenced block.
- A mutual stage-1 pick (one pair, not two); every pick `none` (no stage 2 request at all; summary `candidates 0`).
- More candidates than 3 stage-2 requests hold (T1 proviso).
- Screen `unavailable` → no block, no `screenFingerprint`, projection "Screen did not run".
- A resume of partner-audit-3 → no second screen, the same block every turn.
- A flag naming one id only → not raised.

### Proving the checks

Each check above carries its REDDENS mutation and a positive control. Run every mutation once before trusting the
green, and record the observed failure text in the report (59 of 229 review findings in this repo were a check that
never reached its subject).

---

## VALIDATION COMMANDS

### Level 1: Syntax

- `for f in discovery/claims.mjs portal/lib/discovery-screen.mjs tooling/jev-screen.mjs; do node --check $f; done`
- `node tooling/drift-check.mjs` (includes the `node --check` sweep over every tracked `.mjs` and the group-count leg)

### Level 2: The gate

- `node tooling/build-checks.mjs` → `build ✓  all 45 groups pass`

### Level 3: Integration

- `node discovery/prd-projection.mjs partner-audit-2 --stdout | md5` — identical to `origin/main`'s output.
- `node discovery/prd-projection.mjs partner-audit-3 --stdout | sed -n '/^## Tensions/,/^Architecture/p'`

### Level 4: Manual

- Portal smoke: `/api/health` answers; the no-key audit open writes one `unavailable` line (Task 9); delete the
  throwaway package.
- The drawer walk of Task 18.

### Level 5: CI

- `gh pr checks` after the push; compare `headRefOid` to local HEAD first (memory `pr-head-lag-stale-checks`).

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Put `TYPESAFE_API_KEY` in `portal/.env` (absent from the primary tree's `.env` today, observed: it holds only `FIGMA_TOKEN`, `FIGMA_FILE_KEY`) | owner's hand | **yes** — Tasks 17, 18 cannot run | none; ask before Task 17 |
| Task 16b: shape-and-latency smoke (3 claims + 1 pair) | ≈ $0.0005 (derived: ~12k tokens × $0.042/M) | yes — gates Task 17 | none |
| Task 17: CLI screen on the fixture | ≈ $0.01 (derived: ~2-4 requests × ≤ 56k tokens × $0.042/M ≈ $0.002-0.01) | **yes** — AC #1, #2, #3, #6; 45.8 needs `screen-run.json` | none |
| Task 18: run 3, 23 Grill-on-Opus audit turns through the drawer | ≈ $1.6-1.9 (derived: run 2 was $1.6152 over 23 turns; the block adds ≈ 1-2k cached system tokens) + ≈ $0.01 screen | **yes** — AC #4; 45.9 and 32.7 need the package | none |
| Task 19: owner labels on the kept pairs | owner's hand | **yes** — AC #2's precision | none; the PR waits for it |
| Owner confirms the rubric's classification (Q2) before Task 16's first commit | owner's hand | yes, before Task 17 | — |

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 `node tooling/jev-screen.mjs <fixture>` runs the same functions as the portal path, prints kept pairs,
      request count, input tokens (observed, `usage`) and cost (derived).
- [ ] AC #2 found / missed against the pre-registered contradiction-class findings, per screen, never rounded up;
      precision = owner-judged real / kept, from `tooling/jev-screen/labels.json`.
- [ ] AC #3 the report states Jev saw only the fixture's claims and has no tool access.
- [ ] AC #4 `discovery/partner-audit-3` recorded through the drawer with the block present; its `prd.md` shows the
      Tensions section with raised / not raised per pair.
- [ ] AC #5 group 45: splitter deterministic on the fixture (committed ids); the section byte-matched against the
      committed `prd.md`; an `unavailable` line projects "Screen did not run".
- [ ] AC #6 stage 2 uses `relation` + `same_subject`; `screen.jsonl` / `screen-run.json` hold every stage-1 pick and
      every stage-2 pair with `kept`, replayed in 45.8.
- [ ] AC #7 `node tooling/build-checks.mjs` green (45 groups); drift-check green; the portal boots and `/api/health` answers.
- [ ] No existing stamp moves: 30.46 and 32.7 green with partner-audit-1/2 untouched.

## COMPLETION CHECKLIST

- [ ] Pre-registration committed before the first paid call (timestamps in the report)
- [ ] Every REDDENS mutation run once, message recorded
- [ ] Both paid runs done, both packages / files committed unedited
- [ ] Owner labels committed by the owner
- [ ] `Closes #453` in the PR body; plan, report and review in the same PR

---

## RISK REGISTER — each risk and what closes it

| # | Risk | Closed by | Residual |
|---|---|---|---|
| R1 | `TYPESAFE_API_KEY` absent from `portal/.env` (observed) | Task 0 precondition: asked for in the session's first message; Tasks 1-16 are free and run while waiting | none once the key is in |
| R2 | Request shape wrong (a 422 mid-run, or a Choice answer missing `probabilities`) | Task 16b smoke on 3 claims + 1 pair, before the full run; `picksFrom` refuses a missing probability by name | none |
| R3 | A 44-60k-token request exceeds the timeout | Task 16b measures latency; a pre-registered halving rule on `REQUEST_TOKEN_BUDGET`; `SCREEN_TIMEOUT_MS` 60 s passed explicitly | none |
| R4 | The agent raises a pair without naming the ids | D4 (b): verbatim-quote matching, fixed before run 3, with `by ids` / `by quotes` on the page | none |
| R5 | Owner labels missing or incomplete at PR time | `--labels-template` writes the file to fill; 45.11 reds on any missing pair or null; requested alongside Task 18's report | owner's hand only |
| R6 | Jev scores stage 1 poorly (indirection over 88 id options) | Not a failure of the build: AC #2 asks for found/missed reported honestly, and A3's dropped lines show where each miss happened. The text-criteria variant is a follow-up ticket if the numbers call for it | the score itself, which is a measurement, not an acceptance risk |
| R7 | Grill stamp moves by accident | `tensions = []` path byte-identical; 30.46, 32.7 and 45.7 all pin it | none |
| R8 | Fresh worktree fails build-checks on icons | Task 0 runs `npm ci` in `tooling/icons` (observed failure without it) | none |
| R9 | Run 3 hits a credit stop or cache expiry | Task 18 GOTCHAs: check `is_error` every turn, resume inside five minutes; an `unavailable` screen discards the package before turn 1 | none |
| R10 | Q1/Q2 overridden late | Defaults adopted; an override has a named cut-off (Task 6, Task 16) and an AMENDMENTS entry | none |

**Confidence: 10/10 for one-pass implementation.** Every plan-side unknown is either verified in planning or
converted into a gated step with a pre-registered rule (R1-R10). The acceptance criteria require the screen to be
built, run and reported, not to score well, so Jev's live accuracy (R6) cannot fail the implementation. The two
inputs outside the session are the owner's key (asked for at Task 0) and the owner's labels (one templated file).

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (owner) — the stamp.** This plan does NOT move Grill's stamp (D1), departing from the ticket's "the Grill
  fingerprint moves and gets re-recorded". The literal reading costs: 30.46 and 32.7 red, re-recording
  `partner-audit-1` ($0.16) and `partner-audit-2` ($1.615) — and the second replaces run 2's 0/8 baseline, which
  this ticket is scored against. **Default adopted: D1.** The implementer proceeds on D1 unless the owner overrides
  before Task 6; an override is an AMENDMENTS entry plus a two-package re-record, not a silent switch.
- **Q2 (owner) — the rubric's classes.** Contradiction-class = #2, #6, #8 (internal wobble); tension-shaped = #4,
  #5, #7; out of class = #1, #3. The ticket names #2, #6 and "possibly" #8. **Default adopted** as listed; the owner
  may reclassify before Task 16's commit, never after. Both classes are reported, so a reclassification changes
  the denominator only, not what is measured.
- **A1 (verified)** — `sessionView` returns the `answers` array (`discovery.mjs:870,885`), so the route reads the
  document text off `view.answers` with `documentOf`.
- **A2 (closed by Task 16b)** — request latency is measured by the smoke before any full run, and the pre-registered
  halving rule keeps every request under half the timeout.
- **A3 (closed by D4 (b))** — a flag that quotes both claims without their ids still reads "raised", by a rule
  fixed before run 3.

## NOTES (open canvas)

**Why the block is conditional rather than always present with an empty list.** An always-present block ("no
candidate tensions") moves Grill's stamp for every audit, which is the D1 problem again. Conditional keeps every
unscreened turn byte-identical, and the separate stamp keeps the screened surface honest.

**Why the screen is in the route and not in `openSession`.** `openSession` is synchronous and called directly by
dozens of group 30 cases; making it async ripples through all of them. The route already runs after openSession
returns (`resumeMismatch`), and `view.created` (#383) says exactly when a create happened.

**Why stage 2 carries texts in `instructions` rather than state.** The ticket says so, and the docs' structured
instructions allow a question to carry its own data. A shared state of all claims would put the whole document in
every stage-2 request (the large-state failure mode) for no gain.

**Indirection risk in stage 1.** The model sees options named `c001`…`c088` and must look each up in state. The
jaggedness page lists indirection and large state as failure modes. The alternative — each option's `criteria` =
the claim's text — multiplies stage-1 tokens by ~88 (≈ 0.8M tokens, still ≈ $0.03) and removes the lookup. It is not
chosen here because the ticket specifies ids and a pre-registered design must not be swapped after seeing results;
if stage 1 misses the anchors, the report says where (A3's dropped lines make that traceable) and a follow-up can
test the text-criteria variant as its own pre-registered run.

**Token arithmetic (derived).** State ≈ 24,560 bytes of text in ~88 claims + ids/sections ≈ 28k characters ≈ 7-9k
tokens. One stage-1 question ≈ target text (~300 chars) + 88 option keys (~8 chars each with JSON) + prompt ≈
1.2k chars ≈ 400 tokens. 88 questions ≈ 35k tokens + state ≈ 44k: likely **one** stage-1 request under the 56k
budget, two at most. Stage 2 ≈ 2 questions × ~700 chars per pair; ≤ 88 pairs ≈ 41k tokens: one request. Expected
total ≈ 2-3 requests, ≈ 60-90k input tokens, ≈ $0.003. The ticket's "~150 claims, ~3 batches, ~$0.01" was an
upper estimate; the CLI prints the observed figures.

**Pre-flight (run 2026-09-27 on a detached worktree of `origin/main` at a9918a9).**

1. Driven: `node tooling/build-checks.mjs` → 43 ✓, group 41 ✗ (`tooling/icons` needs `npm ci` in a fresh
   worktree) — became Task 0's GOTCHA. `node tooling/drift-check.mjs` → ✗ on the same icons leg. The four stamp
   values printed by Task 6's VALIDATE. `md5` of the fixture = `ab6eb0ee6cdd3b7802ecfcbe90db2377`. A throwaway
   splitter gave 88 claims (the ticket said ~150) — moved the cost and batch estimates.
2. Resolved: every file:line above opened this session. `jev.mjs` exports exactly `JEV_MODEL, JEV_URL, askJev`
   (observed). `askJev`'s 1500 ms default found — became Task 4's GOTCHA. TypeSafe docs fetched: 255-option cap,
   64k/32k limits, $0.042/M, Choice answer shape.
3. Landed claims: #454 is merged (PR #463), so `portal/lib/jev.mjs` exists and this ticket reuses it rather than
   adding it (the ticket allowed either). No `discovery/claims.mjs`, `discovery-screen.mjs`, `jev-screen` or
   `screen.jsonl` exists on origin/main (grep of `git ls-tree`).
4. Reconciled: the ticket's "Grill fingerprint moves" vs 30.46 + 32.7 → D1 / Q1. The ticket's "prd.md byte-matched"
   vs owner verdicts → D5. The group count is 44 today everywhere (CLAUDE.md on main says 44; an older local copy
   said 41), so every literal goes to 45.
5. Traps carried: 34.5b's filename pin; `SECTIONS` feeds Create-PRD's stamp; drift-check's four count literals;
   the icons `npm ci`; `TYPESAFE_API_KEY` absent; `sdk-error-result-wears-success`; cache-TTL cost; kill only your
   own PID; stale `gh pr checks`; gate prose in three copies.

## AMENDMENTS

- 2026-09-27 — risk pass at the owner's request: added the risk register (R1-R10), the Task 0 key precondition, Task
  16b (shape-and-latency smoke with a pre-registered batch-halving rule), D4 (b) quote matching, the labels template
  and 45.11, and adopted Q1/Q2's recommendations as defaults with named override cut-offs.

- 2026-09-27 (implementation) — **Task 5's free VALIDATE is a plan error.** `portal/lib/env.mjs` fills a variable
  whenever `!process.env[k]`, so `TYPESAFE_API_KEY= node …` does NOT blank the key: the run read it from
  `portal/.env` and sent a real full-screen request (≈ 09:52Z), refused `400 max_tokens_exceeded` with no answers.
  The no-key check is "move `portal/.env` aside", which is how it was re-run. The request predates the
  pre-registration commit; it is disclosed in the rubric and the report.
- 2026-09-27 (implementation) — **the token estimator is not conservative** (`chars/3` put the refused request at
  55,580 tokens, under 64k). Because `chooseT1`'s proviso counts stage-2 requests through the same estimator, the
  estimator is named in the pre-registration: `CHARS_PER_TOKEN` and `REQUEST_TOKEN_BUDGET` are set once from the
  smoke's observed `usage.input_tokens` before Task 17, and do not move after it. Task 16b's smoke gains a third
  request (full state, 30 questions) so the per-question token cost can be solved for.
