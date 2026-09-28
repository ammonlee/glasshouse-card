import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

const states = [
  { entity_id: 'todo.chores', state: '0' },
  { entity_id: 'script.chore_roll_call', state: 'off', attributes: { friendly_name: 'Chore Roll Call' } },
  { entity_id: 'person.june', state: 'home', attributes: { friendly_name: 'June' } },
  { entity_id: 'sensor.jt', state: '0' },
];

async function mount(chores: Record<string, string>) {
  const h = makeHass(states);
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card', people: [{ person: 'person.june', toothbrush: 'sensor.jt' }], home: { chores } });
  el.hass = h; document.body.appendChild(el); await el.updateComplete;
  return { el, h };
}

describe('roll call', () => {
  it('the Home megaphone runs the configured roll-call script', async () => {
    const { el, h } = await mount({ todo: 'todo.chores', roll_call: 'script.chore_roll_call' });
    (el.shadowRoot!.querySelector('[data-test="roll-call"]') as HTMLElement).click();
    await Promise.resolve();
    expect(h.calls).toContainEqual(['script', 'turn_on', {}, { entity_id: 'script.chore_roll_call' }]);
  });
  it('the Family Roll call button runs it too', async () => {
    const { el, h } = await mount({ todo: 'todo.chores', roll_call: 'script.chore_roll_call' });
    el.nav('family'); await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('[data-test="roll-call"]') as HTMLElement;
    expect(btn.textContent).toContain('Roll call');
    btn.click(); await Promise.resolve();
    expect(h.calls).toContainEqual(['script', 'turn_on', {}, { entity_id: 'script.chore_roll_call' }]);
  });
  it('shows no roll-call button when no script is configured', async () => {
    const { el } = await mount({ todo: 'todo.chores' });
    expect(el.shadowRoot!.querySelector('[data-test="roll-call"]')).toBeNull();
  });
});
