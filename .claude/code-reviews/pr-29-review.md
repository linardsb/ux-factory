# PR #29 Review — feat: on-dark accent contract token (`--color-accent-on-inverse`)

**Verdict: REQUEST CHANGES** (one High, trivially fixable — everything else is clean and independently verified)

## Summary

The PR does what issue #17 prescribes, and does it verifiably: the token is declared in the DTCG source, derived by a correct lightening negotiation, checked as the 12th `wcagPairs` entry, swapped into the five audited selectors, bound in both reference packs, and carried through the regenerated handoff pack. Every claimed number reproduced under independent recomputation, and both generators are byte-for-byte no-ops against the committed outputs. The one blocking finding is a **sixth** accent-as-text-on-dark selector the audit missed — pre-existing, latent, but it falsifies both the PR's own AC #4 ("no remaining accent-as-text-on-`bg-inverse` in components.css") and the completeness claim this diff writes into the versioned honesty artifact.

## Issues

### High

**H1 — `.btn-ghost:hover` in dark containers still renders plain accent as text** — `system/components.css:203-208`

```css
.on-dark .btn-ghost:hover,
.case.dark .btn-ghost:hover,
.work-block.dark .btn-ghost:hover {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
```

`.work-block.dark` is `background: var(--color-bg-inverse)` (components.css:1195); on the neutral pack that's `#2563eb` on `#1a1a1a` = **3.37:1**, under the 4.5:1 AA text floor. The non-hover rule directly above (197-202) was correctly retokenized to `--color-fg-on-inverse-strong`, so the hover is the one that slipped. `git blame` confirms it predates PR #15 and this PR — a genuine remaining instance, not something introduced here, and currently latent (no shipped page composes `.btn-ghost` inside a dark container). But it matters at merge time because this diff's rewritten `derive.rules.mjs` commentary asserts "Interactive accent-on-dark states were already retokenized to checked tokens in the PR #15 review pass" — false for this selector — and the plan's AC #4 claims components.css is now clean of accent-as-text-on-inverse. The honesty contract is a hard project rule; the claim and the code must agree before this merges.

**Fix**: swap both declarations in that block to `var(--color-accent-on-inverse)`, re-run `node tooling/spike-palette.mjs` (no engine change, so expect the same 96/96).

### Medium

**M1 — stale version in the honesty artifact's own header** — `system/derive.rules.mjs:1`

The `version:` field (line 19) was bumped to `"1.2.0"` but the top-of-file header still reads `v1.1.0`. This file's preamble says readers judging the system should judge THIS file — the header is part of that judged surface, and the repo has hit this exact drift class before (`.claude/reports/epic-1-ticket-audit.md:66`, a v1.0.0/v1.1.0 mismatch). **Fix**: header → `v1.2.0`.

### Low

**L1 — declared-but-unread `against` field** — `system/derive.rules.mjs:61` / `system/derive.mjs:104-108`

`onInverse.against: "color-bg-inverse"` mirrors `contrastFloor.against`, but where the darken loop branches on its `against`, the lighten loop hardcodes `bgInverse` and never reads `oi.against`. Dead configuration implying a generality the code doesn't have. **Fix**: read the field or drop it (YAGNI) — either is fine.

## Validation

| Check | Result |
|---|---|
| Syntax (`node --check` derive.mjs + derive.rules.mjs) | ✅ pass |
| `gen-token-css.mjs` + `--check` | ✅ 47 contract + 55 pack, no drift |
| `gen-handoff.mjs` re-run vs committed outputs | ✅ byte-for-byte no-op |
| Spike (`tooling/spike-palette.mjs`) | ✅ exit 0 · completeness 47 ⊇ 47 · **96/96 pairs AA (100.0%)** |
| Independent ratio recomputation (repo's `wcag.mjs`) | ✅ contract 4.54 · saulera amber 4.69 · trainline mint 5.36 — all match the PR's claims exactly |
| Lighten-loop robustness sweep (~1300 brand colors, hue 0-360° × l 0.05-0.95 × c 0.02-0.35) | ✅ 0 failures; `maxL` guard never binding; `toGamut` preserves requested `l`, so monotonic progress is guaranteed — no stall risk |

## What's done well

- **Negotiation correctness**: lightening from the *negotiated* accent (one continuous negotiation story in `notes`), the `1e-9` note-guard, and the `maxL` loop guard are all correct and match their comments exactly — confirmed by code trace and the empirical sweep.
- **Honesty-contract discipline**: the commentary rewrite retires exactly one exclusion and preserves the other two byte-for-byte verbatim; the single-token impossibility statement is correctly repurposed as the rationale for the new token.
- **Generated-artifact integrity**: `tokens.source.json` edits satisfy every `loadSource()` constraint; both regeneration chains reproduce the committed outputs bit-for-bit — no hand-edit drift anywhere in `handoff/verdant/`.
- **The claims hold up**: every number in the PR body and implementation report reproduced exactly under independent verification — rare and worth saying.

## Recommendation

Fix H1 (+ M1 while in the file; L1 optional), re-run the spike, push. With H1 fixed the contract-completeness claim becomes true and this is a clean approve.

Both documented deviations (single-space alignment in hand-written files; the `#ffd400` narrative aside) are intentional per the implementation report and were not flagged.

---
*Review: piv-review-pr · validation + code-reviewer agent (fresh context) · solo-repo convention: verdict posted as comment (GitHub blocks formal request-changes on own PR)*
