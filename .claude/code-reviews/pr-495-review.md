# PR #495 review — Run 1's harness (#316, Segment A)

**Head** 8e9354d295d8b7090352447aa8d7cde96b245890 · **Base** main @ `b2017a7360af1c3b2dec37d47028594b4857cd44`
First round (no prior report), so the guarantees pass did not apply. The PR was reviewed in a separate worktree, with a fresh-context code-reviewer agent and a separate numbers pass.

## Verdict

**Approve, with two follow-ups.** There are no Critical or High findings, and every gate I ran is green at the head. The two Medium findings concern what the trace rule actually guarantees. One is a prose overclaim; the other is a gap in what the rule compares. Neither breaks anything that ships, but PR B (the run and its admission) will lean on this gate, so the claim should match the mechanism before then.

## Findings

### F1 (Medium): "only a real SDK run's agent lines can be committed" is stronger than the check
`tooling/build-checks.mjs:12155-12171` (`packageFlaws`), the same sentence in the PR body's Summary, and the report's Summary ("a committed turn must have come from the real SDK").

- **What the check does:** it refuses a stats line whose `transport` is present and not `"sdk"`. That catches the fake transport (`"fake"`) and build-checks' own (`"inline"`).
- **What it lets through:** a stats line with no `transport`. That is the crash shape (`{ok:false, error:…}`), and 36.14's own positive control admits it on turn c2, which carries an agent line.
- **How a forged run passes:** a hand-written agent line passes TR1–TR4 and the turn checks if its transcript is hand-written to match: a `turn` line, an `init` with any `sessionId` string, and a stats line without `transport`. A crashed turn and a forged one are indistinguishable here.
- **Effect:** the rule detects a mismatch between ledger and transcript and refuses the two known non-SDK transports. It does not prove provenance, which is what the report's own assumption A4 already says ("hand-written provenance is not derivable").

**Fix (pick one):**
- Reword the three copies (the comment, the PR body, the report) to say "refuses agent lines from the fake and inline transports; a forged transcript is not detectable".
- Or narrow the crash exemption: accept a missing `transport` only when `ok === false` and `error` is a string, and add a 36.14 mutation for `{ok:true}` with no transport. A forger can still write the crash shape, so the rewording is needed either way.

### F2 (Medium): the trace rule compares where a line came from, not what it says
`portal/lib/canvas-store.mjs:359-382` (`traceFlaws`).

- **What TR1–TR4 compare:** seq, status, the tool→op mapping and whether a refused line exists.
- **The gap:** an agent line's `params` are never compared with the transcript op line's `args`, even though `opLine` records `args` (`portal/lib/canvas-session.mjs:171`) and `fileProposal` builds the params from them.
- **Scenario:** in a real run's `ops.jsonl`, edit an agent `screen.compose`'s `composition` or a `state.add`'s `override`. The ledger still folds and still matches `canvas.json` after regeneration, and `traceFlaws` returns `[]`.
- **Fix:** add TR5 for agent lines that are not refused. For `screen_compose`, `params` deep-equals `{screenId, why, composition, decisionRefs, states}` taken from `args`, with undefined values dropped. For `state_add`, it deep-equals the projection `fileProposal` writes. Add a 36.14 mutation that edits `params`.
- **Can wait:** this can be a follow-up before PR B. It is not a blocker for Segment A.

### F3 (Low): ready checks 3 and 4 accept any stand-in
`tooling/run-316-ready.mjs:69-73`.

- **Check 3:** it is satisfied by `portal/lib/inbox.mjs` merely existing.
- **Check 4:** it is satisfied by any sixth key in `PARAMS["screen.compose"]`, not the #320 alternatives key.

The plan says T10 pins the key's name, so pin it there. Nothing is wrong today, because both checks are meant to be red until #319 and #320 land.

### F4 (Low): the new `ledger()` null-guards in groups 43 and 50 turn a failed seed into an empty ledger
`tooling/build-checks.mjs` (groups 43 and 50; the 50.18 conjunct `!(pl && existsSync(...))`).

- **The risk:** an `every(...)`-shaped assertion, or a "nothing written" assertion, passes over `[]`.
- **Why it is Low:** the agent found no case that passes on a bad seed today, because the neighbouring `length === n+1` assertions fail by name.
- **Fix:** add one `ok(false, …)` at seed time, so a failed seed never degrades silently.

### Raised and dismissed
The agent reported that ready check 11 ignores build-checks' exit status and could pass on a red run. **It cannot.**

- Per-group lines read `build <group>  ✓`, and the summary line on a red run reads `build ✗  N failure(s)`. So `/^build ✓/m` matches only a fully green run's final line.
- A crash before that line also fails the check.

Requiring `r.status === 0` as well would be harmless, but it is not needed.

## Numbers pass

| Figure | Provenance | Status |
|---|---|---|
| build-checks "all 50 groups pass" at 8e9354d | observed (this review re-ran it: exit 0, `build ✓  all 50 groups pass`) | holds |
| token-lint "63 contract tokens, 0 orphan" | observed (re-ran) | holds |
| loc-summary "no drift" | observed (re-ran `--check`: `✓ 3 groups — no drift`) | holds |
| runtime 33,111 lines vs the 33,150 edge | labelled derived in the report, with its arithmetic | correctly labelled |
| preflight 8/8 | observed (re-ran: `preflight ✓ 8/8`) | holds |
| run-316-ready "twelve checks", red on 2–4 only | observed (re-ran): red on 2–4 plus 6; check 6's red was this review's own `node_modules` symlinks in the worktree, not the PR | holds |
| canvas 188/187/187, ratify 52, studio 559/549/549 | claimed as observed at 57b1f7f; **not re-run here** (journeys are operator-run) | not re-verified; the 188 vs 187 gap is explained (chromium-only step, `canvas-journey.mjs:454`) |
| T8: ratify-journey 44 vs the PR body's 52 | different scopes (the chromium leg on the grown copy vs the full `all` run) | consistent |

The guarantee check for "only a real SDK run's agent lines can be committed" is F1.

## Validation

| Gate | Result (observed at 8e9354d, worktree `../wt-review-495`) |
|---|---|
| `node tooling/build-checks.mjs` | ✅ exit 0, `build ✓  all 50 groups pass` (after linking `tooling/icons/node_modules`; the first red was the worktree missing it) |
| `node tooling/drift-check.mjs` | ✅ `drift-check ✓ syntax · … · build-handoff · group-count` |
| `node tooling/token-lint.mjs` | ✅ 63 · 0 · 0 |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ no drift |
| `node portal/lib/canvas-transport.mjs --preflight` | ✅ 8/8 |
| portal smoke, private port | ✅ `/api/health` ok, `bootSha` 8e9354d; the served `canvas.mjs` carries `data-compose-states` |
| `env -u ANTHROPIC_API_KEY node tooling/run-316-ready.mjs` | red on 2, 3 and 4 (expected: #318–#320 not landed) and on 6 (this review's symlinks) |
| canvas, ratify and studio journeys | not run in this review |

## Done well

- `seedSpine` + `SPINE_LENGTH` decouple every fixture and driver from the committed run however long it grows, and the change is applied consistently across groups 36, 43, 46, 47 and 50 and both journeys.
- `null` vs `undefined` for the transcript is a deliberate, documented distinction. A deleted transcript still reds every agent line (36.14), and every `loadBuild` path passes an array or `null`, so no real caller silently skips the rule.
- 35.18, 36.14 and 49.12 pair positive controls with name-matched mutations. The report's mutation table records that the first mutation helper lied (it read stdout only) and how it was fixed before any row counted.
- The canvas-ops refusals hold: declared floor keys, duplicates, a state of a state, and a declared key on a non-declaring base are all refused. `states` survives clone, replay, lanes and `frameTree`.
- The deviations are documented with reasons. The headroom argument for `partProvenance`'s placement is a derived figure, labelled as derived.

## Recommendation

Approve. F1's rewording costs three sentences and should land before PR B treats a green gate as evidence of a real run. F2 can be a follow-up ticket before PR B. F3 and F4 are optional polish.
