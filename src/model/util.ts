import type { HassEntity, HassLike } from '../types';

export const st = (h: HassLike, id?: string | null): HassEntity | undefined => (id ? h.states[id] : undefined);
export const val = (h: HassLike, id?: string | null) => st(h, id)?.state;
export const attr = <T = unknown>(h: HassLike, id: string | null | undefined, key: string) => st(h, id)?.attributes?.[key] as T | undefined;
export const exists = (h: HassLike, id?: string | null) => !!st(h, id) && val(h, id) !== 'unavailable';
export const isAvail = (h: HassLike, id?: string | null) => exists(h, id) && val(h, id) !== 'unknown';
export function num(h: HassLike, id?: string | null): number | null {
  const s = val(h, id);
  if (s == null || s === '' || s === 'unknown' || s === 'unavailable') return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
export const fname = (h: HassLike, id: string) => (attr<string>(h, id, 'friendly_name') || id);
export const minsSince = (iso: string, now: number) => Math.max(1, Math.round((now - Date.parse(iso)) / 60000));
export const domainOf = (id: string) => id.split('.')[0];
