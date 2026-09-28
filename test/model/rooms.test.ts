import { miniHouse, makeHass } from '../helpers/hass';
import { discover, rooms, floors, areaOf } from '../../src/model/rooms';

describe('discover', () => {
  const h = miniHouse();
  it('finds lights by area and by device area, skipping hidden and non-light switches', () => {
    expect(discover(h, { area: 'kitchen' }).lights).toEqual(['switch.island_lights_5', 'switch.kitchen_lights', 'switch.unknown_switch_3']);
    expect(discover(h, { area: 'june_s_room' }).lights).toEqual(['light.gold_dimmer_2', 'switch.gold_reading_lights_2']);
    expect(discover(h, { area: 'garage' }).lights).toEqual(['switch.garage_main_light_2']);
    expect(areaOf(h, 'light.gold_dimmer_2')).toBe('june_s_room');
  });
  it('applies include and exclude', () => {
    expect(discover(h, { area: 'kitchen', exclude: ['switch.unknown_switch_3'], include: ['light.gold_dimmer_2'] }).lights)
      .toEqual(['light.gold_dimmer_2', 'switch.island_lights_5', 'switch.kitchen_lights']);
  });
});

describe('discover memo (Minor a)', () => {
  it('is not recomputed when only states change; is when the registry or room config changes', () => {
    const h = miniHouse(), room = { area: 'kitchen' };
    const first = discover(h, room);
    const statesOnly = { ...h, states: { ...h.states, 'switch.kitchen_lights': { ...h.states['switch.kitchen_lights'], state: 'off' } } };
    expect(discover(statesOnly, room)).toBe(first);
    expect(discover({ ...h, entities: { ...h.entities } }, room)).not.toBe(first);
    expect(discover({ ...h, devices: { ...h.devices } }, room)).not.toBe(first);
    expect(discover(h, { area: 'kitchen' })).not.toBe(first);
    expect(discover(h, { area: 'kitchen' })).toEqual(first);
  });
});

describe('rooms', () => {
  const h = makeHass([
    { entity_id: 'switch.a', state: 'on', attributes: { friendly_name: 'Main Light' } },
    { entity_id: 'switch.b', state: 'off', attributes: { friendly_name: 'Reading Lamp' } },
    { entity_id: 'switch.c', state: 'off', attributes: { friendly_name: 'Closet' } },
    { entity_id: 'fan.f', state: 'on' },
    { entity_id: 'cover.curtain', state: 'open', attributes: { device_class: 'curtain' } },
    { entity_id: 'climate.r', state: 'cool', attributes: { current_temperature: 71.6 } },
  ], {
    areas: { bed: 'Blue Room', empty: 'Attic' },
    entities: { 'switch.a': { area_id: 'bed' }, 'switch.b': { area_id: 'bed' }, 'switch.c': { area_id: 'bed' }, 'fan.f': { area_id: 'bed' }, 'cover.curtain': { area_id: 'bed' } },
  });
  it('builds tiles with state text, temperature and icons', () => {
    const [r] = rooms(h, [{ area: 'bed', floor: 'Basement', climate: 'climate.r', icon: 'bed' }]);
    expect(r).toMatchObject({ id: 'bed', name: 'Blue Room', floor: 'Basement', temp: '72°', onCount: 1, tone: 'light', stateText: '1 of 3 on · fan on · curtain open', fanOn: true, curtain: 'open' });
    expect(r.lights.map((l) => l.icon)).toEqual(['lamp-ceiling', 'lamp', 'lightbulb']);
  });
  it('flags alert rooms and empty rooms', () => {
    const [r, e] = rooms(h, [{ area: 'bed' }, { area: 'empty', name: 'Attic' }], new Set(['cover.curtain']));
    expect(r.tone).toBe('alert');
    expect(e).toMatchObject({ stateText: 'No lights', tone: 'off', temp: '—' });
  });
  it('groups floors in first-seen order', () => {
    const f = floors(rooms(h, [{ area: 'bed', floor: 'Basement' }, { area: 'empty' }]));
    expect(f.map((x) => [x.floor, x.onCount])).toEqual([['Basement', 1], ['Home', 0]]);
  });
});
