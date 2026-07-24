# Feature: Per-company build + unlisted deploy from the jobs folder (issue #44, epic #38 — folds spike 2)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and paths. `genCompanyPackage` lives in `agent-layer/gen-company-package.mjs`; `parseCompanyBrief` / `parseLedger` in `agent-layer/lib.mjs`; `validatePackage` in `scenarios/validate.mjs`. Import from the right files.

## Feature Description

A generic, human-triggered orchestration script — run **from the jobs folder** the way `agent-layer/build.mjs` is — that compiles one company brief (via #39's `genCompanyPackage`) plus a derived pack (from #40) plus the #43 private-instance shell into a **self-contained, deployable instance directory OUTSIDE this repo**, then hands the operator the exact `wrangler pages deploy` direct-upload command to an **unlisted** target. It folds **spike 2**: one throwaway build on fictional content is deployed, the full flow is timed, and the live instance is verified to serve the `_headers` noindex/security posture and be non-discoverable. The spike's outcome and the two coupled epic open questions (access control on private links; route/naming convention) are written back into the architecture doc.

Nothing company-real is ever committed to this public repo — the deliberate, scoped exception to "deploy = commit the artifacts," which continues to govern the public site.

## User Story

As **the portfolio owner applying to a company**
I want to **turn a jobs-folder company brief into a live, unlisted, noindexed instance of the factory running on that company's stated product vision — in one short, timed, repeatable sequence**
So that **a hiring manager opens a private link and observes the pipeline on their own product, while nothing real-brand ever enters the public repo.**

## Problem Statement

#43 shipped the private-instance *shell* (`instance.html` + `system/instance.mjs`), config-driven by one inline `window.INSTANCE_CONFIG`, demonstrated in-repo on the fictional `scenarios/northwind` package. #39 shipped the brief→package *compiler* (`genCompanyPackage`), which refuses to write a real (`fictional:false`) package inside the repo. #40 produces the *derived pack* + derivation trace. **Nothing yet assembles these into a deployable instance and gets it live under the required privacy posture.** And the assembly is not "rewrite one line": the shell carries six demo-specific static prose sites that a real instance must not render (some are factually contradictory on a real instance). Finally, the epic's spike 2 (is a direct-upload unlisted Pages instance private + cheap enough?) is unresolved, and two open questions hang on its outcome.

## Solution Statement

Add one standalone orchestrator, `agent-layer/build-instance.mjs`, exporting `buildInstance({...})` with a CLI guard (mirroring `gen-company-package.mjs`'s export + `import.meta.url === pathToFileURL(process.argv[1]).href` shape). It:
1. Resolves the repo's shell assets **module-relative** (repo root = `agent-layer/..`, never cwd) and the jobs-folder inputs (brief, pack, trace) **from cwd/args** — the exact split `build.mjs` and `gen-company-package.mjs` already use.
2. Refuses an `--out` that resolves **inside the repo** (physical-identity containment, mirroring `insideRepo` in `gen-company-package.mjs`) — defense in depth over `genCompanyPackage`'s own guard.
3. Compiles the brief with `genCompanyPackage({ briefPath, outDir: <deploy>/scenarios })`.
4. Assembles the self-contained deploy dir: copies `system/` + `assets/` wholesale, drops the derived pack in as `system/tokens.<slug>.css`, copies the derivation trace to `traces/<file>.jsonl`, emits a **standalone** `_headers` (permanent noindex + security — independent of the repo's launch-gated `_headers`), and writes a **stamped** `index.html` from `instance.html`.
5. **Stamps** the shell against a small, explicit two-mechanism contract (below) so a real instance shows real copy, never demo scaffolding.
6. Validates the assembled dir (every referenced asset present; `INSTANCE_CONFIG` well-formed; package self-validated by the compiler) and **prints** the exact `wrangler pages deploy` command — the irreversible outward action stays in the operator's hands (deploys are human-triggered, epic §Boundaries).

A small, purely-additive refactor of `instance.html` introduces the stamping seams (delimiters + real-only siblings) **without changing the committed demo's rendered output**. Then the spike runs the whole flow on a throwaway fictional brief, times it, verifies privacy on the live URL, and the outcome + open-question resolutions are written back to `docs/epics/per-company-brief.architecture.md`. A `## Commands` entry is added to `CLAUDE.md`.

## Out of Scope / Non-Goals

- **Not implementing cross-link rewriting (chrome nav + footer CTAs → absolute public URLs).** `system/analytics.mjs` shows `PRODUCTION_HOST = ""` ("filled at launch") — there is **no canonical public origin yet**, so root-absolute chrome links (`/`, `/approach`, `/factory`, `/contact`) will 404 on an isolated deploy. This is a documented, accepted v1 limitation with a designed hook (`--public-origin`, see NOTES) to resolve post-launch. The spike uses fictional throwaway content and does not test cross-links; a real instance's own content (intake/wizard/generated/trace/materials) renders fully from the copied `/system`, `/scenarios`, `/traces` assets.
- **Not building #40's derived pack or the derivation trace.** Those are #40 inputs; `build-instance.mjs` consumes `--pack` and `--trace` as paths. If #40's pack isn't available for a subject, that's out of this ticket.
- **Not authoring per-application content** (the hand-crafted prototype screen, the real brief prose). That is jobs-folder work per application, not a platform ticket (epic "Suggested execution order" note).
- **Not changing `genCompanyPackage`, `parseCompanyBrief`, `validatePackage`, `system/instance.mjs`, or the wizard/derive engine.** The orchestrator *consumes* them unchanged. The only shell change is the additive stamping-seam refactor of `instance.html`.
- **Not extending the brief format** to carry pack/trace/link references. v1 takes them as CLI args (no #39 both-parser change). Folding them into the brief head is a possible later refinement (NOTES).
- **Not wiring any CI.** Human-triggered only, always (issue AC + epic §Boundaries: "deploys are human-triggered").
- **Not committing anything company-real** — no real brief, package, pack, trace, or deploy dir enters the repo.

## Feature Metadata

**Feature Type**: New Capability (build/deploy path) + a small enabling refactor
**Estimated Complexity**: Medium
**Primary Systems Affected**: `agent-layer/` (new orchestrator) · `instance.html` (additive stamping seams) · `docs/epics/per-company-brief.architecture.md` (write-back) · `CLAUDE.md` (Commands entry)
**Dependencies**: `wrangler` CLI (Cloudflare Pages direct upload) + Cloudflare auth (separate from the SDK login) — a spike precondition. No new repo dependencies (the script is zero-dep Node ESM).

## Related Work

**Implements**: issue **#44** (linardsb/ux-factory)   ·   **Epic**: **#38** — `docs/epics/per-company-brief.architecture.md` (inherit §Stack, §Boundaries, §Spikes 2, §Open questions; do not re-decide them)

**Back-references** (builds on / inherits decisions from):
- `.claude/plans/private-instance-shell.md` — #43: the shell this build assembles around; its `INSTANCE_CONFIG` contract and asset closure are the stamping target.
- #39 `agent-layer/gen-company-package.mjs` — the compiler this orchestrates; its privacy guard and `outDir/<slug>` output shape.
- #40 — supplies `--pack` (`tokens.<slug>.css`) and `--trace` (derivation JSONL) as inputs.

**Forward-references**:
- (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `agent-layer/build.mjs` (all 57 lines) — **the orchestrator pattern to mirror**: run from the jobs folder; `resolve(meta.site_root)` for the target; module-relative imports; a plain sequential `✓`-logged pipeline. `build-instance.mjs` is a *sibling* orchestrator, NOT a `gen-*` registered inside `build.mjs`.
- `agent-layer/gen-company-package.mjs` (all 191 lines) — **the compiler to call** (`genCompanyPackage({ briefPath, outDir })`) and **the guard to mirror**: `REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")` (module-relative, not cwd); `insideRepo(target)` physical-identity (inode+dev) containment walking existing ancestors; the export + `import.meta.url === pathToFileURL(process.argv[1]).href` CLI guard; usage-error style. Note it writes `outDir/<slug>/` and **self-validates** (throws + discards on failure).
- `agent-layer/lib.mjs` (`parseCompanyBrief`, lines ~143–205) — **the brief head fields available**: `slug, name, fictional, domain, oneLiner, today, sources (req when !fictional), publishedTokens?, axes{brandColor,density,rewardType,frequency,...}, intake{<id>:{default,reasoning}}, screens[], copy{tagline,ethicsReveal,...}`. It does **NOT** carry pack path / trace path / prototype+handoff links → those are CLI args.
- `instance.html` (all 442 lines) — **the shell to stamp**. Note: the head comment's claim that #44 "rewrites the one `window.INSTANCE_CONFIG` line" is **incomplete** — see the six demo-prose sites in "Patterns to Follow". The one config block is L425–432. Head assets loaded: `/system/tokens.contract.css`, `/system/tokens.neutral.css` (← the pack line to swap), `/system/components.css`, `/system/portfolio.css`; `/system/client.neutral.config.js`, `/system/site.js`, `/system/portfolio.js`, `/system/analytics.mjs`, `/system/instance.mjs`; favicon `/assets/logo-neutral.svg`.
- `system/instance.mjs` (all 243 lines) — the runtime module (do **not** change). Confirms the `INSTANCE_CONFIG` contract the build must emit: `{ package: "<root-abs dir, no trailing slash>", name, trace:{path}, links:{prototype,handoff} }`. Fetches `${package}/intake.defaults.json`, `${package}/copy.json`, and `trace.path`. Sets `#instance-name` from `config.name` (so the hero name is already config-driven).
- `system/site.js` (all 143 lines) — injects chrome from `window.CLIENT_CONFIG`; every nav/footer/cta href comes from config (root-absolute) → the cross-link 404 rationale for `--public-origin` deferral.
- `system/client.neutral.config.js` (all 60 lines) — the neutral chrome config (root-absolute hrefs). The `--public-origin` follow-up would target this.
- `_headers` (all 22 lines) — the noindex/security posture. `X-Robots-Tag: noindex` on `/*` today, but the repo header is **launch-gated** ("revisit at launch") → the build must emit its **own** guaranteed-noindex `_headers`, not copy this one.
- `agent-layer/gen-headers.mjs` (all 37 lines) — reference for the exact security-header block + the `per_company ⇒ noindex` idiom to reproduce in the standalone `_headers`.
- `scenarios/validate.mjs` (`validatePackage(dir, slug)`, line 268) — the package contract; already invoked inside `genCompanyPackage`.
- `scenarios/northwind/` — the compiled reference package shape (`brief.md`, `copy.json` [fictional:true + speculativeNotice+sources], `intake.defaults.json` [8 Qs + axes], `proto.config.json`, `fixtures/items.json`) — the **shape reference** for authoring the spike's throwaway brief.
- `scenarios/README.md` (§Provenance + §Demo-instance convention) — real packages are validated by path, never in `index.json`; the privacy boundary rationale.

### New Files to Create

- `agent-layer/build-instance.mjs` — the orchestrator (this ticket's core). Opens with a header citing `docs/epics/per-company-brief.architecture.md` §Stack + §Boundaries and issue #44 (feature/entry-point file convention).

### New Files to Create OUTSIDE the repo (spike only — never committed)

- `<jobs-or-tmp>/spike-northwind/brief.md` — a **throwaway fictional** source brief (jobs-folder-shaped, `fictional:true`), shape-copied from `scenarios/northwind/`. Lives outside the repo; deleted after the spike.
- `<out-of-repo>/inst-<slug>-<rand>/` — the assembled deploy dir (build output). Outside the repo; ephemeral.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- **Invoke the `wrangler` skill** before writing/running any deploy commands — to pin the exact `wrangler pages project create`, `wrangler pages deploy <dir> --project-name <p> --branch <b>`, and `wrangler pages project delete` syntax and the **auth model** (`CLOUDFLARE_API_TOKEN` vs `wrangler login`) for **direct upload**. Do **not** hardcode wrangler flags from memory. (Cloudflare auth is separate from the Agent-SDK Mac-CLI login.)
- `docs/epics/per-company-brief.architecture.md` §Stack (per-company deploy; private-repo alt rejected unless direct upload proves fragile), §Spikes 2 (question + decision rule), §Open questions (access control · route/naming), §Boundaries (privacy). The write-back edits these sections.

### Patterns to Follow

**Module-relative vs cwd path split** (from `gen-company-package.mjs:24–26`, `build.mjs`):
```js
// Repo assets resolve from the MODULE (agent-layer/.. = repo root); NEVER cwd (cwd is the jobs folder).
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Jobs-folder inputs (brief, --pack, --trace, --out) resolve from cwd / argv.
```

**Physical-identity out-of-repo guard** (mirror `insideRepo`, `gen-company-package.mjs:35–47`) — assert `--out` is NOT the repo root or inside it, via inode+dev on existing ancestors. Throw naming the path + the boundary doc.

**Export + standalone CLI guard** (mirror `gen-company-package.mjs:77, 176–190`):
```js
export function buildInstance({ briefPath, outDir, packPath, tracePath, name, links, publicOrigin }) { /* ... */ }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { /* parse argv, call, ✓ log, exit(1) on throw */ }
```

**Errors**: throw plain `Error`s whose message names the offending path/anchor (CLAUDE.md ground rules). Every stamping anchor/region that is expected-but-missing is a **hard throw** — never silently skip, or a real instance ships wrong copy.

**THE STAMPING CONTRACT (the crux — get this right for one-pass success).** The shell has per-company-variable content at these **six** sites plus the config block. `instance.html` is **not** in the visual-regression set (`system/instance.mjs` header confirms), so the additive refactor churns no baseline.

*Mechanism A — anchored full-region rewrites* (unique, stable anchors; throw if absent):
| Site | Anchor | Real-instance value |
|---|---|---|
| pack CSS | `<link rel="stylesheet" href="/system/tokens.neutral.css" />` | `href="/system/tokens.<slug>.css"` |
| config block | the `<script>… window.INSTANCE_CONFIG = { … } …</script>` region (wrap in `<!-- INSTANCE_CONFIG:start -->`…`<!-- INSTANCE_CONFIG:end -->` markers in the refactor for a deterministic replace) | serialized `{ package:"/scenarios/<slug>", name, trace:{path:"/traces/<file>.jsonl"}, links:{prototype,handoff} }` |
| `<title>` (L6) | the `<title>…</title>` element | build-held template `Private instance · ${name} · Linards Berzins` (no "demo") |
| `<meta description>` (L7) | `<meta name="description" content="…">` | build-held honest template naming `${name}`, "speculative … not affiliated with or endorsed by", no "demo/fictional" |

*Mechanism B — demo/real region toggling* (for body framing prose). In the refactor, tag each variable region `data-when="demo"` or `data-when="real"`; real-only nodes also carry `hidden` (invisible in the committed demo). At build time for a real instance: **delete** every `[data-when="demo"]`, **remove `hidden`** from every `[data-when="real"]`, and substitute `{{name}}` (HTML-escaped) inside kept nodes. The committed demo (no build) renders exactly as today. Body sites to wrap:
- L257–258 hero-sub tail — `data-when="demo"` (delete on real; the surrounding hero-sub already describes the real thing).
- L278–280 labeling lead — the sentence "On this committed demo the subject is fictional, and the label is rendered exactly as a real instance renders it." → `data-when="demo"` (delete). Keep the generic first sentence.
- L386–390 trace-note — `data-when="demo"` (delete) **plus** a sibling `data-when="real" hidden` paragraph, e.g. "The recorded run in which the agent proposed {{name}}'s design language from its own product's screens — replayed step by step. Nothing runs live here."
- L401–405 materials note — the "this demo instance shows the honest placeholders" sentence → `data-when="demo"` (delete); optionally a `data-when="real" hidden` variant, or leave the generic lead.

**Deploy-dir layout** (self-contained; URL-path parity with the repo):
```
<out>/inst-<slug>-<rand>/
  index.html              # stamped from instance.html (renamed → bare root URL)
  _headers                # standalone: /* noindex + 5 security headers; asset caching
  system/                 # whole dir copied  +  tokens.<slug>.css (the derived pack)
  assets/                 # whole dir copied (favicon etc.)
  scenarios/<slug>/       # genCompanyPackage output (intake.defaults.json, copy.json, …)
  traces/<file>.jsonl     # the derivation trace (--trace)
```

---

## IMPLEMENTATION PLAN

### Phase 1: Shell stamping-seam refactor (enabling)

**Independent of:** Phase 2's script logic can be drafted in parallel, but Phase 2's stamping step *targets* these seams — land Phase 1 first so the anchors/regions exist.

Additively refactor `instance.html` so per-company-variable content sits behind clean seams, with **zero change to the committed demo's rendered output**:
- Wrap the `window.INSTANCE_CONFIG` block (L425–432) in `<!-- INSTANCE_CONFIG:start -->` / `<!-- INSTANCE_CONFIG:end -->`.
- Tag the four body prose sites with `data-when="demo"` / add `data-when="real" hidden` siblings with `{{name}}` where a real variant is needed (see table).
- Leave `<title>`, `<meta description>`, the pack `<link>`, and `#instance-name` as-is (Mechanism A / already config-driven).
- Update the head comment (L13–32) to state the true stamping surface (seams + head rewrites), replacing the misleading "one line" claim.

### Phase 2: The orchestrator `agent-layer/build-instance.mjs`

**Depends on:** Phase 1 (stamping targets), #39 compiler, #43 shell.

**Tasks:**
- Header + imports (`genCompanyPackage`, `parseCompanyBrief` if needed for `name`/`slug` defaults, node:fs/path/url). `REPO_ROOT` module-relative.
- `buildInstance({ briefPath, outDir, packPath, tracePath, name, links, publicOrigin })`:
  1. Resolve + **guard** `outDir` is outside the repo (mirror `insideRepo`). Throw if inside.
  2. Validate inputs exist: `packPath` (a `.css`), `tracePath` (a `.jsonl`). Fail-before-write.
  3. `const pkg = genCompanyPackage({ briefPath, outDir: join(deployDir, "scenarios") })` → gives `{ slug, name (from brief), outAbs, provenance, … }`. (Compiler self-validates + enforces its own privacy guard.)
  4. Assemble: recursively copy repo `system/` → `deployDir/system/`; `assets/` → `deployDir/assets/`; copy `packPath` → `deployDir/system/tokens.<slug>.css`; copy `tracePath` → `deployDir/traces/<basename>`.
  5. Emit standalone `deployDir/_headers` (reproduce `gen-headers.mjs`'s security block **with** `X-Robots-Tag: noindex` unconditionally).
  6. Stamp: read `instance.html`, apply Mechanism A + B → write `deployDir/index.html`. `name` defaults to the brief's `head.name`; `links` from args; `trace.path = "/traces/<basename>"`; `package = "/scenarios/<slug>"`. If `publicOrigin` given, additionally rewrite chrome/CTA links (else leave root-absolute — documented limitation).
  7. **Validate the assembled dir** (see Testing): every `/system|/assets|/scenarios|/traces` reference in `index.html` resolves to a real file; `INSTANCE_CONFIG` parses; no stray `{{` tokens; no residual "demo" in real-instance body text.
  8. Return `{ deployDir, slug, provenance }`.
- CLI guard: parse `<brief.md> --out <dir> --pack <css> --trace <jsonl> [--name <s>] [--proto <url>] [--handoff <url>] [--public-origin <url>]`; require `briefPath,--out,--pack,--trace`; call; on success **print** the ready-to-run `wrangler pages deploy <deployDir> --project-name <target> --branch <branch>` line (per the `wrangler` skill's exact syntax) + a one-line reminder that deploy is the operator's explicit step; `exit(1)` with `build-instance ✗ <msg>` on throw.

### Phase 3: Spike 2 — one throwaway build, deployed, timed, privacy-verified

**Depends on:** Phases 1–2. Precondition: Cloudflare/wrangler auth configured (per `wrangler` skill).

**Tasks (procedure — run it, record real numbers):**
1. Author a throwaway **fictional** source brief outside the repo (shape ≈ `scenarios/northwind/`, `fictional:true`).
2. `time node ../ux-factory/agent-layer/build-instance.mjs <brief> --out <tmp> --pack <a tokens.*.css> --trace <a committed jsonl, e.g. traces/pack-seed-verdant.jsonl>` → record build wall-clock.
3. Pick a **non-guessable** deploy target: project/branch name `inst-<slug>-<rand>` (e.g. a short `openssl rand -hex 3`), so the URL is not guessable from the company name. `time npx wrangler pages deploy <tmp> --project-name inst-<slug>-<rand> --branch <b>` (create project first if needed — `wrangler` skill) → record deploy wall-clock.
4. **Privacy/non-discoverability checklist on the live URL:**
   - `curl -sI <url>/` → assert `X-Robots-Tag: noindex`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: …` all present.
   - `curl -s <url>/sitemap.xml` and `<url>/robots.txt` → 404 / no sitemap served.
   - Confirm the guessable form (`https://inst-<slug>.pages.dev`, no `<rand>`) is **not** the instance.
   - Confirm no inbound link from the public site and no entry in the public `index.json` / `llms.txt`.
   - Confirm the instance's own content renders (open the URL: notices, curated intake, wizard "Runs now", generated re-skin, trace player, materials placeholders).
5. **Decision rule** (epic §Spikes 2): total flow **under ~10 min AND** headers/privacy correct → **keep direct upload**; else → move private instances behind **Cloudflare Access** or a **private-repo target**.
6. **Teardown**: delete the throwaway Pages project/deployment (`wrangler` skill) and the tmp brief + deploy dir. Nothing lingers.

### Phase 4: Write-back + CLAUDE.md + close

**Depends on:** Phase 3 (the spike outcome + numbers).

**Tasks:**
- **Architecture-doc write-back** — edit `docs/epics/per-company-brief.architecture.md`:
  - §Spikes 2: append an **Outcome (2026-07-…)** paragraph with the measured build+deploy time, the header/privacy result, and the decision (keep direct upload | escalate), structured for **both branches**.
  - §Open questions — resolve/annotate:
    - "Access control on private links" → record the decision, stating the **threat model plainly**: "private" = unlisted + noindex, and **anyone with the URL can view it**; whether that's sufficient or Access/password is needed (coupled to the spike's privacy result).
    - "Route/naming convention" → record unlisted-URL-only vs per-company-project decision, **including the non-guessable-name requirement** the spike proved necessary.
  - §Stack: if the spike escalated (fragile), note the pivot away from bare direct upload.
- **`CLAUDE.md` `## Commands`**: add one entry, e.g. `per-company instance (from jobs folder): node ../ux-factory/agent-layer/build-instance.mjs <brief.md> --out <dir> --pack <tokens.<slug>.css> --trace <derivation.jsonl> [--proto <url>] [--handoff <url>]` then `npx wrangler pages deploy <dir> --project-name <unlisted> --branch <b>`.
- Optionally add `agent-layer/build-instance.mjs` to the CLAUDE.md architecture-map `agent-layer/` block.
- Commit (feature branch, one atomic commit): `feat: per-company instance build + unlisted deploy from the jobs folder — spike 2 (#44, epic #38)`. Do **not** commit any throwaway brief, deploy dir, or real content.

---

## STEP-BY-STEP TASKS

### UPDATE `instance.html` — add stamping seams (Phase 1)
- **IMPLEMENT**: Wrap the `INSTANCE_CONFIG` script (L425–432) in start/end marker comments; tag the four body prose sites (L257–258, L278–280, L386–390, L401–405) `data-when="demo"`; add `data-when="real" hidden` siblings with `{{name}}` for the trace-note (and optionally materials); fix the head comment (L13–32).
- **PATTERN**: additive-only; committed demo output unchanged.
- **GOTCHA**: `instance.html` is NOT in the VR set — safe; but verify the demo still renders identically (real-only nodes stay `hidden`, demo-only stay visible). Do not touch `<title>`/`<meta description>`/`#instance-name`/pack `<link>` here (handled by the build's Mechanism A).
- **VALIDATE**: `npx serve .` → open `/instance.html`; confirm pixel-identical to before (notices, intake, wizard, generated, trace, materials).
- **SATISFIES**: AC #1 (a real instance shows real copy) — the enabling half.

### CREATE `agent-layer/build-instance.mjs` — orchestrator (Phase 2)
- **IMPLEMENT**: `buildInstance({...})` + CLI guard per Phase 2 tasks; `REPO_ROOT` module-relative; out-of-repo guard; call `genCompanyPackage`; whole-dir copy of `system/`+`assets/`; pack/trace copy; standalone `_headers`; stamp Mechanisms A+B; assembled-dir validation; print the wrangler command.
- **PATTERN**: `agent-layer/gen-company-package.mjs` (guard, export+CLI-guard, error style); `agent-layer/build.mjs` (orchestrator shape, module-relative paths); `agent-layer/gen-headers.mjs` (`_headers` body).
- **IMPORTS**: `import { genCompanyPackage } from "./gen-company-package.mjs"`; `import { parseCompanyBrief } from "./lib.mjs"` (for `name`/`slug` defaults if not re-reading `pkg` return); `node:fs` (`cpSync`/`mkdirSync`/`copyFileSync`/`readFileSync`/`writeFileSync`/`existsSync`/`statSync`), `node:path`, `node:url` (`fileURLToPath`,`pathToFileURL`).
- **GOTCHA**: `outDir` MUST be outside the repo (guard). `_headers` must be the **standalone** noindex one, NOT a copy of the repo's launch-gated file. Every stamping anchor missing = hard throw. Copy `system/` wholesale (robust to the shell's transitive import closure — `instance.mjs`→`factory-intake.mjs`→`derive.mjs`→`oklch/wcag/derive.rules`, +`trace-player`,`analytics`); do not hand-track the closure.
- **VALIDATE**: `node -e "import('./agent-layer/build-instance.mjs')"` parses (from repo root); then a dry assembly on the throwaway brief into a tmp dir + the assembled-dir validation passes; `npx serve <tmp>` renders the instance.
- **SATISFIES**: AC #1, AC #4 (out-of-repo, nothing committed).

### RUN Spike 2 (Phase 3)
- **IMPLEMENT**: the Phase 3 procedure — build (timed), deploy to a non-guessable unlisted target (timed), run the privacy/non-discoverability checklist, apply the decision rule, tear down.
- **PATTERN**: deploy command shape from CLAUDE.md `## Commands`; exact syntax + auth from the **`wrangler` skill**.
- **GOTCHA**: wrangler auth is a precondition (separate from SDK login). Non-guessable target name is mandatory or the privacy premise fails. Delete the throwaway project after.
- **VALIDATE**: `curl -sI <url>/ | grep -i "x-robots-tag\|x-frame-options\|x-content-type"` shows the posture; guessable-URL and sitemap checks negative; total time recorded.
- **SATISFIES**: AC #2 (live noindex + non-discoverable, timed), AC #3 (produces the spike outcome).

### UPDATE `docs/epics/per-company-brief.architecture.md` (Phase 4)
- **IMPLEMENT**: §Spikes 2 Outcome paragraph (measured time + privacy result + decision, both branches); resolve §Open questions "Access control" (with the plain threat model) and "Route/naming" (with non-guessability); §Stack note if escalated.
- **PATTERN**: match the existing §Spikes 1 "Outcome (2026-07-19)" paragraph register (dated, measured, honest).
- **VALIDATE**: the two open-question checkboxes are resolved/annotated; the decision is unambiguous and dated.
- **SATISFIES**: AC #3.

### UPDATE `CLAUDE.md` (Phase 4)
- **IMPLEMENT**: one `## Commands` entry for the per-company build + deploy; optional architecture-map line for `build-instance.mjs`.
- **VALIDATE**: entry reads as a runnable sequence from the jobs folder.
- **SATISFIES**: AC #5.

---

## TESTING STRATEGY

No test suite / linter / type-check exists (CLAUDE.md: "run the surface you touched"). Validation = running the build + the deployed instance.

### Unit-ish (surface) checks
- `build-instance.mjs` imports cleanly (`node -e "import('./agent-layer/build-instance.mjs')"`).
- Out-of-repo guard: calling with `--out` pointing inside the repo throws (name + boundary in the message).
- Missing `--pack`/`--trace`/anchor → throws naming the offender.

### Integration (the real check)
- Full assembly on the throwaway fictional brief → the deploy-dir layout is exactly as specified; `genCompanyPackage` self-validation passed; `scenarios/<slug>/` present.
- **Assembled-dir validator** (inside the script + as the manual gate): parse `index.html`, collect every `href`/`src`/`fetch`-path under `/system|/assets|/scenarios|/traces`, `statSync` each in the deploy dir → all exist; `INSTANCE_CONFIG` block parses to the expected object; **no `{{` left**; **no "demo"/"fictional company" in real-instance body text**; pack `<link>` points at `tokens.<slug>.css`; `_headers` contains `X-Robots-Tag: noindex`.
- `npx serve <deployDir>` → the instance renders end-to-end (notices, curated intake, wizard "Runs now", live re-skin, trace player, materials placeholders).
- Live (spike): the `curl` header + non-discoverability checklist.

### Edge Cases
- Real brief (`fictional:false`) with `--out` inside repo → BOTH guards fire (orchestrator's + `genCompanyPackage`'s). Refused.
- `--name` omitted → falls back to brief `head.name`.
- `links` omitted → shell renders honest placeholders (unchanged #43 behavior).
- Pack filename collides with an existing `system/` file → it's `tokens.<slug>.css` (namespaced by slug) → no collision with committed packs.
- A demo-only region left un-tagged in Phase 1 → the validator's "no 'demo' in real body text" check catches it.

## VALIDATION COMMANDS

### Level 1: Syntax
- `node -e "import('./agent-layer/build-instance.mjs')"` (from repo root) — parses/imports.

### Level 2: Build surface
- `node ../ux-factory/agent-layer/build-instance.mjs <throwaway-brief> --out <tmp> --pack <css> --trace traces/pack-seed-verdant.jsonl` — prints `✓` + the deploy command; assembled-dir validation passes.

### Level 3: Render
- `npx serve <tmp>` → open the bare root URL → instance renders; `npx serve .` → `/instance.html` demo still pixel-identical.

### Level 4: Live privacy (spike)
- `curl -sI <live-url>/` → noindex + security headers present; sitemap/robots absent; guessable URL negative.

### Level 5: (n/a)

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — One command (`build-instance.mjs …`) + one documented deploy line takes a jobs-folder brief to a live unlisted instance; a real instance shows **only real copy** (no demo/fictional scaffolding — all six sites + config stamped). The flow is timed.
- [ ] **AC #2** — The deployed instance serves the `_headers` noindex/security posture and is verified non-discoverable (noindex header present; no sitemap; URL not guessable from the company name; no public inbound link).
- [ ] **AC #3** — Spike decision + open-question resolutions (access control, route/naming) recorded in `docs/epics/per-company-brief.architecture.md`, structured for both decision branches, with the threat model stated plainly.
- [ ] **AC #4** — Nothing company-real committed to this repo; `--out` inside the repo is refused; the compiler's `fictional:false`-in-repo guard remains intact.
- [ ] **AC #5** — `CLAUDE.md` `## Commands` documents the per-company build + deploy sequence.
- [ ] The orchestrator mirrors `build.mjs`/`gen-company-package.mjs` conventions (module-relative repo paths, cwd inputs, export+CLI-guard, path-naming throws) and is zero-dep Node ESM.

## COMPLETION CHECKLIST

- [ ] Phase 1 refactor lands with the demo rendering unchanged.
- [ ] `build-instance.mjs` builds, guards, stamps, validates, and prints the deploy command.
- [ ] Spike run, timed, privacy-verified, decision made, throwaway torn down.
- [ ] Write-back + CLAUDE.md done; single atomic commit on a feature branch; no real content committed.
- [ ] `git status` shows no throwaway brief / deploy dir / real pack/trace staged.

## OPEN QUESTIONS / ASSUMPTIONS

- **Assumption**: #40's derived pack (`tokens.<slug>.css`) + derivation trace exist as files the operator passes via `--pack`/`--trace`. For the spike, any committed pack/trace (e.g. `traces/pack-seed-verdant.jsonl` + a `system/tokens.*.css`) stands in — the spike tests deploy mechanics, not derivation.
- **Assumption**: the instance is deployed **standalone** (its own file set). Cloudflare Pages direct-upload to a branch/project serves exactly the uploaded dir, so cross-links to other public IA pages 404 pre-launch — accepted (see Out of Scope; `--public-origin` is the post-launch fix).
- **Decision (resolved in this plan, per advisor)**: the build **prints** the wrangler command rather than shelling out — the irreversible deploy stays an explicit human step (epic §Boundaries). Timing wraps the two commands with `time`. (If the operator later wants a timed one-shot, an opt-in `--deploy` that shells out is a trivial add — deliberately not in v1.)
- **Decision (resolved)**: the shell gets a delimited demo/real refactor (Mechanism B) rather than scattered anchored prose rewrites — six demo-prose sites make surgery fragile; delimiters hit the ≥9/10 bar. The issue's "Files touched" estimate **missed this shell edit** — flagged as a scope delta.
- **Open (for the spike to resolve, then write back)**: access control (unlisted+noindex vs Access/password) and route/naming (per-company project vs branch on main) — both fall out of spike 2's privacy result and the ~10-min timing.
- **Open**: whether `--public-origin` (cross-link rewriting) is worth implementing now vs at launch. Recommend **defer** — `PRODUCTION_HOST` is empty, so there's nothing to point at yet.

## NOTES (open canvas)

**Why print-not-deploy.** The assembly is deterministic and re-runnable (safe to automate); the deploy is outward-facing and irreversible-ish (a live URL, a Pages project). Splitting them keeps the script a pure builder and the human owning the publish — matching the epic's "deploys are human-triggered" and the repo's generators-produce-inspectable-outputs ethos. The AC allows "a documented short sequence," so a two-step `build && wrangler deploy` fully satisfies it.

**Why whole-`system/` copy, not closure-tracking.** The shell's runtime closure is `instance.mjs → factory-intake.mjs → derive.mjs → {oklch,wcag,derive.rules}`, plus `trace-player.mjs`, `analytics.mjs`, and the four CSS layers + `site.js`/`portfolio.js`/`client.neutral.config.js`. Hand-tracking that is fragile (a future shell import silently breaks an instance). `system/` is a handful of small public files — copy it wholesale. The extra reference packs (`tokens.saulera.css`, `tokens.verdant.css`, `client.config.js`, `dock.mjs`…) are already-public, harmless, unreferenced by the instance.

**Why a standalone `_headers`, not the repo's.** The repo's `_headers` noindex is launch-gated ("revisit at launch") — if the public site later drops it, copying it verbatim would silently de-noindex private instances. Emitting an independent, unconditional `X-Robots-Tag: noindex` guarantees the privacy posture regardless of the public site.

**The `--public-origin` follow-up (deferred).** Post-launch, once `PRODUCTION_HOST` is set: pass `--public-origin https://<prod>`; the build ships a per-instance `client.*.config.js` clone (or rewrites the neutral one's hrefs) with absolute chrome links + rewrites the two static footer CTAs (`/factory`, `/contact`). Until then, the instance is a self-contained page whose own content works and whose chrome cross-links are inert.

**Brief-head folding (later refinement).** v1 takes `--pack/--trace/--proto/--handoff` as args. A future #39-format extension could carry a `pack`, `trace`, and `links` block in the brief head (both parsers), reducing the CLI to `<brief> --out <dir>` — one per-company source compiling to one instance, matching the epic's "one per-company source" model. Out of scope here (both-parser change).

**Threat model (for the write-back).** "Private" = **unlisted + noindex**: not indexed, not linked, URL non-guessable — but **anyone with the URL can view it**. That is the whole substance of the access-control open question; state it, don't imply stronger secrecy than direct upload provides.

## AMENDMENTS

- (none yet — created 2026-07-22)
