// tooling/trace-journey.mjs — the trace player's cross-engine journey driver (#496;
// .claude/plans/trace-player-said-did-496.md).
//
// The running-page half of the Said / Did split in system/trace-player.mjs. The pixel gate sees the
// roundtrip player at rest and never clicks Show all, so it cannot count labels against the trace;
// build-checks runs under Node and never sees a rendered card. What THIS driver owns, on /trace.html
// (demo-notice) and /roundtrip.html (pack-seed-verdant): every card's FIRST child labelled Said or Did in
// the order parseTrace gives over the trace fetched through the same server, the header's citation note
// under the neutral pack, the act heads' said + did summing to the act's own cards, and the label being
// the card's accessible name AND not hidden from assistive technology — [6b] exists because accname
// counts an aria-labelledby target's text even when it is aria-hidden, so the role/name count [5] alone
// stays green against a hidden label (measured, mutation M3).
//
// CANNOT REACH: the /instance.html mount (a built deploy dir — instance-journey.mjs's ground) and
// /factory's Traces panel (studio-journey's factoryPass asserts only that steps render); and it reads
// the accessibility tree through Playwright's role/name query, not a real screen reader.
//
// Playwright is NOT a repo dependency — resolved out of tooling/visual-regression/node_modules,
// the exact version the pixel gate pins (proto-journey.mjs's discipline). Operator-run, not in CI.
//
// Run it:
//   node tooling/visual-regression/serve.mjs &        # repo root on 127.0.0.1:4757
//   node tooling/trace-journey.mjs [chromium|firefox|webkit|all]     # default: all
//   (PORT/BASE overrides respected — a parallel session's serve can hold 4757 serving ITS tree,
//    so this driver refuses to run until the served player module byte-matches this one.)

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTrace } from "../system/trace-player.mjs";

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
  console.error(`trace-journey: unknown engine "${requested}" — expected one of ${ENGINES.join(", ")}, or all`);
  process.exit(1);
}

// The stale-serve guard: a long-lived serve.mjs on 4757 can belong to another session and serve
// ANOTHER tree. Refuse to run unless the served module byte-matches this working tree.
const servedPlayer = await fetch(`${BASE}/system/trace-player.mjs`).then((r) => r.text()).catch(() => null);
if (servedPlayer !== readFileSync(path.join(ROOT, "system/trace-player.mjs"), "utf8")) {
  console.error(`trace-journey: ${BASE} is not serving THIS tree's system/trace-player.mjs — start `
    + "node tooling/visual-regression/serve.mjs from this checkout (or point BASE elsewhere)");
  process.exit(1);
}

// The traces, fetched THROUGH the server the page uses — every expected value below comes from these.
const CASES = [
  { name: "harness", url: "/trace.html", mount: "#player", ready: "#player .trace-controls", trace: "/traces/demo-notice.jsonl" },
  { name: "roundtrip", url: "/roundtrip.html", mount: "#roundtrip-player", ready: '#roundtrip-player[data-trace="ready"]', trace: "/traces/pack-seed-verdant.jsonl" },
];
for (const c of CASES) {
  const text = await fetch(`${BASE}${c.trace}`).then((r) => r.text());
  c.steps = [...parseTrace(text).steps].sort((a, b) => a.seq - b.seq);
  c.expected = c.steps.map((s) => (s.kind === "text" ? "said" : s.kind === "tool" ? "did" : String(s.kind)));
}

async function journey(engineName, results, held) {
  const t = (label, cond, detail) => {
    if (cond) { results.passes += 1; console.log(`  ✓ ${label}`); }
    else { results.fails += 1; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); }
  };

  const browser = held.browser = await pw[engineName].launch();
  const errors = [];
  // A fresh context per engine: pack-boot.js restores nothing, so the page is on the neutral pack.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  for (const c of CASES) {
    const M = c.mount;
    const said = c.expected.filter((k) => k === "said").length;
    const did = c.expected.filter((k) => k === "did").length;
    console.log(`\n── ${c.name}: ${c.url} (${c.trace}, ${c.steps.length} steps · ${said} said · ${did} did)`);

    // [0] positive control — a one-kind trace would make every Said/Did count below vacuous.
    t("[0] the parsed trace holds at least one text AND one tool step", said > 0 && did > 0, `said ${said}, did ${did}`);

    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${c.name} pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`${c.name} console: ${m.text()}`); });
    await page.goto(`${BASE}${c.url}`, { waitUntil: "load" });
    await page.waitForSelector(c.ready, { timeout: 20000 });
    await page.waitForSelector(`${M} .trace-step`, { state: "attached", timeout: 20000 });

    // [1] neutral pack
    const packs = await page.evaluate(() => ({
      neutral: !!document.querySelector('link[href*="tokens.neutral.css"]'),
      other: [...document.querySelectorAll('link[href*="tokens.saulera"], link[href*="tokens.verdant"]')].map((l) => l.getAttribute("href")),
    }));
    t("[1] the page is on the neutral pack", packs.neutral && packs.other.length === 0, JSON.stringify(packs));

    // [2] header note
    const note = page.locator(`${M} .trace-kinds-note`);
    const noteVisible = await note.isVisible();
    const noteText = noteVisible ? await note.textContent() : "";
    const missing = ["Said", "Did", "Chen et al.", "2505.05410", "25%", "39%"].filter((s) => !noteText.includes(s));
    t("[2] the header note is visible and carries Said, Did and the citation", noteVisible && missing.length === 0,
      noteVisible ? `missing ${missing.join(", ")}` : "not visible");

    // [3] at rest, the one shown card is labelled
    const rest = await page.evaluate((M) => [...document.querySelectorAll(`${M} .trace-step:not(.trace-step-hidden)`)]
      .map((card) => card.querySelector(".trace-kind")?.textContent ?? null), M);
    t(`[3] at rest one card shows, labelled ${c.expected[0]}`,
      rest.length === 1 && String(rest[0]).toLowerCase() === c.expected[0], JSON.stringify(rest));

    // [4] Show all — the first-child label sequence equals parseTrace's
    await page.locator(M).getByRole("button", { name: "Show all" }).click();
    await page.waitForFunction((M) => !document.querySelector(`${M} .trace-step-hidden`), M, { timeout: 10000 });
    const seq = await page.evaluate((M) => [...document.querySelectorAll(`${M} .trace-step`)].map((card) => {
      const first = card.firstElementChild;
      return first && first.classList.contains("trace-kind") ? first.textContent.toLowerCase() : "(none)";
    }), M);
    t(`[4] ${c.steps.length} cards rendered`, seq.length === c.steps.length, `got ${seq.length}`);
    t("[4] every card's first child is its Said/Did label, in parseTrace order", seq.join(",") === c.expected.join(","),
      `expected ${c.expected.join(",")} got ${seq.join(",")}`);

    // [5] role/name — the label IS the card's accessible name
    const byName = {
      said: await page.locator(M).getByRole("article", { name: /^said$/i }).count(),
      did: await page.locator(M).getByRole("article", { name: /^did$/i }).count(),
    };
    t(`[5] ${said} articles named Said`, byName.said === said, `got ${byName.said}`);
    t(`[5] ${did} articles named Did`, byName.did === did, `got ${byName.did}`);

    // [6b] the label is not hidden from AT (accname would still count a hidden labelledby target)
    const hidden = await page.evaluate((M) => [...document.querySelectorAll(`${M} .trace-kind`)].filter((el) => {
      const cs = getComputedStyle(el);
      return el.closest('[aria-hidden="true"]') !== null || cs.display === "none" || cs.visibility === "hidden";
    }).map((el) => el.id), M);
    t("[6b] no label is aria-hidden, display:none or visibility:hidden", hidden.length === 0, hidden.join(", "));

    // [7] act counts
    const acts = await page.evaluate((M) => [...document.querySelectorAll(`${M} .trace-act`)].map((act) => {
      const key = [...act.classList].find((k) => k.startsWith("trace-act--"))?.slice("trace-act--".length);
      const cards = [...act.querySelectorAll(".trace-step")];
      const labels = cards.map((card) => card.querySelector(".trace-kind")?.textContent.toLowerCase());
      return {
        key, line: act.querySelector(".trace-act-count")?.textContent ?? "", cards: cards.length,
        said: labels.filter((l) => l === "said").length, did: labels.filter((l) => l === "did").length,
      };
    }), M);
    t("[7] four act heads", acts.length === 4, `got ${acts.length}`);
    for (const a of acts) {
      const m = /^(\d+) steps?(?: · (\d+) said)?(?: · (\d+) did)?$/.exec(a.line);
      const [total, s, d] = m ? [Number(m[1]), Number(m[2] || 0), Number(m[3] || 0)] : [NaN, NaN, NaN];
      const want = c.steps.filter((st) => st.phase === a.key).length;
      t(`[7] ${a.key}: "${a.line}" — said + did = total = its cards = parseTrace's ${want}, said/did = its labels`,
        m && s + d === total && total === a.cards && s === a.said && d === a.did && total === want,
        `parsed ${total}/${s}/${d}, cards ${a.cards} (${a.said} said, ${a.did} did), parseTrace ${want}`);
    }

    await page.close();
  }

  await ctx.close();
  await browser.close();
  held.browser = null;

  // [8] no noise filter: neither page fetches the mock Worker.
  if (errors.length) {
    results.fails += 1;
    console.log(`  ✗ [8] no page errors and no console errors across the run — got ${errors.length}`);
    for (const e of errors) console.log(`      ${e}`);
  } else {
    results.passes += 1;
    console.log("  ✓ [8] no page errors and no console errors across the whole run");
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
  console.log(`\n── ${engine}: ${results.passes} passed, ${results.fails} failed`);
  failed += results.fails;
}

console.log(`\n${"=".repeat(72)}`);
console.log(failed ? `trace-journey ✗  ${failed} failed assertion(s)` : `trace-journey ✓  all assertions passed on ${toRun.join(", ")}`);
process.exit(failed ? 1 : 0);
