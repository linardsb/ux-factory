# PR #123 review — `ds-list-row`, a generic cross-scenario primitive (#101)

**Agentic gate.** Reviewed with fresh eyes in a detached worktree off `origin/feature/ds-list-row-primitive`
(`f1cde71`), because the shared working dir was on another ticket's branch carrying an untracked
`.claude/plans/ds-list-row-primitive.md` that would have collided on checkout.

**Verdict: request changes** — one Medium finding with a three-line fix. Zero critical, zero high; every gate
green; every honesty-critical claim in the PR body independently reconciled against the fixtures. The finding is
narrow and it is genuinely *this* PR's, not pre-existing noise.

---

## Summary

The mechanical half is clean: spec head + four prose sections, one token-only CSS block, one `TEMPLATES` entry,
regenerated projections — the `metric-tile` quartet mirrored exactly, zero new tokens, `children: []`. The
stochastic half did what the ticket existed to find out, and the PR body reports it without spin.

I verified the measurement rather than taking it on trust. It holds:

- **Free choice is real.** `grep -c "list-row\|metric-tile" portal/record-composition.mjs` → `0`. The widened
  `insight-panel` bound names no component. (The one surviving `metric-tile` mention in `compose.json:10` is the
  *unchanged* `summary-strip` bound — a different slot, not the one the run used.)
- **`computeRules` untouched** in the diff. The honesty firewall holds.
- **All six composed figures reconcile** against `scenarios/northwind/fixtures/items.json`, computed
  independently here: 3 oversold (85 / 70 / 40, correct descending order, warehouses east / west / east); 5 low-cover;
  the single row shown is the thinnest cover of the five (12 units, south). The `meta` dates reconcile too —
  `updatedOn 2026-07-19` → "updated today", `2026-07-18` → "updated yesterday", against the fictional today.

## Issues

### Medium — the study's bus pane now reports the wrong component for a `list-row`

`system/agentic-study.mjs:140, 151, 156, 163` · `:75` · `:192`

`agentic-study.mjs` hardcodes `target: { component: "metric-tile" }` in all four adjust intents (`probe`,
`setTone`, `removeTile`, `moveTile`), and its copy says "tile" throughout. That hardcode was **accurate until this
commit**: all four pre-existing compositions (`backlog-urgency`, `operational-state`, `sla-risk-and-load`,
`work-by-region`) contain metric-tile nodes and nothing else. This PR ships the first study-rendered composition
with a non-`metric-tile` node, which is what makes the label wrong.

**Failure scenario, reproduced in both engines** — `instance.html` (demo-configured to northwind, and any real
instance built with `--compositions`), tab 2, adjust the first `list-row`'s tone:

```
BUS: 01  ui.intent  pointer  metric-tile#1  {"intent":"set-tone","tone":"warn"}
```

Node 1 is a `ds-list-row`. The pane immediately above that row reads *"The raw action contract, live: type · source
modality · target · params. These are the same messages an agent or a voice layer would carry."* It is the one
surface on the page whose stated job is to show the true target, and it now names the wrong component.

Three sites, one root cause — fix all three or the next composition re-opens it:

1. `:140, 151, 156, 163` — `"metric-tile"` → the node's own name. In `removeTile`, read the name **before**
   `working.splice(i, 1)`.
2. `:75` — hint copy "Change a tile's emphasis, drop or reorder tiles".
3. `:192` — `title: "Remove tile"`.

The plan anticipated the neighbouring coupling (lines 93 and 560 pin `tone` and `label` as load-bearing *because*
the study reads them for every node) but stopped short of the emit target. So this is an undocumented gap, not a
documented deviation.

**No baseline cost.** The VR spec captures 9 pages × 2 packs = 18; neither `instance.html` nor
`agentic-ui-study.html` is among them. Sites 2 and 3 are at-rest copy, but on uncaptured pages — the fix needs no
`update:docker` pass.

### Low — `summary-strip` still hard-names `metric-tile`

`scenarios/northwind/compose.json:10`. Out of scope for #101 and arguably correct (a KPI band should be tiles), so
the measurement is unaffected. Noting it only so the asymmetry is a recorded decision rather than an oversight the
next widening has to rediscover.

## Validation

| Gate | Result |
| --- | --- |
| `tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `tooling/validate-trace.mjs` | ✓ incl. `sku-attention-list` + `.raw`, 13 steps · 4 phases · curated |
| `scenarios/validate.mjs` | ✓ 3 scenarios, verdicts differ |
| Figures vs `fixtures/items.json` | ✓ 6/6 reconcile, independently recomputed (order, warehouses, dates) |
| Refusal path, Chromium + WebKit | ✓ `composition[1].props.tone: "urgent" is not in enum [neutral \| warn \| critical]`, view holds its 6 nodes |
| Narrow 420px, Chromium + WebKit | ✓ 4 rows full-width (310px), no page h-overflow, 0 console errors |
| VR gate (Docker) | not re-run here — accepted from the PR body (18/18 update + 18/18 check) |

The PR's self-disclosed limit reproduces exactly as described: at 420px, one row of four
(*Bubble wrap roll, 750mm*) clips its name; the other three do not. Disclosed, defensible, and correctly left
un-chased rather than tuned to one fixture's string lengths.

## What's good

- **The measurement was not driven to its answer.** The bound was widened to name *no* component, the shared
  prompt names none, and the only description of the row is its own `## Usage` prose. That's the harder version of
  this experiment and it's the one that was run. The pre-authorized second directive run was correctly not spent.
- **The interleave is the real result.** `metric-tile` (aggregate) → three named rows → `metric-tile` → one row is
  the aggregate/entity split the spec's prose describes, applied without being told. Worth more than the mere fact
  that the row was chosen.
- **`status` as free text with no enum**, and the refusal of a `status-chip` child, are the same decision defended
  twice — in the spec prose and in the CSS comment. That refusal is what keeps the primitive cross-scenario;
  allowing the chip would have silently re-locked it to Verdant's `ok|due|overdue`.
- **The narrow-width fix went past the plan's block for the right reason** and says so. A row whose entity reads
  `Pallet wra…` defeats the ticket; `flex: 1 1 14ch` on the name with the reading and pill wrapping first is the
  structural fix, not a magic number.
- **Dropping the plan's `"(or, on a row, its meta)"` clause** was the sharper call — `meta` is a prop only
  `list-row` declares, so that wording would have leaked the answer into the shared prompt and weakened the exact
  evidence the ticket exists to gather.
- Renderer template is byte-parallel to `metric-tile` (no bus, `String(props.value)`, `null` for absent optionals,
  `is-` class only when tone is non-neutral); all text via `textContent`, so agent strings stay inert. CSS tone
  mechanic matches `.ds-metric-tile` exactly, and the spec's 14-token list matches what the CSS actually uses.

## Recommendation

**Request changes** — fix the three `agentic-study.mjs` sites, then merge. Everything else is ready: the primitive
is correct, the measurement is honest, and the PR body's limits are stated more conservatively than the evidence
requires.

Posted as a comment, not a formal request-changes: GitHub does not accept a review verdict on one's own PR in a
solo repo.

*Note on method: the deep pass was done first-hand in this context with live cross-engine verification rather than
delegated to the `code-reviewer` agent, per this session's standing instruction not to dispatch subagents
unrequested. Findings below are reproduced, not inferred.*
