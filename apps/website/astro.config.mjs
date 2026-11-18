// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://blockworked.com',
  vite: {
    // Vite's default CSS minifier (Lightning CSS) collapses a
    // `-webkit-backdrop-filter` + `backdrop-filter` pair down to just the
    // prefixed one, which Chrome and Firefox ignore, so every glass blur
    // (header, panels) was lost in production. esbuild keeps both.
    build: { cssMinify: 'esbuild' },
  },
});
