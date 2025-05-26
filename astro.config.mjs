// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify";

export default defineConfig({
  output: 'server', // Enable server-side rendering for API routes
  adapter: netlify(),
  integrations: [
    tailwind()
  ]
});