# PR #19 Review — data-connected prototypes (Verdant screen + Fieldwork hybrid canvas)

**Verdict: REQUEST CHANGES** — narrowly. Correctness, architecture, token discipline, and the honesty
contract all hold up under direct verification. What blocks approval is one genuine accessibility gap
on the Fieldwork page (issue 1), one data-governance question only the author can answer (issue 2),
and one undocumented spec deviation (issue 3). All are small; this is close to approvable.

Reviewed with fresh eyes in an isolated worktree at `c580617` (agentic gate — `piv-review-pr`; deep
pass by the `code-reviewer` agent, validation and browser checks run independently by the reviewing
session). Scope: ticket #8 — the completion commit `c580617` plus the #8-relevant groundwork inside
the epic snapshot `4a3997b` (fixtures, validator coherence rules, contracts, proto.css,
scenario-data.mjs). The documented deviations in
`.claude/reports/data-connected-prototypes-report.md` were treated as intentional decisions, not
issues.

## Validation

| Check | Result |
|---|---|
| `node scenarios/validate.mjs` | ✓ verdant 3 collections · 43 records; fieldwork 3 · 104; verdicts differ |
| `node agent-layer/gen-token-css.mjs --check` | ✓ 46 contract + 53 pack tokens, no drift |
| `node agent-layer/gen-handoff.mjs` ×2 | ✓ deterministic, byte-stable against the committed `handoff/verdant/` |
| `node --check` (validate.mjs, scenario-data.mjs, worker/fixtures.mjs) | ✓ |
| Token lint (grep hex/rgb/hsl over `components.css`) | ✓ zero literals (only the header comment stating the rule) |
| Browser (real Chrome, static-fixture state) | ✓ both pages render; indicator truthfully says `data: static fixtures`; fictional-product notice on both; agentic slots labeled as honest placeholders |
| Verdant interaction (driven live) | ✓ 4 rows → check 2 → button enables → commit → 2 rows removed, button disables |
| Secrets scan (snapshot commit incl. `.mcp.json`, `mcp-posthog-headers.sh`) | ✓ nothing committed; key stays in gitignored `.env` |

## Issues

### Medium

**1. Fieldwork panel titles aren't headings and the sections have no accessible name**
`proto/fieldwork.html:142-155`. The three `fw-panel` regions ("Attention — SLA & overdue", "Today's
schedule", the unassigned panel) render their titles as bare `<span>`s inside
`<header class="fw-panel-head">`; the `<section>`s carry no `aria-label`/`aria-labelledby`. A
screen-reader user navigating by headings or regions won't find any of the three panels. Verdant
solves the equivalent structure correctly in the same PR (`<h3 class="vd-section-heading">`,
`proto/verdant.html:138,143`), so this is an undocumented inconsistency between the two pages.
**Fix:** make the title span an `<h3>` (or point `aria-labelledby` at it).

**2. Fieldwork `priority` field is ungoverned, and 25/64 records have the ambiguous value `"priority"`**
`scenarios/fieldwork/fixtures/jobs.json`: values are `priority` ×25, `urgent` ×22, `routine` ×17.
`"priority"` may be a real middle tier (urgent/priority/routine is plausible vocabulary) or an
unfilled placeholder — the data alone can't say, so **this needs an author call; don't "fix" the data
without it**. What's certain either way: the field is completely ungoverned — `copy.json` has
`statusLabels`/`regionLabels` but no `priorityLabels`, `COHERENCE.fieldwork`
(`scenarios/validate.mjs`) never checks `priority` against an enum, and
`.fw-priority[data-priority="urgent"]` (`system/components.css:1829`) is the only styled variant, so
`priority` and `routine` render identically. This PR is the first to render `j.priority`
(`proto/fieldwork.html:95`) and added one more ambiguous record (job-062).
**Fix:** answer the tier question; then add `priorityLabels` to `copy.json`, an enum check to
`COHERENCE.fieldwork`, and a styled variant per tier (matching the colour-never-alone pattern the
status chips already follow) — correcting the 25 records first if it was a placeholder.

### Low

**3. `screen-header.md` says the title is the screen's `<h1>`; the page ships `<h2>` — undocumented deviation, spec is the stale party**
`proto/verdant.html:41` vs `system/specs/screen-header.md:39`. The page correctly reserves its own
`<h1>` for the exhibit title, so `<h2>` inside the frame is the better heading hygiene — but the spec
was just flipped to `status: "shipped"` while its accessibility prose no longer matches what shipped,
and the deviation isn't in the report.
**Fix:** amend the spec prose to "the screen's top-level heading within its frame" and regenerate the
handoff pack.

**4. The `"ok"` status-chip label is hardcoded while its siblings come from `copy.json`**
`proto/verdant.html:89`: `overdueLabel`/`dueTodayLabel` are read from
`scenarios/verdant/copy.json`, but `"ok"` — the majority chip on the page (11 of 15 plants) — is a
literal. **Fix:** add `okLabel` to `copy.json`'s `prototype` block and read it like the other two.

**5. Fieldwork duplicates the fictional "today" client-side; Verdant bakes it into fixtures**
`proto/fieldwork.html:61-62` hardcodes `TODAY`/`SLA_SOON` and derives `atRisk`/`attention` at view
time, while the plan's own reconciliation rationale for Verdant was "bake derived fields into
fixtures so pages do no date logic". Deterministic and honest either way (no `Date.now()`), but if
the scenario's fixed day is ever revised there are now two places to update. Worth a one-line comment
or a follow-up alignment; not blocking.

## What's good

- **DOM-injection discipline is airtight** — every fixture-derived value in both pages' `innerHTML`
  templates passes through `esc()`; checked line by line. Matters because the Worker is a public
  endpoint, even with read-only fixture data.
- **The source indicator can't lie**: `scenario-data.mjs` uses `cache: "no-store"` + a timeout so
  `source: "worker"` means the API answered *now*, and both pages reduce worst-of-N — if any
  collection fell back, the page says `static`. Verified in code and live in a browser.
- **Token discipline is clean** across the whole new SCENARIO PROTOTYPE COMPONENTS section, and the
  `color-mix(...)` pressed-state for `vd-plant-card` implements the spec without minting a new token.
- **Spec-to-CSS fidelity is unusually precise**, including the `column-reverse` DOM-order trick on
  `vd-stat-tile` so screen readers hear "Moisture, 22%" while the value displays on top — exactly the
  spec's a11y note.
- **The coherence rules do real work**: hand-verified the plantName join, status-vs-due, and
  worst-of-open-tasks rules against the fixtures; the fictional today (2026-07-14) is consistent
  across brief, validator, and pages.
- The honesty contract is honored end to end: fictional notices, truthful capability indicator,
  agentic slots that are visibly *empty placeholders* with "Planned — not running yet" copy.

## Process notes (for the human, not fix-requests)

- **Stacked-PR scope:** this PR's range includes the epic snapshot `4a3997b`, which also carries
  ticket #3 (derivation engine), #7 (handoff data layer), and the AI-layer/plans content. Once #16
  merges and this retargets to `main`, that work lands through this PR without its own ticket-level
  review. #3/#7 files were out of scope here; make sure they get their gate somewhere.
- The `code-reviewer` agent definition is still tuned for Python/FastAPI; it was overridden with this
  project's rubric for this review, but a `meta-agent` retune to the vanilla-JS/token-contract stack
  would make future gates sharper.
- Pre-existing gap the review surfaced (not a regression): the validator's coherence rules are
  hand-picked, so a fixture can drift from its `.contract.json` in ways no rule checks — exactly the
  seam issue 2 slipped through.

## Recommendation

**Request changes.** Fix 1 (a11y) and 3+4 (small alignments) are mechanical; 2 needs one author
answer before anyone touches the data. Natural next step: `piv-fix-review-findings` on this report,
then re-run `scenarios/validate.mjs` + `gen-handoff.mjs` and push. Validation is otherwise fully
green — once these land this is an approve.
