import '../src/glasshouse-card';
import { miniHouse } from './helpers/hass';
import { session, dayString } from '../src/model/chores';

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
    const ses = session(new Date());   // twice-a-day chores carry the current session
    expect(adds).toEqual([`June · Unload dishes · ${ses}`, `Beth · Load dishes · ${ses}`, `Ben · Garbage out · ${ses}`]);
    expect(items.length).toBe(3);
    document.body.removeChild(el);
  });

  it('seeds each session exactly once when a sync is still in flight as the clock crosses noon', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });   // only the clock; real timers keep the sync loop running
    try {
      vi.setSystemTime(new Date(2026, 8, 28, 11, 59, 59));
      const due = '2026-09-28';
      let todoCb: (m: any) => void = () => {};
      let items: any[] = [];
      const adds: string[] = [], addedAt: number[] = [], removed: string[] = [];
      let release!: () => void;
      const gate = new Promise<void>((r) => { release = r; });
      const conn = { subscribeMessage: async (cb: any, msg: any) => { if (msg.type === 'todo/item/subscribe') todoCb = cb; return () => {}; } };
      const keys = ['unload', 'load', 'garbage'];
      const at = new Date().toISOString();
      const base = miniHouse();
      const h: any = {
        ...base, connection: conn,
        states: { ...base.states, 'sensor.roster': { entity_id: 'sensor.roster', state: 'ok', attributes: { assignments: { unload: 'June', load: 'Beth', garbage: 'Ben' }, morning_keys: keys, evening_keys: keys }, last_changed: at, last_updated: at } },
        callService: async (d: string, s: string, data: any) => {
          if (d !== 'todo') return;
          if (s === 'remove_item') { removed.push(...data.item); items = items.filter((i) => !data.item.includes(i.uid)); }
          if (s === 'add_item') {
            adds.push(data.item); addedAt.push(new Date().getHours());
            items = [...items, { uid: `u${items.length}`, summary: data.item, status: 'needs_action', due: data.due_date }];
          }
          todoCb({ items });                    // push lands before the call result
          await gate;                           // the first call only resolves after the session flip
        },
      };
      const el = document.createElement('glasshouse-card') as any;
      el.setConfig({ type: 'custom:glasshouse-card', home: { chores: { todo: 'todo.chores', roster: 'sensor.roster' } } });
      el.hass = h;
      document.body.appendChild(el);
      await el.updateComplete;
      await Promise.resolve(); await Promise.resolve();
      todoCb({ items: [] });                    // 11:59:59 -> morning plan starts, first add_item hangs
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
      expect(adds).toEqual(['June · Unload dishes · Morning']);
      vi.setSystemTime(new Date(2026, 8, 28, 12, 0, 1));
      release();
      for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
      todoCb({ items });                        // updated list push
      el.hass = { ...h };
      el.hass = { ...h };
      for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
      const morning = ['June · Unload dishes · Morning', 'Beth · Load dishes · Morning', 'Ben · Garbage out · Morning'];
      const evening = morning.map((m) => m.replace('Morning', 'Evening'));
      for (const m of [...morning, ...evening]) expect(adds.filter((a) => a === m)).toHaveLength(1);
      expect(new Set(adds).size).toBe(adds.length);
      expect(adds.length).toBe(6);
      for (const e of evening) expect(addedAt[adds.indexOf(e)]).toBe(12);   // evening items only after the flip
      expect(removed).toEqual([]);
      expect(items.filter((i) => morning.includes(i.summary))).toHaveLength(3);
      expect(items.every((i) => i.due === due)).toBe(true);
      document.body.removeChild(el);
    } finally {
      vi.useRealTimers();
    }
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
    expect(adds).toEqual([`June · Unload dishes · ${session(new Date())}`]);
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

  it('throws confetti when the last chore is checked off, and not on load', async () => {
    const el = await mount({ type: 'custom:glasshouse-card', home: { chores: { todo: 'todo.chores' } } });
    el._itemsLoaded = true;
    el._x.todoItems = [{ uid: 'a1', summary: 'June · Unload dishes', status: 'completed' }, { uid: 'a2', summary: 'Max · Garbage out', status: 'needs_action' }];
    el._rev++; await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[data-test=confetti]')).toBeNull();
    el._x.todoItems = el._x.todoItems.map((t: any) => ({ ...t, status: 'completed' }));
    el._rev++; await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('[data-test=confetti] i').length).toBeGreaterThan(50);

    const fresh = await mount({ type: 'custom:glasshouse-card', home: { chores: { todo: 'todo.chores' } } });
    fresh._itemsLoaded = true;
    fresh._x.todoItems = [{ uid: 'a1', summary: 'June · Unload dishes', status: 'completed' }];
    fresh._rev++; await fresh.updateComplete;
    expect(fresh.shadowRoot!.querySelector('[data-test=confetti]')).toBeNull();
  });

  it('replays the confetti when the party popper is tapped', async () => {
    const el = await mount({ type: 'custom:glasshouse-card', home: { chores: { todo: 'todo.chores' } } });
    el._x.todoItems = [{ uid: 'a1', summary: 'June · Unload dishes', status: 'completed' }];
    el._rev++; await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[data-test=confetti]')).toBeNull();
    (el.shadowRoot!.querySelector('[data-test=celebrate]') as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[data-test=confetti]')).not.toBeNull();
  });

  it('loads the chore log from HA, celebrates a 7-day streak, and saves the log', async () => {
    const eve = new Date(); eve.setHours(19, 0, 0, 0);   // all-day chores count in the evening session
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(eve);
    const d = (n: number) => { const x = new Date(); x.setDate(x.getDate() - n); return dayString(x); };
    const past: Record<string, Record<string, [number, number]>> = {};
    for (let n = 1; n <= 6; n++) past[`${d(n)}-Evening`] = { June: [1, 1] };
    const sent: any[] = [];
    const h = miniHouse() as any;
    h.callWS = async (msg: any) => { sent.push(msg); return msg.type === 'frontend/get_user_data' ? { value: { v: 1, s: past } } : {}; };
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', home: { chores: { todo: 'todo.chores' } } });
    el.hass = h;
    document.body.appendChild(el);
    await el.updateComplete; await new Promise((r) => setTimeout(r, 0)); await el.updateComplete;
    expect(el._x.choreLog.s).toEqual(past);

    vi.useRealTimers(); vi.useFakeTimers(); vi.setSystemTime(eve);
    try {
      el._itemsLoaded = true;
      el._x.todoItems = [{ uid: 'a1', summary: 'June · Laundry', status: 'needs_action' }];
      el._rev++; await el.updateComplete;
      el._x.todoItems = [{ uid: 'a1', summary: 'June · Laundry', status: 'completed' }];
      el._rev++; await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.confetti-banner')?.textContent).toContain('June hit a 7-day streak');
      vi.advanceTimersByTime(3100);
    } finally { vi.useRealTimers(); }
    const save = sent.filter((m) => m.type === 'frontend/set_user_data').at(-1);
    expect(save.key).toBe('glasshouse_chore_log');
    expect(Object.keys(save.value.s)).toHaveLength(7);
  });
});
