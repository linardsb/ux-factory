# Implementation Report — Studio 9: the docs chain (`example` field · demo-notice's render path · the view-time join)

**Plan**: `.claude/plans/docs-chain-example-field-demo-notice-211.md`
**Branch**: `feat/211-docs-chain`
**Status**: COMPLETE

## Summary

Three changes to the generation chain, plus the inherited red gate cleared first. An optional
`example` spec-head field (the live playground's starting props) and optional `min`/`max`/`step`
numeric-control bounds, both parse-validated, with `example` additionally **semantically** validated
by running the shipped `validateComposition` against the fully built vocabulary — so an example that
would not render is a red CI `verify` naming the spec path, not a broken playground a visitor finds.
`demo-notice` got the `components.css` block and `agentic-renderer.mjs` template it never had, which
let `build-checks` group 3 stop *documenting* the hole as intentional and start asserting the
invariant over the whole vocabulary. And `prepareHandoff` grew the pack × vocabulary × system-graph ×
wrapper × example join that #215 and #218 need — computed at view time, with **no new generated
artifact** and no resolved token value anywhere.

## Tasks completed

| # | Task | Path | Action |
|---|---|---|---|
| 0 | Clear the inherited `loc-summary` red | `system/loc-summary.json` | UPDATE (own commit) |
| 1 | `example` + `min`/`max`/`step` in the head schema | `agent-layer/lib.mjs` | UPDATE |
| 2 | Document both new head keys | `.claude/references/kb-format.md` | UPDATE |
| 3 | The pure exported `validateExamples` + its call | `agent-layer/gen-vocabulary.mjs` | UPDATE |
| 4 | `example` on all ten specs; `stat-tile.value` bounds | `system/specs/*.md` | UPDATE ×10 |
| 5 | The `vd-demo-notice` block | `system/components.css` | UPDATE |
| 6 | The `demo-notice` template | `system/agentic-renderer.mjs` | UPDATE |
| 7 | `status` flip + the two false prose sections rewritten | `system/specs/demo-notice.md` | UPDATE |
| 8 | Group 3 widened; the exception paragraph deleted | `tooling/build-checks.mjs` | UPDATE |
| 9 | `prepareHandoff(pack, vocab, graph = null)` | `system/handoff-viewer.mjs` | UPDATE |
| 10 | Group 18 — the docs chain | `tooling/build-checks.mjs` | UPDATE |
| 11 | The architecture map | `CLAUDE.md` | UPDATE |
| 12 | The regeneration cascade | 5 generated artifacts | REGENERATE |
| 13 | The no-token-values verification | — | VERIFY |
| 14 | approach's two baselines | `tooling/visual-regression/baselines/` | REGENERATE |

**New files: none** — the ticket's central claim (architecture §Data model, "Docs catalog carries no
new generated artifact"). `git diff --cached --name-status | grep '^A'` returns nothing.

## Tests added

No test suite by design (`CLAUDE.md` → Testing). Every new invariant landed as a **committed gate**:

- **`build-checks` group 3 (widened)** — every one of the 10 vocabulary entries has a template, up
  from "every name `compose()` emits". The emitted-names loop was **kept** — it asserts a different
  thing (that `compose` emits only vocabulary names) and is not subsumed.
- **`build-checks` group 18A** — `validateExamples` over the 10 real committed specs (`checked`
  read off `pack.json`, not typed), the four-branch mutation, the optional-field skip asserted as a
  `checked` count of 0, and totality over 6 junk example values.
- **`build-checks` group 18B** — `prepareHandoff`'s join over the real `pack.json` +
  `vocabulary.json` + `system-graph.json`, every count derived from the files; the two-arg
  compatibility claim; totality over 7 junk graphs.
- **`drift-check` → `checkHandoff` → `genVocabulary` → `validateExamples`** — a bad example is a red
  CI `verify` with no extra wiring.

### The four mutation proofs (Level 6) — all run, all observed red, all restored

| # | Mutation | Observed |
|---|---|---|
| 1 | Comment out the `demo-notice` template | `build composition ✗ 1 failure` — *"demo-notice is in the generated vocabulary but agentic-renderer.mjs has no template for it"* |
| 2 | Group 18A's four broken examples | Permanent committed cases — each throws **and** names its spec path |
| 3 | `stat-tile`'s example value → `"34"` (string) | `gen-vocabulary` **and** `drift-check` both red: *"system/specs/stat-tile.md: head "example" does not render — stat-tile.example.props.value: expected number, got string"* |
| 4 | Remove the `vd-demo-notice` CSS block + regen the graph | `build docs chain ✗` — *"demo-notice: no components.css block consuming contract tokens…"*. **This also proved the anti-lockstep anchoring**: the graph regenerated to 32 consumers, and the check still went red *because the expected set comes from the pack*. |

## Validation results

| Gate | Result |
|---|---|
| `node tooling/drift-check.mjs` | ✓ all 12 steps, no drift, clean tree |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/build-checks.mjs` | ✓ **all 18 groups pass** |
| `node scenarios/validate.mjs` | ✓ |
| `update:docker` (Linux, CI-equivalent) | ✓ 20/20 passed |
| `npx playwright test` (local macOS) | 20 failed — **platform artefact**, Linux baselines vs the macOS renderer; the Docker run is the authoritative one |
| `/handoff.html` headless render | 0 page errors · no `spec` badge · `"example"` in the head `<pre>` · no stale ticket-#8 prose |

**Artifact cascade** (all committed): `system-graph.json` 32→33 consumers, edges 388→393 ·
`pack.json` + `pack.bundle.json` (the ten examples, `stat-tile`'s bounds, `demo-notice`'s
status/prose) · `vocabulary.json` (`demo-notice` status + bounds **only** — no `example`) ·
`loc-summary.json` runtime 25,700→25,800, **file count unchanged at 72**.

`inspect-data.json` unchanged as predicted (`--check` green, no `ROLES` key added).
`param-manifest.json` / `param-count.json` **untouched** — no live control ships here.
Task 13's grep for `#hex` / `oklch(` / `rgb(` in the staged artifact diff returned **empty**.

## Deviations from the plan

1. **Task 4's VALIDATE command and Task 10A's "count read from `vocabulary.json`" are stale** — they
   contradict Task 3's own DO-NOT-IMPLEMENT (and AC #1, and NOTES trap #1), all of which forbid
   projecting `example` into `vocabulary.json`. Both are leftovers from an earlier draft where it
   *was* projected; as written they read `0` and assert against a count that cannot exist. **Resolved
   toward Task 3** (which the architecture backs): the example count is derived from `pack.json`
   throughout. This does not weaken group 18B's anti-lockstep rule — `pack.json` is the right anchor
   for the same reason it is right for `consumer`: it moves when a spec changes, not when the thing
   under test breaks.

2. **The group count lives in four places, not the one Task 11 names.** Fixed all four: `CLAUDE.md`
   ("16 groups" → 18), the `build-checks` verdict line (17 → 18), the header's "Fifteen groups" → 18,
   and the header index — which listed 1–15 with **16 and 17 missing entirely** and 15 printed before
   14. Appending an `18 docs chain` line to an index that jumps 14 → 18 would read as broken, so 16
   and 17 were added and the ordering fixed. Three extra lines to make an index I was already editing
   true; Task 11's "do not re-litigate the rest of the entry" was scoped to the prose, not to a gap
   this ticket would visibly widen.

3. **Group 18B's "no example" head-projection branch was rewritten before commit.** As first written
   it was a `find(c => !c.example)` guarded `if` — silently vacuous, since #211 authors an example on
   all ten specs. Replaced with a **synthetic stripped pack**, so the negative half of the
   explicit-pick claim is genuinely exercised rather than skipped. (The `check-that-cannot-fail`
   lesson, applied to my own check.)

4. **`system/agentic-renderer.mjs`'s header said "seven templates"** — already stale at nine before
   this ticket. Corrected to ten alongside the map it describes, plus the `hasTemplate` comment,
   which described group 3's *old* narrower scope and would otherwise have become false.

5. **A second `loc-summary` boundary was crossed.** Task 0 alone moved runtime 25,600 → 25,700 (the
   inherited `fix(210)` drift). This ticket's own runtime lines then pushed it to **25,800** — the
   plan predicted staying inside 25,700, but the comment blocks it specifies are long. Immaterial:
   approach's baselines regenerate once, from the final tree, and the page reads the number from the
   artifact. No number was hand-written anywhere.

6. **`demo-notice`'s rewritten `## Accessibility` sentence was fact-checked before shipping.** My
   first draft claimed the contrast pair is one "every pack is held to". Verified against
   `system/derive.rules.mjs` — `{ fg: "color-fg-muted", bg: "color-bg-surface", min: 4.5, usage:
   "captions on cards" }` is a real `wcagPairs` entry, but that ruleset governs *derived* packs, not
   hand-authored ones. Narrowed the wording accordingly. This prose ships verbatim in `pack.json`, so
   an overclaim there is an honesty-contract failure rather than a loose sentence.

## Issues encountered

- **A half-restored generated file after mutation proof 3.** Restoring `stat-tile.md` and re-running
  `gen-vocabulary` was not enough — `pack.json` still carried the string `"34"`, and group 18 (which
  reads the pack) went red on the next run. Caught by the gate rather than shipped. Full cascade
  re-run fixed it. Worth noting for anyone running these proofs: **restore the source *and* re-run
  every generator downstream of it**, not just the obvious one.
- **`drift-check`'s `checkHandoff` uses `git status --porcelain`, which reports staged changes too**,
  so `handoff/` must be **committed** — not merely staged — before it goes green. This looks like a
  real failure mid-ticket and is not.
- **The first `update:docker` run rewrote no baselines at all.** The changed approach digits sit
  below pixelmatch's per-pixel threshold, so the two PNGs had to be removed to force the capture.
  A green update run is not proof a page didn't change.

## Ready for the next step

All changes committed on `feat/211-docs-chain` (6 commits), tree clean, every gate green.
Next: `piv-create-pr` — the PR body **must** carry `Closes #211` (a title mentioning `(#211)` closes
nothing), and the plan, this report and the review belong in the same PR.
