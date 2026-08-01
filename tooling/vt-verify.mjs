// tooling/vt-verify.mjs — the committed cross-engine proof that /build's view-transition morphs
// are REAL (epic #164, ticket #171; .claude/plans/build-vt-morphs-171.md).
//
// tooling/build-journey.mjs drives /build end to end, but every one of its assertions is about an
// END STATE: the right pattern rendered, the right focus, the right URL. A morph that silently
// never opened would leave every one of those green, because system/morph.mjs is designed to fall
// through to a plain mutation whenever it cannot transition. "The page still works" is exactly what
// a broken morph looks like. So this driver asserts the thing the journey structurally cannot:
// that a transition was opened at all, and that it captured the ELEMENT-LEVEL groups we named
// rather than defaulting to a whole-viewport root crossfade.
//
// It works by wrapping document.startViewTransition before any module evaluates (addInitScript),
// counting calls, and reading document.getAnimations() once each transition is ready — the running
// ::view-transition-* pseudo animations are the engine's own record of which groups it built.
//
// What it pins, per engine:
//   · boot opens ZERO transitions            — the visual-regression gate never interacts, so this
//                                              is the property that makes the pixel gate safe (#171
//                                              spike finding; #172 must preserve it site-wide)
//   · each of the three families opens one   — wizard step · board verb · pattern identity change
//   · the names we wrote all RESOLVE          — bx-q-<act> · bb-place-<id> (one per place on the
//                                              board) · bx-pattern; resolving is the claim, not
//                                              attribution to a family — see HOOK below
//   · a rename opens NONE                    — the identity key holds, so typing never animates
//   · reduced motion opens NONE, and the interaction still completes
//
// Playwright is resolved out of tooling/visual-regression/node_modules exactly as build-journey
// does, and is never a repo dependency. Operator-run, not in CI, for the same reason as the
// journey: three engine downloads per PR buys less than it costs.
//
// Run it:
//   node tooling/visual-regression/serve.mjs &                  # repo root on 127.0.0.1:4757
//   node tooling/vt-verify.mjs [chromium|firefox|webkit|all]     # default: all

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(`${path.join(HERE, "visual-regression")}${path.sep}`);
const pw = require("@playwright/test");

const BASE = process.env.BASE || "http://127.0.0.1:4757";
const ENGINES = ["chromium", "firefox", "webkit"];
const requested = (process.argv[2] || "all").toLowerCase();
const toRun = requested === "all" ? ENGINES : [requested];
if (toRun.some((e) => !ENGINES.includes(e))) {
  console.error(`vt-verify: unknown engine "${requested}" — expected one of ${ENGINES.join(", ")}, or all`);
  process.exit(1);
}

// Installed before any page module runs, so the wrapper is in place for the very first call.
// Recording the group names from getAnimations() rather than asserting on a screenshot: the names
// are what the CSS targets, so a typo'd or duplicated name shows up here as a MISSING group, which
// is the failure mode worth catching (a duplicate name aborts the whole transition silently).
//
// WHAT A RECORDED NAME PROVES, AND WHAT IT DOES NOT (pr-189-review.md L1). getAnimations() returns
// the pseudo animations for EVERY named element the transition captured, not the ones the
// interaction was about — a wizard step's transition also reports bx-pattern, site-header and the
// rest, because they were all captured. So a name appearing here proves it RESOLVED — spelled as
// written, unique, and not silently aborted — and says nothing about which interaction caused it.
// The per-family claim is carried by `calls === 1`, which genuinely is per-interaction. The labels
// below say "resolves", not "is its own group", because that is the claim the data supports.
//
// Only ::view-transition-group( is collected. The first version stripped the pseudo KIND along with
// the parens (/^::view-transition-\w+\(/), so `old`, `new` and `image-pair` collapsed into the same
// name set and "a group ran" was never actually what was asserted.
const HOOK = () => {
  window.__vt = { calls: 0, groups: [], supported: typeof document.startViewTransition === "function" };
  if (!window.__vt.supported) return;
  const PREFIX = "::view-transition-group(";
  const orig = document.startViewTransition.bind(document);
  document.startViewTransition = (cb) => {
    window.__vt.calls += 1;
    const tr = orig(cb);
    tr.ready.then(() => {
      const names = document.getAnimations()
        .map((a) => a.effect && a.effect.pseudoElement)
        .filter((p) => p && p.startsWith(PREFIX))
        .map((p) => p.slice(PREFIX.length).replace(/\)$/, ""));
      window.__vt.groups.push(...new Set(names));
    }).catch(() => {});
    return tr;
  };
};

let failed = 0;
const t = (label, cond, detail = "") => {
  console.log(`  ${cond ? "✓" : "✗"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!cond) failed += 1;
};

const settle = async (p) => {
  await p.waitForSelector("[data-build-keep='ready']", { timeout: 20000 });
  await p.evaluate(() => document.getElementById("act-pattern").scrollIntoView());
  await p.waitForSelector("[data-pattern-stage='ready']", { timeout: 20000 });
};
const read = (p) => p.evaluate(() => window.__vt);
const reset = (p) => p.evaluate(() => { window.__vt.calls = 0; window.__vt.groups = []; });
// Scroll before clicking. Playwright's click() scrolls on its own, and a scroll landing in the same
// frame as the mutation is a needless source of noise in a driver whose whole subject is timing.
const clickAfterScroll = async (loc) => { await loc.scrollIntoViewIfNeeded(); await loc.click(); };

for (const name of toRun) {
  console.log(`\n════ ${name} ════`);
  const browser = await pw[name].launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(HOOK);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/build.html`, { waitUntil: "load" });
    await settle(page);

    const boot = await read(page);
    console.log(`  ${name} ${browser.version()}`);
    // If this engine lacks the API the rest is vacuous, so say so and stop rather than "pass".
    t("document.startViewTransition is supported", boot.supported);
    if (!boot.supported) { await ctx.close(); continue; }
    t("boot opens zero transitions — the property the pixel gate depends on", boot.calls === 0, `calls=${boot.calls}`);

    await reset(page);
    const wizard = page.locator("[data-act='hooked']");
    await wizard.scrollIntoViewIfNeeded();
    await wizard.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(700);
    const f1 = await read(page);
    t("family 1 · a wizard step opens one transition", f1.calls === 1, `calls=${f1.calls}`);
    t("family 1 · the step card's group name resolves", f1.groups.includes("bx-q-hooked"), f1.groups.join(" "));

    await reset(page);
    // Counted against the BOARD, not against `> 1` (pr-189-review.md L1): with four places on the
    // board, a partial naming failure that left two named still satisfied the old bound while the
    // label claimed "every place". Read BEFORE the verb, because "before" is the set that can
    // actually run a group animation — a place that exists only in the NEW state has nothing to
    // interpolate from, so no ::view-transition-group runs for it, and all three engines agree
    // (adding a 4th place reports p1·p2·p3; the next transition reports all four). Asserted as an
    // exact SET, so a renamed or dropped group fails even though the count would still match.
    const before = await page.evaluate(() =>
      [...document.querySelectorAll("[data-bb-places] .bx-bb-place")].map((p) => `bb-place-${p.dataset.place}`).sort());
    await clickAfterScroll(page.locator("[data-bb-add-place]"));
    await page.waitForTimeout(700);
    const f2 = await read(page);
    t("family 2 · a board verb opens one transition", f2.calls === 1, `calls=${f2.calls}`);
    const places = [...new Set(f2.groups.filter((g) => g.startsWith("bb-place-")))].sort();
    t(`family 2 · each of the ${before.length} places already on the board is its own group`,
      places.length === before.length && places.every((p, i) => p === before[i]),
      `named [${places.join(" ")}] vs on-board-before [${before.join(" ")}]`);

    await reset(page);
    await page.evaluate(() => import("/system/build-questions.mjs").then((m) => m.setAnswers({ shape: "stream" })));
    await page.waitForTimeout(900);
    const f3 = await read(page);
    t("family 3 · a pattern identity change opens one transition", f3.calls === 1, `calls=${f3.calls}`);
    t("family 3 · the pattern stage's group name resolves", f3.groups.includes("bx-pattern"), f3.groups.join(" "));

    // The negative half of family 3, and the reason the identity key exists at all.
    await reset(page);
    await page.locator("[data-place='p1'] .bx-bb-name").fill("Typed name");
    await page.locator("[data-place='p1'] .bx-bb-name").blur();
    await page.waitForTimeout(700);
    const rename = await read(page);
    t("a rename opens NO transition — typing never animates", rename.calls === 0, `calls=${rename.calls}`);
    await ctx.close();

    const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await rctx.addInitScript(HOOK);
    const rp = await rctx.newPage();
    await rp.goto(`${BASE}/build.html`, { waitUntil: "load" });
    await settle(rp);
    await reset(rp);
    const rwizard = rp.locator("[data-act='hooked']");
    await rwizard.scrollIntoViewIfNeeded();
    await rwizard.getByRole("button", { name: "Next" }).click();
    await clickAfterScroll(rp.locator("[data-bb-add-place]"));
    await rp.waitForTimeout(700);
    const rm = await read(rp);
    t("reduced motion · no transition is ever opened", rm.calls === 0, `calls=${rm.calls}`);
    // The off-ramp has to leave the feature WORKING, not just quiet.
    t("reduced motion · the wizard still advanced",
      (await rp.locator("[data-act='hooked'] .bx-q-progress").textContent()).trim() === "2 / 7");
    await rctx.close();
  } finally {
    await browser.close();
  }
}

console.log(failed
  ? `\nvt-verify ✗  ${failed} assertion(s) failed`
  : `\nvt-verify ✓  morphs real · boot clean · renames instant · reduced motion off (${toRun.join(", ")})`);
process.exit(failed ? 1 : 0);
