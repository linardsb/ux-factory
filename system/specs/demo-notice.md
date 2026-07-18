```json
{
  "component": "demo-notice",
  "status": "spec",
  "class": "vd-demo-notice",
  "contract": null,
  "props": {
    "text": { "type": "string", "required": true, "description": "the scenario's fictionalNotice string, rendered verbatim — never paraphrased or summarized" }
  },
  "tokens": ["--color-fg-muted", "--color-bg-surface", "--color-border", "--type-caption", "--spacing-sm"],
  "states": ["default"],
  "children": []
}
```

## Usage

Component of the Verdant demo scenario (fictional product). This is honesty surface #1: the visible label telling a viewer that the scenario they're looking at — its company, users, plants, data — is invented for the demonstration. It renders whatever `fictionalNotice` string the active scenario's copy carries, nothing more. The composing page decides which scenario is active and where the notice sits in the layout; this component's only job is to display the string it's given, unedited.

## States

- **default** — the only state: the notice text, always visible, never dismissed or collapsed. `status: spec` — no CSS ships with this record; today it renders as plain semantic markup with no visual treatment. Ticket #8 lands the styling (the token list above) and flips `status` to `shipped`.

## Data binding

Presentational — `contract: null`. No API record binds here; the composing page reads the active scenario's copy and passes the string down. Mapping:

| Prop | Element | When absent |
| --- | --- | --- |
| `text` | the notice's own text content | required — never legitimately absent; a demo screen missing this string is a disclosure gap, not a valid state |

## Accessibility

A plain text element (e.g. a `<p>` or an element with `role="note"`) — always present in the accessibility tree, never visually hidden, truncated, or collapsed behind an interaction. The disclosure has to reach assistive-tech users on the same terms as sighted ones, so no `aria-hidden`, no icon-only rendering, no relying on color alone. `--color-fg-muted` on `--color-bg-surface` reads as secondary, quiet emphasis, not as a warning — but still needs to clear text contrast at `--type-caption` size once ticket #8 ships the CSS.
