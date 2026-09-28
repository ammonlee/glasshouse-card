import type { GlasshouseConfig } from './types';
import type { HassLike } from '../types';

export interface Problem { path: string; message: string }
const WALLPAPERS = ['dusk', 'aurora', 'ember'];
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

type Shape = 'map' | 'list' | 'ids' | 'maps' | 'refs' | 'str|ids' | 'str|refs';
/** Every documented nested list/mapping. `a[]` walks each item of list `a`. Checked only where the parent
 *  has the right shape (a wrong parent is already reported), so one mistake gives one error. */
const SHAPES: Array<[string, Shape]> = [
  ['people', 'list'], ['rooms', 'list'], ['automations', 'ids'], ['confirm_hold', 'ids'],
  ['alerts', 'map'], ['alerts.safety', 'refs'], ['alerts.nudge', 'refs'],
  ['home', 'map'], ['home.doorbell', 'map'], ['home.chores', 'map'], ['home.laundry', 'map'], ['home.calendar', 'str|refs'],
  ['security', 'map'], ['security.cameras', 'refs'], ['security.locks', 'ids'], ['security.covers', 'ids'], ['security.sensors', 'ids'],
  ['rooms[].include', 'ids'], ['rooms[].exclude', 'ids'],
  ['climate', 'map'], ['climate.rooms', 'maps'], ['climate.rooms[].vents', 'ids'], ['climate.air', 'map'], ['climate.toggles', 'ids'],
  ['garage', 'map'], ['garage.cars', 'maps'], ['garage.energy', 'map'], ['garage.energy.chargers', 'ids'],
  ['family', 'map'], ['family.vacuums', 'ids'], ['family.printer', 'ids'], ['family.sprinklers', 'map'], ['family.sprinklers.zones', 'ids'],
];
const isRef = (x: unknown) => typeof x === 'string' || (isObj(x) && typeof x.entity === 'string');

/** Yields [path, value] for every present value at a SHAPES path (`a[]` segments fan out over list items). */
function at(root: Record<string, unknown>, spec: string): Array<[string, unknown]> {
  let cur: Array<[string, unknown]> = [['', root]];
  for (const seg of spec.split('.')) {
    const each = seg.endsWith('[]'), key = each ? seg.slice(0, -2) : seg;
    const next: Array<[string, unknown]> = [];
    for (const [p, v] of cur) {
      if (!isObj(v) || v[key] == null) continue;
      const path = p ? `${p}.${key}` : key;
      if (!each) next.push([path, v[key]]);
      else if (Array.isArray(v[key])) (v[key] as unknown[]).forEach((x, i) => next.push([`${path}[${i}]`, x]));
    }
    cur = next;
  }
  return cur;
}

export function validateConfig(c: unknown): { errors: Problem[] } {
  const errors: Problem[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });
  if (!isObj(c)) { err('', 'config must be an object'); return { errors }; }
  if (c.wallpaper != null && !WALLPAPERS.includes(c.wallpaper as string)) err('wallpaper', `must be one of ${WALLPAPERS.join(', ')}`);
  if (c.blur != null && typeof c.blur !== 'boolean') err('blur', 'must be true or false');
  for (const [spec, shape] of SHAPES) {
    for (const [path, v] of at(c, spec)) {
      if (shape === 'map') { if (!isObj(v)) err(path, 'must be a mapping'); continue; }
      if (shape === 'str|ids') { if (typeof v !== 'string' && !(Array.isArray(v) && v.every((x) => typeof x === 'string'))) err(path, 'must be an entity id or a list of entity ids'); continue; }
      if (shape === 'str|refs') {
        if (typeof v === 'string') continue;
        if (!Array.isArray(v)) { err(path, 'must be an entity id or a list'); continue; }
        v.forEach((x, i) => { if (!isRef(x)) err(`${path}[${i}]`, 'must be an entity id or a mapping with entity'); });
        continue;
      }
      if (!Array.isArray(v)) { err(path, 'must be a list'); continue; }
      v.forEach((x, i) => {
        if (shape === 'ids' && typeof x !== 'string') err(`${path}[${i}]`, 'must be an entity id');
        if (shape === 'maps' && !isObj(x)) err(`${path}[${i}]`, 'must be a mapping');
        if (shape === 'refs' && !isRef(x)) err(`${path}[${i}]`, 'must be an entity id or a mapping with entity');
      });
    }
  }
  if (Array.isArray(c.people)) (c.people as unknown[]).forEach((p, i) => { if (!isObj(p) || typeof p.person !== 'string') err(`people[${i}].person`, 'is required'); });
  if (Array.isArray(c.rooms)) (c.rooms as unknown[]).forEach((r, i) => { if (!isObj(r) || typeof r.area !== 'string') err(`rooms[${i}].area`, 'is required'); });
  return { errors };
}

/** Every [path, entity_id] pair in the config. */
export function entityRefs(c: GlasshouseConfig): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (v: unknown, path: string, key?: string) => {
    if (typeof v === 'string') { if (/^[a-z_]+\.[a-z0-9_]+$/.test(v) && key !== 'type' && key !== 'area') out.push([path, v]); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`, key)); return; }
    if (isObj(v)) for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k, k);
  };
  walk(c, '');
  return out;
}

export const collectEntityIds = (c: GlasshouseConfig) => [...new Set(entityRefs(c).map(([, id]) => id))];

export const missingEntities = (h: HassLike, c: GlasshouseConfig): Problem[] =>
  entityRefs(c).filter(([, id]) => !h.states[id]).map(([path, id]) => ({ path, message: `missing: ${id}` }));
