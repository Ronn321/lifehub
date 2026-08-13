'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  amount: string | null;
  unit: string | null;
  note: string | null;
  ord: number;
}

interface Step {
  id: string;
  instruction: string;
  order: number;
  timerSeconds: number | null;
}

interface RecipeDetail {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  sourceType: string;
  sourceUrl: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  calories: number | null;
  effortLevel: string | null;
  imageMediaId: string | null;
  ingredients: Ingredient[];
  steps: Step[];
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(4);
  const [originalServings, setOriginalServings] = useState(4);
  const [showIngredients, setShowIngredients] = useState(true);

  useEffect(() => {
    fetchRecipe();
  }, [params.id]);

  const fetchRecipe = async () => {
    try {
      const token = (JSON.parse(localStorage.getItem('lifehub-auth') ?? '{}')?.state?.accessToken ?? '');
      const res = await fetch(`/api/v1/recipes/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecipe(data);
        setServings(data.servings ?? 4);
        setOriginalServings(data.servings ?? 4);
      }
    } catch (err) {
      console.error('Failed to fetch recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleServingsChange = async (newServings: number) => {
    if (newServings < 1 || newServings > 50) return;
    setServings(newServings);
    try {
      const token = (JSON.parse(localStorage.getItem('lifehub-auth') ?? '{}')?.state?.accessToken ?? '');
      await fetch(`/api/v1/recipes/${params.id}/servings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ servings: newServings }),
      });
      // Re-fetch to get updated ingredient amounts from backend
      const res = await fetch(`/api/v1/recipes/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecipe(data);
      }
    } catch (err) {
      console.error('Failed to update servings:', err);
    }
  };

  const scaleAmount = (amount: string | null): string => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    const factor = servings / Math.max(originalServings, 1);
    const scaled = num * factor;
    return scaled % 1 === 0 ? String(Math.round(scaled)) : scaled.toFixed(1);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg">Rezept nicht gefunden</p>
        <button onClick={() => router.push('/recipes')} className="mt-4 text-primary hover:underline">
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push('/recipes')} className="text-sm text-muted-foreground hover:text-foreground transition mb-2 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Zurück
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{recipe.title}</h1>
            {recipe.titleEn && <p className="text-lg text-muted-foreground">{recipe.titleEn}</p>}
            {recipe.description && <p className="text-muted-foreground mt-2">{recipe.description}</p>}
          </div>
          <button
            onClick={() => router.push(`/recipes/${recipe.id}/cook`)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-lg font-semibold shrink-0"
          >
            🍳 Kochen
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="mb-6 rounded-lg overflow-hidden">
        <img
          src={`/api/v1/recipes/image/${recipe.id}`}
          alt={recipe.title}
          className="w-full max-h-96 object-cover rounded-lg border border-border"
          loading="lazy"
        />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg text-sm">
        {recipe.prepTime && <span>⏱ {recipe.prepTime} Min Vorbereitung</span>}
        {recipe.cookTime && <span>🔥 {recipe.cookTime} Min Kochzeit</span>}
        {recipe.totalTime && <span>⏰ {recipe.totalTime} Min Gesamt</span>}
        {recipe.calories && <span>📊 {recipe.calories} kcal</span>}
        {recipe.effortLevel && <span>💪 {recipe.effortLevel}</span>}
        {recipe.sourceType === 'url' && recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener" className="text-primary hover:underline">
            🔗 Quelle
          </a>
        )}
      </div>

      {/* Servings */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-card border border-border rounded-lg">
        <span className="text-sm font-medium">Portionen:</span>
        <button onClick={() => handleServingsChange(servings - 1)} className="w-8 h-8 rounded-full bg-muted hover:bg-muted-foreground/20 transition text-lg">−</button>
        <span className="text-lg font-semibold min-w-[2rem] text-center">{servings}</span>
        <button onClick={() => handleServingsChange(servings + 1)} className="w-8 h-8 rounded-full bg-muted hover:bg-muted-foreground/20 transition text-lg">+</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-6">
        <button onClick={() => setShowIngredients(true)}
          className={`pb-2 px-1 border-b-2 transition ${showIngredients ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Zutaten
        </button>
        <button onClick={() => setShowIngredients(false)}
          className={`pb-2 px-1 border-b-2 transition ${!showIngredients ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Zubereitung
        </button>
      </div>

      {/* Ingredients */}
      {showIngredients && (
        <div className="space-y-3 mb-8">
          {recipe.ingredients.length === 0 ? (
            <p className="text-muted-foreground">Keine Zutaten</p>
          ) : (
            (() => {
              const groups = new Map<string, Ingredient[]>();
              for (const ing of recipe.ingredients) {
                const gIdx = Math.floor((ing.ord || 0) / 100);
                const groupName = ing.note || (gIdx === 0 ? 'Zutaten' : `Gruppe ${gIdx}`);
                if (!groups.has(groupName)) groups.set(groupName, []);
                groups.get(groupName)!.push(ing);
              }
              return Array.from(groups).map(([groupName, ings]) => (
                <div key={groupName}>
                  {groupName !== 'Zutaten' && (
                    <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 mt-4">
                      {groupName.startsWith('Zutaten') ? groupName : `Zutaten für ${groupName}`}
                    </h3>
                  )}
                  <ul className="space-y-2">
                    {ings.map(ing => (
                      <li key={ing.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded transition">
                        <span className="w-20 text-right text-sm font-mono text-muted-foreground">{scaleAmount(ing.amount)}</span>
                        <span className="w-14 text-sm text-muted-foreground">{ing.unit ?? ''}</span>
                        <span className="flex-1">{ing.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ));
            })()
          )}
        </div>
      )}

      {/* Steps */}
      {!showIngredients && (
        <div className="space-y-6 mb-8">
          {recipe.steps.length === 0 ? (
            <p className="text-muted-foreground">Keine Schritte</p>
          ) : (
            recipe.steps.map((step, index) => (
              <div key={step.id} className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </span>
                  <p className="flex-1">{step.instruction}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
