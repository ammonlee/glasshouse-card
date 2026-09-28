import type { HassLike } from '../types';
import type { CarCfg, GlasshouseConfig } from '../config/types';
import { attr, exists, isAvail, num, val } from './util';

export interface CarVm { name: string; online: boolean; sub: string; pct: number | null; range: number | null; limit: number | null; limitEntity?: string; plugged: boolean; kw: number; locked: boolean | null; climate: boolean | null; sentry: boolean | null; cfg: CarCfg }
export interface EnergyVm { solar: number; grid: number; home: number; battery: number; level: number | null; charging: number; chargers: number; gridLabel: 'From grid' | 'To grid'; batteryLabel: string }

const round = (v: number | null) => (v == null ? null : Math.round(v));
export const kw = (v: number) => `${Math.abs(v).toFixed(1)} kW`;

export function cars(h: HassLike, cfg: CarCfg[] = []): CarVm[] {
  return cfg.map((c) => {
    const online = isAvail(h, c.battery);
    const inside = num(h, c.inside), odo = num(h, c.odometer), power = num(h, c.charger_power) ?? 0;
    const sub = [online ? 'Parked' : 'Asleep', inside != null ? `${Math.round(inside)}° inside` : null, odo != null ? `${Math.round(odo).toLocaleString('en-US')} mi` : null].filter(Boolean).join(' · ');
    return {
      name: c.name, online, sub, pct: round(num(h, c.battery)), range: round(num(h, c.range)),
      limit: round(num(h, c.charge_limit)), limitEntity: c.charge_limit, plugged: power > 0.1, kw: Math.round(power * 10) / 10,
      locked: c.lock && exists(h, c.lock) ? val(h, c.lock) === 'locked' : null,
      climate: c.climate && exists(h, c.climate) ? val(h, c.climate) !== 'off' : null,
      sentry: c.sentry && exists(h, c.sentry) ? val(h, c.sentry) === 'on' : null, cfg: c,
    };
  });
}

type EnergyCfg = NonNullable<NonNullable<GlasshouseConfig['garage']>['energy']>;
const kW = (h: HassLike, id?: string) => {
  const n = num(h, id);
  if (n == null) return 0;
  return (attr<string>(h, id, 'unit_of_measurement') || 'W').toLowerCase() === 'kw' ? n : n / 1000;
};

export function energy(h: HassLike, cfg?: EnergyCfg): EnergyVm | null {
  if (!cfg) return null;
  const battery = kW(h, cfg.battery), grid = kW(h, cfg.grid);
  const chargers = cfg.chargers || [];
  return {
    solar: kW(h, cfg.solar), grid, home: kW(h, cfg.home), battery, level: num(h, cfg.battery_level),
    charging: chargers.filter((id) => (num(h, id) ?? 0) > 1).length, chargers: chargers.length,
    gridLabel: grid < 0 ? 'To grid' : 'From grid',
    batteryLabel: Math.abs(battery) < 0.05 ? 'Powerwall · idle' : battery > 0 ? `Powerwall · giving ${kw(battery)}` : `Powerwall · charging ${kw(battery)}`,
  };
}
