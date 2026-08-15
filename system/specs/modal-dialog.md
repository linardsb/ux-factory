```json
{
  "component": "modal-dialog",
  "status": "shipped",
  "class": "ds-modal-dialog",
  "contract": null,
  "props": {
    "title": { "type": "string", "required": true, "description": "the decision being asked — \"Remove this sensor?\" — the group's accessible name" },
    "body": { "type": "string", "required": true, "description": "one sentence of consequence — what confirming does, stated plainly" },
    "confirmLabel": { "type": "string", "required": true, "description": "the confirming action as a verb phrase — \"Remove sensor\", never \"OK\"" },
    "dismissLabel": { "type": "string", "required": false, "description": "the way out — \"Keep it\"; absent renders no dismiss button" }
  },
  "tokens": ["--color-accent", "--color-accent-active", "--color-accent-fg", "--color-accent-hover", "--color-accent-wash", "--color-bg", "--color-border", "--color-fg", "--color-fg-muted", "--radius-lg", "--radius-md", "--shadow-lg", "--spacing-lg", "--spacing-md", "--spacing-sm", "--type-body", "--type-h3"],
  "states": ["default"],
  "children": [],
  "example": { "title": "Remove this sensor?", "body": "Its readings stay recorded; the schedule stops.", "confirmLabel": "Remove sensor", "dismissLabel": "Keep it" }
}
```

## Usage

A decision surface: a question, one sentence of consequence, and the two ways through it — depicted INLINE and non-modal, which is the design call this component exists to state. Modality (the scrim, the focus trap, Escape, focus restore, the open/close lifecycle) is BEHAVIOURAL state, and a pure `(props) → Node` template has no honest home for it — a rendered "modal" that did not actually trap focus would be an accessibility lie, and one that did would smuggle a lifecycle into a vocabulary of stateless depictions. So the composing surface owns modality; this component owns the decision's content and its two real buttons, which genuinely emit. `--shadow-lg` carries the elevation the name promises — the library's one use of its deepest shadow. Library-generic (`ds-`, cross-scenario); use it wherever a composed screen depicts a confirmation.

## States

- **default** — the only state of the surface itself: `--color-bg` on a `--color-border` hairline at `--radius-lg`, lifted by `--shadow-lg`. Title at `--type-h3` weight 600; body in `--color-fg-muted`. There is no open/closed state — an inline surface is simply present (see Usage).

The two buttons carry their own interactive states: confirm is the filled accent (primary-button's hover/active/focus mechanic, scoped); dismiss is the ghost treatment (`--color-accent-wash` hover). Confirm filled, dismiss quiet — the visual weight states which action commits.

## Data binding

`contract: null` — presentational plus two intents. Each button emits one `ui.intent` with `{ action: "confirm" }` or `{ action: "dismiss" }` plus its own label; the composing surface decides what confirming performs. `dismissLabel` absent renders no dismiss button — some depicted decisions are acknowledgements — and the confirm button never invents a sibling.

| Prop | Element | When absent |
| --- | --- | --- |
| `title` | the surface's first line and `aria-label` | required |
| `body` | the consequence sentence | required — a confirmation with no stated consequence is a dark pattern's shape |
| `confirmLabel` | the filled button's text | required |
| `dismissLabel` | the quiet button's text | renders no dismiss button |

## Accessibility

A `<section role="group">` named by the title — a grouping role with no modality claim, deliberately NOT `role="dialog"`: a dialog role tells assistive tech to expect trapped focus and a dismiss path this inline depiction does not implement, and the roles-without-behaviour rule (nav-tabs' Accessibility, same argument) applies in full. Both buttons are real `<button type="button">` elements — focusable, named by their labels, Enter/Space free. DOM order is title → body → dismiss → confirm, so the keyboard path reaches the way out before the commitment. Contrast: `--color-accent-fg` on `--color-accent` ("button label on an accent fill") and accent-on-bg are declared pairs (`system/derive.rules.mjs` `wcagPairs`, AA 4.5). Both buttons clear 44px.
