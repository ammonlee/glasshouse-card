import { html } from 'lit';
import type { GlasshouseCard } from '../glasshouse-card';

const hideImg = (e: Event) => { (e.currentTarget as HTMLElement).style.visibility = 'hidden'; };
const showImg = (e: Event) => { (e.currentTarget as HTMLElement).style.visibility = ''; };

export function camera(card: GlasshouseCard, entity: string | undefined, opts: { full?: boolean; label?: string } = {}) {
  const h = card.hass, s = entity ? h.states[entity] : undefined;
  const labelText = opts.label || entity || 'no camera';
  // Note: deliberately inline (not a separately-built `html\`\`` TemplateResult spliced in via `${...}`).
  // Under happy-dom, a nested TemplateResult used as a value immediately followed by an attribute-bound
  // sibling element (no static text between them) corrupts the attribute's committed value — this bites
  // the media element's `src`/property bindings below. Keeping the label as static markup with an inline
  // text expression avoids the pattern entirely.
  if (!s || s.state === 'unavailable') return html`<div class="cam-label">${labelText}</div>`;
  if (opts.full && customElements.get('ha-camera-stream')) {
    return html`<div class="cam-label">${labelText}</div><ha-camera-stream .hass=${h} .stateObj=${s} muted playsinline allow-exoplayer controls></ha-camera-stream>`;
  }
  const tok = s.attributes.access_token;
  if (!tok) return html`<div class="cam-label">${labelText}</div>`;
  const path = opts.full ? `/api/camera_proxy_stream/${entity}?token=${tok}` : `/api/camera_proxy/${entity}?token=${tok}&t=${Math.floor(Date.now() / 10_000)}`;
  // A failed snapshot hides the <img> (no broken-image glyph; the label underneath shows); the next
  // successful load (the snapshot URL changes every 10 s) shows it again.
  return html`<div class="cam-label">${labelText}</div><img alt="" src=${h.hassUrl(path)} @error=${hideImg} @load=${showImg} />`;
}
