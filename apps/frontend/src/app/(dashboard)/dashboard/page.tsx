'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { DashboardLayout } from '@/lib/grid-utils';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { WidgetAddButton } from '@/components/dashboard/widget-add-button';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';

export default function DashboardPage() {
  const router = useRouter();
  const { user, clear, accessToken } = useAuthStore();
  const qc = useQueryClient();
  const {
    widgets,
    isLoading,
    isError,
    isSaving,
    addWidget,
    deleteWidget,
    updateWidgetConfig,
    optimisticSave,
    retry,
  } = useDashboardLayout();

  useEffect(() => {
    if (!accessToken) router.push('/login');
  }, [accessToken, router]);

  const handleLogout = useCallback(() => {
    clear();
    router.push('/login');
  }, [clear, router]);

  if (!user) return null;

  return (
    <main className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Hallo, {user.displayName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <WidgetAddButton onAdd={addWidget} />
          <button
            onClick={handleLogout}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm hover:bg-bg-raised"
          >
            Abmelden
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin opacity-40" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-64 text-fg-muted gap-3">
          <p className="text-lg">Layout konnte nicht geladen werden</p>
          <button
            onClick={retry}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
          >
            Erneut versuchen
          </button>
        </div>
      ) : widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-fg-muted gap-3">
          <p className="text-lg">Noch keine Widgets konfiguriert</p>
          <button
            onClick={async () => {
              const res = await api.post<DashboardLayout>('/dashboard/layout/reset');
              qc.setQueryData(['dashboard-layout'], res);
            }}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
          >
            Standard-Layout laden
          </button>
        </div>
      ) : (
        <DashboardGrid
          widgets={widgets}
          onLayoutChange={optimisticSave}
          onDelete={deleteWidget}
          onConfigChange={updateWidgetConfig}
          isSaving={isSaving}
        />
      )}
    </main>
  );
}
