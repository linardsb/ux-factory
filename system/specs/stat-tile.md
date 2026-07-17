```json
{
  "component": "stat-tile",
  "status": "spec",
  "class": "vd-stat-tile",
  "contract": "stat-tile.contract.json",
  "props": {
    "kind":  { "type": "string", "required": true, "enum": ["moisture", "light"], "description": "which reading — selects the tile glyph" },
    "value": { "type": "number", "required": true, "description": "the reading, rendered as-is — the tile does no rounding or conversion" },
    "unit":  { "type": "string", "required": true, "description": "display unit set beside the value, e.g. \"%\", \"lx\"" },
    "label": { "type": "string", "required": true, "description": "caption under the value naming the reading, e.g. \"Moisture\"" }
  },
  "tokens": ["--color-bg-surface", "--color-fg", "--color-fg-muted", "--color-border", "--radius-md", "--spacing-sm", "--spacing-md", "--type-h3", "--type-caption"],
  "states": ["default"],
  "children": []
}
```

## Usage

Component of the Verdant demo scenario (fictional product). One reading, one tile: value + unit large, glyph and caption quiet. Use in a two-up grid between the plant-card and the "Today" list — moisture left, light right, always the pair (a lone tile reads as an error, not a design choice). The tile displays; it does not judge — no good/bad colouring, no thresholds (urgency is the status-chip's job, on cards and rows).

## States

- **default** — the only state: `--color-bg-surface` fill, `--color-border` hairline, no interaction. The tile is read-only; if a reading should become tappable, that is a new component decision, not a tile state.

## Data binding

Renders one `Reading` record (stat-tile.contract.json) — only what the tile shows, deliberately not a sensor API. Mapping:

| Contract field | Element | When absent |
| --- | --- | --- |
| `kind` | glyph slot (`moisture` → droplet, `light` → sun) | required — never absent |
| `value` | the big number (`--type-h3`, `--color-fg`) | required — never absent |
| `unit` | small suffix beside the value (`--type-caption`, `--color-fg-muted`) | required — never absent |
| `label` | caption line under the value (`--type-caption`, `--color-fg-muted`) | required — never absent |
| `id` | not rendered — record identity | required — never absent |
| `plantId` | not rendered — the screen selects the featured plant's pair by it | required — never absent |

Sample record (valid against the contract — a real record from the mock API):

```json
{ "id": "read-03", "plantId": "plant-03", "kind": "moisture", "value": 22, "unit": "%", "label": "Moisture" }
```

## Accessibility

A `<figure>`-free static block: one paragraph whose text order is label, value, unit ("Moisture, 34%") so screen readers get the caption first; the glyph is `aria-hidden` (decorative — the label names the reading). No tabindex, no role. Value/unit contrast pairs (`--color-fg`, `--color-fg-muted` on `--color-bg-surface`) meet AA at their sizes.
