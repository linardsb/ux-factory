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

## Path 4 — a plugin export (the route with no plan gate and no rate limit)

Both scripts below take `--from <export.json>` instead of reading the API. This is worth
knowing because it walks around **both** walls at once:

- **No Enterprise gate.** A plugin runs inside Figma and reads the document directly, so
  it sees variables that `GET /v1/files/:key/variables/local` refuses (Path 3).
- **No rate limit.** The ~6-requests-per-month ceiling is a REST limit. Export as often
  as you like.

Any nested JSON works — DTCG (`$value`/`$type`), Tokens Studio's `{value, type}`, a plain
name→value map, or a raw REST variables dump. Names keep their group path and are matched
as described above.

```
node tooling/figma/figma-parity.mjs --from tokens-export.json [--scope contract]
node tooling/figma/figma-pull.mjs   --from tokens-export.json --slug <slug> --accent <hue>
```

Worked example, using this repo's own generated DTCG file as the export:
`node tooling/figma/figma-parity.mjs --from handoff/verdant/tokens.dtcg.json` →
**34 value-match / 30 name-only / 0 missing of 64**. That 34 is the ceiling: only 16
contract tokens are plain hex colours and 18 are plain px, and the other 30 (`clamp()`
ramps, `color-mix()`, shadows, font stacks, motion curves) can only ever match by name.
The `--scope contract` default matters there — `tokens.dtcg.json` ships a `contract` group
and a `neutral` group with identical leaf names, so without it every token is ambiguous.

Note what that run does and does not prove: it shows tokens survive the round-trip through
the exchange format. It is **not** a read of Figma's API, and the artifact says so in its
`note`.

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

**Names carry their group path, and the diff allows for it.** However a Figma file gets
seeded — Tokens Studio, a plugin export, hand-authored styles — the DTCG group path rides
along in the style name: `tokens.dtcg.json` nests `contract → fg-surface → color-fg`, so
the style lands as `contract/fg-surface/color-fg`. Comparing whole names would normalise
that to `contract-fg-surface-color-fg` and match nothing, scoring zero for a purely
clerical reason. So the diff tries the exact whole name first, then the **last path
segment** — and only when exactly one style claims that segment. Two styles ending
`/color-fg` (say a light and a dark collection) is a real ambiguity, reported as such
rather than silently resolved. Segment matches are counted separately as `leafMatched`,
so a run can never pass them off as exact.

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
file's colours — and, from an export, its scale — back the other way, as a **token pack**
— `system/tokens.<slug>.css`, the file the shell swaps in its one `<head>` line to re-skin
the whole site:

```
node tooling/figma/figma-pull.mjs --slug <slug> --accent <hue> --page Color
node tooling/figma/figma-pull.mjs --slug <slug> --accent <hue> --offline   # free re-run
node tooling/figma/figma-pull.mjs --slug <slug> --map tooling/figma/maps/<slug>.json
node tooling/figma/figma-pull.mjs --slug <slug> --from <export.json>       # + scale
```

It targets a pack and never the contract. The repo splits contract tokens (semantic,
brand-free, what components reference) from pack values (the brand layer); a Figma file
holds brand values, so a pack is where they belong — and it keeps the importer clear of
the drift check that polices `tokens.contract.css` / `tokens.neutral.css` as generated
from `tokens.source.json`.

**Mapped by role, not by name.** A design system's colour names share no vocabulary with
the contract's semantic names, so name matching would import nothing at all. Each contract
token instead claims a nominal rung of the neutral or accent ramp, takes the nearest rung
that ramp actually has — and every value emitted is a real value from the file.

**Rungs are read where a file numbers them, derived where it doesn't.** `<hue>/<step>`
(`gray/900`, `indigo/600`) is read as written. Otherwise colours are grouped by name
prefix, each group is ordered by OKLCH lightness, and rungs are numbered from that order:
`Blue/Light, Blue/Base, Blue/Dark` is a 3-rung ramp. Those numbers are the importer's and
the pack header names every one of them against the style it came from. Auto-detection
still requires 5 rungs, so a shorter ramp has to be named (`--accent marine`); used as it
is, it may leave contrast negotiation with nowhere to move or a state colour repeating its
rest colour, and the header states that rather than hiding it.

**Where inference can't read a design, `--map <file>` pins tokens explicitly** — a small
committed `tooling/figma/maps/<slug>.json` of contract token → Figma style name, for a
palette named `Primary` / `Surface` / `Text` that has no groups to order. An explicit entry
always beats inference and is never moved for contrast, so a pinned colour that fails a
pair ships reported as a failure; a style name the file doesn't publish stops the run.

**Contrast is then negotiated inside the file's own ramps.** A nominal rung is not
automatically accessible: a yellow accent at `/600` fails as text on white. Where a pair
fails, the token walks to the nearest rung *of the same ramp* where every pair it takes
part in passes, so the value stays one the designer actually chose rather than something
this repo invented. The accent's hover/active states are then re-derived as offsets from
wherever the accent landed, so a negotiated accent can't collide with its own hover. The
pairs and thresholds are `RULESET.wcagPairs` — the same list `derive()` is held to,
imported rather than restated.

**Scale is imported the same way — by order, not by name — from an export only.** Spacing
(8 slots), radius (3), the type ramp (8) and shadows (3) are read from a `--from` export's
dimension and shadow values, classified into a family by name keyword, and filled by rank:
spacing and radius smallest→largest, shadows subtlest→heaviest, the type ramp
**largest→smallest**. A family fills only if the design offers at least as many distinct
values as it has slots; short of that it imports *nothing* and stays on this repo's
defaults, because a half-imported ramp is neither the design's nor this repo's. Extra
values are dropped and listed, and a dimension matching no family keyword is reported as
unclassified rather than guessed. A type slot keeps the contract's `clamp()` shape with the
imported size as its max and the `vw` term verbatim: the responsive behaviour is this
repo's, the number is the design's. `--map` pins any contract token, not only a colour.

The styles fallback carries no scale at all — it names text and effect styles without
valuing them — so on that path every spacing, radius, type and shadow value is this repo's
default and the run says so. The variables endpoint returns numbers that import the same way
as an export's, but it is Enterprise-gated. Fonts never come across on any path: a Figma file
gives a font *name*, not a licensed file.

The pack's header comment records whose design work it is, the ramps mapped, every
negotiation made, any pair still failing, and — family by family — what the scale import
took, dropped, could not classify, and left on this repo's defaults. Every contract token
no role claims is auto-filled from contract defaults by `gen-pack-css.mjs` and reported as
auto-filled.

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
