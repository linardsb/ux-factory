# PR #485 review: the compose loop (#312)

**Head** `ea5b73dd68e8720e41aaaa2c31e14215023ed40e` · **Base** main @ `171af6cc66e1405ffc4c28fa39e41b1a32af8e7c` · round 1 · 2026-09-29

## Summary

The core invariants hold under a fresh read and under mutation:

- the fence is one predicate at two sites and fails closed;
- only one proposal can be open at a time;
- `fromStep` is checked both when a verdict is written and at the gate.

There are **no Critical and no High findings**. There are four Medium findings:

- one is an auth claim that the code only partly enforces;
- one is a gate that a model can redden with no way to repair the package;
- one is a set of group-47 checks that stay green when their source is broken;
- one is a multi-tab edge case.

**Verdict: changes requested (Medium).** F1–F3 should land before merge; each is small. F4–F9 can be follow-ups.

## Validation

All results were run in a clean worktree at the head.

| Gate | Result |
|---|---|
| `node tooling/drift-check.mjs` | ✅ exit 0 (observed) |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens, 0 orphan (observed) |
| `node tooling/build-checks.mjs` (portal deps present) | ✅ all 47 groups (observed) |
| `node tooling/build-checks.mjs` (`portal/node_modules` moved aside, CI's condition) | ✅ all 47 groups (observed) |
| `node tooling/canvas-journey.mjs chromium` | ✅ 148 passed, 0 failed (observed). The first run went 145/3, all three I12 (#474): `tooling/visual-regression` was not installed in the fresh worktree. After `npm ci` it went 148/0. |
| firefox · webkit journey | not re-run; the PR reports them as 147/0 from before the cwd-guard change |
| `--live-compose` · `--preflight` | not run (paid or SDK); the receipt was checked instead (see below) |

## Numbers pass

- **$0.4810**, derived and correct: 0.2201554 + 0.15382075 + 0.0160605 + 0.09098345 = 0.4810201. Those are the four `stats` lines in `raw/live-1/transcript.jsonl`, and the PR body says they are read back from the receipt.
- **6 passed, 0 failed**, observed. It matches `raw/live-1/stdout.txt`.
- **47/47 and chromium 148/0**: re-observed at this head.
- **The firefox and webkit 147/0** predate the fake's cwd-guard tightening. The PR and the report both disclose this.
- **The receipt is internally consistent**:
  - every verdict (seq 8, 10 and 12) restates its proposal (7, 9 and 11) with the matching `fromStep`;
  - the run has one `sessionId`;
  - the timestamps are in order.
- **The L1 re-ask loop** (`canvas-journey.mjs:1424`, up to three fresh turns) is planned (plan line 971) and budget-capped. It is not a finding.

## Findings

### Medium

**F1: "auth is the subscription" is enforced only for `ANTHROPIC_API_KEY`** (`portal/lib/canvas-session.mjs:88-91`)
- `subscriptionEnv()` removes `ANTHROPIC_API_KEY` from the environment the CLI child receives.
- It passes these through:
  - `ANTHROPIC_AUTH_TOKEN`;
  - `ANTHROPIC_BASE_URL`;
  - `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX` and `CLAUDE_CODE_USE_FOUNDRY`, with their credentials.
- With any of those exported, compose turns bill that account. The transport header, the PR body and the receipt README would all still say "subscription".
- Fix: strip every `ANTHROPIC_*` variable and `CLAUDE_CODE_USE_*`, or use an allow-list. Extend group 47's `subscriptionEnv` check to cover the added names.

**F2: a model can leave a package that fails its own gate** (`portal/lib/canvas-store.mjs:238`, `canvas-session.mjs:272`)
- `appendAgentLine` writes a `refused` line's `params` verbatim, with no shape check.
- `verifyBuild` reddens any line whose JSON has an `"x":` or `"y":` key.
- Reproduced through the handler (observed). In a scratch package, `fileProposal(…, "screen_compose", {composition: {name: "avatar", props: {x: 1}}})` is refused by the vocabulary check (`"x" is not a prop of avatar`). It still writes ledger seq 1 with `params.composition.props.x`, and `verifyBuild` on that ledger returns `carries an x or a y — positions live in canvas.json alone`.
- A `state.add` override naming a part `x` takes the same path through the `dangling` applier refusal. Established by reading, not run.
- The model can trigger this by proposing a prop named `x`. The vocabulary check refuses the proposal, but the refused line is still written with that prop.
- The ledger is append-only, and the honesty contract forbids editing it, so the only recovery is to discard the run.
- Fix, either of:
  - drop `params` from agent `refused` ledger lines (the transcript already keeps the args);
  - exempt `source:"agent", status:"refused"` lines from the x/y check.

  Add a group-47 case either way.

**F3: six group-47 checks stay green when their source is broken.**
- Re-run by me (observed, `build ✓ all 47 groups pass` with each mutation applied, then reverted):
  - deleting the compose route's `if (conflict) return 409` (`portal/server.mjs:473`). 47.14 pins the `saveConflict(` call as source text, so it cannot detect that the 409 response has been removed. The journey's "409 stale" check covers `/api/canvas/save`, not compose.
  - removing `|| l.fromStep > i` from `verifyBuild` (`canvas-store.mjs:244`), the forward-reference check.
- From the review subagent's mutation run, not re-run by me:
  - `verifyBuild`'s duplicate-verdict check;
  - the state tree's `validateComposition` call (`canvas-session.mjs:320`);
  - the "not missing that state" guard (`:428`);
  - the fake's cwd guard.
- Dropped: the subagent also reported `checkVerdict`'s `p.source !== "agent"` clause. It is an equivalent mutant (a change no input can reveal): `saveRun` refuses an owner `proposed` line, and `appendAgentLine` always writes `source:"agent"`. No stored line can reach that clause, so it is redundant defence, not a gate gap.
- These are the repo's recurring "check that cannot fail". The report's REDDENS table covers the other checks.
- Fix: one negative fixture per clause. For the route, run the function or boot the route rather than grep the source.

**F4: the page adopts a turn's `count` without checking what arrived** (`portal/public/canvas.mjs:624`)
- The compose request's `base` is checked when the turn starts. A save from a second tab during the turn is still accepted, because only this tab's `composing` flag holds saves.
- `count = body.count` then includes the other tab's line. This tab's next save passes the base check over a ledger it never displayed.
- Local-only and a narrow window, so this could be Low. It was established by reading, not by running.
- Fix: return the turn's starting base with the response, and reload when `count - base` is not the number of agent lines just added.

### Low

**F5: a dead session id leaves compose stuck** (`canvas-session.mjs:181`, `:432`)
- `resume` is always the last `init` session id.
- If that SDK session is gone, every later turn fails, and nothing in the append-only transcript resets it.
- Fix: on a resume failure, retry once without `resume`, or add a `session-reset` line that the session lookup honours.
- Established by reading only.

**F6: the fake's guard trips after the owner lines are on disk** (`canvas-session.mjs:434-435`)
- The `turn` and owner-brief lines are written before the transport loads.
- So a tripped guard still leaves a `failed` turn in a committed package.
- The fake's header says its lines "only ever land in a scratch package", which holds only for agent lines.
- Fix: load the transport before the first append.

**F7: `UXF_COMPOSE_TRANSPORT` is an unguarded dynamic import** (`canvas-session.mjs:408`)
- Only the launcher's environment can set it, so it grants nothing new.
- It still loads any path it names in the operator portal.
- Fix: log its use at boot, or refuse it outside the journey.

**F8: a `saveConflict` inside the lock returns a 500**
- `composeRefusal` maps only busy, open-proposal and no-prd to 409.
- Any other conflict returns a 500, which the page shows as "The turn failed", not "Reload to continue".

**F9: the receipt's verdict lines say `source:"owner"`, but they are the script's clicks** (`raw/live-1/ops.jsonl` seq 8, 10 and 12)
- The README discloses this in its "What is whose" table, so it is not hidden.
- Under the rule that no one writes the owner's half, the ledger itself still attributes them to the owner.
- Consider a README line at the top as well as in the table, or a later `source` value for scripted verdicts. Owner's call.
- A new `source` value needs a schema change: `verifyBuild` accepts only `owner` or `agent`.

## What is done well

- The fence is one `decide()` around `composeFenceDecision` at both `canUseTool` and `PreToolUse`. A throw becomes a denial, and both sites are proven by mutation.
- Verdicts are checked twice, at write time (`checkVerdict`) and at the gate (`verifyBuild`). Stale, refused, doubled or non-restating verdicts are rejected at both.
- The outcome is folded from the ledger and transcript lines, never from the model's words. `subtype:"success"` with `is_error:true` is classed as `failed`.
- The SDK import is lazy, inside the lock, and one file. CI imports the session module with no `portal/node_modules`.
- The route sits behind `originAllowed`. The slug passes `assertRunSlug` (`[a-z0-9-]`), and body fields are named individually.
- The busy lock is taken synchronously and released in `finally` on every path.
- The prompt fingerprints are pinned to the probe run, and the vocabulary context is generated rather than hand-written.
- The receipt is honest: its "What is whose" table and the REPORTED-not-asserted owner reads for #316.

## Recommendation

**Changes requested (Medium): F1–F3 before merge.** Each is a small, local change plus one fixture:

- F1 is a stated guarantee the code does not fully hold;
- F2 can leave a real run unrecoverable;
- F3 is gate coverage.

F4–F9 can be follow-ups.

Posted as a comment (a solo repo cannot self-approve). A human makes the merge call.
