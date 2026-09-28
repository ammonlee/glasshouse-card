export type Wallpaper = 'dusk' | 'aurora' | 'ember';
export type PersonColor = 'blue' | 'gold' | 'grey' | 'green' | string;

export interface AlertRule { entity: string; above?: number; below?: number; state?: string; label?: string; icon?: string }
export interface PersonCfg { person: string; name?: string; initials?: string; color?: PersonColor; occupancy?: string; toothbrush?: string }
export interface CameraCfg { entity: string; name?: string }
export interface RoomCfg { area: string; name?: string; icon?: string; floor?: string; include?: string[]; exclude?: string[]; climate?: string; camera?: string; occupancy?: string }
export interface ClimateRoomCfg { name: string; climate?: string; vents?: string[]; occupancy?: string }
export interface CarCfg { name: string; battery?: string; range?: string; charger_power?: string; lock?: string; climate?: string; sentry?: string; charge_limit?: string; inside?: string; odometer?: string }

export interface GlasshouseConfig {
  type: string;
  wallpaper?: Wallpaper;
  blur?: boolean;
  weather?: string;
  night_mode?: string;
  confirm_hold?: string[];
  people?: PersonCfg[];
  alerts?: { safety?: Array<string | AlertRule>; nudge?: Array<string | AlertRule>; secure_label?: string };
  home?: {
    doorbell?: { camera?: string; package_camera?: string; event?: string; lock?: string; takeover_seconds?: number };
    chores?: { todo?: string; roster?: string };
    calendar?: string | string[];
    thermostat?: string;
    media?: string;
    laundry?: { washer?: string; washer_done?: string; washer_remaining?: string; dryer?: string; dryer_done?: string; dryer_remaining?: string; dryer_total?: string; loads_week?: string };
    good_night?: string;
  };
  security?: { alarm?: string; cameras?: Array<string | CameraCfg>; timeline?: string; locks?: string[]; covers?: string[]; sensors?: string[] };
  rooms?: RoomCfg[];
  automations?: string[];
  party?: string;
  climate?: { rooms?: ClimateRoomCfg[]; air?: { co2?: string; aqi?: string }; toggles?: string[] };
  garage?: { cars?: CarCfg[]; energy?: { solar?: string; grid?: string; home?: string; battery?: string; battery_level?: string; chargers?: string[] } };
  family?: { vacuums?: string[]; mower?: string; sprinklers?: { zones?: string[]; rain_delay?: string; strip_prefix?: string }; printer?: string[]; laundry_card?: boolean; hot_tub?: string };
}
