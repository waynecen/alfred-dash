import { useId, useRef } from 'react';
import snapSpan, { clampSpan } from '../../utils/snapSpan';
import './Widget.css';

// The shared card every widget sits in: a drag handle, a title, a remove button and a resize
// handle around the widget's content. The card is placed on a 12-column grid by its `span`.
function Widget({
  title,
  span = 4,
  onRemove,
  onResize,
  isDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onStep,
  children,
}) {
  const headingId = useId();
  const cardRef = useRef(null);

  const className = ['widget', isDragging && 'dragging']
    .filter(Boolean)
    .join(' ');

  // Dragging the corner handle snaps the card's width to whole grid columns.
  function startResize(event) {
    const card = cardRef.current;
    const grid = card?.parentElement;
    if (!grid || !onResize) return;
    event.preventDefault();
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const { left } = card.getBoundingClientRect();
    const gridWidth = grid.getBoundingClientRect().width;

    function onMove(moveEvent) {
      onResize(snapSpan(moveEvent.clientX - left, gridWidth, gap));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function handleMoveKey(event) {
    const offset = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[event.key];
    if (offset && onStep) {
      event.preventDefault();
      onStep(offset);
    }
  }

  function handleResizeKey(event) {
    const change = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (change && onResize) {
      event.preventDefault();
      onResize(clampSpan(span + change));
    }
  }

  return (
    <section
      ref={cardRef}
      className={className}
      // The grid reads these in App.css, which can then use fewer columns on small screens.
      data-span={span}
      style={{ '--span': span }}
      aria-labelledby={headingId}
      onDragOver={(event) => {
        if (!onDragOver) return;
        event.preventDefault(); // lets this card accept a drop
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.();
      }}
    >
      <span
        role="button"
        tabIndex={0}
        className="widget-handle"
        draggable
        aria-label={`Move ${title} widget`}
        title="Drag to move (or use the arrow keys)"
        onKeyDown={handleMoveKey}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', title);
          // Drag the whole card, not just the small handle.
          if (cardRef.current) event.dataTransfer.setDragImage(cardRef.current, 0, 0);
            // Hiding the card in the same tick would cancel the drag, so let the browser
          // take its drag image first.
          const height = cardRef.current?.offsetHeight ?? 0;
          setTimeout(() => onDragStart?.(height), 0);
        }}
        onDragEnd={onDragEnd}
      >
        {/* Two rows of three dots. */}
        <svg viewBox="0 0 16 8" width="16" height="8" fill="currentColor" aria-hidden="true">
          {[2, 8, 14].flatMap((x) =>
            [1.5, 6.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />)
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
      {children}
      {onResize && (
        <button
          type="button"
          className="widget-resize"
          aria-label={`Resize ${title} widget`}
          title={`Drag to resize, snaps to the grid (or use ← →). Now ${span} of 12 columns.`}
          onPointerDown={startResize}
          onKeyDown={handleResizeKey}
        >
          <span aria-hidden="true">◢</span>
        </button>
      )}
    </section>
  );
}

export default Widget;
