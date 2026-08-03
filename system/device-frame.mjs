// system/device-frame.mjs — hand-written canon (this repo; not generated). The resizable device
// frame (epic #164 — docs/epics/prototyping-feel-uplift.architecture.md §New pieces "Device frame";
// ticket #176; .claude/plans/protos-bus-toggles-device-frame-176.md).
//
// Verdant's phone bezel was a fixed 392px box. This makes it a grab-and-drag frame between clamped
// widths, keyboard-operable to the WAI-ARIA window-splitter pattern, and the screen's contents
// reflow through the @container queries in system/proto.css. The components themselves were always
// token-only and width-agnostic — nothing about them changes, which is the point being shown.
//
// THE REST GEOMETRY IS CSS, NOT JS, and that is load-bearing. proto.css declares
// `width: var(--frame-w, min(392px, 94vw))` with the ORIGINAL value as the fallback; this module
// writes --frame-w only once the reader actually drags or keys. So nothing here runs before the
// first interaction, the at-rest width cannot race the mount, and the visual-regression gate
// captures exactly what it captured before the module existed. Same discipline as pack-boot.js's
// guaranteed-no-op default, which that gate already relies on.
//
// What DOES arrive late is the handle and the readout — they are injected here, and injecting them
// also wraps the phone in .proto-device, which reflows the stage. That is why this module sets
// [data-device-frame="ready"] on .proto-stage-center in a `finally` on EVERY path, including the
// early return when there is no phone: tooling/visual-regression/visual.spec.mjs waits on it, and
// without the wait the capture races the injection and bakes a handle-less baseline that then
// compares cleanly against itself forever (the #138 defect class).
//
// Node-import safe: no top-level DOM access, and no self-init — the page mounts it explicitly
// (top-window only, so work.html's iframe embeds get no frame chrome).

// The clamp, and the driver's source of truth — tooling/proto-journey.mjs imports these rather
// than retyping them, so moving a bound fails the driver instead of drifting past it.
export const FRAME_MIN = 320; // a small phone
export const FRAME_MAX = 720; // a small tablet
export const STEP = 16; // one --spacing-md of travel per arrow press

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

let live = null; // the mounted handle — the exported seam below drives THIS frame, never a new one

// The driver's seam (build-journey.mjs's module-export idiom — page globals are not this repo's
// test surface). Returns the width actually applied after clamping, or null if nothing is mounted.
export const setFrameWidth = (px) => (live ? live.setWidth(px) : null);

export function initDeviceFrame(root = document) {
  const stage = root.querySelector(".proto-stage-center");
  try {
    const phone = root.querySelector(".proto-frame-phone");
    if (!phone) return null; // the driver imports this module for its constants; a page without a
                             // phone is not an error — the `finally` still resolves the VR handle

    // --- structure: wrap the phone, then build the handle beside it -----------------------
    // The handle is created HERE and never in markup: a control with no engine behind it is worse
    // than no control (the same call proto/verdant.html:196 makes about the inspect toggle).
    const device = el("div", { class: "proto-device" });
    phone.replaceWith(device);
    device.appendChild(phone);

    const handle = el("div", {
      class: "proto-resize",
      role: "separator",
      "aria-orientation": "vertical",
      tabindex: "0",
      "aria-label": "Drag or use the arrow keys to resize the phone frame",
    });
    device.appendChild(handle);

    const readout = el("p", { class: "proto-resize-readout" });
    device.insertAdjacentElement("afterend", readout);

    // --- geometry ------------------------------------------------------------------------
    // Clamp against the MEASURED available width, never the bare constants. At a 320px viewport
    // the CSS default resolves to 94vw ≈ 300px — already below FRAME_MIN — so a bare-constant
    // clamp would make the first keypress WIDEN the frame past the viewport. Recomputed on every
    // call rather than cached, because the viewport can change under a mounted frame.
    function bounds() {
      const host = stage || device.parentElement;
      let room = Infinity;
      if (host) {
        const cs = getComputedStyle(host);
        room = host.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
        // the handle and the flex gap are part of the row, so they are not room for the phone
        const gap = parseFloat(getComputedStyle(device).columnGap || 0) || 0;
        room -= handle.getBoundingClientRect().width + gap;
      }
      const max = Math.max(1, Math.min(FRAME_MAX, room));
      return { min: Math.min(FRAME_MIN, max), max };
    }

    const measured = () => phone.getBoundingClientRect().width;

    // Reflect the CURRENT width onto the handle and the readout. Called at mount with the width
    // the CSS chose — a read, never a write — so the frame's rest geometry stays CSS-owned.
    function reflect(width) {
      const { min, max } = bounds();
      const w = Math.round(width);
      handle.setAttribute("aria-valuemin", String(Math.round(min)));
      handle.setAttribute("aria-valuemax", String(Math.round(max)));
      handle.setAttribute("aria-valuenow", String(w));
      handle.setAttribute("aria-valuetext", `${w} px`);
      readout.textContent = `${w} px wide`;
    }

    function setWidth(px) {
      const { min, max } = bounds();
      const w = Math.round(Math.min(max, Math.max(min, Number(px))));
      phone.style.setProperty("--frame-w", `${w}px`);
      reflect(w);
      return w;
    }

    // --- pointer -------------------------------------------------------------------------
    // setPointerCapture: a handle that loses the pointer outside its own 10px box is the classic
    // resize bug. pointercancel is mandatory, not belt-and-braces — a drag interrupted by a
    // browser gesture (or a touch turning into a scroll) otherwise survives with the attribute
    // stuck on and every subsequent pointermove still resizing.
    const ac = new AbortController();
    const { signal } = ac;
    let dragging = false;
    let startX = 0;
    let startW = 0;

    handle.addEventListener("pointerdown", (e) => {
      dragging = true;
      startX = e.clientX;
      startW = measured();
      device.setAttribute("data-dragging", "");
      try { handle.setPointerCapture(e.pointerId); } catch { /* capture unavailable — the move listener still tracks */ }
      e.preventDefault();
    }, { signal });

    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      // A drag is only live while the primary button is actually held. Two things make this a
      // guard rather than a formality, and tooling/proto-journey.mjs caught the first of them:
      //   1. Firefox, once a CAPTURED pointer leaves the window, keeps delivering pointermove —
      //      with clientX 0 and buttons 0. Applied literally that is a huge negative delta, so
      //      dragging the handle off the right edge SNAPPED THE FRAME TO ITS MINIMUM, the exact
      //      opposite of what the reader asked for. Measured on firefox 1.61.1; chromium and
      //      webkit deliver the true coordinate and a pointerup instead.
      //   2. A button released outside the window delivers no pointerup to the page at all, on
      //      any engine — so without this the drag would stick and every later move would resize.
      // Reading `buttons` rather than testing for the magic 0 coordinate keeps the fix about what
      // is true (no button, no drag) instead of about one engine's spelling of it.
      if ((e.buttons & 1) === 0) { endDrag(e); return; }
      setWidth(startW + (e.clientX - startX));
    }, { signal });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      device.removeAttribute("data-dragging");
      try { handle.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    }
    handle.addEventListener("pointerup", endDrag, { signal });
    handle.addEventListener("pointercancel", endDrag, { signal });

    // --- keyboard (WAI-ARIA window splitter) ----------------------------------------------
    handle.addEventListener("keydown", (e) => {
      const { min, max } = bounds();
      const step = e.shiftKey ? STEP * 4 : STEP;
      let next = null;
      if (e.key === "ArrowLeft") next = measured() - step;
      else if (e.key === "ArrowRight") next = measured() + step;
      else if (e.key === "Home") next = min;
      else if (e.key === "End") next = max;
      if (next == null) return;
      e.preventDefault(); // arrows would otherwise scroll the page out from under the reader
      setWidth(next);
    }, { signal });

    // Seed the control from the width the CSS chose. reflect(), not setWidth() — reading the
    // rendered width and reporting it is not the same as writing it, and only the former keeps
    // --frame-w unset until the reader acts.
    reflect(measured());

    const handleObj = {
      setWidth,
      destroy() {
        ac.abort();
        readout.remove();
        handle.remove();
        device.replaceWith(phone);
        phone.style.removeProperty("--frame-w");
        if (live === handleObj) live = null;
      },
    };
    live = handleObj;
    return handleObj;
  } finally {
    // Every path, including the early return above and any throw — a gate that deadlocks to
    // timeout tells you less than one that fails on the missing thing.
    stage?.setAttribute("data-device-frame", "ready");
  }
}
