// Paths + .env loader (no dotenv dep). Portal lives at ux-factory/portal/;
// the jobs folder (kb + company folders) is a sibling of the repo.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PORTAL_DIR = path.resolve(HERE, '..');
export const REPO_DIR = path.resolve(PORTAL_DIR, '..');

const envFile = path.join(PORTAL_DIR, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
// A left-behind placeholder is the same as no token.
if (/PASTE-YOUR-TOKEN/i.test(process.env.CLAUDE_CODE_OAUTH_TOKEN || '')) {
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
}

export const JOBS_DIR = process.env.JOBS_DIR || path.resolve(REPO_DIR, '..', 'Linards jobs folder');
export const KB_DIR = path.join(JOBS_DIR, '_factory', 'kb');
export const COMPANIES_DIR = path.join(KB_DIR, 'companies');
export const PORT = Number(process.env.PORT || 4747);
export const HAS_TOKEN = Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN);
