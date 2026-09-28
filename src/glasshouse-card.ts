import './editor/glasshouse-card-editor';
import { LitElement, html, type PropertyValues } from 'lit';
import type { HassLike } from './types';
import type { GlasshouseConfig } from './config/types';
import { validateConfig } from './config/schema';
import { buildModel, relevantIds, changed, type Model, type Tab, type Extras } from './model/index';
import { planSync, dayString, rosterChores } from './model/chores';
import { calendars } from './model/calendar';
import { Overrides } from './overrides';
import { run, toggleCall, needsHold, alarmDisarmable, type Call } from './actions';
import { domainOf, val } from './model/util';
import { RingDetector } from './doorbell';
import { tokens } from './styles/tokens';
import { glass } from './styles/glass';
import { ensureFont } from './fonts';
import { icon } from './icons';
import { header, rail } from './views/chrome';
import { homeView, thermostatCapsule } from './views/home';
import { securityView } from './views/security';
import { roomsView } from './views/rooms';
import { climateView } from './views/climate';
import { garageView } from './views/garage';
import { familyView } from './views/family';
import { overlayView } from './views/overlays';
import { nightView } from './views/night';
import { attachHold } from './hold';
import { stubConfig } from './config/stub';

export type Overlay = { kind: 'alerts' } | { kind: 'room'; id: string } | { kind: 'camera'; entity: string; name: string } | { kind: 'doorbell'; until: number; pkg: boolean; talk?: boolean };

/** First camera in the config (doorbell, package, security, rooms), used to force-load ha-camera-stream. */
const firstCamera = (c?: GlasshouseConfig) => [c?.home?.doorbell?.camera, c?.home?.doorbell?.package_camera,
  ...(c?.security?.cameras || []).map((x) => (typeof x === 'string' ? x : x?.entity)), ...(c?.rooms || []).map((r) => r?.camera)]
  .find((x): x is string => typeof x === 'string' && x.startsWith('camera.'));
/** Once per page: HA lazy-loads ha-camera-stream, so on a dashboard with only this card it may never be
 *  defined and full-screen/doorbell cameras would fall back to MJPEG. Creating (not attaching) a live
 *  picture-entity card through HA's card helpers imports it. */
let streamLoadStarted = false;

/** Config keys that change what `_startSubscriptions` subscribes to. */
const watchKey = (c?: GlasshouseConfig) => JSON.stringify([c?.weather, c?.home?.chores?.todo, c?.home?.calendar, c?.security?.timeline]);

export class GlasshouseCard extends LitElement {
  static styles = [tokens, glass];
  static properties = { _tab: { state: true }, _overlay: { state: true }, _toast: { state: true }, _rev: { state: true } };

  _config!: GlasshouseConfig;
  _tab: Tab = 'home';
  _overlay: Overlay | null = null;
  _toast: string | null = null;
  _rev = 0;
  private _hass?: HassLike;
  private _ids = new Set<string>();
  private _ov = new Overrides();
  private _ring = new RingDetector();
  private _x: Extras = { todoItems: [], calendar: [], timeline: [], laundryAck: null };
  private _timers: number[] = [];
  private _scale = 1;
  private _cw = 1280;
  private _ch = 800;
  private _ro?: ResizeObserver;
  private _streamWait = false;

  // ---------- subscription lifecycle ----------
  private _started = false;
  private _gen = 0;
  private _unsubs: Array<() => void> = [];
  private _subTimers: number[] = [];
  private _ringTimer?: number;

  // ---------- chore sync ----------
  private _itemsLoaded = false;
  /** In flight from the start of a sync loop until that loop ends (or the 10 s safety fires). Only the
   *  loop (and a subscription stop) clears it — never the to-do push handler. */
  private _syncing = false;
  /** A to-do push (or other trigger) arrived while a loop was in flight: re-plan once when it ends. */
  private _recheck = false;
  /** Bumped per loop and on stop, so a stale loop's `finally` can't clobber a newer loop's state. */
  private _syncTok = 0;
  /** Summaries added / uids removed by this card today — never added (or removed) twice in a day. */
  private _synced: { day: string; added: Set<string>; removed: Set<string> } = { day: '', added: new Set(), removed: new Set() };
  private _syncSafety?: number;
  private _syncFailKey: string | null = null;
  private _syncFailAt = 0;

  static getConfigElement() { return document.createElement('glasshouse-card-editor'); }
  static getStubConfig(h: HassLike) { return stubConfig(h); }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 'full', rows: 'auto' }; }

  setConfig(c: GlasshouseConfig) {
    const { errors } = validateConfig(c);
    if (errors.length) throw new Error(errors.map((e) => `${e.path || 'config'}: ${e.message}`).join('; '));
    const prev = this._config;
    const restart = this._started && !!prev && watchKey(prev) !== watchKey(c);
    this._config = c;
    try { this._x.laundryAck = localStorage.getItem('glasshouse.laundryAck'); } catch { /* storage blocked */ }
    if (this._hass) this._ids = relevantIds(this._hass, c);
    if (restart) { this._stopSubscriptions(); this._startSubscriptions(); }
    if (this.isConnected) this._ensureCameraStream();
    this._rev++;
  }

  get hass(): HassLike { return this._hass!; }
  set hass(h: HassLike) {
    const prev = this._hass;
    this._hass = h;
    if (!this._config) return;
    if (!prev || prev.entities !== h.entities || prev.devices !== h.devices) this._ids = relevantIds(h, this._config);
    if (this.isConnected && !this._started) this._startSubscriptions();
    const beforeSize = this._ov.size;
    this._ov.prune(h.states, Date.now());
    if (this._ov.size !== beforeSize) this._rev++;
    const ev = this._config.home?.doorbell?.event;
    if (ev && this._ring.seen(h.states[ev]?.state)) this.ring();
    this._maybeSyncChores();
    if (changed(prev, h, this._ids)) this._rev++;
  }

  /** hass with optimistic overrides applied; views and models read this. */
  get view(): HassLike { return this._ov.size ? { ...this._hass!, states: this._ov.apply(this._hass!.states) } : this._hass!; }

  connectedCallback() {
    super.connectedCallback();
    ensureFont();
    this._ro = new ResizeObserver(() => this._fit());
    this._ro.observe(this);
    this._timers.push(window.setInterval(() => this._rev++, 30_000));   // clock + "N min" labels
    if (!this._started) this._startSubscriptions();
    this._ensureCameraStream();
  }

  private _ensureCameraStream() {
    if (this._streamWait || !this._config || customElements.get('ha-camera-stream')) return;
    const cam = firstCamera(this._config);
    if (!cam) return;
    this._streamWait = true;
    customElements.whenDefined('ha-camera-stream').then(() => { this._rev++; });
    const helpers = (window as any).loadCardHelpers;
    if (streamLoadStarted || typeof helpers !== 'function') return;   // demo/tests: no HA frontend helpers
    streamLoadStarted = true;
    Promise.resolve().then(() => helpers())
      .then((hp: any) => hp?.createCardElement?.({ type: 'picture-entity', entity: cam, camera_view: 'live' }))
      .catch((e: unknown) => console.warn('glasshouse camera stream', e));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._timers.forEach(clearInterval); this._timers = [];
    this._stopSubscriptions();
  }

  private _fit() {
    const r = this.getBoundingClientRect();
    if (!r.width) return;
    // Scale the 1280×800 design to fit, then widen (or heighten) the canvas to the screen's shape so there are no
    // empty bands; the flexible cards take up the extra room. Capped so extreme shapes don't over-stretch.
    const h = r.height || r.width * 0.625;
    const s = Math.min(r.width / 1280, h / 800);
    const cw = Math.round(Math.min(r.width / s, 1280 * 1.4)), ch = Math.round(Math.min(h / s, 800 * 1.25));
    if (Math.abs(s - this._scale) > 0.001 || cw !== this._cw || ch !== this._ch) { this._scale = s; this._cw = cw; this._ch = ch; this._rev++; }
  }

  // ---------- subscriptions: forecast, to-do, calendars ----------
  private _startSubscriptions() {
    if (this._started || !this._hass || !this._config) return;
    this._started = true;
    const gen = ++this._gen;
    if (this._overlay?.kind === 'doorbell') this._startRingTimer();
    const h = this._hass, c = this._config;
    if (!h.connection?.subscribeMessage) return;
    const sub = (msg: Record<string, unknown>, cb: (m: any) => void) =>
      h.connection.subscribeMessage(cb, msg).then((u) => {
        if (gen !== this._gen) { u(); return; }   // stopped/restarted while this subscribe was in flight
        this._unsubs.push(u);
      }).catch((e) => console.warn('glasshouse', msg.type, e));
    if (c.weather) sub({ type: 'weather/subscribe_forecast', forecast_type: 'daily', entity_id: c.weather }, (m) => { this._x.forecast = m.forecast; this._rev++; });
    const todo = c.home?.chores?.todo;
    if (todo) sub({ type: 'todo/item/subscribe', entity_id: todo }, (m) => {
      this._x.todoItems = m.items || [];
      this._itemsLoaded = true;
      if (this._syncing) this._recheck = true;   // HA may push before the add_item result: let the loop re-plan
      else this._maybeSyncChores();
      this._rev++;
    });
    const refresh = () => this._refreshCalendars();
    refresh();
    this._subTimers.push(window.setInterval(refresh, 10 * 60_000));
  }

  /** Bumps the generation (so late-resolving subscribeMessage promises unsubscribe immediately), tears down
   *  everything `_startSubscriptions` set up, and resets chore-sync state so a restart re-primes cleanly. */
  private _stopSubscriptions() {
    this._gen++;
    this._unsubs.forEach((u) => u()); this._unsubs = [];
    this._subTimers.forEach(clearInterval); this._subTimers = [];
    if (this._syncSafety != null) { clearTimeout(this._syncSafety); this._syncSafety = undefined; }
    this._clearRingTimer();
    this._started = false;
    this._itemsLoaded = false;
    this._x.todoItems = [];
    this._syncing = false;
    this._recheck = false;
    this._syncTok++;
    this._syncFailKey = null;
  }

  private async _events(entity: string, start: Date, end: Date) {
    const r = await this._hass!.callWS<{ response: Record<string, { events: any[] }> }>({
      type: 'call_service', domain: 'calendar', service: 'get_events', return_response: true,
      target: { entity_id: entity }, service_data: { start_date_time: start.toISOString(), end_date_time: end.toISOString() },
    });
    return r?.response?.[entity]?.events || [];
  }
  private async _refreshCalendars() {
    const c = this._config, now = new Date();
    try {
      const cals = calendars(c.home?.calendar);
      if (cals.length) {
        const end = new Date(now); end.setDate(end.getDate() + 2); end.setHours(0, 0, 0, 0);
        this._x.calendar = (await Promise.all(cals.map(async (cal) => (await this._events(cal.entity, now, end)).map((e) => ({ ...e, color: cal.color }))))).flat();
      }
      if (c.security?.timeline) this._x.timeline = await this._events(c.security.timeline, new Date(+now - 12 * 3600_000), new Date(+now + 60_000));
      this._rev++;
    } catch (e) { console.warn('glasshouse calendar', e); }
  }

  // ---------- chores: keep today's roster items on the to-do list ----------
  /** Idempotent: removes seeded items dated before today (and same-day duplicates) and adds today's missing
   *  roster items (due today). One loop at a time: `_syncing` is set when a loop starts and cleared only when
   *  that loop ends (or by a 10 s safety timeout if a call hangs). A to-do push that lands mid-loop — HA sends
   *  it before the call_service result — only sets `_recheck`, and the loop re-plans once after it finishes.
   *  Independently, a per-day record of what this card already added/removed means the same summary is never
   *  added twice in a day even if a re-plan runs against a stale list. On failure, the exact (plan, items)
   *  pairing is remembered and skipped for 5 minutes, so a persistently-failing call (e.g. a to-do list that
   *  rejects `due_date`) doesn't retry on every unrelated hass update. */
  private async _maybeSyncChores() {
    const todo = this._config?.home?.chores?.todo;
    if (!todo || !this._hass || !this._itemsLoaded) return;
    if (this._syncing) { this._recheck = true; return; }
    const today = dayString(new Date());
    if (this._synced.day !== today) this._synced = { day: today, added: new Set(), removed: new Set() };
    const done = this._synced;
    const rosterId = this._config.home?.chores?.roster;
    const raw = planSync(rosterChores(this._hass, rosterId, new Date()), this._x.todoItems, today);
    // Only seed from a roster that has updated today (local day); a roster still showing yesterday's
    // assignments just after midnight would otherwise seed stale chores. Wait for it to update.
    const r = rosterId ? this._hass.states[rosterId] : undefined;
    const rosterAt = r ? Math.max(Date.parse(r.last_changed) || 0, Date.parse(r.last_updated) || 0) : 0;
    const fresh = !!rosterAt && dayString(new Date(rosterAt)) === today;
    const plan = { remove: raw.remove.filter((u) => !done.removed.has(u)), add: fresh ? raw.add.filter((a) => !done.added.has(a)) : [] };
    if (!plan.remove.length && !plan.add.length) return;
    const key = JSON.stringify([plan, this._x.todoItems.map((i) => [i.uid, i.status])]);
    if (this._syncFailKey === key && Date.now() - this._syncFailAt < 5 * 60_000) return;
    const tok = ++this._syncTok;
    this._syncing = true;
    this._recheck = false;
    this._syncSafety = window.setTimeout(() => { if (tok === this._syncTok) { this._syncing = false; this._syncSafety = undefined; } }, 10_000);
    const h = this._hass;
    try {
      if (plan.remove.length) {
        plan.remove.forEach((u) => done.removed.add(u));
        try { await h.callService('todo', 'remove_item', { item: plan.remove }, { entity_id: todo }); }
        catch (e) { plan.remove.forEach((u) => done.removed.delete(u)); throw e; }
      }
      for (const item of plan.add) {
        done.added.add(item);
        try { await h.callService('todo', 'add_item', { item, due_date: today }, { entity_id: todo }); }
        catch (e) { done.added.delete(item); throw e; }
      }
      if (tok === this._syncTok) this._syncFailKey = null;
    } catch (e) {
      console.warn('glasshouse chores', e);
      if (tok === this._syncTok) { this._syncFailKey = key; this._syncFailAt = Date.now(); }
    } finally {
      if (tok === this._syncTok) {
        if (this._syncSafety != null) { clearTimeout(this._syncSafety); this._syncSafety = undefined; }
        this._syncing = false;
        if (this._recheck) { this._recheck = false; this._maybeSyncChores(); }
      }
    }
  }

  async toggleChore(uid: string | undefined, summary: string, done: boolean) {
    const todo = this._config.home?.chores?.todo;
    if (!todo) return;
    const prevItems = this._x.todoItems;
    this._x.todoItems = uid ? prevItems.map((i) => (i.uid === uid ? { ...i, status: done ? 'needs_action' : 'completed' } : i)) : prevItems;
    this._rev++;
    const ok = await this.callSvc('todo', 'update_item', { item: uid || summary, status: done ? 'needs_action' : 'completed' }, { entity_id: todo });
    if (!ok) { this._x.todoItems = prevItems; this._rev++; }
  }

  ackLaundry(since: string | null) {
    this._x.laundryAck = since;
    try { if (since) localStorage.setItem('glasshouse.laundryAck', since); } catch { /* storage blocked */ }
    this._rev++;
  }

  // ---------- actions ----------
  async act(id: string): Promise<void> {
    const call = toggleCall(this.view, id);
    if (call) await this._run(call);
  }
  async callSvc(domain: string, service: string, data: Record<string, unknown> = {}, target?: { entity_id: string | string[] }, optimistic?: Array<[string, string]>): Promise<boolean> {
    return this._run({ domain, service, data, target: target || { entity_id: [] }, optimistic });
  }
  private async _run(call: Call): Promise<boolean> {
    if (!this._hass?.connected) return false;
    try { const p = run(this._hass, this._ov, call); this._rev++; await p; return true; }
    catch (e: any) { this.showToast(`Home Assistant said no: ${e?.message || e?.code || 'error'}`); this._rev++; return false; }
  }
  needsHold(id: string) { return needsHold(this.view, id, this._config.confirm_hold); }
  /** A plain tap on a hold-guarded control: runs the toggle only when no hold is needed right now
   *  (decided at tap time from the current view, so a stale render can't skip the hold). */
  tap(id: string) { if (!this.needsHold(id)) this.act(id); }
  /** What a completed 1 s hold on `[data-hold=id]` runs: disarm for an armed alarm panel, otherwise the
   *  entity's toggle (unlock a lock, open a cover). */
  async holdAction(id: string): Promise<void> {
    if (domainOf(id) === 'alarm_control_panel') {
      if (alarmDisarmable(val(this.view, id))) await this.callSvc('alarm_control_panel', 'alarm_disarm', {}, { entity_id: id });
      return;
    }
    await this.act(id);
  }

  // ---------- ui state ----------
  nav(t: Tab) { this._tab = t; this._overlay = null; }
  openOverlay(o: Overlay) { this._overlay = o; }
  closeOverlay() { this._overlay = null; }
  showToast(msg: string) { this._toast = msg; window.setTimeout(() => { if (this._toast === msg) this._toast = null; }, 2600); }
  private _clearRingTimer() { if (this._ringTimer != null) { clearInterval(this._ringTimer); this._ringTimer = undefined; } }
  /** Opens the doorbell takeover. During night mode it renders above the night screen (the night helper
   *  stays on), and the night screen shows again when the takeover is dismissed or expires. */
  ring() {
    const secs = this._config.home?.doorbell?.takeover_seconds ?? 45;
    this._overlay = { kind: 'doorbell', until: Date.now() + secs * 1000, pkg: false };
    this._startRingTimer();
  }
  /** Ticks the takeover countdown and closes it at `until`. Also called when subscriptions (re)start, since
   *  `_stopSubscriptions` clears this timer and a takeover may still be open across a reconnect. */
  private _startRingTimer() {
    this._clearRingTimer();
    if (this._overlay?.kind !== 'doorbell') return;
    this._ringTimer = window.setInterval(() => {
      if (this._overlay?.kind !== 'doorbell') { this._clearRingTimer(); return; }
      if (Date.now() >= this._overlay.until) { this._overlay = null; this._clearRingTimer(); }
      this.requestUpdate();
    }, 1000);
  }
  async setNight(on: boolean) {
    const id = this._config.night_mode;
    if (id) await this.callSvc('input_boolean', on ? 'turn_on' : 'turn_off', {}, { entity_id: id }, [[id, on ? 'on' : 'off']]);
  }

  protected shouldUpdate(changedProps: PropertyValues) { return !!this._config && !!this._hass && changedProps.size > 0; }
  protected updated() { attachHold(this.renderRoot as ShadowRoot, this); }

  render() {
    const m: Model = buildModel(this.view, this._config, this._x, new Date());
    const tab = m.tabs.includes(this._tab) ? this._tab : 'home';
    const V = { home: homeView, security: securityView, rooms: roomsView, climate: climateView, garage: garageView, family: familyView }[tab];
    const cls = `frame ${this._config.blur === false ? 'noblur' : ''} ${this._hass!.connected ? '' : 'disconnected'}`;
    return html`<div class=${cls} style="width:${this._cw}px;height:${this._ch}px;transform:translate(-50%,-50%) scale(${this._scale})">
      <div class="wallpaper wp-${this._config.wallpaper || 'dusk'}"></div>
      ${m.night ? html`<div style="display:contents">${nightView(m, this)}</div>
        <div style="display:contents">${this._overlay?.kind === 'doorbell' ? overlayView(this._overlay, m, this) : ''}</div>` : html`
        <div class="chrome">${header(m, this._hass!.connected, () => this.openOverlay({ kind: 'alerts' }), thermostatCapsule(m, this))}${rail(m.tabs, tab, (t) => this.nav(t))}${V(m, this)}</div>
        <div style="display:contents">${this._overlay ? overlayView(this._overlay, m, this) : ''}</div>`}
      ${this._toast ? html`<div class="capsule toast">${icon('check', 16, 'color:#98E6CA')}${this._toast}</div>` : ''}
    </div>`;
  }
}

if (!customElements.get('glasshouse-card')) customElements.define('glasshouse-card', GlasshouseCard);
const w = window as any;
w.customCards = w.customCards || [];
if (!w.customCards.some((c: any) => c.type === 'glasshouse-card')) {
  w.customCards.push({ type: 'glasshouse-card', name: 'Glasshouse', description: 'Frosted-glass family wall dashboard', preview: false });
}
