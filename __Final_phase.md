# __Final_phase — execution prompts for finishing the open issues

## How to run these

- **One prompt = one fresh, `/clear`ed session.** Every prompt is self-contained. Do **not** chain two
  in one session — start each in a clean context to avoid context rot.
- **Handoffs between sessions are durable artifacts, never chat memory:** a committed plan doc, a merged
  PR URL, a created issue number. Where a prompt depends on a prior one, it names the exact artifact to
  read/confirm first and gives a `<PASTE …>` slot.
- **Big feature tickets (#43, #44) are split into three sessions each — Plan → Implement → Review —**
  because doing all three in one context is where rot bites hardest. Plan doc → hands off to Implement;
  PR URL → hands off to Review.
- Small fixes (#56, the polish batch, the #32-L3 filing, the closures) are one session each.
- Order is top-to-bottom. Don't start a dependent session until its precondition is on `main`.
- **Each section below opens with a short `▶ Do this (operator)` checklist — the steps YOU physically
  take — followed by the copy-paste prompt box. Do the checklist; paste the box; let it run.**

### Repo facts every prompt relies on (verified 2026-07-20)
- **Validation = "run the surface you touched."** No pytest/lint/type suite exists — don't hunt for one.
  A generator prints a `✓`/`--check` line; a page renders under the neutral pack; the portal boots and
  `/api/health` answers.
- **The visual-regression gate captures exactly 8 pages** (`tooling/visual-regression/visual.spec.mjs`,
  `const PAGES`): `index, approach, factory, work, contact, 404, proto/verdant, proto/fieldwork`.
  **`trace.html` is NOT captured** (it says so in its own header comment) — copy/layout edits to
  `trace.html` need **no** baseline regen. Edits that change any of the 8 captured pages **at rest** do.
- **Regen baselines** (Docker + Playwright v1.61.1 required — the committed baselines are Linux/Chromium,
  so a macOS local run will mismatch; only the Docker path produces valid baselines):
  `cd tooling/visual-regression && npm run update:docker`. Commit the changed PNGs in the same PR.
- **A `tokens.source.json` change needs BOTH** `node agent-layer/gen-token-css.mjs` **and**
  `node agent-layer/gen-handoff.mjs`, or `tooling/drift-check.mjs` goes red and blocks `main`.
- Hard constraints: **honesty contract** · **vanilla shipped pages** (no framework/build step/view-time
  LLM) · **token-only components** (no literals in `components.css`) · **one atomic commit per ticket**,
  message = what + governing-doc ref.
- Git hygiene: fresh branch off `main`; **verify the branch right before committing**; **stage by explicit
  path** (the worktree is shared with parallel sessions — `git add -A` can capture a neighbor's edits).
- Solo repo → `/piv-review-pr` can't formally `--approve`; post the verdict via `gh pr review --comment`.

Companion roadmap (fuller rationale + dispositions): `.claude/plans/finish-open-issues-roadmap.md`.

### ▸ Status ledger — updated 2026-07-22

| Step | State | Artifact / evidence |
|------|-------|---------------------|
| **P1** · #56 loc-summary | ✅ done | PR #59 merged · #56 closed |
| **P2** · #57 + #32 L4 polish | ✅ done | PR #63 merged · #57 closed |
| **P3** · #32 L3 split + close #32 | ✅ done | filed #64 · #32 closed |
| **P4a** · #43 plan | ✅ done | `.claude/plans/private-instance-shell.md` |
| **P4b** · #43 implement | ✅ done | PR #65 |
| **P4c** · #43 review | ✅ done | reviewed 07-21 · merged `f1ee752` 07-22 · #43 closed |
| **P5a** · #44 plan | ◀ **NEXT** | #44 open — no plan doc yet |
| **P5b** · #44 implement | ⬜ pending | — |
| **P5c** · #44 review | ⬜ pending | — |
| **P6** · closures #38 / #18 / #1 | ⬜ pending | blocked on #44 |
| **P7** · Motion Phase 2 | ✅ done | PR #52 (phases 0–2) |
| **P8** · Motion Phase 3 | ✅ done | PR #55 |
| **P9** · Motion Phase 4 | ✅ done | PR #58 |

> **Only the #44 track (P5a → P5b → P5c) and the P6 closures remain.** The motion track (P7–P9) shipped 2026-07-20 — ahead of the roadmap's stated "after the issues" ordering, so those preconditions are moot; done regardless. Separately, **#64** (the P3 follow-up: stale-handoff-sidecar design task) is intentionally left open as a standing ticket, not a step to run here. Prompt boxes below are retained for reference/history.

---

## ✅ P1 — #56 · gen-loc-summary reads the working tree  [DONE · PR #59 · #56 closed]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** none — independent, run anytime.
3. **Fill in:** nothing.
4. **Paste the box below**, send, let it run to completion.
5. **Carry forward:** merge the PR it reports. (Nothing downstream depends on it.)

```
You are in a fresh session. Fix GitHub issue #56 in linardsb/ux-factory (cwd = repo root). This is a
one-file, surgical generator fix — no /piv-plan needed.
Start: `git checkout main && git pull`, `gh issue view 56`, then read agent-layer/gen-loc-summary.mjs
in full (it's ~76 lines).

THE BUG (line 42): the file list comes from `git ls-files` (line 33, the tracked/index set) but the
LINE COUNT reads each file's contents from the WORKING TREE:
    const lines = files.reduce((sum, f) => sum + readFileSync(join(ROOT, f), "utf8").split("\n").length, 0);
In the shared worktree, a parallel ticket's uncommitted edits to any tracked file get baked into the
committed system/loc-summary.json. This already happened at f2b54d2 (~100 phantom lines in the "pages"
group; fixed by a clean-tree regen in PR #54). The local --check can't catch it — it compares a dirty
regen against a dirty-generated file, so both agree; only CI's clean checkout goes red.

THE FIX (branch fix/loc-summary-committed-blobs):
1. Read each file's contents from the git INDEX blob instead of the working tree, so contents match the
   same tracked source as the file list. `execFileSync` is already imported (line 15). Replace the
   working-tree read with, per path f:
       execFileSync("git", ["show", `:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
   `:<path>` = the index blob (matches `git ls-files`). (`HEAD:<path>` is also acceptable per the issue,
   but the index is the friendlier discipline: `git add` before regen, not full commit.) A per-file
   `git show` is fine for a build-time generator over a few hundred files — do NOT add a cat-file batch
   optimization unless it's actually slow.
2. Keep EVERYTHING else identical: group regexes/order (GROUPS), git ls-files as the list source,
   round100 rounding, the $description string, --check semantics, the pathToFileURL standalone guard.
   Match the file's header/comment style. If you touch the $description or header wording, keep it honest
   ("counted from the tracked source").

VERIFY (this proves the fix, since --check alone can't):
- On a CLEAN tree: `node agent-layer/gen-loc-summary.mjs && node agent-layer/gen-loc-summary.mjs --check`
  → prints "loc summary ✓ … no drift"; `git diff --stat system/loc-summary.json` shows NO change
  (the fix must not move the numbers vs HEAD).
- Dirty-tree proof: append 50 blank lines to any tracked file WITHOUT staging it, run
  `node agent-layer/gen-loc-summary.mjs`, and confirm system/loc-summary.json is STILL unchanged
  (before the fix it would have grown). Then revert that scratch edit.

DONE = index-blob read in place, clean-tree numbers unchanged, dirty-tree proof passes. Commit on a clean
tree (message refs #56 + the shared-worktree hazard). Then /piv-create-pr and /piv-review-pr in THIS
session (small change). Post the verdict via `gh pr review --comment`. Report the PR URL.
```

---

## ✅ P2 — #57 (L1+L2+L3) + #32 L4 · combined polish PR  [DONE · PR #63 · #57 closed]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** none — independent. (Do this before P3: P3 needs this PR merged.)
3. **Fill in:** nothing.
4. **Paste the box below**, send, let it run.
5. **Carry forward:** merge the PR it reports, then note its URL — P3 needs it.

```
You are in a fresh session. In linardsb/ux-factory (cwd = repo root), fix four deferred low-severity
items in ONE PR on branch fix/polish-lows off main. No /piv-plan — each change is surgical and specified.
Start: `git checkout main && git pull`. Read each target file/region before editing.

--- #57 L1 · trace.html focus-first copy (NO baseline regen — trace.html is not VR-gated) ---
Open trace.html and find the reader copy (~line 104-105):
  "…the four PIV acts: plan → gate → implement → validate. The skeleton is drawn before any step; use
   Next/Prev (or ← →) to fill it in, or Show all to skim."
The scoped arrow-key stepping only fires once the player has keyboard focus. Add a short clause making
that explicit — e.g. "(click or tab into the player first, then ← →)". Copy only; keep it terse and in
the existing voice.

--- #57 L2 · humanize round-trip check labels (factory.html IS VR-gated → regen required) ---
system/derivation-roundtrip.mjs, checksRow() (~line 256):
    Object.entries(checks).forEach(([name, ok]) => row.append(verdictMark(!!ok, name)));
`name` is the raw camelCase key ("monotonic", "bodyInRange", "multiplesOf4", …) shown verbatim to
readers on factory.html's round-trip exhibit. Humanize the DISPLAY label only (keep the raw key for the
pass/fail logic). Add a small humanize helper: split camelCase + digit boundaries, lower-case the tail,
sentence-case the head (bodyInRange → "Body in range"; multiplesOf4 → "Multiples of 4"; monotonic →
"Monotonic"). To enumerate the real keys, read the committed diff the exhibit renders:
`tooling/round-trip/verdant.diff.json` (grep the `checks` objects under type/spacing) and eyeball that
every produced label reads cleanly. Pass the humanized string as verdictMark's label arg.

--- #57 L3 · remove dead hook class (JS-only, no visual change) ---
system/derivation-roundtrip.mjs, accordion() (~line 96): `el("div", "cs-acc rt-acc")`. `rt-acc` has no
CSS target anywhere (verified). Drop it → `el("div", "cs-acc")`. Before removing, re-confirm with
`grep -rn "rt-acc" --include='*.css' --include='*.html' .` returns nothing.

--- #32 L4 · comment-blind token-lint (latent hardening, no visual change) ---
tooling/token-lint.mjs: declaredTokens() (~line 17-19, matches `--x:` in a CSS file) and varsIn()
(~line 23-28, matches `var(--x)` across scanned files) scan raw text, so a token inside a /* … */ CSS
comment counts as real. Add a strip-comments step applied to each file's text BEFORE matching, in BOTH
functions: `text.replace(/\/\*[\s\S]*?\*\//g, "")`. No such comment exists today — pure hardening.
Confirm `node tooling/token-lint.mjs` still prints its ✓ line after the change.

--- regen + verify ---
1. VR baselines: factory.html changed at rest via L2 → `cd tooling/visual-regression && npm run
   update:docker`; commit the updated factory PNG(s). (trace.html L1 needs NO regen.) If the ONLY
   factory change is the humanized text, expect a small text-region diff — sanity-check the diff image.
2. `node tooling/token-lint.mjs` green; render trace.html + factory.html locally under the neutral pack
   and eyeball the round-trip exhibit's check labels + the trace copy.

DONE = four items applied, token-lint ✓, factory baseline regenerated (trace.html untouched by regen).
Commit (message refs #57 L1/L2/L3 + #32 L4), /piv-create-pr → /piv-review-pr in this session, verdict
via `gh pr review --comment`. Note in the PR body that after merge #57 is fully closed and only #32 L3
remains (handled separately). Report the PR URL.
```

---

## ✅ P3 — #32 L3 · file the follow-up ticket, close #32  [DONE · filed #64 · #32 closed]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** the P2 polish PR is MERGED to main.
3. **Fill in:** in the box, replace `<polish PR>` with P2's merged PR URL.
4. **Paste the box below**, send. (No code — it files an issue and closes #32.)
5. **Carry forward:** note the new issue number it reports.

```
You are in a fresh session. In linardsb/ux-factory: #32 L4 shipped in the merged polish PR
(comment-blind token-lint). The remaining item L3 is a real DESIGN task, not a one-liner — file it as
its own issue, then close #32. NO code changes this session.

L3 detail (paste into the new issue body, verify each claim against the code as you write it):
- tooling/drift-check.mjs regenerates the handoff pack and asserts `git status --porcelain -- handoff/`
  is clean.
- BUT agent-layer/gen-handoff.mjs's genHandoff() per-spec loops only ADD/OVERWRITE
  handoff/verdant/{contracts,wc}/<x>; they never DELETE a sidecar whose source spec was removed.
  pack.json / vocabulary.json ARE fully rewritten (so a spec removal is caught there), but a stale,
  already-committed per-spec sidecar stays byte-identical to HEAD → porcelain reports clean → drift
  undetected.
- The naive fix (`rm -rf handoff/verdant` before regen) is WRONG: it would delete the deliberately
  un-generated handoff/verdant/figma-parity.json (written only by the Figma parity script's real run —
  see CLAUDE.md's handoff/ note). So the real fix needs a design call: a tracked manifest of
  generator-owned paths (or equivalent) that drift-check can prune against without touching
  figma-parity.json.
- Precondition (a commit that removed a spec but left its sidecar) does NOT exist today → latent, not a
  live bug. Reference: .claude/code-reviews/pr-31-review.md (L3).

DO:
1. `gh issue create --repo linardsb/ux-factory` — title e.g.
   "gen-handoff/drift-check: stale handoff sidecar for a removed spec goes undetected (needs a
    generator-owned-paths manifest)"; body = the detail above; no labels.
2. `gh issue close 32` with a comment: "L4 (comment-blind token-lint) shipped in <polish PR URL>; L3
   split out to #<new> as a design task." Cross-link both directions.

Report the new issue number and confirm #32 is closed.
```

---

## ✅ P4a — #43 · PLAN ONLY  [DONE · plan committed]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** none — #39 and #40 are already merged, so #43 is unblocked.
3. **Fill in:** nothing.
4. **Paste the box below**, send. It writes a plan doc and does NOT implement.
5. **Carry forward:** COPY the plan-doc path it prints in its final message — P4b needs it verbatim.

```
You are in a fresh session. Produce an implementation plan (do NOT write feature code) for GitHub issue
#43 (linardsb/ux-factory) — the private-instance shell: the Factory-station variant a hiring manager
opens on an unlisted link. Epic #38. Start: `git checkout main && git pull`, `gh issue view 43`, and
read docs/epics/per-company-brief.architecture.md §Recommended approach (private layer) + §Boundaries +
§Other. Run `/piv-plan-implementation #43`.

VERIFIED SEAMS (deps satisfied — #39 and #40 are merged; ticket is unblocked). Inspect each before
planning against it:
- system/factory-intake.mjs — the shared wizard. IMPORTANT: its two scenario configs (verdant,
  fieldwork) are INLINED in a `SCENARIOS[slug] = { label, fictionalNotice, wizard:[{axis,prompt,
  reasoning}], defaults:{brandColor,density,rewardType,frequency}, ethicsReveal }` map, with a deliberate
  comment that "a config loader is speculative generality" for the two known scenarios. The private
  instance must be CONFIGURED (pre-seed + bounds) from a compiled company package's intake defaults —
  so the plan MUST decide the config-injection seam (extend SCENARIOS to accept an injected config vs a
  thin loader) WITHOUT forking renderWizard() or duplicating the wizard. renderWizard(focusOnRender) is
  at ~line 357; the wizard mounts into #intake in factory.html (loaded via
  `<script type="module" src="/system/factory-intake.mjs">`).
- system/derive.mjs — `export function derive(rawInput, ruleset = RULESET)`: the deterministic
  re-derivation the reader's overrides run through (no view-time LLM, ever).
- system/trace-player.mjs — `export function parseTrace(jsonlText)` + `renderTracePlayer(container,
  trace)`: how the embedded derivation trace replays.
- agent-layer/gen-company-package.mjs — `export function genCompanyPackage({ briefPath, outDir })`:
  #39's compiler. It emits the scenarios/<slug>/ shape (copy, intake.defaults, proto config, fixtures,
  token-pack reference) AND enforces a PRIVACY GUARD: it REFUSES to write a real (fictional:false)
  package anywhere inside the public repo (insideRepo check). Brief head has {slug, fictional,
  publishedTokens}.
- traces/pack-seed-verdant.jsonl (+ .raw.jsonl) — #40's committed derivation trace = the shell's test
  embed. factory.html's existing #round-trip exhibit already mounts this via system/derivation-
  roundtrip.mjs — study that station as the layout precedent.

DESIGN TENSION THE PLAN MUST RESOLVE (do not hand-wave):
- The AC says the shell renders from a FICTIONAL test package that still exercises the "real-provenance
  labeling path." But #39's privacy guard forbids a fictional:false package in the repo. So the plan
  must specify HOW the shell's real-brand honesty labels get triggered by a committed FICTIONAL fixture
  — e.g. the honesty labeling is a shell/instance-config concern (the private shell always states
  "speculative work based on public statements, sources linked, not affiliated/endorsed"), and the test
  fixture drives that UI without being a real company. Nail this down.

THE PLAN MUST ALSO PIN DOWN:
- The new shell page/template + a system/*.mjs instance-config module + CSS additions + the fictional
  test package (~600–1000 lines total per the issue estimate). Nothing company-real lands in the repo.
- Real-brand honesty labeling (HARD): speculative-work notice, sources linked, not affiliated/endorsed;
  traces stay "real run, curated".
- Pre-seeded wizard: the package's curated answers shown WITH reasoning; reader overrides re-derive live
  via derive.mjs.
- Embedded derivation trace via trace-player (the "agent proposes your design language from your own
  product; the human gate decides" headline exhibit).
- Slots/links for the hand-crafted prototype screen + handoff pack (jobs-folder content per application,
  NOT this ticket).
- THE VR DECISION, resolved explicitly: does the new shell page enter visual.spec.mjs's PAGES set? If
  YES → the plan includes a baseline regen step (npm run update:docker) AND gating any entrance
  animation behind a discrete-render class (the gate captures under prefers-reduced-motion:no-preference,
  and entrance anims on continuously-rebuilt elements — e.g. the wizard re-render on each override —
  restart-and-blank; see .claude/plans/portfolio-motion notes). If NO → the shell has no VR guard; state
  that tradeoff.

DONE = a committed plan doc under .claude/plans/ that a fresh Implement session can execute with no other
context — it must contain: file list with paths, the config-injection seam decision, the fictional-vs-
real-labeling resolution, acceptance criteria, the VR decision, and a task ordering. End your final
message with the exact plan-doc path. Do NOT implement.
```

---

## ✅ P4b — #43 · IMPLEMENT + open PR  [DONE · PR #65]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** P4a finished — you have its plan-doc path.
3. **Fill in:** replace `<PASTE the .claude/plans/ path that P4a printed>` with that path.
4. **Paste the box below**, send. It implements from the plan and opens a PR (no review here).
5. **Carry forward:** COPY the PR URL it reports — P4c needs it.

```
You are in a fresh session. Implement GitHub issue #43 (linardsb/ux-factory) from its committed plan —
do NOT re-plan. Start: `git checkout main && git pull`. Read the #43 plan doc FIRST:
<PASTE the .claude/plans/ path that P4a printed>. Also `gh issue view 43` for the acceptance criteria.
Branch feature/private-instance-shell, then `/piv-implement` against the plan, task by task.

HARD CONSTRAINTS while implementing (the plan encodes these; hold them even if a task tempts otherwise):
- NOTHING company-real committed — build/render only from the FICTIONAL test package the plan defines.
  If any step would write a real (fictional:false) package into the repo, STOP — that's the privacy
  boundary; the guard in gen-company-package.mjs exists for exactly this.
- Real-brand honesty labeling present and correct: speculative-work notice, sources linked, "not
  affiliated with or endorsed by," traces "real run, curated".
- Wizard CONFIGURED via the seam the plan chose in system/factory-intake.mjs — NEVER fork renderWizard
  or duplicate the wizard. Overrides re-derive live via system/derive.mjs. NO view-time LLM. Vanilla
  only (no framework/build/deps). No public upload surface (screenshots/tokens are jobs-folder inputs).
- Embedded #40 trace (traces/pack-seed-verdant.jsonl) replays via system/trace-player.mjs
  (parseTrace → renderTracePlayer).
- Record the call on whether the replayed trace embeds the company's product screenshots (epic open
  question; default YES on an unlisted link) — state it in the PR body.
- Follow the plan's VR decision. If the shell page is VR-captured: regen baselines
  (`cd tooling/visual-regression && npm run update:docker`) IN THIS PR, and gate any entrance animation
  behind a discrete-render class (not just prefers-reduced-motion). REGARDLESS of the VR decision,
  open the new page in a REAL browser (Safari AND Chrome) and add `min-width:0` to any grid/flex child
  holding wide content (the gate's bundled Chromium has missed real Safari grid blowouts).

VALIDATE (run the surface): serve the repo (`npx serve .`) and load the shell page under the neutral
pack — confirm honesty labels present, wizard pre-seeded with reasoning shown, an override re-derives
live, the embedded trace replays step-by-step, and nothing calls out to a network LLM. token-lint green
if you touched components.css.

DONE = AC met, surface renders, VR decision handled, real browser checked. Commit on a clean branch
(stage by explicit path; message refs #43 + per-company-brief.architecture.md), then `/piv-create-pr`.
Report the PR URL. Do NOT run the review here and do NOT start #44 — both are separate sessions.
```

---

## ✅ P4c — #43 · REVIEW  [DONE · reviewed 07-21 · merged f1ee752 · #43 closed]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session (fresh eyes — do NOT reuse P4b's session).
2. **Precondition:** P4b finished — you have the #43 PR URL.
3. **Fill in:** replace `<PASTE the #43 PR URL from P4b>` with that URL.
4. **Paste the box below**, send. It reviews, fixes blockers, and merges when green.
5. **Carry forward:** confirm #43 is MERGED — that unblocks P5a.

```
You are in a fresh session for a clean-context review of the open PR for GitHub issue #43
(linardsb/ux-factory) — the private-instance shell. PR: <PASTE the #43 PR URL from P4b>.
Run `/piv-review-pr <PR#>`. This is a solo repo — you can't --approve; post the verdict via
`gh pr review --comment`.

Review checklist (verify each against the diff, not the description):
- Honesty contract: speculative-work notice + sources-linked + "not affiliated/endorsed" present and
  reader-visible; traces labeled "real run, curated".
- Privacy boundary: NOTHING company-real committed; only a fictional test package landed; the
  gen-company-package privacy guard was not weakened.
- Wizard is CONFIGURED, not forked — no duplicated renderWizard; the config-injection seam matches what
  the plan chose.
- Vanilla + no view-time LLM intact; overrides genuinely re-derive through derive.mjs; embedded trace
  replays via trace-player.
- VR handling correct: if the shell page is in visual.spec.mjs PAGES, baselines were regenerated in the
  PR and the diff is legitimate (no false-green); entrance animations gated behind a discrete-render
  class. If not captured, that tradeoff is acknowledged.
- The fictional test package truly exercises the real-provenance labeling path (not a stub that skips it).

If findings: fix blocking ones in THIS session, re-validate (render under neutral pack; regen VR if a
captured page changed), stage by path, push. Merge when green. Report final status + merge SHA.
```

---

## ◀ P5a — #44 · PLAN ONLY (only after #43 is merged to main)  [NEXT — NEW SESSION · precondition met]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** #43 is MERGED to main (P4c done).
3. **Fill in:** nothing.
4. **Paste the box below**, send. It writes a plan doc and does NOT implement.
5. **Carry forward:** COPY the plan-doc path it prints — P5b needs it verbatim.

```
You are in a fresh session. PRECONDITION: #43 is merged to main — run `git checkout main && git pull`
and confirm the private-instance shell files exist before planning. Produce an implementation plan (no
code) for GitHub issue #44 (linardsb/ux-factory) — the per-company build + unlisted-deploy path run FROM
the jobs folder, folding spike 2. Epic #38. Read `gh issue view 44` +
docs/epics/per-company-brief.architecture.md §Stack (per-company deploy; private-repo alt rejected
unless direct upload proves fragile) + §Spikes 2 + §Open questions + §Boundaries. Run
`/piv-plan-implementation #44`.

VERIFIED SEAMS:
- agent-layer/build.mjs — the run-FROM-the-jobs-folder orchestrator pattern to mirror (paths resolve
  from the module, not cwd; it consumes a decisions ledger in the jobs folder). agent-layer/lib.mjs =
  shared ledger parsing/helpers.
- agent-layer/gen-company-package.mjs — `genCompanyPackage({ briefPath, outDir })` (#39): compiles a
  brief → scenarios/<slug>/ shape, and REFUSES to write a real (fictional:false) package inside this
  repo. A real per-company build MUST target outDir OUTSIDE the repo (the jobs-folder build target).
- The #43 private-instance shell (now on main) = the page the build assembles around the compiled
  package + derived pack.
- _headers — the noindex/security-header posture the deployed instance must serve.
- Deploy command (CLAUDE.md): `npx wrangler pages deploy . --project-name … --branch …` — for #44,
  a direct upload to an UNLISTED project/branch.

THE PLAN MUST COVER:
- A generic orchestration script (in THIS repo; agent-layer or tooling pattern; run from the jobs
  folder) that compiles brief (#39) + derived pack + #43 shell into a deployable instance directory
  OUTSIDE this repo, then deploys via `wrangler pages deploy` direct upload to an unlisted target.
  Human-triggered, NEVER CI.
- SPIKE 2 as concrete steps: one throwaway build with FICTIONAL content, deployed; TIME the full flow;
  verify the live instance serves _headers noindex/security and is non-discoverable (no sitemap/listing;
  robots/noindex present). Decision rule: under ~10 min AND headers/privacy correct → keep direct
  upload; else move private instances behind Cloudflare Access or a private-repo target.
- ARCHITECTURE-DOC WRITE-BACK as an explicit task: record the spike-2 decision + resolve the epic open
  questions (access control on private links: unlisted URL vs Access/password; route/naming: path on the
  main project vs per-company Pages project) into docs/epics/per-company-brief.architecture.md.
- Privacy boundary: nothing company-real committed — the deliberate, scoped exception to "deploy =
  commit the artifacts," which continues to govern the public site.
- Whether a CLAUDE.md "Commands" entry for the per-company deploy is warranted.

DONE = a committed plan doc under .claude/plans/ implementable from a fresh session (script location +
signature, the spike-2 procedure, the doc-write-back task, acceptance criteria). End with the exact
plan-doc path. Do NOT implement.
```

---

## ⬜ P5b — #44 · IMPLEMENT + open PR  [NEW SESSION]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** P5a finished — you have its plan-doc path.
3. **Fill in:** replace `<PASTE the .claude/plans/ path that P5a printed>` with that path.
4. **Paste the box below**, send. Implements + opens a PR. (Deploy may be Cloudflare-auth-gated — the
   box says to script it and mark it "to run manually" if so.)
5. **Carry forward:** COPY the PR URL it reports — P5c needs it.

```
You are in a fresh session. Implement GitHub issue #44 (linardsb/ux-factory) from its committed plan —
don't re-plan. Start: `git checkout main && git pull`. Read the #44 plan doc FIRST:
<PASTE the .claude/plans/ path that P5a printed>. `gh issue view 44` for acceptance criteria.
Branch (e.g. feature/per-company-deploy), then `/piv-implement`.

HOLD:
- Generic orchestration script in this repo (agent-layer/tooling pattern, run from the jobs folder);
  it compiles the instance into a directory OUTSIDE the repo and deploys via `wrangler pages deploy`
  direct upload to an unlisted target. Human-triggered, never wired into CI.
- Because gen-company-package.mjs refuses real packages inside the repo, the build's outDir MUST be
  outside the repo — verify the script passes an external outDir.
- Run SPIKE 2 with FICTIONAL content only: time the full flow; verify the deployed instance serves
  _headers noindex/security and is non-discoverable. (Deploy needs a Cloudflare-authed wrangler — if
  auth isn't available in this session, do the build + local-serve verification, script the deploy step,
  and clearly mark the deploy/timing as "to run manually," so the PR is honest about what was executed.)
- WRITE the spike-2 decision + resolved open questions (access control; route/naming) back into
  docs/epics/per-company-brief.architecture.md — acceptance criterion, not optional.
- NOTHING company-real committed. Add a CLAUDE.md "Commands" entry only if the plan called for it.

ACCEPTANCE (verify): one command / short documented sequence takes a jobs-folder brief → a live (or
deploy-ready, if auth-gated) unlisted instance, timed; instance verified noindex + non-discoverable;
architecture doc updated. Commit (stage by path; message refs #44 + the doc), `/piv-create-pr`. Report
the PR URL. Review is a separate session (P5c).
```

---

## ⬜ P5c — #44 · REVIEW  [NEW SESSION — fresh eyes]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session (fresh eyes — do NOT reuse P5b's session).
2. **Precondition:** P5b finished — you have the #44 PR URL.
3. **Fill in:** replace `<PASTE the #44 PR URL from P5b>` with that URL.
4. **Paste the box below**, send. It reviews, fixes blockers, and merges when green.
5. **Carry forward:** confirm #44 is MERGED — that unblocks P6.

```
You are in a fresh session for a clean-context review of the open PR for GitHub issue #44
(linardsb/ux-factory) — per-company build + unlisted deploy. PR: <PASTE the #44 PR URL from P5b>.
Run `/piv-review-pr <PR#>`; solo repo → verdict via `gh pr review --comment`.

Review checklist:
- Orchestration is generic and run-from-jobs-folder; the build's outDir is OUTSIDE the repo; NO
  company-real content committed; the privacy guard is intact.
- Deploy is human-triggered, never CI-wired.
- Spike 2 was actually run (or the deploy step is honestly marked "to run manually" if auth-gated) and
  the flow was timed; the noindex + non-discoverable verification is real, not asserted.
- docs/epics/per-company-brief.architecture.md was updated with the spike-2 decision AND the resolved
  open questions (access control on private links; route/naming convention).
- Any CLAUDE.md commands entry matches the actual script.
Fix blocking findings in-session, re-validate, stage by path, push, merge when green. Report final
status + merge SHA.
```

---

## ⬜ P6 — Closures · epic #38, #18, epic #1  [NEW SESSION]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** #43 AND #44 are both MERGED to main (P4c + P5c done).
3. **Fill in:** nothing.
4. **Paste the box below**, send. (No code — it closes #38, #18, #1.)
5. **Carry forward:** the 8 tracked issues are now finished. Motion work (P7–P9) is optional/next.

```
You are in a fresh session. PRECONDITION: #43 AND #44 are both merged to main — confirm with
`gh issue view 43` / `gh issue view 44` (state CLOSED). Close out the finished trackers in
linardsb/ux-factory. NO code changes.

1. Epic #38 (per-company brief layer): children #39–#44 all closed. Edit the issue body to check its
   ticket-list checkboxes (#39–#44), post a short landing-summary comment in the style of epic #1's
   existing landing comment (what shipped per ticket + gate status: token-lint / drift-check / VR / trace
   / scenario checks green on main), then `gh issue close 38`.
2. #18 (PR #16 follow-ups): items 2–4 were resolved in PR #30; ONLY item 1 remains — the
   verdicts-must-differ check in scenarios/validate.mjs is exact only for N=2 and should strengthen to
   pairwise-distinct WHEN a 3rd scenario lands in scenarios/index.json. Nothing to build now. Close #18
   with a comment recording this as the standing trigger and pointing at scenarios/validate.mjs +
   scenarios/index.json. (If the owner would rather keep a live reminder open, leave it open instead —
   default to closing with the note.)
3. Epic #1 (ux-factory platform): all feature children closed and #18 now disposed. Post a final
   landing-summary comment, then `gh issue close 1`. Its body checkboxes read stale (unchecked though
   #2–#14/#17 shipped) — check them or leave, cosmetic.

Report which issues were closed and paste the two landing-comment URLs.
```

---

## ✅ P7 — Motion Phase 2 (folded-in polish, after the issues)  [DONE · PR #52]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** the 8 issues are finished (P6 done). Motion phases run 2 → 3 → 4 in order.
3. **Fill in:** nothing.
4. **Paste the box below**, send.
5. **Carry forward:** merge the PR it reports BEFORE starting P8.

```
You are in a fresh session. Implement Motion Phase 2 for linardsb/ux-factory per the proposed phase 2 in
.claude/plans/portfolio-ux-uplift.md (phases 0–1 already shipped on feature/portfolio-motion-phase01).
Not a tracked issue — folded-in polish. Start: `git checkout main && git pull`; read that plan's phase-2
section in full; branch feature/portfolio-motion-phase02.

VALIDATE THE PLAN FIRST (it may propose names that differ from what shipped): grep the repo to confirm
the exact shipped token names (system/tokens.contract.css / tokens.neutral.css), class names, and module
exports it references actually exist; import from the right files; use SHIPPED names, not the plan's
proposed ones. Flag any drift in your first message before writing code.

CONSTRAINTS: vanilla shipped pages, token-only components (no literals in components.css), honesty
contract, calm/non-flashy colour (excitement via motion + craft, not colour). Which of the 8 VR-captured
pages does this phase touch (index/approach/factory/work/contact/404/proto-verdant/proto-fieldwork)? Any
at-rest change to one of them → regen baselines in the SAME PR
(`cd tooling/visual-regression && npm run update:docker`). CRITICAL motion rule: gate every entrance
animation behind a DISCRETE-RENDER class, NOT just prefers-reduced-motion — the VR gate captures under
no-preference, and entrance anims on elements rebuilt each input tick restart-and-blank (this caught
PR #55). Rest state must == final state so reduced-motion keeps today's instant snap. Eyeball changed
pages in a real browser.

DONE = phase-2 changes applied, changed captured pages' baselines regenerated, pages render under the
neutral pack, token-lint green. Commit (stage by path), /piv-create-pr → /piv-review-pr (in-session if
small; open the PR and review in a FRESH session if the diff grew large); verdict via
`gh pr review --comment`. Report the PR URL.
```

---

## ✅ P8 — Motion Phase 3: Factory showpiece (after Phase 2)  [DONE · PR #55]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** P7 (Motion Phase 2) is MERGED to main.
3. **Fill in:** nothing.
4. **Paste the box below**, send.
5. **Carry forward:** merge the PR it reports BEFORE starting P9.

```
You are in a fresh session. Implement Motion Phase 3 for linardsb/ux-factory per
.claude/plans/portfolio-motion-phase03-factory-showpiece.md (make the Factory page PERFORM). Not a
tracked issue. Start: `git checkout main && git pull`; read that plan fully; branch
feature/portfolio-motion-phase03.

VALIDATE FIRST per the plan's own opening caveat: confirm shipped token names, class names, and module
exports before implementing — use shipped names, not the plan's proposed ones; import from the right
files. This phase centers on factory.html, which IS VR-captured (visual.spec.mjs waits on
#reskin-preview, #agents-player, #roundtrip-diff, #roundtrip-player readiness) — expect a factory
baseline regen. (Same surface as the already-shipped #57 L2 label change — no conflict; just a second
factory regen.)

CONSTRAINTS: vanilla, token-only, honesty contract, calm colour. Regen factory (and any other changed
captured page) baselines in the PR (`npm run update:docker`). Gate every entrance animation behind a
discrete-render class (no-preference capture trap; rest == final); the wizard/trace/checks surfaces
re-render on interaction, so any entrance motion on them must be discrete-render-gated or it churns the
baseline. Eyeball factory.html in a real browser; add `min-width:0` to any grid/flex child holding wide
content (code blocks, embeds) — the gate's Chromium has missed real grid blowouts.

DONE = phase-3 changes applied, factory.html renders under the neutral pack, baselines regenerated,
token-lint green. Commit (stage by path), /piv-create-pr. If the diff is large, run /piv-review-pr in a
FRESH session; else review in-session. Verdict via `gh pr review --comment`. Report the PR URL.
```

---

## ✅ P9 — Motion Phase 4: Visual richness (after Phase 3)  [DONE · PR #58]

**▶ Do this (operator):**
1. Open a fresh `/clear`ed session.
2. **Precondition:** P8 (Motion Phase 3) is MERGED to main.
3. **Fill in:** nothing.
4. **Paste the box below**, send.
5. **Carry forward:** merge the PR it reports. All work — issues + motion — is then complete.

```
You are in a fresh session. Implement Motion Phase 4 for linardsb/ux-factory per
.claude/plans/portfolio-motion-phase04-visual-richness.md (restrained, token-driven visual richness).
Not a tracked issue. Start: `git checkout main && git pull`; read that plan fully; branch
feature/portfolio-motion-phase04.

VALIDATE FIRST per the plan's opening caveat — confirm shipped token names AND the generated-artifact
regen chain. This phase is the most likely to touch tokens: if you change system/tokens.source.json you
MUST run BOTH `node agent-layer/gen-token-css.mjs` (regenerates tokens.contract.css + tokens.neutral.css)
AND `node agent-layer/gen-handoff.mjs` (regenerates the handoff pack), or tooling/drift-check.mjs goes
red and blocks main. Keep colours calm/non-flashy (excitement via motion + craft, not colour).

CONSTRAINTS: vanilla, token-only, honesty contract. Regen VR baselines for every changed captured page
in the PR (`npm run update:docker`). Gate entrance animations behind a discrete-render class (no-
preference capture; rest == final). If ANY token changed, regenerate the full chain + handoff pack so
drift-check stays green (verify: `node tooling/drift-check.mjs` and `node tooling/token-lint.mjs` both ✓).
Eyeball changed pages in a real browser.

DONE = phase-4 changes applied; if tokens changed, gen-token-css + gen-handoff both re-run and
drift-check + token-lint green; changed captured pages' baselines regenerated; pages render under the
neutral pack. Commit (stage by path), /piv-create-pr. Review in a FRESH session if the diff is large.
Verdict via `gh pr review --comment`. Report the PR URL.
```
