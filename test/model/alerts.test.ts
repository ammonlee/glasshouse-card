import { makeHass } from '../helpers/hass';
import { computeAlerts, capsule } from '../../src/model/alerts';

const now = Date.parse('2026-09-27T12:00:00Z');
const h = makeHass([
  { entity_id: 'cover.garage', state: 'open', attributes: { friendly_name: 'Garage Door', device_class: 'garage' }, last_changed: '2026-09-27T11:42:00Z' },
  { entity_id: 'lock.back', state: 'unlocked', attributes: { friendly_name: 'Back Door' } },
  { entity_id: 'lock.front', state: 'locked', attributes: { friendly_name: 'Front Door' } },
  { entity_id: 'sensor.co2', state: '1373', attributes: { unit_of_measurement: 'ppm' } },
  { entity_id: 'sensor.co2_bad', state: 'unknown' },
  { entity_id: 'sensor.aqi_gone', state: 'unavailable' },
  { entity_id: 'binary_sensor.leak', state: 'on', attributes: { friendly_name: 'Leak', device_class: 'moisture' } },
  { entity_id: 'vacuum.sludge', state: 'error', attributes: { friendly_name: 'The Sludge' } },
]);

describe('computeAlerts', () => {
  it('orders safety before nudge and keeps config order inside a tier', () => {
    const a = computeAlerts(h, {
      nudge: ['lock.back', { entity: 'sensor.co2', above: 1200, label: 'Air quality poor', icon: 'wind' }],
      safety: ['cover.garage', 'binary_sensor.leak'],
    }, now);
    expect(a.map((x) => x.entity)).toEqual(['cover.garage', 'binary_sensor.leak', 'lock.back', 'sensor.co2']);
  });
  it('builds titles, subs, icons and actions per domain', () => {
    const [g, , b, co2] = computeAlerts(h, { safety: ['cover.garage', 'binary_sensor.leak'], nudge: ['lock.back', { entity: 'sensor.co2', above: 1200, label: 'Air quality poor', icon: 'wind' }] }, now);
    expect(g).toMatchObject({ title: 'Garage Door open', sub: 'Open 18 min', icon: 'warehouse', action: { label: 'Close', domain: 'cover', service: 'close_cover' } });
    expect(b).toMatchObject({ title: 'Back Door unlocked', icon: 'lock-open', action: { label: 'Lock', domain: 'lock', service: 'lock' } });
    expect(co2).toMatchObject({ title: 'Air quality poor', sub: '1373 ppm', icon: 'wind' });
  });
  it('ignores inactive and non-numeric entities (Review Focus 1)', () => {
    const a = computeAlerts(h, { nudge: ['lock.front', { entity: 'sensor.co2_bad', above: 1 }, { entity: 'sensor.aqi_gone', below: 5 }, 'sensor.not_there'] }, now);
    expect(a).toEqual([]);
  });
  it('supports an explicit state match', () => {
    const a = computeAlerts(h, { nudge: [{ entity: 'vacuum.sludge', state: 'error', label: 'The Sludge is stuck', icon: 'bot' }] }, now);
    expect(a[0]).toMatchObject({ title: 'The Sludge is stuck', icon: 'bot' });
  });
});

describe('capsule', () => {
  it('shows the top alert with +N more', () => {
    const a = computeAlerts(h, { safety: ['cover.garage'], nudge: ['lock.back'] }, now);
    expect(capsule(a)).toEqual({ kind: 'red', icon: 'warehouse', title: 'Garage Door open', sub: 'Open 18 min · +1 more' });
  });
  it('is amber for nudges only and green when clear', () => {
    expect(capsule(computeAlerts(h, { nudge: ['lock.back'] }, now)).kind).toBe('amber');
    expect(capsule([], 'House is secure')).toEqual({ kind: 'green', icon: 'shield-check', title: 'House is secure', sub: 'Doors locked · no alerts' });
  });
});
