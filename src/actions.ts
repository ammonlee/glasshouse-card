import type { HassLike } from './types';
import type { Overrides } from './overrides';
import { attr, domainOf, val } from './model/util';

export interface Call { domain: string; service: string; data?: Record<string, unknown>; target: { entity_id: string | string[] }; optimistic?: Array<[string, string]> }

const ONOFF = new Set(['light', 'switch', 'fan', 'input_boolean', 'automation']);

export function toggleCall(h: HassLike, id: string): Call | null {
  const d = domainOf(id), s = val(h, id), target = { entity_id: id };
  if (d === 'lock') { const lock = s !== 'locked'; return { domain: 'lock', service: lock ? 'lock' : 'unlock', target, optimistic: [[id, lock ? 'locked' : 'unlocked']] }; }
  if (d === 'cover') { const open = s === 'closed' || s === 'closing'; return { domain: 'cover', service: open ? 'open_cover' : 'close_cover', target, optimistic: [[id, open ? 'opening' : 'closing']] }; }
  if (ONOFF.has(d)) { const on = s !== 'on'; return { domain: d, service: on ? 'turn_on' : 'turn_off', target, optimistic: [[id, on ? 'on' : 'off']] }; }
  if (d === 'media_player') return { domain: d, service: 'media_play_pause', target };
  if (d === 'water_heater' || d === 'climate') { const on = s === 'off'; return { domain: d, service: on ? 'turn_on' : 'turn_off', target }; }
  return null;
}

export const groupCall = (ids: string[], on: boolean): Call => ({
  domain: 'homeassistant', service: on ? 'turn_on' : 'turn_off', target: { entity_id: ids }, optimistic: ids.map((i) => [i, on ? 'on' : 'off'] as [string, string]),
});

/** An alarm panel state a hold would disarm (arming is always a single tap). */
export const alarmDisarmable = (s?: string) => !!s && (s.startsWith('armed') || s === 'triggered');

const RISKY_COVER = new Set(['garage', 'gate', 'door']);
/** A hold is needed when the entity is listed (the `confirm_hold` list, or by default every lock and every
 *  garage/gate/door cover) AND the action a tap would run right now is the risky one (unlock / open).
 *  Deriving it from `toggleCall` keeps the button's label, its hold, and what actually runs in agreement
 *  (e.g. a cover that is `closing` would be re-opened, so it needs the hold). */
export function needsHold(h: HassLike, id: string, confirm?: string[]): boolean {
  const d = domainOf(id);
  if (d === 'alarm_control_panel') return alarmDisarmable(val(h, id));   // disarming always needs the hold
  const listed = confirm ? confirm.includes(id) : d === 'lock' || (d === 'cover' && RISKY_COVER.has(attr<string>(h, id, 'device_class') || ''));
  if (!listed) return false;
  const call = toggleCall(h, id);
  return !!call && ((call.domain === 'lock' && call.service === 'unlock') || (call.domain === 'cover' && call.service === 'open_cover'));
}

export async function run(h: HassLike, ov: Overrides, call: Call, now = Date.now()): Promise<void> {
  for (const [id, s] of call.optimistic || []) ov.set(id, s, h.states[id], now);
  try {
    await h.callService(call.domain, call.service, call.data || {}, call.target);
  } catch (err) {
    for (const [id] of call.optimistic || []) ov.delete(id);
    throw err;
  }
}
