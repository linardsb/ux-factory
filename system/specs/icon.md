```json
{
  "component": "icon",
  "status": "shipped",
  "class": "ds-icon",
  "contract": null,
  "props": {
    "name": { "type": "string", "required": true, "description": "the Phosphor name, and it must be one system/icons.manifest.json carries — a name outside the committed subset renders as a visible refusal, never as a gap" },
    "size": { "type": "string", "required": true, "enum": ["md", "lg", "xl"], "description": "the glyph's box, named by the step of the SPACING scale it binds to — 16, 24 or 32px; there is no pixel prop" }
  },
  "tokens": ["--color-border", "--color-fg-muted", "--font-mono", "--radius-sm", "--spacing-lg", "--spacing-md", "--spacing-xl", "--spacing-xs", "--type-caption"],
  "states": ["default", "refused"],
  "children": [],
  "example": { "name": "check", "size": "lg" }
}
```

## Usage

The one glyph part. Library-generic (`ds-`, cross-scenario). Before it existed a composed screen could not draw a back arrow, a tick or a warning triangle at all: the four hand-written glyphs in `system/agentic-renderer.mjs`'s private `GLYPHS` map are Verdant's own chrome, reachable by no composition. This is the part that draws one drawing.

**The artwork comes from a generated subset, never a library.** `system/icons.mjs` is emitted by `agent-layer/gen-icons.mjs` from the names listed in `system/icons.manifest.json`, copied out of `@phosphor-icons/core` — which lives in `tooling/icons/`, a build-time tool directory no shipped page can reach. The alternative was a runtime icon library, which the vanilla-pages constraint forbids outright, or vendoring the package, which is 37 MB and 1,512 files per weight committed for six glyphs. What ships is a frozen map of the glyphs a real flow actually asked for. Adding one is a single command — `node agent-layer/gen-icons.mjs --add <phosphor-name>` — and no spec, CSS or template edit at all. CI drift-checks the manifest against the map, regenerating from the package rather than comparing name lists, so a package bump that silently moved a path is a red build rather than a changed drawing nobody saw.

`name` is Phosphor's own name, not a role word: the back arrow is `arrow-left`, the close cross is `x`, the row chevron is `caret-right`. Three of the six the first flow needed do not exist under the word a designer would reach for, so the manifest records the resolution and `--add` refuses an unknown name with its near misses rather than accepting it and emitting nothing.

`size` names **the step of the spacing scale** the box binds to — `md`, `lg`, `xl` for 16, 24 and 32px. One scale, one vocabulary: this is `stack.gap` and `stack.pad`'s argument, and it is why a composition never carries a pixel value. `sm` (8px) is deliberately absent — an 8px glyph is not readable at any density this system targets — and there is no numeric prop, because a glyph at 19px is asking for nothing anyone can hold to.

Both props are required, on `stack.direction`'s argument: a layout box that defaults its axis is a box whose composer never had to say what they meant. Absence cannot express a sensible default here the way it can for `gap` — an invisible icon is not a design, and a glyph with no name is not a part.

A name the committed subset does not carry **renders as its own literal source text**, in a bordered monospace box. That is `text.md`'s refused-link precedent applied to a name: a refused link there "renders as its own literal source text rather than as a link, visibly, so a refused link reads as a mistake rather than disappearing." The same reasoning holds harder for a glyph, because the failure mode it replaces is an empty box — and an empty box in a composed screen reads as a spacing decision somebody made on purpose.

## States

- **default** — the glyph, in three sizes: `md` at `--spacing-md`, `lg` at `--spacing-lg`, `xl` at `--spacing-xl`. The `<path>` carries `fill="currentColor"`, so a glyph takes the colour of whatever it sits in and wears every pack without a rule of its own. An icon part is not a control — no hover, no focus, no pressed.
- **refused** — a name outside the committed subset. It is **not a prop and not a variant**: it is what the template does when `Object.hasOwn(ICONS, name)` is false. The box grows to fit the literal name in `--font-mono` at `--type-caption`, hairlined in `--color-border` and muted in `--color-fg-muted`. No dashed frame: that is `ds-empty-state`'s vocabulary, and absence-by-design and a typo are different things that should not look alike.

## Data binding

`contract: null` — presentational. No record binds here; the composing agent names the glyph.

| Prop | Element | When absent |
| --- | --- | --- |
| `name` | the `d` looked up in `ICONS`, or the refusal's text | required — refused by `validateComposition` before any DOM |
| `size` | the `data-size` attribute the three box rules bind to | required — refused by the enum before any DOM |

Both refusals are `validateComposition`'s rather than this template's: a missing `name` throws `required prop of icon is missing`, a `size` outside the enum throws naming `[md | lg | xl]`, and both happen before a single element is created. The template is only ever reached with a size the CSS has a rule for — which is exactly why the **name** refusal has to live in the template instead. The validator knows the enum; it does not know the manifest, and pinning a 1,512-name enum into a spec head would make adding a glyph a spec change rather than a manifest line.

## Accessibility

The `<svg>` is `aria-hidden="true" focusable="false"`. The primitive is **decorative by construction**, on `status-chip`'s argument — its chip text is aria-hidden because the parent card or row already speaks the state in its own accessible name. A glyph that carries meaning is an `icon` beside a `text`, and there is deliberately no `label` prop: a decorative-vs-meaningful switch on a leaf is a decision the composition should make by what it puts next to the glyph, not one a prop can record in a place no reader sees. `focusable="false"` is not redundant with `aria-hidden` — legacy IE/Edge put SVG elements in the tab order regardless, and the file's own `GLYPHS` helper sets both for the same reason.

The **refusal is the exception, and it is announced**. It carries the literal name as real text in a plain `<span>` with no `aria-hidden`, so a screen reader reads out `not-an-icon` where a glyph should have been. A refusal should be loud in every channel it can reach, which is the same call `text.md` makes about a refused link.

Nothing here truncates, nothing is colour-only, and the part adds no interaction to trap. `flex: 0 0 auto` so a glyph inside a flex row keeps its box rather than being squeezed into an ellipse. Contrast: the glyph is `currentColor` and so inherits whatever pair its container already declared; the refusal's `--color-fg-muted` on `--color-bg` is a declared AA pair (`system/derive.rules.mjs` `wcagPairs`, 4.5).
