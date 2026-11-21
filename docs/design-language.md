# The Blockworked design language

How Blockworked things look and feel: the Blockwork app, the blockstitch
editor, blockworked.com, the community site, translate and support, the
browser extension, and anything new (Blockloom, Stitchcraft, ...).

Everything here is taken from the code as it is today. Where a value is
written down, the file it comes from is named, and that file wins if the two
ever disagree. When you change a token, change it there and update this page.

| Source of truth | What it holds |
| --- | --- |
| blockstitch `qml/Blockstitch/Theme.qml` | App colors (light and dark), block text size, radius, spacing |
| blockstitch `qml/Blockstitch/Motion.qml` | App animation durations and the animation speed setting |
| blockstitch `qml/Blockstitch/BlockSurface.qml`, `ValueChip.qml` | Block and reporter silhouettes |
| blockstitch `qml/Blockstitch/Stitch*.qml` | The shared small controls every Qt host uses |
| blockstitch `qml/Blockstitch/Icons.qml`, `LucideIcon.qml` | Lucide icons |
| blockworked.com `apps/website/src/styles/theme.css`, `global.css` | Website tokens, font, buttons, panels |
| blockworked.com `apps/community/src/pages.ts`, `browse-css.ts` | Community, translate and support tokens and components |

## The idea in one paragraph

Blockworked looks like the editor it is built around: a calm, grey, flat
workspace where the only shapes that stand out are blocks, and the only color
that stands out is the blue accent. Text is plain, sentence case and easy to
read. Small facts are shown with the same pieces the editor uses (a value
box, a tick, a hairline row), not with badges, pills or decoration. If
something on a page would look at home in a generic AI-generated landing
page, it is wrong for Blockworked.

## Typography

**Typeface: Atkinson Hyperlegible Next** (OFL), everywhere: the app bundles
it (Blockwork `res/fonts`, loaded as the application font), the sites serve it
as variable woff2 files (`/fonts/atkinson-hyperlegible-next-*.woff2`, weights
200 to 800, latin and latin-ext, normal and italic). Fallback stack:

```css
"Atkinson Hyperlegible Next", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
```

Code and identifiers use the system monospace stack:
`ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, monospace`.
Atkinson's zero is slashed and has no plain-zero alternate; that is fine.

### App sizes (Qt, pixels)

| Use | Size | Weight |
| --- | --- | --- |
| Text inside blocks (labels, fields, dropdowns) | 13 (`Theme.blockText`) | DemiBold for block labels |
| Block header captions, box captions | 12 (`blockText - 1`) | Regular, `textDim` |
| Buttons, text fields | 13 | Regular |
| Menu items, check boxes, palette tile names | 12 | Regular |
| Palette rail labels, block counts | 10 | Regular |
| Palette category names | 15 | Bold |
| Palette section names | 13 | DemiBold, `textDim` |
| Switch labels | 14 | Regular |
| Dialog titles | 16 | Bold |

### Web sizes

| Use | Value |
| --- | --- |
| Body | 15px, line-height 1.55, antialiased |
| Page h1 (community, download, changelog) | `clamp(28px, 4vw, 36px)`, 700 |
| Hero h1 | `clamp(32px, 5vw, 44px)`, 700 |
| Section heading (website) | `clamp(26px, 3.4vw, 36px)`, 700, line-height 1.15 |
| h2 / h3 | 20px / 17px, 700 |
| Lede under a heading | 16 to 17px, `max-width: 60ch`, dim or 78% text color |
| Small UI text (buttons, nav, captions, rows) | 13px |
| Code blocks | 12px mono |

Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`. The
blockworked.com tagline is plain weight 400 at `max-width: 32ch`.

### Rules

- **Sentence case** for headings, buttons, menu items, section names and
  tabs ("Community blocks", "Sign out", "All categories").
- **The one exception: trigger (hat) block labels are capitals**, because they
  are the block's text, not a UI label ("WHEN F8", "WHEN POWER PLUGGED IN").
  This was tried in sentence case and the user asked for capitals back.
- **No letter-spaced small caps** labels (the old "CONDITIONS" palette
  headings), no eyebrow text above headings.
- **No ultra-heavy, negative-tracked display headlines.** 700 is the heaviest
  heading weight; tracking stays at the font's default.
- **No accent-colored words** inside a heading.
- **No em-dashes in UI copy.** Use a full stop or a comma. (blockworked.com
  even swaps blockstitch's empty-strand hint for a version without one.)
- Copy is plain and specific: say what a thing does, not how exciting it is.

## Color

The app follows the desktop's light or dark setting (and the user's override
in Settings). The sites are dark first, follow the OS without a cookie, and
share the choice through one theme cookie (`/site.js` on the community
site sets `data-theme` from it).

### App tokens (`Theme.qml`)

| Token | Dark | Light | Used for |
| --- | --- | --- | --- |
| `window` | `#1d1e20` | `#f3f4f6` | Window background |
| `panel` | `#242527` | `#ffffff` | Sidebar, dialogs |
| `panelRaised` / `menu` | `#303134` | `#e9ecf0` | Raised panels, menus, default button fill |
| `canvas` | `#27282b` | `#f5f6f8` | The block workspace |
| `field` | `#292a2d` | `#f0f2f5` | Text fields, reporter fill |
| `border` | `#4a4b50` | `#aeb5c0` | Control and block outlines |
| `borderSoft` | `#36373a` | `#d7dce3` | Dividers, quiet outlines |
| `text` | `#dedee0` | `#202631` | Text |
| `textDim` | `#96979c` | `#616b79` | Secondary text, captions, inactive icons |
| `accent` | `#1597ff` | `#006fc9` | The one highlight color: selection, focus, hover outline, primary button, trigger icons |
| `accentHover` | `#32a5ff` | `#005eae` | Primary button hover |
| `danger` | `#ff4848` | `#c62828` | Delete, errors, breakpoints |
| `warning` | `#f5b942` | `#8a5900` | Paused here, warnings |
| `running` | `#3ccf6e` | `#18743b` | A running block's outline, success |
| `block` | `#3b3c40` | `#e1e5eb` | Block fill |
| `blockTop` | `#44454a` | `#d5dbe4` | Block header band |
| `partBlock` | `#3e3a4f` | `#e4ddf3` | Part blocks and the mouths that hold them (parity-p1) |
| `hover` | `#3b3c40` | `#dbe1e9` | Hover fill |
| `selection` | `#1d3a55` | `#d9eaff` | Selected rows and text |
| `grid` | `#46474d` | `#c7cdd6` | Canvas dots |
| `warning/success/danger` + `Background` / `Border` | see file | see file | Banners and notices |

### Web tokens

The sites use the same values under web names (`--blockstitch-*` in
blockworked.com `theme.css`, short names like `--bg`, `--fg`, `--muted` in
the community Worker's `pages.ts`):

| Web token | App token |
| --- | --- |
| `bg` | `window` |
| `bg2` | `panel` |
| `bg3` | `panelRaised` |
| `field` | `field` |
| `canvas` (website) | `canvas` |
| `border` | `border` |
| `glass-border` (hairlines) | `borderSoft` |
| `text` / `fg` | `text` |
| `text-dim` / `muted` | `textDim` |
| `accent`, `accent-light` (hover) | `accent`, `accentHover` |
| `red` / `danger` | `danger` |
| `yellow` / `warn`, `yellow-bg`, `yellow-border` | `warning`, `warningBackground`, `warningBorder` |
| `ok` | `running` |
| `grid` (website) | `grid` |
| `glass-bg` / `glass` | same as `bg2` (panels are flat) |

When `Theme.qml` changes, copy the new values into both files.

### How color is used

- **Blocks are neutral.** Every block is filled with `block` and outlined
  with `border`. There are no per-category block colors. A block's icon is
  `text`; a trigger's icon is `accent`.
- **Custom blocks get one color**, picked from the definition editor's
  presets (`BlockDefinitionEditor.qml` `colorPresets`, default `#4C97FF`).
  It colors the block's icon, its hover outline and the outline of its
  reporters. The fill stays neutral.
- **Hover is an outline, not a fill**, on blocks and reporters: the outline
  turns `accent` (or the custom color). A drop target adds a soft 6px glow
  under a 2.4px line.
- **State colors are outlines too**: `running` green while a block runs,
  `warning` amber when paused on it, `danger` red for a breakpoint or error.
- Blue is the only "brand" color. Don't introduce a second accent, gradients
  or colored backgrounds to make a page feel lively.

## Shape and spacing

| Token | Value |
| --- | --- |
| Base radius (`Theme.radius`, `--radius`) | 6px |
| Text fields, menu items, reporters | 5px |
| Menus | 8px |
| Dialogs | 12px |
| Web panels and cards (`--radius-lg`) | 14px |
| Large web buttons | 8px |
| Base spacing (`Theme.spacing`) | 12px (8px for tight rows) |
| Web content column | 920px (community, download, changelog), 1120px (website) |
| Web side padding | 24px, 16px under 560px |

Control heights: app buttons 38, text fields 34, menu items 34, switches and
check boxes 28; web buttons 32 (`--btn-h-md`), small 26, large 44.

Outlines are 1px on controls and 1.3px on blocks. Panels, cards, banners
and the header have no shadow; shadows are kept for things that float above
the page (screenshots, the editor demo window, menus).

## Blocks

Blocks are the brand. Anything that needs a picture of Blockworked should use
real blocks, drawn by the real QML (see the block SVG export notes), not a
redrawn approximation.

- **Stack block**: a rounded rectangle (corner radius 5) with a connector
  notch cut into the top and a matching tab below. The connector is 30px wide,
  8px deep, starts 13px from the left edge, with 1.5px rounded corners
  (`BlockSurface.qml` `profile: [[0,0],[8,8],[22,8],[30,0]]`).
- **Header (trigger)**: no top notch. **Cap**: no bottom tab.
- **Wrap (C block)**: head bar 50, mid bars 34, foot bar 26, a 20px spine on
  the left; nested blocks' notches line up with the mouth.
- **Reporters**: `field`-filled rounded boxes (radius 5) with a 1px `border`
  outline. **Booleans are hexagons** (pointed ends at about a third of their
  height). A reporter with branches gets 24px rounded ends.
- **Block row**: Lucide icon (16px) first, then the label and slots, 7px
  apart, 13px DemiBold text.
- **The canvas** is `canvas` with a dot grid of `grid`-colored dots every
  22px that moves and scales with the content.

On the web the same notch is available as CSS tokens
(`--blockstitch-connector-cut-inset: 10px`, `-cut-width: 22px`,
`-notch-depth: 8px`), and `.dot-grid` reproduces the canvas grid.

## Icons

**Lucide, and only Lucide.** In Qt through `LucideIcon` (the icon paths are
staged from lucide-qt into `Icons.qml`); on the web as inline Lucide SVGs.

- 16px in blocks, buttons and menus; 13 to 15px next to small web text;
  22px on palette category tiles.
- Stroke color follows the text it sits with: `text`, `textDim` when
  inactive, `accent` when selected, white on a primary button, `danger` on a
  destructive one.
- No emoji or other icon sets in the UI, no icons inside colored tiles or
  circles as decoration.

## Motion

From `Motion.qml`. Every app animation takes its duration from here so the
Animation speed setting (Instant / normal / slower) reaches all of them, and
`Motion.enabled` is false at Instant.

| Name | Duration | For |
| --- | --- | --- |
| `quick` | 110ms | Hover and press feedback |
| `normal` | 170ms | Menus, popups, toggles, small state changes |
| `slow` | 240ms | Dialogs and page changes |
| `scroll` | 180ms | Easing a wheel notch to its target |

- Easing: `OutCubic` for things arriving, `InCubic` for things leaving.
  `OutBack` only for tiny confirmations (a check mark popping in, a dialog
  settling from 0.94 scale with overshoot 1.2).
- Wheel scrolling glides and keeps its speed between notches.
- Web: `--ease-standard` `cubic-bezier(0.4, 0, 0.2, 1)`, 120ms for hovers,
  180ms page fades (view transitions within a site, a fade under the header
  when crossing between blockworked.com and community).
- Respect reduced motion everywhere (`prefers-reduced-motion` on the web,
  the Instant setting in the app).
- No hover lifts (`translateY(-1px)`), springy bounces on buttons, glows or
  shimmer.

## Components

### Buttons

| Kind | App (`StitchButton`) | Web (`.btn` / `button`) |
| --- | --- | --- |
| Default | `panelRaised` fill, `border` outline, hover fill `hover` | `bg3` fill, `border` outline, hover `hover` overlay |
| Primary | `accent` fill, white text | `accent` fill, white 600 text, hover `accent-light` |
| Flat / ghost | No fill or border until hovered, `textDim` icon | Transparent, `muted` text |
| Danger | `danger` outline and text | (not used on the web) |

Pressed is a slightly darker fill (app) or 85% opacity (web). Disabled is
about 40% opacity. Focus on the web is a 2px `accent` outline, offset 2px.

### Fields

Filled `field` (`bg2` on the web), 1px `border`, radius 5 to 6, 13px text.
Focus turns the border `accent`; on the web a 3px accent ring at 28% opacity.

### Menus and dialogs

Menus: `panelRaised`, 1px `border`, radius 8, 5px padding, 34px items with
12px text and a `hover` row highlight. Dialogs: `panel`, radius 12, 22px
padding, a 16px bold title with a flat round close button, and a dim
backdrop.

### Lists and rows

Lists are **hairline rows**: each item separated by a 1px `glass-border`
(`borderSoft` in the app) line, about 14px vertical padding. No card grids
for lists. On the download page the whole row is the link.

### Panels

Settings-style groups: radius 14 (`--radius-lg`), 1px hairline border,
flat `bg2` fill (no blur, no shadow), a title row at 13px 600 and 10 to 12px rows.

### Tabs

Underlined tabs on the web (`.tabs`, a hairline under the row, the selected
one marked). The app's Settings tabs and palette rail mark the selected item
with an `accent` icon and `text` label, others `textDim`.

### Small facts: value boxes, ticks and marks (not pills)

- **A version or a number** sits in the same box a value does in the editor:
  `.version`, 1px `border`, radius 5, `bg` fill, 12px 600, tabular numbers.
- **A status or role** is words with a small icon (`.mark`): a green tick for
  the latest release, a pen for a pack's author, a status dot plus text on
  support tickets.
- Count text is plain ("3 comments").

### Banners

Warnings: `warn-bg` fill, `warn-border` outline, radius 14 on the web,
13px text with a 16px Lucide icon on the left. The app uses the
`warningBackground` / `warningBorder` tokens and their success and danger
siblings.

## Imagery

- Screenshots and hero images come from the real app (captured on the mock
  desktop at a fixed zoom), in both light and dark versions.
- Example scripts in marketing show Blockworked's own content, not other
  companies' apps or people's names (the hero script is "When F8, type
  'On my way!', wait 500, log 'Replied'").
- Blocks in videos and promo art must match blockstitch 1:1, Lucide icons
  included.

## Don'ts

The user has called each of these "AI-looking" at some point; they have all
been removed once and should not come back.

- Letter-spaced uppercase labels and eyebrows.
- Pills and badges for versions, roles or status ("current", "author", "NEW").
- Huge heavy headlines with tight tracking, gradient or accent-colored words.
- Card grids for things that are a list; icon-in-a-tile feature grids.
- Decorative arrows (→) on links and buttons, emoji in UI.
- Marketing copy where a plain sentence would do ("Supercharge your...").
- Glows, gradients, hover lifts and spring animations on controls.
- Notches, tabs or other block shapes used as decoration next to text (the
  connector-notch section labels were removed).
- Em-dashes in UI text.
- Calling Blockwork "desktop-only" (Android is coming).

## Known drift

Places where the code doesn't yet match this page.

- The community Worker copies the web tokens by hand in `pages.ts` instead of
  sharing a file with the website.
- `support-css.ts` defines a global `.tabs` that clashes with the browse
  pages' `.tabs`.
