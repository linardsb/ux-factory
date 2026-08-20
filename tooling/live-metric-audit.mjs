// tooling/live-metric-audit.mjs — the studio's three win-metric routes, verified on the LIVE site
// (epic #202 close, ticket #223; plan .claude/plans/studio-epic-close-223.md).
//
// WHAT THIS PROVES, AND AGAINST WHAT. build-checks group 10 proves the trackers' predicate — static
// literals, pairwise-distinct paths, fire-once, the overlapping-flip restore — and studio-journey
// proves the call sites on the local tree. Neither can prove the one thing this ticket needs: that
// the DEPLOYED page fires them. This script drives the deployed page. It asserts each of
// /factory/took-over, /factory/exported and /factory/link-copied fires exactly once, from its
// success path, as a bare static literal, and that the reader's real URL comes back after every
// flip. Chromium only, deliberately: this is a wiring check on one deployment, not an engine check
// — the three-engine coverage lives in studio-journey and is about the code, which is identical.
//
// WHAT THIS DOES NOT PROVE, HONESTLY. CF Web Analytics has no custom events — an event is a
// pageview at a synthetic path, and the beacon is the only reporter. Until launch fills
// BEACON_TOKEN and PRODUCTION_HOST in system/analytics.mjs the beacon is fail-closed dark, so
// nothing here reaches a dashboard; the observable truth is the history flip, which is precisely
// the mechanism the beacon would consume. AT LAUNCH: re-run this script against the canonical
// host, then confirm the three paths appear in the CF WA dashboard — that is the end-to-end half.
// (This script also asserts the beacon stayed dark, so a premature token shows up here first.)
//
// THE ROUTES ARE WATCHED THROUGH history, wrapped in an addInitScript BEFORE any module evaluates
// — never polled from the address bar, which the 50 ms restore always wins (analytics.mjs
// RESTORE_DELAY_MS). The stale-deploy guard runs first: the live host must actually serve the
// studio, because the epic's whole gate suite ran against local trees while the public URL served
// the pre-studio site (the find that put this guard in the plan).
//
// Run it:
//   node tooling/live-metric-audit.mjs                       # default: https://factory-ux.pages.dev
//   BASE=http://127.0.0.1:4757 node tooling/live-metric-audit.mjs   # rehearsal against a local serve

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VRDIR = path.join(HERE, "visual-regression");
const require = createRequire(`${VRDIR}${path.sep}`);
const pw = require("@playwright/test");

const BASE = process.env.BASE || "https://factory-ux.pages.dev";

const ROUTES = {
  tookOver: "/factory/took-over",
  exported: "/factory/exported",
  linkCopied: "/factory/link-copied",
};
const VIRTUAL = new Set(Object.values(ROUTES));

// --- the stale-deploy guard ----------------------------------------------------------------------
// A 200 on a studio-only module is the discriminator: the pre-studio deploy serves the page shell
// fine and 404s exactly here, so every assertion below would be about a site the epic never shipped.
{
  const probe = `${BASE}/system/studio-keep.mjs`;
  const status = await fetch(probe).then((r) => r.status).catch(() => 0);
  if (status !== 200) {
    console.error(`live-metric-audit: ${probe} → ${status || "unreachable"} — the live deploy is stale (it predates the studio). Deploy current main first:\n  npx wrangler pages deploy . --project-name factory-ux --branch main`);
    process.exit(1);
  }
  console.log(`guard ✓  ${probe} → 200 (the host serves the studio)`);
}

let passes = 0;
let fails = 0;
const t = (name, cond, extra = "") => {
  if (cond) { passes += 1; console.log(`  ✓ ${name}`); }
  else { fails += 1; console.log(`  ✗ ${name}  ${extra}`); }
};

// Both history writers recorded, in order, before any module evaluates — the push is the event and
// the replace is its restore, and the ?b= settledUrl write is a replace too, so one log holds the
// whole contract: flip, restore, and the real URL the copy click promised was in the bar first.
const NAV_HOOK = () => {
  window.__nav = [];
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  history.pushState = (s, ti, u) => { window.__nav.push({ kind: "push", url: String(u) }); return push(s, ti, u); };
  history.replaceState = (s, ti, u) => { window.__nav.push({ kind: "replace", url: String(u) }); return replace(s, ti, u); };
};

const nav = (p) => p.evaluate(() => window.__nav.slice());
const pushesOf = (log, route) => log.filter((n) => n.kind === "push" && n.url === route);
const realPath = (pathname) => pathname === "/factory" || pathname === "/factory.html";

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });

// Any hit on the beacon host means BEACON_TOKEN stopped being empty — worth failing loudly on,
// because "recording is launch-gated" is a published capability claim.
let beaconHits = 0;
ctx.on("request", (r) => { if (r.url().includes("cloudflareinsights.com")) beaconHits += 1; });

console.log(`\nlive-metric-audit — ${BASE} (chromium)\n`);

// --- 1 · the take-over, mid-replay ---------------------------------------------------------------
// A fresh page, one pointer press on the stage while the run is still playing — the visitor path,
// the success path, and the only one the route may fire from (a settled or failed replay proves
// the wrong thing; studio-journey owns those negatives on the local tree).
{
  const p = await ctx.newPage();
  await p.addInitScript(NAV_HOOK);
  await p.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p.waitForSelector("[data-studio-canvas] .stx-slot", { timeout: 45000 });
  const stateAtClick = await p.getAttribute("[data-studio]", "data-replay");
  t("the click lands MID-REPLAY, not on a settled page", stateAtClick !== "settled", `data-replay=${stateAtClick}`);
  await p.locator("[data-studio-canvas] .stx-slot").first().click();
  await p.waitForTimeout(600);
  const log1 = await nav(p);
  t(`${ROUTES.tookOver} fires exactly once, from the handover`, pushesOf(log1, ROUTES.tookOver).length === 1, JSON.stringify(log1));
  t("…as a bare static literal — no query, no fragment, no board",
    log1.filter((n) => n.kind === "push").every((n) => !/[?#]/.test(n.url)), JSON.stringify(log1));
  t("…from the SUCCESS path — provenance visibly shifted to the visitor",
    (await p.getAttribute("[data-studio]", "data-provenance")) === "visitor");
  t("…and the reader's real URL comes back after the flip",
    realPath(new URL(p.url()).pathname), p.url());
  await p.locator("[data-studio-canvas] .stx-slot").first().click();
  await p.keyboard.press("ArrowRight");
  await p.waitForTimeout(400);
  const log1b = await nav(p);
  t("the handover is one-shot — a second interaction pushes no second route",
    pushesOf(log1b, ROUTES.tookOver).length === 1, JSON.stringify(log1b));
  t("no other virtual route fired on this page",
    log1b.filter((n) => n.kind === "push").every((n) => n.url === ROUTES.tookOver), JSON.stringify(log1b));
  await p.close();
}

// --- 2 · the keep rail: export, then the share link ---------------------------------------------
// A second fresh page, settled — the export needs the board the replay built. Each button twice:
// the download must hand over both times (keeping is never punished) while the route fires once.
{
  const p = await ctx.newPage();
  await p.addInitScript(NAV_HOOK);
  await p.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p.waitForSelector('[data-studio-keep="ready"]', { timeout: 45000 });
  await p.waitForSelector('[data-replay="settled"]', { timeout: 45000 });

  const [dl1] = await Promise.all([
    p.waitForEvent("download", { timeout: 45000 }),
    p.locator("[data-keep-export] button").click(),
  ]);
  await p.waitForTimeout(600);
  const afterExport = await nav(p);
  t("the export hands a real file over", dl1.suggestedFilename() === "prototype.html", dl1.suggestedFilename());
  t(`${ROUTES.exported} fires exactly once, after the blob click`, pushesOf(afterExport, ROUTES.exported).length === 1, JSON.stringify(afterExport));

  const [dl2] = await Promise.all([
    p.waitForEvent("download", { timeout: 45000 }),
    p.locator("[data-keep-export] button").click(),
  ]);
  await p.waitForTimeout(400);
  t("a second export still downloads — and pushes nothing more",
    dl2.suggestedFilename() === "prototype.html" && pushesOf(await nav(p), ROUTES.exported).length === 1);

  await p.locator("[data-keep-share] button").click();
  await p.waitForTimeout(600);
  const afterShare = await nav(p);
  t(`${ROUTES.linkCopied} fires exactly once, clipboard or fallback`, pushesOf(afterShare, ROUTES.linkCopied).length === 1, JSON.stringify(afterShare));
  // The caller contract (analytics.mjs, above trackFactoryLinkCopied): the ?b= link is IN THE BAR
  // before the tracker is called, or the 50 ms window rewrites location out from under the code
  // still assembling it. In the log that reads as: a ?b=-carrying write strictly before the push.
  const bIdx = afterShare.findIndex((n) => n.url.includes("?b="));
  const routeIdx = afterShare.findIndex((n) => n.kind === "push" && n.url === ROUTES.linkCopied);
  t("…and the ?b= link was in the address bar BEFORE the flip (the settledUrl contract)",
    bIdx !== -1 && routeIdx !== -1 && bIdx < routeIdx, `?b= at ${bIdx}, route at ${routeIdx}`);

  await p.locator("[data-keep-share] button").click();
  await p.waitForTimeout(600);
  const final = await nav(p);
  t("a second copy pushes nothing more", pushesOf(final, ROUTES.linkCopied).length === 1);
  t("every push on this page was one of the two keep routes",
    final.filter((n) => n.kind === "push").every((n) => VIRTUAL.has(n.url)), JSON.stringify(final));
  const end = new URL(p.url());
  t("the reader ends on the real URL, ?b= intact — every flip was restored",
    realPath(end.pathname) && end.search.includes("b="), p.url());
  await p.close();
}

// --- 3 · the export that CANNOT assemble does not count ------------------------------------------
// The metric's one forbidden direction (#75's lesson): a failed keep must never be recorded as a
// keep. Driven by blocking the vocabulary fetch on the MAIN frame only — the embedded proto frames
// fetch the same file and are not the subject. The full failure-path behaviour (the honest card,
// the absent download) is group 10's and studio-journey's; the claim here is only the route's.
{
  const p = await ctx.newPage();
  await p.addInitScript(NAV_HOOK);
  await p.route("**/vocabulary.json", (route) => {
    if (route.request().frame() === p.mainFrame()) route.abort();
    else route.continue();
  });
  await p.goto(`${BASE}/factory.html`, { waitUntil: "load" });
  await p.waitForSelector('[data-studio-keep="ready"]', { timeout: 45000 });
  await p.waitForSelector('[data-replay="settled"]', { timeout: 45000 });
  await p.locator("[data-keep-export] button").click();
  await p.waitForTimeout(1500);
  t(`an export that cannot assemble fires NO ${ROUTES.exported}`,
    pushesOf(await nav(p), ROUTES.exported).length === 0, JSON.stringify(await nav(p)));
  await p.close();
}

t("the beacon stayed dark — zero requests to cloudflareinsights.com (recording is launch-gated)",
  beaconHits === 0, `${beaconHits} hits`);

await browser.close();

console.log(`\nlive-metric-audit: ${passes} passed, ${fails} failed — ${BASE}`);
process.exit(fails ? 1 : 0);
