```json
{
  "component": "list-row",
  "status": "shipped",
  "class": "ds-list-row",
  "contract": null,
  "props": {
    "label":  { "type": "string", "required": true,  "description": "the entity this row is about, e.g. a SKU name, a technician, an account — one line, truncates with an ellipsis" },
    "value":  { "type": "string", "required": true,  "description": "the row's primary computed figure as a display string, e.g. \"85\", \"−85\", \"94%\" — rendered as-is, no rounding" },
    "unit":   { "type": "string", "required": false, "description": "optional display unit beside the value, e.g. \"units\", \"jobs\"" },
    "meta":   { "type": "string", "required": false, "description": "one short secondary qualifier — a location, a second figure, a date; ≤ 6 words, never a sentence" },
    "status": { "type": "string", "required": false, "description": "optional short free text rendered as a pill, one or two words — cross-scenario, so NO enum: the employer's own vocabulary (\"OVERSOLD\", \"LOW\") is the point" },
    "tone":   { "type": "string", "required": false, "enum": ["neutral", "warn", "critical"], "description": "optional emphasis — redundant weight, never the sole signal (label + value + status must already read the state)" }
  },
  "tokens": ["--color-bg-surface", "--color-fg", "--color-fg-muted", "--color-border", "--color-accent", "--color-accent-fg", "--radius-md", "--radius-lg", "--spacing-xs", "--spacing-sm", "--spacing-md", "--type-body", "--type-caption", "--type-eyebrow"],
  "states": ["neutral", "warn", "critical"],
  "children": [],
  "example": { "label": "Ana Ruiz", "value": "7", "unit": "jobs", "meta": "North sector", "status": "OVERSOLD" }
}
```

## Usage

One named entity per row: what it is, one computed figure about it, an optional qualifier, and an optional short status. Library-generic — the second `ds-` primitive after metric-tile (the `ds-` prefix marks a cross-scenario library component, distinct from `vd-`/`fw-`). The pair splits the labour: **metric-tile reports one aggregate reading over a whole dataset** ("Oversold SKUs, 3"); **list-row reports one named entity** ("Pallet wrap, 23 micron — 85 units short"). Use list-row when the honest answer to a question is *which ones*, and metric-tile when it is *how many*.

The bound is a handful of rows that carry the answer, **not one row per record — this is not a table.** It has no columns, no header row, no sort and no pagination; if a reading needs those, it is the wrong primitive. Like metric-tile it carries no domain vocabulary: the composing agent computes every field from the scenario's own data, so one primitive expresses a SKU, a technician, or an account without knowing what any of them are. `status` is deliberately free text with no enum — the employer's own word for the state ("OVERSOLD", "LOW", "AT RISK") is the point, and an enum would re-scope the primitive to one scenario. The row displays; it does not judge — tone adds emphasis, never a verdict the label, value and status do not already state.

## States

The three states are emphasis levels, not data variants — the row reads the same at every tone:

- **neutral** — the base and default: `--color-bg-surface` fill, `--color-border` hairline, quiet pill. Use when the row carries no urgency.
- **warn** — signal: `--color-accent` border and tint on `--color-bg-surface`, value and pill in the accent. Advances without shouting (mirrors metric-tile's warn, and status-chip's `due`).
- **critical** — escalated: solid `--color-accent` fill, `--color-accent-fg` text throughout including the pill. The only filled variant — reserved so it stays loud (mirrors metric-tile's critical, and status-chip's `overdue` fill-inversion).

Colour is never the sole signal: the label, value and status must carry the state on their own ("Pallet wrap · 85 units · OVERSOLD", not a bare figure in red); tone only adds weight, border, or fill via the accent family — no separate hue.

## Data binding

`contract: null` — presentational, exactly like metric-tile. list-row binds no stored record; it renders computed values passed as props. The composing agent (or page) computes `label` / `value` / `unit` / `meta` / `status` / `tone` from the scenario's own data — e.g. from a stock fixture it might compute `{ "label": "Pallet wrap, 23 micron", "value": "85", "unit": "units short", "meta": "East · committed 145", "status": "OVERSOLD", "tone": "critical" }`. `value` is a string so a count (`"85"`), a delta (`"−85"`) and a percentage (`"94%"`) all pass through one prop uniformly (head schema v1 prop types are string/number/boolean; string is the uniform choice for a display reading). Each absent optional renders nothing at all — no empty element is emitted; `tone`, when absent or `"neutral"`, renders the base state.

## Accessibility

One paragraph per row whose text order is name → meta → value → unit → status ("Pallet wrap, 23 micron · East · committed 145 · 85 units short · OVERSOLD"), so the row is heard as one coherent sentence rather than a set of disconnected fragments; the CSS may place the reading and pill visually to the trailing edge without changing that order.

Non-interactive: **no role, no tabindex, no list semantics.** Rows are siblings inside a composed slot with no owning `<ul>`, so claiming `listitem` would be a false claim about a list that does not exist — the row states no relationship it cannot back. Making a row tappable is a new component decision, not a tone.

`tone` is redundant emphasis, not the signal. Contrast pairs meet AA at their sizes: `--color-fg` and `--color-fg-muted` on `--color-bg-surface` for the base and warn tint, and `--color-accent-fg` on `--color-accent` for critical — including the pill, which inverts to an `--color-accent-fg` hairline on the accent fill rather than keeping a muted foreground that would fail against it. A long `label` truncates with an ellipsis rather than reflowing the row; the full text stays in the accessibility tree.
