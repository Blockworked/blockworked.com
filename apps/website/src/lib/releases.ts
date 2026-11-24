// Release/asset helpers shared by the downloader (client) and the changelog
// page (build time). Asset names come from Blockwork's
// `.github/workflows/release.yml`, e.g. `blockwork-windows-x86_64-setup.exe`,
// `blockwork-linux-arm64.flatpak`, `blockwork-ubuntu-26.04-amd64.deb`,
// `blockwork-macos-arm64.app.zip`.

import { ct } from './client-i18n';

export const REPO = 'Blockworked/Blockwork';
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases`;

export type Platform = 'windows' | 'macos' | 'linux';
export type Arch = 'x86_64' | 'arm64';

export const PLATFORM_LABELS: Record<Platform, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
};

export interface GitHubAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  body_html?: string;
  assets: GitHubAsset[];
}

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
  platform: Platform;
  arch: Arch;
  /** Short format name shown next to the platform, e.g. "Installer". */
  kind: string;
  /** One-line explanation of when to pick this build. */
  hint: string;
  /** Lower sorts first within a platform; 0 is the default suggestion. */
  rank: number;
}

export function parseAsset(asset: GitHubAsset): ReleaseAsset | null {
  const name = asset.name.toLowerCase();
  const arch: Arch = /arm64|aarch64/.test(name) ? 'arm64' : 'x86_64';
  const base = { name: asset.name, url: asset.browser_download_url, size: asset.size, arch };

  if (name.includes('windows')) {
    if (name.includes('setup')) {
      return { ...base, platform: 'windows', kind: ct('Installer'), hint: ct('Recommended for most people'), rank: 0 };
    }
    if (name.endsWith('.zip')) {
      return { ...base, platform: 'windows', kind: ct('Portable'), hint: ct('No installation: unzip, then run blockwork.exe inside the Blockwork folder'), rank: 1 };
    }
    // The MSIX is for the Microsoft Store, and old releases' bare .exe needs Qt beside it.
    return null;
  }
  if (name.includes('macos') || name.includes('darwin')) {
    return { ...base, platform: 'macos', kind: ct('App'), hint: ct('Unsigned: unzip, move to Applications, then right-click › Open the first time'), rank: 0 };
  }
  // For one Ubuntu release, e.g. `blockwork-ubuntu-26.04-amd64.deb`.
  const ubuntu = name.match(/^blockwork-ubuntu-([\d.]+)-.*\.deb$/);
  if (ubuntu) {
    return { ...base, platform: 'linux', kind: `Ubuntu ${ubuntu[1]}`, hint: ct('For Ubuntu {version}. Open it in your software center to install', { version: ubuntu[1] }), rank: 2 };
  }
  if (name.includes('linux')) {
    if (name.endsWith('.deb')) {
      return { ...base, platform: 'linux', kind: ct('Debian and Ubuntu'), hint: ct('For Debian 13, Ubuntu 24.04 and newer. Open it in your software center to install'), rank: 3 };
    }
    if (name.endsWith('.appimage')) {
      return { ...base, platform: 'linux', kind: 'AppImage', hint: ct('Runs on most distributions. Mark it executable and launch'), rank: 0 };
    }
    if (name.endsWith('.flatpak')) {
      return { ...base, platform: 'linux', kind: 'Flatpak', hint: ct('Sandboxed bundle. Install with flatpak install'), rank: 1 };
    }
  }
  return null;
}

export function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 100 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

export function formatDate(iso: string, language = 'en-US'): string {
  return new Date(iso).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' });
}

export interface ChangelogEntry {
  version: string;
  date: string | null;
  html: string;
}

let changelogEntries: Promise<ChangelogEntry[]> | null = null;

/** Blockwork's CHANGELOG.md (Keep a Changelog format) on its master branch,
 *  richer than the GitHub release bodies, which are generated from it at tag
 *  time and are sometimes just a stub. Fetched once per build, for every
 *  language's changelog page. */
export function changelog(): Promise<ChangelogEntry[]> {
  changelogEntries ??= fetchChangelog();
  return changelogEntries;
}

async function fetchChangelog(): Promise<ChangelogEntry[]> {
  const { marked } = await import('marked');
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/master/CHANGELOG.md`);
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    // The site avoids em-dashes, including in text pulled from Blockwork's changelog.
    const md = (await res.text()).replace(/\s*\u2014\s*/g, ', ');
    // "## [0.5.3] - 2026-09-14" starts each entry; anything before the first is the preamble.
    const heading = /^## \[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?\s*$/gm;
    const matches = [...md.matchAll(heading)];
    return matches.map((m, i) => {
      const body = md.slice(m.index! + m[0].length, matches[i + 1]?.index ?? md.length);
      return {
        version: m[1],
        date: m[2] ?? null,
        // Drop trailing link-reference definitions ("[0.5.3]: https://…").
        html: marked.parse(body.replace(/^\[[^\]]+\]:\s+\S+\s*$/gm, '').trim(), { async: false }),
      };
    });
  } catch (e) {
    // A deploy must not ship the fallback page; a local build may.
    const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env;
    if (env?.CI) throw new Error(`[changelog] couldn't fetch CHANGELOG.md: ${e}`);
    console.warn(`[changelog] couldn't fetch CHANGELOG.md, rendering the fallback: ${e}`);
    return [];
  }
}
