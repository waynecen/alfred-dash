// The operating system's own notices (the Notification API), for things that happen while the
// dashboard isn't being looked at: a focus session ending, an event about to start. They only
// show when the user has turned them on in Settings and the browser has allowed them; otherwise
// the in-page toast is all there is.

export const noticesSupported = () => typeof window !== 'undefined' && 'Notification' in window;

// 'granted' | 'denied' | 'default' (not asked yet) | 'unsupported'
export const noticePermission = () => (noticesSupported() ? Notification.permission : 'unsupported');

// Asks the browser, which shows its own prompt. Resolves to the new permission.
export async function requestNotices() {
  if (!noticesSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// Shows a notice if it is allowed. A tag replaces an earlier notice with the same tag, so two
// open tabs announcing the same thing show it once.
//   enabled: the Settings switch
export function showNotice(enabled, title, { body, tag } = {}) {
  if (!enabled || noticePermission() !== 'granted') return;
  try {
    new Notification(title, { body, tag });
  } catch {
    // Some browsers only allow notices from a service worker; the toast still says it.
  }
}
