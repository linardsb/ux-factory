// ux-factory portal — local-first workbench (strategy §13, RUNBOOK P11).
// Zero-dep HTTP core; the Claude Agent SDK powers /api/chat and /api/build/run (#140) — and in
// both cases it is reached through a lib module, never from here.
import { createServer } from 'node:http';
import { appendFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { PORT, REPO_DIR, JOBS_DIR, PORTAL_DIR, HAS_TOKEN } from './lib/env.mjs';
import { allowedOrigins, originAllowed } from './lib/origin.mjs';
import { listCards, cardFor } from './lib/kb.mjs';
import { createIntake } from './lib/intake.mjs';
import { streamChat } from './lib/chat.mjs';
import { receiveExport, runFigmaPull } from './lib/figma.mjs';
import { draftRun, listScenarios, QUESTION_INPUTS, runBuild, stepEvent } from './lib/builder.mjs';
// #284's discovery session. Every export here is SDK-free; the SDK is reached only by runTurn's lazy
// import of ./lib/discovery-transport.mjs, after every guard — see portal/lib/discovery.mjs's header.
import { assertProvenanceRoot, closeSession, discoveryConfig, openSession, resolveRunRoot, runTurn, sessionView, turnEvent, withDiscoveryRunLock } from './lib/discovery.mjs';
import { ACTS, DEFAULT_ANSWERS, QUADRANT_MEANINGS, QUESTIONS, SUMMARY_TERM } from '../system/build-questions.mjs';
// The PRD fold (#290). Pure — no clock, no network, no SDK — and it WRITES NOTHING here: the route
// below calls projectPrd over readPackage and streams the bytes, never writePrd. See #338 F1.
import { projectPrd, readPackage } from '../discovery/prd-projection.mjs';
// The proposal half (#359). Pure, and every SDK reach is behind the propose route's lazy import of
// ./lib/discovery-proposer.mjs, after every guard — the shape runTurn already uses. `proposalsView` is
// the exported WHITELIST the routes serve, so no route below holds a shape opinion of its own.
import { checkProposalLines, projectProposals, proposalsView, readProposalPackage, VERDICTS, writeProposalsMd } from '../discovery/proposals.mjs';
// Which commit this process booted from, against where the tree is now (#338 F2).
import { BOOT_SHA, headSha, isStale } from './lib/version.mjs';

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
    // Before ANY routing, and for every method rather than a list of the state-changing ones: a
    // same-origin fetch GET sends no Origin at all, so this is a no-op on the portal's own reads,
    // and a method whitelist is one more thing to remember when a route is added. Why it exists
    // and why it accepts two origins → portal/lib/origin.mjs. Returned before readBody, which is
    // what keeps a hostile POST from spending a token or streaming a file to disk.
    if (!originAllowed(req.headers.origin, PORT))
      return json(res, 403, { error: `cross-origin request refused — the portal answers ${allowedOrigins(PORT).join(' and ')} only` });

    // --- API ---
    // bootSha is read at IMPORT and headSha on every call, so `stale` answers the question run 0's
    // Phase A had to answer with `ps` and a git log: is this process running the code in the tree?
    // (#338 F2 — a portal served pre-review code for two days and nothing surfaced it.)
    if (p === '/api/health') {
      const head = headSha();
      return json(res, 200, {
        ok: true, hasToken: HAS_TOKEN, jobsDir: JOBS_DIR, cards: listCards().length,
        bootSha: BOOT_SHA, headSha: head, stale: isStale(BOOT_SHA, head),
      });
    }
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
    // One route, two modes. A raw JSON body is a NEW export — streamed straight to disk by
    // receiveExport, never buffered, so the shared readBody's 1 MB cap stays where it is for every
    // other route. `x-figma-retry` re-runs off the export already on disk, which is how a
    // candidate swatch answers an ambiguous-ramp refusal without re-uploading the file.
    if (p === '/api/figma/pull' && req.method === 'POST') {
      const slug = url.searchParams.get('slug');
      const accent = url.searchParams.get('accent') || null;
      const neutral = url.searchParams.get('neutral') || null;
      if (req.headers['x-figma-retry'] === '1') req.resume(); // nothing to read; don't stall the socket
      else await receiveExport(req, slug);
      return json(res, 200, await runFigmaPull({ slug, accent, neutral }));
    }
    // --- the operator path: /build's ten answers brief a real composition run (#140) ---
    // ONE route serves the SHIPPED question config, so the drawer cannot fork it — a second copy of
    // the ten questions, their reasoning or the quadrant meanings is exactly the drift
    // build-questions.mjs:283-313 already warns about.
    if (p === '/api/build/config' && req.method === 'GET') {
      return json(res, 200, {
        questions: QUESTIONS, acts: ACTS, defaults: DEFAULT_ANSWERS, summaryTerms: SUMMARY_TERM,
        quadrantMeanings: QUADRANT_MEANINGS, questionInputs: QUESTION_INPUTS,
        scenarios: listScenarios(), hasToken: HAS_TOKEN,
      });
    }
    // Pure and instant: the three committed rules over the ten answers. Spends nothing.
    if (p === '/api/build/draft' && req.method === 'POST') {
      return json(res, 200, draftRun(await readBody(req)));
    }
    if (p === '/api/build/run' && req.method === 'POST') {
      const body = await readBody(req);
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      // A closed socket stops the WRITES, not the run. Unlike /api/chat there is no interrupt
      // handle here — runComposition owns its query internally — and that is the right outcome
      // anyway: the tokens are already spent, so the run should finish and keep its artifacts.
      // withRunLock releases through its finally either way, so a disconnect cannot wedge the next.
      let open = true;
      res.on('close', () => { open = false; });
      const send = (o) => { if (open && !res.writableEnded) res.write(`data: ${JSON.stringify(o)}\n\n`); };
      try {
        // EVERY PARAMETER NAMED, never `{ ...body }`. A spread makes each of runBuild's parameters
        // — including any added later — settable by whatever JSON reached this socket, and this is
        // a route a cross-origin page can POST to (readBody JSON.parses regardless of
        // content-type, so a text/plain POST is a simple request: no preflight, opaque response,
        // side effect delivered). runOptions is the other half and the provable one: `force` is
        // not a parameter there at all, so the runner's overwrite path is unreachable from HTTP
        // even if this list drifts. Whitelist, never blacklist — the same reasoning stepEvent
        // applies one module over. The origin guard at the top of this handler now refuses that
        // POST outright (#157), portal-wide; this list is the second line, not the only one.
        //
        // stepEvent is builder.mjs's exported whitelist and this route holds NO shape opinion of
        // its own: a projection written inline here is one build-checks group 8 cannot reach, and
        // it would drift from the one group 8 does check. It returns null for the meta and result
        // lines (the meta carries an absolute home-dir cwd), so the send is skipped for those.
        const result = await runBuild({
          scenario: body.scenario, answers: body.answers, question: body.question,
          slot: body.slot, slug: body.slug, dry: body.dry,
          onStep: (line) => { const ev = stepEvent(line); if (ev) send(ev); },
        });
        send({ type: 'done', result });
      } catch (e) {
        // Not the catch-all's { error } body: SSE headers are already written, so a refusal is an
        // event on the stream.
        send({ type: 'error', message: e.message });
      }
      return res.end();
    }
    // --- the discovery session: one banked question, one op, one run package (#284) ---
    // ONE route serves the bank, the depths, the postures and the op vocabulary, so the drawer cannot
    // fork any of them. What it does NOT serve is each question's weak-answer note: that is the agent's
    // rubric, and showing it beside the question would tell the person the answer. discoveryConfig()
    // strips it, so the browser cannot receive it at all rather than being trusted not to render it.
    if (p === '/api/discovery/config' && req.method === 'GET') return json(res, 200, discoveryConfig());

    // Open or RESUME. Disk is authoritative: an existing run.json comes back untouched with its
    // answers, its transcript and the derived cursor, which is what makes a page reload and a server
    // restart lose nothing (AC #5). EVERY PARAMETER NAMED — see /api/build/run's comment below for why
    // a spread is the wrong shape on a route a cross-origin page can POST to.
    if (p === '/api/discovery/session' && req.method === 'POST') {
      const b = await readBody(req);
      return json(res, 200, openSession({
        slug: b.slug, provenance: b.provenance, entryMode: b.entryMode, depth: b.depth,
        branch: b.branch ?? null, frontEnd: b.frontEnd, posture: b.posture,
        // The read fence's per-run input (#287): what this run may read beyond its package and the
        // bank. The drawer sends none yet (#286 will, for an existing PRD); refused by name if junk.
        reads: b.reads ?? [],
      }));
    }
    // Read-only: the package as it stands. The drawer re-fetches this after a turn so the cursor and
    // the recorded turns come from disk rather than from a second client-side copy.
    if (p === '/api/discovery/session' && req.method === 'GET') {
      const slug = url.searchParams.get('slug');
      const provenance = url.searchParams.get('provenance');
      // The same pair openSession and runTurn run: a route copied from this shape keeps the refusal.
      const root = resolveRunRoot({ provenance, slug });
      assertProvenanceRoot(provenance, root);
      return json(res, 200, sessionView(root));
    }
    // Ends the session so endedAt lands. Its own route rather than a flag on the turn, because a
    // session is finished deliberately, not as a side effect of the last answer.
    if (p === '/api/discovery/close' && req.method === 'POST') {
      const b = await readBody(req);
      const root = resolveRunRoot({ provenance: b.provenance, slug: b.slug });
      assertProvenanceRoot(b.provenance, root);
      return json(res, 200, closeSession(root));
    }
    // The PRD, in the UI (#338 F1). #290 shipped the fold CLI-only, so an operator who never opens a
    // terminal — the epic's secondary user, an invited guest — could run the whole session and never
    // get the artifact it exists to produce. READ-ONLY BY CONSTRUCTION: projectPrd over readPackage
    // returns a string, and writePrd is deliberately not imported here, so no request can write into
    // a run package. The same resolveRunRoot + assertProvenanceRoot pair every other discovery route
    // runs guards it, so a `real` root is refused the same way and is never written to either.
    // Content-disposition carries the slug, which assertRunSlug has already restricted to
    // [a-z0-9-]{1,48} — there is no route to a header injection through it.
    if (p === '/api/discovery/prd' && req.method === 'GET') {
      const slug = url.searchParams.get('slug');
      const provenance = url.searchParams.get('provenance');
      const root = resolveRunRoot({ provenance, slug });
      assertProvenanceRoot(provenance, root);
      const md = projectPrd(readPackage(root));
      res.writeHead(200, {
        'content-type': 'text/markdown; charset=utf-8',
        'content-disposition': `attachment; filename="${slug}-prd.md"`,
      });
      return res.end(md);
    }
    // The proposals a finished package carries, and the decisions they may rest on (#359). READ-ONLY:
    // proposalsView is pure over a read package and this route writes nothing. The same
    // resolveRunRoot + assertProvenanceRoot pair every other discovery route runs guards it, so a
    // `real` root is refused identically.
    if (p === '/api/discovery/proposals' && req.method === 'GET') {
      const slug = url.searchParams.get('slug');
      const provenance = url.searchParams.get('provenance');
      const root = resolveRunRoot({ provenance, slug });
      assertProvenanceRoot(provenance, root);
      return json(res, 200, proposalsView(readProposalPackage(root)));
    }
    // The proposals.md page, for the same reason the PRD route exists (#338 F1): an operator who never
    // opens a terminal must still get the artefact. Read-only — projectProposals returns a string, and
    // writeProposalsMd is reached only by the verdict route below.
    if (p === '/api/discovery/proposals.md' && req.method === 'GET') {
      const slug = url.searchParams.get('slug');
      const provenance = url.searchParams.get('provenance');
      const root = resolveRunRoot({ provenance, slug });
      assertProvenanceRoot(provenance, root);
      const md = projectProposals(readProposalPackage(root));
      res.writeHead(200, {
        'content-type': 'text/markdown; charset=utf-8',
        'content-disposition': `attachment; filename="${slug}-proposals.md"`,
      });
      return res.end(md);
    }
    // ONE fenced proposal run over a FINISHED package. It writes proposals.jsonl and proposals.md and
    // NOTHING ELSE in the package — run.json, answers.jsonl and transcript.jsonl are untouched, which
    // is what keeps prd.md byte-identical across a proposal run (#359 AC #4). SSE, mirroring
    // /api/discovery/turn: a refusal after the headers are written is an event on the stream.
    if (p === '/api/discovery/propose' && req.method === 'POST') {
      const body = await readBody(req);
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      let open = true;
      res.on('close', () => { open = false; });
      const send = (o) => { if (open && !res.writableEnded) res.write(`data: ${JSON.stringify(o)}\n\n`); };
      try {
        // EVERY PARAMETER NAMED, never `{ ...body }` — the rule /api/discovery/turn's comment states.
        const slug = body.slug;
        const provenance = body.provenance;
        const root = resolveRunRoot({ provenance, slug });
        assertProvenanceRoot(provenance, root);
        const pkg = readProposalPackage(root);
        // A FINISHED package, refused by name if it is still open: proposing from a run that is still
        // being answered would rest on a ledger the next turn can still supersede.
        if (!pkg.run.endedAt) throw new Error(`run "${slug}" is still open — close the session first. A proposal rests on a FINISHED ledger, because the next turn can still supersede a decision it named`);
        // A PACKAGE GETS ONE PROPOSAL RUN, and there is no override. proposals.jsonl is append-only,
        // and `model` and `fingerprint` are the same two constants on every line, so a second run's
        // proposals would interleave with the first's and nothing on the page could tell them apart.
        // A bad run is fixed the way a bad trace is: DISCARD the file (`git checkout` it, or delete
        // it) and re-run — never by editing it, and never by appending a second run beside it.
        if (pkg.proposals.length) throw new Error(`run "${slug}" already carries ${pkg.proposals.length} proposal line(s), and a package gets ONE proposal run. proposals.jsonl is append-only and every line carries the same model and fingerprint, so a second run would interleave with the first with nothing on the page to tell them apart — discard proposals.jsonl and re-run if the run was bad`);
        // The run lock, for the reason runTurn takes it: two concurrent runs would append to the same
        // append-only file, and the tokens are spent either way.
        const out = await withDiscoveryRunLock(async () => {
          // THE SDK ENTERS HERE and nowhere earlier — after every guard above has passed.
          const { runProposalRun } = await import('./lib/discovery-proposer.mjs');
          const r = await runProposalRun({
            root, run: pkg.run, ops: pkg.ops, answers: pkg.answers, proposals: pkg.proposals, proposalLines: pkg.proposalLines,
            onLine: (ev) => send(ev),
          });
          // The page is regenerated from the file, never from the run's return value: the file is the
          // state, and a page built from memory could disagree with it.
          writeProposalsMd(root);
          return r;
        });
        send({ type: 'done', stats: out.stats, refusals: out.refusals, view: proposalsView(readProposalPackage(root)) });
      } catch (e) {
        send({ type: 'error', message: e.message });
      }
      return res.end();
    }
    // The owner's verdict, SERVER-WRITTEN on a click: the client sends proposalId, verdict and reason,
    // and `type` and `ts` are the server's — the same rule that keeps a proposal's id out of the
    // model's hands. Then proposals.md is regenerated, because a verdict changes the page.
    if (p === '/api/discovery/verdict' && req.method === 'POST') {
      const b = await readBody(req);
      const root = resolveRunRoot({ provenance: b.provenance, slug: b.slug });
      assertProvenanceRoot(b.provenance, root);
      const pkg = readProposalPackage(root);
      // ALL THREE CLIENT-SUPPLIED FIELDS VALIDATED HERE, each with a 400 naming the offending value.
      // checkProposalLines below still refuses over the WHOLE store — it is the append-guard and the
      // authority on the file's shape — but a throw there surfaces through the boundary catch-all as
      // a 500, and a client that sent a blank reason has made a request error, not a server one
      // (PR #364 review F3).
      if (!VERDICTS.includes(b.verdict)) return json(res, 400, { error: `verdict "${b.verdict}" is not one of ${VERDICTS.join(' · ')}` });
      if (typeof b.proposalId !== 'string' || !pkg.proposals.some((l) => l.type === 'proposal' && l.id === b.proposalId))
        return json(res, 400, { error: `proposalId ${JSON.stringify(b.proposalId ?? null)} names no proposal in run "${b.slug}" — a verdict is the owner's answer to a proposal that exists` });
      if (typeof b.reason !== 'string' || b.reason.trim() === '')
        return json(res, 400, { error: `reason ${JSON.stringify(b.reason ?? null)} is empty — the owner says why, and the reason is the record` });
      const line = { type: 'verdict', ts: new Date().toISOString(), proposal_id: b.proposalId, verdict: b.verdict, reason: b.reason };
      // Checked BEFORE the append, over the whole store: proposals.jsonl is append-only, so a verdict
      // naming no proposal cannot be taken back once it is on disk.
      // The file's own line numbers are passed so a refusal on a COMMITTED line names where it is;
      // the appended line has no entry, so its own refusals say "the proposal line being appended"
      // rather than printing an index that names nothing on disk.
      checkProposalLines([...pkg.proposals, line], pkg.ops, pkg.proposalLines);
      appendFileSync(path.join(root, 'proposals.jsonl'), `${JSON.stringify(line)}\n`);
      writeProposalsMd(root);
      return json(res, 200, proposalsView(readProposalPackage(root)));
    }
    if (p === '/api/discovery/turn' && req.method === 'POST') {
      const body = await readBody(req);
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      // A closed socket stops the WRITES, not the run — the same call /api/build/run makes, and the
      // right one: the tokens are already spent, and the run package should still be written.
      // withDiscoveryRunLock releases through its finally either way, so a disconnect cannot wedge the
      // next turn.
      let open = true;
      res.on('close', () => { open = false; });
      const send = (o) => { if (open && !res.writableEnded) res.write(`data: ${JSON.stringify(o)}\n\n`); };
      try {
        // EVERY PARAMETER NAMED, never `{ ...body }` — the rule /api/build/run's comment states, and
        // it binds harder here: runTurn's parameters reach an append-only file the honesty contract
        // forbids anyone to clean up.
        //
        // turnEvent is discovery.mjs's exported whitelist and this route holds NO shape opinion of its
        // own: a projection written inline here is one build-checks group 30 cannot reach, and it
        // would drift from the one group 30 does check. It returns null for anything not projectable,
        // so the send is simply skipped.
        const view = await runTurn({
          slug: body.slug, provenance: body.provenance, questionId: body.questionId,
          kind: 'banked', text: body.text,
          onLine: (line) => { const ev = turnEvent(line); if (ev) send(ev); },
        });
        send({ type: 'done', view });
      } catch (e) {
        // Not the catch-all's { error } body: SSE headers are already written, so a refusal is an
        // event on the stream.
        send({ type: 'error', message: e.message });
      }
      return res.end();
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
  console.log(`booted from: ${BOOT_SHA ? BOOT_SHA.slice(0, 7) : 'unknown (not a git checkout)'}`);
});
