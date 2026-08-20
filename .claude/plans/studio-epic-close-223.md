# Feature: Studio 21 — epic close: hallway test, metric audit, copy + count audit, recorded cuts (#223)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before implementing. Pay attention to the naming of existing modules and artifacts — import
from the right files.

## Feature Description

The honest close of epic #202. Four audits, one human study, and the record of both. Not a feature
build: it runs the evidence the epic's hypothesis is judged by (hallway sessions with cold
evaluators), verifies the win-metric instrumentation on the **live** site rather than only in
`build-checks`, sweeps every stated number and capability claim on the shipped pages back to a
generated artifact, and records what was cut or carried forward — on #202, and as closing notes in
the epic's own PRD and architecture docs.

Why this is a ticket at all: #177 was this exact ticket for epic #164 and was closed `NOT_PLANNED`
— the audit never ran. An epic-close that is nobody's ticket does not happen.

## User Story

As the owner of a portfolio graded as a work sample
I want the studio epic closed against evidence — real evaluators, verified metrics, audited claims
So that the epic's hypothesis is actually judged, the site never states a number or capability it
cannot back, and the next epic starts from a true record.

## Problem Statement

Twenty tickets (#203–#222) shipped. Nothing yet proves the epic's WRONG-ifs false: no cold
evaluator has ever used the studio (the v3 hallway rounds were prepped — `docs/hallway-notes/` —
but **never run**; both round dirs hold only READMEs). The win-metric routes are proven in
`build-checks` group 10 and `studio-journey`, but the live deploy at `factory-ux.pages.dev` is
**stale — it predates the entire studio epic** (`/system/studio-keep.mjs` 404s live, checked
2026-08-20), so nothing has ever been confirmed live. And twenty tickets of copy churn have never
been swept end-to-end against the honesty contract.

## Solution Statement

Five phases: (A) the desk audits — copy + count, honesty contract, capability chips — with fixes in
the same PR; (B) deploy current main and verify the three win-metric routes firing once each on the
live site via a small operator-run Playwright script (`tooling/live-metric-audit.mjs`, reusable at
launch when the beacon token lands); (C) hallway round 3 — a studio variant of the existing
session template, 3–5 cold testers, notes files as the record; (D) fix the biggest observed
confusion, or defer it with a ticket, by an explicit decision rule; (E) record the cuts on #202 and
write the closing notes into `prototype-studio.{prd,architecture}.md`, then close the epic.

## Out of Scope / Non-Goals

- **Not launch.** `BEACON_TOKEN` / `PRODUCTION_HOST` in `system/analytics.mjs` stay empty
  (fail-closed, no beacon injected). The metric audit verifies the **firing mechanism** live (the
  history flip is observable); CF WA **recording** stays launch-gated and the closing note says so.
  (Q1 below if the owner wants launch folded in — that is a scope change.)
- **Not a fix-everything pass.** Open tickets #264, #268, #273 are recorded as carried forward, not
  fixed here. Only the hallway test's biggest confusion gets fixed (or explicitly deferred).
- **Not new instrumentation.** No new routes, no changes to `analytics.mjs`.
- **Not a re-run of the v3 90-second rounds** as specified for ticket #82 — round 3 inherits their
  discipline and template shape but tests the studio hypothesis.
- Not changing: any studio behaviour, any gate, any generated artifact (except where a copy fix
  forces a regen cascade).

## Feature Metadata

**Feature Type**: Audit / process (epic close)
**Estimated Complexity**: Medium — mechanically simple, operationally gated (humans + a deploy)
**Primary Systems Affected**: shipped-page copy, `docs/hallway-notes/`, `docs/hallway-runbook.md`,
`docs/epics/prototype-studio.{prd,architecture}.md`, one new tooling script, GitHub issue #202
**Dependencies**: Playwright (resolved from `tooling/visual-regression/node_modules`, the standing
pattern) · `wrangler` (deploy) · 3–5 cold testers the owner books (the long pole)

## Related Work

**Implements**: linardsb/ux-factory#223 · **Epic**: `docs/epics/prototype-studio.prd.md` +
`.architecture.md` (#202)

**Back-references**:

- `docs/hallway-runbook.md` + `docs/hallway-notes/TEMPLATE.md` — the session discipline round 3
  inherits (epic #70 ticket #82; sessions never run).
- `.claude/plans/studio-*-2xx.md` and `.claude/reports/studio-*.md` — the per-ticket record the
  cuts harvest reads.
- Precedent NOT to repeat: #177 (`NOT_PLANNED`).

**Forward-references**:

- The "biggest confusion" fix ticket, if deferred (created during Phase D).
- Launch (fills the beacon token; re-runs `tooling/live-metric-audit.mjs` end-to-end against CF WA).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/analytics.mjs` (lines 34–58, 240–330) — Why: the three studio win-metric trackers
  (`trackFactoryTookOver` :275, `trackFactoryLinkCopied` :305, `trackFactoryExported` :319), the
  `flipTo` restore rules, the fire-once flags, and the empty `BEACON_TOKEN`/`PRODUCTION_HOST`
  constants (:34–35) that make the beacon fail-closed. The audit's ground truth.
- `system/studio-keep.mjs` (lines 400–500) — Why: the two keep-rail success paths — export fires at
  :409 only after the blob click (`if (handed)`), link-copied at :495 after clipboard-or-fallback.
  The live script must drive these exact paths.
- `system/replay-driver.mjs` (lines 780–840) — Why: `trackFactoryTookOver()` at :792, the handover
  success path; the comment at :834 records where it deliberately does NOT fire.
- `tooling/build-checks.mjs` (lines 1680–1740, group 10) — Why: what CI already proves about the
  routes (literals, pairwise-distinct paths, fire-once, both overlap orderings) — the live audit
  verifies the one thing this cannot: the wired page, deployed.
- `tooling/studio-journey.mjs` (lines 40–130, plus its take-over and keep passes) — Why: `BASE` env
  override pattern (:47), the tree-identity guard (:121–125), the expected-noise filter, and the
  working selectors/sequences for take-over and the keep rail — crib these for the live script; do
  not re-derive them.
- `docs/hallway-runbook.md` (all 106 lines) — Why: the session discipline (testers are spent after
  one session; who counts as cold; anonymous labels; the silence rule). Round 3 extends this file.
- `docs/hallway-notes/TEMPLATE.md` (all 90 lines) — Why: the fixed session shape (metadata table,
  observation log, the two verbatim questions, findings table) the studio variant mirrors.
- `docs/epics/prototype-studio.prd.md` (§Hypothesis, §Success metrics, §Open questions) — Why: the
  six metric rows the closing note settles row by row; the WRONG-ifs the hallway script must be
  able to observe ("visitors watch without ever grabbing the wheel").
- `docs/epics/prototype-studio.architecture.md` (§Boundaries & contracts) — Why: the honesty
  surfaces the audit checks — replay chrome carries real meta + trace link, provenance shifts on
  take-over, the "projection" label may never read as a recording.
- `approach.html` (lines 190–270) — Why: the only page that renders loc-summary + param-count
  numbers; the comments there state the "never a hand-written number" rule the audit enforces.
- `system/param-manifest.json` (the `/factory` and `/components` entries) — Why: hand-maintained;
  CI drift-checks only the *count*, not *coverage* — the audit sweeps every #204–#221 control
  against it.
- `.claude/reports/studio-*.md` — Why: the cuts harvest. Known seeds: #217's real-Safari/Chrome
  manual pass carried forward; #207's `.stx-viewport` follow-up; #222's derived-pack follow-up
  note; #221's L2 → #273.

### New Files to Create

- `tooling/live-metric-audit.mjs` — operator-run live verification of the three win-metric routes
  (also the launch-day recheck tool).
- `docs/hallway-notes/TEMPLATE-studio.md` — the round-3 session script + notes shape.
- `docs/hallway-notes/round-3-studio/README.md` — the round's one-paragraph contract.
- `docs/hallway-notes/round-3-studio/tester-0N.md` — one per session (copied from the template,
  filled during sessions).
- `docs/hallway-notes/round-3-studio/findings.md` — the write-up: ranked confusions, the fix/defer
  decision, the WRONG-if verdict.
- (Conditional) copy-fix diffs across shipped pages + regenerated VR baselines.

### Relevant Documentation

- `docs/hallway-runbook.md` — the whole session protocol. Why: round 3 must stay comparable and
  auditable, and testers are a non-renewable resource.
- `replay/README.md` — Why: the projection-not-recording rule in the artifact tree's own words; the
  honesty audit quotes it.
- CF Web Analytics has **no custom events** — an event is a pageview at a synthetic path
  (`system/analytics.mjs` header). Why: this is why "the path is the entire payload" and why the
  live check is an address-bar/history observation, not a dashboard one.
- Memory notes that bite here: *visual-regression baseline trap* (any at-rest copy change to a
  shipped page ⇒ `update:docker` regen in the same PR, from a clean worktree under /Users);
  *shared worktree, parallel sessions* (the working dir currently sits on
  `feature/catalog-ten-components-220` with uncommitted parallel-session edits — branch fresh off
  `origin/main`, stage by explicit path); *stale serve = wrong tree* (curl-verify what a server
  actually serves — the exact trap the stale live deploy is an instance of).

### Patterns to Follow

**Operator-run driver, not CI** (`tooling/studio-journey.mjs:32–47`): resolve Playwright out of
`tooling/visual-regression/node_modules`, take `BASE` from env, guard against auditing the wrong
tree/host, print every assertion as it runs.

**History-wrap-before-modules** (`tooling/build-checks.mjs` group 10 / `tooling/vt-verify.mjs`):
instrument `history.pushState` via `addInitScript` **before any module evaluates**, then assert on
the recorded push list — never poll the address bar (the restore lands in 50 ms).

**Session records** (`docs/hallway-notes/TEMPLATE.md`): fixed shape, verbatim quotes, anonymous
labels only (the repo is public), notes are the recording — no video, no names.

**Closing notes** (`docs/epics/portfolio-v3-experience.prd.md` §Amendments style): dated, appended,
never rewriting history; state what shipped vs what was claimed, row by row.

**Honest capability copy** (`factory.html` chips: "Real run · replayed", "Measured · generated";
`index.html:57`): a chip states exactly what runs; anything launch-gated says so.

---

## IMPLEMENTATION PLAN

Phase C's *recruitment* starts on day one (owner books testers — the long pole). Everything else
runs while the calendar fills.

### Phase A: Desk audits + fixes (copy + count, honesty, capability)

No dependencies. Branch `feat/223-epic-close` off `origin/main` (verify — the shared worktree is
currently on a #220 branch with uncommitted edits that are not ours).

**Tasks:** number sweep, generator drift re-run, param-manifest coverage sweep, honesty-surface
walk, capability-chip walk, cut-implying-copy sweep; fix what they find.

### Phase B: Deploy + live metric audit

**Depends on:** Phase A merged (the deploy should carry the fixes). **Owner OK required** for the
deploy (outward-facing; it replaces the public — noindex — site with current main).

**Tasks:** write `tooling/live-metric-audit.mjs`, deploy, run it against
`https://factory-ux.pages.dev`, record results in the findings doc.

### Phase C: Hallway round 3

**Depends on:** Phase B (sessions run against the live, current site — the runbook's own
preference). **Independent of:** Phase B for its *prep* half (template, README, runbook section,
recruitment) — do those during Phase A.

**Tasks:** studio session template, round dir, runbook section, 3–5 sessions (operator, offline),
findings write-up.

### Phase D: Fix the biggest confusion (or defer with a ticket)

**Depends on:** Phase C findings. Scope unknowable in advance — bounded by a decision rule (below).

### Phase E: Record + close

**Depends on:** all above. Cuts comment on #202, closing notes in both epic docs, PR with
`Closes #223`, epic #202 closed (owner's click or explicit OK).

---

## STEP-BY-STEP TASKS

### CREATE branch `feat/223-epic-close`

- **IMPLEMENT**: `git fetch origin && git switch -c feat/223-epic-close origin/main`. Do NOT build
  on the local working tree's uncommitted `catalog.mjs`/`studio-canvas.mjs`/`studio-journey.mjs`
  edits — they belong to a parallel session.
- **VALIDATE**: `git status --short` clean; `git log -1 --oneline` shows `9cd9696` or later.
- **SATISFIES**: prerequisite for all ACs.

### AUDIT stated numbers on every shipped page (copy + count)

- **IMPLEMENT**: sweep the eleven shipped pages + chrome for numeric claims:
  `grep -nE '\b[0-9]+\b|twenty|thirty|dozen' index.html approach.html factory.html work.html
  contact.html build.html components.html 404.html proto/*.html system/site.js` and triage by hand.
  For each *claim* number (a count, a measure, a size), trace it to its generated source:
  loc-summary → `approach.html`; param-count total → `approach.html`; catalog count →
  `data-catalog-count` filled from the fetched pack (`components.html:64`); replay chrome numbers →
  the committed artifact/trace (group 16 asserts identity). A number with no artifact behind it is
  a finding: either re-point it at an artifact or delete it.
- **PATTERN**: `approach.html:195–198`'s comments state the rule verbatim.
- **GOTCHA**: dates, WCAG criterion numbers, and CSS values are not claims — do not gold-plate.
  Record the triage (every number, its verdict) in a `## Copy + count audit` section of
  `docs/hallway-notes/round-3-studio/findings.md` so "checked, not assumed" is auditable.
- **VALIDATE**: the recorded triage table covers every grep hit; `node tooling/build-checks.mjs`
  green after any fix.
- **SATISFIES**: AC #3.

### AUDIT generator freshness (the drift re-run)

- **IMPLEMENT**: regenerate every artifact a page renders and prove the tree unchanged:
  `node agent-layer/gen-loc-summary.mjs && node agent-layer/gen-param-count.mjs &&
  node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs &&
  node agent-layer/gen-system-graph.mjs && node agent-layer/gen-replay.mjs && git diff --stat`.
- **GOTCHA**: run from the clean branch; `gen-loc` reads git-tracked content, so run it before
  staging anything (memory: *loc-summary counts tracked only*).
- **VALIDATE**: `git diff --stat` empty (or the diff is itself a finding — commit the regen and
  name the page that was stale).
- **SATISFIES**: AC #3.

### AUDIT param-manifest coverage of the studio's controls

- **IMPLEMENT**: walk the #204–#221 control surface against `system/param-manifest.json`'s
  `/factory` + `/components` entries: canvas verbs/handles, zoom row, replay transport, keep rail,
  method cards, Hook loop, flow nav, marquee/context menu, layers list, minimap, device-frame
  handles, docs panel triggers, catalog playground controls. CI drift-checks the *arithmetic*, not
  the *coverage* — an omitted control is exactly the "review-catchable gap" this audit exists for.
- **PATTERN**: `system/param-manifest.json:67–71` (one entry per control; counting rules in
  `$description`).
- **VALIDATE**: if entries added — `node agent-layer/gen-param-count.mjs && git diff` shows only
  the expected count bump; approach baselines regen in the same PR **only if** the rendered total
  changed (memory: *VR baseline trap*).
- **SATISFIES**: AC #3.

### AUDIT the honesty contract end to end

- **IMPLEMENT**: walk each surface and check the label is present, true, and unweakened:
  (1) fictional-scenario labels on both protos, /factory, instance demo; (2) "real run, curated"
  on the trace player and every trace-backed exhibit; (3) the replay chrome: run's real meta,
  trace link, the **projection** label (never "recording"), the stated pacing compression, the
  provenance flip on take-over and on a method-card redraft (`DRAFTED`); (4) exported artifacts
  state the run's-work-vs-visitor's-edits split; (5) capability chips (`factory.html` ×5,
  `work.html` ×2, `index.html`) each state exactly what runs vs what is plan-gated — including
  that nothing anywhere claims analytics is *recording* (the beacon is dark until launch).
- **PATTERN**: `docs/epics/prototype-studio.architecture.md` §Boundaries & contracts is the
  checklist; `replay/README.md` is the projection rule's source text.
- **VALIDATE**: findings table in the findings doc, one row per surface, verdict each; fixes as
  copy diffs.
- **SATISFIES**: AC #4.

### AUDIT for copy contradicting the cuts record

- **IMPLEMENT**: the three pre-agreed cut candidates all **shipped** (#220 ten components, #221
  layers + minimap, #222 instance re-shell) — so the sweep runs both directions: no copy hedging
  as if they were cut ("the count stated honestly either way" phrasing may survive somewhere), and
  no copy claiming anything that was actually deferred (#264, #268 — the frames caption must still
  say a dropped brand does not reach them — #273, #237's declined behaviour).
- **VALIDATE**: `grep -rn "layers\|minimap\|twenty\|ten new" *.html` triaged; findings-doc rows.
- **SATISFIES**: AC #5 (copy half).

### UPDATE shipped pages with the fixes + baseline cascade

- **IMPLEMENT**: apply Phase A's copy fixes. If any at-rest copy on a VR-gated page changed:
  `cd tooling/visual-regression && npm run update:docker` from a clean worktree under `/Users`,
  same PR.
- **GOTCHA**: never judge baseline churn by height; a same-height reorder still churns ~38k pixels.
- **VALIDATE**: `node tooling/build-checks.mjs` (all groups green); VR run green locally in Docker.
- **SATISFIES**: AC #3, #4, #5.

### CREATE `tooling/live-metric-audit.mjs`

- **IMPLEMENT**: operator-run script (header cites #223 + this plan) that verifies, against a live
  `BASE` (default `https://factory-ux.pages.dev`, overridable for local rehearsal), that each
  win-metric route fires **once, from its success path, with its static literal, and restores the
  real URL**. Mechanism: `context.addInitScript` wraps `history.pushState`/`replaceState` into a
  recorded log *before any module evaluates*; then one page-flow per engine (chromium is enough —
  this is a wiring check, not an engine check):
  1. open `/factory`, wait for `[data-replay="playing"]`-equivalent (crib the exact handle from
     `studio-journey`'s replay pass), perform one canvas interaction → assert exactly one push of
     `/factory/took-over`, then a restore; interact again → no second push;
  2. wait for settle, drive the keep rail's export → Playwright `download` event, then exactly one
     `/factory/exported`; click again → download yes, push no;
  3. copy the share link → exactly one `/factory/link-copied`, and the address bar holds `?b=`
     *before* the flip (the caller contract in `analytics.mjs:300–304`);
  4. assert the full push log contains only these three paths (plus any documented arrival push)
     and every push was restored within the run.
  Print each assertion; exit non-zero on any failure. State in the header: the beacon is
  token-gated and dark, so this fires nothing into CF WA; at launch, re-run this script and then
  confirm the three paths appear in the CF WA dashboard — that is the end-to-end half.
- **PATTERN**: Playwright resolution + `BASE` guard from `tooling/studio-journey.mjs:32–47`;
  selectors and waits from its take-over and keep passes; the push-log idiom from
  `tooling/vt-verify.mjs`.
- **GOTCHA**: (a) never assert on `location` after an action — the 50 ms restore races you; use
  the log. (b) The tree-identity guard must check the *live host serves the studio*
  (`fetch(BASE + "/system/studio-keep.mjs")` 200) and fail loud with "the live deploy is stale —
  deploy first" — that is today's actual state and the script's first useful output. (c) The
  export needs the settled board; take-over needs mid-replay — order the flow take-over-last on a
  *second* page load, or crib studio-journey's fresh-page discipline per case.
- **VALIDATE**: rehearse against local first:
  `node tooling/visual-regression/serve.mjs & BASE=http://127.0.0.1:4757 node tooling/live-metric-audit.mjs`
  — all assertions green; then the stale-live guard fires correctly against the un-redeployed
  pages.dev.
- **SATISFIES**: AC #2.

### DEPLOY current main to factory-ux.pages.dev  ⚠ owner OK

- **IMPLEMENT**: after Phase A's PR merges and CI is green on main: from a clean main checkout,
  `npx wrangler pages deploy . --project-name factory-ux --branch main`. Confirm with the owner
  before running — outward-facing.
- **VALIDATE**: `curl -sI https://factory-ux.pages.dev/system/studio-keep.mjs` → 200;
  `curl -sI https://factory-ux.pages.dev/` still carries `x-robots-tag: noindex` + the security
  headers.
- **SATISFIES**: AC #2 (and gives Phase C a current live site).

### RUN the live metric audit

- **IMPLEMENT**: `node tooling/live-metric-audit.mjs` (default BASE). Paste the printed assertion
  log into the findings doc's `## Metric audit` section.
- **VALIDATE**: script exits 0; log recorded.
- **SATISFIES**: AC #2.

### CREATE `docs/hallway-notes/TEMPLATE-studio.md` + round dir + runbook section

- **IMPLEMENT**: the round-3 session script, mirroring `TEMPLATE.md`'s fixed shape and discipline
  (metadata table, silence rule, verbatim-only, anonymous labels). Two timed parts:
  **Part 1 (90 s, unchanged from v3):** "Have a look at this site.", start on Home, silence; the
  two questions afterwards ("What does this person do?" / "Is this senior work?") — keeps round 3
  comparable with the never-run v3 rounds and tests #216's compressed gate.
  **Part 2 (5 min, the studio):** one neutral line — "Have a look at the Studio page." (or they
  are already there; do not say what it does) — then silence. The observation log gains three
  structured columns the WRONG-ifs need: **grabbed the wheel?** (any canvas interaction while or
  after the replay — the take-over WRONG-if, observed directly), **reached the keep rail?**
  (export/share touched), **stalls** (verbatim). Two closing questions: "What just happened on
  that page?" and "What would you do next here, if anything?" Findings table maps each observation
  to confused-about-what.
  `round-3-studio/README.md`: four lines — fresh testers only (nobody from any prior round-1/2
  booking), script = the studio template, findings filed in `findings.md`, biggest confusion fixed
  before the epic closes (this round differs from round 2's defer-only rule — say so).
  `docs/hallway-runbook.md`: append a short "## Round 3 — the studio" section: same recruitment
  bar, session ≈ 10 min, live site as the default start, the two-part shape.
- **PATTERN**: `docs/hallway-notes/TEMPLATE.md` (whole file); `round-2/README.md`'s brevity.
- **GOTCHA**: never ask "did you notice you can take over?" — the WRONG-if is precisely whether
  they do it *unprompted*. The prompt names the page, never the capability.
- **VALIDATE**: a dry-run session against yourself-as-pilot (not counted as a tester) confirms the
  template is fillable in real time.
- **SATISFIES**: AC #1 (script half); settles the PRD's open question "hallway-test recruitment
  and script".

### RUN 3–5 sessions (operator) and WRITE `findings.md`

- **IMPLEMENT**: owner books 3–5 cold testers (starts day one — the calendar is the critical
  path); sessions run per the runbook against the live site; one `tester-0N.md` each. Then
  `findings.md`: per-tester outcome rows, confusions ranked by (testers affected × blocked-what),
  the WRONG-if verdict stated plainly ("N of M grabbed the wheel unprompted"), and the fix/defer
  decision for the top confusion.
- **GOTCHA**: testers are spent after one session — do not rehearse on a potential tester; pilot
  on yourself only.
- **VALIDATE**: 3–5 filled tester files committed; findings doc names the biggest confusion and
  its decision.
- **SATISFIES**: AC #1.

### FIX the biggest confusion — or DEFER with a ticket

- **IMPLEMENT**: decision rule, recorded in the findings doc either way:
  fix now **iff** the fix (a) fits in roughly two days, (b) contradicts no recorded decision in
  the epic docs (else stop and flag, per CLAUDE.md), and (c) needs no new instrumentation.
  Otherwise: `gh issue create` with the finding verbatim + a `Part of epic #202` line, and the
  findings doc records the explicit deferral. If fixed: it is a normal change — gates, baselines
  cascade, same PR or a stacked one.
- **VALIDATE**: either the fix's own gates green + a re-check with one fresh pilot if feasible, or
  the ticket URL in the findings doc.
- **SATISFIES**: AC #1 ("fixed or explicitly deferred with a ticket").

### CREATE the cuts record on #202 (comment)

- **IMPLEMENT**: `gh issue comment 202` — one honest list:
  the three pre-agreed cut candidates were **not cut** (shipped: #220 PR #269, #221 PR #272, #222
  PR #270); actually declined/deferred: #237 (`NOT_PLANNED`, reasoned), #264 (open — phantom
  gesture on redraft), #268 (open — dropped brand does not reach the frames; recorded decision at
  #219, caption states it), #273 (open — minimap a11y advisory), #217's real-Safari/real-Chrome
  manual pass (carried forward), #207's `.stx-viewport` follow-up, #222's derived-pack-import
  follow-up note, plus anything Phase A/C surfaced. One line each.
- **VALIDATE**: comment posted; every line links a ticket or a report.
- **SATISFIES**: AC #5.

### UPDATE `docs/epics/prototype-studio.prd.md` + `.architecture.md` with closing notes

- **IMPLEMENT**: dated `## Closing note (2026-08-…)` at the PRD's end: what shipped (#203–#222,
  one line per wave), then the six success-metric rows settled one by one —
  **Keep/share** + **Take-over**: instrumented and verified firing live (this ticket); *recording*
  launch-gated (beacon dark by design) — the 4-week RIGHT/WRONG clock starts at launch, honestly
  not yet judged; **Responsiveness**: settled by #213's INP gate (≤200 ms per interaction per
  engine, printed per run); **Accessibility**: settled by the journey drivers + #229/#230
  (keyboard path per verb, SC 2.5.7 driven); **Docs depth**: settled by CI drift checks + groups
  18/21/23 (twenty components, full depth, generated); **Hallway**: round-3 result verbatim +
  what was fixed/deferred. Then the cuts list (same content as the #202 comment) and what carries
  forward. Architecture doc: a short dated outcome note in its amendments/outcome style — what the
  boundaries survived, the one deploy-state gap this ticket found (live site had been stale), and
  the launch checklist pointer (fill both `analytics.mjs` constants; re-run
  `tooling/live-metric-audit.mjs`; then CF WA dashboard check).
- **PATTERN**: `docs/epics/portfolio-v3-experience.prd.md` §Amendments (dated, append-only).
- **VALIDATE**: both docs render (plain markdown); no metric row left unsettled or oversold.
- **SATISFIES**: AC #6.

### CREATE the PR + close out

- **IMPLEMENT**: PR body carries `Closes #223`; plan, report and review artifacts in the same PR
  (`.claude/plans/studio-epic-close-223.md`, `.claude/reports/…`, `.claude/code-reviews/…`).
  Closing epic #202 itself: propose it to the owner once #223 merges (their verdict, memory says
  they want to re-judge after #214–#223).
- **VALIDATE**: `gh pr view --json body | grep "Closes #223"`.
- **SATISFIES**: all ACs' bookkeeping.

---

## TESTING STRATEGY

No test suite exists (CLAUDE.md): "done" = run the surface touched.

### Unit-level

`node tooling/build-checks.mjs` — all groups stay green through every copy fix and any
param-manifest edit (group 10 is the routes' CI half; the drift groups are the count audit's).

### Integration-level

- `tooling/live-metric-audit.mjs` rehearsed against the local tree (BASE override), then run live.
- If any copy fix touches /factory or /components at rest: the VR gate (Docker) + the relevant
  journey pass (`node tooling/studio-journey.mjs chromium` or `tooling/catalog-journey.mjs`).

### Edge Cases

- Live script vs stale deploy: the guard must fail loud, not pass vacuously (today's live state is
  the test — run it once *before* deploying).
- Fire-once: every route asserted non-refiring on a second action, not just firing on the first.
- Export-fails path: an export that cannot assemble must NOT fire `/factory/exported`
  (`analytics.mjs:315–318`) — if cheap to drive live (offline route block), assert it; otherwise
  rely on group 10 + studio-journey and say so in the log.
- Hallway pilot: one self-run pilot session to prove the template fillable — never spending a real
  tester on a broken script.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

`node --check tooling/live-metric-audit.mjs`

### Level 2: Pure gates

`node tooling/build-checks.mjs`

### Level 3: Drift / count audit

`node agent-layer/gen-loc-summary.mjs && node agent-layer/gen-param-count.mjs && node agent-layer/gen-handoff.mjs && node agent-layer/gen-vocabulary.mjs && node agent-layer/gen-system-graph.mjs && node agent-layer/gen-replay.mjs && git diff --stat` → empty

### Level 4: Live + manual

- `curl -sI https://factory-ux.pages.dev/system/studio-keep.mjs` → 200 (post-deploy)
- `node tooling/live-metric-audit.mjs` → exit 0, log pasted into findings doc
- 3–5 tester files + `findings.md` committed; biggest confusion fixed or ticketed

### Level 5: Conditional

- `cd tooling/visual-regression && npm run update:docker` — only if at-rest copy changed
- `node tooling/studio-journey.mjs all` — only if the confusion fix touches the studio

---

## ACCEPTANCE CRITERIA

- [ ] AC1 — 3–5 hallway sessions run and recorded (notes files); findings written up; biggest
      confusion fixed or explicitly deferred with a ticket.
- [ ] AC2 — each of `/factory/took-over`, `/factory/exported`, `/factory/link-copied` verified
      firing once, from its success path, on the live site (script log as evidence).
- [ ] AC3 — every stated number on every shipped page traced to a generated artifact — the triage
      table proves "checked, not assumed".
- [ ] AC4 — honesty contract audited end to end (fictional labels · "real run, curated" · the
      projection label · capability chips accurate, including analytics-recording = launch-gated).
- [ ] AC5 — cuts recorded on #202; contradicting copy removed.
- [ ] AC6 — closing notes in both epic docs: shipped, cut, carried forward, metrics settled row
      by row.
- [ ] All gates green; no regressions; PR carries `Closes #223`.

---

## COMPLETION CHECKLIST

- [ ] Branch cut from origin/main, not the shared tree's parallel-session state
- [ ] Desk audits recorded (not just "done") in findings.md
- [ ] Deploy confirmed with owner before running; post-deploy curls green
- [ ] Live script rehearsed locally before the live run
- [ ] Tester files anonymous; no real names/employers anywhere
- [ ] Every generated-file conflict resolved by regeneration, never hand-edit
- [ ] VR baselines regenerated iff at-rest copy changed, same PR
- [ ] Plan + report + review committed in the PR

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (owner)** — Is this launch? Assumption: **no** — `BEACON_TOKEN`/`PRODUCTION_HOST` stay
  empty; the closing note states recording is launch-gated and the RIGHT/WRONG 4-week clock has
  not started. If the owner says launch: filling both constants + choosing the canonical host
  (pages.dev vs a domain) + the preview-traffic question from PR #22's review all enter scope.
- **Q2 (owner)** — Recruitment: 3–5 cold testers are the owner's to book, and the only
  non-compressible dependency. Assumption: booked within the ticket's life; if not, everything
  else lands and AC1 is the one explicitly-waiting item (never silently skipped — #177's ghost).
- **Q3 (owner)** — Deploy OK for factory-ux.pages.dev at Phase B. Assumption: yes (the site is
  already public-but-noindex and the ticket requires live verification).
- **A4** — Round 3 keeps Part 1 identical to the v3 script so the two never-run rounds' framing
  isn't wasted and Home's compressed gate (#216) gets its first cold read. If the owner prefers a
  studio-only session, Part 1 drops without affecting AC1.
- **A5** — "Recorded" = the notes files (repo-public, anonymous), per the existing runbook — not
  audio/video.

## NOTES (open canvas)

**Why a committed script and not a scratchpad one-off:** the live metric audit re-runs at launch —
the day the token lands, the same script is the end-to-end proof's first half (fire live) and the
CF WA dashboard is the second (recorded). A scratchpad script would be rewritten from scratch that
day, worse.

**Why the live check can't be the dashboard today:** CF WA has no custom events; the beacon is the
only reporter and it is fail-closed dark (`BEACON_TOKEN === ""`). The observable truth on the live
site is the history flip — which is also precisely the mechanism the beacon would consume. Wiring
verified live + beacon behaviour verified in group 10 (both constants filled, import-time) is the
honest maximum before launch.

**The stale-deploy find is itself a closing-note item:** every VR baseline, journey run and gate
this epic passed ran against local trees; the public URL served the pre-studio site the whole
time. Not a defect in any gate — deploy is deliberately a human step — but the epic's claims were
unverifiable live until Phase B, and the closing note should say the epic-close is what caught it.

**Rejected: running studio-journey with BASE pointed at the live site** — its route fixtures,
request-log scoping and tree-identity guard all assume the local tree; a live run would need
surgery and would still re-prove things group 10 already owns. The focused script does one job.

**Sequencing risk:** Phase D (the confusion fix) can invalidate Phase A's audit state if it edits
copy — re-run the Level 3 drift block after any Phase D fix. If Phase D churns baselines, that regen
rides Phase D's PR, not Phase A's.

**Owner context (memory):** 2026-08-10 verdict — "/factory feels random", snap-back reads broken,
wants product-grade look; re-judge after #214–#223. The hallway findings doc should explicitly
check whether the owner's own three complaints reproduce with cold testers — free triangulation,
and it de-personalises the re-judgement.

## AMENDMENTS

<!-- append-only after first approval; newest at the bottom -->
