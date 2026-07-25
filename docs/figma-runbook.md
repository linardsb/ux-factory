# Figma runbook

Only the steps a human has to do. Everything else — choosing which pages to buy, which ramp is
the brand, contrast negotiation, regenerating the pack — is done by the scripts.

Reasoning and gates: `system/figma-import.md`. Architecture: `CLAUDE.md`.

---

## Which of these repeats?

| | How often |
|---|---|
| **A. Import a design as a pack** | **once per design** — 3 steps |
| **B. Parity round-trip** (proof tokens survive a trip through Figma) | **once, ever** — 4 steps |

B is evidence, not plumbing. Once its artifact is committed you never repeat it.

---

## A · Import a design as a pack

**1. Point the tool at the file.** Either put the file key (from the Figma URL, the part after
`/design/`) in `portal/.env` as `FIGMA_FILE_KEY=…`, **or** export the tokens from Figma to JSON
and skip straight to using `--from` below.

**2. Run it.**

```bash
node tooling/figma/figma-pull.mjs --slug <company>
# from an export instead — no token, no rate limit:
node tooling/figma/figma-pull.mjs --slug <company> --from ~/Downloads/export.json
```

**3. Commit** `system/tokens.<company>.css`.

That's the whole job. The run picks the palette pages, works out which ramp is the greys and
which is the brand, maps them onto the contract, fixes any contrast failures by moving within the
design's own ramps, and prints a WCAG table. **Read that table** — anything still failing is a
fact about the design, and the pack ships saying so.

To use the pack: pass it to a company instance
(`build-instance.mjs … --pack tokens.<company>.css`). Putting it in the site's appearance dock is
a separate change (`dock.mjs` + `pack-boot.js` + new VR baselines).

---

## B · Parity round-trip (once)

**1. Import the tokens into Figma.** New file → **Variables** panel (`Shift+I`) → create a
collection → drag `handoff/verdant/tokens.dtcg.json` onto it.

*If drag-drop isn't offered on your account*, use the **Tokens Studio** plugin: enable "W3C DTCG"
format in its settings, then import the same file.

**2. Export it back out.** Right-click the collection → **Export to JSON**. Save it anywhere.

*If there's no native export*, Tokens Studio exports too — and it's the better option, because it
also sees variables Figma's API refuses outside Enterprise.

**3. Run it.**

```bash
node tooling/figma/figma-parity.mjs --from ~/Downloads/export.json --land
```

**4. Check the numbers, then commit the three files it names**, and `node tooling/drift-check.mjs`
should print ✓.

**If the numbers look wrong, don't commit** — `git checkout -- handoff/ && rm -f
handoff/verdant/figma-parity.json` puts it back, and nothing was lost. This artifact ships as
proof, so a bad run is worse than no run. A near-zero match usually means the styles never got
applied to nodes, or the names lost their group path.

Expect roughly **34 value-match / 30 name-only / 0 missing of 64**. 34 is the ceiling, not a
shortfall: only 16 contract tokens are plain hex and 18 plain px. The rest — `clamp()` ramps,
`color-mix()`, shadows, font stacks, motion curves — have no numeric equivalent in Figma and can
only match by name.

---

## If it asks you something

The scripts stop and ask rather than guess. There are only four questions they can ask:

**"N ramps could be the brand colour"** — the file has no single brand (a palette library has
20+). Pick from the list it prints: `--accent indigo`.

**"no page looks like a palette"** — it prints every page; name the right one: `--page Foundations`.

**"Figma returned no variables or styles"** — the design uses variables, which the API can't read
outside Enterprise. Export from Figma and use `--from` instead.

**"ambiguous: 2 Figma styles end in /color-fg"** — the same name exists in two groups. Add
`--scope <group>` to say which one counts.

---

## The one rule about the API

A Starter-plan file allows about **6 file reads per month**, counted against the file's plan, not
yours. Responses are cached automatically and reused rather than re-bought, so re-running is free;
add `--offline` to guarantee it spends nothing.

The cache is gitignored, so it only exists in the working copy that fetched it — don't delete that
copy while it still matters.

`--from` avoids all of this. When in doubt, export from Figma.

---

## What does not come across

Colours, and (via an export) spacing, radius and type. **Not components.** Figma's API returns a
description of a drawing — fills and coordinates — not a Button's hover state, focus ring or
markup. No plan changes that. Components stay this repo's own, token-only, wearing the imported
values.
