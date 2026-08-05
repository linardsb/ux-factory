# Code review — PR #240 · the replay driver over the `agent.*` bus + the take-over handoff (#209)

**Verdict: REQUEST CHANGES** — one High, then this is a merge.
**Reviewed at** `ddd9aa7`, clean tree, base `main` = `4a33430` (`mergeStateStatus: CLEAN`, so the PR's own
baseline-collision caveat is discharged — this branch still owns factory's baselines).

Fresh-eyes pass: the deep read was dispatched to the `code-reviewer` agent in its own context, and its
three findings were re-verified here by running the code rather than by reading its summary. Two more
came out of the orientation pass. The implementation report's ten deviations and its four
post-review hardening items were read first and are **not** re-litigated below — a documented decision
is a decision.

---

## Validation

Split deliberately into what was re-run at HEAD for this review and what is taken from the PR body,
because that distinction is itself review signal.

| Gate | Result | Who ran it |
|---|---|---|
| `node tooling/build-checks.mjs` | ✓ all 16 groups | **re-run here, at HEAD** |
| …with `portal/node_modules` moved aside | ✓ all 16 groups (SDK-free invariant holds) | **re-run here** |
| `node tooling/drift-check.mjs` | ✓ 12 passes | **re-run here** |
| `gen-loc-summary --check` · `gen-param-count --check` · `gen-replay --check` | ✓ no drift | **re-run here** |
| mutation: uniform/index-derived pacing | ✓ RED on the gap-ratio assertion, exactly | **re-run here** |
| mutation: one `connect` → `disconnect` in the artifact | ✓ RED on both the reproduce compare and the histogram tripwire | **re-run here** |
| `studio-journey all` · `vt-verify all` · `build-journey all` · pixel gate in Docker | ✓ per the PR body | author (operator-run; not repeatable in this pass) |

The drift re-run matters specifically: `loc-summary` was regenerated at `99163dd` and the approach
baselines at `7699a3f`, and **two further commits landed after** (`eddf053` added test code, `ddd9aa7`
touched `studio-journey`). `loc-summary` reads git-tracked content, so that ordering is the recorded
trap. It is clean at HEAD — verified on the committed tree, not the index.

---

## Findings

### 1 · HIGH — Compile compiles the **empty** board any time it is pressed before the run settles

`system/studio.mjs:395` · `:422` · `:446`

`studio.mjs` initialises `let board = { places: [], connections: [] }` on every load, hands the compile
beat `getBoard: () => board`, and the **only** writer of that variable is `onSettle` — which fires only
from `replay-driver.mjs:599-610`'s `settle()`, i.e. only when the whole run completes.

`studio-compile.mjs:266` sets `compileBtn.disabled = next !== "blocks"`, and the state is `"blocks"`
from mount. So Compile is live from load, and every path that stops the beat chain without settling
leaves the getter answering an empty board:

- during plain autoplay (no take-over needed — blocks are visibly arriving and the button is enabled);
- after a take-over (`replay-driver.mjs:683-711` pauses, never settles);
- after the driver's own Pause;
- after seeking backwards from a settled state (`seekTo` sets `settled = false`).

**Failure scenario:** a reader follows `factory.html`'s new lead copy verbatim — *"The moment you touch
the canvas it is yours… The blocks are sketches until you compile them: press Compile the board"* —
touches the canvas at beat 12 of 28, sees four blocks, presses Compile, and gets
`compileSteps({places:[],connections:[]})` → state `"empty"` → a card reading *"No pattern named, so
nothing compiled"* while blocks sit on the canvas in front of them. The one thing the page tells the
reader to do after taking over is the thing that misreports.

This is the seam working exactly as `studio-compile.mjs:205-206` describes it — that comment scopes its
own claim to *"pressing Compile after the replay settles"*, which reads as the path having been
considered only in the settled case rather than accepted in the unsettled one.

**Fix:** sync the board on the paths where the driver has **stopped**, and keep Compile out of the ones
where it has not. Concretely: fire the orchestrator's board callback on take-over and on Pause as well
as on settle, and leave `compileBtn.disabled` while `playing`.

Do **not** simply point `getBoard` at the driver's live board (`replay-driver.mjs:835`'s `get board()`).
That makes Compile work during autoplay, and compile's positional in-place DOM swap would then run
against wrappers `reflect()` is still authoring — `place-added` appending new blocks and
`place-changed` doing `wrapper.replaceChild(fresh, old)` on the first non-`.stx-grab` child, which is
the compiled component. Two authors, one stage: precisely the failure this ticket's headline invariant
exists to prevent, and it would also break the plan's own Non-Goal that the replay does not drive the
compile beat.

Worth a `studio-journey` case in the same change: Compile pressed **mid-replay** yields components for
the blocks actually on the canvas. Nothing currently drives Compile before settle.

---

### 2 · MEDIUM — take-over during the `"loading"` window fires the route, then the run plays anyway

`system/replay-driver.mjs:690` · `:613` · `:763`

`onTouch` guards with `if (state === "unavailable") return;` — but not `"loading"`, which is the state
from `setState("loading")` at `:458` until `setState("ready")` at `:757`, i.e. across **two awaited
fetches**. A pointer press in that window sets `tookOver = true`, flips provenance to visitor, and
fires `trackFactoryTookOver()`.

Then `start()` continues to `play()` at `:768` (or `skipToEnd()` at `:765` under reduced motion), and
neither checks `tookOver`. The run proceeds to author the canvas underneath a reader the page has just
told, in its own provenance line, that the canvas is theirs.

This is the *same* honesty claim the `unavailable` guard was written for — `:686-689`'s own words, *"a
visitor moving blocks on a canvas the replay never built has taken nothing over, and firing the route
there would make the metric a lie"* — one state short. During `"loading"` the replay has likewise built
nothing.

**Failure scenario:** on a cold cache or a slow connection the two `fetch`es take a few hundred ms
against a visible, empty, inviting canvas. A reader who clicks in that window contributes a
`/factory/took-over` event for a hand-over that did not happen, and then watches the driver move blocks
around them with `seek` disabled (`syncControls:568` keys off `tookOver`).

**Fix:** one line — extend the guard to `if (state === "unavailable" || state === "loading") return;`
(or, equivalently and more directly, `if (!beats.length) return;`).

Explicitly **not** also `if (tookOver) return;` in `play()`, which was this review's first instinct and
is wrong: applied on its own it is strictly worse than the bug — a take-over in the loading window
would leave the replay never playing, the canvas empty forever, `This build` never rendered and
`[data-replay]` never reaching `settled`, which deadlocks the pixel gate. It is only harmless once the
guard above makes the window unreachable, and a guard that depends on another guard for its safety is
the wrong thing to leave in the file. One line, at the entry.

Uncovered by construction today: every `studio-journey` take-over case runs after `[data-replay]`
reaches `ready`/`settled`, and the degradation case runs against `unavailable`. The window between them
is the one nothing enters.

---

### 3 · MEDIUM — Skip-to-end and reduced motion collapse the act announcements into one

`system/replay-driver.mjs:635-638` · `:763-767` · `:551-557`

`skipToEnd()` and the reduced-motion branch apply every remaining beat **synchronously in one task**.
`announceBeat` writes each act-transition sentence into the canvas's one `aria-live="polite"` region in
that same task, and `settle()` then writes the completion sentence over them. A polite region announces
its final value per task, so a screen-reader user gets the last sentence only.

This is the sibling module's own recorded lesson, in its own words — `studio-compile.mjs:165-174`
("a zero pause here… DELETED three of its four steps for a screen-reader user"). It is not listed among
the report's deviations, and `studio-journey`'s reduced-motion section asserts the end state and the
Pause button's computed display, never the announcement sequence — so this is a gap rather than an
accepted trade.

Reduced motion is the load-bearing half: it is not an opt-in verb the reader chose, it is the arrival
path for anyone with the preference set, and it is exactly the audience the announcements are for.

**Fix:** announce **one summary sentence** naming the acts traversed, rather than emitting sentences
that cannot all be heard.

Not `studio-compile.mjs`'s spacing-across-tasks answer, even though this is its lesson: staggering is
right for a beat that is *meant* to play out, and wrong for the reduced-motion path, whose entire
contract is that it is instant. One sentence satisfies both paths. It wants a `studio-journey`
assertion counting announcements on the skip and reduced-motion paths, in the shape the existing
per-path counts already use.

---

### 4 · LOW — the panel prints two different answers to "how long did the run take"

`system/replay-driver.mjs:802` vs `:816`

Evaluated against the committed pair:

| Line | Source | Rendered |
|---|---|---|
| the facts list, `fact("Took", …)` | `run.durationMs` = `artifact.source.durationMs` = 131 043 ms | **2 min 11 s** |
| the pacing sentence | `run.realMs` = first→last beat span = 129 645 ms | **2 min 10 s** |

The 1 398 ms difference is the three skipped steps (the brief read and the validate), so both numbers
are honest about different spans — but they sit inches apart on a page whose entire premise is
checkable honesty, and nothing on the surface says they measure different things. Group 16 asserts each
against its own source and never that the two agree, which is why it is green.

**Fix:** either render one number in both places, or name the span in the pacing sentence ("the eighteen
ops spanned 2 min 10 s of it"). A one-line change, and worth doing on this page specifically.

---

### 5 · LOW — a raw NUL byte in `replay-driver.mjs` makes the file binary to `grep` and `rg`

`system/replay-driver.mjs:281`

The place signature uses `\u0000` and `\u0001` as separators, written as **literal control bytes** in the
source rather than as escape sequences:

```js
const sig = (p) => `${p.label}<NUL>${p.affordances.map((f) => `${f.id}:${f.label}`).join("<SOH>")}`;
```

`rg` reports `binary file matches (found "\0" byte around offset 16499)` and returns nothing; plain
`grep` matches nothing at all, silently. No gate is affected — `build-checks` group 7 and `drift-check`
both read via `fs` and are demonstrably still green with this file in `MODULES` — but every ad-hoc
`grep` over this file returns a false negative, on the one file in the repo whose header is a numbered
list of "this file never does X" invariants. It cost real time in this review before it was noticed.

Given the repo's own named failure mode — *a check that cannot fail* — a file that silently answers
"no matches" to every grep is the wrong file to have in the tree.

**Fix:** write them as escapes, `\u0000` / `\u0001`. Byte-identical behaviour at runtime, and the file
becomes text again.

---

### 6 · LOW — `studio.mjs`'s `own` branch states a requirement it does not implement

`system/studio.mjs:388-394`

The comment says a future visitor-supplied board "must place what the visitor brought and **let the
driver mount in a declined state** rather than assembling over it," and then `mountReplay` is called
unconditionally at `:434` with no such flag. Correctly recorded as unreachable today ("no code path
reaches the `own` branch"), so this is not a live bug — but #210 puts `?b=` on this route, which is the
exact branch, and it will arrive to find the requirement written down and not built. A `declined: !!own`
option now, even as a one-line early return in `start()`, would cost less than rediscovering it.

---

## Checked and clean — take-over **after** a backwards seek

`replay-driver.mjs:640-643` justifies re-minting wrapper ids with "fine only because seek is disabled
once the visitor has taken over", which covers seek-after-takeover and says nothing about the reverse.
Seek is deliberately not take-over, so the other order looked reachable — and #230 shipped exactly this
class of bug once. Traced it out rather than assuming:

- to have any history entries at all you must have moved a block, and moving a block **is** take-over,
  which sets `seek.disabled` (`syncControls:568`). So a backwards seek can only ever run against an
  empty history — the stale-id state is unreachable, not merely untested;
- and if it were reached, it degrades rather than breaks: `restore()` (`studio-verbs.mjs:316-331`)
  iterates the **live** `slots()` and looks a snapshot up by each node's current id, so an id no live
  node carries is skipped by `:323`'s `continue` — no detached-node access, no phantom move. Worst case
  is `:413`'s honest "Nothing to undo.", a branch the file already documents as reachable.

No finding. Recording it because the justification comment at `:640-643` is narrower than the property
that actually holds, and the next person to widen seek will want the real reason.

## The two product calls the PR asked a second opinion on

**`PLAYBACK_MS = 14000`** — accept. It is a feel judgement, made reversible by one constant with both
branches shipped and gated, which is the right way to make one. Only note: it adds ~14 s × 20 to the
pixel gate's wall clock, and the per-page `timeout: 90_000` is the correct place to have paid for it.

**The silent handover** — this is deviation 5 and therefore a decision, not a finding, but since a
second opinion was asked for: the reasoning holds for the case it was measured on (a keypress that
already triggers a pick-up sentence) and does not hold for the case it now also covers. Pause announces;
Step announces; Seek announces; take-over — the most consequential of the four, the one that changes who
owns the canvas — announces nothing on a settled arrival, and `.stu-replay-provenance` is a plain `<p>`,
so the shift is visual only. A sighted pointer user knows they grabbed the wheel; a screen-reader user
gets silence from the driver and one sentence about a block. The asymmetry is worth closing later —
plausibly by announcing on the **pointer** path (where nothing competes) while keeping the keyboard path
silent, which is a narrower rule than the current one and matches what was actually measured. Not a
merge blocker, and the report is right to record it rather than claim it away.

---

## What is genuinely well done

- **The invariants are mechanical, not aspirational.** Zero `ui.move` / `applySlot` / `data-col` /
  `data-row` writes anywhere but the header's own prose; exactly one `canvas.place()` call and it is
  inside the `place-added` branch; zero `.style` writes. Each verified by running a search over the
  parsed file, not by trusting the comment.
- **`applyBeat` diffs before/after boards** rather than re-implementing each op's semantics, so it is
  general over all eight verbs while the artifact exercises three — and the histogram tripwire is
  honest about that gap instead of pretending coverage.
- **The mutation discipline is real.** Two mutations run here (index-derived pacing; one `connect` →
  `disconnect`) each went red on precisely the assertion that claims to catch them, with a message that
  names the failure. Group 16's reproduce compare reuses group 13's hand-written recursive canonical
  stringify rather than `JSON.stringify(v, keysArray)` — the trap that made group 13 vacuous.
- **The take-over discriminator is structural.** Listening on `canvas.scroll` in the capture phase
  rather than subscribing to `ui.move` is the correct call twice over: it excludes the chrome by
  geometry rather than by a filter, and it fires at pick-up rather than at drop.
- **The analytics route avoids the #75 class.** `trackFactoryTookOver()` sits inside the handover path
  below the guard, not in a settled-state slot; `flipTo` rather than the simpler shape, and the reason
  (the dock's hash + #206's panels + #210's incoming routes) is argued rather than assumed.
- **The VR handle fails loud.** `unavailable` deliberately does not satisfy `[data-replay="settled"]`,
  so a broken replay deadlocks the gate instead of being baselined — and `waitReady` runs before the
  measure/resize, so the 14 s of chrome growth is inside the measured height with no #138 truncation
  risk.
- **`destroy()`** — flag → abort → timer → DOM, with a liveness check after every `await` in `start()`.
  Consistent with #236 and correct.
- **The report's own "post-review hardening" section**, which found four checks that could not fail in
  the driver written to catch exactly that, and recorded them rather than quietly fixing them.

---

## Recommendation

**Request changes** for finding 1 — a reader following the page's own new lead copy gets a wrong answer
on the primary flow, and it is a small fix against a seam that already exists.

Findings 2 and 3 are worth folding into the same push (two lines and a spacing change respectively);
4, 5 and 6 are cheap enough to take now but would be reasonable follow-ups. Nothing here challenges the
approach, the architecture or any recorded decision — the driver is well built and unusually well
argued at the line.

Re-run after fixing: `build-checks`, `studio-journey all`, and — because finding 1's fix touches what
Compile reads — `vt-verify all`. The pixel gate is unaffected by all six unless the chrome copy changes
for finding 4, in which case factory's two baselines move with it.

---

## Resolution — what was fixed, and where this review's own fix was wrong

Findings 1, 2, 3, 4 and 5 are fixed on this branch. Finding 6 is deferred to #210, which owns the
branch it is about ([issue comment](https://github.com/linardsb/ux-factory/issues/210#issuecomment-5195486113)).

### Finding 1 — the amended fix above was still wrong, in the same way the first one was

The amendment rejected pointing `getBoard` at the driver's live board because Compile would then work
during autoplay, against wrappers `reflect()` is still authoring, and prescribed instead: *fire the
board callback on take-over and on Pause as well as on settle, and leave `compileBtn.disabled` while
`playing`.*

**That re-opens the same collision through a different door.** "Add-only" is about the artifact's op
verbs, not about which reflection branch they reach: the histogram is 4 `place.add` · 7
`affordance.add` · 7 `connect`, and only `place.add` calls `place()`. Every one of the seven
`affordance.add` produces a `place-changed`, which is `wrapper.replaceChild(fresh, old)` on the
wrapper's first non-`.stx-grab` child — the compiled component. So *pause → Compile → Resume* watches
compiled primitives replaced by fat markers, and there are seven live opportunities for it, threaded
through the run.

`playing` is therefore the wrong predicate: it is false in states the driver can resume from. What
shipped instead:

- **the compile beat is enabled iff the driver has stopped for good** — settle, take-over, or the
  driver failing to mount at all. `studio-compile.mjs` gains one seam (`setEnabled`, folded into the
  single line that already computes `compileBtn.disabled`); `studio.mjs` blocks the beat immediately
  before mounting the driver and publishes the board through one `publishBoard` on those three paths.
  No new option on `mountReplay`: `onTakeOver` and `get board()` both already existed.
- **the driver's whole transport dies with the handover, not only seek** (`syncControls`). Seek's
  recorded reason — a rebuild would destroy the visitor's arrangement — turned out to be the narrower
  half of a rule that covers all four controls: *the driver does not author onto a canvas it has
  handed over.* Without this, take-over → Compile → Resume reaches the clobber with no Pause involved.
- Pause is deliberately **not** a publish point. It is a state the driver resumes from, and the
  review's failure scenario is a take-over path anyway — the copy says *"the moment you touch the
  canvas it is yours"*, which is not the transport.

### Finding 3 — the prescribed fix could not have worked

"Announce one summary sentence naming the acts" fails for the identical reason N sentences did:
`skipToEnd`'s last `advance` calls `settle()`, which says the completion sentence **in the same
task**, so a summary emitted before it is overwritten and unheard. The acts are folded **into**
`settle()`'s own sentence instead — one `say`, one task, one value — behind an `instant` flag set only
around a synchronous run of beats. The same collapse in a **forward seek** was fixed with it rather
than left as a sibling of the bug, and the autoplay path is unchanged (its acts are heard as they
happen, so it must not repeat them).

### What proves each fix

| Finding | Proof | Mutation |
|---|---|---|
| 1 | `studio-journey` §9 — Compile disabled mid-replay, live on take-over, the whole transport dead, and Compile pressed **mid-replay after a take-over** rendering library primitives for the blocks on the canvas (never the empty card), still un-clobbered two seconds later | removing `setEnabled(false)`, and reverting the transport to seek-only, each go red on their own assertion |
| 2 | `studio-journey` §10 — a press in a route-widened `loading` window is not a take-over, fires no route, and the run still plays through to its own board | restoring `state === "unavailable"` goes red |
| 3 | `studio-journey` §11 — the reduced-motion arrival and the Skip-to-end press each announce a sentence naming the acts, with the autoplay path as the control | removing the `instant` branch goes red |
| 4 | `build-checks` group 16 §7 — the two spans really are different numbers over skipped steps (the sentence is DOM-side; what is pinned is the reason it must name its span) | `source.durationMs = 1` goes red |
| 5 | `build-checks` group 7 — no raw C0 control byte in any of the 13 modules | re-inlining the literal `NUL` goes red |

Every assertion is phrased as resulting DOM or a resulting URL, and every one of them was run against
its own defect before being trusted — the file's own rule, applied to the checks written for it.
