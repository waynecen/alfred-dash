import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
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

  describe('reordering tasks', () => {
    const shownOrder = () =>
      [...document.querySelectorAll('.task-text')].map((el) => el.textContent);
    const handle = (text) => screen.getByRole('button', { name: `Reorder task: ${text}` });

    it('moves a task with the arrow keys on its handle', async () => {
      render(<App />);
      await addTask('One');
      await addTask('Two');
      await addTask('Three');

      handle('Three').focus();
      await userEvent.keyboard('{ArrowUp}{ArrowUp}');
      expect(shownOrder()).toEqual(['Three', 'One', 'Two']);
      expect(JSON.parse(localStorage.getItem('tasks')).map((t) => t.text)).toEqual(['Three', 'One', 'Two']);

      await userEvent.keyboard('{ArrowDown}');
      expect(shownOrder()).toEqual(['One', 'Three', 'Two']);
    });

    it('moves a task by dragging its handle onto another row', () => {
      render(<App />);
      return addTask('One')
        .then(() => addTask('Two'))
        .then(() => addTask('Three'))
        .then(() => {
          const dataTransfer = { setData() {}, setDragImage() {}, effectAllowed: '' };
          fireEvent.dragStart(handle('One'), { dataTransfer });
          fireEvent.dragOver(handle('Three').closest('tr'), { dataTransfer });
          fireEvent.drop(handle('Three').closest('tr'), { dataTransfer });
          expect(shownOrder()).toEqual(['Two', 'Three', 'One']);
        });
    });

    it('shows the other rows moving aside while a task is dragged, and puts them back if dropped elsewhere', async () => {
      render(<App />);
      await addTask('One');
      await addTask('Two');
      await addTask('Three');
      const dataTransfer = { setData() {}, setDragImage() {}, effectAllowed: '' };

      fireEvent.dragStart(handle('One'), { dataTransfer });
      fireEvent.dragOver(handle('Two').closest('tr'), { dataTransfer });
      // Nothing is saved yet, but the second task has already moved up into first place.
      expect(shownOrder()).toEqual(['Two', 'One', 'Three']);
      expect(JSON.parse(localStorage.getItem('tasks')).map((t) => t.text)).toEqual(['One', 'Two', 'Three']);

      fireEvent.dragOver(handle('Three').closest('tr'), { dataTransfer });
      expect(shownOrder()).toEqual(['Two', 'Three', 'One']);

      fireEvent.dragEnd(handle('One'));
      expect(shownOrder()).toEqual(['One', 'Two', 'Three']);
    });

    it('returns to the original position when dragged down and back up', () => {
      render(<App />);
      return addTask('One')
        .then(() => addTask('Two'))
        .then(() => addTask('Three'))
        .then(() => {
          const dataTransfer = { setData() {}, setDragImage() {}, effectAllowed: '' };
          const row = (text) => handle(text).closest('tr');

          fireEvent.dragStart(handle('One'), { dataTransfer });
          fireEvent.dragOver(row('Two'), { dataTransfer });
          expect(shownOrder()).toEqual(['Two', 'One', 'Three']);

          // Back over the row that moved up: it is first on screen, so One goes back there.
          fireEvent.dragOver(row('Two'), { dataTransfer });
          expect(shownOrder()).toEqual(['One', 'Two', 'Three']);

          fireEvent.drop(row('One'), { dataTransfer });
          expect(shownOrder()).toEqual(['One', 'Two', 'Three']);
          expect(JSON.parse(localStorage.getItem('tasks')).map((t) => t.text)).toEqual(['One', 'Two', 'Three']);
        });
    });

    it('clears the column sort and keeps the sorted order as the starting point', async () => {
      render(<App />);
      await addTask('C');
      await addTask('A');
      await addTask('B');
      await userEvent.click(screen.getByRole('button', { name: 'Sort by description' }));
      expect(shownOrder()).toEqual(['A', 'B', 'C']);

      handle('A').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(shownOrder()).toEqual(['B', 'A', 'C']);
      expect(screen.getByRole('columnheader', { name: /Description/ })).toHaveAttribute('aria-sort', 'none');
    });
  });

  it('keeps the Summary priority counts in sync as tasks change', async () => {
    render(<App />);
    const counts = () => screen.getByRole('list', { name: 'Open tasks by priority' });

    await addTask('A', 'high');
    await addTask('B', 'high');
    await addTask('C', 'low');
    expect(counts()).toHaveTextContent('2 high open');
    expect(counts()).toHaveTextContent('0 medium open');
    expect(counts()).toHaveTextContent('1 low open');

    // Completing a task takes it out of the open counts.
    await userEvent.click(screen.getByLabelText('Mark complete: A'));
    expect(counts()).toHaveTextContent('1 high open');

    // Changing a priority moves it between counts.
    await userEvent.selectOptions(screen.getByLabelText('Priority: B'), 'medium');
    expect(counts()).toHaveTextContent('0 high open');
    expect(counts()).toHaveTextContent('1 medium open');

    // Deleting a task removes it.
    await userEvent.click(screen.getByRole('button', { name: 'Delete task: C' }));
    expect(counts()).toHaveTextContent('0 low open');
  });

  describe('customising the dashboard', () => {
    const titles = () => [...document.querySelectorAll('.widget h2')].map((el) => el.textContent);

    it('adds a Notes widget that keeps what you type, even after it is removed', async () => {
      render(<App />);
      await userEvent.click(screen.getByRole('button', { name: 'Add widget' }));
      await userEvent.click(screen.getByRole('button', { name: /^Notes/ }));
      await userEvent.type(screen.getByRole('textbox', { name: 'Notes' }), 'Buy milk');
      expect(JSON.parse(localStorage.getItem('notes'))).toBe('Buy milk');

      await userEvent.click(screen.getByRole('button', { name: 'Remove Notes widget' }));
      await userEvent.click(screen.getByRole('button', { name: 'Add widget' }));
      await userEvent.click(screen.getByRole('button', { name: /^Notes/ }));
      expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('Buy milk');
    });

    it('reorders widgets with the arrow keys and remembers the order', async () => {
      render(<App />);
      expect(titles()).toEqual(['Summary', 'Tasks']);
      screen.getByRole('button', { name: 'Move Tasks widget' }).focus();
      await userEvent.keyboard('{ArrowUp}');
      expect(titles()).toEqual(['Tasks', 'Summary']);
      expect(JSON.parse(localStorage.getItem('widgets'))).toEqual(['tasks', 'summary']);
    });

    it('reorders widgets by dragging one card onto another', async () => {
      render(<App />);
      const dataTransfer = { setData() {}, setDragImage() {}, effectAllowed: '' };
      const target = screen.getByRole('region', { name: 'Tasks' });
      fireEvent.dragStart(screen.getByRole('button', { name: 'Move Summary widget' }), { dataTransfer });
      await waitFor(() => expect(document.querySelector('.widget-placeholder')).not.toBeNull());
      fireEvent.dragOver(target, { dataTransfer });
      fireEvent.drop(target, { dataTransfer });
      expect(titles()).toEqual(['Tasks', 'Summary']);
    });

    it('shows a placeholder the size of the dragged widget where it will land', async () => {
      render(<App />);
      const dataTransfer = { setData() {}, setDragImage() {}, effectAllowed: '' };
      const placeholder = () => document.querySelector('.widget-placeholder');
      expect(placeholder()).toBeNull();

      fireEvent.dragStart(screen.getByRole('button', { name: 'Move Summary widget' }), { dataTransfer });
      await waitFor(() => expect(placeholder()).toHaveAttribute('data-span', '4'));

      fireEvent.dragOver(screen.getByRole('region', { name: 'Tasks' }), { dataTransfer });
      // Moving down puts it after the card it is over.
      expect(placeholder().previousElementSibling).toBe(screen.getByRole('region', { name: 'Tasks' }));

      fireEvent.dragEnd(screen.getByRole('button', { name: 'Move Summary widget' }));
      expect(placeholder()).toBeNull();
    });

    it('resizes a widget in whole columns and remembers the size', async () => {
      render(<App />);
      const summary = screen.getByRole('region', { name: 'Summary' });
      expect(summary).toHaveAttribute('data-span', '4');

      screen.getByRole('button', { name: 'Resize Summary widget' }).focus();
      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      expect(summary).toHaveAttribute('data-span', '6');
      expect(JSON.parse(localStorage.getItem('widgetSpans'))).toEqual({ summary: 6 });
    });
  });

  it('renames the dashboard and remembers the name', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit dashboard title' }));
    const input = screen.getByLabelText('Dashboard title');
    await userEvent.clear(input);
    await userEvent.type(input, 'Home base{Enter}');
    expect(screen.getByRole('heading', { level: 1, name: 'Home base' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('dashboardTitle'))).toBe('Home base');
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
