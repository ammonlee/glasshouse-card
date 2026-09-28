import { makeHass } from '../helpers/hass';
import { rosterChores, planSync, choreRows, dayString, isSeeded, SHORT } from '../../src/model/chores';
import type { PersonVm } from '../../src/model/people';

const roster = makeHass([{ entity_id: 'sensor.roster', state: 'Sunday', attributes: {
  assignments: { unload: 'Dante', load: 'Beth', garbage: 'June', counters: 'Ben', laundry: '' },
  morning_keys: ['unload', 'load', 'garbage', 'laundry'], evening_keys: ['unload', 'load', 'garbage', 'counters'],
} }]);
const ppl: PersonVm[] = [
  { name: 'Beth', initials: 'BE', color: '#A7C7E5', home: true, inRoom: false },
  { name: 'Bennett', initials: 'BN', color: '#C9CDD3', home: true, inRoom: false },
  { name: 'June', initials: 'JU', color: '#FFD660', home: true, inRoom: false },
];

describe('rosterChores', () => {
  it('uses evening keys after noon and skips blanks', () => {
    const s = rosterChores(roster, 'sensor.roster', new Date('2026-09-27T18:00:00'))!;
    expect(s.map((c) => c.summary)).toEqual(['Dante · Unload dishes', 'Beth · Load dishes', 'June · Garbage out', 'Ben · Counters & appliances']);
  });
  it('uses morning keys before noon', () => {
    expect(rosterChores(roster, 'sensor.roster', new Date('2026-09-27T08:00:00'))!.map((c) => c.key)).toEqual(['unload', 'load', 'garbage']);
  });
  it('returns null without a roster', () => { expect(rosterChores(roster, undefined, new Date())).toBeNull(); });
});

describe('chart labels', () => {
  it('uses the paper chart wording', () => {
    expect(SHORT).toEqual({ unload: 'Unload dishes', load: 'Load dishes', garbage: 'Garbage out', counters: 'Counters & appliances', laundry: 'Laundry' });
  });
  it('still recognizes the v0.1.0 labels as seeded', () => {
    for (const l of ['Take out trash', 'Clean appliances & countertops', 'Garbage out', 'Counters & appliances', 'Unload dishes']) expect(isSeeded(`June · ${l}`)).toBe(true);
    expect(isSeeded('June · Feed the cat')).toBe(false);
  });
});

describe('planSync', () => {
  const specs = rosterChores(roster, 'sensor.roster', new Date('2026-09-27T18:00:00'))!;
  const done = { uid: '1', summary: 'Dante · Unload dishes', status: 'completed' as const, due: '2026-09-27' };
  it('adds only today\'s missing summaries', () => {
    expect(planSync(specs, [done], '2026-09-27')).toEqual({ remove: [], add: ['Beth · Load dishes', 'June · Garbage out', 'Ben · Counters & appliances'] });
  });
  it('removes yesterday\'s items and re-seeds today (Review Focus 3)', () => {
    expect(planSync(specs, [done], '2026-09-28')).toEqual({ remove: ['1'], add: specs.map((s) => s.summary) });
  });
  it('a second device later the same day changes nothing (Review Focus 3)', () => {
    const all = specs.map((c, i) => ({ uid: String(i), summary: c.summary, status: 'completed' as const, due: '2026-09-27' }));
    expect(planSync(specs, all, '2026-09-27')).toEqual({ remove: [], add: [] });
  });
  it('without a roster, never removes anything (spec §6: items are used as-is)', () => {
    const overdue = { uid: '3', summary: 'Renew passport', status: 'needs_action' as const, due: '2026-09-01' };
    expect(planSync(null, [done, overdue, { uid: '2', summary: 'Water plants', status: 'completed' }], '2026-09-28')).toEqual({ remove: [], add: [] });
  });
  it('with a roster, removes only overdue items in the seeded "<Name> · <label>" format', () => {
    const items = [
      done,                                                                                   // seeded, yesterday -> remove
      { uid: '3', summary: 'Renew passport', status: 'needs_action' as const, due: '2026-09-01' },   // user's own overdue item -> keep
      { uid: '4', summary: 'June · Feed the cat', status: 'needs_action' as const, due: '2026-09-20' }, // not a roster label -> keep
      { uid: '5', summary: 'Beth · Laundry', status: 'completed' as const, due: '2026-09-26' },         // seeded label -> remove
    ];
    expect(planSync(specs, items, '2026-09-28').remove).toEqual(['1', '5']);
  });
  it('removes same-day duplicates of a seeded chore, keeping one (completed first, then lowest uid)', () => {
    const d = (uid: string, summary: string, status: 'completed' | 'needs_action' = 'needs_action') => ({ uid, summary, status, due: '2026-09-27' });
    const items = [d('b', 'Beth · Load dishes'), d('a', 'Beth · Load dishes'), d('z', 'Dante · Unload dishes'), d('y', 'Dante · Unload dishes', 'completed'), d('c', 'June · Garbage out')];
    expect(planSync(specs, items, '2026-09-27')).toEqual({ remove: ['b', 'z'], add: ['Ben · Counters & appliances'] });
  });
});

describe('choreRows', () => {
  const specs = rosterChores(roster, 'sensor.roster', new Date('2026-09-27T18:00:00'))!;
  it('joins specs to items and people (prefix match, unknown person) (Review Focus 2)', () => {
    const rows = choreRows(specs, [{ uid: '1', summary: 'Dante · Unload dishes', status: 'completed', due: '2026-09-27' }, { uid: '0', summary: 'Beth · Load dishes', status: 'completed', due: '2026-09-26' }], ppl, '2026-09-27');
    expect(rows[0]).toMatchObject({ who: 'Dante', initials: 'DA', color: '#C9CDD3', done: true, uid: '1', icon: 'utensils' });
    expect(rows[1]).toMatchObject({ who: 'Beth', done: false, uid: undefined });
    expect(rows[3]).toMatchObject({ who: 'Bennett', initials: 'BN', done: false, uid: undefined });
  });
  it('falls back to raw to-do items without a roster', () => {
    const rows = choreRows(null, [{ uid: 'a', summary: 'June · Feed the cat', status: 'needs_action' }, { uid: 'b', summary: 'Water plants', status: 'completed' }, { uid: 'c', summary: 'Old', status: 'completed', due: '2026-09-20' }], ppl, '2026-09-27');
    expect(rows).toEqual([
      { key: 'a', initials: 'JU', who: 'June', what: 'Feed the cat', icon: 'check', color: '#FFD660', done: false, uid: 'a' },
      { key: 'b', initials: '·', who: 'Anyone', what: 'Water plants', icon: 'check', color: '#C9CDD3', done: true, uid: 'b' },
    ]);
  });
  it('formats local day strings', () => { expect(dayString(new Date('2026-09-27T23:59:00'))).toBe('2026-09-27'); });
});
