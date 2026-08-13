'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface IngredientInput {
  name: string;
  amount: string;
  unit: string;
  note: string;
}

interface StepInput {
  instruction: string;
  timerSeconds: string;
}

export default function CreateRecipePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [effortLevel, setEffortLevel] = useState('medium');
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { name: '', amount: '', unit: '', note: '' },
  ]);
  const [steps, setSteps] = useState<StepInput[]>([
    { instruction: '', timerSeconds: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: '', amount: '', unit: '', note: '' }]);
  };

  const updateIngredient = (index: number, field: keyof IngredientInput, value: string) => {
    setIngredients(prev =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
    );
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addStep = () => {
    setSteps(prev => [...prev, { instruction: '', timerSeconds: '' }]);
  };

  const updateStep = (index: number, field: keyof StepInput, value: string) => {
    setSteps(prev =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    );
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Bitte einen Titel eingeben');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = (JSON.parse(localStorage.getItem('lifehub-auth') ?? '{}')?.state?.accessToken ?? '');

      // 1. Create recipe
      const res = await fetch('/api/v1/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          servings,
          prepTime: prepTime ? parseInt(prepTime) : undefined,
          cookTime: cookTime ? parseInt(cookTime) : undefined,
          effortLevel,
          sourceType: 'manual',
        }),
      });

      if (!res.ok) throw new Error('Failed to create recipe');

      const recipe = await res.json();

      // 2. Add ingredients
      for (const ing of ingredients) {
        if (!ing.name.trim()) continue;
        await fetch(`/api/v1/recipes/${recipe.id}/ingredients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: ing.name.trim(),
            amount: ing.amount ? parseFloat(ing.amount) : undefined,
            unit: ing.unit.trim() || undefined,
            note: ing.note.trim() || undefined,
          }),
        });
      }

      // 3. Add steps
      for (const step of steps) {
        if (!step.instruction.trim()) continue;
        await fetch(`/api/v1/recipes/${recipe.id}/steps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            instruction: step.instruction.trim(),
            timerSeconds: step.timerSeconds ? parseInt(step.timerSeconds) : undefined,
          }),
        });
      }

      router.push(`/recipes/${recipe.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Neues Rezept erstellen</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <section className="mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Titel *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg"
            placeholder="z.B. Blumenkohlauflauf"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Beschreibung</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg resize-none h-20"
            placeholder="Kurze Beschreibung des Rezepts..."
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Portionen</label>
            <input
              type="number"
              value={servings}
              onChange={e => setServings(parseInt(e.target.value) || 4)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg"
              min={1}
              max={50}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vorbereitung (Min)</label>
            <input
              type="number"
              value={prepTime}
              onChange={e => setPrepTime(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg"
              placeholder="15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kochzeit (Min)</label>
            <input
              type="number"
              value={cookTime}
              onChange={e => setCookTime(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg"
              placeholder="30"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Aufwand</label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEffortLevel(e)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm ${
                  effortLevel === e
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted-foreground/20'
                }`}
              >
                {e === 'easy' ? 'Einfach' : e === 'medium' ? 'Mittel' : 'Aufwändig'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Ingredients */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Zutaten</h2>
          <button
            type="button"
            onClick={addIngredient}
            className="text-sm text-primary hover:underline"
          >
            + Zutat hinzufügen
          </button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                type="text"
                value={ing.amount}
                onChange={e => updateIngredient(i, 'amount', e.target.value)}
                className="w-20 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                placeholder="Menge"
              />
              <input
                type="text"
                value={ing.unit}
                onChange={e => updateIngredient(i, 'unit', e.target.value)}
                className="w-16 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                placeholder="EL"
              />
              <input
                type="text"
                value={ing.name}
                onChange={e => updateIngredient(i, 'name', e.target.value)}
                className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                placeholder="Olivenöl"
              />
              <input
                type="text"
                value={ing.note}
                onChange={e => updateIngredient(i, 'note', e.target.value)}
                className="w-28 px-2 py-2 bg-muted border border-border rounded-lg text-sm"
                placeholder="Notiz"
              />
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                className="p-2 text-muted-foreground hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Zubereitung</h2>
          <button
            type="button"
            onClick={addStep}
            className="text-sm text-primary hover:underline"
          >
            + Schritt hinzufügen
          </button>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-1">
                {i + 1}
              </span>
              <textarea
                value={step.instruction}
                onChange={e => updateStep(i, 'instruction', e.target.value)}
                className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm resize-none h-16"
                placeholder={`Schritt ${i + 1}...`}
              />
              <div className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  value={step.timerSeconds}
                  onChange={e => updateStep(i, 'timerSeconds', e.target.value)}
                  className="w-16 px-2 py-2 bg-muted border border-border rounded-lg text-xs"
                  placeholder="Sek."
                />
                <span className="text-xs text-muted-foreground">Timer</span>
              </div>
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="p-2 text-muted-foreground hover:text-red-500 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition"
        >
          {saving ? 'Speichert...' : 'Rezept speichern'}
        </button>
        <button
          onClick={() => router.push('/recipes')}
          className="px-6 py-3 bg-muted rounded-lg hover:bg-muted-foreground/20 transition"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}