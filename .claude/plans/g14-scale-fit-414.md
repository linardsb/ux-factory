# G14 widened — the vet stops being colour only (#414)

Epic #295. Raised by PR #413's review (F3): the fix pass documented the gap rather than closing it,
because closing it is a PRD decision. This ticket takes the decision the issue proposed.

## The defect the rule could not catch

`docs/epics/canvas-design-import.prd.md:168` asks a ported pack for "its baselines and an
accessibility vet". The vet is `checkPairs(values, RULESET.wcagPairs)` — colour only.

Plus UI was removed at #296 for two reasons, and G14 covers one. `git show
e8982c7:system/tokens.plusui.css` carries both halves in the same header, observed:

- `WCAG (RULESET.wcagPairs …): 12/12 pairs pass` · `No contrast negotiation was needed`
- `Scale imported from this file: spacing (8 of 35 value(s) … dropped: 1px, 2px, 4px, … 320px),
  radius (3 of 8 …), type ramp (8 of 13 …), shadows (3 of 6 …)`

So the pack that produced G14 satisfies G14. The evidence that it did not fit the system was
already printed in its own header, and nothing in the rule asked anyone to read it.

## The call

Widen the rule, keeping it written rather than gated — the issue's wording, verbatim:

> A ported pack, when one lands through the export path, gets its baselines, an accessibility vet
> **and a fit-to-system read of the imported spacing, radius and type ramp against the contract's
> own scale — stated in the PR, with the dropped values named** — in the same PR that adds it.

The material the read needs already exists: `fillScales` records `imported[family].dropped`, and
`buildPack` writes it into the pack header as the `Scale imported from this file:` line. The rule
asks a reviewer to read what the importer already states. No new code, no gate.

**Shadow is named nowhere in the clause** though `fillScales` maps four families and `dropped`
covers shadow. Kept as the issue wrote it — it is the owner's proposal, and widening it further is
a second decision, not this one's. Flagged in the PR body.

## Tasks

1. `docs/epics/canvas-design-import.prd.md:168` — the decision text, plus why it was widened.
   → verify: the bullet names the fit read and still closes D5.
2. `docs/epics/canvas-design-import.prd.md:220` — the G14 grill row. The grill's **question** stays
   verbatim (rewriting it would falsify what was asked on 2026-08-28); the answer column carries the
   widening, marked `amended at #414`.
   → verify: `git grep -n 'G14'` — row and decision agree.
3. `docs/epics/canvas-design-import.prd.md` §Amendments — a dated entry, the house convention
   from #396.
   → verify: entry sits under `## Amendments` in the existing shape.
4. `system/pack-import.mjs` header, the `ADDING A PACK TO THE SHIPPED DOCK` block — the invariant
   lives in the file that owns it (CLAUDE.md §Ground rules).
   → verify: **+2 lines at most** (budget below).
5. `docs/figma-runbook.md` — replace the colour-only caveat PR #413 added with the widened rule,
   pointing at the header line that carries the dropped values. Its removal note below said Plus UI
   shipped "with neither baselines nor a vet", which contradicts the `12/12 pairs pass` this ticket
   now cites two paragraphs above; corrected to no baselines + a scale out of step, with the passing
   colour vet named as the reason the rule needed widening.
   → verify: no copy of the rule contradicts the PRD.

## Line budget, derived

`pack-import.mjs` is in `loc-summary`'s **runtime** group, and `approach.html` renders that group's
`files` and `linesApprox`. Counted against `origin/main` (the generator counts `split("\n").length`,
i.e. `wc -l` + 1 per file):

| | raw | `round100` | committed |
|---|---|---|---|
| runtime (76 files) | 30460 + 76 = **30536** | 30500 | 30500 ✓ |
| grand total (113 files) | 30536 + 7911 = **38447** | 38400 | 38400 ✓ |

Both match the committed artifact, so the arithmetic is confirmed. Headroom: runtime flips at
+14 lines, the **grand total flips at +3** (38450 → 38500). So **≤2 added lines keeps
`loc-summary.json` byte-identical** — no regen, no drift question, no baseline cascade. At +3 the
total flips: regen after staging, and `approach`'s baselines still hold (it renders the runtime
group only).

## Gates

- `node tooling/build-checks.mjs` green.
- `node tooling/drift-check.mjs` green **after staging** (it reads the index, not the working tree).
- No VR run: `files` unchanged at 76, `linesApprox` unchanged at 30500, so no page's at-rest pixels
  move. All five edits are prose or comments.

## Out of scope

A gate for scale fit. `figma-pull`'s even-spread mapping (owner decision 2026-07-26, #127) is
unchanged. Widening the clause to shadow.
