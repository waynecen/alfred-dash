const PRIORITIES = ['low', 'medium', 'high'];
const MAX_TEXT = 200;

// Turns the model's reply into task suggestions: [{ text, priority }].
// The prompt asks for a bare JSON array, but models sometimes wrap it in a code fence or a
// sentence, so this looks for the first [...] and keeps only well-formed items.
// Anything unreadable gives [] rather than an error.
function parseTaskSuggestions(reply) {
  if (typeof reply !== 'string') return [];
  const start = reply.indexOf('[');
  const end = reply.lastIndexOf(']');
  if (start === -1 || end <= start) return [];

  let items;
  try {
    items = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  return items.flatMap((item) => {
    const text = typeof item?.text === 'string' ? item.text.trim().slice(0, MAX_TEXT) : '';
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return [];
    seen.add(key);
    const priority = PRIORITIES.includes(item.priority) ? item.priority : 'medium';
    return [{ text, priority }];
  });
}

export default parseTaskSuggestions;
