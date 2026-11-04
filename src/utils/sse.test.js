import { readEvents } from './sse';

// A response body that delivers the given strings as separate network chunks.
const bodyOf = (...chunks) =>
  new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });

async function collect(...chunks) {
  const events = [];
  await readEvents(bodyOf(...chunks), (name, data) => events.push([name, data]));
  return events;
}

describe('readEvents', () => {
  it('parses named events with JSON data', async () => {
    expect(await collect('event: text\ndata: {"text":"Hi"}\n\nevent: done\ndata: {"stopReason":"end_turn"}\n\n')).toEqual([
      ['text', { text: 'Hi' }],
      ['done', { stopReason: 'end_turn' }],
    ]);
  });

  it('joins an event split across chunks', async () => {
    expect(await collect('event: te', 'xt\ndata: {"te', 'xt":"Hello"}\n', '\n')).toEqual([['text', { text: 'Hello' }]]);
  });

  it('handles Windows line endings and a final event without a blank line', async () => {
    expect(await collect('event: a\r\ndata: 1\r\n\r\nevent: b\ndata: 2')).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });
});
