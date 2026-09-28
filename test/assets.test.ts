import { render } from 'lit';
import { icon } from '../src/icons';
import { ensureFont } from '../src/fonts';

describe('icons', () => {
  it('renders known icons as inline svg', () => {
    const el = document.createElement('div');
    render(icon('house', 22), el);
    expect(el.querySelector('svg')?.getAttribute('width')).toBe('22');
    expect(el.innerHTML).toContain('<path');
  });
  it('falls back for unknown icons', () => {
    const el = document.createElement('div');
    render(icon('not-an-icon'), el);
    expect(el.querySelector('svg')).not.toBeNull();
  });
  it('updates the svg content when re-rendered with a different name', () => {
    const el = document.createElement('div');
    render(icon('house'), el);
    const first = el.querySelector('svg')?.innerHTML;
    render(icon('circle'), el);
    const second = el.querySelector('svg')?.innerHTML;
    expect(second).not.toBe(first);
    expect(second).toContain('<circle');
  });
});

describe('font', () => {
  it('injects one @font-face with an inline data URL', () => {
    ensureFont(); ensureFont();
    const tags = document.head.querySelectorAll('style[data-glasshouse-font]');
    expect(tags.length).toBe(1);
    expect(tags[0].textContent).toMatch(/font-family:\s*"Geist"/);
  });
});
