export interface CalEvent { start: string; end?: string; summary: string; description?: string }
export type UpNextRow = { head: string } | { time: string; title: string };
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
    out.push({ time: allDay(e.start) ? 'All day' : fmtTime(d), title: e.summary });
  }
  return out.length ? out : [{ head: 'Today' }, { time: '', title: 'Nothing scheduled' }];
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
