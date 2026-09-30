import { SEP, SESSIONS } from './chores';

/** What each person did per session, kept in Home Assistant's per-user frontend storage so it survives
 *  the day roll (the to-do items themselves are deleted). `s` maps `YYYY-MM-DD-Morning|Evening` to
 *  `{ name: [done, total] }`. */
export interface ChoreLog { v: 1; s: Record<string, Record<string, [number, number]>> }
export const LOG_KEY = 'glasshouse_chore_log';
const KEEP_DAYS = 120;

const DAY_MS = 86_400_000;
const parseDay = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Writes this session's per-person tallies. A chore that isn't per-session (no ` · Morning|Evening` suffix,
 *  e.g. counters) is counted in the evening only, so a day chore done after lunch never looks like a missed morning. */
export function recordSession(log: ChoreLog, day: string, ses: string, rows: Array<{ who: string; done: boolean; summary?: string }>): ChoreLog {
  const tally: Record<string, [number, number]> = {};
  for (const r of rows) {
    const perSession = SESSIONS.some((x) => r.summary?.endsWith(SEP + x));
    if (!perSession && ses !== 'Evening') continue;
    const t = (tally[r.who] ||= [0, 0]);
    t[1]++; if (r.done) t[0]++;
  }
  const key = `${day}-${ses}`;
  const cutoff = fmt(new Date(+parseDay(day) - KEEP_DAYS * DAY_MS));
  const stale = Object.keys(log.s).some((k) => k.slice(0, 10) < cutoff);
  if (!stale && JSON.stringify(log.s[key] || {}) === JSON.stringify(tally)) return log;
  const s: ChoreLog['s'] = {};
  for (const [k, v] of Object.entries(log.s)) if (k.slice(0, 10) >= cutoff) s[k] = v;
  if (Object.keys(tally).length) s[key] = tally; else delete s[key];
  return { v: 1, s };
}

/** Consecutive days each person finished everything they had. Days with no chores (or no record, e.g. the
 *  dashboard was off) are skipped rather than breaking the streak; the session in progress (`current`) only
 *  counts once it's finished. */
export function streaks(log: ChoreLog, today: string, current: string): Record<string, number> {
  const days = [...new Set(Object.keys(log.s).map((k) => k.slice(0, 10)))].filter((d) => d <= today).sort().reverse();
  const names = new Set(Object.values(log.s).flatMap((v) => Object.keys(v)));
  const out: Record<string, number> = {};
  for (const n of names) {
    let count = 0;
    for (const d of days) {
      const recs = SESSIONS.map((x) => [`${d}-${x}`, log.s[`${d}-${x}`]?.[n]] as const)
        .filter(([k, r]) => r && !(k === current && r[0] < r[1]));
      if (recs.some(([, r]) => r![0] < r![1])) break;
      if (recs.length) count++;
    }
    out[n] = count;
  }
  return out;
}

/** Chores each person has done since Sunday. */
export function weekCounts(log: ChoreLog, today: string): Record<string, number> {
  const t = parseDay(today), sunday = fmt(new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay()));
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(log.s)) {
    if (k.slice(0, 10) < sunday || k.slice(0, 10) > today) continue;
    for (const [n, [done]] of Object.entries(v)) out[n] = (out[n] || 0) + done;
  }
  return out;
}

/** Streak lengths worth a bigger celebration. */
export const milestone = (n: number) => n === 7 || n === 14 || n === 30 || (n >= 50 && n % 50 === 0);
