# PR #346 review — a whole-bank depth and a Think-on-Opus posture

**Head** 51359c1 · **Base** main @ `9c48054` · round 1 · 2026-09-01

**Verdict: APPROVE** — no critical/high findings, all gates green, the change matches the ticket's
constraints (THINK_MODEL untouched, no thinking budget, depth derived in the module and pinned in the
gate). Three findings below for triage; F1 is the one worth a decision before the first paid run.

## Findings

### F1 (medium) — `think-opus` has never produced a turn; its model string is expected, not observed

`portal/lib/discovery-postures.mjs:219` · `portal/lib/discovery-transport.mjs:395,411`

`claude-opus-5` reaches the SDK's `query()` through `posture.model` exactly as `claude-sonnet-5` does,
and `docs/epics/discovery-partner.architecture.md` §On newer model strings records that the 0.1.77
bundle's model list is display, not a whitelist. That is the precedent, not an observation of this
string. The operator probe (`--probe-parenting`) hardcodes `POSTURES.think` at both sites, so there is
no zero-code one-turn check for the new posture.

Cheapest observation: a fictional `scope-check` session on `think-opus` in the drawer, one question
answered (≈ $0.12 expected, 2.5× the sonnet probe's $0.04–0.10 observed range); then delete the partial
package under `discovery/<slug>/` — it must not be committed. Or a follow-up adds `--posture <id>` to
the probe, which is a five-line change to the transport's CLI branch. Not blocking: the ticket ships
the capability and says not to run.

### F2 (low) — `WHOLE_BANK` makes every bank addition a two-place edit; #283 should expect the message

`tooling/build-checks.mjs` group 28

#283 "extends QUESTIONS with the product-type branches". With this PR, adding an entry moves the 65
count pin (already true) AND `WHOLE_BANK` (new) — two messages, same PR discipline. No new burden, but
the `whole-bank drifted from the documented 65: […]` message prints the whole 65-id array, which is
noisy beside the count message. Fine as is; noted so #283 is not surprised.

### F3 (low) — three pins beyond the ticket's literal ask

Report D1–D3: the depth-menu pin, the label pin (`/stress test/` and not `/interview/`), and the posture
key-set pin with `maxThinkingTokens`/`thinking` absent. Each is one `ok(...)` line encoding a ticket
constraint as a failure by name, and each was proven able to fail (mutations A–C). Drop any on triage;
the label pin is the most opinionated, since it fixes a wording choice in a gate.

## What was checked

- Diff read in full (6 files, +264/−8). `full-discovery`'s list and the #283 sentence are byte-identical.
- `POSTURES.think.fingerprint` unchanged (`df6fbc35`) — group 32's line, observed. `think-opus` stamps
  `593035e6`.
- Downstream readers of a depth id or posture id: `discovery/prd-projection.mjs:652` prints `run.depth`
  by id; `portal/public/portal.js:760-772` falls back to `head.depth`; `openSession` refuses an unknown
  posture by name and records `POSTURES[posture].model`. `discovery/README.md:180` ("`depth` … take the
  values `bank.mjs` exports") stays true. Nothing maps depth ids to a local table.
- Gates: `build-checks` ✓ 32/32, `drift-check` ✓, three mutations red by name then restored (md5
  equal), portal `/api/health` + `/api/discovery/config`, headless-Chromium drawer options — all in the
  report's Validation section.
- No shipped page touched; no VR run needed.
- PR body: no `Closes` (no ticket), #283's ownership of "about thirty" named, costs labelled derived /
  expected.
