import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DatePicker from './DatePicker';

beforeEach(() => localStorage.clear());

function setup(value = '2026-11-10') {
  const onChange = vi.fn();
  render(
    <DatePicker value={value} today="2026-11-07" onChange={onChange} title="Due date: Call bank">
      Pick
    </DatePicker>
  );
  const button = screen.getByRole('button', { name: 'Pick' });
  return { onChange, button };
}

// The day cell for a day of November 2026 (the labels are in the test's locale).
const day = (n) => screen.getByRole('gridcell', { name: new RegExp(`\\b${n}\\b`) });

describe('DatePicker', () => {
  it('opens on the picked day, with today marked', async () => {
    const { button } = setup();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Due date: Call bank' })).toBeInTheDocument();
    expect(day(10)).toHaveFocus();
    expect(day(10)).toHaveAttribute('aria-selected', 'true');
    expect(day(7)).toHaveAttribute('aria-current', 'date');
  });

  it('picks a clicked day and closes', async () => {
    const { onChange, button } = setup();
    await userEvent.click(button);
    await userEvent.click(day(20));
    expect(onChange).toHaveBeenCalledWith('2026-11-20');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('moves with the arrow keys and picks with Enter', async () => {
    const { onChange, button } = setup();
    await userEvent.click(button);
    await userEvent.keyboard('{ArrowRight}{ArrowDown}');
    expect(day(18)).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('2026-11-18');
  });

  it('turns the month with Page Down and the arrows in its bar', async () => {
    const { button } = setup();
    await userEvent.click(button);
    await userEvent.keyboard('{PageDown}');
    expect(screen.getByRole('grid')).toHaveAccessibleName(/December 2026/);
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('grid')).toHaveAccessibleName(/November 2026/);
  });

  it('closes on Escape without picking, and hands focus back', async () => {
    const { onChange, button } = setup();
    await userEvent.click(button);
    await userEvent.keyboard('{ArrowRight}{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('offers today, tomorrow, next week and Clear', async () => {
    const { onChange, button } = setup();
    await userEvent.click(button);
    await userEvent.click(screen.getByRole('button', { name: 'Tomorrow' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-08');
    await userEvent.click(button);
    // The week starts on Monday by default, so next week starts on the 9th.
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-09');
    await userEvent.click(button);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('has no Clear when there is no date, and opens on today', async () => {
    const { button } = setup(null);
    await userEvent.click(button);
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    expect(day(7)).toHaveFocus();
  });

  it('closes on a click outside', async () => {
    const { button } = setup();
    await userEvent.click(button);
    await userEvent.click(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
