/**
 * app.js — UI layer: hash router, views, and interactions.
 * Static, buildless SPA — works on GitHub Pages out of the box.
 */
(() => {
  'use strict';

  const view = document.getElementById('view');
  const fileInput = document.getElementById('file-input');
  const uploadZoneStub = () => document.getElementById('upload-zone');

  /* ---------------- Icons ---------------- */

  const icons = {
    chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M4 9h3M4 15h3M17 9h3M17 15h3M9 4v3M15 4v3M9 17v3M15 17v3"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.6 2.6-2.1-.7-.7-2.1L14.7 6.3z"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>',
    wave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h3l2-6 4 12 3-9 2 3h6"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l14-14 4 4L7 21l-4-4z"/><path d="M8 12l2 2M11 9l2 2M14 6l2 2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 .9-8.9 6.5 6.5 0 0 0-12.6 1.6A4 4 0 0 0 6 19h11.5z"/><path d="M12 13v6M9.5 15.5L12 13l2.5 2.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M4 12H2m20 0h-2M12 4V2m0 20v-2"/></svg>',
    images: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-11 11"/></svg>'
  };

  /* ---------------- Utilities ---------------- */

  function esc(s) {
    const AMP = String.fromCharCode(38);
    const map = {};
    map[38] = AMP + 'amp;';
    map[60] = AMP + 'lt;';
    map[62] = AMP + 'gt;';
    map[34] = AMP + 'quot;';
    map[39] = AMP + '#39;';
    return String(s).replace(/[&<>"']/g, (c) => map[c.charCodeAt(0)]);
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  let toastTimer;
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  const LABELS = {
    manipulated: { text: 'Likely AI / Manipulated', badge: 'Manipulated' },
    authentic: { text: 'Likely Authentic Capture', badge: 'Authentic' },
    inconclusive: { text: 'Inconclusive', badge: 'Inconclusive' }
  };

  function confidencePct(c) {
    return Math.round(c * 100) + '%';
  }

  function signalIconClass(s) {
    if (s.weight > 0.15) return 'found-ai';
    if (s.weight < -0.15) return 'found-human';
    return '';
  }

  /* ---------------- Router ---------------- */

  const routes = { '': renderAnalyze, '#/': renderAnalyze, '#/analyze': renderAnalyze, '#/history': renderHistory, '#/settings': renderSettings };

  function route() {
    const hash = location.hash || '#/';
    const render = routes[hash] || renderAnalyze;
    view.innerHTML = '';
    render();
    const name = hash === '#/history' ? 'history' : hash === '#/settings' ? 'settings' : 'analyze';
    document.querySelectorAll('.nav-pill').forEach((p) => {
      p.classList.toggle('active', p.dataset.route === name);
    });
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);

  /* ---------------- Analyze view ---------------- */

  let lastResult = null;

  function renderAnalyze() {
    const s = Store.getSettings();
    view.innerHTML = `
      <section class="hero">
        <span class="hero-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3"/>
            <circle cx="12" cy="12" r="3.2"/>
          </svg>
        </span>
        <h1>Media Authenticity Analyzer</h1>
        <p class="hero-sub">Upload a photo to estimate whether it's an authentic human capture or AI-manipulated.</p>
        <div class="hero-tags">
          <span class="tag-pill ai">${icons.chip} AI / Manipulated</span>
          <span class="hero-divider" aria-hidden="true"></span>
          <span class="tag-pill human">${icons.user} Human / Authentic</span>
        </div>
        <a href="#/settings" class="btn" data-testid="link-settings">${icons.gear} Go to Settings</a>
      </section>

      <div class="upload-zone" id="upload-zone" role="button" tabindex="0"
           aria-label="Upload an image to analyze" data-testid="upload-zone">
        <span class="cloud" aria-hidden="true">${icons.cloud}</span>
        <p class="primary-text">Drop an image or click to upload</p>
        <p class="secondary-text">PNG or JPEG — images containing human faces work best</p>
      </div>

      <div id="analysis-area"></div>

      <div id="engine-note" style="margin-top: var(--space-6);"></div>
    `;

    const zone = document.getElementById('upload-zone');
    const area = document.getElementById('analysis-area');

    if (s.engine === 'api' && s.apiEndpoint) {
      document.getElementById('engine-note').innerHTML = `
        <div class="notice">
          ${icons.shield}
          <span>Detection engine: <strong>custom API</strong> — your image will be sent to <span style="overflow-wrap:anywhere">${esc(s.apiEndpoint)}</span> for analysis.</span>
        </div>`;
    } else {
      document.getElementById('engine-note').innerHTML = `
        <div class="notice">
          ${icons.info}
          <span>Detection engine: <strong>heuristic preview</strong> — metadata and pixel-level checks that run entirely in your browser. The team's trained deep-learning model will connect here once available (see Settings).</span>
        </div>`;
    }

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) analyzeFile(file, area);
    });

    if (lastResult) renderResult(lastResult, area);
  }

  /* ---------------- Analysis flow ---------------- */

  function analyzeFile(file, area) {
    const settings = Store.getSettings();
    const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    area.innerHTML = `
      <div class="analysis-card" data-testid="analysis-card">
        <div class="analysis-head">
          <div class="analysis-thumb" style="display:grid;place-items:center;color:var(--color-text-faint)">${icons.images}</div>
          <div class="analysis-file">
            <div class="name">${esc(file.name)}</div>
            <div class="meta">${(file.size / 1024).toFixed(0)} KB — analyzing…</div>
          </div>
        </div>
        <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
        <div class="result-body">
          <p class="secondary-text" style="color:var(--color-text-muted)">Running detection${settings.engine === 'api' ? ' via API' : ' (heuristic preview)'}…</p>
        </div>
      </div>`;
    area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const fill = document.getElementById('progress-fill');
    let p = 0;
    const tick = setInterval(() => {
      p = Math.min(90, p + 12 + Math.random() * 10);
      fill.style.width = p + '%';
    }, 120);

    const started = performance.now();

    Analyzer.analyze(file, settings)
      .then((result) => {
        const elapsed = performance.now() - started;
        const wait = Math.max(0, 700 - elapsed);
        setTimeout(() => {
          clearInterval(tick);
          fill.style.width = '100%';

          const entry = {
            id,
            filename: file.name,
            timestamp: Date.now(),
            label: result.label,
            confidence: result.confidence,
            thumbnail: result.thumbnail || '',
            engine: result.engine,
            explanation: result.explanation,
            signals: result.signals
          };

          if (Store.getSettings().saveHistory) {
            Store.saveHistoryEntry(entry);
            if (!Store.isPersistent()) {
              toast('Preview storage is temporary here — history will persist once hosted on GitHub Pages.');
            }
          }

          lastResult = entry;
          renderResult(entry, area, true);
        }, wait);
      })
      .catch((err) => {
        clearInterval(tick);
        area.innerHTML = `
          <div class="analysis-card">
            <div class="result-body">
              <div class="notice" style="background:var(--color-danger-highlight)">
                ${icons.info}
                <span>${esc(err.message)}</span>
              </div>
              <div class="result-actions">
                <button class="btn" id="retry-btn" data-testid="button-retry">Try another file</button>
              </div>
            </div>
          </div>`;
        document.getElementById('retry-btn').addEventListener('click', () => fileInput.click());
      });
  }

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      const area = document.getElementById('analysis-area');
      if (area) analyzeFile(fileInput.files[0], area);
    }
    fileInput.value = '';
  });

  function renderResult(entry, area, animate = false) {
    const l = LABELS[entry.label];
    const pct = confidencePct(entry.confidence);
    const badgeClass = entry.label;
    const summaryClass = entry.label;
    const meterColor =
      entry.label === 'authentic' ? 'var(--color-peach-strong)' :
      entry.label === 'manipulated' ? 'var(--color-primary)' :
      'var(--color-text-faint)';

    area.innerHTML = `
      <div class="analysis-card" data-testid="result-card">
        <div class="analysis-head">
          ${entry.thumbnail
            ? `<img class="analysis-thumb" src="${entry.thumbnail}" alt="Analyzed image thumbnail" />`
            : `<div class="analysis-thumb" style="display:grid;place-items:center;color:var(--color-text-faint)">${icons.images}</div>`}
          <div class="analysis-file">
            <div class="name">${esc(entry.filename)}</div>
            <div class="meta">${fmtDate(entry.timestamp)} — engine: ${entry.engine === 'api' ? 'custom API model' : 'heuristic preview'}</div>
          </div>
          <span class="result-badge ${badgeClass}">${entry.label === 'authentic' ? icons.user : icons.chip} ${l.badge}</span>
        </div>
        <div class="result-body">
          <div class="result-summary ${summaryClass}">
            <div>
              <p class="result-label">Classification</p>
              <p class="result-classification">${l.text}</p>
            </div>
            <div class="result-confidence">
              <p class="result-label">Confidence</p>
              <p class="value">${pct}</p>
              <div class="confidence-meter"><div class="confidence-fill" style="width:${pct};background:${meterColor}"></div></div>
              <p class="caption">confidence is an estimate, not proof</p>
            </div>
          </div>

          <p>${esc(entry.explanation)}</p>

          ${entry.signals && entry.signals.length ? `
          <div>
            <p class="result-label" style="margin-bottom:var(--space-2)">Signal breakdown</p>
            <div class="signal-list">
              ${entry.signals.map((s) => `
                <div class="signal-row">
                  <span class="signal-icon ${signalIconClass(s)}">${icons[s.icon] || icons.file}</span>
                  <div class="signal-body">
                    <p class="title">${esc(s.title)}</p>
                    <p class="detail">${esc(s.detail)}</p>
                  </div>
                  <span class="signal-weight">${s.weight > 0 ? '+' : ''}${s.weight.toFixed(2)}</span>
                </div>`).join('')}
            </div>
          </div>` : ''}

          <div class="notice">
            ${icons.info}
            <span>Limitations: this system analyzes PNG/JPEG images (faces work best); short videos and large files are future work. Heuristic results are indicative — no automated tool can definitively prove an image is real or fake.</span>
          </div>

          <div class="result-actions">
            <button class="btn primary" id="analyze-another" data-testid="button-analyze-another">${icons.cloud} Analyze another image</button>
            <a class="btn" href="#/history" data-testid="link-history">${icons.clock} View history</a>
          </div>
        </div>
      </div>`;

    document.getElementById('analyze-another').addEventListener('click', () => fileInput.click());
    if (animate) area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------------- History view ---------------- */

  function renderHistory() {
    const history = Store.getHistory();
    view.innerHTML = `
      <div class="page-head">
        <span class="page-icon">${icons.clock}</span>
        <h1>Analysis History</h1>
        <span class="spacer"></span>
        ${history.length ? `<button class="btn danger-ghost" id="clear-history" data-testid="button-clear-history">${icons.trash} Clear all</button>` : ''}
      </div>
      <p style="color:var(--color-text-muted);margin-bottom:var(--space-6);font-size:var(--text-sm)">
        Saved on this browser only — nothing is uploaded or synced anywhere.
      </p>
      <div class="history-list" id="history-list"></div>`;

    const list = document.getElementById('history-list');

    if (!history.length) {
      list.innerHTML = `
        <div class="empty-state">
          ${icons.images}
          <p>No analyses yet. Upload an image on the Analyze tab and it will appear here.</p>
          <a class="btn primary" href="#/" data-testid="link-analyze">${icons.cloud} Analyze an image</a>
        </div>`;
      return;
    }

    list.innerHTML = history.map((h) => {
      const l = LABELS[h.label] || LABELS.inconclusive;
      return `
        <div class="history-card" data-id="${h.id}" data-testid="history-card-${h.id}">
          ${h.thumbnail
            ? `<img class="history-thumb" src="${h.thumbnail}" alt="Thumbnail of ${esc(h.filename)}" data-open="${h.id}" />`
            : `<div class="history-thumb" style="display:grid;place-items:center;color:var(--color-text-faint)">${icons.images}</div>`}
          <div class="history-info">
            <p class="name">${esc(h.filename)}</p>
            <p class="timestamp">${fmtDate(h.timestamp)} — engine: ${h.engine === 'api' ? 'custom API model' : 'heuristic preview'}</p>
          </div>
          <div class="history-result">
            <span class="result-badge ${h.label}">${h.label === 'authentic' ? icons.user : icons.chip} ${l.badge}</span>
            <span class="history-confidence">${confidencePct(h.confidence)} confidence</span>
          </div>
          <button class="history-delete" data-delete="${h.id}" aria-label="Delete ${esc(h.filename)}" data-testid="button-delete-${h.id}">${icons.trash}</button>
        </div>`;
    }).join('');

    list.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Store.deleteHistoryEntry(btn.dataset.delete);
        renderHistory();
        toast('Analysis deleted.');
      });
    });
    list.querySelectorAll('[data-open]').forEach((img) => {
      img.addEventListener('click', () => {
        const entry = Store.getHistory().find((e) => e.id === img.dataset.open);
        if (entry) {
          lastResult = entry;
          location.hash = '#/';
          setTimeout(() => {
            const area = document.getElementById('analysis-area');
            if (area) renderResult(entry, area);
          }, 0);
        }
      });
    });

    const clear = document.getElementById('clear-history');
    if (clear) {
      clear.addEventListener('click', () => {
        if (confirm('Delete all saved analyses from this browser?')) {
          Store.clearHistory();
          renderHistory();
          toast('History cleared.');
        }
      });
    }
  }

  /* ---------------- Settings view ---------------- */

  function renderSettings() {
    const s = Store.getSettings();
    const persistent = Store.isPersistent();

    view.innerHTML = `
      <div class="page-head">
        <span class="page-icon">${icons.user}</span>
        <h1>Account Settings</h1>
      </div>

      <form class="settings-card" id="account-form" data-testid="settings-account">
        <p class="section-label">Account information</p>
        <div class="field">
          <label for="email-input">Email</label>
          <input class="input" id="email-input" type="email" value="${esc(s.email)}" placeholder="you@example.com" disabled />
          <p class="hint">Email cannot be changed here. This prototype has no user accounts — the value is stored only in this browser.</p>
        </div>
        <div class="field">
          <label for="name-input">Full name</label>
          <input class="input" id="name-input" type="text" value="${esc(s.fullName)}" placeholder="Your name" data-testid="input-name" />
        </div>
        <div class="save-row">
          <button class="btn primary" type="submit" data-testid="button-save-account">Save changes</button>
        </div>
      </form>

      <form class="settings-card" id="engine-form" data-testid="settings-engine">
        <p class="section-label">Detection engine</p>
        <div class="radio-row">
          <label class="radio-option ${s.engine !== 'api' ? 'selected' : ''}">
            <input type="radio" name="engine" value="heuristic" ${s.engine !== 'api' ? 'checked' : ''} hidden />
            <span class="radio-dot" aria-hidden="true"></span>
            <span>
              <span class="radio-title">Heuristic preview (default)</span>
              <span class="radio-desc">Runs in your browser: metadata, provenance and pixel-noise checks. No image leaves this device.</span>
            </span>
          </label>
          <label class="radio-option ${s.engine === 'api' ? 'selected' : ''}">
            <input type="radio" name="engine" value="api" ${s.engine === 'api' ? 'checked' : ''} hidden />
            <span class="radio-dot" aria-hidden="true"></span>
            <span>
              <span class="radio-title">Custom model API</span>
              <span class="radio-desc">Send images to the team's trained deepfake-detection model (Flask / Hugging Face endpoint). Images are uploaded to that server for analysis.</span>
            </span>
          </label>
        </div>
        <div class="field" id="api-field" style="margin-top:var(--space-5);${s.engine === 'api' ? '' : 'display:none'}">
          <label for="api-input">Model API endpoint</label>
          <input class="input" id="api-input" type="url" value="${esc(s.apiEndpoint)}" placeholder="https://your-model.example.com/analyze" data-testid="input-api" />
          <p class="hint">The server must accept a JSON POST body {"imageBase64": "..."} and return {"label": "...", "confidence": 0-1}. It also needs CORS enabled for this site's origin.</p>
        </div>
        <div class="save-row">
          <button class="btn primary" type="submit" data-testid="button-save-engine">Save engine settings</button>
        </div>
      </form>

      <form class="settings-card" id="storage-form" data-testid="settings-storage">
        <p class="section-label">Analysis storage</p>
        <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-bottom:var(--space-5)">
          Choose how your uploaded images and analysis results are stored.
        </p>
        <div class="segmented" role="radiogroup" aria-label="Storage mode">
          <button type="button" class="segment ${s.storageMode !== 'public' ? 'selected' : ''}" id="seg-private" data-testid="button-private">
            ${icons.lock} Private
          </button>
          <button type="button" class="segment" id="seg-public" disabled title="Planned feature" data-testid="button-public">
            ${icons.shield} Public
          </button>
        </div>
        <p class="storage-note">${icons.info} Private mode: thumbnails and results are kept only in this browser's local storage. Public sharing is a planned feature for the final project.</p>
        <div class="field" style="margin-top:var(--space-5)">
          <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);font-weight:600">
            <input type="checkbox" id="save-history-input" ${s.saveHistory ? 'checked' : ''} style="width:16px;height:16px" />
            Save my analyses to history
          </label>
          <p class="hint">Turn this off to analyze images without keeping any record (useful for sensitive photos).</p>
        </div>
        <div class="save-row">
          <button class="btn primary" type="submit" data-testid="button-save-storage">Save storage settings</button>
        </div>
      </form>

      ${persistent ? '' : `
      <div class="notice" style="margin-bottom:var(--space-6)">
        ${icons.info}
        <span>Local storage is unavailable in this embedded preview, so settings and history last only for this session. Once hosted on GitHub Pages, everything persists in the browser.</span>
      </div>`}`;

    /* account */
    document.getElementById('account-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Store.saveSettings({ fullName: document.getElementById('name-input').value.trim() });
      toast('Account settings saved.');
    });

    /* engine */
    const apiField = document.getElementById('api-field');
    document.querySelectorAll('input[name="engine"]').forEach((r) => {
      r.addEventListener('change', () => {
        document.querySelectorAll('.radio-option').forEach((o) => o.classList.remove('selected'));
        r.closest('.radio-option').classList.add('selected');
        apiField.style.display = r.value === 'api' ? '' : 'none';
      });
    });
    document.getElementById('engine-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const engine = document.querySelector('input[name="engine"]:checked').value;
      const apiEndpoint = document.getElementById('api-input').value.trim();
      if (engine === 'api' && !apiEndpoint) {
        toast('Enter a model API endpoint first, or stay on the heuristic preview.');
        return;
      }
      Store.saveSettings({ engine, apiEndpoint });
      toast('Detection engine updated.');
    });

    /* storage */
    const segPrivate = document.getElementById('seg-private');
    segPrivate.addEventListener('click', () => {
      segPrivate.classList.add('selected');
      Store.saveSettings({ storageMode: 'private' });
    });
    document.getElementById('storage-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Store.saveSettings({ saveHistory: document.getElementById('save-history-input').checked });
      toast('Storage settings saved.');
    });
  }

  /* ---------------- Boot ---------------- */

  route();
})();
