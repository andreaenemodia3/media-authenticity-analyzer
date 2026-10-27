#!/usr/bin/env bash
# make-preview.sh — package a preview build of the site.
#
# The embedded preview iframe blocks browser-storage APIs, so this script
# copies the shared application source and swaps ONLY the storage adapter in
# the copy to an in-memory version. The GitHub Pages deployment (the repo
# itself) keeps the guarded browser-storage adapter in js/storage.js.
# One application, one source tree, one environment-specific capability.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$SRC-preview}"

rm -rf "$DEST"
mkdir -p "$DEST"
cp "$SRC"/index.html "$SRC"/favicon.svg "$DEST"/
cp -r "$SRC"/css "$DEST"/
mkdir -p "$DEST"/js
cp "$SRC"/js/app.js "$SRC"/js/analysis.js "$DEST"/js/

cat > "$DEST/js/storage.js" <<'EOF'
/**
 * storage.js — persistence layer (PREVIEW BUILD)
 *
 * In-memory only: the embedded preview iframe blocks browser-storage APIs.
 * The GitHub Pages build (js/storage.js in the repository) uses guarded
 * browser-storage access so history and settings persist there.
 */
const Store = (() => {
  const HISTORY_KEY = 'maa_history_v1';
  const SETTINGS_KEY = 'maa_settings_v1';
  const MAX_HISTORY = 50;

  const storage = null; // preview build: session-only mode
  const memory = {};

  function read(key, fallback) {
    try {
      const raw = memory[key];
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    memory[key] = JSON.stringify(value);
  }

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
    write(HISTORY_KEY, getHistory().filter((e) => e.id !== id));
  }

  function clearHistory() {
    write(HISTORY_KEY, []);
  }

  const DEFAULT_SETTINGS = {
    fullName: '',
    email: '',
    engine: 'heuristic',
    apiEndpoint: '',
    saveHistory: true,
    storageMode: 'private'
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
    return false;
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
EOF

echo "Preview package built at $DEST"
