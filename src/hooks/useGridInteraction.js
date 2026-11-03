import { useEffect, useRef, useState } from 'react';
import { COLUMNS, ROW_HEIGHT, change, moveBy, resizeBy, sameLayout } from '../utils/gridLayout';

// Moving and resizing widgets with the pointer or the keyboard.
//   items: the current layout   gridRef: the grid element   onCommit(items): called with the final layout
//
// While a pointer drag is going on, `preview` holds the layout as it would look if the pointer were
// released right now. It is worked out from the layout at the start of the drag every time (never
// from the previous preview), so dragging a widget away and back always returns it to where it was.
function useGridInteraction({ items, gridRef, onCommit }) {
  // { id, mode: 'move' | 'resize', items, shiftX, shiftY } while dragging, otherwise null.
  const [drag, setDrag] = useState(null);
  const cleanup = useRef(null);

  // Stop listening if the dashboard goes away in the middle of a drag.
  useEffect(() => () => cleanup.current?.(), []);

  // mode 'move', or 'resize' with edge 'e' (width), 's' (height) or 'se' (both).
  function begin(event, id, mode, edge = '') {
    const grid = gridRef.current;
    const start = items.find((item) => item.id === id);
    if (!grid || !start) return;
    if (event.button !== undefined && event.button !== 0) return; // primary button or touch only

    const styles = getComputedStyle(grid);
    const gap = parseFloat(styles.columnGap) || 0;
    const rowGap = parseFloat(styles.rowGap) || 0;
    const stepX = (grid.getBoundingClientRect().width - gap * (COLUMNS - 1)) / COLUMNS + gap;
    const stepY = ROW_HEIGHT + rowGap;
    if (!(stepX > 0)) return;

    event.preventDefault();
    const origin = { x: event.clientX, y: event.clientY };
    let latest = items;

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - origin.x;
      const dy = moveEvent.clientY - origin.y;
      const cols = Math.round(dx / stepX);
      const rows = Math.round(dy / stepY);

      let next;
      if (mode === 'move') {
        next = change(items, id, { x: start.x + cols, y: start.y + rows });
      } else {
        next = change(items, id, {
          w: edge.includes('e') ? Math.min(start.w + cols, COLUMNS - start.x) : start.w,
          h: edge.includes('s') ? start.h + rows : start.h,
        });
      }
      latest = next;

      // A moving card follows the pointer exactly; it is drawn offset from the cell it will snap to.
      const cell = next.find((item) => item.id === id);
      setDrag({
        id,
        mode,
        items: next,
        shiftX: mode === 'move' ? dx - (cell.x - start.x) * stepX : 0,
        shiftY: mode === 'move' ? dy - (cell.y - start.y) * stepY : 0,
      });
    }

    function finish(commit) {
      cleanup.current?.();
      cleanup.current = null;
      setDrag(null);
      if (commit && !sameLayout(latest, items)) onCommit(latest);
    }
    const onUp = () => finish(true);
    const onKey = (keyEvent) => {
      if (keyEvent.key === 'Escape') finish(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);
    cleanup.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey);
    };
    setDrag({ id, mode, items, shiftX: 0, shiftY: 0 });
  }

  return {
    drag,
    // What to draw: the preview while dragging, otherwise the saved layout.
    items: drag ? drag.items : items,
    startMove: (event, id) => begin(event, id, 'move'),
    startResize: (event, id, edge) => begin(event, id, 'resize', edge),
    // One cell at a time, for the keyboard.
    nudge: (id, dx, dy) => onCommit(moveBy(items, id, dx, dy)),
    stretch: (id, dw, dh) => onCommit(resizeBy(items, id, dw, dh)),
  };
}

export default useGridInteraction;
