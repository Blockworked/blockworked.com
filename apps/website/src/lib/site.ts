// The top nav shared by blockworked.com and community.blockworked.com, so the
// two read as one site. The community site (apps/community) keeps its link
// list, markup and styles in `src/site-nav.ts`. Change both together.

/** The community blocks library. Override with PUBLIC_COMMUNITY_URL to point
 *  the nav at a local `wrangler dev` while testing. */
export const COMMUNITY_URL: string =
  import.meta.env.PUBLIC_COMMUNITY_URL ?? 'https://community.blockworked.com';

/** The helpdesk, served by the community site's Worker. */
export const SUPPORT_URL: string =
  import.meta.env.PUBLIC_SUPPORT_URL ?? 'https://support.blockworked.com';

/** The translation site, also served by the community site's Worker. */
export const TRANSLATE_URL: string =
  import.meta.env.PUBLIC_TRANSLATE_URL ?? 'https://translate.blockworked.com';

export interface NavLink {
  href: string;
  label: string;
}

// Marks a label for scripts/i18n.mjs; SiteHeader translates it.
const t = (label: string) => label;

export const NAV_LINKS: NavLink[] = [
  { href: '/#features', label: t('Features') },
  { href: '/#screenshots', label: t('Screenshots') },
  { href: '/download', label: t('Download') },
  { href: '/changelog', label: t('Changelog') },
  { href: COMMUNITY_URL, label: t('Community') },
  { href: `${SUPPORT_URL}/`, label: t('Support') },
  { href: `${TRANSLATE_URL}/`, label: t('Translate') },
];
