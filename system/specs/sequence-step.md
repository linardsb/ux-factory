```json
{
  "component": "sequence-step",
  "status": "shipped",
  "class": "ds-sequence-step",
  "contract": null,
  "props": {
    "position": { "type": "string", "required": true,  "description": "this step's 1-based place in the sequence as a display string, e.g. \"2\" — counted, never assigned" },
    "total":    { "type": "string", "required": true,  "description": "how many steps the sequence has, as a display string — a step that does not know the total is not a sequence" },
    "label":    { "type": "string", "required": true,  "description": "what this step is, one line — truncates with an ellipsis" },
    "detail":   { "type": "string", "required": false, "description": "one short qualifier: what advances this step, where it leads, or — when nothing does — that fact, because tone alone may never carry it; ≤ 6 words, never a sentence" },
    "tone":     { "type": "string", "required": false, "enum": ["neutral", "warn", "critical"], "description": "optional emphasis — redundant weight, never the sole signal (position + label + detail must already read the state)" }
  },
  "tokens": ["--color-bg-surface", "--color-fg", "--color-fg-muted", "--color-border", "--color-accent", "--color-accent-fg", "--radius-md", "--radius-lg", "--spacing-xs", "--spacing-sm", "--spacing-md", "--type-body", "--type-caption", "--type-eyebrow"],
  "states": ["neutral", "warn", "critical"],
  "children": []
}
```

## Usage

One position in a sequence per step: where it sits in the order, what it is, and one optional qualifier. Library-generic — the third `ds-` primitive after metric-tile and list-row (the `ds-` prefix marks a cross-scenario library component, distinct from `vd-`/`fw-`). The three split the labour: **metric-tile reports one aggregate reading** ("Oversold SKUs, 3"); **list-row reports one named entity** ("Pallet wrap, 23 micron — 85 units short"); **sequence-step reports one position in a sequence** ("Step 2 of 4, Add something, Save"). Use metric-tile when the honest answer is *how many*, list-row when it is *which ones*, and sequence-step when it is *where in the order*.

**It deliberately does not carry progress.** There is no `done`, no `current`, no `todo` — and that absence is the whole reason this spec exists rather than a richer one. The source that names a sequence (a breadboard, a flow, an ordering) records where a step sits; it does not record whether anyone has completed it. A step that claimed to be complete would be the one invented fact in whatever composed it, so the prop that would let it make that claim is not here. If a surface genuinely knows its own progress, that is a different component with a data contract, not a tone on this one.

Like its two siblings it carries no domain vocabulary: the composing agent (or page) computes `position`, `total`, `label` and `detail` from its own source, so one primitive expresses an onboarding flow, a checkout, or an approval chain without knowing what any of them are. The bound is a handful of steps a reader can hold at once — this is not a progress bar and not a wizard shell; it renders one step, and the composing surface decides how many there are.

## States

The three states are emphasis levels, not data variants — the step reads the same at every tone:

- **neutral** — the base and default: `--color-bg-surface` fill, `--color-border` hairline, the ordinal in an `--color-accent` pill. Use when the step carries no urgency.
- **warn** — signal: `--color-accent` border and tint on `--color-bg-surface`. Advances without shouting (mirrors metric-tile's and list-row's warn). The ordinal is already in the accent at every tone, so warn adds weight to the step rather than re-colouring the one thing that was never neutral.
- **critical** — escalated: solid `--color-accent` fill, `--color-accent-fg` text throughout including the ordinal pill, whose border inverts with it. The only filled variant — reserved so it stays loud (mirrors list-row's critical, and status-chip's `overdue` fill-inversion).

Colour is never the sole signal: the position, label and detail must carry the state on their own ("Step 3 of 4, Settings, nothing to act on here"); tone only adds weight, border, or fill via the accent family — no separate hue.

## Data binding

`contract: null` — presentational, exactly like metric-tile and list-row. sequence-step binds no stored record; it renders computed values passed as props. The composing agent (or page) computes `position` / `total` / `label` / `detail` / `tone` from its own source — e.g. from a breadboard it might compute `{ "position": "2", "total": "3", "label": "Progress", "detail": "Set a target" }`.

`position` and `total` are strings for the same reason `value` is on both siblings: head schema v1 prop types are string/number/boolean, and string is the uniform choice for a display reading. `total` is what the composing surface actually renders, not what its source holds — a step that reads "3 of 7" inside a sequence of three is a number the surface did not count. Each absent optional renders nothing at all — no empty element is emitted; `tone`, when absent or `"neutral"`, renders the base state.

## Accessibility

One paragraph per step whose text order is position → label → detail ("Step 2 of 4, Add something, Save"), so the step is heard as one sentence rather than as an ordinal detached from the thing it numbers. The ordinal is **real text, never a CSS counter**: a generated `content` value is not reliably in the accessibility tree, and the position is the one fact this primitive exists to state.

Non-interactive: **no role, no tabindex, no list semantics.** Steps are siblings inside a composed slot with no owning `<ol>`, so claiming `listitem` would be a false claim about a list that does not exist — the step states no relationship it cannot back (the same argument list-row.md:45 makes). The sequence is expressed in the text of every step, which is why each one carries its own total: the relationship survives even where the visual grouping does not.

`tone` is redundant emphasis, not the signal. Contrast pairs meet AA at their sizes: `--color-fg` and `--color-fg-muted` on `--color-bg-surface` for the base and warn tint, `--color-accent` on `--color-bg-surface` for the ordinal, and `--color-accent-fg` on `--color-accent` for critical — including the ordinal pill, which inverts to an `--color-accent-fg` hairline on the accent fill rather than keeping an accent foreground that would fail against it (the bug list-row.md:47 records). A long `label` truncates with an ellipsis rather than reflowing the step; the full text stays in the accessibility tree.
