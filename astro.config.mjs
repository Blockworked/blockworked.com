// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  site: 'https://blockworked.com',
  integrations: [vue()],
  vite: {
    // blockstitch ships raw .ts/.vue source (no build step). Keep the dev
    // server from pre-bundling it, which would split its module-level
    // registries (configureCanvas, shapes, fields) across two copies.
    optimizeDeps: { exclude: ['blockstitch'] },
  },
});
