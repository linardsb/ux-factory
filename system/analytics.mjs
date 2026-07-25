// system/analytics.mjs — hand-written canon (this repo; not generated).
// Cloudflare Web Analytics (cookieless) + the one custom-event helper: "factory driven"
// (epic #1, ticket #6; architecture §Stack; PRD §7 — diagnoses the WRONG condition).
//
// Platform constraint, load-bearing: CF Web Analytics has no custom events (FAQ:
// "Not yet") — the beacon records pageviews only, including SPA route changes via its
// History API hooks. So the "factory driven" event is a VIRTUAL-ROUTE pageview: the
// helper briefly pushes /factory/driven, the beacon records the route change, and the
// URL is restored. In the dashboard, the event = pageviews filtered to that path.
// (Decided with the PRD holder 2026-07-17; alternative — Zaraz zaraz.track() — needs
// the site proxied through a CF zone, a launch-time infra call.)
//
// BEACON_TOKEN is the public site token from the CF dashboard (Web Analytics → Manage
// site). It is public by design — it sits in page HTML on every CF WA site — so
// committing it is safe. Empty token = beacon not injected; the helper stays callable.
// End-to-end recording is verifiable only once the token exists at launch; the
// contract testable today: imports cleanly, flips the URL, restores it, fires once.
//
// PRODUCTION_HOST gates injection to the canonical production host ONLY — an allow-list,
// not a local-host deny-list — so CF Pages `*.pages.dev` branch previews and local dev
// never record traffic once the token lands. Fill it alongside BEACON_TOKEN at launch;
// empty host = beacon not injected anywhere (fail-closed).

const BEACON_TOKEN = ""; // filled at launch
const PRODUCTION_HOST = ""; // filled at launch — canonical prod hostname (e.g. "linardsberzins.com")
const VIRTUAL_EVENT_PATH = "/factory/driven";
const RESTORE_DELAY_MS = 50; // lets the beacon's pushState hook read the virtual path

if (BEACON_TOKEN && location.hostname === PRODUCTION_HOST) {
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.dataset.cfBeacon = JSON.stringify({ token: BEACON_TOKEN });
  document.head.appendChild(s);
}

let fired = false;

// The one custom event. Fired for real by the Factory page (ticket #10) when a reader
// drives the pipeline; callable anywhere via module import.
export function trackFactoryDriven() {
  if (fired) return;
  fired = true;
  const real = location.pathname + location.search + location.hash;
  history.pushState(history.state, "", VIRTUAL_EVENT_PATH);
  // pushState + delayed restore leaves one same-URL history entry — accepted; leaving
  // the virtual URL in place would break refresh and bookmarking instead.
  setTimeout(() => history.replaceState(history.state, "", real), RESTORE_DELAY_MS);
}

const BUILT_EVENT_PATH = "/factory/built";
let builtFired = false;

// The spine-completion event (#75): fired once by the peak beat when a reader REACHES the built
// screen (the PRD success metric — visitors who reach the peak, not everyone who loads home). Its
// own fire-once guard: sharing trackFactoryDriven's module-level `fired` would let whichever event
// fires first suppress the other. Same virtual-route mechanism (CF WA has no custom events).
export function trackFactoryBuilt() {
  if (builtFired) return;
  builtFired = true;
  const real = location.pathname + location.search + location.hash;
  history.pushState(history.state, "", BUILT_EVENT_PATH);
  setTimeout(() => history.replaceState(history.state, "", real), RESTORE_DELAY_MS);
}

const SHARED_EVENT_PATH = "/factory/shared";
let sharedFired = false;

// The investment event (#77): fired once by the close beat when a reader copies a share link — the
// mechanism behind the PRD §7 "Forwarded internally" metric, which had no measurement before. This
// is #77 EXTENDING the epic's analytics call rather than executing it: the architecture doc names
// only /factory/built as the added virtual route, so a reviewer should see this as a scope decision.
// Its own fire-once guard, for the same reason trackFactoryBuilt has one. Note for callers: this
// rewrites location for RESTORE_DELAY_MS, so build the share URL BEFORE calling it.
export function trackFactoryShared() {
  if (sharedFired) return;
  sharedFired = true;
  const real = location.pathname + location.search + location.hash;
  history.pushState(history.state, "", SHARED_EVENT_PATH);
  setTimeout(() => history.replaceState(history.state, "", real), RESTORE_DELAY_MS);
}
