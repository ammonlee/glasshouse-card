import { render } from 'lit';
import { choreList } from '../../src/views/home';
import type { ChoreRow } from '../../src/model/chores';

const row = (o: Partial<ChoreRow>): ChoreRow => ({ key: 'k', initials: 'XX', who: 'X', what: 'Chore', icon: 'check', color: '#fff', done: false, ...o });
const rows = [
  row({ key: 'unload', who: 'Dante', what: 'Unload dishes', num: 1, summary: 'Dante · Unload dishes · Evening' }),
  row({ key: 'load', who: 'Beth', what: 'Load dishes', num: 2, after: 'Dante', summary: 'Beth · Load dishes · Evening' }),
  row({ key: 'laundry', who: 'June', what: 'Laundry', done: true, summary: 'June · Laundry' }),
];

function mount() {
  const calls: unknown[][] = [];
  const card = { toggleChore: (...a: unknown[]) => { calls.push(a); } } as any;
  const div = document.createElement('div');
  render(choreList({ chores: rows } as any, card, 66, ''), div);
  return { div, calls, rs: [...div.querySelectorAll('.chore-row')] as HTMLElement[] };
}

describe('chore list ordering', () => {
  it('shows the chart number badge on numbered chores only', () => {
    const { rs } = mount();
    expect(rs[0].querySelector('.chore-num')?.textContent?.trim()).toBe('1');
    expect(rs[1].querySelector('.chore-num')?.textContent?.trim()).toBe('2');
    expect(rs[2].querySelector('.chore-num')).toBeNull();
  });
  it('dims a blocked row and shows who it is waiting for instead of the label', () => {
    const { rs } = mount();
    expect(rs[0].classList.contains('blocked')).toBe(false);
    expect(rs[1].classList.contains('blocked')).toBe(true);
    expect(rs[1].textContent).toContain('After Dante');
    expect(rs[1].textContent).not.toContain('Load dishes');
    expect(rs[0].textContent).toContain('Unload dishes');
  });
  it('a blocked row stays tappable', () => {
    const { rs, calls } = mount();
    rs[1].click();
    expect(calls).toEqual([[undefined, 'Beth · Load dishes · Evening', false]]);
  });
});
