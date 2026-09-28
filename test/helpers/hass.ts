import type { HassEntity, HassLike, EntityRegistryDisplay } from '../../src/types';
import mini from '../fixtures/mini-house.json';

type In = Partial<HassEntity> & { entity_id: string; state: string };
export function makeHass(list: In[], opts: {
  areas?: Record<string, string>;                         // area_id -> name
  entities?: Record<string, Partial<EntityRegistryDisplay>>;
  devices?: Record<string, string | null>;                // device_id -> area_id
} = {}) {
  const t = '2026-09-27T12:00:00Z';
  const states: Record<string, HassEntity> = {};
  for (const e of list) states[e.entity_id] = { attributes: {}, last_changed: t, last_updated: t, ...e } as HassEntity;
  const calls: Array<[string, string, any, any]> = [];
  const ws: any[] = [];
  const h: HassLike & { calls: typeof calls; ws: any[] } = {
    states,
    entities: Object.fromEntries(Object.entries(opts.entities || {}).map(([id, r]) => [id, { entity_id: id, ...r }])),
    devices: Object.fromEntries(Object.entries(opts.devices || {}).map(([id, area_id]) => [id, { id, area_id }])),
    areas: Object.fromEntries(Object.entries(opts.areas || {}).map(([area_id, name]) => [area_id, { area_id, name }])),
    connected: true,
    calls, ws,
    callService: async (d, s, data, target) => { calls.push([d, s, data, target]); },
    callWS: async <T>(msg: Record<string, unknown>) => { ws.push(msg); return {} as T; },
    connection: { subscribeMessage: async () => () => {} },
    hassUrl: (p = '') => `http://ha.test${p}`,
  };
  return h;
}

export const miniHouse = () => makeHass(mini.states as any, { areas: mini.areas, entities: mini.entities as any, devices: mini.devices });
