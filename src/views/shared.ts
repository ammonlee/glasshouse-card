import { html, type TemplateResult } from 'lit';
import { icon } from '../icons';

export const seg = (opts: Array<[string, string]>, sel: string | null, onPick: (v: string) => void, h = 44): TemplateResult =>
  html`<div class="seg" style="grid-template-columns:repeat(${opts.length},1fr)">${opts.map(([v, label]) =>
    html`<div class=${v === sel ? 'sel' : ''} style="height:${h}px" @click=${() => onPick(v)}>${label}</div>`)}</div>`;

export const sw = (on: boolean, warm = false) => html`<div class="switch ${on ? 'on' : ''} ${warm ? 'warm' : ''}"><span></span></div>`;

export const tileIcon = (name: string, size = 40, isz = 20, onClick?: (e: Event) => void) =>
  html`<div class="ic" style="width:${size}px;height:${size}px" @click=${(e: Event) => { if (onClick) { e.stopPropagation(); onClick(e); } }}>${icon(name, isz)}</div>`;

export function missingNote(m: Map<string, string>, ids: Array<string | undefined>) {
  const msgs = ids.filter((i): i is string => !!i && m.has(i)).map((i) => m.get(i));
  return msgs.length ? html`<div class="missing">${msgs.join(' · ')}</div>` : '';
}

export const fmtClock = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
