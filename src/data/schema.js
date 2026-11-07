// Every value the dashboard keeps in localStorage. Backups export exactly these keys, and
// "Clear all data" removes exactly these, so a new feature that saves something adds its key here.
// Defaults stay with the code that reads each key (useLocalStorage's second argument).
export const STORAGE_KEYS = [
  'tasks', // [{ id, text, priority, completed, createdAt, ... }], see data/tasks.js
  'notes', // the Notes widget's text
  'widgets', // the ids of the widgets on the dashboard, in order
  'layout', // { [widgetId]: { x, y, w, h } }
  'dashboardTitle',
  'theme', // 'light' | 'dark' | 'system'
  'weatherPlaces', // [{ id, name, latitude, longitude, ... }]
  'weatherActive', // the id of the place the Weather widget shows
  'dailyBrief', // { text, at }: the last brief, so a reload doesn't pay for a new one
];

// Which shape the saved data is in. Bump it, and add a step to MIGRATIONS in data/migrate.js,
// whenever a saved shape changes in a way old code or old data can't read.
//   1: everything before versioning
//   2: tasks gain dueDate, completedAt, tags, parentId, recurrence and notes
export const SCHEMA_VERSION = 2;

// Where the version of the saved data is kept. It is not a STORAGE_KEY: backups carry it
// separately.
export const VERSION_KEY = 'schemaVersion';

// A copy of the data as it was before the last migration ran, in case one goes wrong.
export const PRE_MIGRATION_KEY = 'preMigrationBackup';
