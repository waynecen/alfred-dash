import { useId, useRef, useState } from 'react';
import snapSpan, {
  clampSpan,
  snapRows,
  clampRows,
  GRID_COLUMNS,
  ROW_HEIGHT,
} from '../../utils/snapSpan';

// A card never gets smaller than this while it is being dragged.
const MIN_PIXELS = 120;
import './Widget.css';

// The shared card every widget sits in: a drag handle, a title, a remove button and a resize
// handle around the widget's content. The card is placed on a 12-column grid by its `span`,
// and spans `rows` grid rows tall (or grows with its content when `rows` is not set).
function Widget({
  title,
  span = 4,
  rows,
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
  // Set while an edge is being dragged: where it started, and the size the card is drawn at.
  const resizing = useRef(null);
  const [box, setBox] = useState(null);

  const className = ['widget', isDragging && 'dragging', box && 'resizing']
    .filter(Boolean)
    .join(' ');

  // The card's current height in rows, for resizing a widget that is still auto height.
  function currentRows() {
    const card = cardRef.current;
    const grid = card?.parentElement;
    const gap = grid ? parseFloat(getComputedStyle(grid).rowGap) || 0 : 0;
    return snapRows(card?.offsetHeight ?? 0, gap);
  }

  // Resizing by dragging the right edge, the bottom edge or the bottom-right corner.
  // The card follows the pointer pixel by pixel so it feels smooth, while the grid snaps to whole
  // columns and rows underneath, and a dashed guide shows the size it will settle at.
  function startResize(event, edge) {
    const card = cardRef.current;
    const grid = card?.parentElement;
    if (!grid || !onResize) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const styles = getComputedStyle(grid);
    const gap = parseFloat(styles.columnGap) || 0;
    const rowGap = parseFloat(styles.rowGap) || 0;
    const rect = card.getBoundingClientRect();
    const gridWidth = grid.getBoundingClientRect().width;
    const column = (gridWidth - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
    resizing.current = { edge, rect, gap, rowGap, gridWidth, column, span: null, rows: null };
    setBox({ width: rect.width, height: rect.height, guideWidth: rect.width, guideHeight: rect.height });
  }

  function moveResize(event) {
    const r = resizing.current;
    if (!r) return;
    const size = {};
    const next = {
      width: r.rect.width,
      height: r.rect.height,
      guideWidth: r.rect.width,
      guideHeight: r.rect.height,
    };

    if (r.edge.includes('e')) {
      next.width = Math.min(r.gridWidth, Math.max(MIN_PIXELS, event.clientX - r.rect.left));
      const newSpan = snapSpan(next.width, r.gridWidth, r.gap);
      next.guideWidth = newSpan * r.column + (newSpan - 1) * r.gap;
      if (newSpan !== r.span) size.span = newSpan;
      r.span = newSpan;
    }
    if (r.edge.includes('s')) {
      next.height = Math.max(MIN_PIXELS, event.clientY - r.rect.top);
      const newRows = snapRows(next.height, r.rowGap);
      next.guideHeight = newRows * ROW_HEIGHT + (newRows - 1) * r.rowGap;
      if (newRows !== r.rows) size.rows = newRows;
      r.rows = newRows;
    }

    setBox(next);
    // Only tell the dashboard when the snapped size actually changes.
    if (Object.keys(size).length > 0) onResize(size);
  }

  function endResize() {
    resizing.current = null;
    setBox(null);
  }

  // The same handlers work for every edge; only the edge name differs.
  const edgeProps = (edge) => ({
    onPointerDown: (event) => startResize(event, edge),
    onPointerMove: moveResize,
    onPointerUp: endResize,
    onPointerCancel: endResize,
    onDoubleClick: () => onResize({ rows: null }), // back to automatic height
  });

  function handleMoveKey(event) {
    const offset = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[event.key];
    if (offset && onStep) {
      event.preventDefault();
      onStep(offset);
    }
  }

  function handleResizeKey(event) {
    if (!onResize) return;
    const widthChange = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    const heightChange = { ArrowUp: -1, ArrowDown: 1 }[event.key];
    if (widthChange) {
      event.preventDefault();
      onResize({ span: clampSpan(span + widthChange) });
    } else if (heightChange) {
      event.preventDefault();
      onResize({ rows: clampRows((rows ?? currentRows()) + heightChange) });
    }
  }

  return (
    <section
      ref={cardRef}
      className={className}
      // The grid reads these in App.css, which can then use fewer columns on small screens.
      data-span={span}
      data-rows={rows}
      style={{
        '--span': span,
        '--rows': rows,
        // While resizing, the card is drawn at the pointer's size, not the snapped one.
        ...(box && { width: box.width, height: box.height, justifySelf: 'start' }),
      }}
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
      <div className="widget-body">{children}</div>
      {onResize && (
        <>
          {/* Thin zones along the right and bottom borders; hovering one highlights the border. */}
          <div className="widget-edge widget-edge-e" aria-hidden="true" {...edgeProps('e')} />
          <div className="widget-edge widget-edge-s" aria-hidden="true" {...edgeProps('s')} />
          <button
            type="button"
            className="widget-edge widget-resize"
            aria-label={`Resize ${title} widget`}
            title={`Drag the edge or corner to resize, or use the arrow keys. Double-click for automatic height. Now ${span} of 12 columns${rows ? `, ${rows} rows` : ''}.`}
            onKeyDown={handleResizeKey}
            {...edgeProps('se')}
          />
        </>
      )}
      {box && (
        <div
          className="widget-snap-guide"
          style={{ width: box.guideWidth, height: box.guideHeight }}
          aria-hidden="true"
        />
      )}
    </section>
  );
}

export default Widget;
