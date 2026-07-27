// system/pattern-rules.mjs — the committed rules that turn a breadboard into a named pattern
// (epic #134, ticket #137; .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.4,
// .claude/plans/build-pattern-render-keep-rail.md).
//
// This file is the argument. /build tells a visitor that a pattern is named by rules they can
// read, so the rules have to be readable — one file, every rule written out, the way
// system/derive.rules.mjs is the documentation for the derivation engine and breadboard.mjs:97
// is the documentation for the draft. Nothing here calls a model, at view time or any other time.
//
// DEFINITIONS ONLY, in the sense CLAUDE.md holds a scenario's computeRules to: a rule here defines
// what a SHAPE is ("an entry place whose affordances all lead somewhere else is a menu of
// destinations"). No rule says "these tiles answer this question" — the slot derivations below
// count what is on the board and nothing else, because a number this page did not count is a
// number this page invented, and that is the one thing it promises not to do.
//
// PURE, and deliberately import-free: no DOM, no engine, no store. `node -e` runs it, and
// tooling/build-checks.mjs is the committed gate that does.

// The five patterns. `inLibrary` is a claim about THIS repo's component vocabulary
// (handoff/verdant/vocabulary.json), not about the pattern — and it is why the page can render two
// of them and must honestly refuse to fake the other three. `needs` says what it would take, in
// the reader's terms rather than in component names they have no reason to know.
export const PATTERNS = Object.freeze({
  dashboard: Object.freeze({
    id: "dashboard",
    label: "Dashboard",
    definition: "One place that shows the state of everything, read at a glance and acted on from there.",
    inLibrary: true,
    needs: null,
  }),
  queue: Object.freeze({
    id: "queue",
    label: "Queue",
    definition: "A list worked through one item at a time, where the next thing to do is the top of it.",
    inLibrary: true,
    needs: null,
  }),
  feed: Object.freeze({
    id: "feed",
    label: "Feed",
    definition: "A stream of what is new, newest first, which is never finished and never has to be.",
    inLibrary: false,
    needs: "a feed needs a post component with an author, a timestamp and a body. This library has none yet",
  }),
  onboarding: Object.freeze({
    id: "onboarding",
    label: "Onboarding",
    definition: "A short series of steps with a start and an end, where progress through it is the point.",
    inLibrary: false,
    needs: "onboarding needs a step component that carries its position in a sequence and whether it is done. This library has none yet",
  }),
  settings: Object.freeze({
    id: "settings",
    label: "Settings",
    definition: "A menu of destinations: a place whose whole job is taking the user somewhere else.",
    inLibrary: false,
    needs: "settings needs a row component that pairs a label with a control and its current value. This library has none yet",
  }),
});

// The most slots any pattern renders. The same ceiling breadboard.mjs puts on places and on
// affordances per place (MAX_PLACES / MAX_AFFORDANCES, both 6), so nothing can ever be dropped for
// being over budget — the cap is here as the stated bound, not as a working truncation.
export const SLOT_MAX = 6;

// Rule 1's table: each `shape` option names one candidate pattern. Four options, four patterns —
// the fifth has no answer that produces it, which is what rule 2 is for.
const SHAPE_PATTERN = {
  overview: "dashboard",
  worklist: "queue",
  stream: "feed",
  steps: "onboarding",
};

// The same four options in the rule's own voice, so a reason reads as a sentence rather than as a
// value out of an enum. Mirrors build-questions.mjs's `short` forms; kept here rather than imported
// so this file keeps having no dependencies at all.
const SHAPE_LABEL = {
  overview: "one place that shows the state of everything",
  worklist: "a list to work through, one item at a time",
  stream: "a stream of what is new",
  steps: "a short series of steps",
};

// The hub override's threshold. Four is the point where a place stops being a screen with some
// links on it and starts being a menu: fewer than four and "Overview with three ways out" is the
// truer description.
const HUB_MIN_AFFORDANCES = 4;

const affordancesOf = (place) => (place && Array.isArray(place.affordances) ? place.affordances : []);

// A board with nothing on it. Zero places is the obvious case; one place with no affordances is
// the same emptiness one edit later — a single box with nothing to act on names no pattern either.
function isEmptyBoard(board) {
  const places = (board && Array.isArray(board.places)) ? board.places : [];
  if (places.length === 0) return true;
  return places.length === 1 && affordancesOf(places[0]).length === 0;
}

// Rule 2 — the hub override, and the reason it reads the BOARD rather than an answer.
//
// Four `shape` options name four patterns; `settings` has no question that produces it. Rather
// than bending an answer into it, this reads the shape the visitor actually drew: an entry place
// with four or more affordances, EVERY one of them leading to another place, and no other place
// carrying an affordance of its own, is a menu of destinations and nothing else.
//
// It cannot fire on a drafted board. Every non-entry place a draft creates carries its own
// affordance (breadboard.mjs:128-133), so the third condition fails by construction — which means
// this rule only ever describes a board a visitor deliberately edited into a hub. That is the
// right relationship between an editable artifact and a rule that reads it.
function isHub(board) {
  const places = (board && Array.isArray(board.places)) ? board.places : [];
  const connections = (board && Array.isArray(board.connections)) ? board.connections : [];
  if (places.length < 2) return false;
  const entry = affordancesOf(places[0]);
  if (entry.length < HUB_MIN_AFFORDANCES) return false;
  const connected = new Set(connections.map(([from]) => from));
  if (!entry.every((aff) => connected.has(aff.id))) return false;
  return places.slice(1).every((p) => affordancesOf(p).length === 0);
}

// patternFor({ answers, board }) → { id, reason }.
//
// The rules, in order — and rule 3 is checked FIRST, because a board with nothing on it names no
// pattern whatever the shape answer says:
//   1. The `shape` answer names the candidate: overview → dashboard, worklist → queue,
//      stream → feed, steps → onboarding.
//   2. The hub override: a board shaped like a menu of destinations is `settings`, whatever the
//      shape answer said, because the board is the later and more specific statement of intent.
//   3. An empty board names no pattern at all — id null, and the page renders nothing rather than
//      rendering an empty pattern and calling it one.
//
// `reason` is the rule that fired, in a sentence, and it is rendered VERBATIM on the page and
// written verbatim into the downloadable spec. It is not a description of the rule: it is the rule.
export function patternFor({ answers, board } = {}) {
  if (isEmptyBoard(board)) {
    return {
      id: null,
      reason: "Rule 3: a board with no places, or one place with nothing to act on, names no pattern. There is nothing here to arrange yet.",
    };
  }

  if (isHub(board)) {
    const entry = affordancesOf(board.places[0]);
    return {
      id: "settings",
      reason: `Rule 2, the hub override: your entry place carries ${entry.length} affordances, every one of them leads somewhere else, and no other place has an affordance of its own. That is a menu of destinations, whatever the shape answer said.`,
    };
  }

  const shape = answers && answers.shape;
  const id = Object.hasOwn(SHAPE_PATTERN, String(shape)) ? SHAPE_PATTERN[shape] : "dashboard";
  const named = Object.hasOwn(SHAPE_PATTERN, String(shape));
  return {
    id,
    reason: named
      ? `Rule 1: you said the solution takes the shape of ${SHAPE_LABEL[shape]}, and that names the ${PATTERNS[id].label.toLowerCase()} pattern.`
      : `Rule 1, with no shape answer to read: the ${PATTERNS[id].label.toLowerCase()} pattern is what an unanswered shape falls back to.`,
  };
}

// slotsFor(patternId, board) → the slot content, or null when there is nothing to derive.
//
// THE HONESTY RULE OF THIS FILE: every value below is COUNTED from the board. Not one figure is
// invented, plausible-looking or synthetic. A dashboard tile reports how many affordances its
// place has; a queue row reports where its affordance leads. A place with nothing to act on gets
// the `warn` tone, which is a real reading and not a decoration: it is a hole in the board.
export function slotsFor(patternId, board) {
  const places = (board && Array.isArray(board.places)) ? board.places : [];
  const connections = (board && Array.isArray(board.connections)) ? board.connections : [];
  if (!places.length) return null;

  if (patternId === "dashboard") {
    // One tile per place. `value` is a STRING because metric-tile's spec says so — the validator
    // refuses a number, correctly, and the fix is String() here rather than a looser spec.
    return places.slice(0, SLOT_MAX).map((place) => {
      const n = affordancesOf(place).length;
      return {
        label: String(place.label ?? ""),
        value: String(n),
        unit: n === 1 ? "affordance" : "affordances",
        tone: n === 0 ? "warn" : "neutral",
      };
    });
  }

  if (patternId === "queue") {
    // The rows come from the BUSIEST place — the one with the most affordances, because that is
    // where the work in this board actually is. Ties go to the entry place, then to document
    // order, so the choice is deterministic and a reader can check it.
    let busiest = places[0];
    for (const place of places) {
      if (affordancesOf(place).length > affordancesOf(busiest).length) busiest = place;
    }
    const targetOf = (affId) => (connections.find(([from]) => from === affId) || [])[1] || null;
    const labelOf = (placeId) => {
      const found = places.find((p) => p.id === placeId);
      return found ? String(found.label ?? "") : null;
    };
    return affordancesOf(busiest).slice(0, SLOT_MAX).map((aff) => ({
      label: String(aff.label ?? ""),
      value: labelOf(targetOf(aff.id)) ?? "acts here",
      meta: `in ${String(busiest.label ?? "")}`,
    }));
  }

  // feed / onboarding / settings / null / anything unknown. There is nothing to derive until the
  // library has components to derive it into (slice 2, #139), and deriving slots for a pattern
  // that cannot render them would be inventing the half of the work that is missing.
  return null;
}
