// Display preferences, saved under the 'settings' key. A setting saved by an older version that
// is missing here falls back to its default, so new settings can be added freely.
//   temperatureUnit: 'celsius' | 'fahrenheit'
//   timeFormat: 'auto' (the browser's language decides) | '12h' | '24h'
//   weekStart: 1 (Monday) | 0 (Sunday): where weeks begin in the calendar, "next week" and "this week"
//   notifications: true to also show system notices (focus sessions ending, reminders), once the
//                  browser allows them
export const DEFAULT_SETTINGS = {
  temperatureUnit: 'celsius',
  timeFormat: 'auto',
  weekStart: 1,
  notifications: false,
};

// The hour options for toLocaleTimeString / Intl.DateTimeFormat that follow timeFormat.
export function hourCycle(timeFormat) {
  if (timeFormat === '12h') return { hour12: true };
  if (timeFormat === '24h') return { hourCycle: 'h23' };
  return {};
}

export const temperatureSymbol = (unit) => (unit === 'fahrenheit' ? '°F' : '°C');
