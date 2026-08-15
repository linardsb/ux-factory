```json
{
  "component": "select-field",
  "status": "shipped",
  "class": "ds-select-field",
  "contract": null,
  "props": {
    "label": { "type": "string", "required": true, "description": "what the field chooses — \"Plan\", \"Sensor\" — always visible above the control" },
    "value": { "type": "string", "required": true, "description": "the chosen option, shown in the closed control — the specimen depicts the CLOSED state, so this is the one option it carries" },
    "hint": { "type": "string", "required": false, "description": "one persistent line under the control; absent renders nothing" },
    "disabled": { "type": "boolean", "required": false, "description": "native disabled; absent means enabled" }
  },
  "tokens": ["--color-accent", "--color-bg", "--color-bg-surface", "--color-border", "--color-fg", "--color-fg-muted", "--radius-sm", "--spacing-md", "--spacing-sm", "--spacing-xl", "--spacing-xs", "--type-body", "--type-caption"],
  "states": ["default", "focus", "disabled"],
  "children": [],
  "example": { "label": "Sensor", "value": "Moisture probe A", "hint": "Readings arrive every hour." }
}
```

## Usage

A labelled choice field, depicted CLOSED — and that closed state is the design insight that keeps this component scalar. A `<select>`'s option list is the consuming product's data: which plans exist, which sensors are wired. The composition model deliberately does not carry product data (head schema v1 props are string/number/boolean scalars), so the specimen renders a real `<select>` holding exactly ONE `<option>` — the chosen `value` — which is everything the closed control ever shows. No delimited-list encoding, no schema change, no fake options invented to make a demo look fuller than the data. Library-generic (`ds-`, cross-scenario); use it wherever a composed screen depicts a made choice — a settings row, a filter's current state. Like the other fields it emits nothing onto the bus.

## States

- **default** — the text-field box (`--color-bg` fill, `--color-border` hairline, `--radius-sm`) with a CSS chevron in `--color-fg-muted` trailing — drawn from borders, no image asset, no literal colour.
- **focus** — the 2px `--color-accent` outline, offset outside (identical to text-field; one focus grammar across the field family).
- **disabled** — `--color-bg-surface` fill, `--color-fg-muted` text, `cursor: not-allowed`; the label keeps its weight.

## Data binding

`contract: null` — presentational. The composing agent passes the label and the chosen value from the scenario's data; the option LIST never travels through props, because the closed control never shows it (see Usage — this is the honest boundary, stated rather than worked around). Opening the specimen's dropdown shows the one option it truthfully has.

| Prop | Element | When absent |
| --- | --- | --- |
| `label` | the visible caption inside the wrapping `<label>` | required |
| `value` | the single `<option>`'s text, shown closed | required — a choice field with no choice shows nothing |
| `hint` | the persistent line under the control | renders nothing |
| `disabled` | the native `disabled` attribute | absent means enabled |

## Accessibility

A real `<select>` nested in its own `<label>` — implicit association, no ids (the field-family rule). Its accessible value is the option text itself, so assistive tech reads exactly what sighted readers see in the closed control. `appearance: none` removes the engine's arrow only because the CSS redraws one at declared contrast; the native popup, keyboard behaviour and value semantics are untouched. Contrast pairs as text-field's (`system/derive.rules.mjs` `wcagPairs`, AA 4.5); the control clears 44px min-height.
