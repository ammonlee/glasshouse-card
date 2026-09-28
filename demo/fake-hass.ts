import '../src/glasshouse-card';
import mini from '../test/fixtures/mini-house.json';
import { demoConfig } from './demo-config';
import { dayString } from '../src/model/chores';
import type { HassEntity, HassLike } from '../src/types';

async function loadLocalConfig() {
  try { const r = await fetch('../local/house-config.json'); if (r.ok) return await r.json(); } catch { /* none */ }
  return null;
}

async function loadHouse() {
  try { const r = await fetch('./house.json'); if (r.ok) return await r.json(); } catch { /* fall back */ }
  return mini;
}

const flip: Record<string, [string, string]> = { lock: ['locked', 'unlocked'], cover: ['closed', 'open'] };

interface TodoItem { uid: string; summary: string; status: 'needs_action' | 'completed'; due?: string }

function makeFake(house: any): HassLike {
  const now = new Date().toISOString();
  const states: Record<string, HassEntity> = {};
  for (const s of house.states) states[s.entity_id] = { last_changed: now, last_updated: now, attributes: {}, ...s };

  // In-memory chores list for the `todo.chores` entity, so the chores tab works end to end.
  // `due` uses the local date (matching `dayString(new Date())` in src/model/chores.ts, which is what the
  // card compares against) rather than the UTC date from `toISOString()`.
  const today = dayString(new Date());
  let todoItems: TodoItem[] = [
    { uid: 'demo-1', summary: 'June · Unload dishes', status: 'needs_action', due: today },
    { uid: 'demo-2', summary: 'Bennett · Take out trash', status: 'completed', due: today },
  ];
  let nextUid = 3;
  let todoCb: ((m: { items: TodoItem[] }) => void) | null = null;
  const pushTodo = () => todoCb?.({ items: todoItems });

  const hass: any = {
    states, connected: true,
    areas: Object.fromEntries(Object.entries(house.areas).map(([id, name]) => [id, { area_id: id, name }])),
    devices: Object.fromEntries(Object.entries(house.devices).map(([id, area_id]) => [id, { id, area_id }])),
    entities: Object.fromEntries(Object.entries(house.entities).map(([id, e]: any) => [id, { entity_id: id, ...e }])),
    hassUrl: (p = '') => p,
    callWS: async (msg: any) => {
      console.log('callWS', msg);
      if (msg.type === 'call_service' && msg.domain === 'calendar' && msg.service === 'get_events') {
        const entity = msg.target?.entity_id;
        return { response: { [entity]: { events: [] } } };
      }
      return { response: {} };
    },
    connection: {
      subscribeMessage: async (cb: any, msg: any) => {
        if (msg.type === 'todo/item/subscribe') {
          todoCb = cb;
          cb({ items: todoItems });
        } else if (msg.type === 'weather/subscribe_forecast') {
          cb({ forecast: [{ temperature: 78, templow: 62 }] });
        }
        return () => { if (todoCb === cb) todoCb = null; };
      },
    },
    callService: async (domain: string, service: string, data: any, target: any) => {
      console.log('callService', domain, service, data, target);
      if (domain === 'todo') {
        if (service === 'add_item') {
          const summary = data.item as string;
          todoItems = [...todoItems, { uid: `demo-${nextUid++}`, summary, status: 'needs_action', due: data.due_date || today }];
        } else if (service === 'update_item') {
          const key = data.item as string;
          todoItems = todoItems.map((i) => (i.uid === key || i.summary === key ? { ...i, status: data.status || i.status } : i));
        } else if (service === 'remove_item') {
          const keys = ([] as string[]).concat(data.item || []);
          todoItems = todoItems.filter((i) => !keys.includes(i.uid) && !keys.includes(i.summary));
        }
        pushTodo();
        return;
      }
      const ids = ([] as string[]).concat(target?.entity_id || []);
      for (const id of ids) {
        const s = hass.states[id]; if (!s) continue;
        const d = id.split('.')[0];
        let state = s.state;
        if (service === 'turn_on') state = 'on'; else if (service === 'turn_off') state = 'off';
        else if (service === 'toggle') state = s.state === 'on' ? 'off' : 'on';
        else if (service === 'lock' || service === 'unlock') state = service === 'lock' ? flip.lock[0] : flip.lock[1];
        else if (service === 'open_cover' || service === 'close_cover') state = service === 'open_cover' ? 'open' : 'closed';
        else if (d === 'climate' && service === 'set_hvac_mode') state = data.hvac_mode;
        const attributes = d === 'climate' && service === 'set_temperature' ? { ...s.attributes, ...data } : s.attributes;
        hass.states = { ...hass.states, [id]: { ...s, state, attributes, last_changed: new Date().toISOString(), last_updated: new Date().toISOString() } };
      }
      push();
    },
  };
  let el: any;
  const push = () => { if (el) el.hass = { ...hass }; };
  (window as any).__demo = { hass, push, setEl: (e: any) => { el = e; push(); } };
  return hass;
}

(async () => {
  const house = await loadHouse();
  makeFake(house);
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig((await loadLocalConfig()) || demoConfig());
  document.getElementById('stage')!.appendChild(el);
  (window as any).__demo.setEl(el);
  (window as any).__demo.el = el;
})();
