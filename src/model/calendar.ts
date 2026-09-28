import type { CalendarCfg } from '../config/types';
import { COLORS } from './people';

export interface CalEvent { start: string; end?: string; summary: string; description?: string; color?: string }
export type UpNextRow = { head: string } | { time: string; title: string; color: string };

/** Default event-dot colours, given to calendars by their position in the config. */
export const CAL_PALETTE = ['#ADB5E5', '#62D7AC', '#FFD660', '#F48585', '#B07CC6', '#A7C7E5'];

/** Normalizes `home.calendar` (an id, or a list of ids / { entity, color }) to entity + resolved colour.
 *  A colour may be a named person colour (blue, gold, grey, green, orange, purple) or any CSS colour. */
export function calendars(cfg?: string | Array<string | CalendarCfg>): Array<{ entity: string; color: string }> {
  return ([] as Array<string | CalendarCfg>).concat(cfg || []).map((x, i) => {
    const c = typeof x === 'string' ? { entity: x } : x;
    return { entity: c.entity, color: c.color ? COLORS[c.color] || c.color : CAL_PALETTE[i % CAL_PALETTE.length] };
  });
}
export interface FeedRow { time: string; icon: string; what: string }

export const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\u202F/g, ' ');
const allDay = (s: string) => !s.includes('T');
const parse = (s: string) => (allDay(s) ? new Date(`${s}T00:00:00`) : new Date(s));
const dayKey = (d: Date) => d.toDateString();

export function upNext(events: CalEvent[], now: Date, max = 6): UpNextRow[] {
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const sorted = [...events].sort((a, b) => {
    const da = parse(a.start), db = parse(b.start);
    if (dayKey(da) === dayKey(db) && allDay(a.start) !== allDay(b.start)) return allDay(a.start) ? -1 : 1;
    return +da - +db;
  }).slice(0, max);
  const out: UpNextRow[] = [];
  let last = '';
  for (const e of sorted) {
    const d = parse(e.start);
    const head = dayKey(d) === dayKey(now) ? (!allDay(e.start) && d.getHours() >= 17 ? 'Tonight' : 'Today')
      : dayKey(d) === dayKey(tomorrow) ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long' });
    if (head !== last) { out.push({ head }); last = head; }
    out.push({ time: allDay(e.start) ? 'All day' : fmtTime(d), title: e.summary, color: e.color || CAL_PALETTE[0] });
  }
  return out.length ? out : [{ head: 'Today' }, { time: '', title: 'Nothing scheduled', color: 'rgba(255,255,255,.3)' }];
}

const ICONS: Array<[RegExp, string]> = [
  [/person|someone|\bman\b|woman|kid|child/i, 'person-standing'], [/car|vehicle|truck/i, 'car'],
  [/package|deliver/i, 'package'], [/dog|cat|animal/i, 'dog'],
];
export function timeline(events: CalEvent[], max = 4): FeedRow[] {
  return [...events].sort((a, b) => Date.parse(b.start) - Date.parse(a.start)).slice(0, max).map((e) => {
    const text = `${e.summary} ${e.description || ''}`;
    return { time: fmtTime(new Date(e.start)), icon: ICONS.find(([re]) => re.test(text))?.[1] || 'eye', what: e.summary };
  });
}
