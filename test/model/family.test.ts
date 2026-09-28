import { makeHass } from '../helpers/hass';
import { laundry } from '../../src/model/laundry';
import { vacuums, mower, sprinklers, printer, brushing, hotTub } from '../../src/model/family';

const ppl = [{ name: 'June', initials: 'JU', color: '#FFD660', home: true, inRoom: false }];

describe('laundry', () => {
  const base = [
    { entity_id: 'sensor.washer', state: 'power_off' },
    { entity_id: 'binary_sensor.washer_done', state: 'on', last_changed: '2026-09-27T18:05:00Z' },
    { entity_id: 'sensor.dryer', state: 'running' },
    { entity_id: 'sensor.dryer_left', state: '24' }, { entity_id: 'sensor.dryer_total', state: '63' },
    { entity_id: 'sensor.loads', state: '4' },
    { entity_id: 'sensor.roster', state: 'Sunday', attributes: { assignments: { laundry: 'June' } } },
  ];
  const cfg = { washer: 'sensor.washer', washer_done: 'binary_sensor.washer_done', dryer: 'sensor.dryer', dryer_remaining: 'sensor.dryer_left', dryer_total: 'sensor.dryer_total', loads_week: 'sensor.loads' };
  it('shows washer done until acknowledged, dryer progress and whose turn', () => {
    const h = makeHass(base);
    expect(laundry(h, cfg, 'sensor.roster', ppl, null)).toMatchObject({ washer: 'done', dryer: 'running', dryerMin: 24, dryerPct: 62, loads: 4, turn: { name: 'June' }, note: null, doneSince: '2026-09-27T18:05:00Z' });
    expect(laundry(h, cfg, 'sensor.roster', ppl, '2026-09-27T18:05:00Z')!.washer).toBe('idle');
  });
  it('shows the rest-day note when nobody is assigned', () => {
    const h = makeHass([...base.slice(0, 6), { entity_id: 'sensor.roster', state: 'Sunday', attributes: { assignments: { laundry: '' }, laundry_note: 'The machines rest today.' } }]);
    expect(laundry(h, cfg, 'sensor.roster', ppl, null)).toMatchObject({ turn: null, note: 'The machines rest today.' });
  });
  it('returns null without config', () => { expect(laundry(makeHass([]), undefined)).toBeNull(); });
});

describe('family', () => {
  const h = makeHass([
    { entity_id: 'vacuum.white', state: 'docked', attributes: { friendly_name: 'Mr. White' } },
    { entity_id: 'sensor.white_battery', state: '100' },
    { entity_id: 'vacuum.rocky', state: 'cleaning', attributes: { friendly_name: 'Rocky', battery_level: 64 } },
    { entity_id: 'vacuum.sludge', state: 'error', attributes: { friendly_name: 'The Sludge' } },
    { entity_id: 'vacuum.gone', state: 'unavailable', attributes: { friendly_name: 'Gone' } },
    { entity_id: 'lawn_mower.mr_green', state: 'docked', attributes: { friendly_name: 'Mr. Green' } },
    { entity_id: 'sensor.mr_green_battery', state: '92' },
    { entity_id: 'switch.zone_1', state: 'off', attributes: { friendly_name: 'Home Controller Front Grass 1' } },
    { entity_id: 'switch.zone_2', state: 'on', attributes: { friendly_name: 'Home Controller Back Grass 2' } },
    { entity_id: 'switch.rain', state: 'off' },
    { entity_id: 'sensor.epson_cyan_ink', state: '30' }, { entity_id: 'sensor.epson_magenta_ink', state: '28' }, { entity_id: 'sensor.epson_black_ink', state: '38' },
    { entity_id: 'sensor.june_s_toothbrush_time', state: '95' },
    { entity_id: 'climate.spa', state: 'unavailable' },
  ]);
  it('maps vacuum states and actions', () => {
    const v = vacuums(h, ['vacuum.white', 'vacuum.rocky', 'vacuum.sludge', 'vacuum.gone']);
    expect(v.map((x) => [x.state, x.text, x.action.service, x.tone])).toEqual([
      ['docked', 'Docked · 100%', 'start', 'off'],
      ['cleaning', 'Cleaning · 64%', 'return_to_base', 'on'],
      ['stuck', 'Stuck — needs help', 'locate', 'alert'],
      ['offline', 'Offline', 'locate', 'na'],
    ]);
  });
  it('reads mower, sprinklers, printer, brushing and hot tub', () => {
    expect(mower(h, 'lawn_mower.mr_green')).toMatchObject({ mowing: false, battery: 92, text: 'Docked · 92%' });
    const s = sprinklers(h, { zones: ['switch.zone_1', 'switch.zone_2'], rain_delay: 'switch.rain', strip_prefix: 'Home Controller ' })!;
    expect(s.zones.map((z) => z.name)).toEqual(['Front Grass 1', 'Back Grass 2']);
    expect(s.running?.name).toBe('Back Grass 2');
    expect(s.rainDelay).toBe(false);
    expect(printer(h, ['sensor.epson_cyan_ink', 'sensor.epson_magenta_ink', 'sensor.epson_black_ink'])).toEqual({ low: 'Printer ink low · cyan & magenta 28%', min: 28 });
    expect(brushing(h, [{ person: 'person.june', name: 'June', toothbrush: 'sensor.june_s_toothbrush_time' }, { person: 'person.x' }]))
      .toEqual([{ name: 'June', seconds: 95, time: '1:35', pct: 79, done: false }]);
    expect(hotTub(h, 'climate.spa')).toEqual({ online: false, temp: null });
  });
});
