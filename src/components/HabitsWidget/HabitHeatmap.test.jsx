import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HabitHeatmap, { levelOf } from './HabitHeatmap';
import { addDays, parseISODate } from '../../utils/dates';

describe('levelOf', () => {
  it('shades a day by the share of what was due that got done', () => {
    expect(levelOf({ due: 0, done: 0 })).toBeNull();
    expect(levelOf({ due: 3, done: 0 })).toBe(0);
    expect(levelOf({ due: 4, done: 1 })).toBe(1);
    expect(levelOf({ due: 3, done: 2 })).toBe(3);
    expect(levelOf({ due: 2, done: 2 })).toBe(4);
  });
});

describe('HabitHeatmap', () => {
  const today = '2026-11-07';
  const habits = [{ id: 1, schedule: 'daily', createdAt: parseISODate(addDays(today, -9)).getTime() }];
  const log = { 1: [addDays(today, -1), today] };

  it('sums the twelve weeks, and reads out a day from the keyboard', async () => {
    render(<HabitHeatmap habits={habits} log={log} today={today} weekStart={1} />);
    // Ten days due (from nine days ago to today), two done.
    expect(screen.getByText('20% done in 12 weeks')).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByText(/· 1 of 1 done$/)).toBeInTheDocument();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByText(/· 0 of 1 done$/)).toBeInTheDocument();
  });

  it('lists each week in a table for screen readers', () => {
    render(<HabitHeatmap habits={habits} log={log} today={today} weekStart={1} />);
    expect(screen.getAllByRole('row')).toHaveLength(12);
  });
});
