const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Turns a timestamp (milliseconds) into "just now", "45m ago", "5h ago", "2d ago",
// or an exact date like "27-10-2026" once it is more than 3 days old.
function formatCreatedDate(timestamp) {
  const age = Date.now() - timestamp; // how long ago, in milliseconds

  if (age > 3 * DAY) {
    const date = new Date(timestamp);
    // padStart adds a leading zero, so 5 becomes "05".
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // months start at 0
    return `${day}-${month}-${date.getFullYear()}`;
  }

  if (age >= DAY) return `${Math.floor(age / DAY)}d ago`;
  if (age >= HOUR) return `${Math.floor(age / HOUR)}h ago`;
  if (age >= MINUTE) return `${Math.floor(age / MINUTE)}m ago`;
  return 'just now';
}

export default formatCreatedDate;
