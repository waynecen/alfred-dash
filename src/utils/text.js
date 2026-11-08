// Words for counts, kept in one place so every widget says them the same way.

// "1 task", "3 tasks": a count with its noun, plural unless the count is one.
//   many: the plural, where adding an s won't do
export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
