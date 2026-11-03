// The dashboard is a grid of COLUMNS columns and rows ROW_HEIGHT pixels tall. Every widget owns a
// rectangle of whole cells: { id, x, y, w, h } (column, row, width and height, counted in cells).
// Everything here is plain data in, plain data out, so the layout rules can be tested without a
// browser. Widgets never overlap: when one is moved or resized, the others make way and then
// settle upwards, so the pieces always fit together with no gaps above them.

export const COLUMNS = 12;
export const ROW_HEIGHT = 48; // px, also handed to the grid's CSS
export const MIN_W = 3;
export const MIN_H = 2;
export const MAX_H = 24;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const byPosition = (a, b) => a.y - b.y || a.x - b.x;

// Keeps a widget's size within the allowed range and its rectangle inside the grid.
export function clampItem(item) {
  const w = clamp(Math.round(item.w), MIN_W, COLUMNS);
  const h = clamp(Math.round(item.h), MIN_H, MAX_H);
  return {
    ...item,
    w,
    h,
    x: clamp(Math.round(item.x), 0, COLUMNS - w),
    y: Math.max(0, Math.round(item.y)),
  };
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// The highest row (smallest y) where `item` fits without touching any of `placed`.
// A free spot can only start at the top of the grid or right under a placed widget.
function settle(item, placed) {
  const candidates = [0, ...placed.map((p) => p.y + p.h)].sort((a, b) => a - b);
  return candidates.find((y) => !placed.some((p) => overlaps({ ...item, y }, p)));
}

// Resolves a layout in which `items` may overlap. The widget being moved or resized
// (movingId) keeps the spot it was given; every other widget flows around it, top to bottom, and
// settles as high as it can. The moving widget then rises into any gap left above it.
// Returns the items in the same order they came in.
export function arrange(items, movingId) {
  const clamped = items.map(clampItem);
  const moving = clamped.find((item) => item.id === movingId);
  const others = clamped.filter((item) => item.id !== movingId).sort(byPosition);

  const placed = moving ? [moving] : [];
  for (const item of others) placed.push({ ...item, y: settle(item, placed) });

  if (moving) {
    const rest = placed.slice(1);
    placed[0] = { ...moving, y: settle(moving, rest) };
  }
  return clamped.map((item) => placed.find((p) => p.id === item.id));
}

// Finds the first free spot for a new widget, reading order (top to bottom, then left to right).
export function place(items, { id, w, h }) {
  const size = clampItem({ id, x: 0, y: 0, w, h });
  const rows = [0, ...items.map((item) => item.y + item.h)].sort((a, b) => a - b);
  for (const y of rows) {
    for (let x = 0; x <= COLUMNS - size.w; x += 1) {
      const candidate = { ...size, x, y };
      if (!items.some((item) => overlaps(candidate, item))) return candidate;
    }
  }
  return size; // unreachable: the row under the last widget is always free
}

// Builds the layout for the widgets that are on the dashboard.
//   ids: the widget ids in the order they were added
//   saved: { [id]: { x, y, w, h } } from storage; widgets without an entry are placed in a free spot
//   sizes: { [id]: { w, h } } the default size of each widget
export function layoutFor(ids, saved, sizes) {
  const items = [];
  for (const id of ids) {
    const known = saved[id];
    items.push(known ? { id, ...known } : place(items, { id, ...sizes[id] }));
  }
  return arrange(items);
}

// Replaces one widget's rectangle and lets the others make way.
export function change(items, id, changes) {
  return arrange(
    items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    id
  );
}

// Moves or resizes by whole cells. Used by the keyboard and by the pointer.
export function moveBy(items, id, dx, dy) {
  const item = items.find((i) => i.id === id);
  return item ? change(items, id, { x: item.x + dx, y: item.y + dy }) : items;
}

export function resizeBy(items, id, dw, dh) {
  const item = items.find((i) => i.id === id);
  if (!item) return items;
  // Never grow past the right edge of the grid (that would shove the widget left instead).
  const w = clamp(item.w + dw, MIN_W, COLUMNS - item.x);
  return change(items, id, { w, h: item.h + dh });
}

// The saved form: { [id]: { x, y, w, h } }.
export function toSaved(items) {
  return Object.fromEntries(items.map(({ id, x, y, w, h }) => [id, { x, y, w, h }]));
}

export function sameLayout(a, b) {
  return (
    a.length === b.length &&
    a.every((item, i) => {
      const other = b[i];
      return (
        item.id === other.id &&
        item.x === other.x &&
        item.y === other.y &&
        item.w === other.w &&
        item.h === other.h
      );
    })
  );
}
