import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

const mk = () => makeHass([
  { entity_id: 'cover.garage', state: 'open', attributes: { friendly_name: 'Garage Door', device_class: 'garage' } },
  { entity_id: 'lock.front', state: 'locked', attributes: { friendly_name: 'Front Door' } },
  { entity_id: 'camera.door', state: 'recording', attributes: { access_token: 't' } },
  { entity_id: 'event.bell', state: '2026-09-27T18:00:00.000+00:00' },
  { entity_id: 'input_boolean.night', state: 'off' },
]);
const cfg = { type: 'custom:glasshouse-card', night_mode: 'input_boolean.night', alerts: { safety: ['cover.garage'] },
  security: { locks: ['lock.front'], covers: ['cover.garage'] }, home: { doorbell: { camera: 'camera.door', event: 'event.bell', lock: 'lock.front', takeover_seconds: 45 } } };

async function mount(h = mk()) {
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig(cfg); el.hass = h; document.body.appendChild(el); await el.updateComplete;
  return el;
}

describe('overlays', () => {
  it('alert list closes the garage from its action button', async () => {
    const el = await mount();
    (el.shadowRoot!.querySelector('.alert-cap') as HTMLElement).click(); await el.updateComplete;
    (el.shadowRoot!.querySelector('[data-test="alert-action-cover.garage"]') as HTMLElement).click(); await Promise.resolve();
    expect(el.hass.calls.at(-1)).toEqual(['cover', 'close_cover', {}, { entity_id: 'cover.garage' }]);
  });
  it('a new doorbell event opens the takeover; first render does not', async () => {
    const el = await mount();
    expect(el.shadowRoot!.textContent).not.toContain("Someone's at the door");
    const h2 = { ...el.hass, states: { ...el.hass.states, 'event.bell': { ...el.hass.states['event.bell'], state: '2026-09-27T18:05:00.000+00:00' } } };
    el.hass = h2; await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain("Someone's at the door");
  });
  it('night screen shows safety alerts and wakes on tap', async () => {
    const h = mk(); h.states['input_boolean.night'] = { ...h.states['input_boolean.night'], state: 'on' };
    const el = await mount(h);
    const night = el.shadowRoot!.querySelector('.night') as HTMLElement;
    expect(night.textContent).toContain('Garage Door is open');
    night.click(); await Promise.resolve();
    expect(el.hass.calls.at(-1)).toEqual(['input_boolean', 'turn_off', {}, { entity_id: 'input_boolean.night' }]);
  });
  it('hold-to-unlock acts after 1 s and not on a short press', async () => {
    vi.useFakeTimers();
    const el = await mount();
    el.ring(); await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('[data-hold="lock.front"]') as HTMLElement;
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    vi.advanceTimersByTime(400);
    btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true }));
    vi.advanceTimersByTime(1000);
    expect(el.hass.calls.length).toBe(0);
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    vi.advanceTimersByTime(1001);
    expect(el.hass.calls.at(-1)).toEqual(['lock', 'unlock', {}, { entity_id: 'lock.front' }]);
    vi.useRealTimers();
  });
  it('shows a Talk button in the doorbell takeover when a doorbell speaker is configured', async () => {
    const el = await mount();
    el.setConfig({ ...cfg, home: { doorbell: { ...cfg.home.doorbell, speaker: 'media_player.door_speaker' } } });
    el.ring(); await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Pick a reply to say at the door');
  });
  it('swallows the synthesized click after a completed hold, so it does not double-fire', async () => {
    vi.useFakeTimers();
    const el = await mount();
    el.ring(); await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('[data-hold="lock.front"]') as HTMLElement;
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    vi.advanceTimersByTime(1001);
    btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true }));
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await Promise.resolve();
    const lockCalls = el.hass.calls.filter((c: unknown[]) => c[0] === 'lock');
    expect(lockCalls).toEqual([['lock', 'unlock', {}, { entity_id: 'lock.front' }]]);
    vi.useRealTimers();
  });
  it('swallows the click after a long hold (> 1.8 s) too — window measured from pointerup (Minor c)', async () => {
    vi.useFakeTimers();
    const el = await mount();
    el.ring(); await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('[data-hold="lock.front"]') as HTMLElement;
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    vi.advanceTimersByTime(1001);
    await el.updateComplete;                                  // re-rendered as "Lock" (tap) after the optimistic unlock
    vi.advanceTimersByTime(1500);                             // finger still down: total press ~2.5 s
    btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true }));
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await Promise.resolve();
    expect(el.hass.calls.filter((c: unknown[]) => c[0] === 'lock')).toEqual([['lock', 'unlock', {}, { entity_id: 'lock.front' }]]);
    vi.useRealTimers();
  });
  it('suppresses the context menu on hold targets', async () => {
    const el = await mount();
    el.ring(); await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('[data-hold="lock.front"]') as HTMLElement;
    const ev = new MouseEvent('contextmenu', { bubbles: true, composed: true, cancelable: true });
    btn.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
  it('a ring during night mode shows the takeover above the night screen, then night again (Important 5)', async () => {
    const h = mk(); h.states['input_boolean.night'] = { ...h.states['input_boolean.night'], state: 'on' };
    const el = await mount(h);
    expect(el.shadowRoot!.querySelector('.night')).not.toBeNull();
    el.hass = { ...el.hass, states: { ...el.hass.states, 'event.bell': { ...el.hass.states['event.bell'], state: '2026-09-27T18:05:00.000+00:00' } } };
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain("Someone's at the door");
    expect(el.shadowRoot!.querySelector('.scrim.doorbell')).not.toBeNull();   // .scrim.doorbell stacks above .night
    const dismiss = [...el.shadowRoot!.querySelectorAll('.big-btn')].find((b: any) => b.textContent.includes('Dismiss')) as HTMLElement;
    dismiss.click(); await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain("Someone's at the door");
    expect(el.shadowRoot!.querySelector('.night')).not.toBeNull();
    expect(el.hass.calls.filter((c: unknown[]) => c[0] === 'input_boolean')).toEqual([]);   // the helper was never turned off
  });
  it('restarts the takeover countdown when the card reconnects mid-ring (Minor f)', async () => {
    vi.useFakeTimers();
    const el = await mount();
    el.ring(); await el.updateComplete;
    document.body.removeChild(el);                            // e.g. dashboard view switch; clears the ring timer
    document.body.appendChild(el); await el.updateComplete;
    vi.advanceTimersByTime(46_000);
    await el.updateComplete;
    expect(el._overlay).toBeNull();
    expect(el.shadowRoot!.textContent).not.toContain("Someone's at the door");
    vi.useRealTimers();
  });
});
