import SummaryWidget from '../components/SummaryWidget/SummaryWidget';
import TasksWidget from '../components/TaskTracker/TasksWidget';
import NotesWidget from '../components/NotesWidget/NotesWidget';
import WeatherWidget from '../components/WeatherWidget/WeatherWidget';
import DailyBriefWidget from '../components/DailyBriefWidget/DailyBriefWidget';
import TaskAssistantWidget from '../components/TaskAssistantWidget/TaskAssistantWidget';

// Every widget the dashboard can show. To add a new one, add an entry here.
//   title / description: shown on the card and in the Add widget list
//   category: the heading it is listed under in the Add widget list (Productivity, Info, AI)
//   defaultSize: { w, h } in grid cells (12 columns, rows 48px tall) it starts with; the user can resize it
//   render: builds the widget's content from the dashboard's shared data (ctx)
export const WIDGETS = {
  summary: {
    title: 'Summary',
    category: 'Productivity',
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
    category: 'Productivity',
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
    category: 'Productivity',
    description: 'A notepad that saves as you type',
    defaultSize: { w: 4, h: 5 },
    render: ({ notes, actions }) => <NotesWidget value={notes} onChange={actions.setNotes} />,
  },
  weather: {
    title: 'Weather',
    category: 'Info',
    description: 'Current conditions, hourly and 10-day forecasts for places you add',
    defaultSize: { w: 4, h: 11 }, // tall enough for the hourly and 10-day forecasts; it shows more as it grows
    render: () => <WeatherWidget />,
  },
  brief: {
    title: 'Daily Brief',
    category: 'AI',
    description: 'A short plan for today from your tasks, notes and weather',
    defaultSize: { w: 4, h: 6 },
    render: ({ tasks, notes }) => <DailyBriefWidget tasks={tasks} notes={notes} />,
  },
  taskAssistant: {
    title: 'Task Assistant',
    category: 'AI',
    description: 'Break a task into steps, or turn your notes into tasks',
    defaultSize: { w: 4, h: 7 },
    render: ({ tasks, notes, actions }) => (
      <TaskAssistantWidget
        tasks={tasks}
        notes={notes}
        onAddTasks={actions.addTasks}
        notify={actions.notify}
      />
    ),
  },
};

// Shown the first time the dashboard opens.
export const DEFAULT_WIDGETS = ['summary', 'tasks'];

// Ready-made sets offered when the dashboard is empty, so nobody starts from a blank page.
export const STARTER_LAYOUTS = [
  {
    id: 'planner',
    title: 'Planner',
    description: 'Tasks, a summary and notes',
    widgets: ['summary', 'tasks', 'notes'],
  },
  {
    id: 'daily',
    title: 'Daily',
    description: 'Weather, tasks and a summary',
    widgets: ['weather', 'summary', 'tasks'],
  },
  {
    id: 'minimal',
    title: 'Minimal',
    description: 'Just your tasks',
    widgets: ['tasks'],
  },
];
