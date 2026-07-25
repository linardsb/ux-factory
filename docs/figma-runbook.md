# Figma runbook

Only the steps a human has to do. Everything else — choosing which pages to buy, which ramp is the
brand, contrast negotiation, regenerating the pack — is done by the scripts.

Reasoning and gates: `system/figma-import.md`. Architecture: `CLAUDE.md`.

---

## The job — import a design as a pack

Once per design. Two steps.

**1. Export the palette from Figma**, then run:

```bash
node tooling/figma/figma-pull.mjs --slug <company> --from ~/Downloads/export.json
```

In Figma: **Variables** panel (`Shift+I`) → right-click the collection → **Export to JSON**. No
native export on your account? The **Tokens Studio** plugin exports the same thing, and it sees
variables the API can't.

**2. Read the last line, then commit `system/tokens.<company>.css`.**

```
figma pull      ✓  acme — 64 tokens → system/tokens.acme.css
```

`✓` means every WCAG pair passes — commit it. `⚠` names the pairs that still fail; that is a fact
about the design, and the pack ships saying so. Commit it anyway, or pick a different accent ramp
and re-run.

To use the pack: `build-instance.mjs … --pack tokens.<company>.css`. Putting it in the site's
appearance dock is a separate change (`dock.mjs` + `pack-boot.js` + new VR baselines).

### Two lines worth reading in the output

```
accent: "indigo" — picked alphabetically, NOT because it is the brand. Also in this file: teal.
negotiated: color-accent teal/600 (#0d9488) → teal/700 (#0f766e) for contrast
```

The first says it guessed. If the brand is the other one, re-run with `--accent teal`. The second
says a colour moved to pass contrast — it moved within the design's own ramp, so the value is still
one the designer chose.

---

Everything below is reference. You do not need it for the job above.

## Reading from the API instead of an export

`--from` needs no token, no quota and no Enterprise plan, so it is the better path. If you would
rather point at a live file, put `FIGMA_TOKEN` and `FIGMA_FILE_KEY` (the part of the Figma URL
after `/design/`) in `portal/.env` and drop the `--from` flag.

Then the budget matters: a Starter-plan file allows about **6 file reads per month**, counted
against the file's plan, not yours. Responses are cached and reused rather than re-bought, so
re-running is free; `--offline` guarantees it spends nothing. The cache is gitignored, so it only
exists in the working copy that fetched it — don't delete that copy while it still matters.

## If it stops and asks

The scripts refuse rather than guess. Three things they can stop on:

**"none of the N styles read are named `<hue>/<step>`"** — it read the wrong page, or the file
doesn't use ramps at all. Name the palette page: `--page Foundations`.

**"Figma returned no variables or styles"** — the design uses variables, which the API can't read
outside Enterprise. Export from Figma and use `--from`.

**"ambiguous: 2 Figma styles end in /color-fg"** (parity only) — the same name exists in two
groups. Add `--scope <group>`.

## What a design needs, and what actually comes across

**It has to name colours as `<hue>/<step>` ramps** — `gray/900`, `indigo/600`, `brand/500`. That
convention is near-universal in design systems, but it isn't guaranteed: a palette named `Primary`,
`Brand Blue` or `Surface/Default` has no rungs to map roles onto, and the run refuses rather than
guessing. A role ramp also needs at least 5 rungs, so the contrast negotiation has somewhere to
move.

**Colours are the only thing imported.** 16 contract tokens are mapped from the design. The other
48 — spacing, radius, the type ramp, shadows, motion, and the `color-mix()` inverse tokens — are
filled from this repo's contract defaults, and every run reports them as auto-filled. So an
imported pack carries the design's *colour*, on this repo's *scale*. Don't claim otherwise.

**Components never come across.** Figma's API returns a description of a drawing — fills and
coordinates — not a Button's hover state, focus ring or markup. No plan changes that. Components
stay this repo's own, token-only, wearing the imported colours.

## Parity round-trip — once, ever

Proof that tokens survive a trip through Figma. It is evidence, not plumbing: once its artifact is
committed you never repeat it — but **it has not been run yet**. `handoff/verdant/figma-parity.json`
does not exist, so this is still outstanding, and it is the only part of this doc that is.

1. New Figma file → **Variables** (`Shift+I`) → create a collection → drag
   `handoff/verdant/tokens.dtcg.json` onto it. (No drag-drop? Tokens Studio plugin, with "W3C DTCG"
   enabled in its settings.)
2. Right-click the collection → **Export to JSON**.
3. `node tooling/figma/figma-parity.mjs --from ~/Downloads/export.json --land`
4. Check the numbers, then commit the three files it names. (No gate watches this artifact —
   `drift-check` does not read it — so the numbers below are the only check there is.)

Expect roughly **34 value-match / 30 name-only / 0 missing of 64**. 34 is the ceiling, not a
shortfall: only 16 contract tokens are plain hex and 18 plain px. The rest — `clamp()` ramps,
`color-mix()`, shadows, font stacks, motion curves — have no numeric equivalent in Figma and can
only match by name.

**If the numbers look wrong, don't commit** — `git checkout -- handoff/ && rm -f
handoff/verdant/figma-parity.json` puts it back, and nothing was lost. This artifact ships as
proof, so a bad run is worse than no run. A near-zero match usually means the styles never got
applied to nodes, or the names lost their group path.
