// ux-factory portal — local-first workbench (strategy §13, RUNBOOK P11).
// Zero-dep HTTP core; the Claude Agent SDK powers /api/chat only.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { PORT, REPO_DIR, JOBS_DIR, PORTAL_DIR, HAS_TOKEN } from './lib/env.mjs';
import { listCards, cardFor } from './lib/kb.mjs';
import { createIntake } from './lib/intake.mjs';
import { streamChat } from './lib/chat.mjs';

const PUBLIC_DIR = path.join(PORTAL_DIR, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

function serveFile(res, base, rel) {
  const target = path.resolve(base, '.' + path.posix.normalize('/' + rel));
  if (!target.startsWith(base + path.sep) && target !== base) return notFound(res);
  let file = target;
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) return notFound(res);
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}

const json = (res, code, obj) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
};
const notFound = (res) => json(res, 404, { error: 'not found' });

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) reject(new Error('body too large')); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    // --- API ---
    if (p === '/api/health') return json(res, 200, { ok: true, hasToken: HAS_TOKEN, jobsDir: JOBS_DIR, cards: listCards().length });
    if (p === '/api/cards' && req.method === 'GET') return json(res, 200, listCards());
    const cardMatch = p.match(/^\/api\/cards\/([a-z0-9-]+)$/);
    if (cardMatch && req.method === 'GET') {
      const card = cardFor(cardMatch[1], { full: true });
      return card ? json(res, 200, card) : notFound(res);
    }
    if (p === '/api/intake' && req.method === 'POST') {
      const body = await readBody(req);
      const result = await createIntake(body);
      return json(res, 200, result);
    }
    if (p === '/api/chat' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.message) return json(res, 400, { error: 'message required' });
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      return streamChat(body, res);
    }

    // --- embedded site previews: /sites/<slug>/... → the card's site_root on disk ---
    const siteMatch = p.match(/^\/sites\/([a-z0-9-]+)(\/.*)?$/);
    if (siteMatch) {
      const card = cardFor(siteMatch[1]);
      if (!card?.site_root) return notFound(res);
      return serveFile(res, path.resolve(JOBS_DIR, card.site_root), siteMatch[2] || '/index.html');
    }

    // --- system/assets straight from the repo (contract + neutral pack + components) ---
    if (p.startsWith('/system/') || p.startsWith('/assets/')) return serveFile(res, REPO_DIR, p);

    // --- portal UI ---
    return serveFile(res, PUBLIC_DIR, p === '/' ? '/index.html' : p);
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`ux-factory portal → http://localhost:${PORT}`);
  console.log(`kb: ${JOBS_DIR}`);
  console.log(`chat auth: ${HAS_TOKEN ? 'token from .env' : 'no token — falling back to the CLI login on this Mac'}`);
});
