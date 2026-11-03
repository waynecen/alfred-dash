import { useRef } from 'react';
import Widget from '../Widget/Widget';
import useGridInteraction from '../../hooks/useGridInteraction';
import { ROW_HEIGHT, layoutFor, toSaved } from '../../utils/gridLayout';
import './Dashboard.css';

// The grid the widgets sit on. It works out where every widget goes (see utils/gridLayout.js),
// lets the user move and resize them, and draws them in reading order.
//   ids: the widgets on the dashboard    widgets: the registry (title, defaultSize, render)
//   saved: { [id]: { x, y, w, h } }      context: the shared data each widget renders from
//   onChange(saved): the new layout after the user moves or resizes something
function Dashboard({ ids, widgets, saved, context, onChange, onRemove }) {
  const gridRef = useRef(null);

  const sizes = Object.fromEntries(ids.map((id) => [id, widgets[id].defaultSize]));
  const items = layoutFor(ids, saved, sizes);

  const grid = useGridInteraction({
    items,
    gridRef,
    onCommit: (next) => onChange(toSaved(next)),
  });

  // Reading order, so keyboard and screen reader users meet the widgets the way they are laid out.
  const shown = [...grid.items].sort((a, b) => a.y - b.y || a.x - b.x);
  const active = grid.drag;
  const movingCell = active?.mode === 'move' && grid.items.find((item) => item.id === active.id);

  return (
    <div
      ref={gridRef}
      className="widget-grid"
      style={{ '--row-unit': `${ROW_HEIGHT}px` }}
    >
      {shown.map((item) => {
        const widget = widgets[item.id];
        const isActive = active?.id === item.id;
        return (
          <Widget
            key={item.id}
            title={widget.title}
            position={item}
            state={isActive ? (active.mode === 'move' ? 'moving' : 'resizing') : undefined}
            shift={isActive ? { x: active.shiftX, y: active.shiftY } : undefined}
            onRemove={() => onRemove(item.id)}
            onMoveStart={(event) => grid.startMove(event, item.id)}
            onResizeStart={(event, edge) => grid.startResize(event, item.id, edge)}
            onNudge={(dx, dy) => grid.nudge(item.id, dx, dy)}
            onStretch={(dw, dh) => grid.stretch(item.id, dw, dh)}
          >
            {widget.render(context)}
          </Widget>
        );
      })}
      {/* Where the card being moved will snap to when it is let go. */}
      {movingCell && (
        <div
          className="widget-ghost"
          aria-hidden="true"
          style={{
            gridColumn: `${movingCell.x + 1} / span ${movingCell.w}`,
            gridRow: `${movingCell.y + 1} / span ${movingCell.h}`,
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;
