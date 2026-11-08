import { useState, useEffect, useRef, useId } from 'react';
import useDismiss from '../../hooks/useDismiss';
import './AddWidgetMenu.css';

// widgets: [{ id, title, description, category? }]   added: ids already on the dashboard
// When the widgets have more than one category, the list is grouped under headings.
// Opening the list focuses its first choice; the arrow keys, Home and End move between choices,
// and Escape closes it and returns focus to the button.
function AddWidgetMenu({ widgets, added, onAdd }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  useDismiss(
    containerRef,
    (reason) => {
      setOpen(false);
      if (reason === 'escape') buttonRef.current?.focus();
    },
    open
  );

  const options = () => [...(listRef.current?.querySelectorAll('.add-widget-option:not(:disabled)') ?? [])];

  // Start on the first widget that can still be added.
  useEffect(() => {
    if (open) options()[0]?.focus();
  }, [open]);

  function handleKeyDown(event) {
    const items = options();
    const at = items.indexOf(document.activeElement);
    const next = {
      ArrowDown: items[(at + 1) % items.length],
      ArrowUp: items[(at - 1 + items.length) % items.length],
      Home: items[0],
      End: items[items.length - 1],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    next.focus();
  }

  function choose(id) {
    onAdd(id);
    setOpen(false);
  }

  function renderOption(widget) {
    const isAdded = added.includes(widget.id);
    return (
      <li key={widget.id}>
        <button
          type="button"
          className="add-widget-option"
          disabled={isAdded}
          onClick={() => choose(widget.id)}
        >
          <span className="add-widget-title">
            {widget.title}
            {isAdded && <span className="add-widget-badge">Added</span>}
          </span>
          <span className="add-widget-description">{widget.description}</span>
        </button>
      </li>
    );
  }

  // Categories in the order they first appear in the registry.
  const categories = [...new Set(widgets.map((widget) => widget.category).filter(Boolean))];
  const grouped = categories.length > 1;

  return (
    <div className="add-widget" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-button"
        aria-label="Add widget"
        title="Add widget"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen(!open)}
      >
        {/* Drawn as a shape, not a text "+", so it sits exactly in the middle of the button. */}
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="add-widget-list"
          aria-label="Available widgets"
          onKeyDown={handleKeyDown}
        >
          {grouped
            ? categories.map((category) => (
                <li key={category} className="add-widget-group">
                  <span className="add-widget-heading label" id={`${listId}-${category}`}>
                    {category}
                  </span>
                  <ul aria-labelledby={`${listId}-${category}`}>
                    {widgets.filter((widget) => widget.category === category).map(renderOption)}
                  </ul>
                </li>
              ))
            : widgets.map(renderOption)}
        </ul>
      )}
    </div>
  );
}

export default AddWidgetMenu;
