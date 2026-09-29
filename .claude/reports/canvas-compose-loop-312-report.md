# Implementation Report — the compose loop (#312)

**Plan**: `.claude/plans/canvas-compose-loop-312.md`   **Branch**: `feature/canvas-compose-loop-312` (worktree
`../wt-312`, cut from `origin/main`)   **Base**: `171af6c` → `171af6c` at report (`git fetch` at report time: `origin/main`
had not moved, so no merge was needed and every gate below ran on the current base)   **Status**: COMPLETE (uncommitted; next `piv-commit`)

## Summary

The build canvas now runs one agent turn inside the owner's loop:

- **The turn.** The owner writes an optional brief and presses "Ask for a screen". A real Agent SDK turn (lazy-imported
  `portal/lib/canvas-transport.mjs`) files exactly one vocabulary-validated `screen.compose`, which is recorded as a
  `proposed` agent line. Then the agent yields.
- **The owner's verdict.** Accept is the owner's op on the page's one undo stack (`accepted` + `fromStep`), and Cmd+Z
  takes it back with an `undone` line. Refuse is a `refused` line.
- **Missing states.** Each missing state on a base frame's caption is a button, and it asks for exactly that state
  (`state.add`).
- **The record.** Every turn writes `build/transcript.jsonl`: turn, owner brief, init, op, agent text, denials,
  refusals, and a stats line carrying `maxTurns`.
- **The proof.** Build-checks group 47, the journey's compose pass over a scripted fake agent, and one paid
  `--live-compose` leg ($0.4810, receipt committed).

## Tasks completed

- 1.1–1.3 → `portal/lib/canvas-store.mjs` (UPDATE): `openProposals`, `appendAgentLine`; `saveRun` takes verdicts
  (`checkVerdict`); `verifyBuild` checks `fromStep` lines and refuses an `accepted` line with none.
- 2.1–2.5 → `portal/lib/canvas-session.mjs` (CREATE). It holds:
  - the eight prompt strings, copied mechanically from `probe.txt:36-43`;
  - `vocabContext` (verbatim), the transcript constructors and the fence (`composeFenceDecision` + `composeFence`);
  - the handler core `fileProposal`, plus `classifyComposeTurn`, `composeView`, `checkComposeRequest`,
    `composeRefusal` and `runComposeTurn` (under `withRunLock(…, "a compose turn")`);
  - `subscriptionEnv`.
- 2.6 → `tooling/fake-compose-agent.mjs` (CREATE).
- 3.1 → `portal/lib/canvas-transport.mjs` (CREATE): `buildComposeServer`, `composeQuery`, and `--preflight` (8 rows).
- 4.1 → `portal/server.mjs` (UPDATE): `POST /api/canvas/compose`, and `compose: composeView(root)` on the run route.
- 4.2 → `portal/public/canvas.html` and `portal/public/portal.css` (UPDATE): the compose panel, with token-only CSS.
- 4.3 → `portal/public/canvas.mjs` (UPDATE). It gains:
  - header call 6;
  - the panel and card;
  - Accept and Refuse through the bus (`ui.proposal-accept` / `ui.proposal-refuse`);
  - one missing-state button per missing key;
  - `askTurn` + `flushSettled`, and a `composing` save hold;
  - `describeOp` cases for `screen.compose` / `state.add`.
- 5.1 → `tooling/build-checks.mjs` (UPDATE): group 47 (47.1–47.16), and `all 47 groups pass`.
- 5.2 → `tooling/canvas-journey.mjs` (UPDATE): `fp-compose` seed, `composePass` C1–C12, header and tally.
- 6.1 → `discovery/README.md` (`build/transcript.jsonl` subsection, the `fromStep` verdict rule, `appendAgentLine`),
  `CLAUDE.md` (three map lines, the store line, 46 → 47 twice) and `.claude/references/gates.md` (Group 47 entry, the
  compose-pass clause, the heading 46 → 47).
- 6.2 → `tooling/canvas-journey.mjs` `--live-compose` (UPDATE), then RUN once. Receipt:
  `.claude/plans/canvas-compose-loop-312/raw/live-1/` (`ops.jsonl`, `transcript.jsonl`, `stdout.txt`).
- Plan (UPDATE): AMENDMENTS 2026-09-29, the implementation pre-flight's plan errors.

## Tests added

**`tooling/build-checks.mjs` group 47 "compose session".** 47.1–47.16 as the plan lists them, plus 47.2b. Every case
runs the function, and 47.14 is the one source pin.

- Result: `node tooling/build-checks.mjs` → `build compose session ✓` · `build ✓  all 47 groups pass` (observed).

**`tooling/canvas-journey.mjs` compose pass C1–C12**, on a side portal with `UXF_COMPOSE_TRANSPORT` pointing at the
fake. Final run:

| Engine | Result | Run |
|---|---|---|
| chromium | 148 passed, 0 failed | the dedicated rerun |
| firefox | 147 passed, 0 failed | the three-engine run |
| webkit | 147 passed, 0 failed | the three-engine run |

All observed. See Issues for why chromium has its own run.

**`--live-compose` (paid):** 6 passed, 0 failed (observed).

## Proving the checks

Every mutation was applied by `scratchpad/mutate.mjs` to one file, the gate was run, and the file was restored from
its original bytes. The restore was sha256-compared, and all restores matched.

| Case | Mutation | Red message (observed) | Positive control |
|---|---|---|---|
| 47.1 | `import "zod";` added to the session, run with `portal/node_modules` MOVED ASIDE (CI's condition) | `47.1: portal/lib/canvas-session.mjs did not import (Cannot find package 'zod' …)`, plus the specifier-set and "names the SDK or zod" cases | 47/47 green with the directory absent |
| 47.5 | `composeFenceDecision` allows `"Bash"` | `47.5: Bash allowed — a compose turn has no write, web or other MCP tool` | the own tool allowed |
| 47.7 | `maxTurns` dropped from the stats line | `47.7: the stats line is {…} — maxTurns 4, the fingerprint, transport fake and outcome proposed` | the unmutated turn's stats line |
| 47.2 (+2b) | one character of `LOOP` (`calling` → `callin`) | `47.2: the four S6 constants no longer reproduce S6's fingerprint c903170484396973 (got 0012d9578a696b34)` and 47.2b `…40b0c1e21409e5db, not probe run 4's 9690d4c955be652c` | the unmutated module reproduces both fingerprints |
| 47.2b | one word appended to `STATE_TOOL_DESCRIPTION` | `47.2b: the prompt surface's fingerprint is 0e64e0afa2f2e2f2, not probe run 4's 9690d4c955be652c` | same |
| 47.3 | `vocabContext` skips the first entry | `47.3: the context carries 25 component blocks for 26 vocabulary entries, or misses one` | a synthetic `zz-probe` appears in the system prompt; a removed entry disappears |
| 47.4 | the old regex `/^[^\w\n]*NOT COVERED:/m` | `47.4: ESCAPE_RE misjudges a marker after numbering or markup…` | the old regex asserted to MISS `1. NOT COVERED:` |
| 47.6 | `Write` dropped from `RECORDED_BUILTINS` | `Write was denied at PreToolUse but wrote no denied line — AC #2 watches the line (47.6: got [])` | a warmup `Glob` is denied with NO line |
| 47.8 | the open-proposal guard in `runComposeTurn` off | `a second turn ran while seq 7 was open (47.8: no refusal)` | the first turn files |
| 47.9 | `ctx.calls.length > 1` off | `47.9: a second call in one turn gave 1 ops lines and refusals [{…"kind":"applier"…}]` | one proposed line + one `one-per-turn` refusal |
| 47.10 | the child ids walk off | `47.10: an id-less child gave 1 ops lines (last …) and refusal undefined — want … a ids refusal` | — |
| 47.10 | root id required again | `47.10: the root-only id-less composition was refused — the root is exempt from the id rule` (and 18 more, since the fake's fixture has an id-less root) | the root-only composition files |
| 47.11 | `proposed` classified by agent words (`/propos/`) | `47.11: a refused call followed by "I've proposed the payee-form screen" classified proposed…` | the escape, empty-yield and failed shapes |
| 47.12 | the double-verdict check in `checkVerdict` off (Task 1.2) | `47.12: a second verdict on seq 7 was accepted (no refusal)` | the AC #1 ledger ends with `verifyBuild` `[]` and f3 out of the fold |
| 47.12 | the open guard in `appendAgentLine` off (Task 1.1) | `appended a second proposal while seq 9 was open (47.12: no refusal)` | same |
| 47.12 | `verifyBuild`'s "fromStep names a non-proposal" check off (Task 1.3) | `47.12: verifyBuild passed a hand-mutated ledger (…)` | same |
| 47.13 | `withDiscoveryRunLock` in place of `builder.mjs`'s lock | `47.13: an import during a compose turn answered NO REFUSAL` and `…a compose turn during an import answered NO REFUSAL` | both first calls complete (`empty-yield`; import `i1`) |
| 47.14 | `strictMcpConfig: true` deleted | `47.14: the transport's query( block lacks ["strictMcpConfig: true"]…` | the unmutated block passes |
| 47.14 | `env: subscriptionEnv()` deleted | `47.14: the transport's query( block lacks ["env: subscriptionEnv()"]…` | same |
| 47.16 | `subscriptionEnv` returns `{ ...process.env }` | `47.16: subscriptionEnv answered the keys [… "ANTHROPIC_API_KEY" …]` | the synthetic env's output is exactly `{CLAUDE_CODE_OAUTH_TOKEN, PATH}` |
| Preflight PF2/PF3/PF7 | `composition: z.looseObject` → `z.object` | `PF2 ✗ … arrives deep-equal: undefined` · `PF3 ✗ … refused: composition.props.direction: required prop of stack is missing` · `PF7 ✗ …` · `preflight ✗ 3/8` | `preflight ✓ 8/8` restored |
| C7 (journey) | `commit: false` on the accept's `applyOwnerOp` | `✗ C7 · an undone line restating C2's op` · `✗ C7 · f3 is gone from the stage and the disk fold  undo did not remove f3` | `C7 · C2's proposed line is byte-identical on disk` stays green |

**The driver was proved first.** The journey's compose assertions went red on a known-bad page (the C7 row). The
mutation runner's restore was hash-checked on every row.

**The whole mutation set was run twice.** The second time was with `portal/node_modules` moved aside (`mv`, then back),
which is CI's condition. Every row went red in both runs (observed).

**Not mutated:**

- **47.15** (the git-status tripwire). It has no clean single-line mutation, and groups 43 and 46 carry the same case.
- **PF0** (the private API gone). The SDK was not patched to prove it.

## Validation results

| Command | Result |
|---|---|
| `node --check` on each changed/new `.mjs` (8 files) | each `ok` (observed) |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed) |
| `node tooling/build-checks.mjs` | `build ✓  all 47 groups pass` (observed; 46 at base, observed) |
| `node tooling/build-checks.mjs` with `portal/node_modules` moved aside (CI's condition), then restored | `build compose session ✓` · `all 47 groups pass` (observed) |
| `node tooling/drift-check.mjs` | `drift-check ✓ syntax · … · group-count` (observed, after `npm ci` in `tooling/icons` and `tooling/style-dictionary`) |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` (observed). It reads tracked files only (memory `loc-summary-counts-tracked-only`); no counted group (`system/`, the root + `proto/` pages, `agent-layer/`) was touched. |
| `cd portal && node lib/canvas-transport.mjs --preflight` | `preflight ✓ 8/8`, sdk 0.1.77, node v20.20.2 (observed) |
| Portal smoke (Task 4.1), private port, killed by PID | `/api/health` `{"ok":true…`; `compose` = `{"open":null,"last":null,"turns":0}`; a bad `ask` → 400; a stale `base` → 409; `git status discovery/` empty (observed) |
| `node tooling/canvas-journey.mjs all` (baseline at `171af6c`, before changes) | chromium 126, firefox 125, webkit 125, 0 failed (observed) |
| `node tooling/canvas-journey.mjs all` (final code) | chromium 146/2*, firefox 147/0, webkit 147/0 (observed) |
| `node tooling/canvas-journey.mjs chromium` (rerun, stable tree) | 148 passed, 0 failed (observed) |
| `node tooling/canvas-journey.mjs chromium` (after tightening the fake's cwd guard) | 148 passed, 0 failed (observed). Firefox's and webkit's 147/0 were measured BEFORE that one-function change, which touches only the fake's cwd check; they were not re-run after it. |
| `node tooling/canvas-journey.mjs chromium --live-compose` (PAID, owner-approved in chat) | 6 passed, 0 failed; $0.4810 (derived: the sum of the four stats lines' `costUsd`, 0.2202 + 0.1538 + 0.0161 + 0.0910) |
| `git diff --stat origin/main -- system/ handoff/` | empty (observed) |

\* The two chromium reds were `I6 …` and `the leg changed nothing under discovery/`, and both read
`M discovery/README.md`. That was my Task 6.1 edit landing while the leg ran, not a code regression; the stable-tree
rerun is 148/0.

**What the paid leg observed.** These are REPORTED, not asserted, and are the operator's receipt, not the owner's
judgement:

| Turn | Outcome | Cost | Detail |
|---|---|---|---|
| L1 (`c1`) | proposed on the first attempt | $0.2202 | `screenId: add-payee-error`, `decisionRefs: ["7","23"]`, why: *"…so the mismatch has to surface as inline field-level text on the same form, not a modal interruption."* It speaks to the brief's "no dialog, error state inline" but does not quote it. |
| L2 (`c2`) | proposed `state.add` error of f3 | $0.1538 | its why is on the transcript op line |
| L3 (`c3`) | escape, no call | $0.0161 | `NOT COVERED: no map/geolocation component …` |
| L4 (`c4`) | proposed `scam-warning` | $0.0910 | `decisionRefs: ["7","30"]` |

- One session id across the four turns. Each init advertised exactly its turn's one tool.
- `numTurns` was 2, 2, 1 and 2, and `maxTurns` was 4 on every stats line.
- Every Accept and Refuse click was the script's.
- The receipt's `ops.jsonl` holds the six spine lines plus `proposed/agent, accepted/owner, proposed/agent,
  refused/owner, proposed/agent, refused/owner`.
- A grep for `sk-ant|ANTHROPIC_API_KEY|OAUTH_TOKEN` over the receipt found nothing (exit 1).

## Not run

- **Your read of L1's `why` against the brief, and of L3's outcome.** This is your judgement, not a gate. The receipt
  is committed for it. Tracker: #316.
- **Ratify's leg of AC #5.** #313 is unbuilt; 47.13 pins that compose uses `builder.mjs`'s lock. Tracker: #313.
- **Level 4 manual check in a real browser** (open `canvas.html?provenance=fictional&slug=faster-payment`: zero saves
  on load, the panel shows, f1 carries `empty · partial · loading: missing`). It was not done by hand. The journey
  covers the same ground on a copy: step 2's zero-saves on the in-repo spine, and C1 and C3's panel and missing
  buttons. Tracker: your call.
- **CodeQL.** It runs on the PR only.

## Deviations from the plan

- **`subscriptionEnv` lives in `canvas-session.mjs`, not the transport (plan error).** The transport imports the SDK
  statically, so 47.16 could not import it in CI. The transport imports it from the session. Logged in AMENDMENTS.
- **One dynamic `import()` whose argument picks the env seam or `./canvas-transport.mjs` (plan error).** 47.1 asserts
  exactly one dynamic import whose text names the transport. Logged in AMENDMENTS.
- **Each preflight row gets a fresh package copy and a fresh handler context, over an exported `buildComposeServer`
  (plan error).** With shared state, PF5 and PF7 would have been refused by the one-call and open-proposal rules.
  Logged in AMENDMENTS.
- **`no-prd` is checked inside `runComposeTurn`, not by `checkComposeRequest` (plan error: that function takes no
  `pkgRoot`).** An exported `composeRefusal(message)` maps busy / open-proposal / no-prd for the route. Logged in
  AMENDMENTS.
- **The compose panel is the rail's SECOND child, after the import panel, not its first (Task 4.2 said first).** As
  the first child it pushed the import panel to a fractional y, and firefox then measured I10's `[data-import-action]`
  at `228×43.999969` against the 44 px minimum. That reproduced on two runs (observed). After the move, firefox is
  147/0.
- **`fileProposal`'s catch-all records `kind: "applier"`.** The plan's kinds list has no slot for "the store refused
  unexpectedly" (the probe used `bug`). The store is the layer that said no, so it is named `applier`. Stated in the
  code.
- **47.12's `saveRun` passes a `d7` position beside `f3`.** An accepted compose's `decisionRefs` derive a card, and
  `arrangement` refuses a node with no position. Logged in AMENDMENTS.

## Assumptions carried

- **The brief.** A blank textarea is sent as `null`, so an un-briefed turn is not a 400. The brief is stored
  verbatim, and only its trimmed length is judged.
- **`OPS_FILE`.** The plan listed it among the session's imports; it is not imported, because nothing uses it.
- **A state ask** for a key `missingStates` does not list is a plain thrown error (a 500 through the catch-all), not a
  `refused` datum. Only the three refusals the plan names are data.
- **`classifyComposeTurn(lines, stats)` puts `failed` first**, so a turn that proposed and then errored reads
  `failed` while its proposal is still shown as open.
- **Q6 is left alone:** "never a retry" is kept.

## Additions beyond the plan

- **`describeOp` sentences** for `screen.compose` and `state.add`, so Cmd+Z says "Undone: composed choose-amount."
  rather than the op name.
- **`composeRefusal`, exported**, so the route and 47.8 and 47.13 share one mapping.
- **47.16's message prints env KEY NAMES only.** Its first REDDENS run printed the whole process env, the real
  `ANTHROPIC_API_KEY` value included, into that tool result. So the value is in this session's conversation
  transcript (on disk, and sent with the conversation) and it was in my scratch log. The scratch log was redacted at
  once (grep count 0), and the message now prints key names only. The key never reached a tracked file (a grep of
  every changed and new path found no `sk-ant`). **Rotating the key is your call.**
- **The fake's cwd guard is tightened** from "not in the repo" to "under the OS temp directory, and not in the
  repo". With `UXF_COMPOSE_TRANSPORT` left exported in a shell, the plan's repo-only guard would have let a real
  jobs-folder package pass, which the fake's header said could not happen. Checked on an in-repo cwd and a
  jobs-folder cwd: both refused (observed).
- **`.claude/plans/canvas-compose-loop-312/README.md`**, following the S6 and probe directories' precedent. It says,
  in the receipt's own directory, that the `source: "owner"` verdicts after seq 6 are the script's clicks, not your
  judgement.
- **Group 47's failure messages wrap `deep(...)` in `String(...)` before `.slice`.** A mutation hit
  `deep(undefined).slice` and crashed the run instead of reporting.

## Issues encountered

- **The first chromium leg of the final three-engine run** was red on `discovery/README.md`. I edited it mid-run; the
  stable-tree rerun is 148/0.
- **Firefox raised one NetworkError page error once** (run 2 after the page change). It did not reproduce on the next
  two firefox runs.
- **This checkout is shared.** The primary tree is on `fix/importer-reads-icon-name-449` with others' files dirty, so
  all work is in worktree `../wt-312`, off `origin/main`. `npm ci` ran there in `portal/`, `tooling/icons`,
  `tooling/visual-regression` and `tooling/style-dictionary`.

### Ready for the next step

`piv-commit` (stage by explicit path: the four new files, the ten modified files, the plan + `.html` + probe dir, the
receipt dir, this report), then `piv-create-pr`. The PR body must say "Auth is the subscription, unchanged; turns are
one proposal each for that reason" and carry `Closes #312`. Then `piv-review-pr`.
