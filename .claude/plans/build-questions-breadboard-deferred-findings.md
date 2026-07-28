# Feature: the last three deferred findings from the PR #143 review (#144)

The following plan should be complete, but it's important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

Ticket #144 collected six findings triaged real-but-later out of the PR #143 review
(`.claude/code-reviews/pr-143-review.md`, findings 7–13 minus the ones fixed in that PR). Three have
since been closed by other slices — **7** and **8** by #138/PR #147, **13** by #137/PR #145 — and the
ticket's two comments record that. **Three remain: 9, 10 and 12.** This ticket closes them and closes
#144.

All three are latent: none is reachable as a visitor-facing defect on `build.html` as shipped. What
they are is three places where a comment claims more than the code guarantees, or a line of copy can
make a claim the board in front of the reader contradicts. On a page whose whole subject is method
fidelity and honest self-description, that is the class of defect that matters most here.

- **9 · the two ruleset-owned enums derive in opposite directions.** `rewardType` maps *from*
  `Object.keys(RULESET.patterns)`; `frequency` *filters a hardcoded list against*
  `RULESET.ethics.frequencyFilter`. A ruleset key added to `patterns` breaks loudly at load; one added
  to `frequencyFilter` is silently never offered. The fix makes `frequency` derive the same direction
  its sibling already does, which is also the direction `system/factory-intake.mjs:132-146` already
  established as this repo's pattern for a ruleset-owned enum.
- **10 · prompt ids and radio `name`s are keyed per-act, not per-mount.** The comment says "unique per
  mount"; the code delivers unique per *act*. The two are the same thing on the committed page. The fix
  is the comment, not the code — see NOTES for why the counter and the loud-refusal alternatives were
  both rejected.
- **12 · the no-go count line can contradict an edited board.** `renderToolbar` keeps asserting
  "ruled out by your no-go: People, Connections" after the visitor has added a place named "People".
  The fix names only the ruled-out places that are genuinely absent from the board being described.

## User Story

As a reader working through /build who edits the drafted board,
I want every line the page states about my board to be true of the board actually in front of me,
So that a surface whose argument is method fidelity never asks me to trust a sentence I can see is wrong.

And, as the next engineer to touch these two modules,
I want each header comment to claim exactly what its code guarantees and no more,
So that I don't build on an invariant that was never enforced.

## Problem Statement

Three latent defects on `system/build-questions.mjs` and `system/breadboard.mjs`:

1. One of two ruleset-owned enums is guarded in only one direction, so a future `derive.rules.mjs`
   edit can silently narrow what /build offers (finding 9).
2. A comment states a uniqueness guarantee ("per mount") that the code does not implement ("per act"),
   so a later reader can safely conclude something false about the module (finding 10).
3. A toolbar line describes the *draft's* no-go subtraction in the present tense as though it described
   the *current* board, and after one rename it can name a place sitting on screen (finding 12).

## Solution Statement

Three surgical changes, one per finding, plus one committed browser assertion for the only one that is
observable in a running page:

1. **Finding 9** — add a `FREQUENCY_LABELS` map beside the existing `REWARD_LABELS`
   (`build-questions.mjs:149-153`) and derive the frequency question's options from
   `Object.keys(RULESET.ethics.frequencyFilter)`, exactly as `rewardType` derives from
   `Object.keys(RULESET.patterns)` at `:190`. The existing load-time assert at `:329` then guards the
   direction that was unguarded: a ruleset key with no label throws at load. **No new gate check** —
   `tooling/build-checks.mjs:42` already imports `QUESTIONS`, so that throw *is* a red CI gate. This was
   **run before the plan was finalised**, against scratchpad copies, both with and without the fix — see
   PRE-FLIGHT for the transcripts, the exact message, and the proof that the derived options come out
   byte-identical to the list they replace.
2. **Finding 10** — rewrite the comment at `:419-420` to state the invariant the code actually holds.
   No code change.
3. **Finding 12** — filter the `ruledOut` list in `renderToolbar` (`breadboard.mjs:386-389`) against the
   labels currently on the board, so the clause names only places that are genuinely not there. Every
   edit path already reaches `renderToolbar` (`render()` calls it first at `:539`; both rename verbs
   call it directly at `:269` and `:307`), so no new wiring is needed. Add a `[5b]` check to
   `tooling/build-journey.mjs` that drives the real editor into the review's exact repro.

## Out of Scope / Non-Goals

- **Not included: a per-mount id/name counter for finding 10.** It would churn
  `tooling/build-journey.mjs:132`'s `input[name='bx-q-shape']` selector and the ids named in
  `.claude/plans/build-questions-breadboard.md:389`, to defend a page that does not exist and that
  nothing wants. See NOTES.
- **Not included: making `mountWizard` throw on a duplicate-act mount.** Rejected — it is error
  handling for an impossible scenario (CLAUDE.md), it cannot be gated (`mountWizard` is not exported),
  and a throw inside the self-boot loop at `:549` would abort before `mountVerdict` runs, costing the
  verdict panel and its VR ready handle. Raised in OPEN QUESTIONS instead.
- **Not changing: the meaning of the no-go clause.** After the fix it still names a ruled-out place the
  draft never wanted (default answers want neither "People" nor "Connections", yet a `nogos: "social"`
  answer names both). That is correct under the clause's own stated purpose at `breadboard.mjs:384-385`
  — "a place that is missing because it was ruled out should say so" — and tracking which places the
  no-go *actually subtracted from the draft* is a different feature. See NOTES.
- **Not changing: the verdict panel's answer summary.** It will still read `No-gos: no social features`
  after a visitor adds "People" back. That is not a new contradiction: the summary records what they
  answered, the toolbar records what they built.
- **Not adding: a group 9 to `tooling/build-checks.mjs`.** Its header at `:4` says "Eight groups" and
  enumerates 1–8; #150/PR #155 was a fix for exactly that kind of stale count. Finding 9's gate is the
  import-time throw the file already inherits; findings 10 and 12 live inside mount closures that a
  pure gate cannot reach.
- **Not changing: `system/derive.rules.mjs`.** The ruleset is the source of truth being read here, not
  the thing being fixed.
- **Not touching: findings 1–8, 11, 13** — all landed in #143/#145/#147.
- **Not in scope: #148 (nav + footer index) or #149 (analytics pageview)**, the other two open /build
  tickets.

## Feature Metadata

**Feature Type**: Bug Fix (three latent defects + one committed assertion)
**Estimated Complexity**: Low
**Primary Systems Affected**: `system/build-questions.mjs`, `system/breadboard.mjs`,
`tooling/build-journey.mjs`
**Dependencies**: none new. Playwright stays resolved out of `tooling/visual-regression/node_modules`
and must never become a repo dep.

## Related Work

**Implements**: [#144](https://github.com/linardsb/ux-factory/issues/144) · **Epic**:
[#134](https://github.com/linardsb/ux-factory/issues/134) (plan quoted verbatim in the epic body; the
per-slice plans are the files below)

**Back-references**:

- `.claude/code-reviews/pr-143-review.md` (findings 9, 10, 12 in the Low list, `:255-280`) — Why: the
  source of this ticket; each finding's confirmed mechanism and repro is stated there.
- `.claude/plans/build-questions-breadboard.md` — Why: the plan that built both modules; `:389` names
  the per-act prompt ids finding 10 is about.
- `.claude/plans/build-pattern-render-keep-rail.md` (#137) — Why: scoped 9/10/12 forward, and landed
  `LABEL_MAX` (finding 13).
- `.claude/plans/build-links-in-and-gates.md` (#138) — Why: built `tooling/build-journey.mjs`, the
  driver this ticket extends, and closed findings 7 and 8.

**Forward-references**:

- (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

Line numbers are against `main` at `8927d91`. They have drifted twice since the review (#137, #138,
#139) — trust the named symbols over the numbers.

- `system/build-questions.mjs` (whole file, 557 lines) — Why: two of three findings live here.
  - `:149-153` `REWARD_LABELS` — the exact shape finding 9's `FREQUENCY_LABELS` must mirror
    (`{ value: { label, short } }`).
  - `:190` `options: Object.keys(RULESET.patterns).map((value) => ({ value, ...REWARD_LABELS[value] }))`
    — the derivation to copy, verbatim in structure.
  - `:205-221` the frequency question; `:210-212` the comment that over-claims; `:214-220` the
    hardcoded list + `.filter((o) => o.value in RULESET.ethics.frequencyFilter)` being replaced.
  - `:323-332` the load-time asserts. `:329` (`!o.label || !o.short`) is what turns a missing
    `FREQUENCY_LABELS` entry into a loud failure — this is finding 9's gate.
  - `:419-421` the "Ids have to be unique per mount" comment + `promptId`; `:441` the radio `name`;
    `:482` the listener's `input[name="bx-q-${…}"]` read-back. All three key off the same scheme.
- `system/breadboard.mjs` — Why: finding 12.
  - `:88-93` `NOGO_RULE` — module-private; **do not export it** (the journey check reads the name off
    the running page instead, see Task 4).
  - `:365-399` `renderToolbar`; `:386-389` the `ruledOut` line to fix.
  - `:538-556` `render()` — calls `renderToolbar()` first at `:539`, so every `commit()`-driven verb
    (add/remove place, add/remove affordance, connect, redraft) recomputes the clause.
  - `:259-274` `renamePlace` and `:300-314` `renameAffordance` — the two verbs that deliberately skip
    `render()` and call `renderToolbar()` + `refreshLabels()` directly. **This is the path finding 12's
    repro runs through**, and it is already correct.
- `system/factory-intake.mjs:132-146` — Why: the precedent finding 9's fix restores. `ENUM.frequency =
  Object.keys(RULESET.ethics.frequencyFilter)` at `:137` with a display-only `LABELS.frequency` at
  `:145`; the comment at `:132-133` states the rule ("Option VALUES come live from RULESET … only the
  display LABELS live here"). The five frequency labels must stay word-for-word identical to `:145`.
- `system/derive.rules.mjs:148` — Why: `frequencyFilter: { "multiple-daily": true, daily: true, weekly:
  true, monthly: false, rarely: false }`. **Key order is already exactly the order the hardcoded list
  renders in**, so deriving from `Object.keys` changes no visible ordering. `RULESET` is deep-frozen
  (`:13-18`).
- `system/build-share.mjs:266-277` — Why: the share codec validates every answer against
  `q.options` from `QUESTIONS`. Deriving the frequency options therefore propagates the ruleset into
  the codec's accepted enum for free — nothing to change, but state it in the report.
- `tooling/build-checks.mjs:1-56` — Why: `:4` "Eight groups" and the 1–8 enumeration at `:19-30` are
  the counts you must NOT invalidate; `:42` is the import that makes finding 9's load assert a CI gate.
- `tooling/build-journey.mjs` — Why: Task 4 lands here.
  - `:68-72` `t(name, cond, extra)` and `skip(name, why)` — the only assertion helpers.
  - `:76-96` `newPage(ctx)` (registers the `pageerror`/`console` collectors check `[18]` reads) and
    `settle(p)`.
  - `:112-113` the both-wizards-ready assertion — finding 10's regression canary if you touch mount code.
  - `:216-257` check `[4d]` — the pattern to copy for a check needing its own page: `newPage(ctx)`,
    drive, assert, `close()`.
  - `:263-277` check `[5]`, where `[5b]` goes.
  - `:132` `input[name='bx-q-shape'][value='worklist']` — the external contract that rules out
    re-keying radio `name`s.

### New Files to Create

- `.claude/plans/build-questions-breadboard-deferred-findings.md` — this plan (commit it with the PR).
- `.claude/reports/build-questions-breadboard-deferred-findings-report.md` — the execution report. The
  name is `<plan-name>-report.md`, matching every sibling in that directory
  (`build-links-in-and-gates-report.md`, `build-full-pattern-library-report.md`, …); repo convention is
  that a ticket's plan, report and review ship in the same PR.
- No new source files. Three edited: two shipped modules and one gate.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Shape Up · ch. 4, Breadboarding](https://basecamp.com/shapeup/1.3-chapter-04)
  - Specific section: places / affordances / connections definitions.
  - Why: finding 12's clause is about a *place* being absent. The definitions are already quoted at
    `breadboard.mjs:5-15`; don't restate them, and don't drift from them.
- [Shape Up · ch. 3, Set Boundaries](https://basecamp.com/shapeup/1.2-chapter-03)
  - Specific section: appetite, and no-gos as "things you explicitly declare out of scope in writing".
  - Why: it is the authority for what the no-go clause is allowed to claim — a declaration, not a
    measurement of the board.
- No external library docs apply. Everything here is vanilla ES modules against committed local
  sources; the only third-party surface is Playwright's `locator` API, already used throughout
  `build-journey.mjs`.

### Patterns to Follow

**A ruleset-owned enum derives its VALUES from the ruleset; only LABELS are local.**
`system/build-questions.mjs:187-190`:

```js
    // Values from the ruleset, labels local — factory-intake.mjs:132-146's rule, so a ruleset edit
    // that renames or drops a reward type breaks loudly at load rather than quietly on stage.
    default: "self",
    options: Object.keys(RULESET.patterns).map((value) => ({ value, ...REWARD_LABELS[value] })),
```

**Fail loudly at load, never on stage.** `system/build-questions.mjs:323-332`:

```js
for (const q of QUESTIONS) {
  if (!ACTS[q.act]) throw new Error(`build-questions: "${q.id}" names an act "${q.act}" that has no section`);
  if (!q.options.length) throw new Error(`build-questions: "${q.id}" has no options`);
  ...
  if (q.options.some((o) => !o.label || !o.short)) {
    throw new Error(`build-questions: "${q.id}" has an option missing a label or a short form`);
  }
}
```

**One number, never two that agree today.** `system/breadboard.mjs:41-46` (`LABEL_MAX`) and
`tooling/build-journey.mjs:273-277`, which asserts the DOM against the imported constant rather than
against `60`. Finding 12's journey check follows the same instinct one step further: it reads the
ruled-out name off the running page, so there is no constant to import and no literal to drift.

**A check that cannot fail is not a check** (`build-journey.mjs:26`, and memory
`check-that-cannot-fail`). Every assertion added here must be shown to go red — by mutating the source
and watching it — before it counts as done. Two mutation proofs are named in VALIDATION.

**Comment density and voice.** Both modules carry long prose headers stating the *reason* for a
decision, in this repo's plain register. New comments match that: state the invariant and why, name the
finding number (`#144 finding 9`), and never claim more than the code does — which is the whole point
of finding 10.

---

## PRE-FLIGHT — what was already proven, before this plan was finalised

Finding 9's edit was applied to **scratchpad copies** of `system/build-questions.mjs` and
`system/derive.rules.mjs` and run, so the numbers below are measured rather than predicted. **No repo
file was modified** (`git status` clean throughout; the copies and the three throwaway scripts live in
the session scratchpad and are not proposed for commit). Re-run each against the real tree during
implementation — this section is a de-risk, not a substitute.

**Baseline** — `node tooling/build-checks.mjs` on `main` at `8927d91`:

```
build pattern-ids ✓ · slots ✓ · composition ✓ · codec ✓ · tamper ✓ · artifacts ✓ · vetting ✓ · operator-path ✓
build ✓  all 8 groups pass        (exit 0)
```

**1 · The derived options are byte-identical to the hardcoded list they replace.** The exact
`FREQUENCY_LABELS` + `options:` edit from the tasks below, applied to a copy and diffed against the
untouched copy:

```
ORIGINAL (hardcoded + filter)      DERIVED (Object.keys + FREQUENCY_LABELS)
  multiple-daily | Several times a day | several times a day     ← identical, in this order
  daily | About daily | about daily
  weekly | Weekly | weekly
  monthly | Monthly | monthly
  rarely | Rarely | rarely
IDENTICAL (order, labels, shorts): YES
DEFAULT_ANSWERS.frequency: daily -> daily
frequencyVerdictFor() over all five values: same `passes`, same verdict sentence, all five
```

So the option-order risk the NOTES section flagged is **closed, not deferred** — `derive.rules.mjs:148`
already reads in the render order. Nothing visible changes.

**2 · The gate fires, and the unfixed code is silent — both directions measured.** Adding
`hourly: true` to the copied ruleset's `frequencyFilter`:

```
UNFIXED (hardcoded list + filter):
  NO THROW · 5 options offered: multiple-daily,daily,weekly,monthly,rarely
  → "hourly" is silently never offered. This IS finding 9.

FIXED (derived from Object.keys):
  THREW at load: build-questions: "frequency" has an option missing a label or a short form
```

Two things follow. The finding is **real and measured**, not just quoted from the review. And the
"no new gate check needed" claim holds: that throw happens at import, and
`tooling/build-checks.mjs:42` imports `QUESTIONS`, so CI `verify` goes red. This is why OPEN QUESTIONS
no longer asks whether to add a group 9.

**3 · Finding 12's fixtures, computed from the real `draftBoard`.** `NOGO_RULE` read from source,
boards from the exported pure drafter:

| `nogos` | drafted board | clause names | still absent after the fix |
|---|---|---|---|
| `none` (**default**) | Overview · Progress · Settings | — | — |
| `social` | Overview · Progress · Settings | People, Connections | both |
| `settings` | Overview · Progress | Settings | Settings |
| `history` | Overview · Progress · Settings | Profile, Library | both |

The default row is the no-VR-churn proof, now measured: `nogos: "none"` → `NOGO_RULE.none` is `[]` →
**the clause is absent at rest**, so filtering an empty array is a visual no-op.

The `settings` row is why `[5b]` does not use the obvious fixture: it rules out exactly one place, which
would make the "still names what is still absent" assertion vacuous. And plain `social` on default
answers rules out two places the draft **never wanted** (`rewardType: self` → Progress,
`investment: data` → Settings), so it would only ever exercise the never-coming case.

Sweeping every (`nogos`, `investment`, `rewardType`) combination for one that rules out two places *and*
genuinely subtracts one gives `[5b]`'s fixture:

```
nogos=social investment=content reward=tribe | board=[Overview · Library]
  | ruled=[People, Connections] | ACTUALLY subtracted=[People]
```

`named[0]` is `People` — the place the no-go really removed — and `Connections` is left over to prove
the clause is filtered rather than dropped. Board is 2 of 6 places, so **Add place** is enabled.

---

## IMPLEMENTATION PLAN

### Phase 1: Branch off `main`

`main` has moved since the current checkout: PR #156 merged
`feature/build-operator-path-portal-drawer` (the branch this session started on) at 2026-07-28T08:08.
Work must start from a fresh `main`.

**Tasks:**

- `git checkout main && git pull` — confirm `8927d91` or later is the tip.
- Create `fix/build-deferred-findings-144`.
- Verify with `git branch --show-current` immediately before the first commit (memory:
  `shared-worktree-parallel-sessions` — parallel sessions share this working directory).

### Phase 2: The two `build-questions.mjs` findings (9, 10)

**Depends on:** Phase 1.
**Independent of:** Phase 3 — different file, no shared symbol. The two could be committed separately;
one commit for the ticket is the repo convention and is what this plan assumes.

**Tasks:**

- Add `FREQUENCY_LABELS`, derive the frequency options, update the comment (finding 9).
- Narrow the ids comment to the guarantee the code makes (finding 10).
- Prove finding 9's gate by mutation.

### Phase 3: The `breadboard.mjs` no-go clause (12)

**Depends on:** Phase 1.

**Tasks:**

- Filter `ruledOut` against the board's current labels in `renderToolbar`.
- Extend the comment to say what the filter is for and why the comparison is exact.

### Phase 4: The committed browser assertion

**Depends on:** Phase 3 (it asserts Phase 3's behaviour).

**Tasks:**

- Add check `[5b]` to `tooling/build-journey.mjs`, on its own page, driving the review's exact repro.
- Prove it goes red against un-fixed `breadboard.mjs`.

### Phase 5: Gates, plan/report artifacts, PR

**Depends on:** Phases 2–4.

**Tasks:**

- Run every gate in VALIDATION.
- Commit plan + report with the code.
- Open the PR with `Closes #144` in the **body**.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE `system/build-questions.mjs` — add `FREQUENCY_LABELS` (finding 9, part 1)

- **IMPLEMENT**: A `FREQUENCY_LABELS` const immediately after `REWARD_LABELS` (`:153`), keyed by the
  five `RULESET.ethics.frequencyFilter` keys, each `{ label, short }`. Labels **verbatim** from
  `factory-intake.mjs:145`; shorts verbatim from the list being deleted at `:215-219`:

  ```js
  // The frequency set is the ruleset's too (RULESET.ethics.frequencyFilter is the gate's own key
  // set), so the same rule applies: values from the ruleset, labels local. Labels match
  // factory-intake.mjs:145 word for word — a reader who meets both wizards should not be asked the
  // same question in two different voices.
  const FREQUENCY_LABELS = {
    "multiple-daily": { label: "Several times a day", short: "several times a day" },
    daily: { label: "About daily", short: "about daily" },
    weekly: { label: "Weekly", short: "weekly" },
    monthly: { label: "Monthly", short: "monthly" },
    rarely: { label: "Rarely", short: "rarely" },
  };
  ```

- **PATTERN**: `system/build-questions.mjs:149-153` (`REWARD_LABELS`) — same shape, same position
  relative to `QUESTIONS`.
- **IMPORTS**: none new; `RULESET` is already imported at `:28`.
- **GOTCHA**: `short` is not optional — `:329` throws on an option missing either key. The shorts are
  the lower-case forms the verdict panel's summary renders (`:531`) and `build-keep.mjs`'s downloadable
  spec re-uses; changing their case would change the downloaded artifact.
- **VALIDATE**: `node --check system/build-questions.mjs`
- **SATISFIES**: AC #1

### UPDATE `system/build-questions.mjs` — derive the frequency options (finding 9, part 2)

- **IMPLEMENT**: Replace the hardcoded array + `.filter(…)` at `:214-220` with the derivation, and
  rewrite the comment at `:210-212` so it states **both** directions:

  ```js
    // Values from the ruleset's own filter and labels local, exactly as rewardType above — the
    // direction matters in BOTH senses (#144 finding 9). This question can never offer a frequency
    // the gate has no ruling for, AND a frequency the gate rules on can never go quietly unoffered:
    // a new key with no FREQUENCY_LABELS entry has no label, so the assert below throws at load.
    // The old form filtered a hardcoded list against the ruleset, which guarded only the first.
    default: "daily",
    options: Object.keys(RULESET.ethics.frequencyFilter).map((value) => ({ value, ...FREQUENCY_LABELS[value] })),
  ```

- **PATTERN**: `:190`, verbatim in structure.
- **IMPORTS**: none.
- **GOTCHA**: **Option order is now `Object.keys` order.** `derive.rules.mjs:148` lists
  `multiple-daily, daily, weekly, monthly, rarely` — identical to the list being removed, so the
  rendered order does not change. Verify that by eye before assuming it; a reordered ruleset would
  reorder the radios.
- **GOTCHA**: `default: "daily"` must remain a member. `:326` throws otherwise.
- **VALIDATE**:
  ```bash
  node --check system/build-questions.mjs
  node -e 'import("./system/build-questions.mjs").then(m=>{const q=m.QUESTIONS.find(q=>q.id==="frequency");console.log(q.options.map(o=>`${o.value}|${o.label}|${o.short}`).join("\n"))})'
  ```
  Expect five lines, in ruleset order, `daily|About daily|about daily` second.
- **SATISFIES**: AC #1, AC #2

### VERIFY finding 9's gate by mutation (no file changes retained)

Already run once during planning against scratchpad copies — see **PRE-FLIGHT** below for the
transcripts and the exact message. Re-run it here against the real tree so the report's evidence comes
from the committed code.

- **IMPLEMENT**: Prove the claim "a new ruleset key breaks the gate" rather than asserting it. **Order
  matters and is the whole point:** run the mutation *with the fix in place*. Add a sixth key to
  `RULESET.ethics.frequencyFilter` in `system/derive.rules.mjs:148` (`hourly: true`), run the commands
  below, then **revert the ruleset edit**.
- **PATTERN**: memory `check-that-cannot-fail` — mutate the source, run the function.
- **GOTCHA · why the order is load-bearing**: the same mutation against the *unfixed* module is
  **silent** — the hardcoded list filters `hourly` straight out and five options are offered as if
  nothing happened. That is finding 9 itself, and it is measured in PRE-FLIGHT, not inferred. So a
  mutation run before the fix proves nothing, and a green result there must not be read as "the gate
  works".
- **GOTCHA**: `RULESET` is deep-frozen at `:13-18`, so this must be a source edit, not a runtime
  mutation. Revert with `git checkout -- system/derive.rules.mjs` and confirm `git status` is clean
  before continuing.
- **VALIDATE**:
  ```bash
  node -e 'import("./system/build-questions.mjs").catch(e=>console.log(e.message))'
  node tooling/build-checks.mjs   # expect: the SAME message, at import, before group 1 prints
  node tooling/token-lint.mjs     # expect: unaffected, still green (a ruleset key, not a token)
  git checkout -- system/derive.rules.mjs && git status --porcelain system/derive.rules.mjs
  ```
  The message, **measured** (PRE-FLIGHT, not predicted):
  ```
  build-questions: "frequency" has an option missing a label or a short form
  ```
  `{ value: "hourly", ...undefined }` spreads to a legal `{ value: "hourly" }`, so `:325` (options
  non-empty) and `:326` (`daily` still a member) both pass; `:329` is what throws. Paste both
  transcripts into the report. If `build-checks` does NOT go red, stop — the claim that finding 9 needs
  no new gate check is false and a group 9 is back on the table.
- **SATISFIES**: AC #2

### UPDATE `system/build-questions.mjs` — narrow the ids comment (finding 10)

- **IMPLEMENT**: Replace the two-line comment at `:419-420` with a statement of the guarantee the code
  actually holds. No code change — `promptId` (`:421`), the radio `name` (`:441`) and the read-back
  selector (`:482`) all stay keyed as they are:

  ```js
  // Ids and radio `name`s are keyed per ACT, not per mount (#144 finding 10 — the comment here used
  // to claim per mount, which is more than this code does). Per act is enough for the page that
  // exists: build.html mounts each act exactly once, no question id appears in two acts, so every
  // prompt id and every radiogroup `name` is unique in the document and each radiogroup's
  // aria-labelledby resolves to its OWN prompt. A page mounting the SAME act twice would break both
  // — duplicate ids, and two radiogroups sharing a `name` with no <form> between them, which
  // browsers treat as one mutually exclusive group. That page does not exist and nothing wants it;
  // whoever builds it keys these off a per-mount counter, and updates the two selectors that read
  // the `name` back (`:482` here, and tooling/build-journey.mjs's shape check).
  ```

- **PATTERN**: `tooling/build-checks.mjs:138-142` — the deliberately-vacuous clause kept with a comment
  explaining it, rather than machinery for a case no surface reaches. Same instinct: write down the
  boundary, don't build against it.
- **GOTCHA**: Do NOT introduce a mount counter. It would break
  `tooling/build-journey.mjs:132`'s `input[name='bx-q-shape']` and invalidate the ids named in
  `.claude/plans/build-questions-breadboard.md:389`, for a page that does not exist. Do NOT make
  `mountWizard` throw on a duplicate act either — `:549`'s boot loop would abort before `mountVerdict`,
  costing the verdict panel and the `[data-build-verdict='ready']` handle the VR gate waits on.
  Both alternatives are recorded in OPEN QUESTIONS for the owner.
- **VALIDATE**: `node --check system/build-questions.mjs`, then verify the invariant AC #3 actually
  cares about — that the two keying sites are untouched — rather than trying to prove "comment-only"
  with a grep pipeline that a re-wrapped line would defeat:
  ```bash
  git diff -- system/build-questions.mjs | grep -E '^[-+]' | grep -E 'promptId|name: `bx-q-'
  #   → must print NOTHING
  git diff -- system/build-questions.mjs
  #   → read it: the only non-comment changes anywhere in the file are FREQUENCY_LABELS
  #     and the one `options:` line, both from finding 9
  ```
- **SATISFIES**: AC #3

### UPDATE `system/breadboard.mjs` — the no-go clause names only absent places (finding 12)

- **IMPLEMENT**: In `renderToolbar` (`:386-389`), filter the ruled-out names against the labels
  currently on the board:

  ```js
    // The no-go is stated on the board, not just in the answers: a place that is missing because it
    // was ruled out should say so, or its absence reads as something the drafter forgot.
    //
    // ...but only while it IS missing (#144 finding 12). A visitor can add a place back and name it
    // "People", and the unfiltered line went on asserting that People was ruled out while People sat
    // on the board — a claim about the board that the board contradicts. The comparison is EXACT,
    // matching renamePlace's own `place.label === label`: a visitor who types "people" meaning
    // something else of their own keeps the honest record of what their no-go subtracted.
    const onBoard = new Set(board.places.map((p) => p.label));
    const ruledOut = (NOGO_RULE[answers.nogos] || []).filter((name) => !onBoard.has(name));
  ```

  Leave the two lines that render it (`:387-389`) unchanged.
- **PATTERN**: `:262` (`place.label === label`) and `:304` (`aff.label === label`) — the module's
  existing label comparisons are exact; a case-folded one here would be a new rule invented for one
  line.
- **IMPORTS**: none. `NOGO_RULE` (`:88-93`) and `board` are both already in scope inside `mount`.
- **GOTCHA**: Do **not** export `NOGO_RULE`. The journey check reads the ruled-out name off the running
  page, so there is no second copy of the list to keep in sync.
- **GOTCHA**: No new call sites needed, and adding one would be wrong: `render()` calls
  `renderToolbar()` first (`:539`) so every `commit()` verb recomputes this, and `renamePlace` (`:269`)
  / `renameAffordance` (`:307`) call it directly on the no-full-re-render path. The rename path is
  finding 12's actual repro and it is already covered.
- **GOTCHA**: This is a no-op at rest — `nogos` defaults to `"none"` (`build-questions.mjs:273`) and
  `NOGO_RULE.none` is `[]`, so the clause is absent on a cold load and filtering an empty array renders
  identically. **No VR baseline regeneration.**
- **VALIDATE**:
  ```bash
  node --check system/breadboard.mjs
  node tooling/build-checks.mjs        # draftBoard is imported by 4 groups; expect 8/8 green
  ```
- **SATISFIES**: AC #4

### ADD check `[5b]` to `tooling/build-journey.mjs` — the repro, driven (finding 12)

- **IMPLEMENT**: After check `[5]` (`:277`), a `[5b]` block on its own page that walks the review's
  exact repro and reads every name off the running page:

  ```js
  console.log("\n[5b] the no-go line stops naming a place the visitor put back (#144 finding 12)");
  // On a page of its own: this check ADDS a place, and `edited` latches for the life of the page —
  // every check below [5] builds on the drafted board. Same reason [4d] runs on its own page.
  //
  // Every name here is read off the RUNNING page, never typed: breadboard.mjs keeps NOGO_RULE
  // private, and a literal "People" in this driver would be a second copy of that list waiting to
  // disagree with the first.
  const nogoPage = await newPage(ctx);
  await nogoPage.goto(`${BASE}/build.html`, { waitUntil: "load" });
  await settle(nogoPage);
  // settle() waits on the keep rail and the pattern stage, NOT on the breadboard — check [1] waits for
  // that handle separately, and this page never goes through [1]. Every assertion below reads the
  // breadboard's toolbar, so wait for it explicitly rather than relying on the mount having won a race
  // it usually wins.
  await nogoPage.waitForSelector("[data-breadboard='ready']");
  // These three answers are chosen, not arbitrary (measured — see the plan's PRE-FLIGHT). `social`
  // rules out TWO places, so the clause has something left to name after one is put back — which is
  // what proves the fix FILTERS rather than drops the clause. And with investment=content +
  // reward=tribe the draft genuinely wanted "People", so the no-go really did subtract it: the check
  // exercises a place that was removed, not one that was never coming. Board: [Overview · Library].
  await nogoPage.evaluate(() => import("/system/build-questions.mjs").then((m) =>
    m.setAnswers({ nogos: "social", investment: "content", rewardType: "tribe" })));
  const countLine = nogoPage.locator("[data-breadboard] .bx-bb-count");
  await nogoPage.waitForFunction(() =>
    (document.querySelector("[data-breadboard] .bx-bb-count")?.textContent || "").includes("ruled out by your no-go"));
  const ruledLine = await countLine.textContent();
  const named = ruledLine.split("ruled out by your no-go:")[1].split(",").map((s) => s.trim()).filter(Boolean);
  t(`the no-go states what it ruled out (${named.join(", ")})`, named.length === 2, ruledLine);

  // Put the first one back, by hand, exactly as a visitor would: add a place, rename it to that name.
  const putBack = named[0];
  // The before half of a before/after. Without this the "stops naming it" assertion below could pass
  // on a page where the name was never there to begin with.
  const boardBefore = await nogoPage.$$eval("[data-breadboard] .bx-bb-place .bx-bb-name", (n) => n.map((i) => i.value));
  t(`"${putBack}" is absent before the edit (${boardBefore.join(" · ")})`, !boardBefore.includes(putBack), boardBefore.join(" · "));
  await nogoPage.locator("[data-breadboard] [data-bb-add-place]").click();
  const newName = nogoPage.locator("[data-breadboard] .bx-bb-place .bx-bb-name").last();
  await newName.fill(putBack);
  await newName.blur();
  await nogoPage.waitForFunction((n) => {
    const line = document.querySelector("[data-breadboard] .bx-bb-count")?.textContent || "";
    return !line.includes(`no-go: ${n}`) && !line.includes(`, ${n}`);
  }, putBack, { timeout: 5000 }).catch(() => {});
  const after = await countLine.textContent();
  t(`the line stops naming "${putBack}" once it is on the board`,
    !new RegExp(`\\b${putBack}\\b`).test(after.split("ruled out by your no-go:")[1] || ""), after);
  // ...and the place really is there, so the check cannot pass by the clause vanishing for some
  // other reason (a thrown render would also remove the name).
  const labels = await nogoPage.$$eval("[data-breadboard] .bx-bb-place .bx-bb-name", (n) => n.map((i) => i.value));
  t(`"${putBack}" is on the board (${labels.join(" · ")})`, labels.includes(putBack), labels.join(" · "));
  // The remaining name must survive: the fix FILTERS the clause, it does not drop it. `social` rules
  // out exactly two places, so this list always holds one — asserted unconditionally rather than
  // behind an `if (stillNamed.length)` that could never be false. (The first draft of this check had
  // that branch with a `skip` in the else, which is the "check that cannot fail" shape this driver's
  // own header warns about, one level up: dead code that reads as coverage.)
  const stillNamed = named.slice(1);
  t(`the no-go still names what is still absent (${stillNamed.join(", ")})`,
    stillNamed.length > 0 && stillNamed.every((n) => after.includes(n)), after);
  await nogoPage.close();
  ```

- **PATTERN**: `:216-257` (`[4d]`) for the own-page shape; `:150-155` for reading both sides of an
  assertion off the running page rather than from a literal; `:296-305` for asserting a real outcome
  instead of skipping.
- **IMPORTS**: none new — `newPage`, `settle`, `t`, `BASE` and `ctx` are all in scope inside `journey()`.
  (`skip` is deliberately NOT used; see the "still names what is still absent" comment.)
- **GOTCHA**: `[5b]` must not run on the shared `page`. Adding a place latches `edited`, and checks
  `[6]`–`[17]` build on the drafted board — `[4d]`'s comment at `:218-219` records exactly this trap.
- **GOTCHA**: The two **framing** assertions — `"People" is absent before the edit` and `"People" is on
  the board` — are what stop this from being a check that cannot fail. Without the first, the clause
  might never have named a present place; without the second, a `renderToolbar` that *threw* would also
  stop naming it and the check would pass on a broken page.
- **GOTCHA**: `.bx-bb-name` is an `<input>`, so read `.value` (as done above), not `textContent`.
- **GOTCHA**: `named.length === 2` is asserted exactly, not `>= 1`. `social` rules out exactly two
  places (measured), and an exact count is what catches a `NOGO_RULE` edit that changes the fixture out
  from under this check rather than silently weakening it.
- **VALIDATE**: The snippet above was syntax-checked during planning (extracted, wrapped in an async
  function, `node --check` clean, 5 assertions). Then:
  ```bash
  node --check tooling/build-journey.mjs
  node tooling/visual-regression/serve.mjs &        # repo root on 127.0.0.1:4757
  node tooling/build-journey.mjs chromium           # iterate on one engine
  node tooling/build-journey.mjs all                # then all three
  ```
- **SATISFIES**: AC #5

### VERIFY `[5b]` goes red (mutation proof, no changes retained)

- **IMPLEMENT**: Revert only finding 12's filter (`git stash` the breadboard hunk, or re-inline
  `const ruledOut = NOGO_RULE[answers.nogos] || [];`), run `[5b]` on chromium, watch it fail, then
  restore the fix.
- **PATTERN**: memory `check-that-cannot-fail`; `build-journey.mjs:26`.
- **GOTCHA**: Exactly **one** assertion must fail, and it must be `the line stops naming "People" once
  it is on the board`. The other four — the two-name count, the two framing assertions, and "still names
  what is still absent" — must all stay green. If more than one fails, the harness is broken, not the
  fix; if none fails, `[5b]` is not testing what it claims and must not be committed.
- **VALIDATE**: `node tooling/build-journey.mjs chromium` → exactly one new `✗`. Paste the before/after
  lines into the report.
- **SATISFIES**: AC #5, AC #7

### RUN the full gate set

- **IMPLEMENT**: Every command in VALIDATION Levels 1–4.
- **GOTCHA · ordering, and it is counter-intuitive**: `node agent-layer/gen-loc-summary.mjs --check`
  must run **AFTER staging**, not before. It reads *git-tracked* content, so unstaged edits are
  invisible to it and a pre-stage `--check` is exactly the run that reports a false "no drift" — for
  edits, not only for new files (memory `loc-summary-counts-tracked-only`). `node
  tooling/drift-check.mjs` includes the loc-summary group and inherits the same caveat, so run it after
  staging too. The correct sequence:
  ```bash
  git add system/build-questions.mjs system/breadboard.mjs tooling/build-journey.mjs
  node agent-layer/gen-loc-summary.mjs --check
  node tooling/drift-check.mjs
  # on drift: node agent-layer/gen-loc-summary.mjs && git add system/loc-summary.json
  ```
- **GOTCHA**: Drift here is **plausible, not theoretical** — three tracked files change and `[5b]` adds
  ~30 lines to `build-journey.mjs`. If `--check` reports drift, regenerate, then check whether the
  *runtime group's* rounded (nearest-100) number actually moved: `approach.html` renders only that
  group, so a grand-total-only change fails `verify` without churning any baseline. If the runtime
  group's number moved, regenerate the two approach VR baselines in this PR (memory
  `loc-summary-baseline-cascade`).
- **VALIDATE**: all four levels green.
- **SATISFIES**: AC #6, AC #7

### CREATE `.claude/reports/build-questions-breadboard-deferred-findings-report.md`

- **IMPLEMENT**: The execution report: one section per finding (what it was, what changed, how it was
  proven), the two mutation transcripts verbatim, the gate table, and an explicit "no VR regen, and
  why" line. State that findings 7, 8 and 13 were already closed by #145/#147 so a reader of #144 sees
  why only three landed here.
- **PATTERN**: existing files in `.claude/reports/`.
- **GOTCHA**: The report is a PR artifact by repo convention — four of PRs #97–#100's artifacts were
  written and left uncommitted in worktrees. Commit it.
- **VALIDATE**: `git status` shows plan + report staged with the code.
- **SATISFIES**: AC #8

### COMMIT and open the PR

- **IMPLEMENT**: One atomic commit; then the PR with `Closes #144` in the **body**.
  - Commit: `fix(build): three latent findings — one enum guarded both ways, one comment that
    over-claimed, one line that could contradict the board (#144)`
- **PATTERN**: CLAUDE.md Git rules; memory `prs-dont-auto-close-tickets` — a title mentioning `(#144)`
  closes nothing.
- **GOTCHA**: `git branch --show-current` immediately before committing; stage by explicit path (shared
  working directory).
- **GOTCHA**: The PR body should note that #144's findings 7/8/13 were closed earlier, so `Closes #144`
  is correct and not premature.
- **VALIDATE**: `gh pr view --json body | grep -c 'Closes #144'` → 1. After merge,
  `gh issue view 144 --json state` → CLOSED.
- **SATISFIES**: AC #9

---

## TESTING STRATEGY

This repo has **no test suite, no linter and no type-checker, by design** (CLAUDE.md). "Done" = run the
surface you touched. For /build that means two committed gates plus the mutation discipline:

### Unit Tests

`tooling/build-checks.mjs` is the unit gate — pure, imports the shipped modules, runs in CI's `verify`
job. **No new group.** Findings 9's coverage is the file's existing import of `QUESTIONS` (`:42`) plus
the load-time assert (`build-questions.mjs:329`): a ruleset key with no label makes this gate fail at
import. That is proven by mutation, not asserted.

Findings 10 and 12 are not reachable from a pure gate — `mountWizard` and `renderToolbar` are closures
inside mount functions with no export. Attempting to expose them for testability would be worse than
the defects.

### Integration Tests

`tooling/build-journey.mjs` — the cross-engine driver (chromium · firefox · webkit), operator-run, not
in CI (#138, owner's call). Finding 12 gets check `[5b]`. The existing `[1]` assertion "both wizards
ready" (`:112-113`) is finding 10's canary: if anything about the mount/id scheme is touched by
accident, it goes red on all three engines.

### Edge Cases

- **Frequency option order** — the ruleset's key order becomes the render order. **Measured identical**
  (PRE-FLIGHT §1): same order, labels and shorts, and `frequencyVerdictFor()` agrees on all five values.
- **`default: "daily"` survives the derivation** — guarded by the load assert at `:326`, and confirmed
  in PRE-FLIGHT (`DEFAULT_ANSWERS.frequency: daily -> daily`).
- **A no-go that rules out one place** — `settings` is the only such answer, and `[5b]` deliberately does
  **not** use it: with one name, the "still names what is still absent" assertion would have nothing to
  assert. `[5b]` pins `named.length === 2` instead, so a `NOGO_RULE` edit that changed the fixture fails
  loudly rather than quietly weakening the check.
- **A no-go whose ruled-out places were never wanted anyway** — on *default* answers `nogos: "social"`
  names two places the draft never drew (`rewardType: self` → Progress, `investment: data` → Settings).
  Still correct: they are absent, which is what the clause claims. Recorded in Out of Scope so a reviewer
  doesn't file it — and `[5b]` sets two extra answers precisely so it tests the *other* case.
- **A visitor renaming a place to a lower-case "people"** — the clause keeps naming "People". Deliberate
  (exact comparison), commented at the call site.
- **All ruled-out places put back** — the clause disappears entirely. The answer is still visible in the
  verdict panel's summary, so nothing is hidden.
- **Rename vs add/remove paths** — rename skips `render()` and calls `renderToolbar()` directly
  (`:269`, `:307`); `[5b]` exercises the rename path, and `[5]` already exercises add.

---

## VALIDATION COMMANDS

Execute every command. From the repo root unless noted.

### Level 1: Syntax & Style

```bash
node --check system/build-questions.mjs
node --check system/breadboard.mjs
node --check tooling/build-journey.mjs
node tooling/token-lint.mjs                    # 64 contract tokens · 0 undeclared · 0 orphan
```

The two loc-summary-aware gates go **after** `git add` — they read git-tracked content, so run before
staging they report a false "no drift" (see the RUN-the-full-gate-set task):

```bash
git add system/build-questions.mjs system/breadboard.mjs tooling/build-journey.mjs
node agent-layer/gen-loc-summary.mjs --check
node tooling/drift-check.mjs                   # syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces
```

### Level 2: Unit Tests

```bash
node tooling/build-checks.mjs                  # expect 8 groups, 8 ✓, exit 0
```

Plus the two mutation proofs, each reverted after:

```bash
# finding 9's gate — add `hourly: true` to RULESET.ethics.frequencyFilter, then:
node tooling/build-checks.mjs                  # expect: throws at import, "missing a label or a short form"
git checkout -- system/derive.rules.mjs

# finding 12's check — re-inline the unfiltered ruledOut, then:
node tooling/build-journey.mjs chromium        # expect exactly one new ✗ at [5b]
```

Also confirm the derived enum by hand:

```bash
node -e 'import("./system/build-questions.mjs").then(m=>{const q=m.QUESTIONS.find(q=>q.id==="frequency");console.log(q.options.length, q.options.map(o=>o.value).join(","))})'
# expect: 5 multiple-daily,daily,weekly,monthly,rarely
```

### Level 3: Integration Tests

```bash
node tooling/visual-regression/serve.mjs &     # repo root on 127.0.0.1:4757
node tooling/build-journey.mjs all             # chromium + firefox + webkit, exit 0
kill %1
```

### Level 4: Manual Validation

1. `npx serve .` → open `/build.html`.
2. **Finding 9** — walk Act 1 to question 5. Five frequency options, in the order
   `Several times a day · About daily · Weekly · Monthly · Rarely`, "About daily" pre-selected.
   Pick `Monthly` → the verdict panel's frequency gate flips to the ruleset's `fail` sentence verbatim
   and `data-passes="false"`; the summary reads `Frequency: monthly`.
3. **Finding 10** — no behaviour change. Confirm both wizards still work and each radiogroup's
   `aria-labelledby` resolves to its own prompt:
   ```js
   [...document.querySelectorAll('[role=radiogroup]')].map(g => [g.getAttribute('aria-labelledby'), document.getElementById(g.getAttribute('aria-labelledby'))?.textContent])
   ```
   Two distinct ids, two distinct prompts.
4. **Finding 12** — Act 2, set no-gos to "No social features in the first version". On otherwise-default
   answers the board is `Overview · Progress · Settings` (3 of 6) and the toolbar reads
   `3 of 6 places · N affordances · ruled out by your no-go: People, Connections`. Click **Add place**,
   rename it to `People`, blur. The line must now read `… · ruled out by your no-go: Connections`, with
   `People` on the board. Rename a second added place to `Connections` → the clause disappears entirely;
   the verdict panel still reads `No-gos: no social features` (correct — the answer records what you
   said, the toolbar records what you built).
5. **Finding 12, the case `[5b]` drives** — also set reward to "Other people…" and investment to "They
   add their own material". The board becomes `Overview · Library`, and "People" is now a place the no-go
   genuinely removed rather than one that was never coming. Same put-back walk; same expectation.
6. **Regression** — `Re-draft from answers` restores the full clause.
7. Console clean throughout (`build.html` loads no `scenario-data.mjs`, so there is no expected
   Worker-refusal noise on this page — unlike factory/proto/instance, memory
   `headless-render-data-pages-worker-refused`).

### Level 5: Additional Validation (Optional)

- CI on the PR: `verify` (drift-check · token-lint · build-checks) and `visual` must both be green.
  `visual` should be green **without** a baseline regeneration — if it is red, re-read the two "no VR
  regen, and why" gotchas before touching a baseline.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — `system/build-questions.mjs` carries a `FREQUENCY_LABELS` map and the frequency
      question derives its option values from `Object.keys(RULESET.ethics.frequencyFilter)`, mirroring
      `rewardType` at `:190`. Labels are word-for-word identical to `factory-intake.mjs:145`.
- [ ] **AC #2** — Both ruleset-owned enums are guarded in both directions, and that is *proven*: adding
      a key to `RULESET.ethics.frequencyFilter` without a label makes `node tooling/build-checks.mjs`
      fail at import. Transcript in the report.
- [ ] **AC #3** — The ids comment states only what the code guarantees (per **act**), names the case it
      does not cover, and the diff for finding 10 is comment-only — `promptId`, the radio `name` and
      `tooling/build-journey.mjs:132`'s selector are all unchanged.
- [ ] **AC #4** — The no-go clause names only ruled-out places absent from the current board, on every
      edit path (add · remove · rename · connect · redraft), with an exact label comparison.
- [ ] **AC #5** — `tooling/build-journey.mjs` check `[5b]` drives the review's repro through the real
      editor on its own page: five assertions, every name read off the running page (no `NOGO_RULE`
      literal, no export added), framed by a before *and* an after so it cannot pass on a thrown render.
      Green on all three engines, and *shown* to fail on exactly the one assertion when finding 12's
      filter is reverted.
- [ ] **AC #6** — Every VALIDATION command passes: `node --check` ×3 · `token-lint` · `build-checks`
      8/8 · `build-journey all` on three engines · and, **run after `git add`**, `gen-loc-summary
      --check` + `drift-check`.
- [ ] **AC #7** — No regressions: no VR baseline regenerated, and CI `visual` green without one. If a
      baseline *was* regenerated, the report says which and why.
- [ ] **AC #8** — Plan and report committed with the code (`.claude/plans/`, `.claude/reports/`).
- [ ] **AC #9** — PR body carries `Closes #144`; #144 is CLOSED on merge.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully, with `gen-loc-summary --check` and `drift-check`
      run AFTER `git add` (before it, they cannot see the edits)
- [ ] Both mutation proofs run, and both reverted (`git status` clean of `derive.rules.mjs`)
- [ ] `build-journey.mjs all` green on chromium · firefox · webkit
- [ ] No linting or type checking errors (n/a — this repo has neither)
- [ ] Manual walk of `/build.html` confirms all three findings closed
- [ ] Acceptance criteria all met
- [ ] Plan + report committed alongside the code
- [ ] PR body carries `Closes #144`

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes:**

1. **#144 is closable by this PR.** Findings 7, 8 and 13 are closed by #145/#147 per the ticket's own
   two comments; 9, 10 and 12 are all that remain. If the owner reads the ticket as still open on
   something else, `Closes #144` becomes wrong and the PR should say `Part of #144`.
2. **Finding 10 is a comment fix, not a code fix.** This is the plan's one real judgment call, and it
   contradicts nothing in the review — the review offered both options explicitly ("Either key both off
   a per-mount counter, or narrow the comment to what the code guarantees"). NOTES has the full
   reasoning. **If the owner wants the code fix instead**, the change is: a module-scope
   `let mountSeq = 0` incremented in `mountWizard`, `promptId` and the radio `name` both suffixed with
   it, `:482`'s read-back selector updated, and `tooling/build-journey.mjs:132` changed from
   `input[name='bx-q-shape']` to a scoped `input[value='worklist']`. ~6 lines, but it churns a
   committed gate selector to defend a page that does not exist.
3. **Finding 12's clause keeps its current meaning** — a record of what the no-go declared out of scope,
   narrowed to what is actually absent. It does NOT become a record of what the draft *would* have drawn.
4. **No VR regeneration.** Frequency renders at step 5 of 7 and `renderStep()` boots at `step = 0`, so
   it is never in a baseline; `nogos` defaults to `"none"` → `NOGO_RULE.none` is `[]` → the no-go clause
   is absent at rest. **Measured** (PRE-FLIGHT table), not read off the defaults. CI `visual` confirms.

**Decisions taken, and how to reverse them.** Both of these were open questions in the first draft of
this plan; both are now decided, so an implementer has no fork to resolve. They are recorded here rather
than deleted because they are the two places the owner might legitimately overrule.

- **A duplicate-act mount does NOT refuse loudly.** Decided: no. Three reasons in Out of Scope, the
  binding one being that a throw inside `mountWizard` aborts the `:549` boot loop before `mountVerdict`,
  costing the verdict panel and the `[data-build-verdict='ready']` handle the VR gate waits on — a worse
  failure than the bug it guards. *To reverse:* don't throw inside `mountWizard`; collect the act keys in
  the self-boot block at `:547-551` and throw before mounting anything, so the page fails whole rather
  than half-mounted. Still error handling for an impossible scenario, but not one that strands a panel.
- **No group 9 in `build-checks.mjs`.** Decided: no, and PRE-FLIGHT is why rather than an opinion — the
  mutation showed the existing import-time assert already turns a label-less ruleset key into a red
  gate, with the message quoted. A group asserting `options.map(o => o.value)` equals
  `Object.keys(frequencyFilter)` would pass by construction, which is the "check that cannot fail" shape
  this repo has been burned by. *To reverse:* the one thing such a group would genuinely catch is a
  future edit that re-hardcodes the list; that is what the comment at the call site is for, and a
  two-line group is the fallback if the owner wants belt and braces.

**Still genuinely open (one item):** nothing blocks implementation. Assumption 1 is the only claim
resting on someone else's reading rather than on measurement — if the owner considers #144 open on
something beyond findings 9, 10 and 12, the PR body says `Part of #144` instead of `Closes #144`.

---

## NOTES (open canvas)

### Why finding 10 gets a comment and not a counter

Three options were weighed. The comment's own wording decided it:

> Ids have to be unique per mount, because two wizards are on the page at once and each radiogroup
> points at its OWN prompt.

The stated **reason** — two wizards, each radiogroup pointing at its own prompt — is fully delivered by
act-keying. The **claim** ("per mount") overshoots the reason. So narrowing the claim isn't a
concession; it's the minimal true statement of what the code does and why.

| Option | Cost | Benefit | Verdict |
|---|---|---|---|
| Per-mount counter on ids + `name` | Churns `build-journey.mjs:132`'s `input[name='bx-q-shape']`; invalidates ids named in a committed plan doc; 4 touched call sites | Correctness for a page nothing wants | **rejected** |
| `mountWizard` throws on a duplicate act | Aborts the `:549` boot loop → no `mountVerdict`, no `[data-build-verdict='ready']`, VR wait deadlocks. Not gate-able (not exported). "No error handling for impossible scenarios" (CLAUDE.md) | Converts a silent radio merge into a loud error | **rejected** |
| Narrow the comment | ~8 lines of prose | The file stops asserting an invariant it doesn't hold; the next engineer gets the boundary written down | **chosen** |

Precedent for documenting-rather-than-building is live in this repo: `build-checks.mjs:138-142` keeps a
deliberately vacuous `inLibrary: false` clause with a comment explaining that it is pattern six's
contract, specifically so a later reader doesn't delete it as an oversight. Same move here.

### Why finding 9 needs no new gate check

The chain is already complete, and it is worth spelling out because it looks like a gap:

```
derive.rules.mjs:148  RULESET.ethics.frequencyFilter  ← a new key added here
        ↓ Object.keys(...)          (the fix)
build-questions.mjs   frequency options — a value with no FREQUENCY_LABELS entry has no label/short
        ↓ :329 assert
        throw at MODULE LOAD
        ↓
build-checks.mjs:42   imports QUESTIONS  →  the gate fails at import  →  CI `verify` red
```

**Every arrow in that chain has now been walked** (PRE-FLIGHT §2), so this is a measurement rather than
an argument: the mutation threw `build-questions: "frequency" has an option missing a label or a short
form` at load, and the same mutation against the unfixed module was silent.

Adding a group that asserts `options.map(o => o.value)` equals `Object.keys(frequencyFilter)` would
pass by construction — the exact shape memory `check-that-cannot-fail` warns about. The one thing such a
group *would* catch is a future edit that re-hardcodes the list; that is what the comment at the call
site is for.

The derivation also propagates for free into `system/build-share.mjs:270-273`, which validates a
restored answer against `q.options` — so the share codec's accepted frequency enum now tracks the
ruleset too, without a line of codec change. Worth a sentence in the report; it is the kind of thing a
reviewer would otherwise have to work out.

### Finding 12: the case the fix deliberately leaves alone

With default answers, `nogos: "social"` names both "People" and "Connections" — yet the draft wanted
*neither* (`rewardType: self` → "Progress", `investment: data` → "Settings"). So the line names two
places the no-go never actually subtracted from anything.

That is correct under the clause's own charter (`breadboard.mjs:384-385`): it exists so a place that is
missing because it was ruled out says so, rather than reading as something the drafter forgot. "Absent,
and your no-go is why it would be absent" is a true statement about the board either way. Making the
line report only *actual* subtractions would mean threading a `subtracted` list out of `draftBoard` and
would change what the clause means — a different feature, and one with no finding behind it.

The distinction that matters for finding 12 is narrower and entirely visible: a named place that is
**on the board in front of you**. That is what the filter closes.

This is also exactly why `[5b]` does not drive default answers. On defaults the clause can only ever
demonstrate the never-wanted case, which is the half the fix deliberately leaves alone. Two extra
answers (`investment: content`, `rewardType: tribe`) put "People" into the draft first, so the no-go
genuinely subtracts it and the check exercises the half that matters — measured in PRE-FLIGHT §3.

### Sequencing and risk

Nothing here is risky and nothing is coupled. Phase 2 (build-questions) and Phase 3 (breadboard) touch
different files and share no symbol — parallelisable in principle, pointless in practice at this size.
Phase 4 depends on Phase 3 only because it asserts it.

The frequency **option order** was the one thing that could have gone wrong quietly — a reordered
`derive.rules.mjs:148` would silently reorder the radios. **Closed by measurement, not left to a
by-eye check**: PRE-FLIGHT §1 ran the real derivation against the real list and the two are byte-identical
in order, labels and shorts, with `frequencyVerdictFor()` agreeing on all five values. Nothing visible
changes, which is also what makes AC #7's no-baseline-regen expectation safe.

The remaining risk is `loc-summary`, and it has a trap in the *ordering* rather than in the fix. Three edited
tracked files move line counts, and `approach.html` renders the runtime group's numbers rounded to the
nearest 100. `gen-loc-summary --check` reads git-tracked content, so it must run **after** `git add` —
run before, it cannot see unstaged edits and reports a false "no drift", which is precisely how this
lands on CI `verify` instead of on the desk. If it does drift: regenerate, then decide about the two
approach baselines by whether the *runtime group's* rounded number moved, not the grand total (memories
`loc-summary-counts-tracked-only`, `loc-summary-baseline-cascade`).

---

## AMENDMENTS

<!-- Append-only. Newest at the bottom. Empty at creation. -->

- **2026-07-28 — re-validated against `origin/main` at `428b482`; one correction, one assumption closed,
  three cosmetic deltas. The plan body is unchanged and remains implementation-ready.**

  **Every cited symbol and line number was checked against the tree and holds.** `REWARD_LABELS:149` ·
  the `rewardType` derivation `:190` · the hardcoded frequency list + filter `:220` · the
  label/short assert `:330` · the ids comment `:419`, `promptId:421`, the radio `name` `:441` ·
  `NOGO_RULE:88` and `renderToolbar`'s `ruledOut` `:386-389` · `derive.rules.mjs:148` in the render
  order the plan claims · `factory-intake.mjs:137`+`:145` · `build-checks.mjs`'s "Eight groups" header ·
  `build-journey.mjs:132`'s `input[name='bx-q-shape']` selector and `[5]` at `:263`. The `[5b]`
  snippet's four external dependencies all exist as written: `setAnswers` is exported (`:362`),
  `.bx-bb-name` is an `<input>` so `.value` is right (`breadboard.mjs:450`), `[data-bb-add-place]`
  exists (`:371`), and `[data-breadboard='ready']` is a real handle (`root.dataset.breadboard` at
  `:690`) that check `[1]` already waits on.

  **CORRECTION — do NOT `git stash` for finding 12's mutation proof.** The task at "VERIFY `[5b]` goes
  red" offers "`git stash` the breadboard hunk, or re-inline". **Only the re-inline is safe.** Parallel
  sessions share this working directory (memory `shared-worktree-parallel-sessions`), so a bare
  `git stash` would pocket another session's uncommitted work along with the hunk. Do the mutation by
  hand — replace the filtered line with `const ruledOut = NOGO_RULE[answers.nogos] || [];`, run
  `node tooling/build-journey.mjs chromium`, then restore the fix by hand and confirm with
  `git diff -- system/breadboard.mjs`.

  **Assumption 1 is closed, by evidence rather than by reading.** `gh issue view 144 --comments`
  confirms both halves: comment 1 closes finding 13 via #145, comment 2 states "Findings 7, 8 and 13
  are resolved by #138 (PR #147). This issue stays open for 9, 10 and 12." So `Closes #144` in the PR
  body is correct, not premature, and the plan's one genuinely-open item needs no owner ruling.

  **Deltas, all cosmetic — don't stall on them.** `build-questions.mjs` is 556 lines, not 557. The
  assert's `if` is `:329` and its `throw` is `:330`; the plan cites `:329` throughout, which is the
  condition. `newName.blur()` in the `[5b]` snippet is redundant — `renamePlace` is wired to the
  `change` event (`breadboard.mjs:456`) and Playwright's `fill()` already dispatches `input` +
  `change`; it is harmless, so keep or drop it, but don't debug it as though it were load-bearing.

  **Phase 1 is now mandatory, not a formality.** `main` moved to `428b482` (the #156 merge) while this
  session's checkout sits on `feature/build-operator-path-portal-drawer` at `8927d91`. Branch from a
  freshly pulled `main`.
