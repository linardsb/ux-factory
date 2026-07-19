# PR #34 Review — handoff-pack viewer (spec head + prose + agent vocabulary side by side, plus deterministic pack bundle)

**PR**: #34 · `feature/handoff-pack-viewer` → `main` · Closes #14 · Epic #1
**Reviewed at**: commit `32e80ea` (worktree `ux-factory-wt-14`)
**Verdict**: 🟡 **Request changes — minor** (advisory; posted as a comment — GitHub blocks self-review approvals on a solo repo)

## Summary

Ships exactly what #14 asked for: a vanilla ES-module viewer (`system/handoff-viewer.mjs` + `handoff.html`) that renders each Verdant component as three side-by-side projections of one generated source — spec head · engineer prose · agent vocabulary — plus a zero-dep generator (`agent-layer/gen-pack-bundle.mjs`) that bundles the whole pack into one deterministic `pack.bundle.json` download. The one-source claim is made structurally (column adjacency), with zero pedagogy callouts, honoring the PRD legibility discipline.

The viewer, the pack↔vocab join, the private markdown renderer, and the honesty/token-discipline surfaces all held up under adversarial testing against real and synthetic inputs (fresh-eyes pass via the `code-reviewer` agent + independent golden DOM test). **No Critical or High issues.** The two Medium findings are both localized to the bundle *generator* (not the shipped page) and are cheap to fix.

## Validation

| Gate | Result |
|------|--------|
| `node --check` (4 touched `.mjs`) | ✅ PASS |
| `prepareHandoff` join (real pack/vocab) | ✅ `7 care-task-row vd-plant-card demo-notice true` |
| Bundle determinism (2 regens) | ✅ byte-identical, `git diff --quiet` clean |
| Bundle integrity | ✅ 16 files · self-excluded · keys sorted |
| Independent golden markdown DOM test | ✅ ul=7 · table=7 · th=21 · separator dropped · fences unparsed · inline `<strong>` |
| `token-lint` | ✅ 47 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `drift-check` (full gate) | ✅ syntax · token-css · handoff · scenarios · traces |
| Live HTTP surface (`npx serve`) | ✅ page + module + all 4 CSS + all 3 fetches (pack/vocab/copy) + bundle download + a contract link all resolve 200 |

*Not independently reproduced:* the pure-visual layout — the weighted 3-column grid holding vs. collapsing into cramped scroll-boxes (the plan's #1, explicitly browser-only AC-critical risk), and the rendered error card. These rest on the author's documented agent-browser run; the module's DOM output and every fetch/link path were verified here.

## Issues by severity

### 🟠 Medium

**M2 — the bundle's own embedded "Unpack" instructions throw on the first file.** *(the one I'd anchor "fix before merge" on — a shipped, reproducible defect in what the artifact tells consumers to do)*
`agent-layer/gen-pack-bundle.mjs:44` → ships in `handoff/verdant/pack.bundle.json` `$description`. The one-liner `for (const [p, c] of Object.entries(bundle.files)) writeFileSync(p, c)` fails because 12 of 16 keys are nested (`contracts/`, `tokens/{css,ios,android}/`, `wc/`) and `writeFileSync` doesn't create parent dirs.
*Failure scenario (reproduced):* running the snippet verbatim → `ENOENT: no such file or directory, open 'contracts/care-task-row.contract.json'` on the alphabetically-first (nested) key, before writing anything.
*Fix:* update the snippet to `mkdirSync(dirname(p), { recursive: true })` before each `writeFileSync`.

**M1 — `gen-pack-bundle.mjs` `walk()` has no guard against non-text / junk files, so a stray file can break the "lossless UTF-8" + determinism guarantee.**
`agent-layer/gen-pack-bundle.mjs:20-27` (unconditional `acc.push(full)` at :24; the only filter, `rel !== BUNDLE_NAME` at :36, excludes just the bundle itself). *Note:* not filtering is arguably the bundle's intent — unlike the sibling generators, which filter to `.md`/`.mjs` because each processes one file type, a bundle is meant to capture everything under the dir. So this is a **robustness gap, not a pattern violation**: there's no guard against a file that *isn't* decodable UTF-8 text.
*Failure scenario (reproduced):* a stray `.DS_Store` in `handoff/verdant/` (macOS/Darwin author environment; gitignored) gets read via `readFileSync(..., "utf8")`, mangling its binary bytes into the bundle. `checkHandoff()`'s `git status --porcelain -- handoff/` (`tooling/drift-check.mjs:53-60`) then flags `pack.bundle.json` as drifted on a *local* run for a file the dev never touched — a spurious, confusing failure; and if committed, ships binary garbage into the artifact the header advertises as "human-readable + git-diffable" (`gen-pack-bundle.mjs:5-6`). CI (fresh Linux checkout) is unaffected, so this is a local-dev robustness hole, not a CI-breaker.
*Fix:* skip junk/hidden files (e.g. `.DS_Store`), or throw a path-naming `Error` on non-UTF-8-decodable content (repo error convention). Same guard covers any genuinely binary pack file added later.

### 🟡 Low (optional — a one-line comment suffices; not a blocker)

**L3 — bold tokenizer spans arbitrary distance between two `**` markers (latent).**
`system/handoff-viewer.mjs:75` — `/(\*\*[^*]+\*\*|`...`)/`. Any two `**` with no single `*` between them become one bold span (e.g. exponent notation `2 ** 3 ... **`). Verified *not* live: all 28 committed section bodies have even `**` counts and genuine adjacent bold pairs render correctly. Worth a one-line "assumes no unpaired `**` in pack data" comment so a future spec edit can't silently mis-render.

**L4 — `prepareHandoff` validation is shallower than the mirrored `parseTrace`.**
`system/handoff-viewer.mjs:38-40` checks only that `pack.components` is a non-empty array; `trace-player.mjs:38-44` (the claimed parity target) validates every field and throws naming the offending line. A malformed sub-field (e.g. `body: undefined`) renders literal `"undefined"` text instead of failing loudly. Low because `pack.json` is a trusted, CI-drift-checked generated artifact — a comment or one guard would restore true parity.

**L5 — page header claims "data contracts and sample records for *every* component"; 3 of 7 have neither (honesty-contract nuance).**
`handoff.html:126-127`: *"Typed props, states, data contracts and sample records for every component — enough to wire real data today."* Verified against the pack: only 4 of 7 components (`care-task-row`, `plant-card`, `stat-tile`, `status-chip`) have a DataContract + a `` ```json `` sample record; the other 3 (`primary-button`, `screen-header`, `demo-notice`) are `contract:null`, and their Data-binding sections *themselves* say — scrupulously — *"Presentational — `contract: null`. No API record binds here."* So the pack is honest, and the viewer surfaces the nulls faithfully (no contract panel, `status` shown) — but the header's blanket "for every component" is literally out of step with what the pack states about 3 of its own components. A skeptical engineer clicking through is exactly who this page is built for, and honesty is this repo's *hard* contract. There's a charitable loose reading ("we ship props/states/contracts/records across the pack"), so this is advisory, not blocking — but the cheap, cleaner copy is: *"Typed props and states for every component; data contracts and sample records where a component binds data."*

## What's genuinely well done

- **Markdown renderer correctness** — fence→list→table→paragraph line-walker handles all 28 real section bodies; graceful (no crash) on 10 adversarial inputs (unclosed fence, no-blank-line list/paragraph, ragged tables, empty body). Independently confirmed via a DOM shim.
- **No `innerHTML` anywhere** — every DOM write is `textContent`/`createTextNode`; the honesty/XSS contract is real.
- **Join logic** — the two `contract` shapes (pack path-string vs vocab inlined object) are handled exactly as documented; `head` correctly excludes `contract`/`sections`.
- **Honesty surfaces** — baked `fictionalNotice` is byte-identical to `copy.json` and survives a pack/vocab fetch failure (its own independent fetch); `demo-notice` `status:"spec"` shown, not hidden.
- **Determinism design** — sort-after-walk, POSIX key normalization, self-exclusion, `pathToFileURL` guard (space-in-path safe).
- **Pattern fidelity** — faithful mirror of `trace-player.mjs`'s pure/DOM split + `destroy()` contract and `trace.html`'s bare-page stack; token discipline holds (all fallback tokens exist; the `12px`/monospace `<pre>` literals match `trace.html:66`/`derive.html:44`/`agentic.html:43` precedent).
- **Accurate `CLAUDE.md` map edits** and clean, correctly-ordered `build.mjs`/`drift-check.mjs` wiring.

## Recommendation

**Fix M2 before merge** — it's a shipped, reproducible defect in the pack's own unpack instructions, and a one-line change. **M1 is worth folding in** (cheap junk-file guard; closes a real local-dev determinism hole). **L5 is a one-line copy tweak** I'd take, given the hard honesty contract. L3/L4 are optional comments — leave or address. Everything else is excellent and all automated validation is green. A human makes the final merge call.

*(Posted as a comment, not an Approve/Request-changes — GitHub blocks formal self-review on a solo repo.)*
