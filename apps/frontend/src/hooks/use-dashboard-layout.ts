'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { DashboardLayout, Widget, WidgetType } from '@/lib/grid-utils';
import { findFreePosition, normalizeLayout, defaultConfig } from '@/lib/grid-utils';
import { useAuthStore } from '@/lib/auth-store';

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

  const { data: layout, isLoading, isError } = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: () => api.get<DashboardLayout>('/dashboard/layout'),
    staleTime: 60_000,
    enabled: !!accessToken,
  });

  const saveMutation = useMutation({
    mutationFn: (l: DashboardLayout) => api.put('/dashboard/layout', l),
    onMutate: async (newLayout) => {
      await qc.cancelQueries({ queryKey: ['dashboard-layout'] });
      const prev = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
      qc.setQueryData(['dashboard-layout'], newLayout);
      return { prev };
    },
    onError: (_err, _newLayout, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['dashboard-layout'], ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-layout'] });
    },
  });

  const optimisticSave = useCallback(
    (nextWidgets: Widget[]) => {
      saveMutation.mutate({ widgets: nextWidgets });
    },
    [saveMutation],
  );

  const debouncedSave = useRef(
    debounce((widgets: Widget[]) => {
      saveMutation.mutate({ widgets });
    }, 300),
  ).current;

  const moveWidget = useCallback(
    (id: string, x: number, y: number) => {
      const current = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
      if (!current) return;
      const widgets = current.widgets.map((w) =>
        w.id === id ? { ...w, x, y } : w,
      );
      const normalized = normalizeLayout(widgets, 6);
      qc.setQueryData(['dashboard-layout'], { widgets: normalized });
      saveMutation.mutate({ widgets: normalized });
    },
    [qc, saveMutation],
  );

  const resizeWidget = useCallback(
    (id: string, w: number, h: number) => {
      const current = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
      if (!current) return;
      const widgets = current.widgets.map((wgt) =>
        wgt.id === id ? { ...wgt, w, h } : wgt,
      );
      qc.setQueryData(['dashboard-layout'], { widgets });
      debouncedSave(widgets);
    },
    [qc, debouncedSave],
  );

  const addWidget = useCallback(
    (type: WidgetType) => {
      const current = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
      if (!current) return;

      const size = (() => {
        switch (type) {
          case 'media': return { w: 4, h: 2 };
          case 'weather': return { w: 3, h: 2 };
          case 'calendar': return { w: 3, h: 2 };
          case 'savings': return { w: 1, h: 1 };
        }
      })();

      const pos = findFreePosition(current.widgets, size.w, size.h, 6);

      const newWidget: Widget = {
        id: crypto.randomUUID(),
        type,
        x: pos.x,
        y: pos.y,
        w: size.w,
        h: size.h,
        config: defaultConfig(type),
      };

      const widgets = normalizeLayout([...current.widgets, newWidget], 6);
      qc.setQueryData(['dashboard-layout'], { widgets });
      saveMutation.mutate({ widgets });
    },
    [qc, saveMutation],
  );

  const deleteWidget = useCallback(
    (id: string) => {
      const current = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
      if (!current) return;
      const widgets = normalizeLayout(
        current.widgets.filter((w) => w.id !== id),
        6,
      );
      qc.setQueryData(['dashboard-layout'], { widgets });
      saveMutation.mutate({ widgets });
    },
    [qc, saveMutation],
  );

  const updateWidgetConfig = useCallback(
    (id: string, config: Record<string, unknown>) => {
      const current = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
      if (!current) return;
      const widgets = current.widgets.map((w) =>
        w.id === id ? { ...w, config } : w,
      );
      qc.setQueryData(['dashboard-layout'], { widgets });
      saveMutation.mutate({ widgets });
    },
    [qc, saveMutation],
  );

  return {
    widgets: layout?.widgets ?? [],
    isLoading,
    isError,
    isSaving: saveMutation.isPending,
    optimisticSave,
    moveWidget,
    resizeWidget,
    addWidget,
    deleteWidget,
    updateWidgetConfig,
    retry: () => qc.invalidateQueries({ queryKey: ['dashboard-layout'] }),
  };
}
