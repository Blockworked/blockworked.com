// Release/asset helpers shared by the downloader (client) and the changelog
// page (build time). Asset names come from Blockwork's
// `.github/workflows/release.yml`, e.g. `blockwork-windows-x86_64-setup.exe`,
// `blockwork-linux-arm64.flatpak`, `blockwork-macos-arm64.app.zip`.

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
    return name.includes('setup')
      ? { ...base, platform: 'windows', kind: 'Installer', hint: 'Recommended for most people', rank: 0 }
      : { ...base, platform: 'windows', kind: 'Portable', hint: 'A single .exe, no installation', rank: 1 };
  }
  if (name.includes('macos') || name.includes('darwin')) {
    return { ...base, platform: 'macos', kind: 'App', hint: 'Unsigned — unzip, move to Applications, then right-click › Open the first time', rank: 0 };
  }
  if (name.includes('linux')) {
    if (name.endsWith('.appimage')) {
      return { ...base, platform: 'linux', kind: 'AppImage', hint: 'Runs on most distributions — mark it executable and launch', rank: 0 };
    }
    if (name.endsWith('.flatpak')) {
      return { ...base, platform: 'linux', kind: 'Flatpak', hint: 'Sandboxed bundle — install with flatpak install', rank: 1 };
    }
  }
  return null;
}

export function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 100 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
