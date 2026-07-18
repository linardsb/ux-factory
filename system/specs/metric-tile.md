```json
{
  "component": "metric-tile",
  "status": "shipped",
  "class": "ds-metric-tile",
  "contract": null,
  "props": {
    "label": { "type": "string", "required": true, "description": "what the metric measures, e.g. \"Overdue\", \"Unassigned\" — must read the state without the tone" },
    "value": { "type": "string", "required": true, "description": "the computed reading as a display string, e.g. \"4\", \"5 unassigned\", \"94%\" — the tile renders it as-is, no rounding" },
    "unit":  { "type": "string", "required": false, "description": "optional display unit set beside the value, e.g. \"%\", \"jobs\", \"min\"" },
    "tone":  { "type": "string", "required": false, "enum": ["neutral", "warn", "critical"], "description": "optional emphasis — redundant weight, never the sole signal (the label + value must already read the state)" }
  },
  "tokens": ["--color-bg-surface", "--color-fg", "--color-fg-muted", "--color-border", "--radius-md", "--spacing-sm", "--spacing-md", "--type-h3", "--type-caption", "--color-accent", "--color-accent-fg"],
  "states": ["neutral", "warn", "critical"],
  "children": []
}
```

## Usage

A single computed metric: a label, a value, an optional unit, and an optional emphasis tone. Library-generic — the one primitive both demo scenarios reuse (the `ds-` prefix marks a cross-scenario library component, distinct from `vd-`/`fw-`). Use it anywhere a dashboard needs a KPI or reading: a horizontal summary strip above a board, a vertical column of readings beside it, the agentic slots in Fieldwork's dispatch canvas. Unlike stat-tile (Verdant, glyph-led, `kind` enum-locked to sensor readings), metric-tile carries no domain vocabulary — the composing agent computes the label and value from the scenario's own data, so one primitive expresses moisture, dispatch load, or anything else a metric can name. The tile displays; it does not judge — tone adds emphasis, never a threshold verdict the label does not already state.

## States

The three states are emphasis levels, not data variants — the metric reads the same at every tone:

- **neutral** — the base and default: `--color-bg-surface` fill, `--color-border` hairline, no emphasis. Use when the metric carries no urgency.
- **warn** — signal: `--color-accent` border and tint on `--color-bg-surface`. Advances without shouting (mirrors status-chip's `due`).
- **critical** — escalated: solid `--color-accent` fill, `--color-accent-fg` text. The only filled variant — reserved so it stays loud (mirrors status-chip's `overdue` fill-inversion).

Colour is never the sole signal: the label and value must carry the state on their own ("4 Overdue", not a bare "4"); tone only adds weight, border, or fill via the accent family — no separate hue.

## Data binding

`contract: null` — presentational. metric-tile binds no stored record; it renders computed values passed as props. The composing agent (or page) computes `label` / `value` / `unit` / `tone` from the scenario's data — e.g. from the Fieldwork dispatch fixtures it might compute `{ "label": "Overdue", "value": "4", "tone": "critical" }`. `value` is a string so any metric — a count (`"4"`), a phrase (`"5 unassigned"`), a percentage (`"94%"`) — passes through one prop uniformly (head schema v1 prop types are string/number/boolean; string is the uniform choice for a display reading). `unit`, when absent, renders nothing; `tone`, when absent, renders neutral.

## Accessibility

One paragraph whose text order is label → value → unit ("Overdue, 4" · "Load, 94 %") so screen readers hear the caption first; the CSS may reverse it visually. `tone` is redundant emphasis, not the signal — the label and value must be self-describing on their own, and tone only adds border/fill weight through the accent family, never hue-as-sole-signal. No role, no tabindex: the tile is read-only; making a metric tappable is a new component decision, not a tone. Value/label contrast pairs (`--color-fg`, `--color-fg-muted` on `--color-bg-surface`; `--color-accent-fg` on `--color-accent` for critical) meet AA at their sizes.
