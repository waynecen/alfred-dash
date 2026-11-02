import SummaryWidget from '../components/SummaryWidget/SummaryWidget';
import TasksWidget from '../components/TaskTracker/TasksWidget';

// Every widget the dashboard can show. To add a new one, add an entry here.
//   title / description: shown on the card and in the Add widget list
//   wide: true makes it take a whole row of the grid
//   render: builds the widget's content from the dashboard's shared data (ctx)
export const WIDGETS = {
  summary: {
    title: 'Summary',
    description: 'Active and completed task counts with a progress bar',
    render: ({ counts }) => (
      <SummaryWidget active={counts.active} completed={counts.completed} />
    ),
  },
  tasks: {
    title: 'Tasks',
    description: 'A table to add, edit, filter and complete tasks',
    wide: true,
    render: ({ tasks, actions }) => (
      <TasksWidget
        tasks={tasks}
        onAdd={actions.addTask}
        onToggle={actions.toggleTask}
        onEdit={actions.editTask}
        onPriorityChange={actions.changePriority}
        onDelete={actions.deleteTask}
      />
    ),
  },
};

// Shown the first time the dashboard opens.
export const DEFAULT_WIDGETS = ['summary', 'tasks'];
