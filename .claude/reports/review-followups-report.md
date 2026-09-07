# Implementation Report — PR #377 review follow-ups, plus #367, #373 and #368

**Plan**: none — four small tickets, each carrying its own fix shape (triaged as direct-implement)
**Branch**: `fix/review-followups`   **Base**: `31a46e8` → `31a46e8`   **Status**: COMPLETE

## Summary

Closes four issues in one branch because three of them collide on `tooling/build-checks.mjs`. #379 is the six
Low findings from the PR #377 review: one ungated guard, one guard that blamed the fixture, and four
sentences reaching further than their code. #367 makes `declareFacets` a delegation to the bank's
`normaliseFacets` instead of a second copy of its expression. #373 gives `#discovery-flow-note` one writer.
#368 fixes `record-gate.sh`, which recorded an unquoted command and an empty Validation block.

## Tasks completed

- #379 F1 → `tooling/build-checks.mjs` case 41: `facetKeyOf`'s three absent forms pinned (UPDATE)
- #379 F2 → `tooling/build-checks.mjs` case 28.10: the vacuity guard reads the fixture, not `ledgerView` (UPDATE)
- #379 F3, F4 → `.claude/references/gates.md` + the printed `group("discovery ops")` summary (UPDATE)
- #379 F5 → `portal/lib/discovery.mjs`: `facetKey`'s header absolute scoped to the absent forms (UPDATE)
- #379 F6 → `.claude/reports/discovery-portal-width-288-report.md:66`: the fifth "block count" (UPDATE)
- #379's stated-not-fixed item → recorded in gates.md's Group 29 "cannot reach" clause (UPDATE)
- #367 → `discovery/bank.mjs` exports `normaliseFacets`; `portal/lib/discovery.mjs`'s `declareFacets` is now `return normaliseFacets(facets);` (UPDATE ×2)
- #373 → `portal/public/portal.js`: one `renderDiscoveryFlowNote()` both states call (UPDATE)
- #368 → `.claude/skills/piv-create-pr/scripts/record-gate.sh` + its SKILL.md line (UPDATE ×2)
- Gate cases for #367 and #373 → `tooling/build-checks.mjs` groups 28/30 (UPDATE)

## Tests added

No suite exists (`CLAUDE.md` §Ground rules). The gate is the test: `tooling/build-checks.mjs` gains case 43
(the #367 delegation, source-pinned plus a 56-input battery) and five assertions in case 41 (#373's one
writer, both call sites, and #379 F1's absent forms).

## Proving the checks

Every mutation applied to the working tree, `node tooling/build-checks.mjs` run in full, then restored
verbatim. All observed; baseline and restored both `build ✓ all 34 groups pass`, exit 0.

| Mutation | Result | Message |
|---|---|---|
| a second flow-note writer via a local (`n.textContent =`) | **RED** | `case 41: #discovery-flow-note is written outside renderDiscoveryFlowNote — a second writer flips a live run's note back to the form's stance (#373)` |
| drop `renderDiscoveryFlowNote()` from `renderDiscoverySession` | **RED** | `case 41: renderDiscoverySession() does not call renderDiscoveryFlowNote() — the note keeps whatever the other state last wrote (#373)` |
| revert `facetKeyOf`'s absent-form guard | **RED** | `case 41: facetKeyOf does not spell all three absent forms …` |
| revert `declareFacets` to its own copy | **RED**, 4 failures | case 43's source pins and battery |

The first is the one that matters: **before this branch's own fix, that mutation was GREEN.** The pin the
gate writer first produced keyed on the literal `$('#discovery-flow-note').textContent =`, so a write
through a local or via `innerText` was the same second writer spelled differently and shipped green. It now
keys on the selector call. Verified both ways.

`record-gate.sh`, driven for real (no gate can reach a skill script):

| Run | Result |
|---|---|
| `record-gate.sh bash -c 'node tooling/token-lint.mjs && node tooling/build-checks.mjs'` | command recorded as `'bash' '-c' 'node tooling/token-lint.mjs && node tooling/build-checks.mjs'` — re-runs as written; block carries both verdict lines |
| `record-gate.sh bash -c 'echo "✓ done · ok"'` | JSON valid UTF-8, command and summary intact |
| `record-gate.sh false` | exit 1 — the gate's own code, block says GATE RED |

## Validation results

All observed. `origin/main` did not move: `git fetch` left it at `31a46e8` == base, so the merge was a no-op
and both SHAs are identical.

| Command | Exit | Output |
|---|---|---|
| `node tooling/build-checks.mjs` | 0 | `build ✓ all 34 groups pass` |
| `node tooling/drift-check.mjs` | 0 | `✓ syntax · … · replay` |
| `node tooling/token-lint.mjs` | 0 | `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `node --check` on the three changed `.mjs`, `bash -n` on the script | 0 | silent |
| portal smoke, private port 4837 | 0 | `bootSha` = this worktree's HEAD; `/api/discovery/config` serves `postureFlow` 3 · `facets` 5 · `facetPlans` 33 · `depths` 4 |

`declareFacets`' equivalence is a result, not a claim: old and new driven side by side over 56 inputs —
absent forms, junk (unknown key, non-boolean, string, number, array, function), prototype shapes, own-key
shadowing, partial objects, all four presets and all 32 full vectors — compared on thrown-vs-returned, the
exact refusal text, the value, `FACETS` key order and frozenness. **0 mismatches.** That matters because
`declareFacets` writes `head.facets` into run.json and `resumeMismatch` compares against it.

## Not run

| Step | Why | Tracker |
|---|---|---|
| Visual-regression gate | No shipped page changes. The portal is not in the VR page set (architecture §Boundaries). | none needed |
| Journey drivers, `vt-verify` | No shipped page, studio, /build or proto changes. | none needed |
| A gate over `record-gate.sh` | Nothing in this repo executes a skill script; the three real runs above are the evidence. | none needed |
| #379's presence-vs-cardinality gap | Deliberately stated rather than closed — the issue says a total block count would reintroduce the F1 shape. Recorded in gates.md's Group 29 "cannot reach" clause. | #379, left open |

## Deviations from the plan

No plan. Two deviations from the issues as written:

1. **#379 finding 5, wording** `(issue error)` — the issue asked the comment to say junk and prototype-borne
   keys "cannot reach either function". That is false for `normaliseFacets`: `openSession` and
   `resumeMismatch` hand it raw posted bodies, which is exactly why it throws by name. The comment now makes
   the narrower true claim about `facetKey` alone and says nothing about what reaches the bank.
2. **#373, the guard's condition** — the issue says "when `discovery.session` holds an open run". The landed
   guard is `discovery.session` truthy, i.e. a session exists. `!endedAt` would flip the note back to form
   text under a fieldset that is never re-enabled, which is worse. #373 sanctions this shape ("one writer
   that reads which state the drawer is in").

## Assumptions carried

- **Four issues, one branch.** #379, #367 and #373 all touch `tooling/build-checks.mjs`; separate branches
  would have collided. #368 is independent and rides along.
- **`.claude/last-gate.json` is a test artifact here** — untracked (`git ls-files` empty), deleted after each
  proof run.

## Additions beyond the plan

- **`record-gate.sh` quoting replaced, not patched.** The first fix used `printf '%q '`. Driven, macOS bash
  3.2's `%q` corrupts a multibyte argument — it escapes bytes 2 and 3 of a UTF-8 character and leaves byte 1
  raw, which put an invalid byte in the JSON (`0xe2` at position 150, observed). `LC_ALL=C sed` did not help;
  the corruption is upstream of it. Replaced with POSIX single-quote wrapping and parameter-expansion JSON
  escaping, driven over seven cases including embedded quotes, backslashes and multibyte — all re-run as
  written, all valid JSON.
- **A `"summary"` field in `.claude/last-gate.json`.** The printed block carried the gate's verdict lines but
  the durable record did not, so the JSON held no evidence of what the gate actually said.
- **`GATE_SUMMARY_REGEX`** — the issue's first option, which the first fix skipped in favour of a blind
  `tail -5`. Measured: on this repo's own gate that tail returns 16,817 bytes of `group()` prose and drops
  the `drift-check ✓` and `token-lint ✓` lines the issue named, and SKILL.md tells the author to paste it
  into the PR body. The default pattern now matches a one-word tool name followed by a tick or a cross;
  the blind tail survives as a bounded last resort (one line, 200 chars).
- **The progress line is quoted too** — it printed the same unquoted `$*` the ticket was filed about.

## Issues encountered

- **A workflow design error of mine, worth recording.** The verification lanes ran in parallel, and one of
  them was permitted to mutate files for its red proof. A sibling lane observed `portal.js` changing md5
  three times in 30 seconds and six spurious gate failures, and correctly re-derived every measurement on a
  frozen snapshot rather than reporting them as defects. No bad finding shipped, but a mutating lane must run
  alone. The final red proofs above were run by me, single-threaded, on the finished tree.
- **Four independent lanes converged on the `tail -5` defect.** That agreement is what moved it from a nit to
  a fix; a single reviewer would more likely have let it pass as "the block is no longer empty".
