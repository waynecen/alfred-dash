import { useId, useRef } from 'react';
import useDismiss from '../../hooks/useDismiss';
import useFocusTrap from '../../hooks/useFocusTrap';
import './ShortcutsDialog.css';

// Every keyboard shortcut, for the "?" sheet. Keep in step with the bindings in App.jsx.
export const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], label: 'Open or close the command palette (⌘ K on a Mac)' },
  { keys: ['/'], label: 'Open the command palette' },
  { keys: ['N'], label: 'Add a task' },
  { keys: ['T'], label: 'Go to the Today widget' },
  { keys: ['F'], label: 'Start, pause or carry on the focus timer' },
  { keys: ['1', '…', '9'], label: 'Show board 1 to 9' },
  { keys: ['['], label: 'Previous board' },
  { keys: [']'], label: 'Next board' },
  { keys: ['?'], label: 'Show these shortcuts' },
];

// On a focused widget handle, task row or board tab.
const IN_PLACE = [
  { keys: ['←', '→', '↑', '↓'], label: 'Move a widget (on its handle) or resize it (on its corner)' },
  { keys: ['↑', '↓'], label: 'Reorder a task (on its handle)' },
  { keys: ['↑', '↓'], label: 'Move a task’s due date a day (on its date)' },
  { keys: ['←', '→'], label: 'Switch board (on the board tabs)' },
  { keys: ['F2'], label: 'Rename the board (on its tab)' },
  { keys: ['Enter'], label: 'Send a message (in the Assistant); Shift+Enter starts a new line' },
  { keys: ['Esc'], label: 'Stop Claude’s reply, or clear what you typed (in the Assistant)' },
];

function ShortcutList({ items }) {
  return (
    <dl className="shortcut-list">
      {items.map(({ keys, label }) => (
        <div key={label} className="shortcut-row">
          <dt>
            {keys.map((key) => (key === '…' ? <span key={key}>…</span> : <kbd key={key}>{key}</kbd>))}
          </dt>
          <dd>{label}</dd>
        </div>
      ))}
    </dl>
  );
}

// A modal sheet listing the shortcuts. Escape, a click outside or the close button closes it.
function ShortcutsDialog({ onClose }) {
  const ref = useRef(null);
  const headingId = useId();
  useFocusTrap(ref);
  useDismiss(ref, onClose);

  return (
    <div className="shortcuts-backdrop">
      <div ref={ref} className="shortcuts" role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <header className="shortcuts-header">
          <h2 id={headingId}>Keyboard shortcuts</h2>
          <button type="button" className="icon-button" aria-label="Close shortcuts" onClick={onClose} data-autofocus>
            ×
          </button>
        </header>
        <ShortcutList items={SHORTCUTS} />
        <h3 className="shortcuts-subhead">On the focused item</h3>
        <ShortcutList items={IN_PLACE} />
      </div>
    </div>
  );
}

export default ShortcutsDialog;
