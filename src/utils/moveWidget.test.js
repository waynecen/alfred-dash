import moveWidget from './moveWidget';

const ids = ['a', 'b', 'c', 'd'];

describe('moveWidget', () => {
  it('moves a widget forward and backward', () => {
    expect(moveWidget(ids, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    expect(moveWidget(ids, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns the same list when nothing moves or an id is unknown', () => {
    expect(moveWidget(ids, 'b', 'b')).toBe(ids);
    expect(moveWidget(ids, 'x', 'b')).toBe(ids);
    expect(moveWidget(ids, 'b', 'x')).toBe(ids);
  });
});
