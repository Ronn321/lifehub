'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, RotateCcw } from 'lucide-react';
import type { DashboardLayout } from '@/lib/grid-utils';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { WidgetAddButton } from '@/components/dashboard/widget-add-button';
import { WidgetEditorDialog } from '@/components/dashboard/widget-editor-dialog';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { useGridStore } from '@/stores/grid-store';
import { useClientModeStore } from '@/lib/client-mode';

export default function DashboardPage() {
  const router = useRouter();
  const { user, clear, accessToken } = useAuthStore();
  const qc = useQueryClient();
  const mode = useClientModeStore((s) => s.mode);
  const editMode = useGridStore((s) => s.editMode);
  const setEditMode = useGridStore((s) => s.setEditMode);
  const [tvEditorOpen, setTvEditorOpen] = useState(false);
  const {
    widgets, isLoading, isError, isSaving,
    profile, isLocal,
    addWidget, deleteWidget, updateWidgetConfig, optimisticSave,
    reorderWidgets, setWidgetSize, resetLayout, retry,
  } = useDashboardLayout();

  useEffect(() => {
    if (!accessToken) router.push('/login');
    // Browser = immer editierbar (bisheriges Verhalten); Geräte starten im Lesemodus.
    setEditMode(mode === 'browser');
  }, [accessToken, router, mode, setEditMode]);

  const handleLogout = useCallback(() => { clear(); router.push('/login'); }, [clear, router]);

  if (!user) return null;

  const isTv = mode === 'tv';
  const showEditToggle = mode !== 'browser';

  return (
    <main className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Hallo, {user.displayName}</h1>
        </div>
        <div className="flex items-center gap-3">
          {showEditToggle && !isTv && (
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-sm hover:bg-bg-raised"
            >
              <Pencil className="h-4 w-4" />
              {editMode ? 'Fertig' : 'Bearbeiten'}
            </button>
          )}
          {isTv && (
            <button
              onClick={() => setTvEditorOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-sm hover:bg-bg-raised"
            >
              <Pencil className="h-4 w-4" />
              Widgets verwalten
            </button>
          )}
          {isLocal && (
            <button
              onClick={() => void resetLayout()}
              className="flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-sm hover:bg-bg-raised"
              title="Standard-Layout dieses Geräts wiederherstellen"
            >
              <RotateCcw className="h-4 w-4" />
              Zurücksetzen
            </button>
          )}
          <WidgetAddButton onAdd={addWidget} visible={mode === 'browser' || editMode} />
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
          <button onClick={() => void retry()} className="rounded-md bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600">
            Erneut versuchen
          </button>
        </div>
      ) : widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-fg-muted gap-3">
          <p className="text-lg">Noch keine Widgets konfiguriert</p>
          <button
            onClick={async () => {
              if (isLocal) {
                await resetLayout();
              } else {
                const res = await api.post<DashboardLayout>('/dashboard/layout/reset');
                qc.setQueryData(['dashboard-layout', 'browser'], res);
              }
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
          editMode={editMode}
          profile={profile}
        />
      )}

      {isTv && (
        <WidgetEditorDialog
          open={tvEditorOpen}
          onClose={() => setTvEditorOpen(false)}
          widgets={widgets}
          profile={profile}
          onReorder={reorderWidgets}
          onDelete={deleteWidget}
          onSetSize={setWidgetSize}
          onAdd={addWidget}
          onReset={() => void resetLayout()}
        />
      )}
    </main>
  );
}
