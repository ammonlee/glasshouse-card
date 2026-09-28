To demo against your real house, open Home Assistant in a browser, open DevTools, and run:

```js
const h = document.querySelector('home-assistant').hass;
const strip = (a) => { const { access_token, entity_picture, ...rest } = a; return rest; };
copy(JSON.stringify({
  areas: Object.fromEntries(Object.values(h.areas).map((a) => [a.area_id, a.name])),
  devices: Object.fromEntries(Object.values(h.devices).map((d) => [d.id, d.area_id])),
  entities: Object.fromEntries(Object.values(h.entities).map((e) => [e.entity_id, { area_id: e.area_id, device_id: e.device_id, hidden: e.hidden, entity_category: e.entity_category }])),
  states: Object.values(h.states).map((s) => ({ entity_id: s.entity_id, state: s.state, attributes: strip(s.attributes), last_changed: s.last_changed, last_updated: s.last_updated })),
}));
```

Paste into `demo/house.json` (git-ignored). The demo prefers it over the mini fixture.
