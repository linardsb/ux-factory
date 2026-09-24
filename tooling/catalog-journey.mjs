// tooling/catalog-journey.mjs — the component catalog's cross-engine journey driver (epic #202,
// ticket #215; .claude/plans/component-catalog-appica-docs-215.md).
//
// The running-page halves the other two gates structurally cannot reach, stated per the
// group-9/11/13/16 discipline. The pixel gate never INTERACTS, so it cannot tell a live control
// from a dead one, cannot open the ⌘K palette, and cannot click a copy button. build-checks
// group 21 runs under Node, so it can pin controlFor's bounds against the artifact but never see
// an <input> carry them, and it can prove reactSnippet's projection but never that the serialized
// vd-* markup drives the real element. What THIS driver owns: the count rendered from the fetched
// artifact, the deep link surviving a cold load and a reload, the bounded controls carrying the
// artifact's own attributes, the HTML tab being a RE-serialization rather than a stored string,
// copy-as-Markdown byte-equal to the committed spec source, the palette's commands existing
// BEFORE the catalog could have registered anything (a held route, never a sleep), the vd tab's
// 3/23 gating counted from the fetched pack plus the paste-and-render proof, the refusal landing
// as content with a clean console, the playground bus readout from pointer and keyboard, the
// palette's same-page hash routing, and the pack swap's cell re-resolve + listener hygiene
// (chromium-CDP half stated as such), and (#309) choice's radio exclusivity by group beside its two
// controls plus its checked and disabled states in computed style under all three packs.
//
// Playwright is NOT a repo dependency — resolved out of tooling/visual-regression/node_modules,
// the exact version the pixel gate pins (proto-journey.mjs's discipline). Operator-run, not in CI.
//
// Run it:
//   node tooling/visual-regression/serve.mjs &        # repo root on 127.0.0.1:4757
//   node tooling/catalog-journey.mjs [chromium|firefox|webkit|all]     # default: all
//   (PORT/BASE overrides respected — a parallel session's serve can hold 4757 serving ITS tree,
//    so this driver refuses to run until the served catalog module byte-matches this one.)

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const VRDIR = path.join(HERE, "visual-regression");
const require = createRequire(`${VRDIR}${path.sep}`);
const pw = require("@playwright/test");

const BASE = process.env.BASE || "http://127.0.0.1:4757";
const ENGINES = ["chromium", "firefox", "webkit"];
const requested = (process.argv[2] || "all").toLowerCase();
const toRun = requested === "all" ? ENGINES : [requested];
if (toRun.some((e) => !ENGINES.includes(e))) {
  console.error(`catalog-journey: unknown engine "${requested}" — expected one of ${ENGINES.join(", ")}, or all`);
  process.exit(1);
}

// The stale-serve guard: a long-lived serve.mjs on 4757 can belong to another session and serve
// ANOTHER tree — every assertion below would then be about the wrong code. Refuse to run unless
// the served module byte-matches this working tree.
const servedCatalog = await fetch(`${BASE}/system/catalog.mjs`).then((r) => r.text()).catch(() => null);
if (servedCatalog !== readFileSync(path.join(ROOT, "system/catalog.mjs"), "utf8")) {
  console.error(`catalog-journey: ${BASE} is not serving THIS tree's system/catalog.mjs — start `
    + "node tooling/visual-regression/serve.mjs from this checkout (or point BASE elsewhere)");
  process.exit(1);
}

// The artifacts, fetched THROUGH the server the page uses — counts below come from these, never
// from typed literals.
const VOCAB = await fetch(`${BASE}/handoff/verdant/vocabulary.json`).then((r) => r.json());
const PACK = await fetch(`${BASE}/handoff/verdant/pack.json`).then((r) => r.json());
const COUNT = Object.keys(VOCAB.components).length;
const WRAPPER_COUNT = (PACK.portability?.webComponents?.files ?? []).length;
const SPEC_STAT_TILE = readFileSync(path.join(ROOT, "system/specs/stat-tile.md"), "utf8");

const READY = '[data-catalog-root][data-catalog="ready"]';

// Driver-side scroll settling (memory: hover/intersection probes race smooth scroll) — three
// consecutive equal scrollY samples, 100 ms apart.
async function settleScroll(page) {
  let last = -1;
  let stable = 0;
  for (let i = 0; i < 100 && stable < 3; i++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) stable += 1;
    else { stable = 0; last = y; }
    await page.waitForTimeout(100);
  }
}

async function journey(engineName, results, held) {
  const t = (label, cond, detail) => {
    if (cond) { results.passes += 1; console.log(`  ✓ ${label}`); }
    else { results.fails += 1; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); }
  };

  const browser = held.browser = await pw[engineName].launch();
  const errors = [];
  async function newPage(ctx) {
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
    return p;
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  // ------------------------------------------------- [1] the count comes from the artifact
  console.log("\n[1] the catalog renders every vocabulary component, count from the artifact");
  const page = await newPage(ctx);
  await page.goto(`${BASE}/components.html`, { waitUntil: "load" });
  await page.waitForSelector(READY, { timeout: 20000 });
  const counts = await page.evaluate(() => ({
    line: document.querySelector("[data-catalog-count]").textContent,
    sections: document.querySelectorAll(".cat-component").length,
    chips: document.querySelectorAll(".cat-chip").length,
  }));
  t(`count line renders the artifact's ${COUNT}`, counts.line.includes(String(COUNT)), counts.line);
  t(`${COUNT} sections rendered`, counts.sections === COUNT, `got ${counts.sections}`);
  t(`${COUNT} index chips`, counts.chips === COUNT, `got ${counts.chips}`);

  // ------------------------------------------------- [2] deep link survives a cold load + reload
  console.log("\n[2] a hash deep link survives a cold load and a reload (AC #2)");
  const deep = await newPage(ctx);
  for (const pass of ["cold", "reload"]) {
    if (pass === "cold") await deep.goto(`${BASE}/components.html#plant-card`, { waitUntil: "load" });
    else await deep.reload({ waitUntil: "load" });
    await deep.waitForSelector(READY, { timeout: 20000 });
    await settleScroll(deep);
    const state = await deep.evaluate(() => {
      const r = document.getElementById("plant-card").getBoundingClientRect();
      const a = document.activeElement;
      return {
        inView: r.top > -r.height && r.top < window.innerHeight,
        focused: a && a.classList.contains("cat-name") && a.textContent === "plant-card",
      };
    });
    t(`${pass}: plant-card scrolled into view`, state.inView);
    t(`${pass}: its heading holds focus`, state.focused);
  }

  // ------------------------------------------------- [3] bounds are the artifact's, never invented
  console.log("\n[3] controls carry the spec's own bounds and nothing invented (AC #3)");
  const statSpec = VOCAB.components["stat-tile"].props.value;
  const bounds = await page.evaluate(() => {
    const i = document.getElementById("stat-tile").querySelector('[data-prop="value"]');
    return { min: i.getAttribute("min"), max: i.getAttribute("max"), step: i.getAttribute("step") };
  });
  t("stat-tile.value carries min/max/step read from the artifact",
    bounds.min === String(statSpec.min) && bounds.max === String(statSpec.max) && bounds.step === String(statSpec.step),
    `${JSON.stringify(bounds)} vs artifact ${JSON.stringify({ min: statSpec.min, max: statSpec.max, step: statSpec.step })}`);
  // The artifact's one number is fully bounded, so a no-bounds NUMBER control has no real subject
  // today — found from the artifact, stated when absent (never silently skipped), with a text
  // prop's input standing in for the attribute-absence half of the claim.
  let unbounded = null;
  for (const [cname, entry] of Object.entries(VOCAB.components))
    for (const [pname, spec] of Object.entries(entry.props))
      if (spec.type === "number" && !("min" in spec) && !("max" in spec) && !("step" in spec)) unbounded = { cname, pname };
  if (unbounded) {
    const attrs = await page.evaluate(({ cname, pname }) => {
      const i = document.getElementById(cname).querySelector(`[data-prop="${pname}"]`);
      return { min: i.hasAttribute("min"), max: i.hasAttribute("max"), step: i.hasAttribute("step") };
    }, unbounded);
    t(`${unbounded.cname}.${unbounded.pname} (unbounded number) carries NO bounds attributes`,
      !attrs.min && !attrs.max && !attrs.step, JSON.stringify(attrs));
  } else {
    console.log("  · the artifact declares no unbounded number today — asserting attribute absence on a text prop instead");
    const attrs = await page.evaluate(() => {
      const i = document.getElementById("stat-tile").querySelector('[data-prop="unit"]');
      return { min: i.hasAttribute("min"), max: i.hasAttribute("max"), step: i.hasAttribute("step") };
    });
    t("stat-tile.unit (no declared bounds) carries NO bounds attributes", !attrs.min && !attrs.max && !attrs.step, JSON.stringify(attrs));
  }

  // ------------------------------------------------- [4] the HTML tab is a live re-serialization
  console.log("\n[4] the HTML tab re-serializes the live render, never a stored string (AC #5)");
  const before = await page.evaluate(() => {
    const s = document.getElementById("stat-tile");
    return {
      tab: s.querySelector('.cat-code[data-panel="html"] code').textContent,
      live: s.querySelector(".cat-stage").firstElementChild.outerHTML,
    };
  });
  t("at rest: tab text === the stage node's serialization", before.tab === before.live);
  await page.selectOption('#stat-tile [data-prop="kind"]', "light");
  const after = await page.evaluate(() => {
    const s = document.getElementById("stat-tile");
    return {
      tab: s.querySelector('.cat-code[data-panel="html"] code').textContent,
      live: s.querySelector(".cat-stage").firstElementChild.outerHTML,
    };
  });
  t("after a prop change: both changed", after.tab !== before.tab && after.live !== before.live);
  t("after a prop change: tab text === the NEW serialization", after.tab === after.live);

  // ------------------------------------------------- [5] copy-as-Markdown is byte-identical
  console.log("\n[5] copy-as-Markdown is byte-identical to the committed spec source (AC #4)");
  const copyPage = await newPage(ctx);
  await copyPage.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: (text) => { window.__copied = text; return Promise.resolve(); } },
      configurable: true,
    });
  });
  await copyPage.goto(`${BASE}/components.html`, { waitUntil: "load" });
  await copyPage.waitForSelector(READY, { timeout: 20000 });
  await copyPage.click("#stat-tile .cat-copy-md");
  await copyPage.waitForFunction(() => typeof window.__copied === "string");
  const copied = await copyPage.evaluate(() => window.__copied);
  t("captured clipboard text byte-equals system/specs/stat-tile.md", copied === SPEC_STAT_TILE,
    `lengths ${copied && copied.length} vs ${SPEC_STAT_TILE.length}`);
  const flipped = await copyPage.evaluate(() => document.querySelector("#stat-tile .cat-copy-md").textContent);
  t('button flipped to "Copied ✓"', flipped === "Copied ✓", flipped);
  await copyPage.close();

  // ------------------------------------------------- [6] ⌘K commands exist BEFORE the render
  console.log("\n[6] the palette's catalog commands are static — present before the catalog renders (AC #6)");
  const race = await newPage(ctx);
  let heldRoute = null;
  await race.route("**/handoff/verdant/pack.json", (route) => { heldRoute = route; }); // HELD, not fulfilled
  await race.goto(`${BASE}/components.html`, { waitUntil: "load" });
  const notReady = await race.evaluate(() => document.querySelector("[data-catalog-root]").getAttribute("data-catalog"));
  t("with pack.json held, the catalog has NOT rendered", notReady !== "ready");
  await race.keyboard.press("ControlOrMeta+k");
  await race.fill(".cmdk-input", "stat-tile");
  const raceItems = await race.evaluate(() => [...document.querySelectorAll(".cmdk-item")].map((li) => li.textContent));
  t('"Components: stat-tile" is listed while the page is pre-render', raceItems.includes("Components: stat-tile"), raceItems.join(" | "));
  await race.fill(".cmdk-input", "go to home");
  const homeItems = await race.evaluate(() => [...document.querySelectorAll(".cmdk-item")].map((li) => li.textContent));
  t('"Go to Home" is listed too', homeItems.includes("Go to Home"), homeItems.join(" | "));
  await race.keyboard.press("Escape");
  // Release the held response; the page must still reach ready — the hold was a pause, not a break.
  for (const deadline = Date.now() + 10000; !heldRoute && Date.now() < deadline;) await race.waitForTimeout(50);
  t("pack.json was actually requested (the hold held something)", Boolean(heldRoute));
  if (heldRoute) await heldRoute.continue();
  await race.waitForSelector(READY, { timeout: 20000 });
  t("after release, the page still reaches ready", true);
  await race.close();

  // ------------------------------------------------- [7] the vd tab gates both ways, and is real
  console.log("\n[7] vd/react tabs on exactly the pack's wrappers; the serialized markup drives the real element (AC #7)");
  const gating = await page.evaluate(() => {
    const sections = [...document.querySelectorAll(".cat-component")];
    return {
      withVd: sections.filter((s) => s.querySelector('.cat-tab[data-tab="vd"]')).length,
      withReact: sections.filter((s) => s.querySelector('.cat-tab[data-tab="react"]')).length,
      withNote: sections.filter((s) => s.querySelector(".cat-trajectory")).length,
      total: sections.length,
    };
  });
  t(`vd tab on exactly ${WRAPPER_COUNT} (counted from the fetched pack)`, gating.withVd === WRAPPER_COUNT, JSON.stringify(gating));
  t("react tab gates identically", gating.withReact === WRAPPER_COUNT, JSON.stringify(gating));
  t(`the honest absence note on the other ${COUNT - WRAPPER_COUNT}`, gating.withNote === gating.total - WRAPPER_COUNT, JSON.stringify(gating));
  // The tab's text leaves the page as a driver-side string and comes back as an evaluate argument:
  // the same bytes, pasted the same way, which is what makes the paste below literally a reader's
  // copy out and paste back. It is a RESTRUCTURE, not a hardening — the markup is unchanged and
  // unsanitised on purpose, because the property under test is that the tab's EXACT serialized
  // markup renders (system/catalog.mjs:132-134), and anything that alters the string deletes it.
  // What it removes is the in-page shape — page DOM text reparsed as HTML in page context — which
  // is the one CodeQL js/xss-through-dom matches (#387). The timeout is load-bearing:
  // page.textContent carries no default one, so a missing panel would hang the run, not fail it.
  const vdTabMarkup = await page.textContent('#plant-card .cat-code[data-panel="vd"] code', { timeout: 10000 });
  const shadowText = await page.evaluate(async (markup) => {
    await import("/system/wc/vd-plant-card.mjs");
    const holder = document.createElement("div");
    holder.innerHTML = markup; // driver-context paste of the tab's EXACT serialized markup
    document.body.appendChild(holder);
    await customElements.whenDefined("vd-plant-card");
    const text = holder.firstElementChild.shadowRoot ? holder.firstElementChild.shadowRoot.textContent : "";
    holder.remove();
    return text;
  }, vdTabMarkup);
  t("the pasted vd markup renders the plant name in the real element's shadow root",
    shadowText.includes("Monstera"), JSON.stringify(shadowText.slice(0, 80)));

  // ------------------------------------------------- [8] refusal is content, never a throw
  console.log("\n[8] a cleared required field refuses in the status line, stage intact, console clean");
  await page.fill('#stat-tile [data-prop="unit"]', "");
  const refusal = await page.evaluate(() => {
    const s = document.getElementById("stat-tile");
    return {
      line: s.querySelector(".cat-status-line").textContent,
      tileKept: Boolean(s.querySelector(".cat-stage .vd-stat-tile")),
      unitKept: s.querySelector(".cat-stage .vd-stat-unit")?.textContent ?? null,
    };
  });
  t("the status line names the offending path", /composition\.props\.unit/.test(refusal.line), refusal.line);
  t("the stage keeps its last good render", refusal.tileKept && refusal.unitKept === "%", JSON.stringify(refusal));
  await page.fill('#stat-tile [data-prop="unit"]', "%"); // restore for anything after

  // ------------------------------------------------- [9] the playground bus readout, both inputs
  console.log("\n[9] a specimen click reaches the bus contract — pointer and keyboard, same resulting DOM");
  await page.click("#primary-button .cat-stage .vd-primary-button");
  const pointerLine = await page.evaluate(() => document.getElementById("primary-button").querySelector(".cat-status-line").textContent);
  t("pointer: the status line shows the ui.intent", pointerLine.startsWith("ui.intent"), pointerLine);
  await page.evaluate(() => { document.getElementById("primary-button").querySelector(".cat-status-line").textContent = ""; });
  await page.focus("#primary-button .cat-stage .vd-primary-button");
  await page.keyboard.press("Enter");
  const keyboardLine = await page.evaluate(() => document.getElementById("primary-button").querySelector(".cat-status-line").textContent);
  t("keyboard: the same resulting DOM", keyboardLine === pointerLine, `"${keyboardLine}" vs "${pointerLine}"`);

  // ------------------------------------------------- [10] ⌘K same-page command = hash routing
  // Case [6] proves the commands are static pre-render; THIS drives palette.mjs's samePage branch
  // (`location.hash = hash` when normalize() says you are already on /components) — the one branch
  // no driver exercised (PR #257 review L3). No navigation: a pre-command window marker must
  // survive, and catalog.mjs's hashchange listener must move focus to the section heading.
  console.log("\n[10] a per-component ⌘K command on /components itself routes by hash, no navigation (review L3)");
  await page.evaluate(() => { window.__samePageMarker = true; });
  await page.keyboard.press("ControlOrMeta+k");
  await page.fill(".cmdk-input", "status-chip");
  await page.click('.cmdk-item:text-is("Components: status-chip")');
  await settleScroll(page);
  const routed = await page.evaluate(() => ({
    hash: location.hash,
    marker: window.__samePageMarker === true,
    focused: document.activeElement && document.activeElement.classList.contains("cat-name")
      ? document.activeElement.textContent : null,
  }));
  t('the hash became "#status-chip"', routed.hash === "#status-chip", routed.hash);
  t("same document — the pre-command marker survived (no navigation)", routed.marker);
  t("the section heading took focus (the hashchange listener ran)", routed.focused === "status-chip", String(routed.focused));

  // ------------------------------------------------- [11] pack swap re-resolves, listeners settle
  // The pixel gate proves the CELLS re-resolve under saulera (the two /components baselines); what
  // it cannot see is watchPackSwap's listener hygiene — before PR #257's L2 fix every settled swap
  // left one dead once-listener on the pack link. Swaps go to VERDANT, not saulera: saulera
  // @imports a fonts file the static host does not ship, and that 404 would trip this driver's
  // no-console-errors gate.
  console.log("\n[11] a pack swap re-resolves the token cells; settled swaps leave no listeners (review L2)");
  const swapPack = async (href) => {
    const before = await page.evaluate(() => [...document.querySelectorAll("[data-token-value]")].map((c) => c.textContent).join("|"));
    await page.evaluate((h) => {
      const link = [...document.querySelectorAll('link[rel="stylesheet"]')]
        .find((l) => /\/system\/tokens\.(?!contract)[a-z0-9-]+\.css$/.test(l.getAttribute("href") || ""));
      link.setAttribute("href", h);
    }, href);
    await page.waitForFunction(
      (prev) => [...document.querySelectorAll("[data-token-value]")].map((c) => c.textContent).join("|") !== prev,
      before, { timeout: 10000 },
    );
  };
  await swapPack("/system/tokens.verdant.css");
  t("the token cells re-resolved under the verdant pack", true);
  if (engineName === "chromium") {
    // Listener counting is CDP-only, so this half is chromium-only and STATED (the
    // studio-journey throttled-drag precedent). Settled = the pair fired-and-swept, so the
    // count must be ZERO after one swap and STAY zero after three — the pre-fix code reads
    // one dead listener per settled swap here.
    const countSettled = async () => {
      const cdp = await ctx.newCDPSession(page);
      const { result } = await cdp.send("Runtime.evaluate", {
        expression: `[...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => /\\/system\\/tokens\\.(?!contract)[a-z0-9-]+\\.css$/.test(l.getAttribute("href") || ""))`,
      });
      const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId });
      await cdp.detach();
      return listeners.filter((l) => l.type === "load" || l.type === "error").length;
    };
    const afterOne = await countSettled();
    await swapPack("/system/tokens.neutral.css");
    await swapPack("/system/tokens.verdant.css");
    const afterThree = await countSettled();
    t("settled load/error listeners on the pack link: zero, and zero after two more swaps",
      afterOne === 0 && afterThree === 0, `${afterOne} after one swap, ${afterThree} after three`);
  } else {
    console.log("  · the listener count is chromium-only (CDP getEventListeners), stated");
  }
  await swapPack("/system/tokens.neutral.css"); // leave the page as it was found

  // ---------------------------------------------- [12] a list's dividers are the CONTAINER's (#303)
  //
  // The one claim in #303 nothing else in the repo can observe. build-checks group 3 reads the
  // STYLESHEET and proves the two rules are written; it cannot prove they WIN — specificity, file
  // order, a later rule and a pack override are all invisible to a regex over source text. And the
  // pixel gate never reaches this branch at all: the playground renders {name, props} with NO
  // children (system/catalog.mjs), so every committed screenshot of `list` shows the EMPTY case
  // forever. So drive a real three-row list into the real page and read the COMPUTED styles back.
  //
  // The loose row is the whole case. Without it, deleting list-row's border globally makes every
  // other assertion here green — it must render in the SAME document under the SAME pack, or it
  // proves nothing about specificity. It runs LAST because replaceChildren destroys #list's own
  // specimen, and a case reading it afterwards would see these rows instead.
  console.log("\n[12] a list's dividers are the container's, in computed style (#303 AC #1)");
  const dividers = await page.evaluate(async () => {
    const stage = document.querySelector("#list .cat-stage");
    // A null stage would throw out of page.evaluate and abort this engine's whole leg, which reads
    // as "stopped here" rather than as coverage. Report it as data instead.
    if (!stage) return { error: "#list .cat-stage is not on the page" };
    const { renderComposition } = await import("/system/agentic-renderer.mjs");
    const vocab = await fetch("/handoff/verdant/vocabulary.json").then((r) => r.json());
    const rowsNode = renderComposition(vocab, {
      name: "list", props: { header: "Short this week", empty: "SHOULD NOT RENDER" },
      children: [1, 2, 3].map((n) => ({ name: "list-row", props: { label: `Row ${n}`, value: String(n) } })),
    }, null);
    stage.replaceChildren(rowsNode);
    const inList = [...stage.querySelectorAll(".ds-list-row")];
    if (inList.length < 3) return { error: `only ${inList.length} rows reached the stage` };
    // THE CONTROL, in the same document and the same pack: a row OUTSIDE a list keeps its card.
    const loose = renderComposition(vocab, { name: "list-row", props: { label: "Loose", value: "1" } }, null);
    stage.appendChild(loose);
    const cs = (node) => getComputedStyle(node);
    return {
      rows: inList.length,
      firstTop: cs(inList[0]).borderTopWidth,
      secondTop: cs(inList[1]).borderTopWidth,
      thirdTop: cs(inList[2]).borderTopWidth,
      firstRadius: cs(inList[0]).borderTopLeftRadius,
      looseTop: cs(loose).borderTopWidth,
      looseRadius: cs(loose).borderTopLeftRadius,
      emptyRendered: Boolean(rowsNode.querySelector(".ds-list-empty")),
      headerText: rowsNode.querySelector(".ds-list-header")?.textContent ?? null,
    };
  });
  t("the list stage was reachable and rendered three rows",
    !dividers.error && dividers.rows === 3, dividers.error || JSON.stringify(dividers));
  t("the FIRST row has no top border — the container's edge is the container's",
    dividers.firstTop === "0px", `got ${dividers.firstTop}`);
  t("rows 2 and 3 carry the 1px divider — drawn BETWEEN neighbours, never after the last",
    dividers.secondTop === "1px" && dividers.thirdTop === "1px",
    `got ${dividers.secondTop} / ${dividers.thirdTop}`);
  t("a row inside a list is square — the card corners are the container's",
    dividers.firstRadius === "0px", `got ${dividers.firstRadius}`);
  // THE CONTROL: without it every assertion above is satisfied by deleting list-row's border.
  t("a row OUTSIDE a list still has its own border and radius (the control)",
    dividers.looseTop === "1px" && dividers.looseRadius !== "0px",
    `got ${dividers.looseTop} / ${dividers.looseRadius}`);
  t("a list holding rows renders NO empty copy", dividers.emptyRendered === false, JSON.stringify(dividers));
  t("the header renders above the rows", dividers.headerText === "Short this week", `got ${dividers.headerText}`);

  // ------------------------------------------- [13] the icon's sizes and its REFUSAL, computed (#305)
  //
  // The two claims build-checks group 41 states it CANNOT reach, and it names this driver for both.
  // Group 41 reads the DOM the template builds — the data-size attribute is there, the refusal's
  // marker is there — and a regex over components.css proves the rules are WRITTEN. Neither can
  // prove they WIN: specificity, file order, a later rule and a pack override are all invisible to
  // both. So the glyph goes into the real page under the real stylesheet and the computed box, the
  // refusal's frame and the inherited colour are read back.
  //
  // The refusal's CONTROL is a rendered glyph in the same document and the same pack. Without it,
  // "the refused box is wider than 24px and has a border" is satisfied by a stylesheet that gave
  // EVERY .ds-icon a border and no size — which is the reading that made the refusal indistinguishable
  // from the thing it refuses.
  console.log("\n[13] the icon's three sizes and its refusal, in computed style (#305 AC #1a/#1b)");
  const glyphs = await page.evaluate(async () => {
    const stage = document.querySelector("#icon .cat-stage");
    // Reported as data, never thrown: a null stage would abort this engine's leg and read as
    // coverage rather than as "stopped here" (case 12's rule).
    if (!stage) return { error: "#icon .cat-stage is not on the page" };
    const { renderComposition } = await import("/system/agentic-renderer.mjs");
    const { ICONS } = await import("/system/icons.mjs");
    const vocab = await fetch("/handoff/verdant/vocabulary.json").then((r) => r.json());
    const draw = (props) => renderComposition(vocab, { name: "icon", props }, null);
    const cs = (n) => getComputedStyle(n);
    const box = {};
    for (const size of ["md", "lg", "xl"]) {
      const n = draw({ name: "check", size });
      stage.replaceChildren(n);
      box[size] = `${cs(n).width}/${cs(n).height}`;
    }
    // A wrapper with its own colour: currentColor's whole mechanism is INHERITANCE, so this is the
    // claim "wears every pack without a rule of its own" reduced to something an engine can answer
    // without swapping a stylesheet (case 11 owns the pack swap).
    const wrap = document.createElement("div");
    wrap.style.color = "rgb(1, 2, 3)";
    const inherited = draw({ name: "warning", size: "lg" });
    wrap.appendChild(inherited);
    const refused = draw({ name: "not-an-icon", size: "lg" });
    const control = draw({ name: "check", size: "lg" });
    stage.replaceChildren(wrap, refused, control);
    return {
      box,
      inheritedColor: cs(inherited).color,
      svgFill: inherited.querySelector("svg").getAttribute("fill"),
      pathFill: inherited.querySelector("svg path").getAttribute("fill"),
      pathNs: inherited.querySelector("svg path").namespaceURI,
      pathD: inherited.querySelector("svg path").getAttribute("d"),
      wantD: ICONS.warning,
      refusedText: refused.textContent,
      refusedSvgs: refused.querySelectorAll("svg").length,
      refusedBorder: `${cs(refused).borderTopWidth} ${cs(refused).borderTopStyle}`,
      refusedFont: cs(refused).fontFamily,
      refusedW: Math.round(refused.getBoundingClientRect().width),
      controlBorder: `${cs(control).borderTopWidth} ${cs(control).borderTopStyle}`,
      controlW: Math.round(control.getBoundingClientRect().width),
    };
  });
  t("the icon stage was reachable and the glyph rendered",
    !glyphs.error && glyphs.pathD === glyphs.wantD,
    glyphs.error || `path data is not ICONS.warning — ${JSON.stringify(glyphs.pathD)}`);
  t("the <path> is in the SVG namespace in a real engine, so it PAINTS",
    glyphs.pathNs === "http://www.w3.org/2000/svg", `got ${glyphs.pathNs}`);
  t("md / lg / xl compute 16 / 24 / 32 px — the spacing steps, winning at runtime",
    glyphs.box && glyphs.box.md === "16px/16px" && glyphs.box.lg === "24px/24px" && glyphs.box.xl === "32px/32px",
    `got ${JSON.stringify(glyphs.box)}`);
  t("the glyph takes its parent's colour — currentColor by INHERITANCE, no rule of its own",
    glyphs.inheritedColor === "rgb(1, 2, 3)", `got ${glyphs.inheritedColor}`);
  t("the fill sits on the <svg> and the <path> carries none (gen-icons copies only `d`)",
    glyphs.svgFill === "currentColor" && glyphs.pathFill === null,
    `svg=${glyphs.svgFill} path=${glyphs.pathFill}`);
  t("a refused name reads as its own literal text, with NO svg — never an empty box",
    glyphs.refusedText === "not-an-icon" && glyphs.refusedSvgs === 0,
    `text=${JSON.stringify(glyphs.refusedText)} svgs=${glyphs.refusedSvgs}`);
  t("the refusal's 1px frame and mono family WIN over the size rules above it",
    glyphs.refusedBorder === "1px solid" && /mono/i.test(String(glyphs.refusedFont)),
    `border=${glyphs.refusedBorder} font=${glyphs.refusedFont}`);
  // THE CONTROL: without it, every refusal assertion above is satisfied by a sheet that framed
  // EVERY .ds-icon and sized none — the reading where a refusal looks exactly like a glyph.
  t("a RENDERED glyph beside it has no frame and keeps its 24px box (the control)",
    glyphs.controlBorder === "0px none" && glyphs.controlW === 24,
    `border=${glyphs.controlBorder} width=${glyphs.controlW}px`);
  t("and the refusal is WIDER than that box, because it grew to fit the name",
    glyphs.refusedW > glyphs.controlW, `refused ${glyphs.refusedW}px vs glyph ${glyphs.controlW}px`);

  // ------------------------------------ [14] choice: exclusivity by name, and its states per pack (#309)
  //
  // The claim build-checks group 18 states it CANNOT reach: radios sharing a group are exclusive.
  // That is the ENGINE's rule — the template only writes `group` to the native name — so a DOM stub
  // can pin the attribute and never the behaviour. Real clicks, then, in three engines, beside TWO
  // controls, because each name mutation is caught by a different one (measured while planning):
  //   · two checkboxes sharing a group both stay checked — exclusivity comes from the radio type,
  //     not from anything this repo adds;
  //   · two radios in DIFFERENT groups both stay checked — a template writing a CONSTANT name makes
  //     every radio on the page one set and passes the same-group assertion, and only this sees it.
  // And AC #1's "under all three packs": the checked tint and the disabled colours read back per
  // pack, each against a probe span wearing the same token in the same document — so the compare
  // is rgb against rgb whatever format a pack writes. Saulera goes in by route, the pixel gate's own
  // mechanism (tooling/visual-regression/visual.spec.mjs:169), with its ../fonts/fonts.css answered
  // empty: case 11 swaps to verdant only because that @import 404s on this host and trips the
  // no-console-errors gate, and an answered route keeps that gate armed for everything else.
  console.log("\n[14] choice: radios exclusive by group, checkboxes never, states under three packs (#309 AC #1)");
  const CHOICE_PACKS = { neutral: null, saulera: "system/tokens.saulera.css", verdant: "system/tokens.verdant.css" };
  const accents = [];
  for (const [pack, file] of Object.entries(CHOICE_PACKS)) {
    const cp = await newPage(ctx);
    if (file) {
      await cp.route("**/system/tokens.neutral.css", (r) => r.fulfill({ path: path.join(ROOT, file) }));
      await cp.route("**/fonts/fonts.css", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    }
    await cp.goto(`${BASE}/components.html`, { waitUntil: "load" });
    await cp.waitForSelector(READY, { timeout: 20000 });
    const st = await cp.evaluate(async () => {
      const stage = document.querySelector("#choice .cat-stage");
      // Reported as data, never thrown (case 12's rule).
      if (!stage) return { error: "#choice .cat-stage is not on the page" };
      const { renderComposition } = await import("/system/agentic-renderer.mjs");
      const vocab = await fetch("/handoff/verdant/vocabulary.json").then((r) => r.json());
      const c = (props) => renderComposition(vocab, { name: "choice", props }, null);
      const n = {
        standard: c({ kind: "radio", group: "cj-delivery", label: "Standard", checked: true }),
        express: c({ kind: "radio", group: "cj-delivery", label: "Express" }),
        loneA: c({ kind: "radio", group: "cj-a", label: "Lone A", checked: true }),
        loneB: c({ kind: "radio", group: "cj-b", label: "Lone B", checked: true }),
        gift: c({ kind: "checkbox", group: "cj-extras", label: "Gift wrap" }),
        receipt: c({ kind: "checkbox", group: "cj-extras", label: "Receipt" }),
        locked: c({ kind: "checkbox", group: "cj-locked", label: "Locked", hint: "Set by your plan.", checked: true, disabled: true }),
      };
      const probe = (token) => { const s = document.createElement("span"); s.style.color = `var(${token})`; return s; };
      const pAccent = probe("--color-accent"); const pMuted = probe("--color-fg-muted"); const pFg = probe("--color-fg");
      stage.replaceChildren(...Object.values(n), pAccent, pMuted, pFg);
      const cs = (x) => getComputedStyle(x);
      const input = (k) => n[k].querySelector("input");
      return {
        accent: cs(pAccent).color, muted: cs(pMuted).color, fg: cs(pFg).color,
        tint: cs(input("gift")).accentColor,
        enabledLabel: cs(n.gift.querySelector(".ds-choice-label")).color,
        lockedLabel: cs(n.locked.querySelector(".ds-choice-label")).color,
        lockedHint: cs(n.locked.querySelector(".ds-choice-hint")).color,
        lockedChecked: input("locked").checked, lockedDisabled: input("locked").disabled,
        lockedCursor: cs(n.locked).cursor,
        rowHeight: Math.round(n.gift.getBoundingClientRect().height),
        lonesAtRest: [input("loneA").checked, input("loneB").checked],
      };
    });
    t(`${pack}: the choice stage was reachable`, !st.error, st.error);
    if (!st.error) {
      accents.push(st.accent);
      t(`${pack}: the control's tint IS the pack's --color-accent (accent-color, no redrawn box)`,
        st.tint === st.accent, `tint ${st.tint} vs accent ${st.accent}`);
      t(`${pack}: disabled keeps its checked mark and is natively disabled`,
        st.lockedChecked === true && st.lockedDisabled === true, JSON.stringify(st));
      t(`${pack}: a disabled label and hint drop to --color-fg-muted, not-allowed cursor`,
        st.lockedLabel === st.muted && st.lockedHint === st.muted && st.lockedCursor === "not-allowed",
        `label ${st.lockedLabel} hint ${st.lockedHint} muted ${st.muted} cursor ${st.lockedCursor}`);
      // THE CONTROL for the colour pair: an ENABLED label in the same document reads --color-fg. Without
      // it, a sheet that muted every .ds-choice label passes the disabled assertion above.
      t(`${pack}: an enabled label beside it stays --color-fg (the control)`,
        st.enabledLabel === st.fg && st.fg !== st.muted, `enabled ${st.enabledLabel} fg ${st.fg}`);
      t(`${pack}: the row is the 44px target`, st.rowHeight >= 44, `${st.rowHeight}px`);
    }
    if (pack === "neutral" && !st.error) {
      // Behaviour once, on the neutral pack: exclusivity is the engine's and no pack can move it.
      await cp.click("#choice .cat-stage label:has-text('Express')");
      await cp.click("#choice .cat-stage label:has-text('Gift wrap')");
      await cp.click("#choice .cat-stage label:has-text('Receipt')");
      const read = () => cp.evaluate(() => Object.fromEntries([...document.querySelectorAll("#choice .cat-stage label.ds-choice")]
        .map((l) => [l.querySelector(".ds-choice-label").textContent, l.querySelector("input").checked])));
      const clicked = await read();
      t("picking Express un-picks Standard — radios sharing a group are ONE set",
        clicked.Express === true && clicked.Standard === false, JSON.stringify(clicked));
      t("two checkboxes sharing a group both stay checked — never exclusive (the control)",
        clicked["Gift wrap"] === true && clicked.Receipt === true, JSON.stringify(clicked));
      t("two radios in DIFFERENT groups both stay checked — the name is the group, not a constant (the control)",
        st.lonesAtRest[0] === true && st.lonesAtRest[1] === true && clicked["Lone A"] === true && clicked["Lone B"] === true,
        JSON.stringify({ atRest: st.lonesAtRest, clicked }));
      await cp.focus("#choice .cat-stage label:has-text('Express') input");
      await cp.keyboard.press("ArrowUp");
      const keyed = await read();
      t("ArrowUp moves the pick within the set, natively (no script in the template)",
        keyed.Standard === true && keyed.Express === false, JSON.stringify(keyed));
    }
    await cp.close();
  }
  // The loop proves nothing if the route never took: three packs, at least two distinct accents.
  t("the pack loop really re-skinned — at least two distinct accents across three packs",
    new Set(accents).size >= 2, JSON.stringify(accents));

  await page.close();
  await deep.close();
  await ctx.close();
  await browser.close();
  held.browser = null;

  if (errors.length) {
    results.fails += 1;
    console.log(`  ✗ no page errors and no console errors across the run — got ${errors.length}`);
    for (const e of errors) console.log(`      ${e}`);
  } else {
    results.passes += 1;
    console.log("  ✓ no page errors and no console errors across the whole run");
  }
}

let failed = 0;
for (const engine of toRun) {
  console.log(`\n${"=".repeat(72)}\n${engine}\n${"=".repeat(72)}`);
  const results = { passes: 0, fails: 0 };
  const held = { browser: null };
  try {
    await journey(engine, results, held);
  } catch (e) {
    results.fails += 1;
    console.log(`  ✗ ${engine} threw mid-run: ${e.message}`);
  } finally {
    if (held.browser) await held.browser.close().catch(() => {});
  }
  console.log(`\n${engine}: ${results.passes} passed, ${results.fails} failed`);
  failed += results.fails;
}

console.log(`\n${"=".repeat(72)}`);
console.log(failed ? `catalog-journey ✗  ${failed} failed assertion(s)` : `catalog-journey ✓  all assertions passed on ${toRun.join(", ")}`);
process.exit(failed ? 1 : 0);
