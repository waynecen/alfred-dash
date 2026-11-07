import { describeRecurrence, nextOccurrence, parseTags } from './tasks';

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

describe('nextOccurrence', () => {
  const today = '2026-11-07';

  it('steps from the due date', () => {
    expect(nextOccurrence({ every: 'week', interval: 1 }, '2026-11-07', today)).toBe('2026-11-14');
    expect(nextOccurrence({ every: 'day', interval: 2 }, '2026-11-07', today)).toBe('2026-11-09');
  });

  it('skips past today when the task was late', () => {
    expect(nextOccurrence({ every: 'day', interval: 1 }, '2026-11-01', today)).toBe('2026-11-08');
    expect(nextOccurrence({ every: 'month', interval: 1 }, '2026-11-05', today)).toBe('2026-12-05');
  });

  it('steps from today when there is no due date', () => {
    expect(nextOccurrence({ every: 'week', interval: 2 }, null, today)).toBe('2026-11-21');
  });

  it('keeps a monthly task on its day through short months', () => {
    expect(nextOccurrence({ every: 'month', interval: 1 }, '2027-01-31', '2027-01-31')).toBe('2027-02-28');
    expect(nextOccurrence({ every: 'month', interval: 1 }, '2027-01-31', '2027-02-28')).toBe('2027-03-31');
  });
});
