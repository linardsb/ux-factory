// Spike A browser leg — drives /build's Act 0 drop with the merged Polaris export (raw, then
// mechanically converted) in a real chromium, and screenshots what the reader actually sees.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = "/Users/Berzins/Desktop/Linards_current/ux-factory/.claude/plans/design-import-spike-a";
mkdirSync(SHOTS, { recursive: true });

const require = createRequire(path.join(process.env.HOME, "node_modules", "x.js"));
const pw = await import(require.resolve("playwright"));
const browser = await pw.default.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const log = [];
const say = (s) => { log.push(s); console.log(s); };
page.on("pageerror", (e) => say(`PAGE ERROR: ${e.message}`));

await page.goto("http://127.0.0.1:4764/build.html", { waitUntil: "networkidle" });
await page.waitForSelector("[data-build-file]");

async function drop(file, label, shot) {
  await page.setInputFiles("[data-build-file]", file);
  await page.waitForFunction(() => {
    const el = document.querySelector("[data-build-status]");
    return el && el.textContent.trim().length > 0;
  });
  await page.waitForTimeout(300);
  const status = await page.$eval("[data-build-status]", (el) => ({ text: el.textContent, state: el.dataset.state }));
  const reportHidden = await page.$eval("[data-build-report]", (el) => el.hidden);
  const stageStyle = await page.$eval("#build-stage", (el) => el.getAttribute("style") || "(no inline styles — stage NOT re-skinned)");
  say(`\n=== DROP: ${label} ===`);
  say(`status [data-state=${status.state}]: ${status.text}`);
  say(`mapping report visible: ${!reportHidden}`);
  say(`#build-stage inline style: ${stageStyle}`);
  // screenshot the whole Act 0 section (drop zone + status + stage in one glance)
  const section = await page.evaluateHandle(() => document.querySelector("[data-build-import]").closest("section"));
  await section.asElement().screenshot({ path: path.join(SHOTS, shot) });
  say(`screenshot → ${shot}`);
}

await drop(path.join(HERE, "polaris-v7.export.json"), "raw Polaris v7 merged export (rgba/rem, as published)", "01-act0-raw-refusal.png");
await drop(path.join(HERE, "polaris-v7.converted.json"), "mechanically converted (rgba→hex, rem→px)", "02-act0-converted-refusal.png");

writeFileSync(path.join(HERE, "spike-a-browser-output.txt"), log.join("\n"));
await browser.close();
console.log("\ndone");
