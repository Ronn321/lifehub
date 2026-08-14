// Sidebar visibility filter driven by a localStorage list of hidden nav hrefs.
// The mobile app (Flutter WebView) writes this list via runJavaScript.
export const NAV_ITEM_KEY = 'lifehub:sidebar:hidden';

export interface NavItemDef {
  href: string;
  label: string;
}

// Tolerant JSON parsing: broken or non-array payloads yield an empty list.
export function readHiddenNav(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

// Pure filter — keeps only items whose href is not in the hidden set.
export function filterNavItems<T extends NavItemDef>(items: T[], hidden: string[]): T[] {
  const hiddenSet = new Set(hidden);
  return items.filter((i) => !hiddenSet.has(i.href));
}
