'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ChevronLeft, Clock, Users, ChefHat, Trash2, Edit3,
  Plus, Loader2, Flame, Timer, GripVertical, AlertCircle,
  FlaskConical, ListOrdered, Tag, BookOpen,
} from 'lucide-react';

interface RecipeDetail {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  dishId: string | null;
  dishTitle: string | null;
  containsFlags: string[] | null;
  attributes: string[] | null;
  variantLabel: string | null;
  effortLevel: string | null;
  sourceType: string;
  sourceUrl: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  calories: number | null;
  ingredients: Ingredient[];
  steps: Step[];
  tags: RecipeTag[];
  createdAt: string;
  updatedAt: string;
}

interface Ingredient {
  id: string;
  name: string;
  amount: string | null;
  unit: string | null;
  ord: number;
}

interface Step {
  id: string;
  instruction: string;
  ord: number;
}

interface RecipeTag {
  tagId: string;
  tagName: string;
  tagColor: string | null;
}

function pluralS(n: number, singular: string, plural: string) {
  return n === 1 ? singular : plural;
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
  'nut-free': 'Nussfrei',
  halal: 'Halal',
  keto: 'Keto',
  'low-carb': 'Low Carb',
  'high-protein': 'Proteinreich',
  spicy: 'Scharf',
  quick: 'Schnell',
};

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [tab, setTab] = useState<'ingredients' | 'steps' | 'info'>('ingredients');
  const [newIngredient, setNewIngredient] = useState({ name: '', amount: '', unit: '' });
  const [newStep, setNewStep] = useState('');
  const [error, setError] = useState('');
  const [servings, setServings] = useState<number | null>(null);
  const [isCookMode, setIsCookMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const { data: recipe, isLoading, error: loadError } = useQuery<RecipeDetail>({
    queryKey: ['recipe', id],
    queryFn: () => api.get<RecipeDetail>(`/recipes/${id}`),
  });

  const effServings = servings ?? recipe?.servings ?? 1;
  const scaleFactor = recipe ? effServings / (recipe.servings || 1) : 1;

  const addIngredientMutation = useMutation({
    mutationFn: () => api.post(`/recipes/${id}/ingredients`, {
      name: newIngredient.name,
      amount: newIngredient.amount ? parseFloat(newIngredient.amount) : null,
      unit: newIngredient.unit || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      setNewIngredient({ name: '', amount: '', unit: '' }); setError('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: (ingredientId: string) => api.delete(`/recipes/${id}/ingredients/${ingredientId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipe', id] }),
  });

  const addStepMutation = useMutation({
    mutationFn: () => api.post(`/recipes/${id}/steps`, { instruction: newStep }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      setNewStep(''); setError('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => api.delete(`/recipes/${id}/steps/${stepId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipe', id] }),
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: () => api.delete(`/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      router.push('/recipes');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (loadError || !recipe) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-zinc-400 mb-3" />
        <p className="text-zinc-500">Rezept nicht gefunden.</p>
        <button onClick={() => router.push('/recipes')} className="mt-2 text-sm text-amber-600 hover:underline">
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  // Cook Mode View
  if (isCookMode) {
    const step = recipe.steps[currentStep];
    if (!step) {
      setIsCookMode(false);
      return null;
    }
    return (
      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
        {/* Progress */}
        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / recipe.steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <span className="text-sm text-zinc-400">
            Schritt {currentStep + 1} von {recipe.steps.length}
          </span>
          <button
            onClick={() => setIsCookMode(false)}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Beenden
          </button>
        </div>

        {/* Step Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-3xl md:text-4xl font-light leading-relaxed max-w-2xl">
            {step.instruction}
          </p>
        </div>

        {/* Navigation */}
        <div className="px-6 py-8 border-t border-zinc-800">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-6 py-3 rounded-xl bg-zinc-800 text-white disabled:opacity-30 hover:bg-zinc-700 transition-colors text-lg"
            >
              ← Zurück
            </button>
            <span className="text-zinc-500 text-sm">
              {currentStep + 1}/{recipe.steps.length}
            </span>
            <button
              onClick={() => {
                if (currentStep >= recipe.steps.length - 1) {
                  setIsCookMode(false);
                } else {
                  setCurrentStep(currentStep + 1);
                }
              }}
              className="px-6 py-3 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors text-lg"
            >
              {currentStep >= recipe.steps.length - 1 ? 'Fertig!' : 'Weiter →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => router.push('/recipes')}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Zurück
        </button>
        <div className="flex items-center gap-2">
          {recipe.steps.length > 0 && (
            <button
              onClick={() => { setCurrentStep(0); setIsCookMode(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
            >
              <ChefHat className="h-4 w-4" />
              Kochen
            </button>
          )}
          <button
            onClick={() => { if (window.confirm('Wirklich löschen?')) deleteRecipeMutation.mutate(); }}
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold">{recipe.title}</h1>
        {recipe.dishTitle && (
          <p className="text-amber-600 dark:text-amber-400 mt-1">{recipe.dishTitle}</p>
        )}
        {recipe.description && (
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">{recipe.description}</p>
        )}

        {/* Flags */}
        {recipe.containsFlags && recipe.containsFlags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {recipe.containsFlags.map((flag) => (
              <span key={flag}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                {FLAG_LABELS[flag] || flag}
              </span>
            ))}
          </div>
        )}

        {/* Meta Stats */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Gesamt: {formatTime(recipe.totalTime || (recipe.prepTime || 0) + (recipe.cookTime || 0))}
            {recipe.prepTime && <span className="text-xs">(Vor: {formatTime(recipe.prepTime)})</span>}
            {recipe.cookTime && <span className="text-xs">(Koch: {formatTime(recipe.cookTime)})</span>}
          </span>
          <span className="flex items-center gap-1.5">
            <Flame className="h-4 w-4" />
            {recipe.calories ? `${recipe.calories} kcal` : '—'}
          </span>
        </div>

        {/* Servings Scaler */}
        <div className="flex items-center gap-2 mt-4">
          <Users className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-500">Portionen:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 4, 6, 8].map((n) => (
              <button
                key={n}
                onClick={() => setServings(n)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  effServings === n
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {(['ingredients', 'steps', 'info'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === t
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {t === 'ingredients' && <FlaskConical className="h-4 w-4" />}
            {t === 'steps' && <ListOrdered className="h-4 w-4" />}
            {t === 'info' && <Tag className="h-4 w-4" />}
            {t === 'ingredients' ? 'Zutaten' : t === 'steps' ? 'Schritte' : 'Informationen'}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tab: Ingredients */}
      {tab === 'ingredients' && (
        <div className="space-y-4">
          {/* Add Ingredient Form */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              placeholder="Zutat"
              value={newIngredient.name}
              onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
            />
            <input
              className="w-20 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              placeholder="Menge"
              value={newIngredient.amount}
              onChange={(e) => setNewIngredient({ ...newIngredient, amount: e.target.value })}
            />
            <input
              className="w-24 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              placeholder="Einheit"
              value={newIngredient.unit}
              onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
            />
            <button
              onClick={() => addIngredientMutation.mutate()}
              disabled={!newIngredient.name}
              className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Ingredient List */}
          {recipe.ingredients.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">Noch keine Zutaten.</p>
          ) : (
            <div className="space-y-1">
              {recipe.ingredients.map((ing) => {
                const scaledAmount = ing.amount ? (parseFloat(ing.amount) * scaleFactor).toFixed(1) : null;
                return (
                  <div
                    key={ing.id}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 group"
                  >
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{ing.name}</span>
                    <span className="text-sm text-zinc-500">
                      {scaledAmount && parseFloat(scaledAmount) !== 0
                        ? `${parseFloat(scaledAmount) % 1 === 0 ? parseInt(scaledAmount) : scaledAmount} ${ing.unit || ''}`
                        : ing.unit ? `— ${ing.unit}` : ''}
                    </span>
                    <button
                      onClick={() => deleteIngredientMutation.mutate(ing.id)}
                      className="p-1 rounded text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {servings !== null && servings !== recipe.servings && (
            <p className="text-xs text-zinc-400 italic">
              Mengen skaliert auf {servings} Portionen (×{scaleFactor.toFixed(2)})
            </p>
          )}
        </div>
      )}

      {/* Tab: Steps */}
      {tab === 'steps' && (
        <div className="space-y-4">
          {/* Add Step Form */}
          <div className="flex items-start gap-2">
            <textarea
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[60px] resize-y text-sm"
              placeholder="Neuer Schritt..."
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
            />
            <button
              onClick={() => addStepMutation.mutate()}
              disabled={!newStep.trim()}
              className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium shrink-0"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Steps List */}
          {recipe.steps.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">Noch keine Schritte.</p>
          ) : (
            <div className="space-y-3">
              {recipe.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-start gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 group"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-bold shrink-0">
                    {index + 1}
                  </span>
                  <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 pt-1">{step.instruction}</p>
                  <button
                    onClick={() => deleteStepMutation.mutate(step.id)}
                    className="p-1 rounded text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950 transition-all shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Quelle', value: recipe.sourceType === 'manual' ? 'Manuell' : recipe.sourceType },
              { label: 'Vorbereitung', value: formatTime(recipe.prepTime) },
              { label: 'Kochzeit', value: formatTime(recipe.cookTime) },
              { label: 'Gesamtzeit', value: formatTime(recipe.totalTime) },
              { label: 'Kalorien', value: recipe.calories ? `${recipe.calories} kcal` : '—' },
              { label: 'Portionen', value: `${recipe.servings}` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>

          {recipe.tags.length > 0 && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4 text-amber-500" /> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <span key={tag.tagId}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: tag.tagColor ? `${tag.tagColor}20` : undefined, color: tag.tagColor || undefined }}
                  >
                    {tag.tagName}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-400">
            Erstellt: {new Date(recipe.createdAt).toLocaleDateString('de-DE')}
            {recipe.updatedAt !== recipe.createdAt && ` · Bearbeitet: ${new Date(recipe.updatedAt).toLocaleDateString('de-DE')}`}
          </p>
        </div>
      )}
    </div>
  );
}
