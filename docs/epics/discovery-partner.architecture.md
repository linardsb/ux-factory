# Architecture — Discovery Partner

Intent: [discovery-partner.prd.md](./discovery-partner.prd.md)
Platform decisions this builds on: [ai-first-ux-factory.architecture.md](./ai-first-ux-factory.architecture.md)

Decided 2026-08-27, interactively with the PRD holder. Grounded in a read of the two live Agent SDK
paths (`portal/lib/chat.mjs`, `portal/lib/builder.mjs` + `portal/record-composition.mjs`), the fence
and recording discipline (`portal/lib/trace-recorder.mjs`, `portal/record-build.mjs`), the op-vocabulary
precedent (`system/board-ops.mjs` + `tooling/board-op.mjs`), the shared-config precedent
(`system/build-questions.mjs`), and the installed SDK's own surface at 0.1.77. High-level decisions
only — per-ticket implementation plans come later.

## Problem & goals

A person starting a product, holding a blank idea or an existing PRD, sits down with the portal and is
interviewed against a scripted, attributed question bank — one question at a time, thin answers pushed
back on once — and leaves with a run package whose every decision carries an evidence link, a wrong-if
line and a named parent requirement. Every decision below is judged against that, under the standing
hard constraints: the portal stays local and undeployed, no shipped-page surface changes, the terminal
`think` path stays installed and unmodified as the control, and the honesty contract holds.

The load-bearing claim is MVP 6's: **the agent judges form, never substance.** It may say an answer
names no number, no user or no alternative; it may not supply the content that is missing. The whole
pack's auditability rests on that line, so the architecture's first job is to make it structural rather
than prompted — the PRD's own framing, that what the UI adds "is not intelligence… it is a structure
the output must fit."

## Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| A | **Agent-led conversation** — one resumed session carries the bank in its system prompt; the agent asks, judges and writes the run package through a fenced `Write` | Cheapest, closest to `chat.mjs`, and every affordance is free. But the honesty line is a prompt promise nothing checks: the agent has a text path into the package and can supply what the human did not. Catching a slip means reading every transcript, forever — which is the terminal's failure mode with extra steps | Rejected |
| B | **Server-led state machine** — the server sequences and writes everything; the agent only ever returns a verdict on one answer | Maximum enforcement. But MVP 7 (look it up) and MVP 9 (the escape hatch) are exactly the moments the agent must act rather than judge, so both need a second mechanism bolted on beside the first | Rejected |
| C | **Server sequences, agent acts through an op vocabulary** — the server owns cursor, depth and branch and injects one question per turn; the agent's only write path is a validated op grammar whose applier is a plain SDK-free module | Middle cost, and it depends on the agent yielding after one op (spike 2). But the honesty line holds by construction, the metrics become server-side counters, and the grammar is exercisable in CI with no agent and no tokens | **Chosen** |

## Recommended approach

**C, with one field deliberately absent.**

The server holds the clipboard: the depth ladder, the branch, the cursor, and the store of what the
human typed. It injects **one** banked question per turn along with that question's own weak-answer
note. The agent's turn narrows to: judge this one answer against that note, push back once if it is
thin, emit **at most one closing op**, and yield. That is `builder.mjs`'s own idiom one layer up —
three committed rules draft the question there and the agent never chooses it — and it is a deliberate
departure from `board-op.mjs`, which is a *batch* recorder (brief in, agent works alone, no human
mid-loop). Discovery is ask-stop-wait-record, and an autonomous worker asked to be patient will run
ahead, ask three at once, or skip the filing.

**The op carries a reference to the answer, never the answer.** `record_decision` takes
`answer_ref: "a7"`; the applier resolves `a7` against `answers.jsonl`, which only the server writes and
only when the human submits. There is no string parameter for the answer text. The line is not
"validated to match what the human wrote" — the field does not exist, so the agent has no route to
supply content at all. This is what makes MVP 6 structural, and it is the single decision the rest of
the design exists to support.

**Two files, so the separation is visible.** The human's words live in `answers.jsonl`, written only by
the server and only on submit. Everything the agent does lives in `transcript.jsonl` — what it said, what
it filed, and what the fence denied — as typed lines, the shape `traces/README.md` already defines.
An auditor diffs two files rather than reading any code.

**Both halves of MVP 6 need recording, and they are recorded differently.** `answer_ref` stops agent text
entering the package, which covers "it may not supply the content that is missing". It does nothing about
the other half — "it may not say an answer is wrong" — because that violation happens in the pushback
prose, which never touches an op. So the agent's turn text is captured too, from the message loop the way
`trace-recorder.mjs` captures assistant blocks as `kind: 'text'` steps. Without it that half of the line is
unfalsifiable, and it is the half the honesty claim is most often tested on.

Everything else follows from putting every rule in one place. `discovery/ops.mjs` holds the
vocabulary and a pure applier with no SDK in its import graph, so `tooling/build-checks.mjs` can feed it
malformed ops in CI where `portal/node_modules` does not exist — the discipline `builder.mjs`'s header
already states, that a guard reachable only by starting a real agent run is a guard nobody tests.

## Key decisions

### Stack & libraries
- **No new shipped dependency, and no new shipped surface.** The bank, the ops and the run package are
  build-time/portal-time only; nothing on the public IA changes, and `system/`'s three-layer token
  contract is untouched.
- **One hook, not five.** `PreToolUse` runs the read fence and fails closed. `canUseTool` runs the same
  predicate, because `trace-recorder.mjs`'s own header records that the permission fast path can
  auto-allow without ever consulting it — so the fence is one predicate called from two places, exactly
  as `record-build.mjs` already does it. `PostToolUse` is **not** needed for the transcript — the applier
  records each op as it lands and the SDK message loop yields the agent's text blocks directly, which is
  where `trace-recorder.mjs` gets its own `kind: 'text'` steps from. `Stop` is **not** used to force a
  filing (the server drives the loop and already knows when a turn filed nothing), and
  one-op-per-question is **not** a hook (it is a rule in the applier, next to the other rules, where CI
  can reach it).
- **No skills.** Settled by the PRD twice — G13/MVP 3 puts the bank in a data file precisely so SDK skill
  discovery is an optimisation and never a blocker, and C1 forbids touching the global `think` skill.
  Two further reasons to keep it that way: a skill description costs tokens on every session against the
  11k Disclosure-held ceiling whether it is used or not, and a skill is *model-invoked*, which is the
  opposite control direction to a server that decides what the agent sees one question at a time.
  Observed at 0.1.77: `settingSources` appears in `sdk.mjs` and the bundled CLI references a skills
  directory, so the machinery exists — the PRD's "plausible but unproven" label stands, and nothing here
  depends on the answer.
- **Op transport is the one open library call — spike 1.** Observed: the installed SDK exports
  `createSdkMcpServer` and `tool`, so an in-process typed tool is available rather than hypothetical. It
  is the better fit for an interactive loop — no subprocess per answer, no shell quoting of free prose
  (the bug class `board-op.mjs:#226` already met on a path with a space), and it runs inside the session
  so it can resolve `answer_ref` directly. The cost: `tool()` takes a Zod schema, and `zod` is a **peer
  dependency** of the SDK (`^3.25.0 || ^4.0.0`, resolved at 4.4.3 in `portal/node_modules`) rather than a
  declared one — so adopting it amends CLAUDE.md's "the portal's sole dependency is
  `@anthropic-ai/claude-agent-sdk`". The fallback is the proven `board-op.mjs` shape: a CLI the agent
  reaches through a fenced `Bash`, reading the answer store off disk. Reversible either way; the applier
  and the grammar do not change.
- **Session model: resume-per-turn, keyed by run slug.** `chat.mjs`'s proven pattern (`resume:
  sessions[key]`), with `sessionId` recorded in the package meta the way `trace-recorder.mjs` records it
  on its meta line. Disk is authoritative, not memory, so a page reload resumes a session and a server
  restart loses nothing but the SDK's own conversation cache. Observed and **not** adopted for wave 1:
  the SDK also exports `unstable_v2_createSession` / `unstable_v2_resumeSession` / `unstable_v2_prompt`,
  which is the shape this loop actually wants — the `unstable_` prefix is why it is the upgrade path and
  not the first slice.
- **Concurrency:** one run at a time, refused rather than queued, reusing `builder.mjs`'s `withRunLock`
  reasoning — a queued second run spends tokens the operator did not knowingly ask for twice.

### Data model
- **The bank — `discovery/bank.mjs`.** Hand-authored, frozen, Node-import-safe, no SDK in its graph.
  Shaped like `system/build-questions.mjs`: data plus the pure selectors over it (depth ladder,
  product-type branch, the conditional modules). **It does not go in `system/`, and the reason is
  measurable rather than aesthetic.** `agent-layer/gen-loc-summary.mjs` counts three groups, one of
  which is every `system/*.{css,mjs,js}` under the label *"design system (system/ — tokens,
  components, view-time modules)"* — 77 files today. A bank filed there grows that count, changes
  `system/loc-summary.json`, changes the number `approach.html` renders at view time, and churns
  approach's VR baselines — turning an additive portal epic into one that re-baselines a shipped
  page. It would also make a generated, publicly-rendered number **false**: an agent question bank is
  not a view-time design-system module. `discovery/` matches no group, so nothing is counted and
  nothing churns. (The earlier reasoning — that `system/` is where many-readers definitions live,
  after `board-ops.mjs` — does not hold: all 58 `system/*.mjs` are reachable from a page or another
  system module, so `board-ops.mjs` is shipped code with extra readers rather than shared code that
  happens to sit there.) A top-level `discovery/` holding the bank, the op grammar, its README and the
  run packages is the same shape `scenarios/`, `traces/` and `replay/` already take, and it closes the
  PRD's open question 3: any Node reader can import it. Each question keeps its
  attribution, its weak-answer note and its OBSERVED / DERIVED / THIN label from
  `docs/research/question-bank-source.md`; the source file stays as the citation, the module is the
  edited bank. Per C3, no role or seniority title appears in it.
- **The op vocabulary — `discovery/ops.mjs`.** The vocabulary plus a pure applier, mirroring
  `system/board-ops.mjs` (`OPS` list, `PARAMS` entry, switch, and a `build-checks` group that iterates
  them, so a new op with no case fails loudly rather than being silently skipped). **Four ops, and the
  count is deliberate:**

  | Op | Carries | Closes the turn? |
  |---|---|---|
  | `record_decision` | `question_id` (nullable) · `answer_ref` · `level` (business / stakeholder / solution / transition) · `parent_id` · `evidence_refs` · `wrong_if` · `off_script` | when `off_script: false` |
  | `flag_weak_answer` | `question_id` · `answer_ref` · `missing[]` | yes |
  | `open_question` | `source` (banked / off-script) · `question_id` (nullable) · `answer_ref` · `reason` | when `source: banked` |
  | `file_evidence` | `url` or `ref` · `provenance` (real-interview / secondary-source / assumption / fictional-scenario) · `claim_ref` | no |

  MVP 8's parked question and MVP 9's off-script filing are **not** their own ops: parking is
  `open_question` with `source: banked`, and an off-script exchange is either `record_decision` with
  `off_script: true` or `open_question` with `source: off-script`. Fewer verbs, same coverage, and one
  place to change when the rule moves.
- **The rule that makes the metrics computable (R2) — and it keys on the turn, not on the question.**
  Exactly **one closing op per banked-question turn** before the cursor advances. `file_evidence` never
  closes a turn and may fire many times. **Off-script ops never close a turn either**, which is what
  makes MVP 9's escape hatch expressible: an exchange filed against a banked question that already has
  its outcome is the normal case (it is usually *why* the person went off-script), and one filed against
  no banked question at all is the other case the PRD names. Both attach to the run without consuming a
  turn's slot and without advancing the cursor. Keying the counter on `question_id` instead would refuse
  the entire off-script path.

  So every banked question ends with exactly one recorded outcome, and the **not-a-form counter is
  arithmetic rather than judgement**: a `record_decision` or a `flag_weak_answer` resets it to zero, an
  `open_question` increments it — parking counts as neither a decision nor a weak-answer note, per the
  PRD, so four parked in a row reads as 4 and trips the guard. Off-script ops do not touch the counter.
  Coverage of the twelve-question opening set is the same read. Costs one field now; costs a format
  migration after runs 1 and 2 are recorded.
- **Refuse versus flag, reconciled.** MVP 6 says the agent *may refuse* to record a decision with no
  evidence link; MVP 10 says such a decision *is flagged, not silently accepted*; MVP 8 says blocking is
  not available. The applier resolves all three: **a missing field is refused, an empty one is accepted
  and flagged.** `evidence_refs: []` records with `flagged: no-evidence`; `parent_id: null` records with
  `flagged: orphan`; the field absent altogether is a throw naming the op. So a session can never
  deadlock on evidence that is not findable yet, and the pack can never quietly contain an unbacked
  decision.
- **What the applier actually refuses** (the four throws worth naming): an `answer_ref` that does not
  resolve to an entry in `answers.jsonl` — the answer-by-reference rule's teeth, and the one that matters
  · a second closing op in a turn that already has one · a **non-null** `question_id` naming a question
  the bank does not hold (null is legal and means off-script, per the rule above) · a provenance label
  outside the four.
- **The run package.**

  ```
  discovery/
    bank.mjs               the 65 questions + the depth/branch selectors
    ops.mjs                the op vocabulary + the pure applier
    README.md              the format  (mirrors traces/README.md, scenarios/README.md)
  discovery/<slug>/        fictional runs, committed (mirrors traces/, replay/, scenarios/)
    run.json               meta: entry mode, depth, branch, provenance, sessionId, front end used
    answers.jsonl          everything the human typed, keyed and verbatim, banked answers and
                           off-script input alike — server-written only, never rewritten
    transcript.jsonl       append-only, typed lines: `text` (what the agent said) ·
                           `op` (what it filed) · `denied` (what the fence refused)
    prd.md                 generated (MVP 11)
  ```

  `run.json` records **which front end was used**, because that is how the Switch metric is measured.
- **Provenance decides the root (R1) — the constraint the PRD does not state.** `builder.mjs`'s
  `assertFictional` refuses real employer material anywhere under this public repo, because every run
  path writes there. Runs 1 and 2 are fictional and belong in-repo as committed evidence; "the owner's
  next real product" — the Switch metric's actual subject — does not. So a session **declares its
  provenance at start** and the root branches: fictional → `discovery/<slug>/` in-repo, real →
  `<JOBS_DIR>/_discovery/<slug>/`, same shape. The first slice writes files somewhere either way, so the
  branch is cheaper now than as a migration on the day the metric is finally tested.
- **The generated PRD is a pure fold over the ops**, not a second authored artefact — projected into the
  house PRD shape and then edited by the human. Placement at slicing; the constraint is that it reads
  the package and nothing else, so a PRD can never carry a claim the ops do not.

### Boundaries & contracts
- **The read fence is an allow-list, and it runs twice.** The PRD records a `canUseTool` deny-list; this
  is a refinement of that recorded requirement, not a substitution. Run 1's key is
  `<JOBS_DIR>/_portfolio/decisions.json` plus the sealed pre-registration; run 2's key is the findings
  list **printed inside `docs/epics/discovery-partner.prd.md`, one directory above the fixture the run
  must read**. Enumerating denials across two trees, one of which contains the run's own input, is a
  list that has to stay perfectly in sync forever. "This run may read its fixture, the bank, and its own
  package — nothing else" is one line, and it is gateable. Run in `canUseTool` **and** in a `PreToolUse`
  hook, failing closed, because the permission fast path can bypass the former.
- **`WebSearch` / `WebFetch` are a separate fence and stay open** — MVP 7's look-it-up path is about the
  internet, not the filesystem, and no path allow-list touches it. What holds the honesty line there is
  the op grammar, not the fence: a fetched source enters the package only as a `file_evidence` row with
  a URL and a provenance label, and the human still writes the answer.
- **No write tools at all.** `Write` and `Edit` are denied outright; the op is the only write path, and
  the run package is written by the applier. This is a tighter fence than `chat.mjs`'s (which allows
  writes inside `_factory/kb/`) and matches `record-build.mjs`'s posture — a tool the agent cannot reach
  is a tool it cannot misuse.
- **Auth is the subscription, unchanged, and that is what makes daily use viable.** `portal/.env.example`
  says it plainly: paste the token from `claude setup-token`, and without one the run falls back to the
  Claude Code CLI's own login on this Mac. Both are subscription-backed OAuth rather than an API key, and
  the discovery path inherits it by using `query()` the way `chat.mjs` and the four recorders already do
  — no new auth surface, no key to manage. (Observed: `portal/.env` currently carries only the Figma
  keys, so today's runs are already going through the CLI-login fallback.) `HAS_TOKEN` is surfaced on the
  config route the way `/api/build/config` surfaces it, so the UI can say whether a session can start
  before one is attempted.
- **One consequence to name rather than meet mid-run:** a discovery session draws on the same
  subscription window as the operator's own Claude Code work. A 30-question session run while building is
  two demands on one budget. Not a blocker and not a reason to change the auth, but it is why session
  length is bounded by the bank rather than open-ended, and it belongs in the run-1 reading alongside
  turns and elapsed time.
- **This is also why the guest path is a different build, not just a deployment.** The PRD defers it on
  evidence; the mechanism agrees. Per-guest spend caps cannot be metered against a subscription token, so
  the guest epic needs an API key, a budget ledger and a server-side runtime — three things wave 1 has no
  reason to build.
- **`maxTurns` is a per-turn cap here, not a session cap** — resume-per-turn means each turn is a fresh
  `query()`, so a small ceiling (single digits) bounds a runaway agent inside one answer while the session
  length stays governed by the depth ladder. `chat.mjs`'s 40 is sized for an open conversation and is the
  wrong number to copy.
- **Model is a per-posture call, not one setting.** Each posture builds its own prompt, so each names its
  own model, and the two kinds of work here are not the same kind. **Think and Create-PRD run
  `claude-sonnet-5`**, the house default every existing path pins (`chat.mjs` and all four recorders):
  judging one answer against a weak-answer note is matching against a rubric the bank already wrote, not
  deriving one, and on a subscription a heavier model across thirty turns spends the shared window for no
  gain. **Grill's model is deliberately left open**, because the existing-PRD audit is different work —
  run 2 scores whether it independently reaches findings like "the transition-note rule contradicted its
  own worked example", which is finding a self-contradiction across a whole document. That run is the
  experiment that settles it, so settling it here by guess would waste the only measurement the epic has.
  If Grill ends up on a different model from the interview postures, run 2's gap-finding score is a
  reading of **that pairing**, not of the design, and it is reported that way.
- **On newer model strings.** Observed: the SDK bundle at 0.1.77 hardcodes nothing above the 4.x family,
  yet every committed trace in `traces/` ran on `claude-sonnet-5` with a real session id and a success
  result — so the string passes through to the API and the bundle's list is aliases and display, not a
  whitelist. A newer string than `claude-sonnet-5` is therefore plausible but unproven here, and the
  cheap way to find out is one turn inside spike 2 rather than a pin in the first slice. Nothing in MVP
  14's spine is model-limited.
- **The portal has no a11y gate, and #271 will not give it one.** The PRD commits new portal UI to
  44×44 targets (Q4) while non-goaling a11y gating (D11) to its own epic. Worth being exact about what
  that leaves: #271's three gates run over **the VR page set** — the shipped pages, under both packs —
  and the portal is local, undeployed and not in that set. So the 44×44 commitment here is honoured by
  review rather than by a gate, before #271 and after it. Recorded so the non-goal is not misread as
  "covered later"; extending a gate to the portal would be its own decision.
- **Secrets** stay in `portal/.env` via `env.mjs`, unchanged. Nothing new ships client-side.
- **The origin guard applies unchanged** — `origin.mjs` runs before any routing, so the new routes
  inherit the #157 fix rather than restating it. Route parameters are named individually, never spread,
  following `server.mjs`'s own comment on `/api/build/run`.
- **Honesty surfaces:** the run package states its provenance in `run.json`; a generated PRD says it was
  projected from a run and links it; `answers.jsonl` is verbatim human text and is never rewritten by
  anything. The standing rule that nothing hand-written is presented as agent output extends here in the
  mirror direction — nothing agent-written is presented as human answer.

### Other eng-lead calls
- **The three postures live in `portal/lib/discovery-postures.mjs`** — this closes the PRD's open
  question 3. A posture is a prompt; nothing shipped reads it; putting agent prompts in `system/` would
  file them as design-system material. The bank and the ops are shared definitions and go to `discovery/` (§Data model — the loc-summary tripwire);
  the prompts that read them are portal concerns and stay in `portal/lib/`, one concern per module, per
  CLAUDE.md's own placement rule.
- **The session module is `portal/lib/discovery.mjs`** — cursor, depth, branch, the answer store, the
  fence predicate, the SSE projection. The SSE projection is an exported whitelist function the way
  `builder.mjs`'s `stepEvent` is, so `build-checks` can reach it and the route holds no shape opinion of
  its own.
- **Routes follow the `/api/build/*` shape:** a `config` GET serving the bank and the depth/branch
  options (one route, so the UI cannot fork the definition — the drift `server.mjs:build/config` already
  guards against), a session POST to open or resume, and an SSE POST per turn.
- **Portal UI** is a hash route plus render functions in `portal/public/portal.js` with styles in
  `portal.css`, per CLAUDE.md. Built to 44×44 targets (PRD Q4). Three buttons — Think · Create PRD ·
  Grill — plus the depth choice at session start, the one-question surface, the "ask something else"
  input at every step, and a running package view.
- **Always-loaded context (D4 / D14), bounded and then dropped.** This epic adds no skills and the bank
  is read at run time, so the only always-on cost is one CLAUDE.md section on the run package — the
  PRD's estimate of 400–650 tokens against ~1.5k headroom over the 9.5k baseline. Format detail goes to
  `discovery/README.md`, not CLAUDE.md, per the standing rule that on-demand detail routes to a
  reference and never back into the index. No new hooks in `.claude/`, no `.mcp.json` change for this
  epic. Separately noted, not this epic's job: `.mcp.json` currently requests `tree-sister` and
  `tree-siste-typescript`, so `tooling/mcp/codebase_search.py` cannot start.
- **The frozen fixture gets a gate, because right now its freeze is a sentence.** The PRD says run 2's
  input is "byte-frozen at md5 `ab6eb0ee`" and nothing checks it — grepping `tooling/`, `agent-layer/`
  and `.github/` for the hash or the path returns nothing. A silently edited fixture makes run 2's score
  meaningless with no signal, which is the repo's own "the check must be able to fail" rule applied to
  its own test data. One case in the new group asserting
  `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` still hashes to
  `ab6eb0ee6cdd3b7802ecfcbe90db2377` closes it. Cheap, and it has to land before #292 runs rather than
  after.
- **`build-checks` grows one group** over `discovery/ops.mjs`: every op in `OPS` has a `PARAMS`
  entry and a case, malformed ops throw, an unresolvable `answer_ref` throws, a second closing op
  throws, and empty-but-present evidence/parent records a flag rather than a refusal. No SDK, no
  network, no tokens — the group runs in CI where `portal/node_modules` does not exist.

## Missing pieces

The bank as an edited module (65 questions, nine stages, four branches, the non-functional block, the
conditional AI-interaction module) · the op vocabulary + pure applier + its `build-checks` group · the
answer store, `answer_ref` resolution and the transcript writer (agent text · filed ops · fence
denials) · the session module (cursor, depth ladder, branch selection, escalation on repeated weak
answers per D5) · the three posture prompts · the read fence as one
predicate called from two places · the portal UI (three buttons, depth choice, one-question surface,
escape-hatch input, package view) · `discovery/README.md` as the format spec · the run-package →
PRD projection · the provenance branch and its `JOBS_DIR` root · run 1's sealed pre-registration file
and its committed one-sentence input · the fixture's md5 case · the CLAUDE.md run-package section.

## Spikes & experiments

1. **Op transport** *(gates the answer-by-reference design; run first)*
   Question: does an in-process SDK tool (`createSdkMcpServer` + `tool`) work end to end under this
   SDK version, and what does its schema actually require?
   Spike: one tool with three parameters, one cheap dry run against a stub bank — ~1 hour.
   Decision rule: works and the Zod peer dependency is acceptable → in-process tool, and CLAUDE.md's
   sole-dependency line is amended in the same PR. Does not work, or the dependency is refused → the
   `board-op.mjs` CLI shape, with `answer_ref` resolved by the CLI reading the answer store.

2. **The interactive op loop** *(the chosen approach's one real risk; MVP 14 is exactly this)*
   Question: under resume-per-turn, does the agent judge one answer, emit at most one closing op and
   yield — rather than running ahead, batching questions, or skipping the filing?
   Spike: the MVP 14 spine over three real banked questions, one thin answer among them; record turns,
   tokens and elapsed time per turn as the input to the 30-question read — ~0.5 day. The cost is
   subscription-window rather than dollars (see Boundaries), so the number that matters is per-turn
   latency and turn count, not a price.
   Decision rule: clean → ship the spine and add width on top. Runs ahead → tighten to an explicit yield
   contract in the posture prompt and re-run. Still runs ahead → add the `Stop` hook (refuse the yield
   when nothing was filed) before any width is built, and record that the prompt could not hold it.

## Open questions

- [ ] **Deterministic pre-checks before the agent turn** — some weak answers are catchable without a
      token (no digit, no time word, no currency, an answer that restates the question). Real savings and
      reproducible pushback, but which weak answers are actually common is unknown until run 1. Deferred
      on purpose.
- [ ] **Confirm-the-receipt** — showing the human exactly what is about to be recorded and requiring a
      click would close the audit question completely and make the human structurally the last writer. It
      also costs a click per decision in a session explicitly designed not to feel like a form. A product
      call, revisited after run 1's completion reading.
- [ ] **`unstable_v2_*` session API** — the shape this loop wants, behind an unstable prefix. Revisit
      when it stabilises; the resume-per-turn model is what it would replace, and disk stays authoritative
      either way.
- [ ] **Where the PRD projection lives** and whether it earns its own module — at slicing, once the op
      set has been exercised once.
- [ ] Carried from the PRD, unchanged by this doc: three branches ship with no run behind them ·
      marketplace as a fifth branch · whether the scripted bank beats open conversation for completion ·
      the unguarded deadline risk.

## For slicing

Three conventions carried forward from epic #202 rather than rediscovered. `piv-slice-epic` should
put the first into the epic body and the third into a ticket.

### Every ticket carries

#202 stated nine standing rules once and assumed them in all twenty-one tickets. Five do not apply
here, and saying which — and why — is the point, because a silently omitted rule and a deliberately
inapplicable one look identical in a ticket body.

| #202's rule | Here |
|---|---|
| **PR body carries `Closes #N`** | **Applies.** A title mentioning `(#N)` closes nothing — #78 sat open for a day and cost a planning pass |
| **Plan, report and review live in the same PR** (`.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`) | **Applies**, unchanged |
| **Gate rigor rides along (~⅓ of effort)**, never deferred to a later ticket | **Applies.** Here it is the new `build-checks` group over `discovery/ops.mjs` |
| **The check must be able to fail** — mutate the source and watch it go red | **Applies, and it is this epic's central rule.** The applier's group is the honesty claim's only mechanical proof, so every refusal is asserted by feeding it a broken op, never by construction. #202 recorded the reason: every #137 defect survived a green gate because the check skipped the thing it tested |
| New tracked source file ⇒ regen `gen-loc-summary.mjs` + both approach baselines | **Does not apply — and it is a tripwire, not an exemption.** `gen-loc-summary.mjs` counts `system/`, root+`proto/` pages and `agent-layer/` only; `discovery/` and `portal/` match no group. **The moment a ticket adds a file under `system/` or `agent-layer/`, this row fires**, the artifact changes, approach re-renders and its baselines churn — and the epic stops being additive. A ticket that needs a file there should say so out loud |
| New live-manipulable control ⇒ `param-manifest.json` entry + `gen-param-count.mjs` | Does not apply — the manifest counts controls on **shipped** pages; the portal is not one |
| At-rest change to a shipped page ⇒ regen that page's baselines | Does not apply — no shipped page changes |
| New page ⇒ footer site index + the VR page set | Does not apply — the portal SPA is not a shipped page |
| `tokens.source.json` change ⇒ `gen-handoff.mjs` too | Does not apply — no token work |

**The concurrency rule, this epic's version.** #202's baseline-collision rule has no force here (no
baselines churn), but its shape does. Adding an op verb touches four places that must move together —
`OPS`, its `PARAMS` entry, the switch in the applier, and the group's case in `build-checks` — the
same rule CLAUDE.md already states for `system/board-ops.mjs`. So **two tickets must not add op verbs
concurrently**: they collide in all four, and a merge that resolves three of them leaves a verb the
gate cannot see.

### Spike 1 posts its verdict to the epic before the spine is planned

#202 carried this on #203 (*"posts spike 1's verdict to this epic before #209 is planned"*) and it
applies here for the same reason. Spike 1 decides whether the op reaches the applier through an
in-process tool or a CLI, which decides whether `answer_ref` resolves inside the session or off disk.
Every later ticket inherits that answer, so it belongs on the epic before the spine ticket is planned,
not in a PR body afterwards.

### The close-out ticket is created at slicing, not at the end

The studio epic's close-out was written as #177, closed `NOT_PLANNED`, rewritten as #223, and — as of
this doc — still unrun, with `docs/hallway-notes/` holding two prepped rounds and no session ever
recorded. #223's own body names the mechanism: *"An epic-close that is nobody's ticket is an
epic-close that does not happen."* Twice is a pattern, so this epic's close-out is a numbered ticket
from day one, carrying run 1, run 2, the metric read against §Success metrics row by row, and a
closing note in both docs. `.claude/plans/studio-epic-close-223.md` is a worked example of its shape.

---
*Decided interactively with the PRD holder, 2026-08-27 — one round on the spine (who owns the loop and
how content reaches the package), one on hooks / MCP / skills against the installed SDK's real surface,
and one on placement. The PRD's D3, D4, D14, D16, the bank's storage format, the SSE/session model and
the run fence are settled above; D6/D7, D1's guest path, D11 and D19 stay deferred to their own epics.
Next: slice with `piv-slice-epic` (feed this doc + the PRD), running spike 1 before or inside the first
wave.*
