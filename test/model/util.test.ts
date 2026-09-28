import { makeHass } from '../helpers/hass';
import { num, isAvail, exists, fname, minsSince, attr, val } from '../../src/model/util';

const h = makeHass([
  { entity_id: 'sensor.co2', state: '1373', attributes: { unit_of_measurement: 'ppm' } },
  { entity_id: 'sensor.gone', state: 'unavailable' },
  { entity_id: 'sensor.unknown', state: 'unknown' },
  { entity_id: 'lock.front', state: 'locked', attributes: { friendly_name: 'Front Door Lock' } },
]);

describe('util', () => {
  it('parses numbers and rejects non-numeric states', () => {
    expect(num(h, 'sensor.co2')).toBe(1373);
    expect(num(h, 'sensor.gone')).toBeNull();
    expect(num(h, 'sensor.unknown')).toBeNull();
    expect(num(h, 'sensor.missing')).toBeNull();
  });
  it('distinguishes exists vs available', () => {
    expect(exists(h, 'sensor.unknown')).toBe(true);
    expect(isAvail(h, 'sensor.unknown')).toBe(false);
    expect(exists(h, 'sensor.gone')).toBe(false);
    expect(exists(h, undefined)).toBe(false);
  });
  it('falls back to entity id for names', () => {
    expect(fname(h, 'lock.front')).toBe('Front Door Lock');
    expect(fname(h, 'sensor.co2')).toBe('sensor.co2');
  });
  it('reads attributes and raw state', () => {
    expect(attr<string>(h, 'sensor.co2', 'unit_of_measurement')).toBe('ppm');
    expect(val(h, 'lock.front')).toBe('locked');
  });
  it('minsSince is at least 1 and rounds', () => {
    const now = Date.parse('2026-09-27T12:00:00Z');
    expect(minsSince('2026-09-27T11:42:00Z', now)).toBe(18);
    expect(minsSince('2026-09-27T12:00:00Z', now)).toBe(1);
  });
});
