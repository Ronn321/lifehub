'use client';

import { ErrorState } from '@/components/ui/lifehub';

// Route error boundary (UI-014): keeps 500s from rendering as empty states.
export default function FinanceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-8">
      <ErrorState title="Seite konnte nicht geladen werden" message={error.message} onRetry={reset} />
    </div>
  );
}
