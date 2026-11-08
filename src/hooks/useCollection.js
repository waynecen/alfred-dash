import useLocalStorage from './useLocalStorage';
import insertAt from '../utils/insertAt';
import nextId from '../utils/nextId';

// A list of records saved under one key, each with a unique id, and the changes every such list
// needs: add one, change one, and delete one with Undo. Every change is a functional update, so
// two changes in the same moment (from a widget, the AI, another tab) never undo each other.
//   key: the storage key    notify: shows a toast, for the Undo after a delete
//   nameOf(record): how a record is named in that toast ("Deleted “Dentist”")
function useCollection(key, notify, nameOf) {
  const [items, setItems] = useLocalStorage(key, []);

  // create(id, now) builds the record. Returns the new id.
  function add(create) {
    const now = Date.now();
    let id;
    setItems((current) => {
      id = nextId(current, now);
      return [...current, create(id, now)];
    });
    return id;
  }

  // fields: the fields to change, or a function from the record to them.
  function update(id, fields) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...(typeof fields === 'function' ? fields(item) : fields) } : item))
    );
  }

  // Deletes a record, and offers Undo, which puts it back where it was.
  //   onUndo: anything else to put back along with it (a habit's days, say)
  // Returns the record deleted, or null if there was none.
  function remove(id, { onUndo } = {}) {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const item = items[index];
    setItems((current) => current.filter((i) => i.id !== id));
    notify({
      message: `Deleted “${nameOf(item)}”`,
      actionLabel: 'Undo',
      onAction: () => {
        setItems((current) => (current.some((i) => i.id === id) ? current : insertAt(current, index, item)));
        onUndo?.();
      },
    });
    return item;
  }

  return { items, setItems, add, update, remove };
}

export default useCollection;
