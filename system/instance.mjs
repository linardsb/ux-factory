// system/instance.mjs — the private-instance shell's view-time config module, hand-written canon
// (this repo; not generated). Governing doc: docs/epics/per-company-brief.architecture.md
// §Recommended approach (private layer + bounded steering) + §Boundaries (honesty labeling ·
// privacy · no public upload surface). Implements epic #38, ticket #43 (closes #43); re-chaptered
// onto the v3 spine by epic #70, ticket #81 (PRD §6.1 the beats · §6.2 the instance clause).
//
// What it does: reads one inline `window.INSTANCE_CONFIG`, fetches the configured scenario
// package's two JSON files (intake.defaults.json + copy.json — committed static files, never a
// live LLM), and renders the shell a real application deploys unlisted:
//   1. Honesty notices — the fictional label (when present) then the speculative-work label +
//      scheme-guarded sources, rendered exactly as a real (fictional:false) instance renders them.
//   2. The company's 8 curated intake answers, each shown with its reasoning.
//   3. The SHARED wizard (system/factory-intake.mjs) configured, never forked, via initIntake() —
//      pre-seeded from the package's axes, reader overrides re-derive live through derive.mjs.
//   4. The recorded pack-seed derivation trace, replayed via system/trace-player.mjs.
//   5. THE STUDIO (#222, epic #202): the same modules /factory mounts — canvas, verbs, replay
//      driver, method band, compile beat, inspector, keep rail — booted HERE through
//      system/studio.mjs's mountStudio(document, { replay }) seam, pre-seeded with this instance's
//      OWN recorded build run (INSTANCE_CONFIG.replay). Configured, never forked: the shell claims
//      data-studio-mount="external" so studio.mjs's self-boot stands down, and everything else the
//      instance configures it configures by DOM OMISSION (no [data-studio-frames], only three
//      inspector panels). This replaces #89's composed-view slot (renderStudy), retired with
//      agentic-ui-study.html by this ticket.
//   6. The config-driven handoff link slot (honest placeholder when the link is absent).
//   7. (#81) The spine's hero beat on registerBeat's seam, and the instance's two-option pack
//      control.
//
// Boot contract (#81). Importing spine.mjs self-registers home's `beat-hero` at module scope — that
// registration is INERT here, because this page has no #beat-hero element and registerBeat returns
// early for an absent mount (spine.mjs:55). So home's canned neutral→green re-skin never runs on an
// instance, and spine.mjs needs no change to accommodate this page. The instance's own hero is
// `instance-hero`, and it deliberately performs NO re-skin: the page already wears the company's
// committed pack from its head <link>, so a flush-and-revert would either be invisible or would
// strip that pack mid-visit.
//
// Deliberate NON-imports, each load-bearing — and each SURVIVES the studio import (#222): the
// studio graph (studio.mjs → canvas, verbs, compile, replay driver, keep, method, docs, frames,
// inspect.mjs) transitively imports NONE of the three below, so pulling the studio in does not
// smuggle any of them back:
//   · pack-derived.mjs — its module tail runs hydrateFromSharedLink() unguarded by any mount, so a
//     forwarded instance URL carrying ?brand=… would apply derived colours to :root, write the
//     record and wear() it — silently overriding the pinned company pack, which IS the thing this
//     page demonstrates.
//   · dock.mjs — its pack allowlist is hard-coded to the shipped packs, so on a company pack its
//     radio would show "neutral" checked while the page wears the brand. instance-pack.mjs
//     replaces it here. (pack-boot.js stays out of the head for the same reason: a private
//     instance PINS its pack; there is no localStorage pack to restore.)
//   · share-state.mjs (and the deleted close.mjs, #216) — a share link encodes a brand hex + three axes for a DERIVED
//     pack, which is meaningless against a pack pinned at build time.
//
// The studio import DOES bring inspect.mjs (self-inits at import, restores a persisted choice) —
// harmless here by construction: this page marks nothing data-inspect, so a persisted "on" wires
// to zero elements, and the page ships no toggle because a control that does nothing is worse
// than none. It also shares /build's in-memory answer store: a visitor arriving with a ?b= link
// pre-seeds the canvas exactly as on /factory (the driver declines, the sender's board rules) —
// designed behavior, inherited with the studio, not fought here.
//
// Screenshots-in-trace decision (epic §Open questions, recorded here per AC3): on an unlisted link
// the replayed derivation trace MAY include the company's own product screenshots — default YES.
// The shell replays the committed trace VERBATIM (including any screenshot references); today's
// trace-player renders text steps, so the call is recorded now for the #44-era instances that
// embed a run recorded on the company's own product. Nothing company-real is committed in THIS
// repo — the demo runs on the clearly-labelled fictional `northwind` package; #44 rewrites
// INSTANCE_CONFIG (and ships the company package + pack) per company at build time.
//
// Mirrors derivation-roundtrip.mjs: every package-derived string reaches the DOM via textContent
// (package JSON is committed but treated as untrusted at the DOM boundary — repo convention); no
// innerHTML from package data. The two data sources (package · trace) are INDEPENDENT fetch chains
// so one failing never blocks the other. Module import is relative (Node-parse-safe); the fetch
// URLs are the root-absolute paths INSTANCE_CONFIG supplies. No brief.md fetch (no markdown parser
// at view time — scenarios/README.md).

import { initIntake } from "./factory-intake.mjs";
import { parseTrace, renderTracePlayer } from "./trace-player.mjs";
import { registerBeat } from "./spine.mjs";
import { initInstancePack } from "./instance-pack.mjs";
// The studio's orchestrator (#222). Importing it is safe ONLY because instance.html's shell
// carries data-studio-mount="external" — studio.mjs's self-boot stands down on that attribute and
// mountStudioBand below makes the one call, with this instance's own recorded run.
import { mountStudio } from "./studio.mjs";

// --- DOM helper (all package text via textContent — untrusted at the boundary) -------------------
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const grabJson = (path) =>
  fetch(path).then((res) => { if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`); return res.json(); });

// An honest error card (shape mirrors derivation-roundtrip.mjs / factory.html) — set instead of a
// [data-*="ready"] flag, so a real failure fails visibly rather than baking a half-empty surface.
function errorCard(mount, message) {
  mount.textContent = "";
  const card = el("article", "card trace-error-card");
  card.style.padding = "var(--spacing-md)";
  card.append(el("h3", "h3", "This part of the instance couldn’t load"));
  const p = el("p", "muted", message);
  p.style.marginTop = "var(--spacing-sm)";
  card.append(p);
  mount.append(card);
}

// --- Honesty notices -----------------------------------------------------------------------------
// The fictional notice (surface #1) renders FIRST; the speculative notice renders below it exactly
// as a real instance renders it (on a real package the speculative block is the only one). Sources
// become a scheme-guarded link list: only http(s) URLs become anchors — anything else is plain text.
function noticeP(tag, text) {
  const p = el("p", "fw-scenario");
  p.append(el("strong", "fw-scenario-tag", tag), el("span", null, text));
  return p;
}
function sourcesList(sources) {
  const ul = el("ul", "pi-sources");
  for (const s of sources) {
    const li = document.createElement("li");
    let safe = false;
    try { const u = new URL(s); safe = u.protocol === "http:" || u.protocol === "https:"; } catch { safe = false; }
    if (safe) {
      const a = document.createElement("a");
      a.href = s;
      a.textContent = s;                 // the URL is the data — textContent, never innerHTML
      a.rel = "noopener noreferrer";
      a.target = "_blank";
      li.append(a);
    } else {
      li.textContent = String(s);        // non-http(s) → never a link
    }
    ul.append(li);
  }
  return ul;
}
function renderNotices(mount, copy) {
  mount.textContent = "";
  if (copy.fictionalNotice) mount.append(noticeP("Fictional scenario", copy.fictionalNotice));
  if (copy.speculativeNotice) {
    mount.append(noticeP("Speculative work", copy.speculativeNotice));
    if (Array.isArray(copy.sources) && copy.sources.length) mount.append(sourcesList(copy.sources));
  }
}

// --- Curated intake: the 8 answers, each with its reasoning (a .cs-acc accordion each) ------------
function accordion(summaryText, ...bodyNodes) {
  const wrap = el("div", "cs-acc");
  const det = document.createElement("details");
  const sum = el("summary", null, summaryText);
  sum.append(el("span", "mark"));
  det.append(sum);
  const body = el("div", "acc-body");
  bodyNodes.forEach((n) => n && body.append(n));
  det.append(body);
  wrap.append(det);
  return wrap;
}
function renderCuratedIntake(mount, intake) {
  mount.textContent = "";
  const list = el("div", "pi-intake");
  for (const q of intake.questions)
    list.append(accordion(q.question, el("p", "pi-answer", q.default), el("p", "pi-answer-why muted", q.reasoning)));
  mount.append(list);
}

// --- Wizard config: build the SHARED wizard's scenario shape from the package, then initIntake ----
// The four wizard prompts are scenario-independent (reused verbatim from factory-intake's SCENARIOS).
// Per-axis reasoning: frequency ← the target-behavior question's reasoning (its bounds ARE the
// frequency enum — the one direct semantic mapping); the other three point the reader at the full
// curated intake above rather than inventing a per-axis line the compiled package doesn't carry.
function wizardSteps(name, intake) {
  const byId = Object.fromEntries(intake.questions.map((q) => [q.id, q]));
  const curated = `Curated in ${name}'s brief — override it and the engine re-derives live. The full curated intake above records the reasoning.`;
  const freqReasoning = byId["target-behavior"] ? byId["target-behavior"].reasoning : curated;
  return [
    { axis: "brandColor", prompt: "What colour carries the brand?", reasoning: `${name}'s curated brand colour. Override it — the engine keeps your hue and negotiates only lightness, down to the WCAG contrast floor.` },
    { axis: "density", prompt: "What kind of product is it, and how do people use it?", reasoning: curated },
    { axis: "rewardType", prompt: "Who is it for, and what brings them back?", reasoning: curated },
    { axis: "frequency", prompt: "How often would someone realistically do the core thing?", reasoning: freqReasoning },
  ];
}
function mountWizard(slug, name, intake, copy) {
  const axes = intake.axes || {};
  for (const axis of ["brandColor", "density", "rewardType", "frequency"])
    if (axes[axis] == null) throw new Error(`instance: intake.defaults.json axes.${axis} is missing — the wizard needs all four axes`);
  const scenario = {
    label: name,
    fictionalNotice: copy.fictionalNotice ?? "",
    wizard: wizardSteps(name, intake),
    defaults: { brandColor: axes.brandColor, density: axes.density, rewardType: axes.rewardType, frequency: axes.frequency },
    // Two optional matrix booleans feed the maker's quadrant; absent (as here) → the frequency
    // filter stands alone and the reveal shows "Not placed" (factory-intake's null path).
    makerMatrix: "improvesLives" in axes && "wouldUseIt" in axes
      ? { improvesLives: axes.improvesLives, wouldUseIt: axes.wouldUseIt }
      : null,
    ethicsReveal: copy.ethicsReveal,
  };
  // The shell supplies a SINGLE scenario → no #scenario-toggle anchor on the page, so the wizard's
  // toggle render no-ops (guarded). assertScenarioConfig re-runs inside initIntake on this config.
  // No onAnswers callback since #222: the peak panel it fed died with the studio re-shell — the
  // wizard's own #reskin-preview and step-by-step narrative (checks table included) remain the
  // live-derivation surface, in beat 01 where the answers live.
  initIntake({
    scenarios: { [slug]: scenario },
    defaultScenario: slug,
  });
}

// --- Prototype / handoff slots (config-driven; honest placeholder when nothing is configured) -----
// One card shape, one caller since #222: the handoff slot (the prototype slot retired with the
// studio re-shell). Returned inside a .pi-links grid so a lone card fills the row.
function linkCard(title, blurb, href) {
  const card = el("article", "card");
  const body = el("div", "card-body");
  body.append(el("div", "card-kicker", title));
  body.append(el("p", "muted", blurb));
  // Scheme guard (mirrors sourcesList above) — but a link value may be a root-absolute same-origin
  // path (the repo's link convention, e.g. /proto/x.html), unlike the absolute source URLs, so
  // resolve against document.baseURI before the scheme check. Only http(s) becomes a link; a
  // javascript:/data: href (or anything unresolvable) falls back to the honest placeholder.
  let safeHref = null;
  if (href) {
    try { const p = new URL(href, document.baseURI).protocol; if (p === "http:" || p === "https:") safeHref = href; } catch { safeHref = null; }
  }
  if (safeHref) {
    const a = el("a", "btn btn-primary btn-arrow", `Open the ${title.toLowerCase()}`);
    a.href = safeHref;
    body.append(a);
  } else {
    body.append(el("p", "pi-link-placeholder muted", "Authored per application — not part of this instance."));
  }
  card.append(body);
  const grid = el("div", "pi-links");
  grid.append(card);
  return grid;
}

// The handoff slot only — #89's composed-view prototype slot retired with #222's studio re-shell,
// so there is no links.prototype any more; the studio band IS the bespoke prototype now.
function renderLinks(links) {
  const mount = document.getElementById("instance-links");
  if (!mount) return;
  mount.replaceChildren(linkCard(
    "Handoff pack",
    "The engineer-ready pack: component specs, typed props, data contracts, agent vocabulary.",
    links && links.handoff));
}

// Beat 1 · the hero. No effect beyond the readiness handle, and that is the point: the page already
// wears the company's pack from its head <link>, so there is no re-skin to perform (a revert would
// land on the same palette; a persisting one would strip the pinned pack). The entrance is the
// inherited .page-hero CSS cascade. The handle lands in a finally on every path, the same contract
// spine.mjs gives data-spine, so a later visual-regression addition can wait on it.
function heroEffect(ctx) {
  try {
    // nothing to do — see above
  } finally {
    ctx.el.setAttribute("data-spine", "ready");
  }
}

// --- Beat 02 · the studio (#222): the same modules /factory mounts, configured never forked -------
// One synchronous call into system/studio.mjs's mountStudio(document, { replay }) — the seam #222
// added, with this instance's own recorded run threaded through to the replay driver's `source`.
// The shell's data-studio-mount="external" is what stood the module's self-boot down, so this is
// the page's ONE mount.
//
// A missing/invalid `config.replay` renders an honest error card in the band and mounts NOTHING:
// mounting without a source would play the PUBLIC site's demo run on a page whose whole claim is
// "built for you" — refusing loudly is the honest degradation, and build-instance.mjs's
// validateAssembly makes this state unreachable on a correctly built instance. The un-set
// [data-studio] handle is deliberate on that path (the initGlossary discipline, studio.mjs:766):
// a broken build must deadlock a gate loudly rather than be captured green.
function mountStudioBand(config) {
  const shell = document.querySelector('[data-studio][data-studio-mount="external"]');
  if (!shell) return; // a partial shell with no studio band — every other chain is unaffected
  const replay = config.replay;
  if (!replay || typeof replay.artifact !== "string" || typeof replay.trace !== "string") {
    const chrome = shell.querySelector("[data-replay-chrome]");
    if (chrome) errorCard(chrome,
      "This instance names no recorded run — INSTANCE_CONFIG.replay is absent or malformed — so the studio was not mounted.");
    return;
  }
  mountStudio(document, { replay: { artifact: replay.artifact, trace: replay.trace } });
}

// --- self-mount: inert under Node and on any page without the shell's notices anchor -------------
function init() {
  const notices = document.getElementById("instance-notices");
  if (!notices) return; // inert on any page without the shell

  const config = window.INSTANCE_CONFIG;
  // Config guard: a missing/malformed global is one honest error, and nothing else is attempted
  // (we can't know the package or trace paths without it).
  if (!config || typeof config !== "object" || typeof config.package !== "string" || !config.package.trim()) {
    errorCard(notices, "Instance configuration missing — window.INSTANCE_CONFIG is absent or malformed.");
    return;
  }
  const pkg = config.package.replace(/\/+$/, "");               // tolerate an accidental trailing slash
  const name = typeof config.name === "string" && config.name.trim() ? config.name : "the company";
  const slug = pkg.split("/").filter(Boolean).pop() || "instance";

  // Company name in the hero (optional anchor).
  const nameSpan = document.getElementById("instance-name");
  if (nameSpan) nameSpan.textContent = name;

  // Link slots depend only on config (not the package) → render synchronously, robust to a package
  // fetch failure.
  renderLinks(config.links);

  // (D) Pack control — same reasoning: it reads only the page's own head <link> and config.name, so
  // a package fetch failure must not take it down. Session-only by design (a private instance pins
  // its pack), so there is nothing to restore and no order to respect beyond "after the head is
  // parsed", which a module script guarantees.
  initInstancePack({ name });

  // (C) The studio band (#222) — INDEPENDENT of (A), (B) and (D); a synchronous mount whose own
  // readiness handles ([data-studio="ready"], [data-replay="settled"]) belong to the studio
  // modules, and it never gates body[data-instance="ready"].
  mountStudioBand(config);

  // The spine's hero beat. Registered here, AFTER the config guard, for two reasons: activateOn:
  // 'load' calls activate() synchronously inside registerBeat (spine.mjs:56), so a malformed
  // INSTANCE_CONFIG must still produce exactly one honest error card and nothing else; and keeping
  // the call inside init() means a Node import of this module never touches the DOM. The old
  // beat-built registration died with #222: the studio band's readiness is its own modules'.
  registerBeat("instance-hero", { effect: heroEffect, activateOn: "load" });

  // (A) Package chain — notices + curated intake + wizard. body[data-instance="ready"] is set only
  // after all of it renders (readiness handle; instance.html is not in the VR set today — a possible
  // follow-up per the plan). A package failure error-cards the notices and leaves the ready flag off.
  Promise.all([grabJson(`${pkg}/intake.defaults.json`), grabJson(`${pkg}/copy.json`)])
    .then(([intake, copy]) => {
      renderNotices(notices, copy);
      const intakeMount = document.getElementById("instance-intake");
      if (intakeMount) renderCuratedIntake(intakeMount, intake);
      mountWizard(slug, name, intake, copy);
      document.body.dataset.instance = "ready";
    })
    .catch((err) => errorCard(notices, `Could not load the instance package — ${err.message}`));

  // (B) Trace chain — INDEPENDENT of (A) (factory.html trace-mount idiom). A package failure must
  // not block the trace, or vice-versa. The player renders meta.label ("Real run, curated for
  // length") verbatim — the honesty label is never restated here.
  const player = document.getElementById("instance-player");
  const tracePath = config.trace && config.trace.path;
  if (player && tracePath) {
    fetch(tracePath)
      .then((res) => { if (!res.ok) throw new Error(`${tracePath} → HTTP ${res.status}`); return res.text(); })
      .then((text) => { renderTracePlayer(player, parseTrace(text)); player.dataset.trace = "ready"; })
      .catch((err) => errorCard(player, `Could not load the derivation run — ${err.message}`));
  }
}

if (typeof document !== "undefined") init();
