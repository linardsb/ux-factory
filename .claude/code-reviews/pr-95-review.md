# PR #95 Review — v3 approach as method page + work as proof index (#80)

**Reviewer:** `/piv-review-pr` (fresh-eyes agentic gate) · **Branch:** `feature/v3-approach-work` → `main`
**Verdict:** ✅ **Approve** (no critical/high issues; validation green; matches intent)

## Summary

Migrates the two supporting IA pages (`approach.html`, `work.html`) to the v3 band vocabulary and closes epic #70's "Approach page vs spine-section" open question with the D6 default (tight page). Approach becomes a tight method page; Work becomes the proof index and absorbs the two proto embeds + handoff pack `factory.html` had parked "until #80." Clean scope: 13 files, all traceable to the ticket. The heavy lifting is applying an already-battle-tested vocabulary (`index.html`/`factory.html`) and relocating existing blocks — low-risk by construction.

## Issues by severity

**Critical / High / Medium:** none.

### Low

1. **Untokenized caption font-size — `work.html:44`.** `.factory-embed-cap { font-size: 13.5px; … }` sits under a comment claiming the block is "styled from tokens alone … via `var(--…)`," but the font-size is a raw literal while `--type-caption: 13px` already exists (`tokens.contract.css:100`) for exactly this. **Not a regression** — this rule was relocated verbatim from `factory.html` (pre-existing, first flagged in `pr-37-review.md` finding 4). Since the block was moved anyway, it was a free chance to either switch to `var(--type-caption)` or amend the now-inaccurate comment. **Fix (optional, non-blocking):** `font-size: var(--type-caption);` — or drop the "tokens alone" clause from the comment. Note the 0.5px delta would nudge the just-regenerated `work-*` baselines, so defer if you don't want another baseline pass this PR.

## Documented deviations (intentional — not issues)

Both are recorded in the PR body + implementation report and reviewed as sound:

1. **Factory card repointed `/factory` → `/`.** #78 moved the drivable intake off `factory.html` onto the home spine, so the card's "you drive the intake yourself → /factory" was a false capability claim after #78, and `/factory` is also a `#more` row (double-homing). Repointing to `/` with home-spine copy is the correct honesty-contract fix, scoped to one card. ✓
2. **`system-graph.json` regenerated.** `.closing` referenced tokens (`--color-bg-surface`/`--color-border`/`--color-accent`), so it was a real consumer block; removing it drifted the measured graph, which the blocking `drift-check` caught. Regeneration (not hand-edit) is correct. ✓

## Validation

| Gate | Result |
|------|--------|
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | ✓ 62 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node agent-layer/gen-annotated-source.mjs --check` | ✓ 2 snippets — no drift |
| `git add -A && gen-loc-summary.mjs --check` | ✓ 3 groups — no drift |
| Deep review (code-reviewer agent, full files) | ✓ no dangling refs to `#loop`/`#value`/`#practice`/`#layers`/`#prototypes`/`#handoff`/`.closing`; glossary `data-term`s intact; VR mask matches work.html markup; `#screens`/`#handoff` ids present with scroll-margin; no dup ids; heading order clean |
| VR baselines (`update:docker`, per report) | 18/18 pass; exactly the 6 expected PNGs regenerated |

**Pending (human, environment can't run):** real Safari + Chrome eyeball + humanizer pass on the new prose — the CHECKLIST MUSTs a headless Linux/Chromium gate can't cover. Flagged honestly in the PR.

## What's good

- **Zero dangling references** anywhere in the repo to every removed id/class — verified by grep, not assumed.
- **Glossary + VR anchor integrity** — every remaining `data-term` is a known key (`initGlossary` won't throw); `#asrc[data-asrc="ready"]` wait anchor preserved verbatim.
- **VR mask travelled correctly** — the one genuine trap the plan called out (iframe mask must move factory→work or work's baseline goes flaky forever) was handled; selector matches the new markup.
- **Reachability preserved** — demos relocated to Work are still reachable from factory's new `#verify-further` rows; nothing double-homed after the card repoint.
- **Consistent close idiom** — all three pages now share one light `.section` + `.hero-cta-row` → `/contact` tail, satisfying the Q6 confident-close bar without the removed disc band.
- **Honesty-first judgment** — the reviewer caught a false capability claim (deviation 1) rather than mechanically following "keep the card verbatim." Exactly the right call for this repo's honesty contract.

## Informational (out of scope for #95, future cleanup)

- `system/factory-intake.mjs:328–333` — a vestigial `renderScenarioChrome()` branch querying `.factory-embed-figure[data-scenario]` from the pre-#78 live-toggle flow is now more clearly dead after this relocation. No-op, not a blocker; worth a future sweep.

## Recommendation

**Approve.** Validation is green, the diff matches intent, both plan deviations are justified and documented, and the deep pass found only one pre-existing Low. Merge after the two human craft checks (Safari/Chrome eyeball + humanizer) the PR already lists as pending.
