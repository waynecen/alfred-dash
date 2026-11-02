import { useState } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import TaskForm from './components/TaskTracker/TaskForm';
import TaskFilter from './components/TaskTracker/TaskFilter';
import TaskList from './components/TaskTracker/TaskList';
import './components/TaskTracker/TaskTracker.css';

function App() {
  // The tasks live here, so every child component shares one source of truth.
  const [tasks, setTasks] = useLocalStorage('tasks', []);
  // The filter is temporary UI state, so plain useState is enough (no need to save it).
  const [filter, setFilter] = useState('all');

  function addTask(text) {
    const newTask = {
      id: Date.now(), // simple unique id; fine for a personal app
      text,
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
      <h1>My Dashboard</h1>
      <section className="task-tracker" aria-labelledby="tasks-heading">
        <h2 id="tasks-heading">Tasks</h2>
        <TaskForm onAdd={addTask} />
        <TaskFilter filter={filter} counts={counts} onChange={setFilter} />
        <TaskList
          tasks={visibleTasks}
          filter={filter}
          onToggle={toggleTask}
          onEdit={editTask}
          onDelete={deleteTask}
        />
      </section>
    </main>
  );
}

export default App;
