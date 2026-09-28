import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

const h = makeHass([
  { entity_id: 'climate.t', state: 'heat_cool', attributes: { friendly_name: 'Main Floor Thermostat', current_temperature: 71, target_temp_low: 68, target_temp_high: 76, hvac_action: 'heating', current_humidity: 46 } },
  { entity_id: 'climate.r1', state: 'cool', attributes: { current_temperature: 68.9, temperature: 70 } },
  { entity_id: 'sensor.co2', state: '1709' },
  { entity_id: 'input_boolean.auto_vent_control', state: 'on', attributes: { friendly_name: 'Auto Vents' } },
]);

async function mount() {
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card', home: { thermostat: 'climate.t' }, climate: { rooms: [{ name: 'Master', climate: 'climate.r1' }], air: { co2: 'sensor.co2' }, toggles: ['input_boolean.auto_vent_control'] } });
  el.hass = h; document.body.appendChild(el); await el.updateComplete;
  el.nav('climate'); await el.updateComplete;
  return el;
}

describe('climate view', () => {
  it('renders thermostat, rooms, air and toggles', async () => {
    const r = (await mount()).shadowRoot!;
    expect(r.textContent).toContain('Heat 68° · Cool 76°');
    expect(r.textContent).toContain('Heating');
    expect(r.querySelector('.tile.t-cold')?.textContent).toContain('68.9°');
    expect(r.textContent).toContain('1,709');
    expect(r.textContent).toContain('Auto Vents');
  });
  it('mode segment sets heat_cool', async () => {
    const el = await mount();
    const auto = [...el.shadowRoot!.querySelectorAll('.seg > div')].find((d: any) => d.textContent === 'Heat') as HTMLElement;
    auto.click(); await Promise.resolve();
    expect(h.calls.at(-1)).toEqual(['climate', 'set_hvac_mode', { hvac_mode: 'heat' }, { entity_id: 'climate.t' }]);
  });
  it('toggle tile flips the helper', async () => {
    const el = await mount();
    (el.shadowRoot!.querySelector('[data-test="toggle-input_boolean.auto_vent_control"]') as HTMLElement).click();
    await Promise.resolve();
    expect(h.calls.at(-1)).toEqual(['input_boolean', 'turn_off', {}, { entity_id: 'input_boolean.auto_vent_control' }]);
  });
});
