# PR #100 review — floor into the instance: bespoke prototype rendered + adjustable in-slot (#89)

**Verdict: approve.** No critical or high issues. `verify` is green, drift-check is clean, and I
re-ran the surfaces this PR touches myself rather than reading the report's tables — build-instance
(with, without, and a deliberately malformed `--compositions`), the demo instance, three view-time
fallback states, and a real stamped deploy dir served and read in a browser. Three Low items below
are follow-up material, not merge blockers.

## Validation

| gate | result |
|---|---|
| `node --check` (instance.mjs · agentic-study.mjs · build-instance.mjs) | **PASS** |
| `tooling/drift-check.mjs` | **PASS** — `syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces` |
| CI `verify` | **PASS** |
| CI `visual` | **red — not this PR** (see Finding 4) |
| build-instance, real run **with** `--compositions` (acme fixture, slug-matched dir) | **PASS** — exit 0, `prototype 2 composed views`, `composition` stamped, `proto/compositions/acme/` (3 files) + `handoff/verdant/vocabulary.json` present |
| build-instance, real run **without** `--compositions` (#43/#44 regression) | **PASS** — exit 0, `"composition"` count 0, no `proto/` dir |
| build-instance, malformed manifest (traversal-shaped `proposal`) | **fails loud, deploy dir discarded** |
| stamped deploy dir served + read headless | **PASS** — `data-prototype="ready"`, 5 tiles, provenance "…over **Acme's** data", **no** Northwind/demo leak in rendered text, **0 console errors** |
| repo demo `/instance.html` headless | **PASS** — 5 tiles, 2 tabs, badge live, refusal names `composition[0].props.tone: "urgent" is not in enum [neutral \| warn \| critical]`, no in-slot trace link, 1 handoff card, **0 console errors** |
| view-time fallbacks: no-composition · fetch-404 · empty-manifest | **PASS** — badge withdrawn in all three; `body[data-instance="ready"]` and `#instance-player[data-trace="ready"]` unaffected → the chains are genuinely independent |

The 10 documented deviations in the implementation report were read and excluded from the findings —
they are intentional decisions. Nothing undocumented diverged from the plan.

**`renderStudy`'s new `subject` param has exactly two call sites** — `agentic-ui-study.html:238` and
`system/instance.mjs:245` (grepped, not assumed). So no third caller silently falls through to the
new `"the scenario's fixtures"` default where the hardcoded Fieldwork string used to be, and the
byte-identical-provenance regression claim covers the whole surface. The Fieldwork prototype's
agentic slots drive `agentic-renderer` directly, not this module, so they are unaffected.

## Findings

### 4. [Low · informational] CI `visual` is red, and it is not this PR
`index · saulera` never reaches two consecutive stable screenshots (32383 px, ratio 0.01, then
`Timeout 5000ms exceeded`); 17/18 pass. This PR touches no page in the baseline set
(`404 · approach · contact · factory · index · proto-fieldwork · proto-verdant · roundtrip · work`)
and no shared CSS — every CSS edit is inside `instance.html`'s own `<style>`. The same job **passes
on `main` at the identical base commit** (run 30121646171, `67b7ab2`), and the failure mode is
non-convergence rather than a diff against a stale baseline, which points at `index.html`'s live
timed hero re-skin, not a regression here. The job is `continue-on-error` on `feature/v3-*`
(`.github/workflows/verify.yml:48`, the D11 freeze), so the **run** is green and only the **check** is
red — expect mergeable state `UNSTABLE`, not `CLEAN`. The author's AC #4 reasoning (loc-summary
drifted and was regenerated; `approach.html:236` renders the unchanged `runtime` group, so no
baseline churn) checks out.

### 1. [Low] `validateAssembly` reads outside the deploy dir for a manifest-supplied path
`agent-layer/build-instance.mjs:245,259-268` — `entry.proposal` from the copied `index.json` goes
straight into `existsSync`/`readFileSync(join(deployDir, ref.replace(/^\//, "")))` with no check that
the result stays under `deployDir`.

Reproduced: a manifest with `"proposal": "../../../../../../../../etc/hosts"` makes the builder read
that file and echo its first bytes into the console:

```
build-instance ✗  build-instance: assembled instance failed validation:
  - composed view ../../../../../../../../etc/hosts is not renderable — Unexpected token '#', "##
# Host "... is not valid JSON
```

The build **does** fail and the deploy dir **is** discarded, so nothing ships — this is a local
build-time tool over the operator's own `record-composition` output, and that runner's write fence
can't produce such a manifest. So: low real risk. But the documented invariant ("proposal paths must
already read `/proto/compositions/<slug>/…`") is only detected via its symptom (`referenced asset
missing`), never enforced, in a gate whose stated job is that what validates is what ships.

**Fix (one line):** before touching the filesystem, require the prefix —
`if (!entry.proposal?.startsWith(\`/proto/compositions/${slug}/\`)) problems.push(...)` — or compare
`resolve(deployDir, ref)` against `deployDir + sep`.

### 2. [Low] On the failure path the badge is withdrawn but the claim paragraph is not
`system/instance.mjs:249` — `unclaim(null)` on a fetch failure removes `#prototype-capability` but
leaves `#prototype-claim` reading, verbatim, above the error card:

> "A view the factory composed at build time from this application's own data — real components on
> the derived pack, every one of them from the approved vocabulary. **Adjust it below**; nothing runs
> live here."

Confirmed in two states I forced (manifest 404, and a manifest that parses but carries no views).
The adjacent error card *is* explicit ("Could not load the composed view — … HTTP 404"), and the code
comment states the choice deliberately, so this is a judgment call rather than a divergence. Given
that deviation #9 rewrote this exact paragraph for the no-composition case on honesty-contract
grounds, the same reasoning arguably applies here — `unclaim()` already takes the replacement string.

Worth noting either way: the implementation report's four-state table records the forced-failure
row's claim as "—", which reads as "withdrawn". It isn't — it is retained unchanged. Fix the behaviour
or fix the row; right now the report over-states what ships.

### 3. [Low] `--compositions` is copied wholesale where `--trace` copies exactly one file
`agent-layer/build-instance.mjs:347` — `cpSync(compAbs, …, { recursive: true })` ships the entire
source directory into the unlisted deploy dir unfiltered, while `--trace` copies only the referenced
file. I checked `portal/record-composition.mjs`: it writes only `index.json` + the proposal into that
dir (the trace pair lands in `traces/`), and `proto/compositions/northwind/` holds exactly those three
files — so this is clean in practice today. It just isn't enforced: a stray scratch file, an earlier
run's artifact, or a `.DS_Store` in that dir ships with no gate looking at it. Copying `index.json`
plus each manifest-referenced proposal by name would make "ship only what the manifest references"
structural rather than incidental.

## What's good

- **One `validateComposition`, two layers.** The build-time gate and the reader's browser run the
  *same* refusal engine, so "a view the browser would refuse can never reach a deploy" is a
  structural guarantee, not a convention. The negative runs prove it fires.
- **Deviation #9 is the review catching itself.** The badge/claim withdrawal isn't in the plan and no
  demo-path test could have surfaced it — an instance built without `--compositions` would otherwise
  have promised "Adjusts now · composed at build time … Adjust it below" over an empty placeholder.
  Spotting that from the *stamped-real* reader's position, not the demo's, is the right instinct.
- **The three fetch chains really are independent** — I forced the prototype chain to fail three
  different ways and `body[data-instance="ready"]` plus the trace player were untouched every time.
- **Copy-not-run held.** No SDK in `build-instance.mjs`; compositions are consumed, never generated —
  the same discipline `--trace` established, and the honesty contract depends on it.
- **`linkCard()` is a behaviour-preserving extraction that also kills a latent lie** — the old
  hardcoded "not part of this **demo** instance" would have been false on every stamped real build.
- **`CLAUDE.md` was updated accurately** against what actually changed (the `subject` param, the new
  prototype slot, the `--compositions` flag and its operator contract) — verified line by line.
- Token discipline holds: the ported `study-*` block is `var(--…)` throughout, and the bare `px`
  values are a verbatim port from `agentic-ui-study.html:35–76`, not new literals in shared CSS.

## Recommendation

**Merge.** The three Low findings are hardening and a report-accuracy nit; none of them changes what
this PR ships or how it behaves in any configuration I could produce. Findings 1 and 3 belong
together in a small follow-up that makes the manifest's path contract enforced rather than detected.
Before merging, note that the red `visual` check will leave the PR `UNSTABLE` — that is the D11
freeze behaving as designed, and #82 is where it comes back off.
