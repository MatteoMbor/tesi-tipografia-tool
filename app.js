/**
TESI DI LAUREA MAGISTRALE ISIA 2026 — MATTEO BORGHESE
Archivio Ricerca: Tipografia come Forma & Tool come Atto Progettuale
Modulo Logica Applicativa (app.js) — VERSIONE AGGIORNATA
Gestisce sia database.json (schema vecchio) sia database_v2.json
(chiavi con spazi finali, tag come array, campi cluster/why/how):
tutto viene normalizzato al caricamento da sanitizeRecord().
*/
(function () {
  'use strict';

  // --- DEFINIZIONI & MAPPE METADATI ---
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
    'C01': 'Storia della lettera',
    'C02': 'Esperimenti recenti',
    'C03': 'Fonderie & tool-maker',
    'C04': 'Tool-making',
    'C05': 'Svolta del computer',
    'C06': 'AI ibrida',
    'C07': 'Teoria',
    'C08': 'Video e talk',
    'C09': 'Tool aperti',
    'C10': 'Sul web',
    'C11': 'Etica'
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

  // --- STATO APPLICATIVO GLOBALE ---
  const state = {
    sources: [],
    filteredSources: [],
    filters: {
      category: 'ALL',
      cluster: 'ALL',
      thread: 'ALL',
      priority: 'ALL',
      type: 'ALL',
      year: 'ALL',
      tool: 'ALL',
      search: '',
      sort: 'affinity-desc'
    },
    viewMode: 'grid',
    theme: localStorage.getItem('thesis_theme') || 'dark',
    fontSize: parseInt(localStorage.getItem('thesis_font_size') || '100', 10),
    fontMode: localStorage.getItem('thesis_font_mode') || 'serif'
  };

  // --- INIZIALIZZAZIONE ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initReadingProgress();
    loadDatabase();
  });

  // --- GESTIONE TEMA DARK / LIGHT ---
  function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
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
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Passa a tema chiaro"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
      btn.title = "Attiva tema carta chiara";
    } else {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Passa a tema scuro"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      btn.title = "Attiva tema ossidiana scuro";
    }
  }

  // --- BARRA PROGRESSO LETTURA ---
  function initReadingProgress() {
    const bar = document.querySelector('.reading-bar');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const scrolled = (window.scrollY / docHeight) * 100;
        bar.style.width = `${Math.min(100, Math.max(0, scrolled))}%`;
      }
    }, { passive: true });
  }

  // --- UTILITÀ DI NORMALIZZAZIONE DATI ---
  function asList(value) {
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
    if (value == null || value === '') return [];
    return String(value).split(',').map(s => s.trim()).filter(Boolean);
  }
  function fieldText(value) {
    return asList(value).join(' ').toLowerCase();
  }
  /**
   * Normalizza un record proveniente da QUALSIASI schema:
   * - rimuove gli spazi finali da chiavi e valori stringa (problema di database_v2.json)
   * - converte tags / topic_tags / tool_tags / typographic_operations in array
   * - crea fallback per i campi "semplici" se mancano
   * - corregge il refuso noto di AI-006
   */
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

  // --- CARICAMENTO DATI JSON ---
  async function loadDatabase() {
    const candidatePaths = [
      './data/database_v2.json',
      '../tesi-research/01_RESEARCH/database_v2.json',
      './data/database.json',
      '../tesi-research/01_RESEARCH/database.json'
    ];
    let rawData = null;
    for (const path of candidatePaths) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          rawData = await res.json();
          break;
        }
      } catch (err) {
        // prova prossimo path
      }
    }
    if (!rawData) {
      console.error('Impossibile caricare database.json da nessuno dei percorsi candidati.');
      showGlobalError('Errore nel caricamento del database della ricerca. Assicurati che il server locale sia attivo.');
      return;
    }
    // NORMALIZZAZIONE: qui il database diventa uniforme qualunque sia lo schema di partenza
    state.sources = (Array.isArray(rawData) ? rawData : []).map(sanitizeRecord);
    window.__THESIS_DB__ = state.sources;
    document.querySelectorAll('.js-source-count').forEach(el => {
      el.textContent = String(state.sources.length);
    });
    // Rileva la pagina corrente
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
      errBox.innerHTML = `<div class="no-results-icon">⚠️</div> <div class="no-results-title">Errore di Connessione ai Dati</div> <div class="no-results-desc">${escapeHtml(msg)}</div>`;
      container.prepend(errBox);
    }
  }

  // ==========================================================================
  // PAGINA 1: HOME (index.html)
  // ==========================================================================
  function initHomePage() {
    const data = state.sources;
    if (!data.length) return;
    const totalCount = data.length;
    const catSet = new Set(data.map(d => d.cluster).filter(Boolean));
    const prioPrimary = data.filter(d => (d.priority || '').toUpperCase() === 'PRIMARIA').length;
    const years = data.map(d => d.year).filter(Boolean);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const affinities = data.map(d => parseFloat(d.affinity) || 0).filter(v => v > 0);
    const avgAffinity = affinities.length ? (affinities.reduce((a, b) => a + b, 0) / affinities.length).toFixed(1) : '84.0';
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
    setElText('statTotal', totalCount);
    setElText('statCategories', catSet.size);
    setElText('statPrimary', prioPrimary);
    setElText('statYears', `${minYear}–${maxYear}`);
    setElText('statAvgAffinity', `${avgAffinity}%`);
    setElText('statThreadBoth', threadCounts['ENTRAMBI']);
    renderThreadBars(threadCounts, totalCount);
    renderTypeBars(typeCounts, totalCount);
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
      return `
        <div class="chart-item">
          <div class="chart-item-header">
            <span class="chart-item-label">${escapeHtml(item.label)}</span>
            <span class="chart-item-val">${item.count} fonti (${pct}%)</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill ${item.colorClass}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }
  function renderTypeBars(typeCounts, total) {
    const container = document.getElementById('typeBars');
    if (!container) return;
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    container.innerHTML = sortedTypes.slice(0, 6).map(([type, count], idx) => {
      const pct = ((count / total) * 100).toFixed(1);
      const colors = ['vermilion', 'cobalt', 'emerald', 'amber', 'purple', 'vermilion'];
      const c = colors[idx % colors.length];
      return `
        <div class="chart-item">
          <div class="chart-item-header">
            <span class="chart-item-label" style="text-transform: capitalize;">${escapeHtml(type)}</span>
            <span class="chart-item-val">${count} fonti (${pct}%)</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill ${c}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }
  function renderClustersGrid(data) {
    const grid = document.getElementById('clustersGrid');
    if (!grid) return;
    const counts = {};
    data.forEach(d => {
      if (d.cluster) counts[d.cluster] = (counts[d.cluster] || 0) + 1;
    });
    const names = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
    grid.innerHTML = names.map(name => {
      const count = counts[name];
      return `
        <div class="category-card" onclick="window.location.href='sources.html?cluster=${encodeURIComponent(name)}'">
          <div class="category-card-top">
            <span class="cat-code">AREA</span>
            <span class="cat-count">${count} fonti</span>
          </div>
          <h3 class="cat-title">${escapeHtml(name)}</h3>
          <p class="cat-desc">Apri l'archivio filtrato su questa area.</p>
          <span class="cat-explore-link">Vedi le fonti &rarr;</span>
        </div>
      `;
    }).join('');
  }
  function renderCategoriesGrid(data) {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    const counts = {};
    data.forEach(d => {
      if (d.category) counts[d.category] = (counts[d.category] || 0) + 1;
    });
    const categoryKeys = Object.keys(CATEGORY_MAP).sort();
    grid.innerHTML = categoryKeys.map(code => {
      const count = counts[code] || 0;
      const title = CATEGORY_MAP[code];
      return `
        <div class="category-card" onclick="window.location.href='sources.html?category=${code}'">
          <div class="category-card-top">
            <span class="cat-code">${code}</span>
            <span class="cat-count">${count} fonti</span>
          </div>
          <h3 class="cat-title">${escapeHtml(title)}</h3>
          <p class="cat-desc">${escapeHtml(CATEGORY_SHORT[code] || title)}</p>
          <span class="cat-explore-link">
            Esplora fonti archivio &rarr;
          </span>
        </div>
      `;
    }).join('');
  }
  function renderTopSources(data) {
    const container = document.getElementById('topSourcesGrid');
    if (!container) return;
    const top = [...data]
      .sort((a, b) => (parseFloat(b.affinity) || 0) - (parseFloat(a.affinity) || 0))
      .slice(0, 6);
    container.innerHTML = top.map(renderSourceCardHtml).join('');
    setupCardEventListeners(container);
  }

  // ==========================================================================
  // PAGINA 2: FONTI ARCHIVIO (sources.html)
  // ==========================================================================
  function initSourcesPage() {
    const data = state.sources;
    populateFilterSelects(data);
    const params = new URLSearchParams(window.location.search);
    if (params.has('category')) state.filters.category = params.get('category');
    if (params.has('cluster')) state.filters.cluster = params.get('cluster');
    if (params.has('thread')) state.filters.thread = params.get('thread');
    if (params.has('priority')) state.filters.priority = params.get('priority');
    if (params.has('type')) state.filters.type = params.get('type');
    if (params.has('year')) state.filters.year = params.get('year');
    if (params.has('tool')) state.filters.tool = params.get('tool');
    if (params.has('search')) state.filters.search = params.get('search');
    if (params.has('sort')) state.filters.sort = params.get('sort');
    syncControlsWithState();
    bindControlEvents();
    applyFiltersAndRender();
    if (params.has('id')) {
      const targetId = params.get('id');
      const found = data.find(s => (s.id || '').toUpperCase() === targetId.toUpperCase());
      if (found) {
        setTimeout(() => openDetailModal(found), 200);
      }
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
      let opts = `<option value="ALL">Tutte le categorie (${data.length})</option>`;
      Object.keys(CATEGORY_MAP).sort().forEach(code => {
        const count = catCounts[code] || 0;
        opts += `<option value="${code}">${code} — ${escapeHtml(CATEGORY_SHORT[code])} (${count})</option>`;
      });
      selCat.innerHTML = opts;
    }
    if (selCluster) {
      const clusterCounts = {};
      data.forEach(d => { if (d.cluster) clusterCounts[d.cluster] = (clusterCounts[d.cluster] || 0) + 1; });
      const names = Object.keys(clusterCounts).sort();
      let opts = `<option value="ALL">Tutte le aree (${data.length})</option>`;
      names.forEach(name => {
        opts += `<option value="${escapeHtml(name)}">${escapeHtml(name)} (${clusterCounts[name]})</option>`;
      });
      selCluster.innerHTML = opts;
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
      let opts = '<option value="ALL">Tutti i filoni</option>';
      ['ENTRAMBI', 'TOOL', 'TIPOGRAFIA'].forEach(th => {
        const c = thCounts[th] || 0;
        opts += `<option value="${th}">${escapeHtml(THREAD_MAP[th] || th)} (${c})</option>`;
      });
      selThread.innerHTML = opts;
    }
    if (selPrio) {
      const prioCounts = {};
      data.forEach(d => { if (d.priority) prioCounts[d.priority] = (prioCounts[d.priority] || 0) + 1; });
      let opts = '<option value="ALL">Tutte le priorità</option>';
      ['PRIMARIA', 'SECONDARIA', 'CONTESTO'].forEach(p => {
        const c = prioCounts[p] || 0;
        opts += `<option value="${p}">${p} (${c})</option>`;
      });
      selPrio.innerHTML = opts;
    }
    if (selType) {
      const typeCounts = {};
      data.forEach(d => {
        const t = (d.type || '').toLowerCase();
        if (t) typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      let opts = '<option value="ALL">Tutti i tipi</option>';
      Object.keys(typeCounts).sort().forEach(t => {
        opts += `<option value="${t}">${t} (${typeCounts[t]})</option>`;
      });
      selType.innerHTML = opts;
    }
    if (selYear) {
      let opts = '<option value="ALL">Tutti gli anni</option>';
      YEAR_BUCKETS.forEach(b => {
        const c = data.filter(d => yearBucketId(d.year) === b.id).length;
        opts += `<option value="${b.id}">${b.label} (${c})</option>`;
      });
      selYear.innerHTML = opts;
    }
    if (selTool) {
      const toolCounts = {};
      data.forEach(d => {
        asList(d.tool_tags).forEach(tag => {
          toolCounts[tag] = (toolCounts[tag] || 0) + 1;
        });
      });
      let opts = '<option value="ALL">Tutti gli strumenti</option>';
      Object.keys(toolCounts).sort((a, b) => a.localeCompare(b)).forEach(t => {
        opts += `<option value="${escapeHtml(t)}">${escapeHtml(t)} (${toolCounts[t]})</option>`;
      });
      selTool.innerHTML = opts;
    }
  }
  function syncControlsWithState() {
    const selCat = document.getElementById('filterCategory');
    const selCluster = document.getElementById('filterCluster');
    const selThread = document.getElementById('filterThread');
    const selPrio = document.getElementById('filterPriority');
    const selType = document.getElementById('filterType');
    const selYear = document.getElementById('filterYear');
    const selTool = document.getElementById('filterTool');
    const selSort = document.getElementById('sortSelect');
    const inputSearch = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (selCat) selCat.value = state.filters.category;
    if (selCluster) selCluster.value = state.filters.cluster;
    if (selThread) selThread.value = state.filters.thread;
    if (selPrio) selPrio.value = state.filters.priority;
    if (selType) selType.value = state.filters.type;
    if (selYear) selYear.value = state.filters.year;
    if (selTool) selTool.value = state.filters.tool;
    if (selSort) selSort.value = state.filters.sort;
    if (inputSearch) {
      inputSearch.value = state.filters.search;
      if (clearBtn) clearBtn.classList.toggle('visible', !!state.filters.search);
    }
  }
  function bindControlEvents() {
    const selCat = document.getElementById('filterCategory');
    const selCluster = document.getElementById('filterCluster');
    const selThread = document.getElementById('filterThread');
    const selPrio = document.getElementById('filterPriority');
    const selType = document.getElementById('filterType');
    const selYear = document.getElementById('filterYear');
    const selTool = document.getElementById('filterTool');
    const selSort = document.getElementById('sortSelect');
    const inputSearch = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const btnReset = document.getElementById('btnResetFilters');
    const viewGridBtn = document.getElementById('viewGridBtn');
    const viewListBtn = document.getElementById('viewListBtn');
    if (selCat) selCat.addEventListener('change', e => { state.filters.category = e.target.value; updateUrlParams(); applyFiltersAndRender(); });
    if (selCluster) selCluster.addEventListener('change', e => { state.filters.cluster = e.target.value; populateFilterSelects(state.sources); updateUrlParams(); applyFiltersAndRender(); });
    if (selThread) selThread.addEventListener('change', e => { state.filters.thread = e.target.value; updateUrlParams(); applyFiltersAndRender(); });
    if (selPrio) selPrio.addEventListener('change', e => { state.filters.priority = e.target.value; updateUrlParams(); applyFiltersAndRender(); });
    if (selType) selType.addEventListener('change', e => { state.filters.type = e.target.value; updateUrlParams(); applyFiltersAndRender(); });
    if (selYear) selYear.addEventListener('change', e => { state.filters.year = e.target.value; updateUrlParams(); applyFiltersAndRender(); });
    if (selTool) selTool.addEventListener('change', e => { state.filters.tool = e.target.value; updateUrlParams(); applyFiltersAndRender(); });
    if (selSort) selSort.addEventListener('change', e => { state.filters.sort = e.target.value; updateUrlParams(); applyFiltersAndRender(); });
    let debounceTimer;
    if (inputSearch) {
      inputSearch.addEventListener('input', e => {
        clearTimeout(debounceTimer);
        const val = e.target.value.trim();
        if (clearBtn) clearBtn.classList.toggle('visible', !!val);
        debounceTimer = setTimeout(() => {
          state.filters.search = val;
          updateUrlParams();
          applyFiltersAndRender();
        }, 220);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (inputSearch) inputSearch.value = '';
        clearBtn.classList.remove('visible');
        state.filters.search = '';
        updateUrlParams();
        applyFiltersAndRender();
      });
    }
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        state.filters = {
          category: 'ALL',
          cluster: 'ALL',
          thread: 'ALL',
          priority: 'ALL',
          type: 'ALL',
          year: 'ALL',
          tool: 'ALL',
          search: '',
          sort: 'affinity-desc'
        };
        populateFilterSelects(state.sources);
        syncControlsWithState();
        updateUrlParams();
        applyFiltersAndRender();
      });
    }
    if (viewGridBtn && viewListBtn) {
      viewGridBtn.addEventListener('click', () => {
        state.viewMode = 'grid';
        viewGridBtn.classList.add('active');
        viewListBtn.classList.remove('active');
        const grid = document.getElementById('sourcesGrid');
        if (grid) grid.classList.remove('list-view');
      });
      viewListBtn.addEventListener('click', () => {
        state.viewMode = 'list';
        viewListBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
        const grid = document.getElementById('sourcesGrid');
        if (grid) grid.classList.add('list-view');
      });
    }
    window.addEventListener('keydown', e => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) && document.activeElement !== inputSearch) {
        if (inputSearch) {
          e.preventDefault();
          inputSearch.focus();
          inputSearch.select();
        }
      } else if (e.key === 'Escape') {
        closeDetailModal();
      }
    });
  }
  function updateUrlParams() {
    const params = new URLSearchParams();
    if (state.filters.category !== 'ALL') params.set('category', state.filters.category);
    if (state.filters.cluster !== 'ALL') params.set('cluster', state.filters.cluster);
    if (state.filters.thread !== 'ALL') params.set('thread', state.filters.thread);
    if (state.filters.priority !== 'ALL') params.set('priority', state.filters.priority);
    if (state.filters.type !== 'ALL') params.set('type', state.filters.type);
    if (state.filters.year !== 'ALL') params.set('year', state.filters.year);
    if (state.filters.tool !== 'ALL') params.set('tool', state.filters.tool);
    if (state.filters.search) params.set('search', state.filters.search);
    if (state.filters.sort !== 'affinity-desc') params.set('sort', state.filters.sort);
    const newQuery = params.toString();
    const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '');
    window.history.replaceState({}, '', newUrl);
  }
  function applyFiltersAndRender() {
    let result = [...state.sources];
    const { category, thread, priority, type, search, sort } = state.filters;
    if (category !== 'ALL') {
      result = result.filter(d => (d.category || '').toUpperCase() === category.toUpperCase());
    }
    if (thread !== 'ALL') {
      result = result.filter(d => (d.thread || '').toUpperCase() === thread.toUpperCase());
    }
    if (priority !== 'ALL') {
      result = result.filter(d => (d.priority || '').toUpperCase() === priority.toUpperCase());
    }
    if (type !== 'ALL') {
      result = result.filter(d => (d.type || '').toLowerCase() === type.toLowerCase());
    }
    // Ricerca Full-Text (sicura sia con tag come stringa sia come array)
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d => {
        const hay = [
          d.id, d.title, d.creator, d.plain_summary, d.description, d.quote,
          asList(d.tags).join(' '), asList(d.topic_tags).join(' '),
          asList(d.typographic_operations).join(' '), asList(d.tool_tags).join(' '),
          d.technical_stack, d.transferability, d.cluster, String(d.year || '')
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    result.sort((a, b) => {
      const affA = parseFloat(a.affinity) || 0;
      const affB = parseFloat(b.affinity) || 0;
      const yearA = parseInt(a.year || '0', 10);
      const yearB = parseInt(b.year || '0', 10);
      const scoreTA = parseFloat(a.score_t) || 0;
      const scoreTB = parseFloat(b.score_t) || 0;
      const scorePA = parseFloat(a.score_p) || 0;
      const scorePB = parseFloat(b.score_p) || 0;
      switch (sort) {
        case 'affinity-asc': return affA - affB;
        case 'year-desc': return yearB - yearA;
        case 'year-asc': return yearA - yearB;
        case 'title-asc': return (a.title || '').localeCompare(b.title || '');
        case 'score_t-desc': return scoreTB - scoreTA;
        case 'score_p-desc': return scorePB - scorePA;
        case 'affinity-desc':
        default:
          return affB - affA;
      }
    });
    state.filteredSources = result;
    const countEl = document.getElementById('resultsCount');
    if (countEl) {
      countEl.innerHTML = `Visualizzate <strong>${result.length}</strong> su ${state.sources.length} fonti`;
    }
    const grid = document.getElementById('sourcesGrid');
    if (!grid) return;
    if (result.length === 0) {
      grid.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <div class="no-results-title">Nessuna fonte trovata</div>
          <div class="no-results-desc">Nessuna fonte corrisponde ai filtri o alla ricerca di adesso. Prova ad allargare il campo.</div>
          <button class="btn btn-secondary" onclick="document.getElementById('btnResetFilters').click()">Reimposta tutti i filtri</button>
        </div>
      `;
    } else {
      grid.innerHTML = result.map(renderSourceCardHtml).join('');
      setupCardEventListeners(grid);
    }
  }

  // Render HTML Card Singola Fonte
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
    return `
      <article class="source-card ${prioClass}" data-source-id="${escapeHtml(id)}">
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
        <div class="card-meta-line">
          <span>📁 ${escapeHtml(category)} &bull; ${escapeHtml(catName)}</span>
        </div>
        ${cluster ? `<div class="card-cluster">◆ ${escapeHtml(cluster)}</div>` : ''}
        <div class="card-affinity-wrap">
          <div class="card-affinity-header">
            <span>Quanto c'entra con la tesi</span>
            <span class="affinity-score-val">${affinity.toFixed(1)}%</span>
          </div>
          <div class="affinity-bar-track">
            <div class="affinity-bar-fill" style="width: ${Math.min(100, affinity)}%"></div>
          </div>
        </div>
        ${desc ? `<p class="card-description">${escapeHtml(desc)}</p>` : ''}
        ${why ? `<p class="card-why"><strong>Perché conta:</strong> ${escapeHtml(why)}</p>` : ''}
        ${quote ? `<div class="card-quote">«${escapeHtml(quote)}»</div>` : ''}
        ${tags.length ? `
          <div class="card-tags">
            ${tags.map(t => `<span class="tag-chip" onclick="event.stopPropagation(); filterByTag('${escapeHtml(t)}');">#${escapeHtml(t)}</span>`).join('')}
          </div>
        ` : ''}
        <div class="card-footer">
          <button type="button" class="btn-detail" data-action="open-modal">
            Scheda completa &rarr;
          </button>
          ${url ? `
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="card-ext-link" title="Apri risorsa originale">
              Fonte DOI/URL ↗
            </a>
          ` : ''}
        </div>
      </article>
    `;
  }
  function setupCardEventListeners(container) {
    const cards = container.querySelectorAll('.source-card');
    cards.forEach(card => {
      const sourceId = card.getAttribute('data-source-id');
      const source = state.sources.find(s => s.id === sourceId);
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

  // ==========================================================================
  // MODAL SCHEDA ANALITICA DETTAGLIATA
  // ==========================================================================
  function openDetailModal(source) {
    let overlay = document.getElementById('detailModalOverlay');
    if (!overlay) {
      overlay = createModalElements();
    }
    const modalBody = overlay.querySelector('#modalBodyContent');
    const modalHeaderTitle = overlay.querySelector('#modalHeaderTitle');
    const modalHeaderBadges = overlay.querySelector('#modalHeaderBadges');
    const id = source.id || 'N/A';
    const title = source.title || 'Senza titolo';
    const creator = source.creator || 'Autore sconosciuto';
    const year = source.year || 'N/A';
    const type = source.type || 'sorgente';
    const category = source.category || '';
    const catFullName = CATEGORY_MAP[category] || category;
    const thread = source.thread || 'ENTRAMBI';
    const priority = source.priority || 'SECONDARIA';
    const affinity = parseFloat(source.affinity) || 0;
    const scoreT = parseFloat(source.score_t) || 0;
    const scoreP = parseFloat(source.score_p) || 0;
    const dScores = Array.isArray(source.d_scores) ? source.d_scores : [];
    const url = source.url || '';
    const doi = source.doi_isbn || '';
    const status = source.status || '';
    const language = source.language || 'it';
    const accessibility = source.accessibility || '';
    const license = source.license || '';
    const description = source.description || '';
    const quote = source.quote || '';
    const tags = asList(source.tags);
    const plain = source.plain_summary || '';
    const shows = source.what_it_shows || '';
    const why = source.why_it_matters || '';
    const how = source.how_to_use_in_thesis || '';
    const cluster = source.cluster || '';
    const typoOpsList = asList(source.typographic_operations);
    const typoOps = typoOpsList.join(', ');
    const techStack = source.technical_stack || '';
    const workflow = source.workflow_evidence || '';
    const transfer = source.transferability || '';
    const limits = source.limits_criticism || '';
    const motivation = source.affinity_motivation || '';
    const evidenceFile = source.evidence_file || '';
    modalHeaderTitle.textContent = `${id} — ${title}`;
    modalHeaderBadges.innerHTML = `
      <span class="badge ${priority === 'PRIMARIA' ? 'badge-prio-primaria' : 'badge-prio-secondaria'}">${priority}</span>
      <span class="badge ${thread === 'TIPOGRAFIA' ? 'badge-thread-tipografia' : (thread === 'TOOL' ? 'badge-thread-tool' : 'badge-thread-entrambi')}">${thread}</span>
      <span class="badge badge-type">${type}</span>
    `;
    modalBody.innerHTML = `
      <div class="modal-title">${escapeHtml(title)}</div>
      ${cluster ? `<div class="card-cluster" style="margin-bottom: 0.6rem;">◆ Area tematica: ${escapeHtml(cluster)}</div>` : ''}
      ${(plain || shows || why || how) ? `
        <div class="modal-section">
          <h4 class="modal-section-title">🧭 In parole semplici</h4>
          ${plain ? `<p class="modal-prose">${escapeHtml(plain)}</p>` : ''}
          ${shows ? `<div class="insight-box"><strong>Cosa mostra</strong>${escapeHtml(shows)}</div>` : ''}
          ${why ? `<div class="insight-box"><strong>Perché conta per la tesi</strong>${escapeHtml(why)}</div>` : ''}
          ${how ? `<div class="insight-box"><strong>Come si usa nel progetto</strong>${escapeHtml(how)}</div>` : ''}
        </div>
      ` : ''}
      <!-- Metadati Principali -->
      <div class="modal-meta-grid">
        <div class="meta-field">
          <span class="meta-label">Autore / Curatore</span>
          <span class="meta-value">${escapeHtml(creator)}</span>
        </div>
        <div class="meta-field">
          <span class="meta-label">Anno / Cronologia</span>
          <span class="meta-value">${escapeHtml(String(year))}</span>
        </div>
        <div class="meta-field">
          <span class="meta-label">Categoria</span>
          <span class="meta-value">${escapeHtml(category)} &bull; ${escapeHtml(catFullName)}</span>
        </div>
        <div class="meta-field">
          <span class="meta-label">Verifica & Stato</span>
          <span class="meta-value">${escapeHtml(status || 'Verificato')}</span>
        </div>
        ${doi ? `
          <div class="meta-field">
            <span class="meta-label">DOI / ISBN / Atti</span>
            <span class="meta-value" style="font-family: var(--font-mono); font-size: 0.8rem;">${escapeHtml(doi)}</span>
          </div>
        ` : ''}
        ${accessibility ? `
          <div class="meta-field">
            <span class="meta-label">Accessibilità & Licenza</span>
            <span class="meta-value">${escapeHtml(accessibility)} ${license ? `(${license})` : ''}</span>
          </div>
        ` : ''}
      </div>
      <!-- Matrice Punteggi & Affinità -->
      <div class="modal-section">
        <h4 class="modal-section-title">📊 Punteggi & Rilevanza</h4>
        <div class="scores-breakdown">
          <div class="score-box">
            <div class="score-box-label">Affinità Globale</div>
            <div class="score-box-val">${affinity.toFixed(1)}%</div>
          </div>
          <div class="score-box">
            <div class="score-box-label">Score Tipografia (T)</div>
            <div class="score-box-val" style="color: var(--accent-cobalt);">${scoreT.toFixed(1)}</div>
          </div>
          <div class="score-box">
            <div class="score-box-label">Score Tool (P)</div>
            <div class="score-box-val" style="color: var(--accent-emerald);">${scoreP.toFixed(1)}</div>
          </div>
          ${dScores.length ? `
            <div class="score-box">
              <div class="score-box-label">D-Scores (5 Assi)</div>
              <div class="score-box-val" style="font-size: 1rem; color: var(--text-secondary);">${dScores.join(' · ')}</div>
            </div>
          ` : ''}
        </div>
        ${motivation ? `<p class="modal-prose" style="margin-top: 0.5rem; font-style: italic;"><strong>Motivazione affinità:</strong> ${escapeHtml(motivation)}</p>` : ''}
      </div>
      <!-- Citazione Chiave -->
      ${quote ? `
        <div class="modal-section">
          <h4 class="modal-section-title">💬 Citazione Chiave</h4>
          <div class="modal-quote-box">«${escapeHtml(quote)}»</div>
        </div>
      ` : ''}
      <!-- Descrizione Analitica -->
      <div class="modal-section">
        <h4 class="modal-section-title">📄 Descrizione completa</h4>
        <p class="modal-prose">${escapeHtml(description)}</p>
      </div>
      <!-- Operazioni Tipografiche & Stack Tecnico -->
      ${(typoOps || techStack) ? `
        <div class="modal-section">
          <h4 class="modal-section-title">⚙️ Tecniche e operazioni sulla lettera</h4>
          ${typoOps ? `<p class="modal-prose"><strong>Operazioni tipografiche:</strong> ${escapeHtml(typoOps)}</p>` : ''}
          ${techStack ? `<p class="modal-prose" style="margin-top: 0.4rem;"><strong>Stack tecnologico / Metodologia:</strong> ${escapeHtml(techStack)}</p>` : ''}
          ${workflow ? `<p class="modal-prose" style="margin-top: 0.4rem;"><strong>Evidenza di workflow:</strong> ${escapeHtml(workflow)}</p>` : ''}
        </div>
      ` : ''}
      <!-- Trasferibilità alla Tesi & Limiti -->
      <div class="modal-section">
        <h4 class="modal-section-title">🎯 Come entra nella tesi</h4>
        <p class="modal-prose">${escapeHtml(transfer || 'Riferimento teorico e metodologico generale.')}</p>
        ${limits ? `<p class="modal-prose" style="margin-top: 0.5rem; color: var(--text-muted);"><strong>Limiti e criticità:</strong> ${escapeHtml(limits)}</p>` : ''}
      </div>
      <!-- Tags & File Evidenza -->
      <div class="modal-section">
        <h4 class="modal-section-title">🏷️ Parole chiave e materiali di lavoro</h4>
        ${tags.length ? `
          <div class="card-tags" style="margin-bottom: 0.5rem;">
            ${tags.map(t => `<span class="tag-chip">#${escapeHtml(t)}</span>`).join('')}
          </div>
        ` : ''}
        ${evidenceFile ? `
          <div style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">
            Dossier evidenza: <code>${escapeHtml(evidenceFile)}</code>
          </div>
        ` : ''}
      </div>
    `;
    const modalFooter = overlay.querySelector('#modalFooterContent');
    modalFooter.innerHTML = `
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button type="button" class="btn btn-secondary" onclick="navigator.clipboard.writeText('${escapeHtml(creator)} (${year}). ${escapeHtml(title)}. ${escapeHtml(doi || url)}').then(() => alert('Citazione bibliografica copiata negli appunti!'))">
          📋 Copia Citazione
        </button>
      </div>
      <div>
        ${url ? `
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            Apri Fonte Esterna ↗
          </a>
        ` : ''}
      </div>
    `;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function createModalElements() {
    const overlay = document.createElement('div');
    overlay.id = 'detailModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-dialog" role="dialog" aria-modal="true"> <div class="modal-header"> <div class="modal-header-info"> <h3 id="modalHeaderTitle" class="modal-section-title" style="margin: 0;"></h3> <div id="modalHeaderBadges" class="card-badges"></div> </div> <button type="button" class="modal-close-btn" id="modalCloseBtn" aria-label="Chiudi finestra">&times;</button> </div> <div class="modal-body" id="modalBodyContent"></div> <div class="modal-footer" id="modalFooterContent"></div> </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDetailModal();
    });
    const closeBtn = overlay.querySelector('#modalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeDetailModal);
    return overlay;
  }
  function closeDetailModal() {
    const overlay = document.getElementById('detailModalOverlay');
    if (overlay && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // ==========================================================================
  // PAGINA 3: STATO DELL'ARTE (synthesis.html)
  // ==========================================================================
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
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, {
      rootMargin: '-80px 0px -70% 0px',
      threshold: 0
    });
    sections.forEach(sec => observer.observe(sec));
  }
  function bindCitationPills() {
    const pills = document.querySelectorAll('.cite-tag');
    pills.forEach(pill => {
      const sourceId = pill.textContent.replace(/[[]]/g, '').trim();
      pill.addEventListener('click', () => {
        const found = state.sources.find(s => (s.id || '').toUpperCase() === sourceId.toUpperCase());
        if (found) {
          openDetailModal(found);
        } else {
          window.location.href = `sources.html?search=${encodeURIComponent(sourceId)}`;
        }
      });
    });
  }

  // Utility Escaping HTML
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();