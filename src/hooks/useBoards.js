import useLocalStorage from './useLocalStorage';
import insertAt from '../utils/insertAt';
import { DEFAULT_BOARDS, createBoardId, nextBoardName } from '../data/boards';

const apply = (next, current) => (typeof next === 'function' ? next(current) : next);
const omit = (object, key) => {
  const { [key]: _removed, ...rest } = object;
  return rest;
};

// The boards (pages of widgets), which one is on screen, and everything that changes them.
// Every change is a functional update, so changes made together never overwrite each other.
//   notify: shows a toast (from useToasts), used to offer Undo after a delete
function useBoards(notify) {
  const [boards, setBoards] = useLocalStorage('boards', DEFAULT_BOARDS);
  const [activeId, setActiveId] = useLocalStorage('activeBoard', DEFAULT_BOARDS[0].id);
  // A saved id can outlive its board (e.g. deleted in another tab): fall back to the first.
  const active = boards.find((board) => board.id === activeId) ?? boards[0] ?? DEFAULT_BOARDS[0];

  const updateBoard = (id, change) =>
    setBoards((current) => current.map((board) => (board.id === id ? { ...board, ...change(board) } : board)));

  // Like a useState setter for one board's widgets or layout; the active board by default.
  const setWidgetIds = (next, id = active.id) =>
    updateBoard(id, (board) => ({ widgetIds: apply(next, board.widgetIds) }));
  const setLayout = (next, id = active.id) => updateBoard(id, (board) => ({ layout: apply(next, board.layout) }));

  // Adds a board after the others and shows it. An empty name picks "Board n".
  function addBoard(name = '', widgetIds = []) {
    const board = { id: createBoardId(), name: name.trim() || nextBoardName(boards), widgetIds, layout: {} };
    setBoards((current) => [...current, board]);
    setActiveId(board.id);
    return board;
  }

  function renameBoard(id, name) {
    const trimmed = name.trim();
    if (trimmed) updateBoard(id, () => ({ name: trimmed }));
  }

  // The last board can't go: the dashboard always has somewhere to put widgets.
  function deleteBoard(id) {
    const index = boards.findIndex((board) => board.id === id);
    if (index === -1 || boards.length <= 1) return;
    const board = boards[index];
    setBoards((current) => current.filter((b) => b.id !== id));
    // Showing it? Show its neighbour instead, the one to the right if there is one.
    if (board.id === active.id) setActiveId((boards[index + 1] ?? boards[index - 1]).id);
    notify({
      message: `Deleted board “${board.name}”`,
      actionLabel: 'Undo',
      onAction: () => {
        setBoards((current) => (current.some((b) => b.id === id) ? current : insertAt(current, index, board)));
        setActiveId(id);
      },
    });
  }

  // Takes a widget off the active board and puts it on another, in the first free spot there.
  function moveWidget(widgetId, toId) {
    const fromId = active.id;
    if (toId === fromId) return;
    setBoards((current) =>
      current.map((board) => {
        if (board.id === fromId) {
          return { ...board, widgetIds: board.widgetIds.filter((id) => id !== widgetId), layout: omit(board.layout, widgetId) };
        }
        if (board.id === toId && !board.widgetIds.includes(widgetId)) {
          return { ...board, widgetIds: [...board.widgetIds, widgetId] };
        }
        return board;
      })
    );
  }

  return {
    boards,
    active,
    switchTo: setActiveId,
    addBoard,
    renameBoard,
    deleteBoard,
    moveWidget,
    setWidgetIds,
    setLayout,
  };
}

export default useBoards;
