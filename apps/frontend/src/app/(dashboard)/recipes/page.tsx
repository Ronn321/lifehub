'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface RecipeSummary {
  id: string;
  title: string;
  description: string | null;
  dishTitle: string;
  sourceType: string;
  servings: number;
  prepTime: number | null;
  totalTime: number | null;
  calories: number | null;
  imageMediaId: string | null;
  ingredientCount: number;
  stepCount: number;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const token = (JSON.parse(localStorage.getItem('lifehub-auth') ?? '{}')?.state?.accessToken ?? '');
      const res = await fetch('/api/v1/recipes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = recipes
    .filter(r => {
      if (search) {
        const q = search.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          (r.description?.toLowerCase() ?? '').includes(q) ||
          r.dishTitle.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .filter(r => sourceFilter === 'all' || r.sourceType === sourceFilter);

  const sourceTypes = [...new Set(recipes.map(r => r.sourceType))];

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Rezepte</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse bg-muted rounded-lg h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Rezepte</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/recipes/create')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            + Neues Rezept
          </button>
          <button
            onClick={() => router.push('/recipes/import')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
          >
            Import
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Rezepte durchsuchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="px-4 py-2 bg-muted border border-border rounded-lg"
        >
          <option value="all">Alle Quellen</option>
          {sourceTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Recipe Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Keine Rezepte gefunden</p>
          <p className="text-sm mt-2">
            Importiere Rezepte von Chefkoch oder erstelle eigene Rezepte.
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <button
              onClick={() => router.push('/recipes/import')}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Von Chefkoch importieren
            </button>
            <button
              onClick={() => router.push('/recipes/create')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Selbst erstellen
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(recipe => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="block p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition group"
            >
              {/* Dish context */}
              {recipe.dishTitle && (
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {recipe.dishTitle}
                </span>
              )}

              {/* Recipe image */}
              <div className="relative w-full h-64 -mx-4 -mt-4 mb-3 overflow-hidden first:rounded-t-lg" style={{width: 'calc(100% + 2rem)'}}>
                <img
                  src={`/api/v1/recipes/image/${recipe.id}`}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              <h3 className="text-lg font-semibold mt-1 group-hover:text-primary transition-colors">
                {recipe.title}
              </h3>

              {recipe.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {recipe.description}
                </p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                {recipe.prepTime && (
                  <span className="flex items-center gap-1">
                    ⏱ {recipe.prepTime} Min
                  </span>
                )}
                {recipe.calories && (
                  <span>🔥 {recipe.calories} kcal</span>
                )}
                <span>🍽 {recipe.servings} Port.</span>
                {recipe.ingredientCount > 0 && (
                  <span>📋 {recipe.ingredientCount} Zut.</span>
                )}
                {recipe.stepCount > 0 && (
                  <span>📝 {recipe.stepCount} Schritte</span>
                )}
              </div>

              {/* Source badge */}
              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  recipe.sourceType === 'url'
                    ? 'bg-amber-100 text-amber-800'
                    : recipe.sourceType === 'manual'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {recipe.sourceType === 'url' ? '🌐 Web' :
                   recipe.sourceType === 'manual' ? '✍️ Manuell' :
                   recipe.sourceType === 'youtube' ? '🎬 Video' :
                   recipe.sourceType}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 text-sm text-muted-foreground text-center">
        {filtered.length} Rezepte{search ? ` für "${search}"` : ''}
        {sourceFilter !== 'all' && ` (Quelle: ${sourceFilter})`}
      </div>
    </div>
  );
}