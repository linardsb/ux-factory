# Plan — #273: the minimap's keyboard affordance rides a visible caption via aria-describedby

## The problem
`system/studio-minimap.mjs` mounted the map as a focusable role-less div carrying `aria-label`
(MAP_LABEL). ARIA 1.2 prohibits naming on the generic role, so the widget's entire
keyboard-affordance statement — click-to-jump, arrow-key panning, Home — was formally not exposed.

## The decision (owner's call, made before this ticket started)
Take the aria-describedby caption direction — the `#stx-move-help` idiom
(`system/studio-verbs.mjs:568-575`): one static visible `<p>` under the map, referenced by the
map's `aria-describedby`, which is permitted on every role. Visible to sighted readers too — the
idiom's whole point.

**Rejected alternative, recorded in the module header:** `role="application"`. It strips native
reading semantics inside the element and is a heavy hammer for one small widget.

**The aria-label's fate:** dropped, not shortened. A short name on a generic is the same formal
violation as a long one; the visible h3 "Minimap" already names the panel; what focus needs
exposed is the affordance, and the description now carries it. Recorded as call 6 in the header.

## The wiring
- `system/studio-minimap.mjs`: header call 6 (the decision + the rejected alternative + the
  label's fate); `MAP_LABEL` becomes `MAP_HELP` (the affordance tail only — no "Minimap." prefix,
  the h3 names the panel); the map div gains `aria-describedby="stu-map-help"` and loses
  `aria-label`; a visible `<p class="stu-map-help" id="stu-map-help">` is appended after the map
  (`mount.append(title, map, help)`); `destroy()` removes it. Mount-path only — the pure layer
  build-checks group 26 drives is untouched.
- `system/studio.css`: one rule in the #221 minimap block, `.stu-map-help`, byte-matching
  `.stu-layers-help`'s declaration (margin 0, `--type-caption`, `--color-fg-muted`). Tokens only,
  zero inline styles, no new hand-mirrors.
- `tooling/studio-journey.mjs` minimapPass: ONE new row — the #219 resolving-IDREF shape
  (framesPass's `#stx-resize-help` row) — asserting `#stu-map-help` exists, carries the affordance
  sentence, and is exactly what the map's `aria-describedby` names. It pins the wiring, not the
  SR semantics (no journey assertion can see SR output; the issue records this).

## Gates
- `node tooling/build-checks.mjs` → 27/27 (group 26 unedited and green).
- `tooling/studio-journey.mjs all` (three engines) against a serve confirmed to serve this tree.
- VR baselines: the caption is at-rest visible on /factory, so factory-neutral + factory-saulera
  regen via `npm run update:docker` from the clean committed worktree. loc-summary: only the
  grand total flips (38600 → 38700), no group number — approach baselines stay put.
