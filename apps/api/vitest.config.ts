import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// NestJS relies on emitted decorator metadata for DI, which esbuild (vitest's default
// transformer) does not produce — so we transform with SWC per apps/api/.swcrc.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
  plugins: [swc.vite()],
});
