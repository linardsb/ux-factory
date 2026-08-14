# Code review — PR #267 · "the two prototypes as device frames on the studio canvas" (#219)

**Reviewer**: `/piv-review-pr` (fresh context) + the `code-reviewer` agent as a second, independent pass
**Branch**: `feature/studio-protos-frames-219` → `main` · merge-base `f7a04bb` **= `origin/main`**, `mergeStateStatus: CLEAN`
**Size**: 22 files, +3505 / −99 (18 files excluding the four baseline PNGs)

## Recommendation: **REQUEST CHANGES**

One Level-A accessibility defect on a brand-new control, and two places where a comment in shipped code
states something the code does not do. No correctness, security or data issue. The three findings are
small and each has a one-line fix; everything the ticket actually claims is done, and done unusually
well.

Both reviewers reached all three findings independently and neither found anything else.

---

## Findings

### High

#### H1 · `.stx-resize` has no accessible name — WCAG 2.2 **4.1.2 Name, Role, Value (Level A)**

`system/studio-canvas.mjs:443`

```js
const grip = el("button", { type: "button", class: "stx-resize" });
```

No text node, no `aria-label`, no `aria-labelledby`, no `title`. Arming at `:392-395` sets only
`disabled = false` and `aria-describedby`, and **`aria-describedby` is a description, never a name** —
it does not participate in accname computation. The handle's only visual is a CSS `background-image`
corner glyph (`system/studio.css:449-457`), and `background-image` contributes nothing to the
accessible name either (unlike `content:`, which is at least sometimes exposed). The computed name is
therefore `""`.

Its twin does this correctly, four lines below, and out of the create branch for the #231 L3 reason:

```js
// studio-canvas.mjs:454-455
const grab = wrap.querySelector(":scope > .stx-grab");
if (grab) grab.setAttribute("aria-label", `Move ${label}`);
```

**Failure scenario.** A screen-reader user tabs through `/factory`'s canvas. Each frame's first stop
announces "Move Verdant prototype, button" / "Move Fieldwork prototype, button". Each frame's *last*
stop announces "button" and then the shared description ("Enter to start resizing, arrow keys to size
it…"). Two nameless buttons, indistinguishable from each other, on a page whose whole point is
demonstrating UX-engineering craft — and in a module whose header carefully argues SC 2.1.1, SC 2.5.7
and SC 2.5.8 (`studio.css:434-441` even records why the Spacing exception was *not* relied on for
2.5.8). 4.1.2 is the one that got missed.

**Fix** — one line, beside the existing pair, outside the create branch so a re-place cannot leave a
stale name (#231 L3):

```js
const grip = wrap.querySelector(":scope > .stx-resize");
if (grip) grip.setAttribute("aria-label", `Resize ${label}`);
```

**And the gate gap, which is the part worth fixing properly.** No gate can currently see this:

- `tooling/build-checks.mjs` group 24 gates the descriptors and `packHref`; it never touches names.
- `tooling/studio-journey.mjs:4858-4860` collects, for `.stx-resize`, exactly `disabled` and
  `aria-describedby` — and `:4891-4893` asserts `describedBy === "stx-resize-help"`.
- The *same driver* already reads `.stx-grab`'s `aria-label` at `:529` and `:566`.

So the driver knows how to assert an accessible name, and simply does not do it for the new control.
That is this repo's own recorded *"the check that cannot fail"* shape — the check skipped the thing it
tested. Please add the name to `frameState`'s projection and assert it per descriptor (it can be
derived from `FRAMES[i].name`, exactly as the footprint assertions already are), so the fix is gated
rather than merely applied.

---

### Medium

#### M2 · `EXPECTED_NOISE` is **not** the verbatim copy the code says it is, and the paragraph describing it is now false

`tooling/studio-journey.mjs:57-65`

```js
// Copied VERBATIM from tooling/proto-journey.mjs:70 rather than re-derived, so the two drivers agree
// about what the same degradation looks like — and narrow for the same reason it is narrow there:
//   · firefox names the blocked origin, so the Worker's own address identifies it;
//   · chromium and webkit carry no URL, so each is matched on its own refused-CONNECTION wording.
// All three name a connection that was refused, which a 404, a bad MIME type or a real script error
// does not produce — so a genuine failure, including one against some other origin, still fails the
// run.
const EXPECTED_NOISE = /127\.0\.0\.1:8787|ERR_CONNECTION_REFUSED|Could not connect to the server|CORS request did not succeed/;
```

Three problems, in increasing order of importance:

1. **It is not verbatim.** `tooling/proto-journey.mjs:70` is
   `/127\.0\.0\.1:8787|ERR_CONNECTION_REFUSED|Could not connect to the server/` — three alternatives.
   This one has four.
2. **The comment enumerates three branches and the regex has four.** The bullet list claims to
   describe the whole predicate; the fourth alternative is unexplained by the paragraph asserting it is
   fully explained.
3. **The last sentence is now false, and it is the load-bearing one.** `proto-journey.mjs:67-69`
   deliberately excludes exactly this pattern, in its own words: *"so anything else, **including a
   genuine CORS failure against some other origin**, still fails the run."* `CORS request did not
   succeed` is unanchored — it matches a cross-origin failure against *any* host, across the ~15
   listener sites this PR widened the filter to.

**And it may well be unnecessary.** The report's own deviation 11 says firefox reports the refused
Worker as *"Cross-Origin Request Blocked … CORS request did not succeed"* **and names the Worker's
origin** — in which case alternative 1 (`127\.0\.0\.1:8787`) already matches that message and the
fourth alternative is buying nothing.

**Fix**, in preference order: (a) drop the fourth alternative and re-run firefox to confirm
alternative 1 already covers it; or if firefox really emits a second, URL-less message, (b) anchor it —
`/Cross-Origin Request Blocked[\s\S]*127\.0\.0\.1:8787/` or similar — and (c) either way, correct the
"VERBATIM" claim and the "including one against some other origin" sentence so the comment describes
the predicate that is actually there.

The `/studio.html` opener genuinely does keep the stronger contract (`:298-304`, no filter) — that half
of the PR body's claim is accurate, and I verified it.

#### M3 · `catalog.mjs`'s justification for the new `return observer` names a caller that does not exist

`system/catalog.mjs:538-542`

```js
// RETURNED SINCE #219, and both existing mounts ignore it — they live as long as their page does.
// system/studio-frames.mjs does not: studio.mjs's destroy() tears the studio down mid-visit in the
// journey driver, and an observer left watching the head link would go on re-pointing frames that
// no longer exist.
```

`system/studio.mjs` defines no `destroy()`. `mountStudioCore`'s returned `live` object (`:690`) has no
such method, and `getStudio()` (`:151`) is the only handle out. Nothing calls
`mountStudioFrames`'s own `destroy()` (`system/studio-frames.mjs:289-294`) anywhere — `studio-journey`
calls `.destroy()` on `getReplay()` (`:1950`) and on the compile handle (`:3059`, `:3104`), never on the
studio or the frames. `system/studio-docs.mjs:341` states the same fact outright: *"mountStudioCore runs
once per page load, there is no re-mount path and nothing calls destroy()."*

The teardown code itself is correct and cheap, and keeping it is defensible. The API-change
*justification* is the problem: it is stated as an observed fact about a running driver, in a repo whose
entire review discipline is "prove it runs, don't reason about it". Report deviation 2 repeats it.

**Fix**: reword both to the honest version — the observer is returned so `studio-frames.mjs`'s
`destroy()` can disconnect it *if a teardown path is ever wired*, and note that none exists today. Or
wire one, if the journey driver should be exercising it.

---

### Low

None that survived verification.

---

## What is good — and it is a lot

- **The load-bearing design call is right, and it is protected.** Making frames a *fourth grid family*
  rather than a fifth `.stx-slot` keeps `studio-compile.mjs:413/:514`, `studio.mjs:543` and
  `studio.mjs:641` meaning **board wrapper**, all four verified unchanged. `:not([data-stx-frame])`
  appears **nowhere in shipped code** — the four grep hits are all in the plan/report prose. The design
  bought exactly what it was chosen for.
- **The 1×1 default is the right seam.** `spanFrom`/`UNIT_SPAN` make every span-widened function
  byte-identical for a board wrapper, which is what lets build-checks group 13's *existing* cases run
  unedited as the behaviour-preservation proof. Running the old cases first, before adding new ones, is
  the correct order and the report says so.
- **The geometry layer is correct.** Both reviewers checked `clampSpan`'s `MAX_COLS - col + 1` bound,
  `fits()`'s `col + cols - 1 > MAX_COLS` guard, footprint-based (not top-left-only) collision testing in
  `occupancyExcept`/`groupDelta`/`stepSlot`, the per-axis pointer-resize fallback, and the
  move→resize→move undo round-trip. No off-by-one, no path where a real gesture puts a frame off-grid or
  over a peer.
- **The `kind` field was applied exhaustively.** Every handler that needed to branch does — `drop`,
  `cancel`, `restore`'s "did anything change" test, pointerup's `still` test, the scroll sticky-drop
  guard, keydown, `flushPreview`, `clearGesture`, `verbs.cancel()`. The report's "Issues encountered"
  section names the three the plan's table missed and the three more it did not predict; all six are in
  the diff. `restore()`'s `spanOnly` flag and the "restored resize is named as a size" announcement are
  the kind of detail that normally ships broken.
- **`ui.resize` genuinely earns itself** against `studio-flow.mjs`'s and `studio-docs.mjs`'s recorded
  "NO BUS VERB, deliberately". The two reasons given (non-converging input paths; one commit point for
  one history) are the right ones, and `framesPass`'s three-source parity on a fresh page is the proof.
- **`framesPass` is a strong gate.** Announcements counted *per path* with the formula read off the
  implementation (pointer 1, keyboard N+2) rather than guessed; the mixed move·resize·move walked back
  by three Undos in order; hostile `params` proven to clamp rather than reach an attribute as `NaN`; the
  pointer delta derived from the resolved grid after a typed 170px silently no-op'd on firefox; AC #2
  asserted on each frame's own `contentDocument` behind a positive control. Three mutations proven red
  and reverted.
- **The iframe layer is defensively written.** Cross-document access wrapped in `try`/`catch` in both
  `anchorFrame` and `repoint`; `anchorFrame`'s rAF poll bounded at 120 frames with an `signal.aborted`
  early exit; nothing depends on `loading="lazy"`'s timing; `_headers`' `X-Frame-Options: SAMEORIGIN`
  permits the embed.
- **The pixel-gate mask is the right call and costs nothing** — `work.html`'s precedent, and both proto
  pages are still screenshotted standalone, so coverage is unchanged. The mask covers the `iframe`, not
  the wrapper, so a frame rendering at the wrong size still churns the baseline.
- **The report is exemplary.** Fourteen deviations, each argued rather than listed, including the three
  relocated #217 fixtures and the `EXPECTED_NOISE` widening — the two changes most likely to be read as
  weakening a gate. M2 above exists *because* the report was honest enough to disclose the mechanism;
  the code comment simply did not keep up.

---

## Validation

| Gate | Result | Provenance |
|---|---|---|
| `node tooling/build-checks.mjs` | ✅ **24/24 groups** (new group 24 `frames`) | **re-run this session** |
| `node agent-layer/gen-param-count.mjs --check` | ✅ 118 controls, no drift | **re-run this session** |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ 3 groups, no drift | **re-run this session** |
| CI `verify` | ✅ pass | re-checked on the PR |
| CI `visual` | ✅ pass | re-checked on the PR |
| base freshness | ✅ merge-base `f7a04bb` == `origin/main`; `CLEAN` | **re-run this session** |
| `git diff origin/main…HEAD -- proto/ system/device-frame.mjs` | ✅ **empty** — AC #4's premise holds | **re-run this session** |
| `node tooling/studio-journey.mjs all` | ✅ chromium 477 · firefox 473 · webkit 473 | **from the report — not re-verified** |
| `node tooling/vt-verify.mjs all` | ✅ green ×3 | **from the report — not re-verified** |
| pixel gate (pinned container) | ✅ 22 passed, 4 PNGs changed | **from the report — not re-verified** |
| `node tooling/catalog-journey.mjs chromium` | ✅ 33/0 | **from the report — not re-verified** |

The four operator gates were deliberately not re-run: H1 is a defect `framesPass` structurally cannot
see (it asserts `aria-describedby`, never a name), so a three-engine run buys nothing on the dimension
that matters, and the repo's *stale-serve* trap makes an unnecessary run more likely to mislead than to
inform. **After the fixes land, `studio-journey all` should be re-run** — the new name assertion belongs
in `framesPass`, and M2's regex change touches every `/factory` opener in that driver.

## Acceptance criteria (#219)

| AC | Status |
|---|---|
| Both protos render in frames and wear the reader's pack | ✅ `framesPass` §1 + the mid-visit dock swap |
| No nested dock/chrome inside either frame | ✅ asserted on each frame's own `contentDocument`, behind a positive control |
| Resize is a canvas verb: pointer **and** keyboard, announced, undoable | ✅ three-source parity, per-path announcement counts, mixed-sequence undo. ⚠️ the control itself is unnamed — H1 |
| Protos still render standalone and pass their own baselines unchanged | ✅ zero diff under `proto/`; both proto baselines byte-identical |
| At-rest determinism handled by a ready handle, not a timer | ✅ `[data-studio-frames="ready"]` set in a `finally`; content masked, not waited on |
| Frame controls have `param-manifest.json` entries | ✅ 117 → 118, drift-checked this session |

---

## Next step

`piv-fix-review-findings` on this report: H1 (one line + the gate assertion), M2 (regex + two comment
sentences), M3 (two comment rewordings). Then `node tooling/build-checks.mjs` and
`node tooling/studio-journey.mjs all`.
