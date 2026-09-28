# Glasshouse

A frosted-glass family wall dashboard for Home Assistant: one card with six tabs (Home, Security, Rooms, Climate, Garage, Family), built for a 1280×800 wall tablet. Everything ships in one file: the font, the icons and the code. Nothing loads from the internet.

Requires Home Assistant **2024.10** or newer (the night-mode blueprint uses the 2024.10 `trigger:`/`action:` syntax).

## Install (HACS custom repository)

1. HACS → ⋮ → **Custom repositories** → add this repo URL, category **Dashboard**.
2. Install **Glasshouse**. HACS adds the resource `/hacsfiles/glasshouse-card/glasshouse-card.js`.
3. Refresh the browser.

## Set up

1. **Settings → Devices & services → Helpers**
   - **To-do list** (Local To-do), named `Chores`. With a chore roster sensor configured, the card seeds this list daily with each day's chores (a due date of today) and removes its own older chore items, so it stays tidy on its own. It never removes anything else, and without a roster it uses the list as-is.
   - **Toggle**, named `Glasshouse night`. This is the night screen switch.
2. **Import the night-mode blueprint**: Settings → Automations → Blueprints → Import, then paste
   `https://github.com/ammonlee/glasshouse-card/blob/main/blueprints/automation/glasshouse_night_mode.yaml`.
3. **Settings → Dashboards → Add dashboard** called `Glasshouse`. Edit it, add a view with **View type: Panel (single card)**, and add the **Glasshouse** card. The card fills in what it can find in your house; fix the rest in its editor.
4. On the wall tablet, use Browser Mod to hide the header and sidebar for that browser, then open `/glasshouse`.

## Configuration

Every section is optional; a missing section hides its card or tab. Use the visual editor, or YAML:

```yaml
type: custom:glasshouse-card
wallpaper: dusk            # dusk | aurora | ember
blur: true                 # false = flat fill for slow tablets
weather: weather.forecast_home
night_mode: input_boolean.glasshouse_night
people:
  - { person: person.june, color: gold, occupancy: binary_sensor.gold_occupied_recent, toothbrush: sensor.june_s_toothbrush_time }
alerts:
  safety: [cover.garage_door, binary_sensor.leak]
  nudge:  [lock.back_door, { entity: sensor.co2, above: 1200, label: Air quality poor, icon: wind }]
home:
  doorbell: { camera: camera.doorbell, event: event.doorbell, lock: lock.front_door }
  chores: { todo: todo.chores, roster: sensor.chore_roster_today }
  calendar: calendar.family
  thermostat: climate.main_floor
  media: media_player.living_room
  good_night: script.good_night_house
rooms:
  - { area: kitchen, icon: utensils, floor: Main Floor }
automations: [automation.lights_sunset_sunrise]
party: media_player.party
confirm_hold: [lock.front_door, cover.garage_door]   # default: every lock and garage/gate/door cover
```

Unlocking and opening the entities in `confirm_hold` needs a 1-second hold; locking and closing are a single tap. Disarming the alarm always needs the hold; arming is a single tap.

See `demo/demo-config.ts` for a small example. To try the demo with your own house, put your config in `local/house-config.json` and a state snapshot in `demo/house.json` (both git-ignored; see `demo/README.md`).

## Develop

```bash
npm install
npm test
npm run dev      # http://localhost:5173/demo/
npm run build    # dist/glasshouse-card.js
```
