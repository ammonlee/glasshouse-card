import { describe, it, expect } from 'vitest';
import { recordSession, streaks, weekCounts, milestone, type ChoreLog } from '../src/model/streaks';

const row = (who: string, done: boolean, summary = `${who} · Load dishes · Morning`) => ({ who, done, summary });
const empty = (): ChoreLog => ({ v: 1, s: {} });

describe('recordSession', () => {
  it('records each person\'s done/total for the session', () => {
    const log = recordSession(empty(), '2026-09-29', 'Morning', [row('June', true), row('June', false), row('Max', true)]);
    expect(log.s['2026-09-29-Morning']).toEqual({ June: [1, 2], Max: [1, 1] });
  });
  it('returns the same object when nothing changed', () => {
    const a = recordSession(empty(), '2026-09-29', 'Morning', [row('June', true)]);
    expect(recordSession(a, '2026-09-29', 'Morning', [row('June', true)])).toBe(a);
  });
  it('counts once-a-day chores only in the evening', () => {
    const counters = row('Max', false, 'Max · Counters & appliances');
    expect(recordSession(empty(), '2026-09-29', 'Morning', [row('June', true), counters]).s['2026-09-29-Morning']).toEqual({ June: [1, 1] });
    expect(recordSession(empty(), '2026-09-29', 'Evening', [{ ...counters, done: true }]).s['2026-09-29-Evening']).toEqual({ Max: [1, 1] });
  });
  it('drops entries older than 120 days', () => {
    const old: ChoreLog = { v: 1, s: { '2026-01-01-Morning': { June: [1, 1] } } };
    expect(Object.keys(recordSession(old, '2026-09-29', 'Morning', [row('June', true)]).s)).toEqual(['2026-09-29-Morning']);
  });
});

describe('streaks', () => {
  const log: ChoreLog = { v: 1, s: {
    '2026-09-25-Morning': { June: [1, 2], Max: [1, 1] },   // June missed one
    '2026-09-26-Morning': { June: [1, 1], Max: [1, 1] },
    '2026-09-26-Evening': { June: [1, 1], Max: [0, 1] },   // Max missed one
    '2026-09-27-Morning': { June: [1, 1] },                 // Max had no chores: skipped, not broken
    '2026-09-28-Evening': { June: [1, 1], Max: [1, 1] },   // no morning record: unknown, skipped
    '2026-09-29-Morning': { June: [0, 1], Max: [1, 1] },   // today, June still going: doesn't break
  } };
  it('counts consecutive fully-done days, skipping days with no chores or no record', () => {
    expect(streaks(log, '2026-09-29', '2026-09-29-Morning')).toEqual({ June: 3, Max: 2 });
  });
  it('breaks on a session earlier today that was missed', () => {
    const log: ChoreLog = { v: 1, s: { '2026-09-28-Evening': { June: [1, 1] }, '2026-09-29-Morning': { June: [0, 1] }, '2026-09-29-Evening': { June: [0, 1] } } };
    expect(streaks(log, '2026-09-29', '2026-09-29-Evening')).toEqual({ June: 0 });
  });
  it('drops to zero after a missed day', () => {
    expect(streaks({ v: 1, s: { '2026-09-28-Evening': { June: [0, 1] } } }, '2026-09-29', '2026-09-29-Morning')).toEqual({ June: 0 });
  });
});

describe('weekCounts', () => {
  it('sums chores done since Sunday', () => {
    const log: ChoreLog = { v: 1, s: {
      '2026-09-26-Evening': { June: [5, 5] },                // Saturday: last week
      '2026-09-27-Morning': { June: [2, 2], Max: [1, 2] },   // Sunday
      '2026-09-29-Evening': { June: [1, 1], Max: [3, 3] },
    } };
    expect(weekCounts(log, '2026-09-29')).toEqual({ June: 3, Max: 4 });
  });
});

describe('milestone', () => {
  it('flags 7, 14, 30, 50, 100 and every 50 after', () => {
    expect([3, 7, 14, 21, 30, 50, 100, 150, 151].map(milestone)).toEqual([false, true, true, false, true, true, true, true, false]);
  });
});
