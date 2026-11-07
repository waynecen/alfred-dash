import { useEffect, useState } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import useSettings from '../../hooks/useSettings';
import { hourCycle, temperatureSymbol } from '../../data/settings';
import { useAI } from '../../hooks/useAI';
import WidgetState from '../WidgetState/WidgetState';
import { formatOpenTasks } from '../../utils/buildTaskContext';
import { fetchForecast, describeWeather } from '../../utils/weather';
import './DailyBriefWidget.css';

// Notes beyond this are cut, so a long notepad can't make a huge request.
const MAX_NOTES_CHARS = 4000;

const SYSTEM_PROMPT = `You write a short daily brief for one person, from their task list, notes and weather.
Write at most 150 words of plain text with no Markdown symbols other than "- " bullets, in three short sections, each starting with its heading on its own line:
Focus first: the one to three tasks that matter most today, and why in a few words.
Also today: other tasks worth fitting in, if any.
Heads-up: anything from the notes or the weather worth knowing (an umbrella, a deadline). Leave this section out if there is nothing.
Use only the tasks and notes given; never invent tasks. If there are no open tasks, say so in a friendly line and suggest using the time well.`;

// One line about today's weather in place, in the user's unit, or '' if there is no place or the
// forecast can't load.
async function describeToday(place, temperatureUnit) {
  if (!place) return '';
  try {
    const { current, days } = await fetchForecast(place, { temperatureUnit });
    const today = days[0];
    const unit = temperatureSymbol(temperatureUnit);
    const rain = today?.rain != null ? `, ${today.rain}% chance of rain` : '';
    return (
      `Weather in ${place.name}: ${describeWeather(current.code).label}, ${Math.round(current.temperature)}${unit} now` +
      (today ? `; today ${Math.round(today.min)}–${Math.round(today.max)}${unit}${rain}.` : '.')
    );
  } catch {
    return '';
  }
}

function buildPrompt({ tasks, notes, weather, timeFormat }) {
  const now = new Date();
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', ...hourCycle(timeFormat) });
  const trimmedNotes = notes.trim().slice(0, MAX_NOTES_CHARS);
  return [
    `It is ${date}, ${time}.`,
    `Open tasks:\n${formatOpenTasks(tasks) || '(none)'}`,
    `Notes:\n${trimmedNotes || '(none)'}`,
    weather,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const isToday = (timestamp) => new Date(timestamp).toDateString() === new Date().toDateString();

// A one-click plan for the day. The last brief is kept, so a reload doesn't pay for a new one.
function DailyBriefWidget({ tasks, notes }) {
  const ai = useAI();
  const [saved, setSaved] = useLocalStorage('dailyBrief', null); // { text, at }
  const [gathering, setGathering] = useState(false);
  // The place the Weather widget is showing; shared storage keeps the two in step.
  const [places] = useLocalStorage('weatherPlaces', []);
  const [activeId] = useLocalStorage('weatherActive', null);
  const place = places.find((p) => p.id === activeId) ?? places[0] ?? null;
  const [{ temperatureUnit, timeFormat }] = useSettings();

  // Keep a finished brief; a stopped or failed one is not worth keeping.
  useEffect(() => {
    if (ai.status === 'done' && ai.text) setSaved({ text: ai.text, at: Date.now() });
  }, [ai.status, ai.text, setSaved]);

  async function brief() {
    setGathering(true);
    const weather = await describeToday(place, temperatureUnit);
    setGathering(false);
    ai.send({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt({ tasks, notes, weather, timeFormat }) }],
      effort: 'low',
    });
  }

  if (gathering || (ai.status === 'thinking' && !ai.text)) {
    return <WidgetState status="loading" message="Reading your day…" />;
  }
  if (ai.status === 'error') {
    return <WidgetState status="error" message={ai.error} onRetry={brief} />;
  }
  if (ai.status === 'refused') {
    return <WidgetState status="error" message="Claude declined to write this brief." onRetry={brief} />;
  }

  // While a new brief is on its way (or was just stopped), show it; otherwise the saved one.
  const live = ai.status !== 'idle' && ai.status !== 'done';
  const text = live ? ai.text : saved?.text;

  if (!text) {
    return (
      <WidgetState status="empty" message="A short plan for today, from your tasks, notes and weather.">
        <button type="button" onClick={brief}>
          Brief me
        </button>
      </WidgetState>
    );
  }

  let meta;
  if (ai.busy) meta = 'Writing…';
  else if (ai.status === 'stopped') meta = 'Stopped';
  else if (saved) {
    const time = new Date(saved.at).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      ...hourCycle(timeFormat),
    });
    meta = isToday(saved.at)
      ? `Generated at ${time}`
      : `From ${new Date(saved.at).toLocaleDateString()}. Regenerate for today.`;
  }

  return (
    <div className="daily-brief">
      <p className="daily-brief-text" aria-live="polite" aria-busy={ai.busy || undefined}>
        {text}
      </p>
      <div className="daily-brief-footer">
        <span className="daily-brief-meta">{meta}</span>
        {ai.busy ? (
          <button type="button" onClick={ai.stop}>
            Stop
          </button>
        ) : (
          <button type="button" onClick={brief}>
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}

export default DailyBriefWidget;
