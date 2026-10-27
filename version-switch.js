/* version-switch.js — interruttore V1/V2 (versione definitiva) */
(function () {
  'use strict';
  var KEY = 'thesis_version';

  /* Stile del pulsante, iniettato qui: non dipende da style.css */
  var style = document.createElement('style');
  style.textContent =
    '.version-btn{display:inline-flex;align-items:center;justify-content:center;' +
    'min-width:2.4rem;height:2.3rem;padding:0 .55rem;border-radius:6px;' +
    'background:var(--bg-surface,#14171e);border:1px solid var(--border-subtle,rgba(255,255,255,.08));' +
    'color:var(--text-secondary,#a3acb9);font-family:var(--font-mono,monospace);' +
    'font-weight:700;font-size:.78rem;letter-spacing:.06em;cursor:pointer;}' +
    '.version-btn:hover{color:var(--text-primary,#f5f6f8);border-color:var(--border-medium,rgba(255,255,255,.15));}' +
    '.version-btn.is-v2{color:var(--accent-emerald,#10b981);border-color:var(--accent-emerald,#10b981);}' +
    '.version-badge{font-family:var(--font-mono,monospace);font-size:.62rem;color:var(--text-muted,#6c7686);' +
    'text-transform:uppercase;letter-spacing:.08em;}';
  document.head.appendChild(style);

  function current() { return localStorage.getItem(KEY) === 'v2' ? 'v2' : 'v1'; }

  /* Normalizza i dati e sceglie il database della versione attiva */
  function normalizeRecord(raw) {
    var rec = {};
    Object.keys(raw || {}).forEach(function (k) {
      var key = String(k).trim();
      var v = raw[k];
      rec[key] = (typeof v === 'string') ? v.trim() : v;
    });
    ['tags', 'typographic_operations'].forEach(function (f) {
      if (Array.isArray(rec[f])) {
        rec[f] = rec[f].map(function (x) { return String(x).trim(); })
                       .filter(Boolean).join(', ');
      }
    });
    if (!rec.plain_summary) rec.plain_summary = rec.description || '';
    return rec;
  }
  function normalizeDB(data) { return (Array.isArray(data) ? data : []).map(normalizeRecord); }

  var origFetch = window.fetch ? window.fetch.bind(window) : null;
  function tryFetch(p) {
    return origFetch(p).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }
  function resolveDatabase() {
    var v = current();
    var chain = (v === 'v2')
      ? ['data/v2/database.json', 'data/v1/database.json', 'data/database_v2.json', 'data/database.json']
      : ['data/v1/database.json', 'data/database_v2.json', 'data/database.json'];
    function attempt(i) {
      if (i >= chain.length) return Promise.resolve([]);
      return tryFetch(chain[i]).catch(function () { return attempt(i + 1); });
    }
    return attempt(0).then(normalizeDB);
  }
  if (origFetch) {
    window.fetch = function (input, init) {
      var url = (typeof input === 'string') ? input : (input && input.url) || '';
      if (/data\/(database_v2|database)\.json(\?.*)?$/.test(url)) {
        return resolveDatabase().then(function (clean) {
          return new Response(JSON.stringify(clean), { status: 200, headers: { 'Content-Type': 'application/json' } });
        });
      }
      return origFetch(input, init);
    };
  }

  /* Pulsante V1/V2: classe PROPRIA, quindi app.js non lo converte in sole/luna */
  document.addEventListener('DOMContentLoaded', function () {
    var actions = document.querySelector('.nav-actions');
    if (!actions) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'versionToggleBtn';
    b.className = 'version-btn';
    function paint() {
      var v = current();
      b.textContent = v.toUpperCase();
      b.classList.toggle('is-v2', v === 'v2');
      b.title = (v === 'v1')
        ? 'Stai vedendo la V1 (archivio attuale). Clicca per passare alla V2 revisionata.'
        : 'Stai vedendo la V2 (revisionata dopo l\'audit). Clicca per tornare alla V1.';
    }
    paint();
    b.addEventListener('click', function () {
      var next = current() === 'v1' ? 'v2' : 'v1';
      localStorage.setItem(KEY, next);
      var p = window.location.pathname;
      if (p.endsWith('synthesis.html') && next === 'v2') { window.location.href = 'synthesis_v2.html'; return; }
      if (p.endsWith('synthesis_v2.html') && next === 'v1') { window.location.href = 'synthesis.html'; return; }
      window.location.reload();
    });
    actions.appendChild(b);

    var badge = document.createElement('span');
    badge.className = 'version-badge';
    badge.textContent = current() === 'v1' ? 'versione attuale' : 'versione revisionata';
    actions.appendChild(badge);
  });
})();