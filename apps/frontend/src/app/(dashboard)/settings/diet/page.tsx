'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DietaryProfile {
  id?: string;
  avoidFlags: string[];
  avoidIngredientIds: string[];
  requiredAttributes: string[];
  calorieTarget: number | null;
  calorieTolerance: number;
  maxTimeMinutes: number | null;
  preferredEffort: 'easy' | 'medium' | 'hard';
}

const DIET_OPTIONS = [
  { key: 'vegan', label: 'Vegan', desc: 'Keine tierischen Produkte' },
  { key: 'vegetarisch', label: 'Vegetarisch', desc: 'Kein Fleisch/Fisch' },
  { key: 'pescetarisch', label: 'Pescetarisch', desc: 'Fisch erlaubt' },
  { key: 'halal', label: 'Halal-kompatibel', desc: 'Halal-kompatible Zutaten' },
  { key: 'lactosefrei', label: 'Laktosefrei', desc: 'Keine Milchprodukte' },
  { key: 'glutenfrei', label: 'Glutenfrei', desc: 'Kein Gluten' },
  { key: 'zuckerfrei', label: 'Zuckerfrei', desc: 'Kein zugesetzter Zucker' },
  { key: 'nussfrei', label: 'Nussfrei', desc: 'Keine Nüsse' },
];

export default function DietarySettingsPage() {
  const [profile, setProfile] = useState<DietaryProfile>({
    avoidFlags: [],
    avoidIngredientIds: [],
    requiredAttributes: [],
    calorieTarget: null,
    calorieTolerance: 100,
    maxTimeMinutes: 60,
    preferredEffort: 'medium',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = (JSON.parse(localStorage.getItem('lifehub-auth') ?? '{}')?.state?.accessToken ?? '');
      const res = await fetch('/api/v1/profile/diet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = (JSON.parse(localStorage.getItem('lifehub-auth') ?? '{}')?.state?.accessToken ?? '');
      const res = await fetch('/api/v1/profile/diet', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = (flag: string) => {
    setProfile(prev => ({
      ...prev,
      avoidFlags: prev.avoidFlags.includes(flag)
        ? prev.avoidFlags.filter(f => f !== flag)
        : [...prev.avoidFlags, flag],
    }));
  };

  if (loading) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Ernährungs-Einstellungen</h1>
      <p className="text-muted-foreground mb-8">
        Diese Einstellungen bestimmen, welche Rezepte dir angezeigt werden.
      </p>

      {/* Diet Preferences */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Diät-Präferenzen</h2>
        <div className="space-y-3">
          {DIET_OPTIONS.map(opt => (
            <label
              key={opt.key}
              className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition"
            >
              <input
                type="checkbox"
                checked={profile.avoidFlags.includes(opt.key)}
                onChange={() => toggleFlag(opt.key)}
                className="w-4 h-4 rounded border-border"
              />
              <div>
                <span className="font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({opt.desc})
                </span>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Nutrition Goals */}
      <section className="mb-8 p-4 bg-card border border-border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Ernährungs-Ziele</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Kalorienziel (pro Portion)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={profile.calorieTarget ?? ''}
                onChange={e =>
                  setProfile(prev => ({
                    ...prev,
                    calorieTarget: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className="w-24 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                placeholder="500"
              />
              <span className="text-sm text-muted-foreground">kcal ±</span>
              <input
                type="number"
                value={profile.calorieTolerance}
                onChange={e =>
                  setProfile(prev => ({
                    ...prev,
                    calorieTolerance: parseInt(e.target.value) || 100,
                  }))
                }
                className="w-20 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Maximale Kochzeit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={profile.maxTimeMinutes ?? ''}
                onChange={e =>
                  setProfile(prev => ({
                    ...prev,
                    maxTimeMinutes: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className="w-24 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                placeholder="60"
              />
              <span className="text-sm text-muted-foreground">Minuten</span>
            </div>
          </div>
        </div>
      </section>

      {/* Effort Preference */}
      <section className="mb-8 p-4 bg-card border border-border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Bevorzugter Aufwand</h2>
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as const).map(effort => (
            <button
              key={effort}
              onClick={() => setProfile(prev => ({ ...prev, preferredEffort: effort }))}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition ${
                profile.preferredEffort === effort
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted-foreground/20'
              }`}
            >
              {effort === 'easy' ? '😊 Einfach' :
               effort === 'medium' ? '👩‍🍳 Mittel' :
               '🔥 Aufwändig'}
            </button>
          ))}
        </div>
      </section>

      {/* Display Preferences */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Anzeige</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={profile.requiredAttributes.includes('halal')}
              onChange={() => {
                const has = profile.requiredAttributes.includes('halal');
                setProfile(prev => ({
                  ...prev,
                  requiredAttributes: has
                    ? prev.requiredAttributes.filter(a => a !== 'halal')
                    : [...prev.requiredAttributes, 'halal'],
                }));
              }}
              className="w-4 h-4 rounded"
            />
            <span>Halal-zertifizierte Rezepte priorisieren</span>
          </label>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition"
        >
          {saving ? 'Speichert...' : 'Speichern'}
        </button>
        {saved && (
          <span className="text-green-600 text-sm animate-fade-in">
            ✅ Gespeichert!
          </span>
        )}
      </div>
    </div>
  );
}