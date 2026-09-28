import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'happy-dom', globals: true, include: ['test/**/*.test.ts'] },
  plugins: [{ name: 'woff2-stub', transform(_c, id) { return id.endsWith('.woff2') ? 'export default "data:font/woff2;base64,AA=="' : null; } }],
});
