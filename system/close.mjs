// system/close.mjs — hand-written canon (this repo; not generated). Beat 4 of the v3 home spine:
// the investment close (epic #70 ticket #77; PRD §6.1 beat 4 / §8 "the investment step is the
// takeaway", §7 "Forwarded internally"; architecture boundary "nothing fails on stage").
//
// The reader has just watched a product screen assemble under their own brand colour. This beat is
// where they put something in and take something out: a handoff pack they can keep, their own
// derived tokens, and a link that hands the whole moment to a colleague. The link carries INPUTS
// (a hex plus three answers, system/share-state.mjs), so the receiving browser runs the real
// derive() engine itself instead of trusting a colour set from a URL.
//
// Honesty (hard, CLAUDE.md contract): the handoff pack is VERDANT's committed pack, the pack an
// engineer receives, never "your pack" and never described as generated for this visitor. The
// visitor's own tokens are a separate offer, labelled derived-here with the same wording the dock
// uses. A company name reaches the DOM only as textContent, and only inside a sentence that denies
// the affiliation.
//
// Documented degradation (ticket scope clause): everything here is additive. With JavaScript off,
// or if this module throws and the spine's fail-closed catch swallows it (spine.mjs:100-104), the
// close card in index.html stands on its own as a complete close: one statement, the contact
// action, the handoff pack to view and to download. Nothing static depends on this file.
//
// Node-import-safe: DOM and location are touched only inside the beat effect (which the spine runs
// only in a browser); registerBeat no-ops with no DOM (spine.mjs:50), so the import stays clean.

import { registerBeat } from "./spine.mjs";
import { encodeShareState, hasSharedBrand } from "./share-state.mjs";
import { readRecord } from "./pack-derived.mjs";
import { getHomeAnswers } from "./intake-beat.mjs";
import { trackFactoryShared } from "./analytics.mjs";

const RESET_MS = 1600; // how long a copy button holds its confirmation (dock.mjs:280 uses the same)

// The URL the reader actually opened, captured at module evaluation rather than read when the beat
// activates. Three things rewrite location afterwards, and this beat is the last thing on the page
// to run, so it would see all of them: the /factory/arrived and /factory/shared virtual routes flip
// the path for ~50ms each, and the dock's stripHash drops the query string outright when the
// appearance panel opens (dock.mjs — pushState to location.pathname). Reading late would build a
// share link to /factory/arrived, or hide the arrival note from anyone who visited the dock first.
// Guarded so a Node import stays clean; the beat effect never runs without a DOM anyway.
const HAS_LOCATION = typeof location !== "undefined";
const PAGE_URL = HAS_LOCATION ? location.origin + location.pathname : "";
const ARRIVED_SHARED = HAS_LOCATION && hasSharedBrand(location.search);

// Element builder — never innerHTML from data, so visitor-supplied strings stay inert text
// (mirrors peak.mjs:89-99). `text` sets textContent; onclick wires a handler.
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") n.textContent = v;
    else if (k === "onclick") n.addEventListener("click", v);
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
}

// Duplicated VERBATIM from dock.mjs:99-102, which is module-private there, and mirroring the same
// affiliation denial as pack-derived.mjs:189-191. Three sites now carry this sentence by hand; that
// is deliberate (the same mirrored-predicate trade pack-derived.mjs:53-59 makes with pack-boot.js)
// and it is why none of them may be reworded alone. It is an honesty contract, not copy.
const derivedNote = (label) =>
  label && label !== "your brand"
    ? "derived here, not " + label + "'s official design system"
    : "derived here, not an official design system";

// The share URL: this page, plus whatever bounded state the visitor actually produced. The brand
// comes from the derived record (#74) and the axes from the live wizard (#73, null until it has run
// once), so a reader who touched neither still gets a valid link back to the bare page.
function buildShareUrl() {
  const rec = readRecord();
  const query = encodeShareState({ brandColor: rec?.brandColor, name: rec?.label, axes: getHomeAnswers() });
  return query ? PAGE_URL + "?" + query : PAGE_URL;
}

// The derived `:root` block, byte-identical in shape to the dock's copy-tokens output
// (dock.mjs:286-289) so the two hand over the same artifact from two places.
function tokenBlock(rec) {
  const body = Object.entries(rec.tokens).map(([k, v]) => "  " + k + ": " + v + ";").join("\n");
  return "/* your brand — derived in this browser from the colour you entered.\n" +
    "   Colour tokens only; every other token comes from the neutral pack. */\n" +
    ":root {\n" + body + "\n}\n";
}

// A copy button that says what happened. Holds its confirmation for RESET_MS, then returns to its
// resting label so the control never looks spent (dock.mjs:276-282 idiom).
function copyButton(label, variant, onCopy) {
  let timer = null;
  const btn = el("button", { type: "button", class: "btn " + variant }, label);
  btn.addEventListener("click", () => {
    if (timer) { clearTimeout(timer); timer = null; }
    const done = (state) => {
      btn.textContent = state;
      timer = setTimeout(() => { btn.textContent = label; timer = null; }, RESET_MS);
    };
    onCopy(done);
  });
  return btn;
}

function closeEffect({ el: beatEl }) {
  const mount = beatEl?.querySelector("[data-close-extras]");
  if (!mount) return; // unexpected markup — leave the static close exactly as it is

  // --- the arrival notice, first, because it explains what the reader is already looking at.
  // Reads the URL captured at module evaluation, so it is true even for a reader who opened the
  // appearance dock on the way down and no longer has the share params in the address bar.
  if (ARRIVED_SHARED) {
    mount.appendChild(el("p", {
      class: "close-shared-note",
      text: "You opened a shared link. The colour and the answers came from the link, and this browser derived the palette again from them.",
    }));
  }

  // --- the share control ------------------------------------------------------------------
  const status = el("p", { class: "close-share-status", role: "status", "aria-live": "polite" });
  const say = (text) => { status.textContent = text; status.dataset.filled = "true"; };
  const shareRow = el("div", { class: "close-share-row" });

  // No clipboard means an insecure origin (Clipboard.writeText is secure-context only); a rejection
  // means the browser refused the write. Either way this control's entire job is handing over a
  // link, so it shows one the reader can select and copy by hand rather than dead-ending.
  let field = null;
  // Fires on both success paths, never on the click itself: the event has to mean "the reader has a
  // link", not "the reader pressed a button that may have failed" (peak.mjs:343-348 makes the same
  // call for /factory/built). trackFactoryShared guards itself, so calling it from two paths is safe.
  const handOver = (url) => {
    trackFactoryShared();
    if (!field) {
      field = el("input", {
        type: "text", class: "close-share-url", readonly: true, "aria-label": "Share link",
      });
      shareRow.appendChild(field);
    }
    field.value = url;
    field.focus();
    field.select();
    say("This browser would not write to the clipboard. Copy the link below.");
  };

  // Secondary pill: sharing is the beat's one act, so it keeps the card's button grammar. The
  // token copy below is a ghost, one step quieter, so the tier still reads as one action.
  const shareBtn = copyButton("Copy the link", "btn-secondary", (done) => {
    const url = buildShareUrl(); // BEFORE any tracking: the event rewrites location for ~50ms
    if (!navigator.clipboard) { handOver(url); return; }
    navigator.clipboard.writeText(url).then(
      () => {
        done("Copied ✓");
        say("Copied. The link carries a colour and three answers, nothing else.");
        trackFactoryShared();
      },
      () => handOver(url)
    );
  });

  shareRow.append(shareBtn, status);
  mount.appendChild(el("div", { class: "close-share" },
    el("p", {
      class: "close-share-line",
      // True whether or not a colour was entered: the empty state below names what is missing.
      text: "Send this to a colleague. The link carries what you picked here, and their browser derives the whole palette again from it.",
    }),
    shareRow));

  // --- the visitor's own tokens ---------------------------------------------------------------
  // Read fresh, so a colour picked after the beat activated still counts on the next click.
  const rec = readRecord();
  if (!rec) {
    mount.appendChild(el("p", {
      class: "close-note",
      text: "The link carries your three answers so far. Pick a colour in beat 02 above to add it, and to copy the tokens the engine derives from it.",
    }));
    return;
  }

  const tokensStatus = el("p", { class: "close-share-status", role: "status", "aria-live": "polite" });
  const tokensBtn = copyButton("Copy your derived tokens", "btn-ghost", (done) => {
    const live = readRecord();
    if (!live) { done("Nothing to copy"); return; }
    const sayTokens = (text) => { tokensStatus.textContent = text; tokensStatus.dataset.filled = "true"; };
    if (!navigator.clipboard) {
      sayTokens("This browser would not write to the clipboard. The appearance panel offers the same tokens.");
      return;
    }
    navigator.clipboard.writeText(tokenBlock(live)).then(
      () => { done("Copied ✓"); sayTokens("Copied. Colour tokens only; every other token comes from the neutral pack."); },
      () => { done("Copy failed"); sayTokens("The browser refused the copy. The appearance panel offers the same tokens."); }
    );
  });

  mount.appendChild(el("div", { class: "close-tokens" },
    el("div", { class: "close-share-row" }, tokensBtn, tokensStatus),
    el("p", {
      class: "close-note",
      // rec.label is visitor text: textContent only, and only inside the affiliation denial.
      text: "The colour tokens skinning this page right now, " + derivedNote(rec.label) + ".",
    })));
}

// activateOn:'visible' — not 'load'. The close sits below the peak, so 'load' would build this
// layer, and arm its analytics, for readers who never reach the beat (spine.mjs:41-43).
registerBeat("beat-close", { effect: closeEffect, activateOn: "visible" });
