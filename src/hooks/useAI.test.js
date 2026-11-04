import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useAI, useAIHealth } from './useAI';

const sse = (...events) =>
  new Response(events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join(''), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const hello = { messages: [{ role: 'user', content: 'Hello' }] };

afterEach(() => vi.unstubAllGlobals());

describe('useAI', () => {
  it('streams text in and finishes with the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sse(['status', { phase: 'writing' }], ['text', { text: 'Hi ' }], ['text', { text: 'there' }], ['done', { stopReason: 'end_turn', model: 'm' }])
    );
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAI());

    await act(() => result.current.send({ ...hello, effort: 'low' }));
    expect(result.current).toMatchObject({ status: 'done', text: 'Hi there', busy: false, result: { model: 'm' } });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/ai/stream');
    expect(JSON.parse(options.body)).toEqual({ ...hello, effort: 'low' });
  });

  it('reports a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse(['done', { stopReason: 'refusal', refusal: 'cyber' }])));
    const { result } = renderHook(() => useAI());
    await act(() => result.current.send(hello));
    expect(result.current.status).toBe('refused');
  });

  it('shows the proxy error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(503, { error: 'Add a key.' })));
    const { result } = renderHook(() => useAI());
    await act(() => result.current.send(hello));
    expect(result.current).toMatchObject({ status: 'error', error: 'Add a key.' });
  });

  it('shows an error event from the stream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse(['text', { text: 'Par' }], ['error', { message: 'Rate limited.' }])));
    const { result } = renderHook(() => useAI());
    await act(() => result.current.send(hello));
    expect(result.current).toMatchObject({ status: 'error', error: 'Rate limited.', text: 'Par' });
  });

  it('says the reply was cut off when the stream ends early', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse(['text', { text: 'Half' }])));
    const { result } = renderHook(() => useAI());
    await act(() => result.current.send(hello));
    expect(result.current).toMatchObject({ status: 'error', error: 'The reply was cut off. Try again.' });
  });

  it('explains when the proxy cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { result } = renderHook(() => useAI());
    await act(() => result.current.send(hello));
    expect(result.current.error).toMatch(/Could not reach the AI proxy/);
  });

  it('stops a reply in progress and keeps the text so far', async () => {
    let signal;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, options) => {
        signal = options.signal;
        return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
      })
    );
    const { result } = renderHook(() => useAI());
    act(() => void result.current.send(hello));
    expect(result.current.busy).toBe(true);

    act(() => result.current.stop());
    expect(signal.aborted).toBe(true);
    await waitFor(() => expect(result.current.status).toBe('stopped'));
  });
});

describe('useAIHealth', () => {
  it('is connected when the proxy has a key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { configured: true, model: 'claude-opus-5-5' })));
    const { result } = renderHook(() => useAIHealth());
    await waitFor(() => expect(result.current).toMatchObject({ status: 'connected', model: 'claude-opus-5-5' }));
  });

  it('is not configured without a key, and offline without a proxy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { configured: false, model: 'm' })));
    const { result } = renderHook(() => useAIHealth());
    await waitFor(() => expect(result.current.status).toBe('not-configured'));

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    act(() => result.current.recheck());
    await waitFor(() => expect(result.current.status).toBe('offline'));
  });

  it('does not check while disabled', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderHook(() => useAIHealth(false));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
