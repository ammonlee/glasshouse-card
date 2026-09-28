import type { GlasshouseCard } from './glasshouse-card';

const holdTarget = (e: Event) => e.composedPath().find((n) => n instanceof HTMLElement && n.dataset?.hold) as HTMLElement | undefined;

const wired = new WeakSet<ShadowRoot>();
export function attachHold(root: ShadowRoot, card: GlasshouseCard) {
  if (wired.has(root)) return;
  wired.add(root);
  let timer: number | undefined, el: HTMLElement | null = null;
  // After a completed hold: the element, and when the finger lifted (0 = still down).
  let justHeld: HTMLElement | null = null, releasedAt = 0;
  const cancel = () => { window.clearTimeout(timer); timer = undefined; el?.classList.remove('holding'); el = null; };
  root.addEventListener('pointerdown', (e) => {
    const t = holdTarget(e);
    const id = t?.dataset.hold;
    if (!t || !id) return;
    cancel();
    justHeld = null;
    el = t; el.classList.add('holding');
    timer = window.setTimeout(() => {
      const target = id, held = el;
      cancel();
      justHeld = held; releasedAt = 0;
      card.holdAction(target);
    }, 1000);
  });
  // The swallow window starts when the finger lifts, not when the hold completes, so a long press
  // (finger held well past 1 s) still has its trailing click swallowed.
  root.addEventListener('pointerup', () => { if (justHeld && !releasedAt) releasedAt = Date.now(); }, true);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) root.addEventListener(ev, cancel, true);
  // A completed hold triggers `card.holdAction` immediately, which re-renders before the browser's
  // synthesized click for the same press arrives. That click would then be handled by the new
  // (post-action) @click closure and double-fire the action. Swallow that one click.
  root.addEventListener('click', (e) => {
    if (!justHeld) return;
    const stillFresh = !releasedAt || Date.now() - releasedAt < 800;
    const target = justHeld;
    justHeld = null;
    if (stillFresh && e.composedPath().includes(target)) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  // Long-press on touch screens opens a context menu / selection callout; not on hold targets.
  root.addEventListener('contextmenu', (e) => { if (holdTarget(e)) e.preventDefault(); });
}
