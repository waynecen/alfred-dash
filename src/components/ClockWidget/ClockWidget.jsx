import { useEffect, useId, useState } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import useSettings from '../../hooks/useSettings';
import { hourCycle } from '../../data/settings';
import './ClockWidget.css';

// Every zone the browser knows, for the picker (older browsers know none, and get a text box).
const ZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
const HERE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// "America/New_York" -> "New York"; "America/Argentina/Buenos_Aires" -> "Buenos Aires".
export const cityOf = (zone) => zone.split('/').pop().replace(/_/g, ' ');

// The date and time a zone shows at a moment, as numbers, to compare zones by.
function partsIn(zone, now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  return { day: Date.UTC(get('year'), get('month') - 1, get('day')), minutes: get('hour') * 60 + get('minute') };
}

// How far a zone is from here: "+5h", "−3h 30m" or "Same time", and how many days it is ahead
// or behind (1 when it is already tomorrow there).
export function offsetFrom(zone, now, here = HERE) {
  const there = partsIn(zone, now);
  const local = partsIn(here, now);
  const diff = (there.day - local.day) / 60000 + there.minutes - local.minutes;
  const dayDiff = Math.round((there.day - local.day) / 86400000);
  if (diff === 0) return { label: 'Same time', dayDiff };
  const sign = diff > 0 ? '+' : '−';
  const h = Math.floor(Math.abs(diff) / 60);
  const m = Math.abs(diff) % 60;
  return { label: `${sign}${h}h${m ? ` ${m}m` : ''}`, dayDiff };
}

const DAY_WORDS = { '-1': 'Yesterday', 1: 'Tomorrow' };

// Re-renders every second, on the second.
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(timer);
  }, []);
  return now;
}

// A zone name the browser accepts, for browsers that can't list them.
function isZone(name) {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

// The Clock widget: the local time as the widget's one big figure, today's date, and the time in
// other places the user adds (saved as time zone names under 'worldClocks').
function ClockWidget() {
  const now = useNow();
  const [{ timeFormat }] = useSettings();
  const [zones, setZones] = useLocalStorage('worldClocks', []);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const id = useId();
  const hour = hourCycle(timeFormat);

  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', ...hour });
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  // Takes a zone name, or a city as the list names it ("Tokyo").
  function addZone(event) {
    event.preventDefault();
    const typed = draft.trim();
    if (!typed) return;
    const zone =
      ZONES.find((z) => z.toLowerCase() === typed.toLowerCase()) ??
      ZONES.find((z) => cityOf(z).toLowerCase() === typed.toLowerCase()) ??
      (isZone(typed) ? typed : null);
    if (!zone) {
      setError(`No time zone called “${typed}”. Pick one from the list.`);
      return;
    }
    setError('');
    setDraft('');
    setZones((current) => (current.includes(zone) ? current : [...current, zone]));
  }

  return (
    <div className="clock">
      <p className="clock-time">
        <time dateTime={now.toISOString()}>{time}</time>
        <span className="clock-seconds" aria-hidden="true">
          {seconds}
        </span>
      </p>
      <p className="clock-date">
        {date} · {cityOf(HERE)}
      </p>

      {zones.length > 0 && (
        <ul className="clock-zones" aria-label="World clocks">
          {zones.map((zone) => {
            const offset = offsetFrom(zone, now);
            const day = DAY_WORDS[offset.dayDiff];
            return (
              <li key={zone} className="clock-zone">
                <span className="clock-zone-city">{cityOf(zone)}</span>
                <span className="clock-zone-offset">
                  {day ? `${day}, ` : ''}
                  {offset.label}
                </span>
                <span className="clock-zone-time">
                  {now.toLocaleTimeString(undefined, { timeZone: zone, hour: 'numeric', minute: '2-digit', ...hour })}
                </span>
                <button
                  type="button"
                  className="clock-zone-remove"
                  onClick={() => setZones((current) => current.filter((z) => z !== zone))}
                  aria-label={`Remove ${cityOf(zone)}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form className="clock-add" onSubmit={addZone}>
        <label htmlFor={`${id}-zone`} className="visually-hidden">
          Add a city
        </label>
        <input
          id={`${id}-zone`}
          list={`${id}-zones`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a city, e.g. Tokyo"
          autoComplete="off"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <datalist id={`${id}-zones`}>
          {ZONES.filter((zone) => !zones.includes(zone)).map((zone) => (
            <option key={zone} value={zone}>
              {cityOf(zone)}
            </option>
          ))}
        </datalist>
        <button type="submit" disabled={!draft.trim()}>
          Add
        </button>
      </form>
      {error && (
        <p id={`${id}-error`} className="clock-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default ClockWidget;
