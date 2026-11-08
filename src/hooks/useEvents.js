import useCollection from './useCollection';
import { createEvent } from '../data/events';

// The calendar's events, saved in the browser, and everything that changes them.
//   notify: shows a toast, used to offer Undo after a delete
function useEvents(notify) {
  const { items: events, add, update, remove } = useCollection('events', notify, (event) => event.title);

  return {
    events,
    actions: {
      // fields: { title, date, start?, end?, notes? }. Returns the new event's id.
      addEvent: (fields) => add((id, now) => createEvent(fields, id, now)),
      updateEvent: update,
      deleteEvent: (id) => void remove(id),
    },
  };
}

export default useEvents;
