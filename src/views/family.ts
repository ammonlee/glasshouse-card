import { html } from 'lit';
import type { Model } from '../model/index';
import type { GlasshouseCard } from '../glasshouse-card';
import { icon } from '../icons';
import { choreList, laundryCard, rollCallButton, vacuumRows } from './home';

const CIRC = 163.4;

/** This week's chore tally (since Sunday), one column per person, leader first and crowned with the trophy. */
function championCard(m: Model) {
  const top = m.choreStats[0], lead = top.week > 0 && (m.choreStats[1]?.week ?? -1) < top.week;
  return html`<div class="glass col" data-test="champion" style="gap:10px;flex:none">
    <div class="row" style="justify-content:space-between;padding-left:4px"><div class="col" style="line-height:1.25"><span style="font-size:18px;font-weight:600">Chore Champion</span>
      <span style="font-size:12px;color:var(--subtle)">${lead ? `${top.who} leads this week` : top.week ? "It's a tie this week" : 'Resets every Sunday'}</span></div>
      ${icon('trophy', 20, `color:${lead ? '#FFD27A' : 'rgba(255,255,255,.6)'}`)}</div>
    <div class="row" style="justify-content:space-around;align-items:flex-start">${m.choreStats.map((s, i) => html`<div class="col" data-test="champ-row" style="align-items:center;gap:3px;min-width:0;flex:1">
      <div class="initials" style="width:40px;height:40px;font-size:13px;box-shadow:inset 0 0 0 2px ${s.color}${i === 0 && lead ? ',0 0 18px rgba(255,210,122,.75)' : ''};${i === 0 && lead ? 'background:rgba(255,210,122,.28)' : ''}">${s.initials}</div>
      <span class="num" style="font-size:18px;font-weight:600;line-height:1.1">${s.week}</span>
      ${s.streak >= 2 ? html`<span class="streak">${icon('flame', 12)}${s.streak}</span>` : html`<span style="height:20px"></span>`}</div>`)}</div>
  </div>`;
}

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
      ${hasChores && m.choreStats.length ? championCard(m) : ''}
      ${f.laundry_card ? laundryCard(m, card, true) : ''}
      ${m.vacuums.length || m.printer.low ? html`<div class="glass col" style="flex:1;min-height:0;gap:8px">
        ${m.vacuums.length ? html`<span style="font-size:18px;font-weight:600;padding-left:4px">Robot vacuums</span>` : ''}
        ${vacuumRows(m, card, hasChores && m.choreStats.length > 0)}
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
