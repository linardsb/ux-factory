# Implementation Report — every claim on approach.html reaches its proof in at most two steps (#497)

**Plan**: `.claude/plans/approach-claims-to-proof-497.md`   **Branch**: `feat/approach-claims-497` (worktree `../wt-497`)
**Base**: ec35d6d (origin/main at start) → ec35d6d (origin/main at report; `git fetch` + merge: "Already up to date")
**Status**: COMPLETE. Q1 (phone-width paths) was answered by the owner during implementation; see Deviations.

## Summary

`system/claim-manifest.json` audits all 77 sentences in approach.html's 45 blocks: 34 claims (3 at 0 steps, 27 at 1,
4 at 2), 27 labels, 6 attributions, 5 definitions, 5 stances (`node -e` count over the manifest, observed). Build-checks group 52 (`claims`) re-derives every
block from the page, refuses an unlisted block or sentence, resolves every target against the tree, verifies hop 1
and pins `maxSteps` at 2. The owner's P1–P14 copy adds 11 proof links (P1–P4, P6–P9, P11–P13; `<a href` in `<main>`
19 on the branch against 8 on main, observed) and removes the two false claims. Group
count 51 → 52 in all five places; the three approach VR baselines are regenerated.

Owner sign-off, quoted from the plan: **"P1–P14 approved as written, 2026-10-04, at planning (AskUserQuestion)"**
(answer: "Approve all as written"). The 14 rows render character for character as signed off: walker output
compared row by row against the plan's §Owner-approved wording.

## Tasks completed

- T1 worktree `../wt-497` from origin/main, `npm ci` in `tooling/icons` + `tooling/style-dictionary`; N = 51 observed, so G = 52.
- T2 sign-off quoted above.
- T3 → `system/claim-manifest.json` (CREATE). Texts were taken from the plan's walker output, never retyped. Kinds and targets follow §Audit.
- T4 → `tooling/build-checks.mjs` (UPDATE): group 52, inside the enclosing block after group 51, before `if (failures)`.
- T5 on-disk mutations, below.
- T6 → `approach.html` (UPDATE): P1–P14, 45 `data-claim` attributes, the underline rule widened from `#method .max-prose a` to `main p a`, and the `structured-data` and `llms-txt` dfns removed (see Deviations).
- T7 manifest re-pinned to the new copy (0 `"none"` targets).
- T8 → `tooling/build-checks.mjs` (pass line, spelt-out header "Fifty-two"), `CLAUDE.md` ×2 counts + map line + "Where new code goes" bullet, `.claude/references/gates.md` (count + Group 52 paragraph), `tooling/ratify-journey.mjs:228` (both literals).
- T9 `gen-loc-summary --check` after `git add approach.html` → `loc summary ✓  3 groups — no drift` (observed); nothing regenerated.
- T10 → `tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png` regenerated (rm first, clean detached worktree under /Users).
- T11 browser walk, below.

## Tests added

Group 52, cases 52.1–52.11. Each case runs `auditClaims` or `walkClaims`, and none reads source as text for its verdict:
52.1 real page/manifest/tree → no problems · 52.2 (c) a new `<p>`, a sentence appended to card-shape, two sentences
in one row · 52.3 (b) steps 3, `maxSteps: 3` · 52.4 (a) untracked target, target gone from disk, unlisted control ·
52.5 (a) outside URL · 52.6 (a) `#success-metric`, `#L13-L15` · 52.7 hop 1: the hero's `#case` link removed, a link
borrowed from method-scope, steps 0 at another section · 52.8 a `loc-proof` fragment reworded · 52.9 a claim with
target `none`, a label with a target · 52.10 walker and manifest both at 45 blocks · 52.11 `git status` unchanged.
The `mutate` helper fails the case by name if a mutation does not apply.

## Proving the checks

In-process positive controls (52.2–52.9): first observed firing with the current-copy manifest. That run printed
`build claims ✗ 1 failure(s)` with 52.1 alone listing the 17 `"target": "none"` rows by block and sentence and
nothing else, so every control case passed (observed, `node tooling/build-checks.mjs`). They fire again on the final tree,
where the group is ✓ only if every `fires(...)` matched.

On-disk mutations (Task 5), each restored and followed by `build ✓  all 51 groups pass` (observed, before the count moved):

| Leg | Mutation | Observed |
|---|---|---|
| (a) | `mv .claude/system-reviews <scratch>` | `build claims ✗ 1 failure(s)` — `block "method-title" sentence 1 — target: .claude/system-reviews is not on disk`, same for method-lead 1–2 and card-prove 2 and 4 |
| (a) as planned | `mv discovery/faster-payment/prd.md <scratch>` | exit 1, but group 47 crashes first: `TypeError: Cannot read properties of undefined (reading 'slice')` at `build-checks.mjs:17775`, so group 52 never ran (pre-existing; see Issues) |
| (b) | case-title `steps: 3` | `build claims ✗` — `block "case-title" sentence 1 — steps: steps 3 exceeds maxSteps 2` |
| (c) | `<p class="muted">I ship faster than anyone.</p>` after the method lead | `build claims ✗ 2 failure(s)` — `block <p> "I ship faster than anyone." — coverage: block has no data-claim` and `52.10: the walker found 46 blocks and the manifest lists 45` |
| (c) | ` I never miss.` appended in card-shape | `build claims ✗` — `block "card-shape" — coverage: sentences do not match the page, which reads "…"` |
| count | CLAUDE.md:150 left at 51 | `drift ✗  group-count drift: CLAUDE.md (architecture map): says 51 groups, build-checks defines 52` |

Driver proofs: the CodeQL scan flagged 2 alerts on a known-bad line appended to the same extract (`js/incomplete-sanitization`
and a self-replacement), against 0 without it. The GitHub anchor grep returns 0 for a made-up heading
(`user-content-zz-no-such-heading`). The browser walk opens with an absent-selector check that reports not visible.

Kept, though no single mutation reddens it: 52.11 (`git status` unchanged). It guards against the group writing
to the tree, which no current code path does.

## Validation results

- L1 `node --check tooling/build-checks.mjs` → no output; manifest `JSON.parse` → no output (observed).
- L2 `node tooling/build-checks.mjs` → `build ✓  all 52 groups pass` (observed, final tree).
- L3 `node tooling/drift-check.mjs` → `drift-check ✓ syntax · … · group-count` (observed); `node tooling/token-lint.mjs` →
  `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed).
- L5 CodeQL 2.27.0, `javascript-code-scanning.qls`, over group 52 extracted with its imports, `ok`/`group` stubs and
  the closing brace → `0` rows (observed; "scanned 2 out of 2" files).
- CANNOT REACH clause: byte-identical after whitespace/comment normalisation in gates.md, the group string, the
  section header and the manifest `$description` (one md5 `c54d21f4` across all four, observed).
- VR `npm run update:docker` in a clean detached worktree: three "snapshot doesn't exist … writing actual" lines for
  approach; `git diff --stat origin/main -- tooling/visual-regression/baselines/` → exactly the three approach PNGs
  (observed). The run exited 1 on `factory · neutral` ("Failed to re-generate expected"), a page this branch does not
  touch; its baseline is unchanged. The neutral PNG's method band was viewed: all 11 prose links in the band are underlined at rest.
- T11 walk (headless Chromium, `tooling/visual-regression/serve.mjs` on an OS-assigned port, `curl` confirmed the
  served page carries `data-claim`; server killed by PID):

| # | Path | 1280 | 390 |
|---|---|---|---|
| 1 | hero "The case study" → `#case` | PASS, top 192px | PASS, top 194px |
| 1b | every `main p a` underlined, buttons not | PASS, 15 links | PASS, 15 links |
| 2,3,5,9,10a | GitHub targets (8 URLs) | `curl` 200 for all 8; `#success-metrics` and `#transition-note` present as `user-content-` anchors | same URLs |
| 4 | "the real trigger" → `/factory#method` | PASS, band top 235px, ready, 12 cards, first "Act 1 · Hooked · Internal trigger" | PASS, top 659px |
| 6 | Verdant / Fieldwork → fictional notice | PASS both | PASS both |
| 7 | dock (1) → another pack (2) | PASS, accent #2563eb → #F59E0B (saulera) | **FAIL**: the dock is hidden below 1100px (`components.css:3163`) |
| 8 | inspect (1) → hover a card (2) | PASS: the method card's bubble opens, visible, with `--color-bg-surface --color-border --radius-md` | **FAIL**: no hover shows a visible bubble (it fills, but stays closed) |
| 10 | "llms.txt index" → `/handoff/verdant/llms.txt` | PASS, 200 | PASS, 200 |

Item 8 was run with `insp2.cjs` (scroll, wait 1.5 s, hover, read): twice per width on this branch and twice on a
detached origin/main worktree (`data-claim` count 0, so the unmodified page). The results were identical every
time. At 1280 the method card opens visible. At 390 nothing is visible on either tree. The
case-study card's bubble fills but stays closed at both widths on both trees. `inspect.mjs` has no width gate (grep
for a media query or `matchMedia` → none), so the 390 cause is not identified. It is unchanged by this branch.
An earlier, weaker probe (`insp.cjs`, no settle) missed opens that `insp2` sees, so it is not cited as evidence.

## Not run

- Firefox/WebKit legs of the walk: Chromium only (owner's call; the plan asked for 1280 + 390, not engines).
- The click-through of GitHub targets in a browser. They were verified by HTTP status plus the anchor id in the
  served HTML. Seeing each page scroll to its heading is a visual check not done here.
- `tooling/ratify-journey.mjs` (R7 now reads 52): not run; it spawns the full ratify chain. Tracker: the PR.
- CI's visual job: runs on the PR.

## Deviations from the plan

- **P13 also drops the `llms-txt` dfn** (plan error). The owner's link text "llms.txt index" overlaps the existing
  `<dfn data-term="llms-txt" tabindex="0">`, and the plan forbids a dfn inside a link. The words and link placement
  are the owner's, character for character; the glossary bubble on "llms.txt" is gone. Both glossary keys stay
  in `system/glossary.mjs`, now unused (`git grep` found no other reader).
- **AC leg (a) on disk used `.claude/system-reviews`, not `prd.md`** (plan error). Removing `prd.md` crashes group 47
  before group 52 runs. The `prd.md` variant is still covered in process by 52.4 ("not tracked" and "not on disk").
- **Level 5 CodeQL command amended** (plan error). The plan's `sed` slice is syntactically unclosed and CodeQL
  extracted nothing from it.
- **Phone-width paths, Q1, owner decision 2026-10-04** (plan error: Task 11 assumed the dock and Inspect at 390).
  Six claims had no ≤ 2-step path at 390. Asked by AskUserQuestion; owner answer: **"Retarget two, flag rest
  (Recommended)"**. Applied:
  - case-title and case-outcome S1 now target `blob/main/approach.html` at 1 step, `via: "case-build"`, which is the
    "Three stylesheets" link in the same `#case` section and works at any width. Gate ✓ (observed).
  - card-system S4 keeps `control:input[name="pack"]` at 2 steps. Its `how` starts "At 1100px and wider (the dock is
    not shown below that)".
  - case-build S2–S4 keep `control:[data-inspect-toggle]` at 2 steps. Their `how` starts "At desktop width (the
    bubble opens at 1280px, and not at 390px, on main too)".
  - No copy changed.
- Case numbering groups mutations by leg: 52.2–52.9 hold 17 controls (`grep -c "fires(\"52"`), where the plan listed 12.
  The legs are the same, and the five added controls are: two sentences in one row, an unlisted control, a target gone
  from disk, a claim with target `none`, and a label with a target.

## Assumptions carried

- `hero-cta` and `end-cta` are split into two label rows each ("The method" / "The case study"), as §Edge Cases describes.
- Manifest `how` text is mine, written against what each target shows. The PRD's success metrics list a kill
  criterion per decision, and its transition note holds seq 10–12 (appetite, rabbit holes, out of bounds). Both were read before the rows were written.
- `rendered` rows check `steps === 0` as well as id, source and fragments.

## Additions beyond the plan

- `headingSlugs` skips fenced code blocks, so a `#` line inside a code fence cannot vouch for an anchor.
- Target ids for `/path#id` are matched in the comment-stripped file, because `factory.html:300` contains
  `id="method"` inside a comment.

## Issues encountered

- Four claims still have no path at 390 (card-system S4 and case-build S2–S4). The owner chose to flag them in `how`
  rather than change copy. The gate does not model viewports, and its CANNOT REACH clause covers hops after the first.
  Inspect at 390 not opening is unexplained and pre-existing; it is worth its own ticket if phones matter.
- Pre-existing: group 47's failure message at `build-checks.mjs:17775` throws a TypeError when `prd.md` is missing,
  which aborts the whole gate. Not fixed here (out of scope); worth a one-line follow-up.
- The `factory · neutral` VR update failure is pre-existing flake territory on an untouched page. CI's visual job is the authority.

## Review round 1 (`.claude/code-reviews/pr-527-review.md`)

Owner's triage: fix F1 F3 F6 F7 F8 on this PR, F2 by narrowing the sentence, defer F4 and F5.

- **F1 fixed (data only).** Hop 1 must be a link in the claim's own block or a `via` block in the same section,
  and `card-system`'s only link is `#case`, so `components.css` cannot be the target. S1 is now `#case` at 2 steps,
  with `how` naming the Build card's "the component styles" link as the second hop. S3 stays at 1 step, and its
  `how` now names the annotated source in the band (it shows `--color-accent*` roles only, so the `how` says colour,
  not size). Probe (observed, reverted): a literal `#ff0000` in `components.css` turns no gate red. token-lint and
  build-checks stay green, and only system-graph drifts. So S3's "can't drift" is shown by the exhibit, not enforced
  by a gate. **Needs the owner's read:** whether S3 overclaims.
- **F2 fixed (copy, owner's call).** `case-outcome` S1 now reads "Re-theming is one line in each page's `<head>`.",
  which its target shows. The page and the manifest row changed together, and the three approach baselines were
  regenerated (removed, then `update:docker` from a clean detached worktree at `71518eb`). Only those three PNGs changed.
- **F3 + F7 fixed.** The CANNOT REACH clause now names attribute text (`aria-label`, `title`, `alt`) and states that
  hop 1 is block-scoped. All four copies (manifest `$description`, `gates.md`, the group comment and the group string)
  were changed by one script that asserted exactly one match per copy.
- **F6 fixed.** A close tag with no open match is ignored. 52.12 inserts a stray `</em>` into `card-system` and
  expects no problems.
- **F8 fixed.** `headingSlugs` keeps `_`, and a `/path#id` fragment must be an `id` attribute: the ids are collected
  with a fixed `\sid="…"` regex, never `new RegExp(frag)`. 52.13 checks that an appended `## foo_bar` heading resolves
  as `#foo_bar`, that a `data-id="zzz"` is refused, and that a real `id="zzz"` passes (the control).
- **Mutation proof (observed).** With each fix reverted in turn, the gate goes red: 52.12 on the stack fix, 52.13 on
  the underscore fix, and "52.13 data-id is not an id … got []" on the id fix.
- **Counts now.** Claims: 3 at 0 steps, 26 at 1, 5 at 2. In-memory cases: the original 17 plus four (52.12, and 52.13's
  three).
- **Deferred and dropped (F4, F5, both Low).** No open epic ticket touches group 52 or the claim manifest, and #497
  closes with this PR, so per the triage rule they are recorded here only. F4: `control:` targets get no check against
  the page DOM. F5: `BOUNDARY_RE` misses a merged "Foo. 3× faster." row. The next PR that touches group 52 will find
  them again.
- **Gates (observed, on `wt-497`).** `build-checks` all 52 groups pass. `drift-check` ✓ with the tree staged.
  `token-lint` ✓ (63 · 0 · 0). `/api/health` answered `ok:true` on port 4791, killed by PID.
