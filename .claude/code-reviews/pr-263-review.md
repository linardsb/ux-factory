# Code Review — PR #263 · `feature/studio-canvas-affordances-217`

**Verdict: REQUEST CHANGES** — one High finding, and it contradicts this ticket's own acceptance criterion.

The deep pass was run by the `code-reviewer` agent in a clean context (the session that wrote the code
cannot scrutinise it), and **every finding below was then reproduced independently** before being
written up — none is taken on the reviewer's word.

Critical: **0** · High: **1** · Medium: **1** · Low: **4**

---

## Validation

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 22 groups (re-run independently by the reviewer too) |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan |
| `node tooling/drift-check.mjs` | ✓ all 12 checks |
| `gen-param-count --check` · `gen-loc-summary --check` | ✓ no drift |
| group 8's SDK-free invariant (`portal/node_modules` moved aside) | ✓ still 22/22 |
| CI `verify` | ✓ pass (21s) |
| CI `visual` | ✓ pass (1m16s) — first run flaked on `roundtrip · saulera`, analysed in a PR comment |
| `studio-journey all` | ✓ chromium 405/0 · firefox 401/0 · webkit 401/0 |
| `vt-verify all` | ✓ 0 failures, 18 `#217` rows — **re-run against the final HEAD** after an audit found the first pass predated three fixes |

A red gate is a finding in itself; there are none. **The High finding below is invisible to every one
of them**, which is the interesting part.

---

## High

### 1 · The context menu does not return focus to the invoker on the pointer path — and the driver row that should catch it is masked

`system/studio-select.mjs:555` (`openMenu(node, e.target.closest?.(".stx-grab") || node)`) · `:365`
(`closeMenu`'s `invoker.focus({ preventScroll: true })`)

`.stx-slot` wrappers carry no `tabindex` — only the 24×24 `.stx-grab` button is focusable. A right-click
that lands anywhere but that small corner target resolves the invoker to the **non-focusable** wrapper,
so `closeMenu()`'s `focus()` is a silent no-op and focus drops to `<body>`.

That directly contradicts the AC — *"Escape closes and **returns focus to the invoker**"* — and the
module's own APG-citing comment at `:362-364`.

**Reproduced independently** on the settled `/factory`, from a fresh page with nothing focused first:

```
focus before right-click: BODY
menu open: 1
after Escape: {"active":"BODY","menu":0}
```

**Why `selectPass` section 6 misses it, and this is the part worth internalising:** the pointer-menu
rows run immediately after the keyboard-menu rows **on the same node**, and the keyboard path's Escape
correctly restored focus to that node's grab handle. A right-click doesn't move focus, so when the
broken pointer path no-ops, focus is *still* on the handle from the earlier, unrelated success. The
assertion passes on residue. The discriminator the row lacks is a **fresh page with focus cleared** —
exactly the shape `studio-journey`'s own three-source proof already uses for injected moves, and which
this row should have inherited.

Section 7's `openAt` helper and both `vt-verify` call sites pass `sel.openMenu(node, node)` directly, so
they carry the same gap, unexercised.

**Fix** — resolve the invoker *inside* `openMenu` so every caller benefits, using
`studio-canvas.mjs:335`'s `:scope >` idiom:

```js
const focusTarget = invoker && invoker.isConnected && typeof invoker.focus === "function"
  ? invoker
  : (node?.querySelector(":scope > .stx-grab") || node);
```

Use the resolved value for the `:389` idempotency check and the `:435` stored `menu.invoker` too, or
they drift apart. Then add a `selectPass` row that right-clicks a slot's **centre** on a fresh page and
asserts focus after Escape is not `BODY`.

---

## Medium

### 2 · A live carry survives a method-card redraft as a phantom gesture — PRE-EXISTING, and #217 makes it matter more

`system/studio.mjs:605-634` (`adoptBoard`) removes every `.stx-slot` but never calls `verbs.cancel()`.
`verbs.cancel()` has exactly one call site in the orchestrator — `:475`, gated on the **compile** beat
only. The `gesture` closure keeps referencing detached nodes; `.is-picked` leaves the DOM with them, so
`carrying()` reports `false` while a gesture is still live. Escape then announces *"Cancelled, Metric 1
back in column 1, row 1."* about a component that no longer exists.

**Not introduced by this PR** — the same shape existed for a single-node carry once #214 shipped
`adoptBoard`. But #217 widens it from one node to a selection **and** makes `studio-select.mjs` the
first module to trust `carrying()` as a cross-module signal, so the gap now has a more consequential
reader. Fix is one line in `adoptBoard` (`verbs?.cancel()` before the removal loop), mirroring the
compile guard.

**Recommend its own ticket**, exactly as the report already did for the dock/Escape collision.

---

## Low

3. **`groupDelta` truncates instead of returning all-or-nothing on a mixed-validity array.**
   `system/studio-verbs.mjs:189-206`. Verified: `groupDelta([{col:1,row:1},{col:NaN,row:2},{col:3,row:1}], 1, 0, new Set())`
   returns **2 entries for a 3-entry input** and does not identity-return. Unreachable today (both call
   sites build entries from live DOM), but it contradicts the function's own stated contract, and group
   13's totality sweep only tests *wholesale*-invalid arrays, never a mixed one — so the gap survives a
   green gate. Fix: `if (list.length !== members.length) return members;` after building `list`, plus
   the mixed-validity case in group 13.
4. **Dead code:** `system/studio-select.mjs:581`'s Escape branch is unreachable — the document
   **capture**-phase listener nulls `menu` before the stage bubble handler runs. Harmless (both call the
   same `closeMenu()`), but it is the *other* path a future debugger would read. Delete or annotate.
5. **`destroy()` doesn't release marquee pointer capture or cancel its pending rAF**
   (`system/studio-select.mjs:676-682`), unlike `studio-verbs.mjs`'s `clearGesture()`. Inert today — the
   rAF callback is guarded, the browser releases capture implicitly, and `destroy()` has no caller.
6. **A driver row overclaims.** `selectPass` section 12's *"…the context menu still opens, navigates and
   closes"* asserts only `menu-item count >= 4` — no arrow key is sent and "closes" is the next row's
   job. Minor, in a file otherwise scrupulous about exactly this.

---

## What's genuinely good

- **The propagation-order engineering is correct, and it was the likeliest place to be wrong.** The
  reviewer hand-traced the four-way interaction — `studio-select`'s capture `pointerdown` on `stage`,
  `studio-verbs`' bubble listener on the same node, `studio-canvas`'s pan handler on the ancestor
  scroller, and `replay-driver`'s capture listener on that same ancestor — and the documented claims
  hold exactly: the `stopPropagation()` suppresses the mover and the pan, and structurally *cannot*
  suppress the take-over. Both sides are pinned by journey rows.
- **The pure layer is total and the identity-return contract holds at both real call sites** (finding 3
  is a contract wrinkle, not a live bug).
- **The mutation sweep is real** — independently re-run and spot-checked against the paths it claims.
- **Token discipline is clean**; the report's account of catching a nonexistent `--spacing-2xs` and a
  raw `rgba()` fallback before shipping checks out against the final CSS.
- **The report's honesty measurably shortened this review.** The R5-premise correction and the
  dock/Escape writeup meant the reviewer spent its time on new ground instead of rediscovering known
  ground. Worth saying because it is the behaviour that made a High finding surfaceable at all.

---

## Recommendation

**Request changes for Finding 1 only.** It is cheap, squarely inside this ticket's own AC, and its
driver row needs the fresh-page discriminator regardless. Findings 3, 4 and 6 are worth folding in while
the file is open. Finding 2 and Finding 5 should not block: 2 is pre-existing and deserves its own
ticket beside the dock/Escape one; 5 is unreachable.

Nothing here is architectural. No bus-contract, token-discipline or inline-style violation was found,
and `action-bus.mjs` is untouched as claimed.

Still outstanding from the report and unchanged by this review: **the real-Safari / real-Chrome manual
pass has not been run.**

---

*Posted as a comment rather than a formal `--request-changes`: GitHub does not accept a formal review
verdict on one's own PR in a solo repo (memory `piv-review-pr-self-approve`).*
