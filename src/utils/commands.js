import parseQuickAdd from './parseQuickAdd';
import { relativeDay } from './dates';
import { describeRecurrence } from '../data/tasks';

// The actions the command palette (Ctrl/Cmd+K) can run. Each command is
//   { id, label, group, keywords?, run, always? }
// `always` commands depend on what was typed (like "Add task …") and are shown whenever
// there is a query, after the ones that matched. New features add their commands here.
//   widgets: the registry     shownIds: the widgets on the dashboard     query: what was typed
//   actions: { addWidget, removeWidget, focusWidget, addTask, toggleTheme, resetLayout, openSettings,
//              switchBoard(id), addBoard(name?), renameBoard(name), deleteBoard(), moveWidget(id, boardId) }
//   theme: the theme in use, 'light' or 'dark'
//   boards: [{ id, name }]     activeBoardId: the board on screen (rename, delete and move act on it)
//   weekStart: 1 for Monday, 0 for Sunday, for dates such as "next week" in a typed task
//   focus: the focus timer ({ phase, running, paused }), with actions.focusTimer { toggle, stop }
export function buildCommands({
  widgets,
  shownIds,
  query = '',
  actions,
  theme,
  boards = [],
  activeBoardId,
  weekStart = 1,
  focus,
}) {
  const commands = [];
  const otherBoards = boards.filter((board) => board.id !== activeBoardId);
  const activeBoard = boards.find((board) => board.id === activeBoardId);

  for (const [id, widget] of Object.entries(widgets)) {
    if (shownIds.includes(id)) {
      commands.push(
        {
          id: `focus-${id}`,
          group: 'Widgets',
          label: `Go to ${widget.title}`,
          keywords: 'focus jump find',
          run: () => actions.focusWidget(id),
        },
        {
          id: `remove-${id}`,
          group: 'Widgets',
          label: `Remove ${widget.title} widget`,
          keywords: 'delete close hide',
          run: () => actions.removeWidget(id),
        },
        ...otherBoards.map((board) => ({
          id: `move-${id}-${board.id}`,
          group: 'Boards',
          label: `Move ${widget.title} to ${board.name}`,
          keywords: 'send board page',
          run: () => actions.moveWidget(id, board.id),
        }))
      );
    } else {
      commands.push({
        id: `add-${id}`,
        group: 'Widgets',
        label: `Add ${widget.title} widget`,
        keywords: `new show ${widget.description ?? ''}`,
        run: () => actions.addWidget(id),
      });
    }
  }

  if (actions.switchBoard) {
    commands.push(
      ...otherBoards.map((board) => ({
        id: `board-${board.id}`,
        group: 'Boards',
        label: `Switch to ${board.name}`,
        keywords: 'board page go open show',
        run: () => actions.switchBoard(board.id),
      })),
      {
        id: 'new-board',
        group: 'Boards',
        label: 'New board',
        keywords: 'add create page',
        run: () => actions.addBoard(),
      }
    );
    if (activeBoard && otherBoards.length > 0) {
      commands.push({
        id: 'delete-board',
        group: 'Boards',
        label: `Delete board “${activeBoard.name}”`,
        keywords: 'remove page',
        run: actions.deleteBoard,
      });
    }
  }

  commands.push(
    {
      id: 'toggle-theme',
      group: 'Appearance',
      label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      keywords: 'theme dark light colour color',
      run: actions.toggleTheme,
    },
    {
      id: 'reset-layout',
      group: 'Layout',
      label: 'Reset layout',
      keywords: 'sizes positions default arrange',
      run: actions.resetLayout,
    },
    {
      id: 'open-settings',
      group: 'General',
      label: 'Open settings',
      keywords: 'preferences options',
      run: actions.openSettings,
    }
  );
  // The focus timer, whether or not its widget is on this board.
  if (focus && actions.focusTimer) {
    const timer = actions.focusTimer;
    let label = 'Start focus session';
    if (focus.running) label = `Pause ${focus.phase === 'work' ? 'focus' : 'break'}`;
    else if (focus.paused) label = `Resume ${focus.phase === 'work' ? 'focus' : 'break'}`;
    commands.push({ id: 'timer-toggle', group: 'Focus', label, keywords: 'pomodoro timer focus start pause', run: timer.toggle });
    if (focus.phase !== 'idle') {
      commands.push({ id: 'timer-stop', group: 'Focus', label: 'Stop the focus timer', keywords: 'pomodoro end cancel', run: timer.stop });
    }
  }

  if (actions.openShortcuts) {
    commands.push({
      id: 'open-shortcuts',
      group: 'General',
      label: 'Keyboard shortcuts',
      keywords: 'keys help hotkeys',
      run: actions.openShortcuts,
    });
  }

  const text = query.trim();

  // "new board Work" and "rename board to Work" name the board in the same breath.
  const newBoard = actions.addBoard && text.match(/^new board\s+(.+)/i);
  if (newBoard) {
    commands.push({
      id: 'new-board-named',
      group: 'Boards',
      label: `New board “${newBoard[1]}”`,
      run: () => actions.addBoard(newBoard[1]),
      always: true,
    });
  }
  const rename = actions.renameBoard && text.match(/^rename(?: board)?(?: to)?\s+(.+)/i);
  if (rename) {
    commands.push({
      id: 'rename-board',
      group: 'Boards',
      label: `Rename this board to “${rename[1]}”`,
      run: () => actions.renameBoard(rename[1]),
      always: true,
    });
  }

  if (text) {
    // Quick-add works here too: "Call bank fri !high" is a task due Friday.
    const task = parseQuickAdd(text, { weekStart });
    const extras = [
      task.dueDate && relativeDay(task.dueDate),
      task.priority && `${task.priority[0].toUpperCase()}${task.priority.slice(1)}`,
      ...task.tags.map((tag) => `#${tag}`),
      describeRecurrence(task.recurrence),
    ].filter(Boolean);
    commands.push({
      id: 'add-task',
      group: 'Tasks',
      label: `Add task “${task.text}”${extras.map((extra) => ` · ${extra}`).join('')}`,
      run: () =>
        actions.addTask(task.text, task.priority ?? 'medium', {
          dueDate: task.dueDate,
          tags: task.tags,
          recurrence: task.recurrence,
        }),
      always: true,
    });
  }

  return commands;
}

// How well one piece of text matches the query: lower is better, null is no match.
// Whole-label prefix beats a word prefix, which beats a substring, which beats the letters
// appearing in order ("adn" finds "Add Notes").
function score(text, query) {
  if (text.startsWith(query)) return 0;
  if (text.split(/\s+/).some((word) => word.startsWith(query))) return 1;
  if (text.includes(query)) return 2;
  let at = 0;
  for (const char of text) {
    if (char === query[at]) at++;
    if (at === query.length) return 3;
  }
  return null;
}

// The commands to show for a query, best match first. Keywords count, but less than the label.
export function matchCommands(commands, query) {
  const q = query.trim().toLowerCase();
  const fixed = commands.filter((command) => !command.always);
  const extra = commands.filter((command) => command.always);
  if (!q) return fixed;

  const ranked = fixed
    .map((command) => {
      const label = score(command.label.toLowerCase(), q);
      const keywords = command.keywords ? score(command.keywords.toLowerCase(), q) : null;
      const best = label ?? (keywords === null || keywords > 2 ? null : keywords + 4);
      return { command, best };
    })
    .filter(({ best }) => best !== null)
    // Array.sort is stable, so equal scores keep their original order.
    .sort((a, b) => a.best - b.best)
    .map(({ command }) => command);

  return [...ranked, ...extra];
}
