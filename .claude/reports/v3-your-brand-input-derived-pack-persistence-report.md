# Implementation Report — Your-brand input + derived-pack persistence (D5b, #74)

**Plan**: `.claude/plans/v3-your-brand-input-derived-pack-persistence.md`
**Branch**: `feature/v3-your-brand` (fresh isolated worktree `../ux-factory-wt-74`, cut off `origin/main` `f2b0316`)
**Status**: COMPLETE

## Summary
Beat 2b of the v3 spine ("try your brand") plus the D5b persistence mechanic. A visitor enters a brand colour (and an optional company name, label-only) in `#beat-brand`; the real view-time `derive()` engine turns it into a full WCAG-checked colour set, applied stage-side to `:root`. A new module `system/pack-derived.mjs` serialises the derived colours to `localStorage`, and one guarded branch in the pre-paint `system/pack-boot.js` re-applies a *worn* record before first paint on every page. The persistence was confirmed flash-free across Chromium/Firefox/WebKit (spike, AC0). Colour only; the name is inert `textContent` inside an honest "derived here, not an official design system" label; nothing is sent anywhere.

## Tasks completed
- Isolated worktree off `origin/main` + tooling deps → `../ux-factory-wt-74` (task 1)
- Cross-engine pre-paint spike → passed 3/3 engines, no flash (task 2 / AC0)
- `system/pack-derived.mjs` — record helpers + `#beat-brand` wiring (CREATE, tasks 3 + 5)
- `system/pack-boot.js` — guarded `"derived"` branch, committed path unchanged (UPDATE, task 4)
- `system/spine.mjs` — `heroBeat` skips its re-skin when a brand is worn (UPDATE, task 4b, **#72 scope crossing**)
- `index.html` — real control markup + module script tag (UPDATE, task 6)
- `system/portfolio.css` — token-only `.brand-input` styles, empty/applied/error states (UPDATE, task 7)
- `system/loc-summary.json` — regenerated (runtime group 38→39 files, 9400→9700 lines) (task 9)
- VR baselines `index-*` + `approach-*` (both packs) regenerated (task 9)
- Task 8 (`askedAxes` fold-in) — **DEFERRED to #81** per Open Questions #1; `factory-intake.mjs` untouched

## Tests added
No unit suite exists (CLAUDE.md: "run the surface you touched"). Two throwaway Playwright harnesses in the scratchpad (not committed):
- **Spike** (`spike.mjs`) — seed a worn record, navigate to `/approach.html`, assert the derived accent is present at `domcontentloaded` + screenshot first paint. **Chromium/Firefox/WebKit: 3/3 PASS**, no neutral flash.
- **Functional** (`functional.mjs`) — 22 assertions, **22/22 PASS**:
  - AC1 enter→`:root` derived; AC1 wear→nav→`/approach` pre-paint persist
  - AC2 reset→neutral; no-record default no-op; malformed record (`v:2`)→neutral (fail-closed)
  - **AC2 committed-pack path (positively exercised, not just reasoned):** through the restructured `pack-boot.js`, seeding `factory-pack=saulera`→`<link>` becomes `/system/tokens.saulera.css`; `verdant`→`/system/tokens.verdant.css`; no seed→stays `/system/tokens.neutral.css`. (The VR harness swaps the pack by route-interception of `tokens.neutral.css` — `visual.spec.mjs:69` — so it does NOT exercise pack-boot's localStorage branch; this direct check is what proves the byte-for-byte-critical path still works.)
  - AC3 label applied + honest ("not Acme's official design system"); name inert (no `onerror`, no `<img>` injected) and appears only inside the label
  - AC8 worn record + load home + wait past hero hold → brand NOT stripped
  - unwear never clobbers a `saulera` selection; reset keeps the record
  - cross-engine core slice (enter→wear→nav→AC8) on Firefox + WebKit
- Real-browser eyeball (Chromium): empty / applied beat states + whole-page worn re-skin (nav underline, dark-band numeral, scroll arrow all wear the accent; chrome stays calm).

## Validation results
- `node tooling/token-lint.mjs` → ✓ 61 tokens · 0 undeclared · 0 orphan · DTCG valid
- `node tooling/drift-check.mjs` → ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces
- `node --check` clean + `import()` clean for `pack-derived.mjs`, `pack-boot.js`, `spine.mjs`
- `node agent-layer/gen-loc-summary.mjs --check` → no drift
- Spike 3/3 engines · Functional 22/22 · VR regen 18/18 (only the 4 expected baselines changed)
- **Both blocking gates green.** VR is non-blocking on `feature/v3-*` (D11) but regenerated in-PR so #82's re-block is clean.

## Deviations from the plan
1. **`askedAxes` fold-in deferred to #81** (Open Questions #1 default). `system/factory-intake.mjs` is untouched; ACs 5–7 are not #74's. **Merge-time: owner should re-confirm the fold-in home** (the plan marks Open Q #1 ⏳ pending). Branch base is `origin/main` either way.
2. **`deriveBrandTokens` filters to HEX-valued colour tokens (16), not all `color-*` (21).** `derive()` also returns 5 static `color-mix()` relatives (`--color-fg-on-inverse-muted/-soft`, `--color-inverse-line/-wash`, `--color-on-dark-border`) that live in the always-loaded contract layer (`tokens.contract.css:43-47`) and self-heal off the hex bases. Excluding them makes the record match the pack-boot hex allowlist exactly (the plan's "derive only emits hex for color-*" premise was not literally true) and makes stage-side apply == pre-paint apply byte-identical. Verified.
3. **The record carries an additive `brandColor` field** (the raw entered hex) beyond the illustrative `{v,source,label,ts,tokens}` contract. The tokens hold the *negotiated* accent (e.g. yellow input → dark-olive accent), so reflecting that back into the picker would mislead; `brandColor` lets the picker restore what the visitor actually chose. Backward-compatible (pack-boot/`readRecord` ignore it). Also useful to #75 (peak from brief + brand).
4. **On-load reflect is gated on WORN, not mere record presence — a deliberate resolution of an internal contradiction in the plan.** The state table's "derived, not worn → reflect if present" and the reset rule "keep the record but clear `:root`" cannot both hold on a reload. Resolution: the beat's shown state always matches `:root` (never a "wearing" label over a neutral site). **In plain user terms:** if a visitor derived a brand but did NOT wear it, returning to home shows the empty beat again; the record stays latent in storage for #76 to re-offer without re-entry. Worn brands re-apply everywhere (the killer demo); the live "derived, not worn" state still applies stage-side the moment it is entered, per the state table. **Owner: please bless this divergence from that one state-table cell.**
5. **NEW guard beyond the plan — the hero-window strip (task 4b's mirror on the input side).** Empirically, a colour entered *during* the ~2s #72 hero animation was stripped when the hero's revert `removeProperty`-ed the same `--color-*` keys (same root cause 4b fixes for the worn case). Added a one-shot `MutationObserver` on `#beat-hero[data-spine]` that re-asserts the entered colour once the hero signals ready. Reads only the hero's DOM handle (no `spine.mjs` import — #74 stays independent). Confirmed: colour is now restored, not stripped.
6. **Spike run against the REAL `pack-boot` branch, not a throwaway prototype** (advisor-endorsed). Same AC0 decision gate; strictly safer (the derived branch sets inline props synchronously with no stylesheet re-fetch, so it is *less* flash-prone than the committed line-swap it mirrors).
7. **`pack-boot.js` committed path is functionally byte-identical but restructured** — the early-return `if (pack !== "saulera" && pack !== "verdant") return;` became an explicit `saulera/verdant → swap → return` block so the derived branch can follow. The DOM operation (querySelector + href swap) is unchanged, and the absent/neutral/unknown default is still a guaranteed no-op (VR-critical, verified). This matches the plan's own "saulera/verdant → line-swap → return" description.
8. **Reset button reuses the house `.btn.btn-ghost`** (Q5 system consistency) rather than a bespoke class.

## Issues encountered
- **Playwright version mismatch.** `~/node_modules` Playwright is 1.59.1, whose Firefox/WebKit builds are not installed; the browser cache has the 1.61.1 builds. Used the VR tooling's Playwright (1.61.1, matching `mcr.microsoft.com/playwright:v1.61.1-jammy`) for the spike + functional harness. All three engines launch clean there.
- **VR sub-perceptual skip.** After the loc-summary regen, `update:docker` did not rewrite the `approach-*` baselines even though approach.html renders the changed number ("38 files, 9,400 lines" → "39 files, 9,700 lines") — the digit change is below pixelmatch's tolerance (recorded `vr-update-skips-subperceptual` trap). Forced with `rm baselines/approach-*.png` + re-run. All 4 expected baselines now current.

## Known transients (documented, not #74 blockers — for the PR body)
- **dock ↔ derived in-page coexistence** (plan NOTES): the un-redesigned `dock.mjs` shows no highlight for `factory-pack="derived"`, and picking a committed pack in the same page load is overridden by the still-inline derived props until reload. Both self-heal on reload; **#76** owns the redesigned selector. `dock.mjs` untouched.
- **hero-window residual**: entering a colour in the exact ~2s hero window may briefly show the hero's green demo before the observer restores the visitor's colour; the end state is always correct.

## Ready for the next step
All changes staged by explicit path (6 source/generated files + 4 baseline PNGs); nothing from the parallel main-worktree session is present. Blocking gates green, spike + functional green across three engines. Next: `piv-commit`, then `piv-create-pr` (surface the #72 `spine.mjs` scope crossing and the Open Q #1 fold-in re-confirm in the PR body), then `piv-review-pr`.
