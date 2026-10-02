# Notes on the pack

## What it is

A generated design-handoff pack for "Verdant", a fictional plant-care demo (`pack/pack.json` `$description`, `scenario: "verdant"`). It carries four layers:

- **ComponentSpecs** for 20 components: a machine head (props, tokens, states, children, example) plus prose sections (Usage, States, Data binding, Accessibility). `pack/pack.json` `components[]`.
- **DataContracts**, JSON Schema 2020-12, for the four components that bind API records: `pack/contracts/*.contract.json`. `care-task-row` binds `CareTask`; `status-chip` binds `Status`.
- **Tokens**: the DTCG source `pack/tokens.dtcg.json` (two groups, `contract` and `neutral`, with identical leaf names) and three builds: `pack/tokens/css/contract.css` + `neutral.css`, `pack/tokens/android/tokens.xml`, `pack/tokens/ios/FactoryTokens.swift`.
- **Portability**: three web components (`pack/wc/*.mjs`, `pack/wc/README.md`) as the "tech-agnostic proof of the token contract", and a Figma round-trip note (`pack/figma-import.md`, parity `null`, pending a real run).

`pack/vocabulary.json` is the same spec head re-cut for agents, with the contract inlined and three composition rules. `pack/pack.bundle.json` is every file above inlined as strings; I checked it byte-for-byte against the loose files and it adds nothing.

## What `pack/tokens/ios/FactoryTokens.swift` gives you

Observed from the file:

- 39 `public static let` constants on `public class FactoryTokens`, `import UIKit`.
- Colours as `UIColor(red:green:blue:alpha:)`: 9 primitives (`neutralPrimitivesColor*`) and 15 semantic aliases (`neutralSemanticFgSurfaceColor*`, `neutralSemanticAccentColor*`, `neutralSemanticInverseColor*`). Semantic values equal their primitives, so both are usable.
- Dimensions as unitless `CGFloat`: spacing xs to 4xl (4, 8, 16, 24, 32, 48, 64, 96), radius sm/md/lg (4, 8, 16), type ramp h3/body/caption/eyebrow (20, 16, 13, 12), layout maxw/gutter, `motion-rise` (20).
- A one-line doc comment on some colours ("1px lines, dividers", "labels, captions, secondary text") that is the only semantic guidance in the file.

Every colour, spacing, radius and type size the two specs list (`pack/pack.json` `tokens[]` for `care-task-row` and `status-chip`) has an iOS constant, once you work out the name mapping.

## What it does not give you

- **A contract layer.** The specs name tokens as `--color-accent`; the iOS file is named by the `neutral` pack's DTCG path (`neutralSemanticAccentColorAccent`). The `contract` group in `pack/tokens.dtcg.json` has no iOS build and there is no mapping table. `CareTaskRow.swift` carries a `VDTokens` enum that is that mapping (Q1).
- **SwiftUI types.** `UIColor` and `CGFloat` only; no `Color`, no `Font`, no `EdgeInsets`.
- **Fonts.** `contract/fonts/font-body` etc. exist in `pack/tokens.dtcg.json` and the CSS builds but were dropped from the iOS build. No family, weight, line height or letter-spacing anywhere in the pack (Q3–Q6).
- **Responsive type.** `type-display`, `h1`, `h2`, `lead` are CSS `clamp()` values and were dropped; only the fixed sizes (h3, body, caption, eyebrow) made it across. No Dynamic Type guidance (Q7).
- **Shadows and motion.** `shadow-*`, all durations and easings are absent (only `motion-rise` survived, presumably because it is a `dimension`).
- **Derived colours.** The `color-mix()` tokens (`color-accent-wash`, `color-fg-on-inverse-muted`, `color-inverse-line`, etc.) are absent.
- **Appearance variants.** Single light-mode values; no dark, no increased-contrast (Q8).
- **Component-level sizes.** The web sources state 20px circle, 2px ring, 1px hairline, 44px min height, 0.08em tracking, 2px focus outline as literals; none is a token (Q9–Q12).

## Where the spec for care-task-row and status-chip lives

| Layer | care-task-row | status-chip |
| --- | --- | --- |
| Machine head: props, tokens, states, children, example | `pack/pack.json` `components[]` entry `"care-task-row"` (`class: "vd-care-task-row"`) | `pack/pack.json` entry `"status-chip"` (`class: "vd-status-chip"`) |
| Prose: Usage, States, Data binding, Accessibility | `pack/pack.json` same entry, `sections[]` | `pack/pack.json` same entry, `sections[]` |
| Record shape | `pack/contracts/care-task-row.contract.json` (`CareTask`: id, plantId, plantName, type, due, done, status; `additionalProperties: false`) | `pack/contracts/status-chip.contract.json` (`Status`: value, label) |
| Agent vocabulary (head + usage + contract inlined) | `pack/vocabulary.json` `components["care-task-row"]` | `pack/vocabulary.json` `components["status-chip"]` |
| Composition rules | `pack/vocabulary.json` `composition.chipRule`: the row always renders one chip derived from its own `status`; an explicit chip child only overrides the label, and its value must equal the parent's | same |
| Reference implementation (web) | `pack/wc/vd-care-task-row.mjs` | `pack/wc/vd-status-chip.mjs` |
| Element API | `pack/wc/README.md` § `<vd-care-task-row>` | `pack/wc/README.md` § `<vd-status-chip>` |

Two things in these files disagree and are worth knowing before reading further:

1. The web component's attribute and record field is `action`; the spec, contract and vocabulary say `type`. A contract-valid record assigned to the web component renders an empty verb (Q16). I followed `type`.
2. The spec head lists four row props and no `id`; the Data binding table and the web component both carry the task id (`data-task-id` / `task-id`) because the log-care commit needs it (Q15). I added `taskID`.

## Compile

`swiftc` 6.2.4 with the iPhoneSimulator 26.2 SDK is available; `CareTaskRow.swift` is compiled together with `pack/tokens/ios/FactoryTokens.swift` against an iOS 16 simulator target. Result is recorded at the end of `translation.md`.
