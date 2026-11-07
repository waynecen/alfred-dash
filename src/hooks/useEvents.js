import useLocalStorage from './useLocalStorage';
import { createEvent } from '../data/events';
import insertAt from '../utils/insertAt';

// The calendar's events, saved in the browser, and everything that changes them. Like useTasks,
// every change is a functional update, so two changes in the same moment never undo each other.
//   notify: shows a toast, used to offer Undo after a delete
function useEvents(notify) {
  const [events, setEvents] = useLocalStorage('events', []);

  // fields: { title, date, start?, end?, notes? }. Returns the new event's id.
  function addEvent(fields) {
    const now = Date.now();
    let id;
    setEvents((current) => {
      id = Math.max(now, ...current.map((event) => event.id + 1));
      return [...current, createEvent(fields, id, now)];
    });
    return id;
  }

  function updateEvent(id, fields) {
    setEvents((current) => current.map((event) => (event.id === id ? { ...event, ...fields } : event)));
  }

  function deleteEvent(id) {
    const index = events.findIndex((event) => event.id === id);
    if (index === -1) return;
    const event = events[index];
    setEvents((current) => current.filter((e) => e.id !== id));
    notify({
      message: `Deleted “${event.title}”`,
      actionLabel: 'Undo',
      onAction: () => setEvents((current) => (current.some((e) => e.id === id) ? current : insertAt(current, index, event))),
    });
  }

  return { events, actions: { addEvent, updateEvent, deleteEvent } };
}

export default useEvents;
