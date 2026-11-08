import { useId, useRef, useState } from 'react';
import useDismiss from '../../hooks/useDismiss';
import useFocusTrap from '../../hooks/useFocusTrap';
import { matchCommands } from '../../utils/commands';
import './CommandPalette.css';

// A search box for every action on the dashboard, opened with Ctrl/Cmd+K. Type to filter,
// move with the arrow keys, run with Enter, close with Escape. Focus goes back to wherever it
// was when the palette closes. Follows the ARIA combobox + listbox pattern.
//   getCommands(query): the commands to choose from (see utils/commands.js)
//   onClose(): called before a command runs, and on Escape or a click outside
function CommandPalette({ getCommands, onClose }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialogRef = useRef(null);
  const listId = useId();
  const optionId = (index) => `${listId}-option-${index}`;

  useFocusTrap(dialogRef);
  useDismiss(dialogRef, (reason) => onClose(reason));

  const results = matchCommands(getCommands(query), query);
  const current = Math.min(active, results.length - 1);

  function run(command) {
    onClose();
    command.run();
  }

  function handleKeyDown(event) {
    if (!results.length) return;
    const moves = {
      ArrowDown: (current + 1) % results.length,
      ArrowUp: (current - 1 + results.length) % results.length,
      Home: 0,
      End: results.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
      document.getElementById(optionId(moves[event.key]))?.scrollIntoView?.({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(results[current]);
    }
  }

  return (
    <div className="palette-backdrop">
      <div ref={dialogRef} className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          data-autofocus
          className="palette-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results.length ? optionId(current) : undefined}
          aria-label="Search commands"
          placeholder="Type a command, or text to add as a task…"
          autoComplete="off"
          spellCheck="false"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <ul id={listId} className="palette-list" role="listbox" aria-label="Commands">
          {results.map((command, index) => (
            <li
              key={command.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === current}
              className="palette-option"
              // mousedown would move focus off the input; keep it there and run on click.
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => setActive(index)}
              onClick={() => run(command)}
            >
              <span>{command.label}</span>
              <span className="palette-group label">{command.group}</span>
            </li>
          ))}
        </ul>
        {results.length === 0 && <p className="palette-empty">No matching commands.</p>}
        <p className="palette-hint" aria-hidden="true">
          <kbd>↑</kbd>
          <kbd>↓</kbd> to move · <kbd>Enter</kbd> to run · <kbd>Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}

export default CommandPalette;
