// system/build-import.mjs — Act 0 of the pattern builder: the visitor's design lands on the stage
// (epic #134, ticket #135; .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.2,
// .claude/plans/build-page-import-act.md).
//
// A visitor drops their design system's JSON token export on /build. This reads it IN THE BROWSER
// and runs the SHIPPED mapping engine (system/pack-import.mjs — the same one tooling/figma's CLI,
// the portal drawer and home's drop surface run), then applies the result to the BUILD STAGE ONLY.
//
// Scoped, and that is the whole design of this module:
//
//   1. The values go on #build-stage as inline custom properties (the system/instance.mjs peak
//      model, instance.mjs:289), never on :root. Every pixel of chrome around the stage stays on
//      the neutral pack, so the reader can see exactly where their design starts and stops. Wearing
//      a design SITE-WIDE is a different feature with a different owner: home's drop surface
//      (system/brand-import.mjs) and the appearance dock (system/dock.mjs). One owner per concern.
//   2. The record is BUILT but NOT STORED. buildImportedRecord() gives the real record shape (and
//      its vetted token map is what the stage wears), but nothing is written to sessionStorage,
//      because pack-boot.js:34 reads that key FIRST on every page and applies it before paint — so
//      a write here would make the import site-wide on the reader's next navigation, which is the
//      opposite of what this page promises. When a later slice adds "wear it site-wide", it calls
//      writeImported() from a control the reader pressed, not from the drop.
//   3. It IS published, into the page's own in-memory BUILD_CHANGE store (build-questions.mjs), as
//      `pack: { slug, label, fileName, tokens, note }`. That is memory for the length of this page
//      view and nothing else — no storage, no server — and it exists because the share codec has to
//      carry the token VALUES: an imported export cannot be re-run from a URL. The same module then
//      ADOPTS a restored pack off that store, which is how a shared link dresses the stage.
//
// One application point, and it is this module's invariant: applyToStage is the only place a
// /build token value reaches style.setProperty, and it calls vetTokens on its own argument rather
// than trusting its four callers (drop · candidate retry · derive · restore). The choke point is
// enforced where the values land, not by four correct call sites — one of which is now a URL a
// stranger wrote. tooling/build-checks.mjs reads this file as text and asserts that the inline-style
// write below occurs exactly ONCE in it (it greps for the call, which is why this sentence describes
// it rather than spelling it) — crude on purpose, and loud the day someone adds a second.
//
// This module deliberately does NOT import from system/brand-import.mjs. That module exports
// nothing and self-boots on [data-import]; it owns home's beat, and reaching into it to serve
// /build would put home's surface at risk for no gain. Both consume the same engine instead, which
// is the thing that actually has to be shared. The mount attribute here is [data-build-import], so
// the two self-boots can never collide on one page.
//
// Node-import-safe: document/DOM references live inside function bodies, and the mount self-boots
// behind a `typeof document` guard at the very bottom.

import { emitPackCss, entriesFromExport, mapPack, parseContract } from "./pack-import.mjs";
import { buildImportedRecord, readImported, vetTokens } from "./pack-imported.mjs";
import { deriveBrandTokens } from "./pack-derived.mjs";
import { BUILD_CHANGE, publishBuild, readBuild } from "./build-questions.mjs";

// Mirrors portal/lib/figma.mjs, portal/public/portal.js and system/brand-import.mjs — FOUR files
// now carry this number; if it moves, move all four. Chosen, not measured: comfortably above any
// believable token export, far below figma-read's 128 MB parse ceiling.
const MAX_EXPORT_BYTES = 32 * 1024 * 1024;

const mb = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

// --- DOM builder (dock.mjs:46 shape) — text via textContent, attrs via setAttribute. Deliberately
// duplicated per module (see wcag-receipts.mjs:31 and brand-import.mjs:37 for why a 10-line private
// helper beats a shared dependency). Engine- and visitor-supplied strings stay inert text.
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "text") node.textContent = v;
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const c of children) if (c != null) node.appendChild(c);
  return node;
}

// A third-party hex on its way into a style attribute is proved first (portal.js:140).
const swatchStyle = (hex) => (/^#[0-9a-f]{6}$/i.test(String(hex)) ? `background:${hex}` : "");

const FAMILY_LABEL = { spacing: "spacing", radius: "radius", type: "type ramp", shadow: "shadows" };

// The five families this engine imports — the same shape pack-imported.mjs's KEY_NAME allows. Used
// only to CLEAR the stage: whatever went on it came from vetTokens, so clearing by family removes
// exactly that set without keeping a parallel list of what was applied.
const STAGE_KEY = /^--(color|spacing|radius|type|shadow)-[a-z0-9-]{1,32}$/;

// The slug names the downloaded file. RESERVED becomes a RENAME, not a refusal — a Blob download
// has no filesystem to protect (brand-import.mjs:57-60 argues this at length).
const RESERVED = new Set(["contract", "neutral", "source", "verdant", "saulera", "plusui"]);
function slugFrom(fileName) {
  const base = String(fileName || "").replace(/\.json$/i, "").toLowerCase() || "imported";
  const slug = base.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "imported";
  return RESERVED.has(slug) ? `${slug}-import` : slug;
}

function mount(root) {
  const fileInput = root.querySelector("[data-build-file]");
  const dropZone = root.querySelector("[data-build-drop]");
  const statusEl = root.querySelector("[data-build-status]");
  const colorInput = root.querySelector("[data-build-color]");
  const deriveBtn = root.querySelector("[data-build-derive]");
  const resetBtn = root.querySelector("[data-build-reset]");
  const reportEl = document.querySelector("[data-build-report]");
  const stage = document.getElementById("build-stage");
  // Every stage on the page, not just Act 0's: the pattern that renders in Act 4 wears the
  // visitor's design too, and both stages are dressed and undressed together. #build-stage stays
  // the guard, because it is what says "this page has an Act 0 at all".
  const stages = [...document.querySelectorAll("[data-build-stage]")];
  const stageLabel = document.querySelector("[data-build-stage-label]");
  const keepEmpty = document.querySelector("[data-build-keep-empty]");
  const keepActions = document.querySelector("[data-build-keep-actions]");
  if (!fileInput || !dropZone || !statusEl || !reportEl || !stage) return;

  // The last successful mapping. Kept so the download acts on the engine's own output rather than
  // re-running it, and so the FULL mapped values reach emitPackCss — not the vetted subset the
  // stage wears. The vetting decides what is safe to APPLY; it is not a claim about the design.
  let last = null;
  let contract = null;
  // The parsed JSON of the file currently in hand, so a candidate retry re-maps without asking the
  // reader to drop the file again.
  let held = null;

  const status = (text, state) => {
    statusEl.textContent = text;
    statusEl.dataset.state = state || "idle";
  };

  // Fetched lazily and once: the page must not pay for tokens.source.json on every load for a
  // feature a reader may never reach.
  async function getContract() {
    if (contract) return contract;
    const res = await fetch("/system/tokens.source.json");
    if (!res.ok) throw new Error(`could not read this site's token contract (HTTP ${res.status})`);
    contract = parseContract(await res.json(), { label: "system/tokens.source.json" });
    return contract;
  }

  // ---------------------------------------------------------------- the stage

  // Inline custom properties on the stage elements outrank the contract and pack layers for
  // everything inside them, and reach nothing outside them.
  //
  // THE CHOKE POINT. vetTokens runs HERE, on whatever it is handed, even where the caller already
  // vetted (the import record) or the codec already validated (a restore). One of the four callers
  // now carries values a stranger put in a URL, and an invariant enforced at four call sites is an
  // invariant one refactor away from a hole. VALUE_OK excludes : ; { } < > " ' \ * and &, so a
  // value cannot break out of its own declaration and url(javascript:x) is rejected, not escaped.
  function applyToStage(tokens) {
    const vetted = vetTokens(tokens || {}).tokens;
    for (const [k, v] of Object.entries(vetted)) {
      for (const el of stages) el.style.setProperty(k, v);
    }
  }
  function clearStage() {
    for (const el of stages) {
      // Iterate a copy: removeProperty mutates the live list underneath the index.
      for (const name of [...el.style]) {
        if (STAGE_KEY.test(name)) el.style.removeProperty(name);
      }
    }
  }
  function labelStage(text) {
    if (stageLabel) stageLabel.textContent = text;
  }

  // What the stage is wearing when nothing on THIS page has been put on it. Usually the neutral
  // pack — but a reader who imported a design on the home page and pressed "Wear it across the
  // site" arrives here with pack-boot.js already dressing :root in it, and the stage sits inside
  // that. Calling it neutral there would be a false claim rendered at rest, on the one page whose
  // whole argument is that its claims are checkable.
  function restingLabel() {
    const worn = readImported();
    return worn
      ? `Wearing ${worn.label}, imported on the home page in this visit.`
      : "Neutral, on this site's own pack.";
  }

  // ---------------------------------------------------------------- the run

  async function run(json, fileName, { accent = null } = {}) {
    const contract = await getContract();
    const { entries, notes } = entriesFromExport(json);
    if (!entries.length) {
      throw new Error(`${fileName}: no tokens found — expected DTCG ($value/$type), Tokens Studio ({value,type}), or a nested name→value map.`);
    }
    const slug = slugFrom(fileName);
    const mapped = mapPack({
      entries, contract, slug, accent,
      fileName, sourceKey: fileName,
      // The provenance line a browser drop can honestly make. It is NOT the CLI's command, because
      // no such command ran — but it names the one that reproduces this exact mapping. Same wording
      // as home's drop surface, so the same export downloads identically from either page.
      regenerate: (pick) =>
        `imported in a browser from "${fileName}" on the public site. No file was uploaded; the ` +
        `mapping ran locally. Reproduce with: node tooling/figma/figma-pull.mjs --slug ${slug}` +
        (pick.neutral ? ` --neutral ${pick.neutral}` : "") +
        (pick.accent ? ` --accent ${pick.accent}` : "") +
        ` --from <your export>`,
    });
    // Built, never hand-written — and never stored. See the module header for why the write is the
    // one thing this page does not do.
    const record = buildImportedRecord({
      slug, label: fileName, fileName,
      values: mapped.values, note: mapped.note,
      report: {
        placed: mapped.placed, scales: mapped.scales, checks: mapped.checks,
        failures: mapped.failures, derivedUsed: mapped.derivedUsed,
        collapsed: mapped.collapsed, filled: mapped.filled,
      },
    });
    last = { mapped, record, slug, fileName, notes: [...notes, ...mapped.notes], contract };
    return last;
  }

  // ---------------------------------------------------------------- the report

  function table(headings, rows) {
    const thead = el("thead", {}, el("tr", {}, ...headings.map((h) => el("th", { text: h }))));
    return el("div", { class: "brand-import-scroll" },
      el("table", { class: "brand-import-table" }, thead, el("tbody", {}, ...rows)));
  }

  function limitsSection(mapped, rejected) {
    const items = [];
    const short = mapped.scales.short || [];
    if (short.length) {
      items.push(`Not imported, so these stayed on this site's defaults: ` +
        short.map((s) => `${FAMILY_LABEL[s.family] || s.family} (your design offered ${s.offered}, the contract has ${s.needs} slots)`).join(" · ") +
        `. A half-imported ramp would belong to neither design, so a family that falls short imports nothing.`);
    }
    const unclassified = mapped.scales.unclassified || [];
    if (unclassified.length) {
      items.push(`Read but not placed into a family, so not imported: ${unclassified.join(", ")}.`);
    }
    if (mapped.failures.length) {
      items.push(`${mapped.failures.length} WCAG pair(s) still failing — no value your design offers satisfies them: ` +
        mapped.failures.map((f) => `${f.fg} on ${f.bg} ${f.ratio}:1 < ${f.min}`).join(", ") + `.`);
    }
    if (mapped.collapsed.length) {
      items.push(`Too few rungs for a distinct state colour: ` +
        mapped.collapsed.map((c) => `${c.token} repeats ${c.twin}`).join(", ") + `.`);
    }
    if (mapped.derivedUsed.length) {
      items.push(`Rung numbers derived, not read, for ${mapped.derivedUsed.join(" and ")}: your file does not number those colours, so they were ordered by lightness and numbered from that order. The numbers are this importer's; the colours are yours.`);
    }
    if (rejected.length) {
      items.push(`${rejected.length} value(s) could not be applied to the stage safely and were left out: ${rejected.map((r) => r.key).join(", ")}. They are still in the stylesheet you can download.`);
    }
    items.push(`Components and fonts never import, by design. What came across is colour, spacing, radius, the type ramp and shadows.`);
    return el("div", { class: "brand-import-limits" },
      el("h3", { class: "brand-import-h3", text: "What did not come across" }),
      el("ul", {}, ...items.map((t) => el("li", { text: t }))));
  }

  // The reading leads; the evidence sits behind a disclosure. Home's beat carries the full
  // per-token receipts (brand-import.mjs:198-236); this page's job is to get the reader's design
  // onto the stage and move on, so the placed table and the WCAG table are the evidence kept here.
  function renderReport(r) {
    const { mapped, record } = r;
    reportEl.textContent = "";
    reportEl.hidden = false;

    const pass = mapped.checks.length - mapped.failures.length;
    const families = Object.keys(mapped.scales.imported || {});

    reportEl.append(
      el("p", { class: "brand-import-honesty", text:
        `Your file was read here in your browser and never uploaded. What came out is your design work, mapped onto this site's token contract. It is not authored by me, and it is not your official design system either — it is your values on this system's roles.` }),
      el("p", { class: "brand-import-summary", text: [
        `${mapped.placed.length} tokens mapped from your design`,
        families.length ? `${families.map((f) => FAMILY_LABEL[f] || f).join(", ")} imported` : `no scale family had enough values`,
        `${mapped.filled.length} auto-filled from this site's defaults`,
        `${pass}/${mapped.checks.length} WCAG pairs pass`,
      ].join(" · ") }),
      limitsSection(mapped, record.report.rejected),
    );

    const details = el("details", { class: "brand-import-details" },
      el("summary", { text: "Show every token and where it came from" }));

    details.appendChild(el("h3", { class: "brand-import-h3", text: `Mapped from your design — ${mapped.placed.length} tokens` }));
    details.appendChild(table(["Token", "Value", "Where it came from"], mapped.placed.map((p) =>
      el("tr", {},
        el("td", {}, el("code", { text: p.token })),
        el("td", {},
          el("span", { class: "brand-import-chip", style: swatchStyle(mapped.values[p.token]) }),
          el("code", { text: String(mapped.values[p.token]) })),
        el("td", { text: p.source })))));

    details.appendChild(el("h3", { class: "brand-import-h3", text: `WCAG — ${pass}/${mapped.checks.length} pairs pass` }));
    details.appendChild(table(["", "Ratio", "Min", "Pair"], mapped.checks.map((c) =>
      el("tr", { "data-pass": String(c.pass) },
        el("td", { text: c.pass ? "✓" : "✗" }),
        el("td", { text: String(c.ratio) }),
        el("td", { text: String(c.min) }),
        el("td", { text: `${c.fg} on ${c.bg}` })))));

    details.appendChild(el("h3", { class: "brand-import-h3", text: "The pack header this import carries" }));
    details.appendChild(el("pre", { class: "brand-import-pre" }, el("code", { text: mapped.note })));

    reportEl.appendChild(details);
  }

  // A refusal the engine could not resolve for itself. Where it named candidates the reader can
  // answer the question; where it did not, the message renders verbatim with NO affordance —
  // inventing a control there would be an overclaim (portal.js:214-217 says exactly this).
  function renderRefusal(err, fileName) {
    reportEl.textContent = "";
    status(err.message, "error");
    if (!err.candidates || !err.candidates.length) {
      reportEl.hidden = true;
      return;
    }
    reportEl.hidden = false;
    reportEl.appendChild(el("p", { class: "brand-import-note", text:
      "The importer won't pick a brand colour for you. Choose the ramp it should use as the accent:" }));
    const grid = el("div", { class: "brand-import-swatches" });
    for (const c of err.candidates) {
      const btn = el("button", { type: "button", class: "brand-import-swatch" },
        el("span", { class: "brand-import-chip", style: swatchStyle(c.swatch) }),
        el("span", { class: "brand-import-swatch-hue", text: c.hue }),
        el("span", { class: "brand-import-note", text: `${c.rungs} rungs · chroma ${Number(c.chroma).toFixed(3)}` }));
      btn.addEventListener("click", () => retry(fileName, c.hue));
      grid.appendChild(btn);
    }
    reportEl.appendChild(grid);
  }

  // ---------------------------------------------------------------- keep

  function offerDownload(r) {
    if (!keepActions) return;
    keepActions.textContent = "";
    keepActions.hidden = false;
    if (keepEmpty) keepEmpty.hidden = true;
    const btn = el("button", { type: "button", class: "btn btn-secondary", text: `Download tokens.${r.slug}.css` });
    btn.addEventListener("click", () => download(r));
    keepActions.append(btn);
  }

  function clearKeep() {
    if (keepActions) {
      keepActions.textContent = "";
      keepActions.hidden = true;
    }
    if (keepEmpty) keepEmpty.hidden = false;
  }

  function download(r) {
    // Emitted from the engine's FULL mapped values, so the file is byte-identical to what the CLI
    // writes for the same input — and to what home's drop surface hands back.
    const { css } = emitPackCss(r.mapped.values, { slug: r.slug, note: r.mapped.note, contract: r.contract });
    const url = URL.createObjectURL(new Blob([css], { type: "text/css" }));
    const a = el("a", { href: url, download: `tokens.${r.slug}.css` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke on the next tick, or every download leaks the pack for the page's lifetime.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // ---------------------------------------------------------------- input handling

  function succeed(r) {
    renderReport(r);
    clearStage();
    applyToStage(r.record.tokens);
    labelStage(`Wearing ${r.fileName}. The stage only.`);
    offerDownload(r);
    // The vetted subset, which is what the stage actually wears and therefore the only honest
    // thing to put in a share link. The full mapped values stay in `last` for the download.
    publishBuild({ source: "import", pack: {
      slug: r.slug, label: r.fileName, fileName: r.fileName,
      tokens: r.record.tokens, note: r.mapped.note,
    } });
  }

  async function retry(fileName, accent) {
    if (!held) return;
    status(`Re-running with ${accent} as the accent…`, "busy");
    try {
      succeed(await run(held, fileName, { accent }));
      // The same sentence the drop path ends on: answering the accent question is not a lesser
      // outcome, so it does not get a lesser confirmation.
      status(`Mapped ${fileName}. The stage is wearing your design. Nothing was uploaded.`, "done");
    } catch (err) {
      renderRefusal(err, fileName);
    }
  }

  async function pickFile(file) {
    reportEl.hidden = true;
    reportEl.textContent = "";
    held = null;
    last = null;
    clearKeep();
    if (!file) return;
    // Client-side pre-checks name the limit before any work starts and catch a mis-drop instantly.
    if (!/\.json$/i.test(file.name)) {
      status(`"${file.name}" isn't a .json export. Export your design's tokens (DTCG, Tokens Studio, a variables dump, or any nested name→value JSON) and drop that. A .fig file is the design, not its tokens.`, "error");
      return;
    }
    if (file.size > MAX_EXPORT_BYTES) {
      status(`"${file.name}" is ${mb(file.size)}, over the ${mb(MAX_EXPORT_BYTES)} cap — a token export should be far smaller; this looks like the wrong file.`, "error");
      return;
    }
    // The pending state. file.text() yields, but JSON.parse and the mapping after it do NOT, so
    // without an explicit frame the reader would see nothing until the work finished. Two nested
    // rAFs, not one: a single rAF fires BEFORE paint.
    status(`Reading ${file.name} · ${mb(file.size)}…`, "busy");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    let json;
    try {
      json = JSON.parse(await file.text());
    } catch (err) {
      status(`"${file.name}" isn't valid JSON — ${err.message}`, "error");
      return;
    }
    held = json;
    try {
      succeed(await run(json, file.name));
      status(`Mapped ${file.name}. The stage is wearing your design. Nothing was uploaded.`, "done");
    } catch (err) {
      renderRefusal(err, file.name);
    }
  }

  // The fallback for a reader with no export to hand: one colour through the REAL contrast engine
  // (system/derive.mjs, via pack-derived's deriveBrandTokens), applied to the same scoped stage.
  // vetTokens is the same allowlist the import path passes through, so one rule governs everything
  // that reaches the stage.
  function deriveFromColour() {
    if (!colorInput) return;
    const hex = colorInput.value;
    let tokens;
    try {
      tokens = vetTokens(deriveBrandTokens(hex)).tokens;
    } catch (err) {
      status(`Could not derive a palette from ${hex} — ${err.message}`, "error");
      return;
    }
    reportEl.hidden = true;
    reportEl.textContent = "";
    held = null;
    last = null;
    clearKeep();
    clearStage();
    applyToStage(tokens);
    labelStage(`Derived from ${hex}. The stage only.`);
    status(`Derived a full palette from ${hex} and checked every contrast pair. The stage is wearing it.`, "done");
    // fileName is null and stays null: nothing was imported, so there is no file to name. The hex
    // is the label, which is the whole provenance a derived palette has.
    publishBuild({ source: "import", pack: {
      slug: "derived", label: hex, fileName: null, tokens, note: null,
    } });
  }

  function resetToNeutral() {
    held = null;
    last = null;
    clearStage();
    clearKeep();
    reportEl.hidden = true;
    reportEl.textContent = "";
    labelStage(restingLabel());
    status("", "idle");
    publishBuild({ source: "import", pack: null });
  }

  fileInput.addEventListener("change", (e) => pickFile(e.target.files[0]));
  // dragover MUST preventDefault or drop never fires (portal.js:148).
  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("is-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("is-over");
    pickFile(e.dataTransfer.files[0]);
  });
  if (deriveBtn) deriveBtn.addEventListener("click", deriveFromColour);
  if (resetBtn) resetBtn.addEventListener("click", resetToNeutral);

  // A shared link arrives with the whole build in it, including the token values, and this module
  // is what puts them on the stages. Registered once, outside any render, and filtered by source —
  // the discipline breadboard.mjs:601 already uses. `import` events are this module's own publish
  // coming back around, so they are ignored.
  function adoptPack(pack) {
    clearStage();
    if (!pack || !pack.tokens) {
      labelStage(restingLabel());
      return;
    }
    applyToStage(pack.tokens);
    labelStage(pack.fileName
      ? `Wearing ${pack.fileName}, from the shared link. The stage only.`
      : `Wearing the design in the shared link. The stage only.`);
    status(
      `This build arrived in a link. The design values came with it and were re-checked here before ` +
      `anything was applied. Nothing was uploaded and nothing was stored. Drop your own export to replace it.`,
      "worn",
    );
  }

  document.addEventListener(BUILD_CHANGE, (e) => {
    if (!e.detail || e.detail.source !== "restore") return;
    adoptPack(e.detail.pack);
  });

  // Say what the page is actually wearing on arrival. A design imported on home in this visit is
  // already on :root via pack-boot.js, and the markup's default label cannot know that.
  labelStage(restingLabel());
  const existing = readImported();
  if (existing) {
    status(`This site is wearing ${existing.label}, imported from ${existing.fileName} on the home page. Drop an export here to put a design on the stage on its own.`, "worn");
  }

  // Pulled as well as listened for (breadboard.mjs:169-171's discipline). A restore that published
  // BEFORE this mount ran left its pack in the store, and reading it here is what makes the restore
  // order-independent: correctness stops resting on one script tag's position.
  const seeded = readBuild();
  if (seeded.pack) adoptPack(seeded.pack);

  // The settled-state handle the visual-regression gate waits on when a later slice baselines this
  // page (memory: a mount with no handle either deadlocks the wait or baselines an empty surface).
  root.dataset.buildImport = "ready";
}

// Self-boot behind a DOM guard so a Node import (drift-check's node --check, any harness) stays
// clean. Every page without a [data-build-import] mount stays entirely inert.
if (typeof document !== "undefined") {
  const root = document.querySelector("[data-build-import]");
  if (root) mount(root);
}
