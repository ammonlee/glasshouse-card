import type { HassLike } from '../types';
import type { RoomCfg } from '../config/types';
import { attr, exists, fname, val, domainOf } from './util';

export interface LightVm { entity: string; name: string; on: boolean; icon: string }
export interface RoomVm {
  id: string; name: string; icon: string; floor: string; temp: string; lights: LightVm[];
  fanOn: boolean | null; curtain: 'open' | 'closed' | null; occupied: boolean | null; camera?: string;
  onCount: number; stateText: string; tone: 'light' | 'off' | 'alert'; missing: string[];
}

const NOT_LIGHT = /fan|valve|power|sentry|charger|dock|schedule|zone/i;
const CURTAIN = new Set(['curtain', 'shade', 'blind']);

export function areaOf(h: HassLike, id: string): string | null {
  const e = h.entities[id];
  if (!e) return null;
  return e.area_id ?? (e.device_id ? h.devices[e.device_id]?.area_id ?? null : null);
}

export type Discovered = { lights: string[]; fans: string[]; covers: string[] };
type Memo = WeakMap<object, WeakMap<RoomCfg, Discovered>>;
const memo = new WeakMap<object, Memo>();
/** Memoized per (h.entities, h.devices, room config) reference: HA replaces those objects only when the
 *  registries change, so a states-only hass update (the common case) reuses the last scan. Friendly-name /
 *  device_class changes without a registry change are not picked up until the next registry update. */
export function discover(h: HassLike, room: RoomCfg): Discovered {
  let byDev = memo.get(h.entities);
  if (!byDev) memo.set(h.entities, (byDev = new WeakMap()));
  let byRoom = byDev.get(h.devices);
  if (!byRoom) byDev.set(h.devices, (byRoom = new WeakMap()));
  let hit = byRoom.get(room);
  if (!hit) byRoom.set(room, (hit = scan(h, room)));
  return hit;
}

function scan(h: HassLike, room: RoomCfg): Discovered {
  const lights: string[] = [], fans: string[] = [], covers: string[] = [];
  const ex = new Set(room.exclude || []);
  const consider = (id: string, forced: boolean) => {
    if (ex.has(id)) return;
    const reg = h.entities[id];
    if (!forced && (reg?.hidden || reg?.entity_category)) return;
    const d = domainOf(id), name = fname(h, id);
    if (d === 'light') lights.push(id);
    else if (d === 'switch') {
      if (/light/i.test(name) || !NOT_LIGHT.test(`${id} ${name}`)) lights.push(id);
      else if (/fan/i.test(`${id} ${name}`)) fans.push(id);
    } else if (d === 'fan') fans.push(id);
    else if (d === 'cover' && CURTAIN.has(attr<string>(h, id, 'device_class') || '')) covers.push(id);
  };
  for (const id of Object.keys(h.entities)) if (areaOf(h, id) === room.area) consider(id, false);
  for (const id of room.include || []) consider(id, true);
  const uniq = (a: string[]) => [...new Set(a)].sort();
  return { lights: uniq(lights), fans: uniq(fans), covers: uniq(covers) };
}

const lightIcon = (name: string) => (/ceiling|overhead|main/i.test(name) ? 'lamp-ceiling' : /lamp|reading/i.test(name) ? 'lamp' : /fan/i.test(name) ? 'fan' : 'lightbulb');

export function rooms(h: HassLike, cfg: RoomCfg[] = [], alertEntities: Set<string> = new Set()): RoomVm[] {
  return cfg.map((c) => {
    const found = discover(h, c);
    const lights = found.lights.filter((id) => exists(h, id)).map((id) => {
      const name = fname(h, id).replace(/ switch$/i, '');
      return { entity: id, name, on: val(h, id) === 'on', icon: lightIcon(name) };
    });
    const onCount = lights.filter((l) => l.on).length, n = lights.length;
    const fanOn = found.fans.length ? found.fans.some((f) => val(h, f) === 'on') : null;
    const cov = found.covers.find((x) => exists(h, x));
    const curtain = cov ? (val(h, cov) === 'open' ? 'open' : 'closed') : null;
    let stateText = !n ? 'No lights' : onCount ? (n > 2 ? `${onCount} of ${n} on` : `${onCount} on`) : n > 1 ? 'All off' : 'Off';
    if (fanOn) stateText += ' · fan on';
    if (curtain) stateText += ` · curtain ${curtain}`;
    const t = c.climate ? attr<number>(h, c.climate, 'current_temperature') : null;
    const all = [...found.lights, ...found.fans, ...found.covers];
    const missing = [c.climate, c.camera, c.occupancy, ...(c.include || [])].filter((id): id is string => !!id && !h.states[id]);
    return {
      id: c.area, name: c.name || h.areas[c.area]?.name || c.area, icon: c.icon || 'lamp', floor: c.floor || 'Home',
      temp: t != null ? `${Math.round(t)}°` : '—', lights, fanOn, curtain,
      occupied: c.occupancy ? val(h, c.occupancy) === 'on' : null, camera: c.camera,
      onCount, stateText, tone: all.some((id) => alertEntities.has(id)) ? 'alert' : onCount ? 'light' : 'off', missing,
    };
  });
}

export function floors(list: RoomVm[]) {
  const out: Array<{ floor: string; rooms: RoomVm[]; onCount: number }> = [];
  for (const r of list) {
    let f = out.find((x) => x.floor === r.floor);
    if (!f) out.push((f = { floor: r.floor, rooms: [], onCount: 0 }));
    f.rooms.push(r); f.onCount += r.onCount;
  }
  return out;
}

export const allLightIds = (list: RoomVm[]) => [...new Set(list.flatMap((r) => r.lights.map((l) => l.entity)))];
