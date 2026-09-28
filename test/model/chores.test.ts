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
    expect(s.map((c) => c.summary)).toEqual(['Dante · Unload dishes · Evening', 'Beth · Load dishes · Evening', 'June · Garbage out · Evening', 'Ben · Counters & appliances']);
  });
  it('suffixes twice-a-day chores with the morning session before noon', () => {
    expect(rosterChores(roster, 'sensor.roster', new Date('2026-09-27T11:59:00'))!.map((c) => c.summary))
      .toEqual(['Dante · Unload dishes · Morning', 'Beth · Load dishes · Morning', 'June · Garbage out · Morning']);
  });
  it('switches to the evening session at 12:00', () => {
    expect(rosterChores(roster, 'sensor.roster', new Date('2026-09-27T12:00:00'))![0].summary).toBe('Dante · Unload dishes · Evening');
  });
  it('does not suffix a chore that is only in one session', () => {
    const h = makeHass([{ entity_id: 'sensor.r', state: 'x', attributes: { assignments: { unload: 'Dante', counters: 'Ben' }, morning_keys: ['unload'], evening_keys: ['counters'] } }]);
    expect(rosterChores(h, 'sensor.r', new Date('2026-09-27T08:00:00'))!.map((c) => c.summary)).toEqual(['Dante · Unload dishes']);
    expect(rosterChores(h, 'sensor.r', new Date('2026-09-27T18:00:00'))!.map((c) => c.summary)).toEqual(['Ben · Counters & appliances']);
  });
  it('uses morning keys before noon', () => {
    expect(rosterChores(roster, 'sensor.roster', new Date('2026-09-27T08:00:00'))!.map((c) => c.key)).toEqual(['unload', 'load', 'garbage']);
  });
  it('keeps laundry all day, one unsuffixed item listed last', () => {
    const h = makeHass([{ entity_id: 'sensor.r', state: 'Monday', attributes: {
      assignments: { unload: 'Dante', load: 'Beth', garbage: 'June', counters: 'Ben', laundry: 'June' },
      morning_keys: ['unload', 'laundry', 'load', 'garbage'], evening_keys: ['unload', 'load', 'garbage', 'counters'] } }]);
    const am = rosterChores(h, 'sensor.r', new Date('2026-09-28T08:00:00'))!, pm = rosterChores(h, 'sensor.r', new Date('2026-09-28T19:00:00'))!;
    expect(am.map((c) => c.key)).toEqual(['unload', 'load', 'garbage', 'laundry']);
    expect(pm.map((c) => c.key)).toEqual(['unload', 'load', 'garbage', 'counters', 'laundry']);
    expect(am.at(-1)!.summary).toBe('June · Laundry');
    expect(pm.at(-1)!.summary).toBe('June · Laundry');
  });
  it('has no laundry row on catch-up / rest days', () => {
    expect(rosterChores(roster, 'sensor.roster', new Date('2026-09-27T08:00:00'))!.some((c) => c.key === 'laundry')).toBe(false);
    expect(rosterChores(roster, 'sensor.roster', new Date('2026-09-27T18:00:00'))!.some((c) => c.key === 'laundry')).toBe(false);
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
  it('recognizes session-suffixed summaries as seeded, but not arbitrary suffixed items', () => {
    expect(isSeeded('June · Garbage out · Morning')).toBe(true);
    expect(isSeeded('June · Unload dishes · Evening')).toBe(true);
    expect(isSeeded('June · Feed the cat · Morning')).toBe(false);
    expect(isSeeded('June · Morning')).toBe(false);
  });
});

describe('planSync', () => {
  const specs = rosterChores(roster, 'sensor.roster', new Date('2026-09-27T18:00:00'))!;
  const done = { uid: '1', summary: 'Dante · Unload dishes · Evening', status: 'completed' as const, due: '2026-09-27' };
  it('adds only today\'s missing summaries', () => {
    expect(planSync(specs, [done], '2026-09-27')).toEqual({ remove: [], add: ['Beth · Load dishes · Evening', 'June · Garbage out · Evening', 'Ben · Counters & appliances'] });
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
      { uid: '6', summary: 'June · Take out trash', status: 'completed' as const, due: '2026-09-26' },  // v0.1.0 label -> remove
      { uid: '7', summary: 'June · Garbage out · Morning', status: 'completed' as const, due: '2026-09-27' }, // suffixed -> remove
    ];
    expect(planSync(specs, items, '2026-09-28').remove).toEqual(['1', '5', '6', '7']);
  });
  it('removes same-day duplicates of a seeded chore, keeping one (completed first, then lowest uid)', () => {
    const d = (uid: string, summary: string, status: 'completed' | 'needs_action' = 'needs_action') => ({ uid, summary, status, due: '2026-09-27' });
    const items = [d('b', 'Beth · Load dishes · Evening'), d('a', 'Beth · Load dishes · Evening'), d('z', 'Dante · Unload dishes · Evening'), d('y', 'Dante · Unload dishes · Evening', 'completed'), d('c', 'June · Garbage out · Evening')];
    expect(planSync(specs, items, '2026-09-27')).toEqual({ remove: ['b', 'z'], add: ['Ben · Counters & appliances'] });
  });
  it('replaces today\'s v0.1.0 items with the session items instead of duplicating them', () => {
    const d = (uid: string, summary: string) => ({ uid, summary, status: 'completed' as const, due: '2026-09-27' });
    const items = [d('l1', 'Dante · Unload dishes'), d('l2', 'June · Take out trash'), d('l3', 'Ben · Clean appliances & countertops'), d('n', 'Beth · Load dishes · Evening')];
    expect(planSync(specs, items, '2026-09-27')).toEqual({ remove: ['l1', 'l2', 'l3'], add: ['Dante · Unload dishes · Evening', 'June · Garbage out · Evening', 'Ben · Counters & appliances'] });
  });
  it('keeps the morning items when the evening session starts', () => {
    const morning = rosterChores(roster, 'sensor.roster', new Date('2026-09-27T08:00:00'))!;
    const items = morning.map((c, i) => ({ uid: `m${i}`, summary: c.summary, status: 'completed' as const, due: '2026-09-27' }));
    expect(planSync(specs, items, '2026-09-27')).toEqual({ remove: [], add: specs.map((s) => s.summary) });
  });
});

describe('choreRows', () => {
  const specs = rosterChores(roster, 'sensor.roster', new Date('2026-09-27T18:00:00'))!;
  it('joins specs to items and people (prefix match, unknown person) (Review Focus 2)', () => {
    const rows = choreRows(specs, [{ uid: '1', summary: 'Dante · Unload dishes · Evening', status: 'completed', due: '2026-09-27' }, { uid: '0', summary: 'Beth · Load dishes · Evening', status: 'completed', due: '2026-09-26' }], ppl, '2026-09-27');
    expect(rows[0]).toMatchObject({ who: 'Dante', initials: 'DA', color: '#C9CDD3', done: true, uid: '1', icon: 'utensils' });
    expect(rows[1]).toMatchObject({ who: 'Beth', done: false, uid: undefined });
    expect(rows[3]).toMatchObject({ who: 'Bennett', initials: 'BN', done: false, uid: undefined });
  });
  it('a completed morning item does not show the evening item as done', () => {
    const rows = choreRows(specs, [{ uid: 'm', summary: 'Dante · Unload dishes · Morning', status: 'completed', due: '2026-09-27' }], ppl, '2026-09-27');
    expect(rows[0]).toMatchObject({ key: 'unload', what: 'Unload dishes', done: false, uid: undefined, summary: 'Dante · Unload dishes · Evening' });
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
