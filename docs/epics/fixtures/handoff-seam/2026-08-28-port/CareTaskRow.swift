//
// CareTaskRow.swift
//
// care-task-row and its status-chip child, SwiftUI, built from ./pack alone.
// Tokens come only from ./pack/tokens/ios/FactoryTokens.swift. Where the pack
// states a size as a bare literal (20px circle, 2px ring, 1px hairline, 44px
// minimum height) the value is derived from the component's own declared
// tokens so no bare number enters a view; those derivations are flagged
// below and in questions.md (Q9–Q11).
//
// Spec: pack/pack.json (components "care-task-row", "status-chip")
// Records: pack/contracts/care-task-row.contract.json, status-chip.contract.json
// Web reference: pack/wc/vd-care-task-row.mjs, vd-status-chip.mjs
//

import SwiftUI

// MARK: - Token contract layer

/// The specs name tokens as CSS variables (`--color-accent`); the iOS build names
/// them by DTCG path on the `neutral` pack. No mapping ships (Q1). This enum is
/// that mapping, limited to the tokens the two specs declare, plus `colorBg`
/// for the preview's page ground (Q33).
enum VDTokens {
    // --color-* (care-task-row + status-chip)
    static let colorBgSurface = Color(uiColor: FactoryTokens.neutralSemanticFgSurfaceColorBgSurface)
    static let colorFg        = Color(uiColor: FactoryTokens.neutralSemanticFgSurfaceColorFg)
    static let colorFgMuted   = Color(uiColor: FactoryTokens.neutralSemanticFgSurfaceColorFgMuted)
    static let colorBorder    = Color(uiColor: FactoryTokens.neutralSemanticFgSurfaceColorBorder)
    static let colorAccent    = Color(uiColor: FactoryTokens.neutralSemanticAccentColorAccent)
    static let colorAccentFg  = Color(uiColor: FactoryTokens.neutralSemanticAccentColorAccentFg)
    /// Page ground. Not in either component's token list; preview only.
    static let colorBg        = Color(uiColor: FactoryTokens.neutralSemanticFgSurfaceColorBg)

    // --radius-*
    static let radiusMd: CGFloat = FactoryTokens.neutralRadiusRadiusMd
    static let radiusLg: CGFloat = FactoryTokens.neutralRadiusRadiusLg

    // --spacing-*
    static let spacingXs: CGFloat = FactoryTokens.neutralSpacingSpacingXs
    static let spacingSm: CGFloat = FactoryTokens.neutralSpacingSpacingSm
    static let spacingMd: CGFloat = FactoryTokens.neutralSpacingSpacingMd

    // --type-* (font sizes only; the pack has no family, weight or line height)
    static let typeBody: CGFloat    = FactoryTokens.neutralTypeRampTypeBody
    static let typeEyebrow: CGFloat = FactoryTokens.neutralTypeRampTypeEyebrow
}

// MARK: - Records (contracts)

/// `type` enum from care-task-row.contract.json.
enum CareType: String, Codable, CaseIterable {
    case water, fertilise, repot, inspect

    /// "care verb — leading word of the row label, capitalised" (spec props).
    var verb: String { rawValue.prefix(1).uppercased() + rawValue.dropFirst() }
}

/// `status` / `value` enum shared by both contracts.
enum CareStatus: String, Codable, CaseIterable {
    case ok, due, overdue

    /// value → canonical chip label, as the web row derives it (`CHIP_LABELS`).
    var canonicalLabel: String { rawValue.uppercased() }
}

/// One `CareTask` record (care-task-row.contract.json). `plantId`, `due` and
/// `done` are carried, never rendered (spec Data binding).
struct CareTask: Codable, Identifiable, Equatable {
    var id: String
    var plantId: String
    var plantName: String
    var type: CareType
    var due: String   // format: date; kept as the wire string (Q29)
    var done: Bool
    var status: CareStatus
}

/// One `Status` record (status-chip.contract.json).
struct Status: Codable, Equatable {
    var value: CareStatus
    var label: String
}

// MARK: - status-chip

/// Sizes the web chip states as literals with no token behind them (Q5, Q10).
private enum StatusChipMetrics {
    /// WC `.pill { border: 1px }` — the spec's "hairline".
    static let hairline: CGFloat = VDTokens.spacingXs / 4
    /// WC `.pill { letter-spacing: 0.08em }` — a ratio, applied to the font size.
    static let trackingEm: CGFloat = 0.08
}

/// The one categorical state signal: a small pill naming a care state.
/// Never interactive, never free-standing (spec Usage).
struct StatusChip: View {
    let value: CareStatus
    let label: String

    /// Scales with Dynamic Type but never below `--type-eyebrow`
    /// ("Minimum `--type-eyebrow` size", spec Accessibility; Q7).
    @ScaledMetric(relativeTo: .caption2) private var scaledEyebrow: CGFloat = VDTokens.typeEyebrow

    init(value: CareStatus, label: String) {
        self.value = value
        self.label = label
    }

    init(_ record: Status) {
        self.init(value: record.value, label: record.label)
    }

    private var fontSize: CGFloat { max(scaledEyebrow, VDTokens.typeEyebrow) }

    // ok: fg-muted on bg-surface, border hairline.
    // due: accent text and border on bg-surface.
    // overdue: solid accent fill, accent-fg text — the only filled variant.
    private var foreground: Color {
        switch value {
        case .ok:      return VDTokens.colorFgMuted
        case .due:     return VDTokens.colorAccent
        case .overdue: return VDTokens.colorAccentFg
        }
    }

    private var background: Color {
        value == .overdue ? VDTokens.colorAccent : VDTokens.colorBgSurface
    }

    private var border: Color {
        value == .ok ? VDTokens.colorBorder : VDTokens.colorAccent
    }

    var body: some View {
        Text(label)
            .textCase(.uppercase)                       // prop says uppercase; CSS enforces it (Q24)
            .font(.system(size: fontSize))              // no family/weight token (Q3, Q4)
            .tracking(fontSize * StatusChipMetrics.trackingEm)
            .foregroundStyle(foreground)
            .padding(.vertical, VDTokens.spacingXs)
            .padding(.horizontal, VDTokens.spacingSm)
            .background(background, in: RoundedRectangle(cornerRadius: VDTokens.radiusLg))
            .overlay(
                RoundedRectangle(cornerRadius: VDTokens.radiusLg)
                    .strokeBorder(border, lineWidth: StatusChipMetrics.hairline)
            )
            .fixedSize()                                // WC `flex: none`: the chip never truncates
        // Plain text, no role, no tab stop (spec Accessibility). When the parent
        // speaks the state, the parent hides this element (see CareTaskRow).
    }
}

// MARK: - care-task-row

/// Sizes the web row and the spec state as literals with no token behind them.
/// Each is expressed from the row's own declared tokens so no bare size enters
/// the view; they are literals in disguise and should be tokens (Q9–Q11).
private enum RowMetrics {
    /// WC `.row { border: 1px }`.
    static let hairline: CGFloat = VDTokens.spacingSm / 8
    /// WC `.circle { border: 2px }`.
    static let ringWidth: CGFloat = VDTokens.spacingSm / 4
    /// WC `.circle { width: 20px; height: 20px }`.
    static let circleDiameter: CGFloat = VDTokens.spacingMd + VDTokens.spacingSm / 2
    /// Spec Accessibility "minimum 44px tall" — the HIG tap target.
    static let minTapTarget: CGFloat = VDTokens.spacingMd * 2 + VDTokens.spacingSm + VDTokens.spacingSm / 2
}

/// The leading check circle. Decorative: the row speaks the checked state itself.
private struct CheckCircle: View {
    let checked: Bool
    /// `status == .overdue`: ring moves to accent, the row's one escalation.
    let escalated: Bool

    private var ring: Color {
        (checked || escalated) ? VDTokens.colorAccent : VDTokens.colorBorder
    }

    var body: some View {
        Circle()
            .fill(checked ? VDTokens.colorAccent : Color.clear)
            .overlay(Circle().strokeBorder(ring, lineWidth: RowMetrics.ringWidth))
            .frame(width: RowMetrics.circleDiameter, height: RowMetrics.circleDiameter)
            .accessibilityHidden(true)
    }
}

/// One row of the "Today" list: check circle left, "Water Monstera" label centre,
/// status-chip right. Tapping anywhere on the row toggles `checked`; the
/// primary-button commits the batch (spec Usage).
struct CareTaskRow: View {
    /// `id` from the record — what the log-care commit sends (`data-task-id`; Q15).
    let taskID: String
    let type: CareType
    let plantName: String
    let status: CareStatus
    /// Marked-done this session, awaiting the log-care commit. Owned by the
    /// parent (Q14); defaults to false at the call site.
    @Binding var checked: Bool
    /// Overrides the chip's canonical label only (vocabulary `chipRule`; Q17).
    var chipLabel: String? = nil
    /// Mirrors the web `vd-toggle` event: `detail: { id, checked }`.
    var onToggle: ((_ taskID: String, _ checked: Bool) -> Void)? = nil

    @ScaledMetric(relativeTo: .body) private var bodySize: CGFloat = VDTokens.typeBody

    init(
        taskID: String,
        type: CareType,
        plantName: String,
        status: CareStatus,
        checked: Binding<Bool>,
        chipLabel: String? = nil,
        onToggle: ((_ taskID: String, _ checked: Bool) -> Void)? = nil
    ) {
        self.taskID = taskID
        self.type = type
        self.plantName = plantName
        self.status = status
        self._checked = checked
        self.chipLabel = chipLabel
        self.onToggle = onToggle
    }

    /// DataContract path: bind a whole `CareTask` record.
    init(
        task: CareTask,
        checked: Binding<Bool>,
        chipLabel: String? = nil,
        onToggle: ((_ taskID: String, _ checked: Bool) -> Void)? = nil
    ) {
        self.init(
            taskID: task.id,
            type: task.type,
            plantName: task.plantName,
            status: task.status,
            checked: checked,
            chipLabel: chipLabel,
            onToggle: onToggle
        )
    }

    /// "Water Monstera" — capitalised verb + plant name.
    private var label: String { "\(type.verb) \(plantName)" }

    var body: some View {
        Button {
            checked.toggle()
            onToggle?(taskID, checked)
        } label: {
            HStack(spacing: VDTokens.spacingMd) {
                CheckCircle(checked: checked, escalated: status == .overdue)

                Text(label)
                    .font(.system(size: bodySize))
                    .foregroundStyle(checked ? VDTokens.colorFgMuted : VDTokens.colorFg)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // The chip stays as-is when checked: urgency is fact until the log commits.
                StatusChip(value: status, label: chipLabel ?? status.canonicalLabel)
            }
            .padding(.vertical, VDTokens.spacingSm)
            .padding(.horizontal, VDTokens.spacingMd)
            .frame(maxWidth: .infinity, minHeight: RowMetrics.minTapTarget)
            .background(VDTokens.colorBgSurface, in: RoundedRectangle(cornerRadius: VDTokens.radiusMd))
            .overlay(
                RoundedRectangle(cornerRadius: VDTokens.radiusMd)
                    .strokeBorder(VDTokens.colorBorder, lineWidth: RowMetrics.hairline)
            )
            .contentShape(RoundedRectangle(cornerRadius: VDTokens.radiusMd))
        }
        .buttonStyle(.plain)                            // system press feedback only (Q13)
        // Whole row is one element (button role=checkbox); the chip's text is
        // swallowed here, the iOS analogue of aria-hidden on the chip.
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)                      // "Water Monstera"
        .accessibilityValue(status.rawValue)            // "overdue" — completes "action + plant + status"
        .accessibilityAddTraits(checked ? .isSelected : [])   // aria-checked analogue (Q19)
        .accessibilityHint(checked ? "Double tap to unmark" : "Double tap to mark done")   // (Q20)
        .accessibilityIdentifier("care-task-row.\(taskID)")   // data-task-id
    }
}

// MARK: - Usage / preview

/// Minimal "Today" list using the spec's example props and the contract's
/// sample record. State lives here, as the primary-button's batch would.
struct CareTaskRowExample: View {
    @State private var checkedIDs: Set<String> = ["task-02"]

    private let tasks: [CareTask] = [
        // pack.json care-task-row `example`: water · Monstera · overdue
        CareTask(id: "task-01", plantId: "plant-01", plantName: "Monstera",
                 type: .water, due: "2026-07-10", done: false, status: .overdue),
        CareTask(id: "task-02", plantId: "plant-02", plantName: "Snake plant",
                 type: .fertilise, due: "2026-07-14", done: false, status: .due),
        // Sample record from the spec's Data binding section
        CareTask(id: "task-03", plantId: "plant-03", plantName: "Fiddle-leaf fig",
                 type: .water, due: "2026-07-12", done: false, status: .overdue),
        CareTask(id: "task-04", plantId: "plant-04", plantName: "Pothos",
                 type: .inspect, due: "2026-07-15", done: false, status: .ok),
        CareTask(id: "task-05", plantId: "plant-05",
                 plantName: "Bird of paradise on the north windowsill by the door",
                 type: .repot, due: "2026-07-15", done: false, status: .ok),
    ]

    private func isChecked(_ id: String) -> Binding<Bool> {
        Binding(
            get: { checkedIDs.contains(id) },
            set: { on in if on { checkedIDs.insert(id) } else { checkedIDs.remove(id) } }
        )
    }

    var body: some View {
        ScrollView {
            VStack(spacing: VDTokens.spacingSm) {
                ForEach(tasks) { task in
                    CareTaskRow(task: task, checked: isChecked(task.id)) { id, checked in
                        // vd-toggle analogue; the primary-button would batch these.
                        _ = (id, checked)
                    }
                }

                // status-chip alone: pack.json `example` and the contract's sample record.
                HStack(spacing: VDTokens.spacingSm) {
                    StatusChip(value: .ok, label: "OK")
                    StatusChip(value: .due, label: "DUE")
                    StatusChip(Status(value: .overdue, label: "3 DAYS OVERDUE"))
                }
                .padding(.top, VDTokens.spacingMd)
            }
            .padding(VDTokens.spacingMd)
        }
        .background(VDTokens.colorBg)
    }
}

struct CareTaskRow_Previews: PreviewProvider {
    static var previews: some View {
        CareTaskRowExample()
            .previewDisplayName("Today list")

        CareTaskRowExample()
            .environment(\.sizeCategory, .accessibilityLarge)
            .previewDisplayName("Today list · AX large")
    }
}
