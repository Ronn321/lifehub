'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Plus, Clock, ChefHat, Trash2, MoreHorizontal,
  ChevronLeft, Loader2, ListOrdered, Tags, Users,
} from 'lucide-react';

interface RecipeItem {
  id: string;
  title: string;
  description: string | null;
  sourceType: string;
  sourceUrl: string | null;
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

interface IngredientItem {
  id: string;
  recipeId: string;
  name: string;
  amount: string | null;
  unit: string | null;
  order: number;
}

interface StepItem {
  id: string;
  recipeId: string;
  instruction: string;
  order: number;
}

interface TagItem {
  id: string;
  recipeId: string;
  tagId: string;
}

interface RecipeDetail extends RecipeItem {
  ingredients: IngredientItem[];
  steps: StepItem[];
  tags: TagItem[];
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Eigenes Rezept', url: 'Webseite', youtube: 'YouTube', pdf: 'PDF', book: 'Buch',
};

const SOURCE_ICONS: Record<string, string> = {
  manual: '📝', url: '🌐', youtube: '▶️', pdf: '📄', book: '📖',
};

function formatMinutes(min: number | null) {
  if (min == null) return '–';
  if (min < 60) return `${min} Min.`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/* ─── Recipe Dialog (Create) ─── */
function RecipeDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState('manual');
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<RecipeItem>('/recipes', {
      title, description: description || undefined,
      sourceType, servings,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
    }),
    onSuccess: () => {
      setTitle(''); setDescription(''); setSourceType('manual');
      setServings(4); setPrepTime(''); setCookTime(''); setError('');
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
            <label className="block text-sm text-muted-foreground mb-1">Titel</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="z.B. Spaghetti Carbonara"
              value={title} onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Beschreibung (optional)</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] resize-y"
              placeholder="Kurze Beschreibung..."
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Quelle</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={sourceType} onChange={(e) => setSourceType(e.target.value)}
              >
                <option value="manual">Eigenes Rezept</option>
                <option value="url">Webseite</option>
                <option value="youtube">YouTube</option>
                <option value="pdf">PDF</option>
                <option value="book">Buch</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Portionen</label>
              <input type="number" min={1} max={50}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={servings} onChange={(e) => setServings(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Vorbereitungszeit (Min.)</label>
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

/* ─── Recipe Card ─── */
function RecipeCard({ recipe, onClick, onDelete }: {
  recipe: RecipeItem; onClick: () => void; onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-all cursor-pointer overflow-hidden relative group"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{SOURCE_ICONS[recipe.sourceType] ?? '📝'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                {SOURCE_LABELS[recipe.sourceType] ?? recipe.sourceType}
              </span>
            </div>
            <h3 className="text-lg font-semibold truncate pr-2">{recipe.title}</h3>
            {recipe.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{recipe.description}</p>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Löschen
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {recipe.totalTime != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatMinutes(recipe.totalTime)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {recipe.servings} Portionen
          </span>
          <span className="flex items-center gap-1">
            <ListOrdered className="h-3.5 w-3.5" />
            {recipe.ingredientCount} Zutaten
          </span>
          <span className="flex items-center gap-1">
            <ChefHat className="h-3.5 w-3.5" />
            {recipe.stepCount} Schritte
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Recipe Detail View ─── */
function RecipeDetailView({ recipeId, onBack }: { recipeId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'ingredients' | 'steps' | 'tags' | 'cook'>('overview');
  const [servingsSlider, setServingsSlider] = useState<number | null>(null);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientAmount, setNewIngredientAmount] = useState('');
  const [newIngredientUnit, setNewIngredientUnit] = useState('');
  const [newStepInstruction, setNewStepInstruction] = useState('');
  const [detailError, setDetailError] = useState('');

  const { data: recipe, isLoading, error } = useQuery<RecipeDetail>({
    queryKey: ['recipe', recipeId],
    queryFn: () => api.get<RecipeDetail>(`/recipes/${recipeId}`),
  });

  const currentServings = servingsSlider ?? recipe?.servings ?? 0;
  const scaleFactor = recipe ? currentServings / (recipe.servings || 1) : 1;

  const addIngredientMutation = useMutation({
    mutationFn: () => api.post(`/recipes/${recipeId}/ingredients`, {
      name: newIngredientName,
      amount: newIngredientAmount ? parseFloat(newIngredientAmount) : undefined,
      unit: newIngredientUnit || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      setNewIngredientName(''); setNewIngredientAmount(''); setNewIngredientUnit(''); setDetailError('');
    },
    onError: (err) => setDetailError(err instanceof Error ? err.message : 'Fehler'),
  });

  const addStepMutation = useMutation({
    mutationFn: () => api.post(`/recipes/${recipeId}/steps`, {
      instruction: newStepInstruction,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      setNewStepInstruction(''); setDetailError('');
    },
    onError: (err) => setDetailError(err instanceof Error ? err.message : 'Fehler'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/recipes/${recipeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onBack();
    },
    onError: (err) => setDetailError(err instanceof Error ? err.message : 'Fehler'),
  });

  const updateServingsMutation = useMutation({
    mutationFn: (servings: number) => api.put<RecipeDetail>(`/recipes/${recipeId}/servings`, { servings }),
    onSuccess: (data: RecipeDetail) => {
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setServingsSlider(null);
    },
    onError: (err) => setDetailError(err instanceof Error ? err.message : 'Fehler'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Rezept nicht gefunden.</p>
        <button onClick={onBack} className="mt-2 text-sm text-amber-600 hover:underline">
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  const scaledAmount = (amount: string | null) => {
    if (amount == null) return null;
    const num = parseFloat(amount);
    if (isNaN(num)) return null;
    return Math.round(num * scaleFactor * 100) / 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-2 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Zurück
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{SOURCE_ICONS[recipe.sourceType] ?? '📝'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
              {SOURCE_LABELS[recipe.sourceType] ?? recipe.sourceType}
            </span>
          </div>
          <h2 className="text-2xl font-bold">{recipe.title}</h2>
          {recipe.description && (
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">{recipe.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {recipe.totalTime != null && (
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatMinutes(recipe.totalTime)}</span>
            )}
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {recipe.servings} Portionen</span>
            {recipe.calories != null && <span>ca. {recipe.calories} kcal</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (window.confirm('Wirklich löschen?')) deleteMutation.mutate(); }}
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        {(['overview', 'ingredients', 'steps', 'cook'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {t === 'overview' ? 'Übersicht' :
             t === 'ingredients' ? 'Zutaten' :
             t === 'steps' ? 'Schritte' : 'Kochen'}
          </button>
        ))}
      </div>

      {detailError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {detailError}
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Vorbereitung', value: formatMinutes(recipe.prepTime), icon: Clock },
              { label: 'Kochzeit', value: formatMinutes(recipe.cookTime), icon: ChefHat },
              { label: 'Gesamtzeit', value: formatMinutes(recipe.totalTime), icon: Clock },
              { label: 'Portionen', value: recipe.servings, icon: Users },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <span className="flex items-center gap-1 text-sm text-zinc-500 mb-2">
                  <stat.icon className="h-4 w-4" /> {stat.label}
                </span>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><ListOrdered className="h-4 w-4" /> Zutaten</h3>
            {recipe.ingredients.length === 0 ? (
              <p className="text-sm text-zinc-500">Noch keine Zutaten.</p>
            ) : (
              <ul className="space-y-1.5">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.id} className="text-sm flex items-center gap-2">
                    <span className="w-16 text-right font-medium tabular-nums">
                      {scaledAmount(ing.amount) != null ? `${scaledAmount(ing.amount)}` : ''}
                    </span>
                    <span className="w-12 text-zinc-500">{ing.unit ?? ''}</span>
                    <span>{ing.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><ChefHat className="h-4 w-4" /> Schritte</h3>
            {recipe.steps.length === 0 ? (
              <p className="text-sm text-zinc-500">Noch keine Schritte.</p>
            ) : (
              <ol className="space-y-3">
                {recipe.steps.map((step) => (
                  <li key={step.id} className="flex gap-3 text-sm">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0 mt-0.5">
                      {step.order + 1}
                    </span>
                    <span className="whitespace-pre-wrap">{step.instruction}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {tab === 'ingredients' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            {/* Portion Slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Portionen: <span className="text-amber-600 font-bold">{currentServings}</span>
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={50}
                  className="flex-1 accent-amber-600"
                  value={currentServings}
                  onChange={(e) => setServingsSlider(parseInt(e.target.value))}
                />
                <button
                  onClick={() => updateServingsMutation.mutate(currentServings)}
                  disabled={servingsSlider == null || currentServings === recipe.servings}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium"
                >
                  Übernehmen
                </button>
              </div>
            </div>

            <h3 className="font-semibold mb-3">Zutaten</h3>
            <div className="flex items-center gap-2 mb-4">
              <input placeholder="Menge"
                className="w-20 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={newIngredientAmount} onChange={(e) => setNewIngredientAmount(e.target.value)}
              />
              <input placeholder="Einheit"
                className="w-24 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={newIngredientUnit} onChange={(e) => setNewIngredientUnit(e.target.value)}
              />
              <input placeholder="Zutat"
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={newIngredientName} onChange={(e) => setNewIngredientName(e.target.value)}
              />
              <button
                onClick={() => addIngredientMutation.mutate()}
                disabled={!newIngredientName}
                className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {recipe.ingredients.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">Noch keine Zutaten hinzugefügt.</p>
            )}
            <div className="space-y-1.5">
              {recipe.ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm">
                  <span className="w-16 text-right font-medium tabular-nums">
                    {scaledAmount(ing.amount) != null ? `${scaledAmount(ing.amount)}` : '–'}
                  </span>
                  <span className="w-16 text-zinc-500">{ing.unit ?? ''}</span>
                  <span className="flex-1">{ing.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'steps' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="font-semibold mb-3">Schritte</h3>
            <div className="flex items-start gap-2 mb-4">
              <textarea
                placeholder="Schrittbeschreibung (Markdown)..."
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[60px] resize-y"
                value={newStepInstruction} onChange={(e) => setNewStepInstruction(e.target.value)}
              />
              <button
                onClick={() => addStepMutation.mutate()}
                disabled={!newStepInstruction}
                className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {recipe.steps.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">Noch keine Schritte hinzugefügt.</p>
            )}
            <ol className="space-y-3">
              {recipe.steps.map((step) => (
                <li key={step.id} className="flex gap-3 text-sm p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0 mt-0.5">
                    {step.order + 1}
                  </span>
                  <span className="whitespace-pre-wrap">{step.instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {tab === 'cook' && (
        <div className="space-y-6">
          {/* Kochmodus: vereinfachte Ansicht */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
            <h3 className="font-semibold text-lg mb-1">{recipe.title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {recipe.servings} Portionen | {formatMinutes(recipe.totalTime ?? 0)}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <ListOrdered className="h-4 w-4" /> Zutaten ({recipe.ingredients.length})
            </h4>
            {recipe.ingredients.length === 0 ? (
              <p className="text-sm text-zinc-500">Keine Zutaten.</p>
            ) : (
              <ul className="space-y-1.5">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.id} className="text-sm flex items-center gap-2">
                    <span className="w-16 text-right font-medium tabular-nums">
                      {scaledAmount(ing.amount) != null ? `${scaledAmount(ing.amount)}` : ''}
                    </span>
                    <span className="w-12 text-zinc-500">{ing.unit ?? ''}</span>
                    <span>{ing.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <ChefHat className="h-4 w-4" /> Zubereitung ({recipe.steps.length} Schritte)
            </h4>
            {recipe.steps.length === 0 ? (
              <p className="text-sm text-zinc-500">Keine Schritte.</p>
            ) : (
              <ol className="space-y-4">
                {recipe.steps.map((step, i) => (
                  <li key={step.id} className="flex gap-3 text-sm">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 whitespace-pre-wrap">{step.instruction}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecipesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [search, setSearch] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: recipes, isLoading, error } = useQuery<RecipeItem[]>({
    queryKey: ['recipes'],
    queryFn: () => api.get<RecipeItem[]>('/recipes'),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (!accessToken) router.push('/login');
  }, [accessToken, router]);

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (selectedRecipeId) {
    return <RecipeDetailView recipeId={selectedRecipeId} onBack={() => setSelectedRecipeId(null)} />;
  }

  const filteredRecipes = recipes?.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rezepte</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Deine persönliche Rezeptsammlung
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Neues Rezept
        </button>
      </div>

      <div className="relative">
        <input
          placeholder="Rezept suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 pl-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 animate-pulse">
              <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
              <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
              <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-500">Fehler beim Laden der Rezepte.</p>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['recipes'] })} className="mt-2 text-sm text-amber-600 hover:underline">
            Erneut versuchen
          </button>
        </div>
      )}

      {recipes && filteredRecipes?.length === 0 && (
        <div className="text-center py-16">
          <ChefHat className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium mb-2">Noch keine Rezepte</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            Lege dein erstes Rezept an und sammle deine Lieblingsgerichte.
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Erstes Rezept anlegen
          </button>
        </div>
      )}

      {recipes && filteredRecipes && filteredRecipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelectedRecipeId(recipe.id)}
              onDelete={async () => {
                await api.delete(`/recipes/${recipe.id}`);
                queryClient.invalidateQueries({ queryKey: ['recipes'] });
              }}
            />
          ))}
        </div>
      )}

      <RecipeDialog open={dialogOpen} onClose={() => setDialogOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['recipes'] })}
      />
    </div>
  );
}
