# CLAUDE.md — ux-factory

## What this is
The code repo for an AI-first UX-engineering portfolio platform: a token-contract design system that re-skins an entire site from one line of CSS, plus the build-time "factory" around it — Node ESM generators and a local portal workbench — being extended into a pipeline that runs visibly in front of the reader (intake → generated design system → data-connected prototype → handoff pack) so hiring managers can verify senior UXE skill instead of trusting claims. This repo holds code only; per-application content, the pipeline skill, and the knowledge base live in the sibling jobs folder (`../Linards jobs folder/_factory/`). Intent and decisions: `docs/epics/`.

## Architecture map

**This map is an INDEX, not a specification.** Each line says what a file *is*; how it works and what it guarantees live in that file's own header, which is what an editor actually sees. Don't restate an invariant here — see §Ground rules.

```
system/                       the shipped design system — brand-agnostic core + packs
  tokens.source.json          DTCG source of truth; gen-token-css.mjs generates the two layers below
  tokens.contract.css         GENERATED layer 1 — every semantic token, neutral fallbacks, no brand ever
  tokens.neutral.css          GENERATED layer 2 — the neutral pack; a company build clones it
  components.css              layer 3 — token-only components, plus the site chrome the protos need
  portfolio.css · proto.css   surface styles for portfolio pages · prototypes
  catalog.css                 docs-surface styles, linked wherever renderComponentDocs mounts
  site.js                     injects chrome (header/footer/nav) from window.CLIENT_CONFIG
  pack-boot.js                pre-paint pack restore; its tag stays LAST in every head that carries it
  dock.mjs                    appearance dock — pack switcher, copy-tokens, left scroll ruler
  analytics.mjs               CF Web Analytics beacon + the virtual-route event helpers
  derive.mjs +oklch +wcag +derive.rules   intake answers → token values + WCAG checks + ethics verdict
  agentic-renderer.mjs        vocabulary-validated {name,props,children} → real components; refuses the rest
  action-bus.mjs              the one bidirectional action contract (agent/click/keyboard, voice-ready)
  trace-player.mjs            view-time trace replay — a committed trace as stepped PIV cards
  handoff-viewer.mjs          view-time handoff-pack viewer; owns the markdown-subset prose renderer
  catalog.mjs                 the component catalog at /components — MOUNT 1 of renderComponentDocs
  annotated-source.mjs · glossary.mjs   real-code snippets · WCAG 1.4.13 term bubbles
  derive-probe.mjs            runs the real derive() on a reader-chosen brand colour
  system-graph.mjs            factory.html's "shape of the system" exhibit + its pan/zoom window
  system-graph.json           GENERATED graph of contract tokens × consumers × pack bindings
  derivation-roundtrip.mjs    the committed Verdant fidelity diff, rendered
  loc-summary.json            GENERATED file/line counts — approach.html renders them
  param-manifest.json         hand-maintained: one entry per live-manipulable control (counting rules inside)
  param-count.json            GENERATED control totals — approach.html renders the total
  instance.mjs                view-time private-instance shell config; boots the studio band
  ── the studio (epic #202) ──
  studio-canvas.mjs           the canvas SUBSTRATE — native-scroll stage, zoom table, data-col/data-row
  studio.css                  the studio's surface styles; hand-mirrors the caps group 12 pins
  studio-verbs.mjs            the MANIPULATION verbs — move, resize, undo/redo, all through the bus
  studio-flow.mjs             the flow's screen surface — renderScreen + wireFlow
  studio-method.mjs           the METHOD BAND — the ten questions as cards, Hook loop, ethics verdict
  studio-docs.mjs             the DOCKED DOCS — MOUNT 2 of renderComponentDocs
  studio-frames.mjs           the two shipped prototypes as real iframes on the canvas
  studio-layers.mjs           the LAYERS LIST — everything on the stage as a keyboard list
  studio-minimap.mjs          the MINIMAP — the whole stage at a glance, with a live viewport rect
  replay-driver.mjs           the REPLAY DRIVER — plays a committed projection over the agent.* half
  board-ops.mjs               the BUILD-OP vocabulary + a pure applier (DOM-free; three layers need it)
  bus-toggles.mjs             Fieldwork's agentic-slot state commands — the only agent.* exerciser
  device-frame.mjs            Verdant's resizable device frame (pointer + splitter keys)
  ── the /build chain (epic #134) ──
  build-import.mjs            Act 0 — reads a dropped token export IN THE BROWSER, maps it by ROLE
  build-questions.mjs         the shared answer store + BUILD_CHANGE + both acts' wizards
  breadboard.mjs              Act 3 — Shape Up's breadboard, drafted then editable
  pattern-rules.mjs           the three committed rules that name a pattern from a board + the slots
  pattern-render.mjs          Act 4 — renders the named pattern through the agentic renderer
  build-card.mjs              the build's SVG artifacts, escaped once
  build-share.mjs             the whole build in the URL — codec + tamper battery
  build-keep.mjs              Act 5 — the keep rail: card, downloads, share link, ?b= restore
  pack-import.mjs             the token-import ENGINE, ONE never a fork (CLI + browser both map here)
  brand-import.mjs            HOME's public drop-to-re-skin surface
  pack-imported.mjs           the imported-pack record + vetTokens, the visitor-value allowlist
  ── reference, not loaded ──
  tokens.css · tokens.saulera.css · client.config.js   real packs kept as reference
  specs/                      ComponentSpec .md + DataContract .json — the handoff source of truth
  wc/                         custom-element wrappers (vd-*) + demo.html — spec-first
  figma-import.md             DTCG→Figma import-path doc; ships in the pack via gen-handoff

index · approach · factory · work · contact · 404.html   the shipped five-page IA on the neutral shell
build.html                    the pattern builder — off-nav, noindex, the reader's OWN product
components.html               the component catalog — off-nav, noindex, in the footer index + VR set
studio.html                   the studio's off-nav, noindex HARNESS — drives the canvas RAW
instance.html                 the deep-link-only private-instance shell; carries the stamping seams
_headers                      security headers + noindex (revisit at launch)

agent-layer/                  build-time Node ESM generators: machine-readable projection of one site
  build.mjs                   orchestrator — run FROM THE JOBS FOLDER against a decisions ledger
  build-instance.mjs          SIBLING orchestrator — one company brief → a self-contained deploy dir
  lib.mjs                     ledger parser + shared helpers
  gen-replay.mjs              GENERATED + drift-checked: a committed build run → replay/<slug>.json
  gen-*.mjs · inject-jsonld.mjs   one file per emitted artifact; each runnable standalone

portal/                       local-first workbench (127.0.0.1 only, never deployed)
  server.mjs                  zero-dep node:http server — thin route dispatch, logic in lib/
  lib/env.mjs                 paths + .env, hand-parsed (no dotenv)
  lib/kb.mjs                  kb card projections
  lib/intake.mjs              intake validation at the boundary
  lib/chat.mjs                the Agent SDK behind SSE
  lib/trace-recorder.mjs      Agent SDK hooks → Trace JSONL
  lib/origin.mjs              the CSRF guard server.mjs applies before ANY routing
  lib/builder.mjs             the OPERATOR PATH — /build's ten answers → a real composition question
  public/                     vanilla SPA — hash routing, template strings, no framework
  record-trace.mjs            build-time trace recorder (CLI) — a REAL agent run
  record-composition.mjs      build-time composition runner (CLI) — a REAL Agent SDK run per scenario
  record-build.mjs            build-time INCREMENTAL build recorder (CLI) — one op per tool call

scenarios/                    scenario packages — demo subjects + fixtures (format: scenarios/README.md)
worker/                       fixture-backed mock API, one Cloudflare Worker; site degrades to fixtures
proto/                        the two data-connected prototype pages (vd-/fw- components)
proto/compositions/           COMMITTED composition proposals from real record-composition.mjs runs
traces/                       committed real agent-run traces, raw + curated pairs (traces/README.md)
replay/                       the studio's replay artifacts (replay/README.md) — brief · board · projection
handoff/                      GENERATED handoff pack (verdant/) — committed, never edited by hand
docs/epics/                   PRD + architecture decisions governing the platform build
docs/figma-runbook.md         operator steps for the Figma boundary + the request-budget rules

tooling/
  build-checks.mjs            27 PURE groups, in CI — the repo's main gate  (→ references/gates.md)
  build-journey.mjs           /build ×3 engines, operator-run             (→ references/gates.md)
  proto-journey.mjs           the two proto pages ×3 engines              (→ references/gates.md)
  studio-journey.mjs          the studio ×3 engines + the INP gate        (→ references/gates.md)
  catalog-journey.mjs         /components ×3 engines                      (→ references/gates.md)
  instance-journey.mjs        a BUILT instance dir ×3 engines             (→ references/gates.md)
  vt-verify.mjs               asserts the view-transition morphs OPEN     (→ references/gates.md)
  vt-stack-audit.mjs          run BEFORE naming anything for a transition (→ references/gates.md)
  visual-regression/          isolated Playwright — the CI pixel gate     (→ references/gates.md)
  curate-trace.mjs · validate-trace.mjs   deterministic curation + the Trace format's drift guard
  board-op.mjs                the fenced build agent's ONLY build tool — one op per call, prints the board
  fieldwork-kpis.mjs          ground-truth KPIs — a post-hoc JUDGE, NEVER fed to an agent prompt
  inp-observer.mjs            the driver-injected PerformanceObserver helper; nothing ships
  figma/figma-read.mjs        the shared read — auth, the Enterprise gate, the cache, --from
  figma/figma-parity.mjs      READ-BACK: a Figma file diffed against the token contract
  figma/figma-pull.mjs        IMPORT: a Figma file's ramps → system/tokens.<slug>.css, mapped by ROLE
  mcp/                        local MCP helper scripts
  style-dictionary/           a dependency-carrying tool; emits css/ios/android token targets
  wc-sandbox/                 React 19 harness for the wc wrappers (esm.sh import map, no install)
```
The kb (`_factory/kb/` in the jobs folder) is the database — record shapes + parsers → `.claude/references/kb-format.md`.

## Where new code goes
- **Portal API endpoint** → a route branch in `portal/server.mjs` (`readBody` → delegate → `json(res, …)`); logic in a `portal/lib/<concern>.mjs` module, one concern per module.
- **Portal UI feature** → `portal/public/portal.js`: a hash route + render function using the existing `api()` helper; styles in `portal.css`.
- **Machine-layer artifact** → `agent-layer/gen-<output>.mjs` exporting `gen<Name>(ledger)`; register in `build.mjs` (import + call + `✓` log line), keep the standalone-run guard. Shared parsing belongs in `lib.mjs`.
- **Component** → token-only CSS in `system/components.css`; a new semantic token gets added to `system/tokens.source.json` (contract group) first, then regenerate: `node agent-layer/gen-token-css.mjs`.
- **New component spec** → `system/specs/<component>.md` (+ `.contract.json` if data-bound) per `.claude/references/kb-format.md`, then regenerate the pack: `node agent-layer/gen-handoff.mjs`. The chain is not finished at the spec: a component also needs its **`components.css` block** (header `/* ---------- <class> (system/specs/<name>.md) ---------- */`, token-only) **and its `agentic-renderer.mjs` template**, because `build-checks` group 3 asserts that EVERY generated vocabulary entry has a render path. A spec with a vocabulary entry and no block and no template is *documented but not composable*, and it is a red build. The optional `example` head key is validated SEMANTICALLY at generation time — it must actually render, or CI `verify` goes red naming the spec.
- **New /build pattern** → a rule in `system/pattern-rules.mjs` (the rule NAMES the pattern from the board and the slots are COUNTED from it, never invented) + its entry in `PATTERNS`. Spec-first: it may only compose components that already exist in `system/specs/` and validate against the generated `handoff/verdant/vocabulary.json`. Add a `BOARD_FOR` fixture in `tooling/build-checks.mjs` too — every group iterates `PATTERNS`, so a new entry with no board fails loudly rather than being silently skipped. Then `node tooling/build-checks.mjs` and `node tooling/build-journey.mjs all`.
- **WC wrapper** → `system/wc/<tag>.mjs`, spec-first (a wrapper exists only for a `system/specs/` component; shadow CSS uses only spec-head tokens, no literals, no var() fallbacks), copied into the pack by `gen-handoff`.
- **Brand/company skin** → clone `system/tokens.neutral.css` → `tokens.<company>.css` and `client.neutral.config.js` → `client.<company>.config.js`; never fork components.
- **Pack imported from Figma** → `node tooling/figma/figma-pull.mjs --slug <slug> --accent <hue> [--page Color]` → `system/tokens.<slug>.css` (`--offline` re-runs off the cache for free; `--from <export.json>` reads a plugin export instead of the API — no token, no quota, no Enterprise gate). It targets a PACK, never the contract. Same honesty rule as traces: the pack header states whose design work it is, which ramps were mapped, and every contrast negotiation and remaining WCAG failure.
- **View-time behaviour on shipped pages** → a hand-written ES module beside `system/site.js`.
- **New live-manipulable control on a shipped page** → add its `system/param-manifest.json` entry in the same PR + regenerate `node agent-layer/gen-param-count.mjs` (CI `verify` drift-checks it).
- **kb record type or field** → `.claude/references/kb-format.md` (both parsers must stay in sync).
- **New scenario** → clone a `scenarios/<slug>/` package per `scenarios/README.md` + one `scenarios/index.json` entry + its imports in `worker/fixtures.mjs`; the Worker's routes (`worker/api.mjs`) never change.
- **New trace** → record a REAL run: `node portal/record-trace.mjs` → curate `node tooling/curate-trace.mjs <raw> <out>` → validate `node tooling/validate-trace.mjs`. Hand-writing or hand-editing trace content is forbidden (honesty contract, hard) — a bad run is fixed by a tighter agent prompt + re-run, never an edit.
- **New replay run** → a REAL run, the trace rule extended: write the brief by hand (`replay/briefs/<slug>.md` — the problem, never the answer, and no board), prove the mechanism with `node portal/record-build.mjs --slug <slug> --dry`, record it with `node portal/record-build.mjs --slug <slug>` (`--force` to re-run a slug), then project it with `node agent-layer/gen-replay.mjs`. The slug names four files and `traces/` is a FLAT namespace, so it must be globally unique. **Never hand-write or hand-edit a board, a trace or an op.** A new op verb is a `system/board-ops.mjs` edit (the `OPS` list, its `PARAMS` entry and the switch, together) plus a build-checks group 11 case, never a special case in the generator.
- **New composition proposal** → a REAL run. **UI-first path (preferred):** the portal's "Compose a view" drawer — answer /build's ten method questions, and `portal/lib/builder.mjs`'s three committed rules draft the question from two of them; the drafted question is EDITABLE before the run, and the PIV phases stream live. Leave the `--dry` box checked for the first run: a dry run is a full agent run over the real fixtures that writes nothing, so `in-process validateComposition ✓` is what proves the question is answerable before a real one is spent. **The equivalent CLI:** `node portal/record-composition.mjs <scenario> "<question>" <slot> [--slug <slug>]`. The scenario must carry a `scenarios/<scenario>/compose.json`. Verify the numbers against the fixture (Fieldwork has `node tooling/fieldwork-kpis.mjs`). Same honesty rule as traces — never hand-write a composition or hand-feed an example; the `compose.json` computeRules carries DEFINITIONS ONLY.
- **Platform capability (epic work)** → check `docs/epics/ai-first-ux-factory.architecture.md` first — most "new" pieces are already-decided Missing pieces with format and placement pinned.

## Ground rules (conventions)
- **Shipped pages are vanilla — hard constraint.** No framework, no bundler, no build step, no runtime deps, no live LLM calls at view time (agents run at build time; readers replay). Factory tooling is unrestricted but stays zero-dep Node ESM where possible — the portal's dependencies are `@anthropic-ai/claude-agent-sdk` and its peer `zod`, the latter only to declare in-process tool schemas (spike #280); nothing else.
- **Invariants live in the file that owns them.** Feature and entry-point files open with a header citing their governing doc (`strategy §13`, `RUNBOOK P11`, `epic #202 ticket #219`); helper modules get a plain what/why header. That header is the specification — the map above is only an index, and restating an invariant in both places creates a second copy that silently drifts. Cross-file facts that no single module owns go to `.claude/references/`, not here.
- **Token discipline:** components reference semantic tokens only — a brand value or literal in `components.css` is a bug. Mechanic + how to add a token → `.claude/references/token-system.md`.
- **Types:** plain JavaScript — no TypeScript, no schema library for validation. Validate by hand at the boundary and throw (`portal/lib/intake.mjs`). The one `zod` use is the SDK's tool-schema adapter (#280); an applier and a boundary validator never import it.
- **Errors:** throw plain `Error`s whose message names the offending path (`agent-layer/lib.mjs`); one catch-all at the server boundary returns `{ error }` JSON (`portal/server.mjs`). No error taxonomy, no wrapping.
- **Secrets:** only in `portal/.env`, hand-parsed by `portal/lib/env.mjs` (no dotenv) — never committed, never client-side.
- **Honesty contract (hard, from the PRD):** fictional scenarios visibly labeled; traces labeled "real run, curated"; capability indicators state exactly what runs vs. what's plan-gated. Never hand-write anything presented as agent output — re-run with tighter prompts instead.
- **Git:** work on `main`; one atomic commit per phase/ticket, message = what + doc reference (`portal V1: … (strategy §13, P11)`). **A PR body MUST carry a `Closes #N` trailer** for the ticket it finishes — a title that merely mentions `(#N)` does not close anything. **A ticket's plan, report and review belong in the same PR** (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`). **Deploy = commit the artifacts:** generators run at authoring time, outputs are committed, Pages serves the repo as-is — so never hide generated outputs behind a build step or `.gitignore`.
- **Testing:** no suite, no linter, no type-check — don't hunt for or invent one. "Done" = run the surface you touched: portal boots and `/api/health` answers; a generator prints its `✓` line; a page renders under the neutral pack. Which gate proves what → `.claude/references/gates.md`.

## Working principles
- Platform work is governed by `docs/epics/ai-first-ux-factory.prd.md` + `.architecture.md` — if a change would contradict a decision recorded there, stop and flag it; don't silently drift.

## Commands
- portal: `cd portal && npm install && npm start` → http://localhost:4747
- static shell preview: `npx serve .` (repo root)
- agent layer (from the jobs folder): `node ../ux-factory/agent-layer/build.mjs _factory/kb/decisions/<company>.md`
- per-company instance (from the jobs folder; **--out MUST be outside the repo**): `node ../ux-factory/agent-layer/build-instance.mjs <brief.md> --out <dir> --pack <tokens.<slug>.css> --trace <derivation.jsonl> --replay <slug> [--handoff <url>]` — builds the deploy dir + prints the deploy command; then `npx wrangler pages project create inst-<slug>-<rand> --production-branch main` and `npx wrangler pages deploy <dir> --project-name inst-<slug>-<rand> --branch main` (unlisted + noindex; deploy is the operator's explicit step)
- deploy: `npx wrangler pages deploy . --project-name factory-ux --branch main`
- gates: `node tooling/build-checks.mjs` (CI) · `node tooling/visual-regression/serve.mjs &` then `node tooling/<driver>-journey.mjs all` (operator-run)

## On-demand context
Route on-demand detail to `.claude/references/` — never back into this file.

- **`gates.md`** — the gate stack: build-checks' 27 groups, the five journey drivers, the pixel gate, the morph gates, and what each one states it CANNOT reach. Read before adding or changing a gate, or before trusting a green run.
- **`token-system.md`** — the three-layer mechanic and how to add a token.
- **`kb-format.md`** — kb record shapes + the ComponentSpec / DataContract format.
- **`backend-api-best-practices.md`** — API route work · **`frontend-component-best-practices.md`** — UI work.
- **`codebase-search-and-lsp.md`** · **`architecture-patterns.md`** · **`vertical-slice-architecture.md`** — general, not repo-specific.

Per-module detail is not in any of these: it is in the module's own file header.
