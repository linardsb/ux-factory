```json
{
  "component": "text",
  "status": "shipped",
  "class": "ds-text",
  "contract": null,
  "props": {
    "role": { "type": "string", "required": true, "enum": ["display", "heading", "body", "caption"], "description": "which step of the type scale this text is — the ONLY size decision; there is no font-size prop" },
    "content": { "type": "string", "required": true, "description": "the text, carrying the shared inline subset: bold, code spans, links, soft breaks and `- ` bullet lists" }
  },
  "tokens": ["--color-accent", "--color-bg-surface", "--color-border", "--color-fg", "--color-fg-muted", "--font-display", "--font-mono", "--radius-sm", "--spacing-xs", "--spacing-sm", "--spacing-lg", "--type-display", "--type-h2", "--type-body", "--type-caption"],
  "states": ["default"],
  "children": [],
  "example": { "role": "heading", "content": "Send a payment" }
}
```

## Usage

The one text part. Library-generic (`ds-`, cross-scenario). Before it existed, a composed screen's words were either a scenario-specific component's internal prose or nothing at all — a title was a `screen-header` (Verdant chrome) whether or not the screen wanted chrome. This is the part that just says something.

Two props, and the interesting one is `role`. It names **what the text is** — a display line, a heading, body copy, a caption — and the type token follows from that. There is deliberately no `size`, no `weight`, no `color` and no `align` prop: free styling is how a token contract quietly becomes a suggestion, and four named roles are enough for the screens the epic set out to compose. A composition that wants a fifth role is asking for a spec change here, which is a conversation; a composition that wants 19px is asking for nothing anyone can hold to.

`content` carries the same bounded markdown subset the handoff viewer and the component catalog render, through the **same** `renderMarkdown` in `system/handoff-viewer.mjs` — one renderer, now three mounts, never a fork. Bold, code spans, soft-broken paragraphs, `- ` bullet lists, pipe tables and fenced code all work because they already worked. Links work as of this component, and they are the one construct added to that census: agent-supplied content that names a source has to be able to point at it. Headings, blockquotes and ordered lists stay out — a `text` that needs a heading is a `text` with `role: "heading"`.

Because `content` is agent-supplied wherever a composition renders, a link's `href` is the only attacker-controlled attribute anywhere in the subset. It goes through a scheme allowlist: resolved against the document base, `http:` and `https:` only. A `javascript:` or `data:` href renders as its own literal source text rather than as a link, visibly, so a refused link reads as a mistake rather than disappearing.

## States

- **default** — the only state, in four sizes. `display` is `--type-display` in `--font-display` at 700; `heading` is `--type-h2` in `--font-display` at 600; `body` is `--type-body` at 1.6; `caption` is `--type-caption` at 1.5 in `--color-fg-muted`. A text part is not a control — no hover, no focus, no pressed.

`heading` maps to `--type-h2` (clamp 24–34px) rather than `--type-h3` (20px), so the four roles are visibly distinct — `--type-h3` sits close enough to `--type-body` (16px) that a composition using both would read as one size with a weight change. The consequence is worth stating plainly: every existing product component titles itself at `--type-h3` (`screen-header`, `modal-dialog`), so a `text` with `role: "heading"` will **not** match a card's title. That is a screen-level heading against a component-internal one, which is the distinction the two sizes are drawing. If they should match, it is a one-token edit here and in `tokens`.

## Data binding

`contract: null` — presentational. No record binds here; the composing agent computes the string.

| Prop | Element | When absent |
| --- | --- | --- |
| `role` | the `data-role` attribute the type rules bind to | required — refused by the enum before any DOM |
| `content` | the rendered subtree, built element-by-element | required — a text part with nothing to say is not a part |

Both props are required, and both refusals are `validateComposition`'s rather than this template's: a missing `role` throws `required prop of text is missing`, an unknown one throws naming the enum, and both happen before a single element is created. The template is only ever reached with a role the CSS has a rule for.

## Accessibility

A plain `<div>` carrying the rendered subtree — no heading element, at any role. A composition can place a `text` at any depth, and a hard-coded `<h2>` would lie about the document outline more often than it helped; the composing page owns its heading structure, which is the same call `card.md` makes about its title. `role: "heading"` is a size, and it says so.

Text contrast: `--color-fg` and `--color-fg-muted` on `--color-bg` are both declared AA pairs (`system/derive.rules.mjs` `wcagPairs`, 4.5), and so is `--color-accent` on `--color-bg` — the link colour, usage "accent text / links on the page ground". So a link is contrast-safe by the contract, and it is underlined anyway: contrast is SC 1.4.3, and an underline is SC 1.4.1, which says colour alone may not be the only way a link is distinguishable from the text around it. The two rules answer different questions and both have to be answered.

Every link carries `rel="noopener noreferrer"`. Nothing here truncates, nothing is colour-only, and the part adds no interaction to trap. `min-width: 0` so a long unbroken string inside a flex row shrinks rather than blowing out the row.
