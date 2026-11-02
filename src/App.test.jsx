import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

async function addTask(text, priority) {
  if (priority) await userEvent.selectOptions(screen.getByLabelText('Priority'), priority);
  await userEvent.type(screen.getByLabelText('New task'), `${text}{Enter}`);
}

describe('App', () => {
  it('adds, completes, and deletes tasks, keeping the summary in sync', async () => {
    render(<App />);
    await addTask('First');
    await addTask('Second');
    expect(screen.getByText('0 of 2 done (0%)')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Mark complete: First'));
    expect(screen.getByText('1 of 2 done (50%)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete task: First' }));
    expect(screen.queryByRole('button', { name: 'First' })).not.toBeInTheDocument();
    expect(screen.getByText('0 of 1 done (0%)')).toBeInTheDocument();
  });

  it('edits a task and changes its priority', async () => {
    render(<App />);
    await addTask('Draft', 'low');
    expect(screen.getByLabelText('Priority: Draft')).toHaveValue('low');

    await userEvent.selectOptions(screen.getByLabelText('Priority: Draft'), 'high');
    expect(screen.getByLabelText('Priority: Draft')).toHaveValue('high');

    await userEvent.click(screen.getByRole('button', { name: 'Draft' }));
    const input = screen.getByLabelText('Edit task');
    await userEvent.clear(input);
    await userEvent.type(input, 'Final{Enter}');
    expect(screen.getByRole('button', { name: 'Final' })).toBeInTheDocument();
  });

  it('filters tasks by status', async () => {
    render(<App />);
    await addTask('Open task');
    await addTask('Done task');
    await userEvent.click(screen.getByLabelText('Mark complete: Done task'));

    const filter = screen.getByRole('group', { name: 'Filter tasks' });
    await userEvent.click(within(filter).getByRole('button', { name: /Completed/ }));
    expect(screen.getByRole('button', { name: 'Done task' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open task' })).not.toBeInTheDocument();

    await userEvent.click(within(filter).getByRole('button', { name: /Active/ }));
    expect(screen.getByRole('button', { name: 'Open task' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done task' })).not.toBeInTheDocument();
  });

  it('restores saved tasks from localStorage', () => {
    localStorage.setItem(
      'tasks',
      JSON.stringify([{ id: 1, text: 'Saved', completed: false, createdAt: Date.now() }])
    );
    render(<App />);
    expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
  });

  it('toggles the dark theme and remembers it', async () => {
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('light');

    await userEvent.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(JSON.parse(localStorage.getItem('theme'))).toBe('dark');
    expect(screen.getByRole('button', { name: 'Light mode' })).toBeInTheDocument();
  });
});
