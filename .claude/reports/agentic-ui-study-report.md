# Implementation Report — Agentic-UI study (#13, folds spike 6)

**Plan**: `.claude/plans/agentic-ui-study.md`   **Branch**: `feature/agentic-ui-study` (worktree)   **Status**: COMPLETE

## Summary
Built Exhibit 02: a build-time agent composes Fieldwork dispatch-board views from a bounded component vocabulary, and the reader runs **ask → propose → adjust** with the **refusal shown as a primary designed affordance**. The ticket folded a minimal shared-library extension (`metric-tile`, a cross-scenario `ds-` primitive) so the vocabulary can express dispatch data, then ran **spike 6** — 4 real Agent SDK composition runs, gated against a rubric + a ground-truth KPI check + `validate-trace`, every proposal render-checked in a browser. The two canonical proposals fill both Fieldwork agentic slots and drive the study page. No live model call at view time; everything shipped is vanilla/zero-dep.

## Tasks completed
- **C1 — `metric-tile` primitive** → `system/specs/metric-tile.md` (CREATE), `system/agentic-renderer.mjs` (template), `system/components.css` (`.ds-metric-tile`, tone via accent fill-inversion — no new tokens), regenerated `handoff/verdant/{pack,vocabulary}.json`.
- **C2 — infra** → `portal/record-composition.mjs` (CREATE, the composition runner), `tooling/fieldwork-kpis.mjs` (CREATE, the KPI judge), `portal/lib/trace-recorder.mjs` (meta slug/task redaction, the PR #28 gap).
- **C3 — spike 6 gate PASS** → 4 committed proposals in `proto/compositions/` (+ `index.json`) and 4 PIV trace pairs in `traces/`; verdict + render-refinement recorded on #13.
- **C4 — reader surface** → `system/agentic-study.mjs` (CREATE, `renderStudy`), `agentic-ui-study.html` (CREATE, route `/agentic-ui-study`), `proto/fieldwork.html` (two slots filled), `system/proto.css` (`.proto-slot-fill`), `work.html` (Exhibit 02 deep link + "Runs now").
- **C5 — docs** → `CLAUDE.md` architecture-map lines.

## Tests / verification
No suite (project rule) — "done" = run the surface + the honesty read. All performed:
- **Unit**: metric-tile spec parses; vocabulary regenerates deterministically (8 components); `validateComposition` accepts a valid metric-tile, refuses bad tone / missing required / rogue prop / a child (leaf lock) / numeric value; `fieldwork-kpis.mjs` prints the anchors (overdue **4**, unassigned **5**).
- **The gate (spike 6)**: `--dry` proof (auth + all 4 PIV markers + Write→artifact + fence denies + in-process validate). 4 real runs; every number diffed against `fieldwork-kpis.mjs` under its stated definition and confirmed exact; every trace passes `validate-trace`.
- **Browser (agent-browser)**: the study page — each question renders its proposal (summary-strip horizontal, insight-panel column); a bounded tone adjust re-renders; the **boundary-probe surfaces `composition[i].props.tone: "urgent" is not in enum [neutral | warn | critical]`** with the preview NOT blanked; capability + fictional notice truthful. Fieldwork — both slots render within bounds, board chrome untouched, and **degrade per-slot to the labeled placeholder** when a proposal is missing.
- **Integration**: full `agent-layer/build.mjs` from the jobs folder (metric-tile coexists — 8 specs, 8 vocab components); `validate-trace` all green (incl. demo-notice); token-lint + token-drift green; `handoff/` deterministic.

## Validation results
Level 1 syntax: **PASS**. Level 2 unit: **PASS** (KPI anchors 4/5 correct). Level 3 integration: `validate-trace` **PASS** (10 traces), `gen-token-css --check` **no drift**, `token-lint` **0 undeclared / 0 orphan / DTCG valid**, full `build.mjs` **PASS**. Level 4 manual (browser): **PASS** (all checklist items).

## Deviations from the plan (reviewer's signal of intent)
1. **Full trace-player replay deferred; lean provenance shipped instead.** The plan marked "replay the real run" via `renderTracePlayer` **optional**. I shipped a verbatim honesty label ("Real run, curated for length", read from the committed trace meta) + a link to the committed trace JSONL, rather than embedding the stepped player. Rationale: the `.trace-*` CSS is not shared (it lives inline in `trace.html`), the plan marked it optional, and `trace.html` already hosts the full replay; the honesty is carried by the verbatim label + the inspectable committed trace + the refusal thesis. Simplicity First.
2. **Runner keep-gate hardened beyond the plan's spec — `validateTrace()` itself.** Early runs produced valid compositions but PIV traces where the model crammed the `gate`+`implement` markers into one text block (no `step` tagged `gate`), which the recorder's marker-scan called "clean" but `validate-trace` rejects. Fixes, all in committed source (the sanctioned lever): the gate phase now requires a verifying re-Read of the vocabulary (forces a distinct `gate` step, mirroring the demo-notice trace); the first output must precede any tool call (no null-phase step); the runner's keep-gate is now `validateTrace()` (refuses, never ships, a run that would fail the shipped drift guard); a stale Write target is cleared so the implement step is a real Write→artifact.
3. **`sla-risk-and-load` re-run after a render-first check (Phase 4 prep).** Rendering revealed it stuffing sentences into the large `value` slot ("Priya Nair — 5 open jobs" at h3) — invisible to the number/trace checks. Tightened the runner (value = a number/short phrase, entity names in the **label**; the board's own **2-day** SLA window, replacing an earlier 3-day framing so figures match the board it renders beside) and re-ran. Documented on #13.
4. **Manifest paths absolute-from-site-root.** `index.json` stores `proposal: "/proto/compositions/<slug>.json"` and `trace: "/traces/<slug>.jsonl"` (not the plan's `"compositions/<slug>.json"`), so every consumer — the study page at `/`, the Fieldwork board at `/proto/` — fetches unambiguously.
5. **4 questions** (2 canonical slot-fillers + 2 study-only), within the plan's 3–5 range. The `agent.*` bus-replay adjust path was cut (already decided in the plan, D-cut).

## Issues encountered
- The two runner-discipline failures above (PIV-block cramming; render overflow) were caught by the runner's own gates + the render-first check and fixed by tightening committed source + re-running — never by hand-editing. Total live-run spend ~$4 (dry proof + discarded early runs + committed runs), well under the ~$10 SG-B ceiling.

## Honesty read (credibility-risk ticket)
Held on all surfaces: fictional scenario labeled (study + Fieldwork); traces labeled "real run, curated" (verbatim); capability states exactly what runs (precomputed proposals · live adjust + render · no model call); no composition hand-written or hand-edited; the runner's prompt is built ONLY from vocabulary + fixtures + question + slot bounds (no example — the committed source is the inspectable proof; a tight Read fence forbids reading any example on disk); A2UI/AG-UI cited as lineage only.

## Acceptance criteria
AC#1 real gated proposals (no example, validate + PIV + KPI-match) ✓ · AC#2 ask→propose→adjust + visible out-of-vocab refusal ✓ · AC#3 Fieldwork slots within bounds, chrome untouched, honest degrade ✓ · AC#4 A2UI/AG-UI lineage ✓ · AC#5 bridge argument shown via the refusal (no pedagogy callout) ✓ · Spike 6 folded/gated/verdict on #13 ✓ · Honesty contract held ✓ · No new shipped deps, vanilla, regenerated artifacts committed ✓ · No regressions ✓.
