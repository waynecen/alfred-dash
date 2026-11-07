// Every value the dashboard keeps in localStorage. Backups export exactly these keys, and
// "Clear all data" removes exactly these, so a new feature that saves something adds its key here.
// Defaults stay with the code that reads each key (useLocalStorage's second argument).
export const STORAGE_KEYS = [
  'tasks', // [{ id, text, priority, completed, createdAt, ... }], see data/tasks.js
  'events', // [{ id, title, date, start, end, notes }], see data/events.js
  'notes', // the Notes widget's text
  'boards', // [{ id, name, widgetIds, layout }], see data/boards.js
  'activeBoard', // the id of the board on screen
  'dashboardTitle',
  'theme', // 'light' | 'dark' | 'system'
  'settings', // { temperatureUnit, timeFormat, weekStart }, see data/settings.js
  'weatherPlaces', // [{ id, name, latitude, longitude, ... }]
  'weatherActive', // the id of the place the Weather widget shows
  'dailyBrief', // { text, at }: the last brief, so a reload doesn't pay for a new one
];

// Keys older versions saved that a migration has since replaced. They are only read, so that
// old browsers and old backups can be upgraded; nothing writes them any more.
export const LEGACY_KEYS = [
  'widgets', // until version 3: the widgets on the one dashboard (now boards[].widgetIds)
  'layout', // until version 3: their positions (now boards[].layout)
];

// Which shape the saved data is in. Bump it, and add a step to MIGRATIONS in data/migrate.js,
// whenever a saved shape changes in a way old code or old data can't read.
//   1: everything before versioning
//   2: tasks gain dueDate, completedAt, tags, parentId, recurrence and notes
//   3: widgets and layout move into boards
export const SCHEMA_VERSION = 3;

// Where the version of the saved data is kept. It is not a STORAGE_KEY: backups carry it
// separately.
export const VERSION_KEY = 'schemaVersion';

// A copy of the data as it was before the last migration ran, in case one goes wrong.
export const PRE_MIGRATION_KEY = 'preMigrationBackup';
