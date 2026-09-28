import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import url from '@rollup/plugin-url';
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';

const demo = !!process.env.DEMO;
export default [
  {
    input: 'src/glasshouse-card.ts',
    output: { file: 'dist/glasshouse-card.js', format: 'es', inlineDynamicImports: true },
    plugins: [
      resolve(),
      url({ include: ['**/*.woff2'], limit: Infinity }),   // inline fonts as base64
      typescript({ noEmit: false, outDir: 'dist', declaration: false }),
      !demo && terser({ format: { comments: false } }),
    ],
  },
  demo && {
    input: 'demo/fake-hass.ts',
    output: { file: 'demo/build/fake-hass.js', format: 'es' },
    plugins: [
      resolve(),
      url({ include: ['**/*.woff2'], limit: Infinity }),   // inline fonts as base64 (glasshouse-card imports the font)
      json(),
      typescript({ noEmit: false, outDir: 'demo/build', declaration: false }),
      // rollup-plugin-serve keeps the process alive; only run it under `rollup -w` (npm run dev) so a
      // one-shot `rollup -c --environment DEMO` build still exits.
      process.env.ROLLUP_WATCH && serve({ contentBase: ['.'], port: 5173, open: false }),
    ].filter(Boolean),
  },
].filter(Boolean);
