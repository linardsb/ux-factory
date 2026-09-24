```json
{
  "component": "stack",
  "status": "shipped",
  "class": "ds-stack",
  "contract": null,
  "props": {
    "direction": { "type": "string", "required": true, "enum": ["row", "column"], "description": "which way the children run — the one thing a layout box must state, never defaulted" },
    "gap": { "type": "string", "required": false, "enum": ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"], "description": "the space BETWEEN children, one step of the spacing scale; absent declares none" },
    "pad": { "type": "string", "required": false, "enum": ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"], "description": "the space INSIDE the box on all four sides; absent declares none" },
    "align": { "type": "string", "required": false, "enum": ["start", "center", "end", "stretch"], "description": "how children sit on the CROSS axis; absent leaves the flex default" },
    "size": { "type": "string", "required": false, "enum": ["fill", "hug"], "description": "how this box sizes itself inside a parent stack — fill takes the free space, hug takes its content" }
  },
  "tokens": ["--spacing-xs", "--spacing-sm", "--spacing-md", "--spacing-lg", "--spacing-xl", "--spacing-2xl", "--spacing-3xl", "--spacing-4xl"],
  "states": ["default"],
  "children": ["card", "choice", "ghost-button", "icon", "list", "modal-dialog", "nav-tabs", "primary-button", "screen-header", "select-field", "stack", "text", "text-field"],
  "childrenCardinality": "many",
  "example": { "direction": "column", "gap": "sm", "pad": "md" }
}
```

## Usage

The layout box: the one component that takes N children and decides how they sit. Library-generic (`ds-`, cross-scenario). Everything else in the vocabulary is a part; this is the only thing that arranges parts, which is why it is the first spec to declare `childrenCardinality: "many"` — the grammar the composition validator grew for it. A composed screen is a `stack` holding the parts, and a `stack` lists itself among its allowed children because real layouts nest: a column of rows is two stacks, not a new component.

Four decisions, all of them enumerated, none of them free:

- **`direction` is required.** A layout box that defaults its axis is a box whose composer never had to say what they meant, and an import that guesses is an import that is wrong half the time.
- **`gap` and `pad` are spacing-scale steps, never numbers.** The CSS block binds each step to a `--spacing-*` token; the composition never carries a pixel value. A missing `gap` emits no attribute at all, so **absence expresses zero** — there is no `none` enum value and no `--spacing-none` token, which is exactly the verdict spike S2 (#299) reached when it mapped a design tool's auto-layout onto this box. That verdict is conditional: it holds only while the bare `.ds-stack` class declares no default gap and no default padding. A default arriving there would silently override a designer's explicit zero, and build-checks group 3 asserts its absence so the condition cannot quietly lapse.
- **`align` is the cross axis only.** There is no main-axis distribution prop: a stack packs from the start. S2's intermediate representation carries `{main, cross}`; what to do with `main` is the importer's call (#304), not a prop invented here in advance.
- **`size` has two values and no fixed-px case.** S2 asked whether a `s(360, hug)` literal from a design file could ride here; the enum is the answer, and it is no. A frame that needs an exact width is describing a canvas artefact, not a composition, and the refusal is visible — `validateComposition` names the enum.

The `children` list is the epic's own ten generic primitives (`docs/epics/canvas-design-import.prd.md` G24) **as they exist**, alphabetical: `stack` and `text` (#301), `list` (#303), `icon` (#305) and now `choice` (#309), the fifth and last, which completes the ten. It is a deliberate starting width rather than the whole vocabulary: every other committed `children` list in this repo is one to three considered names, and `card.md`'s own prose argues against breadth. Widening it is one line here plus a regeneration, whenever a flow actually needs a part it cannot hold. One name looks wrong and is not — `screen-header` carries a `vd-` class, because Verdant is where it was authored; G24 names it as half of the generic "nav" primitive regardless. The class prefix records **who wrote it**; the list records **what it is**. Do not "fix" it out.

## States

- **default** — the only state. A stack is not a control: no hover, no focus, no pressed, nothing to trap. It has no fill, no border, no radius and no shadow of its own, which is what lets it wrap anything without adding a visual frame — framing is `card`'s job, and a stack that grew a background would be a second, quieter card.

Every prop rides a `data-*` attribute rather than an inline style, so the token bindings live in `system/components.css` where `gen-system-graph` can see them and a composition stays free of literals.

## Data binding

`contract: null` — structural. No record binds here; a stack holds whatever the composing agent put in it and computes nothing.

| Prop | Effect | When absent |
| --- | --- | --- |
| `direction` | `flex-direction`, set to `row` or `column` | required — a box with no stated axis is a guess |
| `gap` | `gap: var(--spacing-<step>)` | no attribute, no rule, no gap |
| `pad` | `padding: var(--spacing-<step>)` | no attribute, no rule, no padding |
| `align` | `align-items`, set to `flex-start`, `center`, `flex-end` or `stretch` | the flex default (`stretch`), unstated |
| `size` | `flex: 1 1 0%` (fill) or `flex: 0 0 auto` (hug), with the matching `align-self` | the flex default — the box sizes to its content in the main axis and stretches in the cross |

Children render through their own templates, in array order, exactly as they would render alone — the stack adds arrangement, never behaviour. A nested stack renders its own children too: the template passes each child's own `children` array down rather than an empty one.

## Accessibility

A plain `<div>` with no role and no accessible name: a stack is layout, and layout that announces itself is noise in the accessibility tree. DOM order is composition order, so the reading order a screen reader hears is the order the composer wrote — which is the whole reason arrangement is a `direction` prop and not a set of positional offsets. `align: "end"` and `direction: "row"` change where things sit visually and leave DOM order untouched; a composition that needs a different reading order reorders its children, and that is deliberate.

`min-width: 0` on the box itself so a stack holding wide content (a table, a long code span) scrolls its own child rather than blowing out the row it sits in. Nothing here is colour-only — a stack paints nothing at all. Contrast is every child's own concern, unchanged by being inside a stack.
