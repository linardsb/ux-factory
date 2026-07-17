# PR #15 Review — live derivation engine (OKLCH palette, scales, pattern + ethics rules)

**Reviewed commit**: `af18da1` · **Reviewer**: agentic gate (`piv-review-pr` + `code-reviewer` agent, fresh context) · **Recommendation**: **Request changes**

> **Resolution (2026-07-17, fix pass on this branch):** all five findings addressed.
> **H1** — `.nav-cta:hover`, `.on-ocean .nav-cta`, and `::selection` now use `--color-accent-fg` (the `.btn-primary` label-on-fill idiom; the pairing collapses into checked pair 5). **H2** — the on-ocean nav-panel hover/focus retokenized to `--color-fg-on-inverse-strong` (checked pair 9) and the exclusion commentary rewritten truthfully. A follow-on audit found decorative accent-on-dark uses beyond the review's list (dark-footer link hovers, `.footer-areas-links a.all`, the feature-band numeral) — **deferred to [#17](https://github.com/linardsb/ux-factory/issues/17)** (on-dark accent contract token) and named in the ruleset commentary rather than silently claimed away. **M1** — accent-secondary pair raised to 4.5 text threshold (re-spiked: still 88/88). **L1** — patterns commentary corrected (`.card-kicker` → portfolio.css). **L2** — harness `run()` now try/catches `derive()`. Ruleset bumped to **v1.1.0**.
> Validation re-run: `node --check` clean on edited modules + extracted harness script, spike exit 0 (88/88 AA at v1.1.0, accent-secondary passing 4.73–4.97 across all 8 brands), token pipeline no drift.

## Summary

The engine itself is excellent: the hand-written color math is verifiably correct, the WCAG checker is exact, determinism is real, output matches the token contract name-for-name, and the harness is injection-safe. Validation is fully green. The blocking problem is not the code — it is two **false claims in the shipped, versioned ruleset artifact** (`derive.rules.mjs` commentary), which is exactly the surface this project's honesty contract (PRD, hard rule) exists to protect. The ruleset says its 11 WCAG pairs cover "every fg/bg pairing the components actually create" and that "components never set accent text on dark" — both are empirically false against `system/components.css`, and the uncovered pairings actually fail AA for all 8 spike colors, including the control blue. The "88/88 = 100%" headline is true of the declared list but overclaims what the list covers.

These contrast failures pre-exist in `components.css` (the neutral pack fails them too — this PR did not introduce them). What this PR introduces is the claim of full coverage. Fix is small: either swap the offending selectors to the correct existing tokens (they collapse into already-checked pairs), or scope the ruleset commentary honestly and record the exclusions.

## Issues

### High

**H1 — `system/derive.rules.mjs:154-155`: "every fg/bg pairing the components actually create" is false, and the missing pairing fails AA.**
`system/components.css:442` (`.nav-cta:hover`), `:438-441` (`.on-ocean .nav-cta`), and `:619` (`::selection` — global, every page) all set `color: var(--color-fg)` on `background: var(--color-accent)`. That fg/accent pairing is not in `wcagPairs` and measures **3.01:1** for the control blue `#2563eb` (needs 4.5:1); it fails for all 8 spike colors. Verified with the PR's own `wcag.mjs` + `derive.mjs`.
*Fix (either):* (a) change those three selectors to `color: var(--color-accent-fg)` — the label-on-accent-fill token that pair 5 already checks — which is a token-discipline-correct two-line CSS fix (components.css is outside this ticket's scope, so a follow-up commit on this branch or a linked issue both work); or (b) at minimum, correct the ruleset commentary to name this pairing as a known, currently-failing exclusion so the artifact stays honest.

**H2 — `system/derive.rules.mjs:165-166`: "Components never set accent text on dark" is false.**
`system/components.css:429-432` (`.site-header.on-ocean .nav-panel .nav-links a:hover/:focus-visible` — a real mode, wired in `system/site.js:39`) sets `color: var(--color-accent)` over the `--color-bg-inverse` panel. Measures **3.19:1** for the control blue (needs 4.5:1); fails for all 8 spike colors. The 11-vs-12 pair decision itself is documented and mathematically sound — the problem is only that its supporting premise is false and hides a real unchecked failure.
*Fix:* correct the premise in the commentary and either restyle the hover (e.g. `--color-fg-on-inverse-strong`) or record the pairing as a known component-level exception pending an on-dark accent contract token.

### Medium

**M1 — `system/derive.rules.mjs:179`: `color-accent-secondary` classified "non-text" (3.0:1), but `system/components.css:826` (`.lp-local a`) uses it as literal link text (needs 4.5:1).** Latent — no shipped HTML instantiates `.lp-local` yet — but the classification and the usage disagree. Fix: raise the pair's `min` to 4.5, or note the `.lp-local` exception in the commentary.

### Low

**L1 — `system/derive.rules.mjs:104`: commentary says every pattern class exists in `components.css`, but `.card-kicker` (`:117` in the patterns map) is defined in `system/portfolio.css`.** Harmless (both stylesheets load in `derive.html` and `index.html`), just factually imprecise.

**L2 — `derive.html` `run()` has no `try/catch` around `derive()`.** Unreachable via today's bounded controls, but worth hardening before this becomes the Factory page station (ticket #10).

## Validation

| Check | Result |
|---|---|
| `node --check` × 5 new modules | ✅ pass |
| `node tooling/spike-palette.mjs` | ✅ exit 0 — anchors ✓, 46 ⊇ 46 contract tokens ✓, 88/88 declared pairs AA (100%) |
| `node agent-layer/gen-token-css.mjs --check` | ✅ no drift (46 contract + 53 pack) |
| Test suite / linter | none by project design (CLAUDE.md) — spike runner is the executable verification |

## What's good

- **The OKLab/OKLCH matrices are byte-identical to Ottosson's published constants** — independently recomputed sRGB red → OKLab (0.628, 0.225, 0.126); matches.
- **WCAG math is exact**: the `#767676`/`#777777` boundary pair recomputes to 4.54/4.48 by hand — the spike's canary is a real canary.
- **`toGamut`'s binary search is sound**: `lo=0` always in-gamut, search only entered after `hi` confirmed out — the bisection invariant genuinely holds.
- **Determinism is real**: no `Date.now`/`Math.random` anywhere; repeated `derive()` runs are byte-identical, matching the browser-vs-Node byte-identity claim in the PR.
- **Contract parity is exact**: 46 emitted keys match `tokens.source.json`'s contract group name-for-name, and the spike's stage-2 check guards future contract growth.
- **`derive.html` escapes every dynamic value before `innerHTML`** (`esc()`); no injection path; no network/LLM calls at view time — the vanilla constraint holds.
- All four documented deviations (palette retuning, 11-vs-12 pairs, `portfolio.css` load, 46 tokens) independently verified as sound and are not flagged.

## Recommendation

**Request changes.** The engineering is strong and validation is green; the two High items are small fixes, but they sit in the one place this project cannot afford an overclaim — a versioned artifact whose whole purpose is that a hiring manager can check it against the code. Tighten the claims (and ideally the three-selector CSS fix), and this is an easy approve.

*Posted by the agentic review gate. A human makes the final call.*
