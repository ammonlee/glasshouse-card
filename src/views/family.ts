import { html } from 'lit';
import type { Model } from '../model/index';
import type { GlasshouseCard } from '../glasshouse-card';
import { icon } from '../icons';
import { choreList, laundryCard, rollCallButton } from './home';

const CIRC = 163.4;

export function familyView(m: Model, card: GlasshouseCard) {
  const f = card._config.family || {}, s = m.sprinklers, mw = m.mower, tub = m.hotTub;
  const hasChores = !!card._config.home?.chores;
  return html`<div class="view" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">
    <div class="col" style="min-height:0;gap:16px">
      ${hasChores ? html`<div class="glass col" style="gap:10px">${choreList(m, card, 66, rollCallButton(card, true))}</div>` : ''}
      ${m.brushing.length ? html`<div class="glass col" style="flex:1;min-height:0;gap:6px">
        <div class="row" style="justify-content:space-between;padding-left:4px"><span style="font-size:18px;font-weight:600">Brushing tonight</span><span style="font-size:12px;color:var(--subtle)">2-minute goal</span></div>
        <div class="grow" style="display:grid;grid-template-columns:repeat(3,1fr);align-items:center">${m.brushing.map((b) => html`<div class="col" style="align-items:center;gap:4px">
          <div style="position:relative;width:64px;height:64px"><svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="6"></circle>
            <circle data-test="brush-progress" cx="32" cy="32" r="26" fill="none" stroke-width="6" stroke-linecap="round" transform="rotate(-90 32 32)" stroke-opacity=${b.seconds > 0 ? 1 : 0} stroke=${b.done ? '#62D7AC' : '#FFD660'} stroke-dasharray="${((b.pct / 100) * CIRC).toFixed(1)} ${CIRC}"></circle>
          </svg>
            <span class="num" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600">${b.time}</span></div>
          <span style="font-size:12px;color:rgba(255,255,255,.8)">${b.name}</span></div>`)}</div>
      </div>` : ''}
    </div>
    <div class="col" style="min-height:0;gap:16px">
      ${f.laundry_card ? laundryCard(m, card, true) : ''}
      ${m.vacuums.length || m.printer.low ? html`<div class="glass col" style="flex:1;min-height:0;gap:8px">
        ${m.vacuums.length ? html`<span style="font-size:18px;font-weight:600;padding-left:4px">Robot vacuums</span>` : ''}
        ${m.vacuums.map((v) => html`<div class="tile t-${v.tone}" style="height:64px;border-radius:22px;padding:0 6px 0 12px;align-items:center;gap:12px">
          ${icon('bot', 22, 'color:var(--ic)')}
          <div class="col grow" style="line-height:1.25"><span style="font-size:15px;font-weight:600">${v.name}</span><span class="ellip st" style="font-size:12px">${v.text}</span></div>
          ${v.state === 'offline' ? '' : html`<div class="btn" data-test="vac-${v.entity}" style="height:48px;padding:0 14px;font-size:13px;gap:6px" @click=${() => card.callSvc('vacuum', v.action.service, {}, { entity_id: v.entity })}>${icon(v.action.icon, 16)}${v.action.label}</div>`}
        </div>`)}
        <div class="grow"></div>
        ${m.printer.low ? html`<div class="row" style="height:44px;border-radius:22px;padding:0 14px;gap:8px;font-size:13px;background:linear-gradient(160deg,rgba(255,176,60,.3),rgba(255,176,60,.1));border:1px solid rgba(255,200,120,.4);color:#FFE6C2">${icon('printer', 16)}${m.printer.low}</div>` : ''}
      </div>` : ''}
    </div>
    <div class="col" style="min-height:0;gap:16px">
      ${s ? html`<div class="glass col" style="gap:8px">
        <div class="row" style="justify-content:space-between;padding-left:4px"><div class="col" style="line-height:1.25"><span style="font-size:18px;font-weight:600">Sprinklers</span>
          <span style="font-size:12px;color:var(--subtle)">${s.rainDelay ? 'Rain delay on' : s.running ? `Running ${s.running.name}` : 'Idle'}</span></div>
          ${s.rainDelay != null ? html`<div class="btn" style="height:44px;padding:0 14px;font-size:13px;gap:6px;${s.rainDelay ? 'background:rgba(173,181,229,.35)' : ''}" @click=${() => card.act(f.sprinklers!.rain_delay!)}>${icon('cloud-rain', 16)}Rain delay</div>` : ''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${s.zones.map((z) => html`<div class="row" data-test="zone-${z.entity}" style="height:36px;border-radius:14px;padding:0 10px;gap:6px;font-size:12px;background:${z.on ? 'rgba(173,181,229,.3)' : 'rgba(255,255,255,.07)'};color:${z.on ? '#DCE0F5' : 'rgba(255,255,255,.8)'}"
          @click=${() => card.act(z.entity)}>${icon('sprout', 13)}<span class="ellip">${z.name}</span></div>`)}</div>
      </div>` : ''}
      ${mw ? html`<div class="glass row" style="height:72px;flex:none;border-radius:28px;padding:0 10px 0 16px;gap:12px">${icon('tractor', 22, 'color:#98E6CA')}
        <div class="col grow" style="line-height:1.25"><span style="font-size:15px;font-weight:600">${mw.name}</span><span style="font-size:12px;color:var(--subtle)">${mw.text}</span></div>
        ${mw.tone === 'na' ? '' : html`<div class="btn" data-test="mow" style="height:52px;padding:0 16px;font-size:13px" @click=${() => card.callSvc('lawn_mower', mw.mowing ? 'dock' : 'start_mowing', {}, { entity_id: mw.entity })}>${mw.mowing ? 'Dock' : 'Mow now'}</div>`}</div>` : ''}
      ${tub ? (tub.online
        ? html`<div class="glass row" style="height:72px;border-radius:28px;padding:0 16px;gap:12px">${icon('waves', 22)}<span class="grow" style="font-size:18px;font-weight:600">Hot Tub</span><span class="num" style="font-size:22px">${tub.temp ?? '—'}°</span></div>`
        : html`<div class="col" style="flex:1;min-height:0;border-radius:32px;padding:18px;border:1px dashed rgba(255,255,255,.26);gap:10px;color:rgba(255,255,255,.5)">
            <div class="row" style="gap:10px">${icon('waves', 22)}<span class="grow" style="font-size:18px;font-weight:600">Hot Tub</span><span class="row" style="font-size:12px;gap:5px">${icon('wifi-off', 14)}Offline</span></div>
            <span style="font-size:12px;line-height:1.4">Spa controller isn't responding. Controls come back when it reconnects.</span></div>`) : ''}
    </div>
  </div>`;
}
