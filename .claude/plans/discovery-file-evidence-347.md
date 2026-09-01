# Plan: file_evidence names an artefact, and the agent knows which run it is in (#347)

**Epic**: #279 · **Ticket**: #347 (the amendment; both halves of #338 F6/F8) · **Branch**: `fix/347-file-evidence-amendment` off `origin/main` `0fbe8c8`
**Scope**: fix-sized under the op-verb lock — a `PARAMS` field, a prompt input, the gates that pin them, one re-record. Not a verb.

## What ships

**Half A — `name` on `file_evidence`.** `PARAMS.file_evidence` becomes `url · ref · name · provenance · claim_ref`.
`name` is null or a non-empty string, accepted only beside a `ref` (a URL is its own identity) — so "the Q3
dispensing spreadsheet" gets a row of its own that still points at the sentence that named it, and invariant 1
holds: the one string the agent authors is a label, never the answer's words. Refusals: a name beside a url; an
empty or non-string name. The projection renders `name (answer ref)` in both surfaces and re-checks the rule
over a corrupted ledger.

**Half B — the run's provenance in the system prompt.** `PROVENANCE_RULE` keyed by `run.json`'s two
provenances; `buildThinkTurn` takes `provenance` (required, refused otherwise); the transport passes
`head.provenance`; `FINGERPRINT_INPUTS` carries `fictional`. Placed BEFORE `EVIDENCE_RULE`, which it qualifies,
so `PARENT_RULE` keeps its tail. Both postures' fingerprints move; group 32 goes red until the re-record.

**Decided against here:** an applier refusal of `real-interview` on a fictional run. It changes the ctx contract
for every applier caller; the prompt is observed on the re-record first, and the refusal is the fallback.

## Gates (each mutated once, restored)

- Group 29: `ev()` carries `name: null`; a named artefact RECORDED with PARAMS' key order; three refusals.
- Group 30: case 4 (TOOL_SCHEMA ↔ PARAMS) follows automatically; case 11 builds carry provenance and two
  junk builds (absent, unknown) throw; case 16 pins `PROVENANCE_RULE` (keys, both texts, each rendered only for
  its own run, order before `EVIDENCE_RULE`, turn prompt unchanged) and `EVIDENCE_RULE` naming `name`; case 19
  proves the rule is inside the hash; case 12 pins the transport's `provenance: head.provenance`.
- Group 31: the fixture's second evidence row is NAMED and proven to reach the page; two corrupted-ledger refusals.
- Group 32: red on the old package by name (fingerprint + shape), green after the re-record.

## Re-record (README §Re-record procedure)

Probe ×2 → PARENTED twice · `rm -rf discovery/instrument-loans-1` (the twelve answers preserved first) ·
portal on `PORT=4748` · the drawer driven with the same twelve answers, headless Chromium · Finish ·
`prd-projection.mjs instrument-loans-1` · `build-checks` green.

## Verification

`node tooling/build-checks.mjs` all 32 · `node tooling/drift-check.mjs` · the re-recorded package's evidence
rows read `fictional-scenario` with a `name` (observed, not assumed) · answers byte-equal to the sheet.
