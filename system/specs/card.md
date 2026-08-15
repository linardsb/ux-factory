```json
{
  "component": "card",
  "status": "shipped",
  "class": "ds-card",
  "contract": null,
  "props": {
    "title": { "type": "string", "required": true, "description": "what the card groups — \"This week\", \"Moisture\" — read before the content it frames" },
    "body": { "type": "string", "required": false, "description": "one supporting sentence under the title; absent renders nothing" },
    "footnote": { "type": "string", "required": false, "description": "a quiet trailing line — a source, a timestamp, a count; absent renders nothing" }
  },
  "tokens": ["--color-bg", "--color-fg", "--color-fg-muted", "--color-border", "--radius-md", "--shadow-sm", "--spacing-md", "--spacing-sm", "--type-body", "--type-caption"],
  "states": ["default"],
  "children": ["metric-tile", "list-row", "sequence-step"],
  "example": { "title": "This week", "body": "Three readings crossed their threshold.", "footnote": "Updated an hour ago" }
}
```

## Usage

The container primitive: a titled frame around at most one composed component. Library-generic (`ds-`, cross-scenario). Use it where a metric, a row or a step needs stating context the component itself does not carry — a caption above a reading, a sentence explaining what a queue row means on this screen. Its `children` list is the three library display primitives, and the at-most-one-child rule is not a limitation being tolerated but the composition model's own grammar made visible: a card frames ONE thing; a screen that needs a card of five rows is a screen composing five cards or a different layout, and that call belongs to the composing surface. It deliberately does not accept another `card` — nesting frames is how container soup starts.

## States

- **default** — the only state: `--color-bg` fill inside a `--color-border` hairline, `--radius-md`, `--shadow-sm`. The fill is the PAGE ground rather than `--color-bg-surface`, deliberately: the three child primitives are all surface-tinted, so the card must sit one step lighter or its child disappears into it. `--shadow-sm` only — a resting container, never an overlay (that depth is modal-dialog's).

The card has no hover, focus or pressed variant because it is not a control; making a card tappable is a new component decision, not a state.

## Data binding

`contract: null` — presentational. No record binds here; the composing agent computes the three strings and, optionally, one child node from the scenario's data. All three props are plain display strings (head schema v1 prop types are string/number/boolean; string is the uniform display choice, the metric-tile argument).

| Prop | Element | When absent |
| --- | --- | --- |
| `title` | the card's caption line | required — an untitled frame is decoration, not information |
| `body` | one sentence under the title | renders nothing |
| `footnote` | the quiet last line, after the child | renders nothing |

The single child renders between body and footnote, through its own template, exactly as it would render alone — the card adds a frame, never behaviour.

## Accessibility

A `<section>` with no accessible name of its own — DOM order is title → body → child → footnote, so a screen reader hears the caption before the content it frames, mirroring the visual layout. The title is a styled paragraph rather than a heading, deliberately: a composition can place a card at any depth, and a hard-coded heading level would lie about the document outline more often than it helped; the composing page owns its heading structure. Text contrast: `--color-fg` and `--color-fg-muted` on `--color-bg` are both declared pairs (`system/derive.rules.mjs` `wcagPairs`, AA 4.5). Nothing here is colour-only, nothing truncates, and the card adds no interaction to trap.
