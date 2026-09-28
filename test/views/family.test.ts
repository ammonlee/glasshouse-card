import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

const h = makeHass([
  { entity_id: 'person.june', state: 'home', attributes: { friendly_name: 'June' } },
  { entity_id: 'sensor.jt', state: '120' },
  { entity_id: 'vacuum.rocky', state: 'docked', attributes: { friendly_name: 'Rocky', battery_level: 100 } },
  { entity_id: 'lawn_mower.mr_green', state: 'docked', attributes: { friendly_name: 'Mr. Green' } },
  { entity_id: 'switch.zone_1', state: 'off', attributes: { friendly_name: 'Home Controller Front Grass 1' } },
  { entity_id: 'switch.rain', state: 'off' },
  { entity_id: 'sensor.cyan_ink', state: '20' },
  { entity_id: 'climate.spa', state: 'unavailable' },
]);

async function mount() {
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card', people: [{ person: 'person.june', toothbrush: 'sensor.jt', color: 'gold' }],
    family: { vacuums: ['vacuum.rocky'], mower: 'lawn_mower.mr_green', sprinklers: { zones: ['switch.zone_1'], rain_delay: 'switch.rain', strip_prefix: 'Home Controller ' }, printer: ['sensor.cyan_ink'], hot_tub: 'climate.spa' } });
  el.hass = h; document.body.appendChild(el); await el.updateComplete;
  el.nav('family'); await el.updateComplete;
  return el;
}

describe('family view', () => {
  it('renders brushing, vacuums, printer, sprinklers, mower and hot tub', async () => {
    const r = (await mount()).shadowRoot!;
    for (const s of ['2:00', 'Rocky', 'Docked · 100%', 'Printer ink low · cyan 20%', 'Front Grass 1', 'Mr. Green', 'Hot Tub', 'Offline']) expect(r.textContent).toContain(s);
  });
  it('vacuum Start, zone tap and Mow now call services', async () => {
    const el = await mount(), r = el.shadowRoot!;
    (r.querySelector('[data-test="vac-vacuum.rocky"]') as HTMLElement).click(); await Promise.resolve();
    expect(h.calls.at(-1)).toEqual(['vacuum', 'start', {}, { entity_id: 'vacuum.rocky' }]);
    (r.querySelector('[data-test="zone-switch.zone_1"]') as HTMLElement).click(); await Promise.resolve();
    expect(h.calls.at(-1)).toEqual(['switch', 'turn_on', {}, { entity_id: 'switch.zone_1' }]);
    (r.querySelector('[data-test="mow"]') as HTMLElement).click(); await Promise.resolve();
    expect(h.calls.at(-1)).toEqual(['lawn_mower', 'start_mowing', {}, { entity_id: 'lawn_mower.mr_green' }]);
  });
});
