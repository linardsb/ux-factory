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

### A1 · In the portal (the normal way)

**1. Start the workbench.** `cd portal && npm start` → <http://localhost:4747>.

**2. Drop the export.** Click **Figma → pack**, drop the design's token export onto the drop zone
(or choose it with the file picker), type a pack slug, **Import**.

**3. Read the report, then commit.** The drawer shows what the run actually did: which ramps it
used, every mapped token and where each value came from, the full WCAG pair table, every contrast
negotiation, every token auto-filled from contract defaults **by name**, and the pack header
verbatim. **Read the WCAG table** — anything still failing is a fact about the design, and the
pack ships saying so.

Then commit `system/tokens.<slug>.css`. A new tracked file under `system/` changes the measured
line counts, so two regenerations belong in the *same* commit:

```bash
node agent-layer/gen-loc-summary.mjs
cd tooling/visual-regression && npm run update:docker   # approach.html renders those numbers
```

If the file carries more than one candidate brand ramp, the drawer says so and renders the
candidates as swatches — click one and it re-runs with that ramp as the accent, off the export
already on disk. The tool still never picks a brand colour for you; it just asks in a medium that
can answer.

**There is no URL or file-key field, deliberately.** Figma's variables REST endpoint is
Enterprise-only, `/styles` answers `[]` off Enterprise, the token is server-side, and the read
budget is ~6 file reads per month. An export is the only input that works on a normal design, so
the drawer offers only that. The API path stays available from the CLI below.

The dropped export is written to `tooling/figma/exports/<slug>.json` (gitignored) so the pack
header can name a real, reproducible source — re-dropping the same slug overwrites it.

### A2 · From the CLI

For `--map`, `--offline`, `--page`, or an API read.

**1. Point the tool at the file.** Either put the file key (from the Figma URL, the part after
`/design/`) in `portal/.env` as `FIGMA_FILE_KEY=…`, **or** export the tokens from Figma to JSON
and skip straight to using `--from` below.

**2. Run it.**

```bash
node tooling/figma/figma-pull.mjs --slug <company>
# from an export instead — no token, no rate limit:
node tooling/figma/figma-pull.mjs --slug <company> --from ~/Downloads/export.json
# a design whose names inference can't read — pin the roles by hand:
node tooling/figma/figma-pull.mjs --slug <company> --map tooling/figma/maps/<company>.json
```

**3. Commit** `system/tokens.<company>.css` (with the same two regenerations as above).

That's the whole job. The run picks the palette pages, works out which ramp is the greys and
which is the brand, maps them onto the contract, fixes any contrast failures by moving within the
design's own ramps, and prints a WCAG table.

`--map` stays a CLI job — the drawer exposes slug plus optional accent/neutral only.

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

The scripts stop and ask rather than guess. There are only five questions they can ask:

**"N ramps could be the brand colour"** — the file has no single brand (a palette library has
20+). In the portal the candidates arrive as swatches: click the brand ramp and it re-runs. From
the CLI, pick from the list it prints: `--accent indigo`.

**"no near-grey ramp for the neutral role"** / **"no non-grey, non-state ramp to use as the
accent"** — nothing in the file groups into a ramp of 5+ rungs. Name a shorter one it lists
(`--neutral ink --accent marine`), or pin the roles with `--map` (see below).

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

## What a design needs, and what actually comes across

**Its colours have to sit in groups.** `<hue>/<step>` ramps — `gray/900`, `indigo/600` — are read
as written. Anything else is derived: colours are grouped by name prefix (everything before the
last `/`, or the leading word), each group is ordered by OKLCH lightness, and the rungs are
numbered from that order. `Blue/Light, Blue/Base, Blue/Dark` becomes a 3-rung ramp. The numbers
are the importer's and both the run and the pack header say so; the colours are always the
designer's.

Derived ramps then compete for the roles on equal terms with numbered ones — a file that numbers
its palette but *also* groups five or more role-named greys (`Text/Primary`, `Text/Secondary`, …)
can have that group detected as the neutral, since detection picks the least-saturated candidate,
not the most conventionally named. The run prints which ramps it detected; if they aren't the ones
you meant, name them with `--neutral` / `--accent`.

**Auto-detection still wants 5 rungs**, so a 3-rung ramp won't be *found* on its own — the run
lists it and you name it: `--accent marine`. Once named, a short ramp is used as it is: contrast
negotiation has fewer places to move, a 1-rung brand colour gives hover and active the same value,
and every one of those is stated in the pack header rather than papered over.

**Where inference can't read the design, map it by hand.** A palette named `Primary`, `Surface`,
`Text` has no groups to order, so the run refuses. Write `tooling/figma/maps/<slug>.json` —
`{"color-accent": "Primary", "color-fg": "Text", …}` — and pass `--map`. An explicit entry always
beats inference, is pinned exactly (never moved for contrast, so its failures are reported as
failures), and a name the file doesn't publish stops the run instead of falling back to a default.
Map `color-accent-hover`/`-active` too if you map `color-accent`: a state colour is a decision, and
the run won't guess one.

**Colours are the only thing imported.** 16 contract tokens are mapped from the design. The other
48 — spacing, radius, the type ramp, shadows, motion, and the `color-mix()` inverse tokens —
are filled from this repo's contract defaults, and every run reports them as auto-filled. So an
imported pack carries the design's *colour*, on this repo's *scale*. Don't claim otherwise.

**Components never come across.** Figma's API returns a description of a drawing — fills and
coordinates — not a Button's hover state, focus ring or markup. No plan changes that. Components
stay this repo's own, token-only, wearing the imported colours.
