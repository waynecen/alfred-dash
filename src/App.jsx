import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import useToasts from './hooks/useToasts';
import useTasks from './hooks/useTasks';
import useEvents from './hooks/useEvents';
import useHabits from './hooks/useHabits';
import useGoals from './hooks/useGoals';
import useReviews from './hooks/useReviews';
import useBoards from './hooks/useBoards';
import useShortcuts from './hooks/useShortcuts';
import useToday from './hooks/useToday';
import useSettings from './hooks/useSettings';
import useFocusTimer from './hooks/useFocusTimer';
import useReminders from './hooks/useReminders';
import { useAIHealth } from './hooks/useAI';
import EditableTitle from './components/EditableTitle/EditableTitle';
import BoardTabs, { tabId } from './components/BoardTabs/BoardTabs';
import Dashboard from './components/Dashboard/Dashboard';
import AddWidgetMenu from './components/AddWidgetMenu/AddWidgetMenu';
import CommandPalette from './components/CommandPalette/CommandPalette';
import SettingsDrawer from './components/Settings/SettingsDrawer';
import ShortcutsDialog from './components/ShortcutsDialog/ShortcutsDialog';
import ToastRegion from './components/Toast/ToastRegion';
import WidgetState from './components/WidgetState/WidgetState';
import { WIDGETS, STARTER_LAYOUTS } from './widgets/registry';
import { buildCommands } from './utils/commands';
import countTasks from './utils/countTasks';
import insertAt from './utils/insertAt';
import { parseISODate, startOfWeek } from './utils/dates';
import { doneOn, habitsDueOn } from './data/habits';
import { isReviewed, reviewWeek } from './data/reviews';
import { formatClock } from './data/focus';

// Loaded only when someone starts a review.
const WeeklyReview = lazy(() => import('./components/WeeklyReview/WeeklyReview'));

// What the Add widget list needs to know about each widget.
const WIDGET_OPTIONS = Object.entries(WIDGETS).map(([id, widget]) => ({
  id,
  title: widget.title,
  description: widget.description,
  category: widget.category,
}));

const DARK_QUERY = '(prefers-color-scheme: dark)';

// The element the board tabs control.
const BOARD_PANEL_ID = 'board-panel';

// Follows the operating system's light or dark setting as it changes.
function useSystemDark() {
  const [dark, setDark] = useState(() => window.matchMedia(DARK_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const handleChange = (event) => setDark(event.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);
  return dark;
}

function App() {
  const { toasts, notify, dismiss } = useToasts();
  // The tasks live here, so every widget shares one source of truth.
  const { tasks, actions: taskActions } = useTasks(notify);
  // Calendar events, shared the same way (the Calendar and Today widgets both show them).
  const { events, actions: eventActions } = useEvents(notify);
  // Habits and the days each was done (the Habits and Today widgets both show them).
  const { habits, habitLog, actions: habitActions } = useHabits(notify);
  // Goals; a tasks goal reads its progress from the tasks.
  const { goals, actions: goalActions } = useGoals(notify);
  // Weekly reviews saved so far.
  const { reviews, saveReview } = useReviews();
  // The pages of widgets. Each board has its own widgets, in order, and where each one sits:
  // { [id]: { x, y, w, h } } in grid cells. Widgets without a spot go in the first free one.
  const boards = useBoards(notify);
  const board = boards.active;
  const { widgetIds, layout } = board;
  const { setWidgetIds, setLayout } = boards; // the active board's, unless given another id
  // The notepad text lives here too, so it survives removing and re-adding the widget.
  const [notes, setNotes] = useLocalStorage('notes', '');
  const [title, setTitle] = useLocalStorage('dashboardTitle', 'My Dashboard');
  // 'light', 'dark' or 'system'. Until the user picks one, the dashboard follows the OS.
  const [theme, setTheme] = useLocalStorage('theme', 'system');
  const systemDark = useSystemDark();
  const shownTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  // A question for the Assistant widget from "Ask Claude" in the palette: { text, n }.
  const [assistantRequest, setAssistantRequest] = useState(null);
  const today = useToday();
  const [settings] = useSettings();
  // The focus timer keeps time here, so it runs (and announces the end of a phase) on any board.
  const { focus, focusActions } = useFocusTimer(notify, settings.notifications);
  // Ten minutes before each timed event, and once a day for what is due.
  // On the first day of a week, the week just ended is ready to review; nobody with nothing on
  // the dashboard yet is nudged.
  const reviewDue =
    startOfWeek(today, settings.weekStart) === today &&
    !isReviewed(reviews, reviewWeek(today, settings.weekStart).from) &&
    tasks.length + habits.length + goals.length > 0;
  useReminders({
    events,
    tasks,
    notify,
    noticesOn: settings.notifications,
    onShowToday: () => goToToday(),
    reviewDue,
    onStartReview: () => setReviewOpen(true),
  });
  // Asks a widget to take keyboard focus: { id, n }, with a new n each time.
  const [focusRequest, setFocusRequest] = useState(null);
  // Checked each time Settings opens, so the AI status there is current.
  const aiHealth = useAIHealth(settingsOpen);
  // And while the palette is open, so it only offers "Ask Claude" when Claude can answer.
  const paletteAI = useAIHealth(paletteOpen);

  // The CSS variables are switched by an attribute on <html>. After the first paint, the switch
  // runs as a view transition so the page cross-fades (timing in App.css); browsers without
  // view transitions just switch.
  const themeApplied = useRef(false);
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = shownTheme;
    };
    if (document.documentElement.dataset.theme === shownTheme) return;
    if (!themeApplied.current || !document.startViewTransition) {
      themeApplied.current = true;
      apply();
      return;
    }
    document.startViewTransition(apply);
  }, [shownTheme]);

  // Shows the board n steps along from this one, wrapping round at the ends.
  function stepBoard(n) {
    const list = boards.boards;
    const index = list.findIndex((b) => b.id === board.id);
    boards.switchTo(list[(index + n + list.length) % list.length].id);
  }

  // Puts the cursor in the Tasks widget's box, or opens the palette (which can add tasks too)
  // when this board has no Tasks widget.
  function startNewTask() {
    const input = document.getElementById('new-task');
    if (!input) {
      setPaletteOpen(true);
      return;
    }
    input.focus();
    input.scrollIntoView?.({ block: 'nearest' });
  }

  // Shows the Today widget: on this board if it is here, otherwise on the first board that has it.
  // With none anywhere, offers to add one here.
  function goToToday() {
    const home = widgetIds.includes('today') ? board : boards.boards.find((b) => b.widgetIds.includes('today'));
    if (home) {
      if (home.id !== board.id) boards.switchTo(home.id);
      focusWidget('today');
      return;
    }
    notify({ message: 'No board has the Today widget yet.', actionLabel: 'Add it here', onAction: () => addWidget('today') });
  }

  // The keys are listed for people in components/ShortcutsDialog; keep the two in step.
  useShortcuts([
    {
      key: 'k',
      mod: true, // Ctrl+K, or Cmd+K on a Mac, opens and closes the palette from anywhere
      run: () => {
        setShortcutsOpen(false);
        setPaletteOpen((open) => !open);
      },
    },
    { key: '/', run: () => setPaletteOpen(true) },
    { key: 'n', run: startNewTask },
    { key: 't', run: goToToday },
    { key: 'f', run: focusActions.toggle },
    { key: '?', run: () => setShortcutsOpen(true) },
    { key: '[', run: () => stepBoard(-1) },
    { key: ']', run: () => stepBoard(1) },
    ...boards.boards.slice(0, 9).map((b, index) => ({ key: String(index + 1), run: () => boards.switchTo(b.id) })),
  ]);

  // Sends a question to the Assistant, bringing it into view first: on this board if it is here,
  // on the first board that has it, or added to this one.
  function askClaude(text) {
    const home = widgetIds.includes('assistant') ? board : boards.boards.find((b) => b.widgetIds.includes('assistant'));
    if (home && home.id !== board.id) boards.switchTo(home.id);
    if (home) focusWidget('assistant');
    else addWidget('assistant');
    setAssistantRequest((current) => ({ text, n: (current?.n ?? 0) + 1 }));
  }

  function focusWidget(id) {
    setFocusRequest((request) => ({ id, n: (request?.n ?? 0) + 1 }));
  }

  // The browser tab names the board, so several open tabs can be told apart. While the focus
  // timer runs, the time left comes first, so it shows on the tab from any other tab.
  const timerTitle = focus.running ? `${formatClock(focus.left)} ${focus.label} · ` : '';
  useEffect(() => {
    document.title = timerTitle + (boards.boards.length > 1 ? `${board.name} · ${title}` : title);
  }, [timerTitle, board.name, boards.boards.length, title]);

  function addWidget(id) {
    setWidgetIds((current) => (current.includes(id) ? current : [...current, id]));
    // Take the user to it, so they can see where it landed.
    focusWidget(id);
  }

  function removeWidget(id) {
    const boardId = board.id; // Undo goes back to this board, even if another is shown by then
    const index = widgetIds.indexOf(id);
    const spot = layout[id];
    setWidgetIds((current) => current.filter((widgetId) => widgetId !== id), boardId);
    // Forget its spot, so adding it back later places it in a free one.
    setLayout(({ [id]: _removed, ...rest }) => rest, boardId);
    notify({
      message: `${WIDGETS[id]?.title ?? 'Widget'} removed`,
      actionLabel: 'Undo',
      onAction: () => {
        // Undo puts it back where it was, at the same size.
        setWidgetIds((current) => (current.includes(id) ? current : insertAt(current, index, id)), boardId);
        if (spot) setLayout((current) => ({ ...current, [id]: spot }), boardId);
        boards.switchTo(boardId);
        focusWidget(id);
      },
    });
  }

  function resetLayout() {
    const boardId = board.id;
    const previous = layout;
    setLayout({}, boardId);
    notify({
      message: 'Layout reset',
      actionLabel: 'Undo',
      onAction: () => setLayout(previous, boardId),
    });
  }

  function moveWidget(id, toBoardId) {
    const to = boards.boards.find((b) => b.id === toBoardId);
    if (!to) return;
    boards.moveWidget(id, toBoardId);
    notify({
      message: `Moved ${WIDGETS[id]?.title ?? 'widget'} to ${to.name}`,
      actionLabel: 'Show',
      onAction: () => {
        boards.switchTo(toBoardId);
        focusWidget(id);
      },
    });
  }

  function applyStarter(starter) {
    setWidgetIds(starter.widgets);
    setLayout({});
    focusWidget(starter.widgets[0]);
  }

  const toggleTheme = () => setTheme(shownTheme === 'dark' ? 'light' : 'dark');
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Ignore saved ids that no longer exist in the registry (e.g. a widget that was renamed).
  const shownWidgetIds = widgetIds.filter((id) => WIDGETS[id]);

  // Everything a widget might need, handed to each widget's render function.
  const context = {
    tasks,
    events,
    habits,
    habitLog,
    goals,
    notes,
    focus,
    counts: countTasks(tasks),
    assistantRequest,
    actions: {
      ...taskActions,
      ...eventActions,
      ...habitActions,
      ...goalActions,
      focusTimer: focusActions,
      setNotes,
      notify,
      // The Assistant took the palette's question: don't send it again.
      assistantRequestHandled: (n) => setAssistantRequest((current) => (current?.n === n ? null : current)),
    },
  };

  const getCommands = (query) =>
    buildCommands({
      widgets: WIDGETS,
      shownIds: shownWidgetIds,
      query,
      theme: shownTheme,
      boards: boards.boards,
      activeBoardId: board.id,
      weekStart: settings.weekStart,
      focus,
      aiReady: paletteAI.status === 'connected',
      habitsToday: habitsDueOn(habits, today).filter((habit) => !doneOn(habitLog, habit, today)),
      actions: {
        focusTimer: focusActions,
        toggleHabitDay: habitActions.toggleHabitDay,
        addHabit: habitActions.addHabit,
        addWidget,
        removeWidget,
        focusWidget,
        addTask: taskActions.addTask,
        toggleTheme,
        resetLayout,
        openSettings: () => setSettingsOpen(true),
        openShortcuts: () => setShortcutsOpen(true),
        openReview: () => setReviewOpen(true),
        askClaude,
        switchBoard: boards.switchTo,
        addBoard: boards.addBoard,
        renameBoard: (name) => boards.renameBoard(board.id, name),
        deleteBoard: () => boards.deleteBoard(board.id),
        moveWidget,
      },
    });

  return (
    <main className="app">
      <header className="app-header">
        <p className="app-header-index">
          <span>Dashboard</span>
          <time dateTime={today}>
            {parseISODate(today).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
          </time>
        </p>
        <EditableTitle value={title} onChange={setTitle} />
        <div className="app-header-actions">
          <button
            type="button"
            className="palette-button"
            aria-label="Search commands"
            aria-keyshortcuts="Control+K Meta+K"
            title="Search commands (Ctrl+K)"
            onClick={() => setPaletteOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <kbd aria-hidden="true">Ctrl K</kbd>
          </button>
          <AddWidgetMenu
            widgets={WIDGET_OPTIONS}
            added={shownWidgetIds}
            onAdd={addWidget}
          />
          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-pressed={shownTheme === 'dark'}
            aria-label={shownTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            title={shownTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {/* The icon shows the theme you are in: a sun for light, a moon for dark. */}
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {shownTheme === 'dark' ? (
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </>
              )}
            </svg>
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Settings"
            title="Settings"
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </button>
        </div>
      </header>
      <BoardTabs
        boards={boards.boards}
        activeId={board.id}
        panelId={BOARD_PANEL_ID}
        onSwitch={boards.switchTo}
        onAdd={() => boards.addBoard()}
        onRename={boards.renameBoard}
        onDelete={boards.deleteBoard}
      />
      <div id={BOARD_PANEL_ID} role="tabpanel" aria-labelledby={tabId(board.id)}>
        <Dashboard
          // A new board starts with no drag in progress and its own layout.
          key={board.id}
          ids={shownWidgetIds}
          widgets={WIDGETS}
          saved={layout}
          context={context}
          onChange={setLayout}
          onRemove={removeWidget}
          focusRequest={focusRequest}
        />
        {shownWidgetIds.length === 0 && (
          <WidgetState
            status="empty"
            className="dashboard-empty"
            message={
              boards.boards.length > 1
                ? `Nothing on ${board.name} yet. Pick a starter layout, or use “Add widget” to choose your own.`
                : 'No widgets yet. Pick a starter layout, or use “Add widget” to choose your own.'
            }
          >
            <div className="starter-layouts">
              {STARTER_LAYOUTS.map((starter) => (
                <button
                  key={starter.id}
                  type="button"
                  className="starter-layout"
                  onClick={() => applyStarter(starter)}
                >
                  <strong>{starter.title}</strong>
                  <span>{starter.description}</span>
                </button>
              ))}
            </div>
          </WidgetState>
        )}
      </div>
      {reviewOpen && (
        <Suspense fallback={null}>
          <WeeklyReview
            tasks={tasks}
            habits={habits}
            habitLog={habitLog}
            sessions={focus.sessions}
            goals={goals}
            reviews={reviews}
            actions={{
              rescheduleTask: taskActions.rescheduleTask,
              updateTasks: taskActions.updateTasks,
              toggleTask: taskActions.toggleTask,
              notify,
            }}
            onSave={saveReview}
            onClose={() => setReviewOpen(false)}
          />
        </Suspense>
      )}
      {paletteOpen && <CommandPalette getCommands={getCommands} onClose={closePalette} />}
      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {settingsOpen && (
        <SettingsDrawer
          theme={theme}
          onThemeChange={setTheme}
          onResetLayout={resetLayout}
          onClose={() => setSettingsOpen(false)}
          ai={aiHealth}
          notify={notify}
        />
      )}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}

export default App;
