```json
{
  "component": "text-field",
  "status": "shipped",
  "class": "ds-text-field",
  "contract": null,
  "props": {
    "label": { "type": "string", "required": true, "description": "what the field asks for — \"Email\" — always visible, never replaced by the placeholder" },
    "value": { "type": "string", "required": false, "description": "the field's starting text; absent renders empty" },
    "placeholder": { "type": "string", "required": false, "description": "a format example shown while empty — \"you@example.com\" — never instructions the reader must remember" },
    "hint": { "type": "string", "required": false, "description": "one persistent line under the input; absent renders nothing" },
    "disabled": { "type": "boolean", "required": false, "description": "native disabled; absent means enabled" }
  },
  "tokens": ["--color-accent", "--color-bg", "--color-bg-surface", "--color-border", "--color-fg", "--color-fg-muted", "--radius-sm", "--spacing-md", "--spacing-sm", "--spacing-xs", "--type-body", "--type-caption"],
  "states": ["default", "focus", "disabled"],
  "children": [],
  "example": { "label": "Email", "placeholder": "you@example.com", "hint": "Work address preferred." }
}
```

## Usage

The library's first real input: a labelled single-line text control. Library-generic (`ds-`, cross-scenario). Use it wherever a composed screen depicts text entry — a settings screen's name field, a form step in an onboarding sequence. It is a REAL `<input>`, not a picture of one (the primary-button precedent: templates render working native elements), so focus, typing and selection all behave natively in the playground and in any composed screen. What it deliberately is not: a form system. No validation states, no error rendering, no submission — a value change is not an intent in this vocabulary today, so the field emits nothing onto the bus; the consuming product owns what entered text means.

## States

- **default** — `--color-bg` fill inside a `--color-border` hairline at `--radius-sm`; label above in `--color-fg` weight 600 at `--type-caption`; placeholder in `--color-fg-muted`.
- **focus** — a 2px `--color-accent` outline, offset outside the box. An outline rather than a border swap or box-shadow, deliberately: it survives forced-colors mode and never shifts layout.
- **disabled** — the input drops to `--color-bg-surface` fill with `--color-fg-muted` text and `cursor: not-allowed`; the label keeps its weight so the field stays identifiable.

Error and validation states are deliberately absent — no `--color-danger` exists in the contract, and inventing one is a system-level call this component does not get to make (the metric-tile precedent: emphasis without a new hue). A consuming product layers validation; the specimen stays honest about what the system ships.

## Data binding

`contract: null` — presentational. No record binds here; the composing agent passes display strings. `value` seeds the input's starting text and the reader can edit it freely — the component never reports the edit anywhere (see Usage; a value change is not an intent in this vocabulary).

| Prop | Element | When absent |
| --- | --- | --- |
| `label` | the visible caption inside the wrapping `<label>` | required — an unlabelled input fails the reader before it fails a checker |
| `value` | the input's `value` attribute | renders empty |
| `placeholder` | the input's `placeholder` attribute | renders none |
| `hint` | the persistent line under the input | renders nothing |
| `disabled` | the native `disabled` attribute | absent means enabled |

## Accessibility

The control is nested inside its own `<label>` — implicit association, structural and collision-free, and the reason no template mints `id` attributes (nothing to collide when a composition renders two of these). The label is always visible: a placeholder-as-label disappears on first keystroke, which is the classic failure this shape exists to avoid. The hint sits inside the label element, so its text joins the field's accessible name — a deliberate trade: with no ids there is no `aria-describedby`, and a hint read as part of the name reaches assistive tech on the same terms as sighted readers; a consuming product that needs name/description separation mints its ids at the form layer. Contrast: `--color-fg` on `--color-bg` and `--color-fg-muted` on both grounds are declared pairs (`system/derive.rules.mjs` `wcagPairs`, AA 4.5). The input clears 44px min-height.
