```json
{
  "component": "empty-state",
  "status": "shipped",
  "class": "ds-empty-state",
  "contract": null,
  "props": {
    "title": { "type": "string", "required": true, "description": "what there is none of yet, stated plainly — \"No readings yet\"" },
    "body": { "type": "string", "required": false, "description": "one sentence saying how the first item arrives; absent renders nothing" }
  },
  "tokens": ["--color-border", "--color-fg", "--color-fg-muted", "--radius-md", "--spacing-md", "--spacing-sm", "--spacing-xl", "--type-body", "--type-caption"],
  "states": ["default"],
  "children": ["ghost-button"],
  "example": { "title": "No readings yet", "body": "Connect a sensor and its first reading appears here." }
}
```

## Usage

What a screen says when the data it was built for is not there yet. Library-generic (`ds-`, cross-scenario). Use it wherever a list, a board or a dashboard would otherwise render nothing — an empty region that explains itself beats a blank one every time, and an empty state that invites the next action beats one that merely reports absence. Its one allowed child is a ghost-button carrying that invitation ("Add a plant", "Connect a sensor"); the quiet button is deliberate — an empty screen is not an alarm, and a filled primary-button would argue harder than the moment warrants. No illustration and no icon: the title does the work, in the interface's own voice.

## States

- **default** — the only state: a `--color-border` DASHED hairline around centre-set muted prose. The dash is the design call — the library's one dashed border, drawing absence as an outline of where content will sit rather than as a filled card pretending to be content. `--spacing-xl` vertical padding gives the emptiness honest room; title in `--color-fg` at `--type-body` weight 600, body in `--color-fg-muted` at `--type-caption`.

No hover, focus or pressed variant: the container is not a control. The child ghost-button carries its own interactive states.

## Data binding

`contract: null` — presentational. No record binds here, which is the point: this component renders precisely when there is no record to bind. The composing agent or page states what is absent and, optionally, one action that changes that.

| Prop | Element | When absent |
| --- | --- | --- |
| `title` | the centre-set first line | required — an unexplained empty region is a gap, not a state |
| `body` | the sentence under it | renders nothing |

The single ghost-button child renders after the body, through its own template; its intent emission is its own (see ghost-button's Data binding).

## Accessibility

A plain `<div>` of ordinary text — no `role="status"`, deliberately: a live-region role announces CHANGES, and this component renders at-rest absence; a screen that swaps content in later owns that announcement itself. DOM order is title → body → action, one readable sentence sequence. `--color-fg` and `--color-fg-muted` on the page ground are declared contrast pairs (`system/derive.rules.mjs` `wcagPairs`, AA 4.5); the dashed border is decorative grouping, not identification-bearing UI, so SC 1.4.11 does not bind it (the same recorded exclusion as `--color-border` hairlines). Centre-set text stays a few lines at most by design — the props are one title and one sentence, not prose.
