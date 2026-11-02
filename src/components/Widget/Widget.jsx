import { useId } from 'react';
import './Widget.css';

// The shared card every widget sits in: a title and a remove button around the widget's content.
function Widget({ title, wide = false, onRemove, children }) {
  const headingId = useId();

  return (
    <section
      className={wide ? 'widget widget-wide' : 'widget'}
      aria-labelledby={headingId}
    >
      <header className="widget-header">
        <h2 id={headingId}>{title}</h2>
        <button
          type="button"
          className="widget-remove"
          onClick={onRemove}
          aria-label={`Remove ${title} widget`}
        >
          ×
        </button>
      </header>
      {children}
    </section>
  );
}

export default Widget;
