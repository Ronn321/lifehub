'use client';

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Loader2, FileX2 } from 'lucide-react';

interface PageData {
  id: string;
  title: string;
}

function PageSlugInner({ slug }: { slug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPage() {
      try {
        // Try by-slug first (clean URL like /pages/my-slug)
        const page = await api.get<PageData>(`/pages/by-slug/${encodeURIComponent(slug)}`);
        if (!cancelled && page?.id) {
          router.push(`/pages?open=${page.id}`);
          return;
        }
      } catch {
        // by-slug failed — try as ID (legacy UUID links from sidebar)
        try {
          const page = await api.get<PageData>(`/pages/${encodeURIComponent(slug)}`);
          if (!cancelled && page?.id) {
            router.push(`/pages?open=${page.id}`);
            return;
          }
        } catch (err2) {
          if (!cancelled) {
            setError(err2 instanceof Error ? err2.message : 'Seite nicht gefunden');
          }
        }
        if (!cancelled) {
          setError('Seite nicht gefunden');
        }
      }
    }

    fetchPage();

    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <FileX2 className="h-16 w-16 text-zinc-300 dark:text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          Seite nicht gefunden
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-md">
          {error}
        </p>
        <Link
          href="/pages"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
        >
          Zurück zu den Seiten
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Lade Seite...</p>
      </div>
    </div>
  );
}

export default function PageSlugPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <PageSlugInner slug={params.slug} />
    </Suspense>
  );
}
