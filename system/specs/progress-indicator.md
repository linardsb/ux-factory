```json
{
  "component": "progress-indicator",
  "status": "shipped",
  "class": "ds-progress-indicator",
  "contract": null,
  "props": {
    "label": { "type": "string", "required": true, "description": "what is progressing — \"Setup\", \"Uploading\" — the progressbar's accessible name" },
    "value": { "type": "number", "required": true, "min": 0, "max": 100, "step": 1, "description": "percent complete, 0–100; the template clamps an out-of-range value into the bounds rather than throwing" },
    "detail": { "type": "string", "required": false, "description": "one quiet line under the bar — \"Step 3 of 5\"; absent renders nothing" }
  },
  "tokens": ["--color-accent", "--color-accent-wash", "--color-bg-surface", "--color-border", "--color-fg", "--color-fg-muted", "--radius-md", "--radius-sm", "--spacing-md", "--spacing-sm", "--type-caption"],
  "states": ["default", "complete"],
  "children": [],
  "example": { "label": "Setup", "value": 62, "detail": "Step 3 of 5" }
}
```

## Usage

One bounded number made visible: a caption row, a track, a fill. Library-generic (`ds-`, cross-scenario). Use it for determinate progress a scenario can actually measure — steps completed, records processed, a percentage the data really contains. It is determinate only, deliberately: an indeterminate spinner reports the SYSTEM's mood, this component reports the DATA's position, and conflating them is how interfaces end up animating confidence they do not have. The value is the library's one bounded number prop (`min` 0 · `max` 100 · `step` 1), which is also what gives the catalog playground its real range control.

## States

- **default** — the track is `--color-accent-wash` inside a `--color-border` hairline; the fill is `--color-accent`, its width the value itself. Caption row above: label in `--color-fg-muted`, the percent readout in `--color-fg` with tabular numerals so a ticking value does not jitter.
- **complete** — at exactly 100 the template adds `is-complete`, which recolours the percent readout to `--color-accent` and nothing else: the bar is already all accent at 100, and any louder state would out-shout the metric-tile escalation grammar. Completion is the value's own fact, never a separate flag.

## Data binding

`contract: null` — presentational. The composing agent computes the percentage from the scenario's data and passes it down; the component never computes, rounds or invents progress. An out-of-range value clamps into 0–100 at render (a bar cannot honestly draw 140%), and the readout prints the clamped number — the drawn bar and the printed number always agree.

| Prop | Element | When absent |
| --- | --- | --- |
| `label` | the caption's leading text and the progressbar's `aria-label` | required — an unlabelled bar is a decoration |
| `value` | the fill width, the percent readout, and `aria-valuenow` | required — a progress bar with no value has nothing to state |
| `detail` | the quiet line under the track | renders nothing |

## Accessibility

The track element carries `role="progressbar"` with `aria-label`, `aria-valuemin="0"`, `aria-valuemax="100"` and `aria-valuenow` — the value reaches assistive tech through the ARIA value interface, which is what the role exists for. The visible caption row is `aria-hidden="true"`, deliberately: it renders exactly the label and value the progressbar already announces, and leaving it in the tree would double every reading (the status-chip precedent — the visible mirror is hidden where the semantic source speaks). `detail` stays in the tree as plain text — the progressbar does not announce it. Colour is never the sole signal: the percent readout states the position in text at every state, and `is-complete` only re-weights a number that already says 100%.
