```json
{
  "component": "mj-button",
  "status": "shipped",
  "class": "ds-mj-button",
  "contract": null,
  "props": {},
  "tokens": ["--color-accent", "--color-accent-fg", "--spacing-md", "--radius-lg", "--font-body"],
  "states": ["default", "hover", "pressed", "disabled"],
  "children": [],
  "example": {}
}
```

## Usage

Admitted by ratify (portal/lib/ratify.mjs) from import record `i2` in run `faster-payment`: imported from brilliant, licence: From The Ultimate Email Design System (Community), public Brilliant file. Terms: [as shown on file].

Pill-shaped call to action for the one main action on a screen, such as Continue or Send. Use instead of primary-button where the screen needs a single, prominent action; don't place two on one screen.

## States

- **default** — Pill-shaped filled button with a centred text label, at rest.
- **hover** — Fill darkens slightly to show the button can be clicked; shape and label unchanged.
- **pressed** — Fill darkens further while held, confirming the press.
- **disabled** — Muted fill and label, not clickable; used when the step can't continue yet, for example while a check is loading.

## Data binding

`contract: null` — presentational. No record binds here; the composition supplies every prop.

## Accessibility

Native button element; the visible label is the accessible name. Focus shows as a visible outline ring. Disabled uses the disabled attribute so it is skipped and announced as unavailable.
