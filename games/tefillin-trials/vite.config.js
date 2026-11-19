import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the site's public/ folder; the Astro page at /tefillin-trials loads it via the manifest.
export default defineConfig({
  plugins: [react()],
  base: '/games/tefillin-trials/',
  build: {
    outDir: '../../public/games/tefillin-trials',
    // Never clear the folder: deleting last build's hashed files trips the stale-tree guard
    // (.github/workflows/stale-tree-guard.yml). Old bundles stay; only the manifest's are loaded.
    emptyOutDir: false,
    manifest: true,
    chunkSizeWarningLimit: 4000,
    // Two games from one source tree: the full R3F game and Hineni Lite (plain three.js, WebXR).
    rollupOptions: { input: { main: 'index.html', lite: 'lite.html', knots: 'knots.html' } },
  },
});
