// system/build-keep.mjs — Act 5 of the pattern builder: what the visitor leaves holding
// (epic #134, ticket #137; .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.4,
// .claude/plans/build-pattern-render-keep-rail.md).
//
// The rail's right-hand row: the SVG build card, four downloads generated in the browser, and the
// link that rebuilds the whole build in a colleague's browser with no server involved. Act 0's
// tokens.<slug>.css sits in the left-hand row and stays build-import.mjs's — one node, one owner,
// in both directions, which is why this module has its OWN empty state and never writes to
// build-import's. (Clearing the stage fires build-import's clearKeep; if the two shared an empty
// state, "nothing to keep yet" would print above four live build downloads.)
//
// This module also owns the ?b= boot restore. It decodes, and restoreBuild() publishes ONCE — one
// event, one atomic restore. Every consumer on the page both listens for BUILD_CHANGE and seeds
// from readBuild() at its own mount, so where this script tag sits in the block changes nothing.
//
// Nothing is stored. The URL is the only persistence /build has, which is the same promise Act 0
// makes: no upload, no sessionStorage, no localStorage.
//
// Node-import-safe: every DOM reference lives inside a function body, and the mount self-boots
// behind a `typeof document` guard at the very bottom.

import { boardSvg, cardSvg } from "./build-card.mjs";
import { decodeBuild, encodeBuild, SHARE_PARAM, shareUrl } from "./build-share.mjs";
import {
  BUILD_CHANGE, QUADRANT_MEANINGS, QUESTIONS, readBuild, restoreBuild, SUMMARY_TERM,
} from "./build-questions.mjs";
import { PATTERNS, patternFor, slotsFor } from "./pattern-rules.mjs";
import { compose } from "./pattern-render.mjs";

const RESTORED = "Built from a shared link. Nothing was stored anywhere; your browser rebuilt it from the URL.";
const REFUSED = "That shared link could not be read, so this is a fresh builder.";
const FRESH = "Everything here is generated in your browser. Nothing was uploaded and nothing was stored.";

// A rename fires BUILD_CHANGE per keystroke. The card and the spec are cheap to rebuild; the share
// link is not (it stringifies, deflates and base64s the whole build), so the URL is caught up on a
// trailing edge rather than on every character.
const URL_DEBOUNCE_MS = 400;

// --- DOM helper (build-import.mjs:46 shape; duplicated per module by the same decision) --------
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

// An SVG string into the document without innerHTML: parseFromString gives a document whose root
// is an ordinary node to import, so no markup is interpreted in the page's context and no script
// could run even if one had survived build-card.mjs's escaping.
function svgNode(svg) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) return null;
  const node = document.importNode(doc.documentElement, true);
  node.removeAttribute("width");
  node.removeAttribute("height");
  return node;
}

// --- pattern-spec.md ----------------------------------------------------------------------------
// A mini-handoff, mirroring system/specs/*.md's head → prose order rather than cloning
// handoff-viewer's three projections: the visitor has ONE component set and no generated pack to
// project, so the three-column device would be two empty columns. Every value below comes from the
// state. Not one number in it is hand-written.

function specMarkdown(state, named, composition) {
  const { answers, quadrant, frequencyVerdict, board, pack } = state;
  const pattern = named.id && Object.hasOwn(PATTERNS, named.id) ? PATTERNS[named.id] : null;
  const label = pattern ? pattern.label : "No pattern";
  const appetite = QUESTIONS.find((q) => q.id === "appetite");
  const appetiteLabel = appetite.options.find((o) => o.value === answers.appetite);

  const lines = [
    `# ${label}: a pattern spec built on ux factory`,
    "",
    `Built ${new Date().toISOString().slice(0, 10)} in a browser, from ten answers and a breadboard. No model was called.`,
    "",
    "## The product, in the two methods",
    "",
    "| Term | Answer |",
    "| --- | --- |",
    ...QUESTIONS.map((q) => {
      const opt = q.options.find((o) => o.value === answers[q.id]);
      return `| ${SUMMARY_TERM[q.id]} | ${opt ? opt.short : answers[q.id]} |`;
    }),
    "",
    "## The two ethics gates",
    "",
    `Manipulation Matrix: ${quadrant}. ${QUADRANT_MEANINGS[quadrant]}`,
    "",
    `Frequency filter: ${frequencyVerdict.verdict}`,
    "",
    "## Appetite",
    "",
    `${appetiteLabel ? appetiteLabel.label : answers.appetite}. Shape Up defines appetite as the amount of time we want to spend on a project, as opposed to an estimate of how long it will take.`,
    "",
    "## The breadboard",
    "",
  ];

  const places = board && Array.isArray(board.places) ? board.places : [];
  const connections = board && Array.isArray(board.connections) ? board.connections : [];
  if (!places.length) {
    lines.push("This board has no places on it.", "");
  } else {
    for (const place of places) {
      lines.push(`- ${place.label}`);
      for (const aff of place.affordances || []) {
        const to = (connections.find(([from]) => from === aff.id) || [])[1];
        const target = to ? places.find((p) => p.id === to) : null;
        lines.push(`  - ${aff.label}${target ? ` → ${target.label}` : ""}`);
      }
    }
    lines.push("");
  }

  lines.push("## The pattern", "");
  lines.push(named.id ? `${named.id}, named by this rule: ${named.reason}` : named.reason);
  lines.push("");

  lines.push("## Components used", "");
  if (composition && composition.length) {
    const used = new Map();
    for (const node of composition) {
      if (!used.has(node.name)) used.set(node.name, { count: 0, props: new Set() });
      const entry = used.get(node.name);
      entry.count += 1;
      for (const prop of Object.keys(node.props || {})) entry.props.add(prop);
    }
    for (const [name, entry] of used) {
      lines.push(`- \`${name}\` × ${entry.count} with props: ${[...entry.props].join(", ")}`);
    }
  } else {
    lines.push(pattern
      ? `None. ${pattern.needs}, so nothing was rendered rather than something being mocked up.`
      : "None. There is no pattern to build components for yet.");
  }
  lines.push("");

  lines.push("## Tokens", "");
  if (pack && pack.tokens && Object.keys(pack.tokens).length) {
    lines.push("```css", ":root {");
    for (const [key, value] of Object.entries(pack.tokens)) lines.push(`  ${key}: ${value};`);
    lines.push("}", "```");
  } else {
    lines.push("No design imported. This used the site's neutral pack.");
  }
  lines.push("");

  lines.push("## Provenance", "");
  lines.push(
    "Generated by system/build-keep.mjs on the /build page of ux factory, in your browser. No file was",
    "uploaded: the shipped site is static and has nowhere to upload to. No model was called, at view",
    "time or any other time. The pattern was named by the committed rules in system/pattern-rules.mjs",
    "and built through the same vocabulary-validated renderer this site's build-time agent runs use.",
    "",
    "Two claims that are not the same claim: the COMPONENTS above are this site's design system, and",
    "the TOKEN VALUES above are yours. This is your design work on this system's roles. It is not a",
    "design system I authored for you, and it is not your official design system either.",
  );
  return lines.join("\n");
}

// --- the mount ------------------------------------------------------------------------------------

function mount(root) {
  const cardEl = el("div", { class: "bx-keep-card", "data-keep-card": true });
  const artifactsEl = el("div", { "data-keep-artifacts": true });
  const shareEl = el("div", { class: "bx-keep-share", "data-keep-share": true });
  const provenanceEl = el("p", { class: "bx-keep-note", "data-keep-provenance": true, text: FRESH });
  const emptyEl = el("p", { class: "muted", "data-keep-empty": true, text:
    "Nothing to keep from the build yet. Your board has no places on it, so there is no pattern and no card to generate. Add one in Act 3 and everything here appears." });

  root.replaceChildren(emptyEl, cardEl, artifactsEl, shareEl, provenanceEl);

  // The link is only put in the URL once the visitor has asked for one. Before that their address
  // bar stays clean; after it, the link is kept current as they keep editing.
  let linkLive = false;
  let urlTimer = null;
  let latest = null; // { state, named, composition }

  function say(text) {
    provenanceEl.textContent = text;
  }

  function replaceUrl(url) {
    // file:// has no session history entry to replace, and throws.
    try { history.replaceState(null, "", url); } catch { /* nothing to keep current */ }
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el("a", { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke on the next tick, or every download leaks the file for the page's lifetime.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function artifactButton(label, name, make, type) {
    const btn = el("button", { type: "button", class: "btn btn-secondary", text: label });
    btn.addEventListener("click", () => download(name, make(), type));
    return btn;
  }

  // --- the share control ---------------------------------------------------------------------
  const copyBtn = el("button", { type: "button", class: "btn btn-primary", text: "Copy the link that rebuilds this" });
  const linkInput = el("input", { class: "bx-keep-link", readonly: true, "aria-label": "The link that rebuilds this build", hidden: true });
  const shareNote = el("p", { class: "bx-keep-note", text:
    "The whole build travels in the link itself: your answers, your board and your design values. There is no server in this, and nothing is saved anywhere." });
  shareEl.append(copyBtn, linkInput, shareNote);

  async function currentUrl() {
    return shareUrl(location.href, await encodeBuild(latest.state));
  }

  copyBtn.addEventListener("click", async () => {
    if (!latest) return;
    copyBtn.disabled = true;
    try {
      const url = await currentUrl();
      linkLive = true;
      replaceUrl(url);
      linkInput.value = url;
      linkInput.hidden = false;
      try {
        await navigator.clipboard.writeText(url);
        say("Link copied. It is in your address bar too, and it rebuilds this whole build in any browser.");
      } catch {
        // Clipboard access is permissioned and can be refused; the link is still right there.
        linkInput.select();
        say("Your browser did not allow the copy. The link is selected in the field above, so copy it from there.");
      }
    } catch (err) {
      say(`The link could not be built. ${err.message}`);
    } finally {
      copyBtn.disabled = false;
    }
  });

  // --- render ------------------------------------------------------------------------------------

  function update() {
    const state = readBuild();
    const named = patternFor(state);
    const pattern = named.id && Object.hasOwn(PATTERNS, named.id) ? PATTERNS[named.id] : null;
    const slots = pattern && pattern.inLibrary ? slotsFor(named.id, state.board) : null;
    const composition = pattern && pattern.inLibrary ? compose(named.id, slots) : null;
    const tokens = state.pack ? state.pack.tokens : null;
    latest = { state, named, composition };

    const places = state.board && Array.isArray(state.board.places) ? state.board.places : [];
    const bare = places.length === 0;
    emptyEl.hidden = !bare;
    cardEl.hidden = bare;
    artifactsEl.hidden = bare;
    shareEl.hidden = bare;
    if (bare) return;

    // If the card cannot be parsed, say so. It replaced an empty div with no message, which is the
    // worst version of this: the reader sees a blank panel and has nothing to act on. Reachable
    // before PR #145 through a single emoji landing on a text budget's cut; the fix is upstream in
    // build-card.mjs's clip(), and this is what the surface does if anything gets past it.
    const svg = svgNode(cardSvg({ patternId: named.id, slots, board: state.board, tokens }));
    cardEl.replaceChildren(svg || el("p", { class: "bx-keep-note", text:
      "The card could not be drawn from this build, so nothing is shown rather than something broken. The downloads below still work." }));

    artifactsEl.replaceChildren(
      artifactButton("Download build-card.svg", "build-card.svg",
        () => cardSvg({ patternId: named.id, slots, board: state.board, tokens }), "image/svg+xml"),
      artifactButton("Download breadboard.svg", "breadboard.svg",
        () => boardSvg(state.board, { tokens }), "image/svg+xml"),
      artifactButton("Download breadboard.json", "breadboard.json",
        () => JSON.stringify(state.board, null, 2), "application/json"),
      artifactButton("Download pattern-spec.md", "pattern-spec.md",
        () => specMarkdown(state, named, composition), "text/markdown"),
    );

    if (!linkLive) return;
    // Trailing edge only: the breadboard fires this per keystroke on a rename.
    clearTimeout(urlTimer);
    urlTimer = setTimeout(async () => {
      const url = await currentUrl();
      replaceUrl(url);
      linkInput.value = url;
    }, URL_DEBOUNCE_MS);
  }

  // --- the boot restore ------------------------------------------------------------------------

  async function restore() {
    const param = new URLSearchParams(location.search).get(SHARE_PARAM);
    if (!param) return;
    const { state, reason } = await decodeBuild(param);
    if (!state) {
      // Scrub the param, so a reader who reloads after a bad link does not meet the same failure a
      // second time, and the builder they are looking at is genuinely the clean one.
      const url = new URL(location.href);
      url.searchParams.delete(SHARE_PARAM);
      replaceUrl(url.toString());
      say(`${REFUSED} ${reason}`);
      return;
    }
    linkLive = true;
    restoreBuild(state); // ONE publish; every consumer moves together
    say(RESTORED);
    linkInput.value = location.href;
    linkInput.hidden = false;
  }

  document.addEventListener(BUILD_CHANGE, update);
  update();

  // "ready" waits for the restore attempt to settle, so nothing can read this rail while it still
  // shows the pre-restore build.
  restore().finally(() => { root.dataset.buildKeep = "ready"; });
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-build-keep]");
  if (root) mount(root);
}
