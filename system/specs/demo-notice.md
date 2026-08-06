```json
{
  "component": "demo-notice",
  "status": "shipped",
  "class": "vd-demo-notice",
  "contract": null,
  "props": {
    "text": { "type": "string", "required": true, "description": "the scenario's fictionalNotice string, rendered verbatim — never paraphrased or summarized" }
  },
  "tokens": ["--color-fg-muted", "--color-bg-surface", "--color-border", "--type-caption", "--spacing-sm"],
  "states": ["default"],
  "children": [],
  "example": { "text": "Verdant is a fictional product, invented for this demonstration. No real company, users, or data are involved." },
  "aiPatterns": [
    { "pillar": "transparency", "pattern": "content-provenance labeling",
      "how": "renders the scenario's provenance notice (fictionalNotice / speculativeNotice) verbatim and always in the accessibility tree, never dismissed or collapsed — on an AI feature this is where AI/speculative provenance is disclosed to the viewer on the same terms as everyone else" }
  ]
}
```

## Usage

Component of the Verdant demo scenario (fictional product). This is honesty surface #1: the visible label telling a viewer that the scenario they're looking at — its company, users, plants, data — is invented for the demonstration. It renders whatever `fictionalNotice` string the active scenario's copy carries, nothing more. The composing page decides which scenario is active and where the notice sits in the layout; this component's only job is to display the string it's given, unedited.

## States

- **default** — the only state: the notice text, always visible, never dismissed or collapsed. It has no hover, focus, pressed or dismissed variant, because it is not a control — a notice with a way to make it go away is a notice that can be made to go away. The styling (the token list above) ships in `system/components.css` as `.vd-demo-notice`, and `system/agentic-renderer.mjs` renders it as a `role="note"` paragraph.

## Data binding

Presentational — `contract: null`. No API record binds here; the composing page reads the active scenario's copy and passes the string down. Mapping:

| Prop | Element | When absent |
| --- | --- | --- |
| `text` | the notice's own text content | required — never legitimately absent; a demo screen missing this string is a disclosure gap, not a valid state |

## Accessibility

A plain text element (e.g. a `<p>` or an element with `role="note"`) — always present in the accessibility tree, never visually hidden, truncated, or collapsed behind an interaction. The disclosure has to reach assistive-tech users on the same terms as sighted ones, so no `aria-hidden`, no icon-only rendering, no relying on color alone. `--color-fg-muted` on `--color-bg-surface` reads as secondary, quiet emphasis, not as a warning — and that exact pair is a declared contrast pair in `system/derive.rules.mjs` (`wcagPairs`, "captions on cards", AA 4.5), so a derived pack that could not clear text contrast behind this notice at `--type-caption` size fails its own check rather than shipping quietly.
