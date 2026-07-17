```json
{
  "component": "care-task-row",
  "status": "spec",
  "class": "vd-care-task-row",
  "contract": "care-task-row.contract.json",
  "props": {
    "action":    { "type": "string",  "required": true,  "enum": ["water", "mist", "feed"], "description": "care verb — leading word of the row label, capitalised" },
    "plantName": { "type": "string",  "required": true,  "description": "which plant — completes the row label, one line, truncates with ellipsis" },
    "status":    { "type": "string",  "required": true,  "enum": ["ok", "due", "overdue"], "description": "task urgency — rendered by the status-chip child, drives the due/overdue states" },
    "checked":   { "type": "boolean", "required": false, "description": "marked-done in this session, awaiting the log-care commit; defaults to false" }
  },
  "tokens": ["--color-bg-surface", "--color-fg", "--color-fg-muted", "--color-border", "--color-accent", "--radius-md", "--spacing-sm", "--spacing-md", "--type-body"],
  "states": ["default", "due", "overdue", "checked"],
  "children": ["status-chip"]
}
```

## Usage

Component of the Verdant demo scenario (fictional product). One row of the "Today" list: a scheduled care action for one plant — check circle left, "Water Monstera" label centre, status-chip right. Use only in the today list between the stat-tiles and the primary-button; tapping anywhere on the row toggles `checked` (the primary-button commits the batch). One action per row — a plant needing water and mist is two rows, not a compound row.

## States

- **default** — `status: "ok"`: scheduled but not urgent; empty check circle in `--color-border`, chip in its ok variant.
- **due** — `status: "due"`: chip in its due variant; the row itself does not recolour (the chip carries the signal, same rule as plant-card).
- **overdue** — `status: "overdue"`: chip in its overdue variant; the check circle's ring moves to `--color-accent` — the row's one escalation.
- **checked** — `checked: true`: circle fills `--color-accent`, label softens to `--color-fg-muted`; the chip stays as-is (urgency is fact until the log commits).

## Data binding

Renders one `CareTask` record (care-task-row.contract.json). Mapping:

| Contract field | Element | When absent |
| --- | --- | --- |
| `action` | leading verb of the label (`--type-body`, `--color-fg`) | required — never absent |
| `plantName` | rest of the label — denormalised, the row never fetches the plant | required — never absent |
| `status` | status-chip child | required — never absent |
| `id` | `data-task-id` attribute (what the log-care commit sends) | required — never absent |
| `plantId` | not rendered — join key for the API, kept off the DOM | required — never absent |
| `due` | not rendered — the "Today" grouping already says when | required — never absent |

Sample record (valid against the contract):

```json
{ "id": "t-031", "plantId": "p-014", "plantName": "Monstera", "action": "water", "due": "2026-07-17T09:00:00Z", "status": "due" }
```

## Accessibility

The row is a `<button role="checkbox">` with `aria-checked` mirroring `checked`; accessible name = action + plant + status ("Water Monstera, due"), chip text `aria-hidden` against double announcement. Whole row is the target, minimum 44px tall; visible `:focus-visible` outline in `--color-accent`; checked state is carried by the filled circle plus `aria-checked`, never colour alone.
