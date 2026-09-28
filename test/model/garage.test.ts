import { makeHass } from '../helpers/hass';
import { cars, energy, kw } from '../../src/model/garage';

describe('cars', () => {
  const h = makeHass([
    { entity_id: 'sensor.b', state: '70' }, { entity_id: 'sensor.r', state: '237.75' }, { entity_id: 'sensor.p', state: '0.0' },
    { entity_id: 'lock.d', state: 'unlocked' }, { entity_id: 'climate.c', state: 'off' }, { entity_id: 'switch.s', state: 'on' },
    { entity_id: 'number.l', state: '80' }, { entity_id: 'sensor.in', state: '92.3' }, { entity_id: 'sensor.odo', state: '40899.61' },
    { entity_id: 'sensor.b2', state: 'unavailable' },
  ]);
  it('builds a car card view model', () => {
    const [c] = cars(h, [{ name: 'Falcon', battery: 'sensor.b', range: 'sensor.r', charger_power: 'sensor.p', lock: 'lock.d', climate: 'climate.c', sentry: 'switch.s', charge_limit: 'number.l', inside: 'sensor.in', odometer: 'sensor.odo' }]);
    expect(c).toMatchObject({ name: 'Falcon', online: true, sub: 'Parked · 92° inside · 40,900 mi', pct: 70, range: 238, limit: 80, plugged: false, locked: false, climate: false, sentry: true });
  });
  it('handles asleep cars and missing sentry', () => {
    const [c] = cars(h, [{ name: 'Cybertruck', battery: 'sensor.b2' }]);
    expect(c).toMatchObject({ online: false, sub: 'Asleep', pct: null, sentry: null, locked: null });
  });
});

describe('energy', () => {
  it('converts W to kW and labels directions', () => {
    const h = makeHass([
      { entity_id: 'sensor.solar', state: '0', attributes: { unit_of_measurement: 'W' } },
      { entity_id: 'sensor.grid', state: '-1362', attributes: { unit_of_measurement: 'W' } },
      { entity_id: 'sensor.home', state: '1.4', attributes: { unit_of_measurement: 'kW' } },
      { entity_id: 'sensor.batt', state: '-2400', attributes: { unit_of_measurement: 'W' } },
      { entity_id: 'sensor.level', state: '64' },
      { entity_id: 'sensor.c1', state: '0.4' }, { entity_id: 'sensor.c2', state: '31' },
    ]);
    expect(energy(h, { solar: 'sensor.solar', grid: 'sensor.grid', home: 'sensor.home', battery: 'sensor.batt', battery_level: 'sensor.level', chargers: ['sensor.c1', 'sensor.c2'] }))
      .toEqual({ solar: 0, grid: -1.362, home: 1.4, battery: -2.4, level: 64, charging: 1, chargers: 2, gridLabel: 'To grid', batteryLabel: 'Powerwall · charging 2.4 kW' });
    expect(kw(-1.362)).toBe('1.4 kW');
  });
});
