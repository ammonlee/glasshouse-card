import { describe, it, expect } from 'vitest';
import { CelebrationGate } from '../src/model/celebrate';

describe('CelebrationGate', () => {
  it('fires when the last chore is checked off', () => {
    const g = new CelebrationGate();
    expect(g.check('d-Morning', 4, 2)).toBe(false);
    expect(g.check('d-Morning', 4, 3)).toBe(false);
    expect(g.check('d-Morning', 4, 4)).toBe(true);
  });
  it('does not fire on load when everything is already done', () => {
    const g = new CelebrationGate();
    expect(g.check('d-Morning', 4, 4)).toBe(false);
    expect(g.check('d-Morning', 4, 4)).toBe(false);
  });
  it('fires once per session, even if a chore is unchecked and rechecked', () => {
    const g = new CelebrationGate();
    g.check('d-Morning', 2, 1);
    expect(g.check('d-Morning', 2, 2)).toBe(true);
    g.check('d-Morning', 2, 1);
    expect(g.check('d-Morning', 2, 2)).toBe(false);
  });
  it('resets for a new session', () => {
    const g = new CelebrationGate();
    g.check('d-Morning', 2, 1); g.check('d-Morning', 2, 2);
    g.check('d-Evening', 2, 0);
    expect(g.check('d-Evening', 2, 2)).toBe(true);
  });
  it('ignores an empty list', () => {
    const g = new CelebrationGate();
    expect(g.check('d-Morning', 0, 0)).toBe(false);
  });
});
