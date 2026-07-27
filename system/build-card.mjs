// system/build-card.mjs — the SVG a visitor leaves /build holding (epic #134, ticket #137;
// .claude/plans/hooked-shapeup-pattern-builder.md Phase 1.4,
// .claude/plans/build-pattern-render-keep-rail.md).
//
// Two builders, both PURE and both returning SVG **strings**: `cardSvg` is the build card
// ("Rendered from your build"), `boardSvg` is the breadboard as a standalone laid-out file. Strings
// rather than DOM for three reasons that all matter here — the download and the on-screen render
// come from ONE source so they cannot disagree, the file opens standalone in any viewer, and the
// whole module runs under Node, which is what lets tooling/build-checks.mjs assert that a hostile
// visitor label or a third-party token value cannot escape into markup.
//
// Everything is computed from the model. Nothing is measured from the DOM, because there is no DOM
// here — that is the point, and it is also why boardSvg emits its own natural height and lets the
// caller scale it, instead of pretending to know how tall six places are.
//
// The security seam is `resolveTokens`. A token value from a stranger's design ends up in an SVG
// ATTRIBUTE, which is a different context from a custom property, so it gets its own narrower gate
// than the stage's: a colour SHAPE, not merely a safe charset. Anything that does not match falls
// back to the neutral pack's committed literal. Those literals are the one place in the repo where
// a hard-coded colour is correct: a downloaded file has no stylesheet to read a token from.

import { PATTERNS } from "./pattern-rules.mjs";

// The six roles the templates paint with, and the contract token each reads. Fallbacks are
// system/tokens.neutral.css's own resolved values (measured 2026-07-27; re-read them if the
// neutral pack's ramp moves).
const ROLE_TOKEN = {
  accent: "--color-accent",
  fg: "--color-fg",
  fgMuted: "--color-fg-muted",
  surface: "--color-bg",
  surfaceSubtle: "--color-bg-surface",
  border: "--color-border",
};
const NEUTRAL = {
  accent: "#2563eb",
  fg: "#1a1a1a",
  fgMuted: "#6b7280",
  surface: "#ffffff",
  surfaceSubtle: "#f4f4f5",
  border: "#d4d4d8",
};

// A colour SHAPE, deliberately narrower than pack-imported.mjs's VALUE_OK. VALUE_OK admits every
// value the five token families can hold (`16px`, `clamp(...)`, a shadow string); a fill attribute
// must be a colour or nothing, and `var(--x)` — legal in a stylesheet, meaningless in a downloaded
// file — is correctly rejected here and falls back.
const HEX = /^#[0-9a-f]{3,8}$/i;
const COLOR_FN = /^(rgb|hsl|oklch)a?\([a-z0-9 %.,\/-]{1,60}\)$/i;

function resolveTokens(tokens) {
  const out = { ...NEUTRAL };
  const map = tokens && typeof tokens === "object" ? tokens : {};
  for (const [role, name] of Object.entries(ROLE_TOKEN)) {
    // Own-property lookup, so a "__proto__"/"constructor" key in a decoded payload cannot resolve
    // up the chain (agentic-renderer.mjs:44 makes the same argument).
    const raw = Object.hasOwn(map, name) ? map[name] : undefined;
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (HEX.test(value) || COLOR_FN.test(value)) out[role] = value;
  }
  return out;
}

// Every string that reaches text content OR an attribute goes through this. One function, no
// exceptions — the visitor names their own places, and a label of `</text><script>` is a realistic
// paste rather than a paranoid one.
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

// SVG text does NOT wrap, so the character budgets below are structural, not advisory. Clip the
// RAW string, then escape: escaping expands length, and clipping after it could cut an entity.
//
// Counted in CODE POINTS, not UTF-16 units. `slice()` cuts between the halves of a surrogate pair,
// and a lone surrogate makes the whole SVG XML-invalid — DOMParser refuses it, svgNode returns
// null, and the build card silently disappears. That needs no attacker: a place named
// "Overview dashboard 1📊 weekly" is 29 units, nowhere near LABEL_MAX, and the emoji lands exactly
// on the 22-character slot budget's cut. The downloaded file is worse, because it has no parser to
// refuse it and ships the broken bytes. Found by an adversarial review of #137 (PR #145).
const clip = (s, n) => {
  const points = [...String(s ?? "")];
  return points.length <= n ? points.join("") : `${points.slice(0, Math.max(0, n - 1)).join("")}…`;
};

// No external font: a downloaded file cannot reach the page's stylesheet, and a missing family
// falls back to whatever the viewer has. Presentation rides attributes rather than a <style> block
// so the file survives being embedded anywhere.
const FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

// --- the build card ----------------------------------------------------------------------------
// One frame, three bodies. 640×400 in absolute units, so no measurement is needed anywhere.

const W = 640;
const H = 400;
const CAPTION_TOP = 344; // the bottom 56px
const CONTENT_TOP = 64;
const LEFT = 24;
const RIGHT = W - 24;

// The shared frame: canvas, the caption band, the accent rule, the header line, the border. The
// accent rule is 4×28 at x=24 and is the one place brand colour is unmissable at thumbnail size,
// so the header text starts at x=40 — clear of the bar rather than printed over it.
function frame({ t, title, desc, header, captionRight, body }) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" font-family="${FONT}">`,
    `<title>${esc(title)}</title>`,
    `<desc>${esc(desc)}</desc>`,
    `<rect x="0" y="0" width="${W}" height="${H}" rx="12" fill="${esc(t.surface)}"/>`,
    // Bottom corners rounded to match the canvas; a plain rect would print square corners into the
    // rounded ones.
    `<path d="M 0 ${CAPTION_TOP} H ${W} V 388 A 12 12 0 0 1 ${W - 12} ${H} H 12 A 12 12 0 0 1 0 388 Z" fill="${esc(t.surfaceSubtle)}"/>`,
    `<rect x="${LEFT}" y="16" width="4" height="28" fill="${esc(t.accent)}"/>`,
    `<text x="40" y="40" font-size="18" fill="${esc(t.fg)}">${esc(clip(header, 56))}</text>`,
    body,
    `<text x="${LEFT}" y="372" font-size="13" fill="${esc(t.fgMuted)}">Rendered from your build</text>`,
    `<text x="${RIGHT}" y="372" font-size="13" text-anchor="end" fill="${esc(t.fg)}">${esc(clip(captionRight, 32))}</text>`,
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="11.5" fill="none" stroke="${esc(t.border)}"/>`,
    `</svg>`,
  ].join("");
}

// A 3 × 2 tile grid inside the content area: tile 184×116, gutters 20, so a full grid spans
// 24..616 across and 64..316 down. A grid that does not fill both rows is CENTRED in the content
// area rather than pinned to the top of it — three tiles pushed against the header with 140px of
// void under them reads as a card that failed to finish, and three of the six slot counts land
// there. A single row is centred across as well, so one tile is a composition and not a fragment.
const CONTENT_H = CAPTION_TOP - CONTENT_TOP - 24;
const TILE_COLS = 3;
const TILE_W = 184;
const TILE_H = 116;
const TILE_GAP = 20;

function dashboardBody(slots, t) {
  const shown = slots.slice(0, TILE_COLS * 2);
  const rows = Math.ceil(shown.length / TILE_COLS);
  const blockH = rows * TILE_H + (rows - 1) * TILE_GAP;
  const top = CONTENT_TOP + Math.round((CONTENT_H - blockH) / 2);
  const cols = Math.min(shown.length, TILE_COLS);
  const blockW = cols * TILE_W + (cols - 1) * TILE_GAP;
  const startX = rows === 1 ? LEFT + Math.round((RIGHT - LEFT - blockW) / 2) : LEFT;

  return shown.map((slot, i) => {
    const x = startX + (i % TILE_COLS) * (TILE_W + TILE_GAP);
    const y = top + Math.floor(i / TILE_COLS) * (TILE_H + TILE_GAP);
    // The one tone signal, and it is a colour swap on the LABEL rather than invented iconography:
    // the tile already reads its own state in its value ("0 affordances"), so this adds emphasis
    // and never carries the meaning on its own.
    const labelFill = slot.tone === "warn" || slot.tone === "critical" ? t.accent : t.fgMuted;
    const unit = slot.unit
      ? `<tspan font-size="12" dx="6" fill="${esc(t.fgMuted)}">${esc(clip(slot.unit, 14))}</tspan>`
      : "";
    return [
      `<rect x="${x}" y="${y}" width="${TILE_W}" height="${TILE_H}" rx="8" fill="${esc(t.surface)}" stroke="${esc(t.border)}"/>`,
      `<text x="${x + 16}" y="${y + 30}" font-size="12" fill="${esc(labelFill)}">${esc(clip(slot.label, 22))}</text>`,
      `<text x="${x + 16}" y="${y + 72}" font-size="32" fill="${esc(t.fg)}">${esc(clip(slot.value, 6))}${unit}</text>`,
    ].join("");
  }).join("");
}

// Up to five rows stacked in the content area: row 592×44, gutter 8, first at y=64 — the fifth
// ends at 316. A sixth slot exists in the rules (SLOT_MAX) and is deliberately not drawn: the card
// is a thumbnail of the pattern, not a second rendering of it.
const ROW_H = 44;
const ROW_GAP = 8;
const ROW_MAX = 5;

function queueBody(slots, t) {
  const shown = slots.slice(0, ROW_MAX);
  const blockH = shown.length * ROW_H + (shown.length - 1) * ROW_GAP;
  const top = CONTENT_TOP + Math.round((CONTENT_H - blockH) / 2); // centred, same reason as above
  return shown.map((slot, i) => {
    const y = top + i * (ROW_H + ROW_GAP);
    const mid = y + 27; // baseline-centred in a 44px row at 14px
    return [
      `<rect x="${LEFT}" y="${y}" width="${RIGHT - LEFT}" height="${ROW_H}" rx="8" fill="${esc(t.surfaceSubtle)}"/>`,
      `<text x="${LEFT + 16}" y="${mid}" font-size="14" fill="${esc(t.fg)}">${esc(clip(slot.label, 34))}</text>`,
      slot.meta
        ? `<text x="${RIGHT - 120}" y="${mid}" font-size="12" text-anchor="end" fill="${esc(t.fgMuted)}">${esc(clip(slot.meta, 18))}</text>`
        : "",
      // Inset 16 from the ROW's right edge, which is the card's content edge — a value printed
      // hard against the row's own rounded corner reads as an overflow.
      `<text x="${RIGHT - 16}" y="${mid}" font-size="13" text-anchor="end" fill="${esc(t.fg)}">${esc(clip(slot.value, 20))}</text>`,
    ].join("");
  }).join("");
}

// cardSvg({ patternId, slots, board, tokens }) → the SVG string.
//
// The out-of-library body is the same designed object as the other two, showing the part that IS
// real: the visitor's breadboard, nested and scaled into the content area. A card that rendered a
// mock-up of a feed would be the one dishonest thing on this page.
export function cardSvg({ patternId, slots, board, tokens } = {}) {
  const t = resolveTokens(tokens);
  const pattern = patternId && Object.hasOwn(PATTERNS, patternId) ? PATTERNS[patternId] : null;
  const label = pattern ? pattern.label : "No pattern yet";
  const entry = board && Array.isArray(board.places) && board.places.length ? board.places[0].label : null;
  const rows = Array.isArray(slots) ? slots : [];

  if (pattern && pattern.inLibrary && rows.length) {
    return frame({
      t, title: `${label} built on a breadboard`,
      desc: `A ${label.toLowerCase()} assembled from ${rows.length} slot(s) derived from the breadboard, wearing the imported design tokens.`,
      header: entry || label,
      captionRight: label,
      body: patternId === "queue" ? queueBody(rows, t) : dashboardBody(rows, t),
    });
  }

  return frame({
    t,
    title: pattern ? `A breadboard shaped like a ${label.toLowerCase()}` : "A breadboard",
    desc: pattern
      ? `The breadboard this build produced. The ${label.toLowerCase()} pattern has no components in this library yet, so nothing is mocked up in its place.`
      : "The breadboard this build produced. No pattern is named yet.",
    header: pattern ? `Your breadboard · ${label} is not in the library yet` : "Your breadboard",
    captionRight: label,
    // preserveAspectRatio lets the nested board scale into the slot whatever its natural height is.
    body: boardSvg(board, { x: LEFT, y: CONTENT_TOP, width: RIGHT - LEFT, height: 256, tokens }),
  });
}

// --- the breadboard as a file -------------------------------------------------------------------
// Laid out from the MODEL, in its own coordinate space, with its own natural height. A fixed
// height would clip six places or float three, and there is nothing to measure against — so the
// board computes how tall it is and the caller scales it to fit. Same visual grammar as
// breadboard.mjs:560-595 (a single-bend curve from a chip's edge to a box's edge, a dot at the
// source), without any of its DOM measurement.

const BOARD_W = 640;
const BOARD_PAD = 12;
const BOX_HEAD = 34; // the label's band, top of box to the first chip
const BOX_FOOT = 12;
const CHIP_H = 18;
const CHIP_GAP = 6;
const BOX_GAP = 16;
const BOX_MIN_H = 72;
const CHAR_W = 6.2; // 12px system-ui, averaged — chips size to their text without measuring it

function boxHeight(place) {
  const chips = place.affordances ? place.affordances.slice(0, 6) : [];
  const body = chips.length ? chips.length * CHIP_H + (chips.length - 1) * CHIP_GAP : 0;
  return Math.max(BOX_MIN_H, BOX_HEAD + body + BOX_FOOT);
}

function placeBox(place, x, y, w, t) {
  const chips = (place.affordances || []).slice(0, 6);
  const parts = [
    `<rect x="${x}" y="${y}" width="${w}" height="${boxHeight(place)}" rx="8" fill="${esc(t.surface)}" stroke="${esc(t.border)}"/>`,
    `<text x="${x + 12}" y="${y + 24}" font-size="13" fill="${esc(t.fg)}">${esc(clip(place.label, 26))}</text>`,
  ];
  chips.forEach((aff, i) => {
    const cy = y + BOX_HEAD + i * (CHIP_H + CHIP_GAP);
    const text = clip(aff.label, 20);
    const cw = Math.min(w - 24, Math.round(16 + text.length * CHAR_W));
    parts.push(
      `<rect x="${x + 12}" y="${cy}" width="${cw}" height="${CHIP_H}" rx="4" fill="none" stroke="${esc(t.border)}"/>`,
      `<text x="${x + 20}" y="${cy + 13}" font-size="12" fill="${esc(t.fgMuted)}">${esc(text)}</text>`,
    );
  });
  return parts.join("");
}

// Where every chip's right edge and every box's left edge ended up, so the connections can be
// drawn without a second layout pass.
function chipAnchor(place, x, y, w, affId) {
  const chips = (place.affordances || []).slice(0, 6);
  const i = chips.findIndex((a) => a.id === affId);
  if (i < 0) return null;
  const text = clip(chips[i].label, 20);
  const cw = Math.min(w - 24, Math.round(16 + text.length * CHAR_W));
  return { x: x + 12 + cw, y: y + BOX_HEAD + i * (CHIP_H + CHIP_GAP) + CHIP_H / 2 };
}

// boardSvg(board, { width, height, x, y, tokens }) → an SVG string. With no x/y it is a standalone
// file (the download); with them it is a nested <svg> that scales into a slot on the card.
export function boardSvg(board, { width = BOARD_W, height = null, x = null, y = null, tokens } = {}) {
  const t = resolveTokens(tokens);
  const places = board && Array.isArray(board.places) ? board.places : [];
  const connections = board && Array.isArray(board.connections) ? board.connections : [];

  const innerW = BOARD_W - BOARD_PAD * 2;
  const leftW = Math.round(innerW * 0.38);
  const rightX = BOARD_PAD + leftW + Math.round(innerW * 0.12);
  const rightW = BOARD_W - BOARD_PAD - rightX;

  // Lay the boxes out first, then read their geometry back for the lines. Entry place on the left,
  // everything else stacked on the right, which is the same arrangement the live board uses above
  // 820px and the arrangement its connection lines were drawn for.
  const laid = [];
  let rightY = BOARD_PAD;
  places.forEach((place, i) => {
    if (i === 0) {
      laid.push({ place, x: BOARD_PAD, y: BOARD_PAD, w: leftW, h: boxHeight(place) });
      return;
    }
    const h = boxHeight(place);
    laid.push({ place, x: rightX, y: rightY, w: rightW, h });
    rightY += h + BOX_GAP;
  });

  const naturalH = Math.max(
    BOX_MIN_H + BOARD_PAD * 2,
    ...laid.map((b) => b.y + b.h + BOARD_PAD),
  );

  const open = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOARD_W} ${naturalH}"`,
    x != null ? ` x="${x}"` : "",
    y != null ? ` y="${y}"` : "",
    ` width="${width}" height="${height == null ? naturalH : height}"`,
    ` preserveAspectRatio="xMidYMid meet" role="img" font-family="${FONT}">`,
  ].join("");

  if (!places.length) {
    // An empty board still renders a file rather than a blank one: an honest frame and the
    // sentence that says why it is empty.
    return [
      open,
      `<title>An empty breadboard</title>`,
      `<desc>This breadboard has no places on it yet.</desc>`,
      `<rect x="${BOARD_PAD}.5" y="${BOARD_PAD}.5" width="${BOARD_W - BOARD_PAD * 2 - 1}" height="${naturalH - BOARD_PAD * 2 - 1}" rx="8" fill="none" stroke="${esc(t.border)}" stroke-dasharray="6 4"/>`,
      `<text x="${BOARD_W / 2}" y="${naturalH / 2 + 5}" font-size="14" text-anchor="middle" fill="${esc(t.fgMuted)}">No places yet</text>`,
      `</svg>`,
    ].join("");
  }

  const byId = new Map(laid.map((b) => [b.place.id, b]));
  const lines = [];
  for (const pair of connections) {
    if (!Array.isArray(pair)) continue;
    const [affId, placeId] = pair;
    const target = byId.get(placeId);
    if (!target) continue;
    const owner = laid.find((b) => (b.place.affordances || []).some((a) => a.id === affId));
    if (!owner) continue;
    const from = chipAnchor(owner.place, owner.x, owner.y, owner.w, affId);
    if (!from) continue;
    const to = { x: target.x, y: target.y + 20 };
    lines.push(
      `<path d="M ${from.x} ${from.y} C ${from.x + 40} ${from.y}, ${to.x - 40} ${to.y}, ${to.x} ${to.y}" fill="none" stroke="${esc(t.border)}" stroke-width="1.5"/>`,
      `<circle cx="${from.x}" cy="${from.y}" r="3" fill="${esc(t.border)}"/>`,
    );
  }

  return [
    open,
    // The title SUMMARISES; the boxes NAME. Keeping the visitor's labels out of it is not squeamish
    // about escaping (they are escaped either way) — it means a label appears exactly once in the
    // file, which is an invariant tooling/build-checks.mjs can assert without ambiguity.
    `<title>A breadboard: ${places.length} place(s), ${places.reduce((n, p) => n + (p.affordances || []).length, 0)} affordance(s), ${connections.length} connection(s)</title>`,
    `<desc>Places, the affordances on them, and the connections that take the user from place to place.</desc>`,
    lines.join(""),
    laid.map((b) => placeBox(b.place, b.x, b.y, b.w, t)).join(""),
    `</svg>`,
  ].join("");
}
