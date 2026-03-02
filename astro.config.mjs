// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  adapter: netlify({ mode: 'functions' }),
  site: 'https://matthewjamesmiller.com',
  integrations: [
    tailwind(),
    react(),
    sitemap()
  ],
  vite: {
    build: {
      rollupOptions: {
        external: ['node-html-parser'],
      },
    },
    optimizeDeps: {
      include: ['@react-three/drei', 'three', 'react-is', 'recharts'],
      exclude: ['@react-three/fiber']
    }
  }
});