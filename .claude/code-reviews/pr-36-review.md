# PR #36 Review — Agentic-UI study (#13): metric-tile · composition runner · spike 6 gate · ask→propose→adjust · Fieldwork slots

**Verdict: ✅ Approve (with advisory notes).** No Critical/High issues survived verification. This is a large, honest, well-gated ticket, and the credibility-critical claim — that the shipped numbers are genuinely agent-computed and correct — holds under independent recomputation.

**Reviewed with:** fresh context + a stronger-model advisor pass as the deep gate (I substituted a manual deep read for the `code-reviewer` agent, which is Python/FastAPI-tuned and mis-fits this vanilla-JS/Node repo). Branch checked out in worktree `ux-factory-wt-13`.

---

## The finding that matters (and it's clean)

For a credibility-risk ticket, the load-bearing check is whether the shipped tile numbers are real. I recomputed **every** shipped figure directly from the Fieldwork fixtures, independent of the author's `fieldwork-kpis.mjs`:

| Proposal | Shipped figures | Independently verified |
|---|---|---|
| operational-state (Fieldwork summary slot) | Open 35 · SLA-at-risk 8 · Overdue 4 · Needs-assignment 5 | ✅ exact |
| sla-risk-and-load (Fieldwork insight slot) | SLA-at-risk 8 · Overdue 4 · East 3 · Needs-assignment 5 · Priya Nair 5 · Ravi Menon 0 | ✅ exact |
| work-by-region | North 11 · South 10 · East 8 · West 6 (open-by-region) | ✅ exact |
| backlog-urgency | Open 35 · Overdue 4 · SLA-at-risk 8 · Urgent 9 · Priority 15 · Routine 11 (open priority mix) | ✅ exact |

Every number is correct under its stated definition. The compositions are genuinely agent-generated (validating PIV traces, real-run labels), no example was hand-fed (the runner's prompt construction is literal and inspectable in source; the Read fence allows only vocabulary + fixtures), and the view-time capability wording is truthful ("no live model call at view time"). **The honesty contract holds where it counts.** Everything below is Low / advisory.

---

## Issues

### Low — Committed traces still carry the author's home-dir path on the "View the committed trace" surface

**Files:** `traces/{backlog-urgency,operational-state,sla-risk-and-load,work-by-region}.jsonl`

The study page links each trace as *"View the committed trace"* (inspectable proof, shown to hiring managers). Those traces embed `/Users/Berzins/Desktop/Linards_current/…` — from the agent's own orientation probes (`ls`, `Glob`, and in one case an absolute-path `Read`) plus `meta.cwd`:

- `backlog-urgency.jsonl`: **~9 tool-input occurrences** (5 Bash + 2 Glob + 1 Read) + `meta.cwd`
- `operational-state` / `work-by-region`: 2 probe occurrences + `meta.cwd` each
- `sla-risk-and-load`: 3 + `meta.cwd`

This is **not a regression** — `main` already ships absolute paths in `demo-notice.jsonl` (24 occurrences), so the repo tolerates it, and it doesn't affect any shipped number or render. Severity is minor-polish. Two honest caveats for whoever merges:

1. **The report's Deviation #6 under-counts this.** It states *"the sole residual is `meta.cwd` (one field) plus one honest fence-denied probe in backlog-urgency."* Actual is the spread above. C6 (`cabcd12`, the portability commit) re-ran all four traces, so this residue is **post-fix**, not a stale artifact — read it as a miscount, not deception.
2. The `backlog-urgency` **Read** on an absolute path would be fence-*allowed* (`READ_OK` matches resolved absolutes in `portal/record-composition.mjs:179`), i.e. a real data-read on an absolute path — which nuances the report's *"every real-data path is now repo-relative."*

**Fix (optional, non-blocking):** the honesty rule forbids hand-editing traces, so the only clean fix is a tighter re-run — strengthen the "do not orient/explore" clause in `PIV_COMPOSE_SYSTEM` / `buildTask` so the agent never issues absolute-path `ls`/`Glob`/`Read`, then re-record. Absent that, simply correct Deviation #6's wording so the record matches the artifact.

### Low — `work.html` "Runs now" badge is readable as "the agent runs live"

**File:** `work.html:55`

Exhibit 02's card copy ("An agent composes dashboard views…") now carries `<span class="capability live">Runs now</span>`. The agent does **not** run at view time — only adjust + render do. The linked study page is explicit, and this mirrors the substrate card's existing "Runs now" precedent, so it's defensible. A skimmer on `/work` could still read it as live inference. Advisory only.

### Low — Study control panel assumes every composition node is a `metric-tile`

**File:** `system/agentic-study.mjs:143-167` (`renderControls`, `setTone`, `probe`)

The panel renders a tone `<select>` and applies `tone` for every node in `working`. All four committed proposals are pure `metric-tile` arrays, so it's correct today. If a future proposal ever included a non-toneable component (e.g. `screen-header`), a tone adjust would push it out of vocabulary and the preview would collapse to the "last valid composition" message. Latent, not active. Optional hardening: gate the tone control on `node.name === "metric-tile"`.

---

## What's good

- **Honesty-by-construction runner.** `record-composition.mjs` builds the prompt only from vocabulary + fixtures + question + slot bounds, with a Read fence that can't even see an example on disk, and a keep-gate that is `validateTrace()` itself (`:322-332`) — a run that would fail the shipped drift guard never ships. The stale-target `rmSync` (`:294`) to force a real `Write→artifact` pairing is a genuinely thoughtful detail.
- **`metric-tile` is exemplary token discipline.** Tone via accent fill-inversion (no new tokens invented), DOM order label→value→unit with `column-reverse` for visual, `String(props.value)` guard, spec ↔ CSS ↔ template ↔ vocabulary all aligned. Colour is never the sole signal.
- **Recorder meta-redaction** (`trace-recorder.mjs:151-165`) closes the PR #28 gap correctly; const-string call sites match no rule, so existing traces stay byte-identical (verified: `demo-notice` still ✓).
- **Honest degradation everywhere** — Fieldwork slots leave the labeled placeholder on fetch failure; the study page renders an error card; capability is computed from rendering reality (`dsCssLoaded()`).

---

## Validation

| Check | Result |
|---|---|
| `node --check` (all 5 touched .mjs) | ✅ PASS |
| `fieldwork-kpis.mjs` anchors | ✅ overdue 4 · unassigned 5 · open 35 · slaAtRisk 8 |
| **Independent recompute of all shipped numbers** | ✅ all exact (table above) |
| `validate-trace.mjs` (10 traces incl. demo-notice) | ✅ all ✓ |
| `validateComposition` on all 4 committed proposals | ✅ all valid |
| `gen-token-css.mjs --check` (token drift) | ✅ no drift |
| `gen-vocabulary` + `gen-handoff` determinism | ✅ `handoff/` byte-clean on re-run |
| Study-page tokens exist in contract | ✅ all present |
| `redactString` import + `{value,rules}` shape | ✅ correct |
| Full `agent-layer/build.mjs` run | ⚠️ author-attested (needs sibling jobs folder + ledger; not re-run here — drift + determinism checks cover metric-tile's integration partially) |
| Live browser render (study + slots) | ⚠️ author-attested via agent-browser; module logic read and sound |

---

## Recommendation

**Approve.** No blocking issues; all three findings are Low/advisory. The one worth acting on before or after merge is correcting Deviation #6's wording (or a tighter re-run) so the honesty record matches the committed traces — fitting for the ticket whose whole thesis is the honesty of the inspectable surface. The two author-attested rows (`build.mjs`, browser) are the only checks I did not independently reproduce.

*Reviewed by Claude (piv-review-pr). A human reviews the code + this review and merges.*
