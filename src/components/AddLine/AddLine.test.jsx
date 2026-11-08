import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import AddLine from './AddLine';

function Harness({ onSubmit, ...props }) {
  const [value, setValue] = useState('');
  return <AddLine label="New thing" value={value} onChange={setValue} onSubmit={() => onSubmit(value)} {...props} />;
}

describe('AddLine', () => {
  it('adds what was typed on Enter, and only once something is typed', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const add = screen.getByRole('button', { name: 'Add' });
    expect(add).toBeDisabled();
    await userEvent.type(screen.getByLabelText('New thing'), '   {Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('New thing'), 'Milk{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('   Milk');
  });

  it('follows canAdd when the caller decides', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} canAdd={false} />);
    await userEvent.type(screen.getByLabelText('New thing'), 'Milk{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears the line on Escape, without letting Escape go further', async () => {
    const outside = vi.fn();
    render(
      <div onKeyDown={outside}>
        <Harness onSubmit={vi.fn()} />
      </div>
    );
    const input = screen.getByLabelText('New thing');
    await userEvent.type(input, 'Milk{Escape}');
    expect(input).toHaveValue('');
    expect(outside).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
  });

  it('shows the preview under the line', () => {
    render(<Harness onSubmit={vi.fn()} preview="Task · Today" />);
    expect(screen.getByText('Task · Today')).toBeInTheDocument();
  });
});
