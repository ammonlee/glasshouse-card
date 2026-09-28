// Rollup's url plugin inlines the woff2 as a data: URL, so nothing is fetched from the network.
import geist from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2';

export function ensureFont() {
  if (document.head.querySelector('style[data-glasshouse-font]')) return;
  const s = document.createElement('style');
  s.dataset.glasshouseFont = '';
  s.textContent = `@font-face{font-family:"Geist";font-style:normal;font-weight:100 900;font-display:swap;src:url(${geist}) format("woff2");}`;
  document.head.appendChild(s);
}
