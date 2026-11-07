import { STORAGE_KEYS, LEGACY_KEYS, SCHEMA_VERSION, VERSION_KEY } from './schema';
import { migrate, readAll } from './migrate';
import { toISODate } from '../utils/dates';

// Backups are one JSON file holding everything the dashboard saves:
//   { app: 'dashboard', version: SCHEMA_VERSION, exportedAt: ms, data: { [storage key]: value } }
const APP = 'dashboard';

export function buildBackup(storage = localStorage) {
  return { app: APP, version: SCHEMA_VERSION, exportedAt: Date.now(), data: readAll(storage) };
}

// Saves a backup as dashboard-backup-YYYY-MM-DD.json in the browser's downloads.
export function downloadBackup(storage = localStorage) {
  const blob = new Blob([JSON.stringify(buildBackup(storage), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dashboard-backup-${toISODate()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Checks a backup file's text and brings it up to the current version.
// Returns { ok: true, backup: { exportedAt, data } } or { ok: false, error } with a message to show.
export function parseBackup(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file isn’t a dashboard backup (it isn’t valid JSON).' };
  }
  if (file?.app !== APP || typeof file.data !== 'object' || file.data === null || Array.isArray(file.data)) {
    return { ok: false, error: 'That file isn’t a dashboard backup.' };
  }
  const version = Number.isInteger(file.version) && file.version > 0 ? file.version : 1;
  if (version > SCHEMA_VERSION) {
    return { ok: false, error: 'That backup was made by a newer version of the dashboard.' };
  }
  // Keep only keys this version knows about (old ones included, so they can be upgraded), so a
  // backup can't fill storage with junk.
  const readable = [...STORAGE_KEYS, ...LEGACY_KEYS];
  const known = Object.fromEntries(Object.entries(file.data).filter(([key]) => readable.includes(key)));
  if (known.tasks !== undefined && !Array.isArray(known.tasks)) {
    return { ok: false, error: 'That backup’s task list is damaged.' };
  }
  const current = migrate(known, version);
  const data = Object.fromEntries(Object.entries(current).filter(([key]) => STORAGE_KEYS.includes(key)));
  return { ok: true, backup: { exportedAt: file.exportedAt ?? null, data } };
}

// Replaces everything the dashboard saves with data (a { key: value } object in the current
// shape). Keys missing from data are removed, so the dashboard ends up exactly as backed up.
// Throws if storage refuses the write (e.g. it is full).
export function restoreData(data, storage = localStorage) {
  for (const key of STORAGE_KEYS) {
    if (key in data) storage.setItem(key, JSON.stringify(data[key]));
    else storage.removeItem(key);
  }
  storage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
}

// Removes everything the dashboard saves, so it starts as if new. Whatever is saved from now on
// is in the current shape, so the version stays.
export function clearData(storage = localStorage) {
  for (const key of [...STORAGE_KEYS, ...LEGACY_KEYS]) storage.removeItem(key);
  storage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
}

// Roughly how much space the dashboard's data takes, in bytes (storage keeps text as UTF-16).
export function storageUsed(storage = localStorage) {
  let chars = 0;
  for (const key of STORAGE_KEYS) {
    const raw = storage.getItem(key);
    if (raw !== null) chars += key.length + raw.length;
  }
  return chars * 2;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
