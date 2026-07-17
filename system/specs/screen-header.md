```json
{
  "component": "screen-header",
  "status": "shipped",
  "class": "vd-screen-header",
  "contract": null,
  "props": {
    "title":        { "type": "string",  "required": true,  "description": "screen name, centred, one line — the screen's h1" },
    "showBack":     { "type": "boolean", "required": false, "description": "leading back affordance; omit on root screens like My plants" },
    "showSettings": { "type": "boolean", "required": false, "description": "trailing settings affordance; the today screen shows it" }
  },
  "tokens": ["--color-bg", "--color-fg", "--color-border", "--spacing-sm", "--spacing-md", "--type-h3"],
  "states": ["default", "scrolled"],
  "children": []
}
```

## Usage

Component of the Verdant demo scenario (fictional product). The phone app bar: back affordance left, screen title centre, settings right — always the topmost element of a screen, exactly one per screen. Presentational: it renders what the composing screen passes, it fetches nothing and owns no state beyond scroll elevation. Keep the title short enough to never truncate ("My plants", not a sentence).

## States

- **default** — at scroll top: `--color-bg` fill, no bottom rule; the bar and the content read as one surface.
- **scrolled** — content has scrolled beneath: a `--color-border` hairline appears at the bottom edge. No shadow, no blur — one hairline is the whole elevation story.

## Data binding

Presentational — `contract: null`. No API record binds here; the composing screen sets the props. Mapping:

| Prop | Element | When absent |
| --- | --- | --- |
| `title` | centre text (`--type-h3`, `--color-fg`) | required — never absent |
| `showBack` | leading chevron affordance | slot left empty, title stays centred |
| `showSettings` | trailing gear affordance | slot left empty, title stays centred |

## Accessibility

A `<header>` landmark; the title is the screen's `<h1>`. Back and settings are `<button>`s with explicit labels ("Back", "Settings") — the glyphs are `aria-hidden`. Both targets minimum 44px with visible `:focus-visible` outlines; the empty-slot rule keeps the title from shifting when affordances toggle, so nothing moves under a screen-reader user's touch.
