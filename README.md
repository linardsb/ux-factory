# ux-factory

The UX application factory's **code repo** — the versioned source of truth for the design
system and the site template. Per-application content, the pipeline skill, and the knowledge
base stay in the jobs folder (`../Linards jobs folder/_factory/` and
`.claude/skills/ux-factory/`); this repo holds code only.

Extracted from `trainline/portfolio/system/` at Phase 0 (see the strategy doc §10).

## The mechanic — three layers

A page renders from three stylesheets, loaded in order:

1. **`system/tokens.contract.css`** — the semantic token *contract*. Every token the
   components reference, each with a neutral fallback. Brand-agnostic; never holds a brand.
2. **A client pack** — primitives bound to the contract slots. `system/tokens.neutral.css`
   is the no-brand default; a company build clones it to `tokens.<company>.css`.
3. **`system/components.css`** (+ `portfolio.css`, `proto.css`) — token-only components.
   No literals, no primitives. They render the same under any pack.

Re-skinning a whole site is **one line in each page's `<head>`**:
`tokens.neutral.css` → `tokens.<company>.css`. Nothing else moves.

The chrome (header, footer, mobile nav) is injected by `system/site.js` from a
`window.CLIENT_CONFIG` object — `system/client.neutral.config.js` is the neutral default;
a company build clones it to `client.<company>.config.js`.

## Layout

```
system/                    the design system (brand-agnostic core + example packs)
  tokens.contract.css      layer 1 — the contract (neutral fallbacks, no brand)
  tokens.neutral.css       layer 2 — the neutral pack (factory default)
  client.neutral.config.js       neutral chrome config
  components.css            layer 3 — token-only components
  portfolio.css / proto.css      surfaces
  site.js / portfolio.js         chrome + site behaviour
  tokens.css / tokens.saulera.css / client.config.js   real packs, kept as reference
assets/                    neutral logo marks
index.html / 404.html      the neutral site template (shell)
_headers                   security headers + noindex
```

The neutral base loads **only** `tokens.contract.css` + `tokens.neutral.css` +
`components.css` + `portfolio.css`. The reference packs (`tokens.css` = Trainline,
`tokens.saulera.css` = saulera, `client.config.js` = personal) ship as examples and are not
loaded by this shell.

## Run locally

```
npx serve .            # or: python3 -m http.server
```

## Deploy (Cloudflare Pages)

```
npx wrangler pages deploy . --project-name factory-ux --branch main
```

Live neutral base: https://factory-ux.pages.dev
