import { html, type TemplateResult } from 'lit';
import { directive, Directive, type ElementPart } from 'lit/directive.js';
import {
  AirVent, ArrowLeftRight, Bath, BatteryCharging, BatteryMedium, Bed, BedDouble, BedSingle, Bell, BellRing, Bot, CalendarDays,
  Car, CarFront, Check, Circle, Clapperboard, Cloud, CloudFog, CloudHail, CloudLightning, CloudMoon, CloudRain, CloudRainWind,
  CloudSnow, CloudSun, Dog, DoorClosed, DoorOpen, Droplet, Droplets, Eye, EyeOff, Fan, Fingerprint, Flame, Footprints, Hand,
  Heater, House, Lamp, LampCeiling, Lightbulb, Lock, LockOpen, Maximize2, Megaphone, Mic, Minus, Monitor, Moon, MoonStar,
  Package, PartyPopper, Pause, PersonStanding, Play, Plug, PlugZap, Plus, Power, Printer, Settings2, Shield, ShieldAlert,
  ShieldCheck, Siren, SkipBack, SkipForward, Sofa, Speaker, SprayCan, Sprout, Sun, Thermometer, Tractor, Trash2, Trees,
  TriangleAlert, User, UserX, Users, UtensilsCrossed, Utensils, UtilityPole, Volume1, Volume2, Warehouse, WashingMachine,
  Waves, WifiOff, Wind, X, Zap,
} from 'lucide';

type Node = Array<[string, Record<string, string | number>]> | ['svg', Record<string, unknown>, Array<[string, Record<string, string | number>]>];
const REG: Record<string, Node> = {
  'air-vent': AirVent, 'arrow-left-right': ArrowLeftRight, bath: Bath, 'battery-charging': BatteryCharging, 'battery-medium': BatteryMedium,
  bed: Bed, 'bed-double': BedDouble, 'bed-single': BedSingle, bell: Bell, 'bell-ring': BellRing, bot: Bot, 'calendar-days': CalendarDays,
  car: Car, 'car-front': CarFront, check: Check, circle: Circle, clapperboard: Clapperboard, cloud: Cloud, 'cloud-fog': CloudFog,
  'cloud-hail': CloudHail, 'cloud-lightning': CloudLightning, 'cloud-moon': CloudMoon, 'cloud-rain': CloudRain, 'cloud-rain-wind': CloudRainWind,
  'cloud-snow': CloudSnow, 'cloud-sun': CloudSun, dog: Dog, 'door-closed': DoorClosed, 'door-open': DoorOpen, droplet: Droplet, droplets: Droplets,
  eye: Eye, 'eye-off': EyeOff, fan: Fan, fingerprint: Fingerprint, flame: Flame, footprints: Footprints, hand: Hand, heater: Heater,
  house: House, lamp: Lamp, 'lamp-ceiling': LampCeiling, lightbulb: Lightbulb, lock: Lock, 'lock-open': LockOpen, 'maximize-2': Maximize2,
  megaphone: Megaphone, mic: Mic, minus: Minus, monitor: Monitor, moon: Moon, 'moon-star': MoonStar, package: Package, 'party-popper': PartyPopper,
  pause: Pause, 'person-standing': PersonStanding, play: Play, plug: Plug, 'plug-zap': PlugZap, plus: Plus, power: Power, printer: Printer,
  'settings-2': Settings2, shield: Shield, 'shield-alert': ShieldAlert, 'shield-check': ShieldCheck, siren: Siren, 'skip-back': SkipBack,
  'skip-forward': SkipForward, sofa: Sofa, speaker: Speaker, 'spray-can': SprayCan, sprout: Sprout, sun: Sun, thermometer: Thermometer,
  tractor: Tractor, 'trash-2': Trash2, trees: Trees, 'triangle-alert': TriangleAlert, user: User, 'user-x': UserX, users: Users,
  'utensils-crossed': UtensilsCrossed, utensils: Utensils, 'utility-pole': UtilityPole, 'volume-1': Volume1, 'volume-2': Volume2,
  warehouse: Warehouse, 'washing-machine': WashingMachine, waves: Waves, 'wifi-off': WifiOff, wind: Wind, x: X, zap: Zap,
} as unknown as Record<string, Node>;

const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const cache = new Map<string, string>();
function inner(name: string): string {
  let s = cache.get(name);
  if (s) return s;
  const node = REG[name] || REG.circle;
  const children = (node[0] === 'svg' ? (node as any)[2] : node) as Array<[string, Record<string, unknown>]>;
  s = children.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`).join('');
  cache.set(name, s);
  return s;
}

// unsafeSVG's ChildPart-based insertion into an SVG-namespaced element does not
// reliably commit content under happy-dom (Lit's Template walker finds the marker,
// but the cloned part fails to insert nodes into the SVG subtree in that environment).
// Setting innerHTML directly via an ElementPart directive works consistently in both
// happy-dom and real browsers, and still updates on every re-render since this
// directive's update() runs unconditionally rather than only on element identity change.
class IconContentDirective extends Directive {
  render(_name: string) {
    return _name;
  }
  update(part: ElementPart, [name]: [string]) {
    (part.element as unknown as SVGElement).innerHTML = inner(name);
    return name;
  }
}
const iconContent = directive(IconContentDirective);

export const icon = (name: string, size = 18, style = ''): TemplateResult => html`<svg class="i" width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style=${style} aria-hidden="true" ${iconContent(name)}></svg>`;
