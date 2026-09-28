import type { HassLike } from '../types';
import type { PersonCfg } from '../config/types';
import { val, fname } from './util';

export const COLORS: Record<string, string> = { blue: '#A7C7E5', gold: '#FFD660', grey: '#C9CDD3', green: '#98E6CA', orange: '#E58A4E', purple: '#B07CC6' };
export const colorOf = (c?: string) => (c ? COLORS[c] || (c.startsWith('#') ? c : COLORS.grey) : COLORS.grey);

export interface PersonVm { name: string; initials: string; color: string; home: boolean; inRoom: boolean }

export function people(h: HassLike, cfg: PersonCfg[] = []): PersonVm[] {
  return cfg.map((p) => {
    const s = val(h, p.person);
    const name = p.name || fname(h, p.person).split(' ')[0];
    const home = s != null && s !== 'not_home' && s !== 'unavailable';
    return { name, initials: (p.initials || name.slice(0, 2)).toUpperCase(), color: colorOf(p.color), home, inRoom: home && val(h, p.occupancy) === 'on' };
  });
}

export function matchPerson(list: PersonVm[], name: string): PersonVm | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return list.find((p) => p.name.toLowerCase() === n) || list.find((p) => p.name.toLowerCase().startsWith(n));
}
