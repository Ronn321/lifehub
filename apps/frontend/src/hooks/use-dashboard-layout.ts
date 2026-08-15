'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { DashboardLayout, Widget, WidgetType } from '@/lib/grid-utils';
import { findFreePosition, normalizeLayout, defaultConfig } from '@/lib/grid-utils';
import { generateId } from '@/lib/generate-id';
import { useAuthStore } from '@/lib/auth-store';
import { useClientModeStore } from '@/lib/client-mode';
import {
  getProfile, normalizeForProfile, defaultWidgetSizeForProfile,
} from '@/lib/dashboard-profiles';
import {
  readLocalLayout, writeLocalLayout, seedLocalLayout, clearLocalLayout,
} from '@/lib/dashboard-local-storage';
import type { DashboardProfile } from '@/lib/dashboard-profiles';
import type { ClientMode } from '@/lib/client-mode';

function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function useDashboardLayout() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const mode: ClientMode = useClientModeStore((s) => s.mode);
  const profile: DashboardProfile | null = getProfile(mode);
  const isLocal = profile !== null;
  const queryKey = ['dashboard-layout', isLocal ? mode : 'browser'];
  const cols = profile?.columns ?? 6;

  // Quelle: Browser → Backend (wie bisher), Geräteprofil → localStorage mit
  // Default-Seeding. Geräteprofile sind per App-Installation isoliert →
  // jedes Gerät hat sein eigenes Layout, Desktop bleibt unberührt.
  const { data: layout, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => {
      if (isLocal) {
        const stored = readLocalLayout(mode as Exclude<ClientMode, 'browser'>);
        if (stored) {
          return { widgets: normalizeForProfile(stored.widgets, profile) };
        }
        return seedLocalLayout(mode as Exclude<ClientMode, 'browser'>, profile);
      }
      return api.get<DashboardLayout>('/dashboard/layout');
    },
    staleTime: 60_000,
    enabled: !!accessToken,
  });

  const saveMutation = useMutation({
    mutationFn: (l: DashboardLayout) => api.put('/dashboard/layout', l),
    onMutate: async (newLayout) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<DashboardLayout>(queryKey);
      qc.setQueryData(queryKey, newLayout);
      return { prev };
    },
    onError: (_err, _newLayout, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  // Lokale Geräteprofile: synchron in localStorage schreiben (kein Debounce
  // nötig — schmerzlos, und Reloads sehen sofort den Stand).
  const saveLocal = useCallback((widgets: Widget[]) => {
    writeLocalLayout(mode as Exclude<ClientMode, 'browser'>, { widgets });
  }, [mode]);

  const optimisticSave = useCallback(
    (nextWidgets: Widget[]) => {
      const normalized = isLocal
        ? normalizeForProfile(nextWidgets, profile as DashboardProfile)
        : nextWidgets;
      if (isLocal) saveLocal(normalized);
      else saveMutation.mutate({ widgets: normalized });
    },
    [isLocal, profile, saveLocal, saveMutation],
  );

  const debouncedSave = useRef(
    debounce((widgets: Widget[]) => {
      if (isLocal) {
        saveLocal(normalizeForProfile(widgets, profile as DashboardProfile));
      } else {
        saveMutation.mutate({ widgets });
      }
    }, 300),
  ).current;

  const moveWidget = useCallback(
    (id: string, x: number, y: number) => {
      const current = qc.getQueryData<DashboardLayout>(queryKey);
      if (!current) return;
      const widgets = current.widgets.map((w) => (w.id === id ? { ...w, x, y } : w));
      const normalized = isLocal
        ? normalizeForProfile(widgets, profile as DashboardProfile)
        : normalizeLayout(widgets, cols);
      qc.setQueryData(queryKey, { widgets: normalized });
      if (isLocal) saveLocal(normalized);
      else saveMutation.mutate({ widgets: normalized });
    },
    [qc, queryKey, isLocal, profile, cols, saveLocal, saveMutation],
  );

  const resizeWidget = useCallback(
    (id: string, w: number, h: number) => {
      const current = qc.getQueryData<DashboardLayout>(queryKey);
      if (!current) return;
      const widgets = current.widgets.map((wgt) => (wgt.id === id ? { ...wgt, w, h } : wgt));
      const normalized = isLocal
        ? normalizeForProfile(widgets, profile as DashboardProfile)
        : normalizeLayout(widgets, cols);
      qc.setQueryData(queryKey, { widgets: normalized });
      if (isLocal) saveLocal(normalized);
      else debouncedSave(widgets);
    },
    [qc, queryKey, isLocal, profile, cols, saveLocal, debouncedSave],
  );

  const addWidget = useCallback(
    (type: WidgetType) => {
      const current = qc.getQueryData<DashboardLayout>(queryKey);
      if (!current) return;
      const size = defaultWidgetSizeForProfile(profile, type);
      const pos = findFreePosition(current.widgets, size.w, size.h, cols);
      const newWidget: Widget = {
        id: generateId(), type,
        x: pos.x, y: pos.y, w: size.w, h: size.h,
        config: defaultConfig(type),
      };
      const widgets = [...current.widgets, newWidget];
      const normalized = isLocal
        ? normalizeForProfile(widgets, profile as DashboardProfile)
        : normalizeLayout(widgets, cols);
      qc.setQueryData(queryKey, { widgets: normalized });
      if (isLocal) saveLocal(normalized);
      else saveMutation.mutate({ widgets: normalized });
    },
    [qc, queryKey, profile, cols, isLocal, saveLocal, saveMutation],
  );

  const deleteWidget = useCallback(
    (id: string) => {
      const current = qc.getQueryData<DashboardLayout>(queryKey);
      if (!current) return;
      const remaining = current.widgets.filter((w) => w.id !== id);
      const normalized = isLocal
        ? normalizeForProfile(remaining, profile as DashboardProfile)
        : normalizeLayout(remaining, cols);
      qc.setQueryData(queryKey, { widgets: normalized });
      if (isLocal) saveLocal(normalized);
      else saveMutation.mutate({ widgets: normalized });
    },
    [qc, queryKey, isLocal, profile, cols, saveLocal, saveMutation],
  );

  // TV-Editor: Liste in Reihenfolge übernehmen (Anordnung = Array-Reihenfolge,
  // Positionen werden normalisiert — keine Überlagerungen).
  const reorderWidgets = useCallback(
    (ordered: Widget[]) => {
      const normalized = isLocal
        ? normalizeForProfile(ordered, profile as DashboardProfile)
        : normalizeLayout(ordered, cols);
      qc.setQueryData(queryKey, { widgets: normalized });
      if (isLocal) saveLocal(normalized);
      else saveMutation.mutate({ widgets: normalized });
    },
    [qc, queryKey, isLocal, profile, cols, saveLocal, saveMutation],
  );

  // TV-Editor: Größe eines Widgets setzen (bereits auf Profil geklemmt).
  const setWidgetSize = useCallback(
    (id: string, w: number, h: number) => {
      resizeWidget(id, w, h);
    },
    [resizeWidget],
  );

  const updateWidgetConfig = useCallback(
    (id: string, config: Record<string, unknown>) => {
      const current = qc.getQueryData<DashboardLayout>(queryKey);
      if (!current) return;
      const widgets = current.widgets.map((w) => (w.id === id ? { ...w, config } : w));
      qc.setQueryData(queryKey, { widgets });
      if (isLocal) saveLocal(widgets);
      else saveMutation.mutate({ widgets });
    },
    [qc, queryKey, isLocal, saveLocal, saveMutation],
  );

  // Zurücksetzen: Geräteprofil → Standard-Layout neu seeden; Browser →
  // bestehender Backend-Reset (unverändert).
  const resetLayout = useCallback(async (): Promise<DashboardLayout> => {
    if (isLocal) {
      clearLocalLayout(mode as Exclude<ClientMode, 'browser'>);
      const fresh = seedLocalLayout(mode as Exclude<ClientMode, 'browser'>, profile as DashboardProfile);
      qc.setQueryData(queryKey, fresh);
      return fresh;
    }
    const res = await api.post<DashboardLayout>('/dashboard/layout/reset');
    qc.setQueryData(queryKey, res);
    return res;
  }, [isLocal, mode, profile, qc, queryKey]);

  return {
    widgets: layout?.widgets ?? [],
    isLoading,
    isError,
    isSaving: saveMutation.isPending,
    profile,
    isLocal,
    optimisticSave,
    moveWidget,
    resizeWidget,
    addWidget,
    deleteWidget,
    reorderWidgets,
    setWidgetSize,
    updateWidgetConfig,
    resetLayout,
    retry: () => qc.invalidateQueries({ queryKey }),
  };
}
