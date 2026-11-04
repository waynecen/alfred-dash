// Reads a Server-Sent Events body (what the AI proxy streams back) and calls onEvent(name, data)
// for each complete event, with data parsed from JSON. Events can be split across network chunks,
// so text is buffered until a blank line ends an event.
//   body: a ReadableStream of bytes (fetch's response.body)
export async function readEvents(body, onEvent) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  function flush(chunk) {
    let name = 'message';
    const data = [];
    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (data.length) onEvent(name, JSON.parse(data.join('\n')));
  }

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      flush(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
    }
  }
  if (buffer.trim()) flush(buffer);
}
