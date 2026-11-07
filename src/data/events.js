// The shape of a calendar event, saved under the 'events' key. Events live only in this browser
// (and its backups); nothing syncs with an outside calendar.
//   id: number, unique (a timestamp, stepped past any taken)
//   title: string
//   date: 'YYYY-MM-DD', the local day it is on
//   start: 'HH:MM' | null; no start means it lasts all day
//   end: 'HH:MM' | null, only with a start
//   notes: string
//   createdAt: milliseconds

export function createEvent({ title, date, start = null, end = null, notes = '' }, id, now) {
  return { id, title, date, start, end: start ? end : null, notes, createdAt: now };
}

// All-day events first, then by start time, then in the order they were added.
export function compareEvents(a, b) {
  if (!a.start !== !b.start) return a.start ? 1 : -1;
  if (a.start !== b.start) return a.start < b.start ? -1 : 1;
  return a.id - b.id;
}

// The events on one day, in the order they happen.
export const eventsOn = (events, date) => events.filter((event) => event.date === date).sort(compareEvents);

// How an event's time reads: "15:00–16:30", "3:00 PM", or "All day".
//   hour: options from data/settings.js hourCycle(), so the clock setting is followed
export function describeEventTime(event, hour = {}) {
  if (!event.start) return 'All day';
  const format = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', ...hour });
  };
  return event.end ? `${format(event.start)}–${format(event.end)}` : format(event.start);
}
