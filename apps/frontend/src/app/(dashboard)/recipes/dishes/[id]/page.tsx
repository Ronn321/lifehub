'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  ChevronLeft, Clock, Users, ChefHat, Loader2, AlertCircle,
  BookOpen, ArrowLeftRight, FlaskConical,
} from 'lucide-react';
import Link from 'next/link';

interface DishDetail {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  caption: string | null;
  heroText: string | null;
  primaryColor: string | null;
  recipes: DishRecipe[];
}

interface DishRecipe {
  id: string;
  title: string;
  titleEn: string | null;
  variantLabel: string | null;
  effortLevel: string | null;
  containsFlags: string[] | null;
  attributes: string[] | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  calories: number | null;
  ingredientCount: number;
  stepCount: number;
}

function formatTime(minutes: number | null): string {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const FLAG_LABELS: Record<string, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarisch',
  'gluten-free': 'Glutenfrei',
  'dairy-free': 'Laktosefrei',
  halal: 'Halal',
  keto: 'Keto',
  'low-carb': 'Low Carb',
};

export default function DishDetailPage({ params }: { params: { id: string } }) {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  const { data: dish, isLoading, error } = useQuery<DishDetail>({
    queryKey: ['dish', params.id],
    queryFn: () => api.get<DishDetail>(`/recipes/dishes/${params.id}/recipes`),
    enabled: !!accessToken,
  });

  if (!accessToken) {
    router.push('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin opacity-40" />
      </div>
    );
  }

  if (error || !dish) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-zinc-400 mb-3" />
        <p className="text-zinc-500">Gericht nicht gefunden.</p>
        <button onClick={() => router.push('/recipes')} className="mt-2 text-sm text-amber-600 hover:underline">
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => router.push('/recipes')}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Alle Rezepte
      </button>

      {/* Dish Hero */}
      <div>
        <h1 className="text-4xl font-bold">{dish.title}</h1>
        {dish.titleEn && (
          <p className="text-zinc-400 text-lg">{dish.titleEn}</p>
        )}
        {dish.heroText && (
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-2xl">{dish.heroText}</p>
        )}
        <div className="mt-4 text-sm text-zinc-500">
          {dish.recipes.length} {dish.recipes.length === 1 ? 'Variante' : 'Varianten'}
        </div>
      </div>

      {/* Variant Selection: Dimension-based rows */}
      {dish.recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-500 gap-3">
          <BookOpen className="h-12 w-12 opacity-30" />
          <p>Keine Varianten für dieses Gericht</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Diet Variants */}
          <div>
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Ernährung</h3>
            <div className="flex flex-wrap gap-2">
              {dish.recipes.map((r) => {
                const isVegan = r.containsFlags?.includes('vegan');
                const isVeggie = r.containsFlags?.includes('vegetarian');
                const isKeto = r.containsFlags?.includes('keto');
                const label = isVegan ? 'Vegan' : isVeggie ? 'Vegetarisch' : isKeto ? 'Keto' : 'Klassisch';
                const selected = selectedRecipe === r.id || (!selectedRecipe && dish.recipes[0]?.id === r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecipe(r.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selected
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Effort Variants */}
          <div>
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Aufwand</h3>
            <div className="flex flex-wrap gap-2">
              {['easy', 'medium', 'hard'].map((effort) => {
                const match = dish.recipes.filter((r) => r.attributes?.includes(effort));
                if (match.length === 0) {
                  return (
                    <span key={effort}
                      className="px-4 py-2 rounded-full text-sm font-medium bg-zinc-50 dark:bg-zinc-900 text-zinc-300 dark:text-zinc-600 cursor-not-allowed line-through decoration-1"
                      title="Keine passende Variante"
                    >
                      {effort === 'easy' ? 'Einfach' : effort === 'medium' ? 'Mittel' : 'Aufwändig'}
                    </span>
                  );
                }
                const selected = match.some((r) => r.id === selectedRecipe || (!selectedRecipe && r.id === dish.recipes[0]?.id));
                return (
                  <button
                    key={effort}
                    onClick={() => {
                      if (match.length > 0) {
                        const first = match[0];
                        if (first) setSelectedRecipe(first.id);
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selected
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {effort === 'easy' ? 'Einfach' : effort === 'medium' ? 'Mittel' : 'Aufwändig'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipe Cards in a grid */}
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            {dish.recipes.map((r) => (
              <Link
                key={r.id}
                href={`/recipes/${r.id}`}
                className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:shadow-md transition-all"
              >
                <h4 className="font-semibold">{r.title}</h4>
                {r.variantLabel && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{r.variantLabel}</p>
                )}
                {r.containsFlags && r.containsFlags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.containsFlags.map((f) => (
                      <span key={f}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      >
                        {FLAG_LABELS[f] || f}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(r.totalTime || (r.prepTime || 0) + (r.cookTime || 0))}
                  </span>
                  <span className="flex items-center gap-1">
                    <FlaskConical className="h-3 w-3" />
                    {r.ingredientCount} Zutaten
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {r.servings} Port.
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
