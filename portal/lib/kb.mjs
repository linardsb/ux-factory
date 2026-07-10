// Card aggregation — the kb IS the database; a card is a projection over
// companies/<slug>/intake.md + decisions/<slug>.md + outcomes.md + the company folder.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { JOBS_DIR, KB_DIR, COMPANIES_DIR } from './env.mjs';

const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };

export function parseFencedJson(md) {
  const m = (md || '').match(/```json\s*\n([\s\S]*?)\n```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function section(md, title) {
  const re = new RegExp(`^## ${title}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`, 'm');
  const m = (md || '').match(re);
  return m ? m[1].trim() : '';
}

function parseDecisions(slug) {
  const md = read(path.join(KB_DIR, 'decisions', `${slug}.md`));
  if (!md) return null;
  const meta = parseFencedJson(md) || {};
  const items = [...md.matchAll(/^## (d-\d+) · ([^·\n]+) · (.+)$/gm)]
    .map(([, id, prototype, title]) => ({ id, prototype: prototype.trim(), title: title.trim() }));
  return { site: meta.site || null, flagship: meta.flagship || null, count: items.length, items };
}

function parseOutcomes(company) {
  const md = read(path.join(KB_DIR, 'outcomes.md'));
  if (!md) return [];
  const rows = [];
  for (const line of md.split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length >= 8 && cells[1].toLowerCase() === company.toLowerCase()) {
      const [, , role, tier, sent, artifacts, status, notes] = cells;
      if (role === 'Role' || /^-+$/.test(role)) continue;
      rows.push({ role, tier, sent, artifacts, status, notes });
    }
  }
  return rows;
}

function scanArtifacts(slug) {
  // md artifacts in the company's working folder (case-insensitive dir match)
  const dir = findCompanyDir(slug);
  if (!dir) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') || f.endsWith('.html'))
    .map((f) => ({ name: f, rel: path.join(path.basename(dir), f) }));
}

export function findCompanyDir(slug) {
  for (const entry of readdirSync(JOBS_DIR)) {
    if (entry.toLowerCase() === slug.toLowerCase()) {
      const p = path.join(JOBS_DIR, entry);
      if (statSync(p).isDirectory()) return p;
    }
  }
  return null;
}

function scanPrototypes(siteRoot) {
  // top-level *.html (minus 404) + one-level subdir *.html — served for iframes
  if (!siteRoot) return [];
  const root = path.join(JOBS_DIR, siteRoot);
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root)) {
    const p = path.join(root, entry);
    if (entry.endsWith('.html') && entry !== '404.html') out.push({ name: entry.replace(/\.html$/, ''), rel: entry });
    else if (statSync(p).isDirectory() && !['system', 'assets', 'fonts', 'cache'].includes(entry)) {
      for (const f of readdirSync(p)) {
        if (f.endsWith('.html')) out.push({ name: `${entry}/${f.replace(/\.html$/, '')}`, rel: `${entry}/${f}` });
      }
    }
  }
  return out;
}

export function listCards() {
  if (!existsSync(COMPANIES_DIR)) return [];
  return readdirSync(COMPANIES_DIR)
    .filter((d) => existsSync(path.join(COMPANIES_DIR, d, 'intake.md')))
    .map((d) => cardFor(d))
    .filter(Boolean)
    .sort((a, b) => (b.created || '').localeCompare(a.created || ''));
}

export function cardFor(slug, { full = false } = {}) {
  const md = read(path.join(COMPANIES_DIR, slug, 'intake.md'));
  if (!md) return null;
  const meta = parseFencedJson(md) || {};
  const decisions = parseDecisions(slug);
  const card = {
    slug,
    company: meta.company || slug,
    role: meta.role || '',
    industry: meta.industry || '',
    tier: meta.tier || 'standard',
    state: meta.state || 'intake',
    historical: Boolean(meta.historical),
    jd_url: meta.jd_url || '',
    ds_urls: meta.ds_urls || [],
    deploy_url: meta.deploy_url || '',
    site_root: meta.site_root || '',
    created: meta.created || '',
    decisions: decisions ? { count: decisions.count, flagship: decisions.flagship } : null,
    outcomes: parseOutcomes(meta.company || slug),
    prototypes: scanPrototypes(meta.site_root),
  };
  if (full) {
    card.decisionsFull = decisions;
    card.artifacts = scanArtifacts(slug);
    card.jd_excerpt = section(md, 'JD text');
    card.research = section(md, 'Research');
    card.notes = section(md, 'Notes');
    const cacheDir = path.join(COMPANIES_DIR, slug, 'cache');
    card.cache = existsSync(cacheDir) ? readdirSync(cacheDir) : [];
  }
  return card;
}
