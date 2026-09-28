import { html } from 'lit';
import type { Model } from '../model/index';
import type { GlasshouseCard } from '../glasshouse-card';
import { icon } from '../icons';
import { fmtClock } from './shared';
import { val, fname, domainOf } from '../model/util';

export function nightView(m: Model, card: GlasshouseCard) {
  const h = card.view, s = card._config.security || {};
  const safety = m.alerts.filter((a) => a.tier === 'safety');
  const doors = [...(s.locks || []), ...(s.covers || [])].map((id) => {
    const st = val(h, id), ok = domainOf(id) === 'lock' ? st === 'locked' : st === 'closed';
    return { name: fname(h, id).replace(/ Lock$/, ''), ok, ic: domainOf(id) === 'lock' ? (ok ? 'lock' : 'lock-open') : 'warehouse', st: domainOf(id) === 'lock' ? (ok ? 'Locked' : 'Unlocked') : ok ? 'Closed' : 'Open' };
  });
  const w = m.weather;
  return html`<div class="night" @click=${(e: Event) => { if (!(e.composedPath() as HTMLElement[]).some((n) => n.classList?.contains('btn'))) card.setNight(false); }}>
    <div class="row" style="align-self:stretch;justify-content:space-between;font-size:14px;color:rgba(255,255,255,.34)">
      <span class="row" style="gap:8px">${icon('moon', 16)}Night mode</span>
      ${w ? html`<span class="row" style="gap:8px">${icon(w.icon === 'sun' ? 'moon' : w.icon, 16)}${w.temp ?? '—'}° · ${w.cond}</span>` : ''}</div>
    <div class="grow"></div>
    <span class="num" style="font-size:200px;font-weight:200;letter-spacing:-.05em;line-height:.9;color:rgba(255,255,255,.5)">${fmtClock(m.now)}</span>
    <span style="font-size:18px;color:rgba(255,255,255,.3);margin-top:16px">${m.now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
    <div style="height:48px"></div>
    ${safety.map((a) => html`<div class="row" style="height:72px;padding:0 10px 0 14px;border-radius:36px;gap:14px;background:rgba(237,64,64,.22);border:1px solid rgba(244,133,133,.5);margin-bottom:24px">
      <div class="btn" style="width:48px;height:48px;background:rgba(237,64,64,.35);color:#FFD6D6;box-shadow:none">${icon(a.icon, 22)}</div>
      <div class="col" style="line-height:1.3;padding-right:24px"><span style="font-size:17px;font-weight:600;color:#FFE3E3">${a.title.replace(/ open$/, ' is open')}</span><span style="font-size:13px;color:#F8B2B2">${a.sub}</span></div>
      ${a.action ? html`<div class="btn" style="height:56px;padding:0 24px;font-size:15px;background:#ED4040;color:#fff;box-shadow:none" @click=${() => card.callSvc(a.action!.domain, a.action!.service, {}, { entity_id: a.entity })}>${a.action.label}</div>` : ''}
    </div>`)}
    <div class="row" style="gap:10px">${doors.map((d) => html`<div class="row" style="height:44px;padding:0 16px 0 12px;border-radius:22px;gap:8px;font-size:13px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.42)">
      ${icon(d.ic, 15, `color:${d.ok ? 'rgba(98,215,172,.6)' : 'rgba(255,200,120,.7)'}`)}${d.name}<span style="color:rgba(255,255,255,.26)">${d.st}</span></div>`)}</div>
    <div class="grow"></div>
    <span style="font-size:13px;color:rgba(255,255,255,.24)">Tap anywhere to wake</span>
  </div>`;
}
