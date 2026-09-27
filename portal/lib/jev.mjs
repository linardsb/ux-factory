// The TypeSafe (Jev) client — one POST to the System One endpoint, and nothing else (#454).
//
// NO SDK: the fetch below is the whole client. TypeSafe publishes an HTTP API
// (https://docs.typesafe.ai/api.md) — bearer auth, `{ model, state, questions }` in, `{ model,
// answers, usage }` out — so a package would add a dependency to the portal for one request. The key
// is TYPESAFE_API_KEY in portal/.env (loaded by env.mjs on import), server-side only (CLAUDE.md
// §Secrets); the browser never talks to Jev.
//
// THE MODEL IS PINNED. A threshold is only meaningful against the model that produced the scores it
// was chosen on (discovery-guard.mjs's header), so an answer from any other model is refused rather
// than read: a silent server-side upgrade fails the call, and the guard's caller fails open.
//
// NO RETRIES HERE. The drawer path must finish inside its cap, so a slow or refused call throws and the
// caller decides; tooling/jev-guard-eval.mjs does its own retry on 429/529.
//
// UNVERIFIED: the ~150 ms latency and the $0.042/M input pricing appear only in third-party posts, not
// in TypeSafe's docs. The eval measures latency; cost stays an estimate.
//
// #453 (the contradiction screen) reuses askJev and JEV_MODEL. Do not fork this file.
import './env.mjs';

export const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
export const JEV_MODEL = 'jev-1.13.0';

export async function askJev({ state, questions }, { key = process.env.TYPESAFE_API_KEY, model = JEV_MODEL, timeoutMs = 1500, fetchImpl = fetch } = {}) {
  if (!key) throw new Error('jev: TYPESAFE_API_KEY is not set in portal/.env');
  const res = await fetchImpl(JEV_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, state, questions }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    // The error body's shape is not documented, so only its text is read, and only for the message.
    const text = await res.text().catch(() => '');
    const detail = text ? ` — ${text.slice(0, 200)}` : '';
    throw new Error(`jev: ${res.status} from ${JEV_URL}${detail}`);
  }
  const body = await res.json();
  if (body?.model !== model) throw new Error(`jev: asked for ${model}, answered by ${body?.model}`);
  return body;
}
