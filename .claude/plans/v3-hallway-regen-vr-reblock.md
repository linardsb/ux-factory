# Feature: v3 P4 — hallway rounds, craft sweep, full regen, VR re-block

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Read `## NOTES (open canvas)` FIRST.** It records the single most load-bearing finding: the "full regen" half of this ticket is already done on `main`, and the branch name the ticket recommends would silently defeat the VR re-block it is meant to verify.

## Feature Description

Epic #70's closing gate. Every v3 build ticket (#71–#81) is merged; this ticket validates the finished experience against real cold readers, fixes the biggest thing they trip on, sweeps every v3 surface against the §6.4 craft bar, regenerates the artifacts the fixes invalidate, and removes the D11 visual-regression freeze so the gate blocks again on every branch.

It is a validation-and-merge ticket, not a build ticket. Its output is: two recorded hallway rounds, one targeted fix, a committed test protocol, clean generators, current baselines, and a one-line CI change that ends the freeze.

## User Story

As the portfolio owner applying for senior UXE roles,
I want the finished v3 experience validated by cold readers and the CI pixel gate switched back on,
So that I ship a site proven to read correctly in 90 seconds, and every change after this one is protected from silent visual regressions again.

## Problem Statement

Three problems, in the order they must be solved:

1. **Unvalidated hypothesis.** PRD §4's WE'LL KNOW WE'RE RIGHT condition is stated in terms of cold readers ("state what the candidate does + reach the built-screen peak unprompted within ~90s"). Nobody has run that test. v1 and v2 both failed the owner's own read *after* shipping; the hallway rounds exist so v3 does not repeat that.
2. **No test protocol exists.** The architecture doc names "hallway-test script + notes template" as a deliverable (`docs/epics/portfolio-v3-experience.architecture.md:54`). Neither exists in the repo — `grep -rn hallway` finds only prose references in the PRD, architecture doc and two plans. Without a committed script the two rounds are not comparable and the findings are not auditable.
3. **The VR gate is half-off and the ticket's own recommended branch keeps it off.** `.github/workflows/verify.yml:48` carries `continue-on-error: ${{ startsWith(github.head_ref, 'feature/v3-') }}`. The ticket's Repo-traps section says to work on branch `feature/v3-merge` — which matches that pattern (verified: `'feature/v3-merge'.startsWith('feature/v3-') === true`). A PR from that branch would run the visual job non-blocking *while deleting the line that makes it non-blocking*, so the re-block would ship unverified.

## Solution Statement

Split the ticket at its one human gate and sequence around it.

- **Phase A (agent).** Author the hallway protocol — session script, notes template, and the triage rule that names "the single biggest finding" without post-hoc argument. Run the §6.4 craft sweep across every v3 surface, including the real Safari/Chrome cross-engine checks the Chromium-only VR gate cannot see, and record the audit. Commit both.
- **Phase B (owner, human gate).** Round 1 with cold readers using the committed script. Notes land in the repo as a filled copy of the template.
- **Phase C (agent).** Triage round 1 by the committed rule, fix the single biggest finding, re-run the craft checks on the touched surface. Owner runs round 2 with fresh testers. Then, and only then, regenerate everything the fix invalidated, regenerate the affected VR baselines, and delete the freeze line — on a branch **outside** the `feature/v3-*` pattern so the removal is verified by a blocking run in its own PR.

Sequencing is the whole design here: fixes invalidate baselines, so regen is last; and re-block must be verified by a run that is itself blocked.

## Out of Scope / Non-Goals

- **Not included: running the hallway sessions.** Steps 1 and 3 of the ticket's scope need cold human readers. The agent authors the protocol and consumes the notes; the owner runs the sessions. This ticket therefore **cannot close in a single execution pass** — see OPEN QUESTIONS.
- **Not included: filling `BEACON_TOKEN` / `PRODUCTION_HOST`** in `system/analytics.mjs`. Both are `""` by design ("filled at launch"). The AC asks for spine-completion instrumentation to be *present*, and `trackFactoryBuilt()` is present and wired. Recording traffic is a launch step, not this ticket.
- **Not included: a second fix round.** D10 specifies one fix, between the rounds. Round-2 findings are recorded and triaged into follow-up tickets, not fixed here — otherwise the gate never closes.
- **Not included: new v3 capability.** No new beats, engines, scenarios, or surfaces. If the biggest finding demands a genuinely new capability rather than a fix, that is a scope call for the owner (flag it, do not build it).
- **Not changing: the drift-check / token-lint gates.** They are already blocking and already green; leave them alone.
- **Not changing: `continue-on-error` semantics for any other job.** The change is the deletion of one line (plus its explanatory comment block) from the `visual` job.

## Feature Metadata

**Feature Type**: Refactor / Validation gate (with one unscoped bug-fix pass)
**Estimated Complexity**: Medium — low technical complexity, high sequencing risk, one unknown-scope fix
**Primary Systems Affected**: `.github/workflows/verify.yml` · `tooling/visual-regression/baselines/` · all v3 shipped surfaces (fix pass) · new `docs/hallway-runbook.md` + `docs/hallway-notes/`
**Dependencies**: Docker (for `update:docker`, baselines are Linux/Chromium) · local Playwright at `~/node_modules` (cross-engine checks) · human testers (Phase B)

## Related Work

**Implements**: [#82 — P4 · Hallway rounds + fix + full regen + VR re-block merge](https://github.com/linardsb/ux-factory/issues/82) · **Epic**: [#70](https://github.com/linardsb/ux-factory/issues/70) — `docs/epics/portfolio-v3-experience.prd.md` + `.architecture.md`

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/ux-overhaul-v3-prd-research.md` — Why: D1–D11 decision record; D10 (hallway rounds, never cut) and D11 (VR freeze + re-block) are this ticket's entire mandate.
- `.claude/plans/v3-spine-skeleton.md` through `.claude/plans/v3-investment-close.md` — Why: the surfaces under audit; each records its own craft-bar self-audit, so the sweep confirms rather than re-derives.
- `.claude/plans/visual-regression-gate.md` — Why: the gate's original design, the Linux-baseline constraint, and the pinned-image ↔ pinned-version rule.
- `docs/figma-runbook.md` — Why: the house precedent for an operator runbook (a boundary step a human must run). Mirror its shape for the hallway runbook.

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- (none yet — round-2 findings become new tickets from here)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.github/workflows/verify.yml` (lines 41–56) — Why: the freeze lives at line 48; lines 44–47 are the comment block that must go with it. Note the `visual` job's pinned container tag must keep matching `tooling/visual-regression/package.json`'s `@playwright/test` version (1.61.1).
- `tooling/visual-regression/visual.spec.mjs` (lines 1–80) — Why: the 9-page × 2-pack matrix, and the `waitReady` / `waitVisible` handle contract. If the fix pass touches a page's async mount, its handle may need updating or the gate hangs to timeout.
- `tooling/visual-regression/package.json` — Why: `update:docker` is the only correct way to regenerate baselines (Linux container). Local macOS runs fail on platform, not regression.
- `.claude/skills/portfolio-design/references/CHECKLIST.md` (all 54 lines) — Why: this IS the §6.4 craft bar in executable MUST/SHOULD/NEVER form. The sweep runs against this file, not against re-derived criteria.
- `.claude/skills/portfolio-design/references/CRAFT.md` — Why: the numeric craft rules any fix must respect.
- `system/analytics.mjs` (lines 55–72) — Why: `trackFactoryBuilt()` / `/factory/built` — the AC's instrumentation line. Confirm the call site still fires; do not fill the token.
- `docs/epics/portfolio-v3-experience.prd.md` §4, §6.4, §7 — Why: §4 gives the hallway pass/fail wording verbatim (use it in the script, do not paraphrase); §7 gives the metrics table.
- `docs/epics/portfolio-v3-experience.architecture.md` (line 31 VR mode, lines 45–54 phases + deliverables, line 67 open question on tester freshness) — Why: D11's exact wording and the "hallway-test script + notes template" deliverable.
- `docs/figma-runbook.md` — Why: the operator-runbook shape to mirror (what the operator does, what repeats, what the budget rules are).
- `system/spine.mjs` · `system/peak.mjs` · `system/close.mjs` · `system/intake-beat.mjs` — Why: the four spine beats a hallway finding most likely lands in; read only the one the finding names.

### New Files to Create

- `docs/hallway-runbook.md` — operator steps for a hallway session: recruit, brief, the ~90s observation, the two questions, what to write down, what NOT to say. Mirrors `docs/figma-runbook.md`'s shape.
- `docs/hallway-notes/TEMPLATE.md` — the per-session notes template (one file per tester), with the two PRD §4 outcomes as explicit yes/no fields plus timestamped observations.
- `docs/hallway-notes/round-1/` — filled session notes (Phase B output; one file per tester).
- `docs/hallway-notes/round-2/` — filled session notes (Phase C output).
- `.claude/reports/v3-craft-sweep-audit.md` — the §6.4 sweep result: one row per v3 surface × the CHECKLIST MUST list, with the cross-engine check results.
- `.claude/reports/v3-hallway-regen-vr-reblock-report.md` — the execution report (house convention; ships in the same PR).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [GitHub Actions — `jobs.<job_id>.continue-on-error`](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idcontinue-on-error)
  - Specific section: job-level continue-on-error
  - Why: confirms the recorded trap — job-level `continue-on-error` makes the **run** green while the **check** stays red, which is why a frozen v3 PR shows `UNSTABLE` rather than `CLEAN`. After removal both go red together.
- [GitHub Actions — `github` context (`head_ref`)](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#github-context)
  - Specific section: `github.head_ref` is set only on `pull_request` events, empty otherwise
  - Why: this is why the freeze never applied to pushes on `main`, and why the branch name chosen for this ticket's PR decides whether the re-block is verified.
- [Playwright — `toHaveScreenshot` / `--update-snapshots`](https://playwright.dev/docs/test-snapshots)
  - Specific section: updating snapshots; per-pixel `threshold`
  - Why: explains why sub-perceptual diffs are not rewritten by `--update-snapshots` (recorded trap: `rm` the PNG to force).
- [Nielsen Norman — hallway / corridor usability testing with 5 users](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/)
  - Specific section: sample size per round
  - Why: sizes the rounds honestly — do not over-recruit; two rounds of a few testers each is the designed shape, not a shortcut.

### Patterns to Follow

**Operator runbook (mirror `docs/figma-runbook.md`):** state what the operator does, which job repeats and which runs once ever, and the constraints that make a step expensive. The hallway runbook's equivalent constraint is tester scarcity — a cold reader is spent after one session and cannot be reused for round 2 (architecture doc line 67 prefers fresh testers).

**File header citing the governing doc** — every feature/entry-point file in this repo opens with one. New docs follow suit:

```markdown
<!-- docs/hallway-runbook.md — operator steps for the D10 hallway rounds (epic #70, ticket #82).
     PRD §4 gives the pass/fail wording; §7 the metrics. One session per tester; testers are not reusable. -->
```

**Honesty contract on recorded observations:** hallway notes are a record of what a human did and said. They follow the same rule as traces — write what happened, never a cleaned-up version. A session that went badly is the finding, not a failure to hide.

**Cross-engine functional check (recorded pattern, reuse verbatim):** the VR gate is Chromium-only, so the CHECKLIST's "eyeball every new layout in real Safari AND real Chrome" MUST is verified with the local Playwright install, which resolves at `~/node_modules` (confirmed present):

```js
const pw = await import('/Users/Berzins/node_modules/playwright/index.mjs');
for (const engine of ['chromium', 'firefox', 'webkit']) {   // webkit == Safari
  const browser = await pw.default[engine].launch();
  // …serve the repo over http (python3 -m http.server serves .mjs as text/javascript); never file://
}
```

All three engines are confirmed installed and launching on this machine (verified at planning time: Chromium 147.0.7727.15 · Firefox 148.0.2 · WebKit 26.4), so no `npx playwright install` step is needed. Serve the repo, never open `file://` — module scripts and fetches both fail there. Expect `ERR_CONNECTION_REFUSED` to `127.0.0.1:8787` on factory/proto/instance under a static server: that is the designed Worker-absent fixture degradation, not a regression (only `index.html` renders truly console-clean).

**Validation is "run the surface you touched"** — this repo has no test suite, no linter, no type-check, and CLAUDE.md says not to invent one. The gates are `node tooling/drift-check.mjs`, `node tooling/token-lint.mjs`, and the Docker VR run.

---

## IMPLEMENTATION PLAN

### Phase A: Protocol + craft sweep

Everything the agent can complete before a human is involved. Produces two committed artifacts and one audit report.

**Tasks:**

- Author `docs/hallway-runbook.md` and `docs/hallway-notes/TEMPLATE.md`, including the biggest-finding triage rule.
- Run the §6.4 craft sweep across every v3 surface against `CHECKLIST.md`'s MUST list.
- Run the cross-engine (Chromium/Firefox/WebKit) functional check the VR gate structurally cannot do.
- Record the audit; fix any MUST failure the sweep itself surfaces (that is a defect, not a hallway finding).

### Phase B: Hallway round 1 — OWNER, human gate

**Depends on:** Phase A (the script must exist before the first session, or the rounds are not comparable).

Not agent-executable. The owner recruits cold readers, runs sessions to the committed script, and lands one filled notes file per tester in `docs/hallway-notes/round-1/`.

### Phase C: Triage, fix, round 2, regen, re-block

**Depends on:** Phase B (round-1 notes must exist on disk).

**Independent of:** nothing — this is the tail, and every step inside it is strictly ordered. Regen genuinely must be last.

**Tasks:**

- Triage round-1 notes by the committed rule; name the single biggest finding.
- Fix it. Re-run the craft checks on the touched surface only.
- Owner runs round 2 (fresh testers) → `docs/hallway-notes/round-2/`.
- Full generator regen; drift-check + token-lint green.
- Full VR baseline regen in Docker.
- Delete the freeze line; open the PR from a branch **outside** `feature/v3-*`.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE branch `chore/v3-merge-vr-reblock` — FIRST ACTION, before any file is written

- **IMPLEMENT**: `git checkout -b chore/v3-merge-vr-reblock` off current `main`. **This branch survives the human gate** — Phase A's commit, the owner's round-1 and round-2 notes, Phase C's fix, the regen and the freeze removal all land on it, and it opens exactly one PR.
- **PATTERN**: CLAUDE.md git rules — the ticket's plan, report and review ship in the **same PR** as the work. If Phase A were committed to `main`, this plan file and the craft audit would already be on `main` and absent from the PR that carries `Closes #82`.
- **IMPORTS**: n/a.
- **GOTCHA**: The name is load-bearing, not cosmetic — `chore/…` is outside the `feature/v3-*` freeze pattern, which is what makes the re-block verifiable (see NOTES). Do **not** rename it to `feature/v3-merge` as the ticket's Repo-traps section suggests. Also tell the owner in the runbook that notes commit onto this branch, not `main`.
- **VALIDATE**: `git branch --show-current` → `chore/v3-merge-vr-reblock`; `node -e "console.log('chore/v3-merge-vr-reblock'.startsWith('feature/v3-'))"` → `false`
- **SATISFIES**: AC #5, AC #6

### CREATE `docs/hallway-runbook.md`

- **IMPLEMENT**: The operator's session script. Sections: (1) who to recruit — someone who has never seen the site and does not know what it is for; (2) the setup — real browser, real network, no owner narration; (3) the 90-second observation — start a timer, say only "have a look at this site", say nothing else, record what they do; (4) the two questions asked AFTER the 90s, worded from PRD §4 verbatim: *"What does this person do?"* and *"Is this senior work?"*; (5) the two binary outcomes to record — did they state what the candidate does correctly, and did they reach the built-screen peak **unprompted**; (6) what the operator must NOT do — no explaining, no pointing, no defending, no leading questions; (7) tester scarcity — a tester is spent after one session, round 2 prefers fresh testers (architecture doc line 67).
- **PATTERN**: `docs/figma-runbook.md` — same shape: operator steps, which job repeats, which constraint makes a step expensive.
- **IMPORTS**: n/a (markdown). Open with the header-comment pattern citing epic #70 / ticket #82 / PRD §4.
- **GOTCHA**: Copy PRD §4's outcome wording exactly. Paraphrasing it breaks the tie between what the sessions measure and what the hypothesis claims — which is the only reason the rounds have evidential value.
- **VALIDATE**: `test -f docs/hallway-runbook.md && grep -qi "unprompted" docs/hallway-runbook.md && echo OK`
- **SATISFIES**: AC #1 (protocol exists and is committed before round 1)

### CREATE `docs/hallway-notes/TEMPLATE.md`

- **IMPLEMENT**: One-file-per-tester template. Frontmatter-ish head: date, round, tester ref (anonymous label, never a real name), browser/device. Body: the two binary outcomes as explicit `yes/no` fields with a timestamp for the peak; a timestamped observation log; verbatim quotes; "where they stalled"; "what they did not see"; operator's one-line take. Ends with a **severity** field (blocking / major / minor) the triage rule reads.
- **PATTERN**: `traces/README.md`'s record-shape discipline — a fixed shape so records are comparable across sessions.
- **IMPORTS**: n/a.
- **GOTCHA**: No real names, no employer names — the repo is public. Use `tester-01`, `tester-02`.
- **VALIDATE**: `test -f docs/hallway-notes/TEMPLATE.md && grep -c "severity" docs/hallway-notes/TEMPLATE.md`
- **SATISFIES**: AC #1

### ADD the biggest-finding triage rule to `docs/hallway-runbook.md`

- **IMPLEMENT**: A deterministic rule, written BEFORE round 1 so the choice cannot be rationalised after the fact. Proposed: rank findings by (a) how many testers hit it, then (b) severity, then (c) whether it blocks one of the two PRD §4 outcomes; ties break toward the finding that blocks an outcome. Exactly one finding is fixed between rounds (D10).
- **PATTERN**: the repo's decision-rule discipline — architecture doc line 60 states spike-3's decision rule the same way ("zero 'why am I being asked this' reactions or reword").
- **IMPORTS**: n/a.
- **GOTCHA**: Write this before any notes exist. A rule authored after reading the notes is not a rule.
- **VALIDATE**: `grep -qi "biggest finding" docs/hallway-runbook.md && echo OK`
- **SATISFIES**: AC #2

### CREATE `.claude/reports/v3-craft-sweep-audit.md` — run the §6.4 sweep

- **IMPLEMENT**: Audit each v3 surface — `index.html` (all five beats), `approach.html`, `work.html`, `factory.html`, `contact.html`, `404.html`, `roundtrip.html`, `instance.html`, `proto/verdant.html`, `proto/fieldwork.html` — against `CHECKLIST.md`'s MUST list. One row per surface, one column per MUST group (accessibility, motion correctness, layout/cross-browser, honesty/copy). Record PASS / FAIL / N-A with evidence, not assertions.
- **PATTERN**: `.claude/reports/*-report.md` house style — findings with file:line, no unevidenced claims.
- **IMPORTS**: n/a.
- **GOTCHA**: Every per-ticket plan already self-audited its own surface. The sweep's value is the *seams between* surfaces — the pack control's behaviour as the reader moves page to page, and the derived-pack transition (recorded trap: any `removeProperty` of a `--color-*` token strips an inline derived pack). Do not just restate the per-ticket audits.
- **VALIDATE**: `test -f .claude/reports/v3-craft-sweep-audit.md`
- **SATISFIES**: AC #3

### ADD cross-engine functional check to the sweep

- **IMPLEMENT**: Serve the repo (`python3 -m http.server 4757`), drive Chromium + Firefox + WebKit from the local Playwright install, load each v3 surface, capture console errors and a screenshot, and check the CHECKLIST's layout MUSTs (no horizontal page scroll; responsive to 360px). Record results in the audit.
- **PATTERN**: the recorded cross-engine pattern in "Patterns to Follow" above — `~/node_modules/playwright`, http not `file://`.
- **IMPORTS**: `await import('/Users/Berzins/node_modules/playwright/index.mjs')`
- **GOTCHA**: Two recorded expectations. (1) `ERR_CONNECTION_REFUSED` to `:8787` on factory/proto/instance is the designed Worker-absent fixture degradation — not a finding. (2) The hero runs a canned re-skin ~2.4s after load; wait ~3s (or poll `:root --color-accent`) before screenshotting settled colours, or you will record a mid-flush frame as a defect.
- **VALIDATE**: the script prints a per-engine PASS/FAIL line for each surface; a WebKit-only layout failure is a real finding (the gate is Chromium-only by construction).
- **SATISFIES**: AC #3

### UPDATE any surface with a MUST failure found by the sweep

- **IMPLEMENT**: Fix MUST failures the sweep itself surfaces. These are defects, distinct from hallway findings, and are not counted against D10's one-fix budget.
- **PATTERN**: mirror the fix pattern of the surface's own ticket plan.
- **IMPORTS**: per surface.
- **GOTCHA**: Any at-rest change to a captured page invalidates its baseline — do not regen yet. Regen is Phase C's last task, once.
- **VALIDATE**: `node tooling/drift-check.mjs && node tooling/token-lint.mjs`
- **SATISFIES**: AC #3

### COMMIT Phase A and hand off to the owner

- **IMPLEMENT**: One atomic commit: runbook + template + audit (+ any MUST fixes). Message cites the doc reference, house style: `docs: hallway runbook + notes template + v3 craft sweep (#82, PRD §6.4, D10)`.
- **PATTERN**: CLAUDE.md git rules — one atomic commit per phase; plan/report/review ship in the same PR.
- **IMPORTS**: n/a.
- **GOTCHA**: **Stop here.** The next step needs humans. Tell the owner explicitly what to run and where the notes go; do not proceed to regen or to the freeze removal with the fix pass still ahead.
- **VALIDATE**: `git log --oneline -1 && node tooling/drift-check.mjs`
- **SATISFIES**: AC #1, AC #3

### — HUMAN GATE: owner runs hallway round 1 —

- **IMPLEMENT**: Owner runs sessions per `docs/hallway-runbook.md`; one filled `docs/hallway-notes/round-1/tester-NN.md` per tester.
- **VALIDATE**: `ls docs/hallway-notes/round-1/*.md | wc -l` ≥ 3
- **SATISFIES**: AC #2

### UPDATE the biggest-finding triage — apply the committed rule

- **IMPLEMENT**: Read every round-1 notes file, apply the rule verbatim, and record the ranked list plus the named single finding in the execution report. Show the ranking, so the choice is auditable.
- **PATTERN**: decision-with-rationale, the house ledger style (`because` / `rejected`).
- **IMPORTS**: n/a.
- **GOTCHA**: If two findings tie after all three tie-breakers, that is an owner call — surface it, do not pick.
- **VALIDATE**: the report names exactly one finding as the fix target.
- **SATISFIES**: AC #2

### UPDATE the surface carrying the biggest finding — the one fix

- **IMPLEMENT**: Scope unknown until round 1 runs. Fix only the named finding.
- **PATTERN**: the surface's own ticket plan + `CRAFT.md` numeric rules.
- **IMPORTS**: per surface.
- **GOTCHA**: Three recorded traps to check against whatever you touch. (1) `body { overflow-x: clip }` on shipped pages makes `position: sticky` a no-op for all descendants — solve layout structurally. (2) Entrance animations on nodes rebuilt every `input` tick blank and restart — gate behind a discrete-render class. (3) If the fix touches a page's async mount, its VR `waitReady`/`waitVisible` handle in `visual.spec.mjs` may need updating, or the gate hangs to timeout rather than failing usefully.
- **VALIDATE**: `node tooling/drift-check.mjs && node tooling/token-lint.mjs`, plus re-run the cross-engine check on the touched surface only.
- **SATISFIES**: AC #2

### — HUMAN GATE: owner runs hallway round 2 (fresh testers) —

- **IMPLEMENT**: Same script, fresh testers, notes into `docs/hallway-notes/round-2/`. Round-2 findings are recorded and triaged into follow-up tickets — not fixed here.
- **VALIDATE**: `ls docs/hallway-notes/round-2/*.md | wc -l` ≥ 3
- **SATISFIES**: AC #2

### UPDATE — full generator regen

- **IMPLEMENT**: Regenerate in dependency order, then verify: `node agent-layer/gen-token-css.mjs` → `node agent-layer/gen-handoff.mjs` → `node agent-layer/gen-pack-bundle.mjs` → `node agent-layer/gen-system-graph.mjs` → `node agent-layer/gen-vocabulary.mjs` → `node agent-layer/gen-annotated-source.mjs` → `git add` the changes → `node agent-layer/gen-loc-summary.mjs`.
- **PATTERN**: `CHECKLIST.md` §"Token & pipeline discipline" — the cascade rules are written there.
- **IMPORTS**: n/a.
- **GOTCHA**: `gen-loc-summary.mjs` counts **git-tracked** content, so it runs AFTER `git add` — running `--check` before staging gives a false "no drift". New tracked source files (the runbook, template, notes, audit are all `docs/`/`.claude/`, so check whether the loc-summary spec counts them) can flip the runtime group, which `approach.html` renders, which churns approach's two baselines. Run baseline regen after this, never before.
- **VALIDATE**: `node tooling/drift-check.mjs && node tooling/token-lint.mjs` — both must print their `✓` line.
- **SATISFIES**: AC #4

### UPDATE `tooling/visual-regression/baselines/` — full baseline regen

- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker`. Review every changed PNG before staging — a diff you cannot explain is a regression, not churn.
- **PATTERN**: `.claude/plans/visual-regression-gate.md`; recorded trap notes.
- **IMPORTS**: Docker must be running.
- **GOTCHA**: Three recorded traps. (1) Baselines are Linux/Chromium — a local macOS `npx playwright test` fails on platform, not regression; only the Docker run is authoritative. (2) `update:docker` will not rewrite a baseline whose only change is below pixelmatch's per-pixel threshold — `rm` that PNG to force. (3) `approach` can fail with "two consecutive stable screenshots" because of the live countUp rAF racing `retries: 0`; it fails a *different pack* each run, which is the tell that it is flake rather than regression.
- **VALIDATE**: `cd tooling/visual-regression && docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && npx playwright test'` — 18 passed.
- **SATISFIES**: AC #4

### REMOVE the D11 freeze from `.github/workflows/verify.yml`

- **IMPLEMENT**: Delete line 48 (`continue-on-error: ${{ startsWith(github.head_ref, 'feature/v3-') }}`) together with its explanatory comment block at lines 44–47. Leave the pinned-container comment (lines 49–52) intact — it explains a different, still-live constraint.
- **PATTERN**: the workflow's existing comment discipline — every non-obvious line carries its reason.
- **IMPORTS**: n/a.
- **GOTCHA**: **The branch name decides whether this is verified.** `feature/v3-merge` — the name the ticket's own Repo-traps section suggests — matches `startsWith('feature/v3-')`, so a PR from it runs the visual job non-blocking while deleting the line that makes it non-blocking. Use **`chore/v3-merge-vr-reblock`** (verified: does not match the pattern), so the visual job blocks on this very PR and the re-block is proven by the run that performs it.
- **VALIDATE**: `grep -c "continue-on-error" .github/workflows/verify.yml` → `0`; then `gh pr checks` on the PR shows `visual` passing, with a failure now able to fail the run (no longer swallowed). Do **not** expect the check to be marked *required* — `main` has no branch-protection rule (verified: `gh api repos/linardsb/ux-factory/branches/main/protection` → 404 "Branch not protected"). Removing `continue-on-error` restores honest red/green; making the check *block a merge* is branch protection, a separate owner call — see OPEN QUESTIONS.
- **SATISFIES**: AC #5

### CREATE `.claude/reports/v3-hallway-regen-vr-reblock-report.md` + open the PR

- **IMPLEMENT**: Execution report in house style. PR body carries the `Closes #82` trailer.
- **PATTERN**: CLAUDE.md git rules — a PR body MUST carry `Closes #N`; the plan, report and review all ship in the same PR (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`).
- **IMPORTS**: n/a.
- **GOTCHA**: A title that merely mentions `(#82)` closes nothing — the epic has already lost time to tickets that shipped and stayed open. Also: leaving these artifacts uncommitted in a worktree has already cost this repo four review files.
- **VALIDATE**: `gh pr view --json body --jq .body | grep -q "Closes #82" && echo OK`
- **SATISFIES**: AC #6

---

## TESTING STRATEGY

This repo has **no test suite, no linter, and no type-checker**, and CLAUDE.md forbids hunting for or inventing one. "Done" = run the surface you touched. The testing strategy is therefore the three CI gates plus manual surface runs.

### Gate tests (the real suite)

- `node tooling/drift-check.mjs` — regenerates every committed artifact and fails on divergence. Currently green on `main`.
- `node tooling/token-lint.mjs` — undeclared / orphan / DTCG-valid contract checks. Currently green (64 contract tokens, 0 undeclared, 0 orphan).
- Playwright VR in the pinned Docker image — 18 screenshots (9 pages × 2 packs), pixel-diffed vs committed Linux baselines.

### Manual / human validation

- The two hallway rounds. These are the only test of the epic's actual hypothesis; every automated gate above tests that nothing broke, not that the thing works.
- Cross-engine functional check (Chromium + Firefox + WebKit) — covers the VR gate's recorded single-engine blindspot.

### Edge Cases

- **Hallway round 1 finds nothing** — possible and not a failure. Record it, skip the fix, run round 2, proceed. Do not manufacture a finding to have something to fix.
- **The biggest finding needs a new capability, not a fix** — out of scope; flag to the owner as a scope call rather than building it.
- **The fix invalidates baselines already regenerated** — the reason regen is last. If a fix lands after regen, regen again; never hand-edit a PNG.
- **A VR failure that names a different pack on each run** — the recorded `approach` countUp/rAF flake, not a regression.
- **A WebKit-only layout failure** — a real finding the CI gate structurally cannot catch (recorded: a real Safari/Chrome grid blowout got through in PR #54).
- **`loc-summary` flips the grand total but not the runtime group** — fails `verify` without churning approach's baselines. Both need handling; they are different failures.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

No linter, no formatter, no type-checker — and do not add one. Syntax is already covered: `drift-check` runs `syntax` as its first gate (it is the first item in its own `✓` line).

```bash
node tooling/token-lint.mjs          # expect: token-lint ✓ … 0 undeclared · 0 orphan · DTCG valid
```

### Level 2: Drift (this repo's unit-test equivalent)

```bash
node tooling/drift-check.mjs         # expect: drift-check ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces
```

### Level 3: Visual regression (integration equivalent)

```bash
cd tooling/visual-regression && npm run update:docker    # regenerate (Docker required)
cd tooling/visual-regression && docker run --rm -v "$PWD/../..":/work \
  -w /work/tooling/visual-regression mcr.microsoft.com/playwright:v1.61.1-jammy \
  sh -c 'npm ci && npx playwright test'                  # verify — expect 18 passed
```

### Level 4: Manual Validation

```bash
npx serve .                          # then walk index → intake → peak → close, in real Safari AND real Chrome
node -e "console.log('chore/v3-merge-vr-reblock'.startsWith('feature/v3-'))"   # expect false — the branch is outside the freeze
grep -c "continue-on-error" .github/workflows/verify.yml                        # expect 0
gh pr checks                         # expect visual = pass, and the check itself green (not UNSTABLE)
```

### Level 5: Additional Validation (Optional)

```bash
python3 -m http.server 4757 &        # cross-engine sweep host (serves .mjs as text/javascript)
# drive chromium + firefox + webkit from ~/node_modules/playwright per "Patterns to Follow"
```

---

## ACCEPTANCE CRITERIA

Mapped to issue #82's own Acceptance block, minus the skill-template boilerplate this repo has no mechanism for (no test suite ⇒ no coverage target).

- [ ] **AC #1** — `docs/hallway-runbook.md` + `docs/hallway-notes/TEMPLATE.md` committed **before** round 1 runs, including the biggest-finding triage rule.
- [ ] **AC #2** — Both hallway rounds run; notes recorded per session in `docs/hallway-notes/round-{1,2}/`; the single biggest round-1 finding fixed between rounds, with the ranking shown.
- [ ] **AC #3** — §6.4 craft sweep recorded in `.claude/reports/v3-craft-sweep-audit.md`, covering every v3 surface against `CHECKLIST.md`'s MUST list, including real Chromium/Firefox/WebKit results.
- [ ] **AC #4** — All generators regenerated (token CSS, handoff pack, `pack.bundle`, `loc-summary`, `system-graph`, `vocabulary`, `annotated-source`); `drift-check` and `token-lint` both green; all 18 VR baselines current.
- [ ] **AC #5** — VR re-blocked: `continue-on-error` gone from `verify.yml`, and the removal **verified by a `visual` run that could actually have failed** — i.e. this ticket's own PR is opened from a branch outside `feature/v3-*`, so the job's result is no longer swallowed. (Making the check *required to merge* is branch protection, which `main` does not currently have; out of scope — see OPEN QUESTIONS.)
- [ ] **AC #6** — Spine-completion instrumentation present (`/factory/built` via `trackFactoryBuilt()`); PR carries `Closes #82`; plan + report + review committed in the same PR.
- [ ] No regressions: the shipped pages render under the neutral pack and under one client pack.

---

## COMPLETION CHECKLIST

- [ ] Phase A committed and handed to the owner before any session ran
- [ ] Round-1 notes on disk; triage rule applied verbatim; ranking recorded
- [ ] Exactly one finding fixed (or "no finding" explicitly recorded)
- [ ] Round-2 notes on disk; round-2 findings filed as follow-up tickets, not fixed here
- [ ] Generators regenerated in dependency order, `loc-summary` after `git add`
- [ ] `drift-check` ✓ and `token-lint` ✓
- [ ] All 18 baselines regenerated in Docker; every changed PNG explained
- [ ] Freeze line + its comment block deleted; pinned-container comment left intact
- [ ] PR opened from `chore/v3-merge-vr-reblock`; `visual` check green **and blocking**
- [ ] `Closes #82` in the PR body; plan, report and review all in the PR
- [ ] Epic #70's checkbox list updated (it is stale — #77 and #81 are closed but still show unchecked)

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes:**

1. **The owner runs the hallway sessions.** The agent authors the protocol and consumes the notes. This follows the house precedent for boundary steps that need a human (`docs/figma-runbook.md`), and D10 puts the rounds in scope without making them automatable.
2. **The ticket does not close in one pass.** Phase A → human gate → Phase C. Any execution agent that tries to run this end-to-end without notes on disk is doing it wrong.
3. **Round 1 with 3–5 testers per round.** NN/g's sample-size finding; the runbook should state the number so both rounds match.
4. **Round-2 findings are not fixed here.** D10 specifies one fix, between rounds. Otherwise the merge gate never closes.
5. **`instance.html` is in the craft sweep** but not in the VR matrix (it is deep-link-only, off the five-page IA). It gets audited, not baselined — consistent with how the gate treats unlisted surfaces.

**Questions that would change the plan if answered differently:**

- **Does the owner want the raw hallway notes committed to a public repo at all?** The plan anonymises testers (`tester-01`), which should be sufficient, but the alternative — keep notes in the sibling jobs folder and commit only the triage summary — is a legitimate call and changes the file layout. Defaulting to committed-and-anonymised because the ticket's AC says "notes recorded" and this repo's proof-is-the-repo principle favours it.
- **Should `main` get a branch-protection rule naming `verify` and `visual` as required checks?** Verified at planning time: `main` has **no protection** (`gh api …/branches/main/protection` → 404). So "re-blocked" in this ticket means the visual job's failure is no longer swallowed — not that it can stop a merge. On a solo repo that is arguably enough, and adding protection interacts with the house habit of merging own PRs. Recommend raising it as a separate follow-up rather than folding it in here; flagged because the ticket's word "re-block" could reasonably be read either way.
- **If round 1 surfaces a finding whose fix is genuinely large** (a beat that does not work rather than a beat that needs adjusting), does it get fixed here or split into its own ticket? Recommend: split, and let #82 close on the smaller fix — but that is the owner's scope call, not the agent's.

---

## NOTES (open canvas)

### The regen half of this ticket is mostly already done — do not budget a day for it

The ticket was written when the baselines were badly stale (see its own comment: "all 16 baselines … expect these to be stale"). **That is historically resolved.** Commits `3bbb35b`, `7dbdbbe` and `13ca76d` regenerated index, work and approach baselines after the #76/#77/#81 merges, and CI on `main` has been fully green — `verify` **and** `visual` — for the last eight runs, including `d67a2cd` (current HEAD).

Two corrections to the ticket text while you are here:

- It says **16** baselines. There are **18** — `roundtrip` was added to the matrix since the ticket was written (9 pages × 2 packs).
- `/factory/built` is listed as an acceptance item as though it were outstanding. It is not: `trackFactoryBuilt()` exists at `system/analytics.mjs:55-72` and is wired to the peak beat. `BEACON_TOKEN` and `PRODUCTION_HOST` are still `""`, so it is present-and-contract-testable rather than recording — which is what the AC asks for, and filling them is a launch step.

So the real remaining work is: **the protocol, the sweep, the fix, and one deleted line.** The regen is the tail that catches whatever the fix disturbs.

### The freeze's actual shape — and why the branch name is load-bearing

```
continue-on-error: ${{ startsWith(github.head_ref, 'feature/v3-') }}
```

`github.head_ref` is set only on `pull_request` events. So:

| Context | `head_ref` | `continue-on-error` | Effect |
| --- | --- | --- | --- |
| push to `main` | empty | `false` | VR **blocks** — and passes today |
| PR from `feature/v3-close` | `feature/v3-close` | `true` | VR runs, reports, does not block |
| PR from `feature/v3-merge` | `feature/v3-merge` | **`true`** | ← the trap |
| PR from `chore/v3-merge-vr-reblock` | that | `false` | VR blocks — the re-block is verified |

The ticket's Repo-traps section recommends `feature/v3-merge`, which is inside the freeze. Following it would ship the re-block through a PR that could not have caught a VR failure — the one class of failure this ticket exists to re-enable. Verified with `node -e "console.log('feature/v3-merge'.startsWith('feature/v3-'))"` → `true`, and `'chore/v3-merge-vr-reblock'` → `false`.

Also worth knowing when reading the PR: because the freeze is **job-level**, a frozen PR shows a *green run* with a *red check* and a `mergeStateStatus` of `UNSTABLE` rather than `CLEAN`. After removal, run and check go red together — which is the point.

### Alternatives weighed

- **Rejected: remove the freeze first, regen after.** Reads tidier but inverts the dependency — any fix or regen after the removal fails the now-blocking gate for reasons that are expected churn, and you would spend Docker runs relitigating known-good diffs.
- **Rejected: keep the freeze and delete it in a separate follow-up PR.** Costs an extra PR and leaves the epic's closing AC unmet in the PR that claims to close it. Choosing the branch name correctly gets the same verification for free.
- **Rejected: fold the craft sweep into Phase C.** The sweep can find MUST failures that are worth fixing before cold readers see the site. Running it first means round 1 tests the intended experience rather than a known-defective one.

### Sequencing sketch

```
Phase A (agent)      branch chore/v3-merge-vr-reblock   ◄── one branch, one PR, spans the gate
                     runbook + template + triage rule
                     craft sweep (10 surfaces × CHECKLIST MUSTs)
                     cross-engine chromium/firefox/webkit
                     fix any MUST failure  ──►  commit  ──►  STOP
                                                              │
Phase B (owner)      ◄─────────────────────────────────────── │
                     round 1 · 3–5 cold readers · notes on disk
                                                              │
Phase C (agent)      ◄─────────────────────────────────────── │
                     triage → the ONE fix → re-check surface
                     [owner: round 2, fresh testers]
                     full generator regen  (loc-summary AFTER git add)
                     full baseline regen   (Docker, 18 PNGs)
                     delete freeze line
                     PR from chore/v3-merge-vr-reblock · Closes #82
```

### Housekeeping the ticket does not mention

Epic #70's ticket checklist is stale: #77 and #81 both show unchecked but are `CLOSED` (merged as PR #109 and PR #113). Since #82 is the epic's closing ticket, tick them while closing it, or the epic reads as unfinished after its last ticket lands.

---

## AMENDMENTS

<!-- Append-only. Newest at the bottom. Leave empty at creation. -->
