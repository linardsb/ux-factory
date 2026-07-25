# Figma import — getting these tokens into your design tool

How the pack's DTCG token file (`tokens.dtcg.json` — W3C Design Tokens format,
`$value`/`$type`, widely-implemented string profile) round-trips with Figma, with each
path's gate stated plainly (epic #1, ticket #12; folds spike 1).

## Path 1 — native Figma import (no plugin)

Since Figma's Schema 2025 release (rolled out Nov–Dec 2025): open a Variable Collection
and **drag `tokens.dtcg.json` into it** — Figma creates or updates variables from the
DTCG file. Right-click a collection → "Export to JSON" goes the other way.

Gates and caveats, stated exactly:

- UI-only — there is no REST equivalent of this import.
- Export omits `$description` fields (community-reported as of early 2026).
- Availability may vary by account — the feature rolled out gradually and Figma has not
  published a plan matrix for it; we do not claim it works on every plan.
- **Variables imported this way on a non-Enterprise account are invisible to the REST
  API** — the read endpoint is Enterprise-gated (Path 3), so automation can't see them.

## Path 2 — Tokens Studio (free tier)

[Tokens Studio](https://tokens.studio) reads the W3C DTCG format on its free tier
(enable the "W3C DTCG" token format in settings — Pro gates only themes, modifiers, and
branches, not the format):

1. Import `tokens.dtcg.json`.
2. Optionally "Create styles" from the colour tokens and apply them to nodes.

Step 2 is what makes values REST-visible on non-Enterprise plans: local styles applied
to nodes can be resolved through `GET /v1/files/:key` (see the parity script below),
which is the practical round-trip on a Starter/Professional/Organization account.

## Path 3 — REST variables (the automation path)

`GET /v1/files/:key/variables/local` and `POST /v1/files/:key/variables` are
**Enterprise-gated**: the `file_variables:read` / `file_variables:write` scopes are only
offered at token-creation time to full members of Enterprise orgs (Figma REST API docs,
scopes + variables endpoints; note Figma's "Organization" plan is gated too — only
Enterprise qualifies). Variable writes are the eventual push-automation path; this repo
ships the read/parity half only.

Measured, not just cited (Starter file, 2026-07-25): the read answers `403` with
`{"status":403,"error":true,"message":"Invalid scope(s): current_user:read,
file_comments:read, file_content:read, …"}` — Figma listing the scopes the token *does*
carry, none of which is `file_variables:read`, because the UI never offered it. The
parity script keeps that body verbatim as the gate evidence.

## The parity script — verifying the round-trip against your own file

`tooling/figma/figma-parity.mjs` (zero-dep Node, standalone — deliberately not part of
the deterministic generator chain) reads your Figma file and diffs it against the token
contract by name, and by value where the value is a plain hex colour or px dimension
(web-only values — `clamp()` ramps, `color-mix()`, shadows, font stacks — get name
parity only, and the output says so per row):

1. Create a personal access token: Figma → Settings → Security → Generate new token,
   with the granular `file_content:read` scope (add `file_variables:read` only if the
   UI offers it — it appears solely on Enterprise Full seats).
2. Put `FIGMA_TOKEN=...` and `FIGMA_FILE_KEY=...` in `portal/.env` (gitignored — the
   secret never ships client-side and never enters the build).
3. `node tooling/figma/figma-parity.mjs`

The script tries the variables endpoint first; if your plan gates it (HTTP 403), it
records Figma's exact error body as evidence and falls back to a **paged** read:
`GET /v1/files/:key?depth=1` for the page index, then one
`GET /v1/files/:key/nodes?ids=<page>` per page, resolving style values from node fills.
Either branch writes `handoff/verdant/figma-parity.json` labeled `"real run"` with the
endpoint that answered.

Why paged, and not one `GET /v1/files/:key`: a real design system's document overflows a
JavaScript string (~512 MB), and both `res.text()` and `JSON.parse` need the whole thing
at once — so streaming cannot rescue it and the payload has to be made smaller
server-side. `GET /v1/files/:key/styles` is *not* the way in either: it lists **published
team-library** styles only, and answers `200` with an empty array on a non-Enterprise
file (measured against a Starter file, 2026-07-25). Local styles are named only in a
response's top-level `styles` map and valued only on the nodes that reference them, which
is why the fallback walks node fills.

**Rate budget warning:** since Nov 2025 Figma rate-limits by the *file's* plan — on a
Starter-plan file, `GET /v1/files/:key` allows roughly **6 requests per month**, and the
paged fallback spends one request per page (a community kit can have 90+). So:

- Every response is streamed to `tooling/figma/.raw/` and recorded in
  `tooling/figma/.last-response.json` (both gitignored) **before** it is parsed — a crash
  can never cost you a request.
- A cached response is reused, never re-bought; `--refresh` forces a re-fetch.
- `--page <name|id>` (repeatable, comma-list ok) buys only the pages you name — a kit
  keeps its values on a few foundation pages — and `--max-pages <n>` caps a run. Every
  page a run declines is listed in the artifact's `pages.skipped` with the reason.
- `node tooling/figma/figma-parity.mjs --offline` re-parses the whole cache, spending
  nothing.

## The other direction — importing a Figma file's values as a pack

Everything above sends tokens *to* Figma. `tooling/figma/figma-pull.mjs` brings a Figma
file's colours back the other way, as a **token pack** — `system/tokens.<slug>.css`, the
file the shell swaps in its one `<head>` line to re-skin the whole site:

```
node tooling/figma/figma-pull.mjs --slug <slug> --accent <hue> --page Color
node tooling/figma/figma-pull.mjs --slug <slug> --accent <hue> --offline   # free re-run
```

It targets a pack and never the contract. The repo splits contract tokens (semantic,
brand-free, what components reference) from pack values (the brand layer); a Figma file
holds brand values, so a pack is where they belong — and it keeps the importer clear of
the drift check that polices `tokens.contract.css` / `tokens.neutral.css` as generated
from `tokens.source.json`.

**Mapped by role, not by name.** Design systems publish colours as `<hue>/<step>` ramps
(`gray/900`, `indigo/600`) which share no vocabulary with the contract's semantic names,
so name matching would import nothing at all. Each contract token instead claims a
nominal rung of the neutral or accent ramp — and every value emitted is a real value from
the file.

**Contrast is then negotiated inside the file's own ramps.** A nominal rung is not
automatically accessible: a yellow accent at `/600` fails as text on white. Where a pair
fails, the token walks to the nearest rung *of the same ramp* where every pair it takes
part in passes, so the value stays one the designer actually chose rather than something
this repo invented. The accent's hover/active states are then re-derived as offsets from
wherever the accent landed, so a negotiated accent can't collide with its own hover. The
pairs and thresholds are `RULESET.wcagPairs` — the same list `derive()` is held to,
imported rather than restated.

The pack's header comment records whose design work it is, the ramps mapped, every
negotiation made, and any pair still failing. The ~48 contract tokens with no colour
role (motion, the type ramp, spacing, shadows, and the `color-mix()` inverse tokens,
which stay relative and re-derive from the imported accent) are auto-filled from contract
defaults by `gen-pack-css.mjs` and reported as auto-filled.

This is build-time only, and can never be a view-time connection: shipped pages are
vanilla with no runtime dependencies, and `FIGMA_TOKEN` is a secret that must never reach
a client. Pull → commit the pack → readers replay it — the same rule the agent traces
follow.

## Current state of the committed artifact

The parity artifact is produced only by a real run against a real file — it is never
hand-written. Until that run lands, `pack.json` carries `portability.figma.parity: null`
("pending real run") and this pack contains no `figma-parity.json`. The gate facts above
come from Figma's published documentation, cited at plan time (2026-07-17); the run
itself will attach Figma's own words as evidence.
