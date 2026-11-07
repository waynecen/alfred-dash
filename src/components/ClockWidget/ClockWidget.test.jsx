import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClockWidget, { cityOf, offsetFrom } from './ClockWidget';

describe('ClockWidget', () => {
  it('names a zone by its city', () => {
    expect(cityOf('America/New_York')).toBe('New York');
    expect(cityOf('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
  });

  it('says how far ahead a zone is, and when it is already tomorrow there', () => {
    // 20:00 in London on 7 November is 05:00 on the 8th in Tokyo.
    const now = new Date('2026-11-07T20:00:00Z');
    expect(offsetFrom('Asia/Tokyo', now, 'Europe/London')).toEqual({ label: '+9h', dayDiff: 1 });
    expect(offsetFrom('Asia/Kolkata', now, 'Europe/London')).toEqual({ label: '+5h 30m', dayDiff: 1 });
    expect(offsetFrom('Europe/London', now, 'Europe/London')).toEqual({ label: 'Same time', dayDiff: 0 });
  });

  it('adds a city by name and remembers it, then removes it', async () => {
    render(<ClockWidget />);
    await userEvent.type(screen.getByLabelText('Add a city'), 'Tokyo{Enter}');
    expect(JSON.parse(localStorage.getItem('worldClocks'))).toEqual(['Asia/Tokyo']);
    const list = screen.getByRole('list', { name: 'World clocks' });
    expect(within(list).getByText('Tokyo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Tokyo' }));
    expect(JSON.parse(localStorage.getItem('worldClocks'))).toEqual([]);
  });

  it('says so when a place is not a time zone', async () => {
    render(<ClockWidget />);
    await userEvent.type(screen.getByLabelText('Add a city'), 'Atlantis{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('No time zone called “Atlantis”');
  });
});
