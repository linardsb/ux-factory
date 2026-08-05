# Review — PR #239 · `feat(208): share codec v2 — the arrangement in the URL, v1 links byte-identical`

**Branch** `feature/studio-share-codec-v2-208` → `main` · **mergeStateStatus** CLEAN (checked before triage)
**Reviewed at** `eb336a0` · 8 files, +1835 −28

**Recommendation: APPROVE.** No Critical, High or Medium findings. Two Low notes, neither blocking.

---

## What I verified, independently of the PR's own claims

This PR's headline claim — *every link already shared stays byte-identical and still restores byte-identically* —
is the kind of claim a gate can assert vacuously, so I did not take `build-checks` green as proof of it.

**1 · The frozen fixtures are genuinely from the pre-#208 encoder.** I restored
`system/build-share.mjs` at `f381af7` (the sha `share-v1-links.json` names in `capturedAt`) into a
throwaway module and ran all five fixtures through the *real v1 code*:

| fixture | branch | v1 decodes | v1 re-encode byte-identical | v2 decodes | v2 arrangement |
|---|---|---|---|---|---|
| full build, imported pack | raw | ✓ | ✓ | ✓ | `null` |
| full build, imported pack | deflate | ✓ | n/a | ✓ | `null` |
| defaults, no pack | raw | ✓ | ✓ | ✓ | `null` |
| defaults, no pack | deflate | ✓ | n/a | ✓ | `null` |
| real chromium capture, one place renamed | deflate | ✓ | n/a | ✓ | `null` |

v1's and v2's decoded build fields deep-compare equal on all five. The fixtures are not the code under
test agreeing with itself — which is exactly what the file's own `$description` promises and what
[#137's lesson](https://github.com/linardsb/ux-factory/issues/137) demands.

**2 · Two of the four mutations, re-run from scratch.** Not read — run:

| mutation | expected | observed |
|---|---|---|
| `v: slots ? SHARE_VERSION : V_BASE` → `v: SHARE_VERSION` | codec group red | **`build codec ✗ 2 failure(s)`** |
| `col <= MAX_COLS && … row <= MAX_ROWS` → `col <= 12 && … row <= 8` | canvas group red | **`build canvas ✗ 1 failure(s)`** |

Both reverted; `git diff --quiet` clean after each. The frozen fixtures are load-bearing, and group 12's
discharged tripwire is a real coupling assertion rather than a restatement of the constants.

**3 · The running-page half, on all three engines.** `build-journey` is operator-run, not CI, so I ran it:

```
build-journey chromium  ✓  157 passed · 0 failed
build-journey firefox   ✓  157 passed · 0 failed
build-journey webkit    ✓  157 passed · 0 failed
```

Matching the PR body exactly, including the new `[6b]` arrangement-pass-through block.

**4 · Hostile-payload probes of my own**, outside the committed battery — `s` with no `k` (including a
`../../evil` slug), `v: 2` with no `g`, and the id-recycling board mutations below. Results in the findings.

---

## Findings

### Low · `v: 2` with no `g` is accepted, and the wire table says it shouldn't be

`system/build-share.mjs:169` documents the field as **`present ⇔ v === 2`** — a biconditional. Only one
direction is enforced: `has("g")` requires `data.v === SHARE_VERSION` (`:428`), but a payload carrying
`v: 2` and no `g` skips the arrangement block entirely and decodes fine with `arrangement: null`.
Confirmed by hand-building one.

Not exploitable, and the return comment at `:486` arguably owns it ("`arrangement` is NULL … for a v2
payload with no `g`"). But it is **untested in either direction** — group 5 tests the reverse near-miss
(`g` on a `v: 1` envelope) and nothing tests this one. In a file where every other edge is either
enforced or has a sentence explaining why it is deliberately not, this asymmetry reads as an omission
rather than a decision.

**Fix (either):** tighten to `if (data.v === SHARE_VERSION && !has("g")) return fail(…)` — `encodeBuild`
never emits that shape, so nothing legitimate is refused; **or** soften the wire table to the actual
one-directional rule and add the accept-side case `clone({ v: 2 })` → `arrangement === null`, so the
behaviour is asserted rather than incidental.

### Low · a stale arrangement can survive a remove-last-then-add on `/build`

`breadboard.mjs:172`'s `nextId` **recycles** the lowest free id, and `addPlace` appends. So:

- Remove a **middle** place, add one → the recycled id lands at a different index →
  `arrangementSlots`' per-index `entry.id !== p[i][0]` check fires → `g` dropped whole. ✓ *(verified)*
- Remove the **last** place, add one → the same id returns to the same index, the length is unchanged,
  and the stale slot silently attaches to a semantically new place. *(verified)*

Consequence is mild — a valid, unique, on-grid cell for a place the sender never positioned, on the
visitor's own board, crossing no trust boundary. But `[6b]`'s assertion is written as *"adding a place
drops the arrangement WHOLE rather than realigning it"*, and that generalisation is only true when the
id sequence shifts. Worth a sentence beside `arrangementSlots`' id check naming the recycling, or a
`[6b]` case, whichever is cheaper. Not a merge blocker, and #210 is the first real producer anyway.

### Nit · `capturedAt` holds a sha, not a time

`tooling/share-v1-links.json:2`. The `$description` and `build-checks`' comment both correctly say
"commit"; only the key name misleads. Ignore or rename on the next touch.

### Checked and clear

- **Envelope audit vs. links in the wild** — v1 only ever emitted `v, a, b, e` (+ `k, s`), every one in
  `KNOWN`. No real link is broken; all five fixtures confirm it.
- **`s` with no `k`** — accepted and genuinely inert: `slug` is read only inside the `k` branch, so even
  `"../../evil"` reaches nothing. Pre-existing v1 behaviour, not introduced here.
- **`__proto__`** — the flipped expectation is correct and the PR's note ① is right about why:
  `JSON.parse` makes it an own data property, `Object.keys` sees it, the audit refuses it. Keeping **both**
  non-pollution assertions on the rejecting path is the right call.
- **`restoredArrangement` lifecycle** — `restoreBuild` is called exactly once at boot (`build-keep.mjs:373`),
  there is no reset control, and `restoreBuild`'s destructure (`build-questions.mjs:384`) drops the extra
  field, so `arrangement` genuinely never enters `BUILD_CHANGE`. The header comment's claim holds.
- **Coordinate battery** — `NaN`, `Infinity`, `"4"`, `1.5`, `null`, `true`, wrong-arity pairs, `g` as an
  object/string, duplicate cells, ±1 on each axis, both length directions. I found no gap.
- **CLAUDE.md** — header discipline present and unusually thorough on both changed modules; no new deps;
  vanilla; generators regenerated (`gen-loc-summary --check`, `gen-param-count --check` both clean); honesty
  contract respected (fixtures state provenance, deflate identity claimed only where it is true).
- **`Closes #208`** present in the PR body — the trailer, not just the title.
- Plan and report are both committed on the branch, per CLAUDE.md's same-PR rule.

---

## Validation

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | **✓ all 15 groups pass** (tamper 54 cases) |
| `node tooling/build-journey.mjs all` | **✓ 157 · 157 · 157 passed, 0 failed** (chromium · firefox · webkit) |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift |
| `node agent-layer/gen-param-count.mjs --check` | ✓ 94 controls, no drift |
| `node --check` × 4 touched files | ✓ |
| mutation re-run (2 of the report's 4) | ✓ both red, both reverted clean |
| CI `verify` · CI `visual` | **✓ both pass** (`gh pr checks 239`, run 31006802571) |

CI's `visual` job passing is what settles note ③ — not the local `update:docker` run. This branch is not
`feature/v3-*`, so the D11 freeze does not apply and that green is real.

On note ③ (no VR baseline rewritten): the reasoning is sound and matches the known repo posture that
`maxDiffPixels: 100` swallows a few changed digits, and `gen-loc-summary --check` is what actually gates
the number's correctness. Accepting it means the two `approach` baselines now carry `23,200` where the page
renders `23,300` — harmless, and it will be absorbed by the next regen. Flagging it only so the next person
to run `update:docker` on `approach` is not surprised by a digit they did not change.

## What's good

The frozen-fixture design is the strongest thing here. A version bump on a codec whose only persistence
*is* the URL is exactly where a repo talks itself into re-synthesising the "old" payloads from the new
encoder, and this one didn't — it froze real captures, on their own commit, before the source moved, and
then proved they were load-bearing by mutating the encoder until they went red. The positional `g` is the
other good call: an entire tamper class isn't refused, it's *unrepresentable*, and the battery is honest
about testing coordinates rather than accidentally re-testing the length rule. The clamp-vs-reject
divergence being asserted in **both** directions, in the two groups that own the two callers, is the kind
of thing that stops a later reader "fixing" one into the other.

---

**Recommendation: approve and merge.** The two Low notes are follow-up material — the `v: 2`-without-`g`
one is a genuine two-line tightening whenever #209 or #210 next opens this file.
