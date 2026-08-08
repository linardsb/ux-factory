// system/pattern-rules.mjs — the committed rules that turn a breadboard into a named pattern
// (epic #134, ticket #137; .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.4,
// .claude/plans/build-pattern-render-keep-rail.md) — and, since #212, into the screens of a
// connected flow (epic #202; .claude/plans/studio-flows-places-screens-212.md; screensFor below).
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
// (handoff/verdant/vocabulary.json), not about the pattern. All five are true as of #139: the
// library carries metric-tile, list-row and sequence-step, and every one of the five assembles from
// those three.
//
// The field pair STAYS, and it is not a slice marker left behind. It is the contract a SIXTH
// pattern gets: whoever adds one either has components for it or writes down, in the reader's terms
// rather than in component names they have no reason to know, what it would take — and the page
// renders that refusal beside the breadboard instead of mocking a screen up. The refusal is the
// guardrail, and a guardrail is worth keeping when nothing is currently hitting it.
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
    inLibrary: true,
    needs: null,
  }),
  onboarding: Object.freeze({
    id: "onboarding",
    label: "Onboarding",
    definition: "A short series of steps with a start and an end, where progress through it is the point.",
    inLibrary: true,
    needs: null,
  }),
  settings: Object.freeze({
    id: "settings",
    label: "Settings",
    definition: "A menu of destinations: a place whose whole job is taking the user somewhere else.",
    inLibrary: true,
    needs: null,
  }),
});

// The most slots any pattern renders. The same ceiling breadboard.mjs puts on places and on
// affordances per place (MAX_PLACES / MAX_AFFORDANCES, both 6).
//
// For four of the five it is the stated bound and not a working truncation: dashboard reads one
// place at a time (≤ 6), onboarding the same, queue and settings read the affordances of ONE place
// (≤ 6). Nothing can be dropped for being over budget.
//
// FEED IS THE EXCEPTION, and it is why this comment no longer claims otherwise. Feed reads every
// affordance on the whole board, so a full board offers MAX_PLACES × MAX_AFFORDANCES = 36
// candidates and six are shown. That is a real truncation, and a page that promises it counts
// everything cannot drop thirty of them quietly — so the feed derivation is the one that must say
// how many it showed of how many the board holds. `affordanceCount` below is what it says it with.
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

// Where an affordance leads, and what that place is called. First written inside slotsFor; hoisted
// to module scope when screensFor became their fourth reader — three derivations and the flow all
// read the same two facts off the same board, and a second copy is a second answer waiting to
// disagree with the first. Junk-tolerant by inspection rather than validation: a connection that is
// not a pair is no connection, and a place that is not there has no label.
const targetOf = (connections, affId) => {
  for (const c of connections) if (Array.isArray(c) && c[0] === affId) return c[1] || null;
  return null;
};
const labelOf = (places, placeId) => {
  const found = places.find((p) => p && p.id === placeId);
  return found ? String(found.label ?? "") : null;
};

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
// The PER-PLACE core of the hub reading, shared by rule 2 below and by flow rule S2: at least
// HUB_MIN_AFFORDANCES affordances, every one of them carrying a connection. Rule 2 adds the
// whole-board conditions (it must be the ENTRY place, and no other place may have work of its own);
// S2 reads exactly this on one non-entry place. One predicate, two rules — the condition is stated
// once so the two can never quietly diverge.
function isHubShaped(place, connections) {
  const affs = affordancesOf(place);
  if (affs.length < HUB_MIN_AFFORDANCES) return false;
  const connected = new Set(connections.filter((c) => Array.isArray(c)).map(([from]) => from));
  return affs.every((aff) => aff && connected.has(aff.id));
}

function isHub(board) {
  const places = (board && Array.isArray(board.places)) ? board.places : [];
  const connections = (board && Array.isArray(board.connections)) ? board.connections : [];
  if (places.length < 2) return false;
  if (!isHubShaped(places[0], connections)) return false;
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

  // targetOf and labelOf — the two facts three of the five derivations read — live at module scope
  // now (screensFor reads them too); each call below hands them this board's places and connections.

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
    return affordancesOf(busiest).slice(0, SLOT_MAX).map((aff) => ({
      label: String(aff.label ?? ""),
      value: labelOf(places, targetOf(connections, aff.id)) ?? "acts here",
      meta: `in ${String(busiest.label ?? "")}`,
    }));
  }

  if (patternId === "onboarding") {
    // One step per place, in BOARD ORDER, because board order is the sequence. Nothing else on a
    // breadboard says what comes first, and ordering the steps any other way would be a claim about
    // a flow the visitor did not draw.
    //
    // `total` is what is DRAWN, not what exists: a step that reads "3 of 7" inside a sequence of
    // three is a number this page did not count. MAX_PLACES === SLOT_MAX === 6, so the two can
    // never differ today — it is written correctly anyway, because the day one of those caps moves
    // is not the day anyone re-reads this line.
    const shown = places.slice(0, SLOT_MAX);
    return shown.map((place, i) => {
      const affs = affordancesOf(place);
      return {
        position: String(i + 1),
        total: String(shown.length),
        label: String(place.label ?? ""),
        // What advances this step — or, when nothing does, THAT, in words.
        //
        // The empty case used to omit the key entirely, which left `tone` as the only difference
        // between "this step is a hole in the board" and "this step is fine": both rendered as
        // "Step 3 of 3, Settings", and a screen reader got byte-identical output. sequence-step.md's
        // Accessibility section forbids exactly that ("colour is never the sole signal") and even
        // gives this sentence as its example, so the spec was right and the derivation was not.
        //
        // Still counted, not invented: it is a branch on a counted zero, the same shape as the
        // dashboard's `unit` a few lines up, which picks between two fixed words on a counted n.
        detail: affs.length ? String(affs[0].label ?? "") : "nothing to act on here",
        // Same reading as the dashboard's: a place with nothing to act on is a hole in the board,
        // not a decoration.
        tone: affs.length === 0 ? "warn" : "neutral",
      };
    });
  }

  if (patternId === "feed") {
    // EVERY affordance on the board, each carrying where it leads and which place it came from —
    // the only derivation that reads the whole board rather than one place of it.
    //
    // ORDER. A breadboard records no time, so this stream is in the order the board draws it. "New
    // first" is the pattern's own definition, not a claim this board can support, and reversing the
    // array to gesture at recency would invent the one fact a breadboard most conspicuously lacks.
    //
    // TRUNCATION. This is the pattern SLOT_MAX actually truncates (see its comment above): a full
    // board offers 36 candidates and six are shown. The slice is deliberately AFTER the flatMap, so
    // the cap lands on the stream rather than on each place's share of it — and the surface renders
    // `affordanceCount` beside the slots so the drop is stated rather than silent.
    return places.flatMap((place) => affordancesOf(place).map((aff) => ({
      label: String(aff.label ?? ""),
      value: labelOf(places, targetOf(connections, aff.id)) ?? "acts here",
      meta: `in ${String(place.label ?? "")}`,
    }))).slice(0, SLOT_MAX);
  }

  if (patternId === "settings") {
    // The ENTRY place's affordances and where each one leads. Rule 2's hub override is the only way
    // this pattern is ever named, and what that rule reads — an entry place whose affordances all
    // lead somewhere else — is exactly this shape.
    //
    // No `meta`: every row is in the same place, so "in <entry>" repeated down the list is noise
    // rather than a fact. A field that says the same thing on every row says nothing.
    return affordancesOf(places[0]).slice(0, SLOT_MAX).map((aff) => ({
      label: String(aff.label ?? ""),
      value: labelOf(places, targetOf(connections, aff.id)) ?? "acts here",
    }));
  }

  // null / anything unknown. A pattern this file does not know is a pattern it will not derive
  // slots for, and the surface renders nothing rather than arranging something around the gap.
  return null;
}

// How many affordances the whole board holds. Counted, like everything else here, and exported for
// one reason: feed shows at most SLOT_MAX of them, so the surface has to be able to say six OF WHAT
// (see SLOT_MAX's comment). It is the denominator of the only truncation on this page.
export function affordanceCount(board) {
  const places = (board && Array.isArray(board.places)) ? board.places : [];
  return places.reduce((n, place) => n + affordancesOf(place).length, 0);
}

// --- the flow: places become screens (#212) -------------------------------------------------------
//
// The second half of the compile language (epic #202 — docs/epics/prototype-studio.architecture.md
// §Data model → "Screen typing"): each place on a board resolves to one SCREEN, and the five
// patterns above ARE the flow's screen types. A second type table would be a second truth beside
// PATTERNS, with its own inLibrary story and its own out-of-library contract to re-open — reusing
// the patterns keeps compose() the one place a type becomes components, and answers the epic PRD's
// open question ("how the five patterns map to flow screen types") with an identity plus the rules
// below for which place gets which.
//
// The rules, in order per place — committed and commented like everything else in this file, and
// each screen's `reason` is the rule that fired, in a sentence, on patternFor's own contract:
//
//   S1  the ENTRY place wears the board's own pattern: patternFor, verbatim, reason included. Its
//       slots are slotsFor(patternId, board) — the existing whole-board read — which is what makes
//       the flow a strict extension of the single compiled screen: the entry screen IS it. Feed's
//       SLOT_MAX truncation rides along here, the one real truncation in the flow, and the surface
//       states it with affordanceCount's denominator exactly as /build does.
//   S2  a NON-ENTRY place shaped like a hub is a `settings` screen: isHubShaped, the hub rule's own
//       per-place condition — at least HUB_MIN_AFFORDANCES affordances, every one carrying a
//       connection. Same threshold, same argument, read on one place.
//   S3  every OTHER non-entry place with at least one affordance is a `queue` screen: a list worked
//       through where the reader is, one row per affordance, each row saying where it leads or that
//       it acts in place. The row shape is the queue/settings one, scoped to the place — and no
//       `meta`, because every row is in the same place and a field that says the same thing on
//       every row says nothing.
//   S4  a non-entry place with NO affordances is still a screen — it can be a connection's
//       destination — typed `queue` with zero slots, and the surface renders the honest sentence
//       instead of content. A hole in the board is shown as one, never mocked up.
//
// An EMPTY board names no screens at all: null, exactly where patternFor names no pattern.
//
// NAVIGATION IS COUNTED FROM `connections` AND FROM NOTHING ELSE — the board's only record of what
// leads where. Per screen: one nav entry per affordance OF THAT PLACE that carries a connection.
// An affordance without a connection navigates nowhere, and no rule invents a link for it.
//
// PURE and total like the rest of the file. The board is cleaned AT THE BOUNDARY, by hand (the
// project's validation convention): junk place or affordance entries become empty ones rather than
// throws, so the nine junk boards the committed gate drives produce screens or null, never a crash.
// For a valid board the cleaning is the identity, so every counted number is still the board's own.
export function screensFor(board, answers) {
  if (isEmptyBoard(board)) return null;

  const places = board.places.map((entry) => {
    const place = entry && typeof entry === "object" ? entry : {};
    return {
      id: place.id ?? null,
      label: place.label ?? "",
      affordances: affordancesOf(place).map((a) => (a && typeof a === "object" ? a : {})),
    };
  });
  const connections = (Array.isArray(board.connections) ? board.connections : [])
    .filter((c) => Array.isArray(c));
  const cleaned = { places, connections };

  // One row per affordance of ONE place — the S2/S3 slot shape. Sliced at SLOT_MAX like every
  // derivation, and provably never truncating: breadboard.mjs caps affordances per place at
  // MAX_AFFORDANCES, which equals SLOT_MAX, so there is no per-place truncation to go unstated
  // (the committed gate asserts the equality rather than trusting this sentence).
  const rowsOf = (place) => place.affordances.slice(0, SLOT_MAX).map((aff) => ({
    label: String(aff.label ?? ""),
    value: labelOf(places, targetOf(connections, aff.id)) ?? "acts here",
  }));

  const entry = patternFor({ answers: answers ?? null, board: cleaned });

  return places.map((place, i) => {
    const affs = place.affordances;
    let type;
    let reason;
    let slots;
    if (i === 0) {
      type = entry.id;
      reason = `Rule S1: the entry place wears the board's own pattern. ${entry.reason}`;
      slots = slotsFor(type, cleaned) || [];
    } else if (isHubShaped(place, connections)) {
      type = "settings";
      reason = `Rule S2: this place carries ${affs.length} affordances and every one of them leads to another place — a menu of destinations, which is the hub rule read on one place.`;
      slots = rowsOf(place);
    } else if (affs.length) {
      type = "queue";
      reason = `Rule S3: this place carries ${affs.length} affordance${affs.length === 1 ? "" : "s"} and the work happens here — a list worked through where you are, with each row saying where it leads or that it acts in place.`;
      slots = rowsOf(place);
    } else {
      type = "queue";
      reason = "Rule S4: this place has nothing to act on. The board drew a destination with no work in it, and this screen says so rather than inventing content.";
      slots = [];
    }

    const nav = [];
    for (const aff of affs) {
      const targetId = targetOf(connections, aff.id);
      if (targetId == null) continue;
      nav.push({
        affordanceId: aff.id ?? null,
        label: String(aff.label ?? ""),
        targetId,
        targetLabel: labelOf(places, targetId) ?? "",
      });
    }

    return { id: place.id, label: String(place.label ?? ""), type, reason, slots, nav };
  });
}
