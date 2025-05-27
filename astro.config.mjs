// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";

export default defineConfig({
  prefetch: true, // Enable built-in prefetching
  output: 'server', // Enable server-side rendering for API routes
  adapter: netlify(),
  integrations: [
    tailwind(),
    react()
  ],
  vite: {
    optimizeDeps: {
      include: ['swiper']
    }
  }
});