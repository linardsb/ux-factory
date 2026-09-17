```json
{
  "component": "avatar",
  "status": "shipped",
  "class": "ds-avatar",
  "contract": null,
  "props": {
    "name": { "type": "string", "required": true, "description": "whose avatar this is — \"Nora Osei\" — the disc's accessible name, never rendered as text" },
    "initials": { "type": "string", "required": false, "description": "the one-to-three characters shown in the disc; absent falls back to the first character of name (the plant-card monogram precedent)" },
    "size": { "type": "string", "required": false, "enum": ["sm", "md", "lg"], "description": "disc diameter step; absent means md" }
  },
  "tokens": ["--color-accent", "--color-accent-wash", "--color-border", "--type-caption", "--type-body", "--type-h3"],
  "states": ["default"],
  "children": [],
  "example": { "name": "Nora Osei", "initials": "NO" }
}
```

## Usage

A PORT, and the spec says so first: this is Shopify Polaris's Avatar (public token/component
system, `@shopify/polaris`, ported at its v7-era shape) projected onto THIS system's token
contract — Polaris's design decision (an initials disc naming a person where a photo would be
noise), this repo's tokens. Library-generic (`ds-`, cross-scenario, the metric-tile precedent),
non-interactive like stat-tile: a disc of initials standing in for a person wherever a row or
card names one. Never a tap target — if the person opens something, the PARENT is the control
and the avatar is decoration inside it.

What the port deliberately drops (projection, not reproduction): Polaris cycles avatar
backgrounds through its own six-colour palette keyed off the customer name. The contract has no
"avatar palette" concept and a colour literal in `components.css` is a red build, so every disc
here wears the accent wash — one fewer concept, stated rather than smuggled in.

## States

- **default** — the only state. `--color-accent-wash` disc inside a `--color-border` hairline,
  initials in `--color-accent` at weight 600. Sizes step the type token, not an ad-hoc scale:
  `sm` at `--type-caption`, `md` at `--type-body`, `lg` at `--type-h3`. Non-interactive, so no
  hover/focus/active grammar exists to port.

## Data binding

`contract: null` — presentational. The composing agent passes `name` (and optionally
`initials`) from the scenario's data; the component never invents a person. The initials render
verbatim — casing, diacritics and all — because normalising a name is a judgement this
component refuses to make.

| Prop | Element | When absent |
| --- | --- | --- |
| `name` | the disc's `aria-label` | required — an unnamed avatar is decoration pretending to be information |
| `initials` | the visible text inside the disc | first character of `name` |
| `size` | an `is-sm` / `is-lg` class on the disc | `md`, no class |

## Accessibility

The disc is `role="img"` with `aria-label` = `name`, and the initials inside are
`aria-hidden` — a screen reader hears the person, never the abbreviation ("NO" read aloud is
not a name). `--color-accent` on `--color-accent-wash` is the same figure/ground pairing the
ghost-button hover state uses; the initials also never carry information colour alone would —
they are a monogram, and the full name is in the accessible name. Non-interactive, so no focus
or hit-area obligations.
