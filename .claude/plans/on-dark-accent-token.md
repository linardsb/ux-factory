# Feature: On-dark accent contract token (`--color-accent-on-inverse`)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

A single `--color-accent` token mathematically cannot read as AA text on both white and near-black grounds (it would need WCAG luminance ≤ 0.183 and ≥ 0.141 at once). Five decorative selectors in `system/components.css` still set accent as text on `--color-bg-inverse`, unchecked by the derivation engine's `wcagPairs` and measured at ~1.7–3.2:1 across the spike's 8 brand colors (below the 4.5:1 AA text threshold).

This ticket extends the token contract with an on-dark accent variant, `color-accent-on-inverse`: added to the DTCG source, derived by the engine (lighten the negotiated accent until ≥ 4.5:1 vs the derived `bg-inverse`), checked as a 12th `wcagPairs` entry, swapped into the five selectors, and bound in every pack. Doing this before ticket #9 means the future token lint gates a *complete* contract.

## User Story

As a hiring manager inspecting the derivation ruleset and its WCAG check table
I want every fg/bg pairing the components actually create to be a *checked, passing* pair — including accent-as-text on dark sections
So that the "88/88 AA" style claim covers the real component surface and the honesty contract holds under scrutiny.

## Problem Statement

PR #15's review (finding H2 + follow-on audit, `.claude/code-reviews/pr-15-review.md`) found decorative accent-on-dark uses that fail AA and are deliberately excluded from `RULESET.wcagPairs`. The exclusion is currently documented honestly in `system/derive.rules.mjs` (§wcagPairs commentary, v1.1.0) with a pointer to issue #17 — but the failures themselves remain shipped: dark-footer link hovers, a persistent footer link (`a.all` — not just hover), and the feature-band numeral all render brand accent on near-black.

## Solution Statement

Contract extension exactly as issue #17 prescribes:

1. Add `color-accent-on-inverse` to the `contract.accent` group in `system/tokens.source.json` (literal fallback `#3d7bff` — the neutral blue OKLCH-lightened until 4.54:1 on `#1a1a1a`, computed with the repo's own math).
2. Add a neutral primitive (`color-blue-bright: #3d7bff`) + semantic binding in the `neutral` group; regenerate the two CSS layers with `node agent-layer/gen-token-css.mjs`.
3. Teach the derivation engine to emit it: new `palette.accent.onInverse` rule in `derive.rules.mjs` (lighten in 0.01 steps until ≥ 4.5:1 vs derived `bg-inverse`), mirror of the existing `contrastFloor` darkening loop in `derive.mjs`, with a `lightened-for-contrast` note.
4. Add the pair to `RULESET.wcagPairs` (11 → 12 pairs; spike becomes 8×12 = 96 checks) and rewrite the exclusion commentary — the "accent on bg-inverse" bullet becomes the rationale for the new token, not an open exclusion. Ruleset version → **1.2.0**.
5. Swap the five selectors in `components.css` (four direct swaps + one scoped `.work-block.dark .block-num` override).
6. Bind the token in both reference packs — **verified with the repo's own `wcag.mjs`**: saulera's amber already passes on deep-ocean (4.69:1 → bind `var(--color-amber)`); trainline's mint already passes on navy (5.36:1 → bind `var(--color-mint)`). Neither pack needs a new primitive.
7. Regenerate the handoff pack (`node agent-layer/gen-handoff.mjs`) — Style Dictionary reads the DTCG source directly, so css/ios/android targets and `tokens.dtcg.json` pick the token up automatically.

## Out of Scope / Non-Goals

- **Not touching** `portfolio.css` / `proto.css` — the PR #15 follow-on audit swept them; no accent-as-text-on-inverse cases exist there (their accent uses sit on light grounds or are fills with `--color-accent-fg` labels).
- **Not touching** the interactive on-dark cases (`.nav-cta`, on-ocean nav panel, `::selection`) — already retokenized in the PR #15 fix pass to `--color-accent-fg` / `--color-fg-on-inverse-strong` (checked pairs 5 and 9).
- **Not building** the token lint — that's ticket #9; this ticket only makes the contract complete so #9 gates a finished surface.
- **Not updating the Figma file** — the next real parity run (user-gated, `FIGMA_TOKEN`) will report the new token as `missing` until the Figma variable is added; that is an honest reading, note it on issue #17 rather than pre-faking parity.
- **No schema library, no new deps** — plain data additions to existing hand-written modules.

## Feature Metadata

**Feature Type**: Enhancement (contract extension + a11y fix)
**Estimated Complexity**: Low (small, but touches 7 files + 2 regeneration chains)
**Primary Systems Affected**: token contract (`tokens.source.json` → generated CSS), derivation engine (`derive.mjs` / `derive.rules.mjs`), `components.css`, both reference packs, handoff pack (regenerated)
**Dependencies**: none new; `tooling/style-dictionary/node_modules` must exist for the handoff regen (it does)

## Related Work

**Implements**: [linardsb/ux-factory#17](https://github.com/linardsb/ux-factory/issues/17) — PR closes with `Closes #17`   ·   **Epic**: #1 (`docs/epics/ai-first-ux-factory.prd.md` + `.architecture.md`)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/epic-1-remaining-plan.md` — Wave 0 item 2; pins scope ("exactly as the issue prescribes") and the do-before-#9 rationale.
- `.claude/plans/live-derivation-engine.md` — ticket #3's plan; the engine/ruleset/spike shapes this extends.
- `.claude/code-reviews/pr-15-review.md` — finding H2 + resolution note; the origin of issue #17 and of the retokenization idiom to mirror.

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- ticket #9 (CI gates) — its token lint assumes the contract is complete after this lands.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/tokens.source.json` (lines 15–22 contract accent group; 79–91 neutral primitives; 146–153 neutral semantic-accent) — Why: the three insertion points; note `$description` conventions.
- `agent-layer/gen-token-css.mjs` (lines 36–57 `loadSource` validation) — Why: constraints your edits must satisfy — contract group holds **literals only** (aliases throw), aliases must stay inside their group, leaf names must be unique per group.
- `system/derive.rules.mjs` (lines 18–19 version bump convention; 37–57 `palette.accent` — the `contrastFloor` shape to mirror; 154–184 the wcagPairs commentary + list you will rewrite/extend) — Why: this is THE versioned artifact; the commentary rewrite is half the ticket's honesty value.
- `system/derive.mjs` (lines 62–100 accent negotiation — the darken loop at 80–89 is the exact pattern to mirror for lightening; 131–155 the tokens map to extend) — Why: pattern + insertion point.
- `system/components.css` (lines 503, 686–687, 1206–1220 `.block-num`, 1248–1249 the `.work-block.dark` override cluster, 1332) — Why: the five swap sites.
- `system/tokens.saulera.css` (lines 87–92 accent semantic block) and `system/tokens.css` (lines 92–97) — Why: where each pack binds the new token; both packs' accent primitive already passes on their dark ground (verified — see NOTES).
- `tooling/spike-palette.mjs` (lines 44–61 stage-2 completeness; 112–151 CLI) — Why: no edits needed, but understand that stage 2 FAILS if the contract gains a token the engine doesn't emit — it is the guard that proves your derive.mjs change.
- `system/wcag.mjs` + `system/oklch.mjs` — Why: `contrastRatio`, `toGamut`, `oklchToHex` — the only helpers the new loop needs; all already imported by `derive.mjs`.
- `.claude/references/token-system.md` — Why: the documented add-a-token mechanic (source first → regenerate → commit source AND generated CSS together).

### New Files to Create

None. This is entirely edits + regeneration.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Issue #17](https://github.com/linardsb/ux-factory/issues/17) — the prescription this plan follows verbatim.
- `.claude/code-reviews/pr-15-review.md` (H2 + the resolution blockquote) — the audit trail; the ruleset commentary you rewrite must stay consistent with this record.
- [WCAG 2.2 SC 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum) — 4.5:1 AA text threshold (already the codebase's cited basis, `wcag.mjs` header).
- `docs/epics/ai-first-ux-factory.architecture.md` §Data model — contract/pack layering decisions (inherited, not re-decided).

### Patterns to Follow

**Ruleset version bump** (`derive.rules.mjs:19`):
```js
version: "1.1.0", // 1.1.0: accent-secondary held to 4.5 (it IS link text); wcagPairs exclusions corrected (PR #15 review)
```
→ becomes `"1.2.0"` with a same-style trailing comment naming this change (`// 1.2.0: color-accent-on-inverse added — accent-on-dark now a checked pair (issue #17)`).

**Contrast negotiation loop** (`derive.mjs:80–89`) — mirror this exactly, inverted to lighten:
```js
const { against, min, step, minL } = P.accent.contrastFloor;
// ...
while (contrastRatio(oklchToHex(acc), surfaceHex) < min && acc.l - step >= minL) {
  acc = toGamut({ l: acc.l - step, c: acc.c, h: acc.h });
}
```

**Negotiation note** (`derive.mjs:86–89`):
```js
notes.push({ token: "color-accent", action: "darkened-for-contrast", from: round3(beforeNegotiation), to: round3(acc.l),
  why: `lightness lowered until the accent reads ≥ ${min}:1 as text on the card surface` });
```
→ new action name: `lightened-for-contrast`.

**wcagPairs entry shape** (`derive.rules.mjs:180–181`):
```js
{ fg: "color-fg-on-inverse",        bg: "color-bg-inverse", min: 4.5, usage: "chrome text on dark sections" },
```

**Pack semantic-block comment style** (`tokens.saulera.css:88–92`): aligned `var()` bindings with a short trailing `/* … */` per line.

**Error handling / validation**: none new needed — `gen-token-css.mjs` `loadSource()` already validates the source edits at the boundary and throws naming the offending path.

---

## IMPLEMENTATION PLAN

Single sequential phase set — each phase's validation depends on the one before. No parallelism worth annotating. Work on a feature branch (`feature/on-dark-accent-token`), repo convention per recent PRs #23/#27/#28. **Shared-worktree caution** (memory): other Wave-0 ticket sessions may share this working dir — verify the branch right before committing and stage by explicit path.

### Phase 1: Contract + packs (the token exists everywhere)

**Tasks:**
- Add the token to `tokens.source.json` (contract literal, neutral primitive, neutral semantic binding)
- Regenerate `tokens.contract.css` + `tokens.neutral.css`
- Bind in `tokens.saulera.css` and `tokens.css`

### Phase 2: Derivation engine (the token is derived and checked)

**Depends on:** Phase 1 (spike stage-2 completeness reads the contract from `tokens.source.json`)

**Tasks:**
- `derive.rules.mjs`: `onInverse` rule + 12th wcagPair + commentary rewrite + version 1.2.0
- `derive.mjs`: lightening negotiation + note + tokens-map entry

### Phase 3: Component swap (the token is used)

**Tasks:**
- Swap the four direct selectors; add the `.work-block.dark .block-num` scoped override

### Phase 4: Regeneration + validation

**Tasks:**
- Regenerate the handoff pack; run the full validation ladder; render-check the shipped pages

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE `system/tokens.source.json` — contract group

- **IMPLEMENT**: in `contract.accent` (after `color-accent-secondary`, line 21) add:
  ```json
  "color-accent-on-inverse": { "$value": "#3d7bff", "$type": "color" }
  ```
  (`#3d7bff` = neutral blue `#2563eb` OKLCH-lightened in 0.01 steps until ≥ 4.5:1 on the contract's `#1a1a1a` inverse ground — lands at 4.54:1; verified with `system/wcag.mjs`, see VALIDATION COMMANDS Level 4.)
- **PATTERN**: sibling literals `tokens.source.json:17–21`
- **GOTCHA**: contract group must hold literals — an alias here makes `loadSource()` throw. Leaf name must be unique within the whole contract group (it is).
- **VALIDATE**: `node agent-layer/gen-token-css.mjs` → prints `token css ✓ 47 contract + …`
- **SATISFIES**: AC #1

### UPDATE `system/tokens.source.json` — neutral group

- **IMPLEMENT**: in `neutral.primitives` (after `color-blue-act`, line 87) add:
  ```json
  "color-blue-bright": { "$value": "#3d7bff", "$type": "color", "$description": "lightened accent blue — accent as text on dark" }
  ```
  and in `neutral.semantic-accent` (after `color-accent-secondary`, line 152) add:
  ```json
  "color-accent-on-inverse": { "$value": "{neutral.primitives.color-blue-bright}", "$type": "color", "$description": "accent as text on the dark ground (footer link hovers, feature-band numeral)" }
  ```
- **PATTERN**: `tokens.source.json:85–87` (primitives), `:148–152` (aliases)
- **GOTCHA**: alias must stay inside the `neutral` group and resolve — `loadSource()` checks both.
- **VALIDATE**: `node agent-layer/gen-token-css.mjs` → `token css ✓ 47 contract + 55 pack tokens` (was 46 + 53), then `node agent-layer/gen-token-css.mjs --check` → no drift
- **SATISFIES**: AC #1, AC #2

### UPDATE `system/tokens.saulera.css`

- **IMPLEMENT**: in the Accent semantic block (after line 92) add:
  ```css
  --color-accent-on-inverse: var(--color-amber);      /* accent as text on deep-ocean — 4.69:1, passes AA */
  ```
- **PATTERN**: `tokens.saulera.css:88–92` alignment + trailing comment style
- **GOTCHA**: hand-maintained reference pack (NOT generated — safe to edit directly, unlike `tokens.neutral.css`). Amber passes on deep-ocean so no new primitive is needed; re-verify with the Level-4 snippet before trusting this plan's number.
- **VALIDATE**: Level-4 snippet prints `saulera 4.69 ≥ 4.5`
- **SATISFIES**: AC #5

### UPDATE `system/tokens.css` (trainline pack)

- **IMPLEMENT**: in the Accent semantic block (after line 97) add:
  ```css
  --color-accent-on-inverse: var(--color-mint);   /* accent as text on navy — 5.36:1, passes AA */
  ```
- **PATTERN**: `tokens.css:93–97`
- **VALIDATE**: Level-4 snippet prints `trainline 5.36 ≥ 4.5`
- **SATISFIES**: AC #5

### UPDATE `system/derive.rules.mjs` — rule + pair + commentary + version

- **IMPLEMENT**:
  1. In `palette.accent` (after `fgContrastMin`, near line 55) add:
     ```js
     // on-inverse accent: accent used as TEXT on the derived dark ground (dark-footer
     // link hovers, the feature-band numeral — issue #17). LIGHTEN from the negotiated
     // accent in 0.01 steps until ≥ 4.5:1 vs the derived bg-inverse. maxL is a loop
     // guard only: as l → 1 the gamut forces chroma → 0 (→ white, ~14:1 on any derived
     // inverse ground), so convergence is guaranteed well before it.
     onInverse: { against: "color-bg-inverse", min: 4.5, step: 0.01, maxL: 0.98 },
     ```
  2. In `wcagPairs`, after the `color-fg-on-inverse-strong` row (line 181) add:
     ```js
     { fg: "color-accent-on-inverse",    bg: "color-bg-inverse", min: 4.5, usage: "accent text on dark sections (footer link hovers, feature-band numeral)" },
     ```
  3. Rewrite the §wcagPairs commentary block (lines 162–170): the "accent on bg-inverse" exclusion bullet is no longer an exclusion. Keep the single-token impossibility statement (luminance ≤ 0.183 and ≥ 0.141) as the *rationale for why a separate on-dark token exists*, state that `color-accent-on-inverse` is that token (resolved issue #17, v1.2.0), and that the pair is now checked. The two remaining exclusions (decorative `color-border` hairlines; the five `color-mix()` relative tokens) stay verbatim.
  4. Version → `"1.2.0"` with the trailing-comment convention (see Patterns).
- **PATTERN**: `contrastFloor` at `derive.rules.mjs:49`; pair rows at `:172–184`
- **GOTCHA**: this file is the versioned honesty artifact — the commentary must stay consistent with `.claude/code-reviews/pr-15-review.md`'s record. Don't delete history, resolve it.
- **VALIDATE**: `node --check system/derive.rules.mjs`
- **SATISFIES**: AC #3, AC #7

### UPDATE `system/derive.mjs` — derive + emit the token

- **IMPLEMENT**: after `accentSecondary` (line 100), mirror the darken loop inverted:
  ```js
  // On-inverse accent: lighten (never darken) from the negotiated accent until it
  // reads AA as text on the derived dark ground (ruleset §palette.accent.onInverse).
  const oi = P.accent.onInverse;
  let accOn = { ...acc };
  while (contrastRatio(oklchToHex(accOn), bgInverse) < oi.min && accOn.l + oi.step <= oi.maxL) {
    accOn = toGamut({ l: accOn.l + oi.step, c: accOn.c, h: accOn.h });
  }
  if (accOn.l - acc.l > 1e-9) {
    notes.push({ token: "color-accent-on-inverse", action: "lightened-for-contrast", from: round3(acc.l), to: round3(accOn.l),
      why: `lightness raised until the accent reads ≥ ${oi.min}:1 as text on the dark ground` });
  }
  const accentOnInverse = oklchToHex(accOn);
  ```
  and in the tokens map add `"color-accent-on-inverse": accentOnInverse,` after `"color-accent-secondary"` (line 143).
- **PATTERN**: `derive.mjs:80–89` (loop), `:86–89` (note shape)
- **IMPORTS**: none new — `contrastRatio`, `oklchToHex`, `toGamut` already imported
- **GOTCHA**: lighten from the **negotiated** `acc` (post `contrastFloor` darkening), not the raw brand — keeps one continuous negotiation story in `notes`. `bgInverse` is already in scope (line 59).
- **VALIDATE**: `node --check system/derive.mjs && node tooling/spike-palette.mjs` → exit 0; expect `completeness ✓ 47 emitted ⊇ 47 contract tokens` and `96/96 pairs AA (100.0%)`
- **SATISFIES**: AC #2, AC #3

### UPDATE `system/components.css` — the five selectors

- **IMPLEMENT**:
  - line 503: `.footer-col a:hover { color: var(--color-accent-on-inverse); opacity: 1; }`
  - line 686: `.footer-areas-links a:hover { color: var(--color-accent-on-inverse); opacity: 1; }`
  - line 687: `.footer-areas-links a.all { color: var(--color-accent-on-inverse); opacity: 1; }`
  - line 1332: `.feature-band .section-label .num { color: var(--color-accent-on-inverse); }`
  - `.block-num` (base rule line 1213) **stays** `--color-accent` — it's correct on light grounds. ADD one scoped override in the `.work-block.dark` cluster, after line 1249 (`.work-block.dark p.lede`):
    ```css
    .work-block.dark .block-num { color: var(--color-accent-on-inverse); }
    ```
- **PATTERN**: the dark-override cluster `components.css:1248–1249, 1292–1296`
- **GOTCHA**: no shipped page composes `.block-num` inside `.work-block.dark` today — the override is defense for a real composable pair, keep it one line. Do NOT touch the `.nav-panel` accent rules (~404–408; light ground) or `::selection` (line 622; fixed in PR #15).
- **VALIDATE**: `grep -n "var(--color-accent)" system/components.css` around the five sites shows no remaining accent-as-text-on-inverse; render check in Level 4
- **SATISFIES**: AC #4

### UPDATE `handoff/verdant/` — regenerate the pack

- **IMPLEMENT**: `node agent-layer/gen-handoff.mjs` — refreshes `tokens.dtcg.json` (copy of source), `tokens/css/contract.css` + `neutral.css`, `tokens/ios/FactoryTokens.swift`, `tokens/android/tokens.xml` (Style Dictionary reads the DTCG source directly).
- **GOTCHA**: generated outputs are committed, never hand-edited (deploy = commit the artifacts). `figma-parity.json` is untouched by this generator — leave it alone. If SD fails, `cd tooling/style-dictionary && npm install` (node_modules currently present).
- **VALIDATE**: generator prints its `✓` line; `git diff --stat handoff/` shows only token-derived files changed
- **SATISFIES**: AC #6

### UPDATE issue #17 + PR

- **IMPLEMENT**: commit per convention — one atomic commit, source AND generated CSS together, message citing the ticket (e.g. `feat: on-dark accent contract token — accent-on-inverse derived, checked, swapped (epic #1, #17)`). Push branch, PR body notes the Figma-parity caveat (next real parity run will list the new token as `missing` until the Figma variable is added — expected, honest). `Closes #17`.
- **GOTCHA**: shared worktree — `git branch --show-current` immediately before committing; stage by explicit path (the 9 files below), not `git add -A`.
- **VALIDATE**: `git show --stat` lists exactly: `system/tokens.source.json`, `system/tokens.contract.css`, `system/tokens.neutral.css`, `system/tokens.saulera.css`, `system/tokens.css`, `system/derive.rules.mjs`, `system/derive.mjs`, `system/components.css`, `handoff/verdant/*` token outputs
- **SATISFIES**: AC #8

---

## TESTING STRATEGY

No test suite by project design (CLAUDE.md): "done" = run the surface you touched. The executable verification here is unusually strong for this repo:

### Unit-level (executable checks that already exist)

- `tooling/spike-palette.mjs` stage 2 (contract completeness) FAILS if the contract token isn't emitted by the engine — it is the regression test for the `derive.mjs` change.
- Stage 3/4 run the new wcagPair across 8 brand colors including three hostile ones (`#ffd400` very light, `#a3e635` light+high-chroma, `#78350f` very dark) — the lightening negotiation must converge to ≥ 4.5:1 for all 8 (96/96).
- `gen-token-css.mjs --check` is the drift guard for the generated CSS.

### Integration

- `derive.html` renders the checks table generically from `result.checks` — loading it shows 12 rows, all pass, and the applied-tokens list includes the new token (no HTML edits needed).

### Edge Cases

- **Very light brand (`#ffd400`)**: accent already light — lightening loop exits immediately or after a few steps; pair passes trivially.
- **Very dark brand (`#78350f`)**: accent negotiated dark for light surfaces → large lightening delta; confirm a `lightened-for-contrast` note appears (visible negotiation, not silent).
- **maxL guard**: unreachable in practice (chroma → 0 → white ≈ 14:1 on any derived inverse ground) but present so the loop can't spin.
- **No pack loaded**: contract fallback `#3d7bff` on `#1a1a1a` = 4.54:1 — the contract stands alone, as layer 1 requires.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness. (Repo path contains a space — run from the repo root, quote any absolute paths.)

### Level 1: Syntax & Style

```bash
node --check system/derive.mjs && node --check system/derive.rules.mjs && echo OK
```

### Level 2: Generators + drift

```bash
node agent-layer/gen-token-css.mjs            # expect: token css ✓ 47 contract + 55 pack tokens
node agent-layer/gen-token-css.mjs --check    # expect: no drift, exit 0
node agent-layer/gen-handoff.mjs              # expect: its ✓ line
```

### Level 3: The spike (the ticket's real gate)

```bash
node tooling/spike-palette.mjs                # expect: exit 0 · completeness 47 ⊇ 47 · 96/96 pairs AA (100.0%)
```

### Level 4: Manual validation

```bash
# Pack bindings pass AA on their own dark grounds (repo's own math):
node -e '
import("./system/wcag.mjs").then(({ contrastRatio }) => {
  const rows = [
    ["contract/neutral", "#3d7bff", "#1a1a1a"],
    ["saulera amber",    "#f59e0b", "#264653"],
    ["trainline mint",   "#00a88f", "#160078"],
  ];
  for (const [name, fg, bg] of rows) {
    const r = contrastRatio(fg, bg);
    console.log(`${name}: ${r.toFixed(2)} ${r >= 4.5 ? "≥ 4.5 ✓" : "FAIL"}`);
  }
});'
```

```bash
npx serve .   # then:
# 1. index.html → footer: link hover + the persistent "all" link now render the lightened
#    blue (#3d7bff) on near-black; feature-band numeral likewise.
# 2. derive.html → run a derivation: checks table has 12 rows, all pass; for a dark brand
#    (e.g. #78350f) the notes list shows "lightened-for-contrast".
```

### Level 5: Additional Validation (Optional)

```bash
git diff --stat   # exactly the 8 source files + handoff token outputs; nothing else
```

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — `color-accent-on-inverse` exists in the contract group of `tokens.source.json` (literal `#3d7bff`) and in the neutral pack (primitive + semantic binding); generated CSS regenerated, `--check` clean.
- [ ] AC #2 — `derive()` emits the token for any valid input; spike stage-2 completeness passes at 47 ⊇ 47.
- [ ] AC #3 — `RULESET.wcagPairs` has 12 pairs; spike reports 96/96 AA across all 8 brand colors; ruleset version is 1.2.0.
- [ ] AC #4 — the five components.css sites use the new token (four swaps + one `.work-block.dark .block-num` override); no remaining accent-as-text-on-`bg-inverse` in components.css.
- [ ] AC #5 — both reference packs bind `--color-accent-on-inverse`, each verified ≥ 4.5:1 against that pack's own `--color-bg-inverse`.
- [ ] AC #6 — handoff pack regenerated (dtcg + css + ios + android carry the token); no hand edits to generated files.
- [ ] AC #7 — the §wcagPairs commentary no longer lists accent-on-inverse as an unchecked exclusion; the record stays consistent with the PR #15 review resolution.
- [ ] AC #8 — one atomic commit (source + generated together), PR with `Closes #17`, Figma-parity caveat noted.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] Levels 1–4 all green (Level 3 exit 0 is the hard gate)
- [ ] Manual render check confirms footer/feature-band changes under the neutral pack
- [ ] No linting/type-check step exists by design — don't invent one
- [ ] Acceptance criteria all met
- [ ] Generated files changed only via their generators

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Assumption: token lives in the `accent` group** (contract + semantic-accent), not the `inverse` group. Rationale: it derives *from* the accent and sits with its variants (`-hover`, `-active`, `-fg`, `-secondary`); the ruleset houses the rule under `palette.accent`. Either grouping generates identical CSS — flagged here, not blocking.
- **Assumption: `#3d7bff` as the neutral/contract literal** — computed with the repo's own OKLCH lighten + `wcag.mjs` (4.54:1 on `#1a1a1a`). If the implementer's re-run produces a ±1-step neighbour, use the recomputed value; the check, not the hex, is the contract.
- **Assumption: reference packs bind existing primitives** (amber 4.69:1, mint 5.36:1 — both pass). If re-verification disagrees, add a lightened brand primitive to that pack instead (same recipe as neutral).
- **Figma parity**: next real run will show the new token `missing` in Figma (variable not yet created there). Accepted as honest; noted on the PR. The pending user-gated parity run (memory: wt-12) is unaffected code-wise.

## NOTES (open canvas)

**Verified numbers (2026-07-18, repo's own math — `node -e` against `system/oklch.mjs` + `system/wcag.mjs`):**

| pairing | ratio | verdict |
|---|---|---|
| neutral blue `#2563eb` on ink `#1a1a1a` | 3.37 | fails — this is the bug |
| lightened `#3d7bff` on ink `#1a1a1a` | 4.54 | passes — contract/neutral value |
| saulera amber `#f59e0b` on deep-ocean `#264653` | 4.69 | passes — bind existing primitive |
| trainline mint `#00a88f` on navy `#160078` | 5.36 | passes — bind existing primitive |

**Why lighten converges for every hue**: `toGamut` reduces chroma at fixed lightness as `l` rises; in the limit the color approaches white, and white on the derived `bg-inverse` (ruleset pins its lightness at 0.24) is ~14:1. So unlike the single-accent impossibility (a ~2-point luminance window), the on-dark variant always has a solution — which is exactly why the fix is a contract extension, "not an engine trick" (issue #17's words).

**Alternatives weighed and rejected:**
- *Bind on-inverse to `--color-fg-on-inverse-strong` (drop the accent flavor on dark)* — loses the brand signal in the footer/feature-band; the PR #15 fix already used that move for *interactive* states where legibility trumps flavor; for decorative flavor the right fix is a legible accent, per the issue.
- *`color-mix()` relative token (like the inverse washes)* — uncheckable by the JS checker (the exact reason five tokens are excluded from wcagPairs); a first-class derived token keeps it checkable, which is the point.
- *Put the pair-fix in the engine only, leave packs alone* — packs are the demonstration ("a company build clones the neutral pack"); an incomplete pack contradicts the one-line re-skin claim and would trip #9's future pack-completeness lint.

**Sync points audited** (grep for `color-fg-on-inverse-strong` as the contract-enumeration fingerprint): all downstream consumers are either generated (`tokens.contract.css`, `tokens.neutral.css`, `handoff/verdant/*`), generic (`derive.html` iterates `Object.entries(result.tokens)`; `gen-tokens.mjs` parses `:root` vars by regex; Style Dictionary reads the DTCG source), or guarded (`spike-palette.mjs` stage 2). No hardcoded token lists or counts anywhere else — the wc/ wrappers, specs, vocabulary, and scenarios don't enumerate the contract.

**Counts after the change** (for the ✓ lines): contract 46 → 47 · neutral pack 53 → 55 (one primitive + one semantic) · wcagPairs 11 → 12 · spike checks 88 → 96.

## AMENDMENTS

<!-- Append-only after first approval/execution. Newest at the bottom. -->
