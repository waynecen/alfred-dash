import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AIGate from './AIGate';

const health = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('AIGate', () => {
  it('shows the widget once the AI proxy answers with a key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(health({ configured: true, model: 'm' })));
    render(<AIGate>Widget</AIGate>);
    expect(screen.getByText('Looking for the AI assistant…')).toBeInTheDocument();
    expect(await screen.findByText('Widget')).toBeInTheDocument();
  });

  it('says how to set it up when there is no key, and checks again', async () => {
    const fetchMock = vi.fn().mockResolvedValue(health({ configured: false, model: 'm' }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AIGate>Widget</AIGate>);
    expect(await screen.findByText(/Add ANTHROPIC_API_KEY/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Widget')).not.toBeInTheDocument();
  });

  it('says the proxy isn’t running when it can’t be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<AIGate>Widget</AIGate>);
    expect(await screen.findByText(/Proxy not running/)).toBeInTheDocument();
  });
});
