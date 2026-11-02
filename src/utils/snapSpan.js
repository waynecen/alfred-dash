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
