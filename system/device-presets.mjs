// system/device-presets.mjs — hand-written canon (this repo; not generated). The device width table
// the canvas's frames size against (epic #295 ticket #302; .claude/plans/
// canvas-swap-grid-retired-free-substrate-302.md, Task 4.1).
//
// ONE TABLE, ONE READER TODAY AND MORE LATER, which is why it is its own module rather than a const
// inside the applier. system/canvas-ops.mjs's `frame.size` reads it to turn a preset NAME into a
// width; the studio's own resize gesture works in px and needs none of this; and the handoff pack's
// later "which widths did this design get looked at" claim will read the same table rather than a
// second copy. A const in the applier would have made the applier the place a width lives, which is
// the module that should know least about pixels.
//
// THE NAMES ARE THE CONTRACT, NOT THE NUMBERS. A frame records its preset AND its width, so a table
// edit moves new frames and leaves committed ones alone — a document is a record of what was
// designed, and silently re-sizing yesterday's frames because the table changed would rewrite it.
//
// WHY THESE FOUR. 390 is the iPhone 14/15 logical width and the commonest phone target; 430 its Pro
// Max sibling, which is the width a "does this still work on a big phone" check wants; 834 the iPad
// portrait width; 1440 a common desktop breakpoint and the width tooling/studio-journey.mjs drives
// this canvas at. (NOT the pixel gate's: that captures at 1280, and 1440 appears nowhere under
// tooling/visual-regression/ — PR #432's F14.) Four is deliberately
// short — a table nobody can hold in their head becomes a menu nobody reads.
//
// Node-import safe: data only, no DOM, no import of its own.
export const DEVICE_PRESETS = Object.freeze({
  phone: 390,
  "phone-lg": 430,
  tablet: 834,
  desktop: 1440,
});

// The preset names, frozen, so a caller can offer them without walking the object and without being
// able to widen the table by pushing at the array it was handed.
export const PRESET_NAMES = Object.freeze(Object.keys(DEVICE_PRESETS));

// THE BOUNDS OF A FREE WIDTH (#306), for frame.size's `width` form. 320 is the narrowest phone still
// in use (the iPhone SE's logical width) and 2560 a wide desktop. They exist so a free width outside
// them is REFUSED BY NAME rather than clamped silently, and the canvas page's numeric input reads the
// same two numbers rather than a copy of them.
export const WIDTH_MIN = 320;
export const WIDTH_MAX = 2560;

// presetWidth(name) → a number, or null. NULL RATHER THAN A DEFAULT, deliberately: the applier
// refuses an unknown preset BY NAME, and a function that quietly answered 390 for a typo would make
// that refusal unreachable and put a phone-width frame where the author asked for a tablet.
export function presetWidth(name) {
  return Object.hasOwn(DEVICE_PRESETS, name) ? DEVICE_PRESETS[name] : null;
}
