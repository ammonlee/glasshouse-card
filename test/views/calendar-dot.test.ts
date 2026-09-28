import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

describe('Up next dots', () => {
  it('draws each event dot in its calendar colour', async () => {
    const h = makeHass([{ entity_id: 'calendar.family', state: 'off' }]);
    const el = document.createElement('glasshouse-card') as any;
    el.setConfig({ type: 'custom:glasshouse-card', home: { calendar: [{ entity: 'calendar.family', color: 'purple' }] } });
    el.hass = h; document.body.appendChild(el); await el.updateComplete;
    const soon = new Date(Date.now() + 3600_000).toISOString();
    el._x.calendar = [{ start: soon, summary: 'Soccer', color: '#B07CC6' }]; el._rev++; await el.updateComplete;
    const dot = el.shadowRoot!.querySelector('[data-test="event-dot"]') as HTMLElement;
    expect(dot.getAttribute('style')).toContain('#B07CC6');
  });
});
