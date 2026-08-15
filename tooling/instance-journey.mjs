// tooling/instance-journey.mjs — the BUILT-INSTANCE journey driver (epic #202, ticket #222;
// .claude/plans/studio-instance-reshell-222.md).
//
// The sixth operator-run driver, and the one the others structurally cannot be: it drives the
// OUTPUT of agent-layer/build-instance.mjs — a stamped, self-contained deploy dir — as a visitor
// would meet it. build-checks group 25 gates the PURE half (stampShell's residue + auditRefs'
// predicate, with mutations); this driver owns everything only a running built page can show:
//   · the studio settles its BESPOKE replay ([data-studio="ready"] → [data-replay="settled"]) and
//     the stage's place count equals the SERVED board file's — fetched from the deploy dir through
//     the page's own INSTANCE_CONFIG → artifact → source.board chain, never a literal;
//   · the page wears the STAMPED company pack from its head <link>;
//   · the served bytes carry zero stamp residue (data-when= · {{ · the demo name · "demo" ·
//     "fictional") — the same words group 25 asserts on stampShell's output, re-asserted here on
//     what an HTTP client actually receives;
//   · ZERO non-2xx responses across the whole visit, main-frame-scoped — the structural #160 /
//     asset-closure check. It is deliberately NOT an href list: the visit includes a COMPILE, so
//     the lazily-fetched docs chain (vocabulary.json at compile, pack.json behind the docs panel's
//     discriminator) is inside the accounting — which is what makes the operator mutation drill
//     below able to go red at all;
//   · every internal <a href> in the served HTML answers 2xx (fragments / mailto: / https: exempt);
//   · one canvas interaction takes over (provenance flips to "visitor") and the compile beat runs
//     end to end on the built page ([data-compile-state="rendered"], ≥1 .stf-screen);
//   · the keep rail's own ?b= link comes back DECLINED — the never-author-over-the-sender's-board
//     rule holds on a built instance — and the declined note names no /factory route, because the
//     deploy dir has none to offer (PR #270 review, M1);
//   · the build's own stdout PRINTS the wrangler commands and the "nothing is deployed" sentence —
//     AC #7's deploy-stays-human, asserted as text; no deploy call exists to observe.
//
// THE FIXTURE is tooling/fixtures/harborlight/brief.md — fictional, and deliberately NOT the
// committed demo company: the residue greps discriminate on the demo name, so the fixture must
// carry a different one or they could never fail.
//
// MUTATION DRILL (operator, the plan's red-proof): build once, then
//   rm <dir>/handoff/verdant/pack.json
//   node tooling/instance-journey.mjs chromium --dir <dir>
// and watch the zero-404 row go red at the compile step (then rebuild). --dir skips the build and
// reuses an existing deploy dir; the wrangler-stdout row is skipped in that mode and says so.
//
// Playwright is NOT a repo dependency — resolved out of tooling/visual-regression/node_modules,
// the exact version CI's `visual` job pins (proto-journey's discipline). Operator-run, not in CI.
//
// Run it (no serve step — this driver serves the deploy dir itself, on 127.0.0.1:4763):
//   node tooling/instance-journey.mjs [chromium|firefox|webkit|all] [--dir <existing deploy dir>]

import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const VRDIR = path.join(HERE, "visual-regression");
const require = createRequire(`${VRDIR}${path.sep}`);
const pw = require("@playwright/test");

const PORT = Number(process.env.PORT || 4763);
const BASE = `http://127.0.0.1:${PORT}`;
const ENGINES = ["chromium", "firefox", "webkit"];
const args = process.argv.slice(2);
const requested = (args.find((a) => !a.startsWith("--")) || "all").toLowerCase();
const dirFlagAt = args.indexOf("--dir");
const reuseDir = dirFlagAt !== -1 ? path.resolve(args[dirFlagAt + 1] || "") : null;
const toRun = requested === "all" ? ENGINES : [requested];
if (toRun.some((e) => !ENGINES.includes(e))) {
  console.error(`instance-journey: unknown engine "${requested}" — expected one of ${ENGINES.join(", ")}, or all`);
  process.exit(1);
}

// proto-journey.mjs:70's filter, verbatim — the ONE expected-noise class. The built instance makes
// no Worker fetch itself, so on a healthy build this filter matches nothing; it is carried so a
// future embed cannot turn a designed degradation into a red herring, and it stays narrow so
// anything else still fails the run.
const EXPECTED_NOISE = /127\.0\.0\.1:8787|ERR_CONNECTION_REFUSED|Could not connect to the server/;

// ---- step 1 · build the fixture instance (or reuse --dir) ----------------------------------------
let deployDir = reuseDir;
let buildStdout = null;
if (!deployDir) {
  deployDir = path.join(mkdtempSync(path.join(process.env.INSTANCE_JOURNEY_OUT || tmpdir(), "instance-journey-")), "inst");
  console.log(`instance-journey: building the Harborlight fixture instance → ${deployDir}`);
  buildStdout = execFileSync("node", [
    path.join(ROOT, "agent-layer", "build-instance.mjs"),
    path.join(ROOT, "tooling", "fixtures", "harborlight", "brief.md"),
    "--out", deployDir,
    // verdant, not saulera: the fixture pack must have a SELF-CONTAINED import closure, or the
    // zero-404 row reds on the pack's own @import rather than on an assembly defect —
    // tokens.saulera.css imports a ../fonts/fonts.css this repo does not ship (a pre-existing
    // saulera quirk, 404 on the public site too). A real company pack is DERIVED (figma-pull /
    // gen-token-css shape) and imports nothing, which is the case verdant's stands in for.
    "--pack", path.join(ROOT, "system", "tokens.verdant.css"),
    "--trace", path.join(ROOT, "traces", "pack-seed-verdant.jsonl"),
    "--replay", "build-northwind-restock",
  ], { encoding: "utf8" });
} else {
  console.log(`instance-journey: reusing deploy dir ${deployDir} (build + wrangler-stdout rows skipped)`);
}
if (!existsSync(path.join(deployDir, "index.html"))) {
  console.error(`instance-journey: ${deployDir} holds no index.html — not a built instance`);
  process.exit(1);
}

// ---- step 2 · serve the deploy dir (in-file: serve.mjs hard-roots the repo, so it cannot serve
// an out-of-repo build — its ~30-line shape mirrored here, MIME map + traversal guard included) ----
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
  ".jsonl": "text/plain; charset=utf-8",
};
const server = createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, BASE).pathname);
  let file = path.resolve(deployDir, "." + path.posix.normalize("/" + rel));
  if (!file.startsWith(deployDir + path.sep) && file !== deployDir) { res.writeHead(404); return res.end("not found"); }
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!existsSync(file) && !path.extname(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

// ---- the journey ---------------------------------------------------------------------------------
async function journey(engineName, results, held) {
  const t = (name, cond, extra = "") => {
    if (cond) { results.passes += 1; console.log(`  ✓ ${name}`); }
    else { results.fails += 1; console.log(`  ✗ ${name} ${extra}`); }
  };

  // [1] the build's own stdout — AC #7. Deploy stays the operator's explicit step: the builder
  // PRINTS the two wrangler commands and says nothing is deployed, and no assertion here ever
  // observes a deploy because none exists to observe.
  console.log("\n[1] the build printed the deploy commands and deployed nothing");
  if (buildStdout != null) {
    t("build stdout carries the ✓ line", /build-instance harborlight\s+✓/.test(buildStdout));
    t("wrangler pages project create printed", /npx wrangler pages project create inst-harborlight-/.test(buildStdout));
    t("wrangler pages deploy printed", /npx wrangler pages deploy /.test(buildStdout));
    t("the deploy-stays-human sentence printed", /Nothing is deployed until you run the commands above/.test(buildStdout));
  } else {
    results.skips.push("build stdout rows (reused --dir)");
    console.log("  · skipped (reused --dir)");
  }

  // [2] the served bytes — residue on what an HTTP client actually receives, COMMENTS INCLUDED
  // (the #44 view-source rule: body comments survive stamping, so a banned word in one ships to a
  // real instance). The one carve-out is the INSTANCE_CONFIG <script> block: it names the copied
  // run's FILES by slug, and this fixture deliberately reuses the committed demo run (copy-not-run
  // — recording a second paid run per fixture build would buy nothing); a real build's config
  // names the company's own run slug, so nothing is masked there.
  console.log("\n[2] the served HTML carries zero stamp residue and loads the generated chrome");
  const servedHtml = await fetch(`${BASE}/`).then((r) => r.text());
  t("no data-when= in served HTML", !/data-when=/.test(servedHtml));
  t("no {{ template token in served HTML", !/\{\{/.test(servedHtml));
  const outsideConfig = servedHtml.replace(/<!-- INSTANCE_CONFIG:start[\s\S]*?INSTANCE_CONFIG:end -->/, " ");
  for (const word of ["Northwind", "demo", "fictional"])
    t(`no "${word}" in served HTML (outside the config block)`, !new RegExp(`\\b${word}\\b`, "i").test(outsideConfig));
  t("served HTML loads client.instance.config.js", servedHtml.includes('src="/system/client.instance.config.js"'));

  // [3] every internal <a href> answers 2xx (fragments / mailto: / https: exempt) — the href half
  // of #160; the request-accounting half is [7]'s.
  console.log("\n[3] every internal link in the served HTML resolves");
  const hrefs = [...servedHtml.matchAll(/<a\s[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const internal = [...new Set(hrefs.filter((h) => h.startsWith("/") && !h.startsWith("//")))];
  for (const href of internal) {
    const status = await fetch(`${BASE}${href.replace(/[?#].*$/, "")}`).then((r) => r.status).catch(() => 0);
    t(`${href} → 2xx`, status >= 200 && status < 300, `got ${status}`);
  }
  t("no bare-relative or http: link slipped in",
    hrefs.every((h) => h.startsWith("/") || h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("https:")),
    JSON.stringify(hrefs.filter((h) => !(h.startsWith("/") || h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("https:")))));

  // ---- the running page --------------------------------------------------------------------------
  const browser = held.browser = await pw[engineName].launch();
  const errors = [];
  const badResponses = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !EXPECTED_NOISE.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on("response", (r) => {
    // Main-frame scoping (proto-journey's discipline): the instance embeds no iframes today, so
    // this is a guard against a future embed's own traffic polluting the accounting, not a filter
    // anything currently relies on.
    if (r.request().frame() !== page.mainFrame()) return;
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
  });

  console.log("\n[4] the studio settles its bespoke replay under the stamped pack");
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.waitForSelector('[data-studio="ready"]', { timeout: 20000 });
  await page.waitForSelector('[data-replay="settled"]', { timeout: 40000 });
  t("studio ready, replay settled", true);

  // The CONTRACT line matches the same shape and comes first (the head-order trap studio-frames'
  // packHref records), so it is excluded by name — "which line do I observe", not an allowlist.
  const packHref = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((l) => l.getAttribute("href"))
      .find((h) => /\/tokens\.[a-z0-9-]+\.css$/.test(h || "") && !/tokens\.contract\.css$/.test(h)));
  t("head pack <link> is the stamped company pack", packHref === "/system/tokens.harborlight.css", `got ${packHref}`);

  // The board count, read through the page's OWN config chain — INSTANCE_CONFIG → artifact →
  // source.board → the served board file — so a literal here cannot drift past a re-recorded run.
  const configMatch = servedHtml.match(/window\.INSTANCE_CONFIG\s*=\s*([\s\S]*?);\s*<\/script>/);
  t("INSTANCE_CONFIG parses out of the served HTML", !!configMatch);
  if (configMatch) {
    const config = JSON.parse(configMatch[1]);
    const artifact = await fetch(`${BASE}${config.replay.artifact}`).then((r) => r.json());
    const board = await fetch(`${BASE}${artifact.source.board}`).then((r) => r.json());
    const slots = await page.locator(".stx-slot").count();
    t(`stage holds the served board's ${board.places.length} places`, slots === board.places.length, `got ${slots}`);
    t("the chrome's trace link is the artifact's own", await page
      .locator(".stu-replay-links a").first().getAttribute("href").then((h) => h === artifact.source.curatedTrace));
  }

  console.log("\n[5] one canvas interaction takes over");
  await page.click(".stx-scroll", { position: { x: 40, y: 40 } });
  const prov = await page.getAttribute("[data-studio]", "data-provenance");
  t('provenance flipped to "visitor"', prov === "visitor", `got ${prov}`);

  console.log("\n[6] the compile beat runs end to end on the built page");
  // ARMED BEFORE THE CLICK, AWAITED BEFORE THE ACCOUNTING IS READ: settle() STARTS the docs chain's
  // lazy fetches (docs.refresh()) but nothing awaits them, so on loopback the [data-compile-state]
  // wait can win the race and the zero-404 row would read badResponses before a missing artifact's
  // 404 lands — green in the bad direction (PR #270 review, M2). loadDocsModel fetches DOCS_SOURCES
  // sequentially, each awaited before the next fires, so a response to the LAST source implies the
  // earlier two landed; any response settles it, 404 included — counting the status stays [8]'s job.
  const docsFetch = page.waitForResponse((r) => r.url().endsWith("/system/system-graph.json"), { timeout: 20000 })
    .then(() => true, () => false);
  await page.getByRole("button", { name: "Compile the board" }).click();
  await page.waitForSelector('[data-compile-state="rendered"]', { timeout: 20000 });
  const screens = await page.locator(".stf-screen").count();
  t("compile rendered ≥1 screen", screens >= 1, `got ${screens}`);
  t("the docs chain's lazy fetches were observed before the accounting is read", await docsFetch);

  // [7] the declined path a real instance's visitor actually reaches: the keep rail's own ?b= link,
  // revisited. The driver must mount DECLINED (never author over the sender's board), and the note
  // must not send the visitor to /factory — the deploy dir has no such route (PR #270 review, M1).
  // BEFORE the accounting on purpose: the revisit re-fetches the whole config chain, so its
  // requests belong inside the zero-404 sweep.
  console.log("\n[7] the keep rail's own ?b= link comes back declined, with no /factory in the note");
  await page.getByRole("button", { name: "Copy the link that rebuilds this" }).click();
  // The copy handler is async (it awaits the codec before publishing the link), so the field is
  // waited for, not read on the click's heels.
  await page.waitForFunction(() => {
    const i = document.querySelector(".stu-keep-link");
    return !!i && !i.hidden && i.value.includes("?b=");
  }, null, { timeout: 10000 });
  const shareLink = await page.locator(".stu-keep-link").inputValue();
  t("the keep rail built a ?b= link", shareLink.includes("?b="), shareLink.slice(0, 80));
  await page.goto(shareLink, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const v = document.querySelector("[data-studio]")?.getAttribute("data-replay");
    return v && v !== "loading";
  }, null, { timeout: 30000 });
  const replayState = await page.getAttribute("[data-studio]", "data-replay");
  t("the driver mounts DECLINED on the visitor's own link", replayState === "declined", `got ${replayState}`);
  // .stu-replay-note is a shared class (the skipped-steps note wears it too) — filter to the
  // declined sentence.
  const declinedNote = await page.locator(".stu-replay-note", { hasText: "did not play here" }).innerText();
  t("the declined note names no /factory route on a built instance",
    !declinedNote.includes("/factory") && declinedNote.includes("linked above."),
    declinedNote.replace(/\s+/g, " ").slice(0, 120));

  console.log("\n[8] zero non-2xx responses across the whole visit (compile's lazy fetches + the ?b= revisit included)");
  t("no non-2xx response", badResponses.length === 0, badResponses.join(" · "));

  await ctx.close();
  await browser.close();
  held.browser = null;

  if (errors.length) {
    results.fails += 1;
    console.log(`  ✗ no unexpected page errors — got ${errors.length}`);
    for (const e of errors) console.log(`      ${e}`);
  } else {
    results.passes += 1;
    console.log("  ✓ no unexpected page errors in this engine");
  }
}

let failed = 0;
for (const engine of toRun) {
  console.log(`\n${"=".repeat(72)}\n${engine}\n${"=".repeat(72)}`);
  const results = { passes: 0, fails: 0, skips: [] };
  const held = { browser: null };
  try {
    await journey(engine, results, held);
  } catch (e) {
    results.fails += 1;
    console.log(`  ✗ ${engine} threw mid-run: ${e.message}`);
  } finally {
    if (held.browser) await held.browser.close().catch(() => {});
  }
  console.log(`\n${engine}: ${results.passes} passed, ${results.fails} failed${results.skips.length ? ` (skipped: ${results.skips.join(", ")})` : ""}`);
  failed += results.fails;
}

server.close();
console.log(`\n${"=".repeat(72)}`);
console.log(failed ? `instance-journey ✗  ${failed} failed assertion(s)` : `instance-journey ✓  all assertions passed on ${toRun.join(", ")} (deploy dir: ${deployDir})`);
process.exit(failed ? 1 : 0);
