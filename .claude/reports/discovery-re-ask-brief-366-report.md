# Implementation Report — the discovery re-ask brief reaches Think (#366)

**Plan**: `.claude/plans/discovery-re-ask-brief-366.md`
**Branch**: `feat/366-reask-brief` (off `origin/main` at `700c052`)
**Status**: COMPLETE

## Summary

`buildThinkTurn` now interpolates `reaskBrief(ledger, question.id)`, so on a held question's second ask the
Think agent is handed the FIRST `flag_weak_answer`'s `missing` list and judges the new answer against what it
said was lacking. One edit covers both `think` and `think-opus`, because both `POSTURES` entries name the same
builder. Create PRD and the Grill interview already carried it — #286 built `reaskBrief`; the ticket body,
which says it "never reaches the turn prompt", was stale for two of the four postures.

**All five posture fingerprints are unmoved**, so no committed run package is staled and nothing is
re-recorded. Create PRD's interpolation form was copied verbatim precisely to buy that: `${reask ? \`\n${reask}\n\` : ''}`
replaces the template's blank line, so the empty branch collapses back to the `\n\n` Think had.

The change also closes a hole neither the ticket nor #286 raises: **the brief's wording sat outside every
posture fingerprint**, on the two postures that already carried it. `fingerprintOf` hashes builds over
`FINGERPRINT_INPUTS`, whose ledger holds three `record_decision` rows and no flag, so `reaskBrief` returned `''`
every time a stamp was computed. Editing the brief's text was invisible to the whole gate stack. It is now
pinned verbatim, and both routes that would fold the branch into the hash fail by name with the bill stated.

## Tasks completed

**Phase 1 — the code** · `portal/lib/discovery-postures.mjs`
- `const reask = reaskBrief(ledger, question.id);` added before `buildThinkTurn`'s template.
- The blank line between `${ledgerBrief(ledger)}` and `Judge it, …` replaced by `${reask ? \`\n${reask}\n\` : ''}`.

Two lines. No import added — `reaskBrief` is defined in the same module, and the file stays statically
SDK-free and zod-free (group 30 imports it in CI with no `portal/node_modules`).

**Phase 2 — the gate** · `tooling/build-checks.mjs`
- Case 31's loop gains `["think", buildThinkTurn]`, so Think inherits all five re-ask assertions through the
  same loop rather than a bespoke one.
- The deliberate pin `case 31: Think must NOT carry the re-ask brief …` is deleted and replaced by two pins:
  the produced brief compared VERBATIM against its literal, and `FINGERPRINT_INPUTS.ledger` asserted to hold
  no `flag_weak_answer`.
- Case 30 gains `same(Object.keys(FINGERPRINT_INPUTS_FOR), ["grill"])` — the second route into the expensive
  branch. Today's gate already reddens 8 times on that route, but not one of those lines states the bill.

**Phase 3 — the prose**, seven sites, all of which said the old scope:
1. `reaskBrief`'s comment — names all three interview builds; states the exclusion and its guard.
2. The module header's `… do NOT reach Think` sentence — split: `JUDGEMENT_RULE` still does not (verified:
   absent from both of Think's prompts), `reaskBrief` now does, without moving either stamp.
3. The module header's `THE FINGERPRINT COVERS EVERY TEMPLATE A POSTURE HAS` — qualified per TEMPLATE, not
   per BRANCH. This one was already false before this ticket.
4. The `FINGERPRINT_INPUTS` exclusion list — the re-ask branch added as a fourth entry, with the reason it
   differs from the other three (they are outside structurally; this one is outside because the fixed ledger
   holds no flag, and is LEFT outside deliberately) and its guard named.
5. Case 31's header comment.
6. The `group("discovery", …)` ✓ description, including its "what it cannot reach" tail.
7. `.claude/references/gates.md` line 49 — a `#366 added: …` clause of its own, plus the one factual
   correction inside #286's clause.

## Validation

| Check | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` — observed |
| `node tooling/drift-check.mjs` | `drift-check ✓` — observed, clean tree |
| `node tooling/token-lint.mjs` | `token-lint ✓ 63 contract tokens · 0 orphan` — observed |
| Portal smoke, `PORT=4791` | `/api/health` → `{"ok":true,…,"stale":false}`; `/api/discovery/config` answers; killed by PID; `port 4791 clear` — observed |
| The five stamps | `7efdde37 · cadb3811 · edc7c52d · 76b7847d · ba124c3c` — byte-identical to the pre-edit baseline on this branch |
| Groups 32 and 33 | green on their live per-package fingerprint compares |

Baseline on `700c052` before any edit, driven in this worktree: gate green, all five hexes as above,
`drift-check` green once `tooling/style-dictionary/node_modules` was linked in (a fresh worktree lacks it —
an environment fact, not drift).

### Proving the checks — four mutations, driven and reverted

**M1 — `This is the second ask` → `This is the SECOND ask` in `reaskBrief`'s template.** 1 failure:

```
· case 31: the re-ask brief WORDING moved — got "This is the SECOND ask of this question. …"
```

The control that matters: **this same mutation is green on `origin/main`**. That is the hole the pin closes.

**M2 — Think's interpolation removed, the widened loop left in place.** 2 failures, both naming `think`:

```
· case 31: the think second-ask turn prompt does not carry the re-ask brief VERBATIM (#366)
· case 31: the think re-ask brief must sit after the ledger brief and BEFORE the closing line
```

(A first attempt at this mutation replaced the string in Grill's interview template too — the closing line
is shared, byte-identical, by both builders — and gave 4 failures. Re-driven scoped to `buildThinkTurn`'s
template alone for the 2 above.)

**M3 — a `flag_weak_answer` appended to `FINGERPRINT_INPUTS.ledger`.** 14 failures across three groups —
`discovery ✗ 11`, `parenting ✗ 1`, `graded fixture ✗ 2`, including the new pin by name and:

```
· case 30: Think's stamps are f7e65bec / f4c53c92 — the five recordings carry 7efdde37 / cadb3811 …
· 32.2a: the Think prompt surface changed since the fixture was recorded (fixture 7efdde37 vs current f7e65bec)
· 33.15: graded-think-a carries fingerprint(s) 7efdde37, not the current think surface f7e65bec … re-record
```

**M4 — a `think` key in `FINGERPRINT_INPUTS_FOR`, wired into `POSTURES.think`'s stamp.** 9 failures; Think
moves to `8a4a26a3`. The new key-set pin fires by name and is the only line that states the 142-turn bill:

```
· case 30: FINGERPRINT_INPUTS_FOR holds think, grill — Grill alone has a second TEMPLATE …
```

### Manual read — the prompt the agent gets

Driven on the patched module with a three-item `missing` list. The brief sits on its own paragraph after the
parent-candidates block and before the closing line, one blank line either side, and
`/second ask/i.test(systemPrompt)` is `false`.

## Deviations from the plan

**One, and it is a re-derivation rather than a change.** The plan's line numbers and its `build ✓` baseline
were taken against `31a46e8`; current `origin/main` is `700c052`, two merges later (#378, #380).
`tooling/build-checks.mjs` had moved 107 lines and `gates.md` 4. Every anchor STRING the plan names was
re-checked against the new tree before editing and all were present exactly once;
`portal/lib/discovery-postures.mjs` had not moved at all. Every edit was anchored on the string, per the
plan's own instruction. No task was skipped, added or reordered.

The plan's optional "mirror Create PRD's comment sentence in `buildThinkTurn`" was not taken — it is
explicitly not one of AC #5's seven sites and no VALIDATE checks it. `buildThinkTurn`'s two existing comment
blocks were read against the patched template and neither states anything the change makes false.

## Acceptance criteria

- **AC #1** ✅ Think's second-ask prompt carries the first flag's seq and missing list; a first ask and a flag
  on a different question are byte-identical to before. Both `think` and `think-opus`, from the one edit.
- **AC #2** ✅ All five stamps unchanged. No run package edited, re-recorded or staled.
- **AC #3** ✅ Case 31's loop covers Think; M2 reddens it naming `think`.
- **AC #4** ✅ The wording pinned verbatim (M1); both routes into the expensive branch fail by name with the
  bill (M3, M4).
- **AC #5** ✅ Seven live prose sites corrected. No live prose still says the brief reaches two postures only,
  that Think's second ask stays blind, or that the fingerprint covers every branch. `grep` for
  `"for the two new postures only"`, `"for the two #286 postures"` and `"stays blind"` returns nothing;
  the one surviving `NOT reach Think` is the corrected `JUDGEMENT_RULE` clause, which is true and was verified
  by driving the build.
- **AC #6** ✅ `build ✓  all 34 groups pass`; groups 32 and 33 green.
- **AC #7** ✅ Portal boots, `/api/health` answers, process killed, port clear.
- **AC #8** ✅ PR body carries `Closes #366` and the paid-steps note below.

## Paid steps NOT run, and their tracker

No step in this ticket spent money, by design.

- **The fingerprint decision (Q1)** — whether the re-ask branch goes inside `think`/`think-opus`'s stamp.
  Costed at **at least $7.561 / 142 paid turns** — the GATE-DECLARED three (`instrument-loans-1` 12t $0.424,
  `graded-think-a` 65t $3.243, `graded-opus-a` 65t $3.894). It is a floor, not a total: `bracket-trace-1` and
  `-2` carry the same `7efdde37` and would be staled SILENTLY, since no group compares them (+24t $1.078 →
  166t $8.639 if both were re-recorded, which is a judgement call — they exist to prove #349's hook gating,
  not prompt bytes). The plan recommends against it and this PR follows that, with a stated
  wrong-if: **the day a recording actually takes a second ask, the freshness argument inverts and the hash
  should cover it.** Owner's call; a follow-up ticket if they want it. The two new gate pins make that choice
  a named failure rather than a silent one.
- **`--probe-reask` (Q3)** — a one-turn paid observation that a model actually USES the brief. Roughly
  $0.03–$0.06. **No committed package has ever taken a second ask on any posture** (zero questions closed
  twice across all seven), so the brief is an unobserved prompt string on all four postures. That limit is now
  stated in the group description's "what it cannot reach" tail and in `gates.md`. Worth its own ticket.

## Notes worth carrying

- **Three of the six stamped packages are gate-compared, not all six — and ungated is not the same as stale**
  (PR #381 F3, which corrected the earlier form of this note). `allergen-matrix-1` carries `df6fbc35` and IS
  stale against the current `7efdde37`, with a green gate. `bracket-trace-1` and `-2` carry `7efdde37` itself:
  ungated but FRESH. A green run is not proof every recording matches the tree, and a stamp move would take
  those two from fresh to stale with nothing saying so.
- **The closing line is shared byte-identical between `buildThinkTurn` and Grill's interview template.** A
  string replacement over it hits both. Cost one mis-scoped mutation here; anchor on the surrounding comment
  block instead.
- **A fresh worktree needs `tooling/style-dictionary/node_modules`** or `drift-check` fails on a Style
  Dictionary import, which reads as drift and is not.
