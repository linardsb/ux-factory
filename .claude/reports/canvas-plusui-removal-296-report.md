# Implementation Report — the Plus UI pack is removed (#296)

**Plan**: `.claude/plans/canvas-plusui-removal-296.md`   **Branch**: `feature/plusui-removal-296`
**Base**: `e8982c7` → `e8982c7` (`origin/main` unmoved; re-fetched at report time)   **Status**: COMPLETE

## Summary

`system/tokens.plusui.css` is deleted, and with it every switch, allowlist and regex that named the
slug: the dock's `PACKS` row and `PACK_RE`, `pack-boot.js`'s pre-paint allowlist, `pack-derived.mjs`'s
`COMMITTED`, and all three hand-mirrored `RESERVED` slug sets. `build-checks.mjs` group 17 — the one
gate that reads the pack list out of `dock.mjs`'s `PACK_RE` and is invisible to the ticket's own grep —
has its vacuity floor moved from 4 to 3. G14's rule ("a pack the dock offers gets its VR baselines and
an accessibility vet in the same PR that adds it") is written into `system/pack-import.mjs`'s header
and the runbook's adding-a-pack steps. The `loc-summary` → `approach` baseline cascade follows.

## Tasks completed

| # | Task | File | Action |
|---|---|---|---|
| 1 | branch off `origin/main` | `feature/plusui-removal-296` in worktree `/Users/Berzins/wt-296` | CREATE (deviation — see below) |
| 2 | delete the pack | `system/tokens.plusui.css` (97 lines) | `git rm` |
| 3 | the dock row + allowlist | `system/dock.mjs` | UPDATE |
| 4 | group 17's floor `>= 4` → `>= 3` + header prose | `tooling/build-checks.mjs` | UPDATE |
| 5 | the pre-paint allowlist | `system/pack-boot.js` | UPDATE |
| 6 | `COMMITTED` + two comments | `system/pack-derived.mjs` | UPDATE |
| 7 | the three `RESERVED` sets | `portal/lib/figma.mjs` · `system/brand-import.mjs` · `system/build-import.mjs` | UPDATE |
| 8 | the pack-href regex | `tooling/studio-journey.mjs:1531` | UPDATE |
| 9 | the three now-false comments | `system/studio-frames.mjs` · `system/pack-imported.mjs` · `system/pack-import.mjs` | UPDATE |
| 10 | G14's rule in the header | `system/pack-import.mjs` | ADD |
| 11 | G14's rule + removal note | `docs/figma-runbook.md` | UPDATE |
| 12 | the cascade | `system/loc-summary.json` | REGENERATE |
| 13 | the two `approach` baselines | `tooling/visual-regression/baselines/approach-{neutral,saulera}.png` | REGENERATE |
| 14 | AC #1 grep | — | VALIDATE |
| 15 | the gates | — | VALIDATE |

Staged diff (`git diff --cached --stat`, observed): **18 files, +40 / −125** — 16 text files plus
the two baseline PNGs, which are binary and contribute 0 to the line counts. (16 files / +38 / −123
before the two citation fixes under Additions below.)

## Tests added

None, and none is to be invented (CLAUDE.md §Testing). One existing assertion changed:
`tooling/build-checks.mjs:3490`'s vacuity floor. It is still a floor, not a census — if the parse
yields nothing, the `for (const pack of PACK_IDS)` loop at 3504 never runs and every case in group 17
is silently true, so the floor must stay and only the number moves.

## Proving the checks

| Check | Mutation applied | Case that went red | Positive control |
|---|---|---|---|
| `build-checks` group 17 floor (`tooling/build-checks.mjs:3490`) | restore `PACK_IDS.length >= 4` | `build export ✗ 1 failure(s) · only 3 packs read out of PACK_RE — expected at least the three shipped ones (neutral · saulera · verdant)`, process `exit=1` (observed) | reverted → `build ✓  all 34 groups pass`, `exit=0`; `git diff --stat tooling/build-checks.mjs` → `4 ++--`, 2 insertions / 2 deletions, no mutation residue (observed) |
| the same gate, unmutated, at its natural red window | Task 3 landed, Task 4 not yet | identical failure with the *original* message `expected the four shipped ones` (observed live, before Task 4) | Task 4 → green |
| `portal/lib/figma.mjs`'s `RESERVED` refusal | n/a (the edit *is* the change) | — | before: `assertSlug("plusui")` → **THREW** `figma import: "plusui" is a reserved pack name …`; after: **returned** `plusui` (both observed). Negative control: `assertSlug("verdant")` still throws after the edit, so the guard was narrowed, not gutted (observed) |
| `dock.mjs`'s `PACK_RE` as group 17 parses it | n/a | — | the gate's own regex, run standalone, reads `[ 'neutral', 'saulera', 'verdant' ]` (observed) — so the declaration survived the edit in the exact spelling `build-checks.mjs:3487` requires |
| AC #1's grep | n/a | — | 11 files before → 0 after (both observed) |
| `gen-loc-summary --check` | n/a | — | drift reported before staging the regenerated file, `no drift` after (observed) |

**Two edits in this PR carry no reddening mutation, stated plainly rather than dressed up:**

- **Task 8 (`tooling/studio-journey.mjs:1531`)** is behaviour-neutral. No shipped page links
  `tokens.plusui.css` (`git grep -n "tokens\.[a-z]*\.css" -- '*.html'` → every page links `contract` +
  `neutral` only), so the filter's result set is identical either way. The journey re-run proves the
  surrounding #213 dock case still passes; it does **not** prove this line was ever load-bearing.
- **Task 10 (G14's header rule)** is a written invariant, not a gate. Nothing makes a future pack's PR
  carry baselines. Its enforcement is a reviewer reading the header plus the runbook step in Task 11.

## Validation results

| Command | Result | Provenance |
|---|---|---|
| `node --check` × 11 edited `.mjs`/`.js` | all silent | observed |
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` | observed |
| — its group 17 ✓ line | `…and each of the **3** packs dock.mjs's own PACK_RE allowlists…` — self-updated from `${PACK_IDS.length}` with no hand edit at line 3666 | observed |
| `node tooling/token-lint.mjs` | `✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` | observed |
| `node tooling/drift-check.mjs` | `✓  syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count` (13 legs) | observed |
| `node agent-layer/gen-loc-summary.mjs` | `loc summary ✓  3 groups` | observed |
| `node agent-layer/gen-loc-summary.mjs --check` (after staging) | `loc summary ✓  3 groups — no drift` | observed |
| AC #1 `git grep -il plusui -- . ':(exclude).claude' ':(exclude)docs'` | no output (exit 1) | observed |
| `grep -c plusui docs/figma-runbook.md` | `2` | observed |
| `git log --oneline -- system/tokens.plusui.css` | `83f7af9`, `7636e45` — the import run survives the deletion | observed |
| `node tooling/studio-journey.mjs all` (3 engines, `BASE=http://127.0.0.1:4761`) | **1564 passed, 0 failed**, exit 0 — chromium · firefox · webkit (webkit 520/0), INP gate included | observed |
| `cd tooling/visual-regression && npm run update:docker` | `22 passed (35.7s)`, exit 0 | observed |

### The cascade diff, field by field (Task 12's table)

| field | before | after | plan said | provenance |
|---|---|---|---|---|
| `runtime.files` | 77 | **76** | 76 (certain) | observed |
| `runtime.linesApprox` | 30600 | **30500** | 30500 (derived) | observed |
| `total.files` | 114 | **113** | 113 (certain) | observed |
| `total.linesApprox` | 38500 | **38400** | "38400 **or** 38500 — read the output" | observed |
| `pages` group | 17 / 5200 | unchanged | must not move | observed |
| `generators` group | 20 / 2700 | unchanged | must not move (would mean a sibling's staged file leaked in) | observed |

`approach.html:271-279` renders the **runtime** group only, so the two regenerated PNGs must read
**"76 files, about 30,500 lines"**.

### The pixel gate (Task 13), read rather than assumed

`update:docker` in the clean worktree, Docker 29.2.1, image `mcr.microsoft.com/playwright:v1.61.1-jammy`:
**`22 passed (35.7s)`, exit 0**. Both `approach` PNGs were deleted first, and the run reported
`A snapshot doesn't exist at …/approach-neutral.png, writing actual.` and the same for `-saulera` —
those two lines are the only snapshot writes in the log (observed).

**Exactly two baselines changed**, proven two ways: `git status --short baselines/` lists only
`approach-neutral.png` and `approach-saulera.png`; and a SHA-256 of all 20 surviving PNGs taken before
the run `diff`s clean against the same 20 after it (observed).

**What actually moved inside the images**, diffed against the committed baselines:

| baseline | page size | changed bbox (exclusive upper) | raw differing bytes | pixelmatch count at the gate's `threshold: 0.2` |
|---|---|---|---|---|
| `approach-neutral.png` | 1280 × 6170 | `(84, 4550) → (521, 4581)` — one line of text | 117 | **16** |
| `approach-saulera.png` | 1280 × 6422 | `(86, 4753) → (487, 4782)` — one line of text | 103 | **26** |

The crops were read visually. Before: *"…the design system this site ships is **77 files, about
30,600 lines**."* After: *"…**76 files, about 30,500 lines**."* Nothing else on either page moved.

**R8 was real, and WORSE than the plan estimated — the pixel gate cannot see this change at all.**
The two raw byte-difference counts (117 / 103) are NOT what the gate compares. `compareImages` in
`playwright-core@1.61.1`'s `coreBundle.js` runs `pixelmatch(… { threshold: options.threshold ?? 0.2 })`
and fails only on `count > maxDiffPixels`; the config sets `maxDiffPixels: 100` and no `threshold`, so
the default 0.2 applies and the real counts are **16 and 26** — both far under 100.

This was settled **empirically, not by reading the comparator**: with the OLD baselines restored to
the working tree and the new page content in place, the real gate in the pinned Docker image was run
over just those two tests —

```
✓  1 [chromium] › visual.spec.mjs:159:5 › approach · neutral (1.5s)
✓  2 [chromium] › visual.spec.mjs:159:5 › approach · saulera (1.6s)
   2 passed (2.7s)            exit 0
```

**Both PASS against baselines that show the wrong numbers.** `update:docker` runs
`--update-snapshots` bare, whose `changed` preset rewrites a snapshot only when the comparison
*fails* — so without the mandatory `rm`, **neither** baseline would have been rewritten, and CI would
have stayed green over two photographs of a sentence the page no longer prints. The `rm` was not a
safety margin; it was the only mechanism that could have worked.

The correction matters for the next plan: the standing lesson is not "watch the pixel tolerance" but
**the pixel gate is structurally blind to a one-line text change on these pages — a page whose only
change is text must have its baselines deleted, never merely re-run** (extends memories
`vr-tolerance-hides-text-changes.md`, `vr-update-skips-subperceptual.md`).

**The re-entry rule** (Task 13's GOTCHA): nothing touched a tracked `system/*.{css,mjs,js}` after the
baselines were generated. `origin/main` re-fetched at report time is still `e8982c7` — 0 behind, 0
ahead — so no merge was needed and no second cascade is owed.

## Not run

**None.** Every validation step the plan lists executed, including both steps its own table marked
"owner's hand": `npm run update:docker` (Docker 29.2.1) and `node tooling/studio-journey.mjs all`
(three engines). The one step the plan marked optional — the browser spot-check of the stale
`factory-pack=plusui` fallback — was also run, and is reported above rather than skipped.

Nothing was verified by reading code where the plan asked for a run.

## Deviations from the plan

**D1 — worktree instead of an in-place branch switch (Task 1).** `(plan error)` — not the plan's
fault, but its command does not work on this tree. `git switch -c feature/plusui-removal-296
origin/main` **aborts**: four untracked files in the shared checkout
(`.claude/code-reviews/pr-406-review.md`, `.claude/plans/discovery-epic-close-293.md`,
`.claude/plans/prd-house-shape-396.{md,html}`) are tracked on `origin/main` and would be overwritten.
They belong to a sibling session, so moving them is not mine to do. Used
`git worktree add /Users/Berzins/wt-296 -b feature/plusui-removal-296 origin/main` instead. This is
strictly better here: the worktree is clean (so `gen-loc-summary`, which counts from the git index,
cannot be poisoned), it is under `/Users` so Docker file sharing reaches it, and it is the clean tree
Task 13 asks for anyway. The plan file was copied in by hand.

**D2 — committing from the worktree, not copying baselines back (Task 13).** The plan says copy the
PNGs back and commit from the main checkout, because "a worktree on the same branch shares the ref".
That premise does not hold here: the main checkout is on `feature/discovery-pre-grill-audit-292`, so
the worktree owns `feature/plusui-removal-296` alone. Committing from it gives the same single atomic
commit CLAUDE.md §Git asks for, with one fewer copy step.

**D3 — `system/pack-import.mjs:600`, the plan's literal replacement duplicates a filename.**
`(plan error)` The sentence spans two lines; line 599 already ends `— tokens.verdant.css,`. The plan's
Task 9 IMPLEMENT gives line 600 as `// tokens.verdant.css and the handoff pack all carry it.`, which
would render *"— tokens.verdant.css, tokens.verdant.css and the handoff pack all carry it"*. Wrote the
grammatically correct two-line result instead (dropping line 599's now-stray comma, and "both" for
two items, which the plan's own GOTCHA sanctioned): *"…part of every committed pack's bytes —
tokens.verdant.css / and the handoff pack both carry it. Do not reflow it."* Same line count, so no
loc impact. The `emitPack` header string itself is untouched. **Superseded later in this PR:**
the review's F2 found the *"and the handoff pack"* half false — `grep -rl 'Do not edit by hand'
handoff/` returns nothing — so a follow-up commit cut the sentence to *"— tokens.verdant.css /
carries it."*

**D4 — G14's header sentence says "Plus UI", not `"plusui"`.** `(plan error)` Task 10's literal text
ends `// The "plusui" pack was removed at #296 because it landed with neither.` — which **fails the
plan's own AC #1**. Observed: with the plan's wording, `git grep -il plusui -- . ':(exclude).claude'
':(exclude)docs'` printed `system/pack-import.mjs`. Applied the plan's own Q2 precedent (it keeps
`"a palette library like Plus UI carries 20+"` at line 474 *because* the spaced form does not match
the grep) and wrote `// The Plus UI pack was removed at #296 because it landed with neither.` The
honesty trail is intact — the header still names what was removed, when and why — and AC #1 passes.

**D5 — the G14 header is 6 lines, not the budgeted ~5.** Five content lines plus a `//` separator.
`runtime.linesApprox` landed at 30500 regardless, inside the `[30450, 30549]` bucket, so the budget's
purpose was met.

## Assumptions carried

- **Q1, the runbook's removal date.** Proceeded under the plan's assumption: wrote *"removed at #296
  (decided 2026-08-28, epic #295 G11)"* rather than AC #2's literal *"removed on 2026-08-28"*, which
  would be false (the removal is today, 2026-09-14) and would put an untruth into the honesty trail
  the AC exists to protect. Flagged in the PR body; a one-line edit if the owner prefers the literal.
- **Q2, `pack-import.mjs:474`** — *"a palette library like Plus UI carries 20+"* kept verbatim. A
  statement about a Figma file that still exists in the world, justifying why `classifyRamps` asks
  rather than picks. Not a reference to a pack this repo ships.
- **The four deliberate keeps confirmed untouched** (each re-read after the edits):
  `system/pack-import.mjs:474` (above) · `system/studio-keep.mjs:101-102` "under all four shipped
  packs plus a derived one" — a dated record of spike 3, true when written · `tooling/build-journey.mjs:1151`
  "reports 4 rows showing in both directions" — a record of a past bug, and **verified to be comment
  prose, not an assertion**: the live assertions at `build-journey.mjs:495-505` count rows dynamically
  (`packsShut === 0`, `packRows > 0`, `=== packRows`) · `system/instance-pack.mjs:11` "the dock
  hard-allowlists neutral|saulera|verdant" — already said three; this PR makes it correct.
- **`verdant` stays out of `visual.spec.mjs`'s `PACKS`.** G14's other half belongs to the swap PR
  (`canvas-baseline-cascade.md`); two PRs must not both re-baseline the same pages.
- **No `localStorage` migration for a stale `factory-pack=plusui`.** Deliberate: the reader falls
  through to `pack-boot.js`'s guaranteed no-op default (the page keeps `tokens.neutral.css`), and
  `pack-derived.mjs:440` maps an unknown prewear to `"neutral"` the same way. A new pre-paint code
  path on ten pages, to delete an already-inert key, would churn every baseline.

## Considered and deliberately NOT changed

Surfaced by an independent blast-radius sweep of this branch, checked by hand, and left alone:

- **`system/pack-imported.mjs:53-54` — "those five families" is NOT a miscount.** The edit drops
  `plusui` from the file list (`contract/neutral/verdant/saulera`, now four names) while the sentence
  still says "the values of those **five** families". Verified: `KEY_NAME` on line 52 is
  `/^--(color|spacing|radius|type|shadow)-[a-z0-9-]{1,32}$/` — **five token families**, which is what
  "those five families" refers to. The old list coincidentally also had five *files*, which is what
  makes the new text momentarily ambiguous, but the claim is true as written and the measured
  63-character bound remains valid (a charset measured over five packs is a superset of what four
  use). Recorded here so the next reader does not "fix" a correct sentence.
- **`system/studio-keep.mjs:99-104`** — "under all four shipped packs plus a derived one" is now
  numerically false about the tree, and stays, because it is an explicitly dated record of spike 3
  with its report path cited. The `EXPORT_COPY` string below it — the text that actually ships to a
  page — carries no count.
- **`.github/workflows/verify.yml:11-12` — a PRE-EXISTING stale figure, not this PR's.** The comment
  says the visual job covers "10 pages, 20 PNGs"; the spec declares **11** pages and there are **22**
  baseline PNGs on disk (both observed). A page was added at some point without updating the comment.
  Untouched: it predates this branch, this change does not move it, and correcting CI prose is not in
  the ticket's footprint. Worth a one-line follow-up.

## Additions beyond the plan

- **A pre-flight sweep for pack-count assertions that do not spell `plusui`** (the class R1 came from;
  the plan's P3 only grepped inside `build-checks.mjs`). Ran
  `grep -rn "=== 4|length === 4|>= 4|length, 4" tooling/build-checks.mjs tooling/*journey*.mjs` and
  `grep -rn "dock-pack-|packRows|packsShut|PACKS" tooling/*.mjs`. **Result: no journey driver pins a
  pack count.** `build-journey.mjs:1151` is comment prose; every live pack-row assertion counts
  dynamically; `studio-journey.mjs`'s three dock clicks all target `dock-pack-saulera` specifically.
  `build-checks.mjs:3490` was the only one, and the plan already had it.
- **A negative control on `assertSlug`** (`assertSlug('verdant')` must still throw after the edit), so
  the RESERVED edit is shown to have narrowed the guard rather than emptied it.
- **A full-gate baseline captured on the pre-edit tree** — `drift-check` (13 legs) and `token-lint`,
  not just `build-checks`. The plan's P5 had observed five generators; a pre-existing red leg found at
  Task 15 would have cost a pass attributing it to this PR. Both were green before any edit.
- **`npm ci` in `tooling/style-dictionary/`** — a fresh worktree has no `node_modules`, and
  `drift-check`'s `sd tokens` leg needs it. Not a repo change (gitignored).
- **`npx playwright install`** — the host had no Playwright browsers cached at all, so
  `studio-journey all` could not start. Not a repo change.

### The running page (Level 4), run rather than argued

Chromium against the worktree served on a private port (4761, `curl`-verified to be serving THIS
tree: `grep -c plusui` on the served `dock.mjs` → 0):

| check | result |
|---|---|
| stale `factory-pack=plusui` **and** `factory-pack-prewear=plusui`, then reload | pack stylesheet lines are `["/system/tokens.contract.css", "/system/tokens.neutral.css"]` — the guaranteed no-op default; `--color-accent` `#2563eb`, body 7380 px, **0 page errors** |
| the dock's pack rows with `#appearance` open | exactly **three**, visible: `neutral` · `saulera` · `verdant` |
| **positive control** — set `factory-pack=saulera`, reload | stylesheet lines become `[…contract.css, …saulera.css]` |

The control is what makes the first row mean anything: it proves the probe can observe a pack
re-point, so "plusui fell through to neutral" is a real fallback and not a probe that sees nothing.

- **Two `dock.mjs` line-number citations this change broke, fixed.** `system/dock.mjs` net-shrank by
  4 lines (the deleted `PACKS` row + its 3-line comment), which moved two live `file:line` anchors
  pointing into it. Both verified against `git show origin/main:system/dock.mjs` before editing:
  `system/bus-toggles.mjs:105` cited `dock.mjs:166` (`for (const o of options) {`, now line **162**)
  and `system/instance-pack.mjs:97` cited `dock.mjs:190-203` (the "one transition" comment block,
  now **186-199**). Both corrected. These are in scope by the same rule that says to remove imports
  *your* change orphaned — the breakage traces directly to this diff. Digit-only edits inside
  existing comment lines, so both files' line counts are unchanged (228 and 139, index == worktree,
  observed) and `loc-summary` did not move: `gen-loc-summary --check` still reports no drift.
  **Pre-existing citation drift was left alone** — an independent review found `system/morph.mjs:6,39`
  and `system/pack-derived.mjs:158` already 10–27 lines stale at `origin/main`; not this change's
  fallout, not this ticket's footprint. The same −4 shift incidentally *re-fixed* several anchors
  that were stale in the other direction (`analytics.mjs:179`, `build-checks.mjs:1752`,
  `build-journey.mjs:1119`, `build-journey.mjs:510`, `catalog.mjs:505`, `studio-frames.mjs:140`,
  `build-checks.mjs:4945,4968`).
- **The three agents that produced the findings above.** A code review of the staged diff, a
  blast-radius sweep for staleness no `grep plusui` could catch, and an adversarial re-derivation of
  every figure in this report. The last two each found a real error: the staged file count, and the
  R8 comparison. Both are corrected above, and the R8 correction was then settled by running the
  gate rather than by accepting the analysis.
- **The empirical R8 test itself** — restoring HEAD's baselines to the working tree (index
  untouched, via `git show HEAD:<path> >`), running the real gate over the two approach tests in the
  pinned image, then restoring from the index with `git checkout-index -f` and re-verifying both
  SHA-256s. The plan asked for the `rm`; it did not ask anyone to prove the `rm` was load-bearing.

## Issues encountered

**I1 — `git switch` cannot run in the shared checkout.** See D1. Cost one attempt; resolved with a
worktree, which the ticket needed anyway.

**I2 — the host had no Playwright browsers and no `@playwright/test`.** `~/Library/Caches/ms-playwright`
was empty, so the first `studio-journey` attempt died at `tooling/studio-journey.mjs:45` with
`Cannot find module '@playwright/test'` (it resolves via `createRequire` from
`tooling/visual-regression/`, and a fresh worktree has no `node_modules` there). Fixed by
`npx playwright install` plus `@playwright/test@1.59.1` resolved from `~/node_modules` — deliberately
NOT into `tooling/visual-regression/node_modules`, because Docker's `npm ci` writes Linux binaries
into that exact mounted path and would have shadowed the host's mac build mid-run. Neither install
touches the repo (`node_modules/` is gitignored at line 2).

**I3 — the plan's time estimate for `studio-journey all` is optimistic.** It says ~5–10 minutes for
three engines; chromium alone ran well past that on this machine. Not a defect, but worth correcting
in the next plan that budgets for this driver.
