import '../../src/glasshouse-card';
import { miniHouse } from '../helpers/hass';

async function mount() {
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card', rooms: [{ area: 'kitchen', floor: 'Main Floor', icon: 'utensils' }, { area: 'june_s_room', name: 'Gold Room', floor: 'Basement' }], automations: [] });
  el.hass = miniHouse(); document.body.appendChild(el); await el.updateComplete;
  el.nav('rooms'); await el.updateComplete;
  return el;
}

describe('rooms view', () => {
  it('renders floors, counts and tiles', async () => {
    const r = (await mount()).shadowRoot!;
    expect(r.textContent).toContain('Main Floor');
    expect(r.textContent).toContain('2 lights on');
    expect(r.textContent).toContain('Gold Room');
    expect(r.textContent).toContain('1 on');
  });
  it('room icon toggles the whole room off', async () => {
    const el = await mount();
    (el.shadowRoot!.querySelector('[data-test="room-kitchen"] .ic') as HTMLElement).click();
    await Promise.resolve();
    expect(el.hass.calls.at(-1)).toEqual(['homeassistant', 'turn_off', {}, { entity_id: ['switch.island_lights_5', 'switch.kitchen_lights', 'switch.unknown_switch_3'] }]);
  });
  it('tapping a tile opens the popup and a light toggles', async () => {
    const el = await mount();
    (el.shadowRoot!.querySelector('[data-test="room-kitchen"]') as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.sheet')?.textContent).toContain('Kitchen');
    (el.shadowRoot!.querySelector('[data-test="light-switch.kitchen_lights"]') as HTMLElement).click();
    await Promise.resolve();
    expect(el.hass.calls.at(-1)).toEqual(['switch', 'turn_off', {}, { entity_id: 'switch.kitchen_lights' }]);
  });
});
