import { makeHass } from './helpers/hass';
import { Overrides } from '../src/overrides';
import { toggleCall, groupCall, needsHold, run } from '../src/actions';
import { RingDetector } from '../src/doorbell';

const h = makeHass([
  { entity_id: 'lock.front', state: 'locked' },
  { entity_id: 'lock.back', state: 'unlocked' },
  { entity_id: 'cover.garage', state: 'closed', attributes: { device_class: 'garage' } },
  { entity_id: 'cover.blinds', state: 'closed', attributes: { device_class: 'blind' } },
  { entity_id: 'switch.kitchen', state: 'off' },
  { entity_id: 'sensor.x', state: '1' },
]);

describe('toggleCall', () => {
  it('maps domains to services with optimistic state', () => {
    expect(toggleCall(h, 'lock.front')).toEqual({ domain: 'lock', service: 'unlock', target: { entity_id: 'lock.front' }, optimistic: [['lock.front', 'unlocked']] });
    expect(toggleCall(h, 'cover.garage')).toMatchObject({ service: 'open_cover', optimistic: [['cover.garage', 'opening']] });
    expect(toggleCall(h, 'switch.kitchen')).toMatchObject({ domain: 'switch', service: 'turn_on' });
    expect(toggleCall(h, 'sensor.x')).toBeNull();
  });
  it('groups lights across domains', () => {
    expect(groupCall(['switch.a', 'light.b'], false)).toEqual({ domain: 'homeassistant', service: 'turn_off', target: { entity_id: ['switch.a', 'light.b'] }, optimistic: [['switch.a', 'off'], ['light.b', 'off']] });
  });
});

describe('needsHold', () => {
  it('holds only for opening/unlocking of default risky entities', () => {
    expect(needsHold(h, 'lock.front')).toBe(true);
    expect(needsHold(h, 'lock.back')).toBe(false);
    expect(needsHold(h, 'cover.garage')).toBe(true);
    expect(needsHold(h, 'cover.blinds')).toBe(false);
    expect(needsHold(h, 'cover.garage', ['lock.front'])).toBe(false);
  });
  it('derives the hold from the action that would run (closing/opening covers, transitional locks)', () => {
    const t = makeHass([
      { entity_id: 'cover.closing', state: 'closing', attributes: { device_class: 'garage' } },
      { entity_id: 'cover.opening', state: 'opening', attributes: { device_class: 'garage' } },
      { entity_id: 'cover.open', state: 'open', attributes: { device_class: 'garage' } },
      { entity_id: 'lock.unlocking', state: 'unlocking' },
      { entity_id: 'lock.jammed', state: 'jammed' },
      { entity_id: 'lock.locking', state: 'locking' },
    ]);
    expect(toggleCall(t, 'cover.closing')?.service).toBe('open_cover');
    expect(needsHold(t, 'cover.closing')).toBe(true);
    expect(needsHold(t, 'cover.opening')).toBe(false);
    expect(needsHold(t, 'cover.open')).toBe(false);
    expect(needsHold(t, 'lock.unlocking')).toBe(false);
    expect(needsHold(t, 'lock.jammed')).toBe(false);
    expect(needsHold(t, 'lock.locking')).toBe(false);
  });
  it('alarm panels need a hold only to disarm (whenever armed or triggered)', () => {
    const t = makeHass([{ entity_id: 'alarm_control_panel.a', state: 'armed_away' }, { entity_id: 'alarm_control_panel.d', state: 'disarmed' }, { entity_id: 'alarm_control_panel.t', state: 'triggered' }]);
    expect(needsHold(t, 'alarm_control_panel.a')).toBe(true);
    expect(needsHold(t, 'alarm_control_panel.a', [])).toBe(true);
    expect(needsHold(t, 'alarm_control_panel.t')).toBe(true);
    expect(needsHold(t, 'alarm_control_panel.d')).toBe(false);
  });
  it('an optimistic closing after a Close tap requires a hold to re-open', async () => {
    const t = makeHass([{ entity_id: 'cover.g', state: 'open', attributes: { device_class: 'garage' } }]);
    const ov = new Overrides();
    expect(needsHold(t, 'cover.g')).toBe(false);
    await run(t, ov, toggleCall(t, 'cover.g')!, t0h);
    const view = { ...t, states: ov.apply(t.states) };
    expect(view.states['cover.g'].state).toBe('closing');
    expect(toggleCall(view, 'cover.g')?.service).toBe('open_cover');
    expect(needsHold(view, 'cover.g')).toBe(true);
  });
});
const t0h = 1_000_000;

describe('Overrides', () => {
  const t0 = 1_000_000;
  it('applies and expires after 10 s', () => {
    const ov = new Overrides();
    ov.set('lock.front', 'unlocked', h.states['lock.front'], t0);
    expect(ov.apply(h.states)['lock.front'].state).toBe('unlocked');
    expect(h.states['lock.front'].state).toBe('locked');
    ov.prune(h.states, t0 + 10_001);
    expect(ov.size).toBe(0);
  });
  it('keeps through transitional updates, clears on any settled update (Review Focus 5)', () => {
    const ov = new Overrides();
    ov.set('lock.front', 'unlocked', h.states['lock.front'], t0);
    ov.prune({ ...h.states, 'lock.front': { ...h.states['lock.front'], state: 'unlocking', last_updated: 'later' } }, t0 + 100);
    expect(ov.size).toBe(1);
    ov.prune({ ...h.states, 'lock.front': { ...h.states['lock.front'], state: 'jammed', last_updated: 'later2' } }, t0 + 200);
    expect(ov.size).toBe(0);
  });
  it('run() rolls back when the call fails', async () => {
    const ov = new Overrides();
    const bad = { ...h, callService: async () => { throw new Error('jammed'); } };
    await expect(run(bad, ov, toggleCall(h, 'lock.front')!, t0)).rejects.toThrow('jammed');
    expect(ov.size).toBe(0);
  });
  it('run() calls the service', async () => {
    const ov = new Overrides();
    await run(h, ov, toggleCall(h, 'switch.kitchen')!, t0);
    expect(h.calls.at(-1)).toEqual(['switch', 'turn_on', {}, { entity_id: 'switch.kitchen' }]);
    expect(ov.size).toBe(1);
  });
});

describe('RingDetector (Review Focus 4)', () => {
  it('never rings on first render or for unavailable', () => {
    const r = new RingDetector();
    expect(r.seen('2026-09-27T18:00:00.000+00:00')).toBe(false);
    expect(r.seen('2026-09-27T18:00:00.000+00:00')).toBe(false);
    expect(r.seen('unavailable')).toBe(false);
    expect(r.seen('2026-09-27T18:05:00.000+00:00')).toBe(true);
  });
  it('primes on unavailable without ringing when it later becomes a timestamp', () => {
    const r = new RingDetector();
    expect(r.seen('unavailable')).toBe(false);
    expect(r.seen('2026-09-27T18:05:00.000+00:00')).toBe(false);
    expect(r.seen('2026-09-27T18:06:00.000+00:00')).toBe(true);
  });
});
