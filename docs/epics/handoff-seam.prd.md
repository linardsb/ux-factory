# Epic: The handoff seam — a backend engineer wires a real system to the pack without a meeting

**Status:** proposed · **Owner:** Linards Berzins · **Date:** 2026-08-28
**Inputs:** the vault thinking doc `2026-08-28-component-system-backend-seam` (bound, Q2, Q3, decided) · two fenced agent runs, `~/Desktop/seam-run` and `~/Desktop/port-run` (committed by T1) · issue #326 (the defects, fixed ahead of this epic).
**This file carries both the intent and the decisions.** The decisions are placement-level and few, so there is no separate `.architecture.md`; `plan-architecture` is not needed before slicing.

## Problem

The handoff pack (`handoff/verdant/`) is generated, committed and consumable, and it stops one sentence short in eight places. A backend engineer who receives it has to guess the scenario's date, the derivation rules, the write path and its product effects, and which screen reads which collection; an iOS engineer has to hand-map every token name, fake five measurements from spacing arithmetic, and translate DOM accessibility into traits. We know this because two fenced agents did exactly that on 2026-08-28 and logged 61 questions.

The bound, from the thinking doc, is the rule this epic keeps: **the pack may only specify what a backend engineer would otherwise have to ask.** Nothing about caching, error envelopes, pagination, persistence, auth or versioning enters the pack; those rows landed in "my own convention" in both runs.

## Evidence

| Observed | Where |
|---|---|
| The backend engineer reverse-engineered the fictional today as 2026-07-15 from a chip label; the brief says 2026-07-14. Every derived field served was a day off; every contract validation passed. | seam-run `questions.md` Q1 · `scenarios/verdant/brief.md:14` |
| The write path is named (button, intent, "what the log-care commit sends") and never specified: verb, payload, atomicity, reschedule, `lastWatered`. | seam-run Q5, Q6 |
| No `components.css` ships; 17 of 20 components have no executable form in the pack. | seam-run Q20 · `handoff/verdant/` listing |
| Sub-component measurements (20px circle, 2px ring, 1px hairline, 44px target, 0.08em tracking) exist only as CSS literals. | port-run Q9–Q11 |
| The spec names `--color-accent`; the Swift build names `neutralSemanticAccentColorAccent`; only the `neutral` group reaches iOS/Android, without fonts, weights, line-height or tracking. | port-run Q1, Q3–Q6 · `handoff/verdant/tokens/ios/FactoryTokens.swift` |
| Accessibility on every platform reduces to role, name, value/state, hint, grouping; the spec speaks DOM. | port-run Q19–Q21, `translation.md` T20–T25 |
| Ten of 28 and twelve of 33 rows were the engineer's own convention and needed nothing from the pack. | both `questions.md` |
| Nobody asked what to show on loading / empty / error / stale. | both `questions.md` (absence) |

## Hypothesis

> **We believe** five additions to the pack (bindings, scenario constants with derived rules, one command contract, the shipped `components.css`, metrics in the spec head) plus one conformance command **will cause** a backend engineer who receives the pack **to** wire a real API to the built components with no round-trip to design, **resulting in** a third fenced run logging fewer than three designer-bucket questions and `contract-check` green against a service the run wrote.

> **We'll know we're RIGHT if** a fresh fenced run, given only the extended pack, stands up a service that passes `contract-check` and logs under three designer-bucket rows.
> **We'll know we're WRONG if** that run still logs three or more designer-bucket rows the five additions do not answer, or if the additions draw a "please remove this" from the run (over-specification).

## Users

- **The backend engineer** receiving the pack (the win condition's subject). Any stack; the pack says nothing about theirs.
- **The native engineer** (iOS first) building a component from the pack alone (T4).
- **The hiring manager** who sees the seam as evidence: one command, the prototype lights up.

## Success metrics

- Designer-bucket questions per fenced run: 20 (seam-run, 2026-08-28) → under 3.
- `contract-check` verdict against the Worker: green on the day T3 lands, and green against the T1/T3 re-run's service.
- Over-specification count (rows a run marks "would remove"): 0.

## MVP — the slices

Order is the argument's order: evidence first, the pack next, the test, then portability.

### T1 — Commit both runs as-is, labelled
Commit `~/Desktop/seam-run` and `~/Desktop/port-run` under `docs/epics/fixtures/handoff-seam/2026-08-28-seam/` and `…/2026-08-28-port/` (D7), without their `pack/` copies (record the pack's commit, `6f1376b`, in a `README.md` per run). Label each README: "real agent run, 2026-08-28, fenced to the pack, unedited". The run's `server.mjs` passes `node --check` under CI verify; nothing else reads it.
**AC:** both directories tracked; each README names the label, the fence, the prompt used and the commit; `node tooling/drift-check.mjs` clean; no file edited from its run state (diff against the desktop copies is empty).

### T2 — The pack's five additions
- **Bindings** (D1): a `bindings` section in `pack.json`, generated from `scenarios/verdant/proto.config.json` plus a per-screen filter/order statement: the two implied screens named (My plants, Today), each with collection → contract → filter (the Today window) → order → the featured-plant rule.
- **Scenario constants + derived rules** (D2): `scenario.json` in the pack (`today`, `fictionalNotice`) generated from the brief and `copy.json`; `x-derived: { from, rule }` + `readOnly: true` on `status` in both contracts; the plant-status and Today-window rules stated as machine-readable text beside them.
- **One command contract** (D3): `contracts/commands/log-care.json` — request `{ taskIds }`, response, error envelope shape left to the backend, effects stated in prose (mark done; `lastWatered` / `lastFertilized` bump; next water task at `+wateringIntervalDays`), atomicity stated.
- **`components.css` shipped** (D4): `gen-handoff` copies `system/components.css` into the pack; the README's consumption section says which blocks are which components.
- **Metrics** (D5): a `metrics` block in the spec head for care-task-row and status-chip (check circle, ring, hairline, tap target, tracking), carried into `pack.json` and `vocabulary.json`; `components.css` and the wrappers read the same numbers (a build-checks group asserts the CSS literal equals the head).
- **F7** (D6): drop `min/max/step` from `stat-tile.value`; group 21's pin flips to "unbounded, the contract carries the unit"; the catalog renders a number field; the components baseline regenerates in this PR.
**AC:** every addition is generated, never hand-written in `handoff/`; `drift-check` clean; build-checks gains one group covering bindings ↔ `proto.config.json`, `scenario.json` ↔ brief, the command's example validating against its schema, metrics ↔ CSS; the seam-run's Q1–Q6, Q12, Q19, Q20, Q24 each have a named answer in the pack (a table in the PR body).

### T3 — `tooling/contract-check.mjs <baseUrl>`
Fetches every collection the bindings name, validates every record against its contract (hand-written JSON Schema subset validator — types, required, enum, format date, additionalProperties; no library), prints one line per collection and a verdict. Green against `worker/api.mjs`; a deliberately broken fixture goes red naming the record and the field. Its header states what it cannot see: rendering.
**AC:** green against the Worker and against the seam-run's `server.mjs` once its routes are mapped by the bindings; red on a mutated fixture; build-checks runs the validator over the committed fixtures as a pure group.

### T4 — Portability (after #301)
- Canonical token paths in the spec head (`color.accent`), CSS/Swift/Kotlin names derived into `pack.json` (D8).
- The `contract` group reaches the iOS/Android builds; type tokens become composites (family, size, weight, line-height, tracking) once #301 fixes the text roles.
- The `## Accessibility` section rewritten as role / name / value / hint / grouping with a three-column platform table; the port-run's T20–T25 are the fixture.
**AC:** a re-run of the port prompt logs no token-name or a11y-translation row; `swiftc` still compiles the run's `CareTaskRow.swift` against the regenerated tokens.

### Later, not sliced
- A third fenced run: a frontend engineer consuming the extended pack against an API they did not write. If it asks for UI states, the parked `states` section (D9) is unparked.
- One native implementation committed beside `wc/` — only if a target employer is native.

## Decisions

- **D1 A component binds a view record, never an endpoint.** The contract is the record, denormalised where the screen needs it (`plantName` already is). How it is produced is the backend's.
- **D2 Derived fields are declared, not described.** `x-derived` + `readOnly`; the backend computes; components never do date arithmetic. Scenario constants ship as data.
- **D3 One command contract, effects in prose, envelope theirs.** The pack asks for the write path by naming it; it does not dictate the error shape.
- **D4 The pack ships its executable form.** `components.css` is brand-free by construction (token-only); shipping it is copying.
- **D5 Metrics live in the spec head and the CSS reads them back through a check,** not a new contract token per measurement: these are component-local, not semantic.
- **D6 F7 resolves by dropping the bound.** Group 21's own principle is "bounds never invented"; 0–100 was invented for moisture and is wrong for light. The catalog loses its one range control; that is the honest consequence.
- **D7 Runs live under `docs/epics/fixtures/handoff-seam/`,** beside the pre-grill PRD fixture: evidence for an epic, not a trace (wrong format), not a discovery package (wrong half), not under `handoff/` (generated only).
- **D8 Canonical names in the head, platform names derived.** The spec never says `--`; `gen-handoff` emits the per-platform table.
- **D9 The `states` section is parked, not killed.** Unevidenced by both runs; a frontend-consumer run decides.
- **Rejected:** an OpenAPI generator (its `paths` dictate the mock's URL shape); a BFF prescription; an SDUI runtime; GraphQL/protobuf mappings; renaming the wrapper's `action` attribute (pinned by design).

## Non-goals

- Anything from the system-design list a backend engineer never asks a designer: storage, sharding, replication, consensus, load balancing, CDN, metrics stack, auth.
- A second real scenario; Verdant carries the epic.
- Any view-time change to a shipped page beyond the catalog's number field (D6).

## Open questions

- **Q1** Does `bindings` carry the filter as text or as a tiny predicate grammar? Text first; a grammar only if T3 needs to evaluate it.
- **Q2** Where does the seam-run's `server.mjs` route table meet the bindings for T3's second green? A `--map` flag, or the run's README lists the mapping by hand.

## Constraints carried

The honesty contract: both runs are committed unedited and labelled; the third run is a real run or it is not claimed. Token discipline: no literal enters `components.css` for D5; the head and the CSS agree by check. Deploy = commit the artifacts: every pack addition is generated.
