export const GRID_COLUMNS = 12;
export const MIN_SPAN = 3;

// Keeps a column count inside what a widget may span.
export function clampSpan(span) {
  return Math.min(GRID_COLUMNS, Math.max(MIN_SPAN, span));
}

// Snaps a pixel width to a whole number of grid columns.
// A card spanning n columns is n * column + (n - 1) * gap wide, so n = (width + gap) / (column + gap).
function snapSpan(width, gridWidth, gap) {
  const column = (gridWidth - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  if (!(column > 0)) return MIN_SPAN;
  return clampSpan(Math.round((width + gap) / (column + gap)));
}

export default snapSpan;

// Heights work the same way: the grid has rows of a fixed height, and a widget spans some of them.
// Widgets with no saved height keep growing with their content.
export const ROW_HEIGHT = 48; // px, also handed to the grid's CSS
export const MIN_ROWS = 2;
export const MAX_ROWS = 16;

export function clampRows(rows) {
  return Math.min(MAX_ROWS, Math.max(MIN_ROWS, rows));
}

// Snaps a pixel height to a whole number of rows. n rows are n * ROW_HEIGHT + (n - 1) * gap tall.
export function snapRows(height, gap) {
  return clampRows(Math.round((height + gap) / (ROW_HEIGHT + gap)));
}
