# Web → iOS translation

Every place the spec (or its web reference) spoke web, and what it became in `CareTaskRow.swift`. "None" in the last column means no sensible iOS translation exists and the row says what was done instead.

| # | Web term (where) | iOS translation | Sensible? |
| --- | --- | --- | --- |
| T1 | `--color-bg-surface`, `--color-fg`, `--color-fg-muted`, `--color-border`, `--color-accent`, `--color-accent-fg` (pack.json `tokens[]`) | `VDTokens.colorBgSurface` … `colorAccentFg`, each `Color(uiColor: FactoryTokens.neutralSemantic…)` | Yes, via a mapping the pack does not ship (Q1) |
| T2 | `--radius-md`, `--radius-lg` | `VDTokens.radiusMd/Lg` → `RoundedRectangle(cornerRadius:)` | Yes |
| T3 | `--spacing-xs/sm/md` | `VDTokens.spacingXs/Sm/Md` → `.padding`, `HStack(spacing:)` | Yes |
| T4 | `--type-body` 16px, `--type-eyebrow` 12px | `@ScaledMetric` seeded from `VDTokens.typeBody/typeEyebrow` → `.font(.system(size:))`; chip floors at the token | Yes; scaling is my call (Q7) |
| T5 | `px` everywhere | `pt`, 1:1 (Q28) | Yes |
| T6 | `font: inherit` / `--font-body` system stack (WC row, contract.css) | `.system(size:)`; no family or weight token exists on iOS (Q3, Q4) | Partial |
| T7 | `letter-spacing: 0.08em` (WC chip) | `.tracking(fontSize * 0.08)` | Yes, ratio kept |
| T8 | `text-transform: uppercase` (WC chip) | `.textCase(.uppercase)` | Yes |
| T9 | `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` (WC label) and "truncates with ellipsis" (spec) | `.lineLimit(1).truncationMode(.tail)` | Yes |
| T10 | `display: flex; align-items: center; gap` (WC row) | `HStack(spacing:)` (centre-aligned by default) | Yes |
| T11 | `flex: 1; min-width: 0` on the label; `flex: none` on the chip and circle | `.frame(maxWidth: .infinity, alignment: .leading)` on the label; `.fixedSize()` on the chip; fixed frame on the circle | Yes |
| T12 | `width: 100%` (WC row) | `.frame(maxWidth: .infinity)` | Yes |
| T13 | `min-height: 44px` (WC) / "minimum 44px tall" (spec) | `.frame(minHeight: RowMetrics.minTapTarget)` derived from tokens (Q11) | Yes |
| T14 | `border: 1px solid --color-border`, "hairline" | `.overlay(RoundedRectangle.strokeBorder(_, lineWidth: hairline))`, 1pt derived (Q10) | Yes |
| T15 | `.circle` 20px, `border: 2px`, `border-radius: 50%` (WC) | `Circle()` in a 20pt frame with a 2pt `strokeBorder`, both derived (Q9) | Yes |
| T16 | `.row.overdue .circle { border-color: accent }` | `CheckCircle(escalated: status == .overdue)` → ring `colorAccent` | Yes |
| T17 | `.row.checked .circle { background: accent; border-color: accent }` | `Circle().fill(colorAccent)` + accent ring when `checked` | Yes |
| T18 | `.row.checked .label { color: fg-muted }` | `.foregroundStyle(checked ? colorFgMuted : colorFg)` | Yes |
| T19 | `.pill.due` / `.pill.overdue` variant classes; `class="vd-status-chip"`, `vd-care-task-row` | `switch value` inside `StatusChip`; type names `StatusChip`, `CareTaskRow`; no class strings | Yes |
| T20 | `<button role="checkbox">` | `Button` with `.buttonStyle(.plain)`; no checkbox trait on iOS, so `.isButton` (implicit) + `.isSelected` while checked (Q19) | Partial |
| T21 | `aria-checked` mirroring `checked` | `.accessibilityAddTraits(checked ? .isSelected : [])` | Partial; iOS 17 `.isToggle` is the alternative |
| T22 | `aria-label` = "Water Monstera, due" (accessible name = action + plant + status) | `.accessibilityLabel("Water Monstera")` + `.accessibilityValue("due")` (Q21) | Yes |
| T23 | `aria-hidden="true"` on the chip inside the row | `.accessibilityElement(children: .ignore)` on the row, so the chip is not a separate element; the circle is also `.accessibilityHidden(true)` | Yes |
| T24 | Chip "text in a `<span>`, no role, no tabindex" | Plain `Text`, default static-text trait, not focusable | Yes |
| T25 | (no hint on the web; VoiceOver has one) | `.accessibilityHint("Double tap to mark done" / "…unmark")` (Q20) | Added |
| T26 | `data-task-id` attribute / `task-id` | `taskID` property and `.accessibilityIdentifier("care-task-row.<id>")` | Yes |
| T27 | `:focus-visible { outline: 2px solid accent; outline-offset: 2px }` | Nothing drawn; the system focus ring under Full Keyboard Access is not app-styled (Q12) | None |
| T28 | `cursor: pointer` | No cursor on iOS; `.contentShape` makes the whole rounded row tappable | None needed |
| T29 | `<button>` firing click on Space/Enter | `Button` handles hardware keyboard via Full Keyboard Access | Yes |
| T30 | `vd-toggle` custom event, `detail: { id, checked }`, `bubbles + composed` | `onToggle: (taskID, checked) -> Void` closure plus the `@Binding var checked` the parent owns (Q14) | Yes |
| T31 | Attribute / `data` property dual API, `data = null` empty state (README) | Two initialisers: props, or `init(task: CareTask, …)`. No empty state; SwiftUI recycles by identity, not by nulling a record | Partial |
| T32 | Shadow DOM encapsulation; "custom properties inherit through the shadow boundary" | No equivalent needed: Swift scoping. Theming by swapping `FactoryTokens` at build time; no runtime override scope like `<div style="--color-accent:…">` | None (not needed) |
| T33 | `:host { display: block }` / `inline-block` | Row fills width in a `VStack`; chip is intrinsically sized | Yes |
| T34 | `attributeChangedCallback` re-render | SwiftUI re-renders on property or binding change | Yes |
| T35 | DOM structure `button > span.circle + span.label + vd-status-chip` | `Button { HStack { CheckCircle; Text; StatusChip } }` | Yes |
| T36 | CSS `--motion-*` transitions | None on the web component either; no motion tokens on iOS. No animation (Q25) | None needed |
| T37 | JSON Schema `format: date` for `due` | `String` field (Q29) | Partial |
| T38 | `additionalProperties: false` | `Codable` struct; extra keys are ignored on decode, not rejected | Partial |

## Compile result

Observed: `swiftc -parse-as-library -emit-library -sdk <iPhoneSimulator26.2.sdk> -target x86_64-apple-ios16.0-simulator pack/tokens/ios/FactoryTokens.swift CareTaskRow.swift` produced `libCareTaskRowCheck.dylib` with no Swift errors or warnings (one clang `-Wincompatible-sysroot` linker warning from invoking `swiftc` outside Xcode). Not run in a simulator; the preview has not been rendered.
