# Implementation Report — Portal UI width: three ordered posture buttons, the facet vector, the package view, the differing-resume 409 (#288)

**Plan**: `.claude/plans/discovery-portal-width-288.md`
**Branch**: `feature/discovery-portal-width-288`
**Status**: COMPLETE

## Summary

The discovery drawer's posture `<select>` is replaced by MVP 1's three ordered buttons, driven from a new
`POSTURE_FLOW` table on `/api/discovery/config`, with Think-on-Opus riding the Think step as a variant
checkbox. The bank's five facet modules (#283) get their control: five checkboxes labelled with
`FACETS[i].question`, the four presets, a clear-to-unfaceted button, and an overflow message that is a
**lookup into a 33-row precomputed plan table** served on the config — never a second copy of D1a's greedy
walk. A new pure fold, `ledgerView(ops)` in `discovery/ops.mjs`, is carried on `sessionView` as `ledger` and
rendered as the package view; the drawer derives no number of its own. And `resumeMismatch(head, posted)`
makes the session POST answer **409** when a resume names another depth or another vector, which PR #365
review F6 had left silent.

## Tasks completed

Phase 1 — the rules layer

- `ledgerView(ops)` → `discovery/ops.mjs` (UPDATE) — pure, import-free, total over junk; counts keyed by
  `OPS`, flags by `FLAGS`, flags counted over the **whole** ledger, `latest`/`supersededBy` mirroring
  `prd-projection.mjs`'s visible/supersede rules, every array copied.
- The `ops.mjs` header — "two pure reads" becomes three, naming the consumer, the mirror-not-import rule and
  that a pure read does **not** take the epic's op-verb lock.
- `POSTURE_FLOW` + `POSTURE_VARIANT_LABEL` → `portal/lib/discovery.mjs` (UPDATE), beside `ENTRY_POSTURES`.
- `resumeMismatch(head, posted)` + module-private `facetsPhrase(v)` → `portal/lib/discovery.mjs` (UPDATE).

Phase 2 — the config and view surface

- `facetKey(v)` (exported) + `FACET_PLANS` (33 rows, folded once at module scope) → `portal/lib/discovery.mjs`.
- `discoveryConfig()` grows `postureFlow`, `postureVariantLabels`, `modules`, `facetPlans`.
- `sessionView()` grows `ledger`, with the comment saying why it FILTERS where `readPackage` REFUSES.
- The session POST route answers `409` on a mismatch → `portal/server.mjs` (UPDATE), after `openSession`.

Phases 3–5 — the drawer

- `portal/public/index.html` (UPDATE) — the posture `<select>` removed; `#discovery-facets-row` and
  `#discovery-flow-row` fieldsets added inside `#discovery-start`; `#discovery-package` mount added.
- `portal/public/portal.js` (UPDATE) — `admittedSteps` · `stepRow` · `postureOfStep` · `declaredVector` ·
  `facetKeyOf` · `facetPlanNow` · `depthComposes` · `renderDiscoveryFlow` · `renderFacetControls` ·
  `renderFacetPlan` · `renderPackageView`; `discoveryEls()` gains `facets` and reads `posture` from the flow;
  the depth note reports the faceted count; the Start handler POSTs `facets` and refuses overflow **gated on
  `composes`**; `renderDiscoverySession` names the recorded step off disk. The dead
  `$('#discovery-posture').addEventListener` line is gone (it would throw at module scope and take the SPA down).
- `portal/public/portal.css` (UPDATE) — `min-width: 44px` added to the drawer `.btn` rule; the 44px input rule
  scoped to `input:not([type="checkbox"])`; `.discovery-check` is the 44px label target; flow, preset, checkbox
  and package-view blocks, all token-only.

Phase 7 — the gate

- `tooling/build-checks.mjs` (UPDATE) — group 29 case 28.10 (`ledgerView`, incl. the cross-reader case);
  group 30 cases 35–42; case 11's config key set extended plus the `note`/`provenanceNote` absence assertion;
  both group headlines and the file's header index extended with what is proven and what they cannot reach.
- `.claude/references/gates.md` (UPDATE) — group 29 and group 30 entries extended. **Group count stays 34, so
  `CLAUDE.md` is untouched** (verified: `grep -c "34 PURE groups" CLAUDE.md` → 1, unchanged).

## Tests added

No suite exists in this repo (`CLAUDE.md` §Ground rules). The gate is the test:

| Case | What it drives |
|---|---|
| 29 / 28.10 | `ledgerView` — empty shape, happy fold against the applier's own records, `latest`/`supersededBy` with nothing dropped, a flag on a superseded record still counted, **the cross-reader case** (the projection's rendered Ledger line + `#### seq` block count vs the fold, on a superseding fixture *and* on committed `instrument-loans-1`), purity, the alias trap, totality over 12 junk shapes |
| 30 / 35 | `POSTURE_FLOW` both ways vs `POSTURES` and `ENTRY_POSTURES`; `order` = index+1; frozen at both levels by mutation; existing-prd admits the Grill step alone; `POSTURE_VARIANT_LABEL` keyed only by variants |
| 30 / 36 | C3 title sweep over every new label and `what` line, with its positive control |
| 30 / 37 | `resumeMismatch` — agreement over `{}`/null/undefined, a five-key preset vs a one-key spelling, both mismatch messages, the declared all-false vector named distinctly, **the create case** (3 posted sets, each null), junk head total, junk vector throwing the bank's own error |
| 30 / 38 | the three config keys; `facetPlans`' 33 rows each compared by **driving** `facetPlan`; `facetKey` reproducing every key; the bit order settled by one asymmetric vector; the declared all-false row distinct from the undeclared one |
| 30 / 39 | `sessionView.ledger` over a temp root; a text line, a denied line and an unknown type contributing nothing; the unknown type filtered where `readPackage` refuses |
| 30 / 40 | the route's 409 source-pinned to run **after** `openSession`, checked against the posted depth and vector by name; the boundary's flat 500 still the only catch-all |
| 30 / 41 | the drawer source-pinned: `#discovery-posture` gone from both files, `renderDiscoveryFlow` present, `postureFlow` read off the config, no facet id hardcoded, the plan looked up with no budget arithmetic, the Start refusal gated on `composes`, the plan note's `composes` branch first, the package view reading rather than counting |
| 30 / 42 | `portal.css` — `min-width`, `.discovery-check`'s 44px, the checkbox scoped out of the input rule |

**Every new case proven able to go red** (mutate the source, watch it fail, restore) — observed:

| Mutation | Case that caught it |
|---|---|
| `latest: true` unconditionally | `28.10: seq 1 reads latest true / supersededBy 2, not false / 2` |
| flags counted on non-superseded records only | `28.10: the projection's Ledger line does not carry "no-evidence 2" — the two readers disagree` |
| `order: 5` on step 2 | `case 35: order 1,5,3 disagrees with array position` |
| "like a senior researcher" in a `what` line | `case 36: … carries the title term "senior"` |
| comparing raw POST vectors instead of normalised | `case 37: {} / null / undefined must all read as NO vector` |
| `facetKey` bit order reversed | `case 38: the 10000 row disagrees with facetPlan over the vector it encodes` |
| `sessionView.ledger` folding a filtered subset | `case 39: sessionView.ledger is not ledgerView over the transcript's op lines` |
| `resumeMismatch` moved before `openSession` | `case 40: resumeMismatch is called BEFORE openSession` |
| the 409 deleted | `case 40: the session POST branch answers no 409` |
| a facet id hardcoded in the drawer | `case 41: portal.js hardcodes the facet id "hasModel"` |
| the Start refusal ungated from `composes` | `case 41: the Start refusal is not gated on composes` |
| `min-width: 44px` removed | `case 42: the drawer's .btn rule sets no min-width` |

## Validation results

**Level 1 — syntax** (observed): `node --check` ✅ on all five edited `.mjs` files.

**Level 2 — the CI `verify` job's three legs** (observed):

- `node tooling/build-checks.mjs` → exit 0, all 34 groups green.
- `node tooling/drift-check.mjs` → `✓ syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay`
- `node tooling/token-lint.mjs` → `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`

**Level 3 — the portal smoke** (observed, port 4791, PID-scoped kill):

- `/api/health` → `{"ok":true,…,"stale":false}`
- `/api/discovery/config` → `flow 3 · plans 33 · modules 5 · variants 1`
- POST `instrument-loans-1` at `scope-check` (recorded: `opening-set`) → **409**, message naming both depths,
  both vectors and the slug.
- POST the same slug at `opening-set` → **200**.
- POST at `opening-set` with `{"regulated":true}` → **409** (the vector half).
- GET the session → `ledger` `{"record_decision":12,"flag_weak_answer":0,"open_question":0,"file_evidence":3}`
  flags `{"no-evidence":10,"orphan":0}` · 12 decisions, 12 latest, 3 evidence — matching `readPackage`'s ops
  and the projection's Ledger line.
- The committed package is byte-untouched throughout (`git status --short discovery/` → only `ops.mjs`).

**Level 4 — a real browser** (observed; Chromium 1280×800 and 390×844, Playwright, zero page errors at both):

- Three numbered buttons `[["1. Think","true"],["2. Create PRD","false"],["3. Grill","false"]]`, Think
  selected, variant row visible with `on Opus — the same prompt, the other model`.
- Entry → existing PRD: exactly one button, `3. Grill`; document row shown; variant row hidden; model row shown.
- `hasModel` + `regulated` + `internal` at full discovery →
  `AI interaction (7), Regulated (6) fits (29 of 30); Internal (6) does not. Untick one, or run whole-bank.
  Nothing is truncated and the session will not start until you choose (D1a).`
  Start refuses with the same sentence and **`posted=false`** — no POST left the page.
- The four presets move all five boxes together: regulated `[f,t,f,f,f]` → 22 of 30 · b2b-saas `[f,f,f,t,f]` →
  22 · internal-tool `[f,f,t,t,f]` → 28 · consumer `[f,f,f,f,f]` → **16** of 30. Clear → `No vector declared —
  full discovery runs its unfaceted 30.` D1b's two states are visibly different.
- **The depth-blind guard holds**: scope-check and whole-bank with three facets ticked render
  `This depth runs its own fixed list… only full discovery composes from it` with **no count** and no refusal.
- The depth note reports the faceted count and AC #2's sentence survives verbatim in every branch:
  no vector → `30 questions before any facet vector … Proposed for a blank idea; Start confirms it.` ·
  regulated → `22 questions with the vector below … Proposed for a blank idea; Start confirms it.` ·
  consumer → `16 questions with the vector below …`
- A new fictional slug at scope-check opens: `question 1 of 6 · turn t1`, `Stage 4 · Shape Up, Set boundaries,
  verbatim`, answer box and submit enabled, package view `Nothing filed yet — the package holds 0 answer(s)
  and no ops.` (AC #3's surface and the empty-ledger edge case). The smoke package was deleted; `discovery/`
  is clean.
- Reload mid-session, then a differing depth → the 409 renders as prose in the drawer, verbatim; the same
  depth resumes 200.
- **The audit branch** (no committed existing-prd package exists — `grep -l '"entryMode": "existing-prd"'
  discovery/*/run.json` returns nothing — so one was opened through the drawer and deleted): entry → existing
  PRD, a throwaway document pasted, posture on the wire `grill`, position line
  `gate-audit-288 · Full discovery · question 1 of 30 · turn t1 · audit of a1 (145 characters, md5 f9172937)`,
  answer label hidden, submit reading `Audit this question`, and the package view's document line rendering:
  `Auditing a1 — 145 characters, md5 f9172937. A resume ignores a document in the POST body; this md5 says
  which one the audit actually runs on.` followed by `Nothing filed yet — the package holds 1 answer(s) and
  no ops.` Package deleted; `discovery/` clean. **No token spent** — `openSession` is pure disk.
- **The package view updates as ops land**: `renderDiscoverySession()` — which calls `renderPackageView()` —
  is in the submit handler's `finally`, after `discovery.session` is re-read from disk (`portal.js`, the
  `#discovery-form` submit handler). Verified by reading the handler, not by a live turn.
- Resuming `instrument-loans-1` → `The package — 15 op(s)` ·
  `record_decision 12 · flag_weak_answer 0 · open_question 0 · file_evidence 3 · flags no-evidence 10 · orphan 0`
  · 15 rows, 13 chips; the flow note names the recorded step off disk
  (`This run is recorded at step 1, Think — posture think on claude-sonnet-5`).
- Controls after Start (measured with `:disabled`, which reflects an inherited fieldset disable — the
  `.disabled` **IDL property does not**): flow `[true,true,true]`, facets `[true×5]`, presets `[true×5]`,
  variant `true`, depth `true`. Native fieldset propagation, no per-control loop.

**AC #5 — the 44×44 measurement** (observed; no gate covers this, per architecture §Boundaries — the portal
is not in #271's VR page set):

- Chromium 140 (Playwright bundled), macOS, **1280×800** and **390×844**, 26 visible interactive targets each.
- **Sub-44 by the hit target: `[]` at both viewports.**
- Six elements measure 22×22 **by their own box** — the five facet checkboxes and the variant checkbox. Each
  sits wholly inside its own `.discovery-check` label, which is the hit target and measures ≥44×44 at both
  viewports; that is the design the plan specifies (a native checkbox renders at ~13px, so sizing the input
  alone leaves a sub-target whatever the box measures). Reported here rather than as `[]` so the number is
  the honest one.

**C2 / C3** (observed): the kill-on-sight list swept over every new UI string and every new comment → no hits,
control positive (`leverage` matches a planted string). C3 title-term sweep → no hits, control positive.

## Deviations from the plan

1. **Q1 — the "ask something else" input is deferred to #289**, as the plan recommends. It satisfies no AC
   and has no route to POST to. Phase 6 was not taken.
2. **Q2 — `entryMode` / `posture` / `model` are NOT in the 409's comparison.** The plan recommends adding
   `entryMode` and `posture` but holds it out of the tasks because widening a refusal is the owner's call. The
   owner's comment names depth and vector, so exactly those two are compared. `resumeMismatch`'s comment says
   so and names the open question. **Q2 remains open for the owner** — it is one line each plus one gate case.
3. **Q3 — Think-on-Opus is a variant checkbox on the Think step**, per the plan's stated assumption.
4. **Layout order in `index.html`**: the facet fieldset sits *before* the flow fieldset (the plan places the
   flow where the posture select was, i.e. inside `.portal-form-row`). A `<fieldset>` cannot sensibly live
   inside that grid row, and reading order "which questions (depth + facets) → which stance → the stance's
   model" puts the Grill model row directly under the stance that owns it. Both fieldsets are inside
   `#discovery-start`, which is what the disable propagation depends on.
5. **No per-control disable loop in `renderDiscoverySession`.** The plan describes one and then its own GOTCHA
   says do one or the other. Verified by measurement that native fieldset propagation already disables all
   thirteen new controls (see Level 4), so only the flow note is written there.
6. **Case 39's "a text line and a denied line contribute nothing" is doubly guarded** — `sessionView` filters
   on `type === 'op'` *and* `ledgerView` skips anything whose `op` is not in `OPS` — so no single-line mutation
   reddens that specific assertion. The case as a whole is proven red-able by a different mutation (folding a
   filtered subset). Noted rather than removed: defence in depth, not a vacuous check.
7. **The plan's `ledgerView` validate one-liner has `applyOps`' arguments in the wrong order**
   (`applyOps(items, ctx, state)`, not `(state, items, ctx)`), and the group-29 `dec()` fixture defaults
   `evidence_refs: [1]`. Both corrected when running; the assertions are the plan's.
8. **Case 11 extended rather than a new case** for the `note` / `provenanceNote` absence check, as the plan's
   case-38 task instructs.

## Issues encountered

- **`#btn-discovery` is outside the viewport at 390×844** — the portal's header button row overflows on a
  narrow screen. Pre-existing chrome, not touched by this ticket and outside its scope; noted because the
  browser check had to click it via JS. Worth a separate ticket if the portal is ever used on a phone.
- **A live paid turn was not run.** Level 4 step 5 in the plan spends real tokens. AC #3's surface is verified
  structurally (the question, its attribution, the answer box and the submit all render on a freshly opened
  session, in both blank-idea and audit modes, with zero page errors), and the one thing a live turn would
  additionally have shown — that the package view fills as the ops land — is covered by reading the submit
  handler: `renderDiscoverySession()` sits in its `finally`, after the session is re-read from disk. No SSE
  turn was executed on this branch. Say the word and it is one turn on a throwaway fictional slug.
- **No committed existing-prd package exists**, so the audit surface was exercised by opening one through the
  drawer and deleting it (above) rather than by resuming a fixture. Worth knowing for a future ticket that
  wants an audit fixture.

## Acceptance criteria

- ✅ **AC #1** — three buttons, in order, running the three postures; the entry mode chosen once and recorded,
  now enforceable because a differing resume answers 409.
- ✅ **AC #2** — re-verified: the depth choice and the "Proposed for …; Start confirms it." sentence survive
  the facet edit verbatim in all five branches.
- ✅ **AC #3** — re-verified structurally after the flow-button edit; no live turn run (see Issues).
- ✅ **AC #4** — the package view reads `session.ledger` and nothing else; group 29's cross-reader case proves
  the fold agrees with `prd-projection.mjs` on the same package.
- ✅ **AC #5** — measured, both viewports, zero sub-44 hit targets; the 22×22 checkbox glyphs reported honestly.
- ✅ **AC #6** — the config is the single source; group 30 cases 38 and 41 prove the drawer holds one derived
  line (the facet bit-key join) and nothing else.
- ✅ **AC #7** — portal boots, `/api/health` answers, a session opens and resumes end to end under the neutral shell.

Standing bars: `build-checks` green with every new case proven red-able ✅ · no shipped-page change, no VR
regen, no `param-manifest` entry, no `loc-summary` drift ✅ (drift-check green) · C2 and C3 run ✅ ·
`CLAUDE.md` untouched (group count still 34) ✅.

## Ready for the next step

`piv-commit`, then `piv-create-pr` (the PR body needs `Closes #288`), then `piv-review-pr`.
