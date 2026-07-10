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
