import type { HassLike } from '../types';
import type { GlasshouseConfig } from '../config/types';
import { collectEntityIds, missingEntities } from '../config/schema';
import { computeAlerts, capsule, type ActiveAlert, type Capsule } from './alerts';
import { people, type PersonVm } from './people';
import { weather, type WeatherVm } from './weather';
import { upNext, timeline, type CalEvent, type UpNextRow, type FeedRow } from './calendar';
import { rosterChores, choreRows, dayString, session, type ChoreRow, type TodoItem } from './chores';
import { recordSession, streaks, weekCounts, type ChoreLog } from './streaks';
import { matchPerson } from './people';
import { rooms, discover, type RoomVm } from './rooms';
import { thermostat, climRooms, toggles, airVm, type ThermostatVm, type ClimRoomVm, type ToggleVm } from './climate';
import { laundry, type LaundryVm } from './laundry';
import { vacuums, mower, sprinklers, printer, brushing, hotTub, type VacVm, type MowerVm } from './family';
import { cars, energy, type CarVm, type EnergyVm } from './garage';
import { val } from './util';

export type Tab = 'home' | 'security' | 'rooms' | 'climate' | 'garage' | 'family';
export interface Extras { forecast?: Array<{ temperature: number; templow?: number }>; todoItems: TodoItem[]; calendar: CalEvent[]; timeline: CalEvent[]; laundryAck: string | null; choreLog?: ChoreLog }
export interface Model {
  now: Date; alerts: ActiveAlert[]; capsule: Capsule; people: PersonVm[]; weather: WeatherVm | null; chores: ChoreRow[];
  upNext: UpNextRow[]; feed: FeedRow[]; rooms: RoomVm[]; thermostat: ThermostatVm | null; climRooms: ClimRoomVm[]; toggles: ToggleVm[];
  air: ReturnType<typeof airVm>; laundry: LaundryVm | null; cars: CarVm[]; energy: EnergyVm | null; vacuums: VacVm[]; mower: MowerVm | null;
  sprinklers: ReturnType<typeof sprinklers>; printer: ReturnType<typeof printer>; brushing: ReturnType<typeof brushing>; hotTub: ReturnType<typeof hotTub>;
  night: boolean; tabs: Tab[]; missing: Map<string, string>;
  /** The chore log with this session recorded (null until it has loaded from Home Assistant). */
  choreLog: ChoreLog | null;
  /** Per person: day streak and chores done this week, champion first. Empty until the log has loaded. */
  choreStats: ChoreStat[];
}
export interface ChoreStat { who: string; initials: string; color: string; streak: number; week: number }

/** Records today's rows into the loaded log and ranks everyone who has chores this week or today. */
function choreStats(log: ChoreLog | null, rows: ChoreRow[], ppl: PersonVm[], now: Date): ChoreStat[] {
  if (!log) return [];
  const today = dayString(now), st = streaks(log, today, `${today}-${session(now)}`), wk = weekCounts(log, today);
  const names = [...new Set([...rows.map((r) => r.who), ...Object.keys(wk)])];
  return names.map((n) => {
    const r = rows.find((x) => x.who === n), p = matchPerson(ppl, n);
    return { who: n, initials: r?.initials || p?.initials || n.slice(0, 2).toUpperCase(), color: r?.color || p?.color || 'rgba(255,255,255,.5)', streak: st[n] || 0, week: wk[n] || 0 };
  }).sort((a, b) => b.week - a.week || b.streak - a.streak || a.who.localeCompare(b.who));
}

export function buildModel(h: HassLike, c: GlasshouseConfig, x: Extras, now: Date): Model {
  const alerts = computeAlerts(h, c.alerts, +now);
  const ppl = people(h, c.people);
  const specs = rosterChores(h, c.home?.chores?.roster, now);
  const f = c.family || {};
  const tabs: Tab[] = ['home'];
  const s = c.security;
  if (s && ((s.cameras?.length ?? 0) + (s.locks?.length ?? 0) + (s.covers?.length ?? 0)) > 0) tabs.push('security');
  if (c.rooms?.length) tabs.push('rooms');
  if (c.home?.thermostat || c.climate?.rooms?.length) tabs.push('climate');
  if (c.garage?.cars?.length || c.garage?.energy) tabs.push('garage');
  if (f.vacuums?.length || f.mower || f.sprinklers?.zones?.length || f.printer?.length || f.hot_tub || f.laundry_card || (c.people || []).some((p) => p.toothbrush)) tabs.push('family');
  const chores = c.home?.chores?.todo || specs ? choreRows(specs, x.todoItems, ppl, dayString(now)) : [];
  const choreLog = x.choreLog && chores.length ? recordSession(x.choreLog, dayString(now), session(now), chores) : x.choreLog || null;
  return {
    now, alerts, capsule: capsule(alerts, c.alerts?.secure_label), people: ppl,
    weather: weather(h, c.weather, x.forecast),
    chores, choreLog, choreStats: choreStats(choreLog, chores, ppl, now),
    upNext: c.home?.calendar ? upNext(x.calendar, now) : [], feed: timeline(x.timeline),
    rooms: rooms(h, c.rooms, new Set(alerts.map((a) => a.entity))),
    thermostat: thermostat(h, c.home?.thermostat), climRooms: climRooms(h, c.climate?.rooms), toggles: toggles(h, c.climate?.toggles),
    air: airVm(h, c.climate?.air),
    laundry: laundry(h, c.home?.laundry, c.home?.chores?.roster, ppl, x.laundryAck),
    cars: cars(h, c.garage?.cars), energy: energy(h, c.garage?.energy),
    vacuums: vacuums(h, f.vacuums), mower: mower(h, f.mower), sprinklers: sprinklers(h, f.sprinklers), printer: printer(h, f.printer),
    brushing: brushing(h, c.people), hotTub: hotTub(h, f.hot_tub),
    night: !!c.night_mode && val(h, c.night_mode) === 'on', tabs,
    missing: new Map(missingEntities(h, c).map((p) => [p.message.slice('missing: '.length), p.message])),
  };
}

export function relevantIds(h: HassLike, c: GlasshouseConfig): Set<string> {
  const ids = new Set(collectEntityIds(c));
  for (const r of c.rooms || []) { const d = discover(h, r); [...d.lights, ...d.fans, ...d.covers].forEach((i) => ids.add(i)); }
  for (const v of [...(c.family?.vacuums || []), c.family?.mower].filter(Boolean) as string[]) { const o = v.split('.')[1]; ids.add(`sensor.${o}_battery`); ids.add(`sensor.${o}_status`); ids.add(`binary_sensor.${o}_cleaning`); }
  return ids;
}

export function changed(prev: HassLike | undefined, next: HassLike, ids: Set<string>): boolean {
  if (!prev || prev.connected !== next.connected) return true;
  for (const id of ids) if (prev.states[id] !== next.states[id]) return true;
  return false;
}
