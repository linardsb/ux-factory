/* portal SPA — hash routing: #/ = library, #/card/<slug> = detail */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = { cards: [], filter: 'all', search: '', activeSlug: null };

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

/* ---------- library ---------- */
const STATES = ['all', 'intake', 'researching', 'prototyping', 'applied', 'interview', 'closed'];

function renderLibrary() {
  state.activeSlug = null;
  updateChatContext();
  const industries = [...new Set(state.cards.map((c) => c.industry).filter(Boolean))];
  const cards = state.cards.filter((c) => {
    if (state.filter !== 'all' && c.state !== state.filter && c.industry !== state.filter) return false;
    const q = state.search.toLowerCase();
    return !q || [c.company, c.role, c.industry].join(' ').toLowerCase().includes(q);
  });
  $('#main').innerHTML = `
    <div class="portal-filters" role="toolbar">
      ${STATES.map((s) => `<button class="portal-chip" aria-pressed="${state.filter === s}" data-f="${s}">${s}</button>`).join('')}
      ${industries.map((i) => `<button class="portal-chip" aria-pressed="${state.filter === i}" data-f="${esc(i)}">${esc(i)}</button>`).join('')}
      <span class="portal-search"><input id="search" type="search" placeholder="Search…" value="${esc(state.search)}" /></span>
    </div>
    <div class="portal-grid">
      ${cards.map((c) => `
        <article class="card portal-card" data-slug="${c.slug}" tabindex="0" role="link" aria-label="${esc(c.company)}">
          <div class="card-body">
            <div class="card-kicker">${esc(c.industry || '—')}${c.historical ? ' · pre-factory' : ''}</div>
            <h3 class="h3">${esc(c.company)}</h3>
            <p class="muted">${esc(c.role || '')}</p>
            <div class="state-row">
              <span class="portal-state" data-state="${c.state}">${c.state}</span>
              ${c.decisions?.count ? `<span class="muted">${c.decisions.count} decisions</span>` : ''}
              ${c.prototypes?.length ? `<span class="muted">${c.prototypes.length} pages</span>` : ''}
              ${c.outcomes?.[0]?.status ? `<span class="muted">${esc(c.outcomes[0].status)}</span>` : ''}
            </div>
          </div>
        </article>`).join('') || '<p class="muted">No cards match.</p>'}
    </div>`;
  $('#main').querySelectorAll('.portal-card').forEach((el) => {
    const go = () => { location.hash = `#/card/${el.dataset.slug}`; };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  });
  $('#main').querySelectorAll('.portal-chip').forEach((el) =>
    el.addEventListener('click', () => { state.filter = el.dataset.f; renderLibrary(); })
  );
  $('#search').addEventListener('input', (e) => { state.search = e.target.value; renderLibrary(); });
}

/* ---------- card detail ---------- */
async function renderCard(slug) {
  const c = await api(`/api/cards/${slug}`);
  state.activeSlug = slug;
  updateChatContext();
  const tabs = ['prototypes', 'record', 'decisions'];
  $('#main').innerHTML = `
    <p><a href="#/" class="muted">← library</a></p>
    <div class="portal-detail-head">
      <h1 class="h3" style="font-size:var(--type-h2)">${esc(c.company)}</h1>
      <span class="portal-state" data-state="${c.state}">${c.state}</span>
      <span class="muted">${esc(c.role || '')}${c.industry ? ' · ' + esc(c.industry) : ''} · ${esc(c.tier)}</span>
      ${c.deploy_url ? `<a class="btn btn-secondary" href="${esc(c.deploy_url)}" target="_blank" rel="noopener">Live site ↗</a>` : ''}
    </div>
    <div class="portal-tabs" role="tablist">
      ${tabs.map((t, i) => `<button class="portal-tab" role="tab" aria-selected="${i === 0}" data-tab="${t}">${t}</button>`).join('')}
    </div>
    <div class="portal-pane" id="pane"></div>`;
  const panes = {
    prototypes: () => c.prototypes.length
      ? `<div class="portal-proto-picker">
           ${c.prototypes.map((p, i) => `<button class="portal-chip" aria-pressed="${i === 0}" data-src="/sites/${c.slug}/${esc(p.rel)}">${esc(p.name)}</button>`).join('')}
         </div>
         <iframe class="portal-proto-frame" id="proto-frame" src="/sites/${c.slug}/${esc(c.prototypes[0].rel)}" title="prototype preview"></iframe>`
      : '<p class="muted">No prototypes on disk yet. They appear here as the factory builds them.</p>',
    record: () => `
      ${c.jd_url ? `<p><a href="${esc(c.jd_url)}" target="_blank" rel="noopener">JD ↗</a>${c.ds_urls.map((u) => ` · <a href="${esc(u)}" target="_blank" rel="noopener">DS ↗</a>`).join('')}</p>` : ''}
      <h3 class="h3">Research</h3><pre>${esc(c.research || '—')}</pre>
      <h3 class="h3">JD excerpt</h3><pre>${esc(c.jd_excerpt || '—')}</pre>
      <h3 class="h3">Notes</h3><pre>${esc(c.notes || '—')}</pre>
      <h3 class="h3">Artifacts on disk</h3>
      <p class="muted">${c.artifacts?.map((a) => esc(a.rel)).join(' · ') || 'none found'}</p>
      <h3 class="h3">Outcome</h3>
      ${c.outcomes?.length ? c.outcomes.map((o) => `<p class="muted">${esc(o.role)} — <strong>${esc(o.status)}</strong>${o.notes && o.notes !== '—' ? ' · ' + esc(o.notes) : ''}</p>`).join('') : '<p class="muted">no outcomes row yet (fills via P8)</p>'}`,
    decisions: () => c.decisionsFull?.items?.length
      ? c.decisionsFull.items.map((d) => `<p><span class="card-kicker">${esc(d.id)} · ${esc(d.prototype)}</span><br />${esc(d.title)}</p>`).join('')
      : '<p class="muted">No decisions ledger yet — it grows during the build (step 5).</p>',
  };
  const show = (t) => {
    $('#pane').innerHTML = panes[t]();
    $('#main').querySelectorAll('.portal-tab').forEach((el) => el.setAttribute('aria-selected', el.dataset.tab === t));
    $('#pane').querySelectorAll('[data-src]').forEach((el) =>
      el.addEventListener('click', () => {
        $('#proto-frame').src = el.dataset.src;
        $('#pane').querySelectorAll('[data-src]').forEach((b) => b.setAttribute('aria-pressed', b === el));
      })
    );
  };
  $('#main').querySelectorAll('.portal-tab').forEach((el) => el.addEventListener('click', () => show(el.dataset.tab)));
  show(c.prototypes.length ? 'prototypes' : 'record');
}

/* ---------- intake ---------- */
$('#btn-intake').addEventListener('click', () => { $('#intake-drawer').hidden = false; });
$('#intake-cancel').addEventListener('click', () => { $('#intake-drawer').hidden = true; });
$('#intake-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const body = {
    company: f.get('company').trim(), role: f.get('role').trim(), industry: f.get('industry').trim(),
    tier: f.get('tier'), jdUrl: f.get('jdUrl').trim(),
    dsUrls: f.get('dsUrls').split('\n').map((s) => s.trim()).filter(Boolean),
    notes: f.get('notes').trim(),
  };
  $('#intake-status').textContent = 'Fetching + writing record…';
  try {
    const { slug, fetched } = await api('/api/intake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    $('#intake-status').textContent = `Done: ${fetched.join(', ') || 'record written'}`;
    e.target.reset();
    await loadCards();
    $('#intake-drawer').hidden = true;
    location.hash = `#/card/${slug}`;
  } catch (err) {
    $('#intake-status').textContent = `Failed: ${err.message}`;
  }
});

/* ---------- figma → pack ---------- */
const MAX_EXPORT_BYTES = 32 * 1024 * 1024; // mirrors portal/lib/figma.mjs — keep in step
const figma = { file: null };
const mb = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
// A swatch hex is third-party data on its way into a style attribute — prove it is a hex first.
const swatchStyle = (hex) => (/^#[0-9a-f]{6}$/i.test(hex) ? `background:${hex}` : '');

// Focus the file input, not the slug: it is the drawer's first control and the first thing the
// operator needs, and landing past it would leave the drop zone reachable only by Shift+Tab.
$('#btn-figma').addEventListener('click', () => { $('#figma-drawer').hidden = false; $('#figma-file').focus(); });
$('#figma-cancel').addEventListener('click', () => { $('#figma-drawer').hidden = true; });

const drop = $('#figma-drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('is-over');
  pickFile(e.dataTransfer.files[0]);
});
$('#figma-file').addEventListener('change', (e) => pickFile(e.target.files[0]));

// Client-side checks are a courtesy — they name the limit before a 33 MB upload starts and catch
// a mis-drop instantly. The server validates all of it again; neither side trusts the other.
async function pickFile(file) {
  figma.file = null;
  $('#figma-file-name').textContent = '';
  if (!file) return;
  if (!/\.json$/i.test(file.name)) {
    $('#figma-status').textContent = `"${file.name}" isn't a .json export. Export the design's tokens (Tokens Studio, a variables dump, or any nested name→value JSON) and drop that.`;
    return;
  }
  if (file.size > MAX_EXPORT_BYTES) {
    $('#figma-status').textContent = `"${file.name}" is ${mb(file.size)}, over the ${mb(MAX_EXPORT_BYTES)} cap — a token export should be far smaller; this looks like the wrong file.`;
    return;
  }
  try {
    JSON.parse(await file.text());
  } catch (err) {
    $('#figma-status').textContent = `"${file.name}" isn't valid JSON — ${err.message}`;
    return;
  }
  figma.file = file;
  $('#figma-file-name').textContent = `${file.name} · ${mb(file.size)}`;
  $('#figma-status').textContent = '';
}

// Not the shared api(): that helper assumes a JSON-stringified request and throws on !res.ok,
// and this route posts a raw File and answers a refusal with 200.
async function postPull(params, opts = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/figma/pull?${qs}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ?? null,
  });
  const body = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body;
}

$('#figma-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const slug = f.get('slug').trim();
  if (!figma.file) {
    $('#figma-status').textContent = 'Drop an export first (or choose one with the file picker).';
    return;
  }
  const params = { slug };
  if (f.get('accent').trim()) params.accent = f.get('accent').trim();
  if (f.get('neutral').trim()) params.neutral = f.get('neutral').trim();
  $('#figma-report').innerHTML = '';
  $('#figma-status').textContent = `Reading ${figma.file.name}, mapping roles, negotiating contrast…`;
  try {
    const body = await postPull(params, { body: figma.file });
    if (body.ok) renderReport(body.pack);
    else renderCandidates(body, params);
  } catch (err) {
    // A refusal with no candidates lands here too — no usable ramp at all, no grey ramp, an empty
    // read. Show it verbatim with no affordance: the tool is saying this design can't be imported
    // as-is, and inventing a control for that would be an overclaim.
    $('#figma-status').textContent = err.message;
  }
});

function renderCandidates(body, params) {
  $('#figma-status').textContent = body.message;
  $('#figma-report').innerHTML = `
    <p class="muted">The importer won't pick a brand colour for you. Choose the ramp it should use as the accent:</p>
    <div class="portal-swatches">
      ${body.candidates.map((c) => `
        <button class="portal-swatch" type="button" data-hue="${esc(c.hue)}">
          <span class="portal-swatch-chip" style="${swatchStyle(c.swatch)}"></span>
          <span>${esc(c.hue)}</span>
          <span class="muted">${c.rungs} rungs · chroma ${Number(c.chroma).toFixed(3)}</span>
        </button>`).join('')}
    </div>`;
  $('#figma-report').querySelectorAll('.portal-swatch').forEach((el) =>
    el.addEventListener('click', async () => {
      $('#figma-status').textContent = `Re-running with ${el.dataset.hue} as the accent…`;
      try {
        // The retry re-reads the export already on disk — no re-upload, and it exercises the
        // very path the pack header names as the run's source. The clicked swatch replaces only
        // the accent; a typed neutral override still applies to the re-run.
        const body2 = await postPull({ ...params, accent: el.dataset.hue }, { headers: { 'x-figma-retry': '1' } });
        if (body2.ok) renderReport(body2.pack);
        else renderCandidates(body2, params);
      } catch (err) {
        $('#figma-report').innerHTML = '';
        $('#figma-status').textContent = err.message;
      }
    })
  );
}

// Scale — spacing, radius, the type ramp, shadows — is all-or-nothing per family: a design that
// offers fewer values than a family has slots imports NOTHING for it, because a half-imported ramp
// is neither the design's nor this repo's. The drawer has to say which families came across and
// which fell short, or the claim above the drop zone is the only account the operator gets.
const FAMILY_LABEL = { spacing: 'spacing', radius: 'radius', type: 'type ramp', shadow: 'shadows' };

function renderScales(scales) {
  if (!scales) return '';
  if (!scales.offered)
    return `<h3 class="h3">Scale</h3>
      <p class="muted">This read offered no dimension or shadow values, so spacing, radius, the
      type ramp and shadows are all this repo's contract defaults. (Only a plugin export carries
      scale — an API styles read names text and effect styles without ever valuing them.)</p>`;

  const imported = Object.entries(scales.imported || {});
  return `
    <h3 class="h3">Scale from the design</h3>
    ${imported.length ? imported.map(([family, rec]) => `
      <p class="muted"><strong>${esc(FAMILY_LABEL[family] || family)}</strong> — imported ${rec.slots} of
      ${rec.offered} value(s), ${esc(rec.rule)}${rec.dropped?.length ? ` · dropped ${rec.dropped.map((d) => esc(d)).join(', ')}` : ''}</p>
      <div class="portal-table-scroll">
        <table class="portal-wcag">
          <thead><tr><th>Token</th><th>Value</th><th>From the design</th></tr></thead>
          <tbody>
            ${rec.taken.map((t) => `<tr><td><code>${esc(t.token)}</code></td><td><code>${esc(t.value)}</code></td><td>${esc(t.name)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`).join('') : '<p class="muted">No family had enough values to import.</p>'}
    ${scales.short?.length ? `
      <p class="muted"><strong>Not imported</strong> — stayed on this repo's contract defaults because
      the design offered fewer values than the family has slots:
      ${scales.short.map((s) => `${esc(FAMILY_LABEL[s.family] || s.family)} (offered ${s.offered}, needs ${s.needs})`).join(' · ')}</p>` : ''}
    ${scales.unclassified?.length ? `
      <p class="muted">Read but not classified into a family, so not imported:
      ${scales.unclassified.map((u) => `<code>${esc(u)}</code>`).join(' ')}</p>` : ''}`;
}

function renderReport(pack) {
  const failing = pack.failures.length;
  $('#figma-status').textContent = `Wrote ${pack.dest} — ${pack.tokenCount} tokens, ${pack.checks.length - failing}/${pack.checks.length} WCAG pairs pass.`;
  $('#figma-report').innerHTML = `
    <h3 class="h3">What this run did</h3>
    <p class="muted">
      Read <code>${esc(pack.exportPath)}</code> (${esc(pack.fileName ?? '')}) → wrote <code>${esc(pack.dest)}</code>.<br />
      Ramps in the file: ${pack.available.map((r) => `<code>${esc(r)}</code>`).join(' · ')}
      ${pack.pages ? `<br />Pages read: ${esc(pack.pages.read.map((p) => p.name).join(', '))}` : ''}
      ${pack.derivedUsed.length ? `<br /><strong>Rung numbers derived, not read</strong> for ${pack.derivedUsed.map((h) => `<code>${esc(h)}</code>`).join(' · ')} — ordered by OKLCH lightness. The numbers are the importer's; the colours are the design's.` : ''}
    </p>

    <h3 class="h3">Mapped from the design — ${pack.placed.length} tokens</h3>
    <div class="portal-table-scroll">
      <table class="portal-wcag">
        <thead><tr><th>Token</th><th>Value</th><th>Where it came from</th></tr></thead>
        <tbody>
          ${pack.placed.map((p) => `
            <tr>
              <td><code>${esc(p.token)}</code></td>
              <td><span class="portal-swatch-chip portal-swatch-chip-sm" style="${swatchStyle(pack.values[p.token])}"></span> <code>${esc(pack.values[p.token])}</code></td>
              <td>${esc(p.source)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <h3 class="h3">WCAG — ${pack.checks.length - failing}/${pack.checks.length} pairs pass</h3>
    <div class="portal-table-scroll">
      <table class="portal-wcag">
        <thead><tr><th></th><th>Ratio</th><th>Min</th><th>Pair</th></tr></thead>
        <tbody>
          ${pack.checks.map((c) => `
            <tr data-pass="${c.pass}">
              <td>${c.pass ? '✓' : '✗'}</td>
              <td>${esc(c.ratio)}</td>
              <td>${esc(c.min)}</td>
              <td><code>${esc(c.fg)}</code> on <code>${esc(c.bg)}</code></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${failing ? `<p class="muted"><strong>${failing} pair(s) still failing</strong> — no value this design offers satisfies them. The pack ships saying so in its header.</p>` : ''}

    ${pack.stepped.length ? `
      <h3 class="h3">Contrast negotiated within the design's own ramps</h3>
      <ul class="muted">
        ${pack.stepped.map((s) => `<li><code>${esc(s.token)}</code>: ${esc(s.ramp)}/${esc(s.from)} (${esc(s.fromValue)}) → ${esc(s.ramp)}/${esc(s.to)} (${esc(s.toValue)})</li>`).join('')}
      </ul>` : '<p class="muted">No contrast negotiation was needed — every nominal rung passed as mapped.</p>'}

    ${pack.collapsed.length ? `
      <h3 class="h3">Too few rungs for a distinct state colour</h3>
      <ul class="muted">${pack.collapsed.map((c) => `<li><code>${esc(c.token)}</code> repeats <code>${esc(c.twin)}</code> — the ramp holds nothing else to move to.</li>`).join('')}</ul>` : ''}

    ${renderScales(pack.scales)}

    <h3 class="h3">Auto-filled from contract defaults — ${pack.filled.length} tokens</h3>
    <p class="muted">Not read from the design. These are the repo's own values, and this is the full list:</p>
    <p class="portal-filled">${pack.filled.map((t) => `<code>${esc(t)}</code>`).join(' ')}</p>

    <h3 class="h3">The pack header, verbatim</h3>
    <pre>${esc(pack.note)}</pre>

    <h3 class="h3">To keep it</h3>
    <p class="muted">
      Commit <code>${esc(pack.dest)}</code>. A new pack under <code>system/</code> changes
      <code>loc-summary.json</code>, so regenerate it and the approach VR baselines in the same commit:<br />
      <code>node agent-layer/gen-loc-summary.mjs</code> ·
      <code>cd tooling/visual-regression &amp;&amp; npm run update:docker</code>
    </p>`;
}

/* ---------- chat ---------- */
$('#btn-chat').addEventListener('click', () => { $('#chat').hidden = false; $('#chat-input').focus(); });
$('#chat-close').addEventListener('click', () => { $('#chat').hidden = true; });
function updateChatContext() {
  $('#chat-context').textContent = `chat · ${state.activeSlug || 'global'}`;
}
function chatLine(cls, text) {
  const el = document.createElement('div');
  el.className = `chat-msg ${cls}`;
  el.textContent = text;
  $('#chat-log').appendChild(el);
  $('#chat-log').scrollTop = $('#chat-log').scrollHeight;
  return el;
}
$('#chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = $('#chat-input').value.trim();
  if (!message) return;
  $('#chat-input').value = '';
  chatLine('user', message);
  const res = await fetch('/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, slug: state.activeSlug }),
  });
  if (!res.ok) return chatLine('tool', `error: ${res.statusText}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      if (!chunk.startsWith('data: ')) continue;
      const ev = JSON.parse(chunk.slice(6));
      if (ev.type === 'text') chatLine('assistant', ev.text);
      else if (ev.type === 'tool') chatLine('tool', `⚙ ${ev.name}${ev.hint ? ' · ' + ev.hint : ''}`);
      else if (ev.type === 'error') chatLine('tool', `error: ${ev.message}`);
      else if (ev.type === 'done' && state.activeSlug) renderCard(state.activeSlug); // findings may have landed
    }
  }
});

/* ---------- boot + routing ---------- */
async function loadCards() { state.cards = await api('/api/cards'); }
async function route() {
  const m = location.hash.match(/^#\/card\/([a-z0-9-]+)/);
  if (m) await renderCard(m[1]);
  else renderLibrary();
}
window.addEventListener('hashchange', route);
(async () => {
  try {
    const h = await api('/api/health');
    $('#health').textContent = `${h.cards} cards · chat ${h.hasToken ? 'ready (token)' : 'via CLI login'}`;
  } catch { $('#health').textContent = 'server error'; }
  await loadCards();
  await route();
})();
