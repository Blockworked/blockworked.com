# blockworked.com

Product site for [Blockwork](https://github.com/Blockworked/Blockwork), built with
[Astro](https://astro.build) and deployed to GitHub Pages. The live editor on the
home page is Blockwork's own Qt/QML editor, compiled to WebAssembly.

```bash
pnpm install
qt-demo/build.sh  # builds the editor into public/demo/ (see below)
pnpm dev          # http://localhost:4321
pnpm build        # astro check && astro build → dist/
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

- `src/styles/theme.css` — the color, spacing and motion tokens (with their light
  theme) and base control styles the site's markup uses, taken from blockstitch's
  old browser theme. `global.css` loads it into a cascade layer, so site styles
  win over its app-window globals (fixed-height body, bare `button` styling).
- `qt-demo/` — the home page editor: Blockwork's `EditorPage.qml` and
  blockstitch's QML components, built for the browser with Qt for WebAssembly.
  The QML comes straight from the Blockwork, blockstitch and lucide-qt checkouts,
  so the page always shows the app's real editor. The website-only files are:
  - `DemoBackend.qml` stands in for the Blockwork daemon: it answers EditorPage's
    `invoke(...)` commands (`add_strand`, `merge_tail`, `take_value`, …) and its
    AppBridge calls by porting them from `commands.rs` and blockstitch-core onto
    in-memory macros, and evaluates reporters for click-to-preview. Nothing runs
    and nothing persists; buttons that need the app say so in a notice bar.
  - `DemoMain.qml` puts a window on each Qt screen: the editor, then the
    feature-card illustrations (`PreviewStage.qml`, drawn by blockstitch's real
    `InstructionBlock`; "snap" is the looping drag-and-snap one).
  - `shims/` replaces the desktop window chrome and the screen picker.
- `src/lib/qtDemo.ts` — starts the editor once the page scrolls near it. One Qt
  instance draws every live block on the page: each `[data-qt-screen]` element is
  a Qt screen, in the order `DemoMain.qml` expects. It also keeps Qt from taking
  focus (and scrolling the page) until the editor is clicked, and on phones has
  Qt draw the locked editor as a shrunk thumbnail of the desktop layout.
- `src/components/Downloader.astro` — fetches the latest GitHub release in the
  browser and recommends a build for the visitor's OS/arch.
- `src/pages/changelog.astro` — rendered **at build time** from Blockwork's
  `CHANGELOG.md` on `master`.
- `src/assets/screenshots/` — drop `editor.png`, `recording.png`, `settings.png`
  here; missing ones render as placeholders.

## Building the editor

`qt-demo/build.sh` needs Qt for WebAssembly (single-threaded, so GitHub Pages can
serve it without cross-origin isolation headers), the Emscripten version that Qt
build wants, and a desktop Qt of the same version for the host tools:

```bash
pip install aqtinstall
aqt install-qt all_os wasm 6.12.0 wasm_singlethread -O ~/Qt
git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
~/emsdk/emsdk install 5.0.5 && ~/emsdk/emsdk activate 5.0.5
```

```bash
QT_WASM=~/Qt/6.12.0/wasm_singlethread EMSDK=~/emsdk QT_HOST_PATH=/usr qt-demo/build.sh
```

`QT_HOST_PATH` is the desktop Qt (`/usr` for a system Qt 6.12). The QML is read
from `../Blockwork`, `../blockstitch` and `../lucide-qt` unless `BLOCKWORK_DIR`,
`BLOCKSTITCH_DIR` and `LUCIDE_QT_DIR` say otherwise. The deploy workflow clones
those repos (the `BLOCKWORK_REF`/`BLOCKSTITCH_REF`/`LUCIDE_QT_REF` branches set at
the top of `deploy.yml`) and builds the editor before the site, so editor changes
reach the site on the next deploy; re-run it from the Actions tab to pick them up
sooner.

When EditorPage starts calling a daemon command the backend doesn't know, it's
ignored; add it to `commands` in `DemoBackend.qml`. A new QML file EditorPage
uses goes into the `blockwork` module list in `qt-demo/CMakeLists.txt`.

**Dev-server CSS:** after editing a page's `<style>`, `astro dev` occasionally
keeps serving the previous version to the browser (the change appears for a
moment, then reverts). Restart `pnpm dev` if a style edit doesn't stick — the
production build is unaffected.
