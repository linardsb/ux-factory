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
//
// The `typeof document` guard below is not defensive tidiness. tooling/build-checks.mjs imports
// build-keep.mjs and pattern-render.mjs, both of which import this module (#149), so CI's `verify`
// job evaluates this file under Node — where it survives today only because BEACON_TOKEN is "" and
// `&&` short-circuits before `location` is ever read. Filling the token at launch would turn that
// into `ReferenceError: location is not defined` and take the job down on launch day. Guard on
// `document` rather than `location`: the injected branch touches document.createElement and
// document.head, so a location-only guard still throws once PRODUCTION_HOST is filled too.
// build-checks group 10 imports this module with BOTH constants filled, which is the only way that
// failure is visible before it happens.

const BEACON_TOKEN = ""; // filled at launch
const PRODUCTION_HOST = ""; // filled at launch — canonical prod hostname (e.g. "linardsberzins.com")
const VIRTUAL_EVENT_PATH = "/factory/driven";
const RESTORE_DELAY_MS = 50; // lets the beacon's pushState hook read the virtual path

if (typeof document !== "undefined" && BEACON_TOKEN && location.hostname === PRODUCTION_HOST) {
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

// RETIRED BY #216: trackFactoryBuilt (/factory/built, #75) and trackFactoryShared
// (/factory/shared, #77). Both fired only from home's spine — the built-screen peak and the close
// beat — and #216 compressed home to the gate, deleting system/peak.mjs and system/close.mjs with
// their only call sites. The two literals are now free: NO code pushes them, and none should be
// reused. Their successors on the studio are deliberately named differently (/factory/exported and
// /factory/link-copied, #210) so that two differently-meaning events never collapse into one CF WA
// row across time — see the block above FACTORY_LINK_PATH, which records that reasoning in full.
// tooling/build-checks.mjs group 10's pinned MIN dropped both names in the same commit.

const ARRIVED_EVENT_PATH = "/factory/arrived";
let arrivedFired = false;

// The receiving half of the share loop (#77): fired once when a reader opens SOMEONE ELSE's share
// link. This is the PRD §7 "Forwarded internally" metric itself — a forward is only observable
// where it lands.
//
// IT SURVIVES #216 WITHOUT ITS SENDING HALF, and that asymmetry is correct rather than an
// oversight: /factory/shared counted senders producing links from home's close beat, which is gone,
// but links already in the wild keep arriving and this still counts them. The studio's
// /factory/link-copied (FACTORY_LINK_PATH below) is the sending half now, so the pair still
// exists — under a different name, on a different page, deliberately (see that block).
//
// HELD UNTIL `load`, unlike the three above, and that is load-bearing rather than tidy. Its caller is
// pack-derived.mjs's shared-link hydration, which runs while dock.mjs is being imported — before
// the page's later modules have read location.search out of the URL. The flip blanks the query
// string for RESTORE_DELAY_MS, so firing early breaks the arrival this event exists to measure.
//
// A macrotask is NOT enough, and this was measured, not assumed: each deferred <script type="module">
// is its own task, so a setTimeout(0) queued from one tag fires BEFORE a later tag evaluates. On that
// interleaving the wizard read an empty search and fell back to the scenario defaults — 7 of 25 loads
// silently dropped the sender's answers. `load` fires only after every deferred module has evaluated,
// which makes the ordering a guarantee rather than a race. `real` is read inside the handler for the
// same reason: it must be the settled URL, not the one that existed when the caller asked.
export function trackFactoryArrived() {
  if (arrivedFired) return;
  arrivedFired = true;
  const flip = () => {
    const real = location.pathname + location.search + location.hash;
    history.pushState(history.state, "", ARRIVED_EVENT_PATH);
    setTimeout(() => history.replaceState(history.state, "", real), RESTORE_DELAY_MS);
  };
  if (document.readyState === "complete") flip();
  else window.addEventListener("load", flip, { once: true });
}

// ------------------------------------------------------------------ /build (epic #134, #149)
// Two events for the sixth public surface. These EXTEND the epic's analytics call rather than
// executing it: docs/epics/portfolio-v3-experience.architecture.md:25 names only /factory/built
// (a route #216 has since retired), so a reviewer should read this as a scope decision — delete
// these two functions and their two call sites and nothing else changes.
//
// Both paths are module-level literals and stay that way. A virtual route IS the entire payload,
// and /build's promise is that nothing about the visitor's tokens, answers or board leaves the
// browser — so no id, no slug, no pattern name is ever appended. build-checks group 10 asserts the
// pushed path against a location.search that is carrying a real ?b= payload.

// Unlike the four above, these two are called from INSIDE catch blocks — pattern-render.mjs's catch
// renders "the renderer refused this composition", build-keep.mjs's says "the link could not be
// built". A browser refusing pushState (file://, sandboxed) must not be reported as either, so the
// flip is guarded here rather than at each call site; build-keep.mjs:206 guards its own
// replaceState the same way. The four trackers above keep their own bodies: none of them is called
// from a catch, trackFactoryArrived's `load` deferral cannot share this shape at all, and their
// comments carry decisions from #6, #75 and #77 that a refactor would strand or paraphrase.
// (`flipTo`, not `flip`: trackFactoryArrived already has a local `flip` of its own.)
//
// A flip that opens while another one's window is still open must NOT snapshot what it finds in
// location, and that is the difference between a restore and a trap: what it finds is the first
// flip's VIRTUAL path, and restoring that is the last write the page makes, so the address bar keeps
// "/build/shared" for good — which 404s on reload, bookmark and forward. Driven, not theorised: a
// copy click landing as the vocabulary fetch resolves does exactly this on 4 of 4 chromium runs.
// So the real URL is recorded once and every restore still in flight targets that one.
//
// The test is "are we SITTING on a path this module pushed", NOT "is a window open", and the
// difference is what a REAL url written mid-window gets treated as. Today nothing writes one:
// build-keep waits the window out (settledUrl), and dock.mjs's only path/query write is gated on
// location.hash === "#appearance", which is false for the whole window. But that is a property of
// two other modules, not of this one, and the blunter rule has already been caught once — with the
// first version of build-keep's fix, which DID write mid-window, firefox and webkit sequence the
// copy click and the pattern render the other way round from chromium, and "reuse whenever a window
// is open" handed the restore a URL from before the copy and wiped the visitor's whole ?b= out of
// the address bar, on the very click whose message promises "it is in your address bar too".
// Keying on the path costs nothing and refuses only what is actually virtual. build-checks group 10
// cases D and E are the predicate; build-journey [17d] drives both orderings on all three engines.
// (Found while gating this PR's review finding 1; the four /factory trackers have the same shape
// and are out of #149's scope.)
let realUrl = null;
const pushedPaths = new Set(); // every virtual path this module has put in the address bar

// True while location is showing one of those virtual paths instead of the reader's real URL.
// Exported because build-keep.mjs builds the share link out of location and must not do it mid-flip:
// shareUrl only overwrites ?b=, so the virtual PATHNAME would survive into the link and the visitor
// would be handed a /build/pattern?b=… that 404s. The alternative — build-keep snapshotting its own
// base at mount — was implemented first and is wrong: the base freezes the HASH, so the next
// debounced write strips the appearance dock's "#appearance" and closes the dock mid-edit (firefox
// and webkit both, [17b] going red). The dock owns the hash and location is the only place it lives,
// so the link has to keep reading location — it just has to wait for location to be the reader's
// again. (PR #162 review, High 1, the "if yes" branch of its own discriminating question.)
export function onVirtualRoute() {
  return pushedPaths.has(location.pathname);
}

function flipTo(path) {
  const snap = onVirtualRoute() && realUrl
    ? realUrl
    : { pathname: location.pathname, search: location.search, hash: location.hash };
  try {
    history.pushState(history.state, "", path);
  } catch {
    return; // no session history to push — nothing recorded, nothing broken
  }
  pushedPaths.add(path);
  realUrl = snap;
  setTimeout(() => {
    // The pathname and the query come from the SNAPSHOT — the virtual path carries neither, so
    // reading them live would restore "/build/pattern" and drop the visitor's whole ?b= build.
    // The HASH is taken live when there is one, and that is not symmetry-for-its-own-sake: the
    // virtual path carries no hash either, so a hash present NOW was written during the window, and
    // the appearance dock is the reachable writer (a toggle sets location.hash). Restoring the
    // snapshot over it drops the "#appearance" that dock.mjs:455's Escape handler matches on, which
    // leaves the panel open with no keyboard way to shut it. Measured, not theorised: reproduced on
    // chromium, firefox and webkit, and it made build-journey's dock check [7] fail 1 run in 9
    // before this line existed (#149). Falling back to the snapshot keeps the ordinary case — a
    // reader who arrived at /build#something and touched nothing — landing back where they were.
    // What the fallback CANNOT tell apart is "no hash was written in the window" from "a hash was
    // deliberately CLEARED in the window" — both read as "". That is safe only because of an
    // invariant it does not own: all three of dock.mjs's close paths (Escape :455, click-outside
    // :458, toggle :450) gate on location.hash === "#appearance", which is false for the entire
    // window, so none of them can clear the hash inside it. Code that clears location.hash
    // unconditionally would be silently undone here. (PR #162 review, Low 4)
    try { history.replaceState(history.state, "", snap.pathname + snap.search + (location.hash || snap.hash)); }
    catch { /* nothing to restore */ }
  }, RESTORE_DELAY_MS);
}

const BUILD_PATTERN_PATH = "/build/pattern";
let buildPatternFired = false;

// Fired when a pattern is actually ON STAGE — from the last line of pattern-render.mjs's
// renderPattern, the one branch that means it. NOT from the data-pattern-stage="ready" flag, which
// is also set for the empty, out-of-library, refused and vocabulary-unavailable branches: that flag
// means "this stage has settled", not "a pattern rendered". /build pageviews vs this path is the
// funnel-completion ratio. Own fire-once guard: a shared module-level flag would let whichever
// event fires first suppress the other.
export function trackBuildPattern() {
  if (buildPatternFired) return;
  buildPatternFired = true;
  flipTo(BUILD_PATTERN_PATH);
}

const BUILD_SHARED_PATH = "/build/shared";
let buildSharedFired = false;

// The /build link-production event: fired once when the visitor HAS a link — clipboard granted or
// the select-the-field fallback, since both leave them holding it. It measures link production, not
// forwarding — a forward is only observable where it lands. Same caller contract as the rest: build the URL
// and put it in the address bar BEFORE calling this, or the RESTORE_DELAY_MS flip window rewrites
// location out from under the code that is still assembling it.
export function trackBuildShared() {
  if (buildSharedFired) return;
  buildSharedFired = true;
  flipTo(BUILD_SHARED_PATH);
}

// ------------------------------------------------------------------ /tool (epic #164, #166)
const TOOL_INSPECT_PATH = "/tool/inspect";
let toolInspectFired = false;

// The inspect-engine event (#166): fired once per page visit by system/inspect.mjs's show(), the
// one path that means a bubble is actually on screen — never from the toggle or a settled-state
// flag. The static literal is the entire payload (same discipline as every path above). Simple
// pushState-and-restore shape, not flipTo: per the epic architecture §Analytics milestones these
// events don't navigate, so it inherits the same theoretical 50 ms collision window the four
// /factory trackers accept (#149 left them unchanged deliberately). The pushState is guarded like
// flipTo's because inspect.mjs may run where pushState refuses (file:// during dev) — a refusal
// must not throw out of the bubble's show path. Own fire-once guard, for the reason every tracker
// here has its own.
export function trackToolInspect() {
  if (toolInspectFired) return;
  toolInspectFired = true;
  const real = location.pathname + location.search + location.hash;
  try {
    history.pushState(history.state, "", TOOL_INSPECT_PATH);
  } catch {
    return; // no session history to push — nothing recorded, nothing broken
  }
  setTimeout(() => {
    try { history.replaceState(history.state, "", real); } catch { /* nothing to restore */ }
  }, RESTORE_DELAY_MS);
}

// ------------------------------------------------------------------ /factory, the studio (epic #202)
const FACTORY_TOOK_OVER_PATH = "/factory/took-over";
let tookOverFired = false;

// The take-over event (#209): fired once when the visitor grabs the wheel from the replay driver —
// from system/replay-driver.mjs's HANDOVER SUCCESS PATH and from nothing else. Never from a
// settled-state flag and never from a slot: the spine's analytics slot fires after its effect
// whether the effect succeeded or fell through (#75), and a replay that had nothing to take over
// (the artifact failed to load) never reaches this line, because a visitor moving blocks on a canvas
// the run never built has taken nothing over and firing there would make the metric a lie.
//
// flipTo, NOT the simple trackToolInspect shape, and that is a deliberate difference from the two
// /tool events above. /factory carries the appearance dock (which writes location.hash) and #206's
// hash-routed inspector panels, so BOTH of flipTo's protections are reachable here: the live-hash
// restore and the overlapping-flip rule. #210 put the two more routes below on this same page,
// which is exactly the overlap case those rules exist for — and the two of them are the studio keep
// rail's OWN BUTTONS, 30 ms apart when a reader exports and then copies, so the overlap stopped
// being theoretical the moment they shipped.
//
// The static literal is the entire payload — no slug, no seq, no board. Own fire-once guard, for
// the reason every event above has one (:64-67: a shared flag lets whichever fires first suppress
// the other). tooling/build-checks.mjs group 10 proves the path, the payload, the fire-once and the
// restore; that this sits on the handover's success path is a running-page fact and belongs to
// tooling/studio-journey.mjs.
export function trackFactoryTookOver() {
  if (tookOverFired) return;
  tookOverFired = true;
  flipTo(FACTORY_TOOK_OVER_PATH);
}

// The studio keep rail's two events (#210) — the leave-with-the-artifact half of the epic's MVP,
// and the only instrumentation the "keep/share above the /build baseline" success metric has on
// this route. Both are flipTo for the reason stated above, and both are on THE SAME PAGE as the
// take-over, which is what makes the overlapping-flip rule load-bearing here rather than defensive.
//
// THE NAMES ARE NOT THE OBVIOUS ONES, DELIBERATELY. /factory/shared and /factory/built already
// existed when #210 named these, and both fired from HOME'S SPINE, not from this page — reusing
// either would make two different events indistinguishable in CF Web Analytics, where the path is
// the entire payload, and the metric #210 exists to produce would be unattributable from day one.
// #216 has since deleted both of those trackers, which does NOT free the literals: the CF WA
// dashboard is a time series, so a path that meant "reached home's peak" until #216 must never
// start meaning "exported from the studio" after it. build-checks group 10 asserts that every path
// this module can push is pairwise DISTINCT, which is the check that would have caught the reuse;
// that a path is merely static never could.
const FACTORY_LINK_PATH = "/factory/link-copied";
let linkCopiedFired = false;

// Fired once when the visitor HAS the studio's share link — clipboard granted OR the
// select-the-field fallback, since both leave them holding it (trackBuildShared's rule, inherited).
// Same caller contract as every flipTo tracker: build the URL and put it in the address bar BEFORE
// calling this, or the RESTORE_DELAY_MS window rewrites location out from under the code still
// assembling it. system/studio-keep.mjs is the only caller.
export function trackFactoryLinkCopied() {
  if (linkCopiedFired) return;
  linkCopiedFired = true;
  flipTo(FACTORY_LINK_PATH);
}

const FACTORY_EXPORTED_PATH = "/factory/exported";
let exportedFired = false;

// Fired once when a runnable single-file export has actually been handed to the browser — from
// system/studio-keep.mjs's SUCCESS PATH, after the blob click, and from nothing else. Never from a
// settled-state flag and never from the button's own handler entry: an export that could not be
// assembled (no composition, no vocabulary) reaches the honest card instead, and counting that as a
// keep would make the metric a lie in the one direction it must not be wrong (#75's lesson, the
// same one trackFactoryTookOver's comment records).
export function trackFactoryExported() {
  if (exportedFired) return;
  exportedFired = true;
  flipTo(FACTORY_EXPORTED_PATH);
}

const TOOL_PALETTE_PATH = "/tool/palette";
let toolPaletteFired = false;

// The command-palette event (#168): fired once per page visit by system/palette.mjs's open path,
// AFTER showModal() returns — the one line that means the palette is really on screen — never
// from the keydown alone. The static literal is the entire payload. Simple pushState-and-restore
// shape, not flipTo: opening the palette does not navigate and builds no URLs, so per the epic
// architecture §Analytics milestones it inherits the same theoretical 50 ms collision window the
// four /factory trackers accept. Guarded pushState for the same reason trackToolInspect's is —
// a refusal (file:// during dev) must not throw out of the palette's open path.
export function trackToolPalette() {
  if (toolPaletteFired) return;
  toolPaletteFired = true;
  const real = location.pathname + location.search + location.hash;
  try {
    history.pushState(history.state, "", TOOL_PALETTE_PATH);
  } catch {
    return; // no session history to push — nothing recorded, nothing broken
  }
  setTimeout(() => {
    try { history.replaceState(history.state, "", real); } catch { /* nothing to restore */ }
  }, RESTORE_DELAY_MS);
}
