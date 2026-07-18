```json
{
  "component": "status-chip",
  "status": "shipped",
  "class": "vd-status-chip",
  "contract": "status-chip.contract.json",
  "props": {
    "value": { "type": "string", "required": true, "enum": ["ok", "due", "overdue"], "description": "categorical care state — selects the visual variant" },
    "label": { "type": "string", "required": true, "description": "visible chip text, uppercase, one or two words — the state must read without colour" }
  },
  "tokens": ["--color-bg-surface", "--color-fg-muted", "--color-border", "--color-accent", "--color-accent-fg", "--radius-lg", "--spacing-xs", "--spacing-sm", "--type-eyebrow"],
  "states": ["ok", "due", "overdue"],
  "children": []
}
```

## Usage

Component of the Verdant demo scenario (fictional product). The one categorical state signal of the system: a small pill naming a plant's care state. Always a child — of a plant-card or a care-task-row, trailing edge — never free-standing, never a tap target. One chip per parent (the parent summarises one state); if two states compete, the parent's data is wrong, not the chip.

## States

The three states are the three data variants — the chip has no interaction states of its own:

- **ok** — quiet: `--color-fg-muted` text on `--color-bg-surface`, `--color-border` hairline. Recedes; the list should scan calm when nothing is due.
- **due** — signal: `--color-accent` text and border on `--color-bg-surface`. Advances without shouting.
- **overdue** — escalated: solid `--color-accent` fill, `--color-accent-fg` text. The only filled variant — reserved so it stays loud.

## Data binding

Renders one `Status` record (status-chip.contract.json). When composed inside plant-card or care-task-row, the parent derives the record from its own `status` field (value → canonical label, e.g. `"due"` → `"DUE"`). Mapping:

| Contract field | Element | When absent |
| --- | --- | --- |
| `value` | variant class on the pill (`ok` / `due` / `overdue`) | required — never absent |
| `label` | the pill text (`--type-eyebrow`, uppercase) | required — never absent |

Sample record (valid against the contract):

```json
{ "value": "overdue", "label": "3 DAYS OVERDUE" }
```

## Accessibility

Text in a `<span>` — no role, no tabindex (the chip is never interactive). When the parent already speaks the state in its accessible name (plant-card does), the chip is `aria-hidden` to avoid double announcement; free label text plus the variant means state never relies on colour alone. Minimum `--type-eyebrow` size with generous letter-spacing keeps the uppercase legible.
