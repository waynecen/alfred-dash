import { toISODate, parseISODate, addDays, addMonths, startOfWeek, startOfNextWeek, isISODate } from './dates';

// Reads the extras people type after a task, so one line can say everything:
//   "Pay rent tomorrow !high #home every month"
//   -> { text: 'Pay rent', dueDate: <tomorrow>, priority: 'high', tags: ['home'],
//        recurrence: { every: 'month', interval: 1 } }
// It understands:
//   priority    !high !medium !low, or !h !m !l (also !hi, !med, !lo)
//   tags        #word (kept lower case, without the #)
//   due date    today, tomorrow (tmr, tmrw), a weekday (fri, friday), next week, next month,
//               next friday, in 3 days / 2 weeks / 1 month, 2026-11-20, 20 nov, nov 20
//               (an "on", "due" or "by" in front is dropped too)
//   repeats     every day / week / month, every 2 weeks, every friday
//   times       only when asked for (times: true), for events: 3pm, 3:30pm, 15:30, at 9, noon,
//               and ranges 2-3pm, 11am-1pm, 9:00-10:30 (time and endTime, as 'HH:MM')
// Whatever is matched is taken out of the text. If nothing would be left ("Monday" on its own),
// the whole line is the task and nothing is read from it. Unmatched fields are null (or []).
//   now: today's date    weekStart: 1 for Monday, 0 for Sunday ("next week" starts then)
//   times: read times too. Tasks leave it off, so "Call at 3pm" keeps its time in the text.

const PRIORITY_WORDS = { h: 'high', hi: 'high', high: 'high', m: 'medium', med: 'medium', medium: 'medium', l: 'low', lo: 'low', low: 'low' };
const WEEKDAY = '(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)';
const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const MONTH_INDEX = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const UNIT = '(day|week|month)s?';
// The \b keeps "on" from matching the end of a word ("Bacon today" is not "Bac" + "on today").
const DATE_PREFIX = '(?:\\b(?:on|due|by)\\s+)?';

// A clock time from its parts: (3, 30, 'pm') is '15:30'. Without am or pm the hour is taken
// as written, on the 24-hour clock.
function clockTime(hour, minute = 0, meridiem = '') {
  let h = Number(hour);
  const m = Number(minute);
  if (m > 59) return null;
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0);
  } else if (h > 23) {
    return null;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Each way of writing a time, tried in order: { time, endTime } from a match, or null.
// A range shares its am/pm ("2-3pm"), unless that would end before it starts ("11-1pm").
const TIME_RULES = [
  [
    /\b(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/,
    (m) => {
      const end = clockTime(m[4], m[5], m[6]);
      let start = clockTime(m[1], m[2], m[3] || m[6]);
      if (start && end && !m[3] && start > end) start = clockTime(m[1], m[2], 'am');
      return start && end ? { time: start, endTime: end } : null;
    },
  ],
  [
    /\b(?:from\s+)?([01]?\d|2[0-3]):([0-5]\d)\s*(?:-|–|to)\s*([01]?\d|2[0-3]):([0-5]\d)\b/,
    (m) => ({ time: clockTime(m[1], m[2]), endTime: clockTime(m[3], m[4]) }),
  ],
  [/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/, (m) => wrapTime(clockTime(m[1], m[2], m[3]))],
  [/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/, (m) => wrapTime(clockTime(m[1], m[2]))],
  [/\b(?:at\s+)?noon\b/, () => ({ time: '12:00', endTime: null })],
  [/\b(?:at\s+)?midnight\b/, () => ({ time: '00:00', endTime: null })],
  [/\bat\s+(\d{1,2})\b/, (m) => wrapTime(clockTime(m[1]))],
];

const wrapTime = (time) => (time ? { time, endTime: null } : null);

const weekdayIndex = (word) => WEEKDAY_INDEX[word.slice(0, 3).toLowerCase()];

// The next time it is that weekday, counting today.
function nextWeekday(today, index) {
  const day = parseISODate(today).getDay();
  return addDays(today, (index - day + 7) % 7);
}

function inUnits(today, n, unit) {
  if (unit === 'day') return addDays(today, n);
  if (unit === 'week') return addDays(today, n * 7);
  return addMonths(today, n);
}

// A day and month in the coming year: this year, or next if it has passed.
function dayMonth(today, day, monthWord) {
  const month = MONTH_INDEX[monthWord.slice(0, 3).toLowerCase()];
  const year = Number(today.slice(0, 4));
  const pad = (n) => String(n).padStart(2, '0');
  const thisYear = `${year}-${pad(month + 1)}-${pad(day)}`;
  if (!isISODate(thisYear)) return null; // 31 April
  return thisYear >= today ? thisYear : `${year + 1}-${pad(month + 1)}-${pad(day)}`;
}

// Each way of writing a due date: a pattern, and how to turn its match into a day.
// Tried in order; the first that matches wins, so longer forms come before their parts.
const DATE_RULES = [
  [/\b(?:today|tonight)\b/, (m, t) => t],
  [/\b(?:tomorrow|tmrw?)\b/, (m, t) => addDays(t, 1)],
  [new RegExp(`\\bnext\\s+${WEEKDAY}\\b`), (m, t, ws) => addDays(startOfWeek(t, ws), 7 + ((weekdayIndex(m[1]) - ws + 7) % 7))],
  [/\bnext\s+week\b/, (m, t, ws) => startOfNextWeek(t, ws)],
  [/\bnext\s+month\b/, (m, t) => `${addMonths(t, 1).slice(0, 8)}01`],
  [new RegExp(`\\bin\\s+(\\d{1,3})\\s+${UNIT}\\b`), (m, t) => inUnits(t, Number(m[1]), m[2])],
  [/\b(\d{4}-\d{2}-\d{2})\b/, (m) => (isISODate(m[1]) ? m[1] : null)],
  [new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}\\b`), (m, t) => dayMonth(t, Number(m[1]), m[2])],
  [new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`), (m, t) => dayMonth(t, Number(m[2]), m[1])],
  [new RegExp(`\\b${WEEKDAY}\\b`), (m, t) => nextWeekday(t, weekdayIndex(m[1]))],
];

function parseQuickAdd(input, { now = new Date(), weekStart = 1, times = false } = {}) {
  const today = toISODate(now);
  let text = ` ${input} `; // spaces at the ends let every pattern look for a gap before and after
  const take = (match) => {
    text = text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length);
  };

  let priority = null;
  const bang = text.match(/\s!(high|hi|h|medium|med|m|low|lo|l)(?=\s)/i);
  if (bang) {
    priority = PRIORITY_WORDS[bang[1].toLowerCase()];
    take(bang);
  }

  const tags = [];
  for (let tag = text.match(/\s#([\p{L}\p{N}_-]+)(?=\s)/u); tag; tag = text.match(/\s#([\p{L}\p{N}_-]+)(?=\s)/u)) {
    const name = tag[1].toLowerCase();
    if (!tags.includes(name)) tags.push(name);
    take(tag);
  }

  let recurrence = null;
  let dueDate = null;
  const every = text.match(new RegExp(`\\bevery\\s+(?:(\\d{1,3})\\s+)?${UNIT}\\b`, 'i'));
  const everyWeekday = !every && text.match(new RegExp(`\\bevery\\s+${WEEKDAY}\\b`, 'i'));
  if (every) {
    recurrence = { every: every[2].toLowerCase(), interval: Math.max(1, Number(every[1] ?? 1)) };
    take(every);
  } else if (everyWeekday) {
    recurrence = { every: 'week', interval: 1 };
    dueDate = nextWeekday(today, weekdayIndex(everyWeekday[1]));
    take(everyWeekday);
  }

  if (!dueDate) {
    for (const [pattern, toDate] of DATE_RULES) {
      // The prefix has no capturing groups, so each rule's groups keep their numbers.
      const match = text.match(new RegExp(DATE_PREFIX + pattern.source, 'i'));
      const date = match && toDate(match, today, weekStart);
      if (date) {
        dueDate = date;
        take(match);
        break;
      }
    }
  }
  // Something that repeats starts today unless it says otherwise.
  if (recurrence && !dueDate) dueDate = today;

  // Times come after dates, so a date's numbers ("20 nov") are already gone.
  let clock = { time: null, endTime: null };
  if (times) {
    for (const [pattern, toTime] of TIME_RULES) {
      const match = text.match(new RegExp(pattern.source, 'i'));
      const found = match && toTime(match);
      if (found) {
        clock = found;
        take(match);
        break;
      }
    }
  }

  const rest = text.replace(/\s+/g, ' ').trim();
  const nothing = { priority: null, dueDate: null, tags: [], recurrence: null };
  if (!rest) return { text: input.trim(), ...nothing, ...(times && { time: null, endTime: null }) };
  return { text: rest, priority, dueDate, tags, recurrence, ...(times && clock) };
}

export default parseQuickAdd;
