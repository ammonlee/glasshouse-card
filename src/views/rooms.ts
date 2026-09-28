import { html } from 'lit';
import type { Model } from '../model/index';
import type { GlasshouseCard } from '../glasshouse-card';
import { icon } from '../icons';
import { floors, allLightIds } from '../model/rooms';
import { tileIcon, sw, missingNote } from './shared';
import { camera } from './camera';
import { val, fname, exists } from '../model/util';

const group = (card: GlasshouseCard, ids: string[], on: boolean) =>
  card.callSvc('homeassistant', on ? 'turn_on' : 'turn_off', {}, { entity_id: ids }, ids.map((i) => [i, on ? 'on' : 'off'] as [string, string]));

export function roomsView(m: Model, card: GlasshouseCard) {
  const c = card._config, h = card.view;
  const fl = floors(m.rooms);
  const all = allLightIds(m.rooms), allOn = m.rooms.reduce((n, r) => n + r.onCount, 0);
  const tile = (r: Model['rooms'][number]) => html`<div class="tile t-${r.tone}" data-test="room-${r.id}" style="flex-direction:column;justify-content:space-between"
      @click=${() => card.openOverlay({ kind: 'room', id: r.id })}>
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      ${tileIcon(r.icon, 40, 20, () => group(card, r.lights.map((l) => l.entity), r.onCount === 0))}
      <span class="num" style="font-size:15px;color:var(--muted)">${r.temp}</span></div>
    <div class="col" style="line-height:1.25;min-width:0"><span class="ellip" style="font-size:15px;font-weight:600">${r.name}</span><span class="ellip st" style="font-size:13px">${r.stateText}</span>${r.missing.length ? html`<span class="missing">${r.missing.length} missing</span>` : ''}</div>
  </div>`;
  const party = c.party;
  return html`<div class="view col" style="gap:12px">
    ${fl.map((f, i) => html`
      <div class="row" style="height:48px;gap:14px;padding-left:4px"><span style="font-size:22px;font-weight:600;letter-spacing:-.01em">${f.floor}</span>
        <span style="font-size:14px;color:${f.onCount ? '#FFE69C' : 'var(--subtle)'}">${f.onCount ? `${f.onCount} light${f.onCount > 1 ? 's' : ''} on` : 'All off'}</span><div class="grow"></div>
        <div class="btn" style="height:48px;padding:0 18px;font-size:14px" @click=${() => group(card, allLightIds(f.rooms), false)}>${icon('power', 16)}All off</div></div>
      <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:128px;gap:10px">
        ${f.rooms.map(tile)}
        ${i === 0 ? html`<div class="tile t-off" style="flex-direction:column;justify-content:space-between" @click=${() => group(card, all, false)}>
            <div class="row">${tileIcon('power', 40, 20)}</div>
            <div class="col" style="line-height:1.25"><span style="font-size:15px;font-weight:600">All Lights</span><span class="st" style="font-size:13px">${allOn ? `${allOn} on · whole house` : 'All off'}</span></div></div>
          ${party ? html`<div class="tile t-${val(h, party) === 'playing' ? 'on' : 'off'}" style="flex-direction:column;justify-content:space-between" @click=${() => card.callSvc('media_player', 'media_play_pause', {}, { entity_id: party })}>
            <div class="row">${tileIcon('speaker', 40, 20)}</div>
            <div class="col" style="line-height:1.25"><span style="font-size:15px;font-weight:600">Play Everywhere</span><span class="st" style="font-size:13px">${val(h, party) === 'playing' ? 'Playing' : 'Party group'}</span></div></div>` : ''}` : ''}
      </div>`)}
    <div class="grow"></div>
    ${c.automations?.length ? html`<div class="row" style="gap:10px;overflow:hidden"><span class="eyebrow" style="margin:0 6px 0 4px">Automations</span>
      ${c.automations.filter((a) => exists(h, a)).map((a) => html`<div class="glass row" style="height:56px;border-radius:28px;padding:0 10px 0 18px;gap:12px;font-size:14px;font-weight:500;white-space:nowrap"
        @click=${() => card.act(a)}>${fname(h, a)}${sw(val(h, a) === 'on')}</div>`)}</div>` : ''}
  </div>`;
}

export function roomPopup(m: Model, card: GlasshouseCard, id: string) {
  const r = m.rooms.find((x) => x.id === id);
  if (!r) return '';
  const on = r.onCount > 0;
  const sub = [r.temp !== '—' ? r.temp : null, r.occupied ? "someone's here" : null, r.fanOn ? 'fan on' : null].filter(Boolean).join(' · ') || `${r.onCount} of ${r.lights.length} lights on`;
  return html`<div class="sheet" style="width:840px" @click=${(e: Event) => e.stopPropagation()}>
    <div class="row" style="gap:14px">
      <div class="tile t-${on ? 'light' : 'off'}" style="padding:0;border:0;box-shadow:none;background:none"><div class="ic" style="width:56px;height:56px;${on ? 'box-shadow:0 0 24px rgba(255,214,96,.35)' : ''}">${icon(r.icon, 24)}</div></div>
      <div class="col grow" style="line-height:1.3"><span style="font-size:26px;font-weight:600;letter-spacing:-.01em">${r.name}</span><span style="font-size:14px;color:var(--muted)">${sub}</span></div>
      ${r.lights.length ? html`<div class="btn" style="height:56px;padding:0 10px 0 20px;gap:12px;font-size:15px" @click=${() => group(card, r.lights.map((l) => l.entity), !on)}>${r.name} Lights${sw(on, true)}</div>` : ''}
      <div class="btn" style="width:56px;height:56px" @click=${() => card.closeOverlay()}>${icon('x', 22)}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
      ${r.lights.map((l) => html`<div class="tile t-${l.on ? 'light' : 'off'}" data-test="light-${l.entity}" style="height:88px;padding:0 16px;align-items:center;gap:12px" @click=${() => card.act(l.entity)}>
        ${tileIcon(l.icon, 44, 21)}<div class="col" style="min-width:0;line-height:1.25"><span class="ellip" style="font-size:15px;font-weight:600">${l.name}</span><span class="st" style="font-size:13px">${l.on ? 'On' : 'Off'}</span></div></div>`)}
    </div>
    ${r.camera ? html`<div class="cam-bg" style="height:160px;border-radius:24px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)" @click=${() => card.openOverlay({ kind: 'camera', entity: r.camera!, name: r.name })}>
      ${camera(card, r.camera)}<span class="chip" style="position:absolute;top:10px;left:12px;height:30px;padding:0 12px;gap:6px;font-size:12px;font-weight:600"><span class="live-dot" style="width:7px;height:7px"></span>${r.name}</span></div>` : ''}
    ${missingNote(m.missing, r.missing)}
  </div>`;
}
