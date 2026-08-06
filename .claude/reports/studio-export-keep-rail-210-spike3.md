# Spike 3 — export fidelity (#210, Task 1)

**Verdict: FAITHFUL.** The rail ships the plan's *faithful* copy branch.

**Method.** The plan's checklist asks for a fresh browser profile, a cold `file://` open and an eyeballed
Network panel. Driven instead, out of `tooling/visual-regression/node_modules` (the pixel gate's own
Playwright build, never a repo dep), because every one of those three is stronger when it is machine-read:
`browser.newContext()` **is** a fresh profile, and a `page.on("request")` listener attached **before**
`goto` cannot miss a request the way a human reading a panel after the fact can. Run on **chromium,
firefox and webkit**, over **all four dock-selectable packs** plus a derived one.

The assembly under test is exactly the four sources the shipped exporter uses — the three stylesheets
fetched as text, the live inline pack props off `[data-build-stage]`, `renderComposition`'s own output
serialized, and the `data-col`/`data-row` pair off each wrapper — so this spike tested the real thing
rather than a sketch of it.

Driver: `spike3.mjs` (scratchpad, not committed — it is the *question*, and `tooling/studio-journey.mjs`'s
#210 half is the committed *answer*). Artifacts: 26 exported documents and their screenshots.

---

## The six checks, answered

### 1 · Cold `file://` open in a fresh profile — and the serializer settled

**Renders, on all three engines and all four packs.** 4 cells, 86–104 px, zero page errors and zero
console errors on every one of the 24 combinations.

**The serializer is decided: `XMLSerializer().serializeToString(node)`.** Both forms were produced in the
page and diffed in Node. They differ by **exactly one attribute** — an `xmlns="http://www.w3.org/1999/xhtml"`
on the serialized root — and by nothing else:

```
XML:   <div xmlns="http://www.w3.org/1999/xhtml" class="ds-metric-tile" data-inspect="…"><p>…</p></div>
CLONE: <div class="ds-metric-tile" data-inspect="…"><p>…</p></div>
```

No self-closed void tags appeared (the composed components carry none). Both documents were opened cold
and compared: identical cell count, identical painted height, identical computed background, accent and
`--font-body`, on all three engines. The attribute is inert in a document parsed as `text/html`, which is
now measured rather than deduced.

The `cloneNode`-into-a-container fallback is also **unavailable**: reading that container costs
`.innerHTML`, which `tooling/build-checks.mjs:954-956` bans by plain substring over the whole file. So the
serializer choice was over-determined — but it is recorded here as *verified equivalent*, not as *forced*.

### 2 · Zero network requests — and **the check caught a real bug in the plan's strip**

**Zero, on every combination.** With the exporter's strip in place, the only request a cold `file://`
open makes is the document itself.

The finding that matters is what the *plan's own* strip does. The plan specified
`css.replace(/@import[^;]*;/g, "")`. Run over the real committed `system/tokens.saulera.css`, that regex
**deletes the entire saulera pack**:

| | rules in sheet | `--color-amber` | `--color-accent` | `--font-body` |
|---|---|---|---|---|
| raw concat (no strip) | 449 | `#F59E0B` | `#F59E0B` | `"Montserrat Ace", …` |
| **plan's regex strip** | **447** | **`""`** | **`#2563eb`** (the contract's) | **the neutral stack** |

Why: `tokens.saulera.css:17` is a header **comment** that contains the word `@import` in prose
("`@import must precede all rules.`"). The regex matches *that* one first and consumes to the next `;` —
which is on `:19`, three lines later — taking the comment's closing `*/` with it. The comment then stays
open and swallows `:root {`, so saulera contributes nothing and the export renders in the contract's
fallback colours under a pack the dock offers to every reader. Silently: no error, no warning, a
plausible-looking file.

**The exporter therefore carries a comment-aware scanner**, and `build-checks` group 17 asserts *both*
directions on the real committed files — no `@import` at-rule survives, **and** a known saulera
declaration does.

One secondary observation, recorded so nobody later concludes the strip is decorative: the *unstripped*
assembly also made no request, because an `@import` sitting mid-concatenation is an invalid at-rule and is
ignored. That is an accident of the join order, not a guarantee — and the **live studio page under
saulera really does request `/fonts/fonts.css` and really does get a failure** (measured:
`requestfailed http://127.0.0.1:4757/fonts/fonts.css`). The strip closes a live gap; it does not tidy a
theoretical one.

### 3 · An imported / derived pack, not only neutral

**The export wears the visitor's colours.** *Derive a palette* on `#b5179e` writes 20-odd custom
properties as an **inline style on `[data-build-stage]`** — not on `:root`, exactly as memory
`derived-pack-inline-vs-stylesheet` records — and the exported file opened cold computes
`--color-accent: #b5179e`. An exporter that inlined only the stylesheet would be faithful under neutral
and wrong under everything a visitor brings.

### 4 · The four shipped packs via the dock, and saulera's type side by side

| pack | export's `--color-accent` | export's `html` background | export's `--font-body` |
|---|---|---|---|
| neutral | `#2563eb` | `rgb(255,255,255)` | `ui-sans-serif, system-ui, …` |
| **saulera** | `#F59E0B` | `rgb(234,230,222)` | `"Montserrat Ace", …` |
| verdant | `#2f7a4d` | `rgb(255,255,255)` | `ui-sans-serif, system-ui, …` |
| plusui | `#4f46e5` | `rgb(255,255,255)` | `ui-sans-serif, system-ui, …` |

Identical on chromium, firefox and webkit.

**The saulera type comparison was run rather than deduced, and the deduction held.** The studio page and
the export were screenshotted side by side and both computed the same families —
`--font-body: "Montserrat Ace", -apple-system, …`, `--font-display: Homizio, …` — because those
declarations live in the pack's **token values**, which travel, while the `@import` only ever pointed at
`@font-face` rules in a file (`system/fonts/`) that **does not exist on the live site either**. So both
the studio and the export fall back to the *same* next entry in the stack. Nothing was lost in the export
that the site itself has.

That measurement changes the provenance sentence the plan drafted. The honest sentence is not "a
self-hosted face did not travel" — it is that the pack's declared families travel intact, and the
self-hosted face the pack references is absent from the running site too, so the exported file's type is
the type the studio shows.

### 5 · No `history.replaceState`, no `fetch`, no module `import` in the emitted file

**None** — by construction (the exporter emits no `<script>` at all), and confirmed by zero page errors
and zero console errors across all 24 cold opens. All three throw or fail on `file://`.

### 6 · The arrangement survives

**Yes.** A block moved from `1,1` to `2,3` through the canvas's own `ui.move` seam exports as `"2,3"` and
renders at a distinct cell origin (`324,118` against the row-1 cells' `324,0` / `648,0` / `972,0`),
identically on all three engines. The naive `grid-auto-flow` of the plan's snippet does *not* carry it —
explicit `grid-column` / `grid-row` line placement does, which is Task 4's layout block.

---

## What the rail's copy therefore says

The **faithful** branch, verbatim from the plan:

> A single file that runs. Open it anywhere — no server, no build step, nothing to install. It carries
> this system's tokens and components inline, wearing your design values.

And the provenance block inside the exported document carries the measured font sentence from check 4
rather than the drafted one — the pack's families travel, and the face file the pack references is
missing from the running site too, so the export's type is the studio's type.

## What this spike changed in the plan

1. **The `@import` strip is comment-aware**, not `/@import[^;]*;/g`. The plan's regex silently destroys
   one of the four shipped packs.
2. **Group 17's zero-request case asserts both directions** on the real committed CSS — no surviving
   `@import` at-rule, and saulera's own declarations still present. The second half is what would have
   caught (1), and neither half needs a mutation to be able to fail.
3. **The provenance font sentence is rewritten** to the gap that actually exists rather than the deduced
   one, which is what check 4 existed to establish.
