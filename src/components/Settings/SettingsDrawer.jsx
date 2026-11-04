import { useId, useRef } from 'react';
import useDismiss from '../../hooks/useDismiss';
import useFocusTrap from '../../hooks/useFocusTrap';
import './SettingsDrawer.css';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
];

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
function SettingsDrawer({ theme, onThemeChange, onResetLayout, onClose, ai = { status: 'not-configured' } }) {
  const aiStatus = AI_STATUS[ai.status] ?? AI_STATUS['not-configured'];
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

        <section className="drawer-section">
          <h3>Keyboard</h3>
          <p className="drawer-note">
            <kbd>Ctrl</kbd> + <kbd>K</kbd> (<kbd>⌘</kbd> + <kbd>K</kbd> on a Mac) opens the command
            palette. Focus a widget&rsquo;s handle and use the arrow keys to move it, or its corner to
            resize it.
          </p>
        </section>
      </aside>
    </div>
  );
}

export default SettingsDrawer;
