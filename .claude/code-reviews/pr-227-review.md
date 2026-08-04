# Code Review — PR #227 · studio canvas substrate (#204)

**Verdict: APPROVE.** Critical 0 · High 0 · **Medium 2 (both found, both fixed in-PR, both proven to fail)** · Low 0.

Reviewed by the `code-reviewer` agent as a fresh-eyes pass in a clean context, against `CLAUDE.md`, the plan
and the report's 9 documented deviations. `mergeStateStatus: CLEAN`, and HEAD contains current `origin/main`
(`6320349`) — this review validates the tree that will actually merge, not a stale one.

## Findings

### Medium 1 — `tooling/vt-verify.mjs:333` · the reduced-motion canvas sub-case could not fail

The primary canvas case correctly proves movement (`data-zoom`, `data-col` and the measured box all differ)
before asserting zero transitions. **The reduced-motion sub-case did not.** `reset()` zeroes the *transition
counter*, not the canvas (`vt-verify.mjs:158`), so after a `Fit` click the block asserted only
`calls === 0` plus `/^\d+%$/` on the readout — and **the page loads reading "100%", which matches that regex**.
A regression that made `fit()` a no-op under reduced motion would have left both assertions green.

**Fixed**: the block now snapshots `data-zoom` before the click and asserts it changed, before asserting the
absence. Written out rather than inherited, with the reason in a comment.

### Medium 2 — `tooling/studio-journey.mjs:271` · a tautological reduced-motion assertion

`rfit.readout === pct(Number(rfit.zoom))` can never fail: `syncControls()` derives the readout *from* the zoom
index inside the module, so the two sides are equal whether or not any verb did anything. The Fit-specific half
of "every zoom verb still completes" was therefore unproven.

**Fixed**: split into three assertions, each against something its verb could get *wrong* — zoom in must leave
the rest level; fit must leave where zoom in put it **and** land on a level the measured layout agrees with
(the `fitsAt()` check from the full-motion block); reset must return all the way to scale 1 / scroll 0,0.

### Both fixes proven, not asserted

The exact regression the reviewer hypothesised was reproduced — `fit()` gated behind
`matchMedia("(prefers-reduced-motion: reduce)")`:

| driver | before the fix | after the fix |
|---|---|---|
| `studio-journey` | green (tautology) | **✗ `fit still recomputes a level…` — `3 → 3`** |
| `vt-verify` | green (`"100%"` matched) | **✗ `fit actually moved the zoom level` — `data-zoom 2 → 2`** |

Reverted; both green again. **The pattern worth carrying forward** (the reviewer's own recommendation): wherever
this repo pairs a "prove movement, then assert absence" block with a reduced-motion counterpart, the counterpart
must inherit the same precondition rather than be written as a lighter-weight copy.

## Validation

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ **all 12 groups** |
| `node tooling/token-lint.mjs` | ✓ 64 tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | ✓ all 12 artifacts |
| `node agent-layer/gen-system-graph.mjs --check` | ✓ no drift |
| `node tooling/studio-journey.mjs all` | ✓ **28/28 × 3 engines (84 assertions)** — was 26, +2 from the fix |
| `node tooling/vt-verify.mjs all` | ✓ all engines, existing scenarios included |
| Node-import safety | ✓ imports with no DOM |
| CI `verify` · `visual` | ✓ both pass |

### Mutation validation — 8 mutations, every one caught by the assertion that claims to own it

| # | mutation | caught by |
|---|---|---|
| 1 | inline style write in `studio-canvas.mjs` | group 7 ✗ |
| 2 | `[data-zoom="3"]` scale `1.5` → `1.6` | group 12 ✗ |
| 3 | delete the `[data-col="7"]` rule | group 12 ✗ (different reason) |
| 4 | remove the ⌘/Ctrl-wheel guard | `studio-journey` ✗ ×3 |
| 5 | `place()` writes an inline style | `studio-journey` ✗ ×2 |
| 6 | `place()` stops announcing | `studio-journey` ✗ |
| 7 | `clampSlot` loses its upper bound | group 12 **and** `studio-journey` ✗ |
| 8 | `fit()` no-ops under reduced motion | `studio-journey` **and** `vt-verify` ✗ (the two fixed assertions) |

1–3 by the author; 2 and 1 independently re-derived by the reviewer from scratch; 4–8 fresh in this pass.

## What's good

- `clampSlot` / `fitLevel` are pure, DOM-free, and exhaustively covered both statically (group 12) and live —
  nothing escapes to `NaN`, `Infinity` or an unclamped value, verified by direct boundary calls.
- The anchor-preserving zoom math correctly mirrors `system-graph.mjs`'s shipped idiom, including
  measure-at-call-time and the `offsetWidth`-not-`getBoundingClientRect` distinction (a rect would compute
  against the post-transform box).
- The pointer-pan guard is *stricter* than `device-frame.mjs`'s documented firefox fix — it additionally checks
  `e.pointerId` before bailing, which the pointer-id-keyed `pan` object requires and the single-bool original
  did not.
- `destroy()` is complete: the `AbortController` covers every listener, all injected DOM is removed, `live` is
  nulled.
- Group 12's CSS-mirror parsing **fails loudly on zero matches** before judging content — the right shape for a
  mirror check, and proven by mutation rather than by inspection.
- Zero inline styles, zero markup-from-string, no framework, no runtime dep, no test runner introduced. Plain
  path-naming `Error`s. Headers cite governing docs.
- A5 confirmed by grep on this tree, not inherited: `studio` and `agentic` are absent from
  `client.neutral.config.js`, `system/palette.mjs` and `visual.spec.mjs`.

## Not flagged, deliberately

A1 (`studio.css` over `components.css`) and A2 (no `param-manifest.json` entry) are argued in the plan's
ASSUMPTIONS and the report; the 9 documented deviations are intentional decisions, not findings. The single
`view-transition` grep hit in `studio-canvas.mjs` is the header sentence explaining the *absence* — no
`view-transition-name` is declared or written anywhere.

## Recommendation

**Approve.** No critical or high issues. The two Medium findings were both in operator-run drivers rather than
in shipped code, both are fixed in this PR, and both are now proven to fail on the regression they missed.
Nothing shipped mounts the canvas yet (#206 owns that), so the blast radius of anything remaining is the
harness alone.
