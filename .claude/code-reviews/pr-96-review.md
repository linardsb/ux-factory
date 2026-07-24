# PR #96 Review — parameterize `record-composition` per-scenario + Spike 1 (#88)

**Recommendation: ✅ Approve** (posted as a comment — solo repo; a human merges).

Careful, honesty-load-bearing refactor that generalizes the composition runner from Fieldwork-hardwired to scenario-parameterized, then runs Spike 1 against a fictional `northwind` dashboard. Every claim in the PR body/report was independently re-verified against the code and the fixture — not taken on trust. No critical/high/medium issues.

## Validation (re-run locally, PR branch @ `ux-factory-wt-88`)

| Gate | Result |
|------|--------|
| `node --check portal/record-composition.mjs` | ✅ pass |
| `node scenarios/validate.mjs` | ✅ 3/3 (northwind 22 records; `compose.json` correctly ignored by validator) |
| `node tooling/validate-trace.mjs` | ✅ all traces incl. 2 new northwind pairs |
| `node tooling/drift-check.mjs` (blocking CI gate) | ✅ pass |
| `validateComposition` × 2 northwind compositions | ✅ both valid |
| Root `proto/compositions/index.json` byte-unchanged | ✅ empty diff (no Fieldwork-study leak) |
| Fieldwork compositions/traces (PR scope) | ✅ untouched |

**Number fidelity — hand-verified against `items.json` (22 SKUs):** oversold **3**, low **5**, at-risk **8 of 22**, total shortfall **195u**, deepest shortfall **85u → "Pallet wrap, 23 micron"** (correct SKU), most-exposed warehouse **East (2)**. `status` vs `committed>onHand` coherence: **0 mismatches**. Every one of the 9 tile figures across both compositions is correct.

> Note on the diff base: my local `main` is stale, so `git diff main` shows extra v3 files. GitHub's merge-base already contains the v3 base (it's an ancestor of origin/main), so the gates above ran against exactly the post-merge state, and the true PR scope is the 16 files GitHub reports. The stray `agentic-ui-study.html` line is local-main staleness, not part of this PR.

## What's strong

- **Honesty firewall held (the whole point of the spike).** `northwind` `computeRules` carries *definitions only* — what oversold/low/available/shortfall mean, the fixed `today`, "compute every figure yourself" — and names **no** tile or metric. The agent selected the metrics itself (the two related questions produce genuinely different tile sets). Vocab-extension count **0**, as claimed.
- **Fence rebuilt per-scenario, not loosened.** `makeFence(root, out, readOk)` + the per-run `readOk` set (vocab + declared fixtures + copy.json only); secret denylist unchanged both directions; Write restricted to the one composition path; Bash to `node …` only. `Grep/Glob/Edit` deliberately omitted so the agent can't scan for an example.
- **Good defensive touches:** `Object.hasOwn` guards on arg-controlled `slots[slot]`; a `computeRules.includes(today)` coherence assert so the declared date can't drift from the prompt; boundary hand-validation with path-naming errors per house style; scenario-scoped manifest keeps northwind out of the shared root manifest.
- **Arg parsing is order-independent** for `--slug` placement (index-based exclusion) — verified across positions.
- CLAUDE.md CLI signature + architecture-map annotation updated thoroughly and accurately.

## Notes (accepted-with-note — none blocking)

- **Low — Fieldwork `computeRules` grandfathered clause is a real firewall exception.** `scenarios/fieldwork/compose.json`'s `"You may also show an \"Overdue\" tile"` *does* name a tile, which the stated firewall forbids. It's acceptable **here** (inert — Fieldwork is not re-run this PR; kept verbatim to preserve byte-fidelity with the already-committed Fieldwork run) and is honestly flagged in the file's `$description`. But `fieldwork/compose.json` is the file a future scenario author will copy as a template. **Pin the cleanup to #89's Fieldwork migration:** regenerate Fieldwork under a cleaned `computeRules`, so the firewall claim stops carrying a silent asterisk.
- **Low (scope) — the PR commits `docs/epics/generative-prototyper.prd.md` unmodified by this ticket.** This is epic #86's first landed slice; the report calls it a maintainer call. Land it consciously (it's the epic's first-slice doc pair) rather than as an invisible side effect.
- **Info — cross-scenario trace flat namespace.** `traces/` is not scenario-scoped, so a future scenario reusing a slug would need `--force` and could clobber a committed trace. Guarded today by the `existsSync(rawOut) && !force → throw` check (safe by default) and documented in the code comment; northwind's slugs don't collide. Worth keeping the "slugs globally unique" convention in mind as scenarios grow.

## Deviations from plan — all documented & firewall-safe

`subject` key (names the domain in the intro line — prose, not a tile), `copy` as a hint string, `today` made load-bearing via the coherence assert, northwind slugs via `--slug`, Fieldwork left at root (migration deferred to #89). Each is recorded in the report and/or the relevant `$description`. Intentional decisions, not issues.

## Not re-run (deliberately — not gates on shipped artifacts)

The paid `--dry` runs and the before/after `buildTask` byte-diff were **not** re-executed: Fieldwork is not regenerated in this PR and its committed compositions/traces are confirmed byte-unchanged, so the "byte-identical `buildTask`" claim is a future-run regression assurance, not a correctness gate on anything this PR ships. The checkable proxies that *do* gate shipped artifacts — northwind numbers, `validateComposition`, `validate-trace`, `drift-check` — are all green.

**Verdict: Approve.** Merge when ready; fold the Fieldwork `computeRules` cleanup into #89.
