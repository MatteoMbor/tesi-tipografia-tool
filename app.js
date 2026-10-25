/**
TESI DI LAUREA MAGISTRALE ISIA 2026 — MATTEO BORGHESE
Archivio Ricerca: Tipografia come Forma & Tool come Atto Progettuale
Modulo Logica Applicativa (app.js) — VERSIONE AUTO-NORMALIZZANTE
*/
(function () {
  'use strict';

  const CATEGORY_MAP = {
    'C01': 'Storia della lettera come forma',
    'C02': 'Esperimenti tipografici recenti',
    'C03': 'Fonderie e designer che costruiscono tool',
    'C04': 'Il tool-making come pratica di design',
    'C05': 'Il computer cambia il modo di pensare',
    'C06': 'Intelligenza artificiale e pratiche ibride',
    'C07': 'Teoria e ricerca accademica',
    'C08': 'Video, talk e interviste',
    'C09': 'Tool e codice aperti',
    'C10': 'Come portarlo sul web',
    'C11': 'Etica, limiti e controversie'
  };
  const CATEGORY_SHORT = {
    'C01': 'Storia della lettera', 'C02': 'Esperimenti recenti',
    'C03': 'Fonderie & tool-maker', 'C04': 'Tool-making',
    'C05': 'Svolta del computer', 'C06': 'AI ibrida',
    'C07': 'Teoria', 'C08': 'Video e talk',
    'C09': 'Tool aperti', 'C10': 'Sul web', 'C11': 'Etica'
  };
  const THREAD_MAP = {
    'TIPOGRAFIA': 'Lettere e forma',
    'TOOL': 'Strumenti e codice',
    'ENTRAMBI': 'Entrambi i filoni'
  };
  const YEAR_BUCKETS = [
    { id: 'pre-2000', label: 'Prima del 2000', test: y => y < 2000 },
    { id: '2000-2018', label: '2000–2018', test: y => y >= 2000 && y < 2019 },
    { id: '2019-2022', label: '2019–2022', test: y => y >= 2019 && y < 2023 },
    { id: '2023-2026', label: '2023–2026', test: y => y >= 2023 }
  ];

  const state = {
    sources: [], filteredSources: [],
    filters: {
      category: 'ALL', cluster: 'ALL', thread: 'ALL', priority: 'ALL',
      type: 'ALL', year: 'ALL', tool: 'ALL', search: '', sort: 'affinity-desc'
    },
    viewMode: 'grid',
    theme: localStorage.getItem('thesis_theme') || 'dark',
    fontSize: parseInt(localStorage.getItem('thesis_font_size') || '100', 10),
    fontMode: localStorage.getItem('thesis_font_mode') || 'serif'
  };

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initReadingProgress();
    loadDatabase();
  });

  function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      updateThemeBtnIcon(btn);
      btn.addEventListener('click', toggleTheme);
    });
  }
  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('thesis_theme', state.theme);
    document.querySelectorAll('.theme-btn').forEach(updateThemeBtnIcon);
  }
  function updateThemeBtnIcon(btn) {
    if (state.theme === 'dark') {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
      btn.title = "Tema chiaro";
    } else {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      btn.title = "Tema scuro";
    }
  }

  function initReadingProgress() {
    const bar = document.querySelector('.reading-bar');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) bar.style.width = `${Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100))}%`;
    }, { passive: true });
  }

  // === NORMALIZZATORE UNIVERSALE ===
  function asList(value) {
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
    if (value == null || value === '') return [];
    return String(value).split(',').map(s => s.trim()).filter(Boolean);
  }

  function sanitizeRecord(raw) {
    const rec = {};
    for (const [k, v] of Object.entries(raw || {})) {
      const key = String(k).trim();
      rec[key] = (typeof v === 'string') ? v.trim() : v;
    }
    rec.tags = asList(rec.tags);
    rec.topic_tags = asList(rec.topic_tags || rec.tags);
    rec.tool_tags = asList(rec.tool_tags);
    rec.typographic_operations = asList(rec.typographic_operations);
    rec.plain_summary = rec.plain_summary || rec.description || '';
    rec.what_it_shows = rec.what_it_shows || '';
    rec.why_it_matters = rec.why_it_matters || rec.affinity_motivation || '';
    rec.how_to_use_in_thesis = rec.how_to_use_in_thesis || rec.transferability || '';
    rec.cluster = rec.cluster || '';
    if (rec.id === 'AI-006' && rec.plain_summary) {
      rec.plain_summary = rec.plain_summary.replace('desarrollado', 'sviluppato');
    }
    return rec;
  }

  async function loadDatabase() {
    const paths = ['./data/database_v2.json', './data/database.json'];
    let rawData = null;
    for (const path of paths) {
      try {
        const res = await fetch(path);
        if (res.ok) { rawData = await res.json(); break; }
      } catch (err) { /* next */ }
    }
    if (!rawData) {
      showGlobalError('Database non trovato. Verifica che esista data/database_v2.json');
      return;
    }
    state.sources = (Array.isArray(rawData) ? rawData : []).map(sanitizeRecord);
    window.__THESIS_DB__ = state.sources;
    document.querySelectorAll('.js-source-count').forEach(el => {
      el.textContent = String(state.sources.length);
    });
    const pathname = window.location.pathname;
    if (pathname.endsWith('sources.html') || document.getElementById('sourcesGrid')) {
      initSourcesPage();
    } else if (pathname.endsWith('synthesis.html') || document.querySelector('.synthesis-article')) {
      initSynthesisPage();
    } else {
      initHomePage();
    }
  }

  function yearBucketId(year) {
    const y = parseInt(year, 10);
    if (!y) return '';
    const bucket = YEAR_BUCKETS.find(b => b.test(y));
    return bucket ? bucket.id : '';
  }

  function showGlobalError(msg) {
    const container = document.querySelector('.site-main .container');
    if (container) {
      const errBox = document.createElement('div');
      errBox.className = 'no-results';
      errBox.innerHTML = `<div class="no-results-icon">⚠️</div><div class="no-results-title">Errore</div><div class="no-results-desc">${escapeHtml(msg)}</div>`;
      container.prepend(errBox);
    }
  }

  // === HOME ===
  function initHomePage() {
    const data = state.sources;
    if (!data.length) return;
    const catSet = new Set(data.map(d => d.cluster).filter(Boolean));
    const prioPrimary = data.filter(d => (d.priority || '').toUpperCase() === 'PRIMARIA').length;
    const years = data.map(d => d.year).filter(Boolean);
    const minYear = years.length ? Math.min(...years) : 0;
    const maxYear = years.length ? Math.max(...years) : 0;
    const affinities = data.map(d => parseFloat(d.affinity) || 0).filter(v => v > 0);
    const avgAffinity = affinities.length ? (affinities.reduce((a, b) => a + b, 0) / affinities.length).toFixed(1) : '0';
    const threadCounts = {
      'TIPOGRAFIA': data.filter(d => (d.thread || '').toUpperCase() === 'TIPOGRAFIA').length,
      'TOOL': data.filter(d => (d.thread || '').toUpperCase() === 'TOOL').length,
      'ENTRAMBI': data.filter(d => (d.thread || '').toUpperCase() === 'ENTRAMBI').length
    };
    const typeCounts = {};
    data.forEach(d => {
      const t = (d.type || 'altro').toLowerCase();
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    setElText('statTotal', data.length);
    setElText('statCategories', catSet.size);
    setElText('statPrimary', prioPrimary);
    setElText('statYears', `${minYear}–${maxYear}`);
    setElText('statAvgAffinity', `${avgAffinity}%`);
    setElText('statThreadBoth', threadCounts['ENTRAMBI']);
    renderThreadBars(threadCounts, data.length);
    renderTypeBars(typeCounts, data.length);
    renderClustersGrid(data);
    renderCategoriesGrid(data);
    renderTopSources(data);
  }
  function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function renderThreadBars(counts, total) {
    const container = document.getElementById('threadBars');
    if (!container) return;
    const items = [
      { key: 'ENTRAMBI', label: THREAD_MAP.ENTRAMBI, count: counts['ENTRAMBI'], colorClass: 'emerald' },
      { key: 'TOOL', label: THREAD_MAP.TOOL, count: counts['TOOL'], colorClass: 'cobalt' },
      { key: 'TIPOGRAFIA', label: THREAD_MAP.TIPOGRAFIA, count: counts['TIPOGRAFIA'], colorClass: 'vermilion' }
    ];
    container.innerHTML = items.map(item => {
      const pct = ((item.count / total) * 100).toFixed(1);
      return `<div class="chart-item"><div class="chart-item-header"><span class="chart-item-label">${escapeHtml(item.label)}</span><span class="chart-item-val">${item.count} fonti (${pct}%)</span></div><div class="bar-track"><div class="bar-fill ${item.colorClass}" style="width: ${pct}%"></div></div></div>`;
    }).join('');
  }
  function renderTypeBars(typeCounts, total) {
    const container = document.getElementById('typeBars');
    if (!container) return;
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const colors = ['vermilion', 'cobalt', 'emerald', 'amber', 'purple'];
    container.innerHTML = sortedTypes.slice(0, 6).map(([type, count], idx) => {
      const pct = ((count / total) * 100).toFixed(1);
      return `<div class="chart-item"><div class="chart-item-header"><span class="chart-item-label" style="text-transform: capitalize;">${escapeHtml(type)}</span><span class="chart-item-val">${count} fonti (${pct}%)</span></div><div class="bar-track"><div class="bar-fill ${colors[idx % colors.length]}" style="width: ${pct}%"></div></div></div>`;
    }).join('');
  }
  function renderClustersGrid(data) {
    const grid = document.getElementById('clustersGrid');
    if (!grid) return;
    const counts = {};
    data.forEach(d => { if (d.cluster) counts[d.cluster] = (counts[d.cluster] || 0) + 1; });
    const names = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
    grid.innerHTML = names.map(name => `<div class="category-card" onclick="window.location.href='sources.html?cluster=${encodeURIComponent(name)}'"><div class="category-card-top"><span class="cat-code">AREA</span><span class="cat-count">${counts[name]} fonti</span></div><h3 class="cat-title">${escapeHtml(name)}</h3><p class="cat-desc">Apri l'archivio filtrato su questa area.</p><span class="cat-explore-link">Vedi le fonti &rarr;</span></div>`).join('');
  }
  function renderCategoriesGrid(data) {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    const counts = {};
    data.forEach(d => { if (d.category) counts[d.category] = (counts[d.category] || 0) + 1; });
    grid.innerHTML = Object.keys(CATEGORY_MAP).sort().map(code => {
      const count = counts[code] || 0;
      return `<div class="category-card" onclick="window.location.href='sources.html?category=${code}'"><div class="category-card-top"><span class="cat-code">${code}</span><span class="cat-count">${count} fonti</span></div><h3 class="cat-title">${escapeHtml(CATEGORY_MAP[code])}</h3><p class="cat-desc">${escapeHtml(CATEGORY_SHORT[code])}</p><span class="cat-explore-link">Esplora &rarr;</span></div>`;
    }).join('');
  }
  function renderTopSources(data) {
    const container = document.getElementById('topSourcesGrid');
    if (!container) return;
    const top = [...data].sort((a, b) => (parseFloat(b.affinity) || 0) - (parseFloat(a.affinity) || 0)).slice(0, 6);
    container.innerHTML = top.map(renderSourceCardHtml).join('');
    setupCardEventListeners(container);
  }

  // === SOURCES ===
  function initSourcesPage() {
    populateFilterSelects(state.sources);
    const params = new URLSearchParams(window.location.search);
    ['category','cluster','thread','priority','type','year','tool','search','sort'].forEach(k => {
      if (params.has(k)) state.filters[k] = params.get(k);
    });
    syncControlsWithState();
    bindControlEvents();
    applyFiltersAndRender();
    if (params.has('id')) {
      const found = state.sources.find(s => (s.id || '').toUpperCase() === params.get('id').toUpperCase());
      if (found) setTimeout(() => openDetailModal(found), 200);
    }
  }

  function populateFilterSelects(data) {
    const selCat = document.getElementById('filterCategory');
    const selCluster = document.getElementById('filterCluster');
    const selThread = document.getElementById('filterThread');
    const selPrio = document.getElementById('filterPriority');
    const selType = document.getElementById('filterType');
    const selYear = document.getElementById('filterYear');
    const selTool = document.getElementById('filterTool');
    const chipRow = document.getElementById('clusterChipRow');

    if (selCat) {
      const catCounts = {};
      data.forEach(d => { if (d.category) catCounts[d.category] = (catCounts[d.category] || 0) + 1; });
      selCat.innerHTML = `<option value="ALL">Tutte le categorie (${data.length})</option>` +
        Object.keys(CATEGORY_MAP).sort().map(code => `<option value="${code}">${code} — ${escapeHtml(CATEGORY_SHORT[code])} (${catCounts[code] || 0})</option>`).join('');
    }
    if (selCluster) {
      const clusterCounts = {};
      data.forEach(d => { if (d.cluster) clusterCounts[d.cluster] = (clusterCounts[d.cluster] || 0) + 1; });
      const names = Object.keys(clusterCounts).sort();
      selCluster.innerHTML = `<option value="ALL">Tutte le aree (${data.length})</option>` +
        names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)} (${clusterCounts[name]})</option>`).join('');
      if (chipRow) {
        chipRow.innerHTML = ['Tutte', ...names].map((name, idx) => {
          const value = idx === 0 ? 'ALL' : name;
          const active = (state.filters.cluster || 'ALL') === value ? 'is-active' : '';
          const label = idx === 0 ? `Tutte (${data.length})` : `${name} (${clusterCounts[name]})`;
          return `<button type="button" class="cluster-chip ${active}" data-cluster="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
        }).join('');
        chipRow.querySelectorAll('.cluster-chip').forEach(btn => {
          btn.addEventListener('click', () => {
            state.filters.cluster = btn.getAttribute('data-cluster') || 'ALL';
            syncControlsWithState();
            updateUrlParams();
            applyFiltersAndRender();
            populateFilterSelects(state.sources);
          });
        });
      }
    }
    if (selThread) {
      const thCounts = {};
      data.forEach(d => { if (d.thread) thCounts[d.thread] = (thCounts[d.thread] || 0) + 1; });
      selThread.innerHTML = `<option value="ALL">Tutti i filoni</option>` +
        ['ENTRAMBI', 'TOOL', 'TIPOGRAFIA'].map(th => `<option value="${th}">${escapeHtml(THREAD_MAP[th])} (${thCounts[th] || 0})</option>`).join('');
    }
    if (selPrio) {
      const prioCounts = {};
      data.forEach(d => { if (d.priority) prioCounts[d.priority] = (prioCounts[d.priority] || 0) + 1; });
      selPrio.innerHTML = `<option value="ALL">Tutte le priorità</option>` +
        ['PRIMARIA', 'SECONDARIA', 'CONTESTO'].map(p => `<option value="${p}">${p} (${prioCounts[p] || 0})</option>`).join('');
    }
    if (selType) {
      const typeCounts = {};
      data.forEach(d => { const t = (d.type || '').toLowerCase(); if (t) typeCounts[t] = (typeCounts[t] || 0) + 1; });
      selType.innerHTML = `<option value="ALL">Tutti i tipi</option>` +
        Object.keys(typeCounts).sort().map(t => `<option value="${t}">${t} (${typeCounts[t]})</option>`).join('');
    }
    if (selYear) {
      selYear.innerHTML = `<option value="ALL">Tutti gli anni</option>` +
        YEAR_BUCKETS.map(b => {
          const c = data.filter(d => yearBucketId(d.year) === b.id).length;
          return `<option value="${b.id}">${b.label} (${c})</option>`;
        }).join('');
    }
    if (selTool) {
      const toolCounts = {};
      data.forEach(d => { asList(d.tool_tags).forEach(tag => { toolCounts[tag] = (toolCounts[tag] || 0) + 1; }); });
      selTool.innerHTML = `<option value="ALL">Tutti gli strumenti</option>` +
        Object.keys(toolCounts).sort().map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)} (${toolCounts[t]})</option>`).join('');
    }
  }

  function syncControlsWithState() {
    const ids = ['filterCategory','filterCluster','filterThread','filterPriority','filterType','filterYear','filterTool','sortSelect'];
    const keys = ['category','cluster','thread','priority','type','year','tool','sort'];
    ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.value = state.filters[keys[i]]; });
    const inputSearch = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (inputSearch) {
      inputSearch.value = state.filters.search;
      if (clearBtn) clearBtn.classList.toggle('visible', !!state.filters.search);
    }
  }

  function bindControlEvents() {
    const bindings = [
      ['filterCategory', 'category'], ['filterCluster', 'cluster'], ['filterThread', 'thread'],
      ['filterPriority', 'priority'], ['filterType', 'type'], ['filterYear', 'year'],
      ['filterTool', 'tool'], ['sortSelect', 'sort']
    ];
    bindings.forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', e => {
        state.filters[key] = e.target.value;
        if (key === 'cluster') populateFilterSelects(state.sources);
        updateUrlParams();
        applyFiltersAndRender();
      });
    });
    const inputSearch = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    let debounceTimer;
    if (inputSearch) {
      inputSearch.addEventListener('input', e => {
        const val = e.target.value.trim();
        if (clearBtn) clearBtn.classList.toggle('visible', !!val);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.filters.search = val;
          updateUrlParams();
          applyFiltersAndRender();
        }, 220);
      });
    }
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (inputSearch) inputSearch.value = '';
      clearBtn.classList.remove('visible');
      state.filters.search = '';
      updateUrlParams();
      applyFiltersAndRender();
    });
    const btnReset = document.getElementById('btnResetFilters');
    if (btnReset) btnReset.addEventListener('click', () => {
      state.filters = { category: 'ALL', cluster: 'ALL', thread: 'ALL', priority: 'ALL', type: 'ALL', year: 'ALL', tool: 'ALL', search: '', sort: 'affinity-desc' };
      populateFilterSelects(state.sources);
      syncControlsWithState();
      updateUrlParams();
      applyFiltersAndRender();
    });
    const viewGridBtn = document.getElementById('viewGridBtn');
    const viewListBtn = document.getElementById('viewListBtn');
    if (viewGridBtn && viewListBtn) {
      viewGridBtn.addEventListener('click', () => {
        state.viewMode = 'grid';
        viewGridBtn.classList.add('active'); viewListBtn.classList.remove('active');
        const grid = document.getElementById('sourcesGrid');
        if (grid) grid.classList.remove('list-view');
      });
      viewListBtn.addEventListener('click', () => {
        state.viewMode = 'list';
        viewListBtn.classList.add('active'); viewGridBtn.classList.remove('active');
        const grid = document.getElementById('sourcesGrid');
        if (grid) grid.classList.add('list-view');
      });
    }
    window.addEventListener('keydown', e => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) && document.activeElement !== inputSearch) {
        if (inputSearch) { e.preventDefault(); inputSearch.focus(); inputSearch.select(); }
      } else if (e.key === 'Escape') {
        closeDetailModal();
      }
    });
  }

  function updateUrlParams() {
    const params = new URLSearchParams();
    Object.entries(state.filters).forEach(([k, v]) => {
      if (v && v !== 'ALL' && v !== '' && v !== 'affinity-desc') params.set(k, v);
    });
    const newQuery = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (newQuery ? '?' + newQuery : ''));
  }

  function applyFiltersAndRender() {
    let result = [...state.sources];
    const { category, cluster, thread, priority, type, year, tool, search, sort } = state.filters;
    if (category !== 'ALL') result = result.filter(d => (d.category || '').toUpperCase() === category.toUpperCase());
    if (cluster !== 'ALL') result = result.filter(d => d.cluster === cluster);
    if (thread !== 'ALL') result = result.filter(d => (d.thread || '').toUpperCase() === thread.toUpperCase());
    if (priority !== 'ALL') result = result.filter(d => (d.priority || '').toUpperCase() === priority.toUpperCase());
    if (type !== 'ALL') result = result.filter(d => (d.type || '').toLowerCase() === type.toLowerCase());
    if (year !== 'ALL') result = result.filter(d => yearBucketId(d.year) === year);
    if (tool !== 'ALL') result = result.filter(d => asList(d.tool_tags).includes(tool));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d => {
        const hay = [d.id, d.title, d.creator, d.plain_summary, d.description, d.quote,
          asList(d.tags).join(' '), asList(d.topic_tags).join(' '),
          asList(d.typographic_operations).join(' '), asList(d.tool_tags).join(' '),
          d.technical_stack, d.transferability, d.cluster, String(d.year || '')].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    result.sort((a, b) => {
      switch (sort) {
        case 'affinity-asc': return (parseFloat(a.affinity) || 0) - (parseFloat(b.affinity) || 0);
        case 'year-desc': return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
        case 'year-asc': return (parseInt(a.year) || 9999) - (parseInt(b.year) || 9999);
        case 'title-asc': return (a.title || '').localeCompare(b.title || '');
        case 'score_t-desc': return (parseFloat(b.score_t) || 0) - (parseFloat(a.score_t) || 0);
        case 'score_p-desc': return (parseFloat(b.score_p) || 0) - (parseFloat(a.score_p) || 0);
        default: return (parseFloat(b.affinity) || 0) - (parseFloat(a.affinity) || 0);
      }
    });
    state.filteredSources = result;
    const countEl = document.getElementById('resultsCount');
    if (countEl) countEl.innerHTML = `Visualizzate <strong>${result.length}</strong> su ${state.sources.length} fonti`;
    const grid = document.getElementById('sourcesGrid');
    if (!grid) return;
    if (result.length === 0) {
      grid.innerHTML = `<div class="no-results"><div class="no-results-icon">🔍</div><div class="no-results-title">Nessuna fonte trovata</div><div class="no-results-desc">Prova ad allargare i filtri o la ricerca.</div><button class="btn btn-secondary" onclick="document.getElementById('btnResetFilters').click()">Reimposta filtri</button></div>`;
    } else {
      grid.innerHTML = result.map(renderSourceCardHtml).join('');
      setupCardEventListeners(grid);
    }
  }

  function renderSourceCardHtml(source) {
    const id = source.id || 'N/A';
    const title = source.title || 'Senza titolo';
    const creator = source.creator || 'Autore sconosciuto';
    const year = source.year || '';
    const type = source.type || 'sorgente';
    const thread = (source.thread || 'ENTRAMBI').toUpperCase();
    const priority = (source.priority || 'SECONDARIA').toUpperCase();
    const category = source.category || '';
    const catName = CATEGORY_SHORT[category] || category;
    const affinity = parseFloat(source.affinity) || 0;
    const desc = source.plain_summary || source.description || '';
    const why = source.why_it_matters || '';
    const cluster = source.cluster || '';
    const quote = source.quote || '';
    const url = source.url || '';
    const tags = asList(source.tags).slice(0, 4);
    const prioClass = priority === 'PRIMARIA' ? 'is-primary' : (priority === 'SECONDARIA' ? 'is-secondary' : 'is-context');
    const threadBadgeClass = thread === 'TIPOGRAFIA' ? 'badge-thread-tipografia' : (thread === 'TOOL' ? 'badge-thread-tool' : 'badge-thread-entrambi');
    const prioBadgeClass = priority === 'PRIMARIA' ? 'badge-prio-primaria' : (priority === 'SECONDARIA' ? 'badge-prio-secondaria' : 'badge-prio-contesto');
    return `<article class="source-card ${prioClass}" data-source-id="${escapeHtml(id)}">
      <div class="card-top">
        <span class="card-id-badge">${escapeHtml(id)}</span>
        <div class="card-badges">
          <span class="badge ${threadBadgeClass}">${escapeHtml(thread)}</span>
          <span class="badge ${prioBadgeClass}">${escapeHtml(priority)}</span>
          <span class="badge badge-type">${escapeHtml(type)}</span>
        </div>
      </div>
      <h3 class="card-title">${escapeHtml(title)}</h3>
      <div class="card-creator">${escapeHtml(creator)} ${year ? `(${year})` : ''}</div>
      <div class="card-meta-line"><span>📁 ${escapeHtml(category)} &bull; ${escapeHtml(catName)}</span></div>
      ${cluster ? `<div class="card-cluster">◆ ${escapeHtml(cluster)}</div>` : ''}
      <div class="card-affinity-wrap">
        <div class="card-affinity-header"><span>Quanto c'entra con la tesi</span><span class="affinity-score-val">${affinity.toFixed(1)}%</span></div>
        <div class="affinity-bar-track"><div class="affinity-bar-fill" style="width: ${Math.min(100, affinity)}%"></div></div>
      </div>
      ${desc ? `<p class="card-description">${escapeHtml(desc)}</p>` : ''}
      ${why ? `<p class="card-why"><strong>Perché conta:</strong> ${escapeHtml(why)}</p>` : ''}
      ${quote ? `<div class="card-quote">«${escapeHtml(quote)}»</div>` : ''}
      ${tags.length ? `<div class="card-tags">${tags.map(t => `<span class="tag-chip" onclick="event.stopPropagation(); filterByTag('${escapeHtml(t)}');">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="card-footer">
        <button type="button" class="btn-detail" data-action="open-modal">Scheda completa &rarr;</button>
        ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="card-ext-link">Fonte ↗</a>` : ''}
      </div>
    </article>`;
  }

  function setupCardEventListeners(container) {
    container.querySelectorAll('.source-card').forEach(card => {
      const source = state.sources.find(s => s.id === card.getAttribute('data-source-id'));
      if (!source) return;
      card.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('.tag-chip')) return;
        openDetailModal(source);
      });
    });
  }

  window.filterByTag = function (tag) {
    state.filters.search = tag;
    syncControlsWithState();
    updateUrlParams();
    applyFiltersAndRender();
  };

  // === MODAL ===
  function openDetailModal(source) {
    let overlay = document.getElementById('detailModalOverlay');
    if (!overlay) overlay = createModalElements();
    const modalBody = overlay.querySelector('#modalBodyContent');
    const modalHeaderTitle = overlay.querySelector('#modalHeaderTitle');
    const modalHeaderBadges = overlay.querySelector('#modalHeaderBadges');
    const { id, title, creator, year, type, category, thread, priority, affinity, score_t, score_p, d_scores, url, doi_isbn, status, accessibility, license, description, quote, plain_summary, what_it_shows, why_it_matters, how_to_use_in_thesis, cluster, typographic_operations, technical_stack, workflow_evidence, transferability, limits_criticism, affinity_motivation, evidence_file } = source;
    const tags = asList(source.tags);
    const typoOps = asList(typographic_operations).join(', ');
    modalHeaderTitle.textContent = `${id} — ${title}`;
    modalHeaderBadges.innerHTML = `<span class="badge ${priority === 'PRIMARIA' ? 'badge-prio-primaria' : 'badge-prio-secondaria'}">${priority}</span><span class="badge ${thread === 'TIPOGRAFIA' ? 'badge-thread-tipografia' : (thread === 'TOOL' ? 'badge-thread-tool' : 'badge-thread-entrambi')}">${thread}</span><span class="badge badge-type">${type}</span>`;
    modalBody.innerHTML = `
      <div class="modal-title">${escapeHtml(title)}</div>
      ${cluster ? `<div class="card-cluster" style="margin-bottom: 0.6rem;">◆ Area: ${escapeHtml(cluster)}</div>` : ''}
      ${(plain_summary || what_it_shows || why_it_matters || how_to_use_in_thesis) ? `
        <div class="modal-section">
          <h4 class="modal-section-title">🧭 In parole semplici</h4>
          ${plain_summary ? `<p class="modal-prose">${escapeHtml(plain_summary)}</p>` : ''}
          ${what_it_shows ? `<div class="insight-box"><strong>Cosa mostra</strong>${escapeHtml(what_it_shows)}</div>` : ''}
          ${why_it_matters ? `<div class="insight-box"><strong>Perché conta per la tesi</strong>${escapeHtml(why_it_matters)}</div>` : ''}
          ${how_to_use_in_thesis ? `<div class="insight-box"><strong>Come si usa nel progetto</strong>${escapeHtml(how_to_use_in_thesis)}</div>` : ''}
        </div>
      ` : ''}
      <div class="modal-meta-grid">
        <div class="meta-field"><span class="meta-label">Autore</span><span class="meta-value">${escapeHtml(creator)}</span></div>
        <div class="meta-field"><span class="meta-label">Anno</span><span class="meta-value">${escapeHtml(String(year))}</span></div>
        <div class="meta-field"><span class="meta-label">Categoria</span><span class="meta-value">${escapeHtml(category)} &bull; ${escapeHtml(CATEGORY_MAP[category] || '')}</span></div>
        <div class="meta-field"><span class="meta-label">Stato</span><span class="meta-value">${escapeHtml(status || 'Verificato')}</span></div>
        ${doi_isbn ? `<div class="meta-field"><span class="meta-label">DOI / ISBN</span><span class="meta-value" style="font-family: var(--font-mono); font-size: 0.8rem;">${escapeHtml(doi_isbn)}</span></div>` : ''}
        ${accessibility ? `<div class="meta-field"><span class="meta-label">Accessibilità</span><span class="meta-value">${escapeHtml(accessibility)} ${license ? `(${license})` : ''}</span></div>` : ''}
      </div>
      <div class="modal-section">
        <h4 class="modal-section-title">📊 Punteggi e rilevanza</h4>
        <div class="scores-breakdown">
          <div class="score-box"><div class="score-box-label">Affinità</div><div class="score-box-val">${(affinity || 0).toFixed(1)}%</div></div>
          <div class="score-box"><div class="score-box-label">Score Tipografia</div><div class="score-box-val" style="color: var(--accent-cobalt);">${(score_t || 0).toFixed(1)}</div></div>
          <div class="score-box"><div class="score-box-label">Score Tool</div><div class="score-box-val" style="color: var(--accent-emerald);">${(score_p || 0).toFixed(1)}</div></div>
          ${Array.isArray(d_scores) && d_scores.length ? `<div class="score-box"><div class="score-box-label">D-Scores</div><div class="score-box-val" style="font-size: 1rem;">${d_scores.join(' · ')}</div></div>` : ''}
        </div>
        ${affinity_motivation ? `<p class="modal-prose" style="margin-top: 0.5rem; font-style: italic;"><strong>Motivazione:</strong> ${escapeHtml(affinity_motivation)}</p>` : ''}
      </div>
      ${quote ? `<div class="modal-section"><h4 class="modal-section-title">💬 Citazione</h4><div class="modal-quote-box">«${escapeHtml(quote)}»</div></div>` : ''}
      <div class="modal-section"><h4 class="modal-section-title">📄 Descrizione</h4><p class="modal-prose">${escapeHtml(description)}</p></div>
      ${(typoOps || technical_stack) ? `
        <div class="modal-section">
          <h4 class="modal-section-title">⚙️ Tecniche e operazioni</h4>
          ${typoOps ? `<p class="modal-prose"><strong>Operazioni tipografiche:</strong> ${escapeHtml(typoOps)}</p>` : ''}
          ${technical_stack ? `<p class="modal-prose" style="margin-top: 0.4rem;"><strong>Stack:</strong> ${escapeHtml(technical_stack)}</p>` : ''}
          ${workflow_evidence ? `<p class="modal-prose" style="margin-top: 0.4rem;"><strong>Workflow:</strong> ${escapeHtml(workflow_evidence)}</p>` : ''}
        </div>
      ` : ''}
      <div class="modal-section">
        <h4 class="modal-section-title">🎯 Come entra nella tesi</h4>
        <p class="modal-prose">${escapeHtml(transferability || 'Riferimento teorico e metodologico.')}</p>
        ${limits_criticism ? `<p class="modal-prose" style="margin-top: 0.5rem; color: var(--text-muted);"><strong>Limiti:</strong> ${escapeHtml(limits_criticism)}</p>` : ''}
      </div>
      <div class="modal-section">
        <h4 class="modal-section-title">🏷️ Parole chiave</h4>
        ${tags.length ? `<div class="card-tags" style="margin-bottom: 0.5rem;">${tags.map(t => `<span class="tag-chip">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        ${evidence_file ? `<div style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">Dossier: <code>${escapeHtml(evidence_file)}</code></div>` : ''}
      </div>
    `;
    const modalFooter = overlay.querySelector('#modalFooterContent');
    modalFooter.innerHTML = `
      <button type="button" class="btn btn-secondary" onclick="navigator.clipboard.writeText('${escapeHtml(creator)} (${year}). ${escapeHtml(title)}. ${escapeHtml(doi_isbn || url)}').then(() => alert('Citazione copiata!'))">📋 Copia Citazione</button>
      ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Apri Fonte ↗</a>` : ''}
    `;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function createModalElements() {
    const overlay = document.createElement('div');
    overlay.id = 'detailModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-dialog" role="dialog" aria-modal="true"><div class="modal-header"><div class="modal-header-info"><h3 id="modalHeaderTitle" class="modal-section-title" style="margin: 0;"></h3><div id="modalHeaderBadges" class="card-badges"></div></div><button type="button" class="modal-close-btn" id="modalCloseBtn" aria-label="Chiudi">&times;</button></div><div class="modal-body" id="modalBodyContent"></div><div class="modal-footer" id="modalFooterContent"></div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDetailModal(); });
    overlay.querySelector('#modalCloseBtn').addEventListener('click', closeDetailModal);
    return overlay;
  }

  function closeDetailModal() {
    const overlay = document.getElementById('detailModalOverlay');
    if (overlay && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // === SYNTHESIS ===
  function initSynthesisPage() {
    initReaderControls();
    initTocObserver();
    bindCitationPills();
  }

  function initReaderControls() {
    const article = document.querySelector('.synthesis-article');
    if (!article) return;
    const btnFontMinus = document.getElementById('btnFontMinus');
    const btnFontPlus = document.getElementById('btnFontPlus');
    const btnFontReset = document.getElementById('btnFontReset');
    function applyFontSize(size) {
      state.fontSize = size;
      article.style.fontSize = `${size}%`;
      localStorage.setItem('thesis_font_size', size);
    }
    if (btnFontMinus) btnFontMinus.addEventListener('click', () => applyFontSize(Math.max(85, state.fontSize - 10)));
    if (btnFontPlus) btnFontPlus.addEventListener('click', () => applyFontSize(Math.min(130, state.fontSize + 10)));
    if (btnFontReset) btnFontReset.addEventListener('click', () => applyFontSize(100));
    if (state.fontSize !== 100) applyFontSize(state.fontSize);
    const btnFontSerif = document.getElementById('btnFontSerif');
    const btnFontSans = document.getElementById('btnFontSans');
    function setFontMode(mode) {
      state.fontMode = mode;
      localStorage.setItem('thesis_font_mode', mode);
      if (mode === 'sans') {
        article.classList.add('font-sans-mode');
        if (btnFontSans) btnFontSans.classList.add('active');
        if (btnFontSerif) btnFontSerif.classList.remove('active');
      } else {
        article.classList.remove('font-sans-mode');
        if (btnFontSerif) btnFontSerif.classList.add('active');
        if (btnFontSans) btnFontSans.classList.remove('active');
      }
    }
    if (btnFontSerif) btnFontSerif.addEventListener('click', () => setFontMode('serif'));
    if (btnFontSans) btnFontSans.addEventListener('click', () => setFontMode('sans'));
    setFontMode(state.fontMode);
  }

  function initTocObserver() {
    const tocLinks = document.querySelectorAll('.toc-link');
    const sections = document.querySelectorAll('.synthesis-article h2[id], .synthesis-article section[id]');
    if (!tocLinks.length || !sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          tocLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });
    sections.forEach(sec => observer.observe(sec));
  }

  function bindCitationPills() {
    document.querySelectorAll('.cite-tag').forEach(pill => {
      const sourceId = pill.textContent.replace(/[[]]/g, '').trim();
      pill.addEventListener('click', () => {
        const found = state.sources.find(s => (s.id || '').toUpperCase() === sourceId.toUpperCase());
        if (found) openDetailModal(found);
        else window.location.href = `sources.html?search=${encodeURIComponent(sourceId)}`;
      });
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
})();