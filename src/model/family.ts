import type { HassLike } from '../types';
import type { GlasshouseConfig, PersonCfg } from '../config/types';
import { attr, exists, isAvail, num, val, fname } from './util';

export type VacState = 'docked' | 'cleaning' | 'returning' | 'paused' | 'stuck' | 'offline';
export interface VacVm { entity: string; name: string; state: VacState; battery: number | null; text: string; action: { label: string; icon: string; service: 'start' | 'return_to_base' | 'locate' }; tone: 'off' | 'on' | 'alert' | 'na' }
export interface MowerVm { entity: string; name: string; mowing: boolean; battery: number | null; text: string; tone: 'ok' | 'na' }
export interface ZoneVm { entity: string; name: string; on: boolean }

const objId = (id: string) => id.split('.')[1];
const pct = (b: number | null) => (b == null ? '' : ` · ${Math.round(b)}%`);

export function vacuums(h: HassLike, ids: string[] = []): VacVm[] {
  return ids.map((id) => {
    const s = val(h, id);
    const state: VacState = !exists(h, id) ? 'offline' : ({ docked: 'docked', idle: 'docked', cleaning: 'cleaning', returning: 'returning', paused: 'paused', error: 'stuck' } as Record<string, VacState>)[s!] || 'docked';
    const battery = attr<number>(h, id, 'battery_level') ?? num(h, `sensor.${objId(id)}_battery`);
    const M: Record<VacState, Pick<VacVm, 'text' | 'action' | 'tone'>> = {
      docked: { text: `Docked${pct(battery)}`, action: { label: 'Start', icon: 'play', service: 'start' }, tone: 'off' },
      cleaning: { text: `Cleaning${pct(battery)}`, action: { label: 'Dock', icon: 'house', service: 'return_to_base' }, tone: 'on' },
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
