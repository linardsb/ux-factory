// tooling/vt-stack-audit.mjs — the audit that #171 wishes it had run before naming anything
// (epic #164, ticket #171; .claude/plans/build-vt-morphs-171.md). Written FOR #172, which rolls
// view transitions out site-wide and has to do this on every page it touches.
//
// THE RULE THIS EXISTS TO ENFORCE. `view-transition-name` is inert in what an element PAINTS. It is
// not inert in how that element STACKS: naming it makes it a stacking context AND a containing block
// for absolutely and fixed positioned descendants. #171 shipped a real at-rest regression through
// exactly this — naming the breadboard's places promoted them into the same paint step as the
// absolutely positioned SVG that draws the connection lines, and since the places come after it in
// source order, every line was covered and clipped. The pixel gate could not catch it: the gate
// regenerates its own baseline from the same tree, so it re-baselined the bug and went green.
//
// Two hazards, checked separately, because they fail differently:
//
//   A · LAYOUT.  A named element becomes the containing block for abs/fixed descendants, so anything
//                that was positioned against an ancestor FURTHER UP moves. Detected by measuring
//                every box, removing every name, and measuring again. Elements that are merely
//                ANIMATING are discounted, and which ones those are is asked of the engine rather
//                than inferred from repeated samples: the hero's `breathe` pill is on a 3s loop, so
//                two samples agree at some phases and disagree at others, and a sample-based
//                calibration called it a layout shift in 2 of 6 states.
//
//   B · PAINT.   A positioned element that OVERLAPS a named element from outside its subtree can flip
//                order. Every such pair needs an explicit z-index that decides it; a pair where the
//                positioned element is `z-index: auto` is the #171 bug. Reported for judgement rather
//                than failed, because an overlap is only wrong if the resulting order is wrong — but
//                every one of them has to be looked at.
//
// Run it against any page; /build gets a state matrix because its named elements only coexist with
// the line overlay in states the gate never captures:
//   node tooling/visual-regression/serve.mjs &
//   node tooling/vt-stack-audit.mjs [/build.html]

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(`${path.join(HERE, "visual-regression")}${path.sep}`);
const pw = require("@playwright/test");

const BASE = process.env.BASE || "http://127.0.0.1:4757";
const PAGE = process.argv[2] || "/build.html";

// Identity is the INDEX plus the tag, so a re-render that changes text does not read as a move.
const MEASURE = () => [...document.querySelectorAll("body *")].map((e, i) => {
  const r = e.getBoundingClientRect();
  return `${i}|${e.tagName}|${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`;
});

const KILL_NAMES = () => {
  const s = document.createElement("style");
  s.textContent = "*, *::before, *::after { view-transition-name: none !important; }";
  document.head.appendChild(s);
  for (const e of document.querySelectorAll("[style*='view-transition']")) e.style.removeProperty("view-transition-name");
};

// Indices of elements with a running animation, so hazard A can discount them.
const ANIMATING = () => [...document.querySelectorAll("body *")]
  .map((e, i) => (e.getAnimations({ subtree: false }).some((a) => a.playState === "running") ? String(i) : null))
  .filter(Boolean);

const NAMED = () => [...document.querySelectorAll("body *")]
  .map((e) => getComputedStyle(e).viewTransitionName)
  .filter((v) => v && v !== "none");

const PAINT_RISK = () => {
  const cls = (e) => (typeof e.className === "string" ? e.className : e.getAttribute("class") || "") || "(no class)";
  const all = [...document.querySelectorAll("body *")];
  const named = all.filter((e) => { const v = getComputedStyle(e).viewTransitionName; return v && v !== "none"; });
  const positioned = all.filter((e) => ["absolute", "fixed", "sticky"].includes(getComputedStyle(e).position));
  const out = [];
  for (const n of named) {
    const nr = n.getBoundingClientRect();
    if (!nr.width || !nr.height) continue;
    for (const p of positioned) {
      if (n.contains(p) || p.contains(n)) continue; // inside the subtree is hazard A, not B
      const pr = p.getBoundingClientRect();
      if (!pr.width || !pr.height) continue;
      if (!(pr.left < nr.right && pr.right > nr.left && pr.top < nr.bottom && pr.bottom > nr.top)) continue;
      const z = getComputedStyle(p).zIndex;
      out.push({ node: p, name: getComputedStyle(n).viewTransitionName, el: `${p.tagName}.${cls(p)}`.slice(0, 46), z });
    }
  }
  // A positioned element nested INSIDE another candidate has its order decided by that ancestor's
  // stacking context, not by its own z-index — the dock's ruler-fill/tick sit inside ASIDE.ruler
  // (z=40) and reported as unresolved `auto` until this filter existed. Report the outermost only.
  const outer = out.filter((h) => !out.some((o) => o.node !== h.node && o.node.contains(h.node)));
  const seen = new Set();
  return outer
    .filter((h) => { const k = `${h.name}|${h.el}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map(({ name, el, z }) => ({ name, el, z }));
};

const settleBuild = async (p) => {
  await p.waitForSelector("[data-build-keep='ready']", { timeout: 20000 });
  await p.evaluate(() => document.getElementById("act-pattern").scrollIntoView());
  await p.waitForSelector("[data-pattern-stage='ready']", { timeout: 20000 });
};

// /build's named elements only meet the line overlay in states the pixel gate never captures, so
// the audit drives them. Any other page is audited at rest.
const BUILD_STATES = {
  "default board": async () => {},
  "shape=stream (feed)": async (p) => p.evaluate(() => import("/system/build-questions.mjs").then((m) => m.setAnswers({ shape: "stream" }))),
  "shape=steps (onboarding)": async (p) => p.evaluate(() => import("/system/build-questions.mjs").then((m) => m.setAnswers({ shape: "steps" }))),
  "connect mode on": async (p) => p.locator("[data-place='p1'] .bx-bb-connect").first().click(),
  "derived pack on the stage": async (p) => {
    await p.locator("[data-build-color]").fill("#7c3aed");
    await p.locator("[data-build-derive]").click();
    await p.waitForFunction(() => document.getElementById("build-stage").style.length > 0);
  },
  "board emptied to zero places": async (p) => {
    for (let i = 0; i < 8; i += 1) {
      const x = p.locator("[data-bb-places] .bx-bb-place .bx-bb-place-head .bx-bb-remove").first();
      if (!(await x.count())) break;
      await x.click();
      await p.waitForTimeout(150);
    }
  },
};

const isBuild = PAGE.includes("build");
const states = isBuild ? BUILD_STATES : { "at rest": async () => {} };

let moved = 0;
let unresolved = 0;
const browser = await pw.chromium.launch();
console.log(`vt-stack-audit → ${BASE}${PAGE}`);
for (const [label, drive] of Object.entries(states)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${PAGE}`, { waitUntil: "load" });
  if (isBuild) await settleBuild(page); else await page.waitForTimeout(1200);
  await drive(page);
  await page.waitForTimeout(800);

  const names = await page.evaluate(NAMED);
  const risks = await page.evaluate(PAINT_RISK);

  const b = await page.evaluate(MEASURE);
  const noise = new Set(await page.evaluate(ANIMATING));

  await page.evaluate(KILL_NAMES);
  await page.waitForTimeout(320);
  const c = await page.evaluate(MEASURE);
  const shifted = b
    .filter((row, i) => row !== c[i])
    .filter((row) => !noise.has(row.split("|")[0]))
    // A row measuring 0,0,0,0 at rest had NO box at the first sample — removing a name cannot
    // give a boxless element a box, so any delta is the element becoming measurable between the
    // two samples (lazy render), not a containing-block shift. Proven by the no-op control in
    // #190: the identical delta appears with the names left intact. Zero-at-rest only — a real
    // shift that COLLAPSES a box still reports (its rest sample is non-zero).
    .filter((row) => {
      const [, , rect] = row.split("|");
      return rect !== "0,0,0,0";
    });

  console.log(`\n── ${label}  (${names.length} named element(s): ${[...new Set(names)].join(", ") || "none"})`);
  if (shifted.length) {
    moved += 1;
    console.log(`   A · layout   ✗ ${shifted.length} element(s) move when the names are removed — a named ancestor became their containing block`);
    shifted.slice(0, 8).forEach((row) => console.log(`        ${row}  →  ${c[b.indexOf(row)] ?? "?"}`));
  } else {
    console.log(`   A · layout   ✓ nothing moves when the names are removed${noise.size ? `  (${noise.size} animating element(s) discounted)` : ""}`);
  }

  const auto = risks.filter((h) => h.z === "auto");
  if (!risks.length) {
    console.log("   B · paint    ✓ nothing positioned overlaps a named element from outside");
  } else {
    console.log(`   B · paint    ${auto.length ? `✗ ${auto.length} of ${risks.length} overlap(s) have NO explicit z-index` : `✓ all ${risks.length} overlap(s) are decided by an explicit z-index`}`);
    for (const h of risks) console.log(`        ${h.z === "auto" ? "✗" : "·"} ${h.name} × ${h.el}  z=${h.z}`);
    unresolved += auto.length;
  }
  await ctx.close();
}
await browser.close();

const bad = moved + unresolved;
console.log(bad
  ? `\nvt-stack-audit ✗  ${moved} state(s) with layout shift · ${unresolved} overlap(s) with no explicit z-index`
  : "\nvt-stack-audit ✓  no layout shift · every named-element overlap is decided by an explicit z-index");
process.exit(bad ? 1 : 0);
