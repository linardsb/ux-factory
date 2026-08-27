# #264 · report — adoptBoard cancels a live carry before the wrapper-removal loop

## What shipped

- `system/studio.mjs` — ONE line in `adoptBoard`, after the `compile.revert()` branch and before
  the wrapper-removal loop: `verbs?.cancel();`, with the why-comment (the phantom-gesture defect,
  cancel()'s no-op contract, and why the line sits after the revert branch — the compiled path was
  already covered via revert → the onState guard at :499).
- `tooling/studio-journey.mjs` — three `#264 ·` rows at the end of `methodPass`, on their OWN page
  load so every existing exact announcement count stays untouched; plus an ADDITIVE per-record
  `texts` capture in the shared `countLive`/`liveSeen` helpers (each `say()` is one childList
  record whose `addedNodes[0]` carries the whole sentence — a synchronous burst batches into one
  observer callback, so `__liveLast` alone can never see the cancel sentence mid-burst). No
  existing row reads the new field.
- `.claude/plans/studio-adoptboard-cancel-264.md` — the plan.

## Red-proof (the check that cannot fail)

Fix stashed (`git stash push -- system/studio.mjs`), served tree curl-verified UNFIXED
(`grep -c '264'` on the served `system/studio.mjs` → 0), then
`BASE=http://127.0.0.1:4761 node tooling/studio-journey.mjs chromium`. Observed: exit 1,
**exactly 3 assertions failed — the three new #264 rows** and nothing else:

1. `{"held":{"live":true,"marked":1},"afterDraft":{"gestureNull":false,"picked":0}}` — the
   positive control held (a carry really was live) and the gesture SURVIVED the redraft, with
   `.is-picked` count 0 = carrying() false by detachment, the defect verbatim.
2. 4 record(s), none a cancel sentence: `["Worklist in column 1, row 1","Progress in column 2,
   row 1","Settings in column 3, row 1","Board redrafted from your answers — 3 places."]`.
3. Escape spoke the phantom: `"Cancelled, Today Overview back in column 1, row 1."` — naming the
   settled board's first block, which was no longer on the canvas.

Fix restored (`git stash pop`), served tree curl-verified FIXED (`grep -c '264'` → 1).

## Gates (all observed)

- `node tooling/build-checks.mjs` → **all 27 groups pass** (observed pre-rebase; post-rebase re-run
  recorded below).
- `BASE=http://127.0.0.1:4761 node tooling/studio-journey.mjs all` (fix restored, serve
  curl-verified serving the fixed tree) → **chromium 521 passed / 0 failed · firefox 517 / 0 ·
  webkit 517 / 0** (observed; the three #264 rows green on every engine, chromium's 4 extra rows
  are its stated chromium-only checks). No firefox crash retry needed; no LoAF overshoot seen.
- `node agent-layer/gen-loc-summary.mjs` → run post-rebase (regenerated, never merged by hand, per
  the repo rule); result recorded below.

## Rebase note

main advanced while this ticket was in flight (PRs #274, #275, #276 merged). The validation
evidence therefore splits, stated explicitly: the red-proof and the THREE-ENGINE run above ran on
the pre-rebase base (origin/main 9cd9696) — sound because the merged changes touch neither
`adoptBoard` nor `methodPass` (#274's journey rows are in `framesPass`, #275 is a portfolio.css
prune + loc regen, #276 is docs/epic close) — and the rebased tree's evidence is the post-rebase
re-runs below. Observed:

- `git rebase origin/main` → clean, zero conflicts (my journey rows are in `methodPass`, #274's in
  `framesPass`; this branch never committed a loc-summary change, so no generated-file conflict).
- `node agent-layer/gen-loc-summary.mjs` post-rebase → **zero drift** (byte-identical to main's
  regenerated 30,600 runtime / 38,500 total — the same outcome the sibling rebase observed), so
  this PR ships NO loc-summary change and no group number moved.
- `node tooling/build-checks.mjs` post-rebase → **all 27 groups pass** (observed).
- `BASE=http://127.0.0.1:4761 node tooling/studio-journey.mjs chromium` post-rebase (serve
  curl-verified serving the rebased worktree) → **chromium 523 passed / 0 failed** (observed; the
  three #264 rows green among them; the delta over the pre-rebase 521 is #274's added rows). No
  LoAF overshoot seen, so the known machine-load flake never needed the solo re-run.

## Deviations from the brief

- None in the fix or the gate design. The brief's third assertion allowed "delta empty or at least
  no occurrence of the old label"; the row asserts the stronger form (delta === 0 AND no label
  occurrence) since nothing legitimately announces there.

## Review

Things a reviewer should check:

- The `countLive`/`liveSeen` extension is additive (`__liveTexts` / `texts`); no existing row
  reads `texts`, and the counting rows' `n`/`last` semantics are untouched.
- The new rows run on their own page (`p7`) — the existing exact-count rows above them are
  unaffected (confirmed by the red run: only the three new rows failed).
- `verbs?.cancel()` in `adoptBoard` announces "Cancelled, X back in column c, row r." at redraft
  time while the node still exists — the same sentence the compile path already produces via
  revert; accepted by the ticket.
- The row records the carried label from the wrapper's own `data-stx-name` (never typed), and the
  Escape leg asserts on the canvas scroll region with focus there — the document-level listener
  path (`studio-verbs.mjs:1366`) is the one that spoke pre-fix.
