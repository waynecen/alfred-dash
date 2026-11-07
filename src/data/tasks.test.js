import { describeRecurrence, parseTags } from './tasks';

describe('parseTags', () => {
  it('reads tags with or without #, split by spaces or commas, lower case and unique', () => {
    expect(parseTags('#home, Work  errands #home')).toEqual(['home', 'work', 'errands']);
  });

  it('skips anything that is not a tag', () => {
    expect(parseTags('# !! ok? fine')).toEqual(['fine']);
  });
});

describe('describeRecurrence', () => {
  it('reads one or several units', () => {
    expect(describeRecurrence({ every: 'day', interval: 1 })).toBe('Every day');
    expect(describeRecurrence({ every: 'week', interval: 2 })).toBe('Every 2 weeks');
    expect(describeRecurrence(null)).toBe('');
  });
});
