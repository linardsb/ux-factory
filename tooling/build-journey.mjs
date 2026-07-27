// tooling/build-journey.mjs — the committed cross-engine journey driver for /build (epic #134,
// ticket #138; .claude/plans/build-links-in-and-gates.md).
//
// tooling/build-checks.mjs is the PURE gate: it imports the shipped modules and never opens a
// browser. This is the other half — it drives the real page in a real engine, end to end, three
// times over: Chromium, Firefox and WebKit. /build is ten view-time modules and ~1,300 lines of
// behaviour, and #137 proved it with a scratch script that ran in Chromium only and was deleted.
// A run nobody can repeat is not evidence, so this one is committed and it is portable.
//
// Playwright is NOT a repo dependency and must never become one — shipped pages are vanilla, and
// the two dependency-carrying tools stay isolated (CLAUDE.md ground rules). It is resolved out of
// tooling/visual-regression/node_modules at 1.61.1, the exact version CI's `visual` job pins, so
// this driver and the pixel gate always agree about which browser build "chromium" means.
//
// Deliberately NOT registered in verify.yml (owner's call, #138): CI already runs build-checks and
// the pixel gate, and three engine downloads per PR buys less than it costs. It is an operator step,
// re-runnable by anyone, and its result belongs in the ticket's report.
//
// Run it:
//   node tooling/visual-regression/serve.mjs &        # repo root on 127.0.0.1:4757
//   node tooling/build-journey.mjs [chromium|firefox|webkit|all]      # default: all
//
// Output grammar follows tooling/build-checks.mjs: one ✓/✗ line per assertion, a per-engine
// summary, exit 1 if ANY engine fails ANY assertion or logs a page error. Where an engine genuinely
// cannot do a thing (clipboard permissions differ across the three), the DOCUMENTED FALLBACK is
// asserted rather than the assertion being skipped — a check that cannot fail is not a check.
// Every skip is logged with its reason.

import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VRDIR = path.join(HERE, "visual-regression");
// createRequire needs a FILE or a dir with a trailing separator to resolve from; the package name
// then resolves through tooling/visual-regression/node_modules rather than the repo root, which
// has no node_modules at all and must keep it that way.
const require = createRequire(`${VRDIR}${path.sep}`);
const pw = require("@playwright/test");

const BASE = process.env.BASE || "http://127.0.0.1:4757";
const ENGINES = ["chromium", "firefox", "webkit"];
const requested = (process.argv[2] || "all").toLowerCase();
const toRun = requested === "all" ? ENGINES : [requested];
if (toRun.some((e) => !ENGINES.includes(e))) {
  console.error(`build-journey: unknown engine "${requested}" — expected one of ${ENGINES.join(", ")}, or all`);
  process.exit(1);
}

// The hostile payload in check 9 is hand-built the way an attacker would build it, which means this
// process needs the real question list. Resolved from THIS file, never an absolute path.
const { QUESTIONS } = await import(new URL("../system/build-questions.mjs", import.meta.url));
const { LABEL_MAX } = await import(new URL("../system/breadboard.mjs", import.meta.url));
const MAX_EXPORT_MB = 32; // system/build-import.mjs:53 — asserted against the refusal's own wording

async function journey(engineName) {
  const results = { engine: engineName, fails: 0, passes: 0, skips: [] };
  const t = (name, cond, extra = "") => {
    if (cond) { results.passes += 1; console.log(`  ✓ ${name}`); }
    else { results.fails += 1; console.log(`  ✗ ${name} ${extra}`); }
  };
  const skip = (name, why) => { results.skips.push(`${name} — ${why}`); console.log(`  ~ SKIPPED ${name} — ${why}`); };

  const browser = await pw[engineName].launch();
  const errors = [];
  async function newPage(ctx) {
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
    return p;
  }
  // The pattern stage is behind an IntersectionObserver (rootMargin 800px), so it only renders once
  // Act 4 has been near the viewport. Every page that asserts on the stage goes through here.
  // Every module on this page hides things with the `hidden` property, which is only a UA rule — an
  // author `display` on the same element beats it and the attribute quietly stops working. Two of
  // the keep rail's three tiers were in exactly that state before #138. Asserted as an invariant
  // over the WHOLE page in several states rather than element by element, because the next display
  // rule someone adds is the one a hand-listed check would miss.
  const renderedButHidden = (p) => p.evaluate(() => [...document.querySelectorAll("[hidden]")]
    .filter((e) => getComputedStyle(e).display !== "none")
    .map((e) => `${e.tagName}.${e.className || "(no class)"} display=${getComputedStyle(e).display}`));
  const settle = async (p) => {
    await p.waitForSelector("[data-build-keep='ready']");
    await p.evaluate(() => document.getElementById("act-pattern").scrollIntoView());
    await p.waitForSelector("[data-pattern-stage='ready']", { timeout: 15000 });
  };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await newPage(ctx);

  console.log("\n[1] load + settled handles");
  const t0 = Date.now();
  await page.goto(`${BASE}/build.html`, { waitUntil: "load" });
  for (const sel of [
    "[data-build-import='ready']",
    "[data-build-verdict='ready']",
    "[data-breadboard='ready']",
    "[data-build-keep='ready']",
  ]) await page.waitForSelector(sel, { timeout: 15000 });
  await page.evaluate(() => document.getElementById("act-pattern").scrollIntoView());
  await page.waitForSelector("[data-pattern-stage='ready']", { timeout: 15000 });
  const wizards = await page.$$eval("[data-build-questions='ready']", (n) => n.length);
  t("both wizards ready", wizards === 2, `got ${wizards}`);
  console.log("  ✓ five settled-state handles present");
  const hiddenAtRest = await renderedButHidden(page);
  t("at rest, nothing carrying [hidden] is rendering", hiddenAtRest.length === 0, hiddenAtRest.join(" | "));

  console.log("\n[2] the default build renders a dashboard of real components");
  await page.waitForSelector("[data-pattern-stage] .ds-metric-tile", { timeout: 15000 });
  const tiles = await page.$$eval("[data-pattern-stage] .ds-metric-tile", (n) => n.length);
  t("metric-tiles rendered", tiles === 3, `got ${tiles}`);
  t("counted-not-invented line on stage",
    (await page.textContent("[data-pattern-stage]")).includes("counted from your breadboard"));
  // EDGE (#138) · the accept-all-defaults speedrun. A reader who touches nothing must still reach a
  // rendered pattern, and reach it fast — every question ships answered for exactly this reason.
  const speedrun = Date.now() - t0;
  t(`accept-all-defaults reaches a rendered pattern in ${(speedrun / 1000).toFixed(1)}s (≤ 60s)`, speedrun <= 60000);

  console.log("\n[3] shape → worklist through the REAL wizard renders a queue");
  const shaping = page.locator("[data-act='shaping']");
  await shaping.getByRole("button", { name: "Next" }).click();          // appetite → shape
  await shaping.locator("input[name='bx-q-shape'][value='worklist']").check();
  await page.waitForSelector("[data-pattern-stage] .ds-list-row", { timeout: 15000 });
  const rows = await page.$$eval("[data-pattern-stage] .ds-list-row", (n) => n.length);
  t("list-rows rendered", rows > 0, `got ${rows}`);
  t("no metric-tiles left", (await page.$$("[data-pattern-stage] .ds-metric-tile")).length === 0);

  console.log("\n[4] shape → stream lands on the honest out-of-library card");
  await page.evaluate(() => import("/system/build-questions.mjs").then((m) => m.setAnswers({ shape: "stream" })));
  await page.waitForFunction(() => document.querySelector("[data-pattern-stage]").textContent.includes("not in the library") ||
    document.querySelector("[data-pattern-stage]").textContent.includes("doesn't have its components"));
  const outText = await page.textContent("[data-pattern-stage]");
  t("names the pattern", outText.includes("Feed"));
  t("says what it would need", outText.includes("post component"));
  t("renders no fake components", (await page.$$("[data-pattern-stage] .ds-metric-tile, [data-pattern-stage] .ds-list-row")).length === 0);
  t("shows the breadboard instead", (await page.$$("[data-pattern-stage] svg")).length === 1);

  console.log("\n[5] editing the board re-renders the stage");
  await page.evaluate(() => import("/system/build-questions.mjs").then((m) => m.setAnswers({ shape: "overview" })));
  await page.waitForSelector("[data-pattern-stage] .ds-metric-tile");
  const before = await page.textContent("[data-pattern-stage]");
  const firstName = page.locator("[data-place='p1'] .bx-bb-name");
  await firstName.fill("Mission control");
  await firstName.blur();
  await page.locator("[data-place='p1'] .bx-bb-add-aff").click();
  await page.waitForFunction(() => document.querySelector("[data-pattern-stage]").textContent.includes("Mission control"));
  t("stage picked up the rename", (await page.textContent("[data-pattern-stage]")) !== before);
  // The UI half of the LABEL_MAX cap (#144 finding 13, landed in #137). Asserted against the real
  // exported constant, never the literal 60 — a cap that agrees with a number typed in a test is
  // two numbers, not one.
  t(`rename input is capped at LABEL_MAX (${LABEL_MAX})`,
    (await firstName.getAttribute("maxlength")) === String(LABEL_MAX));

  console.log("\n[6] the share link, opened in a fresh context");
  // Give the build a real design first, so the link carries token VALUES and not just a board.
  await page.locator("[data-build-color]").fill("#c2410c");
  await page.locator("[data-build-derive]").click();
  await page.waitForFunction(() => document.getElementById("build-stage").style.length > 0);
  t("the derive dressed BOTH stages", await page.evaluate(() =>
    document.querySelectorAll("[data-build-stage]").length === 2 &&
    [...document.querySelectorAll("[data-build-stage]")].every((n) => n.style.length > 0)));
  await page.getByRole("button", { name: /Copy the link/ }).click();
  await page.waitForFunction(() => location.search.includes("b="));
  const shared = page.url();
  t("the link is in the address bar", shared.includes("?b=") || shared.includes("&b="));
  t("the link is a sane length", shared.length < 4000, `${shared.length} chars`);
  // ENGINE DIFFERENCE, asserted rather than skipped: clipboard-write is permissioned and the three
  // engines answer differently. build-keep.mjs:231-238 promises exactly two outcomes and puts the URL
  // in the address bar BEFORE it tries the clipboard, so the round-trip below never depends on this.
  // Whichever branch ran, the visitor must be told something true and must be able to get the link.
  const provenance = (await page.textContent("[data-build-keep]")) || "";
  const copied = provenance.includes("Link copied");
  const refused = provenance.includes("did not allow the copy");
  t(`the copy states its real outcome (${copied ? "clipboard granted" : refused ? "clipboard refused → field fallback" : "NEITHER"})`,
    copied || refused, provenance.slice(0, 120));
  t("either way the link is on screen to take",
    await page.locator(".bx-keep-link").isVisible() && (await page.locator(".bx-keep-link").inputValue()).includes("b="));

  // The BUILD, not the sender's provenance: build-share.mjs deliberately leaves pack.label and
  // pack.note out of the wire, because replaying them would have the receiving page state that it
  // read a file it never saw. Token values and slug DO travel and are compared here.
  const snapshot = (p) => p.evaluate(() => import("/system/build-questions.mjs").then((m) => {
    const s = m.readBuild();
    return JSON.stringify({
      answers: s.answers, board: s.board, edited: s.boardIsEdited,
      tokens: s.pack && s.pack.tokens, slug: s.pack && s.pack.slug,
    });
  }));
  const sentState = await snapshot(page);

  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page2 = await newPage(ctx2);
  await page2.goto(shared, { waitUntil: "load" });
  await settle(page2);
  const gotState = await snapshot(page2);
  t("the whole build deep-equals in a fresh browser", gotState === sentState, `\n    sent: ${sentState.slice(0, 120)}\n    got:  ${gotState.slice(0, 120)}`);
  t("the sender's provenance did NOT travel", await page2.evaluate(() =>
    import("/system/build-questions.mjs").then((m) => m.readBuild().pack.note === null)));
  const names = (p) => p.$$eval("[data-breadboard] .bx-bb-name", (n) => n.map((i) => i.value));
  t("the restored board carries the rename", (await names(page2)).includes("Mission control"));
  t("the restore says where it came from",
    (await page2.textContent("[data-build-keep]")).includes("rebuilt it from the URL"));
  t("the pattern re-renders from the restored board",
    (await page2.$$("[data-pattern-stage] .ds-metric-tile")).length > 0);
  t("the restored design is on BOTH stages", await page2.evaluate(() =>
    [...document.querySelectorAll("[data-build-stage]")].every((n) => n.style.length > 0)));
  t("the restored accent survived the round trip", await page2.evaluate(() =>
    document.getElementById("build-stage").style.getPropertyValue("--color-accent").trim().length > 0));
  // The finding the advisor caught on #137: a link that carries a design must not print "No design
  // imported yet" beside a stage that is visibly wearing one.
  const designRow = await page2.textContent("#build-keep");
  t("the design row does not contradict the stage", !designRow.includes("No design imported yet"), designRow.trim().slice(0, 90));
  t("the design row says why there is no stylesheet", designRow.includes("stylesheet itself is not in the link"));

  console.log("\n[7] the appearance dock no longer eats the query string");
  await page2.evaluate(() => { location.hash = "appearance"; });
  await page2.waitForTimeout(250);
  await page2.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await page2.waitForTimeout(250);
  t("?b= survives opening and closing #appearance", page2.url().includes("b="), page2.url());
  // EDGE (#138) · the dock opened MID-FLOW, not after the build settled. dock.mjs:447 carries
  // location.search through pushState; WebKit's history behaviour is the likeliest place that
  // assumption breaks, so the build state itself is re-read afterwards, not just the URL.
  t("the whole build state survives the dock too", (await snapshot(page2)) === sentState);
  t("the pattern is still on the stage after the dock",
    (await page2.$$("[data-pattern-stage] .ds-metric-tile")).length > 0);

  const home = await newPage(ctx2);
  await home.goto(`${BASE}/index.html?brand=2563eb`, { waitUntil: "domcontentloaded" });
  await home.evaluate(() => { location.hash = "appearance"; });
  await home.waitForTimeout(250);
  await home.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await home.waitForTimeout(250);
  t("?brand= survives on home too", home.url().includes("brand=2563eb"), home.url());
  await home.close();

  console.log("\n[8] every download produces a non-empty file");
  for (const label of [/build-card\.svg/, /breadboard\.svg/, /breadboard\.json/, /pattern-spec\.md/]) {
    const [dl] = await Promise.all([
      page2.waitForEvent("download"),
      page2.getByRole("button", { name: label }).click(),
    ]);
    const file = await dl.path();
    const size = fs.statSync(file).size;
    t(`${dl.suggestedFilename()} · ${size} bytes`, size > 100);
    if (dl.suggestedFilename() === "pattern-spec.md") {
      const md = fs.readFileSync(file, "utf8");
      t("  spec carries the ten method terms", md.includes("Internal trigger") && md.includes("Appetite"));
      t("  spec carries both ethics gates", md.includes("Manipulation Matrix") && md.includes("Frequency filter"));
      t("  spec quotes the rule that fired", md.includes("named by this rule"));
      t("  spec names the components used", md.includes("`metric-tile`"));
      t("  spec separates the two claims", md.includes("are not the same claim"));
    }
  }

  console.log("\n[9] MITIGATION · a tampered link applies zero styles and says so");
  // encodeBuild SANITISES (it runs the same vetTokens allowlist), so this page cannot PRODUCE a
  // hostile link. The payload therefore has to be hand-built, the way an attacker would build it,
  // which is what proves the DECODER is the thing refusing it.
  const hostile = {
    v: 1,
    a: Object.fromEntries(QUESTIONS.map((q) => [q.id, q.default])),
    b: { p: [["p1", "Overview", [["p1a1", "Filter"]]], ["p2", "Progress", []]], c: [["p1a1", "p2"]] },
    e: 0,
    k: { "--color-accent": "red;x{y:z}" },
  };
  const hostileBytes = new TextEncoder().encode(JSON.stringify(hostile));
  const framed = new Uint8Array(hostileBytes.length + 1);
  framed.set(hostileBytes, 1); // leading 0x00 = uncompressed
  const bad = Buffer.from(framed).toString("base64url");

  const page3 = await newPage(ctx2);
  await page3.goto(`${BASE}/build.html?b=${bad}`, { waitUntil: "load" });
  await page3.waitForSelector("[data-build-keep='ready']");
  t("the refusal is visible", (await page3.textContent("[data-build-keep]")).includes("could not be read"));
  t("zero styles reached the stage", await page3.evaluate(() => document.getElementById("build-stage").style.length) === 0);
  t("the bad param is scrubbed from the URL", !page3.url().includes("b="), page3.url());
  await page3.close();

  console.log("\n[10] MITIGATION · a hostile label cannot escape the downloaded SVG");
  await page2.locator("[data-place='p1'] .bx-bb-name").fill("</text><script>alert(1)</script>");
  await page2.locator("[data-place='p1'] .bx-bb-name").blur();
  await page2.waitForTimeout(400);
  const [svgDl] = await Promise.all([
    page2.waitForEvent("download"),
    page2.getByRole("button", { name: /breadboard\.svg/ }).click(),
  ]);
  const svgText = fs.readFileSync(await svgDl.path(), "utf8");
  t("no <script in the downloaded SVG", !svgText.includes("<script"));
  t("escaped exactly once", (svgText.match(/&lt;script&gt;/g) || []).length === 1);

  console.log("\n[11] MITIGATION · restore order independence (build-keep.mjs tag moved to the top)");
  const reordered = await newPage(ctx2);
  await reordered.route("**/build.html*", async (route) => {
    const res = await route.fetch();
    let html = await res.text();
    html = html.replace(/\n\s*<script type="module" src="\/system\/build-keep\.mjs"><\/script>/, "");
    html = html.replace('<script type="module" src="/system/build-import.mjs"></script>',
      '<script type="module" src="/system/build-keep.mjs"></script>\n  <script type="module" src="/system/build-import.mjs"></script>');
    await route.fulfill({ response: res, body: html });
  });
  await reordered.goto(shared, { waitUntil: "load" });
  await settle(reordered);
  t("the restore still lands with the tag first", (await snapshot(reordered)) === sentState);
  t("the breadboard still adopted it", (await names(reordered)).includes("Mission control"));
  await reordered.close();

  // ---- the #138 edge battery -------------------------------------------------------------------

  console.log("\n[12] EDGE · the skip-import path — a palette with no file at all");
  const noFile = await newPage(ctx2);
  await noFile.goto(`${BASE}/build.html`, { waitUntil: "load" });
  await noFile.waitForSelector("[data-build-import='ready']");
  t("the stage starts undressed", await noFile.evaluate(() => document.getElementById("build-stage").style.length === 0));
  await noFile.locator("[data-build-color]").fill("#0f766e");
  await noFile.locator("[data-build-derive]").click();
  await noFile.waitForFunction(() => document.getElementById("build-stage").style.length > 0);
  t("derive-a-palette re-skins the stage with no file uploaded", await noFile.evaluate(() =>
    document.getElementById("build-stage").style.getPropertyValue("--color-accent").trim().length > 0));
  await noFile.evaluate(() => document.getElementById("act-pattern").scrollIntoView());
  await noFile.waitForSelector("[data-pattern-stage='ready']", { timeout: 15000 });
  t("the pattern stage wears it too", await noFile.evaluate(() =>
    [...document.querySelectorAll("[data-build-stage]")].every((n) => n.style.length > 0)));
  // "Clear the stage" is the documented way back, and it must clear BOTH stages, not just Act 0's.
  await noFile.locator("[data-build-reset]").click();
  await noFile.waitForFunction(() => document.getElementById("build-stage").style.length === 0);
  t("clear the stage undresses both stages", await noFile.evaluate(() =>
    [...document.querySelectorAll("[data-build-stage]")].every((n) => n.style.length === 0)));

  console.log("\n[13] EDGE · the 'dealer' quadrant renders the matrix copy verbatim");
  // improvesLives:no + wouldUseIt:no is the one quadrant the matrix exists to warn about. Asserted
  // against QUADRANT_MEANINGS' own string, so a reworded matrix fails here rather than drifting.
  const dealerText = await noFile.evaluate(() => import("/system/build-questions.mjs").then((m) => {
    m.setAnswers({ improvesLives: "no", wouldUseIt: "no" });
    return m.QUADRANT_MEANINGS.dealer;
  }));
  await noFile.waitForFunction(() => document.querySelector("[data-build-verdict]").textContent.toLowerCase().includes("dealer"));
  const verdictText = await noFile.textContent("[data-build-verdict]");
  t("the panel names the dealer quadrant", /dealer/i.test(verdictText));
  t("the panel quotes the matrix meaning verbatim", verdictText.includes(dealerText), `expected: ${dealerText}`);
  t("the verdict does not soften it", verdictText.includes("Don't"));

  console.log("\n[14] EDGE · a board emptied to zero places refuses to invent a pattern");
  const empty = await newPage(ctx2);
  await empty.goto(`${BASE}/build.html`, { waitUntil: "load" });
  await settle(empty);
  // The control. Without it, "no buttons are visible" would also pass on a typo'd selector, which is
  // the exact shape of the checks that keep getting through this repo's gates green and useless.
  const keepControlsBefore = await empty.locator("[data-build-keep] button:visible").count();
  t("the keep rail offers its controls while the board has places", keepControlsBefore > 0, `got ${keepControlsBefore}`);
  let guard = 0;
  while ((await empty.$$("[data-breadboard] .bx-bb-place")).length && guard++ < 12) {
    await empty.locator("[data-breadboard] .bx-bb-place .bx-bb-remove").first().click();
    await empty.waitForTimeout(120);
  }
  t("every place removed", (await empty.$$("[data-breadboard] .bx-bb-place")).length === 0);
  await empty.waitForFunction(() => document.querySelector("[data-pattern-stage]").textContent.includes("nothing here to arrange"));
  t("no pattern is rendered from an empty board",
    (await empty.$$("[data-pattern-stage] .ds-metric-tile, [data-pattern-stage] .ds-list-row")).length === 0);
  t("the stage says so in the rule's own words",
    (await empty.textContent("[data-pattern-stage]")).includes("nothing here to arrange"));
  // build-keep.mjs:259-262 hides exactly three tiers and shows the empty line. The provenance line
  // is deliberately NOT hidden — it is the live region, and tearing it out of the DOM would silence
  // the announcement it exists to carry — so this asserts the module's actual contract rather than
  // "everything else is gone", which is what a first pass of this check wrongly claimed.
  t("the keep rail shows its empty state", await empty.evaluate(() =>
    !document.querySelector("[data-keep-empty]").hidden));
  t("no card, no download and no share control is reachable from an empty board",
    (await empty.locator("[data-build-keep] button:visible").count()) === 0
    && (await empty.locator("[data-build-keep] .bx-keep-card svg:visible").count()) === 0);
  const hiddenWhenEmpty = await renderedButHidden(empty);
  t("emptied, nothing carrying [hidden] is rendering either", hiddenWhenEmpty.length === 0, hiddenWhenEmpty.join(" | "));
  await empty.close();

  console.log(`\n[15] EDGE · a ${MAX_EXPORT_MB + 1} MB export is refused in the browser, against the real cap`);
  const bigPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "build-journey-")), "huge-tokens.json");
  try {
    // Generated at runtime and deleted below — a 33 MB fixture is never committed.
    fs.writeFileSync(bigPath, `{"pad":"${"x".repeat((MAX_EXPORT_MB + 1) * 1024 * 1024)}"}`);
    const big = await newPage(ctx2);
    await big.goto(`${BASE}/build.html`, { waitUntil: "load" });
    await big.waitForSelector("[data-build-import='ready']");
    await big.locator("[data-build-file]").setInputFiles(bigPath);
    await big.waitForFunction(() => document.querySelector("[data-build-status]").dataset.state === "error", null, { timeout: 20000 });
    const refusal = await big.textContent("[data-build-status]");
    t("the over-cap file is refused", /over the .* cap/.test(refusal), refusal);
    t(`the refusal names the real ${MAX_EXPORT_MB} MB cap`, refusal.includes(`${MAX_EXPORT_MB}.0 MB`), refusal);
    t("nothing reached the stage", await big.evaluate(() => document.getElementById("build-stage").style.length === 0));
    await big.close();
  } finally {
    fs.rmSync(path.dirname(bigPath), { recursive: true, force: true });
  }

  console.log("\n[16] EDGE · the whole journey under prefers-reduced-motion");
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const rmPage = await newPage(rm);
  await rmPage.goto(`${BASE}/build.html`, { waitUntil: "load" });
  await settle(rmPage);
  t("reduced-motion: the page reaches a rendered pattern",
    (await rmPage.$$("[data-pattern-stage] .ds-metric-tile")).length === 3);
  await rmPage.locator("[data-place='p1'] .bx-bb-name").fill("Quiet motion");
  await rmPage.locator("[data-place='p1'] .bx-bb-name").blur();
  await rmPage.waitForFunction(() => document.querySelector("[data-pattern-stage]").textContent.includes("Quiet motion"));
  t("reduced-motion: an edit still re-renders the stage", true);
  await rmPage.locator("[data-build-color]").fill("#7c3aed");
  await rmPage.locator("[data-build-derive]").click();
  await rmPage.waitForFunction(() => document.getElementById("build-stage").style.length > 0);
  await rmPage.getByRole("button", { name: /Copy the link/ }).click();
  await rmPage.waitForFunction(() => location.search.includes("b="));
  const rmShared = rmPage.url();
  const rmSent = await snapshot(rmPage);
  const rmBack = await newPage(rm);
  await rmBack.goto(rmShared, { waitUntil: "load" });
  await settle(rmBack);
  t("reduced-motion: the share link still round-trips the whole build", (await snapshot(rmBack)) === rmSent);
  await rm.close();

  console.log("\n[17] EDGE · the links in — /build is reachable from the shipped IA");
  // The ticket's reason to exist. Asserted by CLICKING, not by reading the href: the links are
  // extensionless (/build), the way every in-page link on this site is, so "the href is right" and
  // "the link resolves" are two different claims and only the second one matters to a visitor.
  for (const [from, sel, where] of [
    ["/index.html", '.close-card a[href="/build"]', "the home close card"],
    ["/work.html", '#run a[href="/build"]', "the work proof index"],
  ]) {
    const linkPage = await newPage(ctx2);
    await linkPage.goto(BASE + from, { waitUntil: "load" });
    const link = linkPage.locator(sel);
    t(`${where} carries a visible link to /build`, await link.isVisible());
    await link.click();
    await linkPage.waitForLoadState("load");
    t(`${where} link lands on the builder`, new URL(linkPage.url()).pathname === "/build",
      linkPage.url());
    t(`${where} link lands on the real page, not a 404`,
      (await linkPage.title()).includes("The builder") && (await linkPage.locator("#act-import").count()) === 1);
    await linkPage.close();
  }
  // JS-off is the documented floor for both: close.mjs is additive, and neither link is JS-built.
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  for (const [from, sel, where] of [
    ["/index.html", '.close-card a[href="/build"]', "home"],
    ["/work.html", '#run a[href="/build"]', "work"],
  ]) {
    const p = await noJs.newPage();
    await p.goto(BASE + from, { waitUntil: "load" });
    await p.locator(sel).click();
    await p.waitForLoadState("load");
    t(`JS off · ${where} still links through to the builder`, new URL(p.url()).pathname === "/build", p.url());
    await p.close();
  }
  await noJs.close();

  console.log("\n[18] console cleanliness");
  // The mock Worker is not running for this driver and the site is designed to degrade to committed
  // fixtures when it is down, so its refusal is the EXPECTED path, not an error (memory:
  // headless-render-data-pages-worker-refused). Nothing else is forgiven.
  const real = errors.filter((e) => !/ERR_CONNECTION_REFUSED|NetworkError|favicon|Load failed|8787/.test(e));
  t("no console or page errors", real.length === 0, real.join(" | "));

  await browser.close();
  return results;
}

const all = [];
for (const engine of toRun) {
  console.log(`\n${"═".repeat(72)}\n  ${engine} — ${pw[engine].name()} · /build full journey\n${"═".repeat(72)}`);
  try {
    all.push(await journey(engine));
  } catch (err) {
    console.log(`\n  ✗ ${engine} threw before finishing: ${err.message}`);
    all.push({ engine, fails: 1, passes: 0, skips: [], threw: err.message });
  }
}

console.log(`\n${"═".repeat(72)}`);
let bad = 0;
for (const r of all) {
  bad += r.fails;
  const line = `build-journey ${r.engine.padEnd(9)} ${r.fails ? "✗" : "✓"}  ${r.passes} passed · ${r.fails} failed`
    + (r.skips.length ? ` · ${r.skips.length} skipped` : "");
  console.log(line);
  for (const s of r.skips) console.log(`    ~ ${s}`);
  if (r.threw) console.log(`    · threw: ${r.threw}`);
}
console.log(bad ? `\n✗ ${bad} assertion(s) failed across ${all.length} engine(s)` : `\n✓ full journey green on ${all.length} engine(s)`);
process.exit(bad ? 1 : 0);
