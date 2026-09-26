import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Three entry points: the 3D model, the e-ink dashboard studies, and the real
// panel. Without this the default build picks up index.html only and silently
// drops the others.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
        panel: resolve(import.meta.dirname, 'panel.html'),
      },
    },
  },
  server: {
    // api.porssisahko.net sends no CORS header, so the browser cannot fetch it
    // directly. In dev the server relays it; whatever hosts the panel for real
    // does the same (server/index.mjs). See src/adapters/porssisahko.js.
    // FMI is relayed too, so the panel only ever talks to its own origin.
    proxy: {
      '/api/fmi': {
        target: 'https://opendata.fmi.fi',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/fmi/, ''),
      },
      '/api/porssisahko': {
        target: 'https://api.porssisahko.net',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/porssisahko/, ''),
      },
    },
  },
});
