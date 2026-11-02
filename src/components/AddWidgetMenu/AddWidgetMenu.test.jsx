import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AddWidgetMenu from './AddWidgetMenu';

const widgets = [
  { id: 'summary', title: 'Summary', description: 'Counts' },
  { id: 'tasks', title: 'Tasks', description: 'A table' },
];

function setup(added = []) {
  const onAdd = vi.fn();
  render(<AddWidgetMenu widgets={widgets} added={added} onAdd={onAdd} />);
  return onAdd;
}

const openButton = () => screen.getByRole('button', { name: 'Add widget' });

describe('AddWidgetMenu', () => {
  it('starts closed and opens a list of widgets', async () => {
    setup();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(openButton()).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(openButton());
    expect(openButton()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list', { name: 'Available widgets' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Summary/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tasks/ })).toBeInTheDocument();
  });

  it('adds the chosen widget and closes the list', async () => {
    const onAdd = setup();
    await userEvent.click(openButton());
    await userEvent.click(screen.getByRole('button', { name: /Tasks/ }));
    expect(onAdd).toHaveBeenCalledWith('tasks');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('disables widgets that are already on the dashboard', async () => {
    const onAdd = setup(['summary']);
    await userEvent.click(openButton());
    const summary = screen.getByRole('button', { name: /Summary/ });
    expect(summary).toBeDisabled();
    expect(summary).toHaveTextContent('Added');
    await userEvent.click(summary);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    setup();
    await userEvent.click(openButton());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('closes when clicking outside', async () => {
    setup();
    await userEvent.click(openButton());
    await userEvent.click(document.body);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
