# The composition grammar grows once: `children: many`

> Status: pre-ticket plan, 2026-08-28. Altitude: one small two-way PR that must land **before `stack`
> and `list`**, and therefore before the swap PR. Architecture:
> `docs/epics/canvas-design-import.architecture.md` § Recommended approach (the paragraph beginning
> "The composition grammar grows once"). Gets its own `piv-plan-implementation` pass when picked up.

## The fact

`validateComposition` (`system/agentic-renderer.mjs:79-96`, observed 2026-08-28) allows **at most one
child** per node, only when the vocabulary entry lists allowed child names, and enum-checks every prop
key against the entry (`:58-59`). Two templates render `children[0]` by hand (`:389`, `:401`). The studio
architecture anticipated this: a candidate that needs structured children "would force a versioned
vocabulary-schema call". `stack` (a layout box of N parts) and `list` (a container of N `list-row`s)
are that candidate. Under today's grammar they cannot exist, so the PRD's ten primitives are blocked on
this change.

## The call

Container entries declare a cardinality; everything else keeps the single-child rule. Not a general
tree grammar, not structured props: one field, honoured for the entries that set it.

- **Spec head:** the `children` key today lists allowed names. It gains a cardinality — shape decided in
  the ticket plan against `.claude/references/kb-format.md` (the ComponentSpec format is the source of
  truth and moves in the same PR). The plain reading: `children: many` beside the allowed list, absent
  meaning one.
- **`agent-layer/gen-vocabulary.mjs`** projects it into `handoff/verdant/vocabulary.json` (so
  `pack.json` and the vocabulary cannot drift: they are generated in one `build.mjs` run).
- **`validateComposition`** honours the cardinality for entries that declare it and refuses N > 1 for
  the rest, with the same path-naming error shape (`composition[2].children[1]: …`).
- **The renderer** already passes `node.children ?? []` to every template (`:562`), so a container
  template renders the array; the two `children[0]` templates are untouched.
- **build-checks:** group 3 (every entry has a render path) is unchanged; group 18 (`validateExamples`)
  gains a many-children example once `stack` exists; the check that cannot fail: feed two children to a
  single-child entry and watch it refuse, feed three to a `many` entry and watch it pass — both asserted
  by running the function, not by grepping.
- **The handoff pack** carries `vocabulary.json`, so the four regenerators run (`gen-handoff` ·
  `gen-vocabulary` · `gen-pack-bundle` · `gen-system-graph`) and `verify`'s drift check proves it.
- **The compose agent's context** (generated from `vocabulary.json` at run time, T13's minimal form) reads
  the cardinality from the same file, so the agent learns which parts take many children without a
  prompt edit.

## Why versioned

`vocabulary.json` is a committed artefact read at view time by every page that composes, and shipped in
the handoff pack an engineer reads. A field that changes what a valid composition is deserves a version
mark on the file, so a reader of an older pack knows which grammar it validated under. The ticket plan
checks whether `pack.json` already carries a version to bump, and if not, adds one to the vocabulary's
meta in this PR.

## Cascade

- No new tracked file under `system/` or `agent-layer/` is expected, so no `loc-summary` churn — the
  ticket says so if that changes.
- No shipped page changes at rest **unless the catalog renders the children rule as copy** (the docs
  chain prints spec heads); check `/components` under the neutral pack before deciding no baseline moves.
- `tokens.source.json`: untouched.
- `kb-format.md`: updated in the same PR (it is the format spec both parsers follow).

## Verify

`node tooling/build-checks.mjs` all green with the two new cases · `node agent-layer/build.mjs` run
from the jobs folder prints its ✓ lines · `git diff --stat handoff/` shows only the regenerated files ·
`/components` renders under neutral and saulera with no visual change, or its baselines are regenerated
with the reason stated.

## Not in scope

`stack`, `text`, `list`, `icon`, `choice` themselves (each its own ticket through the full chain) · any
grid work · the `id` node key (that rides with the swap PR, where `data-part` is first needed).
