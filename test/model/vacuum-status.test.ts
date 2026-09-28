import { makeHass } from '../helpers/hass';
import { vacuums } from '../../src/model/family';
import { relevantIds } from '../../src/model/index';

const vac = (vState: string, status?: string, cleaning?: string) => makeHass([
  { entity_id: 'vacuum.white', state: vState, attributes: { friendly_name: 'Mr. White', battery_level: 100 } },
  ...(status ? [{ entity_id: 'sensor.white_status', state: status }] : []),
  ...(cleaning ? [{ entity_id: 'binary_sensor.white_cleaning', state: cleaning }] : []),
]);
const one = (h: ReturnType<typeof vac>) => vacuums(h, ['vacuum.white'])[0];

describe('vacuum live status', () => {
  it('shows cleaning as soon as the status sensor says so, even while the vacuum entity still says docked', () => {
    const v = one(vac('docked', 'washing_the_mop', 'on'));
    expect(v.state).toBe('cleaning');
    expect(v.text).toBe('Washing the mop · 100%');
    expect(v.action.service).toBe('return_to_base');
  });
  it('shows the status wording while cleaning', () => {
    expect(one(vac('cleaning', 'segment_cleaning', 'on')).text).toBe('Cleaning rooms · 100%');
    expect(one(vac('cleaning', 'cleaning', 'on')).text).toBe('Cleaning · 100%');
  });
  it('maps returning, paused, error and offline statuses', () => {
    expect(one(vac('cleaning', 'returning_home', 'off')).state).toBe('returning');
    expect(one(vac('cleaning', 'paused', 'off')).state).toBe('paused');
    expect(one(vac('docked', 'error', 'off')).state).toBe('stuck');
    expect(one(vac('docked', 'device_offline', 'off')).state).toBe('offline');
  });
  it('docked with dock chores shows what the dock is doing', () => {
    const v = one(vac('docked', 'emptying_the_bin', 'off'));
    expect(v.state).toBe('docked');
    expect(v.text).toBe('Docked · Emptying the bin');
  });
  it('plain charging reads as Docked', () => {
    expect(one(vac('docked', 'charging', 'off')).text).toBe('Docked · 100%');
  });
  it('without status sensors, falls back to the vacuum entity', () => {
    expect(one(vac('cleaning')).state).toBe('cleaning');
    expect(one(vac('docked')).text).toBe('Docked · 100%');
  });
  it('redraws when the status or cleaning sensor changes', () => {
    const ids = relevantIds(vac('docked'), { type: 'x', family: { vacuums: ['vacuum.white'] } });
    expect(ids.has('sensor.white_status')).toBe(true);
    expect(ids.has('binary_sensor.white_cleaning')).toBe(true);
  });
});
