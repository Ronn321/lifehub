'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DEFAULT_APP_NAME, readBrandName, type SystemSettings } from '@/lib/brand';

// Gleicher Query-Key wie die Einstellungs-Seite (System-Einstellungen),
// damit Speichern dort die Sidebar und den Login-Screen aktualisiert.
export const SYSTEM_SETTINGS_QUERY_KEY = ['system-settings'] as const;

/**
 * Liefert den konfigurierten Anwendungsnamen (Backend-Setting
 * `general.brand_name`), solange kein Wert geladen ist den Default 'LifeHub'.
 */
export function useBrandName(): string {
  const { data } = useQuery<SystemSettings>({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: () => api.get<SystemSettings>('/system/settings'),
  });
  return readBrandName(data ?? undefined);
}