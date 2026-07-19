// tooling/round-trip/probe-vision.mjs — Phase 0 de-risk (epic #38, ticket #40).
// The cheapest thing that can invalidate the derivation design: does the Agent SDK's `Read`
// tool return USABLE image blocks (so a recorded run can actually SEE screenshots)? A bare
// query() reads one committed PNG and describes it; if the agent produces a real description,
// Read-based vision is viable. If not → pivot the recorder to prompt-embedded images (plan
// AMENDMENTS). Pennies (maxTurns 4). Standalone, run from anywhere:
//   node tooling/round-trip/probe-vision.mjs [image.png]
// Auth: portal/.env CLAUDE_CODE_OAUTH_TOKEN, else the Claude CLI login on this Mac.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const PORTAL = join(REPO, 'portal');

// Resolve the Agent SDK from portal/node_modules regardless of this file's location / cwd
// (the SDK is the portal's dependency; this file lives under tooling/).
function resolveSdk() {
  const pkgDir = join(PORTAL, 'node_modules', '@anthropic-ai', 'claude-agent-sdk');
  if (!existsSync(pkgDir)) throw new Error(`${pkgDir} is missing — install portal deps first: cd portal && npm ci`);
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  const exp = pkg.exports && pkg.exports['.'];
  let entryRel;
  if (typeof exp === 'string') entryRel = exp;
  else if (exp && typeof exp === 'object') entryRel = exp.import || exp.default || (exp.node && (exp.node.import || exp.node.default));
  entryRel = entryRel || pkg.module || pkg.main || 'index.js';
  return pathToFileURL(join(pkgDir, entryRel)).href;
}

// Default probe image: a committed Verdant proto baseline (a real branded UI); fall back to any
// committed baseline so the probe still runs before Phase 3's own capture exists.
function defaultImage() {
  const cands = [
    join(REPO, 'tooling/visual-regression/baselines/proto-verdant-neutral.png'),
    join(REPO, 'tooling/visual-regression/baselines/index-neutral.png'),
  ];
  return cands.find(existsSync) || cands[0];
}

const IMG = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : defaultImage();
if (!existsSync(IMG)) throw new Error(`probe image not found: ${IMG} — pass a PNG path as arg 1`);

const { query } = await import(resolveSdk());

const prompt = `Read the image file at ${IMG}. In ONE sentence, describe what UI it shows and name ` +
  `its dominant accent colour (approx hex). If you did NOT actually receive image pixels, reply ` +
  `EXACTLY: NO IMAGE RECEIVED.`;

let sawRead = false;
let imageInResult = false;
let text = '';
const q = query({ prompt, options: { cwd: REPO, model: 'claude-sonnet-5', maxTurns: 4, allowedTools: ['Read'] } });
for await (const msg of q) {
  if (msg.type === 'assistant') {
    for (const b of msg.message?.content || []) {
      if (b.type === 'text' && b.text) text += b.text;
      if (b.type === 'tool_use' && b.name === 'Read') sawRead = true;
    }
  } else if (msg.type === 'user') {
    for (const b of msg.message?.content || []) {
      const c = b?.content;
      if (Array.isArray(c) && c.some((x) => x?.type === 'image' || x?.source?.data != null)) imageInResult = true;
    }
  }
}

console.log('--- probe-vision ---');
console.log('image        :', IMG);
console.log('Read used    :', sawRead);
console.log('image block  :', imageInResult, '(saw an image block in the Read tool_result)');
console.log('agent said   :', text.trim().slice(0, 400) || '(no text)');
const usable = sawRead && text.trim().length > 0 && !/NO IMAGE RECEIVED/i.test(text);
console.log(usable
  ? '\n✓ Read-based vision appears USABLE — the recorded run can see screenshots.'
  : '\n✗ Read-based vision NOT confirmed — pivot to prompt-embedded images (record recorder change in plan AMENDMENTS).');
process.exit(usable ? 0 : 1);
