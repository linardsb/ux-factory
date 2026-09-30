# PR #491 review — variants as lanes, the per-lane check and the build package's handoff pack (#314)

**Head** `41fbdbdc1d41d395dfd337bc7ea283e487b2de35` · **Base** main @ `a0c03f0f8973efc942cd8e67e0b30592ca55c7a5` · first round (no prior report, so the guarantees pass does not apply)

**Recommendation: approve.** No critical or high issues. Two medium findings (F1, F2) are small validator and escaping holes that are worth fixing in this PR or in #490; neither blocks merge.

## Findings

### Medium

**F1 — a multi-line label breaks `flow.md`'s prose.** `agent-layer/gen-build-handoff.mjs:70`
`edgePhrase(e)` (the "tapping <label>" phrase, built in `system/canvas-ops.mjs`) is interpolated raw, while `e.trigger` on the same line goes through `one()` (whitespace collapse). A `screen.set` label of `"Go\n\n# Injected heading\n```\n"` is accepted by the applier, and `renderPack` then emits a bare `# Injected heading` line and a lone ` ``` ` line. The lone fence opens a code block that swallows the rest of `flow.md`, including later lanes (observed, scratch repro against the two-lane fixture). The Mermaid block is not affected: `mm()` strips the newlines there.
Fix: wrap `edgePhrase(e)` in `one()` at line 70. `frameLabel`'s output needs the same wrap. It returns `screenId` unchanged, and `screen.compose` accepts `screenId: "a\n# x"` (observed: stored, and `frameLabel` returns it with the newline).

**F2 — `variant.add` checks an override's keys but not their value types.** `system/canvas-ops.mjs:434-445`
`{set: "ab"}`, `{hide: 5}`, `{set: {continue: "x"}}` and `{add: null}` are all accepted and stored (observed). The lane reads ignore them, so a malformed override becomes a lane that changes nothing, with no refusal. That goes against the repo rule of refusing at the boundary and naming the path. `gen-build-handoff.mjs:53-55` (`differences()`) then runs `Object.entries` on the string and writes `- f1 · set 0.0 → "a"` into `flow.md`.
Fix: in the same loop, refuse a `set` that is not a plain object of plain objects, a `hide` that is not an array of strings, and a non-plain-object `add`. Add one refusal per shape to 35.15.

### Low

**F3 — `writeBuildHandoff` deletes `imports/` before it renders.** `agent-layer/gen-build-handoff.mjs:216-218`
If `renderPack` throws (a ledger that no longer folds, or a corrupt import record), the old `flow.md` stays and `imports/*.md` is gone, so the pack is left half old and half empty. Fix: `const rendered = renderPack(pkg)` first, then `rmSync`, then write. Related: `readBuildPackage` at line 198 calls `JSON.parse` on an import record without naming the file in the error. Wrap it and name `${id}.json`.

**F4 — a failed `withPack` leaves a stale pack that nothing else reports.** `portal/server.mjs`, `withPack`
The write landing before the pack is the documented design. The gap is that a `packError` shows up only in that one response body. `verifyBuild` does not compare the pack, and the drift leg sees committed packages only. Suggest also logging `packError` on the server.

## Validation

All runs are observed, in a separate worktree at the PR head. That worktree needed `npm ci` in `tooling/icons`, `tooling/style-dictionary` and `portal/` first. The first build-checks run went red on group `icons` only because `tooling/icons/node_modules` was missing. That was the worktree's environment, not the PR.

| Gate | Result |
|------|--------|
| `node tooling/build-checks.mjs` | `build ✓  all 49 groups pass` |
| `node tooling/drift-check.mjs` | ✓ all 15 legs, `build-handoff` included |
| `node agent-layer/gen-build-handoff.mjs --check` | `2 packages, 8 files — no drift` |
| `node tooling/token-lint.mjs` | `63 contract tokens · 0 undeclared · 0 orphan` |
| Portal smoke (private port, own PID killed) | `/api/health` ok, bootSha = head; `POST /api/canvas/pack` cross-origin → 403; slug `../../etc` refused by name |
| CI on the PR | CodeQL, audit, codeql, verify, visual and gates-green all pass |
| `canvas-journey all` | not re-run; the author's 173/172/172 comes from `1dbc078` |
| Discard lane | not exercised by any run. The PR body says so, and it is the one lane control with no coverage. |

## Numbers pass

Every figure in the PR body and the report names its run. I re-observed 49 groups, 2 packages and 8 files, and 63 tokens. The one arithmetic figure, `69 = 23 × 3`, is labelled derived. The journey counts and the mutation table are the author's observations and were not re-run. Each mutation row names its red output and a positive control, which is the right shape for a check that can fail. The explanation for I12 (Playwright box rounding) comes with a base-tree control run (firefox 149/0), so it is a checked cause, not a guess.

## Done well

- **One code path for lanes.** `missingStates`, `frameTree`, `flowEdges` and `stateDiagram` all resolve through `laneDoc`, so the canvas page, the gates and the generator cannot disagree about what a lane contains.
- **Pure generator, thin I/O.** `renderPack` has no clock and sorted listings (determinism re-observed), and `--check` counts orphan files as drift.
- **Frozen-spine fix.** The plan error (49.4–49.7 would have gone red on a legitimate owner edit) was found, proven with a before-and-after control and documented.
- **Validator edges.** Prototype keys, unknown keys, `omit: false` and `omit` combined with other keys are all refused, and import ids come from `readdirSync`, so they cannot carry path separators.
- **No HTML sinks.** The `canvas.mjs` diff adds no `innerHTML`, `insertAdjacentHTML` or `outerHTML`, so labels and lane keys reach the page as text (observed by grep).
- **Docs stay consistent.** `CLAUDE.md` and `gates.md` both say 49 groups, with no stale 48 left (observed by grep).
