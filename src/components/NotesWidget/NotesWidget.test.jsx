import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import NotesWidget from './NotesWidget';

describe('NotesWidget', () => {
  it('shows the saved text and a character count', () => {
    render(<NotesWidget value="Milk" onChange={() => {}} />);
    expect(screen.getByLabelText('Notes')).toHaveValue('Milk');
    expect(screen.getByText(/4 characters/)).toBeInTheDocument();
  });

  it('reports each edit', async () => {
    const onChange = vi.fn();
    render(<NotesWidget value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Notes'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });
});
