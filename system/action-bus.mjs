// system/action-bus.mjs — hand-written canon (this repo; not generated).
// One standardized bidirectional event contract so click, keyboard, agent — and voice
// later — are interchangeable input modalities, not separate integrations
// (epic #1, ticket #11; architecture §Agentic UI, line 57).
//
// THE BUS CONTRACT (this header is the documentation — AC #4):
//
//   An action is a plain object:
//     { type, source, target?, params? }
//
//   type    — "<namespace>.<name>", matching /^(ui|agent)\.[a-z][a-z-]*$/.
//             The namespace IS the direction:
//               ui.*    — UI → agent   (the user did something: ui.intent)
//               agent.* — agent → UI   (the agent commands the surface: agent.render,
//                                        agent.set-checked)
//   source  — provenance/modality, ORTHOGONAL to direction:
//               "pointer" | "keyboard" | "agent" | "voice"
//             "voice" is reserved-but-unused — a voice layer is post-MVP, gated behind the
//             strong-case bar (architecture line 57). It would emit the SAME ui.* types with
//             source:"voice"; there is no new integration surface to build for it. That is the
//             whole point of one contract: adding a modality is a new `source`, not a new bus.
//   target  — optional { component, id? }: which rendered thing the action concerns.
//   params  — optional plain object: the user's/agent's payload (agent-supplied strings —
//             any consumer that renders them must escape).
//
// Subscribe with on(type, handler); type "*" hears every action (the harness log panel).
// on() returns an unsubscribe function. emit() validates at the boundary and throws a plain
// Error naming the offending field (project convention — system/derive.mjs). A throwing
// handler is isolated (try/catch per handler) so one bad listener can't break the others.
//
// DOM-free by construction: a plain Map, no CustomEvent/EventTarget — so #13's build-time
// composition runs can drive the same bus under Node, not only in the browser.

const SOURCES = new Set(["pointer", "keyboard", "agent", "voice"]);
const TYPE_RE = /^(ui|agent)\.[a-z][a-z-]*$/;

export function createBus() {
  /** @type {Map<string, Set<Function>>} */
  const handlers = new Map();

  function on(type, handler) {
    if (typeof type !== "string" || (type !== "*" && !TYPE_RE.test(type))) {
      throw new Error(`bus.on: type "${type}" must be "*" or match ${TYPE_RE}`);
    }
    if (typeof handler !== "function") throw new Error("bus.on: handler must be a function");
    let set = handlers.get(type);
    if (!set) handlers.set(type, (set = new Set()));
    set.add(handler);
    return () => set.delete(handler);
  }

  function emit(action) {
    if (!action || typeof action !== "object") throw new Error("bus.emit: action must be an object");
    const { type, source, target, params } = action;
    if (typeof type !== "string" || !TYPE_RE.test(type)) {
      throw new Error(`bus.emit: type "${type}" must match ${TYPE_RE} (ui.* = UI→agent, agent.* = agent→UI)`);
    }
    if (!SOURCES.has(source)) {
      throw new Error(`bus.emit: source "${source}" is not one of [${[...SOURCES].join(" | ")}]`);
    }
    if (target !== undefined && (typeof target !== "object" || target === null || Array.isArray(target))) {
      throw new Error("bus.emit: target must be an object { component, id? } when given");
    }
    if (params !== undefined && (typeof params !== "object" || params === null || Array.isArray(params))) {
      throw new Error("bus.emit: params must be a plain object when given");
    }
    // Exact-type handlers first, then wildcard; one throwing handler must not break the rest.
    for (const key of [type, "*"]) {
      const set = handlers.get(key);
      if (!set) continue;
      for (const handler of set) {
        try {
          handler(action);
        } catch (e) {
          console.error(`bus: handler for "${key}" threw`, e);
        }
      }
    }
    return action;
  }

  return { emit, on };
}
