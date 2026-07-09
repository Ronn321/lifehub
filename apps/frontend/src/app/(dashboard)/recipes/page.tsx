'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Plus, BookOpen, Clock, Users, Trash2, MoreHorizontal,
  ChevronRight, Loader2, ChefHat, Search, AlertCircle,
} from 'lucide-react';

interface RecipeListItem {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  dishId: string | null;
  dishTitle: string | null;
  containsFlags: string[] | null;
  attributes: string[] | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  calories: number | null;
  imageMediaId: string | null;
  ingredientCount: number;
  stepCount: number;
  createdAt: string;
}

interface DishItem {
  id: string;
  title: string;
  titleEn: string | null;
  recipeCount?: number;
}

function pluralS(n: number, singular: string, plural: string) {
  return n === 1 ? singular : plural;
}

function formatTime(minutes: number | null): string {
  if (!minutes) return '';
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
  'nut-free': 'Nussfrei',
  halal: 'Halal',
  keto: 'Keto',
  'low-carb': 'Low Carb',
  'high-protein': 'Proteinreich',
  spicy: 'Scharf',
  quick: 'Schnell',
};

function RecipeCreateDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dishTitle, setDishTitle] = useState('');
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [calories, setCalories] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<RecipeListItem>('/recipes', {
      title, description: description || undefined,
      servings, prepTime: prepTime ? parseInt(prepTime) : null,
      cookTime: cookTime ? parseInt(cookTime) : null,
      calories: calories ? parseInt(calories) : null,
      dishTitle: dishTitle || undefined,
    }),
    onSuccess: () => {
      setTitle(''); setDescription(''); setDishTitle(''); setServings(4);
      setPrepTime(''); setCookTime(''); setCalories(''); setError('');
      onSuccess(); onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Neues Rezept</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Titel *</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="z.B. Cremige Pasta Carbonara"
              value={title} onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Beschreibung</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] resize-y"
              placeholder="Kurze Beschreibung..."
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Gericht (Dish)</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="z.B. Pasta Carbonara"
              value={dishTitle} onChange={(e) => setDishTitle(e.target.value)}
            />
            <p className="text-xs text-zinc-500 mt-1">Ein neues Gericht wird automatisch angelegt</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Portionen</label>
              <input type="number" min={1} max={50}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={servings} onChange={(e) => setServings(parseInt(e.target.value) || 4)}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Vorbereitung (Min.)</label>
              <input type="number"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={prepTime} onChange={(e) => setPrepTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Kochzeit (Min.)</label>
              <input type="number"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={cookTime} onChange={(e) => setCookTime(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={() => mutation.mutate()}
            disabled={!title || mutation.isPending}
            className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Rezept anlegen
          </button>
        </div>
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onClick }: { recipe: RecipeListItem; onClick: () => void }) {
  return (
    <div
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-all cursor-pointer overflow-hidden group"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">{recipe.title}</h3>
            {recipe.dishTitle && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">{recipe.dishTitle}</p>
            )}
            {recipe.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{recipe.description}</p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {recipe.containsFlags && recipe.containsFlags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {recipe.containsFlags.map((flag) => (
              <span key={flag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                {FLAG_LABELS[flag] || flag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {(recipe.prepTime || recipe.cookTime) && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(recipe.totalTime || (recipe.prepTime || 0) + (recipe.cookTime || 0))}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {recipe.servings} {pluralS(recipe.servings, 'Portion', 'Portionen')}
          </span>
          <span className="flex items-center gap-1">
            <ChefHat className="h-3.5 w-3.5" />
            {recipe.ingredientCount} {pluralS(recipe.ingredientCount, 'Zutat', 'Zutaten')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const { data: recipes, isLoading, error } = useQuery<RecipeListItem[]>({
    queryKey: ['recipes'],
    queryFn: () => api.get<RecipeListItem[]>('/recipes'),
  });

  const { data: dishes } = useQuery<DishItem[]>({
    queryKey: ['recipes-dishes'],
    queryFn: () => api.get<DishItem[]>('/recipes/dishes'),
  });

  const filtered = recipes?.filter((r) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.dishTitle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-amber-500" />
            Rezepte
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {dishes && <>{dishes.length} Gerichte</>}
            {recipes && <> · {recipes.length} Rezepte</>}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          Neues Rezept
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          placeholder="Rezepte durchsuchen..."
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Dishes Overview */}
      {dishes && dishes.length > 0 && !search && (
        <div className="flex flex-wrap gap-2">
          {dishes.map((dish: DishItem) => (
            <button
              key={dish.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
              onClick={() => {
                setSearch(dish.title);
              }}
            >
              {dish.title}
              <span className="text-xs text-zinc-400">({dish.recipeCount ?? 0})</span>
            </button>
          ))}
        </div>
      )}

      {/* Recipe List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin opacity-40" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-3">
          <AlertCircle className="h-8 w-8" />
          <p>Rezepte konnten nicht geladen werden</p>
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-3">
          <BookOpen className="h-12 w-12 opacity-30" />
          <p className="text-lg">Keine Rezepte gefunden</p>
          {search ? (
            <p className="text-sm">Keine Ergebnisse für &quot;{search}&quot;</p>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm text-white font-medium"
            >
              Erstes Rezept anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => router.push(`/recipes/${recipe.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <RecipeCreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['recipes'] });
          queryClient.invalidateQueries({ queryKey: ['recipes-dishes'] });
        }}
      />
    </div>
  );
}
