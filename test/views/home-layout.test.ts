import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

const states = [
  { entity_id: 'weather.home', state: 'rainy', attributes: { temperature: 60 } },
  { entity_id: 'climate.t', state: 'cool', attributes: { friendly_name: 'Main Floor Thermostat', current_temperature: 74, temperature: 77, hvac_action: 'cooling' } },
  { entity_id: 'vacuum.rocky', state: 'docked', attributes: { friendly_name: 'Rocky', battery_level: 100 } },
  { entity_id: 'vacuum.sludge', state: 'cleaning', attributes: { friendly_name: 'The Sludge', battery_level: 64 } },
];

async function mount() {
  const h = makeHass(states);
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card', weather: 'weather.home', home: { thermostat: 'climate.t' }, family: { vacuums: ['vacuum.rocky', 'vacuum.sludge'] } });
  el.hass = h; document.body.appendChild(el); await el.updateComplete;
  const r = el.shadowRoot!;
  return { el, h, r };
}

describe('Home layout', () => {
  it('shows the thermostat as a capsule in the header next to the weather', async () => {
    const { r } = await mount();
    const cap = r.querySelector('.header [data-test="thermo-cap"]') as HTMLElement;
    expect(cap.textContent).toContain('74°');
    expect(cap.textContent).toContain('77°');
    expect(cap.textContent).toContain('Cooling');
    const kids = [...r.querySelector('.header')!.querySelectorAll('.capsule')];
    expect(kids.indexOf(cap)).toBe(1);   // weather, then thermostat
  });
  it('the header − / + adjust the setpoint', async () => {
    const { r, h } = await mount();
    (r.querySelector('.header [data-test="sp-up"]') as HTMLElement).click(); await Promise.resolve();
    expect(h.calls).toContainEqual(['climate', 'set_temperature', { temperature: 78 }, { entity_id: 'climate.t' }]);
  });
  it('tapping the temperature opens the Climate tab', async () => {
    const { el, r } = await mount();
    (r.querySelector('[data-test="thermo-open"]') as HTMLElement).click(); await el.updateComplete;
    expect(el._tab).toBe('climate');
  });
  it('replaces the Home thermostat card with a robot vacuum card', async () => {
    const { r, h } = await mount();
    const card = r.querySelector('.view [data-test="vacuum-card"]') as HTMLElement;
    expect(card.textContent).toContain('Rocky');
    expect(card.textContent).toContain('The Sludge');
    expect(r.querySelector('.view [data-test="sp-up"]')).toBeNull();
    (card.querySelector('[data-test="vac-vacuum.rocky"]') as HTMLElement).click(); await Promise.resolve();
    expect(h.calls).toContainEqual(['vacuum', 'start', {}, { entity_id: 'vacuum.rocky' }]);
  });
});
