import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the site's public/ folder; the Astro page at /tefillin-trials loads it via the manifest.
export default defineConfig({
  plugins: [react()],
  base: '/games/tefillin-trials/',
  build: {
    outDir: '../../public/games/tefillin-trials',
    emptyOutDir: true,
    manifest: true,
    chunkSizeWarningLimit: 4000,
  },
});
