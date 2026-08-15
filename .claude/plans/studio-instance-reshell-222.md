# Feature: Per-company instances re-shell onto the studio (#222 — Studio 20, #86 lands here)

The following plan should be complete, but it is important that you validate documentation and
codebase patterns and task sanity before you start implementing. Pay special attention to naming of
existing utils and exports — import from the right files.

## Feature Description

A real application's unlisted deploy stops being the old Factory-station variant (honesty notices +
curated intake + embedded trace + a `renderStudy` composition slot) and becomes a **studio
pre-seeded with that company's derived pack and a bespoke recorded run**. `instance.html` re-shells
around the same studio modules `/factory` mounts — configured, never forked — `build-instance.mjs`
learns to copy a recorded replay run into the deploy dir, the deployed chrome finally stops 404ing
(#160 was deliberately left for this ticket), and `agentic-ui-study.html` retires because its second
mount (`instance.mjs`'s prototype slot) dies here.

## User Story

As a hiring manager receiving a private instance link
I want to watch a real recorded agent run assemble a product for MY company's problem, under MY
brand, and then take the wheel myself
So that I experience "brief in, product out, by a real method" instead of reading claims about it.

## Problem Statement

The current instance shell presents epic #86's bespoke prototype as a static-feeling composed view
(`renderStudy`), while the public site now has a full studio (replay + take-over + compile + method
+ export). The instance — the highest-stakes surface, sent to a specific employer — is the *weakest*
presentation of the capability. Additionally the deployed instance's chrome links 404 (#160, never
fixed), and `agentic-ui-study.html` is a retired-in-spirit page kept alive only by the instance's
shared mount.

## Solution Statement

Re-shell `instance.html`'s `#beat-built` band around the studio shell DOM (canvas + replay chrome +
method band + inspector + keep rail), booted by `instance.mjs` through a new configured-never-forked
seam: `mountStudio(root, opts)` with a `data-studio-mount="external"` stand-down (the
`factory-intake.mjs` `data-intake="external"` precedent), where `opts.replay = {artifact, trace}`
is the only real parameter — everything else is configured by DOM omission (no
`[data-studio-frames]` attribute → no frames; only the wanted inspector panels present → only they
wire). Record ONE real bespoke run for the demo scenario (northwind) through #203's recorder.
`build-instance.mjs` gains `--replay <slug>` (copy-not-run, like `--trace`), always copies the docs
artifacts the studio fetches, generates a minimal per-instance chrome config (closing #160), and
retires `--compositions`/`--proto`. `agentic-ui-study.html` + `system/agentic-study.mjs` are
deleted with their full blast radius.

## Out of Scope / Non-Goals

- **Not deploying any real company instance** — deploy stays the operator's explicit step; this
  ticket ships the demo (northwind) shell + the build chain. Instance migration timing is the
  epic's open question, not this ticket's.
- **Not implementing `--public-origin`** — it keeps throwing its designed "not implemented" error
  (`build-instance.mjs:317-321`). The instance chrome's external links are limited to mailto/GitHub.
- **Not touching** `/factory`'s behavior: factory.html's studio mount must stay byte-identically
  configured (defaults). `studio-journey`/`build-checks` groups 13/16 keep passing unedited (that
  IS the proof the seam is a seam).
- **Not deleting** `proto/compositions/northwind/` or the fieldwork composition artifacts — they
  are committed real-run records (honesty contract); they become unreferenced by any page, which
  is fine. Same for `scenarios/fieldwork/rubric.json` (data true-up only, no deletion).
- **Not adding** layers list / minimap (#221, pre-agreed cut) or hallway-test work (#223).
- **No new pack-boot/dock allowlist entries** — the instance keeps pinning its pack via the stamped
  head link + `instance-pack.mjs`'s two-option session control (recorded #81 decision, unchanged).

## Feature Metadata

**Feature Type**: Enhancement (re-shell) + Refactor (retirement)
**Estimated Complexity**: High (~800–1000 lines net per ticket estimate; one paid agent run)
**Primary Systems Affected**: `instance.html` · `system/instance.mjs` · `system/studio.mjs` ·
`system/replay-driver.mjs` · `agent-layer/build-instance.mjs` · `replay/` + `traces/` (new run) ·
retirement surface (`agentic-ui-study.html`, `system/agentic-study.mjs`, factory/work/index refs,
`tooling/vt-verify.mjs`) · gates (`tooling/build-checks.mjs` new group, new
`tooling/instance-journey.mjs`)
**Dependencies**: `@anthropic-ai/claude-agent-sdk` (portal only, already present; Mac CLI login
auth per `local-agent-visual-gate-notes` memory). No new dependencies.

## Related Work

**Implements**: [#222](https://github.com/linardsb/ux-factory/issues/222) · **Epic**: #202 —
`docs/epics/prototype-studio.prd.md` §9 + `docs/epics/prototype-studio.architecture.md` (§Other
eng-lead calls → Route surgery; §Data model → replay artifact). PR body must carry `Closes #222`.

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/per-company-build-unlisted-deploy.md` (#44) — the stamping contract (Mechanism
  A/B) this extends; its report records the `data-when="real"` regex `\b` bug.
- `.claude/reports/v3-private-instance-spine-report.md` (#81) — the shell's current spine
  chaptering; the reason "six demo sites" is stale (currently 4 demo + 3 real regions).
- `.claude/plans/private-instance-shell.md` (#43) — the shell's original section contract.
- Epic #86 (closed) — the bespoke-prototype vision; its #89 composition slot is what this replaces.
- Spike 1 verdict (epic #202 comment) — the recorder mechanics, cost (~$0.40/run), and the
  positive-framing prompt lesson for any re-run.

**Forward-references**: #223 (epic close) audits the copy/counts this ticket changes. The
`ticket-44-shell-stamp-seams` and `epic-38-slices-hands-off` memories need true-ups after landing.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `agent-layer/build-instance.mjs` (all 454 lines) — Why: the orchestrator being extended.
  Anatomy: CLI at :421-454; `stampShell` :100-175 (Mechanism A anchored rewrites :124-157 — pack
  link, title, meta description, `#instance-name`, `INSTANCE_CONFIG:start/end` block; Mechanism B
  :159-172 — `data-when="demo"` deletion, `data-when="real"` un-hide **without a trailing `\b`**
  (:167 — the recorded regex bug), `{{name}}` substitution); `validateAssembly` :194-309 (chrome
  links deliberately excluded at :242 — that exclusion is REMOVED by this ticket); `_headers`
  template :64-91; wholesale `system/` copy :359; compositions copy :367-400; discard-on-failure
  :346-351,415-418; wrangler print :441-449.
- `instance.html` (741 lines) — Why: the shell being re-shelled. Head :52-62 (no pack-boot, no
  dock — deliberate, keep it that way); sections: `#instance-hero` :393, `#labeling` :422,
  `#beat-brief` :438 (wizard at :461 with `data-intake="external"`), `#instance-appearance` :519
  (`#instance-pack-control` :531), **`#beat-built` :542-609 (the band the studio replaces —
  `#instance-prototype` :559, capability chip :567, claim :568, note :586, `#ethics-gate` :603)**,
  `#beat-keep` :612 (`#instance-links` :633), `#verify` :643 (`#instance-player` :673);
  `INSTANCE_CONFIG` block :709-727; scripts :729-739. The byte-twin `study-*` CSS block (~:284-338,
  ported from agentic-ui-study.html per its own comment at :333) dies with the re-shell.
- `system/instance.mjs` (463 lines) — Why: the module being rewritten. Four independent fetch
  chains (`init()` :397-461); `renderNotices` :120-127; `renderCuratedIntake` :142-148;
  `mountWizard` :166-193 (the `initIntake(config)` call — untouched); **`renderPrototype`
  :338-394 (dies — the `renderStudy` mount, `unclaim()` :354-362)**; `renderLinks` :199-234;
  deliberate non-imports header :32-41 (extend it: why dock/pack-boot still stay out).
- `system/studio.mjs` — Why: the orchestrator gaining the seam. `mountStudio(root = document)`
  exported at :752 (read its whole comment — the glossary/finally ordering is load-bearing);
  self-boot at :813 (`if (typeof document !== "undefined") mountStudio(document)`);
  `mountStudioCore` :404-692 (mount order; `mountReplay` call at :589); `restoreShared` :716-750;
  `adoptBoard` :624-653; `mountPanel` :194-245 (per-panel fetches: agents → `/traces/demo-notice.jsonl`,
  shape → `/system/system-graph.json`); `wireInspector` :336-365 (wires whatever `.stu-tab`s exist).
- `system/replay-driver.mjs` — Why: the hard-coded source becoming a parameter.
  `REPLAY_SLUG`/`ARTIFACT_URL`/`TRACE_URL` :75-77; `mountReplay(canvas, {shell, renderPlace, bus,
  onSettle, onTakeOver, declined})` :413; fetches at :792 (artifact) and :806 (trace — tolerated
  missing, "traceless" mode); `destroy()` :975-997; the `finally`-set `[data-replay]` :1006-1012.
- `factory.html` — Why: the studio DOM being mirrored (never forked — the DOM structure is copied,
  the logic imported). Styles :46-55 (portfolio.css → **studio.css → catalog.css**); studio shell
  body region :96-544 (`.stu-shell[data-studio]`, `#canvas[data-studio-canvas][data-studio-frames]`,
  `[data-replay-chrome]`, `[data-studio-notice]`, `#method[data-studio-method]`, inspector `aside`
  with 5 panels, `#keep[data-studio-keep]`); the "Go deeper" study link :501-508 (removed);
  scripts :524-543.
- `system/factory-intake.mjs` :225-240 + :711 — Why: THE seam precedent. `initIntake(config)` with
  defaults byte-identical for the bare caller; auto-init stands down on
  `#factory-wizard[data-intake="external"]`. `mountStudio`'s external stand-down mirrors this.
- `system/studio-frames.mjs` :220-221 — Why: proof frames are DOM-gated
  (`root.querySelector("[data-studio-frames]")`, null-safe) — the instance omits the attribute.
- `system/studio-keep.mjs` :89 — Why: `PACK_LINK_RE = /\/tokens\.[a-z0-9-]+\.css$/` already matches
  ANY pack name — the export honestly wears the company pack with zero changes.
- `system/studio-compile.mjs` :208,339 (`VOCAB_URL = "/handoff/verdant/vocabulary.json"`) and
  `system/studio-docs.mjs` :95-99 (`DOCS_SOURCES`: `/handoff/verdant/pack.json` + vocabulary +
  `/system/system-graph.json`) — Why: these stay hard-coded; the deploy dir satisfies them by
  copying the files to the same paths.
- `portal/record-build.mjs` — Why: the recorder for the bespoke run. CLI :384-393; slug regex :278;
  brief must pre-exist at `replay/briefs/<slug>.md` :283-286; outputs :320-324,364-377; `--force`
  semantics :325-334. Do NOT edit it — a weak run is fixed by prompt-tightening only, and the
  current prompt needed no tightening for the fieldwork run.
- `agent-layer/gen-replay.mjs` — Why: discovery is repo-anchored (`ROOT` from `import.meta.url`
  :33) and bidirectional :165-195; reproduce check :132-139. The northwind run is committed, so CI's
  drift check covers it automatically.
- `agentic-ui-study.html` (256 lines) — Why: read before deleting; its inline module (:148-254) is
  the only consumer of `scenarios/fieldwork/rubric.json`.
- `tooling/vt-verify.mjs` :101-153 — Why: the `SITEWIDE` array holds two study rows (:135-146) to
  remove.
- `tooling/proto-journey.mjs` (header + main-frame scoping + expected-noise filter) and
  `tooling/studio-journey.mjs` `framesPass` (request-log scoping) — Why: the idioms
  `tooling/instance-journey.mjs` mirrors (serve, engines loop, request 404 log, readiness waits).
- `replay/README.md` — Why: the three-file rule + `source` shape (:36-60) the copied run obeys.
- `system/client.neutral.config.js` :54-80 + `system/site.js` :14-19,98-148 — Why: the chrome
  injection the generated instance config feeds.
- `.claude/reports/per-company-build-unlisted-deploy-report.md` — Why: the recorded stamping
  gotchas (regex `\b` bug, `#instance-name` anchor, view-source leak scrubbing).

### New Files to Create

- `replay/briefs/build-northwind-restock.md` — human-authored brief for the bespoke demo run
  (problem, never the answer; draft text in NOTES below — owner may edit before recording).
- `traces/build-northwind-restock.raw.jsonl` + `traces/build-northwind-restock.jsonl` +
  `replay/build-northwind-restock.board.json` — REAL RUN OUTPUTS (recorder-written, never
  hand-written) and `replay/build-northwind-restock.json` (gen-replay-written).
- `tooling/instance-journey.mjs` — the built-instance driver (serve a fixture deploy dir, assert
  settled replay / pack / residue / zero 404s, ×3 engines, operator-run).
- `tooling/fixtures/instance-brief.md` — the fictional fixture brief the journey builds with
  (VERIFIED: no reusable non-Northwind fixture exists in-repo; format = `parseCompanyBrief`'s
  JSON-head markdown, clone `scenarios/northwind/brief.md`'s shape, `fictional: true`, name
  "Harborlight").
- `system/client.instance.config.js` is **generated into the deploy dir** by build-instance, not a
  repo file — unless implementation finds it cleaner as a committed template stamped per-build;
  either is acceptable, record the choice.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/prototype-studio.architecture.md` §Route surgery (:126-133) — the retirement
  decision; §Boundaries (:111-123) — honesty surfaces extended to the replay; §Data model (:76-96).
- `docs/epics/prototype-studio.prd.md` §9 (in epic #202 body) — the one-line scope this implements.
- `replay/README.md` — projection-not-recording rule.
- `scenarios/README.md` — package format (`genCompanyPackage`'s input contract).
- CLAUDE.md §Ground rules (honesty contract; git/PR rules) and §Where new code goes (new replay
  run procedure — followed verbatim for the northwind run).

### Patterns to Follow

**The configured-never-forked seam** (`factory-intake.mjs:711` + `instance.html:461`):
```js
// factory-intake.mjs — auto-init stands down when the page claims external mounting:
// instance.html:461  <div id="factory-wizard" data-intake="external">
```
`studio.mjs`'s self-boot gets the same shape:
```js
// studio.mjs:813 becomes:
if (typeof document !== "undefined"
    && !document.querySelector('[data-studio][data-studio-mount="external"]')) {
  mountStudio(document);
}
```

**Default-preserving parameterization** (the `initIntake` rule — defaults byte-identical for the
bare caller):
```js
// replay-driver.mjs — the constants stay exported; the parameter defaults to them:
export function mountReplay(canvas, { shell, renderPlace, bus, onSettle, onTakeOver, declined,
  source } = {}) {
  const artifactUrl = source?.artifact || ARTIFACT_URL;
  const traceUrl    = source?.trace    || TRACE_URL;
```

**Copy-not-run** (`build-instance.mjs:362-364` `--trace` copy; :367-400 compositions copy): the
`--replay` copy resolves the slug against the REPO's `replay/` + `traces/`, copies files, and
validates what it copied (parse + `source`-path consistency) — it never runs the recorder or
generator.

**Refusals are content, never throws** (catalog.mjs / replay-driver discipline): a missing replay
artifact on the built page degrades to the driver's `unavailable` state — but `build-instance`
throws at build time if the files are absent, so that state is unreachable on a correctly built
instance.

**The check must be able to fail** (`check-that-cannot-fail` memory): every new gate below names
its mutation.

**Error style**: plain `Error` naming the offending path; `validateAssembly`'s aggregate-then-throw
shape for new checks.

**Headers**: every touched entry-point file's header comment updates to cite this ticket
(`epic #202 ticket #222`).

---

## IMPLEMENTATION PLAN

### Phase 1: The seams (studio configurable, factory byte-identical in behavior)

**Independent of:** Phase 2 — the two can run in parallel.

- `replay-driver.mjs` gains `source` (above). Thread it through BOTH `mountReplay` call paths in
  `studio.mjs` (`mountStudioCore` :589 and the `declined` mount on the `restoreShared` path).
- `studio.mjs`: `mountStudio(root = document, opts = {})`, opts threaded to `mountStudioCore`;
  self-boot stand-down on `[data-studio-mount="external"]`.
- Verify by running the untouched gates: groups 13/16 in `build-checks`, plus one chromium
  `studio-journey` pass — all unedited.

### Phase 2: The bespoke demo run (real recorded run, northwind)

**Independent of:** Phase 1.

- Author the brief, `--dry` run, real run, `gen-replay`, `validate-trace`. Commit all outputs
  (fictional scenario, standard labels). Budget ~$0.85 total (dry + real, per spike 1's measured
  costs). If the run is weak (bar: board ≥3 places ≥1 connection, 0 null-phase steps, reasonable
  reading of the brief — spike 1's bars), fix by tightening the brief or prompt framing and
  re-run with `--force`; never edit outputs.

### Phase 3: The re-shell (instance.html + instance.mjs)

**Depends on:** Phase 1 (the seam) and Phase 2 (the artifact the demo config names).

- `instance.html`: head gains `/system/studio.css` + `/system/catalog.css`; `#beat-built`'s
  interior is rebuilt around the studio shell DOM mirrored from factory.html (shell carries
  `data-studio-mount="external"`; canvas WITHOUT `[data-studio-frames]`; inspector with only
  `this-build` + `shape` + `component-docs` panels; method band; keep rail); the study-twin CSS
  block dies; every prose site re-derived with `data-when` seams; `INSTANCE_CONFIG` v2 (`replay`
  key in, `composition` key out).
- `system/instance.mjs`: `renderPrototype` + the `agentic-study` import die; a new `mountStudioBand`
  imports `mountStudio` from `./studio.mjs` and calls it with
  `{ replay: INSTANCE_CONFIG.replay }`; everything else (notices, intake, wizard, trace, links)
  stays.

### Phase 4: build-instance.mjs v2

**Depends on:** Phase 3 (stamps the new shell; config v2).

- `--replay <slug>` (required), copy set extension (pack.json + vocabulary.json always; the run's
  five files), generated instance chrome config (closes #160), `--compositions`/`--proto`
  retirement, `validateAssembly` v2 (chrome hrefs resolve; replay consistency; config v2 shape).

### Phase 5: Retirement sweep

**Depends on:** Phase 3 (instance.mjs's import must die before the module can).

- Delete `agentic-ui-study.html` + `system/agentic-study.mjs`; remove every reference (factory.html
  Go-deeper row, work.html Exhibit 02 + renumber, index.html stale comment, vt-verify's two rows,
  scenarios/README + rubric.json prose true-ups, param-manifest `$description` scope sentence,
  CLAUDE.md map entries).

### Phase 6: Gates

**Depends on:** Phases 3-5.

- New `build-checks` group (stampShell + chrome-href predicate driven pure, with mutations).
- New `tooling/instance-journey.mjs` (build a fixture instance → serve → assert, ×3 engines).
- Run everything: build-checks, gen-replay ✓, validate-trace, journeys.

### Phase 7: Cascades + docs

**Depends on:** everything above (baselines capture the final tree).

- `gen-loc-summary` + `gen-param-count` regens; VR baselines for factory ×2, work ×2, approach ×2
  (clean detached worktree under `/Users`, `update:docker`); CLAUDE.md rewrite of the four map
  entries; report; memory true-ups.

---

## STEP-BY-STEP TASKS

IMPORTANT: execute in order. The branch: `git checkout -b feature/instance-reshell-studio-222
origin/main` — **NOT from the local `main` (stale) and not from the current
`feature/catalog-ten-components-220`**. ⚠️ The shared worktree currently holds four staged,
uncommitted files from a parallel session (`system/catalog.mjs`, `system/studio-canvas.mjs`,
`tooling/studio-journey.mjs`, a #219 report). Do not commit or revert them; stage your own changes
by explicit path only (`shared-worktree-parallel-sessions` memory), and if they are still present
at branch time, prefer a fresh worktree (`git worktree add`) off `origin/main`.

### Task 1 — UPDATE `system/replay-driver.mjs`: the `source` parameter

- **IMPLEMENT**: add `source` to `mountReplay`'s options (:413); resolve
  `const artifactUrl = source?.artifact || ARTIFACT_URL; const traceUrl = source?.trace || TRACE_URL;`
  near the top of the mount and re-point ALL SEVEN constant-use sites (verified exhaustive by
  grep): `:331` (the chrome trace-link fallback — note it PREFERS the artifact's own
  `source.curatedTrace`, so the bespoke artifact self-describes its trace link), `:792`/`:794`/
  `:803` (artifact fetch + its two error strings) and `:806`/`:808`/`:936` (trace fetch + the
  traceless sentence). Update the file-header contract comment (":74-77 ONE committed slug"
  paragraph) to say the constants are the DEFAULT and the instance passes its own (epic #202
  ticket #222).
- **PATTERN**: `initIntake`'s default-preserving options — `factory-intake.mjs:225-240`.
- **GOTCHA**: keep `REPLAY_SLUG`/`ARTIFACT_URL`/`TRACE_URL` exported — build-checks group 16 and
  the file's pure layer may reference them. NO behavior change with `source` absent.
- **VALIDATE**: `node --check system/replay-driver.mjs && node tooling/build-checks.mjs` (group 16
  green, unedited).
- **SATISFIES**: AC #1 (the seam that lets an instance name its run).

### Task 2 — UPDATE `system/studio.mjs`: opts threading + external stand-down

- **IMPLEMENT**: `mountStudio(root = document, opts = {})`; thread `opts` into `mountStudioCore`
  and `restoreShared` (both call sites); at `mountStudioCore`'s `mountReplay` call (:589) add
  `source: opts.replay`. Change the self-boot (:813) to stand down when
  `document.querySelector('[data-studio][data-studio-mount="external"]')` is non-null. Update the
  header comment naming the new seam and its precedent (`factory-intake.mjs:711`).
- **PATTERN**: `factory-intake.mjs:711` stand-down; `instance.html:461`'s attribute idiom.
- **GOTCHA**: `mountStudio`'s glossary-before-try ordering (:752-768 comment) is load-bearing —
  do not restructure it. The no-`?b=` path must STAY synchronous (:771-779 comment) — `opts` is
  plain data, it introduces no await.
- **VALIDATE**: `node --check system/studio.mjs && node tooling/build-checks.mjs` then
  `node tooling/visual-regression/serve.mjs & node tooling/studio-journey.mjs chromium` — every
  pass green with zero edits to the journey (factory's behavior byte-identical).
- **SATISFIES**: AC #1.

### Task 3 — CREATE `replay/briefs/build-northwind-restock.md`

- **IMPLEMENT**: the human-authored brief (draft in NOTES; the owner may edit it in PR review —
  it is an input, not agent output). It states the problem only, never a board.
- **PATTERN**: `replay/briefs/build-fieldwork-dispatch.md` — same length, same
  problem-not-answer shape, an explicit out-of-scope line.
- **GOTCHA**: slug `build-northwind-restock` must be globally unique across the FLAT `traces/`
  namespace — verify with `ls traces/ | grep northwind` (the composition slugs are
  `northwind-*`, no collision).
- **VALIDATE**: file exists; `node portal/record-build.mjs --slug build-northwind-restock --dry`
  accepts it (next task runs it).
- **SATISFIES**: AC #1 (the bespoke run's input).

### Task 4 — RUN the real bespoke run (recorder, then generator)

- **IMPLEMENT**: `node portal/record-build.mjs --slug build-northwind-restock --dry` (full agent
  run, writes nothing — proves the brief is buildable); then without `--dry`; then
  `node agent-layer/gen-replay.mjs`; then
  `node tooling/validate-trace.mjs traces/build-northwind-restock.jsonl`.
- **PATTERN**: CLAUDE.md "New replay run" procedure, verbatim. Spike 1's bars: ≥3 places, ≥1
  connection, 0 null-phase steps, every implement Bash = one op, board is a reasonable reading.
- **GOTCHA**: NEVER hand-edit any output. A weak run → tighten the brief (or, only if genuinely
  needed, `PIV_BUILD_SYSTEM` framing — positively, per `recorder-run-positive-framing`) and
  `--force` re-run. The recorder needs NO edit for a new scenario — VERIFIED: `record-build.mjs`
  contains zero fieldwork references; the brief carries all scenario content. SDK auth = Mac CLI
  login; if auth fails, STOP and report — do not fake a run.
  `gen-replay` also re-emits the fieldwork artifact — it must be byte-identical (`git diff
  --stat replay/build-fieldwork-dispatch.json` empty).
- **VALIDATE**: validate-trace exits 0; `gen-replay` prints ✓; reproduce check passes;
  `git status` shows exactly the four new run files + no fieldwork diff.
- **SATISFIES**: AC #1.

### Task 5 — UPDATE `instance.html`: the re-shell

- **IMPLEMENT**:
  1. Head: add `/system/studio.css` and `/system/catalog.css` after `/system/portfolio.css`
     (factory.html:46-55's order).
  2. Replace `#beat-built`'s interior (:542-609): keep the band + its heading structure; in place
     of `#instance-prototype` + capability chip machinery, mirror factory.html's studio shell DOM —
     `.stu-shell[data-studio][data-studio-mount="external"]` containing `[data-build-stage]`,
     `#canvas[data-studio-canvas]` (NO `data-studio-frames`), `[data-replay-chrome]`,
     `[data-studio-notice] hidden`, the method band `[data-studio-method]`, the inspector aside
     with ONLY the `this-build`, `shape`, `component-docs` tab/panel pairs, and the keep rail
     `[data-studio-keep]`. Copy factory's ids/classes/aria structure exactly for the kept parts —
     the modules select on those attributes.
  3. Delete the study-twin CSS block (the `study-*` rules ~:284-338) and the capability-chip CSS
     that dies with it. Dark-band interplay is LOW risk — VERIFIED: `.stu-shell` paints its own
     token surface (`studio.css:56 background: var(--color-bg)`; panels use
     `--color-bg-surface`), so the studio band self-surfaces inside `.band--dark`; only spacing/
     width shims should ever be needed, page-scoped.
  4. Re-derive EVERY demo/real prose seam. Existing four stay (hero-sub :402, labeling lead :426,
     close-card :622-623, verify trace note :664-672). New sites in the rebuilt band, each as a
     `data-when="demo"` + `data-when="real" hidden` pair where copy differs: the band's lead
     sentence (demo: names Northwind + fictional framing · real: "{{name}}" + real framing), and
     the run-provenance sentence above the replay chrome (demo: "a real recorded run over the
     fictional Northwind brief" · real: "a real recorded run over {{name}}'s brief"). Keep
     `#ethics-gate` untouched — VERIFIED: it is rendered by `factory-intake.mjs:244`
     (`getElementById("ethics-gate")`, the intake chain), so it survives the band rebuild as long
     as its node stays.
  5. `INSTANCE_CONFIG` v2 (:709-727): drop `composition`, drop `links.prototype`, add
     `replay: { artifact: "/replay/build-northwind-restock.json", trace:
     "/traces/build-northwind-restock.jsonl" }`.
  6. Update the head/body dev comments (:52-58, :733-738) — no demo-name leaks outside markers
     (the #44 report's view-source rule).
- **PATTERN**: factory.html:96-544 (DOM mirrored); `instance.html`'s own band/spine idiom for
  everything kept.
- **GOTCHA**: the studio band must NOT carry `data-studio-frames` anywhere; the inspector panels
  omitted (agents, round-trip) must have neither tab nor panel node — `wireInspector` wires
  whatever exists. `pack-boot.js` and `dock.mjs` STAY absent (recorded #81 decision). The page
  `<style>`'s `[hidden]` handling: catalog.css carries the `[hidden]{display:none!important}` rule
  the code tabs need — that is one reason it is linked.
- **VALIDATE**: `npx serve .` → open `http://localhost:3000/instance.html`: replay autoplays and
  settles (`[data-replay="settled"]` on the shell), method cards + inspector + keep rail present,
  wizard/trace/notices sections unchanged. Console: only the known Worker-refused noise
  (`headless-render-data-pages-worker-refused` memory), nothing else.
- **SATISFIES**: AC #1, #2 (seams), #3 (notices intact).

### Task 6 — UPDATE `system/instance.mjs`: studio boot in, renderStudy out

- **IMPLEMENT**: remove the `renderStudy` import (:60) and `renderPrototype`/`unclaim`
  (:338-394) plus the composition branch in `init()`; add `mountStudioBand()` that reads
  `config.replay` and calls `mountStudio(document, { replay: config.replay })` (import from
  `./studio.mjs` — the import itself is now safe because the shell carries the stand-down
  attribute; note that in the header). Missing/invalid `config.replay` → an honest error card in
  the band (the module's existing per-chain error-card idiom), never a throw. Drop `links.prototype`
  handling in `renderLinks`. Update the header (:32-41 non-imports rationale + ticket cite).
- **PATTERN**: the module's own four-independent-chains `init()` (:397-461) — the studio band is a
  fifth independent chain.
- **GOTCHA**: importing `./studio.mjs` transitively imports the whole studio graph — all node-safe,
  but instance.mjs must remain inert under Node import (`typeof document` guard at :463 already
  handles it; verify nothing new touches DOM at module scope). The build store is shared with
  /build on the public origin — a visitor's own board pre-seeds the canvas exactly as it does on
  /factory; that is designed behavior, note it in the header rather than fighting it.
- **VALIDATE**: `node -e "import('./system/instance.mjs').then(()=>console.log('node-safe'))"`;
  re-run the Task 5 browser check.
- **SATISFIES**: AC #1, #6 (unblocks module deletion).

### Task 7 — UPDATE `agent-layer/build-instance.mjs`: v2

- **IMPLEMENT**:
  1. CLI: add required `--replay <slug>`; remove `--compositions` and `--proto`; update usage text.
  2. Copy the run: `replay/<slug>.json`, `replay/<slug>.board.json`, `replay/briefs/<slug>.md`,
     `traces/<slug>.jsonl`, `traces/<slug>.raw.jsonl` from REPO_ROOT into the deploy dir at the
     SAME paths (the artifact's `source` values are root-absolute). Throw with the offending path
     if any is missing. Validate the copied artifact: JSON-parses, `ops` non-empty, every
     `source` path among the copied files.
  3. ALWAYS copy `handoff/verdant/pack.json` + `handoff/verdant/vocabulary.json` (studio-compile +
     studio-docs fetch them). `/scenarios/verdant/copy.json` is NOT needed — VERIFIED: that fetch
     lives inside `mountCatalog()` gated on `[data-catalog-root]` (catalog.mjs:553-565), which the
     instance never has; the docs panel's complete fetch set is `studio-docs.mjs:95-99`'s
     `DOCS_SOURCES` plus catalog.mjs's per-component `/system/specs/<name>.md` (in the wholesale
     `system/` copy). The journey's zero-404 row is the standing arbiter regardless.
  4. Chrome (#160): emit `system/client.instance.config.js` into the deploy dir (generated content:
     brand name = company name, nav = the page's own section anchors or empty — VERIFIED safe:
     `site.js:29` is `const nav = cfg.nav || []`, an empty nav renders a bare brand header —
     footer = "The system" links that exist in-dir + contact mailto + the GitHub repo https link —
     NO route that is not in the deploy dir); Mechanism A gains a sixth anchor re-pointing the
     `client.neutral.config.js` script line to it. The repo's own instance.html keeps
     neutral config (in-repo the full IA exists).
  5. `INSTANCE_CONFIG` writer (:141-157): emit the v2 shape (`replay` in, `composition`/
     `links.prototype` out).
  6. `validateAssembly` v2: remove the :242 chrome exclusion — every internal href in the built
     HTML AND in the generated chrome config must resolve in the deploy dir (mailto:/https:
     exempt); assert the replay files' presence + `source` consistency; keep every existing check
     (residue greps, demo/fictional body-text grep, noindex `_headers`); drop check 6b
     (compositions) with the flag.
  7. Delete the compositions copy block (:367-400) and the `validateComposition` import —
     VERIFIED removable: imported at :32, used only by check 6b (:293), both dying together.
- **PATTERN**: the existing `--trace` copy (:362-364) + compositions copy's by-name discipline
  (:367-400, being deleted but its shape reused for the replay copy); `validateAssembly`'s
  aggregate-error shape.
- **GOTCHA**: the outside-the-repo guard ALREADY EXISTS and is symlink-safe
  (`build-instance.mjs:316,323-326` — refuses any in-repo `--out` naming the resolved path);
  KEEP it, do not re-add. Keep discard-on-failure intact around the new copy steps. Company-real
  runs: the operator records into the repo WORKING TREE and never commits — document that in the
  file header + usage text ("nothing company-real is committed; `git clean` after building").
  The `fictional:false` privacy boundary lives in `gen-company-package.mjs:11-13` and
  `portal/lib/builder.mjs` (build-checks group 8) — neither is touched here, which is AC #3's
  operator-path half.
- **VALIDATE**: build a fixture instance:
  `node agent-layer/build-instance.mjs <fixture-brief> --out /private/tmp/claude-501/...scratchpad/inst-fixture --pack system/tokens.saulera.css --trace traces/pack-seed-verdant.jsonl --replay build-northwind-restock`
  → exits 0, prints the two wrangler commands; then the mutations: (a) `--replay nope` → throws
  naming the path; (b) temporarily re-add a `/approach` link to the shell → validateAssembly goes
  red (revert).
- **SATISFIES**: AC #1, #2, #4, #5, #7.

### Task 8 — DELETE the study surface

- **IMPLEMENT**: `git rm agentic-ui-study.html system/agentic-study.mjs`. Then the references:
  - `factory.html:501-508` — remove the Go-deeper row.
  - `work.html:199-215` — remove Exhibit 02; renumber the remaining exhibit labels.
  - `index.html:187-190` — rewrite the comment (it is stale twice over: the page dies here, and
    its "in ⌘K" claim was already false — palette.mjs never listed it).
  - `tooling/vt-verify.mjs:135-146` — remove the two study rows from `SITEWIDE`.
  - `scenarios/README.md:194` + `scenarios/fieldwork/rubric.json:4` — prose true-up: the rubric
    assessed the (now retired) study surface; keep both files (committed data; five-pillar
    attribution rule: cite no speaker).
  - `system/param-manifest.json:2` — update the `$description` scope sentence (the study page no
    longer exists to exclude).
  - CLAUDE.md — delete the `agentic-study.mjs` map entry; true up `catalog.mjs`'s entry if it
    names the study; rewrite the `instance.mjs`/`instance.html`/`build-instance.mjs`/
    `agentic-ui-study` mentions (a later task finalizes CLAUDE.md wholesale — at minimum leave no
    false sentence).
- **PATTERN**: PR #261's lesson (`deleting-a-mount-can-orphan-css`): grep `portfolio.css` and the
  deleted page's class prefixes (`study-`) for now-dead rules — the known copy lives in
  instance.html (already deleted in Task 5); verify none remain elsewhere.
- **GOTCHA**: `grep -rn "agentic" system/ tooling/ *.html proto/ scenarios/` must return only
  `agentic-renderer`/`action-bus`/`agentic.html` hits afterwards (those surfaces stay).
- **VALIDATE**: the grep above; `node tooling/build-checks.mjs` (green — nothing imported the
  module); `node tooling/vt-verify.mjs` (operator-run, if driven now — at minimum
  `node --check tooling/vt-verify.mjs`).
- **SATISFIES**: AC #6.

### Task 9 — ADD the build-checks group (stamp + chrome predicate, pure)

- **IMPLEMENT**: export `stampShell` and the new chrome-href audit predicate from
  `build-instance.mjs` (keep them SDK-free — the file already imports only node builtins +
  system modules). New group in `tooling/build-checks.mjs` (next number after the current last):
  drive `stampShell` over the REAL `instance.html` text with a synthetic config → assert zero
  `data-when=`/`{{`/stray-`hidden` residue, no "Northwind"/"demo"/"fictional" in body text, the
  v2 `INSTANCE_CONFIG` parses with `replay` present and `composition` absent; MUTATIONS: (a) a
  synthetic input with an extra `data-when="demo"` region → still stripped; (b) an input missing
  one Mechanism-A anchor → throws naming it; (c) the chrome predicate over a synthetic deploy
  listing refuses an `/approach` href and accepts mailto/https/in-dir. State the boundary: the
  RUNNING built page is `instance-journey`'s.
- **PATTERN**: group 11's shape (driving `gen-replay`'s pure `projectTrace` + mutations); group
  8's SDK-free import discipline.
- **GOTCHA**: build-checks runs in CI with no `portal/node_modules` — build-instance must import
  nothing from the SDK chain (it doesn't today; keep it that way).
- **VALIDATE**: `node tooling/build-checks.mjs` — new group green; then break one anchor regex in
  a scratch copy and watch it red (do not commit the break).
- **SATISFIES**: AC #2, #3, #4 (the CI-reachable half).

### Task 10 — CREATE `tooling/instance-journey.mjs`

- **IMPLEMENT**: operator-run driver, playwright resolved from
  `tooling/visual-regression/node_modules` (the sibling drivers' idiom). Steps: (1) build a
  fixture instance into the scratchpad via `build-instance.mjs`. The fixture brief is NEW at
  `tooling/fixtures/instance-brief.md` — VERIFIED format: `parseCompanyBrief` (agent-layer/
  lib.mjs) reads a markdown file with a JSON head block (`slug`, `name`, `fictional`, `domain`,
  `oneLiner`, `today`) + prose sections; clone `scenarios/northwind/brief.md`'s shape with
  `fictional: true` and a NON-Northwind name (e.g. "Harborlight", the #44 spike's fixture name)
  so the residue greps discriminate; (2) serve the deploy dir on a spare port with a small
  zero-dep node:http static server IN-FILE — VERIFIED necessary: `serve.mjs` hard-roots the repo
  (`serve.mjs:10`), no override exists; mirror its ~30-line shape; (3) per
  engine (chromium · firefox · webkit): load `/` and assert — `[data-studio="ready"]` then
  `[data-replay="settled"]`; the pack `<link>` href is the stamped company pack; stage place
  count equals the SERVED board file's `places.length` (fetch it from the server — never a
  literal); ZERO non-2xx responses across the whole load, main-frame-scoped with proto-journey's
  expected-noise filter; served HTML contains no `data-when=`, `{{`, "Northwind", "fictional",
  "demo"; every internal `<a href>` answers 2xx; one canvas interaction takes over
  (`[data-replay]` leaves autoplay) as the take-over sanity row.
- **PATTERN**: `tooling/proto-journey.mjs` (engines loop, serve, request log, noise filter);
  `tooling/studio-journey.mjs`'s assert-against-the-fetched-file discipline.
- **GOTCHA**: the fixture build's `--out` goes to the session scratchpad, not `/tmp` and not the
  repo. The zero-404 assertion is the structural #160/asset-closure check — do not weaken it to
  an href list. State in the header what build-checks' group owns vs this driver.
- **VALIDATE**: `node tooling/instance-journey.mjs all` → green ×3; MUTATION: delete
  `handoff/verdant/pack.json` from the built fixture dir and re-serve → the 404 row goes red
  (then rebuild).
- **SATISFIES**: AC #1, #2, #4 (the running-page half), #7 (wrangler print asserted as text in
  step 1's captured stdout).

### Task 11 — Cascades: loc, params, baselines

- **IMPLEMENT**: `node agent-layer/gen-loc-summary.mjs` (pages group loses agentic-ui-study.html;
  runtime group loses agentic-study.mjs and gains nothing in system/; tooling gains the journey)
  and `node agent-layer/gen-param-count.mjs` (counts unchanged — instance.html is out of manifest
  scope — but regenerate so the drift check is clean). VR baselines: factory ×2 (Go-deeper row
  removed), work ×2 (Exhibit 02 removed), approach ×2 (loc numbers) — `cd
  tooling/visual-regression && npm run update:docker` from a CLEAN DETACHED WORKTREE under
  `/Users` (`vr-gate-reads-working-tree` memory); if a sub-perceptual approach diff refuses to
  rewrite, `rm` the PNG first (`vr-update-skips-subperceptual` memory).
- **GOTCHA**: baseline-collision rule — confirm no concurrent PR regenerates factory/work/approach
  (only #221/#223 remain in the epic; check `gh pr list`). instance.html is NOT in the VR set —
  its re-shell churns zero baselines (the #44 report's same finding).
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` on the CLEAN committed tree (memory:
  `loc-summary-counts-tracked-only` — run after staging); CI `verify` semantics locally:
  regenerate + `git diff --exit-code system/loc-summary.json system/param-count.json`.
- **SATISFIES**: epic's standing per-ticket cascade rules.

### Task 12 — Docs: CLAUDE.md + plan/report/review in-PR

- **IMPLEMENT**: rewrite the CLAUDE.md architecture-map entries for `instance.mjs`, `instance.html`,
  `build-instance.mjs` (v2 flags, the replay copy, the chrome config, #160 closed), delete
  `agentic-study.mjs`'s entry, true up any `agentic-ui-study` mention (`components.html` entry
  etc. — grep). Write `.claude/reports/studio-instance-reshell-222-report.md`. Update the stale
  memory `ticket-44-shell-stamp-seams` (the six-sites count) and add the re-shell to
  `factory-mid-epic-owner-verdict`'s context if relevant. Commit this plan file. PR body:
  `Closes #222` + `Closes #160` (this ticket resolves it — the issue is already closed, so cite
  it in prose instead if GitHub rejects the trailer).
- **VALIDATE**: `grep -rn "agentic-ui-study\|agentic-study" CLAUDE.md` → nothing;
  `grep -n "compositions" CLAUDE.md` → no stale build-instance flag claims.
- **SATISFIES**: repo git/PR ground rules.

---

## TESTING STRATEGY

No test suite exists (CLAUDE.md: "run the surface you touched"). The gates ARE the tests:

### Unit-equivalent (CI)
- build-checks: existing groups unedited (13/16 prove the seam changed no factory behavior); the
  NEW group proves stamping/chrome purely, with three mutations.
- CI `verify` drift checks: gen-replay (the committed northwind run's reproduce check re-runs on
  every CI build), loc-summary, param-count.

### Integration (operator-run)
- `tooling/instance-journey.mjs all` — the built fixture instance end-to-end ×3 engines.
- `tooling/studio-journey.mjs chromium` — factory unchanged.
- `tooling/vt-verify.mjs` — study rows gone, everything else green.
- Browser smoke of `/instance.html` (demo shell) under `npx serve .`.

### Edge Cases
- `?b=` share link opened on the instance (declined replay path with `source` threaded).
- Visitor with an existing /build board arriving at the demo instance (store pre-seed — designed).
- `--replay` naming a missing slug; a deploy dir whose pack.json was omitted (journey mutation).
- Reduced motion on the instance replay (driver already handles; journey may spot-check).
- A real-company brief with `fictional:false` — the operator-path refusal (`portal/lib/builder.mjs`,
  build-checks group 8) must still hold: run group 8 and confirm untouched.

---

## VALIDATION COMMANDS

### Level 1: Syntax
`node --check` on every touched .mjs; `node -e "import('./system/instance.mjs')"` (node-safe).

### Level 2: Pure gates
`node tooling/build-checks.mjs` · `node agent-layer/gen-replay.mjs` ·
`node tooling/validate-trace.mjs traces/build-northwind-restock.jsonl` ·
`node scenarios/validate.mjs`

### Level 3: Running-page gates
`node tooling/visual-regression/serve.mjs &` then `node tooling/studio-journey.mjs chromium` ·
`node tooling/instance-journey.mjs all` · `node tooling/vt-verify.mjs`

### Level 4: Manual
Fixture build command (Task 7) + open the served deploy dir; open `/instance.html` demo shell;
eyeball the studio band in a real browser under the company pack (VR single-engine blindspot
memory).

### Level 5: CI
`gh pr checks` after push — `verify` (drift) + `visual` must both be green; local Docker pass ≠ CI
green (`vr-gate-approach-countup-flake` memory: an approach flake fails a different pack each run —
re-run before diagnosing).

---

## ACCEPTANCE CRITERIA

- [ ] AC1 — built instance dir renders the studio pre-seeded with the company pack + bespoke run;
      no demo copy anywhere (instance-journey, all rows).
- [ ] AC2 — every `data-when` seam stamped; residue grep empty (build-checks group + journey).
- [ ] AC3 — honesty notices correct for real builds; `fictional:false` operator refusal holds
      (validateAssembly body grep + group 8 untouched).
- [ ] AC4 — deploy dir carries its own noindex `_headers`; chrome with zero 404s (validateAssembly
      v2 + journey's zero-404 + href rows) — closes #160's failure mode.
- [ ] AC5 — `--out` outside the repo enforced; nothing company-real committed (guard + documented
      operator procedure).
- [ ] AC6 — `agentic-ui-study.html` + `agentic-study.mjs` retired, full blast radius cleaned.
- [ ] AC7 — printed wrangler command correct; deploy remains the operator's explicit step
      (journey captures stdout; no deploy call in code).
- [ ] All gates green; factory behavior byte-identical (unedited groups 13/16 + studio-journey).
- [ ] Cascades done: loc/param regens, factory/work/approach baselines ×2 each, CLAUDE.md truth.

## COMPLETION CHECKLIST

- [ ] Tasks 1–12 in order, each validation run at the time
- [ ] Real run recorded (never edited), committed under standard labels
- [ ] Mutations exercised for every new check (stamp anchors, chrome predicate, journey 404)
- [ ] PR: plan + report + review artifacts committed; `Closes #222` trailer; #160 cited
- [ ] Staged parallel-session files untouched; own changes staged by explicit path

---

## OPEN QUESTIONS / ASSUMPTIONS

Decisions made here (each reversible; flag in PR if the owner disagrees):

1. **Instance inspector panels = `this-build` + `shape` + `component-docs`; `agents` and
   `round-trip` dropped.** Reasoning: `agents` fetches `/traces/demo-notice.jsonl` (a demo trace —
   AC1's "no demo copy") and `round-trip` is Verdant's derivation exhibit; the instance has its
   OWN derivation trace in `#verify`. DOM omission makes this free.
2. **No device frames on the instance.** The protos are labeled-fictional demo scenarios and a
   heavy asset closure; a real company's instance showing Verdant/Fieldwork dilutes "built for
   YOU". DOM omission (no `data-studio-frames`) makes this free.
3. **work.html Exhibit 02 is removed (with renumbering), not re-pointed** — the capability it
   exhibited now lives in the studio, which work.html already points at.
4. **`--compositions` and `--proto` retire; `links.prototype` retires.** The composition slot is
   the thing being replaced; keeping dead flags contradicts Simplicity First. The committed
   northwind compositions stay as records.
5. **Company-real runs are recorded through the repo tooling into the working tree and never
   committed** — the recorder/generator are repo-anchored (gen-replay.mjs:33), so "copy-not-run"
   means build-instance copies whatever the tree holds; the no-commit rule is operator discipline,
   documented in build-instance's header + usage. (Alternative — a `--replay-dir` for out-of-repo
   files — rejected: the artifact's `source` paths are root-absolute and the four files live in
   three directories; restaging them breaks the projection's self-description.)
6. **The demo instance page's keep-rail analytics routes firing on `/instance` is accepted metric
   noise** (deep-link-only page, ~zero traffic; the deployed instance's beacon no-ops off the
   production host). Flag in the report.

Former assumptions, now VERIFIED during planning (no open verification remains):

- `#ethics-gate` is `factory-intake.mjs:244`'s mount (intake chain) — survives untouched.
- `.stu-shell` self-paints `var(--color-bg)` (`studio.css:56`) — the dark-band interplay is
  cosmetic at worst; any shim is page-scoped, never a studio.css edit.
- `/scenarios/verdant/copy.json` is fetched only by `mountCatalog()` behind `[data-catalog-root]`
  (`catalog.mjs:553-565`) — the instance's docs panel never requests it.
- `instance.html` carries zero `data-term` nodes — `mountStudio`'s `initGlossary` is a no-op
  there (the unknown-key abort only fires on bad data).
- The `--out` outside-repo guard already exists, symlink-safe (`build-instance.mjs:316,323-326`).
- `site.js:29` tolerates an empty nav (`cfg.nav || []`).
- `serve.mjs` hard-roots the repo (`:10`) — the journey ships its own in-file static server.
- `record-build.mjs` is scenario-agnostic (zero fieldwork references) — no recorder edit.
- `wireInspector` derives tabs/panels purely from the DOM (`studio.mjs:336-341`) — panel
  selection by omission is structural, not incidental.
- `parseCompanyBrief`'s input format is confirmed against `scenarios/northwind/brief.md` (JSON
  head: slug/name/fictional/domain/oneLiner/today + prose sections).

## NOTES (open canvas)

**Draft brief** for `replay/briefs/build-northwind-restock.md` (owner-editable input):

> Northwind Traders' inventory controller starts each morning blind to which SKUs are at risk of
> overselling against open orders. They need one tool for the working session: see where today
> stands across the warehouse, work the at-risk SKUs one at a time with enough context to decide,
> act on a decision — raise a restock or move stock between locations — and see that the action
> took before moving to the next. Customer-facing notifications and supplier negotiation are out
> of scope: this is the controller's own working surface.

Shape mirrors the fieldwork brief (which produced a clean 4-place board): a persona, a "see where
today stands" entry, a queue to work, an action with confirmation, an explicit out-of-scope line.

**Why the seam is this small**: the studio was already built configured-by-DOM (frames gated on an
attribute, panels wired from present tabs, keep rail's pack regex brand-agnostic, all docs fetches
path-stable). Only the replay source was hard-coded ("ONE committed slug, named once. A brief
picker or a second artifact is #210's, not this file's" — replay-driver.mjs:74). This ticket is
that anticipated second artifact.

**Rejected alternative — iframe /factory into the instance**: the instance needs a different run,
a pinned pack, and no public chrome; an iframe would need all the same parameterization plus a
document boundary that custom properties don't cross (#219's dropped-brand lesson).

**Rejected alternative — keep agentic-study.mjs "just in case"**: two dead mounts is exactly the
state the architecture doc scheduled this ticket to end.

**Sequencing note**: Tasks 1–2 (seams) and 3–4 (run) are parallelizable across worktrees, but the
run costs money — do the `--dry` early so a brief problem surfaces before the shell work builds on
the slug name.

**Risk register** (post-verification): (a) recorded-run quality — the ONE nondeterministic
element; bounded in-plan by `--dry` + spike-1 bars + the `--force` re-run protocol, and it gates
nothing structural (a re-run changes no code); (b) baseline regen races — Task 11's collision
check; (c) CI visual flake on approach (`vr-gate-approach-countup-flake` memory) — re-run before
diagnosing. Former risks (studio CSS in the dark band, the copy.json fetch, double-glossary) are
resolved to facts above.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
