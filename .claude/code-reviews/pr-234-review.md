# PR #234 review — `/factory` becomes the studio (route surgery, orchestrator, docked inspector)

**Recommendation: APPROVE.** No Critical, High or Medium findings. Two Low items, both cosmetic.

Branch `feature/studio-route-surgery-206` → `main`, `MERGEABLE` / `CLEAN`, 0 commits behind `origin/main` —
so everything below was validated against the tree that will actually merge.

Reviewed with fresh eyes: every changed file read in full, the `code-reviewer` agent dispatched for the deep
pass, `origin/main:factory.html` diffed for silent regressions, and the gates re-run independently rather than
taken from the PR body.

## Validation (re-run here, not quoted from the PR)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ **all 14 groups** |
| `node tooling/studio-journey.mjs chromium` | ✅ **105 passed, 0 failed** — incl. all 15 new `#206 · /factory` assertions |
| `node tooling/drift-check.mjs` | ✅ 12 passes (syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay) |
| `node tooling/token-lint.mjs` | ✅ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `gen-param-count --check` / `gen-loc-summary --check` | ✅ no drift |
| Live headless-Chromium smoke of `/factory#shape` + all three lazy panels | ✅ zero console / page errors |

`build-journey` was not re-run: the diff touches none of `/build`'s chain (`build-import` · `build-questions` ·
`build-share` · `build-keep` · `build-card` · `breadboard` · `pattern-*` · `build.html`), nor `components.css`,
nor any token source. The PR's "150 passed, `/build` proven untouched" rests on files this diff does not modify.

## Findings

### Critical — none
### High — none
### Medium — none

### Low

**L1 · `system/studio.mjs:346` — no-op ternary.**
`initGlossary(root === document ? document : root)` reduces to `initGlossary(root)`: when the condition is
true, `root` *is* `document`. No behavioural difference. Fix: `initGlossary(root);`. Worth taking only because
this line already carries a 12-line comment explaining its *position*, and a reader parsing that comment will
stop on the ternary next.

**L2 · `system/studio.mjs` `wireInspector` — two `activate()` passes on a hash cold-load.**
`activate(0, false)` runs unconditionally, then `fromHash()` may immediately `activate(idx)`. The first pass
always calls `mountPanel("this-build")`, which matches no branch and returns undefined. Verified harmless: both
calls are synchronous, so there is no double-fetch, no double-mount and no visible flash. Optional one-line
comment; not a required fix.

## What was verified and found correct

These are the things a diff-only reader would reasonably flag. Each was checked and is **not** a defect:

- **Panel-id preservation across four inbound entry points.** `agents` / `round-trip` / `shape` are kept
  verbatim; `system/palette.mjs:102-104`'s three memoized ⌘K commands and `roundtrip.html:176`'s back-link all
  still resolve — and now land on a *mounted* panel rather than a selected-but-empty one, which is the actual
  bug class this surgery removes. Covered by a real assertion (cold `#shape` deep-link into a mounted graph),
  not an eyeball.
- **The `hidden`-defeated-by-author-`display` trap** (live on `/build` until #138). `.stu-panel` carries only
  `min-width: 0` in `studio.css`; `.trace-*` / `.sg-*` set `display` on their own inner nodes only. `.hidden`
  works, and `studio-journey` asserts exactly one visible panel.
- **`#appearance` collision with the dock.** `fromHash`'s `findIndex` returns `-1` and no-ops.
- **Lazy-mount race.** `mounted.add(id)` is synchronous and precedes the async `mountPanel(id)`, so rapid tab
  switching cannot double-mount at any fetch timing. The `mounted` keys come from `aria-controls` and match
  `mountPanel`'s branches exactly.
- **Tab controller fidelity.** A faithful port of the pre-#206 inline controller (`factory.html:404-455` on
  main) — same activate / keydown / `fromHash` shape, same "JS on → collapse to one panel, JS off → all
  painted" contract, plus mount-on-activation. Neither version writes the hash, so that is unchanged behaviour.
- **Glossary keys.** All four `data-term` values on the new page exist in `glossary.mjs`'s `TERMS`, so the
  deliberate outside-the-`try` placement fails loud only when it should. (`committed-artifact` is no longer
  used on this page — a copy change, not a missing key.)
- **Inspect mounts.** The dynamically-applied `data-inspect` ids exist in `inspect-data.json`, so
  `refreshInspect()` cannot abort the whole activation. The file itself discloses that `drift-check`'s
  inspect-mounts pass reads tracked HTML only and therefore cannot see them.
- **`param-manifest.json`.** The +8 entries comply with the manifest's own counting rules, and the three
  re-scoped ones are correctly annotated conditional. 7 → 15 for `/factory`, 85 → 93 site-wide, no drift.
- **Baseline churn is exactly earned.** Four PNGs: `factory ×2` for the rewrite, `approach ×2` because
  `approach.html:245-259` renders `loc-summary`'s runtime group (67→68 files, 21700→22400 lines) *and* the
  `param-count` total. No chrome-bearing baseline is touched — the PR body's claim holds.
- **Group 7 with no exception argued.** `studio.mjs` builds every node element-by-element and writes zero
  inline styles; the running-page half is asserted after a move, which is when a style-writing implementation
  would show.
- **All three pre-argued "Notes for the reviewer"** (`initGlossary` outside the `try/finally`; the `.trace-*` /
  `.sg-*` blocks moved verbatim rather than dropped; the nav label staying "Factory" for #216) check out
  exactly as described, and are intentional decisions rather than findings. Same for all six documented
  deviations — spot-checked against the code, including that the dropped `:not([hidden])` sibling rule is
  genuinely redundant given `.stu-inspector`'s own `gap`.

## What's good

- **The pure/impure split earns its CI.** `arrangeBoard` / `buildSummary` driven by group 14, the mount half by
  `studio-journey` — the same discipline `studio-canvas.mjs` and `studio-verbs.mjs` carry. The totality sweep
  over nine junk boards is mutation-proven, and the over-wide truncation case *says out loud* that it is
  vacuous and plants a `MAX_PLACES < MAX_COLS` tripwire so the day it stops being vacuous it fails here.
- **The defect found in the check itself** — an unguarded `arrangeBoard(null)` that would have turned a
  totality regression into an uncaught `TypeError` killing the run before `group()` printed — is exactly the
  repo's "the check that cannot fail" lesson applied to a check written in the same PR.
- **The VR-gate trade is stated, not hidden.** Losing the three at-load handles genuinely costs a liveness
  check on `system-graph.json`; the PR names that, and the replacements (drift-check reads the artifact;
  `studio-journey` asserts the rendering) are both real and both re-run green here.
- **The absorbed-stylesheet catch.** Dropping `.trace-*` / `.sg-*` with the tab controller would have shipped
  green through `update:docker`, `build-checks` *and* `drift-check`, because nothing captures a lazy panel. The
  `display: flex` assertion is the right replacement coverage, and the reasoning is written down where the next
  reader will hit it.
- **`build.html` is not edited at all**, which is what makes the PRD's form-mode fallback structurally
  guaranteed rather than promised.
- Every non-obvious line is explained in place with a rationale traceable to a repo rule or a prior incident
  (#171, #173, #230, #138). That is what made this review fast rather than speculative.

## Recommendation

**Approve.** Merge as-is, or fold L1 (`initGlossary(root)`) in first — it is a one-token edit that touches no
gate and needs no baseline regeneration. The PR closes #206 via a `Closes #206` trailer, and plan, report and
this review all live in the PR, per the repo's git rules.

A human now reviews the code + this review and merges.
