// build-instance.mjs — per-company instance build + unlisted-deploy prep (epic #38, ticket #44;
// v2 — the studio re-shell — epic #202, ticket #222).
// Governing doc: docs/epics/per-company-brief.architecture.md §Stack (per-company deploy: `wrangler
// pages deploy` direct upload to an unlisted target) + §Boundaries (privacy — real-brand content
// lives only in the jobs folder and unlisted deploys, NEVER in this public repo; deploys are
// human-triggered) + docs/epics/prototype-studio.prd.md §9. Folds spike 2.
//
// A standalone orchestrator — run FROM THE JOBS FOLDER the way agent-layer/build.mjs is (input paths
// resolve from cwd; --out is REQUIRED and MUST be OUTSIDE this repo). It compiles one company brief
// (#39's genCompanyPackage) + a derived pack (#40's tokens.<slug>.css) + a derivation trace + a
// RECORDED BUILD RUN (#222: the studio band's replay — five committed files, copied never run) +
// the #43 private-instance shell into a self-contained, deployable directory, then PRINTS the exact
// `wrangler pages deploy` command — the irreversible deploy stays an explicit human step
// (§Boundaries). A SIBLING of build.mjs, NOT a gen-* registered inside it.
//
// Standalone (from the jobs folder):
//   node ../ux-factory/agent-layer/build-instance.mjs <brief.md> --out <dir> \
//     --pack <tokens.<slug>.css> --trace <derivation.jsonl> --replay <slug> \
//     [--name <s>] [--handoff <url>]
//
// --replay names a recorded build run by slug (epic #202 ticket #203's recorder): the five files —
// replay/<slug>.json, replay/<slug>.board.json, replay/briefs/<slug>.md, traces/<slug>.jsonl,
// traces/<slug>.raw.jsonl — are copied from THIS REPO's tree at the same root-absolute paths the
// projection self-describes with. COPY-NOT-RUN, the --trace discipline: this builder never records
// and never generates; a company-real run is recorded through the repo tooling into the WORKING
// TREE and NEVER COMMITTED (`git clean` after building) — the recorder and generator are
// repo-anchored, so "copy" means "copy whatever the tree holds" and the no-commit rule is operator
// discipline, stated here and in the usage text.
//
// v2 retired --compositions and --proto with the composed-view slot they fed (#89 → #222): the
// studio band IS the bespoke prototype now. It also GENERATES the per-instance chrome config
// (system/client.instance.config.js — closing #160: the deployed chrome used to 404 on every
// public-site route), and validateAssembly now refuses ANY internal reference that does not
// resolve inside the deploy dir — the old chrome exclusion is gone.
//
// The fictional:false privacy boundary is NOT here: gen-company-package.mjs:11-13 refuses to
// compile a real company's package into the repo, and portal/lib/builder.mjs refuses to run a
// composition over one (build-checks group 8). This file's half is the --out guard below.

import { cpSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { parseCompanyBrief } from "./lib.mjs";
import { genCompanyPackage } from "./gen-company-package.mjs";

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
//      the chrome config <script> line (#222/#160), and the INSTANCE_CONFIG block (between its
//      marker comments).
//   B) demo/real region toggling — delete every [data-when="demo"], un-hide every [data-when="real"],
//      strip the data-when marker, substitute {{name}} (HTML-escaped).
// EXPORTED (#222) so tooling/build-checks.mjs can drive it over the REAL shell text with a
// synthetic config in CI — pure: text in, text out, no filesystem.
export function stampShell(html, { name, slug, traceBase, links, replaySlug }) {
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

  // The chrome config <script> (#222, closing #160): the deployed instance loads the GENERATED
  // per-instance chrome, never the repo's neutral IA — whose routes do not exist in a deploy dir.
  rewrite(/<script src="\/system\/client\.neutral\.config\.js"><\/script>/,
    `<script src="/system/client.instance.config.js"></script>`,
    "chrome config <script> (client.neutral.config.js)");

  // INSTANCE_CONFIG block (between markers). JSON in a <script> context → JSON.stringify handles
  // quoting; escape `<` so a stray "</script>" or "<" inside a value can't break out of the element.
  // v2 (#222): `replay` names the recorded build run the studio band plays; `composition` and
  // `links.prototype` retired with the composed-view slot.
  const config = {
    package: `/scenarios/${slug}`,
    name,
    trace: { path: `/traces/${traceBase}` },
    replay: { artifact: `/replay/${replaySlug}.json`, trace: `/traces/${replaySlug}.jsonl` },
    links: { handoff: (links && links.handoff) || null },
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

// Which references are deploy-safe (#160 → #222). A deployed instance carries ONLY itself, so an
// internal reference must resolve inside the deploy dir; the only sanctioned externals are mailto:
// and https: (the designed --public-origin hook is still not implemented, so there is no public
// origin to rewrite a route onto). Fragments are same-page by definition; query/hash suffixes are
// stripped before the lookup. Anything else — http:, protocol-relative, bare-relative,
// javascript: — is refused: none of them can be proven safe from here.
// EXPORTED and PURE (the caller supplies `resolves(rootAbsolutePath)`), so tooling/build-checks.mjs
// drives it over a synthetic deploy listing in CI.
export function auditRefs(refs, resolves) {
  const problems = [];
  for (const ref of refs) {
    if (typeof ref !== "string" || !ref.trim()) { problems.push(`empty reference ${JSON.stringify(ref)}`); continue; }
    if (ref.startsWith("#") || ref.startsWith("mailto:") || ref.startsWith("https:")) continue;
    if (ref.startsWith("/") && !ref.startsWith("//")) {
      const path = ref.replace(/[?#].*$/, "");
      if (!resolves(path)) problems.push(`internal reference does not resolve in the deploy dir: ${ref}`);
      continue;
    }
    problems.push(`reference is neither in-dir, mailto: nor https:: ${ref}`);
  }
  return problems;
}

// The generated per-instance chrome config (#222, closing #160): brand name = the company's, an
// EMPTY nav (site.js:29 tolerates it — a bare brand header; the hero's own jump nav covers the
// page's sections), the contact CTA as mailto, and a footer whose every link is a file this deploy
// dir actually carries, plus the two sanctioned externals. Emitted as `window.CLIENT_CONFIG =
// <pure JSON>;` so validateAssembly can parse it back and audit every link through auditRefs.
function instanceChromeConfig({ name, slug }) {
  return {
    brand: {
      name,
      homeHref: "/",
      logo: {
        default: "/assets/logo-neutral.svg",
        onDark: "/assets/logo-neutral-on-dark.svg",
      },
    },
    nav: [],
    cta: { label: "Get in touch", href: "mailto:linardsberzins@gmail.com" },
    footer: {
      tagline:
        "A working factory for UX engineering: a token-contract design system, generated "
        + "artifacts committed in the open, agents at build time only. Built by Linards Berzins.",
      columns: [
        {
          title: "The system",
          items: [
            { label: "Token contract", href: "/system/tokens.contract.css" },
            { label: `The ${name} pack`, href: `/system/tokens.${slug}.css` },
            { label: "Component styles", href: "/system/components.css" },
            { label: "Source (GitHub)", href: "https://github.com/linardsb/ux-factory" },
            { label: "Contact", href: "mailto:linardsberzins@gmail.com" },
          ],
        },
      ],
      copyright: "© 2026 Linards Berzins · ux factory",
    },
  };
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
  // <style> block first so CSS `overflow: hidden` never trips this — and strip the studio's
  // [data-studio-notice] node too (#222): the shared-link notice is hidden AT REST by design
  // (#210's rule — a page reached without a ?b= never fills it), carries no data-when, and is the
  // ONE sanctioned standalone `hidden` in the shell. Anything else with a bare `hidden` is still a
  // failed un-hide.
  const hiddenScan = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*\bdata-studio-notice\b[^>]*>/g, " ");
  if (/<[a-zA-Z][^>]*\shidden(?=[\s/>])/.test(hiddenScan))
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
    // v2 shape (#222): the recorded run in, the composed-view slot out.
    if (!config.replay || typeof config.replay.artifact !== "string" || typeof config.replay.trace !== "string")
      problems.push("INSTANCE_CONFIG.replay { artifact, trace } is missing or malformed — v2 requires the recorded build run");
    if (config.composition) problems.push("INSTANCE_CONFIG.composition is v1 — the composed-view slot retired at #222");
    if (config.links && "prototype" in config.links) problems.push("INSTANCE_CONFIG.links.prototype is v1 — retired at #222");
  }

  // 5. No "demo"/"fictional" left in RENDERED body text (strip comments, scripts, styles, tags first —
  //    the fictional/speculative label is package content rendered at runtime, never in this shell).
  const body = (html.match(/<body[\s\S]*<\/body>/) || [, ""])[0]
    .replace(/<!--[\s\S]*?-->/g, " ").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  if (/\bdemo\b/i.test(body)) problems.push('rendered body text still contains "demo" (a demo-only region was not tagged data-when="demo")');
  if (/\bfictional\b/i.test(body)) problems.push('rendered body text still contains "fictional"');

  // 6. EVERY reference resolves — #160 CLOSED: the old "chrome cross-links intentionally excluded"
  //    carve-out is gone. All href/src values in the stamped HTML, everything INSTANCE_CONFIG
  //    names, and (6d) every link in the generated chrome config go through the one auditRefs
  //    predicate: in-dir, mailto: or https:, nothing else.
  const resolves = (p) => existsSync(join(deployDir, String(p).replace(/^\//, "")));
  const refs = new Set();
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) refs.add(m[1]);
  if (config) {
    refs.add(`${config.package}/intake.defaults.json`);
    refs.add(`${config.package}/copy.json`);
    if (config.trace && config.trace.path) refs.add(config.trace.path);
    if (config.replay && typeof config.replay.artifact === "string") refs.add(config.replay.artifact);
    if (config.replay && typeof config.replay.trace === "string") refs.add(config.replay.trace);
  }
  problems.push(...auditRefs([...refs], resolves));

  // 6c. The recorded run (#222): the copied artifact parses, carries ops, and SELF-DESCRIBES with
  //     paths that all shipped — the projection's `source` values are root-absolute (replay/README)
  //     and the driver renders them as the chrome's links, so a source path missing from the deploy
  //     dir is a dead link on the built page.
  if (config && config.replay && typeof config.replay.artifact === "string" && resolves(config.replay.artifact)) {
    try {
      const artifact = JSON.parse(readFileSync(join(deployDir, config.replay.artifact.replace(/^\//, "")), "utf8"));
      if (!Array.isArray(artifact.ops) || !artifact.ops.length)
        problems.push(`${config.replay.artifact} carries no ops — not a replay projection`);
      const src = artifact.source && typeof artifact.source === "object" ? artifact.source : {};
      for (const [k, v] of Object.entries(src))
        if (typeof v === "string" && v.startsWith("/") && !resolves(v))
          problems.push(`replay artifact source.${k} names a path not in the deploy dir: ${v}`);
      if (typeof src.curatedTrace === "string" && src.curatedTrace !== config.replay.trace)
        problems.push(`replay artifact source.curatedTrace (${src.curatedTrace}) !== INSTANCE_CONFIG.replay.trace (${config.replay.trace}) — the chrome and the config would link different traces`);
    } catch (e) {
      problems.push(`replay artifact ${config.replay.artifact} does not parse — ${e.message}`);
    }
  }

  // 6d. The generated chrome config (#160): present, loaded by the stamped HTML, parses as pure
  //     JSON, and every link in it deploy-safe through the same predicate.
  const chromePath = join(deployDir, "system", "client.instance.config.js");
  if (!existsSync(chromePath)) problems.push("system/client.instance.config.js missing (the generated chrome config)");
  else {
    const text = readFileSync(chromePath, "utf8");
    const assignment = text.match(/window\.CLIENT_CONFIG\s*=\s*([\s\S]*);\s*$/);
    if (!assignment) problems.push("client.instance.config.js carries no window.CLIENT_CONFIG assignment");
    else {
      try {
        const chrome = JSON.parse(assignment[1]);
        const chromeRefs = [];
        (function walk(v) {
          if (Array.isArray(v)) { v.forEach(walk); return; }
          if (v && typeof v === "object") {
            for (const [k, val] of Object.entries(v)) {
              if (typeof val === "string" && ["href", "homeHref", "default", "onDark"].includes(k)) chromeRefs.push(val);
              else walk(val);
            }
          }
        })(chrome);
        problems.push(...auditRefs(chromeRefs, resolves).map((p) => `chrome config: ${p}`));
      } catch (e) {
        problems.push(`client.instance.config.js RHS is not JSON — ${e.message}`);
      }
    }
  }
  if (!html.includes('src="/system/client.instance.config.js"')) problems.push("stamped HTML does not load the generated chrome config");
  if (/client\.neutral\.config\.js/.test(html)) problems.push("stamped HTML still loads client.neutral.config.js (the chrome anchor was not stamped)");

  // 7. _headers carries the unconditional noindex.
  const headersPath = join(deployDir, "_headers");
  if (!existsSync(headersPath) || !/X-Robots-Tag:\s*noindex/i.test(readFileSync(headersPath, "utf8")))
    problems.push("_headers missing or lacks X-Robots-Tag: noindex");

  if (problems.length) throw new Error(`build-instance: assembled instance failed validation:\n  - ${problems.join("\n  - ")}`);
}

// Compile briefPath + pack + trace + the recorded run + the shell into a self-contained deploy dir
// under outDir. Paths resolve from cwd; REPO_ROOT (the privacy boundary + the shell/assets/run
// source) resolves from this module. Returns { deployDir, slug, name, provenance, traceBase }.
export function buildInstance({ briefPath, outDir, packPath, tracePath, replaySlug, name, links, publicOrigin }) {
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
  // --replay is REQUIRED (#222): the studio band plays a recorded build run, and an instance built
  // without one would fall back to the PUBLIC demo run — the one thing a "built for YOU" page must
  // never show. COPY-NOT-RUN, the --trace discipline: the five files come from a real
  // portal/record-build.mjs run projected by agent-layer/gen-replay.mjs, resolved from THIS repo's
  // tree (working tree included — a company-real run is recorded there and never committed).
  if (typeof replaySlug !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(replaySlug))
    throw new Error(`build-instance: --replay <slug> is required — a recorded build run's slug, e.g. build-<company>-<subject> (got ${JSON.stringify(replaySlug)})`);
  const replayFiles = [
    `replay/${replaySlug}.json`,
    `replay/${replaySlug}.board.json`,
    `replay/briefs/${replaySlug}.md`,
    `traces/${replaySlug}.jsonl`,
    `traces/${replaySlug}.raw.jsonl`,
  ];
  for (const rel of replayFiles)
    if (!existsSync(join(REPO_ROOT, rel)))
      throw new Error(`build-instance: --replay ${replaySlug} — missing ${join(REPO_ROOT, rel)}. Record the run first (node portal/record-build.mjs --slug ${replaySlug}) and project it (node agent-layer/gen-replay.mjs).`);

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

    // The recorded run (#222) — copy the five files at the SAME root-absolute paths the projection
    // self-describes with (its `source` values), so the driver's chrome links resolve unchanged.
    // Presence was validated before any write; validateAssembly re-checks the copied artifact.
    for (const rel of replayFiles) {
      mkdirSync(dirname(join(deployDir, rel)), { recursive: true });
      copyFileSync(join(REPO_ROOT, rel), join(deployDir, rel));
    }

    // The studio's docs chain (#222) — ALWAYS copied now: studio-compile.mjs fetches
    // vocabulary.json on first compile and studio-docs.mjs's DOCS_SOURCES adds pack.json (its
    // third source, system-graph.json, rides the wholesale system/ copy). Both are GENERATED
    // design-system output, never company-real, so they source from REPO_ROOT and are safe to ship.
    mkdirSync(join(deployDir, "handoff", "verdant"), { recursive: true });
    for (const f of ["pack.json", "vocabulary.json"])
      copyFileSync(join(REPO_ROOT, "handoff", "verdant", f), join(deployDir, "handoff", "verdant", f));

    // The per-instance chrome config (#222, closing #160) — written AFTER the wholesale system/
    // copy so nothing overwrites it. Pure JSON RHS on purpose: validateAssembly parses it back and
    // audits every link through auditRefs.
    const chrome = instanceChromeConfig({ name: instanceName, slug });
    writeFileSync(join(deployDir, "system", "client.instance.config.js"),
      "// GENERATED by agent-layer/build-instance.mjs (#222) — the per-instance chrome config (#160):\n"
      + "// every internal link resolves inside this deploy dir; externals are mailto/GitHub only.\n"
      + `window.CLIENT_CONFIG = ${JSON.stringify(chrome, null, 2)};\n`);

    // Stamp the shell → index.html (renamed → bare root URL).
    const stamped = stampShell(readFileSync(join(REPO_ROOT, "instance.html"), "utf8"),
      { name: instanceName, slug, traceBase, links, replaySlug });
    writeFileSync(join(deployDir, "index.html"), stamped);

    // Gate: the assembled dir must validate before the operator deploys.
    validateAssembly(deployDir, { slug, traceBase, name: instanceName });

    return { deployDir, slug, name: instanceName, provenance: pkg.provenance, traceBase, replaySlug };
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
    const replaySlug = flag("--replay");
    if (!briefPath || !outDir || !packPath || !tracePath || !replaySlug)
      throw new Error(
        "usage: node agent-layer/build-instance.mjs <brief.md> --out <dir> --pack <tokens.<slug>.css> --trace <derivation.jsonl> --replay <slug> [--name <s>] [--handoff <url>]\n" +
        "  --replay  a recorded build run's slug (portal/record-build.mjs → agent-layer/gen-replay.mjs);\n" +
        "            its five files are copied from this repo's tree, never recorded or generated here.\n" +
        "            A company-real run lives in the WORKING TREE only — never commit it; `git clean` after building.\n" +
        "  run FROM THE JOBS FOLDER; --out MUST be OUTSIDE this repo (nothing company-real is committed here)");
    const links = { handoff: flag("--handoff") };
    const r = buildInstance({ briefPath, outDir, packPath, tracePath, replaySlug, name: flag("--name"), links, publicOrigin: flag("--public-origin") });

    // Non-guessable deploy target — the <rand> suffix keeps the URL unguessable from the company name
    // (spike 2's non-discoverability requirement). project/branch naming per the wrangler skill.
    const target = `inst-${r.slug}-${randomBytes(3).toString("hex")}`;
    console.log(`build-instance ${r.slug.padEnd(10)} ✓  ${r.provenance} · name "${r.name}" · trace ${r.traceBase}` +
      ` · replay ${r.replaySlug}` + ` → ${r.deployDir}`);
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
