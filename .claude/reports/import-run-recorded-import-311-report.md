# Implementation Report — import-run: the recorded import, PR A "the drop path" (#311)

**Plan**: `.claude/plans/import-run-recorded-import-311.md`   **Branch**: `feat/import-run-311` (worktree `wt-311`)
**Base**: `cfceeaf` → `36be0b6` (origin/main unchanged at `cfceeaf` when re-checked; the merge was a no-op)   **Status**: COMPLETE for PR A; PR B (the live read) not started

## Summary

The import chain now has a caller. `portal/lib/import-run.mjs` runs a dropped Brilliant blueprint or Figma
house-plugin export through `convert → snap → recognise → applyMapping → build`. It writes the import record,
its markdown, a transcript and a proposal (six files) under the build root, and appends one
`component.propose` op through `saveRun`. The canvas page gains an Import panel, a side-by-side view and a
mapping editor that re-derives everything from `source.json`. "Import selection" reaches the real SDK with a
reach-only reader. It refuses when Brilliant is down or unreachable, and refuses by name when reach succeeds,
because the live read's response shapes are Phase 0's. The PR body should say `Part of #311`.

## Tasks completed

- 1.1 `component.propose` (+ exported `PROPOSAL_NAME_RE`) → `system/canvas-ops.mjs` (UPDATE, +21 net lines)
- 1.2 35.1/35.2 widened, 35.12 added → `tooling/build-checks.mjs` (UPDATE)
- 2.1 `TYPE_TOKEN` moved to `import/recognise.mjs`, role reads a type ref → `import/recognise.mjs`, `import/snap-rules.mjs` (UPDATE)
- 2.2 42.13, 2.3 40.27, 2.4 42.14 → `tooling/build-checks.mjs` (UPDATE)
- 3.1–3.6 the module → `portal/lib/import-run.mjs` (CREATE)
- 3.7 group 43 (10 cases, 43.1–43.10) → `tooling/build-checks.mjs` (UPDATE); pass line 42 → 43
- 4.1 **reach-only** `readBrilliant` (see Deviations) → `portal/lib/import-run.mjs`
- 5.1 four routes (`/api/canvas/import`, `/import/drop`, `/import/view`, `/import/mapping`) → `portal/server.mjs` (UPDATE)
- 6.1 panel, view, editor → `portal/public/canvas-import.mjs` (CREATE), `canvas.html`, `canvas.mjs` (`describeOp`), `portal.css` (UPDATE)
- 7.1–7.2 `importPass` (I1–I6) → `tooling/canvas-journey.mjs` (UPDATE)
- 8.1 group count 43 in CLAUDE.md ×2 and gates.md; Group 43 entry; 35/40/42 and canvas-journey entries extended → `CLAUDE.md`, `.claude/references/gates.md`
- 8.2 → `discovery/README.md`, `import/overrides/README.md`, `CLAUDE.md` map
- 8.3 loc-summary regenerated: **no change** (see Validation)

Commits: `c955067` (Phases 1–2), `8352b1f` (Phase 3), `285ebd3` (Phases 5–7), `36be0b6` (docs).

## Tests added

- build-checks 35.12, 40.27, 42.13, 42.14 and group 43 (43.1–43.10), all green: `build ✓  all 43 groups pass` (observed).
- canvas-journey `importPass` I1–I6, green on three engines: chromium 65 passed, firefox 64, webkit 64, 0 failed (observed, `node tooling/canvas-journey.mjs all` at `285ebd3`; only docs changed after it).

## Proving the checks

Each row was applied, run and restored. "Red" means the named case failed (observed).

| Check | Mutation | Went red | Positive control |
|---|---|---|---|
| 35.12(b) | drop the duplicate-name guard in the case | "35.12 a duplicate name … NO THROW" | every verb's VALID_FOR op accepted (35.4 loop) |
| 35.12(c) | `status: "ratified"` | "a new proposal's status is \"ratified\"" | — |
| 35.1 + 35.12(c) | add `proposal.ratify` to OPS **and** PARAMS | 4 failures incl. "OPS includes proposal.ratify — #313 …" | — |
| 42.13 | bound pad sides map to `"null"` | value `"null,13px,null,7px"` named | — |
| 42.14 | remove the `byRef` branch | "override writing --type-body built role \"caption\"" | unoverridden text reads `caption` |
| 40.27 | figma `spacing()` returns the raw ref | "BOUND — Figma's gap {…\"$spacing.md\"}" | unbound 13 → `{13, null}` both sides |
| 43.1 | static `import { query } from sdk`, node_modules present | source-pin failure | — |
| 43.1 | same, node_modules **moved aside** (CI's condition) | "did not import (Cannot find package …)" + source pin | clean tree with node_modules aside: 43/43 |
| 43.2 | `importFenceDecision` allows `Write` | 5 failures naming Write | 3 read tools allowed |
| 43.6 | disable the `underRoot` guard | "underRoot let ../escape through" | in-root path accepted |
| 43.7 | `mappingDropRows` returns nothing | "a drop added 0 mapping rows" | remap, rename, snap edit all green |
| 43.8 | `saveConflict` moved after the reader | "after 1 reader calls" | first run succeeds |
| 43.8 | `withRunLock` removed | "a second run during the first answered NO REFUSAL" | first run returns `i1` |
| 43.3 | `classifyReach`'s not-reachable branch ignores `get_selection` | "no get_selection → undefined" + "does not carry exactly one action" | reachable init answers `null` |
| 43.4 | drop `sniffDrop`'s 16-hex id guard | "43.4: prose was ACCEPTED" | both committed fixtures sniff to their tool |
| 43.5 (AC #1b pair) | the selection branch changes one word of the read | "gave different records (ir)" | unmutated pair deep-equal |
| 43.9 | vocabulary names not in the blocked set | "a vocabulary name was not suffixed: list-row" | "Spike List Row" → `spike-list-row` |
| 43.10 | count bound records instead of unbound | `{"total":3,"unbound":1}` | — |
| journey I2 | drop `import/fixtures/s3/ref.png` instead of the blueprint | I2 threw (no navigation), I3/I4 red | blueprint drop green |
| journey I5 | `withRunLock` removed | I5 "NO REFUSAL" and the follow-up drop 409 | lock present: all I5 green |

**Driver proven on a known-bad input first**: I3's wait originally resolved on the *previous* `?import=` URL,
so the second drop read the first drop's view (I3/I4 red on the first chromium run). Fixed to wait for a
changed URL before any assertion was trusted.

**Assertions no single mutation can redden, kept as tripwires, with the reason:**

- **Journey I1's `costUsd === null`.** `readBrilliant` aborts and breaks on the SDK's `init` message, so no
  `result` message can arrive on the reach path and `costUsd` is null by construction. The label says "no
  result message arrived before the abort". Zero spend is EXPECTED (plan A1), not proven: nothing here shows
  whether the CLI's warmup subagents make a model call before `init`. The owner-run probe (PR B) is where a
  cost would be observed.
- **43.5's two-source key-set equality and journey I3's.** Both records come from one `recordFor` and one
  `source` literal, so their key sets are equal whatever the converters do. They are kept as tripwires
  against someone later giving one entrance its own record builder. 43.5's reader-vs-drop pair is the
  reddenable half (row above).
- **Journey I6 and group 43's closing `git status` check.** Tripwires: no code path in this PR writes under
  `system/`, `handoff/`, `discovery/` or `import/overrides/`, so no mutation of it turns them red short of
  adding such a write.
- **43.6's "draft carries no literal".** Its regex scans a `block.css` that, for spike C, has no
  declarations, because the root carries no contract token. No single mutation of `rootDeclarations`
  reddens it, since the function only emits `var(--…)`. It is kept as a tripwire for a future edit that
  writes raw values.

## Validation results

| Command | Result |
|---|---|
| `node --check portal/lib/import-run.mjs && node --check portal/public/canvas-import.mjs` | ok (observed) |
| `node tooling/build-checks.mjs` | `build ✓  all 43 groups pass` (observed, `36be0b6`) |
| same with `portal/node_modules` moved aside | `build ✓  all 43 groups pass` (observed) |
| `node tooling/drift-check.mjs` | ✓ incl. `group-count` (observed) |
| `node tooling/token-lint.mjs` | `63 contract tokens · 0 undeclared · 0 orphan` (observed) |
| `node tooling/regen-import-records.mjs --check` | `no drift` (observed) |
| `node import/regen-expected.mjs && git status --porcelain import/` | empty (observed) |
| `node agent-layer/gen-loc-summary.mjs` then `--check` | no diff, `no drift`; runtime 32,400 (observed) |
| R3 line budget re-measure (Task 1.1 command) | `32435 under` (observed; the plan expected ≤ 32444) |
| `node tooling/canvas-journey.mjs all` | ✓ chromium 65 / firefox 64 / webkit 64 (observed, `285ebd3`) |
| portal smoke, PORT 4799, scratch JOBS_DIR | `/api/health` `stale:false` at `8352b1f`; view route `{error}` for name `x`; drop 200; stale drop 409 (observed) |
| real-SDK reach, `UXF_BRILLIANT_MCP` exits at once | `not-running`, no result message before the abort, 2.5 s, no orphan CLI (observed) |
| real-SDK reach, server never answers, 6–8 s timeout | `stale-binding` (observed) |
| **real Brilliant MCP** (`npx -y @brilliant-hq/mcp`, no tab open) via the route | `not-reachable` (observed): the server connected and advertised no `get_selection`, which confirms Phase 0 (e)'s expected unreachable signature |

## Not run

- **Task 0.1, the Phase 0 Brilliant probe.** Needs the owner, a Brilliant tab and ~$0.20–0.50. Tracker: PR B / "import-run: the live reader" (owner's call to open).
- **Task 4.1's read half, `parseBrilliantCalls` and 43.11; Task 4.2 `rebind`/`browse`; the `/rebind` and `/browse` routes.** They depend on Phase 0. PR B.
- **Task 7.3, the live journey leg (`--live-brilliant`).** Owner-run, paid. PR B. AC #1a is **not met** in this PR.
- **Task 7.4, the optional paid fence probe.** Not run; 43.2 is the blocking proof.
- **The two trackers** ("live import fidelity: render the candidate and measure ΔE-MIN"; "Mode 2 exhibit beside the canvas (G7)"). Not opened: they create GitHub issues, so they wait for the owner's OK at `piv-create-pr`.
- **Task 8.3's approach-baseline regen.** Not needed: the runtime figure did not move (32,435 lines → 32,400).
- The portal page was not checked by eye in a real browser outside the journey's three Playwright engines.

## Deviations from the plan

- **(plan error) A reach-only `readBrilliant` ships in PR A.** R4 placed the reader in PR B, but 43.1, journey
  steps 1 and 5 and Task 7.2 all go through it. The reader starts the fenced query and classifies reach. When
  reach succeeds it refuses as `live-read-not-built` ("drop an exported file instead"); it never guesses a
  response shape. Logged under the plan's AMENDMENTS.
- **(plan error) `sniffDrop` does more than the plan said.** `brilliant.convert` accepts any text: a PNG and
  "hello world" both converted to a node, observed. So a drop is refused when it is binary (a NUL or a U+FFFD)
  or when any element id is not 16 hex characters. A refused drop reaches `runImport` as
  `{ refused: { kind: "not-an-export" } }` (200), not a 500.
- **(plan error) 43.7's snap edit uses a synthetic unbound Figma export, not a blueprint.** Brilliant's `t()`
  reads a text size only as `n:$font.size.*`, so no blueprint can carry an unbound text size.
- **`renameParts` is a one-line hook in `import/recognise.mjs` `build()`** (`verdict.partId` → the node's `id`),
  not a separate walk. The built tree carries no IR paths, and re-walking it would duplicate `build()`'s
  keep/skip logic. `regen-expected` and `regen-import-records --check` are unchanged (observed).
- **(plan error) Task 8.3: loc-summary does not move.** The plan expected the total to move because "the
  portal files are counted". They are not: the generator has three groups (runtime, pages, generators).
- **The `[hidden]` rule was not added to `portal.css`.** A page-wide `[hidden] { display: none !important; }`
  already exists there (`portal/public/portal.css:61`).
- **No `op` line is appended to the transcript after the op.** A draft wrote one; it was removed rather than
  add a fifth line type the plan does not name.
- **Task 7.2's cost check is a label, not a proof** (F1 of the pre-report review): see "Proving the checks".
- **The binding line is static** ("project: not exposed by this binding"). Phase 0 (b) decides what it can say.

## Assumptions carried

- A2: the op line's `source` is `owner` (saveRun hardcodes it); stated in the module header.
- A3: real-provenance overrides go to `<JOBS_DIR>/_import-overrides/`, chosen by the ROOT's provenance; `editMapping` and `runImport` take an injectable `overridesDir` (the default is by provenance) so group 43 never writes `import/overrides/`.
- A4: one import = one component-grain record + one proposal.
- `applyMapping`'s `map` sets `via: "mapping"` on the verdict, so the record's structure table says the owner mapped it.
- `drop: false` in the editor means "as recognised": it clears a drop and a remap, and keeps a rename.
- `importView` returns `builders` and `snapChoices` (from `targetsFrom(contract)`), so the page never hard-codes the vocabulary or the contract.

## Additions beyond the plan

- `readUpload(req, max)` in `import-run.mjs` for the streamed drop route (the plan said "mirror `receiveExport`"; the helper is where that lives).
- `underRoot` and `overridesDirFor` exported, so 43.6 drives the guard directly.
- `loadInputs()` and `parseCss` exported (the pipeline's three repo inputs, and the lifted var() resolver).
- Journey I1 measures the four new controls at 44×44, and I4 adds a remap + rename asserted through `data-part` (the plan's Task 6.1 note).

## Issues encountered

- The first hanging-server probe left an orphan `node -e setInterval(...)`, killed by PID. The fake server
  ignored stdin EOF; a real stdio server exits on it. The journey's hanging server now exits on EOF, and no
  orphans were observed afterwards (`pgrep` empty).
- The worktree had no `portal/node_modules` or `tooling/visual-regression/node_modules`; both were installed
  with `npm ci`. `tooling/icons` and `tooling/style-dictionary` were already present.
- The untracked `.claude/plans/import-run-recorded-import-311.html` predates this session and is left untracked.

### Ready for the next step

Next: `piv-create-pr` with `Part of #311` in the body. Get the owner's OK before opening the two trackers. Then `piv-review-pr`.
