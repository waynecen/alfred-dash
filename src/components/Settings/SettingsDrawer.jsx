import { useId, useRef } from 'react';
import useDismiss from '../../hooks/useDismiss';
import useFocusTrap from '../../hooks/useFocusTrap';
import './SettingsDrawer.css';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
];

// A panel that slides in from the right with the dashboard's preferences. It is a modal dialog:
// focus stays inside while it is open, Escape or a click outside closes it, and focus goes back
// to the Settings button.
//   theme: 'light' | 'dark' | 'system'     onThemeChange(theme)
//   onResetLayout(): put every widget back at its default size and place (it offers Undo)
//   onClose()
function SettingsDrawer({ theme, onThemeChange, onResetLayout, onClose }) {
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
            AI assistant <span className="drawer-badge">Not connected</span>
          </h3>
          <p className="drawer-note">
            AI widgets will talk to a small local server that keeps your Anthropic API key off this
            page. Once it is running, its status and model choice will show here.
          </p>
        </section>

      </aside>
    </div>
  );
}

export default SettingsDrawer;
