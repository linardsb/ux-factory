# Code Review — PR #228 · studio canvas manipulation (#205)

**Branch**: `feature/studio-canvas-manipulation-205` → `main` · **State**: OPEN, `mergeStateStatus: CLEAN`
**Scope**: 13 files, +3014 / −31 · **Reviewed against**: `CLAUDE.md`, `.claude/plans/studio-canvas-manipulation-205.md`, `.claude/reports/studio-canvas-manipulation-205-report.md`

## Recommendation

**Approve in substance.** Nothing Critical or High. The structural call the ticket turns on — both input
paths emit one `ui.move` and a single consumer applies it — is implemented as written, and I verified
it end to end rather than taking the report's word for it.

Posted as a comment rather than a formal approval: solo repo, self-approval isn't available.

Two items are worth folding in **before merge** because they are cheap and because they are the PR's own
standard (M1, M2 — four lines of test). The rest are **must-resolve-before-#206**, not before-merge.

## Validation — re-run independently, not taken from the report

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ **all 13 groups**; group 7 still `1 inline-style write across 10 modules` |
| `node tooling/studio-journey.mjs all` | ✓ **77 / 77 on chromium, firefox and webkit** (re-run here) |
| `node tooling/vt-verify.mjs all` | ✓ all three engines |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan |
| `gen-loc-summary` / `gen-param-count` / `gen-system-graph` `--check` | ✓ no drift (param count 85, unchanged) |
| `npm run update:docker` | **trusted, not verified** — Linux baselines can't be reproduced here. Two PNGs moved and `approach` renders the loc-summary numbers that changed, so it is consistent |
| SC 2.5.7 click-move-click, driven by hand ×3 engines | ✓ **the feature works** (see M3 — the gap is the driver, not the code) |

The report's claims check out. `system/action-bus.mjs` is confirmed untouched.

---

## Findings

### M1 · Medium — `stepSlot`'s `clampSlot(from)` has no detector; the mutation survives group 13

`system/studio-verbs.mjs:97` · `tooling/build-checks.mjs:1737-1760`

Replacing `const start = clampSlot(from);` with `const start = from;` leaves **all 13 groups green**. No
case in group 13 passes an off-grid `from`, so the module's stated guarantee ("Never returns an occupied
or off-grid slot") is unproven on that input.

The code is correct — every real caller feeds an on-grid slot — so this is a coverage gap, not a product
bug. But it is exactly the class this PR spent its mutation duty eliminating, and this one was missed.

```js
// alongside the existing table
ok(deep(stepSlot({ col: 99, row: -3 }, undefined, occ())) === deep({ col: MAX_COLS, row: 1 }),
  "stepSlot did not clamp an off-grid `from` before answering");
```

### M2 · Medium — `hitSlot`'s band boundary is unpinned; the off-by-one mutation survives

`system/studio-verbs.mjs:133` · `tooling/build-checks.mjs:1786-1799`

Changing `if (n < edge)` to `if (n <= edge)` leaves group 13 green. On the synthetic geometry
(three 100px tracks, 20px gap) the real boundary is **120**, and no case sits on it:

```
x=119 → col 1   x=120 → col 2      (correct)
x=119 → col 1   x=120 → col 1      (mutant — every track boundary shifts by one)
```

The group's summary line claims "hitSlot bands, the gap rule", and the `[99, 99, …]` case is commented
"right up to its edge" — 99 is not the edge. Two rows fix it:

```js
[119, 119, { col: 1, row: 1 }, "the last pixel before a track start still belongs to the track before"],
[120, 120, { col: 2, row: 2 }, "…and the first pixel of a track belongs to that track"],
```

### M3 · Medium — SC 2.5.7's single-pointer path is never driven, and two driver comments say it is

`tooling/studio-journey.mjs:487,499`

The module header and `studio.html`'s copy both claim the click-move-click path as WCAG 2.2 SC 2.5.7
compliance. **No driver ever completes that gesture** — and the only two places that claim coverage are
factually wrong.

The press at `:490-493` is at the **wrapper centre**, not on `.stx-grab`, so `fromHandle` is false and
`pointerup` takes the `drop("pointer")` branch. Probed on the running page:

```
after body-centre click, gesture = null          ← :487 "the pick-up half … starting cleanly" is false
after HANDLE click,      gesture = { sticky: true, fromHandle: true }
```

So `:499`'s `Escape` ("that press left the node picked up (sticky) — put it down") is a no-op on a
gesture that already ended.

**The feature itself is fine** — I drove the full click-move-click by hand on all three engines, against
the drag path to the same cell as a control:

```
chromium/firefox/webkit:  DRAG  s1 {1,1} → {8,3} ✓    CLICK  s1 {1,1} → {8,3} ✓
```

Fix: correct the two comments, and add a case that completes the gesture and asserts `arrangement()`,
the way the drag and keyboard cases already do. Until then the criterion the header is most careful
about is the one criterion nothing runs.

### M4 · Medium — history is seeded at mount, so a component placed *after* mount gets a phantom undo

`system/studio-verbs.mjs:321` (`createHistory(snapshot())`) · `:293-305` (`restore`)

`restore()` silently `continue`s past ids the snapshot doesn't know, and the seed is taken at mount. But
`:515-517` advertises post-mount `place()` as the **normal** case — it is the stated justification for
delegating listeners on `stage` ("by the harness, by studio-journey's seam, by vt-verify's probe and by
everything #206 will do").

Reproduced on the running page — place a **new** component after mount, move it, undo:

```json
{ "seeded": false, "moved": "9", "canUndo": true,
  "afterUndo": "9",  "said": "Nothing to undone.",
  "canUndoAfter": false, "canRedoAfter": true }
```

The undo consumes the entry, the node does not move back, Undo greys out, and the history is left with a
phantom step.

**Not reachable today** — `studio.html:135-142` mounts after the placement loop (and says so), and both
drivers only re-place *existing* wrappers, which are idempotent and keep their id. So: Medium-latent. But
tightening the harness comment is the wrong fix, because it contradicts the delegated-listener rationale.
The honest fix is a re-seed seam — `place()` calling `getVerbs()?.reseed()`, or `restore()` refusing a
snapshot whose id set doesn't match the stage.

### M5 · Medium — `.stx-grab` is 18×18 CSS px (WCAG 2.2 SC 2.5.8 minimum is 24×24)

`system/studio.css:126-127`

The module reasons explicitly about SC 2.5.7 and SC 2.1.1 and records which is which; the sibling
criterion for the control it just added goes unmentioned. The Spacing exception does not obviously save
it: `.stx-slot > :not(.stx-grab) { flex: 1 1 auto }` means the component fills the slot, and one library
shape renders as a bare `<button>` — an adjacent target directly under the handle, inside the 24px
circle.

This matters beyond the harness: `place()` is the shipped substrate, so the 18px handle reaches a public
page in #206 unless it changes here. It is one CSS value, or one recorded decision in the header's voice.

### L1 · Low — "Nothing to undone." / "Nothing to redone."

`system/studio-verbs.mjs:365` — `canvas.say(\`Nothing to ${word.toLowerCase()}.\`)` receives `"Undone"` /
`"Redone"`, not `"Undo"` / `"Redo"`. Reproduced above. The two correct strings live in the `offUndo` /
`offRedo` guards at `:374,378`; this is the `restoreVerb` fallback. Pass the verb, not the past participle.

### L2 · Low — `place()` renders an affordance whose behaviour and IDREF live in another module

`system/studio-canvas.mjs:280-292` unconditionally creates a `.stx-grab` button and
`aria-describedby="stx-move-help"`, but `#stx-move-help` and every listener are created by
`mountCanvasVerbs`. Canvas without verbs ⇒ a dead tab stop on every component plus an unresolvable IDREF.

Worth noting as a gate hole too: neither group 13 nor `studio-journey` can see this, because both always
mount both.

### L3 · Low — the handle's accessible name goes stale on re-place

`system/studio-canvas.mjs:270-292`: `wrap.setAttribute("data-stx-name", label)` runs on every call, but
`aria-label: Move ${label}` is created inside `if (!existing)`. `place(node, { name: "New name" })` on an
existing wrapper updates the announced name and leaves the accessible name pointing at the old one.
Move the `aria-label` write out of the branch — exactly the desync #206 hits when it re-labels.

### L4 · Low — a hand-written count in group 13's summary

`tooling/build-checks.mjs:1849`: `stepSlot over ${12} cases`. The repo's own rule is that counts are
measured, not hand-written (that is what `loc-summary` and `param-count` exist for). Hoist the table to a
const and use `.length`.

### L5 · Low — `target.component` carries the display label, not the vocabulary shape

`system/studio-verbs.mjs:393`: `component: nameOf(gesture.node)` yields `"Metric 1"`, where elsewhere on
the bus `component` reads as the shape (`metric-tile`). Harmless now — the one consumer reads only
`target.id` — but #209's replay driver is explicitly named as inheriting this contract.

---

## What's genuinely well done

- **The bus-as-drive-path call is real, and the driver proves it the only way that counts.** The
  three-source assertion runs the injected `source:"agent"` action on a **fresh page with no gesture
  first** — that freshness is the whole discriminator, and a mover that applied directly and merely
  emitted for observers would pass the other two and fail there.
- **The hit-test in three conditions** (at rest, panned, zoomed). R1 and R2 going red *only* in their own
  condition is the independence that makes them worth having; a single at-rest run passes with both
  coordinate terms missing.
- **The two bugs the drivers caught** — the discarded rAF preview frame and Escape unable to reach a
  body-drag — were invisible in the source. That is the justification for these drivers existing, paid in
  full.
- **Three of the author's own checks could not fail, and the checks were fixed rather than the
  expectations** — including the `JSON.stringify(v, keys)` replacer trap that had made *every*
  deep-compare in group 13 vacuous. Finding and naming that is worth more than the group it fixed.
  M1 and M2 above are the same sweep continued, not a different standard.
- **Listener hygiene is clean.** Every DOM listener including the `document`-scoped Escape goes through
  one `AbortController`; `destroy()` also unsubscribes the three bus handlers and clears the `live`
  singleton. No leak path found.
- **`grid-auto-rows` → `grid-template-rows`** is correctly diagnosed and, more to the point, its
  knock-on to `fit()` was **flagged in the report rather than left to be discovered**.
- **Token discipline holds** — every new colour, radius and type value in `studio.css` resolves through a
  contract token; the geometry literals match the file's existing convention.
- **CLAUDE.md was made true rather than appended to** — the map claimed 11 groups and had no studio
  entries at all.

## Deviations

All eleven documented deviations in the report are intentional and reasoned; none is a finding. The
`param-manifest.json` no-op is correct and consistent with #204's precedent. I found no undocumented
divergence from the plan's task list.
