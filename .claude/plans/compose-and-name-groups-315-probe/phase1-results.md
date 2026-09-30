# #315 probe — Phase 1 (Tasks 1.1, 1.2) + Task 6.1, run 2026-09-30

Throwaway clone of the repo at `b99d9ac` (`git clone --no-hardlinks`, `tooling/icons` `npm ci`), removed afterwards.
Patch: `phase1.patch.txt` (apply to `b99d9ac` with `git apply`). Not committed anywhere.

## Result: PASS

`node tooling/build-checks.mjs` → `build ✓  all 50 groups pass` (observed, with the patch). 35.10, 35.12, 35.14, 35.15,
35.16 and every other group unchanged and green.

`git diff --numstat`: `system/canvas-ops.mjs` +209 −6, `tooling/build-checks.mjs` +149 −4.
Runtime loc group with the patch (working tree): `wc -l` 32,965 + 81 files = 33,046 → `linesApprox` 33,000 (from
32,800) — derived; Task 3.3's `templates.admitted.mjs` lines still to add.

## REDDENS — each mutation run once, observed, reverted

| Mutation | Observed |
|---|---|
| M1 `OPS` back to twelve (PARAMS keeps 14) | `canvas ops ✗ 77 failure(s)` — first: `OPS (…) and PARAMS (…) are not the same fourteen verbs …`; the positive-control setup then throws `op 5 (group.define): "group.define" is not an op`, named by `fold()` |
| M2 D4 step 3 (namespacing) removed | `✗ 8` — 35.17a `f2's tree does not hold the expanded copy g1-1/header "Home"`, 35.17b, 35.17c `overriding g1-2's title changed nothing` and `two copies on one frame … ["header","help","mark","header","help","mark"]`, 35.17e `a subtree holding a copy … NO THROW`, 35.17f ×2 (state renders `dangling-set g1-1/header`) |
| M3 redefine blocker disabled | `✗ 1` — `35.17d redefining g1 without header while g1-2 overrides it: NO THROW` |
| M4 `refuseFrozen` in `group.define` removed | `✗ 1` — `35.17h group.define over a frozen original: NO THROW` |
| M5 D4 step 2 (`resolve` of the copy's override) dropped | `✗ 4` — 35.17c ×2, 35.17f `a dangling copy override was not flagged with its copy: []`, `hide: [help] must drop help from g1-1 only` |

## Step 4 answers (observed through 35.17)

- `frameTree`'s flatten / layers / `hidden` write-back run unchanged over the expanded tree (35.10 green; 35.17f's hide).
- A state of a base holding a copy renders the copy, and its override can address `g1-1/header` (35.17f).
- `flowEdges` reads `partText` through a namespaced `partId` (`g1-1/help` → "Get help", 35.17f).
- Every expanded tree passes the real `validateComposition`; a `list-row` copy placed in a `stack` is refused naming `list-row` (35.17g).

## Corrections to the plan (apply these)

1. **35.17e fixture:** the refusal table must NOT reuse the defined name. With `{...define.params}` every define case
   hit the duplicate-name refusal first (3 cases observed red: `name "app-header" is already g1's`). Use a fresh name
   (`fresh-group`) in the helper and pass `app-header` only in the duplicate-name case.
2. **Refusal order in `group.define`:** name → `partIds` shape → twice → `/` → edit target → duplicate name → frame →
   selection. The tests depend on it (a `/` id is refused before the frame's tree is read).
3. **Task 1.2's REDDENS literal was wrong:** removing the namespacing does NOT make "both copies read Add a payee" —
   the override is resolved per copy before the rename, so it lands; what breaks is every namespaced lookup (8
   failures, above). Replace with the observed messages.
4. **`frameTree`'s `const flags = []` moves up** (declared before the expansion; the original at `:665` removed). A
   group node as the ROOT returns `{tree: null, flags: [{kind: "group-root"}]}` before expansion.
5. **`walkNodes` must accept an array** (a definition's `parts` is one) — used by define's nest check, the blocker's
   id set, and minting.
6. **Minting walks the RAW compositions of every frame** (`taken`), so `g1-3` follows `g1-1`, `g1-2` across frames.
7. **35.1 id-slot line and the positive-control setup** landed exactly as the plan states (f3 `home`, g1
   `kept-group`); every other verb's control stayed green.
8. `component.propose` keeps its existing recordId messages byte-identical; 35.12 needed no change (its table does not
   include "neither id" — 35.17i covers both/neither).
