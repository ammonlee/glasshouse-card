import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

async function ringFor(seconds: string) {
  const h = makeHass([{ entity_id: 'person.june', state: 'home', attributes: { friendly_name: 'June' } }, { entity_id: 'sensor.jt', state: seconds }]);
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card', people: [{ person: 'person.june', toothbrush: 'sensor.jt' }] });
  el.hass = h; document.body.appendChild(el); await el.updateComplete;
  el.nav('family'); await el.updateComplete;
  return el.shadowRoot!.querySelector('[data-test="brush-progress"]') as SVGCircleElement;
}

describe('brushing ring', () => {
  it('draws no progress arc (no dot) at zero seconds', async () => {
    expect((await ringFor('0')).getAttribute('stroke-opacity')).toBe('0');
  });
  it('draws the arc once there is any brushing', async () => {
    const c = await ringFor('60');
    expect(c.getAttribute('stroke-opacity')).toBe('1');
    expect(c.getAttribute('stroke-dasharray')).toBe('81.7 163.4');
  });
});
