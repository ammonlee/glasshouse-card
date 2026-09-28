import { LitElement, html, css } from 'lit';
import type { HassLike } from '../types';
import type { GlasshouseConfig, PersonCfg, RoomCfg, ClimateRoomCfg, CarCfg, CameraCfg, AlertRule } from '../config/types';
import { missingEntities } from '../config/schema';
import { discover } from '../model/rooms';
import { SCHEMAS } from './schemas';
import { setIn, listEditor } from './list';

type EdTab = 'general' | 'people' | 'alerts' | 'home' | 'security' | 'rooms' | 'climate' | 'garage' | 'family';
const TABS: Array<[EdTab, string]> = [['general', 'General'], ['people', 'People'], ['alerts', 'Alerts'], ['home', 'Home'], ['security', 'Security'], ['rooms', 'Rooms'], ['climate', 'Climate'], ['garage', 'Garage'], ['family', 'Family']];

export class GlasshouseCardEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true }, _tab: { state: true } };
  hass?: HassLike;
  _config: GlasshouseConfig = { type: 'custom:glasshouse-card' };
  _tab: EdTab = 'general';

  static styles = css`
    .tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
    .tabs button { border: 0; border-radius: 16px; padding: 6px 12px; background: var(--secondary-background-color, #eee); color: var(--primary-text-color); cursor: pointer; }
    .tabs button.sel { background: var(--primary-color, #03a9f4); color: var(--text-primary-color, #fff); }
    .row-item { border: 1px solid var(--divider-color, #ddd); border-radius: 8px; margin-bottom: 8px; padding: 4px 8px; }
    summary { display: flex; align-items: center; cursor: pointer; padding: 6px 0; }
    .label { flex: 1; font-weight: 500; } .tools button { margin-left: 4px; }
    .add { margin-top: 4px; }
    .warn { color: var(--warning-color, #b58100); font-size: 12px; margin: 4px 0; }
    .disc { display: grid; grid-template-columns: 1fr; gap: 2px; margin: 4px 0 12px; font-family: monospace; font-size: 12px; }
    h4 { margin: 12px 0 4px; }
  `;

  async connectedCallback() {
    super.connectedCallback();
    // HA lazy-loads ha-form and entity pickers; creating a built-in card's editor forces them to load.
    const helpers = await (window as any).loadCardHelpers?.();
    if (helpers && !customElements.get('ha-form')) {
      const c = await helpers.createCardElement({ type: 'entities', entities: [] });
      await c?.constructor?.getConfigElement?.();
    }
  }

  setConfig(c: GlasshouseConfig) { this._config = c; }

  private _emit(config: GlasshouseConfig) {
    this._config = config;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
  }
  _onForm(path: string[], value: Record<string, unknown>) {
    let next = this._config as any;
    if (!path.length) { for (const [k, v] of Object.entries(value)) next = setIn(next, [k], v); }  // root-level form: merge its keys, keep the rest
    else next = setIn(next, path, value);
    this._emit(next);
  }
  _toggleExclude(i: number, id: string) {
    const rooms = [...(this._config.rooms || [])];
    const ex = new Set(rooms[i].exclude || []);
    ex.has(id) ? ex.delete(id) : ex.add(id);
    rooms[i] = { ...rooms[i], exclude: [...ex] };
    if (!rooms[i].exclude!.length) delete rooms[i].exclude;
    this._emit({ ...this._config, rooms });
  }

  private _form(schema: unknown[], data: unknown, path: string[]) {
    return html`<ha-form .hass=${this.hass} .data=${data || {}} .schema=${schema} .computeLabel=${(s: any) => s.label || s.name}
      @value-changed=${(e: CustomEvent) => this._onForm(path, e.detail.value)}></ha-form>`;
  }
  private _list<T>(key: string[], items: T[] | undefined, schema: unknown[], labelOf: (t: T) => string, blank: T) {
    return listEditor(items || [], schema, labelOf, (next) => this._emit(setIn(this._config as any, key, next) as GlasshouseConfig), this.hass, blank);
  }

  private _body() {
    const c = this._config, h = this.hass!;
    const name = (id?: string) => (id && h.states[id]?.attributes.friendly_name) || id || '';
    switch (this._tab) {
      case 'general': {
        const { wallpaper, blur, weather, night_mode, confirm_hold } = c;
        return this._form(SCHEMAS.general, { wallpaper, blur, weather, night_mode, confirm_hold }, []);
      }
      case 'people': return this._list<PersonCfg>(['people'], c.people, SCHEMAS.person, (p) => p.name || name(p.person), { person: '' });
      case 'alerts': return html`<h4>Safety (red)</h4>${this._list<AlertRule>(['alerts', 'safety'], (c.alerts?.safety || []).map((r) => (typeof r === 'string' ? { entity: r } : r)), SCHEMAS.alert, (r) => r.label || name(r.entity), { entity: '' })}
        <h4>Nudges (amber)</h4>${this._list<AlertRule>(['alerts', 'nudge'], (c.alerts?.nudge || []).map((r) => (typeof r === 'string' ? { entity: r } : r)), SCHEMAS.alert, (r) => r.label || name(r.entity), { entity: '' })}`;
      case 'home': return this._form(SCHEMAS.home, { ...c.home, calendar: c.home?.calendar ? ([] as string[]).concat(c.home.calendar) : undefined }, ['home']);
      case 'security': return html`${this._form(SCHEMAS.security, c.security, ['security'])}
        <h4>Cameras (first is the large tile)</h4>${this._list<CameraCfg>(['security', 'cameras'], (c.security?.cameras || []).map((x) => (typeof x === 'string' ? { entity: x } : x)), SCHEMAS.camera, (x) => x.name || name(x.entity), { entity: '' })}`;
      case 'rooms': return html`<div style="display:contents">
        <div style="display:contents">${this._list<RoomCfg>(['rooms'], c.rooms, SCHEMAS.room, (r) => r.name || h.areas[r.area]?.name || r.area, { area: '' })}</div>
        <div style="display:contents">${(c.rooms || []).map((r, i) => r.area ? html`<h4>${r.name || h.areas[r.area]?.name || r.area} — found</h4><div class="disc">
          ${(() => { const d = discover(h, { ...r, exclude: [] }); return [...d.lights, ...d.fans, ...d.covers].map((id) => html`<label><input type="checkbox" .checked=${!(r.exclude || []).includes(id)} @change=${() => this._toggleExclude(i, id)}> ${name(id)} <small>${id}</small></label>`); })()}
        </div>` : '')}</div>
        <h4>Automations row</h4>
        <div style="display:contents">${this._form([{ name: 'automations', label: 'Automations', selector: { entity: { multiple: true, domain: 'automation' } } }, { name: 'party', label: 'Play Everywhere group', selector: { entity: { domain: 'media_player' } } }], { automations: c.automations, party: c.party }, [])}</div>
      </div>`;
      case 'climate': return html`${this._form(SCHEMAS.climate, c.climate, ['climate'])}
        <h4>Rooms</h4>${this._list<ClimateRoomCfg>(['climate', 'rooms'], c.climate?.rooms, SCHEMAS.climateRoom, (r) => r.name, { name: '' })}`;
      case 'garage': return html`<h4>Cars</h4>${this._list<CarCfg>(['garage', 'cars'], c.garage?.cars, SCHEMAS.car, (x) => x.name, { name: '' })}
        ${this._form(SCHEMAS.garage, c.garage, ['garage'])}`;
      case 'family': return this._form(SCHEMAS.family, c.family, ['family']);
    }
  }

  render() {
    if (!this.hass) return html``;
    const warn = missingEntities(this.hass, this._config);
    return html`<div class="tabs">${TABS.map(([t, l]) => html`<button class=${t === this._tab ? 'sel' : ''} @click=${() => { this._tab = t; }}>${l}</button>`)}</div>
      <div style="display:contents">
        ${warn.length ? html`<div class="warn">${warn.slice(0, 6).map((w) => html`<div>${w.path}: ${w.message}</div>`)}</div>` : ''}
        ${this._body()}
      </div>`;
  }
}

if (!customElements.get('glasshouse-card-editor')) customElements.define('glasshouse-card-editor', GlasshouseCardEditor);
