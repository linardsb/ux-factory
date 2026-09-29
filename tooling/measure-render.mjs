#!/usr/bin/env node
// tooling/measure-render.mjs — hand-written canon (this repo; not generated). THE RENDERER CHILD for the
// live fidelity measurement (epic #295 ticket #474; .claude/plans/import-live-fidelity-474.md D1, D8).
// Spawned by portal/lib/import-measure.mjs, which measures and writes; this file WRITES NOTHING.
//
// stdin: one JSON job { composition, width, height, scale, backdrop } — whole CSS px, the device scale
// factor, "#rrggbb". The composition is rendered by the REAL system/agentic-renderer.mjs under the three
// stylesheets canvas.html links (contract, neutral pack, components), served off disk under a fake
// origin through page.route; every other origin is aborted, so the render is hermetic.
// stdout: ONE line {"png":"<base64>","boxes":[…],"engine":"chromium","version":"…"}. The boxes are the
// root, then every element under it with its own text or that is an <svg>, in CSS px relative to the
// root and UNROUNDED — rounding is import-measure.mjs's regionsFromBoxes, in one place.
// Exit 3 = no Playwright (one stderr line naming the install command); 1 = anything else, one stderr line
// naming it. A partial stdout line is never printed.
//
// Playwright comes from tooling/visual-regression the way every journey loads it (createRequire), so the
// portal gains no dependency. UXF_MEASURE_VRDIR overrides that directory — a TEST SEAM, so a check can
// prove exit 3 without moving a shared node_modules aside.

import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const VRDIR = process.env.UXF_MEASURE_VRDIR || path.join(HERE, "visual-regression");
const ORIGIN = "http://measure.invalid";
const TYPES = { ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json" };

const die = (code, msg) => { process.stderr.write(`measure-render: ${msg}\n`); process.exit(code); };

const readStdin = async () => { let s = ""; for await (const c of process.stdin) s += c; return s; };

function checkJob(j) {
  if (!j || typeof j !== "object") throw new Error("the job is not an object");
  if (!j.composition || typeof j.composition !== "object") throw new Error("composition: expected an object");
  for (const k of ["width", "height"]) if (!Number.isInteger(j[k]) || j[k] < 1 || j[k] > 4000) throw new Error(`${k}: ${JSON.stringify(j[k])} is not a whole number of CSS px in 1–4000`);
  if (![1, 2, 3].includes(j.scale)) throw new Error(`scale: ${JSON.stringify(j.scale)} is not 1, 2 or 3`);
  if (typeof j.backdrop !== "string" || !/^#[0-9a-f]{6}$/i.test(j.backdrop)) throw new Error(`backdrop: ${JSON.stringify(j.backdrop)} is not #rrggbb`);
  return j;
}

let job;
try { job = checkJob(JSON.parse(await readStdin())); } catch (e) { die(1, `bad job — ${e.message}`); }

if (!existsSync(path.join(VRDIR, "node_modules", "@playwright", "test"))) {
  die(3, `no @playwright/test under ${path.join(VRDIR, "node_modules")} — run: cd tooling/visual-regression && npm ci`);
}
const pw = createRequire(`${VRDIR}${path.sep}`)("@playwright/test");

const { composition, width, height, scale, backdrop } = job;
const HARNESS = `<!doctype html><meta charset=utf-8>
<link rel=stylesheet href=/system/tokens.contract.css><link rel=stylesheet href=/system/tokens.neutral.css><link rel=stylesheet href=/system/components.css>
<style>html,body{margin:0;background:${backdrop}}#root{width:${width}px;height:${height}px;overflow:hidden}</style><div id=root></div>`;

let browser;
try {
  browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: width + 40, height: height + 40 }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== ORIGIN) return route.abort();
    if (u.pathname === "/") return route.fulfill({ contentType: "text/html", body: HARNESS });
    let rel;
    try { rel = decodeURIComponent(u.pathname); } catch { return route.fulfill({ status: 404, body: "" }); }
    // Refused unless it resolves under the repo root — checked BEFORE any read.
    const f = path.resolve(REPO, `.${rel}`);
    if (!f.startsWith(REPO + path.sep) || !existsSync(f)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ contentType: TYPES[path.extname(f)] ?? "application/octet-stream", body: readFileSync(f) });
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${ORIGIN}/`);
  const boxes = await page.evaluate(async (comp) => {
    const { renderComposition } = await import("/system/agentic-renderer.mjs");
    const vocab = await (await fetch("/handoff/verdant/vocabulary.json")).json();
    const root = document.getElementById("root");
    try { root.appendChild(renderComposition(vocab, comp)); }
    catch (e) { return { refused: String(e?.message ?? e) }; }
    await document.fonts.ready;
    const o = root.getBoundingClientRect();
    const out = [{ name: "root", x: 0, y: 0, w: o.width, h: o.height }];
    for (const e of root.querySelectorAll("*")) {
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own && e.localName !== "svg") continue;
      const r = e.getBoundingClientRect();
      out.push({ name: e.dataset?.part ?? (own ? `text:${e.textContent.trim().slice(0, 24)}` : "icon"), x: r.x - o.x, y: r.y - o.y, w: r.width, h: r.height });
    }
    return out;
  }, composition);
  if (boxes?.refused) throw new Error(`the renderer refused the composition — ${boxes.refused}`);
  if (errors.length) throw new Error(`page error — ${errors[0]}`);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width, height } });
  const pw_ = png.readUInt32BE(16), ph = png.readUInt32BE(20);
  if (pw_ !== width * scale || ph !== height * scale) throw new Error(`the clip came out ${pw_}x${ph}, asked ${width * scale}x${height * scale}`);
  const line = JSON.stringify({ png: png.toString("base64"), boxes, engine: "chromium", version: browser.version() });
  await browser.close();
  browser = null;
  process.stdout.write(`${line}\n`);
} catch (e) {
  if (browser) await browser.close().catch(() => {});
  die(1, String(e?.message ?? e).split("\n")[0]);
}
