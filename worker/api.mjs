// worker/api.mjs — fixture-backed mock API (epic #1, ticket #4).
// Architecture §Boundaries: public, read-only GET, no user data — the site must
// degrade to the committed static fixtures if this Worker is down
// (system/scenario-data.mjs owns that fallback). Routes:
//   GET /api/health                     → { ok, scenarios }
//   GET /api/<scenario>/<collection>    → the fixture array
// Everything else: { error } JSON (project convention: one boundary, plain messages).

import { FIXTURES } from "./fixtures.mjs";

const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=300",
};

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    // errors are never cached — a mistyped route's 404 must not be replayed for 5 minutes
    headers: { ...HEADERS, ...(status !== 200 && { "cache-control": "no-store" }), ...extra },
  });

export default {
  fetch(request) {
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET" },
      });
    if (request.method !== "GET") return json({ error: "read-only API" }, 405, { allow: "GET" });

    const parts = new URL(request.url).pathname.split("/").filter(Boolean);
    if (parts[0] !== "api") return json({ error: "unknown route" }, 404);

    if (parts.length === 2 && parts[1] === "health")
      return json({ ok: true, scenarios: Object.keys(FIXTURES) });

    if (parts.length === 3) {
      const [, scenario, collection] = parts;
      // Object.hasOwn: segments are request-controlled — bare bracket access would
      // resolve inherited Object.prototype members (/__proto__, /toString → 200).
      const pack = Object.hasOwn(FIXTURES, scenario) ? FIXTURES[scenario] : undefined;
      if (!pack) return json({ error: `unknown scenario "${scenario}"` }, 404);
      const data = Object.hasOwn(pack, collection) ? pack[collection] : undefined;
      if (!data) return json({ error: `unknown collection "${collection}"` }, 404);
      return json(data);
    }

    return json({ error: "unknown route" }, 404);
  },
};
