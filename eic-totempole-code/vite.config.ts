import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Two Vitest projects run under one `vitest` command (research.md R6):
 *
 *  - `unit`   jsdom. Hooks, context, registry. Fast inner loop.
 *  - `layout` real Chromium at the 1920x1280 design viewport. The no-overflow and
 *             touch-target assertions are meaningless in jsdom, which has no layout
 *             engine — every rect there is zero, so those tests would pass vacuously.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    // Static output only — no SSR, no server runtime (Constitution VIII).
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.browser.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'layout',
          globals: true,
          include: ['src/**/*.browser.test.{ts,tsx}'],
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            viewport: { width: 1920, height: 1280 },
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
