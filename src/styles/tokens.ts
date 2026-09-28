import { css } from 'lit';
export const tokens = css`
  :host {
    --fg: #F2F2F2; --muted: rgba(255,255,255,.72); --subtle: rgba(255,255,255,.62);
    --yellow: #FFD660; --yellow-soft: #FFE69C; --green: #19BE82; --green-2: #62D7AC; --green-3: #98E6CA; --green-4: #BFF0DD;
    --red: #ED4040; --red-2: #F48585; --red-3: #F8B2B2; --red-4: #FFD6D6; --peri: #ADB5E5; --peri-2: #CBD0EF; --peri-3: #DCE0F5;
    --amber: #FFE6C2; --blue: #A7C7E5;
    --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .t-on    { --bg: linear-gradient(160deg,rgba(111,125,220,.42),rgba(70,85,187,.14)); --bd: rgba(173,181,229,.45); --bs: solid; --ic: #CBD0EF; --icbg: rgba(173,181,229,.28); --st: #DCE0F5; }
  .t-light { --bg: linear-gradient(160deg,rgba(255,214,96,.30),rgba(255,214,96,.08)); --bd: rgba(255,214,96,.42); --bs: solid; --ic: #FFD660; --icbg: rgba(255,214,96,.26); --st: #FFE69C; }
  .t-ok    { --bg: linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.04)); --bd: rgba(255,255,255,.14); --bs: solid; --ic: #98E6CA; --icbg: rgba(98,215,172,.24); --st: #BFF0DD; }
  .t-off   { --bg: linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.03)); --bd: rgba(255,255,255,.12); --bs: solid; --ic: rgba(255,255,255,.72); --icbg: rgba(255,255,255,.1); --st: rgba(255,255,255,.62); }
  .t-alert { --bg: linear-gradient(160deg,rgba(237,64,64,.42),rgba(237,64,64,.14)); --bd: rgba(244,133,133,.5); --bs: solid; --ic: #FFD6D6; --icbg: rgba(237,64,64,.4); --st: #FFD6D6; }
  .t-nudge { --bg: linear-gradient(160deg,rgba(255,176,60,.34),rgba(255,176,60,.1)); --bd: rgba(255,200,120,.45); --bs: solid; --ic: #FFE0B0; --icbg: rgba(255,176,60,.3); --st: #FFE6C2; }
  .t-na    { --bg: transparent; --bd: rgba(255,255,255,.24); --bs: dashed; --ic: rgba(255,255,255,.4); --icbg: rgba(255,255,255,.05); --st: rgba(255,255,255,.45); }
  .t-cold  { --bg: linear-gradient(160deg,rgba(35,93,157,.45),rgba(35,93,157,.15)); --bd: rgba(167,199,229,.42); --bs: solid; --ic: #D5E5F4; }
  .t-good  { --bg: linear-gradient(160deg,rgba(25,190,130,.3),rgba(25,190,130,.08)); --bd: rgba(98,215,172,.38); --bs: solid; --ic: #BFF0DD; }
  .t-warm  { --bg: linear-gradient(160deg,rgba(237,64,64,.34),rgba(237,64,64,.1)); --bd: rgba(244,133,133,.42); --bs: solid; --ic: #FFD6D6; }
`;
