# Implementation Report — restore the colour a shared link displaced (#108)

**Plan**: `.claude/plans/shared-link-brand-restore.md`
**Branch**: `fix/shared-link-brand-restore` (off `origin/main` `14466ef`)
**Status**: COMPLETE

## Summary

Opening a v3 share link over a visitor's own worn brand used to destroy it: `hydrateFromSharedLink`
overwrote `factory-pack-derived` and `wear()` takes its `PREWEAR_KEY` backup only on the
`prev !== "derived"` transition, so a visitor already wearing their own colour got no backup at all.
This ticket preserves the displaced record under a second key (`factory-pack-derived-prewear`), adds
a **Restore the colour you entered** control to the appearance dock, and names that path in the
shared-link arrival notice — but only where the dock is actually rendered. Provenance moved from a
closure flag onto the record itself (`origin: "shared"`, stamped only by the hydration path), which
fixes the label-lies-after-restore class of bug by construction and deletes a duplicated piece of
state rather than adding a second one.

## Tasks completed

| Task | File | Action |
| --- | --- | --- |
| 1 · contract block gains `PREWEAR_RECORD_KEY` | `system/pack-derived.mjs` | UPDATE |
| 2 · one `parseRecord` validator, two keys (`readRecord` / `readDisplacedRecord`) | `system/pack-derived.mjs` | UPDATE |
| 3 · `buildRecord(hex, name, { origin })` | `system/pack-derived.mjs` | UPDATE |
| 4 · `preserveDisplacedRecord` (private) / `clearDisplacedRecord` / `restoreDisplacedRecord` | `system/pack-derived.mjs` | UPDATE |
| 5 · `hydrateFromSharedLink` preserves + stamps provenance | `system/pack-derived.mjs` | UPDATE |
| 6 · `wireBeatBrand` reads `rec.origin`; name input cleared on the generic branch | `system/pack-derived.mjs` | UPDATE |
| 7 · colour handler spends the backup before `writeRecord` | `system/pack-derived.mjs` | UPDATE |
| 8 · restore row (note + ghost button), hidden by default, above the actions | `system/dock.mjs` | UPDATE |
| 9 · click wiring: `selfEmit` → promote → `selectPack(DERIVED_ID)` → focus handoff | `system/dock.mjs` | UPDATE |
| 10 · `.dock-restore-row` / `-note` / `.dock-restore` styles, token-only | `system/portfolio.css` | UPDATE |
| 11 · arrival-notice clause, gated on `getComputedStyle(dock).display` | `system/close.mjs` | UPDATE |
| 12–13 · headless drive, Chromium + WebKit | scratchpad (not committed) | CREATE |
| 14–17 · gates, `loc-summary.json`, two approach baselines | generated | UPDATE |

## Tests added

No suite exists (CLAUDE.md: "Done" = run the surface you touched). The equivalent is
`<scratchpad>/verify-108.mjs` — a real page, real storage, real `derive()`, real dock, **one
`browser.newContext()` per row**. The plan specified 8 rows; two more were added because nothing in
the original 8 covered AC #8.

| # | row | Chromium | WebKit |
| --- | --- | --- | --- |
| 1 | pristine → shared link: worn, nothing preserved, beat `data-state="shared"` | PASS | — |
| 2 | saulera selected → shared link: `PREWEAR_KEY=saulera`, handed back (the #77 row, unregressed) | PASS | — |
| 3 | own worn colour → shared link: backup holds their record, byte-equal, no `origin` | PASS | PASS |
| 4 | dock restore: their accent on `:root`, live record, backup gone, row hidden, beat `applied`, name input empty, focus on `dock-pack-derived` | PASS | PASS |
| 5 | link A → link B: backup still theirs, never the first sender's | PASS | — |
| 6 | own colour entered after arrival: backup spent, row hidden | PASS | — |
| 7 | arrival → saulera → restore: pack line back to `tokens.neutral.css`, their colour on `:root` | PASS | PASS |
| 8 | bare `/index.html`: no keys written, no row, hero re-skin runs **and reverts** | PASS | — |
| 9 | **added** — arrival notice (desktop) names the restore | PASS | — |
| 10 | **added** — arrival notice at 900px is silent, and the record is still preserved | PASS | — |
| 11 | **added** — restore driven from `/approach.html`, not home: offer travels, restore works, focus handed on | PASS | — |
| 12 | **added** — arrival, then back to a bare `/`: record and beat still say "shared" | PASS | — |

"The restored colour is on stage" is asserted self-consistently (`:root`'s `--color-accent` equals
the live record's token) **and** against the shared brand's accent captured before the restore — not
by hardcoding the entered hex.

WebKit is the no-`startViewTransition` path in `selectPack`, so rows 3/4/7 exercise the synchronous
`swap()` branch there. Both engine builds were present at `~/Library/Caches/ms-playwright`.

### Craft checks (CHECKLIST)

Measured headlessly, under both `no-preference` and `reduce`: target **274×47px** (≥44), one Tab from
the checked radio reaches the button, Enter activates it, focus lands on `#dock-pack-derived`
afterwards, `:focus-visible` is a 3px solid outline, and the row carries no animation in either
motion mode. State is carried by the row's presence plus its sentence, never by colour. The note
reuses the `--color-fg-muted` on `--color-bg-surface` pair `.dock-pack-note` already uses in the same
panel. Below 1100px nothing new renders (the dock is `display:none`), so there is no 360px surface to
check.

## Validation results

```
node --check system/pack-derived.mjs · system/dock.mjs · system/close.mjs   PASS
node -e "import('./system/close.mjs')"                                     PASS
node tooling/token-lint.mjs         ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid
node tooling/drift-check.mjs        ✓ syntax · token-css · annotated-source · loc-summary ·
                                      system-graph · handoff · scenarios · traces
node agent-layer/gen-loc-summary.mjs --check   ✓ 3 groups — no drift  (post-staging, the run that counts)
cd tooling/visual-regression && npm run update:docker   18/18 passed
verify-108.mjs                      12/12 rows PASS (Chromium)
verify-108.mjs --engine=webkit --rows=3,4,7   3/3 rows PASS
```

Staged tree: 4 sources + `system/loc-summary.json` + 2 approach baselines + the plan + this report.

## Deviations from the plan

1. **The VR baselines did not churn on their own, and the reason is not the one on record.** The plan
   (and the repo's note) says `update:docker` skips a rewrite when the change is "below pixelmatch's
   per-pixel threshold". The actual mechanism here is `maxDiffPixels: 100`
   (`playwright.config.mjs:20`): `loc-summary`'s runtime line count flipped 11,600 → 11,800, which
   changes **one glyph** in a caption — far fewer than 100 differing pixels — so the gate passed
   against a baseline that no longer showed what the page renders. The first `update:docker` run
   rewrote nothing. Both PNGs were `rm`'d and regenerated to force it, and `/approach.html` was then
   confirmed to render "about 11,800 lines". Worth knowing generally: **a single-digit change to a
   generated number will not invalidate its own baseline.**
2. **The loc flip was two rounding steps, not one.** The plan predicted 11,600 → 11,700 off a 30-line
   headroom; the change is ~134 tracked lines, so it went to 11,800 (grand total 17,800 → 18,000).
   No consequence beyond the size of the number — the same two baselines were affected.
3. **Four verification rows added (9–12).** The plan's 8 rows all acted on `/index.html` and none
   exercised the arrival-notice clause, so AC #8 had no automated evidence and nothing covered the
   other five pages the dock ships on. Rows 9/10 assert the clause appears on desktop and **not**
   below 1100px (where the record is preserved anyway). Row 11 drives a full restore from
   `/approach.html`. Row 12 measures the provenance-survives-navigation path below rather than
   asserting it from the code.
4. **Arrival-notice copy is "is still here", not "is kept".** "The colour you entered before is
   kept" is passive (CHECKLIST: active voice), and "still here" matches the dock note's own sentence,
   so the two sites now read consistently.
5. **The `sharedRec` doc comment in `wireBeatBrand` was rewritten.** Its stated first reason ("so the
   beat can tell the visitor's colour from a link's") became false the moment provenance moved onto
   the record. The parameter and its `stored || (apply ? sharedRec : null)` fallback are unchanged —
   only the comment, which would otherwise have documented a job the argument no longer does.

## Adjacent behaviour this changes, deliberately

Task 6 replaces a closure flag with a record read, which corrects three labelling paths. Only the
first is named in the ticket; a reviewer should read the other two as intended, not as scope creep.
None is VR-visible — no baseline loads a share link or has storage.

1. **After a restore** the beat returns to `data-state="applied"` instead of continuing to call the
   visitor's own restored colour "a shared link's". This is the ticket's AC #5.
2. **A nameless shared link opened over a named own record.** `syncFromRoot` previously only ever
   *set* `nameInput.value`, so the visitor's own company name survived into
   `sharedLabel(shownName)` — rendering "not *Mine*'s official design system" about the **sender's**
   colour. The input is now cleared on the generic-label branch, so the label falls back to "not an
   official design system".
3. **Returning to `/` without the query string after an arrival.** With the closure flag,
   `fromSharedLink` was false on that fresh load, so the beat said "Your colour is on the stage"
   about the **sender's** colour. `origin` lives on the record, so it now correctly says the colour
   came from a shared link. This is the deeper version of the same fix and the reason provenance
   belongs on the record. **Measured** — drive row 12.

**The restore offer travels to every page that loads the dock**, not just home — it is decided by
`readDisplacedRecord()`, and `renderRestore()` runs at `buildDock()` on all six IA pages. Verified
end to end from `/approach.html` (drive row 11): the row appears, the restore works, the pack line
returns to the neutral base, and focus lands on the restored radio. That is wanted, and it means the
only home-specific piece is the arrival notice itself — `close.mjs` is a home beat, and a reader who
navigates away and back has no `ARRIVED_SHARED` to read.

**An unworn record is preserved too.** If the visitor entered a colour but never ticked "Wear it",
`preserveDisplacedRecord` still backs it up, and restoring will *wear* it. That is the intended
read: the copy says "the colour you entered", and entering is exactly what they did.

## Issues encountered

- **The #77 report's measured table mislabels the control.** It reads "after the dock's Reset to
  neutral → saulera handed back". The dock's reset is `selectPack("neutral")`, which writes the
  neutral selector and **removes** `PREWEAR_KEY` — it means neutral, by design, and the plan
  explicitly does not reopen that. The control that reads `PREWEAR_KEY` and hands the pre-wear pack
  back is `#beat-brand`'s own Reset (`stopWearing`). Row 2 of the drive therefore asserts the key
  claim (`PREWEAR_KEY === "saulera"` after arrival) and exercises the beat's reset. No code change:
  the behaviour is correct, the prose describing it was not.
- **A test-harness trap, not a product one.** `html` carries `scroll-behavior: smooth`
  (`components.css:27`), so a plain `scrollIntoView()` animates and can settle with only ~a third of
  the close band on screen — under the spine's `OBSERVE_THRESHOLD` of 0.35 — leaving the beat
  unactivated on a short viewport. `block: "center"` with `behavior: "instant"` fixes the drive.
  Reported because the next person writing a below-fold headless check will hit it.
- **A parallel session added an untracked `.claude/plans/ds-list-row-primitive.md`** in the shared
  working directory. Everything was staged by explicit path; that file is untouched.

## Open questions carried forward (owner's call, not decided here)

1. **There is no restore path below 1100px.** The appearance dock is hidden there (#76's decision,
   inherited). The record *is* preserved on every viewport and the arrival notice deliberately stays
   silent about a control the reader cannot reach, but a phone or tablet visitor has no way back.
   Mobile parity would need a second control inside `#beat-brand` — a separate ticket. **This is the
   one place the fix is partial.**
2. **The D11 VR freeze is still live on `main`** (`.github/workflows/verify.yml:48`) even though #82
   was meant to remove it. It does not affect this ticket — a `fix/` branch is outside the
   `feature/v3-*` prefix, so the visual gate blocks normally, which is what this change wants — but
   v3 branches are still shipping with a non-blocking visual gate.
