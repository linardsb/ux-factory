// system/inspect.mjs — hand-written canon (this repo; not generated). The inspect engine
// (epic #164 — docs/epics/prototyping-feel-uplift.architecture.md §New pieces "Inspect engine";
// ticket #166): toggle inspect mode on, and hovering or focusing any element carrying
// data-inspect="<consumer-id>" opens an anchored bubble with four layers — the component's role
// (copy), its spec line, the tokens it consumes with the CURRENT pack's
// resolved values (getComputedStyle at open time — the only honest source under derived and
// imported packs; system/inspect-data.json ships names only), and live measurements.
//
// WCAG 1.4.13 Content on Hover or Focus — the bubble satisfies all three requirements, with
// glossary.mjs's proven mechanics:
//   dismissible — Esc hides it without moving pointer or focus (toggle state stays on);
//   hoverable   — the hide is a ~120ms timeout the bubble's own mouseenter cancels;
//   persistent  — it stays until hover/focus leaves, Esc, or scroll.
//
// Positioning is progressive: CSS anchor positioning (Chrome 125+/Safari 26+/Firefox 147+) with
// glossary.mjs's fixed-position flip/clamp math as the un-anchored fallback (Firefox ≤146).
// supportsAnchor() is resolved at ACTIVATION time, not module eval, so a test can stub
// CSS.supports before load and the engine honestly takes its fallback path; the bubble reports
// which branch positioned it via data-inspect-pos="anchor|fallback".
//
// The bubble is popover="manual" (top-layer — no ancestor overflow can clip it, no z-index
// management; manual because light-dismiss would fight the 1.4.13 hover timer).
//
// Toggle state persists like the dock's pack choice (localStorage, try/catch both directions,
// restored on load). While off the engine is inert: trigger listeners live in a per-activation
// AbortController, so off means NO listeners, not guarded ones. An unknown data-inspect id
// throws before any trigger is wired (console.error + toggle-off at runtime — the engine backs
// off, it doesn't break the page); the RED-IN-CI guarantee is tooling/drift-check.mjs's
// inspect-mounts gate, which statically resolves every tracked data-inspect id against
// system/inspect-data.json.
//
// Self-initializes when loaded as a page script; Node-import safe (no top-level DOM access).
// #168's palette drives it via the exported initInspect handle ({ setInspect, toggleInspect }).

import { trackToolInspect } from "./analytics.mjs";

export const INSPECT_KEY = "factory-inspect";
const DATA_URL = "/system/inspect-data.json";
const ANCHOR_NAME = "--inspect-target";

// --- DOM builder (glossary.mjs / agentic-renderer.mjs shape) — text via textContent, never innerHTML.
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

const supportsAnchor = () => typeof CSS !== "undefined" && CSS.supports("anchor-name: --a");

let current = null; // the live init handle — initInspect() is idempotent-safe
export const getInspect = () => current; // #168's palette reads the live handle, never rebuilds it
// Re-wire the live session over the mounts on the page NOW. Module-level so a page that renders
// components late can reach it with a lazy import() and pay nothing while inspect is off
// (system/pattern-render.mjs). Safe before init and while off: both are no-ops.
export const refreshInspect = () => current?.refreshInspect();

export function initInspect(root = document) {
  if (current) current.destroy();

  const toggles = [...root.querySelectorAll("[data-inspect-toggle]")];
  const bubble = el("div", {
    class: "inspect-bubble",
    id: "inspect-bubble",
    role: "tooltip",
    popover: "manual",
  });
  document.body.appendChild(bubble);

  let on = false;
  let dataPromise = null; // fetched once, cached — survives toggle off/on
  let activation = null; // AbortController for trigger wiring; null while off
  let open = null; // the trigger currently described, or null
  let hideTimer = 0;
  let hovered = false;
  let focusTrigger = null;
  // The trigger Esc dismissed, or null. armHide must not re-show THAT trigger's bubble until the
  // next genuine mouseenter/focusin act on it (1.4.13 dismissible).
  //
  // A reference and not a flag (pr-180-review.md M3). As a boolean this said "something was
  // dismissed", which any other trigger's mouseenter then cleared — so on a page with two mounts,
  // dismissing a focused trigger's bubble and then grazing a different one re-armed the first, and
  // the bubble the reader had just dismissed came back on mouseleave. /build is the first page with
  // enough triggers for that to be ordinary rather than contrived.
  let dismissedTrigger = null;

  // Popover show/hide with a plain-hidden fallback for engines without the Popover API
  // (baseline since Chrome 114/Safari 17/Firefox 125 — belt-and-braces only). The page-scoped
  // [hidden]{display:none} rule is not needed: .inspect-bubble sets no display of its own.
  const popShow = () => {
    if (bubble.showPopover) { try { bubble.showPopover(); } catch { /* already open */ } }
    else bubble.hidden = false;
  };
  const popHide = () => {
    if (bubble.hidePopover) { try { bubble.hidePopover(); } catch { /* already closed */ } }
    else bubble.hidden = true;
  };

  // glossary.mjs's flip/clamp math, with one addition its small bubble never needed: the top is
  // clamped to the viewport too. This bubble can run ~half the viewport tall (17 token rows),
  // so "flip above" from a trigger near the top would land off-screen — below if it fits, else
  // above, else clamped to the 8px margin (it may then overlap the trigger; still legible,
  // still Esc-dismissible). The un-anchored fallback (a popover is position:fixed by default,
  // so these coordinates work unchanged).
  function position(trigger) {
    const r = trigger.getBoundingClientRect();
    const h = bubble.offsetHeight;
    const fitsBelow = r.bottom + 8 + h + 8 <= window.innerHeight;
    bubble.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - bubble.offsetWidth - 8))}px`;
    bubble.style.top = `${fitsBelow ? r.bottom + 8 : Math.max(8, r.top - h - 8)}px`;
  }

  // The four layers, rebuilt on every open — token values and measurements must be the CURRENT
  // pack's, including a derived or imported pack worn after the last open.
  function renderContent(trigger, entry) {
    const cs = getComputedStyle(trigger);
    const rect = trigger.getBoundingClientRect();
    const specLine = entry.spec
      ? entry.spec.line
      : `styled token-only in components.css · ${entry.label}`;
    bubble.replaceChildren(
      el("p", { class: "inspect-role", text: entry.role }),
      // Plain text only — the bubble is role="tooltip" (a flattened description string) with no
      // keyboard path into a manual popover, so an <a> here would be mouse-only. The handoff
      // pack stays one click away in the site IA (/handoff.html).
      el("p", { class: "inspect-spec", text: specLine }),
      el(
        "dl",
        { class: "inspect-tokens" },
        ...entry.tokens.flatMap((name) => [
          el("dt", { text: name }),
          el("dd", { text: cs.getPropertyValue(name).trim() || "—" }),
        ])
      ),
      el("p", {
        class: "inspect-meas",
        text: `${Math.round(rect.width)}×${Math.round(rect.height)}px · font ${cs.fontSize} · padding ${cs.padding}`,
      })
    );
  }

  function show(trigger, entry, anchorOk) {
    clearTimeout(hideTimer);
    if (open && open !== trigger) {
      open.removeAttribute("aria-describedby");
      open.style.removeProperty("anchor-name");
    }
    renderContent(trigger, entry);
    if (anchorOk) {
      bubble.style.removeProperty("left");
      bubble.style.removeProperty("top");
      trigger.style.setProperty("anchor-name", ANCHOR_NAME);
      bubble.dataset.inspectPos = "anchor";
      popShow();
    } else {
      bubble.dataset.inspectPos = "fallback";
      popShow();
      position(trigger); // measure after content set and the bubble shown
    }
    trigger.setAttribute("aria-describedby", "inspect-bubble");
    open = trigger;
    trackToolInspect(); // success path only — the bubble is on screen; the tracker's own guard makes it once-per-visit
  }

  function hide() {
    clearTimeout(hideTimer);
    popHide();
    if (open) {
      open.removeAttribute("aria-describedby");
      open.style.removeProperty("anchor-name");
      open = null;
    }
  }

  // 1.4.13 hoverable: leaving a trigger only ARMS the hide; reaching the bubble cancels it.
  // Hover and focus tracked separately — a pointer graze must not hide a focused trigger's bubble.
  function armHide(rearm) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (hovered) return;
      if (focusTrigger && focusTrigger !== dismissedTrigger) rearm(focusTrigger);
      else hide();
    }, 120);
  }

  function wireTriggers(entries, signal) {
    const anchorOk = supportsAnchor();
    const triggers = [...root.querySelectorAll("[data-inspect]")];
    // Validate every mount BEFORE wiring anything — an unknown id aborts the whole activation.
    for (const t of triggers)
      if (!entries.has(t.dataset.inspect))
        throw new Error(`inspect: unknown data-inspect id "${t.dataset.inspect}" on ${location.pathname}`);
    const reshow = (t) => show(t, entries.get(t.dataset.inspect), anchorOk);
    // focusin/focusout BUBBLE (mouseenter/mouseleave don't): mounts can nest (a buttons CTA
    // inside the page-hero section), and without a guard the ancestor's listener re-fires on the
    // same event and overwrites the inner mount's bubble. Each mount acts only when the focused
    // element's NEAREST mount is itself.
    // …and a nested element that already provides its OWN description owns it: approach.html
    // (#174) is the first page where glossary <dfn data-term tabindex="0"> marks sit inside
    // mounts, and focusin bubbles, so without the second clause tabbing to a term would open
    // BOTH bubbles — two fixed-position tooltips on one rect, keyboard-only, which no gate sees.
    // Hover needs no guard (mouseenter doesn't bubble). Inert on every page without [data-term].
    const ownEvent = (t, e) =>
      e.target.closest("[data-inspect]") === t && !e.target.closest("[data-term]");
    // Entering a trigger clears the dismissal only if THIS is the trigger that was dismissed —
    // arriving at some other mount says nothing about the one the reader pressed Esc on.
    const rearrive = (t) => { if (dismissedTrigger === t) dismissedTrigger = null; };
    for (const t of triggers) {
      t.addEventListener("mouseenter", () => { hovered = true; rearrive(t); reshow(t); }, { signal });
      t.addEventListener("focusin", (e) => { if (!ownEvent(t, e)) return; focusTrigger = t; rearrive(t); reshow(t); }, { signal });
      t.addEventListener("mouseleave", () => { hovered = false; armHide(reshow); }, { signal });
      t.addEventListener("focusout", (e) => { if (!ownEvent(t, e)) return; focusTrigger = null; armHide(reshow); }, { signal });
    }
    bubble.addEventListener("mouseenter", () => { hovered = true; clearTimeout(hideTimer); }, { signal });
    bubble.addEventListener("mouseleave", () => { hovered = false; armHide(reshow); }, { signal });
    // 1.4.13 dismissible: Esc, only while open — the toggle state stays on. Scroll hides too.
    // `open` is read BEFORE hide(), which nulls it: a pointer-only reader has no focusTrigger, so
    // the trigger being described is the only record of what they just dismissed.
    document.addEventListener("keydown", (e) => {
      if (!open || e.key !== "Escape") return;
      dismissedTrigger = focusTrigger || open;
      hide();
    }, { signal });
    window.addEventListener("scroll", () => { if (open) hide(); }, { passive: true, signal });
  }

  const fetchData = () => {
    dataPromise ??= fetch(DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`inspect: ${DATA_URL} → ${r.status}`);
        return r.json();
      })
      .then((data) => new Map(data.components.map((c) => [c.id, c])));
    return dataPromise;
  };

  const reflect = () => {
    for (const b of toggles) b.setAttribute("aria-pressed", String(on));
    if (on) document.documentElement.dataset.inspectMode = "on";
    else delete document.documentElement.dataset.inspectMode;
  };

  function setInspect(next, { persist = true } = {}) {
    next = Boolean(next);
    if (next === on) return;
    on = next;
    reflect();
    if (persist) {
      try {
        if (on) localStorage.setItem(INSPECT_KEY, "on");
        else localStorage.removeItem(INSPECT_KEY);
      } catch { /* private mode — session-only toggle */ }
    }
    if (!on) {
      hide();
      hovered = false;
      focusTrigger = null;
      dismissedTrigger = null;
      if (activation) { activation.abort(); activation = null; }
      return;
    }
    activate();
  }

  // One activation is one AbortController holding every trigger listener. Extracted so that
  // refreshInspect re-runs EXACTLY what toggling on runs, rather than a second copy of it that is
  // free to drift.
  function activate() {
    const mine = (activation = new AbortController());
    fetchData()
      .then((entries) => {
        if (!on || activation !== mine) return; // toggled off (or re-toggled) mid-fetch
        wireTriggers(entries, mine.signal);
      })
      .catch((e) => {
        dataPromise = null; // a failed fetch may be transient — retry on the next toggle
        if (activation === mine) { console.error(e); setInspect(false); }
      });
  }

  // Re-scan the page for mounts (#171). wireTriggers runs once per activation over the mounts that
  // existed then, so a page that BUILDS components later — /build's pattern stage rebuilds its
  // primitives on every board change — leaves inspect wired to nodes that are gone and silent on
  // the ones now on screen.
  //
  // The destructive way to fix that is initInspect(), which tears down the handle #168's palette
  // holds a reference to (palette.mjs:118 warns about exactly this). This is the narrow
  // alternative: same activation path, same cached data, nothing else disturbed — not the toggle
  // state, not the persisted choice, not the handle. A no-op while inspect is off, which is when
  // there are no listeners to be stale in the first place, and is every visual-regression capture.
  // The three-piece interaction reset is the same one setInspect(false) does (:253-259), and it is
  // load-bearing here for a reason the toggle path never meets (pr-189-review.md H1): destroying a
  // HOVERED node delivers no pointer-exit event at all — measured on all three engines, listening
  // for mouseout/mouseleave/pointerout/pointerleave in the capture phase and getting an empty list.
  // So nothing clears `hovered` when the stage rebuilds under a resting pointer, and the abort below
  // then removes the very mouseleave listener that otherwise would. armHide's timer body opens
  // `if (hovered) return` (:185), so a stuck flag means NO subsequent hide can ever fire and the
  // bubble stops auto-hiding — 1.4.13 PERSISTENT, broken, with no gesture left that recovers it for
  // a reader who has stopped touching the mouse. The other two are the same line: focusTrigger and
  // dismissedTrigger also point at nodes the render that called this may have just removed.
  function refreshInspect() {
    if (!on) return;
    hovered = false;
    focusTrigger = null;
    dismissedTrigger = null;
    if (activation) activation.abort();
    hide(); // the open bubble may be describing a node the render that called this just removed
    activate();
  }

  const toggleWiring = new AbortController();
  for (const b of toggles)
    b.addEventListener("click", () => setInspect(!on), { signal: toggleWiring.signal });

  // Restore the persisted choice (dock.mjs pattern — try/catch, absent key means off).
  let persisted = false;
  try { persisted = localStorage.getItem(INSPECT_KEY) === "on"; } catch { /* stays off */ }
  if (persisted) setInspect(true, { persist: false });

  const handle = {
    setInspect,
    toggleInspect: () => setInspect(!on),
    refreshInspect,
    destroy: () => {
      setInspect(false, { persist: false });
      toggleWiring.abort();
      bubble.remove();
      if (current === handle) current = null;
    },
  };
  current = handle;
  return handle;
}

if (typeof document !== "undefined") initInspect();
