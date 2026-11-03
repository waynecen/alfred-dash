import {
  COLUMNS,
  MIN_W,
  MIN_H,
  MAX_H,
  arrange,
  change,
  clampItem,
  layoutFor,
  moveBy,
  overlaps,
  place,
  resizeBy,
  sameLayout,
  toSaved,
} from './gridLayout';

const item = (id, x, y, w, h) => ({ id, x, y, w, h });
const at = (items, id) => items.find((i) => i.id === id);
const rect = ({ x, y, w, h }) => [x, y, w, h];

// No two widgets may ever share a cell, and all must sit inside the grid.
function expectValid(items) {
  items.forEach((a, i) => {
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.x + a.w).toBeLessThanOrEqual(COLUMNS);
    expect(a.y).toBeGreaterThanOrEqual(0);
    items.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false));
  });
}

describe('clampItem', () => {
  it('keeps the size within the limits and the rectangle inside the grid', () => {
    expect(rect(clampItem(item('a', 0, 0, 1, 1)))).toEqual([0, 0, MIN_W, MIN_H]);
    expect(rect(clampItem(item('a', 0, 0, 99, 99)))).toEqual([0, 0, COLUMNS, MAX_H]);
    expect(rect(clampItem(item('a', 11, -3, 4, 3)))).toEqual([COLUMNS - 4, 0, 4, 3]);
  });
});

describe('arrange', () => {
  it('lets widgets rise to the top when there is room', () => {
    const result = arrange([item('a', 0, 5, 4, 3), item('b', 6, 9, 4, 3)]);
    expect(rect(at(result, 'a'))).toEqual([0, 0, 4, 3]);
    expect(rect(at(result, 'b'))).toEqual([6, 0, 4, 3]);
  });

  it('keeps side-by-side widgets on the same row', () => {
    const result = arrange([item('a', 0, 0, 4, 3), item('b', 4, 0, 8, 3)]);
    expect(rect(at(result, 'b'))).toEqual([4, 0, 8, 3]);
  });

  it('pushes the others down so the moving widget keeps its spot', () => {
    const result = arrange([item('a', 0, 0, 6, 3), item('b', 0, 0, 6, 3)], 'b');
    expect(rect(at(result, 'b'))).toEqual([0, 0, 6, 3]);
    expect(rect(at(result, 'a'))).toEqual([0, 3, 6, 3]);
    expectValid(result);
  });

  it('keeps the order of the list it was given', () => {
    const result = arrange([item('a', 0, 0, 6, 3), item('b', 0, 3, 6, 3)], 'b');
    expect(result.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('never leaves overlaps, however tangled the input', () => {
    const tangled = [
      item('a', 0, 0, 12, 4),
      item('b', 3, 1, 6, 6),
      item('c', 5, 2, 7, 3),
      item('d', 0, 0, 3, 8),
    ];
    for (const id of [undefined, 'a', 'b', 'c', 'd']) expectValid(arrange(tangled, id));
  });
});

describe('place', () => {
  it('uses the first free spot in reading order', () => {
    const items = [item('a', 0, 0, 4, 3)];
    expect(rect(place(items, { id: 'b', w: 4, h: 3 }))).toEqual([4, 0, 4, 3]);
    expect(rect(place(items, { id: 'b', w: 9, h: 3 }))).toEqual([0, 3, 9, 3]);
  });

  it('starts at the top left of an empty grid', () => {
    expect(rect(place([], { id: 'a', w: 5, h: 4 }))).toEqual([0, 0, 5, 4]);
  });
});

describe('layoutFor', () => {
  const sizes = { summary: { w: 4, h: 4 }, tasks: { w: 8, h: 8 }, notes: { w: 4, h: 5 } };

  it('puts default-sized widgets side by side', () => {
    const result = layoutFor(['summary', 'tasks'], {}, sizes);
    expect(rect(at(result, 'summary'))).toEqual([0, 0, 4, 4]);
    expect(rect(at(result, 'tasks'))).toEqual([4, 0, 8, 8]);
  });

  it('fits a new widget under the Summary, into the gap beside nothing', () => {
    const result = layoutFor(['summary', 'tasks', 'notes'], {}, sizes);
    expect(rect(at(result, 'notes'))).toEqual([0, 4, 4, 5]);
  });

  it('uses saved columns and sizes, and lets widgets rise into free rows', () => {
    const saved = { summary: { x: 8, y: 5, w: 4, h: 4 } };
    const result = layoutFor(['summary'], saved, sizes);
    expect(rect(at(result, 'summary'))).toEqual([8, 0, 4, 4]);
  });
});

describe('moveBy and resizeBy', () => {
  const start = [item('a', 0, 0, 4, 3), item('b', 4, 0, 4, 3)];

  it('moves a widget by whole cells and the neighbour makes way', () => {
    const result = moveBy(start, 'a', 4, 0);
    expect(rect(at(result, 'a'))).toEqual([4, 0, 4, 3]);
    expect(rect(at(result, 'b'))).toEqual([4, 3, 4, 3]);
    expectValid(result);
  });

  it('does not move past the edges of the grid', () => {
    expect(rect(at(moveBy(start, 'b', 50, 0), 'b'))).toEqual([COLUMNS - 4, 0, 4, 3]);
    expect(rect(at(moveBy(start, 'a', -5, -5), 'a'))).toEqual([0, 0, 4, 3]);
  });

  it('resizes a widget and pushes a neighbour down when they would collide', () => {
    const result = resizeBy(start, 'a', 2, 1);
    expect(rect(at(result, 'a'))).toEqual([0, 0, 6, 4]);
    expect(at(result, 'b').y).toBe(4);
    expectValid(result);
  });

  it('keeps a widget at least the minimum size and inside the grid', () => {
    expect(at(resizeBy(start, 'a', -10, -10), 'a')).toMatchObject({ w: MIN_W, h: MIN_H });
    expect(at(resizeBy(start, 'b', 20, 0), 'b').w).toBe(COLUMNS - 4);
  });

  it('ignores an unknown id', () => {
    expect(moveBy(start, 'x', 1, 1)).toBe(start);
    expect(resizeBy(start, 'x', 1, 1)).toBe(start);
  });
});

describe('change', () => {
  it('drops a widget into the middle of others without overlaps', () => {
    const items = [item('a', 0, 0, 4, 3), item('b', 4, 0, 4, 3), item('c', 8, 0, 4, 3)];
    expectValid(change(items, 'c', { x: 2, y: 0 }));
  });
});

describe('toSaved and sameLayout', () => {
  it('keeps just the rectangle of each widget', () => {
    expect(toSaved([item('a', 1, 2, 3, 4)])).toEqual({ a: { x: 1, y: 2, w: 3, h: 4 } });
  });

  it('compares layouts by content', () => {
    expect(sameLayout([item('a', 0, 0, 4, 3)], [item('a', 0, 0, 4, 3)])).toBe(true);
    expect(sameLayout([item('a', 0, 0, 4, 3)], [item('a', 1, 0, 4, 3)])).toBe(false);
    expect(sameLayout([item('a', 0, 0, 4, 3)], [])).toBe(false);
  });
});
