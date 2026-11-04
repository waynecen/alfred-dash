import { useEffect, useState } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import EditableTitle from './components/EditableTitle/EditableTitle';
import Dashboard from './components/Dashboard/Dashboard';
import AddWidgetMenu from './components/AddWidgetMenu/AddWidgetMenu';
import { WIDGETS, DEFAULT_WIDGETS } from './widgets/registry';
import countTasks from './utils/countTasks';

// What the Add widget list needs to know about each widget.
const WIDGET_OPTIONS = Object.entries(WIDGETS).map(([id, widget]) => ({
  id,
  title: widget.title,
  description: widget.description,
  category: widget.category,
}));

function App() {
  // The tasks live here, so every widget shares one source of truth.
  const [tasks, setTasks] = useLocalStorage('tasks', []);
  // Which widgets are on the dashboard, in order. Saved so the layout survives a reload.
  const [widgetIds, setWidgetIds] = useLocalStorage('widgets', DEFAULT_WIDGETS);
  // Where each widget sits on the grid and how big it is: { [id]: { x, y, w, h } }.
  // Widgets without an entry are placed in the first free spot at their default size.
  const [layout, setLayout] = useLocalStorage('layout', {});
  // The notepad text lives here too, so it survives removing and re-adding the widget.
  const [notes, setNotes] = useLocalStorage('notes', '');
  const [title, setTitle] = useLocalStorage('dashboardTitle', 'My Dashboard');
  // First visit follows the operating system's setting; after that the saved choice wins.
  const [theme, setTheme] = useLocalStorage(
    'theme',
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Asks a widget to take keyboard focus: { id, n }, with a new n each time.
  const [focusRequest, setFocusRequest] = useState(null);

  // The CSS variables are switched by an attribute on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function focusWidget(id) {
    setFocusRequest((request) => ({ id, n: (request?.n ?? 0) + 1 }));
  }

  function addTask(text, priority) {
    const newTask = {
      id: Date.now(), // simple unique id; fine for a personal app
      text,
      priority, // 'low' | 'medium' | 'high'
      completed: false,
      createdAt: Date.now(), // when the task was created, in milliseconds
    };
    // Never change state directly: build a new array instead.
    setTasks([...tasks, newTask]);
  }

  function toggleTask(id) {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  function editTask(id, newText) {
    setTasks(
      tasks.map((task) => (task.id === id ? { ...task, text: newText } : task))
    );
  }

  function changePriority(id, priority) {
    setTasks(
      tasks.map((task) => (task.id === id ? { ...task, priority } : task))
    );
  }

  function deleteTask(id) {
    setTasks(tasks.filter((task) => task.id !== id));
  }

  function reorderTasks(newTasks) {
    setTasks(newTasks);
  }

  function addWidget(id) {
    if (!widgetIds.includes(id)) setWidgetIds([...widgetIds, id]);
    // Take the user to it, so they can see where it landed.
    focusWidget(id);
  }

  function removeWidget(id) {
    setWidgetIds(widgetIds.filter((widgetId) => widgetId !== id));
    // Forget its spot, so adding it back later places it in a free one.
    const { [id]: _removed, ...rest } = layout;
    setLayout(rest);
  }

  // Ignore saved ids that no longer exist in the registry (e.g. a widget that was renamed).
  const shownWidgetIds = widgetIds.filter((id) => WIDGETS[id]);

  // Everything a widget might need, handed to each widget's render function.
  const context = {
    tasks,
    notes,
    counts: countTasks(tasks),
    actions: { addTask, toggleTask, editTask, changePriority, deleteTask, reorderTasks, setNotes },
  };

  return (
    <main className="app">
      <header className="app-header">
        <EditableTitle value={title} onChange={setTitle} />
        <div className="app-header-actions">
          <AddWidgetMenu
            widgets={WIDGET_OPTIONS}
            added={shownWidgetIds}
            onAdd={addWidget}
          />
          <button
            type="button"
            className="icon-button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
              {theme === 'dark' ? (
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>
      <Dashboard
        ids={shownWidgetIds}
        widgets={WIDGETS}
        saved={layout}
        context={context}
        onChange={setLayout}
        onRemove={removeWidget}
        focusRequest={focusRequest}
      />
      {shownWidgetIds.length === 0 && (
        <p className="dashboard-empty">
          No widgets yet. Use “Add widget” to get started.
        </p>
      )}
    </main>
  );
}

export default App;
