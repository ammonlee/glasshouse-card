import { makeHass } from '../helpers/hass';
import { thermostat, setpointCall, modeService, climTone, climRooms, toggles, airVm } from '../../src/model/climate';

describe('thermostat', () => {
  const single = makeHass([{ entity_id: 'climate.t', state: 'cool', attributes: { current_temperature: 73.8, temperature: 77, hvac_action: 'cooling', current_humidity: 47, preset_mode: 'Home', min_temp: 45, max_temp: 92, target_temp_step: 1 } }]);
  const dual = makeHass([{ entity_id: 'climate.t', state: 'heat_cool', attributes: { current_temperature: 70, target_temp_low: 68, target_temp_high: 70, hvac_action: 'idle' } }]);
  it('reads a single-setpoint cooling thermostat', () => {
    expect(thermostat(single, 'climate.t')).toMatchObject({ current: 74, mode: 'cool', cool: 77, target: 77, dual: false, actionLabel: 'Cooling', actionColor: '#A7C7E5', humidity: 47, preset: 'home' });
  });
  it('steps a single setpoint', () => {
    expect(setpointCall(thermostat(single, 'climate.t')!, 1)).toEqual({ data: { temperature: 78 } });
  });
  it('keeps dual setpoints 2° apart', () => {
    const t = thermostat(dual, 'climate.t')!;
    expect(t).toMatchObject({ mode: 'auto', heat: 68, cool: 70, dual: true, target: 68 });
    expect(setpointCall(t, 1)).toEqual({ data: { target_temp_low: 68, target_temp_high: 70 } });
    expect(setpointCall(t, -1)).toEqual({ data: { target_temp_low: 67, target_temp_high: 70 } });
  });
  it('returns null when off or missing', () => {
    const off = makeHass([{ entity_id: 'climate.t', state: 'off', attributes: { current_temperature: 70 } }]);
    expect(setpointCall(thermostat(off, 'climate.t')!, 1)).toBeNull();
    expect(thermostat(off, 'climate.nope')).toBeNull();
  });
  it('maps auto to heat_cool', () => { expect(modeService('auto')).toBe('heat_cool'); expect(modeService('cool')).toBe('cool'); });
});

describe('climate rooms', () => {
  it('tones by ±1° and handles missing data', () => {
    expect([climTone(68.9, 70), climTone(69.0, 70), climTone(71.0, 70), climTone(71.1, 70), climTone(70, null), climTone(null, 70)])
      .toEqual(['cold', 'good', 'good', 'warm', 'off', 'na']);
  });
  it('computes vent openness', () => {
    const h = makeHass([
      { entity_id: 'climate.r', state: 'cool', attributes: { current_temperature: 76, temperature: 75 } },
      { entity_id: 'cover.v1', state: 'open' }, { entity_id: 'cover.v2', state: 'closed' },
      { entity_id: 'cover.p1', state: 'open', attributes: { current_position: 40 } }, { entity_id: 'cover.p2', state: 'open', attributes: { current_position: 80 } },
      { entity_id: 'binary_sensor.occ', state: 'off' },
    ]);
    const [a, b] = climRooms(h, [
      { name: 'Master', climate: 'climate.r', vents: ['cover.v1', 'cover.v2'], occupancy: 'binary_sensor.occ' },
      { name: 'Kitchen', vents: ['cover.p1', 'cover.p2', 'cover.missing'] },
    ]);
    expect(a).toEqual({ name: 'Master', temp: 76, target: 75, vent: 50, occupied: false, tone: 'good' });
    expect(b).toMatchObject({ vent: 60, temp: null, tone: 'na', occupied: null });
  });
});

describe('toggles and air', () => {
  const h = makeHass([
    { entity_id: 'input_boolean.auto_vent_control', state: 'on', attributes: { friendly_name: 'Auto Vent Control' } },
    { entity_id: 'water_heater.hp', state: 'unavailable', attributes: { friendly_name: 'Heat Pump Water Heater' } },
    { entity_id: 'sensor.co2', state: '1373' }, { entity_id: 'sensor.aqi', state: '77' },
  ]);
  it('builds toggle tiles', () => {
    expect(toggles(h, ['input_boolean.auto_vent_control', 'water_heater.hp'])).toEqual([
      { entity: 'input_boolean.auto_vent_control', name: 'Auto Vent Control', icon: 'air-vent', state: 'On', tone: 'on' },
      { entity: 'water_heater.hp', name: 'Heat Pump Water Heater', icon: 'heater', state: 'Unavailable', tone: 'na' },
    ]);
  });
  it('flags bad air', () => {
    expect(airVm(h, { co2: 'sensor.co2', aqi: 'sensor.aqi' })).toEqual({ co2: 1373, aqi: 77, co2Bad: true, aqiBad: false });
  });
});
