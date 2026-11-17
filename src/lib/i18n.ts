// The site's languages. English text is the message id (gettext); catalogs come
// from locales/*.po through scripts/i18n.mjs compile. English lives at /, every
// other offered language under its own prefix (/de/, /pt-br/). The language is
// read off the page's URL, so a component only needs `locale(Astro.url)`.
// community.blockworked.com keeps the same scheme in its src/i18n.ts.
import { CATALOGS, CLIENT } from './locales.generated';

export interface Catalog {
  tag: string; name: string; dir: 'ltr' | 'rtl'; offered: boolean; complete: number;
  plural: (n: number) => number; messages: Record<string, string[]>;
}
type Vars = Record<string, string | number>;

/** The cookie both Blockworked sites keep the chosen language in. */
export const LANGUAGE_COOKIE = 'bw-lang';

export interface Language { code: string; tag: string; name: string; dir: 'ltr' | 'rtl'; prefix: string }

const english: Language = { code: 'en', tag: 'en', name: 'English', dir: 'ltr', prefix: '' };

/** Languages people can pick, English first. */
export const LANGUAGES: Language[] = [english, ...Object.entries(CATALOGS)
  .filter(([, c]) => c.offered)
  .map(([code, c]) => ({ code, tag: c.tag, name: c.name, dir: c.dir, prefix: '/' + c.tag.toLowerCase() }))
  .sort((a, b) => a.name.localeCompare(b.name))];

/** getStaticPaths for a page served in every language: `[...lang]` is empty for English. */
export function languagePaths() {
  return LANGUAGES.map(l => ({ params: { lang: l.prefix ? l.prefix.slice(1) : undefined } }));
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
}

export function locale(url: URL) {
  const first = url.pathname.split('/')[1]?.toLowerCase() ?? '';
  const lang = LANGUAGES.find(l => l.prefix === '/' + first) ?? english;
  const catalog = lang.code === 'en' ? undefined : CATALOGS[lang.code];
  const number = (n: number) => n.toLocaleString(lang.tag);
  const fill = (text: string, vars: Vars | undefined, esc: (s: string) => string) =>
    !vars ? esc(text) : esc(text).replace(/\{([a-zA-Z]+)\}/g, (whole, name: string) =>
      Object.hasOwn(vars, name) ? String(typeof vars[name] === 'number' ? number(vars[name] as number) : vars[name]) : whole);
  const lookup = (id: string) => catalog?.messages[id]?.[0] ?? id;
  const plain = (s: string) => s;
  /** The path without the language prefix, e.g. /download. */
  const path = (lang.prefix ? url.pathname.slice(lang.prefix.length) : url.pathname) || '/';
  return {
    ...lang,
    path,
    /** A translated message; Astro escapes it. Placeholders look like {name}. */
    t: (id: string, vars?: Vars) => fill(lookup(id), vars, plain),
    /** A translated message as HTML for `set:html`: the text is escaped, `vars` go in as they are. */
    th: (id: string, vars?: Vars) => fill(lookup(id), vars, escape),
    /** A message with plural forms; {n} is the count. */
    tn: (one: string, other: string, n: number, vars?: Vars) => {
      const forms = catalog?.messages[one];
      return fill(forms ? forms[Math.min(forms.length - 1, catalog!.plural(n))] : n === 1 ? one : other, { n, ...vars }, plain);
    },
    /** A site path in this language: /download becomes /de/download. */
    href: (to: string) => (to.startsWith('/') && !to.startsWith('//') ? lang.prefix + (to === '/' && lang.prefix ? '/' : to) : to),
    /** Translations of the strings the page's scripts show (see client-i18n.ts). */
    client: () => catalog ? Object.fromEntries(CLIENT.flatMap(id => catalog.messages[id] ? [[id, catalog.messages[id][0]]] : [])) : {},
  };
}
export type Locale = ReturnType<typeof locale>;
