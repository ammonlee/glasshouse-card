import type { HassLike } from '../types';
import { val, attr, exists } from './util';

export interface WeatherVm { temp: number | null; cond: string; icon: string; hi: number | null; lo: number | null }
const COND: Record<string, [string, string]> = {
  'clear-night': ['Clear', 'moon'], cloudy: ['Cloudy', 'cloud'], fog: ['Fog', 'cloud-fog'], hail: ['Hail', 'cloud-hail'],
  lightning: ['Lightning', 'cloud-lightning'], 'lightning-rainy': ['Storms', 'cloud-lightning'], partlycloudy: ['Partly cloudy', 'cloud-sun'],
  pouring: ['Pouring', 'cloud-rain-wind'], rainy: ['Rain', 'cloud-rain'], snowy: ['Snow', 'cloud-snow'], 'snowy-rainy': ['Sleet', 'cloud-snow'],
  sunny: ['Sunny', 'sun'], windy: ['Windy', 'wind'], 'windy-variant': ['Windy', 'wind'], exceptional: ['Alert', 'triangle-alert'],
};

export function weather(h: HassLike, id?: string, forecast?: Array<{ temperature: number; templow?: number }>): WeatherVm | null {
  if (!id || !exists(h, id)) return null;
  const [cond, icon] = COND[val(h, id)!] || [val(h, id)!, 'cloud-sun'];
  const t = attr<number>(h, id, 'temperature');
  const today = forecast?.[0];
  return { temp: t != null ? Math.round(t) : null, cond, icon, hi: today ? Math.round(today.temperature) : null, lo: today?.templow != null ? Math.round(today.templow) : null };
}
