// system/brand-import.mjs — the public drop-to-re-skin surface in home's beat 02
// (#130, .claude/plans/public-drop-to-reskin.md).
//
// A reader drops their design system's JSON token export; this reads it IN THE BROWSER, runs the
// REAL mapping engine (system/pack-import.mjs — the same one tooling/figma/figma-pull.mjs and the
// portal drawer run), and renders the mapping report with its WCAG receipts. "Wear it" makes the
// whole site wear their design for the visit; "Download" hands back tokens.<slug>.css whose :root
// block is byte-identical to what the CLI writes for the same input.
//
// Nothing is uploaded, because there is nothing to upload to: the shipped site is static and has
// no server. That is a fact about the architecture, not a promise about a policy, and the copy
// says it in those terms.
//
// Honesty (hard, the PRD's contract): what comes out is the READER's design work mapped onto this
// repo's contract — not this repo's design, and not their official design system either. Every
// limit leads rather than trails: families that fell short and stayed on this repo's defaults,
// names the classifier could not place, values the validator refused, WCAG pairs still failing,
// and the standing fact that components and fonts never import.
//
// Node-import-safe: document/DOM references live inside function bodies, and the mount self-boots
// behind a `typeof document` guard at the very bottom.

import { aliasPath, cssValue, emitPackCss, entriesFromExport, mapPack, parseContract } from "./pack-import.mjs";
import {
  applyImported, buildImportedRecord, clearInlineTokens, readImported, vetTokens, writeImported,
} from "./pack-imported.mjs";
import { createCompareSlider } from "./compare-slider.mjs";
import { PACK_REQUEST_EVENT } from "./pack-derived.mjs";
import { trackFactoryDriven } from "./analytics.mjs";

// Mirrors portal/lib/figma.mjs, portal/public/portal.js and system/build-import.mjs — FOUR files
// now carry this number; if it moves, move all four. Chosen, not measured: comfortably above any believable token
// export, far below figma-read's 128 MB parse ceiling.
const MAX_EXPORT_BYTES = 32 * 1024 * 1024;

const mb = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

// --- DOM builder (dock.mjs:46 shape) — text via textContent, attrs via setAttribute. Deliberately
// duplicated per module (see wcag-receipts.mjs:31 for why a 10-line private helper beats a shared
// dependency). Engine- and visitor-supplied strings stay inert text; nothing here takes markup.
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

// The slug names the downloaded file. RESERVED becomes a RENAME, not a refusal (the portal
// refuses because a slug there names a file it would overwrite inside system/; a Blob download
// has no filesystem to protect, so refusing a reader's own company name would be theatre).
const RESERVED = new Set(["contract", "neutral", "source", "verdant", "saulera", "plusui"]);
function slugFrom(label, fileName) {
  const base = (label || String(fileName || "").replace(/\.json$/i, "") || "imported").toLowerCase();
  const slug = base.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "imported";
  return RESERVED.has(slug) ? `${slug}-import` : slug;
}

function mount(root) {
  const fileInput = root.querySelector("[data-import-file]");
  const dropZone = root.querySelector("[data-import-drop]");
  const statusEl = root.querySelector("[data-import-status]");
  const reportEl = root.querySelector("[data-import-report]");
  if (!fileInput || !dropZone || !statusEl || !reportEl) return;

  const beat = document.getElementById("beat-brand");
  const nameInput = beat ? beat.querySelector("[data-brand-name]") : null;

  // The last successful mapping, kept so "Wear it" and "Download" act on the engine's own output
  // rather than re-running it — and so Download emits from the FULL mapped values, not the vetted
  // subset the record wears (AC #6: the download must match the CLI byte for byte).
  let last = null;
  let contract = null;

  const status = (text, state) => {
    statusEl.textContent = text;
    statusEl.dataset.state = state || "idle";
  };

  // Fetched lazily and once: home must not pay for tokens.source.json on every load for a feature
  // most readers never touch.
  async function getContract() {
    if (contract) return contract;
    const res = await fetch("/system/tokens.source.json");
    if (!res.ok) throw new Error(`could not read this site's token contract (HTTP ${res.status})`);
    const json = await res.json();
    contract = parseContract(json, { label: "system/tokens.source.json" });
    // The raw source rides along for the compare slider: a contract $value can be an alias
    // ({neutral.primitives.color-ink}) that only the full source can resolve to a literal.
    contract.src = json;
    return contract;
  }

  // ---------------------------------------------------------------- the run

  async function run(json, fileName, { accent = null } = {}) {
    const contract = await getContract();
    const { entries, notes } = entriesFromExport(json);
    if (!entries.length) {
      throw new Error(`${fileName}: no tokens found — expected DTCG ($value/$type), Tokens Studio ({value,type}), or a nested name→value map.`);
    }
    const label = (nameInput && nameInput.value.trim()) || String(fileName).replace(/\.json$/i, "");
    const slug = slugFrom(nameInput && nameInput.value.trim(), fileName);
    const mapped = mapPack({
      entries, contract, slug, accent,
      fileName, sourceKey: fileName,
      // The provenance line a browser drop can honestly make. It is NOT the CLI's command,
      // because no such command ran — but it names the one that reproduces this exact mapping.
      regenerate: (pick) =>
        `imported in a browser from "${fileName}" on the public site. No file was uploaded; the ` +
        `mapping ran locally. Reproduce with: node tooling/figma/figma-pull.mjs --slug ${slug}` +
        (pick.neutral ? ` --neutral ${pick.neutral}` : "") +
        (pick.accent ? ` --accent ${pick.accent}` : "") +
        ` --from <your export>`,
    });
    last = { mapped, slug, label, fileName, notes: [...notes, ...mapped.notes], contract };
    return last;
  }

  // ---------------------------------------------------------------- the report

  function table(headings, rows) {
    const thead = el("thead", {}, el("tr", {}, ...headings.map((h) => el("th", { text: h }))));
    const tbody = el("tbody", {}, ...rows);
    return el("div", { class: "brand-import-scroll" }, el("table", { class: "brand-import-table" }, thead, tbody));
  }

  function limitsSection(r) {
    const { mapped } = r;
    const items = [];
    const short = mapped.scales.short || [];
    if (short.length) {
      items.push(`Not imported, so these stayed on this site's defaults: ` +
        short.map((s) => `${FAMILY_LABEL[s.family] || s.family} (your design offered ${s.offered}, the contract has ${s.needs} slots)`).join(" · ") +
        `. A half-imported ramp would be neither your design's nor this site's, so a family that falls short imports nothing.`);
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
    items.push(`Components and fonts never import, by design. What came across is colour, spacing, radius, the type ramp and shadows.`);
    return el("div", { class: "brand-import-limits" },
      el("h3", { class: "brand-import-h3", text: "What did not come across" }),
      el("ul", {}, ...items.map((t) => el("li", { text: t }))));
  }

  // ---------------------------------------------------------------- the compare slider (#170)

  // A contract $value resolved to a CONCRETE css value against the raw token source: an alias like
  // {neutral.primitives.color-ink} is followed until a literal. Pinning literals (never var()
  // references) is what keeps the "neutral" layer neutral after "Wear it" or a dock pack switch —
  // saulera does not even define the neutral primitives an unresolved var() would lean on.
  function concreteValue($value, src) {
    let v = $value;
    for (let hops = 0; v != null && hops < 8; hops++) {
      const path = aliasPath(v);
      if (!path) break;
      let node = src;
      for (const seg of path.split(".")) node = node ? node[seg] : undefined;
      // An alias chain that bottoms out on a non-$value node surfaces the unresolved alias
      // verbatim rather than a silent "" — visible in the swatch text, so it names itself.
      if (!(node && typeof node === "object" && "$value" in node)) return cssValue(v);
      v = node.$value;
    }
    return v == null ? "" : cssValue(v);
  }

  // The four tokens the specimen renders as swatches. Both layers pin every one of them
  // (neutral-literal fallback), so a chip can never follow the live dock pack while its
  // printed value says otherwise.
  const SPECIMEN_TOKENS = ["color-bg", "color-bg-surface", "color-fg", "color-accent"];

  // The specimen both layers render — identical markup, styled only by tokens (portfolio.css
  // .cmp-sample-*), so the one difference between the two sides is the values pinned on each
  // layer's subtree. `valueOf(token)` supplies the display text beside each swatch.
  function buildSample(valueOf) {
    const sw = (token) =>
      el("span", { class: "cmp-sample-sw" },
        el("span", { class: "cmp-sample-chip", style: `background: var(--${token})` }),
        el("code", { text: String(valueOf(token)) }));
    return el("div", { class: "cmp-sample" },
      el("p", { class: "cmp-sample-head", text: "The same card" }),
      el("p", { class: "cmp-sample-body", text: "Identical markup on both sides. Only the token values differ." }),
      el("span", { class: "cmp-sample-btn", text: "Primary action" }),
      el("div", { class: "cmp-sample-swatches" },
        ...SPECIMEN_TOKENS.map(sw)));
  }

  function pinTokens(layerEl, entries) {
    for (const [key, value] of Object.entries(entries)) layerEl.style.setProperty(key, value);
  }

  // Neutral pack vs the reader's imported pack, on one specimen. BOTH layers pin their values on
  // their own subtree (never :root): the overlay pins the vetted import, the base pins the
  // contract's neutral literals for exactly those keys — so the comparison stays neutral-vs-import
  // even after "Wear it" re-skins the page underneath it. Only vetTokens-passed values are ever
  // applied (the beat already reports what the vet dropped).
  function compareSection(r) {
    const prefixed = {};
    for (const [name, value] of Object.entries(r.mapped.values)) prefixed["--" + name] = value;
    const { tokens: vetted } = vetTokens(prefixed);
    if (!Object.keys(vetted).length) return null;
    // Pin maps cover the union of vetted keys + the specimen's own swatch tokens: an import
    // missing a specimen token gets the neutral literal pinned on BOTH layers, so chip colour
    // and printed value always agree even after "Wear it" or a dock pack switch.
    const neutral = {};
    const pinKeys = new Set([...Object.keys(vetted), ...SPECIMEN_TOKENS.map((t) => "--" + t)]);
    for (const key of pinKeys) {
      const node = r.contract.byName[key.slice(2)];
      if (node) neutral[key] = concreteValue(node.$value, r.contract.src);
    }
    const neutralOf = (t) => {
      const node = r.contract.byName[t];
      return node ? concreteValue(node.$value, r.contract.src) : "";
    };
    const importedSample = buildSample((t) => vetted["--" + t] ?? neutralOf(t));
    const neutralSample = buildSample(neutralOf);
    pinTokens(importedSample, { ...neutral, ...vetted });
    pinTokens(neutralSample, neutral);
    const slider = createCompareSlider({
      base: neutralSample, overlay: importedSample,
      baseLabel: "this site's neutral", overlayLabel: r.label,
      label: "Compare: this site's neutral pack versus your imported pack",
    });
    return el("div", { class: "cmp-block" },
      el("p", { class: "brand-import-note", text:
        `Drag the divider, or focus it and use the arrow keys: ${r.label} on the left, this site's neutral on the right.` }),
      slider);
  }

  function renderReport(r) {
    const { mapped } = r;
    reportEl.textContent = "";
    reportEl.hidden = false;

    const pass = mapped.checks.length - mapped.failures.length;
    const families = Object.keys(mapped.scales.imported || {});
    const summaryBits = [
      `${mapped.placed.length} tokens mapped from your design`,
      families.length ? `${families.map((f) => FAMILY_LABEL[f] || f).join(", ")} imported` : `no scale family had enough values`,
      `${mapped.filled.length} auto-filled from this site's defaults`,
      `${pass}/${mapped.checks.length} WCAG pairs pass`,
    ];

    reportEl.append(
      // The honesty statement leads, above everything the import produced.
      el("p", { class: "brand-import-honesty", text:
        `Your file was read here in your browser and never uploaded. What came out is your design work, mapped onto this site's token contract. It is not authored by me, and it is not your official design system — it is your values on this system's roles.` }),
      el("p", { class: "brand-import-summary", text: summaryBits.join(" · ") }),
    );

    const compare = compareSection(r);
    if (compare) reportEl.appendChild(compare);

    const actions = el("div", { class: "brand-import-actions" });
    const wearBtn = el("button", { type: "button", class: "btn btn-primary", text: "Wear it across the site" });
    const dlBtn = el("button", { type: "button", class: "btn btn-secondary", text: `Download tokens.${r.slug}.css` });
    wearBtn.addEventListener("click", () => wearIt(r));
    dlBtn.addEventListener("click", () => download(r));
    actions.append(wearBtn, dlBtn);
    reportEl.appendChild(actions);

    reportEl.appendChild(limitsSection(r));

    // Everything else sits behind a disclosure: the summary and the limits are the reading, the
    // tables are the evidence for a reader who wants to check it.
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

    for (const [family, rec] of Object.entries(mapped.scales.imported || {})) {
      details.appendChild(el("h3", { class: "brand-import-h3", text: `${FAMILY_LABEL[family] || family} — ${rec.slots} of ${rec.offered} value(s), ${rec.rule}` }));
      details.appendChild(table(["Token", "Value", "From your design"], rec.taken.map((t) =>
        el("tr", {},
          el("td", {}, el("code", { text: t.token })),
          el("td", {}, el("code", { text: t.value })),
          el("td", { text: t.name })))));
      if (rec.dropped.length) {
        details.appendChild(el("p", { class: "brand-import-note", text: `Dropped: ${rec.dropped.join(", ")}` }));
      }
    }

    details.appendChild(el("h3", { class: "brand-import-h3", text: `WCAG — ${pass}/${mapped.checks.length} pairs pass` }));
    details.appendChild(table(["", "Ratio", "Min", "Pair"], mapped.checks.map((c) =>
      el("tr", { "data-pass": String(c.pass) },
        el("td", { text: c.pass ? "✓" : "✗" }),
        el("td", { text: String(c.ratio) }),
        el("td", { text: String(c.min) }),
        el("td", { text: `${c.fg} on ${c.bg}` })))));

    if (mapped.stepped.length) {
      details.appendChild(el("h3", { class: "brand-import-h3", text: "Contrast negotiated within your own ramps" }));
      details.appendChild(el("ul", { class: "brand-import-note" }, ...mapped.stepped.map((s) =>
        el("li", { text: `${s.token}: ${s.ramp}/${s.from} (${s.fromValue}) → ${s.ramp}/${s.to} (${s.toValue})` }))));
    }

    details.appendChild(el("h3", { class: "brand-import-h3", text: "The pack header this import carries" }));
    details.appendChild(el("pre", { class: "brand-import-pre" }, el("code", { text: mapped.note })));

    reportEl.appendChild(details);
  }

  // A refusal the engine could not resolve for itself. Where it named candidates, the reader can
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

  // ---------------------------------------------------------------- wear / download

  function wearIt(r) {
    const rec = buildImportedRecord({
      slug: r.slug, label: r.label, fileName: r.fileName,
      values: r.mapped.values, note: r.mapped.note,
      report: {
        placed: r.mapped.placed, scales: r.mapped.scales, checks: r.mapped.checks,
        failures: r.mapped.failures, derivedUsed: r.mapped.derivedUsed,
        collapsed: r.mapped.collapsed, filled: r.mapped.filled,
      },
    });
    writeImported(rec);
    // Ask the DOCK to own the transition (#102): it enforces the neutral base, clears the derived
    // props that would otherwise outrank the imported <style>, and runs the view transition. If
    // nothing claims the request there is no dock on this page, so apply it directly.
    const claimed = !window.dispatchEvent(new CustomEvent(PACK_REQUEST_EVENT, {
      detail: { target: "imported" }, cancelable: true,
    }));
    // Storage refused the write (private browsing), so the dock could not read the record back and
    // declined the pick — nothing would go on stage at all. Apply it here instead: the design is
    // worn on THIS page and simply will not follow the reader, which the status below says out
    // loud rather than letting them discover it on the next page.
    const stored = Boolean(readImported());
    if (!claimed || !stored) {
      clearInlineTokens();
      applyImported(rec);
    }
    const dropped = rec.report.rejected.length;
    status(
      (stored
        ? `The site is wearing ${r.label}.`
        : `This page is wearing ${r.label}. Your browser is blocking storage, so it will not follow you to the other pages.`) +
      (dropped ? ` ${dropped} value(s) your design offered could not be applied safely and were left out.` : ""),
      "worn",
    );
    // Fired from the success path only, so the count means "a reader's own design went on stage".
    trackFactoryDriven();
  }

  function download(r) {
    // Emitted from the engine's FULL mapped values — not the record's vetted subset — so the file
    // is byte-identical to what the CLI writes for the same input (AC #6). The vetting exists to
    // decide what is safe to APPLY to this page; it is not a claim about the design.
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

  // The parsed JSON of the file currently in hand, so a candidate retry re-maps without asking the
  // reader to drop the file again.
  let held = null;

  async function retry(fileName, accent) {
    if (!held) return;
    status(`Re-running with ${accent} as the accent…`, "busy");
    try {
      renderReport(await run(held, fileName, { accent }));
      status(`Mapped ${fileName}.`, "done");
    } catch (err) {
      renderRefusal(err, fileName);
    }
  }

  async function pickFile(file) {
    reportEl.hidden = true;
    reportEl.textContent = "";
    held = null;
    last = null;
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
      renderReport(await run(json, file.name));
      status(`Mapped ${file.name}. Nothing was uploaded.`, "done");
    } catch (err) {
      renderRefusal(err, file.name);
    }
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

  // A record restored from an earlier page in this visit: say so, so the beat and the dock agree
  // about what the site is wearing. No report — the mapping is not re-run on arrival.
  const existing = readImported();
  if (existing) status(`The site is wearing ${existing.label}, imported from ${existing.fileName} in this browser.`, "worn");
}

// Self-boot behind a DOM guard so a Node import (drift-check's node --check, any harness) stays
// clean. Every other page has no [data-import] mount and stays entirely inert.
if (typeof document !== "undefined") {
  const root = document.querySelector("[data-import]");
  if (root) mount(root);
}
