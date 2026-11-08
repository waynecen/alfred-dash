import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import InlineEditor from './InlineEditor';

function setup() {
  const handlers = { onSave: vi.fn(), onCancel: vi.fn(), outside: vi.fn() };
  render(
    <div onKeyDown={handlers.outside}>
      <InlineEditor onSave={handlers.onSave} onCancel={handlers.onCancel} actions={<button type="button">Delete</button>}>
        <input aria-label="Name" defaultValue="Read" />
      </InlineEditor>
    </div>
  );
  return handlers;
}

describe('InlineEditor', () => {
  it('saves on Enter and on Save, and keeps extra actions at the end', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText('Name'), '{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Save', 'Cancel', 'Delete']);
  });

  it('cancels on Escape without letting it go further, and on Cancel', async () => {
    const { onCancel, outside } = setup();
    screen.getByLabelText('Name').focus();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(outside).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
