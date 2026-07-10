// Research chat — Claude Agent SDK behind an SSE stream. V1 scope (strategy §13):
// research/enrichment + kb Q&A. Writes are fenced to _factory/kb/ via canUseTool.
import { query } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { JOBS_DIR, KB_DIR, PORTAL_DIR } from './env.mjs';

const SESSIONS_FILE = path.join(PORTAL_DIR, '.sessions.json');
const sessions = (() => { try { return JSON.parse(readFileSync(SESSIONS_FILE, 'utf8')); } catch { return {}; } })();
const saveSessions = () => writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));

const SYSTEM = `You are the research assistant inside the ux-factory portal — Linards Bērziņš's
private job-application workbench. Scope (V1): research and enrichment + knowledge-base Q&A.
You do NOT build prototypes, letters, or sites here — that is the /ux-factory pipeline's job.

What you do well:
- Hunt a company's design system online (open DS, storybooks, brand pages, design blogs,
  their design-system job listings — the Depot method) and summarise principles, tokens, type.
- Enrich an intake card: industry, products/services they sell, competitors, recent design news.
- Answer questions across the kb (_factory/kb/): past decisions, outcomes, facts, retros.

Writing findings (the card must gain what you learn):
- Full findings → _factory/kb/companies/<slug>/research-<topic>.md (create it).
- Then append ONE dated pointer line under the "## Research" heading in that company's
  intake.md, e.g. "- 2026-07-10 · design system: see research-design-system.md — 5 principles, DTCG tokens found".
  A research task is NOT done until this line is in intake.md — it is what the portal card
  shows. Replace the placeholder line if it is still there. Do this before your final reply.
- Never edit anything outside _factory/kb/. Never invent facts — every claim needs a source URL.
- British English. Concise, decision-based notes — findings and sources, no theory essays.`;

export async function streamChat({ slug, message }, res) {
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const key = slug || '_global';
  const context = slug
    ? `\n\n[Context: the active card is "${slug}" — its record is _factory/kb/companies/${slug}/intake.md; cached pages in cache/.]`
    : '';

  const q = query({
    prompt: message + context,
    options: {
      cwd: JOBS_DIR,
      model: 'claude-sonnet-5',
      maxTurns: 40,
      resume: sessions[key],
      systemPrompt: SYSTEM,
      allowedTools: ['WebSearch', 'WebFetch', 'Read', 'Grep', 'Glob'],
      canUseTool: async (tool, input) => {
        if (tool === 'Write' || tool === 'Edit') {
          const target = path.resolve(JOBS_DIR, input.file_path || '');
          if (target.startsWith(KB_DIR + path.sep)) return { behavior: 'allow', updatedInput: input };
          return { behavior: 'deny', message: 'Portal chat may only write inside _factory/kb/.' };
        }
        return { behavior: 'deny', message: `${tool} is outside the portal chat's V1 scope.` };
      },
    },
  });

  res.on('close', () => q.interrupt?.().catch(() => {}));

  try {
    for await (const msg of q) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        sessions[key] = msg.session_id;
        saveSessions();
        send({ type: 'init', sessionId: msg.session_id });
      } else if (msg.type === 'assistant') {
        for (const block of msg.message?.content || []) {
          if (block.type === 'text' && block.text) send({ type: 'text', text: block.text });
          if (block.type === 'tool_use') {
            const hint = block.input?.query || block.input?.url || block.input?.file_path || block.input?.pattern || '';
            send({ type: 'tool', name: block.name, hint: String(hint).slice(0, 120) });
          }
        }
      } else if (msg.type === 'result') {
        send({ type: 'done', ok: msg.subtype === 'success' });
      }
    }
  } catch (e) {
    send({ type: 'error', message: e.message });
  }
  res.end();
}
