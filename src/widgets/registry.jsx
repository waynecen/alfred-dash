import SummaryWidget from '../components/SummaryWidget/SummaryWidget';
import TasksWidget from '../components/TaskTracker/TasksWidget';
import NotesWidget from '../components/NotesWidget/NotesWidget';
import WeatherWidget from '../components/WeatherWidget/WeatherWidget';
import DailyBriefWidget from '../components/DailyBriefWidget/DailyBriefWidget';
import TaskAssistantWidget from '../components/TaskAssistantWidget/TaskAssistantWidget';
import CalendarWidget from '../components/CalendarWidget/CalendarWidget';

// Every widget the dashboard can show. To add a new one, add an entry here.
//   title / description: shown on the card and in the Add widget list
//   category: the heading it is listed under in the Add widget list (Productivity, Planning, Info, AI)
//   defaultSize: { w, h } in grid cells (12 columns, rows 48px tall) it starts with; the user can resize it
//   render: builds the widget's content from the dashboard's shared data (ctx)
export const WIDGETS = {
  summary: {
    title: 'Summary',
    category: 'Productivity',
    defaultSize: { w: 4, h: 8 },
    description: 'Open and done counts, what is overdue or due today, and the last week of progress',
    render: ({ counts, tasks }) => (
      <SummaryWidget
        active={counts.active}
        completed={counts.completed}
        openByPriority={counts.openByPriority}
        tasks={tasks}
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
        onUpdate={actions.updateTask}
        onDelete={actions.deleteTask}
        onReorder={actions.reorderTasks}
        onCompleteMany={actions.completeTasks}
        onUpdateMany={actions.updateTasks}
        onDeleteMany={actions.deleteTasks}
      />
    ),
  },
  calendar: {
    title: 'Calendar',
    category: 'Planning',
    description: 'A month or week of your events and the tasks due each day',
    defaultSize: { w: 4, h: 11 },
    render: ({ events, tasks, actions }) => (
      <CalendarWidget
        events={events}
        tasks={tasks}
        onAddEvent={actions.addEvent}
        onDeleteEvent={actions.deleteEvent}
        onSetTaskDue={(id, dueDate) => actions.updateTask(id, { dueDate })}
        onToggleTask={actions.toggleTask}
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
    defaultSize: { w: 4, h: 8 },
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

// Shown the first time the dashboard opens (defined with the boards, which start with them).
export { DEFAULT_WIDGETS } from '../data/boards';

// Ready-made sets offered when the dashboard is empty, so nobody starts from a blank page.
export const STARTER_LAYOUTS = [
  {
    id: 'planner',
    title: 'Planner',
    description: 'Summary, tasks and notes',
    widgets: ['summary', 'tasks', 'notes'],
  },
  {
    id: 'daily',
    title: 'Daily',
    description: 'Weather, summary and tasks',
    widgets: ['weather', 'summary', 'tasks'],
  },
  {
    id: 'minimal',
    title: 'Minimal',
    description: 'Tasks only',
    widgets: ['tasks'],
  },
];
