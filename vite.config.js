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
  server: {
    // api.porssisahko.net sends no CORS header, so the browser cannot fetch it
    // directly. In dev the server relays it; whatever hosts the panel for real
    // does the same. See src/adapters/porssisahko.js.
    proxy: {
      '/api/porssisahko': {
        target: 'https://api.porssisahko.net',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/porssisahko/, ''),
      },
    },
  },
});
