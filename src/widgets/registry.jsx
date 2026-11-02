import SummaryWidget from '../components/SummaryWidget/SummaryWidget';
import TasksWidget from '../components/TaskTracker/TasksWidget';
import NotesWidget from '../components/NotesWidget/NotesWidget';

// Every widget the dashboard can show. To add a new one, add an entry here.
//   title / description: shown on the card and in the Add widget list
//   defaultSpan: how many of the grid's 12 columns it starts with (the user can resize it)
//   render: builds the widget's content from the dashboard's shared data (ctx)
export const WIDGETS = {
  summary: {
    title: 'Summary',
    defaultSpan: 4,
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
    defaultSpan: 8, // leaves room for the 4-column Summary beside it
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
    defaultSpan: 4,
    render: ({ notes, actions }) => <NotesWidget value={notes} onChange={actions.setNotes} />,
  },
};

// Shown the first time the dashboard opens.
export const DEFAULT_WIDGETS = ['summary', 'tasks'];
