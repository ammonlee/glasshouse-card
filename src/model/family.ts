import type { HassLike } from '../types';
import type { GlasshouseConfig, PersonCfg } from '../config/types';
import { attr, exists, isAvail, num, val, fname } from './util';

export type VacState = 'docked' | 'cleaning' | 'returning' | 'paused' | 'stuck' | 'offline';
export interface VacVm { entity: string; name: string; state: VacState; battery: number | null; text: string; action: { label: string; icon: string; service: 'start' | 'return_to_base' | 'locate' }; tone: 'off' | 'on' | 'alert' | 'na' }
export interface MowerVm { entity: string; name: string; mowing: boolean; battery: number | null; text: string; tone: 'ok' | 'na' }
export interface ZoneVm { entity: string; name: string; on: boolean }

const objId = (id: string) => id.split('.')[1];
const pct = (b: number | null) => (b == null ? '' : ` · ${Math.round(b)}%`);

/** Roborock-style `sensor.<vacuum>_status` values, grouped. The vacuum entity itself can lag the robot by minutes
 *  (it still reads "docked" while the dock washes the mop before a run), so the status sensor wins when present. */
const STATUS_WORDS: Record<string, string> = {
  starting: 'Starting', cleaning: 'Cleaning', spot_cleaning: 'Spot cleaning', zoned_cleaning: 'Cleaning zones', segment_cleaning: 'Cleaning rooms',
  going_to_target: 'Heading out', washing_the_mop: 'Washing the mop', going_to_wash_the_mop: 'Going to wash the mop', emptying_the_bin: 'Emptying the bin',
  mapping: 'Mapping', patrol: 'Patrolling', attaching_the_mop: 'Attaching the mop', detaching_the_mop: 'Detaching the mop', robot_status_mopping: 'Mopping',
  clean_mop_cleaning: 'Vacuum & mop', clean_mop_mopping: 'Mopping', segment_mopping: 'Mopping rooms', segment_clean_mop_cleaning: 'Vacuum & mop rooms',
  segment_clean_mop_mopping: 'Mopping rooms', zoned_mopping: 'Mopping zones', zoned_clean_mop_cleaning: 'Vacuum & mop zones', zoned_clean_mop_mopping: 'Mopping zones',
  air_drying_stopping: 'Drying the mop', back_to_dock_washing_duster: 'Washing the duster', remote_control_active: 'Remote control', manual_mode: 'Manual mode',
};
/** Things the dock does with the robot parked; they only count as a run when the cleaning sensor is on. */
const DOCK_CHORES = new Set(['emptying_the_bin', 'washing_the_mop', 'air_drying_stopping', 'back_to_dock_washing_duster']);
const STATUS_STATE: Record<string, VacState> = {
  returning_home: 'returning', docking: 'returning', paused: 'paused', error: 'stuck', charging_problem: 'stuck', locked: 'stuck', device_offline: 'offline',
};

export function vacuums(h: HassLike, ids: string[] = []): VacVm[] {
  return ids.map((id) => {
    const s = val(h, id), o = objId(id);
    const status = exists(h, `sensor.${o}_status`) ? val(h, `sensor.${o}_status`)! : undefined;
    const cleaningOn = val(h, `binary_sensor.${o}_cleaning`) === 'on';
    let state: VacState = !exists(h, id) ? 'offline' : ({ docked: 'docked', idle: 'docked', cleaning: 'cleaning', returning: 'returning', paused: 'paused', error: 'stuck' } as Record<string, VacState>)[s!] || 'docked';
    if (status && status !== 'unknown' && state !== 'offline') {
      const out = cleaningOn || (status in STATUS_WORDS && !DOCK_CHORES.has(status));
      state = STATUS_STATE[status] || (out ? 'cleaning' : 'docked');
    }
    const doing = status ? STATUS_WORDS[status] : undefined;
    const battery = attr<number>(h, id, 'battery_level') ?? num(h, `sensor.${o}_battery`);
    const M: Record<VacState, Pick<VacVm, 'text' | 'action' | 'tone'>> = {
      docked: { text: doing && status !== 'cleaning' ? `Docked · ${doing}` : `Docked${pct(battery)}`, action: { label: 'Start', icon: 'play', service: 'start' }, tone: 'off' },
      cleaning: { text: `${doing || 'Cleaning'}${pct(battery)}`, action: { label: 'Dock', icon: 'house', service: 'return_to_base' }, tone: 'on' },
      returning: { text: 'Returning to dock', action: { label: 'Start', icon: 'play', service: 'start' }, tone: 'on' },
      paused: { text: `Paused${pct(battery)}`, action: { label: 'Dock', icon: 'house', service: 'return_to_base' }, tone: 'on' },
      stuck: { text: 'Stuck — needs help', action: { label: 'Locate', icon: 'volume-2', service: 'locate' }, tone: 'alert' },
      offline: { text: 'Offline', action: { label: 'Locate', icon: 'volume-2', service: 'locate' }, tone: 'na' },
    };
    return { entity: id, name: fname(h, id), state, battery, ...M[state] };
  });
}

export function mower(h: HassLike, id?: string): MowerVm | null {
  if (!id) return null;
  const battery = num(h, `sensor.${objId(id)}_battery`), mowing = val(h, id) === 'mowing';
  if (!exists(h, id)) return { entity: id, name: fname(h, id), mowing: false, battery, text: 'Offline', tone: 'na' };
  return { entity: id, name: fname(h, id), mowing, battery, text: `${mowing ? 'Mowing' : 'Docked'}${pct(battery)}`, tone: 'ok' };
}

type SprCfg = NonNullable<NonNullable<GlasshouseConfig['family']>['sprinklers']>;
export function sprinklers(h: HassLike, cfg?: SprCfg) {
  if (!cfg?.zones?.length) return null;
  const strip = cfg.strip_prefix || '';
  const zones: ZoneVm[] = cfg.zones.filter((z) => exists(h, z)).map((z) => {
    const n = fname(h, z);
    return { entity: z, name: strip && n.startsWith(strip) ? n.slice(strip.length) : n, on: val(h, z) === 'on' };
  });
  return { zones, rainDelay: cfg.rain_delay && exists(h, cfg.rain_delay) ? val(h, cfg.rain_delay) === 'on' : null, running: zones.find((z) => z.on) || null };
}

const COLOR_NAMES = ['black', 'cyan', 'magenta', 'yellow'];
export function printer(h: HassLike, ids: string[] = []) {
  const inks = ids.map((id) => [COLOR_NAMES.find((c) => `${id} ${fname(h, id)}`.toLowerCase().includes(c)) || fname(h, id), num(h, id)] as const).filter(([, v]) => v != null) as Array<[string, number]>;
  const low = inks.filter(([, v]) => v <= 30);
  return {
    low: low.length ? `Printer ink low · ${low.map(([c]) => c).join(' & ')} ${Math.min(...low.map(([, v]) => v))}%` : null,
    min: inks.length ? Math.min(...inks.map(([, v]) => v)) : null,
  };
}

export function brushing(h: HassLike, ppl: PersonCfg[] = []) {
  return ppl.filter((p) => p.toothbrush).map((p) => {
    const s = Math.round(num(h, p.toothbrush) ?? 0), ratio = Math.min(s / 120, 1);
    return { name: p.name || fname(h, p.person).split(' ')[0], seconds: s, time: s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '—', pct: Math.round(ratio * 100), done: ratio >= 1 };
  });
}

export function hotTub(h: HassLike, id?: string) {
  if (!id) return null;
  return { online: isAvail(h, id), temp: isAvail(h, id) ? attr<number>(h, id, 'current_temperature') ?? null : null };
}
