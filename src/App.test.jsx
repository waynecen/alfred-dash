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

  describe('sorting the table', () => {
    // The task descriptions in the order the rows are shown.
    const shownOrder = () =>
      [...document.querySelectorAll('.task-text')].map((el) => el.textContent);
    const sortBy = (column) =>
      userEvent.click(screen.getByRole('button', { name: `Sort by ${column}` }));

    async function addThree() {
      await addTask('Banana', 'high');
      await addTask('apple', 'low');
      await addTask('Cherry', 'medium');
    }

    it('keeps the order tasks were added in until a column is sorted', async () => {
      render(<App />);
      await addThree();
      expect(shownOrder()).toEqual(['Banana', 'apple', 'Cherry']);
    });

    it('sorts priority low to high, then high to low', async () => {
      render(<App />);
      await addThree();

      await sortBy('priority');
      expect(shownOrder()).toEqual(['apple', 'Cherry', 'Banana']);
      expect(screen.getByRole('columnheader', { name: /Priority/ })).toHaveAttribute('aria-sort', 'ascending');

      await sortBy('priority');
      expect(shownOrder()).toEqual(['Banana', 'Cherry', 'apple']);
      expect(screen.getByRole('columnheader', { name: /Priority/ })).toHaveAttribute('aria-sort', 'descending');

      await sortBy('priority');
      expect(shownOrder()).toEqual(['apple', 'Cherry', 'Banana']);
    });

    it('sorts description A to Z, then Z to A, ignoring case', async () => {
      render(<App />);
      await addThree();

      await sortBy('description');
      expect(shownOrder()).toEqual(['apple', 'Banana', 'Cherry']);
      await sortBy('description');
      expect(shownOrder()).toEqual(['Cherry', 'Banana', 'apple']);
    });

    it('starts a newly chosen column in ascending order', async () => {
      render(<App />);
      await addThree();

      await sortBy('priority');
      await sortBy('priority'); // now descending
      await sortBy('description');
      expect(shownOrder()).toEqual(['apple', 'Banana', 'Cherry']);
      expect(screen.getByRole('columnheader', { name: /Priority/ })).toHaveAttribute('aria-sort', 'none');
    });

    it('sorts by created without losing any task', async () => {
      render(<App />);
      await addThree();
      await sortBy('created');
      expect(shownOrder().sort()).toEqual(['Banana', 'Cherry', 'apple']);
      expect(screen.getByRole('columnheader', { name: /Created/ })).toHaveAttribute('aria-sort', 'ascending');
    });

    it('works together with the status filter', async () => {
      render(<App />);
      await addThree();
      await userEvent.click(screen.getByLabelText('Mark complete: apple'));

      await userEvent.click(screen.getByRole('button', { name: /Active/ }));
      await sortBy('priority');
      expect(shownOrder()).toEqual(['Cherry', 'Banana']);
    });

    it('has no filter inputs for description or priority', () => {
      render(<App />);
      expect(screen.queryByLabelText('Filter by description')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Filter by priority')).not.toBeInTheDocument();
    });
  });

  it('shows the Summary and Tasks widgets by default', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tasks' })).toBeInTheDocument();
  });

  it('removes a widget, then adds it back from the Add widget list', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Summary widget' }));
    expect(screen.queryByRole('region', { name: 'Summary' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('widgets'))).toEqual(['tasks']);

    await userEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    await userEvent.click(screen.getByRole('button', { name: /Summary/ }));
    expect(screen.getByRole('region', { name: 'Summary' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('widgets'))).toEqual(['tasks', 'summary']);
  });

  it('keeps the tasks when the Tasks widget is removed and re-added', async () => {
    render(<App />);
    await addTask('Keep me');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Tasks widget' }));
    expect(screen.queryByRole('button', { name: 'Keep me' })).not.toBeInTheDocument();
    // The Summary widget still counts the task, because the tasks live in App, not the widget.
    expect(screen.getByText('0 of 1 done (0%)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    await userEvent.click(screen.getByRole('button', { name: /Tasks/ }));
    expect(screen.getByRole('button', { name: 'Keep me' })).toBeInTheDocument();
  });

  it('shows a hint when every widget has been removed', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Summary widget' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove Tasks widget' }));
    expect(screen.getByText(/No widgets yet/)).toBeInTheDocument();
  });

  it('restores the saved widget layout and ignores unknown widgets', () => {
    localStorage.setItem('widgets', JSON.stringify(['old-widget', 'summary']));
    render(<App />);
    expect(screen.getByRole('region', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tasks' })).not.toBeInTheDocument();
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
