// Shared brand-name helpers: configured app name (Anwendungsname) shown in
// the sidebar brand and on the login screen. Source of truth is the backend
// setting `general.brand_name` (GET/PUT /api/v1/system/settings).

export const DEFAULT_APP_NAME = 'LifeHub';

export interface SystemSettings {
  [key: string]: unknown;
}

/**
 * Liest den konfigurierten Anwendungsnamen aus den System-Settings.
 * Fallback: DEFAULT_APP_NAME ('LifeHub') bei fehlendem, leerem oder
 * nicht-String-Wert. Führende/abschließende Whitespaces werden entfernt.
 */
export function readBrandName(settings: SystemSettings | null | undefined): string {
  const raw = settings?.['general.brand_name'];
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  return DEFAULT_APP_NAME;
}