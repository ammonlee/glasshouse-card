import type { HassLike } from '../types';
import type { ClimateRoomCfg } from '../config/types';
import { attr, exists, isAvail, val, num, fname, domainOf } from './util';

export type Mode = 'auto' | 'heat' | 'cool' | 'off';
export type ClimTone = 'cold' | 'good' | 'warm' | 'off' | 'na';
export interface ThermostatVm { entity: string; current: number | null; mode: Mode; heat: number | null; cool: number | null; dual: boolean; target: number | null; action: string | null; actionLabel: string; actionColor: string | null; humidity: number | null; preset: string | null; min: number; max: number; step: number }
export interface ClimRoomVm { name: string; temp: number | null; target: number | null; vent: number; occupied: boolean | null; tone: ClimTone }
export interface ToggleVm { entity: string; name: string; icon: string; state: string; tone: 'on' | 'off' | 'na' }

const r = (v: number | null | undefined) => (v == null ? null : Math.round(v));
const ACTIONS: Record<string, [string, string | null]> = { heating: ['Heating', '#F8B2B2'], cooling: ['Cooling', '#A7C7E5'], fan: ['Fan', null], idle: ['Idle', null], off: ['Off', null], drying: ['Drying', null] };

export function thermostat(h: HassLike, id?: string): ThermostatVm | null {
  if (!id || !exists(h, id)) return null;
  const s = val(h, id)!;
  const mode: Mode = s === 'heat_cool' || s === 'auto' ? 'auto' : s === 'heat' || s === 'cool' || s === 'off' ? s : 'auto';
  const lo = attr<number>(h, id, 'target_temp_low'), hi = attr<number>(h, id, 'target_temp_high'), sp = attr<number>(h, id, 'temperature');
  const dual = lo != null && hi != null;
  const heat = dual ? r(lo) : mode === 'cool' ? null : r(sp);
  const cool = dual ? r(hi) : mode === 'cool' ? r(sp) : null;
  const action = attr<string>(h, id, 'hvac_action') ?? null;
  const [actionLabel, actionColor] = mode === 'off' ? ['Off', null] : action ? ACTIONS[action] || [action[0].toUpperCase() + action.slice(1), null] : ['Idle', null];
  const preset = attr<string>(h, id, 'preset_mode');
  return {
    entity: id, current: r(attr<number>(h, id, 'current_temperature')), mode, heat, cool, dual,
    target: mode === 'cool' ? cool : heat ?? cool, action, actionLabel, actionColor,
    humidity: r(attr<number>(h, id, 'current_humidity')), preset: preset ? preset.toLowerCase() : null,
    min: attr<number>(h, id, 'min_temp') ?? 50, max: attr<number>(h, id, 'max_temp') ?? 90, step: attr<number>(h, id, 'target_temp_step') ?? 1,
  };
}

export function setpointCall(t: ThermostatVm, delta: number): { data: Record<string, number> } | null {
  if (t.mode === 'off') return null;
  const clamp = (v: number) => Math.max(t.min, Math.min(t.max, v));
  if (t.dual && t.heat != null && t.cool != null) {
    if (t.mode === 'cool') return { data: { target_temp_low: t.heat, target_temp_high: clamp(Math.max(t.heat + 2, t.cool + delta)) } };
    return { data: { target_temp_low: clamp(Math.min(t.cool - 2, t.heat + delta)), target_temp_high: t.cool } };
  }
  if (t.target == null) return null;
  return { data: { temperature: clamp(t.target + delta * t.step) } };
}

export const modeService = (m: Mode) => (m === 'auto' ? 'heat_cool' : m);

export function climTone(t: number | null, target: number | null): ClimTone {
  if (t == null) return 'na';
  if (target == null) return 'off';
  const d = Math.round((t - target) * 10) / 10;
  return d < -1 ? 'cold' : d > 1 ? 'warm' : 'good';
}

export function climRooms(h: HassLike, cfg: ClimateRoomCfg[] = []): ClimRoomVm[] {
  return cfg.map((c) => {
    const ok = !!c.climate && isAvail(h, c.climate);
    const temp = ok ? attr<number>(h, c.climate!, 'current_temperature') ?? null : null;
    const target = ok ? attr<number>(h, c.climate!, 'temperature') ?? null : null;
    const vs = (c.vents || []).filter((v) => exists(h, v));
    const pos = vs.map((v) => attr<number>(h, v, 'current_position'));
    const vent = !vs.length ? 0 : pos.every((p) => p != null)
      ? Math.round((pos as number[]).reduce((a, b) => a + b, 0) / pos.length)
      : Math.round((vs.filter((v) => val(h, v) === 'open').length / vs.length) * 100);
    return { name: c.name, temp, target, vent, occupied: c.occupancy && exists(h, c.occupancy) ? val(h, c.occupancy) === 'on' : null, tone: climTone(temp, target) };
  });
}

const toggleIcon = (id: string) => (domainOf(id) === 'water_heater' ? 'heater' : /vent/.test(id) ? 'air-vent' : /thermostat/.test(id) ? 'thermometer' : /circulator|hot_water/.test(id) ? 'flame' : 'power');
export function toggles(h: HassLike, ids: string[] = []): ToggleVm[] {
  return ids.map((id) => {
    if (!isAvail(h, id)) return { entity: id, name: fname(h, id), icon: toggleIcon(id), state: 'Unavailable', tone: 'na' as const };
    const on = val(h, id) !== 'off';
    return { entity: id, name: fname(h, id), icon: toggleIcon(id), state: on ? 'On' : 'Off', tone: on ? 'on' as const : 'off' as const };
  });
}

export function airVm(h: HassLike, air?: { co2?: string; aqi?: string }) {
  const co2 = num(h, air?.co2), aqi = num(h, air?.aqi);
  return { co2, aqi, co2Bad: co2 != null && co2 > 1200, aqiBad: aqi != null && aqi > 100 };
}
