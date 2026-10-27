/**
 * storage.js — persistence layer
 *
 * History and settings are stored in the browser's localStorage so the site
 * works on static hosting (GitHub Pages) with no backend. If storage is
 * unavailable (e.g. inside a sandboxed preview iframe), we fall back to an
 * in-memory store so the app keeps working for the session.
 */
const Store = (() => {
  const HISTORY_KEY = 'maa_history_v1';
  const SETTINGS_KEY = 'maa_settings_v1';
  const MAX_HISTORY = 50;

  let memory = {};
  let usable = true;
  try {
    const t = '__maa_test__';
    window.localStorage.setItem(t, t);
    window.localStorage.removeItem(t);
  } catch (e) {
    usable = false;
  }

  function read(key, fallback) {
    try {
      const raw = usable ? window.localStorage.getItem(key) : memory[key];
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    const raw = JSON.stringify(value);
    try {
      if (usable) window.localStorage.setItem(key, raw);
      else memory[key] = raw;
    } catch (e) {
      /* storage full or blocked — keep the session going */
    }
  }

  /* ---- History ---- */

  function getHistory() {
    const list = read(HISTORY_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveHistoryEntry(entry) {
    const list = getHistory();
    list.unshift(entry);
    while (list.length > MAX_HISTORY) list.pop();
    write(HISTORY_KEY, list);
  }

  function deleteHistoryEntry(id) {
    const list = getHistory().filter((e) => e.id !== id);
    write(HISTORY_KEY, list);
  }

  function clearHistory() {
    write(HISTORY_KEY, []);
  }

  /* ---- Settings ---- */

  const DEFAULT_SETTINGS = {
    fullName: '',
    email: '',
    engine: 'heuristic',        // 'heuristic' | 'api'
    apiEndpoint: '',
    saveHistory: true,           // store analyses on this browser
    storageMode: 'private'       // 'private' — everything stays on this device
  };

  function getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, read(SETTINGS_KEY, {}));
  }

  function saveSettings(partial) {
    const next = Object.assign(getSettings(), partial);
    write(SETTINGS_KEY, next);
    return next;
  }

  function isPersistent() {
    return usable;
  }

  return {
    getHistory,
    saveHistoryEntry,
    deleteHistoryEntry,
    clearHistory,
    getSettings,
    saveSettings,
    isPersistent
  };
})();
