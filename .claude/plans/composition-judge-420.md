# #420 — composition judge: evals.json + tooling/composition-judge.mjs, and the five copy rules

Standalone. A pure, LLM-free post-hoc judge over committed compositions; the prompt's copy rules
made checkable by it. Honesty: the judge grades and is never fed to a prompt (fieldwork-kpis' rule).

1. `tooling/composition-judge.mjs` — `PREDICATES` (eleven, each with `rule`, `source`, `phrase`),
   `loadEvals`, `judgeComposition` (pure, in-memory), `judgeScenario`, a CLI printing one line per
   expectation and a verdict with raw counts; an undefined predicate refused by name.
   → verify: `node tooling/composition-judge.mjs fieldwork` and `northwind` run end to end.
2. `scenarios/{fieldwork,northwind}/evals.json` — one entry per committed composition, every
   predicate on every composition (the slot-specific ones say when they do not apply).
3. `portal/record-composition.mjs` — the five copy rules as one bullet in `PIV_COMPOSE_SYSTEM`;
   the constant exported so the gate can read it.
4. `tooling/build-checks.mjs` group 37 — predicate ↔ prompt/slot/copy phrase; evals resolve; three
   in-memory mutations with the positive control; the unknown-predicate refusal. Counts updated in
   CLAUDE.md ×2, gates.md heading + row 37, the "all N groups pass" line.
   → verify: 37/37; loosen a predicate → red.
5. `--dry` then one real run per scenario under the new prompt, new slugs (`-420`), never editing a
   committed composition. → verify: the recorder's `✓` and the judge over the new slug.
