# Feature: Portability proofs — Web Component wrappers (spike 3) + Figma parity script/docs (spike 1)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Proof that the handoff travels beyond this repo, two prongs (epic #1, ticket #12):

1. **Web Component wrappers (folds spike 3).** Three custom elements — `vd-status-chip`, `vd-plant-card`, `vd-care-task-row` (the card + one list component + their shared chip child; "2–3 wrappers" per architecture §Components handoff) — each consuming DataContract-shaped JSON, shadow-DOM encapsulated, styled by **semantic tokens only** (tokens pierce shadow DOM via custom-property inheritance — that *is* the theming story). Exercised in a plain page (`system/wc/demo.html`, mirroring the `scenarios/check.html` bare-check-page precedent) AND a React sandbox (`tooling/wc-sandbox/react.html`, no-build React 19 via import map). Decision rule: clean props/slots/theming story → declare the WC trajectory in the pack; else keep HTML/CSS canonical, present WC as roadmap. Canonical handoff form stays copy-paste HTML/CSS reading only tokens — the wrappers are the tech-agnostic proof, not a replacement.

2. **Figma boundary (folds spike 1 — critical path for the emphasized claim).** A build-time (authoring-time) REST read script `tooling/figma/figma-parity.mjs` that hits `GET /v1/files/:key/variables/local` and falls back to the styles path, with a personal token from local `portal/.env` only. Decision rule: variables readable → variables parity demo; else styles-based parity + label the variables path "Enterprise-gated" (honesty constraint decides wording, not marketing). The script diffs what Figma returns against `system/tokens.source.json` and writes a committed parity artifact into the pack. Plus handoff docs for the DTCG import path (Tokens Studio / native import).

The pack (`handoff/verdant/`) gains: `wc/` (wrapper modules + README with the declared trajectory), `figma-import.md` (import-path doc), `figma-parity.json` (real-run parity artifact), and a `portability` block in `pack.json` — all emitted by `agent-layer/gen-handoff.mjs` except the parity artifact (written by the parity script itself; it needs a secret + network, which the deterministic generator chain must never need).

## User Story

As a hiring manager's platform engineer reading the handoff pack
I want the design system to demonstrably work outside its home stack — as framework-agnostic custom elements running in plain HTML and in React, and as tokens that round-trip with Figma
So that I can verify the "lego bricks that stack into the main codebase" claim against my own stack instead of taking it on faith.

## Problem Statement

The handoff pack (#7) ships specs, contracts, and multi-target tokens — but every proof so far lives inside this repo's own vanilla stack. The two claims a platform engineer will actually probe — "does this survive contact with our framework?" and "does this connect to our design tool?" — are asserted, not demonstrated. Spikes 1 and 3 exist precisely because both have real unknowns (Figma plan-gating; React↔custom-element ergonomics).

## Solution Statement

Wrap the three Verdant components already specced in #7 as self-registering custom elements whose only styling inputs are the semantic tokens the spec heads declare — proving the token contract is the portability mechanism, not just a theming convenience. Exercise them in both harnesses, record the spike-3 outcome on issue #12, and declare the trajectory in the pack per the decision rule. For Figma: one zero-dep Node script implements *both* spike-1 branches (try Variables, degrade to Styles, report which answered and why) so the spike, the parity demo, and the honesty-labeled capability indicator are the same artifact. Docs for the DTCG import path ship in the pack; `gen-handoff.mjs` copies wrappers + docs in, following its existing `system/ → handoff/verdant/` copy precedent (`tokens.source.json → tokens.dtcg.json`).

## Out of Scope / Non-Goals

- **Not wrapping all six specced components** — architecture pins "2–3 wrappers as the tech-agnostic proof"; `primary-button`, `stat-tile`, `screen-header` stay HTML/CSS-canonical (the declared trajectory covers them).
- **Not building the `vd-` CSS classes or the Verdant screen** — that's #8. The wrappers carry their own shadow-DOM CSS (reading only spec-declared tokens); they do NOT wait for or reuse #8's classes. Spec heads stay `status: "spec"` — #8 flips them.
- **Not adapting scenario fixtures to the DataContracts** — `scenarios/verdant/fixtures/*.json` are NOT contract-shaped (fixture plants have no `status`/`photoUrl`; tasks have `type`/`done` instead of `action`/`status`/`plantName`). That reconciliation belongs to #8 (data-connected prototypes). The WC harnesses feed the **contract-valid sample records** each spec's `## Data binding` section already carries.
- **Not the vocabulary generator, declarative renderer, or action bus** — #11. The wrappers' events are plain composed `CustomEvent`s; wiring them onto the action bus is #11/#13 territory.
- **Not the handoff-pack viewer** — #14 renders the `portability` block; this ticket only emits it.
- **Not a Figma plugin, not variable WRITES (`POST /v1/files/:key/variables`)** — PRD defers "Figma plugin push" past MVP; this ticket is the read/parity + docs half.
- **Not registering the parity script in `build.mjs`** — the generator chain stays deterministic and offline-runnable; the parity script is standalone-only (see NOTES for the "build time" reading).
- **No new npm dependencies anywhere** — React comes into the sandbox via an import map at page-load time (authoring-time network, zero installs); `tooling/style-dictionary/` stays the only dependency-carrying tool.
- **Not changing the Worker, scenarios, or any existing shipped page** — `index.html`, `derive.html`, `scenarios/check.html` untouched.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (WC half is fully self-contained; variance concentrates in the Figma half's external dependency — a real token + test file only the user can provide)
**Primary Systems Affected**: new `system/wc/` · new `tooling/figma/` · new `tooling/wc-sandbox/` · `agent-layer/gen-handoff.mjs` · `handoff/verdant/` (regenerated) · `CLAUDE.md`
**Dependencies**: none installed. External at run time: Figma REST API (authoring-time, secret-gated) · esm.sh CDN for React 19 in the sandbox (authoring-time)

## Related Work

**Implements**: https://github.com/linardsb/ux-factory/issues/12 (`Closes #12`; spike 1 + spike 3 outcomes must ALSO land as comments on #12 — two ACs)   ·   **Epic**: https://github.com/linardsb/ux-factory/issues/1 + `docs/epics/ai-first-ux-factory.architecture.md` (§Boundaries "Figma boundary" + "Components handoff" + "Secrets" · spikes 1 & 3 — inherited, not re-decided)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/handoff-data-layer.md` (#7, commit `d656f05` on `feature/handoff-data-layer`) — Why: created the specs/contracts the wrappers implement, `parseComponentSpec`, and `gen-handoff.mjs` (the generator this ticket extends); its pack layout (`contracts/` dir, flat `tokens.dtcg.json`) is the precedent for where `wc/` and the figma files land.
- `.claude/plans/dtcg-inversion-token-source.md` (#2, `9395c7c`, merged) — Why: `tokens.source.json` is the parity script's code-side input; the string profile it pinned is what Figma values get compared against.

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- #8 (data-connected prototypes) — builds the page-level `vd-` CSS + fixture/contract reconciliation; flips spec `status` to `shipped`.
- #14 (pack viewer) — renders the `portability` block and the figma capability indicator ("emphasized in UI as a built, switch-on capability").
- #10 (Factory page) — surfaces the capability indicator wording decided by spike 1's outcome.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/specs/status-chip.md` + `status-chip.contract.json` — Why: the chip wrapper implements this spec verbatim: props (`value`, `label`), 9 tokens (the ONLY custom properties its shadow CSS may reference), 3 states, `## Accessibility` (never a tap target, text must read without colour).
- `system/specs/plant-card.md` (head + all four sections) + `plant-card.contract.json` — Why: the card wrapper's spec: props, 11 tokens, 4 states incl. `pressed`, the `## Data binding` field→element mapping table (including absent-field behaviour: species line omitted, monogram placeholder for missing photo), the contract-valid sample record (line ~46) the harnesses render, and `## Accessibility` (card = single `<a>`, accessible name = name + status, chip text `aria-hidden`, 44px target, `:focus-visible` in `--color-accent`).
- `system/specs/care-task-row.md` + `care-task-row.contract.json` — Why: the row wrapper's spec: `checked` boolean, `## Accessibility` pins `<button role="checkbox">` + `aria-checked`; sample record line ~46; `plantId`/`due` are contract-required but NOT rendered.
- `agent-layer/gen-handoff.mjs` (all 65 lines) — Why: the generator being extended. Mirror: `ROOT`/`SPECS`/`DEST` path style (import.meta.url, never cwd — build.mjs runs from the jobs folder), `copyFileSync` precedent for `system/ → pack` copies (line 42), pack.json shape (lines 44–55), result object → `✓` line (57, 62–65), and the `pathToFileURL` standalone guard comment (60–62: the repo path contains a space — never compare `file://${argv[1]}` naively).
- `agent-layer/lib.mjs` (lines 63–117 `parseComponentSpec`) — Why: what spec heads/sections look like parsed; the wrapper task reads spec heads to cross-check token usage.
- `portal/lib/env.mjs` (lines 11–17) — Why: THE secrets pattern (ticket names it): hand-parsed `.env`, regex `/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/`, skip comments, never override existing env. The parity script mirrors these 6 lines against `portal/.env` (gitignored — verified) rather than importing the module (env.mjs computes portal/jobs paths irrelevant here).
- `scenarios/check.html` (all of it) — Why: the bare-check-page precedent `system/wc/demo.html` mirrors: `noindex` meta, contract + neutral pack stylesheets, no site chrome, honest explanatory intro, results container. Note it does NOT load `portfolio.css`.
- `scenarios/verdant/copy.json` (`fictionalNotice`) — Why: the honesty surface — both harness pages must carry the fictional-scenario notice; reuse this wording.
- `system/tokens.source.json` (`contract` group) — Why: the parity script's code side: flat `--`-less leaf names under `contract.*` groups (e.g. `contract.accent.color-accent`), `$value`/`$type` per DTCG. Web-only values (`clamp()`, `color-mix()`, string shadows) will never match Figma numerically — parity compares by NAME always, by VALUE only where the type is a plain color/dimension (see NOTES).
- `system/derive.mjs` (lines 1–12) — Why: the header convention for hand-written canon ES modules in `system/` ("hand-written canon (this repo; not generated)" + governing-doc citation); every new `.mjs` here opens the same way.
- `system/components.css` (lines 1–16 header) — Why: the token-discipline statement the wrapper shadow CSS inherits: no raw hex, no rgb(), no brand-primitive names — semantic tokens only. In wrappers this tightens further: only tokens the spec head declares.
- `_headers` — Why: confirms committed pages ship with `X-Robots-Tag: noindex` globally; no per-page header work needed for the new demo/sandbox pages.
- `.claude/reports/handoff-data-layer-report.md` (Deviations section) — Why: the shared-working-tree hazard (concurrent sessions moved HEAD mid-commit last ticket). See Task 1 and NOTES.

### New Files to Create

- `system/wc/vd-status-chip.mjs` — chip custom element (leaf; imported by the other two)
- `system/wc/vd-plant-card.mjs` — card custom element (composes the chip)
- `system/wc/vd-care-task-row.mjs` — row custom element (composes the chip; dispatches `vd-toggle`)
- `system/wc/README.md` — WC usage doc for the pack: consumption (load pack `tokens/css/` + import modules), attribute/property/event API table, React notes (19 vs ≤18), the declared trajectory (wording written AFTER the harnesses run, per the decision rule)
- `system/wc/demo.html` — plain-page harness (shipped bare check page, all states + `data`-property rendering + token-override re-skin strip + `vd-toggle` event log)
- `system/figma-import.md` — DTCG import-path doc (Tokens Studio / native-import state; wording set by spike 1's outcome)
- `tooling/figma/figma-parity.mjs` — the REST read script (zero-dep, both spike branches built in)
- `tooling/wc-sandbox/react.html` — React 19 harness (import map → esm.sh, `createElement`, no build, no install)
- `handoff/verdant/wc/*` + `handoff/verdant/figma-import.md` — GENERATED (by gen-handoff; committed)
- `handoff/verdant/figma-parity.json` — real-run artifact (by the parity script; committed)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

All externally verified 2026-07-17 (research run; corrections against raw doc HTML where WebFetch summaries mis-mapped tables).

- [Figma REST — Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/#get-local-variables-endpoint)
  - `GET /v1/files/:key/variables/local` — **Enterprise-only** ("available to full members of Enterprise orgs"), scope `file_variables:read`, Tier 2. Non-Enterprise → **403** with error text like "Limited by Figma plan" / "Incorrect account type" / "Invalid scope". `POST …/variables` (write) likewise Enterprise-only — out of scope here.
  - Why: the script's primary attempt + the exact gate evidence to capture. Trap: Figma "Organization" plan ≠ "Enterprise" — Org plans are gated too.
- [Figma REST — Scopes](https://developers.figma.com/docs/rest-api/scopes/)
  - `file_variables:read/write` scopes are **only selectable in the PAT-creation UI on Enterprise Full seats**; legacy `files:read` is deprecated → use granular `file_content:read` (covers `GET /v1/files/:key`, Tier 1).
  - Why: PAT-creation instructions for the user (Task 9) and the docs (Task 10).
- [Figma REST — Components and styles](https://developers.figma.com/docs/rest-api/component-types/) + [File endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/#get-files-endpoint)
  - `GET /v1/files/:key/styles` returns **published team-library styles only** — and Starter-plan files can't publish at all, so it's empty exactly where the fallback matters. Docs' own guidance: local styles → `GET /v1/files/:key` (top-level `styles` metadata map; **values** require walking `document` nodes whose `styles` refs resolve to fills/effects).
  - Why: dictates the fallback design in Task 8 — one GET-file call, not the styles endpoint.
- [Figma REST — Rate limits](https://developers.figma.com/docs/rest-api/rate-limits/#how-rate-limiting-works)
  - Per-user-per-**plan-of-the-file** since Nov 2025: on a **Starter-plan file, GET file (Tier 1) ≈ 6 requests/MONTH** even for a Full-seat token ("requests to that file are limited to up to 6 per month"); variables endpoint (Tier 2) ≤5/min on the gated path. 429 carries `Retry-After` + `X-Figma-Plan-Tier`.
  - Why: the fallback's GET-file budget is nearly exhaustible by a careless dev loop — drives Task 8's offline-replay cache.
- [Figma Schema 2025 — native DTCG variables import/export](https://www.figma.com/blog/schema-2025-design-systems-recap/) (+ [rollout forum thread](https://forum.figma.com/ask-the-community-7/native-variable-export-feature-47831))
  - **Native UI DTCG import exists** since Nov–Dec 2025: drag a DTCG JSON into a Variable Collection (creates/updates variables); right-click collection → "Export to JSON". UI-only — no REST path; plan-gating of the UI feature itself unconfirmed (rollout-lag evidence only). Export omits `description` per forum reports.
  - Why: figma-import.md now documents native import as a first-class path (Task 10) — with honesty-compliant wording on availability.
- [Tokens Studio — Token Format W3C DTCG](https://docs.tokens.studio/manage-settings/token-format) (+ [Pro licence list](https://docs.tokens.studio/get-started/pro-licence))
  - W3C DTCG format toggle (`$value`/`$type`) is **free-tier**; Pro gates only Themes/Color-Modifiers/Branches/flow views. Tokens Studio can also create Figma styles from tokens — the practical Starter-plan round-trip (variables imported on Starter are REST-invisible; styles resolved via node fills are not).
  - Why: the second documented import path + the Task 9 test-file recipe for non-Enterprise accounts.
- [React 19 release notes — Support for Custom Elements](https://react.dev/blog/2024/12/05/react-19#support-for-custom-elements)
  - CSR rule (verbatim): "props that match a property on the Custom Element instance will be assigned as properties, otherwise they will be assigned as attributes." Full Custom Elements Everywhere support. Custom **events** still need refs — no declarative binding.
  - Why: the load-bearing sandbox demonstration (Task 6) and the README's React notes (Task 7).
- [esm.sh — external + import maps](https://github.com/esm-dev/esm.sh/blob/main/README.md#with-import-maps)
  - No-build import map needs `?external=react` on the react-dom URL or esm.sh resolves its own second React copy (invalid-hook-call breakage): `{"imports": {"react": "https://esm.sh/react@19.2.0", "react-dom/client": "https://esm.sh/react-dom@19.2.0/client?external=react"}}`. Documented mechanism (esm.sh shows it for preact); the react-specific form was **verified working at plan time** (see "Verified at plan time" below).
  - Why: Task 6's exact import map.
- [MDN — custom property fallback values](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties#custom_property_fallback_values)
  - Custom properties inherit through shadow boundaries (encapsulation scopes rule *matching*, not *inheritance*) — page-level `:root` tokens theme shadow CSS. Gotcha: never redefine a token on `:host` and never use `var(--token, fallback)` inside wrappers — both would mask pack-level overrides. (Our zero-literal rule already forbids fallbacks; keep it.)
  - Why: the mechanism the whole theming story rests on (Tasks 2–5).

### Verified at plan time (2026-07-17 — live browser probe, the #7 spike-4 precedent)

Every load-bearing mechanic below was exercised in a real Chrome session during planning (probe pages in the session scratchpad, served locally, driven via agent-browser). These are **facts, not assumptions** — the implementation agent does not need to re-derisk them:

| # | Mechanic | Result |
| --- | --- | --- |
| P1 | Page-level `:root` custom property reaches `var()` inside shadow-DOM CSS | PASS |
| P2 | A scoped wrapper-div token override (`style="--token: …"`) pierces shadow DOM and wins | PASS |
| P3 | `CustomEvent` with `{bubbles: true, composed: true}` crosses the shadow boundary to `document` | PASS |
| P4 | esm.sh import map with `?external=react` → **single** React instance, version 19.2.0 | PASS |
| P5 | React 19 assigns an object JSX prop (`data={record}`) as a DOM **property** on a custom element | PASS (`el.data.n === 42`) |
| P6 | Hooks work under that import map (no dual-React invalid-hook-call) | PASS |
| P7 | Ref-attached `addEventListener` for a custom event drives React state | PASS |
| E1–E7 | The golden exemplar below, loaded against the repo's real `tokens.contract.css` + `tokens.neutral.css`: ok/due/overdue variants match the spec's `## States` colours, `--type-eyebrow` resolves (12px), the `data` record reflects to attributes, and a scoped `--color-accent` override re-skins the filled variant | ALL PASS |

Also verified: the Task 2–4 **token-audit one-liner** passes on a compliant stub and catches a rogue `var(--color-rogue-token)` — the command works as written.

### Golden exemplar — `system/wc/vd-status-chip.mjs` (commit VERBATIM; mirror for card/row)

This module was **run and validated at plan time** (rows E1–E7 above). Task 2 commits it as-is; Tasks 3–4 mirror its structure (CSS-in-template, `#data` + attribute reflection, `connectedCallback`/`attributeChangedCallback` → one `#render()`, registration guard).

```js
// system/wc/vd-status-chip.mjs — status-chip as a standalone custom element (hand-written
// canon, this repo; not generated). The tech-agnostic handoff proof: shadow-DOM encapsulated,
// themed only by the semantic tokens its spec declares — load the pack's tokens/css layers
// (or override custom properties at any scope) and it re-skins; no other page CSS reaches it.
// Spec: system/specs/status-chip.md · architecture §Boundaries "Components handoff"
// (epic #1, ticket #12; folds spike 3).

const VARIANTS = ["ok", "due", "overdue"];

// Every var() here must name a token in the spec head's `tokens` array — no other tokens,
// no colour literals, no var() fallbacks (the contract layer owns fallbacks; a fallback
// here would mask pack-level overrides). Font-family is deliberately unset: inheritable
// text properties flow into shadow DOM from the host page.
const CSS = `
  :host { display: inline-block; }
  .pill {
    display: inline-block;
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    font-size: var(--type-eyebrow);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: var(--color-bg-surface);
    color: var(--color-fg-muted);
  }
  .pill.due { border-color: var(--color-accent); color: var(--color-accent); }
  .pill.overdue { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-fg); }
`;

export class VdStatusChip extends HTMLElement {
  static observedAttributes = ["value", "label"];
  #data = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>${CSS}</style><span class="pill"></span>`;
  }

  // DataContract path (status-chip.contract.json): assign a full Status record.
  // Reflects to attributes so markup, property, and framework usage stay one model
  // (React 19 assigns this object prop as a DOM property — verified at plan time).
  get data() { return this.#data; }
  set data(record) {
    this.#data = record ?? null;
    if (record) { this.setAttribute("value", record.value); this.setAttribute("label", record.label); }
  }

  connectedCallback() { this.#render(); }
  attributeChangedCallback() { this.#render(); }

  #render() {
    const value = this.getAttribute("value");
    const pill = this.shadowRoot.querySelector(".pill");
    pill.className = "pill" + (VARIANTS.includes(value) && value !== "ok" ? " " + value : "");
    pill.textContent = this.getAttribute("label") ?? "";
  }
}

if (!customElements.get("vd-status-chip")) customElements.define("vd-status-chip", VdStatusChip);
```

### Patterns to Follow

**Module header (hand-written canon, from `system/derive.mjs:1-2`):**

```js
// system/wc/vd-plant-card.mjs — <what> (hand-written canon, this repo; not generated).
// Spec: system/specs/plant-card.md · architecture §Boundaries "Components handoff" (epic #1, ticket #12).
```

**Path resolution in generators (from `gen-handoff.mjs:14`):** `const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")` — never `process.cwd()`.

**Error style (project-wide):** throw plain `Error` naming the offending path: `throw new Error(\`${WC_SRC}: wrapper module missing — did system/wc/ move?\`)`. The parity script's no-token exit names the file: `portal/.env: FIGMA_TOKEN not set — add FIGMA_TOKEN=... (and FIGMA_FILE_KEY=...) there; it is gitignored.`

**Custom-element registration guard (idempotent — demo page imports card AND row, both import the chip):**

```js
if (!customElements.get("vd-status-chip")) customElements.define("vd-status-chip", VdStatusChip);
```

**Token discipline in shadow CSS (stated precisely):** every `var(--x)` must appear in the spec head's `tokens` array; **no colour literals** (no hex/rgb/named colours — the `components.css:1-16` rule) and **no `var()` fallbacks** (`var(--color-fg, #333)` is a bug — the contract layer owns fallbacks, and a fallback would mask pack-level overrides; consumers load `tokens/css/contract.css` from the pack). Non-colour structural literals (`1px` hairlines, `letter-spacing: 0.08em`, `text-transform`) follow the same license `components.css` uses — they are fine.

**Honesty surfaces:** demo + sandbox pages render the fictional notice; `figma-parity.json` carries `"note": "real run, from tooling/figma/figma-parity.mjs"` + ISO `ranAt`; capability wording follows the spike-1 branch actually taken.

---

## IMPLEMENTATION PLAN

### Phase 1: Web Component wrappers + plain-page harness

Self-contained; no external dependencies. The chip first (leaf), then card and row (compose it), then the demo page that exercises everything.

### Phase 2: React sandbox + spike-3 verdict

**Depends on:** Phase 1 (imports the same modules)

Exercise the identical modules under React 19; record what's clean and what isn't (custom events still need refs even in React 19); write the trajectory wording per the decision rule; post the spike-3 comment on #12.

### Phase 3: Figma parity script + spike-1 run + docs

**Independent of:** Phases 1–2 (different prong; can run in parallel, or first if the user's token arrives early — the epic notes spike 1 "can be pulled forward any time")

Script with both branches built in; the real run against the user's test file IS spike 1; docs + issue comment follow the branch taken.

### Phase 4: Pack integration + regeneration

**Depends on:** Phases 1–3 (copies their artifacts into the pack)

Extend `gen-handoff.mjs`, regenerate `handoff/verdant/`, update CLAUDE.md, validate end to end.

---

## STEP-BY-STEP TASKS

### Task 1 — BRANCH: cut `feature/portability-proofs` from `feature/handoff-data-layer`

- **IMPLEMENT**: work in an **isolated worktree**, not by switching HEAD (this tree is shared by concurrent ticket sessions — see the memory `shared-worktree-parallel-sessions` and the #7 report's deviation 1). Exactly: `git worktree add ../ux-factory-wt-12 -b feature/portability-proofs feature/handoff-data-layer` (base = `d656f05`; #12 depends on #2 (in `main`) and #7 (unmerged, on that branch) — `main` alone lacks `system/specs/`, `gen-handoff.mjs`, and `tooling/style-dictionary/`). If #7 has merged to `main` by implementation time, base on `main` instead. All subsequent tasks run inside the worktree; verify the branch immediately before committing.
- **GOTCHA 2**: `tooling/style-dictionary/node_modules` is gitignored — run `cd tooling/style-dictionary && npm install` once in a fresh worktree or `gen-handoff` throws (its error message says exactly this).
- **VALIDATE**: `git branch --show-current` → `feature/portability-proofs`; `ls system/specs agent-layer/gen-handoff.mjs` both exist.
- **SATISFIES**: prerequisite for all ACs.

### Task 2 — CREATE `system/wc/vd-status-chip.mjs` (verbatim from the golden exemplar)

- **IMPLEMENT**: commit the **Golden exemplar** above verbatim — it was run and validated at plan time against the repo's real token layers (rows E1–E7). Do not redesign it.
- **PATTERN**: it IS the pattern Tasks 3–4 mirror.
- **GOTCHA**: only the 9 tokens in `status-chip.md`'s head appear in its CSS (audited); unknown/absent `value` renders as `ok` (contract enum makes other values invalid; no error UI). Not focusable, no pointer handlers (spec: never a tap target).
- **VALIDATE**: `node --check system/wc/vd-status-chip.mjs` && `python3 -c "import re,json,sys; css=open('system/wc/vd-status-chip.mjs').read(); used=set(re.findall(r'var\((--[a-z0-9-]+)',css)); head=json.loads(re.search(r'\x60\x60\x60json\n(.*?)\n\x60\x60\x60',open('system/specs/status-chip.md').read(),re.S)[1]); extra=used-set(head['tokens']); sys.exit(f'undeclared tokens: {extra}' if extra else 0)"`
- **SATISFIES**: AC #3 (wrappers).

### Task 3 — CREATE `system/wc/vd-plant-card.mjs`

- **IMPLEMENT**: `class VdPlantCard extends HTMLElement`, imports + relies on `./vd-status-chip.mjs` (relative import — the pack copy must stay self-contained). API: attributes `name`, `species`, `status`, `photo-url`, `plant-id`, optional `href`; property `data` accepting a full Plant record (contract shape: `id`, `name`, `species?`, `status`, `lastWatered`, `photoUrl?`) — maps `id→plant-id`, `photoUrl→photo-url`, ignores `lastWatered` (spec: "not rendered here — care-task-row territory"). Render per the spec's `## Data binding` table: internal `<a>` (href from attr, else `#`), 48px thumbnail (`--radius-md`) or token-tinted monogram (first letter of name, `--color-bg-surface`/`--color-fg-muted`) when `photo-url` absent; name line (`--type-body`/`--color-fg`); species line (`--type-caption`/`--color-fg-muted`) omitted entirely when absent; trailing `<vd-status-chip value=… label=…>` with `aria-hidden="true"`. States per `## States`: `overdue` → border `--color-accent`; `pressed` (`:active`) → `background: color-mix(in srgb, var(--color-bg-surface), var(--color-border) 50%)` — **pinned**: both tokens are spec-head tokens, a percentage is a proportion not a colour literal, and `color-mix`-over-tokens has in-repo precedent at `system/tokens.source.json:28-31`; do not introduce any other mixing. A11y per `## Accessibility`: accessible name = `${name}, ${chipLabel}` via `aria-label` on the `<a>`; thumbnail `alt=""`; min 44px target; `:focus-visible` outline `--color-accent`. On click also dispatch `vd-select` (`bubbles: true, composed: true`, `detail: { id }`).
- **PATTERN**: chip's structure from Task 2; spec sections are the behaviour source of truth — implement the mapping table literally.
- **GOTCHA**: chip label text — derive from `status` (`ok→"OK"`, `due→"DUE"`, `overdue→"OVERDUE"`); the contract's Status record allows richer labels but the card spec gives the chip only `status`.
- **VALIDATE**: `node --check system/wc/vd-plant-card.mjs` + the same token-audit one-liner against `plant-card.md`.
- **SATISFIES**: AC #3.

### Task 4 — CREATE `system/wc/vd-care-task-row.mjs`

- **IMPLEMENT**: `class VdCareTaskRow extends HTMLElement`, imports `./vd-status-chip.mjs`. API: attributes `action` (`water|mist|feed`), `plant-name`, `status`, boolean `checked`, `task-id`; property `data` accepting a CareTask record — renders `action` (capitalised) + `plantName`; `plantId`/`due` accepted but never rendered (spec table). Render: internal `<button role="checkbox">` with `aria-checked` mirroring `checked`; check circle (`--color-border` ring; `overdue` → `--color-accent` ring; checked → fill `--color-accent`, label softens `--color-fg-muted`); label; trailing chip (`aria-hidden`). Click/Space toggles `checked` (reflect property↔attribute) and dispatches `vd-toggle` (`bubbles: true, composed: true`, `detail: { id, checked }`). Accessible name = `${Action} ${plantName}, ${status}`.
- **PATTERN**: Tasks 2–3.
- **GOTCHA**: `checked` is a boolean attribute — presence = true; setter must `toggleAttribute`. The chip stays as-is when checked ("urgency is fact until the log commits" — spec `## States`).
- **VALIDATE**: `node --check system/wc/vd-care-task-row.mjs` + token audit against `care-task-row.md`.
- **SATISFIES**: AC #3.

### Task 5 — CREATE `system/wc/demo.html` (plain-page harness)

- **IMPLEMENT**: bare check page mirroring `scenarios/check.html`'s head (noindex, contract + neutral pack stylesheets — **deliberately NOT `components.css`**: the page proves the wrappers need only the two token layers). Sections: (1) fictional notice, exact wording from `scenarios/verdant/copy.json`: *"Verdant is a fictional product, invented for this demonstration. No real company, users, or data are involved."*; (2) every element in every spec state, set via attributes; (3) "DataContract-shaped JSON" section — a `<script type="module">` that assigns the two **sample records from the specs' `## Data binding` sections** (`p-014` Monstera plant; `t-031` water task) to `el.data`; (4) re-skin strip: the same three elements inside a wrapper `<div>` that overrides 3–4 semantic tokens inline (`style="--color-accent: …; --radius-md: …"`) — custom properties piercing shadow DOM (probe rows P1–P2), the one-line re-skin story on WCs; (5) `vd-toggle`/`vd-select` event log `<pre>` (listener on `document` — probe row P3).
- **PATTERN**: `scenarios/check.html` structure + explanatory-intro voice.
- **GOTCHA 1**: the plant sample record's `photoUrl` (`/assets/verdant/monstera.webp`) **does not exist in the repo** (`assets/` holds two logos only — verified). Show BOTH thumbnail paths without adding binary assets: one card whose record swaps `photoUrl` for a small inline SVG `data:` URI (still contract-valid — `format: "uri-reference"` admits data URIs), one card with `photoUrl` omitted → monogram. Do NOT commit an image; do NOT render the dead `/assets/…` path (a broken-image icon on a proof page undermines the proof).
- **GOTCHA 2**: the re-skin strip's override values are literals ON THE DEMO PAGE (that's the point — a consumer's pack), not in wrapper CSS. Keep the modules colour-literal-free.
- **VALIDATE**: `npx serve .` → open `http://localhost:3000/system/wc/demo.html`; drive it with the agent-browser skill: all states render, species line absent on a no-species record, monogram on a no-photo record, toggle logs events, re-skin strip differs visibly. Screenshot for the report.
- **SATISFIES**: AC #3 ("work in plain page").

### Task 6 — CREATE `tooling/wc-sandbox/react.html` (React sandbox)

- **IMPLEMENT**: single HTML file, import map `{"imports": {"react": "https://esm.sh/react@19.2.0", "react-dom/client": "https://esm.sh/react-dom@19.2.0/client?external=react"}}` (the `?external=react` is load-bearing — without it esm.sh resolves a second React copy and hooks break; verify no duplicate-React console warning), `<script type="module">` using `createElement` (no JSX, no build): (a) renders `vd-plant-card`/`vd-care-task-row` with **string props as JSX attributes**; (b) passes the full contract sample record as `data={record}` — React 19 assigns non-primitive props as DOM **properties** on custom elements (the load-bearing React 19 behaviour; cite in comments); (c) listens for `vd-toggle` via a `ref` callback + `addEventListener` — custom events are the one part React 19 does NOT bind declaratively; note `onVdToggle` would silently no-op; (d) a React state round-trip: toggle event updates React state, which re-renders a count — framework interop both directions. Loads the same two token CSS layers; carries the fictional notice + a "factory tooling harness, not a shipped page" line.
- **PATTERN**: demo.html's sections, translated.
- **GOTCHA**: needs network (esm.sh) at page-load — authoring-time only, acceptable (tooling is unrestricted); note it in the page intro for honesty. Do NOT add a package.json or npm install.
- **VALIDATE**: `npx serve .` → `http://localhost:3000/tooling/wc-sandbox/react.html` via agent-browser: cards render inside a React tree, `data` property path works, toggle updates React state. Screenshot.
- **SATISFIES**: AC #3 ("+ React sandbox").

### Task 7 — CREATE `system/wc/README.md` + record spike-3 outcome on issue #12

- **IMPLEMENT**: pack-facing doc: consumption (load `tokens/css/contract.css` + a pack — or your own — then `import "./wc/vd-plant-card.mjs"`); API table per element (attributes · `data` property · events); theming = the token contract (override custom properties at any scope); React 19 notes (props/attrs clean; custom events need refs; ≤18 needs ref-assigned properties too); **the declared trajectory** — wording written NOW, after Tasks 5–6, per the decision rule: clean story → "declared trajectory: every component as a standalone element" (architecture §Components handoff); story NOT clean → present WC as roadmap and record why. Canonical form stays copy-paste HTML/CSS reading only tokens — say so explicitly (honesty: the wrappers are proof, not the primary handoff form). Then post the spike-3 outcome comment on #12: what was exercised, what's clean, what isn't, the trajectory branch taken (`gh issue comment 12 --repo linardsb/ux-factory --body-file …`).
- **PATTERN**: spike-4's outcome comment on #7 (dense, decision-rule-referenced, caveats named).
- **VALIDATE**: `gh issue view 12 --repo linardsb/ux-factory --comments | grep -i "spike 3"` shows the comment.
- **SATISFIES**: AC #3 ("spike 3 outcome + trajectory wording recorded").

### Task 8 — CREATE `tooling/figma/figma-parity.mjs`

- **IMPLEMENT**: zero-dep Node ESM, native `fetch`. (1) Load `FIGMA_TOKEN` + `FIGMA_FILE_KEY` from env, else hand-parse `portal/.env` with `env.mjs`'s regex (6 lines, cite the pattern in a comment); missing → throw the path-naming Error (Patterns above). (2) `GET https://api.figma.com/v1/files/{key}/variables/local` with header `X-Figma-Token`; on HTTP 403/gate (capture the exact error body — it becomes the honesty-label evidence) → fallback is **one call**: `GET /v1/files/{key}` — NOT the `/styles` endpoint (published-library styles only; empty on Starter files) — and resolve style VALUES by walking `document` nodes whose `styles` refs point at the file's top-level `styles` metadata map (read fills → rgba). (3) Immediately write the raw API response to `tooling/figma/.last-response.json` (gitignored) and support `--offline` to re-parse it without a network call — on a Starter-plan file GET-file is budgeted at **~6 requests/MONTH**; a careless dev loop can exhaust the month (verified rate-limit docs below). On 429, print `Retry-After` + `X-Figma-Plan-Tier` and exit — no retry logic. (4) Flatten `system/tokens.source.json`'s `contract` group to `name → {$type, $value}` (reuse nothing — 10 lines, walk objects until `$value`). (5) Match Figma variables/styles to tokens **by name** (normalise: Figma `color/accent` or `color-accent` ↔ token leaf `color-accent`); compare values only for plain `color`/`dimension` types (web-only strings — `clamp()`, `color-mix()`, shadows, fontFamily — are name-parity only; say so per-row). (6) Print a parity table to stdout; write `handoff/verdant/figma-parity.json`: `{ note: "real run, from tooling/figma/figma-parity.mjs", ranAt, endpoint: "variables" | "file-styles", gate: <null | the 403 evidence>, file: <key>, rows: [...], summary }`. (7) Standalone guard (`pathToFileURL` form — the repo path contains a space). NOT registered in `build.mjs`.
- **PATTERN**: `gen-handoff.mjs` path style + guard; `portal/lib/env.mjs:13-16` parse.
- **IMPORTS**: node built-ins only; ADD `tooling/figma/.last-response.json` to `.gitignore` (raw file dumps are neither artifact nor proof).
- **GOTCHA**: color comparison — Figma returns `{r,g,b,a}` floats; tokens are hex/oklch/color-mix strings. Convert Figma rgba→hex and compare case-insensitively against hex tokens only; anything else is name-parity. Do not build a color library.
- **VALIDATE**: `node --check tooling/figma/figma-parity.mjs`; then `node tooling/figma/figma-parity.mjs` without a token → exits non-zero naming `portal/.env`; with an intentionally bad token → surfaces Figma's 403 body, doesn't stacktrace.
- **SATISFIES**: AC #2 (script + secrets ground rule).

### Task 9 — RUN spike 1 (needs user input) + record outcome on issue #12

- **IMPLEMENT**: **BLOCKED ON USER** — needs `FIGMA_TOKEN` (+ `FIGMA_FILE_KEY` of a test file) in `portal/.env`. PAT creation: Settings → Security → Generate new token, granular scopes — `file_content:read` minimum; add `file_variables:read` **only if the UI offers it** (it appears solely on Enterprise Full seats — its absence is itself spike-1 evidence, note it in the comment). Test-file setup exercising our own import docs (pick per account): **(a)** native DTCG import — drag `handoff/verdant/tokens.dtcg.json` into a Variable Collection (Schema 2025 UI feature) — BUT on a non-Enterprise account variables are REST-invisible, so ALSO **(b)** Tokens Studio (free): import the DTCG file, then "Create styles" from the color tokens and apply a few to nodes — that makes values resolvable via the GET-file fallback. Then: `node tooling/figma/figma-parity.mjs` — the run IS spike 1 (mind the ~6/month GET-file budget on Starter; use `--offline` for re-parses). Record on #12: which endpoint answered, the exact gate evidence if variables 403'd, parity summary, and the capability-indicator wording this dictates ("Enterprise-gated" label iff gated — honesty constraint decides wording).
- **GOTCHA**: both outcomes below are one-pass successes — pick by whether the user supplied the token, and do NOT stall the ticket waiting:
  - **Outcome A (token available)** — done when: `figma-parity.json` committed with `endpoint` + `ranAt` + (if gated) `gate` evidence; spike-1 comment on #12; figma-import.md wording matches the branch taken. Ticket fully closable (`Closes #12`).
  - **Outcome B (no token by implementation time)** — done when: script committed with its error paths validated (no-token / bad-token runs), figma-import.md written with the variables path labeled per the *researched* gate facts (Enterprise-gated read/write — cited docs, not guesses), `pack.json.portability.figma.parity` set to `null` (the viewer renders "pending real run" honestly), and a #12 comment stating exactly what awaits the token (the run itself + the artifact). Commit WITHOUT `Closes #12`; the issue stays open on the real-run half of AC #1/#2 only. Do NOT fabricate a parity artifact (honesty contract: never hand-write anything presented as a real run).
- **VALIDATE**: Outcome A: `handoff/verdant/figma-parity.json` exists with `endpoint` + `ranAt`; `gh issue view 12 --comments | grep -i "spike 1"`. Outcome B: error-path runs pass; the #12 status comment exists; `pack.json` parity field is `null`.
- **SATISFIES**: AC #1 (spike 1 recorded; wording follows honesty constraint) + AC #2 (real run).

### Task 10 — CREATE `system/figma-import.md`

- **IMPLEMENT**: the DTCG import-path doc the pack ships — three paths, each with its exact gate stated: (1) **native Figma import** (Schema 2025, rolled out Nov–Dec 2025): drag `tokens.dtcg.json` into a Variable Collection; UI-only, no REST equivalent; note export omits `$description` and that availability may vary by account (plan-gating unconfirmed — say so, don't guess); (2) **Tokens Studio** (free tier): W3C-DTCG format toggle, import the file, optionally "Create styles" from tokens; (3) **REST variables write** (`POST /v1/files/:key/variables`) — Enterprise-gated (`file_variables:write`), named as the automation path with its gate label. Then: the parity script — what it proves, how to run it against your own file (`FIGMA_TOKEN`/`FIGMA_FILE_KEY`, `file_content:read` scope, the Starter rate budget), pointer to `figma-parity.json` as the committed real run. Wording of the variables-read path follows the spike-1 branch actually taken.
- **PATTERN**: `scenarios/README.md` register (spec-voice, honest, cites its governing ticket).
- **VALIDATE**: file exists; wording cross-checked against `figma-parity.json`'s `endpoint`/`gate` (no claim the run didn't demonstrate).
- **SATISFIES**: AC #4 (documented import path).

### Task 11 — UPDATE `agent-layer/gen-handoff.mjs` (pack integration)

- **IMPLEMENT**: after the contracts copy: `mkdirSync(join(DEST, "wc"))`; copy `system/wc/*.mjs` + `system/wc/README.md` → `handoff/verdant/wc/` (NOT `demo.html` — it references absolute `/system/…` paths; the pack README links to the live demo instead); copy `system/figma-import.md` → `handoff/verdant/figma-import.md` (the `tokens.source.json → tokens.dtcg.json` copy precedent, line 42). Add the `portability` block to `pack.json` exactly per the **Deliverable templates** in NOTES (`figma.parity: null` under Task 9 Outcome B). Extend the result object + `✓` line: `… + 3 wc wrappers`. Throw path-naming Errors if `system/wc/` or the docs are missing. Update the top-of-file header comment to name the new outputs. Keep `build.mjs`'s call site unchanged apart from the ✓ text if the result shape grew.
- **PATTERN**: existing copy + pack.json construction in the same file.
- **GOTCHA**: `figma-parity.json` is NOT emitted here (secret + network); gen-handoff must not delete or overwrite it — it only writes its own files, which already holds. pack.json stays deterministic (no timestamps).
- **VALIDATE**: `node agent-layer/gen-handoff.mjs` prints the extended `✓`; run twice → `git status --porcelain handoff/` unchanged between runs (determinism).
- **SATISFIES**: AC #4 (pack ships DTCG + import path; wrappers included per architecture).

### Task 12 — UPDATE `CLAUDE.md` + regenerate + full validation

- **IMPLEMENT**: architecture-map additions only: `system/wc/` (custom-element wrappers + demo, hand-written canon), `tooling/figma/` (parity read script, secret-gated, standalone-only), `tooling/wc-sandbox/` (React harness); extend the `handoff/` line's regenerate note if needed. One "Where new code goes" bullet: **WC wrapper** → `system/wc/<tag>.mjs`, spec-first (a wrapper exists only for a `system/specs/` component), copied into the pack by `gen-handoff`. Match existing terseness; additions only — the tree carries uncommitted CLAUDE.md lines from other in-flight tickets, stage selectively (the #7 report's deviation-2 precedent).
- **VALIDATE**: run VALIDATION COMMANDS below, all levels.
- **SATISFIES**: house convention (map stays true); AC regression safety.

---

## TESTING STRATEGY

No test suite exists by ground rule — "done" = run the surface you touched. The two harness pages ARE this ticket's test rig (that's why the ticket demands them): drive both with the agent-browser skill and capture screenshots for the report.

### Unit-level (ad-hoc, scratchpad — not committed)

- Token audit per wrapper (the one-liner in Tasks 2–4): shadow CSS uses only spec-head tokens.
- `data`-property mapping: assign each spec's sample record in the browser console; assert rendered text/attributes match the spec's field→element table (including absent-field rows).
- Parity script error paths: no token · bad token · bad file key — each exits with a path-naming or Figma-evidence message, no stacktrace.

### Integration

- Demo page under `npx serve .` — states, events, re-skin strip.
- React sandbox — property assignment (React 19), ref-based event, state round-trip.
- `gen-handoff` twice → byte-stable pack; full `build.mjs` from the jobs folder → all `✓` lines.

### Edge Cases

- Plant record without `species` → line omitted (card compacts); without `photoUrl` → monogram.
- `checked` attribute present-but-empty (`<vd-care-task-row checked>`) → true; removal → false; `aria-checked` tracks both directions.
- Both card and row on one page → single chip registration (guard), no `DOMException`.
- Attribute set AFTER `data` property → attribute wins (last write) — document, don't fight it.
- Figma variables 403 → styles fallback taken, `gate` evidence captured, script still exits 0 with a parity table.

---

## VALIDATION COMMANDS

### Level 1: Syntax

- `node --check` on: `system/wc/*.mjs`, `tooling/figma/figma-parity.mjs`, `agent-layer/gen-handoff.mjs`
- `python3 -m json.tool handoff/verdant/pack.json > /dev/null` (after Task 11)

### Level 2: Generators (standalone)

- `node agent-layer/gen-handoff.mjs` → `✓ … + 3 wc wrappers`
- Run again → `git status --porcelain handoff/` identical (determinism)
- `node agent-layer/gen-token-css.mjs --check` → no drift (regression)
- `node scenarios/validate.mjs` → passes (regression — untouched surface)

### Level 3: Full build (integration)

- From the jobs folder (`/Users/Berzins/Desktop/Linards_current/Linards jobs folder`): `node ../ux-factory/agent-layer/build.mjs _factory/kb/decisions/<company>.md` → every existing `✓` line + the extended handoff line

### Level 4: Manual (the harnesses)

- `npx serve .` → `/system/wc/demo.html` and `/tooling/wc-sandbox/react.html` via agent-browser; screenshots; checks per Tasks 5–6
- `/index.html` and `/scenarios/check.html` still render (regression — no shipped page touched)

### Level 5: Figma (secret-gated)

- `node tooling/figma/figma-parity.mjs` — real run (Task 9); error-path runs without/with-bad token

---

## ACCEPTANCE CRITERIA

(from issue #12, verbatim mapping)

- [ ] **AC #1** Spike 1 outcome recorded as a comment on #12; UI/doc wording follows the honesty constraint (Tasks 8–10; under Task 9 Outcome B the comment states what awaits the token and the wording cites the researched gate facts)
- [ ] **AC #2** REST read script runs at authoring/build time with the token from local `portal/.env` only — nothing client-side, nothing committed (Task 8; `.gitignore` already covers `portal/.env`; under Outcome B the real run is the named remaining item on #12)
- [ ] **AC #3** WC wrappers work in plain page + React sandbox; spike 3 outcome + trajectory wording recorded on #12 (Tasks 2–7)
- [ ] **AC #4** Pack ships the DTCG file (already, from #7) + documented import path (Tasks 10–11)
- [ ] All validation commands pass; no regression on any existing generator or shipped page
- [ ] Honesty surfaces present: fictional notices on both harness pages; parity artifact labeled real run; no capability overclaim
- [ ] Token discipline: wrapper shadow CSS references only spec-head tokens, zero literals
- [ ] CLAUDE.md map updated (additions only, selectively staged)

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order (Task 9 may float on user availability; everything else must not wait on it)
- [ ] Both harnesses driven end-to-end via agent-browser, screenshots captured
- [ ] `handoff/verdant/` regenerated and committed (deploy = commit the artifacts)
- [ ] Two spike comments live on #12
- [ ] Atomic commit on `feature/portability-proofs`: `feat: portability proofs — WC wrappers + Figma parity script/docs (epic #1, ticket #12; folds spikes 1, 3)` — append `— Closes #12` only under Task 9 Outcome A (Outcome B leaves #12 open on the real-run half)
- [ ] Execution report → `.claude/reports/portability-proofs-report.md`

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **[NEEDS USER — blocks Task 9 only]** A Figma personal access token + a test file key in `portal/.env` (`FIGMA_TOKEN=`, `FIGMA_FILE_KEY=`). PAT scopes: `file_content:read` (+ `file_variables:read` only if the UI offers it — Enterprise Full seats only). Test-file prep per Task 9: on a non-Enterprise account, Tokens Studio → import the DTCG file → "Create styles" → apply to nodes (styles, not variables, are what the fallback can read). Without these, spike 1 cannot run — the script and docs still land, and #12 stays open on AC #1/#2's real-run half. **Ask the user for these before starting Phase 3.**
2. **"Runs at build time" is read as "authoring time, standalone"** — the parity script is deliberately NOT registered in `build.mjs`, because the generator chain must stay deterministic and offline-runnable (drift-gate #9 will re-run it in CI, where no secret exists). If the user meant literally "inside build.mjs", flag before implementing — it would contradict #9's design.
3. **esm.sh CDN in the React sandbox** — an authoring-time network dependency in factory tooling (unrestricted zone). Assumed acceptable vs. adding a second dependency-carrying tool; the sandbox page says so honestly. (The *mechanics* — single React instance, property assignment, hooks — are already verified live at plan time, probe rows P4–P7; only this acceptability call remains open.)
4. **Placement of `system/figma-import.md`** — a lone doc at `system/` root, justified by the `system/ → pack` copy precedent (`tokens.source.json`). Alternative (`tooling/figma/README.md`) documents the script, not the pack's import path — both may exist; only the former ships in the pack.
5. **Assumption:** `feature/handoff-data-layer` (`d656f05`) is the correct base and #7's PR will merge before #12's — #12's PR will transiently contain #7's commit if opened first (note in the PR body, or stack the PR on #7's branch).

## NOTES (open canvas)

**Why the wrappers get their own shadow CSS instead of reusing `components.css` or waiting for #8's `vd-` classes:** the dependency graph is deliberate — #12 depends on #2+#7, not #8. Spike 3's question is about the *handoff form*, not the prototype: can an engineer drop one file into any stack and get the component, themed by tokens alone? Shadow-DOM CSS generated from the spec, reading only spec-head tokens, is the strongest form of that proof — and when #8 later builds the page-level `vd-` classes, the spec remains the single source both implementations answer to. Divergence risk between the two is bounded by the spec's `## States` + token list, and #9's gates can add a check later if it bites.

**Why 3 wrappers, not 2:** the card and the row both compose the chip (`children: ["status-chip"]` in both heads); wrapping the parents without the child would force chip markup inline and violate the composition rule the specs pin. 3 is within "2–3" (architecture §Components handoff).

**Slots — expected spike finding:** these three components are data-driven leaves; their specs forbid arbitrary children ("never nest a card in a card", chip "always a child … never free-standing"). Light-DOM slots would *weaken* the contract (arbitrary content injection vs. `additionalProperties: false`). The honest spike answer to "clean props/slots story" is likely: **props clean, slots deliberately absent** — bounded composition is the design system's own managed-freedom argument. Record it that way rather than bolting on a slot to tick a box.

**React version choice:** React 19 is the load-bearing demo — it assigns non-string JSX props to custom elements as DOM *properties*, so `createElement("vd-plant-card", { data: record })` just works; React ≤18 sets attributes only (objects stringify) and needs refs. The README documents the ≤18 recipe; the sandbox runs 19. Custom *events* still need refs even on 19 — that caveat goes in the spike-3 outcome verbatim (it's exactly the kind of honest detail a platform engineer checks).

**Parity semantics with web-only token values:** #7's spike already established the DTCG source carries web-only strings (`clamp()`, `color-mix()`, shadows, fontFamily stacks) that mobile targets exclude. The same subset logic applies to Figma: plain colors and px dimensions compare by value; everything else is name-parity (the variable/style *exists* in Figma under the contract name). The parity table says which comparison each row got — overclaiming value-parity on a `clamp()` ramp would violate the honesty contract.

**Both spike-1 branches are one script:** try variables → capture the 403 evidence → one GET-file call. The gate evidence (Figma's own error body) is what makes the "Enterprise-gated" label honest *and* verifiable — the capability indicator (#10/#14) can quote it. If variables DO answer (user has Enterprise access), `endpoint: "variables"` and the label upgrades per the decision rule — the script doesn't care which world it's in. Two researched traps shaped the fallback: the `/v1/files/:key/styles` endpoint lists **published team-library** styles only (empty on Starter — Starter can't publish), so local styles come from `GET /v1/files/:key` + node walking; and variables imported natively on a non-Enterprise account are **REST-invisible** (the read endpoint is the gated one), so the Starter-plan round-trip goes through Tokens-Studio-created *styles*, not variables. Both traps, when hit, are themselves spike evidence — record them, don't paper over them.

**The 6-per-month budget:** Figma's Nov-2025 rate tiers bind by the *file's* plan, not the token owner's seat — a Starter-plan test file allows ~6 GET-file calls per month. That single fact justifies the script's only non-obvious feature (the `--offline` replay of `.last-response.json`); without it, debugging the node-walk would burn the month in one sitting. It also belongs in figma-import.md — an engineer running the parity script against their own file deserves the warning.

**Figma parity artifact placement (`handoff/verdant/figma-parity.json`, flat):** matches the pack's flat-file precedent (`tokens.dtcg.json`, `pack.json`); written by the parity script, not gen-handoff, so pack regeneration stays deterministic while the artifact carries `ranAt` honestly. #9's CI drift gate re-runs `build.mjs`, which never touches this file — no CI secret needed.

**Rejected: committing a React/npm sandbox app** (vite/esbuild) — a second dependency-carrying tool for a harness page is exactly the "flexibility nobody asked for" smell; the import-map page is fully inspectable source, zero install, and the constraint pressure (no build step) is itself on-brand for the repo.

**Rejected: WC wrappers consuming the Worker API via `system/scenario-data.mjs`** — tempting (live data!), but the fixtures aren't contract-shaped yet (that reconciliation is #8's scope), and coupling the wrappers to the loader would smuggle a data dependency into what must stay a drop-in file. The `data` property takes any contract-valid record; #8 can wire the loader to it later in one line.

**Sequencing note:** Phases 1–2 and Phase 3 are genuinely parallel (different files, different prongs). If the user's Figma token is available on day one, run Task 9 early — the epic explicitly allows pulling spike 1 forward; its outcome only affects *wording* in Tasks 7/10, not code.

---

### Deliverable templates (fill the ⟨⟩ slots from actual results; do not soften the honesty wording)

**`pack.json` `portability` block (Task 11):**

```json
"portability": {
  "webComponents": {
    "files": ["wc/vd-status-chip.mjs", "wc/vd-plant-card.mjs", "wc/vd-care-task-row.mjs"],
    "readme": "wc/README.md",
    "trajectory": "⟨one line from wc/README.md — the declared-trajectory sentence⟩"
  },
  "figma": {
    "import": "figma-import.md",
    "parity": "figma-parity.json"
  }
}
```

(`figma.parity` becomes `null` under Task 9 Outcome B — never a placeholder file. JSON carries no comments; don't copy this parenthetical in.)

**Spike-3 comment on #12 (Task 7) — skeleton:**

> **Spike 3 outcome (Web Component handoff DX) — executed ⟨date⟩, plain page + React 19 sandbox against the real specs/contracts:**
> - Wrappers: `vd-status-chip` / `vd-plant-card` / `vd-care-task-row`, shadow-DOM, spec-head tokens only; themed by the token contract through the shadow boundary (page-level pack + scoped overrides both verified).
> - Props: attributes for primitives + a `data` property taking the full DataContract record — React 19 assigns it as a DOM property declaratively; React ≤18 needs a ref (documented in wc/README.md). Custom events (`vd-toggle`/`vd-select`) compose across the boundary; React still binds them via refs, not `onX` props.
> - Slots: deliberately absent — these specs pin bounded composition ("never nest a card in a card"; chip never free-standing); light-DOM slots would weaken `additionalProperties: false`. ⟨adjust only if implementation found otherwise⟩
> - **Decision rule: ⟨clean → "trajectory declared in the pack: every component as a standalone element; canonical form remains copy-paste HTML/CSS reading only tokens" | not clean → "WC presented as roadmap because ⟨specific friction⟩"⟩.**

**Spike-1 comment on #12 (Task 9) — skeleton, per branch:**

> **Spike 1 outcome (Figma REST access gate) — executed ⟨date⟩ against test file ⟨key⟩:**
> - `GET /v1/files/:key/variables/local` → ⟨`200` — variables readable; account is Enterprise | `403` — quote Figma's exact error body⟩.
> - ⟨If gated⟩ Fallback taken: one `GET /v1/files/:key` (`file_content:read`), styles resolved via node fills; parity rows: ⟨n matched / n name-only / n missing⟩.
> - **Decision rule: ⟨variables branch → variables parity demo | styles branch → styles-based parity; the variables path is labeled "Enterprise-gated" in figma-import.md and every capability indicator — Figma's own 403 body is the citation⟩.**
> - Artifact: `handoff/verdant/figma-parity.json` (real run, committed).

## AMENDMENTS

<!-- append-only after first approval; newest at the bottom -->
