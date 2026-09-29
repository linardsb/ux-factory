# two-lane — a SYNTHETIC build package (#314)

SYNTHETIC — typed for build-checks group 49 and the `build-handoff` drift leg (#314), not a design and not a run. The
first six ops are the committed spine's (`discovery/faster-payment/build/ops.jsonl`); the last three add a loading
state, an arrow to it, and lane b, which relabels Continue and leaves the error state out. It sits under
`tooling/fixtures/`, not `discovery/`, so the portal's run list and group 36 never read it as a design. There is no
`transcript.jsonl`, so every decision ref is flagged `no-transcript` in `build/handoff/lineage.json` — deliberately.

`build/ops.jsonl` and `build/canvas.json` were typed, folded through the real `applyOps` and written through the real
`saveBuild` (D-a, `discovery/README.md`). `build/handoff/` is GENERATED — `node agent-layer/gen-build-handoff.mjs`.
Reproduce the two package files, from the repo root:

```js
// node --input-type=module -e '…'
import { readFileSync } from "node:fs";
import { applyOps } from "./system/canvas-ops.mjs";
import { arrangement, saveBuild } from "./portal/lib/canvas-store.mjs";
const spine = readFileSync("discovery/faster-payment/build/ops.jsonl", "utf8").trim().split("\n").map(JSON.parse);
const extra = [
  { op: "state.add", params: { baseId: "f1", stateKey: "loading", override: { set: { continue: { label: "Checking the name…" } } } } },
  { op: "connect", params: { from: { frameId: "f1", partId: "continue" }, to: { frameId: "f3" }, trigger: "the name check is still running" } },
  { op: "variant.add", params: { key: "b", overrides: { f1: { set: { continue: { label: "Check the name" } } }, f2: { omit: true } } } },
];
const all = [...spine.map(({ op, params }) => ({ op, params })), ...extra];
const doc = applyOps(all);
const lines = all.map((o, i) => ({ seq: i + 1, at: "2026-09-29T00:00:00.000Z", source: "owner", op: o.op, params: o.params, status: "applied" }));
const positions = { f1: { x: 0, y: 0 }, f2: { x: 472, y: 0 }, f3: { x: 472, y: 700 }, d7: { x: 894, y: 0, w: 280 }, d8: { x: 1206, y: 0, w: 280 } };
saveBuild("tooling/fixtures/builds/two-lane/build", arrangement(doc, positions), lines);
```
