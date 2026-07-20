# Scenario packages — the demo subjects, as content

Spec for epic #1, ticket #4 · architecture §Data model (Scenario package) + §Boundaries (Worker).
The filesystem is the database: a scenario is a directory of committed files, registered in
`scenarios/index.json`, validated by `node scenarios/validate.mjs`. **Adding a scenario is adding
content, not engine work** — clone a package directory, add one registry entry, add its fixture
imports to `worker/fixtures.mjs` (data registration; the Worker's routes never change).

Two packages ship: **Verdant** (consumer plant care — the primary scenario) and **Fieldwork**
(B2B field-service scheduling). They deliberately rule **differently** at the Hooked
frequency/ethics filter — Verdant's habit loop is justified; Fieldwork is an efficiency utility
where habit mechanics would be inappropriate. The validator enforces that the verdicts differ.

**Honesty rule (hard, from the PRD):** every scenario is fictional and must say so — `"fictional": true`
in the brief's JSON head, a non-empty `fictionalNotice` in `copy.json`, rendered wherever the
scenario appears.

**Provenance.** Fictional and real subjects are the *same package format* with different labels. The
two packages committed here are fictional (`fictional: true`). A real company can also become a
package — compiled from a company-brief record by `agent-layer/gen-company-package.mjs` (epic #38) —
carrying `fictional: false`; its honesty surface is a `speculativeNotice` + linked `sources` in
`copy.json` in place of the `fictionalNotice` (speculative work based on the company's public
statements, not affiliated with or endorsed by them). **Real-provenance packages are never committed
to this repo** — it is public and inspectable, so the compiler enforces a privacy boundary that
refuses to write one inside the repo. They are validated out of registry, by path:
`node scenarios/validate.mjs <dir>` (also the compiler's own self-check) — no `index.json` entry.

## Package layout

```
scenarios/
  index.json                  registry: the scenario list + API base URLs
  validate.mjs                hand validator (zero-dep; no schema library — project rule)
  check.html                  shipped check page: drives the fetch helper against every collection
  <slug>/
    brief.md                  the fictional product brief — humans + build-time agents read this
    intake.defaults.json      the 8 intake questions with defaults + reasoning, plus the axes block
    copy.json                 strings shipped pages render (incl. the fictional notice)
    proto.config.json         which prototype screens exist and which collections they use
    fixtures/<collection>.json  the mock data the Worker serves and the fallback ships
    rubric.json                 (optional) the screen's five-pillar AI-UX rubric — maker-authored, cited
```

Markdown where the audience is humans and authoring agents (`brief.md`); plain JSON where the
audience is the browser (shipped pages are vanilla — no markdown parser at view time).

## File shapes (the contract `validate.mjs` enforces)

### `brief.md`

The kb record convention (`.claude/references/kb-format.md`): a leading ```json fence as the
machine head, prose under `##` headings.

Head: `{ "slug", "name", "fictional": true, "domain", "oneLiner", "today" }` — `slug` must match
the directory; `today` is the scenario's fixed fictional current date (fixtures use absolute dates
coherent with it — committed data must stay coherent forever, so no relative dates anywhere).
`fictional` is a required boolean: `true` for the committed fictional scenarios; a real-provenance
package (compiled from a company brief, never committed here) sets it `false` (see **Provenance** above).

Required sections: `## Product` · `## Users` · `## Problem` · `## Behaviour model` ·
`## Ethics position`. The Behaviour-model section argues the frequency-filter reading; the
Ethics-position section states the verdict the copy's `ethicsReveal` renders.

### `intake.defaults.json`

```json
{
  "questions": [
    { "id": "problem", "stage": "discovery", "question": "…", "default": "…",
      "reasoning": "…", "bounds": null, "asked": false }
  ],
  "axes": { "brandColor": "#2F7A4D", "density": "comfortable", "rewardType": "self", "frequency": "daily" }
}
```

- Exactly these 8 question ids (from the PRD §6 intake table, fixed): `problem`,
  `current-solution`, `named-user`, `target-behavior`, `internal-trigger`, `friction`,
  `success-signals`, `ethics-gate`. Every question carries a non-empty `default` **and**
  `reasoning` — the wizard (#10) shows both (a recommended default and *why*).
- `bounds`: an array of allowed override options where the answer is bounded, else `null`.
- `asked`: a hint for the Factory page's 3–5-question cut (final cut is #10's call —
  defaulted questions are proposals accepted silently).
- `axes` are the derivation-engine inputs (architecture §Recommended approach): brand color →
  palette · density → type/space scales · reward type → component patterns · frequency →
  ethics-gate verdict. Values are pinned to the engine's contract (#3,
  `.claude/plans/live-derivation-engine.md` — `derive(input)`'s validated vocabulary), and
  `validate.mjs` enforces them: `brandColor` is `#rrggbb` hex ·
  `density: compact|comfortable|spacious` · `rewardType: tribe|hunt|self` ·
  `frequency: multiple-daily|daily|weekly|monthly|rarely` (the Hooked habit zone is weekly or
  better). Two optional booleans, `improvesLives` and `wouldUseIt`, feed the Manipulation-Matrix
  quadrant; omit them and the engine skips the quadrant (the frequency verdict stands alone).

### `copy.json`

Flat string map. Required: `fictionalNotice` (non-empty — honesty surface #1) and
`ethicsReveal: { "verdict", "narrative" }` (the guess-then-reveal moment's payload; the two
shipped scenarios' verdicts must differ). Everything else — `tagline`, `stations.*`, prototype
strings — is free-form content #10 and #8 render. In a real-provenance package (`fictional: false`,
never committed here) the required honesty surface is instead `speculativeNotice` (carrying the
speculative-work disclaimer) + a non-empty `sources` array; `validate.mjs` enforces whichever the
provenance declares.

### `proto.config.json`

```json
{
  "screens": [ { "id": "plant-overview", "title": "…", "collections": ["plants", "care-tasks"] } ],
  "slots": []
}
```

Every name in `collections` must have a matching `fixtures/<name>.json`. `slots` names the
designated agentic regions of a hybrid canvas (Fieldwork only for now — placeholder ids; #8
designs the canvas, #13 fills the slots).

### `fixtures/<collection>.json`

A JSON array of objects, each with a unique `id`. Reference convention: a field named
`<thing>Id` (at any depth, `null` allowed) must resolve to an `id` in a collection of the same
package whose name **begins with** `<thing>` — e.g. `plantId` → `plants`, `techId` →
`technicians`, `jobId` → `jobs`. The validator walks and checks these, and also checks that
every `YYYY-MM-DD`-shaped string is a real calendar date.

**Fixtures carry what the DataContracts promise** (#8): the mock API serves contract-valid
records, so derived/denormalised fields are baked in — deterministic against the brief's fixed
fictional `today`, coherence-proven by the validator:

- Verdant `care-tasks`: `plantName` equals the referenced plant's `name`; `status` is
  `overdue` (due before today) / `due` (due today) / `ok` (future, or `done: true`).
- Verdant `plants`: `status` is the worst status among the plant's not-done tasks
  (`overdue` > `due` > `ok`; no open tasks → `ok`).
- Verdant `readings`: display-values-only sensor pairs
  (`{ id, plantId, kind: "moisture"|"light", value, unit, label }`) — the stat-tile source.
- Fieldwork `jobs`: at least one job has `techId: null` — the dispatch board's
  "Needs assignment" panel must never be able to go silently empty.

### `rubric.json` (optional)

Present only when the package's prototype includes a real AI feature — today, Fieldwork's agentic
dispatch composition (the `/agentic-ui-study` screen). It records the screen's five-pillar AI-UX
rubric: each entry ties a pillar (`trust | clarity | control | transparency | meaningful-benefit`)
to an affordance the screen ships **today**, and cites its primary source.

```json
{
  "screen": "…",
  "aiFeature": true,
  "patterns": [
    { "pillar": "transparency", "pattern": "…", "how": "…a real, present affordance…", "cite": "…verified primary source…" }
  ]
}
```

**Maker-authored assessment, not agent output** (honesty contract, hard): every `how` must name an
affordance that exists now, and every `cite` is verified against its primary source (no fabricated
guideline numbers, no talk-speaker names, no verbatim secondary-source reuse). `validate.mjs` does
**not** read it — it inspects only `brief.md` / `intake.defaults.json` / `copy.json` /
`proto.config.json` and the `fixtures/` directory, with no top-level allowlist — so `rubric.json`
never trips the scenario gate; the study page shape-checks it at view time and renders nothing if it
is absent or malformed. Screen/flow-level patterns live here; the pattern a single *component* carries
wherever used lives on its ComponentSpec `aiPatterns` head field — a screen's full rubric is the union
of the two (`.claude/references/kb-format.md` §ComponentSpec). Format set by #41; the per-company build
(#43/#44) authors packaged rubrics via this same shape.

## Who consumes what

| Consumer | Reads |
| --- | --- |
| #3 derivation engine | `intake.defaults.json → axes` (via #10) |
| #8 prototypes | `proto.config.json` + fixtures via `system/scenario-data.mjs` + `copy.json` notices |
| #10 Factory page | `index.json` (toggle) · `intake.defaults.json` (wizard) · `copy.json` |
| #13 agentic study | `fieldwork/fixtures/*` (the heavy-ops data) |
| `worker/` mock API | fixtures, via `worker/fixtures.mjs` static imports |

## Serving

The Worker (`worker/api.mjs`) serves `GET /api/<slug>/<collection>` from the same committed
fixture files — one source, no copy drift. The client helper (`system/scenario-data.mjs`) tries
the Worker with a timeout and degrades to the static path `/scenarios/<slug>/fixtures/<collection>.json`,
reporting `source: "worker" | "static"` truthfully (capability indicators — honesty surface #3).
`scenarios/check.html` drives every collection through the helper and shows which source answered.
