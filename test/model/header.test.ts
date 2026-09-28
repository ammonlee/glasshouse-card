import { makeHass } from '../helpers/hass';
import { people, matchPerson, colorOf } from '../../src/model/people';
import { weather } from '../../src/model/weather';
import { upNext, timeline, fmtTime } from '../../src/model/calendar';

describe('people', () => {
  const h = makeHass([
    { entity_id: 'person.beth', state: 'unknown', attributes: { friendly_name: 'Beth' } },
    { entity_id: 'person.ben', state: 'not_home', attributes: { friendly_name: 'Bennett' } },
    { entity_id: 'binary_sensor.blue', state: 'on' },
  ]);
  const p = people(h, [{ person: 'person.beth', color: 'blue', occupancy: 'binary_sensor.blue' }, { person: 'person.ben', initials: 'BN' }]);
  it('treats unknown as home and derives in-room', () => {
    expect(p[0]).toEqual({ name: 'Beth', initials: 'BE', color: '#A7C7E5', home: true, inRoom: true });
    expect(p[1]).toMatchObject({ name: 'Bennett', initials: 'BN', home: false, inRoom: false, color: '#C9CDD3' });
  });
  it('matches roster names by exact then prefix', () => {
    expect(matchPerson(p, 'ben')?.name).toBe('Bennett');
    expect(matchPerson(p, 'Beth')?.name).toBe('Beth');
    expect(matchPerson(p, 'Zed')).toBeUndefined();
  });
  it('passes hex colours through', () => { expect(colorOf('#123456')).toBe('#123456'); });
});

describe('weather', () => {
  it('maps condition and forecast', () => {
    const h = makeHass([{ entity_id: 'weather.home', state: 'partlycloudy', attributes: { temperature: 73.6 } }]);
    expect(weather(h, 'weather.home', [{ temperature: 80.2, templow: 55 }])).toEqual({ temp: 74, cond: 'Partly cloudy', icon: 'cloud-sun', hi: 80, lo: 55 });
    expect(weather(h, 'weather.none')).toBeNull();
  });
});

describe('calendar', () => {
  const now = new Date('2026-09-27T14:00:00');
  it('groups into Today / Tonight / Tomorrow and handles all-day', () => {
    const rows = upNext([
      { start: '2026-09-28T07:45:00', summary: 'School drop-off' },
      { start: '2026-09-27T19:30:00', summary: 'Movie night' },
      { start: '2026-09-27T15:00:00', summary: 'Soccer' },
      { start: '2026-09-28', summary: 'Trash day' },
    ], now);
    expect(rows).toEqual([
      { head: 'Today' }, { time: '3:00 PM', title: 'Soccer' },
      { head: 'Tonight' }, { time: '7:30 PM', title: 'Movie night' },
      { head: 'Tomorrow' }, { time: 'All day', title: 'Trash day' }, { time: '7:45 AM', title: 'School drop-off' },
    ]);
  });
  it('shows an empty state', () => {
    expect(upNext([], now)).toEqual([{ head: 'Today' }, { time: '', title: 'Nothing scheduled' }]);
  });
  it('builds the AI timeline newest first with icons', () => {
    const f = timeline([
      { start: '2026-09-27T13:10:00', summary: 'Vehicle pulled into driveway' },
      { start: '2026-09-27T13:40:00', summary: 'Person at front door' },
    ]);
    expect(f).toEqual([{ time: '1:40 PM', icon: 'person-standing', what: 'Person at front door' }, { time: '1:10 PM', icon: 'car', what: 'Vehicle pulled into driveway' }]);
  });
  it('formats times', () => { expect(fmtTime(new Date('2026-09-27T00:05:00'))).toBe('12:05 AM'); });
});
