import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

const h = makeHass([
  { entity_id: 'sensor.b', state: '70' }, { entity_id: 'sensor.r', state: '238' }, { entity_id: 'lock.d', state: 'locked' },
  { entity_id: 'number.l', state: '80' }, { entity_id: 'sensor.b2', state: 'unavailable' },
  { entity_id: 'sensor.solar', state: '400' }, { entity_id: 'sensor.grid', state: '500' }, { entity_id: 'sensor.home', state: '14300' },
  { entity_id: 'sensor.batt', state: '13400' }, { entity_id: 'sensor.lvl', state: '64' },
]);

async function mount() {
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card', garage: {
    cars: [{ name: 'Falcon', battery: 'sensor.b', range: 'sensor.r', lock: 'lock.d', charge_limit: 'number.l' }, { name: 'Model 3', battery: 'sensor.b2' }],
    energy: { solar: 'sensor.solar', grid: 'sensor.grid', home: 'sensor.home', battery: 'sensor.batt', battery_level: 'sensor.lvl' } } });
  el.hass = h; document.body.appendChild(el); await el.updateComplete;
  el.nav('garage'); await el.updateComplete;
  return el;
}

describe('garage view', () => {
  it('renders cars, asleep car and energy', async () => {
    const r = (await mount()).shadowRoot!;
    expect(r.textContent).toContain('Falcon');
    expect(r.textContent).toContain('70%');
    expect(r.textContent).toContain('238 mi');
    expect(r.textContent).toContain('Model 3');
    expect(r.textContent).toContain('Asleep');
    expect(r.textContent).toContain('14.3 kW');
    expect(r.textContent).toContain('Powerwall · giving 13.4 kW');
  });
  it('limit button steps the charge limit', async () => {
    const el = await mount();
    (el.shadowRoot!.querySelector('[data-test="car-0-limit"]') as HTMLElement).click();
    await Promise.resolve();
    expect(h.calls.at(-1)).toEqual(['number', 'set_value', { value: 90 }, { entity_id: 'number.l' }]);
  });
  it('unlocking the car needs a hold; a plain tap does nothing (Important 4)', async () => {
    vi.useFakeTimers();
    const el = await mount();
    const n = h.calls.length;
    const btn = el.shadowRoot!.querySelector('[data-test="car-0-lock"]') as HTMLElement;
    expect(btn.getAttribute('data-hold')).toBe('lock.d');
    btn.click(); await Promise.resolve();
    expect(h.calls.length).toBe(n);
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    vi.advanceTimersByTime(1001);
    expect(h.calls.at(-1)).toEqual(['lock', 'unlock', {}, { entity_id: 'lock.d' }]);
    vi.useRealTimers();
  });
});
