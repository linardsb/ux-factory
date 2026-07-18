# Traces — real agent runs, replayable

Spec for epic #1, ticket #5 · architecture §Data model (Trace) + §Where it plugs in
(the portal's Agent SDK dependency becomes the trace recorder) + §Honesty (surface #2).

A **trace** is JSONL: the recorded steps of a *real* Claude Agent SDK run, each step tagged
with its PIV phase (`plan | gate | implement | validate`) and — for file writes — paired with
the artifact it produced. A view-time player (`system/trace-player.mjs`) replays a committed
trace as stepped annotated cards grouped into the four PIV acts. No live LLM runs at view time
— the player replays a file (hard constraint). The designed surface is the Factory page (#10);
`trace.html` is the bare test harness (the `derive.html` pattern).

**Honesty rules (hard, from the PRD — non-negotiable):**

- A trace file is only ever produced by `portal/record-trace.mjs` from a **real** agent run.
  **Never hand-write or hand-edit trace content** — not one line. If a run reads badly, the
  honest fix is a better run (tighter prompts), never an edit.
- Curation is `tooling/curate-trace.mjs` **only** — selection + truncation, never rewriting.
  Every curated `meta` records exactly what curation did (its rule names + counts).
- **Raw and curated are both committed**, so a reader can diff them and see curation touched
  nothing but length.
- The curated `label` is exactly `Real run, curated for length` (architecture §Honesty,
  surface #2). The raw `label` is `Real run — raw, uncurated`.

## Files

```
traces/
  README.md              this contract — written first, everything else conforms
  <slug>.raw.jsonl       the uncurated run, exactly as recorded (the verifiability anchor)
  <slug>.jsonl           the curated run the player renders (selection + truncation only)
```

Both are committed (deploy = commit the artifacts). Dry-run output (`--dry`) is a smoke test
written to a scratch dir and **never lands here** — this directory holds only real, shippable runs.

## Line schema (JSONL — one JSON object per line)

**Line 1 — `meta`** (the run header + honesty label):

```json
{ "type": "meta", "version": 1, "slug": "demo-notice",
  "task": "Author the demo-notice ComponentSpec",
  "label": "Real run — raw, uncurated",
  "model": "claude-sonnet-5", "sessionId": "…", "startedAt": "2026-07-17T…Z",
  "cwd": "/…/ux-factory" }
```

A **curated** meta adds a `curation` record and merges the run stats up from the result line:

```json
{ "…": "…everything above, with the curated label…",
  "label": "Real run, curated for length",
  "curation": { "from": "demo-notice.raw.jsonl",
    "rules": ["strip-piv-markers", "truncate-input-700", "truncate-response-400", "drop-empty-text"],
    "droppedSteps": 4, "inputTruncatedAt": 700, "responseTruncatedAt": 400 },
  "numTurns": 12, "durationMs": 221000, "totalCostUsd": 0.31 }
```

**Step lines** — one per recorded step, `seq` strictly increasing (text and tool steps share
one `seq`, so the file is true chronology — do not sort):

```json
{ "type": "step", "seq": 3, "ts": "…Z", "phase": "plan", "kind": "text",
  "text": "I'll read the spec format first, because the head fields …" }
```

```json
{ "type": "step", "seq": 4, "ts": "…Z", "phase": "plan", "kind": "tool",
  "tool": "Read", "input": { "file_path": ".claude/references/kb-format.md" },
  "ok": true, "response": "…", "responseTruncated": false, "toolUseId": "…" }
```

A successful `Write`/`Edit` step **must** carry `artifact` — the step↔artifact pairing the
Trace definition demands (path is repo-relative):

```json
{ "…": "…kind:tool, tool:Write, ok:true…",
  "artifact": { "path": "system/specs/demo-notice.md" } }
```

A failed tool step carries `"ok": false` and `"error"` and is **kept through curation** — a
check that failed and got fixed is the governance story, not something to hide.

**Last line — `result`**:

```json
{ "type": "result", "ok": true, "numTurns": 12, "durationMs": 221000,
  "totalCostUsd": 0.31, "endedAt": "…Z" }
```

## Phase tagging — from the agent's own markers, never by hand

Phases are not assigned by the recorder or a human. The run's system prompt requires the agent
to announce each phase by emitting its marker **alone on its own line, as the first line of a
text block**, before that phase's work:

```
[[piv:plan]]   then   [[piv:gate]]   then   [[piv:implement]]   then   [[piv:validate]]
```

The recorder scans each text block for `/^\s*\[\[piv:(plan|gate|implement|validate)\]\]/`,
updates the current phase, and tags every subsequent step with it. Steps recorded **before the
first marker** carry `"phase": null` → the validator fails the trace → the fix is a tighter
prompt and a re-run (spike 5's loop), **never a hand-tag**. Raw traces keep the marker lines;
curation strips them (the `phase` field already carries the tag).

## Workflow

```bash
node portal/record-trace.mjs --dry     # smoke test (pennies) → scratch dir, never traces/
node portal/record-trace.mjs           # the real run → traces/<slug>.raw.jsonl + a ✓ summary
node tooling/curate-trace.mjs traces/<slug>.raw.jsonl traces/<slug>.jsonl
node tooling/validate-trace.mjs        # every traces/*.jsonl — one ✓ per file, exit 1 on drift
# view:  trace.html?trace=<slug>
```

`tooling/validate-trace.mjs` is the format's drift guard (candidate CI gate for #9): every line
parses, phases occur in PIV order, every successful Write/Edit pairs an artifact that exists,
the honesty label is present, and curated files carry a curation record with no `[[piv:` remnant.
