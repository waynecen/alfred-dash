import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
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
    const savedLayout = () => JSON.parse(localStorage.getItem('layout'));
    const handle = (name) => screen.getByRole('button', { name: `Move ${name} widget` });
    const resizer = (name) => screen.getByRole('button', { name: `Resize ${name} widget` });
    const cardOf = (name) => screen.getByRole('region', { name });

    // jsdom has no layout, so give the grid a width: 12 columns of 100px, with rows of 48px.
    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
        const width = this.classList.contains('widget-grid') ? 1200 : 100;
        return { width, height: 0, left: 0, top: 0, right: width, bottom: 0, x: 0, y: 0 };
      });
    });
    afterEach(() => vi.restoreAllMocks());

    // A pointer drag: press on an element, move the pointer, optionally let go.
    function drag(element, { dx = 0, dy = 0, release = true } = {}) {
      fireEvent.pointerDown(element, { clientX: 500, clientY: 300, button: 0 });
      fireEvent.pointerMove(window, { clientX: 500 + dx, clientY: 300 + dy });
      if (release) fireEvent.pointerUp(window, { clientX: 500 + dx, clientY: 300 + dy });
    }

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

    it('starts with the Summary beside the Tasks, and puts a new widget in the free space under the Summary', async () => {
      render(<App />);
      expect(cardOf('Summary').style.gridColumn).toBe('1 / span 4');
      expect(cardOf('Tasks').style.gridColumn).toBe('5 / span 8');

      await userEvent.click(screen.getByRole('button', { name: 'Add widget' }));
      await userEvent.click(screen.getByRole('button', { name: /^Notes/ }));
      expect(cardOf('Notes').style.gridColumn).toBe('1 / span 4');
      expect(cardOf('Notes').style.gridRow).toBe('5 / span 5');
    });

    it('moves a widget with the arrow keys, the others make way, and the layout is remembered', async () => {
      render(<App />);
      expect(titles()).toEqual(['Summary', 'Tasks']);

      handle('Tasks').focus();
      await userEvent.keyboard('{ArrowLeft}');
      // Tasks now overlaps the Summary's columns, so the Summary drops underneath it.
      expect(titles()).toEqual(['Tasks', 'Summary']);
      expect(savedLayout().tasks).toEqual({ x: 3, y: 0, w: 8, h: 9 });
      expect(savedLayout().summary.y).toBe(9);
    });

    it('resizes a widget one column or row at a time, pushing its neighbour out of the way', async () => {
      render(<App />);
      resizer('Summary').focus();
      await userEvent.keyboard('{ArrowRight}{ArrowDown}');

      expect(cardOf('Summary').style.gridColumn).toBe('1 / span 5');
      expect(cardOf('Summary').style.gridRow).toBe('1 / span 5');
      expect(savedLayout().summary).toEqual({ x: 0, y: 0, w: 5, h: 5 });
      // The Tasks' first column is now taken, so it moves down below the Summary.
      expect(savedLayout().tasks.y).toBe(5);
    });

    it('moves a widget by dragging its handle, snapping to whole cells', () => {
      render(<App />);
      // 140px left is 1.4 columns: it snaps to 1 column left.
      drag(handle('Tasks'), { dx: -140 });
      expect(savedLayout().tasks).toEqual({ x: 3, y: 0, w: 8, h: 9 });
      expect(titles()).toEqual(['Tasks', 'Summary']);
    });

    it('shows where a dragged widget will land, and lets the card follow the pointer', () => {
      render(<App />);
      drag(handle('Tasks'), { dx: -140, release: false });

      const ghost = document.querySelector('.widget-ghost');
      expect(ghost.style.gridColumn).toBe('4 / span 8');
      expect(cardOf('Tasks')).toHaveClass('is-moving');
      // The card is drawn 40px right of the snapped cell: 140px dragged, 100px of it snapped.
      expect(cardOf('Tasks').style.transform).toBe('translate(-40px, 0px)');

      fireEvent.pointerUp(window);
      expect(document.querySelector('.widget-ghost')).toBeNull();
      expect(cardOf('Tasks')).not.toHaveClass('is-moving');
    });

    it('returns a widget to where it was when it is dragged away and back', () => {
      render(<App />);
      fireEvent.pointerDown(handle('Tasks'), { clientX: 500, clientY: 300, button: 0 });
      fireEvent.pointerMove(window, { clientX: 200, clientY: 300 });
      fireEvent.pointerMove(window, { clientX: 500, clientY: 300 });
      fireEvent.pointerUp(window);
      expect(titles()).toEqual(['Summary', 'Tasks']);
      expect(savedLayout()).toEqual({});
    });

    it('cancels a drag with Escape', () => {
      render(<App />);
      drag(handle('Tasks'), { dx: -300, release: false });
      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.pointerUp(window);
      expect(titles()).toEqual(['Summary', 'Tasks']);
      expect(savedLayout()).toEqual({});
    });

    it('resizes a widget by dragging its bottom edge and its right edge', () => {
      const { container } = render(<App />);
      const summary = cardOf('Summary');

      // Two rows down (96px) on the bottom edge: taller, same width.
      drag(summary.querySelector('.widget-edge-s'), { dy: 96 });
      expect(savedLayout().summary).toEqual({ x: 0, y: 0, w: 4, h: 6 });

      // One column right on the right edge: wider, same height.
      drag(container.querySelector('.widget-edge-e'), { dx: 100 });
      expect(savedLayout().summary).toEqual({ x: 0, y: 0, w: 5, h: 6 });
    });

    it('lets the card itself take the new size while it is being resized', () => {
      render(<App />);
      drag(resizer('Summary'), { dx: 200, dy: 96, release: false });
      expect(cardOf('Summary')).toHaveClass('is-resizing');
      expect(cardOf('Summary').style.gridColumn).toBe('1 / span 6');
      expect(cardOf('Summary').style.gridRow).toBe('1 / span 6');
      fireEvent.pointerUp(window);
      expect(savedLayout().summary).toEqual({ x: 0, y: 0, w: 6, h: 6 });
    });

    it('never makes a widget smaller than its minimum or wider than the grid', () => {
      render(<App />);
      drag(resizer('Summary'), { dx: -900, dy: -900 });
      expect(savedLayout().summary).toMatchObject({ w: 3, h: 2 });

      drag(resizer('Tasks'), { dx: 5000 });
      expect(savedLayout().tasks.w).toBe(8); // it starts at column 5 of 12, so 8 is the most
    });

    it('forgets a removed widget spot, so adding it back finds a free one', async () => {
      render(<App />);
      drag(resizer('Summary'), { dx: 100 });
      expect(savedLayout().summary).toBeDefined();

      await userEvent.click(screen.getByRole('button', { name: 'Remove Summary widget' }));
      expect(savedLayout().summary).toBeUndefined();
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

  describe('undo', () => {
    it('brings a removed widget back to the same place and focuses it', async () => {
      render(<App />);
      await userEvent.click(screen.getByRole('button', { name: 'Remove Summary widget' }));
      expect(screen.getByText('Summary removed')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(JSON.parse(localStorage.getItem('widgets'))).toEqual(['summary', 'tasks']);
      expect(screen.getByRole('button', { name: 'Move Summary widget' })).toHaveFocus();
      expect(screen.queryByText('Summary removed')).not.toBeInTheDocument();
    });

    it('brings a deleted task back at the same position', async () => {
      render(<App />);
      await addTask('One');
      await addTask('Two');
      await userEvent.click(screen.getByRole('button', { name: 'Delete task: One' }));
      expect(screen.getByText('Deleted “One”')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(JSON.parse(localStorage.getItem('tasks')).map((t) => t.text)).toEqual(['One', 'Two']);
    });
  });

  describe('command palette', () => {
    const openPalette = () => userEvent.keyboard('{Control>}k{/Control}');

    it('opens with Ctrl+K, adds a widget, and moves focus to it', async () => {
      render(<App />);
      await openPalette();
      await userEvent.type(screen.getByRole('combobox', { name: 'Search commands' }), 'add notes{Enter}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Move Notes widget' })).toHaveFocus();
    });

    it('adds whatever was typed as a task', async () => {
      render(<App />);
      await openPalette();
      await userEvent.type(screen.getByRole('combobox', { name: 'Search commands' }), 'Water the plants');
      await userEvent.click(screen.getByRole('option', { name: /Add task “Water the plants”/ }));
      expect(screen.getByRole('button', { name: 'Water the plants' })).toBeInTheDocument();
    });

    it('opens from the header button and closes with Escape, giving focus back', async () => {
      render(<App />);
      const button = screen.getByRole('button', { name: 'Search commands' });
      await userEvent.click(button);
      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(button).toHaveFocus();
    });
  });

  describe('settings', () => {
    it('follows the system theme when "Match system" is chosen', async () => {
      render(<App />);
      await userEvent.click(screen.getByRole('button', { name: 'Dark mode' }));
      await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
      await userEvent.click(screen.getByRole('radio', { name: 'Match system' }));
      expect(JSON.parse(localStorage.getItem('theme'))).toBe('system');
      // The test environment reports a light system theme.
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('resets the layout, with Undo', async () => {
      localStorage.setItem('layout', JSON.stringify({ summary: { x: 0, y: 0, w: 6, h: 6 } }));
      render(<App />);
      await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
      await userEvent.click(screen.getByRole('button', { name: 'Reset layout' }));
      expect(JSON.parse(localStorage.getItem('layout'))).toEqual({});

      await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(JSON.parse(localStorage.getItem('layout')).summary).toEqual({ x: 0, y: 0, w: 6, h: 6 });
    });
  });

  it('offers starter layouts when the dashboard is empty', async () => {
    localStorage.setItem('widgets', JSON.stringify([]));
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Planner/ }));
    expect(JSON.parse(localStorage.getItem('widgets'))).toEqual(['summary', 'tasks', 'notes']);
    expect(screen.queryByText(/No widgets yet/)).not.toBeInTheDocument();
  });
});
