# PR #472 review — Jev's top 3 beside the verdict for unnamed import nodes (#455)

**Head** `24099d6` · **Base** main @ `f4f52295c230fc10829ab4f6944185a0b93125d2` · round 1 (no earlier review, so the guarantees pass was skipped)

**Verdict: approve.** There are no Critical or High findings, every gate is green, and the diff does what the ticket asks. One Medium finding (F1) is a latent state bug, worth fixing here or in a follow-up before the matcher learns to name any of the eight nodes. Posted as a comment because GitHub does not let an author approve their own PR.

## Findings

### F1 (medium): an unrelated matcher or vocabulary change can lock an import against all further edits
`portal/lib/import-run.mjs:450`, `import/report.mjs:162`

`editMapping` rebuilds the verdict against whatever vocabulary and matcher are live at the time. `loadInputs()` (`import-run.mjs:224`) reads `handoff/verdant/vocabulary.json` fresh on every call, and nothing pins a version. The same function then passes `prior.suggestions` into `recordFor` unchanged. `buildRecord` returns `checkRecord(...)` (`report.mjs:136`), and `checkSuggestions` throws when a suggestion sits on a node whose `via` is `scored` (`report.mjs:162`).

Failure scenario:
1. Today's import stores a suggestion for the Avatar node, which is `floor`.
2. A later ticket teaches the matcher to score Avatar, the same trajectory as #449, or a new spec moves the vocabulary.
3. After that, **every** edit to that import throws in `recordFor`, whichever node the edit touches, and the route returns the error.
4. The UI has no action that removes a suggestion. The only way out is hand-editing `imports/i<N>.json`.

No data is lost, because the throw comes before any write, but the import cannot be edited through the UI.

Two edits that do not trigger this: `map` sets `via: "mapping"`, which is allowed (46.10 covers it), and `drop` leaves `via` untouched (`applyMapping`, `import-run.mjs:242`).

Traced in the code, not reproduced: forcing a real rescore would need a change to the vocabulary or the matcher.

**Fix:** in `editMapping`, carry forward only the suggestions whose re-derived node is still unnamed. For example, filter `prior.suggestions` against `pipe`'s verdict for `via !== "scored"`, the same way the drop rows are recomputed rather than copied. 46.10 would then assert "carried forward while unnamed, pruned once scored".

### F2 (low, optional): a tie at the third place hides one option
`portal/lib/import-suggest.mjs:109`

On master Frame 2, `avatar` and `stack` both score 0.06. `parseAnswer` breaks ties by vocabulary order, so `avatar` takes third place and `stack`, which has a builder, gets no Use button. The table in the PR matches what is stored, so this is not a numbers defect. It only matters if ties at the cut turn out to be common in the owner's labels (#471).

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 46 groups pass` (observed). The first run went red on group 41 (icons) only because `tooling/icons` had no `npm ci` in the fresh worktree. After installing, it passed. Not caused by the PR. |
| `node tooling/drift-check.mjs` | `✓ syntax · … · group-count` (observed, after the same install) |
| `node agent-layer/gen-loc-summary.mjs --check` | `✓ 3 groups — no drift` (observed) |
| `node tooling/token-lint.mjs` | `✓ 63 contract tokens · 0 undeclared · 0 orphan` (observed) |
| Portal smoke (free port, own PID killed, `UXF_IMPORT_SUGGEST=off`) | `/api/health` → `ok:true`, `bootSha` = `headSha` = `24099d6` (observed) |
| CI (`gh pr checks 472`) | CodeQL, audit, codeql, gates-green, verify, visual: all pass (observed) |
| 46.3 mutation (`style: n.style` added after the allowlist) | 21 failures, each 46.3 line naming the key and the colour it leaks. File restored and the tree left clean (observed). |
| 46.9 skip-on-failed-replay | Cannot pass silently: when the replay fails, `recB` is falsy and 46.8's `else ok(false, …)` reds the group (read). |

The review ran in a temporary worktree (`../wt-pr472`), not through `gh pr checkout`, because parallel sessions share the primary tree. The canvas journey was not re-run. The report says it passed at `24099d6` on three engines.

## Numbers pass

- **Top-3 table (8 rows):** each row was recomputed from `spike-c-run.json` through the real `parseAnswer`, and all 8 match (observed). Frame 2's third place is a real tie (F2).
- **Input tokens:** 7,092–7,149 per request, 271–422 ms, 14,232 for the instance (7,092 + 7,140) and 42,759 for master (sum of six). All reconcile with the run file.
- **Spend line:** 78,315 tokens = 7,092 + 56,991 + 14,232. It is labelled derived, and its price is labelled unverified.
- **Smoke (7,092 tokens, 454 ms):** there is no committed artifact for it. 7,092 equals n0's token count for the same input in the committed run, which is consistent with the claim.
- **38,875:** traced to `portal/lib/discovery-screen.mjs:88`'s calibration line. It is correctly called the largest request *observed* accepted, not a limit.
- **Estimate "≈2.4× high":** 16.8k ÷ 7.09k = 2.37 (derived).
- **`labels.json`:** `by` is null and all 8 labels are null, so no owner verdict was written by an agent.

## What is good

- **`suggest()` cannot throw.** One try/catch covers every await. `Promise.all` attaches handlers to every promise in a wave, so a failure in one request cannot leave another as an unhandled rejection (the reviewer agent reproduced this).
- **What leaves the machine is an allowlist.** `TEMPLATE.stateKeys` names the only seven fields sent, and 46.3 enforces it by key and by an id/colour pattern. Q1 records the owner's choice of both provenances, listing exactly which fields go.
- **Nothing old changes.** `suggestions` is optional and outside `REQUIRED_KEYS`, and the markdown section appears only when the key exists, so both committed fixture records stay byte-identical (42.6, 46.9).
- **No new XSS path.** No `innerHTML` in `canvas-import.mjs`. The Use button goes through the existing mapping-edit route.
- **Group 46's checks can fail.** It has positive controls before each negative, replays the committed responses verbatim, and runs a `git status` guard across the group. Its mutation table shows each section can go red, and I re-ran 46.3 myself.
- **The honesty contract holds.** The run file is generated by `--run`, which refuses to write on any bad response. The owner's half is left open and tracked in #471.

## Recommendation

Approve. Fix F1 in this PR if a small follow-up commit is acceptable. Otherwise open a ticket before any matcher or vocabulary change that could score one of the eight nodes. F2 needs no action.
