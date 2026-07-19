# Architecture — per-company brief layer: the factory on a real company's stated vision

Intent: extends [ai-first-ux-factory.prd.md](./ai-first-ux-factory.prd.md) (§6's per-company door) and resolves the platform architecture's open question "ledger → scenario-package unification" — see [ai-first-ux-factory.architecture.md](./ai-first-ux-factory.architecture.md). Decisions made interactively with the PRD holder, 2026-07-19.

## Problem & goals

A job application should carry the strongest artifact the factory can produce: the pipeline running on the *hiring company's own* publicly stated product vision — a feature or screen they have announced or described on their public surfaces — instead of only the fictional scenarios. The hiring manager opens a private link and watches the same pipeline (intake → derived design system → data-connected prototype → handoff pack), except the subject is their product, the design language is derived from screenshots of their actual designs (plus their published tokens, when they exist), and the intake wizard arrives pre-seeded with answers curated from their public statements. Goal: turn "this person could do this for us" from an inference into an observation. Every decision below is judged against that lens, under the platform's standing constraints (vanilla shipped pages, agents at build time only, honesty contract).

## Approaches considered

| Axis | Options weighed | Chosen |
| --- | --- | --- |
| **Liveness** | (a) pure replay of the recorded run · (b) replay + bounded steering — wizard pre-seeded from the company brief, reader overrides within bounds, deterministic engine re-derives live · (c) live LLM generation at view time | **(b)** — reuses the 10.2 wizard mechanics unchanged; (c) rejected: contradicts the replayed-agents one-way door |
| **Input** | (a) author-curated company brief with cited sources · (b) agent researches the company site on stage, in the trace · (c) the reader supplies the vision | **(a)** — citable and honesty-contract-clean; (b) deferred (noisy run, scraping/accuracy risk in a visible artifact); (c) rejected (forces live generation or nearest-match theater) |
| **Output** | (a) vocabulary-composed screen only · (b) hand-crafted data-connected screen per company · (c) tiered by priority | **(b) for every application** — owner's call, accepting the per-application cost ceiling; the composed path still exists via the agentic study and can serve as fallback under deadline |
| **Placement** | (a) private per-application links only · (b) public real-company example · (c) both: public capability demo on a fictional subject + private real-brand instances | **(c)** — public proof without trademark/consent/staleness exposure |

## Recommended approach

**A real company becomes a scenario package.** The authored **company brief** — a jobs-folder record holding the publicly stated vision with source links, screenshots of their actual product, their published design tokens if any, and curated intake answers — is compiled at build time into the exact package shape the factory already consumes (`scenarios/<slug>/`: copy, intake defaults, proto config, fixtures + a token pack). Everything downstream — wizard, derivation engine, prototype page, handoff pack, trace player — works unchanged; this is the ledger → scenario-package unification the platform doc anticipated, and it keeps the layer cheap by construction.

Two new build-time capabilities feed the package:

1. **Screenshot → pack derivation (recorded agent run — proposal only).** An Agent SDK vision run reads the uploaded screenshots + published tokens and emits a **proposed** pack seed (palette, type scale, spacing, radius) mapped onto the existing token contract as DTCG + `tokens.<company>.css`. Published tokens are ground truth where they exist; screenshots fill the gaps. The proposal never ships unreviewed: the author approves or corrects every value before the pack lands, and the run is recorded with that human gate visible — "the agent proposes your design language from your own product; the human gate decides" is the headline trace of the private instance.
2. **Brief → package generator (deterministic).** Plain agent-layer-pattern Node ESM that compiles the brief record into the scenario package, including the wizard pre-seed (`intake.defaults.json` — the shape already exists).

The hand-crafted prototype screen is authored per application against the same specs and token discipline (token-only components under the company pack; components are never forked). At view time the reader gets bounded steering: the wizard shows the company's pre-seeded answers with reasoning, overrides re-derive live through the existing deterministic engine — no LLM in the browser, ever.

**Public layer:** the shipped site gains the generic capability as a Factory stage demonstrated on a fictional subject — the recommended demo is a **round-trip**: derive Verdant's pack from screenshots of Verdant's own prototype screens, then diff against the known ground-truth pack, with the diff displayed honestly. The round-trip doubles as the derivation-fidelity spike's permanent, inspectable evidence.

**Private layer:** per-company instances are built *from the jobs folder* (where per-application content already lives) and deployed by direct upload to an unlisted target. **Nothing company-real ever enters this repo** — the repo is public and inspectable by design, so committing a real-brand instance would publish it.

## Key decisions

### Stack & libraries
- **No new dependencies.** The vision run uses the Claude Agent SDK already present in the portal, following the `record-trace.mjs` recorder pattern; the derivation seed lands as DTCG feeding the existing `gen-token-css` path; view time stays vanilla + the existing `derive.mjs`. *(Alternative — deterministic color-extraction libraries: rejected; they can't read type/spacing/radius, and the agent run itself is the exhibit — a silent library extraction demonstrates nothing.)*
- **Per-company deploy:** `wrangler pages deploy` direct upload of the built instance to an unlisted project/branch, run from the jobs folder. *(Alternative — a second private repo with commit-is-deploy: heavier; revisit only if direct upload proves fragile — spike 2.)*

### Data model (shape level)
- **Company brief** — new jobs-folder kb record type (kb-format addition, both parsers): stated vision + source URLs · screenshots directory · published tokens (optional) · curated intake answers · application metadata. The existing per-company decisions ledger folds into / alongside this record — one per-company source compiling to one package.
- **Compiled per-company scenario package** — identical in shape to `scenarios/<slug>/`; provenance differs (real, labeled) — fictional and real subjects are the same format with different labels.
- **Derived pack seed** — DTCG + `tokens.<company>.css`, plus the recorded derivation trace (raw + curated JSONL, standard trace format).

### Boundaries & contracts
- **Privacy boundary (hard):** real-brand content lives only in the jobs folder and unlisted deploys. This is a deliberate, scoped exception to "deploy = commit the artifacts," which continues to govern the public site; the public repo gains only the generic capability code and the fictional demo.
- **Agent proposes, human decides (hard, layer-wide):** no agent output becomes a shipped artifact without a human gate — the derived pack seed is reviewed value by value, compositions are reviewed proposals, traces are human-curated, deploys are human-triggered. Same posture as the platform's PIV gates and ask → propose → adjust; the visible human gate is part of the exhibit, not overhead.
- **Honesty labeling (hard):** every private instance states plainly that it is speculative work based on the company's public statements, sources linked, not affiliated with or endorsed by the company. Traces stay "real run, curated." Derivation fidelity is shown (the diff), not asserted.
- **No public upload surface.** Screenshots and tokens are authoring-time inputs entering via the jobs-folder brief record; the shipped site stays static. The portal (local-only) may grow a brief-management surface later.
- **Five-pillar rubric:** when the prototyped vision is an AI feature, the screen demonstrably implements the trust · clarity · control · transparency · meaningful-benefit patterns (plan-before-act, visible reasoning, stop/undo affordances, AI-content labeling, guided input over blank boxes), and the handoff pack records which patterns the screen carries. Legibility nuggets cite canonical primary literature — Nielsen's heuristics, Microsoft's Guidelines for Human-AI Interaction (Amershi et al.), Google PAIR — same register as the A2UI/AG-UI lineage citations; no verbatim reuse of any single secondary source.

### Other
- **Cost ceiling accepted (owner's call, 2026-07-19):** every application gets a hand-crafted prototype screen — hours per application, deliberately. Revisit after the first 2–3 real applications if cadence suffers; the vocabulary-composed path is the designed fallback.
- **The wizard is shared, not forked:** private instances configure the existing wizard (pre-seed + bounds), never duplicate it.

## Missing pieces
Company-brief record format (kb-format addition, both parsers) · screenshot+tokens → pack-seed derivation run + recorder (portal-side, emits trace) · brief → scenario-package generator · per-company build + unlisted-deploy path from the jobs folder · private-instance shell (Factory-station variant: real-brand labeling, pre-seeded wizard, derivation trace embedded) · public round-trip demo stage + diff display · five-pillar rubric hooks in ComponentSpec/handoff format · cited legibility nuggets on existing surfaces (trace player, wizard, honesty labels).

## Spikes & experiments

1. **Derivation fidelity** *(gates the headline claim's labeling)*
   Question: how close does the vision agent's *proposed* pack seed get to ground truth? (The flow is fixed either way — agent proposes, human approves/corrects; the spike measures proposal quality, never who decides.)
   Spike: round-trip on Verdant (derive from its own proto screenshots, diff vs the known pack) + one real product with a published design system, offline — ~1 day.
   Decision rule: brand colors within a small perceptual delta and usable type/spacing scales → capability labeled "agent-proposed, human-approved" and the derivation trace takes headline billing on the private instance; else labeled "human-authored with agent assistance" and the headline shifts to another trace. The round-trip diff ships as the public demo in both outcomes.
   **Outcome (2026-07-19) — PROVISIONAL.** The Verdant round-trip ran the full capability end to end: recorded vision run → proposed seed → human gate → deterministic fidelity diff (trace `traces/pack-seed-verdant.jsonl`; diff `tooling/round-trip/verdant.diff.json`; ticket #40). The agent proposed `color-accent #2d6a48` against ground truth `#2f7a4d` → OKLab **ΔE 0.05** — right at the ≤0.05 threshold (an honest slightly-dark read, not a rigged near-zero); the type ramp, spacing (4px grid), and radius are all usable; the proposed palette passes WCAG AA on 12/12 ruleset pairs. On the decision rule the **proposal clears the "agent-proposed, human-approved" tier**. The human gate approved the seed and corrected the single token it read dark (`color-accent → #2f7a4d`), recorded in the seed's `review.corrections` — the visible "agent proposes, human decides" boundary; the fidelity diff measures the agent's *raw* proposal (ΔE 0.05), never the corrected value.
   **Real-product test (2026-07-19) — IBM Carbon, confounded.** The vision read ran on a live screenshot of Carbon's Button page (captured + read locally, uncommitted — privacy boundary): the capability returned the accent as `#0F62FE`, an exact match to Carbon's published Blue 60 → accent ΔE 0. This number is **confounded and is not clean fidelity evidence:** the agent explicitly recognized the brand ("This is the IBM Carbon Design System…"), so it may have recalled the published token from training rather than deriving it from the pixels (naming the exact six-digit hex is the tell); at best it read a large solid-fill button — an easy case. Carbon's docs name the brand throughout, so it can't be blinded by cropping. The finding is worth keeping: **on a recognizable product the agent can recall published tokens instead of reading them** — a limit of the derivation claim, surfaced honestly, not a strength.
   **The label stays provisional-positive.** Both measured cases are favourable-and-controlled — Verdant is a CLOSED round-trip against the engine's own `derive()` output (ΔE 0.05, ≈ colour-picking a solid accent); Carbon is a RECOGNIZED brand whose token the agent likely recalled (ΔE 0). Neither is the clean *uncontrolled* number the rule ultimately needs: a real product with published tokens the model has NOT memorized, read purely from pixels (verify the agent does not name the brand). The pipeline and easy-case accent reads are proven; hard derivation on unfamiliar input is not. Capability label: **"agent-proposed, human-approved (provisional — pending a clean unrecognized-product number)."** Open question below.
2. **Unlisted deploy privacy + ergonomics**
   Question: is a direct-upload unlisted Pages instance private enough and cheap enough per application?
   Spike: one throwaway per-company build deployed from the jobs folder; verify noindex headers, non-discoverability, and time the flow — ~0.5 day.
   Decision rule: flow under ~10 minutes and headers/privacy correct → keep direct upload; else move private instances behind Cloudflare Access or a private repo target.

## Open questions
- [ ] **Spike 1 — a CLEAN real-product fidelity number (blocks finalizing the derivation label).** Verdant (closed round-trip, ΔE 0.05) and IBM Carbon (recognized brand, ΔE 0) both gave favourable-but-controlled results; a clean number needs a real product whose published tokens the model has NOT memorized (verify the agent doesn't name the brand), read purely from pixels, locally/uncommitted. Fold it into §Spikes 1 to resolve the provisional "agent-proposed, human-approved" label.
- [ ] Access control on private links — unlisted URL enough, or Cloudflare Access/password? (Decide at first real application; spike 2 informs.)
- [ ] Does the private instance's replayed derivation trace embed the company's product screenshots? (Copyright optics on a hosted page; default yes on an unlisted link — revisit if placement ever hardens toward public.)
- [ ] Public demo subject — Verdant round-trip (default) vs a third fictional scenario if one lands for other reasons.
- [ ] Route/naming convention for private instances (path on the main project vs per-company Pages project) — falls out of spike 2.
- [ ] Cadence check after the first 2–3 applications: does hand-crafted-every-application hold?
