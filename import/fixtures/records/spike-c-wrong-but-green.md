**Import record — spike-c-wrong-but-green**

**Source**

- tool: `brilliant`
- project: not recorded
- element ids: `1db1b29957b949ca`, `d9512c65b8ba59a7`, `4e5f949b06664b86`, `0677e5352f9b7e97`, `ce6edd5ebb75ca12`, `4678ba04551aae0f`, `573be45a182c5b97`, `ee43cdb97fffec7b`
- bound: yes — every tokenisable slot arrived with a source token
- file: `import/fixtures/spike-c-instance.blueprint.txt`
- sha256: `038f7c03ef138851f9cdb4cd5c3accb5ae6b2ae86469f56bd0f22af8f31b7b3f`

**Tokens used**

Contract tokens — bound spacing, snaps and the mapping's roles:

| token | slots |
| --- | --- |
| `--color-fg` | mapping.color.text.primary |
| `--color-fg-muted` | mapping.color.text.secondary |
| `--spacing-sm` | layout.pad[1], layout.pad[3] |
| `--spacing-xs` | layout.gap, layout.pad[0], layout.pad[2] |

Source refs — the source's own token names on bound slots:

| ref | slots |
| --- | --- |
| `$color.primary.container` | style.fill |
| `$color.success` | style.fill |
| `$color.success.container` | style.fill |
| `$color.text.disabled` | style.fill |
| `$color.text.primary` | style.fill |
| `$color.text.secondary` | style.fill |
| `$font.family` | text.family |
| `$font.lineHeight.normal` | text.lineHeight |
| `$font.size.md` | text.size |
| `$font.size.sm` | text.size |
| `$font.size.xs` | text.size |
| `$radius.full` | style.radius |

**Structure**

| path | kind | name | recognised as |
| --- | --- | --- | --- |
| `ir.children[0]` | instance | Frame 1 | `list-row` (scored) |
| `ir.children[0].children[0]` | shape | Avatar | NOT COVERED |
| `ir.children[0].children[1]` | frame | Text block | `stack` (structural-fallback) |
| `ir.children[0].children[1].children[0]` | text | Text 1 | `text` (scored) |
| `ir.children[0].children[1].children[1]` | text | Text 2 | `text` (scored) |
| `ir.children[0].children[2]` | frame | Status chip | `status-chip` (scored) |
| `ir.children[0].children[2].children[0]` | text | Text 3 | `text` (scored) |
| `ir.children[0].children[3]` | icon | Chevron | NOT COVERED |

**Snaps**

Bound source — nothing to snap.

**Drops**

**`never-read` — closed**

**`read-then-dropped` — 13 open**

- `literal-size` at `ir.children[0]` `style.size.w` — `360` — fixed 360px — a size prop of {fill,hug} cannot carry it
- `literal-size` at `ir.children[0].children[0]` `style.size.w` — `32` — fixed 32px — a size prop of {fill,hug} cannot carry it
- `literal-size` at `ir.children[0].children[0]` `style.size.h` — `32` — fixed 32px — a size prop of {fill,hug} cannot carry it
- `no-token` at `ir.children[0].children[1]` `pad[0]` — `0` — no contract token for role $spacing.none (source value 0px) (1-value pad, expands to all four sides)
- `qualifier-dropped` at `ir.children[0].children[1].children[0]` `style.size.h` — `100` — hug:100 → hug (spike C README:92)
- `qualifier-dropped` at `ir.children[0].children[1].children[1]` `style.size.h` — `100` — hug:100 → hug (spike C README:92)
- `no-token` at `ir.children[0].children[2]` `gap` — `0` — no contract token for role $spacing.none (source value 0px)
- `qualifier-dropped` at `ir.children[0].children[2].children[0]` `style.size.w` — `100` — hug:100 → hug (spike C README:92)
- `qualifier-dropped` at `ir.children[0].children[2].children[0]` `style.size.h` — `100` — hug:100 → hug (spike C README:92)
- `literal-size` at `ir.children[0].children[3]` `style.size.w` — `8.73` — fixed 8.73px — a size prop of {fill,hug} cannot carry it
- `literal-size` at `ir.children[0].children[3]` `style.size.h` — `16` — fixed 16px — a size prop of {fill,hug} cannot carry it
- `unmapped-role` at `mapping` `mapping.color.surface` — `#F8F8F8` — M1 is colour-text-only by scope choice (plan § Out of Scope); mapped under M2
- `unmapped-role` at `mapping` `mapping.color.outline.variant` — `#E1E1E1` — same scope choice; mapped under M2

**`read-but-never-emitted` — 9 open**

- `no-vocabulary-slot` at `ir.children[0].children[0]` `node` — `Avatar` — no vocabulary entry scored at or above 0.5 (best: avatar at 0.45) and the node carries no layout — not covered
- `no-vocabulary-slot` at `ir.children[0].children[3]` `node` — `Chevron` — no vocabulary entry scored at or above 0.5 (best: icon at 0.375) and the node carries no layout — not covered
- `unfillable-required-prop` at `build` `list-row.value` — no value — list-row.value is required and a design read carries nothing that fills it — the row's primary computed figure as a display string, e.g. "85", "−85", "94%" — rendered as-is, no rounding
- `no-vocabulary-slot` at `build` `ir.children[0].children[0]` — no value — list-row declares children: [] — a descendant read as not covered has no prop to land in and is not emitted
- `no-vocabulary-slot` at `build` `ir.children[0].children[3]` — no value — list-row declares children: [] — a descendant read as not covered has no prop to land in and is not emitted
- `no-contract-role` at `mapping` `mapping.color.primary.container` — `#F2F5FA` — the contract has no container role
- `no-contract-role` at `mapping` `mapping.color.success.container` — `#F1F7F2` — the contract has no success role
- `no-contract-role` at `mapping` `mapping.color.success` — `#00C950` — the contract has no success role
- `no-contract-role` at `mapping` `mapping.color.text.disabled` — `#C6C6C6` — the contract has no disabled role

**Fidelity**

Verdict: **red**.

**Wrong but green.** Every WCAG pair passes (12/12) and the worst region reads ΔE 17.9597 against a threshold of 5.0: the colours are legible and not the source's.

Worst region: `subtitle` at ΔE 17.9597 (ink-colour, CIEDE2000) against a threshold of 5.0; 7 regions scored.

| region | ΔE | excluded |
| --- | --- | --- |
| `row` | 2.0136 | — |
| `avatar` | 0.0207 | — |
| `text-block` | 15.5356 | — |
| `title` | 13.9654 | — |
| `subtitle` | 17.9597 | — |
| `chip` | 0.1023 | — |
| `chip-text` | 0.2833 | — |
| `chevron` | — | chevron(144px < 256) |

Excluded, and named rather than dropped: `chevron(144px < 256)`.

- reference sha256: `ba743a9318eb0f1f85b3d508d3c27c211910d3f9baa63b18020734a455865da8` — Brilliant's 06.svg for instance 1db1b29957b949ca, rasterised in Chromium at DSF 1 (S3)
- candidate sha256: `8fa25315e6a7b09f47ed696083d98a2775a1d15330725b54f6a680cf970f7746` — a hand-authored harness DOM with M1's two roles set from the pack (S3 capture.txt), not a render of this record's IR through its mapping

WCAG: 12/12 pairs pass.

**Provenance**

- mode: 1 — the component joins the system
- licence: not recorded
- attribution: Drawn in Brilliant's web editor under its default design system (spike C, 2026-08-27); candidate colours from spike A run 3's Polaris v7 pack (Shopify Polaris v7.0.0 public token export)

**Elapsed**

- ratify: not timed
- recognition: not timed
