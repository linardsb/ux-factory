# Figma runbook

The operator's guide to the Figma boundary: getting a design's tokens **into** the portfolio,
and proving the round-trip **back out**. Written to be followed without reading the code.

Reference docs, if you want the reasoning rather than the steps:
`system/figma-import.md` (the four paths and their gates) · `CLAUDE.md` (architecture map).

---

## Do I have to do this for every design?

**No — these are two different jobs, and only one repeats.**

| | How often | Effort |
|---|---|---|
| **A. Import a design as a pack** — a new brand skins the site | **once per design** | one command |
| **B. The parity round-trip** — proof tokens survive a trip out to Figma and back | **once, ever** | ~10 min, mostly in Figma |

Job B is *evidence*, not plumbing. It demonstrates the pipeline is real. Once it's done and the
artifact is committed, it's done — a new design doesn't need it again.

Job A is the one you'll repeat, and it's a single command per design.

---

## A · Import a design as a pack (per design)

### A1 — with a Figma file you can reach over the API

```bash
node tooling/figma/figma-pull.mjs --slug <company> --accent <hue> --page Color
```

- `--slug` names the output: `system/tokens.<slug>.css`
- `--accent` picks which colour ramp is the brand (`indigo`, `teal`, …). Omit it and the first
  non-neutral ramp is used; the run prints every ramp it found, so a wrong guess is cheap to fix.
- `--neutral <hue>` if the greys aren't called `gray` (`slate`, `zinc`, `stone` are common)
- `--page Color` buys only the page holding the palette. **Do not omit this on a large file** —
  it costs one request per page, and a UI kit can have 90+.

Re-run any number of times with `--offline` to try different ramps; that spends nothing.

### A2 — with a plugin export (no API, no limits)

```bash
node tooling/figma/figma-pull.mjs --slug <company> --accent <hue> --from ~/Downloads/export.json
```

Prefer this when the file isn't yours, the month's request budget is spent, or the design uses
**variables** (which the REST API refuses outside Enterprise, but a plugin reads fine).

### What you get

`system/tokens.<slug>.css` — a complete pack. Commit it. Its header records whose design work it
is, which ramps were mapped, every contrast adjustment, and any accessibility pair still failing.

The run prints a WCAG table. **Read it.** A nominal ramp rung isn't automatically accessible, so
the importer walks to the nearest rung of the *same ramp* that passes and tells you it did. If a
pair still fails after that, no rung in the ramp can satisfy it — that's a fact about the design,
not a bug, and the pack ships saying so.

### Using the pack

- **A company instance** (the normal case) — feed it to the instance build:
  `node ../ux-factory/agent-layer/build-instance.mjs <brief.md> --out <dir> --pack tokens.<slug>.css …`
- **The main site's appearance dock** — needs the pack added to `dock.mjs`'s list and
  `pack-boot.js`'s allowlist, plus regenerated VR baselines. Not automatic.

### What does NOT come across

Colours, and (via an export) spacing/radius/type. **Not components.** Figma's API returns a
description of a drawing — fills and coordinates — not a Button's hover state, focus ring, or
markup. No plan changes that. Components stay this repo's own, token-only, wearing the imported
values. That's the point of the architecture.

---

## B · The parity round-trip (once)

Proves the tokens survive a trip out to Figma and back. Needs no paid plan and no API.

**1. Locate the token file** — `handoff/verdant/tokens.dtcg.json`. Open Finder there.

**2. Import into Figma.** New file → **Variables** panel (`Shift+I` → Variables) → create a
collection → **drag `tokens.dtcg.json` onto it**.

You'll get variables under both `contract/…` and `neutral/…` — expected, the file ships both
groups. Colours and px values import cleanly; `clamp()`, `color-mix()` and font stacks arrive as
strings or not at all. Fine — those are the ones that can only match by name.

*If drag-drop isn't offered* (Figma rolled it out gradually, no published plan matrix), use the
**Tokens Studio** plugin: enable "W3C DTCG" format in settings, then import the same file.

**3. Export back out.** Right-click the collection → **Export to JSON**. Save anywhere, e.g.
`~/Downloads/figma-export.json`. If the native export isn't there, Tokens Studio exports too —
and it's the better option, since it also sees variables the API would refuse.

**4. Run the diff**, from the repo root:

```bash
node tooling/figma/figma-parity.mjs --from ~/Downloads/figma-export.json
```

Expect roughly **34 value-match / 30 name-only / 0 missing of 64**.

**34 is the ceiling, not a shortfall.** Only 16 contract tokens are plain hex colours and 18 are
plain px. The other 30 — `clamp()` type ramps, `color-mix()` inverse tokens, shadow strings, font
stacks, motion curves — have no numeric equivalent in Figma and can only ever match by name.

**5. Regenerate the pack — this is not automatic.** The run writes
`handoff/verdant/figma-parity.json`, but `pack.json` only notices when the pack is rebuilt:

```bash
node agent-layer/gen-handoff.mjs
node agent-layer/gen-pack-bundle.mjs
node tooling/drift-check.mjs        # must print ✓
```

`portability.figma.parity` flips from `null` to `"figma-parity.json"`.

**6. Commit** the artifact *and* the regenerated pack together, or CI's drift check goes red.

---

## Troubleshooting

**"ambiguous: 2 Figma styles end in /color-fg"** — a name exists in two groups. Add
`--scope contract` (or whatever your top-level group is called). The default is already
`contract`; you only need this if your naming differs.

**"none of the N styles read are named `<hue>/<step>`"** — `figma-pull` found no ramps. You read a
page that has no palette on it. Add `--page Color` (or whatever the foundations page is called).

**"Figma returned no variables or styles"** — the file's values are variables, not styles, and REST
can't see them on a non-Enterprise plan. Use the export route (A2 / B3).

**429, or "past this script's parse ceiling"** — you've hit the monthly budget or a page too big to
parse. Both are cached; re-run with `--offline`, and narrow with `--page` next time.

---

## The request budget — the one rule worth memorising

A Starter-plan file allows roughly **6 `GET /v1/files/:key` requests per month**, counted against
the *file's* plan, not yours. The scripts protect it: every response is banked to disk before it's
parsed (a crash can't cost a request), and a cached response is reused rather than re-bought.

So: **`--offline` first, always.** It re-parses everything already fetched for free. Spend a
request only to reach a page you haven't bought, and prefer `--page <name>` over an unbounded run.

The cache lives in `tooling/figma/.raw/` and `tooling/figma/.last-response.json`, both gitignored —
so it exists only in the working copy that fetched it. Don't delete that working copy while the
cache still matters.

`--from` sidesteps all of this. When in doubt, export from Figma and skip the API.
