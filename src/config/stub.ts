import type { HassLike } from '../types';
import type { GlasshouseConfig } from './types';
import { discover } from '../model/rooms';
import { attr, exists, fname } from '../model/util';

const COLORS = ['blue', 'gold', 'grey', 'green'];

export function stubConfig(h: HassLike): GlasshouseConfig {
  const ids = Object.keys(h.states);
  const of = (d: string) => ids.filter((i) => i.startsWith(`${d}.`));
  const dc = (i: string) => attr<string>(h, i, 'device_class');
  const garage = of('cover').filter((i) => dc(i) === 'garage');
  const locks = of('lock');
  const thermostat = of('climate').find((i) => {
    const m = attr<string[]>(h, i, 'hvac_modes') || [];
    return m.includes('heat_cool') || (m.includes('heat') && m.includes('cool'));
  });
  const todo = of('todo').find((i) => /chore/i.test(`${i} ${fname(h, i)}`));
  const c: GlasshouseConfig = {
    type: 'custom:glasshouse-card', wallpaper: 'dusk',
    weather: of('weather')[0],
    people: of('person').map((p, i) => ({ person: p, color: COLORS[i % COLORS.length] })),
    alerts: {
      safety: [...garage, ...of('binary_sensor').filter((i) => dc(i) === 'moisture' || dc(i) === 'smoke')],
      nudge: locks,
    },
    home: {
      thermostat, media: of('media_player').find((i) => exists(h, i)),
      ...(todo ? { chores: { todo } } : {}),
    },
    security: { cameras: of('camera').filter((i) => exists(h, i)).slice(0, 7), locks, covers: garage },
    rooms: Object.keys(h.areas).filter((a) => discover(h, { area: a }).lights.length).map((area) => ({ area, floor: 'Home' })),
  };
  return JSON.parse(JSON.stringify(c)); // drop undefined keys so the YAML editor shows a clean config
}
