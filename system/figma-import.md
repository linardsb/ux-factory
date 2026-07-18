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
records Figma's exact error body as evidence and falls back to one `GET /v1/files/:key`,
resolving style values from node fills. Either branch writes
`handoff/verdant/figma-parity.json` labeled `"real run"` with the endpoint that answered.

**Rate budget warning:** since Nov 2025 Figma rate-limits by the *file's* plan — on a
Starter-plan file, `GET /v1/files/:key` allows roughly **6 requests per month**. The
script caches the raw response to `tooling/figma/.last-response.json` (gitignored);
re-parse without spending a request via `node tooling/figma/figma-parity.mjs --offline`.

## Current state of the committed artifact

The parity artifact is produced only by a real run against a real file — it is never
hand-written. Until that run lands, `pack.json` carries `portability.figma.parity: null`
("pending real run") and this pack contains no `figma-parity.json`. The gate facts above
come from Figma's published documentation, cited at plan time (2026-07-17); the run
itself will attach Figma's own words as evidence.
