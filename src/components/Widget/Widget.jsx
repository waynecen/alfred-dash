import { useEffect, useId, useRef } from 'react';
import useScrollThumb from '../../hooks/useScrollThumb';
import { COLUMNS } from '../../utils/gridLayout';
import './Widget.css';

const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

// The shared card every widget sits in: a drag handle, a title, a remove button and resize edges
// around the widget's content. Where the card sits on the grid is decided by the dashboard; this
// component only draws it and reports what the user does.
//   position: { x, y, w, h } in grid cells        state: 'moving' | 'resizing' while dragged
//   shift: { x, y } pixel offset of a moving card from the cell it will snap to
//   onMoveStart(event), onResizeStart(event, edge): pointer presses on the handle and the edges
//   onNudge(dx, dy), onStretch(dw, dh): one-cell keyboard moves and resizes
//   focusSignal: each new value moves keyboard focus to the card's handle (and so scrolls the
//     card into view), e.g. right after the widget is added or chosen in the command palette
function Widget({
  title,
  position,
  state,
  shift,
  onRemove,
  onMoveStart,
  onResizeStart,
  onNudge,
  onStretch,
  focusSignal,
  children,
}) {
  const headingId = useId();
  const handleRef = useRef(null);
  const bodyRef = useRef(null);
  const thumbRef = useRef(null);
  useScrollThumb(bodyRef, thumbRef);
  const { x, y, w, h } = position;

  useEffect(() => {
    if (focusSignal) handleRef.current?.focus();
  }, [focusSignal]);

  const className = ['widget', state && `is-${state}`].filter(Boolean).join(' ');

  function handleKeys(handler) {
    return (event) => {
      const step = ARROWS[event.key];
      if (!step || !handler) return;
      event.preventDefault();
      handler(...step);
    };
  }

  // The thin zones along the right and bottom borders, and the corner, all resize.
  const edge = (name) => ({
    onPointerDown: (event) => onResizeStart?.(event, name),
  });

  return (
    <section
      className={className}
      style={{
        gridColumn: `${x + 1} / span ${w}`,
        gridRow: `${y + 1} / span ${h}`,
        '--h': h,
        ...(state === 'moving' && shift && { transform: `translate(${shift.x}px, ${shift.y}px)` }),
      }}
      aria-labelledby={headingId}
      // On tablets the widgets reflow into two columns; a wide one takes both (see Dashboard.css).
      data-wide={w > COLUMNS / 2 || undefined}
    >
      <span
        ref={handleRef}
        role="button"
        tabIndex={0}
        className="widget-handle"
        aria-label={`Move ${title} widget`}
        title="Drag to move (or use the arrow keys)"
        onPointerDown={onMoveStart}
        onKeyDown={handleKeys(onNudge)}
      >
        {/* Two rows of three dots. */}
        <svg viewBox="0 0 16 8" width="16" height="8" fill="currentColor" aria-hidden="true">
          {[2, 8, 14].flatMap((cx) =>
            [1.5, 6.5].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" />)
          )}
        </svg>
      </span>
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
      <div ref={bodyRef} className="widget-body">
        {children}
      </div>
      {/* Where the content is scrolled to, drawn on the right-hand rule (see useScrollThumb). */}
      <div ref={thumbRef} className="widget-scroll" aria-hidden="true" />
      {onResizeStart && (
        <>
          {/* Hovering any of these lights up the border. */}
          <div className="widget-edge widget-edge-e" aria-hidden="true" {...edge('e')} />
          <div className="widget-edge widget-edge-s" aria-hidden="true" {...edge('s')} />
          <button
            type="button"
            className="widget-edge widget-resize"
            aria-label={`Resize ${title} widget`}
            title={`Drag an edge or the corner to resize, or use the arrow keys. Now ${w} of 12 columns and ${h} rows.`}
            onKeyDown={handleKeys(onStretch)}
            {...edge('se')}
          />
        </>
      )}
    </section>
  );
}

export default Widget;
