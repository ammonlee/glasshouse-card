import { html } from 'lit';
import type { Model } from '../model/index';
import type { GlasshouseCard } from '../glasshouse-card';
import { icon } from '../icons';
import { seg, tileIcon } from './shared';
import { setpointCall, modeService, type Mode } from '../model/climate';

const C = 754, SWEEP = 565.5, LO = 50, HI = 90;
const pos = (v: number | null) => (v == null ? 0 : Math.max(0, Math.min(1, (v - LO) / (HI - LO))) * SWEEP);

export function climateView(m: Model, card: GlasshouseCard) {
  const t = m.thermostat, a = m.air;
  const heating = t?.action === 'heating';
  const sp = (d: number) => { const call = t && setpointCall(t, d); if (call) card.callSvc('climate', 'set_temperature', call.data, { entity_id: t!.entity }); };
  const chip = (v: string, label: string, bad: boolean) => bad
    ? html`<div class="col" style="height:60px;border-radius:22px;align-items:center;justify-content:center;line-height:1.2;background:linear-gradient(160deg,rgba(255,176,60,.34),rgba(255,176,60,.1));border:1px solid rgba(255,200,120,.45)"><span style="font-size:17px;font-weight:600;color:#FFE6C2">${v}</span><span style="font-size:11px;color:#FFE0B0">${label}</span></div>`
    : html`<div class="col" style="height:60px;border-radius:22px;align-items:center;justify-content:center;line-height:1.2;background:rgba(255,255,255,.08)"><span style="font-size:17px;font-weight:600">${v}</span><span style="font-size:11px;color:var(--subtle)">${label}</span></div>`;
  const conditioning = m.climRooms.filter((r) => r.tone === 'cold' || r.tone === 'warm').length;
  return html`<div class="view" style="display:grid;grid-template-columns:${t ? '400px ' : ''}minmax(0,1fr);gap:16px">
    ${t ? html`<div class="glass col" style="padding:20px;align-items:center;gap:14px">
      <div class="row" style="align-self:stretch;justify-content:space-between;padding:0 4px;font-size:13px;color:var(--muted)"><span>${card.view.states[t.entity]?.attributes.friendly_name || 'Thermostat'}</span><span style=${t.actionColor ? `color:${t.actionColor};font-weight:500` : ''}>${t.actionLabel}</span></div>
      <div style="position:relative;width:260px;height:250px">
        <svg width="260" height="260" viewBox="0 0 280 280" style="position:absolute;top:0;left:0">
          <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${SWEEP} ${C}" transform="rotate(135 140 140)"></circle>
          <circle cx="140" cy="140" r="120" fill="none" stroke=${heating ? '#F48585' : '#ADB5E5'} stroke-width="14" stroke-linecap="round" stroke-dasharray="${pos(t.current).toFixed(1)} ${C}" transform="rotate(135 140 140)"></circle>
          <circle cx="140" cy="140" r="120" fill="none" stroke="#A7C7E5" stroke-width="18" stroke-linecap="round" stroke-dasharray="1 ${C}" stroke-dashoffset="${-pos(t.cool).toFixed(1)}" stroke-opacity=${t.cool != null ? 1 : 0} transform="rotate(135 140 140)"></circle>
          <circle cx="140" cy="140" r="120" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-dasharray="1 ${C}" stroke-dashoffset="${-pos(t.heat).toFixed(1)}" stroke-opacity=${t.heat != null ? 1 : 0} transform="rotate(135 140 140)"></circle>
        </svg>
        <div class="col" style="position:absolute;inset:0;align-items:center;justify-content:center;padding-bottom:10px">
          <span style="font-size:13px;color:var(--subtle)">Indoors</span>
          <span class="num" style="font-size:84px;font-weight:200;letter-spacing:-.05em;line-height:1">${t.current ?? '—'}°</span>
          <span style="font-size:14px;white-space:nowrap;color:rgba(255,255,255,.8)">${[t.heat != null ? `Heat ${t.heat}°` : null, t.cool != null ? `Cool ${t.cool}°` : null].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <div class="row" style="gap:14px">
        <div class="btn" style="width:64px;height:64px" @click=${() => sp(-1)}>${icon('minus', 24)}</div>
        <div style="width:110px;text-align:center;font-size:13px;line-height:1.4;color:var(--subtle)">${t.mode === 'off' ? 'System is off' : 'Tap to adjust'}</div>
        <div class="btn" style="width:64px;height:64px" @click=${() => sp(1)}>${icon('plus', 24)}</div>
      </div>
      <div style="align-self:stretch">${seg([['auto', 'Auto'], ['heat', 'Heat'], ['cool', 'Cool'], ['off', 'Off']], t.mode, (v) => card.callSvc('climate', 'set_hvac_mode', { hvac_mode: modeService(v as Mode) }, { entity_id: t.entity }), 48)}</div>
      <div style="align-self:stretch;display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${chip(t.humidity != null ? `${t.humidity}%` : '—', 'Humidity', false)}${chip(a.co2 != null ? a.co2.toLocaleString('en-US') : '—', 'CO₂ ppm', a.co2Bad)}${chip(a.aqi != null ? String(a.aqi) : '—', 'Air quality', a.aqiBad)}
      </div>
    </div>` : ''}
    <div class="col" style="min-width:0;min-height:0;gap:12px">
      <div class="row" style="height:48px;gap:16px;padding-left:4px">
        <span style="font-size:22px;font-weight:600;letter-spacing:-.01em">Rooms</span>
        <div class="row" style="gap:14px;font-size:13px;color:var(--muted)">${[['#A7C7E5', 'Too cold'], ['#62D7AC', 'On target'], ['#F48585', 'Too warm']].map(([c, l]) => html`<span class="row" style="gap:6px"><span style="width:10px;height:10px;border-radius:5px;background:${c}"></span>${l}</span>`)}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-auto-rows:172px;gap:10px">
        ${m.climRooms.map((r) => html`<div class="tile t-${r.tone}" style="flex-direction:column;gap:6px">
          <div class="row" style="justify-content:space-between;gap:6px"><span class="ellip" style="font-size:14px;font-weight:600">${r.name}</span>${icon(r.occupied == null ? 'minus' : r.occupied ? 'user' : 'user-x', 16, `color:${r.occupied ? '#fff' : 'rgba(255,255,255,.4)'}`)}</div>
          <span class="num" style="font-size:36px;font-weight:300;letter-spacing:-.03em;line-height:1.05;color:var(--ic)">${r.temp == null ? '—' : `${r.temp.toFixed(1)}°`}</span>
          <span style="font-size:13px;color:var(--muted)">${r.temp == null ? 'No sensor' : r.target == null ? 'No target set' : `Target ${r.target}°`}</span>
          <div class="grow"></div>
          <div class="row" style="justify-content:space-between;font-size:12px;color:var(--subtle)"><span class="row" style="gap:4px">${icon('air-vent', 13)}Vents</span><span class="num">${r.vent}%</span></div>
          <div class="bar"><span style="width:${r.vent}%;background:rgba(255,255,255,.85)"></span></div>
        </div>`)}
      </div>
      ${m.climRooms.length ? html`<div class="glass row" style="height:48px;border-radius:24px;padding:0 18px;gap:14px;font-size:13px;white-space:nowrap;color:rgba(255,255,255,.8)">
        <span class="row" style="gap:6px"><span style="width:8px;height:8px;border-radius:4px;background:#62D7AC;box-shadow:0 0 8px #62D7AC"></span>${conditioning} room${conditioning === 1 ? '' : 's'} off target</span>
      </div>` : ''}
      <div style="flex:1;min-height:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px">
        ${m.toggles.map((x) => html`<div class="tile t-${x.tone}" data-test="toggle-${x.entity}" style="flex-direction:column;justify-content:space-between" @click=${() => { if (x.tone !== 'na') card.act(x.entity); }}>
          ${tileIcon(x.icon, 40, 19)}<div class="col" style="line-height:1.25"><span style="font-size:14px;font-weight:600">${x.name}</span><span class="st" style="font-size:12px">${x.state}</span></div></div>`)}
      </div>
    </div>
  </div>`;
}
