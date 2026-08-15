```json
{
  "component": "ghost-button",
  "status": "shipped",
  "class": "ds-ghost-button",
  "contract": null,
  "props": {
    "label": { "type": "string", "required": true, "description": "the action, named as a verb phrase — \"View details\", \"Skip for now\" — rendered verbatim as the button's own text" },
    "disabled": { "type": "boolean", "required": false, "description": "native disabled — visible but inert, the click never reaches the bus; absent means enabled" }
  },
  "tokens": ["--color-accent", "--color-accent-wash", "--color-accent-active", "--color-fg-muted", "--radius-md", "--spacing-md", "--type-body"],
  "states": ["default", "hover", "focus", "active", "disabled"],
  "children": [],
  "example": { "label": "View details" }
}
```

## Usage

The quiet sibling of primary-button: the same box, the same type, the same bus emission — and no fill. Library-generic (the `ds-` prefix marks a cross-scenario library component, distinct from `vd-`/`fw-`). Use it for the action a screen offers without arguing for it: the secondary path beside a primary-button, a dismissal, the invited action inside an empty-state (whose `children` list names exactly this component). One view keeps one filled button; everything else that acts stands down to this. Like primary-button, it does not know what its action means — it emits the intent onto the bus and the composing surface decides.

## States

- **default** — transparent fill, `--color-accent` text at `--type-body` weight 600. The accent alone marks it interactive; there is no border, so it never competes with a card's hairline.
- **hover** — `--color-accent-wash` fill: the accent as a barely-there ground, adding contrast without removing information.
- **focus** — `:focus-visible` outline in `--color-accent-active`, offset outside the box (mirrors primary-button).
- **active** — the wash fill with `--color-accent-active` text: pressed reads one step darker, same mechanic as primary-button's active.
- **disabled** — `--color-fg-muted` text, no fill, `cursor: not-allowed`; native `disabled` suppresses the click entirely, so nothing reaches the bus.

No new token at any state: the accent family already carries hover/active/disabled expression (the metric-tile precedent — emphasis needs no new hue).

## Data binding

`contract: null` — presentational plus one intent. No stored record binds here; the composing agent or page passes the action's name down and listens on the bus. Emission mirrors primary-button exactly: one `ui.intent` per click with `{ intent: "commit", label }`, `source` resolved from the event (`e.detail === 0` is keyboard). What "commit" means — navigate, dismiss, retry — is the composing surface's decision; the component only reports that its labelled action was chosen.

| Prop | Element | When absent |
| --- | --- | --- |
| `label` | the button's text content and accessible name | required — a button with no name is not a control |
| `disabled` | the native `disabled` attribute | absent means enabled |

## Accessibility

A real `<button type="button">` — focusable, Enter/Space for free, named by its own text content, no ARIA needed. `--color-accent` on the page ground is a declared contrast pair (`system/derive.rules.mjs` `wcagPairs`, "accent text / links", AA 4.5), so a derived pack that could not hold this button's label readable fails its own check rather than shipping quietly. The hover wash only ever adds background behind that same pair. Disabled drops to `--color-fg-muted` with the pointer cursor withdrawn — conventionally exempt from contrast minima, and the label text is unchanged, so the state is never colour-only. Hit area: the `--spacing-md` padding puts the box comfortably past 44px tall at `--type-body`.
