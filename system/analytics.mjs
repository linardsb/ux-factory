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

const BEACON_TOKEN = ""; // filled at launch
const VIRTUAL_EVENT_PATH = "/factory/driven";
const RESTORE_DELAY_MS = 50; // lets the beacon's pushState hook read the virtual path
const LOCAL_HOSTS = ["localhost", "127.0.0.1"]; // never measure local dev (mirrors scenario-data.mjs)

if (BEACON_TOKEN && !LOCAL_HOSTS.includes(location.hostname)) {
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
