import { calendars, upNext, CAL_PALETTE } from '../../src/model/calendar';
import { validateConfig } from '../../src/config/schema';

describe('calendar colours', () => {
  it('gives each calendar a palette colour by position, or its configured colour', () => {
    expect(calendars('calendar.family')).toEqual([{ entity: 'calendar.family', color: CAL_PALETTE[0] }]);
    expect(calendars(['calendar.family', { entity: 'calendar.school', color: 'orange' }, { entity: 'calendar.home', color: '#123456' }, 'calendar.work']))
      .toEqual([
        { entity: 'calendar.family', color: CAL_PALETTE[0] },
        { entity: 'calendar.school', color: '#E58A4E' },
        { entity: 'calendar.home', color: '#123456' },
        { entity: 'calendar.work', color: CAL_PALETTE[3] },
      ]);
    expect(calendars(undefined)).toEqual([]);
  });
  it('carries each event\'s calendar colour into the Up next rows', () => {
    const now = new Date('2026-09-28T14:00:00');
    const rows = upNext([
      { start: '2026-09-28T17:00:00', summary: 'Soccer', color: '#62D7AC' },
      { start: '2026-09-28T15:00:00', summary: 'Dentist' },
    ], now);
    expect(rows).toEqual([
      { head: 'Today' }, { time: '3:00 PM', title: 'Dentist', color: CAL_PALETTE[0] },
      { head: 'Tonight' }, { time: '5:00 PM', title: 'Soccer', color: '#62D7AC' },
    ]);
  });
  it('accepts calendars as ids or { entity, color } mappings, and rejects junk', () => {
    expect(validateConfig({ type: 'x', home: { calendar: ['calendar.a', { entity: 'calendar.b', color: 'green' }] } }).errors).toEqual([]);
    expect(validateConfig({ type: 'x', home: { calendar: [{ color: 'green' }] } }).errors[0].path).toBe('home.calendar[0]');
  });
});
