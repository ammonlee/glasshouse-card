import { render } from 'lit';
import { laundryCard } from '../../src/views/home';

const vm = (note: string | null) => ({ washer: 'idle', washerMin: null, dryer: 'idle', dryerMin: null, dryerPct: 0, loads: null, turn: null, note, doneSince: null });
const text = (note: string | null, full: boolean) => {
  const div = document.createElement('div');
  render(laundryCard({ laundry: vm(note) } as any, {} as any, full), div);
  return div.textContent!.replace(/\s+/g, ' ');
};

describe('laundry card chip', () => {
  it('says "Catch-up day" on a catch-up day in the compact card', () => {
    expect(text('Laundry is a catch-up day. Daniel and Julia only.', false)).toContain('Catch-up day');
    expect(text('CATCH UP', false)).toContain('Catch-up day');
  });
  it('says "Rest day" otherwise', () => {
    expect(text('The machines rest today.', false)).toContain('Rest day');
    expect(text(null, false)).toContain('Rest day');
    expect(text('The machines rest today.', false)).not.toContain('Catch-up day');
  });
  it('the full card keeps the whole note', () => {
    expect(text('Laundry is a catch-up day. Daniel and Julia only.', true)).toContain('Laundry is a catch-up day. Daniel and Julia only.');
    expect(text(null, true)).toContain('Machines rest today');
  });
});
