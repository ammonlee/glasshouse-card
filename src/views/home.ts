import { html } from 'lit';
import type { Model } from '../model/index';
import type { GlasshouseCard } from '../glasshouse-card';
import { icon } from '../icons';
import { seg, missingNote } from './shared';
import { camera } from './camera';
import { setpointCall } from '../model/climate';
import { minsSince, attr, val } from '../model/util';

export function choreList(m: Model, card: GlasshouseCard, rowH: number | null, trailing: unknown) {
  const done = m.chores.filter((c) => c.done).length, all = m.chores.length > 0 && done === m.chores.length;
  return html`
    <div class="row" style="height:48px;gap:10px;padding-left:4px">
      <div class="col grow" style="line-height:1.25"><span class="card-title">Chores</span>
        <span style="font-size:13px;color:${all ? '#98E6CA' : 'rgba(255,255,255,.7)'}">${all ? 'All done — nice work!' : m.chores.length ? `${done} of ${m.chores.length} done` : 'Nothing today'}</span></div>
      ${all ? html`<div class="btn circle" style="background:#19BE82;color:#07121A;box-shadow:0 0 24px rgba(25,190,130,.7),inset 0 1px 0 rgba(255,255,255,.45)">${icon('party-popper', 20)}</div>` : trailing}
    </div>
    <div style="display:contents">${m.chores.map((c) => html`
      <div class="chore-row ${c.done ? 'done' : ''}" style="${rowH ? `height:${rowH}px;` : 'flex:1;min-height:0;'}padding:0 6px 0 8px"
        @click=${() => card.toggleChore(c.uid, c.summary ?? `${c.who} · ${c.what}`, c.done)}>
        <div class="initials" style="box-shadow:inset 0 0 0 2px ${c.color}">${c.initials}</div>
        <div class="col grow" style="line-height:1.3"><span style="font-size:16px;font-weight:600">${c.who}</span>
          <span class="row" style="font-size:13px;gap:5px;color:${c.done ? '#BFF0DD' : 'rgba(255,255,255,.72)'}">${icon(c.icon, 14)}<span class="ellip">${c.what}</span></span></div>
        <div class="check ${c.done ? 'done' : ''}" style="width:56px;height:56px">${icon('check', 22)}</div>
      </div>`)}</div>`;
}

export function laundryCard(m: Model, card: GlasshouseCard, full: boolean) {
  const l = m.laundry;
  if (!l) return '';
  const chip = l.turn
    ? html`<div class="btn" style="height:40px;padding:0 14px 0 4px"><div class="initials" style="width:32px;height:32px;font-size:11px;box-shadow:inset 0 0 0 2px ${l.turn.color}">${l.turn.initials}</div><span style="font-size:13px">${l.turn.name}'s day</span></div>`
    : html`<div class="btn" style="height:40px;padding:0 14px;font-size:13px;font-weight:500;color:var(--muted)">${icon('moon', 14)}${full ? l.note || 'Machines rest today' : 'Rest day'}</div>`;
  const size = (hh: number) => (full ? `height:${hh}px` : 'flex:1;min-height:0');
  const washer = l.washer === 'done'
    ? html`<div class="chore-row done" style="${size(68)};padding:0 14px 0 8px" @click=${() => card.ackLaundry(l.doneSince)}>
        <div class="check done" style="width:44px;height:44px">${icon('washing-machine', 20)}</div>
        <div class="col grow" style="line-height:1.3"><span style="font-size:15px;font-weight:600">Washer · done</span><span class="ellip" style="font-size:12px;color:#BFF0DD">Move to the dryer · tap when moved</span></div></div>`
    : html`<div class="chore-row" style="${size(68)};padding:0 14px 0 8px">
        <div class="check" style="width:44px;height:44px">${icon('washing-machine', 20)}</div>
        <div class="col grow" style="line-height:1.3"><span style="font-size:15px;font-weight:600">Washer · ${l.washer === 'running' ? 'running' : l.washer === 'na' ? 'unavailable' : 'empty'}</span>
          <span style="font-size:12px;color:var(--subtle)">${l.washer === 'running' ? (l.washerMin != null ? `${l.washerMin} min left` : 'Washing') : 'Ready for the next load'}</span></div></div>`;
  const dryer = l.dryer === 'running'
    ? html`<div class="chore-row" style="${size(76)};padding:0 14px 0 8px">
        <div class="btn" style="width:44px;height:44px;background:rgba(255,214,96,.22);color:#FFD660">${icon('wind', 20)}</div>
        <div class="col grow" style="gap:5px"><div class="row" style="justify-content:space-between;align-items:baseline;line-height:1.2"><span style="font-size:15px;font-weight:600">Dryer</span><span class="num" style="font-size:13px;font-weight:600;color:#FFE69C">${l.dryerMin != null ? `${l.dryerMin} min` : 'Running'}</span></div>
          <div class="bar" style="height:5px"><span style="width:${l.dryerPct}%;background:#FFD660;box-shadow:0 0 8px rgba(255,214,96,.6)"></span></div>
          ${full && l.loads != null ? html`<span style="font-size:12px;color:var(--subtle)">${l.loads} loads this week</span>` : ''}</div></div>`
    : html`<div class="chore-row ${l.dryer === 'done' ? 'done' : ''}" style="${size(76)};padding:0 14px 0 8px">
        <div class="check ${l.dryer === 'done' ? 'done' : ''}" style="width:44px;height:44px">${icon('wind', 20)}</div>
        <div class="col grow" style="line-height:1.3"><span style="font-size:15px;font-weight:600">Dryer · ${l.dryer === 'done' ? 'done' : l.dryer === 'na' ? 'unavailable' : 'off'}</span>
          <span style="font-size:12px;color:var(--subtle)">${l.dryer === 'done' ? "Fold it while it's warm" : full && l.loads != null ? `${l.loads} loads this week` : 'Idle'}</span></div></div>`;
  return html`<div class="glass col" style="${full ? '' : 'width:264px;flex:none;'}gap:8px">
    <div class="row" style="height:40px;gap:10px;padding-left:4px"><span class="card-title grow">Laundry</span>${chip}</div>${washer}${dryer}</div>`;
}

export function homeView(m: Model, card: GlasshouseCard) {
  const c = card._config.home || {}, h = card.view, d = c.doorbell, t = m.thermostat;
  const lockId = d?.lock, locked = val(h, lockId) === 'locked', lockHold = !!lockId && card.needsHold(lockId);
  const lastRing = d?.event && Date.parse(val(h, d.event) || '') ? minsSince(val(h, d.event)!, +m.now) : null;
  const media = c.media, ms = val(h, media), mediaOn = !!ms && !['off', 'standby', 'unavailable'].includes(ms);
  const vol = Math.round((attr<number>(h, media, 'volume_level') ?? 0) * 100);
  const series = attr<string>(h, media, 'media_series_title'), title = attr<string>(h, media, 'media_title');
  const upNext = m.upNext.map((e) => ('head' in e
    ? html`<span class="eyebrow" style="padding:6px 4px 0">${e.head}</span>`
    : html`<div class="row" style="min-height:54px;border-radius:18px;padding:6px 12px;gap:10px;background:rgba(255,255,255,.07)">
        <span style="width:8px;height:8px;flex:none;border-radius:4px;background:#ADB5E5;box-shadow:0 0 10px #ADB5E5"></span>
        <div class="col" style="min-width:0;line-height:1.3"><span class="num" style="font-size:12px;color:rgba(255,255,255,.66)">${e.time}</span><span class="ellip" style="font-size:14px;font-weight:600">${e.title}</span></div></div>`));
  const sp = (delta: number) => { const call = t && setpointCall(t, delta); if (call) card.callSvc('climate', 'set_temperature', call.data, { entity_id: t!.entity }); };

  return html`<div class="view col" style="gap:16px">
    <div class="row" style="height:420px;flex:none;gap:16px;align-items:stretch">
      ${d?.camera ? html`<div class="cam-bg" style="width:560px;flex:none;border-radius:32px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 14px 40px rgba(0,0,0,.35)"
          @click=${() => card.openOverlay({ kind: 'camera', entity: d.camera!, name: 'Front Door' })}>
        ${camera(card, d.camera)}
        <div class="row" style="position:absolute;top:16px;left:16px;gap:8px">
          <div class="chip" style="font-weight:600"><span class="live-dot"></span>Front Door</div>
          ${lastRing != null ? html`<div class="chip">${icon('bell', 14)}Rang ${lastRing} min ago</div>` : ''}
        </div>
        <div class="btn chip" style="position:absolute;top:16px;right:16px;width:48px;height:48px;padding:0;border-radius:24px">${icon('maximize-2')}</div>
        <div class="row" style="position:absolute;left:16px;right:16px;bottom:16px;gap:10px">
          ${lockId ? html`<div class="chip" data-hold=${lockHold ? lockId : ''} @click=${(e: Event) => { e.stopPropagation(); card.tap(lockId); }}
              style="height:56px;border-radius:28px;padding:0 20px 0 8px;gap:10px;font-size:15px;font-weight:600;white-space:nowrap;position:relative;overflow:hidden">
            <div class="btn" style="width:40px;height:40px;background:${locked ? 'rgba(98,215,172,.28)' : 'rgba(255,176,60,.3)'};color:${locked ? '#98E6CA' : '#FFE0B0'}">${icon(locked ? 'lock' : 'lock-open')}</div>
            ${locked ? 'Locked' : 'Unlocked'}<span style="font-weight:400;color:rgba(255,255,255,.7)">${lockHold ? '· hold to unlock' : locked ? '· tap to unlock' : '· tap to lock'}</span><div class="hold-fill"></div></div>` : ''}
          <div class="grow"></div>
          ${d.package_camera ? html`<div class="chip" style="height:56px;border-radius:28px;padding:0 20px;font-size:15px;font-weight:500"
              @click=${(e: Event) => { e.stopPropagation(); card.openOverlay({ kind: 'camera', entity: d.package_camera!, name: 'Package' }); }}>${icon('package')}Package</div>` : ''}
        </div>
        ${missingNote(m.missing, [d.camera, d.lock, d.event])}
      </div>` : ''}
      ${c.chores ? html`<div class="glass col grow" style="gap:10px">${choreList(m, card, null,
          html`<div class="btn circle">${icon('megaphone')}</div>`)}</div>` : ''}
      ${c.calendar ? html`<div class="glass col" style="width:255px;flex:none;overflow:hidden;gap:6px">
        <div class="row" style="height:48px;justify-content:space-between;padding-left:4px"><span class="card-title">Up next</span>${icon('calendar-days', 18, 'color:rgba(255,255,255,.7)')}</div>
        ${upNext}</div>` : ''}
    </div>
    <div class="row" style="flex:1;min-height:0;gap:16px;align-items:stretch">
      ${t ? html`<div class="glass col" style="width:280px;flex:none;justify-content:space-between">
        <div class="row" style="justify-content:space-between;padding:0 4px;font-size:13px;color:var(--muted)">
          <span>${(attr<string>(h, t.entity, 'friendly_name') || 'Thermostat').replace(/ Thermostat$/, '')} · <span style=${t.actionColor ? `color:${t.actionColor};font-weight:500` : ''}>${t.actionLabel}</span></span>
          ${t.humidity != null ? html`<span class="row" style="gap:5px">${icon('droplets', 14)}${t.humidity}%</span>` : ''}</div>
        <div class="row" style="gap:6px;padding-left:4px">
          <span class="grow num" style="font-size:64px;font-weight:200;letter-spacing:-.05em;line-height:.9">${t.current ?? '—'}°</span>
          <div class="btn circle" data-test="sp-down" @click=${() => sp(-1)}>${icon('minus', 20)}</div>
          <span class="num" style="width:40px;text-align:center;font-size:18px;font-weight:600">${t.target ?? '—'}°</span>
          <div class="btn circle" data-test="sp-up" @click=${() => sp(1)}>${icon('plus', 20)}</div>
        </div>
        ${seg([['home', 'Home'], ['away', 'Away'], ['sleep', 'Sleep']], t.preset, (p) => card.callSvc('climate', 'set_preset_mode', { preset_mode: p }, { entity_id: t.entity }))}
      </div>` : ''}
      ${laundryCard(m, card, false)}
      ${media ? html`<div class="glass col grow" style="justify-content:space-between;${mediaOn ? '' : 'opacity:.6'}">
        <div class="row" style="gap:12px">
          <div class="col grow" style="line-height:1.3;padding-left:4px"><span class="ellip" style="font-size:12px;color:rgba(255,255,255,.66)">${attr<string>(h, media, 'app_name') || attr<string>(h, media, 'source') || attr<string>(h, media, 'friendly_name')}</span>
            <span class="ellip" style="font-size:16px;font-weight:600">${title ? (series ? `${series} · ${title}` : title) : mediaOn ? 'Nothing playing' : 'Off'}</span></div>
          <div class="btn circle" @click=${() => card.callSvc('media_player', mediaOn ? 'turn_off' : 'turn_on', {}, { entity_id: media })}
            style=${mediaOn ? 'background:rgba(237,64,64,.3);color:#FFD6D6;border:1px solid rgba(244,133,133,.4)' : ''}>${icon('power')}</div>
        </div>
        <div class="row" style="justify-content:center;gap:14px">
          <div class="btn" style="width:52px;height:52px" @click=${() => card.callSvc('media_player', 'media_previous_track', {}, { entity_id: media })}>${icon('skip-back', 20)}</div>
          <div class="btn" style="width:60px;height:60px;background:#fff;color:#0B0F1E;box-shadow:0 6px 18px rgba(0,0,0,.3)" @click=${() => card.callSvc('media_player', 'media_play_pause', {}, { entity_id: media })}>${icon(ms === 'playing' ? 'pause' : 'play', 22)}</div>
          <div class="btn" style="width:52px;height:52px" @click=${() => card.callSvc('media_player', 'media_next_track', {}, { entity_id: media })}>${icon('skip-forward', 20)}</div>
        </div>
        <div class="row" style="gap:10px;color:var(--muted)">
          <span @click=${() => card.callSvc('media_player', 'volume_set', { volume_level: Math.max(0, vol - 8) / 100 }, { entity_id: media })}>${icon('volume-1', 16)}</span>
          <div class="bar grow" style="height:6px;background:rgba(255,255,255,.16)" @click=${(e: MouseEvent) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            card.callSvc('media_player', 'volume_set', { volume_level: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) }, { entity_id: media });
          }}><span style="width:${vol}%;background:#fff"></span></div>
          <span @click=${() => card.callSvc('media_player', 'volume_set', { volume_level: Math.min(100, vol + 8) / 100 }, { entity_id: media })}>${icon('volume-2', 16)}</span>
        </div>
      </div>` : html`<div class="grow"></div>`}
      ${c.good_night ? html`<div class="glass col" data-test="good-night" style="width:255px;flex:none;padding:20px;justify-content:space-between;background:linear-gradient(160deg,rgba(111,125,220,.62),rgba(70,85,187,.26));border-color:rgba(173,181,229,.45);box-shadow:inset 0 1px 0 rgba(220,225,255,.55),0 14px 40px rgba(20,24,70,.45)"
          @click=${async () => { await card.callSvc('script', 'turn_on', {}, { entity_id: c.good_night! }); await card.setNight(true); }}>
        <div class="btn" style="width:52px;height:52px;background:rgba(255,255,255,.18)">${icon('moon-star', 24)}</div>
        <div class="col" style="gap:4px"><span style="font-size:24px;font-weight:700;letter-spacing:-.02em">Good Night</span><span style="font-size:13px;line-height:1.4;color:rgba(255,255,255,.85)">Locks doors, closes the garage, turns lights off</span></div>
      </div>` : ''}
    </div>
  </div>`;
}
