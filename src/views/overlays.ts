import { html } from 'lit';
import type { Model } from '../model/index';
import type { GlasshouseCard, Overlay } from '../glasshouse-card';
import { icon } from '../icons';
import { roomPopup } from './rooms';
import { camera } from './camera';
import { tileIcon } from './shared';
import { val } from '../model/util';

const stop = (e: Event) => e.stopPropagation();

function alertsSheet(m: Model, card: GlasshouseCard) {
  const rows = m.alerts.length ? m.alerts.map((a) => html`<div class="tile t-${a.tier === 'safety' ? 'alert' : 'nudge'}" style="height:76px;align-items:center;gap:12px;padding:0 10px 0 14px">
      ${tileIcon(a.icon, 44, 20)}
      <div class="col grow" style="line-height:1.3"><span style="font-size:16px;font-weight:600">${a.title}</span><span class="st" style="font-size:13px">${a.tier === 'safety' ? 'Safety' : 'Nudge'} · ${a.sub}</span></div>
      ${a.action ? html`<div class="btn" data-test="alert-action-${a.entity}" style="height:48px;padding:0 18px;font-size:14px;${a.tier === 'safety' ? 'background:#ED4040' : ''}"
        @click=${() => card.callSvc(a.action!.domain, a.action!.service, {}, { entity_id: a.entity })}>${a.action.label}</div>` : ''}
    </div>`)
    : html`<div class="tile t-ok" style="height:76px;align-items:center;gap:12px;padding:0 14px">${tileIcon('shield-check', 44, 20)}<div class="col" style="line-height:1.3"><span style="font-size:16px;font-weight:600">${m.capsule.title}</span><span class="st" style="font-size:13px">${m.capsule.sub}</span></div></div>`;
  return html`<div class="sheet" style="width:640px" @click=${stop}>
    <div class="row" style="gap:14px"><span class="grow" style="font-size:26px;font-weight:600;letter-spacing:-.01em">Alerts</span>
      <div class="btn" style="width:56px;height:56px" @click=${() => card.closeOverlay()}>${icon('x', 22)}</div></div>
    <div class="col" style="gap:10px">${rows}</div></div>`;
}

export const DEFAULT_REPLIES = ['Be right there!', 'Please leave the package at the door. Thank you!', "Sorry, we can't come to the door right now."];

/** The TTS engine for doorbell replies: the configured one, else Home Assistant Cloud, else the first available. */
function ttsEngine(card: GlasshouseCard): string | undefined {
  const d = card._config.home?.doorbell, ids = Object.keys(card.hass.states).filter((e) => e.startsWith('tts.'));
  return d?.tts || ids.find((e) => e === 'tts.home_assistant_cloud') || ids[0];
}

/** Speaks a quick reply through the doorbell's speaker and restarts the takeover countdown. */
async function reply(o: Extract<Overlay, { kind: 'doorbell' }>, card: GlasshouseCard, message: string) {
  const d = card._config.home?.doorbell || {}, tts = ttsEngine(card);
  card.openOverlay({ ...o, talk: false, until: Date.now() + (d.takeover_seconds ?? 45) * 1000 });
  if (!d.speaker || !tts) return;
  if (await card.callSvc('tts', 'speak', { media_player_entity_id: d.speaker, message, cache: true }, { entity_id: tts })) card.showToast(`Said: "${message}"`);
}

function doorbell(o: Extract<Overlay, { kind: 'doorbell' }>, card: GlasshouseCard) {
  const d = card._config.home?.doorbell || {}, h = card.view;
  const left = Math.max(0, Math.ceil((o.until - Date.now()) / 1000)), total = d.takeover_seconds ?? 45;
  const lockId = d.lock, locked = val(h, lockId) === 'locked', lockHold = !!lockId && card.needsHold(lockId);
  const cam = o.pkg && d.package_camera ? d.package_camera : d.camera;
  return html`<div class="scrim doorbell" style="padding:24px;gap:16px;align-items:stretch;justify-content:flex-start;background:rgba(5,6,12,.55)">
    <div class="cam-bg" style="height:100%;aspect-ratio:4 / 3;flex:none;border-radius:32px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16),0 20px 60px rgba(0,0,0,.5)">
      ${camera(card, cam, { full: true })}
      <div class="chip" style="position:absolute;top:20px;left:20px;height:40px;padding:0 16px;font-size:14px;font-weight:600"><span class="live-dot"></span>${o.pkg ? 'Package cam' : 'Front Door'}</div>
      ${lockId ? html`<div class="chip" style="position:absolute;left:20px;bottom:20px;height:56px;border-radius:28px;padding:0 20px 0 8px;gap:10px;font-size:15px;font-weight:600">
        <div class="btn" style="width:40px;height:40px;background:${locked ? 'rgba(98,215,172,.28)' : 'rgba(255,176,60,.3)'};color:${locked ? '#98E6CA' : '#FFE0B0'}">${icon(locked ? 'lock' : 'lock-open')}</div>${locked ? 'Locked' : 'Unlocked'}</div>` : ''}
    </div>
    <div class="col grow" style="gap:12px">
      <div class="col" style="gap:10px;padding:8px 4px 0">
        <div class="btn" style="width:56px;height:56px;background:rgba(173,181,229,.35);color:#fff;box-shadow:0 0 30px rgba(173,181,229,.7),inset 0 1px 0 rgba(255,255,255,.5)">${icon('bell-ring', 24)}</div>
        <span style="font-size:24px;font-weight:600;letter-spacing:-.02em;line-height:1.15">Someone's at the door</span>
        <span style="font-size:13px;line-height:1.4;color:var(--muted)">Rang just now</span>
      </div>
      <div class="grow"></div>
      ${o.talk ? html`<div style="display:contents">${(d.replies?.length ? d.replies : DEFAULT_REPLIES).slice(0, 4).map((r) => html`
        <div class="big-btn capsule" data-test="reply" style="height:auto;min-height:72px;border-radius:24px;padding:12px 16px;font-size:16px;font-weight:600;line-height:1.3" @click=${() => reply(o, card, r)}>${r}</div>`)}
        <div class="big-btn capsule" style="height:56px;border-radius:28px" @click=${() => card.openOverlay({ ...o, talk: false })}>${icon('x', 20)}<span style="font-size:15px;font-weight:600">Back</span></div></div>` : html`<div style="display:contents">
      ${d.speaker ? html`<div class="big-btn capsule" data-test="talk" style="height:88px;border-radius:28px;background:linear-gradient(160deg,rgba(111,125,220,.62),rgba(70,85,187,.26));border:1px solid rgba(173,181,229,.45);box-shadow:inset 0 1px 0 rgba(220,225,255,.55)" @click=${() => card.openOverlay({ ...o, talk: true })}>${icon('mic', 24)}<div class="col" style="line-height:1.25"><span style="font-size:17px;font-weight:600">Talk</span><span style="font-size:12px;color:var(--muted)">Pick a reply to say at the door</span></div></div>` : ''}
      ${lockId ? html`<div class="big-btn" data-hold=${lockHold ? lockId : ''} @click=${() => card.tap(lockId)} style="background:linear-gradient(160deg,rgba(25,190,130,.4),rgba(25,190,130,.14));border:1px solid rgba(98,215,172,.45);box-shadow:inset 0 1px 0 rgba(210,245,232,.4)">
        ${icon(locked ? 'lock-open' : 'lock', 24, 'color:#98E6CA')}<div class="col" style="line-height:1.25"><span style="font-size:17px;font-weight:600">${locked ? 'Unlock' : 'Lock'}</span><span style="font-size:12px;color:#D2F5E8">${lockHold ? 'Hold 1 second' : locked ? 'Tap to unlock' : 'Tap to lock'}</span></div><div class="hold-fill"></div></div>` : ''}
      ${d.package_camera ? html`<div class="big-btn capsule" style="height:88px;border-radius:28px" @click=${() => card.openOverlay({ ...o, pkg: !o.pkg })}>${icon('package', 24)}<div class="col" style="line-height:1.25"><span style="font-size:17px;font-weight:600">${o.pkg ? 'Door cam' : 'Package cam'}</span><span style="font-size:12px;color:var(--muted)">${o.pkg ? 'Look ahead' : 'Look down'}</span></div></div>` : ''}
      <div class="big-btn capsule" style="height:88px;border-radius:28px" @click=${() => card.closeOverlay()}>${icon('x', 24)}<div class="col" style="line-height:1.25"><span style="font-size:17px;font-weight:600">Dismiss</span><span style="font-size:12px;color:var(--muted)">Closes in ${left} s</span></div>
        <div style="position:absolute;left:0;bottom:0;height:4px;width:${(left / total) * 100}%;background:rgba(255,255,255,.55);transition:width 1s linear"></div></div></div>`}
    </div></div>`;
}

export function overlayView(o: Overlay, m: Model, card: GlasshouseCard) {
  if (o.kind === 'room') return html`<div class="scrim" @click=${() => card.closeOverlay()}>${roomPopup(m, card, o.id)}</div>`;
  if (o.kind === 'alerts') return html`<div class="scrim" @click=${() => card.closeOverlay()}>${alertsSheet(m, card)}</div>`;
  if (o.kind === 'camera') return html`<div class="scrim" style="padding:24px" @click=${() => card.closeOverlay()}>
    <div class="cam-bg" style="height:100%;aspect-ratio:16 / 10;border-radius:32px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16),0 20px 60px rgba(0,0,0,.5)" @click=${stop}>
      ${camera(card, o.entity, { full: true })}
      <div class="chip" style="position:absolute;top:20px;left:20px;height:40px;padding:0 16px;font-size:14px;font-weight:600"><span class="live-dot"></span>${o.name}</div>
      <div class="btn chip" style="position:absolute;top:20px;right:20px;width:56px;height:56px;padding:0;border-radius:28px" @click=${() => card.closeOverlay()}>${icon('x', 22)}</div>
    </div></div>`;
  return doorbell(o, card);
}
