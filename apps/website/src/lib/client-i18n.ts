// Translations for text the page's scripts write. Base.astro puts the page
// language's copies of every ct() string in #bw-i18n, and the language prefix
// on <html data-lang-prefix>.
let table: Record<string, string> | null = null;

/** A translated message for the browser; placeholders look like {name}. */
export function ct(id: string, vars?: Record<string, string | number>): string {
  if (!table) {
    try { table = JSON.parse(document.getElementById('bw-i18n')?.textContent || '{}'); } catch { table = {}; }
  }
  const text = table![id] ?? id;
  return vars ? text.replace(/\{([a-zA-Z]+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole)) : text;
}

/** A site path in the page's language. */
export function localHref(path: string): string {
  return (document.documentElement.dataset.langPrefix ?? '') + path;
}

/** The page language's BCP 47 tag. */
export function pageLanguage(): string {
  return document.documentElement.lang || 'en';
}
