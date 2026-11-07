// A board is one page of widgets with its own layout. Tasks, notes and every other kind of data
// are shared by all boards; only what is shown, and where, belongs to a board.
//   { id: string, name: string, widgetIds: string[], layout: { [widgetId]: { x, y, w, h } } }

// Shown the first time the dashboard opens. (Kept apart from the widget registry, which pulls in
// every widget component, so migrations can use it.)
export const DEFAULT_WIDGETS = ['summary', 'tasks'];

export const HOME_BOARD_ID = 'home';

export const DEFAULT_BOARDS = [{ id: HOME_BOARD_ID, name: 'Home', widgetIds: DEFAULT_WIDGETS, layout: {} }];

export const createBoardId = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// "Board 2", "Board 3", … : the first such name no board has yet.
export function nextBoardName(boards) {
  const taken = new Set(boards.map((board) => board.name));
  let n = boards.length + 1;
  while (taken.has(`Board ${n}`)) n++;
  return `Board ${n}`;
}
