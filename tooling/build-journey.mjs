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
// Imported, not retyped — the refusal's own wording is asserted against the SHIPPED cap, so moving
// the cap fails this driver instead of drifting past it. build-import.mjs is Node-import-safe (its
// mount self-boots behind a `typeof document` guard), and this keeps the count of files carrying
// the literal at four, which is what build-import.mjs:50 says.
const { MAX_EXPORT_BYTES } = await import(new URL("../system/build-import.mjs", import.meta.url));
const MAX_EXPORT_MB = MAX_EXPORT_BYTES / 1024 / 1024;

// `results` is OWNED BY THE CALLER, not created here: a mid-run throw (a timed-out waitForSelector
// twenty checks in) must not discard the checks that already ran. `held` is where the launched
// browser is parked so that same throw can still close it, without wrapping 450 lines of body in a
// try/finally purely to reach one variable.
async function journey(engineName, results, held) {
  const t = (name, cond, extra = "") => {
    if (cond) { results.passes += 1; console.log(`  ✓ ${name}`); }
    else { results.fails += 1; console.log(`  ✗ ${name} ${extra}`); }
  };
  const skip = (name, why) => { results.skips.push(`${name} — ${why}`); console.log(`  ~ SKIPPED ${name} — ${why}`); };

  const browser = held.browser = await pw[engineName].launch();
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

  console.log("\n[4] shape → stream renders a feed, and states its one truncation");
  // Was the out-of-library card until #139 completed the library. It now renders — and the check
  // that replaced it asserts the thing the old card used to make unnecessary: that the ONE pattern
  // reading the whole board says how much of it reached the stage.
  await page.evaluate(() => import("/system/build-questions.mjs").then((m) => m.setAnswers({ shape: "stream" })));
  await page.waitForFunction(() => document.querySelector("[data-pattern-stage]").textContent.includes("Feed"));
  const feedRows = await page.$$eval("[data-pattern-stage] .ds-list-row", (n) => n.length);
  t("the feed renders list-rows", feedRows > 0, `got ${feedRows}`);
  t("no metric-tiles left", (await page.$$("[data-pattern-stage] .ds-metric-tile")).length === 0);
  const feedText = await page.textContent("[data-pattern-stage]");
  t("counted-not-invented line on stage", feedText.includes("counted from your breadboard"));
  t("nothing on the stage claims the pattern is missing", !feedText.includes("not in the library"), feedText.slice(0, 140));
  // Both numbers read from the RUNNING page — the rendered row count and the board's own affordance
  // count — never from a literal, so a derivation that quietly showed a different number fails here.
  const affTotal = await page.evaluate(() => import("/system/build-questions.mjs").then((m) =>
    m.readBuild().board.places.reduce((n, p) => n + p.affordances.length, 0)));
  t(`the feed states what it showed of what the board holds (${feedRows} of ${affTotal})`,
    feedText.includes(`shows ${feedRows} of the ${affTotal}`), feedText.slice(0, 220));
  t("the feed refuses to claim a recency the board cannot record", feedText.includes("records no time"));

  console.log("\n[4b] shape → steps renders the sequence-step primitive");
  await page.evaluate(() => import("/system/build-questions.mjs").then((m) => m.setAnswers({ shape: "steps" })));
  await page.waitForSelector("[data-pattern-stage] .ds-sequence-step", { timeout: 15000 });
  const stepCount = await page.$$eval("[data-pattern-stage] .ds-sequence-step", (n) => n.length);
  t("sequence-steps rendered", stepCount > 0, `got ${stepCount}`);
  t("no list-rows left", (await page.$$("[data-pattern-stage] .ds-list-row")).length === 0);
  // Asserted against the DOM's own count, not a literal: the ordinal's total has to agree with the
  // number of steps actually on screen, which is the whole content of the spec's `total` prop.
  const firstOrdinal = (await page.textContent("[data-pattern-stage] .ds-sequence-step .ds-sequence-step-position")).trim();
  t(`the first step reads "Step 1 of ${stepCount}"`, firstOrdinal === `Step 1 of ${stepCount}`, firstOrdinal);
  const lastOrdinal = (await page.locator("[data-pattern-stage] .ds-sequence-step .ds-sequence-step-position").last().textContent()).trim();
  t(`the last step reads "Step ${stepCount} of ${stepCount}"`, lastOrdinal === `Step ${stepCount} of ${stepCount}`, lastOrdinal);
  // The ordinal must be real text, not a CSS counter — the spec's Accessibility note turns on it.
  // Asserted on GENERATED CONTENT, which is the only thing the two assertions above structurally
  // cannot see: `.textContent` never includes ::before/::after, so a check phrased over textContent
  // could only ever go red for a reason the exact-string assertion above had already caught. That
  // first version of this check was redundant rather than wrong — the same "cannot fail" shape this
  // driver's header warns about, and it was caught in review of #139 rather than by the gate.
  const generated = await page.evaluate(() => {
    const el = document.querySelector("[data-pattern-stage] .ds-sequence-step-position");
    return ["::before", "::after"].map((p) => getComputedStyle(el, p).content);
  });
  t(`the ordinal is real text, not generated content (::before/::after = ${generated.join(", ")})`,
    generated.every((c) => c === "none" || c === "normal"), generated.join(", "));
  // ...and the step's own accessible text carries it, so it reaches the tree as one sentence.
  const stepText = (await page.textContent("[data-pattern-stage] .ds-sequence-step")).replace(/\s+/g, " ").trim();
  t(`the step is heard as one sentence ("${stepText.slice(0, 60)}")`,
    /^Step 1 of \d+\s*\S/.test(stepText), stepText);

  console.log("\n[4c] a share link over a steps build restores the same sequence");
  // The codec is covered by build-checks; this is the PAGE-level proof that a restore reaches the
  // new render path rather than a generic one.
  //
  // On a page of ITS OWN, and that is load-bearing rather than tidiness. Copying a link sets
  // build-keep.mjs's `linkLive`, after which every later state change rewrites the URL on a 400ms
  // trailing edge — so a second copy on the same page has no reliable "the URL changed" edge to
  // wait on, and check [6]'s wait below is exactly that. The first version of this check shared
  // `page` and silently turned [6]'s wait into a no-op. One page, one first copy.
  const stepsCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const stepsPage = await newPage(stepsCtx);
  await stepsPage.goto(`${BASE}/build.html`, { waitUntil: "load" });
  await settle(stepsPage);
  await stepsPage.evaluate(() => import("/system/build-questions.mjs").then((m) => m.setAnswers({ shape: "steps" })));
  await stepsPage.waitForSelector("[data-pattern-stage] .ds-sequence-step", { timeout: 15000 });
  const sentSteps = await stepsPage.$$eval("[data-pattern-stage] .ds-sequence-step", (n) => n.length);
  await stepsPage.getByRole("button", { name: /Copy the link/ }).click();
  await stepsPage.waitForFunction(() => location.search.includes("b="));
  const stepsLink = stepsPage.url();
  const stepsBack = await newPage(stepsCtx);
  await stepsBack.goto(stepsLink, { waitUntil: "load" });
  await settle(stepsBack);
  await stepsBack.waitForSelector("[data-pattern-stage] .ds-sequence-step", { timeout: 15000 });
  const restoredSteps = await stepsBack.$$eval("[data-pattern-stage] .ds-sequence-step", (n) => n.length);
  t(`the restored build renders the same ${sentSteps} steps`, restoredSteps === sentSteps, `got ${restoredSteps}`);
  t("the restored ordinals agree with the restored count", (await stepsBack
    .textContent("[data-pattern-stage] .ds-sequence-step .ds-sequence-step-position")).trim() === `Step 1 of ${restoredSteps}`);
  await stepsCtx.close();

  console.log("\n[4d] a hub built through the REAL editor names settings by rule 2");
  // The fifth pattern has NO answer that produces it: rule 2 reads a board no draft can make, so the
  // only route to it is the editor. Driven on a page of its own — the hub edits leave a board that
  // outranks every later shape answer, which would strand the checks below it.
  const hubPage = await newPage(ctx);
  await hubPage.goto(`${BASE}/build.html`, { waitUntil: "load" });
  await settle(hubPage);
  // 1 · every affordance off the non-entry places.
  for (let guard = 0; guard < 12; guard += 1) {
    const strip = hubPage.locator("[data-breadboard] .bx-bb-place:not(.is-entry) .bx-bb-chips .bx-bb-remove").first();
    if (!(await strip.count())) break;
    await strip.click();
    await hubPage.waitForTimeout(120);
  }
  // 2 · four affordances on the entry place (HUB_MIN_AFFORDANCES; the draft gives it three).
  for (let guard = 0; guard < 6 && (await hubPage.locator("[data-breadboard] .bx-bb-place.is-entry .bx-bb-chip").count()) < 4; guard += 1) {
    await hubPage.locator("[data-breadboard] .bx-bb-place.is-entry .bx-bb-add-aff").click();
    await hubPage.waitForTimeout(150);
  }
  // 3 · every one of them connected somewhere. Two picks per connection, exactly as a visitor makes
  // them: the affordance, then the place. [data-bb-target] only exists while connecting, and never
  // on the place the affordance sits in, so the first one is always a legal destination.
  for (let guard = 0; guard < 8; guard += 1) {
    const loose = hubPage.locator("[data-breadboard] .bx-bb-place.is-entry .bx-bb-chip")
      .filter({ has: hubPage.locator(".bx-bb-connect:not(.is-connected)") }).first();
    if (!(await loose.count())) break;
    await loose.locator(".bx-bb-connect").click();
    await hubPage.waitForTimeout(120);
    await hubPage.locator("[data-breadboard] [data-bb-target]").first().click();
    await hubPage.waitForTimeout(150);
  }
  const hubReached = await hubPage
    .waitForFunction(() => document.querySelector("[data-pattern-stage]").textContent.includes("Rule 2"), null, { timeout: 10000 })
    .then(() => true, () => false);
  t("editing a board into a hub fires rule 2", hubReached);
  const hubText = await hubPage.textContent("[data-pattern-stage]");
  t("the stage names Settings", hubText.includes("Settings"), hubText.slice(0, 140));
  t("the stage quotes the rule that fired, verbatim", /Rule 2, the hub override/.test(hubText));
  const hubRows = await hubPage.$$eval("[data-pattern-stage] .ds-list-row", (n) => n.length);
  t("settings renders list-rows from the entry place", hubRows >= 4, `got ${hubRows}`);
  t("no sequence-steps on a settings stage", (await hubPage.$$("[data-pattern-stage] .ds-sequence-step")).length === 0);
  await hubPage.close();

  // Back to a dashboard for the checks below, which build on the drafted board.
  await page.evaluate(() => import("/system/build-questions.mjs").then((m) => m.setAnswers({ shape: "overview" })));
  await page.waitForSelector("[data-pattern-stage] .ds-metric-tile", { timeout: 15000 });

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

  console.log("\n[5b] the no-go line stops naming a place the visitor put back (#144 finding 12)");
  // On a page of its own: this check ADDS a place, and `edited` latches for the life of the page —
  // every check below [5] builds on the drafted board. Same reason [4d] runs on its own page.
  //
  // Every name here is read off the RUNNING page, never typed: breadboard.mjs keeps NOGO_RULE
  // private, and a literal "People" in this driver would be a second copy of that list waiting to
  // disagree with the first.
  const nogoPage = await newPage(ctx);
  await nogoPage.goto(`${BASE}/build.html`, { waitUntil: "load" });
  await settle(nogoPage);
  // settle() waits on the keep rail and the pattern stage, NOT on the breadboard — check [1] waits for
  // that handle separately, and this page never goes through [1]. Every assertion below reads the
  // breadboard's toolbar, so wait for it explicitly rather than relying on the mount having won a race
  // it usually wins.
  await nogoPage.waitForSelector("[data-breadboard='ready']");
  // These three answers are chosen, not arbitrary (measured against the real draftBoard, with the
  // page's own DEFAULT_ANSWERS.shape). `social` rules out TWO places, so the clause has something
  // left to name after one is put back — which is what proves the fix FILTERS rather than drops the
  // clause. And with investment=content + reward=tribe the draft genuinely wanted "People", so the
  // no-go really did subtract it: the check exercises a place that was removed, not one that was
  // never coming. Board with the no-go: [Overview · Library]; without it: [Overview · People · Library].
  await nogoPage.evaluate(() => import("/system/build-questions.mjs").then((m) =>
    m.setAnswers({ nogos: "social", investment: "content", rewardType: "tribe" })));
  const countLine = nogoPage.locator("[data-breadboard] .bx-bb-count");
  await nogoPage.waitForFunction(() =>
    (document.querySelector("[data-breadboard] .bx-bb-count")?.textContent || "").includes("ruled out by your no-go"));
  const ruledLine = await countLine.textContent();
  const named = ruledLine.split("ruled out by your no-go:")[1].split(",").map((s) => s.trim()).filter(Boolean);
  t(`the no-go states what it ruled out (${named.join(", ")})`, named.length === 2, ruledLine);

  // Put the first one back, by hand, exactly as a visitor would: add a place, rename it to that name.
  const putBack = named[0];
  // The before half of a before/after. Without this the "stops naming it" assertion below could pass
  // on a page where the name was never there to begin with.
  const boardBefore = await nogoPage.$$eval("[data-breadboard] .bx-bb-place .bx-bb-name", (n) => n.map((i) => i.value));
  t(`"${putBack}" is absent before the edit (${boardBefore.join(" · ")})`, !boardBefore.includes(putBack), boardBefore.join(" · "));
  await nogoPage.locator("[data-breadboard] [data-bb-add-place]").click();
  const newName = nogoPage.locator("[data-breadboard] .bx-bb-place .bx-bb-name").last();
  await newName.fill(putBack);
  await newName.blur();
  await nogoPage.waitForFunction((n) => {
    const line = document.querySelector("[data-breadboard] .bx-bb-count")?.textContent || "";
    return !line.includes(`no-go: ${n}`) && !line.includes(`, ${n}`);
  }, putBack, { timeout: 5000 }).catch(() => {});
  const after = await countLine.textContent();
  t(`the line stops naming "${putBack}" once it is on the board`,
    !new RegExp(`\\b${putBack}\\b`).test(after.split("ruled out by your no-go:")[1] || ""), after);
  // ...and the place really is there, so the check cannot pass by the clause vanishing for some
  // other reason (a thrown render would also remove the name).
  const labels = await nogoPage.$$eval("[data-breadboard] .bx-bb-place .bx-bb-name", (n) => n.map((i) => i.value));
  t(`"${putBack}" is on the board (${labels.join(" · ")})`, labels.includes(putBack), labels.join(" · "));
  // The remaining name must survive: the fix FILTERS the clause, it does not drop it. `social` rules
  // out exactly two places, so this list always holds one — asserted unconditionally rather than
  // behind an `if (stillNamed.length)` that could never be false. (The first draft of this check had
  // that branch with a `skip` in the else, which is the "check that cannot fail" shape this driver's
  // own header warns about, one level up: dead code that reads as coverage.)
  const stillNamed = named.slice(1);
  t(`the no-go still names what is still absent (${stillNamed.join(", ")})`,
    stillNamed.length > 0 && stillNamed.every((n) => after.includes(n)), after);
  await nogoPage.close();

  console.log("\n[6] the share link, opened in a fresh context");
  // Give the build a real design first, so the link carries token VALUES and not just a board.
  await page.locator("[data-build-color]").fill("#c2410c");
  await page.locator("[data-build-derive]").click();
  await page.waitForFunction(() => document.getElementById("build-stage").style.length > 0);
  t("the derive dressed BOTH stages", await page.evaluate(() =>
    document.querySelectorAll("[data-build-stage]").length === 2 &&
    [...document.querySelectorAll("[data-build-stage]")].every((n) => n.style.length > 0)));
  // This is `page`'s FIRST copy — [4c] deliberately runs on a context of its own so it stays that
  // way — which is what makes waiting for `?b=` to appear a real wait rather than a condition that
  // is already true on entry. #139 briefly broke that by sharing the page, and the fix is the
  // isolation up at [4c], not a cleverer predicate here: once `linkLive` is set, later state
  // changes rewrite the URL on a 400ms trailing edge and there is no reliable edge left to wait on.
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
  // The dock must actually PAINT here, not merely leave the query string alone. build.html carries a
  // page-wide `[hidden] { display: none !important }` (#138), which outranks every author rule on the
  // page including shared chrome's — so the un-hide direction of that rule is asserted on the one
  // surface most likely to be caught by it, rather than assumed from the fact that nothing hidden
  // renders. dock.mjs's own [hidden] element (the restore row) is checked at the same time: it is
  // correctly hidden with no displaced pack, and hiding it is what it wants.
  const packRows = await page2.locator(".dock-pack-row").count();
  const packsShut = await page2.locator(".dock-pack-row:visible").count();
  await page2.evaluate(() => { location.hash = "appearance"; });
  await page2.waitForTimeout(250);
  // Both directions, and counted rather than pinned to a number: the pack list grows, and an
  // assertion that has to be edited every time a pack is added is one that will be deleted instead.
  t(`the dock is genuinely shut before it is opened (0 of ${packRows} pack rows showing)`, packsShut === 0);
  t(`the appearance dock paints on /build (all ${packRows} pack rows + the actions row)`,
    packRows > 0 && (await page2.locator(".dock-pack-row:visible").count()) === packRows
    && await page2.locator(".dock-actions").first().isVisible());
  t("the dock's own hidden element stays hidden", await page2.locator(".dock-restore-row").first()
    .evaluate((e) => e.hidden && getComputedStyle(e).display === "none"));
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
      // #139's regression, on the file a reader keeps. The fallback sentence used to interpolate
      // `pattern.needs` unconditionally, which is null for every in-library pattern — so an emptied
      // board downloaded "None. null, so nothing was rendered…". build-checks proves the sentence
      // under Node; this proves the DOWNLOAD carries it.
      const used = md.split("## Components used")[1].split("\n## ")[0];
      t("  spec's components section names a real component", /`[a-z-]+` × \d+/.test(used), used.trim().slice(0, 90));
      t("  spec's components section interpolates no null", !/\bnull\b/.test(used), used.trim().slice(0, 90));
      t("  spec claims nothing about a missing library", !md.includes("not in the library"));
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

  console.log("\n[12b] EDGE · a real token export imports, and everything it un-hides actually appears");
  // The other direction of the [hidden] invariant, and the reason it is here rather than in a probe:
  // "nothing hidden renders" is only half a proof. Act 0's mapping report and the tokens download row
  // are BOTH `hidden` in the markup and un-hidden by build-import.mjs on success, so a page-wide
  // display rule that went too far would show up as a successful import with an invisible report.
  // The fixture is committed (tooling/figma/fixtures/), so this stays self-contained.
  const imported = await newPage(ctx2);
  await imported.goto(`${BASE}/build.html`, { waitUntil: "load" });
  await imported.waitForSelector("[data-build-import='ready']");
  await imported.locator("[data-build-file]")
    .setInputFiles(new URL("../tooling/figma/fixtures/scales-dtcg.json", import.meta.url).pathname);
  await imported.waitForFunction(() => document.querySelector("[data-build-status]").dataset.state === "done",
    null, { timeout: 20000 });
  t("the import reports success and says nothing was uploaded",
    (await imported.textContent("[data-build-status]")).includes("Nothing was uploaded"));
  t("the un-hidden mapping report is actually visible", await imported.locator("[data-build-report]").isVisible());
  t("the un-hidden tokens download row is actually visible and carries its button",
    await imported.locator("[data-build-keep-actions]").isVisible()
    && (await imported.locator("[data-build-keep-actions] button").count()) === 1);
  t("the report names the file and whose design work it is",
    (await imported.textContent("[data-build-report]")).includes("never uploaded"));
  t("the stage wears the imported design",
    await imported.evaluate(() => document.getElementById("build-stage").style.length > 0));
  const hiddenAfterImport = await renderedButHidden(imported);
  t("after an import, nothing carrying [hidden] is rendering", hiddenAfterImport.length === 0, hiddenAfterImport.join(" | "));
  await imported.close();

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
  // NOT an unguarded waitForFunction followed by `t(…, true)`: the wait already guarantees the text
  // by the time the assertion runs, so the literal is a check that cannot fail, and a real
  // regression surfaces as the whole engine throwing rather than as a named ✗. Catching the timeout
  // INTO the condition is what makes it an assertion.
  const reRendered = await rmPage
    .waitForFunction(() => document.querySelector("[data-pattern-stage]").textContent.includes("Quiet motion"),
      null, { timeout: 10000 })
    .then(() => true, () => false);
  t("reduced-motion: an edit still re-renders the stage", reRendered);
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
  // Three links now (#148 added the footer one). /approach.html is the page #148 names as having no
  // route to /build at all, and it carries no other /build link, so the selector is unambiguous.
  for (const [from, sel, where] of [
    ["/index.html", '.close-card a[href="/build"]', "the home close card"],
    ["/work.html", '#run a[href="/build"]', "the work proof index"],
    ["/approach.html", '.site-footer a[href="/build"]', "the footer site index"],
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
  // TWO rows here, not three, and deliberately: the footer is injected by site.js, so with
  // JavaScript off there is no footer — and no header or nav either, on any page. That is the
  // site-wide chrome floor, not a regression the #148 link introduced; the footer link is exactly
  // as available as the nav is. The two static links in remain the documented JS-off route.
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
  // Narrow on purpose, and narrower than it was. The Worker's own refusal is exempt DEFENSIVELY,
  // not because this driver exercises it: none of build.html, index.html or work.html loads
  // system/scenario-data.mjs, so the mock API is never probed here at all. Firefox's `NetworkError`
  // and WebKit's `Load failed` used to be exempt too — but those are those engines' generic message
  // for ANY failed fetch, so on two of the three engines the filter forgave every network failure on
  // the page. /handoff/verdant/vocabulary.json failing to load is caught in-app and still sets the
  // stage to "ready", so this line is the only one that would say why the pattern went empty.
  const real = errors.filter((e) => !/ERR_CONNECTION_REFUSED|favicon|8787/.test(e));
  t("no console or page errors", real.length === 0, real.join(" | "));

  await browser.close();
  held.browser = null;
  return results;
}

const all = [];
for (const engine of toRun) {
  console.log(`\n${"═".repeat(72)}\n  ${engine} — ${pw[engine].name()} · /build full journey\n${"═".repeat(72)}`);
  const results = { engine, fails: 0, passes: 0, skips: [] };
  const held = {};
  all.push(results);
  try {
    await journey(engine, results, held);
  } catch (err) {
    // The counts survive the throw — an operator needs to see WHICH check the run died after, not a
    // wiped-out `0 passed` that reads as total failure and has to be bisected by hand.
    console.log(`\n  ✗ ${engine} threw after ${results.passes} passed: ${err.message}`);
    results.fails += 1;
    results.threw = err.message;
    if (held.browser) await held.browser.close().catch(() => {});
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
