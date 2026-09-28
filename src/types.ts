export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}
export interface EntityRegistryDisplay {
  entity_id: string;
  area_id?: string | null;
  device_id?: string | null;
  hidden?: boolean;
  entity_category?: string | null;
}
export interface Target { entity_id: string | string[] }
export interface HassLike {
  states: Record<string, HassEntity>;
  entities: Record<string, EntityRegistryDisplay>;
  devices: Record<string, { id: string; area_id?: string | null }>;
  areas: Record<string, { area_id: string; name: string }>;
  connected: boolean;
  callService(domain: string, service: string, data?: Record<string, unknown>, target?: Target): Promise<unknown>;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  connection: { subscribeMessage<T>(cb: (m: T) => void, msg: Record<string, unknown>): Promise<() => void> };
  hassUrl(path?: string): string;
}
