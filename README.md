# blockworked.com

Product site for [Blockwork](https://github.com/Blockworked/Blockwork), built with
[Astro](https://astro.build) and deployed to GitHub Pages. It uses
[blockstitch](https://github.com/Blockworked/blockstitch) directly — the same
theme and editor components as the app.

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # astro check && vue-tsc && astro build → dist/
```

## Deploying

Every push to `master` runs `.github/workflows/deploy.yml`, which builds the site
and publishes `dist/` to GitHub Pages. It can also be re-run by hand from the
Actions tab (useful after a Blockwork release, to refresh the changelog page).

One-time setup on GitHub:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Pages → Custom domain:** `blockworked.com` (also shipped as
   `public/CNAME`), then enable *Enforce HTTPS* once the certificate is issued.
3. At the DNS provider, point the apex domain at GitHub Pages: `A` records to
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   (and optionally `www` as a `CNAME` to `<org>.github.io`).

## Layout

- `src/styles/global.css` — imports `blockstitch/theme.css` into a cascade layer,
  so site styles win over its app-window globals (fixed-height body, bare
  `button` styling) without forking it.
- `src/blockwork/` — Blockwork's editor frontend, copied from Blockwork's `ui/src/`:
  field components, the sidebar, Make a Variable / Make a Block dialogs, the
  operator table, and `blockstitchSetup.ts`. Keep these in sync with the app
  when its editor changes. The website-only files are:
  - `tauri.ts` replaces the app's Tauri bridge with an in-browser backend that
    ports the Rust commands (`split_strand`, `create_block`, `take_value`, …).
    Nothing persists.
  - `store.ts` holds the reactive state and the starter macro.
  - `evaluate.ts` ports `Value::eval` for click-to-preview.
  - `keyNames.ts` and `macroFile.ts` turn the workspace into a real `.macro`
    file (the Export button), in the same JSON shape as blockwork-core's `Macro`.
  - `components/AppSelectorDialog.vue` and `components/ContextMenu.vue` are
    trimmed web versions of the app's.
- `src/demo/DemoEditor.vue` — the home page editor, built from `src/blockwork/`.
  blockstitch addresses the canvas by fixed element ids, so only one editor can
  exist per page.
- `src/demo/BlockPreview.vue` — non-interactive block stacks (the feature-card
  illustrations), rendered by blockstitch's real `InstructionList` from presets
  so they match the editor exactly. `SnapPreview.vue` is the looping
  drag-and-snap one.
- `src/components/Downloader.astro` — fetches the latest GitHub release in the
  browser and recommends a build for the visitor's OS/arch.
- `src/pages/changelog.astro` — rendered **at build time** from Blockwork's
  `CHANGELOG.md` on `master`.
- `src/assets/screenshots/` — drop `editor.png`, `recording.png`, `settings.png`
  here; missing ones render as placeholders.

## Updating blockstitch

`blockstitch` is pinned to a commit in `package.json`, like Blockwork's `ui/`.
Bump both together so the site matches the shipped app:

```bash
pnpm add "blockstitch@github:Blockworked/blockstitch#<commit>"
```

**Dev-server CSS:** after editing a page's `<style>`, `astro dev` occasionally
keeps serving the previous version to the browser (the change appears for a
moment, then reverts). Restart `pnpm dev` if a style edit doesn't stick — the
production build is unaffected.

The dev server excludes blockstitch from Vite's dependency pre-bundling
(`astro.config.mjs`); if the editor ever fails to hydrate in dev with an
"Outdated Optimize Dep" error after changing dependencies, restart with
`pnpm dev --force`.
