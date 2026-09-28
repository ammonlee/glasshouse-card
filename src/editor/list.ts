import { html, type TemplateResult } from 'lit';

const empty = (v: unknown) => v === undefined || v === '' || (Array.isArray(v) && v.length === 0) || (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

export function setIn<T extends Record<string, any>>(obj: T, path: string[], value: unknown): T {
  const [k, ...rest] = path;
  const next: any = { ...obj };
  const v = rest.length ? setIn(obj?.[k] || {}, rest, value) : value;
  if (empty(v)) delete next[k]; else next[k] = v;
  return next;
}

export function listEditor<T>(items: T[], schema: unknown[], labelOf: (t: T) => string, onChange: (next: T[]) => void, hass: unknown, blank: T): TemplateResult {
  const move = (i: number, d: number) => { const n = [...items]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onChange(n); };
  return html`<div class="list">
    ${items.map((it, i) => html`<details class="row-item">
      <summary><span class="label">${labelOf(it) || `Item ${i + 1}`}</span>
        <span class="tools">
          <button ?disabled=${i === 0} @click=${(e: Event) => { e.preventDefault(); move(i, -1); }} title="Move up">↑</button>
          <button ?disabled=${i === items.length - 1} @click=${(e: Event) => { e.preventDefault(); move(i, 1); }} title="Move down">↓</button>
          <button @click=${(e: Event) => { e.preventDefault(); onChange(items.filter((_, j) => j !== i)); }} title="Remove">✕</button>
        </span></summary>
      <ha-form .hass=${hass} .data=${it} .schema=${schema} .computeLabel=${(s: any) => s.label || s.name}
        @value-changed=${(e: CustomEvent) => { const n = [...items]; n[i] = e.detail.value; onChange(n); }}></ha-form>
    </details>`)}
    <button class="add" @click=${() => onChange([...items, blank])}>+ Add</button>
  </div>`;
}
