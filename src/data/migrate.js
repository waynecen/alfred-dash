import { STORAGE_KEYS, SCHEMA_VERSION, VERSION_KEY, PRE_MIGRATION_KEY } from './schema';
import { normalizeTask } from './tasks';

// How to upgrade saved data one version at a time: MIGRATIONS[n] turns version n into n + 1.
// Each step takes and returns a plain { key: value } object holding only the keys that are saved,
// and must not change its input.
const MIGRATIONS = {
  1: (data) =>
    Array.isArray(data.tasks) ? { ...data, tasks: data.tasks.map(normalizeTask) } : data,
};

// Upgrades data saved at `fromVersion` to SCHEMA_VERSION. Data from a newer version than this
// code knows is returned unchanged; the caller decides whether to accept it.
export function migrate(data, fromVersion) {
  let result = data;
  for (let version = fromVersion; version < SCHEMA_VERSION; version++) {
    result = MIGRATIONS[version]?.(result) ?? result;
  }
  return result;
}

// The saved version, or 1 for data saved before versioning.
export function readVersion(storage = localStorage) {
  const saved = Number(storage.getItem(VERSION_KEY));
  return Number.isInteger(saved) && saved > 0 ? saved : 1;
}

// Every STORAGE_KEY that has a value, parsed. Values that aren't valid JSON are left out, as
// useLocalStorage would ignore them anyway.
export function readAll(storage = localStorage) {
  const data = {};
  for (const key of STORAGE_KEYS) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      // skip it
    }
  }
  return data;
}

// Runs before the first render, so the app only ever sees data in the current shape.
// The data as it was before is kept under PRE_MIGRATION_KEY, in case a migration goes wrong.
// Storage that is blocked or full leaves the data as it is; the app copes with old shapes.
export function runMigrations(storage = localStorage) {
  try {
    const version = readVersion(storage);
    if (version >= SCHEMA_VERSION) return;
    const before = readAll(storage);
    if (Object.keys(before).length > 0) {
      storage.setItem(PRE_MIGRATION_KEY, JSON.stringify({ version, savedAt: Date.now(), data: before }));
      const after = migrate(before, version);
      for (const [key, value] of Object.entries(after)) {
        if (value !== before[key]) storage.setItem(key, JSON.stringify(value));
      }
    }
    storage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
  } catch {
    // Try again next time.
  }
}
