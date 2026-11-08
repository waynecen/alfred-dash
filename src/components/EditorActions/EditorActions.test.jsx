import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EditorActions from './EditorActions';

describe('EditorActions', () => {
  it('saves through the form, cancels, and keeps extra actions at the end', async () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    const onCancel = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <EditorActions onCancel={onCancel}>
          <button type="button">Delete</button>
        </EditorActions>
      </form>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Save', 'Cancel', 'Delete']);
  });
});
