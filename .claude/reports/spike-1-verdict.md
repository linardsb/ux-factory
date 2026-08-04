# Spike 1 verdict — does a fenced agent build a board in separate, projectable tool calls?

**Ticket**: #203 · **Epic**: #202 · **Date**: 2026-08-04 · **Branch taken: A — CLEAN.**

**Answer: yes.** One real run, no re-runs needed. The pattern ships as designed; #209 inherits the
clean data model and the honest label, not a fallback.

## The mechanism

The agent's only build tool is a CLI (`tooling/board-op.mjs`) that applies exactly one op and
prints the whole resulting board back. One Bash call = one op = one trace step. The fence denies
`Write`/`Edit` outright, allows `Read` on the brief only, and allows Bash only for a command the
shared parser accepts against this run's board.

## The bar, each stated pass/fail

| # | Bar | Result |
|---|-----|--------|
| 1 | `node tooling/validate-trace.mjs traces/build-fieldwork-dispatch.jsonl` exits 0 | **PASS** — 31 steps · 4 phases · 0 artifacts · curated |
| 2 | Phases exactly `plan→gate→implement→validate`, **null-phase steps = 0** | **PASS** — 0 null-phase |
| 3 | Every implement-phase Bash step parses to exactly one op | **PASS** — 18/18, no batching, no chaining, no op-shaped text outside a tool call. **`N_ops = 18`** |
| 4 | Board ≥3 places, ≥1 connection, `assertBoard` passes | **PASS** — 4 places · 7 affordances · 7 connections |
| 5 | The board is a reasonable reading of the brief (judgement) | **PASS** — see below |

**The 1:1 claim is now closed, not just asserted.** Task 7's generator projects the committed
trace to **18 ops**, exactly `N_ops`. That is the spike's literal question — "steps that project
1:1 into replay ops" — answered by running the projection, not by counting by eye.

## Run numbers

- `numTurns` **22** · `durationMs` **131 043** · cost **~$0.379** · model `claude-sonnet-5`
- `maxTurns` was set to **80**; the run used well under half of it, so the cap is comfortable and
  not worth lowering (a board at the 6-place cap would use materially more).
- 3 fence denials, **all inside the plan phase** (after the marker): two `ls` attempts and one
  `Glob`. They are receipts in the committed trace, and they cost the run nothing.
- The `--dry` smoke test cost ~$0.447 — roughly double the plan's $0.10–0.25 estimate. Worth
  knowing for #209's budget: a run of this shape is ~$0.40, not ~$0.20.

## Judgement (bar 5)

The brief asked for a dispatcher's tool: see where today stands, work at-risk jobs one at a time,
move a job to another technician and see the move took — with customer communication explicitly
out of scope. The run produced `Today Overview → At-Risk Queue → Job Detail → Reassignment
Confirmation`, with return affordances back up the chain and the confirmation offering both
"Continue to next at-risk job" and "Return to Today Overview". Every place is somewhere the user
navigates to, every affordance is something acted on, every connection starts at an affordance,
and nothing customer-facing appears. It reads as a competent breadboard, not as a shape fitted to
the tool.

## What made it clean (one prompt fix, and it is worth carrying forward)

The `--dry` run was clean on every axis **except one**: the agent ran `ls` before emitting
`[[piv:plan]]`, producing a null-phase step, which `validate-trace` fails. The prompt at that point
said *"Do not explore or orient first"* — a prohibition, which the repo's
`recorder-run-positive-framing` memory already records as the thing that primes pre-plan
exploration. Reframing it positively fixed it in one pass:

> Start by emitting `[[piv:plan]]` as your very first output, then Read that brief — it is the
> first action of the plan phase. Everything you need is named in this task … so there is nothing
> to list, locate or orient in beforehand.

The real run then emitted the marker first and did its (denied) orientation attempts *inside* the
plan phase, where they belong. **The memory held**, on a second independent recorder.

## One design change worth reporting

The plan had the fence and the projector each carrying their own command parser. They are now one
exported function (`system/board-ops.mjs:parseOpCommand`), called by both. The consequence is the
reason to keep it: a command the projector could not read is **denied while the run is still
going** — the agent corrects itself inside the implement phase — instead of being discovered after
the money is spent. It fired for real: the run's third denial was `ls … 2>/dev/null || echo …`,
refused by the same grammar that later projected all 18 ops.

## The question left open for #209 (deliberately)

**Should narration and refusal beats be ops, or read from the curated trace?** #203's data model is
board ops only. The curated trace is committed, public, and named in the artifact's `source`, so
the driver can read text and denial steps directly — and this run makes that concrete: it carries
7 narration steps and 3 denials that a replay may well want, none of which are ops. Deciding it
here would have handed #209 a speculative inheritance in the very ticket the epic says must report
*before* #209 is planned. **It is decided with this evidence in hand, not before it.**

Also untouched, per the architecture's own open questions: whether replay steps drive `morph()` or
stay transform-only. That is a driver question.
