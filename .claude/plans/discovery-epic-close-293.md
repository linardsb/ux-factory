# Feature: Epic close-out for Discovery Partner — the metric read row by row, the hypothesis answered, closing notes in both docs (#293)

The following plan should be complete, but validate documentation and codebase patterns and task sanity
before you start. Pay attention to the naming of existing modules and artefacts — import from the right
files. **This is a docs-and-evidence ticket: no `system/`, `portal/`, `discovery/*.mjs` or `agent-layer/`
code changes, no paid run, no transcript, answer or op is touched.**

## Feature Description

The honest close of epic #279. Every §Success metrics row of `docs/epics/discovery-partner.prd.md` is read
against what runs 0, 1 and 2 actually produced, with observed evidence and no rounding of a miss into a pass.
The hypothesis is answered in its own terms, including the WRONG condition and the C1 control. The open
questions that survived are named once, the wave-2 inheritance is stated once, and both epic docs get a
dated closing section. The epic issue's task list is brought up to date. A close-out report in
`.claude/reports/` is the record.

Why this is a ticket at all: the studio epic's close-out was written as #177, closed `NOT_PLANNED`,
rewritten as #223 and only ran mechanically. An epic-close that is nobody's ticket does not happen. This
one was created at slicing on purpose.

## User Story

As the owner of a portfolio graded as a work sample
I want epic #279 closed against evidence — nine metric rows read, the hypothesis judged, the debt named
So that nothing in the two epic docs claims more than the runs support, and wave 2 starts from a true record.

## Problem Statement

Fourteen tickets plus thirteen raised mid-epic have merged. Runs 0, 1 and 2 exist. But the PRD's status line
still reads as sliced, its §Success metrics table has never been read against a package, the hypothesis's
RIGHT reading sits only in a #338 report, two metric readings the run tickets explicitly routed here (marginal
reach, gap finding) are unrecorded in the epic docs, and the epic issue's task list shows nine merged tickets
as unticked. Worse, **the 2026-09-02 amendment that added the ninth metric row was never committed** — it
has sat as unstaged edits in this shared working tree since that day (`git diff origin/main` on the two
docs; observed 2026-09-14). The decision doc it writes back is committed; the write-back is not.

## Solution Statement

Five phases, top to bottom. (A) A fresh worktree off `origin/main`, carrying the unstaged 2026-09-02
amendment across verbatim so the ninth row exists before it is read. (B) The reads, every number
re-derived from `run.json` and `transcript.jsonl` by the existing `runMetrics` fold, plus the disclosure
re-measure and the C1 check — scratch scripts, nothing committed. (C) The close-out report. (D) The
closing sections in both docs, the status line's `closed` rung, the README's facet-count correction, and
the two PR #406 doc-accuracy items the review said could land here. (E) The epic issue's task list, the
PR with `Closes #293`, and the epic close proposed to the owner.

## Out of Scope / Non-Goals

- **Not a fix pass.** The transition-rung misuse, the look-up drawer gap, `MAX_TURNS`, ABSENT never firing,
  the re-filed falsifier and the non-URL evidence route are **recorded** as surviving debt with their
  evidence, not fixed. Opening follow-up tickets for them is the owner's call (Q3).
- **Not re-running anything.** No paid turn. The marginal-reach metric run 1 could not supply is reported
  as not taken, with the reason; it is not re-taken.
- **Not touching** `answers.jsonl`, `transcript.jsonl`, any `run.json`, any `prd.md` under `discovery/`,
  or any sealed fixture. The one prose edit under `discovery/` is `README.md:365`'s headline count.
- **Not deciding the Switch metric's second half.** "Not yet tested" is the honest read; no proxy.
- **Not writing the owner's judgements** (memory `honesty-contract-mirror-direction`): whether run 0 counts
  as unprompted, and run 2's one movable verdict, are put to the owner, not written for them.
- **Not closing epic #279 itself** — proposed after merge; the owner's click (#223 precedent).
- **Not touching** the shared tree's `agent-layer/gen-decisions.mjs` `flagship` edit (another session's) or
  any untracked file in the shared tree.

## Feature Metadata

**Feature Type**: Audit / process (epic close)
**Estimated Complexity**: Medium — mechanically simple, evidence-dense, ~300–500 lines of prose
**Primary Systems Affected**: `docs/epics/discovery-partner.{prd,architecture}.md` · `discovery/README.md`
(one number) · `.claude/references/gates.md` (one clause) · `.claude/reports/` · GitHub issue #279
**Dependencies**: none new. Reads use `portal/lib/discovery.mjs` from the main tree (SDK already installed).

## Related Work

**Implements**: linardsb/ux-factory#293 · **Epic**: `docs/epics/discovery-partner.architecture.md` (#279),
sub-decision `docs/epics/discovery-question-selection.architecture.md` (§D4 adds the ninth row)

**Back-references**:

- `.claude/plans/studio-epic-close-223.md` — the worked example of the shape (its Phase E only applies here).
- `.claude/reports/discovery-faster-payment-run-291-report.md` — run 1's readings; routes AC #3 (marginal
  reach), AC #5 (auditability failure), AC #7's rendered transition section, and F5/F6 here.
- `.claude/reports/discovery-pre-grill-audit-run-292-report.md` — run 2's readings; routes the gap-finding
  share and the two #370 readings here.
- `.claude/reports/discovery-run-0-338-report.md` — the hypothesis's RIGHT reading (AC3) and F9–F12.
- `.claude/plans/prd-house-shape-396.md` — the status-line grammar (regex at :141) and the amendment-entry form.

**Forward-references**: (none yet — follow-up tickets only if the owner asks, Q3)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `docs/epics/discovery-partner.prd.md` on **origin/main** (not the working tree) — §Hypothesis (:121–139),
  §Success metrics (:357–366, eight rows; the ninth arrives with the amendment), §Open questions (:409–432),
  §Architecture (:434–455), §Amendments (:459–end; three entries, the last dated 2026-09-14). The closing
  section goes between §Architecture and §Amendments, mirroring `prototype-studio.prd.md:201`.
- `docs/epics/discovery-partner.architecture.md` — §Boundaries & contracts (:209–276), §Open questions
  (:349–370, one `[x]`, four `[ ]`), §For slicing → "The close-out ticket is created at slicing" (:410–417).
  The closing note appends after the italic sign-off (:420–425), mirroring
  `prototype-studio.architecture.md:233`.
- `docs/epics/prototype-studio.prd.md:1–3` — the status line with a `closed` rung (the only precedent);
  `:201–260` — the "Epic close" section shape: what shipped · what was cut · verified at close (observed) ·
  open questions resolved · carried forward.
- `docs/epics/prototype-studio.architecture.md:233–260` — the closing-note shape: which decisions survived
  contact, one paragraph per open question the doc left.
- `docs/epics/discovery-question-selection.architecture.md:174–200` (§D4, the ninth row and its
  "not yet tested" rule) and `:290–316` (the deferred rung between full discovery and the whole bank).
- `portal/lib/discovery.mjs:690–720` — `runMetrics`: `completion`, `notAForm`, `weak`, `coverage`,
  `askedWhatMattered` (twelve vs tail, closers not questions). `:867` `sessionView(root)` — **takes an
  absolute root** (a relative path throws `no run.json under …`; observed).
- `discovery/README.md:365` — "Known debt — **four** unexercised facets" whose own sentence lists three.
  `:866–900` — the run-2 readings routed here.
- `.claude/references/gates.md:90` — the fence-probe entry (PR #406 review L1: "run 2's shape" names the
  pre-#286 shape; add one clause).
- `.claude/reports/discovery-pre-grill-audit-run-292-report.md:140` — "13 lines, 3 `PreToolUse.deny`"
  (PR #406 review L2: 2 are `PreToolUse.deny`, 1 is `canUseTool.deny`).
- `portal/lib/discovery-postures.mjs:34` and `:200–204` — `JUDGEMENT_RULE` (run 0's F9) reaches Grill and
  Create PRD, **not Think**; cite in the surviving-debt list.
- `.claude/plans/prd-house-shape-396.md:139–146` — the status regex and the amendment-entry form.
- Memories that bite here: `shared-worktree-parallel-sessions` (use a worktree; stage by explicit path) ·
  `honesty-contract-mirror-direction` · `discovery-answers-honesty-owner-writes` · `copy-never-indented`
  (closing sections flush-left, no blockquotes) · `run-2-audit-result-for-293` · `portal-smoke-port-scoped-kill`
  · `loc-summary-counts-tracked-only` (no source files added here, so no drift — but run `--check` anyway).

### New Files to Create

- `.claude/reports/discovery-epic-close-293-report.md` — the close-out record (the artefact).
- `.claude/code-reviews/pr-<N>-review.md` — by `piv-review-pr`, same PR.
- Scratch only (never committed): `$SCRATCH/amendment-2026-09-02.patch`, `$SCRATCH/metric-read.mjs`,
  `$SCRATCH/disclosure.mjs`.

### Relevant Documentation

- PRD §Success metrics' own "How measured" column is the specification for each row; the cobra-check column
  is what stops a pass being rounded up. Read them as the rubric, not as background.
- `discovery/README.md` §Honesty rules — nothing under a package is edited; the README's prose is.
- `~/.claude/skills/_shared/slop-blacklist.md` — C2 applies to the closing sections (a human reads them).

### Patterns to Follow

**Status-line grammar** (`.claude/plans/prd-house-shape-396.md:141`, POSIX ERE): the `closed` rung is
`( · closed [0-9]{4}-[0-9]{2}-[0-9]{2})?` immediately before ` · **Created:**`. Precedent:
`prototype-studio.prd.md:3` → `… · sliced: #202 2026-08-03 · closed 2026-08-27 · **Created:** 2026-08-03`.

**Close section** (`prototype-studio.prd.md:201`): `## Epic close — <date>`, opening sentence naming the
ticket, then bold-led paragraphs; every number labelled observed or derived; carried-forward items with a
ticket or a report each. Flush-left, no blockquotes.

**Closing note** (`prototype-studio.architecture.md:233`): `## Closing note — <date>`; resolves only what
*this* document left open; points at the PRD's section for the shipped/cut/carried record rather than
repeating it.

**Amendment entry** (`discovery-partner.prd.md:461`): bold lead sentence with the date and what changed,
then what did NOT change. The 2026-09-02 entry being carried over already has this form.

**Evidence labels** (every run report): observed (I ran it) · derived (arithmetic shown) · expected.

---

## IMPLEMENTATION PLAN

### Phase A: The worktree, and the amendment that never landed

No dependencies. Everything else assumes the ninth row exists on the branch.

### Phase B: The reads

**Depends on:** A (the packages are identical on origin/main and the shared tree — verify — so the reads
may run from the main tree's `portal/`, which has `node_modules`; the worktree does not).

### Phase C: The close-out report

**Depends on:** B. The report is written before the docs so the docs quote it, not the other way round.

### Phase D: Both docs, the README count, gates.md, the 292 report label

**Depends on:** C.

### Phase E: The epic issue, the PR, the epic close proposed

**Depends on:** D. Outward-facing edits (issue body, PR) — reversible, sanctioned by the ticket's ACs.

---

## STEP-BY-STEP TASKS

### T0 — CREATE the worktree `feature/discovery-epic-close-293` off origin/main

- **IMPLEMENT**:
  ```
  cd /Users/Berzins/Desktop/Linards_current/ux-factory
  git fetch origin
  git worktree add /Users/Berzins/Desktop/Linards_current/ux-factory-wt-293 -b feature/discovery-epic-close-293 origin/main
  ```
- **GOTCHA**: do NOT `git switch` in the shared tree — it holds unstaged edits to the same two docs that differ
  from origin/main, and the switch is refused. The current branch here
  (`feature/discovery-pre-grill-audit-292`) is squash-merged and three commits behind origin/main's docs
  (#407 moved four non-goals into `## Later, not never` and added a 2026-09-14 amendment). A worktree under
  `/Users` (not `/private/tmp`) per memory.
- **VALIDATE**: `git -C /Users/Berzins/Desktop/Linards_current/ux-factory-wt-293 log -1 --oneline` → `a174bbd` or later; `git status --short` empty.
  Observed on the shared tree: `origin/main` tip `a174bbd docs(security): … (#400) (#409)`.
- **SATISFIES**: prerequisite for all ACs.
- **REGENERATES**: none.

### T1 — UPDATE both epic docs: carry the unstaged 2026-09-02 amendment across, verbatim

- **IMPLEMENT**: from the shared tree, export the diff and apply it in the worktree:
  ```
  S=/private/tmp/claude-501/-Users-Berzins-Desktop-Linards-current-ux-factory/63cf77a0-b28c-488d-9581-ad754eb5fa09/scratchpad
  cd /Users/Berzins/Desktop/Linards_current/ux-factory
  git diff -- docs/epics/discovery-partner.prd.md docs/epics/discovery-partner.architecture.md > $S/amendment-2026-09-02.patch
  cd ../ux-factory-wt-293 && git apply --3way $S/amendment-2026-09-02.patch
  ```
  The patch holds exactly four hunks (observed): architecture header line 5 (`Sub-decision, 2026-09-02: …`),
  architecture §Missing pieces (four branches → five FACET MODULES; facet vector replaces branch selection),
  the PRD's ninth metric row after **Disclosure held**, and the PRD's 2026-09-02 amendment paragraph.
  **Content is the owner's 2026-09-02 write-back of a committed decision doc; not one word is authored here.**
- **GOTCHA**: the PRD's amendment hunk is anchored at end-of-file, and origin/main has since appended a
  2026-09-14 entry. If `--3way` conflicts, insert the 2026-09-02 paragraph BY HAND **between** the 2026-09-01
  and 2026-09-14 entries (chronological order), byte-for-byte from the patch. The row hunk and both
  architecture hunks apply clean (origin/main's architecture doc equals this branch's; observed
  `git diff HEAD origin/main -- …architecture.md` empty). Do NOT carry `agent-layer/gen-decisions.mjs`.
- **VALIDATE**: in the worktree — `grep -c 'Asked what mattered' docs/epics/discovery-partner.prd.md` → `1`;
  `grep -c 'Sub-decision, 2026-09-02' docs/epics/discovery-partner.architecture.md` → `1`;
  `grep -n '^\*\*2026-09' docs/epics/discovery-partner.prd.md` → four entries in date order (08-28, 09-01,
  09-02, 09-14). Observed today on origin/main: both counts `0`.
- **SATISFIES**: AC #1's ninth row (the amendment comment on #293); AC #3 (both docs carry the decision the
  close reads against).
- **REGENERATES**: none (`docs/` is in no loc group).

### T2 — RUN the metric read (scratch script; numbers into the report)

- **IMPLEMENT**: verify the packages match origin/main, then read every number off the fold, never off a
  report:
  ```
  cd /Users/Berzins/Desktop/Linards_current/ux-factory && git diff origin/main --stat -- discovery/ portal/lib/   # must be empty
  cd portal && node -e "
  import('./lib/discovery.mjs').then(m=>{const p=require('path');
    for (const s of ['discovery/faster-payment','discovery/partner-audit-2','discovery/later-not-never-1']) {
      const v=m.sessionView(p.resolve('..',s)); console.log(s, JSON.stringify(v.metrics)); }});"
  for d in ../discovery/*/ "/Users/Berzins/Desktop/Linards_current/Linards jobs folder/_discovery"/*/; do
    [ -f "$d/run.json" ] && node -e "const r=require(process.argv[1]);console.log(r.slug,r.provenance,r.entryMode,r.depth,r.frontEnd,r.posture,r.model,JSON.stringify(r.facets),(r.turnStats||[]).length,r.endedAt)" "$d/run.json"; done
  ```
  Also count run 1's op kinds from the transcript (`open_question` must be read, not assumed):
  `grep -o '"op":"[a-z_]*"' ../discovery/faster-payment/transcript.jsonl | sort | uniq -c` and the same for
  `partner-audit-2`.
- **PATTERN**: `.claude/reports/discovery-pre-grill-audit-run-292-report.md` §AC #6 (every figure observed
  from `run.json`, derived arithmetic shown).
- **GOTCHA**: `sessionView` needs an ABSOLUTE root. `require('…/run.json')` with a relative path fails under
  `node -e` from `portal/`; pass the path through `process.argv`.
- **VALIDATE** (observed 2026-09-14, the numbers the report must reproduce):
  - `faster-payment`: `completion {settled:22,total:22,done:true,turns:24}` · `notAForm {longest:0,tripped:false}` ·
    `weak {flagged:4,closed:24,rate:0.1667}` · `coverage {asked:12,decided:12,of:12}` ·
    `askedWhatMattered {twelve:{closed:12,decided:12,rate:1}, tail:{closed:12,decided:8,rate:0.667}, modules:["regulated"]}`
  - `partner-audit-2`: `completion {23,23,done,turns:23}` · `notAForm longest 0` · `weak {16,23,0.696}` ·
    `coverage {asked:12,decided:6}` · `askedWhatMattered {twelve rate 0.5, tail {closed:11,decided:1,rate:0.091}, modules:["hasModel"]}`
  - `later-not-never-1`: `notAForm longest 1` · `coverage 12/12` · `askedWhatMattered tail 18/19 (0.947), modules []`
  - facets across every package: only `faster-payment` (`regulated`) and `partner-audit-2` (`hasModel`) carry
    a non-null vector; `later-not-never-1` null; nine others undefined (pre-facet). Real runs in `_discovery/`:
    `my-product-name` (30 turns, 2026-08-31), `negative-control-1` (6), `run0-2026-09-02` (30, ended
    `2026-09-02T17:05:20Z`), `test2` (0) — **all `frontEnd: portal`**. `partner-audit-2` is `frontEnd: terminal`
    (the API loop; sanctioned by #292's plan).
- **SATISFIES**: AC #1 rows Completion · Independent reach · Marginal reach · Gap finding · Auditability ·
  Not a form · Asked what mattered.
- **REGENERATES**: none.

### T3 — RUN the disclosure re-measure (scratch script)

- **IMPLEMENT**: from the worktree root:
  ```
  node -e "
  const fs=require('fs'),p=require('path'),os=require('os');
  const dirs=[p.join(process.cwd(),'.claude/skills'),p.join(os.homedir(),'.claude/skills')];
  const seen=new Map();
  for(const d of dirs) for(const n of fs.readdirSync(d)){const f=p.join(d,n,'SKILL.md');if(!fs.existsSync(f)||seen.has(n))continue;
    const m=fs.readFileSync(f,'utf8').match(/^description:\s*(.*)$/m);seen.set(n,(m?m[1]:'').split(/\s+/).filter(Boolean).length);}
  const w=[...seen.values()].reduce((a,b)=>a+b,0);
  const c=fs.readFileSync('CLAUDE.md','utf8').split(/\s+/).filter(Boolean).length;
  const disc=fs.readFileSync('CLAUDE.md','utf8').split('\n').filter(l=>/^discovery\/|^- \*\*New discovery/.test(l)).join(' ').split(/\s+/).filter(Boolean).length;
  console.log({claudeWords:c, claudeTokens:Math.round(c*1.33), discoveryWords:disc, discoveryTokens:Math.round(disc*1.33),
    skills:seen.size, descWords:w, descTokens:Math.round(w*1.33), likeForLike:Math.round(c*1.33)+seen.size*80, measured:Math.round(c*1.33)+Math.round(w*1.33)});"
  ```
  1.33 tokens/word is the baseline's own ratio (derived: 9.5k − 73×80 = 3,660 tokens over 2,761 words).
- **GOTCHA**: the baseline's "73 skill descriptions" is not reproducible from disk — the 20 PIV skills were
  archived out of `~/.claude/skills` on 2026-08-28 (`~/.claude/_skills-archive-2026-08-28/README.md`), and the
  ~17 built-in skills a session lists (design, dataviz, code-review, …) have no `SKILL.md` on disk. Report the
  on-disk number, then an upper bound adding 17 × 80 for the built-ins, and say the baseline's method is an
  estimate the re-measure cannot exactly reproduce. Do not round toward the baseline.
- **VALIDATE** (observed 2026-09-14): `claudeWords 3302` (baseline 2,761) · `claudeTokens 4392` ·
  `discoveryWords 456` → `discoveryTokens 606` (**inside** the PRD's 400–650 estimate) · `skills 50` ·
  `descWords 2751` · `descTokens 3659` · `likeForLike 8392` · `measured 8051`; + 17 built-ins × 80 = 9,411
  upper bound. All under the 11k ceiling.
- **SATISFIES**: AC #1 row Disclosure held.
- **REGENERATES**: none.

### T4 — RUN the C1 control check and the WRONG-condition check

- **IMPLEMENT**:
  ```
  stat -f '%Sm %N' ~/.claude/skills/think/SKILL.md ~/.claude/skills/grill-me/SKILL.md
  ls ~/.claude/_skills-archive-2026-08-28/ | grep -c '^think$'          # 0 = think was never archived
  find /Users/Berzins/Desktop/claude-code-second-brain/Fredis/Memory/thinking -name '*.md' -newermt 2026-08-27 | sort
  ```
  The vault path is `~/.claude/skills/think/SKILL.md:11` (no `FREDIS_VAULT` set; observed).
- **VALIDATE** (observed 2026-09-14): `think/SKILL.md` mtime `2026-08-27 09:59` (the grill's own day — Q1 asks
  the owner whether that edit predates the grill); `grill-me/SKILL.md` `2026-07-26`; `think` not in the
  archive (`0`); exactly one vault think doc since the grill,
  `thinking/2026-08-28-component-system-backend-seam.md` — its frontmatter question is the handoff seam for
  ux-factory (context `ux-factory`, tags `handoff, data-contract`), a repo design decision, not a product
  discovery.
- **SATISFIES**: AC #2 (the WRONG condition and C1).
- **REGENERATES**: none.

### T5 — CREATE `.claude/reports/discovery-epic-close-293-report.md`

- **IMPLEMENT**: the record, in this order, every number from T2–T4 labelled observed/derived:
  1. **Header**: plan path, branch, base SHA, status.
  2. **The metric read, row by row** — one table, nine rows: metric · target (quoted from the PRD) · observed ·
     verdict (met / not met / reported / not yet tested) · where. The verdicts this evidence supports:
     - **Switch** — first half observed: `run0-2026-09-02` (`real`, `frontEnd: portal`, 30 turns, one sitting)
       and the owner's one-word answer "UI" (#338 report AC3). Cobra half: **not yet tested** — no session in
       `_discovery/` after 2026-09-02; run 0 was itself a ticketed sitting, so whether it counts as
       "unprompted" is the owner's call (Q2). No proxy.
     - **Completion** — met: run 1 22/22, `done`, 24 turns, 15.2 min, `prd.md` 12 sections; twelve-set
       coverage 12/12 asked, 12/12 decided (the guardrail reported with it).
     - **Independent reach** — met at the target, **as an upper bound**: 4/4 (m-005 ← seq 3, m-006 ← seq 6,
       m-007 ← seq 6, m-008 ← seq 14) and one kill-criterion match (seq 15 ↔ m-008 `would_measure`), per
       the #291 report; the answerer wrote the key.
     - **Marginal reach** — **not taken as specified**: the sealed file is agent-written and says so, so the
       diff measures the bank against an agent baseline. Report the two lists the #291 report gives
       (five reached beyond the seal · four the seal had) and the pattern "better at the world, worse at the
       ladder". Cause: plan T6's rule not followed (F6). Cannot be re-taken for run 1.
     - **Gap finding** — 0/8 found, 3 partial; reachable 0/5 found, 2 partial (rubric committed 12 min before
       `startedAt`). A reading of the pairing Grill `ba124c3c…` on `claude-opus-5`, never of the design
       alone. The mechanism: the audit files per-question absences (16 `flag_weak_answer`); the human grill
       found contradictions, presuppositions and unspecified entries. Finding 6 is the one verdict the owner
       may move (Q2).
     - **Auditability** — **not met, in both runs, on the URL clause**: run 1 six `file_evidence` rows all
       `url: null`, seq 13 `secondary-source` with no URL, 15/20 decisions unbacked; run 2 nine rows all
       `url: null`, seq 25 `secondary-source` (HAX, PAIR) with no URL, 0/7 unbacked, 2 unrooted. Wrong-if:
       20/20 and 7/7 present (run 2's all paraphrased, none authored). Provenance labels: structural — the
       applier refuses a label outside the four. Cause in run 1: the look-up text typed into the answer box
       (F5); in run 2 the affordance had no off-script turn to fire from.
     - **Not a form** — met: longest streak 0 (run 1), 0 (run 2); the weak-flag rate reported beside it,
       0.167 and 0.696; `later-not-never-1` longest 1, the only committed package above 0.
     - **Disclosure held** — met: T3's numbers; the discovery lines cost ≈606 tokens against the 400–650
       estimate; the 73-skill baseline is not reproducible (say why).
     - **Asked what mattered** — reported: run 1 twelve 1.0 vs tail 0.667 (8 of 12 closers; two questions
       re-asked on a repeat flag), `regulated` only; run 2 (an audit, so "decided" means the document
       answered) twelve 0.5 vs tail 0.091, `hasModel` only; `internal`, `orgBuys`, `replacesAProcess`
       **not yet tested** — three, not the ticket's "four": five facets less the two that fired.
  3. **The hypothesis, answered in its own terms** — RIGHT: both clauses observed (run 0 in the UI; run 1 to
     a PRD in one sitting). WRONG condition: **not tripped** — one `/think` doc in the vault since the grill,
     on a repo design question, no product. **C1 holds**: T4's evidence, with Q1 on the 09:59 mtime.
     What the reading cannot say: the second unprompted session.
  4. **What survived — open questions, stated once**: three facets untested · marketplace as a fifth preset ·
     deterministic pre-checks · confirm-the-receipt (run 0's F9: on 25 of 30 turns no prose to falsify
     MVP 6; `JUDGEMENT_RULE` now reaches Grill and Create PRD, not Think — `discovery-postures.mjs:34`) ·
     the `unstable_v2_*` session API · whether the scripted bank beats open conversation (runs 0 and 1
     finished 30/30 and 22/22 with 0 off-script turns; no conversation control was run, so unanswered) ·
     the unguarded deadline (2026-09-30 check-in stands). Plus the items the run tickets routed here, each
     with its evidence line: the transition-rung misuse (seven of run 1's 20 decisions at `transition`;
     observed on three packages) · the look-up drawer gap (run 1 F5) · the marginal-reach metric not taken
     (F6) · #287's run-2 fence receipt no longer reproducible (bank past the Read cap) · ABSENT never fired
     (0 `open_question` in runs 0, 1 and 2) · one falsifier re-filed as three `wrong_if`s (run 2 seq 4, 8,
     19) · `MAX_TURNS` admitting four tool calls (run 0 F10) · the non-URL evidence route on a blank idea
     (F11) · a downloaded PRD landing in the repo tree (F12). "Raised during the epic" finding: every one of
     #341, #343, #347, #349 was a defect no CI group could see — the epic body's own line, now confirmed.
  5. **What wave 2 inherits, stated once**: the canvas (D6) and component import (D7) → epic #295
     (`canvas-design-import.prd.md`) · the guest path (D1) — a different build, not a deployment: per-guest
     spend caps cannot be metered against a subscription token, so it needs an API key, a budget ledger and
     a server-side runtime · D11's a11y gating — #271 closed for shipped pages; the portal stays gated by
     review, by decision · D19's replace-then-remove · wiring elicited quality attributes into build-checks
     · a rung between full discovery and the whole bank for a product ticking three or more facets
     (question-selection §Deferred).
  6. **The epic issue's task list** — the rows ticked and the one left (#293, ticks on merge).
  7. **Validation results**, **Not run** (the owner-only rows), **Deviations**.
- **PATTERN**: `.claude/reports/discovery-pre-grill-audit-run-292-report.md` (labels, tables, the
  "reading of this pairing" sentence).
- **GOTCHA**: no blockquotes for handed-over text; state a miss as a miss. The 0/8 line and the failed
  auditability row are the two the reader will look for first — put them in the table, not a footnote.
- **VALIDATE**: `grep -c '^| \*\*' .claude/reports/discovery-epic-close-293-report.md` ≥ 9 (nine metric rows);
  a slop grep over the report returns nothing:
  `grep -n -i -w -E 'delve|leverage|utilize|robust|comprehensive|seamless|streamline|empower|foster|enhance|elevate|pivotal|holistic|crucial|vital|furthermore|moreover|ultimately|compelling|meticulous|unlock|unveil|craft|hone|harness|navigate|resonate' .claude/reports/discovery-epic-close-293-report.md` → empty.
- **REDDENS**: insert `seamless` into the report → the grep prints the line.
- **SATISFIES**: AC #1, #2, #4, #5 (the record); AC #3's source.
- **REGENERATES**: none.

### T6 — UPDATE `docs/epics/discovery-partner.prd.md`: the `closed` rung + `## Epic close — <date>`

- **IMPLEMENT**: (1) status line: after `sliced: #279 2026-08-27` insert ` · closed <YYYY-MM-DD>` (the PR
  date). (2) New section `## Epic close — <date>` **between** `## Architecture` and `## Amendments`, mirroring
  `prototype-studio.prd.md:201`: what shipped (fourteen tickets + the thirteen raised, one line per wave);
  the nine-row metric table condensed to metric · verdict · one evidence phrase (the full read lives in the
  report — link it); the hypothesis verdict in three sentences (RIGHT clauses, WRONG not tripped, C1 holds,
  second session not yet tested); open questions survived (the list from T5 §4, one line each); wave 2
  inherits (T5 §5, one line each). (3) §Open questions: tick `How the postures are expressed in code`
  (closed by architecture → `portal/lib/discovery-postures.mjs`) and reword nothing else; the rest stay
  `[ ]` because they are open. (4) Append one amendment entry dated the same day: bold lead "epic closed
  by #293; the ninth row read; nothing in the MVP, thesis or non-goals changed."
- **PATTERN**: `prototype-studio.prd.md:1–3, 201–260`; amendment form at `discovery-partner.prd.md:461`.
- **GOTCHA**: the status regex is exact — one space either side of every `·`, `closed` lowercase, ISO date.
  `## Later, not never` (#407) sits before `## Open questions`; do not move it. Flush-left prose.
- **VALIDATE**:
  `grep -E '^\*\*Status:\*\* intent( · grilled [0-9]{4}-[0-9]{2}-[0-9]{2})? · architecture: (TBD|decided [0-9]{4}-[0-9]{2}-[0-9]{2}|folded [0-9]{4}-[0-9]{2}-[0-9]{2}) · sliced: (TBD|#[0-9]+ [0-9]{4}-[0-9]{2}-[0-9]{2})( · closed [0-9]{4}-[0-9]{2}-[0-9]{2})? · \*\*Created:\*\* [0-9]{4}-[0-9]{2}-[0-9]{2}$' docs/epics/discovery-partner.prd.md` → one line containing `closed`;
  `grep -n '^## ' docs/epics/discovery-partner.prd.md` → `Epic close` between `Architecture` and `Amendments`;
  the T5 slop grep over the PRD's new section → empty.
- **REDDENS**: write `closed 14-09-2026` → the regex grep prints nothing.
- **SATISFIES**: AC #3 (PRD half), AC #4.
- **REGENERATES**: none.

### T7 — UPDATE `docs/epics/discovery-partner.architecture.md`: `## Closing note — <date>`

- **IMPLEMENT**: append after the italic sign-off (:420–425), mirroring `prototype-studio.architecture.md:233`.
  Resolve only what this doc left open: approach C survived (the honesty line held structurally —
  `answer_ref` never carried text; the one MVP 6 breach class observed was prose-side, run 0's F9, and it is
  addressed for two postures by `JUDGEMENT_RULE`); the read fence held on both runs (0 built-in denials
  under `MAIN_TOOLS = []`; the fence probes' receipts); the model call (Grill on Opus is a pairing reading,
  0/8); the four `[ ]` open questions each get one sentence (pre-checks · receipt · `unstable_v2_*` ·
  carried) with their status, and the carried line is corrected to **three** facets; the wave-2 inheritance
  points at the PRD's section rather than repeating it. Point at the report for the numbers.
- **GOTCHA**: this doc's §Open questions keeps its checkboxes; `[x]` only the projection row (already
  `[x]`). The `Sub-decision` header line from T1 must be present before this note references it.
- **VALIDATE**: `grep -n '^## Closing note' docs/epics/discovery-partner.architecture.md` → one line, last `##`
  in the file; the T5 slop grep over the note → empty.
- **SATISFIES**: AC #3 (architecture half), AC #4.
- **REGENERATES**: none.

### T8 — UPDATE `discovery/README.md:365` (the facet count), `.claude/references/gates.md:90` (L1), and the #292 report line 140 (L2)

- **IMPLEMENT**: (1) README: "Known debt — **four** unexercised facets" → "three", and end the paragraph with
  one sentence: "#293 read it: `regulated` (run 1) and `hasModel` (run 2) fired; the three are not yet
  tested." (2) gates.md:90: after "run 2's (a fixture under `docs/epics/fixtures/`, the key one directory
  above it, the package as cwd)" add the clause " — the pre-#286 shape, strictly wider than the run's own
  `reads: []` set, so its deny transfers". (3) the #292 report :140: "3 `PreToolUse.deny`" → "3 deny events:
  2 `PreToolUse.deny`, 1 `canUseTool.deny`". A report is prose, not a transcript; the review asked for it.
- **GOTCHA**: `README.md:365` is a prose paragraph, not a package file — the honesty rules forbid editing
  `discovery/<slug>/*`, not the README. Nothing else in `discovery/` is touched. Check `grep -c 'four
  unexercised' discovery/README.md` before editing (a sibling may have fixed it).
- **VALIDATE**: `grep -c 'three unexercised facets' discovery/README.md` → `1`; `grep -c 'pre-#286 shape' .claude/references/gates.md` → `1`;
  `grep -c 'canUseTool.deny' .claude/reports/discovery-pre-grill-audit-run-292-report.md` ≥ `1`; `node tooling/build-checks.mjs` → `build ✓  all 34 groups pass` (README prose is not pinned; observed green on the current tree).
- **SATISFIES**: AC #4 (the surviving-questions count is right everywhere it is printed); PR #406 L1, L2.
- **REGENERATES**: none.

### T9 — RUN the gates (from the worktree) + a portal smoke (from the main tree)

- **IMPLEMENT**:
  ```
  cd /Users/Berzins/Desktop/Linards_current/ux-factory-wt-293
  node tooling/build-checks.mjs && node tooling/drift-check.mjs && node tooling/token-lint.mjs && node agent-layer/gen-loc-summary.mjs --check
  cd /Users/Berzins/Desktop/Linards_current/ux-factory/portal && PORT=4799 node server.mjs & PID=$!; sleep 2; curl -s http://127.0.0.1:4799/api/health; kill $PID
  ```
- **GOTCHA**: kill by PID only, never `pkill -f 'node server.mjs'` (memory: sibling recorders). The worktree
  has no `portal/node_modules`; the smoke runs from the main tree, whose `portal/lib` equals origin/main's
  (T2 verified). `drift-check` syntax-checks every tracked `.mjs` including `.claude/plans/` — this plan adds
  none.
- **VALIDATE** (observed on the current tree 2026-09-14): `build ✓  all 34 groups pass` ·
  `drift-check ✓  syntax · token-css · … · group-count` · `loc summary ✓  3 groups — no drift`; token-lint
  `✓ 63 contract tokens · 0 undeclared · 0 orphan` (per the #292 report; re-run). `/api/health` → `{"ok":true,…}`.
- **SATISFIES**: the "all gates green" AC; memory `piv-skills-python-tuned` (run verify even on docs-only PRs).
- **REGENERATES**: none.

### T10 — UPDATE epic issue #279's body: the task list

- **IMPLEMENT**: `gh issue view 279 --json body --jq .body > $S/epic279.md`; tick `#283 #285 #286 #288 #289
  #291 #292 #338 #348 #352 #353 #359 #360` (all CLOSED; observed via `gh issue list`), replace #338's
  parenthetical with "the sitting ran 2026-09-02 — `run0-2026-09-02`, 30 of 30, `frontEnd: portal`; RIGHT"
  and #283/#285/#286/#288/#289's "deferred" notes with "landed after Run 0 (PR #… )" — the PR numbers from
  `gh pr list --state merged --search "<n>"`; leave `#293` unticked with "(this PR; ticks on merge)". Add a
  dated line under `## Tickets`: "**2026-09-<dd> — closed by #293**; the metric read is in
  `.claude/reports/discovery-epic-close-293-report.md`". Then `gh issue edit 279 --body-file $S/epic279.md`.
- **GOTCHA**: the body embeds the PRD text above `## Tickets`; do not touch anything above that header.
  Outward-facing but reversible (the old body is in the scratch file — keep it).
- **VALIDATE**: `gh issue view 279 --json body --jq .body | grep -c '^- \[ \]'` → `1` (only #293).
- **REDDENS**: n/a (no check added).
- **SATISFIES**: AC #5.
- **REGENERATES**: none.

### T11 — CREATE the PR + propose the epic close

- **IMPLEMENT**: from the worktree, stage by explicit path (the two docs, README, gates.md, the #292 report,
  this plan, the close report); one commit
  `docs(discovery): epic close-out — the nine-row metric read, the hypothesis RIGHT, closing notes in both docs (#293)`;
  `piv-create-pr` with `Closes #293` in the BODY; `piv-review-pr`; the review file in the same PR. After merge:
  propose closing #279 to the owner (their click), and `git worktree remove` the wt-293 dir.
- **VALIDATE**: `gh pr view --json body --jq .body | grep -c 'Closes #293'` → `1`.
- **SATISFIES**: bookkeeping for every AC; CLAUDE.md §Git.
- **REGENERATES**: none.

---

## TESTING STRATEGY

No suite (CLAUDE.md). "Done" = the surface touched ran: the four CI verify commands green on the worktree,
the portal boots and `/api/health` answers, every number in the report re-derived by T2–T4's commands, and
the status regex matches.

### Unit-level
`node tooling/build-checks.mjs` — unchanged code, so 34 groups must stay green; the README and gates.md
prose are not pinned by any case (checked: no build-checks case greps `four unexercised` or `run 2's shape`).

### Integration-level
`piv-review-pr`'s fresh-eyes re-derivation of every figure from `run.json` / `transcript.jsonl` (the #406
review's "numbers pass" table is the precedent).

### Edge Cases
- The 09-02 amendment patch conflicting at EOF (T1 GOTCHA) — insert in date order by hand, verbatim.
- A sibling session having already fixed README:365 or gates.md:90 — check before editing.
- `sessionView` with a relative path — throws; absolute only.
- The disclosure count: the baseline's 73 is not on disk; report the on-disk number and the built-in upper
  bound, never a number picked to sit near 9.5k.

### Proving the checks
This plan adds no gate. The checks it adds are greps (T5, T6, T8, T10) and each carries its reddening
mutation in-line. Positive controls: the status regex matched `prototype-studio.prd.md:3` (observed, the
one existing `closed` line) — run it there first.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
`node tooling/drift-check.mjs` (syntax-checks every tracked `.mjs`; none added).
The slop grep from T5 over the three new prose blocks.

### Level 2: Pure gates
`node tooling/build-checks.mjs` · `node tooling/token-lint.mjs` · `node agent-layer/gen-loc-summary.mjs --check`

### Level 3: The reads reproduce
T2's `sessionView` line → the three metric objects above, byte-for-byte on the numbers.
T3's script → `claudeWords 3302`, `skills 50`, `measured 8051` (until CLAUDE.md or a skill changes; if a
number moved, the report states the new one and why).

### Level 4: Manual
The status regex (T6) · the `## ` outline of both docs · `/api/health` on 4799 · the epic body's one
remaining `[ ]`.

### Level 5: Additional
`piv-review-pr` re-derives every figure in a clean worktree at the PR head.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Q1 — confirm `think/SKILL.md`'s 2026-08-27 09:59 edit predates the grill (C1) | owner's hand | no — the report records the mtime and the question | recorded in the close-out; the closing note says "owner to confirm" |
| Q2 — confirm run 0 counts as the "next real discovery session" (it was #338's ticketed sitting) and confirm run 2's finding-6 verdict | owner's hand | no — Switch reads "first half observed, second half not yet tested" either way | recorded |
| Closing epic #279 on GitHub | owner's click | no | proposed in the PR body |
| Any re-run (marginal reach as specified; run 2 on another model) | $1–3 each | no — explicitly not this ticket | recorded as not taken, with the reason |

---

## ACCEPTANCE CRITERIA

- [ ] AC1 — the nine-row metric read, each row with observed evidence and a verdict that does not round a
      miss into a pass: Switch (first half observed via `run.json.frontEnd` + #338; second half "not yet
      tested") · Completion (met, with twelve-set coverage) · Independent reach (4/4, ≥1, as an upper bound) ·
      Marginal reach (reported; not taken as specified) · Gap finding (0/8, 3 partial; reachable 0/5) ·
      Auditability (not met on the URL clause in both runs) · Not a form (met) · Disclosure held (re-measured,
      under 11k) · Asked what mattered (reported for run 1 and run 2; three facets not yet tested).
- [ ] AC2 — the hypothesis answered in its own terms: RIGHT on both clauses; the WRONG condition not tripped
      (the vault check); C1 confirmed still true (with Q1 flagged).
- [ ] AC3 — a closing section in the PRD and a closing note in the architecture doc, the survived open
      questions listed once (three facets, marketplace, pre-checks, receipt, `unstable_v2_*`, bank vs
      conversation, the deadline, plus the routed items).
- [ ] AC4 — wave 2's inheritance stated once (D6/D7 → #295, D1 as a different build, D11, D19, the
      quality-attribute wiring, the three-facet rung).
- [ ] AC5 — epic #279's task list ticked or explained; the 2026-09-02 amendment landed on `main`.
- [ ] All four verify commands green; portal smoke answers; PR carries `Closes #293`; plan + report + review in
      the PR.

---

## COMPLETION CHECKLIST

- [ ] Worktree cut from `origin/main`; the shared tree's unstaged edits carried by patch, not by switch
- [ ] Every number in the report re-derived this session (T2–T4), labelled observed/derived
- [ ] No file under `discovery/<slug>/` or `docs/epics/fixtures/` touched (`git diff --stat` shows none)
- [ ] Status regex matches; closing sections flush-left; slop grep empty
- [ ] Owner-only rows in the report's Not run table, not answered on the owner's behalf
- [ ] Epic body edited below `## Tickets` only; old body kept in scratch
- [ ] Plan, report, review in the PR; `Closes #293` in the body

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (owner)** — `~/.claude/skills/think/SKILL.md` was last modified 2026-08-27 09:59, the grill's day.
  Assumption: the edit predates the grill and the terminal has been unmodified since. The report records
  the mtime either way; if the edit was later, C1's line reads "modified once, on the grill day, before any
  run" — still a control, and the note says so.
- **Q2 (owner)** — Does run 0 (a ticketed sitting) count as the hypothesis's "next real discovery session"?
  The #338 report already recorded the owner's "UI"; this plan reads the first half as observed and the
  cobra half as not yet tested. And run 2's finding 6: the #292 report flagged it as the one verdict the
  owner may move to FOUND; the read stays PARTIAL unless the owner says so.
- **Q3 (owner)** — Follow-up tickets for the surviving debt (transition rung, look-up gap, ABSENT, the
  re-filed falsifier, `MAX_TURNS`, non-URL evidence, download location)? Default: recorded in the closing
  note with evidence, no tickets opened — opening them is scope the ticket does not ask for.
- **A4** — "Three facets not yet tested", not the ticket's "four": five facets, `regulated` fired on run 1 and
  `hasModel` on run 2 (observed from the packages' `facets`). The ticket's amendment was written on
  2026-09-02, before either run.
- **A5** — Run 2's `frontEnd: terminal` does not bear on Switch: Switch is about the owner's real session,
  and run 2 was a scored fictional audit driven by the plan's API loop by the owner's delegation.
- **A6** — The disclosure baseline's method cannot be reproduced exactly; the report shows the arithmetic
  for both the like-for-like and the measured figure and says which is which.
- **A7** — The 2026-09-02 amendment patch is the owner's write-back of a committed decision; carrying it
  verbatim is not authoring.

## NOTES (open canvas)

**Pre-flight, run 2026-09-14 on the shared tree at `0e27afb` (origin/main `a174bbd`).**

- **P1 — the 2026-09-02 amendment never landed.** `git show origin/main:…prd.md | grep -c 'Asked what
  mattered'` → `0`; same for `Sub-decision` in the architecture doc. The unstaged diff on the shared tree is
  four hunks and the #396 plan noted it "has sat unstaged since 2026-09-02". Every reader of #293 (the
  ticket's amendment comment, `discovery/README.md:365`, question-selection §D4) assumes the row exists.
  → T1 added; AC5 widened to "landed on main".
- **P2 — origin/main moved past this branch's docs.** #407 (house shape) rewrote the PRD's status line,
  §Scope, moved four non-goals into `## Later, not never` and added a 2026-09-14 amendment. A `git switch`
  from the shared tree is refused by the unstaged edits. → T0 uses a worktree; T1's patch has an EOF hunk
  that may need hand placement.
- **P3 — the facet count is three, not four.** `run.json.facets` across all fifteen packages: only
  `faster-payment` (`regulated:true`) and `partner-audit-2` (`hasModel:true`) carry a non-null vector.
  README:365's headline says four while its own sentence lists three. → T8, A4.
- **P4 — `sessionView` takes an absolute root.** `sessionView('discovery/faster-payment')` threw
  `no run.json under "discovery/faster-payment"`; `path.resolve('..', s)` works. → T2 GOTCHA.
- **P5 — the numbers, observed today** (T2's VALIDATE): run 1 tail 8/12 closers at 0.667 with two questions
  re-asked; run 2 tail 1/11; later-not-never-1 is the only committed package with a non-zero not-a-form
  streak (1). Run 1's transcript holds 0 `open_question` (30 ops = 20 + 6 + 4) — ABSENT never fired on
  runs 0, 1 and 2.
- **P6 — disclosure.** CLAUDE.md 3,302 words (was 2,761); the four discovery lines are 456 words ≈ 606
  tokens, inside the 400–650 estimate. On disk: 50 skills, 2,751 description words. The 73 in the baseline
  is not on disk — the PIV skills were archived on 2026-08-28 and built-ins have no file. Both the
  like-for-like (8,392) and measured (8,051) figures sit under 11k; the built-in upper bound (9,411) too.
- **P7 — the hypothesis's RIGHT reading already exists** in `.claude/reports/discovery-run-0-338-report.md:302`
  ("UI", one word, 2026-09-02) and `run0-2026-09-02/run.json` has `frontEnd: portal`. The WRONG check: the
  vault's `thinking/` holds one doc since the grill, dated 2026-08-28, a repo design decision (the handoff
  seam), not a product. C1: `think/SKILL.md` mtime 2026-08-27 09:59 (Q1); `think` was not in the 08-28
  archive; `grill-me` untouched since 2026-07-26.
- **P8 — the epic body** (`gh issue view 279`) still shows #283, #285, #286, #288, #289, #291, #292, #293,
  #338, #348, #352, #353, #359, #360 unticked; all but #293 are CLOSED. The body's #338 line says the
  sitting "has not happened" — it happened three hours after that amendment. → T10.
- **P9 — PR #406's two low findings** (L1 gates.md label, L2 the report's deny-site label) were approved
  "to land with #293". → T8.
- **P10 — run 0's F9 is half-addressed**: `discovery-postures.mjs:34` — `JUDGEMENT_RULE` reaches Grill and
  Create PRD, not Think (a Think edit re-records seven fixtures). Belongs in the surviving list beside
  confirm-the-receipt, which it bears on.
- **Gates on the current tree**: `build ✓ all 34 groups pass` · `drift-check ✓ …group-count` · `loc summary ✓
  3 groups — no drift` (observed). No `.mjs` is added, so nothing regenerates.

**Why the reads run from the main tree's portal and not the worktree's:** the worktree has no
`portal/node_modules`, `discovery.mjs` imports the SDK adapter, and `git diff origin/main --stat --
discovery/ portal/lib/` is empty — same bytes, no `npm ci`.

**Why no follow-up tickets by default:** #223's plan created tickets inside its Phase D decision rule; this
ticket's AC asks to "say plainly which questions are still open". Saying is in scope; filing is the owner's
(Q3). The list is written so each item can become a ticket by copying its line.

**Rejected: a committed `tooling/disclosure.mjs`.** One number, once, for a close-out; a tracked script adds a
file drift-check syntax-checks forever. The scratch script's source is in T3, reproducible by anyone.

**Rejected: re-taking marginal reach with an owner-written seal.** The owner has read the run; the seal
would no longer be unaided. The #291 report says the same; the metric is reported as not taken.

## AMENDMENTS

<!-- append-only after first approval; newest at the bottom -->

- **2026-09-14 (implementation)** — T1 VALIDATE expected `grep -c 'Asked what mattered'` → `1`; it is `2` on both the
  shared tree and the worktree, because the metric row and the 2026-09-02 amendment paragraph each carry the phrase
  and `grep -c` counts lines. The intent (the row exists) holds. Corrected expectation: `2`.
- **2026-09-14 (implementation)** — T10 VALIDATE expected `grep -c '^- \[ \]'` over the whole body → `1`; the body
  embeds the PRD's §Open questions above `## Tickets` (seven `[ ]` items the task does not touch), so the unscoped
  count is `8`. Corrected command: `… | sed -n '/^## Tickets/,$p' | grep -c '^- \[ \]'` → `1`.
- **2026-09-14 (implementation)** — T9 GOTCHA omitted that `drift-check` needs `tooling/style-dictionary/node_modules`,
  which a fresh worktree lacks; `npm ci` there first (memory `local-agent-visual-gate-notes`).
