import { useId, useRef, useState } from 'react';
import { noticePermission, requestNotices } from '../../utils/systemNotice';
import useDismiss from '../../hooks/useDismiss';
import useFocusTrap from '../../hooks/useFocusTrap';
import useSettings from '../../hooks/useSettings';
import DataSection from './DataSection';
import './SettingsDrawer.css';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
];

const TEMPERATURE_UNITS = [
  { value: 'celsius', label: 'Celsius (°C)' },
  { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
];

const TIME_FORMATS = [
  { value: 'auto', label: 'Automatic' },
  { value: '12h', label: '12-hour (3:00 PM)' },
  { value: '24h', label: '24-hour (15:00)' },
];

const WEEK_STARTS = [
  { value: 1, label: 'Monday' },
  { value: 0, label: 'Sunday' },
];

// Notifications: a switch for system notices. Turning it on asks the browser first; if the browser
// says no, the switch stays off and says how to allow them.
function NoticesSection({ enabled, onChange }) {
  const [permission, setPermission] = useState(noticePermission);
  const on = enabled && permission === 'granted';

  async function toggle(event) {
    if (!event.target.checked) {
      onChange(false);
      return;
    }
    const answer = permission === 'granted' ? 'granted' : await requestNotices();
    setPermission(answer);
    onChange(answer === 'granted');
  }

  const note = {
    unsupported: 'This browser can’t show system notices. Toasts on the page still appear.',
    denied: 'The browser is blocking notices for this page. Allow them in its site settings, then turn this on.',
  }[permission];

  return (
    <section className="drawer-section">
      <h3>Notifications</h3>
      <label className="drawer-radio">
        <input type="checkbox" checked={on} onChange={toggle} disabled={permission === 'unsupported'} />
        Show a system notice when a focus session ends or an event is about to start
      </label>
      {note && <p className="drawer-note">{note}</p>}
    </section>
  );
}

// What the AI section says for each useAIHealth status.
const AI_STATUS = {
  checking: { label: 'Checking…', note: 'Looking for the local AI proxy.' },
  connected: { label: 'Connected', note: 'Your API key stays in the local proxy and never reaches this page.' },
  'not-configured': {
    label: 'Not connected',
    note: 'Add ANTHROPIC_API_KEY to a .env file (see .env.example), then restart npm run dev.',
  },
  offline: {
    label: 'Proxy not running',
    note: 'The AI proxy runs with npm run dev. Start it, then check again.',
  },
};

// A panel that slides in from the right with the dashboard's preferences. It is a modal dialog:
// focus stays inside while it is open, Escape or a click outside closes it, and focus goes back
// to the Settings button.
//   theme: 'light' | 'dark' | 'system'     onThemeChange(theme)
//   onResetLayout(): put every widget back at its default size and place (it offers Undo)
//   onClose()
//   ai: { status, model, recheck } from useAIHealth
//   notify: shows a toast (from useToasts), for backups and Undo
function SettingsDrawer({
  theme,
  onThemeChange,
  onResetLayout,
  onClose,
  ai = { status: 'not-configured' },
  notify = () => {},
}) {
  const aiStatus = AI_STATUS[ai.status] ?? AI_STATUS['not-configured'];
  // Units and the clock are read where they are shown, so they are changed straight from here.
  const [settings, updateSettings] = useSettings();
  const panelRef = useRef(null);
  const headingId = useId();

  useFocusTrap(panelRef);
  useDismiss(panelRef, onClose);

  return (
    <div className="drawer-backdrop">
      <aside
        ref={panelRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <header className="drawer-header">
          <h2 id={headingId}>Settings</h2>
          <button type="button" className="icon-button" aria-label="Close settings" onClick={onClose}>
            ×
          </button>
        </header>

        <fieldset className="drawer-section">
          <legend>Theme</legend>
          {THEMES.map((option) => (
            <label key={option.value} className="drawer-radio">
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={theme === option.value}
                onChange={() => onThemeChange(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="drawer-section">
          <legend>Temperature</legend>
          {TEMPERATURE_UNITS.map((option) => (
            <label key={option.value} className="drawer-radio">
              <input
                type="radio"
                name="temperatureUnit"
                value={option.value}
                checked={settings.temperatureUnit === option.value}
                onChange={() => updateSettings({ temperatureUnit: option.value })}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="drawer-section">
          <legend>Clock</legend>
          {TIME_FORMATS.map((option) => (
            <label key={option.value} className="drawer-radio">
              <input
                type="radio"
                name="timeFormat"
                value={option.value}
                checked={settings.timeFormat === option.value}
                onChange={() => updateSettings({ timeFormat: option.value })}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="drawer-section">
          <legend>Week starts on</legend>
          {WEEK_STARTS.map((option) => (
            <label key={option.value} className="drawer-radio">
              <input
                type="radio"
                name="weekStart"
                value={option.value}
                checked={settings.weekStart === option.value}
                onChange={() => updateSettings({ weekStart: option.value })}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <NoticesSection enabled={settings.notifications} onChange={(notifications) => updateSettings({ notifications })} />

        <section className="drawer-section">
          <h3>Layout</h3>
          <p className="drawer-note">Put every widget back at its default size and position.</p>
          <button type="button" onClick={onResetLayout}>
            Reset layout
          </button>
        </section>

        <section className="drawer-section">
          <h3>
            AI assistant{' '}
            <span className={`drawer-badge drawer-badge-${ai.status}`} role="status">
              {aiStatus.label}
            </span>
          </h3>
          <p className="drawer-note">
            {ai.status === 'connected' ? `Using ${ai.model}. ` : ''}
            {aiStatus.note}
          </p>
          {ai.recheck && ai.status !== 'connected' && ai.status !== 'checking' && (
            <button type="button" onClick={ai.recheck}>
              Check again
            </button>
          )}
        </section>

        <DataSection notify={notify} />

        <section className="drawer-section">
          <h3>Keyboard</h3>
          <p className="drawer-note">
            <kbd>Ctrl</kbd> + <kbd>K</kbd> (<kbd>⌘</kbd> + <kbd>K</kbd> on a Mac) opens the command
            palette, <kbd>N</kbd> adds a task, <kbd>F</kbd> starts or pauses the focus timer and{' '}
            <kbd>1</kbd>–<kbd>9</kbd> switch boards. Press{' '}
            <kbd>?</kbd> anywhere for the full list.
          </p>
        </section>
      </aside>
    </div>
  );
}

export default SettingsDrawer;
