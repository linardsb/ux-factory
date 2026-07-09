// _headers — Cloudflare Pages. Spec: _factory/agent-layer.md §6.
// Per-company sites get X-Robots-Tag: noindex; the hub does not. Sensible asset caching either way.
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseLedger } from "./lib.mjs";

export function genHeaders({ meta }) {
  const noindex = meta.per_company ? "\n  X-Robots-Tag: noindex" : "";
  const body = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()${noindex}

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/system/*
  Cache-Control: public, max-age=300, must-revalidate

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;
  const dest = join(resolve(meta.site_root), "_headers");
  writeFileSync(dest, body);
  return { dest, noindex: !!meta.per_company };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = genHeaders(parseLedger(process.argv[2] || "_factory/kb/decisions/trainline.md"));
  console.log(`_headers        ✓  noindex=${r.noindex} → ${r.dest}`);
}
