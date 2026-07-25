// portal/lib/figma.mjs — the portal's Figma import: a dropped export → system/tokens.<slug>.css.
// Plan: .claude/plans/figma-drop-portal-ui.md (§3 "the portal is Node; it imports and calls it").
// No engine of its own — runPull() in tooling/figma/figma-pull.mjs does the reading, ramp
// classification, contrast negotiation and the write. This module owns three things the CLI never
// needed: a slug that cannot escape system/ or clobber a generated file, a persisted export the
// pack header can honestly name, and one return shape for BOTH outcomes — a pack, or the
// refusal-with-candidates the drawer turns into swatches.
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { dirname, join, relative } from 'node:path';
import { REPO_DIR } from './env.mjs';
import { runPull } from '../../tooling/figma/figma-pull.mjs';

// Chosen, not measured: figma-read's own parse ceiling is 128 MB, a real API page here was 2.7 MB,
// and a Tokens Studio export of a large kit is plausibly single-digit MB. Comfortably above any
// believable export, far below the parse ceiling. Mirrored in portal/public/portal.js so the
// browser can refuse early and name the same number — if it moves, move both.
export const MAX_EXPORT_BYTES = 32 * 1024 * 1024;
const MB = MAX_EXPORT_BYTES / 1024 / 1024;

// The slug names a file inside system/. Anything that isn't a plain lowercase name could escape
// that directory, and the packs there include generated files (contract, neutral) and committed
// reference work that a POST must never be able to overwrite. This guard is the ONLY thing
// standing between a request body and system/tokens.<anything>.css.
const RESERVED = new Set(['contract', 'neutral', 'source', 'verdant', 'saulera', 'plusui']);
const SLUG_RE = /^[a-z0-9-]{1,40}$/;

export function assertSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug))
    throw new Error(`figma import: "${slug ?? ''}" is not a usable pack slug — lowercase letters, digits and hyphens only, 1–40 characters (it names system/tokens.<slug>.css)`);
  if (RESERVED.has(slug))
    throw new Error(`figma import: "${slug}" is a reserved pack name — system/tokens.${slug}.css is generated or committed reference work and is never overwritten by an import`);
  return slug;
}

export const exportPathFor = (slug) => join(REPO_DIR, 'tooling/figma/exports', `${slug}.json`);

// Stream the dropped export to disk before anything parses it: the pack header names this file as
// the run's source, so it has to be a real, stable path. Streaming is what keeps the HTTP layer
// out of it — no second copy buffered in memory, no JSON re-encode, and the shared readBody's
// 1 MB cap stays exactly where it is for every other route. (readFigma still parses the file
// itself; this is not a claim about that.)
export async function receiveExport(req, slug) {
  assertSlug(slug);
  const path = exportPathFor(slug);
  mkdirSync(dirname(path), { recursive: true });

  // Refuse on the declared size before a single byte is written, where the client declares one.
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_EXPORT_BYTES)
    throw new Error(`figma import: export is ${(declared / 1024 / 1024).toFixed(1)} MB, over the ${MB} MB cap — a token export should be far smaller; this looks like the wrong file`);

  let bytes = 0;
  const count = async function* (source) {
    for await (const chunk of source) {
      bytes += chunk.length;
      if (bytes > MAX_EXPORT_BYTES) {
        // Destroying the request is what makes the pipeline promise REJECT. Throwing from a bare
        // 'data' handler does not: it leaves a hung socket and a partial file on disk, which is
        // "refuses a large file, badly" wearing a different hat.
        req.destroy(new Error(`figma import: export exceeds the ${MB} MB cap`));
        return;
      }
      yield chunk;
    }
  };

  try {
    await pipeline(req, count, createWriteStream(path));
    // A truncated write must never survive as a source the pack header could name.
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    if (!parsed || typeof parsed !== 'object')
      throw new Error(`${relative(REPO_DIR, path)}: an export must be a JSON object of names → values`);
  } catch (e) {
    rmSync(path, { force: true });
    // readFigma's own parse error would not name the file, and by then the file is gone.
    throw e instanceof SyntaxError
      ? new Error(`figma import: ${relative(REPO_DIR, path)} is not valid JSON — ${e.message}`)
      : e;
  }
  return { path, bytes };
}

// One shape for both outcomes. A refusal is an OUTCOME, not a fault: the tool declined to guess
// and the caller can ask. Only real faults are left to server.mjs's catch-all.
export async function runFigmaPull({ slug, accent = null, neutral = null }) {
  assertSlug(slug);
  const from = exportPathFor(slug);
  if (!existsSync(from))
    throw new Error(`figma import: no export on disk for "${slug}" — expected ${relative(REPO_DIR, from)}; drop the file again`);
  try {
    // Absolute, because readFigma resolves `from` against process.cwd(), which is portal/ when the
    // server is started by `npm start`. The header's repo-relative fix is what keeps that honest.
    const result = await runPull({ slug, accent, neutral, from });
    return {
      ok: true,
      pack: { ...result, dest: relative(REPO_DIR, result.dest), exportPath: relative(REPO_DIR, from) },
    };
  } catch (e) {
    if (e.candidates) return { ok: false, needs: 'accent', candidates: e.candidates, message: e.message };
    throw e;
  }
}
