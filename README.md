# Blockworked sites

- [Product website](apps/website) uses Astro and pnpm. GitHub Pages serves `blockworked.com`, including the Qt/Wasm editor demo and the pack viewer.
- [Community app](apps/community) uses npm and Wrangler. A Cloudflare Worker serves the library, support, and translation sites.

Run each app's commands from its directory. The apps keep their own lockfiles and licenses. The [migration guide](docs/monorepo-migration.md) covers the switch to this repository. The [design language](docs/design-language.md) describes how every Blockworked app and site should look.
