// build-instance.mjs — per-company instance build + unlisted-deploy prep (epic #38, ticket #44).
// Governing doc: docs/epics/per-company-brief.architecture.md §Stack (per-company deploy: `wrangler
// pages deploy` direct upload to an unlisted target) + §Boundaries (privacy — real-brand content
// lives only in the jobs folder and unlisted deploys, NEVER in this public repo; deploys are
// human-triggered). Folds spike 2.
//
// A standalone orchestrator — run FROM THE JOBS FOLDER the way agent-layer/build.mjs is (input paths
// resolve from cwd; --out is REQUIRED and MUST be OUTSIDE this repo). It compiles one company brief
// (#39's genCompanyPackage) + a derived pack (#40's tokens.<slug>.css) + a derivation trace + the
// #43 private-instance shell into a self-contained, deployable directory, then PRINTS the exact
// `wrangler pages deploy` command — the irreversible deploy stays an explicit human step
// (§Boundaries). A SIBLING of build.mjs, NOT a gen-* registered inside it.
//
// Standalone (from the jobs folder):
//   node ../ux-factory/agent-layer/build-instance.mjs <brief.md> --out <dir> \
//     --pack <tokens.<slug>.css> --trace <derivation.jsonl> [--compositions <dir>] \
//     [--name <s>] [--proto <url>] [--handoff <url>]
//
// --compositions adds the BESPOKE-PROTOTYPE step (epic #86, ticket #89): a pre-recorded composed
// view (a real record-composition run) is copied into the deploy dir with the vocabulary it
// validates against, referenced from INSTANCE_CONFIG, and gated by validateAssembly through the
// same refusal engine the reader's browser renders it with. Copy-not-run — no SDK here.

import { cpSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { parseCompanyBrief } from "./lib.mjs";
import { genCompanyPackage } from "./gen-company-package.mjs";
// The SAME engine the view uses to render a composed view — pure + DOM-free (agentic-renderer.mjs
// header), so validateAssembly can gate every copied proposal with it before an operator deploys.
import { validateComposition } from "../system/agentic-renderer.mjs";

// Repo assets resolve from the MODULE (agent-layer/.. = repo root); NEVER cwd (cwd is the jobs folder
// at runtime). The same module-relative-vs-cwd split gen-company-package.mjs + build.mjs use.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Physical-identity containment (inode + device) — mirrors gen-company-package.mjs's insideRepo: is
// `target` the repo root, or inside it? Catches a --out reaching the repo via a symlink or a
// differently-cased path that a lexical startsWith misses. `target` may not exist yet, so stat only
// its existing ancestors, walking to the filesystem root. Defense in depth over genCompanyPackage's
// own guard, and STRICTER: this refuses ANY in-repo --out (fictional or real), not only real packages.
function insideRepo(target) {
  const root = statSync(REPO_ROOT); // the repo root always exists
  let cur = resolve(target);
  while (true) {
    if (existsSync(cur)) {
      const s = statSync(cur);
      if (s.ino === root.ino && s.dev === root.dev) return true;
    }
    const parent = dirname(cur);
    if (parent === cur) return false; // reached the filesystem root
    cur = parent;
  }
}

const htmlEscape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Standalone _headers — the GUARANTEED privacy posture for an unlisted instance. Deliberately
// INDEPENDENT of the repo's _headers (whose noindex is "revisit at launch"): X-Robots-Tag: noindex
// is UNCONDITIONAL here, so a private instance is never accidentally de-noindexed if the public site
// later drops it. Security block + asset caching mirror the repo _headers / gen-headers.mjs.
const HEADERS = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Robots-Tag: noindex

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/system/*
  Cache-Control: public, max-age=300, must-revalidate

/scenarios/*
  Cache-Control: public, max-age=300, must-revalidate

/traces/*
  Cache-Control: public, max-age=300, must-revalidate

/proto/*
  Cache-Control: public, max-age=300, must-revalidate

/handoff/*
  Cache-Control: public, max-age=300, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

// Stamp the committed instance.html shell into a real instance's index.html. Two mechanisms
// (per-company-brief.architecture.md §Stamping / the #44 plan). Every Mechanism-A anchor is REQUIRED:
// a missing one is a HARD THROW, never a silent skip — else a real instance ships demo scaffolding.
//   A) anchored full-region rewrites — pack <link>, <title>, <meta description>, #instance-name text,
//      and the INSTANCE_CONFIG block (between its marker comments).
//   B) demo/real region toggling — delete every [data-when="demo"], un-hide every [data-when="real"],
//      strip the data-when marker, substitute {{name}} (HTML-escaped).
function stampShell(html, { name, slug, traceBase, links, composition }) {
  const nameHtml = htmlEscape(name);
  let out = html;

  // Strip the shell's head dev-comment FIRST. It documents the in-repo DEMO/fictional configuration
  // ("demo-configured to the fictional `scenarios/northwind`…") and carries internal ticket refs —
  // accurate for the committed shell, but it must never survive into a real instance's view-source
  // (honesty contract · ticket AC #1: a real instance shows only real copy, no demo/fictional
  // scaffolding). Anchored on its unique "<!-- instance.html" opening so it can't touch the
  // INSTANCE_CONFIG:start/end markers. Runs BEFORE Mechanism B, whose unanchored replaces would
  // otherwise mutate (not remove) this comment — which is why validateAssembly's residue checks
  // couldn't catch the leak. Other dev-comments (e.g. the <style> block's) stay by design: they carry
  // no demo/fictional labeling, and blanket comment-stripping would also remove the INSTANCE_CONFIG
  // markers that Mechanism A and validateAssembly rely on.
  out = out.replace(/[ \t]*<!-- instance\.html[\s\S]*?-->\n?/, "");

  const rewrite = (re, replacement, anchor) => {
    if (!re.test(out))
      throw new Error(`build-instance: stamping anchor not found in instance.html — ${anchor}. The shell's seams have drifted from build-instance.mjs; re-check instance.html.`);
    out = out.replace(re, replacement);
  };

  // --- Mechanism A: anchored rewrites (throw on any missing anchor) ---
  // pack CSS: /system/tokens.neutral.css → the company pack /system/tokens.<slug>.css
  rewrite(/<link rel="stylesheet" href="\/system\/tokens\.neutral\.css" \/>/,
    `<link rel="stylesheet" href="/system/tokens.${slug}.css" />`, "pack <link> (tokens.neutral.css)");

  // <title> — no "demo"
  rewrite(/<title>[\s\S]*?<\/title>/,
    `<title>Private instance · ${nameHtml} · Linards Berzins</title>`, "<title>");

  // <meta description> — honest, names the company, no "demo/fictional"
  const desc = `Speculative work — the factory pipeline (pre-seeded intake with reasoning, a live re-derivable design system, and the recorded agent run that proposed it) run on ${name}'s publicly stated product vision. Not affiliated with or endorsed by ${name}.`;
  rewrite(/<meta name="description" content="[\s\S]*?"\s*\/>/,
    `<meta name="description" content="${htmlEscape(desc)}" />`, '<meta name="description">');

  // #instance-name static fallback — stamped so a real instance never flashes the demo brand before
  // instance.mjs runs (instance.mjs also sets it from config.name at load; this is idempotent).
  rewrite(/<span id="instance-name">[^<]*<\/span>/,
    `<span id="instance-name">${nameHtml}</span>`, "#instance-name span");

  // INSTANCE_CONFIG block (between markers). JSON in a <script> context → JSON.stringify handles
  // quoting; escape `<` so a stray "</script>" or "<" inside a value can't break out of the element.
  // `composition` is present ONLY when this build shipped a bespoke composed view (--compositions);
  // without the key instance.mjs falls back to the prototype link, then the honest placeholder.
  const config = {
    package: `/scenarios/${slug}`,
    name,
    trace: { path: `/traces/${traceBase}` },
    ...(composition ? { composition } : {}),
    links: { prototype: (links && links.prototype) || null, handoff: (links && links.handoff) || null },
  };
  const configJson = JSON.stringify(config, null, 2).replace(/</g, "\\u003c").replace(/\n/g, "\n    ");
  const configBlock =
    `<!-- INSTANCE_CONFIG:start — build-instance.mjs replaces everything between these markers per company -->\n` +
    `  <script>\n    window.INSTANCE_CONFIG = ${configJson};\n  </script>\n` +
    `  <!-- INSTANCE_CONFIG:end -->`;
  rewrite(/<!-- INSTANCE_CONFIG:start[\s\S]*?INSTANCE_CONFIG:end -->/, configBlock, "INSTANCE_CONFIG markers");

  // --- Mechanism B: demo/real toggling ---
  // Delete every demo-only region (span or p carrying data-when="demo"), swallowing preceding
  // whitespace so no gap is left. We author these regions with no same-tag nesting, so the lazy
  // backreference match is exact.
  out = out.replace(/\s*<(span|p)\b[^>]*\bdata-when="demo"[^>]*>[\s\S]*?<\/\1>/g, "");
  // Un-hide every real-only region: drop the standalone `hidden` attribute from its opening tag.
  // NB: match `data-when="real"` WITHOUT a trailing \b — the char after the closing quote is a space,
  // and \b needs a word/non-word boundary, so `..."real"\b` fails when hidden follows (both non-word).
  out = out.replace(/<(\w+)\b([^>]*\bdata-when="real"[^>]*)>/g,
    (_, tag, attrs) => `<${tag}${attrs.replace(/\s+hidden(?=\s|\/|$)/g, "")}>`);
  // Drop the data-when marker attribute itself (demo regions already gone; strip the surviving real ones).
  out = out.replace(/\s+data-when="(?:demo|real)"/g, "");
  // Substitute the company name into kept real regions (HTML-escaped).
  out = out.replace(/\{\{name\}\}/g, nameHtml);

  return out;
}

// Validate the assembled deploy dir — the gate that catches a bad stamp or a missing asset before the
// operator deploys. Throws one aggregated Error naming every problem.
function validateAssembly(deployDir, { slug, traceBase, name }) {
  const html = readFileSync(join(deployDir, "index.html"), "utf8");
  const problems = [];

  // 1. No stamping residue.
  if (/data-when=/.test(html)) problems.push("residual data-when= attribute (a demo/real region was not toggled)");
  if (/\{\{/.test(html)) problems.push("residual {{ template token (a substitution was missed)");
  // No element kept a standalone `hidden` attribute (un-hide failed → invisible content). Strip the
  // <style> block first so CSS `overflow: hidden` never trips this.
  if (/<[a-zA-Z][^>]*\shidden(?=[\s/>])/.test(html.replace(/<style[\s\S]*?<\/style>/gi, " ")))
    problems.push("a real-only region kept its `hidden` attribute (un-hide failed) — that content would be invisible");

  // 2. Pack <link> points at the company pack, not the neutral one.
  if (!html.includes(`href="/system/tokens.${slug}.css"`)) problems.push(`pack <link> is not /system/tokens.${slug}.css`);
  if (/href="\/system\/tokens\.neutral\.css"/.test(html)) problems.push("pack <link> still points at tokens.neutral.css (not stamped)");

  // 3. <title> stamped, no "demo".
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ""])[1];
  if (/\bdemo\b/i.test(title)) problems.push(`<title> still contains "demo": ${title}`);

  // 4. INSTANCE_CONFIG parses (pure JSON now) to the expected shape.
  const region = (html.match(/<!-- INSTANCE_CONFIG:start[\s\S]*?INSTANCE_CONFIG:end -->/) || [, ""])[0];
  let config = null;
  if (!region) problems.push("INSTANCE_CONFIG markers missing");
  else {
    // Capture the assignment's RHS greedily up to the terminating `;` right before `</script>`. A lazy
    // `[\s\S]*?;` would stop at the FIRST `;` — truncating the JSON if any config value contains one
    // (e.g. a --proto/--handoff URL like `…/p?a=1;b=2`, or a ';'-bearing --name). Safe because the
    // config JSON escapes `<`→< (stampShell), so `</script>` appears exactly once in the region.
    const obj = region.match(/window\.INSTANCE_CONFIG\s*=\s*([\s\S]*);\s*<\/script>/);
    if (!obj) problems.push("INSTANCE_CONFIG assignment not found between markers");
    else { try { config = JSON.parse(obj[1]); } catch (e) { problems.push(`INSTANCE_CONFIG does not parse as JSON — ${e.message}`); } }
  }
  if (config) {
    if (config.package !== `/scenarios/${slug}`) problems.push(`INSTANCE_CONFIG.package !== /scenarios/${slug} (got ${JSON.stringify(config.package)})`);
    if (config.name !== name) problems.push(`INSTANCE_CONFIG.name !== ${JSON.stringify(name)} (got ${JSON.stringify(config.name)})`);
    if (!config.trace || config.trace.path !== `/traces/${traceBase}`) problems.push(`INSTANCE_CONFIG.trace.path !== /traces/${traceBase}`);
  }

  // 5. No "demo"/"fictional" left in RENDERED body text (strip comments, scripts, styles, tags first —
  //    the fictional/speculative label is package content rendered at runtime, never in this shell).
  const body = (html.match(/<body[\s\S]*<\/body>/) || [, ""])[0]
    .replace(/<!--[\s\S]*?-->/g, " ").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  if (/\bdemo\b/i.test(body)) problems.push('rendered body text still contains "demo" (a demo-only region was not tagged data-when="demo")');
  if (/\bfictional\b/i.test(body)) problems.push('rendered body text still contains "fictional"');

  // 6. Every referenced same-origin asset resolves in the deploy dir (chrome cross-links like /factory
  //    /contact are intentionally excluded — documented v1 limitation, they 404 pre-launch).
  const refs = new Set();
  for (const m of html.matchAll(/(?:href|src)="(\/(?:system|assets|scenarios|traces|proto|handoff)\/[^"]+)"/g)) refs.add(m[1]);
  let compositionIndex = null; // the parsed manifest, when this instance ships a composed view
  if (config) {
    refs.add(`${config.package}/intake.defaults.json`);
    refs.add(`${config.package}/copy.json`);
    if (config.trace && config.trace.path) refs.add(config.trace.path);
    if (config.composition) {
      refs.add(config.composition.index);
      refs.add(config.composition.vocab);
      // Each manifest entry's PROPOSAL must resolve. Its `trace` is deliberately NOT ref'd: the
      // per-composition PIV traces are not shipped with an instance (station 04 carries the headline
      // derivation run) — ref'ing them would fail every build.
      try {
        compositionIndex = JSON.parse(readFileSync(join(deployDir, config.composition.index.replace(/^\//, "")), "utf8"));
        if (!Array.isArray(compositionIndex) || compositionIndex.length === 0)
          problems.push(`${config.composition.index} carries no composed views (expected a non-empty manifest array)`);
        else for (const entry of compositionIndex) refs.add(entry.proposal);
      } catch (e) {
        compositionIndex = null;
        problems.push(`could not read the copied composition manifest ${config.composition.index} — ${e.message}`);
      }
    }
  }
  for (const ref of refs)
    if (typeof ref !== "string" || !existsSync(join(deployDir, ref.replace(/^\//, "")))) problems.push(`referenced asset missing in deploy dir: ${ref}`);

  // 6b. Every copied proposal VALIDATES against the copied vocabulary — the same refusal engine the
  //     view renders through, run here so a composition that the reader's browser would refuse can
  //     never reach a deploy. Runs only on files that resolved above — a missing one is already a
  //     problem, and re-reporting it as a validation failure would just double the noise.
  const resolved = (ref) => typeof ref === "string" && existsSync(join(deployDir, ref.replace(/^\//, "")));
  if (config && config.composition && Array.isArray(compositionIndex) && resolved(config.composition.vocab)) {
    try {
      const vocab = JSON.parse(readFileSync(join(deployDir, config.composition.vocab.replace(/^\//, "")), "utf8"));
      for (const entry of compositionIndex) {
        if (!resolved(entry.proposal)) continue;
        try {
          validateComposition(vocab, JSON.parse(readFileSync(join(deployDir, entry.proposal.replace(/^\//, "")), "utf8")), entry.slug);
        } catch (e) {
          problems.push(`composed view ${entry.proposal} is not renderable — ${e.message}`);
        }
      }
    } catch (e) {
      problems.push(`could not read the copied vocabulary ${config.composition.vocab} — ${e.message}`);
    }
  }

  // 7. _headers carries the unconditional noindex.
  const headersPath = join(deployDir, "_headers");
  if (!existsSync(headersPath) || !/X-Robots-Tag:\s*noindex/i.test(readFileSync(headersPath, "utf8")))
    problems.push("_headers missing or lacks X-Robots-Tag: noindex");

  if (problems.length) throw new Error(`build-instance: assembled instance failed validation:\n  - ${problems.join("\n  - ")}`);
}

// Compile briefPath + pack + trace + the shell into a self-contained deploy dir under outDir. Paths
// resolve from cwd; REPO_ROOT (the privacy boundary + the shell/assets source) resolves from this
// module. Returns { deployDir, slug, name, provenance, traceBase }.
export function buildInstance({ briefPath, outDir, packPath, tracePath, compositionsDir, name, links, publicOrigin }) {
  if (!briefPath) throw new Error("build-instance: <brief.md> is required");
  if (!outDir) throw new Error("build-instance: --out <dir> is required (must be OUTSIDE this repo)");
  // --public-origin is a DESIGNED HOOK, deliberately not implemented in v1 (per-company-brief
  // .architecture.md §Out of scope): PRODUCTION_HOST is empty, so there is no canonical public origin
  // to point chrome links at yet. Honest throw over a silent no-op.
  if (publicOrigin)
    throw new Error("build-instance: --public-origin (chrome cross-link rewriting) is a designed hook, deliberately NOT implemented in v1 — there is no canonical public origin yet (system/analytics.mjs PRODUCTION_HOST is empty). Deploy without it: the instance's own content renders fully; chrome cross-links stay inert until launch (per-company-brief.architecture.md §Out of scope).");

  const deployDir = resolve(outDir);
  // Out-of-repo guard — fail before any write. Stricter than genCompanyPackage's real-only guard.
  if (insideRepo(deployDir))
    throw new Error(`build-instance: refusing --out ${deployDir} — it resolves inside the public repo (${REPO_ROOT}); a per-company instance builds OUTSIDE the repo (nothing company-real is committed here — per-company-brief.architecture.md §Boundaries).`);

  // Validate the pack + trace inputs before any write.
  const packAbs = resolve(packPath || "");
  if (!packPath || !packAbs.endsWith(".css") || !existsSync(packAbs))
    throw new Error(`build-instance: --pack must be an existing .css pack file (got ${JSON.stringify(packPath)})`);
  const traceAbs = resolve(tracePath || "");
  if (!tracePath || !traceAbs.endsWith(".jsonl") || !existsSync(traceAbs))
    throw new Error(`build-instance: --trace must be an existing .jsonl derivation trace (got ${JSON.stringify(tracePath)})`);
  // --compositions is OPTIONAL (an instance with no bespoke prototype still builds). COPY-NOT-RUN,
  // exactly like --trace: the composed views come from a real record-composition run through
  // record → curate → validate; this builder never generates one (no SDK here, by design).
  const compAbs = compositionsDir ? resolve(compositionsDir) : null;
  if (compAbs && !existsSync(join(compAbs, "index.json")))
    throw new Error(`build-instance: --compositions must be an existing record-composition output dir containing index.json (got ${JSON.stringify(compositionsDir)} → ${join(compAbs, "index.json")})`);

  // Brief head → the instance display name default (genCompanyPackage re-parses + validates the rest).
  const { head } = parseCompanyBrief(briefPath);
  const instanceName = typeof name === "string" && name.trim() ? name.trim() : head.name;

  // Discard-on-failure: never leave a half-assembled OR invalid deploy dir on disk — an operator could
  // otherwise `wrangler pages deploy <deployDir>` it straight from shell history, bypassing this
  // builder's gate. Mirrors gen-company-package.mjs's preexisting-gated cleanup: remove ONLY a dir THIS
  // build created; if deployDir pre-existed we merely wrote into it and its prior contents may predate
  // us — leave them for the operator (genCompanyPackage's own inner cleanup is idempotent with this).
  const preexisting = existsSync(deployDir);
  try {
    // Compile brief → deployDir/scenarios/<slug> (self-validates; enforces its own privacy guard too).
    const pkg = genCompanyPackage({ briefPath, outDir: join(deployDir, "scenarios") });
    const slug = pkg.slug;

    // Assemble the self-contained deploy dir. system/ is copied WHOLESALE (robust to the shell's
    // transitive import closure — do not hand-track it; the extra reference packs are harmless).
    cpSync(join(REPO_ROOT, "system"), join(deployDir, "system"), { recursive: true });
    cpSync(join(REPO_ROOT, "assets"), join(deployDir, "assets"), { recursive: true });
    copyFileSync(packAbs, join(deployDir, "system", `tokens.${slug}.css`));
    const traceBase = basename(traceAbs);
    mkdirSync(join(deployDir, "traces"), { recursive: true });
    copyFileSync(traceAbs, join(deployDir, "traces", traceBase));
    writeFileSync(join(deployDir, "_headers"), HEADERS);

    // Bespoke-prototype step (epic #86, ticket #89) — copy the pre-recorded composed views in, and
    // the design-system vocabulary they validate against. vocabulary.json is GENERATED design-system
    // output (gen-vocabulary.mjs), never company-real, so it sources from REPO_ROOT and is safe to
    // ship. The manifest's proposal paths must already be /proto/compositions/<slug>/… (run
    // record-composition with scenario == slug) — validateAssembly fails loudly on a mismatch.
    let composition = null;
    if (compAbs) {
      cpSync(compAbs, join(deployDir, "proto", "compositions", slug), { recursive: true });
      mkdirSync(join(deployDir, "handoff", "verdant"), { recursive: true });
      copyFileSync(join(REPO_ROOT, "handoff", "verdant", "vocabulary.json"), join(deployDir, "handoff", "verdant", "vocabulary.json"));
      composition = { index: `/proto/compositions/${slug}/index.json`, vocab: "/handoff/verdant/vocabulary.json" };
    }

    // Stamp the shell → index.html (renamed → bare root URL).
    const stamped = stampShell(readFileSync(join(REPO_ROOT, "instance.html"), "utf8"),
      { name: instanceName, slug, traceBase, links, composition });
    writeFileSync(join(deployDir, "index.html"), stamped);

    // Gate: the assembled dir must validate before the operator deploys.
    validateAssembly(deployDir, { slug, traceBase, name: instanceName });

    // Manifest parse is safe here: validateAssembly above already gated it.
    const views = composition
      ? JSON.parse(readFileSync(join(deployDir, "proto", "compositions", slug, "index.json"), "utf8")).length
      : 0;
    return { deployDir, slug, name: instanceName, provenance: pkg.provenance, traceBase, views };
  } catch (e) {
    if (!preexisting) rmSync(deployDir, { recursive: true, force: true }); // discard only what we created
    throw e; // preserve the original error (bad brief, bad stamp, or failed validation)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const argv = process.argv.slice(2);
    const briefPath = argv[0] && !argv[0].startsWith("--") ? argv[0] : null;
    const flag = (n) => { const i = argv.indexOf(n); return i !== -1 ? argv[i + 1] : null; };
    const outDir = flag("--out");
    const packPath = flag("--pack");
    const tracePath = flag("--trace");
    const compositionsDir = flag("--compositions");
    if (!briefPath || !outDir || !packPath || !tracePath)
      throw new Error(
        "usage: node agent-layer/build-instance.mjs <brief.md> --out <dir> --pack <tokens.<slug>.css> --trace <derivation.jsonl> [--compositions <dir>] [--name <s>] [--proto <url>] [--handoff <url>]\n" +
        "  --compositions  a pre-recorded record-composition output dir (its index.json proposal paths must be\n" +
        "                  /proto/compositions/<slug>/…); copied in and validated here, never generated here\n" +
        "  run FROM THE JOBS FOLDER; --out MUST be OUTSIDE this repo (nothing company-real is committed here)");
    const links = { prototype: flag("--proto"), handoff: flag("--handoff") };
    const r = buildInstance({ briefPath, outDir, packPath, tracePath, compositionsDir, name: flag("--name"), links, publicOrigin: flag("--public-origin") });

    // Non-guessable deploy target — the <rand> suffix keeps the URL unguessable from the company name
    // (spike 2's non-discoverability requirement). project/branch naming per the wrangler skill.
    const target = `inst-${r.slug}-${randomBytes(3).toString("hex")}`;
    console.log(`build-instance ${r.slug.padEnd(10)} ✓  ${r.provenance} · name "${r.name}" · trace ${r.traceBase}` +
      (r.views ? ` · prototype ${r.views} composed view${r.views === 1 ? "" : "s"}` : "") + ` → ${r.deployDir}`);
    console.log("\nNext — DEPLOY is the operator's explicit step (irreversible + outward-facing; needs Cloudflare auth, separate from the SDK login):\n");
    console.log("  # auth once — either:  npx wrangler login   OR   export CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=…  (token: Account · Cloudflare Pages · Edit)");
    console.log(`  npx wrangler pages project create ${target} --production-branch main`);
    console.log(`  npx wrangler pages deploy ${r.deployDir} --project-name ${target} --branch main`);
    console.log(`\n  → live at https://${target}.pages.dev/  (noindex + non-guessable).   Tear down:  npx wrangler pages project delete ${target} --yes`);
    console.log("  Nothing is deployed until you run the commands above.");
  } catch (e) {
    console.error(`build-instance ✗  ${e.message}`);
    process.exit(1);
  }
}
