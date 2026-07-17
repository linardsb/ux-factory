```json
{
  "component": "plant-card",
  "status": "spec",
  "class": "vd-plant-card",
  "contract": "plant-card.contract.json",
  "props": {
    "name":     { "type": "string", "required": true,  "description": "plant display name, one line, truncates with ellipsis" },
    "species":  { "type": "string", "required": false, "description": "latin name — muted secondary line, omitted entirely when absent" },
    "status":   { "type": "string", "required": true,  "enum": ["ok", "due", "overdue"], "description": "care status — rendered by the status-chip child, drives the due/overdue states" },
    "photoUrl": { "type": "string", "required": false, "description": "square thumbnail; when absent, a token-tinted monogram placeholder (first letter of name)" }
  },
  "tokens": ["--color-bg-surface", "--color-fg", "--color-fg-muted", "--color-border", "--color-accent", "--radius-md", "--spacing-sm", "--spacing-md", "--type-body", "--type-caption", "--shadow-sm"],
  "states": ["default", "due", "overdue", "pressed"],
  "children": ["status-chip"]
}
```

## Usage

Component of the Verdant demo scenario (fictional product). The unit of the "My plants" list: one card per plant — thumbnail left, name + species stacked centre, status-chip right. Use in a vertical list under the screen-header; the whole card is one tap target navigating to the plant. Never nest a card in a card; never place more than one chip on it — the card summarises, the detail view elaborates.

## States

- **default** — `status: "ok"`: surface background, quiet border, chip in its ok variant.
- **due** — `status: "due"`: chip switches to its due variant; the card itself does not recolour (the chip carries the signal — one signal per card).
- **overdue** — `status: "overdue"`: chip in its overdue variant; card border moves to `--color-accent` — the only state where the card itself escalates.
- **pressed** — active touch: background deepens one step toward `--color-border`; no scale transforms.

## Data binding

Renders one `Plant` record (plant-card.contract.json). Mapping:

| Contract field | Element | When absent |
| --- | --- | --- |
| `name` | primary line (`--type-body`, `--color-fg`) | required — never absent |
| `species` | secondary line (`--type-caption`, `--color-fg-muted`) | line omitted, card compacts |
| `status` | status-chip child | required — never absent |
| `photoUrl` | 48px square thumbnail, `--radius-md` | monogram placeholder, `--color-bg-surface` / `--color-fg-muted` |
| `id` | `data-plant-id` attribute (navigation target) | required — never absent |
| `lastWatered` | not rendered here — care-task-row territory | — |

Sample record (valid against the contract):

```json
{ "id": "p-014", "name": "Monstera", "species": "Monstera deliciosa", "status": "due", "lastWatered": "2026-07-14T08:30:00Z", "photoUrl": "/assets/verdant/monstera.webp" }
```

## Accessibility

The card is a single link (`<a>`), accessible name = name + status ("Monstera, watering due"); the chip's text is `aria-hidden` to avoid double announcement. Thumbnail `alt=""` (decorative — the name is adjacent). Minimum touch target 44px; visible `:focus-visible` outline in `--color-accent`; state changes never rely on colour alone (the chip carries a text label).
