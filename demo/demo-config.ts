import type { GlasshouseConfig } from '../src/config/types';

/** Demo config for the mini fixture. Put your own house's config in local/house-config.json (git-ignored) and the demo uses it instead. */
export function demoConfig(): GlasshouseConfig {
  return {
    type: 'custom:glasshouse-card', weather: 'weather.forecast_home',
    people: [{ person: 'person.june', color: 'gold' }, { person: 'person.bennett', color: 'grey', initials: 'BN' }],
    alerts: { safety: ['cover.ratgdov25i_1beeb4_door', 'binary_sensor.strips_drip_700_water_leak_detected'], nudge: ['lock.back_door'] },
    home: { doorbell: { camera: 'camera.g4_doorbell_pro_poe_high_resolution_channel_2', lock: 'lock.front_door_lock' }, chores: { todo: 'todo.chores' }, thermostat: 'climate.532583116183', media: 'media_player.living_room' },
    security: { cameras: ['camera.g4_doorbell_pro_poe_high_resolution_channel_2', 'camera.backyard_high'], locks: ['lock.front_door_lock', 'lock.back_door'], covers: ['cover.ratgdov25i_1beeb4_door'] },
    rooms: [{ area: 'kitchen', icon: 'utensils', floor: 'Main Floor' }, { area: 'garage', icon: 'warehouse', floor: 'Main Floor' }, { area: 'june_s_room', name: 'Gold Room', icon: 'bed', floor: 'Basement' }],
  };
}
