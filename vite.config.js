import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Two entry points: the 3D model and the e-ink dashboard studies. Without this
// the default build picks up index.html only and silently drops dashboard.html.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
      },
    },
  },
});
