// system/spine.mjs — hand-written canon (this repo; not generated).
// The v3 spine's beat-orchestration seam + Beat 1 (the hero re-skin): drives the
// home-page demo sequence and exposes the registration API later beats plug their
// stage effects into (#73 intake · #75 peak · #77 close; the peak fires /factory/built
// through it). (epic #70 ticket #72; PRD §6.1 beat 1; architecture "Hero liveness =
// (a)+(b) hybrid", boundary "nothing fails on stage".)
//
// Boot contract: this module self-boots on import (registers the hero, activateOn:'load').
// Later beat modules `import { registerBeat } from './spine.mjs'` — the module singleton
// shares one registry. Node-import-safe: with no DOM the seam no-ops, so the import test
// and any future Node harness stay green.

import { derive } from "./derive.mjs";

// ---------------------------------------------------------------------------- seam

// One registry per module singleton. id → { el, effect, analytics, activateOn, activated }.
const beats = new Map();

const OBSERVE_THRESHOLD = 0.35; // a beat activates once it is ~a third in view

// Reduced-motion, read live (motion.mjs:12 idiom) so a mid-session OS toggle is honoured;
// Node-safe (no matchMedia → false, entrances treated as allowed but the DOM guards below never run).
const prefersReduce = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// A worn "your brand" derived pack (#74, D5b) lives as inline --color-* props on :root that
// pack-boot.js applies pre-paint — NOT a stylesheet. The hero re-skin below reverts by
// removeProperty()-ing those exact keys, so on home it would STRIP a worn brand ~1.2s in
// (every other page keeps it — the worst page to lose it). Skip the re-skin when derived is
// worn; the CSS entrances (hero-rise/hl-draw) still play. Storage-safe (Node/no-storage → false).
const isWearingDerived = () => {
  try { return localStorage.getItem("factory-pack") === "derived"; } catch { return false; }
};

// registerBeat(id, spec) — a beat plugs its stage effect. Called by #73/#75/#77 and the hero here.
//   id: string                          — matches a #beat-* mount id in index.html
//   spec.effect?:    (ctx) => void|Promise — the stage logic; runs once, inside try/catch
//   spec.analytics?: () => void          — fired once after effect (e.g. #75 passes trackFactoryBuilt)
//   spec.activateOn?: 'load' | 'visible' — 'load' runs immediately (above-the-fold hero);
//                                          'visible' (default) runs on first IntersectionObserver hit
//   ctx: { el, reduce }                  — the beat's element + the reduced-motion flag at activation
// Returns getBeat(id) once registered, or undefined with no DOM (Node import).
export function registerBeat(id, spec = {}) {
  if (typeof id !== "string" || !id) {
    throw new Error("spine: registerBeat needs a beat id (a string matching a #beat-* mount)");
  }
  if (typeof document === "undefined") return undefined; // no DOM — seam inert, self-boot stays safe
  const { effect, analytics, activateOn = "visible" } = spec;
  const el = document.getElementById(id);
  const beat = { id, el, effect, analytics, activateOn, activated: false };
  beats.set(id, beat);
  if (!el) return getBeat(id);              // mount not on this page — registered but inert (parallel-safe)
  if (activateOn === "load") activate(beat); // fire-and-forget; the once-guard owns idempotency
  else observe(beat);
  return getBeat(id);
}

// getBeat(id) → a read-only snapshot { id, el, activated } (observe/advance), or undefined.
export function getBeat(id) {
  const b = beats.get(id);
  return b ? { id: b.id, el: b.el, activated: b.activated } : undefined;
}

// One shared IntersectionObserver for every 'visible' beat, created lazily.
let observer = null;
function ensureObserver() {
  if (observer || typeof IntersectionObserver === "undefined") return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target); // once — first hit only
        const beat = beats.get(entry.target.id);
        if (beat) activate(beat);
      }
    },
    { threshold: OBSERVE_THRESHOLD }
  );
  return observer;
}

function observe(beat) {
  const obs = ensureObserver();
  // No IntersectionObserver (a very old engine): run the effect now rather than never —
  // a registered stage effect that silently never fires would surface as a later beat's bug.
  if (obs) obs.observe(beat.el);
  else activate(beat);
}

// The single activation path: once-guarded, effect then analytics, each fail-closed.
async function activate(beat) {
  if (beat.activated) return;
  beat.activated = true;
  const ctx = { el: beat.el, reduce: prefersReduce() };
  try {
    await beat.effect?.(ctx);
  } catch (err) {
    // Nothing fails on stage: a thrown effect leaves the committed pack untouched (the DOM
    // default). There is no undo to run — only "not having changed it" (plus the hero's own revert).
    console.error(`spine: beat "${beat.id}" effect failed — committed pack retained`, err);
  }
  try {
    beat.analytics?.();
  } catch (err) {
    console.error(`spine: beat "${beat.id}" analytics failed`, err);
  }
}

// -------------------------------------------------------------------- Beat 1 · hero

// The committed demo brand INPUT: the canonical Verdant scenario axes
// (scenarios/verdant/intake.defaults.json — the plant-care product this spine runs; the
// same axes the committed verdant pack was derived from). A hex here is an ENGINE INPUT,
// not a token (derive.html does the same) — the engine derives the whole palette from it.
// Non-blue on purpose: neutral's accent is blue, so a blue brand would barely re-skin.
// Verified: derive() throws nothing and every WCAG pair passes AA (accent → #2f7a4d).
const CANNED_AXES = { brandColor: "#2f7a4d", density: "comfortable", rewardType: "self", frequency: "daily" };

const HOLD_MS = 1200; // the derived brand holds this long before reverting — the one authored moment
const ASSEMBLY_QUIESCE_MS = 120; // resolve this long after the last cascade animationend (settle window)
const ASSEMBLY_SAFETY_MS = 1200; // hard cap: proceed even if no animationend fires (animations-off context)

const isColorToken = ([k]) => k.startsWith("color-"); // color-* ONLY — spacing/type would reflow the hero
const root = () => document.documentElement;

// Beat 1: after the inherited CSS assembly settles, run the REAL engine on the committed
// brand and flush the derived color-* set across the whole page (:root), hold, then revert
// to the active pack. This is "watch an accessible design system get built" performed on arrival.
async function heroBeat({ el, reduce }) {
  let applied = null; // the color entries currently on :root (non-null ⇒ a revert is owed)
  try {
    // reduced motion, OR a worn brand already on :root pre-paint → skip the re-skin. In both
    // cases the current :root IS the intended final state; re-skinning would revert-strip a worn brand.
    if (reduce || isWearingDerived()) return;
    await assemblySettled(el); // let hero-rise + hl-draw land first, so the re-skin reads as a second act
    const { tokens } = derive(CANNED_AXES); // the real derivation, live in the browser
    applied = Object.entries(tokens).filter(isColorToken);
    await crossfade(() => applied.forEach(([k, v]) => root().style.setProperty("--" + k, v)));
    await hold(HOLD_MS);
    await crossfade(() => applied.forEach(([k]) => root().style.removeProperty("--" + k)));
    applied = null; // reverted cleanly through the crossfade above
  } finally {
    // Guarantee the committed pack is restored even if hold/revert threw: a hero left branded
    // is a visible rest≠final bug, not just a VR hang. removeProperty lands on whatever pack is
    // active (neutral/saulera/verdant), never a hard-coded neutral. Idempotent with the revert above.
    if (applied) for (const [k] of applied) root().style.removeProperty("--" + k);
    // The VR handle + the #73/#75 sequencing signal — set in EVERY path (reduced, success, derive throw).
    el.setAttribute("data-spine", "ready");
  }
}

// Resolve once the hero's inherited entrance cascade (components.css hero-rise +
// portfolio.css hl-draw) quiesces: ASSEMBLY_QUIESCE_MS after the last animationend to bubble
// up from the hero, or ASSEMBLY_SAFETY_MS as a hard cap if none fires. The cap guarantees
// resolution (data-spine="ready" can never hang). Caller runs this under no-preference only.
function assemblySettled(el) {
  return new Promise((resolve) => {
    let settled = false;
    let quiesce = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(quiesce);
      el.removeEventListener("animationend", bump);
      resolve();
    };
    const bump = () => {
      clearTimeout(quiesce);
      quiesce = setTimeout(finish, ASSEMBLY_QUIESCE_MS);
    };
    el.addEventListener("animationend", bump);
    setTimeout(finish, ASSEMBLY_SAFETY_MS);
  });
}

const hold = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// dock.mjs applyPack (49-66): the whole-page re-skin is witnessed via a View Transition, or
// snapped where View Transitions are unsupported / under reduced motion. Either way `mutate`
// runs and the promise resolves — the sequence never hangs (a rejected transition is swallowed).
function crossfade(mutate) {
  if (document.startViewTransition && !prefersReduce()) {
    return document.startViewTransition(mutate).finished.catch(() => {});
  }
  mutate();
  return Promise.resolve();
}

// Beat 1 dogfoods the seam: the hero registers here and runs immediately (above the fold).
registerBeat("beat-hero", { effect: heroBeat, activateOn: "load" });
