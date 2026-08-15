```json
{
  "component": "search-input",
  "status": "shipped",
  "class": "ds-search-input",
  "contract": null,
  "props": {
    "label": { "type": "string", "required": true, "description": "what is being searched — \"Search plants\" — a visible caption, same shape as text-field's" },
    "value": { "type": "string", "required": false, "description": "the query's starting text; absent renders empty" },
    "placeholder": { "type": "string", "required": false, "description": "a query example shown while empty; absent renders none" }
  },
  "tokens": ["--color-accent", "--color-bg", "--color-border", "--color-fg", "--color-fg-muted", "--radius-lg", "--spacing-md", "--spacing-sm", "--spacing-xs", "--type-body", "--type-caption"],
  "states": ["default", "focus"],
  "children": [],
  "example": { "label": "Search plants", "placeholder": "Name or species" }
}
```

## Usage

A labelled query field: text-field's compact, glyph-led sibling for finding rather than entering. Library-generic (`ds-`, cross-scenario). Use it at the head of anything listable — a queue, a feed, a catalog of records. The magnifier glyph is inline SVG in `currentColor` drawn by the template (the stat-tile glyph precedent) — no image asset, no literal colour, so it re-skins with the pack like everything else. The caption label stays visible, deliberately: convention hides a search field's label behind the glyph, but this library already argued (text-field's Usage) that a visible caption beats a vanishing one, and consistency inside the library outranks convention outside it. Like text-field it emits nothing onto the bus — a query is not an intent in this vocabulary today.

## States

- **default** — a pill-cornered box (`--radius-lg` — the status-chip pill precedent) on `--color-bg` inside a `--color-border` hairline; the glyph in `--color-fg-muted` leads, the input follows.
- **focus** — a 2px `--color-accent` outline on the whole box via `:focus-within`: the box is the perceived control, so the box takes the ring; the input's own outline is suppressed only because the box carries it.

No disabled state, deliberately: a search field with nothing searchable is an empty-state's job, not a greyed control's.

## Data binding

`contract: null` — presentational. The composing agent passes display strings; the reader can type freely and the component reports nothing (see Usage). What a submitted query does — filter, navigate, fetch — belongs to the consuming product.

| Prop | Element | When absent |
| --- | --- | --- |
| `label` | the visible caption inside the wrapping `<label>` | required — the glyph alone is not a name |
| `value` | the input's `value` attribute | renders empty |
| `placeholder` | the input's `placeholder` attribute | renders none |

## Accessibility

A real `<input type="search">` nested in its own `<label>` — implicit association, no ids minted (text-field's argument, inherited whole). The glyph is `aria-hidden`: it decorates a field the label already names. The visible label is the accessible name; the placeholder is never the only prompt. Contrast: `--color-fg` on `--color-bg` and the muted glyph/placeholder pair are declared pairs (`system/derive.rules.mjs` `wcagPairs`, AA 4.5). The box clears 44px min-height. `type="search"`'s native clear affordance (where an engine draws one) is kept — suppressing a platform control the reader already knows would be styling winning over use.
