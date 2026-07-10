// Intake: fetch + cache the JD/DS pages, write companies/<slug>/intake.md.
// The factory session (P7 "Intake:" variant) reads the same JSON head.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { COMPANIES_DIR } from './env.mjs';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function fetchPage(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) ux-factory-portal/0.1 (local intake)' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.text();
}

const htmlToText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }[m]))
    .replace(/\s+/g, ' ')
    .trim();

export async function createIntake({ company, role = '', industry = '', tier = 'standard', jdUrl = '', dsUrls = [], notes = '' }) {
  if (!company) throw new Error('company is required');
  const slug = slugify(company);
  const dir = path.join(COMPANIES_DIR, slug);
  if (existsSync(path.join(dir, 'intake.md'))) throw new Error(`intake for "${slug}" already exists`);
  const cacheDir = path.join(dir, 'cache');
  mkdirSync(cacheDir, { recursive: true });

  const fetched = [];
  let jdText = '';
  if (jdUrl) {
    try {
      const html = await fetchPage(jdUrl);
      writeFileSync(path.join(cacheDir, 'jd.html'), html);
      jdText = htmlToText(html).slice(0, 4000);
      fetched.push('jd.html');
    } catch (e) {
      fetched.push(`jd: FAILED (${e.message})`);
    }
  }
  for (const [i, url] of dsUrls.entries()) {
    try {
      const html = await fetchPage(url);
      writeFileSync(path.join(cacheDir, `ds-${i + 1}.html`), html);
      fetched.push(`ds-${i + 1}.html`);
    } catch (e) {
      fetched.push(`ds-${i + 1}: FAILED (${e.message})`);
    }
  }

  const meta = {
    company, slug, role, industry, tier,
    state: 'intake',
    jd_url: jdUrl, ds_urls: dsUrls,
    site_root: '', deploy_url: '',
    created: new Date().toISOString().slice(0, 10),
  };

  const md = `# ${company} — intake record

Created by the portal (RUNBOOK P11). The portal card renders from this file; the factory
session (P7 \`Intake:\` variant) reads the same JSON head. Page snapshots live in \`cache/\`
(${fetched.length ? fetched.join(', ') : 'nothing fetched'}).

\`\`\`json
${JSON.stringify(meta, null, 2)}
\`\`\`

## JD text (excerpt)

${jdText || '(no JD URL given or fetch failed — paste the JD here or rely on cache/jd.html)'}

## Research

(chat findings land here as dated pointer lines; full notes in research-*.md beside this file)

## Notes

${notes || '—'}
`;
  writeFileSync(path.join(dir, 'intake.md'), md);
  return { slug, fetched };
}
