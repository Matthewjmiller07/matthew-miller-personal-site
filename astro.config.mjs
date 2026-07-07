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
    sitemap({
      filter: (page) => !page.includes('/aaron-33-film'),
    })
  ],
  vite: {
    build: {
      rollupOptions: {
        external: ['node-html-parser'],
      },
    },
    optimizeDeps: {
      include: ['three', 'react-is', 'recharts', 'leaflet'],
      exclude: ['@react-three/fiber']
    }
  }
});