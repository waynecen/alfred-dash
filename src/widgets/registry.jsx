import { lazy } from 'react';
import SummaryWidget from '../components/SummaryWidget/SummaryWidget';
import TasksWidget from '../components/TaskTracker/TasksWidget';
import NotesWidget from '../components/NotesWidget/NotesWidget';
import AIGate from '../components/AIGate/AIGate';

// The widgets that open with a new dashboard (and Notes) load with the page; the rest only when
// a board shows them, so a dashboard loads only what it uses.
const WeatherWidget = lazy(() => import('../components/WeatherWidget/WeatherWidget'));
const DailyBriefWidget = lazy(() => import('../components/DailyBriefWidget/DailyBriefWidget'));
const TaskAssistantWidget = lazy(() => import('../components/TaskAssistantWidget/TaskAssistantWidget'));
const CalendarWidget = lazy(() => import('../components/CalendarWidget/CalendarWidget'));
const FocusWidget = lazy(() => import('../components/FocusWidget/FocusWidget'));
const ClockWidget = lazy(() => import('../components/ClockWidget/ClockWidget'));
const TodayWidget = lazy(() => import('../components/TodayWidget/TodayWidget'));
const HabitsWidget = lazy(() => import('../components/HabitsWidget/HabitsWidget'));
const GoalsWidget = lazy(() => import('../components/GoalsWidget/GoalsWidget'));
const AssistantWidget = lazy(() => import('../components/AssistantWidget/AssistantWidget'));

// Every widget the dashboard can show. To add a new one, add an entry here.
//   title / description: shown on the card and in the Add widget list
//   category: the heading it is listed under in the Add widget list (Productivity, Planning, Growth, Info, AI)
//   defaultSize: { w, h } in grid cells (12 columns, rows 48px tall) it starts with; the user can resize it
//   render: builds the widget's content from the dashboard's shared data (ctx)
export const WIDGETS = {
  summary: {
    title: 'Summary',
    category: 'Productivity',
    defaultSize: { w: 4, h: 6 },
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
  today: {
    title: 'Today',
    category: 'Planning',
    description: 'Today in one column: events, what is due, habits, focus, and a line to add to it',
    defaultSize: { w: 4, h: 10 },
    render: ({ tasks, events, focus, habits, habitLog, actions }) => (
      <TodayWidget tasks={tasks} events={events} focus={focus} habits={habits} habitLog={habitLog} actions={actions} />
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
        onSetTaskDue={actions.rescheduleTask}
        onToggleTask={actions.toggleTask}
      />
    ),
  },
  focus: {
    title: 'Focus',
    category: 'Planning',
    description: 'A focus timer: work in sessions with short breaks, linked to a task',
    defaultSize: { w: 4, h: 8 },
    render: ({ focus, tasks, actions }) => <FocusWidget focus={focus} actions={actions.focusTimer} tasks={tasks} />,
  },
  habits: {
    title: 'Habits',
    category: 'Growth',
    description: 'Habits to keep: tick off each day and watch your streaks; wider, the last 12 weeks',
    defaultSize: { w: 4, h: 10 },
    render: ({ habits, habitLog, actions }) => <HabitsWidget habits={habits} log={habitLog} actions={actions} />,
  },
  goals: {
    title: 'Goals',
    category: 'Growth',
    description: 'Goals to reach: count up by hand, or follow the tasks with a tag',
    defaultSize: { w: 4, h: 9 },
    render: ({ goals, tasks, actions }) => <GoalsWidget goals={goals} tasks={tasks} actions={actions} />,
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
  clock: {
    title: 'Clock',
    category: 'Info',
    description: 'The time here in large type, and in other cities you add',
    defaultSize: { w: 4, h: 6 },
    render: () => <ClockWidget />,
  },
  // The AI widgets wait behind AIGate, which says how to set the assistant up when it can't be reached.
  assistant: {
    title: 'Assistant',
    category: 'AI',
    description: 'Ask Claude about your day; it proposes changes, and nothing changes until you apply them',
    defaultSize: { w: 4, h: 12 },
    render: ({ tasks, events, habits, habitLog, goals, focus, notes, actions, assistantRequest }) => (
      <AIGate>
        <AssistantWidget
          data={{ tasks, events, habits, habitLog, goals, focus, notes }}
          actions={actions}
          notify={actions.notify}
          request={assistantRequest}
          onRequestHandled={actions.assistantRequestHandled}
        />
      </AIGate>
    ),
  },
  brief: {
    title: 'Daily Brief',
    category: 'AI',
    description: 'A short plan for today from your tasks, events, habits, notes and weather',
    defaultSize: { w: 4, h: 6 },
    render: ({ tasks, notes, events, habits, habitLog }) => (
      <AIGate>
        <DailyBriefWidget tasks={tasks} notes={notes} events={events} habits={habits} habitLog={habitLog} />
      </AIGate>
    ),
  },
  taskAssistant: {
    title: 'Task Assistant',
    category: 'AI',
    description: 'Break a task into steps, or turn your notes into tasks',
    defaultSize: { w: 4, h: 8 },
    render: ({ tasks, notes, actions }) => (
      <AIGate>
        <TaskAssistantWidget tasks={tasks} notes={notes} onAddTasks={actions.addTasks} notify={actions.notify} />
      </AIGate>
    ),
  },
};

// Shown the first time the dashboard opens (defined with the boards, which start with them).
export { DEFAULT_WIDGETS } from '../data/boards';

// Ready-made sets offered when the dashboard is empty, so nobody starts from a blank page.
export const STARTER_LAYOUTS = [
  {
    id: 'today',
    title: 'Today',
    description: 'Today, calendar and focus timer',
    widgets: ['today', 'calendar', 'focus'],
  },
  {
    id: 'habits',
    title: 'Habits',
    description: 'Habits, goals and today',
    widgets: ['habits', 'goals', 'today'],
  },
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
