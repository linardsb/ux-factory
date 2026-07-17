# CLAUDE.md — ux-factory

## What this is
The code repo for an AI-first UX-engineering portfolio platform: a token-contract design system that re-skins an entire site from one line of CSS, plus the build-time "factory" around it — Node ESM generators and a local portal workbench — being extended into a pipeline that runs visibly in front of the reader (intake → generated design system → data-connected prototype → handoff pack) so hiring managers can verify senior UXE skill instead of trusting claims. This repo holds code only; per-application content, the pipeline skill, and the knowledge base live in the sibling jobs folder (`../Linards jobs folder/_factory/`). Intent and decisions: `docs/epics/`.

## Architecture map
```
system/                     the shipped design system — brand-agnostic core + packs
  tokens.source.json        DTCG source of truth — gen-token-css.mjs generates the two CSS layers below from it
  tokens.contract.css       layer 1 (GENERATED): every semantic token components may use, with neutral fallbacks; no brand ever
  tokens.neutral.css        layer 2 (GENERATED): the neutral pack; a company build clones it to tokens.<company>.css
  components.css            layer 3: token-only components — no literals, render identically under any pack
  portfolio.css / proto.css surface styles for portfolio pages / prototypes
  site.js                   injects chrome (header/footer/nav) from window.CLIENT_CONFIG
  derive.mjs (+ oklch.mjs, wcag.mjs, derive.rules.mjs)   view-time derivation engine: intake answers → token values + WCAG checks + ethics verdict; driven raw by /derive.html, spike runner in tooling/ (epic #1 ticket #3)
  tokens.css / tokens.saulera.css / client.config.js   real packs kept as reference; NOT loaded by the shell
index.html / 404.html       the neutral site template shell (loads contract + neutral pack + components)
_headers                    security headers + noindex (revisit at launch — epic open question)
agent-layer/                build-time Node ESM generators: machine-readable projection of one site
  build.mjs                 orchestrator — run FROM THE JOBS FOLDER against a decisions ledger
  lib.mjs                   ledger parser + shared helpers
  gen-*.mjs + inject-jsonld.mjs   one file per emitted artifact (canon token CSS, decisions.json, DTCG tokens.json, llms.txt, _headers, JSON-LD); each runnable standalone
portal/                     local-first workbench (127.0.0.1 only, never deployed)
  server.mjs                zero-dep node:http server — thin route dispatch, logic in lib/
  lib/                      one concern per module: env.mjs (paths + .env), kb.mjs (card projections), intake.mjs, chat.mjs (Agent SDK behind SSE)
  public/                   vanilla SPA — hash routing, template strings, no framework
docs/epics/                 PRD + architecture decisions governing the platform build
tooling/mcp/                local MCP helper scripts
```
The kb (`_factory/kb/` in the jobs folder) is the database — record shapes + parsers → `.claude/references/kb-format.md`.

## Where new code goes
- **Portal API endpoint** → a route branch in `portal/server.mjs` (`readBody` → delegate → `json(res, …)`); logic in a `portal/lib/<concern>.mjs` module, one concern per module.
- **Portal UI feature** → `portal/public/portal.js`: a hash route + render function using the existing `api()` helper; styles in `portal.css`.
- **Machine-layer artifact** → `agent-layer/gen-<output>.mjs` exporting `gen<Name>(ledger)`; register in `build.mjs` (import + call + `✓` log line), keep the standalone-run guard. Shared parsing belongs in `lib.mjs`.
- **Component** → token-only CSS in `system/components.css`; a new semantic token gets added to `system/tokens.source.json` (contract group) first, then regenerate: `node agent-layer/gen-token-css.mjs`.
- **Brand/company skin** → clone `system/tokens.neutral.css` → `tokens.<company>.css` and `client.neutral.config.js` → `client.<company>.config.js`; never fork components.
- **View-time behaviour on shipped pages** → a hand-written ES module beside `system/site.js`.
- **kb record type or field** → `.claude/references/kb-format.md` (both parsers must stay in sync).
- **Platform capability (epic work)** → check `docs/epics/ai-first-ux-factory.architecture.md` first — most "new" pieces are already-decided Missing pieces with format and placement pinned.

## Ground rules (conventions)
- **Shipped pages are vanilla — hard constraint.** No framework, no bundler, no build step, no runtime deps, no live LLM calls at view time (agents run at build time; readers replay). Factory tooling is unrestricted but stays zero-dep Node ESM where possible — the portal's sole dependency is `@anthropic-ai/claude-agent-sdk`.
- **Token discipline:** components reference semantic tokens only — a brand value or literal in `components.css` is a bug. Mechanic + how to add a token → `.claude/references/token-system.md`.
- **Types:** plain JavaScript — no TypeScript, no schema library. Validate by hand at the boundary and throw (`portal/lib/intake.mjs`).
- **Errors:** throw plain `Error`s whose message names the offending path (`agent-layer/lib.mjs`); one catch-all at the server boundary returns `{ error }` JSON (`portal/server.mjs`). No error taxonomy, no wrapping.
- **Feature/entry-point files open with a header citing their governing doc** (`strategy §13`, `RUNBOOK P11`, `_factory/agent-layer.md §4`); helper modules get a plain what/why header. New files follow suit.
- **Secrets:** only in `portal/.env`, hand-parsed by `portal/lib/env.mjs` (no dotenv) — never committed, never client-side.
- **Honesty contract (hard, from the PRD):** fictional scenarios visibly labeled; traces labeled "real run, curated"; capability indicators state exactly what runs vs. what's plan-gated. Never hand-write anything presented as agent output — re-run with tighter prompts instead.
- **Git:** work on `main`; one atomic commit per phase/ticket, message = what + doc reference (`portal V1: … (strategy §13, P11)`). **Deploy = commit the artifacts:** generators run at authoring time, outputs are committed, Pages serves the repo as-is — the repo itself is inspectable proof for technical readers, so never hide generated outputs behind a build step or `.gitignore`.
- **Testing:** no suite, no linter, no type-check — don't hunt for or invent one. "Done" = run the surface you touched: portal boots and `/api/health` answers; a generator prints its `✓` line; a page renders under the neutral pack.

## Working principles
- Platform work is governed by `docs/epics/ai-first-ux-factory.prd.md` + `.architecture.md` — if a change would contradict a decision recorded there, stop and flag it; don't silently drift.

## Commands
- portal: `cd portal && npm install && npm start` → http://localhost:4747
- static shell preview: `npx serve .` (repo root)
- agent layer (from the jobs folder): `node ../ux-factory/agent-layer/build.mjs _factory/kb/decisions/<company>.md`
- deploy: `npx wrangler pages deploy . --project-name factory-ux --branch main`

## On-demand context
- API route work → `.claude/references/backend-api-best-practices.md` · UI work → `.claude/references/frontend-component-best-practices.md`
