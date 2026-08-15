'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ImportResult {
  jobId: string;
  status: 'pending' | 'fetching' | 'parsing' | 'normalizing' | 'draft' | 'failed';
  recipe?: {
    title: string;
    description: string | null;
    ingredients: Array<{
      rawText: string;
      amount: string | null;
      unit: string | null;
      name: string | null;
      group: string | null;
      groupOrder: number | null;
    }>;
    steps: Array<{
      order: number;
      instruction: string;
    }>;
    servings: number | null;
    prepTime: number | null;
    cookTime: number | null;
    totalTime: number | null;
    calories: number | null;
    imageUrls: string[];
  };
  errors?: string[];
  warnings?: string[];
}

export default function RecipeImportPage() {
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<'raw' | 'normalized' | 'enhanced'>('normalized');
  const router = useRouter();

  const handleImport = async () => {
    if (!url.trim()) return;

    setImporting(true);
    setResult(null);

    try {
      const auth = JSON.parse(localStorage.getItem('lifehub-auth') ?? '{}');
      const token = auth?.state?.accessToken ?? '';
      const res = await fetch('/api/v1/recipes/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim(), mode }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        jobId: 'error',
        status: 'failed',
        errors: [(err as Error).message],
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rezept importieren</h1>
      <p className="text-muted-foreground mb-6">
        Füge eine Chefkoch-URL ein, um das Rezept automatisch zu importieren
      </p>

      {/* URL Input */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <label className="block text-sm font-medium mb-2">Rezept-URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://www.chefkoch.de/rezepte/273601104676092/Blumenkohlauflauf.html"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleImport()}
            className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
          />
          <button
            onClick={handleImport}
            disabled={importing || !url.trim()}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {importing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Importiere...
              </span>
            ) : (
              'Importieren'
            )}
          </button>
        </div>

        {/* Mode selector */}
        <div className="mt-3 flex gap-2">
          {(['raw', 'normalized', 'enhanced'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs px-3 py-1 rounded-full transition ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
              }`}
            >
              {m === 'raw' ? 'Roh' : m === 'normalized' ? 'Normalisiert' : 'Erweitert'}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {importing && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6 text-center">
          <div className="animate-pulse">
            <p className="text-lg font-medium">Rezept wird importiert...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Lade HTML, extrahiere Daten, normalisiere Zutaten...
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {result?.status === 'failed' && result.errors && (
        <div className="border border-danger/30 bg-danger/10 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-fg mb-2">
            Import fehlgeschlagen
          </h3>
          <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          <p className="text-sm text-red-600 mt-3">
            Bitte überprüfe die URL und versuche es erneut.
          </p>
        </div>
      )}

      {/* Draft Preview */}
      {result?.status === 'draft' && result.recipe && (
        <div className="border border-success/30 bg-success/10 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-fg">
              ✅ Rezept erkannt
            </h3>
            {result.warnings && result.warnings.length > 0 && (
              <span className="text-xs bg-warning/15 text-fg-muted px-2 py-1 rounded-full">
                {result.warnings.length} Warnungen
              </span>
            )}
          </div>

          {/* Recipe Summary */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{result.recipe.title}</h2>
              {result.recipe.description && (
                <p className="text-muted-foreground mt-1">{result.recipe.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {result.recipe.servings && <span>🍽 {result.recipe.servings} Portionen</span>}
              {result.recipe.prepTime && <span>⏱ {result.recipe.prepTime} Min Vorbereitung</span>}
              {result.recipe.cookTime && <span>🔥 {result.recipe.cookTime} Min Kochzeit</span>}
              {result.recipe.totalTime && <span>⏰ {result.recipe.totalTime} Min Gesamt</span>}
              {result.recipe.calories && <span>📊 {result.recipe.calories} kcal</span>}
            </div>

            {/* Ingredients */}
            <div>
              <h4 className="font-semibold mb-2">
                Zutaten ({result.recipe.ingredients.length})
              </h4>
              {Object.entries(
                (result.recipe.ingredients || []).reduce((acc, ing) => {
                  const key = ing.group || '';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(ing);
                  return acc;
                }, {} as Record<string, typeof result.recipe.ingredients>)
              ).map(([groupName, ings]) => (
                <div key={groupName} className="mb-4">
                  {groupName && (
                    <h4 className="font-semibold text-amber-600 dark:text-amber-400 mt-3 mb-2">
                      Zutaten für {groupName}
                    </h4>
                  )}
                  <ul className="space-y-1 text-sm">
                    {(ings || []).map((ing, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground">
                          {ing.amount && ing.unit
                            ? `${ing.amount} ${ing.unit}`
                            : ing.rawText}
                        </span>
                        <span>{ing.name ?? ing.rawText}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Steps */}
            <div>
              <h4 className="font-semibold mb-2">
                Zubereitung ({result.recipe.steps.length} Schritte)
              </h4>
              <ol className="space-y-1 text-sm list-decimal list-inside">
                {result.recipe.steps.slice(0, 3).map((step, i) => (
                  <li key={i}>{step.instruction}</li>
                ))}
                {result.recipe.steps.length > 3 && (
                  <li className="text-muted-foreground italic">
                    ... und {result.recipe.steps.length - 3} weitere Schritte
                  </li>
                )}
              </ol>
            </div>

            {/* Image URLs */}
            {result.recipe.imageUrls.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">
                  🖼 {result.recipe.imageUrls.length} Bild(er) gefunden
                </p>
              </div>
            )}
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-1">Warnungen:</p>
              <ul className="list-disc list-inside text-xs text-yellow-700 space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={async () => {
                if (!result?.recipe) return;
                try {
                  const auth = JSON.parse(localStorage.getItem('lifehub-auth') ?? '{}');
                  const token = auth?.state?.accessToken ?? '';
                  const res = await fetch('/api/v1/recipes/import/confirm', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ recipe: result.recipe }),
                  });
                  if (res.ok) {
                    router.push('/recipes');
                  } else {
                    const err = await res.json();
                    alert('Fehler beim Speichern: ' + (err.message || 'Unbekannter Fehler'));
                  }
                } catch (err) {
                  alert('Fehler: ' + (err as Error).message);
                }
              }}
              className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
            >
              Rezept übernehmen
            </button>
            <button
              onClick={() => setResult(null)}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted-foreground/20 transition"
            >
              Verwerfen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}