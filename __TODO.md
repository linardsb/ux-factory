# __TODO — ai-first-ux-factory: spikes & build phases

Consolidated from [docs/epics/ai-first-ux-factory.prd.md](docs/epics/ai-first-ux-factory.prd.md) (intent) and
[docs/epics/ai-first-ux-factory.architecture.md](docs/epics/ai-first-ux-factory.architecture.md) (decisions).
Working sequence doc — ticket slicing happens later via `piv-slice-epic`. Order is dependency-driven;
phases 1–4 can partially run in parallel once Phase 0 lands.

**Status** (checked 2026-07-18 against the codebase): `[x]` done · `[~]` partial — the note says what's left · `[ ]` not started. Verified against source files, generated artifacts, and GitHub issue state; the pre-existing checkboxes were all stale. Through-line: the engines/primitives are built, but the two designed reader-facing surfaces — the **Factory page (#10)** and the **agentic-UI study page (#13)** — are still open, which blocks most of Phase 5/6 and the 7.3/7.5 sequencing.

**Scope-hammer levers if the circuit-breaker trips (in order):** drop the *adjust* step of the HITL loop
(fall back to ask → propose) → cut precomputed proposal count → cut Style Dictionary iOS/Android targets.

---

## Order to finish the MVP  (remaining work, dependency-sequenced — 2026-07-18)

MVP = one thin pipeline run, end to end (epic #1 §6). The foundation, engine, data, handoff, trace, and site-shell tickets (#2–#9, #11, #12, #14) are **merged**. **Two feature tickets remain — #10 (Factory page) and #13 (agentic-UI study) — and both have all their dependencies already merged, so both are buildable now.** Everything else is finish-and-ship.

Below, each work item and each `Done when` gate is a checkbox; `(N.N)` links it to the status backlog further down, `✓` marks a dependency already shipped. **Parallelism:** #10 and #13 can run in parallel worktrees (`worktree-create`) — they couple only where #13 fills #10's Fieldwork slots; integrate via a branch (`worktree-merge`) before Step 3.

**Reading the order:** across steps the order is strict — **Step 1 → Step 2 → Step 3.** *Within* a step, do the **numbered** items in sequence (top to bottom); an **(after N)** tag flags a hard prerequisite. **Unnumbered** items — the *Cross-cutting* group and the *Side rails* — are woven in or done any time, not a fixed slot.

### Step 1 — Factory page (#10): the MVP spine
**Deps** #3 #4 #5 #8 (all merged) · **Consumes** derivation engine, scenario packages, trace player, site chrome, prototypes · **Files (est.)** `factory.html` + station ES modules beside `system/site.js` + wizard styles/wiring — ~900–1500 lines.

**Context to plan against:**
- **Lift the working reference:** `derive.html` already wires the engine end to end — controls → `derive({brandColor,density,rewardType,frequency})` → apply `result.tokens` as inline custom properties on `<html>` (that override outranks the contract + pack layers — it *is* the re-skin mechanism) → render `result.checks` / `result.notes` / `result.ethics.verdict` / `result.patterns`. #10 wraps this in the wizard UX + the five-station shell; the engine is proven, don't rebuild it.
- **`derive()` API** (`system/derive.mjs`, DOM-free, throws naming a bad input): also accepts `improvesLives` / `wouldUseIt` booleans → these feed the ethics gate, so they are the inputs for the **5.7** guess-then-reveal Manipulation-Matrix moment. Rules live in `system/derive.rules.mjs` (frozen `RULESET`: `scales` = density options, `patterns` = reward types, `ethics.frequencyFilter` = frequency options — read these for the exact enum values the wizard offers).
- **Prototype embeds already exist:** reuse `proto/verdant.html` (5.4 — `loadCollection()` from `system/scenario-data.mjs`, Worker-first + static fallback, reports `source`) and `proto/fieldwork.html` (5.5 — honest-empty slots). Embed, don't re-author.
- **Trace player** (`system/trace-player.mjs`): `parseTrace(text)` → `{meta,steps,result}`, then `renderTracePlayer(…)` returns a **`destroy()`** — the scenario toggle re-renders, so call `destroy()` before each swap or the document-level keydown listener stacks. `meta.label` renders verbatim (honesty); trace text via `textContent` (untrusted).
- **Analytics** (`system/analytics.mjs`): `import { trackFactoryDriven }` and call it once when the reader drives the pipeline (fire-once virtual-route pageview `/factory/driven`; token stays empty until Step 3).
- **Page shell:** match the shipped pages — `<body data-page="factory">`, the 3 stylesheet layers, then `client.neutral.config.js` + `site.js` (injects chrome from `window.CLIENT_CONFIG`) + `portfolio.js` + `analytics.mjs`. New view-time logic = hand-written ES module(s) beside `system/site.js`; new component CSS is token-only in `system/components.css` (add a semantic token to `tokens.source.json` + regenerate first — never a literal). Current `factory.html` is the stub to replace; its "What's plan-gated" list already names the five stations with `<span class="capability">In build</span>` badges.
- **Hard constraints:** vanilla · no build step · no view-time LLM · token discipline · the live moment must be view-time-safe (fallback per architecture "approach B" — nothing fails on stage) · all three honesty surfaces present.
- **Verify:** renders under the neutral pack; changing a wizard answer re-skins live; the toggle swaps all five stations; Verdant vs Fieldwork ethics verdicts differ; `trackFactoryDriven()` fires once.

*Station 1 · Intake (guided wizard)*
- [ ] **1.** Finalize the intake cut: 3–5 asked, rest defaulted — record it here + in issue #10 (5.2, closes the PRD's last open question). Draft set = PRD §6 (8 Qs); the scenarios already flag 3/8 `asked:true` in `intake.defaults.json`.
  - The 8 candidates live in the PRD §6 table and both `scenarios/*/intake.defaults.json` (each carries `asked` · `default` · `reasoning`). Keep the 3–5 whose answers most visibly steer output: brand color · density · reward type · frequency map straight to `derive()` inputs, and the ethics pair (`improvesLives`/`wouldUseIt`) is the 5.7 moment. Write the final cut back into both `intake.defaults.json` files and paste it into #10.
- [ ] **2. (after 1)** Wizard UI: one decision at a time; each asked question shows a recommended default **and its reasoning**; overrides bounded; defaulted questions accepted silently (5.1).
  - New ES module beside `system/site.js` (e.g. `system/factory-intake.mjs`): one question card with Back/Next; preselect the `default`, show `reasoning` as helper text; inputs constrained to the enum values from `derive.rules.mjs`; defaulted questions never render. Model the widgets on `derive.html`'s controls strip (a color input + `<select>`s).
- [ ] **3. (after 2)** Wire answers → engine inputs (brand color · density · reward type · frequency), bounded.
  - Assemble answers into the `derive()` input object and re-run on every change (as `derive.html:168-187` does); scope the emitted custom properties to the preview station's root, not `<html>`, so only the sample re-skins. Wrap in try/catch — `derive()` throws naming a bad input.

*Station 2 · Design-system generation*
- [ ] **4.** Staged worked example of the generation process (5.6).
  - A stepped narrative — brand→palette+WCAG, density→scales, reward→patterns, frequency→verdict — rendered from `result.checks` / `result.notes` / `result.patterns`. The `notes` array already explains each brand-vs-accessibility negotiation ("what was negotiated"): surface those as the teaching beats, no callouts.
- [ ] **5. (after 3)** The one genuinely-live moment: run `derive()` + the one-line token-pack swap live in-browser, view-time-safe with a fallback (architecture approach B) — the designed home for the 1.7 engine.
  - This is the single hard-live moment (every other station replays precomputed work). View-time-safe = try/catch around `derive()` + apply, falling back to the committed neutral pack on any throw — nothing fails while a hiring manager watches.

*Station 3 · Prototypes*
- [ ] **6.** Embed the Verdant data-connected screen (5.4 ✓, `proto/verdant.html`) + the Fieldwork hybrid canvas (5.5 ✓, `proto/fieldwork.html`); Fieldwork slots stay honest-empty until Step 2.
  - Embed the existing pages (iframe, or lift their markup + `loadCollection()` wiring); both already degrade Worker→static and report `source` for the honesty surface — don't duplicate the components. Fieldwork's two `data-slot` regions render empty here until 2b fills them.

*Station 4 · Handoff*
- [ ] **7.** Link the handoff pack + live viewer (#14 ✓, `handoff.html`).
  - Link `handoff.html` (renders the three projections: spec head · engineer docs · agent vocabulary) + the downloadable `handoff/verdant/pack.bundle.json`. Check-terminate the station ("inspect the pack").

*Station 5 · Agents visible*
- [ ] **8.** Mount the trace player on the station (4.4 ✓, `system/trace-player.mjs`).
  - `import { parseTrace, renderTracePlayer }`, fetch the JSONL, `parseTrace(text)`, render into the station. Keep the returned `destroy()` and call it before the scenario toggle re-renders (its document-level keydown listener stacks otherwise).
- [ ] **9.** **Record ≥1 real generation-pipeline trace (4.2, required):** a real agent run over actual generator work → curate → label "real run, curated" (`portal/record-trace.mjs` → `tooling/curate-trace.mjs` → `tooling/validate-trace.mjs`). Don't ship only `demo-notice`.
  - Point the recorder at a real generator task (regenerate a pack, derive a company skin) so the replayed run reads as the factory's actual work. Fix a weak run with a tighter agent prompt + re-run — never edit the trace (honesty contract, hard). Commit the raw+curated pair under `traces/`.

*Cross-cutting — weave in while building 1–9, then finish in one pass (not a strict sequence)*
- [ ] Scenario toggle Verdant⇄Fieldwork swaps all five stations end to end; the two ethics verdicts differ (5.3).
  - One control switches the active scenario package (`scenarios/index.json` → verdant | fieldwork); each station reads that scenario's `intake.defaults.json` / `copy.json` / fixtures. Verdant → habit-justified, Fieldwork → utility: the toggle proves the same rules ruling differently.
- [ ] Ethics gate = the one guess-then-reveal Manipulation-Matrix moment; compare-notes register, no grading (5.7).
  - Ask the reader to place the product on the matrix first (their `improvesLives`/`wouldUseIt` call), then reveal the engine's `result.ethics.verdict` beside it — compare notes, no right/wrong. Matrix + verdict text: `derive.rules.mjs` (`ethics`) + the scenario `copy.json` (`ethicsReveal`).
- [ ] Fire the "factory driven" event + station deep links (8.2 activation, `system/analytics.mjs`).
  - `import { trackFactoryDriven }` and call once when the reader first drives the pipeline (completes intake or triggers the re-skin). Give each station a hash route so it's deep-linkable; the fire-once virtual `/factory/driven` pageview *is* the "factory driven" event.
- [ ] Capability indicators incl. the Figma "built, switch-on" wording (3.7 UI half).
  - Each station states what runs vs. what's gated (honesty surface 3), reusing the `<span class="capability">` badge. The Figma line reads "built, switch-on" until the token run (Step 3 side rail) flips it to "runs now".
- [ ] Legibility nuggets woven in — zero pedagogy callouts (PRD §6 subtlety bar).
  - Teaching lives inside station copy per the *teach* discipline (`__UX_UI_Research.md` §10) — no callouts, badges, or "did you know"; success reads as unusual clarity, not visible pedagogy. The `derive()` `notes` are the raw material for the generation station.

**Done when:**
- [ ] Reader answers visibly steer the output within designed bounds; wizard shape matches PRD §6.1.
- [ ] The re-skin runs the real derivation engine + token-pack swap live, and nothing at view time can fail on stage (fallbacks per approach B).
- [ ] The scenario toggle swaps pipeline content end to end; the ethics gate is the one guess-then-reveal moment.
- [ ] The "factory driven" event fires and station deep links resolve.
- [ ] All three honesty surfaces present: fictional labels · "real run, curated" trace labels · capability indicators.

### Step 2 — Agentic-UI study (#13): the second exhibit
**Deps** #8 #11 (merged) · **Consumes** vocabulary/renderer/bus, Fieldwork data + canvas · **Reuse** the trace-recorder pattern to record runs · **Files (est.)** study page + ask/propose/adjust UI + build-time composition runner + committed proposal sets + slot wiring — ~800–1400 lines.

**Context to plan against:**
- **Substrate is built** (`system/agentic-renderer.mjs` + `action-bus.mjs`): `validateComposition(vocab, composition)` is **pure / DOM-free** — call it under Node inside the composition runner to enforce the honesty bound (agent output that fails validation is refused, never hand-fixed). `renderComposition(vocab, composition, bus)` validates first, then builds real components element-by-element (never `innerHTML`) and wires interactions to the bus.
- **Composition shape:** a node `{name, props, children?}` or an array of them; rules in `handoff/verdant/vocabulary.json` → `composition` (`shape` / `childrenRule` / `chipRule`). Vocabulary is passed in, not fetched — the caller loads it.
- **Lift the reference:** `agentic.html` is the raw workbench — it keeps `DEFAULT_COMPOSITION` / `ALT_COMPOSITION` as page state, mutates + re-renders on an `agent:` bus command, runs a 5-item refusal battery, and logs `ui.*` / `agent.*` on one bus. #13's **adjust** stage *is* this mutate-and-re-render; **propose** swaps the two hardcoded comps for the committed proposal sets; **ask** is the question picker in front.
- **Vocabulary extension (why 3.1/2.4 come first):** `vocabulary.json` is Verdant-only and enum-locked (e.g. `care-task-row.type` ∈ water|fertilise|repot|inspect) — Fieldwork can't compose against it. Add a generic component (e.g. a metric-tile) via a new `system/specs/` spec + DataContract, then regenerate with `agent-layer/gen-vocabulary.mjs` (do **not** hand-edit `vocabulary.json`). Spec/contract format: `.claude/references/kb-format.md`.
- **Composition runner:** new build-time factory tool; reuse the trace-recorder pattern (`portal/lib/trace-recorder.mjs` + `portal/record-trace.mjs`) to wrap the Agent SDK and record each run; prompt with **only** the vocabulary + Fieldwork fixtures (`scenarios/fieldwork/fixtures/*`). Same honesty rule as traces — a weak run is fixed by a tighter prompt + re-run, never by editing the output.
- **Fieldwork slots:** the two `data-slot` regions in `proto/fieldwork.html` are plain "Planned — not running yet" placeholders today; the boundary decision is in its header (#8). Fill the study page **and** this embed from the same committed proposals.
- **Verify:** the runner's proposals pass `validateComposition` under Node; the study page renders a proposal and an adjustment re-renders live via the bus; slots render within bounds; drift-check stays green after regeneration.

*2a · Composition runs (folds spike 6 — do before 2b; the last unretired risk)*
- [ ] **1.** Extend the shared vocabulary for Fieldwork, e.g. a generic metric-tile — Verdant components are enum-locked (`agent-layer/gen-vocabulary.mjs`).
  - Verdant's props are plant-care enums (verbs/statuses), so Fieldwork can't compose against them. Add one data-agnostic component — a metric-tile (label + value + optional unit/trend) is the decided candidate — authored as a spec so `gen-vocabulary.mjs` emits it into the vocabulary; keep it token-only and brand-agnostic.
- [ ] **2.** Add ComponentSpecs (3.1) + JSON-Schema DataContracts (2.4) for the composed Fieldwork components so the renderer can validate them (`system/specs/`).
  - For each Fieldwork component the compositions use, write `system/specs/<name>.md` (+ `.contract.json` if data-bound) per `.claude/references/kb-format.md`, then `node agent-layer/gen-handoff.mjs`. `validateComposition` checks props/enums/children against the generated vocabulary, so the specs must be exact.
- [ ] **3. (after 1–2)** Build the build-time composition runner (factory tooling, new; reuse the trace-recorder pattern) — prompt an agent with **only** the vocabulary + Fieldwork data.
  - New CLI mirroring `portal/record-trace.mjs` (e.g. `portal/record-composition.mjs`): wrap the Agent SDK, system-prompt it with only the vocabulary JSON + Fieldwork fixtures, ask for a `{name,props,children}` composition answering one question, and run the output through `validateComposition` (Node) before saving. Record the run like a trace.
- [ ] **4. (after 3)** Run 3–5 composition runs over distinct analytical questions; review each against the slot bounds (S6 · 4.5).
  - Pick 3–5 real questions over the heavy-ops data (e.g. SLA-risk by region · technician load · unassigned backlog). Each output must validate against the vocabulary AND fit the slot bounds (summary-strip + insight-panel). Save committed sets (e.g. `proto/compositions/<slug>.json`).
- [ ] **5. (after 4)** Decision rule: defensible → commit the proposal sets; weak → tighten vocabulary/composition rules and re-run. **Never hand-write a composition.** Record the outcome in issue #13.
  - ≥3 defensible, in-bounds runs → ship them as the proposals + record the verdict in #13. Weak → tighten the vocabulary usage prose or the prompt and re-run (same honesty rule as traces — no hand-fixing).

*2b · Study page (after 2a)*
- [ ] **6.** Build the deep-linkable study page (the first item under Work).
  - New shipped page (e.g. `agentic-ui-study.html`, routed under Work), same vanilla shell as the others (3 layers + `client.neutral.config.js` + `site.js` + `analytics.mjs`). This is Exhibit 2.
- [ ] **7. (after 6)** ask→propose→adjust: reader picks a question → sees proposed compositions → adjusts live via the renderer (6.1 ✓) + action bus (6.2 ✓) (6.3).
  - **ask** = pick one of the 3–5 questions; **propose** = load that question's committed set + `renderComposition(vocab, comp, bus)`; **adjust** = bounded controls emit on the bus → mutate the composition → re-render (the `agentic.html` mutate-and-re-render loop). Proposals precomputed, adjustment live — no view-time LLM.
- [ ] **8. (after 7)** Fill the Fieldwork hybrid-canvas agentic slots with the committed compositions — on the study page **and** back in the Step-1 Factory embed (5.5 slot-fill).
  - Render the same committed compositions into `proto/fieldwork.html`'s two `data-slot` regions (within bounds) and into the Factory prototype embed — replacing the "Planned — not running yet" placeholders on both surfaces.
- [ ] **9.** Protocol-lineage nuggets: A2UI / AG-UI cited nugget-style, pattern-compatible wording, never claiming protocol dependence (6.4).
  - "the shape A2UI standardizes", "what AG-UI calls human-in-the-loop" — lineage only; the renderer/bus are vanilla. Source: `UX_UI_docs/Agentic_ui.txt`, PRD §6.6.
- [ ] **10.** Cross-links both ways: Fieldwork slots ↔ study page (6.5).
  - Link each filled Fieldwork slot (in the Factory embed) → the study page, and the study page → the Fieldwork canvas. The one place Exhibit 1 ↔ Exhibit 2 connect.
- [ ] **11.** Position the study as the flagship/first item under Work and link it (7.3).
  - In `work.html`, move Exhibit 02 to first and add its missing `card-foot` link (the other cards have one) → the study page. Architecture decided it's the flagship Work item.

**Done when:**
- [ ] Committed proposal sets come from real build-time runs prompted only with the vocabulary + Fieldwork data.
- [ ] The study page's ask→propose→adjust works live (renderer + action bus).
- [ ] The Fieldwork hybrid-canvas slots render agentic compositions within their designated bounds.
- [ ] Protocol lineage is nugget-style; the bridge argument is legible — Exhibit 1's system is what makes Exhibit 2 safe, shown not told.

### Step 3 — Finish & ship
**Context to plan against:**
- **Relight anchors:** capability badges are `<span class="capability">…</span>` — `factory.html` carries five ("In build") plus the two other pages; `index.html`'s "Three ways to verify" cards (the recruiter gate) point at Factory/Work; `work.html`'s Exhibit-02 card has no `card-foot` link yet (the other cards do). Flip badges → live and wire the three Home shortcuts to real destinations once #10/#13 land.
- **Regeneration:** re-run `agent-layer/build.mjs` generators + `gen-handoff.mjs` / `gen-vocabulary.mjs`; CI (`.github/workflows/verify.yml` — drift-check + token-lint + visual-regression) must stay green, so regenerate, never hand-edit generated files.
- **reduced-motion** is already global (`system/portfolio.css` + `proto.css`); the perf pass adds LCP/INP measurement on the two heavy pages (Factory, study).
- **Launch toggles:** `BEACON_TOKEN` + `PRODUCTION_HOST` in `system/analytics.mjs`; noindex lives in `_headers` + per-page `<meta name="robots">`; deploy = commit the artifacts, then `wrangler pages deploy` (no CI build step — the repo stays inspectable proof).

- [ ] **1. Relight the entry points** (both exhibits now live): flip the "In build"/"Planned" capability badges to live; wire Home's three proof shortcuts to real destinations (watch a trace · inspect the pack · drive the factory); fix `factory.html`'s stale "Handoff pack — In build" → the live viewer (#14). *(7.1 reads done, but its destinations were stubs.)*
  - Concretely: in `factory.html`, flip the five `<span class="capability">In build</span>` labels and link the "Handoff pack" line → `handoff.html`; in `index.html`, point the three "ways to verify" cards at real destinations (trace player · handoff viewer · factory page); confirm no shipped card still links to a stub.
- [ ] **2. a11y + performance pass (8.4):** measure LCP/INP on the two heavy pages (Factory, study); confirm `prefers-reduced-motion` covers the trace player + live re-skin; audit a11y against the contract defaults.
  - Lighthouse / DevTools on Factory + study; verify focus order and keyboard paths through the wizard and the bus interactions; contrast is already AA from the contract, but re-check any derived-palette preview. Reduced-motion is global in `portfolio.css` — confirm it also quiets the live re-skin transitions.
- [ ] **3. Voice-contract pass over ALL copy (7.5) — always last:** phenomenon first · gloss as appositive · first-person testimony · pull never push · compare notes · close every loop.
  - Read every shipped page against the voice contract (`__Approach_page.md:12-20`); run only after Factory + study copy exists (most of it doesn't yet). Use the humanizer discipline to strip AI tells.
- [ ] **4. Regenerate artifacts:** re-run the agent-layer generators (8.3) + the handoff pack once content settles; CI drift-check must stay green.
  - `node agent-layer/build.mjs <ledger>` (from the jobs folder) + `node agent-layer/gen-handoff.mjs` + `gen-vocabulary.mjs`; commit the outputs; run `tooling/drift-check.mjs` + `token-lint.mjs` locally first. Never hand-edit generated files.
- [ ] **5. Redeploy (8.1):** `npx wrangler pages deploy . --project-name factory-ux --branch main` — the live site still serves the pre-#6 placeholder.
  - Load-bearing: nothing shipped since #6 is visible until this runs. Deploy = commit the artifacts, then push to Pages (no CI build step); verify the live URL shows the current IA afterward.
- [ ] **6. Activate analytics (8.2) — at launch:** fill `BEACON_TOKEN` + `PRODUCTION_HOST` in `system/analytics.mjs` at launch.
  - `BEACON_TOKEN` = the public site token (CF dashboard → Web Analytics → Manage site); `PRODUCTION_HOST` = canonical prod hostname (an allow-list, so `*.pages.dev` / local never record). Both empty = fail-closed. Confirm a pageview + the `/factory/driven` event register post-launch.
- [ ] **7. noindex call (8.6) — at launch:** portfolio-by-link vs. indexable — decide, then set `_headers` + per-page meta accordingly.
  - Keep noindex (`X-Robots-Tag` in `_headers` + per-page `<meta name="robots">`) for portfolio-by-link, or remove both to be indexable. The last open launch decision; make it when the first application ships.
- [ ] **8. Application log (8.5) — at launch:** stand up the hypothesis instrument — RIGHT = ≥1 artifact-driven interview in the first ~10 apps (~8 wks); WRONG = silence after 10, or invites that never mention the artifact; review at the 10-app / 8-week mark.
  - A simple log in the jobs folder: per application, whether the artifact was referenced/forwarded (PRD §7 metrics). This is what decides the hypothesis — without it the WRONG condition is undiagnosable.

### Side rails (not on the critical path)
- [ ] **Token-gated Figma run (S1 · 3.7) — any time:** put `FIGMA_TOKEN` + `FIGMA_FILE_KEY` in `portal/.env` → `node tooling/figma/figma-parity.mjs` → commit `handoff/verdant/figma-parity.json`; flip the capability indicator from "built, switch-on" to "runs now." The UI ships without it.
  - Answers spike S1's still-open empirical question: the script attempts the Enterprise-gated `variables/local` endpoint and falls back to the Styles tree on a 403, so the committed `figma-parity.json` records which access this account actually has.
- [ ] **Authoring skills (A1–A3) — parallel jobs-folder track:** install *wizard / writing-fragments / beats / shape / to-questionnaire / prototype* into the jobs folder `.claude/skills/` (A1); rewrite pipeline Step 1 (Intake) to run grilling + wizard (A2); wire *to-questionnaire* beside the facts-checker (A3). Not platform-blocking, but it's how applications get produced to feed 8.5.
  - Scope is `Linards jobs folder/.claude/skills/` + the `_factory/` pipeline skill (not this repo). A3 hooks *to-questionnaire* onto `_factory/checkers/facts-checker.md` so an unverified claim becomes a question to send, never an invention (honesty contract).
- [ ] **Cleanup — only if a precondition becomes reachable:** #18 (verify the Worker `no-store` already shipped; the N>2 verdict check, registry-retry memoization, en-route fixture) · #32 (a generator-owned-paths manifest so drift-check catches stale sidecars; strip CSS comments before token-lint matching).
  - All are latent Lows with no current trigger (see `.claude/code-reviews/pr-16-review.md`, `pr-31-review.md`); log-and-defer, don't pre-fix.

**Out of MVP scope:** everything under "Post-MVP layers" below except CI drift-verify (done).

---

## Spikes (run before or alongside Phase 0 — each has a decision rule in the architecture doc)

- [~] **S1 · Figma REST access gate** (~1h, critical path) — can this account read Variables via REST, or only Styles? → decides the parity demo's shape + the capability-indicator wording. — script + docs shipped (`tooling/figma/figma-parity.mjs`, both Variables/Styles branches); the real read never ran (awaits FIGMA_TOKEN), so the empirical gate is still unanswered (#12).
- [x] **S2 · Palette derivation quality** (~1 day, critical path) — full accessible palette from ~5 diverse brand colors, auto-checked WCAG AA. ≥95% pairs pass → full live derivation; else color-only live, presets for the rest. — ran (`tooling/spike-palette.mjs`): 88/88 (100%) AA pass across 8 brand colors → "full live derivation" (#3).
- [x] **S3 · Web Component handoff DX** (~1 day) — wrap card + one list component as custom elements consuming DataContract-shaped JSON; try in plain page + React sandbox. Owns the "how does this land for platform engineers" question. — `system/wc/vd-*.mjs` + `tooling/wc-sandbox/react.html`, verified in plain page + React 19 (#12 closed).
- [x] **S4 · Style Dictionary ↔ DTCG compatibility** (~0.5 day) — `tokens.source.json` → css/ios/android transforms. — `tooling/style-dictionary/build-tokens.mjs`; all three targets ship (`handoff/verdant/tokens/{css,ios,android}`, #7).
- [x] **S5 · Trace recording quality** (~0.5 day) — one real Agent SDK run through hooks; curated trace must read as engineering (never hand-write). — `portal/record-trace.mjs` + `portal/lib/trace-recorder.mjs`; real run committed (`traces/demo-notice*.jsonl`, #5 closed).
- [ ] **S6 · Agent composition quality** (~0.5 day) — 3–5 composition runs from vocabulary + Fieldwork data; weak output → tighten vocabulary, never hand-write a composition. — plan only (`.claude/plans/agentic-ui-study.md`, "nothing implemented yet"); folded into #13 (open).

---

## Authoring skills (parallel track — jobs folder, zero epic dependency)

The composable shapes from `mattpocock/skills` that carry the creation-time loop (`__UX_UI_Research.md` §9–10).
Today only grill-me + teach are installed (user-level); nothing in the pipeline invokes them.

- [ ] A1 Install *wizard* · *writing-fragments/beats/shape* · *to-questionnaire* · *prototype* into the jobs folder's `.claude/skills/`.
- [ ] A2 Rewrite pipeline Step 1 (Intake) to run *grilling* + *wizard* — one decision at a time, answers proposed from the JD + cached DS pages.
- [ ] A3 Wire *to-questionnaire* beside the facts-checker: a missing human-held fact becomes questions to send, never an invention.

---

## Phase 0 — Foundation: token canon moves to this repo

- [x] 0.1 Retire the "GENERATED MIRROR" header — this repo becomes canon (mono-repo decision).
- [x] 0.2 Author `tokens.source.json` (W3C DTCG) from the existing contract — the inversion.
- [x] 0.3 DTCG→CSS generator: emit `tokens.contract.css` + packs from source.
- [x] 0.4 Parity check: generated CSS ≡ current CSS (visual check on `index.html`, neutral + saulera packs). — exceeded: `tooling/drift-check.mjs` + `tooling/visual-regression/` (16 baselines, 8 pages × 2 packs) both wired into CI.
- [x] 0.5 Style Dictionary config + multi-target outputs (css / ios / android). *(gated by S4)*

## Phase 1 — Derivation engine (the live-generation core, vanilla ES modules)

- [x] 1.1 OKLCH color math + WCAG contrast checker module. *(gated by S2)*
- [x] 1.2 Palette derivation rules: brand color → full accessible palette, checks shown passing.
- [x] 1.3 Type + spacing scale derivation (density axis).
- [x] 1.4 Reward-type (tribe/hunt/self) → component-pattern selection rules.
- [x] 1.5 Frequency answer → ethics/frequency-gate verdict logic.
- [x] 1.6 Derivation-rules artifact — versioned, reader-inspectable.
- [x] 1.7 Live re-skin moment: engine output wired to the one-line pack swap. — engine wired to a live re-skin in the `derive.html` harness; the *designed* staged version is 5.6 (Factory page, #10).

## Phase 2 — Scenarios & data

- [x] 2.1 **Verdant** scenario package: brief, intake defaults, copy, fixtures, prototype config. *(copy written via fragments → beats → shape — A1)*
- [x] 2.2 **Fieldwork** scenario package: same + heavy-ops dataset (feeds the agentic study). *(copy written via fragments → beats → shape — A1)*
- [x] 2.3 Fictional labeling on both (honesty surface 1 of 3). — hard-enforced by `scenarios/validate.mjs`; rendered on proto/check/work/agentic pages.
- [~] 2.4 JSON Schema data contracts for both scenarios. — Verdant has 4 JSON-Schema contracts (`system/specs/*.contract.json`); Fieldwork has none (only imperative checks in `scenarios/validate.mjs`), deferred to #13.
- [x] 2.5 Cloudflare Worker mock-API endpoint + static-fixture fallback (site must degrade gracefully).

## Phase 3 — Component & handoff layer (the lego bricks)

- [~] 3.1 ComponentSpec format + specs for every component the prototypes use. — 7 Verdant `vd-*` specs cover `proto/verdant.html`; Fieldwork's `fw-*` hybrid-canvas chrome (~20 classes) is unspecced (deliberate, deferred to #13).
- [x] 3.2 Handoff-pack generator: spec + data contract + DTCG tokens + multi-target outputs.
- [x] 3.3 Handoff-pack viewer + download surface. — `handoff.html` + `system/handoff-viewer.mjs` + `gen-pack-bundle.mjs`, merged to main via PR #34 (#14).
- [x] 3.4 2–3 Web Component wrappers — the tech-agnostic proof. *(gated by S3)*
- [x] 3.5 **Component vocabulary generator** — the agent-ready layer (extends `agent-layer/`; names, prop schemas, composition rules, usage guidance).
- [x] 3.6 Figma export path: DTCG file + documented import route (Tokens Studio / native).
- [~] 3.7 Figma REST parity-read script + capability-indicator UI ("built, switch-on") — wording per honesty constraint (surface 3 of 3). *(gated by S1)* — parity script complete (`tooling/figma/figma-parity.mjs`); the real run is pending a token (no `figma-parity.json`) and no capability-indicator UI is built yet.

## Phase 4 — AI agents & traces

- [x] 4.1 Trace recorder via Agent SDK hooks (extends portal V1) — steps phase-tagged `plan | gate | implement | validate`. *(gated by S5)*
- [~] 4.2 Real generation runs recorded at build time (the factory's actual work). — one real run is committed (`traces/demo-notice`), but it is a self-contained spec-authoring task, not a recording of the actual generator pipeline; no second/third run.
- [x] 4.3 Trace curation workflow + "real run, curated for length" labeling (honesty surface 2 of 3).
- [x] 4.4 Trace player: stepped annotated cards grouped into PIV acts (plan → gate → implement → validate), each reasoning step paired with the artifact it produced; annotation register per the *teach* discipline (§10 — invisible pedagogy). — `system/trace-player.mjs` works; today mounted on the `trace.html` harness, designed surface = Factory page (#10).
- [ ] 4.5 Agent composition runs for the study — Fieldwork proposal sets per analytical question. *(gated by S6)*

## Phase 5 — The Factory page (Exhibit 1: human-in-the-loop cycle)

- [ ] 5.1 Public intake UI — bounded live axes: brand color, density, reward type, frequency. Wizard interaction model: each asked question carries a recommended default + its reasoning; overrides within bounds; defaulted questions are silently-accepted proposals. — only the raw `derive.html` harness exists; the designed intake wizard is #10 (open).
- [~] 5.2 Intake question set final cut (3–5 asked, rest defaulted) — closes the PRD's last open question; draft v1 lives in the PRD. — content cut exists (3 of 8 asked per scenario in `intake.defaults.json`); formal closure is deferred to the Factory-page build (#10) and still listed open in the architecture ledger.
- [ ] 5.3 Pipeline-stations UI (intake → system → prototype → handoff) + scenario toggle — every station check-terminated (ends in a visible validation moment); station copy follows the *teach* discipline. — `factory.html` is an honest stub (#10 open).
- [x] 5.4 Verdant data-connected prototype screen (components render from the mock API).
- [x] 5.5 Fieldwork **hybrid canvas**: human-designed chrome + bounded agentic slots (slot boundaries = design call, open question in architecture doc). — chrome + bounded slots built and boundary-decided (#8); slots render as honest placeholders, filling the agentic content = #13.
- [ ] 5.6 Staged worked example integrated with the live moments (engine + re-skin). — no designed surface integrates engine + re-skin yet (#10).
- [ ] 5.7 The one guess-then-reveal moment: Manipulation Matrix run out loud (ethics verdict; compare-notes register, no grading). — verdict content + matrix logic exist, but no page implements the guess-then-reveal interaction (#10).

## Phase 6 — Agentic-UI study (Exhibit 2: data-heavy dashboards)

- [x] 6.1 Declarative renderer — vanilla module interpreting `{name, props, children}` against the known library only.
- [x] 6.2 **Action bus** — bidirectional event contract (agent→UI, UI→agent); voice-ready by design.
- [ ] 6.3 Ask → propose → adjust loop UI (proposals precomputed, adjustment + rendering live). — only the raw `agentic.html` workbench (two hardcoded compositions); the ask/propose stages don't exist yet (#13).
- [ ] 6.4 Study narrative + protocol-lineage nuggets (A2UI / AG-UI cited nugget-style, voice-contract register). — no A2UI/AG-UI narrative in any shipped page; lives only in epic/plan docs (#13).
- [ ] 6.5 Cross-links both ways: Fieldwork's agentic slots ↔ the study page. — no cross-links and no study page to link to (#13).

## Phase 7 — Site assembly & pages

- [x] 7.1 Home = the 90-second recruiter gate: outcome headline + three proof shortcuts (watch a trace · inspect the pack · drive the factory). — headline + three-card "ways to verify" section live on `index.html` (#6); two of three destinations are still "In build".
- [x] 7.2 Approach page build — copy is final in `__Approach_page.md`, components mapped there.
- [~] 7.3 Work section — agentic-UI study as flagship item. — Exhibit 02 exists on `work.html` but is labeled "Planned", has no link, and is placed second (not the decided flagship/first item); goes live with #13.
- [x] 7.4 Contact + closing CTA band.
- [ ] 7.5 Voice-contract pass over all copy (phenomenon first · gloss as appositive · first-person testimony · pull never push · compare notes · close every loop · write up, let others overhear). — sequenced last; both exhibits must be live first, and much of the copy (Factory stations, study) doesn't exist yet.

## Phase 8 — Ship & measure

- [~] 8.1 Cloudflare Pages deploy — committed artifacts, no CI build step (repo stays inspectable proof). — the deploy mechanism ran once, but the live site (`factory-ux.pages.dev`) predates the current five-page IA; a redeploy is needed to ship the shipped work.
- [~] 8.2 CF Web Analytics (cookieless) + one custom event: "factory driven." — beacon + `trackFactoryDriven()` built in `system/analytics.mjs` but have zero callers (fired by the Factory page, #10) and the token is filled at launch.
- [x] 8.3 Agent-layer regeneration: llms.txt, JSON-LD, decisions.json, component vocabulary. — all four generators wired in `build.mjs`; real dated outputs exist (per-application builds + `handoff/verdant/vocabulary.json`).
- [~] 8.4 Accessibility + performance pass (a11y defaults in the contract; check LCP/INP; reduced-motion on the trace player). — a11y defaults + `prefers-reduced-motion` present sitewide; no LCP/INP measurement or dedicated perf-pass record yet.
- [ ] 8.5 Application log set up — the hypothesis instrument: RIGHT = ≥1 artifact-driven interview in first ~10 apps (~8 wks); WRONG = silence after 10, or invites with the artifact never mentioned. Review at the 10-app/8-week mark.
- [~] 8.6 `noindex` decision at launch (currently on; portfolio-by-link vs. indexable). — noindex is implemented and currently on (`_headers` + per-page meta); the launch *decision* itself is still open in the architecture ledger.

---

## Post-MVP layers (decided, not scheduled)

- [ ] **Voice input layer** — drops into the action bus; ships **only with a strong user-grounded case** (candidate: Fieldwork's hands-busy technician context + accessibility). Needs: command set + case write-up first. Web Speech API, feature-detected, graceful absence. — action bus is voice-ready, but no Web Speech layer is built (deferred by design).
- [ ] Figma plugin push (write tokens into Figma variables on any plan). — only the read-only parity script exists; no write/push plugin.
- [ ] Interactive Storybook-style component library. — `tooling/wc-sandbox` + `system/wc/demo.html` are single-page harnesses, not a navigable catalog.
- [ ] Demonstrated handoff consumer — an "engineer"/agent visibly connecting data on stage.
- [~] Per-company bespoke builds (ledger-driven re-skins per application; ledger ↔ scenario-package unification question). — real per-company outputs exist in the jobs folder (trainline/lloyds/BA/hub); the ledger↔scenario-package unification question is still open.
- [ ] Additional demo scenarios. — only verdant + fieldwork exist.
- [ ] Recruiter gate as a designed surface beyond the home page. — the home gate itself is built (#6); a second dedicated surface is not.
- [x] CI drift-verify: re-run generators in CI, fail on divergence from committed artifacts. — `.github/workflows/verify.yml` wires drift-check + token-lint + visual-regression on every push/PR (#9).

## Carried open questions (named, not hidden)

- [x] Agentic-slot boundaries in the Fieldwork canvas (design call, Phase 5.5). — resolved 2026-07-17 (#8): agent-composed = the two proto slots; human-fixed = toolbar / Attention / Needs-assignment panels / technician lanes.
- [ ] Intake question final cut (Phase 5.2).
- [ ] Scenario content depth — how many prototype screens prove the claim without bloat.
- [ ] `noindex` at launch (Phase 8.6).
- [ ] Voice command set + strong-case write-up (post-MVP gate).
