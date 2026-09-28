import type { HassLike } from '../types';
import type { AlertRule, GlasshouseConfig } from '../config/types';
import { st, val, num, fname, attr, minsSince, domainOf } from './util';

export type Tier = 'safety' | 'nudge';
export interface ActiveAlert { tier: Tier; entity: string; icon: string; title: string; sub: string; action?: { label: string; domain: string; service: string }; changed: string }
export interface Capsule { kind: 'red' | 'amber' | 'green'; icon: string; title: string; sub: string }

const ACTIVE = new Set(['on', 'open', 'opening', 'unlocked', 'jammed', 'problem']);
const norm = (r: string | AlertRule): AlertRule => (typeof r === 'string' ? { entity: r } : r);

function isActive(h: HassLike, r: AlertRule): boolean {
  const s = val(h, r.entity);
  if (s == null || s === 'unavailable' || s === 'unknown') return false;
  if (r.above != null || r.below != null) {
    const n = num(h, r.entity);
    if (n == null) return false;
    return (r.above != null && n > r.above) || (r.below != null && n < r.below);
  }
  if (r.state != null) return s === r.state;
  return ACTIVE.has(s);
}

function iconFor(h: HassLike, id: string): string {
  const d = domainOf(id), dc = attr<string>(h, id, 'device_class');
  if (d === 'cover') return 'warehouse';
  if (d === 'lock') return 'lock-open';
  if (dc === 'moisture') return 'droplets';
  if (dc === 'smoke' || dc === 'carbon_monoxide') return 'siren';
  if (d === 'vacuum') return 'bot';
  return 'triangle-alert';
}

function describe(h: HassLike, r: AlertRule, now: number): Pick<ActiveAlert, 'title' | 'sub' | 'action'> {
  const e = st(h, r.entity)!, d = domainOf(r.entity), name = fname(h, r.entity);
  const unit = attr<string>(h, r.entity, 'unit_of_measurement');
  if (r.above != null || r.below != null) {
    return { title: r.label || `${name} ${r.above != null ? 'high' : 'low'}`, sub: `${e.state}${unit ? ` ${unit}` : ''}` };
  }
  if (d === 'cover') {
    return { title: r.label || `${name} ${e.state === 'opening' ? 'opening' : 'open'}`, sub: `Open ${minsSince(e.last_changed, now)} min`, action: { label: 'Close', domain: 'cover', service: 'close_cover' } };
  }
  if (d === 'lock') {
    return { title: r.label || `${name} ${e.state}`, sub: e.state === 'jammed' ? 'Jammed — check the door' : `Unlocked ${minsSince(e.last_changed, now)} min`, action: e.state === 'jammed' ? undefined : { label: 'Lock', domain: 'lock', service: 'lock' } };
  }
  const dc = attr<string>(h, r.entity, 'device_class');
  const what = dc === 'moisture' ? 'leak detected' : dc === 'smoke' ? 'smoke detected' : e.state;
  return { title: r.label || `${name} ${what}`, sub: `Since ${minsSince(e.last_changed, now)} min ago` };
}

export function computeAlerts(h: HassLike, cfg: GlasshouseConfig['alerts'] | undefined, now: number): ActiveAlert[] {
  const out: ActiveAlert[] = [];
  for (const tier of ['safety', 'nudge'] as Tier[]) {
    for (const raw of cfg?.[tier] || []) {
      const r = norm(raw);
      if (!isActive(h, r)) continue;
      out.push({ tier, entity: r.entity, icon: r.icon || iconFor(h, r.entity), changed: st(h, r.entity)!.last_changed, ...describe(h, r, now) });
    }
  }
  return out;
}

export function capsule(alerts: ActiveAlert[], secureLabel = 'House is secure'): Capsule {
  const top = alerts[0];
  if (!top) return { kind: 'green', icon: 'shield-check', title: secureLabel, sub: 'Doors locked · no alerts' };
  const more = alerts.length > 1 ? ` · +${alerts.length - 1} more` : '';
  return { kind: top.tier === 'safety' ? 'red' : 'amber', icon: top.icon, title: top.title, sub: `${top.sub}${more}` };
}
