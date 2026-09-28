import type { HassLike } from '../types';
import { attr } from './util';
import { type PersonVm, matchPerson, COLORS } from './people';

export interface TodoItem { uid: string; summary: string; status: 'needs_action' | 'completed'; due?: string }
export interface ChoreSpec { key: string; who: string; label: string; icon: string; summary: string }
export interface SyncPlan { remove: string[]; add: string[] }
export interface ChoreRow { key: string; initials: string; who: string; what: string; icon: string; color: string; done: boolean; uid?: string }

export const SEP = ' · ';
export const SHORT: Record<string, string> = { unload: 'Unload dishes', load: 'Load dishes', garbage: 'Take out trash', counters: 'Clean appliances & countertops', laundry: 'Laundry' };
export const ICONS: Record<string, string> = { unload: 'utensils', load: 'utensils-crossed', garbage: 'trash-2', counters: 'spray-can', laundry: 'washing-machine' };

export const dayString = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function rosterChores(h: HassLike, rosterId: string | undefined, now: Date): ChoreSpec[] | null {
  if (!rosterId) return null;
  const a = attr<Record<string, string>>(h, rosterId, 'assignments') || {};
  const keys = (now.getHours() < 12 ? attr<string[]>(h, rosterId, 'morning_keys') : attr<string[]>(h, rosterId, 'evening_keys')) || Object.keys(a);
  return keys.filter((k) => (a[k] || '').trim()).map((k) => {
    const who = a[k].trim(), label = SHORT[k] || k;
    return { key: k, who, label, icon: ICONS[k] || 'check', summary: `${who}${SEP}${label}` };
  });
}

const dueDay = (i: TodoItem) => (i.due ? i.due.slice(0, 10) : undefined);
const isToday = (i: TodoItem, today: string) => !i.due || dueDay(i) === today;

const LABELS = new Set(Object.values(SHORT));
/** True for summaries in the format this card seeds from a roster: `<Name> · <one of the SHORT labels>`. */
export function isSeeded(summary: string): boolean {
  const at = summary.lastIndexOf(SEP);
  return at > 0 && LABELS.has(summary.slice(at + SEP.length));
}

/** Without a roster (`specs === null`) the list is used as-is: nothing is ever removed or added.
 *  With a roster: removes overdue items that this card seeded (by summary format only, so the user's own
 *  overdue to-dos are never touched), removes same-day duplicates of seeded chores (e.g. two devices seeding
 *  at once; keeps a completed one first, then the lowest uid, so every device picks the same survivor), and
 *  adds today's missing roster summaries. */
export function planSync(specs: ChoreSpec[] | null, items: TodoItem[], today: string): SyncPlan {
  if (!specs) return { remove: [], add: [] };
  const remove = items.filter((i) => i.due && dueDay(i)! < today && isSeeded(i.summary)).map((i) => i.uid);
  const todays = items.filter((i) => dueDay(i) === today);
  const groups = new Map<string, TodoItem[]>();
  for (const i of todays) if (isSeeded(i.summary)) groups.set(i.summary, [...(groups.get(i.summary) || []), i]);
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const keep = [...g].sort((a, b) => (a.status === 'completed' ? 0 : 1) - (b.status === 'completed' ? 0 : 1) || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0))[0];
    for (const i of g) if (i !== keep) remove.push(i.uid);
  }
  const have = new Set(todays.map((i) => i.summary));
  return { remove, add: specs.map((s) => s.summary).filter((s) => !have.has(s)) };
}

function personFor(ppl: PersonVm[], who: string) {
  const p = matchPerson(ppl, who);
  return p ? { who: p.name, initials: p.initials, color: p.color } : { who, initials: who.slice(0, 2).toUpperCase(), color: COLORS.grey };
}

export function choreRows(specs: ChoreSpec[] | null, all: TodoItem[], ppl: PersonVm[], today: string): ChoreRow[] {
  const items = all.filter((i) => isToday(i, today));
  const bySummary = new Map(items.map((i) => [i.summary, i]));
  if (specs) {
    return specs.map((s) => {
      const it = bySummary.get(s.summary);
      return { key: s.key, ...personFor(ppl, s.who), what: s.label, icon: s.icon, done: it?.status === 'completed', uid: it?.uid };
    });
  }
  return items.map((i) => {
    const at = i.summary.indexOf(SEP);
    const base = at > 0 ? personFor(ppl, i.summary.slice(0, at)) : { who: 'Anyone', initials: '·', color: COLORS.grey };
    return { key: i.uid, ...base, what: at > 0 ? i.summary.slice(at + SEP.length) : i.summary, icon: 'check', done: i.status === 'completed', uid: i.uid };
  });
}
