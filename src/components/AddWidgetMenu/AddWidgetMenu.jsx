import { useState, useEffect, useRef, useId } from 'react';
import './AddWidgetMenu.css';

// widgets: [{ id, title, description }]   added: ids already on the dashboard
function AddWidgetMenu({ widgets, added, onAdd }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const listId = useId();

  // While the list is open, clicking elsewhere or pressing Escape closes it.
  useEffect(() => {
    if (!open) return;

    function handleMouseDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function choose(id) {
    onAdd(id);
    setOpen(false);
  }

  return (
    <div className="add-widget" ref={containerRef}>
      <button
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
        <ul id={listId} className="add-widget-list" aria-label="Available widgets">
          {widgets.map((widget) => {
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
          })}
        </ul>
      )}
    </div>
  );
}

export default AddWidgetMenu;
