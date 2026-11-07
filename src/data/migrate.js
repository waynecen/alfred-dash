import { STORAGE_KEYS, LEGACY_KEYS, SCHEMA_VERSION, VERSION_KEY, PRE_MIGRATION_KEY } from './schema';
import { normalizeTask } from './tasks';
import { DEFAULT_WIDGETS, HOME_BOARD_ID } from './boards';

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// How to upgrade saved data one version at a time: MIGRATIONS[n] turns version n into n + 1.
// Each step takes and returns a plain { key: value } object holding only the keys that are saved
// (a key left out of the result is removed), and must not change its input.
const MIGRATIONS = {
  1: (data) =>
    Array.isArray(data.tasks) ? { ...data, tasks: data.tasks.map(normalizeTask) } : data,

  // The one dashboard becomes the first board, "Home", with the same widgets in the same places.
  2: ({ widgets, layout, ...rest }) => {
    if (widgets === undefined && layout === undefined) return rest; // nothing to carry over
    return {
      ...rest,
      boards: [
        {
          id: HOME_BOARD_ID,
          name: 'Home',
          widgetIds: Array.isArray(widgets) ? widgets : DEFAULT_WIDGETS,
          layout: isPlainObject(layout) ? layout : {},
        },
      ],
      activeBoard: HOME_BOARD_ID,
    };
  },
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

// Every key in `keys` that has a value, parsed. Values that aren't valid JSON are left out, as
// useLocalStorage would ignore them anyway. By default that is the current keys only.
export function readAll(storage = localStorage, keys = STORAGE_KEYS) {
  const data = {};
  for (const key of keys) {
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
    const before = readAll(storage, [...STORAGE_KEYS, ...LEGACY_KEYS]);
    if (Object.keys(before).length > 0) {
      storage.setItem(PRE_MIGRATION_KEY, JSON.stringify({ version, savedAt: Date.now(), data: before }));
      const after = migrate(before, version);
      for (const [key, value] of Object.entries(after)) {
        if (value !== before[key]) storage.setItem(key, JSON.stringify(value));
      }
      for (const key of Object.keys(before)) {
        if (!(key in after)) storage.removeItem(key);
      }
    }
    storage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
  } catch {
    // Try again next time.
  }
}
