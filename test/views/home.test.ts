import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

const h = makeHass([
  { entity_id: 'camera.door', state: 'recording', attributes: { access_token: 'tok', friendly_name: 'Doorbell' } },
  { entity_id: 'lock.front', state: 'locked', attributes: { friendly_name: 'Front Door' } },
  { entity_id: 'todo.chores', state: '1' },
  { entity_id: 'sensor.roster', state: 'Sunday', attributes: { assignments: { unload: 'Beth' }, morning_keys: ['unload'], evening_keys: ['unload'] } },
  { entity_id: 'person.beth', state: 'home', attributes: { friendly_name: 'Beth' } },
  { entity_id: 'climate.t', state: 'cool', attributes: { current_temperature: 74, temperature: 77, hvac_action: 'cooling' } },
  { entity_id: 'media_player.tv', state: 'paused', attributes: { media_title: 'Bluey', app_name: 'Apple TV', volume_level: 0.3 } },
  { entity_id: 'script.good_night', state: 'off' },
]);

async function mount() {
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card', people: [{ person: 'person.beth', color: 'blue' }],
    home: { doorbell: { camera: 'camera.door', lock: 'lock.front' }, chores: { todo: 'todo.chores', roster: 'sensor.roster' }, thermostat: 'climate.t', media: 'media_player.tv', good_night: 'script.good_night' } });
  el.hass = h;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('home view', () => {
  it('renders doorbell snapshot, chores, thermostat, media and good night', async () => {
    const el = await mount();
    const r = el.shadowRoot!;
    expect(r.querySelector('img')?.getAttribute('src')).toContain('/api/camera_proxy/camera.door?token=tok');
    expect(r.textContent).toContain('Unload dishes');
    expect(r.textContent).toContain('77°');
    expect(r.textContent).toContain('Bluey');
    expect(r.textContent).toContain('Good Night');
  });
  it('plus button raises the cool setpoint', async () => {
    const el = await mount();
    (el.shadowRoot!.querySelector('[data-test="sp-up"]') as HTMLElement).click();
    await Promise.resolve();
    expect(h.calls).toContainEqual(['climate', 'set_temperature', { temperature: 78 }, { entity_id: 'climate.t' }]);
  });
  it('good night runs the script', async () => {
    const el = await mount();
    (el.shadowRoot!.querySelector('[data-test="good-night"]') as HTMLElement).click();
    await Promise.resolve();
    expect(h.calls.some(([d, s, , t]) => d === 'script' && s === 'turn_on' && t.entity_id === 'script.good_night')).toBe(true);
  });
});
