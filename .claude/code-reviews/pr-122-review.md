# PR #122 review — fix(dock): restore the colour a shared link displaced (#108)

**Branch** `fix/shared-link-brand-restore` → `main` · 9 files, +1390 / −23
**Reviewed** 2026-07-25 · fresh context (`/piv-review-pr`), deep pass dispatched to the `code-reviewer` agent
**Verdict** Request changes — one confirmed regression (High). The fix itself is correct and I drove it end to end.

---

## Summary

The two-key design is right. `factory-pack-derived-prewear` sits beside the three existing keys, shares
`parseRecord` with the live key, and is spent by exactly the two events that should spend it (a restore, or the
visitor entering a colour of their own). I traced every ordering the brief asks for — own → link A → link B,
pristine arrival, repeated reload of the same link, restore while a committed pack is selected, restore after
`#beat-brand`'s own reset, blocked storage — and found no state the backup gets into where it offers the wrong
colour or leaks a sender's. Moving provenance from `wireBeatBrand`'s closure flag onto the record as `origin` is
the better call and the "absent means the visitor's own" migration story holds.

The blocking issue is collateral, not in the restore path: one line the PR changed to stop a sender's name
lingering in the beat also erases a name the visitor is in the middle of typing.

---

## Measured — the fix does what it claims

Real page, real storage, real `derive()`, real dock, one fresh context per run (`python3 -m http.server` at the
repo root). Own colour `#118844` → negotiated accent `#00823e`; shared link `?brand=cc2200&name=Northwind`.

| | Chromium | WebKit |
|---|---|---|
| arrival: record `origin:"shared"`, backup holds own record `#00823e`, `:root` = `#cc2200` | PASS | PASS |
| arrival: restore row visible, beat label state `shared` | PASS | PASS |
| close-beat note carries the restore clause | PASS | PASS |
| restore: `:root` back to `#00823e`, live record is the own one, backup `null` | PASS | PASS |
| restore: row hidden, radio `derived`, focus on `#dock-pack-derived`, beat label `applied` | PASS | PASS |

WebKit has no `startViewTransition`, so that column is the synchronous `swap()` branch of `selectPack` —
the restore is correct on both paths.

---

## Issues

### High — `system/pack-derived.mjs:327` · ticking "Wear it" erases a name the visitor just typed

`syncFromRoot` now *clears as well as sets* the name input. It runs on every `PACK_CHANGE_EVENT`, and the
record's `label` only picks up the name input on a **colour change** — so any re-sync while the label is still
the generic `"your brand"` blanks the field.

The losing sequence is the form's own top-to-bottom order (index.html:161 colour → 165 name → 170 wear):

1. pick a colour → record written, `label: "your brand"` (the name box is still empty)
2. type `Acme` in the name box → nothing is written; the record is unchanged
3. tick **Wear it** → `selectPack("derived")` → `PACK_CHANGE_EVENT` → `syncFromRoot()` → `rec.label === "your brand"` → `nameInput.value = ""`

Measured, same script against both trees:

```
branch  {"beforeWear":"Acme","afterWear":"",     "erased":true }
main    {"beforeWear":"Acme","afterWear":"Acme", "erased":false}
```

Two consequences: the typed name disappears from under the reader's cursor, and the honest denial sentence
downgrades from "not Acme's official design system" to "not an official design system" — because `shownName` is
read from the input *after* the assignment (the plan flags that coupling at line 498, for the other direction).

The plan and report document the clearing for the **restore / nameless-link** paths (report row 6, plan
§481-486) and row 4 expects "name input empty" there. That intent is right. This resync is an unanticipated
third caller, so it is an undocumented divergence, not a documented deviation.

**Minimal fix** — write the input only when the record actually changed since the last sync, so a restore (a
*different* record, different `ts`) still clears it and an unchanged-record resync leaves the field alone:

```js
let syncedSig = null;                       // beside `let current = null;`
…
const sig = rec.ts + "|" + rec.label;
if (nameInput && sig !== syncedSig) {
  nameInput.value = rec.label && rec.label !== "your brand" ? rec.label : "";
}
syncedSig = sig;
```

### Medium — `system/close.mjs:117-121` · the arrival note keeps offering a restore that has been spent

The clause is appended once, when the close beat becomes visible, and nothing re-reads it. The note's own job is
to send the reader to the dock — so the stale state sits on the *expected* path, not an obscure one: read the
note → open the dock → restore → the note still reads "The colour you entered before is still here. The
appearance control can put it back."

Measured on both engines above: `noteStillClaims: true` after a successful restore.

It is stale guidance rather than a false provenance claim, so it is not the #103 class exactly — but #103 is the
invariant this PR argues for, and this is a second copy of a fact that now has one owner. Same staleness if the
viewport narrows past 1100px after render.

**Fix** — either drop the clause and let the dock's own correctly-gated `.dock-restore-note` carry it (fewer
places asserting the same thing), or keep a handle on the `<p>` and re-evaluate it on `BRAND_CHANGE_EVENT`, which
already fires on both spend paths.

### Low — `system/pack-derived.mjs:199` · a pre-#108 shared record reads as the visitor's own

`preserveDisplacedRecord` skips a record with `origin === "shared"`, but records written by the **currently
deployed** code carry no `origin`. A returning visitor whose stored record came from a link before this ships,
who then opens a second link, gets that first sender's colour preserved and offered as "the colour you entered".

Narrow (one stale record, one browser, one new link) and self-healing — the first own colour entry or restore
clears it. Worth a copy fix rather than a migration: `RECORD_VERSION` is hand-mirrored in `pack-boot.js:31`, and
bumping it would discard legitimate records. Reword the note to "the colour that was here before" and it is true
in both cases.

---

## Validation

| Gate | Result |
|---|---|
| `node --check` — `pack-derived.mjs` · `dock.mjs` · `close.mjs` | ✓ all three |
| `tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `tooling/drift-check.mjs` | ✓ 8/8 — syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `agent-layer/gen-loc-summary.mjs --check` | ✓ no drift (runtime group 11,800) |
| Headless drive, Chromium + WebKit | ✓ 5/5 rows each (table above) |
| Visual regression | not re-run locally — the PR reports 18/18 with the two `approach-*` baselines regenerated, which matches the loc flip (`loc-summary baseline cascade`) |

---

## What's good

- **The state machine.** Two backups, two keys, each with one owner and one spend condition. The
  `origin !== "shared"` guard on preservation is the right invariant and makes link A → link B correct without a
  second flag — net-negative state, which is the harder and better version of this fix.
- **`restoreDisplacedRecord`'s remove-before-write ordering** (pack-derived.mjs:218-219), with the reason on the
  line: `writeRecord` emits synchronously and the dock's listener re-reads the key, so writing first would leave
  the offer up over a spent backup. Measured correct.
- **The dock control does not touch `:root`.** It promotes the record and asks `selectPack(DERIVED_ID)` for the
  transition, so clear-first, the neutral base and the view-transition wrapper stay in the one place #102 put
  them. Focus lands on `#dock-pack-derived` rather than `<body>`, confirmed on both engines.
- **The 1100px honesty gate** in close.mjs reads `getComputedStyle(dock).display` instead of copying the
  breakpoint into JS, and the comment says why `offsetParent` would not work. Note 5's "no restore path below
  1100px, deliberately, inherited from #76" is the honest call rather than a silent partial fix.
- **PR note 1 corrects the repo's own recorded reason** for VR baselines not churning (`maxDiffPixels: 100`, not
  a sub-perceptual per-pixel threshold). That correction is worth landing in the repo notes.
- CSS is token-only, `hidden` works on `.dock-restore-row` because nothing in portfolio.css sets `display` on it,
  and the 44px target is lifted explicitly because `.btn-ghost` is text-height.

---

## Recommendation

**Request changes** for the High only. Fix `pack-derived.mjs:327` (three lines), decide on the close-note clause,
and this is ready — the fix it was written for is correct and measured on two engines.

---

# Triage + outcomes

Triaged with the author on 2026-07-25. Two fixed in this PR, one won't-fix.

| # | Finding | Call | Outcome |
|---|---|---|---|
| High | name erased on the wear-toggle resync | fix now | **FIXED** — `pack-derived.mjs` |
| Medium | arrival note keeps offering a spent restore | fix now (self-correcting, not dropped) | **FIXED** — `close.mjs` |
| Low | pre-#108 shared record reads as the visitor's own | **won't-fix** | documented below |

## Fixed — High · `system/pack-derived.mjs`

`syncFromRoot` now writes the name input only when the record's identity (`ts|label`) differs from the one the
input was last filled from. A restore brings a *different* record, so #108's intent — never leave a previous
sender's company name in the box — is unchanged; a re-sync of the *same* record leaves a name the visitor is
still typing alone.

One thing the review's suggested patch missed, caught by the test rather than by reading: the signature also has
to be claimed **where the beat writes a record** (the `colorInput` change handler). The record is built *from*
the inputs there, so they already agree — without that line the first re-sync reads a record it has never seen
and clears the box anyway. The first run of the proof drive failed 3/12 on exactly that, which is why the test
came before the sign-off.

`syncedSig` is deliberately never reset on the unworn branch: resetting it would let a
clear-then-re-wear reintroduce the same erase.

## Fixed — Medium · `system/close.mjs`

The notice is split into `ARRIVAL_NOTE` (true while the page is open) and `RESTORE_CLAUSE` (true only while
there is something to restore). When the clause is rendered, the effect listens on `BRAND_CHANGE_EVENT` — which
already fires on both spend paths — and takes the clause back off. The note now follows state instead of a
snapshot, which is the invariant this ticket's own provenance move exists to hold.

## Won't-fix — Low · legacy record without `origin`

Reachable only for a browser holding a shared-derived record written by the currently deployed code, whose
owner then opens a *second* shared link. It self-heals on the first own colour entry or restore, and the only
available remedy is copy — `origin` is genuinely unknowable for those records. Rewording to "the colour that was
here before" would weaken the wording for every normal case to cover a one-record, one-browser window. Recorded
here rather than fixed.

## Verification — 12/12 in Chromium and WebKit

Proof drive over the real page, real storage, real `derive()`, real dock; one fresh browser context per row.

| Row | Chromium | WebKit |
|---|---|---|
| A1 typed name survives "Wear it" (`"Acme"`) | PASS | PASS |
| A2 the denial still names the company ("not Acme's official design system") | PASS | PASS |
| A3 name survives a derived → saulera → derived round trip | PASS | PASS |
| B1 arrival fills the box with the sender's name | PASS | PASS |
| B2 restore still clears the sender's name | PASS | PASS |
| B3 restore still returns the own accent `#00823e` | PASS | PASS |
| C1 ×2 clause present on arrival | PASS | PASS |
| C2 ×2 clause retracted after **restore** and after an **own colour entry** | PASS | PASS |
| C3 ×2 the first sentence survives both | PASS | PASS |

Rows B and C also re-run the original #108 acceptance path unchanged: `:root` back to `#00823e`, backup `null`,
restore row hidden, radio `derived`, focus on `#dock-pack-derived`, beat label `shared` → `applied`.

Gates after the fixes: `node --check` ✓ both files · Node import ✓ · token-lint ✓ · drift-check ✓ 8/8 ·
loc-summary ✓ no drift post-staging (the added lines do not flip the rounded number, so no VR baseline
cascade this time). No at-rest change to any shipped page — the close clause renders only on a shared-link
arrival, which no visual baseline loads.
