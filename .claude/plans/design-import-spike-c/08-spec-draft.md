```json
{
  "component": "person-row",
  "status": "shipped",
  "class": "ds-person-row",
  "contract": null,
  "props": {
    "name":   { "type": "string", "required": true,  "description": "who or what the row is about — a person, an account, a device — one line, truncates with an ellipsis; its first letter is the disc's monogram" },
    "meta":   { "type": "string", "required": false, "description": "one short secondary line under the name — a last-seen time, a role, a location; ≤ 6 words, never a sentence" },
    "status": { "type": "string", "required": false, "description": "optional short free text rendered as a pill, one or two words — cross-scenario, so NO enum: \"On call\", \"Away\", \"Offline\" in the product's own vocabulary" },
    "tone":   { "type": "string", "required": false, "enum": ["neutral", "warn", "critical"], "description": "optional emphasis — redundant weight, never the sole signal (name + meta + status must already read the state)" }
  },
  "tokens": ["--color-bg-surface", "--color-fg", "--color-fg-muted", "--color-border", "--color-accent", "--color-accent-fg", "--color-accent-wash", "--radius-md", "--radius-lg", "--spacing-xs", "--spacing-sm", "--spacing-md", "--type-body", "--type-caption", "--type-eyebrow"],
  "states": ["neutral", "warn", "critical", "hover", "focus"],
  "children": [],
  "example": { "name": "Amara Okafor", "meta": "Last seen 2 min ago", "status": "On call" }
}
```

## Usage

One person or entity per row, and the row **navigates**: a leading monogram disc, a name with one secondary line, an optional status pill, and a trailing chevron that says "this opens". Library-generic (`ds-`, cross-scenario) — the tappable sibling of list-row, which is deliberately non-interactive ("making a row tappable is a new component decision, not a tone"). Use person-row when the answer to a question is *who*, and the reader's next move is to open them; use list-row when the answer is *which ones* and the row only reports.

**Provenance and projection (spike C, 2026-08-27).** Drafted from a Brilliant blueprint read (`lookup … format:"blueprint"`) of a token-bound "Spike List Row" master, mapped by ROLE onto the contract, never by value. What the projection carries: surface → `--color-bg-surface`, outline → `--color-border`, primary/secondary text → `--color-fg` / `--color-fg-muted`, the disc's `primary.container` tint → `--color-accent-wash`, spacing xs/sm/md → `--spacing-xs/sm/md`, radius md → `--radius-md`, the pill's `radius.full` → `--radius-lg` (the system's pill idiom), type md/sm/xs → `--type-body/caption/eyebrow`. **What it drops, stated as content:** the `success` and `warning` colour families (the contract has one accent family; state rides `tone`, colour is never the sole signal); the `disabled` text tier on the chevron (collapses to `--color-fg-muted`); the pill's mixed-case medium weight (the system's pill is uppercase eyebrow, so the pill wears the house idiom); the Phosphor `caret-right` path (drawn as a CSS chevron in this draft — a real port would carry it as inline SVG). **Fidelity deltas under the neutral pack:** row gap 12 → 16px, radius 6 → 8px, secondary type 14 → 13px; a brand pack that carries the source's exact values (`--spacing-md: 12px`) closes them, which is the point of projecting through the contract.

## States

`neutral` / `warn` / `critical` are emphasis levels, not data variants, and mirror list-row exactly: neutral is the base (`--color-bg-surface` fill, `--color-border` hairline, quiet pill); warn borders and tints with `--color-accent` and colours the pill in the accent; critical is the one filled variant (`--color-accent` fill, `--color-accent-fg` throughout, including the pill and the chevron). The source's two variants map as `active` → neutral and `away` → warn, because the contract carries no positive hue and "away" is the state that asks for attention.

`hover` and `focus` are the row's own interaction states: hover has no colour change of its own (the pointer cursor and the chevron already say "opens"); `focus` is a visible `:focus-visible` outline in `--color-accent`, never removed.

## Data binding

`contract: null` — presentational, like list-row: the composing agent computes `name` / `meta` / `status` / `tone` from the scenario's own data. `status` is free text so the product's own word for presence or state passes through unchanged. Each absent optional renders nothing; `tone` absent or `"neutral"` renders the base. The click is the row's only output: it reaches the action bus as `person-row` with `{ intent: "open", name }`, and what "open" means belongs to the composition, not the row.

## Accessibility

One link (`<a>`) per row; accessible name = name + meta + status ("Amara Okafor, Last seen 2 min ago, On call") in that order, so the row is heard as one sentence. The monogram disc, the pill and the chevron are `aria-hidden` — the disc repeats the name's first letter, the pill's text is already in the name, and the chevron is decorative. Minimum touch target 44px tall. Visible `:focus-visible` outline in `--color-accent`. Contrast pairs meet AA at their sizes: `--color-fg` and `--color-fg-muted` on `--color-bg-surface` for the base and warn tint, `--color-accent-fg` on `--color-accent` for critical — including the pill, which inverts to an `--color-accent-fg` hairline on the accent fill. A long name truncates with an ellipsis; the full text stays in the accessibility tree. State never relies on colour alone: `tone` adds weight, the status text carries the state.
