# Code review — PR #145 · /build slice 1c (#137)

**Reviewed**: `feature/build-pattern-render-137` → `main`, 5 commits, 11 files
**Recommendation**: **Comment** (see the caveat below — this is not an independent review)

## Caveat, stated first

This review was written by the session that wrote the code, so it is **not the fresh-eyes pass
`piv-review-pr` exists to be**. The `code-reviewer` agent was not dispatched: this session runs under
an explicit instruction not to use the Agent tool unless the user asks for it. Two consequences a
human should weigh:

1. Author bias is unmitigated. The findings below are the ones self-review can reach — invariants,
   boundaries, and things the gates can prove. They are not a substitute for someone reading this
   diff cold.
2. `gh pr review --approve` is not used, both for that reason and because a solo repo cannot
   formally self-approve. Posted as a comment.

One real bug WAS caught after implementation was declared done, by an outside reviewer, and it is
fixed in `f5550c2` — see "What review caught" below. That is evidence the caveat is not theoretical.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 7 groups, exit 0 |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan |
| `node tooling/drift-check.mjs` | ✓ 8 checks |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift |
| `node --check` × 10 modules | ✓ |
| headless journey (Chromium) | ✓ 43 assertions, 0 console errors |
| CI `verify` | ✓ pass |
| CI `visual` | ✓ pass (18 baselines; only the two `approach-*` moved, deliberately) |

## Findings

### Critical — none

### High — none

### Medium

**M1 · `tooling/build-checks.mjs` is committed but unregistered in CI.**
`tooling/build-checks.mjs` — check 3 validates both compositions against the real
`handoff/verdant/vocabulary.json`, and its stated job is "catches a vocabulary regeneration breaking
the builder". Nothing runs it automatically, so that guarantee is manual today. The plan did not ask
for CI registration and the PR body says so explicitly rather than letting the next session assume
coverage. **Fix**: add it to the `verify` job in #138, alongside that slice's gate sweep. Left as-is
here deliberately (out of this slice's scope), not overlooked.

**M2 · A restored page rewrites its own URL 400 ms after load.**
`system/build-keep.mjs:~290` — `restore()` sets `linkLive = true`, then `restoreBuild()` fires
`BUILD_CHANGE` → `update()` → the debounced `replaceState`. The re-encode is deterministic over the
same state, so the URL it writes is the one already there; the cost is one wasted encode per restored
page load and one history-entry replacement. Harmless, and it has a real upside (it normalises a
hand-edited or reordered link), but it is a side effect nobody asked for. **Fix if it ever matters**:
skip the first scheduled write when `update()` is running as a direct consequence of the restore.

### Low

**L1 · `stages` is captured once at mount.**
`system/build-import.mjs:103` — `[...document.querySelectorAll("[data-build-stage]")]` is read once.
It is correct today because `pattern-render.mjs` only ever `replaceChildren`s inside its root, so the
`[data-build-stage]` node itself persists. That is a real coupling between two modules and it is
undocumented at the query site. **Fix**: one comment naming the requirement, so the day someone
recreates the stage element the constraint is visible.

**L2 · `boardSvg`'s chip widths are estimated from a character constant.**
`system/build-card.mjs:234` — `CHAR_W = 6.2` approximates 12px system-ui. Wide labels in a
wide-glyph font could sit a few pixels proud of their chip border. Bounded by `clip(label, 20)` and
by `Math.min(w - 24, …)`, so it cannot overflow the box; only the chip's own border can be slightly
tight. Unavoidable without DOM measurement, which is the whole point of the module being Node-pure.

## What review caught (already fixed)

**`f5550c2` — a shared design printed "No design imported yet" beside a stage wearing it.**
The headless journey only ever shared a build with **no** imported pack, so the entire
restore-with-a-design path was unexercised on the page. `adoptPack()` applied the tokens but never
touched `[data-build-keep-empty]`, which starts visible. A colleague opening a shared link saw the
stage re-skinned while Act 5's "Your design" row said no design had been imported.

This is the **finding-12 class the plan legislated against in the other direction** — a sentence
that is true about one thing, read as a claim about everything. The plan caught the clear-the-stage
case and missed the symmetric restore case. Fixed by making `clearKeep()` take its message and
capture the markup's sentence as its default, and the journey now derives a palette before sharing
and asserts both stages, the token round-trip and the row's copy (43 assertions, up from 37).

Worth recording as a testing lesson, not just a bug: **the happy path was tested with the one input
that skipped the feature under test.**

## What is good

- **The render path is the real one.** `compose()` emits the same `{name, props, children}` the
  build-time agent runs emit, validated by the same generated vocabulary, and check 3 runs that
  assertion against `handoff/verdant/vocabulary.json` read from disk. A vocabulary regeneration that
  broke the builder would fail the gate rather than the page.
- **The one-application-point invariant is enforced at the choke point.** `vetTokens` moved *inside*
  `applyToStage` rather than sitting at its four call sites, one of which is now a stranger's URL.
  Check 7 asserts `.setProperty(` appears exactly once in the file — crude, cheap, and it fails loudly.
- **The codec refuses whole.** 14 hostile payloads plus caps and transport failures, each returning
  null with a reason. The zero-rejected **and** zero-skipped rule is the non-obvious one: `vetTokens`
  sorts an off-family key into `skipped`, so zero-rejected alone would have accepted `--evil` and a
  JSON-parsed `__proto__`.
- **Two honesty decisions are argued in the code, not just made.** The payload carries no pattern id
  (it is recomputed, so a link cannot claim a pattern its board does not produce) and no
  `label`/`note` (those describe the *sender's* browser; replaying them would have the receiving page
  state at rest that it read a file it never saw).
- **The out-of-library path is designed, not degraded.** Same card chrome, same weight, the pattern's
  definition, what it would need, and the breadboard beside it. Two of the four `shape` answers land
  there, so this is a majority path and it looks like one.

## Recommendation

**Comment, with a human read recommended before merge.** No critical or high findings; all gates and
both CI checks green; the diff matches the PR's stated intent and the plan's nine documented
deviations. M1 is scoped to #138 by decision. The binding reason not to approve is the caveat at the
top: this review is not independent, and the one real defect in this branch was found by someone
other than its author.
