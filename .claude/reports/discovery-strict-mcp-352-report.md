# #352 + #353 — strictMcpConfig on the real turn, and the duplicate 30.20 renumbered

Date: 2026-09-02 · Issues: #352 (fence `.mcp.json` out of a run's advertised surface), #353 (the group 30 case label `30.20` used twice)

## What changed

- `portal/lib/discovery-transport.mjs` — `strictMcpConfig: true` on the real turn's query options, beside `mcpServers`. The op server is now the run's whole MCP surface by option, not by the SDK's default.
- `tooling/build-checks.mjs` — one new case-12 pin, scoped to the real turn's query block (the same `resume: head.sessionId` positive-control scoping as the cwd pin), plus the group summary line. And the fence-hooks block renumbered `30.20` → `30.26` with all sixteen `case 20:` messages now `case 26:` (30.23–30.25 were taken by #287 after the issue was filed, so not `30.23` as #353 guessed).
- `.claude/references/gates.md` — group 30's entry gains the #352 sentence, and the *Cannot reach* clause now states that `--preflight` roots itself under the OS temp dir and drives the bundled server's handlers in-process, never the CLI — so PF1 is no statement about what a real run's repo cwd would merge from `.mcp.json`.
- `.claude/reports/discovery-bracket-trace-349-report.md` — a renumbering note under the two quoted `case 20:` failure messages, so the committed evidence stays traceable to `30.26`.

## The observation the issue called undetermined (observed)

The issue: whether the CLI merges the repo's `.mcp.json` (`codebase-search`) into a run whose cwd is `discovery/<slug>` was undetermined from the pinned SDK 0.1.77 bundle, and the preflight cannot answer it (different cwd — in fact no CLI at all).

Four paid 1-turn haiku probes, cwd = `<repo>/discovery`, reading the init message's `mcp_servers` and `tools` ($0.0014 total):

| wiring | default | strictMcpConfig: true |
|---|---|---|
| no `mcpServers` option | `mcp_servers []`, no `mcp__` tools | same |
| SDK server passed (the real run's shape, `--mcp-config` present) | `mcp_servers [probe(connected)]`, tools `[mcp__probe__noop]` only | same |

So under SDK 0.1.77 the project `.mcp.json` never joins the advertised surface even by default — `strictMcpConfig: true` pins that default rather than plugging an active leak. The empirical note in #352 (no `mcp__codebase-search__*` name in either bracket-trace transcript) is now explained, not just observed.

## Validation (all observed)

- `node tooling/build-checks.mjs` — all 32 groups pass, before and after.
- Mutation: `strictMcpConfig: true` → `false` turns the gate red naming the new pin (`case 12: the real turn's query must set strictMcpConfig: true (#352) …`); restored, green.
- `node portal/lib/discovery-transport.mjs --preflight` — 8/8 rows pass, zero tokens.
- No posture edit: the prompt-surface fingerprint is untouched (`discovery-postures.mjs` not modified), so no committed recording goes stale.

## Deviations

- D1 — renumbered to `30.26`, not `30.23`: #287 landed 30.23–30.25 after #353 was filed.
- D2 — #352's third fix bullet asked for "a preflight whose root sits inside the repo". The zero-token preflight never spawns the CLI, so its root cannot answer the merge question from any cwd; the paid init-message probes above are the verification that bullet actually wanted, taken under the cwd a real run uses.
