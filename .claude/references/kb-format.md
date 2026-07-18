# KB Format — the filesystem is the database

All records live in the jobs folder, not this repo: `../Linards jobs folder/_factory/kb/` (resolved by `portal/lib/env.mjs`, overridable via `JOBS_DIR`). A record is markdown with a leading ```json fence as its machine-readable head, prose sections under `## ` headings after it. Two parsers read this shape — `portal/lib/kb.mjs` (cards) and `agent-layer/lib.mjs` (ledgers) — if you change a shape, keep both in sync.

The shapes:

- `companies/<slug>/intake.md` — JSON head (`company`, `slug`, `role`, `tier`, `state`, `site_root`, `created`, …) + `## JD text` / `## Research` / `## Notes`; raw page snapshots in `cache/`. Written by `portal/lib/intake.mjs`; a portal card is a read-time projection of this file.
- `decisions/<slug>.md` — JSON head (`site`, `flagship`, `site_root`, `tokens.*`, `constitution`) + one `## d-NNN · <prototype> · <title>` heading per decision, body in a `--- … ---` block of `key: value` lines with an optional `rejected:` option list.
- `outcomes.md` — a single markdown table; rows matched by company name and **column order is load-bearing** (`parseOutcomes` in `portal/lib/kb.mjs`).

Portal chat writes are fenced to `_factory/kb/` only (`canUseTool` in `portal/lib/chat.mjs`); research findings land as `research-<topic>.md` beside the intake plus one dated pointer line under its `## Research` heading.

## ComponentSpec + DataContract (this repo)

ComponentSpec reuses the kb record **shape** (JSON head + `## ` prose sections) but not the location: kb records live in the jobs folder; ComponentSpecs are platform files and live in-repo at `system/specs/` (epic §Data model — all platform files in-repo). Parser: `parseComponentSpec` in `agent-layer/lib.mjs`; the vocabulary generator (#11) reads heads, the handoff pack (`agent-layer/gen-handoff.mjs`) ships heads + prose.

- `system/specs/<component>.md` — head schema v1:
  - `component` — must equal the filename stem
  - `status` — `spec | shipped` (honesty surface: `spec` until the CSS lands; #8 flips it)
  - `class` — the CSS class the component ships as (`vd-` prefix for Verdant, per the `ot-` proto convention)
  - `contract` — sibling-relative path to its DataContract, or `null` for presentational components
  - `props` — `{ <name>: { type, required, enum?, description? } }` — names, types, requiredness, guidance: exactly what the vocabulary generator needs
  - `tokens` — `--`-prefixed names, each present in the `contract` group of `system/tokens.source.json`
  - `states` — named visual states (non-empty)
  - `children` — other spec'd components only (composition rules)
  - Prose sections, all four required, in order: `## Usage` · `## States` · `## Data binding` · `## Accessibility`
- `system/specs/<component>.contract.json` — DataContract: standalone JSON Schema 2020-12 (`$schema` + `type` required), sibling of its spec, describing the data the component binds (not its props). Consumed verbatim by validators, `$ref` tooling, and the WC spike.

Sync rule: the physical shape (leading ```json fence + `## ` sections) must stay readable by `portal/lib/kb.mjs`'s `parseFencedJson`/`section` — change the shape, keep both parsers in sync.
