# Plan — four deferred findings: #225, #231, #232, #236 (epic #202)

Four review findings deferred from PRs #224, #228 and #235, taken together because they are all
contracts #209's replay driver inherits. Two issues were folded first — #237 into #236 (same module,
same "the beat survives something" concern) and #226 into #225 (same tokenizer/envelope, same
build-checks group). #231 and #232 stay separate: same review and same epic, different modules and
different urgency.

## The four, and the decision each one needed

### #236 (+#237) · `system/studio-compile.mjs`

Unreachable from `system/studio.mjs` today, which never calls `destroy()`. It matters because
`destroy` is on the exported handle and #209 drives the beat through `getCompile()`.

- `destroyed` flag; `ac.signal` on the vocabulary fetch; a liveness check after EVERY await in
  `compile()`; and a pending `wait()` **resolved** on teardown rather than merely cleared — that
  promise never settled, so the frame parked forever.
- `loadVocabulary()` stops memoizing the ERROR. The success is still memoized; the header already
  documented it that way, so code and comment disagreed.
- **Gate**: `tooling/studio-journey.mjs`, driving `destroy()` through `getCompile()` — never a
  `window.__` global. build-checks' pure layer cannot reach any of this (no DOM, no fetch under
  Node), and the report says so rather than adding a check that greps the source.

### #225 (+#226) · `system/board-ops.mjs` + `tooling/board-op.mjs`

- **The apostrophe: the GRAMMAR option, not the prompt one.** A clause in `buildTask` /
  `PIV_BUILD_SYSTEM` would make the committed trace's recorded `task` diverge from the code that
  emits it, and could only land honestly with a paid re-record run. Extending `tokenize()` to model
  bash's segment concatenation (`'…'\''…'`) needs none.
- **The envelope**: exact, not minimal — but checked in `parseOpCommand`, not `checkOp`. See the
  report: tightening `checkOp` broke the committed replay artifact, whose ops carry `atMs`, `phase`
  and `fromStep` around the same core.
- **The CLI path with a space**: the argv round-trip through `parseOpCommand` is a deliberate design
  property and stays. The re-join now uses the grammar's own quoting (`shellQuote`).
- **Gate**: three new `tooling/build-checks.mjs` group 11 cases.

### #231 · `system/studio-canvas.mjs`, `place()`

- **L3**: the `aria-label` write moves out of the `if (!existing)` branch, beside the unconditional
  `data-stx-name`. `studio-compile.mjs`'s `applySwap` still writes it — checked, and it is not a
  workaround for this bug: that swap renames a wrapper in place and never calls `place()`.
- **L2**: a canvas mounted without `mountCanvasVerbs` handed out a dead tab stop and an unresolvable
  IDREF. The handle is born disabled and undescribed; `mountCanvasVerbs` arms it, passing the id of
  the instructions element it owns.
- **Gate**: a studio-journey case that mounts the canvas ALONE — the hole the finding named.

### #232 · `system/studio-verbs.mjs`

`target.component` carried the display label where the rest of the bus reads it as the vocabulary
shape. Of the two acceptable outcomes, take the first: carry the shape, give the label its own key.
The shape is RECORDED by the placer (`data-stx-component`), never derived, and is OMITTED where
there is none — /factory moves fat-marker blocks, and naming one would invent a vocabulary entry.

## Constraints held throughout

- Every fix proven by MUTATION: break the source, run the gate, confirm the right red, restore.
- No at-rest paint change; pixel baselines deliberately not re-taken.
- Gates: `build-checks`, `drift-check`, `token-lint`, `studio-journey all`, `vt-verify all`.
