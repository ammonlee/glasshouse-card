import './../src/glasshouse-card';
import { makeHass } from './helpers/hass';

async function fitTo(w: number, h: number) {
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card' });
  el.hass = makeHass([]); document.body.appendChild(el); await el.updateComplete;
  el.getBoundingClientRect = () => ({ width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0, toJSON() {} });
  el._fit(); await el.updateComplete;
  const f = el.shadowRoot!.querySelector('.frame') as HTMLElement;
  return { w: parseFloat(f.style.width), h: parseFloat(f.style.height), scale: el._scale };
}

describe('filling the screen', () => {
  it('a 16:9 screen (1366×768) widens the canvas instead of leaving side bands', async () => {
    const r = await fitTo(1366, 768);
    expect(r.scale).toBeCloseTo(0.96, 3);
    expect(r.h).toBe(800);
    expect(r.w * r.scale).toBeCloseTo(1366, 0);
  });
  it('the design size 1280×800 is unchanged', async () => {
    expect(await fitTo(1280, 800)).toEqual({ w: 1280, h: 800, scale: 1 });
  });
  it('a 4:3 screen grows the canvas taller instead of leaving top/bottom bands', async () => {
    const r = await fitTo(1024, 768);
    expect(r.w).toBe(1280);
    expect(r.h * r.scale).toBeCloseTo(768, 0);
  });
  it('extreme shapes stop stretching (at most 1.4× wider / 1.25× taller) and letterbox the rest', async () => {
    const wide = await fitTo(2560, 800);
    expect(wide.w).toBeCloseTo(1792, 0);
    const tall = await fitTo(800, 1600);
    expect(tall.h).toBeCloseTo(1000, 0);
  });
});
