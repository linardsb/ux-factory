# measure-live — the owner's live import pair, measured (#474)

Captured 2026-09-28 from `@brilliant-hq/mcp` 0.1.8 through the portal's own Import selection and Measure
fidelity (branch `feature/import-live-fidelity-474`), on a scratch `JOBS_DIR`. **The owner drew both frames and
pressed both buttons**; the implementer only copied the files. **Verbatim; a change is a re-capture, never an
edit.** Replayed by build-checks 43.16 and seeded into canvas-journey's I12.

The pair is the positive control for the live measurement (the plan's D3): a design the vocabulary can express,
drawn twice, differing in one colour.

- Both frames: auto layout vertical, fixed 320 × 82, padding `spacing.sm` (8), gap 4 (typed; Brilliant's gap
  field offers no token), no fill. `Amara Okafor` Inter 16 (`font.size.md`), regular, line height 1.63
  (Brilliant's `lineHeight.relaxed`, where 1.6 was typed). `Last seen 2 min ago` Inter 12 (`font.size.xs` —
  the nearest token Brilliant offered to the plan's 13 px), regular, line height 1.5.
- `faithful`: title `#1A1A1A`, subtitle `#6B7280` — the neutral pack's `--color-fg` and `--color-fg-muted`.
- `wrong`: identical, title `#1A7F37`.
- No mapping edit on either (`mapping.json` is `{}`): the frame reads `stack` and both texts `text` as recognised.
- Jev suggestions were ON (the owner's call, 2026-09-28): each transcript's `suggest` line says `ran: true`.

Two recipe changes were forced by what Brilliant sent on the first attempt, not tuned to a number: the importer
maps Brilliant spacing by ROLE (`import/brilliant.mjs` § "MAPPING IS BY ROLE"), and Brilliant's `spacing.lg` is
16 where the contract's is 24, so padding uses `spacing.sm` (8 in both); and Brilliant's line height is a
multiple of the size, not px.

| File | What it is |
|---|---|
| `<frame>.blueprint.txt` | `proposals/<frame>/source.json`'s `.text` — the lookup's blueprint |
| `<frame>.reference.png` | `imports/<id>.reference.png` — Brilliant's `export {png, scale: 1}`, RGBA, clear background |
| `<frame>.candidate.png` | `imports/<id>.candidate.png` — `tooling/measure-render.mjs`'s render, Chromium 149 on macOS |
| `<frame>.transcript.txt` | the import transcript's lines BEFORE the `measure` line, byte for byte (`.txt`: 40.25 refuses `.jsonl`) |
| `<frame>.measure.json` | the transcript's one `measure` line, byte for byte |
| `mapping.json` | the owner's `mapping.json` `parts`, shared by both frames |

Measured: faithful worst ΔE **1.3379** (text:Amara Okafor; root 0.7267, subtitle 1.0001), wrong **29.7584**
(text:Amara Okafor), against THRESHOLD 5.0. Both verdicts read `red` because the neutral pack fails one WCAG pair
(11/12); the ΔE is what separates them.

Since #482 (2026-09-29) the neutral pack passes 12/12: the replay in 43.16 derives faithful **green** and wrong **red**, and the wrong record now carries the wrong-but-green line. The committed `measure.json` lines still say `red` — the verdict at capture, verbatim.
