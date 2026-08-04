// tooling/vt-verify.mjs — the committed cross-engine proof that the site's view-transition morphs
// are REAL (epic #164, ticket #171 for /build; extended site-wide by ticket #172 —
// .claude/plans/build-vt-morphs-171.md, .claude/plans/view-transitions-sitewide-172.md).
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

// ---- #172 · the surfaces the REST of the site wrapped -------------------------------------------
// /build names its groups; these do not. #172 ships the default root crossfade only, so there is no
// group name to resolve and the claim reduces to three things: the wrap adds nothing at load, the
// reader's verb opens exactly one transition, and the reduced-motion off-ramp opens none while
// still reaching the SAME end state.
//
// `boot` is an EXPECTED COUNT, not an assumed zero. On /build it is zero; on home it is TWO, and
// they are not #172's: spine.mjs's heroBeat derives the canned brand and reverts it through its own
// crossfade() (spine.mjs:147,149 — #72), which is a load-time transition that predates this ticket.
// The pixel gate is safe there for a different reason than on /build — the beat sets
// data-spine="ready" only AFTER the revert, and the gate waits on that handle — so this driver
// waits for the same handle, then resets the counter, and the per-verb claim below is measured
// against a settled page rather than folded in with someone else's animation.
const SITEWIDE = [
  {
    page: "/index.html", label: "home · intake wizard step", boot: 2,
    bootWhy: "spine heroBeat re-skin + revert (#72), both settled before data-spine=ready",
    ready: async (p) => {
      await p.waitForSelector('[data-spine="ready"]', { timeout: 20000 });
      await p.waitForSelector("#factory-wizard .fw-card", { timeout: 20000 });
      await p.locator("#beat-intake").scrollIntoViewIfNeeded();
    },
    act: (p) => p.locator("#factory-wizard").getByRole("button", { name: "Next" }).click(),
    state: (p) => p.locator("#factory-wizard .fw-progress").textContent().then((s) => s.trim()),
  },
  {
    // The SECOND mount of the same wizard, through instance.mjs's initIntake(config) seam — full
    // axes rather than home's three, and no spine heroBeat, so its load count is its own number.
    // The absent Worker logs ERR_CONNECTION_REFUSED here; that is fixture degradation, not a
    // failure, and it cannot open a transition either way.
    page: "/instance.html", label: "instance · intake wizard step", boot: 0,
    ready: async (p) => {
      await p.waitForSelector("#factory-wizard .fw-card", { timeout: 30000 });
      await p.locator("#factory-wizard").scrollIntoViewIfNeeded();
    },
    act: (p) => p.locator("#factory-wizard").getByRole("button", { name: "Next" }).click(),
    state: (p) => p.locator("#factory-wizard .fw-progress").textContent().then((s) => s.trim()),
  },
  {
    page: "/agentic-ui-study.html", label: "study · question tab", boot: 0,
    ready: (p) => p.waitForSelector("#study .study-tab", { timeout: 20000 }),
    act: async (p) => { const tab = p.locator("#study .study-tab").nth(1); await tab.scrollIntoViewIfNeeded(); await tab.click(); },
    state: (p) => p.locator("#study .study-tab[aria-selected='true']").first().textContent().then((s) => s.trim()),
  },
  {
    page: "/agentic-ui-study.html", label: "study · remove a tile", boot: 0,
    ready: (p) => p.waitForSelector("#study .study-control-row", { timeout: 20000 }),
    act: async (p) => { const b = p.locator("#study .study-control-row button[aria-label='Remove']").first(); await b.scrollIntoViewIfNeeded(); await b.click(); },
    state: (p) => p.locator("#study .study-control-row").count().then(String),
  },
  {
    page: "/trace.html", label: "trace · step forward", boot: 0,
    ready: (p) => p.waitForSelector("#player .trace-controls", { timeout: 20000 }),
    act: async (p) => { const b = p.locator("#player").getByRole("button", { name: /Next/ }); await b.scrollIntoViewIfNeeded(); await b.click(); },
    state: (p) => p.locator("#player .trace-progress").textContent().then((s) => s.trim()),
  },
];

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

    // ---- #172 · the same claims, on the rest of the site ------------------------------------
    for (const s of SITEWIDE) {
      const sctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await sctx.addInitScript(HOOK);
      const sp = await sctx.newPage();
      await sp.goto(`${BASE}${s.page}`, { waitUntil: "load" });
      await s.ready(sp);
      const sboot = await read(sp);
      t(`${s.label} · load opens ${s.boot} transition(s)${s.bootWhy ? ` — ${s.bootWhy}` : ", none of them this ticket's"}`,
        sboot.calls === s.boot, `calls=${sboot.calls}`);

      const from = await s.state(sp);
      await reset(sp);
      await s.act(sp);
      await sp.waitForTimeout(700);
      const acted = await read(sp);
      const to = await s.state(sp);
      t(`${s.label} · the reader's verb opens one transition`, acted.calls === 1, `calls=${acted.calls}`);
      // A morph that opened but mutated nothing would pass the line above; this is what makes it mean something.
      t(`${s.label} · and the surface actually changed`, to !== from, `${from} → ${to}`);
      await sctx.close();

      const rc = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      await rc.addInitScript(HOOK);
      const rpg = await rc.newPage();
      await rpg.goto(`${BASE}${s.page}`, { waitUntil: "load" });
      await s.ready(rpg);
      await reset(rpg);
      await s.act(rpg);
      await rpg.waitForTimeout(700);
      const rmm = await read(rpg);
      t(`${s.label} · reduced motion opens none`, rmm.calls === 0, `calls=${rmm.calls}`);
      // The off-ramp has to leave the feature WORKING, not just quiet — same end state, no animation.
      t(`${s.label} · reduced motion reaches the same end state`, (await s.state(rpg)) === to, `reduce=${await s.state(rpg)} vs normal=${to}`);
      await rc.close();
    }

    // ---- #204 · the studio canvas names NOTHING ---------------------------------------------
    // Written as its own block rather than a SITEWIDE row because the table's per-verb claim is
    // hardcoded to `calls === 1`, and this surface's claim is the opposite number. The structure it
    // does share is the one that matters: PROVE THE MOVEMENT FIRST. "Zero ::view-transition-*
    // pseudos" is trivially true of a page where nothing happened, so without the precondition this
    // check could not fail — the exact defect class #137 paid for twice.
    const cctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await cctx.addInitScript(HOOK);
    const cp = await cctx.newPage();
    await cp.goto(`${BASE}/studio.html`, { waitUntil: "load" });
    await cp.waitForSelector('[data-studio-canvas="ready"]', { timeout: 20000 });
    await cp.waitForSelector("[data-studio-canvas] .stx-slot", { timeout: 20000 });

    const cboot = await read(cp);
    t("studio canvas · load opens zero transitions", cboot.calls === 0, `calls=${cboot.calls}`);

    // The canvas's two kinds of movement: a zoom (the whole stage rescales) and a placement (a node
    // changes grid cell). Both are layout, and both must animate through nothing named.
    const canvasState = () => cp.evaluate(() => {
      const vp = document.querySelector("[data-studio-canvas]");
      const node = vp.querySelector(".stx-slot");
      const r = node.getBoundingClientRect();
      return { zoom: vp.getAttribute("data-zoom"), col: node.getAttribute("data-col"), box: `${Math.round(r.width)}x${Math.round(r.left)}` };
    });
    const movePlace = () => cp.evaluate(() => import("/system/studio-canvas.mjs").then((m) => {
      const c = m.getCanvas();
      const node = c.stage.querySelector(".stx-slot");
      c.place(node, { col: Number(node.getAttribute("data-col")) === 6 ? 2 : 6, row: 4, name: "vt probe" });
    }));

    await reset(cp);
    const cbefore = await canvasState();
    await clickAfterScroll(cp.locator("[data-studio-canvas]").getByRole("button", { name: "Zoom in", exact: true }));
    await movePlace();
    await cp.waitForTimeout(700);
    const cafter = await canvasState();
    const cmoved = await read(cp);
    t("studio canvas · the zoom and the placement actually changed the surface",
      cafter.zoom !== cbefore.zoom && cafter.col !== cbefore.col && cafter.box !== cbefore.box,
      `${JSON.stringify(cbefore)} → ${JSON.stringify(cafter)}`);
    t("studio canvas · …and opened no transition", cmoved.calls === 0, `calls=${cmoved.calls}`);
    const pseudos = await cp.evaluate(() => document.getAnimations()
      .map((a) => a.effect && a.effect.pseudoElement)
      .filter((x) => x && x.startsWith("::view-transition")));
    t("studio canvas · zero ::view-transition-* pseudos are running after the movement",
      pseudos.length === 0, pseudos.join(" "));
    await cctx.close();

    const crc = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await crc.addInitScript(HOOK);
    const crp = await crc.newPage();
    await crp.goto(`${BASE}/studio.html`, { waitUntil: "load" });
    await crp.waitForSelector('[data-studio-canvas="ready"]', { timeout: 20000 });
    // reset() zeroes the TRANSITION COUNTER, not the canvas — so the movement precondition has to be
    // taken here too, exactly as the block above takes it. Written out rather than inherited because
    // the lighter-weight version of this sub-case could not fail: the page loads reading "100%", so
    // a regression that made fit() a no-op under reduced motion would still satisfy both a
    // /^\d+%$/ readout test and `calls === 0`.
    await reset(crp);
    const rbefore = await crp.evaluate(() => document.querySelector("[data-studio-canvas]").getAttribute("data-zoom"));
    await crp.locator("[data-studio-canvas]").getByRole("button", { name: "Fit", exact: true }).click();
    await crp.waitForTimeout(400);
    const crm = await read(crp);
    const rafter = await crp.evaluate(() => document.querySelector("[data-studio-canvas]").getAttribute("data-zoom"));
    // Quiet is not enough — the verb still has to work, and "it worked" has to be a change.
    t("studio canvas · reduced motion · fit actually moved the zoom level",
      rafter !== rbefore, `data-zoom ${rbefore} → ${rafter}`);
    t("studio canvas · reduced motion opens none", crm.calls === 0, `calls=${crm.calls}`);
    await crc.close();
  } finally {
    await browser.close();
  }
}

console.log(failed
  ? `\nvt-verify ✗  ${failed} assertion(s) failed`
  : `\nvt-verify ✓  morphs real · load accounted for · renames instant · reduced motion off — /build + ${SITEWIDE.length} site-wide surfaces + the studio canvas, which names nothing (${toRun.join(", ")})`);
process.exit(failed ? 1 : 0);
