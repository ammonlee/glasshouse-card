import '../src/glasshouse-card';
import { makeHass } from './helpers/hass';

// Own file: defines the global ha-camera-stream element, which would change camera rendering in other tests.
describe('ha-camera-stream loading (Important 6)', () => {
  it('force-loads the stream element via a picture-entity card and re-renders when it gets defined', async () => {
    const createCardElement = vi.fn();
    const w = window as any;
    w.loadCardHelpers = vi.fn(async () => ({ createCardElement }));
    const h = makeHass([{ entity_id: 'camera.door', state: 'recording', attributes: { access_token: 't' } }]);
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', home: { doorbell: { camera: 'camera.door' } } });
    el.hass = h; document.body.appendChild(el); await el.updateComplete;
    for (let i = 0; i < 3; i++) await Promise.resolve();
    expect(w.loadCardHelpers).toHaveBeenCalledTimes(1);
    expect(createCardElement).toHaveBeenCalledWith({ type: 'picture-entity', entity: 'camera.door', camera_view: 'live' });

    el.openOverlay({ kind: 'camera', entity: 'camera.door', name: 'Front Door' }); await el.updateComplete;
    expect(el.shadowRoot!.querySelector('ha-camera-stream')).toBeNull();          // MJPEG fallback for now
    const rev = el._rev;
    customElements.define('ha-camera-stream', class extends HTMLElement {});
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(el._rev).toBeGreaterThan(rev);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('ha-camera-stream')).not.toBeNull();

    // once per page: a second card doesn't load helpers again
    const el2 = document.createElement('glasshouse-card') as any;
    el2.setConfig({ type: 'custom:glasshouse-card', home: { doorbell: { camera: 'camera.door' } } });
    el2.hass = h; document.body.appendChild(el2); await el2.updateComplete;
    expect(w.loadCardHelpers).toHaveBeenCalledTimes(1);
    delete w.loadCardHelpers;
  });
});
