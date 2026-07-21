// system/instance.mjs — the private-instance shell's view-time config module, hand-written canon
// (this repo; not generated). Governing doc: docs/epics/per-company-brief.architecture.md
// §Recommended approach (private layer + bounded steering) + §Boundaries (honesty labeling ·
// privacy · no public upload surface). Implements epic #38, ticket #43 (closes #43).
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
//   5. Config-driven prototype/handoff link slots (honest placeholders when a link is absent).
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
    { axis: "density", prompt: "How much breathing room should the interface have?", reasoning: curated },
    { axis: "rewardType", prompt: "What kind of variable reward brings people back?", reasoning: curated },
    { axis: "frequency", prompt: "How often would the core behaviour realistically happen?", reasoning: freqReasoning },
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
  initIntake({ scenarios: { [slug]: scenario }, defaultScenario: slug });
}

// --- Prototype / handoff link slots (config-driven; honest placeholder when a link is absent) -----
function renderLinks(links) {
  const mount = document.getElementById("instance-links");
  if (!mount) return;
  mount.textContent = "";
  const slots = [
    { key: "prototype", title: "Prototype screen", blurb: "The hand-crafted, data-connected screen built for this application." },
    { key: "handoff", title: "Handoff pack", blurb: "The engineer-ready pack: component specs, typed props, data contracts, agent vocabulary." },
  ];
  const grid = el("div", "pi-links");
  for (const slot of slots) {
    const href = links && links[slot.key];
    const card = el("article", "card pi-link-card");
    const body = el("div", "card-body");
    body.append(el("div", "card-kicker", slot.title));
    body.append(el("p", "muted", slot.blurb));
    if (href) {
      const a = el("a", "btn btn-primary btn-arrow", `Open the ${slot.title.toLowerCase()}`);
      a.href = href;
      body.append(a);
    } else {
      body.append(el("p", "pi-link-placeholder muted", "Authored per application — not part of this demo instance."));
    }
    card.append(body);
    grid.append(card);
  }
  mount.append(grid);
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
