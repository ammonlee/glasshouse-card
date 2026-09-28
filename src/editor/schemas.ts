const ent = (name: string, label: string, domain?: string | string[]) => ({ name, label, selector: { entity: domain ? { domain } : {} } });
const ents = (name: string, label: string, domain?: string | string[]) => ({ name, label, selector: { entity: { multiple: true, ...(domain ? { domain } : {}) } } });
const text = (name: string, label: string) => ({ name, label, selector: { text: {} } });

export const SCHEMAS = {
  general: [
    { name: 'wallpaper', label: 'Wallpaper', selector: { select: { mode: 'dropdown', options: ['dusk', 'aurora', 'ember'] } } },
    { name: 'blur', label: 'Frosted glass (turn off if slow)', selector: { boolean: {} } },
    ent('weather', 'Weather', 'weather'),
    ent('night_mode', 'Night mode switch', 'input_boolean'),
    ents('confirm_hold', 'Hold to open/unlock (leave empty for all locks and garage doors)', ['lock', 'cover']),
  ],
  home: [
    { name: 'doorbell', label: 'Doorbell', type: 'expandable', schema: [ent('camera', 'Camera', 'camera'), ent('package_camera', 'Package camera', 'camera'), ent('event', 'Doorbell event', 'event'), ent('lock', 'Front door lock', 'lock'), { name: 'takeover_seconds', label: 'Takeover seconds', selector: { number: { min: 10, max: 180, mode: 'box' } } }] },
    { name: 'chores', label: 'Chores', type: 'expandable', schema: [ent('todo', 'Chores to-do list', 'todo'), ent('roster', 'Roster sensor (optional)', 'sensor'), ent('roll_call', 'Roll call script (optional)', 'script')] },
    ents('calendar', 'Up next calendars', 'calendar'),
    ent('thermostat', 'Thermostat', 'climate'),
    ent('media', 'Media player', 'media_player'),
    { name: 'laundry', label: 'Laundry', type: 'expandable', schema: [ent('washer', 'Washer status', 'sensor'), ent('washer_done', 'Washer finished', 'binary_sensor'), ent('washer_remaining', 'Washer minutes left', 'sensor'), ent('dryer', 'Dryer status', 'sensor'), ent('dryer_done', 'Dryer finished', 'binary_sensor'), ent('dryer_remaining', 'Dryer minutes left', 'sensor'), ent('dryer_total', 'Dryer total minutes', 'sensor'), ent('loads_week', 'Loads this week', 'sensor')] },
    ent('good_night', 'Good Night script', 'script'),
  ],
  security: [ent('alarm', 'Alarm panel', 'alarm_control_panel'), ent('timeline', 'AI timeline calendar', 'calendar'), ents('locks', 'Locks', 'lock'), ents('covers', 'Garage / gate doors', 'cover'), ents('sensors', 'Sensors & water', ['binary_sensor', 'sensor', 'switch'])],
  climate: [{ name: 'air', label: 'Air', type: 'expandable', schema: [ent('co2', 'CO₂', 'sensor'), ent('aqi', 'Air quality index', 'sensor')] }, ents('toggles', 'Toggles', ['input_boolean', 'switch', 'water_heater'])],
  garage: [{ name: 'energy', label: 'Energy', type: 'expandable', schema: [ent('solar', 'Solar power', 'sensor'), ent('grid', 'Grid power', 'sensor'), ent('home', 'Home power', 'sensor'), ent('battery', 'Battery power', 'sensor'), ent('battery_level', 'Battery level', 'sensor'), ents('chargers', 'EV charger current sensors', 'sensor')] }],
  family: [ents('vacuums', 'Vacuums', 'vacuum'), ent('mower', 'Mower', 'lawn_mower'), { name: 'sprinklers', label: 'Sprinklers', type: 'expandable', schema: [ents('zones', 'Zones', 'switch'), ent('rain_delay', 'Rain delay', 'switch'), text('strip_prefix', 'Strip from zone names')] }, ents('printer', 'Printer ink sensors', 'sensor'), { name: 'laundry_card', label: 'Show laundry here too', selector: { boolean: {} } }, ent('hot_tub', 'Hot tub', 'climate')],
  person: [ent('person', 'Person', 'person'), text('name', 'Name'), text('initials', 'Initials'), { name: 'color', label: 'Colour', selector: { select: { mode: 'dropdown', options: ['blue', 'gold', 'grey', 'green', 'orange', 'purple'] } } }, ent('occupancy', 'Bedroom occupancy', 'binary_sensor'), ent('toothbrush', 'Toothbrush time', 'sensor')],
  room: [{ name: 'area', label: 'Area', selector: { area: {} } }, text('name', 'Name'), { name: 'icon', label: 'Icon (lucide name)', selector: { text: {} } }, text('floor', 'Floor'), ent('climate', 'Temperature from', 'climate'), ent('camera', 'Camera', 'camera'), ent('occupancy', 'Occupancy', 'binary_sensor'), ents('include', 'Also include', ['light', 'switch', 'fan', 'cover'])],
  climateRoom: [text('name', 'Name'), ent('climate', 'Room climate', 'climate'), ents('vents', 'Vents', 'cover'), ent('occupancy', 'Occupancy', 'binary_sensor')],
  car: [text('name', 'Name'), ent('battery', 'Battery %', 'sensor'), ent('range', 'Range', 'sensor'), ent('charger_power', 'Charger power', 'sensor'), ent('lock', 'Doors', 'lock'), ent('climate', 'Climate', 'climate'), ent('sentry', 'Sentry', 'switch'), ent('charge_limit', 'Charge limit', 'number'), ent('inside', 'Inside temperature', 'sensor'), ent('odometer', 'Odometer', 'sensor')],
  camera: [ent('entity', 'Camera', 'camera'), text('name', 'Name')],
  alert: [ent('entity', 'Entity'), { name: 'above', label: 'Active above', selector: { number: { mode: 'box' } } }, { name: 'below', label: 'Active below', selector: { number: { mode: 'box' } } }, text('state', 'Active when state is'), text('label', 'Label'), text('icon', 'Icon')],
};
