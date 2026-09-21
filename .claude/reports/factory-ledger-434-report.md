# #434 report — the ledger

**Branch** `feat/factory-ledger-434` on `main` @ `ab88203` (#433 merged). Epic #295.

## What changed

- `system/studio-ledger.mjs` (new, 130 lines): `createLedger` — `note(kind, text, source)`, `fold(action)`,
  `rows()`, `onRow` — plus `describeAction` and `renderLedger({host, list})`. KINDS did · refused ·
  corrected · narrated · took-over; SOURCES the bus's four. Refusals by name; rows frozen; textContent only.
- `system/studio.mjs`: the ledger is created beside the bus, fed from `bus.on("*")`, rendered where
  `[data-studio-ledger]` exists, and passed to the verbs and the replay driver.
- `system/studio-verbs.mjs`: one `refuse(action, sentence)` helper over the five `Refused:` sites — say and
  note are one string (R2 closed at the source rather than argued).
- `system/replay-driver.mjs`: four note sites — every beat in `advance()` (op → did, note → narrated, fence
  denial → refused with the fence's message verbatim), a counted `corrected` row in `relayout()` only when a
  block actually moved, the board refusal in `reflect()`, the take-over in `onTouch` (its source is the
  event's: keyboard or pointer).
- `factory.html`: the mount under the canvas, `hidden` and empty at rest; one sentence in the intro.
  `instance.html` carries no mount. `system/studio.css`: one token-only block.
- `tooling/build-checks.mjs` group 37 (36 → 37 in the four claim sites), `gates.md` row 37, CLAUDE.md map line.
- `tooling/studio-journey.mjs` `ledgerPass`: nine rows, three engines.

## The four ACs on the running page (observed)

Stacked three-engine run on `4f0f40d` (#434 + #436 + #423, worktree served on 4813), 2026-09-21:

| engine | before (#433's tree) | after |
|---|---|---|
| chromium | 537 · 0 | **557 · 0** (+9 ledger, +5 #436, +6 #423) |
| firefox | 533 · 0 | **547 · 0** (+9, +5) |
| webkit | 533 · 0 | **547 · 0** (+9, +5) |

`EXIT 0`. The pages on that tip are byte-identical to this branch's; the commits since are this
report, the regenerated `loc-summary.json` and the /approach baselines.

- **A refusal survives the next announcement:** mid-replay, paused, a `ui.move` naming `no-such-block`
  lands `Refused: no component "no-such-block" …` in the live region; one Step later the region says the
  beat and the ledger still holds the refusal, verbatim, `data-source="keyboard"`.
- **A relayout is a row:** on the committed run, ≥ 1 `corrected` row, each `N block(s) moved to follow a
  connection.` Mutation (the note in `relayout()` disabled): the probe's row reads `[]` → red; restored.
- **Denied calls are rows:** 3 `denied: true` steps in `traces/build-fieldwork-dispatch.jsonl`, 3
  `refused` rows from the agent beginning `Refused — `.
- **The take-over is a row**, and every row before it is unchanged, in order; the reader's own move
  after it lands labelled keyboard.
- **Announcement parity:** live-region writes on the committed run, counted by a MutationObserver from
  page load to settled — base tree 9, ledger tree 9, same last three sentences (observed on both
  served trees, `say-parity.mjs` in the session scratchpad). Module counts: `canvas.say(` sites
  replay-driver 9 → 9; studio-verbs 23 → 19 literal sites plus the five inside `refuse`, which says
  once each — the runtime count above is the proof, the source count the explanation.

## Gates

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ all 37 groups pass |
| group 37 mutation | the hostile-text case is the mutation by construction: innerHTML leaves the stub's text empty |
| `node tooling/drift-check.mjs` | ✅ |
| `gen-loc-summary.mjs` | runtime 31,700 → 31,900 and files 78 → 79 — both render on /approach |
| pixel baselines | `factory-{neutral,saulera,verdant}` and `approach-{…}` regenerated in Docker (`npm run update:docker`, 33/33); the /approach set twice, the second time after the loc regen the first missed (the generator reads the tracked tree — [[loc-summary-counts-tracked-only]]) |
| the ledger, seen | `factory-neutral.png` read back: "The ledger" under the canvas, the run's rows in order, the masked frames beside it |

## Two wording notes (R3)

The `did` rows for the reader's own bus actions are built from the action (`Card moved to 40, 120.`,
`Undo.`) — the verbs' own sentence shape, not new vocabulary. The take-over row on a settled canvas
reads `The canvas is yours.` where the live region says nothing; that is the one sentence this PR adds
beside the relayout row's.

## What this does not claim

The ledger is not read back by anything yet (#312's compose loop is the first that could). Its look
on saulera and verdant was captured, not eyeballed. Whether the rows read as a record rather than a
log is the owner's read — R3 in the ticket.
