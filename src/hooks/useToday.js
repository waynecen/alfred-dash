import { useEffect, useState } from 'react';
import { toISODate } from '../utils/dates';

// Today's date as 'YYYY-MM-DD', which changes at midnight while the page is open (and when the
// tab comes back after the computer slept through midnight), so "Today" never goes stale.
function useToday() {
  const [today, setToday] = useState(() => toISODate());

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    // A second past midnight, so the new day has surely begun.
    const timer = setTimeout(() => setToday(toISODate()), nextMidnight - now + 1000);
    return () => clearTimeout(timer);
  }, [today]);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') setToday(toISODate());
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);

  return today;
}

export default useToday;
