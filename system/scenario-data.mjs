// system/scenario-data.mjs — hand-written canon (this repo; not generated).
// Scenario data loader: try the fixture-backed Worker API, degrade to the committed
// static fixtures (epic #1, ticket #4; architecture §Boundaries — "the site must
// degrade to static fixtures if it's down").
//
// `source` in the result is load-bearing for the honesty contract's capability
// indicators: consumers state exactly what answered — "worker" (live mock API) or
// "static" (committed fixture files served by the page's own origin).
//
// API bases come from /scenarios/index.json: `api.local` when the page runs on
// localhost/127.0.0.1, `api.prod` otherwise. An empty base means "no Worker there" —
// the loader goes straight to static (api.prod stays "" until the Worker's first deploy).

const WORKER_TIMEOUT_MS = 2500;
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

let registryPromise = null;

export function loadRegistry() {
  registryPromise ??= fetch("/scenarios/index.json").then((res) => {
    if (!res.ok) throw new Error(`/scenarios/index.json: ${res.status} ${res.statusText}`);
    return res.json();
  });
  return registryPromise;
}

async function apiBase() {
  const { api } = await loadRegistry();
  return LOCAL_HOSTS.includes(location.hostname) ? api.local : api.prod;
}

// → { data, source: "worker" | "static" }. Throws only when the static fallback
// itself is missing — that path names the file, per the project error convention.
export async function loadCollection(scenario, collection) {
  const base = await apiBase().catch(() => "");
  if (base) {
    try {
      // no-store: `source: "worker"` must mean the API answered NOW. Without it the
      // browser replays the Worker's max-age=300 responses from HTTP cache for five
      // minutes after it goes down — and the capability indicator would lie.
      const res = await fetch(`${base}/api/${scenario}/${collection}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(WORKER_TIMEOUT_MS),
      });
      if (res.ok) return { data: await res.json(), source: "worker" };
    } catch {
      // Worker down, slow, or unreachable — exactly the case the fallback exists for.
    }
  }
  const path = `/scenarios/${scenario}/fixtures/${collection}.json`;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status} — no static fixture to fall back to`);
  return { data: await res.json(), source: "static" };
}
