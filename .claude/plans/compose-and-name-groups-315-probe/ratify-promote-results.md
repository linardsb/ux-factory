# Probe B — ratify's second origin, groups/ store, promote, end-to-end ratify (#315)

Clone of the primary repo at `b99d9ac` (`tooling/icons` + `tooling/style-dictionary` `npm ci`), 2026-09-30. Patch:
`ratify-promote.patch.txt` (loc-summary separate). Drivers: `digest.mjs.txt`, `promote-driver.mjs.txt`, `e2e-ratify.mjs.txt`.
canvas-ops changes are PROBE-MINIMAL (group.define storing doc.groups, component.propose groupId) — not the plan's grammar.

## Results

| # | Item | Result |
|---|---|---|
| 1 | Import-path digest of planRatify on 50.6's fixture captured before any change | done (hash 66eaf7e1…, six write shas) |
| 2 | Task 3.3 origin threading; import path byte-identical | PASS — every write sha, the def and the hash identical, with the anchor files held at HEAD (`ORIG=1`) |
| 2b | build-checks after Task 3.3 | PASS — all 50 groups |
| 3 | Task 2.1 store (groupFiles, loadBuild groups+run, saveRun write/rm, verifyBuild compare) | PASS — define writes `groups/g1.json`; verifyBuild `[]`; hand-edit, orphan, missing each named; undo of the define removes the file, verifyBuild `[]` |
| 3b | F10 | PASS — `set: {x: …}` no longer flagged; a top-level `x` still is |
| 3c | Task 3.1 + 3.2 promote | PASS — writes exactly `proposals/app-header/{block.css, source.json, spec.md, template.txt}`; source.json byte-equal to groups/g1.json; last line `component.propose {name: app-header, groupId: g1, mode: 1}`; second promote `already-promoted`; g9 `no-group`; `git status -- system handoff` unchanged; writeBuildHandoff writes 4 files on the promoted package |
| 3d | build-checks with minimal group.define (35.1 → 13, VALID_FOR + the positive-control setup gaining f3 + g1) | PASS — all 50 groups (the plan's Task 6.1 setup change is sufficient) |
| 4 | END TO END ratify of the promoted group, children `"none"` | PASS — preview then confirm, all ten chain steps exit 0 (build-checks 17.3 s, total 21.0 s); `proposal.ratify pr1 → app-header` appended; the import-record re-stamp skipped |
| 4b | END TO END, children `"many"` (allowed screen-header, ghost-button, icon) | FAIL at step 10 — 37 failures in groups 40, 43, 46 (below) |
| 5 | Plan literals | see Corrections |

Observed strings:
- Usage: ``Admitted by ratify (portal/lib/ratify.mjs) from group `g1` in run `fp-groups`: composed in run fp-groups from group g1 (app-header), licence: the owner's own composition.``
- CSS header: `/* ---------- ds-app-header (system/specs/app-header.md) — admitted by ratify from group g1 ---------- */`
- Registry provenance: `{"from":"group","line":"composed in run fp-groups from group g1 (app-header), licence: the owner's own composition","record":"g1","run":"fp-groups"}`
- Promote spec first line: `<!-- drafted by portal/lib/promote.mjs from group g1 (app-header), composed in run fp-groups — not by an agent; props, states, behaviour and the accessibility model are the owner's at ratify (#313) -->`
- View label: `composed in run fp-groups from group g1 · drafted by portal/lib/promote.mjs, not by an agent`

## 4b — why a "many" admission reds (not origin-related)

The design importer's matcher (`import/recognise.mjs`) scores EVERY vocabulary component. An admitted part with a text
slot and `children: "many"` becomes a candidate for the committed fixtures' "Text block": group 40 reads
`ir.children[0].children[1] ("Text block") reads "app-header" via scored` (expected stack via structural fallback),
group 43.16's faithful/wrong replays build nothing, and group 46's committed Jev requests no longer match
`questionsFor` (re-recording them is a PAID run). The chain's `regen-expected` / `regen-import-records` cannot absorb
it because groups 40/46 pin literal expectations. The vocabulary is generated from specs, so the origin (import or
group) cannot change this: any admission of that shape reds the same way (derived, not re-run with an import origin).
Minimum fix: out of #315 — the matcher needs a rule that an admitted container never out-scores the structural
fallback, or group 40/46's pins must read the vocabulary. #315 should admit with `children: "none"` in its proof and
open a ticket for this.

## Corrections to the plan

1. **Task 3.3 / D8** — do not replace `record` with `origin`: `planRatify`, `checkInput`, `renderSpec`, `renderCssBlock`
   and `provenanceLine` must accept EITHER (a private `originOf(x)` wrapping a bare record as `{kind: "import", id,
   record}`), because 50.6/50.8 call `planRatify({record})` and patch `record`. Exported `importOrigin`, `groupOrigin`.
2. **D8 / 50.19 Usage string** — the plan's `from group \`g1\` (app-header), composed in run \`<run>\`: composed in run …`
   repeats itself. Built and observed: ``from group `g1` in run `<run>`: composed in run <run> from group g1 (<name>), licence: …``
   — the import line's exact shape with `group` for `import record`.
3. **Task 3.3 byte-identical claim** — `system/templates.admitted.mjs` is BOTH edited by Task 3.3 and a ratify anchor, so
   the registry write's bytes change with the file (expected). Prove byte-identity against the anchors at HEAD
   (`git show HEAD:<anchor>`), as `digest.mjs.txt` does.
4. **readState** — refuse `kind: "no-group"` when `doc.groups[proposal.groupId]` is absent (data, like `no-proposal`).
5. **runRatify** — for a group, return `{ok: true, component, gates, diff, checklist}` straight after the append; there is
   no record to stamp and no `elapsed.ratify`.
6. **50.17 import pin** — promote.mjs needs `canvas-store`, `env`, `import-run` only (not `canvas-ops`).
7. **Environment** — the real chain's step 1 (`gen-handoff`) needs `tooling/style-dictionary/node_modules`; ratify's
   `noIcons` guard does not check it. Any e2e run must `npm ci` there too (the first probe attempt failed on it).
8. **Scope** — end-to-end ratify of a promoted group IS provable for `children: "none"` (item 4), so it can move from
   Out of Scope into a journey/probe step; the header case as a `"many"` container is blocked by 4b and needs its own
   ticket.
9. **Loc** — these tasks plus probe-minimal canvas-ops moved the runtime group 32,800 → 32,900 (observed).
