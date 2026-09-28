import { miniHouse, makeHass } from '../helpers/hass';
import { buildModel, relevantIds, changed } from '../../src/model/index';

const extras = { todoItems: [], calendar: [], timeline: [], laundryAck: null };

describe('buildModel', () => {
  it('assembles a model and only enables tabs with content', () => {
    const h = miniHouse();
    const m = buildModel(h, {
      type: 'custom:glasshouse-card', weather: 'weather.forecast_home',
      alerts: { nudge: ['lock.back_door'] },
      rooms: [{ area: 'kitchen', floor: 'Main Floor' }],
      home: { thermostat: 'climate.532583116183', chores: { todo: 'todo.chores' } },
    }, extras, new Date('2026-09-27T18:00:00'));
    expect(m.tabs).toEqual(['home', 'rooms', 'climate']);
    expect(m.capsule.kind).toBe('amber');
    expect(m.rooms[0].onCount).toBe(2);
    expect(m.thermostat?.mode).toBe('cool');
    expect(m.night).toBe(false);
  });
  it('flags missing entities', () => {
    const m = buildModel(miniHouse(), { type: 'x', home: { thermostat: 'climate.nope' } }, extras, new Date());
    expect(m.missing.get('climate.nope')).toBe('missing: climate.nope');
  });
  it('reads night mode', () => {
    const h = makeHass([{ entity_id: 'input_boolean.night', state: 'on' }]);
    expect(buildModel(h, { type: 'x', night_mode: 'input_boolean.night' }, extras, new Date()).night).toBe(true);
  });
});

describe('relevance', () => {
  it('includes discovered room entities and ignores unrelated changes', () => {
    const a = miniHouse();
    const ids = relevantIds(a, { type: 'x', rooms: [{ area: 'kitchen' }] });
    expect(ids.has('switch.kitchen_lights')).toBe(true);
    const b = { ...a, states: { ...a.states, 'sensor.kitchen_hidden': { ...a.states['sensor.kitchen_hidden'], state: '2' } } };
    expect(changed(a, b, ids)).toBe(false);
    const c = { ...a, states: { ...a.states, 'switch.kitchen_lights': { ...a.states['switch.kitchen_lights'], state: 'off' } } };
    expect(changed(a, c, ids)).toBe(true);
    expect(changed(undefined, a, ids)).toBe(true);
    expect(changed(a, { ...a, connected: false }, ids)).toBe(true);
  });
});
