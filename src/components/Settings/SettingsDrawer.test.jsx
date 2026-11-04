import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import SettingsDrawer from './SettingsDrawer';

function setup(theme = 'light') {
  const handlers = { onThemeChange: vi.fn(), onResetLayout: vi.fn(), onClose: vi.fn() };
  render(<SettingsDrawer theme={theme} {...handlers} />);
  return handlers;
}

describe('SettingsDrawer', () => {
  it('is a labelled modal dialog that starts with focus inside it', () => {
    setup();
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toContainElement(document.activeElement);
  });

  it('shows the current theme and reports a new choice', async () => {
    const { onThemeChange } = setup('dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Match system' }));
    expect(onThemeChange).toHaveBeenCalledWith('system');
  });

  it('resets the layout', async () => {
    const { onResetLayout } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Reset layout' }));
    expect(onResetLayout).toHaveBeenCalledOnce();
  });

  it('says the AI assistant is not connected yet', () => {
    setup();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('keeps Tab inside the drawer', async () => {
    setup();
    const close = screen.getByRole('button', { name: 'Close settings' });
    const reset = screen.getByRole('button', { name: 'Reset layout' });
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(reset).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
  });

  it('closes with Escape or the close button', async () => {
    const { onClose } = setup();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('gives focus back to whatever opened it', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Settings
          </button>
          {open && (
            <SettingsDrawer theme="light" onThemeChange={() => {}} onResetLayout={() => {}} onClose={() => setOpen(false)} />
          )}
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Settings' });
    await userEvent.click(opener);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
