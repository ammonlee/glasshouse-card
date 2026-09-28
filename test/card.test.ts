import '../src/glasshouse-card';
import { miniHouse } from './helpers/hass';

async function mount(config: any) {
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig(config);
  el.hass = miniHouse();
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('<glasshouse-card>', () => {
  it('throws on structural config errors', () => {
    const el = document.createElement('glasshouse-card') as any;
    expect(() => el.setConfig({ type: 'custom:glasshouse-card', rooms: 'nope' })).toThrow(/rooms/);
  });
  it('renders the header capsule and rail tabs', async () => {
    const el = await mount({ type: 'custom:glasshouse-card', alerts: { nudge: ['lock.back_door'] }, rooms: [{ area: 'kitchen' }] });
    const root = el.shadowRoot!;
    expect(root.querySelector('.alert-cap.amber')?.textContent).toContain('Back Door unlocked');
    expect([...root.querySelectorAll('.rail .nav span')].map((s) => s.textContent)).toEqual(['Home', 'Rooms']);
  });
  it('switches tabs from the rail', async () => {
    const el = await mount({ type: 'custom:glasshouse-card', rooms: [{ area: 'kitchen', floor: 'Main Floor' }] });
    (el.shadowRoot!.querySelectorAll('.rail .nav')[1] as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Main Floor');
  });
  it('act() calls the right service', async () => {
    const el = await mount({ type: 'custom:glasshouse-card' });
    await el.act('switch.kitchen_lights');
    expect(el.hass.calls.at(-1)).toEqual(['switch', 'turn_off', {}, { entity_id: 'switch.kitchen_lights' }]);
  });
  it('shows a toast when a service call fails', async () => {
    const el = await mount({ type: 'custom:glasshouse-card' });
    el.hass = { ...el.hass, callService: async () => { throw { message: 'Jammed' }; } };
    await el.act('lock.back_door');
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.toast')?.textContent).toContain('Jammed');
  });

  it('subscribes exactly once when hass is set before the element is attached', async () => {
    const calls: string[] = [];
    const conn = { subscribeMessage: async (_cb: any, msg: any) => { calls.push(msg.type); return () => {}; } };
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', weather: 'weather.forecast_home', home: { chores: { todo: 'todo.chores' } } });
    el.hass = { ...miniHouse(), connection: conn };
    expect(el.isConnected).toBe(false);
    document.body.appendChild(el);
    await el.updateComplete;
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(calls.filter((t) => t === 'weather/subscribe_forecast').length).toBe(1);
    expect(calls.filter((t) => t === 'todo/item/subscribe').length).toBe(1);
    document.body.removeChild(el);
  });

  it('unsubscribes a subscription that resolves after disconnect', async () => {
    let resolveSub!: (u: () => void) => void;
    const unsub = vi.fn();
    const conn = { subscribeMessage: () => new Promise<() => void>((res) => { resolveSub = res; }) };
    const el = await mount({ type: 'custom:glasshouse-card', weather: 'weather.forecast_home' });
    el.hass = { ...el.hass, connection: conn };
    // force a fresh subscribe cycle against the new (pending) connection
    (el as any)._stopSubscriptions();
    (el as any)._startSubscriptions();
    document.body.removeChild(el);
    resolveSub(unsub);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(unsub).toHaveBeenCalled();
  });

  it('syncs the roster to the to-do list once per subscription push, not on every hass update', async () => {
    const addCalls: any[] = [];
    let todoCb: (m: any) => void = () => {};
    const conn = {
      subscribeMessage: async (cb: any, msg: any) => {
        if (msg.type === 'todo/item/subscribe') todoCb = cb;
        return () => {};
      },
    };
    const base = miniHouse();
    const h = {
      ...base,
      states: { ...base.states, 'sensor.roster': { entity_id: 'sensor.roster', state: 'ok', attributes: { assignments: { unload: 'June' }, morning_keys: ['unload'] }, last_changed: new Date().toISOString(), last_updated: new Date().toISOString() } },
      connection: conn,
      callService: async (d: string, s: string, data: any) => { if (d === 'todo' && s === 'add_item') addCalls.push(data); },
    };
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', home: { chores: { todo: 'todo.chores', roster: 'sensor.roster' } } });
    el.hass = h;
    document.body.appendChild(el);
    await el.updateComplete;
    await Promise.resolve(); await Promise.resolve();
    todoCb({ items: [] });                      // initial push: roster item missing -> add_item
    await el.updateComplete;
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(addCalls.length).toBe(1);
    el.hass = { ...h };                         // a second hass update before the next push
    await el.updateComplete;
    await Promise.resolve(); await Promise.resolve();
    expect(addCalls.length).toBe(1);
    document.body.removeChild(el);
  });

  it('stops retrying a chore sync that keeps failing', async () => {
    const addCalls: any[] = [];
    let todoCb: (m: any) => void = () => {};
    const conn = {
      subscribeMessage: async (cb: any, msg: any) => {
        if (msg.type === 'todo/item/subscribe') todoCb = cb;
        return () => {};
      },
    };
    const base = miniHouse();
    const h = {
      ...base,
      states: { ...base.states, 'sensor.roster': { entity_id: 'sensor.roster', state: 'ok', attributes: { assignments: { unload: 'June' }, morning_keys: ['unload'] }, last_changed: new Date().toISOString(), last_updated: new Date().toISOString() } },
      connection: conn,
      callService: async (d: string, s: string) => { if (d === 'todo' && s === 'add_item') { addCalls.push(1); throw new Error('no due_date support'); } },
    };
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', home: { chores: { todo: 'todo.chores', roster: 'sensor.roster' } } });
    el.hass = h;
    document.body.appendChild(el);
    await el.updateComplete;
    await Promise.resolve(); await Promise.resolve();
    todoCb({ items: [] });
    await el.updateComplete;
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(addCalls.length).toBe(1);
    el.hass = { ...h };
    el.hass = { ...h };
    await el.updateComplete;
    await Promise.resolve(); await Promise.resolve();
    expect(addCalls.length).toBe(1);
    document.body.removeChild(el);
  });

  it('seeds each roster chore exactly once when the to-do push arrives before the add_item result (Important 2)', async () => {
    const today = new Date();
    const due = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let todoCb: (m: any) => void = () => {};
    let items: any[] = [];
    const adds: string[] = [];
    const conn = { subscribeMessage: async (cb: any, msg: any) => { if (msg.type === 'todo/item/subscribe') todoCb = cb; return () => {}; } };
    const keys = ['unload', 'load', 'garbage'];
    const base = miniHouse();
    const h: any = {
      ...base,
      states: { ...base.states, 'sensor.roster': { entity_id: 'sensor.roster', state: 'ok', attributes: { assignments: { unload: 'June', load: 'Beth', garbage: 'Ben' }, morning_keys: keys, evening_keys: keys }, last_changed: today.toISOString(), last_updated: today.toISOString() } },
      connection: conn,
      callService: async (d: string, s: string, data: any) => {
        if (d === 'todo' && s === 'add_item') {
          adds.push(data.item);
          items = [...items, { uid: `u${items.length}`, summary: data.item, status: 'needs_action', due: data.due_date }];
          todoCb({ items });                     // HA delivers the push before the call_service result
        }
      },
    };
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', home: { chores: { todo: 'todo.chores', roster: 'sensor.roster' } } });
    el.hass = h;
    document.body.appendChild(el);
    await el.updateComplete;
    await Promise.resolve(); await Promise.resolve();
    todoCb({ items: [] });
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
    el.hass = { ...h };
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
    expect(adds).toEqual(['June · Unload dishes', 'Beth · Load dishes', 'Ben · Garbage out']);
    expect(items.length).toBe(3);
    document.body.removeChild(el);
  });

  it('does not seed from a roster that has not updated today (Minor g)', async () => {
    const adds: string[] = [];
    let todoCb: (m: any) => void = () => {};
    const conn = { subscribeMessage: async (cb: any, msg: any) => { if (msg.type === 'todo/item/subscribe') todoCb = cb; return () => {}; } };
    const yesterday = new Date(Date.now() - 36 * 3600_000).toISOString();
    const base = miniHouse();
    const roster = (t: string) => ({ entity_id: 'sensor.roster', state: 'ok', attributes: { assignments: { unload: 'June' }, morning_keys: ['unload'], evening_keys: ['unload'] }, last_changed: t, last_updated: t });
    const h: any = {
      ...base, connection: conn,
      states: { ...base.states, 'sensor.roster': roster(yesterday) },
      callService: async (d: string, s: string, data: any) => { if (d === 'todo' && s === 'add_item') adds.push(data.item); },
    };
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', home: { chores: { todo: 'todo.chores', roster: 'sensor.roster' } } });
    el.hass = h;
    document.body.appendChild(el);
    await el.updateComplete;
    await Promise.resolve(); await Promise.resolve();
    todoCb({ items: [] });
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
    expect(adds).toEqual([]);
    el.hass = { ...h, states: { ...h.states, 'sensor.roster': roster(new Date().toISOString()) } };
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
    expect(adds).toEqual(['June · Unload dishes']);
    document.body.removeChild(el);
  });

  it('recomputes the relevant ids when the entity registry changes (Minor a)', async () => {
    const el = await mount({ type: 'custom:glasshouse-card', rooms: [{ area: 'kitchen' }] });
    const h0 = el.hass;
    const withNew = { ...h0, entities: { ...h0.entities, 'light.new_lamp': { entity_id: 'light.new_lamp', area_id: 'kitchen' } },
      states: { ...h0.states, 'light.new_lamp': { entity_id: 'light.new_lamp', state: 'off', attributes: {}, last_changed: '', last_updated: '' } } };
    el.hass = withNew; await el.updateComplete;
    expect(el._ids.has('light.new_lamp')).toBe(true);
    const rev = el._rev;
    el.hass = { ...withNew, states: { ...withNew.states, 'light.new_lamp': { ...withNew.states['light.new_lamp'], state: 'on' } } };
    expect(el._rev).toBeGreaterThan(rev);
  });

  it('rolls back an optimistic chore toggle when update_item fails', async () => {
    const el = await mount({ type: 'custom:glasshouse-card', home: { chores: { todo: 'todo.chores' } } });
    (el as any)._x.todoItems = [{ uid: 'a1', summary: 'June · Unload dishes', status: 'needs_action' }];
    el.hass = { ...el.hass, callService: async () => { throw { message: 'offline' }; } };
    await el.toggleChore('a1', 'June · Unload dishes', false);   // optimistically flips to 'completed'
    expect((el as any)._x.todoItems[0].status).toBe('needs_action');
  });
});
