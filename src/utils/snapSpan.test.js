import snapSpan, {
  clampSpan,
  clampRows,
  snapRows,
  GRID_COLUMNS,
  MIN_SPAN,
  MIN_ROWS,
  MAX_ROWS,
} from './snapSpan';

// A 1200px grid with a 12px gap has columns of about 89px.
const grid = 1200;
const gap = 12;
const widthOf = (n) => n * 89 + (n - 1) * gap;

describe('snapSpan', () => {
  it('snaps a width to the nearest whole column count', () => {
    expect(snapSpan(widthOf(4), grid, gap)).toBe(4);
    expect(snapSpan(widthOf(4) + 30, grid, gap)).toBe(4);
    expect(snapSpan(widthOf(4) + 60, grid, gap)).toBe(5);
  });

  it('stays within the minimum and the full grid', () => {
    expect(snapSpan(10, grid, gap)).toBe(MIN_SPAN);
    expect(snapSpan(5000, grid, gap)).toBe(GRID_COLUMNS);
  });

  it('falls back to the minimum when the grid has no width', () => {
    expect(snapSpan(300, 0, gap)).toBe(MIN_SPAN);
  });
});

describe('clampSpan', () => {
  it('limits a span to the allowed range', () => {
    expect(clampSpan(1)).toBe(MIN_SPAN);
    expect(clampSpan(6)).toBe(6);
    expect(clampSpan(20)).toBe(GRID_COLUMNS);
  });
});

describe('snapRows', () => {
  // Rows are 48px with a 16px gap, so 3 rows are 3 * 48 + 2 * 16 = 176px tall.
  it('snaps a height to the nearest whole row count', () => {
    expect(snapRows(176, 16)).toBe(3);
    expect(snapRows(176 + 20, 16)).toBe(3);
    expect(snapRows(176 + 40, 16)).toBe(4);
  });

  it('stays within the minimum and maximum', () => {
    expect(snapRows(0, 16)).toBe(MIN_ROWS);
    expect(snapRows(5000, 16)).toBe(MAX_ROWS);
  });
});

describe('clampRows', () => {
  it('limits a row count to the allowed range', () => {
    expect(clampRows(1)).toBe(MIN_ROWS);
    expect(clampRows(5)).toBe(5);
    expect(clampRows(99)).toBe(MAX_ROWS);
  });
});
