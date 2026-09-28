import { html } from 'lit';
import type { Model } from '../model/index';
import type { GlasshouseCard } from '../glasshouse-card';
import { icon } from '../icons';
import { camera } from './camera';
import { missingNote, tileIcon } from './shared';
import { val, fname, attr, minsSince, domainOf, exists } from '../model/util';
import { toggleCall } from '../actions';

const SLOTS: Array<[string, string]> = [['1 / 3', '1 / 3'], ['3', '1'], ['4', '1'], ['3', '2'], ['4', '2'], ['1', '3'], ['2', '3']];

export function securityView(m: Model, card: GlasshouseCard) {
  const s = card._config.security || {}, h = card.view;
  const cams = (s.cameras || []).slice(0, 7).map((c) => (typeof c === 'string' ? { entity: c, name: undefined } : c));
  const alertIds = new Set(m.alerts.map((a) => a.entity));
  const doorRow = (id: string) => {
    const d = domainOf(id), st = val(h, id), name = fname(h, id);
    const na = !exists(h, id);
    // The button label is the action a tap would actually run (same source as needsHold).
    const svc = toggleCall(h, id)?.service;
    let state: string, tone: string, action: string, ic: string;
    if (d === 'lock') { const locked = st === 'locked'; state = na ? 'Unavailable' : locked ? 'Locked' : st === 'jammed' ? 'Jammed' : 'Unlocked'; tone = na ? 'na' : locked ? 'ok' : 'nudge'; action = svc === 'unlock' ? 'Unlock' : 'Lock'; ic = locked ? 'lock' : 'lock-open'; }
    else { const open = st === 'open' || st === 'opening'; state = na ? 'Unavailable' : open ? `Open ${minsSince(h.states[id].last_changed, +m.now)} min` : st === 'closing' ? 'Closing…' : 'Closed'; tone = na ? 'na' : alertIds.has(id) ? 'alert' : open ? 'nudge' : 'off'; action = svc === 'open_cover' ? 'Open' : 'Close'; ic = 'warehouse'; }
    const hold = card.needsHold(id);
    return html`<div class="tile t-${tone}" style="height:52px;border-radius:20px;padding:0 6px 0 8px;align-items:center;gap:10px">
      ${tileIcon(ic, 36, 17)}
      <div class="col grow" style="line-height:1.25"><span class="ellip" style="font-size:15px;font-weight:600">${name}</span><span class="ellip st" style="font-size:12px">${state}${hold ? ' · hold' : ''}</span></div>
      ${na ? '' : html`<div class="btn" data-test="door-${id}" data-hold=${hold ? id : ''} @click=${() => card.tap(id)}
        style="height:42px;padding:0 14px;font-size:14px;box-shadow:none;position:relative;overflow:hidden;background:${tone === 'alert' ? '#ED4040' : 'rgba(255,255,255,.14)'}">${action}<div class="hold-fill"></div></div>`}
    </div>`;
  };
  const sensorRow = (id: string) => {
    const dc = attr<string>(h, id, 'device_class'), st = val(h, id), bad = st === 'on' && (dc === 'moisture' || dc === 'smoke');
    const text = !exists(h, id) ? '—' : dc === 'moisture' ? (st === 'on' ? 'LEAK' : 'Dry') : dc === 'smoke' ? (st === 'on' ? 'ALARM' : 'Quiet') : dc === 'opening' || dc === 'door' ? (st === 'on' ? 'Open' : 'Closed') : st === 'on' ? 'On' : st === 'off' ? 'Off' : `${st}${attr<string>(h, id, 'unit_of_measurement') || ''}`;
    const c = bad ? '#FFD6D6' : dc === 'moisture' ? '#98E6CA' : 'rgba(255,255,255,.62)';
    const ic = dc === 'moisture' ? 'droplets' : dc === 'smoke' ? 'siren' : /valve|water/.test(id) ? 'droplet' : 'door-closed';
    return html`<div class="row" style="min-width:0;height:44px;border-radius:16px;padding:0 10px;gap:8px;font-size:13px;background:${bad ? 'rgba(237,64,64,.3)' : 'rgba(255,255,255,.07)'}">${icon(ic, 16, `color:${c}`)}<span class="ellip grow">${fname(h, id)}</span><span style="font-weight:500;color:${c}">${text}</span></div>`;
  };
  const alarm = s.alarm, as = val(h, alarm) || 'unavailable';
  const armed = { disarmed: 'Disarmed', armed_home: 'Armed · Home', armed_away: 'Armed · Away', armed_night: 'Armed · Night', armed_vacation: 'Armed · Vacation', armed_custom_bypass: 'Armed · Custom', arming: 'Arming…', pending: 'Pending…', triggered: 'TRIGGERED' }[as] || 'Unavailable';
  // Disarmed: one single-tap button per arm mode the panel supports (supported_features bits; both Home and Away
  // when the panel doesn't report them). Armed / arming / pending / triggered: one Disarm button behind the 1 s hold.
  const feats = attr<number>(h, alarm, 'supported_features');
  const MODES: Array<[number, string, string, string, string]> = [[1, 'alarm_arm_home', 'armed_home', 'house', 'Home'], [2, 'alarm_arm_away', 'armed_away', 'shield-check', 'Away'], [4, 'alarm_arm_night', 'armed_night', 'moon', 'Night']];
  const armModes = MODES.filter(([bit]) => (feats == null ? bit !== 4 : (feats & bit) !== 0));
  const disarmHold = !!alarm && card.needsHold(alarm);
  const alarmButtons = () => {
    if (as === 'disarmed') return armModes.map(([, svc, st, ic, label]) => html`<div class="btn" data-test="arm-${st}" @click=${() => card.callSvc('alarm_control_panel', svc, {}, { entity_id: alarm! })}
      style="height:56px;padding:0 16px;font-size:14px;gap:6px">${icon(ic, 16)}${label}</div>`);
    if (!disarmHold) return '';
    const hot = as === 'triggered' || as === 'pending';
    return html`<div class="btn" data-test="disarm" data-hold=${alarm!} style="height:56px;padding:0 18px;font-size:14px;gap:6px;position:relative;overflow:hidden;${hot ? 'background:#ED4040;color:#fff' : 'background:rgba(173,181,229,.35);color:#fff'}">${icon('shield', 16)}Disarm<div class="hold-fill"></div></div>`;
  };

  return html`<div class="view" style="display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:16px">
    <div style="min-height:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:12px">
      ${cams.map((c, i) => html`<div class="cam-bg" style="border-radius:26px;grid-column:${SLOTS[i][0]};grid-row:${SLOTS[i][1]};box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 10px 30px rgba(0,0,0,.3)"
          @click=${() => card.openOverlay({ kind: 'camera', entity: c.entity, name: c.name || fname(h, c.entity) })}>
        ${camera(card, c.entity, { label: c.entity })}
        <div class="chip" style="position:absolute;top:10px;left:10px;height:32px;padding:0 12px;gap:7px;font-weight:600">${exists(h, c.entity) ? html`<span class="live-dot"></span>` : icon('wifi-off', 13)}${c.name || fname(h, c.entity).replace(/ High resolution channel$/, '')}</div>
        ${missingNote(m.missing, [c.entity])}
      </div>`)}
      <div class="glass col" style="grid-column:3 / 5;grid-row:3;border-radius:26px;padding:14px 16px;gap:8px">
        <div class="row" style="justify-content:space-between"><span style="font-size:15px;font-weight:600">Recent activity</span><span style="font-size:12px;color:var(--subtle)">AI timeline</span></div>
        ${m.feed.length ? m.feed.map((x) => html`<div class="row" style="gap:10px;font-size:13px"><span class="num" style="width:58px;flex:none;color:var(--subtle)">${x.time}</span>${icon(x.icon, 15, 'color:#CBD0EF')}<span class="ellip">${x.what}</span></div>`)
          : html`<span style="font-size:13px;color:var(--subtle)">Nothing in the last 12 hours</span>`}
      </div>
    </div>
    <div class="col" style="min-height:0;gap:12px">
      ${alarm ? html`<div class="glass row" style="border-radius:28px;padding:14px;gap:12px">
        <div class="btn circle" style=${as.startsWith('armed') ? 'background:rgba(173,181,229,.35)' : as === 'triggered' ? 'background:#ED4040' : ''}>${icon(as === 'disarmed' ? 'shield' : 'shield-check', 22)}</div>
        <div class="col grow" style="line-height:1.25"><span style="font-size:16px;font-weight:600">${armed}</span><span style="font-size:12px;color:var(--subtle)">${fname(h, alarm)}${as !== 'disarmed' && disarmHold ? ' · hold Disarm for 1 s' : ''}</span></div>
        <div class="row" style="gap:8px">${alarmButtons()}</div>
      </div>` : ''}
      ${(s.locks?.length || s.covers?.length) ? html`<div class="glass col" style="border-radius:28px;padding:14px;gap:6px"><span class="eyebrow" style="padding:2px 6px 4px">Doors</span>
        ${[...(s.locks || []), ...(s.covers || [])].map(doorRow)}</div>` : ''}
      ${s.sensors?.length ? html`<div class="glass" style="flex:1;min-height:0;border-radius:28px;padding:14px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px;align-content:start">
        <span class="eyebrow" style="grid-column:1 / 3;padding:2px 6px 4px">Sensors &amp; water</span>${s.sensors.map(sensorRow)}</div>` : ''}
    </div>
  </div>`;
}
