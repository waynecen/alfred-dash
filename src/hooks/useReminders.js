import { useEffect, useRef, useState } from 'react';
import useLocalStorage from './useLocalStorage';
import { toISODate } from '../utils/dates';
import { showNotice } from '../utils/systemNotice';

// How long before a timed event its reminder comes.
export const LEAD_MINUTES = 10;

const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// What is due a reminder at this moment, from the events and tasks, leaving out what was sent:
//   { events: [event, ...], due: { today, overdue } | null }
// An event is due one from LEAD_MINUTES before it starts until it starts; the day's tasks get one
// summary, the first time the dashboard is open that day.
//   sent: { [key]: true }, the reminders already given (see reminderKey)
//   withDue: whether to look at the tasks at all (only when the dashboard opens, or the day turns)
export function dueReminders({ events, tasks, now, sent, withDue = true }) {
  const today = toISODate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const soon = events.filter((event) => {
    if (event.date !== today || !event.start || sent[eventKey(event)]) return false;
    const start = minutesOf(event.start);
    return nowMinutes >= start - LEAD_MINUTES && nowMinutes < start;
  });
  let due = null;
  if (withDue && !sent[dayKey(today)]) {
    const open = tasks.filter((task) => !task.completed && task.dueDate);
    const counts = { today: open.filter((t) => t.dueDate === today).length, overdue: open.filter((t) => t.dueDate < today).length };
    if (counts.today || counts.overdue) due = counts;
  }
  return { events: soon, due, today };
}

// Each reminder's key names its day, so changing an event's time reminds again, and old keys
// can be dropped once their day is past.
export const eventKey = (event) => `${event.date}|event|${event.id}|${event.start}`;
export const dayKey = (day) => `${day}|due`;

const pruned = (sent, today) => Object.fromEntries(Object.entries(sent).filter(([key]) => key.slice(0, 10) >= today));

// Reminds about what is coming while the dashboard is open: a toast (and a system notice, when
// turned on in Settings) ten minutes before each timed event, and a morning summary of the tasks
// due and overdue. Reminders already given are saved under 'reminders', so a reload, or a second
// tab, never repeats one.
//   notify: shows a toast    noticesOn: the Settings switch    onShowToday: opens the Today view
function useReminders({ events, tasks, notify, noticesOn, onShowToday }) {
  const [saved, setSaved] = useLocalStorage('reminders', { sent: {} });
  const [now, setNow] = useState(() => new Date());

  // Checks twice a minute, and as soon as the tab is looked at again.
  useEffect(() => {
    const check = () => setNow(new Date());
    const timer = setInterval(check, 30 * 1000);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // The tasks summary is for opening the dashboard (or a new day starting while it is open), not
  // for a task added later that happens to be due today.
  const dueCheckedFor = useRef(null);

  useEffect(() => {
    const sent = saved?.sent ?? {};
    const day = toISODate(now);
    const withDue = dueCheckedFor.current !== day;
    dueCheckedFor.current = day;
    const { events: soon, due, today } = dueReminders({ events, tasks, now, sent, withDue });
    if (!soon.length && !due) return;

    // Claim each reminder in storage before giving it, so another tab checking in the same
    // moment finds it taken and stays quiet.
    const claimed = [];
    setSaved((current) => {
      const had = current?.sent ?? {};
      const next = pruned(had, today);
      for (const event of soon) {
        if (!had[eventKey(event)]) {
          next[eventKey(event)] = true;
          claimed.push({ kind: 'event', event });
        }
      }
      if (due && !had[dayKey(today)]) {
        next[dayKey(today)] = true;
        claimed.push({ kind: 'due', due });
      }
      return claimed.length ? { sent: next } : current;
    });

    for (const item of claimed) {
      if (item.kind === 'event') {
        const minutes = minutesOf(item.event.start) - (now.getHours() * 60 + now.getMinutes());
        const when = minutes <= 1 ? 'starting now' : `in ${minutes} minutes`;
        notify({ message: `“${item.event.title}” ${when}`, actionLabel: 'Show', onAction: onShowToday });
        showNotice(noticesOn, item.event.title, { body: `Starts ${when}, at ${item.event.start}.`, tag: eventKey(item.event) });
      } else {
        const parts = [item.due.today && `${item.due.today} due today`, item.due.overdue && `${item.due.overdue} overdue`].filter(Boolean);
        const message = `Tasks: ${parts.join(', ')}`;
        notify({ message, actionLabel: 'Show', onAction: onShowToday });
        showNotice(noticesOn, 'Today’s tasks', { body: parts.join(', '), tag: dayKey(today) });
      }
    }
  }, [now, events, tasks]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default useReminders;
