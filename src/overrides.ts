import type { HassEntity } from './types';

const TTL = 10_000;
const TRANSITIONAL = new Set(['opening', 'closing', 'locking', 'unlocking']);
interface Entry { state: string; baseUpdated: string | undefined; expires: number }

export class Overrides {
  private m = new Map<string, Entry>();
  get size() { return this.m.size; }
  set(entity: string, state: string, base: HassEntity | undefined, now: number) {
    this.m.set(entity, { state, baseUpdated: base?.last_updated, expires: now + TTL });
  }
  delete(entity: string) { this.m.delete(entity); }
  prune(states: Record<string, HassEntity>, now: number) {
    for (const [id, e] of this.m) {
      const cur = states[id];
      if (now > e.expires || (cur && cur.last_updated !== e.baseUpdated && !TRANSITIONAL.has(cur.state))) this.m.delete(id);
    }
  }
  apply(states: Record<string, HassEntity>): Record<string, HassEntity> {
    if (!this.m.size) return states;
    const out = { ...states };
    for (const [id, e] of this.m) if (out[id]) out[id] = { ...out[id], state: e.state };
    return out;
  }
}
