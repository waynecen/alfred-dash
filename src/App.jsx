import { useState, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import TaskForm from './components/TaskTracker/TaskForm';
import TaskFilter from './components/TaskTracker/TaskFilter';
import TaskList from './components/TaskTracker/TaskList';
import SummaryWidget from './components/SummaryWidget/SummaryWidget';
import './components/TaskTracker/TaskTracker.css';

function App() {
  // The tasks live here, so every child component shares one source of truth.
  const [tasks, setTasks] = useLocalStorage('tasks', []);
  // The filter is temporary UI state, so plain useState is enough (no need to save it).
  const [filter, setFilter] = useState('all');
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

  // Work out which tasks to show. We don't store this, we calculate it each render.
  const visibleTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true; // 'all'
  });

  // Counts come from ALL tasks (not visibleTasks), so they stay the same whichever filter is on.
  const counts = {
    active: tasks.filter((task) => !task.completed).length,
    completed: tasks.filter((task) => task.completed).length,
  };

  return (
    <main className="app">
      <header className="app-header">
        <h1>My Dashboard</h1>
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </header>
      {/* A grid so more widgets can be added alongside the summary later. */}
      <div className="widget-grid">
        <SummaryWidget active={counts.active} completed={counts.completed} />
      </div>
      <section className="task-tracker" aria-labelledby="tasks-heading">
        <h2 id="tasks-heading">Tasks</h2>
        <TaskFilter filter={filter} counts={counts} onChange={setFilter} />
        <TaskForm onAdd={addTask} />
        <TaskList
          tasks={visibleTasks}
          filter={filter}
          onToggle={toggleTask}
          onEdit={editTask}
          onPriorityChange={changePriority}
          onDelete={deleteTask}
        />
      </section>
    </main>
  );
}

export default App;
