import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        <h1 className="text-6xl font-semibold tracking-tight">
          Life<span className="text-brand-500">Hub</span>
        </h1>
        <p className="text-lg text-fg-muted">
          Private self-hosted family operating system.
        </p>
        <p className="text-sm text-fg-subtle">
          Phase 0 · Core Foundation
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="rounded-md bg-brand-500 px-6 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-brand-400"
          >
            Anmelden
          </Link>
          <a
            href="http://localhost:3001/api/docs"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border-strong px-6 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-bg-raised"
          >
            API Docs
          </a>
        </div>
      </div>
    </main>
  );
}
