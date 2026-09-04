# Discovery — run packages, the op grammar, the bank

Spec for epic #279, ticket #281 · architecture §Data model (the op table, R2, refuse-vs-flag, the
run package) + §Boundaries & contracts (honesty surfaces) + §Other eng-lead calls (the frozen
fixture).

A **run package** (`discovery/<slug>/`) is the committed record of one discovery session: a person
answering questions from the bank, an agent filing what it heard, and a PRD projected from those
filings. The agent judges **form, never substance** (PRD MVP 6), and this directory is where that
sentence is a property of the data rather than a line in a prompt: the only way a decision reaches
the package is through an op whose `record_decision` verb has **no parameter for answer text**. It
carries `answer_ref: "a7"`; the applier resolves `a7` against `answers.jsonl`, which only the
server writes.

Nothing here is played by a live model at view time. The portal is local (`127.0.0.1` only) and
nothing shipped reads `discovery/`. A run happens once, at build time, in front of the person; the
package is what it left behind.

**Honesty rules (hard — the trace rule, extended in both directions):**

- `answers.jsonl` is written **only by the server, only on submit, verbatim, and never rewritten**.
  It is everything the human typed — banked answers and off-script input alike — keyed by `ref`.
  Nothing agent-written is ever presented as a human answer.
- `transcript.jsonl` is **append-only**, and every `op` line is exactly what `ops.mjs`'s applier
  recorded. **Never hand-write or hand-edit a transcript, an answer or an op** — not one line. A run
  that reads badly is fixed by a tighter posture prompt and a re-run, never an edit.
- The agent's turn text is captured as `text` lines, because MVP 6's "the agent may not say an
  answer is wrong" is only falsifiable from prose. The sentence is kept so it can be checked.
- A refused write or read is a `denied` line — a fence denial, an applier refusal, or a
  schema-layer refusal — with the tool named and `via` naming **where** it was refused
  (`PreToolUse`, `canUseTool` or `PostToolUseFailure`; #287), and it is **the discovery agent's own
  call, in the main session, being refused**. The receipt is kept — a tool the run tried and was
  refused is the governance story, not something to hide. Why one line type for all three: a
  refusal surfaces on the SDK's `PostToolUseFailure` hook, and that hook is the only record point a
  schema-layer refusal has (#280's finding), so the recorder listens there and does not
  distinguish. **The read fence is one predicate called from two places** (§The read fence, below):
  a run may read its own package, `discovery/bank.mjs` and what its `run.json` names in `reads`,
  nothing else, and both the `PreToolUse` hook and `canUseTool` deny anything outside that set,
  failing closed. What is **not** a `denied` line: the CLI's own subagent warmup. Every Claude Code
  start pre-warms its built-in Explore, Plan and Bash agents with a "Warmup" prompt, and Explore
  runs `pwd`, `ls`, `find` and Glob on the cwd; those calls reach the fence and are denied (or, for
  a read inside the package, allowed), and since #349 they leave no line because the recorder reads
  the **tool name**: under `tools: []` the discovery agent can only call `mcp__` tools and a warmup
  agent can only call built-ins, so a built-in's denial is never the agent's — unless the run
  advertises that built-in to the main session (`mainTools`, #287: none today; the fence probe
  advertises `Read`). (#343 had bracketed them between the SDK's `SubagentStart` and `SubagentStop` hooks
  instead; #349's observation run showed the CLI delivers `SubagentStart` on the session's first
  turn only — 0 of 11 resumed turns — so the bracket never held past `t1`.) **Packages recorded
  before #349 carry warmup denials as `denied` lines** — `instrument-loans-1` has four (Bash, on
  `t4` and `t6`), its 2026-08-31 recording had three and its 42cca5e recording seventy-nine,
  `bracket-trace-1` has seven, and `allergen-matrix-1` has fifteen (Bash ×11, Glob ×3,
  `ListMcpResourcesTool` ×1) — every one a built-in, not one an op tool, so none is the agent's.
  They stay: a transcript is never edited, and the git history dates
  them. Read one against its `tool`: an op tool is the agent, a built-in is the CLI.
- `run.json` states the run's provenance, and **provenance decides the root (R1)**: `fictional` →
  `discovery/<slug>/`, committed here as evidence; `real` → `<JOBS_DIR>/_discovery/<slug>/`, same
  shape, never committed (this repo is public and inspectable; `portal/lib/builder.mjs`'s
  `assertFictional` is the same boundary for the build path).
- `prd.md` is a **pure fold over the `op` lines** (#290) — `discovery/prd-projection.mjs`. It says it
  was projected from a run and links the package, so a PRD can never carry a claim the ops do not. It is
  then **edited by the human**, which is why it is the one generated artifact outside
  `tooling/drift-check.mjs` and why re-running the projection **refuses to overwrite an existing
  `prd.md`** without `--force`.

## Files

```
discovery/
  README.md              this contract — written first, everything else conforms
  ops.mjs                the four-verb op grammar + the pure applier (#281)
  bank.mjs               the question bank (65 source-backed + #283's ten) + the depth selectors,
                         facet modules and presets (#282, #283)
  prd-projection.mjs     transcript op lines → prd.md, a pure fold (#290)
  proposals.mjs          proposals.jsonl → proposals.md, a SECOND pure fold BESIDE prd.md, never inside
                         it: the two line shapes, the four refusals and the derived status (#359)
  <slug>/                one run package, fictional runs only (real runs live in the jobs folder)
    run.json             meta: provenance, entry mode, depth (confirmed) + proposedDepth, facets (five booleans or null), reads (the read fence's input), front end, session
    answers.jsonl        everything the human typed — SERVER-WRITTEN ONLY, verbatim; three kinds:
                         banked · off-script · document (an existing-prd audit's one document, written
                         at session start, #286)
    transcript.jsonl     append-only, typed lines: text · op · denied
    prd.md               GENERATED by the projection, then edited by the human
    proposals.jsonl      append-only, two line types: proposal (the model's) · verdict (the owner's,
                         server-written on a click). Written only by a proposal run and the verdict
                         route; never hand-written, never hand-edited (#359)
    proposals.md         GENERATED by the proposal fold and REGENERATED on every verdict — unlike
                         prd.md, never hand-edited, so a hand edit here is lost (#359)
  instrument-loans-1/    the PARENTING FIXTURE — a real opening-set run build-checks group 32 reads (#341)
  bracket-trace-1/       #349's OBSERVATION run — the fixture's twelve answers with the fence trace armed; the last package to carry warmup denials
  bracket-trace-2/       #349's VERIFICATION run — the same twelve under the tool-name gate; no built-in denied line, the trace showing the warmup did call tools
  allergen-matrix-1/     the FULL-DEPTH exhibit — the only committed full-discovery run, 30 of 30 answered (§The full-depth run)
```

**A run package is THREE files during a session and FIVE after a proposal run**, and which act
writes which is the whole of the separation. The session writes `run.json` (the head), `answers.jsonl`
(the human's words, server-written) and `transcript.jsonl` (append-only). The projection writes
`prd.md` and then hands it to the human. A **proposal run** (#359) writes `proposals.jsonl` and
`proposals.md` and **nothing else** — not `run.json`, not `turnStats`, not one transcript line — which
is what keeps `prd.md` byte-identical across it. The **verdict route** appends one `verdict` line and
regenerates `proposals.md`.

`ops.mjs` has no imports at all — no SDK, no filesystem, no bank. The context it needs (the parsed
answers, the bank's questions, the current turn) is passed in by whoever calls it: the server, the
CI gate, the projection. That is what lets `tooling/build-checks.mjs` group 29 drive every rule in
an environment with no `portal/node_modules`.

## The op grammar

An op is exactly `{ op, params }` — the envelope is exact, an unknown key throws. A fold item
(`applyOps`) is exactly `{ op, params, turn }`, so a transcript line fed whole — its `seq`, `closes`
or `flagged` beside a valid op — is refused by name rather than silently reduced. Four verbs, and
the count is deliberate: parking a question is `open_question` with `source: banked`; an off-script
exchange is `record_decision` with `off_script: true` or `open_question` with `source: off-script`.

| Verb | Carries | Closes the turn? |
|---|---|---|
| `record_decision` | `question_id` (nullable) · `answer_ref` · `level` · `parent_id` · `evidence_refs[]` · `wrong_if` · `off_script` | when `off_script: false` |
| `flag_weak_answer` | `question_id` · `answer_ref` · `missing[]` | yes |
| `open_question` | `source` (`banked` / `off-script`) · `question_id` (nullable) · `answer_ref` · `reason` | when `source: banked` |
| `file_evidence` | `url` **or** `ref` · `name` (nullable — a label for an artefact with an identity of its own, only beside a `ref`; #347) · `provenance` · `claim_ref` | never |

`level` is the BABOK ladder in order — `business` · `stakeholder` · `solution` · `transition`
(`docs/research/requirements-hierarchy.md`). `provenance` is one of `real-interview` ·
`secondary-source` · `assumption` · `fictional-scenario`.

**Addressing.** Every recorded op has a `seq` (1-based, strictly increasing, assigned by the
applier). `parent_id`, `evidence_refs[]` and `claim_ref` are integers naming an earlier record's
`seq` — one id space, and nothing the agent can invent: a `seq` it has not seen does not resolve.
`evidence_refs` name earlier `file_evidence` records; `parent_id` and `claim_ref` name earlier
`record_decision` records. The canvas pins a decision as `{ question_id, seq }` (#318).

**Refuse versus flag.** A **missing** field is refused — the applier throws naming the op and the
field. An **empty** one is accepted and recorded with a flag: `evidence_refs: []` records with
`flagged: ["no-evidence"]`; `parent_id: null` on anything below `business` records with
`flagged: ["orphan"]`. So a session never deadlocks on evidence that is not findable yet, and the
package never quietly holds an unbacked decision. A `business` decision has no parent by
definition and is never orphaned; a non-null parent on one is refused.

**What the applier refuses** (each a throw naming the op and the offending value):

- an `answer_ref` (or a `file_evidence` `ref`) that does not resolve in `answers.jsonl` — the
  answer-by-reference rule's teeth;
- a second closing op on a turn that already has one (R2, below), or a closing op with no turn;
- a non-null `question_id` the bank does not hold (`null` is legal and means off-script; a banked
  decision or a banked open question must name its question);
- a `provenance` outside the four;
- a `parent_id` that is not a decision exactly one rung above — the refusal names this run's seqs at
  the required rung, or says there are none yet and to pass null (#341); an `evidence_refs` entry
  that is not an earlier `file_evidence`; a `claim_ref` that is not an earlier decision;
- an empty `wrong_if`, `reason` or `missing[]`; `url` and `ref` both set or both null; a `url`
  that is not `http(s)://`; a `name` beside a `url`, or an empty or non-string `name` (#347 — a URL is
  its own identity, and a nameless name is no filing).

**R2 — one closing op per banked-question turn, keyed on the turn.** The server hands the applier
its turn id (`ctx.turn`). A closing op requires one and refuses if an earlier record already closed
it. `file_evidence` never closes and may fire many times. **Off-script ops never close either**,
which is MVP 9's escape hatch: a decision filed against a banked question whose turn is already
closed can only arrive as `off_script: true` (usually *why* the person went off-script), and one
filed against no banked question at all (`question_id: null`) is the other case the PRD names.
Both attach to the run without consuming a turn's slot. A revisited question on a **new** turn is
a fresh slot (D5 escalation). **#285 gives it its rule:** on the three ladder depths a
`flag_weak_answer` HOLDS the question for one more turn — MVP 6's "pushes back once" — and a second
closer of any kind settles it; never a third ask. `whole-bank` never holds (its 65 sealed answers are
pasted one per question, #348). At Scope check a question weak on both asks makes
`sessionView().escalation` name the rung above; the depth in `run.json` is written once (D3), so
stepping up is a new run.

**Supersede.** A `record_decision` with a non-null `question_id` records `supersedes: <seq>` naming
the latest earlier decision on the same question, else `null`. Both records stay; nothing is
removed. The projection and the canvas read the latest.

**What the applier does not judge:** the text of anything (form, never substance); whether the
turn's question matches `question_id` (the server owns the cursor); forward references (a decision
cites evidence filed before it — that is the "file evidence, then decide" loop, and `[]` plus the
flag is the honest escape).

## The audit mode (existing-prd, #286)

An **existing PRD starts at Grill** (PRD MVP 2): the person supplies a document at session start,
the server writes it **once, verbatim**, as the run's one `kind: "document"` answer line (`turn` and
`question_id` null — it answers every question), and every turn of the chosen depth judges that
document against one banked question. The document sits in the agent's **system prompt** (per
session, byte-stable, cached, one copy) and never in a turn prompt; the turn prompt names its ref.
`ENTRY_POSTURES` in `portal/lib/discovery.mjs` admits Grill alone on `existing-prd`; Think and
Create PRD refuse an audit build by name.

**Four verdicts, four existing verbs — no fifth verb, so the op-verb lock is not taken:**

| Verdict | The document… | Files | Records |
|---|---|---|---|
| ANSWERED | states a decision, gives a wrong-if of its own, names something checkable | `file_evidence` per checkable thing, then `record_decision` naming those rows | a backed decision |
| UNEVIDENCED | states a decision with a wrong-if of its own, names nothing checkable | `record_decision` with `evidence_refs: []` | `flagged: ["no-evidence"]` — the applier's own honest state |
| DODGED | touches the question but lacks the form — no number, no user, no alternative, no wrong-if, or two places that contradict each other | `flag_weak_answer`, `missing` naming each thing the form lacks | a weak answer |
| ABSENT | does not address the question at all | `open_question` with `source: banked` | a parked question |

**The wrong_if on an audited decision is the document's own** — quoted, or closely paraphrased from
the place the document states it — never authored: the audit exists to report which decisions carry
no wrong-if line, and an agent that writes one erases the finding. A decision with no wrong-if is
DODGED, not answered. `--probe-audit` (below) classifies each filed `wrong_if` as QUOTED /
PARAPHRASED / AUTHORED against the document; AUTHORED means `AUDIT_WRONG_IF_RULE` in
`portal/lib/discovery-postures.mjs` is the string to tighten.

**An audit never holds a question** — a document cannot answer twice, so `RE_ASKS['existing-prd']`
is false and every question is judged once. **`prd.md` projected from an audit run IS the revised
PRD**, and its Weak answers · Open questions · "Decisions resting on no evidence" line **is the gap
list**; the document-kind answer renders on that page as a pointer (ref and length), never as a
24 KB blockquote under every decision. `sessionView().document` carries the stored document's
`{ ref, chars, md5 }` — run 2's freeze check is that md5 against the fixture's own (`documentPath` at
session start stores the file's bytes exactly, so they agree; a paste may normalise line endings).

**The not-a-form counter (#285) is arithmetic over the closers** — `runMetrics` in
`portal/lib/discovery.mjs`, on every `sessionView()` as `metrics`: a closing `record_decision` or
`flag_weak_answer` resets it, a banked `open_question` increments it, off-script ops and
`file_evidence` never close and touch nothing. `notAForm.longest > 3` trips the PRD's target;
`weak.rate` is the cobra check on an agent that flags everything; `coverage` of the twelve is read
from the closers, not the cursor, so a skipped question is not covered; `askedWhatMattered`
(full-discovery only) is D4's decision rate on the facet-selected tail against the twelve, with the
modules that composed. All reported, none passed. Group 30 drives each at 0/1/2/3/4. Group 29
asserts the fields that arithmetic needs are on every record.

## File shapes

**`answers.jsonl`** — one line per submit, server-written:

```jsonl
{ "ref": "a7", "ts": "…Z", "turn": "t7", "question_id": "q12", "kind": "banked", "text": "…what the human typed…" }
{ "ref": "a8", "ts": "…Z", "turn": "t7", "question_id": null, "kind": "off-script", "text": "…" }
{ "ref": "a1", "ts": "…Z", "turn": null, "question_id": null, "kind": "document", "text": "…the supplied PRD, verbatim — an existing-prd audit's ONE document line, written at session start (#286)…" }
```

**`transcript.jsonl`** — append-only, three line types. An `op` line is the applier's record with
`type` and `ts` added by the writer (#284); `seq`, `turn`, `op`, `params`, `closes`, `flagged` and
`supersedes` are the applier's and are never edited:

```jsonl
{ "type": "text",   "ts": "…Z", "turn": "t7", "text": "…what the agent said…" }
{ "type": "op",     "ts": "…Z", "seq": 3, "turn": "t7", "op": "record_decision",
  "params": { "question_id": "q12", "answer_ref": "a7", "level": "stakeholder", "parent_id": 1,
              "evidence_refs": [], "wrong_if": "…", "off_script": false },
  "closes": true, "flagged": ["no-evidence"], "supersedes": null }
{ "type": "denied", "ts": "…Z", "turn": "t7", "tool": "Read", "input": { "file_path": "…" }, "error": "…the fence's message…", "via": "PreToolUse" }
{ "type": "denied", "ts": "…Z", "turn": "t3", "tool": "mcp__discovery__record_decision", "input": { "…": "…" }, "error": "…the applier's or the schema layer's message…", "via": "PostToolUseFailure" }
```

`via` (#287) names the site that refused the call — `PreToolUse` (the hook), `canUseTool` (the SDK's
permission callback) or `PostToolUseFailure` (the record point for an applier or schema-layer
refusal). Packages recorded before #287 carry no `via`; they are never edited.

**`run.json`** — the run header:

```json
{ "slug": "faster-payment-run-1", "provenance": "fictional", "label": "Real run — fictional scenario",
  "entryMode": "blank-idea", "depth": "full-discovery", "proposedDepth": "full-discovery",
  "facets": { "hasModel": false, "regulated": true, "internal": false, "orgBuys": false, "replacesAProcess": false },
  "reads": [],
  "frontEnd": "portal", "model": "claude-sonnet-5", "sessionId": "…",
  "startedAt": "…Z", "endedAt": null, "root": "discovery/faster-payment-run-1",
  "turnStats": [ { "turn": "t1", "numTurns": 2, "durationMs": 21187, "costUsd": 0.043, "ok": true,
                   "postureFingerprint": "df6fbc35…", "ts": "…Z" } ] }
```

- `provenance` is `fictional` or `real` and decides `root` (R1, above).
- `frontEnd` is `portal` or `terminal` — this is how the PRD's **Switch** metric is measured, so it
  is recorded per run rather than inferred.
- `depth` is the confirmed depth and `proposedDepth` what the server proposed for the entry mode
  (MVP 5: the agent proposes, the human confirms — `DEPTH_PROPOSAL` in `portal/lib/discovery.mjs`);
  `facets` is the declared vector, normalised to `bank.mjs`'s five `FACETS` keys, or `null` when none
  was declared (#285). Packages recorded before #285 carry `branch: null` and neither field; they are
  never edited and read as the unfaceted list. The hold rule reaches them too, because the cursor is
  read from the LAST closer: a pre-#285 package whose last closer is a first `flag_weak_answer` on a
  ladder depth reads as held (`ask 2`, one short of done). A closed one stays closed — no turn can run
  on it, and the proposals route gates on `endedAt`, not `completion.done`, so it still accepts the
  package; what moves is the drawer's closed line and `metrics.completion`. A vector on a depth that
  does not compose is recorded and ignored (D1b). `entryMode` is `blank-idea` or `existing-prd`
  (#286) — the values are now a contract (`ENTRY_MODES`); an `existing-prd` package holds exactly one
  `kind: "document"` answer line and its ops all name it.
- `model` is the model the run's posture ran on — Think, Think on Opus and Create PRD pin theirs;
  Grill's is chosen at session start from `MODELS` and recorded here, and the turn stamps' fingerprint
  follows it (`resolvePosture`, #286). `posture` names the posture.
- `reads` (#287) is the read fence's per-run input: paths, repo-relative or absolute, this run may
  read beyond its own package and `discovery/bank.mjs`. Run 2 names its frozen fixture here; run 1
  names nothing. The allow-set is rebuilt from this field on every turn, so a resumed session after a
  server restart runs under the same fence it was opened with. Refused by name at session start if
  it is not an array of non-empty strings. It is the **trust boundary**, not a sandboxed field: an
  absolute path anywhere is accepted, so `reads` is as wide as whoever opens the session makes it.
  The fence bounds the **agent**, never the operator — the agent cannot influence `reads` (it is set
  once at `openSession`, never mutated, and no op verb touches it).
- `endedAt` is `null` while the session is open or resumable.
- `turnStats` holds one entry per agent turn — `numTurns`, `durationMs`, `costUsd`, the token counts,
  `ok`. It is there because the 30-question read is a latency and turn-count read, not a price: the
  cost is subscription-window, and what decides whether a full session fits one sitting is seconds.
- each turn also carries `postureFingerprint` — the md5 of the prompt surface it ran under (system
  prompt, turn template and brief format, tool descriptions, model — `POSTURES.<id>.fingerprint`,
  #341). build-checks group 32 compares the parenting fixture's stamps to the current one, so a prompt
  edit makes the recording stale by name rather than leaving a green gate over a run the current
  prompt never produced.

**`prd.md`** is generated by the projection (#290) into the house PRD shape and carries a line
saying it was projected from this run, linking the package.

## The bank's width — facets, modules, presets, the budget (#283)

Decided in [`docs/epics/discovery-question-selection.architecture.md`](../docs/epics/discovery-question-selection.architecture.md) (D1, D1a, D1b). The four product types are **presets**; the selection input is a **facet vector** — five booleans, each a fact about the product: `hasModel` · `regulated` · `internal` · `orgBuys` · `replacesAProcess` (`bank.mjs` `FACETS`, with the intake question beside each). Each keys a **module**: a named, ordered group of bank ids with a declared budget (`MODULES`). Selection, never new research — the only new text is the ten D7 entries: the **non-functional block** (`NON_FUNCTIONAL_BLOCK`, four quality attributes every declared full discovery asks, recorded as decisions and **enforced nowhere**) and the **AI-interaction module** (six areas seeded from Amershi et al.'s HAX guidelines and Google PAIR's People + AI Guidebook, cited by URL in each entry's `attribution`).

**`selectDepth(depth, facets)` is total.** Only `full-discovery` composes: the twelve in `OPENING_SET`'s order, then each ticked module in `FACETS` order, then the block. `scope-check`, `opening-set` and `whole-bank` answer their literal for every vector. **No vector — `undefined`, `null` or `{}` — answers today's list on every depth, byte for byte**: every package in this directory predates facets and is that case, and so is `tooling/discovery-score.mjs`. `whole-bank` is a **frozen literal of the 65 source-backed ids** and never includes the ten; `graded-think-a` / `graded-opus-a` are comparable only while it holds.

**The budget (D1a).** MVP 5's ~30 is spent, never exceeded: twelve + block + at most two modules (budgets 7 · 6 · 6 · 6 · 6) fit inside `FULL_DISCOVERY_BUDGET` (30); a third ticked facet overflows. `facetPlan(facets)` reports `fired` · `fits` · `overflow` · `count` as a value; `selectDepth` **throws** on overflow naming the facet that does not fit — never a silent truncation, never a 45-question session. What the drawer does with the value is #288; `openSession` (#285) refuses an overflowing vector with the bank's own message and trims nothing. `PRESETS`: Regulated ticks `regulated`; B2B SaaS ticks `orgBuys`; Internal tool ticks `internal` + `orgBuys`; Consumer ticks nothing as a **declared** all-false vector (twelve + block, 16 questions) — a preset is a starting point the person adjusts.

**Known debt — four unexercised facets.** Only `regulated` gets a run in wave 1 (#291); `hasModel` fires on run 2 (#292); `internal`, `orgBuys` and `replacesAProcess` ship with no run behind them. Their modules are a selection made from reasoning, not a validated design, and #293 records "Asked what mattered" as *not yet tested* for them rather than inventing a proxy. The first reading that means anything is the second, faceted `full-discovery` run on a real product with a different vector.

## The PRD projection

`discovery/prd-projection.mjs` folds a run package into `prd.md`. It is **pure**: no clock, no network,
no SDK, so the same package always projects to the same bytes. Everything on the page resolves to an op's
params, an `answer_ref`-resolved answer, a `question_id`-resolved bank entry, the applier's derived
fields (`seq`, `flagged`, `supersedes`) or `run.json`'s header — nothing else has a route. Its own header
is the specification, including why it lives here rather than in `agent-layer/`.

Eleven sections, each keyed on one **axis** — which property of the records selects it:

| Section | Axis | From |
|---|---|---|
| Problem | ladder | `business` decisions |
| Evidence | op-kind | `file_evidence` |
| Hypothesis | cross-ref | the `wrong_if` of every business and stakeholder decision |
| Target user and JTBD | ladder | `stakeholder` decisions |
| MVP | ladder | `solution` decisions |
| Success metrics | cross-ref | decisions on a stage 7 question, plus every decision's `wrong_if` |
| Non-goals | cross-ref | decisions on `s3-deliberately-not-doing` and `s4-out-of-bounds` |
| Open questions | op-kind | `open_question` |
| Weak answers | op-kind | `flag_weak_answer` |
| Transition note | ladder | `transition` decisions |
| Requirement hierarchy | derived | every decision's `level` and `parent_id` |

**Two rendering rules.** A decision renders **once**, in its ladder section; the cross-ref sections name
it by `seq` and never re-render it. **Flags render inline on the record that carries them** — `⚠ orphan`
and `⚠ no-evidence` are read from `flagged`, never re-derived, so this half can never drift from the
applier's.

**Supersede, read.** The latest decision on a question renders its block and names what it replaced
(`*Replaces:* seq N`); the earlier one gets no block of its own. Nothing is removed — both records stay
in the ops.

**Two counted sets, and the page says which.** The ladder sections, Non-goals and the Requirement
hierarchy's counts are over the latest decision per BANKED question, plus EVERY off-script decision,
each its own — an off-script decision names no question, so nothing can supersede it and none of them
collapse into one. Success metrics, the Evidence gap list
and the `**Ledger**` line are over the WHOLE ledger, replaced records included, because nothing is
removed. Every whole-ledger surface marks a replaced record `superseded by seq N` and the Ledger line
names its own set, so a higher count there than in the hierarchy is resolvable rather than a
contradiction.

**The transition note has two states.** A `transition` decision renders like any other; with none, the
section is an explicit `**n/a**` naming what was not elicited, rather than a silent gap.

**From the bank it takes `id`, `text`, `attribution`, `stage` and `label`** — a question is a definition,
not a claim. It never takes `weakAnswer` (the agent's rubric), `note` or `provenanceNote` (commentary
about the question, not about this product).

## Feature proposals (#359)

A finished package holds decisions, their evidence, their parents and their kill criteria. `prd.md`
lays them out. **Nothing turned them into candidate features**, so that step happened in the owner's
head, where the factory cannot read it — the epic's own problem statement, one layer down.

`discovery/proposals.mjs` puts a model on that step and keeps it **structurally unable to corrupt the
record**. A model reads a finished package and writes **proposals** into their own file; the owner
gives each one a **verdict**. A proposal has **no route into the requirement hierarchy** except the
owner answering a banked question in a session, where the existing pipeline files it from their own
words — which is what keeps `answers.jsonl`'s invariant intact.

### The two line shapes

```jsonl
{ "type": "proposal", "ts": "…Z", "id": "p3", "title": "…", "why": "…the model's prose…",
  "rests_on": [4, 8], "wrong_if": "…the kill criterion…", "model": "claude-opus-5", "fingerprint": "…" }
{ "type": "verdict",  "ts": "…Z", "proposal_id": "p3", "verdict": "accepted", "reason": "…the owner's words…" }
```

The model authors exactly four fields — `title`, `why`, `rests_on`, `wrong_if` (`PROPOSED_BY_MODEL`,
and the MCP tool's zod shape is pinned to that list by name and order). The other five are the
**server's**, the way an op's `seq` / `closes` / `flagged` are the applier's: a model cannot claim an
id, backdate a line or mislabel which prompt surface proposed it. Ids are `p<n>`, counted from the
**max existing id** rather than the array length — the file interleaves two line types, so a
length-based counter would collide the moment the first verdict landed.

### The four refusals

1. **A proposal that names no decision is REFUSED.** `rests_on` is a non-empty array of seqs, each
   resolving to a `record_decision` in this run's ledger. A **dangling** seq is refused too, where
   `checkOpLines` tolerates a dangling `parent_id`: that guard never re-derives history over a
   possibly-corrupted ledger, whereas a proposal run reads a **finished** package and every seq it
   names was in the brief it was given.
2. **A proposal with no `wrong_if` is REFUSED.** Non-empty after `trim()`.
3. **A proposal can never become a `record_decision`.** Structural — no verb, no migration, no import
   path. `LINE_TYPES` and `OPS` are disjoint, a proposal line fed to the applier throws, and none of
   the six params that make a decision a decision is a proposal key. (`wrong_if` **is** shared, and
   that is the design: every claim in this system carries a kill criterion.)
4. **A proposal never appears in `prd.md`.** Structural — `prd-projection.mjs` does not import this
   module and its `readPackage` reads three files, not four.

Refusals 1 and 2 **invert `ops.mjs` invariant 3 on purpose**. There, empty is *flagged* so a session
can never deadlock on evidence that is not findable yet. A proposal is not a session: nothing waits on
it, and a proposal resting on nothing, or carrying no kill criterion, has no reason to exist.

### The derived status and the regenerate rule

`proposed` is the **absence** of a verdict line and is never written to one. The **last** verdict for
an id wins and **every** verdict is kept — the owner changing their mind is part of the record,
exactly as a superseded decision is (§Supersede), and the page marks the earlier one rather than
dropping it. `proposals.md` is **regenerated on every verdict**, so a hand edit is lost. That is the
one place this half deliberately diverges from `prd.md`, whose `writePrd` refuses to overwrite
*because* it is hand-edited; a refusal here would break the feature. The compensating guard is
build-checks case 34.11's byte compare, the way group 33 case 15 guards each graded package's `prd.md`.

### The fence

**The same predicate at the same two call sites a session runs under**, widened by one tool name and
given a recorder that streams instead of writing. `allowSetFor({ root, reads: [] })` is unchanged and
`tools: []` stays closed, **because the brief carries the package**: every decision by rung with its
question, the human's verbatim answer, its kill criterion, its parent and its flags, plus the filed
evidence and the parked questions — all built server-side, so the run needs no read tool at all. The
proposal tool is admitted through `extraTools`, and `write` keeps every refusal out of
`transcript.jsonl` (a refusal is streamed to the operator, returned to the model so it corrects inside
the same turn, counted, and recorded verbatim in the PR report — nowhere else).

### The honest caveat on the model

The committed run used **`claude-opus-5`**. #348 measured whether Opus *judges* better than Sonnet;
**proposing is a different task and that number does not transfer.** The model choice is unsettled,
and a comparison would be its own ticket.

## The parenting fixture

`discovery/instrument-loans-1/` is a real `opening-set` run (#341) over a fictional product — an
instrument-loan register for a school music department — recorded through the drawer like any other
package. It was **re-recorded on 2026-09-01** after #338 F6 added `EVIDENCE_RULE` to the Think
prompt: that moved the fingerprint, group 32 went red by name, and the tripwire did its job. The
twelve answers are the SAME twelve — they were fixed before the prompt edit and re-supplied through
the drawer verbatim, so they cannot have been tuned to the new prompt's behaviour. (They are the
sheet of record; `.claude/plans/discovery-parent-id-341.md` describes the pre-registration but does
not carry the text, so the answers themselves live only in this package's `answers.jsonl`.)

**Its transcript carries four `denied` lines, and they are NOT the agent's.** All four are Bash —
`pwd`, `git status`, `ls -la` of the run directory — the CLI's own warmup, on `t4` and `t6`, and not
one is an op-tool refusal. The recording before it (42cca5e, the same day) carried seventy-nine
across eleven turns and the one before that (2026-08-31) three; the count is how busy the CLI's
warmup happened to be, not the fence changing. **That variance was the first real observation of
the gap #343 named and could not reach**, and #349 bought the observation that explains it:
`SubagentStart` is delivered on the session's create turn only, so the bracket was never open on a
resumed turn (`discovery/bracket-trace-1/`, below). This package was recorded before #349's
tool-name gate, so its four lines stay, as every transcript line does; a package recorded after it
writes none. Read a `denied` line against its `tool`: an op tool is the agent, a built-in is the CLI.

**#338 F8, closed by #347 on this recording.** The 08:23 recording's four `file_evidence` ops carried
`provenance: "real-interview"` on a fictional run — `fictional-scenario` was the true label, but the
run's provenance lived in `run.json` and reached neither prompt, so the agent had no way to know which
run it was sitting in. The system prompt now carries `PROVENANCE_RULE[provenance]`
(`portal/lib/discovery-postures.mjs`, read off `run.json` by the transport), and this recording's
three evidence rows all read `fictional-scenario`, each with a `name` for the artefact the answer
named (#347's other half: before it, "the paper loan book" had no row of its own, only a pointer at
the sentence that mentioned it). The earlier package is in the git history; nothing in it was edited.

It exists because the full-depth rehearsal that preceded it filed `parent_id: null` on 18 of 18
eligible decisions while every pure gate stayed green: the applier, the projection and the prompt
strings were all correct, and no gate observed what the agent actually chose against a real ledger.
The same shape reappeared for evidence — 0 `file_evidence` ops over 30 substantive answers (#338 F6),
then 4 over these twelve on the 08:23 recording (all mislabelled `real-interview`), now 3 on this one,
each named and labelled `fictional-scenario` (#347).

**What `build-checks` group 32 asserts over it:** `auditParenting` (in `ops.mjs`) is first proven to
detect a miss on synthetic records; then the package is read, its op lines are re-folded through the
real applier over the committed answers and matched record by record — an edit that makes a line
INVALID (a wrong-rung parent, a dangling ref, a derived field out of step with its params) goes red
by name; a valid-to-valid param edit does not and cannot (the applier reproduces what it is handed),
so the only guard for that is the server's write and the git history; every `turnStats` entry
carries the CURRENT `POSTURES.think.fingerprint`; the audit reports `eligible ≥ 1` and `missed 0`
with every named parent in its candidate set at the moment of filing; the projected Requirement
hierarchy renders at least one `parent: seq N` line; and `prd.md` is byte-equal to the projection.

**The fingerprint tripwire, and its price.** Any edit to the prompt surface — a word in
`PARENT_RULE`, a comma in `MVP6_LINE`, a tool description, the turn template, the model — moves the
fingerprint, and group 32 goes red naming the old and new hashes until the fixture is re-recorded.
Three things the agent also reads sit OUTSIDE the hash and do not move it: the tool input schemas
(`TOOL_SCHEMA`, pinned by group 30, so they move only under the op-verb lock), the fence's deny text
and the SDK's own preset — an edit to one of those is the probe's to re-observe, not the
fingerprint's to name.
That is the honest cost of a recording that proves the prompt in the tree: the 2026-09-01
re-record cost **$0.637** over twelve turns and about eight minutes wall-clock, plus **$0.139** for
the two probe turns that precede it; the #347 re-record the same day cost **$0.424** over twelve
turns and about four minutes, plus **$0.139** for its two probes (observed). **The limit:** the gate observes one recorded session. The model's behaviour
under an *unchanged* prompt on a later date, or under a newer SDK, is the probe's to re-observe.

**Re-record procedure** (after any prompt-surface edit):

1. `cd portal && node lib/discovery-transport.mjs --probe-parenting` — one paid turn (~$0.04–0.10;
   the first run after a prompt edit is the cold one) over a temp root with a three-rung
   applier-built ledger. Repeat until it reports `PARENTED` twice in a row; a `MISSED` means
   tighten `PARENT_RULE` (that string only) and probe again.
2. `rm -rf discovery/instrument-loans-1` — a slug is never re-run without deleting first
   (`openSession` resumes an existing `run.json`).
3. `cd portal && PORT=4748 npm start` — a fresh port, so no stale process can be serving the drawer.
4. Drive the drawer at `http://localhost:4748` with the pre-registered sheet, slug
   `instrument-loans-1`, provenance `fictional`, depth `opening-set`, posture `think`; press Finish.
5. `node discovery/prd-projection.mjs instrument-loans-1`, then `node tooling/build-checks.mjs`.

## The full-depth run (allergen-matrix-1)

`discovery/allergen-matrix-1/` is the only committed **full-discovery** package: 30 banked
questions, all 30 answered and closed, recorded through the drawer on 2026-08-31 (`blank-idea`,
`think`, `claude-sonnet-5`, 39 minutes wall clock, $1.683 over 30 turns — per-turn latency min
10.5 s, median 15.5 s, max 26.8 s, zero failed turns). Fictional throughout: an allergen-matrix
product, no real company and no real evidence. It is committed as the depth exhibit: no other
committed package reaches this depth (three are `opening-set`, `spine-meridian-1` is `scope-check`).
Its `prd.md` is the projection's own bytes, verified by re-running `prd-projection.mjs --stdout` and
comparing (byte-identical).

It is also the **proposal exhibit** (#359): the only committed package carrying `proposals.jsonl` and
`proposals.md`. One fenced `claude-opus-5` pass on 2026-09-03 filed **eight** proposals in 9 turns,
60 s and **$0.229** (observed), with **zero** refusals, resting on 21 distinct decision seqs between
them. `prd.md`'s sha256 is unchanged across that run, compared before and after in the shell — the
observation AC #4 asks for rather than the argument.

What it shows, and what it does not:

- **30 `record_decision`, no other verb** — business 5 · stakeholder 4 · solution 10 · transition
  11. `parent_id` is filled on 25 of the 30 and nothing is flagged `orphan`: the requirement
  hierarchy #341 built does hold at depth.
- **Every decision is flagged `no-evidence`.** Zero `file_evidence` ops, so all 30 rest on the
  answer alone. That is #338's F6 standing in the record, not a defect of this run.
- **It is NOT the rehearsal §The parenting fixture describes.** That one is also full depth, also 30
  answers and also zero `file_evidence`, which makes the two easy to conflate — but it ran BEFORE
  #341, filed `parent_id: null` on 18 of 18 eligible decisions, and lives under `JOBS_DIR` as
  `my-product-name`, never committed. This run is the day after, with parenting working.
- **Its fifteen `denied` lines are all the CLI's warmup**, and none carries `via`: the run predates
  both #349's tool-name gate and #287's fence. Under today's rule it would carry zero. See the
  warmup note above — a transcript is never edited to match a later rule.
- **Its posture fingerprint is `df6fbc35`, not today's.** The prompt surface moved at #347 after
  this recording, so the package is dated by its fingerprint. No gate reads it: group 32 names
  `instrument-loans-1` and nothing else.

## The graded answer fixture (#348)

`discovery/graded-think-{a,b,c}/` and `discovery/graded-opus-{a,b,c}/` are **fixture runs, not
interviews**. They exist to put a number on one PRD claim — MVP 6, that the agent judges the FORM of an
answer and never its substance — which no run before them measured. Every earlier package is self-play:
an agent wrote answers that had exactly the form the question asks for, and the judge filed a decision on
nearly every turn. That says the pipeline moves. It does not say the judge can tell a good answer from a
thin one.

**Status: two of the six are recorded.** `graded-think-a` and `graded-opus-a` (65 turns each, draw column
`a`, recorded 2026-09-02) are committed and scored. `-b` and `-c` on both postures were not run — the
owner took the two-posture reading and stopped, because the remaining four buy per-question coverage
rather than a different answer. The key, the draw and the driver are all committed, so they are
`portal/record-graded-run.mjs` four more times.

**The reading, and no target was set.** Same 65 sealed answers, same draw column, the same
`buildThinkTurn` — the model string is the whole difference. Chance over three verbs is 33%.

| | turns | overall | K1 has the form | K2 thin | K3 does not know |
|---|---|---|---|---|---|
| `graded-think-a` · sonnet-5 | 65 | 48/65 — **74%** | 14/19 | 8/18 | 26/28 |
| `graded-opus-a` · opus-5 | 65 | 52/65 — **80%** | 14/19 | 11/18 | 27/28 |

**The judge's dominant failure is PARKING, on both postures**: 12 of sonnet's 17 misses and 10 of opus's
13 are a turn filed as `open_question` when the key expected something else. Opus's entire gain is in K2
(8/18 → 11/18); K1 is identical and K3 differs by one. Opus never recorded a decision on a thin answer
(sonnet did twice) and files 2.5× the evidence (35 ops over 32 turns vs 14 over 14). Zero non-closing
turns in 130. **Tightening the prompt on the back of this is a new ticket, a new PR and a re-run — never
an edit**, because both fingerprints must stay byte-stable or the packages stop being comparable.

**MVP 6 held.** Over 239 agent text lines the mechanical shortlist returned three candidates, all false
positives on inspection (one matched the question id `s6-accountable-when-wrong`). Across 130 turns the
judge never said an answer was wrong and never supplied what was missing. The shortlist is mechanical;
that verdict is a human read, and the distinction is the point.

**The softest seam, stated rather than buried:** the substance audit flagged 11 of 65 K2 answers as
borderline — taking the easy half of a question and refusing the hard half — and 7–8 of the K2 mismatches
sit inside that band. **This score cannot separate "the judge mis-graded" from "the answer genuinely sat on
the boundary."** A judge that parks a genuinely ambiguous answer is not obviously wrong.

**How they are made.** For each of `whole-bank`'s 65 questions (the source-backed bank; #283's ten are
outside it by design) three answers were authored **blind to that
question's weak-answer note** — K1 carries the form (badly, the way a person does: a range instead of a
number, a hedge, an artefact cited from memory), K2 is thin against the question, K3 says the person does
not know yet and why. The author is a fenced Agent SDK run (`portal/record-graded-answers.mjs`) whose read
allow-set is its own output directory and **nothing else**: `discovery/bank.mjs`,
`docs/research/question-bank-source.md`, the PRD, the architecture doc and every committed package are
denied, and the denials land as `denied` lines in the author's own transcript.

On disk today: `brief.md` (the author's literal prompt preamble), `draw.json` (sealed, with its seed) and
`author/transcript.jsonl` (the fence receipt — four leak paths attempted, four refused via `PreToolUse`).
**`key.json` is not written yet**: the authoring run halted at question 28 of 65 when the API account ran
out of credit. The key holds 195 answers and their expected closing ops, it is written only when all 195
validate — sealed complete or not at all — and it is committed **before any run is opened**. Once
committed it is never edited: a re-authored key is a new commit that REPLACES it and voids every package
recorded against the old one.

**The draw** (`draw.json`) is a Latin square with a per-question hash offset from a committed seed: across
a posture's three runs every question meets all three kinds, and no run column is a uniform or cyclic
stream the judge could pattern-match instead of reading the answer. There is **one** table, shared by both
postures — `graded-think-a` and `graded-opus-a` answer the SAME 65 answers, which is the only thing that
makes the sonnet/opus comparison a comparison. Which package is which: the slug's suffix is its draw
column, and `think` / `opus` is its posture.

**What they are NOT, and this half matters more than the first:**

- **They are excluded from the Switch, completion and not-a-form metric reads.** Their `frontEnd` is
  `"portal"` because that is the only value a driver POSTing to `/api/discovery/turn` can send — it is the
  driver's, never a person's choice. Six packages stamped `portal` read as UI sessions somebody chose, and
  Switch is the epic hypothesis's RIGHT condition, read row by row at close-out (#317). The spine has no
  field that marks a package as a fixture and this ticket did not add one (that would be a spine change);
  the marker is the **`graded-` slug prefix** and this section.
- **A run of turns with no decision may be a DRAW ARTIFACT, not a run-quality finding.** The hash offset
  produces stretches of three or four same-kind draws, and a stretch of K2/K3 is exactly what #285's
  not-a-form counter is built to notice. Before quoting a package's consecutive-no-decision count as a
  finding, check the draw column.
- **They are authored answers, not real ones.** Real answers wander, contradict themselves and arrive out
  of order. The brief pushes K1 toward that register deliberately, and it is still not the same thing.
  The score is a form-judgement reading taken **under that realism gap**, and closing it needs real
  interview transcripts, which is a later ticket.
- **The STREAM is artificial too, and that gap is not in the ticket.** A real session is a coherent
  interview whose ledger accumulates toward one product. This walks 65 questions answered alternately
  well / thin / unknown in a hash-scrambled order, and the judge sees that ledger in every turn prompt
  through `ledgerBrief`. No interview produces it.
- **The first fixture was VOID and was thrown away.** Its 195 answers were sortable at 85.6% by a
  three-rule regex written before reading one of them: K2 named a person in 0/65 where K1 named one in
  50/65, and K2 was shorter than its own K1 in 64/65. The brief had told a stateless author to "never
  write in the same register twice in a row", which it cannot obey. The fix was a mechanism — a speaker
  rotated by question index, and mechanical refusal of banned phrasings and short K2s. After it the same
  classifier scores 41% against a 33% chance floor. Recorded here because a fixture that looks fine and
  measures nothing is the failure mode this whole package exists to avoid.
- **Group 32 does not read them.** It names `instrument-loans-1` and nothing else. Group 33 reads them,
  and only group 33: no other tracked source file may name a `graded-` slug in code, which that group
  sweeps for.

**The scorer** is `tooling/discovery-score.mjs` — pure, zero-dependency, no clock and no randomness — and
it is a post-hoc JUDGE that is never part of an agent prompt. It diffs each turn's closing op against the
key and reports a 3×5 confusion matrix (the three closing verbs, plus `no_close_filed` and
`no_close_silent`, one cell per turn) with the `file_evidence` count beside it, never in it. **No target
is set.** A prompt tightening on the back of the number is a new PR and a re-run, never an edit — the
fingerprints must be byte-stable across all six recordings or the packages are not comparable.

    node tooling/discovery-score.mjs --slug graded-think-a --run a
    node tooling/discovery-score.mjs --slug graded-think-a --mvp6      # a shortlist; the verdict is a human read

## The fence observation and its verification (#349)

`discovery/bracket-trace-1/` and `discovery/bracket-trace-2/` are two more real `opening-set` runs
over the parenting fixture's twelve answers, re-supplied verbatim through the drawer (`ref`, `turn`,
`question_id`, `kind` and `text` equal to `instrument-loans-1/answers.jsonl` — observed by compare).
Neither is a parenting fixture and group 32 does not read them; they exist for one question, and the
recorder's trace for each is committed beside the report at
`.claude/reports/discovery-bracket-trace-349/`.

**bracket-trace-1** (2026-09-01, fingerprint `7efdde37`, $0.513) was recorded with the bracket still
in place and the trace armed. On `t1` the CLI delivered `SubagentStart` three times (Explore, Plan,
Bash) and the bracket suppressed three warmup denials; on `t2`–`t12`, every resumed turn, it delivered
`SubagentStart` 0 times and `SubagentStop` every time, so the seven warmup denials on `t2` and `t9`
were recorded with the bracket closed. Its transcript carries eight `denied` lines: those seven, and
one that IS the agent's — `file_evidence` on `t10` sent `url: ""` beside a `ref` and the applier
refused it (a receipt, kept; the decision was then filed without the evidence row).

**bracket-trace-2** (same day, same fingerprint, $0.565) was recorded after the tool-name gate
replaced the bracket. The trace holds sixteen warmup denials across five turns (Bash ×14,
`ListMcpResourcesTool` ×2), none recorded; the transcript carries **zero** `denied` lines and fifteen
ops. A quiet warmup would not have been a pass — the trace is what shows the warmup called tools
under the new rule and left no line.

## The read fence (#287)

**One predicate, two call sites, failing closed** (architecture §Boundaries & contracts). The
predicate is `allowsPath(allowSet, path)` in `portal/lib/discovery.mjs`: a path is allowed iff,
resolved against the run root, it is an entry of the run's allow-set or lies under one. The
allow-set is **per run** — `allowSetFor({ root, reads })`: the package root, `discovery/bank.mjs`,
and whatever `run.json`'s `reads` names — because the two scoring runs need different sets. Run 1's
key (`<JOBS_DIR>/_portfolio/decisions.json` plus the sealed pre-registration) sits under the jobs
folder; run 2's key is the findings list printed in `docs/epics/discovery-partner.prd.md`, one
directory above the fixture run 2 must read. "This run may read its fixture, the bank and its own
package — nothing else" is one line per run, and it is gateable; a deny-list across two trees is
not.

**TWO KINDS OF RUN, ONE FENCE (#359).** `fenceDecision` and `fenceSite` take two further **defaulted**
opts, so a proposal run reuses the one predicate rather than declaring a second: `extraTools` admits
that run's OWN tool by name (`mcp__proposals__propose` — one name, and `allowsToolName` is deliberately
NOT widened, so "the discovery SESSION's vocabulary is the four op verbs" stays true), and `write`
replaces the transcript append for a caller whose refusals do not belong in `transcript.jsonl`. Both
default to today's behaviour, and group 30 case 25 proves it rather than asserting it: `extraTools`
absent, `[]` and `undefined` give the same decision AND the same reason across the case's whole
twelve-input battery. `ts` is stamped before the write/append branch, so both callers hand `onLine`
one shape. This is why `--probe-fence`'s paid observation covers the proposal run too: one predicate,
the same two sites.

The predicate is called from **two sites** — `fenceHooks`' `PreToolUse` hook and
`fenceCanUseTool`, the SDK's permission callback — through one decision (`fenceDecision`): op
tools pass by name, `Read` / `Grep` / `Glob` pass by path, everything else is denied by name
(`Write`, `Edit` and `Bash` stay closed whatever path they carry). Two sites because the CLI's
permission fast path can auto-allow a call without ever consulting `canUseTool`. Both sites deny
when the predicate throws or has no allow-set. `WebSearch` / `WebFetch` are **not** path tools —
the path allow-list never touches them; whether they are open is MVP 7's affordance (#289), and
`build-checks` group 30 asserts the path fence cannot close it. Every denial is a `denied` line
with `via` naming the site.

The fence trace (#349, `DISCOVERY_FENCE_TRACE`) records the **decision**, not only the refusal: an
allowed in-root `Read` / `Grep` / `Glob` leaves no other evidence it ran, and the warmup's path calls
are real — `bracket-trace-1`'s trace holds three warmup `Glob`s on the cwd, which this fence now
admits. The agent's own op calls are not traced; those are `transcript.jsonl`'s. So a trace's line
count is comparable only across recordings under the same rule: the sixteen denials quoted above
were counted under a deny-only trace and before the path fence, and a fresh recording will carry
`PreToolUse.allow` lines they do not have.

Real runs advertise no built-in tool (`tools: []`), so today the only reads that reach the fence
are the CLI's warmup; the fence is wired now so that the run-2 ticket's widening to `['Read']` is
one array edit with the gate and the probe already in place. The transport rebuilds the allow-set
from `run.json` on every turn.

**The fence probe** — `cd portal && node lib/discovery-transport.mjs --probe-fence` — is the
run-time proof, because the hook runs before the permission flow and so, under the production
wiring, a `canUseTool` denial of the same call can never be observed: each site has to be shown
holding **alone**. Three paid one-shot turns with `tools: ['Read']` over a temp tree shaped like
run 2 (a fixture under `docs/epics/fixtures/`, the key one directory above it, the package as cwd):
**A** hook only, **B** `canUseTool` only, **C** both. The agent is asked to read the fixture, the
bank, the key and its own `answers.jsonl`; a nonce in each file tells a real read from a guess. It
reports `BOTH_SITES_HOLD` / `HOOK_ONLY_HOLDS` (the fast path let turn B's key read through — the
reason the hook exists) / `FAILED`, exit 0 / 2 / 3, and prints every `denied` line with its `via`.

**Observed (2026-09-01, SDK 0.1.77, nonce `67ac2aac`, $0.398 over three turns): `BOTH_SITES_HOLD`.**
Turn A (hook only): the key denied via `PreToolUse`; the allow-all `canUseTool` was reached for the
fixture and the bank — both outside the cwd — and **not** for the package read inside the cwd. That
is the permission fast path, observed directly: an in-cwd read never consults `canUseTool`, which is
why the hook exists. Turn B (`canUseTool` only): the key denied via `canUseTool` — the CLI does
consult the callback for a read outside the cwd. Turn C (both, the production wiring): the key
denied via `PreToolUse`, `canUseTool` never reached for it. Every allowed read returned the nonce.
The probe's stdout and its fence trace are committed at `.claude/reports/discovery-read-fence-287/`.
A first run the same day ($0.442) reported `FAILED` with the fence holding identically — the probe
had checked the nonce on a print-length excerpt of the tool result; it is kept beside the passing
run as `probe-fence.run1.*`, because a probe that mis-reads its own evidence is a finding too.

## Workflow

A run is a REAL session through the portal's discovery drawer (#284): pick a slug and a provenance,
confirm or change the proposed depth, start, and answer one banked question per turn. The server appends the answer to
`answers.jsonl` before the agent turn starts, the agent judges that one answer and files at most one
closing op through an in-process MCP tool, and the package appears under the provenance's root as
it goes. A page reload or a server restart resumes from disk; "Finish" sets `endedAt`. The recorder
is `portal/lib/discovery.mjs` (SDK-free) + `portal/lib/discovery-transport.mjs` (the one SDK
import); their headers are the specification.

**An audit** (#286) starts the same way with the entry set to an existing PRD: paste the document or
name a repo-relative path the server reads (run 2's frozen fixture), the posture is Grill, pick its
model, start — the server stores the document once and every "Audit this question" turn judges it.
Nothing is typed per turn.

```bash
node tooling/build-checks.mjs                      # group 29 drives every applier rule, group 30 the session, group 31 the projection, group 32 the parenting fixture — SDK-free
cd portal && node lib/discovery-transport.mjs --preflight   # the transport's eight rows, zero tokens, before a real run
cd portal && node lib/discovery-transport.mjs --probe-parenting   # ONE paid turn: does the agent name a parent when the ledger shows one? run after any prompt edit
cd portal && node lib/discovery-transport.mjs --probe-fence   # THREE paid turns: the read fence holding at each call site ALONE (#287); run after any edit to the fence or the transport's wiring
cd portal && node lib/discovery-transport.mjs --probe-audit [--model claude-opus-5]   # ONE paid turn: does Grill reach a verdict the audit rule names, quote the document's wrong-if, and judge in prose first? (#286); run after any edit to the audit rules
cd portal && DISCOVERY_FENCE_TRACE=<path outside every run root> npm start   # arms the fence trace (#349) for the recordings this server serves: every decision on a tool outside the run's op vocabulary — allow as well as deny — with its tool and whether it wrote a transcript line. Off by default; the path is operator discipline, nothing enforces it
node discovery/prd-projection.mjs <slug> [--stdout] [--force]   # the run package → prd.md (#290); group 31 drives the pure half
cd portal && node lib/discovery-proposer.mjs --dry --slug <slug> --provenance fictional   # the proposal run's seven preflight rows + the whole brief printed, ZERO tokens (#359); run before every paid attempt
node discovery/proposals.mjs <slug> [--stdout]     # proposals.jsonl → proposals.md (#359); ALWAYS overwrites, because a verdict changes the page
# A PROPOSAL RUN and a VERDICT are drawer controls, never a file anyone types: "Propose features" runs
# one fenced pass over the FINISHED package (refused by name while it is still open, and refused again
# if the package already carries proposals — a package gets ONE run and there is no override), and each
# verdict button appends one server-written line and regenerates proposals.md. proposals.jsonl is
# append-only — a bad run is fixed by tightening ONE prompt constant in portal/lib/discovery-proposer.mjs,
# DISCARDING proposals.jsonl and re-running, never by an edit and never by a second run beside the first.
# never a file anyone types. Provenance is declared at session start and the root follows it.
```

`traces/README.md` is the model for the typed-line style (`type`, `seq`, `ts`, a `denied` step at
"A fence denial") and for the honesty block above; `replay/README.md` for the generated-projection
rule `prd.md` inherits.
