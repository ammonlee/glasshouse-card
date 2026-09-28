import { miniHouse } from '../helpers/hass';
import { stubConfig } from '../../src/config/stub';
import { validateConfig } from '../../src/config/schema';

describe('stubConfig', () => {
  const c = stubConfig(miniHouse());
  it('produces a valid config', () => { expect(validateConfig(c).errors).toEqual([]); });
  it('picks sensible defaults from the house', () => {
    expect(c.weather).toBe('weather.forecast_home');
    expect(c.people?.map((p) => p.person)).toEqual(['person.june', 'person.bennett']);
    expect(c.alerts?.safety).toEqual(['cover.ratgdov25i_1beeb4_door', 'binary_sensor.strips_drip_700_water_leak_detected']);
    expect(c.alerts?.nudge).toEqual(['lock.front_door_lock', 'lock.back_door']);
    expect(c.home?.thermostat).toBe('climate.532583116183');
    expect(c.home?.media).toBe('media_player.living_room');
    expect(c.home?.chores?.todo).toBe('todo.chores');
    expect(c.security?.cameras).toEqual(['camera.g4_doorbell_pro_poe_high_resolution_channel_2']);
    expect(c.rooms?.map((r) => r.area).sort()).toEqual(['garage', 'june_s_room', 'kitchen']);
  });
});
