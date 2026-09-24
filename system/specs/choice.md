```json
{
  "component": "choice",
  "status": "shipped",
  "class": "ds-choice",
  "contract": null,
  "props": {
    "kind": { "type": "string", "required": true, "enum": ["checkbox", "radio"], "description": "which control — a checkbox is picked on its own, a radio is one of a set; never defaulted" },
    "group": { "type": "string", "required": true, "description": "the set this control belongs to, written to the input's native name — radios sharing a group are one exclusive set, checkboxes sharing one stay independent; the scope is the whole document" },
    "label": { "type": "string", "required": true, "description": "what the control picks — \"Email me receipts\" — always visible beside it and read as its accessible name" },
    "hint": { "type": "string", "required": false, "description": "one persistent line under the label; absent renders nothing" },
    "checked": { "type": "boolean", "required": false, "description": "the starting state; absent means unchecked" },
    "disabled": { "type": "boolean", "required": false, "description": "native disabled; absent means enabled" }
  },
  "tokens": ["--color-accent", "--color-fg", "--color-fg-muted", "--spacing-sm", "--spacing-xs", "--type-body", "--type-caption"],
  "states": ["default", "checked", "focus", "disabled"],
  "children": [],
  "example": { "kind": "checkbox", "group": "receipts", "label": "Email me receipts", "hint": "One message per payment.", "checked": true }
}
```

## Usage

The one choice part: a checkbox or a radio, beside its own label. Library-generic (`ds-`, cross-scenario). Use it wherever a composed screen depicts picking — a consent line, a delivery option, one answer out of three. It is a REAL `<input>`, not a picture of one (the text-field precedent), so clicking, keyboard selection and the native checked state all behave as the engine does them.

**One part, two kinds.** Checkbox and radio share everything but one rule — whether picking this one un-picks its neighbours — so they are one component with `kind`, not two. That rule is the platform's own: `group` becomes the input's native `name`, and radios sharing a name are one exclusive set while checkboxes sharing a name never are. No script enforces it, so nothing can disagree with the engine about which radio is on. `kind` is required, on `stack.direction`'s argument: a control that defaults to a checkbox is a control whose composer never had to say which one they meant.

**`group` is required for both kinds.** The validator has no conditional rule, so it cannot demand a group from a radio and not from a checkbox — and a radio with no name is a loner the reader can switch on and never switch off. For a checkbox the group is simply the field's name, the thing a form would submit it under. A group is scoped to the **whole document**: two sets that happen to share a group string anywhere on one page are one set, so name them for what they choose ("delivery", "receipts"), never with a generic word. The site's own appearance dock already uses `pack`.

**A radio set is a composition**, not a part: a `stack` holding one `choice` per option, every one carrying the same `group`. The set's question ("How should we deliver it?") is a `text` part above the stack.

**Not a switch.** `toggle-switch` stays its own part: a toggle is an action — it flips a setting now and reports it on the bus — and a choice is a selection a form would submit later. Like the other fields, this part emits nothing onto the bus; the consuming product owns what a pick means.

## States

- **default** — the native control at the engine's own size, tinted `--color-accent` through `accent-color`, beside the label in `--color-fg` at `--type-body`; the hint under it in `--color-fg-muted` at `--type-caption`.
- **checked** — the engine's own tick or dot in `--color-accent`. The mark, not colour alone, states the pick.
- **focus** — the 2px `--color-accent` outline on the input, offset outside it: the text-field rule, which survives forced-colors mode and never shifts layout.
- **disabled** — the native `disabled` attribute; the label drops to `--color-fg-muted` and the row takes `cursor: not-allowed`. The control keeps its checked state, so a disabled pick still reads as picked.

## Data binding

`contract: null` — presentational. No record binds here; the composing agent passes the display strings and the starting state. A reader's click changes the native checked state and the component never reports it anywhere (see Usage).

| Prop | Element | When absent |
| --- | --- | --- |
| `kind` | the input's `type` | required — a choice that does not say which control it is |
| `group` | the input's `name` | required — a radio with no name cannot be un-picked |
| `label` | the visible text inside the wrapping `<label>` | required — an unlabelled control fails the reader before it fails a checker |
| `hint` | the persistent line under the label | renders nothing |
| `checked` | the native `checked` attribute | renders unchecked |
| `disabled` | the native `disabled` attribute | absent means enabled |

## Accessibility

The input is nested inside its own `<label>`, the text-field precedent: implicit association, so the whole row — control, label and hint — is one click target at least 44px tall, and no template mints an `id` that two choices on one screen could collide on. The hint sits inside the label, so it joins the accessible name; that is text-field's stated trade and it holds here for the same reason. Radios sharing a group move with the arrow keys and take one Tab stop, and checkboxes take one Tab stop each — both native, both free. Colour is never the only signal: the tick or the dot states the pick. **One gap, named rather than papered over with a role:** the stack a radio set sits in has no group semantics, so assistive tech hears each radio's own label but not the set's question; a consuming product that needs it wraps the set in a `fieldset` with a `legend`. Contrast: `--color-fg` and `--color-fg-muted` on the page ground are declared pairs (`system/derive.rules.mjs` `wcagPairs`, AA 4.5).
