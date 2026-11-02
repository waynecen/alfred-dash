import { useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import Widget from './components/Widget/Widget';
import AddWidgetMenu from './components/AddWidgetMenu/AddWidgetMenu';
import { WIDGETS, DEFAULT_WIDGETS } from './widgets/registry';
import countTasks from './utils/countTasks';

// What the Add widget list needs to know about each widget.
const WIDGET_OPTIONS = Object.entries(WIDGETS).map(([id, widget]) => ({
  id,
  title: widget.title,
  description: widget.description,
}));

function App() {
  // The tasks live here, so every widget shares one source of truth.
  const [tasks, setTasks] = useLocalStorage('tasks', []);
  // Which widgets are on the dashboard, in order. Saved so the layout survives a reload.
  const [widgetIds, setWidgetIds] = useLocalStorage('widgets', DEFAULT_WIDGETS);
  // First visit follows the operating system's setting; after that the saved choice wins.
  const [theme, setTheme] = useLocalStorage(
    'theme',
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // The CSS variables are switched by an attribute on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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

  function addWidget(id) {
    if (!widgetIds.includes(id)) setWidgetIds([...widgetIds, id]);
  }

  function removeWidget(id) {
    setWidgetIds(widgetIds.filter((widgetId) => widgetId !== id));
  }

  // Ignore saved ids that no longer exist in the registry (e.g. a widget that was renamed).
  const shownWidgetIds = widgetIds.filter((id) => WIDGETS[id]);

  // Everything a widget might need, handed to each widget's render function.
  const context = {
    tasks,
    counts: countTasks(tasks),
    actions: { addTask, toggleTask, editTask, changePriority, deleteTask },
  };

  return (
    <main className="app">
      <header className="app-header">
        <h1>My Dashboard</h1>
        <div className="app-header-actions">
          <AddWidgetMenu
            widgets={WIDGET_OPTIONS}
            added={shownWidgetIds}
            onAdd={addWidget}
          />
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </header>
      <div className="widget-grid">
        {shownWidgetIds.map((id) => {
          const widget = WIDGETS[id];
          return (
            <Widget
              key={id}
              title={widget.title}
              wide={widget.wide}
              onRemove={() => removeWidget(id)}
            >
              {widget.render(context)}
            </Widget>
          );
        })}
      </div>
      {shownWidgetIds.length === 0 && (
        <p className="dashboard-empty">
          No widgets yet. Use “Add widget” to get started.
        </p>
      )}
    </main>
  );
}

export default App;
