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
# a design whose names inference can't read — pin the roles by hand:
node tooling/figma/figma-pull.mjs --slug <company> --map tooling/figma/maps/<company>.json
```

**3. Commit** `system/tokens.<company>.css`.

That's the whole job. The run picks the palette pages, works out which ramp is the greys and
which is the brand, maps them onto the contract, brings across the design's spacing, radius, type
ramp and shadows where the export carries them, fixes any contrast failures by moving within the
design's own ramps, and prints a WCAG table. **Read that table** — anything still failing is a
fact about the design, and the pack ships saying so. **Read the pack header too**: it names every
family that came from the design and every one that fell back to this repo's defaults.

To use the pack: pass it to a company instance
(`build-instance.mjs … --pack tokens.<company>.css`). Putting it in the site's appearance dock is
a separate change (a row in `dock.mjs`'s `PACKS` + its `PACK_RE`, the allowlist in `pack-boot.js`,
and `COMMITTED` in `pack-derived.mjs` — all three, or the pack is selectable but not restorable).
`plusui` is the worked example.

`--out <path.css>` writes somewhere other than `system/`, which is how the committed fixtures under
`tooling/figma/fixtures/` are exercised without adding a pack to the shipped system.

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

**4. Check the numbers, then commit the three files it names.** No gate watches this artifact —
`drift-check` does not read it — so your reading of the numbers is the only check there is.

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
20+). Pick from the list it prints: `--accent indigo`.

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
the run won't guess one. A map can pin **any** contract token, not only a colour —
`{"spacing-md": "Spacing/4", "shadow-lg": "Elevation/High"}` fills those two slots even where their
family is too short to import on its own.

**Scale comes across too — but only from `--from`, and only all-or-nothing.** Spacing (8 slots),
radius (3), the type ramp (8) and shadows (3) are read from a plugin export's dimension and shadow
values, sorted, and filled **by rank**: spacing and radius smallest→largest, shadows
subtlest→heaviest (blur + spread), the type ramp **largest→smallest** (its first slot is a display
size). A family fills only if the design offers at least as many distinct values as the family has
slots — 7 spacing values for 8 slots imports *nothing* and the family stays on this repo's
defaults, because a half-imported ramp is neither the design's nor this repo's and no reader could
tell which slot was which. Extra values are dropped and listed. A dimension whose name matches no
family keyword (`spacing|space|gap|inset|padding|margin`, `radius|corner|round`,
`shadow|elevation|depth`, `text|font|type|typography|heading|body`) is reported as unclassified
rather than guessed into a family. Every one of those facts is written into the pack header.

Two details worth knowing. A type slot keeps the **contract's `clamp()` shape** with the imported
size as its max, the `vw` term copied verbatim and the min scaled by the same ratio: the responsive
*behaviour* stays this repo's, the *number* becomes the design's, and the header says exactly that.
And a multi-layer shadow imports its first layer only.

**The styles fallback brings no scale at all.** It names text and effect styles without ever
valuing them (only *fills* are harvested off the node walk) — so on that path every spacing,
radius, type and shadow token is this repo's default. The run says so on stdout; it does not fake
them. The variables endpoint *does* return numbers and they import exactly like an export's, but
it is Enterprise-gated, which is why this repo has never seen it answer. Export from Figma.

**Fonts and the rest never come across.** A Figma file gives a font *name*, not a file, and
shipping a face is a licence-bound step — so `font-display/body/mono` stay this repo's stack.
Motion, layout and the `color-mix()` inverse tokens are relative or this repo's own by design.
Everything not imported is filled from the contract defaults and named in the pack header as such.

**Components never come across.** Figma's API returns a description of a drawing — fills and
coordinates — not a Button's hover state, focus ring or markup. No plan changes that. Components
stay this repo's own, token-only, wearing the imported colours.
