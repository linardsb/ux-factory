# PR #364 review — `feat/359-proposals`

Branch `feat/359-proposals`, HEAD `1434f93`, base `main` @ `3dfcce3`. Reviewed against `CLAUDE.md`
(vanilla shipped pages, zero-dep Node ESM, no TypeScript, no zod outside the SDK tool-schema adapter,
plain Errors naming the offending path, honesty contract) — not the Python/FastAPI default rubric.
Fresh-eyes review: claims below are verified against the code and, where practical, against live
runs — not taken from the PR body or the implementation report.

Scope: `discovery/proposals.mjs` (new), `discovery/prd-projection.mjs` (three exports added, no logic
change), `portal/lib/discovery-proposer.mjs` (new), `portal/lib/discovery.mjs` (`extraTools`/`write`
opts), `portal/server.mjs` (four new routes), `portal/public/{portal.js,index.html,portal.css}`,
`tooling/build-checks.mjs` group 34 + six group-30 cases, `discovery/README.md`, `CLAUDE.md`,
`.claude/references/gates.md`, `discovery/allergen-matrix-1/proposals.{jsonl,md}`.

**Verification performed, not just read:**
- `node tooling/build-checks.mjs` → **all 34 groups pass**, exit 0 — run twice, once normally and once
  with `portal/node_modules` temporarily renamed away (trap-guarded, restored automatically) to prove
  build-checks' own import graph is genuinely SDK-free/zod-free at runtime, not just by source-grep.
- `node discovery/proposals.mjs allergen-matrix-1 --stdout` diffed byte-for-byte against the committed
  `discovery/allergen-matrix-1/proposals.md` — identical.
- A standalone script exercising `nextProposalId`/`checkProposalLines` (the repo's real functions, not
  mocks) reproduced the corruption in Finding 1 below end-to-end.

---

## ✅ Strengths

- **The structural claim ("a proposal can never appear in prd.md") is real, not disciplinary.**
  `prd-projection.mjs`'s `readPackage` (prd-projection.mjs:713-731) reads exactly `run.json`,
  `answers.jsonl`, `transcript.jsonl` and returns `{ run, answers, ops }` — no `proposals` key, no
  directory glob. `discovery/proposals.mjs` imports `readPackage` from `prd-projection.mjs` (one
  direction only); grep confirms `prd-projection.mjs` never imports `proposals.mjs` and never names
  "proposals" outside two comments. Case 34.5 doesn't just grep for this — it runs `projectPrd` on a
  package object that **does** carry a `proposals` key (`{...prdPkg, proposals: P_LINES}`) and asserts
  the output bytes are unchanged, with a mutation (34.5c) proving the byte-compare can actually go red.
  That's a behavioral proof, not the "check that cannot fail" pattern this repo has been bitten by
  before.
- **The fence widening (`extraTools`/`write`) is proven not to widen anything for existing callers.**
  `allowsToolName` (discovery.mjs:149-151) is untouched by `extraTools` — it's a separate `||` branch
  in `fenceDecision`, and group 30 case 25 asserts `allowsToolName(PROPOSE_TOOL_NAME) === false`
  directly. The same case proves `extraTools` absent / `[]` / `undefined` give byte-identical
  `{allow, reason}` across a twelve-input battery, and that `write` genuinely diverts the recorder
  (transcript.jsonl stays empty) against a `write: null` positive control that lands the same line in
  transcript.jsonl — so the "stream instead of append" claim is executed, not asserted.
- **CSRF/path-traversal on the four new routes is inherited correctly, not re-implemented.**
  `originAllowed` gates the entire `createServer` callback unconditionally before any `if (p === ...)`
  branch (server.mjs:68), so all four new routes sit behind it automatically. Every one of them calls
  `resolveRunRoot({provenance, slug})` immediately, which runs `assertRunSlug` (regex
  `^[a-z0-9-]{1,48}$`, blocking `..` and `/`) before touching the filesystem, and `assertProvenanceRoot`
  re-checks a `real` root can't resolve inside the repo. No new bypass.
- **The injection battery (34.9) is genuinely a census, not a floor.** It iterates `PROPOSAL_KEYS`/
  `VERDICT_KEYS` (with a guard that the fixture's own keys match those lists, so a field present in
  data but absent from the list can't silently skip the census), injects a smuggled `## `/`#### `/`- `
  payload under all three CommonMark line endings (LF/CR/CRLF — CRLF is the one this repo previously
  had a real hole in), and asserts `folded + refused === expected` with both columns proven non-zero.
  `blockquote()` (prd-projection.mjs:103) splits on logical line endings, closing the exact bare-CR
  hole its own header describes.
- **`proposals.jsonl` is append-only in fact, not just in comments.** Every write site
  (`discovery-proposer.mjs`'s tool handler, `server.mjs`'s verdict route) uses `appendFileSync`; nothing
  in the diff calls `writeFileSync` on that path. `proposals.md`'s deliberate always-overwrite is
  compensated by case 34.11's byte-compare against the committed artifact, which I independently
  re-derived and diffed clean.
- **The browser-side rendering is XSS-safe.** Every model-authored and owner-authored string
  interpolated into `innerHTML` in `renderProposals()` (portal.js) goes through the pre-existing `esc()`
  HTML-escaper; the one place raw text reaches the DOM (`discoveryLog`) uses `textContent`.
- **The `--dry` preflight is a real zero-cost mechanism, not a stub.** It reaches the SDK-bundled
  `McpServer`'s `tools/list` handler directly (no `query()`, no model) and reports failure + non-zero
  exit if the private API becomes unreachable, rather than passing vacuously — but see Finding 1 for
  what this preflight does *not* cover.

## ⚠️ Issues Found

### 1. `portal/lib/discovery-proposer.mjs:234` (`runProposalRun`) + `portal/server.mjs:270-273` — a `force`-rerun corrupts `proposals.jsonl` on the first proposal it files — Severity: **High**

**Defect:** `runProposalRun({ root, run, ops, answers, model, onLine })` (discovery-proposer.mjs:232)
seeds its in-memory store as `const state = { lines: [], ops, refusals: [] };` (line 234) — **never**
from the package's existing `proposals.jsonl` content. The route that calls it
(`server.mjs:270-273`) doesn't pass the existing proposals either:

```js
const r = await runProposalRun({
  root, run: pkg.run, ops: pkg.ops, answers: pkg.answers,
  onLine: (ev) => send(ev),
});
```

`force: true` is the sanctioned, documented way to run a second proposal pass over a package that
already carries proposals (server.mjs:264: *"proposals.jsonl is append-only, so a second run would
interleave two runs' proposals with nothing on the page to tell them apart — **pass force to do it
anyway**"*; `discovery/README.md`'s new §Feature proposals section documents the same refusal). But
because `state.lines` starts empty, `nextProposalId(state.lines)` (discovery-proposer.mjs:204) always
allocates starting from `p1` again, **colliding with whatever the previous run already wrote**.

**Concrete failure, reproduced against the repo's real `nextProposalId`/`checkProposalLines` (not
mocks):** a first run files `p1, p2, p3` to disk via `appendFileSync`. A `force: true` second run's
in-memory check (`checkProposalLines([...state.lines, line], state.ops)` at line 215) passes — because
it only sees its own empty-seeded `state.lines` — so `appendFileSync` writes a **second** `p1` line to
the real file. `proposals.jsonl` now reads `[p1, p2, p3, p1]`. The very next
`checkProposalLines`/`readProposalPackage` call — which is `writeProposalsMd(root)`,
called by `server.mjs:276` **immediately after the run, still inside the lock** — throws:

```
proposals: proposal line 3 repeats id "p1"
```

From that point, **every** route touching the package throws the same way: `GET
/api/discovery/proposals`, `GET /api/discovery/proposals.md`, `POST /api/discovery/verdict`, and the
standalone `node discovery/proposals.mjs <slug>` CLI — because `checkProposalLines` runs at the top of
every one of them. The only way to recover is to hand-edit `proposals.jsonl`, which is exactly what
this file's own append-only/never-hand-edited honesty-contract rule (CLAUDE.md's discovery-proposal-run
bullet; `discovery/README.md`'s new file-shapes table) forbids.

**Why this wasn't caught, and what already stands in front of it:** build-checks group 34 is (by
design, per its own written summary at the end of the group) SDK-free and cannot import
`discovery-proposer.mjs` at all — it reads that file as text. The `--dry` preflight
(`dryProposalRun`, discovery-proposer.mjs:296-329) never calls the tool's handler — it only inspects
the schema via a direct `tools/list` call (DR1-DR3), so it cannot exercise the state-seeding path this
bug lives in. **But DR5 is a real, functioning gate over exactly this precondition, not an
informational note** — I understated this on first read and want to correct that: `row('DR5',
!existsSync(...) || proposals.length === 0, ...)` (discovery-proposer.mjs:324) marks the row
`pass: false` whenever the package already carries proposals, and the CLI's own exit logic
(`const failed = rows.filter(r => !r.pass); if (!reachable || failed.length) { ...; process.exit(1); }`,
lines 326-329) makes `--dry` **fail red and exit 1** in exactly that state. CLAUDE.md makes `--dry`
mandatory before every paid attempt, so an operator following that protocol sees a failing preflight
before ever spending a token on a `force` run — the row's text ("needs --force") doesn't spell out
that force will corrupt the file, but the gate does fire. The shipped, recorded fixture
(`discovery/allergen-matrix-1/`) is a single clean run (`p1`...`p8`, no `force` used), confirmed by
inspecting its `proposals.jsonl` directly, so it doesn't exercise this path either.

**Reachability:** the portal UI exposes no `force` control (`grep -n force portal/public/*.js *.html`
→ no hits) — the propose-button handler always POSTs `{slug, provenance}` with no `force` key. A
normal drawer session cannot trigger this today; it requires a direct API call (curl / devtools) with
`force: true`, deliberately overriding a preflight that already said no. Recovery is renumbering the
colliding server-assigned `id` fields so they continue past the existing max — a mechanical repair of
bookkeeping the server was supposed to compute correctly, not a rewrite of anything model-authored
(`title`/`why`/`rests_on`/`wrong_if` are untouched) — but it is still a hand edit to a file this
project's rules call append-only and never-hand-edited, so it is not a repair to make without the
owner's sign-off. Given the real (if under-worded) DR5 gate, the absent UI trigger, and that recovery
is mechanical rather than content fabrication, I'm rating this **High** rather than Critical: real,
reproducible, and worth fixing before merge, but not a defect a normal session can wander into.

**A design question sits upstream of "just fix the seeding," and it's worth the owner's answer before
either fix lands.** Read server.mjs:264 again: *"a second run would interleave two runs' proposals
with nothing on the page to tell them apart — pass force to do it anyway."* That frames `force` as an
acknowledged-degraded escape hatch, not a first-class repeat-pass feature. And seeding `state.lines`
alone does not fix what that message warns about: `PROPOSAL_SECTIONS` (proposals.mjs) keys sections by
derived **status**, not by run, so two runs' proposals would still interleave inside "Awaiting a
verdict" with no grouping. The one piece of per-run provenance that *does* render —
`*Proposed by:* {model} · prompt surface {fingerprint}` — doesn't actually distinguish them either:
`PROPOSER_FINGERPRINT` is a fixed module-level constant computed once from static inputs
(discovery-proposer.mjs:163-178, assigned at line 177), so every run of an unchanged prompt produces the identical
model+fingerprint on every proposal, run A or run B. So there are two live options, not one: (a) seed
`state.lines` from the existing proposals (the mechanical fix below), accepting that multiple runs'
proposals will remain visually indistinguishable on the page, or (b) treat `force` as not actually
supported yet and have the route refuse it outright until run-grouping is designed. Both are
reasonable; only the owner can say which this ticket intended.

**Fix (option a, if `force` is meant to accumulate):** thread the package's existing proposals into the
run and seed the allocator/validator from them:
```js
export async function runProposalRun({ root, run, ops, answers, proposals = [], model = PROPOSER_MODEL, onLine }) {
  ...
  const state = { lines: [...proposals], ops, refusals: [] };
```
and pass `proposals: pkg.proposals` from `server.mjs:270`. Note `MAX_PROPOSALS`'s own comment
(proposals.mjs:113-115: *"One proposal run's ceiling"*) defines the cap as per-run, not cumulative — so the
`filed >= MAX_PROPOSALS` check (discovery-proposer.mjs:198-199) needs to keep counting only
*this run's* filings (a separate counter starting at 0), not `state.lines.length`, or the fix would
silently change that ceiling's meaning from "8 per pass" to "8 total ever."

**Fix (option b, if `force` is not actually meant to ship yet):** have the propose route refuse
`force: true` unconditionally with a "not yet supported" message, removing the parameter's live
(but broken) path until (a) is designed and built deliberately.

**What is *not* broken by this:** the first (non-`force`) run over any package is unaffected — `pkg.
proposals.length === 0` there, so the empty seed is correct by coincidence. `prd.md` stays untouched
either way (it has no route to `proposals.jsonl` at all — confirmed structurally, not just by this
bug's blast radius). The run lock is correctly released in `withDiscoveryRunLock`'s `finally` even
after this throw, so the server itself isn't left wedged — only the on-disk file is.

## 🔍 Questions/Clarifications

- **The one that matters most:** is `force` meant to let an operator accumulate proposals across
  multiple passes (in which case option (a) in Finding 1 is the fix, and the page also needs some way
  to tell two runs' proposals apart — today it can't, even after the seeding fix), or was it a
  hedge against the append-only refusal that was never meant to be exercised for real yet (in which
  case option (b) — refuse it outright — is the more honest state to ship)? This should be resolved
  before either fix lands, not decided unilaterally by whoever fixes the bug.
- Was `force` deliberately left untested end-to-end (no recorded run exercises it, and DR5 fails the
  preflight in exactly that state rather than validating it) because it's out of scope for this
  ticket's acceptance criteria, or was it assumed the pure-module tests (34.1's `nextProposalId` gap
  case) covered the integration too? 34.1 tests the *pure allocator* correctly continuing from a max id
  it's *given* — it doesn't (and structurally can't, being SDK-free) test that the SDK-side caller
  actually supplies that id history.

## ✨ Recommendations

- **Answer the design question above first.** It decides which of Finding 1's two fixes is correct,
  and building the wrong one (e.g. quietly making `force` work while the resulting page still can't
  distinguish two runs' proposals) would ship a half-fix that looks done.
- If the answer is "`force` should accumulate": apply Finding 1's option (a), and separately design how
  the page groups or labels proposals by which run filed them, since per-proposal `model`/`fingerprint`
  cannot do that job (it's identical across every run of an unchanged prompt).
- If the answer is "`force` isn't ready": apply option (b) now — it's a smaller, safer change, and
  leaves room to build (a) properly as its own ticket once the grouping question has a design.
- Either way, add one more dry-preflight row (a `DR8`) that seeds `state.lines` from `proposals` the
  way a fixed `runProposalRun` would and calls the tool's `tools/call` handler directly (the same
  `server.instance.server._requestHandlers` reach `dryProposalRun` already uses for `tools/list`) with
  a synthetic accept — in-process, zero tokens, same shape as the existing DR0-DR7 battery. DR5 today
  correctly flags "force is needed" but stops short of exercising the path that's actually broken; a
  DR8 would close that gap for good, independent of which option is chosen.

## 📋 Review Summary

- **Overall assessment: Needs revision before merge.** The pure module (`discovery/proposals.mjs`),
  the fence widening, the four refusals, the injection containment, the CSRF/path-traversal posture on
  the new routes, and the gate itself (group 34) are all solid — verified by reading and, where it
  mattered, by running real code against the repo's actual functions rather than trusting the diff or
  the PR's own report. One defect needs resolving: Finding 1 corrupts `proposals.jsonl` the moment the
  documented `force` re-run path is actually exercised. A real preflight gate (DR5) already fails red
  in front of it and no shipped UI control reaches it, which is why this is High rather than Critical —
  but the underlying design question (does `force` even do what its own refusal message claims it
  will?) should be answered before the code is fixed either direction.
- **Issues by severity:** Critical — 0. High — 1 (Finding 1, `force`-rerun id collision). Medium — 0.
  Low — 0.
- **Blocker:** Finding 1, plus the open design question it depends on (see Questions). Not reachable
  through the shipped UI today, and a mandatory `--dry` run already surfaces a red preflight in the
  exact state that matters — so this does not endanger the recorded fixture or a normal drawer session.
  It is still a real, empirically-reproduced defect in a code path this PR ships and documents as
  supported, worth fixing (or explicitly descoping) before merge rather than leaving it live-but-broken.

**Do not start fixing Finding 1 (or anything else in this report) without the user's explicit
approval.** This review is a report, not an authorization to change code.
