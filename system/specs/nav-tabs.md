```json
{
  "component": "nav-tabs",
  "status": "shipped",
  "class": "ds-nav-tabs",
  "contract": null,
  "props": {
    "items": { "type": "string", "required": true, "description": "the tab labels as one pipe-delimited string — \"Overview | Activity | Settings\"; the template splits on |, trims each label and drops empties" },
    "active": { "type": "number", "required": true, "min": 1, "description": "the 1-based position of the active tab; the template clamps an out-of-range value into the rendered set" }
  },
  "tokens": ["--color-accent", "--color-border", "--color-fg", "--color-fg-muted", "--spacing-md", "--spacing-sm", "--type-body"],
  "states": ["default", "active"],
  "children": [],
  "example": { "items": "Overview | Activity | Settings", "active": 1 }
}
```

## Usage

A row of section labels with one marked current — the DEPICTION of top-level navigation, deliberately not the behaviour. Navigation is chrome, never a composed component (`studio-flow.mjs`'s recorded rule: the flow's nav buttons are chrome the canvas owns, and a clickable composed row would change a shipped contract for every consumer) — so these tabs do not switch anything, carry no click handlers, and take no bus. What they honestly state is structure: which sections exist and which one the depicted screen is. Library-generic (`ds-`, cross-scenario); use it at the head of a composed screen that belongs to a sectioned surface. The pipe-delimited `items` string is the one place the library encodes a list in a scalar — a real schema call (array props) was considered and declined at planning; the encoding rule lives here, in Data binding, not in a reader's guess.

## States

- **default** — labels in `--color-fg-muted` on a `--color-border` bottom rail.
- **active** — the one current label in `--color-fg` weight 600 with a 2px `--color-accent` underline sitting ON the rail. Weight and underline together: never colour alone.

No hover or focus states, because there is nothing to operate — a presentational tab that lit up on hover would promise the click this component deliberately does not have.

## Data binding

`contract: null` — presentational. The encoding rule, stated once: `items` splits on `|`, each label is trimmed, empty segments are dropped; `active` is 1-based and the template clamps it into the rendered set (an out-of-range current tab draws the nearest real one rather than none — a screen always IS somewhere). A `|` inside a label is not expressible — a known, accepted cost of staying scalar; a product whose tab names contain pipes has outgrown the depiction.

| Prop | Element | When absent |
| --- | --- | --- |
| `items` | one span per parsed label | required — an empty parse renders an empty row |
| `active` | the `is-active` class + `aria-current="true"` on one span | required |

## Accessibility

Plain spans with `aria-current="true"` on the active one — and deliberately NO `role="tab"`/`tablist`: those roles promise arrow-key operation and panel switching that the composition model forbids, and an ARIA promise the DOM cannot keep is worse than no ARIA at all (roles without behaviour are a lie to the people who rely on them). `aria-current` states "this is where you are" with no operability claim, which is exactly what a depiction can honestly say. The active state is weight + underline + `aria-current`, never hue alone; label contrast holds at the declared `--color-fg` / `--color-fg-muted` pairs (`system/derive.rules.mjs` `wcagPairs`, AA 4.5). Wide tab sets scroll inside their own row rather than blowing out the composition (the recorded grid-blowout family).
