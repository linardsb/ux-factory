# Implementation Report — Run 1, Faster Payment built on the canvas (#316)

**Plan**: `.claude/plans/faster-payment-build-run-316.md` (amended in PR #529)
**Branch**: `run/faster-payment-316`
**Base**: `55c3843` → the sitting → merged with `origin/main` `5e42472` · **Status**: COMPLETE — five of five ACs met, with the findings below

## Summary

Run 1 is recorded. `discovery/faster-payment/build/` holds the first real owner-driven build on the canvas: five
screens and every state they need, composed by the agent from the #291 PRD and decided by the owner turn by turn,
with one part imported from a Brilliant file the owner did not draw and admitted into the system through ratify.
40 compose turns cost **$7.5443** (observed, the sum of `stats.costUsd` over 40 distinct turns), with 0 failed turns.

**Every AC is met, but the imported part is a weak example.** `mj-button`, the ratified import, sits on the
`review-payment` frame (AC #3). Ratify, however, admitted it as an empty `div` with no label prop, no text slot and
no CSS for hover, pressed or disabled. Its own spec claims a native button, a visible label and four states. On the
frame it renders as an unlabelled pill with no accessible name, and in every floor state the agent could only hide
it. The owner kept the run as recorded (2026-10-05). The ratify fix is #533.

**The flow has no arrows.** The only `connect` op in the ledger is the spine's seq 6 (f1 → f2). The PRD's
Completion metric reads "the frames, the states, the arrows and the pack", and none of the five screens is
connected to the next. Nothing in the run's tasks asked for one, and no gate measured it.

## Verdict per acceptance criterion

| AC | Verdict | Evidence (observed at the PR head) |
|---|---|---|
| #1 run package committed; trace rule green; `/factory` untouched | ✅ | `ops.jsonl` 87 lines, `canvas.json`, `transcript.jsonl` (40 turns), `imports/` (i1, i2), `proposals/` (ecommerce-2, mj-button), `handoff/`; no `groups/` (nothing promoted). `verifyBuild({ops, canvas, groups, buildTranscript})` → `[]`. `git diff --stat origin/main -- factory.html` empty; nothing under `factory.html`, `system/*.mjs`, `agent-layer/*.mjs` reads `faster-payment/build` (two text hits: a pre-existing comment in `system/canvas-ops.mjs:14` and the admitted entry's `provenance.run` string). No factory pixel change (below) |
| #2 `missingStates` `[]` on lane A; CoP and send states declared | ✅ | `missingStates(canvas)` → `[]`. Declared on the screen ops, not mapped onto the floor: seq 15 `payee-name-check-result` `states: [close-match, no-match, unavailable]`, seq 49 `send-payment` `states: [pending, success, fail]`, each with its state frame (f3: 7 states, f16: 7) |
| #3 ≥1 imported part on a frame; drops and fidelity shown; no by-hand admission an import covered | ✅, weak (above) | `lineage.json` `partsByProvenance.imported` = 1 (`mj-button` on f27). `i2`: 16 drops, fidelity **red** (ΔE 13.5596 over threshold 5, WCAG 12/12). No `component.propose` carries a `groupId`. `system/specs/mj-button.md` on HEAD |
| #4 the PRD's numbers recorded, not judged | ✅ | The numbers, below |
| #5 every agent screen traces to a recorded op; add-payee is the owner's | ✅ | 38 agent lines, all `proposed`, every one with an owner verdict (`fromStep`); 0 owner verdicts point at a non-agent line; the trace rule (TR1–TR5) green. add-payee is seq 1, the spine's owner screen. The rule's limit, in PR #495 F1's words: a transcript hand-written to match is not detectable |

## What ran

| | |
|---|---|
| Package | `discovery/faster-payment/` · fictional · neutral pack · the #291 PRD as the brief |
| Screens | 5: add-payee (f1, the spine's) · payee-name-check-result (f3) · scam-safety-stop (f11, fork on decision 8, option B) · send-payment (f16) · review-payment (f27, placed for AC #3) |
| Frames | 31 (5 screens + 26 states) · 1 note (the commit pause) · 5 decision cards |
| Agent proposals | 8 screens (5 accepted, 3 refused) · 30 states (25 accepted, 5 refused) |
| Compose turns | 40: 6 screen, 1 fork, 33 state · 11 briefed by the owner · all `transport: sdk`, `claude-sonnet-5` |
| Conventions | every turn under `system/DESIGN.md` v1, `designSha` `608f6c393d6ffd39`; `promptFingerprint` `32e186e7fedd687d` throughout |
| Vocabulary | `vocabSha` `59380758647765a7` for c1–c35, `d5cbaec16b46eb80` (with `mj-button`) for c36–c40 |
| Imports | `i1`: the whole "Ecommerce 2" email block (left unratified) · `i2`: its button → `mj-button` |
| Source | "The Ultimate Email Design System (Community)", page "12 Klaviyo Cart Abandonment", a public Brilliant file, not drawn by the owner |

### Sessions

| Session | Turns | Spend |
|---|---|---|
| 2026-10-04 15:13–15:53Z | c1–c16 | $2.5954 |
| 2026-10-04 20:23–20:56Z | c17–c35 | $3.4103 |
| 2026-10-05 09:33–10:01Z | imports, propose, pause note, ratify (no compose turns) | $0 |
| 2026-10-05 11:54–12:26Z | c36–c40, inbox, pack | $1.5386 |

Not one sitting. The 2026-10-05 import was blocked first by Brilliant renaming `lookup` to `read({ paths })`, which
#530 fixed before the import ran.

### The cost read

| | Observed |
|---|---|
| Turns | 40, 0 failed |
| Total | $7.5443 |
| Per turn | $0.1886 (derived: 7.5443 / 40) |
| Latency | min 4.3 s · median 14.3 s · max 57.7 s (`stats.durationMs`) |
| Empty-yield turns | 3, with no op line: c11 $0.0433, c13 $0.0561, c28 $0.0590 ($0.1584). Each was an unbriefed re-ask after an owner refusal; the agent refiled nothing or declined a repeat |
| Most expensive | c36 $0.580 and c37 $0.570 (each re-cached a ~97k-token prompt: c36 after a portal restart, per the session record, and c37 after a 14 min 56 s gap, past the 5-minute TTL) · c17 $0.491 (the fork, two proposals, and a cold cache: 60,928 tokens re-cached after the 4.5-hour gap) |

**Against the plan:** the paid table's high case plus the fork and placement row came to $4.45 of headroom. The
run spent $3.09 more (derived: 7.5443 − 4.45). The plan's per-turn figure ($0.15) came from short probe runs. Here
the prompt grew with the canvas, and cold-cache turns cost 3–4 times a warm one.

## The numbers (T14)

**Recorded, never judged.**

### Elapsed per import

| | i1 | i2 |
|---|---|---|
| Recognition compute (`elapsed.recognition`, machine time) | 25 ms | 3 ms |
| Propose → ratified (`elapsed.ratify`) | `null`, never ratified | **1,482,049 ms** (24 min 42 s) |

`i2`'s span, split by the owner's pause note (seq 76) as R3 planned:

- **propose → note**: seq 75 `09:36:28.505Z` → seq 76 `09:39:11.743Z` = **2 min 43.2 s**.
- **note → ratify**: seq 76 → seq 77 `10:01:10.554Z` = **21 min 58.8 s**. The commit `d613b87` is inside it (author
  time `09:40:09Z`, 57.3 s after the note, the cross-check the plan asked for). The rest of the span is the owner
  filling the ratify form, the preview and the gate chain, in some proportion the package cannot show: ratify sends
  each step's `ms` to the page (`portal/lib/ratify.mjs:663`) and writes none of it. **The gate chain's duration is
  not recorded.**

### Unbound

- **Records with `source.bound === false`:** 2 of 2 (both imports came from a Brilliant file with no token binding).
- **Slot outcomes** (`unbound`): `i1` 92 slots: 21 exact, 10 proposed, 61 dropped, 0 overridden · `i2` 8 slots:
  0 exact, 3 proposed, 5 dropped, 0 overridden.
- **`i2` was ratified with its 3 snaps still `proposed`.** The inbox's unbound-import row fires only while a proposal
  is `proposed` (`portal/lib/inbox.mjs:188-196`), so the ratify removed that row without anyone confirming the snaps.
  Separately, the owner's ratify CSS rows chose `--spacing-md` for the padding: the token the first snap proposed for
  the 15 px value.

### Compose vs admit, and provenance

- **Composition over admission:** 0 compose-and-name groups and 0 placed copies; 1 admission through the chain, from
  an import (`handoff/flow.md`).
- **Parts by provenance** (`lineage.json`): 1 imported · 0 admitted · 0 composed · 35 vocabulary.

### Eleventh primitive (Q9), and unused primitives

- **Under the plan's definition, 0.** The transcript has no `refused` line of any kind: no vocabulary, applier or
  ids refusal in 40 turns. No owner brief names a missing part.
- **Agent-flagged, reported apart:** c22 flagged "the vocabulary has no dedicated 'amount' or 'currency' part —
  `list-row.value` is a free string".
- **Not a primitive but a grammar limit:** a state can set or hide a part and never add one (F1 below).
- **Unused** (walked over every owner-accepted or owner-applied `screen.compose` composition; state overrides cannot
  add parts, so they cannot change this): of the PRD's ten, **icon** and **choice** are unused (`choice` appeared once, in the fork's option A, seq 36,
  which the owner refused at seq 39). Within the pairs, `nav-tabs` (nav; `screen-header` was used) and
  `select-field` (text field / dropdown; `text-field` was used) are unused. Used: `primary-button`, `ghost-button`,
  `mj-button`, `card`, `modal-dialog`, `screen-header`, `text-field`, `stack`, `text`, `list`, `list-row`. Refused
  compositions are left out of the walk (PR #535 review F1).

### PR #516 F2, the fork reading

c17 (the fork on decision 8) filed **both** options, as two `screen_compose` ops in one turn, and no `not-drafted`
line arose. The misleading case did not happen, so the `notDraftedLine` wording fix stays deferred, with this
sitting's evidence.

### The imported part's grain

**Not recorded.** The only owner `annotate` in the ledger is the commit pause note. The plan's paid table says to
report a missing grain annotation as not recorded, so it is not filled in here.

## Where the flow was built

Every frame on the canvas arrived through a recorded op: the spine's six owner ops, then 38 agent proposals and
their owner verdicts, plus the owner's own `frame.remove`, `component.propose`, `annotate` and `proposal.ratify`
lines. The package records no construction anywhere else. The PRD's Switch row also asks whether the switch was
unprompted ("Forced once out of loyalty → the **second** unprompted flow must be too"). The package cannot show
that, and this report does not answer it for the owner.

## Owner's reasons (step 10, the inbox)

Given in chat on 2026-10-05. No inbox button was pressed. This line is the record.

1. "ecommerce-2 waits for ratify.": "Out of scope: this run imports one component (mj-button); the Faster Payment flow doesn't use this block, so I haven't reviewed it."
2. "Import i1 has 10 snaps nobody confirmed.": "Each snap is the importer's guess; I haven't checked those raw values against our tokens, so confirming them would ratify guesses."
3. The four `fp-revisit-498` rows (a re-confirm and three missing states on that run's add-payee): "They belong to the separate #498 run; acting on them here would mix that run's evidence into this run's record."

## Findings

| # | Finding | Evidence |
|---|---|---|
| F1 | **A state can set or hide a part, never add one.** An empty dialog shows in CoP's match view, Reference and Time rows sit blank on send, and error and loading text ride on `list.empty` in review-payment, so they read as an empty list | `STATE_TOOL_DESCRIPTION` offers `set` and `hide`; c4, c22, c38, c40 |
| F2 | partial ≈ loading where one result arrives at once (CoP, scam stop); distinct where data arrives in pieces (send, review) | f6/f7 (CoP), f14/f15 (scam stop) against f19 (send), f30 (review) |
| F3 | Wrong money and fact claims fixed only by a brief: "No account found" (no-match), "We checked" (unavailable), "No money has left" (pending) | refusals seq 27/29, 33, 59; briefs c14, c16, c29 |
| F4 | After a refusal, an unbriefed re-ask refiles the same thing or declines, because the agent does not see the refusal's reason | c11, c13, c28 (the empty-yield turns) |
| F5 | Citations that claim more than the source: c30 cited seq 18/19 (not decisions) as requirements; c36 cited seq 30, a storage boundary, for masking what is shown | refusal seq 63, brief c31; seq 78 `why` |
| F6 | A literal `—` in `why` strings | c37–c40 and earlier |
| F7 | The spine's add-payee asks only for an account number, while CoP checks the name and sort code; review-payment then shows "£250.00" and "Rent June", which no screen collects | f1; f27 |
| F8 | No amount or payment-status primitive (agent-flagged, c22); no full-pill radius token (Q9 evidence) | c22 text; mj-button's CSS uses `--radius-lg` |
| F9 | Compose vs admit: `i2` is a shape `primary-button` already covers (Jev suggestion 0.64), admitted anyway | `i2.json` `suggestions` |
| F10 | Brilliant renamed `lookup` to `read({ paths })` mid-epic (fixed by #530); a closed project leaves the bridge stale | 2026-10-05 import block |
| F11 | Six gate cases assumed the six-op spine: three in build-checks (fixed by #532) and three in the journeys (canvas-journey 2 and X4, ratify-journey R4; fixed by #534) | journey runs at `0d634db` and `0952df6` |
| F12 | **The flow has no arrows**: no `connect` op after the spine's seq 6 | `ops.jsonl` |
| F13 | **Ratify admitted a part its own spec over-claims**: `mj-button` is `tag: "div"`, `slots: []`, `props: {}`, where the spec claims a native button, a visible label and four states, and the CSS covers none of the states. On the frame: an unlabelled pill. The agent said hiding it was "the only available move" (c37) | `system/templates.admitted.mjs`, `system/specs/mj-button.md`; #533 |
| F14 | Ratify cleared `i2`'s inbox row with 3 snaps unconfirmed | above, Unbound |
| F15 | review-payment's partial hides the amount and reference with no "still loading" cue, although `list.header` could carry one: the agent's choice, not the grammar | f30 |
| F16 | The owner's layout overlaps: 31 frames dropped around x 900–2400 at fractional positions. The canvas never refuses an overlap, which is by design (positions are authored) | `canvas.json`; canvas-journey 2 |

## Not run

| Step | Why | Tracker |
|---|---|---|
| D2 (a stale frame re-confirmed) | #498 refuses a revisit on a fictional package; lifting that aborts build-checks group 30 (owner, Q3) | #528 |
| The imported part's grain annotation | Not written in the sitting | reported as not recorded |
| `ecommerce-2` ratify and `i1`'s snaps | The owner's reasons, above | recorded |
| The `fp-revisit-498` inbox rows | Another run's; the owner's reason, above | that run |

## Deviations from the plan

- **Not one sitting.** Three compose sessions over two days, with the import paused by #530 (above).
- **A fifth screen.** The admitted part could reach a frame only through a new screen turn (no state turn adds a
  part, and the lane editor cannot add one), so the owner chose a review step: c36, review-payment.
- **The portal was started without the ready gate** for the last session. `run-316-ready` check 5 fails by design
  once the ledger has grown, and check 6 fails mid-run (handoff note).
- **T13's VR:** the three `components-*` baselines regenerated (each page grew 1,435–1,533 px with mj-button's
  catalog entry). The factory baselines were removed and regenerated too: only `factory-neutral` came out different,
  by at most 3/255 per channel, with no pixel over 10. That is render noise, so `main`'s copy was restored
  (`0952df6`). Two full-suite compare runs each timed out once on a different factory pack (a stable-screenshot
  timeout, not a pixel diff); factory alone passed 9/9.
- **Two gate PRs, not zero:** #532 (build-checks, merged) and #534 (the journeys), each `Refs #316`, off `main`.

## Validation results

At the PR head (observed):

- `node tooling/build-checks.mjs` → `build ✓  all 52 groups pass`
- `node tooling/drift-check.mjs` ✓ · `node tooling/token-lint.mjs` ✓ (63 contract tokens, 0 orphan)
- `node agent-layer/gen-build-handoff.mjs --check` → no drift · `node agent-layer/gen-loc-summary.mjs --check` → no drift
- `verifyBuild` → `[]` · `missingStates` lane A → `[]`
- `catalog-journey all` ✓ on three engines
- canvas-journey and ratify-journey: red here on 3 cases (2 and X4 per engine, and R4) until #534 merges. With #534's diff applied to this branch: canvas-journey chromium 258/0 · firefox 257/0 · webkit 257/0, ratify-journey ✓ 52 (observed)

## Commits

`d613b87` the sitting to the commit pause · `48bc368`, `4b4671d` gate fixes (cherry-picked; landed on `main` as #532)
· `d7af428` the mj-button admission (ratify's writes, unedited) · `9edf665` the sitting's close · `046c3ca` the
baselines · `0d634db` merge of `origin/main` · `0952df6` main's factory-neutral baseline restored.
