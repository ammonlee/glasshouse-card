import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

const h = makeHass([
  { entity_id: 'camera.a', state: 'recording', attributes: { access_token: 't', friendly_name: 'Doorbell' } },
  { entity_id: 'camera.b', state: 'unavailable', attributes: { friendly_name: 'Backyard' } },
  { entity_id: 'lock.back', state: 'unlocked', attributes: { friendly_name: 'Back Door' } },
  { entity_id: 'cover.garage', state: 'closed', attributes: { friendly_name: 'Garage Door', device_class: 'garage' } },
  { entity_id: 'alarm_control_panel.home', state: 'disarmed', attributes: { friendly_name: 'Alarm' } },
  { entity_id: 'binary_sensor.leak', state: 'off', attributes: { friendly_name: 'Leak Sensor', device_class: 'moisture' } },
]);

async function mount() {
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card', security: { alarm: 'alarm_control_panel.home', cameras: ['camera.a', { entity: 'camera.b', name: 'Backyard' }], locks: ['lock.back'], covers: ['cover.garage'], sensors: ['binary_sensor.leak'] } });
  el.hass = h; document.body.appendChild(el); await el.updateComplete;
  el.nav('security'); await el.updateComplete;
  return el;
}

describe('security view', () => {
  it('renders cameras, doors, alarm and sensors', async () => {
    const r = (await mount()).shadowRoot!;
    expect(r.textContent).toContain('Doorbell');
    expect(r.textContent).toContain('Backyard');
    expect(r.textContent).toContain('Back Door');
    expect(r.textContent).toContain('Unlocked');
    expect(r.textContent).toContain('Disarmed');
    expect(r.textContent).toContain('Dry');
  });
  it('tapping Lock on an unlocked door locks it', async () => {
    const el = await mount();
    (el.shadowRoot!.querySelector('[data-test="door-lock.back"]') as HTMLElement).click();
    await Promise.resolve();
    expect(h.calls.at(-1)).toEqual(['lock', 'lock', {}, { entity_id: 'lock.back' }]);
  });
  it('opening the garage requires a hold (no call on plain click)', async () => {
    const el = await mount();
    const n = h.calls.length;
    (el.shadowRoot!.querySelector('[data-test="door-cover.garage"]') as HTMLElement).click();
    await Promise.resolve();
    expect(h.calls.length).toBe(n);
  });
  it('a second tap on a closing garage does not re-open it without a hold (Critical 1)', async () => {
    const g = makeHass([{ entity_id: 'cover.garage', state: 'open', attributes: { friendly_name: 'Garage Door', device_class: 'garage' } }]);
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', security: { covers: ['cover.garage'] } });
    el.hass = g; document.body.appendChild(el); await el.updateComplete;
    el.nav('security'); await el.updateComplete;
    const btn = () => el.shadowRoot!.querySelector('[data-test="door-cover.garage"]') as HTMLElement;
    expect(btn().textContent).toContain('Close');
    btn().click(); await Promise.resolve(); await el.updateComplete;
    expect(g.calls).toEqual([['cover', 'close_cover', {}, { entity_id: 'cover.garage' }]]);
    expect(btn().textContent).toContain('Open');
    expect(btn().getAttribute('data-hold')).toBe('cover.garage');
    btn().click(); await Promise.resolve();
    expect(g.calls.length).toBe(1);
  });
  it('labels a cover in an unknown state with the action a tap would run', async () => {
    const g = makeHass([{ entity_id: 'cover.garage', state: 'unknown', attributes: { friendly_name: 'Garage Door', device_class: 'garage' } }]);
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', security: { covers: ['cover.garage'] } });
    el.hass = g; document.body.appendChild(el); await el.updateComplete;
    el.nav('security'); await el.updateComplete;
    const b = el.shadowRoot!.querySelector('[data-test="door-cover.garage"]') as HTMLElement;
    expect(b.textContent).toContain('Close');
    b.click(); await Promise.resolve();
    expect(g.calls.at(-1)).toEqual(['cover', 'close_cover', {}, { entity_id: 'cover.garage' }]);
  });
  it('disarming needs a 1 s hold; arming stays a single tap (Important 8)', async () => {
    vi.useFakeTimers();
    const g = makeHass([{ entity_id: 'alarm_control_panel.home', state: 'armed_home', attributes: { friendly_name: 'Alarm' } }]);
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', security: { alarm: 'alarm_control_panel.home', locks: [] , cameras: ['camera.none'] } });
    el.hass = g; document.body.appendChild(el); await el.updateComplete;
    el.nav('security'); await el.updateComplete;
    const home = el.shadowRoot!.querySelector('[data-test="arm-armed_home"]') as HTMLElement;
    expect(home.getAttribute('data-hold')).toBe('alarm_control_panel.home');
    home.click(); await Promise.resolve();
    expect(g.calls.length).toBe(0);
    home.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    vi.advanceTimersByTime(1001);
    expect(g.calls.at(-1)).toEqual(['alarm_control_panel', 'alarm_disarm', {}, { entity_id: 'alarm_control_panel.home' }]);
    home.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true }));
    vi.advanceTimersByTime(1000);
    const away = el.shadowRoot!.querySelector('[data-test="arm-armed_away"]') as HTMLElement;
    expect(away.getAttribute('data-hold')).toBe('');
    away.click(); await Promise.resolve();
    expect(g.calls.at(-1)).toEqual(['alarm_control_panel', 'alarm_arm_away', {}, { entity_id: 'alarm_control_panel.home' }]);
    vi.useRealTimers();
  });
  it('hides a camera snapshot that fails to load (Minor b)', async () => {
    const el = await mount();
    const img = el.shadowRoot!.querySelector('.cam-bg img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    expect(img.style.visibility).toBe('hidden');
    img.dispatchEvent(new Event('load'));
    expect(img.style.visibility).toBe('');
  });
});
