import { IDLE, finishPhase, formatClock, minutesWorked, normalizeFocus, pause, remaining, resume, startPhase, stop } from './focus';

const MIN = 60 * 1000;
const idle = normalizeFocus(IDLE);

describe('focus timer', () => {
  it('counts down from when the phase ends, so a reload agrees on the time left', () => {
    const running = startPhase(idle, 0);
    expect(running).toMatchObject({ phase: 'work', endsAt: 25 * MIN, startedAt: 0 });
    expect(remaining(running, 10 * MIN)).toBe(15 * MIN);
  });

  it('holds the time left while paused', () => {
    const paused = pause(startPhase(idle, 0), 10 * MIN);
    expect(remaining(paused, 99 * MIN)).toBe(15 * MIN);
    expect(resume(paused, 50 * MIN).endsAt).toBe(65 * MIN);
  });

  it('goes from work to a break, from the moment the work ended', () => {
    const work = startPhase(idle, 0);
    const brk = finishPhase(work);
    expect(brk).toMatchObject({ phase: 'break', round: 1, endsAt: 30 * MIN });
    expect(finishPhase(brk)).toMatchObject({ phase: 'idle', round: 1, endsAt: null });
  });

  it('gives a long break after every fourth session, then starts the count again', () => {
    const fourth = startPhase({ ...idle, round: 3 }, 0);
    expect(finishPhase(fourth)).toMatchObject({ phase: 'longBreak', round: 0, endsAt: 40 * MIN });
  });

  it('counts the whole minutes worked when stopped early', () => {
    const work = startPhase(idle, 0);
    expect(minutesWorked(work, 12.5 * MIN)).toBe(12);
    expect(stop(work)).toMatchObject({ phase: 'idle', endsAt: null });
  });

  it('formats the time left like a clock', () => {
    expect(formatClock(25 * MIN)).toBe('25:00');
    expect(formatClock(59_001)).toBe('01:00');
    expect(formatClock(65 * MIN)).toBe('1:05:00');
  });
});
