// The two keys a browser can hand the AI proxy, both kept in this browser only. Neither is one of
// the saved lists, so backups never carry them and other devices need them entered again.
//   your own Anthropic API key: the proxy calls Claude with it, so you pay for your own use and
//     nobody else's. It is sent to the proxy with each AI request and goes no further than
//     Anthropic; the proxy doesn't store or log it.
//   the site's access key (AI_ACCESS_KEY): lets you use the site owner's key instead, if they
//     gave it to you. On your own computer neither is needed.
const ACCESS = 'aiAccessKey';
const OWN = 'aiOwnApiKey';

function read(name) {
  try {
    return localStorage.getItem(name) ?? '';
  } catch {
    return '';
  }
}

function write(name, value) {
  try {
    if (value) localStorage.setItem(name, value);
    else localStorage.removeItem(name);
  } catch {
    // Storage blocked: nothing is kept, and the AI stays locked.
  }
}

export const getAccessKey = () => read(ACCESS);
export const setAccessKey = (value) => write(ACCESS, value);
export const getOwnApiKey = () => read(OWN);
export const setOwnApiKey = (value) => write(OWN, value);

// What the user typed looks like an Anthropic key (they start "sk-ant-"). Only a hint for the
// form: the API has the last word.
export const looksLikeApiKey = (value) => /^sk-ant-\S{10,}$/.test(value.trim());

// The headers every request to the AI proxy carries. With your own key, that one is used; the
// access key is sent too only when you have no key of your own.
export function aiHeaders(extra = {}) {
  const own = getOwnApiKey();
  const access = getAccessKey();
  return {
    ...extra,
    ...(own ? { 'X-Anthropic-Key': own } : access && { 'X-Dashboard-Key': access }),
  };
}
