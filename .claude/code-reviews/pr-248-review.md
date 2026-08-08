# PR #248 Review — feat(212): studio flows — places become screens, connections become navigation

**Reviewer**: piv-review-pr (fresh-context agentic gate — code-reviewer agent + independent validation runs)
**Verdict**: **REQUEST CHANGES** — scoped narrowly to one High finding; everything else is approve-quality.

## Summary

The PR delivers what it claims: `screensFor` (rules S1–S4) types each place's screen from the one-board
model, `studio-flow.mjs` renders screens and wires real announced keyboard-operable navigation,
`studio-compile.mjs`'s per-screen swap closes inherited finding L3 by deletion (the 1:1
screens↔wrappers argument was traced independently and is sound), and the exporter emits the whole
flow as one runnable no-script file. The gates are genuinely mutation-tested, the export's escaping
discipline holds up under a security read, and all 7 documented deviations check out as intentional
decisions with recorded rationale.

One undocumented honesty-contract gap blocks approval: **feed's truncation sentence never reaches the
exported file.**

## Issues

### High

**H1 — Feed's `streamNote` truncation sentence is silently dropped from the exported file**
(honesty-contract gap, undocumented; verified in source by the coordinating reviewer)

- The chain: `system/studio-compile.mjs:125` computes `screens[0].note = streamNote(...)` when the
  pattern is feed → `system/studio-flow.mjs:79-80` renders it on the canvas → but
  `system/studio-keep.mjs:349-356`'s export mapping returns `{name, type, slots, nav}` and never
  reads `screen.note` → `system/studio-export.mjs` has no `note` field or rendering path at all.
- Failure scenario: a visitor restores a `shape: "stream"` board via `?b=` (the exact state
  studio-journey's keepPass §10 drives on the canvas). Feed reads the whole board, so 7+ affordances
  truncate to `SLOT_MAX` 6 and the canvas states it via `streamNote`. Press **Download the runnable
  file**: the export's feed entry screen shows the same 6 rows with **no statement anything was
  dropped** — while the provenance facts print `Affordances: 7` beside it. The 6-of-7 fact is not
  recoverable from the document.
- Why High: this is the failure class `pattern-rules.mjs`'s own header names ("a page that promises
  it counts everything cannot drop thirty of them quietly"), and the PR's own deviation 4 already
  established the pattern for the *other* honesty sentence — `EMPTY_SCREEN` was moved into
  `studio-export.mjs` and imported by `studio-flow.mjs` precisely "so the canvas and the exported
  file say it in the same words." That reasoning applies verbatim to `streamNote`. It is not among
  the report's 7 documented deviations, and no gate exercises it — no `exportHtml` fixture anywhere
  uses `type: "feed"` (groups 17/19 fixtures are all dashboard/queue).
- Fix: thread `screen.note` through `studio-keep.mjs`'s screen mapping into `exportHtml`'s
  `screens[].note` and render it (e.g. a `<p>` beside the section heading through `esc()`, mirroring
  `.stf-note`). Add a feed-typed `exportHtml` fixture to group 17 or 19 asserting the exported
  document carries `streamNote`'s sentence **by identity** — the check-that-cannot-fail discipline
  the rest of this PR holds itself to.
- If the drop was a deliberate scope call: record it as an 8th documented deviation with the
  honesty trade-off stated, the way deviation 4 argued its case. Either resolution (fix or
  documented decision) unblocks; the silent state is what can't ship.

### Low

**L1 — The pan-bail selector doesn't match the rule its comment claims to mirror**

- `system/studio-canvas.mjs:235` bails on `"button, a, input, select, textarea"`; the comment calls
  this "the mirror image" of the verbs' body-drag rule, but `system/studio-verbs.mjs:611` also
  matches `[tabindex]`. This PR introduces the one element in the gap: `.stf-screen-name`
  (h4, `tabindex="-1"`, `studio-flow.mjs:75`) — excluded from body-drag, not excluded from pan.
- Current impact: none (a pan starting on a non-interactive heading is harmless). Fix by adding
  `, [tabindex]` for true parity, or tighten the comment to state the narrower scope. Fine as a
  fast-follow.

**L2 (optional) — Two notes, no action required**

- `exportHtml`'s nav-target join stays aligned with `studio-keep.mjs`'s id-based `findIndex` only
  because the real caller never interleaves junk entries into the filtered `shown` array. Worth a
  one-line comment on the positional-alignment precondition.
- `screen.type` is part of the shape `studio-keep.mjs:351` passes to `exportHtml` but is never read
  there. Dead field.

## Validation

| Gate | Result |
|------|--------|
| CI `verify` + `visual` | ✓ green (merge state CLEAN, mergeable) |
| `node tooling/build-checks.mjs` | ✓ all 19 groups, re-run locally — incl. new group 19 "flow" |
| `node tooling/drift-check.mjs` | ✓ all 12 checks, re-run locally |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan, re-run locally |
| `node tooling/studio-journey.mjs chromium` | ✓ 265/265, zero page/console errors, re-run locally (incl. the new flow pass) |
| `node tooling/studio-journey.mjs firefox` / `webkit` | ✓ 265/265 each, re-run locally |
| Node-import safety of the pure layer | ✓ (smoke-tested by the review agent) |

## What's good

- **The L3 "closed structurally" claim was traced independently and holds**: `replay-driver.mjs`'s
  backward-seek clears tracked wrappers before rebuilding, `studio.mjs` has exactly one `place()`
  call site, `arrangeBoard` can't truncate (MAX_PLACES 6 < MAX_COLS 12), no verb adds/removes a
  wrapper — and the `applySwap` tripwire remains as a loud backstop, not a hand-wave.
- **Export escaping survives a hostile read**: `esc()` orders `&` first, section ids are generated
  integers never label-derived, `nav.target` is validated and bounds-checked, every text sink
  escaped exactly once, serialized composition markup never re-escaped — and group 6's hostile
  fixtures were extended to the two new sinks.
- **Gate quality is real**: group 19's BFS reachability, the pinned histogram with two mutations
  proving it can go red, BOARD_FOR-driven coverage failing loudly on a missing fixture, totality
  over 9×6 junk combinations. Expected values are independent literals, not derived from the code
  under test.
- **Atomic refusal preserved**: `applySwap` builds every screen (validation included) before
  touching any wrapper — a refusal on screen N leaves the canvas untouched.
- Clean atomic commits; every cascade (loc-summary, param-manifest/count, CLAUDE.md map entry,
  4 baselines) present and consistent.

## Recommendation

**Request changes** on H1 only — fix the export's missing truncation sentence + its identity-asserted
regression fixture (or record the drop as a documented deviation with the trade-off argued). L1 is a
one-token change worth folding in while the PR is open; L2 is optional. Everything else reviewed —
the screen rules, the L3 close, the exporter's security posture, the gate reshaping, the pan-vs-click
fix — is approve-quality.
