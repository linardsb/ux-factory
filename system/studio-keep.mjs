// system/studio-keep.mjs — hand-written canon (this repo; not generated). The STUDIO'S KEEP RAIL
// (epic #202 — docs/epics/prototype-studio.architecture.md §Data model → "Export"; ticket #210;
// .claude/plans/studio-single-file-export-keep-rail-210.md).
//
// system/build-keep.mjs's sibling, on the other page. /build's rail is what a visitor leaves the
// BUILDER holding; this is what they leave the STUDIO holding — and the difference is the one thing
// /build structurally cannot express, because it has no canvas: an ARRANGEMENT. Three tiers.
//
//   Tier 1  the runnable single-file export — system/studio-export.mjs, assembled in the browser
//   Tier 2  the per-build handoff pack — four downloads, every generator IMPORTED from /build's rail
//   Tier 3  the share link, now carrying #208's `g` field, which only this page can produce
//
// IMPORT, NEVER FORK — and this file is where that rule is under the most pressure, because every
// artifact below already exists on the other page. specMarkdown, cardSvg, boardSvg, encodeBuild and
// shareUrl are all called, none is re-written, and system/build-keep.mjs is edited by this ticket in
// exactly two places: the two-claims sentences and the neutral-pack sentence became exported
// constants, and the note on specMarkdown was amended to name this file as its second consumer. Its
// MOUNT is untouched — /build's rail gets no export tier and no new route from this ticket.
//
// Four things a later editor needs, because each one is a decision rather than an implementation:
//
//  1. THE ARRANGEMENT IS READ POSITIONALLY, and it has to be. `canvas.place()` assigns its own
//     `data-stx-id` (studio-canvas.mjs:307) and never carries a board place id, so there is no id to
//     join on. What there IS, and what the whole studio already depends on, is that the wrappers in
//     DOM order correspond to `board.places` in board order — studio-compile.mjs:382-383's positional
//     swap rests on the same fact, and replay-driver.mjs renames in place rather than re-placing
//     precisely so that stage order stays board order. Each entry still CARRIES its place id, so
//     build-share.mjs's arrangementSlots (:145) refuses a mismatch instead of encoding a lie. A
//     count that disagrees sends NO arrangement at all rather than a guessed one.
//
//  2. THE EXPORT RE-RENDERS; IT DOES NOT SCRAPE THE CANVAS. Reading the stage would export the wrong
//     thing three ways: at rest the stage holds fat-marker BLOCKS rather than components, the
//     wrappers carry canvas chrome (grab handles, aria wiring, data-stx-id) that means nothing
//     outside the studio, and the fidelity would depend on whether the reader happened to press
//     Compile. compile.composed() hands back compileSteps' screens — each carrying
//     renderComposition's own composition — and the vocabulary that validates them, and rendering
//     THOSE into detached containers is literally what AC #3 asks for. Since #212 the export reads
//     NO arrangement at all: the flow's layout is screens in board order × components in affordance
//     order (the epic architecture's "no new bytes"), canvas coordinates persist in the share
//     link's `g` field (#208) and nowhere else, and the file's provenance claims no geometry it
//     does not carry. The link's own no-`g` divergence is still announced when it happens (PR #241
//     review, M2) — that caveat is the SHARE tier's and stays below.
//
//  3. THE STUDIO HAS NO ANSWERS OF ITS OWN, and the downloaded spec must say so. specMarkdown
//     destructures { answers, quadrant, frequencyVerdict, board, pack } unguarded and would THROW on
//     this page's store, where all three of the first are null (build-questions.mjs:65-73). The
//     state is assembled here out of build-questions.mjs's OWN exported quadrantFor and
//     frequencyVerdictFor — the same two calls publishState makes (:99-100) — over the same
//     DEFAULT_ANSWERS fallback studio.mjs:387 uses, so nothing is invented. And because those
//     answers are the RECOMMENDED ones rather than the visitor's, the rail says so beside the
//     button: renderSummary already tells the reader that on the page (studio.mjs:283-287), and a
//     downloaded file that quietly dropped the sentence would be the one dishonest artifact here.
//     It is NOT added to specMarkdown, or /build's download would carry a sentence that is false
//     there.
//
//  4. NOTHING IS FETCHED AT REST. #206's lazy-panel property is what the pixel gate depends on: at
//     rest this page issues no request of its own. The vocabulary and the three stylesheets are
//     fetched on the EXPORT CLICK and never at mount, which is also why composed() is not called
//     from update().
//
// Refusals go to the rail's own note and to canvas.say — never a throw, never console.error
// (bus-toggles.mjs / studio-verbs.mjs / studio-compile.mjs:336-350; tooling/studio-journey.mjs's
// no-page-errors contract is a real assertion).
//
// Node-import safe: every DOM reference lives inside a function body and there is no self-boot at
// all — system/studio.mjs mounts this, for the reason its own header gives about seams.

import { trackFactoryExported, trackFactoryLinkCopied, onVirtualRoute } from "./analytics.mjs";
import { boardSvg, cardSvg } from "./build-card.mjs";
import { encodeBuild, shareUrl } from "./build-share.mjs";
import {
  DEFAULT_ANSWERS, frequencyVerdictFor, quadrantFor, readBuild,
} from "./build-questions.mjs";
import { specMarkdown } from "./build-keep.mjs";
import { importedOnPage, readImported } from "./pack-imported.mjs";
import { derivedOnRoot, readRecord as readDerived } from "./pack-derived.mjs";
import { PATTERNS, patternFor, slotsFor } from "./pattern-rules.mjs";
import { compose } from "./pattern-render.mjs";
import { renderComposition } from "./agentic-renderer.mjs";
import { createBus } from "./action-bus.mjs";
import { VOCAB_UNAVAILABLE } from "./studio-compile.mjs";
import { exportHtml } from "./studio-export.mjs";

// The three sheets the export inlines, in cascade order. The PACK is not in this list: it is read
// from the page's own live <link> at click time, so a reader who switched packs in the appearance
// dock exports what they are looking at rather than what the page booted with.
const CONTRACT_CSS = "/system/tokens.contract.css";
const COMPONENTS_CSS = "/system/components.css";
const PACK_LINK_RE = /\/tokens\.[a-z0-9-]+\.css$/;

const EXPORT_NAME = "prototype.html";

// The rail's at-rest sentences. FIXED strings — this rail is visible at rest once the replay
// settles, so it is in the pixel baseline and nothing in it may carry a time, a counter or a run id
// (studio-compile.mjs:68-70's rule, inherited). specMarkdown interpolates a date; that is a
// DOWNLOAD and is never rendered on the page. Keep it that way.
const AT_REST = "Everything here is generated in your browser when you ask for it. Nothing is uploaded and nothing is stored.";

// SPIKE 3's FAITHFUL BRANCH. The verdict is recorded in
// .claude/reports/studio-export-keep-rail-210-spike3.md: a hand-assembled export from these exact
// four sources opened cold from file:// on chromium, firefox and webkit, under all four shipped
// packs plus a derived one, rendering the composed components with the visitor's own token values
// and making ZERO network requests. This copy is the branch that was actually taken — extended by
// #212 to name the flow, because the file now carries every screen and the navigation between them.
const EXPORT_COPY = "A single file that runs: every screen of this flow, and every navigation "
  + "between them, working. Open it anywhere — no server, no build step, nothing to install. It "
  + "carries this system's tokens and components inline, wearing your design values.";

// The sentence the downloaded spec owes the reader, and decision 3's second half.
const ANSWERS_NOTE = "The spec carries the ten method answers this page runs on, which are the "
  + "recommended ones and not yours — the board above is the recorded run's work, and the pattern is "
  + "named from those answers. Answer them yourself on the builder and the spec is yours too.";

const SHARE_NOTE = "The whole build travels in the link itself: the board, the design values, and — "
  + "because this page has a canvas and the builder does not — where each block sits on it. There is "
  + "no server in this, and nothing is saved anywhere.";

// The caveat a link that carries no `g` owes the reader, and it rides BOTH copy outcomes — the
// clipboard one and the select-the-field one. Not because the second is likely, but because the
// reader walks away holding the same link either way, and a caveat that only appears on the happy
// path is a caveat that is missing exactly when something already went differently than expected.
const NO_ARRANGEMENT = " Where the blocks sit did not travel: the canvas is holding a different "
  + "number of pieces than the board has places, and a guessed arrangement is worse than none.";

const EMPTY = "Nothing to keep yet. This board has no places on it, so there is no product to export, "
  + "no spec to write and no arrangement to share. A board with something on it brings all three back.";

const NOT_COMPOSED = "This board does not compile to any components, so there is no runnable product "
  + "to export. The blocks are the artifact here, and the breadboard downloads below carry them.";

// --- DOM helper (build-keep.mjs:41 / studio.mjs:121's shape, COPIED per the standing rule: a shared
// one would be a dependency between modules that are deliberately independent surfaces) -----------
const el = (tag, attrs, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") n.textContent = v;
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
};

// Parse a `style` attribute into the { "--name": "value" } map vetTokens expects. An imported or a
// DERIVED pack lives on [data-build-stage] as inline custom properties and NOT in any stylesheet
// (build-import.mjs:153 writes the stage, never :root), so this is the only place the visitor's own
// values can be read from — and it is deliberately dumb: it splits, it does not judge. Every value
// it produces goes through pack-imported.mjs's vetTokens inside exportHtml, which is the ONE
// application point, and adding an opinion here would be a second one.
function inlineTokensOf(node) {
  const raw = node && typeof node.getAttribute === "function" ? node.getAttribute("style") : null;
  const map = {};
  if (!raw) return map;
  for (const decl of String(raw).split(";")) {
    const at = decl.indexOf(":");
    if (at < 1) continue;
    const key = decl.slice(0, at).trim();
    const value = decl.slice(at + 1).trim();
    if (key.startsWith("--") && value) map[key] = value;
  }
  return map;
}

// The design the page is WEARING when it did not come from this page — #130's "wear it across the
// visit", which is a shipped, promoted feature on HOME and travels here with the reader. It reaches
// the DOM by neither of the two paths inlineTokensOf and the <link> scan cover: an IMPORTED record
// is a <style> element appended to <head> (pack-imported.mjs:186 / pack-boot.js:56-62) and a DERIVED
// one is inline custom properties on :root (pack-derived.mjs:136 / pack-boot.js:84-87). Without this
// the export wears neutral and its provenance block STATES that nothing was imported, on a page the
// reader is looking at in their own colours which says so in Act 0 — a false claim rendered into the
// one artifact whose whole purpose is naming whose design work this is (build-import.mjs:167-171's
// standard, verbatim, for this exact reader). PR #241 review, High 1.
//
// Read through the modules that OWN the records, and through THEIR OWN ground-truth checks rather
// than the raw records: unwearImported keeps the record and removes the style (pack-imported.mjs:239)
// and pack-derived's unwear does the same with the selector, so "stored" and "worn" are different
// questions and only the second one may reach an artifact that makes a claim about the reader. One
// record reader each, never a second parse here — importedOnPage/derivedOnRoot are the same two calls
// the dock's groundTruth() makes, so the export and the dock can never disagree about what is on.
//
// Imported first, matching pack-boot.js:56-62's own order: an import SHADOWS a derived pick there
// rather than blending with it, and a second opinion about that precedence would be the bug.
function wornPack() {
  const imported = readImported();
  if (imported && importedOnPage(imported)) return imported;
  const derived = readDerived();
  if (derived && derivedOnRoot(derived)) return derived;
  return null;
}

// Whose design values these are, named the way the store names them rather than guessed. The three
// producers write three different shapes and they matter here: build-import.mjs's drop path fills
// `fileName` (:391), its derive path sets slug "derived" with fileName null (:473), and a shared
// link fills a slug and leaves fileName null ON PURPOSE, because no file was imported in the
// receiving browser and naming one would be a claim about a thing it never saw
// (build-share.mjs:479-481). Reading only `slug` would print an imported design as a derived
// palette, which is the wrong sentence in the one artifact whose point is naming whose work this is.
function packLabelOf(pack, worn, inlineTokens) {
  if (pack && pack.fileName) return `your imported design, "${pack.fileName}"`;
  if (pack && pack.slug === "derived") return "your own derived palette";
  // "shared" is the codec's DEFAULT for a payload that carried no `s` (build-share.mjs:475), not a
  // name anybody chose — quoting it back at the reader as one would be inventing an attribution.
  if (pack && pack.slug && pack.slug !== "shared") return `the design "${pack.slug}", as it travelled in this link`;
  if (pack) return "the design values that travelled in this link";
  // Worn in from home, and named the way ITS record names itself — the same rule the branches above
  // follow. The two producers differ in exactly the way that matters here: an import knows the FILE
  // it was read from, a derived palette knows only that the reader picked a colour. Where the
  // record came from is part of the claim, so it is said rather than flattened into "yours".
  if (worn && worn.source === "imported") {
    return worn.fileName
      ? `your imported design, "${worn.fileName}", worn in from the home page`
      : "the design you imported on the home page";
  }
  if (worn) return "your own derived palette, worn in from the home page";
  return Object.keys(inlineTokens).length ? "your own design values" : null;
}

export function mountStudioKeep(root, { getBoard, getArrangement, compile, canvas } = {}) {
  try {
    if (!root) return null;

    const emptyEl = el("p", { class: "muted", "data-keep-empty": true, text: EMPTY });
    const exportEl = el("div", { class: "stu-keep-tier", "data-keep-export": true });
    const artifactsEl = el("div", { class: "stu-keep-tier", "data-keep-artifacts": true });
    const shareEl = el("div", { class: "stu-keep-tier", "data-keep-share": true });
    const noteEl = el("p", { class: "stu-keep-note", "data-keep-note": true, text: AT_REST });
    root.replaceChildren(emptyEl, exportEl, artifactsEl, shareEl, noteEl);

    let linkLive = false;

    // Both halves of every refusal, and neither is a throw: the visible note the reader is looking
    // at, and the canvas's ONE live region, so a screen-reader user hears it too. canvas.say is the
    // studio's single announcer (studio-canvas.mjs:130-133) — this file never makes a second.
    const say = (text) => {
      noteEl.textContent = text;
      if (canvas && typeof canvas.say === "function") canvas.say(text);
    };

    const replaceUrl = (url) => {
      // file:// has no session history entry to replace, and throws (build-keep.mjs:213).
      try { history.replaceState(null, "", url); } catch { /* nothing to keep current */ }
    };

    // build-keep.mjs:216-224, copied — the local-helper rule, and the shape is the same because the
    // mechanism is: a Blob, an anchor, a click, and a revoke on the next tick or every download
    // leaks the file for the page's lifetime.
    const download = (name, text, type) => {
      const url = URL.createObjectURL(new Blob([text], { type }));
      const a = el("a", { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };

    const artifactButton = (label, name, make, type) => {
      const btn = el("button", { type: "button", class: "btn btn-secondary", text: label });
      btn.addEventListener("click", () => download(name, make(), type));
      return btn;
    };

    // build-keep.mjs:239-256, COPIED VERBATIM WITH ITS REASONING, and it is MORE load-bearing here
    // rather than less. analytics.mjs's virtual-route flip owns location for RESTORE_DELAY_MS at a
    // time, and shareUrl only overwrites ?b= — so a link built inside that window keeps the virtual
    // pathname and hands the visitor a /factory/exported?b=… that 404s (there is no _redirects;
    // Pages serves the repo as-is). On /build there were two routes and one of them fired from a
    // render, far from the copy click. On THIS page there are three and TWO OF THEM ARE THIS RAIL'S
    // OWN ADJACENT BUTTONS — an export click and a copy click 30 ms apart is an ordinary thing for a
    // reader to do. Waiting the window out in ONE place beats every caller knowing about it, and it
    // is why the link still reads location rather than a base snapshotted at mount: the appearance
    // dock owns the hash, location is the only place it lives, and a frozen base strips it on the
    // next write and closes the dock mid-edit. Bounded rather than a bare `while`: 120 ms is well
    // past the 50 ms window, and if location is still virtual after that, something upstream is
    // broken and a wrong link beats a hung rail. (PR #162 review, High 1.)
    async function settledUrl() {
      for (let i = 0; i < 12 && onVirtualRoute(); i += 1) {
        await new Promise((r) => setTimeout(r, 10));
      }
      return location.href;
    }

    // The spec's state, assembled rather than read — decision 3. quadrantFor and frequencyVerdictFor
    // are build-questions.mjs's own exports and are exactly what publishState calls, so this is the
    // store's arithmetic, not a second copy of it.
    const specState = () => {
      const stored = readBuild();
      const answers = stored.answers ?? DEFAULT_ANSWERS;
      return {
        answers,
        quadrant: quadrantFor(answers),
        frequencyVerdict: frequencyVerdictFor(answers),
        board: getBoard(),
        pack: stored.pack ?? null,
      };
    };

    // The arrangement, positionally — decision 1. Returns null rather than a partial or a guessed
    // one; build-share.mjs's arrangementSlots then simply emits no `g`, which is the honest outcome.
    const arrangement = () => {
      const slots = typeof getArrangement === "function" ? getArrangement() : null;
      const places = (getBoard() || {}).places;
      if (!Array.isArray(slots) || !Array.isArray(places)) return null;
      if (!slots.length || slots.length !== places.length) return null;
      return slots.map((slot, i) => ({ id: places[i].id, col: slot.col, row: slot.row }));
    };

    // --- tier 1 · the runnable export -----------------------------------------------------------
    const exportBtn = el("button", { type: "button", class: "btn btn-primary", text: "Download the runnable file" });
    exportEl.append(
      el("h3", { class: "stu-keep-title", text: "The prototype, as one file" }),
      el("p", { class: "stu-keep-lead", text: EXPORT_COPY }),
      exportBtn,
    );

    // Every failure below lands in say() and every one of them names what happened. The whole body
    // is inside one try, and the catch is the LAST resort rather than the first: a refusal the
    // renderer makes is a sentence the reader deserves, and an unhandled rejection is a console
    // error a reader never sees and a gate reads as a broken page.
    exportBtn.addEventListener("click", async () => {
      exportBtn.disabled = true;
      let handed = false;
      try {
        const composedNow = await compile.composed();
        if (!composedNow) { say(NOT_COMPOSED); return; }
        if (!composedNow.vocab) { say(VOCAB_UNAVAILABLE); return; }
        const result = composedNow.result;

        // renderComposition VALIDATES BEFORE ANY DOM and throws its refusal — the same contract
        // studio-compile.mjs's compile() catches — once PER SCREEN, the path naming which screen
        // failed. Into DETACHED nodes: nothing this builds is ever attached to the page, which is
        // what keeps this an assembly rather than a second author on a canvas the verbs and the
        // driver own.
        //
        // SERIALIZED, never scraped, and never through a markup sink — see the header's call 1.
        // Screens travel WHOLE, in board order, components in affordance order; no coordinate is
        // read and none travels (the header's call 2). The nav's targetId becomes the 1-based index
        // of the destination screen — a join over the same array, so every emitted href resolves.
        const serializer = new XMLSerializer();
        const flowScreens = Array.isArray(result.screens) ? result.screens : [];
        const screens = flowScreens.map((screen, i) => {
          let slots = [];
          if (Array.isArray(screen.composition) && screen.composition.length) {
            const frag = renderComposition(composedNow.vocab, screen.composition, createBus(),
              `screen "${screen.label}"`);
            // Read BEFORE anything consumes the fragment (applySwap's note, same trap) — here via
            // one spread, for the same reason.
            slots = [...frag.children].map((node) => ({ html: serializer.serializeToString(node) }));
          }
          return {
            name: screen.label,
            type: screen.type,
            // Feed's truncation sentence travels with its screen (PR #248 review H1): the exported
            // file states the drop in streamNote's own words, exactly as the canvas does.
            note: screen.note,
            slots,
            nav: screen.nav
              .map((entry) => ({ label: entry.label, target: flowScreens.findIndex((s) => s.id === entry.targetId) + 1 }))
              .filter((entry) => entry.target >= 1),
          };
        });

        const packHref = [...document.querySelectorAll("link[rel=stylesheet]")]
          .map((l) => l.getAttribute("href"))
          .find((h) => h && PACK_LINK_RE.test(h) && !h.includes("contract"));
        const sheets = await Promise.all([CONTRACT_CSS, packHref, COMPONENTS_CSS]
          .filter(Boolean)
          .map((u) => fetch(u).then((r) => {
            if (!r.ok) throw new Error(`${u} → HTTP ${r.status}`);
            return r.text();
          })));

        const stage = document.querySelector("[data-build-stage]");
        // MERGED, WITH THE STAGE ON TOP, which is the order the cascade already gives these two: a
        // design dropped into Act 0 on THIS page writes the stage's inline props, and those outrank
        // both of the worn paths for everything inside the stage. Merged rather than either-or for
        // the same reason — a role Act 0's export did not fill must still come from the design the
        // reader is wearing, not fall back to neutral. vetTokens inside exportHtml stays the ONE
        // application point over the result; nothing here judges a value.
        const worn = wornPack();
        const inlineTokens = { ...(worn ? worn.tokens : {}), ...inlineTokensOf(stage) };
        const stored = readBuild();

        download(EXPORT_NAME, exportHtml({
          title: result.patternLabel || "A prototype from ux factory",
          css: sheets.join("\n"),
          inlineTokens,
          screens,
          meta: {
            patternLabel: result.patternLabel,
            // COUNTED, all four, by the beat that just ran — not re-derived here and not typed.
            screens: flowScreens.length,
            places: result.counted.places,
            affordances: result.counted.affordances,
            connections: result.counted.connections,
            packLabel: packLabelOf(stored.pack, worn, inlineTokens),
            hasVisitorTokens: Object.keys(inlineTokens).length > 0,
          },
        }), "text/html");
        handed = true;
        say(`Downloaded ${EXPORT_NAME}. Open it from anywhere — it needs no server and makes no requests.`);
      } catch (err) {
        say(`The file could not be assembled. ${err.message}`);
      } finally {
        exportBtn.disabled = false;
      }
      // OUTSIDE the try and only on the handed path — the tracker's caller contract, and #75's rule
      // that an event must fire from the thing that happened rather than from the handler that ran.
      // An export that refused, or whose vocabulary was missing, is not a keep.
      if (handed) trackFactoryExported();
    });

    // --- tier 2 · the per-build handoff pack ----------------------------------------------------
    const artifactRow = el("div", { class: "stu-keep-row" });
    artifactsEl.append(
      el("h3", { class: "stu-keep-title", text: "The handoff pack for this build" }),
      el("p", { class: "stu-keep-lead", text:
        "The same four artifacts the builder generates, from this board. Written by the same code, "
        + "so what you get here and what you get there cannot disagree." }),
      artifactRow,
      el("p", { class: "stu-keep-note", text: ANSWERS_NOTE }),
    );

    // --- tier 3 · the share link ----------------------------------------------------------------
    const copyBtn = el("button", { type: "button", class: "btn btn-primary", text: "Copy the link that rebuilds this" });
    const linkInput = el("input", { class: "stu-keep-link", readonly: true, "aria-label": "The link that rebuilds this build, arrangement included", hidden: true });
    shareEl.append(
      el("h3", { class: "stu-keep-title", text: "The link that rebuilds it" }),
      copyBtn, linkInput,
      el("p", { class: "stu-keep-note", text: SHARE_NOTE }),
    );

    // Returns the arrangement ALONGSIDE the url, because the caller has a sentence to say about it
    // and arrangement() legitimately answers null: build-share.mjs's arrangementSlots then emits no
    // `g` and the link rebuilds the board with the default row-1 layout. The divergence #241's M2
    // named was reached through the compile beat's surplus/extra branches; #212 deleted those —
    // screens are 1:1 with wrappers by construction, and a count mismatch now refuses the swap
    // loudly — so no known path produces it today. The guard STAYS, on the tripwire's own terms:
    // it only speaks when the state actually occurs, and computing the arrangement once here is
    // what keeps the announcement and the payload the same fact rather than two reads that can
    // disagree. (PR #241 review, Medium 2; #212's structural close.)
    async function currentUrl() {
      const arrangement_ = arrangement();
      const url = shareUrl(await settledUrl(), await encodeBuild({ ...specState(), arrangement: arrangement_ }));
      return { url, arrangement: arrangement_ };
    }

    // ONE writer for the address bar, the field and the field's LABEL, because the label is a claim
    // about the link and the two must never be written apart. update() re-runs this on every board
    // change once the link is live — and the arrangement can stop travelling between the copy and
    // that re-run (a take-over, then a compile into the surplus state), which is exactly M2's false
    // claim reached by a second path. Setting the label only at the click would leave "arrangement
    // included" on a field whose value no longer carries one.
    const publishLink = (url, sent) => {
      replaceUrl(url);
      linkInput.value = url;
      linkInput.setAttribute("aria-label", sent
        ? "The link that rebuilds this build, arrangement included"
        : "The link that rebuilds this build, without the arrangement");
    };

    copyBtn.addEventListener("click", async () => {
      copyBtn.disabled = true;
      let built = false; // did the link get as far as the address bar and the field?
      try {
        const { url, arrangement: sent } = await currentUrl();
        linkLive = true;
        publishLink(url, sent);
        linkInput.hidden = false;
        built = true;
        try {
          await navigator.clipboard.writeText(url);
          // NAMED, not softened: a reader who is told the arrangement travelled and finds it did
          // not has been handed the one thing this rail exists to add. The refusal's reason is the
          // reader's own state — more blocks on the canvas than the board has places — so it is said
          // in those terms rather than as an error.
          say(sent
            ? "Link copied. It is in your address bar too, and it rebuilds this board — arrangement included — in any browser."
            : "Link copied. It is in your address bar too, and it rebuilds this board in any browser." + NO_ARRANGEMENT);
        } catch {
          // Clipboard access is permissioned and can be refused; the link is still right there.
          linkInput.select();
          say("Your browser did not allow the copy. The link is selected in the field above, so copy it "
            + "from there." + (sent ? "" : NO_ARRANGEMENT));
        }
      } catch (err) {
        say(`The link could not be built. ${err.message}`);
      } finally {
        copyBtn.disabled = false;
      }
      if (!built) return;
      // Both outcomes leave the visitor holding the link — the clipboard one and the
      // select-the-field one — which is what this event counts. Outside the try on purpose: a
      // browser refusing pushState must not be reported as "the link could not be built", because
      // it was built. And AFTER the URL is written, per the tracker's caller contract.
      trackFactoryLinkCopied();
    });

    // --- render ---------------------------------------------------------------------------------
    // Reads. Never writes the build store (studio.mjs:34-37's rule, which this file inherits by
    // being mounted from there), never fetches, and never runs the beat.
    function update() {
      const board = getBoard() || { places: [], connections: [] };
      const places = Array.isArray(board.places) ? board.places : [];
      const bare = places.length === 0;
      emptyEl.hidden = !bare;
      exportEl.hidden = bare;
      artifactsEl.hidden = bare;
      shareEl.hidden = bare;
      if (bare) return;

      const state = specState();
      const named = patternFor(state);
      const pattern = named.id && Object.hasOwn(PATTERNS, named.id) ? PATTERNS[named.id] : null;
      const slots = pattern && pattern.inLibrary ? slotsFor(named.id, board) : null;
      const composition = pattern && pattern.inLibrary ? compose(named.id, slots) : null;
      const tokens = state.pack ? state.pack.tokens : null;

      artifactRow.replaceChildren(
        artifactButton("Download build-card.svg", "build-card.svg",
          () => cardSvg({ patternId: named.id, slots, board, tokens }), "image/svg+xml"),
        artifactButton("Download breadboard.svg", "breadboard.svg",
          () => boardSvg(board, { tokens }), "image/svg+xml"),
        artifactButton("Download breadboard.json", "breadboard.json",
          () => JSON.stringify(board, null, 2), "application/json"),
        artifactButton("Download pattern-spec.md", "pattern-spec.md",
          () => specMarkdown(state, named, composition), "text/markdown"),
      );

      // Kept current only once the visitor has asked for a link. Before that their address bar stays
      // clean. No debounce: unlike /build's rail nothing on this page fires per keystroke — the
      // board changes at settle, at take-over and on a restore, which is three times a load.
      if (!linkLive) return;
      currentUrl().then(({ url, arrangement: sent }) => publishLink(url, sent))
        .catch(() => { /* the note already carries the last thing that happened */ });
    }

    update();
    return { update, root };
  } finally {
    // Every path, including the early return — a gate fails on the missing thing instead of
    // deadlocking to timeout (studio-canvas.mjs:372-374 / device-frame.mjs:195-199).
    root?.setAttribute("data-studio-keep", "ready");
  }
}
