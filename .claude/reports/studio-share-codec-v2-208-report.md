# Implementation Report — Share codec v2: the arrangement in the URL, v1 links byte-identical

**Plan**: `.claude/plans/studio-share-codec-v2-208.md`
**Branch**: `feature/studio-share-codec-v2-208`
**Ticket**: #208 · **Epic**: #202
**Status**: COMPLETE

## Summary

`system/build-share.mjs` learned one wire field and one refusal. `g` carries a per-place grid slot
list, positional and parallel to `b.p`, emitted only when the state carries an arrangement that
describes the board being sent — so the version became a *set* (`SHARE_VERSIONS = [1, 2]`) and a
build with no arrangement still writes a literal `1`, producing a param that is not merely
compatible with v1's but byte-identical to it. Coordinates are rejected, never clamped, against
`MAX_COLS`/`MAX_ROWS` **imported** from `system/studio-canvas.mjs`. And the envelope closed: any
top-level key outside `{v, a, b, e, k, s, g}` now rejects the whole payload, which fixes v1's
silent-partial-restore hole.

The proof is five real v1 links captured from the shipping encoder *before* the source was touched
and committed in their own commit — four through the v1 module in Node (both transports, with and
without an imported pack) and one copied out of a real chromium session on `/build.html`.

Nothing on any page changed at rest. No new control, no copy change, no `param-manifest.json` entry.

## Tasks completed

| # | Task | File | Action |
|---|---|---|---|
| 1 | Frozen v1 capture, **before** any source edit | `tooling/share-v1-links.json` | CREATE |
| 2 | The version set (`V_BASE` · `SHARE_VERSION` · `SHARE_VERSIONS`) | `system/build-share.mjs` | UPDATE |
| 3 | Encode `g`, and only when it is real (`arrangementSlots`, `slotOk`) | `system/build-share.mjs` | UPDATE |
| 4 | Decode `g` + the known-key envelope audit | `system/build-share.mjs` | UPDATE |
| 5 | The header states both new rules; the wire table grows a `g` row | `system/build-share.mjs` | UPDATE |
| 6 | Groups 4 + 5 + 12 | `tooling/build-checks.mjs` | UPDATE |
| 7 | A restored arrangement survives a re-share | `system/build-keep.mjs` | UPDATE |
| 8 | `[6b]`, the running-page half | `tooling/build-journey.mjs` | UPDATE |
| 9 | Drift checks | — | RUN |
| 10 | loc-summary + both approach baselines | `system/loc-summary.json`, 2 PNGs | UPDATE |

## Tests added

### `tooling/build-checks.mjs` group 4 — codec

- **The frozen v1 proof.** Every entry in `share-v1-links.json` decodes; its four build fields
  (`answers`, `board`, `boardIsEdited`, `pack`) match the frozen v1 output exactly; and
  `arrangement === null` — a v1 link may not acquire one. Coverage itself is asserted (≥ 5 entries,
  both branches present, at least one browser capture), so a fixture file quietly reduced to one
  entry fails rather than passing vacuously.
- **Byte-identity**, raw branch only: `encodeBuild(state, { compress: false }) === entry.param`.
  Deflate entries assert JSON-identity instead (see Deviations — this is the plan's own gotcha).
- **The arrangement round-trip**: encode → decode → value-identical → re-encode → identical param,
  and `patternFor` still recomputes to the sender's pattern with `g` in the payload.
- **The encoder's consistency rule, from its own side**: an arrangement of the wrong length, and one
  carrying an off-grid slot, each make the encoder omit the whole field — asserted by comparing
  against the byte-identical no-arrangement param, not merely by checking `g` is absent.

### `tooling/build-checks.mjs` group 5 — tamper

54 hostile payloads, up from 31. The 20 new coordinate cases each get the same two-place `b` and
two-entry `g`, varying only the thing under test — a `g` whose length disagrees with `b.p` would
reject for the *length* reason and prove nothing about coordinates:

- magnitude: `1e9`, `MAX_SAFE_INTEGER`, `0`, `-1`
- type: `"1"`, `1.5`, `null`, `true`, an object where a pair belongs, a pair of length 3, `g` as an
  object, `g` as a string
- duplicate: two places in one cell
- off-board by exactly one on each axis: `MAX_COLS + 1`, `MAX_ROWS + 1`
- length: longer than `b.p`, shorter, 1000 entries, empty
- envelope: `g` on a `v: 1` payload

Plus: `v: 2` → `v: 3` for the hostile version, an unknown top-level key, `arrangement` spelled out
(the near-miss a future editor would type), the **accept** side of v2 (a valid `g` decodes, to the
slots that were sent, with ids taken from the validated board and not the payload), and the grid
boundary itself both ways.

The `__proto__` block's expectation **flipped** — see Deviations.

### `tooling/build-checks.mjs` group 12 — canvas

The tripwire planted by #204 is **discharged**. It no longer asserts the constants are finite; it
asserts the *coupling*: `build-share.mjs` imports both names from `./studio-canvas.mjs`, and compares
no grid axis against a literal cap. It also pins the divergence — `clampSlot` still coerces `"4"`
while the codec refuses it — so a later reader does not "fix" one into the other.

### `tooling/build-journey.mjs` `[6b]` — the running page

The half the pure gate structurally cannot reach. A v2 param built in-page from the page's **own**
modules restores; the arrangement survives a copy on a page that cannot show it; survives a rename;
and on an **add** falls back to a param byte-identical to the no-arrangement one — the honest
degradation, asserted rather than assumed.

## Validation results

| Level | Command | Result |
|---|---|---|
| 1 · syntax | `node --check` on all three touched files | pass |
| 2 · gate | `node tooling/build-checks.mjs` | **✓ all 15 groups pass** |
| 3 · mutation | four mutations, one at a time | **all four red** (below) |
| 4 · running page | `node tooling/build-journey.mjs all` | **157 passed · 0 failed** on chromium, firefox *and* webkit |
| 5 · drift | `drift-check` · `gen-loc-summary --check` · `gen-param-count --check` | clean after Task 10 |

### Mutation sweep — the check must be able to fail

| # | Mutation | Result |
|---|---|---|
| 1 | delete the `!slotOk(...)` rejection in decode | **RED** — 21 failures; every magnitude, type and off-board case |
| 2 | `seen.has(key)` → `false` | **RED** — 2 failures, the duplicate-cell case |
| 3 | encode emits `v: SHARE_VERSION` unconditionally | **RED** — 2 failures, both raw frozen fixtures lose byte-identity |
| 4 | delete the known-key audit | **RED** — 6 failures: the unknown key, the `arrangement` near-miss, and `__proto__` |

Each was reverted; the tree returns to 15/15 green.

## Deviations from the plan

1. **Fixture file shape.** The plan sketched a bare array of five with a `$description` key. A bare
   array cannot carry one, so the file is `{ $description, capturedAt, entries }` — the
   `param-manifest.json` idiom the plan itself names as the pattern (that file is
   `{ $description, entries }`). `capturedAt` holds the capture sha, `f381af7`, as the plan required.

2. **Group 12's "no second literal" regex is scoped to upper bounds.** The plan said "no second
   literal `12`/`8` bound for a grid axis". Written naively it fired on `col >= 1` and `row >= 1`
   inside `slotOk` — correctly, by its own terms, and wrongly by intent: the 1-based **origin** is a
   property of the grid's numbering, not of its size, and it does not move when the canvas widens.
   The filter keeps only comparisons against a number above 1, which is exactly the shape a re-typed
   `col <= 12` would take. Caught by running it, not by reading it.

3. **The rejection message for a non-integer coordinate uses `JSON.stringify`, not `String`.** The
   plan's sketch printed `"4"` as `4`, so the reason read `the slot [1, 1] is off a 12 by 8 grid` —
   which is a lie about *why* it was refused, on a value that is on the grid numerically. The message
   now reads `the slot ["1", 1] is not a whole column and row on a 12 by 8 grid`.

4. **The decompression-bomb case now asserts its *reason*, not just its rejection.** Not in the plan,
   but forced by it: the bomb's padding rides in a top-level `pad` key, which the new envelope audit
   would *also* refuse — so a size cap deleted from `inflateRaw` would have left that case green for
   the wrong reason. The assertion now requires the reason to name the size cap, which is the thing
   that must catch it, before the payload is in memory. This is the "check that cannot fail" shape,
   introduced by this ticket and closed by it.

5. **Group counts.** The plan says "15 groups green" and that is right, but it refers to groups 4 / 5
   / 12 by their ordinal while the file has since grown groups 14 (studio) and 15 (compile). No
   renumbering was needed — the three targeted groups are still `codec`, `tamper` and `canvas`.

6. **Tasks 7 and 8 were kept**, per the plan's own Open Question 2. Dropping them would have passed
   every AC while breaking PRD §1's spirit: a /build visitor re-sharing a studio link would silently
   flatten the arrangement with nothing on screen saying so.

Nothing else diverged. `system/studio-canvas.mjs` was **not** edited (its exports already existed,
as the plan verified); `BUILD_CHANGE` was **not** widened; `clampSlot` was **not** touched.

## The reviewer's likely stumbling block — flagged deliberately

**Group 5's `__proto__` expectation flipped from accept to reject, and that is the ticket working.**

The old block asserted `state !== null` with a long, careful comment arguing that asserting a
rejection there would be "a test asserting a behaviour the code correctly does not have". That
argument was true of v1, which validated every field it knew about and ignored the rest. It is false
of v2: `JSON.parse` creates `__proto__` as an own **data** property rather than invoking the setter,
so `Object.keys` sees it and the envelope audit refuses it as the unknown key it is —
strictly better than accepted-but-inert.

**Both prototype-pollution assertions were kept**, because they assert the thing that actually
matters and it is no less at stake on the rejecting path: a decoder that refuses must not pollute on
its way out either. Mutation 4 confirms this case is load-bearing.

## Issues encountered

- **loc-summary cascaded, as the plan anticipated — but no baseline actually moved.** The runtime
  group crossed 23,200 → 23,300 and `approach.html` renders that number, so `npm run update:docker`
  was run from a clean detached worktree under `/Users` (never `/private/tmp` — Docker cannot share
  it, and the gate screenshots the dirty tree). The worktree was verified to be rendering 23,300,
  and the run rewrote **nothing**: one changed digit is under the config's `maxDiffPixels: 100`, so
  pixelmatch does not consider the baseline stale. The plan's Task 10 explicitly allows this outcome
  ("it should touch only the two approach PNGs, **or nothing at all**"), and forcing a rewrite by
  deleting the PNGs would be a gratuitous regen — a baseline collision waiting to happen, which the
  epic's standing rule warns against. **So this PR carries no baseline change**, and CI's visual job
  is green either way.

  Worth knowing for the next ticket that moves this number: the digits are *below* the gate's
  tolerance, which is the "VR tolerance hides text changes" trap. The number's correctness is gated
  by `gen-loc-summary --check` in the `verify` job, not by the pixel gate — and that is clean.
- **One self-inflicted stumble worth recording:** the first browser capture was transcribed by hand
  out of stdout into a second command and corrupted one character, which surfaced as
  `invalid bit length repeat`. Fixed by doing the capture and the decode in a single script. A param
  is not something to move through a shell by eye.

## Ready for the next step

`piv-commit` is already done — three atomic commits on the branch (fixtures · codec + gate ·
pass-through + journey), plus the baseline commit. Next: `piv-create-pr` with `Closes #208`, then
`piv-review-pr`.
