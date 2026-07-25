// system/share-state.mjs — hand-written canon (this repo; not generated).
// The bounded share-link codec for the v3 investment close (epic #70 ticket #77; PRD §6.1
// beat 4 / §8 "the investment step is the takeaway"). Pure: no DOM, no storage, no engine —
// so it is Node-testable and safe to import from anywhere in the graph.
//
// The link carries INPUTS, never outputs: a brand hex, an optional display label, and the
// three wizard axes. The receiving browser re-runs the real derive() engine on that hex
// (system/pack-derived.mjs) instead of trusting a colour set from a stranger's URL — the
// platform's whole claim performed on the share mechanism. Nothing is uploaded; the URL is
// the transport. Bounded on purpose (PRD §8 non-goal): no free text, no encoded token set.
//
// Every value is re-validated on arrival, so there is nothing to protect from tampering and
// nothing secret in the payload. Readable params beat an opaque blob: a recipient can see
// what was shared before clicking, and a reviewer can hand-build a test URL.

// The five params, one per bounded input. Short names because a shared URL gets read aloud.
export const SHARE_PARAMS = {
  brand: "brand",
  density: "density",
  reward: "reward",
  freq: "freq",
  name: "name",
};

// The axis allowlist, mirrored BY HAND from scenarios/validate.mjs:20-24 (its AXES const is the
// source of truth). A shipped page cannot import a Node validator, so the two are kept identical
// by hand — the same mirrored-predicate trade pack-derived.mjs:53-59 makes with pack-boot.js.
// derive() throws on a value its ruleset lacks (derive.mjs:23-45), so an out-of-enum value must
// never get past this file.
export const AXIS_ENUMS = {
  density: ["compact", "comfortable", "spacious"],
  rewardType: ["tribe", "hunt", "self"],
  frequency: ["multiple-daily", "daily", "weekly", "monthly", "rarely"],
};

// Mirrors pack-derived.mjs:32 by hand — importing it would pull derive.mjs and a self-booting
// DOM module into a pure codec, which is the one thing this module is for not doing.
export const NAME_MAX = 40;

// Which param carries which axis. The URL uses the short name; the record uses the axis key.
const AXIS_PARAM = { density: "density", rewardType: "reward", frequency: "freq" };

const HEX_BODY = /^[0-9a-f]{6}$/i;

// encodeShareState({ brandColor, name, axes }) → a query string WITHOUT the leading "?".
// Emits the hex without its "#": a literal # in a query value is legal but confusing, and the
// dock's #appearance disclosure hash lives in the same URL. Any absent or invalid field is
// simply omitted, so a visitor who never picked a colour still gets a valid axes-only link.
// URLSearchParams.toString() does all the escaping — hand-rolling it is where a bug would hide.
export function encodeShareState({ brandColor, name, axes } = {}) {
  const params = new URLSearchParams();
  const hex = typeof brandColor === "string" ? brandColor.replace(/^#/, "").toLowerCase() : "";
  if (HEX_BODY.test(hex)) params.set(SHARE_PARAMS.brand, hex);
  for (const [axis, param] of Object.entries(AXIS_PARAM)) {
    const value = axes?.[axis];
    if (typeof value === "string" && AXIS_ENUMS[axis].includes(value)) params.set(param, value);
  }
  const label = typeof name === "string" ? name.trim().slice(0, NAME_MAX) : "";
  // "your brand" is pack-derived's honest fallback label, not something the visitor typed —
  // sending it would put a phantom company name in the link.
  if (label && label !== "your brand") params.set(SHARE_PARAMS.name, label);
  return params.toString();
}

// decodeShareState(search) → { brandColor, name, axes } or NULL when the URL carries no known
// param. Null is the load-bearing case: a bare /index.html (what the VR gate loads, and what
// every first-time visitor loads) must leave every consumer a strict no-op.
//
// Validate at the boundary and DROP (project rule; no schema library): a bad hex nulls the
// brand and keeps the axes, a bad axis drops only itself and falls through to the scenario
// default. Nothing here throws at the reader — "nothing fails on stage".
export function decodeShareState(search) {
  if (typeof search !== "string" || !search) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const known = Object.values(SHARE_PARAMS).some((p) => params.has(p));
  if (!known) return null; // unknown params only (?utm_source=…) is not shared state

  // Accept the hex with or without a leading "#" — a hand-shared link may carry %23.
  const rawBrand = (params.get(SHARE_PARAMS.brand) || "").replace(/^#/, "");
  const brandColor = HEX_BODY.test(rawBrand) ? "#" + rawBrand.toLowerCase() : null;

  const axes = {};
  for (const [axis, param] of Object.entries(AXIS_PARAM)) {
    const value = params.get(param);
    if (value && AXIS_ENUMS[axis].includes(value)) axes[axis] = value;
  }

  // The label is visitor text from a stranger's URL. Trimmed and hard-capped here; every
  // consumer renders it as textContent inside a sentence that denies the affiliation.
  const name = (params.get(SHARE_PARAMS.name) || "").trim().slice(0, NAME_MAX);

  return { brandColor, name, axes };
}

// hasSharedBrand(search) → did this URL arrive with a USABLE brand colour. True only for a valid
// hex, so the arrival notice never claims a re-skin that a malformed link could not produce.
export function hasSharedBrand(search) {
  return decodeShareState(search)?.brandColor != null;
}
