import { html } from 'lit';

export interface Piece { x: number; delay: number; dur: number; drift: number; spin: number; w: number; h: number; color: string; round: boolean }

const COLORS = ['#98E6CA', '#ADB5E5', '#FFD27A', '#FF8FA3', '#8FD3FF', '#FFFFFF', '#C8A6FF'];
export const CONFETTI_MS = 5200;

/** Random pieces, made once per celebration so re-renders don't reshuffle them mid-fall. */
export function makeConfetti(n = 140, rnd = Math.random): Piece[] {
  return Array.from({ length: n }, () => {
    const round = rnd() < 0.25, w = 8 + rnd() * 8;
    return { x: rnd() * 100, delay: rnd() * 1400, dur: 2600 + rnd() * 1800, drift: (rnd() - 0.5) * 240, spin: (rnd() < 0.5 ? -1 : 1) * (360 + rnd() * 900),
      w, h: round ? w : w * (0.4 + rnd() * 0.5), color: COLORS[Math.floor(rnd() * COLORS.length)], round };
  });
}

export function confettiView(pieces: Piece[]) {
  return html`<div class="confetti" data-test="confetti">
    <div class="capsule confetti-banner">🎉 All chores done — great job!</div>
    <div style="display:contents">${pieces.map((p) => html`<i style="left:${p.x}%;width:${p.w}px;height:${p.h}px;background:${p.color};border-radius:${p.round ? '50%' : '2px'};animation-delay:${p.delay}ms;animation-duration:${p.dur}ms;--dx:${p.drift}px;--rot:${p.spin}deg"></i>`)}</div>
  </div>`;
}
