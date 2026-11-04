import SummaryWidget from '../components/SummaryWidget/SummaryWidget';
import TasksWidget from '../components/TaskTracker/TasksWidget';
import NotesWidget from '../components/NotesWidget/NotesWidget';
import WeatherWidget from '../components/WeatherWidget/WeatherWidget';

// Every widget the dashboard can show. To add a new one, add an entry here.
//   title / description: shown on the card and in the Add widget list
//   defaultSize: { w, h } in grid cells (12 columns, rows 48px tall) it starts with; the user can resize it
//   render: builds the widget's content from the dashboard's shared data (ctx)
export const WIDGETS = {
  summary: {
    title: 'Summary',
    defaultSize: { w: 4, h: 4 },
    description: 'Active and completed counts, open tasks by priority, and a progress bar',
    render: ({ counts }) => (
      <SummaryWidget
        active={counts.active}
        completed={counts.completed}
        openByPriority={counts.openByPriority}
      />
    ),
  },
  tasks: {
    title: 'Tasks',
    description: 'A table to add, edit, filter and complete tasks',
    defaultSize: { w: 8, h: 9 }, // leaves room for the 4-column Summary beside it
    render: ({ tasks, actions }) => (
      <TasksWidget
        tasks={tasks}
        onAdd={actions.addTask}
        onToggle={actions.toggleTask}
        onEdit={actions.editTask}
        onPriorityChange={actions.changePriority}
        onDelete={actions.deleteTask}
        onReorder={actions.reorderTasks}
      />
    ),
  },
  notes: {
    title: 'Notes',
    description: 'A notepad that saves as you type',
    defaultSize: { w: 4, h: 5 },
    render: ({ notes, actions }) => <NotesWidget value={notes} onChange={actions.setNotes} />,
  },
  weather: {
    title: 'Weather',
    description: 'Current conditions, hourly and 10-day forecasts for places you add',
    defaultSize: { w: 4, h: 11 }, // tall enough for the hourly and 10-day forecasts; it shows more as it grows
    render: () => <WeatherWidget />,
  },
};

// Shown the first time the dashboard opens.
export const DEFAULT_WIDGETS = ['summary', 'tasks'];
