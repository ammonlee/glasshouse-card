import '../src/editor/glasshouse-card-editor';
import { setIn } from '../src/editor/list';
import { miniHouse } from './helpers/hass';

describe('setIn', () => {
  it('sets nested values immutably and prunes empties', () => {
    const a = { type: 'x', home: { thermostat: 'climate.a' } };
    const b = setIn(a, ['home', 'media'], 'media_player.tv');
    expect(b).toEqual({ type: 'x', home: { thermostat: 'climate.a', media: 'media_player.tv' } });
    expect(a).toEqual({ type: 'x', home: { thermostat: 'climate.a' } });
    expect(setIn(b, ['home', 'media'], undefined)).toEqual({ type: 'x', home: { thermostat: 'climate.a' } });
    expect(setIn({ type: 'x', home: { media: 'm' } }, ['home', 'media'], '')).toEqual({ type: 'x' });
  });
});

describe('<glasshouse-card-editor>', () => {
  it('fires config-changed when a tab value changes', async () => {
    const el = document.createElement('glasshouse-card-editor') as any;
    el.hass = miniHouse();
    el.setConfig({ type: 'custom:glasshouse-card' });
    document.body.appendChild(el);
    await el.updateComplete;
    const got: any[] = [];
    el.addEventListener('config-changed', (e: CustomEvent) => got.push(e.detail.config));
    el._onForm(['home'], { thermostat: 'climate.532583116183' });
    expect(got.at(-1)).toEqual({ type: 'custom:glasshouse-card', home: { thermostat: 'climate.532583116183' } });
  });
  it('lists room discovery with exclude checkboxes', async () => {
    const el = document.createElement('glasshouse-card-editor') as any;
    el.hass = miniHouse();
    el.setConfig({ type: 'custom:glasshouse-card', rooms: [{ area: 'kitchen' }] });
    el._tab = 'rooms';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('switch.unknown_switch_3');
    const got: any[] = [];
    el.addEventListener('config-changed', (e: CustomEvent) => got.push(e.detail.config));
    el._toggleExclude(0, 'switch.unknown_switch_3');
    expect(got.at(-1).rooms[0].exclude).toEqual(['switch.unknown_switch_3']);
  });
});
