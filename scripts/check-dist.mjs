import { readFileSync } from 'node:fs';
// Usage: node scripts/check-dist.mjs [file]  (default dist/glasshouse-card.js)
const file = process.argv[2] || 'dist/glasshouse-card.js';
const src = readFileSync(file, 'utf8');
// The card must be fully self-contained: no module imports, no network fetches, and no external URLs
// (the only URL allowed is the SVG namespace, which is an identifier, not a request).
const urls = [...src.matchAll(/https?:\/\/[^\s"'`)<>\\]*/g)].map((m) => m[0]).filter((u) => !u.startsWith('http://www.w3.org/'));
const bad = [
  [/^\s*import[\s{*]/m.test(src), 'import statement'],
  [/\bfetch\s*\(/.test(src), 'fetch('],
  [urls.length > 0, `external URL (${[...new Set(urls)].slice(0, 5).join(', ')})`],
];
const hits = bad.filter(([hit]) => hit).map(([, what]) => what);
if (hits.length) { console.error('dist check failed:', hits.join(', ')); process.exit(1); }
console.log(`dist ok (${(src.length / 1024).toFixed(0)} KB)`);
