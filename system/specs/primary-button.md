```json
{
  "component": "primary-button",
  "status": "shipped",
  "class": "vd-primary-button",
  "contract": null,
  "props": {
    "label":    { "type": "string",  "required": true,  "description": "the action, verb-first, sentence case — \"Log care\", never \"OK\"" },
    "disabled": { "type": "boolean", "required": false, "description": "true while the action has nothing to commit (no rows checked); defaults to false" }
  },
  "tokens": ["--color-accent", "--color-accent-hover", "--color-accent-active", "--color-accent-fg", "--color-bg-surface", "--color-fg-muted", "--radius-md", "--spacing-md", "--type-body"],
  "states": ["default", "hover", "pressed", "disabled"],
  "children": []
}
```

## Usage

Component of the Verdant demo scenario (fictional product). The screen's one committing action: full-width accent fill at the bottom of the content — on the today screen, "Log care" commits the checked care-task-rows. One per screen, always last in reading order; anything less than the screen's primary action is not this component. Presentational: the composing screen owns what "commit" means and when `disabled` lifts.

## States

- **default** — `--color-accent` fill, `--color-accent-fg` label.
- **hover** — pointer contexts only: fill moves to `--color-accent-hover`; touch skips straight to pressed.
- **pressed** — active touch: fill deepens to `--color-accent-active`; no scale transforms (same rule as plant-card).
- **disabled** — `disabled: true`: `--color-bg-surface` fill, `--color-fg-muted` label, not focusable. The button stays in place — the layout never reflows around availability.

## Data binding

Presentational — `contract: null`. No API record binds here; the composing screen sets the props. Mapping:

| Prop | Element | When absent |
| --- | --- | --- |
| `label` | the button text (`--type-body`, `--color-accent-fg`) | required — never absent |
| `disabled` | disabled attribute + the disabled state | treated as false — button is live |

## Accessibility

A real `<button type="button">` — the label is its accessible name, no `aria-label` needed. Disabled uses the native `disabled` attribute (out of tab order, announced "dimmed"); the `--color-fg-muted` on `--color-bg-surface` pair keeps the label readable even so. Full-width target well past 44px; visible `:focus-visible` outline in `--color-accent` offset from the fill.
