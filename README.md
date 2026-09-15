# blockworked.com

Product site for [Blockwork](https://github.com/Blockworked/Blockwork), built with
[Astro](https://astro.build) as a fully static site, styled after Blockwork's
`blockstitch` block editor.

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # astro check && astro build → dist/
```

## Layout

- `src/styles/tokens.css` — blockstitch's design tokens, copied by hand from
  `blockstitch/src/theme/blockstitch.css` (that file can't be imported whole: it
  carries app-shell globals). Resync when the palette changes there.
- `src/styles/blocks.css` — static `bw-*` recreations of blockstitch's puzzle-piece
  rows, header/cap rows, C-blocks, reporters, and boolean hexagons.
- `src/components/Downloader.astro` — fetches the latest GitHub release in the
  browser and recommends a build for the visitor's OS/arch (`compact` or `full`).
- `src/pages/changelog.astro` — rendered **at build time** from Blockwork's
  `CHANGELOG.md` on `master`, so redeploy after a release to refresh it.
- `src/assets/screenshots/` — drop `editor.png`, `recording.png`, `settings.png`
  here; missing ones render as placeholders.

## Deploying

`dist/` is plain static files — any static host works (GitHub Pages, Cloudflare
Pages, Netlify). Trigger a rebuild on each Blockwork release to update the changelog.
