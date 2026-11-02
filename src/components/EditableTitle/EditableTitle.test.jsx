import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EditableTitle from './EditableTitle';

const edit = () => userEvent.click(screen.getByRole('button', { name: 'Edit dashboard title' }));

describe('EditableTitle', () => {
  it('shows the title as a heading with an edit button', () => {
    render(<EditableTitle value="My Dashboard" onChange={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'My Dashboard' })).toBeInTheDocument();
  });

  it('saves a new name on Enter', async () => {
    const onChange = vi.fn();
    render(<EditableTitle value="My Dashboard" onChange={onChange} />);
    await edit();
    const input = screen.getByLabelText('Dashboard title');
    await userEvent.clear(input);
    await userEvent.type(input, '  Home base {Enter}');
    expect(onChange).toHaveBeenCalledWith('Home base');
    expect(screen.queryByLabelText('Dashboard title')).not.toBeInTheDocument();
  });

  it('saves when you click away', async () => {
    const onChange = vi.fn();
    render(<EditableTitle value="A" onChange={onChange} />);
    await edit();
    await userEvent.type(screen.getByLabelText('Dashboard title'), 'B');
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith('AB');
  });

  it('discards the change on Escape', async () => {
    const onChange = vi.fn();
    render(<EditableTitle value="A" onChange={onChange} />);
    await edit();
    await userEvent.type(screen.getByLabelText('Dashboard title'), 'B{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument();
  });

  it('keeps the old name when the new one is empty', async () => {
    const onChange = vi.fn();
    render(<EditableTitle value="A" onChange={onChange} />);
    await edit();
    await userEvent.clear(screen.getByLabelText('Dashboard title'));
    await userEvent.keyboard('{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument();
  });
});
