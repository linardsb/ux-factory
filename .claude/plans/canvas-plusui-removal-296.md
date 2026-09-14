# Feature: the Plus UI pack is removed (#296)

The following plan should be complete, but it's important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

`system/tokens.plusui.css` is a token pack imported from a public Community Figma file by
`tooling/figma/figma-pull.mjs`. It is offered to every reader in the appearance dock on all ten pages that
carry the chrome, and it landed with **no visual-regression baselines and no accessibility vet**. The owner's
verdict at the 2026-08-28 grill: *"its spacing and design are way out of whack."*

This deletes the pack and every switch, allowlist and regex that names it, then writes in the rule that stops
the next one landing the same way: **a pack the dock offers gets its VR baselines and an accessibility vet in
the same PR that adds it** (epic #295, G14).

It rides **ahead of the canvas epic's first slice** so that the swap PR's diff is the grid alone, and so the
epic's first pack switch shows three packs the repo can vouch for — neutral · saulera · verdant (G11).

## User Story

As the reader of this portfolio
I want every pack the appearance switcher offers to be one the repo actually stands behind
So that clicking a pack demonstrates a brand-agnostic token contract rather than exposing an unvetted import.

## Problem Statement

A token contract whose proof is "it re-skins to anything" is weakened, not strengthened, by an offered pack
whose spacing and type scale are visibly out of step and which no gate has ever looked at. The pixel gate
captures `neutral` and `saulera` only (`visual.spec.mjs:143`, observed), so Plus UI has never been screenshotted
and never been contrast-checked past the WCAG table its own import printed. It is a live control on ten pages
with zero coverage.

## Solution Statement

Delete the pack file, remove it from the four places a committed pack is declared (dock `PACKS` + `PACK_RE`,
`pack-boot.js`'s pre-paint allowlist, `pack-derived.mjs`'s `COMMITTED`, the three `RESERVED` slug sets), shrink
the one gate that reads the pack list out of `PACK_RE`, correct the four prose statements that become false,
and write G14's rule into `system/pack-import.mjs`'s header and the runbook's "adding a pack" steps. Then run
the cascade: `gen-loc-summary` + the two `approach` baselines.

No dock redesign. No allowlist refactor. No change to the Figma read path.

## Out of Scope / Non-Goals

- **Not included:** adding `verdant` to the pixel gate's `PACKS` (G14's other half). That is the **swap PR's**
  work — ~10 new PNGs — and `.claude/plans/canvas-baseline-cascade.md` assigns it there. Two open PRs must not
  both regenerate the same page's baselines.
- **Not included:** any dock redesign, any consolidation of the four hand-mirrored pack lists into one source.
  The ticket's *What stays* forbids an allowlist refactor, and the four copies each have a stated reason in
  their own file headers.
- **Not changing:** the Figma read path — `tooling/figma/figma-read.mjs`, `figma-pull.mjs`, `--from`, the
  cache, the fixtures under `tooling/figma/fixtures/`. That is how the next pack arrives.
- **Not changing:** `system/pack-import.mjs`'s engine code. Only its header gains G14's rule.
- **Not changing:** the dock's `derived` and `imported` rows, or `pack-imported.mjs`'s vetting guards.
- **Not included:** a migration for a reader whose `localStorage` already holds `factory-pack=plusui`. None is
  needed and one would be wrong — see Task 5's GOTCHA.

## Feature Metadata

**Feature Type**: Refactor (a removal, plus one invariant written in)
**Estimated Complexity**: Low — 12 files, mostly one-line deletions; the cascade is the only place it can bite
**Primary Systems Affected**: `system/` (the pack declaration chain), `tooling/build-checks.mjs` group 17,
`tooling/studio-journey.mjs`, `docs/figma-runbook.md`, the `loc-summary` → `approach` baseline cascade
**Dependencies**: none new. Docker (VR regen) and Playwright browsers (studio-journey) must be on the machine.

## Related Work

**Implements**: [#296](https://github.com/linardsb/ux-factory/issues/296)  ·  **Epic**:
[#295](https://github.com/linardsb/ux-factory/issues/295), `docs/epics/canvas-design-import.prd.md` §MVP "two
decisions that ride alongside" + G11/G14 · `docs/epics/canvas-design-import.architecture.md:248`

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/canvas-plusui-removal.md` — the **pre-ticket scope doc**, 2026-08-28. Fixes the footprint and
  the cascade. Cited by name at `canvas-design-import.architecture.md:374`: **do not move, rename or delete
  it.** This file is its `piv-plan-implementation` pass, not its replacement.
- `.claude/plans/canvas-baseline-cascade.md` — the epic's standing baseline checklist. Its first table row is
  this PR: *approach ×2 · `gen-loc-summary` · `studio-journey all`*. §"How to regenerate without being fooled"
  is the operator procedure for Task 13.
- `.claude/plans/canvas-pre-slice-sequence.md` · `.claude/plans/canvas-swap-pr-brief.md` — the slices that
  follow. Both assume the dock shows three packs when they start.

**Forward-references** (plans that extend or supersede this):

- (none yet — the swap PR adds `verdant` to the pixel gate under G14's other half)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/dock.mjs` (lines 40–50, 78–83, 205–213) — Why: `PACKS` is the row list, `PACK_RE` is the **hard
  allowlist** every other consumer reads. Line 213 takes the slug from `PACK_IDS` rather than from the caller,
  which is what makes the href provably one of `PACKS`' own literals. Two edits, one entry each.
- `system/pack-boot.js` (lines 67–74) — Why: the pre-paint committed-pack branch. A classic parser-blocking
  script; anything outside its allowlist is the **guaranteed no-op default** that the VR harness depends on.
- `system/pack-derived.mjs` (lines 27–51, 238, 253, 440) — Why: `COMMITTED` is what makes a pack
  *restorable* after a visitor wears "your brand". Its header states the rule (line 49): a pack missing here is
  selectable but not restorable.
- `system/brand-import.mjs:59-66` · `system/build-import.mjs:83-89` · `portal/lib/figma.mjs:22-33` — Why: the
  three `RESERVED` slug sets. Two RENAME a download; the portal one REFUSES a write to
  `system/tokens.<slug>.css`. Hand-mirrored, **no gate keeps them in step** (verified: `git grep -n RESERVED`).
- `tooling/build-checks.mjs` lines **3466–3506** and **3666** — Why: group 17 parses the pack list **out of
  `dock.mjs`'s `PACK_RE`** and asserts a floor of 4. This is the one gate that goes red on the dock edit, and
  it is invisible to the ticket's AC-#1 grep because build-checks never spells `plusui`.
- `tooling/studio-journey.mjs:1520-1534` — Why: the #213 mid-replay dock case; line 1531's regex enumerates
  the packs. Behaviour-neutral to change (no page links plusui), prose-correct to change.
- `agent-layer/gen-loc-summary.mjs` (lines 22–28, 39–49) — Why: the runtime group is
  `/^system\/(wc\/)?[^/]+\.(css|mjs|js)$/`, counted from **`git show :<path>`** (the index, not the working
  tree) and **rounded to the nearest 100**. Both facts matter to Task 12.
- `approach.html:265-285` — Why: it renders `loc.groups.find(g => g.id === "runtime").files` and
  `.linesApprox`, and count-ups them. This is why the baselines move.
- `tooling/visual-regression/visual.spec.mjs:35, 143` — Why: `approach` is captured under
  `{ neutral, saulera }` only; there are no Plus UI baselines, so nothing else in the pixel gate moves.
- `docs/figma-runbook.md` lines **34–41** (the commit step, which already carries the loc + baseline cascade)
  and **85–90** (the three-place "putting it in the dock" rule + the `plusui` worked-example line).
- `.claude/references/gates.md` — Why: what each gate states it **cannot** reach. Group 17 has no entry there
  (verified), so the "four shipped packs" prose has only **two** copies, not three.

### New Files to Create

- none. (This plan file and the PR's report/review are process artifacts, not code.)

### Files to Delete

- `system/tokens.plusui.css` (97 lines, observed `wc -l`)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `.claude/plans/canvas-baseline-cascade.md` §**How to regenerate without being fooled** — items 1, 2, 3, 5, 6,
  9, 10 all apply to this PR. Read before Task 13.
- `.claude/references/gates.md` — the gate stack and each gate's stated blind spot. Read before Task 4.
- `docs/epics/canvas-design-import.prd.md` lines 167 (the decision) and 217/230 (G11, G14 in the grill table).
- `CLAUDE.md` §Ground rules — *Invariants live in the file that owns them*; §Commands — the gate commands.

### Patterns to Follow

**A pack is declared in four places, and the runbook says so.** From `docs/figma-runbook.md:87-89`:

> a row in `dock.mjs`'s `PACKS` + its `PACK_RE`, the allowlist in `pack-boot.js`, and `COMMITTED` in
> `pack-derived.mjs` — all three, or the pack is selectable but not restorable

Removing a pack is that list **in reverse**, plus the three `RESERVED` sets that reserve its slug.

**Gate prose has copies.** From memory `gate-prose-has-three-copies.md`: a gate's claim lives in its
`group(…)` string, in a header comment, and sometimes in `gates.md`. Here the count "four" appears at
`build-checks.mjs:3469` (header prose) and inside `group("export", …)` at 3666 — but 3666 **interpolates
`${PACK_IDS.length}`** and self-updates, and `gates.md` has no group-17 entry. So: **one prose edit, not three.**

**A generated number is never hand-written.** `approach.html:265` fetches `loc-summary.json`; the drift-check
leg re-runs the generator and compares bytes. Never edit `system/loc-summary.json` by hand.

**Stage by explicit path.** From memory `shared-worktree-parallel-sessions.md` and the observed tree state
(`agent-layer/gen-decisions.mjs` is modified by another session). `gen-loc-summary` reads the **index**, so a
`git add -A` would fold a sibling session's edit into the committed line counts.

---

## IMPLEMENTATION PLAN

### Phase 1: Branch

Get off the current branch (`feature/discovery-pre-grill-audit-292`) and onto a clean one from `origin/main`.

### Phase 2: The removal and its switches

**Depends on:** Phase 1

The file, the four declaration sites, the three `RESERVED` sets, and the one gate that reads the pack list.
Everything in this phase is mechanical; the only non-obvious member is `tooling/build-checks.mjs`.

### Phase 3: The prose that becomes false, and the rule written in

**Depends on:** Phase 2 (so the code is settled before its comments are restated)

Three comments state a fact about the current tree that the deletion falsifies. Three others record a dated
past observation and **stay verbatim**. Then G14's rule into `pack-import.mjs`'s header and the runbook.

### Phase 4: The cascade

**Depends on:** Phase 3 — **strictly.** Every `system/*.mjs` edit in Phases 2 and 3 changes the runtime line
count, and the line count is what the `approach` baselines render. Regenerating before the last prose edit
lands means regenerating twice.

### Phase 5: Gates and the PR

**Depends on:** Phase 4

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task Format Guidelines

**CREATE** new · **UPDATE** modify · **ADD** insert · **REMOVE** delete · **REFACTOR** restructure ·
**MIRROR** copy a pattern

---

### 1 · CREATE the branch

- **IMPLEMENT**: `git fetch origin && git switch -c feature/plusui-removal-296 origin/main`
- **GOTCHA — fetch first, and branch from `origin/main`, not from a local `main`.** At planning time the
  current branch was **5 commits behind** `origin/main` (observed:
  `git rev-list --left-right --count origin/main...HEAD` → `5  3`). `origin/main` was at `e8982c7`
  (*"docs(discovery): epic close-out … (#293) (#411)"*). A branch cut from a stale local ref regenerates
  `loc-summary.json` against the wrong file set and lands a drift-check failure that looks like a bug in
  this ticket.
- **GOTCHA**: You are starting on `feature/discovery-pre-grill-audit-292` with a dirty tree
  (`agent-layer/gen-decisions.mjs` modified, many untracked files). **Do not stash and do not
  `git add -A` at any point in this ticket** — a sibling session owns those changes
  (memory: `shared-worktree-parallel-sessions.md`). Branching does not disturb them.
- **GOTCHA**: the branch name must **not** start with `feature/v3-`. `verify.yml:108` makes the `visual` job
  `continue-on-error` on those branches (the D11 freeze), which would let a stale baseline merge.
- **VALIDATE**: `git branch --show-current` → `feature/plusui-removal-296`; `git log --oneline -1` matches
  `origin/main`.
- **REDDENS**: n/a
- **SATISFIES**: prerequisite for every AC
- **REGENERATES**: none

---

### 2 · REMOVE `system/tokens.plusui.css`

- **IMPLEMENT**: `git rm system/tokens.plusui.css`
- **PATTERN**: the pack's own header (`system/tokens.plusui.css:4`) names its provenance — a Figma file
  `plusui.json` under `tooling/figma/exports/`, which is **gitignored** (`.gitignore:25`, observed), so no
  companion file exists to delete.
- **GOTCHA**: `git rm`, not `rm`. `gen-loc-summary` reads `git ls-files` + `git show :<path>` — a file removed
  from disk but not from the index still counts.
- **VALIDATE**: `git status --short system/` shows exactly `D  system/tokens.plusui.css`
- **REDDENS**: n/a (this *is* the change)
- **SATISFIES**: AC #1
- **REGENERATES**: `system/loc-summary.json` — deferred to Task 12 (see Phase 4's dependency note)

---

### 3 · UPDATE `system/dock.mjs` — the row and the allowlist

- **IMPLEMENT**: delete the three-line comment block at lines 44–46 and the `plusui` object at line 47; drop
  `|plusui` from `PACK_RE` at line 50. Result:
  ```js
  const PACKS = [
    { id: "neutral", name: "neutral", note: "the no-brand default (generated)" },
    { id: "saulera", name: "saulera", note: "reference client pack (hand-authored)" },
    { id: "verdant", name: "verdant", note: "factory-derived, generated from the recorded pack-seed run" },
  ];
  const PACK_IDS = PACKS.map((p) => p.id);
  const PACK_RE = /\/system\/tokens\.(neutral|saulera|verdant)\.css$/;
  ```
- **PATTERN**: `system/dock.mjs:40-50` as it stands.
- **GOTCHA**: `PACK_RE`'s **exact spelling is parsed** by `tooling/build-checks.mjs:3487` with
  `/const PACK_RE = \/\\\/system\\\/tokens\\\.\(([a-z0-9|-]+)\)\\\.css\$\/;/`. Keep the declaration on one
  line, keep the `const PACK_RE = ` prefix and the trailing `;`, or that gate fails at line 3488 with *"PACK_RE
  could not be read"* instead of at 3490.
- **GOTCHA**: do **not** also delete `PACK_IDS` (line 49) — lines 205 and 213 still use it, and 213 is the
  security property (the href is provably one of `PACKS`' own literals).
- **VALIDATE** (observed simulation of the gate's own parse, run before the edit):
  ```
  NOW  -> neutral|saulera|verdant|plusui len 4 | >=4 ? true
  AFTER-> neutral|saulera|verdant        len 3 | >=4 ? false | >=3 ? true
  ```
  After the edit, re-run the same parse:
  `node -e 'const s=require("node:fs").readFileSync("system/dock.mjs","utf8");const m=s.match(/const PACK_RE = \/\\\/system\\\/tokens\\\.\(([a-z0-9|-]+)\)\\\.css\$\/;/);console.log(m[1].split("|"))'`
  → `[ 'neutral', 'saulera', 'verdant' ]`
- **GOTCHA — this edit turns `build-checks` red, and Task 4 is the fix.** Do them back to back; the tree
  should not sit red across other work. Between them, `node tooling/build-checks.mjs` exits 1 and ends with
  `build ✗  1 failure(s)` rather than the ✓ line. Every other group still runs: `ok()` records a failure and
  returns, `group()` prints the group's failures and continues (`build-checks.mjs:306-318`, observed) — so a
  grep for another group's ✓ line still means what it says even while group 17 is red.
- **REDDENS**: leave `|plusui` in `PACK_RE` → Task 14's AC-#1 grep prints `system/dock.mjs`.
- **SATISFIES**: AC #1
- **REGENERATES**: `loc-summary` (Task 12)

---

### 4 · UPDATE `tooling/build-checks.mjs` — group 17's floor · **the one gate that goes red**

- **IMPLEMENT**: two edits, no more.
  - line 3469 (header prose): `// statement about what the shipped packs actually contain.`
  - line 3490:
    ```js
    ok(PACK_IDS.length >= 3, `only ${PACK_IDS.length} packs read out of PACK_RE — expected at least the three shipped ones (neutral · saulera · verdant)`);
    ```
- **PATTERN**: the assertion is a **vacuity guard**, not a census — if the parse yields nothing, the
  `for (const pack of PACK_IDS)` loop at 3504 never runs and every case in the group is silently true. The
  floor must stay; only the number moves.
- **GOTCHA — this file is NOT in the ticket's footprint list.** It was found by pre-flight: `build-checks.mjs`
  never spells `plusui`, so the AC-#1 grep cannot see it, and the group reads the pack list **out of
  `dock.mjs`'s `PACK_RE`** at 3487. With Task 3 landed and this task not, `node tooling/build-checks.mjs` fails
  with *"only 3 packs read out of PACK_RE — expected the four shipped ones"* (derived from the observed
  simulation in Task 3's VALIDATE).
- **GOTCHA — leave `group("export", …)` at 3666 alone.** It interpolates `${PACK_IDS.length}`, so its ✓ line
  self-updates from 4 to 3. Editing it by hand creates a second copy of a number that already derives itself.
- **GOTCHA — do not widen the floor into "count `system/tokens.*.css` on disk".** That is an allowlist
  refactor, which the ticket's *What stays* forbids, and it would make the gate stop reading `dock.mjs` —
  which is the whole reason a pack added to the dock without being added to `PACK_RE` fails here.
- **GOTCHA — `gates.md` has no group-17 entry, checked two ways.** By heading:
  `grep -on "\*\*Group [0-9]*" .claude/references/gates.md` lists 8–13, 16, 18–19, 21, 23–34 — 17 is absent
  (so are 14, 15, 20, 22). And by content, in case a claim lives in running prose rather than under a heading:
  `grep -n "\bfour\b\|studio-export\|single-file export\|zero-request\|stripImports\|@import" .claude/references/gates.md`
  returns no group-17 sentence and no pack count. `drift-check.mjs:176`'s group-count pin reads only
  `/all (\d+) groups pass/`, so the group count does not move either. This is a genuine exception to memory
  `gate-prose-has-three-copies.md` — two copies, not three. **Re-run both greps before trusting this**; if
  either finds a group-17 sentence, that is the third copy and it needs the same edit.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "build export"` → the ✓ line must read
  **`each of the 3 packs`**; and `node tooling/build-checks.mjs 2>&1 | tail -1` → `build ✓  all 34 groups pass`
- **REDDENS**: restore `>= 4` → group 17 fails with *"only 3 packs read out of PACK_RE"* and the run exits
  non-zero. **Run this mutation and watch it go red before trusting the green** — it is the positive control
  that this check reached the thing it tests. Then **revert the mutation and re-run to green in the same
  sitting**, and record both runs in the report: a forgotten revert ships a floor of 4 against three packs,
  which is green nowhere and lands red on the next PR that touches this file.
  ```bash
  # mutate → expect red
  sed -i '' 's/PACK_IDS.length >= 3/PACK_IDS.length >= 4/' tooling/build-checks.mjs
  node tooling/build-checks.mjs; echo "exit=$?"     # → non-zero, names "only 3 packs read out of PACK_RE"
  # revert → expect green
  sed -i '' 's/PACK_IDS.length >= 4/PACK_IDS.length >= 3/' tooling/build-checks.mjs
  node tooling/build-checks.mjs | tail -1           # → build ✓  all 34 groups pass
  git diff --stat tooling/build-checks.mjs          # → the floor edit only; no mutation residue
  ```
- **SATISFIES**: AC #4
- **REGENERATES**: none

---

### 5 · UPDATE `system/pack-boot.js` — the pre-paint allowlist

- **IMPLEMENT**: at lines 69–70, drop `plusui` from the comment and from the condition:
  ```js
  // Committed pack (saulera/verdant): re-point the ONE stylesheet line. UNCHANGED path.
  if (pack === "saulera" || pack === "verdant") {
  ```
- **PATTERN**: the file's own header, lines 5–8: *"Hard allowlist — storage content never reaches an href
  uninspected… with empty storage this script is a guaranteed no-op, which the visual-regression harness
  relies on."*
- **GOTCHA — no migration, and that is deliberate.** A reader whose `localStorage` already holds
  `factory-pack=plusui` now falls through to `if (pack !== "derived") return` — the **guaranteed no-op default**,
  i.e. the page keeps `tokens.neutral.css`. `dock.mjs:205`'s `PACK_IDS.includes(target)` guard and
  `pack-derived.mjs:440`'s `COMMITTED.includes(prewear) ? prewear : "neutral"` both degrade the same way.
  Graceful by construction. **Do not add a clean-up branch** — a new pre-paint code path on ten pages, to
  delete a key that is already inert, is exactly the kind of change that would churn every baseline.
- **GOTCHA**: this is a **classic parser-blocking script** whose `<script>` tag must stay LAST in every head
  (header, lines 25–32). Do not reorder anything.
- **VALIDATE**: `node --check system/pack-boot.js` → silent; `grep -n plusui system/pack-boot.js` → no output
- **REDDENS**: n/a for a gate — but a positive control exists for the *fallback*: in a browser on any shipped
  page, `localStorage.setItem('factory-pack','plusui')` then reload → the head's pack line must still read
  `/system/tokens.neutral.css` and the page must render. (Optional; the pre-paint code path is already
  exercised by `studio-journey`'s dock case in Task 15.)
- **SATISFIES**: AC #1
- **REGENERATES**: `loc-summary` (Task 12)

---

### 6 · UPDATE `system/pack-derived.mjs` — `COMMITTED` and its two comments

- **IMPLEMENT**: three edits.
  - line 29 (comment): `value joins neutral (default no-op) / saulera / verdant.`
  - line 47 (comment): `pack-boot.js treats anything outside saulera/verdant/derived as the no-op default`
  - line 51: `const COMMITTED = ["neutral", "saulera", "verdant"];`
- **PATTERN**: line 49's own rule — *"Kept in step with dock.mjs's PACKS: a pack missing here is selectable
  but not RESTORABLE."* Removing from both keeps them in step.
- **GOTCHA**: `COMMITTED` is used at 238, 253 and 440 for the **prewear restore**, not for selection. Leave
  those three call sites untouched.
- **VALIDATE**: `node --check system/pack-derived.mjs`; `grep -n plusui system/pack-derived.mjs` → no output
- **REDDENS**: n/a
- **SATISFIES**: AC #1
- **REGENERATES**: `loc-summary` (Task 12)

---

### 7 · UPDATE the three `RESERVED` slug sets — **one task, all three**

- **IMPLEMENT**: drop `'plusui'` / `"plusui"` from:
  - `portal/lib/figma.mjs:25` — `const RESERVED = new Set(['contract', 'neutral', 'source', 'verdant', 'saulera']);`
  - `system/brand-import.mjs:62` — `const RESERVED = new Set(["contract", "neutral", "source", "verdant", "saulera"]);`
  - `system/build-import.mjs:85` — `const RESERVED = new Set(["contract", "neutral", "source", "verdant", "saulera"]);`
- **PATTERN**: each set's own header states its job. `portal/lib/figma.mjs:22-24` — *"This guard is the ONLY
  thing standing between a request body and `system/tokens.<anything>.css`"* — it **refuses**.
  `brand-import.mjs:59` / `build-import.mjs:83` — *"RESERVED becomes a RENAME, not a refusal"* — they append
  `-import` to a colliding download filename.
- **GOTCHA — do these three together, in one edit pass.** They are hand-mirrored and **no gate checks that
  they agree** (verified: `git grep -n RESERVED` finds no build-checks case). A partial edit lands green.
- **GOTCHA**: the removal is correct, not merely tidy: `plusui` was reserved because
  `system/tokens.plusui.css` was *committed reference work a POST must never overwrite*. After Task 2 there is
  no such file, so the slug is free.
- **VALIDATE**:
  ```bash
  git grep -n "RESERVED = new Set" -- portal/lib/figma.mjs system/brand-import.mjs system/build-import.mjs
  ```
  → three lines, each with exactly five members, `plusui` in none.
  Then drive the portal guard: `node -e 'import("./portal/lib/figma.mjs").then(m=>console.log(m.assertSlug("plusui")))'`
  → prints `plusui` (it no longer throws). Before the edit the same call throws
  *"figma import: "plusui" is a reserved pack name"* — that contrast is the positive control.
- **REDDENS**: leave `plusui` in any one of the three → Task 14's grep prints that file.
- **SATISFIES**: AC #1
- **REGENERATES**: `loc-summary` (Task 12 — two of the three are `system/*.mjs`)

---

### 8 · UPDATE `tooling/studio-journey.mjs:1531` — the pack-href regex

- **IMPLEMENT**: `.filter((h) => /\/system\/tokens\.(neutral|saulera|verdant)\.css$/.test(h || "")));`
- **PATTERN**: `tooling/studio-journey.mjs:1526` uses the same shape for the single-pack wait.
- **GOTCHA**: this change is **behaviour-neutral** and has no reddening mutation. No shipped page links
  `tokens.plusui.css` (verified: `git grep -n "tokens\.[a-z]*\.css" -- '*.html'` → every page links
  `contract` + `neutral`), so the filter's result set is identical either way. It is a correctness edit to a
  hand-copied pack list, and the journey re-run in Task 15 proves the surrounding case still passes — **not**
  that this line was ever load-bearing. Say so in the report; do not claim the journey "proves" the edit.
- **VALIDATE**: `node --check tooling/studio-journey.mjs`; `grep -n plusui tooling/studio-journey.mjs` → none
- **REDDENS**: none — stated above, deliberately.
- **SATISFIES**: AC #1, AC #4
- **REGENERATES**: none (`tooling/` is outside every loc-summary group)

---

### 9 · UPDATE `system/studio-frames.mjs:56` + `system/pack-imported.mjs:53` + `system/pack-import.mjs:600`

The three comments that state something **about the current tree** which the deletion makes false.

- **IMPLEMENT**:
  - `studio-frames.mjs:56` → `//     pack (neutral · saulera · verdant), booted by each frame's own pack-boot.js and`
  - `pack-imported.mjs:53` → `// The VALUE charset is MEASURED, not guessed: across tokens.contract/neutral/verdant/saulera`
  - `pack-import.mjs:600` → `// tokens.verdant.css and the handoff pack all carry it. Do not reflow it.`
- **PATTERN**: each is a claim a reader can check against the tree. `pack-imported.mjs:53-55` is a
  **measurement** ("measured 2026-07-26"); dropping one file from a five-file measurement leaves the claim
  true, because a charset measured over five files is a superset of what four use. The guard does not widen.
- **GOTCHA**: at `pack-import.mjs:600` the sentence reads *"tokens.verdant.css, tokens.plusui.css and the
  handoff pack all carry it"*. Removing the middle item leaves *"tokens.verdant.css and the handoff pack all
  carry it"* — grammatically "all" now governs two; leave it or make it "both", your call, but **do not
  reflow the header** (the line above says so, because the header string is part of every committed pack's
  bytes).
- **VALIDATE**: `node --check system/studio-frames.mjs system/pack-imported.mjs system/pack-import.mjs`;
  `node tooling/build-checks.mjs 2>&1 | grep -E "vetting|frames"` → both `✓`
- **REDDENS**: n/a (comments)
- **SATISFIES**: AC #1
- **REGENERATES**: `loc-summary` (Task 12)

---

### 10 · ADD G14's rule to `system/pack-import.mjs`'s header

- **IMPLEMENT**: insert one paragraph after the header's last paragraph (currently ends line 18, *"…because
  each one carries a measured fact."*) and before the `import` block at line 20:
  ```js
  // ADDING A PACK TO THE SHIPPED DOCK COSTS MORE THAN A FILE (epic #295 G14, #296). A pack this repo
  // commits and offers in system/dock.mjs is a live control on every page that carries the chrome, so
  // the PR that adds one also carries its visual-regression baselines (one PNG per VR page) and an
  // accessibility vet — the WCAG table this engine prints, read and ACTED ON, not merely committed.
  // The "plusui" pack was removed at #296 because it landed with neither.
  ```
- **PATTERN**: CLAUDE.md §Ground rules — *"Invariants live in the file that owns them… That header is the
  specification."* `pack-import.mjs` is the ONE engine every import path maps through (its own header, lines
  5–9), so it is where the rule belongs.
- **GOTCHA**: keep it to ~5 lines. Every line added to a `system/*.mjs` file moves the runtime line count, and
  `runtime.linesApprox` sits at **30534 raw after the deletion alone** (derived) — the 30500 rounding bucket is
  `[30450, 30549]`. A 16-line header would flip it to 30600. See Task 12.
- **GOTCHA**: do not add code. This file is **view-time safe** — no `node:` builtin, no `process`, no
  `document` (its header, lines 11–15). A comment is all this task adds.
- **VALIDATE**: `node --check system/pack-import.mjs`; `node tooling/build-checks.mjs 2>&1 | tail -1` →
  `all 34 groups pass`
- **REDDENS**: n/a (a written invariant, not a check). Its enforcement is the runbook step in Task 11 plus a
  reviewer reading this header — state that honestly in the report rather than claiming the rule is gated.
- **SATISFIES**: AC — ticket §"One rule written in (G14)"
- **REGENERATES**: `loc-summary` (Task 12)

---

### 11 · UPDATE `docs/figma-runbook.md` — G14's rule, the three-place list, and the removal note

- **IMPLEMENT**: two edits.

  **(a)** At the end of §A1 step 3's code block (after line 41's `update:docker` line), add one sentence:
  ```markdown
  If the pack is also going in the appearance dock, those two regenerations are the *minimum* — see the
  rule below.
  ```

  **(b)** Replace the paragraph at lines 85–90 (`To use the pack: …` through `` `plusui` is the worked
  example. ``) with:
  ```markdown
  To use the pack: pass it to a company instance
  (`build-instance.mjs … --pack tokens.<company>.css`). Putting it in the site's appearance dock is
  a separate change (a row in `dock.mjs`'s `PACKS` + its `PACK_RE`, the allowlist in `pack-boot.js`,
  and `COMMITTED` in `pack-derived.mjs` — all three, or the pack is selectable but not restorable),
  and it costs more than three lines: **a pack the dock offers gets its visual-regression baselines
  and an accessibility vet in the same PR that adds it** (epic #295, G14). The WCAG table this run
  prints is the vet — read it and act on it, not just commit it.

  There is no worked example in the tree. `plusui`, imported from a public Community Figma file, was
  the one; it was removed at #296 (decided 2026-08-28, epic #295 G11) because it shipped in the dock
  with neither baselines nor a vet, and its spacing and type scale were visibly out of step with the
  rest of the system. `git log -- system/tokens.plusui.css` keeps the import run.
  ```
- **PATTERN**: the runbook's voice — imperative, a reason attached to each step, no hedging.
- **GOTCHA — the date.** The ticket's AC #2 says *"the pack was removed on 2026-08-28"*. That is the **grill
  date**, not the removal date (today is 2026-09-14). Writing "removed on 2026-08-28" would put a false
  statement in the honesty trail this AC exists to protect. The wording above satisfies the AC's intent —
  decision date + ticket, no dangling reference — while staying true. **Q1 in Open Questions**; proceed under
  this wording unless the owner says otherwise.
- **GOTCHA**: `docs/` is **excluded** from AC #1's grep (`':(exclude)docs'`), so the two `plusui` mentions this
  new text keeps are correct and required — the AC explicitly asks for the note.
- **VALIDATE**: `grep -n -c plusui docs/figma-runbook.md` → `2`; and
  `git grep -il plusui -- . ':(exclude).claude' ':(exclude)docs'` → no output
- **REDDENS**: n/a (docs)
- **SATISFIES**: AC #2, and the ticket's G14 rule
- **REGENERATES**: none (`docs/` is in no loc-summary group)

---

### 12 · Stage by explicit path, then REGENERATE `system/loc-summary.json`

- **IMPLEMENT**:
  ```bash
  git status --short system/        # READ THIS FIRST — every line must be one of yours
  git add system/ portal/lib/figma.mjs tooling/build-checks.mjs tooling/studio-journey.mjs docs/figma-runbook.md
  node agent-layer/gen-loc-summary.mjs
  git add system/loc-summary.json
  node agent-layer/gen-loc-summary.mjs --check      # must print "no drift"
  ```
  `git add system/` is a **directory** add. `system/` was clean of untracked files at planning time
  (`git status --short system/` → empty, observed), but the repo root is full of another session's untracked
  files, so read the status line by line before the add. If anything under `system/` is not yours, name the
  eight edited files explicitly instead of the directory.
- **PATTERN**: `agent-layer/gen-loc-summary.mjs:42-45` — it reads each file's **committed index blob**
  (`git show :<path>`), *"so a parallel ticket's uncommitted edits in the shared worktree silently poison the
  artifact (#56; git add before regen)"*.
- **GOTCHA — never `git add -A` or `git add .`** The tree carries another session's modified
  `agent-layer/gen-decisions.mjs` plus ~30 untracked files. Folding that file in would move the `generators`
  group, which this change must not touch.
- **GOTCHA — `--check` before staging is a false "no drift"** (memory: `loc-summary-counts-tracked-only.md`).
  Stage first, then check. The order above already does this.
- **GOTCHA — if the branch has fallen behind `origin/main`, merge FIRST, then regenerate.** Another session
  landing any `system/*.{css,mjs,js}` file moves the runtime count under you, and a `drift-check` run *during*
  an uncommitted merge misreads staged merge changes as drift (memory:
  `drift-check-mid-merge-false-positive.md`). Complete the merge, then regenerate on the clean tree. A merge
  conflict **inside** `loc-summary.json` is resolved by re-running the generator, **never** by hand-editing
  the numbers.
- **VALIDATE — assert the diff, not just that it ran.** `git diff --cached system/loc-summary.json`.
  Exactly four numbers may move:

  | field | before (observed) | expected after | certainty |
  |---|---|---|---|
  | `runtime.files` | 77 | **76** | certain — one tracked `system/*.css` removed, none added |
  | `runtime.linesApprox` | 30600 | **30500** | derived — raw 30632 → 30534 after the deletion; the ~5-line G14 header and the small comment deletions keep it inside the `[30450, 30549]` bucket |
  | `total.files` | 114 | **113** | certain |
  | `total.linesApprox` | 38500 | 38400 **or** 38500 | derived — raw 38543 → 38445, which rounds to 38400, but the bucket edge is 38450: ~+6 net lines puts it back at 38500. **Read the output; do not assert a literal.** |

  If the `generators` or `pages` group moved, **a sibling session's staged file leaked in** — unstage and redo.
- **REDDENS**: skip this task → CI `verify` fails at the drift-check step with
  *"loc-summary drift: system/loc-summary.json — regenerate: node agent-layer/gen-loc-summary.mjs"*. Blocking;
  gates `main`.
- **SATISFIES**: AC #3, AC #4
- **REGENERATES**: `system/loc-summary.json` — `node agent-layer/gen-loc-summary.mjs`

---

### 13 · REGENERATE the two `approach` baselines — **operator-run, Docker**

- **IMPLEMENT**: from a **clean detached worktree under `/Users`** (not `/private/tmp` — Docker file sharing):
  ```bash
  git worktree add /Users/Berzins/wt-296 feature/plusui-removal-296     # or a detached checkout of the commit
  cd /Users/Berzins/wt-296/tooling/visual-regression && npm ci
  rm baselines/approach-neutral.png baselines/approach-saulera.png
  npm run update:docker
  ```
  Then **copy the two regenerated PNGs back into the main checkout** and stage them by explicit path:
  ```bash
  cp /Users/Berzins/wt-296/tooling/visual-regression/baselines/approach-{neutral,saulera}.png \
     /Users/Berzins/Desktop/Linards_current/ux-factory/tooling/visual-regression/baselines/
  git add tooling/visual-regression/baselines/approach-neutral.png \
          tooling/visual-regression/baselines/approach-saulera.png
  git worktree remove /Users/Berzins/wt-296
  ```
  **Copy back — do not commit from the worktree.** A worktree on the same branch shares the ref, so a commit
  there would split this ticket across two commits and CLAUDE.md §Git asks for one atomic commit per ticket.
  Pick this route and stay on it.
- **PATTERN**: `.claude/plans/canvas-baseline-cascade.md` §How to regenerate without being fooled, items 1–6.
- **GOTCHA — `rm` the PNGs first, and this is not optional here.** `update:docker` will not rewrite a baseline
  whose only change is below pixelmatch's per-pixel threshold (memory: `vr-update-skips-subperceptual.md`), and
  `maxDiffPixels: 100` swallows a few changed digits (memory: `vr-tolerance-hides-text-changes.md`). The change
  here **is** a few digits: `77`→`76` and `30,600`→`30,500`. A green `update:docker` run without the `rm` is
  not proof the page did not change.
- **GOTCHA — `update:docker` screenshots the DIRTY tree** (memory: `vr-gate-reads-working-tree.md`). Hence the
  clean worktree, not the main checkout with its sibling-session files.
- **GOTCHA — `approach` flakes on "two consecutive stable screenshots"** from its live `countUp` under
  `retries: 0`, and it fails a *different pack each run* — that signature is the flake, not a regression
  (memory: `vr-gate-approach-countup-flake.md`). Re-run; trust `gh pr checks`, not the local run.
- **GOTCHA — a local macOS run showing ~16 failures is the platform, not a regression.** The baselines are
  Linux; `update:docker` is what makes the run comparable.
- **GOTCHA — only these two PNGs.** Nothing else in the pixel gate moves: there are no Plus UI baselines
  (`visual.spec.mjs:143` captures `{neutral, saulera}`, observed), the dock panel is `display: none` at rest
  (`components.css:2737`, observed — so removing a row paints nothing), and no page links the pack. If
  `update:docker` rewrites a third PNG, **stop and find out why** before committing it.
- **VALIDATE**: `git status --short tooling/visual-regression/baselines/` → exactly two modified PNGs; and
  open `approach-neutral.png` and read the sentence — it must say **"76 files, about 30,500 lines"** (or
  whatever Task 12's output actually produced).
- **GOTCHA — THE RE-ENTRY RULE.** These photographs render Task 12's numbers. If **anything** afterwards
  changes a tracked `system/*.{css,mjs,js}` line count — a review fix, a reworded comment, a merge from
  `origin/main` — then Task 12 and Task 13 must BOTH be redone, in that order, before the PR merges. The
  cheap detector is `node agent-layer/gen-loc-summary.mjs --check` after staging: if it reports drift, the
  baselines are stale too, even though nothing tells you so. Run it as the last thing before pushing.
- **REDDENS**: skip → CI `visual` goes red on `approach-neutral` / `approach-saulera` (the job blocks on this
  branch: `verify.yml:108`, observed).
- **SATISFIES**: AC #3
- **REGENERATES**: `tooling/visual-regression/baselines/approach-{neutral,saulera}.png` —
  `cd tooling/visual-regression && npm run update:docker`

---

### 14 · VALIDATE AC #1 — the grep

- **IMPLEMENT**: run the ticket's own predicate.
- **VALIDATE**:
  ```bash
  git grep -il plusui -- . ':(exclude).claude' ':(exclude)docs'   # → no output
  git grep -il plusui -- .                                         # → only .claude/** and docs/**
  ```
- **REDDENS**: before the edits this prints 11 files (observed: `portal/lib/figma.mjs`,
  `system/{brand-import,build-import,dock,pack-boot,pack-derived,pack-import,pack-imported,studio-frames}`,
  `system/tokens.plusui.css`, `tooling/studio-journey.mjs`). That eleven-to-zero transition is the control.
- **SATISFIES**: AC #1
- **REGENERATES**: none

---

### 15 · Run the gates

- **IMPLEMENT**:
  ```bash
  node tooling/build-checks.mjs                       # → all 34 groups pass
  node tooling/drift-check.mjs                        # → ✓ (needs tooling/style-dictionary/node_modules — present, observed)
  node tooling/token-lint.mjs                         # → ✓
  node agent-layer/gen-loc-summary.mjs --check        # → no drift (after staging)
  # operator-run, needs Playwright browsers:
  node tooling/visual-regression/serve.mjs &          # 127.0.0.1:4757
  node tooling/studio-journey.mjs all                 # chromium · firefox · webkit
  ```
- **GOTCHA — a stale `serve.mjs` on 4757 serves ANOTHER session's tree** (memory: `stale-serve-wrong-tree.md`).
  `studio-journey.mjs:121-125` already guards this by fetching `system/studio-layers.mjs` and comparing, but
  confirm the port is yours: `curl -s http://127.0.0.1:4757/system/dock.mjs | grep -c plusui` → `0`. If it is
  someone else's, run with `PORT=4759 node tooling/visual-regression/serve.mjs &` and
  `BASE=http://127.0.0.1:4759 node tooling/studio-journey.mjs all`.
- **GOTCHA — `studio-journey`'s saulera console exemption is expected**, not a new failure: wearing saulera
  404s its own `@import url("../fonts/fonts.css")` because `fonts/` is not committed
  (`studio-journey.mjs:1493-1497`). The driver already exempts it.
- **VALIDATE**: each command's own ✓ line, pasted into the report.
- **REDDENS**: covered per-task above; the `>= 4` restoration in Task 4 is the one mutation to actually run.
- **SATISFIES**: AC #4
- **REGENERATES**: none

---

### 16 · COMMIT and open the PR

- **IMPLEMENT**: one atomic commit, then the PR.
  ```
  chore(system): the Plus UI pack is removed, and G14's rule written in (epic #295 G11/G14, #296)
  ```
  PR body **must** carry a `Closes #296` trailer (memory: `prs-dont-auto-close-tickets.md` — a title mentioning
  `(#296)` closes nothing).
- **GOTCHA**: the PR also carries this plan (`.claude/plans/canvas-plusui-removal-296.md`), the report
  (`.claude/reports/…`) and the review (`.claude/code-reviews/pr-<N>-review.md`) — CLAUDE.md §Git.
- **GOTCHA**: `main` branch protection is **OFF** (memory: `main-branch-protection-off.md`, 2026-09-11), so no
  gate physically blocks a merge. Read `gh pr checks` yourself before merging.
- **GOTCHA — a red `codeql` leg on this PR is almost certainly NOT this PR.** Since #408 (`f4c1d9b`, on
  `origin/main`) the gate reads `refs/heads/main` too, so **any** open high/critical alert on main blocks
  **every** PR, with no baseline delta (memory: `codeql-leg2-blocks-its-own-fix.md`). This ticket deletes code
  and adds none, so it cannot introduce one. Observed at planning time: **0 open code-scanning alerts**
  (`gh api repos/linardsb/ux-factory/code-scanning/alerts?state=open` → empty). If the leg is red anyway,
  read the alert before touching anything in this branch — the fix belongs on main, not here.
- **VALIDATE**: `gh pr checks` → `verify` green, `visual` green, `codeql` green, `gates-green` green.
- **SATISFIES**: AC #4
- **REGENERATES**: none

---

## TESTING STRATEGY

There is no test suite in this repo and none is to be invented (CLAUDE.md §Testing). "Done" = the gate ran.

### Unit-equivalent (pure, in CI)

`node tooling/build-checks.mjs` — 34 groups. **Group 17 ("export") is the one this change moves**: it parses
`dock.mjs`'s `PACK_RE`, then drives `exportHtml` over the contract + each pack + `components.css`, asserting
zero network requests and that the pack survives the `@import` strip. Post-change it runs over 3 packs, and its
✓ line must say so.

### Integration-equivalent (the running page, operator-run)

`node tooling/studio-journey.mjs all` — three engines. The relevant case is #213's mid-replay dock switch
(lines 1511–1534): opens `#appearance`, clicks `dock-pack-saulera`, asserts the head's **one** pack line
re-points and that the switch is not a take-over. It exercises the edited `PACK_RE` path end to end.

### Drift (blocking, gates `main`)

`node tooling/drift-check.mjs` — 13 legs. Only the `loc-summary` leg moves here. Verified pre-flight that the
other pack-adjacent generators do **not** read this file: `gen-system-graph.mjs:20-24` names only
neutral/saulera/verdant, `gen-pack-bundle.mjs:16` reads `handoff/verdant/` only, `gen-annotated-source.mjs` and
`gen-inspect-data.mjs` read no pack at all. All five ran `✓ no drift` on the clean tree (observed).

### Pixel (blocking on this branch)

`approach-neutral.png` + `approach-saulera.png` only.

### Edge cases that must be checked

1. A reader with `localStorage['factory-pack'] === 'plusui'` → falls through to the guaranteed no-op, page
   renders under neutral. (Task 5's optional browser control.)
2. A reader with `factory-pack-prewear === 'plusui'` who unwears "your brand" → `pack-derived.mjs:440` maps an
   unknown prewear to `"neutral"`. Same graceful path.
3. The portal's `assertSlug('plusui')` now **succeeds** — an import may legitimately claim the free slug.
4. `exportHtml` under each of the 3 remaining packs still strips `@import` without eating a `:root` block
   (build-checks group 17, cases 1–2 — the saulera half is the discriminator and is unaffected).

### Proving the checks

One reddening mutation matters and **must actually be run**: restore `ok(PACK_IDS.length >= 4, …)` in
`tooling/build-checks.mjs:3490` and confirm the run exits non-zero naming *"only 3 packs read out of
PACK_RE"*. Everything else in this PR is a deletion whose control is the AC-#1 grep going from 11 files to 0
(both halves observed).

Two edits in this PR carry **no** reddening mutation, stated plainly rather than dressed up: Task 8's
`studio-journey` regex (behaviour-neutral) and Task 10's G14 header (a written invariant, enforced by a
reviewer and the runbook, not by a gate).

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
node --check system/dock.mjs system/pack-derived.mjs system/pack-import.mjs \
             system/pack-imported.mjs system/studio-frames.mjs system/brand-import.mjs \
             system/build-import.mjs portal/lib/figma.mjs tooling/build-checks.mjs \
             tooling/studio-journey.mjs
node --check system/pack-boot.js
```
(There is no linter and no type-check in this repo. `drift-check.mjs`'s syntax leg `node --check`s every
tracked `.mjs` anyway.)

### Level 2: Pure gates

```bash
node tooling/build-checks.mjs          # observed on the clean tree: "build ✓  all 34 groups pass"
node tooling/token-lint.mjs
```

### Level 3: Drift + the cascade

```bash
git add system/ portal/lib/figma.mjs tooling/ docs/figma-runbook.md
node agent-layer/gen-loc-summary.mjs
git add system/loc-summary.json
node tooling/drift-check.mjs           # includes loc-summary, param-count, system-graph, handoff, group-count
```

### Level 4: Manual / running-page validation

```bash
node tooling/visual-regression/serve.mjs &
node tooling/studio-journey.mjs all
# and by hand, in a browser on http://127.0.0.1:4757/factory.html:
#   open #appearance → exactly three pack rows (neutral · saulera · verdant) + derived/imported
#   localStorage.setItem('factory-pack','plusui'); location.reload() → page renders under neutral
```

### Level 5: The pixel gate

```bash
# from a clean detached worktree under /Users — see Task 13
cd tooling/visual-regression && rm baselines/approach-{neutral,saulera}.png && npm run update:docker
```

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| `npm run update:docker` (VR baseline regen) | owner's hand — Docker + a clean worktree; ~10–20 min | **yes** — `visual` blocks on a non-`feature/v3-*` branch (`verify.yml:108`, observed) | none; AC #3 is not met without it |
| `node tooling/studio-journey.mjs all` | owner's hand — Playwright browsers, 3 engines; ~5–10 min | **yes** — AC #4 names it | none; AC #4 is not met without it |
| Browser spot-check of the `factory-pack=plusui` fallback | owner's hand, ~1 min | no | optional; `studio-journey`'s dock case covers the live path |

No step in this ticket spends tokens, needs an agent run, or needs a credential.

---

---

## RISK REGISTER

Every risk this plan knows about, what was observed about it, and where it is handled. A risk with no
mitigation row is a risk this ticket accepts — those say so in the last column.

| # | Risk | Observed | Handled |
|---|---|---|---|
| **R1** | `build-checks` group 17 reads the pack list out of `dock.mjs`'s `PACK_RE` and asserts `>= 4`. The dock edit turns the gate red, and the file is **invisible to AC #1's grep** because it never spells `plusui`. | Simulated the gate's own parse against the edited source: `len 4 → len 3`, `>=4 ? false`, `>=3 ? true`. | **Task 4**, placed directly after the dock edit so the tree is never red across other work. Its mutation (`>= 4`) is run **and reverted**, both recorded. AC #6. |
| **R2** | The ticket says "all 27 green". Chasing 27 wastes an implementation pass. | `node tooling/build-checks.mjs` on the clean tree → `build ✓  all 34 groups pass`. | AC #4 states 34 and names the ticket's figure as stale. `drift-check.mjs:176-179` pins 34 against CLAUDE.md and gates.md, so it cannot silently drift again. **The GitHub issue body still says 27** — offer to correct it; do not edit the tracker unasked. |
| **R3** | `total.linesApprox` sits 5 raw lines from its rounding boundary, so the "expected" number is not safe to assert; and every `system/*.mjs` line added in Phases 2–3 moves `runtime.linesApprox`, which the baselines render. | Raw 38543 → 38445 after the deletion; the 38500 bucket starts at 38450. Runtime raw 30632 → 30534; the 30500 bucket is `[30450, 30549]`. | Phase 4 runs **strictly last**; Task 10's header budgeted at ~5 lines; Task 12's table marks `runtime.files` 77→76 *certain* and both `linesApprox` fields *derived — read the output*. |
| **R4** | Two open PRs both regenerating `approach` — the second to merge re-baselines the first's work away (`canvas-baseline-cascade.md` §Concurrency). | `gh pr list --state open` → **one** PR, #412, touching only `.claude/code-reviews/pr-377-review.md`. No `system/` or baseline overlap. | **Clear at planning time.** Re-run `gh pr list` before Task 13; if another PR has appeared touching `system/` or `tooling/visual-regression/baselines/`, sequence rather than race. |
| **R5** | A sibling session's uncommitted work leaking into `loc-summary.json`, which is counted from the **git index**. | `git status --short system/` → empty (clean). Root has `agent-layer/gen-decisions.mjs` modified plus ~30 untracked files, all another session's. | Task 12 stages by explicit path and reads `git status --short system/` first. Never `git add -A`. Task 12's VALIDATE fails the run if the `generators` or `pages` group moved. |
| **R6** | The branch cut from a stale local ref → the wrong file set counted, a drift failure that looks like this ticket's bug. | `git rev-list --left-right --count origin/main...HEAD` → `5  3` (five behind). `origin/main` = `e8982c7`. | Task 1 fetches and branches from `origin/main` explicitly, with the SHA recorded. Task 12 carries the merge-before-regenerate rule for a branch that falls behind later. |
| **R7** | The `codeql` leg red for a reason unrelated to this PR — since #408 the gate reads `refs/heads/main`, so an inherited alert blocks every PR with no baseline delta. | `gh api …/code-scanning/alerts?state=open` → **0 open alerts**. This ticket deletes code and adds none. | Task 16's GOTCHA: read the alert before touching this branch; the fix belongs on main. Memory `codeql-leg2-blocks-its-own-fix.md`. |
| **R8** | `update:docker` silently **skips** a baseline whose only change is sub-perceptual, and `maxDiffPixels: 100` swallows a few changed digits — and the change here **is** two digits. A green update run would be false comfort. | Memories `vr-update-skips-subperceptual.md`, `vr-tolerance-hides-text-changes.md`. The rendered change is `77`→`76` and `30,600`→`30,500`. | Task 13 **`rm`s both PNGs first**, then regenerates, then requires reading the sentence in the regenerated image. Plus the re-entry rule if the numbers move again later. |
| **R9** | The three `RESERVED` sets are hand-mirrored with **no gate**, so a two-of-three edit lands green and stays wrong. | `git grep -n RESERVED` → three declarations, no build-checks case referencing them. | Task 7 does all three in one pass with one validation reading all three. **Accepted residual:** this PR adds no gate for them — the ticket's *What stays* forbids an allowlist refactor. Worth a follow-up ticket; not this one. |

**Two residuals this ticket deliberately accepts, stated so the report can repeat them:**

- **G14's rule is written, not gated.** It lives in `system/pack-import.mjs`'s header and the runbook. Nothing
  makes a future pack's PR carry baselines. The next pack's PR is where the rule is tested. Do not claim in
  the report that the rule is enforced.
- **Nothing in this repo photographs the dock panel.** It is `display: none` at rest, so the pixel gate has
  never seen three rows and still will not. The only eye on it is the optional browser check in Level 4.

## ACCEPTANCE CRITERIA

Verbatim from the ticket, plus the two the pre-flight added.

- [ ] **AC #1** — `git grep -il plusui -- . ':(exclude).claude' ':(exclude)docs'` returns nothing.
- [ ] **AC #2** — `docs/figma-runbook.md` keeps a one-line note: the pack was removed, when it was decided, and
      why (the honesty trail does not end in a dangling reference); `git log -- system/tokens.plusui.css` keeps
      the import run (2 commits: `83f7af9`, `7636e45` — observed).
- [ ] **AC #3** — `node agent-layer/gen-loc-summary.mjs` re-run and its diff read (`runtime.files` 77→76);
      **`approach-neutral.png` + `approach-saulera.png` regenerated in this PR** from a clean detached worktree.
- [ ] **AC #4** — `node tooling/build-checks.mjs` **all 34 groups** green · `node tooling/studio-journey.mjs all`
      green · `gen-loc-summary --check` clean after staging · `gh pr checks` green (`verify`, `visual`).
      **The ticket says "all 27" — that figure is stale; the observed count on this tree is 34, and
      `drift-check.mjs:176-179` pins it against CLAUDE.md and gates.md.**
- [ ] **AC #5 (ticket §"One rule written in")** — G14's rule present in `system/pack-import.mjs`'s header AND
      in the runbook's "adding a pack" steps.
- [ ] **AC #6 (pre-flight addition)** — `tooling/build-checks.mjs:3490`'s floor moved to `>= 3`; its
      reddening mutation (`>= 4`) run and observed red, **then reverted and re-run to green**, with
      `git diff --stat tooling/build-checks.mjs` showing no mutation residue. Both runs in the report.
- [ ] **AC #7 (pre-flight addition)** — all three `RESERVED` sets edited; `assertSlug('plusui')` no longer
      throws.

---

## COMPLETION CHECKLIST

- [ ] All 16 tasks completed in order
- [ ] Each task's VALIDATE run at the time, output pasted into the report
- [ ] Task 4's reddening mutation run, observed red, **then reverted and re-run green** (no residue in `git diff`)
- [ ] `build-checks` ✓ 34 groups · `drift-check` ✓ · `token-lint` ✓ · `studio-journey all` ✓
- [ ] `loc-summary.json` diff read field by field against Task 12's table
- [ ] Exactly two baseline PNGs changed
- [ ] AC-#1 grep empty
- [ ] Deliberate keeps (below) confirmed untouched
- [ ] §RISK REGISTER re-read before pushing: R4 (`gh pr list` — no new PR touching `system/` or the
      baselines) and R7 (`codeql` alerts) re-checked live, not taken from planning time
- [ ] The two accepted residuals repeated in the report: G14's rule is written, not gated; the dock panel is
      still unphotographed
- [ ] One atomic commit; PR body carries `Closes #296`; plan + report + review in the same PR

---

## OPEN QUESTIONS / ASSUMPTIONS

**Q1 — the removal date in the runbook note.** AC #2 says *"the pack was removed on 2026-08-28"*. 2026-08-28 is
the **grill/decision** date; the removal happens today (2026-09-14). Writing the AC's literal wording would put
a false statement into the honesty trail the AC exists to protect. **Assumption: write "removed at #296
(decided 2026-08-28, epic #295 G11)".** Proceed under it; flag in the PR body. If the owner prefers the literal
wording, it is a one-line edit.

**Q2 — `pack-import.mjs:468`, "a palette library like Plus UI carries 20+".** Kept verbatim. It is a statement
about a Figma file that still exists in the world, used to justify why `classifyRamps` asks rather than picks;
it is not a reference to a pack this repo ships, and it does not match AC #1's grep (no `plusui` token — the
string has a space). **Assumption: keep.** Named here so it is a decision, not an oversight.

**Deliberate keeps — do not "tidy" these:**

| Site | Text | Why it stays |
|---|---|---|
| `system/pack-import.mjs:468` | "a palette library like Plus UI carries 20+" | a Figma file in the world, not a pack in this repo; no grep match (Q2) |
| `system/studio-keep.mjs:101` | "under all four shipped packs plus a derived one" | a **dated record of spike 3** (`.claude/reports/studio-export-keep-rail-210-spike3.md`). Four packs really were tested. Editing it to "three" falsifies the record. |
| `tooling/build-journey.mjs:1151` | "reports 4 rows showing in both directions" | a record of a **past bug** and how it was caught. The surrounding assertions already count rows dynamically ("counted rather than pinned to a number", line 499). |
| `system/instance-pack.mjs:11` | "the dock hard-allowlists neutral\|saulera\|verdant" | **already says three.** It was stale-ahead; this PR makes it correct. No edit. |

**Assumption — the branch.** Off `origin/main`, not off the current `feature/discovery-pre-grill-audit-292`.
The ticket has no `Depends on`.

**Assumption — `verdant` stays out of `visual.spec.mjs`'s `PACKS`.** G14's other half belongs to the swap PR
(`canvas-baseline-cascade.md`), and two PRs must not both re-baseline the same pages.

---

## NOTES (open canvas)

### Pre-flight record (run 2026-09-14 against this tree)

What was run, what it said, what changed in the plan because of it.

**P1 · `git grep -il plusui` re-run.** The ticket's footprint was observed 2026-08-28. Re-ran today: **the same
11 code files + the runbook**, no drift. The ticket's list is accurate.

**P2 · `node tooling/build-checks.mjs` on the clean tree** → `build ✓  all 34 groups pass`. **The ticket says
27.** Stale by 7 groups. Written into AC #4 with the correction, so the implementer does not chase 27.

**P3 · the blocker the ticket does not list.** `grep -n "PACK_IDS\|PACK_RE" tooling/build-checks.mjs` found
group 17 parsing the pack list **out of `dock.mjs`'s `PACK_RE`** at line 3487, then
`ok(PACK_IDS.length >= 4, …)` at 3490. Simulated the gate's own parse against the edited source without
touching the tree:

```
NOW  -> neutral|saulera|verdant|plusui  len 4 | >=4 ? true
AFTER-> neutral|saulera|verdant         len 3 | >=4 ? false | >=3 ? true
```

So Task 3 alone turns `build-checks` red, and `build-checks.mjs` is **invisible to AC #1** because it never
spells `plusui`. → **Task 4 added**, placed immediately AFTER the dock edit so the tree is never red between two tasks, plus AC #6.

**P4 · the prose-copy sweep.** Memory `gate-prose-has-three-copies.md` says a gate claim lives in three places.
Checked all three: `build-checks.mjs:3469` (header, says "four shipped packs" — edit), `group("export", …)` at
3666 (**interpolates `${PACK_IDS.length}`** — leave), and `.claude/references/gates.md`. The third was checked
**twice**, because the first predicate was too narrow: by heading
(`grep -on "\*\*Group [0-9]*"` → 8–13, 16, 18–19, 21, 23–34; **no 17**) and then by content
(`grep -n "\bfour\b\|studio-export\|single-file export\|zero-request\|stripImports\|@import"` → no
group-17 sentence, no pack count anywhere). → one prose edit, not three. Written into Task 4 as a GOTCHA,
with both greps, so the implementer can re-confirm rather than take it on trust.

**P5 · the other drift-checked generators.** `drift-check.mjs` runs 13 legs. Checked the three that could
plausibly read a pack file: `gen-pack-bundle.mjs:16` → `handoff/verdant/` only; `gen-annotated-source.mjs` →
no pack; `gen-inspect-data.mjs:20-21` → `system-graph.json` + `system/specs/*`. And
`gen-system-graph.mjs:20-24`'s `PACK_FILES` names neutral/saulera/verdant only. Ran all five in `--check` mode
on the clean tree:

```
loc summary       ✓  3 groups — no drift
param count       ✓  120 controls — no drift
system graph      ✓  63 tokens · 43 consumers · 503 edges — no drift
annotated source  ✓  2 snippets — no drift
inspect data      ✓  16 components · 9 with spec — no drift
```
→ **`loc-summary` is the only generator that moves.** REGENERATES fields written accordingly.

**P6 · the cascade arithmetic, derived not guessed.** Re-implemented `gen-loc-summary`'s group predicate and
line counter in a throwaway script against the index:

```
runtime files now 77 after 76
runtime raw lines now 30632 -> 30534   rounded 30600 -> 30500
total files      114 -> 113
total raw      38543 -> 38445          rounded 38500 -> 38400
```
Two things fell out: (a) `total.linesApprox` sits **5 lines from its rounding boundary** (38450), so a ~6-line
net addition puts it back at 38500 — the plan says *read the output, do not assert a literal*; (b) every
`system/*.mjs` line added in Phases 2–3 moves `runtime.linesApprox`, which is why **Phase 4 must run last** and
why Task 10's G14 header is budgeted at ~5 lines.

**P7 · the param-count non-cascade.** Checked `system/param-manifest.json:4` — the dock's pack switcher is
**one** entry (`input[name="pack"]`, "pack switcher radiogroup"), and the manifest's counting rules say *"a
radiogroup = 1"*. `param-count.json` stays at 120. Written in as an explicit non-cascade so nobody regenerates
it looking for a change.

**P8 · the VR blast radius.** Three separate reasons nothing beyond `approach` moves, each verified:
`visual.spec.mjs:143`'s `PACKS = { neutral, saulera }` (no Plus UI baselines exist);
`components.css:2737` `.dock-panel { display: none }` at rest (so a removed row paints nothing on any page —
corroborated by `build-journey.mjs:501`'s `packsShut === 0` assertion); and
`git grep -n "tokens\.[a-z]*\.css" -- '*.html'` shows every page linking `contract` + `neutral` only.

**P9 · branch-protection and the `visual` gate.** `verify.yml:96-108`: `visual` is
`continue-on-error: startsWith(github.head_ref, 'feature/v3-')`. The branch name in Task 1 avoids that prefix,
so `visual` genuinely blocks. Memory `main-branch-protection-off.md` still applies — read `gh pr checks` by
hand.

**P10 · the plan's own filename.** `canvas-design-import.architecture.md:374` cites
`.claude/plans/canvas-plusui-removal.md` **by name**. This plan is therefore a new file,
`canvas-plusui-removal-296.md` (the `-<ticket>` convention used by `discovery-bank-282.md` and its siblings),
back-referencing the scope doc rather than overwriting it. → recorded in Related Work.

**P12 · concurrency, checked live.** `gh pr list --state open` → one PR (#412), touching one
`.claude/code-reviews/` file. No `system/` collision, no baseline collision, so
`canvas-baseline-cascade.md`'s §Concurrency rule about two PRs re-baselining `approach` is **clear** — and
`git status --short system/` is empty despite a dirty repo root. Both written into the risk register with
"re-check before Task 13" rather than left as a planning-time fact.

**P13 · the CodeQL leg.** `origin/main` carries `f4c1d9b` (#408): *"the codeql gate reads main too — an
inherited alert blocks every PR."* Checked the live alert list —
`gh api repos/linardsb/ux-factory/code-scanning/alerts?state=open` returns **0 open alerts**, so this PR
inherits no block today. Recorded in Task 16 anyway, because the trap (trying to "fix" an inherited alert
inside an unrelated branch) is what memory `codeql-leg2-blocks-its-own-fix.md` was written for.

**P14 · what a red `build-checks` actually looks like mid-run.** Read `ok()` and `group()`
(`build-checks.mjs:306-318`): `ok()` **collects** a failure and returns; `group()` prints that group's
failures and continues; the process exits 1 at the very end with `build ✗  N failure(s)` in place of the ✓
line. So the whole run still executes with group 17 red, and a grep for another group's ✓ line still means
what it says. This is why Task 4 could safely move to position 4 — and why Task 3's GOTCHA can describe the
red window precisely instead of hand-waving at it.

**P11 · memories carried in as GOTCHAs.** Six recorded traps touch files this plan edits, all written into the
tasks that hit them: `vr-update-skips-subperceptual` + `vr-tolerance-hides-text-changes` → Task 13's `rm`;
`vr-gate-reads-working-tree` → the clean worktree; `vr-gate-approach-countup-flake` → the flake signature;
`loc-summary-counts-tracked-only` → Task 12's stage-then-check order;
`shared-worktree-parallel-sessions` → the explicit-path staging; `prs-dont-auto-close-tickets` → Task 16.

### Why the RESERVED sets are one task

Three hand-mirrored copies, and `git grep -n RESERVED` proves **nothing checks that they agree**. Two of them
(`brand-import`, `build-import`) only rename a download filename, so a half-edit is silent forever; the third
(`portal/lib/figma.mjs`) is described in its own header as *"the ONLY thing standing between a request body and
`system/tokens.<anything>.css`"*. One task, one validation that reads all three.

### What this PR deliberately does not prove

- That the dock **looks** right with three rows. The panel is `display: none` at rest, so the pixel gate has
  never seen it and still will not. The browser spot-check in Level 4 is the only eye on it, and it is optional.
- That G14's rule will be **followed**. It is written into a header and a runbook, not into a gate. The next
  pack's PR is where it is tested. Say this in the report rather than implying the rule is enforced.
- That no reader's stored `plusui` selector causes a visible oddity. The fallback is
  *the guaranteed no-op default*, which is the same path an empty storage takes — argued from the code
  (`pack-boot.js:67-76`), spot-checkable, not gated.

### Alternative weighed and rejected

**Deriving group 17's pack list from `system/tokens.*.css` on disk instead of from `PACK_RE`.** It would make
the floor self-maintaining. Rejected: the ticket's *What stays* forbids an allowlist refactor, and more
importantly the current coupling is the point — a pack added to `dock.mjs`'s `PACKS` but not to `PACK_RE` fails
in group 17 rather than shipping ungated. Reading the disk would delete that property while looking like a
tidy-up.

## AMENDMENTS

<!-- Append-only. Newest at the bottom. -->

- 2026-09-14 — written. Pre-flight (NOTES §P1–P11) added three things the ticket does not carry: the
  `build-checks.mjs` group-17 floor (invisible to the AC-#1 grep), the three `RESERVED` sets as ONE task, and
  the corrected group count (34, not 27).
- 2026-09-14 — review pass: `gates.md` re-checked with a second, content-based predicate (not only the bold
  heading), the build-checks mutation given an explicit revert-and-re-green half (AC #6 widened), Task 12
  given a `git status --short system/` pre-check before its directory add, Task 13 pinned to copy-back rather
  than committing from the worktree.
- 2026-09-14 — risk pass: §RISK REGISTER added (R1–R9, each with its live observation); the build-checks
  floor moved to Task 4 so the tree is never red mid-run; Task 1 pinned to a fetched `origin/main` with the
  observed SHA; Task 12 given the merge-before-regenerate rule; Task 13 given the re-entry rule; Task 16
  given the CodeQL leg-2 trap.
