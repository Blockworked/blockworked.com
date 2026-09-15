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
    // Vite's default CSS minifier (Lightning CSS) collapses a
    // `-webkit-backdrop-filter` + `backdrop-filter` pair down to just the
    // prefixed one, which Chrome and Firefox ignore, so every glass blur
    // (header, panels) was lost in production. esbuild keeps both.
    build: { cssMinify: 'esbuild' },
  },
});
