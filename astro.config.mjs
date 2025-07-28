// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://matthewjamesmiller.com',
  integrations: [
    tailwind(),
    react(),
    sitemap()
  ],
  vite: {
    optimizeDeps: {
      include: ['@react-three/drei', 'three'],
      exclude: ['@react-three/fiber']
    }
  }
});