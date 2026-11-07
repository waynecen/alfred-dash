// A copy of list with item put back at index (or at the end, if the list got shorter since).
// Undo uses it to return a removed task, widget or board to where it was.
const insertAt = (list, index, item) => [...list.slice(0, index), item, ...list.slice(index)];

export default insertAt;
