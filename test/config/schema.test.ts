import { validateConfig, collectEntityIds, missingEntities } from '../../src/config/schema';
import { makeHass } from '../helpers/hass';

describe('validateConfig', () => {
  it('accepts a minimal config', () => {
    expect(validateConfig({ type: 'custom:glasshouse-card' }).errors).toEqual([]);
  });
  it('rejects wrong types with a path', () => {
    const { errors } = validateConfig({ type: 'custom:glasshouse-card', people: 'beth', rooms: [{ name: 'x' }], wallpaper: 'neon' });
    expect(errors.map((e) => e.path)).toEqual(expect.arrayContaining(['people', 'rooms[0].area', 'wallpaper']));
  });
  it('validates list/mapping types at every documented path (Important 7)', () => {
    const paths = (c: object) => validateConfig({ type: 'custom:glasshouse-card', ...c }).errors.map((e) => e.path).sort();
    expect(paths({ family: { vacuums: 'vacuum.x' } })).toEqual(['family.vacuums']);
    expect(paths({ security: { locks: 'lock.x' } })).toEqual(['security.locks']);
    expect(paths({ security: { cameras: 'camera.x', covers: {}, sensors: 3 } })).toEqual(['security.cameras', 'security.covers', 'security.sensors']);
    expect(paths({ alerts: { safety: 'cover.g', nudge: [{ label: 'no entity' }] } })).toEqual(['alerts.nudge[0]', 'alerts.safety']);
    expect(paths({ home: { doorbell: 'camera.x', chores: [], laundry: 'x', calendar: 3 } })).toEqual(['home.calendar', 'home.chores', 'home.doorbell', 'home.laundry']);
    expect(paths({ home: { calendar: 'calendar.a' } })).toEqual([]);
    expect(paths({ home: { calendar: ['calendar.a', 'calendar.b'] } })).toEqual([]);
    expect(paths({ rooms: [{ area: 'k', include: 'light.a', exclude: 'light.b' }] })).toEqual(['rooms[0].exclude', 'rooms[0].include']);
    expect(paths({ automations: 'automation.a', confirm_hold: 'lock.a' })).toEqual(['automations', 'confirm_hold']);
    expect(paths({ climate: { rooms: [{ name: 'A', vents: 'cover.v' }, 'x'], toggles: 'switch.t', air: [] } })).toEqual(['climate.air', 'climate.rooms[0].vents', 'climate.rooms[1]', 'climate.toggles']);
    expect(paths({ garage: { cars: { name: 'x' }, energy: { chargers: 'sensor.c' } } })).toEqual(['garage.cars', 'garage.energy.chargers']);
    expect(paths({ garage: { cars: ['x'] } })).toEqual(['garage.cars[0]']);
    expect(paths({ family: { printer: 'sensor.p', sprinklers: { zones: 'switch.z' } } })).toEqual(['family.printer', 'family.sprinklers.zones']);
    expect(paths({ family: { vacuums: [3] } })).toEqual(['family.vacuums[0]']);
    expect(paths({ people: ['person.a'] })).toEqual(['people[0].person']);
  });
  it('setConfig throws with path messages for nested shape errors', async () => {
    await import('../../src/glasshouse-card');
    const el = document.createElement('glasshouse-card') as any;
    expect(() => el.setConfig({ type: 'custom:glasshouse-card', family: { vacuums: 'vacuum.x' } })).toThrow('family.vacuums: must be a list');
  });
  it('rejects a non-object config', () => {
    expect(validateConfig(null).errors[0].path).toBe('');
  });
});

describe('collectEntityIds', () => {
  it('walks every section and dedupes', () => {
    const ids = collectEntityIds({
      type: 'custom:glasshouse-card',
      weather: 'weather.home',
      people: [{ person: 'person.beth', occupancy: 'binary_sensor.blue' }],
      alerts: { safety: ['cover.garage'], nudge: [{ entity: 'sensor.co2', above: 1200 }, 'lock.back'] },
      security: { locks: ['lock.back'], cameras: ['camera.a', { entity: 'camera.b' }] },
      rooms: [{ area: 'kitchen', include: ['light.extra'], climate: 'climate.k' }],
    });
    expect(ids.sort()).toEqual(['binary_sensor.blue', 'camera.a', 'camera.b', 'climate.k', 'cover.garage', 'light.extra', 'lock.back', 'person.beth', 'sensor.co2', 'weather.home']);
  });
});

describe('missingEntities', () => {
  it('reports unknown ids as warnings with their config path', () => {
    const h = makeHass([{ entity_id: 'weather.home', state: 'sunny' }]);
    const w = missingEntities(h, { type: 'x', weather: 'weather.home', home: { thermostat: 'climate.nope' } });
    expect(w).toEqual([{ path: 'home.thermostat', message: 'missing: climate.nope' }]);
  });
});
