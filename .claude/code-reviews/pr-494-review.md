# PR #494 review — compose-and-name: group.define/group.place, per-copy overrides, Promote (#315)

**Head** b4383d1 · **Base** main @ `b99d9acda61e4d955a8a4240b7f071c6d2ba485c` · first round (no prior review, so the guarantees pass does not apply)

## Summary

The grammar gains its last two verbs (fourteen in total), a `groups/<id>.json` projection checked by `verifyBuild`, a deterministic Promote, and group-origin admission through Ratify. The code reviewer read the applier, store, promote, ratify, the routes, `canvas-groups.mjs` and the new gate code, and probed the modules directly. There are **no Critical or High issues**. One Medium and four Low issues are below. Every gate re-run at the head is green, including the canvas journey on all three engines, which the PR body had marked as not re-run after `b4383d1`.

## Issues

### Medium

**F1 — a group can be redefined after it is promoted or ratified, so the proposal no longer describes the group it names** (observed)
- `system/canvas-ops.mjs`, the `group.define` edit branch. Its only refusal is "drops parts a copy overrides", and it never looks at `doc.proposals`.
- Probe: define `g1` "card-a", then `component.propose {groupId: g1}`. After that, `group.define {groupId: g1, name: "other-name", partIds: [...]}` is accepted. It is still accepted after `proposal.ratify`, and the proposal stays `ratified`.
- Why it matters: Promote's drafts (`source.json`, `spec.md`, `template.txt`) are frozen from the old parts. Ratify reads the **live** `doc.groups[g1]` (`portal/lib/ratify.mjs:519-525`) for the provenance line, the hash's group input and the Usage line. An admitted spec can therefore say "composed from group g1 (other-name)" while its template describes card-a. An import record cannot change after propose; a group can.
- A5 says a promoted group's copies keep following its definition, which makes a redefine after promote intended. A5 does not cover the proposal's drafts drifting away from that definition, and no gate covers it: 35.17d tests only the override blocker.
- Fix, either way:
  - refuse a redefine of a group that a proposal names, and list the blocker the way `canDeleteBasePart` does; or
  - have ratify compare the live group with `proposals/<name>/source.json` and refuse when they differ.

  If the owner wants this left open, record it as an assumption in the plan.

### Low

**F2 — `provenance.run` in `groups/*.json` is checked for shape only** (inferred from the diff)
- `saveRun` stamps `basename(pkgRoot)` on every save, and `verifyBuild` accepts any well-formed slug. A renamed copy of a package therefore relabels its groups as "composed in" the copy's name on its next save, and a hand-edited run naming another package passes.
- No consumer reads the file's run (`promoteGroup` recomputes it), so nothing downstream is wrong today. This was a deliberate trade-off, Deviation 7. The consequence is that the file's "composed in" claim is not verified by anything, so do not build a consumer on it.

**F3 — the applier accepts `/` in a part id on `screen.compose`** (observed)
- The `/` reservation is enforced only in `canvas-session.mjs`'s `idProblem` (47.10). `applyOp` with `screen.compose` and part id `"g1-1/a"` is accepted.
- A raw part named like an expanded copy part (`g1-1/title`) could then collide inside `frameTree`. This is reachable only through a non-agent op path.
- Fix: refuse `/` in the applier, where the other id rules live.

**F4 — `portal/public/canvas-groups.mjs` (~line 127) splits the `"<part> <prop>"` option value on one space** (inferred)
- `screen.compose` requires a part id only to be non-empty after trim. A part id containing a space would therefore send the override to the wrong key. Split on the first space only, or refuse whitespace in part ids.

**F5 — two documents disagree with the PR**
- `CLAUDE.md:27` still says the op grammar has "(twelve verbs)". The PR makes it fourteen and leaves the line unchanged.
- `.claude/reports/compose-and-name-groups-315-report.md` (lines 4, 116 and 145) still says the container-admission ticket is "not opened" and that the PR waits on it. #493 has been open since 2026-09-30 14:13Z, and the PR body links it.

Not a defect: `group.place` stores overrides naming parts the group does not hold and flags them as `dangling-set`/`dangling-hide` at render. The plan chose this (it stores and flags; it does not refuse).

## Validation (at `b4383d1`, in a clean detached worktree)

| Gate | Result |
|---|---|
| `node tooling/drift-check.mjs` | ✅ all 15 legs (observed, after `npm ci` in tooling/icons, portal and tooling/style-dictionary; the first run failed on missing deps only) |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan |
| `node tooling/build-checks.mjs` | ✅ all 50 groups pass |
| `node tooling/canvas-journey.mjs all` | ✅ chromium 188/0 · firefox 187/0 · webkit 187/0 |
| CI (verify · visual · codeql · audit · gates-green) | ✅ all green on the PR |
| `ratify-journey` | not re-run; 52/52 taken from the report |

## Numbers pass

- **Fourteen verbs:** observed. `OPS.length` and `PARAMS` are both 14.
- **loc 32,800 → 33,100 (runtime) and 41,500 → 41,700 (total):** observed in the `system/loc-summary.json` diff, and drift-check's loc-summary leg is green.
- **"33 passed, other 30 unchanged":** consistent (3 regenerated + 30 unchanged). CI `visual` is green.
- **50.2's "sixteen mutations":** observed, 16 rows.
- **Journeys:** the body says canvas-journey was re-run on chromium only after `b4383d1`. This review ran all three engines at `b4383d1` (above), so the three-engine claim is now observed at the head.
- **M1–M17, J1–J2, R1:** not re-run. Taken from the report, which labels R1's shadowed assertion honestly.

## Done well

- A definition comes only from a selection on a real frame, so no op can record a part that never appeared on a screen. Nesting is refused, so `expandGroups` is a single pass with no cycles.
- Promote is deterministic and SDK-free (pinned by 50.17 with no `portal/node_modules`). Each draft names its writer, and the ledger op is appended last.
- `originOf`/`checkAdmitted` with the per-origin id patterns in `PROVENANCE_FROM` keep the import path byte-identical, which was proved by the digest run on both sides.
- Path safety: ids are `g\d+`, checked in the applier and again in the route, and names go through `PROPOSAL_NAME_RE` and `underRoot`. The UI uses `textContent` only. The CSRF guard order is unchanged.
- The report's mutation table is specific, and it states the one assertion that was never seen to go red on its own.

## Recommendation

**Approve, with F1 recommended before merge.** None of the issues blocks the merge. F1 is the one that can make an admitted component's recorded provenance false, which falls under the honesty contract. It is a small applier refusal plus one 35.17 case. F3 and F5 are one-line fixes. F2 and F4 can wait.
