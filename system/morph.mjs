// system/morph.mjs — hand-written canon (this repo; not generated). The same-document
// view-transition wrapper (epic #164 — docs/epics/prototyping-feel-uplift.architecture.md;
// ticket #171; .claude/plans/build-vt-morphs-171.md).
//
// One call: morph(mutate) runs `mutate` inside document.startViewTransition where the engine and
// the reader both allow it, and runs it plainly everywhere else. The dock.mjs:251-267 idiom,
// lifted into a module because /build needs it in three places that can call each other.
//
// WHY A SHARED `active` FLAG AND NOT THREE INLINE WRAPPERS. BUILD_CHANGE dispatch is synchronous,
// so a breadboard commit's update callback runs pattern-render's and build-keep's listeners INSIDE
// itself. Per spec a startViewTransition called while another is in flight SKIPS the in-flight one
// — so three inline wrappers would kill the board morph on exactly the edits that also rename the
// pattern, which is the flagship moment. The flag suppresses the nested call into a plain mutate,
// and one coherent transition captures board + pattern + verdict + keep together.
//
// Interaction-driven callers ONLY (never mount seeds, never the BUILD_CHANGE restore path): boot
// must not morph, because the visual-regression gate captures at load and a share-link restore is
// load-time too.
//
// Node-import safe: every global is referenced inside the function body, because
// tooling/build-checks.mjs Node-imports every module that calls this one.

let active = false;

export function morph(mutate) {
  // Three ways out, all of them ending in the same synchronous mutation the caller would have run
  // anyway: a nested call (see above), the reader's own reduced-motion setting, and an engine
  // without the API. `typeof matchMedia` guards the last of those in a non-browser host.
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (active || reduce || !document.startViewTransition) {
    mutate();
    return Promise.resolve();
  }

  active = true;
  const vt = document.startViewTransition(mutate);
  // A skipped transition (hidden document, engine bail-out) rejects both handles; the mutation
  // itself still ran, so swallow them rather than leave unhandled rejections in the console.
  // Firefox rejects .ready in that case, so both are covered (dock.mjs:260-266).
  vt.ready.catch(() => {});
  vt.finished.catch(() => {}).finally(() => { active = false; });
  // Settled = the DOM is mutated, not the animation is over — callers that need to read the new
  // state must not wait out the morph. updateCallbackDone is exactly that moment.
  return (vt.updateCallbackDone || vt.finished).catch(() => {});
}
