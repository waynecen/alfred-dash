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

  it('saves the temperature unit and clock format', async () => {
    setup();
    expect(screen.getByRole('radio', { name: 'Celsius (°C)' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Fahrenheit (°F)' }));
    await userEvent.click(screen.getByRole('radio', { name: '24-hour (15:00)' }));
    expect(JSON.parse(localStorage.getItem('settings'))).toMatchObject({ temperatureUnit: 'fahrenheit', timeFormat: '24h' });
    expect(screen.getByRole('radio', { name: 'Fahrenheit (°F)' })).toBeChecked();
  });

  it('saves which day the week starts on', async () => {
    setup();
    expect(screen.getByRole('radio', { name: 'Monday' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Sunday' }));
    expect(JSON.parse(localStorage.getItem('settings')).weekStart).toBe(0);
  });

  it('turns system notices on once the browser allows them', async () => {
    const requestPermission = vi.fn(async () => 'granted');
    vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'default', requestPermission }));
    setup();
    const toggle = screen.getByRole('checkbox', { name: /system notice/ });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(requestPermission).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('settings')).notifications).toBe(true);
    vi.unstubAllGlobals();
  });

  it('says when the browser cannot show system notices', () => {
    setup();
    expect(screen.getByRole('checkbox', { name: /system notice/ })).toBeDisabled();
    expect(screen.getByText(/can’t show system notices/)).toBeInTheDocument();
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
