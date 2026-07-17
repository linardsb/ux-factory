# Web Component wrappers

Framework-agnostic custom elements for the three Verdant components that carry data
(epic #1, ticket #12; folds spike 3). Each is a single self-registering ES module:
shadow-DOM encapsulated, styled **only** by the semantic tokens its ComponentSpec head
declares, consuming the same DataContract-shaped records the pack's `contracts/` validate.

**Declared trajectory: every component ships as a standalone custom element, themed by
the token contract alone. The canonical handoff form remains copy-paste HTML/CSS reading
only semantic tokens — these wrappers are the tech-agnostic proof of the token contract,
not a replacement for it.** The three components without wrappers here (`primary-button`,
`stat-tile`, `screen-header`) stay HTML/CSS-canonical; this trajectory covers them.

Verdant is a fictional demo scenario — no real company, users, or data.

## Consumption

1. Load the token layers (or your own pack that defines the same semantic tokens):

```html
<link rel="stylesheet" href="tokens/css/contract.css" />
<link rel="stylesheet" href="tokens/css/neutral.css" />
```

2. Import a module — it registers its tag (and its chip child) idempotently:

```html
<script type="module">
  import "./wc/vd-plant-card.mjs";
  document.querySelector("vd-plant-card").data =
    { id: "p-014", name: "Monstera", species: "Monstera deliciosa", status: "due", lastWatered: "2026-07-14T08:30:00Z" };
</script>
```

The modules are relative-import self-contained (`vd-plant-card.mjs` and
`vd-care-task-row.mjs` import `./vd-status-chip.mjs`) — keep the three files together.

## API

### `<vd-status-chip>` — spec: status-chip, contract: `contracts/status-chip.contract.json`

| Surface | Name | Notes |
| --- | --- | --- |
| attribute | `value` | `ok \| due \| overdue` — selects the variant |
| attribute | `label` | visible pill text |
| property | `data` | full `Status` record; reflects to the attributes |
| events | — | never interactive (spec: never a tap target) |

### `<vd-plant-card>` — spec: plant-card, contract: `contracts/plant-card.contract.json`

| Surface | Name | Notes |
| --- | --- | --- |
| attribute | `name`, `species`, `status`, `photo-url`, `plant-id` | `species` absent → line omitted; `photo-url` absent → monogram placeholder |
| attribute | `href` | navigation target of the internal `<a>`; defaults to `#` |
| property | `data` | full `Plant` record; maps `id→plant-id`, `photoUrl→photo-url`; `lastWatered` accepted, not rendered |
| event | `vd-select` | `bubbles + composed`, `detail: { id }` — fires on click alongside navigation |

### `<vd-care-task-row>` — spec: care-task-row, contract: `contracts/care-task-row.contract.json`

| Surface | Name | Notes |
| --- | --- | --- |
| attribute | `action`, `plant-name`, `status`, `task-id` | label renders as capitalised action + plant name |
| attribute | `checked` | boolean — presence = true; toggled by click/Space |
| property | `data` | full `CareTask` record; `plantId`/`due` accepted, never rendered |
| property | `checked` | boolean, reflects the attribute both directions |
| event | `vd-toggle` | `bubbles + composed`, `detail: { id, checked }` |

Attributes and the `data` property are one model — `data` reflects to attributes, and an
attribute set after `data` wins (last write). Assigning `data = null` removes the record's
reflected attributes and renders the empty state (list-item recycling); the row's `checked`
is interaction state, not record state, and is untouched.

## Theming

The wrappers' shadow CSS references **only** the semantic tokens declared in each spec
head — no colour literals, no `var()` fallbacks. Custom properties inherit through the
shadow boundary, so the theming story is exactly the token contract:

- load a different pack in place of `neutral.css` → every wrapper re-skins;
- or override tokens at any scope: `<div style="--color-accent: …">` re-skins just the
  elements inside it.

Never redefine a token inside the wrappers or add `var()` fallbacks — both would mask
pack-level overrides (the contract layer owns fallbacks).

## Slots

Deliberately absent. These specs pin bounded composition ("never nest a card in a card";
the chip is "always a child … never free-standing") and the contracts close their shapes
with `additionalProperties: false` — light-DOM slots would reopen what the contract closes.
Composition happens through data, not markup injection.

## React

- **React 19**: primitives pass as JSX attributes; a prop matching an instance property —
  `data={record}` — is assigned as a DOM **property** (React 19 release notes, "Support for
  Custom Elements"). Both directions verified in `tooling/wc-sandbox/react.html`.
- **Custom events are the one gap**: React 19 has no declarative binding for them —
  `onVdToggle` silently no-ops. Attach via a ref:

```jsx
<vd-care-task-row ref={(el) => {
  if (!el) return;
  const h = (e) => onToggle(e.detail);
  el.addEventListener("vd-toggle", h);
  return () => el.removeEventListener("vd-toggle", h);
}} data={task} />
```

- **React ≤18** sets attributes only (an object prop stringifies) — assign `el.data`
  through the same ref pattern instead.

Other frameworks (Vue, Svelte, Angular) bind custom-element properties and events
declaratively; no adapter needed.
