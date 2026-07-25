# Implementation Report — v3 investment close (beat 4)

**Plan**: `.claude/plans/v3-investment-close.md`   **Branch**: `feature/v3-close`   **Status**: COMPLETE

## Summary

Beat 4 of the v3 home spine becomes the Hook Model's investment step. A new pure codec
(`system/share-state.mjs`) encodes the visitor's bounded inputs — a brand hex, an optional display
label, and the three wizard axes — into query params; the receiving browser re-runs the real
`derive()` engine on that hex rather than trusting a colour set from a URL. `pack-derived.mjs`
hydrates the shared brand before `spine.mjs` evaluates, so the hero's `isWearingDerived()` guard
skips its canned re-skin with no change to `spine.mjs`. A new `system/close.mjs` builds the share
control, the derived-token copy, and the shared-link arrival note over a static close card that
stands on its own with JavaScript off.

## Tasks completed

- Push the planning layer, branch → `feature/v3-close` off the updated `main` (see Deviations)
- The pure codec → `system/share-state.mjs` (CREATE)
- `hydrateFromSharedLink()` + `sharedLabel()` + the `wireBeatBrand(sharedRec)` seam → `system/pack-derived.mjs` (UPDATE)
- Additive `seedAnswers` option + `validSeed()` boundary check → `system/factory-intake.mjs` (UPDATE)
- Decode the URL and pass the seed → `system/intake-beat.mjs` (UPDATE)
- `trackFactoryShared()` → `system/analytics.mjs` (UPDATE)
- Static close card: takeaway tier, bundle download, JS mount, `close.mjs` tag → `index.html` (UPDATE)
- Beat 4 → `system/close.mjs` (CREATE)
- The `.close-*` organism → `system/portfolio.css` (UPDATE)
- Regenerate after staging → `system/loc-summary.json` (UPDATE, runtime group 40→42 files, 10,500→11,000 lines)
- Regenerate → `tooling/visual-regression/baselines/{index,approach}-{neutral,saulera}.png` (UPDATE)

## Tests added

The repo has no test suite (CLAUDE.md). Three layers were run instead.

**Codec assertions** (`node -e` over the pure module) — **20/20 pass**. The plan's 11: hex/name/axes
round-trip, empty search → null, unknown-params-only → null, bad hex rejected, bad enum dropped
per-axis, valid axis survives a bad sibling, name capped at 40, `hasSharedBrand`, empty name omitted.
Nine more added: `%23`-prefixed hex accepted, `null`/`undefined` search → null, no-arg encode → `""`,
the `"your brand"` fallback label is never shared, axes-only link, all-invalid → `""`, name-only
decode, name trimmed on encode.

**Cross-engine functional drive** (Playwright, `/private/tmp/.../scratchpad/verify.mjs`) — 4 scenarios
× 3 engines, **all pass in Chromium, Firefox and WebKit**:

| check | chromium | firefox | webkit |
| --- | --- | --- | --- |
| bare URL: console clean, no `wear()`, hero's canned re-skin still reverts to `#2563eb` | ✓ | ✓ | ✓ |
| shared URL: `:root` wears `#b5322f`, label is the shared variant with the Acme Ltd denial, `data-state="shared"`, wizard seeded compact/hunt/weekly, dock shows "your brand" checked | ✓ | ✓ | ✓ |
| close beat: arrival note, bundle download, derived-token copy, copy reaches `Copied ✓`, link round-trips brand + label + axes, copied URL is not `/factory/shared` | ✓ | ✓ | ✓ |
| reduced motion: brand and answers still apply, no transition on the status node | ✓ | ✓ | ✓ |

Clipboard read-back is Chromium-only; Firefox and WebKit assert the button reaches its terminal
state instead (both reached `Copied ✓`).

**Manual / headless surface checks**

- No-JS load: three working links (`/contact`, `/handoff.html`, `/handoff/verdant/pack.bundle.json`),
  `.close-extras` hidden by `:empty`, zero buttons. No dead affordance.
- Clipboard fallback (`navigator.clipboard` stubbed undefined): the readonly field appears, is
  focused and selected, and holds the full URL; the status says how to copy it.
- Keyboard path: Get in touch → See the handoff pack → Download the pack → Copy the link → Copy your
  derived tokens, each with a 3px focus outline; `Enter` on the share button reaches `Copied ✓` and
  the live region announces.
- 360px: no horizontal overflow, controls wrap.
- Shared link over an existing worn pack, both starting states (see Issues encountered).

## Validation results

| command | result |
| --- | --- |
| `node --check` × 6 touched modules | pass |
| all 6 modules import clean under Node (no DOM) | pass |
| codec assertions | 20/20 pass |
| `node tooling/token-lint.mjs` | pass — 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node agent-layer/gen-loc-summary.mjs --check` | pass — no drift |
| `node tooling/drift-check.mjs` | pass — syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| VR gate in Docker against the regenerated baselines | 18/18 pass |

## Deviations from the plan

1. **Phase 0 was a cherry-pick, not a push.** The plan says "push `1078d43` to `main`". That cannot
   run as written: `origin/main` had moved to `26fe9d9`, and `1078d43`'s parent is a code commit
   (`85b3689`), so it is not a fast-forward. Confirmed the approach with the owner, then cherry-picked
   the docs commit onto `origin/main` (verified docs-only: nothing outside `.claude/`, `docs/epics/`,
   `__Final_phase.md`), pushed it as `a1a5a6c`, and branched `feature/v3-close` off the updated `main`.

2. **`wireBeatBrand` prefers the shared record over `readRecord()`.** The plan passes `sharedRec` in
   only to choose the label. It also gates the load branch now: `const rec = sharedRec || readRecord()`
   and `if (rec && (sharedRec || selectorIsDerived()))`. Without this, a shared link opened where
   `localStorage` is blocked re-skins `:root` but leaves the beat saying "Pick a colour", which is
   the site claiming the opposite of what the reader is looking at.

3. **`sharedLabel` copy: "derived again in this browser", not "re-derived".** Humanizer rule, plain
   words. Same affiliation denial, same shape as `appliedLabel`.

4. **`validSeed` also checks `ENUM[axis]`.** The plan's implementation only gated on `axis in defaults`
   and non-empty string, while its own comment promised to drop "a value the scenario does not
   define". `factory-intake.mjs` already exposes a module-level `ENUM` derived from `RULESET`, which
   is the check that actually protects `derive()`, so the code now matches the comment.

5. **The close card is restructured into three tiers rather than one CTA row.** The plan puts the
   bundle download beside the two existing links, which makes five pills in one card and reads as the
   pile of links the feel bar's Q6 explicitly rules out. Instead: the statement plus one primary
   action, then a takeaway tier (the two pack links behind a hairline, with the honest line naming
   what the pack is), then the JS tier. The plan sanctions rewording the surrounding copy "to name
   what the takeaway is"; this is that, carried into structure.

6. **"Copy your derived tokens" is a `btn-ghost`, not a `btn-secondary`.** Same reason — it
   subordinates the bonus takeaway under the one act the beat is about. Given a local
   `min-height: 44px`, since `.btn-ghost` is a text-height control and the checklist's hit-area MUST
   applies.

7. **The share line is state-neutral.** The plan's copy said the link carries "the colour and the
   three answers you picked", which overclaims before a colour is entered. It now reads "carries what
   you picked here", and the empty state names what is missing and invites the next action.

8. **`/factory/shared` kept, but scoped to what it actually measures** (plan Open Question 1).
   Implemented as recommended, with the scope decision stated in the module comment: the architecture
   doc names only `/factory/built`, so this is #77 extending the epic's analytics call. Deleting it is
   `trackFactoryShared` plus its two call sites. Two corrections to the plan's framing:
   - The event measures **link production**, not the PRD §7 "Forwarded internally" metric. A forward is
     only observable at the receiving end. Firing on arrival is not safe here: the virtual-route flip
     drops `location.search` for `RESTORE_DELAY_MS`, and every arrival module reads `location.search`
     synchronously inside that window, so an arrival event would break the arrival path it measures.
     The comment now says this, and measuring the arrival side is left as an owner call.
   - It fires from the **success paths** (clipboard resolved, or the hand-over fallback rendered), not
     from the click. The plan had it firing before the clipboard promise settled, which would have
     counted a refused copy as a share — the same trap `peak.mjs:343-348` calls out for
     `/factory/built` and memory `spine-analytics-slot-fires-regardless` records.

9. **`approach-*` baselines needed the PNGs removed to force a rewrite.** `update:docker` rewrote only
   `index-*` on the first pass even though the loc-summary numbers moved; `rm` forced it (the recorded
   sub-perceptual trap). Confirmed after the fact that `approach.html` renders "42 files, about 11,000
   lines" and that the full gate passes against the regenerated set.

## Issues encountered

- **The local branch was not a descendant of `origin/main`.** `feature/v3-approach-work` predates
  PR #99, so its `pack-derived.mjs`/`dock.mjs` lack #76's `PREWEAR_KEY` work. Everything here was read
  and built against `origin/main`, as the plan's context header requires.
- **`getHomeAnswers()` is the right seeding assertion, not the wizard DOM.** The home wizard renders
  one question at a time, so counting checked radios sees only the current step. The verification
  drive imports `intake-beat.mjs` in-page and reads the published axes instead.
- **Plan Open Question 2, now measured.** A shared link opened over an existing worn pack was run in
  both starting states:

  | pre-wear selector | after arrival | after the dock's Reset to neutral |
  | --- | --- | --- |
  | `saulera` (committed) | shared brand `#b5322f` worn, `PREWEAR_KEY=saulera` | saulera handed back (`#F59E0B`) |
  | `derived` (their own colour) | shared brand `#b5322f` worn, no `PREWEAR_KEY` | drops to neutral (`#2563eb`) |

  The first row is the intended reversible path. The second is the cost the plan flagged: `wear()`
  writes the backup only on the `prev !== "derived"` transition (`pack-derived.mjs:151`), so a
  recipient who was already wearing their own derived colour loses it with no restore path, because
  the record itself is overwritten too. That is #76's `PREWEAR_KEY` contract (it backs up committed
  picks only), not something #77 should change, and the plan rules out a confirm dialog. Recorded here
  because it writes to a visitor's storage as a side effect of one click.
- **Not a bug, will look like one:** opening the appearance dock strips the query string
  (`dock.mjs`'s `stripHash()` does `pushState(null, "", location.pathname)`). The state survives in
  storage and the share link is rebuilt from storage plus the wizard, but the shared-link arrival note
  will not render for a reader who visited the dock before scrolling to beat 4. Noted in `close.mjs`.
- The VR job is non-blocking on `feature/v3-*` (D11 freeze), so the PR may read `UNSTABLE` even with
  the gate green locally. #82 removes the freeze.

## Acceptance criteria

- [x] **AC #1** takeaway: handoff viewer link + bundle download + contact CTA, all working with JS off
- [x] **AC #2** round-trip: URL re-applies brand and answers; wizard, `:root`, dock and peak all reflect them
- [x] **AC #3** honesty: `derivedNote` duplicated verbatim with a comment naming both mirrors; `sharedLabel` denies "your colour"; the pack is never "your pack"
- [x] **AC #4** bounded: hex + ≤40-char label + three enum axes, nothing else, nothing uploaded
- [x] **AC #5** nothing fails on stage: bad hex, bad axis, blocked storage, absent clipboard each degrade
- [x] **AC #6** documented degradation, stated in `close.mjs`'s header and proven with JS disabled
- [x] **AC #7** craft bar: custom share interaction, motion from tokens, live region, labelled focusable fallback, verified in three engines
- [x] **AC #8** `rest == final`: the status node is empty at rest and nothing animates indefinitely; the gate passes
- [x] **AC #9** `drift-check` + `token-lint` green; `loc-summary.json` regenerated after staging; four baselines regenerated
- [x] **AC #10** bare `/index.html` unchanged in behaviour: decode is a no-op, the hero's canned re-skin still runs and reverts
