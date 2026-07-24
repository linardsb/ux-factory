// system/intake-beat.mjs — hand-written canon (this repo; not generated).
// Beat 2a (the home intake): registers #beat-intake on the v3 spine seam and mounts the SHARED
// factory wizard (system/factory-intake.mjs) as a Verdant-only, three-question configuration via
// initIntake — configured, never forked. Brand is #74's beat; the Manipulation Matrix is #75's.
// #73 asks the three non-brand axes (density · reward · frequency) and shows the live
// frequency→verdict line as its whole ethics presence on home. (epic #70 ticket #73; PRD §6.1
// beat 2a / D4; architecture "Wizard rewrite = rewrite inside factory-intake.mjs behind the seam".)
//
// Boot: imports registerBeat from spine.mjs (the shared singleton registry #72 exposes) + the
// wizard's initIntake/SCENARIOS. index.html marks its #factory-wizard data-intake="external", which
// stands down factory-intake's import-time auto-init so this beat owns the mount. activateOn:'load'
// keeps the wizard deterministically mounted for the VR capture — the mount is below the fold, so
// 'load' avoids a scroll race the observer would introduce. Node-import-safe: with no DOM the seam
// no-ops (registerBeat returns undefined) and initIntake never runs.

import { registerBeat } from "./spine.mjs";
import { initIntake, SCENARIOS } from "./factory-intake.mjs";

// The three non-brand axes, in brief order. brandColor is seeded from the scenario default (#2F7A4D)
// but not asked here — that input is #74's #beat-brand. answers still carries every default, so
// derive() runs on the full axis set no matter that home asks only three.
const HOME_AXES = ["density", "rewardType", "frequency"];

// The latest home axis set, published by the wizard on every run() (mount + each change) via the
// additive onAnswers seam. Beat 3 (the peak, #75) reads this to build the screen under the visitor's
// live density/reward/frequency — falling back to its own defaults until the wizard has run once.
// A plain module-level cache: intake-beat is a singleton, imported by both its own <script> tag and
// by peak.mjs, so the two share this value. Null before the wizard mounts (peak falls back).
let homeAnswers = null;
export function getHomeAnswers() {
  return homeAnswers;
}

registerBeat("beat-intake", {
  effect: () =>
    initIntake({
      scenarios: { verdant: SCENARIOS.verdant }, // Verdant-only: no toggle anchor on home, so the toggle render no-ops
      defaultScenario: "verdant",
      askedAxes: HOME_AXES,
      onAnswers: (a) => { homeAnswers = a; }, // #75: publish the live axes for the peak
    }),
  activateOn: "load",
});
