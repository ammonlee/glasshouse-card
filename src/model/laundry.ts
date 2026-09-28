import type { HassLike } from '../types';
import type { GlasshouseConfig } from '../config/types';
import { attr, exists, num, st, val } from './util';
import { type PersonVm, matchPerson, COLORS } from './people';

type LaundryCfg = NonNullable<NonNullable<GlasshouseConfig['home']>['laundry']>;
type Phase = 'done' | 'running' | 'idle' | 'na';
export interface LaundryVm { washer: Phase; washerMin: number | null; dryer: Phase; dryerMin: number | null; dryerPct: number; loads: number | null; turn: { name: string; initials: string; color: string } | null; note: string | null; doneSince: string | null }

const IDLE = new Set(['power_off', 'end', 'off', 'unknown', 'idle']);
function phase(h: HassLike, status?: string, done?: string, ackedAt?: string | null): Phase {
  if (!status || !exists(h, status)) return 'na';
  if (done && val(h, done) === 'on' && st(h, done)!.last_changed !== ackedAt && IDLE.has(val(h, status)!)) return 'done';
  return IDLE.has(val(h, status)!) ? 'idle' : 'running';
}

export function laundry(h: HassLike, cfg?: LaundryCfg, rosterId?: string, ppl: PersonVm[] = [], ackedAt: string | null = null): LaundryVm | null {
  if (!cfg || (!cfg.washer && !cfg.dryer)) return null;
  const left = num(h, cfg.dryer_remaining), total = num(h, cfg.dryer_total);
  const who = rosterId ? (attr<Record<string, string>>(h, rosterId, 'assignments') || {}).laundry?.trim() : '';
  const p = who ? matchPerson(ppl, who) : undefined;
  return {
    washer: phase(h, cfg.washer, cfg.washer_done, ackedAt), washerMin: num(h, cfg.washer_remaining),
    dryer: phase(h, cfg.dryer, cfg.dryer_done, null), dryerMin: left,
    dryerPct: left != null && total ? Math.round((1 - left / total) * 100) : 0,
    loads: num(h, cfg.loads_week),
    turn: who ? (p ? { name: p.name, initials: p.initials, color: p.color } : { name: who, initials: who.slice(0, 2).toUpperCase(), color: COLORS.grey }) : null,
    note: who ? null : (rosterId ? attr<string>(h, rosterId, 'laundry_note') ?? null : null),
    doneSince: cfg.washer_done && val(h, cfg.washer_done) === 'on' ? st(h, cfg.washer_done)!.last_changed : null,
  };
}
