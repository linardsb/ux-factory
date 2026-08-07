// tooling/inp-observer.mjs — the INP measurement helper for tooling/studio-journey.mjs's perf pass
// (epic #202, ticket #213; folds the closed #177's INP scope).
//
// OBSERVER_INIT is page-side source for context.addInitScript(), so the observer is installed
// before any page module evaluates and NOTHING ships: #177's "small observer hooks where needed"
// predates the studio, and putting measurement code on zero-dep pages for a gate only the operator
// runs would be the wrong trade. The `window.__studioINP` global is acceptable HERE and only here:
// it is driver-injected instrumentation on a driver-owned page (busRecord's `window.__busLog` is
// the standing precedent in studio-journey itself) — the never-a-window-global rule
// (proto-journey.mjs's header) is about PRODUCT seams, and there is no product module to export
// from because no product module exists at measurement time.
//
// The two pure functions are separate from the driver so the perf pass's self-test control can
// drive them synthetically (memory `check-that-cannot-fail`: run the comparator, don't grep it).
//
// Semantics, from the Event Timing API + web.dev's INP definition, probe-verified on all three
// engines 2026-08-07 (the plan's NOTES):
//   · `durationThreshold` floors at 16 ms — an interaction faster than that yields NO entry, which
//     is a PASS (latency < 16 ≤ budget) but must be distinguished from a dead observer by the
//     driver's calibration click, never assumed.
//   · one INTERACTION is every entry sharing a non-zero `interactionId` (pointerdown/pointerup/
//     click share one id; keydown/keyup another); its latency is the MAX duration in the group.
//   · id 0 rows are hover/scroll noise and mouse-alias events — not interactions, dropped by spec.
//   · only a PerformanceObserver sees event timing; performance.getEntriesByType("event") is
//     empty on all three engines even while the observer receives entries.

export const OBSERVER_INIT = `
  window.__studioINP = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__studioINP.push({
      name: e.name, duration: e.duration, interactionId: e.interactionId,
      startTime: e.startTime, processingEnd: e.processingEnd,
    });
  }).observe({ type: "event", durationThreshold: 16, buffered: true });
`;

// Raw entries → one row per interaction: drop id-0 noise, group by interactionId, latency = the
// MAX duration in the group (web.dev's INP rule), sorted by when the interaction started.
export function summarize(entries) {
  const groups = new Map();
  for (const e of entries || []) {
    if (!e || !e.interactionId) continue;
    const g = groups.get(e.interactionId) || { interactionId: e.interactionId, latency: 0, startTime: Infinity, events: [] };
    g.latency = Math.max(g.latency, e.duration || 0);
    g.startTime = Math.min(g.startTime, e.startTime ?? Infinity);
    g.events.push(e.name);
    groups.set(e.interactionId, g);
  }
  return [...groups.values()].sort((a, b) => a.startTime - b.startTime);
}

// The comparator the driver asserts with: the over-budget subset, empty when everything is inside.
export function violations(interactions, budgetMs) {
  return (interactions || []).filter((i) => i.latency > budgetMs);
}
