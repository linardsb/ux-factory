```json
{
  "component": "list",
  "status": "shipped",
  "class": "ds-list",
  "contract": null,
  "props": {
    "header": { "type": "string", "required": false, "description": "an optional section title above the rows — two or three words naming what the rows are, e.g. \"Oversold SKUs\"; absent renders no header at all" },
    "empty": { "type": "string", "required": true, "description": "what this region says when it holds no rows — one sentence, e.g. \"No readings yet\"; required because a list's empty state is part of its design, not a runtime accident" }
  },
  "tokens": ["--color-bg-surface", "--color-border", "--color-fg-muted", "--radius-md", "--spacing-lg", "--spacing-md", "--spacing-sm", "--type-body", "--type-eyebrow"],
  "states": ["default"],
  "children": ["list-row"],
  "childrenCardinality": "many",
  "example": { "header": "Short this week", "empty": "No shortfalls — every SKU is covered." }
}
```

## Usage

The container of `list-row`s: the thing that holds N rows, separates them, titles them, and says what their absence reads as. Library-generic (`ds-`, cross-scenario). It is the second committed spec to declare `childrenCardinality: "many"` after `stack`, and the first whose allowed-children list is a single name — `list-row` and nothing else, which is the shape a design importer can recognise without guessing. Without it a composed screen with three rows is three sibling cards inside a `stack`: each with its own border and radius, no shared title, no separator, and no answer at all for the case where the data is absent.

Three decisions, and each of them is the reason a naive version would be wrong:

- **`empty` is required.** A list's empty state is a design decision, not a runtime accident. With base-plus-overrides states (#302) a screen's empty-list state is an override that REMOVES the children — so if the copy is not already a prop of the container, there is nothing left to render and the region goes blank, which is the exact thing `empty-state` exists to argue against. Required also means the `/components` playground always shows the empty branch, so the decision is visible to a reader and not only to a gate.
- **The empty copy is a PROP, not a child.** `empty-state` is a standalone framed region with its own dashed hairline and its own `--spacing-xl` room; putting one inside a list puts a dashed box inside a solid box — two frames for one absence. It would also mean `children` allows `empty-state`, which means a composition can put one in a list **that has rows** — a hidden child by another name, and `hidden` is defeated by any author rule that sets `display` (#138). A prop cannot be composed wrongly.
- **The dividers are the container's.** A row does not know whether it has a neighbour, so a row that drew its own separator would draw one after the last row, or none at all. The container knows, because adjacency is a fact about the container. So the list takes the row's border and radius off from the outside and draws one hairline between neighbours instead. `list-row`'s own block is untouched: a row rendered anywhere else — its `/components` specimen, Fieldwork's slots, `/build`'s patterns — is still a card.

The bound is `list-row`'s own, inherited whole: a handful of rows that carry the answer, **not one row per record — this is not a table.** No sort, no pagination, no columns, no header row, no selection and no tappable row. If a reading needs those, this is the wrong primitive, and the container adding them would not change that.

## States

- **default** — the only state. The container is not a control: no hover, no focus, no pressed, nothing to trap. Its own paint is a `--color-bg-surface` fill inside a `--color-border` hairline at `--radius-md`, with `overflow: hidden` so the squared rows cannot poke through its corners.

One state, two branches, and the branch is the child count — they are branches, not states, because nothing about the container changes, only what is inside it:

- **with rows** — the header, if there is one, then the rows in composition order, separated by one hairline each and none after the last.
- **with none** — the header, if there is one, then the `empty` copy in the reading position the rows would have occupied. No rows means no dividers, because there are no neighbours.

Tone is the row's, per row: there is no `tone` prop here. A `warn` or `critical` row keeps its accent inside a list — the container zeroes `border-width` and leaves `border-color` and `background` alone, so `is-warn`'s accent border and `is-critical`'s accent fill both survive, and the fill runs edge to edge, clipped by the container's radius. The divider above a tone row is therefore that row's own accent rather than the neutral hairline, which is correct: the divider belongs to the row below it and picks up its emphasis.

## Data binding

`contract: null` — structural. No record binds here; a list holds whatever the composing agent put in it and computes nothing.

| Prop | Element | When absent |
| --- | --- | --- |
| `header` | `.ds-list-header`, a `<p>` above the rows | no element at all |
| `empty` | `.ds-list-empty`, rendered only when there are no rows | required — a blank region is a gap, not a state |

Children render through their own templates, in array order, exactly as they would render alone — the container adds arrangement and separation, never behaviour. Each child's own `children` array is passed down rather than an empty one: `list-row` is a leaf today so the two behave identically, and hardcoding the empty array would silently drop every grandchild the day it stops being one.

## Accessibility

**The container claims no role, and that is a decision rather than an omission.** Each row is already one paragraph that reads as a coherent sentence (`list-row`'s Accessibility), and `role="list"` is only honest when every child carries `role="listitem"` — which lives in `list-row`'s template, which this component does not touch. A `role="list"` whose children carry no `listitem` reports an empty list, which is a worse claim than no claim. So the container adds visual grouping and leaves the semantics the rows already own. `list-row`'s own refusal ("no owning list exists, so claiming `listitem` would be a false claim") is now partly obsolete — an owning list does exist — and giving the rows the role is a `list-row` spec and template change with its own ticket. Do not "fix" it here.

The header is a `<p>`, not a heading: a heading would insert this container into the page outline, and a composed screen's outline is the composition's business, not a container's — the same "depiction, not behaviour" reasoning `nav-tabs` states for its tabs. The empty copy is ordinary prose in the reading order where the rows would have been, not a live region: a live-region role announces CHANGES and this renders at-rest absence, which is `empty-state`'s argument exactly.

Colour is never the sole signal here, because the container signals nothing by colour: the dividers are structure and the tone colours are the rows' own, already redundant with each row's label, value and status. `--color-fg-muted` on `--color-bg-surface` carries both the header and the empty copy, a declared contrast pair (`system/derive.rules.mjs` `wcagPairs`, AA 4.5); the hairlines are decorative grouping rather than identification-bearing UI, the same recorded SC 1.4.11 exclusion every `--color-border` hairline takes. `min-width: 0` on the box so a list inside a flex row shrinks rather than blowing it out, and a long row label keeps `list-row`'s own ellipsis.
