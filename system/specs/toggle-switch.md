```json
{
  "component": "toggle-switch",
  "status": "shipped",
  "class": "ds-toggle-switch",
  "contract": null,
  "props": {
    "label": { "type": "string", "required": true, "description": "what the switch controls — \"Watering reminders\" — read as the switch's accessible name" },
    "on": { "type": "boolean", "required": false, "description": "the starting state; absent means off" },
    "disabled": { "type": "boolean", "required": false, "description": "native disabled — the flip never happens and nothing reaches the bus; absent means enabled" }
  },
  "tokens": ["--color-accent", "--color-bg", "--color-bg-surface", "--color-border", "--color-fg", "--color-fg-muted", "--motion-fast", "--motion-ease", "--radius-lg", "--radius-md", "--spacing-md", "--spacing-sm", "--type-body"],
  "states": ["off", "on", "focus", "disabled"],
  "children": [],
  "example": { "label": "Watering reminders", "on": true }
}
```

## Usage

A labelled on/off control: one setting, one row, one flip. Library-generic (`ds-`, cross-scenario). Use it on any composed settings surface — the pattern rules already name settings screens, and this is the control they depict. It is care-task-row's mechanic in library form: the row flips its OWN state first, then reports the new value on the bus — the composing surface owns what "on" means (a reminder armed, a sensor muted), the component only owns being honest about which side it shows. A switch, not a checkbox, deliberately: `role="switch"` announces on/off rather than checked/unchecked, which is the vocabulary a setting speaks.

## States

- **off** — the track is `--color-bg` inside a `--color-border` hairline at the pill radius (`--radius-lg` — the status-chip precedent, no invented 999px); the thumb sits left on `--color-bg-surface`.
- **on** — the track fills `--color-accent` and the thumb slides right: position AND fill state the side together, never colour alone (the label's row is also `aria-checked` for AT).
- **focus** — the 2px `--color-accent` outline on the whole row.
- **disabled** — label drops to `--color-fg-muted`, `cursor: not-allowed`; native `disabled` suppresses the click, so no flip and no emission.

The slide is the library's one moving state: `--motion-fast` with `--motion-ease` on transform only (compositor-safe), and it stands down entirely under `prefers-reduced-motion` — the state still changes instantly, only the travel is dropped.

## Data binding

`contract: null` — presentational plus one intent. The composing agent passes the setting's name and starting side; each click flips the rendered state and emits `{ intent: "toggle", on, label }` with the NEW value (the care-task-row shape: flip first, then report). No stored record binds here — persisting the setting is the consuming product's job, and a specimen that pretended to save would be dishonest about what runs.

| Prop | Element | When absent |
| --- | --- | --- |
| `label` | the row's visible text and accessible name | required — an unnamed switch is a mystery control |
| `on` | `aria-checked` + the `is-on` class | absent means off |
| `disabled` | the native `disabled` attribute | absent means enabled |

## Accessibility

One real `<button type="button" role="switch">` wrapping label and track — the whole row is the 44px target, named by its own label text, with `aria-checked` carrying the state (flipped in the same handler that moves the thumb, so the two can never disagree). The track and thumb are `aria-hidden` decoration: the switch role already states the side. Enter/Space come free with the button element. Colour is never the sole signal — thumb position moves with the fill, and AT hears on/off regardless. Contrast: the accent track against its `--color-bg` surround exceeds the 3:1 non-text minimum under the neutral pack, and the label reads at the declared `--color-fg` pairs (`system/derive.rules.mjs` `wcagPairs`).
