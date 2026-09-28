import { html } from 'lit';
import { icon } from '../icons';
import type { Model, Tab } from '../model/index';
import { fmtClock } from './shared';

const NAV: Record<Tab, [string, string]> = { home: ['house', 'Home'], security: ['shield', 'Security'], rooms: ['lamp', 'Rooms'], climate: ['thermometer', 'Climate'], garage: ['car-front', 'Garage'], family: ['users', 'Family'] };

export function header(m: Model, connected: boolean, onAlerts: () => void) {
  const w = m.weather, c = m.capsule;
  return html`<div class="header">
    <div class="row" style="gap:14px;padding-left:6px">
      <span class="clock num">${fmtClock(m.now)}</span>
      <div class="col" style="font-size:14px;line-height:1.3;color:var(--muted)">
        <span style="color:#fff;font-weight:500">${m.now.toLocaleDateString('en-US', { weekday: 'long' })}</span>
        <span>${m.now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span></div>
    </div>
    ${w ? html`<div class="capsule" style="padding:0 20px 0 14px;gap:12px">
      ${icon(w.icon, 26, 'color:#FFD660')}
      <span style="font-size:26px;font-weight:500;letter-spacing:-.02em">${w.temp ?? '—'}°</span>
      <div class="col" style="font-size:12px;line-height:1.3;color:var(--muted)"><span style="color:#fff">${w.cond}</span>
        ${w.hi != null ? html`<span>H ${w.hi}° · L ${w.lo ?? '—'}°</span>` : ''}</div></div>` : ''}
    ${connected ? '' : html`<div class="offline-chip">${icon('wifi-off', 16)}Reconnecting…</div>`}
    <div class="grow"></div>
    <div class="capsule alert-cap ${c.kind}" @click=${onAlerts}>
      <div class="dot">${icon(c.icon)}</div>
      <div class="col" style="line-height:1.25"><span style="font-size:14px;font-weight:600">${c.title}</span>
        <span style="font-size:12px;color:${c.kind === 'red' ? '#FFD6D6' : c.kind === 'amber' ? '#FFF0C2' : '#D2F5E8'}">${c.sub}</span></div>
    </div>
    ${m.people.length ? html`<div class="capsule" style="padding:0 8px;gap:6px">${m.people.map((p) => html`
      <div class="avatar" style="background:${p.home ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.04)'};color:${p.home ? '#fff' : 'rgba(255,255,255,.4)'};box-shadow:inset 0 0 0 2px ${p.inRoom ? p.color : 'transparent'}">${p.initials}
        ${p.inRoom
          ? html`<span style="position:absolute;right:-4px;bottom:-4px;width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:${p.color};color:#0B0F1E;box-shadow:0 0 0 2px rgba(11,15,30,.7)">${icon('bed-double', 10)}</span>`
          : html`<span style="position:absolute;right:0;bottom:0;width:10px;height:10px;border-radius:5px;background:${p.home ? '#62D7AC' : 'rgba(255,255,255,.3)'};box-shadow:0 0 0 2px rgba(11,15,30,.7)"></span>`}
      </div>`)}</div>` : ''}
  </div>`;
}

export const rail = (tabs: Tab[], sel: Tab, onNav: (t: Tab) => void) => html`<div class="row"><div class="rail capsule">${tabs.map((t) =>
  html`<div class="nav ${t === sel ? 'sel' : ''}" @click=${() => onNav(t)}>${icon(NAV[t][0], 22)}<span>${NAV[t][1]}</span></div>`)}</div></div>`;
