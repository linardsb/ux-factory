# Feature: the inbox — one read-only "waiting on you" surface (D1, #319)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Eight queues of "something is waiting on the owner" (nine row kinds: a stale frame splits into stale and dangling) live in five places today: a parked discovery question,
a discovery feature proposal with no verdict, a screen missing a required state, a frame linked to no decision,
a frame whose decision was re-recorded (stale), a proposal waiting for ratify, an unbound import with snaps
nobody confirmed, and the compose loop's open agent proposal. The inbox is one portal page, `#/inbox`, that
lists them per run, each row a link to the exact place the decision is made, naming the one verb that clears it.
It is a pure fold over files that already exist: no new op, no new write path, no stored state.

## User Story

As the owner, operating the factory alone
I want one page that lists everything across discovery and build that only I can clear, blockers first
So that I never have to open five panels to find out why a run is stuck, and every item takes me straight to its fix

## Problem Statement

Each queue has a reader already (`missingStates`, `staleFrames`, `openProposals`, `foldProposals`, the import
record's `unbound` block, `ledgerView`), but each is rendered only inside its own panel. Nothing answers "what
is waiting on me across all runs", and the run list gives no hint which run needs attention.

## Solution Statement

`portal/lib/inbox.mjs` exports `inbox(roots)`: for every build run `listBuilds(roots)` already lists, it loads
the package with the existing readers and emits one row per waiting item, sorted blockers first, then oldest
first. One read route (`GET /api/inbox`) serves it; `portal.js` renders it at `#/inbox` and puts the per-run
count ("N waiting") from the SAME response on the run list. Rows link to `canvas.html?…&frame=<id>` (a new
boot-time focus seam), `?import=<name>` / `?promoted=<name>` (existing), or `#/discovery/<provenance>/<slug>`
(a new SPA route that opens the discovery drawer on that package).

## Out of Scope / Non-Goals

- Not included: discovery-only packages (no `build/`). **Owner, 2026-10-01** — the graded-* judge fixtures would add ~75 rows that are not the owner's work.
- Not included: parked questions in a FINISHED session. **Owner, 2026-10-01** — `discovery.mjs:280` refuses every turn once `endedAt` is set, so no verb can clear them; they stay in `prd.md`'s Open questions.
- Not included: per-lane missing states. Rows read lane A (`missingStates(doc)`); `flow.md` already reports each lane (group 49).
- Not included: a score, a percentage, a badge colour per severity, a "% complete" (PRD rule: progress by class closed).
- Not included: any write. The inbox never clears a row itself; a row is cleared only by its verb on its own page.
- Not changing: `canvas-store.mjs`, `canvas-ops.mjs`, `discovery/ops.mjs`, `discovery/proposals.mjs`, `import-run.mjs`. The inbox only calls their exports.
- Not changing: `/api/canvas/runs`'s response shape (the count rides `/api/inbox`, so the canvas journey's existing run-list assertions are untouched).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `portal/lib/` (new module), `portal/server.mjs`, `portal/public/portal.js` + `portal.css` + `index.html`, `portal/public/canvas.mjs` (one boot seam), `tooling/build-checks.mjs` (group 51), `tooling/canvas-journey.mjs` (pass W), `tooling/run-316-ready.mjs`
**Dependencies**: none new. Node built-ins only.

## Related Work

**Implements**: #319 (`Closes #319`)   ·   **Epic**: #295, `docs/epics/canvas-design-import.architecture.md` §"Addendum 2026-08-28: the owner drives", row D1 (line 390): "`portal/lib/inbox.mjs`, a pure fold over the run packages, and one SPA hash route (`#/inbox`)".

**Back-references**:
- `.claude/plans/canvas-page-run-list-arrangement-ops-306.md` — `listBuilds` and the run list ("#319's inbox reads `listBuilds`", line 105).
- `.claude/plans/decision-blast-radius-318.md` — exports `staleFrames` for this ticket (line 88).
- `.claude/plans/discovery-proposals-359.md` — "#319 (the inbox — will read `foldProposals` as a queue)" (line 122).
- `.claude/plans/compose-and-name-groups-315.md` — proposals pending ratify now also carry `groupId` (line 107).
- `.claude/plans/faster-payment-build-run-316.md` — check 3 of `run-316-ready.mjs`; PR #495 review F3 (pin the export, not the file).

**Forward-references**: #316's sitting step 10 ("open `#/inbox`; clear it, or give each remaining row a reason").

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

All line numbers are `origin/main` at `d1c8f3f` (read 2026-10-01).

- `portal/lib/canvas-store.mjs:19-23` — the SDK-free rule this module inherits (imports node built-ins + `canvas-ops` only; group 36.6 pins it). The inbox may import canvas-store; canvas-store must never import the inbox.
- `portal/lib/canvas-store.mjs:423-441` — `listBuilds(roots)` → `[{provenance, slug, label, declared, hasTranscript}]`, skip-never-throw. The inbox's run set IS this list.
- `portal/lib/canvas-store.mjs:91-121` — `loadBuild(root)`: `null` for no build half, THROWS naming file+line for a malformed one.
- `portal/lib/canvas-store.mjs:171-191` — `foldLedger(lines)` → `{doc, effective}`; `effective` lines keep `at` and `seq`.
- `portal/lib/canvas-store.mjs:443-447` — the local `readJsonl` shape (not exported) to MIRROR for the inbox's own reader.
- `portal/lib/canvas-store.mjs:456-478` — `loadDecisions(pkgRoot)`: `null` for a stand-in, else rows with `seq`, `supersedes`.
- `portal/lib/canvas-store.mjs:525-529` — `openProposals(lines)`: the agent's `proposed` lines no verdict answers.
- `portal/lib/canvas-store.mjs:555-584` — `appendAgentLine`: "one open proposal at a time (LOOP)" — the reason an open agent proposal BLOCKS a run.
- `system/canvas-ops.mjs:767-787` — `missingStates(doc, lane)`: base frames only, list of missing keys.
- `system/canvas-ops.mjs:789-814` — `staleFrames(doc, transcript)` → `[{frameId, ref, status: "stale"|"dangling", latest}]`; accepts `loadDecisions` rows.
- `system/canvas-ops.mjs:1077-1085` — `frameLabel(doc, id)` → `"add-payee"` / `"error of add-payee"`.
- `system/canvas-ops.mjs:553-605` — `component.propose` / `proposal.ratify`: `doc.proposals[]` = `{id, name, recordId|groupId, mode, status}`; ratify refuses `mode === 2` (line 593) and anything not `proposed`.
- `system/canvas-ops.mjs:335-342,384-391` — `screen.compose` sets `decisionRefs: p.decisionRefs ?? []` (line 341); `state.add`'s pushed frame carries NO `decisionRefs` key.
- `discovery/ops.mjs:231-286` — `ledgerView(ops)` → `.openQuestions[]` `{seq, turn, source, questionId, answerRef, reason}` and `.decisions[]` `{seq, questionId, ...}`. Total over junk.
- `discovery/proposals.mjs:259-277` — `foldProposals(lines)` → `[{proposal, status, verdicts, seq}]`; `status` is the last verdict or `"proposed"`. Its imports (`bank.mjs`, `ops.mjs`, `prd-projection.mjs`) are pure — group 34 loads them in CI.
- `portal/lib/import-run.mjs:236-239` — `unboundCount` (reads `record.source.bound === false`). Do NOT import import-run.mjs (it imports `env.mjs`, which loads `portal/.env`); read `build/imports/<id>.json` directly.
- `import/report.mjs:118-145` — the record carries `source.bound` and `unbound: {dropped, exact, overridden, proposed, slots}`; `proposed` is the count of unedited snaps (O3a, `import/snap-rules.mjs:7-17`).
- `portal/lib/import-run.mjs:367-375` — `editMapping` refuses once the proposal is ratified, so an unbound row is only listed while its proposal is `proposed`.
- `portal/lib/discovery.mjs:280` — "a closed session takes no more turns" (why finished sessions are out).
- `portal/server.mjs:459-464` — `/api/canvas/runs` and its two roots literal; the new route sits beside it.
- `portal/server.mjs:238-245` — `GET /api/discovery/session?slug&provenance` → `sessionView(root)`; the drawer deep link reuses it.
- `portal/public/portal.js:1632-1672` — `renderRuns()` and `route()`; the new route and count go here.
- `portal/public/portal.js:749-752, 961-1005, 1009-1075, 1178-1184` — the drawer's open button, the Start handler (sets `discovery.session`, then `renderDiscoverySession()` + `loadProposals()`), `renderDiscoverySession`, `loadProposals` (reads slug/provenance from the inputs via `discoveryEls()`, line 694-697).
- `portal/public/index.html:20-26` — the header bar; add an "Inbox" link beside "Canvas".
- `portal/public/portal.css:410-416` — `.cv-runs` / `.cv-run` / `.cv-run-meta`: the list idiom to MIRROR.
- `portal/public/canvas.mjs:76-78, 1056-1105` — `qs` and `boot()`; the `?frame=` seam goes after `mountPromoted(getCanvasPage)` (line 1097). Frame nodes are `[data-stx-id="<id>"]`; the details button is `[data-cv-details="<id>"]` (journey line 356); `canvas.say(text)` announces.
- `portal/public/canvas-import.mjs:393-397` and `canvas-groups.mjs:150-152` — the existing `?import=<name>` and `?promoted=<name>` boot seams the ratify/mapping rows link to.
- `tooling/build-checks.mjs:17356-17400` — group 50's opening: scratch `pkgCopy` via `seedSpine`, `fold`/`afold`, the 50.1 import-pin idiom (parse specifiers, `RF_ALLOWED`, no SDK/zod/dynamic import). MIRROR it for group 51.
- `tooling/build-checks.mjs:14809-14817` — 43.7's synthetic unbound Figma export (one `fontSize` unbound). Reuse it verbatim for the unbound-import fixture.
- `tooling/build-checks.mjs:17876-17881` — the `build ✓  all 50 groups pass` line.
- `tooling/canvas-journey.mjs:286-300` — `seed()`; add `fp-inbox`. `:799-814` — `seedSupersede(slug)`, reused as is. `:816-911` — `blastPass`, the pass to MIRROR (B2/B3 drive Re-confirm).
- `tooling/run-316-ready.mjs:9, 69` — check 3's header line and body.
- `tooling/drift-check.mjs:195-218` — the group-count leg: build-checks' pass line, CLAUDE.md twice, gates.md.

### New Files to Create

- `portal/lib/inbox.mjs` — the pure fold (`inbox`, `KINDS`, `hrefFor`, `entryFrames`).

### Relevant Documentation

- `docs/epics/canvas-design-import.architecture.md:384-395` — D1's placement (inherited, not re-decided).
- `docs/epics/canvas-design-import.prd.md:247-249` — "D1 one inbox of everything waiting on the owner".
- `discovery/README.md:133-140` — parking is `open_question` with `source: banked`.
- `.claude/references/gates.md` — group entries, `canvas-journey.mjs` paragraph, the run-316 paragraph (line 135).
- No external docs: zero-dep Node + vanilla DOM.

### Patterns to Follow

**Module header** (invariants live in the file): open with what/why + governing doc, then numbered invariants, as `canvas-store.mjs:1-36` does. State: A1–A4 as DECISIONS naming their predicate; read-only; SDK-free and CI-importable; the run set is `listBuilds`'; the nine kinds and their verbs; ordering rule; "entry frame" definition; what it cannot reach.

**Skip-never-throw for the run set, throw-naming-the-file for a malformed package** (`canvas-store.mjs:419-421, 87-89`). The inbox catches a per-run throw and reports it in `errors[]` (never a row: an error has no verb), so one bad package never takes the page down.

**Total over junk for reads** (`discovery/ops.mjs:225-227`): a missing `proposals.jsonl`, no `transcript.jsonl`, no `imports/` directory all answer "no rows".

**Rendering**: template strings through `esc()` (`portal.js:3`), the `api()` helper (`portal.js:7-11`), list markup like `renderRuns` (`portal.js:1638-1650`).

**Errors**: plain `Error` naming the path (CLAUDE.md §Ground rules). The route lets the server's catch-all answer `{error}`.

---

## THE FOLD — exact rules (the implementer must not re-decide these)

`inbox(roots)` → `{ rows, counts, errors }`.
- `roots`: the same `[{provenance, dir}]` array `listBuilds` takes.
- `counts`: `{ "<provenance>/<slug>": n }` for EVERY listed run, zero included (the run list renders "0 waiting" as nothing; see Task 4.2).
- `errors`: `[{ provenance, slug, message }]` — a run whose package threw while loading; its rows are omitted.

Each row: `{ provenance, slug, kind, blocking, at, subject, text, verb: { label, href } }`. `at` is an ISO string;
`subject` is the stable id the kind keys on (below); `text` is one plain sentence; `href` comes from `hrefFor`.

For each run `r` of `listBuilds(roots)`: `pkg = <dir>/<slug>`; `b = loadBuild(pkg/build)` (null → skip the run, zero rows);
`{doc, effective} = foldLedger(b.ops)`; `decisions = loadDecisions(pkg)` (null = stand-in);
`born` = for each frame id, the `at` of the effective line whose application first created it (walk `effective`
with `applyOp` from `emptyDoc()`, record the first line after which the id appears). Then:

| kind | listed when | one row per | subject | verb label | href target | blocking | at |
|---|---|---|---|---|---|---|---|
| `agent-proposal` | `openProposals(b.ops)` non-empty | open line | `seq:<n>` | `Accept or refuse` | canvas | **always** (LOOP: `appendAgentLine` refuses the next turn) | the line's `at` |
| `stale-frame` | `staleFrames(doc, decisions)` rows with `status: "stale"` | frame | `frame:<id>` | `Re-confirm` | canvas `frame=<id>` | when the frame is an **entry frame** | `born[id]` |
| `dangling-ref` | same read, `status: "dangling"` | frame | `frame:<id>` | `Re-link decisions` | canvas `frame=<id>` | no | `born[id]` |
| `missing-state` | `missingStates(doc)` (lane A) | base frame × missing key | `frame:<id>/<key>` | `Add the <key> state` | canvas `frame=<id>` | no | `born[id]` |
| `unlinked-frame` | base frame (`baseId == null`), `decisionRefs` empty or absent, AND `decisions !== null` | frame | `frame:<id>` | `Link a decision` | canvas `frame=<id>` | no | `born[id]` |
| `ratify-pending` | `doc.proposals[]` with `status: "proposed"` and `mode: 1` | proposal | `proposal:<id>` | `Ratify` | canvas `import=<name>` (recordId) or `promoted=<name>` (groupId) | no | the `component.propose` line's `at` |
| `unbound-import` | a `doc.proposals[]` entry with `recordId` and `status: "proposed"` whose `build/imports/<recordId>.json` has `source.bound === false` and `unbound.proposed > 0` | record | `import:<recordId>` | `Confirm the snaps` | canvas `import=<name>` | no | the `component.propose` line's `at` |
| `open-question` | run.json `endedAt` is null AND an `open_question` in `ledgerView(ops).openQuestions`, where `ops` = transcript lines filtered `type === "op"` FIRST (denied lines carry `tool`/`input`, never `op` — observed — but the filter is explicit, never left to `ledgerView`'s OPS check) with no LATER `record_decision` naming the same non-null `question_id` | op | `seq:<n>` | `Resume in Discovery` | discovery | no | the transcript line's `ts` |
| `feature-proposal` | `foldProposals(proposals.jsonl lines)` rows with `status: "proposed"` | proposal | `proposal:<id>` | `Give a verdict` | discovery | no | the proposal line's `ts` |

Rules that the table compresses:
- **Entry frame**: a base frame (lane A) that no arrow targets (`doc.arrows[].to.frameId`). If every base frame is targeted (a cycle), the first base frame in document order. Exported as `entryFrames(doc)` so group 51 can drive it. On the spine, f1 is the entry (observed: `a1` is f1 → f2, and f2 is a state).
- **Discovery rows need a transcript**: `hasTranscript === false` (a stand-in) → no `open-question`, no `unlinked-frame`. `proposals.jsonl` absent → no `feature-proposal`.
- **`run.json` unreadable or absent** → treat the session as finished (no `open-question` rows). Never throw for it.
- **Order**: `blocking` rows first, and WITHIN the blocking half by `KINDS` order before `at` (so the loop-holding `agent-proposal` always leads, even though a stale frame's `born` is older); the non-blocking half by `at` ascending (oldest first). Remaining ties: `provenance`, `slug`, `KINDS` order, then `subject` (`localeCompare`). Deterministic — group 51.5 pins it.
- **`KINDS`**: exported, frozen, in the table's order.
- **`hrefFor(target)`**: `{page: "canvas", provenance, slug, frame?|import?|promoted?}` → `/canvas.html?` + `URLSearchParams` in key order provenance, slug, then the one optional key; `{page: "discovery", provenance, slug}` → `#/discovery/<provenance>/<slug>` (both already pass `RUN_SLUG_RE`). The agent-proposal href carries no extra key: the compose panel shows the open proposal on load (`canvas.mjs:742`).
- **Text** (plain sentences, no counts dressed as progress): e.g. `add-payee is missing its empty state.` · `add-payee: decision 7 changed since linked — now 31.` · `spike-list-row waits for ratify.` · `Import i1 has 1 snap nobody confirmed.` · `The agent proposed screen.compose confirm — waiting for your verdict.` · `Parked: s1-what-would-have-to-be-true — "<reason>".` · `Feature p1 "<title>" has no verdict.` Use `frameLabel(doc, id)` for frame names.

Pre-flight evidence for these rules is in NOTES.

---

## IMPLEMENTATION PLAN

Work on a fresh branch off `origin/main` (NOT `fix/importer-reads-icon-name-449`, which is behind and dirty):
`git fetch && git switch -c feat/inbox-319 origin/main`. In a fresh worktree run `npm ci` in `portal/`,
`tooling/icons/`, `tooling/visual-regression/`, `tooling/style-dictionary/` first (memory `local-agent-visual-gate-notes`;
observed: build-checks group 41.7 and drift-check red without `tooling/icons/node_modules`).

### Phase 1: The fold
`portal/lib/inbox.mjs`, pure, CI-importable.

### Phase 2: The gate
**Depends on:** Phase 1. Group 51 in `build-checks.mjs`, plus the count bump in five places.

### Phase 3: The surface
**Depends on:** Phase 1. **Independent of:** Phase 2.
The route, `#/inbox`, the run-list count, the `#/discovery/...` drawer link, the `?frame=` canvas seam.

### Phase 4: The journey + the gate prose
**Depends on:** Phase 3. Pass W in `canvas-journey.mjs`; `run-316-ready.mjs` check 3; `gates.md`; CLAUDE.md map.

---

## STEP-BY-STEP TASKS

### Task 1.1 — CREATE `portal/lib/inbox.mjs`

- **IMPLEMENT**: header (see Patterns), then:
  - imports — exactly: `node:fs` (`existsSync`, `readFileSync`), `node:path` (`join`), `../../system/canvas-ops.mjs` (`applyOp`, `emptyDoc`, `frameLabel`, `missingStates`, `staleFrames`), `./canvas-store.mjs` (`foldLedger`, `listBuilds`, `loadBuild`, `loadDecisions`, `openProposals`), `../../discovery/ops.mjs` (`ledgerView`), `../../discovery/proposals.mjs` (`foldProposals`).
  - `export const KINDS = Object.freeze([...9 kinds in table order])`.
  - `export function hrefFor(target)` per THE FOLD.
  - `export function entryFrames(doc)` → array of base frame ids per the rule (A3); total over junk (`[]`).
  - `export function needsLink(frame, decisions)` (A1), `export function blocks(row, doc)` (A2), `export function questionCleared(openQ, ops, run)` (A4) — a few lines each, each the ONE place its rule lives; `inbox()` calls them and restates none.
  - a local `readJsonl(file)` mirroring `canvas-store.mjs:443-447` (throws `"<file> line <n> is not JSON — …"`), and a local `readJson` that answers null on failure for `run.json` / import records.
  - `export function inbox(roots)` per THE FOLD; per run wrapped in `try { … } catch (e) { errors.push({provenance, slug, message: e.message}) }`.
- **PATTERN**: `canvas-store.mjs:423-441` (run walk), `:456-478` (transcript filter `l.type === "op"`), `canvas.mjs:218-220` (the page calls `missingStates(view, lane)` and `staleFrames(doc, decisions)` the same way).
- **GOTCHA**: never import `import-run.mjs`, `discovery.mjs`, `env.mjs` or anything under `portal/node_modules` — `env.mjs` loads `portal/.env` into the process (canvas-journey.mjs:801 says why), and CI has no `portal/node_modules`. Never import `prd-projection.mjs`'s `readPackage` for the transcript: it refuses lines a view should tolerate.
- **GOTCHA**: `staleFrames` returns one row PER REF; group stale rows by frame (one row per frame, listing every stale ref), because Re-confirm re-pins all of a frame's stale refs in one `frame.link` (`canvas.mjs:204-206`, `reconfirmRefs`). Same for dangling.
- **GOTCHA**: the transcript's op lines carry `ts`, ops.jsonl lines carry `at`. Do not confuse them.
- **GOTCHA**: no write call of any kind in this file (`writeFileSync`, `appendFileSync`, `mkdirSync`, `rmSync`, `copyFileSync`); group 51.1 greps for them.
- **VALIDATE**: `node --input-type=module -e 'import { inbox } from "./portal/lib/inbox.mjs"; const r = inbox([{provenance:"fictional",dir:"discovery"}]); console.log(r.rows.map(x=>x.kind+" "+x.subject).join("\n"), JSON.stringify(r.counts), r.errors.length)'` — (expected, today's committed package) three rows `missing-state frame:f1/empty`, `frame:f1/partial`, `frame:f1/loading`, `{"fictional/faster-payment":3}`, `0`. NOTE: #316's sitting appends to this package, so this exact output is only today's; group 51 pins a `seedSpine` copy instead.
- **REDDENS**: n/a (no check added here).
- **SATISFIES**: AC 1, AC 3.
- **REGENERATES**: none (`portal/` is in no `loc-summary` group — `agent-layer/gen-loc-summary.mjs:26-28`).

### Task 2.1 — ADD group 51 "inbox" to `tooling/build-checks.mjs`

Place it after group 50's block (before `if (failures)` at line 17876), in group 50's voice: one `{ … }` block, `fold`/`afold`, scratch dirs under `mkdtempSync(join(tmpdir(), "uxf-g51-<tag>-"))`, a `pkgCopy` over `seedSpine(…, { discovery: true })` that reds by name when the seed fails (copy group 50's lines 17371-17379).

Cases:
- **51.1 import pin + read-only**: dynamic `import("../portal/lib/inbox.mjs")` inside try (CI has no portal/node_modules — the import succeeding IS the SDK-free proof); parse specifiers as 50.1 does; allowed = `node:` + `../../system/canvas-ops.mjs`, `./canvas-store.mjs`, `../../discovery/ops.mjs`, `../../discovery/proposals.mjs`; and `node:fs` present (or the parse read nothing); no `claude-agent-sdk|@anthropic-ai|@modelcontextprotocol|zod`, no `import(`; no `writeFileSync|appendFileSync|mkdirSync|rmSync|copyFileSync|renameSync|unlinkSync` in the comment-stripped source. **REDDENS**: add `import "./env.mjs";` → "51.1: … imports […, "./env.mjs"]"; add `writeFileSync` to the fs import → "51.1: … writes".
- **51.2 empty**: `inbox([])`, `inbox([{provenance:"real", dir:"/nonexistent"}])`, and a scratch root holding one package with an empty `build/` directory (no ops.jsonl, no canvas.json → `loadBuild` null) each answer `{rows: [], errors: []}` and do not throw; the empty-build package's count is `0`. **REDDENS**: drop the `b === null` skip → the third case throws/errors → "51.2: an empty package answered errors […]".
- **51.3 the spine**: a `pkgCopy("spine")` under a scratch `_discovery` root → rows deep-equal to exactly three `missing-state` rows (f1 × empty, partial, loading, in that order), `blocking: false`, `at: "2026-09-18T00:00:00.000Z"`, verb labels `Add the empty state` …, href `/canvas.html?provenance=real&slug=spine&frame=f1`; `entryFrames(spineDoc)` deep-equals `["f1"]`. Also run `inbox` over the COMMITTED `discovery/` root and assert only: no throw, `errors` empty, every row's `kind` in `KINDS`, `counts` sum equals `rows.length` (the committed package grows with #316, so no literal there). **REDDENS**: change `missingStates(doc)` to `missingStates(doc, "b")` → spine rows `[]` → "51.3: the spine answered 0 rows".
- **51.4 one positive control per kind, each cleared by its own verb** (each on its OWN `pkgCopy`, so one fixture's side effect never feeds another's assertion). For each: take `before = inbox(root)`, apply the verb through the REAL writer, take `after`, assert (a) the row was in `before`, (b) it is absent from `after`, (c) every OTHER row of `before` is in `after` unchanged (canon compare), and (d) any new row in `after` is one the case names (e.g. a new state frame of its own).
  - `stale-frame`: supersede decision 7 with group 51's own copy of `canvas-journey.mjs:799-814`'s `seedSupersede` (real discovery applier + `BANK`, already imported at build-checks:269/273) → one `stale-frame` row, `blocking: true` (f1 is the entry), subject `frame:f1`, text names `decision 7` and the new seq. Clear: `saveRun(pkg, {base, positions: positionsOf(b.canvas), decisions: loadDecisions(pkg), ops: [{op:"frame.link", params:{frameId:"f1", decisionRefs: reconfirmRefs(f1, staleFrames(doc, decisions))}, status:"applied"}]})`. A SECOND fixture: a non-entry stale frame (compose `f3` with refs `["7"]`, arrow f1→f3 via `connect`, then supersede) → `blocking: false` for f3, `true` for f1.
  - `dangling-ref`: on a copy WITH a transcript, `saveRun(pkg, {…, decisions: null, ops: [{op: "frame.link", params: {frameId: "f1", decisionRefs: ["7", "99"]}, status: "applied"}]})` — `decisions: null` skips saveRun's ref check (`canvas-store.mjs:605-611`; observed 2026-10-01: `applyOp(doc, frame.link {f1, ["7","99"]})` accepts it and `staleFrames` answers `[{f1, "99", dangling, null}]`), so the ledger can hold a ref the transcript lacks; `staleFrames` then reads `99` dangling → one `dangling-ref frame:f1` row. Clear: `frame.link {f1, ["7","8"]}` with `decisions: loadDecisions(pkg)` → row gone.
  - `missing-state`: clear `frame:f1/empty` with `state.add {baseId:"f1", stateKey:"empty", override:{}}`; assert the other two missing rows unchanged and no new row except none (the new state frame is not a base).
  - `unlinked-frame`: `saveRun` a `screen.compose` of `f3` with no `decisionRefs` → rows `unlinked-frame frame:f3` AND four `missing-state frame:f3/<key>`; clear with `frame.link {f3, ["8"]}` → unlinked gone, the four missing rows unchanged. Then the stand-in control: the same compose on a `seedSpine` copy WITHOUT `{discovery:true}` (no transcript) → NO `unlinked-frame` row.
  - `ratify-pending` + `unbound-import`: `runImport` the 43.7 synthetic unbound export (copy build-checks:14812-14816; `IR = await import("../portal/lib/import-run.mjs")` is fine HERE — the gate may import it, the inbox may not) with `overridesDir` in scratch → rows `ratify-pending proposal:pr1` (href `import=spike-list-row`) and `unbound-import import:i1` (text says 1 snap). Clear unbound with `editMapping({…, edit: {path: "ir.children[0].children[1].children[0]", slot: "text.size", ref: "--type-body"}})` → unbound row gone, ratify row unchanged. Observed in pre-flight: `unbound` goes `{proposed:1}` → `{proposed:0, overridden:1}`. Ratify itself is not driven here (it spawns the gate chain — group 50's and ratify-journey's). The negative control is Mode 2: `runImport({ …, mode: 2 })` on its own copy yields NO `ratify-pending` row (`proposal.ratify` refuses Mode 2, `canvas-ops.mjs:593`).
  - `agent-proposal`: `appendAgentLine(pkg, {op:"screen.compose", params:{screenId:"review", why:"…", composition:{…}}, status:"proposed"})` → one row, `blocking: true`, FIRST in `rows` even though its `at` is the newest. Clear: `saveRun(… ops:[{op, params, status:"accepted", fromStep:<seq>}])` → row gone; the accepted compose's new frame brings its own `missing-state`/`unlinked-frame` rows (named in (d)).
  - `open-question`: SYNTHETIC scratch edit — rewrite the copy's `run.json` with `endedAt: null` (label it in a comment as a fixture, never the committed file), then append a banked `open_question` on a question this package NEVER decided — `s1-choice-cascade` (turn `t25`) — through the real applier (pre-flight: seq 31, `closes: true`) → one row, subject `seq:31`, href `#/discovery/real/<slug>`. Clear path A: append a `record_decision` on the same `question_id` (turn `t26`, `level`/`parent_id` copied from seq 7, `evidence_refs: []`, `off_script: false`; pre-flight: seq 32, `supersedes: null`, flagged `no-evidence`) → row gone and NO stale row appears (parking seq 7's own question would stale f1 and red (d)). Clear path B (separate copy): set `endedAt` back → row gone. Control: the same park with `endedAt` set from the start → no row.
  - `feature-proposal`: hand-author ONE proposal line and validate it with `checkProposalLines` first (group 34's precedent: "the proposal and verdict lines are hand-authored, because they are the subject under test") → row; append a `verdict` line `parked` → row gone.
  **REDDENS** (one per kind, run each once): drop the `status === "stale"` filter → dangling refs also read stale and 51.4 stale count is wrong; drop `decisions !== null` → the stand-in control reds "51.4 unlinked: a stand-in listed f3"; drop `mode === 1` → "51.4 ratify: a Mode 2 proposal listed"; drop `unbound.proposed > 0` → the post-edit row survives; drop the `endedAt` check → the control reds; drop the later-decision rule → path A reds; read `status !== "refused"` instead of `=== "proposed"` for features → the parked row survives.
- **51.5 order**: on one fixture holding an agent proposal (newest), a stale entry frame, and older missing-state rows, `rows.map(r => r.kind)` starts `["agent-proposal", "stale-frame"]` and the rest are `at`-ascending. **REDDENS**: sort by `at` only → "51.5: the agent proposal is not first".
- **51.6 every kind is covered**: the set of kinds observed across 51.3–51.4's `before` snapshots equals `KINDS` (iterate `KINDS`, name the missing one). A tenth kind with no fixture reds by name. **REDDENS**: append `"x"` to a local copy of `KINDS` → "51.6: kind x has no fixture".
- **51.7 read-only, measured**: hash every file under one fixture package (`find -type f` + sha256) before and after `inbox(root)` → identical. **REDDENS**: 51.1's static write-grep is this property's reddening (a copy of the module outside `portal/lib/` breaks its relative imports, so a runtime mutation is not drivable); 51.7 stays the measured positive.
- **51.8 errors are per run**: a scratch root with the spine copy plus a second package whose `build/ops.jsonl` line 2 is `not json` → `errors` has one entry naming that slug and `line 2`; the spine's three rows still present. **REDDENS**: remove the per-run try → `inbox` throws → "51.8 threw instead of answering".
- **51.9 hrefFor**: four canvas shapes and the discovery shape, exact strings; `hrefFor` of a junk target throws naming the page. **REDDENS**: swap key order → exact-string mismatch.
- `group("inbox", "…")` detail: one sentence per case, plus **What it cannot reach**: whether the page renders the rows and whether following one lands on the right control (canvas-journey pass W); whether the order is the order the owner wants (a human read).
- **PATTERN**: `build-checks.mjs:17356-17400` (group 50 opening), `:14809-14817` (unbound fixture), `canvas-journey.mjs:799-814` (supersede seed).
- **GOTCHA**: memory `check-that-cannot-fail` — run each REDDENS once and watch the named failure before trusting the green.
- **GOTCHA**: `appendAgentLine` validates the proposal through `applyOp` (`canvas-store.mjs:575-576`), so the compose params must pass `screen.compose`'s checks (`why` non-empty string; composition validated by `canvas-ops`). Copy group 47's valid shape rather than inventing one: `{ screenId: "y", why: "Seq 7.", composition: STACK(TWO()) }` (`build-checks.mjs:16681`, with `STACK`/`TWO` at `:16436-16437` — group-local consts, so redeclare them in group 51's block).
- **GOTCHA**: `saveRun` needs a position for every node (`arrangement` refuses one with none, `canvas-store.mjs:205-209`) — pass `positions: { ...positionsOf(b.canvas), f3: { x: 1600, y: 0 } }` exactly as `canvas-journey.mjs:925` does.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "^build (inbox|✓|✗)|^\s+· "` → (expected) `build inbox          ✓  …` and `build ✓  all 51 groups pass`.
- **SATISFIES**: AC 1, AC 3.
- **REGENERATES**: none.

### Task 2.2 — UPDATE the group count 50 → 51 (five sites, one edit set)

- **IMPLEMENT**: `tooling/build-checks.mjs:17880` `all 50 groups pass` → `all 51 groups pass`; `CLAUDE.md:148` `50 PURE groups` → `51`; `CLAUDE.md:232` `build-checks' 50 groups` → `51`; `.claude/references/gates.md:11` `50 pure groups` → `51`; **`tooling/ratify-journey.mjs:228`** — both literals `all 50 groups pass` → `all 51 groups pass` (R7 asserts the spawned build-checks' tail; missing this reds ratify-journey on its next run, and no CI leg sees it).
- **VALIDATE**: `node tooling/drift-check.mjs 2>&1 | tail -1` → (expected) `drift-check     ✓  … · group-count`; `git grep -n "50 groups\|50 pure\|50 PURE" -- tooling CLAUDE.md .claude/references` → nothing.
- **REDDENS**: leave `CLAUDE.md:232` at 50 → drift-check "group-count drift: CLAUDE.md (on-demand context): says 50 groups, build-checks defines 51".
- **SATISFIES**: AC 1 (the gate is counted).
- **REGENERATES**: none.

### Task 3.1 — ADD `GET /api/inbox` to `portal/server.mjs`

- **IMPLEMENT**: `import { inbox } from './lib/inbox.mjs';` beside the canvas-store import (line 33). Hoist the roots literal at lines 460-463 to one `const buildRoots = () => [{ provenance: 'fictional', dir: path.join(REPO_DIR, 'discovery') }, { provenance: 'real', dir: path.join(JOBS_DIR, '_discovery') }];` used by BOTH `/api/canvas/runs` and the new `if (p === '/api/inbox' && req.method === 'GET') return json(res, 200, inbox(buildRoots()));` — one root list, so the inbox and the run list can never disagree about which runs exist.
- **GOTCHA**: GET only; no query parameters (nothing to resolve, so no `resolveRunRoot` needed — every root is the server's own).
- **VALIDATE**: `cd portal && PORT=0 …` — use the OS-free-port idiom from memory `portal-smoke-port-scoped-kill`: `P=$(node -e 'const s=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})'); PORT=$P node server.mjs & SP=$!; sleep 2; curl -s localhost:$P/api/inbox | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log(j.rows.length, JSON.stringify(j.counts), j.errors.length)})'; curl -s localhost:$P/api/health | head -c 200; kill $SP` → (expected) `3 {"fictional/faster-payment":3,…real runs…} 0` and a health JSON.
- **SATISFIES**: AC 2.
- **REGENERATES**: none.

### Task 3.2 — ADD `#/inbox` to `portal/public/portal.js` + the header link

- **IMPLEMENT**:
  - `index.html`: `<a class="btn btn-secondary" href="#/inbox">Inbox</a>` before the Canvas link (line 20).
  - `portal.js`: `async function renderInbox()` after `renderRuns` (line 1652): `state.activeSlug = null; updateChatContext();` fetch `/api/inbox`; render `<h1>Waiting on you</h1>`, then `errors` as `.cv-flag` paragraphs (`Could not read <prov>/<slug>: <message>`), then one `<section>` per run that HAS rows (run order = `rows` order of first appearance, so the run with the top blocker leads), heading `<slug> · <provenance>`, `<ol class="ib-rows">` of `<li class="ib-row" data-inbox-row="<kind> <subject>" data-blocking="true|false">` holding the text (`<p>`), a `Blocks the run` tag when blocking (plain text, no colour-only signal), and `<a class="btn btn-secondary ib-verb" href="<href>">${esc(verb.label)}</a>`. Empty → `<p class="muted">Nothing is waiting on you.</p>`. Set `$('#main').dataset.inbox = 'ready'` after render (the journey's settle handle, memory `vr-visible-beats-need-post-resize-wait`'s lesson: a named ready state).
  - `route()`: `if (location.hash === '#/inbox') return renderInbox();` and the discovery link (Task 3.3).
- **GOTCHA**: every string through `esc()`, the href included (`esc(row.verb.href)`); CodeQL's merge gate (#387) blocks a new high alert on the diff.
- **GOTCHA**: no counts as progress — never render "3 of 8" or a percentage.
- **VALIDATE**: manual (Level 4) + pass W.
- **SATISFIES**: AC 2.
- **REGENERATES**: none (portal is not a shipped page: no VR baseline, no `param-manifest` entry).

### Task 3.3 — ADD the `#/discovery/<provenance>/<slug>` drawer link

- **IMPLEMENT** (exact shape — R1):
  ```js
  // portal.js, beside route(). The drawer on one package, opened by URL (#319): the inbox's discovery rows land here.
  async function openDiscoveryFor(provenance, slug) {
    if (!$('#main').children.length) renderLibrary();
    $('#discovery-drawer').hidden = false;
    if (!discovery.config) await loadDiscoveryConfig();      // fills #discovery-provenance's options (portal.js:770)
    $('#discovery-slug').value = slug;
    $('#discovery-provenance').value = provenance;           // AFTER the config load, or the option does not exist
    try {
      discovery.session = await api(`/api/discovery/session?slug=${encodeURIComponent(slug)}&provenance=${encodeURIComponent(provenance)}`);
    } catch (err) {
      $('#discovery-start-status').textContent = `Could not open ${slug}: ${err.message}`;
      return;
    }
    $('#discovery-start').disabled = true;
    renderDiscoverySession();
    await loadProposals();
    $('#discovery-drawer').dataset.discoveryLink = 'ready';  // the journey's settle handle
  }
  ```
  In `route()`, first line: `const d = location.hash.match(/^#\/discovery\/(fictional|real)\/([a-z0-9-]{1,48})$/); if (d) return openDiscoveryFor(d[1], d[2]);`
- **PATTERN**: the Start handler's tail, `portal.js:996-1005`; `loadProposals` reads slug/provenance from the inputs (`portal.js:1178-1184`), which is why the inputs are set before it runs.
- **GOTCHA**: `#discovery-provenance` opens on an EMPTY placeholder by design (#338 F3, `portal.js:766-772`). Setting it from the URL is not a default: the URL names the package's own root, and the server's `resolveRunRoot` + `assertProvenanceRoot` still refuse a mismatch.
- **VALIDATE**: manual: `#/discovery/fictional/faster-payment` opens the drawer reading `faster-payment · finished 2026-09-13T12:50:58.903Z`; `#/discovery/real/nope` shows `Could not open nope: …` and opens no session.
- **SATISFIES**: AC 2 (every row's link resolves).
- **REGENERATES**: none.

### Task 3.4 — ADD the run-list count to `renderRuns`

- **IMPLEMENT**: fetch `/api/inbox` beside `/api/canvas/runs` (`Promise.all`); per row `const n = waiting.counts[\`${r.provenance}/${r.slug}\`] ?? 0;` and, when `n > 0`, `<a class="cv-run-meta" href="#/inbox" data-run-waiting="${n}">${n} waiting</a>`. Nothing when 0.
- **GOTCHA**: the count comes from `counts` of the SAME fold — never `rows.filter(...)` in the browser (the ticket: "the same fold"; `discovery/ops.mjs:57-59`'s reason: a fold written inline in the browser is a surface no gate reaches).
- **VALIDATE**: pass W, step W2.
- **SATISFIES**: AC 2.
- **REGENERATES**: none.

### Task 3.5 — ADD the `?frame=<id>` seam to `portal/public/canvas.mjs`

- **IMPLEMENT** (exact shape — R1):
  ```js
  // ?frame=<id> (#319): the inbox's frame rows land here — the frame scrolled into view, its Details button focused,
  // one announcement. A frame not on this canvas is SAID, never guessed at. Writes nothing.
  function focusFrameFromQuery() {
    const want = qs.get("frame");
    if (!want) return;
    const f = doc.frames.find((x) => x.id === want);
    const btn = f && document.querySelector(`[data-cv-details="${CSS.escape(want)}"]`);
    if (!btn) { canvas.say(`Frame ${want} is not on this canvas.`); return; }
    document.querySelector(`[data-stx-id="${CSS.escape(want)}"]`)?.scrollIntoView({ block: "center", inline: "center" });
    btn.focus({ preventScroll: true });
    document.documentElement.dataset.cvFromInbox = want;   // the journey's handle: set only after focus was called
    canvas.say(`${frameName(f)} — from the inbox.`);
  }
  ```
  Call it in `boot()` right after `mountPromoted(getCanvasPage);` (`canvas.mjs:1097`), inside the `try`, BEFORE `lastSavedKey = …` — it moves no box, so the save key is unaffected.
- **PATTERN**: `addNote`'s `scrollIntoView` + `focus` + `canvas.say` (`canvas.mjs:1036-1038`); `frameName` (`canvas.mjs:123`); the Details button (`canvas.mjs:242`) exists on base AND state frames.
- **GOTCHA**: `preventScroll: true` so the focus does not fight the centring scroll (memory `hover-probes-race-smooth-scroll`).
- **GOTCHA**: canvas-journey step 2 asserts ZERO save requests on open; this seam changes no box, so it holds. Re-run step 2 after this task.
- **VALIDATE**: pass W steps W3 and W6; manual `canvas.html?provenance=fictional&slug=faster-payment&frame=nope` announces `Frame nope is not on this canvas.` and the ledger stays 6 lines.
- **SATISFIES**: AC 2.
- **REGENERATES**: none.

### Task 3.6 — ADD `.ib-*` styles to `portal/public/portal.css`

- **IMPLEMENT**: after `.cv-run-meta` (line 416): `.ib-rows` mirrors `.cv-runs`; `.ib-row` a flex row with `gap: var(--spacing-sm)`, wrap; `.ib-verb` `min-height: 44px` (the 44×44 target rule the journey already asserts elsewhere); `.ib-block` a caption-size label in `--color-fg` weight 600 (text says "Blocks the run" — never colour alone). Tokens only.
- **VALIDATE**: manual, at 375px and 1440px widths, no horizontal scroll.
- **SATISFIES**: AC 2.
- **REGENERATES**: none.

### Task 4.1 — ADD pass W to `tooling/canvas-journey.mjs`

- **IMPLEMENT**: add `"fp-inbox"` to the seeded slug list at line 299. New `async function inboxPass(base, page, t, step)` after `blastPass`, called from `leg()` right after `await blastPass(base, page, t, step);` (`canvas-journey.mjs:651`). Steps:
  - **W1** `seedSupersede("fp-inbox")` → `S`. `page.goto(\`${base}/#/inbox\`)`, wait `#main[data-inbox="ready"]`. Read `before = await page.evaluate(() => fetch("/api/inbox").then(r => r.json()))`. Assert: the `fp-inbox` section's FIRST row is `data-inbox-row="stale-frame frame:f1"` with `data-blocking="true"` and verb text `Re-confirm`; the DOM row count for fp-inbox equals `before.counts["real/fp-inbox"]`.
  - **W2** `page.goto(\`${base}/#/canvas\`)`: the fp-inbox run row shows `[data-run-waiting]` whose number equals `before.counts["real/fp-inbox"]`.
  - **W3** back to `#/inbox`, click the stale row's verb link; wait `html[data-canvas-page="ready"]`; assert `location.search` includes `frame=f1`; then POLL, never read once (R5): `page.waitForFunction(() => document.documentElement.dataset.cvFromInbox === "f1" && document.activeElement?.dataset?.cvDetails === "f1", null, { timeout: 4000 })`, then `settleScroll` and assert f1's box intersects the viewport (`getBoundingClientRect` within `innerWidth`/`innerHeight`); `waitSaid(page, "— from the inbox.")`. Click `[data-cv-reconfirm="f1"]` (mirror B3); `waitLines("fp-inbox", 7)` → line 7 is `frame.link` applied by owner.
  - **W4** `page.goto(\`${base}/#/inbox\`)`, wait ready; `after` via fetch. Assert: no row with subject `frame:f1` of kind `stale-frame` in fp-inbox; `canon(before.rows minus that row) === canon(after.rows)` across ALL runs ("nothing else moved"); `after.counts["real/fp-inbox"] === before.counts["real/fp-inbox"] - 1`; `ledger("fp-inbox").length === 7`.
  - **W5** `page.goto(\`${base}/#/discovery/real/fp-inbox\`)`; wait `#discovery-drawer[data-discovery-link=\"ready\"]`: the drawer is visible and `#discovery-position` text starts `fp-inbox · finished` (the seeded copy keeps the source's `endedAt`).
  - **W6** `canvas.html?provenance=real&slug=fp-inbox&frame=nope`: the live region says `Frame nope is not on this canvas.` and the ledger is still 7 lines.
- **PATTERN**: `blastPass` (`canvas-journey.mjs:816-911`), `openCanvas` (`:320-324`), `waitSaid` (`:327`), `settleScroll` (`:333-341`).
- **GOTCHA**: the inbox route lists EVERY real run in the scratch JOBS_DIR, and earlier passes mutate theirs; take `before` and `after` with nothing else running between them (W1→W4 only touch fp-inbox).
- **GOTCHA**: read the verdict from the driver's own last line, never a pipe's exit status (gates.md §"Reading a red leg", #416).
- **GOTCHA**: memory `stale-serve-wrong-tree` does not apply (the driver spawns its own portal and asserts HEAD), but run from THIS worktree.
- **VALIDATE**: `node tooling/canvas-journey.mjs all 2>&1 | tail -8` → (expected) every engine `── <engine>: N passed, 0 failed` and the last line `canvas-journey ✓ …`.
- **REDDENS**: comment out Task 3.5's `btn.focus()` → "W3 · the frame's details button is focused"; break `counts` to `rows.length` for every run → W2 reds.
- **SATISFIES**: AC 2.
- **REGENERATES**: none.

### Task 4.2 — UPDATE `tooling/run-316-ready.mjs` check 3 (PR #495 review F3)

- **IMPLEMENT**: static `import { inbox, KINDS } from '../portal/lib/inbox.mjs';` with the other imports (line 34-38); check 3 body: `typeof inbox === 'function' && KINDS.includes('stale-frame') && KINDS.includes('missing-state') ? null : '#319 has not landed: portal/lib/inbox.mjs exports no inbox fold with stale-frame and missing-state kinds (D1)'`; header line 9 → `3  #319 landed: portal/lib/inbox.mjs exports the inbox fold (D1, the inbox)`. Tick the PR #495 F3 checkbox on #319 in the PR body.
- **GOTCHA**: three copies of gate prose (memory `gate-prose-has-three-copies`): the header line, the message, and `gates.md:135` (`portal/lib/inbox.mjs present` → `exports the inbox fold`). Edit all three.
- **VALIDATE**: `node tooling/run-316-ready.mjs 2>&1 | grep "check 3"` → (expected) no check-3 line (other checks may still be red by design: 4 until #320 lands, 6 on a dirty tree).
- **REDDENS**: rename the export `inbox` → `inboxFold` → "check 3 — #319 has not landed: … exports no inbox fold".
- **SATISFIES**: the ticket's PR #495 F3 item.
- **REGENERATES**: none.

### Task 4.3 — UPDATE docs: `CLAUDE.md` map + `.claude/references/gates.md`

- **IMPLEMENT**:
  - `CLAUDE.md` portal/lib block (after `lib/import-suggest.mjs`, line ~116): `  lib/inbox.mjs               the INBOX — every build run's waiting items (nine kinds) as rows, a pure read; no SDK (#319)`. Index only — no invariant restated (§Ground rules).
  - `gates.md`: a `**Group 51 — the inbox**` paragraph after group 50's (what it proves, case by case, and what it cannot reach); in the `canvas-journey.mjs` paragraph, one sentence for pass W; the run-316 paragraph per Task 4.2.
- **VALIDATE**: `node tooling/drift-check.mjs 2>&1 | tail -1` → ✓.
- **SATISFIES**: documentation.
- **REGENERATES**: none.

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). The proof is group 51 (pure, CI) and pass W (operator-run, three engines).

### Unit (group 51)
One positive control per kind, each cleared by its own verb through the REAL writer, with an "everything else unchanged" compare; empty and malformed packages; the order; the import pin; read-only measured by file hashes.

### Integration (pass W)
Open → follow → clear → return, on a scratch real package, three engines, plus the run-list count, the discovery deep link and the missing-frame refusal.

### Edge Cases
- Stand-in package (no transcript): no `unlinked-frame`, no `open-question`, no `feature-proposal`; stale/dangling read `[]`.
- A malformed package beside a good one: one `errors` entry, the good run's rows intact.
- Mode 2 proposal: never `ratify-pending`; an unbound Mode 2 import still lists `unbound-import` (the mapping editor works on it).
- A ratified proposal's import: no `unbound-import` (editMapping would refuse).
- Off-script parked question with `question_id: null`: listed while the session is open; cleared only when the session finishes (no decision can name it — settle-once rule, `discovery/ops.mjs:399-403`).
- A stale ref and a dangling ref on the same frame: two rows, two kinds.
- Every base frame targeted by an arrow (a cycle): the first base frame is the entry.

### Proving the checks
Every 51.x case carries its REDDENS mutation above; run each once and watch the named failure. Pass W's REDDENS are in Task 4.1.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `node --check portal/lib/inbox.mjs && node --check portal/public/portal.js && node --check portal/public/canvas.mjs`
- `node tooling/drift-check.mjs` → `drift-check     ✓ … · group-count` (observed baseline on origin/main in a fresh worktree: `drift ✗ gen-icons … node_modules … missing` until `cd tooling/icons && npm ci`).

### Level 2: Unit
- `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass` (observed baseline: 49 groups green, `icons` red on the missing node_modules only).

### Level 3: Integration
- `node tooling/canvas-journey.mjs all` → `canvas-journey ✓`, 0 failed on all three engines.
- `node tooling/ratify-journey.mjs` (chromium) → R7 green with the 51 literal. Operator-run, slow (spawns the chain); run it once.
- `node tooling/run-316-ready.mjs` → no check-3 line.

### Level 4: Manual
- `cd portal && npm start` → `http://localhost:4747/#/inbox`: three faster-payment rows (today), each link lands on f1 with its details button focused; `#/canvas` shows "3 waiting" on faster-payment; `#/discovery/fictional/faster-payment` opens the drawer on the finished package. Kill by PID only.

### Level 5: CI parity
- piv-validate per memory `piv-skills-python-tuned`: CI `verify` = build-checks · drift-check · token-lint, plus a portal smoke on a private port.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| none — every step is $0 and runs on this machine | — | — | — |

The owner's own read of the page ("is this order the order I want?") is welcome but not an AC; #316's sitting step 10 is where the owner uses it for real.

---

## ACCEPTANCE CRITERIA

- [ ] AC 1 — build-checks group 51 over seeded copies of the committed spine: each of the nine kinds produces its expected row and is cleared by its own verb with every other row unchanged; an empty package produces an empty inbox, never an error; a `stale-frame` row appears only when `staleFrames` says so (and blocks only on an entry frame).
- [ ] AC 2 — `canvas-journey.mjs` pass W on three engines: open `#/inbox` → follow the stale row → Re-confirm → return → the row is gone and every other row is byte-identical; the run list's "N waiting" equals the fold's count.
- [ ] AC 3 — `portal/lib/inbox.mjs` imports node built-ins + four SDK-free modules only, writes nothing, and is imported by build-checks in CI with no `portal/node_modules` (51.1).
- [ ] `run-316-ready.mjs` check 3 pins the `inbox` export (PR #495 F3), all three prose copies updated.
- [ ] `build ✓  all 51 groups pass`; drift-check ✓ including group-count; ratify-journey R7 green.
- [ ] No row renders a percentage or a score.

---

## COMPLETION CHECKLIST

- [ ] Branch `feat/inbox-319` off `origin/main`; `git branch --show-current` checked right before each commit (memory `shared-worktree-parallel-sessions`); stage by explicit path.
- [ ] All tasks in order, each VALIDATE run and its output pasted into the report.
- [ ] Every REDDENS mutation run once and reverted.
- [ ] Plan, report (`.claude/reports/`) and review (`.claude/code-reviews/pr-<N>-review.md`) in the same PR; PR body carries `Closes #319`.

---

## OPEN QUESTIONS / ASSUMPTIONS

None open. The owner decided Q1–Q3 on 2026-10-01 (build runs only; open sessions only for parked questions;
discovery feature proposals included). A1–A4 below are plan decisions with their evidence. **Each lives in ONE
named, exported predicate in `inbox.mjs` with ONE group-51 fixture**, so a veto after the PR is a one-function edit
plus that fixture's expectation; nothing else in the module, the route or the page moves.

| | Decision | Predicate | Evidence (observed 2026-10-01) | Fixture |
|---|---|---|---|---|
| A1 | `unlinked-frame` lists BASE frames only | `needsLink(frame, decisions)` | `state.add`'s frame has no `decisionRefs` key (`canvas-ops.mjs:384-391`); a state's "why" is its screen's. `frame.link` CAN target a state (the applier accepts `{f2, ["7"]}`), so a veto is cheap | 51.4 unlinked (f3 listed; its states not) |
| A2 | Blocking = an open agent proposal, or a stale ENTRY frame | `blocks(row, doc)` | `appendAgentLine` refuses a second open proposal (`canvas-store.mjs:562-567`); the ticket names "a stale frame on the entry screen". Ratify blocks nothing mechanically | 51.4 stale (entry true, non-entry false), 51.5 |
| A3 | Entry frame = a lane-A base frame no arrow targets; all targeted → the first base frame | `entryFrames(doc)` | `canvas-ops.mjs` has no entry concept; on the spine it answers `["f1"]` | 51.3, 51.4 stale |
| A4 | A parked question clears on a LATER `record_decision` naming its `question_id`, or when the session finishes | `questionCleared(openQ, ops, run)` | the applier accepts park (seq 31) then decision (seq 32, `supersedes: null`) on `s1-choice-cascade` | 51.4 open-question paths A and B |

## RISK REGISTER — each risk and what retires it

| | Risk | Retired by |
|---|---|---|
| R1 | The two new link seams (`?frame=`, `#/discovery/…`) do not exist; the ticket's estimate missed them | Exact code in Tasks 3.3 and 3.5, each with a ready handle (`data-cv-from-inbox`, `data-discovery-link`) the journey waits on, and a negative case each (W6, `#/discovery/real/nope`); every citation they touch read on origin/main |
| R2 | Group count 50 → 51 has a fifth literal drift-check never reads (`ratify-journey.mjs:228`) | Task 2.2 edits all five; its VALIDATE `git grep` must return NOTHING (observed today in tooling: exactly `ratify-journey.mjs:228` and `build-checks.mjs:17880`) |
| R3 | #316's sitting appends to `discovery/faster-payment/build/`, breaking any literal pinned on it | 51.3 pins a `seedSpine` copy (group 36 pins the first six lines as a prefix); the committed package is checked for shape only |
| R4 | A1–A4 are the planner's calls | One predicate + one fixture each (table above), written in the module header as decisions so a reviewer sees them |
| R5 | Cross-engine focus/scroll assertions flake (webkit focus timing, smooth scroll) | The seam sets its handle only after `focus()`; W3 POLLS handle + `activeElement` via `waitForFunction`; `preventScroll: true` removes the focus/scroll race; `settleScroll` before the viewport check |
| R6 | One fixture's side effect leaks into another's assertion (pre-flight found one: parking seq 7's question stales f1) | Each 51.4 kind on its own `pkgCopy`; the open-question fixture parks `s1-choice-cascade`; (d) names every new row a clear may legitimately bring |
| R7 | A fresh worktree missing `node_modules` reads as a regression | IMPLEMENTATION PLAN's `npm ci` line, run before the first gate (observed: 41.7 and drift-check red without it) |

## NOTES (open canvas)

**Pre-flight, run 2026-10-01 against `origin/main` d1c8f3f in a detached worktree (`../wt-319-read`):**
1. Folded the committed spine through the real readers (observed): frames `f1 {ideal, refs ["7","8"]}`, `f2 {baseId f1, error}` (no `decisionRefs` key); arrows `[a1: f1/continue → f2]`; `missingStates` → `f1: [empty, partial, loading]`; `laneKeys` `[null]`; `staleFrames(doc, loadDecisions(pkg))` → `[]`; `openProposals` → 0; effective line 1 `at` `2026-09-18T00:00:00.000Z`; `frameLabel(doc,"f2")` → `error of add-payee`; `listBuilds([{fictional, discovery}])` → faster-payment only. This fixed 51.3's literal at three rows and A1/A3.
2. Ran 43.7's synthetic unbound export through `runImport` on a `seedSpine` copy (observed): `spike-list-row i1`, `source.bound false`, `unbound {dropped:1, exact:0, overridden:0, proposed:1, slots:2}`, `doc.proposals [{pr1, spike-list-row, recordId i1, mode 1, proposed}]`; then `editMapping` with `{slot: text.size, ref: --type-body}` → `{…, overridden:1, proposed:0}`. This is why "unedited snaps" reads `unbound.proposed` and why the clear verb is "Confirm the snaps".
3. Drove the discovery applier over faster-payment's transcript (observed): parking seq 7's question then deciding it supersedes 7 and stales f1 — so 51.4 parks `s1-choice-cascade` (never decided in this package) instead: park seq 31 `closes: true`, decision seq 32 `supersedes: null`, flagged `["no-evidence"]`. Denied transcript lines (observed in committed packages) carry `tool`/`input` and no `op` key.
4. Committed discovery packages (observed): every one is finished (`endedAt` set); `graded-opus-a` 37 and `graded-think-a` 38 `open_question` ops; `allergen-matrix-1` 8 proposals, 8 verdicts. This drove Q1–Q3; with the owner's answers, today's inbox is three rows.
5. `node tooling/build-checks.mjs` on the fresh worktree (observed): only `icons` red, `41.7 … tooling/icons/node_modules … missing`; `drift-check` red for the same reason; `run-316-ready` check 3 red by design. Hence the `npm ci` line under IMPLEMENTATION PLAN.
6. Landed-claims sweep (`git grep` on origin/main): `inbox` appears only in plans, `run-316-ready.mjs:9,69` and `gates.md:135` — no inbox module, route, or `#/inbox` exists. No `?frame=` seam (`grep qs.get portal/public/canvas*.mjs`: only `provenance`, `slug`, `import`, `promoted`). No `#/discovery` route (`route()` handles `#/canvas` and `#/card/` only).
7. Count sites for 50 → 51 found by `git grep "50 groups|50 pure|50 PURE"` and `drift-check.mjs:201-205`: four drift-checked claims plus `ratify-journey.mjs:228`, which drift-check does not read.
8. `loc-summary` groups (`gen-loc-summary.mjs:26-28`) cover `system/`, root/proto pages and `agent-layer/` only, so nothing here moves `loc-summary.json` or any VR baseline.

9. Second pass (observed, same commit): `frame.link {f1, ["7","99"]}` accepted by the applier, `staleFrames` → `99` dangling; `frame.link {f2, ["7"]}` accepted (a state CAN be linked — A1 is a choice, not a constraint); the refusal of a second open proposal is `canvas-store.mjs:566`; `canvas.say` and `.stx-live` are the announcer `waitSaid` reads (`studio-canvas.mjs:347`); canvas-journey step 1 asserts run-list rows by `includes`, so the added `N waiting` link breaks nothing there.

**Changed by pre-flight**: (a) 51.3 pins a seeded copy, not the committed package, because #316's sitting appends to it; (b) the inbox may not import `import-run.mjs` (env.mjs) — records are read directly; (c) `ratify-journey.mjs:228` added to the count task; (d) the open-question clear rule written down after measuring the applier, not assumed; (e) `?frame=` and `#/discovery/…` added as tasks — the ticket's file estimate assumed links that do not exist.

**Rejected alternatives**:
- Adding `waiting` to `/api/canvas/runs`' response: changes a shape canvas-journey asserts and makes the count a second call site of the fold.
- One row per frame listing all missing states: adding one state would not clear the row, which breaks "row gone after its verb".
- Building hrefs in the browser: puts URL construction where no gate reaches it; `hrefFor` is pure and pinned by 51.9.
- Importing `prd-projection.mjs`'s `readPackage` for transcripts: it refuses lines a read-only view should tolerate, and one bad line would drop the whole run.

## AMENDMENTS

- 2026-10-01 (implementation, base d1c8f3f) — four plan errors, each found by running the plan's own step:
  (1) 51.3 said the spine's rows come "empty, partial, loading, in that order", but THE FOLD's tie-break is `subject` `localeCompare`, which gives empty, loading, partial; the fold's rule stands and 51.3 pins that order.
  (2) 51.4 unlinked's "drop `decisions !== null`" mutation could not redden while `inbox()` ALSO wrapped the unlinked loop in `if (hasTranscript)`; the wrapper is removed so `needsLink` (A1) is the one place the rule lives, and the mutation now reds.
  (3) Task 4.2's static named import (`import { inbox, KINDS }`) makes the REDDENS rename a load-time SyntaxError that kills all twelve checks, not a check-3 line; it is a namespace import (`import * as inboxMod`), mirroring the script's `canvasOps` import.
  (4) W5 asserted `#discovery-position` starts `fp-inbox · finished`, but the heading is `run.json`'s own `slug` and a seeded copy keeps `faster-payment`; W5 asserts the inputs the drawer opened the session through (`fp-inbox`, `real`) and `· finished` instead.
  Also: 51.4's stale and dangling clears need positions for the decision cards they bring (`d<seq>`, `d8`), which saveRun's `arrangement` refuses without; and line numbers drift by 2–3 (`renderRuns` 1635, `mountPromoted` call 1099).
- 2026-10-01 — Risks R1–R7 retired in the plan (owner: "address all risks"): exact code for both link seams with ready handles and negative cases; A1–A4 isolated as one exported predicate + one fixture each; W3 polls instead of reading focus once; the `frame.link "99"` dangling fixture verified (was expected); RISK REGISTER added. Pre-flight re-run on origin/main d1c8f3f.

