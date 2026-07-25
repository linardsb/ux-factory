# Implementation Report — P3d · Private-instance spine (instance.html via config)

**Plan**: `.claude/plans/v3-private-instance-spine.md`   **Branch**: `feature/v3-instance-spine`   **Status**: COMPLETE

Closes #81.

## Summary

`instance.html` now runs the same spine the public home page runs, pre-seeded from the company brief: hero → honesty labels → 01 you brief it → appearance interstitial → **02 the peak (the one dark band)** → 03 you keep it → 04 verify. Every engine is reused by configuration: the wizard through `initIntake(config)`, the composed-view surface through `renderStudy`, the beat orchestration through `spine.mjs`'s `registerBeat`, and the WCAG-receipt presentation through a new `system/wcag-receipts.mjs` extracted from `peak.mjs`. Two small new modules ship: that receipts module and `system/instance-pack.mjs`, an instance-local two-option pack control.

The peak's screen and its receipts come from **one** `derive()` call per wizard change (plan decision D1), applied as inline custom properties **scoped to `.pi-peak-panel`** — `:root` is never written on this page, so the pinned company pack survives untouched.

## Tasks completed

| Task | File | Action |
| --- | --- | --- |
| Extract `RECEIPT_USAGES` + `buildReceipts` | `system/wcag-receipts.mjs` | CREATE (69 lines, zero imports) |
| Import the extraction; correct the epic-#86 header promise | `system/peak.mjs` | UPDATE (behaviour-preserving) |
| Retarget the stale `instance.html:448` reference | `system/dock.mjs` | UPDATE (comment only) |
| Instance-local pack control | `system/instance-pack.mjs` | CREATE (131 lines) |
| Band/beat restructure, `pi-peak-*` / `pi-pack-*` rules, dark-band `.capability` override | `instance.html` | UPDATE (+499 / −208) |
| Spine beats, live receipts + scoped peak palette, `unclaim` extension, pack-control mount | `system/instance.mjs` | UPDATE (+166) |
| Regen cascade | `system/loc-summary.json`, `tooling/visual-regression/baselines/approach-{neutral,saulera}.png` | UPDATE |

## Tests added

None — this repo has no suite, linter or type-checker (CLAUDE.md is explicit). The equivalents were run:

**Module shape / Node-import cleanliness**
- `git ls-files '*.mjs' | xargs -n1 node --check` → syntax ok (all tracked modules)
- `import('./system/instance.mjs')` → resolves clean. This exercises the whole closure (spine, factory-intake, trace-player, agentic-study, action-bus, derive, wcag-receipts, instance-pack) and proves nothing touches `document` at import.
- `import('./system/peak.mjs')` → clean. `import('./system/wcag-receipts.mjs')` → exports exactly `RECEIPT_USAGES,buildReceipts`. `initInstancePack` is a function.
- `grep -c 'function buildReceipts' system/peak.mjs` → `0` (extraction complete)

**Integration — the `build-instance.mjs` round trip (the real integration test)**

Run from the scratchpad with a slug-matched scratch brief (`northwind-real` → `northwind`, so `--compositions` satisfies `compositionRef`), `--out` outside the repo:

- **without `--compositions`** → `build-instance northwind ✓` — `validateAssembly`'s eight checks pass
- **with `--compositions`** → `build-instance northwind ✓ · prototype 2 composed views`

Audits over both stamped outputs: `data-when=` / `{{` residue → **0**; `demo`/`fictional` whole-file → **0**; rendered-body-text check → clean; company pack `<link>` → `/system/tokens.northwind.css`; `Pass AA|Fails AA` in the static seed → **0**.

**Manual page drive — Chromium, Firefox, WebKit**, on the stamped `inst-b` (the only context where a company pack is pre-selected):

| Check | chromium | firefox | webkit |
| --- | --- | --- | --- |
| `#instance-hero[data-spine="ready"]` | ✓ | ✓ | ✓ |
| `#beat-built[data-peak="ready"]` | ✓ | ✓ | ✓ |
| pack control: `northwind` checked, `neutral` offered | ✓ | ✓ | ✓ |
| swap → `tokens.neutral.css`, restore → `tokens.northwind.css` | ✓ | ✓ | ✓ (Firefox has no View Transitions — the `else` branch swaps instantly, no unhandled rejection) |
| composed view + 2 ask-tabs render in the light panel | ✓ | ✓ | ✓ |
| receipts: `All 12 contrast pairs pass AA` + 4 measured rows | ✓ | ✓ | ✓ |
| **D1**: brand override → panel `--color-accent: #b3261e` **and** receipt ratios move together; `:root` inline `(none)`; page pack link unchanged | ✓ | ✓ | ✓ |
| console errors | none | none | none |

**Edge cases exercised**
- **No composed view** (`inst-a`): badge removed, claim rewritten, peak note neutralised, honest placeholder card rendered — and the receipts **still** render (they come from the wizard, not the composition). Zero capability claims in the peak band.
- **`?brand=ff0000` on an instance URL**: pack href stays `/system/tokens.northwind.css`, no inline `:root` props, no `factory*`/`pack*` storage keys written. `pack-derived.mjs` is provably out of the import closure.
- **Northwind's `makerMatrix: null`**: the reveal shows the reader's quadrant on the left and "Not placed" + the frequency-filter explanation on the right (screenshotted).
- **Unstamped shell** (the committed `instance.html`, head link still `tokens.neutral.css`): the pack control renders one honest row and no swap affordance.
- **`prefers-reduced-motion: reduce`**: no element left at opacity < 1 or a non-identity transform; both readiness handles land.
- **320 / 640 / 900 / 1280px**: no horizontal page scroll at any width; `.pi-peak-stage` collapses to one column at ≤900px; the composed view never overflows its panel.
- **Keyboard**: 81 focusable controls, none unreachable (`tabIndex < 0`).

**Contrast (measured in-browser via canvas readback, both packs)** — every new dark-band pair passes AA: `.capability.live` 4.52:1 @10.5px, `.peak-note` 4.57:1, `.wcag-pair`/`.wcag-ratio` 9.85:1, receipts headline 16.36:1, `.pi-peak-head` 15.47:1, pack-control caption/notes 5.66:1. Under the neutral pack: all pass.

## Validation results

| Gate | Result |
| --- | --- |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node agent-layer/gen-loc-summary.mjs --check` (run **after** staging) | ✓ no drift |
| VR gate, Docker, check mode | **18 passed** — only the two approach baselines were rewritten by `update:docker`; the other 16 matched, confirming zero collateral churn from the `peak.mjs` / `dock.mjs` edits |
| `build-instance.mjs`, both ways | ✓ / ✓ |
| Home peak regression (`/index.html`) | identical after the extraction: `data-peak="ready"`, headline `All 12 contrast pairs pass AA`, the same 4 rows with the same ratios, live screen + adjust control present, no errors |

`loc-summary.json` moved, so the two approach baselines were regenerated in this PR per the recorded cascade.

**Post-merge note.** The branch was 5 commits behind `origin/main` (the figma token-import thread, PR #111), which had itself already moved `loc-summary.json` and both approach baselines — so those three generated files conflicted on the merge. Resolved the recorded way: take one side to get a parseable tree, **complete the merge**, then regenerate on the clean tree (never hand-edit a generated file, never diagnose drift mid-merge). Final numbers on the merged tree: runtime 45 files / 11,600 lines, total 77 / 17,800. `drift-check`, `token-lint`, `gen-loc-summary --check` (after staging) and the 18-shot VR gate were all re-run green on the merged tree, and the full three-engine drive plus the `?brand=` isolation proof and the home-peak regression check were repeated against a freshly stamped `inst-b`.

Commits: `4aea791` (the ticket) · `f8733bf` (merge `origin/main`) · `13ca76d` (post-merge regen).

## Deviations from the plan

**1. The peak beat activates on `load`, not `visible`.** The plan specified `activateOn: "visible"`, mirroring `peak.mjs:363`. Measured in Chromium, that is broken here: `spine.mjs`'s `IntersectionObserver` uses `threshold: 0.35` **of the target's own area**, so a target taller than `viewportHeight / 0.35` can never cross it. This band (composed view + receipts + the full Manipulation Matrix panel) measures **2301px**, which needs an 805px-tall viewport.

| viewport | max ratio | `data-peak` |
| --- | --- | --- |
| 900px | 0.39 | ready |
| 800px | 0.35 | **NEVER** |
| 740px | 0.32 | **NEVER** |
| 640px | 0.28 | **NEVER** |

A readiness handle that silently fails to land is worse than none — a future VR `waitReady` would deadlock on it, which is precisely the trap the handle exists to prevent (issue #105). Nothing is lost by the change: unlike home there is no analytics event gated on "reached the built screen" (deliberately, plan Q2), and the effect owns no expensive work. With `load` the handle lands at every viewport tested. `spine.mjs` is still untouched. Reasoning is recorded at `system/instance.mjs`'s `peakEffect`.

**2. `instance-pack.mjs`'s `PACK_RE` excludes the reserved `contract` slug.** The plan's regex `/\/system\/tokens\.([a-z0-9-]+)\.css$/` matches `tokens.contract.css`, which precedes the pack line in every head — so the first-match search returned the **contract layer** and the control offered to re-point it. Caught in the first browser drive (the control rendered two radios on the unstamped shell instead of the single honest row). `dock.mjs` avoids this with a three-id allowlist; a generic matcher has to exclude the one reserved name explicitly, which `linkSlug()` now does.

**3. The `<style>` comment "fictional / speculative label" was reworded to "scenario / speculative label."** Pre-existing, and the only reason `grep -ic '\bdemo\b\|\bfictional\b'` over a stamped instance was non-zero (`stampShell` strips the head comment and the `INSTANCE_CONFIG` region, but not the `<style>` comments). The same reasoning applies to the labeling section's comment, reworded to name `copy.fictionalNotice` as a field. Both now read correctly in a real instance's view-source, and the plan's stated gate returns 0.

**4. `.pi-peak-ethics` got a `max-width: 74ch`** (not in the plan's CSS spec). Screenshot review showed a full-bleed light panel with content filling only half of it — the matrix caps at 56ch and the reveal at two columns, so the panel was mostly empty ground. Hugging its content is the craft fix.

**5. The close card carries no `pack.bundle.json` download.** `index.html:274-302` links `/handoff/verdant/pack.bundle.json`, but `validateAssembly` check 6 requires every `/handoff/…` href to resolve in the deploy dir, and `build-instance.mjs` copies only `handoff/verdant/vocabulary.json` (and only with `--compositions`). Porting that link would have failed both builds. The takeaway is prose plus the config-driven `#instance-links` slot, exactly as the plan's data-flow diagram has it.

**6. Humanizer pass on the new copy.** The CHECKLIST's "no em/en dashes" MUST was applied to every sentence this ticket authored (five rewritten, including replacing a "not X and not Y" negative parallelism). The six remaining dash-bearing sentences are pre-existing copy carried over verbatim; rewriting them would be scope creep and would break consistency with the v3 home beats, which use the same construction.

**7. A dark-band `.capability` override was added** (not in the plan). `.capability` / `.capability.live` are authored against the light token set (`--color-fg-muted` / `--color-border-strong` / `--color-accent`); `#prototype-capability` moves onto near-black in `.peak-side`, where it would have been the lowest-contrast element on the one band whose subject is contrast. Re-pointed at the inverse group; text still states the status, so state is never carried by colour alone.

**8. The fixture brief needed a directory rename, not just a field edit.** The plan's recipe (`sed` the slug into a scratchpad file) fails: `parseCompanyBrief` also asserts the head slug matches the **containing directory** name. The working recipe is `cp -R agent-layer/fixtures/northwind-real <scratch>/northwind` then edit the slug field.

## Issues encountered

- The plan's scratchpad path was from a different session; substituted this session's.
- `gen-loc-summary --check` failed on the first pass exactly as the recorded trap predicts (it reads git-tracked content, so it must be regenerated **after** `git add`). Resolved by regenerating post-stage.
- Screenshot artifacts: `locator.screenshot()` on a band composites the sticky header and the skip link over it. Not a page defect.

## Acceptance criteria

- **AC #1** ✓ spine rendered through the shared seams; `spine.mjs`, `factory-intake.mjs`, `agentic-study.mjs`, `close.mjs`, `pack-derived.mjs` carry zero diff; `dock.mjs` carries one comment line.
- **AC #2** ✓ company pack pre-selected beside neutral; picking either swaps one stylesheet line and re-skins the whole page (verified in three engines).
- **AC #3** ✓ notices intact and first; both unclaim paths withdraw badge + claim + note; the static seed states no verdict; D1 verified by hand in three engines.
- **AC #4** ✓ five Mechanism A anchors verbatim; every demo phrase inside a `span|p data-when="demo"`; `{{name}}` only inside `data-when="real"`; both builds validate.
- **AC #5** ✓ CHECKLIST run; contrast, keyboard, reduced-motion, 320px and cross-engine passes green.
- **AC #6** ✓ `drift-check` + `token-lint` exit 0; home's peak byte-equivalent in output; 18/18 VR baselines pass.
- **AC #7** ✓ `instance.html` head comment, `instance.mjs` header, `peak.mjs`'s epic-#86 note and `dock.mjs`'s reference all describe what the code now does.
- **AC #8** ✓ `loc-summary.json` regenerated after staging; both approach baselines regenerated.
- **AC #9** — pending the PR (`Closes #81` trailer; plan + report + review committed in it).
