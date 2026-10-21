// The top nav shared by blockworked.com and community.blockworked.com, so the
// two read as one site. The community site (Blockworked/Blockwork-community-
// blocks) keeps a copy of this list and of the header markup and styles in
// `src/site-nav.ts`; change both together.

/** The community blocks library. Override with PUBLIC_COMMUNITY_URL to point
 *  the nav at a local `wrangler dev` while testing. */
export const COMMUNITY_URL: string =
  import.meta.env.PUBLIC_COMMUNITY_URL ?? 'https://community.blockworked.com';

export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/#features', label: 'Features' },
  { href: '/#screenshots', label: 'Screenshots' },
  { href: '/download', label: 'Download' },
  { href: '/changelog', label: 'Changelog' },
  { href: COMMUNITY_URL, label: 'Community' },
];
