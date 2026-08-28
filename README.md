# ux-factory

The code for an AI-first UX-engineering factory: one place where a product brief is **decided, built,
handed off and shown**, by a real method, with the agents' work recorded and replayed. It is a
portfolio a hiring manager can verify instead of trust, and, when finished, the tool its owner uses
to make the next real product.

Per-application content, the pipeline skill and the knowledge base live in the sibling jobs folder
(`../Linards jobs folder/_factory/`); this repo holds the code and the committed artifacts the code
produces. Intent and decisions: `docs/epics/`.

## Why it exists

Two problems, one system.

- **Evaluators cannot verify senior UX-engineering skill.** Static portfolios and Figma decks are
  renders of claims. This site performs the pipeline in front of the reader: intake → generated design
  system → data-connected prototype → engineer-ready handoff pack, with real agent runs replayed step
  by step. Watch it run, inspect the pack, judge for yourself.
- **The factory could build but not decide.** Everything started after someone had already chosen
  what to build; the real discovery happened in a terminal and ended as prose nobody else could audit
  or run. The finished factory owns that half too, and the decisions it records are what the build
  half consumes.

## When finished: one brief, four stations

| Station | What happens | Where | Status (2026-08-28) |
|---|---|---|---|
| **Decide** | A scripted, attributed question bank (65 questions, stages 1–9) run as a live agent session in the portal. The agent judges each answer against the question's own weak-answer note; every op is one tool call into an applier; the output is a generated PRD in which every decision names its evidence and its kill criterion, on the requirements hierarchy business ← stakeholder ← solution ← transition. | `portal/`, `discovery/` | in progress, epic #279 |
| **Build** | A free canvas in the portal: real components under the brand pack on real screens, states as base-plus-overrides, the flow drawn as recorded connections. Parts come from ten generic primitives, compose-and-name, or a draft-then-ratify import from Brilliant and Figma. The agent composes only within the validated vocabulary and proposes the rest for the owner to ratify; a refusal is visible, never a silent fallback. | `system/studio-*.mjs`, `portal/` | in progress, epic #295 |
| **Hand off** | A generated pack: ComponentSpec and DataContract from one source, token targets for css, iOS and Android, the agent vocabulary, Web Component wrappers, the Figma import path. Never edited by hand. | `handoff/`, `agent-layer/` | shipped |
| **Show** | The public site replays committed runs: the 90-second gate, the studio, the two data-connected prototypes with their agentic slots (ask → propose → adjust), the component catalog, traces as PIV acts, and the gates as evidence. A company brief compiles to a private, unlisted instance under that company's derived pack. | `*.html`, `system/`, `replay/`, `traces/` | shipped; moves onto the free canvas with #295 |

## What holds it together

- **A token contract.** Three stylesheets: the contract (every semantic token, neutral fallbacks,
  never a brand), a pack, and token-only components. Re-skinning a site is one line in the head.
  `system/tokens.source.json` (DTCG) is the source of truth; the CSS is generated from it.
  Mechanic → `.claude/references/token-system.md`.
- **A method spine.** Shape Up's breadboard and Eyal's Hook loop with its ethics gate, performed on
  the working surface rather than described; the systems-thinking layer names the structure and
  states the outcome each habit buys.
- **Agents at build time, replayed at view time.** Shipped pages are vanilla HTML, CSS and ES
  modules: no framework, no build step, no runtime dependency, no model call in the reader's browser.
  The portal at 127.0.0.1 is the one place a live agent runs, fenced to one tool per op.
- **An honesty contract, hard.** Fictional scenarios labelled; traces labelled "real run, curated";
  capability indicators say what runs and what is gated. Nothing presented as an agent's work is
  hand-written; a bad run is fixed by a tighter prompt and a re-run.
- **Gates as evidence.** Generator drift-check, token lint, the pure build-check groups, a pixel gate
  and five journey drivers; each is something a technical reader can inspect. Which gate proves
  what → `.claude/references/gates.md`.

## Where things are

`CLAUDE.md` is the index of the tree and the rules for adding to it. `docs/epics/` holds the PRD and
architecture for each epic, in order: platform (#1), per-company brief (#38), portfolio v3 (#70),
generative prototyper (#86, parked), the pattern builder (#134), prototyping feel (#164), the studio
(#202), systems thinking × UX (#243), discovery partner (#279), canvas + design import (#295).
Tickets live in this repo's issues.

## Run locally

```
npx serve .                                # the shipped site
cd portal && npm install && npm start      # the workbench → http://localhost:4747
node tooling/build-checks.mjs              # the CI gate
```

## Deploy

```
npx wrangler pages deploy . --project-name factory-ux --branch main
```

Deploy is committing the artifacts: generators run at authoring time, outputs are committed, Pages
serves the repo as-is.
