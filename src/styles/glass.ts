import { css } from 'lit';
export const glass = css`
  :host { display: block; position: relative; width: 100%; height: 100%; min-height: 400px; overflow: hidden; background: #0B0F1E;
    font-family: var(--font-sans); color: var(--fg); -webkit-font-smoothing: antialiased; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
  * { box-sizing: border-box; }
  [data-a], [data-hold] { cursor: pointer; }
  [data-hold]:not([data-hold=""]) { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  svg.i { flex: none; display: inline-block; }
  .num { font-variant-numeric: tabular-nums; }
  .ellip { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .row { display: flex; align-items: center; }
  .col { display: flex; flex-direction: column; }
  .grow { flex: 1; min-width: 0; }
  .eyebrow { font-size: 10px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; color: var(--subtle); }
  .frame { position: absolute; left: 50%; top: 50%; width: 1280px; height: 800px; overflow: hidden; transform-origin: center center; }
  .wallpaper { position: absolute; inset: 0; transition: background .6s; }
  .wp-dusk { background: radial-gradient(circle at 16% 20%,rgba(70,85,187,.8),transparent 42%),radial-gradient(circle at 88% 12%,rgba(23,129,98,.55),transparent 38%),radial-gradient(circle at 72% 96%,rgba(255,150,90,.38),transparent 44%),radial-gradient(circle at 34% 88%,rgba(110,62,174,.5),transparent 40%),#0B0F1E; }
  .wp-aurora { background: radial-gradient(circle at 20% 15%,rgba(25,190,130,.55),transparent 42%),radial-gradient(circle at 80% 30%,rgba(35,93,157,.7),transparent 45%),radial-gradient(circle at 50% 100%,rgba(23,129,98,.45),transparent 45%),radial-gradient(circle at 5% 90%,rgba(70,85,187,.45),transparent 40%),#07121A; }
  .wp-ember { background: radial-gradient(circle at 15% 25%,rgba(237,64,64,.45),transparent 40%),radial-gradient(circle at 85% 15%,rgba(255,176,60,.45),transparent 40%),radial-gradient(circle at 60% 95%,rgba(110,62,174,.55),transparent 45%),radial-gradient(circle at 5% 95%,rgba(255,120,80,.3),transparent 35%),#140C10; }
  .noblur * { backdrop-filter: none !important; }
  .noblur .glass, .noblur .capsule { background: rgba(255,255,255,.12) !important; }
  .glass { border-radius: 32px; padding: 18px; background: linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.04)); border: 1px solid rgba(255,255,255,.14); box-shadow: inset 0 1px 0 rgba(255,255,255,.38), 0 14px 40px rgba(0,0,0,.28); backdrop-filter: blur(28px) saturate(170%); }
  .capsule { height: 56px; border-radius: 28px; display: flex; align-items: center; background: linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.05)); border: 1px solid rgba(255,255,255,.16); box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 10px 30px rgba(0,0,0,.25); backdrop-filter: blur(28px) saturate(170%); }
  .chip { height: 36px; padding: 0 14px; border-radius: 18px; display: flex; align-items: center; gap: 8px; font-size: 13px; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.18); box-shadow: inset 0 1px 0 rgba(255,255,255,.35); backdrop-filter: blur(20px) saturate(170%); }
  .live-dot { width: 8px; height: 8px; border-radius: 4px; background: var(--red); flex: none; }
  .btn { border-radius: 999px; display: flex; align-items: center; justify-content: center; gap: 8px; flex: none; background: rgba(255,255,255,.12); box-shadow: inset 0 1px 0 rgba(255,255,255,.3); font-weight: 600; transition: transform .08s, background .15s; }
  .btn:active, .tile:active { transform: scale(.96); }
  .circle { width: 48px; height: 48px; }
  .seg { display: grid; gap: 4px; padding: 4px; border-radius: 26px; background: rgba(0,0,0,.2); }
  .seg > div { height: 44px; border-radius: 22px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: var(--muted); transition: background .15s; }
  .seg > div.sel { font-weight: 600; color: #fff; background: rgba(255,255,255,.2); box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 4px 12px rgba(0,0,0,.2); }
  .switch { width: 48px; height: 30px; border-radius: 15px; padding: 3px; display: flex; flex: none; background: rgba(255,255,255,.18); box-shadow: inset 0 1px 2px rgba(0,0,0,.25); transition: background .15s; }
  .switch > span { width: 24px; height: 24px; border-radius: 12px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); transition: margin .15s; }
  .switch.on { background: #4655BB; } .switch.on > span { margin-left: 18px; } .switch.on.warm { background: #E0B43A; }
  .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.14); overflow: hidden; }
  .bar > span { display: block; height: 100%; border-radius: 3px; }
  .cam-bg { position: relative; overflow: hidden; background: repeating-linear-gradient(135deg,#15171F 0 14px,#12141B 14px 28px); }
  .cam-bg > img, .cam-bg > ha-camera-stream { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cam-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 0 12px; text-align: center; font: 11px var(--font-mono); color: #555A6A; }
  .tile { border-radius: 24px; padding: 14px; display: flex; background: var(--bg); border: 1px var(--bs) var(--bd); box-shadow: inset 0 1px 0 rgba(255,255,255,.28), 0 10px 30px rgba(0,0,0,.2); backdrop-filter: blur(28px) saturate(170%); transition: transform .08s; }
  .tile .ic { border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none; background: var(--icbg); color: var(--ic); }
  .tile .st { color: var(--st); }
  .chrome { position: absolute; inset: 0; padding: 24px; display: grid; grid-template-columns: 72px minmax(0,1fr); grid-template-rows: 72px minmax(0,1fr); gap: 16px; }
  .header { grid-column: 1 / 3; display: flex; align-items: center; gap: 16px; }
  .clock { font-size: 64px; font-weight: 200; letter-spacing: -.04em; line-height: 1; }
  .alert-cap { padding: 0 18px 0 10px; gap: 10px; }
  .alert-cap .dot { width: 36px; height: 36px; border-radius: 18px; display: flex; align-items: center; justify-content: center; }
  .alert-cap.red { background: linear-gradient(160deg,rgba(237,64,64,.42),rgba(237,64,64,.18)); border-color: rgba(244,133,133,.45); box-shadow: inset 0 1px 0 rgba(255,200,200,.45),0 10px 30px rgba(0,0,0,.25); }
  .alert-cap.red .dot { background: rgba(255,255,255,.18); }
  .alert-cap.amber { background: linear-gradient(160deg,rgba(255,214,96,.34),rgba(255,214,96,.12)); border-color: rgba(255,214,96,.45); box-shadow: inset 0 1px 0 rgba(255,240,200,.45),0 10px 30px rgba(0,0,0,.25); }
  .alert-cap.amber .dot { background: rgba(255,214,96,.3); color: var(--yellow-soft); }
  .alert-cap.green { background: linear-gradient(160deg,rgba(25,190,130,.34),rgba(25,190,130,.12)); border-color: rgba(98,215,172,.45); box-shadow: inset 0 1px 0 rgba(210,245,232,.4),0 10px 30px rgba(0,0,0,.25); }
  .alert-cap.green .dot { background: rgba(98,215,172,.3); color: var(--green-3); }
  .avatar { position: relative; width: 42px; height: 42px; border-radius: 21px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; }
  .initials { width: 40px; height: 40px; flex: none; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; background: rgba(255,255,255,.12); }
  .rail { width: 72px; height: auto; padding: 8px 0; border-radius: 36px; flex-direction: column; gap: 4px; }
  .rail .nav { width: 60px; height: 60px; border-radius: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: rgba(255,255,255,.7); transition: background .15s; }
  .rail .nav span { font-size: 10px; font-weight: 500; }
  .rail .nav.sel { background: rgba(255,255,255,.24); box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 4px 14px rgba(0,0,0,.25); color: #fff; }
  .view { min-width: 0; min-height: 0; }
  .card-title { font-size: 20px; font-weight: 600; letter-spacing: -.01em; }
  .check { flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.12); color: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); transition: background .2s; }
  .check.done { background: var(--green); color: #07121A; box-shadow: 0 4px 14px rgba(25,190,130,.45), inset 0 1px 0 rgba(255,255,255,.4); }
  .chore-row { border-radius: 22px; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,.07); transition: background .2s; }
  .chore-row.done { background: rgba(98,215,172,.14); }
  .chore-row.blocked { opacity: .5; }
  .chore-num { width: 18px; height: 18px; flex: none; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; line-height: 1; background: rgba(255,255,255,.16); color: rgba(255,255,255,.85); }
  .scrim { position: absolute; inset: 0; background: rgba(5,6,12,.45); backdrop-filter: blur(20px) saturate(140%); display: flex; align-items: center; justify-content: center; animation: fade .18s ease-out; z-index: 3; }
  .sheet { border-radius: 36px; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,.07)); border: 1px solid rgba(255,255,255,.2); box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 30px 80px rgba(0,0,0,.5); backdrop-filter: blur(40px) saturate(180%); animation: pop .2s ease-out; }
  .big-btn { height: 88px; border-radius: 28px; padding: 0 16px; display: flex; align-items: center; gap: 12px; position: relative; overflow: hidden; }
  .hold-fill { position: absolute; left: 0; bottom: 0; height: 4px; width: 0; background: rgba(255,255,255,.7); }
  .holding .hold-fill { width: 100%; transition: width 1s linear; }
  .night { position: absolute; inset: 0; background: #030305; display: flex; flex-direction: column; align-items: center; padding: 28px 32px; animation: fade .4s; z-index: 4; }
  .toast { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); padding: 0 22px; gap: 10px; font-size: 14px; font-weight: 500; white-space: nowrap; animation: toast .2s ease-out; z-index: 6; }
  .scrim.doorbell { z-index: 5; }   /* above the night screen (z 4): a ring during night mode must be visible */
  .missing { font: 11px var(--font-mono); color: #FFE6C2; }
  .offline-chip { height: 36px; padding: 0 14px; border-radius: 18px; display: flex; align-items: center; gap: 8px; font-size: 13px; background: rgba(255,176,60,.2); color: #FFE6C2; }
  .disconnected .view, .disconnected .rail { pointer-events: none; opacity: .6; }
  @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes pop { from { opacity: 0; transform: translateY(8px) scale(.98) } to { opacity: 1; transform: none } }
  .confetti { position: absolute; inset: 0; z-index: 60; pointer-events: none; overflow: hidden; }
  .confetti i { position: absolute; top: -24px; display: block; opacity: 0; animation-name: confetti-fall; animation-timing-function: cubic-bezier(.3,.1,.7,1); animation-fill-mode: forwards; }
  .confetti-banner { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); padding: 22px 36px; font-size: 30px; font-weight: 600; letter-spacing: -.01em;
    color: #fff; animation: confetti-banner 5.2s ease forwards; }
  @keyframes confetti-fall { 0% { opacity: 1; transform: translate(0, 0) rotate(0) } 85% { opacity: 1 } 100% { opacity: 0; transform: translate(var(--dx), 860px) rotate(var(--rot)) } }
  @keyframes confetti-banner { 0% { opacity: 0; transform: translate(-50%, -50%) scale(.8) } 10% { opacity: 1; transform: translate(-50%, -50%) scale(1.04) } 16% { transform: translate(-50%, -50%) scale(1) } 80% { opacity: 1 } 100% { opacity: 0 } }
  @keyframes toast { from { opacity: 0; transform: translate(-50%, 8px) } to { opacity: 1; transform: translate(-50%, 0) } }
`;
