import { html } from 'lit';
import type { Model } from '../model/index';
import type { GlasshouseCard } from '../glasshouse-card';
import { icon } from '../icons';
import { kw } from '../model/garage';
import { tileIcon } from './shared';

export function garageView(m: Model, card: GlasshouseCard) {
  // `hold`: entity id when the action needs the 1 s hold right now (card.needsHold); the hold runs card.holdAction.
  const act = (test: string, ic: string, label: string, on: boolean, onClick?: () => void, hold = '') => html`<div class="btn" data-test=${test} data-hold=${hold} @click=${() => onClick?.()}
    style="height:56px;border-radius:22px;flex-direction:column;gap:3px;position:relative;overflow:hidden;${onClick ? `background:${on ? 'rgba(173,181,229,.3)' : 'rgba(255,255,255,.12)'};color:${on ? '#DCE0F5' : '#fff'}` : 'background:rgba(255,255,255,.05);color:rgba(255,255,255,.35);box-shadow:none'}">${icon(ic)}<span style="font-size:12px;font-weight:500">${label}</span><div class="hold-fill"></div></div>`;
  const online = m.cars.filter((c) => c.online), offline = m.cars.filter((c) => !c.online);
  const carCard = (c: Model['cars'][number], i: number) => {
    const bar = (c.pct ?? 0) < 25 ? '#FFD660' : '#62D7AC';
    const chip = c.plugged ? { bg: 'rgba(173,181,229,.3)', col: '#DCE0F5', ic: 'zap', t: `Charging ${c.kw} kW` } : { bg: 'rgba(255,255,255,.12)', col: 'rgba(255,255,255,.8)', ic: 'plug', t: 'Not charging' };
    const next = c.limit == null ? null : c.limit >= 90 ? 70 : c.limit + 10;
    return html`<div class="glass col" style="flex:1;min-height:0;justify-content:space-between">
      <div class="row" style="gap:12px"><div class="btn" style="width:44px;height:44px">${icon('car-front', 22)}</div>
        <div class="col grow" style="line-height:1.25"><span style="font-size:18px;font-weight:600">${c.name}</span><span style="font-size:13px;color:var(--subtle)">${c.sub}</span></div>
        <div class="row" style="height:34px;padding:0 12px;border-radius:17px;gap:6px;font-size:13px;font-weight:500;background:${chip.bg};color:${chip.col}">${icon(chip.ic, 14)}${chip.t}</div></div>
      <div class="row" style="align-items:baseline;gap:12px;padding-left:4px"><span class="num" style="font-size:60px;font-weight:200;letter-spacing:-.04em;line-height:1">${c.pct ?? '—'}%</span>
        <span style="font-size:18px;color:rgba(255,255,255,.8)">${c.range ?? '—'} mi</span><div class="grow"></div>${c.limit != null ? html`<span style="font-size:13px;color:var(--subtle)">Limit ${c.limit}%</span>` : ''}</div>
      <div style="position:relative;height:12px;border-radius:6px;background:rgba(255,255,255,.14)"><div style="height:12px;border-radius:6px;width:${c.pct ?? 0}%;background:${bar};box-shadow:0 0 12px ${bar}"></div>
        ${c.limit != null ? html`<div style="position:absolute;top:-3px;width:2px;height:18px;background:#fff;left:${c.limit}%"></div>` : ''}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${c.locked == null ? act(`car-${i}-lock`, 'lock', 'Lock', false) : act(`car-${i}-lock`, c.locked ? 'lock' : 'lock-open', c.locked ? (card.needsHold(c.cfg.lock!) ? 'Locked · hold' : 'Locked') : 'Unlocked', false, () => card.tap(c.cfg.lock!), card.needsHold(c.cfg.lock!) ? c.cfg.lock! : '')}
        ${c.climate == null ? act(`car-${i}-climate`, 'fan', 'Climate', false) : act(`car-${i}-climate`, 'fan', c.climate ? 'Climate on' : 'Climate', c.climate, () => card.act(c.cfg.climate!))}
        ${c.sentry == null ? act(`car-${i}-sentry`, 'eye-off', 'No sentry', false) : act(`car-${i}-sentry`, 'eye', c.sentry ? 'Sentry on' : 'Sentry', c.sentry, () => card.act(c.cfg.sentry!))}
        ${next == null ? act(`car-${i}-limit`, 'battery-charging', 'Limit', false) : act(`car-${i}-limit`, 'battery-charging', 'Limit', false, () => card.callSvc('number', 'set_value', { value: next }, { entity_id: c.limitEntity! }))}
      </div></div>`;
  };
  const e = m.energy;
  const nodes = e ? [
    { x: '50%', y: '20%', ic: 'sun', c: '#FFD660', glow: 'rgba(255,214,96,.4)', v: kw(e.solar), l: 'Solar' },
    { x: '19%', y: '53%', ic: 'utility-pole', c: 'rgba(255,255,255,.7)', glow: 'rgba(255,255,255,.12)', v: kw(e.grid), l: e.gridLabel },
    { x: '81%', y: '53%', ic: 'house', c: '#ADB5E5', glow: 'rgba(173,181,229,.45)', v: kw(e.home), l: e.charging ? 'Home (incl. car)' : 'Home' },
    { x: '50%', y: '82%', ic: 'battery-medium', c: '#62D7AC', glow: 'rgba(98,215,172,.4)', v: e.level != null ? `${Math.round(e.level)}%` : '—', l: e.batteryLabel },
  ] : [];
  // Deviation from brief: the brief nests svg`` templates (conditionally shown flow lines,
  // each with its own <animate> child) inside a parent <svg>. Under this repo's happy-dom
  // that renders as "<?>"/corrupted output (see view-task-notes.md quirk #1); Task 17's
  // climate arc worked around the same issue with always-present static SVG elements driven
  // by attribute bindings, so the energy flow follows that pattern here: four static <path>
  // elements (one per flow) are always in the template, with `d` switched between the two
  // directions and `stroke-opacity` set to 0 when the flow is below the 0.05 kW threshold;
  // each path's <animate> child stays static (its own attributes never change reactively).
  const solarPath = 'M270 150 L270 235';
  const gridPath = e && e.grid > 0 ? 'M130 250 L270 250' : 'M270 250 L130 250';
  const battPath = e && e.battery > 0 ? 'M270 365 L270 265' : 'M270 265 L270 365';
  const solarOn = !!e && e.solar > 0.05;
  const gridOn = !!e && Math.abs(e.grid) > 0.05;
  const battOn = !!e && Math.abs(e.battery) > 0.05;
  return html`<div class="view" style="display:grid;grid-template-columns:${m.cars.length && e ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)'};gap:16px">
    ${m.cars.length ? html`<div class="col" style="min-height:0;gap:12px">
      ${online.map((c) => carCard(c, m.cars.indexOf(c)))}
      ${offline.map((c) => html`<div class="row" style="height:56px;flex:none;border-radius:28px;padding:0 18px;border:1px dashed rgba(255,255,255,.24);gap:12px;color:rgba(255,255,255,.5)">${icon('car-front', 20)}<span style="font-size:15px;font-weight:600">${c.name}</span><span style="font-size:13px">Asleep · no data from the car</span><div class="grow"></div>${icon('wifi-off')}</div>`)}
    </div>` : ''}
    ${e ? html`<div class="col" style="min-height:0;gap:12px">
      <div class="glass" style="flex:1;min-height:0;position:relative;padding:0">
        <div class="col" style="position:absolute;top:18px;left:22px;line-height:1.3"><span style="font-size:18px;font-weight:600">Power right now</span><span style="font-size:13px;color:var(--subtle)">${e.gridLabel === 'To grid' ? 'Sending power to the grid' : 'Grid connected'}</span></div>
        <svg viewBox="0 0 540 470" width="100%" height="100%" style="position:absolute;inset:0" preserveAspectRatio="xMidYMid meet">
          <path d=${solarPath} stroke="#FFD660" stroke-width="3" stroke-dasharray="6 8" stroke-opacity=${solarOn ? 1 : 0} fill="none"><animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.2s" repeatCount="indefinite"/></path>
          <path d=${gridPath} stroke="rgba(255,255,255,.5)" stroke-width="3" stroke-dasharray="6 8" stroke-opacity=${gridOn ? 1 : 0} fill="none"><animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.6s" repeatCount="indefinite"/></path>
          <path d="M270 250 L410 250" stroke="#ADB5E5" stroke-width="4" fill="none"></path>
          <path d=${battPath} stroke="#62D7AC" stroke-width="3" stroke-dasharray="6 8" stroke-opacity=${battOn ? 1 : 0} fill="none"><animate attributeName="stroke-dashoffset" from="28" to="0" dur="0.8s" repeatCount="indefinite"/></path>
          <circle cx="270" cy="250" r="8" fill="#fff"></circle>
        </svg>
        ${nodes.map((n) => html`<div class="col" style="position:absolute;width:140px;align-items:center;gap:6px;transform:translate(-50%,-50%);left:${n.x};top:${n.y}">
          <div class="btn" style="width:88px;height:88px;background:linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,.06));border:2px solid ${n.c};color:${n.c};box-shadow:0 0 24px ${n.glow},inset 0 1px 0 rgba(255,255,255,.4)">${icon(n.ic, 30)}</div>
          <span class="num" style="font-size:20px;font-weight:600">${n.v}</span><span style="font-size:12px;color:var(--muted);text-align:center">${n.l}</span></div>`)}
      </div>
      <div style="height:100px;flex:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
        <div class="tile t-on" style="padding:12px 14px;flex-direction:column;justify-content:space-between">${tileIcon('shield-check', 32, 18)}<div class="col" style="line-height:1.25"><span style="font-size:14px;font-weight:600">Powerwall</span><span class="st" style="font-size:12px">${e.level != null ? `${Math.round(e.level)}% charged` : 'Unavailable'}</span></div></div>
        <div class="tile t-${e.charging ? 'on' : 'off'}" style="padding:12px 14px;flex-direction:column;justify-content:space-between">${tileIcon('plug-zap', 32, 18)}<div class="col" style="line-height:1.25"><span style="font-size:14px;font-weight:600">EV Chargers</span><span class="st" style="font-size:12px">${e.chargers ? `${e.charging} charging · ${e.chargers - e.charging} idle` : 'Not configured'}</span></div></div>
      </div>
    </div>` : ''}
  </div>`;
}
