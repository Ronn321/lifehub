'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface IngredientDetail {
  id: string;
  name: string;
  amount: string | null;
  unit: string | null;
}

interface StepDetail {
  id: string;
  instruction: string;
  order: number;
  timerSeconds: number | null;
}

interface RecipeDetail {
  id: string;
  title: string;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  ingredients: IngredientDetail[];
  steps: StepDetail[];
}

export default function CookModePage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [servings, setServings] = useState(4);
  const [timer, setTimer] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [visualAlert, setVisualAlert] = useState(false);
  const [quickTapEnabled, setQuickTapEnabled] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (params.id) fetchRecipe();
  }, [params.id]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timer !== null && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev === null || prev <= 1) {
            setTimerRunning(false);
            setVisualAlert(true);
            setTimeout(() => setVisualAlert(false), 4000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timer]);

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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const goToStep = useCallback((step: number) => {
    if (!recipe) return;
    if (step < 0) return;
    if (step >= recipe.steps.length) {
      setShowCompletion(true);
      return;
    }
    setCurrentStep(step);
  }, [recipe]);

  // Auto-start timer when landing on a step that has one, if none is running
  useEffect(() => {
    if (!recipe || timerRunning) return;
    const step = recipe.steps[currentStep];
    if (!step) return;

    // Check for explicit timerSeconds field
    if (step.timerSeconds && step.timerSeconds > 0) {
      setTimer(step.timerSeconds);
      return;
    }

    // Auto-detect time mentions in step text
    const text = step.instruction;
    const patterns = [
      /(\d+)\s*(?:Min(?:uten?)?|min)\s*(?:köcheln|braten|backen|garen|kochen|ziehen lassen|ruhen|ruhen lassen)?/gi,
      /(\d+)\s*-\s*(\d+)\s*(?:Min(?:uten?)?|min)\s*(?:köcheln|braten|backen|garen|kochen)?/gi,
      /ca\.?\s*(\d+)\s*-\s*(\d+)\s*(?:Min(?:uten?)?|min)/gi,
      /(\d+)\s*-\s*(\d+)\s*Minuten/gi,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        // Use upper bound or single value
        const seconds = parseInt(match[2] || match[1]!, 10) * 60;
        if (seconds > 0 && seconds < 7200) {
          setTimer(seconds);
          break;
        }
      }
    }
  }, [currentStep, recipe, timerRunning]);

  const nextStep = useCallback(() => {
    if (!startTime) setStartTime(Date.now());
    goToStep(currentStep + 1);
  }, [currentStep, goToStep, startTime]);

  const prevStep = useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const toggleTimer = useCallback(() => {
    setTimerRunning(prev => !prev);
  }, []);

  const handleQuickTap = useCallback(() => {
    if (quickTapEnabled && !timerRunning) {
      nextStep();
    }
  }, [quickTapEnabled, timerRunning, nextStep]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight': nextStep(); break;
        case 'ArrowLeft': prevStep(); break;
        case ' ': e.preventDefault(); toggleTimer(); break;
        case 'Escape': router.push(`/recipes/${params.id}`); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextStep, prevStep, toggleTimer, router, params.id]);

  // Stop timer
  const stopTimer = useCallback(() => {
    setTimer(null);
    setTimerRunning(false);
  }, []);

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const scaleAmount = (amount: string | null): string => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    const factor = servings / (recipe?.servings ?? 4);
    const scaled = num * factor;
    return scaled % 1 === 0 ? String(Math.round(scaled)) : scaled.toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Rezept wird geladen...</div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <button onClick={() => router.push('/recipes')} className="text-white hover:underline">
          Rezept nicht gefunden — Zurück
        </button>
      </div>
    );
  }

  if (showCompletion) {
    const durationMinutes = startTime ? Math.round((Date.now() - startTime) / 60000) : recipe.totalTime ?? 0;
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-8 transition-colors duration-300 ${
          visualAlert ? 'bg-[#FF6B6B]' : 'bg-black'
        }`}
      >
        <div className="text-center text-white space-y-6">
          <div className="text-6xl">🎉</div>
          <h1 className="text-4xl font-bold">Gut gemacht!</h1>
          <p className="text-2xl text-white/80">{recipe.title} ist fertig!</p>
          <p className="text-lg text-white/60">Dauer: ca. {durationMinutes} Minuten</p>
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => router.push(`/recipes/${recipe.id}`)}
              className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
            >
              Zurück zum Rezept
            </button>
            <button
              onClick={() => router.push('/recipes')}
              className="px-6 py-3 bg-white text-black rounded-lg hover:bg-white/90 transition"
            >
              Zur Übersicht
            </button>
          </div>
        </div>
      </div>
    );
  }

  const step = recipe.steps.sort((a, b) => a.order - b.order)[currentStep];
  if (!step) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background image */}
      <div className="fixed inset-0 z-0">
        <img
          src={`/api/v1/recipes/image/${recipe.id}`}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 text-white/80">
          <button
            onClick={() => {
              setTimer(null);
              setTimerRunning(false);
              router.push(`/recipes/${params.id}`);
            }}
            className="hover:text-white transition text-lg"
          >
            ← Zurück
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono opacity-60">
              {currentStep + 1}/{recipe.steps.length}
            </span>
            <div className="flex gap-1">
              {recipe.steps.map((_, i) => (
                <div key={i}
                  className={`w-1.5 h-1.5 rounded-full transition ${
                    i === currentStep ? 'bg-white' : i < currentStep ? 'bg-white/40' : 'bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main area with step text + timer */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          {/* Step text in blurred bubble */}
          <div
            className="max-w-2xl w-full p-8 md:p-12 text-center relative cursor-pointer select-none"
            onClick={handleQuickTap}
          >
            {/* Blurred bubble background with fading edges */}
            <div
              className="absolute inset-0 rounded-3xl"
              style={{
                background: 'radial-gradient(ellipse, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div className="relative z-10">
              <p className="text-xl md:text-3xl text-white leading-relaxed font-light">
                {step.instruction}
              </p>
            </div>
          </div>

          {/* Timer section - prominent under step */}
          {timer !== null && (
            <div className="mt-4 mb-2 flex flex-col items-center gap-3">
              {/* Timer display */}
              <div className={`text-5xl md:text-6xl font-mono font-bold tracking-wider transition-colors ${
                timer === 0 ? 'text-green-400' : timerRunning ? 'text-white' : 'text-white/60'
              }`}>
                {formatTime(timer)}
              </div>

              {/* Timer controls */}
              <div className="flex items-center gap-4">
                {timerRunning ? (
                  <button onClick={toggleTimer}
                    className="w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition text-2xl backdrop-blur-sm">
                    ⏸
                  </button>
                ) : (
                  <button onClick={toggleTimer}
                    className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition text-2xl backdrop-blur-sm">
                    ▶
                  </button>
                )}
                <button onClick={stopTimer}
                  className="w-10 h-10 rounded-full bg-red-500/30 hover:bg-red-500/50 flex items-center justify-center transition text-lg backdrop-blur-sm">
                  ⏹
                </button>
              </div>

              {/* Progress bar */}
              {timerRunning && (
                <div className="w-48 h-1 bg-white/15 rounded-full overflow-hidden">
                  <div className="h-full bg-white/60 rounded-full transition-all duration-1000"
                    style={{ width: `${step.timerSeconds ? ((step.timerSeconds - timer) / step.timerSeconds) * 100 : 0}%` }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation controls at bottom */}
        <div className="flex items-center justify-between px-6 py-4">
          <button onClick={prevStep}
            className="w-12 h-12 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition text-xl backdrop-blur-sm">
            ⏮
          </button>
          {timer === null && (
            <div className="flex gap-2 text-white/40 text-sm">
              <span>Tiere zum Überspringen</span>
            </div>
          )}
          <button onClick={nextStep}
            className="w-12 h-12 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition text-xl backdrop-blur-sm">
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}