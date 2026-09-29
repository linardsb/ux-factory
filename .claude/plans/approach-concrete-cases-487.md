# Feature: approach.html names "start with concrete cases" as the reason the scenarios are concrete (#487)

The following plan should be complete, but validate the citations and the tree state before you start.
This is a copy-only change to one shipped page, followed by the regenerated outputs that copy change moves.

## Feature Description

`approach.html` explains the method and the token-contract case study, but it never says why the site's
worked examples (Verdant, Fieldwork, Faster Payment) are single, specific cases instead of general products.
This ticket adds one paragraph that gives the reason (Ryan Singer's "start with concrete cases"), names what
each scenario covers and what it deliberately leaves general, and cites the source without implying he endorses
the site.

## User Story

As a hiring manager reading `/approach`
I want to see why the demos are narrow
So that I read the narrowness as a scoping decision, not as a gap in the work

## Problem Statement

A reader who meets Verdant (one screen) or Fieldwork (one screen) cannot tell whether the narrowness is
intended. The page says nothing about it (observed: `grep -n -i -E 'verdant|fieldwork|faster|scenario' approach.html`
returns zero lines on `origin/main`).

## Solution Statement

One `<p>` appended to the `#method` band, after the four-card grid, using only existing classes
(`muted max-prose mt-2xl`). It names each scenario, labels all three fictional, states per scenario what is
concrete and what is left general (every claim copied from a committed record, cited below), and gives the
reason with the source named. No new CSS, no new glossary term, no new control. Then regenerate the three
approach VR baselines and confirm `loc-summary.json` does not drift.

## Out of Scope / Non-Goals

- Not included: a new band, card or heading. The ticket asks for one passage, and a fifth card would sit alone in `grid-2`.
- Not included: a `<dfn class="term">` for "concrete case". An unknown `data-term` makes `initGlossary` throw (approach.html:257-258), and adding it to `system/glossary.mjs` moves the runtime loc group (see NOTES).
- Not included: a link to Singer's post. No URL exists in the issue, in #486 or in its plan (see Q1).
- Not included: surfacing Faster Payment on any shipped page beyond this one sentence and its GitHub link.
- Not changing: the `#case` id (`work.html:433` links to `/approach#case`), the `#sources` list, any other page.

## Feature Metadata

**Feature Type**: Enhancement (copy)
**Estimated Complexity**: Low
**Primary Systems Affected**: `approach.html`, `tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png`
**Dependencies**: Docker (for `update:docker`), no npm additions

## Related Work

**Implements**: #487 (standalone; no open epic owns approach copy, per the issue)

**Back-references**:

- `.claude/plans/as-is-ground-truth-486.md` - Why: cites the same Singer post with no URL and records it as "Ryan Singer, via #486" plus a Q1 for the URL (lines 113, 574). This plan mirrors that handling.

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — read before implementing

- `approach.html:61-125` - the `#method` band; the paragraph goes after the grid's closing `</div>` at line 123 and before the container's `</div>` at line 124.
- `approach.html:204-235` - `#sources`, which already names "Shape Up (Ryan Singer / Basecamp)" at :215. The new passage does not add Singer to the sources list; he is already there.
- `approach.html:18-31` - the page `<style>`; nothing to add (the new paragraph has no id, so no `scroll-margin` rule is needed).
- `work.html:238`, `work.html:249` - the existing links `href="/proto/verdant.html"` and `href="/proto/fieldwork.html"`. Mirror them exactly.
- `system/components.css:123` (`.muted`), `:615` (`.mt-2xl`), `:621` (`.max-prose` 65ch) - the three classes used.
- Sources for each factual claim in the copy (all fictional records, all committed):
  - `scenarios/verdant/brief.md:28` - one named persona, Rita, eleven plants.
  - `scenarios/verdant/brief.md:42` - the one behaviour, the **daily check-in**.
  - `scenarios/verdant/proto.config.json:4` - one screen, `plant-overview`.
  - `scenarios/fieldwork/brief.md:27` - users are "Dispatchers and technicians"; persona Kaspars is the dispatcher.
  - `scenarios/fieldwork/proto.config.json:4` - one screen, `dispatch-board` (the technicians' side has none).
  - `scenarios/fieldwork/intake.defaults.json:8` - "keeps the product a board, not a suite".
  - `discovery/faster-payment/run.json:4` - `"label": "Real run — fictional scenario"`.
  - `discovery/faster-payment/prd.md:363-366` (seq 23) - scope: paying a new payee, close-match/no-match names, joint accounts; refused for this release: international and business payments.
- `.claude/skills/portfolio-design/references/CHECKLIST.md` - run it before committing (shipped-page copy).

### New Files to Create

None. Plan, report and review files go in `.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/` per CLAUDE.md §Git.

### Relevant Documentation

- Ryan Singer's post on what to define before hiring a developer — no URL on record (Q1). The issue's summary of it: narrow v1 to the specific cases that matter now, generalise after they are solved, because every added "if" multiplies complexity.
- `.claude/references/gates.md` - the VR gate section, before trusting a green run.

### Patterns to Follow

**Paragraph markup** (mirrors the page's own `muted` paragraphs, e.g. approach.html:215):

```html
<p class="muted max-prose mt-2xl">…</p>
```

**Internal links**: root-relative with `.html`, as `work.html:238`. **External link**: plain `<a href="https://…">`,
as `contact.html:36`.

**Voice**: British English, sentence case, first person where the page uses it ("I run all four…"), no slop words
(`~/.claude/skills/_shared/slop-blacklist.md`). The page uses em dashes sparingly; the draft below uses none.

---

## IMPLEMENTATION PLAN

### Phase 1: Branch

Current checkout is `fix/importer-reads-icon-name-449` with a dirty tree (untracked review and plan files). Work
from `origin/main` on a new branch.

### Phase 2: Copy

Insert the paragraph.

### Phase 3: Regenerate and verify

`loc-summary.json` check (expected: no drift), VR baselines regenerated from a clean worktree, CI `verify` gates.

---

## STEP-BY-STEP TASKS

### Task 1 — CREATE branch `docs/approach-concrete-cases-487` from `origin/main`

- **IMPLEMENT**: `git fetch origin && git switch -c docs/approach-concrete-cases-487 origin/main`. The untracked files carry over untouched; stage only by explicit path from here on.
- **GOTCHA**: parallel sessions share this working dir (memory: shared-worktree-parallel-sessions). Re-check `git branch --show-current` right before each commit.
- **VALIDATE**: `git branch --show-current && git log --oneline -1` → `docs/approach-concrete-cases-487` and the `origin/main` head (was `944ad01` at planning time).
- **SATISFIES**: precondition
- **REGENERATES**: none

### Task 2 — UPDATE `approach.html`: add the paragraph after the `#method` grid

- **IMPLEMENT**: insert between `approach.html:123` (`        </div>`, the grid's close) and `:124` (`      </div>`, the container's close), indented to the grid's level:

  ```html
          <p class="muted max-prose mt-2xl">
            The worked examples on this site are narrow on purpose, and all three are fictional.
            <a href="/proto/verdant.html">Verdant</a> is one plant owner and one screen, the daily
            check-in; the rest of a plant-care app is left general.
            <a href="/proto/fieldwork.html">Fieldwork</a> is one dispatcher and one screen, the
            dispatch board; the technicians' side is left general.
            <a href="https://github.com/linardsb/ux-factory/blob/main/discovery/faster-payment/prd.md">Faster Payment</a>,
            a real discovery run on a fictional bank, covers paying a new UK payee from the app;
            international and business payments are left out of this release. The reason is Ryan
            Singer's advice on what to define before hiring a developer: start with the concrete
            cases that matter now and generalise once they are solved, because every added "if"
            multiplies the complexity.
          </p>
  ```

  Every factual clause traces to a line listed under CONTEXT REFERENCES. If you change a clause, re-check it against that line.
- **PATTERN**: `approach.html:215` (`<p class="muted">`), links as `work.html:238`/`:249`, external as `contact.html:36`.
- **GOTCHA**: do **not** write that Verdant has "no sensors" or similar. The brief says Rita doesn't want moisture sensors (`scenarios/verdant/brief.md:30`), but `scenarios/verdant/fixtures/readings.json` carries moisture readings the overview renders. Keep to "one owner, one screen".
- **GOTCHA**: honesty contract (CLAUDE.md): every scenario named is labelled fictional in the same passage, and Faster Payment carries its own "real run, fictional scenario" framing. Do not drop either while editing.
- **GOTCHA**: non-endorsement. The sentence says the site follows his advice. Do not add "as Singer recommends for projects like this", "Singer-approved", or anything that reads as his view of this site.
- **GOTCHA**: no `<dfn class="term">` (see Out of Scope). No new id (no `scroll-margin` needed; `html { scroll-padding-top }` covers focus anyway).
- **VALIDATE**:
  - `grep -c 'Ryan' approach.html` → `2` (expected: :215 and the new paragraph).
  - `grep -n 'fictional' approach.html` → one line inside the new paragraph (expected).
  - `node -e 'const h=require("fs").readFileSync("approach.html","utf8");const o=(h.match(/<p\b/g)||[]).length,c=(h.match(/<\/p>/g)||[]).length;if(o!==c)throw new Error(o+" vs "+c);console.log("p balanced",o)'` → `p balanced N`.
  - `curl -s -o /dev/null -w '%{http_code}\n' https://github.com/linardsb/ux-factory/blob/main/discovery/faster-payment/prd.md` → `200` (observed 200 at planning time).
  - Render: `npx serve . -l 0` (or `node tooling/visual-regression/serve.mjs` on an OS-assigned port, memory: stale-serve-wrong-tree) and open `/approach` under the neutral pack; the paragraph sits under the four cards, 65ch wide, all three links resolve. At 390px wide, no horizontal scroll.
- **SATISFIES**: AC #1
- **REGENERATES**: VR baselines (Task 4). `loc-summary.json`: expected unchanged (Task 3).

### Task 3 — VERIFY `system/loc-summary.json` does not drift

- **IMPLEMENT**: `git add approach.html && node agent-layer/gen-loc-summary.mjs --check`.
- **GOTCHA**: the generator reads the **index**, not the working tree (`agent-layer/gen-loc-summary.mjs:41-43`). Running `--check` before `git add` is a false "no drift" (memory: loc-summary-counts-tracked-only).
- **GOTCHA**: if the paragraph somehow grows past the headroom (NOTES: pages +84, total +82 lines), `--check` reds; then run `node agent-layer/gen-loc-summary.mjs`, commit `system/loc-summary.json`, and note that only `pages`/`total` moved (approach renders `runtime` only, approach.html:273, so the baselines are not affected by that).
- **VALIDATE**: expected `loc summary ✓  3 groups — no drift`.
- **REDDENS**: stage a copy of approach.html with 90 extra blank lines → `loc summary ✗  drift from tracked source: system/loc-summary.json`. Unstage and discard after (positive control, optional).
- **SATISFIES**: AC #3 (runtime counts do not move: nothing under `system/` changes)
- **REGENERATES**: none expected

### Task 4 — REGENERATE the three approach VR baselines

- **IMPLEMENT**: commit Task 2 first (the Docker run screenshots the working tree, so it must be clean). Then from a clean detached worktree **under /Users** (not /private/tmp — Docker file sharing):
  ```bash
  git worktree add --detach ~/wt-487-vr HEAD
  cd ~/wt-487-vr/tooling/visual-regression
  rm -f baselines/approach-neutral.png baselines/approach-saulera.png baselines/approach-verdant.png
  npm run update:docker   # full run: the script's sh -c wrapper does not pass extra args through (package.json:8)
  ```
  Copy the three new `approach-*.png` back into the primary tree's `tooling/visual-regression/baselines/`, `git status` to confirm only those three moved, commit, then `git worktree remove ~/wt-487-vr`.
- **GOTCHA**: memories vr-gate-reads-working-tree, vr-update-skips-subperceptual (the `rm` forces a rewrite), visual-regression-baseline-trap (any at-rest copy change churns the baseline even at the same height).
- **GOTCHA**: a "two consecutive stable screenshots" failure on approach is the known countUp flake (memory: vr-gate-approach-countup-flake). Re-run; it fails a different pack each time. A local Docker pass is not CI green; read `gh pr checks`.
- **GOTCHA**: if other baselines changed in the full run, do not commit them. They belong to other tickets or to platform noise.
- **VALIDATE**: `git diff --stat origin/main -- tooling/visual-regression/baselines/` → exactly the three `approach-*.png`. Open one PNG and confirm the paragraph is visible under the method cards.
- **SATISFIES**: AC #2
- **REGENERATES**: `tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png`

### Task 5 — RUN the CI `verify` gates locally

- **IMPLEMENT**: `node tooling/build-checks.mjs` then `node tooling/drift-check.mjs` (piv-validate maps to these plus token-lint; memory: piv-skills-python-tuned — run it even on a copy-only PR).
- **VALIDATE**: both exit 0 with their `✓` summary lines (expected). The change touches no gated module, so a red here is inherited from `main` or from the working tree; stash and re-run on `origin/main` to tell which.
- **SATISFIES**: AC #4
- **REGENERATES**: none

---

## TESTING STRATEGY

No suite exists (CLAUDE.md §Testing). "Done" = the page renders under the neutral pack with the paragraph,
`loc-summary --check` passes on the staged tree, the three baselines are regenerated, `build-checks` and
`drift-check` green, CI `visual` green on the PR.

### Edge Cases

- Mobile (≤900px): `max-prose` is a cap, not a width; the paragraph wraps to the container. Check at 390px.
- Three packs: the paragraph uses `--color-fg-muted` via `.muted`; #482 made the neutral muted colour pass AA on cards, and this paragraph sits on the band background, not a card. Eyeball saulera and verdant too.
- The glossary module throws on unknown terms; this paragraph adds none, so `#asrc[data-asrc="ready"]` still gets set and VR's `waitReady` resolves.

### Proving the checks

The only check this plan runs that could pass vacuously is `gen-loc-summary --check` (index vs working tree);
Task 3 stages first and names the positive control. The VR regeneration is proved by the diff stat showing the
three PNGs changed; an unchanged PNG after `rm` would mean the run did not capture approach.

---

## VALIDATION COMMANDS

### Level 1: Syntax
`node -e` `<p>` balance check (Task 2).

### Level 2: Gates
```bash
git add approach.html && node agent-layer/gen-loc-summary.mjs --check
node tooling/build-checks.mjs
node tooling/drift-check.mjs
```

### Level 3: Visual
`npm run update:docker` in a clean worktree (Task 4); CI `visual` job on the PR.

### Level 4: Manual
Open `/approach` under neutral, saulera and verdant packs (dock pack switcher) at desktop and 390px. Click all three links.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Supply the URL of Singer's post (Q1) | owner's hand | no | Q1 here; add the link in a follow-up commit if supplied |
| Approve the paragraph's wording (it is on the owner's portfolio) | owner's hand | no — PR review is the approval | the PR |

---

## ACCEPTANCE CRITERIA

- [ ] AC #1: one passage in `approach.html` states the reason, source cited (Ryan Singer, named; no URL until Q1), with each scenario's concrete case and what it leaves general, all three labelled fictional.
- [ ] AC #2: `approach-{neutral,saulera,verdant}.png` regenerated in the same PR; CI `visual` green.
- [ ] AC #3: `gen-loc-summary --check` passes on the staged tree (runtime unchanged; regenerate and commit only if `pages`/`total` flip).
- [ ] AC #4: `build-checks.mjs` and `drift-check.mjs` green; PR body carries `Closes #487`.

---

## COMPLETION CHECKLIST

- [ ] Branch from `origin/main`, staged by explicit path
- [ ] Paragraph inserted, every clause traced to its cited line
- [ ] `portfolio-design` CHECKLIST run
- [ ] loc-summary check on staged tree
- [ ] Three baselines regenerated from a clean worktree, only those three committed
- [ ] Plan, report and review in the PR; `Closes #487` in the body

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (non-blocking)**: no URL for Singer's post exists in #487, #486 or the #486 plan, and two web searches returned only this repo's issues. The paragraph names him and the post without a link. If the owner supplies the URL, wrap "Ryan Singer's advice on what to define before hiring a developer" in it.
- **Q2 (non-blocking, default taken)**: Faster Payment is on no shipped page (observed: `git grep -i faster` over `*.html`, `replay/`, `system/*.json` returns nothing reader-facing). Default: link its committed `prd.md` on GitHub, so the reader can inspect the run. Alternative: name it unlinked. Say if the external link is unwanted.
- **Q3 (non-blocking)**: placement. Default: end of `#method`, because "Shape it" is where scoping lives. Alternative: a lead under `#case`. Either keeps one passage.
- **Assumption**: "what was deliberately left general" is read as "what each scenario does not cover", stated from the committed records, not newly decided here.

## NOTES (open canvas)

**Pre-flight (run 2026-09-29 against `origin/main` @ 944ad01).**

- Grepped `approach.html` for verdant/fieldwork/faster/scenario/concrete: zero hits. The claim that the passage is missing holds.
- loc-summary headroom (derived, same `split("\n")` count the generator uses, run over `origin/main` blobs): runtime 32522 → 32500 (flips at +28, untouched here); pages 5266 → 5300 (flips at +84); total 40868 → 40900 (flips at +82). The paragraph adds ~13 lines, so the check is expected to pass. AC #3 says "if runtime moves": approach.html is in the `pages` group (`gen-loc-summary.mjs:24`), not `runtime`.
- Faster Payment reachability: nowhere on shipped pages, `replay/`, `factory.html`, `studio.html` → Q2.
- Singer URL: not found → Q1, mirroring #486.
- Verdant fact-check caught the sensors trap: the brief disclaims sensors, the fixtures carry moisture readings. Removed from the draft.
- Checked build-checks for approach-specific copy assertions: only the instance `auditRefs` refusing `/approach` (build-checks.mjs:5969) and the import-core loc guard (:12658, :13111). Neither reads approach copy.
- VR spec: `visual.spec.mjs:35`, `waitReady: '#asrc[data-asrc="ready"]'`, three packs → three PNGs.

**Why a paragraph, not a band.** The ticket asks for one passage. A new band adds a heading, a kicker and a
larger baseline change for the same content. A fifth card would leave an orphan in `grid-2`. A paragraph after
the method grid reads as the method's footnote on scope.

## AMENDMENTS

- **2026-09-29 (implementation) — Task 2 VALIDATE, plan error.** `grep -n 'fictional' approach.html` returns two lines
  inside the new paragraph, not one: "all three are fictional" and "a fictional bank" wrap onto different lines
  (observed: :125 and :131). The copy is correct; the expected count was wrong.
- **2026-09-29 (implementation) — Task 2 draft, Verdant clause.** The draft called the one screen "the daily check-in".
  `scenarios/verdant/proto.config.json:4` names the screen `plant-overview`, and `scenarios/verdant/brief.md:42`
  defines the check-in as a behaviour ("open the overview"). Shipped as "one screen, the overview she opens for a
  daily check-in".
- **2026-09-29 (implementation) — Task 2 sources, Faster Payment.** Seq 23 (`prd.md:363-366`) supports only the
  international/business refusal. "New payee ... from the app" traces to `prd.md:13`; "UK" to `prd.md:66` and
  `:150-152` (Confirmation of Payee, Pay.UK, UK data centres).
- **2026-09-29 (implementation) — "No new CSS", plan error.** The global `a` reset (`system/components.css:38`)
  leaves the paragraph's links with no at-rest signal, which fails the portfolio-design CHECKLIST MUST on
  colour/hover-only information. Added one page-scoped rule, `#method .max-prose a` underline, and regenerated the
  three approach baselines again.
