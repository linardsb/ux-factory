// tooling/visual-regression/serve.mjs — CI visual-regression gate (epic #1, ticket #9, gate 3/3).
// Zero-dep static server rooting the REPO ROOT so shipped pages resolve their root-absolute
// /system/… and /assets/… paths. Mirrors portal/server.mjs:11–27 (MIME map + serveFile traversal
// guard); launched by Playwright's webServer. Never a shipped-page dependency.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); // repo root
const PORT = Number(process.env.PORT || 4757);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

function serveFile(res, base, rel) {
  const target = path.resolve(base, '.' + path.posix.normalize('/' + rel));
  if (!target.startsWith(base + path.sep) && target !== base) { res.writeHead(404); return res.end('not found'); }
  let file = target;
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}

createServer((req, res) => {
  const p = new URL(req.url, 'http://127.0.0.1').pathname;
  serveFile(res, ROOT, p === '/' ? '/index.html' : p);
}).listen(PORT, '127.0.0.1', () => console.log(`visual-regression static server → http://127.0.0.1:${PORT} (root ${ROOT})`));
