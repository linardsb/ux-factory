<!-- docs/hallway-notes/round-3-studio/findings.md — the #223 epic-close record (epic #202).
     Three halves: the desk audits (Phase A, done at write time), the live metric audit (Phase B,
     script rehearsed; live half runs post-deploy), and the round-3 session findings (Phase C,
     filled after the sessions run). The fix/defer decision for the biggest confusion lands here. -->

# Epic #202 close — audits and round-3 findings (#223)

## Copy + count audit (Phase A — done 2026-08-20)

Sweep: `grep -nE '\b[0-9]+\b|twenty|…'` over the eleven shipped pages + `system/site.js`,
159 hits after markup filtering, triaged below. Per the plan's rule: dates, WCAG criterion
numbers, CSS values, section numerals and code comments are not claims and are excluded as
classes; every remaining *claim* number is a row.

| Claim | Where | Traces to | Verdict |
|---|---|---|---|
| loc "files / lines" figures | approach.html `#loc-proof` | fetched `system/loc-summary.json`, JS-rendered | ✓ never hand-written |
| controls total | approach.html `#param-proof` | fetched `system/param-count.json`, JS-rendered | ✓ never hand-written |
| catalog component count | components.html `data-catalog-count` | filled from the fetched pack | ✓ never hand-written |
| "Up to 32 MB." | factory.html:151, build.html:722 | `build-import.mjs` `MAX_EXPORT_BYTES = 32·1024²` | ✓ matches the enforced cap |
| "ten questions — seven from Hooked, three from Shape Up" | factory.html:292, echoed on /build and /work | `build-questions.mjs` QUESTIONS: 10 total, 7 hooked + 3 shaping (counted) | ✓ |
| "The twelve contrast pairs below" | factory.html:373 | `tooling/round-trip/verdant.diff.json` `aa.pairs.length` = 12 (counted); the rendered table prints its own counted length | ✓ |
| replay chrome numbers (ops, narration, refusals, durations, compression) | /factory replay chrome | counted from the committed artifact + trace at render; build-checks group 16 asserts identity | ✓ |
| "18 of 21", "3 tasks", "4 tasks", "3 DAYS OVERDUE" | work.html component library | demo values inside the fictional-labelled Verdant exhibit ("a made-up product, invented for this demonstration") | ✓ not claims |
| "404" stamp, section numerals 00–05 / 01–03 | 404.html, build.html, roundtrip.html | page furniture | ✓ not claims |

**Generator drift re-run:** all seven page-feeding generators re-run on the clean branch
(`gen-loc-summary`, `gen-param-count`, `gen-handoff`, `gen-vocabulary`, `gen-system-graph`,
`gen-replay`, `gen-pack-bundle`) — `git diff --stat` empty. Nothing a page renders was stale.

**Param-manifest coverage (the #204–#221 control surface):** all 46 `/factory` entries and 4
`/components` entries walked against the shipped controls — canvas verbs and both handle kinds,
zoom row, replay transport + seek, keep rail (export, four downloads, share), the ten method-card
radiogroups, Hook loop nodes + slots, flow nav, marquee + context menu, layers list, minimap,
docs-panel triggers and the inspector's playground controls, Act 0's four controls. No gap. One
candidate gap examined and rejected: /components counts "interactive playground specimens" and
/factory's inspector has no such entry — correct, because the /factory canvas only ever compiles
the three deliberately non-interactive primitives, so the inspector's specimen is always inert
(excluded by the manifest's own counting rules); the operable half, the prop controls, is counted.

## Honesty-contract audit (Phase A — done 2026-08-20)

| Surface | Check | Verdict |
|---|---|---|
| proto/verdant, proto/fieldwork | fictional-scenario notice rendered from copy.json; fixed fictional "today" labelled | ✓ |
| /factory round-trip panel | "Verdant is a fictional product, invented for this demonstration"; "controlled, favourable case, and the verdict says so" | ✓ |
| instance.html (demo) | fictional-company labelling in meta + notice, speculative-work framing | ✓ |
| replay chrome | meta.label ("Real run, curated for length") + artifact.label ("Projection of the real run…") rendered **verbatim**, never paraphrased; trace + brief links; both durations named as two spans; compression stated ("Played here at N×… gaps stay the run's own, proportionally") | ✓ |
| provenance | flips on take-over (`visitor`), on decline, and on a method-card redraft (`DRAFTED` constant, one copy, three surfaces) | ✓ |
| exported artifact | "the board above is the recorded run's work…" split + "Assembled in your own browser…" provenance | ✓ |
| device frames | caption carries the dropped-brand-does-not-reach-the-frames sentence (the #219 recorded decision behind open #268); pinned by build-checks group 24 | ✓ |
| analytics | **no copy anywhere claims analytics is recording** — the beacon is token-gated dark; grep for analytics claims over all shipped pages: zero hits | ✓ |
| capability chips | factory ×5 ("Counted · from the board", "Real run · replayed", "Provisional · measured", "Measured · generated", "Generated · one source"), work ×2 ("Runs now") — each states exactly what runs; both /work exhibits do run now | ✓ |

## Cuts-contradiction sweep (Phase A — one finding, fixed)

The three pre-agreed cut candidates all **shipped** (#220, #221, #222), so the sweep ran both
directions.

| # | Finding | Fix |
|---|---|---|
| F1 | `studio.html:76` visible prose still read "Marquee select, alignment guides and multi-move are ticket #217; a layers list is #221" — both shipped (#217 in PR #263, #221 in PR #272), so the harness page claimed shipped capability was future | copy fixed in this PR: the sentence now records they shipped on /factory. studio.html is off-nav and outside the VR page set — no baseline cascade |

No copy hedges the shipped features as cut, and nothing claims the actually-deferred items
(#264 phantom gesture, #268 dropped-brand-into-frames, #273 minimap a11y advisory, #237 declined).

## Metric audit (Phase B)

Tool: `tooling/live-metric-audit.mjs` (committed in this PR — re-runs at launch as the end-to-end
proof's first half).

**Local rehearsal (2026-08-20, BASE=http://127.0.0.1:4823, this tree): 17 passed, 0 failed.**

```
guard ✓  http://127.0.0.1:4823/system/studio-keep.mjs → 200 (the host serves the studio)
  ✓ the click lands MID-REPLAY, not on a settled page
  ✓ /factory/took-over fires exactly once, from the handover
  ✓ …as a bare static literal — no query, no fragment, no board
  ✓ …from the SUCCESS path — provenance visibly shifted to the visitor
  ✓ …and the reader's real URL comes back after the flip
  ✓ the handover is one-shot — a second interaction pushes no second route
  ✓ no other virtual route fired on this page
  ✓ the export hands a real file over
  ✓ /factory/exported fires exactly once, after the blob click
  ✓ a second export still downloads — and pushes nothing more
  ✓ /factory/link-copied fires exactly once, clipboard or fallback
  ✓ …and the ?b= link was in the address bar BEFORE the flip (the settledUrl contract)
  ✓ a second copy pushes nothing more
  ✓ every push on this page was one of the two keep routes
  ✓ the reader ends on the real URL, ?b= intact — every flip was restored
  ✓ an export that cannot assemble fires NO /factory/exported
  ✓ the beacon stayed dark — zero requests to cloudflareinsights.com (recording is launch-gated)
```

**Stale-deploy guard proven against the real live state (2026-08-20):**

```
live-metric-audit: https://factory-ux.pages.dev/system/studio-keep.mjs → 404 — the live deploy is
stale (it predates the studio). Deploy current main first: …
exit=1
```

**Live run: pending the deploy (owner OK required — outward-facing).** After
`npx wrangler pages deploy . --project-name factory-ux --branch main` on merged main, run
`node tooling/live-metric-audit.mjs` and paste the log here.

## Round-3 sessions (Phase C — pending: owner books 3–5 cold testers)

Per-tester outcome rows, confusions ranked by (testers affected × blocked-what), the WRONG-if
verdict ("N of M grabbed the wheel unprompted"), and the fix/defer decision land here after the
sessions run. The owner's own three 2026-08-10 complaints (/factory "feels random", snap-back
reads broken, wants product-grade look) are checked against the cold testers' behaviour for
triangulation.

## Fix / defer decision (Phase D — pending Phase C)

Decision rule (pre-committed): fix now **iff** the fix (a) fits in roughly two days, (b)
contradicts no recorded decision in the epic docs, and (c) needs no new instrumentation.
Otherwise a ticket with the finding verbatim + `Part of epic #202`, and the explicit deferral
recorded here.
