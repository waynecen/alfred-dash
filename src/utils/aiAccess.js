// The access key a hosted dashboard's AI proxy asks for (the site owner sets it as AI_ACCESS_KEY
// on Vercel). It is kept in this browser only: it isn't one of the saved lists, so backups never
// carry it and other devices need it entered again. On your own computer no key is needed.
const KEY = 'aiAccessKey';

export function getAccessKey() {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function setAccessKey(value) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the key lasts until the page closes, which is all we can do.
  }
}

// The headers every request to the AI proxy carries.
export function aiHeaders(extra = {}) {
  const key = getAccessKey();
  return { ...extra, ...(key && { 'X-Dashboard-Key': key }) };
}
